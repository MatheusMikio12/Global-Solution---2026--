# Dockerfile — Visão Computacional API (detecção de incêndios · MobileNetV2)
FROM python:3.11-slim

WORKDIR /app

# Dependências de sistema para Pillow / tensorflow
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Instala dependências primeiro (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copia código e modelo
COPY . .

EXPOSE 8002

# Health check interno
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8002/visao/status || exit 1

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8002"]
