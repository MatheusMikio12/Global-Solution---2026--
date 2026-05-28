"""
SENTINEL — Módulo 5: Geração de Relatório Excel Automatizado
Produz um relatório estruturado com 4 abas:
  1. Painel Executivo — métricas gerais da missão de monitoramento
  2. Alertas Críticos  — anomalias classificadas pela IA, ordenadas por severidade
  3. Dados Completos   — dataset completo com coloração por tipo de anomalia
  4. Estatísticas      — resumo estatístico por região
"""

import os
import pandas as pd
import openpyxl
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side
)
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, Reference
from datetime import datetime


# Paleta de cores
COR_HEADER      = "1E3A5F"   # Azul escuro espacial
COR_CRITICO     = "C0392B"   # Vermelho
COR_ALTO        = "E67E22"   # Laranja
COR_MEDIO       = "F1C40F"   # Amarelo
COR_BAIXO       = "27AE60"   # Verde
COR_NORMAL      = "ECF0F1"   # Cinza claro
COR_DESTAQUE    = "2980B9"   # Azul médio
COR_FUNDO_ABA   = "F8F9FA"

ORDEM_SEVERIDADE = {"crítica": 0, "alta": 1, "média": 2, "baixa": 3, "indefinido": 4, None: 5}


def _estilo_header(cell, cor=COR_HEADER):
    cell.fill      = PatternFill("solid", fgColor=cor)
    cell.font      = Font(color="FFFFFF", bold=True, size=10)
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)


def _borda_fina():
    lado = Side(style="thin", color="CCCCCC")
    return Border(left=lado, right=lado, top=lado, bottom=lado)


def _cor_severidade(sev):
    mapa = {"crítica": COR_CRITICO, "alta": COR_ALTO, "média": COR_MEDIO, "baixa": COR_BAIXO}
    return mapa.get(str(sev).lower(), COR_NORMAL)


def _ajustar_colunas(ws, min_width=10, max_width=40):
    for col in ws.columns:
        largura = max(
            (len(str(cell.value)) if cell.value else 0) for cell in col
        )
        ws.column_dimensions[get_column_letter(col[0].column)].width = min(max(largura + 2, min_width), max_width)


# ── ABA 1: Painel Executivo ─────────────────────────────────────────────────

def _aba_painel(wb, df):
    ws = wb.active
    ws.title = "📊 Painel Executivo"
    ws.sheet_properties.tabColor = COR_DESTAQUE

    anomalos    = df[df["anomalia"] == "anomalia"]
    classificados = df[df["tipo_desastre"].notna()]

    # Título
    ws.merge_cells("A1:F1")
    ws["A1"] = "🛰️  SENTINEL — Relatório de Monitoramento Climático Espacial"
    ws["A1"].font      = Font(bold=True, size=16, color=COR_HEADER)
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 36

    ws["A2"] = f"Gerado automaticamente em {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    ws["A2"].font = Font(italic=True, size=10, color="888888")
    ws.merge_cells("A2:F2")
    ws["A2"].alignment = Alignment(horizontal="center")

    # Métricas
    metricas = [
        ("Total de Leituras",       len(df),                              COR_DESTAQUE),
        ("Anomalias Detectadas",    len(anomalos),                        COR_ALTO),
        ("Taxa de Anomalia (%)",    f"{len(anomalos)/len(df)*100:.1f}%",  COR_ALTO),
        ("Alertas Críticos",        len(anomalos[anomalos["severidade"] == "crítica"]) if "severidade" in df.columns else "N/A", COR_CRITICO),
        ("Regiões Monitoradas",     df["regiao"].nunique(),               COR_DESTAQUE),
        ("Satélites Utilizados",    df["satelite"].nunique(),             COR_DESTAQUE),
    ]

    ws["A4"] = "MÉTRICAS DA MISSÃO"
    ws["A4"].font = Font(bold=True, size=12, color=COR_HEADER)

    for i, (label, valor, cor) in enumerate(metricas):
        row = 5 + i
        ws[f"A{row}"] = label
        ws[f"A{row}"].font = Font(bold=True)
        ws[f"B{row}"] = valor
        ws[f"B{row}"].fill = PatternFill("solid", fgColor=cor)
        ws[f"B{row}"].font = Font(color="FFFFFF", bold=True)
        ws[f"B{row}"].alignment = Alignment(horizontal="center")
        ws[f"B{row}"].border = _borda_fina()

    # Distribuição por tipo de desastre
    if "tipo_desastre" in df.columns and classificados.shape[0] > 0:
        ws["D4"] = "DISTRIBUIÇÃO POR TIPO DE DESASTRE"
        ws["D4"].font = Font(bold=True, size=12, color=COR_HEADER)

        contagem = classificados["tipo_desastre"].value_counts()
        for i, (tipo, qtd) in enumerate(contagem.items()):
            row = 5 + i
            ws[f"D{row}"] = tipo.title()
            ws[f"E{row}"] = qtd
            ws[f"E{row}"].alignment = Alignment(horizontal="center")
            ws[f"D{row}"].border = _borda_fina()
            ws[f"E{row}"].border = _borda_fina()

    ws.column_dimensions["A"].width = 28
    ws.column_dimensions["B"].width = 18
    ws.column_dimensions["D"].width = 28
    ws.column_dimensions["E"].width = 12


