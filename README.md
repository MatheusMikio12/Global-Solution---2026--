# Projeto Final - Global Solution 2026

Solução completa de pipeline RPA com múltiplos projetos backend, frontend moderno e infraestrutura dockerizada.

## 📋 Estrutura do Projeto

```
Global-Solution---2026--/
├── backend/
│   └── rpa/                  # Pipeline SENTINEL principal
│       ├── config.py         # Configurações centralizadas
│       ├── api.py            # FastAPI (porta 8000)
│       ├── pipeline.py       # Orquestrador CLI
│       ├── modulo1_gerador.py
│       ├── modulo2_ingestao.py
│       ├── modulo3_anomalias.py
│       ├── modulo4_classificacao_ia.py
│       ├── modulo5_relatorio.py
│       ├── requirements.txt
│       └── README.md
├── frontend/
│   ├── src/
│   │   └── services/
│   │       └── api.js        # Cliente API centralizado
│   └── package.json
├── .env                      # Variáveis de ambiente (NÃO FAZER COMMIT)
├── .gitignore
├── docker-compose.yml        # Orquestração de containers
└── README.md
```

## 🚀 Início Rápido

### Requisitos
- Docker e Docker Compose
- Python 3.9+
- Node.js 18+
- Git

### Instalação com Docker (Recomendado)

1. **Clone o repositório**
   ```bash
   git clone <seu-repo>
   cd projeto-final
   ```

2. **Configure as variáveis de ambiente**
   ```bash
   cp .env .env.local
   # Edite .env.local e adicione suas chaves reais
   ```

3. **Inicie os containers**
   ```bash
   docker-compose up -d
   ```

4. **Verifique os serviços**
   - Backend SENTINEL: http://localhost:8000
   - Backend Docs (Swagger): http://localhost:8000/docs
   - Frontend: http://localhost:3000
   - pgAdmin: http://localhost:5050

### Instalação Local (Desenvolvimento)

#### Backend

```bash
# Crie um virtual environment
python -m venv venv

# Ative o ambiente (Windows)
venv\Scripts\activate

# Ou (Linux/Mac)
source venv/bin/activate

# Instale dependências
pip install -r backend/requirements.txt

# Execute o pipeline (modo CLI)
cd backend/rpa
python pipeline.py --sem-ia   # sem IA (para testes)
python pipeline.py            # com Google Gemini (requer GOOGLE_API_KEY)

# Ou inicie apenas a API REST
cd backend/rpa
python api.py
# Acesse: http://localhost:8000/docs
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📚 API Endpoints

### SENTINEL (Porta 8000)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/status` | Estado atual da API e do pipeline |
| POST | `/pipeline/rodar` | Dispara o pipeline em background |
| GET | `/resultados` | JSON completo com todos os dados |
| GET | `/resultados/resumo` | KPIs gerais (cards do dashboard) |
| GET | `/resultados/alertas` | Alertas com filtro por severidade/região |
| GET | `/resultados/regioes` | Estatísticas por região |
| GET | `/resultados/serie-temporal` | Série temporal para gráficos |

### Exemplo de Requisição

```bash
# Disparar o pipeline
curl -X POST http://localhost:8000/pipeline/rodar \
  -H "Content-Type: application/json" \
  -d '{"usar_ia": true, "max_alertas_por_regiao": 10}'

# Buscar alertas críticos
curl "http://localhost:8000/resultados/alertas?severidade=critica"
```

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```env
# Google Cloud API
GOOGLE_API_KEY=sua_chave_aqui

# Database
DATABASE_URL=sqlite:///./gs_rpa.db

# API
API_HOST=0.0.0.0
API_PORT=8000

# Frontend
REACT_APP_API_BASE_URL=http://localhost:8000

# Logging
LOG_LEVEL=INFO

# Ambiente
ENVIRONMENT=development
```

## 🐳 Docker

### Construir imagens manualmente

```bash
# Backend SENTINEL
docker build -t gs-rpa-api ./backend/rpa

# Frontend
docker build -t frontend-app ./frontend
```

### Comandos úteis

```bash
# Ver logs
docker-compose logs -f backend-gs-rpa
docker-compose logs -f frontend

# Parar containers
docker-compose down

# Remover volumes (limpar database)
docker-compose down -v

# Rebuild
docker-compose up -d --build
```

## 📦 Dependências Principais

### Backend
- **FastAPI** - Framework web moderno
- **Uvicorn** - ASGI server
- **Pydantic** - Validação de dados
- **Google Cloud AI Platform** - IA e Machine Learning
- **Pandas** - Análise de dados
- **SQLAlchemy** - ORM para banco de dados

### Frontend
- **React 18** - UI library
- **React Router** - Roteamento
- **Axios/Fetch** - HTTP client
- **Vite** - Build tool moderno

## 🔐 Segurança

- **Nunca** fazer commit do arquivo `.env`
- Use `.gitignore` para proteger arquivos sensíveis
- Armazene chaves de API em variáveis de ambiente
- Use CORS de forma restritiva em produção
- Validar e sanitizar todas as entradas de usuário

## 📝 Módulos do Pipeline

### Módulo 1: Gerador de Dados
Extrai e gera dados brutos da fonte especificada.

### Módulo 2: Ingestão de Dados
Processa, normaliza e valida os dados.

### Módulo 3: Detecção de Anomalias
Identifica padrões anormais usando algoritmos estatísticos.

### Módulo 4: Classificação com IA
Classifica dados usando modelos de machine learning.

### Módulo 5: Geração de Relatórios
Compila resultados em relatório estruturado.

## 🧪 Testes

```bash
# Backend
pytest backend/

# Frontend
npm run test
```

## 📊 Monitoramento

- **pgAdmin**: Gerenciar banco de dados em http://localhost:5050
- **Logs**: Verifique logs em `docker-compose logs`
- **Health Check**: GET http://localhost:8000/health

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
2. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
3. Push para a branch (`git push origin feature/AmazingFeature`)
4. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 📞 Suporte

Para suporte e dúvidas, abra uma issue no repositório.

---

**Desenvolvido para Global Solution 2026** 🎓
