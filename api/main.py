"""
 SWARAKSHA — FastAPI Backend
Endpoints for face registration, recognition, and AI-generated image detection.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Header, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import os
import tempfile
import sys
import cv2
import numpy as np
from typing import List, Optional, Dict, Any

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config
from core.encoder import generate_frame_embeddings, generate_batch_embeddings, preload_models
from core.face_index import FaceIndex
from core.ai_detector import AIImageDetector
from db.postgres_manager import DatabaseManager
from core.video_processor import extract_video_metadata, sample_video_frames
from core.metadata_analyzer import MetadataAnalyzer
from core.security import hash_password, verify_password, create_access_token, decode_access_token
from core.email_service import send_report_email

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

# ── Global instances ─────────────────────────────────────────────────────────

db: DatabaseManager = DatabaseManager()
face_index: FaceIndex = None
ai_detector: AIImageDetector = None
metadata_analyzer: MetadataAnalyzer = None


@app.on_event("startup")
async def startup_event():
    global db, face_index, ai_detector, metadata_analyzer
    print("[SWARAKSHA] ═══════════════════════════════════════")
    print("[SWARAKSHA] Starting up...")

    # 1. Database
    print("[SWARAKSHA] Initializing database...")
    if db is None:
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

    # 5. Metadata Forensics Analyzer (no model needed)
    print("[SWARAKSHA] Initializing Metadata Forensics Analyzer...")
    metadata_analyzer = MetadataAnalyzer()
    print("  ✓ Metadata Analyzer ready")

    print("[SWARAKSHA] ═══════════════════════════════════════")
    print("[SWARAKSHA] All systems operational!")
    print("[SWARAKSHA] ═══════════════════════════════════════")


# ── Helper ──────────────────────────────────────────────────────────────────

import base64

def _decode_image(contents: bytes) -> np.ndarray:
    """Decode uploaded file bytes into a BGR numpy array."""
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file — could not decode.")
    return img

def _decode_base64_image(b64_str: str):
    """Decode base64 string into raw bytes and OpenCV BGR image."""
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    raw_bytes = base64.b64decode(b64_str)
    img = _decode_image(raw_bytes)
    return raw_bytes, img


# ── Response & Request Models ───────────────────────────────────────────────

class RegisterUserRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    created_at: Optional[str] = None
    last_login: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


class ScanReportResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    report_type: str
    action_verdict: str
    summary: str
    details: dict
    email_sent: bool
    email_sent_at: Optional[str] = None
    created_at: Optional[str] = None


class TestEmailRequest(BaseModel):
    to_email: str
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = None


class RegisterBase64Request(BaseModel):
    person_id: str
    name: str
    images: List[str]


class ScanBase64Request(BaseModel):
    image: str
    filename: Optional[str] = "scan.jpg"
    user_email: Optional[str] = None
    email: Optional[str] = None


class ScanVideoBase64Request(BaseModel):
    video: str
    filename: Optional[str] = "upload.mp4"
    user_email: Optional[str] = None
    email: Optional[str] = None


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
    metadata_forensics: Optional[dict] = None


class VideoMetadata(BaseModel):
    duration: float
    fps: float
    total_frames: int
    sampled_frames: int

class VideoIdentityResult(BaseModel):
    protected_identity_detected: bool
    person_ids: List[str]
    frames_with_identity: int
    identity_frame_ratio: float

class VideoAIAnalysis(BaseModel):
    frames_analyzed: int
    frames_flagged: int
    flagged_frame_ratio: float
    aggregate_score: float
    status: str

class VideoFrameAIResult(BaseModel):
    performed: bool
    result: Optional[str] = None
    score: Optional[float] = None
    reason: Optional[str] = None
    error: Optional[str] = None

class VideoFrameIdentityMatch(BaseModel):
    person_id: str
    similarity: float

class VideoFrameResult(BaseModel):
    frame_number: int
    timestamp: float
    faces_detected: int
    identity_matches: List[VideoFrameIdentityMatch]
    protected_identity_detected: bool
    ai_analysis: VideoFrameAIResult

class VideoScanDetailedResponse(BaseModel):
    video: VideoMetadata
    identity: VideoIdentityResult
    ai_analysis: VideoAIAnalysis
    final_status: str
    frames: List[VideoFrameResult]
    summary: str
    metadata_forensics: Optional[dict] = None


# ── Auth & Security Helpers ──────────────────────────────────────────────────

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Extracts logged in user from Bearer JWT token if provided."""
    if not authorization:
        return None
    try:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
            payload = decode_access_token(token)
            if payload and "sub" in payload:
                user = db.get_user_by_email(payload["sub"])
                return user
    except Exception as e:
        print(f"[AUTH] Error verifying token: {e}")
    return None


