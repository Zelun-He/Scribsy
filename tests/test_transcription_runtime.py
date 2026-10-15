import asyncio
import sys
import threading
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.services.transcription import TranscriptionService


def test_int8_cpu_runtime_consumes_segments_off_event_loop(monkeypatch):
    event_loop_thread = threading.get_ident()
    constructed = []
    def segments():
        assert threading.get_ident() != event_loop_thread
        yield SimpleNamespace(text=' Fictional recording. ')
        yield SimpleNamespace(text=' Follow up next week. ')
    class FakeModel:
        def __init__(self, model, **options):
            constructed.append((model, options))
        def transcribe(self, path, **options):
            assert options == {'beam_size': 1}
            return segments(), None
    monkeypatch.setitem(sys.modules, 'faster_whisper', SimpleNamespace(WhisperModel=FakeModel))
    service = TranscriptionService('tiny')
    async def run():
        return await asyncio.gather(*(service.transcribe(Path('fictional.wav')) for _ in range(2)))
    assert asyncio.run(run()) == ['Fictional recording. Follow up next week.'] * 2
    assert constructed == [('tiny', {'device': 'cpu', 'compute_type': 'int8', 'cpu_threads': 1, 'num_workers': 1})]


def test_failed_compact_model_does_not_load_larger_fallback(monkeypatch):
    attempted = []
    def fail(model, **options):
        attempted.append(model)
        raise RuntimeError('model unavailable')
    monkeypatch.setitem(sys.modules, 'faster_whisper', SimpleNamespace(WhisperModel=fail))
    with pytest.raises(Exception, match='model unavailable'):
        asyncio.run(TranscriptionService('tiny').transcribe(Path('fictional.wav')))
    assert attempted == ['tiny']
