"""
main.py: FastAPI app entry point. Sets up the application, CORS, and includes API routers.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints.transcribe import router as transcribe_router
from app.api.endpoints.notes import router as notes_router
from app.api.endpoints.auth import router as auth_router
from dotenv import load_dotenv
import os

load_dotenv()
app = FastAPI(title="Scribsy")

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

@app.get("/test-env")
def test_env():
    return {"OPENAI_API_KEY": os.getenv("OPENAI_API_KEY")}