def _save_and_dispatch_report(
    report_type: str,
    action_verdict: str,
    summary: str,
    details: dict,
    user: Optional[dict] = None,
    user_email_override: Optional[str] = None,
    background_tasks: Optional[BackgroundTasks] = None
):
    """Saves scan report to database and schedules email delivery."""
    try:
        user_id = user["id"] if user else None
        target_email = user_email_override or (user["email"] if user else None)

        # If no explicit email, check if any matched protected identity has an owner user
        if not target_email and details:
            identity_info = details.get("identity", {})
            p_ids = identity_info.get("person_ids", [])
            if not p_ids and details.get("results"):
                p_ids = [r.get("person_id") for r in details.get("results") if r.get("person_id")]

            for pid in p_ids:
                if pid:
                    person = db.get_person(pid)
                    if person and person.get("user_id"):
                        owner = db.get_user_by_id(person["user_id"])
                        if owner and owner.get("email"):
                            target_email = owner["email"]
                            user_id = owner["id"]
                            print(f"[REPORT] Auto-matched protected identity '{pid}' to user {target_email}")
                            break

        report = db.create_scan_report(
            report_type=report_type,
            action_verdict=action_verdict,
            summary=summary,
            details=details,
            user_id=user_id,
            user_email=target_email,
            email_sent=False
        )

        if target_email:
            print(f"[REPORT] Report #{report['id']} created for {target_email}. Queueing email dispatch...")
            if background_tasks:
                def _dispatch():
                    sent = send_report_email(target_email, report)
                    if sent:
                        db.mark_report_email_sent(report["id"])

                background_tasks.add_task(_dispatch)
            else:
                sent = send_report_email(target_email, report)
                if sent:
                    db.mark_report_email_sent(report["id"])
        else:
            print(f"[REPORT] Report #{report['id']} saved to database (No user email provided for email delivery).")
    except Exception as e:
        print(f"[REPORT] Error recording and dispatching scan report: {e}")


# ── Auth & Report Endpoints ─────────────────────────────────────────────────

@app.post("/api/auth/test-email")
async def test_email_endpoint(req: TestEmailRequest):
    """
    Test sending a live email to the specified address.
    """
    from core.email_service import send_test_email
    success, message = send_test_email(
        to_email=req.to_email,
        smtp_host=req.smtp_host,
        smtp_port=req.smtp_port,
        smtp_user=req.smtp_user,
        smtp_password=req.smtp_password,
        smtp_use_tls=req.smtp_use_tls
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message}


@app.post("/api/auth/register", response_model=AuthResponse)
async def register_user(req: RegisterUserRequest):
    """
    Register a new user account with email and password in PostgreSQL.
    """
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    if not req.password or len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    existing = db.get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    pw_hash = hash_password(req.password)
    user = db.create_user(req.email, pw_hash, req.full_name)

    token = create_access_token({"sub": user["email"], "uid": user["id"]})
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfileResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name"),
            created_at=user.get("created_at"),
            last_login=None
        )
    )


@app.post("/api/auth/login", response_model=AuthResponse)
async def login_user(req: LoginRequest):
    """
    Authenticate a user with email and password.
    """
    user = db.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        db.log_audit(None, "LOGIN_FAILED", details=f"Failed login attempt for {req.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled.")

    db.update_user_last_login(user["id"])
    db.log_audit(user["id"], "LOGIN_SUCCESS", details=f"User {user['email']} logged in successfully")

    token = create_access_token({"sub": user["email"], "uid": user["id"]})
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfileResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name"),
            created_at=user.get("created_at"),
            last_login=user.get("last_login")
        )
    )


