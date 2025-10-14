from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
from app.config import settings

router = APIRouter()

# Simple token generation
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

@router.post("/emergency-login")
async def emergency_login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Emergency login that bypasses all database issues"""
    username = form_data.username
    password = form_data.password
    
    # Simple hardcoded users for emergency access
    users = {
        "testuser": "testpass123",
        "admin": "admin123",
        "demo": "demo123"
    }
    
    if username in users and users[username] == password:
        access_token = create_access_token(data={"sub": username})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "username": username,
                "id": 1,
                "email": f"{username}@example.com",
                "is_active": True,
                "is_admin": username == "admin"
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.get("/emergency-users")
async def get_emergency_users():
    """Get list of emergency users"""
    return {
        "users": [
            {"username": "testuser", "password": "testpass123"},
            {"username": "admin", "password": "admin123"},
            {"username": "demo", "password": "demo123"}
        ]
    }

