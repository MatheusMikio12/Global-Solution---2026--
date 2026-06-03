"""
OVERWATCH · GenAI API (FastAPI) — ORBITAL SENTINEL
Assistente RAG (Retrieval-Augmented Generation) para previsão climática e
prevenção de desastres naturais, baseado em documentos técnicos.

Pilha:  LlamaIndex · FastEmbed/ONNX (BAAI/bge-small-en-v1.5) · Groq (llama-3.3-70b)
Roda:   python api.py
Docs:   http://localhost:8003/docs

Endpoints:
  GET  /genai/status      → saúde da API e estado do índice RAG
  GET  /genai/info        → arquitetura, base de conhecimento e exemplos
  GET  /genai/exemplos    → perguntas sugeridas para o front-end
  POST /genai/inicializar → força a construção do índice (download do embedding)
  POST /genai/chat        → faz uma pergunta ao assistente (RAG)
  POST /genai/documento   → adiciona um documento à base e reindexa
"""

import os
import tempfile
from datetime import datetime

import uvicorn
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
import rag_engine

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="OVERWATCH · GenAI API (ORBITAL SENTINEL)",
    description="Assistente RAG para dados espaciais e desastres naturais — FIAP GS 2026",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    mensagem: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/genai/status", tags=["Geral"])
def status():
    """Estado da API e do índice RAG (carregado sob demanda)."""
    st = rag_engine.status()
    return {
        "api": "online",
        "rag": st["estado"],
        "documentos": st["documentos"],
        "erro": st["erro"],
        "llm": config.LLM_MODEL,
        "embedding": config.EMBED_MODEL,
        "ia_disponivel": bool(config.GROQ_API_KEY),
    }


@app.get("/genai/info", tags=["Informações"])
def info():
    """Arquitetura, base de conhecimento e métricas do sistema RAG."""
    return {
        "assistente": {
            "nome": "ORBITAL SENTINEL",
            "tipo": "RAG (Retrieval-Augmented Generation)",
            "papel": "Especialista em dados espaciais, previsão climática e desastres naturais",
            "idioma": "Português do Brasil",
        },
        "pilha": {
            "framework": "LlamaIndex",
            "embedding": f"{config.EMBED_MODEL} (FastEmbed/ONNX — sem torch)",
            "llm": f"{config.LLM_MODEL} (Groq)",
            "chunking": f"{config.CHUNK_SIZE} tokens · overlap {config.CHUNK_OVERLAP}",
            "top_k": config.TOP_K,
            "vector_store": "VectorStoreIndex (persistido em disco)",
        },
        "base_conhecimento": {
            "documentos": rag_engine.status()["documentos"],
            "temas": [
                "Sensoriamento remoto (MODIS, IMERG, SMAP, SRTM)",
                "Previsão de enchentes, secas e queimadas",
                "Infraestrutura espacial brasileira (INPE, CEMADEN, Amazônia-1)",
                "IA e RAG para defesa civil",
            ],
        },
        "exemplos": config.PERGUNTAS_EXEMPLO,
        "aplicacao": (
            "Complementa o OVERWATCH respondendo perguntas em linguagem natural sobre "
            "protocolos, dados históricos e tecnologias espaciais, com citação das fontes."
        ),
    }


@app.get("/genai/exemplos", tags=["Informações"])
def exemplos():
    """Perguntas sugeridas — ideal para botões de atalho no front-end."""
    return {"exemplos": config.PERGUNTAS_EXEMPLO}


@app.post("/genai/inicializar", tags=["RAG"])
def inicializar(background_tasks: BackgroundTasks):
    """
    Dispara a construção do índice RAG em background.
    A primeira chamada baixa o modelo de embedding (pode levar 1-2 min).
    Acompanhe o progresso em GET /genai/status.
    """
    st = rag_engine.status()
    if st["estado"] == "pronto":
        return {"mensagem": "Índice RAG já está pronto.", "rag": "pronto"}
    background_tasks.add_task(rag_engine.inicializar)
    return {"mensagem": "Inicialização do RAG iniciada em background.", "acompanhe": "/genai/status"}


@app.post("/genai/chat", tags=["RAG"])
def chat(req: ChatRequest):
    """
    Faz uma pergunta ao **ORBITAL SENTINEL**.

    A resposta é gerada exclusivamente a partir dos documentos indexados,
    com a lista de fontes consultadas (arquivo + score de similaridade).
    """
    pergunta = (req.mensagem or "").strip()
    if not pergunta:
        raise HTTPException(400, "A mensagem não pode ser vazia.")
    try:
        resultado = rag_engine.consultar(pergunta)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(503, f"Motor RAG indisponível: {e}")
    return {"data": datetime.now().isoformat(timespec="seconds"), **resultado}


@app.post("/genai/documento", tags=["RAG"])
async def documento(file: UploadFile = File(..., description="Documento (PDF/TXT/MD) a indexar")):
    """Adiciona um documento à base de conhecimento e reconstrói o índice."""
    nome = file.filename or "documento"
    if not nome.lower().endswith((".pdf", ".txt", ".md")):
        raise HTTPException(400, "Formato não suportado. Envie .pdf, .txt ou .md.")
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Arquivo vazio.")

    sufixo = os.path.splitext(nome)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=sufixo) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name
    try:
        documentos = rag_engine.adicionar_documento(tmp_path, nome)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(503, f"Falha ao indexar o documento: {e}")
    finally:
        os.unlink(tmp_path)

    return {"mensagem": f"'{nome}' adicionado e indexado.", "documentos": documentos}


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("  OVERWATCH GenAI API (ORBITAL SENTINEL) - iniciando")
    print(f"  http://{config.API_HOST}:{config.API_PORT}")
    print(f"  Docs: http://localhost:{config.API_PORT}/docs")
    print("=" * 55)
    uvicorn.run("api:app", host=config.API_HOST, port=config.API_PORT, reload=True)