@app.get("/api/auth/me", response_model=UserProfileResponse)
async def get_my_profile(user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """
    Get current logged in user profile.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return UserProfileResponse(
        id=user["id"],
        email=user["email"],
        full_name=user.get("full_name"),
        created_at=user.get("created_at"),
        last_login=user.get("last_login")
    )


@app.get("/api/reports", response_model=List[ScanReportResponse])
async def list_reports(
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    email: Optional[str] = None
):
    """
    Get scan report history for the logged in user or query email.
    """
    user_id = user["id"] if user else None
    target_email = email or (user["email"] if user else None)

    reports = db.get_user_reports(user_id=user_id, user_email=target_email, limit=50)
    return [ScanReportResponse(**r) for r in reports]


@app.post("/api/reports/{report_id}/resend-email")
async def resend_report_email(
    report_id: int,
    background_tasks: BackgroundTasks,
    to_email: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Resends a forensic scan report to the user's email address.
    """
    report = db.get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    target_email = to_email or report.get("user_email") or (user["email"] if user else None)
    if not target_email:
        raise HTTPException(status_code=400, detail="Recipient email address is required.")

    def _send_and_mark():
        success = send_report_email(target_email, report)
        if success:
            db.mark_report_email_sent(report_id)

    background_tasks.add_task(_send_and_mark)
    return {"message": f"Report #{report_id} email dispatch queued to {target_email}."}


# ── Core AI Endpoints ───────────────────────────────────────────────────────

@app.get("/")
def health_check():
    """Health check endpoint."""
    return {
        "status": "SWARAKSHA API is running",
        "version": "2.0.0",
        "database": "PostgreSQL" if getattr(db, 'is_postgres', False) else "SQLite",
        "registered_persons": len(db.list_persons()) if db else 0,
        "total_embeddings": face_index.total_embeddings if face_index else 0,
    }


@app.post("/api/register", response_model=RegisterResponse)
async def register_person(
    person_id: str = Form(...),
    name: str = Form(...),
    files: List[UploadFile] = File(...),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Register a person's identity by uploading one or more face photos.
    Multiple photos from different angles improve recognition accuracy.
    """
    if not files:
        raise HTTPException(status_code=400, detail="At least one image file is required.")

    user_id = user["id"] if user else None

    # Create person in database (or skip if already exists)
    try:
        db.add_person(person_id, name, user_id=user_id)
    except ValueError:
        pass

    # Decode all images
    decoded_images = []
    image_names = []
    for file in files:
        contents = await file.read()
        img = _decode_image(contents)
        if img is not None:
            decoded_images.append(img)
            image_names.append(file.filename or "unknown.jpg")

    # Extract face embeddings in parallel across CPU threads
    batch_faces = generate_batch_embeddings(decoded_images, max_workers=4)

    faces_registered = 0
    for idx, faces in enumerate(batch_faces):
        if not faces:
            continue
        emb = faces[0]["embedding"]
        image_name = image_names[idx]
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


@app.post("/api/register-base64", response_model=RegisterResponse)
async def register_person_base64(req: RegisterBase64Request):
    """
    Register a person's identity via JSON base64 payloads with parallel multi-core acceleration.
    """
    if not req.images:
        raise HTTPException(status_code=400, detail="At least one image is required.")

    try:
        db.add_person(req.person_id, req.name)
    except ValueError:
        pass

    # Fast parallel decode
    decoded_images = []
    for idx, b64_img in enumerate(req.images):
        try:
            _, img = _decode_base64_image(b64_img)
            if img is not None:
                decoded_images.append(img)
        except Exception as e:
            print(f"[REGISTER] Error decoding base64 image {idx}: {e}")

    # Extract all face embeddings concurrently in parallel threads
    batch_faces = generate_batch_embeddings(decoded_images, max_workers=min(4, len(decoded_images)))

    faces_registered = 0
    for idx, faces in enumerate(batch_faces):
        if not faces:
            continue
        emb = faces[0]["embedding"]
        image_name = f"reference_{idx + 1}.jpg"
        face_index.add(req.person_id, emb, image_name)
        faces_registered += 1

    if faces_registered == 0:
        raise HTTPException(
            status_code=400,
            detail="No faces could be detected in any uploaded images.",
        )

    return RegisterResponse(
        message=f"Successfully registered {faces_registered} face(s) for '{req.name}'.",
        person_id=req.person_id,
        name=req.name,
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
async def scan_image(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    user_email: Optional[str] = Header(None)
):
    """Scan one uploaded image for protected identities and manipulation."""
    contents = await file.read()
    img = _decode_image(contents)
    result = _scan_frame(img)

    # Run metadata forensics on the uploaded file bytes
    try:
        meta_result = metadata_analyzer.analyze_image_bytes(contents, filename=file.filename or "image.jpg")
        print(f"[METADATA] Image scan: {meta_result['confidence']} confidence, {len(meta_result['flags'])} flag(s)")
        for flag in meta_result['flags']:
            print(f"  → {flag}")
        result.metadata_forensics = meta_result

        # If metadata strongly suggests AI but the model missed it, upgrade the action
        if meta_result['confidence'] == 'high' and result.overall_action == 'ALLOW':
            has_protected = any(r.person_id for r in result.results)
            if has_protected:
                result.overall_action = 'BLOCK'
                result.summary += " ⚠️ Metadata forensics detected strong AI-generation markers."
    except Exception as e:
        print(f"[METADATA] Error during metadata analysis: {e}")

    # Auto-save report & dispatch email in background
    _save_and_dispatch_report(
        report_type="FACE_SCAN",
        action_verdict=result.overall_action,
        summary=result.summary,
        details=result.dict(),
        user=user,
        user_email_override=user_email,
        background_tasks=background_tasks
    )

    return result


@app.post("/api/scan-base64", response_model=ScanResponse)
async def scan_image_base64(
    req: ScanBase64Request,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    user_email: Optional[str] = Header(None)
):
    """Scan base64 image for protected identities and AI manipulation."""
    contents, img = _decode_base64_image(req.image)
    result = _scan_frame(img)

    try:
        meta_result = metadata_analyzer.analyze_image_bytes(contents, filename=req.filename or "image.jpg")
        result.metadata_forensics = meta_result

        if meta_result['confidence'] == 'high' and result.overall_action == 'ALLOW':
            has_protected = any(r.person_id for r in result.results)
            if has_protected:
                result.overall_action = 'BLOCK'
                result.summary += " ⚠️ Metadata forensics detected strong AI-generation markers."
    except Exception as e:
        print(f"[METADATA] Error during base64 metadata analysis: {e}")

    # Auto-save report & dispatch email in background
    target_email = req.user_email or req.email or user_email
    _save_and_dispatch_report(
        report_type="FACE_SCAN",
        action_verdict=result.overall_action,
        summary=result.summary,
        details=result.dict(),
        user=user,
        user_email_override=target_email,
        background_tasks=background_tasks
    )

    return result


def _process_video_file(temp_path: str, filename: str) -> VideoScanDetailedResponse:
    print(f"[VIDEO] Received video: {filename}")
    
    # 0. Metadata Forensics on the video file
    video_meta_forensics = None
    try:
        if metadata_analyzer is not None:
            video_meta_forensics = metadata_analyzer.analyze_video_file(temp_path)
            print(f"[METADATA] Video scan: {video_meta_forensics['confidence']} confidence, {len(video_meta_forensics['flags'])} flag(s)")
            for flag in video_meta_forensics['flags']:
                print(f"  → {flag}")
    except Exception as e:
        print(f"[METADATA] Error during video metadata analysis: {e}")

    # 1. Video Metadata
    try:
        metadata = extract_video_metadata(temp_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid or corrupted video: {e}")
        
    print(f"[VIDEO] Duration: {metadata['duration']} sec, FPS: {metadata['fps']}")
    
    sample_interval = getattr(config, 'VIDEO_SAMPLE_INTERVAL', 2.0)
    print(f"[VIDEO] Sampling every {sample_interval} sec")

    # 2. Extract Sampled Frames (auto 720p scaling for 4x speedup)
    sampled_frames = list(sample_video_frames(temp_path, sample_interval, max_dim=720))
    print(f"[VIDEO] Sampled {len(sampled_frames)} frames")

    if not sampled_frames:
        raise HTTPException(status_code=400, detail="Could not extract any valid video frames.")

    # 3. Multi-Threaded Face Detection & Identity Matching (Layer 1)
    frame_images = [f["frame"] for f in sampled_frames]
    batch_faces_per_frame = generate_batch_embeddings(frame_images, max_workers=4)

    frames_results = []
    relevant_frames = [] # Tuples of (frame_result, list of protected face crops)
    person_ids_detected = set()

    for idx, frame_data in enumerate(sampled_frames):
        frame_num = frame_data["frame_number"]
        timestamp = frame_data["timestamp"]
        frame_img = frame_data["frame"]
        faces = batch_faces_per_frame[idx] if idx < len(batch_faces_per_frame) else []

        identity_matches = []
        protected_detected = False
        protected_face_crops = []

        if faces:
            for face in faces:
                emb = face["embedding"]
                area = face["facial_area"]
                search_results = face_index.search(emb, k=1)

                if search_results:
                    best = search_results[0]
                    sim = best["similarity"]
                    pid = best["person_id"]

                    identity_matches.append(VideoFrameIdentityMatch(
                        person_id=pid,
                        similarity=round(sim, 4)
                    ))

                    protected_detected = True
                    person_ids_detected.add(pid)

                    # Crop face with margin for AI analysis
                    x, y, w, h = area.get('x', 0), area.get('y', 0), area.get('w', 0), area.get('h', 0)
                    pad = int(max(w, h) * 0.2)
                    img_h, img_w = frame_img.shape[:2]
                    x1 = max(0, x - pad)
                    y1 = max(0, y - pad)
                    x2 = min(img_w, x + w + pad)
                    y2 = min(img_h, y + h + pad)
                    protected_face_crops.append(frame_img[y1:y2, x1:x2])

        frame_res = VideoFrameResult(
            frame_number=frame_num,
            timestamp=timestamp,
            faces_detected=len(faces),
            identity_matches=identity_matches,
            protected_identity_detected=protected_detected,
            ai_analysis=VideoFrameAIResult(performed=False, reason="NO_PROTECTED_IDENTITY")
        )
        frames_results.append(frame_res)

        if protected_detected and protected_face_crops:
            relevant_frames.append((frame_res, protected_face_crops))

    print(f"[VIDEO] Protected identity found in {len(relevant_frames)}/{len(sampled_frames)} frames")

    # 4. Accelerated Vectorized AI Detection (Layer 2)
    flagged_frames_count = 0
    total_ai_scores = []

    # Flatten all crops for a single batch forward pass
    flat_crops = []
    crop_mapping = [] # (relevant_frame_idx, crop_idx)
    for r_idx, (frame_res, crops) in enumerate(relevant_frames):
        for c in crops:
            flat_crops.append(c)
            crop_mapping.append(r_idx)

    if flat_crops:
        # Run one single vectorized batch forward pass across all crops!
        batch_ai_results = ai_detector.analyze_batch(flat_crops)

        # Distribute results back to respective frames
        frame_crop_scores = {r_idx: [] for r_idx in range(len(relevant_frames))}
        frame_crop_flagged = {r_idx: False for r_idx in range(len(relevant_frames))}

        for c_idx, res in enumerate(batch_ai_results):
            r_idx = crop_mapping[c_idx]
            score = res.get("ai_confidence", 0.0)
            frame_crop_scores[r_idx].append(score)
            if res.get("is_ai", False):
                frame_crop_flagged[r_idx] = True

        for r_idx, (frame_res, _) in enumerate(relevant_frames):
            scores = frame_crop_scores[r_idx]
            max_score = max(scores) if scores else 0.0
            is_flagged = frame_crop_flagged[r_idx]

            total_ai_scores.append(max_score)
            if is_flagged:
                flagged_frames_count += 1

            frame_res.ai_analysis = VideoFrameAIResult(
                performed=True,
                result="AI_GENERATED" if is_flagged else "REAL",
                score=round(max_score, 4)
            )

    # 5. Video-Level Aggregation
    frames_with_identity_count = len(relevant_frames)
    identity_ratio = frames_with_identity_count / len(sampled_frames) if sampled_frames else 0.0
    
    frames_analyzed = len(total_ai_scores)
    flagged_ratio = flagged_frames_count / frames_analyzed if frames_analyzed else 0.0
    
    # Calculate aggregate AI score (median)
    if total_ai_scores:
        aggregate_score = float(np.median(total_ai_scores))
    else:
        aggregate_score = 0.0
        
    print(f"[VIDEO] AI analysis completed: {frames_analyzed} frames")

    # 6. Video Decision
    meta_boost = (video_meta_forensics and video_meta_forensics.get('confidence') in ('medium', 'high'))

    if frames_with_identity_count == 0:
        final_status = "NO_THREAT_DETECTED"
        ai_status = "NOT_ANALYZED"
        summary = f"CLEAR: {len(sampled_frames)} frame(s) sampled, no protected identity detected."
        if meta_boost:
            summary += " ⚠️ However, file metadata contains AI-generation markers."
    else:
        if flagged_ratio >= 0.3 or (flagged_frames_count > 0 and aggregate_score >= config.AI_DETECTOR_THRESHOLD) or meta_boost:
            final_status = "POTENTIAL_AI_MANIPULATION"
            ai_status = "POTENTIAL_AI_MANIPULATION"
            reasons = []
            if flagged_frames_count > 0:
                reasons.append(f"{flagged_frames_count} frames flagged by AI detector")
            if meta_boost:
                reasons.append("file metadata contains AI-generation markers")
            summary = f"REVIEW REQUIRED: {', '.join(reasons)}."
        else:
            final_status = "REVIEW_REQUIRED" if flagged_frames_count > 0 else "NO_THREAT_DETECTED"
            ai_status = "NO_STRONG_AI_EVIDENCE"
            summary = f"CLEAR: Protected identity found in {frames_with_identity_count} frames. No strong evidence of manipulation."
            
    print(f"[VIDEO] Final status: {final_status}")

    return VideoScanDetailedResponse(
        video=VideoMetadata(
            duration=metadata["duration"],
            fps=metadata["fps"],
            total_frames=metadata["total_frames"],
            sampled_frames=len(sampled_frames)
        ),
        identity=VideoIdentityResult(
            protected_identity_detected=(frames_with_identity_count > 0),
            person_ids=list(person_ids_detected),
            frames_with_identity=frames_with_identity_count,
            identity_frame_ratio=round(identity_ratio, 4)
        ),
        ai_analysis=VideoAIAnalysis(
            frames_analyzed=frames_analyzed,
            frames_flagged=flagged_frames_count,
            flagged_frame_ratio=round(flagged_ratio, 4),
            aggregate_score=round(aggregate_score, 4),
            status=ai_status
        ),
        final_status=final_status,
        summary=summary,
        frames=frames_results,
        metadata_forensics=video_meta_forensics
    )


@app.post("/api/scan-video", response_model=VideoScanDetailedResponse)
async def scan_video(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    user_email: Optional[str] = Header(None)
):
    """Sample an uploaded video and scan each sampled frame."""
    filename = file.filename or "upload.mp4"
    suffix = os.path.splitext(filename)[1]
    if not suffix or suffix.lower() not in [".mp4", ".mov", ".avi", ".mkv", ".webm", ".3gp", ".m4v"]:
        suffix = ".mp4"
        
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(await file.read())
            temp_path = temp_file.name

        result = _process_video_file(temp_path, filename)

        # Auto-save report & dispatch email in background
        _save_and_dispatch_report(
            report_type="VIDEO_SCAN",
            action_verdict=result.final_status,
            summary=result.summary,
            details=result.dict(),
            user=user,
            user_email_override=user_email,
            background_tasks=background_tasks
        )

        return result
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/api/scan-video-base64", response_model=VideoScanDetailedResponse)
async def scan_video_base64(
    req: ScanVideoBase64Request,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    user_email: Optional[str] = Header(None)
):
    """Scan base64-encoded video (ideal for mobile clients)."""
    b64_str = req.video
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    video_bytes = base64.b64decode(b64_str)

    filename = req.filename or "upload.mp4"
    suffix = os.path.splitext(filename)[1]
    if not suffix or suffix.lower() not in [".mp4", ".mov", ".avi", ".mkv", ".webm", ".3gp", ".m4v"]:
        suffix = ".mp4"

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(video_bytes)
            temp_path = temp_file.name

        result = _process_video_file(temp_path, filename)

        # Auto-save report & dispatch email in background
        target_email = req.user_email or req.email or user_email
        _save_and_dispatch_report(
            report_type="VIDEO_SCAN",
            action_verdict=result.final_status,
            summary=result.summary,
            details=result.dict(),
            user=user,
            user_email_override=target_email,
            background_tasks=background_tasks
        )

        return result
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
