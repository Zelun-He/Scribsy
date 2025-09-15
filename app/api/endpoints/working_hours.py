"""
Working hours management endpoints for tracking user work schedules
and providing note finalization reminders.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models, schemas
from app.api.endpoints.auth import get_current_user
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel
import pytz
import json

router = APIRouter(prefix="/working-hours", tags=["working-hours"])

class WorkingHoursUpdate(BaseModel):
    work_start_time: str
    work_end_time: str
    timezone: str
    working_days: List[int]  # 1=Monday, 7=Sunday

class WorkingHoursResponse(BaseModel):
    work_start_time: str
    work_end_time: str
    timezone: str
    working_days: List[int]
    is_workday: bool
    time_until_end: Optional[int] = None  # Minutes until work ends
    pending_notes_count: int = 0

@router.get("/", response_model=WorkingHoursResponse)
def get_working_hours(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's working hours and current status"""
    try:
        # Parse working days
        working_days = [int(day) for day in current_user.working_days.split(',')]
        
        # Get current time in user's timezone
        user_tz = pytz.timezone(current_user.timezone)
        now = datetime.now(user_tz)
        current_day = now.isoweekday()  # 1=Monday, 7=Sunday
        
        # Check if today is a working day
        is_workday = current_day in working_days
        
        # Calculate time until work ends (if it's a workday)
        time_until_end = None
        if is_workday:
            try:
                work_end = datetime.strptime(current_user.work_end_time, "%H:%M").time()
                work_end_today = datetime.combine(now.date(), work_end)
                work_end_today = user_tz.localize(work_end_today)
                
                if now < work_end_today:
                    time_until_end = int((work_end_today - now).total_seconds() / 60)
            except ValueError:
                pass  # Invalid time format
        
        # Count pending notes for today
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        pending_notes_count = db.query(models.Note).filter(
            models.Note.provider_id == current_user.id,
            models.Note.created_at >= today_start,
            models.Note.created_at <= today_end,
            models.Note.status.in_(['pending_review', 'draft'])
        ).count()
        
        return WorkingHoursResponse(
            work_start_time=current_user.work_start_time,
            work_end_time=current_user.work_end_time,
            timezone=current_user.timezone,
            working_days=working_days,
            is_workday=is_workday,
            time_until_end=time_until_end,
            pending_notes_count=pending_notes_count
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get working hours: {str(e)}")

@router.put("/", response_model=WorkingHoursResponse)
def update_working_hours(
    working_hours: WorkingHoursUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's working hours"""
    try:
        # Validate time format
        try:
            datetime.strptime(working_hours.work_start_time, "%H:%M")
            datetime.strptime(working_hours.work_end_time, "%H:%M")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
        
        # Validate timezone
        try:
            pytz.timezone(working_hours.timezone)
        except pytz.exceptions.UnknownTimeZoneError:
            raise HTTPException(status_code=400, detail="Invalid timezone")
        
        # Validate working days
        if not all(1 <= day <= 7 for day in working_hours.working_days):
            raise HTTPException(status_code=400, detail="Working days must be between 1 (Monday) and 7 (Sunday)")
        
        # Update user's working hours
        current_user.work_start_time = working_hours.work_start_time
        current_user.work_end_time = working_hours.work_end_time
        current_user.timezone = working_hours.timezone
        current_user.working_days = ','.join(map(str, working_hours.working_days))
        
        db.commit()
        db.refresh(current_user)
        
        # Return updated working hours with current status
        return get_working_hours(current_user, db)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update working hours: {str(e)}")

@router.get("/finalization-warning")
def get_finalization_warning(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user should be warned about pending notes before workday ends"""
    try:
        # Get working hours
        working_hours = get_working_hours(current_user, db)
        
        # If not a workday, no warning needed
        if not working_hours.is_workday:
            return {"should_warn": False, "reason": "Not a workday"}
        
        # If no pending notes, no warning needed
        if working_hours.pending_notes_count == 0:
            return {"should_warn": False, "reason": "No pending notes"}
        
        # If less than 30 minutes until work ends, show warning
        if working_hours.time_until_end is not None and working_hours.time_until_end <= 30:
            return {
                "should_warn": True,
                "reason": "Workday ending soon",
                "minutes_remaining": working_hours.time_until_end,
                "pending_notes_count": working_hours.pending_notes_count
            }
        
        return {"should_warn": False, "reason": "Workday not ending soon"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check finalization warning: {str(e)}")

@router.get("/pending-notes-today")
def get_pending_notes_today(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending notes created today"""
    try:
        # Get current time in user's timezone
        user_tz = pytz.timezone(current_user.timezone)
        now = datetime.now(user_tz)
        
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        pending_notes = db.query(models.Note).filter(
            models.Note.provider_id == current_user.id,
            models.Note.created_at >= today_start,
            models.Note.created_at <= today_end,
            models.Note.status.in_(['pending_review', 'draft'])
        ).all()
        
        return [
            {
                "id": note.id,
                "title": note.note_type or f"Note #{note.id}",
                "status": note.status,
                "created_at": note.created_at.isoformat(),
                "patient_id": note.patient_id
            }
            for note in pending_notes
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pending notes: {str(e)}")
