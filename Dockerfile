# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000 WEB_CONCURRENCY=1 WEB_TIMEOUT=180 OMP_NUM_THREADS=2
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
# Install the official CPU wheel first so Whisper cannot pull CUDA PyTorch.
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install 'torch==2.14.1+cpu' --index-url https://download.pytorch.org/whl/cpu
# Whisper's Linux dependency list includes the Triton GPU compiler. Its CPU
# inference/alignment paths use the libraries installed explicitly here instead.
RUN --mount=type=cache,target=/root/.cache/pip \
    sed '/^openai-whisper/d' requirements.txt > /tmp/backend-requirements.txt \
    && python -m pip install -r /tmp/backend-requirements.txt numba numpy tqdm more-itertools tiktoken \
    && python -m pip install --no-deps 'openai-whisper==20250625' \
    && python -c "import torch, whisper, importlib.util; assert torch.version.cuda is None; assert importlib.util.find_spec('triton') is None"
COPY app ./app
COPY start_railway_simple.sh ./start_railway_simple.sh
EXPOSE 8000
CMD ["bash", "start_railway_simple.sh"]
