FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000 WEB_CONCURRENCY=1 WEB_TIMEOUT=180 OMP_NUM_THREADS=1 WHISPER_MODEL=tiny
WORKDIR /app

COPY requirements.txt .
# CTranslate2 uses CPU int8; PyAV bundles the FFmpeg decoder libraries.
# Avoid PyTorch, Triton and CUDA dependencies on the 512 MB service.
RUN --mount=type=cache,id=s/41a265a4-0ab3-4fa6-b3c2-85fcca6a866f-/root/cache/pip,target=/root/.cache/pip \
    python -m pip install -r requirements.txt \
    && python -c "import faster_whisper, av, importlib.util; assert importlib.util.find_spec('torch') is None; assert importlib.util.find_spec('triton') is None" \
    && python -c "import tempfile, wave; from faster_whisper.audio import decode_audio; f=tempfile.NamedTemporaryFile(suffix='.wav'); w=wave.open(f.name, 'wb'); w.setparams((1, 2, 16000, 0, 'NONE', 'NONE')); w.writeframes(bytes(3200)); w.close(); assert len(decode_audio(f.name)) == 1600"
COPY app ./app
COPY start_railway_simple.sh ./start_railway_simple.sh
EXPOSE 8000
CMD ["bash", "start_railway_simple.sh"]
