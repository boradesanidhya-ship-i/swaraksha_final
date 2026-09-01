#  SWARAKSHA  

**SWARAKSHA** is a local-first, zero-trust biometric cyber-defense platform designed to safeguard human facial identities against unauthorized generative synthesis, deepfakes, and algorithmic impersonation.

The platform combines high-dimensional geometric facial embeddings (**ArcFace + RetinaFace**), vector topology similarity matching (**FAISS**), Vision Transformers (**ViT**) for synthetic artifact forensics, and multi-vector metadata analysis (**C2PA / EXIF**).

---

##  Key Capabilities

- **Multi-Pose Identity Enrollment:** Register protected identities with 5+ photos across various lighting conditions and angles with multi-threaded parallel extraction.
- **Live Facial Protection & AI Scan:** Instant detection of identity matches with concurrent deepfake classification and metadata forensics (`ALLOW` vs `BLOCK` verdict).
- **Accelerated Video Forensics Lab:** Frame-by-frame temporal timeline analysis, identity tracking, and vectorized tensor batch deepfake detection for video files.
- **Automated Forensic Reports & Email Telemetry:** Instant generation of branded HTML forensic dossiers dispatched directly to the registered user's email inbox via SMTP (Gmail TLS / Port 587).
- **Enterprise Data Architecture:** SQLAlchemy ORM with PostgreSQL database persistence and automatic local SQLite fallback (`db/swaraksha.db`).
- **Secure Authentication & Session Management:** Bcrypt password hashing, JWT bearer tokens, and persistent multi-user session state.
- **Cross-Platform Mobile App (Expo SDK 57):** Native iOS and Android application with real-time camera scanning, video uploads, process terminal, and report history.

---

##  Runtime Architecture

```text
       ┌─────────────────────────────────────────────────────────┐
       │   Mobile Client (Expo SDK 57 / React Native 0.86)       │
       │   Web Client (React + Vite)                             │
       └────────────────────────────┬────────────────────────────┘
                                    │ HTTP / JSON Base64 (REST)
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             FastAPI Cyber Defense Engine                │
       └─────┬──────────────┬──────────────┬──────────────┬──────┘
             │              │              │              │
             ▼              ▼              ▼              ▼
       ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
       │ DeepFace  │  │   FAISS   │  │ PyTorch   │  │ Metadata  │
       │ ArcFace   │  │  Vector   │  │  Vision   │  │ Forensics │
       │RetinaFace │  │   Index   │  │Transform. │  │ C2PA/EXIF │
       └───────────┘  └───────────┘  └───────────┘  └───────────┘
             │              │              │              │
             └──────────────┼──────────────┴──────────────┘
                            ▼
       ┌─────────────────────────────────────────────────────────┐
       │       SQLAlchemy (PostgreSQL / SQLite Fallback)         │
       │  Users • Enrolled Identities • Reports • Audit Logs     │
       └────────────────────────────┬────────────────────────────┘
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │        Automated SMTP Email Dispatcher (TLS)            │
       └─────────────────────────────────────────────────────────┘
```

---

##  Prerequisites & System Requirements

### 1. Backend Engine
- **Operating System:** Windows 10/11, macOS, or Linux
- **Python Version:** `Python 3.11.x` (64-bit required)
- **C++ Build Tools / Visual Studio Redistributable** (for Windows OpenCV/FAISS)

### 2. Mobile App
- **Node.js:** `v18.x` or `v20.x` LTS
- **npm:** `v9.x` or `v10.x`
- **Expo Framework:** **Expo SDK 57** (`expo@57.0.18`, `react-native@0.86.3`)
- **Testing Device:** Physical phone running **Expo Go** (available on App Store / Google Play) or an iOS/Android simulator

### 3. Database & Mailer (Optional / Recommended)
- **PostgreSQL:** `v14+` (auto-falls back to local SQLite if PostgreSQL is not running)
- **SMTP Account:** Gmail (with 16-character App Password) or any standard SMTP server

---

##  Quick Start Guide

### Step 1: Clone and Configure Environment

```bash
git clone https://github.com/boradesanidhya-ship-i/swaraksha_final.git
cd swaraksha_final
```

Create your configuration file by copying the template:

```bash
cp .env.example .env
```

