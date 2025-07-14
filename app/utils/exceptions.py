"""
Custom exceptions for Scribsy application
"""
from fastapi import HTTPException
from typing import Optional

class ScribsyException(Exception):
    """Base exception for Scribsy application"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class AuthenticationError(ScribsyException):
    """Authentication related errors"""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, 401)

class AuthorizationError(ScribsyException):
    """Authorization related errors"""
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, 403)

class ValidationError(ScribsyException):
    """Validation related errors"""
    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, 400)

class TranscriptionError(ScribsyException):
    """Transcription service errors"""
    def __init__(self, message: str = "Transcription failed"):
        super().__init__(message, 500)

class DatabaseError(ScribsyException):
    """Database operation errors"""
    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message, 500)

class FileUploadError(ScribsyException):
    """File upload errors"""
    def __init__(self, message: str = "File upload failed"):
        super().__init__(message, 400)

def handle_scribsy_exception(exc: ScribsyException) -> HTTPException:
    """Convert ScribsyException to HTTPException"""
    return HTTPException(
        status_code=exc.status_code,
        detail=exc.message
    )

def safe_execute(func, *args, error_message: str = "Operation failed", **kwargs):
    """
    Safely execute a function with error handling
    """
    try:
        return func(*args, **kwargs)
    except ScribsyException:
        raise  # Re-raise our custom exceptions
    except Exception as e:
        from app.utils.logging import log_error
        log_error(e, context=f"safe_execute: {func.__name__}")
        raise ScribsyException(f"{error_message}: {str(e)}")