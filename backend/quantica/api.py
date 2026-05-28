"""
OVERWATCH · Quantum API (FastAPI)
Classifica eventos climáticos extremos usando modelos QML
treinados com dados reais NASA POWER v2.9.2.

Fonte:  São Paulo (-23.55°, -46.63°) · 2015–2022 · 2.922 registros
Roda:   python api.py
Docs:   http://localhost:8001/docs
"""

import os
import joblib
import numpy as np
from pathlib import Path
from typing import Optional
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Configuração ───────────────────────────────────────────────────────────────

BASE_DIR  = Path(__file__).parent
N_QUBITS  = 3
FEATURES  = ["T2M", "PRECTOTCORR", "WS10M", "RH2M", "ALLSKY_SFC_LW_DWN"]

app = FastAPI(
    title="OVERWATCH · Quantum API",
    description="QML para classificação de eventos climáticos extremos — NASA POWER",
    version="1.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Carregamento dos Modelos ───────────────────────────────────────────────────

_modelos: dict = {}
_status:  dict = {}


def _carregar():
    # ── Clássicos (scikit-learn) ─────────────────────────────────────────────
    for nome, arquivo in [
        ("scaler",        "scaler.pkl"),
        ("pca",           "pca_transform.pkl"),
        ("svm_rbf",       "svm_rbf.pkl"),
        ("random_forest", "random_forest.pkl"),
    ]:
        try:
            _modelos[nome] = joblib.load(BASE_DIR / arquivo)
            _status[nome]  = "ok"
        except Exception as e:
            _status[nome]  = f"erro: {e}"

    # ── Quânticos (Qiskit) ───────────────────────────────────────────────────
    try:
        from qiskit.circuit.library import ZZFeatureMap, RealAmplitudes
        from qiskit_machine_learning.kernels import FidelityStatevectorKernel
        from qiskit_machine_learning.algorithms import QSVC, VQC
        from qiskit.primitives import StatevectorSampler
        from qiskit_algorithms.optimizers import COBYLA

        # QSVC — ZZFeatureMap(3, reps=1, entanglement='full') · C=5.0
        fm_qsvc = ZZFeatureMap(N_QUBITS, reps=1, entanglement="full")
        qk      = FidelityStatevectorKernel(feature_map=fm_qsvc)
        qsvc    = QSVC(quantum_kernel=qk, C=5.0)
        qsvc.load(str(BASE_DIR / "qsvc_model.model"))
        _modelos["qsvc"] = qsvc
        _status["qsvc"]  = "ok"

        # VQC — ZZFeatureMap(3, reps=1) + RealAmplitudes(3, reps=2) · 9 params
        vqc = VQC(
            num_qubits=N_QUBITS,
            feature_map=ZZFeatureMap(N_QUBITS, reps=1),
            ansatz=RealAmplitudes(N_QUBITS, reps=2),
            optimizer=COBYLA(maxiter=1),
            sampler=StatevectorSampler(),
        )
        vqc.load(str(BASE_DIR / "vqc_model.model"))
        _modelos["vqc"] = vqc
        _status["vqc"]  = "ok"

    except ImportError:
        msg = "qiskit-machine-learning não instalado (pip install qiskit-machine-learning)"
        _status["qsvc"] = msg
        _status["vqc"]  = msg
    except Exception as e:
        _status["qsvc"] = f"erro ao carregar: {e}"
        _status["vqc"]  = f"erro ao carregar: {e}"

    print(f"[QML] Modelos carregados: {[k for k,v in _status.items() if v == 'ok']}")
    print(f"[QML] Erros: {[k for k,v in _status.items() if v != 'ok']}")


_carregar()

# ── Schemas ────────────────────────────────────────────────────────────────────

class EntradaClimatica(BaseModel):
    T2M:               float = Field(..., description="Temperatura a 2m (°C)",                example=22.5)
    PRECTOTCORR:       float = Field(..., description="Precipitação corrigida (mm/dia)",        example=5.0)
    WS10M:             float = Field(..., description="Velocidade do vento a 10m (m/s)",       example=3.5)
    RH2M:              float = Field(..., description="Umidade relativa a 2m (%)",             example=78.0)
    ALLSKY_SFC_LW_DWN: float = Field(..., description="Radiação solar descendente (W/m²)",    example=370.0)
    date:              Optional[str] = Field(None, description="Data YYYY-MM-DD — informativo")


class EntradaNASA(BaseModel):
    latitude:  float = Field(-23.55, description="Latitude decimal")
    longitude: float = Field(-46.63, description="Longitude decimal")
    start:     str   = Field("20240101", description="Data início YYYYMMDD")
    end:       str   = Field("20241231", description="Data fim YYYYMMDD")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _preprocessar(dados: dict) -> np.ndarray:
    """Scaler MinMax(-π, π) → PCA 3 componentes — idêntico ao treino."""
    if "scaler" not in _modelos or "pca" not in _modelos:
        raise HTTPException(503, "Pré-processadores não carregados.")
    x        = np.array([[dados[f] for f in FEATURES]])
    x_scaled = _modelos["scaler"].transform(x)
    x_pca    = _modelos["pca"].transform(x_scaled)
    return x_pca


def _prever_todos(x_pca: np.ndarray) -> dict:
    pred = {}

    if "svm_rbf" in _modelos and _status.get("svm_rbf") == "ok":
        svm   = _modelos["svm_rbf"]
        classe = int(svm.predict(x_pca)[0])
        prob   = float(svm.predict_proba(x_pca)[0][1])
        pred["svm_rbf"] = {
            "classe": classe, "label": "Extremo" if classe else "Normal",
            "probabilidade": round(prob, 4), "auc_treino": 0.9330, "tipo": "clássico",
        }

    if "random_forest" in _modelos and _status.get("random_forest") == "ok":
        rf    = _modelos["random_forest"]
        classe = int(rf.predict(x_pca)[0])
        prob   = float(rf.predict_proba(x_pca)[0][1])
        pred["random_forest"] = {
            "classe": classe, "label": "Extremo" if classe else "Normal",
            "probabilidade": round(prob, 4), "auc_treino": 0.9256, "tipo": "clássico",
        }

    if "qsvc" in _modelos and _status.get("qsvc") == "ok":
        try:
            qsvc  = _modelos["qsvc"]
            classe = int(qsvc.predict(x_pca)[0])
            df_val = float(qsvc.decision_function(x_pca)[0])
            pred["qsvc"] = {
                "classe": classe, "label": "Extremo" if classe else "Normal",
                "decision_function": round(df_val, 4), "auc_treino": 0.5280, "tipo": "quântico",
            }
        except Exception as e:
            pred["qsvc"] = {"erro": str(e), "tipo": "quântico"}

    if "vqc" in _modelos and _status.get("vqc") == "ok":
        try:
            vqc   = _modelos["vqc"]
            classe = int(vqc.predict(x_pca)[0])
            pred["vqc"] = {
                "classe": classe, "label": "Extremo" if classe else "Normal",
                "auc_treino": 0.5000, "tipo": "quântico",
            }
        except Exception as e:
            pred["vqc"] = {"erro": str(e), "tipo": "quântico"}

    return pred


def _consenso(pred: dict) -> dict:
    votos = [v["classe"] for v in pred.values() if "classe" in v]
    if not votos:
        return {"label": "indefinido", "votos_extremo": 0, "votos_normal": 0, "total": 0}
    v_ext = sum(votos)
    v_nor = len(votos) - v_ext
    return {
        "label":         "Extremo" if v_ext > v_nor else "Normal",
        "votos_extremo": v_ext,
        "votos_normal":  v_nor,
        "total_modelos": len(votos),
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/quantica/status", tags=["Geral"])
def status():
    """Estado da API e dos modelos carregados."""
    return {
        "api":      "online",
        "modelos":  _status,
        "n_qubits": N_QUBITS,
        "features": FEATURES,
        "fonte":    "NASA POWER v2.9.2 · São Paulo · 2015–2022",
    }


@app.get("/quantica/modelos", tags=["Informações"])
def info_modelos():
    """Métricas, circuitos e configuração de cada modelo."""
    return {
        "dataset": {
            "fonte":         "NASA POWER v2.9.2",
            "local":         "São Paulo (-23.55°, -46.63°)",
            "periodo":       "2015-01-01 → 2022-12-31",
            "registros":     2922,
            "extremos_pct":  21.0,
            "criterio":      "Percentil 90 (IPCC/INMET): T2M>p90∧PREC>p75 | PREC>p90 | WS10M>p90",
        },
        "preprocessamento": {
            "scaler":    "MinMaxScaler(feature_range=(-π, π))",
            "pca":       f"PCA(n_components={N_QUBITS}) — 93.2% variância explicada",
            "smote":     "SMOTE(random_state=42) aplicado apenas no treino",
            "split":     "75% treino / 25% teste (stratify=y)",
            "n_qubits_subconjunto": "250 amostras para QSVC · 80 para VQC",
        },
        "modelos": [
            {
                "id": "svm_rbf", "nome": "SVM-RBF", "tipo": "clássico",
                "config": "SVC(kernel='rbf', C=5.0, gamma='scale')",
                "acuracia": "84.95%", "f1": "70.59%", "auc": 0.9330,
                "treino_s": 0.010, "inferencia_ms": 0.019,
                "status": _status.get("svm_rbf", "?"),
            },
            {
                "id": "random_forest", "nome": "Random Forest", "tipo": "clássico",
                "config": "RandomForestClassifier(100, n_jobs=-1)",
                "acuracia": "84.95%", "f1": "69.95%", "auc": 0.9256,
                "treino_s": 0.229, "inferencia_ms": 0.360,
                "status": _status.get("random_forest", "?"),
            },
            {
                "id": "qsvc", "nome": "QSVC (FidelityQuantumKernel)", "tipo": "quântico",
                "circuito": "ZZFeatureMap(3, reps=1, entanglement='full')",
                "kernel":   "FidelityStatevectorKernel · C=5.0",
                "acuracia": "53.21%", "f1": "30.77%", "auc": 0.5280,
                "treino_s": 2.976, "inferencia_ms": 5.356,
                "diagnostico": "Concentração de kernel μ≈0.13 — dados reais indistinguíveis no espaço de Hilbert",
                "status": _status.get("qsvc", "?"),
            },
            {
                "id": "vqc", "nome": "VQC (RealAmplitudes + COBYLA)", "tipo": "quântico",
                "circuito":   "ZZFeatureMap(3, reps=1) + RealAmplitudes(3, reps=2)",
                "parametros": 9,
                "optimizer":  "COBYLA(maxiter=120) — convergência parcial (1.192 → 0.963)",
                "acuracia": "55.68%", "f1": "35.46%", "auc": 0.5000,
                "treino_s": 43.417, "inferencia_ms": 7.643,
                "diagnostico": "Barren plateau + autocorrelação temporal limitam convergência",
                "status": _status.get("vqc", "?"),
            },
        ],
        "diagnostico_nisq": (
            "Três causas estruturais para o gap quântico: "
            "(1) concentração de kernel intrínseca (μ≈0.13, dados reais difíceis de separar), "
            "(2) autocorrelação temporal da série climática, "
            "(3) distribuição assimétrica da precipitação (zero-inflada)."
        ),
    }


@app.post("/quantica/prever", tags=["Predição"])
def prever(entrada: EntradaClimatica):
    """
    Classifica um dia climático como Evento Extremo (1) ou Normal (0)
    usando todos os modelos disponíveis.

    Entrada: 5 variáveis NASA POWER para São Paulo.
    Saída:   predição de cada modelo + consenso por votação.
    """
    dados  = entrada.model_dump()
    x_pca  = _preprocessar(dados)
    pred   = _prever_todos(x_pca)
    cons   = _consenso(pred)

    return {
        "data":             dados.get("date") or datetime.now().strftime("%Y-%m-%d"),
        "entrada":          {k: dados[k] for k in FEATURES},
        "pca_componentes":  [round(v, 6) for v in x_pca[0].tolist()],
        "predicoes":        pred,
        "consenso":         cons,
    }


@app.post("/quantica/buscar-e-prever", tags=["Predição"])
def buscar_e_prever(params: EntradaNASA):
    """
    Busca dados reais da API NASA POWER e classifica cada dia como
    Evento Extremo ou Normal usando todos os modelos.
    """
    import requests as req

    try:
        r = req.get(
            "https://power.larc.nasa.gov/api/temporal/daily/point",
            params={
                "parameters": "T2M,PRECTOTCORR,WS10M,RH2M,ALLSKY_SFC_LW_DWN",
                "community": "RE",
                "longitude":  params.longitude,
                "latitude":   params.latitude,
                "start":      params.start,
                "end":        params.end,
                "format":     "JSON",
            },
            timeout=30,
        )
        r.raise_for_status()
        raw = r.json()
    except Exception as e:
        raise HTTPException(502, f"Erro ao buscar NASA POWER: {e}")

    p     = raw["properties"]["parameter"]
    datas = list(p["T2M"].keys())
    serie = []

    for data in datas:
        try:
            if any(p[f][data] < -998 for f in FEATURES):
                continue
            entrada = {
                "T2M":               p["T2M"][data],
                "PRECTOTCORR":       p["PRECTOTCORR"][data],
                "WS10M":             p["WS10M"][data],
                "RH2M":              p["RH2M"][data],
                "ALLSKY_SFC_LW_DWN": p["ALLSKY_SFC_LW_DWN"][data] * 41.667,
            }
            x_pca = _preprocessar(entrada)
            pred  = _prever_todos(x_pca)
            cons  = _consenso(pred)
            serie.append({
                "date":          f"{data[:4]}-{data[4:6]}-{data[6:]}",
                "entrada":       entrada,
                "consenso":      cons["label"],
                "votos_extremo": cons["votos_extremo"],
                "predicoes":     {k: v.get("label", "?") for k, v in pred.items() if "label" in v},
            })
        except Exception:
            continue

    n_ext = sum(1 for s in serie if s["consenso"] == "Extremo")
    return {
        "local":     f"({params.latitude}°, {params.longitude}°)",
        "periodo":   f"{params.start} → {params.end}",
        "total":     len(serie),
        "extremos":  n_ext,
        "taxa_pct":  round(n_ext / len(serie) * 100, 1) if serie else 0,
        "serie":     serie,
    }


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("  ⚛️  OVERWATCH Quantum API — iniciando")
    print("  http://0.0.0.0:8001")
    print("  Docs: http://localhost:8001/docs")
    print("=" * 55)
    uvicorn.run("api:app", host="0.0.0.0", port=8001, reload=True)
