"""
transcribe.py: Defines the /transcribe endpoint for audio transcription.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import tempfile
from app.services.transcription import transcription_service
from app.services.s3_service import s3_service
from pathlib import Path
from app.services.ai_summary import summarize_note, NoteSummary
from app.services.preferences import load_user_preferences
from app.api.endpoints.auth import get_current_user
from app.db.database import get_db
import os
import uuid
from datetime import datetime

router = APIRouter()

# POST /transcribe - Upload an audio file and receive a transcript.
# Optionally, get a structured SOAP note summary if summarize=true.
# Requires authentication.
# Parameters:
#   - file: audio file to transcribe (form-data, required)
#   - summarize: bool (query, optional, default: false)
# Returns: transcript (and summary if requested)
@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...), 
    summarize: bool = Query(False),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts an audio file, saves it to a temp file, calls the transcription service, and returns the transcript.
    If summarize=true, also returns a structured SOAP note summary.
    """
    # Validate file type
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files are accepted.")
    
    temp_path = None
    try:
        # Preserve the extension of the uploaded file
        suffix = Path(file.filename).suffix or ".wav"
        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        with os.fdopen(fd, "wb") as tmp:
            contents = await file.read()
            if not contents:
                raise HTTPException(status_code=400, detail="Empty file uploaded.")
            tmp.write(contents)
            tmp.flush()

        # Confirm temp file really exists
        if not os.path.exists(temp_path):
            raise HTTPException(status_code=500, detail=f"Temp file {temp_path} not found before transcription.")

        # Check file size
        file_size = os.path.getsize(temp_path)
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Transcribe
        transcript = await transcription_service.transcribe(Path(temp_path))
        
        # Store file in S3 if available, otherwise keep local
        file_metadata = {
            "local_path": temp_path,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "file_size": file_size
        }
        
        # Generate S3 key if using S3
        if s3_service.is_available():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            s3_key = f"audio/{current_user.id}/{timestamp}_{unique_id}_{Path(file.filename).name}"
            
            # Upload to S3
            if await s3_service.upload_file(Path(temp_path), s3_key, file.content_type):
                file_metadata["s3_key"] = s3_key
                file_metadata["storage_provider"] = "s3"
                # Clean up local temp file after successful S3 upload
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    temp_path = None
            else:
                # Fallback to local storage if S3 upload fails
                file_metadata["storage_provider"] = "local"
                file_metadata["local_path"] = temp_path
        else:
            file_metadata["storage_provider"] = "local"
            file_metadata["local_path"] = temp_path

        # The transcription service now handles empty results by returning a default message
        # So we don't need to check for empty results here

        response = {
            "transcript": transcript,
            "user_id": current_user.id,
            "username": current_user.username,
            "file_metadata": {
                "filename": file.filename,
                "file_size": file_size,
                "content_type": file.content_type,
                "storage_provider": file_metadata["storage_provider"]
            }
        }
        
        # Add S3 information if file is stored there
        if file_metadata.get("s3_key"):
            response["file_metadata"]["s3_key"] = file_metadata["s3_key"]
            response["file_metadata"]["download_url"] = s3_service.get_file_url(file_metadata["s3_key"])

        if summarize:
            try:
                prefs = load_user_preferences(current_user.id)
                summary: NoteSummary = await summarize_note(transcript, preferences=prefs)
                response["summary"] = summary.model_dump()
            except Exception as e:
                print(f"Failed to generate SOAP summary: {e}")
                # If OpenAI API fails, still return the transcript but with an error message
                response["summary_error"] = f"Failed to generate SOAP summary: {str(e)}"
                response["summary"] = None

        return JSONResponse(status_code=200, content=response)

    except HTTPException:
        raise
    except Exception as e:
        print(f"\n🔥 ERROR in /transcribe:\n{repr(e)}\n")  # Print full error in your server logs
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"Failed to remove temp file {temp_path}: {e}")

# WebSocket endpoint for live, chunked transcription using Whisper
# Usage: Client streams audio chunks (e.g., PCM or WAV bytes) to this endpoint
# The server transcribes each chunk and sends back the partial transcript
# On disconnect, the server sends the full transcript and a SOAP summary
@router.websocket("/ws/live-transcribe")
async def websocket_live_transcribe(websocket: WebSocket):
    await websocket.accept()
    transcript = ""
    try:
        while True:
            # Receive audio chunk from client
            data = await websocket.receive_bytes()
            # TODO: Buffer and preprocess audio chunks as needed (e.g., accumulate enough for Whisper)
            # For demonstration, treat each chunk as a complete short audio segment
            chunk_text = await transcription_service.transcribe_chunk(data)
            transcript += chunk_text + " "
            # Send partial transcript back to client
            await websocket.send_text(chunk_text)
    except WebSocketDisconnect:
        # On disconnect, generate SOAP summary
        prefs = None
        try:
            # WebSocket lacks auth dependency here; skip preferences in this path
            prefs = None
        except Exception:
            prefs = None
        summary = await summarize_note(transcript, preferences=prefs)
        await websocket.send_json({
            "full_transcript": transcript.strip(),
            "soap_summary": summary.model_dump()
        })
        await websocket.close()
