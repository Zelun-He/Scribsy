# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000 WEB_CONCURRENCY=1 WEB_TIMEOUT=180 OMP_NUM_THREADS=2
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
# Install the official CPU wheel first so Whisper cannot pull CUDA PyTorch.
RUN python -m pip install --no-cache-dir 'torch==2.14.1+cpu' --index-url https://download.pytorch.org/whl/cpu \
    && python -m pip install --no-cache-dir -r requirements.txt \
    && python -c "import torch; assert torch.version.cuda is None"
COPY app ./app
COPY start_railway_simple.sh ./start_railway_simple.sh
EXPOSE 8000
CMD ["bash", "start_railway_simple.sh"]
