from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from database import Base


class Patient(Base):
    __tablename__ = "patients"

    # We use the folder name (e.g. "Patient_1") as the primary key.
    patient_id = Column(String, primary_key=True, index=True)

    # Optional nicer label to show in the UI later if needed.
    display_name = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class HistoryEntry(Base):
    __tablename__ = "history_entries"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True)
    sequence_id = Column(String, index=True)
    previous_label = Column(String, index=True)
    updated_label = Column(String, index=True)
    annotator = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

