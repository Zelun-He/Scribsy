"""
main.py: FastAPI app entry point. Sets up the application, CORS, and includes API routers.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.endpoints.transcribe import router as transcribe_router
from app.api.endpoints.notes import router as notes_router
from app.api.endpoints.auth import router as auth_router
from app.utils.exceptions import ScribsyException, handle_scribsy_exception
from app.utils.logging import logger, log_error
from dotenv import load_dotenv
import os

load_dotenv()
app = FastAPI(title="Scribsy")

# Global exception handler for ScribsyException
@app.exception_handler(ScribsyException)
async def scribsy_exception_handler(request: Request, exc: ScribsyException):
    log_error(exc, context=f"API endpoint: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )

# Global exception handler for general exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    log_error(exc, context=f"Unhandled exception at: {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Enable CORS for all origins (adjust as needed for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(transcribe_router)
app.include_router(notes_router)
app.include_router(auth_router)

@app.get("/")
def root():
    logger.info("Root endpoint accessed")
    return {
        "message": "Welcome to Scribsy API",
        "documentation": "http://127.0.0.1:8002/docs",
        "health": "OK"
    }

@app.get("/test-env")
def test_env():
    return {"OPENAI_API_KEY": os.getenv("OPENAI_API_KEY")}
