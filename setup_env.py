#!/usr/bin/env python3
"""
Setup script to create .env file for Scribsy
"""

import os
import secrets

def create_env_file():
    """Create a .env file with default values"""
    
    # Generate a secure secret key
    secret_key = secrets.token_urlsafe(32)
    
    env_content = f"""# Scribsy Environment Variables

# OpenAI API Configuration - REQUIRED for transcription and SOAP summarization
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_URL=sqlite:///./scribsy.db

# Authentication Configuration
SECRET_KEY={secret_key}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Server Configuration
DEBUG=True
HOST=127.0.0.1
PORT=8002

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_AUDIO_FILE_SIZE=50

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=logs/scribsy.log

# Whisper Configuration
WHISPER_MODEL=base
"""
    
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("Created .env file with secure secret key")
    print("IMPORTANT: Add your OpenAI API key to the .env file")
    print("   1. Get API key from: https://platform.openai.com/api-keys")
    print("   2. Replace 'your_openai_api_key_here' with your actual key")
    print("   3. Without the API key, transcription and SOAP summarization will fail")

if __name__ == "__main__":
    create_env_file()