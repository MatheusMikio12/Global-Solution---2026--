"""
SENTINEL — Módulo 1: Gerador de Dados Climáticos Satelitais
Simula leituras de sensores de satélites como Landsat, Sentinel-2 e GOES.
"""

import pandas as pd
import numpy as np
import os
import config


def gerar_dados_climaticos():
    np.random.seed(config.RANDOM_SEED)
    timestamps = pd.date_range("2026-01-01", periods=config.N_LEITURAS, freq="10min")

    registros = []
    for regiao in config.REGIOES:
        df = pd.DataFrame({
            "timestamp":           timestamps,
            "regiao":              regiao,
            "temp_superficie_C":   np.random.normal(28, 3, config.N_LEITURAS),
            "umidade_solo_pct":    np.random.normal(55, 8, config.N_LEITURAS).clip(0, 100),
            "ndvi":                np.random.normal(0.65, 0.1, config.N_LEITURAS).clip(-1, 1),
            "velocidade_vento_ms": np.random.normal(12, 3, config.N_LEITURAS).clip(0, None),
            "precipitacao_mm":     np.random.exponential(2, config.N_LEITURAS),
            "satelite":            np.random.choice(config.SATELITES, config.N_LEITURAS),
        })

        idx = np.random.choice(config.N_LEITURAS, size=int(config.N_LEITURAS * config.TAXA_ANOMALIA), replace=False)

        if regiao in ["Amazônia-BR", "Pantanal-BR"]:
            df.loc[idx, "ndvi"]             -= np.random.uniform(0.35, 0.55, len(idx))
            df.loc[idx, "umidade_solo_pct"] -= np.random.uniform(30, 45, len(idx))
        elif regiao in ["Caribe", "Golfo-México"]:
            df.loc[idx, "velocidade_vento_ms"] += np.random.uniform(40, 80, len(idx))
            df.loc[idx, "temp_superficie_C"]   += np.random.uniform(4, 8, len(idx))
            df.loc[idx, "precipitacao_mm"]     += np.random.uniform(80, 150, len(idx))
        elif regiao == "Nordeste-BR":
            df.loc[idx, "precipitacao_mm"]  = 0
            df.loc[idx, "umidade_solo_pct"] -= np.random.uniform(40, 50, len(idx))
        elif regiao == "Andes-PE":
            df.loc[idx, "precipitacao_mm"]     += np.random.uniform(100, 200, len(idx))
            df.loc[idx, "umidade_solo_pct"]    += np.random.uniform(30, 45, len(idx))

        df["ndvi"]             = df["ndvi"].clip(-1, 1)
        df["umidade_solo_pct"] = df["umidade_solo_pct"].clip(0, 100)
        df["precipitacao_mm"]  = df["precipitacao_mm"].clip(0, None)
        registros.append(df)

    dados = pd.concat(registros, ignore_index=True).sort_values("timestamp")
    os.makedirs(config.DIR_DATA, exist_ok=True)
    dados.to_csv(config.ARQUIVO_CSV, index=False)

    total_anomalias = int(config.N_LEITURAS * config.TAXA_ANOMALIA) * len(config.REGIOES)
    print(f"[M1] {len(dados)} leituras geradas para {len(config.REGIOES)} regiões.")
    print(f"[M1] ~{total_anomalias} anomalias climáticas injetadas.")
    return dados


if __name__ == "__main__":
    gerar_dados_climaticos()
