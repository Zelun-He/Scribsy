"""
models.py: Defines SQLAlchemy ORM models for the database.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Boolean, Float
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
    
    # Tenant isolation
    tenant_id = Column(String, nullable=False, default="default", index=True)  # Tenant identifier
    
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
    
    # AI accuracy tracking
    original_content = Column(Text, nullable=True)  # Original AI-generated content
    accuracy_score = Column(Float, nullable=True, default=100.0)  # Accuracy percentage (0-100)
    content_changes_count = Column(Integer, nullable=True, default=0)  # Number of times content was modified
    
    # Note creation method and timing tracking
    creation_method = Column(String, nullable=False, default="handwritten")  # handwritten, ai_assisted, ai_generated, voice_transcription
    creation_started_at = Column(DateTime(timezone=True), nullable=True)  # When note creation began
    creation_completed_at = Column(DateTime(timezone=True), nullable=True)  # When note was saved
    baseline_time_minutes = Column(Integer, nullable=True)  # Expected time for this creation method
    actual_time_minutes = Column(Integer, nullable=True)  # Actual time taken
    time_saved_minutes = Column(Integer, nullable=True)  # Time saved vs baseline
    
    # Edit lock and signing protection
    locked_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    lock_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audio retention and secure delete
    audio_retention_days = Column(Integer, nullable=True, default=30)  # Default 30 days
    audio_deleted_at = Column(DateTime(timezone=True), nullable=True)
    audio_secure_deleted = Column(Boolean, default=False)
    
    # Tenant isolation
    tenant_id = Column(String, nullable=False, default="default", index=True)  # Tenant identifier
    
    user = relationship("User", foreign_keys=[provider_id], back_populates="notes")
    patient = relationship("Patient", back_populates="notes")
    locked_by_user = relationship("User", foreign_keys=[locked_by_user_id])
    # Relationships for collaboration
    history_entries = relationship("NoteHistory", back_populates="note", cascade="all, delete-orphan")
    # AI provenance and coding
    provenance = relationship("NoteProvenance", back_populates="note", cascade="all, delete-orphan")
    codes = relationship("NoteCodeExtraction", back_populates="note", cascade="all, delete-orphan")

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


class NoteHistory(Base):
    __tablename__ = "note_history"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    username = Column(String, nullable=False)
    action = Column(String, nullable=False)  # e.g., UPDATE
    summary = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    note = relationship("Note", back_populates="history_entries")
    user = relationship("User")

class NoteProvenance(Base):
    __tablename__ = "note_provenance"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), index=True, nullable=False)
    section = Column(String, nullable=True)  # subjective/objective/assessment/plan/content
    sentence_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    transcript_start_ms = Column(Integer, nullable=True)
    transcript_end_ms = Column(Integer, nullable=True)
    audio_start_ms = Column(Integer, nullable=True)
    audio_end_ms = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=True)  # 0..1
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    note = relationship("Note", back_populates="provenance")

class NoteCodeExtraction(Base):
    __tablename__ = "note_codes"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), index=True, nullable=False)
    system = Column(String, nullable=False)  # ICD10, SNOMED, CPT, RxNorm, LOINC, HCC
    code = Column(String, nullable=False)
    display = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)  # 0..1
    status = Column(String, nullable=False, default="suggested")  # suggested/accepted/rejected
    source_span = Column(String, nullable=True)  # optional reference text range
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    note = relationship("Note", back_populates="codes")


class NoteComment(Base):
    __tablename__ = "note_comments"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    username = Column(String, nullable=False)  # Store username directly for performance
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)
    is_resolved = Column(Boolean, default=False)
    
    note = relationship("Note")
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
    
    # Tenant isolation
    tenant_id = Column(String, nullable=False, default="default", index=True)  # Tenant identifier
    
    # Working hours tracking
    work_start_time = Column(String, default="09:00")  # Format: "HH:MM"
    work_end_time = Column(String, default="17:00")   # Format: "HH:MM"
    timezone = Column(String, default="UTC")          # User's timezone
    working_days = Column(String, default="1,2,3,4,5")  # Comma-separated: 1=Monday, 7=Sunday
    
    notes = relationship("Note", foreign_keys="Note.provider_id", back_populates="user")
    patients = relationship("Patient", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    # Nudge/notification relationships
    notification_preferences = relationship("NotificationPreference", uselist=False, back_populates="user")
    status = relationship("UserStatus", uselist=False, back_populates="user")
    
    # Password reset tokens
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")

class PasswordResetToken(Base):
    """
    Model for storing password reset verification tokens
    """
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    
    # Tenant isolation
    tenant_id = Column(String, nullable=False, default="default", index=True)
    
    user = relationship("User", back_populates="password_reset_tokens")
