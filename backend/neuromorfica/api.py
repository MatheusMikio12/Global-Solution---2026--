"""
OVERWATCH · Computação Neuromórfica API (FastAPI)
Simulador de um sensor neuromórfico de baixo consumo (memristor virtual) para
detecção de condição crítica em ambiente espacial / estação remota monitorada.

Conceito:  temperatura + radiação + poeira → tensão de entrada (V) →
           memristor virtual com memória local (estado w) → LED (APAGADO/AMARELO/VERMELHO)
Dataset:   5 h de operação, 1 leitura a cada 5 min (61 amostras).
Roda:      python api.py
Docs:      http://localhost:8004/docs
"""

from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Configuração ────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent

# O dataset bruto de entrada (dataset_neurosensor_espacial_5h.csv) não é versionado,
# mas as colunas físicas originais estão preservadas neste CSV de saída — usamos elas
# como fonte e re-simulamos para qualquer ajuste.
ARQUIVO_DADOS = BASE_DIR / "saida_sensor_espacial_Ajuste_B_equilibrado.csv"

COLUNAS_FISICAS = [
    "tempo_min", "temperatura_C", "radiacao_uSv_h", "poeira_pct",
    "consumo_W", "bateria_pct", "indice_risco_real", "condicao_real",
]

DT = 5  # intervalo entre leituras, em minutos

# Ajustes definidos pela equipe no notebook (faixas do enunciado)
AJUSTES_EQUIPE = {
    "Ajuste_A_sensivel":     {"V_limiar": 24, "taxa_chaveamento": 0.007},
    "Ajuste_B_equilibrado":  {"V_limiar": 28, "taxa_chaveamento": 0.005},
    "Ajuste_C_conservador":  {"V_limiar": 32, "taxa_chaveamento": 0.004},
}

