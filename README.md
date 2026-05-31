# OVERWATCH — Global Solution 2026

Plataforma de monitoramento climático e de desastres naturais que integra um pipeline
RPA, modelos de Machine Learning clássico/quântico e Visão Computacional, com um
frontend React unificado (HUD "Mission Control").

Projeto desenvolvido para a **FIAP Global Solution 2026**, cobrindo múltiplas
disciplinas do curso em um único produto.

## Arquitetura

```
Global-Solution---2026--/
├── backend/
│   ├── rpa/                    # Pipeline OVERWATCH — RPA (FastAPI :8000)
│   │   ├── api.py              # API REST do pipeline
│   │   ├── pipeline.py         # Orquestrador CLI
│   │   ├── modulo1_gerador.py  # Geração de dados satelitais
│   │   ├── modulo2_ingestao.py # Ingestão e limpeza
│   │   ├── modulo3_anomalias.py# Detecção de anomalias (Isolation Forest)
│   │   ├── modulo4_classificacao_ia.py # Classificação com Gemini
│   │   ├── modulo5_relatorio.py# Relatório Excel + JSON
│   │   └── README.md
│   ├── quantica/               # QML — classificação climática (FastAPI :8001)
│   │   ├── api.py              # SVM-RBF, Random Forest, QSVC, VQC
│   │   └── *.pkl / *.model     # Modelos treinados (NASA POWER)
│   └── visao-computacional/    # Visão Computacional (FastAPI :8002)
│       ├── api.py              # Detecção de incêndios (MobileNetV2)
│       ├── modelo_wildfire.keras
│       └── README.md
├── frontend/                   # React + Vite (porta 3000)
│   └── src/
│       ├── App.jsx             # Abas: Dashboard, RPA, Visão, Quântica, ...
│       └── services/api.js     # Cliente HTTP centralizado
├── docker-compose.yml
└── README.md
```

## Módulos

### 1. RPA — Pipeline OVERWATCH (porta 8000)

Pipeline em 5 etapas que gera dados climáticos satelitais, detecta anomalias com
Isolation Forest e classifica cada evento com o Google Gemini, produzindo um
relatório Excel e um JSON consumido pelo dashboard.

### 2. Computação Quântica e IA (porta 8001)

Ensemble que compara modelos clássicos (SVM-RBF, Random Forest) com modelos
quânticos (QSVC, VQC / Qiskit) na classificação de eventos climáticos extremos,
treinados com dados reais da NASA POWER (São Paulo, 2015–2022). Inclui consulta
ao vivo à API NASA POWER e classificação por votação.

### 3. Visão Computacional (porta 8002)

CNN **MobileNetV2** (transfer learning) que classifica imagens aéreas/satélite em
`incêndio` ou `sem incêndio`. Treinada no Wildfire Prediction Dataset (Kaggle),
atingindo **95,13% de acurácia** e **AUC 0,987** no conjunto de teste.
Detalhes em [backend/visao-computacional/README.md](backend/visao-computacional/README.md).

## Início rápido

### Requisitos
- Python 3.9+ (recomendado 3.11)
- Node.js 18+
- Git
- (Opcional) Docker e Docker Compose

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

### Backends

Cada backend é independente e roda em sua própria porta. Rode os que precisar:

```bash
# RPA (porta 8000)
cd backend/rpa
pip install -r requirements.txt
python api.py

# Quântica (porta 8001)
cd backend/quantica
pip install -r requirements.txt
python api.py

# Visão Computacional (porta 8002)
cd backend/visao-computacional
pip install -r requirements.txt
python api.py
```

O frontend lê as URLs dos backends via variáveis Vite (com fallback para localhost):

| Variável                | Padrão                  | Backend              |
|-------------------------|-------------------------|----------------------|
| `VITE_API_BASE_URL`     | `http://localhost:8000` | RPA                  |
| `VITE_QUANTUM_API_URL`  | `http://localhost:8001` | Quântica             |
| `VITE_VISION_API_URL`   | `http://localhost:8002` | Visão Computacional  |

## Endpoints principais

### RPA (8000)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET  | `/status` | Estado da API e do pipeline |
| POST | `/pipeline/rodar` | Dispara o pipeline em background |
| GET  | `/resultados` | JSON completo |
| GET  | `/resultados/resumo` | KPIs do dashboard |
| GET  | `/resultados/alertas` | Alertas (filtro por severidade/região) |
| GET  | `/resultados/regioes` | Estatísticas por região |
| GET  | `/resultados/serie-temporal` | Série temporal |

### Quântica (8001)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET  | `/quantica/status` | Estado da API e dos modelos |
| GET  | `/quantica/modelos` | Métricas e configuração dos modelos |
| POST | `/quantica/prever` | Classifica um dia climático |
| POST | `/quantica/buscar-e-prever` | Busca NASA POWER e classifica |

### Visão Computacional (8002)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET  | `/visao/status` | Estado da API e do modelo |
| GET  | `/visao/info` | Arquitetura, dataset e métricas |
| POST | `/visao/prever` | Classifica uma imagem (multipart `file`) |

Cada backend expõe documentação Swagger automática em `/docs`
(ex.: http://localhost:8002/docs).

## Docker

```bash
docker-compose up -d           # sobe os serviços
docker-compose logs -f         # acompanha os logs
docker-compose down            # encerra
```

## Segurança

- Nunca faça commit do arquivo `.env` (já protegido pelo `.gitignore`).
- Armazene chaves de API (ex.: `GOOGLE_API_KEY`) em variáveis de ambiente.
- Em produção, restrinja o CORS às origens do frontend.

## Licença

Distribuído sob a licença MIT.

---

Desenvolvido para a FIAP Global Solution 2026.
