from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db import schemas, models
from app.crud import notes as crud_notes
from sqlalchemy import func
from app.db.database import get_db
from app.audit.logger import HIPAAAuditLogger
from app.services.email_service import email_service
from jose import JWTError, jwt
from jwt import PyJWKClient
from datetime import datetime, timedelta
from typing import Optional
import os
import secrets
import logging
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

clerk_jwk_client: Optional[PyJWKClient] = None

SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

router = APIRouter(prefix="/auth", tags=["auth"])


class ClerkLoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None

# Utility to create JWT token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    # Add issued-at to support session timeout middleware
    to_encode.update({"exp": expire, "iat": int(now.timestamp())})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Dependency to get current user
def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Prefer Authorization header; fall back to cookie to avoid issues with stale cookies
        header_token = token
        cookie_token = request.cookies.get("auth_token")
        active_token = header_token or cookie_token
        if not active_token:
            logger.warning("No token provided in request")
            raise credentials_exception
        payload = None
        try:
            payload = jwt.decode(active_token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError:
            payload = _verify_clerk_token(active_token)

        if not payload:
            logger.warning("JWT decode failed for both local and Clerk tokens")
            raise credentials_exception

        username: str = payload.get("sub") or payload.get("username")
        if username is None:
            logger.warning("No subject/username in token payload")
            raise credentials_exception
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {str(e)}")
        raise credentials_exception
    user = crud_notes.get_user_by_username(db, username)

    # Auto-provision Clerk users when first seen.
    if user is None and _is_clerk_subject(username):
        user = _provision_clerk_user(db, payload)

    if user is None:
        logger.warning(f"User '{username}' not found after token validation")
        raise credentials_exception
    return user


def _is_clerk_subject(subject: str) -> bool:
    return bool(subject and subject.startswith("user_"))


def _verify_clerk_token(token: str) -> Optional[dict]:
    global clerk_jwk_client

    issuer = (os.getenv("CLERK_JWT_ISSUER") or os.getenv("CLERK_ISSUER") or "").strip()
    jwks_url = (os.getenv("CLERK_JWKS_URL") or "").strip()
    if not jwks_url and issuer:
        jwks_url = f"{issuer.rstrip('/')}/.well-known/jwks.json"
    if not jwks_url:
        return None

    try:
        if clerk_jwk_client is None:
            clerk_jwk_client = PyJWKClient(jwks_url)
        signing_key = clerk_jwk_client.get_signing_key_from_jwt(token)
        # Prefer issuer validation when configured, but gracefully fall back
        # without issuer check to tolerate minor config mismatches (e.g. slash).
        if issuer:
            try:
                return jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256"],
                    issuer=issuer.rstrip("/"),
                    options={"verify_aud": False},
                )
            except Exception:
                return jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256"],
                    options={"verify_aud": False},
                )
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
    except Exception as error:
        logger.warning(f"Clerk token verification failed: {error}")
        return None


def _provision_clerk_user(db: Session, payload: dict) -> Optional[models.User]:
    clerk_subject = payload.get("sub")
    if not clerk_subject:
        return None

    email = payload.get("email") or f"{clerk_subject}@clerk.local"
    username = payload.get("preferred_username") or clerk_subject

    existing_email = db.query(models.User).filter(func.lower(models.User.email) == email.lower()).first()
    if existing_email:
        return existing_email

    hashed_password = crud_notes.get_password_hash(secrets.token_urlsafe(32))
    new_user = models.User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        tenant_id="default",
        is_active=1,
        is_admin=0,
        role="provider",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info(f"Auto-provisioned Clerk user: {username}")
    return new_user

