"""
OVERWATCH · GenAI — Motor RAG (ORBITAL SENTINEL)
Encapsula a indexação (FastEmbed/ONNX + VectorStore) e a consulta (Groq LLM),
exatamente como nas Células 4-5 do notebook, porém reutilizável pela API.
"""

import os
import threading

import config
from knowledge_base import garantir_base

# Estado do motor (carregado sob demanda — o download do modelo de embedding
# pode levar 1-2 min na primeira execução).
_index = None
_query_engine = None
_lock = threading.Lock()
_status = {
    "estado": "nao_inicializado",   # nao_inicializado | pronto | erro
    "erro": None,
    "documentos": [],
}


def _configurar_settings():
    """Configura embedding, LLM e chunking globais do LlamaIndex."""
    from llama_index.core import Settings
    from llama_index.core.node_parser import SentenceSplitter
    from llama_index.embeddings.fastembed import FastEmbedEmbedding
    from llama_index.llms.groq import Groq

    Settings.embed_model = FastEmbedEmbedding(model_name=config.EMBED_MODEL)
    Settings.llm = Groq(
        model=config.LLM_MODEL,
        api_key=config.GROQ_API_KEY,
        system_prompt=config.SYSTEM_PROMPT,
    )
    Settings.node_parser = SentenceSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
    )


def _construir_index():
    """(Re)constrói o índice vetorial a partir dos documentos em DATA_DIR."""
    from llama_index.core import SimpleDirectoryReader, VectorStoreIndex

    docs = SimpleDirectoryReader(
        input_dir=config.DATA_DIR,
        recursive=True,
        required_exts=[".pdf", ".txt", ".md"],
    ).load_data()

    idx = VectorStoreIndex.from_documents(docs, show_progress=True)
    os.makedirs(config.STORAGE_DIR, exist_ok=True)
    idx.storage_context.persist(persist_dir=config.STORAGE_DIR)
    return idx


def inicializar() -> dict:
    """Garante a base, configura modelos e constrói o índice. Idempotente."""
    global _index, _query_engine
    with _lock:
        if _status["estado"] == "pronto":
            return _status
        try:
            documentos = garantir_base()
            _configurar_settings()
            _index = _construir_index()
            _query_engine = _index.as_query_engine(
                similarity_top_k=config.TOP_K, streaming=False, verbose=False
            )
            _status["estado"] = "pronto"
            _status["erro"] = None
            _status["documentos"] = documentos
            print(f"[GenAI] RAG pronto · {len(documentos)} documento(s): {documentos}")
        except Exception as e:  # noqa: BLE001
            _status["estado"] = "erro"
            _status["erro"] = f"{type(e).__name__}: {e}"
            print(f"[GenAI] ERRO ao inicializar RAG: {_status['erro']}")
        return _status


def pronto() -> bool:
    return _status["estado"] == "pronto"


def status() -> dict:
    return dict(_status)


def adicionar_documento(caminho_origem: str, nome_arquivo: str) -> list[str]:
    """Copia um arquivo para a base e reconstrói o índice. Retorna os documentos."""
    import shutil

    if _status["estado"] != "pronto":
        inicializar()
    os.makedirs(config.DATA_DIR, exist_ok=True)
    destino = os.path.join(config.DATA_DIR, os.path.basename(nome_arquivo))
    shutil.copy(caminho_origem, destino)

    global _index, _query_engine
    with _lock:
        _index = _construir_index()
        _query_engine = _index.as_query_engine(
            similarity_top_k=config.TOP_K, streaming=False, verbose=False
        )
        _status["documentos"] = garantir_base()
    return _status["documentos"]


def consultar(pergunta: str) -> dict:
    """Executa uma consulta RAG e devolve a resposta + fontes consultadas."""
    if _status["estado"] != "pronto":
        inicializar()
    if _query_engine is None:
        raise RuntimeError(_status["erro"] or "Motor RAG indisponível.")

    resposta = _query_engine.query(pergunta)
    fontes = []
    if hasattr(resposta, "source_nodes") and resposta.source_nodes:
        for i, node in enumerate(resposta.source_nodes, 1):
            fontes.append({
                "indice": i,
                "arquivo": node.metadata.get("file_name", "desconhecido"),
                "score": round(float(node.score), 4) if getattr(node, "score", None) else None,
            })

    return {
        "pergunta": pergunta,
        "resposta": str(resposta),
        "fontes": fontes,
    }
