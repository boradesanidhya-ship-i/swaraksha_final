import sys
import os
import sqlite3
import threading

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import config

class DatabaseManager:
    """Manages the SQLite database for persons and their embedding records."""
    
    def __init__(self, db_path=None):
        """Initializes the database connection."""
        self.db_path = db_path or config.DB_PATH
        
        # Ensure parent directories exist
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_db()
        self._lock = threading.Lock()

    def _init_db(self):
        """Creates necessary tables if they don't exist."""
        with self.conn:
            # Enable foreign key support
            self.conn.execute("PRAGMA foreign_keys = ON;")
            
            self.conn.execute('''
                CREATE TABLE IF NOT EXISTS persons (
                    person_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    image_count INTEGER DEFAULT 0
                )
            ''')
            
            self.conn.execute('''
                CREATE TABLE IF NOT EXISTS embedding_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    person_id TEXT NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
                    faiss_idx INTEGER NOT NULL,
                    image_name TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

    def add_person(self, person_id: str, name: str) -> dict:
        """Adds a new person to the database."""
        with self._lock, self.conn:
            try:
                self.conn.execute(
                    "INSERT INTO persons (person_id, name) VALUES (?, ?)",
                    (person_id, name)
                )
            except sqlite3.IntegrityError:
                raise ValueError(f"Person with ID '{person_id}' already exists.")
            
        return self.get_person(person_id)

    def add_embedding_record(self, person_id: str, faiss_idx: int, image_name: str = None) -> int:
        """Adds an embedding record and increments the person's image count."""
        with self._lock, self.conn:
            cursor = self.conn.execute(
                "INSERT INTO embedding_records (person_id, faiss_idx, image_name) VALUES (?, ?, ?)",
                (person_id, faiss_idx, image_name)
            )
            record_id = cursor.lastrowid
            
            self.conn.execute(
                "UPDATE persons SET image_count = image_count + 1 WHERE person_id = ?",
                (person_id,)
            )
            
        return record_id

    def get_person(self, person_id: str) -> dict | None:
        """Retrieves a person by their ID."""
        cursor = self.conn.execute(
            "SELECT * FROM persons WHERE person_id = ?", (person_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    def list_persons(self) -> list[dict]:
        """Retrieves all persons in the database."""
        cursor = self.conn.execute("SELECT * FROM persons")
        return [dict(row) for row in cursor.fetchall()]

    def delete_person(self, person_id: str) -> bool:
        """Deletes a person and their embedding records (via CASCADE)."""
        with self._lock, self.conn:
            cursor = self.conn.execute(
                "DELETE FROM persons WHERE person_id = ?", (person_id,)
            )
            return cursor.rowcount > 0

    def get_person_by_faiss_idx(self, faiss_idx: int) -> dict | None:
        """Looks up a person by a FAISS index."""
        cursor = self.conn.execute('''
            SELECT p.* FROM persons p
            JOIN embedding_records e ON p.person_id = e.person_id
            WHERE e.faiss_idx = ?
        ''', (faiss_idx,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_embedding_records_for_person(self, person_id: str) -> list[dict]:
        """Retrieves all embedding records for a given person."""
        cursor = self.conn.execute(
            "SELECT * FROM embedding_records WHERE person_id = ?", (person_id,)
        )
        return [dict(row) for row in cursor.fetchall()]

    def get_all_faiss_indices_for_person(self, person_id: str) -> list[int]:
        """Retrieves all FAISS indices associated with a given person."""
        cursor = self.conn.execute(
            "SELECT faiss_idx FROM embedding_records WHERE person_id = ?", (person_id,)
        )
        return [row['faiss_idx'] for row in cursor.fetchall()]

    def close(self):
        """Closes the database connection."""
        self.conn.close()
