"""
Audio retention and secure delete service
"""
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from pathlib import Path
from sqlalchemy.orm import Session
from app.db import models
from app.utils.logging import logger
from app.security.audit import AuditManager, AuditAction, AuditSeverity


class AudioRetentionService:
    """Service for managing audio file retention and secure deletion"""
    
    @staticmethod
    def secure_delete_file(file_path: str, passes: int = 3) -> bool:
        """
        Securely delete a file by overwriting it with random data multiple times
        """
        try:
            if not os.path.exists(file_path):
                return True
                
            file_size = os.path.getsize(file_path)
            
            # Overwrite file with random data multiple times
            with open(file_path, "r+b") as f:
                for _ in range(passes):
                    f.seek(0)
                    f.write(secrets.token_bytes(file_size))
                    f.flush()
                    os.fsync(f.fileno())
            
            # Delete the file
            os.remove(file_path)
            
            # Optionally overwrite the filename in the directory
            # (This is more complex and OS-dependent)
            
            logger.info(f"Securely deleted file: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to securely delete file {file_path}: {str(e)}")
            return False
    
    @staticmethod
    def schedule_audio_deletion(
        db: Session, 
        note_id: int, 
        retention_days: int = 30,
        user_id: Optional[int] = None
    ) -> bool:
        """
        Schedule audio file for deletion after specified retention period
        """
        try:
            note = db.query(models.Note).filter(models.Note.id == note_id).first()
            if not note or not note.audio_file:
                return False
            
            # Set retention period
            note.audio_retention_days = retention_days
            
            # Calculate deletion date
            deletion_date = datetime.now(timezone.utc) + timedelta(days=retention_days)
            
            # For now, we'll just mark it for deletion
            # In production, you'd want to use a task queue (Celery, etc.)
            note.audio_deleted_at = deletion_date
            
            db.commit()
            
            # Log the scheduling
            AuditManager.log_action(
                db=db,
                user_id=user_id or note.provider_id,
                action=AuditAction.AUDIO_DELETE.value,
                resource_type="note_audio",
                resource_id=note_id,
                severity=AuditSeverity.MEDIUM.value,
                details={
                    "retention_days": retention_days,
                    "scheduled_deletion": deletion_date.isoformat(),
                    "audio_file": note.audio_file
                }
            )
            
            logger.info(f"Scheduled audio deletion for note {note_id} in {retention_days} days")
            return True
            
        except Exception as e:
            logger.error(f"Failed to schedule audio deletion for note {note_id}: {str(e)}")
            return False
    
    @staticmethod
    def delete_expired_audio_files(db: Session) -> int:
        """
        Delete audio files that have passed their retention period
        Returns the number of files deleted
        """
        deleted_count = 0
        current_time = datetime.now(timezone.utc)
        
        try:
            # Find notes with expired audio files
            expired_notes = db.query(models.Note).filter(
                models.Note.audio_file.isnot(None),
                models.Note.audio_deleted_at.isnot(None),
                models.Note.audio_deleted_at <= current_time,
                models.Note.audio_secure_deleted == False
            ).all()
            
            for note in expired_notes:
                try:
                    # Securely delete the audio file
                    if AudioRetentionService.secure_delete_file(note.audio_file):
                        note.audio_secure_deleted = True
                        note.audio_file = None  # Clear the file path
                        note.s3_key = None  # Clear S3 key if applicable
                        
                        # Log the deletion
                        AuditManager.log_action(
                            db=db,
                            user_id=note.provider_id,
                            action=AuditAction.AUDIO_DELETE.value,
                            resource_type="note_audio",
                            resource_id=note.id,
                            severity=AuditSeverity.HIGH.value,
                            details={
                                "deletion_reason": "retention_period_expired",
                                "retention_days": note.audio_retention_days,
                                "scheduled_date": note.audio_deleted_at.isoformat() if note.audio_deleted_at else None
                            }
                        )
                        
                        deleted_count += 1
                        logger.info(f"Deleted expired audio file for note {note.id}")
                    else:
                        logger.error(f"Failed to securely delete audio file for note {note.id}")
                        
                except Exception as e:
                    logger.error(f"Error deleting audio file for note {note.id}: {str(e)}")
            
            db.commit()
            logger.info(f"Deleted {deleted_count} expired audio files")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error in delete_expired_audio_files: {str(e)}")
            db.rollback()
            return 0
    
    @staticmethod
    def generate_presigned_download_url(
        note_id: int,
        expires_minutes: int = 5,
        user_id: Optional[int] = None
    ) -> Optional[str]:
        """
        Generate a presigned URL for audio download with short expiration
        """
        try:
            # In production, you'd integrate with S3 or similar
            # For now, return a temporary download endpoint
            token = secrets.token_urlsafe(32)
            
            # Store token in database with expiration (you'd want a separate table for this)
            # For now, just return the endpoint
            
            download_url = f"/api/notes/{note_id}/audio/download?token={token}&expires={expires_minutes}"
            
            logger.info(f"Generated presigned download URL for note {note_id}, expires in {expires_minutes} minutes")
            return download_url
            
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for note {note_id}: {str(e)}")
            return None
    
    @staticmethod
    def update_retention_policy(
        db: Session,
        note_id: int,
        new_retention_days: int,
        user_id: Optional[int] = None
    ) -> bool:
        """
        Update the retention policy for a note's audio file
        """
        try:
            note = db.query(models.Note).filter(models.Note.id == note_id).first()
            if not note:
                return False
            
            old_retention = note.audio_retention_days
            note.audio_retention_days = new_retention_days
            
            # Recalculate deletion date if not already deleted
            if not note.audio_secure_deleted and note.audio_file:
                new_deletion_date = datetime.now(timezone.utc) + timedelta(days=new_retention_days)
                note.audio_deleted_at = new_deletion_date
            
            db.commit()
            
            # Log the policy change
            AuditManager.log_action(
                db=db,
                user_id=user_id or note.provider_id,
                action="audio_retention_update",
                resource_type="note_audio",
                resource_id=note_id,
                severity=AuditSeverity.MEDIUM.value,
                details={
                    "old_retention_days": old_retention,
                    "new_retention_days": new_retention_days,
                    "audio_file": note.audio_file
                }
            )
            
            logger.info(f"Updated retention policy for note {note_id}: {old_retention} -> {new_retention_days} days")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update retention policy for note {note_id}: {str(e)}")
            return False
    
    @staticmethod
    def get_retention_stats(db: Session, user_id: Optional[int] = None) -> dict:
        """
        Get statistics about audio file retention
        """
        try:
            query = db.query(models.Note)
            if user_id:
                query = query.filter(models.Note.provider_id == user_id)
            
            total_audio_files = query.filter(models.Note.audio_file.isnot(None)).count()
            deleted_files = query.filter(models.Note.audio_secure_deleted == True).count()
            pending_deletion = query.filter(
                models.Note.audio_deleted_at.isnot(None),
                models.Note.audio_secure_deleted == False
            ).count()
            
            return {
                "total_audio_files": total_audio_files,
                "deleted_files": deleted_files,
                "pending_deletion": pending_deletion,
                "active_files": total_audio_files - deleted_files
            }
            
        except Exception as e:
            logger.error(f"Failed to get retention stats: {str(e)}")
            return {
                "total_audio_files": 0,
                "deleted_files": 0,
                "pending_deletion": 0,
                "active_files": 0
            }
