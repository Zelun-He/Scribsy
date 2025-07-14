"""
transcription.py: Placeholder for audio transcription service (e.g., Whisper).
"""
import whisper
from pathlib import Path

class TranscriptionService:
    def __init__(self, model_size: str = "base"):
        """
        Initialize the transcription service with a specified Whisper model.
        
        Args:
            model_size: Size of the Whisper model to use (base, small, medium, large)
        """
        self.model = whisper.load_model(model_size)

    async def transcribe(self, audio_path: Path) -> str:
        """
        Transcribe an audio file using the loaded Whisper model.
        
        Args:
            audio_path: Path to the audio file to transcribe
            
        Returns:
            Transcribed text
        """
        # Use Whisper to transcribe the audio file
        result = self.model.transcribe(str(audio_path))
        return result["text"]

    async def transcribe_chunk(self, audio_bytes: bytes) -> str:
        """
        Transcribe a chunk of audio bytes using Whisper.
        For demonstration, treat each chunk as a complete short audio segment.
        TODO: Implement buffering and proper streaming for real-time transcription.
        Args:
            audio_bytes: Raw audio bytes (e.g., PCM or WAV)
        Returns:
            Transcribed text for the chunk
        """
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=True) as tmp:
            tmp.write(audio_bytes)
            tmp.flush()
            result = self.model.transcribe(tmp.name)
            return result["text"]

# Singleton instance
transcription_service = TranscriptionService()
