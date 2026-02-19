"""
notes.py: CRUD operations for Note model.
"""
from sqlalchemy.orm import Session
from app.db import models, schemas
from typing import List, Optional
from datetime import datetime
import bcrypt
from sqlalchemy import func
from app.utils.logging import logger

def normalize_username(username: str) -> str:
    """Normalize usernames for consistent authentication lookups."""
    return (username or "").strip().lower()

def generate_visit_id(db: Session, patient_id: int) -> int:
    """
    Auto-generate a Visit ID for a patient.
    Format: Sequential number per patient per day
    """
    today = datetime.now()
    
    # Get the highest visit number for this patient on this date
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    max_visit = db.query(func.max(models.Note.visit_id)).filter(
        models.Note.patient_id == patient_id,
        models.Note.created_at >= today_start,
        models.Note.created_at <= today_end
    ).scalar()
    
    if max_visit is None:
        # First visit of the day for this patient
        visit_number = 1
    else:
        # Increment the visit number
        visit_number = max_visit + 1
    
    return visit_number

def create_note(db: Session, note: schemas.NoteCreate) -> models.Note:
    """
    Create a new note in the database.
    Auto-generates Visit ID if not provided.
    """
    # Auto-generate Visit ID if not provided
    if not note.visit_id:
        note.visit_id = generate_visit_id(db, note.patient_id)
    
    db_note = models.Note(**note.model_dump())
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
        for field, value in note.model_dump(exclude_unset=True).items():
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
    """Fetch user by username with whitespace/case tolerant matching."""
    normalized_username = normalize_username(username)
    if not normalized_username:
        return None

    try:
        return (
            db.query(models.User)
            .filter(func.lower(func.trim(models.User.username)) == normalized_username)
            .first()
        )
    except Exception as e:
        logger.error(f"Failed user lookup for '{username}': {e}", exc_info=True)
        db.rollback()
        return None

def create_user(db: Session, user: schemas.UserCreate, hashed_password: str):
    cleaned_username = user.username.strip()
    db_user = models.User(
        username=cleaned_username, 
        email=user.email,
        hashed_password=hashed_password,
        tenant_id="default",  # Explicitly set tenant_id
        is_active=1,
        is_admin=0,
        role="provider",
        work_start_time="09:00",
        work_end_time="17:00",
        timezone="UTC",
        working_days="1,2,3,4,5"
    )
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

# Authentication helpers (bcrypt via direct library to avoid passlib+bcrypt compatibility issues)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return None, "User not found"

    # Verify password using User ORM object attributes
    if not verify_password(password, user.hashed_password):
        return None, "Incorrect password"

    # Return the User ORM object directly (it will be converted to UserRead schema by FastAPI)
    return user, None
