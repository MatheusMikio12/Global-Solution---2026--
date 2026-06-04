# Computação Neuromórfica — NeuroSpace Alert (porta 8004)

Simulador de um **sensor neuromórfico de baixo consumo** com **memristor virtual**,
para detecção de condição crítica em ambiente espacial / estação remota monitorada
por satélite. Integra o OVERWATCH como um nó de borda (edge) que gera alertas locais
sem depender de processamento na nuvem.

## Como funciona

1. **Entrada física** — temperatura (°C), radiação (µSv/h) e poeira (%), uma leitura
   a cada 5 min ao longo de 5 h (61 amostras).
2. **Conversão em tensão** — as variáveis são normalizadas e combinadas:
   `índice = 0.45·temp + 0.35·rad + 0.20·poeira` → `V = 15 + 25·índice`.
3. **Memristor virtual** — um estado `w` (0–1) **acumula** efeito quando `V > V_limiar`
   e **relaxa** suavemente abaixo dele, dando memória local ao sensor.
4. **LED de alerta** — `APAGADO` (NORMAL) → `AMARELO` (OBSERVAÇÃO, `w ≥ 0.35`) →
   `VERMELHO` (ALERTA_CRÍTICO, `w ≥ 0.65`).

Três ajustes calibram a sensibilidade (`V_limiar`, `taxa_chaveamento`):

| Ajuste | V_limiar | taxa_chaveamento | Perfil |
|--------|----------|------------------|--------|
| A — sensível    | 24 | 0.007 | Detecta cedo, mais sujeito a alarme falso |
| B — equilibrado | 28 | 0.005 | Recomendado como protótipo conceitual |
| C — conservador | 32 | 0.004 | Detecta tarde, menos alarmes falsos |

## Dados

O dataset bruto de entrada (`dataset_neurosensor_espacial_5h.csv`) não é versionado,
mas as **colunas físicas originais estão preservadas** em
`saida_sensor_espacial_Ajuste_B_equilibrado.csv` — a API usa essas colunas como fonte
e **re-simula** para qualquer par de parâmetros.

Arquivos da pasta:
- `NeuroSpace_Alert_EXECUTADO.ipynb` — notebook original do trabalho.
- `saida_sensor_espacial_Ajuste_B_equilibrado.csv` — saída do ajuste B (fonte de dados da API).
- `resumo_transicoes.csv` — comparação das transições dos três ajustes.
- `GS - RELATORIO - NEUROMORFICA.docx.pdf` — relatório.

## Executar

```bash
cd backend/neuromorfica
pip install -r requirements.txt
python api.py
# http://localhost:8004  ·  docs em /docs
```

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET  | `/neuro/status`  | Estado da API e do dataset |
| GET  | `/neuro/info`    | Cenário, modelo conceitual e parâmetros |
| GET  | `/neuro/ajustes` | Resumo comparativo dos três ajustes da equipe |
| POST | `/neuro/simular` | Roda a simulação para `V_limiar` + `taxa_chaveamento` |

Exemplo:

```bash
curl -X POST http://localhost:8004/neuro/simular \
  -H "Content-Type: application/json" \
  -d '{"V_limiar": 28, "taxa_chaveamento": 0.005}'
```
