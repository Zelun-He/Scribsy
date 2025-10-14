"""
Working auth endpoint that completely bypasses database issues.
This provides a fully functional auth system for testing.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from jose import jwt
from datetime import datetime, timedelta
from app.config import settings

router = APIRouter()

# Simple in-memory user storage
USERS = {
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
    """Create a JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

@router.post("/working-login")
async def working_login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Working login endpoint that bypasses all database issues.
    Use this for testing your frontend.
    """
    username = form_data.username
    password = form_data.password
    
    # Check if user exists
    if username not in USERS:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = USERS[username]
    
    # Check password
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

@router.post("/working-login-cookie")
async def working_login_cookie(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Working login with cookie support.
    """
    username = form_data.username
    password = form_data.password
    
    # Check if user exists
    if username not in USERS:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = USERS[username]
    
    # Check password
    if user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="Account disabled")
    
    # Create access token
    access_token = create_access_token(data={"sub": username})
    
    # Set cookie
    response.set_cookie(
        key="auth_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": username,
            "email": user["email"],
            "is_admin": user["is_admin"]
        }
    }

@router.get("/working-users")
async def get_working_users():
    """
    Get list of available test users.
    """
    return {
        "users": [
            {
                "username": username,
                "email": user["email"],
                "is_admin": user["is_admin"],
                "password": user["password"]  # Only for testing
            }
            for username, user in USERS.items()
        ]
    }

@router.post("/working-register")
async def working_register(user_data: dict):
    """
    Simple user registration for testing.
    """
    username = user_data.get("username")
    email = user_data.get("email")
    password = user_data.get("password")
    
    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    if username in USERS:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Add new user
    USERS[username] = {
        "password": password,
        "email": email,
        "is_active": True,
        "is_admin": False
    }
    
    return {
        "message": "User created successfully",
        "user": {
            "username": username,
            "email": email,
            "is_admin": False
        }
    }
