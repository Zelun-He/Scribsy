from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db import schemas
from app.crud import notes as crud_notes
from app.db.database import get_db
from app.api.endpoints.auth import get_current_user
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/notes", tags=["notes"])

@router.post("/", response_model=schemas.NoteRead)
def create_note(note: schemas.NoteCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Ensure the note is created by the authenticated provider
    note_data = note.dict()
    note_data["provider_id"] = current_user.id
    return crud_notes.create_note(db, schemas.NoteCreate(**note_data))

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
    # Only return notes for the authenticated provider
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

@router.get("/{note_id}", response_model=schemas.NoteRead)
def read_note(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None or db_note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    return db_note

@router.put("/{note_id}", response_model=schemas.NoteRead)
def update_note(note_id: int, note: schemas.NoteUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None or db_note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    db_note = crud_notes.update_note(db, note_id, note)
    return db_note

@router.delete("/{note_id}", response_model=dict)
def delete_note(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None or db_note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    success = crud_notes.delete_note(db, note_id)
    return {"ok": success} 