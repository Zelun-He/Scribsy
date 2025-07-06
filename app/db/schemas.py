"""
schemas.py: Defines Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel
from datetime import datetime

class NoteBase(BaseModel):
    content: str

class NoteCreate(BaseModel):
    user_id: int
    content: str

class NoteRead(BaseModel):
    id: int
    user_id: int
    content: str
    created_at: datetime

    class Config:
        orm_mode = True
