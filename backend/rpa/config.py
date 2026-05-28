"""
OVERWATCH — Configurações Centralizadas
Altere aqui sem precisar mexer em nenhum outro arquivo.
"""

import os

# ── API ─────────────────────────────────────────────────────────────────────
GOOGLE_API_KEY  = os.environ.get("GOOGLE_API_KEY", "")
GEMINI_MODEL    = "gemini-1.5-flash"   # troque por "gemini-1.5-pro" para maior precisão
GEMINI_TEMP     = 0.2                  # 0.0 = determinístico, 1.0 = criativo

# ── Geração de dados ─────────────────────────────────────────────────────────
N_LEITURAS      = 432                  # leituras por região (432 = 3 dias a cada 10min)
RANDOM_SEED     = 42
TAXA_ANOMALIA   = 0.04                 # 4% de anomalias injetadas por região

REGIOES = [
    "Amazônia-BR",
    "Nordeste-BR",
    "Pantanal-BR",
    "Caribe",
    "Golfo-México",
    "Andes-PE",
]

SATELITES = ["Sentinel-2", "Landsat-9", "GOES-16"]

# ── Detecção de anomalias ────────────────────────────────────────────────────
CONTAMINACAO_IF = 0.04     # deve bater com TAXA_ANOMALIA
N_ESTIMATORS_IF = 200

FEATURES_ML = [
    "temp_superficie_C_norm",
    "umidade_solo_pct_norm",
    "ndvi_norm",
    "velocidade_vento_ms_norm",
    "precipitacao_mm_norm",
]

# ── Limites físicos dos sensores ─────────────────────────────────────────────
LIMITES_FISICOS = {
    "temp_superficie_C":   (-60, 70),
    "umidade_solo_pct":    (0, 100),
    "ndvi":                (-1, 1),
    "velocidade_vento_ms": (0, 350),
    "precipitacao_mm":     (0, 500),
}

# ── Classificação com IA ─────────────────────────────────────────────────────
MAX_ALERTAS_POR_REGIAO = 10    # limita chamadas à API por região
TIPOS_DESASTRE = [
    "seca",
    "ciclone",
    "enchente",
    "deslizamento",
    "incendio florestal",
    "tempestade severa",
    "indefinido",
]

# ── Outputs ──────────────────────────────────────────────────────────────────
DIR_DATA    = "data"
DIR_OUTPUTS = "outputs"
ARQUIVO_CSV          = os.path.join(DIR_DATA,    "dados_climaticos.csv")
ARQUIVO_EXCEL        = os.path.join(DIR_OUTPUTS, "relatorio_overwatch.xlsx")
ARQUIVO_JSON         = os.path.join(DIR_OUTPUTS, "resultados.json")

# ── API Server ───────────────────────────────────────────────────────────────
API_HOST = "0.0.0.0"
API_PORT = 8000
