"""Account-scoped dashboard snapshot; counts include every saved note."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.endpoints.auth import get_current_user
from app.db.database import get_db
from app.db import models, schemas

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

class DashboardRead(BaseModel):
    patients: list[schemas.PatientRead]
    notes: list[schemas.NoteRead]
    appointments: list[schemas.AppointmentRead]

@router.get("", response_model=DashboardRead)
def read_dashboard(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Scope each query by its owner rather than trusting a supplied tenant or user ID.
    return {
        "patients": db.query(models.Patient).filter(models.Patient.user_id == current_user.id).all(),
        "notes": db.query(models.Note).filter(models.Note.provider_id == current_user.id).order_by(models.Note.created_at.desc()).all(),
        "appointments": db.query(models.Appointment).filter(models.Appointment.user_id == current_user.id).order_by(models.Appointment.scheduled_at.asc()).all(),
    }
