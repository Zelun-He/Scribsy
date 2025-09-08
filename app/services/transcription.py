"""
transcription.py: Placeholder for audio transcription service (e.g., Whisper).
"""
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self, model_size: str = None):
        """
        Initialize the transcription service with a specified Whisper model.
        
        Args:
            model_size: Size of the Whisper model to use (base, small, medium, large)
        """
        self.model_size = model_size or "base"
        self.model = None

    def _load_model(self):
        """Lazy load the Whisper model only when needed."""
        if self.model is None:
            try:
                logger.info(f"Loading Whisper model: {self.model_size}")
                # Import whisper lazily to avoid import-time failures on startup
                import whisper  # type: ignore
                self.model = whisper.load_model(self.model_size)
                logger.info("Whisper model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                # Try to load the base model as a fallback
                try:
                    logger.info("Trying to load base model as fallback")
                    import whisper  # type: ignore
                    self.model = whisper.load_model("base")
                    logger.info("Base model loaded successfully as fallback")
                except Exception as fallback_error:
                    logger.error(f"Failed to load base model as fallback: {fallback_error}")
                    raise Exception(f"Failed to load any Whisper model: {str(e)}")

    async def transcribe(self, audio_path: Path) -> str:
        """
        Transcribe an audio file using the loaded Whisper model.
        
        Args:
            audio_path: Path to the audio file to transcribe
            
        Returns:
            Transcribed text
        """
        try:
            self._load_model()
            logger.info(f"Transcribing audio file: {audio_path}")
            # Use Whisper to transcribe the audio file
            result = self.model.transcribe(str(audio_path))
            transcript = result["text"].strip()
            logger.info(f"Transcription completed: {len(transcript)} characters")
            
            # Handle empty or very short transcriptions
            if not transcript or len(transcript) < 3:
                logger.warning(f"Transcription result too short or empty: '{transcript}'")
                return "No speech detected in audio file."
            
            return transcript
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise Exception(f"Transcription failed: {str(e)}")

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
        try:
            self._load_model()
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=True) as tmp:
                tmp.write(audio_bytes)
                tmp.flush()
                result = self.model.transcribe(tmp.name)
                return result["text"]
        except Exception as e:
            logger.error(f"Chunk transcription failed: {e}")
            raise Exception(f"Chunk transcription failed: {str(e)}")

# Singleton instance
transcription_service = TranscriptionService()
