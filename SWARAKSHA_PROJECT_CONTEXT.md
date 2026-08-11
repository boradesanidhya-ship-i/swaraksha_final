# SWARAKSHA Project Context

## Overview
SWARAKSHA is a local-first identity protection system designed to register trusted face references, recognize protected individuals in uploaded media, and check matched faces for signs of AI-generated manipulation. 

## Key Capabilities
1. **Identity Registration**: End-users can upload multiple reference images for a single identity. Features DeepFace for extraction and ArcFace for embeddings.
2. **Face & Image Scanning**: Detects faces in photos, matches them against registered identities using FAISS, and runs a robust AI-authenticity check on matched identities using HuggingFace models.
3. **Video Pipeline**: A comprehensive two-layered approach for evaluating videos. First extracts sampled frames based on a time interval, runs identity matching on all sampled frames, filters relevant frames, and then runs computationally intensive AI-manipulation checks ONLY on relevant frames.

## Tech Stack
- **Backend**: FastAPI, Python 3.11, OpenCV, DeepFace, FAISS, PyTorch, Transformers.
- **Frontend**: React, Vite.
- **Storage**: SQLite for relational data, FAISS binary index for vector embeddings, and local filesystem for temporary video/image storage.

## Recent Major Updates
- **Video Pipeline Implementation**: Introduced `core/video_processor.py` for efficient metadata extraction and frame sampling. Overhauled `/api/scan-video` to produce frame-level metrics and perform video-level aggregation. Added frontend timeline visualization. See `VIDEO_PIPELINE.md` for architectural details.
