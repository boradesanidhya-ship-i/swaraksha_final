# SWARAKSHA v2

SWARAKSHA is a local-first identity protection system. It registers trusted face references, recognizes protected people in uploaded media, and checks matched faces for signs of AI-generated manipulation.

This `trial_v2` folder is the cleaned runtime project. It contains the active backend and frontend only; the original `trial` folder remains the prototype/history workspace.

## What We Have Built

### Identity registration

- Register a person with a stable person ID and display name.
- Upload five or more reference images in one enrollment flow.
- Accept additional reference images for an existing person ID.
- Detect faces in each image with DeepFace and RetinaFace.
- Generate ArcFace embeddings and store them in a FAISS index.
- Persist person records and reference counts in SQLite.

### Face and image scanning

- Request webcam permission in the browser.
- Capture a face image from the live camera.
- Upload an image as an alternative to the camera flow.
- Detect all faces in the image.
- Match detected faces against registered identities using cosine similarity.
- Run the AI-generated image detector on matched face crops.
- Return an `ALLOW` or `BLOCK` result with per-face reasons, identity similarity, and AI detector data.

### Video testing

- Queue and submit multiple videos from the frontend Video Lab.
- Upload videos one at a time to the backend queue endpoint.
- Sample video frames approximately every two seconds.
- Detect faces and run identity/authenticity checks on sampled frames.
- Report sampled frames, frames containing faces, blocked frames, and per-frame results.
- Show an individual result card for each submitted video.

### Frontend experience

- Light white, lavender, and purple SWARAKSHA visual system based on `icon2.png`.
- Sidebar navigation for Home, Protected people, Face scan, and Video Lab.
- Protected people directory backed by the live `/api/persons` endpoint.
- Delete registered identities from the frontend with confirmation.
- Visible progress stages for registration, image scans, and video processing.
- In-app process console showing the current client-visible activity.
- Responsive layout for desktop and smaller screens.

## Runtime Architecture

```text
Browser / React + Vite
        |
        | HTTP multipart requests
        v
FastAPI API
        |
        +-- DeepFace + RetinaFace: face detection and ArcFace embeddings
        +-- FAISS: cosine-similarity identity search
        +-- SQLite: people and embedding metadata
        +-- Transformers/PyTorch: AI-generated image detection
        +-- OpenCV: image decoding and video frame sampling
```

## Project Structure

```text
trial_v2/
├── api/
│   └── main.py                 FastAPI application and API routes
├── core/
│   ├── ai_detector.py          AI-generated image detector
│   ├── encoder.py              DeepFace face detection and ArcFace embeddings
│   └── face_index.py           FAISS index persistence and matching
├── db/
│   ├── database.py             SQLite person and embedding records
│   └── swaraksha.db            Local database created at runtime
├── frontend/
│   ├── src/App.jsx             React application and user flows
│   ├── src/index.css           Light SWARAKSHA visual system
│   ├── public/icon2.png        Active brand asset
│   └── package.json             Frontend dependencies and scripts
├── models/                     Reserved for model assets
├── storage/
│   ├── faiss_index.bin         Persisted FAISS vectors
│   ├── faiss_id_map.json       FAISS index-to-person mapping
│   ├── registered_faces/       Reserved registered media storage
│   ├── embeddings/              Reserved embedding storage
│   ├── reports/                 Reserved scan reports
│   └── temp/                    Temporary processing files
├── config.py                   Central paths and detector thresholds
├── requirements.txt            Python dependencies
├── start_swaraksha.bat         Windows launcher for backend and frontend
└── README.md                   This document
```

## API Routes

### `GET /`

Health check. Returns API status, version, number of registered people, and total embeddings.

### `POST /api/register`

Registers one or more reference images.

Multipart fields:

- `person_id`: stable identifier for the person
- `name`: display name
- `files`: one or more image files

Returns the number of faces successfully registered and the total FAISS embedding count.

### `POST /api/recognize`

Detects and matches faces in a single image without running the AI authenticity check.

### `POST /api/scan`

Runs the complete image protection flow: face detection, identity matching, and AI-generated image analysis.

Multipart field:

- `file`: one image file

### `POST /api/scan-video`

Samples and scans an uploaded video.

Multipart field:

- `file`: one video file

The frontend’s Video Lab calls this endpoint once for each queued video.

### `GET /api/persons`

Returns all registered people, including their IDs, names, creation times, and stored reference counts.

### `DELETE /api/persons/{person_id}`

Removes a person, their stored embedding records, and their vectors from the FAISS index.

## Setup

### Prerequisites

- Windows
- Python 3.11 installed at the path configured in `start_swaraksha.bat`
- Node.js and npm
- A browser with webcam support if using live capture

### First-time frontend install

From this folder:

```powershell
cd frontend
npm.cmd install
```

### Start the application

Double-click:

```text
start_swaraksha.bat
```

The launcher:

1. Checks that the configured Python 3.11 executable exists.
2. Checks the required backend imports.
3. Installs `requirements.txt` if dependencies are missing.
4. Starts FastAPI with Uvicorn on port `8000`.
5. Starts Vite on port `5173`.

Open:

- Frontend: http://localhost:5173
- API health check: http://localhost:8000
- FastAPI docs: http://localhost:8000/docs

Keep both terminal windows open while developing. The frontend does not start the backend by itself.

## Important Data Behavior

Reference counts are cumulative. If a person already has 10 stored references and five more are enrolled, the directory may show 15 total stored references. The frontend separately reports how many images were added in the latest enrollment.

The FAISS index and ID map live under `storage/`. The SQLite database lives under `db/`. Deleting files from either location manually can desynchronize the runtime state; use the Protected people delete action when possible.

## Current Limitations

- This is a local development system, not a production deployment.
- There is no authentication or user account system yet.
- CORS is intentionally permissive for local development.
- The video endpoint samples frames instead of analyzing every frame.
- Video processing is sequential and can be slow because each sampled face may invoke DeepFace and the AI detector.
- Camera access requires browser permission and generally works best from `localhost` or a secure context.
- Model downloads and first-run model initialization can take several minutes.
- Detection and similarity thresholds are configured in `config.py` and should be calibrated with representative data before real-world use.
- A match is identity evidence, not proof of consent, authenticity, or legal ownership.

## Validation Performed

The current v2 project has been validated with:

```text
Frontend production build
Frontend lint
Python backend syntax compilation
Editor diagnostics for active frontend and backend files
```

## Development Direction

The next sensible engineering steps are to add structured server-side job status for long video scans, persist scan reports, add authentication and access control, improve face/reference quality validation, and add automated API tests around registration, deletion, image scans, and video scans.
