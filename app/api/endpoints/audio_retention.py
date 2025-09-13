"""
Audio retention and secure delete API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.endpoints.auth import get_current_user
from app.db import models
from app.services.audio_retention import AudioRetentionService
from app.security.audit import AuditManager, AuditAction, AuditSeverity
from typing import Optional

router = APIRouter(prefix="/audio-retention", tags=["audio-retention"])

@router.post("/schedule-deletion/{note_id}")
async def schedule_audio_deletion(
    note_id: int,
    retention_days: int = Query(30, description="Number of days to retain audio file"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Schedule audio file for deletion after specified retention period
    """
    try:
        # Verify note exists and user has access
        note = db.query(models.Note).filter(
            models.Note.id == note_id,
            models.Note.provider_id == current_user.id
        ).first()
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        if not note.audio_file:
            raise HTTPException(status_code=400, detail="No audio file found for this note")
        
        if note.audio_secure_deleted:
            raise HTTPException(status_code=400, detail="Audio file has already been deleted")
        
        # Schedule deletion
        success = AudioRetentionService.schedule_audio_deletion(
            db=db,
            note_id=note_id,
            retention_days=retention_days,
            user_id=current_user.id
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to schedule audio deletion")
        
        return {
            "message": "Audio deletion scheduled successfully",
            "note_id": note_id,
            "retention_days": retention_days,
            "scheduled_deletion": note.audio_deleted_at.isoformat() if note.audio_deleted_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule deletion: {str(e)}")

@router.post("/delete-expired")
async def delete_expired_audio_files(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manually trigger deletion of expired audio files
    (Admin/maintenance endpoint)
    """
    try:
        # Check if user has admin privileges
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        deleted_count = AudioRetentionService.delete_expired_audio_files(db)
        
        # Log the manual cleanup
        AuditManager.log_action(
            db=db,
            user_id=current_user.id,
            action="audio_cleanup_manual",
            resource_type="system",
            severity=AuditSeverity.HIGH.value,
            details={
                "deleted_count": deleted_count,
                "triggered_by": "manual"
            }
        )
        
        return {
            "message": "Expired audio files cleanup completed",
            "deleted_count": deleted_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete expired files: {str(e)}")

@router.get("/presigned-url/{note_id}")
async def get_presigned_download_url(
    note_id: int,
    expires_minutes: int = Query(5, description="URL expiration time in minutes"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Generate a presigned URL for secure audio download with short expiration
    """
    try:
        # Verify note exists and user has access
        note = db.query(models.Note).filter(
            models.Note.id == note_id,
            models.Note.provider_id == current_user.id
        ).first()
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        if not note.audio_file or note.audio_secure_deleted:
            raise HTTPException(status_code=404, detail="Audio file not available")
        
        # Generate presigned URL
        download_url = AudioRetentionService.generate_presigned_download_url(
            note_id=note_id,
            expires_minutes=expires_minutes,
            user_id=current_user.id
        )
        
        if not download_url:
            raise HTTPException(status_code=500, detail="Failed to generate download URL")
        
        # Log the URL generation
        AuditManager.log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.AUDIO_DOWNLOAD.value,
            resource_type="note_audio",
            resource_id=note_id,
            severity=AuditSeverity.MEDIUM.value,
            details={
                "expires_minutes": expires_minutes,
                "presigned_url": True
            }
        )
        
        return {
            "download_url": download_url,
            "expires_minutes": expires_minutes,
            "expires_at": (note.audio_deleted_at.isoformat() if note.audio_deleted_at else None)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {str(e)}")

@router.put("/retention-policy/{note_id}")
async def update_retention_policy(
    note_id: int,
    retention_days: int = Query(..., description="New retention period in days"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update the retention policy for a note's audio file
    """
    try:
        # Verify note exists and user has access
        note = db.query(models.Note).filter(
            models.Note.id == note_id,
            models.Note.provider_id == current_user.id
        ).first()
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        if not note.audio_file:
            raise HTTPException(status_code=400, detail="No audio file found for this note")
        
        if note.audio_secure_deleted:
            raise HTTPException(status_code=400, detail="Audio file has already been deleted")
        
        # Validate retention period
        if retention_days < 1 or retention_days > 365:
            raise HTTPException(status_code=400, detail="Retention period must be between 1 and 365 days")
        
        # Update retention policy
        success = AudioRetentionService.update_retention_policy(
            db=db,
            note_id=note_id,
            new_retention_days=retention_days,
            user_id=current_user.id
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update retention policy")
        
        return {
            "message": "Retention policy updated successfully",
            "note_id": note_id,
            "new_retention_days": retention_days,
            "scheduled_deletion": note.audio_deleted_at.isoformat() if note.audio_deleted_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update retention policy: {str(e)}")

@router.get("/stats")
async def get_retention_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get audio retention statistics for the current user
    """
    try:
        stats = AudioRetentionService.get_retention_stats(db, user_id=current_user.id)
        
        return {
            "user_id": current_user.id,
            "retention_stats": stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get retention stats: {str(e)}")

@router.get("/admin/stats")
async def get_admin_retention_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get system-wide audio retention statistics (Admin only)
    """
    try:
        # Check admin privileges
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        stats = AudioRetentionService.get_retention_stats(db)
        
        return {
            "system_retention_stats": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get admin retention stats: {str(e)}")