app = FastAPI(
    title="OVERWATCH · Computação Neuromórfica API",
    description="Sensor neuromórfico (memristor virtual) de baixo consumo — FIAP GS 2026",
    version="1.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Carregamento dos dados ──────────────────────────────────────────────────────

_dados = None
_status = {"dados": "não carregado", "arquivo": None, "amostras": 0}


def _carregar():
    global _dados
    if not ARQUIVO_DADOS.exists():
        _status["dados"] = f"erro: arquivo não encontrado ({ARQUIVO_DADOS.name})"
        return
    try:
        df = pd.read_csv(ARQUIVO_DADOS)
        faltando = [c for c in COLUNAS_FISICAS if c not in df.columns]
        if faltando:
            _status["dados"] = f"erro: colunas ausentes {faltando}"
            return
        _dados = df[COLUNAS_FISICAS].copy()
        _status["dados"]    = "ok"
        _status["arquivo"]  = ARQUIVO_DADOS.name
        _status["amostras"] = int(len(_dados))
        print(f"[NEURO] Dados carregados: {ARQUIVO_DADOS.name}  ·  {len(_dados)} amostras")
    except Exception as e:
        _status["dados"] = f"erro ao carregar: {e}"
        print(f"[NEURO] ERRO ao carregar dados: {e}")


_carregar()

# ── Núcleo da simulação (portado do notebook) ───────────────────────────────────

def simular_sensor(dados: pd.DataFrame, V_limiar: float, taxa_chaveamento: float,
                   limiar_estado_alerta: float = 0.65,
                   limiar_estado_observacao: float = 0.35) -> pd.DataFrame:
    """Converte as variáveis físicas em tensão de entrada e simula o memristor virtual."""
    saida = dados.copy()

    # Normalização simples das variáveis físicas
    temp_norm   = np.clip((saida["temperatura_C"] - 20) / (55 - 20), 0, 1)
    rad_norm    = np.clip((saida["radiacao_uSv_h"] - 0.25) / (2.5 - 0.25), 0, 1)
    poeira_norm = np.clip(saida["poeira_pct"] / 100, 0, 1)

    # Conversão conceitual para tensão de entrada do circuito
    indice_sensor = 0.45 * temp_norm + 0.35 * rad_norm + 0.20 * poeira_norm
    saida["V_entrada"] = np.round(15 + 25 * indice_sensor, 2)

    estado_memristor, led, diagnostico_sensor = [], [], []
    w = 0.0

    for v in saida["V_entrada"]:
        if v > V_limiar:
            # O memristor acumula efeito quando a tensão passa do limiar
            w = min(1.0, w + taxa_chaveamento * (v - V_limiar) * DT * (1 - w))
        else:
            # Pequeno relaxamento quando o sinal fica abaixo do limiar
            w = max(0.0, w - 0.002 * DT * w)

        estado_memristor.append(round(w, 3))

        if w >= limiar_estado_alerta:
            led.append("VERMELHO");  diagnostico_sensor.append("ALERTA_CRITICO")
        elif w >= limiar_estado_observacao:
            led.append("AMARELO");   diagnostico_sensor.append("OBSERVACAO")
        else:
            led.append("APAGADO");   diagnostico_sensor.append("NORMAL")

    saida["estado_memristor"]   = estado_memristor
    saida["LED"]                = led
    saida["diagnostico_sensor"] = diagnostico_sensor
    return saida


def _transicoes(saida: pd.DataFrame) -> dict:
    nao_apagado = saida[saida["LED"] != "APAGADO"].head(1)
    vermelho    = saida[saida["LED"] == "VERMELHO"].head(1)
    return {
        "primeiro_LED_nao_apagado_min": None if nao_apagado.empty else int(nao_apagado["tempo_min"].iloc[0]),
        "primeiro_LED_vermelho_min":    None if vermelho.empty    else int(vermelho["tempo_min"].iloc[0]),
    }


def _contagem_led(saida: pd.DataFrame) -> dict:
    vc = saida["LED"].value_counts().to_dict()
    return {k: int(vc.get(k, 0)) for k in ("APAGADO", "AMARELO", "VERMELHO")}


def _rodar(V_limiar: float, taxa_chaveamento: float) -> dict:
    if _dados is None:
        raise HTTPException(503, "Dados não carregados. Verifique GET /neuro/status.")

    saida = simular_sensor(_dados, V_limiar, taxa_chaveamento)
    serie = [
        {
            "tempo_min":        int(r.tempo_min),
            "temperatura_C":    float(r.temperatura_C),
            "radiacao_uSv_h":   float(r.radiacao_uSv_h),
            "poeira_pct":       float(r.poeira_pct),
            "condicao_real":    str(r.condicao_real),
            "V_entrada":        float(r.V_entrada),
            "estado_memristor": float(r.estado_memristor),
            "LED":              str(r.LED),
            "diagnostico":      str(r.diagnostico_sensor),
        }
        for r in saida.itertuples()
    ]
    return {
        "V_limiar":         V_limiar,
        "taxa_chaveamento": taxa_chaveamento,
        "transicoes":       _transicoes(saida),
        "contagem_led":     _contagem_led(saida),
        "serie":            serie,
    }


# ── Schemas ─────────────────────────────────────────────────────────────────────

class SimularRequest(BaseModel):
    V_limiar: float = Field(28, ge=15, le=40, description="Tensão de limiar do memristor (15–40)")
    taxa_chaveamento: float = Field(0.005, gt=0, le=0.02, description="Taxa de chaveamento (0–0.02)")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/neuro/status", tags=["Geral"])
def status():
    """Estado da API e do dataset carregado."""
    return {
        "api":      "online",
        "dados":    _status["dados"],
        "arquivo":  _status["arquivo"],
        "amostras": _status["amostras"],
        "tarefa":   "Detecção neuromórfica de condição crítica (memristor virtual)",
    }


@app.get("/neuro/info", tags=["Informações"])
def info():
    """Cenário, modelo conceitual do sensor e parâmetros."""
    return {
        "sensor": {
            "nome":      "Sensor neuromórfico com memristor virtual",
            "tipo":      "Processamento local com memória (edge / low-power)",
            "entrada":   "temperatura (°C), radiação (µSv/h), poeira (%)",
            "conversao": "índice = 0.45·temp + 0.35·rad + 0.20·poeira  →  V = 15 + 25·índice",
            "memoria":   "estado w acumula acima de V_limiar e relaxa abaixo (memristor)",
            "saida":     "LED — APAGADO (NORMAL) · AMARELO (OBSERVAÇÃO, w≥0.35) · VERMELHO (ALERTA, w≥0.65)",
            "amostragem": f"1 leitura a cada {DT} min · 5 h de operação ({_status['amostras']} amostras)",
        },
        "cenario": (
            "Estação remota / módulo espacial monitorado por satélite. O sensor de baixo "
            "consumo detecta localmente a evolução para uma condição crítica (calor + radiação + "
            "poeira), acendendo o LED de alerta sem depender de processamento na nuvem."
        ),
        "ajustes": [
            {"nome": nome, **pars} for nome, pars in AJUSTES_EQUIPE.items()
        ],
        "limiares_estado": {"observacao": 0.35, "alerta_critico": 0.65},
        "baixo_consumo": (
            "Processamento ocorre no próprio sensor (memristor mantém o estado em memória "
            "física), dispensando GPU/nuvem — adequado a plataformas com energia solar limitada."
        ),
        "aplicacao": (
            "Complementa o OVERWATCH com um nó de borda neuromórfico: alertas locais de "
            "condição crítica são gerados em tempo real e podem alimentar o pipeline central."
        ),
    }


@app.get("/neuro/ajustes", tags=["Simulação"])
def ajustes():
    """Roda os três ajustes da equipe e devolve o resumo comparativo das transições."""
    if _dados is None:
        raise HTTPException(503, "Dados não carregados. Verifique GET /neuro/status.")

    resumo = []
    for nome, pars in AJUSTES_EQUIPE.items():
        saida = simular_sensor(_dados, pars["V_limiar"], pars["taxa_chaveamento"])
        resumo.append({
            "ajuste":           nome,
            "V_limiar":         pars["V_limiar"],
            "taxa_chaveamento": pars["taxa_chaveamento"],
            **_transicoes(saida),
            "contagem_led":     _contagem_led(saida),
        })
    return {"ajustes": resumo}


@app.post("/neuro/simular", tags=["Simulação"])
def simular(req: SimularRequest):
    """
    Roda a simulação do sensor neuromórfico para um par de parâmetros.

    Entrada: `V_limiar` e `taxa_chaveamento`.
    Saída:   série temporal (V, estado do memristor, LED) + transições e contagem de LEDs.
    """
    resultado = _rodar(req.V_limiar, req.taxa_chaveamento)
    return {
        "data": datetime.now().isoformat(timespec="seconds"),
        **resultado,
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("  OVERWATCH Neuromorfica API - iniciando")
    print("  http://0.0.0.0:8004")
    print("  Docs: http://localhost:8004/docs")
    print("=" * 55)
    uvicorn.run("api:app", host="0.0.0.0", port=8004, reload=True)
