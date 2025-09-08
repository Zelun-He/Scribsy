"""
patients.py: CRUD operations for Patient model.
"""
from sqlalchemy.orm import Session
from app.db import models, schemas
from typing import List, Optional
from datetime import datetime
from sqlalchemy import and_

def create_patient(db: Session, patient: schemas.PatientCreate) -> models.Patient:
    """
    Create a new patient in the database.
    """
    db_patient = models.Patient(**patient.model_dump())
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

def get_patient_by_id(db: Session, patient_id: int) -> Optional[models.Patient]:
    """
    Retrieve a patient by ID (no user filter).
    Intended for internal use where ownership was already validated upstream.
    """
    return db.query(models.Patient).filter(models.Patient.id == patient_id).first()

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
        # Use model_dump instead of deprecated dict() method
        update_data = patient.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if value is not None:  # Only update non-None values
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

# Appointments CRUD
def create_appointment(db: Session, user_id: int, appointment: schemas.AppointmentCreate) -> models.Appointment:
    # Ensure scheduled_at is timezone-aware
    scheduled_at = appointment.scheduled_at
    try:
        from datetime import timezone
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        else:
            scheduled_at = scheduled_at.astimezone(timezone.utc)
    except Exception:
        pass

    db_appt = models.Appointment(
        patient_id=appointment.patient_id,
        user_id=user_id,
        title=appointment.title,
        note=appointment.note,
        scheduled_at=scheduled_at,
        notify_before_minutes=appointment.notify_before_minutes,
        status=getattr(appointment, 'status', None) or 'scheduled',
    )
    db.add(db_appt)
    db.commit()
    db.refresh(db_appt)
    return db_appt

def list_appointments(db: Session, user_id: int, patient_id: Optional[int] = None) -> List[models.Appointment]:
    q = db.query(models.Appointment).filter(models.Appointment.user_id == user_id)
    if patient_id is not None:
        q = q.filter(models.Appointment.patient_id == patient_id)
    return q.order_by(models.Appointment.scheduled_at.asc()).all()

def delete_appointment(db: Session, user_id: int, appt_id: int) -> bool:
    appt = db.query(models.Appointment).filter(
        and_(models.Appointment.id == appt_id, models.Appointment.user_id == user_id)
    ).first()
    if not appt:
        return False
    db.delete(appt)
    db.commit()
    return True

def get_appointment(db: Session, user_id: int, appt_id: int) -> Optional[models.Appointment]:
    return db.query(models.Appointment).filter(
        and_(models.Appointment.id == appt_id, models.Appointment.user_id == user_id)
    ).first()

def update_appointment(db: Session, user_id: int, appt_id: int, update: schemas.AppointmentUpdate) -> Optional[models.Appointment]:
    appt = get_appointment(db, user_id, appt_id)
    if not appt:
        return None
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(appt, field, value)
    db.commit()
    db.refresh(appt)
    return appt

def check_in_appointment(db: Session, user_id: int, appt_id: int) -> Optional[models.Appointment]:
    appt = get_appointment(db, user_id, appt_id)
    if not appt:
        return None
    # Set status and timestamp
    appt.status = "checked_in"
    try:
        from datetime import datetime, timezone
        appt.checked_in_at = datetime.now(timezone.utc)
    except Exception:
        appt.checked_in_at = datetime.utcnow()
    db.commit()
    db.refresh(appt)
    return appt

def list_upcoming_appointments(db: Session, user_id: int, within_hours: int = 168) -> List[models.Appointment]:
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    window = now + timedelta(hours=within_hours)
    return (
        db.query(models.Appointment)
        .filter(
            and_(
                models.Appointment.user_id == user_id,
                models.Appointment.scheduled_at >= now,
                models.Appointment.scheduled_at <= window,
            )
        )
        .order_by(models.Appointment.scheduled_at.asc())
        .all()
    )