"""
SENTINEL — Módulo 2: Ingestão e Limpeza de Dados Climáticos
"""

import pandas as pd
import numpy as np
import config


def carregar_e_limpar(caminho=None):
    caminho = caminho or config.ARQUIVO_CSV
    df = pd.read_csv(caminho, parse_dates=["timestamp"])
    antes = len(df)

    df = df.drop_duplicates()
    df = df.dropna(subset=["timestamp", "regiao"] + list(config.LIMITES_FISICOS.keys()))

    for col, (minv, maxv) in config.LIMITES_FISICOS.items():
        df = df[(df[col] >= minv) & (df[col] <= maxv)]

    removidas = antes - len(df)
    print(f"[M2] {antes} leituras carregadas → {removidas} removidas → {len(df)} válidas.")

    for col in config.LIMITES_FISICOS.keys():
        df[f"{col}_norm"] = df.groupby("regiao")[col].transform(
            lambda x: (x - x.mean()) / (x.std() + 1e-8)
        )

    print(f"[M2] Normalização Z-score aplicada por região.")
    return df


if __name__ == "__main__":
    from modulo1_gerador import gerar_dados_climaticos
    gerar_dados_climaticos()
    df = carregar_e_limpar()
    print(df.head())
