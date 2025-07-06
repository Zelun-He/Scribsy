# Scribsy

A modular FastAPI project for audio transcription and note management.

## Project Structure

```
app/
  main.py                  # FastAPI app entry point
  api/endpoints/
    transcribe.py          # /transcribe endpoint for audio file transcription
  db/
    database.py            # Placeholder for database connection
    models.py              # SQLAlchemy Note model
    schemas.py             # Pydantic schemas for Note
  crud/
    notes.py               # CRUD operations for notes
  services/
    transcription.py       # Placeholder for Whisper transcription service
requirements.txt           # Project dependencies
README.md                  # Project overview
```

## Quick Start

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

## Endpoints
- `POST /transcribe`: Accepts an audio file and returns dummy transcription text.

## Notes
- Database and transcription service are placeholders and should be implemented as needed.
