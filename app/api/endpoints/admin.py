"""
Admin endpoints for HIPAA compliance management
Only accessible by users with admin role
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from app.db.database import get_db
from app.api.endpoints.auth import get_current_user
from app.db.models import User
from app.audit.models import AuditLog, DataRetentionPolicy
from app.audit.logger import HIPAAAuditLogger
from app.services.data_retention import get_retention_service
from app.security.permissions import Role, has_permission, Permission

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin role"""
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("/audit-logs", response_model=List[Dict[str, Any]])
def get_audit_logs(
    skip: int = Query(0),
    limit: int = Query(100),
    username: str = Query(None),
    action_type: str = Query(None),
    resource_type: str = Query(None),
    patient_id: int = Query(None),
    success_only: bool = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs for compliance reporting"""
    
    query = db.query(AuditLog)
    
    # Apply filters
    if username:
        query = query.filter(AuditLog.username.ilike(f"%{username}%"))
    if action_type:
        query = query.filter(AuditLog.action_type == action_type.upper())
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type.lower())
    if patient_id:
        query = query.filter(AuditLog.patient_id == patient_id)
    if success_only is not None:
        query = query.filter(AuditLog.success == success_only)
    
    # Order by most recent first
    query = query.order_by(AuditLog.created_at.desc())
    
    # Apply pagination
    audit_logs = query.offset(skip).limit(limit).all()
    
    # Log this admin access
    HIPAAAuditLogger.log_action(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action_type="READ",
        resource_type="audit_log",
        description=f"Admin accessed audit logs - filters: username={username}, action={action_type}, resource={resource_type}"
    )
    
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "username": log.username,
            "user_ip": log.user_ip,
            "action_type": log.action_type,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "patient_id": log.patient_id,
            "phi_fields_accessed": log.phi_fields_accessed,
            "description": log.description,
            "success": log.success,
            "error_message": log.error_message,
            "endpoint": log.endpoint,
            "method": log.method,
            "created_at": log.created_at.isoformat()
        }
        for log in audit_logs
    ]

@router.get("/retention-policies", response_model=List[Dict[str, Any]])
def get_retention_policies(
    resource_type: str = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get data retention policies"""
    
    query = db.query(DataRetentionPolicy)
    
    if resource_type:
        query = query.filter(DataRetentionPolicy.resource_type == resource_type)
    
    policies = query.order_by(DataRetentionPolicy.created_at.desc()).all()
    
    # Log admin access
    HIPAAAuditLogger.log_action(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action_type="READ",
        resource_type="data_retention_policy",
        description=f"Admin accessed retention policies - filter: {resource_type or 'all'}"
    )
    
    return [
        {
            "id": policy.id,
            "resource_type": policy.resource_type,
            "resource_id": policy.resource_id,
            "retention_period_days": policy.retention_period_days,
            "deletion_scheduled_at": policy.deletion_scheduled_at.isoformat() if policy.deletion_scheduled_at else None,
            "deletion_completed_at": policy.deletion_completed_at.isoformat() if policy.deletion_completed_at else None,
            "deletion_reason": policy.deletion_reason,
            "created_at": policy.created_at.isoformat()
        }
        for policy in policies
    ]

@router.post("/retention-policy")
def create_retention_policy(
    resource_type: str,
    resource_id: int,
    retention_period_days: int = None,
    deletion_reason: str = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a data retention policy"""
    
    retention_service = get_retention_service(db)
    
    policy = retention_service.create_retention_policy(
        resource_type=resource_type,
        resource_id=resource_id,
        retention_period_days=retention_period_days,
        deletion_reason=deletion_reason,
        user_id=current_user.id
    )
    
    return {
        "message": "Retention policy created successfully",
        "policy_id": policy.id,
        "deletion_scheduled_at": policy.deletion_scheduled_at.isoformat()
    }

@router.post("/run-retention-cleanup")
def run_retention_cleanup(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Manually run data retention cleanup"""
    
    retention_service = get_retention_service(db)
    results = retention_service.run_retention_cleanup(current_user.id)
    
    # Log the cleanup operation
    HIPAAAuditLogger.log_action(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action_type="DELETE",
        resource_type="system",
        description=f"Manual retention cleanup - {results['patients_deleted']} patients, {results['notes_deleted']} notes, {results['audit_logs_cleaned']} audit logs"
    )
    
    return {
        "message": "Retention cleanup completed",
        "results": results
    }

@router.get("/compliance-report")
def get_compliance_report(
    days: int = Query(30, description="Number of days to include in report"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Generate HIPAA compliance report"""
    
    from datetime import timedelta
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Get audit log statistics
    total_actions = db.query(AuditLog).filter(AuditLog.created_at >= cutoff_date).count()
    phi_accesses = db.query(AuditLog).filter(
        AuditLog.created_at >= cutoff_date,
        AuditLog.phi_fields_accessed.isnot(None)
    ).count()
    failed_actions = db.query(AuditLog).filter(
        AuditLog.created_at >= cutoff_date,
        AuditLog.success == False
    ).count()
    login_attempts = db.query(AuditLog).filter(
        AuditLog.created_at >= cutoff_date,
        AuditLog.action_type.in_(["LOGIN", "LOGIN_FAILED"])
    ).count()
    
    # Get retention policy statistics
    active_policies = db.query(DataRetentionPolicy).filter(
        DataRetentionPolicy.deletion_completed_at.is_(None)
    ).count()
    completed_deletions = db.query(DataRetentionPolicy).filter(
        DataRetentionPolicy.deletion_completed_at >= cutoff_date
    ).count()
    
    # Log report generation
    HIPAAAuditLogger.log_action(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action_type="READ",
        resource_type="compliance_report",
        description=f"Generated compliance report for {days} days"
    )
    
    return {
        "report_period_days": days,
        "generated_at": datetime.utcnow().isoformat(),
        "audit_statistics": {
            "total_actions": total_actions,
            "phi_accesses": phi_accesses,
            "failed_actions": failed_actions,
            "login_attempts": login_attempts
        },
        "retention_statistics": {
            "active_policies": active_policies,
            "completed_deletions": completed_deletions
        },
        "compliance_status": {
            "audit_logging_active": True,
            "retention_policies_in_place": active_policies > 0,
            "secure_deletions_performed": completed_deletions > 0
        }
    }

@router.get("/users")
def get_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all users for admin management"""
    
    users = db.query(User).all()
    
    # Log admin access
    HIPAAAuditLogger.log_action(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action_type="READ",
        resource_type="user",
        description="Admin accessed user list"
    )
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": bool(user.is_active),
            "is_admin": bool(user.is_admin),
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "failed_login_attempts": user.failed_login_attempts,
            "account_locked_until": user.account_locked_until.isoformat() if user.account_locked_until else None
        }
        for user in users
    ]

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update user role (admin only)"""
    
    # Validate role
    try:
        role_enum = Role(role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role = target_user.role
    target_user.role = role_enum.value
    
    db.commit()
    
    # Log role change
    HIPAAAuditLogger.log_action(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action_type="UPDATE",
        resource_type="user",
        resource_id=user_id,
        description=f"Changed user {target_user.username} role from {old_role} to {role}"
    )
    
    return {
        "message": f"User role updated to {role}",
        "user_id": user_id,
        "old_role": old_role,
        "new_role": role
    }