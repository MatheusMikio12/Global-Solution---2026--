"""
OVERWATCH · Visão Computacional API (FastAPI)
Detecção de incêndios florestais (wildfire) a partir de imagens de satélite/aéreas
usando uma CNN MobileNetV2 (transfer learning).

Modelo:  modelo_wildfire (1).keras  ·  MobileNetV2 160×160×3 → sigmoid (1 saída)
Classes: 0 = sem incêndio (nowildfire) · 1 = incêndio (wildfire)
Roda:    python api.py
Docs:    http://localhost:8002/docs
"""

import io
import os
import glob
from pathlib import Path
from datetime import datetime

import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# ── Configuração ────────────────────────────────────────────────────────────────

BASE_DIR   = Path(__file__).parent
IMG_SIZE   = (160, 160)
THRESHOLD  = 0.5
CLASSES    = {0: "Sem Incêndio", 1: "Incêndio Detectado"}

app = FastAPI(
    title="OVERWATCH · Visão Computacional API",
    description="CNN MobileNetV2 para detecção de incêndios florestais em imagens — FIAP GS 2026",
    version="1.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Carregamento do Modelo ──────────────────────────────────────────────────────

_modelo = None
_status = {"modelo": "não carregado", "arquivo": None}


def _achar_modelo() -> str | None:
    """Localiza o arquivo .keras na pasta (tolerante ao nome com sufixo)."""
    candidatos = sorted(glob.glob(str(BASE_DIR / "*.keras")))
    return candidatos[0] if candidatos else None


def _carregar():
    global _modelo
    arquivo = _achar_modelo()
    if not arquivo:
        _status["modelo"] = "erro: nenhum arquivo .keras encontrado"
        return
    try:
        import tensorflow as tf
        _modelo = tf.keras.models.load_model(arquivo, compile=False)
        _status["modelo"]  = "ok"
        _status["arquivo"] = os.path.basename(arquivo)
        print(f"[CV] Modelo carregado: {os.path.basename(arquivo)}  ·  "
              f"input={_modelo.input_shape}  output={_modelo.output_shape}")
    except Exception as e:
        _status["modelo"] = f"erro ao carregar: {e}"
        print(f"[CV] ERRO ao carregar modelo: {e}")


_carregar()

# ── Helpers ─────────────────────────────────────────────────────────────────────

def _preprocessar(raw: bytes) -> np.ndarray:
    """Bytes da imagem → tensor (1, 160, 160, 3) com pré-processamento MobileNetV2."""
    from PIL import Image
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB").resize(IMG_SIZE)
    except Exception as e:
        raise HTTPException(400, f"Imagem inválida: {e}")

    arr = np.array(img, dtype=np.float32)
    arr = preprocess_input(arr)               # escala para [-1, 1] (idêntico ao treino)
    return np.expand_dims(arr, axis=0)


def _prever(raw: bytes) -> dict:
    if _modelo is None:
        raise HTTPException(503, "Modelo não carregado. Verifique GET /visao/status.")

    x    = _preprocessar(raw)
    prob = float(_modelo.predict(x, verbose=0)[0][0])   # P(incêndio)
    classe = int(prob >= THRESHOLD)
    confianca = prob if classe == 1 else 1.0 - prob

    return {
        "classe":            classe,
        "label":             CLASSES[classe],
        "incendio":          bool(classe),
        "probabilidade_fogo": round(prob, 4),
        "confianca":         round(confianca, 4),
        "threshold":         THRESHOLD,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/visao/status", tags=["Geral"])
def status():
    """Estado da API e do modelo carregado."""
    return {
        "api":         "online",
        "modelo":      _status["modelo"],
        "arquivo":     _status["arquivo"],
        "input_shape": list(_modelo.input_shape) if _modelo is not None else None,
        "tarefa":      "Detecção de incêndios florestais (classificação binária)",
    }


@app.get("/visao/info", tags=["Informações"])
def info():
    """Arquitetura, dataset e métricas do modelo."""
    return {
        "modelo": {
            "nome":         "MobileNetV2 (transfer learning)",
            "tipo":         "CNN — classificação binária de imagens",
            "input":        f"{IMG_SIZE[0]}×{IMG_SIZE[1]}×3 (RGB)",
            "saida":        "sigmoid (1 neurônio) — P(incêndio)",
            "parametros":   "~2.3M (backbone congelado) + cabeça densa",
            "backbone":     "MobileNetV2 pré-treinado no ImageNet",
            "cabeca":       "GlobalAveragePooling2D → Dropout → Dense(1, sigmoid)",
            "preprocessamento": "resize 160×160 + mobilenet_v2.preprocess_input ([-1, 1])",
            "arquivo":      _status["arquivo"],
        },
        "classes": {
            "0": "Sem Incêndio (nowildfire)",
            "1": "Incêndio Detectado (wildfire)",
        },
        "threshold": THRESHOLD,
        "dataset": {
            "nome":     "Wildfire Prediction Dataset (Kaggle)",
            "fonte":    "abdelghaniaaba/wildfire-prediction-dataset",
            "imagens":  "~30.250 treino · 6.300 validação · 6.300 teste (350×350 RGB)",
            "splits":   "70 / 15 / 15 — separados por pasta (sem vazamento)",
            "classes":  "wildfire · nowildfire (quase balanceado)",
        },
        "metricas_teste": {
            "acuracia":      "95.13%",
            "auc":           0.987,
            "f1_wildfire":   0.9567,
            "precision_wildfire": 0.9621,
            "recall_wildfire":    0.9514,
            "obs": "Erro mais crítico = falso negativo. Baixar o threshold (0.3–0.4) "
                   "aumenta o recall de incêndio ao custo de mais alarmes falsos.",
        },
        "uso": (
            "Envie uma imagem aérea/satélite via POST /visao/prever. "
            "O modelo retorna a probabilidade de presença de incêndio florestal."
        ),
        "aplicacao": (
            "Complementa o pipeline OVERWATCH: imagens de satélite/drone são "
            "classificadas em tempo real para acionar alertas de incêndio por região."
        ),
    }


@app.post("/visao/prever", tags=["Predição"])
async def prever(file: UploadFile = File(..., description="Imagem (JPG/PNG) a classificar")):
    """
    Classifica uma imagem como **Incêndio Detectado** ou **Sem Incêndio**.

    Entrada: arquivo de imagem (multipart/form-data).
    Saída:   classe, probabilidade de fogo e confiança.
    """
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Arquivo vazio.")

    resultado = _prever(raw)
    return {
        "arquivo":   file.filename,
        "tamanho_kb": round(len(raw) / 1024, 1),
        "data":      datetime.now().isoformat(timespec="seconds"),
        **resultado,
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("  OVERWATCH Visao Computacional API - iniciando")
    print("  http://0.0.0.0:8002")
    print("  Docs: http://localhost:8002/docs")
    print("=" * 55)
    uvicorn.run("api:app", host="0.0.0.0", port=8002, reload=True)
