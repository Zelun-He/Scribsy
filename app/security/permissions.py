"""
HIPAA-compliant Role-Based Access Control (RBAC) system
Ensures proper authorization for PHI access
"""
from enum import Enum
from typing import Dict, List, Set
from fastapi import HTTPException, status
from app.db.models import User

class Role(str, Enum):
    """User roles for HIPAA compliance"""
    PROVIDER = "provider"      # Full access to assigned patients
    ADMIN = "admin"           # Full system access + user management
    AUDITOR = "auditor"       # Read-only access to audit logs and reports
    READ_ONLY = "read_only"   # Read-only access to patient data

class Permission(str, Enum):
    """Granular permissions for system resources"""
    # Patient permissions
    CREATE_PATIENT = "create_patient"
    READ_PATIENT = "read_patient"
    UPDATE_PATIENT = "update_patient"
    DELETE_PATIENT = "delete_patient"
    
    # Note permissions
    CREATE_NOTE = "create_note"
    READ_NOTE = "read_note"
    UPDATE_NOTE = "update_note"
    DELETE_NOTE = "delete_note"
    
    # User management permissions
    CREATE_USER = "create_user"
    READ_USER = "read_user"
    UPDATE_USER = "update_user"
    DELETE_USER = "delete_user"
    
    # Audit permissions
    READ_AUDIT_LOG = "read_audit_log"
    EXPORT_AUDIT_LOG = "export_audit_log"
    
    # System administration
    MANAGE_SYSTEM = "manage_system"
    ACCESS_REPORTS = "access_reports"

# Role-Permission mapping for RBAC
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.PROVIDER: {
        Permission.CREATE_PATIENT,
        Permission.READ_PATIENT,
        Permission.UPDATE_PATIENT,
        Permission.CREATE_NOTE,
        Permission.READ_NOTE,
        Permission.UPDATE_NOTE,
        Permission.DELETE_NOTE,
    },
    Role.ADMIN: {
        # All provider permissions plus admin-specific ones
        Permission.CREATE_PATIENT,
        Permission.READ_PATIENT,
        Permission.UPDATE_PATIENT,
        Permission.DELETE_PATIENT,
        Permission.CREATE_NOTE,
        Permission.READ_NOTE,
        Permission.UPDATE_NOTE,
        Permission.DELETE_NOTE,
        Permission.CREATE_USER,
        Permission.READ_USER,
        Permission.UPDATE_USER,
        Permission.DELETE_USER,
        Permission.READ_AUDIT_LOG,
        Permission.EXPORT_AUDIT_LOG,
        Permission.MANAGE_SYSTEM,
        Permission.ACCESS_REPORTS,
    },
    Role.AUDITOR: {
        Permission.READ_PATIENT,  # Limited patient access for auditing
        Permission.READ_NOTE,     # Limited note access for auditing
        Permission.READ_AUDIT_LOG,
        Permission.EXPORT_AUDIT_LOG,
        Permission.ACCESS_REPORTS,
    },
    Role.READ_ONLY: {
        Permission.READ_PATIENT,
        Permission.READ_NOTE,
    }
}

def has_permission(user: User, permission: Permission) -> bool:
    """Check if user has a specific permission"""
    if not user.is_active:
        return False
    
    user_role = Role(user.role)
    return permission in ROLE_PERMISSIONS.get(user_role, set())

def require_permission(permission: Permission):
    """Decorator to require specific permission for endpoint access"""
    def decorator(func):
        def wrapper(current_user: User = None, *args, **kwargs):
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not has_permission(current_user, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required: {permission.value}"
                )
            
            return func(current_user=current_user, *args, **kwargs)
        return wrapper
    return decorator

def require_role(allowed_roles: List[Role]):
    """Decorator to require specific roles for endpoint access"""
    def decorator(func):
        def wrapper(current_user: User = None, *args, **kwargs):
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not current_user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is inactive"
                )
            
            user_role = Role(current_user.role)
            if user_role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
                )
            
            return func(current_user=current_user, *args, **kwargs)
        return wrapper
    return decorator

def can_access_patient(user: User, patient_id: int, patient_user_id: int) -> bool:
    """Check if user can access a specific patient's data"""
    if not user.is_active:
        return False
    
    user_role = Role(user.role)
    
    # Admins and auditors can access any patient
    if user_role in [Role.ADMIN, Role.AUDITOR]:
        return True
    
    # Providers and read-only users can only access their own patients
    if user_role in [Role.PROVIDER, Role.READ_ONLY]:
        return user.id == patient_user_id
    
    return False

def can_modify_user(current_user: User, target_user: User) -> bool:
    """Check if current user can modify target user"""
    if not current_user.is_active:
        return False
    
    current_role = Role(current_user.role)
    target_role = Role(target_user.role)
    
    # Only admins can modify users
    if current_role != Role.ADMIN:
        return False
    
    # Users can modify themselves (except role changes)
    if current_user.id == target_user.id:
        return True
    
    # Admins can modify non-admin users
    if target_role != Role.ADMIN:
        return True
    
    return False

# HIPAA-specific validation functions
def validate_minimum_necessary(user: User, requested_fields: List[str], patient_id: int = None) -> List[str]:
    """
    Implement HIPAA minimum necessary standard
    Returns the fields the user is actually allowed to access
    """
    user_role = Role(user.role)
    
    # Define field access levels
    full_phi_fields = [
        "first_name", "last_name", "date_of_birth", "phone_number", 
        "email", "address", "city", "state", "zip_code"
    ]
    
    limited_phi_fields = [
        "first_name", "last_name", "date_of_birth"
    ]
    
    clinical_fields = [
        "notes", "diagnoses", "medications", "allergies", "procedures"
    ]
    
    # Role-based field access
    if user_role == Role.ADMIN:
        return requested_fields  # Admins get all requested fields
    
    elif user_role == Role.PROVIDER:
        return requested_fields  # Providers get all fields for their patients
    
    elif user_role == Role.AUDITOR:
        # Auditors get limited access for compliance purposes
        allowed_fields = []
        for field in requested_fields:
            if field in limited_phi_fields or field in ["id", "created_at", "updated_at"]:
                allowed_fields.append(field)
        return allowed_fields
    
    elif user_role == Role.READ_ONLY:
        # Read-only users get clinical data but limited PHI
        allowed_fields = []
        for field in requested_fields:
            if field in clinical_fields or field in limited_phi_fields:
                allowed_fields.append(field)
        return allowed_fields
    
    return []  # No access by default