from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import schemas
from app.crud import notes as crud_notes
from app.db.database import get_db
from typing import List

router = APIRouter(prefix="/notes", tags=["notes"])

@router.post("/", response_model=schemas.NoteRead)
def create_note(note: schemas.NoteCreate, db: Session = Depends(get_db)):
    return crud_notes.create_note(db, note)

@router.get("/", response_model=List[schemas.NoteRead])
def read_notes(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return crud_notes.get_notes(db, skip=skip, limit=limit)

@router.get("/{note_id}", response_model=schemas.NoteRead)
def read_note(note_id: int, db: Session = Depends(get_db)):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return db_note

@router.put("/{note_id}", response_model=schemas.NoteRead)
def update_note(note_id: int, note: schemas.NoteUpdate, db: Session = Depends(get_db)):
    db_note = crud_notes.update_note(db, note_id, note)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return db_note

@router.delete("/{note_id}", response_model=dict)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    success = crud_notes.delete_note(db, note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"ok": True} 