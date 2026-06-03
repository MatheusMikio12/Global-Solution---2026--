"""
OVERWATCH · GenAI — Base de Conhecimento Inicial
Gera os documentos-semente do RAG (mesmo conteúdo da Célula 3 do notebook).
Idempotente: só escreve os arquivos se ainda não existirem.
"""

import os

import config

_DOC_SATELITES = (
    "Satelites e Previsao Climatica\n\n"
    "SENSORIAMENTO REMOTO\n"
    "O sensoriamento remoto por satelite revolucionou o monitoramento de fenomenos climaticos. "
    "A NASA opera o Earth Observing System com TERRA e AQUA equipados com sensor MODIS, "
    "fornecendo imagens diarias em 36 bandas espectrais com resolucao de 250m a 1km.\n\n"
    "PREVISAO DE ENCHENTES\n"
    "O IMERG combina dados de multiplos satelites para estimar precipitacao global "
    "com resolucao de 10km e atualizacao a cada 30 minutos. "
    "O satelite SMAP mede umidade do solo a cada 2-3 dias com resolucao de 9km. "
    "Solos saturados aumentam o risco de enchentes. Integrar SMAP a modelos hidrologicos "
    "aumenta a precisao dos alertas em ate 40 por cento. "
    "O SRTM fornece modelo de elevacao global a 30m, essencial para mapear planicies de inundacao. "
    "O Copernicus EMS realizou mais de 500 mapeamentos de inundacoes entre 2012 e 2024. "
    "No Brasil foi usado nas enchentes do RS em 2024 mapeando mais de 2 milhoes de hectares.\n\n"
    "MONITORAMENTO DE SECAS\n"
    "O NDVI detecta vegetacao estressada com valores abaixo de 0.2. "
    "Os satelites GRACE-FO medem variacoes gravitacionais causadas por mudancas na "
    "distribuicao de agua, monitorando aquiferos subterraneos. Regioes com deplecao de "
    "aquiferos sao identificadas com 6 a 18 meses de antecedencia.\n\n"
    "DETECCAO DE QUEIMADAS\n"
    "O sistema INPE QUEIMADAS usa MODIS e VIIRS para detectar focos ativos com 2-4 passagens diarias. "
    "O Sentinel-2 confirma a area queimada com 10m de resolucao. "
    "O GOES-16 permite monitoramento a cada 10 minutos sobre a America do Sul. "
    "Algoritmos de ML alcancam 94 por cento de acuracia com latencia inferior a 3 horas.\n\n"
    "INTELIGENCIA ARTIFICIAL\n"
    "Os modelos GraphCast e Pangu-Weather superam modelos tradicionais do ECMWF e NOAA em previsoes de 10 dias. "
    "LLMs integrados via RAG permitem perguntas em linguagem natural sobre protocolos e dados historicos."
)

_DOC_DESASTRES = (
    "Tecnologias Espaciais e Desastres no Brasil\n\n"
    "CONTEXTO BRASILEIRO\n"
    "O Brasil registrou mais de 38 mil ocorrencias de desastres entre 2000 e 2023, "
    "20 mil mortes e R$ 200 bilhoes em prejuizos (CEMADEN 2023). "
    "Sul: ciclones e enchentes. Sudeste: deslizamentos. Nordeste: secas. Amazonia: incendios.\n\n"
    "INFRAESTRUTURA ESPACIAL BRASILEIRA\n"
    "O INPE opera PRODES (desmatamento desde 1988), DETER (deteccao quinzenal) e QUEIMADAS (desde 1998). "
    "O CEMADEN integra mais de 4 mil pluviometros e 133 estacoes hidrologicas cobrindo 957 municipios em risco. "
    "O satelite Amazonia-1 lancado em 2021 e o primeiro 100 por cento brasileiro, "
    "operando a 752km revisitando a Amazonia a cada 5 dias com resolucao de 64m.\n\n"
    "ALERTA NACIONAL\n"
    "O tempo entre deteccao de anomalia e alerta ao cidadao caiu de 6-8 horas em 2010 "
    "para 45-90 minutos em 2024 gracas a automacao com IA.\n\n"
    "CONECTIVIDADE VIA SATELITE\n"
    "As enchentes do RS em 2024 isolaram mais de 400 municipios. "
    "O Starlink distribuiu terminais portateis pelo governo para reconectar as regioes afetadas. "
    "BGAN Inmarsat e Iridium apoiam equipes de resgate em campo.\n\n"
    "RAG E IA PARA DEFESA CIVIL\n"
    "Um sistema RAG integraria historico CEMADEN, Lei 12608 de 2012, protocolos de evacuacao "
    "e relatorios do IPCC. Alertas compreensiveis aumentam em 60 por cento a taxa de evacuacao voluntaria."
)

_DOCUMENTOS = {
    "satelites.txt": _DOC_SATELITES,
    "desastres_brasil.txt": _DOC_DESASTRES,
}


def garantir_base() -> list[str]:
    """Cria os documentos-semente em DATA_DIR se ainda não existirem.

    Retorna a lista de nomes de arquivos presentes na base.
    """
    os.makedirs(config.DATA_DIR, exist_ok=True)
    for nome, conteudo in _DOCUMENTOS.items():
        caminho = os.path.join(config.DATA_DIR, nome)
        if not os.path.exists(caminho):
            with open(caminho, "w", encoding="utf-8") as f:
                f.write(conteudo)
    return sorted(
        f for f in os.listdir(config.DATA_DIR)
        if f.lower().endswith((".txt", ".md", ".pdf"))
    )
