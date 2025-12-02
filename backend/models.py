from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint

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

    # A sequence is uniquely identified by (patient_id, sequence_id)
    patient_id = Column(String, index=True, nullable=False)
    sequence_id = Column(String, index=True, nullable=False)

    previous_label = Column(String, index=True)
    updated_label = Column(String, index=True)
    annotator = Column(String, index=True)

    # This will store the time of the latest update
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("patient_id", "sequence_id", name="uq_patient_sequence"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

