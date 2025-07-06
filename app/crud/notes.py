"""
notes.py: CRUD operations for Note model.
"""
from sqlalchemy.orm import Session
from app.db import models, schemas
from typing import List, Optional

def create_note(db: Session, note: schemas.NoteCreate) -> models.Note:
    """
    Create a new note in the database.
    """
    db_note = models.Note(**note.dict())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

def get_note(db: Session, note_id: int) -> Optional[models.Note]:
    """
    Retrieve a note by ID.
    """
    return db.query(models.Note).filter(models.Note.id == note_id).first()

def get_notes(db: Session, skip: int = 0, limit: int = 10) -> List[models.Note]:
    """
    Retrieve a list of notes.
    """
    return db.query(models.Note).offset(skip).limit(limit).all()

def update_note(db: Session, note_id: int, note: schemas.NoteCreate) -> Optional[models.Note]:
    """
    Update an existing note.
    """
    db_note = get_note(db, note_id)
    if db_note:
        db_note.content = note.content  # type: ignore
        db_note.user_id = note.user_id  # type: ignore
        db.commit()
        db.refresh(db_note)
    return db_note

def delete_note(db: Session, note_id: int) -> bool:
    """
    Delete a note by ID.
    """
    db_note = get_note(db, note_id)
    if db_note:
        db.delete(db_note)
        db.commit()
        return True
    return False
