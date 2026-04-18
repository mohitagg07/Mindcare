import { useState, useEffect } from 'react'
import { ClipboardList, CheckCircle, RotateCcw, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react'
import { getQuestions, submitPHQ9, submitGAD7 } from '../api/client'
import { useApp } from '../context/AppContext'

const OPTIONS = [
  { value:0, label:'Not at all' },
  { value:1, label:'Several days' },
  { value:2, label:'More than half the days' },
  { value:3, label:'Nearly every day' },
]

function ScoreResult({ result, title, onReset }) {
  const pct = Math.round((result.score / result.max_score) * 100)
  const r = 54, circ = 2 * Math.PI * r, dash = circ * (1 - pct / 100)

  const levels = result.max_score === 27
    ? [{ label:'Minimal', range:'0–4', color:'#2A7D6F' }, { label:'Mild', range:'5–9', color:'#3B6EA8' }, { label:'Moderate', range:'10–14', color:'#C07436' }, { label:'Mod. Severe', range:'15–19', color:'#C05A2A' }, { label:'Severe', range:'20–27', color:'#C0424A' }]
    : [{ label:'Minimal', range:'0–4', color:'#2A7D6F' }, { label:'Mild', range:'5–9', color:'#3B6EA8' }, { label:'Moderate', range:'10–14', color:'#C07436' }, { label:'Severe', range:'15–21', color:'#C0424A' }]

  return (
    <div className="animate-scale-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:22, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flexShrink:0, margin:'0 auto' }}>
          <svg width={130} height={130} viewBox="0 0 130 130">
            <circle cx={65} cy={65} r={r} fill="none" stroke="var(--border)" strokeWidth={9}/>
            <circle cx={65} cy={65} r={r} fill="none" stroke={result.color} strokeWidth={9}
              strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
              style={{ transform:'rotate(-90deg)', transformOrigin:'65px 65px', transition:'stroke-dashoffset 1s ease' }}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:32, fontWeight:700, color:'var(--text-1)', lineHeight:1, fontFamily:'Lora,serif' }}>{result.score}</span>
            <span style={{ fontSize:12, color:'var(--text-4)', fontWeight:500 }}>/ {result.max_score}</span>
          </div>
        </div>
        <div style={{ flex:1, minWidth:180 }}>
          <p style={{ fontSize:10, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>{title} Result</p>
          <div style={{ display:'inline-flex', alignItems:'center', padding:'6px 14px', borderRadius:99, marginBottom:10, background:result.color+'14', border:`1.5px solid ${result.color}30`, color:result.color, fontSize:14, fontWeight:700 }}>
            {result.category}
          </div>
          <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.6 }}>{result.description}</p>
        </div>
      </div>

      <div>
        <p style={{ fontSize:10, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:10 }}>Severity Scale</p>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {levels.map(lvl => {
            const isActive = result.category?.toLowerCase().includes(lvl.label.toLowerCase().split(' ')[0])
            return (
              <div key={lvl.label} style={{ flex:1, minWidth:56, display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'9px 5px', borderRadius:10, background:isActive ? lvl.color+'10' : 'var(--bg-elevated)', border:`1px solid ${isActive ? lvl.color+'35' : 'var(--border)'}`, opacity:isActive?1:0.5, transition:'all 0.2s' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:lvl.color }}/>
                <span style={{ fontSize:10, fontWeight:700, color:isActive?lvl.color:'var(--text-3)', textAlign:'center' }}>{lvl.label}</span>
                <span style={{ fontSize:9, color:'var(--text-4)' }}>{lvl.range}</span>
              </div>
            )
          })}
        </div>
      </div>

      {result.crisis_flag && (
        <div style={{ display:'flex', gap:12, padding:'13px 15px', borderRadius:12, background:'var(--rose-dim)', border:'1px solid rgba(192,66,74,0.20)' }}>
          <AlertTriangle size={15} color="var(--rose)" style={{ flexShrink:0, marginTop:1 }}/>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--rose)', marginBottom:4 }}>Immediate Support Available</p>
            <p style={{ fontSize:12, color:'#7A2832', lineHeight:1.6 }}>You are not alone. <strong>iCall: 9152987821</strong> · <strong>Vandrevala: 1860-2662-345</strong></p>
          </div>
        </div>
      )}

      <button onClick={onReset} className="btn-ghost" style={{ alignSelf:'flex-start' }}>
        <RotateCcw size={12}/> Retake Assessment
      </button>
    </div>
  )
}

