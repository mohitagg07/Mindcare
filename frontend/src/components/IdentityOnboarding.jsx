import { useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Compass, Heart,
  ShieldCheck, Sparkles,
} from 'lucide-react'
import { updateMyProfile } from '../api/client'
import './IdentityOnboarding.css'

const SUPPORT_STYLES = [
  {
    id: 'gentle',
    title: 'Gentle and reassuring',
    description: 'Warmth first. Advice only when it helps.',
    Icon: Heart,
  },
  {
    id: 'practical',
    title: 'Practical and focused',
    description: 'Clear words and one manageable next step.',
    Icon: Compass,
  },
  {
    id: 'reflective',
    title: 'Thoughtful and reflective',
    description: 'Space to explore what you feel and what matters.',
    Icon: BookOpen,
  },
]

const FOCUS_AREAS = [
  { id: 'stress', label: 'Everyday stress' },
  { id: 'sleep', label: 'Rest and sleep' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'focus', label: 'Focus and balance' },
  { id: 'self_compassion', label: 'Self-compassion' },
  { id: 'emotional_balance', label: 'Understanding my feelings' },
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

export default function IdentityOnboarding({ profile, onComplete, onSkip }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => getInitialForm(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      const name = form.display_name.trim().replace(/\s+/g, ' ')
      if (!name) {
        setError('Add a preferred name, or choose “Do this later” if you would rather skip setup.')
        return
      }
      if (name.length > 60) {
        setError('Please keep your preferred name under 60 characters.')
        return
      }
      setField('display_name', name)
      setStep(2)
      return
    }

    setSaving(true)
    try {
      const { data } = await updateMyProfile({
        display_name: form.display_name.trim().replace(/\s+/g, ' '),
        pronouns: form.pronouns.trim().replace(/\s+/g, ' ') || null,
        support_style: form.support_style,
        focus_areas: form.focus_areas,
      })
      onComplete?.(data)
    } catch (err) {
      setError(err.message || 'Your details could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mc-identity-page">
      <header className="mc-identity-brandbar">
        <div className="mc-identity-brand">
          <img src="/brand/mindcare-mark.png" alt="" />
          <span className="mc-identity-wordmark">mindcare<span>.</span><small>A CALMER YOU, EVERYDAY</small></span>
        </div>
        <div className="mc-identity-private"><ShieldCheck size={15} /> Your account, your choices</div>
      </header>

      <div className="mc-identity-layout">
        <section className="mc-identity-intro">
          <div className="mc-identity-kicker"><Sparkles size={14} /> A GOOD PLACE TO BEGIN</div>
          <h1>Let’s make this<br /><em>feel like your space.</em></h1>
          <p>A couple of small choices help MindCare speak to you more naturally. Share only what feels comfortable.</p>
          <div className="mc-identity-promise">
            <span className="mc-identity-promise-icon"><ShieldCheck size={17} /></span>
            <div><strong>No need for your legal name.</strong><span>A nickname is fine. Your profile can be changed at any time.</span></div>
          </div>
        </section>

        <section className="mc-identity-panel" aria-labelledby="mc-identity-title">
          <div className="mc-identity-progress-head">
            <span>YOUR INTRODUCTION</span><span>STEP {step} OF 2</span>
          </div>
          <div className="mc-identity-progress" aria-hidden="true"><span style={{ width: step === 1 ? '50%' : '100%' }} /></div>

          <form onSubmit={submit} noValidate>
            {step === 1 ? (
              <div className="mc-identity-step">
                <h2 id="mc-identity-title">What should we call you?</h2>
                <p className="mc-identity-step-copy">Your account username is just a handle. This is the name MindCare can use when talking with you.</p>

                <label className="mc-identity-label" htmlFor="mc-preferred-name">Preferred name <span>Required to personalize your welcome</span></label>
                <input
                  id="mc-preferred-name"
                  className="mc-identity-input"
                  name="preferred-name"
                  autoComplete="nickname"
                  autoFocus
                  maxLength={60}
                  value={form.display_name}
                  onChange={event => setField('display_name', event.target.value)}
                  placeholder="The name you like to hear"
                  aria-describedby="mc-preferred-name-help"
                />
                <small id="mc-preferred-name-help" className="mc-identity-help">First name, chosen name, or nickname — your call.</small>

                <label className="mc-identity-label mc-identity-label-spaced" htmlFor="mc-pronouns">Pronouns <span>Optional</span></label>
                <input
                  id="mc-pronouns"
                  className="mc-identity-input"
                  name="pronouns"
                  autoComplete="off"
                  maxLength={40}
                  value={form.pronouns}
                  onChange={event => setField('pronouns', event.target.value)}
                  placeholder="e.g. he/him, she/her, they/them"
                />
                <small className="mc-identity-help">Leave this blank if you prefer not to share it.</small>
              </div>
            ) : (
              <div className="mc-identity-step">
                <h2 id="mc-identity-title">How can we support you?</h2>
                <p className="mc-identity-step-copy">Choose the kind of response that feels most helpful. You can change this whenever you like.</p>

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

                <div className="mc-identity-focus-heading"><strong>Anything you would like space for?</strong><span>Optional · choose up to 3</span></div>
                <div className="mc-identity-focus-list" role="group" aria-label="Topics you may want support with">
                  {FOCUS_AREAS.map(({ id, label }) => {
                    const selected = form.focus_areas.includes(id)
                    const locked = !selected && form.focus_areas.length >= 3
                    return <button key={id} type="button" className={`mc-identity-focus${selected ? ' is-selected' : ''}`} onClick={() => toggleFocus(id)} aria-pressed={selected} disabled={locked}><span>{selected && <Check size={12} />}</span>{label}</button>
                  })}
                </div>

                <div className="mc-identity-memory-note">
                  <ShieldCheck size={17} />
                  <p><strong>Your choices carry across conversations.</strong> MindCare receives your saved name and preferences when it replies. It uses the current chat too, but it does not automatically save every detail from other chats as a permanent memory.</p>
                </div>
              </div>
            )}

            {error && <div className="mc-identity-error" role="alert">{error}</div>}

            <div className="mc-identity-actions">
              {step === 2 ? (
                <button type="button" className="mc-identity-back" onClick={() => { setStep(1); setError('') }} disabled={saving}><ArrowLeft size={15} /> Back</button>
              ) : (
                <button type="button" className="mc-identity-back" onClick={onSkip} disabled={saving}>Do this later</button>
              )}
              <button type="submit" className="mc-identity-continue" disabled={saving}>
                {saving ? 'Saving your choices…' : step === 1 ? 'Continue' : 'Save and continue'}
                {!saving && <ArrowRight size={15} />}
              </button>
            </div>
          </form>
          <p className="mc-identity-footnote">Your wellbeing space is yours. You decide what to share.</p>
        </section>
      </div>
    </main>
  )
}
