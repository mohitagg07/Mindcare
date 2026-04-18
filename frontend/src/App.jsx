import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp }   from './context/AppContext'
import AuthGate      from './components/AuthGate'
import Sidebar       from './components/Sidebar'
import Chat          from './components/Chat'
import Assessment    from './components/Assessment'
import EmotionDetector from './components/EmotionDetector'
import Dashboard     from './components/Dashboard'
import Metrics       from './components/Metrics'

const PAGES = {
  chat:       Chat,
  assessment: Assessment,
  emotion:    EmotionDetector,
  dashboard:  Dashboard,
  metrics:    Metrics,
}

function AppInner() {
  const { isAuthed, loading } = useAuth()
  const { activePage, setActivePage } = useApp()

  if (loading) return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#070c18', flexDirection:'column', gap:16,
    }}>
      <div style={{ fontSize:48, animation:'pulse 1.5s ease-in-out infinite' }}>🧠</div>
      <p style={{ color:'rgba(255,255,255,0.3)', fontSize:14, fontFamily:'system-ui' }}>Loading MindCare…</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )

  if (!isAuthed) return <AuthGate />

  const PageComponent = PAGES[activePage] || Chat

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      <Sidebar currentPage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <PageComponent />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </AuthProvider>
  )
}