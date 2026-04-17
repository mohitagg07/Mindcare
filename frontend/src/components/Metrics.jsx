import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { BarChart3, Clock, MessageSquare, Layers, Cpu, History,
         TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react'
import { api } from '../api/client'

const ECOL = { happy:'#56CFB2', sad:'#60A5FA', angry:'#FF6B6B', neutral:'#8B8AAA', fear:'#C4A3FF', disgust:'#FFB547', surprise:'#F9A8D4' }
const RCOL = { MINIMAL:'#56CFB2', LOW:'#60A5FA', MODERATE:'#FFB547', HIGH:'#FF6B6B' }

function HBar({ label, value, max, color }) {
  const pct = max>0 ? Math.round((value/max)*100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <span style={{ width:76, fontSize:12, color:'#8B8AAA', textAlign:'right', flexShrink:0,
        fontWeight:500, textTransform:'capitalize' }}>{label}</span>
      <div style={{ flex:1, height:8, borderRadius:99, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:99, background:color, width:`${pct}%`, transition:'width 0.8s ease' }}/>
      </div>
      <span style={{ width:24, fontSize:12, fontWeight:700, color, textAlign:'right', flexShrink:0 }}>{value}</span>
    </div>
  )
}

function StatCard({ label, value, sub, icon:Icon, color }) {
  return (
    <div style={{ background:'#252238', border:`1px solid ${color}20`, borderRadius:16, padding:'18px',
      display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'#4A4870', fontWeight:600 }}>{label}</span>
        <div style={{ width:30, height:30, borderRadius:9, background:color+'15',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={13} color={color}/>
        </div>
      </div>
      <p style={{ fontSize:30, fontWeight:800, color:'#F5F0FF', margin:0, letterSpacing:'-0.5px' }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'#2E2B40', margin:0 }}>{sub}</p>}
    </div>
  )
}

export default function Metrics() {
  const [overview,   setOverview]   = useState(null)
  const [emotions,   setEmotions]   = useState([])
  const [risks,      setRisks]      = useState([])
  const [modelPerf,  setModelPerf]  = useState(null)
  const [mySessions, setMySessions] = useState([])
  const [trajectory, setTrajectory] = useState(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      api.metricsOverview(), api.emotionDist(), api.riskDist(),
      api.modelPerf(), api.mySessions(), api.trajectory(),
    ]).then(([ov,em,rk,mp,ms,tr]) => {
      setOverview(ov.data)
      setEmotions(em.data.map(e=>({ label:e.emotion, value:e.count })))
      setRisks(rk.data.map(r=>({ label:r.level, value:r.count })))
      setModelPerf(mp.data)
      setMySessions(ms.data)
      setTrajectory(tr.data)
    }).catch(console.error).finally(()=>setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
      gap:12, flexDirection:'column', height:'100%', background:'#13111C' }}>
      <div style={{ width:20, height:20, border:'2px solid rgba(155,109,255,0.2)',
        borderTopColor:'#9B6DFF', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <p style={{ color:'#4A4870', fontSize:13 }}>Loading analytics…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const maxEmo  = Math.max(...emotions.map(e=>e.value), 1)
  const maxRisk = Math.max(...risks.map(r=>r.value), 1)
  const trendColor = trajectory?.trend==='improving'?'#56CFB2':trajectory?.trend==='deteriorating'?'#FF6B6B':'#8B8AAA'
  const TrendIcon  = trajectory?.trend==='improving'?TrendingUp:trajectory?.trend==='deteriorating'?TrendingDown:Minus

  return (
    <div style={{ height:'100%', overflowY:'auto', background:'#13111C' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'28px 24px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:13, background:'rgba(155,109,255,0.12)',
              border:'1px solid rgba(155,109,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <BarChart3 size={20} color="#9B6DFF"/>
            </div>
            <div>
              <h2 style={{ fontSize:22, fontWeight:700, color:'#F5F0FF', margin:0, letterSpacing:'-0.3px' }}>Analytics</h2>
              <p style={{ fontSize:13, color:'#4A4870', marginTop:3 }}>Sessions · Trajectory · Model performance</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 14px', borderRadius:99,
            background:'rgba(86,207,178,0.08)', border:'1px solid rgba(86,207,178,0.2)',
            color:'#56CFB2', fontSize:11, fontWeight:700 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#56CFB2', animation:'pulse 1.5s ease-in-out infinite' }}/>
            Live data
          </div>
        </div>

        {/* Stats */}
        {overview && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            <StatCard label="Your Sessions"  value={overview.total_sessions} icon={Layers}        color="#9B6DFF"/>
            <StatCard label="Messages Sent"  value={overview.total_messages} icon={MessageSquare} color="#56CFB2"/>
            <StatCard label="Avg Response"   value={`${overview.avg_latency_ms}ms`} sub="AI response time" icon={Clock} color="#FFB547"/>
          </div>
        )}

        {/* Trajectory */}
        {trajectory && (
          <div style={{ background:'#252238', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:22 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Brain size={14} color="#9B6DFF"/>
                <p style={{ fontSize:14, fontWeight:700, color:'#D4CEE8', margin:0 }}>Mental State Trajectory (72h)</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {trajectory.last_trigger==='high_risk' && (
                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:6,
                    background:'rgba(239,68,68,0.1)', color:'#FF6B6B', border:'1px solid rgba(239,68,68,0.25)' }}>Risk Alert</span>
                )}
                {trajectory.trend && (
                  <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:99,
                    background:trendColor+'15', border:`1px solid ${trendColor}30`, color:trendColor, fontSize:12, fontWeight:700 }}>
                    <TrendIcon size={11}/>{trajectory.trend}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {[
                ['Current EMA', trajectory.current_ema!=null?`${Math.round(trajectory.current_ema*100)}%`:'—', '#9B6DFF'],
                ['Avg Sentiment', trajectory.avg_sentiment!=null?(trajectory.avg_sentiment>0?'+':'')+trajectory.avg_sentiment.toFixed(2):'—', '#56CFB2'],
                ['Data Points', trajectory.points??0, '#8B8AAA'],
              ].map(([l,v,c]) => (
                <div key={l} style={{ padding:'14px', borderRadius:12, background:'#1D1A2C',
                  border:`1px solid ${c}20`, textAlign:'center' }}>
                  <p style={{ fontSize:24, fontWeight:800, color:c, margin:0 }}>{v}</p>
                  <p style={{ fontSize:11, color:'#4A4870', marginTop:5 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distributions */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ background:'#252238', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:20 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#D4CEE8', margin:'0 0 16px' }}>Emotion Distribution</p>
            {emotions.length===0 ? <p style={{ fontSize:12, color:'#4A4870' }}>No data yet — start chatting</p>
              : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {emotions.map(e => <HBar key={e.label} label={e.label} value={e.value} max={maxEmo} color={ECOL[e.label]||'#8B8AAA'}/>)}
                </div>
            }
          </div>
          <div style={{ background:'#252238', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:20 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#D4CEE8', margin:'0 0 16px' }}>Risk Distribution</p>
            {risks.length===0 ? <p style={{ fontSize:12, color:'#4A4870' }}>No data yet — complete a session</p>
              : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {risks.map(r => <HBar key={r.label} label={r.label.toLowerCase()} value={r.value} max={maxRisk} color={RCOL[r.label]||'#8B8AAA'}/>)}
                </div>
            }
          </div>
        </div>

        {/* Model performance */}
        {modelPerf && (
          <div style={{ background:'#252238', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <Cpu size={15} color="#60A5FA"/>
              <div>
                <p style={{ fontSize:15, fontWeight:700, color:'#D4CEE8', margin:0 }}>Emotion AI — How Accurate Is It?</p>
                <p style={{ fontSize:12, color:'#4A4870', marginTop:3 }}>{modelPerf.dataset} · {modelPerf.architecture}</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
              {[
                ['Learned from training data', modelPerf.training_accuracy,   '#56CFB2'],
                ['Checked on unseen data',      modelPerf.validation_accuracy, '#60A5FA'],
                ['Final real-world accuracy',   modelPerf.test_accuracy,       '#9B6DFF'],
              ].map(([l,v,c]) => (
                <div key={l} style={{ background:'#1D1A2C', border:`1px solid ${c}25`, borderRadius:14, padding:'16px 14px' }}>
                  <p style={{ fontSize:30, fontWeight:800, color:c, margin:0 }}>{(v*100).toFixed(1)}%</p>
                  <p style={{ fontSize:11, color:'#8B8AAA', marginTop:6 }}>{l}</p>
                  <div style={{ height:3, borderRadius:99, background:'rgba(255,255,255,0.05)', marginTop:10, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background:c, width:`${v*100}%` }}/>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize:13, color:'#8B8AAA', lineHeight:1.7, marginBottom:18, padding:'12px 16px',
              borderRadius:12, background:'rgba(155,109,255,0.05)', border:'1px solid rgba(155,109,255,0.12)' }}>
              A score of 71% means the model correctly identifies <strong style={{ color:'#D4CEE8' }}>7 out of 10</strong> facial expressions. Works best with <strong style={{ color:'#56CFB2' }}>happy</strong> and <strong style={{ color:'#8B8AAA' }}>neutral</strong> faces.
            </p>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  {['Emotion','Precision','Recall','F1 Score'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:h==='Emotion'?'left':'center',
                      fontSize:11, fontWeight:700, color:'#4A4870', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelPerf.per_class.map(row => {
                  const col = row.f1>=0.75?'#56CFB2':row.f1>=0.65?'#FFB547':'#FF6B6B'
                  const ec  = ECOL[row.emotion]||'#8B8AAA'
                  return (
                    <tr key={row.emotion} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding:'11px 10px', fontSize:14, fontWeight:700, color:ec, textTransform:'capitalize' }}>{row.emotion}</td>
                      <td style={{ padding:'11px 10px', textAlign:'center', fontSize:13, color:'#8B8AAA' }}>{(row.precision*100).toFixed(0)}%</td>
                      <td style={{ padding:'11px 10px', textAlign:'center', fontSize:13, color:'#8B8AAA' }}>{(row.recall*100).toFixed(0)}%</td>
                      <td style={{ padding:'11px 10px', textAlign:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                          <div style={{ width:60, height:5, borderRadius:99, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
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
        <div style={{ background:'#252238', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <History size={14} color="#FFB547"/>
              <p style={{ fontSize:14, fontWeight:700, color:'#D4CEE8', margin:0 }}>My Session History</p>
            </div>
            <span style={{ fontSize:11, color:'#4A4870', background:'rgba(255,255,255,0.04)',
              borderRadius:6, padding:'3px 9px' }}>{mySessions.length} sessions</span>
          </div>
          {mySessions.length===0 ? (
            <p style={{ fontSize:13, color:'#4A4870', margin:0 }}>No sessions yet. Start a chat to begin tracking.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {mySessions.map(s => {
                const rc  = RCOL[s.risk_level]||'#8B8AAA'
                const trc = s.trajectory_trend==='improving'?'#56CFB2':s.trajectory_trend==='deteriorating'?'#FF6B6B':'#8B8AAA'
                return (
                  <div key={s.session_id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px',
                    borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width:9, height:9, borderRadius:'50%', background:rc, boxShadow:`0 0 8px ${rc}60`, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:rc, textTransform:'capitalize' }}>
                          {s.risk_level ? s.risk_level.toLowerCase()+' risk' : 'Session'}
                        </span>
                        {s.trajectory_trend && (
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6,
                            background:trc+'15', color:trc, border:`1px solid ${trc}30` }}>
                            {s.trajectory_trend}
                          </span>
                        )}
                        {s.phq9_category && (
                          <span style={{ fontSize:11, color:'#4A4870', background:'rgba(255,255,255,0.04)', borderRadius:5, padding:'2px 7px' }}>
                            PHQ-9: {s.phq9_score} · {s.phq9_category}
                          </span>
                        )}
                        <span style={{ fontSize:11, color:'#4A4870', background:'rgba(255,255,255,0.04)', borderRadius:5, padding:'2px 7px' }}>
                          {s.message_count} msgs
                        </span>
                      </div>
                      <span style={{ fontSize:11, color:'#2E2B40' }}>
                        {s.started_at ? new Date(s.started_at).toLocaleDateString('en-IN',
                          { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
                      </span>
                    </div>
                    {s.risk_score!=null && (
                      <span style={{ fontSize:15, fontWeight:800, color:rc, flexShrink:0 }}>
                        {(s.risk_score*100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}