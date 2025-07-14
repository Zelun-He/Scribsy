"""
Logging configuration for Scribsy application
"""
import logging
import sys
from datetime import datetime
from pathlib import Path

# Create logs directory if it doesn't exist
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Configure logging
def setup_logging():
    """Set up logging configuration"""
    
    # Create logger
    logger = logging.getLogger("scribsy")
    logger.setLevel(logging.INFO)
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(lineno)d - %(message)s'
    )
    
    simple_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # File handler for detailed logs
    file_handler = logging.FileHandler(
        log_dir / f"scribsy_{datetime.now().strftime('%Y%m%d')}.log"
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(detailed_formatter)
    
    # Console handler for simple output
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(simple_formatter)
    
    # Error file handler for errors only
    error_handler = logging.FileHandler(
        log_dir / f"scribsy_errors_{datetime.now().strftime('%Y%m%d')}.log"
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(detailed_formatter)
    
    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.addHandler(error_handler)
    
    return logger

# Create logger instance
logger = setup_logging()

def log_request(endpoint: str, user_id: int = None, **kwargs):
    """Log API request"""
    user_info = f"user_id={user_id}" if user_id else "anonymous"
    extra_info = " ".join([f"{k}={v}" for k, v in kwargs.items()])
    logger.info(f"API Request: {endpoint} - {user_info} - {extra_info}")

def log_error(error: Exception, context: str = "", user_id: int = None):
    """Log error with context"""
    user_info = f"user_id={user_id}" if user_id else "anonymous"
    logger.error(f"Error in {context}: {str(error)} - {user_info}", exc_info=True)

def log_info(message: str, **kwargs):
    """Log info message"""
    extra_info = " ".join([f"{k}={v}" for k, v in kwargs.items()])
    logger.info(f"{message} - {extra_info}")