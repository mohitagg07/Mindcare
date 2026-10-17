import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle, ClipboardList, RotateCcw, ShieldCheck } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { getQuestions, submitPHQ9 } from '../api/client'
import { useApp } from '../context/AppContext'

const FALLBACK_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
]

const RESULT_GUIDANCE = {
  Minimal: 'If this check-in felt useful, keep doing the small things that support you. You can return to it later if you want to reflect on changes.',
  Mild: 'You may want to share what you have noticed with someone you trust. If these feelings persist or become harder to manage, a mental health professional can help.',
  Moderate: 'Consider talking with a mental health professional about what has been going on and what support might help.',
  'Moderately Severe': 'It may help to contact a mental health professional soon and let someone you trust know how you have been feeling.',
  Severe: 'Please consider reaching out to a mental health professional as soon as you can. If you feel in immediate danger, contact local emergency support now.',
}

function ScoreResult({ result, title, onReset }) {
  const isPhq = result.max_score === 27
  const categories = isPhq
    ? ['Minimal', 'Mild', 'Moderate', 'Moderately Severe', 'Severe']
    : ['Minimal', 'Mild', 'Moderate', 'Severe']
  const ranges = isPhq
    ? { Minimal: '0–4', Mild: '5–9', Moderate: '10–14', 'Moderately Severe': '15–19', Severe: '20–27' }
    : { Minimal: '0–4', Mild: '5–9', Moderate: '10–14', Severe: '15–21' }

  return (
    <section className="assessment-result" aria-labelledby="assessment-result-heading" aria-live="polite">
      <div className="assessment-result-card" style={{ '--assessment-accent': result.color || '#438765' }}>
        <div className="assessment-result-icon" aria-hidden="true"><CheckCircle size={24} /></div>
        <div>
          <p className="assessment-kicker">{title} screening result</p>
          <h3 id="assessment-result-heading">{result.category}</h3>
          <p className="assessment-result-summary">Your score is <strong>{result.score} of {result.max_score}</strong>. This falls in the {result.category?.toLowerCase()} symptom range for this screening.</p>
        </div>
      </div>

      <section className="assessment-scale" aria-label={`${title} screening ranges`}>
        <div className="assessment-section-heading"><h3>Screening ranges</h3><span>Your result is highlighted</span></div>
        <div className="assessment-range-list">
          {categories.map(category => {
            const active = result.category === category
            return <div key={category} className={`assessment-range${active ? ' is-current' : ''}`} aria-current={active ? 'true' : undefined}>
              <span className="assessment-range-dot" />
              <span>{category} <small>{ranges[category]}</small></span>
              {active && <strong>Current result</strong>}
            </div>
          })}
        </div>
      </section>

      <section className="assessment-guidance">
        <h3>A possible next step</h3>
        <p>{RESULT_GUIDANCE[result.category] || 'You can use this result as a starting point for a conversation with someone you trust or a qualified professional.'}</p>
      </section>

      <p className="assessment-disclaimer"><ShieldCheck size={16} /> This is a screening questionnaire, not a diagnosis. A score cannot explain everything you are experiencing. A qualified professional can help you understand it in context.</p>

      {result.crisis_flag && <div className="assessment-safety-panel" role="alert">
        <AlertTriangle size={19} aria-hidden="true" />
        <div>
          <h3>You deserve support with this</h3>
          <p>Your answer suggests you have had thoughts about being better off dead or hurting yourself. The screening cannot tell how immediate those thoughts are.</p>
          <p><strong>If you might act on these thoughts or are in immediate danger, contact your local emergency number or go to the nearest emergency department now.</strong> If you can, tell someone you trust and stay near them while you get support.</p>
          <p><a href="https://findahelpline.com/" target="_blank" rel="noopener noreferrer">Find a verified support line for your country</a></p>
        </div>
      </div>}

      <button type="button" onClick={onReset} className="assessment-retake"><RotateCcw size={15} /> Retake screening</button>
    </section>
  )
}

