"""
Comprehensive audit logging system
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from app.db.database import Base
from app.db.models import User
from app.audit.models import AuditLog
from app.utils.logging import logger
import json

class AuditAction(Enum):
    """Audit action types"""
    # Authentication
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    
    # MFA
    MFA_SETUP = "mfa_setup"
    MFA_VERIFY = "mfa_verify"
    MFA_DISABLE = "mfa_disable"
    
    # Note operations
    NOTE_CREATE = "note_create"
    NOTE_READ = "note_read"
    NOTE_UPDATE = "note_update"
    NOTE_DELETE = "note_delete"
    NOTE_SIGN = "note_sign"
    NOTE_EXPORT = "note_export"
    
    # Patient operations
    PATIENT_CREATE = "patient_create"
    PATIENT_READ = "patient_read"
    PATIENT_UPDATE = "patient_update"
    PATIENT_DELETE = "patient_delete"
    
    # Appointment operations
    APPOINTMENT_CREATE = "appointment_create"
    APPOINTMENT_READ = "appointment_read"
    APPOINTMENT_UPDATE = "appointment_update"
    APPOINTMENT_DELETE = "appointment_delete"
    
    # System operations
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    ROLE_CHANGE = "role_change"
    
    # Data operations
    DATA_EXPORT = "data_export"
    AUDIO_DOWNLOAD = "audio_download"
    AUDIO_DELETE = "audio_delete"

class AuditSeverity(Enum):
    """Audit severity levels"""
    LOW = "low"         # Normal operations
    MEDIUM = "medium"   # Sensitive operations
    HIGH = "high"       # Critical operations
    CRITICAL = "critical"  # Security events

# AuditLog model is defined in app.audit.models to avoid duplication

class AuditManager:
    """Audit Manager for logging security events"""
    
    @staticmethod
    def log_event(
        db: Session,
        action: AuditAction,
        user_id: Optional[int] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        severity: AuditSeverity = AuditSeverity.LOW,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        expires_at: Optional[datetime] = None
    ) -> AuditLog:
        """Log an audit event"""
        try:
            audit_log = AuditLog(
                user_id=user_id,
                action=action.value,
                resource_type=resource_type,
                resource_id=resource_id,
                severity=severity.value,
                ip_address=ip_address,
                user_agent=user_agent,
                session_id=session_id,
                details=details,
                old_values=old_values,
                new_values=new_values,
                expires_at=expires_at
            )
            
            db.add(audit_log)
            db.commit()
            
            # Log to application logs for immediate visibility
            logger.info(
                f"Audit: {action.value} by user {user_id} on {resource_type}:{resource_id}",
                extra={
                    "audit_action": action.value,
                    "user_id": user_id,
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "severity": severity.value,
                    "ip_address": ip_address
                }
            )
            
            return audit_log
            
        except Exception as e:
            logger.error(f"Failed to create audit log: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def log_authentication(
        db: Session,
        action: AuditAction,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        success: bool = True,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        failure_reason: Optional[str] = None
    ):
        """Log authentication events"""
        severity = AuditSeverity.HIGH if not success else AuditSeverity.MEDIUM
        
        details = {
            "username": username,
            "success": success,
            "failure_reason": failure_reason
        }
        
        return AuditManager.log_event(
            db=db,
            action=action,
            user_id=user_id,
            severity=severity,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            details=details
        )
    
    @staticmethod
    def log_note_operation(
        db: Session,
        action: AuditAction,
        user_id: int,
        note_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None
    ):
        """Log note-related operations"""
        severity = AuditSeverity.HIGH if action in [AuditAction.NOTE_SIGN, AuditAction.NOTE_DELETE] else AuditSeverity.MEDIUM
        
        return AuditManager.log_event(
            db=db,
            action=action,
            user_id=user_id,
            resource_type="note",
            resource_id=note_id,
            severity=severity,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            old_values=old_values,
            new_values=new_values
        )
    
    @staticmethod
    def log_patient_operation(
        db: Session,
        action: AuditAction,
        user_id: int,
        patient_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None
    ):
        """Log patient-related operations"""
        severity = AuditSeverity.HIGH if action in [AuditAction.PATIENT_DELETE] else AuditSeverity.MEDIUM
        
        return AuditManager.log_event(
            db=db,
            action=action,
            user_id=user_id,
            resource_type="patient",
            resource_id=patient_id,
            severity=severity,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            old_values=old_values,
            new_values=new_values
        )
    
    @staticmethod
    def log_data_export(
        db: Session,
        user_id: int,
        export_type: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None
    ):
        """Log data export operations"""
        details = {
            "export_type": export_type,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return AuditManager.log_event(
            db=db,
            action=AuditAction.DATA_EXPORT,
            user_id=user_id,
            severity=AuditSeverity.HIGH,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            details=details
        )
    
    @staticmethod
    def get_audit_logs(
        db: Session,
        user_id: Optional[int] = None,
        action: Optional[AuditAction] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        severity: Optional[AuditSeverity] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[AuditLog]:
        """Retrieve audit logs with filtering"""
        query = db.query(AuditLog)
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action.value)
        if resource_type:
            query = query.filter(AuditLog.resource_type == resource_type)
        if resource_id:
            query = query.filter(AuditLog.resource_id == resource_id)
        if severity:
            query = query.filter(AuditLog.severity == severity.value)
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        
        return query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

# Audit decorator for automatic logging
def audit_log(action: AuditAction, severity: AuditSeverity = AuditSeverity.LOW):
    """Decorator to automatically log function calls"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract common parameters
            db = None
            user_id = None
            resource_type = None
            resource_id = None
            
            # Find database session and user in arguments
            for arg in args:
                if isinstance(arg, Session):
                    db = arg
                elif isinstance(arg, User):
                    user_id = arg.id
            
            # Find in kwargs
            if 'db' in kwargs:
                db = kwargs['db']
            if 'current_user' in kwargs:
                user_id = kwargs['current_user'].id
            
            # Log the event
            if db:
                AuditManager.log_event(
                    db=db,
                    action=action,
                    user_id=user_id,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    severity=severity
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
