import { useState, useEffect } from 'react'
import { ClipboardList, CheckCircle, RotateCcw, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react'
import { getQuestions, submitPHQ9, submitGAD7 } from '../api/client'
import { useApp } from '../context/AppContext'

const OPTIONS = [
  { value:0, label:'Not at all'             },
  { value:1, label:'Several days'            },
  { value:2, label:'More than half the days' },
  { value:3, label:'Nearly every day'        },
]

/* ── Score Result Screen ── */
function ScoreResult({ result, title, onReset }) {
  const pct  = Math.round((result.score / result.max_score) * 100)
  const r    = 58, circ = 2 * Math.PI * r, dash = circ * (1 - pct / 100)

  const levels = result.max_score === 27
    ? [{ label:'Minimal',    range:'0–4',   color:'#10D9A8' },
       { label:'Mild',       range:'5–9',   color:'#60A5FA' },
       { label:'Moderate',   range:'10–14', color:'#FBBF24' },
       { label:'Mod. Severe',range:'15–19', color:'#F97316' },
       { label:'Severe',     range:'20–27', color:'#FF6B6B' }]
    : [{ label:'Minimal',  range:'0–4',  color:'#10D9A8' },
       { label:'Mild',     range:'5–9',  color:'#60A5FA' },
       { label:'Moderate', range:'10–14',color:'#FBBF24' },
       { label:'Severe',   range:'15–21',color:'#FF6B6B' }]

  return (
    <div className="animate-scale-in" style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
        {/* Ring */}
        <div style={{ position:'relative', flexShrink:0, margin:'0 auto' }}>
          <svg width={140} height={140} viewBox="0 0 140 140">
            <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10}/>
            <circle cx={70} cy={70} r={r} fill="none" stroke={result.color} strokeWidth={10}
              strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
              style={{ transform:'rotate(-90deg)', transformOrigin:'70px 70px', transition:'stroke-dashoffset 1s ease' }}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:36, fontWeight:800, color:'#F0ECFF', lineHeight:1, letterSpacing:'-1px' }}>
              {result.score}
            </span>
            <span style={{ fontSize:13, color:'#4A4870', fontWeight:500 }}>/ {result.max_score}</span>
          </div>
        </div>

        <div style={{ flex:1, minWidth:200 }}>
          <p style={{ fontSize:10, color:'#4A4870', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>
            {title} Result
          </p>
          <div style={{
            display:'inline-flex', alignItems:'center', padding:'7px 16px',
            borderRadius:99, marginBottom:10,
            background: result.color + '18',
            border:`1.5px solid ${result.color}40`,
            color: result.color, fontSize:15, fontWeight:700
          }}>
            {result.category}
          </div>
          <p style={{ fontSize:13, color:'#8B87B8', lineHeight:1.6 }}>{result.description}</p>
        </div>
      </div>

      {/* Severity scale */}
      <div>
        <p style={{ fontSize:10, color:'#4A4870', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:10 }}>
          Severity Scale
        </p>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {levels.map(lvl => {
            const isActive = result.category?.toLowerCase().includes(lvl.label.toLowerCase().split(' ')[0])
            return (
              <div key={lvl.label} style={{
                flex:1, minWidth:60,
                display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                padding:'10px 6px', borderRadius:10, transition:'all 0.3s',
                background: isActive ? lvl.color + '12' : 'rgba(255,255,255,0.02)',
                border:`1px solid ${isActive ? lvl.color + '40' : 'rgba(255,255,255,0.05)'}`,
                opacity: isActive ? 1 : 0.4
              }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:lvl.color }}/>
                <span style={{ fontSize:10, fontWeight:700, color:isActive ? lvl.color : '#8B87B8', textAlign:'center' }}>
                  {lvl.label}
                </span>
                <span style={{ fontSize:9, color:'#4A4870' }}>{lvl.range}</span>
              </div>
            )
          })}
        </div>
      </div>

      {result.crisis_flag && (
        <div style={{
          display:'flex', gap:12, padding:'14px 16px', borderRadius:14,
          background:'rgba(255,107,107,0.08)', border:'1px solid rgba(255,107,107,0.25)'
        }}>
          <AlertTriangle size={16} color="#FF6B6B" style={{ flexShrink:0, marginTop:1 }}/>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#FCA5A5', marginBottom:5 }}>
              Immediate Support Available
            </p>
            <p style={{ fontSize:12, color:'#FCA5A5', lineHeight:1.6, opacity:0.9 }}>
              Your answer suggests thoughts of self-harm. You are not alone — please reach out now.<br/>
              <strong style={{ color:'#FF6B6B' }}>iCall: 9152987821</strong>&nbsp;|&nbsp;
              <strong style={{ color:'#FF6B6B' }}>Vandrevala Foundation: 1860-2662-345</strong>
            </p>
          </div>
        </div>
      )}

      <button onClick={onReset} className="btn-ghost" style={{ alignSelf:'flex-start' }}>
        <RotateCcw size={13}/> Retake Assessment
      </button>
    </div>
  )
}

