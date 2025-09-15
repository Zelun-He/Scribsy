"""
Tenant isolation service for multi-tenant data security
"""
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session, Query
from sqlalchemy import and_, or_
from app.db import models
from app.utils.logging import logger
from app.security.audit import AuditManager, AuditAction, AuditSeverity


class TenantIsolationService:
    """Service for enforcing tenant isolation and data segregation"""
    
    @staticmethod
    def get_user_tenant_id(user: models.User) -> str:
        """Get the tenant ID for a user"""
        return user.tenant_id or "default"
    
    @staticmethod
    def apply_tenant_filter(query: Query, model_class, tenant_id: str) -> Query:
        """Apply tenant isolation filter to a query"""
        if hasattr(model_class, 'tenant_id'):
            return query.filter(model_class.tenant_id == tenant_id)
        return query
    
    @staticmethod
    def get_tenant_notes(
        db: Session, 
        tenant_id: str, 
        user_id: Optional[int] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[models.Note]:
        """Get notes for a specific tenant with optional user filter"""
        query = db.query(models.Note).filter(models.Note.tenant_id == tenant_id)
        
        if user_id:
            query = query.filter(models.Note.provider_id == user_id)
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def get_tenant_patients(
        db: Session, 
        tenant_id: str, 
        user_id: Optional[int] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[models.Patient]:
        """Get patients for a specific tenant with optional user filter"""
        query = db.query(models.Patient).filter(models.Patient.tenant_id == tenant_id)
        
        if user_id:
            query = query.filter(models.Patient.user_id == user_id)
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def get_tenant_users(
        db: Session, 
        tenant_id: str,
        skip: int = 0, 
        limit: int = 100
    ) -> List[models.User]:
        """Get users for a specific tenant"""
        return db.query(models.User).filter(
            models.User.tenant_id == tenant_id
        ).offset(skip).limit(limit).all()
    
    @staticmethod
    def create_note_with_tenant(
        db: Session,
        note_data: Dict[str, Any],
        tenant_id: str,
        user_id: int
    ) -> models.Note:
        """Create a note with proper tenant isolation"""
        # Ensure tenant_id is set
        note_data['tenant_id'] = tenant_id
        note_data['provider_id'] = user_id
        
        # Verify patient belongs to same tenant
        if 'patient_id' in note_data:
            patient = db.query(models.Patient).filter(
                models.Patient.id == note_data['patient_id'],
                models.Patient.tenant_id == tenant_id
            ).first()
            
            if not patient:
                raise ValueError("Patient not found or not accessible in this tenant")
        
        # Create the note
        note = models.Note(**note_data)
        db.add(note)
        db.commit()
        db.refresh(note)
        
        # Log the creation
        AuditManager.log_action(
            db=db,
            user_id=user_id,
            action=AuditAction.NOTE_CREATE.value,
            resource_type="note",
            resource_id=note.id,
            severity=AuditSeverity.MEDIUM.value,
            details={
                "tenant_id": tenant_id,
                "note_type": note.note_type,
                "patient_id": note.patient_id
            }
        )
        
        return note
    
    @staticmethod
    def create_patient_with_tenant(
        db: Session,
        patient_data: Dict[str, Any],
        tenant_id: str,
        user_id: int
    ) -> models.Patient:
        """Create a patient with proper tenant isolation"""
        # Ensure tenant_id is set
        patient_data['tenant_id'] = tenant_id
        patient_data['user_id'] = user_id
        
        # Create the patient
        patient = models.Patient(**patient_data)
        db.add(patient)
        db.commit()
        db.refresh(patient)
        
        # Log the creation
        AuditManager.log_action(
            db=db,
            user_id=user_id,
            action=AuditAction.PATIENT_CREATE.value,
            resource_type="patient",
            resource_id=patient.id,
            severity=AuditSeverity.MEDIUM.value,
            details={
                "tenant_id": tenant_id,
                "patient_name": f"{patient.first_name} {patient.last_name}"
            }
        )
        
        return patient
    
    @staticmethod
    def verify_tenant_access(
        db: Session,
        user: models.User,
        resource_type: str,
        resource_id: int
    ) -> bool:
        """Verify that a user has access to a resource within their tenant"""
        tenant_id = TenantIsolationService.get_user_tenant_id(user)
        
        try:
            if resource_type == "note":
                note = db.query(models.Note).filter(
                    models.Note.id == resource_id,
                    models.Note.tenant_id == tenant_id,
                    models.Note.provider_id == user.id
                ).first()
                return note is not None
                
            elif resource_type == "patient":
                patient = db.query(models.Patient).filter(
                    models.Patient.id == resource_id,
                    models.Patient.tenant_id == tenant_id,
                    models.Patient.user_id == user.id
                ).first()
                return patient is not None
                
            elif resource_type == "user":
                target_user = db.query(models.User).filter(
                    models.User.id == resource_id,
                    models.User.tenant_id == tenant_id
                ).first()
                return target_user is not None
                
            else:
                logger.warning(f"Unknown resource type for tenant access check: {resource_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error verifying tenant access: {str(e)}")
            return False
    
    @staticmethod
    def get_tenant_statistics(db: Session, tenant_id: str) -> Dict[str, Any]:
        """Get statistics for a specific tenant"""
        try:
            # Count resources by tenant
            user_count = db.query(models.User).filter(models.User.tenant_id == tenant_id).count()
            patient_count = db.query(models.Patient).filter(models.Patient.tenant_id == tenant_id).count()
            note_count = db.query(models.Note).filter(models.Note.tenant_id == tenant_id).count()
            
            # Count active users (logged in within last 30 days)
            from datetime import datetime, timedelta, timezone
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            active_user_count = db.query(models.User).filter(
                models.User.tenant_id == tenant_id,
                models.User.last_login >= thirty_days_ago
            ).count()
            
            return {
                "tenant_id": tenant_id,
                "user_count": user_count,
                "patient_count": patient_count,
                "note_count": note_count,
                "active_user_count": active_user_count
            }
            
        except Exception as e:
            logger.error(f"Error getting tenant statistics: {str(e)}")
            return {
                "tenant_id": tenant_id,
                "user_count": 0,
                "patient_count": 0,
                "note_count": 0,
                "active_user_count": 0
            }
    
    @staticmethod
    def migrate_user_to_tenant(
        db: Session,
        user_id: int,
        new_tenant_id: str,
        admin_user_id: int
    ) -> bool:
        """Migrate a user and their data to a new tenant (Admin only)"""
        try:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                return False
            
            old_tenant_id = user.tenant_id
            
            # Update user's tenant
            user.tenant_id = new_tenant_id
            
            # Update all user's notes to new tenant
            db.query(models.Note).filter(
                models.Note.provider_id == user_id,
                models.Note.tenant_id == old_tenant_id
            ).update({"tenant_id": new_tenant_id})
            
            # Update all user's patients to new tenant
            db.query(models.Patient).filter(
                models.Patient.user_id == user_id,
                models.Patient.tenant_id == old_tenant_id
            ).update({"tenant_id": new_tenant_id})
            
            db.commit()
            
            # Log the migration
            AuditManager.log_action(
                db=db,
                user_id=admin_user_id,
                action="tenant_migration",
                resource_type="user",
                resource_id=user_id,
                severity=AuditSeverity.HIGH.value,
                details={
                    "migrated_user": user.username,
                    "old_tenant_id": old_tenant_id,
                    "new_tenant_id": new_tenant_id
                }
            )
            
            logger.info(f"Migrated user {user.username} from tenant {old_tenant_id} to {new_tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error migrating user to tenant: {str(e)}")
            db.rollback()
            return False
    
    @staticmethod
    def get_tenant_list(db: Session, admin_user_id: int) -> List[str]:
        """Get list of all tenants (Admin only)"""
        try:
            # Verify admin user exists and is admin
            admin_user = db.query(models.User).filter(
                models.User.id == admin_user_id,
                models.User.is_admin == 1
            ).first()
            
            if not admin_user:
                return []
            
            # Get unique tenant IDs
            tenants = db.query(models.User.tenant_id).distinct().all()
            return [tenant[0] for tenant in tenants if tenant[0]]
            
        except Exception as e:
            logger.error(f"Error getting tenant list: {str(e)}")
            return []
