"""
Tenant management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.endpoints.auth import get_current_user
from app.db import models
from app.services.tenant_isolation import TenantIsolationService
from app.security.audit import AuditManager, AuditAction, AuditSeverity
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/tenant", tags=["tenant"])

@router.get("/info")
async def get_tenant_info(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get information about the current user's tenant
    """
    try:
        tenant_id = TenantIsolationService.get_user_tenant_id(current_user)
        stats = TenantIsolationService.get_tenant_statistics(db, tenant_id)
        
        return {
            "tenant_id": tenant_id,
            "user_tenant_id": current_user.tenant_id,
            "statistics": stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tenant info: {str(e)}")

@router.get("/users")
async def get_tenant_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get users within the current user's tenant
    """
    try:
        tenant_id = TenantIsolationService.get_user_tenant_id(current_user)
        users = TenantIsolationService.get_tenant_users(db, tenant_id, skip, limit)
        
        # Return safe user data (no passwords)
        user_data = []
        for user in users:
            user_data.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active,
                "is_admin": user.is_admin,
                "role": user.role,
                "last_login": user.last_login,
                "created_at": user.created_at
            })
        
        return {
            "tenant_id": tenant_id,
            "users": user_data,
            "total": len(user_data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tenant users: {str(e)}")

@router.get("/patients")
async def get_tenant_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get patients within the current user's tenant
    """
    try:
        tenant_id = TenantIsolationService.get_user_tenant_id(current_user)
        patients = TenantIsolationService.get_tenant_patients(
            db, tenant_id, current_user.id, skip, limit
        )
        
        return {
            "tenant_id": tenant_id,
            "patients": patients,
            "total": len(patients)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tenant patients: {str(e)}")

@router.get("/notes")
async def get_tenant_notes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get notes within the current user's tenant
    """
    try:
        tenant_id = TenantIsolationService.get_user_tenant_id(current_user)
        notes = TenantIsolationService.get_tenant_notes(
            db, tenant_id, current_user.id, skip, limit
        )
        
        return {
            "tenant_id": tenant_id,
            "notes": notes,
            "total": len(notes)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tenant notes: {str(e)}")

@router.post("/verify-access")
async def verify_tenant_access(
    resource_type: str = Query(..., description="Type of resource: note, patient, user"),
    resource_id: int = Query(..., description="ID of the resource"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Verify that the current user has access to a specific resource within their tenant
    """
    try:
        if resource_type not in ["note", "patient", "user"]:
            raise HTTPException(status_code=400, detail="Invalid resource type")
        
        has_access = TenantIsolationService.verify_tenant_access(
            db, current_user, resource_type, resource_id
        )
        
        return {
            "has_access": has_access,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "tenant_id": TenantIsolationService.get_user_tenant_id(current_user)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify access: {str(e)}")

@router.post("/admin/migrate-user")
async def migrate_user_to_tenant(
    user_id: int = Query(..., description="ID of user to migrate"),
    new_tenant_id: str = Query(..., description="Target tenant ID"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Migrate a user and their data to a different tenant (Admin only)
    """
    try:
        # Check admin privileges
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        # Prevent migrating to same tenant
        target_user = db.query(models.User).filter(models.User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if target_user.tenant_id == new_tenant_id:
            raise HTTPException(status_code=400, detail="User is already in the target tenant")
        
        # Perform migration
        success = TenantIsolationService.migrate_user_to_tenant(
            db, user_id, new_tenant_id, current_user.id
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to migrate user")
        
        return {
            "message": "User migrated successfully",
            "user_id": user_id,
            "new_tenant_id": new_tenant_id,
            "migrated_by": current_user.username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to migrate user: {str(e)}")

@router.get("/admin/list")
async def list_all_tenants(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get list of all tenants in the system (Admin only)
    """
    try:
        # Check admin privileges
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        tenants = TenantIsolationService.get_tenant_list(db, current_user.id)
        
        # Get statistics for each tenant
        tenant_stats = []
        for tenant_id in tenants:
            stats = TenantIsolationService.get_tenant_statistics(db, tenant_id)
            tenant_stats.append(stats)
        
        return {
            "tenants": tenant_stats,
            "total_tenants": len(tenants)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list tenants: {str(e)}")

@router.get("/admin/statistics/{tenant_id}")
async def get_admin_tenant_statistics(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get detailed statistics for a specific tenant (Admin only)
    """
    try:
        # Check admin privileges
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        stats = TenantIsolationService.get_tenant_statistics(db, tenant_id)
        
        # Log the admin access
        AuditManager.log_action(
            db=db,
            user_id=current_user.id,
            action="tenant_admin_access",
            resource_type="tenant",
            resource_id=tenant_id,
            severity=AuditSeverity.HIGH.value,
            details={
                "tenant_id": tenant_id,
                "access_type": "statistics_view"
            }
        )
        
        return {
            "tenant_id": tenant_id,
            "statistics": stats,
            "accessed_by": current_user.username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tenant statistics: {str(e)}")
