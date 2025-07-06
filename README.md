# Scribsy

A modular FastAPI backend for audio transcription and AI-powered SOAP note generation.

---

## Features
- Upload audio files and receive real-time transcription using OpenAI Whisper.
- Optionally generate structured SOAP notes using OpenAI GPT models.
- Modular, extensible codebase with clear separation of concerns.
- Input validation and error handling for file uploads.

---

## Requirements
- **Python 3.10+** (recommended)
- **ffmpeg** (must be installed and available in your system PATH)
- OpenAI API key (for SOAP note summarization)

---

## Installation

1. **Clone the repository and navigate to the project folder:**
   ```bash
   git clone <your-repo-url>
   cd Scribsy
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install ffmpeg:**
   - **Windows:**
     - [Download from ffmpeg.org](https://ffmpeg.org/download.html) or use Chocolatey: `choco install ffmpeg -y`
   - **Mac:**
     - `brew install ffmpeg`
   - **Linux:**
     - `sudo apt install ffmpeg`
   - Ensure `ffmpeg` is in your system PATH: `ffmpeg -version`

5. **Set up your OpenAI API key:**
   - Create a `.env` file in the project root:
     ```env
     OPENAI_API_KEY=sk-your-openai-key-here
     ```

---

## Running the Server

```bash
uvicorn app.main:app --reload
```

Visit [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) for the interactive API documentation (Swagger UI).

---

## API Endpoints

### `POST /transcribe`
- **Description:** Upload an audio file and receive a transcript. Optionally, get a structured SOAP note summary.
- **Parameters:**
  - `file`: (form-data, required) Audio file to transcribe.
  - `summarize`: (query, optional, default: false) If true, returns a SOAP note summary.
- **Responses:**
  - `200 OK`: JSON with transcript (and summary if requested)
  - `400 Bad Request`: If a non-audio file is uploaded
  - `500 Internal Server Error`: On processing errors

#### Example Request (using Swagger UI or curl):
```bash
curl -X POST "http://127.0.0.1:8000/transcribe?summarize=true" \
  -F "file=@your-audio-file.mp3"
```

#### Example Response
```json
{
  "transcript": "Patient reports chest pain for two days, worse with exertion.",
  "summary": {
    "subjective": "Patient reports chest pain for two days, worse with exertion.",
    "objective": "No abnormal findings on exam.",
    "assessment": "Likely angina.",
    "plan": "Order ECG, start aspirin, follow up in cardiology."
  }
}
```

---

## SOAP Note Structure
The summary is returned as a JSON object with the following fields (see `NoteSummary` in `app/services/ai_summary.py`):
- `subjective`: Patient's reported symptoms and history
- `objective`: Clinician's observations and measurements
- `assessment`: Diagnosis or clinical impression
- `plan`: Treatment plan and next steps

You can extend this structure in `NoteSummary` as needed for your use case.

---

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
    transcription.py       # Whisper transcription service
    ai_summary.py          # OpenAI-powered SOAP note summarization
requirements.txt           # Python dependencies
README.md                  # Project overview
```

---

## License
MIT (or your chosen license)
