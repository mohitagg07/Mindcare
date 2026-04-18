import { useApp } from '../context/AppContext'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { LayoutDashboard, Activity, ShieldAlert, Brain, Dumbbell, Phone, Smartphone, Globe, AlertTriangle, Info, MessageSquare, ClipboardList, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const RES_ICONS = { phone:Phone, app:Smartphone, text:Globe }

function Gauge({ score }) {
  const pct   = Math.round(score * 100)
  const color = score >= 0.75 ? '#C0424A' : score >= 0.5 ? '#C07436' : score >= 0.25 ? '#3B6EA8' : '#2A7D6F'
  const label = score >= 0.75 ? 'High' : score >= 0.5 ? 'Moderate' : score >= 0.25 ? 'Low' : 'Minimal'
  const r = 68, circ = Math.PI * r, dash = circ - (pct / 100) * circ
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ position:'relative', width:190, height:100 }}>
        <svg width="190" height="100" viewBox="0 0 190 100">
          <path d="M 16 96 A 79 79 0 0 1 174 96" fill="none" stroke="var(--border)" strokeWidth="12" strokeLinecap="round"/>
          <path d="M 16 96 A 79 79 0 0 1 174 96" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dash} style={{ transition:'stroke-dashoffset 1s ease, stroke 0.4s' }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', paddingTop:28 }}>
          <span style={{ fontSize:32, fontWeight:700, color:'var(--text-1)', letterSpacing:'-1px', lineHeight:1, fontFamily:'Lora,serif' }}>
            {pct}<span style={{ fontSize:16, color:'var(--text-4)' }}>%</span>
          </span>
          <span style={{ fontSize:12, fontWeight:700, color, marginTop:2 }}>{label} Risk</span>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', width:'100%', padding:'0 8px', marginTop:4 }}>
        <span style={{ fontSize:10, color:'var(--text-4)' }}>Minimal</span>
        <span style={{ fontSize:10, color:'var(--text-4)' }}>Severe</span>
      </div>
    </div>
  )
}

