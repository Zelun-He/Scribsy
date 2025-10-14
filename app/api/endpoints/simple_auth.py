"""
Simple auth endpoint that works without complex database structure.
This provides a temporary working auth system.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
import hashlib
import jwt
from datetime import datetime, timedelta
from app.config import settings

router = APIRouter()

# Simple in-memory user storage (temporary)
SIMPLE_USERS = {
    "testuser": {
        "password": "testpass123",
        "email": "test@example.com",
        "is_active": True,
        "is_admin": False
    },
    "admin": {
        "password": "admin123",
        "email": "admin@example.com", 
        "is_active": True,
        "is_admin": True
    }
}

def create_access_token(data: dict):
    """Create a simple JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

@router.post("/simple-login")
async def simple_login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Simple login endpoint that works without database.
    Use this for testing while we fix the database issue.
    """
    username = form_data.username
    password = form_data.password
    
    # Check if user exists in simple storage
    if username not in SIMPLE_USERS:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = SIMPLE_USERS[username]
    
    # Simple password check (in production, use proper hashing)
    if user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="Account disabled")
    
    # Create access token
    access_token = create_access_token(data={"sub": username})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": username,
            "email": user["email"],
            "is_admin": user["is_admin"]
        }
    }

@router.get("/simple-users")
async def get_simple_users():
    """
    Get list of available test users.
    """
    return {
        "users": [
            {"username": username, "email": user["email"], "is_admin": user["is_admin"]}
            for username, user in SIMPLE_USERS.items()
        ]
    }
