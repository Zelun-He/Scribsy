"""
Nudge/Notification API endpoints for Finalize-Note system
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from app.api.endpoints.auth import get_current_user
from app.db.database import get_db
from app.db.models import User, Note, Patient
from app.db.nudge_models import NudgeLog, NotificationPreference, ScheduledNudge, UserStatus
from app.services.nudge_manager import evaluate_nudge
from app.audit.logger import HIPAAAuditLogger

router = APIRouter(prefix="/nudge", tags=["nudge"])

@router.post("/evaluate")
def evaluate(config: Dict[str, Any], inputs: Dict[str, Any], current_user = Depends(get_current_user)):
    """Evaluate nudge for a specific note/encounter"""
    try:
        result = evaluate_nudge(config, inputs)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/notifications")
def get_notifications(
    limit: int = 20,
    mark_as_read: bool = False,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's recent notifications"""
    try:
        # Get recent nudge logs for the user
        notifications = db.query(NudgeLog).filter(
            NudgeLog.user_id == current_user.id
        ).order_by(
            NudgeLog.sent_at.desc()
        ).limit(limit).all()
        
        result = []
        for notif in notifications:
            note_info = {}
            if notif.note_id:
                note = db.query(Note).filter(Note.id == notif.note_id).first()
                if note:
                    patient = db.query(Patient).filter(Patient.id == note.patient_id).first()
                    note_info = {
                        "note_id": note.id,
                        "note_type": note.note_type,
                        "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
                        "visit_id": note.visit_id
                    }
            
            result.append({
                "id": notif.id,
                "title": notif.message_title,
                "body": notif.message_body,
                "type": notif.nudge_type,
                "sent_at": notif.sent_at.isoformat(),
                "priority": notif.priority,
                "delivery_status": notif.delivery_status,
                "action_url": notif.action_url,
                "note_info": note_info
            })
        
        if mark_as_read:
            # Mark notifications as read
            for notif in notifications:
                notif.delivery_status = "read"
            db.commit()
        
        return {
            "notifications": result,
            "total_count": len(result),
            "unread_count": len([n for n in notifications if n.delivery_status != "read"])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get notifications: {str(e)}")

@router.post("/send-immediate")
def send_immediate_nudge(
    note_id: int,
    nudge_type: str = "INLINE_READY_TO_SIGN",
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send immediate nudge for a specific note"""
    try:
        # Get the note
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Check if user can access this note
        if note.provider_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized for this note")
        
        # Get patient info
        patient = db.query(Patient).filter(Patient.id == note.patient_id).first()
        patient_display = f"{patient.first_name} {patient.last_name}" if patient else "Unknown Patient"
        
        # Create appropriate message based on type
        if nudge_type == "INLINE_READY_TO_SIGN":
            title = f"📋 Note ready for signature"
            body = f"Your {note.note_type} note for {patient_display} is complete and ready to sign."
            action_url = f"/notes/{note_id}"
        else:
            title = "📝 Note reminder"
            body = f"Reminder about {note.note_type} note for {patient_display}"
            action_url = f"/notes/{note_id}"
        
        # Create nudge log
        nudge_log = NudgeLog(
            user_id=current_user.id,
            note_id=note_id,
            nudge_type=nudge_type,
            message_title=title,
            message_body=body,
            priority="high",
            action_url=action_url,
            delivery_status="sent"
        )
        
        db.add(nudge_log)
        db.commit()
        
        # Log audit trail
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="NOTIFICATION",
            resource_type="nudge",
            resource_id=nudge_log.id,
            description=f"Sent {nudge_type} nudge for note {note_id}",
            patient_id=note.patient_id
        )
        
        return {
            "success": True,
            "nudge_id": nudge_log.id,
            "message": "Nudge sent successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send nudge: {str(e)}")

@router.get("/preferences")
def get_preferences(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notification preferences"""
    try:
        prefs = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == current_user.id
        ).first()
        
        if not prefs:
            # Create default preferences
            prefs = NotificationPreference(user_id=current_user.id)
            db.add(prefs)
            db.commit()
            db.refresh(prefs)
        
        return {
            "enable_inline_nudges": prefs.enable_inline_nudges,
            "enable_digest_nudges": prefs.enable_digest_nudges,
            "enable_morning_reminders": prefs.enable_morning_reminders,
            "enable_escalation_alerts": prefs.enable_escalation_alerts,
            "in_app_notifications": prefs.in_app_notifications,
            "email_notifications": prefs.email_notifications,
            "sms_notifications": prefs.sms_notifications,
            "push_notifications": prefs.push_notifications,
            "quiet_hours_start": prefs.quiet_hours_start,
            "quiet_hours_end": prefs.quiet_hours_end,
            "weekend_notifications": prefs.weekend_notifications,
            "max_daily_nudges": prefs.max_daily_nudges,
            "escalation_threshold_hours": prefs.escalation_threshold_hours
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")

@router.put("/preferences")
def update_preferences(
    preferences: Dict[str, Any],
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's notification preferences"""
    try:
        prefs = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == current_user.id
        ).first()
        
        if not prefs:
            prefs = NotificationPreference(user_id=current_user.id)
            db.add(prefs)
        
        # Update preferences
        for key, value in preferences.items():
            if hasattr(prefs, key):
                setattr(prefs, key, value)
        
        db.commit()
        
        return {"success": True, "message": "Preferences updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")

@router.get("/status")
def get_user_status(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's current availability status"""
    try:
        status = db.query(UserStatus).filter(
            UserStatus.user_id == current_user.id
        ).first()
        
        if not status:
            # Create default status
            status = UserStatus(user_id=current_user.id)
            db.add(status)
            db.commit()
            db.refresh(status)
        
        return {
            "status": status.status,
            "status_message": status.status_message,
            "status_until": status.status_until.isoformat() if status.status_until else None,
            "auto_busy_during_appointments": status.auto_busy_during_appointments,
            "auto_available_after_hours": status.auto_available_after_hours,
            "last_activity": status.last_activity.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@router.put("/status")
def update_user_status(
    status_data: Dict[str, Any],
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's availability status"""
    try:
        status = db.query(UserStatus).filter(
            UserStatus.user_id == current_user.id
        ).first()
        
        if not status:
            status = UserStatus(user_id=current_user.id)
            db.add(status)
        
        # Update status fields
        if "status" in status_data:
            status.status = status_data["status"]
        if "status_message" in status_data:
            status.status_message = status_data["status_message"]
        if "status_until" in status_data:
            if status_data["status_until"]:
                status.status_until = datetime.fromisoformat(status_data["status_until"])
            else:
                status.status_until = None
        
        status.last_activity = datetime.utcnow()
        db.commit()
        
        return {"success": True, "message": "Status updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")

@router.get("/digest/preview")
def preview_digest(
    date: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview end-of-clinic digest for a specific date"""
    try:
        # Parse date or use today
        if date:
            target_date = datetime.fromisoformat(date).date()
        else:
            target_date = datetime.now().date()
        
        # Get unsigned notes from that date
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = start_of_day + timedelta(days=1)
        
        unsigned_notes = db.query(Note).filter(
            Note.provider_id == current_user.id,
            Note.created_at >= start_of_day,
            Note.created_at < end_of_day,
            Note.signed_at.is_(None),
            Note.status != 'draft'
        ).all()
        
        # Build digest data
        digest_items = []
        for note in unsigned_notes:
            patient = db.query(Patient).filter(Patient.id == note.patient_id).first()
            
            digest_items.append({
                "note_id": note.id,
                "note_type": note.note_type,
                "visit_id": note.visit_id,
                "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
                "created_at": note.created_at.isoformat(),
                "status": note.status
            })
        
        return {
            "date": target_date.isoformat(),
            "total_unsigned": len(digest_items),
            "estimated_time_minutes": len(digest_items) * 2,
            "notes": digest_items
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate digest preview: {str(e)}")

@router.post("/digest/send")
def send_digest(
    date: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send end-of-clinic digest"""
    try:
        # Get digest preview data
        if date:
            target_date = datetime.fromisoformat(date).date()
        else:
            target_date = datetime.now().date()
        
        # Get preview data
        preview_response = preview_digest(date, current_user, db)
        digest_data = preview_response
        
        if digest_data["total_unsigned"] == 0:
            return {"success": False, "message": "No unsigned notes to include in digest"}
        
        # Create digest message
        title = f"📝 End of day: {digest_data['total_unsigned']} unsigned notes"
        body = f"You have {digest_data['total_unsigned']} unsigned notes from {target_date.strftime('%B %d')}. Estimated time: {digest_data['estimated_time_minutes']} minutes."
        
        # Create nudge log
        nudge_log = NudgeLog(
            user_id=current_user.id,
            note_id=None,  # Digest applies to multiple notes
            nudge_type="END_OF_CLINIC_DIGEST",
            message_title=title,
            message_body=body,
            priority="medium",
            action_url="/notes?filter=unsigned",
            delivery_status="sent"
        )
        
        db.add(nudge_log)
        db.commit()
        
        # Log audit trail
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action_type="NOTIFICATION",
            resource_type="digest",
            resource_id=nudge_log.id,
            description=f"Sent end-of-clinic digest with {digest_data['total_unsigned']} notes"
        )
        
        return {
            "success": True,
            "nudge_id": nudge_log.id,
            "message": "Digest sent successfully",
            "notes_included": digest_data["total_unsigned"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send digest: {str(e)}")

@router.get("/analytics")
def get_nudge_analytics(
    days: int = 7,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get nudge analytics for the user"""
    try:
        # Date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get nudge statistics
        nudges = db.query(NudgeLog).filter(
            NudgeLog.user_id == current_user.id,
            NudgeLog.sent_at >= start_date
        ).all()
        
        # Analyze nudges
        total_nudges = len(nudges)
        nudge_types = {}
        delivery_status = {}
        
        for nudge in nudges:
            # Count by type
            nudge_types[nudge.nudge_type] = nudge_types.get(nudge.nudge_type, 0) + 1
            # Count by delivery status
            delivery_status[nudge.delivery_status] = delivery_status.get(nudge.delivery_status, 0) + 1
        
        # Get note completion stats
        notes = db.query(Note).filter(
            Note.provider_id == current_user.id,
            Note.created_at >= start_date
        ).all()
        
        signed_notes = len([n for n in notes if n.signed_at])
        unsigned_notes = len([n for n in notes if not n.signed_at])
        
        return {
            "period_days": days,
            "total_nudges_sent": total_nudges,
            "nudges_by_type": nudge_types,
            "delivery_status": delivery_status,
            "note_completion": {
                "total_notes": len(notes),
                "signed_notes": signed_notes,
                "unsigned_notes": unsigned_notes,
                "completion_rate": round((signed_notes / len(notes)) * 100, 1) if notes else 0
            },
            "average_nudges_per_day": round(total_nudges / days, 1)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")




