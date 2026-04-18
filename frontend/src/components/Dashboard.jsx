import { useApp } from '../context/AppContext'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
         LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { LayoutDashboard, Activity, ShieldAlert, Brain, Dumbbell, Phone,
         Smartphone, Globe, AlertTriangle, Info, MessageSquare, ClipboardList,
         TrendingUp, TrendingDown, Minus } from 'lucide-react'

const RES_ICONS = { phone:Phone, app:Smartphone, text:Globe }

/* ── Half-donut gauge ── */
function Gauge({ score }) {
  const pct   = Math.round(score * 100)
  const color = score >= 0.75 ? '#FF6B6B' : score >= 0.5 ? '#FBBF24' : score >= 0.25 ? '#60A5FA' : '#10D9A8'
  const label = score >= 0.75 ? 'High' : score >= 0.5 ? 'Moderate' : score >= 0.25 ? 'Low' : 'Minimal'
  const r = 68, circ = Math.PI * r, dash = circ - (pct / 100) * circ
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ position:'relative', width:190, height:100 }}>
        <svg width="190" height="100" viewBox="0 0 190 100">
          <path d="M 16 96 A 79 79 0 0 1 174 96" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" strokeLinecap="round"/>
          <path d="M 16 96 A 79 79 0 0 1 174 96" fill="none" stroke={color} strokeWidth="14"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dash}
            style={{ transition:'stroke-dashoffset 1s ease, stroke 0.4s' }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', paddingTop:30 }}>
          <span style={{ fontSize:34, fontWeight:800, color:'#F0ECFF', letterSpacing:'-1px', lineHeight:1 }}>
            {pct}<span style={{ fontSize:18, color:'#4A4870' }}>%</span>
          </span>
          <span style={{ fontSize:12, fontWeight:700, color, marginTop:2 }}>{label} Risk</span>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', width:'100%', padding:'0 8px', marginTop:4 }}>
        <span style={{ fontSize:10, color:'#4A4870' }}>Minimal</span>
        <span style={{ fontSize:10, color:'#4A4870' }}>Severe</span>
      </div>
    </div>
  )
}

