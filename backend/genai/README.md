# OVERWATCH · GenAI (ORBITAL SENTINEL)

Assistente conversacional **RAG** (Retrieval-Augmented Generation) para previsão
climática e prevenção de desastres naturais. Responde perguntas em linguagem
natural baseando-se **exclusivamente** em documentos técnicos indexados, citando
as fontes consultadas.

## Arquitetura

| Componente     | Tecnologia                                            |
|----------------|-------------------------------------------------------|
| Orquestração   | **LlamaIndex** (`VectorStoreIndex`)                   |
| Embeddings     | **FastEmbed/ONNX** — `BAAI/bge-small-en-v1.5` (sem torch) |
| LLM            | **Groq** — `llama-3.3-70b-versatile`                  |
| Chunking       | `SentenceSplitter` · 512 tokens · overlap 64          |
| Recuperação    | Top-K = 4 chunks por consulta                         |

A base de conhecimento inicial (`data/satelites.txt`, `data/desastres_brasil.txt`)
é gerada automaticamente no primeiro start a partir de `knowledge_base.py`.

> Origem: notebook `OVERWATCH.ipynb` (interface Gradio do Colab) convertido em
> serviço FastAPI para integrar com o front-end e o restante do backend.

## Instalação

```bash
cd backend/genai
pip install -r requirements.txt
```

## Chave da Groq

Crie uma chave gratuita em <https://console.groq.com> e exporte-a antes de rodar:

```bash
# PowerShell
$env:GROQ_API_KEY = "gsk_..."
# bash
export GROQ_API_KEY="gsk_..."
```

Sem a variável, é usada a chave de demonstração do notebook (`config.py`).

## Execução

```bash
cd backend/genai
python api.py
```

API em `http://localhost:8003` · Docs Swagger em `http://localhost:8003/docs`

> Na **primeira** consulta o modelo de embedding é baixado (~1-2 min). Você pode
> aquecer o índice antecipadamente com `POST /genai/inicializar`.

## Endpoints

| Método | Rota                  | Descrição                                          |
|--------|-----------------------|----------------------------------------------------|
| GET    | `/genai/status`       | Saúde da API e estado do índice RAG                |
| GET    | `/genai/info`         | Arquitetura, base de conhecimento e exemplos       |
| GET    | `/genai/exemplos`     | Perguntas sugeridas                                |
| POST   | `/genai/inicializar`  | Constrói o índice em background (aquecimento)      |
| POST   | `/genai/chat`         | Pergunta ao assistente — `{ "mensagem": "..." }`   |
| POST   | `/genai/documento`    | Adiciona um doc (PDF/TXT/MD) e reindexa            |

Exemplo:

```bash
curl -X POST http://localhost:8003/genai/chat \
  -H "Content-Type: application/json" \
  -d '{"mensagem": "Como satélites ajudam a prever enchentes?"}'
```

```json
{
  "data": "2026-06-03T10:00:00",
  "pergunta": "Como satélites ajudam a prever enchentes?",
  "resposta": "O satélite SMAP mede a umidade do solo...",
  "fontes": [
    { "indice": 1, "arquivo": "satelites.txt", "score": 0.78 }
  ]
}
```

## Front-end

A aba **Generative AI** (`frontend/src/App.jsx` → `TabGenerative`) consome esta
API: chat com o ORBITAL SENTINEL, botões de perguntas de exemplo e exibição das
fontes. URL configurável via `VITE_GENAI_API_URL` (padrão `:8003`).
