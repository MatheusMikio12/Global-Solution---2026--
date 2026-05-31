# OVERWATCH · Visão Computacional

Detecção de incêndios florestais (wildfire) em imagens aéreas/satélite usando uma
CNN **MobileNetV2** (transfer learning).

## Modelo

- **Arquivo:** `modelo_wildfire (1).keras`
- **Arquitetura:** MobileNetV2 (backbone ImageNet) → GlobalAveragePooling2D → Dropout → Dense(1, sigmoid)
- **Entrada:** imagem RGB `160×160×3`
- **Saída:** sigmoide — probabilidade de incêndio
- **Classes:** `0 = Sem Incêndio` · `1 = Incêndio Detectado` (threshold 0.5)

> Convenção de rótulos: a saída sigmoide é interpretada como **P(incêndio)**. Se o seu
> treino usou a ordem inversa de classes, basta inverter `CLASSES` em `api.py`.

## Instalação

```bash
pip install -r requirements.txt
```

> O modelo foi salvo com Keras 3.13.2 — é necessário `keras>=3.13.2` (já fixado no requirements).

## Execução

```bash
cd backend/visao-computacional
python api.py
```

API em `http://localhost:8002` · Docs Swagger em `http://localhost:8002/docs`

## Endpoints

| Método | Rota             | Descrição                                       |
|--------|------------------|-------------------------------------------------|
| GET    | `/visao/status`  | Saúde da API e do modelo carregado              |
| GET    | `/visao/info`    | Arquitetura, classes e pré-processamento        |
| POST   | `/visao/prever`  | Classifica uma imagem (multipart `file`)        |

Exemplo:

```bash
curl -X POST http://localhost:8002/visao/prever -F "file=@imagem.jpg"
```

```json
{
  "arquivo": "imagem.jpg",
  "classe": 0,
  "label": "Sem Incêndio",
  "incendio": false,
  "probabilidade_fogo": 0.1706,
  "confianca": 0.8294,
  "threshold": 0.5
}
```

## Front-end

A aba **Visão Comp.** (`frontend/src/App.jsx` → `TabVisao`) consome esta API:
arraste/selecione uma imagem, clique em **Analisar Imagem** e veja o resultado
com barra de probabilidade. URL configurável via `VITE_VISION_API_URL` (padrão `:8002`).
