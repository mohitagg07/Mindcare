import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  Cloud,
  Meh,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Smile,
  Sun,
  Waves,
  X,
} from 'lucide-react'
import { api, getAssessmentHistory } from '../api/client'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

const MOODS = [
  {
    id: 'good',
    label: 'Good',
    Icon: Sun,
    prompt: "I'm feeling pretty good today. Help me understand what's going well and how I can keep it going.",
    reply: 'It might be worth noticing what is helping today.',
  },
  {
    id: 'okay',
    label: 'Okay',
    Icon: Smile,
    prompt: "I'm feeling okay, but I'd like to check in with myself for a moment.",
    reply: 'You don’t need to feel a certain way to check in.',
  },
  {
    id: 'tense',
    label: 'Tense',
    Icon: Meh,
    prompt: "I'm feeling tense right now. Can you help me slow down and work out what's weighing on me?",
    reply: 'We can take it one thing at a time.',
  },
  {
    id: 'low',
    label: 'Low',
    Icon: Cloud,
    prompt: "I've been feeling low. I'd like a gentle conversation to work out what I need right now.",
    reply: 'You don’t have to figure everything out right now.',
  },
  {
    id: 'overwhelmed',
    label: 'Overwhelmed',
    Icon: Waves,
    prompt: "I'm feeling overwhelmed. Can you help me focus on one manageable next step?",
    reply: 'Let’s start with just one thing.',
  },
]

function safeDate(value, timezone, options = {}) {
  if (!value) return 'Recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  try {
    return date.toLocaleDateString(undefined, {
      ...options,
      ...(timezone ? { timeZone: timezone } : {}),
    })
  } catch {
    return date.toLocaleDateString(undefined, options)
  }
}

