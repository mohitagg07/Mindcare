import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Clock, MessageSquare, Layers, Cpu, History,
         TrendingUp, TrendingDown, Minus, Brain, Users, Wifi,
         RefreshCw, AlertTriangle, Activity } from 'lucide-react'
import { api } from '../api/client'

/* ── Unified colour maps ── */
const ECOL = {
  happy:'#10D9A8', sad:'#60A5FA', angry:'#FF6B6B',
  neutral:'#8B87B8', fear:'#B4A0FF', disgust:'#FBBF24', surprise:'#F9A8D4'
}
const RCOL = { MINIMAL:'#10D9A8', LOW:'#60A5FA', MODERATE:'#FBBF24', HIGH:'#FF6B6B' }

function HBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <span style={{
        width:72, fontSize:12, color:'#8B87B8', textAlign:'right',
        flexShrink:0, fontWeight:500, textTransform:'capitalize'
      }}>
        {label}
      </span>
      <div style={{ flex:1, height:8, borderRadius:99, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:99, background:color, width:`${pct}%`, transition:'width 0.8s ease' }}/>
      </div>
      <span style={{ width:24, fontSize:12, fontWeight:700, color, textAlign:'right', flexShrink:0 }}>{value}</span>
    </div>
  )
}

function StatCard({ label, value, sub, icon:Icon, color, pulse: hasPulse }) {
  return (
    <div style={{
      background:'#1D1A2C', border:`1px solid ${color}18`,
      borderRadius:16, padding:'18px',
      display:'flex', flexDirection:'column', gap:8
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'#4A4870', fontWeight:600 }}>{label}</span>
        <div style={{ width:32, height:32, borderRadius:10, background:color+'15', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
          <Icon size={14} color={color}/>
          {hasPulse && (
            <div style={{ position:'absolute', top:-1, right:-1, width:9, height:9, borderRadius:'50%', background:'#10D9A8', border:'2px solid #1D1A2C', animation:'pulse 1.5s ease-in-out infinite' }}/>
          )}
        </div>
      </div>
      <p style={{ fontSize:30, fontWeight:800, color:'#F0ECFF', margin:0, letterSpacing:'-0.5px' }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'#2E2B40', margin:0 }}>{sub}</p>}
    </div>
  )
}

