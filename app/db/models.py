"""
models.py: Defines SQLAlchemy ORM models for the database.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Boolean
from sqlalchemy.orm import relationship
import datetime
import pytz
from app.db.database import Base

# Import audit models to ensure they're available during table creation
from app.audit.models import AuditLog, LoginAttempt, DataRetentionPolicy

# Import nudge models to ensure they're available during table creation
from app.db.nudge_models import NudgeLog, NotificationPreference, ScheduledNudge, UserStatus, NudgeRule

def get_utc_now():
    """Get current UTC time with timezone info"""
    return datetime.datetime.now(pytz.UTC)

class Patient(Base):
    """
    SQLAlchemy model for a patient.
    """
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    phone_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)
    
    notes = relationship("Note", back_populates="patient")
    user = relationship("User", back_populates="patients")
    # Appointments relationship
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")

class Note(Base):
    """
    SQLAlchemy model for a note.
    """
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True, nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    visit_id = Column(Integer, index=True, nullable=False)
    note_type = Column(String, nullable=False) #Progress, discharge,admission, consult,etc.
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False, default="draft") #draft, signed, completed, cancelled

    audio_file = Column(String, nullable=True)  # Path or URL to uploaded audio file
    s3_key = Column(String, nullable=True)  # S3 object key if stored in S3
    file_size = Column(Integer, nullable=True)  # File size in bytes
    content_type = Column(String, nullable=True)  # MIME type of the audio file
    storage_provider = Column(String, nullable=True, default="local")  # "local" or "s3"
    
    # Transcription and AI processing fields
    transcript = Column(Text, nullable=True)  # Full transcribed conversation
    soap_subjective = Column(Text, nullable=True)  # SOAP: Subjective
    soap_objective = Column(Text, nullable=True)  # SOAP: Objective  
    soap_assessment = Column(Text, nullable=True)  # SOAP: Assessment
    soap_plan = Column(Text, nullable=True)  # SOAP: Plan
    
    user = relationship("User", back_populates="notes")
    patient = relationship("Patient", back_populates="notes")

class Appointment(Base):
    """
    Appointment model representing a scheduled visit for a patient.
    Notifies medical personnel notify_before_minutes before scheduled_at.
    """
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    notify_before_minutes = Column(Integer, default=30, nullable=False)
    notified = Column(Boolean, default=False, nullable=False)
    # Visit flow
    status = Column(String, nullable=False, default="scheduled")  # scheduled, checked_in, in_progress, completed, cancelled
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    user = relationship("User")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)  # Add email field
    is_active = Column(Integer, default=1)
    is_admin = Column(Integer, default=0)  # 0 = regular user, 1 = admin
    
    # HIPAA Role-based access control
    role = Column(String, default="provider")  # provider, admin, auditor, read_only
    last_login = Column(DateTime(timezone=True), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    account_locked_until = Column(DateTime(timezone=True), nullable=True)
    
    notes = relationship("Note", back_populates="user")
    patients = relationship("Patient", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    # Nudge/notification relationships
    notification_preferences = relationship("NotificationPreference", uselist=False, back_populates="user")
    status = relationship("UserStatus", uselist=False, back_populates="user")
