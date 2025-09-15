"""
patients.py: Defines the /patients endpoints for patient management.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.db import schemas
from app.crud import patients as crud_patients
from app.db.database import get_db
from app.api.endpoints.auth import get_current_user
from app.audit.logger import HIPAAAuditLogger, get_phi_fields
from app.security.permissions import Permission, has_permission, can_access_patient, validate_minimum_necessary
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter()

# GET /patients/ - Retrieve a list of patients
@router.get("/", response_model=List[schemas.PatientRead])
@router.get("", response_model=List[schemas.PatientRead], include_in_schema=False)
def read_patients(
    skip: int = 0,
    limit: int = 100,
    search: str = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    request: Request = None
):
    """
    Retrieve a list of patients with optional search.
    """
    try:
        patients = crud_patients.get_patients(db, current_user.id, skip=skip, limit=limit, search=search)
        
        # Log PHI access for each patient returned
        for patient in patients:
            patient_dict = patient.__dict__ if hasattr(patient, '__dict__') else patient.model_dump()
            phi_fields = get_phi_fields(patient_dict)
            
            HIPAAAuditLogger.log_phi_access(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                patient_id=patient.id,
                phi_fields=phi_fields,
                action_type="READ",
                description=f"Patient list access - search: {search or 'none'}",
                request=request
            )
        
        return patients
        
    except Exception as e:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="READ",
            resource_type="patient",
            description="Failed to retrieve patient list",
            success=False,
            error_message=str(e),
            request=request
        )
        raise

# GET /patients/{patient_id} - Retrieve a specific patient
@router.get("/{patient_id}", response_model=schemas.PatientRead)
def read_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    request: Request = None
):
    """
    Retrieve a specific patient by ID.
    """
    try:
        # Check permission to read patients
        if not has_permission(current_user, Permission.READ_PATIENT):
            HIPAAAuditLogger.log_action(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action_type="READ",
                resource_type="patient",
                resource_id=patient_id,
                description=f"Access denied - insufficient permissions for patient {patient_id}",
                success=False,
                error_message="Insufficient permissions",
                request=request
            )
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        patient = crud_patients.get_patient(db, patient_id, current_user.id)
        if patient is None:
            HIPAAAuditLogger.log_action(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action_type="READ",
                resource_type="patient",
                resource_id=patient_id,
                description=f"Attempted access to non-existent patient {patient_id}",
                success=False,
                error_message="Patient not found",
                request=request
            )
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Check if user can access this specific patient (HIPAA access control)
        if not can_access_patient(current_user, patient_id, patient.user_id):
            HIPAAAuditLogger.log_action(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action_type="READ",
                resource_type="patient",
                resource_id=patient_id,
                patient_id=patient_id,
                description=f"Unauthorized access attempt to patient {patient_id}",
                success=False,
                error_message="Access denied - not authorized for this patient",
                request=request
            )
            raise HTTPException(status_code=403, detail="Access denied - not authorized for this patient")
        
        # Log successful PHI access
        patient_dict = patient.__dict__ if hasattr(patient, '__dict__') else patient.model_dump()
        phi_fields = get_phi_fields(patient_dict)
        
        HIPAAAuditLogger.log_phi_access(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            patient_id=patient.id,
            phi_fields=phi_fields,
            action_type="READ",
            description=f"Patient detail access - ID: {patient_id}",
            request=request
        )
        
        return patient
        
    except HTTPException:
        raise
    except Exception as e:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="READ",
            resource_type="patient",
            resource_id=patient_id,
            description=f"Failed to retrieve patient {patient_id}",
            success=False,
            error_message=str(e),
            request=request
        )
        raise

# POST /patients/ - Create a new patient
@router.post("/", response_model=schemas.PatientRead)
@router.post("", response_model=schemas.PatientRead, include_in_schema=False)
def create_patient(
    patient: schemas.PatientCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    request: Request = None
):
    """
    Create a new patient.
    """
    try:
        # Check if patient with same email already exists for this user
        if patient.email and patient.email.strip():
            existing_patient = crud_patients.get_patient_by_email(db, patient.email.strip(), current_user.id)
            if existing_patient:
                HIPAAAuditLogger.log_action(
                    db=db,
                    user_id=current_user.id,
                    username=current_user.username,
                    action_type="CREATE",
                    resource_type="patient",
                    description=f"Failed to create patient - email already exists: {patient.email}",
                    success=False,
                    error_message="Patient with this email already exists",
                    request=request
                )
                raise HTTPException(status_code=400, detail="Patient with this email already exists")
        
        # Check if patient with same phone number already exists for this user  
        if patient.phone_number and patient.phone_number.strip():
            existing_patient = crud_patients.get_patient_by_phone(db, patient.phone_number.strip(), current_user.id)
            if existing_patient:
                HIPAAAuditLogger.log_action(
                    db=db,
                    user_id=current_user.id,
                    username=current_user.username,
                    action_type="CREATE",
                    resource_type="patient",
                    description=f"Failed to create patient - phone already exists: {patient.phone_number}",
                    success=False,
                    error_message="Patient with this phone number already exists",
                    request=request
                )
                raise HTTPException(status_code=400, detail="Patient with this phone number already exists")
        
        # Add user_id to the patient data and clean empty strings
        patient_data = patient.model_dump()
        patient_data['user_id'] = current_user.id
        
        # Convert empty strings to None for optional fields
        for field in ['phone_number', 'email', 'address', 'city', 'state', 'zip_code']:
            if field in patient_data and (patient_data[field] == '' or patient_data[field] is None):
                patient_data[field] = None
        
        # Create the patient
        new_patient = crud_patients.create_patient(db, schemas.PatientCreate(**patient_data))
        
        # Log successful patient creation with PHI
        patient_dict = new_patient.__dict__ if hasattr(new_patient, '__dict__') else new_patient.model_dump()
        phi_fields = get_phi_fields(patient_dict)
        
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="CREATE",
            resource_type="patient",
            resource_id=new_patient.id,
            patient_id=new_patient.id,
            phi_fields_accessed=phi_fields,
            description=f"Created new patient: {new_patient.first_name} {new_patient.last_name}",
            request=request
        )
        
        return new_patient
    
    except HTTPException:
        raise
    except Exception as e:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="CREATE",
            resource_type="patient",
            description="Failed to create patient",
            success=False,
            error_message=str(e),
            request=request
        )
        print(f"Patient creation error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to create patient: {str(e)}")

# Alternate explicit create path to avoid slash ambiguity in some proxies
@router.post("/create", response_model=schemas.PatientRead)
@router.post("/create/", response_model=schemas.PatientRead, include_in_schema=False)
def create_patient_alt(
    patient: schemas.PatientCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    request: Request = None
):
    return create_patient(patient, db, current_user, request)

# PUT /patients/{patient_id} - Update a patient
@router.put("/{patient_id}", response_model=schemas.PatientRead)
def update_patient(
    patient_id: int,
    patient: schemas.PatientUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    request: Request = None
):
    """
    Update an existing patient.
    """
    try:
        db_patient = crud_patients.get_patient(db, patient_id, current_user.id)
        if db_patient is None:
            HIPAAAuditLogger.log_action(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action_type="UPDATE",
                resource_type="patient",
                resource_id=patient_id,
                description=f"Attempted to update non-existent patient {patient_id}",
                success=False,
                error_message="Patient not found",
                request=request
            )
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Check for email conflicts if email is being updated
        if patient.email and patient.email != db_patient.email:
            existing_patient = crud_patients.get_patient_by_email(db, patient.email, current_user.id)
            if existing_patient:
                HIPAAAuditLogger.log_action(
                    db=db,
                    user_id=current_user.id,
                    username=current_user.username,
                    action_type="UPDATE",
                    resource_type="patient",
                    resource_id=patient_id,
                    patient_id=patient_id,
                    description=f"Failed to update patient - email conflict: {patient.email}",
                    success=False,
                    error_message="Patient with this email already exists",
                    request=request
                )
                raise HTTPException(status_code=400, detail="Patient with this email already exists")
        
        # Check for phone conflicts if phone is being updated
        if patient.phone_number and patient.phone_number != db_patient.phone_number:
            existing_patient = crud_patients.get_patient_by_phone(db, patient.phone_number, current_user.id)
            if existing_patient:
                HIPAAAuditLogger.log_action(
                    db=db,
                    user_id=current_user.id,
                    username=current_user.username,
                    action_type="UPDATE",
                    resource_type="patient",
                    resource_id=patient_id,
                    patient_id=patient_id,
                    description=f"Failed to update patient - phone conflict: {patient.phone_number}",
                    success=False,
                    error_message="Patient with this phone number already exists",
                    request=request
                )
                raise HTTPException(status_code=400, detail="Patient with this phone number already exists")
        
        # Get updated fields for audit
        updated_fields = []
        patient_update_data = patient.model_dump(exclude_unset=True)
        for field, value in patient_update_data.items():
            if hasattr(db_patient, field) and getattr(db_patient, field) != value:
                updated_fields.append(field)
        
        # Update the patient
        updated_patient = crud_patients.update_patient(db, patient_id, patient, current_user.id)
        
        # Log successful patient update with PHI changes
        phi_fields = get_phi_fields(patient_update_data)
        
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="UPDATE",
            resource_type="patient",
            resource_id=patient_id,
            patient_id=patient_id,
            phi_fields_accessed=phi_fields,
            description=f"Updated patient {patient_id} - fields: {', '.join(updated_fields)}",
            request=request
        )
        
        return updated_patient
    
    except HTTPException:
        raise
    except Exception as e:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="UPDATE",
            resource_type="patient",
            resource_id=patient_id,
            patient_id=patient_id,
            description=f"Failed to update patient {patient_id}",
            success=False,
            error_message=str(e),
            request=request
        )
        raise

# DELETE /patients/{patient_id} - Delete a patient
@router.delete("/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    request: Request = None
):
    """
    Delete a patient.
    """
    try:
        db_patient = crud_patients.get_patient(db, patient_id, current_user.id)
        if db_patient is None:
            HIPAAAuditLogger.log_action(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action_type="DELETE",
                resource_type="patient",
                resource_id=patient_id,
                description=f"Attempted to delete non-existent patient {patient_id}",
                success=False,
                error_message="Patient not found",
                request=request
            )
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Check if patient has any notes
        if db_patient.notes:
            HIPAAAuditLogger.log_action(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action_type="DELETE",
                resource_type="patient",
                resource_id=patient_id,
                patient_id=patient_id,
                description=f"Failed to delete patient {patient_id} - has existing notes",
                success=False,
                error_message="Cannot delete patient with existing notes",
                request=request
            )
            raise HTTPException(status_code=400, detail="Cannot delete patient with existing notes")
        
        # Log patient data before deletion for audit trail
        patient_dict = db_patient.__dict__ if hasattr(db_patient, '__dict__') else db_patient.model_dump()
        phi_fields = get_phi_fields(patient_dict)
        
        success = crud_patients.delete_patient(db, patient_id, current_user.id)
        if not success:
            HIPAAAuditLogger.log_action(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action_type="DELETE",
                resource_type="patient",
                resource_id=patient_id,
                patient_id=patient_id,
                description=f"Failed to delete patient {patient_id} - database error",
                success=False,
                error_message="Failed to delete patient",
                request=request
            )
            raise HTTPException(status_code=500, detail="Failed to delete patient")
        
        # Log successful deletion
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="DELETE",
            resource_type="patient",
            resource_id=patient_id,
            patient_id=patient_id,
            phi_fields_accessed=phi_fields,
            description=f"Deleted patient {patient_id}: {db_patient.first_name} {db_patient.last_name}",
            request=request
        )
        
        return {"message": "Patient deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="DELETE",
            resource_type="patient",
            resource_id=patient_id,
            description=f"Failed to delete patient {patient_id}",
            success=False,
            error_message=str(e),
            request=request
        )
        raise

# GET /patients/search/ - Search patients by name
@router.get("/search/", response_model=List[schemas.PatientRead])
@router.get("/search", response_model=List[schemas.PatientRead], include_in_schema=False)
def search_patients(
    first_name: str = Query(None),
    last_name: str = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Search patients by first name and/or last name.
    """
    return crud_patients.search_patients_by_name(db, current_user.id, first_name=first_name, last_name=last_name) 

