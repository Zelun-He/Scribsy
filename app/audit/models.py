"""
HIPAA Audit Logging Models
Tracks all access and modifications to Protected Health Information (PHI)
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime
import pytz

def get_utc_now():
    """Get current UTC time with timezone info"""
    return datetime.now(pytz.UTC)

class AuditLog(Base):
    """
    HIPAA-compliant audit log for tracking all PHI access and modifications
    """
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User information
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Can be null for system actions
    username = Column(String, nullable=False)  # Store username for audit trail
    user_ip = Column(String, nullable=True)  # IP address of the user
    user_agent = Column(String, nullable=True)  # Browser/client information
    
    # Action details
    action_type = Column(String, nullable=False)  # CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT
    resource_type = Column(String, nullable=False)  # patient, note, appointment, user
    resource_id = Column(Integer, nullable=True)  # ID of the resource accessed
    
    # PHI specific tracking
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)  # Which patient's PHI was accessed
    phi_fields_accessed = Column(Text, nullable=True)  # JSON list of PHI fields accessed
    
    # Event details
    description = Column(Text, nullable=False)  # Human-readable description
    success = Column(Boolean, nullable=False, default=True)  # Whether the action succeeded
    error_message = Column(Text, nullable=True)  # Error details if action failed
    
    # Request details
    endpoint = Column(String, nullable=True)  # API endpoint accessed
    method = Column(String, nullable=True)  # HTTP method (GET, POST, etc.)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    patient = relationship("Patient")

class LoginAttempt(Base):
    """
    Track all login attempts for security monitoring
    """
    __tablename__ = "login_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False)
    ip_address = Column(String, nullable=False)
    user_agent = Column(String, nullable=True)
    success = Column(Boolean, nullable=False)
    failure_reason = Column(String, nullable=True)  # Invalid password, user not found, etc.
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

class DataRetentionPolicy(Base):
    """
    Track data retention and deletion for HIPAA compliance
    """
    __tablename__ = "data_retention_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    resource_type = Column(String, nullable=False)  # patient, note, appointment
    resource_id = Column(Integer, nullable=False)
    retention_period_days = Column(Integer, nullable=False, default=2555)  # 7 years default
    deletion_scheduled_at = Column(DateTime(timezone=True), nullable=True)
    deletion_completed_at = Column(DateTime(timezone=True), nullable=True)
    deletion_reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)