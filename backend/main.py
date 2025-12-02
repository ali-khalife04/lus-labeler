from typing import List, Optional
import hashlib
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, SessionLocal, engine

from drive_datasource import get_drive_datasource

# Create tables (works for SQLite local or Postgres on Render)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LUS Labeler Backend",
    description="Backend for LUS labeler (history, users, and Drive-backed data).",
    version="0.3.0",
)

# ------------------
# CORS
# ------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------
# Password hashing
# ------------------

PASSWORD_SALT = "lus-labeler-demo-salt"


def hash_password(password: str) -> str:
    data = (PASSWORD_SALT + password).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password


# ------------------
# DB dependency
# ------------------

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
# GOOGLE DRIVE DATA ENDPOINTS
# ====================================================

@app.get("/api/patients", response_model=List[schemas.PatientOut])
def api_list_patients():
    ds = get_drive_datasource()
    patient_names = ds.list_patients()
    return [schemas.PatientOut(patient_id=name, display_name=name) for name in patient_names]


@app.get("/api/patients/{patient_id}/classes", response_model=List[str])
def api_list_classes_for_patient(patient_id: str):
    ds = get_drive_datasource()
    classes = ds.list_classes(patient_id)
    if not classes:
        raise HTTPException(status_code=404, detail="Patient or classes not found")
    return classes


@app.get("/api/patients/{patient_id}/classes/{class_id}/videos")
def api_list_videos_for_patient_class(patient_id: str, class_id: str):
    ds = get_drive_datasource()
    videos = ds.list_videos(patient_id, class_id)
    if not videos:
        return []
    return [{"file_name": v.file_name, "url": f"/api/videos/{v.file_id}"} for v in videos]


@app.get("/api/videos/{file_id}")
def api_stream_video(file_id: str):
    ds = get_drive_datasource()
    chunk_iter = ds.download_video_stream(file_id)
    return StreamingResponse(chunk_iter, media_type="video/mp4")


# ====================================================
# HISTORY (UP-SERT LOGIC)
# ====================================================

@app.get("/history", response_model=List[schemas.HistoryEntryOut])
def list_history(
    annotator: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Returns ONE record per (patient_id, sequence_id), newest first.
    """
    query = db.query(models.HistoryEntry)

    if annotator:
        query = query.filter(models.HistoryEntry.annotator == annotator)

    return query.order_by(models.HistoryEntry.timestamp.desc()).all()


@app.post("/history", response_model=schemas.HistoryEntryOut, status_code=201)
def upsert_history(entry: schemas.HistoryEntryCreate, db: Session = Depends(get_db)):
    """
    Updates the existing record for patient+sequence or creates one if missing.
    Only the latest correction is stored.
    """
    existing = (
        db.query(models.HistoryEntry)
        .filter(
            models.HistoryEntry.patient_id == entry.patient_id,
            models.HistoryEntry.sequence_id == entry.sequence_id,
        )
        .first()
    )

    if existing:
        existing.previous_label = entry.previous_label
        existing.updated_label = entry.updated_label
        existing.annotator = entry.annotator
        existing.timestamp = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    new_entry = models.HistoryEntry(
        patient_id=entry.patient_id,
        sequence_id=entry.sequence_id,
        previous_label=entry.previous_label,
        updated_label=entry.updated_label,
        annotator=entry.annotator,
        timestamp=datetime.utcnow(),
    )

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


@app.delete("/history/{entry_id}")
def delete_history(entry_id: int, db: Session = Depends(get_db)):
    """
    Delete a stored history entry (rarely needed since there's only one per sequence).
    """
    record = db.query(models.HistoryEntry).filter(models.HistoryEntry.id == entry_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="History entry not found")

    db.delete(record)
    db.commit()
    return {"ok": True}


# ====================================================
# USER MANAGEMENT
# ====================================================

@app.post("/users", response_model=schemas.UserOut, status_code=201)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    obj = models.User(
        username=user.username,
        password_hash=hash_password(user.password),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.get("/users", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.delete("/users")
def delete_user(payload: schemas.UserDelete, db: Session = Depends(get_db)):
    user_obj = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(payload.password, user_obj.password_hash):
        raise HTTPException(status_code=403, detail="Incorrect password")

    db.delete(user_obj)
    db.commit()
    return {"detail": "User deleted"}


# ====================================================
# AUTH
# ====================================================

@app.post("/auth/login")
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user_obj = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user_obj or not verify_password(payload.password, user_obj.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {"detail": "ok"}


@app.post("/auth/change-password", response_model=schemas.Message)
def change_password(payload: schemas.ChangePasswordRequest, db: Session = Depends(get_db)):
    user_obj = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(payload.old_password, user_obj.password_hash):
        raise HTTPException(status_code=400, detail="Old password is incorrect")

    user_obj.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"detail": "Password updated successfully"}

