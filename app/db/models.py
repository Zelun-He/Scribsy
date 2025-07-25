"""
models.py: Defines SQLAlchemy ORM models for the database.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime
from app.db.database import Base

class Note(Base):
    """
    SQLAlchemy model for a note.
    """
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True, nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    visit_id = Column(Integer, index=True, nullable=False)
    note_type = Column(String, nullable=False) #Progress, discharge,admission, consult,etc.
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    signed_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="draft") #draft, signed, completed, cancelled

    audio_file = Column(String, nullable=True)  # Path or URL to uploaded audio file
    
    user = relationship("User", back_populates="notes")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)  # Add email field
    is_active = Column(Integer, default=1)
    is_admin = Column(Integer, default=0)  # 0 = regular user, 1 = admin
    
    notes = relationship("Note", back_populates="user")
