"""
schemas.py: Defines Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class PatientBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
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
    audio_file: Optional[str] = None  # Path or URL to uploaded audio file
    transcript: Optional[str] = None  # Full transcribed conversation
    soap_subjective: Optional[str] = None  # SOAP: Subjective
    soap_objective: Optional[str] = None  # SOAP: Objective  
    soap_assessment: Optional[str] = None  # SOAP: Assessment
    soap_plan: Optional[str] = None  # SOAP: Plan

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

class NoteRead(NoteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    signed_at: Optional[datetime] = None
    audio_file: Optional[str] = None  # Path or URL to uploaded audio file

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

class UserBase(BaseModel):
    username: str
    email: str  # Add email field

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    is_active: bool
    is_admin: Optional[bool] = False

    class Config:
        # Pydantic v2
        from_attributes = True
        # Backward compatibility with v1-style config
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str