function Bar({ label, value, color }) {
  const pct = Math.round(value * 100)
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontSize:12, color:'#8B87B8' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color }}>{pct}%</span>
      </div>
      <div style={{ height:5, borderRadius:99, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:99, background:color, width:`${pct}%`, transition:'width 0.7s ease' }}/>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { riskData, recommendations, phq9Result, gad7Result, trajectory, setActivePage } = useApp()

  if (!riskData && !phq9Result && !gad7Result) return (
    <div style={{
      height:'100%', display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:24, padding:40, textAlign:'center', background:'#13111C'
    }}>
      <div style={{
        width:76, height:76, borderRadius:22, background:'rgba(123,94,248,0.10)',
        border:'1px solid rgba(123,94,248,0.22)', display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 0 44px rgba(123,94,248,0.15)'
      }}>
        <LayoutDashboard size={32} color="#B4A0FF"/>
      </div>
      <div>
        <h3 style={{ fontSize:22, fontWeight:700, color:'#F0ECFF', margin:0 }}>Dashboard is empty</h3>
        <p style={{ fontSize:14, color:'#4A4870', marginTop:10, maxWidth:380, lineHeight:1.7 }}>
          Your wellbeing overview appears here after you chat or take an assessment.
          All signals fuse into a single risk score with EMA trajectory tracking.
        </p>
      </div>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
        <button onClick={() => setActivePage?.('chat')} className="btn-primary">
          <MessageSquare size={15}/> Start a Chat
        </button>
        <button onClick={() => setActivePage?.('assessment')} className="btn-ghost">
          <ClipboardList size={15}/> Take Assessment
        </button>
      </div>
    </div>
  )

  // Compute a local risk score from assessments when riskData isn't populated yet
  const localRiskScore = (() => {
    if (riskData) return riskData.risk_score
    const p = phq9Result ? (phq9Result.score / 27) * 0.40 : 0
    const g = gad7Result ? (gad7Result.score / 21) * 0.25 : 0
    return p + g > 0 ? Math.min(p + g + 0.05, 1) : 0
  })()
    { subject:'Depression', value: phq9Result ? Math.round((phq9Result.score / 27) * 100) : 0 },
    { subject:'Anxiety',    value: gad7Result  ? Math.round((gad7Result.score  / 21) * 100) : 0 },
    { subject:'Facial',     value: riskData    ? Math.round((riskData.components?.facial_contribution ?? 0) * 100) : 0 },
    { subject:'Mood',       value: riskData    ? Math.round((riskData.components?.text_contribution   ?? 0) * 100) : 0 },
  ]

  const trendColor = trajectory?.trend === 'improving' ? '#10D9A8' : trajectory?.trend === 'deteriorating' ? '#FF6B6B' : '#8B87B8'
  const TrendIcon  = trajectory?.trend === 'improving' ? TrendingUp : trajectory?.trend === 'deteriorating' ? TrendingDown : Minus

  const recentPoints = (trajectory?.recent ?? []).map((p, i) => ({
    x: i + 1, ema: Math.round(p.ema * 100),
  }))

  return (
    <div style={{ height:'100%', overflowY:'auto', background:'#13111C' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      `}</style>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'24px 16px', display:'flex', flexDirection:'column', gap:18 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{
            width:48, height:48, borderRadius:14, flexShrink:0,
            background:'rgba(123,94,248,0.12)', border:'1px solid rgba(123,94,248,0.22)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 16px rgba(123,94,248,0.18)'
          }}>
            <LayoutDashboard size={22} color="#B4A0FF"/>
          </div>
          <div>
            <h2 style={{ fontSize:20, fontWeight:700, color:'#F0ECFF', margin:0, letterSpacing:'-0.3px' }}>
              Wellbeing Overview
            </h2>
            <p style={{ fontSize:13, color:'#4A4870', marginTop:3 }}>
              PHQ-9 · GAD-7 · Facial emotion · Chat mood · EMA trajectory
            </p>
          </div>
        </div>

        {/* Info banner */}
        <div style={{
          display:'flex', gap:10, padding:'12px 16px', borderRadius:14,
          background:'rgba(123,94,248,0.06)', border:'1px solid rgba(123,94,248,0.15)'
        }}>
          <Info size={13} color="#B4A0FF" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:12, color:'#8B87B8', lineHeight:1.65, margin:0 }}>
            Risk score = <strong style={{ color:'#B4A0FF' }}>PHQ-9 40%</strong> + <strong style={{ color:'#B4A0FF' }}>GAD-7 25%</strong> + <strong style={{ color:'#B4A0FF' }}>Facial 20%</strong> + <strong style={{ color:'#B4A0FF' }}>Chat Mood 15%</strong>. The EMA trajectory engine tracks trends over time and adapts AI responses accordingly.
          </p>
        </div>

        {/* Gauge + Breakdown */}
        <div className="grid-1-2">
          <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <p style={{ fontSize:10, color:'#4A4870', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', alignSelf:'flex-start' }}>
              Overall Risk
            </p>
            <Gauge score={localRiskScore}/>
          </div>
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <p style={{ fontSize:10, color:'#4A4870', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px' }}>
              Component Breakdown
            </p>
            {riskData?.components ? (
              <>
                <Bar label="PHQ-9 — Depression (40%)"
                  value={riskData.components.phq9_contribution > 0
                    ? riskData.components.phq9_contribution
                    : phq9Result ? phq9Result.score / 27 : 0}
                  color="#7B5EF8"/>
                <Bar label="GAD-7 — Anxiety (25%)"
                  value={riskData.components.gad7_contribution > 0
                    ? riskData.components.gad7_contribution
                    : gad7Result ? gad7Result.score / 21 : 0}
                  color="#10D9A8"/>
                <Bar label="Facial Emotion (20%)"  value={riskData.components.facial_contribution} color="#60A5FA"/>
                <Bar label="Chat Mood (15%)"       value={riskData.components.text_contribution}   color="#FBBF24"/>
              </>
            ) : phq9Result || gad7Result ? (
              <>
                <Bar label="PHQ-9 — Depression (40%)" value={phq9Result ? phq9Result.score / 27 : 0} color="#7B5EF8"/>
                <Bar label="GAD-7 — Anxiety (25%)"    value={gad7Result ? gad7Result.score / 21 : 0} color="#10D9A8"/>
                <Bar label="Facial Emotion (20%)"      value={0} color="#60A5FA"/>
                <Bar label="Chat Mood (15%)"           value={0} color="#FBBF24"/>
              </>
            ) : (
              <p style={{ fontSize:13, color:'#4A4870' }}>Send a chat message to generate breakdown.</p>
            )}
          </div>
        </div>

        {/* Trajectory */}
        {trajectory && (
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
              <p style={{ fontSize:11, color:'#4A4870', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', margin:0, flex:1 }}>
                Mental State Trajectory (72h EMA)
              </p>
              {trajectory.trend && (
                <div style={{
                  display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99,
                  background:trendColor + '15', border:`1px solid ${trendColor}30`,
                  fontSize:11, fontWeight:700, color:trendColor
                }}>
                  <TrendIcon size={11}/>{trajectory.trend}
                </div>
              )}
              {trajectory.last_trigger === 'high_risk' && (
                <div style={{
                  display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99,
                  background:'rgba(255,107,107,0.10)', border:'1px solid rgba(255,107,107,0.25)',
                  fontSize:11, fontWeight:700, color:'#FF6B6B'
                }}>
                  <AlertTriangle size={11}/> Risk Alert
                </div>
              )}
            </div>
            {recentPoints.length > 1 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={recentPoints} margin={{ top:5, right:20, bottom:5, left:0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
                  <XAxis dataKey="x" tick={{ fill:'#4A4870', fontSize:10 }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{ fill:'#4A4870', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                  <Tooltip
                    contentStyle={{ background:'#1D1A2C', border:'1px solid rgba(123,94,248,0.2)', borderRadius:10, fontSize:12 }}
                    labelStyle={{ color:'#8B87B8' }} formatter={v=>[`${v}% risk`,'EMA State']}/>
                  <Line type="monotone" dataKey="ema" stroke="#7B5EF8" strokeWidth={2.5}
                    dot={{ fill:'#7B5EF8', r:3 }} activeDot={{ r:5 }}/>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid-3">
                {[
                  ['Current EMA',   trajectory.current_ema  != null ? `${Math.round(trajectory.current_ema * 100)}%` : '—', '#7B5EF8'],
                  ['Avg Sentiment', trajectory.avg_sentiment != null ? (trajectory.avg_sentiment > 0 ? '+' : '') + trajectory.avg_sentiment.toFixed(2) : '—', '#10D9A8'],
                  ['Data Points',   trajectory.points ?? 0, '#8B87B8'],
                ].map(([l,v,c]) => (
                  <div key={l} style={{
                    padding:'14px', borderRadius:12, textAlign:'center',
                    background:'rgba(255,255,255,0.02)', border:`1px solid ${c}18`
                  }}>
                    <p style={{ fontSize:24, fontWeight:800, color:c, margin:0 }}>{v}</p>
                    <p style={{ fontSize:11, color:'#4A4870', marginTop:5 }}>{l}</p>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize:11, color:'#4A4870', marginTop:10, textAlign:'center' }}>
              Higher % = more distress · Lower % = improvement · EMA α=0.30
            </p>
          </div>
        )}

        {/* Score chips */}
        <div className="grid-3">
          {[
            { label:'PHQ-9',    icon:Activity,    result:phq9Result, max:27,  special:null, color:'#7B5EF8' },
            { label:'GAD-7',    icon:ShieldAlert, result:gad7Result, max:21,  special:null, color:'#10D9A8' },
            { label:'EMA State',icon:Brain,       result:null,       max:null, special:trajectory, color:'#60A5FA' },
          ].map(({ label, icon:Icon, result, max, special, color }) => (
            <div key={label} className="card" style={{ textAlign:'center', padding:'20px 14px' }}>
              <div style={{
                width:32, height:32, borderRadius:10, margin:'0 auto 10px',
                background:color+'15', border:`1px solid ${color}25`,
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                <Icon size={15} color={color}/>
              </div>
              <p style={{ fontSize:10, color:'#4A4870', marginBottom:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                {label}
              </p>
              {result ? (
                <>
                  <p style={{ fontSize:28, fontWeight:800, color:'#F0ECFF', margin:0 }}>
                    {result.score}<span style={{ fontSize:14, color:'#4A4870' }}>/{max}</span>
                  </p>
                  <p style={{ fontSize:12, fontWeight:700, marginTop:6, color:result.color }}>{result.category}</p>
                </>
              ) : special ? (
                <>
                  <p style={{ fontSize:26, fontWeight:800, color:'#F0ECFF', margin:0 }}>
                    {special.current_ema != null ? `${Math.round(special.current_ema * 100)}%` : '—'}
                  </p>
                  <p style={{ fontSize:12, fontWeight:700, marginTop:6, color:trendColor, textTransform:'capitalize' }}>
                    {special.trend ?? 'no data'}
                  </p>
                </>
              ) : (
                <p style={{ fontSize:13, color:'#2E2B40', marginTop:8 }}>Not assessed</p>
              )}
            </div>
          ))}
        </div>

        {/* Radar */}
        {(phq9Result || gad7Result) && (
          <div className="card">
            <p style={{ fontSize:11, color:'#4A4870', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:16 }}>
              Wellbeing Radar
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{ top:10, right:24, bottom:10, left:24 }}>
                <PolarGrid stroke="rgba(255,255,255,0.05)"/>
                <PolarAngleAxis dataKey="subject" tick={{ fill:'#4A4870', fontSize:11 }}/>
                <Radar name="Risk" dataKey="value" stroke="#7B5EF8" fill="#7B5EF8" fillOpacity={0.15} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && (
          <div className="grid-2">
            <div className="card" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Dumbbell size={14} color="#10D9A8"/>
                <p style={{ fontSize:14, fontWeight:700, color:'#C4C0E8', margin:0 }}>Exercises</p>
              </div>
              {recommendations.exercises.map((ex, i) => (
                <div key={i} style={{ display:'flex', gap:12 }}>
                  <div style={{
                    width:22, height:22, borderRadius:7, flexShrink:0, marginTop:1,
                    background:'rgba(16,217,168,0.12)', border:'1px solid rgba(16,217,168,0.22)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:800, color:'#10D9A8'
                  }}>{i+1}</div>
                  <p style={{ fontSize:13, color:'#8B87B8', lineHeight:1.65, margin:0 }}>{ex}</p>
                </div>
              ))}
            </div>
            <div className="card" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Activity size={14} color="#FBBF24"/>
                <p style={{ fontSize:14, fontWeight:700, color:'#C4C0E8', margin:0 }}>Resources</p>
              </div>
              <p style={{ fontSize:13, color:'#8B87B8', lineHeight:1.65, padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                {recommendations.message}
              </p>
              {recommendations.resources.map((r, i) => {
                const Icon = RES_ICONS[r.type] || Phone
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:'rgba(251,191,36,0.10)', border:'1px solid rgba(251,191,36,0.22)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={13} color="#FBBF24"/>
                    </div>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color:'#C4C0E8', margin:0 }}>{r.name}</p>
                      <p style={{ fontSize:11, color:'#4A4870', margin:0 }}>{r.contact}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Crisis */}
        {riskData?.risk_level === 'HIGH' && (
          <div className="animate-scale-in" style={{
            display:'flex', gap:14, padding:'16px 18px', borderRadius:16,
            background:'rgba(255,107,107,0.06)', border:'1px solid rgba(255,107,107,0.25)'
          }}>
            <AlertTriangle size={18} color="#FF6B6B" style={{ flexShrink:0, marginTop:1 }}/>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'#FCA5A5', marginBottom:6 }}>High Risk Detected</p>
              <p style={{ fontSize:13, color:'#FCA5A5', opacity:0.85, lineHeight:1.65 }}>
                Your scores indicate significant distress. Please reach out today.<br/>
                <strong style={{ color:'#FF6B6B' }}>iCall: 9152987821</strong> &nbsp;·&nbsp;
                <strong style={{ color:'#FF6B6B' }}>Vandrevala: 1860-2662-345</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}