import { useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Compass, Heart,
  ShieldCheck, Sparkles,
} from 'lucide-react'
import { updateMyProfile } from '../api/client'
import './IdentityOnboarding.css'

const SUPPORT_STYLES = [
  { id: 'gentle', title: 'Gentle', description: 'Warm and reassuring', Icon: Heart },
  { id: 'practical', title: 'Practical', description: 'Clear, useful next steps', Icon: Compass },
  { id: 'reflective', title: 'Reflective', description: 'Space to explore', Icon: BookOpen },
]

const FOCUS_AREAS = [
  { id: 'stress', label: 'Stress' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'focus', label: 'Focus' },
  { id: 'self_compassion', label: 'Self-compassion' },
  { id: 'emotional_balance', label: 'Understanding feelings' },
  { id: 'other', label: 'Something else' },
]

function getInitialForm(profile) {
  return {
    display_name: profile?.display_name || '',
    pronouns: profile?.pronouns || '',
    support_style: profile?.support_style || 'gentle',
    focus_areas: Array.isArray(profile?.focus_areas) ? profile.focus_areas : [],
  }
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export default function IdentityOnboarding({ profile, onComplete }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => getInitialForm(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const preferredName = normalizeName(form.display_name)
  const validName = preferredName.length > 0 && preferredName.length <= 60 && /[\p{L}\p{N}]/u.test(preferredName)

  const setField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }))
    setError('')
  }

  const toggleFocus = (id) => {
    setForm(current => {
      const selected = current.focus_areas.includes(id)
      if (!selected && current.focus_areas.length >= 3) return current
      return {
        ...current,
        focus_areas: selected
          ? current.focus_areas.filter(item => item !== id)
          : [...current.focus_areas, id],
      }
    })
  }

  const submit = async event => {
    event.preventDefault()
    setError('')

    if (step === 1) {
      if (!validName) {
        setError('Enter the name you’d like MindCare to use to continue.')
        return
      }
      setSaving(true)
      try {
        // Save identity immediately. A refresh should never erase the user's first step.
        const { data } = await updateMyProfile({
          display_name: preferredName,
          pronouns: normalizeName(form.pronouns) || null,
        })
        setForm(current => ({ ...current, display_name: data?.display_name || preferredName }))
        setStep(2)
      } catch (err) {
        setError(err.message || 'We couldn’t save your name. Check your connection and try again.')
      } finally {
        setSaving(false)
      }
      return
    }

    setSaving(true)
    try {
      const { data } = await updateMyProfile({
        display_name: preferredName,
        pronouns: normalizeName(form.pronouns) || null,
        support_style: form.support_style,
        focus_areas: form.focus_areas,
      })
      onComplete?.(data)
    } catch (err) {
      setError(err.message || 'Your preferences could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mc-identity-page">
      <div className="mc-identity-botanical" aria-hidden="true" />
      <header className="mc-identity-brandbar">
        <div className="mc-identity-brand">
          <img src="/brand/mindcare-mark.png" alt="" />
          <span className="mc-identity-wordmark">mindcare<span>.</span><small>A CALMER YOU, EVERYDAY</small></span>
        </div>
        <div className="mc-identity-private"><ShieldCheck size={15} /> Private by default</div>
      </header>

      <div className={`mc-identity-layout${step === 2 ? ' is-step-two' : ''}`}>
        <section className="mc-identity-intro">
          <div className="mc-identity-kicker"><Sparkles size={14} /> A GOOD PLACE TO BEGIN</div>
          <h1>Make this feel<br /><em>like yours.</em></h1>
          <p>One small introduction helps MindCare feel more personal.</p>
          <div className="mc-identity-promise">
            <span className="mc-identity-promise-icon"><ShieldCheck size={17} /></span>
            <div><strong>A nickname is welcome.</strong><span>Use the name you’re comfortable with.</span></div>
          </div>
        </section>

        <section className="mc-identity-panel" aria-labelledby="mc-identity-title">
          <div className="mc-identity-progress-head">
            <span>YOUR INTRODUCTION</span><span>0{step} / 02</span>
          </div>
          <div className="mc-identity-progress" aria-label={`Step ${step} of 2`}><span style={{ width: step === 1 ? '50%' : '100%' }} /></div>

          <form onSubmit={submit} noValidate>
            {step === 1 ? (
              <div className="mc-identity-step">
                <h2 id="mc-identity-title">What should we call you?</h2>
                <p className="mc-identity-step-copy">A first name or nickname is perfect.</p>

                <label className="mc-identity-label" htmlFor="mc-preferred-name">Preferred name <span>Required *</span></label>
                <input
                  id="mc-preferred-name"
                  className="mc-identity-input"
                  name="preferred-name"
                  autoComplete="nickname"
                  required
                  aria-required="true"
                  maxLength={60}
                  value={form.display_name}
                  onChange={event => setField('display_name', event.target.value)}
                  placeholder="The name you go by"
                  aria-describedby="mc-preferred-name-help"
                />
                <small id="mc-preferred-name-help" className="mc-identity-help">Required to continue. You can change it later.</small>

                <label className="mc-identity-label mc-identity-label-spaced" htmlFor="mc-pronouns">Pronouns <span>Optional</span></label>
                <input
                  id="mc-pronouns"
                  className="mc-identity-input"
                  name="pronouns"
                  autoComplete="off"
                  maxLength={40}
                  value={form.pronouns}
                  onChange={event => setField('pronouns', event.target.value)}
                  placeholder="e.g. he/him"
                />
              </div>
            ) : (
              <div className="mc-identity-step">
                <h2 id="mc-identity-title">How should support feel?</h2>
                <p className="mc-identity-step-copy">Pick a style. You can change it anytime.</p>

                <div className="mc-identity-style-list" role="group" aria-label="Preferred support style">
                  {SUPPORT_STYLES.map(({ id, title, description, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`mc-identity-style${form.support_style === id ? ' is-selected' : ''}`}
                      onClick={() => setField('support_style', id)}
                      aria-pressed={form.support_style === id}
                    >
                      <span className="mc-identity-style-icon"><Icon size={17} /></span>
                      <span className="mc-identity-style-copy"><strong>{title}</strong><small>{description}</small></span>
                      <span className="mc-identity-style-check">{form.support_style === id && <Check size={13} />}</span>
                    </button>
                  ))}
                </div>

                <div className="mc-identity-focus-heading"><strong>Anything on your mind lately?</strong><span>Optional · up to 3</span></div>
                <div className="mc-identity-focus-list" role="group" aria-label="Optional topics">
                  {FOCUS_AREAS.map(({ id, label }) => {
                    const selected = form.focus_areas.includes(id)
                    const locked = !selected && form.focus_areas.length >= 3
                    return <button key={id} type="button" className={`mc-identity-focus${selected ? ' is-selected' : ''}`} onClick={() => toggleFocus(id)} aria-pressed={selected} disabled={locked}><span>{selected && <Check size={11} />}</span>{label}</button>
                  })}
                </div>
                <p className="mc-identity-memory-note"><ShieldCheck size={14} /> Your name and choices carry into future chats.</p>
              </div>
            )}

            {error && <div className="mc-identity-error" role="alert">{error}</div>}

            <div className="mc-identity-actions">
              {step === 2 && <button type="button" className="mc-identity-back" onClick={() => { setStep(1); setError('') }} disabled={saving}><ArrowLeft size={15} /> Back</button>}
              <button type="submit" className="mc-identity-continue" disabled={saving || (step === 1 && !validName)}>
                {saving ? 'Saving…' : step === 1 ? 'Continue' : 'Finish setup'}
                {!saving && <ArrowRight size={15} />}
              </button>
            </div>
          </form>
          <p className="mc-identity-footnote">Only share what feels right for you.</p>
        </section>
      </div>
    </main>
  )
}
