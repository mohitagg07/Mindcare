import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  Compass,
  Footprints,
  MessageCircle,
  RotateCcw,
  UserRound,
} from 'lucide-react'
import { api, getAssessmentHistory } from '../api/client'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { getAssessmentDisplayTitle } from '../assessment/display.js'
import './Dashboard.css'

const STARTING_POINTS = [
  {
    id: 'talk',
    label: 'Talk it through',
    description: 'A little space to say what is on your mind.',
    helper: 'We can start with whatever feels most important to you.',
    actionLabel: 'Start talking',
    Icon: MessageCircle,
    prompt: "I'd like you to listen first. Help me put words to what's on my mind without rushing to advice.",
  },
  {
    id: 'clarity',
    label: 'Get some clarity',
    description: 'Untangle a thought or feeling, one piece at a time.',
    helper: 'We can slow things down and look at one piece at a time.',
    actionLabel: 'Work it through',
    Icon: Compass,
    prompt: "Help me sort through something on my mind. Ask gentle questions and help me find some clarity before suggesting solutions.",
  },
  {
    id: 'next-step',
    label: 'Find a next step',
    description: 'Think through one small, realistic thing you could do.',
    helper: 'We will keep the next step small and manageable.',
    actionLabel: 'Find a next step',
    Icon: Footprints,
    prompt: "Help me identify one small, realistic next step for what's on my mind. Keep it practical and don't overwhelm me with a long list.",
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
  if (item.kind === 'assessment') return getAssessmentDisplayTitle(item.instrument)
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
  const [selectedIntentId, setSelectedIntentId] = useState(null)

  const timezone = user?.timezone || 'Asia/Kolkata'
  const firstName = String(user?.display_name || '').trim().split(/\s+/)[0]
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

  const selectedIntent = STARTING_POINTS.find(item => item.id === selectedIntentId) || null
  const allActivityRequestsFailed = activityErrors.sessions && activityErrors.assessments
  const someActivityRequestFailed = activityErrors.sessions || activityErrors.assessments

  const startChat = (prompt = '') => {
    if (prompt) setPendingChatPrompt?.(prompt)
    setActivePage('chat')
  }

  const startSelectedConversation = () => {
    if (!selectedIntent) return
    startChat(selectedIntent.prompt)
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
          <p className="mcd-subtitle">No need to have it all figured out. Start where you are.</p>
        </header>

        {!String(user?.display_name || '').trim() && (
          <section className="mcd-setup-nudge" aria-label="Personalize your account">
            <span className="mcd-setup-nudge-icon"><UserRound size={16} /></span>
            <div><strong>Make this space feel like yours.</strong><p>Choose a preferred name and how you like to be supported.</p></div>
            <button type="button" onClick={() => setActivePage('profile')}>Personalize <ArrowRight size={14} /></button>
          </section>
        )}

        <div className="mcd-home-grid">
          <section className="mcd-start-card" aria-labelledby="mcd-start-title">
            <p className="mcd-eyebrow">A PLACE TO START</p>
            <h2 id="mcd-start-title">What would help right now?</h2>
            <p className="mcd-start-copy">Pick the option that feels closest. You can change direction any time.</p>

            <div className="mcd-intent-list" role="group" aria-label="Choose how you'd like to begin">
              {STARTING_POINTS.map(({ id, label, description, Icon }) => {
                const selected = selectedIntentId === id
                return (
                  <button
                    key={id}
                    type="button"
                    className={`mcd-intent-option${selected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedIntentId(id)}
                    aria-pressed={selected}
                  >
                    <span className="mcd-intent-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.8} /></span>
                    <span className="mcd-intent-copy">
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </span>
                    <span className="mcd-intent-radio" aria-hidden="true">{selected && <Check size={13} strokeWidth={2.5} />}</span>
                  </button>
                )
              })}
            </div>

            <div className="mcd-start-footer">
              <p aria-live="polite">{selectedIntent ? selectedIntent.helper : 'Choose a starting point to continue.'}</p>
              {selectedIntent && (
                <button type="button" className="mcd-button-primary" onClick={startSelectedConversation}>
                  {selectedIntent.actionLabel} <ArrowRight size={15} />
                </button>
              )}
            </div>

            <button type="button" className="mcd-checkin-link" onClick={() => setActivePage('assessment')}>
              Prefer guided questions? Take a check-in <ChevronRight size={15} />
            </button>
          </section>

          <section className="mcd-activity-card" aria-labelledby="mcd-activity-title">
            <div className="mcd-card-heading">
              <div>
                <p className="mcd-eyebrow">PICK UP WHERE YOU LEFT OFF</p>
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
                {recent.map(item => (
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
            ) : someActivityRequestFailed ? (
              <div className="mcd-activity-message" role="status">
                <p>Some of your activity is still unavailable, so this list may be incomplete.</p>
                <button type="button" onClick={() => setReloadKey(key => key + 1)}><RotateCcw size={14} /> Retry activity</button>
              </div>
            ) : (
              <div className="mcd-activity-empty">
                <p className="mcd-empty-title">Nothing to pick up yet.</p>
                <p>Your conversations and completed check-ins will show up here.</p>
                <button type="button" onClick={() => startChat()}>Start your first conversation <ArrowRight size={14} /></button>
              </div>
            )}

            {!activityLoading && recent.length > 0 && someActivityRequestFailed && !allActivityRequestsFailed && (
              <p className="mcd-partial-warning" role="status">Some activity couldn’t be loaded. <button type="button" onClick={() => setReloadKey(key => key + 1)}>Retry</button></p>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
