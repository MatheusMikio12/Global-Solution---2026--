import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import APIService from './services/api'

const TABS = [
  { id: 'dashboard',  icon: '🛰️',  label: 'Dashboard',    subject: 'Visão Geral do Projeto' },
  { id: 'rpa',        icon: '🤖',  label: 'RPA',          subject: 'AI for Robotic Process Automation' },
  { id: 'generative', icon: '✨',  label: 'Generative AI', subject: 'Generative AI e Advanced Nets' },
  { id: 'pln',        icon: '💬',  label: 'PLN',          subject: 'PLN, Chatbots & Virtual Agents' },
  { id: 'visao',      icon: '👁️',  label: 'Visão Comp.',  subject: 'Visão Computacional' },
  { id: 'iot',        icon: '📡',  label: 'IoT',          subject: 'Physical Computing, Embedded AI & Cognitive IoT' },
  { id: 'neuro',      icon: '🧠',  label: 'Neuromórfica', subject: 'Cluster Computing, Computação Neuromórfica e Supercomputadores' },
  { id: 'quantica',   icon: '⚛️',  label: 'Quântica',     subject: 'Computação Quântica e IA' },
]

const SEV_COLOR = { critica: '#C0392B', alta: '#E67E22', media: '#F1C40F', baixa: '#27AE60' }
const SEV_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa' }
const REGION_COLORS = ['#00f2ff', '#00ff9d', '#ff9042', '#b060ff', '#ffd166', '#ff3f6c']

const PLACEHOLDER_CONTENT = {
  generative: {
    intro: 'Modelos generativos transformam dados climáticos brutos em linguagem natural, imagens sintéticas e relatórios automáticos de missão.',
    cards: [
      { icon: '📝', titulo: 'Classificação Gemini 1.5', desc: 'O Módulo 4 do OVERWATCH usa Gemini 1.5 Flash com structured output para classificar cada anomalia em tipo de desastre, severidade (crítica/alta/média/baixa) e recomendação de ação.' },
      { icon: '🖼️', titulo: 'Imagens Satélite Sintéticas', desc: 'GANs condicionais (StyleGAN3) geram imagens multiespectrais de satélite para regiões com alta cobertura de nuvens, aumentando datasets de segmentação.' },
      { icon: '🌐', titulo: 'Boletins Climáticos', desc: 'RAG (Retrieval-Augmented Generation) conecta o banco de alertas do OVERWATCH a um LLM para redigir boletins de emergência personalizados por região.' },
    ],
  },
  pln: {
    intro: 'NLP extrai conhecimento de relatórios meteorológicos, comunicados de defesa civil e redes sociais para enriquecer os alertas gerados pelo pipeline.',
    cards: [
      { icon: '🔍', titulo: 'NER em Notícias de Desastres', desc: 'BERTimbau extrai entidades nomeadas (localização, data, tipo de evento) de notícias sobre desastres climáticos brasileiros, validando predições do Isolation Forest.' },
      { icon: '😰', titulo: 'Monitoramento Social', desc: 'Análise de sentimento em tempo real em tweets detecta pânico climático regional antes dos alertas oficiais, usando RoBERTa-Twitter com janela de 30 min.' },
      { icon: '🤖', titulo: 'Chatbot de Alertas', desc: 'Agente conversacional (Gemini + webhooks FastAPI) responde perguntas em linguagem natural sobre alertas ativos: "Qual a situação do Caribe agora?" → consulta direta ao OVERWATCH API.' },
    ],
  },
  visao: {
    intro: 'CNNs e modelos de segmentação analisam imagens multiespectrais de Sentinel-2 e GOES-16 para detecção automática de incêndios, enchentes e desmatamento.',
    cards: [
      { icon: '🔥', titulo: 'Detecção de Incêndios', desc: 'YOLOv8 treinado em imagens GOES-16 banda 7 (infravermelho) detecta pontos de calor em < 100ms por tile de 512×512px, com threshold calibrado por bioma.' },
      { icon: '🌊', titulo: 'Segmentação de Enchentes', desc: 'U-Net com imagens SAR Sentinel-1 segmenta áreas inundadas independentemente de cobertura de nuvens — única opção viável no Brasil em época de monções.' },
      { icon: '🌿', titulo: 'Previsão de NDVI', desc: 'O OVERWATCH já calcula NDVI por sensor. ConvLSTM prevê NDVI futuro a partir de sequências temporais de 30 dias, antecipando condições de seca ou recuperação florestal.' },
    ],
  },
  iot: {
    intro: 'Sensores embarcados e edge AI complementam satélites com dados hiperlocais em tempo real, fechando o ciclo de observação terrestre-orbital.',
    cards: [
      { icon: '🌡️', titulo: 'Estações IoT Meteorológicas', desc: 'ESP32 + BME680 (temperatura, umidade, pressão, VOC) transmitem via MQTT a cada 10 min. Dados são ingeridos pelo Módulo 2 do pipeline, expandindo além dos 6 satélites simulados.' },
      { icon: '⚡', titulo: 'Edge AI para Anomalias', desc: 'TensorFlow Lite roda Isolation Forest quantizado (INT8) no microcontrolador. Anomalias são detectadas localmente sem latência de rede, transmitindo apenas alertas — economia de 95% de banda.' },
      { icon: '🛸', titulo: 'Fusão Terrestre-Orbital', desc: 'Kalman Filter combina leituras IoT de solo com dados satelitais, reduzindo incerteza de temperatura de ±3°C para ±0.8°C nas regiões com cobertura de estações.' },
    ],
  },
  neuro: {
    intro: 'Chips neuromórficos e computação distribuída processam streams satelitais em tempo real com consumo de energia ordens de grandeza menor que GPUs convencionais.',
    cards: [
      { icon: '⚡', titulo: 'Spiking Neural Networks', desc: 'Intel Loihi 2 com framework Lava roda SNN para detecção de anomalias em streams GOES-16 com < 1W de consumo vs. 200W de GPUs — viável para satélites com energia solar limitada.' },
      { icon: '🖥️', titulo: 'Cluster Spark Distribuído', desc: 'Apache Spark distribui o Módulo 3 (Isolation Forest) em cluster de 8 workers, reduzindo o tempo de treinamento sobre 2.592 registros de 45s para 4s — escala para 100× mais dados.' },
      { icon: '🌌', titulo: 'HPC para Simulação WRF', desc: 'Supercomputadores como o SDumont (LNCC) rodam modelo WRF a 1km de resolução para previsão regional, alimentando o OVERWATCH com dados de alta fidelidade como entrada do Módulo 1.' },
    ],
  },
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4500)
    return () => clearTimeout(t)
  }, [toast])
  if (!toast) return null
  return (
    <div className={`toast toast-${toast.type}`}>
      <span>{toast.msg}</span>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function SkeletonKPI() {
  return (
    <div className="kpi-grid">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="kpi-card" style={{ borderTop: '4px solid rgba(0,242,255,0.12)' }}>
          <div className="skeleton" style={{ height: 40, width: '60%', margin: '0 auto 10px' }} />
          <div className="skeleton" style={{ height: 12, width: '75%', margin: '0 auto' }} />
        </div>
      ))}
    </div>
  )
}

