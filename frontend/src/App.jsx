import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import AuthGate from './components/AuthGate'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import Assessment from './components/Assessment'
import EmotionDetector from './components/EmotionDetector'
import Dashboard from './components/Dashboard'
import Metrics from './components/Metrics'

function AppInner() {
  const { isAuthed, loading } = useAuth()
  const [page, setPage] = useState('chat')

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', background:'#13111C', gap:16 }}>
      <div style={{ width:52, height:52, borderRadius:16,
        background:'linear-gradient(135deg,#9B6DFF,#7C52D9)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 8px 32px rgba(155,109,255,0.4)', animation:'pulse 2s ease-in-out infinite' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="white"/>
        </svg>
      </div>
      <p style={{ color:'#4A4870', fontSize:13, fontFamily:'DM Sans, system-ui' }}>Loading MindCare…</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )

  if (!isAuthed) return <AuthGate />

  const PAGES = { chat:Chat, assessment:Assessment, emotion:EmotionDetector, dashboard:Dashboard, metrics:Metrics }
  const Page  = PAGES[page] || Chat

  return (
    <AppProvider>
      <div style={{ display:'flex', height:'100vh', background:'#13111C', overflow:'hidden' }}>
        <Sidebar currentPage={page} onNavigate={setPage} />
        <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <Page />
        </main>
      </div>
    </AppProvider>
  )
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}