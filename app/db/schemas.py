"""
schemas.py: Defines Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

class PatientBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    tenant_id: Optional[str] = "default"
    phone_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

class PatientCreate(PatientBase):
    user_id: int  # Required for database creation

class PatientCreateRequest(PatientBase):
    pass  # API request schema - user_id will be added by the endpoint

class PatientRead(PatientBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    # Optional summary counts
    

    class Config:
        from_attributes = True

class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

# Appointment Schemas
class AppointmentBase(BaseModel):
    patient_id: int
    scheduled_at: datetime
    title: Optional[str] = None
    note: Optional[str] = None
    notify_before_minutes: int = 30
    status: Optional[str] = None
    checked_in_at: Optional[datetime] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentRead(AppointmentBase):
    id: int
    user_id: int
    notified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    note: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    notify_before_minutes: Optional[int] = None

class NoteBase(BaseModel):
    patient_id: int
    provider_id: int
    visit_id: Optional[int] = None  # Optional - will be auto-generated if not provided
    note_type: str
    content: str
    status: str
    signed_at: Optional[datetime] = None
    tenant_id: Optional[str] = "default"
    audio_file: Optional[str] = None  # Path or URL to uploaded audio file
    transcript: Optional[str] = None  # Full transcribed conversation
    soap_subjective: Optional[str] = None  # SOAP: Subjective
    soap_objective: Optional[str] = None  # SOAP: Objective  
    soap_assessment: Optional[str] = None  # SOAP: Assessment
    soap_plan: Optional[str] = None  # SOAP: Plan
    # AI accuracy tracking
    original_content: Optional[str] = None  # Original AI-generated content
    accuracy_score: Optional[float] = None  # Accuracy percentage (0-100)
    content_changes_count: Optional[int] = None  # Number of times content was modified
    # Note creation method and timing tracking
    creation_method: Optional[str] = "handwritten"  # handwritten, ai_assisted, ai_generated, voice_transcription
    creation_started_at: Optional[datetime] = None  # When note creation began
    creation_completed_at: Optional[datetime] = None  # When note was saved
    baseline_time_minutes: Optional[int] = None  # Expected time for this creation method
    actual_time_minutes: Optional[int] = None  # Actual time taken
    time_saved_minutes: Optional[int] = None  # Time saved vs baseline
    # Edit lock and signing protection
    locked_by_user_id: Optional[int] = None
    locked_at: Optional[datetime] = None
    lock_expires_at: Optional[datetime] = None
    # Audio retention and secure delete
    audio_retention_days: Optional[int] = 30
    audio_deleted_at: Optional[datetime] = None
    audio_secure_deleted: Optional[bool] = False

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    note_type: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None
    signed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    audio_file: Optional[str] = None  # Path or URL to uploaded audio file
    transcript: Optional[str] = None  # Full transcribed conversation
    soap_subjective: Optional[str] = None  # SOAP: Subjective
    soap_objective: Optional[str] = None  # SOAP: Objective  
    soap_assessment: Optional[str] = None  # SOAP: Assessment
    soap_plan: Optional[str] = None  # SOAP: Plan
    # AI accuracy tracking
    original_content: Optional[str] = None  # Original AI-generated content
    accuracy_score: Optional[float] = None  # Accuracy percentage (0-100)
    content_changes_count: Optional[int] = None  # Number of times content was modified
    # Note creation method and timing tracking
    creation_method: Optional[str] = None  # handwritten, ai_assisted, ai_generated, voice_transcription
    creation_started_at: Optional[datetime] = None  # When note creation began
    creation_completed_at: Optional[datetime] = None  # When note was saved
    baseline_time_minutes: Optional[int] = None  # Expected time for this creation method
    actual_time_minutes: Optional[int] = None  # Actual time taken
    time_saved_minutes: Optional[int] = None  # Time saved vs baseline

class NoteRead(NoteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    signed_at: Optional[datetime] = None
    audio_file: Optional[str] = None  # Path or URL to uploaded audio file
    # Inline related data for UI convenience
    comments: List["NoteCommentRead"] = []
    history: List["NoteHistoryRead"] = []

    class Config:
        from_attributes = True

class NoteWithPatientInfo(BaseModel):
    """Enhanced note schema that includes patient details for display"""
    id: int
    patient_id: int
    provider_id: int
    visit_id: int
    note_type: str
    content: str
    status: str
    created_at: datetime
    updated_at: datetime
    signed_at: Optional[datetime] = None
    audio_file: Optional[str] = None
    
    # Patient information (optional to gracefully handle missing patient records)
    patient_first_name: Optional[str] = None
    patient_last_name: Optional[str] = None
    patient_date_of_birth: Optional[date] = None
    patient_phone_number: Optional[str] = None
    patient_email: Optional[str] = None
    comments: List["NoteCommentRead"] = []
    history: List["NoteHistoryRead"] = []

# Old comment schemas removed - using new ones defined below

class NoteHistoryRead(BaseModel):
    id: int
    note_id: int
    user_id: int
    username: str
    action: str
    summary: str
    created_at: datetime

    class Config:
        from_attributes = True

class NoteProvenanceRead(BaseModel):
    id: int
    note_id: int
    section: Optional[str] = None
    sentence_index: int
    text: str
    transcript_start_ms: Optional[int] = None
    transcript_end_ms: Optional[int] = None
    audio_start_ms: Optional[int] = None
    audio_end_ms: Optional[int] = None
    confidence: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NoteCodeRead(BaseModel):
    id: int
    note_id: int
    system: str
    code: str
    display: Optional[str] = None
    confidence: Optional[float] = None
    status: str
    source_span: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NoteCommentBase(BaseModel):
    content: str
    is_resolved: bool = False

class NoteCommentCreate(NoteCommentBase):
    pass  # note_id comes from URL parameter

class NoteCommentUpdate(BaseModel):
    content: Optional[str] = None
    is_resolved: Optional[bool] = None

class NoteCommentRead(NoteCommentBase):
    id: int
    note_id: int
    user_id: int
    username: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    email: str
    tenant_id: Optional[str] = "default"  # Add email field
    work_start_time: Optional[str] = "09:00"
    work_end_time: Optional[str] = "17:00"
    timezone: Optional[str] = "UTC"
    working_days: Optional[str] = "1,2,3,4,5"

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    is_active: bool
    is_admin: Optional[bool] = False

    class Config:
        # Pydantic v2
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Password reset schemas
class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetVerify(BaseModel):
    token: str
    new_password: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class PasswordResetResponse(BaseModel):
    message: str
    success: bool