function greeting(timezone) {
  const hour = (() => {
    try {
      return Number(new Intl.DateTimeFormat('en', {
        hour: '2-digit',
        hourCycle: 'h23',
        timeZone: timezone || undefined,
      }).format(new Date()))
    } catch {
      return new Date().getHours()
    }
  })()

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function activityTitle(item) {
  if (item.kind === 'assessment') {
    const instrument = String(item.instrument || 'Self-check').toUpperCase()
    return `${instrument} check-in`
  }
  return item.title || 'Conversation'
}

export default function Dashboard() {
  const { setActivePage, setSessionId, setPendingChatPrompt } = useApp()
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [assessments, setAssessments] = useState([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityErrors, setActivityErrors] = useState({ sessions: false, assessments: false })
  const [reloadKey, setReloadKey] = useState(0)
  const [mood, setMood] = useState(null)

  const timezone = user?.timezone || 'Asia/Kolkata'
  const firstName = String(user?.display_name || user?.username || '').trim().split(/\s+/)[0]
  const today = safeDate(new Date(), timezone, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    let alive = true
    setActivityLoading(true)

    Promise.allSettled([api.mySessions(), getAssessmentHistory()])
      .then(([sessionResult, assessmentResult]) => {
        if (!alive) return

        const sessionsOk = sessionResult.status === 'fulfilled' && Array.isArray(sessionResult.value?.data)
        const assessmentsOk = assessmentResult.status === 'fulfilled' && Array.isArray(assessmentResult.value?.data?.history)

        setSessions(sessionsOk ? sessionResult.value.data : [])
        setAssessments(assessmentsOk ? assessmentResult.value.data.history : [])
        setActivityErrors({ sessions: !sessionsOk, assessments: !assessmentsOk })
      })
      .finally(() => {
        if (alive) setActivityLoading(false)
      })

    return () => { alive = false }
  }, [reloadKey])

  const recent = useMemo(() => {
    const items = [
      ...sessions.map(item => ({
        kind: 'chat',
        id: item.session_id,
        title: item.title || 'Conversation',
        date: item.started_at || item.created_at,
        detail: `${item.message_count || 0} ${Number(item.message_count || 0) === 1 ? 'message' : 'messages'}`,
        session: item,
      })),
      ...assessments.map(item => ({
        kind: 'assessment',
        id: item.id,
        instrument: item.instrument,
        date: item.completed_at || item.created_at,
        detail: 'Completed check-in',
        item,
      })),
    ]

    return items
      .filter(item => item.id || item.date)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 3)
  }, [sessions, assessments])

  const selectedMood = MOODS.find(item => item.id === mood)
  const allActivityRequestsFailed = activityErrors.sessions && activityErrors.assessments
  const someActivityRequestFailed = activityErrors.sessions || activityErrors.assessments

  const startChat = (prompt = '') => {
    if (prompt) setPendingChatPrompt?.(prompt)
    setActivePage('chat')
  }

  const resume = session => {
    if (session?.session_id) setSessionId?.(session.session_id)
    setActivePage('chat')
  }

  return (
    <main className="mcd-page">
      <div className="mcd-content">
        <header className="mcd-heading">
          <p className="mcd-date">{today}</p>
          <h1>{greeting(timezone)}{firstName ? `, ${firstName}` : ''}<span>.</span></h1>
          <p className="mcd-subtitle">Take a moment for yourself. Start wherever you are.</p>
        </header>

        <div className="mcd-top-grid">
          <section className="mcd-start-card" aria-labelledby="mcd-start-title">
            <p className="mcd-eyebrow">START HERE</p>
            <h2 id="mcd-start-title">What’s on your mind?</h2>
            <p className="mcd-start-copy">You don’t need the right words. A thought, a feeling, or even “I’m not sure” is enough.</p>
            <div className="mcd-start-actions">
              <button type="button" className="mcd-button-primary" onClick={() => startChat()}>
                <MessageCircle size={17} strokeWidth={1.9} />
                Start a conversation
                <ArrowUpRight size={15} />
              </button>
              <button type="button" className="mcd-button-text" onClick={() => setActivePage('assessment')}>
                Take a check-in <ArrowRight size={15} />
              </button>
            </div>
          </section>

          <section className="mcd-activity-card" aria-labelledby="mcd-activity-title">
            <div className="mcd-card-heading">
              <div>
                <p className="mcd-eyebrow">YOUR SPACE</p>
                <h2 id="mcd-activity-title">Recent activity</h2>
              </div>
              {recent.length > 0 && !activityLoading && (
                <button type="button" className="mcd-icon-link" onClick={() => setActivePage('metrics')} aria-label="View all activity" title="View all activity">
                  <ArrowUpRight size={17} />
                </button>
              )}
            </div>

            {activityLoading ? (
              <div className="mcd-activity-skeleton" role="status" aria-label="Loading recent activity">
                <span /><span /><span />
              </div>
            ) : allActivityRequestsFailed ? (
              <div className="mcd-activity-message" role="alert">
                <p>We couldn’t load your activity just now.</p>
                <button type="button" onClick={() => setReloadKey(key => key + 1)}><RotateCcw size={14} /> Try again</button>
              </div>
            ) : recent.length > 0 ? (
              <div className="mcd-activity-list">
                {recent.slice(0, 3).map(item => (
                  <button
                    type="button"
                    className="mcd-activity-row"
                    key={`${item.kind}-${item.id || item.date}`}
                    onClick={() => item.kind === 'chat' ? resume(item.session) : setActivePage('metrics')}
                  >
                    <span className={`mcd-activity-type ${item.kind === 'assessment' ? 'is-checkin' : ''}`}>
                      {item.kind === 'chat' ? <MessageCircle size={16} /> : <BookOpen size={16} />}
                    </span>
                    <span className="mcd-activity-copy">
                      <strong>{activityTitle(item)}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <time>{safeDate(item.date, timezone, { month: 'short', day: 'numeric' })}</time>
                    <ChevronRight className="mcd-activity-chevron" size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="mcd-activity-empty">
                <p className="mcd-empty-title">Nothing to pick up yet.</p>
                <p>Your conversations and completed check-ins will show up here.</p>
                <button type="button" onClick={() => startChat()}>Start your first conversation <ArrowRight size={14} /></button>
              </div>
            )}

            {!activityLoading && someActivityRequestFailed && !allActivityRequestsFailed && (
              <p className="mcd-partial-warning" role="status">Some activity couldn’t be loaded. <button type="button" onClick={() => setReloadKey(key => key + 1)}>Retry</button></p>
            )}
          </section>
        </div>

        <section className="mcd-checkin" aria-labelledby="mcd-checkin-title">
          <div className="mcd-checkin-heading">
            <div>
              <p className="mcd-eyebrow">A SMALL CHECK-IN</p>
              <h2 id="mcd-checkin-title">How are you feeling today?</h2>
            </div>
            <span className="mcd-not-saved">Just for this moment</span>
          </div>
          <div className="mcd-mood-options" role="group" aria-label="Choose how you feel">
            {MOODS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`mcd-mood-option${mood === id ? ' is-selected' : ''}`}
                onClick={() => setMood(id)}
                aria-pressed={mood === id}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
                {mood === id && <Check className="mcd-mood-check" size={13} aria-hidden="true" />}
              </button>
            ))}
          </div>
          {selectedMood && (
            <div className="mcd-mood-followup" role="status">
              <div className="mcd-mood-followup-copy">
                <strong>{selectedMood.reply}</strong>
                <span>Your selection isn’t saved. It only helps shape the conversation.</span>
              </div>
              <button type="button" className="mcd-followup-action" onClick={() => startChat(selectedMood.prompt)}>
                Talk about it <ArrowRight size={15} />
              </button>
              <button type="button" className="mcd-clear-mood" onClick={() => setMood(null)} aria-label="Clear selected feeling"><X size={15} /></button>
            </div>
          )}
        </section>

        <section className="mcd-other-ways" aria-labelledby="mcd-other-title">
          <div className="mcd-other-heading">
            <div>
              <p className="mcd-eyebrow">WHEN YOU NEED SOMETHING DIFFERENT</p>
              <h2 id="mcd-other-title">Other ways to check in</h2>
            </div>
          </div>
          <div className="mcd-other-grid">
            <button type="button" className="mcd-other-card" onClick={() => setActivePage('assessment')}>
              <span className="mcd-other-icon mcd-other-icon-check"><ClipboardCheck size={19} /></span>
              <span className="mcd-other-copy"><strong>Structured check-in</strong><small>Optional PHQ-9 and GAD-7 questionnaires</small></span>
              <ArrowUpRight className="mcd-other-arrow" size={16} />
            </button>
            <button type="button" className="mcd-other-card" onClick={() => setActivePage('emotion')}>
              <span className="mcd-other-icon mcd-other-icon-reflect"><Waves size={19} /></span>
              <span className="mcd-other-copy"><strong>Pause and reflect</strong><small>An optional reflection tool, at your pace</small></span>
              <ArrowUpRight className="mcd-other-arrow" size={16} />
            </button>
          </div>
        </section>

        <footer className="mcd-footer">
          <ShieldCheck size={14} aria-hidden="true" />
          <span>Your space is personal.</span>
          <span className="mcd-footer-divider" aria-hidden="true" />
          <span>MindCare offers support, not diagnosis.</span>
        </footer>
      </div>
    </main>
  )
}
