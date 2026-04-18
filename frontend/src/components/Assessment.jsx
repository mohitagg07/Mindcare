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

/* ── Score Result — shows CATEGORY only, no numeric score ── */
function ScoreResult({ result, title, onReset }) {
  const pct = Math.round((result.score / result.max_score) * 100)

  const categoryMeta = {
    'Minimal':           { emoji:'🌿', msg:'You appear to be doing well. Keep taking care of yourself.' },
    'Mild':              { emoji:'🌤️', msg:'Some symptoms detected. Small daily habits can make a big difference.' },
    'Moderate':          { emoji:'⛅', msg:'Moderate symptoms. Consider talking to a counsellor or trusted person.' },
    'Moderately Severe': { emoji:'🌧️', msg:'Significant symptoms. We recommend seeking professional support soon.' },
    'Severe':            { emoji:'⚡', msg:'Severe symptoms. Please reach out to a mental health professional now.' },
  }
  const meta = categoryMeta[result.category] ?? { emoji:'💙', msg:result.description }

  const levels = result.max_score === 27
    ? [{ label:'Minimal', color:'#2A7D6F' }, { label:'Mild', color:'#3B6EA8' }, { label:'Moderate', color:'#C07436' }, { label:'Mod. Severe', color:'#C05A2A' }, { label:'Severe', color:'#C0424A' }]
    : [{ label:'Minimal', color:'#2A7D6F' }, { label:'Mild', color:'#3B6EA8' }, { label:'Moderate', color:'#C07436' }, { label:'Severe', color:'#C0424A' }]

  return (
    <div className="animate-scale-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Result card — emoji + category + friendly message, NO score number */}
      <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap', background:`${result.color}08`, border:`1.5px solid ${result.color}25`, borderRadius:16, padding:'22px 20px' }}>
        <div style={{ fontSize:52, flexShrink:0, textAlign:'center' }}>{meta.emoji}</div>
        <div style={{ flex:1, minWidth:180 }}>
          <p style={{ fontSize:10, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>{title} Result</p>
          <div style={{ display:'inline-flex', alignItems:'center', padding:'7px 18px', borderRadius:99, marginBottom:10, background:`${result.color}14`, border:`1.5px solid ${result.color}30`, color:result.color, fontSize:16, fontWeight:800, fontFamily:'Lora,serif' }}>
            {result.category}
          </div>
          <p style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.6, margin:0, fontWeight:500 }}>{meta.msg}</p>
        </div>
      </div>

      {/* Severity scale — visual only, NO score ranges */}
      <div>
        <p style={{ fontSize:10, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:10 }}>Severity Level</p>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {levels.map(lvl => {
            const isActive = result.category?.toLowerCase().includes(lvl.label.toLowerCase().split(' ')[0])
            return (
              <div key={lvl.label} style={{ flex:'1 1 60px', display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'10px 6px', borderRadius:10, transition:'all 0.2s', background:isActive ? lvl.color+'12' : 'var(--bg-elevated)', border:`1px solid ${isActive ? lvl.color+'40' : 'var(--border)'}`, opacity:isActive?1:0.45 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:lvl.color }}/>
                <span style={{ fontSize:10, fontWeight:700, color:isActive?lvl.color:'var(--text-3)', textAlign:'center' }}>{lvl.label}</span>
                {isActive && <span style={{ fontSize:9, color:lvl.color, fontWeight:700 }}>← You</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* What to do */}
      <div style={{ background:'var(--teal-dim)', border:'1px solid var(--teal-border)', borderRadius:14, padding:'14px 16px' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--teal)', marginBottom:6 }}>💡 What you can do</p>
        <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.65, margin:0 }}>
          {pct < 25
            ? 'Great work! Keep your healthy habits — sleep well, move your body, and talk to people you trust.'
            : pct < 50
            ? 'Try journaling, breathing exercises, or a short walk daily. If you feel stuck, consider talking to someone.'
            : pct < 75
            ? 'Your responses suggest you may benefit from speaking with a counsellor or therapist.'
            : "Please reach out to a mental health professional as soon as possible. You don't have to face this alone."}
        </p>
      </div>

      {result.crisis_flag && (
        <div style={{ display:'flex', gap:12, padding:'13px 15px', borderRadius:12, background:'var(--rose-dim)', border:'1px solid rgba(192,66,74,0.22)' }}>
          <AlertTriangle size={16} color="var(--rose)" style={{ flexShrink:0, marginTop:1 }}/>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--rose)', marginBottom:5 }}>Immediate Support Available</p>
            <p style={{ fontSize:12, color:'#7A2832', lineHeight:1.65 }}>
              You are not alone.<br/>
              <strong>iCall: 9152987821</strong> · <strong>Vandrevala Foundation: 1860-2662-345</strong>
            </p>
          </div>
        </div>
      )}

      <button onClick={onReset} className="btn-ghost" style={{ alignSelf:'flex-start' }}>
        <RotateCcw size={12}/> Retake Assessment
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
              <button key={i} onClick={() => setStep(i)} style={{ width:26, height:26, borderRadius:7, fontSize:10, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit', transition:'all 0.15s', border:`1.5px solid ${i===step?color:answers[i]!==null?color+'50':'var(--border)'}`, background:answers[i]!==null?color+'14':i===step?'var(--bg-elevated)':'transparent', color:answers[i]!==null?color:i===step?'var(--text-2)':'var(--text-4)' }}>
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
              <button key={opt.value} onClick={() => handleSelect(opt.value)} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all 0.14s', border:`1.5px solid ${sel?color:'var(--border)'}`, background:sel?color+'10':'#fff', boxShadow:sel?`0 0 0 1px ${color}22`:'none' }}>
                <div style={{ width:17, height:17, borderRadius:'50%', flexShrink:0, transition:'all 0.14s', border:`2px solid ${sel?color:'var(--border-md)'}`, background:sel?color:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {sel && <div style={{ width:5, height:5, borderRadius:'50%', background:'#fff' }}/>}
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:sel?'var(--text-1)':'var(--text-3)' }}>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button onClick={() => setStep(s => Math.max(0, s-1))} disabled={step===0} className="btn-ghost" style={{ fontSize:13 }}>
          <ChevronLeft size={14}/> Previous
        </button>
        {step < questions.length-1 ? (
          <button onClick={() => setStep(s => Math.min(questions.length-1, s+1))} className="btn-ghost" style={{ fontSize:13 }}>
            Next <ChevronRight size={14}/>
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!allDone||loading} style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, border:'none', fontFamily:'inherit', transition:'all 0.18s', background:allDone?color:'var(--bg-elevated)', color:allDone?'#fff':'var(--text-4)', fontSize:13, fontWeight:600, cursor:allDone&&!loading?'pointer':'not-allowed', opacity:allDone&&!loading?1:0.55, boxShadow:allDone?`0 2px 12px ${color}35`:'none' }}>
            {loading?<><div style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Scoring…</>:<><CheckCircle size={14}/> View Results</>}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Main ── */
export default function Assessment() {
  const { setPhq9Result, setGad7Result, phq9Result, gad7Result } = useApp()
  const [tab, setTab] = useState('phq9')
  const [qs,  setQs]  = useState({ phq9:[], gad7:[] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getQuestions().then(({ data }) => setQs({ phq9:data.phq9, gad7:data.gad7 })).catch(console.error).finally(() => setLoading(false))
  }, [])

  const TABS = [
    { id:'phq9', label:'PHQ-9', sub:'Depression', color:'#2A7D6F', questions:qs.phq9, result:phq9Result, submit:async a => { const {data}=await submitPHQ9(a); setPhq9Result(data) }, reset:()=>setPhq9Result(null) },
    { id:'gad7', label:'GAD-7', sub:'Anxiety',    color:'#3B6EA8', questions:qs.gad7, result:gad7Result, submit:async a => { const {data}=await submitGAD7(a); setGad7Result(data) }, reset:()=>setGad7Result(null) },
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
            {/* ✅ Clean subtitle — no technical jargon for client */}
            <p style={{ fontSize:12, color:'var(--text-4)', marginTop:3 }}>Answer honestly — there are no right or wrong answers</p>
          </div>
        </div>

        {/* Tab — no desc, no score */}
        <div style={{ display:'flex', gap:6, padding:4, borderRadius:13, marginBottom:16, background:'var(--bg-card)', border:'1px solid var(--border)', boxShadow:'0 1px 4px rgba(26,35,50,0.05)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:'11px 14px', borderRadius:10, cursor:'pointer', fontFamily:'inherit', transition:'all 0.18s', border:`1px solid ${tab===t.id?t.color+'30':'transparent'}`, background:tab===t.id?t.color+'10':'transparent', color:tab===t.id?t.color:'var(--text-4)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <span style={{ fontSize:15, fontWeight:700 }}>{t.label}</span>
              <span style={{ fontSize:12, opacity:0.65 }}>{t.sub}</span>
              {t.result && <CheckCircle size={11}/>}
            </button>
          ))}
        </div>

        {/* Card — just the heading, no subtitle/score */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px 18px', boxShadow:'0 2px 12px rgba(26,35,50,0.06)' }}>
          <div style={{ marginBottom:18 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif' }}>
              {tab === 'phq9' ? 'Patient Health Questionnaire' : 'Generalized Anxiety Disorder'}
            </h3>
            {/* ✅ No "9 questions · Score 0-27..." — removed entirely */}
            {/* ✅ No "Score: X" badge — hidden from client */}
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