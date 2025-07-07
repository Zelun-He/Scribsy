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
    provider_id = Column(Integer, index=True, nullable=False)
    visit_id = Column(Integer, index=True, nullable=False)
    note_type = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    signed_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="draft")
    
    user = relationship("User", back_populates="notes")
