import { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { ClipboardList, CheckCircle, RotateCcw, AlertTriangle, ChevronRight, ChevronLeft, ArrowLeft, ArrowRight, Heart, Wind, ShieldCheck, Sparkles } from 'lucide-react'
import { getQuestions, submitPHQ9, submitGAD7 } from '../api/client'
import { useApp } from '../context/AppContext'
import { ASSESSMENT_TYPES, getAssessmentType } from '../assessment/display.js'
import './Assessment.css'

const OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
]

const PRIMARY_COLOR = '#2A7D6F'

function ScoreResult({ result, title, assessmentKey, onReset, onSafetyFollowUp, onTalkAboutResult }) {
  const categoryMeta = {
    Minimal: { emoji: '🌿', msg: 'This is the minimal symptom range on this screening. It does not describe your whole experience or determine whether you are safe.' },
    Mild: { emoji: '🌤️', msg: 'This is the mild symptom range on this screening. You can still seek support for anything that is affecting you.' },
    Moderate: { emoji: '⛅', msg: 'This is the moderate symptom range on this screening. Consider discussing your experience with a qualified professional or someone you trust.' },
    'Moderately Severe': { emoji: '🌧️', msg: 'This is the moderately severe symptom range on this screening. Consider reaching out to a qualified mental-health professional.' },
    Severe: { emoji: '💙', msg: 'This is the severe symptom range on this screening. A qualified mental-health professional can help you explore support options.' },
  }

  // A positive PHQ-9 item 9 needs its own follow-up regardless of the overall total.
  // Never show a broad reassurance such as "you are doing well" in that situation.
  const meta = result.crisis_flag
    ? { emoji: '💙', msg: 'Your total score is not the whole picture. Your answer to the final question deserves a separate, direct follow-up.' }
    : (categoryMeta[result.category] ?? { emoji: '💙', msg: result.description || 'This screening is one part of understanding what support might help.' })

  const levels = assessmentKey === 'mood'
    ? [{ label: 'Minimal', color: '#6B9B74' }, { label: 'Mild', color: '#8CA96B' }, { label: 'Moderate', color: '#C5A15D' }, { label: 'Mod. Severe', color: '#C78566' }, { label: 'Severe', color: '#B96D77' }]
    : [{ label: 'Minimal', color: '#6B9B74' }, { label: 'Mild', color: '#8CA96B' }, { label: 'Moderate', color: '#C5A15D' }, { label: 'Severe', color: '#B96D77' }]
  const activeColor = result.color || PRIMARY_COLOR

  return (
    <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', background: `${activeColor}08`, border: `1.5px solid ${activeColor}25`, borderRadius: 16, padding: '22px 20px' }}>
        <div aria-hidden="true" style={{ fontSize: 52, flexShrink: 0, textAlign: 'center' }}>{meta.emoji}</div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{title} screening result</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 18px', borderRadius: 99, marginBottom: 10, background: `${activeColor}14`, border: `1.5px solid ${activeColor}30`, color: activeColor, fontSize: 16, fontWeight: 800, fontFamily: 'Lora,serif' }}>
            {result.category}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{meta.msg}</p>
        </div>
      </div>

      <div>
        <p style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Your response at a glance</p>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {levels.map(level => {
            const isActive = result.category === level.label || (level.label === 'Mod. Severe' && result.category === 'Moderately Severe')
            return (
              <div key={level.label} style={{ flex: '1 1 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', borderRadius: 10, transition: 'all 0.2s', background: isActive ? `${level.color}12` : 'var(--bg-elevated)', border: `1px solid ${isActive ? `${level.color}40` : 'var(--border)'}`, opacity: isActive ? 1 : 0.45 }}>
                <div aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: level.color }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? level.color : 'var(--text-3)', textAlign: 'center' }}>{level.label}</span>
                {isActive && <span style={{ fontSize: 9, color: level.color, fontWeight: 700 }}>← Result</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', borderRadius: 14, padding: '14px 16px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', marginBottom: 6 }}>How to read this result</p>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>
          This screening reflects your answers over the past two weeks. It is not a diagnosis and cannot determine whether someone is safe. If anything is worrying you or affecting day-to-day life, support is appropriate whatever the score.
        </p>
      </div>

      {result.crisis_flag && (
        <div style={{ display: 'flex', gap: 12, padding: '13px 15px', borderRadius: 12, background: 'var(--rose-dim)', border: '1px solid rgba(192,66,74,0.22)' }}>
          <AlertTriangle size={16} color="var(--rose)" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--rose)', marginBottom: 5 }}>A follow-up matters</p>
            <p style={{ fontSize: 12, color: '#7A2832', lineHeight: 1.65 }}>
              Your answer to the final question needs a direct, compassionate follow-up; it does not by itself tell us whether danger is immediate. Are you in immediate danger right now, or do you feel you might act on these thoughts today?
              <br /><br /><strong>If yes or unsure: call 112 in India or go to the nearest emergency department.</strong>
              <br /><strong>Tele-MANAS: 14416</strong> (free, 24/7 support in India)
              <br /><strong>Vandrevala Foundation: +91 9999 666 555</strong> (free 24/7 phone/WhatsApp support)
            </p>
            <button type="button" className="btn-primary" style={{ marginTop: 10, minHeight: 40 }} onClick={onSafetyFollowUp}>
              Continue to a safety check-in <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {!result.crisis_flag && <button type="button" onClick={() => onTalkAboutResult(result)} className="btn-primary" style={{ alignSelf: 'flex-start', minHeight: 42 }}>Talk about this check-in <ChevronRight size={14} /></button>}
      <button type="button" onClick={onReset} className="btn-ghost" style={{ alignSelf: 'flex-start' }}><RotateCcw size={12} /> Start again</button>
    </div>
  )
}

function AssessmentForm({ title, assessmentKey, questions, onSubmit, result, color, onReset, onSafetyFollowUp, onTalkAboutResult }) {
  const [answers, setAnswers] = useState(Array(questions.length).fill(null))
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(!!result)
  const [submitError, setSubmitError] = useState('')
  // Reuse one ID when retrying the same logical submission after an uncertain network result.
  const submissionIdRef = useRef(null)

  useEffect(() => { if (result) setDone(true) }, [result])

  const answered = answers.filter(answer => answer !== null).length
  const allDone = answered === questions.length && questions.length > 0

  const handleSelect = value => {
    if (answers[step] !== value) {
      // A changed answer is a new logical submission; do not reuse a key for an old payload.
      if (submitError) submissionIdRef.current = null
      setSubmitError('')
    }
    setAnswers(previous => previous.map((answer, index) => index === step ? value : answer))
    if (step < questions.length - 1) setTimeout(() => setStep(current => current + 1), 200)
  }

  const handleSubmit = async () => {
    if (loading || !allDone) return
    if (!submissionIdRef.current) submissionIdRef.current = uuidv4()
    setLoading(true)
    setSubmitError('')
    try {
      await onSubmit(answers, submissionIdRef.current)
      setDone(true)
    } catch (error) {
      // Keep answers and the same submission ID so a retry cannot create a duplicate result.
      setSubmitError('Your result could not be saved just now. Your answers are still here. Check your connection and try again; if you change an answer, a new submission will be created.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setAnswers(Array(questions.length).fill(null))
    setStep(0)
    setDone(false)
    setSubmitError('')
    submissionIdRef.current = null
    onReset?.()
  }

  if (done && result) return <ScoreResult result={result} title={title} assessmentKey={assessmentKey} onReset={handleReset} onSafetyFollowUp={onSafetyFollowUp} onTalkAboutResult={onTalkAboutResult} />

  const pct = questions.length ? (answered / questions.length) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {questions.map((_, index) => (
              <button type="button" key={index} onClick={() => setStep(index)} aria-label={`Go to question ${index + 1}`} aria-current={index === step ? 'step' : undefined} style={{ width: 26, height: 26, borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', transition: 'all 0.15s', border: `1.5px solid ${index === step ? color : answers[index] !== null ? `${color}50` : 'var(--border)'}`, background: answers[index] !== null ? `${color}14` : index === step ? 'var(--bg-elevated)' : 'transparent', color: answers[index] !== null ? color : index === step ? 'var(--text-2)' : 'var(--text-4)' }}>
                {answers[index] !== null ? '✓' : index + 1}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{answered}/{questions.length} answered</span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: color, width: `${pct}%`, transition: 'width 0.6s ease' }} />
        </div>
      </div>

      <div key={step} className="animate-fade-in" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px' }}>
        <p style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>Question {step + 1} of {questions.length}</p>
        <p style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 9, lineHeight: 1.5 }}>Over the past 2 weeks, how often have you been bothered by…</p>
        <p id="checkin-question-text" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.55, marginBottom: 18, fontFamily: 'Lora,serif' }}>{questions[step]}</p>
        <div role="radiogroup" aria-labelledby="checkin-question-text" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {OPTIONS.map(option => {
            const selected = answers[step] === option.value
            return (
              <button type="button" role="radio" aria-checked={selected} key={option.value} onClick={() => handleSelect(option.value)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.14s', border: `1.5px solid ${selected ? color : 'var(--border)'}`, background: selected ? `${color}10` : '#fff', boxShadow: selected ? `0 0 0 1px ${color}22` : 'none' }}>
                <span aria-hidden="true" style={{ width: 17, height: 17, borderRadius: '50%', flexShrink: 0, transition: 'all 0.14s', border: `2px solid ${selected ? color : 'var(--border-md)'}`, background: selected ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selected && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: selected ? 'var(--text-1)' : 'var(--text-3)' }}>{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {submitError && <div role="alert" aria-live="polite" style={{ background: 'var(--rose-dim)', border: '1px solid rgba(192,66,74,0.22)', borderRadius: 12, padding: '12px 14px', color: '#7A2832', fontSize: 13, lineHeight: 1.55 }}>{submitError}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={() => setStep(current => Math.max(0, current - 1))} disabled={step === 0 || loading} className="btn-ghost" style={{ fontSize: 13 }}>
          <ChevronLeft size={14} /> Previous
        </button>
        {step < questions.length - 1 ? (
          <button type="button" onClick={() => setStep(current => Math.min(questions.length - 1, current + 1))} disabled={loading} className="btn-ghost" style={{ fontSize: 13 }}>
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={!allDone || loading} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, border: 'none', fontFamily: 'inherit', transition: 'all 0.18s', background: allDone ? color : 'var(--bg-elevated)', color: allDone ? '#fff' : 'var(--text-4)', fontSize: 13, fontWeight: 600, cursor: allDone && !loading ? 'pointer' : 'not-allowed', opacity: allDone && !loading ? 1 : 0.55, boxShadow: allDone ? `0 2px 12px ${color}35` : 'none' }}>
            {loading ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Saving…</> : <><CheckCircle size={14} /> View Results</>}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Assessment() {
  const { phq9Result, setPhq9Result, gad7Result, setGad7Result, setPendingChatPrompt, setActivePage } = useApp()
  const [questionSets, setQuestionSets] = useState({ phq9: [], gad7: [] })
  const [selectedId, setSelectedId] = useState(null)
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [questionError, setQuestionError] = useState('')

  const loadQuestions = () => {
    setLoadingQuestions(true); setQuestionError('')
    getQuestions().then(({ data }) => {
      if (!Array.isArray(data?.phq9) || data.phq9.length !== 9 || !Array.isArray(data?.gad7) || data.gad7.length !== 7) throw new Error('Incomplete check-in questions')
      setQuestionSets({ phq9: data.phq9, gad7: data.gad7 })
    }).catch(() => setQuestionError('We could not load the check-in questions. Your answers have not been changed. Please try again.')).finally(() => setLoadingQuestions(false))
  }
  useEffect(() => { loadQuestions() }, [])
  const selectedType = getAssessmentType(selectedId)
  const selectedResult = selectedId === 'mood' ? phq9Result : selectedId === 'worry' ? gad7Result : null
  const questionKey = selectedId === 'mood' ? 'phq9' : 'gad7'
  const color = selectedId === 'worry' ? '#8973a4' : PRIMARY_COLOR
  const ICONS = { mood: Heart, worry: Wind }

  const handleSubmit = async (answers, submissionId) => {
    const { data } = selectedId === 'mood' ? await submitPHQ9(answers, submissionId) : await submitGAD7(answers, submissionId)
    if (selectedId === 'mood') setPhq9Result(data); else setGad7Result(data)
  }
  const handleReset = () => { if (selectedId === 'mood') setPhq9Result(null); else setGad7Result(null) }
  const returnToChat = () => { setPendingChatPrompt("I'd like to reflect on my recent check-in and understand what support might help."); setActivePage('chat') }
  const handleSafetyFollowUp = () => { setPendingChatPrompt('I completed a check-in and would like a direct safety check-in now.'); setActivePage('chat') }

  return <div className="assessment-page"><div className="assessment-content">
    <header className="assessment-hero"><div className="assessment-hero-lockup">
      <div className="assessment-hero-icon"><ClipboardList size={22} /></div><div>
        <p className="assessment-eyebrow">YOUR CHECK-IN SPACE</p><h1>Make room for how you feel.</h1>
        <p className="assessment-hero-copy">Choose a short guided check-in. Answer one question at a time, review your result, and return to a conversation when you're ready.</p>
        <div className="assessment-trust-row"><span><ShieldCheck size={12}/> Private to your account</span><span><Heart size={12}/> Always optional</span><span><Sparkles size={12}/> Not a diagnosis</span></div>
      </div>
    </div></header>
    {loadingQuestions ? <div className="assessment-flow-card" role="status" style={{display:'flex',alignItems:'center',gap:10,minHeight:100}}><span className="mc-loader"/> Preparing your check-ins…</div>
    : questionError ? <div className="assessment-error" role="alert"><AlertTriangle size={17}/><div><strong>We couldn't prepare your check-in.</strong><p>{questionError}</p><button type="button" className="btn-primary" onClick={loadQuestions}>Try again</button></div></div>
    : selectedType ? <section className="assessment-flow-card" aria-labelledby="assessment-flow-title">
      <button type="button" className="assessment-back-button" onClick={() => setSelectedId(null)}><ArrowLeft size={13}/> All check-ins</button>
      <div className="assessment-flow-top"><div><h2 id="assessment-flow-title">{selectedType.title}</h2><p>{selectedType.description} This is optional and does not replace professional care.</p></div>
       {(() => { const Icon = ICONS[selectedId]; return <span className={`assessment-choice-icon tone-${selectedType.accent}`}><Icon size={17}/></span> })()}
      </div>
      <AssessmentForm key={selectedId} title={selectedType.displayTitle} assessmentKey={selectedId} questions={questionSets[questionKey]} onSubmit={handleSubmit} result={selectedResult} color={color} onReset={handleReset} onSafetyFollowUp={handleSafetyFollowUp} onTalkAboutResult={returnToChat}/>
    </section>
    : <>
      <div className="assessment-section-head"><div><p>CHOOSE YOUR CHECK-IN</p><h2>What would you like to explore?</h2></div></div>
      <div className="assessment-choice-grid">{ASSESSMENT_TYPES.map(type => {
        const Icon = ICONS[type.id], latest = type.id === 'mood' ? phq9Result : gad7Result
        return <button key={type.id} type="button" className="assessment-choice-card" onClick={() => setSelectedId(type.id)}>
          <span className={`assessment-choice-icon tone-${type.accent}`}><Icon size={19}/></span><h3>{type.title}</h3><p>{type.description}</p>
          <span className="assessment-choice-footer"><span>{type.questionCount} short questions · About 2 minutes</span><span className="assessment-choice-cta">{latest ? 'View latest' : 'Start'} <ArrowRight size={13}/></span></span>
        </button>
      })}</div>
      <p className="assessment-disclaimer">These check-ins are optional screening tools, not diagnoses. A score cannot describe your whole experience or determine whether you are safe. You can seek support whatever your result.</p>
    </>}
  </div></div>
}
