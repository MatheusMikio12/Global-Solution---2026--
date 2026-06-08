import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import ReactMarkdown from 'react-markdown'
import APIService from './services/api'
import TabIoT from './TabIoT'

// Divide a resposta Markdown do RAG (## Resposta técnica / ## Documentos consultados /
// ## Trechos utilizados / ## Fontes) em seções, para renderizar cada uma com seu próprio
// destaque visual em vez de despejar o Markdown bruto na tela.
function parseAnswerSections(markdown) {
  if (!markdown) return {}
  const regex = /##\s*([^\n]+)\n([\s\S]*?)(?=\n##\s|$)/g
  const sections = {}
  let match
  while ((match = regex.exec(markdown)) !== null) {
    sections[match[1].trim()] = match[2].trim()
  }
  return sections
}

const TABS = [
  { id: 'dashboard',  path: '/',           label: 'Início',       subject: 'Visão Geral do Projeto' },
  { id: 'rpa',        path: '/rpa',        label: 'RPA',          subject: 'AI for Robotic Process Automation' },
  { id: 'generative', path: '/generative', label: 'Generative AI', subject: 'Generative AI e Advanced Nets' },
  { id: 'pln',        path: '/pln',        label: 'PLN',          subject: 'PLN, Chatbots & Virtual Agents' },
  { id: 'visao',      path: '/visao',      label: 'Visão Comp.',  subject: 'Visão Computacional' },
  { id: 'iot',        path: '/iot',        label: 'IoT',          subject: 'Physical Computing, Embedded AI & Cognitive IoT' },
  { id: 'neuro',      path: '/neuro',      label: 'Neuromórfica', subject: 'Cluster Computing, Computação Neuromórfica e Supercomputadores' },
  { id: 'quantica',   path: '/quantica',   label: 'Quântica',     subject: 'Computação Quântica e IA' },
]

const SEV_COLOR = { critica: '#C0392B', alta: '#E67E22', media: '#F1C40F', baixa: '#27AE60' }
const SEV_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa' }
const REGION_COLORS = ['#00f2ff', '#00ff9d', '#ff9042', '#b060ff', '#ffd166', '#ff3f6c']

// Integrantes do grupo — exibidos na página inicial.
const TEAM = ['Matheus', 'Gustavo', 'Henry']

