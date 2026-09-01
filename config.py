"""
SWARAKSHA Configuration
Centralized constants, thresholds, and paths.
"""

import os
from dotenv import load_dotenv

# Load .env file if present
load_dotenv(override=True)

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
FACE_CONFIDENCE_MIN = 0.40          # Minimum face detection confidence (lowered for angled/profile faces)

# === Video Processing ===
VIDEO_SAMPLE_INTERVAL = 2.0         # Seconds between frame samples

# AI Image Detector Settings
AI_DETECTOR_MODEL = 'dima806/deepfake_vs_real_image_detection'
AI_DETECTOR_THRESHOLD = 0.85        # Increased threshold to reduce false positives

# === FAISS Index ===
FAISS_INDEX_PATH = os.path.join(STORAGE_DIR, "faiss_index.bin")
FAISS_ID_MAP_PATH = os.path.join(STORAGE_DIR, "faiss_id_map.json")

# === Database & PostgreSQL ===
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "swaraksha_db")

# Default database URL (PostgreSQL if available or provided, falls back to SQLite)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# === Authentication & Security ===
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "swaraksha-super-secure-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080")) # 7 days default

# === Email Notifications (SMTP) ===
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "notifications@swaraksha.ai")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "SWARAKSHA Cyber Defense")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

# === Create directories on import ===
for _dir in [STORAGE_DIR, REGISTERED_FACES_DIR, EMBEDDINGS_DIR,
             REPORTS_DIR, TEMP_DIR, MODELS_DIR]:
    os.makedirs(_dir, exist_ok=True)
