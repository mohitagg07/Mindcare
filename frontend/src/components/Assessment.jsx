import { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { ClipboardList, CheckCircle, RotateCcw, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react'
import { getQuestions, submitPHQ9 } from '../api/client'
import { useApp } from '../context/AppContext'

const OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
]

const PRIMARY_COLOR = '#2A7D6F'

function ScoreResult({ result, title, onReset, onSafetyFollowUp }) {
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

  const levels = [
    { label: 'Minimal', color: '#2A7D6F' },
    { label: 'Mild', color: '#3B6EA8' },
    { label: 'Moderate', color: '#C07436' },
    { label: 'Mod. Severe', color: '#C05A2A' },
    { label: 'Severe', color: '#C0424A' },
  ]
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
        <p style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>PHQ-9 screening range</p>
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

      <button type="button" onClick={onReset} className="btn-ghost" style={{ alignSelf: 'flex-start' }}>
        <RotateCcw size={12} /> Retake Assessment
      </button>
    </div>
  )
}

function AssessmentForm({ title, questions, onSubmit, result, color, onReset, onSafetyFollowUp }) {
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

  if (done && result) return <ScoreResult result={result} title={title} onReset={handleReset} onSafetyFollowUp={onSafetyFollowUp} />

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
        <p id="phq9-question-text" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.55, marginBottom: 18, fontFamily: 'Lora,serif' }}>{questions[step]}</p>
        <div role="radiogroup" aria-labelledby="phq9-question-text" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
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
  const { setPhq9Result, phq9Result, setPendingChatPrompt, setActivePage } = useApp()
  const [questions, setQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [questionError, setQuestionError] = useState('')

  const loadQuestions = () => {
    setLoadingQuestions(true)
    setQuestionError('')
    getQuestions()
      .then(({ data }) => {
        if (!Array.isArray(data?.phq9) || data.phq9.length !== 9) throw new Error('PHQ-9 questions were not available.')
        setQuestions(data.phq9)
      })
      .catch(() => setQuestionError('We could not load the PHQ-9 questions. Check your connection and try again.'))
      .finally(() => setLoadingQuestions(false))
  }

  useEffect(() => { loadQuestions() }, [])

  const handleSafetyFollowUp = () => {
    setPendingChatPrompt('I completed a wellbeing check-in and would like help understanding my answer and choosing a next step.')
    setActivePage('chat')
  }

  const handleSubmit = async (answers, submissionId) => {
    const { data } = await submitPHQ9(answers, submissionId)
    setPhq9Result(data)
  }

  const handleReset = () => setPhq9Result(null)

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-page)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 660, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={20} color="var(--teal)" />
          </div>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-1)', margin: 0, fontFamily: 'Lora,serif' }}>Wellbeing Screening</h2>
            <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 3 }}>Answer honestly — there are no right or wrong answers</p>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 18px', boxShadow: '0 2px 12px rgba(26,35,50,0.06)' }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', margin: 0, fontFamily: 'Lora,serif' }}>Patient Health Questionnaire (PHQ-9)</h3>
            <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '6px 0 0', lineHeight: 1.55 }}>A screening questionnaire, not a diagnosis. Your answer to the final question may need a separate follow-up regardless of the total score.</p>
          </div>

          {loadingQuestions ? (
            <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 140, color: 'var(--text-4)', fontSize: 14 }}>
              <span style={{ width: 15, height: 15, border: '2px solid var(--border)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Loading questions…
            </div>
          ) : questionError ? (
            <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>{questionError}</p>
              <button type="button" className="btn-primary" onClick={loadQuestions}>Retry loading questions</button>
            </div>
          ) : (
            <AssessmentForm
              key="phq9"
              title="PHQ-9"
              questions={questions}
              onSubmit={handleSubmit}
              result={phq9Result}
              color={PRIMARY_COLOR}
              onReset={handleReset}
              onSafetyFollowUp={handleSafetyFollowUp}
            />
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-4)', marginTop: 14, lineHeight: 1.6 }}>
          For screening purposes only · Not a clinical diagnosis · You can seek support regardless of your result.
        </p>
      </div>
    </div>
  )
}
