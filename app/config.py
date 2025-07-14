"""
Configuration settings for Scribsy application
"""
import os
from typing import Optional
from pydantic import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # OpenAI Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    
    # Database Configuration
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./scribsy.db")
    
    # Authentication Configuration
    secret_key: str = os.getenv("SECRET_KEY", "supersecretkey")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    
    # Server Configuration
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000"))
    
    # File Upload Configuration
    upload_dir: str = os.getenv("UPLOAD_DIR", "uploads")
    max_audio_file_size: int = int(os.getenv("MAX_AUDIO_FILE_SIZE", "50"))  # MB
    
    # Logging Configuration
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_file: str = os.getenv("LOG_FILE", "logs/scribsy.log")
    
    # Whisper Configuration
    whisper_model: str = os.getenv("WHISPER_MODEL", "base")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    def validate_settings(self) -> list:
        """Validate required settings and return any missing ones"""
        missing = []
        
        if not self.openai_api_key:
            missing.append("OPENAI_API_KEY")
        
        if not self.secret_key or self.secret_key == "supersecretkey":
            missing.append("SECRET_KEY (use a secure random key)")
        
        return missing
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return not self.debug and self.secret_key != "supersecretkey"

# Create settings instance
settings = Settings()

# Validate settings on import
missing_settings = settings.validate_settings()
if missing_settings:
    print(f"WARNING: Missing or insecure environment variables: {', '.join(missing_settings)}")
    print("Please create a .env file based on .env.example and set proper values")