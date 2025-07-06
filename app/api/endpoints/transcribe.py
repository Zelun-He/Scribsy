"""
transcribe.py: Defines the /transcribe endpoint for audio transcription.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
import tempfile
from app.services.transcription import transcription_service
from pathlib import Path
from app.services.ai_summary import summarize_note, NoteSummary
import os

router = APIRouter()

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...), summarize: bool = Query(False)):
    try:
        # Preserve the extension of the uploaded file
        suffix = Path(file.filename).suffix or ".wav"
        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        with os.fdopen(fd, "wb") as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp.flush()

        # Confirm temp file really exists
        if not os.path.exists(temp_path):
            raise HTTPException(status_code=500, detail=f"Temp file {temp_path} not found before transcription.")

        # Transcribe
        transcript = await transcription_service.transcribe(Path(temp_path))

        response = {"transcript": transcript}

        if summarize:
            summary: NoteSummary = await summarize_note(transcript)
            response["summary"] = summary.dict()

        return JSONResponse(status_code=200, content=response)

    except Exception as e:
        print(f"\n🔥 ERROR in /transcribe:\n{repr(e)}\n")  # Print full error in your server logs
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
