from typing import List, Optional
import hashlib

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, SessionLocal, engine

from drive_datasource import get_drive_datasource

# Create tables if they don't exist yet (users + history)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LUS Labeler Backend",
    description="Backend for LUS labeler (history, users, and Drive-backed data).",
    version="0.2.0",
)

# CORS (dev-friendly: allow all origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================
# Password hashing
# =====================

PASSWORD_SALT = "lus-labeler-demo-salt"  # any constant string


def hash_password(password: str) -> str:
    # Simple salted SHA-256 hash for this local tool
    data = (PASSWORD_SALT + password).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


# ====================================================
# PATIENT / CLASS / VIDEO ENDPOINTS (Google Drive)
# ====================================================

@app.get(
    "/api/patients",
    response_model=List[schemas.PatientOut],
)
def api_list_patients():
    """
    List all patients from Google Drive.

    Each direct subfolder of the configured Drive root folder
    is treated as a patient. We return objects with:

      {
        "patient_id": "<folder name>",
        "display_name": "<folder name>"
      }

    which matches what the frontend expects.
    """
    ds = get_drive_datasource()
    patient_names = ds.list_patients()  # e.g. ["Patient_1", "Patient_2", ...]
    return [
        schemas.PatientOut(patient_id=name, display_name=name)
        for name in patient_names
    ]


@app.get(
    "/api/patients/{patient_id}/classes",
    response_model=List[str],
)
def api_list_classes_for_patient(patient_id: str):
    """
    List classes for a given patient from Google Drive.

    Inside each patient folder we expect exactly three subfolders:
    H-LUS, C-LUS, I-LUS.
    """
    ds = get_drive_datasource()
    classes = ds.list_classes(patient_id)
    if not classes:
        # If patient_id is invalid or has no classes, we treat as 404.
        raise HTTPException(status_code=404, detail="Patient or classes not found")
    return classes


@app.get("/api/patients/{patient_id}/classes/{class_id}/videos")
def api_list_videos_for_patient_class(patient_id: str, class_id: str):
    """
    List videos for a given patient + class from Google Drive.

    Response format:
    [
        {
            "file_name": "class0_window0.mp4",
            "url": "/api/videos/<drive_file_id>"
        },
        ...
    ]

    The frontend will prefix with API_BASE_URL and feed this into
    the <video> element src.
    """
    ds = get_drive_datasource()
    videos = ds.list_videos(patient_id, class_id)
    if not videos:
        # Could be either invalid patient/class or simply empty class.
        # We return an empty list instead of 404 so UI can show "No sequences".
        return []

    return [
        {
            "file_name": v.file_name,
            "url": f"/api/videos/{v.file_id}",
        }
        for v in videos
    ]


@app.get("/api/videos/{file_id}")
def api_stream_video(file_id: str):
    """
    Stream a video file from Google Drive through the backend.

    The frontend <video> tag uses this as the src attribute.
    """
    ds = get_drive_datasource()
    chunk_iter = ds.download_video_stream(file_id)

    # If you want, you could add rudimentary error handling here
    # (e.g. try/except around download_video_stream to return 404).
    return StreamingResponse(chunk_iter, media_type="video/mp4")


# =====================
# HISTORY ENDPOINTS
# =====================

@app.get(
    "/history",
    response_model=List[schemas.HistoryEntryOut],
)
def list_history(
    annotator: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    List all history entries, newest first.
    Optionally filter by annotator=?.
    """
    query = db.query(models.HistoryEntry).order_by(models.HistoryEntry.id.desc())
    if annotator:
        query = query.filter(models.HistoryEntry.annotator == annotator)
    return query.all()


@app.post(
    "/history",
    response_model=schemas.HistoryEntryOut,
    status_code=201,
)
def add_history(
    entry: schemas.HistoryEntryCreate,
    db: Session = Depends(get_db),
):
    """
    Add a new history entry.
    """
    db_entry = models.HistoryEntry(
        patient_id=entry.patient_id,
        sequence_id=entry.sequence_id,
        previous_label=entry.previous_label,
        updated_label=entry.updated_label,
        annotator=entry.annotator,
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@app.delete("/history/{entry_id}")
def delete_history(
    entry_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete a history entry by ID.
    """
    db_entry = (
        db.query(models.HistoryEntry)
        .filter(models.HistoryEntry.id == entry_id)
        .first()
    )
    if not db_entry:
        raise HTTPException(status_code=404, detail="History entry not found")

    db.delete(db_entry)
    db.commit()
    return {"ok": True}


# =====================
# USER ENDPOINTS
# =====================

@app.post(
    "/users",
    response_model=schemas.UserOut,
    status_code=201,
)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new user. Password is stored as a salted SHA-256 hash.
    """
    existing = (
        db.query(models.User)
        .filter(models.User.username == user.username)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    user_obj = models.User(
        username=user.username,
        password_hash=hash_password(user.password),
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    return user_obj


@app.get("/users", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.delete("/users")
def delete_user(
    payload: schemas.UserDelete,
    db: Session = Depends(get_db),
):
    """
    Delete a user if the provided password matches.
    """
    user_obj = (
        db.query(models.User)
        .filter(models.User.username == payload.username)
        .first()
    )
    if user_obj is None:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(payload.password, user_obj.password_hash):
        raise HTTPException(status_code=403, detail="Incorrect password")

    db.delete(user_obj)
    db.commit()
    return {"detail": "User deleted"}


# =====================
# AUTH ENDPOINTS
# =====================

@app.post("/auth/login")
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Check username + password against stored users.
    """
    user_obj = (
        db.query(models.User)
        .filter(models.User.username == payload.username)
        .first()
    )
    if user_obj is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(payload.password, user_obj.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {"detail": "ok"}


@app.post("/auth/change-password", response_model=schemas.Message)
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Change the password for a given user.
    Requires correct old_password.
    """
    user_obj = (
        db.query(models.User)
        .filter(models.User.username == payload.username)
        .first()
    )
    if user_obj is None:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(payload.old_password, user_obj.password_hash):
        raise HTTPException(status_code=400, detail="Old password is incorrect")

    user_obj.password_hash = hash_password(payload.new_password)
    db.commit()

    return {"detail": "Password updated successfully"}