function AssessmentForm({ title, questions, options, onSubmit, result, color, onReset }) {
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(null))
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(Boolean(result))
  const submissionAttempt = useRef({ answers: '', id: uuidv4() })
  const answered = answers.filter(answer => answer !== null).length
  const allAnswered = questions.length > 0 && answered === questions.length
  const lastAnswer = title === 'PHQ-9' && step === 8 ? answers[8] : null

  useEffect(() => { setDone(Boolean(result)) }, [result])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    setSubmitError('')
    if (!allAnswered) {
      setSubmitError('Please answer each question before viewing your result.')
      const firstMissing = answers.findIndex(answer => answer === null)
      if (firstMissing >= 0) setStep(firstMissing)
      return
    }
    setSaving(true)
    try {
      const answerKey = JSON.stringify(answers)
      if (submissionAttempt.current.answers !== answerKey) submissionAttempt.current = { answers: answerKey, id: uuidv4() }
      await onSubmit(answers, submissionAttempt.current.id)
      setDone(true)
    } catch (error) {
      setSubmitError(error.message || 'Your screening could not be saved. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setAnswers(Array(questions.length).fill(null))
    setStep(0)
    setDone(false)
    setSubmitError('')
    submissionAttempt.current = { answers: '', id: uuidv4() }
    onReset?.()
  }

  if (done && result) return <ScoreResult result={result} title={title} onReset={reset} />

  const percent = questions.length ? Math.round(answered / questions.length * 100) : 0
  const selectedAnswer = answers[step]

  return (
    <form className="assessment-form" onSubmit={handleSubmit} noValidate aria-busy={saving}>
      <div className="assessment-progress-block">
        <div className="assessment-progress-top">
          <div className="assessment-step-list" aria-label="Question navigation">
            {questions.map((_, index) => {
              const answeredQuestion = answers[index] !== null
              return <button key={index} type="button" className={`assessment-step-dot${index === step ? ' is-current' : ''}${answeredQuestion ? ' is-answered' : ''}`} onClick={() => { setStep(index); setSubmitError('') }} disabled={saving} aria-label={`Question ${index + 1}${answeredQuestion ? ', answered' : ', not answered'}${index === step ? ', current' : ''}`} aria-current={index === step ? 'step' : undefined}>
                {answeredQuestion ? '✓' : index + 1}
              </button>
            })}
          </div>
          <span className="assessment-answered-count">{answered} of {questions.length} answered</span>
        </div>
        <div className="assessment-progress-track" role="progressbar" aria-label="Screening progress" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answered} aria-valuetext={`${answered} of ${questions.length} questions answered`}>
          <span style={{ width: `${percent}%`, '--assessment-accent': color }} />
        </div>
      </div>

      <fieldset className="assessment-question" key={step}>
        <legend className="assessment-sr-only">Question {step + 1} of {questions.length}</legend>
        <div className="assessment-question-meta" aria-live="polite">Question {step + 1} <span>of {questions.length}</span></div>
        <p className="assessment-timeframe">Over the past 2 weeks, how often have you been bothered by:</p>
        <h3 className="assessment-question-title" id={`assessment-question-${step}`}>{questions[step]}</h3>
        <div className="assessment-options" role="radiogroup" aria-labelledby={`assessment-question-${step}`}>
          {options.map(option => {
            const id = `assessment-${title.toLowerCase()}-${step}-${option.value}`
            return <label className={`assessment-option${selectedAnswer === option.value ? ' is-selected' : ''}`} key={option.value} htmlFor={id} style={{ '--assessment-accent': color }}>
              <input id={id} type="radio" name={`assessment-${title}-${step}`} value={option.value} checked={selectedAnswer === option.value} onChange={() => { setAnswers(current => current.map((answer, index) => index === step ? option.value : answer)); setSubmitError('') }} disabled={saving} />
              <span className="assessment-option-mark" aria-hidden="true" />
              <span>{option.label}</span>
            </label>
          })}
        </div>
      </fieldset>

      {lastAnswer !== null && lastAnswer > 0 && <aside className="assessment-live-safety" role="status" aria-live="polite">
        <ShieldCheck size={17} aria-hidden="true" />
        <p><strong>You deserve support with this.</strong> If you might act on these thoughts or are in immediate danger, contact your local emergency number or go to the nearest emergency department now. If you can, tell someone you trust and stay near them. <a href="https://findahelpline.com/" target="_blank" rel="noopener noreferrer">Find a verified support line for your country.</a></p>
      </aside>}

      {submitError && <p className="assessment-submit-error" role="alert">{submitError}</p>}

      <div className="assessment-form-actions">
        <button type="button" className="assessment-secondary-button" onClick={() => { setStep(current => Math.max(0, current - 1)); setSubmitError('') }} disabled={step === 0 || saving}>
          <ArrowLeft size={15} /> Previous
        </button>
        {step < questions.length - 1 ? <button type="button" className="assessment-primary-button" style={{ '--assessment-accent': color }} onClick={() => { setStep(current => Math.min(questions.length - 1, current + 1)); setSubmitError('') }} disabled={selectedAnswer === null || saving}>
          Next question <ArrowRight size={15} />
        </button> : <button type="submit" className="assessment-primary-button" style={{ '--assessment-accent': color }} disabled={!allAnswered || saving}>
          {saving ? <><span className="assessment-button-spinner" aria-hidden="true" /> Saving your result…</> : <>See my result <CheckCircle size={15} /></>}
        </button>}
      </div>
    </form>
  )
}

