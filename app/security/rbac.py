"""
Role-Based Access Control (RBAC) implementation with least privilege
"""
from enum import Enum
from typing import List, Dict, Set, Optional
from functools import wraps
from fastapi import HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.api.endpoints.auth import get_current_user

class Role(Enum):
    """User roles with least privilege principle"""
    CLINICIAN = "clinician"      # Full access to own patients and notes
    SCRIBE = "scribe"           # Can create/edit notes, limited patient access
    READ_ONLY = "read_only"     # View-only access
    ADMIN = "admin"             # System administration

class Permission(Enum):
    """Granular permissions"""
    # Note permissions
    NOTE_CREATE = "note:create"
    NOTE_READ = "note:read"
    NOTE_UPDATE = "note:update"
    NOTE_DELETE = "note:delete"
    NOTE_SIGN = "note:sign"
    
    # Patient permissions
    PATIENT_CREATE = "patient:create"
    PATIENT_READ = "patient:read"
    PATIENT_UPDATE = "patient:update"
    PATIENT_DELETE = "patient:delete"
    
    # Appointment permissions
    APPOINTMENT_CREATE = "appointment:create"
    APPOINTMENT_READ = "appointment:read"
    APPOINTMENT_UPDATE = "appointment:update"
    APPOINTMENT_DELETE = "appointment:delete"
    
    # System permissions
    USER_MANAGE = "user:manage"
    SYSTEM_CONFIG = "system:config"
    AUDIT_READ = "audit:read"
    EXPORT_DATA = "export:data"

# Role-Permission mapping with least privilege
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.CLINICIAN: {
        # Full access to clinical data
        Permission.NOTE_CREATE, Permission.NOTE_READ, Permission.NOTE_UPDATE, 
        Permission.NOTE_DELETE, Permission.NOTE_SIGN,
        Permission.PATIENT_CREATE, Permission.PATIENT_READ, Permission.PATIENT_UPDATE, 
        Permission.PATIENT_DELETE,
        Permission.APPOINTMENT_CREATE, Permission.APPOINTMENT_READ, 
        Permission.APPOINTMENT_UPDATE, Permission.APPOINTMENT_DELETE,
        Permission.EXPORT_DATA
    },
    Role.SCRIBE: {
        # Limited clinical access
        Permission.NOTE_CREATE, Permission.NOTE_READ, Permission.NOTE_UPDATE,
        Permission.PATIENT_READ,  # Can view but not modify patient data
        Permission.APPOINTMENT_READ,  # Can view appointments
        Permission.EXPORT_DATA
    },
    Role.READ_ONLY: {
        # View-only access
        Permission.NOTE_READ,
        Permission.PATIENT_READ,
        Permission.APPOINTMENT_READ
    },
    Role.ADMIN: {
        # System administration
        Permission.USER_MANAGE,
        Permission.SYSTEM_CONFIG,
        Permission.AUDIT_READ,
        # Admin inherits all other permissions
        Permission.NOTE_CREATE, Permission.NOTE_READ, Permission.NOTE_UPDATE, 
        Permission.NOTE_DELETE, Permission.NOTE_SIGN,
        Permission.PATIENT_CREATE, Permission.PATIENT_READ, Permission.PATIENT_UPDATE, 
        Permission.PATIENT_DELETE,
        Permission.APPOINTMENT_CREATE, Permission.APPOINTMENT_READ, 
        Permission.APPOINTMENT_UPDATE, Permission.APPOINTMENT_DELETE,
        Permission.EXPORT_DATA
    }
}

class RBACManager:
    """RBAC Manager for permission checking"""
    
    @staticmethod
    def get_user_permissions(user: User) -> Set[Permission]:
        """Get all permissions for a user based on their role"""
        user_role = Role(user.role) if user.role else Role.READ_ONLY
        return ROLE_PERMISSIONS.get(user_role, set())
    
    @staticmethod
    def has_permission(user: User, permission: Permission) -> bool:
        """Check if user has specific permission"""
        user_permissions = RBACManager.get_user_permissions(user)
        return permission in user_permissions
    
    @staticmethod
    def require_permission(permission: Permission):
        """Decorator to require specific permission"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Extract user from kwargs or dependencies
                user = None
                for key, value in kwargs.items():
                    if isinstance(value, User):
                        user = value
                        break
                
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Authentication required"
                    )
                
                if not RBACManager.has_permission(user, permission):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Insufficient permissions. Required: {permission.value}"
                    )
                
                return await func(*args, **kwargs)
            return wrapper
        return decorator

# Dependency for permission checking
def require_permission(permission: Permission):
    """FastAPI dependency for permission checking"""
    def permission_checker(current_user: User = Depends(get_current_user)):
        if not RBACManager.has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {permission.value}"
            )
        return current_user
    return permission_checker

# Resource ownership helpers
def can_access_patient(user: User, patient_user_id: int) -> bool:
    """Check if user can access a specific patient"""
    if user.role == Role.ADMIN.value:
        return True
    return user.id == patient_user_id

def can_access_note(user: User, note_provider_id: int) -> bool:
    """Check if user can access a specific note"""
    if user.role == Role.ADMIN.value:
        return True
    return user.id == note_provider_id

# Scoped JWT claims
def get_jwt_claims(user: User) -> Dict[str, any]:
    """Generate scoped JWT claims based on user role"""
    permissions = [perm.value for perm in RBACManager.get_user_permissions(user)]
    
    claims = {
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "permissions": permissions,
        "iat": None,  # Will be set by JWT creation
        "exp": None   # Will be set by JWT creation
    }
    
    # Add role-specific claims
    if user.role == Role.CLINICIAN.value:
        claims["scope"] = "clinical:full"
    elif user.role == Role.SCRIBE.value:
        claims["scope"] = "clinical:limited"
    elif user.role == Role.READ_ONLY.value:
        claims["scope"] = "clinical:read"
    elif user.role == Role.ADMIN.value:
        claims["scope"] = "admin:full"
    
    return claims
