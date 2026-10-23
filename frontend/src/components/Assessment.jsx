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

function ScoreResult({ result, title, onReset, onSafetyFollowUp, onTalkAboutResult }) {
  const isSafetyFollowUp = Boolean(result.crisis_flag)
  const categoryMeta = {
    Minimal: 'You can still seek support for anything that is bothering you. A screening result cannot describe your whole experience.',
    Mild: 'You can seek support for anything that is affecting your day-to-day life, whatever this result says.',
    Moderate: 'Talking with a qualified professional or someone you trust may help you explore what support feels right.',
    'Moderately Severe': 'Consider reaching out to a qualified mental-health professional to talk through what you have been experiencing.',
    Severe: 'A qualified mental-health professional can help you explore support options at your own pace.',
  }
  const message = isSafetyFollowUp
    ? 'Your answer to the final question deserves its own follow-up. The overall score cannot answer that on its own.'
    : (categoryMeta[result.category] || result.description || 'This check-in is one part of understanding what support might help.')

  return (
    <div className="assessment-result animate-scale-in">
      <section className={`assessment-result-summary${isSafetyFollowUp ? ' is-safety-follow-up' : ''}`} aria-labelledby="assessment-result-title">
        <span className="assessment-result-mark" aria-hidden="true">
          {isSafetyFollowUp ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
        </span>
        <div className="assessment-result-copy">
          <p className="assessment-result-overline">{title}</p>
          <h3 id="assessment-result-title" aria-live="polite">
            {isSafetyFollowUp ? 'A follow-up matters' : result.category ? `${result.category} range` : 'Your check-in is complete'}
          </h3>
          <p>{message}</p>
        </div>
      </section>

      <p className="assessment-result-disclaimer">
        This is a screening result, not a diagnosis. A score cannot determine whether someone is safe, and support is appropriate at any score.
      </p>

      {isSafetyFollowUp && (
        <section className="assessment-safety-card" role="alert" aria-labelledby="assessment-safety-title">
          <div className="assessment-safety-heading">
            <AlertTriangle size={18} aria-hidden="true" />
            <h3 id="assessment-safety-title">Let's check on your immediate safety</h3>
          </div>
          <p className="assessment-safety-question">
            Are you in immediate danger right now, or do you feel you might act on these thoughts today?
          </p>
          <div className="assessment-support-resources">
            <p><strong>If yes or unsure:</strong> call 112 in India or go to the nearest emergency department.</p>
            <p><strong>Tele-MANAS: 14416</strong> — free, 24/7 support in India.</p>
            <p><strong>Vandrevala Foundation: +91 9999 666 555</strong> — free 24/7 phone/WhatsApp support.</p>
          </div>
          <button type="button" className="btn-primary assessment-safety-action" onClick={onSafetyFollowUp}>
            Continue to a safety check-in <ChevronRight size={15} />
          </button>
        </section>
      )}

      <div className="assessment-result-actions">
        {!isSafetyFollowUp && (
          <button type="button" onClick={() => onTalkAboutResult(result)} className="btn-primary assessment-result-primary">
            Reflect in chat <ChevronRight size={15} />
          </button>
        )}
        <button type="button" onClick={onReset} className="btn-ghost assessment-result-reset">
          <RotateCcw size={14} /> Start again
        </button>
      </div>
    </div>
  )
}

function AssessmentForm({ title, assessmentKey, questions, onSubmit, result, color, onReset, onSafetyFollowUp, onTalkAboutResult }) {
  const [answers, setAnswers] = useState(Array(questions.length).fill(null))
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(!!result)
  const [submitError, setSubmitError] = useState('')
  const questionHeadingRef = useRef(null)
  const previousStepRef = useRef(step)
  // Reuse one ID when retrying the same logical submission after an uncertain network result.
  const submissionIdRef = useRef(null)

  useEffect(() => { if (result) setDone(true) }, [result])
  useEffect(() => {
    if (previousStepRef.current !== step) {
      previousStepRef.current = step
      questionHeadingRef.current?.focus({ preventScroll: true })
    }
  }, [step])

  const answered = answers.filter(answer => answer !== null).length
  const allDone = answered === questions.length && questions.length > 0

  const handleSelect = value => {
    if (answers[step] !== value) {
      // A changed answer is a new logical submission; do not reuse a key for an old payload.
      if (submitError) submissionIdRef.current = null
      setSubmitError('')
    }
    setAnswers(previous => previous.map((answer, index) => index === step ? value : answer))
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

  if (done && result) return <ScoreResult result={result} title={title} onReset={handleReset} onSafetyFollowUp={onSafetyFollowUp} onTalkAboutResult={onTalkAboutResult} />

  const progress = questions.length ? ((step + 1) / questions.length) * 100

  return (
    <div className="assessment-form">
      <div className="assessment-progress">
        <div className="assessment-progress-labels">
          <span>Question {step + 1} of {questions.length}</span>
        </div>
        <div className="assessment-progress-track" role="progressbar" aria-label="Check-in progress" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={step + 1}>
          <div className="assessment-progress-fill" style={{ width: `${progress}%`, background: color }} />
        </div>
      </div>

      <section className="assessment-question" aria-labelledby="checkin-question-text">
        <p className="assessment-timeframe">Over the past 2 weeks, how often have you been bothered by…</p>
        <h3 id="checkin-question-text" ref={questionHeadingRef} tabIndex={-1} className="assessment-question-text">{questions[step]}</h3>
        <fieldset className="assessment-options" disabled={loading}>
          <legend className="assessment-visually-hidden">Choose a response</legend>
          {OPTIONS.map(option => {
            const selected = answers[step] === option.value
            return (
              <label key={option.value} className={`assessment-option${selected ? ' is-selected' : ''}`}>
                <input type="radio" name={`assessment-${assessmentKey}-question-${step}`} value={option.value} checked={selected} onChange={() => handleSelect(option.value)} />
                <span className="assessment-option-indicator" aria-hidden="true">{selected && <span />}</span>
                <span className="assessment-option-label">{option.label}</span>
              </label>
            )
          })}
        </fieldset>
      </section>

      {submitError && <div className="assessment-submit-error" role="alert">{submitError}</div>}

      <div className="assessment-form-actions">
        <button type="button" onClick={() => setStep(current => Math.max(0, current - 1))} disabled={step === 0 || loading} className="assessment-nav-button assessment-nav-secondary">
          <ChevronLeft size={16} /> Back
        </button>
        {step < questions.length - 1 ? (
          <button type="button" onClick={() => setStep(current => Math.min(questions.length - 1, current + 1))} disabled={loading} className="assessment-nav-button assessment-nav-primary">
            Continue <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={!allDone || loading} className="assessment-nav-button assessment-nav-primary">
            {loading ? <><span className="assessment-submit-spinner" aria-hidden="true" /> Saving…</> : <>See my result <ChevronRight size={16} /></>}
          </button>
        )}
      </div>
      {step === questions.length - 1 && !allDone && !loading && (
        <p className="assessment-submit-hint">Choose a response for each question before viewing your result.</p>
      )}
    </div>
  )
}

export default function Assessment() {
  const { phq9Result, setPhq9Result, gad7Result, setGad7Result, setPendingChatPrompt, setPendingAssessmentFollowUpId, setActivePage } = useApp()
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
  const returnToChat = (savedResult) => {
    setPendingAssessmentFollowUpId(savedResult?.assessment_id || null)
    setPendingChatPrompt("I'd like to reflect on my recent check-in and understand what support might help.")
    setActivePage('chat')
  }
  const handleSafetyFollowUp = () => { setPendingChatPrompt('I completed a check-in and would like a direct safety check-in now.'); setActivePage('chat') }

  return <div className={`assessment-page${selectedType ? ' is-in-flow' : ''}`}><div className="assessment-content">
    <header className="assessment-hero"><div className="assessment-hero-lockup">
      <div className="assessment-hero-icon"><ClipboardList size={22} /></div><div>
        <p className="assessment-eyebrow">YOUR CHECK-IN SPACE</p><h1>Make room for how you feel.</h1>
        <p className="assessment-hero-copy">Choose a short guided check-in. Answer one question at a time, review your result, and return to a conversation when you're ready.</p>
        <div className="assessment-trust-row"><span><ShieldCheck size={12}/> Private to your account</span><span><Heart size={12}/> Always optional</span><span><Sparkles size={12}/> Not a diagnosis</span></div>
      </div>
    </div></header>
    {loadingQuestions ? <div className="assessment-flow-card" role="status" style={{display:'flex',alignItems:'center',gap:10,minHeight:100}}><span className="mc-loader"/> Preparing your check-ins…</div>
    : questionError ? <div className="assessment-error" role="alert"><AlertTriangle size={17}/><div><strong>We couldn't prepare your check-in.</strong><p>{questionError}</p><button type="button" className="btn-primary" onClick={loadQuestions}>Try again</button></div></div>
    : selectedType ? <section className={`assessment-flow-card${selectedResult ? ' is-result' : ''}`} aria-labelledby={selectedResult ? 'assessment-result-title' : 'assessment-flow-title'}>
      <button type="button" className="assessment-back-button" onClick={() => setSelectedId(null)}><ArrowLeft size={14}/> All check-ins</button>
      {!selectedResult && (
        <div className="assessment-flow-top">
          <div>
            <h2 id="assessment-flow-title">{selectedType.title}</h2>
            <p>Take each question at your own pace. You can go back before submitting.</p>
          </div>
          {(() => { const Icon = ICONS[selectedId]; return <span className={`assessment-choice-icon tone-${selectedType.accent}`}><Icon size={17}/></span> })()}
        </div>
      )}
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
