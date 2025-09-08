"""
Database models for the nudge/notification system
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime
import pytz

def get_utc_now():
    """Get current UTC time with timezone info"""
    return datetime.now(pytz.UTC)

class NudgeLog(Base):
    """Track nudges sent to users"""
    __tablename__ = "nudge_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=True)
    
    nudge_type = Column(String, nullable=False)  # INLINE_READY_TO_SIGN, END_OF_CLINIC_DIGEST, etc.
    message_title = Column(String, nullable=False)
    message_body = Column(Text, nullable=False)
    
    sent_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    delivery_status = Column(String, default="sent")  # sent, delivered, read, failed
    
    # Additional metadata
    priority = Column(String, default="medium")  # low, medium, high, urgent
    channel = Column(String, default="in_app")  # in_app, email, sms, push
    action_url = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User")
    note = relationship("Note")

class NotificationPreference(Base):
    """User notification preferences"""
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Nudge preferences
    enable_inline_nudges = Column(Boolean, default=True)
    enable_digest_nudges = Column(Boolean, default=True)
    enable_morning_reminders = Column(Boolean, default=True)
    enable_escalation_alerts = Column(Boolean, default=True)
    
    # Channel preferences
    in_app_notifications = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)
    sms_notifications = Column(Boolean, default=False)
    push_notifications = Column(Boolean, default=True)
    
    # Timing preferences
    quiet_hours_start = Column(String, default="20:00")  # 8 PM
    quiet_hours_end = Column(String, default="08:00")    # 8 AM
    weekend_notifications = Column(Boolean, default=False)
    
    # Advanced settings
    max_daily_nudges = Column(Integer, default=5)
    escalation_threshold_hours = Column(Integer, default=48)
    
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")

class ScheduledNudge(Base):
    """Scheduled nudges to be sent later"""
    __tablename__ = "scheduled_nudges"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=True)
    
    nudge_type = Column(String, nullable=False)
    message_data = Column(JSON, nullable=False)  # Stores message title, body, actions
    
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    
    # Status tracking
    status = Column(String, default="pending")  # pending, sent, cancelled, failed
    sent_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User")
    note = relationship("Note")

class UserStatus(Base):
    """Track user availability status for nudging"""
    __tablename__ = "user_status"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    status = Column(String, default="available")  # available, busy, DND, PTO
    status_message = Column(String, nullable=True)
    
    # Auto-status updates
    auto_busy_during_appointments = Column(Boolean, default=True)
    auto_available_after_hours = Column(Boolean, default=False)
    
    # Status timing
    status_until = Column(DateTime(timezone=True), nullable=True)
    last_activity = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="status")

class NudgeRule(Base):
    """Custom nudge rules for organizations"""
    __tablename__ = "nudge_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Rule conditions
    note_type_filter = Column(JSON, nullable=True)  # List of note types this applies to
    user_role_filter = Column(JSON, nullable=True)  # List of user roles this applies to
    time_conditions = Column(JSON, nullable=True)   # Time-based conditions
    
    # Rule actions
    nudge_config = Column(JSON, nullable=False)     # Nudge configuration override
    
    # Rule metadata
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=100)  # Lower numbers = higher priority
    
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    creator = relationship("User")