function SkeletonRows({ rows = 5 }) {
  return (
    <div className="table-wrapper">
      <table><tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (
            <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
          ))}</tr>
        ))}
      </tbody></table>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,    setActiveTab]    = useState('dashboard')
  const [status,       setStatus]       = useState(null)
  const [apiOnline,    setApiOnline]    = useState(false)
  const [resumo,       setResumo]       = useState(null)
  const [alertas,      setAlertas]      = useState([])
  const [serieData,    setSerieData]    = useState([])
  const [regiaoData,   setRegiaoData]   = useState([])
  const [loadingDados, setLoadingDados] = useState(false)
  const [filtroSev,    setFiltroSev]    = useState('')
  const [filtroRegiao, setFiltroRegiao] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [usarIa,       setUsarIa]       = useState(true)
  const [maxAlertas,   setMaxAlertas]   = useState(10)
  const [erroDisparo,  setErroDisparo]  = useState(null)
  const [toast,        setToast]        = useState(null)
  const prevStatus = useRef(null)
  const startTime  = useRef(null)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await APIService.statusPipeline()
      setStatus(data); setApiOnline(true); return data
    } catch { setApiOnline(false); setStatus(null); return null }
  }, [])

  const fetchResultados = useCallback(async () => {
    setLoadingDados(true)
    try {
      const [res, als, serie, regioes] = await Promise.all([
        APIService.resumo(),
        APIService.alertas(),
        APIService.serieTemporal(),
        APIService.porRegiao(),
      ])
      setResumo(res)
      setAlertas(als.alertas || [])

      // Pivot série temporal → recharts format
      const byTime = {}
      ;(serie.serie || []).forEach(pt => {
        const t = pt.timestamp?.slice(0, 16).replace('T', ' ') ?? ''
        if (!byTime[t]) byTime[t] = { time: t }
        byTime[t][pt.regiao] = pt.temp_superficie_C
      })
      const allPts = Object.values(byTime)
      const step = Math.max(1, Math.floor(allPts.length / 48))
      setSerieData(allPts.filter((_, i) => i % step === 0))

      // Bar chart data
      setRegiaoData(
        Object.entries(regioes).map(([name, d]) => ({
          name: name.replace('-BR', '').replace('-PE', ''),
          anomalias: d.anomalias,
        }))
      )
    } catch {}
    finally { setLoadingDados(false) }
  }, [])

  useEffect(() => { fetchStatus(); fetchResultados() }, [])

  // Polling while running
  useEffect(() => {
    if (status?.pipeline !== 'running') return
    const id = setInterval(async () => {
      const s = await fetchStatus()
      if (s?.pipeline === 'done')  { fetchResultados(); clearInterval(id) }
      if (s?.pipeline === 'error') clearInterval(id)
    }, 2000)
    return () => clearInterval(id)
  }, [status?.pipeline])

  // Toast on completion/error
  useEffect(() => {
    if (!status) return
    const prev = prevStatus.current
    const curr = status.pipeline
    if (prev === 'running' && curr === 'done') {
      const elapsed = startTime.current
        ? Math.round((Date.now() - startTime.current) / 1000) : null
      setToast({ msg: `✅ Pipeline concluído${elapsed ? ` em ${elapsed}s` : ''}!`, type: 'success' })
    } else if (prev === 'running' && curr === 'error') {
      setToast({ msg: '❌ Pipeline falhou. Verifique o log de erros.', type: 'error' })
    }
    prevStatus.current = curr
  }, [status?.pipeline])

  const rodarPipeline = async () => {
    setErroDisparo(null); setLoading(true)
    startTime.current = Date.now()
    try {
      await APIService.executarPipeline(usarIa, maxAlertas)
      await fetchStatus()
    } catch {
      setErroDisparo('Backend offline. Inicie com: cd backend/rpa && python api.py')
    } finally { setLoading(false) }
  }

  const pipelineStatus = status?.pipeline ?? 'desconhecido'
  const regioesList = [...new Set(alertas.map(a => a.regiao).filter(Boolean))]
  const alertasFiltrados = alertas.filter(a => {
    const okSev = !filtroSev    || a.severidade?.toLowerCase() === filtroSev
    const okReg = !filtroRegiao || a.regiao === filtroRegiao
    return okSev && okReg
  })

  return (
    <div className="app">
      <div className="starfield" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />

      <header>
        <div className="header-inner">
          <div className="header-brand">
            <span className="logo">🛰️ OVERWATCH</span>
            <span className="tagline">Pipeline de Previsão Climática Espacial · FIAP GS 2026</span>
          </div>
          <div className="header-right">
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="btn-api-docs">
              API Docs ↗
            </a>
            <span className={`pipeline-badge status-${pipelineStatus}`}>
              {pipelineStatus.toUpperCase()}
            </span>
            <span className={`api-badge ${apiOnline ? 'online' : 'offline'}`}>
              {apiOnline ? '● Online' : '○ Offline'}
            </span>
          </div>
        </div>
        <nav className="tab-bar">
          {TABS.map(t => (
            <button key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)} title={t.subject}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main>
        <div className="subject-label">
          📚 {TABS.find(t => t.id === activeTab)?.subject}
        </div>

        {activeTab === 'dashboard' && (
          <TabDashboard
            resumo={resumo} apiOnline={apiOnline} pipelineStatus={pipelineStatus}
            alertas={alertasFiltrados} allAlertas={alertas}
            loadingDados={loadingDados}
            filtroSev={filtroSev} setFiltroSev={setFiltroSev}
            filtroRegiao={filtroRegiao} setFiltroRegiao={setFiltroRegiao}
            regioesList={regioesList} serieData={serieData} regiaoData={regiaoData}
          />
        )}
        {activeTab === 'rpa' && (
          <TabRPA status={status} apiOnline={apiOnline} pipelineStatus={pipelineStatus}
            loading={loading} usarIa={usarIa} setUsarIa={setUsarIa}
            maxAlertas={maxAlertas} setMaxAlertas={setMaxAlertas}
            rodarPipeline={rodarPipeline} erroDisparo={erroDisparo}
          />
        )}
        {activeTab === 'quantica' && <TabQuantica />}
        {activeTab === 'visao' && <TabVisao />}
        {!['dashboard', 'rpa', 'quantica', 'visao'].includes(activeTab) && (
          <TabPlaceholder tab={TABS.find(t => t.id === activeTab)} />
        )}
      </main>

      <footer>OVERWATCH · FIAP Global Solution 2026</footer>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

// ── Tab: Dashboard ────────────────────────────────────────────────────────────
function TabDashboard({
  resumo, apiOnline, pipelineStatus, alertas, allAlertas, loadingDados,
  filtroSev, setFiltroSev, filtroRegiao, setFiltroRegiao,
  regioesList, serieData, regiaoData,
}) {
  const chartRegions = serieData.length > 0
    ? Object.keys(serieData[0]).filter(k => k !== 'time')
    : []

  return (
    <div>
      {loadingDados && !resumo ? (
        <section className="card">
          <h2 className="section-title">Métricas da Missão</h2>
          <SkeletonKPI />
        </section>
      ) : resumo ? (
        <>
          {/* KPIs + download */}
          <section className="card">
            <div className="kpi-header">
              <h2 className="section-title" style={{ marginBottom: 0, flex: 1 }}>Métricas da Missão</h2>
              <a
                href={APIService.downloadRelatorioUrl()}
                target="_blank" rel="noreferrer"
                className="btn-download"
              >
                ⬇ Baixar Excel
              </a>
            </div>
            <div className="kpi-grid" style={{ marginTop: '1.25rem' }}>
              <KPI label="Total de Leituras"    value={resumo.total_leituras?.toLocaleString('pt-BR')} color="#2980B9" />
              <KPI label="Anomalias Detectadas" value={resumo.total_anomalias}  color="#E67E22" />
              <KPI label="Taxa de Anomalia"     value={`${resumo.taxa_anomalia_pct}%`} color="#E67E22" />
              <KPI label="Alertas Críticos"     value={resumo.alertas_criticos}  color="#C0392B" />
              <KPI label="Alertas Altos"        value={resumo.alertas_altos}     color="#E67E22" />
              <KPI label="Regiões Monitoradas"  value={resumo.regioes_monitoradas} color="#2980B9" />
              <KPI label="Satélites Utilizados" value={resumo.satelites_utilizados} color="#2980B9" />
            </div>
            <p className="period-info">
              📅 Período: {resumo.periodo_inicio?.slice(0, 10)} → {resumo.periodo_fim?.slice(0, 10)}
            </p>
          </section>

          {/* Charts */}
          {regiaoData.length > 0 && (
            <div className="charts-row">
              <section className="card chart-card">
                <h2 className="section-title">Anomalias por Região</h2>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={regiaoData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,242,255,0.08)" />
                    <XAxis dataKey="name" tick={{ fill: '#527f96', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#527f96', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#10131a', border: '1px solid rgba(0,242,255,0.22)', borderRadius: 8, color: '#92c8e0', fontSize: 12 }}
                      cursor={{ fill: 'rgba(0,242,255,0.04)' }}
                    />
                    <Bar dataKey="anomalias" name="Anomalias" radius={[4, 4, 0, 0]}>
                      {regiaoData.map((_, i) => (
                        <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </section>

              {serieData.length > 0 && (
                <section className="card chart-card">
                  <h2 className="section-title">Temperatura por Hora (°C)</h2>
                  <ResponsiveContainer width="100%" height={210}>
                    <LineChart data={serieData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,242,255,0.08)" />
                      <XAxis dataKey="time"
                        tick={{ fill: '#527f96', fontSize: 10 }}
                        tickFormatter={t => t?.slice(5, 13) ?? ''}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fill: '#527f96', fontSize: 11 }} unit="°" />
                      <Tooltip
                        contentStyle={{ background: '#10131a', border: '1px solid rgba(0,242,255,0.22)', borderRadius: 8, color: '#92c8e0', fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.60rem', color: '#527f96', paddingTop: 4 }} />
                      {chartRegions.map((region, i) => (
                        <Line key={region} type="monotone" dataKey={region}
                          stroke={REGION_COLORS[i % REGION_COLORS.length]}
                          dot={false} strokeWidth={1.5} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </section>
              )}
            </div>
          )}

          {/* Alerts with filters */}
          {allAlertas.length > 0 ? (
            <section className="card" style={{ marginTop: '1.5rem' }}>
              <div className="alerts-header">
                <h2 className="section-title" style={{ marginBottom: 0, flex: 1 }}>Alertas</h2>
                <div className="filters-row">
                  <select className="filter-select" value={filtroSev} onChange={e => setFiltroSev(e.target.value)}>
                    <option value="">Todas severidades</option>
                    <option value="critica">Crítica</option>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                  <select className="filter-select" value={filtroRegiao} onChange={e => setFiltroRegiao(e.target.value)}>
                    <option value="">Todas regiões</option>
                    {regioesList.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <span className="filter-count">{alertas.length} alertas</span>
                </div>
              </div>
              <div className="table-wrapper" style={{ marginTop: '1rem' }}>
                <table>
                  <thead><tr>
                    <th>Região</th><th>Tipo de Desastre</th><th>Severidade</th><th>Recomendação</th>
                  </tr></thead>
                  <tbody>
                    {alertas.slice(0, 60).map((a, i) => (
                      <tr key={i}>
                        <td><strong>{a.regiao}</strong></td>
                        <td className="capitalize">{a.tipo_desastre || '—'}</td>
                        <td>
                          {a.severidade && (
                            <span className="sev-badge"
                              style={{ background: SEV_COLOR[a.severidade.toLowerCase()] ?? '#999' }}>
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
          ) : (
            loadingDados && <section className="card" style={{ marginTop: '1.5rem' }}>
              <h2 className="section-title">Alertas</h2>
              <SkeletonRows rows={5} />
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

// ── Tab: RPA ──────────────────────────────────────────────────────────────────
function TabRPA({ status, apiOnline, pipelineStatus, loading, usarIa, setUsarIa,
                  maxAlertas, setMaxAlertas, rodarPipeline, erroDisparo }) {
  const etapas = [
    { num: 1, nome: 'Gerador de Dados',       desc: 'Simula leituras dos satélites Sentinel-2, Landsat-9 e GOES-16.' },
    { num: 2, nome: 'Ingestão e Limpeza',     desc: 'Valida limites físicos, remove duplicatas e aplica Z-score por região.' },
    { num: 3, nome: 'Detecção de Anomalias',  desc: 'Treina Isolation Forest com 200 estimadores sobre 5 variáveis climáticas.' },
    { num: 4, nome: 'Classificação com IA',   desc: 'Google Gemini retorna tipo de desastre, severidade e recomendação.' },
    { num: 5, nome: 'Geração de Relatório',   desc: 'Exporta Excel (4 abas) e JSON estruturado para o front-end.' },
  ]

  const etapaAtual = status?.etapa_atual ?? 0

  return (
    <div>
      <section className="card">
        <h2 className="section-title">Controle do Pipeline</h2>

        <div className="status-row">
          <div>
            <span className="label">Status: </span>
            <span className={`pipeline-badge status-${pipelineStatus}`}>
              {pipelineStatus.toUpperCase()}
            </span>
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
          {pipelineStatus === 'running' && status?.etapa_nome && (
            <span className="label running-etapa">⟳ {status.etapa_nome}…</span>
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
          <div className="progress-bar" style={{ marginTop: '1.25rem' }}>
            <div className="progress-fill" />
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Arquitetura — 5 Etapas do Pipeline</h2>
        <div className="pipeline-steps">
          {etapas.map((e, i) => {
            let state = 'idle'
            if (pipelineStatus === 'done')    state = 'done'
            else if (pipelineStatus === 'running') {
              if (etapaAtual > e.num)        state = 'done'
              else if (etapaAtual === e.num) state = 'running'
            }
            return (
              <div key={e.num} className="step-wrapper">
                <div className={`pipeline-step step-state-${state}`}>
                  <div className={`step-num step-num-${state}`}>
                    {state === 'done' ? '✓' : state === 'running' ? '⟳' : e.num}
                  </div>
                  <div className="step-content">
                    <strong>{e.nome}</strong>
                    <span>{e.desc}</span>
                  </div>
                </div>
                {i < etapas.length - 1 && <div className="step-arrow">↓</div>}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ── Tab: Quântica ─────────────────────────────────────────────────────────────
function TabQuantica() {
  const [qOnline,        setQOnline]        = useState(false)
  const [qStatus,        setQStatus]        = useState(null)
  const [qModelos,       setQModelos]       = useState(null)
  const [loadingPrever,  setLoadingPrever]  = useState(false)
  const [resultado,      setResultado]      = useState(null)
  const [erroPrever,     setErroPrever]     = useState(null)
  const [form, setForm] = useState({
    T2M: 22.5, PRECTOTCORR: 5.0, WS10M: 3.5, RH2M: 78.0, ALLSKY_SFC_LW_DWN: 370.0, date: '',
  })
  const [nasaForm, setNasaForm] = useState({
    latitude: -23.55, longitude: -46.63, start: '20240101', end: '20241231',
  })
  const [nasaLoading, setNasaLoading] = useState(false)
  const [nasaResult,  setNasaResult]  = useState(null)
  const [nasaErro,    setNasaErro]    = useState(null)

  useEffect(() => {
    APIService.quanticaStatus()
      .then(d => { setQStatus(d); setQOnline(true) })
      .catch(() => { setQOnline(false); setQStatus(null) })
    APIService.quanticaModelos().then(setQModelos).catch(() => {})
  }, [])

  const handlePrever = async (ev) => {
    ev.preventDefault()
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
      setResultado(await APIService.quanticaPrever(dados))
    } catch {
      setErroPrever('Erro ao chamar a API quântica. Inicie com: cd backend/quantica && python api.py')
    } finally { setLoadingPrever(false) }
  }

  const handleNasaFetch = async (ev) => {
    ev.preventDefault()
    setNasaErro(null); setNasaLoading(true)
    try {
      setNasaResult(await APIService.quanticaBuscarEPrever({
        latitude:  parseFloat(nasaForm.latitude),
        longitude: parseFloat(nasaForm.longitude),
        start:     nasaForm.start,
        end:       nasaForm.end,
      }))
    } catch {
      setNasaErro('Erro ao buscar dados NASA POWER. Verifique conexão e o backend quântico.')
    } finally { setNasaLoading(false) }
  }

  const setField = key => val => setForm(f => ({ ...f, [key]: val }))

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

      {/* Classificação manual */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Classificar Evento Climático</h2>
        <p className="label" style={{ marginBottom: '1.25rem' }}>
          Insira as 5 variáveis NASA POWER — o ensemble (SVM-RBF, Random Forest, QSVC, VQC)
          classifica o dia por votação.
        </p>
        <form onSubmit={handlePrever}>
          <div className="q-form-grid">
            <QField label="T2M"                unit="°C"    desc="Temperatura a 2m"           value={form.T2M}               onChange={setField('T2M')} />
            <QField label="PRECTOTCORR"        unit="mm/d"  desc="Precipitação corrigida"      value={form.PRECTOTCORR}       onChange={setField('PRECTOTCORR')} />
            <QField label="WS10M"              unit="m/s"   desc="Velocidade do vento a 10m"   value={form.WS10M}             onChange={setField('WS10M')} />
            <QField label="RH2M"               unit="%"     desc="Umidade relativa a 2m"        value={form.RH2M}              onChange={setField('RH2M')} />
            <QField label="ALLSKY_SFC_LW_DWN"  unit="W/m²"  desc="Radiação solar descendente"  value={form.ALLSKY_SFC_LW_DWN} onChange={setField('ALLSKY_SFC_LW_DWN')} />
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
                          : pred.decision_function != null ? pred.decision_function.toFixed(4) : '—'}
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

      {/* NASA POWER fetch */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Buscar Dados Reais — NASA POWER</h2>
        <p className="label" style={{ marginBottom: '1.25rem' }}>
          Consulta a API NASA POWER para uma localização e período. Classifica cada dia
          como <strong>Extremo</strong> ou <strong>Normal</strong> e exibe uma timeline de eventos.
        </p>
        <form onSubmit={handleNasaFetch}>
          <div className="q-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
            <div className="q-field">
              <label className="q-label">Latitude</label>
              <span className="q-desc">Decimal (ex: -23.55 = SP)</span>
              <input type="number" step="any" className="q-input" value={nasaForm.latitude}
                onChange={e => setNasaForm(f => ({ ...f, latitude: e.target.value }))} required />
            </div>
            <div className="q-field">
              <label className="q-label">Longitude</label>
              <span className="q-desc">Decimal (ex: -46.63 = SP)</span>
              <input type="number" step="any" className="q-input" value={nasaForm.longitude}
                onChange={e => setNasaForm(f => ({ ...f, longitude: e.target.value }))} required />
            </div>
            <div className="q-field">
              <label className="q-label">Início <span className="q-unit">YYYYMMDD</span></label>
              <span className="q-desc">Ex: 20240101</span>
              <input type="text" pattern="\d{8}" className="q-input" value={nasaForm.start}
                onChange={e => setNasaForm(f => ({ ...f, start: e.target.value }))} required />
            </div>
            <div className="q-field">
              <label className="q-label">Fim <span className="q-unit">YYYYMMDD</span></label>
              <span className="q-desc">Ex: 20241231</span>
              <input type="text" pattern="\d{8}" className="q-input" value={nasaForm.end}
                onChange={e => setNasaForm(f => ({ ...f, end: e.target.value }))} required />
            </div>
          </div>
          <button type="submit" className="btn-run" style={{ marginTop: '1.25rem' }}
            disabled={nasaLoading || !qOnline}>
            {nasaLoading ? '⏳ Consultando NASA...' : '🌍 Buscar e Classificar'}
          </button>
        </form>

        {nasaErro && <div className="alert-box error">{nasaErro}</div>}

        {nasaResult && (
          <div style={{ marginTop: '1.75rem' }}>
            <div className="nasa-summary">
              <span className="nasa-stat">📍 {nasaResult.local}</span>
              <span className="nasa-stat">📅 {nasaResult.periodo}</span>
              <span className="nasa-stat">📊 {nasaResult.total} dias</span>
              <span className="nasa-stat nasa-extremo-stat">
                🔴 {nasaResult.extremos} extremos ({nasaResult.taxa_pct}%)
              </span>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <h3 className="section-title">Timeline Diária</h3>
              <div className="nasa-timeline">
                {nasaResult.serie?.map((dia, i) => (
                  <div key={i}
                    className={`nasa-day ${dia.consenso === 'Extremo' ? 'day-extremo' : 'day-normal'}`}
                    title={`${dia.date} — ${dia.consenso} (${dia.votos_extremo} votos extremo)`}
                  />
                ))}
              </div>
              <div className="nasa-legend">
                <span><span className="nasa-dot day-extremo" /> Extremo</span>
                <span><span className="nasa-dot day-normal" /> Normal</span>
              </div>
            </div>

            {nasaResult.serie?.some(d => d.consenso === 'Extremo') && (
              <div style={{ marginTop: '1.25rem' }}>
                <h3 className="section-title">Dias Extremos</h3>
                <div className="table-wrapper">
                  <table>
                    <thead><tr>
                      <th>Data</th><th>Votos Extremo</th>
                      {Object.keys(nasaResult.serie.find(d => d.predicoes)?.predicoes || {}).map(m => (
                        <th key={m}>{m.replace('_', ' ')}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {nasaResult.serie.filter(d => d.consenso === 'Extremo').slice(0, 25).map((dia, i) => (
                        <tr key={i}>
                          <td><strong>{dia.date}</strong></td>
                          <td>
                            <span className="sev-badge" style={{ background: '#C0392B' }}>
                              {dia.votos_extremo}/{Object.keys(dia.predicoes || {}).length}
                            </span>
                          </td>
                          {Object.values(dia.predicoes || {}).map((v, j) => (
                            <td key={j}>
                              <span className="sev-badge"
                                style={{ background: v === 'Extremo' ? '#C0392B' : '#1a4a2e', color: v === 'Extremo' ? '#fff' : '#27ae60' }}>
                                {v}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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

// ── Tab: Visão Computacional ──────────────────────────────────────────────────
function TabVisao() {
  const [vOnline,    setVOnline]    = useState(false)
  const [vStatus,    setVStatus]    = useState(null)
  const [vInfo,      setVInfo]      = useState(null)
  const [file,       setFile]       = useState(null)
  const [preview,    setPreview]    = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [resultado,  setResultado]  = useState(null)
  const [erro,       setErro]       = useState(null)
  const [dragOver,   setDragOver]   = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    APIService.visaoStatus()
      .then(d => { setVStatus(d); setVOnline(true) })
      .catch(() => { setVOnline(false); setVStatus(null) })
    APIService.visaoInfo().then(setVInfo).catch(() => {})
  }, [])

  const selecionar = (f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) { setErro('O arquivo precisa ser uma imagem (JPG/PNG).'); return }
    setErro(null); setResultado(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    selecionar(e.dataTransfer.files?.[0])
  }

  const analisar = async () => {
    if (!file) return
    setErro(null); setLoading(true); setResultado(null)
    try {
      setResultado(await APIService.visaoPrever(file))
    } catch {
      setErro('Erro ao chamar a API de visão. Inicie com: cd backend/visao-computacional && python api.py')
    } finally { setLoading(false) }
  }

  const isFogo = resultado?.incendio
  const pct = resultado ? Math.round(resultado.probabilidade_fogo * 100) : 0

  return (
    <div>
      {/* Status */}
      <section className="card">
        <h2 className="section-title">Status da API de Visão Computacional</h2>
        <div className="status-row">
          <span className={`api-badge ${vOnline ? 'online' : 'offline'}`}>
            {vOnline ? '● Online' : '○ Offline'}
          </span>
          {vStatus && <>
            <span className="label">Modelo: {vStatus.modelo}</span>
            {vStatus.arquivo && <span className="label">Arquivo: {vStatus.arquivo}</span>}
          </>}
        </div>
        {!vOnline && (
          <div className="alert-box error" style={{ marginTop: '1rem' }}>
            Backend offline. Inicie com: <code>cd backend/visao-computacional && python api.py</code>
          </div>
        )}
      </section>

      {/* Upload + análise */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Detectar Incêndio em Imagem</h2>
        <p className="label" style={{ marginBottom: '1.25rem' }}>
          Envie uma imagem aérea ou de satélite. A CNN <strong>MobileNetV2</strong> classifica
          a cena como <strong>Incêndio Detectado</strong> ou <strong>Sem Incêndio</strong>.
        </p>

        <div className="cv-layout">
          <div
            className={`cv-dropzone ${dragOver ? 'dragover' : ''} ${preview ? 'has-img' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {preview ? (
              <img src={preview} alt="pré-visualização" className="cv-preview" />
            ) : (
              <>
                <span className="cv-drop-icon">🖼️</span>
                <span className="cv-drop-text">Clique ou arraste uma imagem aqui</span>
                <span className="cv-drop-hint">JPG / PNG · redimensionada para 160×160</span>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" hidden
              onChange={e => selecionar(e.target.files?.[0])} />
          </div>

          <div className="cv-actions">
            {file && <span className="label" style={{ fontSize: '0.78rem' }}>📎 {file.name}</span>}
            <button className="btn-run" onClick={analisar} disabled={loading || !file || !vOnline}>
              {loading ? '⏳ Analisando...' : '👁️ Analisar Imagem'}
            </button>
            {(file || resultado) && (
              <button className="btn-clear" onClick={() => {
                setFile(null); setPreview(null); setResultado(null); setErro(null)
                if (inputRef.current) inputRef.current.value = ''
              }}>Limpar</button>
            )}
          </div>
        </div>

        {erro && <div className="alert-box error">{erro}</div>}

        {resultado && (
          <div style={{ marginTop: '1.75rem' }}>
            <h3 className="section-title">Resultado da Detecção</h3>
            <div className={`cv-result ${isFogo ? 'fogo' : 'seguro'}`}>
              <div className="cv-result-badge">
                <span className="cv-result-icon">{isFogo ? '🔥' : '✅'}</span>
                <span>{resultado.label}</span>
              </div>
              <div className="cv-result-meta">
                <div className="cv-bar-wrap">
                  <div className="cv-bar-label">
                    <span>Probabilidade de incêndio</span>
                    <strong>{pct}%</strong>
                  </div>
                  <div className="cv-bar-track">
                    <div className="cv-bar-fill" style={{
                      width: `${pct}%`,
                      background: isFogo ? '#ff3f3f' : '#27ae60',
                    }} />
                  </div>
                </div>
                <div className="cv-stats">
                  <span>Confiança: <strong>{(resultado.confianca * 100).toFixed(1)}%</strong></span>
                  <span>Threshold: <strong>{resultado.threshold}</strong></span>
                  <span>Arquivo: <strong>{resultado.arquivo}</strong> ({resultado.tamanho_kb} KB)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Info do modelo */}
      {vInfo && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <h2 className="section-title">Arquitetura do Modelo</h2>
          <div className="table-wrapper">
            <table>
              <tbody>
                <tr><td><strong>Modelo</strong></td><td>{vInfo.modelo?.nome}</td></tr>
                <tr><td><strong>Tipo</strong></td><td>{vInfo.modelo?.tipo}</td></tr>
                <tr><td><strong>Entrada</strong></td><td>{vInfo.modelo?.input}</td></tr>
                <tr><td><strong>Saída</strong></td><td>{vInfo.modelo?.saida}</td></tr>
                <tr><td><strong>Backbone</strong></td><td>{vInfo.modelo?.backbone}</td></tr>
                <tr><td><strong>Cabeça</strong></td><td>{vInfo.modelo?.cabeca}</td></tr>
                <tr><td><strong>Pré-processamento</strong></td><td>{vInfo.modelo?.preprocessamento}</td></tr>
              </tbody>
            </table>
          </div>

          {vInfo.metricas_teste && (
            <div className="kpi-grid" style={{ marginTop: '1.25rem' }}>
              <KPI label="Acurácia (teste)"    value={vInfo.metricas_teste.acuracia}              color="#00ff9d" />
              <KPI label="AUC"                  value={vInfo.metricas_teste.auc}                  color="#00f2ff" />
              <KPI label="F1 (incêndio)"        value={vInfo.metricas_teste.f1_wildfire}          color="#00f2ff" />
              <KPI label="Recall (incêndio)"    value={vInfo.metricas_teste.recall_wildfire}      color="#ff9042" />
            </div>
          )}
          {vInfo.dataset && (
            <p className="label" style={{ marginTop: '0.75rem', fontSize: '0.77rem' }}>
              📦 Dataset: {vInfo.dataset.nome} · {vInfo.dataset.imagens} · splits {vInfo.dataset.splits}
            </p>
          )}
          {vInfo.metricas_teste?.obs && (
            <p className="label" style={{ marginTop: '0.4rem', fontSize: '0.77rem', lineHeight: 1.6 }}>
              ⚠️ {vInfo.metricas_teste.obs}
            </p>
          )}
          <p className="label" style={{ marginTop: '0.4rem', fontSize: '0.77rem', lineHeight: 1.7 }}>
            🛰️ {vInfo.aplicacao}
          </p>
        </section>
      )}
    </div>
  )
}

// ── Tab: Placeholder com conteúdo real ────────────────────────────────────────
function TabPlaceholder({ tab }) {
  const content = PLACEHOLDER_CONTENT[tab?.id]
  if (!content) return (
    <div className="placeholder-tab">
      <div className="placeholder-icon">{tab?.icon}</div>
      <h2>{tab?.label}</h2>
      <p>{tab?.subject}</p>
      <span className="placeholder-badge">Em construção</span>
    </div>
  )

  return (
    <div>
      <section className="card">
        <div className="ph-hero">
          <span className="ph-icon">{tab.icon}</span>
          <div>
            <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>{tab.label}</h2>
            <p className="ph-intro">{content.intro}</p>
          </div>
        </div>
      </section>

      <div className="ph-cards-grid">
        {content.cards.map((c, i) => (
          <section key={i} className="card ph-card">
            <div className="ph-card-icon">{c.icon}</div>
            <h3 className="ph-card-title">{c.titulo}</h3>
            <p className="ph-card-desc">{c.desc}</p>
          </section>
        ))}
      </div>

      <section className="card" style={{ marginTop: '1.5rem' }}>
        <div className="ph-fiap-row">
          <span className="ph-fiap-label">📚 Disciplina FIAP</span>
          <span className="ph-fiap-value">{tab.subject}</span>
        </div>
        <p className="label" style={{ marginTop: '1rem', fontSize: '0.77rem', lineHeight: 1.7 }}>
          Esta disciplina integra o OVERWATCH ao demonstrar como técnicas avançadas de IA
          complementam o pipeline de monitoramento climático — desde a aquisição de dados satelitais
          até a geração de alertas acionáveis para defesa civil e gestão de risco.
        </p>
      </section>
    </div>
  )
}

// ── Utilitários ───────────────────────────────────────────────────────────────
function KPI({ label, value, color }) {
  return (
    <div className="kpi-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="kpi-value" style={{ color }}>{value ?? '—'}</div>
      <div className="kpi-label">{label}</div>
    </div>
  )
}