export default function Assessment() {
  const { setPhq9Result, phq9Result } = useApp()
  const [questions, setQuestions] = useState({ phq9: [], options: FALLBACK_OPTIONS })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    getQuestions()
      .then(({ data }) => {
        if (!Array.isArray(data?.phq9) || data.phq9.length !== 9) {
          throw new Error('The screening questions are unavailable right now.')
        }
        if (active) setQuestions({ phq9: data.phq9, options: Array.isArray(data.options) && data.options.length === 4 ? data.options : FALLBACK_OPTIONS })
      })
      .catch(error => { if (active) setLoadError(error.message || 'The screening questions could not be loaded. Please try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  const current = {
    label: 'PHQ-9',
    color: '#3f8060',
    items: questions.phq9,
    result: phq9Result,
    submit: async (answers, submissionId) => { const { data } = await submitPHQ9(answers, submissionId); setPhq9Result(data) },
    reset: () => setPhq9Result(null),
  }

  return (
    <main className="assessment-page">
      <div className="assessment-content">
        <header className="assessment-header">
          <span className="assessment-header-icon"><ClipboardList size={20} /></span>
          <div><p className="assessment-kicker">A PRIVATE CHECK-IN</p><h1>Wellbeing screening</h1><p>The PHQ-9 asks about mood and interest over the past two weeks. It can support reflection, but it cannot diagnose a condition. Take your time and change any answer before you submit.</p></div>
        </header>

        <section className="assessment-card" aria-labelledby="assessment-card-title">
          <div className="assessment-card-heading"><div><p className="assessment-kicker">{current.label}</p><h2 id="assessment-card-title">Patient Health Questionnaire</h2><p>Think about the past two weeks. You can move back to change any answer.</p></div></div>
          {loading ? <div className="assessment-loading" role="status"><span className="assessment-spinner" />Loading the questions…</div> : loadError ? <div className="assessment-load-error" role="alert"><p>{loadError}</p><button type="button" onClick={() => setReload(value => value + 1)}>Try again</button></div> : <AssessmentForm title={current.label} questions={current.items} options={questions.options} onSubmit={current.submit} result={current.result} color={current.color} onReset={current.reset} />}
        </section>

        <p className="assessment-footer-note">The PHQ-9 is a screening tool, not a medical diagnosis. Your responses are saved privately to your account so you can review your score in Insights later.</p>
      </div>
    </main>
  )
}
