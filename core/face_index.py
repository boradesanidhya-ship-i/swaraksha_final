import sys
import os
import json
import numpy as np
import faiss
from dataclasses import dataclass

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import config
from db.database import DatabaseManager

@dataclass
class MatchResult:
    """Represents a search match result."""
    person_id: str
    similarity: float
    image_name: str
    faiss_idx: int
    matched: bool

class FaceIndex:
    """FAISS-backed face search index."""
    
    def __init__(self, dimension=None, db: DatabaseManager = None):
        """Initializes the FAISS index and ID map."""
        self.dimension = dimension or config.EMBEDDING_DIMENSION
        self.index = faiss.IndexFlatIP(self.dimension)
        self.id_map = {}
        self.db = db or DatabaseManager()
        self.load()

    def add(self, person_id: str, embedding: np.ndarray, image_name: str = 'unknown') -> int:
        """Adds an embedding to the FAISS index and database."""
        # Ensure embedding is shape (1, dimension) and float32
        embedding = np.asarray(embedding, dtype=np.float32).reshape(1, -1)
        
        faiss_idx = self.index.ntotal
        self.index.add(embedding)
        
        self.id_map[str(faiss_idx)] = {
            'person_id': person_id,
            'image_name': image_name
        }
        
        self.db.add_embedding_record(person_id, faiss_idx, image_name)
        self.save()
        return faiss_idx

    def search(self, embedding: np.ndarray, k: int = 5, threshold: float = None) -> list[dict]:
        """Searches the index for top-k matches."""
        if self.index.ntotal == 0:
            return []
            
        threshold = threshold if threshold is not None else config.MATCH_THRESHOLD
        k = min(k, self.index.ntotal)
        
        # Ensure embedding is shape (1, dimension) and float32
        embedding = np.asarray(embedding, dtype=np.float32).reshape(1, -1)
        
        similarities, indices = self.index.search(embedding, k)
        
        results = []
        for i in range(k):
            sim = float(similarities[0][i])
            faiss_idx = int(indices[0][i])
            
            if faiss_idx != -1 and sim >= threshold:
                map_entry = self.id_map.get(str(faiss_idx), {})
                person_id = map_entry.get('person_id')
                image_name = map_entry.get('image_name')
                
                if person_id:
                    results.append({
                        'person_id': person_id,
                        'similarity': sim,
                        'image_name': image_name,
                        'faiss_idx': faiss_idx
                    })
                    
        return results

    def remove_person(self, person_id: str) -> int:
        """Removes all embeddings for a person by rebuilding the index."""
        faiss_indices = self.db.get_all_faiss_indices_for_person(person_id)
        if not faiss_indices:
            return 0
            
        embeddings_to_keep = []
        new_id_map = {}
        new_idx = 0
        removed_count = 0
        
        # Rebuilding index and id_map, and updating DB with new indices
        with self.db.conn:
            for i in range(self.index.ntotal):
                if i in faiss_indices:
                    removed_count += 1
                    continue
                    
                vector = self.index.reconstruct(i)
                embeddings_to_keep.append(vector)
                
                old_entry = self.id_map.get(str(i))
                if old_entry:
                    new_id_map[str(new_idx)] = old_entry
                    
                    if new_idx != i:
                        self.db.conn.execute(
                            "UPDATE embedding_records SET faiss_idx = ? WHERE faiss_idx = ?",
                            (new_idx, i)
                        )
                    
                    new_idx += 1
            
            # Delete person from db (cascades)
            self.db.conn.execute(
                "DELETE FROM persons WHERE person_id = ?", (person_id,)
            )

        self.index = faiss.IndexFlatIP(self.dimension)
        if embeddings_to_keep:
            self.index.add(np.array(embeddings_to_keep, dtype=np.float32))
            
        self.id_map = new_id_map
        self.save()
        
        return removed_count

    def save(self):
        """Saves the FAISS index and ID map to disk."""
        if hasattr(config, 'FAISS_INDEX_PATH'):
            os.makedirs(os.path.dirname(config.FAISS_INDEX_PATH), exist_ok=True)
            faiss.write_index(self.index, config.FAISS_INDEX_PATH)
            
        if hasattr(config, 'FAISS_ID_MAP_PATH'):
            os.makedirs(os.path.dirname(config.FAISS_ID_MAP_PATH), exist_ok=True)
            with open(config.FAISS_ID_MAP_PATH, 'w') as f:
                json.dump(self.id_map, f)

    def load(self):
        """Loads the FAISS index and ID map from disk."""
        if hasattr(config, 'FAISS_INDEX_PATH') and os.path.exists(config.FAISS_INDEX_PATH):
            self.index = faiss.read_index(config.FAISS_INDEX_PATH)
            
        if hasattr(config, 'FAISS_ID_MAP_PATH') and os.path.exists(config.FAISS_ID_MAP_PATH):
            with open(config.FAISS_ID_MAP_PATH, 'r') as f:
                self.id_map = json.load(f)

    @property
    def total_embeddings(self):
        """Returns the total number of embeddings in the index."""
        return self.index.ntotal