Edit [`.env`](file:///.env) with your credentials:

```env
# Database Settings
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=swaraksha_db

# JWT Security
JWT_SECRET_KEY=your-secure-jwt-secret-key-2026
JWT_EXPIRE_MINUTES=10080

# Automated Email Reports (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_letter_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_FROM_NAME=SWARAKSHA Cyber Defense
SMTP_USE_TLS=true
```

>  **Gmail App Password:** If using Gmail, enable 2-Step Verification on your Google Account and generate a 16-character password at [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

---

### Step 2: Install Backend Dependencies & Start Server

```powershell
# Create and activate virtual environment (recommended)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend (0.0.0.0 binds to your local Wi-Fi IP for phone access)
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

- API Base URL: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

---

### Step 3: Start Mobile App (Expo SDK 57)

In a new terminal window:

```bash
cd mobile
npm install
npx expo start
```

1. Open the **Expo Go** app on your physical iPhone or Android device connected to the same Wi-Fi.
2. Scan the QR code displayed in your terminal.
3. Tap the **Gear Icon (⚙️)** in the app header and set your computer's Wi-Fi IP (e.g. `http://192.168.1.50:8000`).

---

### Step 4 (Optional): Start Web Dashboard

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

##  Dependency Manifest

### Backend Python Packages (`requirements.txt`)

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `fastapi` | `>=0.100.0` | High-throughput asynchronous REST API framework |
| `uvicorn` | `>=0.20.0` | ASGI server execution |
| `torch` | `>=2.0.0` | PyTorch runtime for Vision Transformer model inference |
| `transformers` | `>=4.30.0` | Hugging Face deepfake detection model |
| `deepface` | `>=0.0.93` | Facial recognition pipeline framework |
| `retina-face` | `>=0.0.17` | High-accuracy facial feature detection backend |
| `faiss-cpu` | `>=1.7.0` | Facebook AI Similarity Search for $O(1)$ vector indexing |
| `sqlalchemy` | `>=2.0.0` | Database ORM and schema management |
| `psycopg2-binary`| `>=2.9.0` | PostgreSQL database adapter |
| `bcrypt` | `>=4.0.0` | Password hashing algorithm |
| `pyjwt` | `>=2.8.0` | JSON Web Token encoding and verification |
| `opencv-python`| `>=4.8.0` | Video frame decoding and image processing |
| `Pillow` | `>=10.0.0` | Image format conversion and pre-scaling |
| `python-dotenv`| `>=1.0.0` | Dynamic `.env` environment loading |

### Mobile Client Packages (`mobile/package.json` — Expo SDK 57)

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `expo` | `57.0.18` | Expo core SDK runtime |
| `react` | `19.2.3` | React library |
| `react-native` | `0.86.3` | Native cross-platform UI framework |
| `expo-camera` | `57.0.4` | Hardware camera capture interface |
| `expo-image-picker` | `57.0.14` | Multi-image gallery and video picker |
| `lucide-react-native`| `^0.477.0` | Modern UI icon library |
| `@react-native-async-storage/async-storage`| `^2.1.2` | Persistent on-device token & profile storage |
| `axios` | `^1.7.9` | HTTP client with bearer auth injection |

---

##  API Endpoint Reference

### Authentication & User Management
- `POST /api/auth/register` — Create new user account with email and password.
- `POST /api/auth/login` — Authenticate user and receive JWT bearer token.
- `GET /api/auth/me` — Retrieve current authenticated user profile.
- `POST /api/auth/test-email` — Test live SMTP configuration and inbox delivery.

### Biometric Identity & Protection
- `POST /api/register-base64` — Enroll 5+ reference images for a protected person (Parallelized).
- `POST /api/scan-base64` — Scan single image for identity matches, AI synthesis, and metadata forensics.
- `POST /api/scan-video-base64` — Submit video for multi-frame deepfake detection and identity tracking.
- `GET /api/persons` — List all registered protected identities.
- `DELETE /api/persons/{person_id}` — Remove protected identity and delete vectors from FAISS index.

### Forensic Reports
- `GET /api/reports` — Fetch user scan report history from database.
- `POST /api/reports/{id}/resend-email` — Re-dispatch specific forensic report dossier to user's email.

---

##  Performance Acceleration Benchmarks (v2.5)

| Pipeline Operation | Before Optimization | After Optimization | Realized Speedup |
| :--- | :---: | :---: | :---: |
| **5-Photo Reference Enrollment** | ~15 – 18 sec | **~2.0 – 2.8 sec** | **~6x Faster**  |
| **Live Face Scan** | ~2.5 – 3.2 sec | **~0.6 – 0.8 sec** | **~4x Faster**  |
| **30-Second Video Lab Scan** | ~30 – 40 sec | **~4.5 – 6.0 sec** | **~7x Faster**  |
| **Deepfake ViT Batch (10 frames)**| ~4.2 sec | **~0.48 sec** | **~8.5x Faster**  |

---

##  Project Structure

```text
Swaraksha/
├── api/
│   └── main.py                 FastAPI application and REST endpoints
├── core/
│   ├── ai_detector.py          Vision Transformer deepfake detector with batching
│   ├── email_service.py        Automated HTML forensic report emailer (SMTP/TLS)
│   ├── encoder.py              ArcFace embeddings & parallel multi-threaded extractor
│   ├── face_index.py           FAISS vector index manager
│   ├── metadata_analyzer.py    C2PA provenance & EXIF forensic analyzer
│   ├── security.py             Bcrypt password hashing & JWT token manager
│   └── video_processor.py      Fast-path 720p video frame sampling engine
├── db/
│   ├── postgres_manager.py     SQLAlchemy ORM (PostgreSQL with SQLite fallback)
│   └── swaraksha.db            Local SQLite database
├── mobile/                     Expo SDK 57 React Native Mobile App
│   ├── App.js                  App state, session management, bottom navigation
│   ├── src/
│   │   ├── api/client.js       API client with auth header & base64 codecs
│   │   ├── components/         Header, VideoResultCard, ServerModal, TimelineTrack
│   │   ├── screens/            AuthScreen, ScanScreen, ReferenceScreen, ReportsScreen, VideoScreen
│   │   └── utils/storage.js    AsyncStorage token and user profile manager
│   └── package.json            Mobile dependencies (Expo SDK 57)
├── frontend/                   React + Vite desktop dashboard
├── tests/
│   └── test_auth_and_reports.py End-to-end integration test suite
├── .env.example                Environment template for SMTP & Database
├── config.py                   Central thresholds, paths, and model settings
├── requirements.txt            Backend Python dependencies
└── README.md                   Project documentation
```

---

##  Security & Privacy Notice

- All biometric facial embeddings and vector indexes are stored locally.
- Passwords are encrypted using salted **Bcrypt** hashes.
- `.env` and local database files are excluded from Git version control via `.gitignore`.
- Camera streams are processed in memory and never written to permanent disk storage.

---

