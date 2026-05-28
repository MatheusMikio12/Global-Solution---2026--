"""
OVERWATCH — Pipeline Principal
Orquestra todos os módulos do pipeline de ponta a ponta.

Uso:
    python pipeline.py                  # executa pipeline completo
    python pipeline.py --sem-ia         # pula classificação IA
    python pipeline.py --max-alertas 5  # limita alertas por região
"""

import os
import sys
import time
import argparse
import config


def verificar_chave_api():
    if not config.GOOGLE_API_KEY:
        print("\n⚠️  ATENÇÃO: variável GOOGLE_API_KEY não encontrada!")
        print("   Obtenha sua chave gratuita em: https://aistudio.google.com/app/apikey")
        print("   Linux/Mac:  export GOOGLE_API_KEY='sua-chave-aqui'")
        print("   Windows:    set GOOGLE_API_KEY=sua-chave-aqui")
        print("   Sem IA:     python pipeline.py --sem-ia\n")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="OVERWATCH — Pipeline Climático Espacial")
    parser.add_argument("--sem-ia",      action="store_true",  help="Pula classificação com IA")
    parser.add_argument("--max-alertas", type=int, default=config.MAX_ALERTAS_POR_REGIAO,
                        help=f"Máximo de alertas por região (padrão: {config.MAX_ALERTAS_POR_REGIAO})")
    args = parser.parse_args()

    os.makedirs(config.DIR_DATA,    exist_ok=True)
    os.makedirs(config.DIR_OUTPUTS, exist_ok=True)

    inicio = time.time()
    print("=" * 55)
    print("  🛰️  OVERWATCH — Pipeline Climático Espacial")
    print("  FIAP · Global Solution 2026 · AI for RPA")
    print("=" * 55)

    print("\n[ETAPA 1/5] Gerando dados de sensoriamento remoto...")
    from modulo1_gerador import gerar_dados_climaticos
    gerar_dados_climaticos()

    print("\n[ETAPA 2/5] Ingestão e limpeza dos dados...")
    from modulo2_ingestao import carregar_e_limpar
    df = carregar_e_limpar()

    print("\n[ETAPA 3/5] Detecção de anomalias com Isolation Forest...")
    from modulo3_anomalias import detectar_anomalias
    df = detectar_anomalias(df)

    if args.sem_ia:
        print("\n[ETAPA 4/5] Classificação com IA ignorada (--sem-ia).")
    else:
        verificar_chave_api()
        print("\n[ETAPA 4/5] Classificando riscos com Google Gemini API...")
        try:
            from modulo4_classificacao_ia import classificar_todos_riscos
            df = classificar_todos_riscos(df, max_por_regiao=args.max_alertas)
        except Exception as e:
            print(f"  ⚠️  Erro no módulo de IA: {e}")
            print("  ⚠️  Continuando sem classificação.")

    print("\n[ETAPA 5/5] Gerando relatório Excel e JSON...")
    from modulo5_relatorio import gerar_relatorio, exportar_json
    gerar_relatorio(df)
    exportar_json(df)

    duracao = time.time() - inicio
    print(f"\n{'='*55}")
    print(f"  ✅ Pipeline concluído em {duracao:.1f}s")
    print(f"  📊 Excel:  {config.ARQUIVO_EXCEL}")
    print(f"  📄 JSON:   {config.ARQUIVO_JSON}")
    print(f"  🌐 API:    python api.py  →  http://localhost:{config.API_PORT}/docs")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    main()
