import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, ClipboardCheck,
  Heart, Leaf, MessageCircle, ShieldCheck, Sparkles, Sun, Waves, X,
} from 'lucide-react'
import { api, getAssessmentHistory } from '../api/client'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

const MOODS = [
  { id: 'good', label: 'Good', face: '☀️', hint: 'Keep this feeling close.', prompt: "I'm feeling pretty good today. Help me understand what's going well and how I can keep it going." },
  { id: 'okay', label: 'Okay', face: '🙂', hint: 'Okay is a place to start.', prompt: "I'm feeling okay, but I'd like to check in with myself for a moment." },
  { id: 'tense', label: 'Tense', face: '😬', hint: 'Let’s make things feel smaller.', prompt: "I'm feeling tense right now. Can you help me slow down and work out what's weighing on me?" },
  { id: 'low', label: 'Low', face: '🌧️', hint: 'You don’t have to solve it all.', prompt: "I've been feeling low. I'd like a gentle conversation to work out what I need right now." },
  { id: 'overwhelmed', label: 'A lot', face: '🌊', hint: 'One thing at a time.', prompt: "I'm feeling overwhelmed. Can you help me focus on one manageable next step?" },
]

const TOUR_STEPS = [
  { icon: MessageCircle, kicker: '01 / TALK', title: 'Let it out.', body: 'A conversation can start with just one sentence.', tint: 'mint' },
  { icon: ClipboardCheck, kicker: '02 / CHECK IN', title: 'Notice how you feel.', body: 'Optional reflections help you put things into perspective.', tint: 'peach' },
  { icon: ShieldCheck, kicker: '03 / YOUR SPACE', title: 'You stay in control.', body: 'Choose what to share, what to save, and what to revisit.', tint: 'lavender' },
]

function safeDate(value, timezone, options) {
  if (!value) return 'Recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  try { return date.toLocaleDateString(undefined, { ...options, ...(timezone ? { timeZone: timezone } : {}) }) }
  catch { return date.toLocaleDateString(undefined, options) }
}

