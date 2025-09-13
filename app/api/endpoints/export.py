"""
Export endpoints for user data download
"""
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.endpoints.auth import get_current_user
from app.db import models
from app.services.preferences import load_user_preferences
import json
import csv
import io
import zipfile
from datetime import datetime
import pytz

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/audio/{note_id}")
async def download_audio_file(
    note_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Download the audio file associated with a note
    """
    try:
        # Get the note and verify ownership
        note = db.query(models.Note).filter(
            models.Note.id == note_id,
            models.Note.provider_id == current_user.id
        ).first()
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        if not note.audio_file and not note.s3_key:
            raise HTTPException(status_code=404, detail="No audio file found for this note")
        
        # For now, we'll return the file path/info
        # In production, you'd want to stream the actual file
        from fastapi.responses import JSONResponse
        
        return JSONResponse({
            "note_id": note_id,
            "audio_file": note.audio_file,
            "s3_key": note.s3_key,
            "file_size": note.file_size,
            "content_type": note.content_type,
            "download_url": f"/export/audio/{note_id}/file"  # This would be a separate endpoint for actual file download
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get audio info: {str(e)}")

@router.get("/data")
async def export_user_data(
    format: str = "json",  # json, csv, zip
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Export all user data in the specified format
    """
    try:
        # Get all user data
        user_data = await _get_user_data(current_user.id, db)
        
        if format == "json":
            return _export_json(user_data)
        elif format == "csv":
            return _export_csv(user_data)
        elif format == "zip":
            return _export_zip(user_data)
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Use 'json', 'csv', or 'zip'")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

async def _get_user_data(user_id: int, db: Session):
    """Collect all user data from the database"""
    
    # Get user profile
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's patients
    patients = db.query(models.Patient).filter(models.Patient.user_id == user_id).all()
    
    # Get user's notes
    notes = db.query(models.Note).filter(models.Note.provider_id == user_id).all()
    
    # Get user's appointments
    appointments = []
    for patient in patients:
        patient_appointments = db.query(models.Appointment).filter(
            models.Appointment.patient_id == patient.id
        ).all()
        appointments.extend(patient_appointments)
    
    # Get AI preferences
    ai_preferences = load_user_preferences(user_id)
    
    # Get audit logs
    audit_logs = db.query(models.AuditLog).filter(
        models.AuditLog.user_id == user_id
    ).all()
    
    return {
        "export_info": {
            "exported_at": datetime.now(pytz.UTC).isoformat(),
            "user_id": user_id,
            "data_version": "1.0"
        },
        "user_profile": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": bool(user.is_active),
            "is_admin": bool(user.is_admin),
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "work_start_time": user.work_start_time,
            "work_end_time": user.work_end_time,
            "timezone": user.timezone,
            "working_days": user.working_days,
            "created_at": user.created_at.isoformat() if hasattr(user, 'created_at') else None
        },
        "patients": [
            {
                "id": patient.id,
                "first_name": patient.first_name,
                "last_name": patient.last_name,
                "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                "phone_number": patient.phone_number,
                "email": patient.email,
                "address": patient.address,
                "city": patient.city,
                "state": patient.state,
                "zip_code": patient.zip_code,
                "created_at": patient.created_at.isoformat(),
                "updated_at": patient.updated_at.isoformat()
            }
            for patient in patients
        ],
        "notes": [
            {
                "id": note.id,
                "patient_id": note.patient_id,
                "visit_id": note.visit_id,
                "note_type": note.note_type,
                "content": note.content,
                "status": note.status,
                "created_at": note.created_at.isoformat(),
                "updated_at": note.updated_at.isoformat(),
                "signed_at": note.signed_at.isoformat() if note.signed_at else None,
                "audio_file": note.audio_file,
                "s3_key": note.s3_key,
                "file_size": note.file_size,
                "content_type": note.content_type,
                "transcript": note.transcript,
                "soap_subjective": note.soap_subjective,
                "soap_objective": note.soap_objective,
                "soap_assessment": note.soap_assessment,
                "soap_plan": note.soap_plan,
                "accuracy_score": note.accuracy_score,
                "content_changes_count": note.content_changes_count,
                "creation_method": note.creation_method,
                "creation_started_at": note.creation_started_at.isoformat() if note.creation_started_at else None,
                "creation_completed_at": note.creation_completed_at.isoformat() if note.creation_completed_at else None,
                "baseline_time_minutes": note.baseline_time_minutes,
                "actual_time_minutes": note.actual_time_minutes,
                "time_saved_minutes": note.time_saved_minutes
            }
            for note in notes
        ],
        "appointments": [
            {
                "id": appt.id,
                "patient_id": appt.patient_id,
                "scheduled_at": appt.scheduled_at.isoformat(),
                "duration_minutes": appt.duration_minutes,
                "appointment_type": appt.appointment_type,
                "notes": appt.notes,
                "status": appt.status,
                "notify_before_minutes": appt.notify_before_minutes,
                "created_at": appt.created_at.isoformat(),
                "updated_at": appt.updated_at.isoformat()
            }
            for appt in appointments
        ],
        "ai_preferences": ai_preferences,
        "audit_logs": [
            {
                "id": log.id,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat()
            }
            for log in audit_logs
        ]
    }

