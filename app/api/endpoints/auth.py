from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db import schemas, models
from app.crud import notes as crud_notes
from app.db.database import get_db
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os

from app.config import settings

SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

router = APIRouter(prefix="/auth", tags=["auth"])

# Utility to create JWT token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Dependency to get current user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud_notes.get_user_by_username(db, username)
    if user is None:
        raise credentials_exception
    return user

# POST /auth/register - Register a new user.
# No authentication required.
# Request body: UserCreate schema (username, password, email)
# Returns: UserRead schema
@router.post("/register", response_model=schemas.UserRead)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Validate username format
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
    
    # Check for existing username
    db_user = crud_notes.get_user_by_username(db, user.username)
    if db_user:
        raise HTTPException(status_code=400, detail=f"Username '{user.username}' is already registered")
    
    # Check for existing email
    db_email = db.query(models.User).filter_by(email=user.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail=f"Email '{user.email}' is already registered")
    
    try:
        hashed_password = crud_notes.get_password_hash(user.password)
        return crud_notes.create_user(db, user, hashed_password)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

# POST /auth/token - Obtain a JWT access token for authentication.
# No authentication required.
# Request body: OAuth2PasswordRequestForm (username, password)
# Returns: Token schema (access_token, token_type)
@router.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user, error_message = crud_notes.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail=error_message or "Incorrect username or password")
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# GET /auth/me - Get details of the currently authenticated user.
# Requires authentication (Bearer token).
# Returns: UserRead schema
@router.get("/me", response_model=schemas.UserRead)
def read_users_me(current_user: schemas.UserRead = Depends(get_current_user)):
    return current_user 