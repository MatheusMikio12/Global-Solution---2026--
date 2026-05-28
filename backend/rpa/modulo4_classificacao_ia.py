"""
OVERWATCH — Módulo 4: Classificação de Riscos Climáticos com IA (Google Gemini API)
"""

import json
import time
import pandas as pd
import google.generativeai as genai
import config


genai.configure(api_key=config.GOOGLE_API_KEY)

modelo = genai.GenerativeModel(
    model_name=config.GEMINI_MODEL,
    generation_config=genai.GenerationConfig(
        temperature=config.GEMINI_TEMP,
        response_mime_type="application/json",
    ),
    system_instruction=(
        "Você é um especialista em meteorologia e sensoriamento remoto espacial. "
        "Analise leituras anômalas de satélites climáticos e classifique o risco de desastre natural. "
        "Responda SEMPRE em JSON válido, sem texto adicional, sem markdown."
    ),
)


def classificar_risco(row: pd.Series) -> dict:
    tipos = ", ".join(config.TIPOS_DESASTRE)
    prompt = f"""Analise esta leitura anômala captada por satélite e classifique o risco:

Região: {row['regiao']}
Satélite: {row['satelite']}
Timestamp: {row['timestamp']}

Dados dos sensores:
- Temperatura da superfície: {row['temp_superficie_C']:.1f} °C
- Umidade do solo: {row['umidade_solo_pct']:.1f} %
- NDVI (vegetação): {row['ndvi']:.3f}
- Velocidade do vento: {row['velocidade_vento_ms']:.1f} m/s
- Precipitação acumulada: {row['precipitacao_mm']:.1f} mm
- Score de anomalia: {row['score_anomalia']:.4f}

Responda APENAS com este JSON:
{{
  "tipo_desastre": "um dos seguintes: {tipos}",
  "severidade": "baixa | media | alta | critica",
  "confianca_pct": numero entre 0 e 100,
  "indicadores_principais": ["sensores", "que", "mais", "indicam", "o", "risco"],
  "recomendacao": "acao emergencial em 1 frase curta"
}}"""

    resposta = modelo.generate_content(prompt)
    return json.loads(resposta.text)


def classificar_todos_riscos(df: pd.DataFrame, max_por_regiao: int = None) -> pd.DataFrame:
    max_por_regiao = max_por_regiao or config.MAX_ALERTAS_POR_REGIAO
    df = df.copy()
    for col in ["tipo_desastre", "severidade", "confianca_pct", "indicadores_principais", "recomendacao"]:
        df[col] = None

    anomalos = df[df["anomalia"] == "anomalia"].copy()
    amostra  = anomalos.groupby("regiao").apply(
        lambda x: x.nsmallest(max_por_regiao, "score_anomalia")
    ).reset_index(drop=True)

    print(f"[M4] Classificando {len(amostra)} anomalias prioritárias com Gemini API...")

    for i, (idx, row) in enumerate(amostra.iterrows()):
        try:
            resultado = classificar_risco(row)
            df.loc[idx, "tipo_desastre"]          = resultado.get("tipo_desastre", "indefinido")
            df.loc[idx, "severidade"]             = resultado.get("severidade", "baixa")
            df.loc[idx, "confianca_pct"]          = resultado.get("confianca_pct", 0)
            df.loc[idx, "indicadores_principais"] = str(resultado.get("indicadores_principais", []))
            df.loc[idx, "recomendacao"]           = resultado.get("recomendacao", "")
            print(f"  [{i+1}/{len(amostra)}] {row['regiao']} → {resultado.get('tipo_desastre')} ({resultado.get('severidade')})")
            time.sleep(0.5)
        except Exception as e:
            print(f"  [{i+1}/{len(amostra)}] ERRO em {row['regiao']}: {e}")
            df.loc[idx, "tipo_desastre"] = "erro_classificacao"
            df.loc[idx, "severidade"]    = "indefinido"

    print(f"[M4] {df['tipo_desastre'].notna().sum()} anomalias classificadas com sucesso.")
    return df


if __name__ == "__main__":
    from modulo1_gerador import gerar_dados_climaticos
    from modulo2_ingestao import carregar_e_limpar
    from modulo3_anomalias import detectar_anomalias
    gerar_dados_climaticos()
    df = carregar_e_limpar()
    df = detectar_anomalias(df)
    df = classificar_todos_riscos(df, max_por_regiao=3)
    print(df[df["tipo_desastre"].notna()][["regiao", "tipo_desastre", "severidade", "recomendacao"]])