# ── ABA 2: Alertas Críticos ─────────────────────────────────────────────────

def _aba_alertas(wb, df):
    ws = wb.create_sheet("🚨 Alertas Críticos")
    ws.sheet_properties.tabColor = COR_CRITICO

    alertas = df[df["tipo_desastre"].notna()].copy()
    alertas["_ord"] = alertas["severidade"].map(ORDEM_SEVERIDADE)
    alertas = alertas.sort_values(["_ord", "score_anomalia"]).drop(columns=["_ord"])

    colunas = [
        "timestamp", "regiao", "satelite",
        "temp_superficie_C", "umidade_solo_pct", "ndvi",
        "velocidade_vento_ms", "precipitacao_mm",
        "tipo_desastre", "severidade", "confianca_pct", "recomendacao"
    ]
    colunas = [c for c in colunas if c in alertas.columns]

    headers = {
        "timestamp": "Data/Hora", "regiao": "Região", "satelite": "Satélite",
        "temp_superficie_C": "Temp (°C)", "umidade_solo_pct": "Umidade (%)",
        "ndvi": "NDVI", "velocidade_vento_ms": "Vento (m/s)",
        "precipitacao_mm": "Precip. (mm)",
        "tipo_desastre": "Tipo de Desastre", "severidade": "Severidade",
        "confianca_pct": "Confiança (%)", "recomendacao": "Recomendação"
    }

    ws.append([headers.get(c, c) for c in colunas])
    for cell in ws[1]:
        _estilo_header(cell, COR_CRITICO)

    ws.freeze_panes = "A2"

    for _, row in alertas[colunas].iterrows():
        ws.append(list(row))
        sev = row.get("severidade", "")
        cor = _cor_severidade(sev)
        for cell in ws[ws.max_row]:
            cell.fill   = PatternFill("solid", fgColor=cor + "55")
            cell.border = _borda_fina()

    _ajustar_colunas(ws)


# ── ABA 3: Dados Completos ──────────────────────────────────────────────────

def _aba_dados(wb, df):
    ws = wb.create_sheet("📋 Dados Completos")

    colunas = [
        "timestamp", "regiao", "satelite",
        "temp_superficie_C", "umidade_solo_pct", "ndvi",
        "velocidade_vento_ms", "precipitacao_mm", "anomalia"
    ]
    colunas = [c for c in colunas if c in df.columns]

    ws.append(colunas)
    for cell in ws[1]:
        _estilo_header(cell)

    ws.freeze_panes = "A2"

    alerta_fill = PatternFill("solid", fgColor="FEE2E2")
    normal_fill = PatternFill("solid", fgColor="F0F9FF")

    for _, row in df[colunas].iterrows():
        ws.append(list(row))
        fill = alerta_fill if row.get("anomalia") == "anomalia" else normal_fill
        for cell in ws[ws.max_row]:
            cell.fill   = fill
            cell.border = _borda_fina()

    _ajustar_colunas(ws)


# ── ABA 4: Estatísticas por Região ──────────────────────────────────────────

def _aba_estatisticas(wb, df):
    ws = wb.create_sheet("📈 Estatísticas")

    numericas = ["temp_superficie_C", "umidade_solo_pct", "ndvi",
                 "velocidade_vento_ms", "precipitacao_mm"]
    numericas = [c for c in numericas if c in df.columns]

    stats = df.groupby("regiao")[numericas].agg(["mean", "max", "min", "std"]).round(2)
    stats.columns = [f"{col}_{agg}" for col, agg in stats.columns]
    stats = stats.reset_index()

    # Adiciona contagem de anomalias por região
    contagem = df[df["anomalia"] == "anomalia"].groupby("regiao").size().rename("total_anomalias")
    stats = stats.merge(contagem, on="regiao", how="left").fillna(0)

    ws.append(list(stats.columns))
    for cell in ws[1]:
        _estilo_header(cell)

    for _, row in stats.iterrows():
        ws.append(list(row))
        for cell in ws[ws.max_row]:
            cell.border = _borda_fina()

    _ajustar_colunas(ws)


# ── Função principal ────────────────────────────────────────────────────────

