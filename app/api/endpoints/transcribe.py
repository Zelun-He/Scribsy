"""
transcribe.py: Defines the /transcribe endpoint for audio transcription.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import tempfile
from app.services.transcription import transcription_service
from pathlib import Path
from app.services.ai_summary import summarize_note, NoteSummary
import os

router = APIRouter()

# POST /transcribe - Upload an audio file and receive a transcript.
# Optionally, get a structured SOAP note summary if summarize=true.
# No authentication required.
# Parameters:
#   - file: audio file to transcribe (form-data, required)
#   - summarize: bool (query, optional, default: false)
# Returns: transcript (and summary if requested)
@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...), summarize: bool = Query(False)):
    """
    Accepts an audio file, saves it to a temp file, calls the transcription service, and returns the transcript.
    If summarize=true, also returns a structured SOAP note summary.
    """
    # Validate file type
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files are accepted.")
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
        summary = await summarize_note(transcript)
        await websocket.send_json({
            "full_transcript": transcript.strip(),
            "soap_summary": summary.dict()
        })
        await websocket.close()
