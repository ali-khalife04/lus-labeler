from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# =========================
# Patient schemas
# =========================

class PatientBase(BaseModel):
    patient_id: str
    display_name: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientOut(PatientBase):
    class Config:
        orm_mode = True


# =========================
# History schemas
# =========================

class HistoryEntryBase(BaseModel):
    patient_id: str
    sequence_id: str
    previous_label: str
    updated_label: str
    annotator: str


class HistoryEntryCreate(HistoryEntryBase):
    pass


class HistoryEntryOut(HistoryEntryBase):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True


# =========================
# User schemas
# =========================

class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str


class UserDelete(UserBase):
    password: str


class UserOut(BaseModel):
    id: int
    username: str

    class Config:
        orm_mode = True


class LoginRequest(BaseModel):
    username: str
    password: str


# =========================
# Change password schemas
# =========================

class ChangePasswordRequest(BaseModel):
    username: str
    old_password: str
    new_password: str


class Message(BaseModel):
    detail: str

