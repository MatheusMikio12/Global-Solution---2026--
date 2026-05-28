import { useState, useEffect, useCallback } from 'react'
import APIService from './services/api'

const TABS = [
  { id: 'dashboard',  icon: '🛰️',  label: 'Dashboard',       subject: 'Visão Geral do Projeto' },
  { id: 'rpa',        icon: '🤖',  label: 'RPA',             subject: 'AI for Robotic Process Automation' },
  { id: 'generative', icon: '✨',  label: 'Generative AI',    subject: 'Generative AI e Advanced Nets' },
  { id: 'pln',        icon: '💬',  label: 'PLN',             subject: 'Processamento de Linguagem Natural, Chatbots & Virtual Agents' },
  { id: 'visao',      icon: '👁️',  label: 'Visão Comp.',     subject: 'Visão Computacional' },
  { id: 'iot',        icon: '📡',  label: 'IoT',             subject: 'Physical Computing, Embedded AI, Robotics & Cognitive IoT' },
  { id: 'governanca', icon: '📊',  label: 'Governança',       subject: 'Governança em IA e Business Analytics' },
  { id: 'neuro',      icon: '🧠',  label: 'Neuromórfica',     subject: 'Cluster Computing, Computação Neuromórfica e Supercomputadores' },
  { id: 'quantica',   icon: '⚛️',  label: 'Quântica',         subject: 'Computação Quântica e IA' },
]

const SEV_COLOR = { critica: '#C0392B', alta: '#E67E22', media: '#F1C40F', baixa: '#27AE60' }
const SEV_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa' }

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab,   setActiveTab]   = useState('dashboard')
  const [status,      setStatus]      = useState(null)
  const [apiOnline,   setApiOnline]   = useState(false)
  const [resumo,      setResumo]      = useState(null)
  const [alertas,     setAlertas]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [usarIa,      setUsarIa]      = useState(true)
  const [maxAlertas,  setMaxAlertas]  = useState(10)
  const [erroDisparo, setErroDisparo] = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await APIService.statusPipeline()
      setStatus(data); setApiOnline(true); return data
    } catch { setApiOnline(false); setStatus(null); return null }
  }, [])

  const fetchResultados = useCallback(async () => {
    try {
      const [res, als] = await Promise.all([APIService.resumo(), APIService.alertas()])
      setResumo(res); setAlertas(als.alertas || [])
    } catch {}
  }, [])

  useEffect(() => { fetchStatus(); fetchResultados() }, [])

  useEffect(() => {
    if (status?.pipeline !== 'running') return
    const id = setInterval(async () => {
      const s = await fetchStatus()
      if (s?.pipeline === 'done')  { fetchResultados(); clearInterval(id) }
      if (s?.pipeline === 'error') clearInterval(id)
    }, 2000)
    return () => clearInterval(id)
  }, [status?.pipeline])

  const rodarPipeline = async () => {
    setErroDisparo(null); setLoading(true)
    try {
      await APIService.executarPipeline(usarIa, maxAlertas)
      await fetchStatus()
    } catch {
      setErroDisparo('Backend offline. Inicie com: cd backend/rpa && python api.py')
    } finally { setLoading(false) }
  }

  const pipelineStatus = status?.pipeline ?? 'desconhecido'

  return (
    <div className="app">
      {/* Header */}
      <header>
        <div className="header-inner">
          <div className="header-brand">
            <span className="logo">🛰️ OVERWATCH</span>
            <span className="tagline">Pipeline de Previsão Climática Espacial · FIAP GS 2026</span>
          </div>
          <div className="header-right">
            <span className={`pipeline-badge status-${pipelineStatus}`}>
              {pipelineStatus.toUpperCase()}
            </span>
            <span className={`api-badge ${apiOnline ? 'online' : 'offline'}`}>
              {apiOnline ? '● Online' : '○ Offline'}
            </span>
          </div>
        </div>

        {/* Abas */}
        <nav className="tab-bar">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              title={t.subject}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main>
        {/* Matéria ativa */}
        <div className="subject-label">
          📚 {TABS.find(t => t.id === activeTab)?.subject}
        </div>

        {activeTab === 'dashboard'  && <TabDashboard resumo={resumo} apiOnline={apiOnline} pipelineStatus={pipelineStatus} alertas={alertas} />}
        {activeTab === 'rpa'        && <TabRPA status={status} apiOnline={apiOnline} pipelineStatus={pipelineStatus} loading={loading} usarIa={usarIa} setUsarIa={setUsarIa} maxAlertas={maxAlertas} setMaxAlertas={setMaxAlertas} rodarPipeline={rodarPipeline} erroDisparo={erroDisparo} />}
        {activeTab === 'quantica'   && <TabQuantica />}
        {!['dashboard', 'rpa', 'quantica'].includes(activeTab) && <TabPlaceholder tab={TABS.find(t => t.id === activeTab)} />}
      </main>

      <footer>OVERWATCH · FIAP Global Solution 2026</footer>
    </div>
  )
}

