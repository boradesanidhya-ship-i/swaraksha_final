"""
 SWARAKSHA — FastAPI Backend
Endpoints for face registration, recognition, and AI-generated image detection.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import tempfile
import sys
import cv2
import numpy as np
from typing import List, Optional

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config
from core.encoder import generate_frame_embeddings, preload_models
from core.face_index import FaceIndex
from core.ai_detector import AIImageDetector
from db.database import DatabaseManager

app = FastAPI(
    title="SWARAKSHA API",
    description="Face Registration, Recognition & AI Image Detection",
    version="2.0.0",
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global instances (initialized on startup) ──────────────────────────────

db: DatabaseManager = None
face_index: FaceIndex = None
ai_detector: AIImageDetector = None


@app.on_event("startup")
async def startup_event():
    global db, face_index, ai_detector
    print("[SWARAKSHA] ═══════════════════════════════════════")
    print("[SWARAKSHA] Starting up...")

    # 1. Database
    print("[SWARAKSHA] Initializing database...")
    db = DatabaseManager()
    persons = db.list_persons()
    print(f"  ✓ Database ready — {len(persons)} registered person(s)")

    # 2. Face encoder models (RetinaFace + ArcFace)
    preload_models()

    # 3. FAISS face index
    print("[SWARAKSHA] Loading FAISS face index...")
    face_index = FaceIndex(db=db)
    print(f"  ✓ FAISS index ready — {face_index.total_embeddings} embedding(s)")

    # 4. AI Image Detector (downloads model on first run ~340MB)
    print("[SWARAKSHA] Loading AI Image Detector...")
    ai_detector = AIImageDetector()

    print("[SWARAKSHA] ═══════════════════════════════════════")
    print("[SWARAKSHA] All systems operational!")
    print("[SWARAKSHA] ═══════════════════════════════════════")


# ── Helper ──────────────────────────────────────────────────────────────────

def _decode_image(contents: bytes) -> np.ndarray:
    """Decode uploaded file bytes into a BGR numpy array."""
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file — could not decode.")
    return img


# ── Response Models ─────────────────────────────────────────────────────────

class PersonResponse(BaseModel):
    person_id: str
    name: str
    created_at: Optional[str] = None
    image_count: int = 0


class RegisterResponse(BaseModel):
    message: str
    person_id: str
    name: str
    faces_registered: int
    total_embeddings: int


class FaceMatch(BaseModel):
    person_id: str
    name: str
    similarity: float
    similarity_percent: float
    bbox: dict  # {x, y, w, h}


class RecognizeResponse(BaseModel):
    faces_detected: int
    matches: List[FaceMatch]
    unmatched_faces: int


class ScanFaceResult(BaseModel):
    person_id: Optional[str] = None
    name: Optional[str] = None
    similarity: Optional[float] = None
    bbox: dict
    ai_check: Optional[dict] = None
    action: str  # "BLOCK" or "ALLOW"
    reason: str


class ScanResponse(BaseModel):
    faces_detected: int
    results: List[ScanFaceResult]
    overall_action: str  # "BLOCK" if any face is flagged, "ALLOW" otherwise
    summary: str


class VideoScanResponse(BaseModel):
    frames_sampled: int
    frames_with_faces: int
    blocked_frames: int
    overall_action: str
    summary: str
    results: List[ScanFaceResult]


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    """Health check endpoint."""
    return {
        "status": "SWARAKSHA API is running",
        "version": "2.0.0",
        "registered_persons": len(db.list_persons()) if db else 0,
        "total_embeddings": face_index.total_embeddings if face_index else 0,
    }


@app.post("/api/register", response_model=RegisterResponse)
async def register_person(
    person_id: str = Form(...),
    name: str = Form(...),
    files: List[UploadFile] = File(...),
):
    """
    Register a person's identity by uploading one or more face photos.
    Multiple photos from different angles improve recognition accuracy.
    """
    if not files:
        raise HTTPException(status_code=400, detail="At least one image file is required.")

    # Create person in database (or skip if already exists)
    try:
        db.add_person(person_id, name)
    except ValueError:
        # Person already exists — we'll just add more images
        pass

    faces_registered = 0

    for file in files:
        contents = await file.read()
        img = _decode_image(contents)

        # Detect faces and generate embeddings
        faces = generate_frame_embeddings(img)
        if not faces:
            continue  # Skip images with no face detected

        # Take the primary (highest confidence) face from each image
        emb = faces[0]["embedding"]
        image_name = file.filename or "unknown"

        # Add to FAISS index + database
        face_index.add(person_id, emb, image_name)
        faces_registered += 1

    if faces_registered == 0:
        raise HTTPException(
            status_code=400,
            detail="No faces could be detected in any of the uploaded images.",
        )

    return RegisterResponse(
        message=f"Successfully registered {faces_registered} face(s) for '{name}'.",
        person_id=person_id,
        name=name,
        faces_registered=faces_registered,
        total_embeddings=face_index.total_embeddings,
    )


@app.post("/api/recognize", response_model=RecognizeResponse)
async def recognize_faces(file: UploadFile = File(...)):
    """
    Upload an image to recognize all registered persons in it.
    Works with single or multiple faces in the same image.
    """
    contents = await file.read()
    img = _decode_image(contents)

    # Detect all faces
    faces = generate_frame_embeddings(img)
    if not faces:
        return RecognizeResponse(faces_detected=0, matches=[], unmatched_faces=0)

    matches = []
    unmatched = 0

    for face_data in faces:
        emb = face_data["embedding"]
        area = face_data["facial_area"]

        # Search FAISS index
        search_results = face_index.search(emb, k=1)

        if search_results:
            best = search_results[0]
            person = db.get_person(best["person_id"])
            person_name = person["name"] if person else best["person_id"]

            matches.append(FaceMatch(
                person_id=best["person_id"],
                name=person_name,
                similarity=round(best["similarity"], 4),
                similarity_percent=round(max(0.0, best["similarity"]) * 100, 2),
                bbox=area,
            ))
        else:
            unmatched += 1

    return RecognizeResponse(
        faces_detected=len(faces),
        matches=matches,
        unmatched_faces=unmatched,
    )


def _scan_frame(img: np.ndarray) -> ScanResponse:
    """
    Full protection scan: recognize faces AND check for AI-generated content.
    If a registered person's face is detected in an AI-generated image, it's BLOCKED.
    """
    # Detect all faces
    faces = generate_frame_embeddings(img)
    if not faces:
        return ScanResponse(
            faces_detected=0,
            results=[],
            overall_action="ALLOW",
            summary="No faces detected in the image.",
        )

    results = []
    any_blocked = False

    for face_data in faces:
        emb = face_data["embedding"]
        area = face_data["facial_area"]

        # Search FAISS for identity match
        search_results = face_index.search(emb, k=1)

        if not search_results:
            # Unknown face — no identity match, skip AI check
            results.append(ScanFaceResult(
                bbox=area,
                action="ALLOW",
                reason="Face not in protected database — no match found.",
            ))
            continue

        best = search_results[0]
        person = db.get_person(best["person_id"])
        person_name = person["name"] if person else best["person_id"]

        # Identity matched! Now crop the face and run AI detection.
        x, y, w, h = area.get('x', 0), area.get('y', 0), area.get('w', 0), area.get('h', 0)

        # Add some padding around the crop for better AI detection
        pad = int(max(w, h) * 0.2)
        img_h, img_w = img.shape[:2]
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(img_w, x + w + pad)
        y2 = min(img_h, y + h + pad)
        face_crop = img[y1:y2, x1:x2]

        ai_result = ai_detector.analyze(face_crop)

        if ai_result["is_ai"]:
            any_blocked = True
            results.append(ScanFaceResult(
                person_id=best["person_id"],
                name=person_name,
                similarity=round(best["similarity"], 4),
                bbox=area,
                ai_check=ai_result,
                action="BLOCK",
                reason=f"⚠️ ALERT: AI-generated image of protected person '{person_name}' detected! "
                       f"(AI confidence: {ai_result['ai_confidence']:.1%})",
            ))
        else:
            results.append(ScanFaceResult(
                person_id=best["person_id"],
                name=person_name,
                similarity=round(best["similarity"], 4),
                bbox=area,
                ai_check=ai_result,
                action="ALLOW",
                reason=f"Protected person '{person_name}' identified. Image passed authenticity check.",
            ))

    blocked_count = sum(1 for r in results if r.action == "BLOCK")
    overall = "BLOCK" if any_blocked else "ALLOW"

    if any_blocked:
        summary = f"🚨 BLOCKED: {blocked_count} AI-generated face(s) of protected person(s) detected!"
    else:
        summary = f"✅ CLEAR: {len(faces)} face(s) analyzed. No AI manipulation detected."

    return ScanResponse(
        faces_detected=len(faces),
        results=results,
        overall_action=overall,
        summary=summary,
    )


@app.post("/api/scan", response_model=ScanResponse)
async def scan_image(file: UploadFile = File(...)):
    """Scan one uploaded image for protected identities and manipulation."""
    return _scan_frame(_decode_image(await file.read()))


@app.post("/api/scan-video", response_model=VideoScanResponse)
async def scan_video(file: UploadFile = File(...)):
    """Sample an uploaded video and scan each sampled frame."""
    suffix = os.path.splitext(file.filename or "upload.mp4")[1] or ".mp4"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(await file.read())
            temp_path = temp_file.name

        capture = cv2.VideoCapture(temp_path)
        if not capture.isOpened():
            raise HTTPException(status_code=400, detail="Could not open the uploaded video.")

        total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        sample_every = max(1, int(capture.get(cv2.CAP_PROP_FPS) or 1) * 2)
        frame_index = 0
        frames_sampled = 0
        frames_with_faces = 0
        blocked_frames = 0
        collected_results = []

        while True:
            ok, frame = capture.read()
            if not ok:
                break
            if frame_index % sample_every == 0:
                frames_sampled += 1
                frame_result = _scan_frame(frame)
                if frame_result.faces_detected:
                    frames_with_faces += 1
                    collected_results.extend(frame_result.results)
                    if frame_result.overall_action == "BLOCK":
                        blocked_frames += 1
            frame_index += 1
            if total_frames and frames_sampled >= 300:
                break

        capture.release()
        overall = "BLOCK" if blocked_frames else "ALLOW"
        summary = (f"BLOCKED: {blocked_frames} sampled frame(s) flagged."
                   if blocked_frames else
                   f"CLEAR: {frames_sampled} frame(s) sampled, {frames_with_faces} with faces detected.")
        return VideoScanResponse(
            frames_sampled=frames_sampled,
            frames_with_faces=frames_with_faces,
            blocked_frames=blocked_frames,
            overall_action=overall,
            summary=summary,
            results=collected_results[:50],
        )
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/api/persons", response_model=List[PersonResponse])
async def list_persons():
    """List all registered persons."""
    persons = db.list_persons()
    return [PersonResponse(**p) for p in persons]


@app.delete("/api/persons/{person_id}")
async def delete_person(person_id: str):
    """Remove a registered person and all their face data."""
    person = db.get_person(person_id)
    if not person:
        raise HTTPException(status_code=404, detail=f"Person '{person_id}' not found.")

    removed = face_index.remove_person(person_id)

    return {
        "message": f"Successfully removed '{person['name']}' and {removed} face embedding(s).",
        "person_id": person_id,
    }
