"""
Multi-Factor Authentication (MFA) implementation with TOTP
"""
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from app.db.database import Base
from app.db.models import User
from app.utils.logging import logger

class MFASecret(Base):
    """MFA secrets storage"""
    __tablename__ = "mfa_secrets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    secret_key = Column(String, nullable=False)  # Encrypted TOTP secret
    backup_codes = Column(String, nullable=True)  # JSON array of backup codes
    is_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)

class MFAManager:
    """MFA Manager for TOTP operations"""
    
    @staticmethod
    def generate_secret(username: str) -> str:
        """Generate a new TOTP secret for a user"""
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(username: str, secret: str, issuer: str = "Scribsy") -> str:
        """Generate QR code for TOTP setup"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=username,
            issuer_name=issuer
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64 string
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    @staticmethod
    def verify_totp(secret: str, token: str) -> bool:
        """Verify TOTP token"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)  # Allow 1 window tolerance
    
    @staticmethod
    def generate_backup_codes(count: int = 10) -> list[str]:
        """Generate backup codes for MFA recovery"""
        import secrets
        return [secrets.token_hex(4).upper() for _ in range(count)]
    
    @staticmethod
    async def setup_mfa(db: Session, user: User) -> Dict[str, Any]:
        """Setup MFA for a user"""
        try:
            # Generate secret and backup codes
            secret = MFAManager.generate_secret(user.username)
            backup_codes = MFAManager.generate_backup_codes()
            qr_code = MFAManager.generate_qr_code(user.username, secret)
            
            # Store encrypted secret and backup codes
            encrypted_secret = MFAManager._encrypt_secret(secret)
            backup_codes_json = ','.join(backup_codes)
            
            # Check if MFA already exists for user
            existing_mfa = db.query(MFASecret).filter(MFASecret.user_id == user.id).first()
            
            if existing_mfa:
                # Update existing
                existing_mfa.secret_key = encrypted_secret
                existing_mfa.backup_codes = backup_codes_json
                existing_mfa.is_enabled = False
            else:
                # Create new
                mfa_secret = MFASecret(
                    user_id=user.id,
                    secret_key=encrypted_secret,
                    backup_codes=backup_codes_json,
                    is_enabled=False
                )
                db.add(mfa_secret)
            
            db.commit()
            
            return {
                "secret": secret,
                "qr_code": qr_code,
                "backup_codes": backup_codes,
                "setup_url": f"otpauth://totp/Scribsy:{user.username}?secret={secret}&issuer=Scribsy"
            }
            
        except Exception as e:
            logger.error(f"Failed to setup MFA for user {user.id}: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    async def verify_mfa_setup(db: Session, user: User, token: str) -> bool:
        """Verify MFA setup with TOTP token"""
        try:
            mfa_secret = db.query(MFASecret).filter(MFASecret.user_id == user.id).first()
            if not mfa_secret:
                return False
            
            secret = MFAManager._decrypt_secret(mfa_secret.secret_key)
            is_valid = MFAManager.verify_totp(secret, token)
            
            if is_valid:
                mfa_secret.is_enabled = True
                mfa_secret.last_used = datetime.utcnow()
                db.commit()
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to verify MFA setup for user {user.id}: {str(e)}")
            return False
    
    @staticmethod
    async def verify_mfa_token(db: Session, user: User, token: str, backup_code: Optional[str] = None) -> bool:
        """Verify MFA token or backup code"""
        try:
            mfa_secret = db.query(MFASecret).filter(MFASecret.user_id == user.id).first()
            if not mfa_secret or not mfa_secret.is_enabled:
                return False
            
            # Check backup code first if provided
            if backup_code:
                backup_codes = mfa_secret.backup_codes.split(',') if mfa_secret.backup_codes else []
                if backup_code in backup_codes:
                    # Remove used backup code
                    backup_codes.remove(backup_code)
                    mfa_secret.backup_codes = ','.join(backup_codes)
                    mfa_secret.last_used = datetime.utcnow()
                    db.commit()
                    return True
                return False
            
            # Verify TOTP token
            secret = MFAManager._decrypt_secret(mfa_secret.secret_key)
            is_valid = MFAManager.verify_totp(secret, token)
            
            if is_valid:
                mfa_secret.last_used = datetime.utcnow()
                db.commit()
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to verify MFA token for user {user.id}: {str(e)}")
            return False
    
    @staticmethod
    async def disable_mfa(db: Session, user: User) -> bool:
        """Disable MFA for a user"""
        try:
            mfa_secret = db.query(MFASecret).filter(MFASecret.user_id == user.id).first()
            if mfa_secret:
                mfa_secret.is_enabled = False
                db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to disable MFA for user {user.id}: {str(e)}")
            return False
    
    @staticmethod
    def is_mfa_enabled(db: Session, user: User) -> bool:
        """Check if MFA is enabled for a user"""
        mfa_secret = db.query(MFASecret).filter(MFASecret.user_id == user.id).first()
        return mfa_secret.is_enabled if mfa_secret else False
    
    @staticmethod
    def _encrypt_secret(secret: str) -> str:
        """Encrypt TOTP secret (simplified - in production use proper encryption)"""
        # TODO: Implement proper encryption using a key management service
        # For now, using base64 encoding (NOT SECURE FOR PRODUCTION)
        return base64.b64encode(secret.encode()).decode()
    
    @staticmethod
    def _decrypt_secret(encrypted_secret: str) -> str:
        """Decrypt TOTP secret (simplified - in production use proper decryption)"""
        # TODO: Implement proper decryption using a key management service
        # For now, using base64 decoding (NOT SECURE FOR PRODUCTION)
        return base64.b64decode(encrypted_secret.encode()).decode()

# Email-based MFA (alternative to TOTP)
class EmailMFA:
    """Email-based MFA implementation"""
    
    @staticmethod
    async def send_verification_code(user: User, code: str) -> bool:
        """Send verification code via email"""
        # TODO: Implement actual email sending
        # For now, just log the code (NOT SECURE FOR PRODUCTION)
        logger.info(f"Email MFA code for {user.email}: {code}")
        return True
    
    @staticmethod
    def generate_email_code() -> str:
        """Generate 6-digit email verification code"""
        import random
        return str(random.randint(100000, 999999))
