# 🛰️ SENTINEL — Pipeline de Previsão Climática com Dados Espaciais

> **FIAP · Global Solution 2026 · AI for RPA (1º Semestre)**  
> Tema: Sistemas de Previsão Climática e Prevenção de Desastres Naturais com Base em Dados Espaciais

---

## Sobre o Projeto

O **SENTINEL** é um pipeline automatizado de ponta a ponta que simula o processamento de dados de sensoriamento remoto de satélites (Sentinel-2, Landsat-9, GOES-16) para detectar anomalias climáticas e classificar riscos de desastres naturais com inteligência artificial.

### Tópicos integrados (critério obrigatório)
| Tópico | Como aparece no projeto |
|---|---|
| **Machine Learning / Detecção de Anomalias** | Isolation Forest treinado por região sobre 5 variáveis climáticas |
| **NLP / IA Generativa** | Google Gemini API classifica tipo de desastre, severidade e recomendação em linguagem natural |

---

## Arquitetura do Pipeline

```
CSV Satelital (simulado)
        │
        ▼
[M1] Gerador de Dados     → Simula leituras de LST, NDVI, umidade, vento, chuva
        │
        ▼
[M2] Ingestão e Limpeza   → Validação, remoção de outliers físicos, Z-score por região
        │
        ▼
[M3] Detecção (ML)        → Isolation Forest — detecta padrões anômalos por região
        │
        ▼
[M4] Classificação (IA)   → Google Gemini API — tipo de desastre, severidade, recomendação
        │
        ▼
[M5] Relatório Excel      → 4 abas: Painel Executivo, Alertas, Dados, Estatísticas
```

---

## Variáveis Monitoradas

| Variável | Fonte Satelital Real | Unidade |
|---|---|---|
| Temperatura da Superfície (LST) | MODIS / Landsat | °C |
| Umidade do Solo | Sentinel-1 SAR | % |
| NDVI (Índice de Vegetação) | Sentinel-2 | -1 a 1 |
| Velocidade do Vento | GOES-16 / ERA5 | m/s |
| Precipitação Acumulada | GPM IMERG | mm |

## Regiões Monitoradas

- Amazônia-BR · Nordeste-BR · Pantanal-BR
- Caribe · Golfo-México · Andes-PE

---

## Instalação

```bash
# Clone o repositório
git clone https://github.com/MatheusMikio12/GS---RPA---SENTINEL.git
cd GS---RPA---SENTINEL

# Crie e ative o ambiente virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instale as dependências
pip install -r requirements.txt

# Configure a chave da API do Google Gemini (gratuita)
# Obtenha em: https://aistudio.google.com/app/apikey
export GOOGLE_API_KEY="sua-chave-aqui"   # Linux/Mac
set GOOGLE_API_KEY=sua-chave-aqui        # Windows CMD
$env:GOOGLE_API_KEY="sua-chave-aqui"     # Windows PowerShell
```

> **Chave gratuita:** o Google AI Studio oferece um free tier generoso (15 requisições/min, 1500 req/dia) — mais que suficiente para rodar o projeto completo.

---

## Como Executar

```bash
# Pipeline completo (com classificação IA)
python pipeline.py

# Sem consumir a API (para testes locais)
python pipeline.py --sem-ia

# Limitar alertas classificados por região
python pipeline.py --max-alertas 5
```

O relatório será gerado em `outputs/relatorio_sentinel.xlsx`.

---

## Estrutura de Arquivos

```
sentinel/
├── modulo1_gerador.py          # Simulação de dados satelitais
├── modulo2_ingestao.py         # Ingestão, validação e normalização
├── modulo3_anomalias.py        # Detecção de anomalias (Isolation Forest)
├── modulo4_classificacao_ia.py # Classificação de riscos (Claude API)
├── modulo5_relatorio.py        # Geração do relatório Excel
├── pipeline.py                 # Orquestrador principal
├── requirements.txt
├── .gitignore
└── README.md
```

---

## Matriz de Avaliação

| Critério | Peso | Como atende |
|---|---|---|
| Domínio Técnico e Integração de Conceitos | 40% | ML (Isolation Forest) + NLP (Claude API) |
| Arquitetura de Fluxo e Engenharia de Software | 25% | 5 módulos independentes, tratamento de exceções, CLI com argparse |
| Inteligência de Dados e Recursos de IA | 20% | Anomalia por região + classificação multiclasse em linguagem natural |
| Entrega de Artefatos e Outputs Técnicos | 15% | Excel com 4 abas estruturadas, métricas e coloração por severidade |

---

## Tecnologias Utilizadas

- **Python 3.10+**
- **pandas** — manipulação e análise de dados
- **scikit-learn** — Isolation Forest para detecção de anomalias
- **google-generativeai** — SDK oficial da API do Google Gemini
- **openpyxl** — geração de relatórios Excel formatados
- **numpy** — operações numéricas

---

## API REST (integração com front-end)

O projeto inclui um servidor **FastAPI** pronto para conectar a qualquer front-end (React, Next.js, Vue, etc.).

### Iniciar o servidor

```bash
python api.py
# Acesse: http://localhost:8000/docs  (Swagger interativo)
```

### Endpoints disponíveis

| Método | Endpoint | Descrição |
|---|---|---|
| `GET`  | `/status` | Estado atual do pipeline |
| `POST` | `/pipeline/rodar` | Dispara o pipeline em background |
| `GET`  | `/resultados` | JSON completo com todos os dados |
| `GET`  | `/resultados/resumo` | KPIs gerais (cards do dashboard) |
| `GET`  | `/resultados/alertas` | Alertas com filtro por severidade/região |
| `GET`  | `/resultados/regioes` | Estatísticas por região (gráficos) |
| `GET`  | `/resultados/serie-temporal` | Série temporal (gráfico de linha) |

### Exemplo de chamada do front-end

```javascript
// Disparar o pipeline
await fetch("http://localhost:8000/pipeline/rodar", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ usar_ia: true, max_alertas_por_regiao: 10 })
});

// Buscar alertas críticos
const res = await fetch("http://localhost:8000/resultados/alertas?severidade=critica");
const { alertas } = await res.json();
```

### Estrutura do JSON gerado (`outputs/resultados.json`)

```json
{
  "resumo": { "total_leituras": 2592, "total_anomalias": 104, ... },
  "alertas": [ { "regiao": "Caribe", "tipo_desastre": "ciclone", "severidade": "critica", ... } ],
  "por_regiao": { "Amazônia-BR": { "anomalias": 17, "sensores": { ... } } },
  "serie_temporal": [ { "timestamp": "...", "regiao": "...", "ndvi": 0.62, ... } ]
}
```
