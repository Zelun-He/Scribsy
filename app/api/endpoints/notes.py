from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form, Request
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
from app.db import schemas, models
from app.db.schemas import NoteCommentCreate, NoteCommentUpdate, NoteCommentRead
from app.crud import notes as crud_notes, patients as crud_patients
from app.db.database import get_db
from app.api.endpoints.auth import get_current_user
from app.audit.logger import HIPAAAuditLogger
from app.services.transcription import transcription_service
from app.services.ai_summary import summarize_note
from app.services.preferences import load_user_preferences
from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path
import io
import difflib
import os
import shutil

router = APIRouter(prefix="/notes", tags=["notes"])

def calculate_content_accuracy(original: str, current: str) -> float:
    """Calculate accuracy percentage based on content similarity"""
    if not original or not current:
        return 100.0 if not current else 0.0
    
    # Use difflib to calculate similarity
    similarity = difflib.SequenceMatcher(None, original, current).ratio()
    return round(similarity * 100, 1)

from app.config import settings

UPLOAD_DIR = settings.upload_dir
os.makedirs(UPLOAD_DIR, exist_ok=True)

# POST /notes/create-json - Create note via JSON (no file upload)
@router.post("/create-json", response_model=schemas.NoteRead)
@router.post("/create-json/", response_model=schemas.NoteRead, include_in_schema=False)
def create_note_json(
    payload: schemas.NoteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Force provider_id to current user
    data = payload.model_dump()
    data["provider_id"] = current_user.id
    # Ensure visit_id
    if not data.get("visit_id"):
        data["visit_id"] = crud_notes.generate_visit_id(db, data["patient_id"])
    # Create note
    note = models.Note(**data)
    note.created_at = datetime.utcnow()
    note.updated_at = datetime.utcnow()
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

# POST /notes/ - Create a new note for the authenticated provider.
# Now supports optional audio file upload (multipart/form-data).
# Requires authentication. Expects note fields as form data and optional audio file.
@router.post("/", response_model=schemas.NoteRead)
@router.post("", response_model=schemas.NoteRead, include_in_schema=False)
async def create_note(
    patient_id: int = Form(...),
    provider_id: int = Form(None),  # Will be overridden by current_user
    visit_id: Optional[int] = Form(None),
    note_type: str = Form(...),
    content: str = Form(""),  # Make content optional when audio is provided
    status: str = Form(...),
    signed_at: Optional[datetime] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    auto_transcribe: bool = Form(True),  # New option to auto-transcribe audio
    auto_summarize: bool = Form(True),   # New option to auto-generate SOAP
    client_timezone: Optional[str] = Form(None),  # Client timezone
    client_timestamp: Optional[str] = Form(None),  # Client timestamp
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    audio_file_path = None
    transcription = ""
    soap_summary = None
    
    if audio_file:
        # Validate audio file type
        if not audio_file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="Only audio files are accepted.")
        
        # Generate unique filename
        filename = f"{current_user.id}_{datetime.utcnow().isoformat().replace(':', '-')}_{audio_file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        try:
            # Save audio file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(audio_file.file, buffer)
            audio_file_path = file_path
            
            # Auto-transcribe if requested
            if auto_transcribe:
                try:
                    transcription = await transcription_service.transcribe(Path(file_path))
                    
                    # Auto-summarize if requested - but don't add to content since frontend handles this
                    if auto_summarize and transcription:
                        # Apply user AI preferences
                        prefs = load_user_preferences(current_user.id)
                        soap_summary = await summarize_note(transcription, preferences=prefs)
                        # Just ensure we have some content for the note
                        if not content.strip():
                            content = f"Transcription: {transcription}"
                        # Note: SOAP summary is not added here since frontend already includes it in content
                            
                except Exception as e:
                    # Don't fail note creation if transcription fails
                    print(f"Transcription failed: {str(e)}")
                    if not content.strip():
                        content = "Audio file uploaded - transcription failed"
                        
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save audio file: {str(e)}")
    
    # Validate that we have some content
    if not content.strip() and not audio_file_path:
        raise HTTPException(status_code=400, detail="Note must have either content or audio file")
    
    # Auto-generate visit_id if not provided, before validation
    if not visit_id:
        visit_id = crud_notes.generate_visit_id(db, patient_id)
    
    # Handle timezone-aware timestamps
    import pytz
    if client_timezone:
        try:
            # Get the client timezone
            client_tz = pytz.timezone(client_timezone)
            # Create a timezone-aware timestamp for note creation
            local_time = datetime.now(client_tz)
            print(f"Note created at {local_time} in timezone {client_timezone}")
        except Exception as e:
            print(f"Invalid timezone {client_timezone}: {e}")
            # Fallback to UTC
            local_time = datetime.now(pytz.UTC)
    else:
        # Default to UTC
        local_time = datetime.now(pytz.UTC)
    
    note_data = {
        "patient_id": patient_id,
        "provider_id": current_user.id,
        "visit_id": visit_id,  # Now guaranteed to be a valid integer
        "note_type": note_type,
        "content": content,
        "status": status,
        "signed_at": signed_at,
        "audio_file": audio_file_path
    }
    
    try:
        note_create = schemas.NoteCreate(**note_data)
        # Create the note directly since visit_id is already generated
        db_note = models.Note(**note_create.model_dump())
        
        # Override the timestamps with timezone-aware ones
        db_note.created_at = local_time.astimezone(pytz.UTC)  # Store in UTC but preserve timezone info
        db_note.updated_at = local_time.astimezone(pytz.UTC)
        
        # Set initial accuracy tracking
        db_note.original_content = content  # Store original AI-generated content
        db_note.accuracy_score = 100.0  # Start at 100% accuracy
        db_note.content_changes_count = 0  # No changes yet
        
        db.add(db_note)
        db.commit()
        db.refresh(db_note)
        return db_note
    except Exception as e:
        # Log the actual error for debugging
        print(f"Note creation error: {str(e)}")
        print(f"Note data: {note_data}")
        # Return a more specific error message
        if "FOREIGN KEY constraint failed" in str(e):
            raise HTTPException(status_code=422, detail=f"Patient ID {patient_id} does not exist. Please select a valid patient or create a new one.")
        elif "NOT NULL constraint failed" in str(e):
            raise HTTPException(status_code=422, detail=f"Required field missing: {str(e)}")
        else:
            raise HTTPException(status_code=422, detail=f"Database error: {str(e)}")

# GET /notes/ - Retrieve a list of notes for the authenticated provider.
# Supports filtering by patient_id, visit_id, note_type, status, and date range.
# Returns audio_file field if present.
# Requires authentication.
@router.get("/", response_model=List[schemas.NoteRead])
@router.get("", response_model=List[schemas.NoteRead], include_in_schema=False)
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
@router.get("/{note_id}", response_model=schemas.NoteWithPatientInfo)
def read_note(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None or db_note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Get patient information
    patient = crud_patients.get_patient_by_id(db, db_note.patient_id)
    
    # Create enhanced response with patient info
    # Load related comments/history for richer UI
    comments = db.query(models.NoteComment).filter(models.NoteComment.note_id == db_note.id).order_by(models.NoteComment.created_at.desc()).all()
    history = db.query(models.NoteHistory).filter(models.NoteHistory.note_id == db_note.id).order_by(models.NoteHistory.created_at.desc()).all()

    return schemas.NoteWithPatientInfo(
        id=db_note.id,
        patient_id=db_note.patient_id,
        provider_id=db_note.provider_id,
        visit_id=db_note.visit_id,
        note_type=db_note.note_type,
        content=db_note.content,
        status=db_note.status,
        created_at=db_note.created_at,
        updated_at=db_note.updated_at,
        signed_at=db_note.signed_at,
        audio_file=db_note.audio_file,
        patient_first_name=patient.first_name if patient else None,
        patient_last_name=patient.last_name if patient else None,
        patient_date_of_birth=patient.date_of_birth if patient else None,
        patient_phone_number=patient.phone_number if patient else None,
        patient_email=patient.email if patient else None,
        comments=comments,
        history=history,
    )

# EXPORT: CCD (minimal XML) and plain text with audit logging
@router.get("/{note_id}/export/ccd")
def export_note_ccd(
    note_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None or db_note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    patient = crud_patients.get_patient_by_id(db, db_note.patient_id)

    # Minimal CCD-like XML (not a full CCDA)
    def esc(s: str) -> str:
        return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    xml = f"""<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<ClinicalDocument>
  <title>{esc(db_note.note_type or 'Clinical Note')}</title>
  <effectiveTime value=\"{db_note.created_at.isoformat()}\" />
  <recordTarget>
    <patientRole>
      <id extension=\"{db_note.patient_id}\" />
      <patient>
        <name>
          <given>{esc(getattr(patient, 'first_name', '') or '')}</given>
          <family>{esc(getattr(patient, 'last_name', '') or '')}</family>
        </name>
        <birthTime value=\"{esc(getattr(patient, 'date_of_birth', '') or '')}\" />
      </patient>
    </patientRole>
  </recordTarget>
  <author>
    <assignedAuthor>
      <id extension=\"{current_user.id}\" />
      <assignedPerson>
        <name>{esc(current_user.username)}</name>
      </assignedPerson>
    </assignedAuthor>
  </author>
  <component>
    <structuredBody>
      <component>
        <section>
          <code code=\"34109-9\" displayName=\"Note\" />
          <text>{esc(db_note.content or '')}</text>
        </section>
      </component>
    </structuredBody>
  </component>
</ClinicalDocument>
"""

    # Audit log
    try:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="EXPORT",
            resource_type="note",
            resource_id=note_id,
            patient_id=db_note.patient_id,
            description=f"Export CCD for note {note_id}",
            request=request,
            success=True,
        )
    except Exception:
        pass

    return Response(content=xml, media_type="application/xml")


@router.get("/{note_id}/export/plain")
def export_note_plain(
    note_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None or db_note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    patient = crud_patients.get_patient_by_id(db, db_note.patient_id)

    lines = [
        f"Clinical Note #{db_note.id}",
        f"Type: {db_note.note_type}",
        f"Patient: {getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')} (ID {db_note.patient_id})",
        f"Created: {db_note.created_at.isoformat()}",
        "",
        db_note.content or "",
    ]
    out = "\n".join(lines)

    # Audit log
    try:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="EXPORT",
            resource_type="note",
            resource_id=note_id,
            patient_id=db_note.patient_id,
            description=f"Export plain text for note {note_id}",
            request=request,
            success=True,
        )
    except Exception:
        pass

    return Response(content=out, media_type="text/plain; charset=utf-8")


@router.get("/{note_id}/export/pdf")
def export_note_pdf(
    note_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None or db_note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    patient = crud_patients.get_patient_by_id(db, db_note.patient_id)

    try:
        # Lazy import so service can run without PDF deps
        from reportlab.pdfgen import canvas  # type: ignore
        from reportlab.lib.pagesizes import letter  # type: ignore
        from reportlab.pdfbase import pdfmetrics  # type: ignore
    except Exception:
        raise HTTPException(status_code=503, detail="PDF export unavailable on server")

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter
    margin = 54  # 3/4 inch
    x = margin
    y = height - margin
    c.setTitle(f"Clinical Note {note_id}")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(x, y, f"Clinical Note #{db_note.id}")
    y -= 20
    c.setFont("Helvetica", 10)
    c.drawString(x, y, f"Type: {db_note.note_type}")
    y -= 14
    pat_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip()
    c.drawString(x, y, f"Patient: {pat_name or 'N/A'} (ID {db_note.patient_id})")
    y -= 14
    c.drawString(x, y, f"Created: {db_note.created_at.isoformat()}")
    y -= 20
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x, y, "Content")
    y -= 16
    c.setFont("Helvetica", 10)

    max_width = width - 2 * margin
    def draw_wrapped(text: str, start_y: float) -> float:
        nonlocal x
        y_loc = start_y
        for line in (text or "").splitlines():
            words = line.split(" ") if line else [""]
            current = ""
            for w in words:
                test = (current + (" " if current else "") + w).strip()
                sw = pdfmetrics.stringWidth(test, "Helvetica", 10)
                if sw <= max_width:
                    current = test
                else:
                    c.drawString(x, y_loc, current)
                    y_loc -= 12
                    current = w
                    if y_loc < margin:
                        c.showPage(); c.setFont("Helvetica", 10)
                        y_loc = height - margin
            if current:
                c.drawString(x, y_loc, current)
                y_loc -= 12
            if y_loc < margin:
                c.showPage(); c.setFont("Helvetica", 10)
                y_loc = height - margin
        return y_loc

    y = draw_wrapped(db_note.content or "", y)
    c.showPage()
    c.save()
    pdf_bytes = buf.getvalue()

    # Audit
    try:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="EXPORT",
            resource_type="note",
            resource_id=note_id,
            patient_id=db_note.patient_id,
            description=f"Export PDF for note {note_id}",
            request=request,
            success=True,
        )
    except Exception:
        pass

    headers = {"Content-Disposition": f"attachment; filename=note-{note_id}.pdf"}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)

