"""
transcribe.py: Defines the /transcribe endpoint for audio transcription.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import tempfile
from app.services.transcription import transcription_service
from pathlib import Path

router = APIRouter()

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """
    Accepts an audio file, saves it to a temp file, calls the transcription service, and returns the transcript.
    """
    try:
        with tempfile.NamedTemporaryFile(delete=True, suffix=".wav") as temp_audio:
            contents = await file.read()
            temp_audio.write(contents)
            temp_audio.flush()
            transcript = await transcription_service.transcribe(Path(temp_audio.name))
        return JSONResponse({"transcript": transcript})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
