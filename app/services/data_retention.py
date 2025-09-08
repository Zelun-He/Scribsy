"""
HIPAA-compliant Data Retention and Deletion Service
Handles automated data lifecycle management according to HIPAA requirements
"""
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import logging
import pytz

from app.db.models import Patient, Note, User
from app.audit.models import AuditLog, DataRetentionPolicy
from app.audit.logger import HIPAAAuditLogger
from app.db.database import get_db

logger = logging.getLogger("data_retention")

class HIPAADataRetentionService:
    """
    HIPAA-compliant data retention and deletion service
    
    HIPAA requirements:
    - Medical records must be retained for minimum 6 years from date of creation or last update
    - Some states require longer retention periods
    - Audit logs must be retained for 6 years minimum
    - Data must be securely deleted after retention period
    """
    
    # HIPAA retention periods (in days)
    DEFAULT_RETENTION_DAYS = 2555  # 7 years (conservative approach)
    AUDIT_LOG_RETENTION_DAYS = 2555  # 7 years for audit logs
    MINIMUM_RETENTION_DAYS = 2190  # 6 years minimum
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_retention_policy(
        self,
        resource_type: str,
        resource_id: int,
        retention_period_days: Optional[int] = None,
        deletion_reason: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> DataRetentionPolicy:
        """Create a data retention policy for a specific resource"""
        
        if retention_period_days is None:
            retention_period_days = self.DEFAULT_RETENTION_DAYS
        
        # Ensure minimum retention period
        if retention_period_days < self.MINIMUM_RETENTION_DAYS:
            retention_period_days = self.MINIMUM_RETENTION_DAYS
        
        # Calculate deletion date
        deletion_scheduled_at = datetime.now(pytz.UTC) + timedelta(days=retention_period_days)
        
        policy = DataRetentionPolicy(
            resource_type=resource_type,
            resource_id=resource_id,
            retention_period_days=retention_period_days,
            deletion_scheduled_at=deletion_scheduled_at,
            deletion_reason=deletion_reason or "Standard retention period expired"
        )
        
        self.db.add(policy)
        self.db.commit()
        
        # Log retention policy creation
        if user_id:
            user = self.db.query(User).filter(User.id == user_id).first()
            if user:
                HIPAAAuditLogger.log_action(
                    db=self.db,
                    user_id=user_id,
                    username=user.username,
                    action_type="CREATE",
                    resource_type="data_retention_policy",
                    resource_id=policy.id,
                    description=f"Created retention policy for {resource_type} {resource_id} - {retention_period_days} days"
                )
        
        return policy
    
    def get_resources_due_for_deletion(self, resource_type: Optional[str] = None) -> List[DataRetentionPolicy]:
        """Get all resources that are due for deletion"""
        current_time = datetime.now(pytz.UTC)
        
        query = self.db.query(DataRetentionPolicy).filter(
            and_(
                DataRetentionPolicy.deletion_scheduled_at <= current_time,
                DataRetentionPolicy.deletion_completed_at.is_(None)
            )
        )
        
        if resource_type:
            query = query.filter(DataRetentionPolicy.resource_type == resource_type)
        
        return query.all()
    
    def securely_delete_patient(self, patient_id: int, user_id: int, reason: str = "Retention period expired") -> bool:
        """Securely delete a patient and all associated data"""
        try:
            patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
            if not patient:
                logger.warning(f"Patient {patient_id} not found for deletion")
                return False
            
            user = self.db.query(User).filter(User.id == user_id).first()
            username = user.username if user else "system"
            
            # Log patient data before deletion for audit trail
            patient_data = {
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'date_of_birth': str(patient.date_of_birth),
                'email': patient.email,
                'phone_number': patient.phone_number
            }
            
            # Delete associated notes first
            notes = self.db.query(Note).filter(Note.patient_id == patient_id).all()
            for note in notes:
                HIPAAAuditLogger.log_action(
                    db=self.db,
                    user_id=user_id,
                    username=username,
                    action_type="DELETE",
                    resource_type="note",
                    resource_id=note.id,
                    patient_id=patient_id,
                    description=f"Automated deletion of note {note.id} - {reason}",
                    phi_fields_accessed=["content", "note_type"]
                )
                self.db.delete(note)
            
            # Log patient deletion
            HIPAAAuditLogger.log_action(
                db=self.db,
                user_id=user_id,
                username=username,
                action_type="DELETE",
                resource_type="patient",
                resource_id=patient_id,
                patient_id=patient_id,
                description=f"Automated deletion of patient {patient_id} - {reason}",
                phi_fields_accessed=list(patient_data.keys())
            )
            
            # Delete the patient
            self.db.delete(patient)
            
            # Update retention policy
            policy = self.db.query(DataRetentionPolicy).filter(
                and_(
                    DataRetentionPolicy.resource_type == "patient",
                    DataRetentionPolicy.resource_id == patient_id
                )
            ).first()
            
            if policy:
                policy.deletion_completed_at = datetime.now(pytz.UTC)
                policy.deletion_reason = reason
            
            self.db.commit()
            logger.info(f"Successfully deleted patient {patient_id}: {reason}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete patient {patient_id}: {str(e)}")
            self.db.rollback()
            return False
    
    def securely_delete_note(self, note_id: int, user_id: int, reason: str = "Retention period expired") -> bool:
        """Securely delete a note"""
        try:
            note = self.db.query(Note).filter(Note.id == note_id).first()
            if not note:
                logger.warning(f"Note {note_id} not found for deletion")
                return False
            
            user = self.db.query(User).filter(User.id == user_id).first()
            username = user.username if user else "system"
            
            # Log note deletion
            HIPAAAuditLogger.log_action(
                db=self.db,
                user_id=user_id,
                username=username,
                action_type="DELETE",
                resource_type="note",
                resource_id=note_id,
                patient_id=note.patient_id,
                description=f"Automated deletion of note {note_id} - {reason}",
                phi_fields_accessed=["content", "note_type"]
            )
            
            # Delete the note
            self.db.delete(note)
            
            # Update retention policy
            policy = self.db.query(DataRetentionPolicy).filter(
                and_(
                    DataRetentionPolicy.resource_type == "note",
                    DataRetentionPolicy.resource_id == note_id
                )
            ).first()
            
            if policy:
                policy.deletion_completed_at = datetime.now(pytz.UTC)
                policy.deletion_reason = reason
            
            self.db.commit()
            logger.info(f"Successfully deleted note {note_id}: {reason}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete note {note_id}: {str(e)}")
            self.db.rollback()
            return False
    
    def cleanup_old_audit_logs(self, user_id: int) -> int:
        """Clean up audit logs older than retention period"""
        try:
            cutoff_date = datetime.now(pytz.UTC) - timedelta(days=self.AUDIT_LOG_RETENTION_DAYS)
            
            # Get old audit logs
            old_logs = self.db.query(AuditLog).filter(
                AuditLog.created_at < cutoff_date
            ).all()
            
            count = len(old_logs)
            
            if count > 0:
                user = self.db.query(User).filter(User.id == user_id).first()
                username = user.username if user else "system"
                
                # Log the cleanup operation
                HIPAAAuditLogger.log_action(
                    db=self.db,
                    user_id=user_id,
                    username=username,
                    action_type="DELETE",
                    resource_type="audit_log",
                    description=f"Automated cleanup of {count} old audit logs (older than {self.AUDIT_LOG_RETENTION_DAYS} days)"
                )
                
                # Delete old logs
                for log in old_logs:
                    self.db.delete(log)
                
                self.db.commit()
                logger.info(f"Cleaned up {count} old audit logs")
            
            return count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old audit logs: {str(e)}")
            self.db.rollback()
            return 0
    
    def run_retention_cleanup(self, user_id: int) -> dict:
        """Run the complete data retention cleanup process"""
        results = {
            "patients_deleted": 0,
            "notes_deleted": 0,
            "audit_logs_cleaned": 0,
            "errors": []
        }
        
        try:
            # Get resources due for deletion
            due_policies = self.get_resources_due_for_deletion()
            
            for policy in due_policies:
                try:
                    if policy.resource_type == "patient":
                        if self.securely_delete_patient(policy.resource_id, user_id, policy.deletion_reason):
                            results["patients_deleted"] += 1
                        else:
                            results["errors"].append(f"Failed to delete patient {policy.resource_id}")
                    
                    elif policy.resource_type == "note":
                        if self.securely_delete_note(policy.resource_id, user_id, policy.deletion_reason):
                            results["notes_deleted"] += 1
                        else:
                            results["errors"].append(f"Failed to delete note {policy.resource_id}")
                
                except Exception as e:
                    error_msg = f"Error processing {policy.resource_type} {policy.resource_id}: {str(e)}"
                    results["errors"].append(error_msg)
                    logger.error(error_msg)
            
            # Cleanup old audit logs
            results["audit_logs_cleaned"] = self.cleanup_old_audit_logs(user_id)
            
        except Exception as e:
            error_msg = f"Error during retention cleanup: {str(e)}"
            results["errors"].append(error_msg)
            logger.error(error_msg)
        
        return results

def get_retention_service(db: Session = None) -> HIPAADataRetentionService:
    """Get a data retention service instance"""
    if db is None:
        db = next(get_db())
    return HIPAADataRetentionService(db)