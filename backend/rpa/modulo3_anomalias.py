"""
OVERWATCH — Módulo 3: Detecção de Anomalias Climáticas com ML
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import config


def detectar_anomalias(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["anomalia"]       = "normal"
    df["score_anomalia"] = 0.0

    total_anomalias = 0
    for regiao in df["regiao"].unique():
        mask   = df["regiao"] == regiao
        subset = df.loc[mask, config.FEATURES_ML].values

        modelo    = IsolationForest(contamination=config.CONTAMINACAO_IF,
                                    n_estimators=config.N_ESTIMATORS_IF,
                                    random_state=config.RANDOM_SEED, n_jobs=-1)
        predicoes = modelo.fit_predict(subset)
        scores    = modelo.decision_function(subset)

        df.loc[mask, "anomalia"]       = pd.Series(predicoes, index=df.loc[mask].index).map({1: "normal", -1: "anomalia"})
        df.loc[mask, "score_anomalia"] = scores

        n = (df.loc[mask, "anomalia"] == "anomalia").sum()
        total_anomalias += n
        print(f"[M3] {regiao}: {n} anomalias detectadas de {mask.sum()} leituras.")

    print(f"[M3] Total: {total_anomalias} anomalias em todas as regiões.")
    return df


if __name__ == "__main__":
    from modulo1_gerador import gerar_dados_climaticos
    from modulo2_ingestao import carregar_e_limpar
    gerar_dados_climaticos()
    df = carregar_e_limpar()
    df = detectar_anomalias(df)
    print(df[df["anomalia"] == "anomalia"][["timestamp", "regiao", "score_anomalia"]].head(10))
