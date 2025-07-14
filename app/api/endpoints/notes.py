from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form
from sqlalchemy.orm import Session
from app.db import schemas
from app.crud import notes as crud_notes
from app.db.database import get_db
from app.api.endpoints.auth import get_current_user
from typing import List, Optional
from datetime import datetime
import os
import shutil

router = APIRouter(prefix="/notes", tags=["notes"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# POST /notes/ - Create a new note for the authenticated provider.
# Now supports optional audio file upload (multipart/form-data).
# Requires authentication. Expects note fields as form data and optional audio file.
@router.post("/", response_model=schemas.NoteRead)
def create_note(
    patient_id: int = Form(...),
    provider_id: int = Form(None),  # Will be overridden by current_user
    visit_id: int = Form(...),
    note_type: str = Form(...),
    content: str = Form(...),
    status: str = Form(...),
    signed_at: Optional[datetime] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    audio_file_path = None
    if audio_file:
        filename = f"{current_user.id}_{datetime.utcnow().isoformat().replace(':', '-')}_{audio_file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
        audio_file_path = file_path
    note_data = {
        "patient_id": patient_id,
        "provider_id": current_user.id,
        "visit_id": visit_id,
        "note_type": note_type,
        "content": content,
        "status": status,
        "signed_at": signed_at,
        "audio_file": audio_file_path
    }
    return crud_notes.create_note(db, schemas.NoteCreate(**note_data))

# GET /notes/ - Retrieve a list of notes for the authenticated provider.
# Supports filtering by patient_id, visit_id, note_type, status, and date range.
# Returns audio_file field if present.
# Requires authentication.
@router.get("/", response_model=List[schemas.NoteRead])
def read_notes(
    skip: int = 0,
    limit: int = 10,
    patient_id: Optional[int] = Query(None),
    visit_id: Optional[int] = Query(None),
    note_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    created_from: Optional[datetime] = Query(None),
    created_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return crud_notes.get_notes(
        db,
        skip=skip,
        limit=limit,
        patient_id=patient_id,
        provider_id=current_user.id,
        visit_id=visit_id,
        note_type=note_type,
        status=status,
        created_from=created_from,
        created_to=created_to,
    )

# GET /notes/{note_id} - Retrieve a specific note by ID for the authenticated provider.
# Returns audio_file field if present.
# Requires authentication.
@router.get("/{note_id}", response_model=schemas.NoteRead)
def read_note(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None or db_note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    return db_note

# PUT /notes/{note_id} - Update a specific note by ID for the authenticated provider.
# Requires authentication. Expects NoteUpdate schema in the request body.
@router.put("/{note_id}", response_model=schemas.NoteRead)
def update_note(note_id: int, note: schemas.NoteUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None or db_note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    db_note = crud_notes.update_note(db, note_id, note)
    return db_note

# DELETE /notes/{note_id} - Delete a specific note by ID for the authenticated provider.
# Requires authentication.
@router.delete("/{note_id}", response_model=dict)
def delete_note(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None or db_note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    success = crud_notes.delete_note(db, note_id)
    return {"ok": success} 