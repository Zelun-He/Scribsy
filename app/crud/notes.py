"""
notes.py: CRUD operations for Note model.
"""
from sqlalchemy.orm import Session
from app.db import models, schemas
from typing import List, Optional
from datetime import datetime
from passlib.context import CryptContext

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

def get_notes(
    db: Session,
    skip: int = 0,
    limit: int = 10,
    patient_id: Optional[int] = None,
    provider_id: Optional[int] = None,
    visit_id: Optional[int] = None,
    note_type: Optional[str] = None,
    status: Optional[str] = None,
    created_from: Optional[datetime] = None,
    created_to: Optional[datetime] = None,
) -> List[models.Note]:
    """
    Retrieve a list of notes.
    """
    query = db.query(models.Note)
    if patient_id is not None:
        query = query.filter(models.Note.patient_id == patient_id)
    if provider_id is not None:
        query = query.filter(models.Note.provider_id == provider_id)
    if visit_id is not None:
        query = query.filter(models.Note.visit_id == visit_id)
    if note_type is not None:
        query = query.filter(models.Note.note_type == note_type)
    if status is not None:
        query = query.filter(models.Note.status == status)
    if created_from is not None:
        query = query.filter(models.Note.created_at >= created_from)
    if created_to is not None:
        query = query.filter(models.Note.created_at <= created_to)
    return query.offset(skip).limit(limit).all()

def update_note(db: Session, note_id: int, note: schemas.NoteUpdate) -> Optional[models.Note]:
    """
    Update an existing note.
    """
    db_note = get_note(db, note_id)
    if db_note:
        for field, value in note.dict(exclude_unset=True).items():
            setattr(db_note, field, value)
        db_note.updated_at = datetime.utcnow()
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

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate, hashed_password: str):
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def set_user_admin(db: Session, username: str):
    user = get_user_by_username(db, username)
    if user:
        user.is_admin = 1
        db.commit()
        db.refresh(user)
    return user

# Authentication helper
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user
