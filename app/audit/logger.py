"""
HIPAA Audit Logging Service
Provides centralized audit logging for all PHI access and modifications
"""
import json
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.audit.models import AuditLog, LoginAttempt
from app.db.database import get_db
from fastapi import Request
import logging

# Set up structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - AUDIT - %(levelname)s - %(message)s'
)
audit_logger = logging.getLogger("hipaa_audit")

class HIPAAAuditLogger:
    """
    HIPAA-compliant audit logger for tracking all PHI access
    """
    
    @staticmethod
    def log_action(
        db: Session,
        user_id: Optional[int],
        username: str,
        action_type: str,
        resource_type: str,
        description: str,
        resource_id: Optional[int] = None,
        patient_id: Optional[int] = None,
        phi_fields_accessed: Optional[List[str]] = None,
        request: Optional[Request] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """
        Log an audit event
        
        Args:
            db: Database session
            user_id: ID of the user performing the action
            username: Username of the user
            action_type: Type of action (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT)
            resource_type: Type of resource (patient, note, appointment, user)
            description: Human-readable description of the action
            resource_id: ID of the specific resource accessed
            patient_id: ID of patient whose PHI was accessed
            phi_fields_accessed: List of PHI fields that were accessed
            request: FastAPI request object for IP and user agent
            success: Whether the action succeeded
            error_message: Error message if action failed
        """
        try:
            # Extract request details
            user_ip = None
            user_agent = None
            endpoint = None
            method = None
            
            if request:
                user_ip = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent")
                endpoint = str(request.url.path)
                method = request.method
            
            # Convert PHI fields to JSON
            phi_fields_json = None
            if phi_fields_accessed:
                phi_fields_json = json.dumps(phi_fields_accessed)
            
            # Create audit log entry
            audit_entry = AuditLog(
                user_id=user_id,
                username=username,
                user_ip=user_ip,
                user_agent=user_agent,
                action_type=action_type.upper(),
                resource_type=resource_type.lower(),
                resource_id=resource_id,
                patient_id=patient_id,
                phi_fields_accessed=phi_fields_json,
                description=description,
                success=success,
                error_message=error_message,
                endpoint=endpoint,
                method=method
            )
            
            db.add(audit_entry)
            db.commit()
            
            # Also log to structured file logs
            log_data = {
                "user_id": user_id,
                "username": username,
                "user_ip": user_ip,
                "action_type": action_type.upper(),
                "resource_type": resource_type.lower(),
                "resource_id": resource_id,
                "patient_id": patient_id,
                "phi_fields_accessed": phi_fields_accessed,
                "description": description,
                "success": success,
                "endpoint": endpoint,
                "method": method
            }
            
            if success:
                audit_logger.info(f"AUDIT: {json.dumps(log_data)}")
            else:
                audit_logger.error(f"AUDIT_FAILURE: {json.dumps(log_data)}")
                
        except Exception as e:
            # Critical: Audit logging failure must be logged
            audit_logger.critical(f"AUDIT_LOG_FAILURE: Failed to log audit event: {str(e)}")
    
    @staticmethod
    def log_phi_access(
        db: Session,
        user_id: int,
        username: str,
        patient_id: int,
        phi_fields: List[str],
        action_type: str = "READ",
        description: str = "PHI access",
        request: Optional[Request] = None
    ):
        """
        Specifically log PHI access events
        """
        HIPAAAuditLogger.log_action(
            db=db,
            user_id=user_id,
            username=username,
            action_type=action_type,
            resource_type="phi",
            description=f"{description} - Patient ID: {patient_id}",
            patient_id=patient_id,
            phi_fields_accessed=phi_fields,
            request=request
        )
    
    @staticmethod
    def log_login_attempt(
        db: Session,
        username: str,
        ip_address: str,
        user_agent: Optional[str],
        success: bool,
        failure_reason: Optional[str] = None
    ):
        """
        Log login attempts for security monitoring
        """
        try:
            login_attempt = LoginAttempt(
                username=username,
                ip_address=ip_address,
                user_agent=user_agent,
                success=success,
                failure_reason=failure_reason
            )
            
            db.add(login_attempt)
            db.commit()
            
            # Also log to audit system
            HIPAAAuditLogger.log_action(
                db=db,
                user_id=None,
                username=username,
                action_type="LOGIN" if success else "LOGIN_FAILED",
                resource_type="auth",
                description=f"Login attempt from {ip_address}",
                success=success,
                error_message=failure_reason
            )
            
        except Exception as e:
            audit_logger.critical(f"LOGIN_AUDIT_FAILURE: {str(e)}")
    
    @staticmethod
    def log_password_change(
        db: Session,
        user_id: int,
        username: str,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """
        Log password change events for security monitoring
        """
        try:
            HIPAAAuditLogger.log_action(
                db=db,
                user_id=user_id,
                username=username,
                action_type="PASSWORD_CHANGE",
                resource_type="user",
                resource_id=user_id,
                description=f"Password change for user {username}",
                success=success,
                error_message=error_message
            )
            
        except Exception as e:
            audit_logger.critical(f"PASSWORD_CHANGE_AUDIT_FAILURE: {str(e)}")

# Helper function to get PHI field names from patient data
def get_phi_fields(patient_data: Dict[str, Any]) -> List[str]:
    """
    Identify PHI fields in patient data for audit logging
    """
    phi_fields = []
    phi_field_names = [
        'first_name', 'last_name', 'date_of_birth', 'phone_number', 
        'email', 'address', 'city', 'state', 'zip_code'
    ]
    
    for field in phi_field_names:
        if field in patient_data and patient_data[field] is not None:
            phi_fields.append(field)
    
    return phi_fields