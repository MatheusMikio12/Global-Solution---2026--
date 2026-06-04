import { useState, useEffect, useRef, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import mqtt from 'mqtt'

const BROKER_WS  = 'wss://broker.hivemq.com:8884/mqtt'
const TOPIC_TEL  = 'agroSpace/sensor/telemetry'
const TOPIC_ALT  = 'agroSpace/sensor/alert'
const MAX_HIST   = 40   // pontos no gráfico
const MAX_ALERTS = 20

const ALERT_LABELS = {
  TEMPERATURA_ALTA: { label: 'Temperatura Alta', color: '#C0392B' },
  RISCO_GEADA:      { label: 'Risco de Geada',   color: '#3B8BD4' },
  SOLO_SECO:        { label: 'Solo Seco',          color: '#E67E22' },
  SOLO_SATURADO:    { label: 'Solo Saturado',      color: '#2980B9' },
  AR_SECO:          { label: 'Ar Muito Seco',      color: '#8E44AD' },
}

function Gauge({ label, value, unit, min, max, color, warn, crit }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const bg = value != null && crit != null && value > crit ? '#C0392B'
           : value != null && warn != null && value > warn ? '#E67E22'
           : color
  return (
    <div className="iot-gauge">
      <div className="iot-gauge-label">{label}</div>
      <div className="iot-gauge-value" style={{ color: bg }}>
        {value != null ? `${typeof value === 'number' ? value.toFixed(1) : value}` : '—'}
        <span className="iot-gauge-unit">{unit}</span>
      </div>
      <div className="iot-gauge-bar-track">
        <div className="iot-gauge-bar-fill" style={{ width: `${pct}%`, background: bg }} />
      </div>
    </div>
  )
}

function StatusDot({ ok, label }) {
  return (
    <span className={`api-badge ${ok ? 'online' : 'offline'}`}>
      {ok ? `● ${label}` : `○ ${label}`}
    </span>
  )
}

export default function TabIoT() {
  const [connState,  setConnState]  = useState('desconectado') // connecting | connected | error | desconectado
  const [lastTel,    setLastTel]    = useState(null)
  const [history,    setHistory]    = useState([])
  const [alerts,     setAlerts]     = useState([])
  const [sendResult, setSendResult] = useState(null)
  const clientRef = useRef(null)

  // connect on mount
  useEffect(() => {
    let destroyed = false

    setConnState('connecting')
    const client = mqtt.connect(BROKER_WS, {
      clientId: 'overwatch-frontend-' + Math.random().toString(16).slice(2, 8),
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      keepalive: 30,
    })

    const subscribe = () => {
      client.subscribe(TOPIC_TEL, { qos: 0 })
      client.subscribe(TOPIC_ALT, { qos: 0 })
    }

    client.on('connect', () => {
      if (destroyed) return
      setConnState('connected')
      subscribe()
    })

    // reassinsceve automaticamente após reconexão
    client.on('reconnect', () => {
      if (destroyed) return
      setConnState('connecting')
    })

    client.on('error',   () => { if (!destroyed) setConnState('error') })
    client.on('offline', () => { if (!destroyed) setConnState('desconectado') })

    client.on('message', (topic, payload) => {
      if (destroyed) return
      try {
        const data = JSON.parse(payload.toString())

        if (topic === TOPIC_TEL) {
          const ts = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          })
          setLastTel(data)
          setHistory(h => {
            const pt = {
              time:            ts,
              temperatura:     data.temperatura_c,
              umidade_ar:      data.umidade_ar_pct,
              umidade_solo:    data.umidade_solo_pct,
              luminosidade:    data.luminosidade_pct,
              indice_estresse: data.indice_estresse,
            }
            return [...h.slice(-(MAX_HIST - 1)), pt]
          })

        } else if (topic === TOPIC_ALT) {
          const ts = new Date().toLocaleTimeString('pt-BR')
          setAlerts(a => [{ ...data, ts }, ...a.slice(0, MAX_ALERTS - 1)])
        }
      } catch { /* ignore malformed */ }
    })

    clientRef.current = client

    return () => {
      destroyed = true
      client.end(true)
    }
  }, [])

  const enviarComando = useCallback((cmd) => {
    const c = clientRef.current
    if (!c || !c.connected) return
    c.publish('agroSpace/device/command', JSON.stringify({ cmd }), { qos: 1 }, (err) => {
      setSendResult(err ? `Erro: ${err.message}` : `Comando ${cmd} enviado!`)
      setTimeout(() => setSendResult(null), 3000)
    })
  }, [])

  const connColor = { connected: '#27AE60', connecting: '#F1C40F', error: '#C0392B', desconectado: '#7F8C8D' }
  const connLabel = { connected: 'Conectado', connecting: 'Conectando…', error: 'Erro', desconectado: 'Offline' }

  const tel = lastTel

  return (
    <div>
      {/* ── Status ── */}
      <section className="card">
        <h2 className="section-title">AGRO-SPACE SENTINEL — IoT em Tempo Real</h2>
        <div className="status-row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <span className="api-badge" style={{ background: connColor[connState] + '22', color: connColor[connState], border: `1px solid ${connColor[connState]}55` }}>
            {connState === 'connected' ? '●' : connState === 'connecting' ? '◌' : '○'} {connLabel[connState]}
          </span>
          <span className="label">Broker: broker.hivemq.com · WSS 8884</span>
          <span className="label">Tópico: {TOPIC_TEL}</span>
          {tel && <span className="label">Device: <strong>{tel.device_id}</strong></span>}
          {tel && <span className="label">Uptime: {tel.uptime_s}s</span>}
        </div>
        {connState !== 'connected' && (
          <div className="alert-box" style={{ marginTop: '1rem' }}>
            Aguardando conexão MQTT. Inicie o Wokwi para ver dados em tempo real.
          </div>
        )}
      </section>

      {/* ── Gauges ── */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Telemetria ao Vivo</h2>
        <div className="iot-gauges-grid">
          <Gauge label="Temperatura"     value={tel?.temperatura_c}    unit="°C"  min={-10} max={60}  color="#3B8BD4" warn={35} crit={38} />
          <Gauge label="Umidade do Ar"   value={tel?.umidade_ar_pct}   unit="%"   min={0}   max={100} color="#1D9E75" />
          <Gauge label="Umidade do Solo" value={tel?.umidade_solo_pct} unit="%"   min={0}   max={100} color="#1D9E75" />
          <Gauge label="Luminosidade"    value={tel?.luminosidade_pct} unit="%"   min={0}   max={100} color="#EF9F27" />
          <Gauge label="Índice Estresse" value={tel?.indice_estresse}  unit="%"   min={0}   max={100} color="#E67E22" warn={50} crit={75} />
          <div className="iot-gauge">
            <div className="iot-gauge-label">Chuva</div>
            <div className="iot-gauge-value" style={{ color: tel?.chuva ? '#3B8BD4' : '#7F8C8D' }}>
              {tel == null ? '—' : tel.chuva ? 'SIM' : 'NÃO'}
            </div>
            <div className="iot-gauge-bar-track">
              <div className="iot-gauge-bar-fill" style={{ width: tel?.chuva ? '100%' : '0%', background: '#3B8BD4' }} />
            </div>
          </div>
        </div>

        {tel?.contexto && (
          <div className="status-row" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
            <span className="label">Solo: <strong>{tel.contexto.solo}</strong></span>
            <span className="label">Temp: <strong>{tel.contexto.temp}</strong></span>
          </div>
        )}
      </section>

      {/* ── Gráfico histórico ── */}
      {history.length > 1 && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <h2 className="section-title">Histórico da Sessão</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,242,255,0.08)" />
              <XAxis dataKey="time" tick={{ fill: '#527f96', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#527f96', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#10131a', border: '1px solid rgba(0,242,255,0.22)', borderRadius: 8, color: '#92c8e0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: '0.65rem', color: '#527f96' }} />
              <Line type="monotone" dataKey="temperatura"     name="Temp (°C)"    stroke="#D85A30" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="umidade_solo"    name="Solo (%)"      stroke="#1D9E75" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="indice_estresse" name="Estresse (%)"  stroke="#E67E22" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ── Comandos remotos ── */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Comandos Remotos (MQTT)</h2>
        <p className="label" style={{ marginBottom: '1rem' }}>
          Publica no tópico <code>agroSpace/device/command</code> com QoS 1.
          O ESP32 escuta e executa em tempo real.
        </p>
        <div className="status-row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <button className="btn-run" style={{ background: '#1D9E75' }}
            disabled={connState !== 'connected'}
            onClick={() => enviarComando('IRRIGAR')}>
            Irrigar
          </button>
          <button className="btn-run" style={{ background: '#2980B9' }}
            disabled={connState !== 'connected'}
            onClick={() => enviarComando('STATUS')}>
            Solicitar Status
          </button>
          <button className="btn-run" style={{ background: '#7F8C8D' }}
            disabled={connState !== 'connected'}
            onClick={() => enviarComando('RESET')}>
            Resetar ESP32
          </button>
        </div>
        {sendResult && (
          <div className="alert-box" style={{ marginTop: '0.75rem', borderColor: '#27AE60', color: '#27AE60' }}>
            {sendResult}
          </div>
        )}
      </section>

      {/* ── Alertas recebidos ── */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Alertas Recebidos</h2>
        {alerts.length === 0 ? (
          <p className="label">Nenhum alerta recebido ainda nesta sessão.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>Horário</th><th>Tipo</th><th>Temp</th><th>Solo</th><th>Umid. Ar</th>
              </tr></thead>
              <tbody>
                {alerts.map((a, i) => {
                  const meta = ALERT_LABELS[a.tipo] || { label: a.tipo, color: '#999' }
                  return (
                    <tr key={i}>
                      <td>{a.ts}</td>
                      <td>
                        <span className="sev-badge" style={{ background: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td>{a.temp != null ? `${a.temp.toFixed(1)}°C` : '—'}</td>
                      <td>{a.umSolo != null ? `${a.umSolo}%` : '—'}</td>
                      <td>{a.umAr != null ? `${a.umAr.toFixed(1)}%` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Arquitetura ── */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Arquitetura — AGRO-SPACE SENTINEL</h2>
        <div className="iot-arch">
          <div className="iot-arch-node hw">
            <strong>ESP32 (Wokwi)</strong>
            <span>DHT22 · LDR · Pot. Solo · Pot. Chuva</span>
            <span>LED Verde · LED Vermelho · Buzzer</span>
          </div>
          <div className="iot-arch-arrow">→ MQTT pub</div>
          <div className="iot-arch-node broker">
            <strong>HiveMQ Public</strong>
            <span>broker.hivemq.com:1883</span>
            <span>WSS :8884 (browser)</span>
          </div>
          <div className="iot-arch-arrow">→ sub</div>
          <div className="iot-arch-node nr">
            <strong>Node-RED</strong>
            <span>localhost:1880</span>
            <span>Dashboard · InfluxDB · Telegram</span>
          </div>
        </div>

        <div className="iot-topics" style={{ marginTop: '1.25rem' }}>
          <h3 className="section-title" style={{ fontSize: '0.85rem' }}>Tópicos MQTT</h3>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Tópico</th><th>Direção</th><th>Conteúdo</th></tr></thead>
              <tbody>
                <tr><td><code>agroSpace/sensor/telemetry</code></td><td>ESP32 → Cloud</td><td>temperatura, umidade, solo, luz, chuva, IEH</td></tr>
                <tr><td><code>agroSpace/sensor/alert</code></td><td>ESP32 → Cloud</td><td>tipo de alerta + leituras no momento</td></tr>
                <tr><td><code>agroSpace/sensor/status</code></td><td>ESP32 → Cloud</td><td>online/offline (retained)</td></tr>
                <tr><td><code>agroSpace/device/command</code></td><td>Cloud → ESP32</td><td>IRRIGAR · RESET · STATUS</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <h3 className="section-title" style={{ fontSize: '0.85rem' }}>Sensores Simulados no Wokwi</h3>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Sensor</th><th>Componente Wokwi</th><th>GPIO</th><th>Variável</th></tr></thead>
              <tbody>
                <tr><td>Temperatura / Umid. Ar</td><td>DHT22</td><td>GPIO 4</td><td>temperatura_c, umidade_ar_pct</td></tr>
                <tr><td>Luminosidade</td><td>Photoresistor</td><td>GPIO 34 (ADC)</td><td>luminosidade_pct</td></tr>
                <tr><td>Umidade do Solo</td><td>Potenciômetro</td><td>GPIO 35 (ADC)</td><td>umidade_solo_pct</td></tr>
                <tr><td>Sensor de Chuva</td><td>Potenciômetro</td><td>GPIO 32 (ADC)</td><td>chuva (bool)</td></tr>
                <tr><td>LED Status</td><td>LED verde</td><td>GPIO 26</td><td>OK / Transmitindo</td></tr>
                <tr><td>LED Alerta</td><td>LED vermelho</td><td>GPIO 27</td><td>Condição crítica</td></tr>
                <tr><td>Buzzer</td><td>Buzzer passivo</td><td>GPIO 25</td><td>Alerta sonoro</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Node-RED ── */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Node-RED — Flow OVERWATCH</h2>
        <p className="label" style={{ marginBottom: '1rem' }}>
          O flow processa telemetria MQTT, salva no InfluxDB Cloud e dispara alertas via Telegram.
          Importe o arquivo <code>node-red_overwatch.json</code> no seu Node-RED local.
        </p>
        <div className="iot-nr-blocks">
          <div className="iot-nr-block mqtt-in">
            <strong>MQTT In</strong>
            <span>agroSpace/sensor/telemetry</span>
          </div>
          <div className="iot-arch-arrow">→</div>
          <div className="iot-nr-block fn">
            <strong>Function</strong>
            <span>Processar tudo</span>
            <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>6 saídas</span>
          </div>
          <div className="iot-arch-arrow">→</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="iot-nr-block influx"><strong>InfluxDB Out</strong><span>agro_sensor</span></div>
            <div className="iot-nr-block dash"><strong>Dashboard</strong><span>3 gauges + 2 gráficos</span></div>
            <div className="iot-nr-block tg"><strong>Telegram</strong><span>Alertas críticos</span></div>
          </div>
        </div>
        <div className="status-row" style={{ marginTop: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <a href="http://localhost:1880/ui" target="_blank" rel="noreferrer" className="btn-api-docs">
            Node-RED Dashboard ↗
          </a>
          <a href="http://localhost:1880" target="_blank" rel="noreferrer" className="btn-api-docs">
            Node-RED Editor ↗
          </a>
        </div>
      </section>
    </div>
  )
}
