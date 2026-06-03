"""
OVERWATCH · GenAI (ORBITAL SENTINEL) — Configurações Centralizadas
Altere aqui sem precisar mexer em nenhum outro arquivo.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).parent

# ── API Groq ────────────────────────────────────────────────────────────────
# Crie sua chave gratuita em https://console.groq.com
# Em produção, defina a variável de ambiente GROQ_API_KEY (não versione a chave).
GROQ_API_KEY = os.environ.get(
    "GROQ_API_KEY",
    "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",  # fallback do notebook
)

# ── Modelos ─────────────────────────────────────────────────────────────────
# FastEmbed usa ONNX (sem torch) — evita conflito de dtype com numpy.
EMBED_MODEL   = "BAAI/bge-small-en-v1.5"
LLM_MODEL     = "llama-3.3-70b-versatile"   # LLM servido pela Groq
CHUNK_SIZE    = 512
CHUNK_OVERLAP = 64
TOP_K         = 4                           # chunks recuperados por consulta

# ── Armazenamento ───────────────────────────────────────────────────────────
DATA_DIR    = str(BASE_DIR / "data")        # documentos da base de conhecimento
STORAGE_DIR = str(BASE_DIR / "storage")     # índice vetorial persistido

# ── Prompt do assistente ────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "Voce e o ORBITAL SENTINEL, assistente especializado em dados espaciais, "
    "previsao climatica e prevencao de desastres naturais. Suas respostas devem: "
    "1) Ser baseadas EXCLUSIVAMENTE nos documentos fornecidos. "
    "2) Citar o documento de origem quando possivel. "
    "3) Indicar quando a informacao NAO estiver nos documentos. "
    "4) Conectar tecnologias espaciais com impactos na sociedade brasileira. "
    "5) Responder sempre em Portugues do Brasil."
)

# ── Perguntas de exemplo (usadas pelo front-end) ────────────────────────────
PERGUNTAS_EXEMPLO = [
    "Como satelites ajudam a prever enchentes?",
    "Quais dados monitoram secas no Brasil?",
    "Como a IA detecta queimadas via sensoriamento remoto?",
    "Qual o papel do CEMADEN na prevencao de desastres?",
    "Como dados espaciais apoiam regioes em emergencia?",
]

# ── API Server ──────────────────────────────────────────────────────────────
API_HOST = "0.0.0.0"
API_PORT = 8003