def gerar_relatorio(df: pd.DataFrame, caminho: str = "outputs/relatorio_sentinel.xlsx"):
    os.makedirs("outputs", exist_ok=True)

    wb = openpyxl.Workbook()

    _aba_painel(wb, df)
    _aba_alertas(wb, df)
    _aba_dados(wb, df)
    _aba_estatisticas(wb, df)

    wb.save(caminho)
    print(f"[M5] Relatório salvo em: {caminho}")
    print(f"[M5] Abas geradas: {[ws.title for ws in wb.worksheets]}")
    return caminho


if __name__ == "__main__":
    from modulo1_gerador import gerar_dados_climaticos
    from modulo2_ingestao import carregar_e_limpar
    from modulo3_anomalias import detectar_anomalias

    gerar_dados_climaticos()
    df = carregar_e_limpar()
    df = detectar_anomalias(df)
    gerar_relatorio(df)


# ── Export JSON para o front-end ─────────────────────────────────────────────

def exportar_json(df: pd.DataFrame, caminho: str = None) -> str:
    """
    Exporta os resultados em JSON estruturado, pronto para consumo pelo front-end.

    Estrutura retornada:
    {
      "resumo":    { métricas gerais },
      "alertas":   [ lista de anomalias classificadas pela IA ],
      "por_regiao": { estatísticas por região },
      "serie_temporal": [ amostra dos dados para gráficos ]
    }
    """
    import json
    import os
    import config as _cfg

    caminho = caminho or _cfg.ARQUIVO_JSON
    os.makedirs(os.path.dirname(caminho) if os.path.dirname(caminho) else ".", exist_ok=True)

    anomalos      = df[df["anomalia"] == "anomalia"]
    classificados = df[df["tipo_desastre"].notna()] if "tipo_desastre" in df.columns else pd.DataFrame()

    # 1. Resumo geral
    resumo = {
        "total_leituras":     int(len(df)),
        "total_anomalias":    int(len(anomalos)),
        "taxa_anomalia_pct":  round(len(anomalos) / len(df) * 100, 2),
        "regioes_monitoradas": df["regiao"].nunique(),
        "satelites_utilizados": df["satelite"].nunique(),
        "periodo_inicio":     str(df["timestamp"].min()),
        "periodo_fim":        str(df["timestamp"].max()),
        "alertas_criticos":   int((classificados["severidade"] == "critica").sum()) if not classificados.empty else 0,
        "alertas_altos":      int((classificados["severidade"] == "alta").sum())    if not classificados.empty else 0,
    }

    # 2. Alertas classificados (para tabela/cards no front)
    alertas = []
    if not classificados.empty:
        cols = ["timestamp", "regiao", "satelite", "temp_superficie_C",
                "umidade_solo_pct", "ndvi", "velocidade_vento_ms",
                "precipitacao_mm", "tipo_desastre", "severidade",
                "confianca_pct", "recomendacao"]
        cols = [c for c in cols if c in classificados.columns]
        for _, row in classificados[cols].iterrows():
            alertas.append({k: (str(v) if not isinstance(v, (int, float, bool)) else v)
                            for k, v in row.items()})

    # 3. Estatísticas por região (para gráficos de barra/radar)
    numericas = ["temp_superficie_C", "umidade_solo_pct", "ndvi",
                 "velocidade_vento_ms", "precipitacao_mm"]
    numericas = [c for c in numericas if c in df.columns]

    por_regiao = {}
    for regiao, grupo in df.groupby("regiao"):
        contagem_anomalias = int((grupo["anomalia"] == "anomalia").sum())
        stats = {col: {"media": round(float(grupo[col].mean()), 2),
                       "max":   round(float(grupo[col].max()), 2),
                       "min":   round(float(grupo[col].min()), 2)}
                 for col in numericas}
        por_regiao[regiao] = {"total_leituras": len(grupo),
                              "anomalias": contagem_anomalias,
                              "sensores": stats}

    # 4. Série temporal amostrada (para gráfico de linha — 1 ponto a cada hora)
    df_temp = df.copy()
    df_temp["timestamp"] = pd.to_datetime(df_temp["timestamp"])
    df_temp = df_temp.set_index("timestamp")
    serie = (df_temp.groupby("regiao")[numericas]
             .resample("1h", level="timestamp")
             .mean()
             .round(2)
             .reset_index())
    serie_temporal = []
    for _, row in serie.iterrows():
        serie_temporal.append({
            "timestamp": str(row["timestamp"]),
            "regiao":    row["regiao"],
            **{col: float(row[col]) for col in numericas if col in row}
        })

    payload = {
        "resumo":         resumo,
        "alertas":        alertas,
        "por_regiao":     por_regiao,
        "serie_temporal": serie_temporal,
    }

    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"[M5] JSON exportado em: {caminho} ({len(alertas)} alertas, {len(serie_temporal)} pontos temporais)")
    return caminho
