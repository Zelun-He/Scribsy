"""
schemas.py: Defines Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NoteBase(BaseModel):
    patient_id: int
    provider_id: int
    visit_id: int
    note_type: str
    content: str
    status: str
    signed_at: Optional[datetime] = None

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    note_type: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None
    signed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class NoteRead(NoteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    signed_at: Optional[datetime] = None

    class Config:
        orm_mode = True