function AssessmentForm({ title, questions, onSubmit, result, color, onReset }) {
  const [answers, setAnswers] = useState(Array(questions.length).fill(null))
  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(!!result)

  useEffect(() => { if (result) setDone(true) }, [result])

  const answered = answers.filter(a => a !== null).length
  const allDone  = answered === questions.length && questions.length > 0

  const handleSelect = (val) => {
    const next = [...answers]; next[step] = val; setAnswers(next)
    if (step < questions.length - 1) setTimeout(() => setStep(s => s + 1), 200)
  }
  const handleSubmit = async () => {
    setLoading(true)
    try { await onSubmit(answers); setDone(true) } catch (e) { console.error(e) }
    setLoading(false)
  }
  const handleReset = () => {
    setAnswers(Array(questions.length).fill(null)); setStep(0); setDone(false)
    if (onReset) onReset()
  }

  if (done && result) return <ScoreResult result={result} title={title} onReset={handleReset}/>
  if (!questions.length) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, height:140, color:'var(--text-4)', fontSize:14 }}>
      <div style={{ width:15, height:15, border:'2px solid var(--border)', borderTopColor:'var(--teal)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      Loading questions…
    </div>
  )

  const pct = questions.length ? (answered / questions.length) * 100 : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {questions.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} style={{ width:26, height:26, borderRadius:7, fontSize:10, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit', transition:'all 0.15s', border:`1.5px solid ${i === step ? color : answers[i] !== null ? color+'50' : 'var(--border)'}`, background:answers[i] !== null ? color+'14' : i === step ? 'var(--bg-elevated)' : 'transparent', color:answers[i] !== null ? color : i === step ? 'var(--text-2)' : 'var(--text-4)' }}>
                {answers[i] !== null ? '✓' : i + 1}
              </button>
            ))}
          </div>
          <span style={{ fontSize:12, color:'var(--text-4)' }}>{answered}/{questions.length} answered</span>
        </div>
        <div style={{ height:3, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:99, background:color, width:`${pct}%`, transition:'width 0.6s ease' }}/>
        </div>
      </div>

      <div key={step} className="animate-fade-in" style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 16px' }}>
        <p style={{ fontSize:10, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:7 }}>Question {step + 1} of {questions.length}</p>
        <p style={{ fontSize:12, color:'var(--text-4)', marginBottom:9, lineHeight:1.5 }}>Over the past 2 weeks, how often have you been bothered by…</p>
        <p style={{ fontSize:16, fontWeight:600, color:'var(--text-1)', lineHeight:1.55, marginBottom:18, fontFamily:'Lora,serif' }}>{questions[step]}</p>

        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {OPTIONS.map(opt => {
            const sel = answers[step] === opt.value
            return (
              <button key={opt.value} onClick={() => handleSelect(opt.value)} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all 0.14s', border:`1.5px solid ${sel ? color : 'var(--border)'}`, background:sel ? color+'10' : '#fff', boxShadow:sel ? `0 0 0 1px ${color}22` : 'none' }}>
                <div style={{ width:17, height:17, borderRadius:'50%', flexShrink:0, transition:'all 0.14s', border:`2px solid ${sel ? color : 'var(--border-md)'}`, background:sel ? color : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {sel && <div style={{ width:5, height:5, borderRadius:'50%', background:'#fff' }}/>}
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:sel ? 'var(--text-1)' : 'var(--text-3)' }}>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost" style={{ fontSize:13 }}>
          <ChevronLeft size={14}/> Previous
        </button>
        {step < questions.length - 1 ? (
          <button onClick={() => setStep(s => Math.min(questions.length - 1, s + 1))} className="btn-ghost" style={{ fontSize:13 }}>
            Next <ChevronRight size={14}/>
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!allDone || loading} style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, border:'none', fontFamily:'inherit', transition:'all 0.18s', background:allDone ? color : 'var(--bg-elevated)', color:allDone ? '#fff' : 'var(--text-4)', fontSize:13, fontWeight:600, cursor:allDone&&!loading?'pointer':'not-allowed', opacity:allDone&&!loading?1:0.55, boxShadow:allDone?`0 2px 12px ${color}35`:'none' }}>
            {loading ? <><div style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Scoring…</> : <><CheckCircle size={14}/> View Results</>}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Assessment() {
  const { setPhq9Result, setGad7Result, phq9Result, gad7Result } = useApp()
  const [tab, setTab]    = useState('phq9')
  const [qs,  setQs]     = useState({ phq9:[], gad7:[] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getQuestions().then(({ data }) => setQs({ phq9:data.phq9, gad7:data.gad7 })).catch(console.error).finally(() => setLoading(false))
  }, [])

  const TABS = [
    { id:'phq9', label:'PHQ-9', sub:'Depression', color:'#2A7D6F', qs:9, max:27, questions:qs.phq9, result:phq9Result, submit:async a => { const { data } = await submitPHQ9(a); setPhq9Result(data) }, reset:() => setPhq9Result(null), desc:'9 questions · Score 0–27 · Screens for Major Depressive Disorder' },
    { id:'gad7', label:'GAD-7', sub:'Anxiety',    color:'#3B6EA8', qs:7, max:21, questions:qs.gad7, result:gad7Result, submit:async a => { const { data } = await submitGAD7(a); setGad7Result(data) }, reset:() => setGad7Result(null), desc:'7 questions · Score 0–21 · Screens for Generalized Anxiety Disorder' },
  ]
  const active = TABS.find(t => t.id === tab)

  return (
    <div style={{ height:'100%', overflowY:'auto', background:'var(--bg-page)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth:660, margin:'0 auto', padding:'24px 16px' }}>

        <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:'var(--teal-dim)', border:'1px solid var(--teal-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ClipboardList size={20} color="var(--teal)"/>
          </div>
          <div>
            <h2 style={{ fontSize:19, fontWeight:700, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif' }}>Clinical Assessment</h2>
            <p style={{ fontSize:12, color:'var(--text-4)', marginTop:3 }}>Validated global screening tools · Results inform your AI session</p>
          </div>
        </div>

        <div style={{ display:'flex', gap:6, padding:4, borderRadius:13, marginBottom:16, background:'var(--bg-card)', border:'1px solid var(--border)', boxShadow:'0 1px 4px rgba(26,35,50,0.05)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:'11px 14px', borderRadius:10, cursor:'pointer', fontFamily:'inherit', transition:'all 0.18s', border:`1px solid ${tab === t.id ? t.color+'30' : 'transparent'}`, background:tab === t.id ? t.color+'10' : 'transparent', color:tab === t.id ? t.color : 'var(--text-4)', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              <span style={{ fontSize:14, fontWeight:700 }}>{t.label}</span>
              <span style={{ fontSize:11, opacity:0.7 }}>{t.sub} · {t.qs}q</span>
              {t.result && <CheckCircle size={11}/>}
            </button>
          ))}
        </div>

        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px 18px', boxShadow:'0 2px 12px rgba(26,35,50,0.06)' }}>
          <div style={{ marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
            <div>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif' }}>{tab === 'phq9' ? 'Patient Health Questionnaire-9' : 'Generalized Anxiety Disorder-7'}</h3>
              <p style={{ fontSize:12, color:'var(--text-4)', marginTop:4 }}>{active.desc}</p>
            </div>
            {active.result && <span style={{ fontSize:12, fontWeight:700, padding:'4px 11px', borderRadius:99, flexShrink:0, background:active.color+'10', color:active.color, border:`1px solid ${active.color}30` }}>Score: {active.result.score}</span>}
          </div>

          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, height:140, color:'var(--text-4)', fontSize:14 }}>
              <div style={{ width:15, height:15, border:'2px solid var(--border)', borderTopColor:'var(--teal)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              Loading questions…
            </div>
          ) : (
            <AssessmentForm key={tab} title={active.label} questions={active.questions} onSubmit={active.submit} result={active.result} color={active.color} onReset={active.reset}/>
          )}
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'var(--text-4)', marginTop:14, lineHeight:1.6 }}>
          Screening purposes only · Not a clinical diagnosis · Consult a mental health professional
        </p>
      </div>
    </div>
  )
}