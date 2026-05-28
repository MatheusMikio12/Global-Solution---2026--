"""
OVERWATCH — API REST (FastAPI)
Expõe o pipeline como endpoints prontos para consumo pelo front-end.

Instalação:  pip install fastapi uvicorn
Execução:    python api.py
Docs:        http://localhost:8000/docs   (Swagger automático)

Endpoints:
  GET  /status              → saúde da API
  POST /pipeline/rodar      → executa o pipeline completo
  GET  /resultados          → retorna o último JSON gerado
  GET  /resultados/resumo   → apenas as métricas gerais
  GET  /resultados/alertas  → lista de alertas classificados
  GET  /resultados/regioes  → estatísticas por região
"""

import os
import json
import traceback
from datetime import datetime
from typing import Optional

import uvicorn
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="OVERWATCH API",
    description="Pipeline de Previsão Climática com Dados Espaciais — FIAP GS 2026",
    version="1.0.0",
)

# CORS aberto para o front-end conseguir chamar a API em desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # em produção, substitua por ["http://localhost:3000"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Estado interno do pipeline (em memória)
_estado = {
    "status":      "idle",        # idle | running | done | error
    "iniciado_em": None,
    "concluido_em": None,
    "erro":        None,
    "com_ia":      True,
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class PipelineConfig(BaseModel):
    usar_ia: bool = True
    max_alertas_por_regiao: int = 10


# ── Helpers ───────────────────────────────────────────────────────────────────

def _carregar_json() -> dict:
    """Lê o arquivo de resultados gerado pelo pipeline."""
    if not os.path.exists(config.ARQUIVO_JSON):
        raise HTTPException(
            status_code=404,
            detail="Nenhum resultado encontrado. Execute POST /pipeline/rodar primeiro."
        )
    with open(config.ARQUIVO_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def _executar_pipeline(usar_ia: bool, max_alertas: int):
    """Roda o pipeline completo em background."""
    _estado["status"]      = "running"
    _estado["iniciado_em"] = datetime.now().isoformat()
    _estado["erro"]        = None
    _estado["com_ia"]      = usar_ia

    try:
        from modulo1_gerador       import gerar_dados_climaticos
        from modulo2_ingestao      import carregar_e_limpar
        from modulo3_anomalias     import detectar_anomalias
        from modulo5_relatorio     import gerar_relatorio, exportar_json

        os.makedirs(config.DIR_DATA,    exist_ok=True)
        os.makedirs(config.DIR_OUTPUTS, exist_ok=True)

        gerar_dados_climaticos()
        df = carregar_e_limpar()
        df = detectar_anomalias(df)

        if usar_ia and config.GOOGLE_API_KEY:
            from modulo4_classificacao_ia import classificar_todos_riscos
            df = classificar_todos_riscos(df, max_por_regiao=max_alertas)

        gerar_relatorio(df)
        exportar_json(df)

        _estado["status"]       = "done"
        _estado["concluido_em"] = datetime.now().isoformat()

    except Exception as e:
        _estado["status"] = "error"
        _estado["erro"]   = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(f"[API] ERRO no pipeline: {_estado['erro']}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/status", tags=["Geral"])
def status():
    """Verifica se a API está online e retorna o estado atual do pipeline."""
    return {
        "api":            "online",
        "pipeline":       _estado["status"],
        "iniciado_em":    _estado["iniciado_em"],
        "concluido_em":   _estado["concluido_em"],
        "ia_disponivel":  bool(config.GOOGLE_API_KEY),
        "erro":           _estado["erro"],
    }


@app.post("/pipeline/rodar", tags=["Pipeline"])
def rodar_pipeline(cfg: PipelineConfig, background_tasks: BackgroundTasks):
    """
    Dispara o pipeline completo em background.
    Retorna imediatamente — acompanhe o progresso em GET /status.
    """
    if _estado["status"] == "running":
        raise HTTPException(status_code=409, detail="Pipeline já está em execução.")

    background_tasks.add_task(_executar_pipeline, cfg.usar_ia, cfg.max_alertas_por_regiao)
    return {
        "mensagem":    "Pipeline iniciado em background.",
        "acompanhe":   "/status",
        "resultados":  "/resultados (disponível após conclusão)",
    }


@app.get("/resultados", tags=["Resultados"])
def resultados_completos():
    """Retorna o JSON completo gerado pelo pipeline."""
    return _carregar_json()


@app.get("/resultados/resumo", tags=["Resultados"])
def resumo():
    """Métricas gerais — ideal para cards de KPI no front-end."""
    return _carregar_json()["resumo"]


@app.get("/resultados/alertas", tags=["Resultados"])
def alertas(
    severidade: Optional[str] = Query(None, description="Filtrar por: baixa, media, alta, critica"),
    regiao:     Optional[str] = Query(None, description="Filtrar por região"),
    limite:     int           = Query(50, description="Máximo de alertas retornados"),
):
    """
    Lista de alertas classificados pela IA.
    Suporta filtros por severidade e região.
    """
    dados = _carregar_json()["alertas"]

    if severidade:
        dados = [a for a in dados if a.get("severidade", "").lower() == severidade.lower()]
    if regiao:
        dados = [a for a in dados if regiao.lower() in a.get("regiao", "").lower()]

    return {"total": len(dados), "alertas": dados[:limite]}


@app.get("/resultados/regioes", tags=["Resultados"])
def por_regiao(regiao: Optional[str] = Query(None, description="Nome da região específica")):
    """Estatísticas por região — ideal para gráficos de radar/barra no front-end."""
    dados = _carregar_json()["por_regiao"]
    if regiao:
        if regiao not in dados:
            raise HTTPException(status_code=404, detail=f"Região '{regiao}' não encontrada.")
        return {regiao: dados[regiao]}
    return dados


@app.get("/resultados/serie-temporal", tags=["Resultados"])
def serie_temporal(regiao: Optional[str] = Query(None, description="Filtrar por região")):
    """Série temporal amostrada — ideal para gráficos de linha no front-end."""
    dados = _carregar_json()["serie_temporal"]
    if regiao:
        dados = [p for p in dados if p.get("regiao", "").lower() == regiao.lower()]
    return {"total_pontos": len(dados), "serie": dados}


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("  🛰️  OVERWATCH API — iniciando servidor")
    print(f"  http://{config.API_HOST}:{config.API_PORT}")
    print(f"  Docs: http://localhost:{config.API_PORT}/docs")
    print("=" * 55)
    uvicorn.run("api:app", host=config.API_HOST, port=config.API_PORT, reload=True)
