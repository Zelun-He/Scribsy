"""
S3 management endpoints for file operations
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.services.s3_service import s3_service
from app.api.endpoints.auth import get_current_user
from app.db.database import get_db
from app.db.models import Note
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/files")
async def list_user_files(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """List files stored in S3 for the current user"""
    if not s3_service.is_available():
        raise HTTPException(status_code=503, detail="S3 service not available")
    
    try:
        # Get notes with S3 files for the current user
        notes = db.query(Note).filter(
            Note.provider_id == current_user.id,
            Note.s3_key.isnot(None)
        ).offset(offset).limit(limit).all()
        
        files = []
        for note in notes:
            file_info = {
                "note_id": note.id,
                "filename": note.audio_file,
                "s3_key": note.s3_key,
                "file_size": note.file_size,
                "content_type": note.content_type,
                "created_at": note.created_at,
                "download_url": s3_service.get_file_url(note.s3_key)
            }
            files.append(file_info)
        
        return JSONResponse(content={
            "files": files,
            "total": len(files),
            "limit": limit,
            "offset": offset
        })
    
    except Exception as e:
        logger.error(f"Failed to list S3 files: {e}")
        raise HTTPException(status_code=500, detail="Failed to list files")

@router.delete("/files/{note_id}")
async def delete_s3_file(
    note_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a file from S3"""
    if not s3_service.is_available():
        raise HTTPException(status_code=503, detail="S3 service not available")
    
    try:
        # Get the note and verify ownership
        note = db.query(Note).filter(
            Note.id == note_id,
            Note.provider_id == current_user.id
        ).first()
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        if not note.s3_key:
            raise HTTPException(status_code=400, detail="Note has no S3 file")
        
        # Delete from S3
        if await s3_service.delete_file(note.s3_key):
            # Update database record
            note.s3_key = None
            note.storage_provider = "local"
            db.commit()
            
            return JSONResponse(content={"message": "File deleted successfully"})
        else:
            raise HTTPException(status_code=500, detail="Failed to delete file from S3")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete S3 file: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete file")

@router.get("/files/{note_id}/download")
async def get_download_url(
    note_id: int,
    expires_in: int = Query(3600, ge=300, le=86400),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a presigned download URL for a file"""
    if not s3_service.is_available():
        raise HTTPException(status_code=503, detail="S3 service not available")
    
    try:
        # Get the note and verify ownership
        note = db.query(Note).filter(
            Note.id == note_id,
            Note.provider_id == current_user.id
        ).first()
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        if not note.s3_key:
            raise HTTPException(status_code=400, detail="Note has no S3 file")
        
        # Generate presigned URL
        download_url = s3_service.get_file_url(note.s3_key, expires_in)
        
        if not download_url:
            raise HTTPException(status_code=500, detail="Failed to generate download URL")
        
        return JSONResponse(content={
            "download_url": download_url,
            "expires_in": expires_in,
            "filename": note.audio_file
        })
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate download URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate download URL")

@router.get("/status")
async def get_s3_status():
    """Get S3 service status"""
    return JSONResponse(content={
        "available": s3_service.is_available(),
        "bucket_name": s3_service.bucket_name if s3_service.is_available() else None
    }) 