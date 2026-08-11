"""
SWARAKSHA Configuration
Centralized constants, thresholds, and paths.
"""

import os

# === Paths ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
REGISTERED_FACES_DIR = os.path.join(STORAGE_DIR, "registered_faces")
EMBEDDINGS_DIR = os.path.join(STORAGE_DIR, "embeddings")
REPORTS_DIR = os.path.join(STORAGE_DIR, "reports")
TEMP_DIR = os.path.join(STORAGE_DIR, "temp")
MODELS_DIR = os.path.join(BASE_DIR, "models")
DB_PATH = os.path.join(BASE_DIR, "db", "swaraksha.db")

# === Face Detection & Embedding ===
FACE_MODEL = "ArcFace"              # 512-d embeddings
DETECTOR_BACKEND = "retinaface"     # High-accuracy face detector
EMBEDDING_DIMENSION = 512
DISTANCE_METRIC = "cosine"

# === Matching Thresholds ===
MATCH_THRESHOLD = 0.55              # Cosine similarity: above this = match
FACE_CONFIDENCE_MIN = 0.80          # Minimum face detection confidence

# === Video Processing ===
VIDEO_SAMPLE_FPS = 2                # Frames per second to sample

# AI Image Detector Settings
AI_DETECTOR_MODEL = 'dima806/deepfake_vs_real_image_detection'
AI_DETECTOR_THRESHOLD = 0.5         # Above this = classified as AI-generated

# === FAISS Index ===
FAISS_INDEX_PATH = os.path.join(STORAGE_DIR, "faiss_index.bin")
FAISS_ID_MAP_PATH = os.path.join(STORAGE_DIR, "faiss_id_map.json")

# === Create directories on import ===
for _dir in [STORAGE_DIR, REGISTERED_FACES_DIR, EMBEDDINGS_DIR,
             REPORTS_DIR, TEMP_DIR, MODELS_DIR]:
    os.makedirs(_dir, exist_ok=True)
