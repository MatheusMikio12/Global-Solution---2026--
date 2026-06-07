# Dockerfile — Computação Neuromórfica API (NeuroSpace Alert)
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8004

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8004/neuro/status || exit 1

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8004"]