# Collaboration: Comments
@router.get("/{note_id}/comments", response_model=List[schemas.NoteCommentRead])
def list_comments(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    note = crud_notes.get_note(db, note_id)
    if note is None or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    return db.query(models.NoteComment).filter(models.NoteComment.note_id == note_id).order_by(models.NoteComment.created_at.desc()).all()


@router.post("/{note_id}/comments", response_model=schemas.NoteCommentRead)
def add_comment(note_id: int, payload: schemas.NoteCommentCreate, request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    note = crud_notes.get_note(db, note_id)
    if note is None or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    c = models.NoteComment(note_id=note_id, user_id=current_user.id, username=current_user.username, content=payload.content)
    db.add(c)
    db.commit()
    db.refresh(c)
    try:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="COMMENT",
            resource_type="note",
            resource_id=note_id,
            patient_id=note.patient_id,
            description="Added comment",
            request=request,
        )
    except Exception:
        pass
    return c


# Collaboration: History
@router.get("/{note_id}/history", response_model=List[schemas.NoteHistoryRead])
def list_history(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    note = crud_notes.get_note(db, note_id)
    if note is None or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    return db.query(models.NoteHistory).filter(models.NoteHistory.note_id == note_id).order_by(models.NoteHistory.created_at.desc()).all()

# Audio streaming for provenance playback
@router.get("/{note_id}/audio")
def get_note_audio(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    note = crud_notes.get_note(db, note_id)
    if note is None or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    if not note.audio_file:
        raise HTTPException(status_code=404, detail="No audio available for this note")
    path = note.audio_file
    # Best-effort content type based on extension
    media_type = "application/octet-stream"
    if path.lower().endswith((".mp3", ".mpeg")):
        media_type = "audio/mpeg"
    elif path.lower().endswith(".wav"):
        media_type = "audio/wav"
    elif path.lower().endswith(".m4a"):
        media_type = "audio/mp4"
    return FileResponse(path=path, media_type=media_type)

# Audio file export/download
@router.get("/{note_id}/export/audio")
def export_note_audio(
    note_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Export the audio file associated with a note for download"""
    note = crud_notes.get_note(db, note_id)
    if note is None or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if not note.audio_file:
        raise HTTPException(status_code=404, detail="No audio file available for this note")
    
    # Determine file extension and MIME type
    audio_path = note.audio_file
    file_extension = Path(audio_path).suffix.lower()
    
    media_type = "application/octet-stream"
    if file_extension in [".mp3", ".mpeg"]:
        media_type = "audio/mpeg"
    elif file_extension == ".wav":
        media_type = "audio/wav"
    elif file_extension == ".m4a":
        media_type = "audio/mp4"
    elif file_extension == ".ogg":
        media_type = "audio/ogg"
    elif file_extension == ".flac":
        media_type = "audio/flac"
    
    # Generate filename with patient info if available
    patient = crud_patients.get_patient_by_id(db, note.patient_id)
    patient_name = ""
    if patient:
        patient_name = f"_{patient.first_name}_{patient.last_name}".replace(" ", "_")
    
    filename = f"note_{note_id}{patient_name}_{note.created_at.strftime('%Y%m%d')}{file_extension}"
    
    # Audit log
    try:
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="EXPORT",
            resource_type="note_audio",
            resource_id=note_id,
            patient_id=note.patient_id,
            description=f"Export audio file for note {note_id}",
            request=request,
            success=True,
        )
    except Exception:
        pass
    
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return FileResponse(path=audio_path, media_type=media_type, headers=headers)

# Provenance listing
@router.get("/{note_id}/provenance", response_model=List[schemas.NoteProvenanceRead])
def list_provenance(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    note = crud_notes.get_note(db, note_id)
    if note is None or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    return db.query(models.NoteProvenance).filter(models.NoteProvenance.note_id == note_id).order_by(models.NoteProvenance.sentence_index.asc()).all()

# Code extraction listing
@router.get("/{note_id}/codes", response_model=List[schemas.NoteCodeRead])
def list_codes(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    note = crud_notes.get_note(db, note_id)
    if note is None or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    return db.query(models.NoteCodeExtraction).filter(models.NoteCodeExtraction.note_id == note_id).order_by(models.NoteCodeExtraction.system.asc(), models.NoteCodeExtraction.code.asc()).all()

@router.post("/{note_id}/codes/{code_id}/accept", response_model=schemas.NoteCodeRead)
def accept_code(note_id: int, code_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    note = crud_notes.get_note(db, note_id)
    if note is None or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    code = db.query(models.NoteCodeExtraction).filter(models.NoteCodeExtraction.id == code_id, models.NoteCodeExtraction.note_id == note_id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    code.status = "accepted"
    db.add(code)
    db.commit()
    db.refresh(code)
    return code

@router.post("/{note_id}/codes/{code_id}/reject", response_model=schemas.NoteCodeRead)
def reject_code(note_id: int, code_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    note = crud_notes.get_note(db, note_id)
    if note is None or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    code = db.query(models.NoteCodeExtraction).filter(models.NoteCodeExtraction.id == code_id, models.NoteCodeExtraction.note_id == note_id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    code.status = "rejected"
    db.add(code)
    db.commit()
    db.refresh(code)
    return code
# PUT /notes/{note_id} - Update a specific note by ID for the authenticated provider.
# Requires authentication. Expects NoteUpdate schema in the request body.
@router.put("/{note_id}", response_model=schemas.NoteRead)
def update_note(note_id: int, note: schemas.NoteUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_note = crud_notes.get_note(db, note_id)
    if db_note is None or db_note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Tenant isolation check
    if db_note.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied: Note belongs to different tenant")
    
    # Track which fields are being updated
    changed_fields = [k for k, v in note.model_dump(exclude_unset=True).items() if v is not None]
    
    # If status is being changed to finalized, set signed_at timestamp
    if 'status' in changed_fields and note.status == 'finalized':
        from datetime import datetime, timezone
        note.signed_at = datetime.now(timezone.utc)
        changed_fields.append('signed_at')
    
    # If content is being updated, recalculate accuracy
    if 'content' in changed_fields and note.content is not None:
        # Calculate new accuracy based on similarity to original content
        new_accuracy = calculate_content_accuracy(db_note.original_content or "", note.content)
        
        # Update accuracy tracking fields
        note.accuracy_score = new_accuracy
        note.content_changes_count = (db_note.content_changes_count or 0) + 1
        
        # Update the history summary to include accuracy info
        accuracy_info = f" (accuracy: {new_accuracy}%)"
        changed_fields.append(f"accuracy{accuracy_info}")
    
    db_note = crud_notes.update_note(db, note_id, note)
    try:
        hist = models.NoteHistory(
            note_id=note_id,
            user_id=current_user.id,
            username=current_user.username,
            action="UPDATE",
            summary=", ".join(changed_fields) or "Updated note",
        )
        db.add(hist)
        db.commit()
    except Exception:
        db.rollback()
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

# Duplicate comment endpoints removed - using the ones defined earlier

# Change History endpoint
@router.get("/{note_id}/history", response_model=List[dict])
def get_note_history(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Get change history for a note"""
    # Verify note exists and user has access
    note = crud_notes.get_note(db, note_id)
    if not note or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Get audit logs for this note
    audit_logs = db.query(models.AuditLog).filter(
        models.AuditLog.resource_type == 'note',
        models.AuditLog.resource_id == note_id
    ).order_by(models.AuditLog.created_at.desc()).all()
    
    return [
        {
            "id": log.id,
            "note_id": note_id,
            "user_id": log.user_id,
            "username": log.user.username,
            "action": log.action,
            "summary": log.summary,
            "created_at": log.created_at.isoformat()
        }
        for log in audit_logs
    ]

# Note Creation Timing Endpoints
@router.post("/{note_id}/start-timing")
def start_note_creation_timing(
    note_id: int,
    creation_method: str = Query(..., description="Creation method: handwritten, ai_assisted, ai_generated, voice_transcription"),
    baseline_minutes: Optional[int] = Query(None, description="Expected baseline time in minutes"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Start tracking note creation timing"""
    # Verify note exists and user has access
    note = crud_notes.get_note(db, note_id)
    if not note or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Validate creation method
    valid_methods = ["handwritten", "ai_assisted", "ai_generated", "voice_transcription"]
    if creation_method not in valid_methods:
        raise HTTPException(status_code=400, detail=f"Invalid creation method. Must be one of: {valid_methods}")
    
    # Set default baseline times if not provided
    if baseline_minutes is None:
        baseline_minutes = {
            "handwritten": 15,
            "ai_assisted": 8,
            "ai_generated": 3,
            "voice_transcription": 5
        }.get(creation_method, 15)
    
    # Update note with timing start
    note.creation_method = creation_method
    note.creation_started_at = datetime.now(timezone.utc)
    note.baseline_time_minutes = baseline_minutes
    
    db.commit()
    
    return {
        "message": "Note creation timing started",
        "creation_method": creation_method,
        "baseline_minutes": baseline_minutes,
        "started_at": note.creation_started_at.isoformat()
    }

@router.post("/{note_id}/complete-timing")
def complete_note_creation_timing(
    note_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Complete note creation timing and calculate time saved"""
    # Verify note exists and user has access
    note = crud_notes.get_note(db, note_id)
    if not note or note.provider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if not note.creation_started_at:
        raise HTTPException(status_code=400, detail="Note creation timing was not started")
    
    # Calculate actual time taken
    completion_time = datetime.now(timezone.utc)
    actual_duration = completion_time - note.creation_started_at
    actual_minutes = max(0, int(actual_duration.total_seconds() / 60))
    
    # Calculate time saved
    baseline_minutes = note.baseline_time_minutes or 15
    time_saved_minutes = max(0, baseline_minutes - actual_minutes)
    
    # Update note with completion timing
    note.creation_completed_at = completion_time
    note.actual_time_minutes = actual_minutes
    note.time_saved_minutes = time_saved_minutes
    
    db.commit()
    
    return {
        "message": "Note creation timing completed",
        "creation_method": note.creation_method,
        "baseline_minutes": baseline_minutes,
        "actual_minutes": actual_minutes,
        "time_saved_minutes": time_saved_minutes,
        "efficiency_percentage": round((time_saved_minutes / baseline_minutes) * 100, 1) if baseline_minutes > 0 else 0,
        "completed_at": completion_time.isoformat()
    }

@router.get("/timing-stats")
def get_note_timing_stats(
    method: Optional[str] = Query(None, description="Filter by creation method"),
    days: int = Query(30, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get timing statistics for note creation methods"""
    from datetime import timedelta
    
    # Calculate date range
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Base query for user's notes
    query = db.query(models.Note).filter(
        models.Note.provider_id == current_user.id,
        models.Note.created_at >= start_date,
        models.Note.created_at <= end_date,
        models.Note.creation_completed_at.isnot(None)  # Only completed timing sessions
    )
    
    # Filter by method if specified
    if method:
        query = query.filter(models.Note.creation_method == method)
    
    notes = query.all()
    
    if not notes:
        return {
            "message": "No timing data available",
            "total_notes": 0,
            "methods": {}
        }
    
    # Calculate statistics by method
    methods = {}
    for note in notes:
        method = note.creation_method or "unknown"
        if method not in methods:
            methods[method] = {
                "total_notes": 0,
                "total_baseline_minutes": 0,
                "total_actual_minutes": 0,
                "total_time_saved_minutes": 0,
                "avg_baseline_minutes": 0,
                "avg_actual_minutes": 0,
                "avg_time_saved_minutes": 0,
                "avg_efficiency_percentage": 0
            }
        
        methods[method]["total_notes"] += 1
        methods[method]["total_baseline_minutes"] += note.baseline_time_minutes or 0
        methods[method]["total_actual_minutes"] += note.actual_time_minutes or 0
        methods[method]["total_time_saved_minutes"] += note.time_saved_minutes or 0
    
    # Calculate averages
    for method, stats in methods.items():
        if stats["total_notes"] > 0:
            stats["avg_baseline_minutes"] = round(stats["total_baseline_minutes"] / stats["total_notes"], 1)
            stats["avg_actual_minutes"] = round(stats["total_actual_minutes"] / stats["total_notes"], 1)
            stats["avg_time_saved_minutes"] = round(stats["total_time_saved_minutes"] / stats["total_notes"], 1)
            if stats["avg_baseline_minutes"] > 0:
                stats["avg_efficiency_percentage"] = round(
                    (stats["avg_time_saved_minutes"] / stats["avg_baseline_minutes"]) * 100, 1
                )
    
    return {
        "total_notes": len(notes),
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "days": days
        },
        "methods": methods
    } 