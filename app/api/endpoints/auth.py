from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db import schemas, models
from app.crud import notes as crud_notes
from sqlalchemy import func, or_
from app.db.database import get_db
from app.audit.logger import HIPAAAuditLogger
from app.services.email_service import email_service
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import secrets
import logging
import os
import hashlib
from urllib.parse import urlencode, urlsplit
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

router = APIRouter(prefix="/auth", tags=["auth"])


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
            payload = None

        if not payload:
            logger.warning("JWT decode failed for local token")
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

    if user is None or not user.is_active:
        logger.warning(f"User '{username}' not found after token validation")
        raise credentials_exception
    if payload.get("ver", 0) != user.token_version:
        raise credentials_exception
    if user.is_demo:
        if not settings.demo_enabled:
            raise HTTPException(status_code=403, detail="The public demo is disabled.")
        path = request.url.path.rstrip("/")
        allowed = path in ("/dashboard", "/auth/me", "/auth/refresh", "/notes", "/patients") or path.startswith(("/notes/", "/patients/"))
        if not allowed or (request.method not in ("GET", "HEAD", "OPTIONS") and path != "/auth/refresh"):
            raise HTTPException(status_code=403, detail="This demo workspace is view-only. Create an account to save your own visits.")
    return user

# POST /auth/register - Register a new user.
# No authentication required.
# Request body: UserCreate schema (username, password, email)
# Returns: UserRead schema
@router.post("/register", response_model=schemas.UserRead)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Normalize/validate username format
    user.username = user.username.strip()
    from app.services.demo_workspace import DEMO_USERNAME, DEMO_EMAIL
    if user.username.lower() == DEMO_USERNAME or user.email.strip().lower() == DEMO_EMAIL:
        raise HTTPException(status_code=400, detail="This account name is reserved for the public demo.")
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
    
    access_token = create_access_token(data={"sub": user.username, "ver": user.token_version})
    return {"access_token": access_token, "token_type": "bearer"}

# Cookie-based login that also returns the token for backward compatibility
@router.post("/demo", response_model=schemas.Token)
def login_demo(request: Request, response: Response, db: Session = Depends(get_db)):
    """Issue a normal session only for the explicitly marked public demo account."""
    from app.services.demo_workspace import DEMO_USERNAME, DEMO_PASSWORD
    user = crud_notes.get_user_by_username(db, DEMO_USERNAME)
    if not settings.demo_enabled or not user or not user.is_demo or not user.is_active:
        raise HTTPException(status_code=503, detail="The public demo is unavailable. Please try again later.")
    if not crud_notes.verify_password(DEMO_PASSWORD, user.hashed_password):
        raise HTTPException(status_code=503, detail="The public demo is unavailable. Please try again later.")
    access_token = create_access_token(data={"sub": user.username, "ver": user.token_version})
    secure = request.url.scheme == "https"
    response.set_cookie("auth_token", access_token, httponly=True, secure=secure,
                        samesite="none" if secure else "lax", path="/",
                        max_age=settings.access_token_expire_minutes * 60)
    HIPAAAuditLogger.log_login_attempt(db=db, username=user.username,
                                      ip_address=request.client.host if request.client else "unknown",
                                      user_agent=request.headers.get("user-agent", ""), success=True)
    return {"access_token": access_token, "token_type": "bearer"}


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
    
    access_token = create_access_token(data={"sub": user.username, "ver": user.token_version})

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


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("auth_token", path="/")
    response.delete_cookie("csrf_token", path="/")
    return {"ok": True}

# POST /auth/refresh - refresh session (sliding expiration)
@router.post("/refresh", response_model=schemas.Token)
def refresh_session(request: Request, response: Response, current_user=Depends(get_current_user)):
    # Issue a new token for the current user
    access_token = create_access_token(data={"sub": current_user.username, "ver": current_user.token_version})

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

RESET_MESSAGE = "If an active account matches that email, a password reset link has been sent."
RESET_UNAVAILABLE = "Password reset email is unavailable right now. Please try again later."


def reset_frontend_url():
    # Use a configured, trusted origin; never derive reset links from Host/Origin headers.
    default = "http://localhost:3000" if settings.debug else "https://scribsy.vercel.app"
    value = os.getenv("FRONTEND_URL", default).strip().rstrip("/")
    parsed = urlsplit(value)
    local = settings.debug and parsed.hostname in ("localhost", "127.0.0.1")
    if (parsed.scheme != "https" and not (local and parsed.scheme == "http")) or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("FRONTEND_URL must be a trusted HTTPS URL")
    return value