function greeting(timezone) {
  const hour = (() => { try { return Number(new Intl.DateTimeFormat('en', { hour: '2-digit', hourCycle: 'h23', timeZone: timezone || undefined }).format(new Date())) } catch { return new Date().getHours() } })()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { setActivePage, setSessionId, setPendingChatPrompt } = useApp()
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [assessments, setAssessments] = useState([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [mood, setMood] = useState(null)
  const [tourOpen, setTourOpen] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const tz = user?.timezone || 'Asia/Kolkata'
  const firstName = String(user?.display_name || '').trim().split(/\s+/)[0] || ''
  const initials = (user?.display_name || user?.username || user?.email || 'U').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

  useEffect(() => {
    let alive = true
    Promise.allSettled([api.mySessions(), getAssessmentHistory()]).then(([sessionResult, assessmentResult]) => {
      if (!alive) return
      if (sessionResult.status === 'fulfilled' && Array.isArray(sessionResult.value.data)) setSessions(sessionResult.value.data)
      if (assessmentResult.status === 'fulfilled' && Array.isArray(assessmentResult.value.data?.history)) setAssessments(assessmentResult.value.data.history)
    }).finally(() => { if (alive) setActivityLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!user?.id || activityLoading) return
    const key = `mindcare-tour-seen-${user.id}`
    const hasHistory = sessions.length > 0 || assessments.length > 0
    try { setTourOpen(!hasHistory && !localStorage.getItem(key)) } catch { setTourOpen(false) }
  }, [user?.id, activityLoading, sessions.length, assessments.length])

  const finishTour = () => {
    try { if (user?.id) localStorage.setItem(`mindcare-tour-seen-${user.id}`, '1') } catch { /* storage may be disabled */ }
    setTourOpen(false)
  }

  const startChat = (prompt = '') => {
    if (prompt) setPendingChatPrompt?.(prompt)
    setActivePage('chat')
  }

  const resume = (session) => {
    if (session?.session_id) setSessionId?.(session.session_id)
    setActivePage('chat')
  }

  const recent = useMemo(() => {
    const items = [
      ...sessions.map(item => ({ kind: 'chat', id: item.session_id, title: item.title || 'Conversation', date: item.started_at || item.created_at, detail: `${item.message_count || 0} messages`, session: item })),
      ...assessments.map(item => ({ kind: 'assessment', id: item.id, title: `${item.instrument || 'Self-check'} check-in`, date: item.completed_at, detail: 'Reflection saved', item })),
    ]
    return items.filter(item => item.date || item.id).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 3)
  }, [sessions, assessments])

  const selectedMood = MOODS.find(item => item.id === mood)
  const tour = TOUR_STEPS[tourStep]
  const TourIcon = tour.icon

  return (
    <div className="home-page">
      <div className="home-content">
        <header className="home-greeting-row">
          <div>
            <div className="home-date"><span className="home-date-dot" /> {safeDate(new Date(), tz, { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</div>
            <h1>{greeting(tz)}{firstName ? `, ${firstName}` : ''}<span className="home-greeting-period">.</span></h1>
            <p>What would help, right now?</p>
          </div>
          <button type="button" className="home-profile-shortcut" onClick={() => setActivePage('profile')} aria-label="Open profile">
            <span className={`home-avatar mc-avatar-${user?.avatar_tone || 'sage'}${user?.avatar_url ? ' has-photo' : ''}`}>{user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}</span>
            <span className="home-profile-shortcut-copy"><strong>Your space</strong><small>Personalized for you</small></span>
            <ChevronRight size={16} />
          </button>
        </header>

        {!String(user?.display_name || '').trim() && (
          <section className="home-personalize-card" aria-label="Personalize your space">
            <span className="home-personalize-mark"><Sparkles size={18} /></span>
            <div className="home-personalize-copy"><strong>Make this space yours</strong><span>Add the name you prefer, your birthday if useful, and a photo. MindCare can then address you more naturally.</span></div>
            <button type="button" onClick={() => setActivePage('profile')}>Set up profile <ArrowRight size={15} /></button>
          </section>
        )}

        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-hero-kicker"><Sparkles size={13} /> A MOMENT FOR YOU</span>
            <h2>Come as<br /><em>you are.</em></h2>
            <p>No perfect words needed.</p>
            <div className="home-hero-actions">
              <button type="button" className="home-primary" onClick={() => startChat()}><MessageCircle size={17} /> Talk it out <ArrowUpRight size={15} /></button>
              <button type="button" className="home-quiet-action" onClick={() => setActivePage('assessment')}>Check in <ArrowRight size={15} /></button>
            </div>
          </div>
          <div className="home-visual" aria-hidden="true">
            <div className="home-visual-glow" />
            <div className="home-visual-orbit orbit-a" />
            <div className="home-visual-orbit orbit-b" />
            <div className="home-visual-orbit orbit-c" />
            <div className="home-visual-center"><Heart size={34} strokeWidth={1.5} /></div>
            <div className="home-floating-note note-top"><span className="home-note-icon"><Sun size={14} /></span><span><b>A little pause</b><small>is enough to begin</small></span></div>
            <div className="home-floating-note note-bottom"><span className="home-note-dot" /><span><b>Your pace</b><small>always</small></span></div>
          </div>
          <div className="home-hero-grain" />
        </section>

        <section className="home-checkin-section" aria-labelledby="home-mood-title">
          <div className="home-section-head">
            <div><span className="home-overline">QUICK CHECK-IN</span><h3 id="home-mood-title">How are you arriving?</h3></div>
            <span className="home-section-aside">Just for this moment</span>
          </div>
          <div className="home-mood-row">
            {MOODS.map(item => (
              <button key={item.id} type="button" onClick={() => setMood(item.id)} className={`home-mood-option${mood === item.id ? ' is-selected' : ''}`} aria-pressed={mood === item.id}>
                <span className="home-mood-face" aria-hidden="true">{item.face}</span><span>{item.label}</span>{mood === item.id && <Check size={13} className="home-mood-check" />}
              </button>
            ))}
          </div>
          {selectedMood && (
            <div className="home-mood-followup" role="status">
              <div><strong>{selectedMood.hint}</strong><span>Not saved — just a conversation starter.</span></div>
              <button type="button" onClick={() => startChat(selectedMood.prompt)}>Put it into words <ArrowRight size={15} /></button>
              <button type="button" className="home-mood-dismiss" aria-label="Clear mood selection" onClick={() => setMood(null)}><X size={14} /></button>
            </div>
          )}
        </section>

        <section className="home-tools-section">
          <div className="home-section-head"><div><span className="home-overline">YOUR NEXT STEP</span><h3>Choose what feels right.</h3></div></div>
          <div className="home-tools-grid">
            <button type="button" className="home-tool-card home-tool-talk" onClick={() => startChat()}>
              <span className="home-tool-art"><MessageCircle size={22} /></span><span className="home-tool-name">Talk</span><span className="home-tool-description">Untangle a thought</span><ArrowUpRight className="home-tool-arrow" size={17} />
            </button>
            <button type="button" className="home-tool-card home-tool-check" onClick={() => setActivePage('assessment')}>
              <span className="home-tool-art"><ClipboardCheck size={22} /></span><span className="home-tool-name">Check in</span><span className="home-tool-description">PHQ-9 · GAD-7</span><ArrowUpRight className="home-tool-arrow" size={17} />
            </button>
            <button type="button" className="home-tool-card home-tool-reflect" onClick={() => setActivePage('emotion')}>
              <span className="home-tool-art"><Waves size={22} /></span><span className="home-tool-name">Reflect</span><span className="home-tool-description">Take a quiet pause</span><ArrowUpRight className="home-tool-arrow" size={17} />
            </button>
          </div>
        </section>

        <section className="home-recent-section">
          <div className="home-section-head"><div><span className="home-overline">YOUR SPACE</span><h3>Pick up where you left off.</h3></div><button type="button" className="home-text-link" onClick={() => setActivePage('metrics')}>View insights <ArrowRight size={14} /></button></div>
          {recent.length > 0 ? (
            <div className="home-recent-list">
              {recent.map(item => (
                <button type="button" className="home-recent-item" key={`${item.kind}-${item.id}`} onClick={() => item.kind === 'chat' ? resume(item.session) : setActivePage('metrics')}>
                  <span className={`home-recent-icon ${item.kind === 'assessment' ? 'is-assessment' : ''}`}>{item.kind === 'chat' ? <MessageCircle size={17} /> : <BookOpen size={17} />}</span>
                  <span className="home-recent-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
                  <time>{safeDate(item.date, tz, { month: 'short', day: 'numeric' })}</time><ChevronRight size={16} className="home-recent-chevron" />
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="home-first-step" onClick={() => startChat()}>
              <span className="home-first-step-icon"><Leaf size={19} /></span><span><strong>Your story starts here.</strong><small>{activityLoading ? 'Getting your space ready…' : 'Your recent activity will appear here.'}</small></span><ArrowUpRight size={17} />
            </button>
          )}
        </section>

        <div className="home-footnote"><ShieldCheck size={14} /><span>Private to your account</span><i /> <span>Support, not diagnosis</span><button type="button" onClick={() => { setTourStep(0); setTourOpen(true) }}>How it works</button></div>
      </div>

      {tourOpen && (
        <div className="home-tour-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) finishTour() }}>
          <section className="home-tour-modal" role="dialog" aria-modal="true" aria-labelledby="home-tour-title">
            <button type="button" className="home-tour-close" onClick={finishTour} aria-label="Close introduction"><X size={17} /></button>
            <div className={`home-tour-icon tint-${tour.tint}`}><TourIcon size={25} /></div>
            <div className="home-tour-step">A QUICK TOUR <span>{tourStep + 1} / {TOUR_STEPS.length}</span></div>
            <h2 id="home-tour-title">{tour.title}</h2><p>{tour.body}</p>
            <div className="home-tour-progress">{TOUR_STEPS.map((step, index) => <span key={step.kicker} className={index <= tourStep ? 'is-filled' : ''} />)}</div>
            <div className="home-tour-actions"><button type="button" className="home-tour-skip" onClick={finishTour}>Skip</button><button type="button" className="home-primary" onClick={() => tourStep < TOUR_STEPS.length - 1 ? setTourStep(step => step + 1) : finishTour()}>{tourStep < TOUR_STEPS.length - 1 ? 'Next' : 'Let’s begin'} <ArrowRight size={15} /></button></div>
          </section>
        </div>
      )}
    </div>
  )
}