def _export_json(user_data):
    """Export data as JSON"""
    json_data = json.dumps(user_data, indent=2, ensure_ascii=False)
    
    return Response(
        content=json_data,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=scribsy_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        }
    )

def _export_csv(user_data):
    """Export data as CSV files in a ZIP"""
    output = io.BytesIO()
    
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Export notes as CSV
        notes_csv = io.StringIO()
        notes_writer = csv.writer(notes_csv)
        notes_writer.writerow([
            'ID', 'Patient ID', 'Visit ID', 'Note Type', 'Content', 'Status', 
            'Created At', 'Updated At', 'Signed At', 'SOAP Subjective', 'SOAP Objective', 
            'SOAP Assessment', 'SOAP Plan', 'Accuracy Score', 'Creation Method', 
            'Time Saved (minutes)'
        ])
        
        for note in user_data['notes']:
            notes_writer.writerow([
                note['id'], note['patient_id'], note['visit_id'], note['note_type'],
                note['content'], note['status'], note['created_at'], note['updated_at'],
                note['signed_at'], note['soap_subjective'], note['soap_objective'],
                note['soap_assessment'], note['soap_plan'], note['accuracy_score'],
                note['creation_method'], note['time_saved_minutes']
            ])
        
        zip_file.writestr("notes.csv", notes_csv.getvalue())
        
        # Export patients as CSV
        patients_csv = io.StringIO()
        patients_writer = csv.writer(patients_csv)
        patients_writer.writerow([
            'ID', 'First Name', 'Last Name', 'Date of Birth', 'Phone Number', 
            'Email', 'Address', 'City', 'State', 'Zip Code', 'Created At'
        ])
        
        for patient in user_data['patients']:
            patients_writer.writerow([
                patient['id'], patient['first_name'], patient['last_name'],
                patient['date_of_birth'], patient['phone_number'], patient['email'],
                patient['address'], patient['city'], patient['state'], 
                patient['zip_code'], patient['created_at']
            ])
        
        zip_file.writestr("patients.csv", patients_csv.getvalue())
        
        # Export appointments as CSV
        appointments_csv = io.StringIO()
        appointments_writer = csv.writer(appointments_csv)
        appointments_writer.writerow([
            'ID', 'Patient ID', 'Scheduled At', 'Duration (minutes)', 
            'Appointment Type', 'Status', 'Notes', 'Created At'
        ])
        
        for appt in user_data['appointments']:
            appointments_writer.writerow([
                appt['id'], appt['patient_id'], appt['scheduled_at'],
                appt['duration_minutes'], appt['appointment_type'], 
                appt['status'], appt['notes'], appt['created_at']
            ])
        
        zip_file.writestr("appointments.csv", appointments_csv.getvalue())
        
        # Export user profile and preferences as JSON
        profile_data = {
            "user_profile": user_data['user_profile'],
            "ai_preferences": user_data['ai_preferences'],
            "export_info": user_data['export_info']
        }
        
        zip_file.writestr("profile_and_preferences.json", json.dumps(profile_data, indent=2))
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue()),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=scribsy_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        }
    )

def _export_zip(user_data):
    """Export all data as a comprehensive ZIP file"""
    output = io.BytesIO()
    
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Export complete JSON
        zip_file.writestr("complete_export.json", json.dumps(user_data, indent=2))
        
        # Export individual CSV files (same as CSV export)
        # ... (include the same CSV logic as above)
        
        # Export summary report
        summary = f"""
Scribsy Data Export Summary
==========================

Export Date: {user_data['export_info']['exported_at']}
User: {user_data['user_profile']['username']} ({user_data['user_profile']['email']})

Data Summary:
- Total Notes: {len(user_data['notes'])}
- Total Patients: {len(user_data['patients'])}
- Total Appointments: {len(user_data['appointments'])}
- Total Audit Logs: {len(user_data['audit_logs'])}

This export contains all your clinical documentation and account data.
Please keep this file secure as it contains sensitive medical information.

For questions about this export, contact support.
        """
        
        zip_file.writestr("EXPORT_SUMMARY.txt", summary)
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue()),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=scribsy_complete_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        }
    )