const PLACEHOLDER_CONTENT = {
  generative: {
    intro: 'Modelos generativos transformam dados climáticos brutos em linguagem natural, imagens sintéticas e relatórios automáticos de missão.',
    cards: [
      { titulo: 'Classificação Gemini 1.5', desc: 'O Módulo 4 do OVERWATCH usa Gemini 1.5 Flash com structured output para classificar cada anomalia em tipo de desastre, severidade (crítica/alta/média/baixa) e recomendação de ação.' },
      { titulo: 'Imagens Satélite Sintéticas', desc: 'GANs condicionais (StyleGAN3) geram imagens multiespectrais de satélite para regiões com alta cobertura de nuvens, aumentando datasets de segmentação.' },
      { titulo: 'Boletins Climáticos', desc: 'RAG (Retrieval-Augmented Generation) conecta o banco de alertas do OVERWATCH a um LLM para redigir boletins de emergência personalizados por região.' },
    ],
  },
  pln: {
    intro: 'NLP extrai conhecimento de relatórios meteorológicos, comunicados de defesa civil e redes sociais para enriquecer os alertas gerados pelo pipeline.',
    cards: [
      { titulo: 'NER em Notícias de Desastres', desc: 'BERTimbau extrai entidades nomeadas (localização, data, tipo de evento) de notícias sobre desastres climáticos brasileiros, validando predições do Isolation Forest.' },
      { titulo: 'Monitoramento Social', desc: 'Análise de sentimento em tempo real em tweets detecta pânico climático regional antes dos alertas oficiais, usando RoBERTa-Twitter com janela de 30 min.' },
      { titulo: 'Chatbot de Alertas', desc: 'Agente conversacional (Gemini + webhooks FastAPI) responde perguntas em linguagem natural sobre alertas ativos: "Qual a situação do Caribe agora?" → consulta direta ao OVERWATCH API.' },
    ],
  },
  visao: {
    intro: 'CNNs e modelos de segmentação analisam imagens multiespectrais de Sentinel-2 e GOES-16 para detecção automática de incêndios, enchentes e desmatamento.',
    cards: [
      { titulo: 'Detecção de Incêndios', desc: 'YOLOv8 treinado em imagens GOES-16 banda 7 (infravermelho) detecta pontos de calor em < 100ms por tile de 512×512px, com threshold calibrado por bioma.' },
      { titulo: 'Segmentação de Enchentes', desc: 'U-Net com imagens SAR Sentinel-1 segmenta áreas inundadas independentemente de cobertura de nuvens — única opção viável no Brasil em época de monções.' },
      { titulo: 'Previsão de NDVI', desc: 'O OVERWATCH já calcula NDVI por sensor. ConvLSTM prevê NDVI futuro a partir de sequências temporais de 30 dias, antecipando condições de seca ou recuperação florestal.' },
    ],
  },
  iot: {
    intro: 'Sensores embarcados e edge AI complementam satélites com dados hiperlocais em tempo real, fechando o ciclo de observação terrestre-orbital.',
    cards: [
      { titulo: 'Estações IoT Meteorológicas', desc: 'ESP32 + BME680 (temperatura, umidade, pressão, VOC) transmitem via MQTT a cada 10 min. Dados são ingeridos pelo Módulo 2 do pipeline, expandindo além dos 6 satélites simulados.' },
      { titulo: 'Edge AI para Anomalias', desc: 'TensorFlow Lite roda Isolation Forest quantizado (INT8) no microcontrolador. Anomalias são detectadas localmente sem latência de rede, transmitindo apenas alertas — economia de 95% de banda.' },
      { titulo: 'Fusão Terrestre-Orbital', desc: 'Kalman Filter combina leituras IoT de solo com dados satelitais, reduzindo incerteza de temperatura de ±3°C para ±0.8°C nas regiões com cobertura de estações.' },
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
      setToast({ msg: `Pipeline concluído${elapsed ? ` em ${elapsed}s` : ''}!`, type: 'success' })
    } else if (prev === 'running' && curr === 'error') {
      setToast({ msg: 'Pipeline falhou. Verifique o log de erros.', type: 'error' })
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
            <span className="logo">OVERWATCH</span>
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
            <NavLink
              key={t.id}
              to={t.path}
              end={t.path === '/'}
              className={({ isActive }) => `tab-btn${isActive ? ' active' : ''}`}
              title={t.subject}
            >
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={
            <>
              <div className="subject-label">{TABS[0].subject}</div>
              <TabDashboard
                resumo={resumo} apiOnline={apiOnline} pipelineStatus={pipelineStatus}
                alertas={alertasFiltrados} allAlertas={alertas}
                loadingDados={loadingDados}
                filtroSev={filtroSev} setFiltroSev={setFiltroSev}
                filtroRegiao={filtroRegiao} setFiltroRegiao={setFiltroRegiao}
                regioesList={regioesList} serieData={serieData} regiaoData={regiaoData}
              />
            </>
          } />
          <Route path="/rpa" element={
            <>
              <div className="subject-label">{TABS.find(t => t.id === 'rpa').subject}</div>
              <TabRPA status={status} apiOnline={apiOnline} pipelineStatus={pipelineStatus}
                loading={loading} usarIa={usarIa} setUsarIa={setUsarIa}
                maxAlertas={maxAlertas} setMaxAlertas={setMaxAlertas}
                rodarPipeline={rodarPipeline} erroDisparo={erroDisparo}
              />
            </>
          } />
          <Route path="/generative" element={<WithSubject id="generative"><TabGenerative /></WithSubject>} />
          <Route path="/pln"        element={<WithSubject id="pln"><TabPLN /></WithSubject>} />
          <Route path="/visao"      element={<WithSubject id="visao"><TabVisao /></WithSubject>} />
          <Route path="/iot"        element={<WithSubject id="iot"><TabIoT /></WithSubject>} />
          <Route path="/neuro"      element={<WithSubject id="neuro"><TabNeuro /></WithSubject>} />
          <Route path="/quantica"   element={<WithSubject id="quantica"><TabQuantica /></WithSubject>} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer>OVERWATCH · FIAP Global Solution 2026</footer>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function WithSubject({ id, children }) {
  const tab = TABS.find(t => t.id === id)
  return (
    <>
      <div className="subject-label">{tab?.subject}</div>
      {children}
    </>
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
      {/* ── Boas-vindas / apresentação do projeto ───────────────────────── */}
      <section className="hero-card">
        <span className="hero-eyebrow">FIAP · Global Solution 2026</span>
        <h1 className="hero-title">OVERWATCH</h1>
        <p className="hero-sub">
          Plataforma integrada de previsão climática espacial. Reúne RPA, IA generativa,
          PLN, visão computacional, IoT, computação neuromórfica e quântica em um único
          pipeline para detectar anomalias e antecipar desastres ambientais.
        </p>
        <div className="hero-pipeline">
          <span>Satélites &amp; IoT</span><span className="hero-arrow">→</span>
          <span>Ingestão &amp; Limpeza</span><span className="hero-arrow">→</span>
          <span>Detecção de Anomalias</span><span className="hero-arrow">→</span>
          <span>Classificação com IA</span><span className="hero-arrow">→</span>
          <span>Alertas</span>
        </div>
      </section>

      {/* ── Equipe ──────────────────────────────────────────────────────── */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Equipe</h2>
        <div className="team-grid">
          {TEAM.map(nome => (
            <div key={nome} className="team-card">{nome}</div>
          ))}
        </div>
      </section>

      {/* ── Índice de módulos ───────────────────────────────────────────── */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Módulos da Solução</h2>
        <div className="module-grid">
          {TABS.filter(t => t.id !== 'dashboard').map(t => (
            <NavLink key={t.id} to={t.path} className="module-card">
              <strong>{t.label}</strong>
              <span>{t.subject}</span>
            </NavLink>
          ))}
        </div>
      </section>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Painel da Missão</h2>

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
                Baixar Excel
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
              Período: {resumo.periodo_inicio?.slice(0, 10)} → {resumo.periodo_fim?.slice(0, 10)}
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
          <p>Nenhum resultado disponível ainda.</p>
          <p>Vá até a aba <strong>RPA</strong> e clique em <strong>Rodar Pipeline</strong>.</p>
          {!apiOnline && (
            <p className="warn">
              Backend offline. Inicie com:<br />
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
              Gemini: {status.ia_disponivel ? 'Configurada' : 'Sem GOOGLE_API_KEY'}
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
            {pipelineStatus === 'running' ? 'Executando...' : 'Rodar Pipeline'}
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
            {loadingPrever ? 'Classificando...' : 'Classificar com QML'}
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
            {nasaLoading ? 'Consultando NASA...' : 'Buscar e Classificar'}
          </button>
        </form>

        {nasaErro && <div className="alert-box error">{nasaErro}</div>}

        {nasaResult && (
          <div style={{ marginTop: '1.75rem' }}>
            <div className="nasa-summary">
              <span className="nasa-stat">{nasaResult.local}</span>
              <span className="nasa-stat">{nasaResult.periodo}</span>
              <span className="nasa-stat">{nasaResult.total} dias</span>
              <span className="nasa-stat nasa-extremo-stat">
                {nasaResult.extremos} extremos ({nasaResult.taxa_pct}%)
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
              {qModelos.diagnostico_nisq}
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
                <span className="cv-drop-text">Clique ou arraste uma imagem aqui</span>
                <span className="cv-drop-hint">JPG / PNG · redimensionada para 160×160</span>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" hidden
              onChange={e => selecionar(e.target.files?.[0])} />
          </div>

          <div className="cv-actions">
            {file && <span className="label" style={{ fontSize: '0.78rem' }}>{file.name}</span>}
            <button className="btn-run" onClick={analisar} disabled={loading || !file || !vOnline}>
              {loading ? 'Analisando...' : 'Analisar Imagem'}
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
              Dataset: {vInfo.dataset.nome} · {vInfo.dataset.imagens} · splits {vInfo.dataset.splits}
            </p>
          )}
          {vInfo.metricas_teste?.obs && (
            <p className="label" style={{ marginTop: '0.4rem', fontSize: '0.77rem', lineHeight: 1.6 }}>
              {vInfo.metricas_teste.obs}
            </p>
          )}
          <p className="label" style={{ marginTop: '0.4rem', fontSize: '0.77rem', lineHeight: 1.7 }}>
            {vInfo.aplicacao}
          </p>
        </section>
      )}
    </div>
  )
}

// ── Tab: Generative AI (RAG · ORBITAL SENTINEL) ───────────────────────────────
function TabGenerative() {
  const [gOnline,   setGOnline]   = useState(false)
  const [gStatus,   setGStatus]   = useState(null)
  const [gInfo,     setGInfo]     = useState(null)
  const [exemplos,  setExemplos]  = useState([])
  const [mensagem,  setMensagem]  = useState('')
  const [historico, setHistorico] = useState([])   // { pergunta, resposta, fontes }
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    APIService.genaiStatus()
      .then(d => { setGStatus(d); setGOnline(true) })
      .catch(() => { setGOnline(false); setGStatus(null) })
    APIService.genaiInfo().then(setGInfo).catch(() => {})
    APIService.genaiExemplos().then(d => setExemplos(d.exemplos || [])).catch(() => {})
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historico, loading])

  const ragPronto = gStatus?.rag === 'pronto'

  const perguntar = async (texto) => {
    const pergunta = (texto ?? mensagem).trim()
    if (!pergunta || loading) return
    setErro(null); setMensagem(''); setLoading(true)
    setHistorico(h => [...h, { pergunta, resposta: null, fontes: [] }])
    try {
      const r = await APIService.genaiChat(pergunta)
      setHistorico(h => h.map((m, i) =>
        i === h.length - 1 ? { ...m, resposta: r.resposta, fontes: r.fontes || [] } : m
      ))
      // primeira pergunta pode ter aquecido o índice → atualiza status
      if (!ragPronto) APIService.genaiStatus().then(setGStatus).catch(() => {})
    } catch {
      setErro('Erro ao consultar o assistente. Inicie com: cd backend/genai && python api.py '
            + '(a primeira resposta pode levar 1-2 min para baixar o modelo de embedding).')
      setHistorico(h => h.slice(0, -1))
    } finally { setLoading(false) }
  }

  return (
    <div>
      {/* Status */}
      <section className="card">
        <h2 className="section-title">Status do Assistente RAG · ORBITAL SENTINEL</h2>
        <div className="status-row">
          <span className={`api-badge ${gOnline ? 'online' : 'offline'}`}>
            {gOnline ? '● Online' : '○ Offline'}
          </span>
          {gStatus && <>
            <span className="label">Índice: {gStatus.rag}</span>
            <span className="label">LLM: {gStatus.llm}</span>
            {gStatus.documentos?.length > 0 &&
              <span className="label">Docs: {gStatus.documentos.length}</span>}
          </>}
        </div>
        {!gOnline && (
          <div className="alert-box error" style={{ marginTop: '1rem' }}>
            Backend offline. Inicie com: <code>cd backend/genai &amp;&amp; python api.py</code>
          </div>
        )}
        {gOnline && !ragPronto && (
          <div className="alert-box" style={{ marginTop: '1rem' }}>
            O índice é construído na primeira pergunta (download do modelo de embedding · 1-2 min).
          </div>
        )}
      </section>

      {/* Chat */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Converse com o Assistente</h2>
        <p className="label" style={{ marginBottom: '1rem' }}>
          Pergunte sobre dados espaciais, previsão climática e prevenção de desastres.
          As respostas vêm <strong>exclusivamente</strong> dos documentos indexados, com as fontes citadas.
        </p>

        {exemplos.length > 0 && (
          <div className="genai-chips">
            {exemplos.map((q, i) => (
              <button key={i} className="genai-chip" disabled={loading || !gOnline}
                onClick={() => perguntar(q)} title="Perguntar">
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="genai-chat">
          {historico.length === 0 && (
            <div className="genai-empty">Faça uma pergunta ou escolha um exemplo acima.</div>
          )}
          {historico.map((m, i) => (
            <div key={i} className="genai-turn">
              <div className="genai-msg user"><span className="genai-role">Você</span>{m.pergunta}</div>
              <div className="genai-msg bot">
                <span className="genai-role">ORBITAL SENTINEL</span>
                {m.resposta === null
                  ? <span className="genai-typing">consultando documentos…</span>
                  : <>
                      <span className="genai-answer">{m.resposta}</span>
                      {m.fontes?.length > 0 && (
                        <div className="genai-sources">
                          <span className="genai-sources-label">Fontes:</span>
                          {m.fontes.map(f => (
                            <span key={f.indice} className="genai-source-tag">
                              {f.arquivo}{f.score != null ? ` · ${f.score}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </>}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {erro && <div className="alert-box error">{erro}</div>}

        <div className="genai-input-row">
          <input
            className="genai-input"
            type="text"
            placeholder="Digite sua pergunta…"
            value={mensagem}
            disabled={!gOnline || loading}
            onChange={e => setMensagem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') perguntar() }}
          />
          <button className="btn-run" onClick={() => perguntar()}
            disabled={loading || !gOnline || !mensagem.trim()}>
            {loading ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </section>

      {/* Info do sistema RAG */}
      {gInfo && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <h2 className="section-title">Arquitetura do Sistema RAG</h2>
          <div className="table-wrapper">
            <table>
              <tbody>
                <tr><td><strong>Framework</strong></td><td>{gInfo.pilha?.framework}</td></tr>
                <tr><td><strong>Embedding</strong></td><td>{gInfo.pilha?.embedding}</td></tr>
                <tr><td><strong>LLM</strong></td><td>{gInfo.pilha?.llm}</td></tr>
                <tr><td><strong>Chunking</strong></td><td>{gInfo.pilha?.chunking}</td></tr>
                <tr><td><strong>Top-K</strong></td><td>{gInfo.pilha?.top_k}</td></tr>
                <tr><td><strong>Vector Store</strong></td><td>{gInfo.pilha?.vector_store}</td></tr>
              </tbody>
            </table>
          </div>
          {gInfo.base_conhecimento?.temas && (
            <p className="label" style={{ marginTop: '0.9rem', fontSize: '0.77rem', lineHeight: 1.7 }}>
              <strong>Base de conhecimento:</strong> {gInfo.base_conhecimento.temas.join(' · ')}
            </p>
          )}
          <p className="label" style={{ marginTop: '0.4rem', fontSize: '0.77rem', lineHeight: 1.7 }}>
            {gInfo.aplicacao}
          </p>
        </section>
      )}
    </div>
  )
}

// ── Tab: Computação Neuromórfica (sensor com memristor virtual) ───────────────
const LED_UI = {
  APAGADO:  { cor: '#3a4a5a', label: 'APAGADO',  diag: 'NORMAL' },
  AMARELO:  { cor: '#F1C40F', label: 'AMARELO',  diag: 'OBSERVAÇÃO' },
  VERMELHO: { cor: '#ff3f3f', label: 'VERMELHO', diag: 'ALERTA CRÍTICO' },
}
const AJUSTE_PRESETS = {
  'Ajuste_A_sensivel':    { V_limiar: 24, taxa_chaveamento: 0.007 },
  'Ajuste_B_equilibrado': { V_limiar: 28, taxa_chaveamento: 0.005 },
  'Ajuste_C_conservador': { V_limiar: 32, taxa_chaveamento: 0.004 },
}

function TabNeuro() {
  const [nOnline,  setNOnline]  = useState(false)
  const [nStatus,  setNStatus]  = useState(null)
  const [nInfo,    setNInfo]    = useState(null)
  const [ajustes,  setAjustes]  = useState([])
  const [vLimiar,  setVLimiar]  = useState(28)
  const [taxa,     setTaxa]     = useState(0.005)
  const [loading,  setLoading]  = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro,     setErro]     = useState(null)

  useEffect(() => {
    APIService.neuroStatus()
      .then(d => { setNStatus(d); setNOnline(true) })
      .catch(() => { setNOnline(false); setNStatus(null) })
    APIService.neuroInfo().then(setNInfo).catch(() => {})
    APIService.neuroAjustes().then(d => setAjustes(d.ajustes || [])).catch(() => {})
  }, [])

  const simular = async (vl = vLimiar, tx = taxa) => {
    setErro(null); setLoading(true)
    try {
      setResultado(await APIService.neuroSimular(vl, tx))
    } catch {
      setErro('Erro ao chamar a API neuromórfica. Inicie com: cd backend/neuromorfica && python api.py')
    } finally { setLoading(false) }
  }

  const aplicarPreset = (nome) => {
    const p = AJUSTE_PRESETS[nome]
    if (!p) return
    setVLimiar(p.V_limiar); setTaxa(p.taxa_chaveamento)
    simular(p.V_limiar, p.taxa_chaveamento)
  }

  const serie = resultado?.serie || []
  const ledFinal = serie.length ? serie[serie.length - 1].LED : null
  const ledInfo = ledFinal ? LED_UI[ledFinal] : null
  const trans = resultado?.transicoes

  return (
    <div>
      {/* Status */}
      <section className="card">
        <h2 className="section-title">Status do Sensor Neuromórfico · NeuroSpace Alert</h2>
        <div className="status-row">
          <span className={`api-badge ${nOnline ? 'online' : 'offline'}`}>
            {nOnline ? '● Online' : '○ Offline'}
          </span>
          {nStatus && <>
            <span className="label">Dados: {nStatus.dados}</span>
            {nStatus.arquivo && <span className="label">Arquivo: {nStatus.arquivo}</span>}
            {nStatus.amostras > 0 && <span className="label">Amostras: {nStatus.amostras}</span>}
          </>}
        </div>
        {!nOnline && (
          <div className="alert-box error" style={{ marginTop: '1rem' }}>
            Backend offline. Inicie com: <code>cd backend/neuromorfica &amp;&amp; python api.py</code>
          </div>
        )}
      </section>

      {/* Simulação interativa */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Simular o Memristor Virtual</h2>
        <p className="label" style={{ marginBottom: '1.25rem' }}>
          Ajuste o <strong>limiar de tensão</strong> e a <strong>taxa de chaveamento</strong>.
          O memristor acumula efeito acima do limiar (memória local) e aciona o LED:
          <strong> APAGADO</strong> → <strong>AMARELO</strong> (w≥0.35) → <strong>VERMELHO</strong> (w≥0.65).
        </p>

        <div className="neuro-presets">
          {Object.keys(AJUSTE_PRESETS).map(nome => (
            <button key={nome} className="genai-chip" disabled={loading || !nOnline}
              onClick={() => aplicarPreset(nome)}>
              {nome.replace('Ajuste_', '').replace('_', ' · ')}
            </button>
          ))}
        </div>

        <div className="neuro-controls">
          <div className="neuro-slider">
            <label className="neuro-slider-label">
              <span>Limiar de tensão (V_limiar)</span>
              <strong>{vLimiar} V</strong>
            </label>
            <input type="range" min="15" max="40" step="1" value={vLimiar}
              onChange={e => setVLimiar(Number(e.target.value))} disabled={!nOnline} />
          </div>
          <div className="neuro-slider">
            <label className="neuro-slider-label">
              <span>Taxa de chaveamento</span>
              <strong>{taxa.toFixed(3)}</strong>
            </label>
            <input type="range" min="0.001" max="0.02" step="0.001" value={taxa}
              onChange={e => setTaxa(Number(e.target.value))} disabled={!nOnline} />
          </div>
          <button className="btn-run" onClick={() => simular()} disabled={loading || !nOnline}>
            {loading ? 'Simulando...' : 'Rodar Simulação'}
          </button>
        </div>

        {erro && <div className="alert-box error">{erro}</div>}

        {resultado && (
          <div style={{ marginTop: '1.75rem' }}>
            {/* Indicador de LED + KPIs */}
            <div className="neuro-result-head">
              <div className="neuro-led" style={{ background: ledInfo?.cor, boxShadow: `0 0 24px ${ledInfo?.cor}` }} />
              <div>
                <div className="neuro-led-state">{ledInfo?.label}</div>
                <div className="label">Estado final do sensor · {ledInfo?.diag}</div>
              </div>
            </div>

            <div className="kpi-grid" style={{ marginTop: '1.25rem' }}>
              <KPI label="1º LED não-apagado"
                value={trans?.primeiro_LED_nao_apagado_min != null ? `${trans.primeiro_LED_nao_apagado_min} min` : '—'}
                color="#F1C40F" />
              <KPI label="1º LED vermelho"
                value={trans?.primeiro_LED_vermelho_min != null ? `${trans.primeiro_LED_vermelho_min} min` : '—'}
                color="#ff3f3f" />
              <KPI label="Leituras em alerta"
                value={resultado.contagem_led?.VERMELHO ?? 0} color="#ff3f3f" />
              <KPI label="Leituras em observação"
                value={resultado.contagem_led?.AMARELO ?? 0} color="#F1C40F" />
            </div>

            {/* Gráfico: tensão vs. estado do memristor */}
            <h3 className="section-title" style={{ marginTop: '1.75rem' }}>
              Tensão de Entrada × Estado do Memristor
            </h3>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={serie} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="tempo_min" stroke="#8aa" tick={{ fontSize: 11 }}
                    label={{ value: 'tempo (min)', position: 'insideBottom', offset: -2, fill: '#8aa', fontSize: 11 }} />
                  <YAxis yAxisId="v" stroke="#00f2ff" tick={{ fontSize: 11 }} domain={[15, 40]} />
                  <YAxis yAxisId="w" orientation="right" stroke="#ff9042" tick={{ fontSize: 11 }} domain={[0, 1]} />
                  <Tooltip contentStyle={{ background: '#0a1420', border: '1px solid rgba(0,242,255,0.3)' }} />
                  <Legend />
                  <Line yAxisId="v" type="monotone" dataKey="V_entrada" name="V entrada (V)"
                    stroke="#00f2ff" dot={false} strokeWidth={2} />
                  <Line yAxisId="w" type="monotone" dataKey="estado_memristor" name="estado memristor (w)"
                    stroke="#ff9042" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela das últimas leituras */}
            <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Últimas Leituras</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>tempo (min)</th><th>temp (°C)</th><th>rad (µSv/h)</th><th>poeira (%)</th>
                    <th>V entrada</th><th>w</th><th>LED</th><th>condição real</th>
                  </tr>
                </thead>
                <tbody>
                  {serie.slice(-12).map((r, i) => (
                    <tr key={i}>
                      <td>{r.tempo_min}</td>
                      <td>{r.temperatura_C}</td>
                      <td>{r.radiacao_uSv_h}</td>
                      <td>{r.poeira_pct}</td>
                      <td>{r.V_entrada}</td>
                      <td>{r.estado_memristor}</td>
                      <td>
                        <span className="neuro-led-tag" style={{
                          color: LED_UI[r.LED]?.cor,
                          borderColor: LED_UI[r.LED]?.cor,
                        }}>{r.LED}</span>
                      </td>
                      <td>{r.condicao_real}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Comparação dos três ajustes */}
      {ajustes.length > 0 && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <h2 className="section-title">Comparação dos Ajustes da Equipe</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ajuste</th><th>V_limiar</th><th>Taxa</th>
                  <th>1º não-apagado (min)</th><th>1º vermelho (min)</th>
                  <th>Leituras vermelho</th>
                </tr>
              </thead>
              <tbody>
                {ajustes.map(a => (
                  <tr key={a.ajuste}>
                    <td><strong>{a.ajuste.replace('Ajuste_', '').replace('_', ' · ')}</strong></td>
                    <td>{a.V_limiar}</td>
                    <td>{a.taxa_chaveamento}</td>
                    <td>{a.primeiro_LED_nao_apagado_min ?? '—'}</td>
                    <td>{a.primeiro_LED_vermelho_min ?? '—'}</td>
                    <td>{a.contagem_led?.VERMELHO ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="label" style={{ marginTop: '0.75rem', fontSize: '0.77rem', lineHeight: 1.7 }}>
            O ajuste <strong>sensível</strong> detecta primeiro (mais cedo), mas é mais propenso a
            alarmes falsos; o <strong>conservador</strong> detecta tarde. O <strong>equilibrado</strong> é
            o protótipo conceitual recomendado.
          </p>
        </section>
      )}

      {/* Info do sensor */}
      {nInfo && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <h2 className="section-title">Sobre o Sensor</h2>
          <div className="table-wrapper">
            <table>
              <tbody>
                <tr><td><strong>Sensor</strong></td><td>{nInfo.sensor?.nome}</td></tr>
                <tr><td><strong>Tipo</strong></td><td>{nInfo.sensor?.tipo}</td></tr>
                <tr><td><strong>Entrada</strong></td><td>{nInfo.sensor?.entrada}</td></tr>
                <tr><td><strong>Conversão</strong></td><td>{nInfo.sensor?.conversao}</td></tr>
                <tr><td><strong>Memória</strong></td><td>{nInfo.sensor?.memoria}</td></tr>
                <tr><td><strong>Saída</strong></td><td>{nInfo.sensor?.saida}</td></tr>
                <tr><td><strong>Amostragem</strong></td><td>{nInfo.sensor?.amostragem}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="label" style={{ marginTop: '0.9rem', fontSize: '0.77rem', lineHeight: 1.7 }}>
            <strong>Cenário:</strong> {nInfo.cenario}
          </p>
          <p className="label" style={{ marginTop: '0.4rem', fontSize: '0.77rem', lineHeight: 1.7 }}>
            <strong>Baixo consumo:</strong> {nInfo.baixo_consumo}
          </p>
          <p className="label" style={{ marginTop: '0.4rem', fontSize: '0.77rem', lineHeight: 1.7 }}>
            {nInfo.aplicacao}
          </p>
        </section>
      )}
    </div>
  )
}

// ── Tab: PLN (RAG · Assistente Técnico SUETERES) ──────────────────────────────
const PLN_EXEMPLOS = [
  'Quais práticas de reúso de água podem ser aplicadas em regiões afetadas por seca?',
  'Quais são os requisitos mínimos de eficiência hídrica do LEED v4.1?',
  'Como o PROCEL Edifica classifica a eficiência energética de edificações?',
  'O que é um edifício Net Zero de Energia e Água?',
  'Quais certificações de sustentabilidade são reconhecidas no Brasil?',
]

function TabPLN() {
  const [pOnline,   setPOnline]   = useState(false)
  const [pHealth,   setPHealth]   = useState(null)
  const [pergunta,  setPergunta]  = useState('')
  const [historico, setHistorico] = useState([])   // { pergunta, resposta: QueryResponseSchema|null }
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    APIService.plnHealth()
      .then(d => { setPHealth(d); setPOnline(d?.status === 'ok') })
      .catch(() => { setPOnline(false); setPHealth(null) })
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historico, loading])

  const perguntar = async (texto) => {
    const texto_pergunta = (texto ?? pergunta).trim()
    if (!texto_pergunta || loading) return
    setErro(null); setPergunta(''); setLoading(true)
    setHistorico(h => [...h, { pergunta: texto_pergunta, resposta: null }])
    try {
      const r = await APIService.plnQuery(texto_pergunta)
      setHistorico(h => h.map((m, i) =>
        i === h.length - 1 ? { ...m, resposta: r } : m
      ))
    } catch {
      setErro('Erro ao consultar o assistente técnico. Inicie com: '
            + 'cd backend/pln && uvicorn api.main:app --port 8005 '
            + '(requer Ollama local com o modelo mistral:7b-instruct-v0.3-q4_K_M).')
      setHistorico(h => h.slice(0, -1))
    } finally { setLoading(false) }
  }

  return (
    <div>
      {/* Status */}
      <section className="card">
        <h2 className="section-title">Status do Assistente Técnico · SUETERES RAG</h2>
        <div className="status-row">
          <span className={`api-badge ${pOnline ? 'online' : 'offline'}`}>
            {pOnline ? '● Online' : '○ Offline'}
          </span>
          {pHealth && <>
            <span className="label">Versão: {pHealth.version}</span>
            <span className="label">Vetores indexados: {pHealth.vector_store_count}</span>
            <span className="label">LLM (Ollama): {pHealth.llm_available ? 'disponível' : 'indisponível'}</span>
          </>}
        </div>
        {!pOnline && (
          <div className="alert-box error" style={{ marginTop: '1rem' }}>
            Backend offline. Inicie com: <code>cd backend/pln &amp;&amp; uvicorn api.main:app --host 0.0.0.0 --port 8005</code>
            {' '}(requer Ollama local rodando o modelo <code>mistral:7b-instruct-v0.3-q4_K_M</code>).
          </div>
        )}
      </section>

      {/* Chat */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Assistente Técnico — Edifícios Verdes e Net Zero</h2>
        <p className="label" style={{ marginBottom: '1rem' }}>
          Pergunte sobre normas, certificações (LEED, AQUA-HQE, Selo Casa Azul+), eficiência
          energética e hídrica, e tecnologias para edificações sustentáveis. As respostas são
          geradas <strong>exclusivamente</strong> a partir de um corpus técnico de 15 documentos
          (61 chunks indexados em ChromaDB), com citação obrigatória das fontes em formato ABNT.
        </p>

        <div className="genai-chips">
          {PLN_EXEMPLOS.map((q, i) => (
            <button key={i} className="genai-chip" disabled={loading || !pOnline}
              onClick={() => perguntar(q)} title="Perguntar">
              {q}
            </button>
          ))}
        </div>

        <div className="genai-chat">
          {historico.length === 0 && (
            <div className="genai-empty">Faça uma pergunta técnica ou escolha um exemplo acima.</div>
          )}
          {historico.map((m, i) => (
            <div key={i} className="genai-turn">
              <div className="genai-msg user"><span className="genai-role">Você</span>{m.pergunta}</div>
              <div className="genai-msg bot">
                <span className="genai-role">SUETERES</span>
                {m.resposta === null
                  ? <span className="genai-typing">consultando o corpus técnico…</span>
                  : <>
                      {(() => {
                        const sections = parseAnswerSections(m.resposta.answer)
                        const resumo = sections['Resposta técnica'] || m.resposta.answer
                        const trechos = sections['Trechos utilizados']
                        return (
                          <>
                            <div className="genai-answer markdown-body">
                              <ReactMarkdown>{resumo}</ReactMarkdown>
                            </div>
                            {trechos && (
                              <details style={{ marginTop: '0.6rem' }}>
                                <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--accent, #4fd1c5)' }}>
                                  Ver trechos do corpus utilizados na resposta
                                </summary>
                                <div className="markdown-body" style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}>
                                  <ReactMarkdown>{trechos}</ReactMarkdown>
                                </div>
                              </details>
                            )}
                          </>
                        )
                      })()}
                      <div className="genai-sources" style={{ marginTop: '0.6rem' }}>
                        <span className="genai-sources-label">
                          Confiança: {(m.resposta.response_confidence * 100).toFixed(0)}%
                          {' · '}Cobertura: {m.resposta.coverage_level}
                          {' · '}Modelo: {m.resposta.model_used}
                        </span>
                      </div>
                      {m.resposta.documents_used?.length > 0 && (
                        <div className="genai-sources">
                          <span className="genai-sources-label">Fontes:</span>
                          {m.resposta.documents_used.map((d, j) => (
                            <span key={j} className="genai-source-tag" title={d.citation_abnt}>
                              {d.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </>}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {erro && <div className="alert-box error">{erro}</div>}

        <div className="genai-input-row">
          <input
            className="genai-input"
            type="text"
            placeholder="Digite sua pergunta técnica…"
            value={pergunta}
            disabled={!pOnline || loading}
            onChange={e => setPergunta(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') perguntar() }}
          />
          <button className="btn-run" onClick={() => perguntar()}
            disabled={loading || !pOnline || !pergunta.trim()}>
            {loading ? 'Consultando…' : 'Consultar'}
          </button>
        </div>
      </section>

      {/* Arquitetura do sistema RAG */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Arquitetura do Sistema RAG (SUETERES)</h2>
        <div className="table-wrapper">
          <table>
            <tbody>
              <tr><td><strong>Pipeline</strong></td><td>QueryProcessor → Embedder → Retriever → Reranker → InCorpusChecker → ContextBuilder → OllamaClient → Guardrails</td></tr>
              <tr><td><strong>Vector Store</strong></td><td>ChromaDB (persistente, similaridade cosseno)</td></tr>
              <tr><td><strong>Embedding</strong></td><td>intfloat/multilingual-e5-large (dim. 1024)</td></tr>
              <tr><td><strong>Reranker</strong></td><td>cross-encoder/ms-marco-MiniLM-L-6-v2</td></tr>
              <tr><td><strong>LLM</strong></td><td>mistral:7b-instruct-v0.3-q4_K_M (via Ollama local)</td></tr>
              <tr><td><strong>Anti-alucinação</strong></td><td>5 camadas: threshold de score, grounding por prompt, cobertura de citações, checagem numérica e score de confiança</td></tr>
            </tbody>
          </table>
        </div>
        <p className="label" style={{ marginTop: '0.6rem', fontSize: '0.77rem', lineHeight: 1.7 }}>
          Corpus técnico com 15 documentos normativos sobre Edifícios Verdes e Net Zero de Energia
          e Água (LEED, AQUA-HQE, ABNT NBR 15575/10844, Selo Casa Azul+, PROCEL Edifica, ANA, EPE,
          ASHRAE 90.1, entre outros). Microsserviço independente — porta 8005 — desenvolvido na
          disciplina de PLN, integrado ao OVERWATCH como módulo plugável.
        </p>
      </section>
    </div>
  )
}

// ── Tab: Placeholder com conteúdo real ────────────────────────────────────────
function TabPlaceholder({ tab }) {
  const content = PLACEHOLDER_CONTENT[tab?.id]
  if (!content) return (
    <div className="placeholder-tab">
      <h2>{tab?.label}</h2>
      <p>{tab?.subject}</p>
      <span className="placeholder-badge">Em construção</span>
    </div>
  )

  return (
    <div>
      <section className="card">
        <div className="ph-hero">
          <div>
            <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>{tab.label}</h2>
            <p className="ph-intro">{content.intro}</p>
          </div>
        </div>
      </section>

      <div className="ph-cards-grid">
        {content.cards.map((c, i) => (
          <section key={i} className="card ph-card">
            <h3 className="ph-card-title">{c.titulo}</h3>
            <p className="ph-card-desc">{c.desc}</p>
          </section>
        ))}
      </div>

      <section className="card" style={{ marginTop: '1.5rem' }}>
        <div className="ph-fiap-row">
          <span className="ph-fiap-label">Disciplina FIAP</span>
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
