import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Activity, BarChart3, Clock3, MessageCircle, RefreshCw, ArrowUpRight,
  TrendingUp, TrendingDown, Minus, CalendarDays, ShieldCheck, Sparkles,
  Heart, ChevronRight, CircleHelp,
} from 'lucide-react'
import {
  AreaChart, Area, CartesianGrid, ReferenceLine, ResponsiveContainer,
  LineChart, Line, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { getAssessmentIdFromInstrument } from '../assessment/display.js'

const EMOTION_COLORS = {
  happy: '#579879', sad: '#6d93ba', angry: '#cd7b70', neutral: '#9ca99c',
  fear: '#9d8bc1', disgust: '#c99a63', surprise: '#c27da5',
}
const RISK_LABELS = {
  MINIMAL: 'Minimal', LOW: 'Low', MODERATE: 'Moderate', HIGH: 'High',
}
const numberFormat = value => new Intl.NumberFormat().format(Number(value || 0))
function formatDateInProfileZone(value, timeZone, timeOnly) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const options = timeOnly
    ? { hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  try { return date.toLocaleString([], { ...options, ...(timeZone ? { timeZone } : {}) }) }
  catch { return date.toLocaleString([], options) }
}

function MetricCard({ icon: Icon, label, value, caption, tone = 'sage' }) {
  return (
    <article className={`insight-stat-card tone-${tone}`}>
      <div className="insight-stat-top"><span>{label}</span><span className="insight-stat-icon"><Icon size={17} /></span></div>
      <strong>{value}</strong>
      <p>{caption}</p>
    </article>
  )
}

function EmptyChart({ title, description, action }) {
  return (
    <div className="insight-empty-chart">
      <span><Activity size={21} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  )
}

function AssessmentScoreCard({ title, maxScore, rows, timeZone }) {
  const latest = rows[rows.length - 1]
  const previous = rows.length > 1 ? rows[rows.length - 2] : null
  const change = previous ? Number(latest.score) - Number(previous.score) : null
  const chartRows = rows.map(row => ({
    score: Number(row.score),
    date: formatDateInProfileZone(row.completed_at, timeZone, false),
    shortDate: formatAssessmentDate(row.completed_at, timeZone),
  }))

  return <article className="insights-chart-card insights-assessment-card">
    <div className="insights-card-heading"><div><span className="insights-card-icon is-lilac"><Activity size={16} /></span><div><h3>{title}</h3><p>Saved score · out of {maxScore}</p></div></div></div>
    {latest ? <>
      <div className="insights-score-summary"><strong>{latest.score}<span>/{maxScore}</span></strong><div><span>Latest check-in</span><small>{formatDateInProfileZone(latest.completed_at, timeZone, false)}</small></div></div>
      {previous ? <p className="insights-score-change">{change === 0 ? 'Same score as' : `${Math.abs(change)} ${change < 0 ? 'fewer' : 'more'} points than`} the previous check-in</p> : <p className="insights-score-change">One check-in saved. A later check-in is needed before a change can be shown.</p>}
      {rows.length > 1 ? <div className="insights-score-chart" role="img" aria-label={`${title} scores across ${rows.length} saved check-ins`}>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={chartRows} margin={{ top: 12, right: 12, bottom: 2, left: -18 }}>
            <CartesianGrid stroke="#e9eee5" strokeDasharray="4 5" vertical={false} />
            <XAxis dataKey="shortDate" tick={{ fill: '#849286', fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={18} />
            <YAxis domain={[0, maxScore]} ticks={[0, Math.round(maxScore / 3), Math.round(maxScore * 2 / 3), maxScore]} tick={{ fill: '#849286', fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''} formatter={value => [`${value} of ${maxScore}`, 'Score']} contentStyle={{ border: '1px solid #e1e9df', borderRadius: 12, background: '#fffefa', fontSize: 11 }} />
            <Line type="linear" dataKey="score" stroke="#6183a1" strokeWidth={2.5} dot={{ r: 3.5, fill: '#6183a1', stroke: '#fffefa', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div> : <div className="insights-score-single">A trend line will appear after another completed check-in.</div>}
      <details className="insights-score-history"><summary>View saved scores</summary><ol>{[...rows].reverse().slice(0, 10).map(row => <li key={row.id || `${row.completed_at}-${row.score}`}><time dateTime={row.completed_at}>{formatDateInProfileZone(row.completed_at, timeZone, false)}</time><strong>{row.score} / {maxScore}</strong></li>)}</ol></details>
    </> : <EmptyChart title="No saved results yet" description="Your completed check-ins will appear here when you choose to save one." />}
  </article>
}

function formatAssessmentDate(value, timeZone) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  try { return date.toLocaleDateString([], { month: 'short', day: 'numeric', timeZone }) }
  catch { return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) }
}

export default function Metrics() {
  const { user } = useAuth()
  const { setActivePage } = useApp()
  const [overview, setOverview] = useState(null)
  const [emotions, setEmotions] = useState([])
  const [risks, setRisks] = useState([])
  const [sessions, setSessions] = useState([])
  const [trajectory, setTrajectory] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true)
    setError('')
    const results = await Promise.allSettled([
      api.metricsOverview(), api.emotionDist(), api.riskDist(), api.mySessions(), api.trajectory(), api.assessmentHistory(),
    ])
    const [overviewResult, emotionResult, riskResult, sessionsResult, trajectoryResult, assessmentsResult] = results
    let successful = 0
    if (overviewResult.status === 'fulfilled') { setOverview(overviewResult.value.data); successful += 1 }
    if (emotionResult.status === 'fulfilled') { setEmotions(Array.isArray(emotionResult.value.data) ? emotionResult.value.data : []); successful += 1 }
    if (riskResult.status === 'fulfilled') { setRisks(Array.isArray(riskResult.value.data) ? riskResult.value.data : []); successful += 1 }
    if (sessionsResult.status === 'fulfilled') { setSessions(Array.isArray(sessionsResult.value.data) ? sessionsResult.value.data : []); successful += 1 }
    if (trajectoryResult.status === 'fulfilled') { setTrajectory(trajectoryResult.value.data); successful += 1 }
    if (assessmentsResult.status === 'fulfilled') {
      const history = assessmentsResult.value.data?.history
      setAssessments(Array.isArray(history) ? history.filter(row => getAssessmentIdFromInstrument(row.instrument) && Number.isFinite(Number(row.score)) && Number.isFinite(Number(row.max_score)) && row.completed_at) : [])
      successful += 1
    }
    if (successful === 0) {
      setError('Your personal insights could not be loaded. Check your connection and try again.')
    } else if (successful < results.length) {
      setError('Some insight sections could not refresh. The sections that loaded remain available; try refreshing again.')
    }
    setLastRefresh(new Date())
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 60000)
    return () => window.clearInterval(timer)
  }, [load])

  const points = useMemo(() => (trajectory?.recent || []).map((point, index) => ({
    time: point.t ? formatDateInProfileZone(point.t, user?.timezone, true) : `Point ${index + 1}`,
    date: point.t ? formatDateInProfileZone(point.t, user?.timezone, false) : `Observation ${index + 1}`,
    signal: Math.round(Number(point.ema || 0) * 100),
  })), [trajectory, user?.timezone])

  const maxEmotion = Math.max(1, ...emotions.map(item => Number(item.count || 0)))
  const maxRisk = Math.max(1, ...risks.map(item => Number(item.count || 0)))
  const firstName = String(user?.display_name || '').trim().split(/\s+/)[0] || ''
  const trend = trajectory?.trend || 'unknown'
  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'deteriorating' ? TrendingDown : Minus
  const hasPersonalData = Number(overview?.total_sessions || 0) > 0 || Number(overview?.total_messages || 0) > 0 || assessments.length > 0
  const assessmentRows = useMemo(() => {
    const valid = assessments.filter(row => Number.isFinite(new Date(row.completed_at).getTime()) && Number(row.score) >= 0 && Number(row.score) <= Number(row.max_score))
    const chronological = valid.sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
    return {
      mood: chronological.filter(row => row.instrument === 'PHQ-9' && Number(row.max_score) === 27),
      worry: chronological.filter(row => row.instrument === 'GAD-7' && Number(row.max_score) === 21),
    }
  }, [assessments])

  if (loading) return (
    <div className="insights-page"><div className="insights-loading"><span className="insights-spinner" /><p>Bringing your insights together…</p></div></div>
  )

  return (
    <div className="insights-page">
      <div className="insights-content">
        <header className="insights-header">
          <div>
            <span className="insights-eyebrow"><Sparkles size={13} /> YOUR PRIVATE INSIGHTS</span>
            <h1>{firstName ? <>A little more understanding, <em>{firstName}.</em></> : <>A little more understanding.</>}</h1>
            <p>Notice patterns in your own activity, without turning them into labels or expectations.</p>
          </div>
          <button className="insights-refresh" type="button" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'insights-spin' : ''} /> Refresh
          </button>
        </header>

        {error && <div className="insights-error" role="alert"><CircleHelp size={16} />{error}<button type="button" onClick={() => load(true)}>Try again</button></div>}

        <section className="insights-welcome-strip">
          <div className="insights-welcome-icon"><Heart size={21} /></div>
          <div><strong>Your pace is the right pace.</strong><p>These summaries reflect activity saved to your account. More activity will make trends easier to explore; there is no target to hit.</p></div>
          <div className="insights-refresh-time">{lastRefresh ? `Updated ${formatDateInProfileZone(lastRefresh, user?.timezone, true)}` : 'Your space'}</div>
        </section>

        <section className="insights-stat-grid" aria-label="Your activity summary">
          <MetricCard icon={MessageCircle} label="Conversations" value={numberFormat(overview?.total_sessions)} caption="Saved in your account" tone="sage" />
          <MetricCard icon={Activity} label="Messages exchanged" value={numberFormat(overview?.total_messages)} caption="Your chat activity" tone="blue" />
          <MetricCard icon={Clock3} label="Average AI response" value={overview?.avg_latency_ms ? `${numberFormat(overview.avg_latency_ms)} ms` : '—'} caption={overview?.avg_latency_ms ? 'Across recent replies' : 'Available after your first reply'} tone="peach" />
        </section>

        <div className="insights-section-heading"><div><span>LOOKING BACK, GENTLY</span><h2>Your recent rhythm</h2></div><span>Personal activity · not a clinical measure</span></div>
        <section className="insights-main-grid">
          <article className="insights-chart-card">
            <div className="insights-card-heading"><div><span className="insights-card-icon"><Activity size={16} /></span><div><h3>Conversation signal</h3><p>Experimental language signal over recent chats</p></div></div><span className={`insights-trend trend-${trend}`}><TrendIcon size={13} />{trend === 'unknown' ? 'Building context' : trend}</span></div>
            {points.length > 1 ? (
              <div className="insights-chart-wrap">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={points} margin={{ top: 10, right: 10, bottom: 0, left: -18 }}>
                    <defs><linearGradient id="mindcarePersonalSignal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5a9b7d" stopOpacity={0.23} /><stop offset="100%" stopColor="#5a9b7d" stopOpacity={0.015} /></linearGradient></defs>
                    <CartesianGrid stroke="#e9eee5" strokeDasharray="4 5" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: '#93a097', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={22} />
                    <YAxis domain={[-100, 100]} ticks={[-100, -50, 0, 50, 100]} tick={{ fill: '#93a097', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <ReferenceLine y={0} stroke="#cad8ca" strokeDasharray="4 4" />
                    <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''} formatter={value => [`${value > 0 ? '+' : ''}${value} index points`, 'Exploratory signal']} contentStyle={{ border: '1px solid #e1e9df', borderRadius: 14, background: '#fffefa', boxShadow: '0 12px 28px rgba(36,72,50,.1)', fontSize: 12 }} />
                    <Area type="monotone" dataKey="signal" stroke="#438666" strokeWidth={2.5} fill="url(#mindcarePersonalSignal)" activeDot={{ r: 5, stroke: '#fffefa', strokeWidth: 3 }} dot={{ r: 2.5, fill: '#438666', stroke: '#fffefa', strokeWidth: 1.5 }} isAnimationActive animationDuration={600} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="insights-chart-disclaimer">This is an experimental text-based trend signal. It can be wrong and does not measure mental health or diagnose a condition.</p>
              </div>
            ) : <EmptyChart title="Your story is still unfolding" description="After a few saved conversations, this space can show an exploratory pattern from your own activity." action={<button className="insights-inline-action" type="button" onClick={() => setActivePage('chat')}>Start a conversation <ArrowUpRight size={14} /></button>} />}
          </article>

          <article className="insights-side-card">
            <div className="insights-card-heading"><div><span className="insights-card-icon is-lilac"><CalendarDays size={16} /></span><div><h3>Your recent activity</h3><p>The last {Math.min(sessions.length, 5)} saved conversations</p></div></div></div>
            {sessions.length ? <div className="insights-session-list">{sessions.slice(0, 5).map(session => (
              <div className="insights-session-row" key={session.session_id}>
                <span className="insights-session-dot" />
                <div><strong>{session.phq9_score != null ? 'Self-reflection session' : 'Supportive conversation'}</strong><small>{session.started_at ? new Date(session.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Saved activity'} · {session.message_count || 0} messages</small></div>
              </div>
            ))}</div> : <EmptyChart title="No saved conversations yet" description="Your recent activity will appear here when you start a conversation." />}
            <button className="insights-inline-action insights-full-action" type="button" onClick={() => setActivePage('chat')}>Go to conversation <ChevronRight size={14} /></button>
          </article>
        </section>

        <section className="insights-assessment-section" aria-labelledby="insights-assessment-heading">
          <div className="insights-section-heading"><div><span>YOUR CHECK-INS</span><h2 id="insights-assessment-heading">Your check-ins over time</h2></div><span>Results are not diagnoses</span></div>
          {assessments.length ? <div className="insights-assessment-grid">
            <AssessmentScoreCard title="Mood & interest check-in" maxScore={27} rows={assessmentRows.mood} timeZone={user?.timezone} />
            <AssessmentScoreCard title="Worry & tension check-in" maxScore={21} rows={assessmentRows.worry} timeZone={user?.timezone} />
          </div> : <article className="insights-chart-card"><EmptyChart title="No check-in history yet" description="Your saved check-in results will appear here when you choose to complete one." action={<button className="insights-inline-action" type="button" onClick={() => setActivePage('assessment')}>Explore check-ins <ArrowUpRight size={14} /></button>} /></article>}
          <p className="insights-chart-disclaimer">A score change is only one piece of information and may not reflect how you feel overall. The chart appears after at least two saved results for the same screening.</p>
        </section>

        <section className="insights-distribution-grid">
          <article className="insights-chart-card">
            <div className="insights-card-heading"><div><span className="insights-card-icon"><Heart size={16} /></span><div><h3>Expression labels</h3><p>Optional labels captured in your conversations</p></div></div></div>
            {emotions.length ? <div className="insights-bars">{[...emotions].sort((a,b) => b.count - a.count).map(item => {
              const color = EMOTION_COLORS[String(item.emotion || '').toLowerCase()] || '#92a99a'
              return <div className="insights-bar-row" key={item.emotion}><div><span>{item.emotion}</span><strong>{item.count}</strong></div><div className="insights-bar-track"><span style={{ width: `${Math.max(3, Number(item.count) / maxEmotion * 100)}%`, background: color }} /></div></div>
            })}</div> : <EmptyChart title="Nothing to chart yet" description="If you use the optional reflection feature, its uncertain expression labels may appear here." />}
            <p className="insights-small-print">Facial expressions are not reliable evidence of how someone feels. This is not used as a diagnosis.</p>
          </article>
          <article className="insights-chart-card">
            <div className="insights-card-heading"><div><span className="insights-card-icon is-peach"><ShieldCheck size={16} /></span><div><h3>Conversation indicators</h3><p>Experimental categories recorded for your account</p></div></div></div>
            {risks.length ? <div className="insights-bars">{[...risks].sort((a,b) => b.count - a.count).map(item => {
              const colors = { MINIMAL: '#579879', LOW: '#7c9dbb', MODERATE: '#ce9b61', HIGH: '#ca7972' }
              const color = colors[item.level] || '#92a99a'
              return <div className="insights-bar-row" key={item.level}><div><span>{RISK_LABELS[item.level] || String(item.level).toLowerCase()}</span><strong>{item.count}</strong></div><div className="insights-bar-track"><span style={{ width: `${Math.max(3, Number(item.count) / maxRisk * 100)}%`, background: color }} /></div></div>
            })}</div> : <EmptyChart title="No indicators saved" description="Conversation indicators only appear after activity is saved." />}
            <p className="insights-small-print">These system indicators are experimental, not a validated safety assessment. Trust how you feel and seek human support when you need it.</p>
          </article>
        </section>

        {!hasPersonalData && <section className="insights-empty-cta"><span><Heart size={20} /></span><div><strong>There's no pressure to track anything.</strong><p>MindCare is here for conversation first. These insights are optional and will fill in naturally as you use the space.</p></div><button type="button" onClick={() => setActivePage('chat')}>Talk to MindCare <ArrowUpRight size={14} /></button></section>}
        <footer className="insights-footer-note"><ShieldCheck size={15} /><span>Only activity associated with your signed-in account is shown here. These summaries are for reflection, not diagnosis.</span></footer>
      </div>
    </div>
  )
}