@router.post("/request-password-reset", response_model=schemas.PasswordResetResponse)
def request_password_reset(request_data: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    try:
        # Fail consistently for all addresses when mail is not set up.
        if not email_service.is_configured():
            raise HTTPException(status_code=503, detail=RESET_UNAVAILABLE)
        frontend_url = reset_frontend_url()
        user = db.query(models.User).filter(
            func.lower(models.User.email) == request_data.email.strip().lower()
        ).with_for_update().first()
        if not user or user.is_demo or not user.is_active:
            return schemas.PasswordResetResponse(message=RESET_MESSAGE, success=True)
        now = datetime.now(timezone.utc)
        recent = db.query(models.PasswordResetToken.id).filter(
            models.PasswordResetToken.user_id == user.id,
            models.PasswordResetToken.created_at > now - timedelta(seconds=60)
        ).first()
        hourly_count = db.query(models.PasswordResetToken.id).filter(
            models.PasswordResetToken.user_id == user.id,
            models.PasswordResetToken.created_at > now - timedelta(hours=1)
        ).count()
        if recent or hourly_count >= 3:
            return schemas.PasswordResetResponse(message=RESET_MESSAGE, success=True)
        reset_token = secrets.token_urlsafe(32)
        db.query(models.PasswordResetToken).filter_by(user_id=user.id, used=False).update({"used": True})
        db.add(models.PasswordResetToken(
            user_id=user.id, token="sha256:" + hashlib.sha256(reset_token.encode()).hexdigest(),
            expires_at=now + timedelta(hours=1), created_at=now, tenant_id=user.tenant_id,
        ))
        db.flush()
        reset_url = frontend_url + "/auth/reset-password?" + urlencode({"token": reset_token})
        if not email_service.send_password_reset_email(
            user_email=user.email, username=user.username,
            reset_token=reset_token, reset_url=reset_url,
        ):
            raise HTTPException(status_code=503, detail=RESET_UNAVAILABLE)
        db.commit()
        return schemas.PasswordResetResponse(message=RESET_MESSAGE, success=True)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Password reset request failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=503, detail=RESET_UNAVAILABLE)


@router.post("/verify-password-reset", response_model=schemas.PasswordResetResponse)
def verify_password_reset(request_data: schemas.PasswordResetVerify, db: Session = Depends(get_db)):
    try:
        password = request_data.new_password
        if len(password) < 8 or not any(c in "0123456789" for c in password):
            raise HTTPException(status_code=400, detail="Use at least 8 characters, including a number.")
        if len(password.encode("utf-8")) > 72:
            raise HTTPException(status_code=400, detail="Password must be no more than 72 bytes long.")
        now = datetime.now(timezone.utc)
        # Accept existing, unexpired legacy links; new tokens are only stored as hashes.
        token_match = or_(
            models.PasswordResetToken.token == "sha256:" + hashlib.sha256(request_data.token.encode()).hexdigest(),
            models.PasswordResetToken.token == request_data.token,
        )
        record = db.query(models.PasswordResetToken).filter(token_match).first()
        invalid = HTTPException(status_code=400, detail="This reset link is invalid or has expired. Please request a new one.")
        if not record:
            raise invalid
        # Serialize against other reset requests for the same account.
        user = db.query(models.User).filter_by(id=record.user_id).with_for_update().first()
        if not user or not user.is_active or user.is_demo:
            raise invalid
        claimed = db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.id == record.id,
            models.PasswordResetToken.used == False,
            models.PasswordResetToken.expires_at > now,
        ).update({"used": True}, synchronize_session=False)
        if claimed != 1:
            raise invalid
        user.hashed_password = crud_notes.get_password_hash(password)
        user.token_version += 1  # Revoke previous sessions, including legacy tokens (version 0).
        user.failed_login_attempts = 0
        user.account_locked_until = None
        db.query(models.PasswordResetToken).filter_by(user_id=user.id, used=False).update({"used": True})
        db.commit()
        HIPAAAuditLogger.log_password_change(db=db, user_id=user.id, username=user.username, success=True)
        return schemas.PasswordResetResponse(message="Password updated. Sign in with your new password.", success=True)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Password reset verification failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=500, detail="Unable to update your password. Please try again later.")

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
