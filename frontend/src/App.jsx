import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp } from './context/AppContext'
import AuthGate from './components/AuthGate'
import Landing from './pages/Landing'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import Assessment from './components/Assessment'
import EmotionDetector from './components/EmotionDetector'
import Dashboard from './components/Dashboard'
import Metrics from './components/Metrics'
import Profile from './components/Profile'
import IdentityOnboarding from './components/IdentityOnboarding'
import { getMyProfile } from './api/client'
import { Menu, Sparkles } from 'lucide-react'

const pageMeta = {
  dashboard: { eyebrow: 'HOME', title: 'A little room for you' },
  chat: { eyebrow: 'TALK', title: 'Start wherever you are' },
  assessment: { eyebrow: 'CHECK IN', title: 'Take a moment' },
  emotion: { eyebrow: 'REFLECT', title: 'Pause and notice' },
  metrics: { eyebrow: 'INSIGHTS', title: 'Your patterns' },
  profile: { eyebrow: 'PROFILE', title: 'Make it yours' },
}

function LoadingScreen() {
  return (
    <div className="mc-loading-screen">
      <div className="mc-loading-mark"><img src="/brand/mindcare-mark.png" alt="" /></div>
      <div className="mc-loading-title">mindcare<span>.</span></div>
      <p>Preparing your space…</p>
      <span className="mc-loader" />
    </div>
  )
}

function AppRouter() {
  const { isAuthed, loading, authFlow, authNotice } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('login')

  useEffect(() => {
    if (authNotice || authFlow === 'recovery') setShowAuth(true)
  }, [authNotice, authFlow])

  if (loading) return <LoadingScreen />
  if (authFlow === 'recovery') return <AuthGate key="password-recovery" defaultView="reset" />
  if (!isAuthed && authNotice?.type === 'expired') return <AuthGate key="expired-auth-link" defaultView="resend" />
  if (!isAuthed && authNotice) return <AuthGate key={`auth-notice-${authNotice.type}`} defaultView="login" />
  if (!isAuthed && window.location.pathname.startsWith('/auth/callback')) return <AuthGate key="auth-callback-incomplete" defaultView="login" />
  if (!isAuthed && !showAuth) {
    return <Landing
      onGetStarted={() => { setAuthView('register'); setShowAuth(true) }}
      onSignIn={() => { setAuthView('login'); setShowAuth(true) }}
    />
  }
  if (!isAuthed) return <AuthGate defaultView={authView} />
  return <Workspace />
}

function Workspace() {
  return <AppProvider><AuthenticatedApp /></AppProvider>
}

function AuthenticatedApp() {
  const { user, syncProfile } = useAuth()
  const { activePage, setActivePage } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [identityState, setIdentityState] = useState('loading')
  const [identityProfile, setIdentityProfile] = useState(null)

  useEffect(() => {
    let active = true
    getMyProfile()
      .then(({ data }) => {
        if (!active) return
        const currentProfile = data || {}
        setIdentityProfile(currentProfile)
        syncProfile?.(currentProfile)
        const hasPreferredName = Boolean(String(currentProfile.display_name || '').trim())
        let skippedOnThisDevice = false
        try {
          skippedOnThisDevice = Boolean(user?.id && localStorage.getItem(`mindcare:identity-setup-skipped:${user.id}`) === '1')
        } catch { /* Storage may be disabled; onboarding remains available. */ }
        setIdentityState(hasPreferredName || skippedOnThisDevice ? 'ready' : 'setup')
      })
      .catch(() => {
        // Let users into the app if profile loading is temporarily unavailable. The dashboard
        // will show a small setup prompt instead of blocking access to support.
        if (active) setIdentityState('unavailable')
      })
    return () => { active = false }
    // syncProfile is a merge helper recreated by AuthContext; this effect is scoped to account/retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const completeIdentitySetup = (savedProfile) => {
    setIdentityProfile(savedProfile || {})
    syncProfile?.(savedProfile || {})
    try { if (user?.id) localStorage.removeItem(`mindcare:identity-setup-skipped:${user.id}`) } catch { /* Storage may be disabled. */ }
    setIdentityState('ready')
  }

  const skipIdentitySetup = () => {
    try { if (user?.id) localStorage.setItem(`mindcare:identity-setup-skipped:${user.id}`, '1') } catch { /* Storage may be disabled. */ }
    setIdentityState('ready')
  }

  if (identityState === 'loading') return <LoadingScreen />
  if (identityState === 'setup') {
    return <IdentityOnboarding profile={identityProfile || user} onComplete={completeIdentitySetup} onSkip={skipIdentitySetup} />
  }

  const pages = { chat: Chat, assessment: Assessment, emotion: EmotionDetector, dashboard: Dashboard, metrics: Metrics, profile: Profile }
  const PageComponent = pages[activePage] || Dashboard
  const meta = pageMeta[activePage] || pageMeta.dashboard
  const initials = (user?.display_name || user?.username || user?.email || 'U').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const navigate = (page) => { setActivePage(page); setSidebarOpen(false) }

  return (
    <div className="mc-app-shell">
      {sidebarOpen && <button className="mc-sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <div className={`mc-sidebar-wrap${sidebarOpen ? ' is-open' : ''}`}>
        <Sidebar currentPage={activePage} onNavigate={navigate} onClose={() => setSidebarOpen(false)} />
      </div>
      <main className="mc-main">
        <header className="mc-topbar">
          <div className="mc-topbar-left">
            <button className="mc-menu-button" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button>
            <div className="mc-topbar-heading"><span>{meta.eyebrow}</span><strong>{meta.title}</strong></div>
          </div>
          <div className="mc-topbar-actions">
            <button className={`mc-topbar-avatar mc-avatar-${user?.avatar_tone || 'sage'}${activePage === 'profile' ? ' is-active' : ''}${user?.avatar_url ? ' has-photo' : ''}`} type="button" title="Open your profile" aria-label="Open your profile" onClick={() => navigate('profile')}>{user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}</button>
          </div>
        </header>
        <div className="mc-page-frame" key={activePage}><PageComponent /></div>
        <div className="mc-bottom-note"><Sparkles size={12} /> Gentle support, not a diagnosis or a substitute for professional care.</div>
      </main>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppRouter /></AuthProvider>
}