/* ── Question Form ── */
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
    if (step < questions.length - 1) setTimeout(() => setStep(s => s + 1), 220)
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, height:160, color:'#4A4870', fontSize:14 }}>
      <div style={{ width:16, height:16, border:'2px solid rgba(123,94,248,0.3)', borderTopColor:'#7B5EF8', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      Loading questions…
    </div>
  )

  const pct = questions.length ? (answered / questions.length) * 100 : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Progress dots */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {questions.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} style={{
                width:28, height:28, borderRadius:8, fontSize:11, fontWeight:700,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'inherit', transition:'all 0.18s',
                border:`1.5px solid ${i === step ? color : answers[i] !== null ? color + '60' : 'rgba(255,255,255,0.08)'}`,
                background: answers[i] !== null ? color + '22' : i === step ? 'rgba(255,255,255,0.05)' : 'transparent',
                color: answers[i] !== null ? color : i === step ? '#C4C0E8' : '#4A4870'
              }}>
                {answers[i] !== null ? '✓' : i + 1}
              </button>
            ))}
          </div>
          <span style={{ fontSize:12, color:'#4A4870' }}>{answered}/{questions.length} answered</span>
        </div>
        <div style={{ height:4, borderRadius:99, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:99, background:color, width:`${pct}%`, transition:'width 0.7s ease' }}/>
        </div>
      </div>

      {/* Question card */}
      <div
        key={step}
        className="animate-fade-in"
        style={{
          background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:16, padding:'20px 18px'
        }}
      >
        <p style={{ fontSize:10, color:'#4A4870', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>
          Question {step + 1} of {questions.length}
        </p>
        <p style={{ fontSize:12, color:'#4A4870', marginBottom:10, lineHeight:1.5 }}>
          Over the past 2 weeks, how often have you been bothered by…
        </p>
        <p style={{ fontSize:17, fontWeight:600, color:'#F0ECFF', lineHeight:1.55, marginBottom:20 }}>
          {questions[step]}
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {OPTIONS.map(opt => {
            const sel = answers[step] === opt.value
            return (
              <button key={opt.value} onClick={() => handleSelect(opt.value)} style={{
                display:'flex', alignItems:'center', gap:14, padding:'13px 16px',
                borderRadius:12, cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                transition:'all 0.16s',
                border:`1.5px solid ${sel ? color : 'rgba(255,255,255,0.07)'}`,
                background: sel ? color + '15' : 'rgba(255,255,255,0.02)',
                boxShadow: sel ? `0 0 0 1px ${color}28` : 'none'
              }}>
                <div style={{
                  width:19, height:19, borderRadius:'50%', flexShrink:0, transition:'all 0.16s',
                  border:`2px solid ${sel ? color : 'rgba(255,255,255,0.2)'}`,
                  background: sel ? color : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center'
                }}>
                  {sel && <div style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }}/>}
                </div>
                <span style={{ fontSize:14, fontWeight:500, color: sel ? '#F0ECFF' : '#8B87B8' }}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="btn-ghost"
          style={{ fontSize:13 }}
        >
          <ChevronLeft size={15}/> Previous
        </button>
        {step < questions.length - 1 ? (
          <button
            onClick={() => setStep(s => Math.min(questions.length - 1, s + 1))}
            className="btn-ghost"
            style={{ fontSize:13 }}
          >
            Next <ChevronRight size={15}/>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allDone || loading}
            style={{
              display:'flex', alignItems:'center', gap:8, padding:'11px 22px',
              borderRadius:12, border:'none', fontFamily:'inherit', transition:'all 0.2s',
              background: allDone ? color : 'rgba(255,255,255,0.06)',
              color: allDone ? '#fff' : '#4A4870', fontSize:14, fontWeight:700,
              cursor: allDone && !loading ? 'pointer' : 'not-allowed',
              opacity: allDone && !loading ? 1 : 0.5,
              boxShadow: allDone ? `0 4px 18px ${color}40` : 'none'
            }}
          >
            {loading
              ? <><div style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.35)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Scoring…</>
              : <><CheckCircle size={15}/> View Results</>}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function Assessment() {
  const { setPhq9Result, setGad7Result, phq9Result, gad7Result } = useApp()
  const [tab, setTab]    = useState('phq9')
  const [qs,  setQs]     = useState({ phq9:[], gad7:[] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getQuestions()
      .then(({ data }) => setQs({ phq9:data.phq9, gad7:data.gad7 }))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const TABS = [
    {
      id:'phq9', label:'PHQ-9', sub:'Depression', color:'#7B5EF8', qs:9, max:27,
      questions:qs.phq9, result:phq9Result,
      submit: async a => { const { data } = await submitPHQ9(a); setPhq9Result(data) },
      reset: () => setPhq9Result(null),
      desc:'9 questions · Score 0–27 · Screens for Major Depressive Disorder'
    },
    {
      id:'gad7', label:'GAD-7', sub:'Anxiety', color:'#10D9A8', qs:7, max:21,
      questions:qs.gad7, result:gad7Result,
      submit: async a => { const { data } = await submitGAD7(a); setGad7Result(data) },
      reset: () => setGad7Result(null),
      desc:'7 questions · Score 0–21 · Screens for Generalized Anxiety Disorder'
    },
  ]
  const active = TABS.find(t => t.id === tab)

  return (
    <div style={{ height:'100%', overflowY:'auto', background:'#13111C' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth:660, margin:'0 auto', padding:'24px 16px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
          <div style={{
            width:48, height:48, borderRadius:14, flexShrink:0,
            background:'rgba(123,94,248,0.12)', border:'1px solid rgba(123,94,248,0.22)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 16px rgba(123,94,248,0.18)'
          }}>
            <ClipboardList size={22} color="#B4A0FF"/>
          </div>
          <div>
            <h2 style={{ fontSize:20, fontWeight:700, color:'#F0ECFF', margin:0, letterSpacing:'-0.3px' }}>
              Clinical Assessment
            </h2>
            <p style={{ fontSize:13, color:'#4A4870', marginTop:3 }}>
              Validated global screening tools · Results inform your AI session
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display:'flex', gap:8, padding:5, borderRadius:16, marginBottom:18,
          background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)'
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:'12px 16px', borderRadius:12, cursor:'pointer',
              fontFamily:'inherit', transition:'all 0.2s',
              border:`1.5px solid ${tab === t.id ? t.color + '40' : 'transparent'}`,
              background: tab === t.id ? t.color + '12' : 'transparent',
              color: tab === t.id ? t.color : '#4A4870',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8
            }}>
              <span style={{ fontSize:15, fontWeight:700 }}>{t.label}</span>
              <span style={{ fontSize:11, opacity:0.65 }}>{t.sub} · {t.qs}q</span>
              {t.result && <CheckCircle size={12}/>}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:20, padding:'22px 18px',
          boxShadow:'0 4px 24px rgba(0,0,0,0.25)'
        }}>
          <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
            <div>
              <h3 style={{ fontSize:16, fontWeight:700, color:'#F0ECFF', margin:0 }}>
                {tab === 'phq9' ? 'Patient Health Questionnaire-9' : 'Generalized Anxiety Disorder-7'}
              </h3>
              <p style={{ fontSize:12, color:'#4A4870', marginTop:4 }}>{active.desc}</p>
            </div>
            {active.result && (
              <span style={{
                fontSize:12, fontWeight:700, padding:'5px 12px', borderRadius:99, flexShrink:0,
                background:active.color+'15', color:active.color, border:`1px solid ${active.color}35`
              }}>
                Score: {active.result.score}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, height:160, color:'#4A4870', fontSize:14 }}>
              <div style={{ width:16, height:16, border:'2px solid rgba(123,94,248,0.2)', borderTopColor:'#7B5EF8', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              Loading questions…
            </div>
          ) : (
            <AssessmentForm
              key={tab}
              title={active.label}
              questions={active.questions}
              onSubmit={active.submit}
              result={active.result}
              color={active.color}
              onReset={active.reset}
            />
          )}
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'#2E2B40', marginTop:16, lineHeight:1.6 }}>
          Screening purposes only · Not a clinical diagnosis · Consult a mental health professional
        </p>
      </div>
    </div>
  )
}