# Appointments endpoints
@router.post("/{patient_id}/appointments", response_model=schemas.AppointmentRead)
def create_patient_appointment(
    patient_id: int,
    appt: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # enforce path patient_id
    if appt.patient_id != patient_id:
        appt = schemas.AppointmentCreate(**{**appt.model_dump(), "patient_id": patient_id})
    # ensure patient exists and belongs to user
    patient = crud_patients.get_patient(db, patient_id, current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    # validate time
    # Normalize to UTC and ensure future time
    scheduled_at = appt.scheduled_at
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    else:
        scheduled_at = scheduled_at.astimezone(timezone.utc)
    # Compare against timezone-aware now
    if scheduled_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="scheduled_at must be in the future")
    return crud_patients.create_appointment(db, current_user.id, appt)

@router.get("/{patient_id}/appointments", response_model=List[schemas.AppointmentRead])
def list_patient_appointments(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # ensure access
    patient = crud_patients.get_patient(db, patient_id, current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return crud_patients.list_appointments(db, current_user.id, patient_id)

@router.delete("/appointments/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    ok = crud_patients.delete_appointment(db, current_user.id, appointment_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"ok": True}

@router.put("/appointments/{appointment_id}", response_model=schemas.AppointmentRead)
def update_appointment(
    appointment_id: int,
    appt: schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # ensure if scheduled_at provided it's not in the past
    if appt.scheduled_at:
        scheduled_at = appt.scheduled_at
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        else:
            scheduled_at = scheduled_at.astimezone(timezone.utc)
        if scheduled_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="scheduled_at must be in the future")
    updated = crud_patients.update_appointment(db, current_user.id, appointment_id, appt)
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return updated

@router.get("/appointments/upcoming", response_model=List[schemas.AppointmentRead])
def list_upcoming(
    within_hours: int = 168,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return crud_patients.list_upcoming_appointments(db, current_user.id, within_hours)

# POST /patients/appointments/{appointment_id}/check-in - Check-in appointment
@router.post("/appointments/{appointment_id}/check-in", response_model=schemas.AppointmentRead)
def check_in_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    updated = crud_patients.check_in_appointment(db, current_user.id, appointment_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    try:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="UPDATE",
            resource_type="appointment",
            resource_id=appointment_id,
            patient_id=updated.patient_id,
            description=f"Appointment {appointment_id} checked in"
        )
    except Exception:
        pass
    return updated

# POST /patients/appointments/{appointment_id}/remind - schedule a reminder (MVP no-op)
@router.post("/appointments/{appointment_id}/remind")
def remind_appointment(
    appointment_id: int,
    in_minutes: int = 10,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    appt = crud_patients.get_appointment(db, current_user.id, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    # MVP: just audit log; in future integrate with nudge scheduler
    try:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="CREATE",
            resource_type="reminder",
            resource_id=appointment_id,
            patient_id=appt.patient_id,
            description=f"Scheduled appointment reminder in {in_minutes} minutes"
        )
    except Exception:
        pass
    return {"ok": True, "in_minutes": in_minutes}