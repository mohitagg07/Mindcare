import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Clock, MessageSquare, Layers, Cpu, History,
         TrendingUp, TrendingDown, Minus, Brain, Users, Wifi,
         RefreshCw, AlertTriangle, Activity } from 'lucide-react'
import { api } from '../api/client'

const ECOL = {
  happy:'#2A7D6F', sad:'#3B6EA8', angry:'#C0424A',
  neutral:'#6B7280', fear:'#7B5EA8', disgust:'#C07436', surprise:'#B05090'
}
const RCOL = { MINIMAL:'#2A7D6F', LOW:'#3B6EA8', MODERATE:'#C07436', HIGH:'#C0424A' }

function HBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <span style={{ width:72, fontSize:12, color:'var(--text-3)', textAlign:'right',
        flexShrink:0, fontWeight:500, textTransform:'capitalize' }}>{label}</span>
      <div style={{ flex:1, height:7, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:99, background:color, width:`${pct}%`, transition:'width 0.8s ease' }}/>
      </div>
      <span style={{ width:24, fontSize:12, fontWeight:700, color, textAlign:'right', flexShrink:0 }}>{value}</span>
    </div>
  )
}

function StatCard({ label, value, sub, icon:Icon, color, pulse: hasPulse }) {
  return (
    <div style={{ background:'var(--bg-card)', border:`1px solid ${color}22`,
      borderRadius:16, padding:'18px', display:'flex', flexDirection:'column', gap:8,
      boxShadow:'0 1px 4px rgba(26,35,50,0.06)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'var(--text-3)', fontWeight:600 }}>{label}</span>
        <div style={{ width:32, height:32, borderRadius:10, background:color+'15',
          display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
          <Icon size={14} color={color}/>
          {hasPulse && <div style={{ position:'absolute', top:-1, right:-1, width:9, height:9,
            borderRadius:'50%', background:'#2A7D6F', border:'2px solid var(--bg-card)',
            animation:'pulse 1.5s ease-in-out infinite' }}/>}
        </div>
      </div>
      <p style={{ fontSize:30, fontWeight:800, color:'var(--text-1)', margin:0, letterSpacing:'-0.5px' }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'var(--text-4)', margin:0 }}>{sub}</p>}
    </div>
  )
}

function SectionTitle({ icon:Icon, color, title, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
      <div style={{ width:28, height:28, borderRadius:8, background:color+'15',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={13} color={color}/>
      </div>
      <div>
        <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', margin:0 }}>{title}</p>
        {sub && <p style={{ fontSize:11, color:'var(--text-3)', margin:0, marginTop:2 }}>{sub}</p>}
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
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const [ov, em, rk, mp, ms, tr, tu, ou] = await Promise.all([
        api.metricsOverview(), api.emotionDist(), api.riskDist(),
        api.modelPerf(), api.mySessions(), api.trajectory(),
        api.totalUsers(), api.onlineUsers(),
      ])
      setOverview(ov.data)
      setEmotions(em.data.map(e => ({ label: e.emotion, value: e.count })))
      setRisks(rk.data.map(r => ({ label: r.level, value: r.count })))
      setModelPerf(mp.data)
      setMySessions(ms.data)
      setTrajectory(tr.data)
      setTotalUsers(tu.data.total)
      setOnlineUsers(ou.data.online)
      setLastRefresh(new Date())
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { const id = setInterval(() => load(true), 30_000); return () => clearInterval(id) }, [load])

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
      gap:12, flexDirection:'column', height:'100%', background:'var(--bg-page)' }}>
      <div style={{ width:20, height:20, border:'2.5px solid var(--border-md)',
        borderTopColor:'var(--teal)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <p style={{ color:'var(--text-3)', fontSize:13 }}>Loading analytics…</p>
    </div>
  )

  const maxEmo    = Math.max(...emotions.map(e => e.value), 1)
  const maxRisk   = Math.max(...risks.map(r => r.value), 1)
  const trendColor = trajectory?.trend==='improving' ? '#2A7D6F' : trajectory?.trend==='deteriorating' ? '#C0424A' : '#6B7280'
  const TrendIcon  = trajectory?.trend==='improving' ? TrendingUp : trajectory?.trend==='deteriorating' ? TrendingDown : Minus

  return (
    <div style={{ height:'100%', overflowY:'auto', background:'var(--bg-page)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ maxWidth:980, margin:'0 auto', padding:'24px 16px', display:'flex', flexDirection:'column', gap:18 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:13 }}>
            <div style={{ width:44, height:44, borderRadius:13,
              background:'var(--teal-dim)', border:'1px solid var(--teal-border)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BarChart3 size={20} color="var(--teal)"/>
            </div>
            <div>
              <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif' }}>Analytics</h2>
              <p style={{ fontSize:12, color:'var(--text-4)', marginTop:3 }}>
                {lastRefresh ? `Last updated ${lastRefresh.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}` : 'Loading…'}
              </p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={() => load(true)} disabled={refreshing}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:99,
                border:'1px solid var(--border-md)', background:'var(--bg-card)', color:'var(--text-3)',
                fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}/>
              Refresh
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 13px', borderRadius:99,
              background:'var(--teal-dim)', border:'1px solid var(--teal-border)',
              color:'var(--teal)', fontSize:11, fontWeight:700 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--teal)', animation:'pulse 1.5s infinite' }}/>
              Live · auto-refresh 30s
            </div>
          </div>
        </div>

        {/* Platform stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--teal-border)', borderRadius:16,
            padding:'18px 20px', display:'flex', alignItems:'center', gap:14,
            boxShadow:'0 1px 4px rgba(26,35,50,0.06)' }}>
            <div style={{ width:46, height:46, borderRadius:13, background:'var(--teal-dim)',
              border:'1px solid var(--teal-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Users size={20} color="var(--teal)"/>
            </div>
            <div>
              <p style={{ fontSize:30, fontWeight:800, color:'var(--text-1)', margin:0, letterSpacing:'-1px' }}>{totalUsers ?? '—'}</p>
              <p style={{ fontSize:12, color:'var(--teal)', margin:0, fontWeight:600 }}>Total Registered Users</p>
              <p style={{ fontSize:11, color:'var(--text-4)', margin:0 }}>Platform-wide accounts</p>
            </div>
          </div>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--teal-border)', borderRadius:16,
            padding:'18px 20px', display:'flex', alignItems:'center', gap:14,
            boxShadow:'0 1px 4px rgba(26,35,50,0.06)' }}>
            <div style={{ width:46, height:46, borderRadius:13, background:'var(--teal-dim)',
              border:'1px solid var(--teal-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
              <Wifi size={20} color="var(--teal)"/>
              <div style={{ position:'absolute', top:6, right:6, width:8, height:8,
                borderRadius:'50%', background:'var(--teal)', animation:'pulse 1.5s infinite' }}/>
            </div>
            <div>
              <p style={{ fontSize:30, fontWeight:800, color:'var(--text-1)', margin:0, letterSpacing:'-1px' }}>{onlineUsers ?? '—'}</p>
              <p style={{ fontSize:12, color:'var(--teal)', margin:0, fontWeight:600 }}>Users Online Now</p>
              <p style={{ fontSize:11, color:'var(--text-4)', margin:0 }}>Active in last 2 minutes</p>
            </div>
          </div>
        </div>

        {/* Your stats */}
        {overview && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Activity size={13} color="var(--teal)"/>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', margin:0,
                textTransform:'uppercase', letterSpacing:'0.8px' }}>Your Stats</p>
            </div>
            <div className="grid-3">
              <StatCard label="Your Sessions"   value={overview.total_sessions}       icon={Layers}        color="#2A7D6F"/>
              <StatCard label="Messages Sent"   value={overview.total_messages}       icon={MessageSquare} color="#3B6EA8"/>
              <StatCard label="Avg AI Response" value={`${overview.avg_latency_ms}ms`} sub="Response time"  icon={Clock}   color="#C07436"/>
            </div>
          </>
        )}

        {/* Trajectory */}
        {trajectory && (
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
              <SectionTitle icon={Brain} color="var(--teal)" title="Mental State Trajectory (72h)" sub="EMA-based emotional tracking"/>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {trajectory.last_trigger==='high_risk' && (
                  <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700,
                    padding:'4px 10px', borderRadius:6, background:'var(--rose-dim)', color:'var(--rose)',
                    border:'1px solid rgba(192,66,74,0.2)' }}>
                    <AlertTriangle size={9}/> Risk Alert
                  </span>
                )}
                {trajectory.trend && (
                  <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:99,
                    background:trendColor+'12', border:`1px solid ${trendColor}28`,
                    color:trendColor, fontSize:12, fontWeight:700 }}>
                    <TrendIcon size={11}/>{trajectory.trend}
                  </div>
                )}
              </div>
            </div>
            <div className="grid-3">
              {[
                ['Current EMA',   trajectory.current_ema  != null ? `${Math.round(trajectory.current_ema*100)}%` : '—', '#2A7D6F'],
                ['Avg Sentiment', trajectory.avg_sentiment != null ? (trajectory.avg_sentiment>0?'+':'')+trajectory.avg_sentiment.toFixed(2) : '—', '#3B6EA8'],
                ['Data Points',   trajectory.points ?? 0, '#6B7280'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ padding:'14px', borderRadius:12, background:'var(--bg-elevated)',
                  border:`1px solid ${c}18`, textAlign:'center' }}>
                  <p style={{ fontSize:26, fontWeight:800, color:c, margin:0 }}>{v}</p>
                  <p style={{ fontSize:11, color:'var(--text-3)', marginTop:5 }}>{l}</p>
                </div>
              ))}
            </div>
            {trajectory.recent?.length > 1 && (
              <div style={{ marginTop:14 }}>
                <p style={{ fontSize:11, color:'var(--text-4)', marginBottom:8 }}>EMA trend (last {trajectory.recent.length} points)</p>
                <svg width="100%" height="52" viewBox={`0 0 ${trajectory.recent.length * 40} 52`}
                  preserveAspectRatio="none" style={{ borderRadius:8, background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                  {(() => {
                    const pts = trajectory.recent
                    const vals = pts.map(p => p.ema)
                    const mn = Math.min(...vals), mx = Math.max(...vals)
                    const range = mx - mn || 0.01
                    const points = pts.map((p, i) => {
                      const x = (i/(pts.length-1)) * (pts.length*40-8) + 4
                      const y = 46 - ((p.ema-mn)/range) * 36
                      return `${x},${y}`
                    }).join(' ')
                    return (
                      <>
                        <polyline fill="none" stroke={trendColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points}/>
                        {pts.map((p,i) => {
                          const x = (i/(pts.length-1)) * (pts.length*40-8) + 4
                          const y = 46 - ((p.ema-mn)/range) * 36
                          return <circle key={i} cx={x} cy={y} r="3" fill={trendColor}/>
                        })}
                      </>
                    )
                  })()}
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Distributions */}
        <div className="grid-2">
          <div className="card">
            <SectionTitle icon={Activity} color="#2A7D6F" title="Emotion Distribution" sub="From your chat sessions"/>
            {emotions.length===0
              ? <p style={{ fontSize:12, color:'var(--text-4)' }}>No data yet — start chatting</p>
              : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {emotions.map(e => <HBar key={e.label} label={e.label} value={e.value} max={maxEmo} color={ECOL[e.label]||'#6B7280'}/>)}
                </div>
            }
          </div>
          <div className="card">
            <SectionTitle icon={AlertTriangle} color="#C07436" title="Risk Distribution" sub="Across your sessions"/>
            {risks.length===0
              ? <p style={{ fontSize:12, color:'var(--text-4)' }}>No data yet — complete a session</p>
              : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {risks.map(r => <HBar key={r.label} label={r.label.toLowerCase()} value={r.value} max={maxRisk} color={RCOL[r.label]||'#6B7280'}/>)}
                </div>
            }
          </div>
        </div>

        {/* Model performance */}
        {modelPerf && (
          <div className="card">
            <SectionTitle icon={Cpu} color="#3B6EA8" title="Emotion AI — Model Performance" sub={`${modelPerf.dataset} · ${modelPerf.architecture}`}/>
            <div className="grid-3" style={{ marginBottom:18 }}>
              {[
                ['Training Accuracy',   modelPerf.training_accuracy,   '#2A7D6F'],
                ['Validation Accuracy', modelPerf.validation_accuracy, '#3B6EA8'],
                ['Test Accuracy',       modelPerf.test_accuracy,       '#7B5EA8'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background:'var(--bg-elevated)', border:`1px solid ${c}18`,
                  borderRadius:12, padding:'14px' }}>
                  <p style={{ fontSize:28, fontWeight:800, color:c, margin:0 }}>{(v*100).toFixed(1)}%</p>
                  <p style={{ fontSize:11, color:'var(--text-3)', marginTop:5 }}>{l}</p>
                  <div style={{ height:3, borderRadius:99, background:'var(--border)', marginTop:8, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background:c, width:`${v*100}%` }}/>
                  </div>
                </div>
              ))}
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:`1px solid var(--border)` }}>
                  {['Emotion','Precision','Recall','F1 Score'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:h==='Emotion'?'left':'center',
                      fontSize:11, fontWeight:700, color:'var(--text-4)',
                      textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelPerf.per_class.map(row => {
                  const col = row.f1>=0.75?'#2A7D6F':row.f1>=0.65?'#C07436':'#C0424A'
                  const ec  = ECOL[row.emotion]||'#6B7280'
                  return (
                    <tr key={row.emotion} style={{ borderBottom:`1px solid var(--border)` }}>
                      <td style={{ padding:'11px 10px', fontSize:14, fontWeight:700, color:ec, textTransform:'capitalize' }}>{row.emotion}</td>
                      <td style={{ padding:'11px 10px', textAlign:'center', fontSize:13, color:'var(--text-2)' }}>{(row.precision*100).toFixed(0)}%</td>
                      <td style={{ padding:'11px 10px', textAlign:'center', fontSize:13, color:'var(--text-2)' }}>{(row.recall*100).toFixed(0)}%</td>
                      <td style={{ padding:'11px 10px', textAlign:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                          <div style={{ width:56, height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:99, background:col, width:`${row.f1*100}%` }}/>
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:col, minWidth:28 }}>{(row.f1*100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Session history */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <SectionTitle icon={History} color="#C07436" title="My Session History" sub="Most recent 20 sessions"/>
            <span style={{ fontSize:11, color:'var(--text-4)', background:'var(--bg-elevated)',
              borderRadius:6, padding:'3px 9px', border:'1px solid var(--border)' }}>{mySessions.length} sessions</span>
          </div>
          {mySessions.length===0
            ? <p style={{ fontSize:13, color:'var(--text-4)' }}>No sessions yet. Start a chat to begin tracking.</p>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {mySessions.map(s => {
                  const rc  = RCOL[s.risk_level] || '#6B7280'
                  const trc = s.trajectory_trend==='improving'?'#2A7D6F':s.trajectory_trend==='deteriorating'?'#C0424A':'#6B7280'
                  return (
                    <div key={s.session_id} style={{ display:'flex', alignItems:'center', gap:12,
                      padding:'11px 14px', borderRadius:12, background:'var(--bg-elevated)',
                      border:'1px solid var(--border)' }}>
                      <div style={{ width:9, height:9, borderRadius:'50%', background:rc,
                        boxShadow:`0 0 6px ${rc}50`, flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:rc, textTransform:'capitalize' }}>
                            {s.risk_level ? s.risk_level.toLowerCase()+' risk' : 'Session'}
                          </span>
                          {s.trajectory_trend && (
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6,
                              background:trc+'12', color:trc, border:`1px solid ${trc}25` }}>
                              {s.trajectory_trend}
                            </span>
                          )}
                          {s.phq9_category && (
                            <span style={{ fontSize:11, color:'var(--text-3)', background:'var(--bg-card)',
                              borderRadius:5, padding:'2px 7px', border:'1px solid var(--border)' }}>
                              PHQ-9: {s.phq9_score} · {s.phq9_category}
                            </span>
                          )}
                          <span style={{ fontSize:11, color:'var(--text-3)', background:'var(--bg-card)',
                            borderRadius:5, padding:'2px 7px', border:'1px solid var(--border)' }}>
                            {s.message_count} msgs
                          </span>
                        </div>
                        <span style={{ fontSize:11, color:'var(--text-4)' }}>
                          {s.started_at ? new Date(s.started_at).toLocaleDateString('en-IN',
                            { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
                        </span>
                      </div>
                      {s.risk_score != null && (
                        <span style={{ fontSize:15, fontWeight:800, color:rc, flexShrink:0 }}>
                          {(s.risk_score*100).toFixed(0)}%
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