// ── Tab: Dashboard ─────────────────────────────────────────────────────────

function TabDashboard({ resumo, apiOnline, pipelineStatus, alertas }) {
  const sevCount = alertas.reduce((acc, a) => {
    const s = a.severidade?.toLowerCase() || 'indefinido'
    acc[s] = (acc[s] || 0) + 1; return acc
  }, {})

  return (
    <div>
      {resumo ? (
        <>
          <h2 className="section-title">Métricas da Missão</h2>
          <div className="kpi-grid">
            <KPI label="Total de Leituras"    value={resumo.total_leituras?.toLocaleString('pt-BR')} color="#2980B9" />
            <KPI label="Anomalias Detectadas" value={resumo.total_anomalias}                          color="#E67E22" />
            <KPI label="Taxa de Anomalia"     value={`${resumo.taxa_anomalia_pct}%`}                  color="#E67E22" />
            <KPI label="Alertas Críticos"     value={resumo.alertas_criticos}                         color="#C0392B" />
            <KPI label="Alertas Altos"        value={resumo.alertas_altos}                            color="#E67E22" />
            <KPI label="Regiões Monitoradas"  value={resumo.regioes_monitoradas}                      color="#2980B9" />
            <KPI label="Satélites Utilizados" value={resumo.satelites_utilizados}                     color="#2980B9" />
          </div>
          <p className="period-info">
            📅 Período: {resumo.periodo_inicio?.slice(0, 10)} → {resumo.periodo_fim?.slice(0, 10)}
          </p>

          {alertas.length > 0 && (
            <section className="card" style={{ marginTop: '1.5rem' }}>
              <h2 className="section-title">Últimos Alertas</h2>
              <div className="table-wrapper">
                <table>
                  <thead><tr>
                    <th>Região</th><th>Tipo de Desastre</th><th>Severidade</th><th>Recomendação</th>
                  </tr></thead>
                  <tbody>
                    {alertas.slice(0, 10).map((a, i) => (
                      <tr key={i}>
                        <td><strong>{a.regiao}</strong></td>
                        <td className="capitalize">{a.tipo_desastre || '—'}</td>
                        <td>
                          {a.severidade && (
                            <span className="sev-badge" style={{ background: SEV_COLOR[a.severidade.toLowerCase()] ?? '#999' }}>
                              {SEV_LABEL[a.severidade.toLowerCase()] ?? a.severidade}
                            </span>
                          )}
                        </td>
                        <td className="rec-cell">{a.recomendacao || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🛰️</div>
          <p>Nenhum resultado disponível ainda.</p>
          <p>Vá até a aba <strong>RPA</strong> e clique em <strong>▶ Rodar Pipeline</strong>.</p>
          {!apiOnline && (
            <p className="warn">
              ⚠️ Backend offline. Inicie com:<br />
              <code>cd backend/rpa && python api.py</code>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab: RPA ───────────────────────────────────────────────────────────────

function TabRPA({ status, apiOnline, pipelineStatus, loading, usarIa, setUsarIa, maxAlertas, setMaxAlertas, rodarPipeline, erroDisparo }) {
  const etapas = [
    { num: 1, nome: 'Gerador de Dados',       desc: 'Simula leituras dos satélites Sentinel-2, Landsat-9 e GOES-16.' },
    { num: 2, nome: 'Ingestão e Limpeza',     desc: 'Valida limites físicos, remove duplicatas e aplica Z-score por região.' },
    { num: 3, nome: 'Detecção de Anomalias',  desc: 'Treina Isolation Forest com 200 estimadores sobre 5 variáveis climáticas.' },
    { num: 4, nome: 'Classificação com IA',   desc: 'Google Gemini retorna tipo de desastre, severidade e recomendação.' },
    { num: 5, nome: 'Geração de Relatório',   desc: 'Exporta Excel (4 abas) e JSON estruturado para o front-end.' },
  ]

  return (
    <div>
      <section className="card">
        <h2 className="section-title">Controle do Pipeline</h2>

        <div className="status-row">
          <div>
            <span className="label">Status: </span>
            <span className={`pipeline-badge status-${pipelineStatus}`}>{pipelineStatus.toUpperCase()}</span>
          </div>
          {status?.ia_disponivel != null && (
            <span className="label">
              Gemini: {status.ia_disponivel ? '✅ Configurada' : '⚠️ Sem GOOGLE_API_KEY'}
            </span>
          )}
          {status?.concluido_em && (
            <span className="label">
              Último run: {new Date(status.concluido_em).toLocaleString('pt-BR')}
            </span>
          )}
        </div>

        {status?.erro && (
          <div className="alert-box error">
            <strong>Erro:</strong> {status.erro.split('\n')[0]}
          </div>
        )}

        <div className="controls-row">
          <label className="toggle-label">
            <input type="checkbox" checked={usarIa} onChange={e => setUsarIa(e.target.checked)} />
            Usar Google Gemini IA
          </label>
          <label className="num-label">
            Max alertas/região:
            <input type="number" min={1} max={50} value={maxAlertas}
              onChange={e => setMaxAlertas(Number(e.target.value))} className="num-input" />
          </label>
          <button className="btn-run" onClick={rodarPipeline}
            disabled={loading || pipelineStatus === 'running' || !apiOnline}>
            {pipelineStatus === 'running' ? '⏳ Executando...' : '▶ Rodar Pipeline'}
          </button>
        </div>

        {erroDisparo && <div className="alert-box error">{erroDisparo}</div>}
        {pipelineStatus === 'running' && (
          <div className="progress-bar"><div className="progress-fill" /></div>
        )}
      </section>

      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Arquitetura — 5 Etapas do Pipeline</h2>
        <div className="pipeline-steps">
          {etapas.map((e, i) => (
            <div key={e.num} className="step-wrapper">
              <div className="pipeline-step">
                <div className="step-num">{e.num}</div>
                <div className="step-content">
                  <strong>{e.nome}</strong>
                  <span>{e.desc}</span>
                </div>
              </div>
              {i < etapas.length - 1 && <div className="step-arrow">↓</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Tab: Quântica ──────────────────────────────────────────────────────────

function TabQuantica() {
  const [qOnline,       setQOnline]       = useState(false)
  const [qStatus,       setQStatus]       = useState(null)
  const [qModelos,      setQModelos]      = useState(null)
  const [loadingPrever, setLoadingPrever] = useState(false)
  const [resultado,     setResultado]     = useState(null)
  const [erroPrever,    setErroPrever]    = useState(null)
  const [form, setForm] = useState({
    T2M: 22.5, PRECTOTCORR: 5.0, WS10M: 3.5, RH2M: 78.0, ALLSKY_SFC_LW_DWN: 370.0, date: '',
  })

  useEffect(() => {
    APIService.quanticaStatus()
      .then(d => { setQStatus(d); setQOnline(true) })
      .catch(() => { setQOnline(false); setQStatus(null) })
    APIService.quanticaModelos()
      .then(setQModelos)
      .catch(() => {})
  }, [])

  const handlePrever = async (e) => {
    e.preventDefault()
    setErroPrever(null); setLoadingPrever(true)
    try {
      const dados = {
        T2M:               parseFloat(form.T2M),
        PRECTOTCORR:       parseFloat(form.PRECTOTCORR),
        WS10M:             parseFloat(form.WS10M),
        RH2M:              parseFloat(form.RH2M),
        ALLSKY_SFC_LW_DWN: parseFloat(form.ALLSKY_SFC_LW_DWN),
      }
      if (form.date) dados.date = form.date
      const res = await APIService.quanticaPrever(dados)
      setResultado(res)
    } catch {
      setErroPrever('Erro ao chamar a API quântica. Inicie com: cd backend/quantica && python api.py')
    } finally { setLoadingPrever(false) }
  }

  const setField = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div>
      {/* Status */}
      <section className="card">
        <h2 className="section-title">Status da API Quântica</h2>
        <div className="status-row">
          <span className={`api-badge ${qOnline ? 'online' : 'offline'}`}>
            {qOnline ? '● Online' : '○ Offline'}
          </span>
          {qStatus && <>
            <span className="label">Fonte: {qStatus.fonte}</span>
            <span className="label">Qubits: {qStatus.n_qubits}</span>
          </>}
        </div>

        {!qOnline && (
          <div className="alert-box error" style={{ marginTop: '1rem' }}>
            Backend offline. Inicie com: <code>cd backend/quantica && python api.py</code>
          </div>
        )}

        {qStatus?.modelos && (
          <div className="q-models-grid">
            {Object.entries(qStatus.modelos).map(([nome, st]) => (
              <div key={nome} className={`q-model-card ${st === 'ok' ? 'ok' : 'err'}`}>
                <span className="q-model-name">{nome}</span>
                <span className={`q-model-badge ${st === 'ok' ? 'ok' : 'err'}`}>
                  {st === 'ok' ? '✓ OK' : '✗ Erro'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Formulário de predição */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Classificar Evento Climático</h2>
        <p className="label" style={{ marginBottom: '1.25rem' }}>
          Insira as 5 variáveis NASA POWER — o ensemble de modelos (SVM-RBF, Random Forest, QSVC, VQC)
          classifica o dia como <strong>Extremo</strong> ou <strong>Normal</strong> por votação.
        </p>

        <form onSubmit={handlePrever}>
          <div className="q-form-grid">
            <QField label="T2M" unit="°C" desc="Temperatura a 2m" value={form.T2M} onChange={setField('T2M')} />
            <QField label="PRECTOTCORR" unit="mm/dia" desc="Precipitação corrigida" value={form.PRECTOTCORR} onChange={setField('PRECTOTCORR')} />
            <QField label="WS10M" unit="m/s" desc="Velocidade do vento a 10m" value={form.WS10M} onChange={setField('WS10M')} />
            <QField label="RH2M" unit="%" desc="Umidade relativa a 2m" value={form.RH2M} onChange={setField('RH2M')} />
            <QField label="ALLSKY_SFC_LW_DWN" unit="W/m²" desc="Radiação solar descendente" value={form.ALLSKY_SFC_LW_DWN} onChange={setField('ALLSKY_SFC_LW_DWN')} />
            <div className="q-field">
              <label className="q-label">Data <span className="q-unit">(opcional)</span></label>
              <span className="q-desc">Informativo — YYYY-MM-DD</span>
              <input type="date" value={form.date} onChange={e => setField('date')(e.target.value)} className="q-input" />
            </div>
          </div>

          <button type="submit" className="btn-run" style={{ marginTop: '1.25rem' }}
            disabled={loadingPrever || !qOnline}>
            {loadingPrever ? '⏳ Classificando...' : '⚛️ Classificar com QML'}
          </button>
        </form>

        {erroPrever && <div className="alert-box error">{erroPrever}</div>}

        {resultado && (
          <div style={{ marginTop: '1.75rem' }}>
            <h3 className="section-title">Resultado da Classificação</h3>

            <div className="q-consensus-box">
              <div className={`q-consensus-badge ${resultado.consenso?.label === 'Extremo' ? 'extremo' : 'normal'}`}>
                {resultado.consenso?.label ?? '—'}
              </div>
              <div className="q-consensus-detail">
                <span>Votos Extremo: <strong>{resultado.consenso?.votos_extremo}</strong></span>
                <span>Votos Normal: <strong>{resultado.consenso?.votos_normal}</strong></span>
                <span>Modelos votantes: <strong>{resultado.consenso?.total_modelos}</strong></span>
                <span className="label" style={{ fontSize: '0.75rem' }}>
                  PCA: [{resultado.pca_componentes?.map(v => v.toFixed(4)).join(', ')}]
                </span>
              </div>
            </div>

            <div className="table-wrapper" style={{ marginTop: '1rem' }}>
              <table>
                <thead><tr>
                  <th>Modelo</th><th>Tipo</th><th>Predição</th><th>Prob / Score</th><th>AUC Treino</th>
                </tr></thead>
                <tbody>
                  {Object.entries(resultado.predicoes).map(([modelo, pred]) => (
                    <tr key={modelo}>
                      <td><strong>{modelo}</strong></td>
                      <td>
                        <span className={`q-type-badge ${pred.tipo === 'quântico' ? 'quantico' : 'classico'}`}>
                          {pred.tipo ?? '—'}
                        </span>
                      </td>
                      <td>
                        {pred.label
                          ? <span className="sev-badge" style={{ background: pred.label === 'Extremo' ? '#C0392B' : '#1a4a2e', color: pred.label === 'Extremo' ? '#fff' : '#27ae60' }}>{pred.label}</span>
                          : pred.erro ? <span style={{ color: '#e74c3c', fontSize: '0.78rem' }}>{pred.erro.slice(0, 60)}</span>
                          : '—'}
                      </td>
                      <td>
                        {pred.probabilidade != null
                          ? `${(pred.probabilidade * 100).toFixed(1)}%`
                          : pred.decision_function != null
                            ? pred.decision_function.toFixed(4)
                            : '—'}
                      </td>
                      <td>{pred.auc_treino != null ? pred.auc_treino.toFixed(4) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="label" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
              Data de referência: {resultado.data}
            </p>
          </div>
        )}
      </section>

      {/* Tabela de modelos */}
      {qModelos && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <h2 className="section-title">Ensemble de Modelos — Métricas</h2>
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>Modelo</th><th>Tipo</th><th>Acurácia</th><th>F1</th><th>AUC</th><th>Inferência</th><th>Status</th>
              </tr></thead>
              <tbody>
                {qModelos.modelos?.map(m => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.nome}</strong>
                      <div style={{ fontSize: '0.72rem', color: '#5a7a9a', marginTop: '2px' }}>
                        {m.config || m.circuito}
                      </div>
                    </td>
                    <td>
                      <span className={`q-type-badge ${m.tipo === 'quântico' ? 'quantico' : 'classico'}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td>{m.acuracia}</td>
                    <td>{m.f1}</td>
                    <td>{m.auc}</td>
                    <td>{m.inferencia_ms} ms</td>
                    <td>
                      <span className={`q-model-badge ${m.status === 'ok' ? 'ok' : 'err'}`}>
                        {m.status === 'ok' ? '✓' : '✗'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {qModelos.dataset && (
            <p className="label" style={{ marginTop: '0.75rem', fontSize: '0.77rem' }}>
              Dataset: {qModelos.dataset.fonte} · {qModelos.dataset.local} · {qModelos.dataset.periodo} · {qModelos.dataset.registros} registros · {qModelos.dataset.extremos_pct}% extremos
            </p>
          )}
          {qModelos.diagnostico_nisq && (
            <p className="label" style={{ marginTop: '0.5rem', fontSize: '0.77rem', lineHeight: 1.6 }}>
              ⚠️ {qModelos.diagnostico_nisq}
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function QField({ label, unit, desc, value, onChange }) {
  return (
    <div className="q-field">
      <label className="q-label">{label} <span className="q-unit">{unit}</span></label>
      <span className="q-desc">{desc}</span>
      <input type="number" step="any" value={value}
        onChange={e => onChange(e.target.value)} className="q-input" required />
    </div>
  )
}

// ── Tab: Placeholder ───────────────────────────────────────────────────────

function TabPlaceholder({ tab }) {
  return (
    <div className="placeholder-tab">
      <div className="placeholder-icon">{tab?.icon}</div>
      <h2>{tab?.label}</h2>
      <p>{tab?.subject}</p>
      <span className="placeholder-badge">Em construção</span>
    </div>
  )
}

// ── Utilitários ────────────────────────────────────────────────────────────

function KPI({ label, value, color }) {
  return (
    <div className="kpi-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="kpi-value" style={{ color }}>{value ?? '—'}</div>
      <div className="kpi-label">{label}</div>
    </div>
  )
}
