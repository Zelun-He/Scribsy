"""
patients.py: CRUD operations for Patient model.
"""
from sqlalchemy.orm import Session
from app.db import models, schemas
from typing import List, Optional
from datetime import datetime

def create_patient(db: Session, patient: schemas.PatientCreate) -> models.Patient:
    """
    Create a new patient in the database.
    """
    db_patient = models.Patient(**patient.dict())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

def get_patient(db: Session, patient_id: int, user_id: int) -> Optional[models.Patient]:
    """
    Retrieve a patient by ID for a specific user.
    """
    return db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.user_id == user_id
    ).first()

def get_patients(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None
) -> List[models.Patient]:
    """
    Retrieve a list of patients for a specific user with optional search.
    """
    query = db.query(models.Patient).filter(models.Patient.user_id == user_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            models.Patient.first_name.ilike(search_term) |
            models.Patient.last_name.ilike(search_term) |
            models.Patient.email.ilike(search_term) |
            models.Patient.phone_number.ilike(search_term)
        )
    
    return query.offset(skip).limit(limit).all()

def update_patient(db: Session, patient_id: int, patient: schemas.PatientUpdate, user_id: int) -> Optional[models.Patient]:
    """
    Update an existing patient for a specific user.
    """
    db_patient = get_patient(db, patient_id, user_id)
    if db_patient:
        for field, value in patient.dict(exclude_unset=True).items():
            setattr(db_patient, field, value)
        db_patient.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_patient)
    return db_patient

def delete_patient(db: Session, patient_id: int, user_id: int) -> bool:
    """
    Delete a patient by ID for a specific user.
    """
    db_patient = get_patient(db, patient_id, user_id)
    if db_patient:
        db.delete(db_patient)
        db.commit()
        return True
    return False

def search_patients_by_name(db: Session, user_id: int, first_name: str = None, last_name: str = None) -> List[models.Patient]:
    """
    Search patients by first name and/or last name for a specific user.
    """
    query = db.query(models.Patient).filter(models.Patient.user_id == user_id)
    
    if first_name:
        query = query.filter(models.Patient.first_name.ilike(f"%{first_name}%"))
    if last_name:
        query = query.filter(models.Patient.last_name.ilike(f"%{last_name}%"))
    
    return query.all()

def get_patient_by_email(db: Session, email: str, user_id: int) -> Optional[models.Patient]:
    """
    Get patient by email address for a specific user.
    """
    return db.query(models.Patient).filter(
        models.Patient.email == email,
        models.Patient.user_id == user_id
    ).first()

def get_patient_by_phone(db: Session, phone: str, user_id: int) -> Optional[models.Patient]:
    """
    Get patient by phone number for a specific user.
    """
    return db.query(models.Patient).filter(
        models.Patient.phone_number == phone,
        models.Patient.user_id == user_id
    ).first()

def get_patient_by_id(db: Session, patient_id: int) -> Optional[models.Patient]:
    """
    Get patient by ID (used for note display - doesn't filter by user_id).
    """
    return db.query(models.Patient).filter(models.Patient.id == patient_id).first() 