# POST /auth/register - Register a new user.
# No authentication required.
# Request body: UserCreate schema (username, password, email)
# Returns: UserRead schema
@router.post("/register", response_model=schemas.UserRead)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Normalize/validate username format
    user.username = user.username.strip()
    if len(user.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long")
    if len(user.username) > 50:
        raise HTTPException(status_code=400, detail="Username must be less than 50 characters")
    if not user.username.replace('_', '').replace('-', '').isalnum():
        raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, underscores, and hyphens")
    
    # Validate password strength
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    if len(user.password) > 100:
        raise HTTPException(status_code=400, detail="Password must be less than 100 characters")
    
    # Validate email format
    if '@' not in user.email or '.' not in user.email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    
    try:
        # Check for existing username
        db_user = crud_notes.get_user_by_username(db, user.username)
        if db_user:
            db.rollback()  # Rollback transaction in case of any errors
            raise HTTPException(status_code=400, detail=f"Username '{user.username}' is already registered")
        
        # Check for existing email
        db_email = db.query(models.User).filter(func.lower(models.User.email) == user.email.strip().lower()).first()
        if db_email:
            db.rollback()  # Rollback transaction in case of any errors
            raise HTTPException(status_code=400, detail=f"Email '{user.email}' is already registered")
        
        # Create new user
        hashed_password = crud_notes.get_password_hash(user.password)
        new_user = crud_notes.create_user(db, user, hashed_password)
        return new_user
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    except Exception as e:
        # Rollback transaction on any database error
        db.rollback()
        logger.error(f"Failed to create user '{user.username}': {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

# POST /auth/token - Obtain a JWT access token for authentication.
# No authentication required.
# Request body: OAuth2PasswordRequestForm (username, password)
# Returns: Token schema (access_token, token_type)
@router.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db), request: Request = None):
    username = (form_data.username or "").strip()
    user, error_message = crud_notes.authenticate_user(db, username, form_data.password)
    
    # Get client IP and user agent for audit
    client_ip = request.client.host if request and request.client else "unknown"
    user_agent = request.headers.get("user-agent") if request else None
    
    if not user:
        # Log failed login attempt
        HIPAAAuditLogger.log_login_attempt(
            db=db,
            username=username,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False,
            failure_reason=error_message or "Invalid credentials"
        )
        raise HTTPException(status_code=401, detail=error_message or "Incorrect username or password")
    
    # Log successful login attempt
    HIPAAAuditLogger.log_login_attempt(
        db=db,
        username=username,
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# Cookie-based login that also returns the token for backward compatibility
@router.post("/token-cookie")
def login_cookie(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    username = (form_data.username or "").strip()
    user, error_message = crud_notes.authenticate_user(db, username, form_data.password)
    
    # Get client IP and user agent for audit
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    
    if not user:
        # Log failed login attempt
        HIPAAAuditLogger.log_login_attempt(
            db=db,
            username=username,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False,
            failure_reason=error_message or "Invalid credentials"
        )
        raise HTTPException(status_code=401, detail=error_message or "Incorrect username or password")
    
    # Log successful login attempt
    HIPAAAuditLogger.log_login_attempt(
        db=db,
        username=username,
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )
    
    access_token = create_access_token(data={"sub": user.username})

    # Set HttpOnly auth cookie
    # Mark Secure only when request is HTTPS (avoids cookie drop in local HTTP)
    secure_cookie = (request.url.scheme == "https")
    samesite_policy = "none" if secure_cookie else "lax"
    cookie_max_age = settings.access_token_expire_minutes * 60
    response.set_cookie(
        key="auth_token",
        value=access_token,
        httponly=True,
        secure=secure_cookie,
        samesite=samesite_policy,
        max_age=cookie_max_age,
        path="/",
    )

    # Optional CSRF cookie (not enforced yet)
    try:
        import secrets
        csrf = secrets.token_urlsafe(24)
        response.set_cookie(
            key="csrf_token",
            value=csrf,
            httponly=False,
            secure=secure_cookie,
            samesite=samesite_policy,
            max_age=cookie_max_age,
            path="/",
        )
    except Exception:
        pass

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/clerk-login", response_model=schemas.Token)
def clerk_login(
    request: Request,
    payload: ClerkLoginRequest,
    db: Session = Depends(get_db),
):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Clerk bearer token")

    clerk_token = auth_header.split(" ", 1)[1].strip()
    verified_payload = _verify_clerk_token(clerk_token)
    if not verified_payload:
        raise HTTPException(status_code=401, detail="Invalid Clerk token")

    username = verified_payload.get("preferred_username") or verified_payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Missing Clerk subject")

    user = crud_notes.get_user_by_username(db, username)
    if user is None:
        user = _provision_clerk_user(db, verified_payload)

    if user is None:
        # Last fallback: attempt email match if available
        email = (payload.email or verified_payload.get("email") or "").strip().lower()
        if email:
            user = db.query(models.User).filter(func.lower(models.User.email) == email).first()

    if user is None:
        raise HTTPException(status_code=401, detail="Unable to map Clerk user")

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("auth_token", path="/")
    response.delete_cookie("csrf_token", path="/")
    return {"ok": True}

# POST /auth/refresh - refresh session (sliding expiration)
@router.post("/refresh", response_model=schemas.Token)
def refresh_session(request: Request, response: Response, current_user=Depends(get_current_user)):
    # Issue a new token for the current user
    access_token = create_access_token(data={"sub": current_user.username})

    secure_cookie = (request.url.scheme == "https")
    samesite_policy = "none" if secure_cookie else "lax"
    cookie_max_age = settings.access_token_expire_minutes * 60
    response.set_cookie(
        key="auth_token",
        value=access_token,
        httponly=True,
        secure=secure_cookie,
        samesite=samesite_policy,
        max_age=cookie_max_age,
        path="/",
    )
    return {"access_token": access_token, "token_type": "bearer"}

# GET /auth/me - Get details of the currently authenticated user.
# Requires authentication (Bearer token).
# Returns: UserRead schema
@router.get("/me", response_model=schemas.UserRead)
def read_users_me(current_user: schemas.UserRead = Depends(get_current_user)):
    return current_user

# POST /auth/request-password-reset - Request password reset via email verification
# No authentication required.
# Request body: PasswordResetRequest (email)
# Returns: PasswordResetResponse
@router.post("/request-password-reset", response_model=schemas.PasswordResetResponse)
def request_password_reset(
    request_data: schemas.PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request password reset via email verification"""
    try:
        # Find user by email
        user = db.query(models.User).filter(models.User.email == request_data.email).first()
        
        # Always return success message for security (don't reveal if email exists)
        success_message = "If an account with that email exists, a password reset link has been sent."
        
        if not user:
            return schemas.PasswordResetResponse(
                message=success_message,
                success=True
            )
        
        # Generate secure token
        reset_token = secrets.token_urlsafe(32)
        
        # Set expiration time (1 hour from now)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Create password reset token record
        reset_token_record = models.PasswordResetToken(
            user_id=user.id,
            token=reset_token,
            expires_at=expires_at,
            tenant_id=user.tenant_id
        )
        
        # Invalidate any existing tokens for this user
        db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.user_id == user.id,
            models.PasswordResetToken.used == False
        ).update({"used": True})
        
        db.add(reset_token_record)
        db.commit()
        
        # Generate reset URL (in production, this should be your frontend URL)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        reset_url = f"{frontend_url}/auth/reset-password?token={reset_token}"
        
        # Send verification email
        email_sent = email_service.send_password_reset_email(
            user_email=user.email,
            username=user.username,
            reset_token=reset_token,
            reset_url=reset_url
        )
        
        if not email_sent:
            logger.warning(f"Failed to send password reset email to {user.email}")
        
        return schemas.PasswordResetResponse(
            message=success_message,
            success=True
        )
        
    except Exception as e:
        logger.error(f"Error in password reset request: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your request. Please try again later."
        )

# POST /auth/verify-password-reset - Verify token and reset password
# No authentication required.
# Request body: PasswordResetVerify (token, new_password)
# Returns: PasswordResetResponse
@router.post("/verify-password-reset", response_model=schemas.PasswordResetResponse)
def verify_password_reset(
    request_data: schemas.PasswordResetVerify,
    db: Session = Depends(get_db)
):
    """Verify reset token and update password"""
    try:
        # Validate password strength
        if len(request_data.new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        if len(request_data.new_password) > 100:
            raise HTTPException(status_code=400, detail="Password must be less than 100 characters")
        
        # Find valid reset token
        reset_token_record = db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.token == request_data.token,
            models.PasswordResetToken.used == False,
            models.PasswordResetToken.expires_at > datetime.utcnow()
        ).first()
        
        if not reset_token_record:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset token. Please request a new password reset."
            )
        
        # Get user
        user = db.query(models.User).filter(models.User.id == reset_token_record.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update password
        new_hashed_password = crud_notes.get_password_hash(request_data.new_password)
        user.hashed_password = new_hashed_password
        
        # Mark token as used
        reset_token_record.used = True
        
        # Log the password change
        HIPAAAuditLogger.log_password_change(
            db=db,
            user_id=user.id,
            username=user.username,
            success=True
        )
        
        db.commit()
        
        return schemas.PasswordResetResponse(
            message="Password has been successfully reset. You can now log in with your new password.",
            success=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in password reset verification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while resetting your password. Please try again later."
        )

# POST /auth/change-password - Change password for authenticated user
# Requires authentication.
# Request body: PasswordChangeRequest (current_password, new_password)
# Returns: PasswordResetResponse
@router.post("/change-password", response_model=schemas.PasswordResetResponse)
def change_password(
    request_data: schemas.PasswordChangeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password for authenticated user"""
    try:
        # Validate new password strength
        if len(request_data.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
        if len(request_data.new_password) > 100:
            raise HTTPException(status_code=400, detail="New password must be less than 100 characters")
        
        # Verify current password
        if not crud_notes.verify_password(request_data.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Update password
        new_hashed_password = crud_notes.get_password_hash(request_data.new_password)
        current_user.hashed_password = new_hashed_password
        
        # Log the password change
        HIPAAAuditLogger.log_password_change(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            success=True
        )
        
        db.commit()
        
        return schemas.PasswordResetResponse(
            message="Password has been successfully changed.",
            success=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in password change: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while changing your password. Please try again later."
        ) 
