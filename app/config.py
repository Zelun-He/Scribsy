"""
Configuration settings for Scribsy application
"""
import os
from typing import Optional
try:
    from pydantic_settings import BaseSettings
except ImportError:
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
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))  # HIPAA: shorter sessions
    session_timeout_minutes: int = int(os.getenv("SESSION_TIMEOUT_MINUTES", "15"))  # HIPAA: auto-logout inactive sessions
    max_session_duration_hours: int = int(os.getenv("MAX_SESSION_DURATION_HOURS", "8"))  # HIPAA: max session length
    
    # Server Configuration
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000"))
    # CORS / Hosts
    # Use explicit local origins by default for better CORS with credentials in dev
    allowed_origins: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,https://scribsy.vercel.app"
    )  # comma-separated or "*"
    allowed_hosts: str = os.getenv("ALLOWED_HOSTS", "*")      # comma-separated or "*"
    # Default to no HTTPS redirect locally; enable via env in production
    https_redirect: bool = os.getenv("HTTPS_REDIRECT", "False").lower() == "true"
    
    # File Upload Configuration
    upload_dir: str = os.getenv("UPLOAD_DIR", "uploads")
    max_audio_file_size: int = int(os.getenv("MAX_AUDIO_FILE_SIZE", "50"))  # MB
    
    # S3 Configuration
    use_s3: bool = os.getenv("USE_S3", "False").lower() == "true"
    s3_bucket_name: str = os.getenv("S3_BUCKET_NAME", "")
    s3_access_key_id: str = os.getenv("S3_ACCESS_KEY_ID", "")
    s3_secret_access_key: str = os.getenv("S3_SECRET_ACCESS_KEY", "")
    s3_region_name: str = os.getenv("S3_REGION_NAME", "us-east-1")
    s3_endpoint_url: Optional[str] = os.getenv("S3_ENDPOINT_URL", None)  # For local testing with MinIO
    
    # Logging Configuration
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_file: str = os.getenv("LOG_FILE", "logs/scribsy.log")
    
    # Whisper Configuration
    whisper_model: str = os.getenv("WHISPER_MODEL", "base")

    # Monitoring / Sentry
    sentry_dsn: str = os.getenv("SENTRY_DSN", "")
    sentry_environment: str = os.getenv("SENTRY_ENVIRONMENT", os.getenv("ENVIRONMENT", "production"))

    # Notifications
    notification_webhook_url: str = os.getenv("NOTIFICATION_WEBHOOK_URL", "")
    
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

    # Helpers
    def allowed_origins_list(self) -> list:
        value = (self.allowed_origins or "").strip()
        if value == "*" or value == "":
            return ["*"]
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    def allowed_hosts_list(self) -> list:
        value = (self.allowed_hosts or "").strip()
        if value == "*" or value == "":
            return ["*"]
        return [host.strip() for host in value.split(",") if host.strip()]

# Create settings instance
settings = Settings()

# Validate settings on import
missing_settings = settings.validate_settings()
if missing_settings:
    print(f"WARNING: Missing or insecure environment variables: {', '.join(missing_settings)}")
    print("Please create a .env file based on .env.example and set proper values")