function Bar({ label, value, color }) {
  const pct = Math.round(value * 100)
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontSize:12, color:'var(--text-3)' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color }}>{pct}%</span>
      </div>
      <div style={{ height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:99, background:color, width:`${pct}%`, transition:'width 0.7s ease' }}/>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { riskData, recommendations, phq9Result, gad7Result, trajectory, setActivePage } = useApp()

  if (!riskData && !phq9Result && !gad7Result) return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:22, padding:40, textAlign:'center', background:'var(--bg-page)' }}>
      <div style={{ width:68, height:68, borderRadius:20, background:'var(--teal-dim)', border:'1px solid var(--teal-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <LayoutDashboard size={28} color="var(--teal)"/>
      </div>
      <div>
        <h3 style={{ fontSize:20, fontWeight:700, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif' }}>Dashboard is empty</h3>
        <p style={{ fontSize:13, color:'var(--text-3)', marginTop:10, maxWidth:360, lineHeight:1.7 }}>
          Your wellbeing overview appears here after you chat or take an assessment.
        </p>
      </div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
        <button onClick={() => setActivePage?.('chat')} className="btn-primary"><MessageSquare size={14}/> Start a Chat</button>
        <button onClick={() => setActivePage?.('assessment')} className="btn-ghost"><ClipboardList size={14}/> Take Assessment</button>
      </div>
    </div>
  )

  const localRiskScore = (() => {
    if (riskData) return riskData.risk_score
    const p = phq9Result ? (phq9Result.score / 27) * 0.40 : 0
    const g = gad7Result ? (gad7Result.score / 21) * 0.25 : 0
    return p + g > 0 ? Math.min(p + g + 0.05, 1) : 0
  })()

  const radarData = [
    { subject:'Depression', value:phq9Result ? Math.round((phq9Result.score / 27) * 100) : 0 },
    { subject:'Anxiety',    value:gad7Result  ? Math.round((gad7Result.score  / 21) * 100) : 0 },
    { subject:'Facial',     value:riskData    ? Math.round((riskData.components?.facial_contribution ?? 0) * 100) : 0 },
    { subject:'Mood',       value:riskData    ? Math.round((riskData.components?.text_contribution   ?? 0) * 100) : 0 },
  ]

  const trendColor = trajectory?.trend === 'improving' ? '#2A7D6F' : trajectory?.trend === 'deteriorating' ? '#C0424A' : 'var(--text-3)'
  const TrendIcon  = trajectory?.trend === 'improving' ? TrendingUp : trajectory?.trend === 'deteriorating' ? TrendingDown : Minus
  const recentPoints = (trajectory?.recent ?? []).map((p, i) => ({ x:i+1, ema:Math.round(p.ema * 100) }))

  return (
    <div style={{ height:'100%', overflowY:'auto', background:'var(--bg-page)' }}>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'24px 16px', display:'flex', flexDirection:'column', gap:16 }}>

        <div style={{ display:'flex', alignItems:'center', gap:13 }}>
          <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:'var(--teal-dim)', border:'1px solid var(--teal-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <LayoutDashboard size={20} color="var(--teal)"/>
          </div>
          <div>
            <h2 style={{ fontSize:19, fontWeight:700, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif' }}>Wellbeing Overview</h2>
            <p style={{ fontSize:12, color:'var(--text-4)', marginTop:3 }}>PHQ-9 · GAD-7 · Facial emotion · Chat mood · EMA trajectory</p>
          </div>
        </div>

        <div style={{ display:'flex', gap:9, padding:'11px 15px', borderRadius:12, background:'#fff', border:'1px solid var(--border)' }}>
          <Info size={12} color="var(--teal)" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.65, margin:0 }}>
            Risk score = <strong style={{ color:'var(--teal)' }}>PHQ-9 40%</strong> + <strong style={{ color:'var(--blue)' }}>GAD-7 25%</strong> + <strong style={{ color:'var(--amber)' }}>Facial 20%</strong> + <strong style={{ color:'var(--text-2)' }}>Chat Mood 15%</strong>. EMA trajectory tracks trends over time.
          </p>
        </div>

        <div className="grid-1-2">
          <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <p style={{ fontSize:10, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', alignSelf:'flex-start' }}>Overall Risk</p>
            <Gauge score={localRiskScore}/>
          </div>
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <p style={{ fontSize:10, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px' }}>Component Breakdown</p>
            {riskData?.components ? (
              <>
                <Bar label="PHQ-9 — Depression (40%)"
                  value={riskData.components.phq9_contribution > 0 ? riskData.components.phq9_contribution : phq9Result ? phq9Result.score/27 : 0}
                  color="#2A7D6F"/>
                <Bar label="GAD-7 — Anxiety (25%)"
                  value={riskData.components.gad7_contribution > 0 ? riskData.components.gad7_contribution : gad7Result ? gad7Result.score/21 : 0}
                  color="#3B6EA8"/>
                <Bar label="Facial Emotion (20%)" value={riskData.components.facial_contribution} color="#C07436"/>
                <Bar label="Chat Mood (15%)"      value={riskData.components.text_contribution}   color="#6B7280"/>
              </>
            ) : phq9Result || gad7Result ? (
              <>
                <Bar label="PHQ-9 — Depression (40%)" value={phq9Result ? phq9Result.score/27 : 0} color="#2A7D6F"/>
                <Bar label="GAD-7 — Anxiety (25%)"    value={gad7Result ? gad7Result.score/21 : 0} color="#3B6EA8"/>
                <Bar label="Facial Emotion (20%)" value={0} color="#C07436"/>
                <Bar label="Chat Mood (15%)"      value={0} color="#6B7280"/>
              </>
            ) : (
              <p style={{ fontSize:13, color:'var(--text-4)' }}>Send a chat message to generate breakdown.</p>
            )}
          </div>
        </div>

        {trajectory && (
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:14, flexWrap:'wrap' }}>
              <p style={{ fontSize:11, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', margin:0, flex:1 }}>Mental State Trajectory (72h EMA)</p>
              {trajectory.trend && (
                <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99, background:trendColor+'14', border:`1px solid ${trendColor}30`, fontSize:11, fontWeight:700, color:trendColor }}>
                  <TrendIcon size={10}/>{trajectory.trend}
                </div>
              )}
            </div>
            {recentPoints.length > 1 ? (
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={recentPoints} margin={{ top:5, right:20, bottom:5, left:0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="x" tick={{ fill:'var(--text-4)', fontSize:10 }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{ fill:'var(--text-4)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                  <Tooltip contentStyle={{ background:'#fff', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }} labelStyle={{ color:'var(--text-3)' }} formatter={v=>[`${v}% risk`,'EMA']}/>
                  <Line type="monotone" dataKey="ema" stroke="var(--teal)" strokeWidth={2} dot={{ fill:'var(--teal)', r:3 }} activeDot={{ r:5 }}/>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid-3">
                {[['Current EMA', trajectory.current_ema!=null ? `${Math.round(trajectory.current_ema*100)}%`:'—','var(--teal)'], ['Avg Sentiment', trajectory.avg_sentiment!=null?(trajectory.avg_sentiment>0?'+':'')+trajectory.avg_sentiment.toFixed(2):'—','var(--blue)'], ['Data Points', trajectory.points??0,'var(--text-3)']].map(([l,v,c]) => (
                  <div key={l} style={{ padding:'14px', borderRadius:12, textAlign:'center', background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                    <p style={{ fontSize:22, fontWeight:700, color:c, margin:0, fontFamily:'Lora,serif' }}>{v}</p>
                    <p style={{ fontSize:11, color:'var(--text-4)', marginTop:5 }}>{l}</p>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize:11, color:'var(--text-4)', marginTop:10, textAlign:'center' }}>Higher % = more distress · Lower % = improvement · EMA α=0.30</p>
          </div>
        )}

        <div className="grid-3">
          {[
            { label:'PHQ-9',    icon:Activity,    result:phq9Result, max:27,  special:null, color:'var(--teal)' },
            { label:'GAD-7',    icon:ShieldAlert, result:gad7Result, max:21,  special:null, color:'var(--blue)' },
            { label:'EMA State',icon:Brain,       result:null,       max:null, special:trajectory, color:'var(--amber)' },
          ].map(({ label, icon:Icon, result, max, special, color }) => (
            <div key={label} className="card" style={{ textAlign:'center', padding:'18px 12px' }}>
              <div style={{ width:30, height:30, borderRadius:9, margin:'0 auto 10px', background:color+'14', border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={14} color={color}/>
              </div>
              <p style={{ fontSize:10, color:'var(--text-4)', marginBottom:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</p>
              {result ? (
                <>
                  <p style={{ fontSize:26, fontWeight:700, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif' }}>{result.score}<span style={{ fontSize:13, color:'var(--text-4)' }}>/{max}</span></p>
                  <p style={{ fontSize:12, fontWeight:700, marginTop:5, color:result.color }}>{result.category}</p>
                </>
              ) : special ? (
                <>
                  <p style={{ fontSize:24, fontWeight:700, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif' }}>{special.current_ema!=null?`${Math.round(special.current_ema*100)}%`:'—'}</p>
                  <p style={{ fontSize:12, fontWeight:700, marginTop:5, color:trendColor, textTransform:'capitalize' }}>{special.trend??'no data'}</p>
                </>
              ) : (
                <p style={{ fontSize:12, color:'var(--text-4)', marginTop:6 }}>Not assessed</p>
              )}
            </div>
          ))}
        </div>

        {(phq9Result || gad7Result) && (
          <div className="card">
            <p style={{ fontSize:11, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:14 }}>Wellbeing Radar</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{ top:10, right:24, bottom:10, left:24 }}>
                <PolarGrid stroke="var(--border)"/>
                <PolarAngleAxis dataKey="subject" tick={{ fill:'var(--text-3)', fontSize:11 }}/>
                <Radar name="Risk" dataKey="value" stroke="var(--teal)" fill="var(--teal)" fillOpacity={0.12} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {recommendations && (
          <div className="grid-2">
            <div className="card" style={{ display:'flex', flexDirection:'column', gap:13 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Dumbbell size={14} color="var(--teal)"/>
                <p style={{ fontSize:14, fontWeight:600, color:'var(--text-1)', margin:0 }}>Exercises</p>
              </div>
              {recommendations.exercises.map((ex, i) => (
                <div key={i} style={{ display:'flex', gap:10 }}>
                  <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, marginTop:1, background:'var(--teal-dim)', border:'1px solid var(--teal-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'var(--teal)' }}>{i+1}</div>
                  <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.65, margin:0 }}>{ex}</p>
                </div>
              ))}
            </div>
            <div className="card" style={{ display:'flex', flexDirection:'column', gap:13 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Activity size={14} color="var(--amber)"/>
                <p style={{ fontSize:14, fontWeight:600, color:'var(--text-1)', margin:0 }}>Resources</p>
              </div>
              <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.65, padding:'10px 13px', borderRadius:9, background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>{recommendations.message}</p>
              {recommendations.resources.map((r, i) => {
                const Icon = RES_ICONS[r.type] || Phone
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                    <div style={{ width:30, height:30, borderRadius:9, background:'var(--amber-dim)', border:'1px solid rgba(192,116,54,0.22)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={13} color="var(--amber)"/>
                    </div>
                    <div>
                      <p style={{ fontSize:12, fontWeight:600, color:'var(--text-1)', margin:0 }}>{r.name}</p>
                      <p style={{ fontSize:11, color:'var(--text-4)', margin:0 }}>{r.contact}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {riskData?.risk_level === 'HIGH' && (
          <div style={{ display:'flex', gap:13, padding:'14px 16px', borderRadius:14, background:'var(--rose-dim)', border:'1px solid rgba(192,66,74,0.20)' }}>
            <AlertTriangle size={17} color="var(--rose)" style={{ flexShrink:0, marginTop:1 }}/>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--rose)', marginBottom:5 }}>High Risk Detected</p>
              <p style={{ fontSize:13, color:'#7A2832', lineHeight:1.65 }}>
                Your scores indicate significant distress. Please reach out today.<br/>
                <strong style={{ color:'var(--rose)' }}>iCall: 9152987821</strong> &nbsp;·&nbsp;
                <strong style={{ color:'var(--rose)' }}>Vandrevala: 1860-2662-345</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}