function SectionTitle({ icon:Icon, color, title, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
      <div style={{ width:28, height:28, borderRadius:8, background:color+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={13} color={color}/>
      </div>
      <div>
        <p style={{ fontSize:14, fontWeight:700, color:'#C4C0E8', margin:0 }}>{title}</p>
        {sub && <p style={{ fontSize:11, color:'#4A4870', margin:0, marginTop:2 }}>{sub}</p>}
      </div>
    </div>
  )
}

export default function Metrics() {
  const [overview,    setOverview]    = useState(null)
  const [emotions,    setEmotions]    = useState([])
  const [risks,       setRisks]       = useState([])
  const [modelPerf,   setModelPerf]   = useState(null)
  const [mySessions,  setMySessions]  = useState([])
  const [trajectory,  setTrajectory]  = useState(null)
  const [totalUsers,  setTotalUsers]  = useState(null)
  const [onlineUsers, setOnlineUsers] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [refreshing,  setRefreshing]  = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [ov, em, rk, mp, ms, tr, tu, ou] = await Promise.all([
        api.metricsOverview(), api.emotionDist(), api.riskDist(),
        api.modelPerf(), api.mySessions(), api.trajectory(),
        api.totalUsers(), api.onlineUsers(),
      ])
      setOverview(ov.data)
      setEmotions(em.data.map(e => ({ label:e.emotion, value:e.count })))
      setRisks(rk.data.map(r => ({ label:r.level, value:r.count })))
      setModelPerf(mp.data)
      setMySessions(ms.data)
      setTrajectory(tr.data)
      setTotalUsers(tu.data.total)
      setOnlineUsers(ou.data.online)
      setLastRefresh(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(() => load(true), 30_000)
    return () => clearInterval(id)
  }, [load])

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:12, flexDirection:'column', height:'100%', background:'#13111C' }}>
      <div style={{ width:22, height:22, border:'2.5px solid rgba(123,94,248,0.2)', borderTopColor:'#7B5EF8', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <p style={{ color:'#4A4870', fontSize:13 }}>Loading analytics…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const maxEmo    = Math.max(...emotions.map(e => e.value), 1)
  const maxRisk   = Math.max(...risks.map(r => r.value), 1)
  const trendColor = trajectory?.trend === 'improving' ? '#10D9A8' : trajectory?.trend === 'deteriorating' ? '#FF6B6B' : '#8B87B8'
  const TrendIcon  = trajectory?.trend === 'improving' ? TrendingUp : trajectory?.trend === 'deteriorating' ? TrendingDown : Minus

  return (
    <div style={{ height:'100%', overflowY:'auto', background:'#13111C' }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>
      <div style={{ maxWidth:980, margin:'0 auto', padding:'24px 16px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:48, height:48, borderRadius:14,
              background:'rgba(123,94,248,0.12)', border:'1px solid rgba(123,94,248,0.22)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 16px rgba(123,94,248,0.18)'
            }}>
              <BarChart3 size={22} color="#B4A0FF"/>
            </div>
            <div>
              <h2 style={{ fontSize:20, fontWeight:700, color:'#F0ECFF', margin:0, letterSpacing:'-0.3px' }}>Analytics</h2>
              <p style={{ fontSize:12, color:'#4A4870', marginTop:3 }}>
                {lastRefresh
                  ? `Last updated ${lastRefresh.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}`
                  : 'Loading…'}
              </p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button
              onClick={() => load(true)} disabled={refreshing}
              style={{
                display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                borderRadius:99, border:'1px solid rgba(123,94,248,0.25)',
                background:'rgba(123,94,248,0.08)', color:'#B4A0FF',
                fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit'
              }}
            >
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}/>
              Refresh
            </button>
            <div style={{
              display:'flex', alignItems:'center', gap:7, padding:'6px 12px', borderRadius:99,
              background:'rgba(16,217,168,0.08)', border:'1px solid rgba(16,217,168,0.22)',
              color:'#10D9A8', fontSize:11, fontWeight:700
            }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#10D9A8', animation:'pulse 1.5s ease-in-out infinite' }}/>
              Live · auto-refresh 30s
            </div>
          </div>
        </div>

        {/* ── Platform stats ── */}
        <div className="grid-2">
          {/* Total users */}
          <div style={{
            background:'linear-gradient(135deg, rgba(123,94,248,0.12), rgba(91,68,214,0.06))',
            border:'1px solid rgba(123,94,248,0.22)', borderRadius:18, padding:'20px 22px',
            display:'flex', alignItems:'center', gap:16
          }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'rgba(123,94,248,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Users size={22} color="#B4A0FF"/>
            </div>
            <div>
              <p style={{ fontSize:32, fontWeight:800, color:'#F0ECFF', margin:0, letterSpacing:'-1px' }}>{totalUsers ?? '—'}</p>
              <p style={{ fontSize:12, color:'#7B5EF8', margin:0, marginTop:2, fontWeight:700 }}>Total Registered Users</p>
              <p style={{ fontSize:11, color:'#4A4870', margin:0, marginTop:1 }}>Platform-wide accounts</p>
            </div>
          </div>
          {/* Online now */}
          <div style={{
            background:'linear-gradient(135deg, rgba(16,217,168,0.10), rgba(16,217,168,0.04))',
            border:'1px solid rgba(16,217,168,0.22)', borderRadius:18, padding:'20px 22px',
            display:'flex', alignItems:'center', gap:16
          }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'rgba(16,217,168,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
              <Wifi size={22} color="#10D9A8"/>
              <div style={{ position:'absolute', top:8, right:8, width:8, height:8, borderRadius:'50%', background:'#10D9A8', animation:'pulse 1.5s ease-in-out infinite' }}/>
            </div>
            <div>
              <p style={{ fontSize:32, fontWeight:800, color:'#F0ECFF', margin:0, letterSpacing:'-1px' }}>{onlineUsers ?? '—'}</p>
              <p style={{ fontSize:12, color:'#10D9A8', margin:0, marginTop:2, fontWeight:700 }}>Users Online Now</p>
              <p style={{ fontSize:11, color:'#4A4870', margin:0, marginTop:1 }}>Active in last 2 minutes</p>
            </div>
          </div>
        </div>

        {/* ── Your stats ── */}
        {overview && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:-8 }}>
              <Activity size={13} color="#7B5EF8"/>
              <p style={{ fontSize:12, fontWeight:700, color:'#4A4870', margin:0, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Your Stats
              </p>
            </div>
            <div className="grid-3">
              <StatCard label="Your Sessions"   value={overview.total_sessions}        icon={Layers}        color="#7B5EF8"/>
              <StatCard label="Messages Sent"   value={overview.total_messages}        icon={MessageSquare} color="#10D9A8"/>
              <StatCard label="Avg AI Response" value={`${overview.avg_latency_ms}ms`} sub="Response time"  icon={Clock}         color="#FBBF24"/>
            </div>
          </>
        )}

        {/* ── Trajectory ── */}
        {trajectory && (
          <div style={{ background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:22, animation:'fadeIn 0.4s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
              <SectionTitle icon={Brain} color="#7B5EF8" title="Mental State Trajectory (72h)" sub="EMA-based emotional tracking"/>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {trajectory.last_trigger === 'high_risk' && (
                  <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:6, background:'rgba(255,107,107,0.10)', color:'#FF6B6B', border:'1px solid rgba(255,107,107,0.25)' }}>
                    <AlertTriangle size={9}/> Risk Alert
                  </span>
                )}
                {trajectory.trend && (
                  <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:99, background:trendColor+'15', border:`1px solid ${trendColor}30`, color:trendColor, fontSize:12, fontWeight:700 }}>
                    <TrendIcon size={11}/>{trajectory.trend}
                  </div>
                )}
              </div>
            </div>

            <div className="grid-3" style={{ marginBottom: trajectory.recent?.length > 0 ? 18 : 0 }}>
              {[
                ['Current EMA',   trajectory.current_ema  != null ? `${Math.round(trajectory.current_ema * 100)}%` : '—', '#7B5EF8'],
                ['Avg Sentiment', trajectory.avg_sentiment != null ? (trajectory.avg_sentiment > 0 ? '+' : '') + trajectory.avg_sentiment.toFixed(2) : '—', '#10D9A8'],
                ['Data Points',   trajectory.points ?? 0, '#8B87B8'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ padding:'14px', borderRadius:12, background:'rgba(255,255,255,0.02)', border:`1px solid ${c}18`, textAlign:'center' }}>
                  <p style={{ fontSize:26, fontWeight:800, color:c, margin:0 }}>{v}</p>
                  <p style={{ fontSize:11, color:'#4A4870', marginTop:5 }}>{l}</p>
                </div>
              ))}
            </div>

            {trajectory.recent?.length > 1 && (
              <div style={{ marginTop:4 }}>
                <p style={{ fontSize:11, color:'#4A4870', marginBottom:8 }}>
                  EMA trend (last {trajectory.recent.length} points)
                </p>
                <svg width="100%" height="52" viewBox={`0 0 ${trajectory.recent.length * 40} 52`} preserveAspectRatio="none"
                  style={{ borderRadius:10, background:'rgba(0,0,0,0.15)' }}>
                  {(() => {
                    const pts  = trajectory.recent
                    const vals = pts.map(p => p.ema)
                    const mn   = Math.min(...vals), mx = Math.max(...vals)
                    const range = mx - mn || 0.01
                    const points = pts.map((p, i) => {
                      const x = (i / (pts.length - 1)) * (pts.length * 40 - 8) + 4
                      const y = 46 - ((p.ema - mn) / range) * 38
                      return `${x},${y}`
                    }).join(' ')
                    return (
                      <>
                        <polyline fill="none" stroke={trendColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points}/>
                        {pts.map((p, i) => {
                          const x = (i / (pts.length - 1)) * (pts.length * 40 - 8) + 4
                          const y = 46 - ((p.ema - mn) / range) * 38
                          return <circle key={i} cx={x} cy={y} r="3.5" fill={trendColor} opacity="0.85"/>
                        })}
                      </>
                    )
                  })()}
                </svg>
              </div>
            )}
          </div>
        )}

        {/* ── Distributions ── */}
        <div className="grid-2">
          <div style={{ background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:20 }}>
            <SectionTitle icon={Activity} color="#10D9A8" title="Emotion Distribution" sub="From your chat sessions"/>
            {emotions.length === 0
              ? <p style={{ fontSize:12, color:'#4A4870' }}>No data yet — start chatting</p>
              : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {emotions.map(e => <HBar key={e.label} label={e.label} value={e.value} max={maxEmo} color={ECOL[e.label] || '#8B87B8'}/>)}
                </div>
            }
          </div>
          <div style={{ background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:20 }}>
            <SectionTitle icon={AlertTriangle} color="#FBBF24" title="Risk Distribution" sub="Across your sessions"/>
            {risks.length === 0
              ? <p style={{ fontSize:12, color:'#4A4870' }}>No data yet — complete a session</p>
              : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {risks.map(r => <HBar key={r.label} label={r.label.toLowerCase()} value={r.value} max={maxRisk} color={RCOL[r.label] || '#8B87B8'}/>)}
                </div>
            }
          </div>
        </div>

        {/* ── Model performance ── */}
        {modelPerf && (
          <div style={{ background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <Cpu size={16} color="#60A5FA"/>
              <div>
                <p style={{ fontSize:15, fontWeight:700, color:'#C4C0E8', margin:0 }}>
                  Emotion AI — Model Performance
                </p>
                <p style={{ fontSize:12, color:'#4A4870', marginTop:3 }}>
                  {modelPerf.dataset} · {modelPerf.architecture}
                </p>
              </div>
            </div>

            <div className="grid-3" style={{ marginBottom:20 }}>
              {[
                ['Training Accuracy',   modelPerf.training_accuracy,   '#10D9A8'],
                ['Validation Accuracy', modelPerf.validation_accuracy, '#60A5FA'],
                ['Test Accuracy',       modelPerf.test_accuracy,       '#7B5EF8'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${c}22`, borderRadius:14, padding:'16px 14px' }}>
                  <p style={{ fontSize:30, fontWeight:800, color:c, margin:0 }}>{(v * 100).toFixed(1)}%</p>
                  <p style={{ fontSize:11, color:'#8B87B8', marginTop:6 }}>{l}</p>
                  <div style={{ height:3, borderRadius:99, background:'rgba(255,255,255,0.05)', marginTop:10, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background:c, width:`${v * 100}%` }}/>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ fontSize:13, color:'#8B87B8', lineHeight:1.7, marginBottom:18, padding:'12px 16px', borderRadius:12, background:'rgba(123,94,248,0.05)', border:'1px solid rgba(123,94,248,0.12)' }}>
              A score of 71% means the model correctly identifies <strong style={{ color:'#C4C0E8' }}>7 out of 10</strong> facial expressions. Works best with <strong style={{ color:'#10D9A8' }}>happy</strong> and <strong style={{ color:'#8B87B8' }}>neutral</strong> faces.
            </p>

            {/* Table — scrollable on mobile */}
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:400 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    {['Emotion','Precision','Recall','F1 Score'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign: h === 'Emotion' ? 'left' : 'center', fontSize:10, fontWeight:700, color:'#4A4870', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modelPerf.per_class.map(row => {
                    const col = row.f1 >= 0.75 ? '#10D9A8' : row.f1 >= 0.65 ? '#FBBF24' : '#FF6B6B'
                    const ec  = ECOL[row.emotion] || '#8B87B8'
                    return (
                      <tr key={row.emotion} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding:'11px 10px', fontSize:13, fontWeight:700, color:ec, textTransform:'capitalize' }}>{row.emotion}</td>
                        <td style={{ padding:'11px 10px', textAlign:'center', fontSize:13, color:'#8B87B8' }}>{(row.precision * 100).toFixed(0)}%</td>
                        <td style={{ padding:'11px 10px', textAlign:'center', fontSize:13, color:'#8B87B8' }}>{(row.recall * 100).toFixed(0)}%</td>
                        <td style={{ padding:'11px 10px', textAlign:'center' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                            <div style={{ width:60, height:5, borderRadius:99, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:99, background:col, width:`${row.f1 * 100}%` }}/>
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color:col, minWidth:28 }}>{(row.f1 * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Session history ── */}
        <div style={{ background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:8 }}>
            <SectionTitle icon={History} color="#FBBF24" title="My Session History" sub="Most recent 20 sessions"/>
            <span style={{ fontSize:11, color:'#4A4870', background:'rgba(255,255,255,0.04)', borderRadius:6, padding:'3px 9px' }}>
              {mySessions.length} sessions
            </span>
          </div>
          {mySessions.length === 0
            ? <p style={{ fontSize:13, color:'#4A4870', margin:0 }}>No sessions yet. Start a chat to begin tracking.</p>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {mySessions.map(s => {
                  const rc  = RCOL[s.risk_level] || '#8B87B8'
                  const trc = s.trajectory_trend === 'improving' ? '#10D9A8' : s.trajectory_trend === 'deteriorating' ? '#FF6B6B' : '#8B87B8'
                  return (
                    <div key={s.session_id} style={{
                      display:'flex', alignItems:'center', gap:14, padding:'12px 14px',
                      borderRadius:12, background:'rgba(255,255,255,0.02)',
                      border:'1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ width:9, height:9, borderRadius:'50%', background:rc, boxShadow:`0 0 8px ${rc}60`, flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:rc, textTransform:'capitalize' }}>
                            {s.risk_level ? s.risk_level.toLowerCase() + ' risk' : 'Session'}
                          </span>
                          {s.trajectory_trend && (
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:trc+'15', color:trc, border:`1px solid ${trc}30` }}>
                              {s.trajectory_trend}
                            </span>
                          )}
                          {s.phq9_category && (
                            <span style={{ fontSize:10, color:'#4A4870', background:'rgba(255,255,255,0.04)', borderRadius:5, padding:'2px 7px' }}>
                              PHQ-9: {s.phq9_score} · {s.phq9_category}
                            </span>
                          )}
                          <span style={{ fontSize:10, color:'#4A4870', background:'rgba(255,255,255,0.04)', borderRadius:5, padding:'2px 7px' }}>
                            {s.message_count} msgs
                          </span>
                        </div>
                        <span style={{ fontSize:11, color:'#2E2B40' }}>
                          {s.started_at ? new Date(s.started_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
                        </span>
                      </div>
                      {s.risk_score != null && (
                        <span style={{ fontSize:15, fontWeight:800, color:rc, flexShrink:0 }}>
                          {(s.risk_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
          }
        </div>
      </div>
    </div>
  )
}