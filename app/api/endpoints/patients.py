"""
patients.py: Defines the /patients endpoints for patient management.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db import schemas
from app.crud import patients as crud_patients
from app.db.database import get_db
from app.api.endpoints.auth import get_current_user
from typing import List

router = APIRouter()

# GET /patients/ - Retrieve a list of patients
@router.get("/", response_model=List[schemas.PatientRead])
def read_patients(
    skip: int = 0,
    limit: int = 100,
    search: str = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Retrieve a list of patients with optional search.
    """
    return crud_patients.get_patients(db, current_user.id, skip=skip, limit=limit, search=search)

# GET /patients/{patient_id} - Retrieve a specific patient
@router.get("/{patient_id}", response_model=schemas.PatientRead)
def read_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Retrieve a specific patient by ID.
    """
    patient = crud_patients.get_patient(db, patient_id, current_user.id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

# POST /patients/ - Create a new patient
@router.post("/", response_model=schemas.PatientRead)
def create_patient(
    patient: schemas.PatientCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Create a new patient.
    """
    try:
        # Check if patient with same email already exists for this user
        if patient.email and patient.email.strip():
            existing_patient = crud_patients.get_patient_by_email(db, patient.email.strip(), current_user.id)
            if existing_patient:
                raise HTTPException(status_code=400, detail="Patient with this email already exists")
        
        # Check if patient with same phone number already exists for this user  
        if patient.phone_number and patient.phone_number.strip():
            existing_patient = crud_patients.get_patient_by_phone(db, patient.phone_number.strip(), current_user.id)
            if existing_patient:
                raise HTTPException(status_code=400, detail="Patient with this phone number already exists")
        
        # Add user_id to the patient data and clean empty strings
        patient_data = patient.dict()
        patient_data['user_id'] = current_user.id
        
        # Convert empty strings to None for optional fields
        for field in ['phone_number', 'email', 'address', 'city', 'state', 'zip_code']:
            if field in patient_data and (patient_data[field] == '' or patient_data[field] is None):
                patient_data[field] = None
        
        return crud_patients.create_patient(db, schemas.PatientCreate(**patient_data))
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Patient creation error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to create patient: {str(e)}")

# PUT /patients/{patient_id} - Update a patient
@router.put("/{patient_id}", response_model=schemas.PatientRead)
def update_patient(
    patient_id: int,
    patient: schemas.PatientUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Update an existing patient.
    """
    db_patient = crud_patients.get_patient(db, patient_id, current_user.id)
    if db_patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check for email conflicts if email is being updated
    if patient.email and patient.email != db_patient.email:
        existing_patient = crud_patients.get_patient_by_email(db, patient.email, current_user.id)
        if existing_patient:
            raise HTTPException(status_code=400, detail="Patient with this email already exists")
    
    # Check for phone conflicts if phone is being updated
    if patient.phone_number and patient.phone_number != db_patient.phone_number:
        existing_patient = crud_patients.get_patient_by_phone(db, patient.phone_number, current_user.id)
        if existing_patient:
            raise HTTPException(status_code=400, detail="Patient with this phone number already exists")
    
    return crud_patients.update_patient(db, patient_id, patient, current_user.id)

# DELETE /patients/{patient_id} - Delete a patient
@router.delete("/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Delete a patient.
    """
    db_patient = crud_patients.get_patient(db, patient_id, current_user.id)
    if db_patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if patient has any notes
    if db_patient.notes:
        raise HTTPException(status_code=400, detail="Cannot delete patient with existing notes")
    
    success = crud_patients.delete_patient(db, patient_id, current_user.id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete patient")
    
    return {"message": "Patient deleted successfully"}

# GET /patients/search/ - Search patients by name
@router.get("/search/", response_model=List[schemas.PatientRead])
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