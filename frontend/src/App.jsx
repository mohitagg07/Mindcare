import { lazy, Suspense, useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp } from './context/AppContext'
import AuthGate from './components/AuthGate'
import Landing from './pages/Landing'
import Sidebar from './components/Sidebar'
import IdentityOnboarding from './components/IdentityOnboarding'
import { getMyProfile } from './api/client'
import { AlertCircle, Menu, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'

const pageLoaders = {
  chat: () => import('./components/Chat'),
  assessment: () => import('./components/Assessment'),
  emotion: () => import('./components/EmotionDetector'),
  dashboard: () => import('./components/Dashboard'),
  metrics: () => import('./components/Metrics'),
  profile: () => import('./components/Profile'),
}

const Chat = lazy(pageLoaders.chat)
const Assessment = lazy(pageLoaders.assessment)
const EmotionDetector = lazy(pageLoaders.emotion)
const Dashboard = lazy(pageLoaders.dashboard)
const Metrics = lazy(pageLoaders.metrics)
const Profile = lazy(pageLoaders.profile)

function prefetchPage(page) {
  const loadPage = pageLoaders[page]
  if (loadPage) loadPage().catch(() => {})
}

const pageMeta = {
  dashboard: { eyebrow: 'HOME', title: 'A little room for you' },
  chat: { eyebrow: 'TALK', title: 'Start wherever you are' },
  assessment: { eyebrow: 'CHECK-IN', title: 'Check-ins' },
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
  const { user, syncProfile, logout, profileStatus, setProfileStatus } = useAuth()
  const { activePage, setActivePage } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [identityState, setIdentityState] = useState('loading')
  const [identityProfile, setIdentityProfile] = useState(null)
  const [identityRetry, setIdentityRetry] = useState(0)

  useEffect(() => {
    let active = true

    // AuthContext already fetched this profile. Reuse the result instead of making
    // the same request again as soon as the workspace mounts.
    if (profileStatus === 'ready') {
      const currentProfile = user || {}
      setIdentityProfile(currentProfile)
      const hasPreferredName = Boolean(String(currentProfile.display_name || '').trim())
      setIdentityState(hasPreferredName ? 'ready' : 'setup')
      return () => { active = false }
    }

    if (profileStatus === 'loading') {
      setIdentityState('loading')
      return () => { active = false }
    }

    if (profileStatus === 'error' && identityRetry === 0) {
      setIdentityState('error')
      return () => { active = false }
    }

    // Explicit retry only: do not fire a duplicate request automatically after auth.
    setIdentityState('loading')
    getMyProfile()
      .then(({ data }) => {
        if (!active) return
        const currentProfile = data || {}
        setIdentityProfile(currentProfile)
        syncProfile?.(currentProfile)
        setProfileStatus('ready')
        const hasPreferredName = Boolean(String(currentProfile.display_name || '').trim())
        setIdentityState(hasPreferredName ? 'ready' : 'setup')
      })
      .catch(() => {
        if (active) setIdentityState('error')
      })
    return () => { active = false }
    // syncProfile is a merge helper recreated by AuthContext; the profile status owns the load boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, identityRetry, profileStatus])

  const completeIdentitySetup = (savedProfile) => {
    setIdentityProfile(savedProfile || {})
    syncProfile?.(savedProfile || {})
    setIdentityState('ready')
  }

  if (identityState === 'loading') return <LoadingScreen />
  if (identityState === 'error') {
    return (
      <main className="mc-identity-page">
        <div className="mc-identity-botanical" aria-hidden="true" />
        <header className="mc-identity-brandbar">
          <div className="mc-identity-brand"><img src="/brand/mindcare-mark.png" alt="" /><span className="mc-identity-wordmark">mindcare<span>.</span><small>A CALMER YOU, EVERYDAY</small></span></div>
          <div className="mc-identity-private"><ShieldCheck size={15} /> Private by default</div>
        </header>
        <div className="mc-identity-load-error"><section>
          <span className="error-mark"><AlertCircle size={21} /></span>
          <h1>Couldn’t load your profile</h1>
          <p>We need to check your saved name before opening your space. Check your connection and try again.</p>
          <div className="error-actions">
            <button type="button" className="primary" onClick={() => setIdentityRetry(value => value + 1)}><RefreshCw size={14} /> Try again</button>
            <button type="button" onClick={logout}>Sign out</button>
          </div>
        </section></div>
      </main>
    )
  }
  if (identityState === 'setup') {
    return <IdentityOnboarding profile={identityProfile || user} onComplete={completeIdentitySetup} />
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
        <Sidebar currentPage={activePage} onNavigate={navigate} onPrefetch={prefetchPage} onClose={() => setSidebarOpen(false)} />
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
        <div className="mc-page-frame" key={activePage}><Suspense fallback={<div className="mc-page-loading" role="status"><span className="mc-loader" />Opening your space…</div>}><PageComponent /></Suspense></div>
        <div className="mc-bottom-note"><Sparkles size={12} /> Gentle support, not a diagnosis or a substitute for professional care.</div>
      </main>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppRouter /></AuthProvider>
}
