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
import { Heart, Menu } from 'lucide-react'

function AppInner() {
  const { isAuthed, loading } = useAuth()
  const [page, setPage] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F0F4FF', gap:16 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#5B5BD6,#4747B8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 28px rgba(91,91,214,0.35)', animation:'pulse 2s infinite' }}>
        <Heart size={24} color="#fff" fill="#fff" />
      </div>
      <p style={{ color:'#8892B0', fontSize:14, fontFamily:'Inter,system-ui' }}>Loading MindCare…</p>
    </div>
  )

  if (!isAuthed) return <AuthGate />

  const pages = { chat:Chat, assessment:Assessment, emotion:EmotionDetector, dashboard:Dashboard, metrics:Metrics }
  const PageComponent = pages[page] || Chat
  const navigate = (p) => { setPage(p); setSidebarOpen(false) }

  return (
    <AppProvider>
      <style>{`
        @media(min-width:768px){.mob-sb{position:relative!important;transform:none!important;z-index:auto!important;flex-shrink:0!important;}.mob-bar{display:none!important;}}
        @media(max-width:767px){.mob-sb{position:fixed!important;top:0;left:0;bottom:0;z-index:50;width:260px!important;}}
      `}</style>
      <div style={{ display:'flex', height:'100dvh', background:'#F0F4FF', overflow:'hidden', position:'relative' }}>
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(26,26,62,0.25)', zIndex:40, backdropFilter:'blur(3px)' }} />}

        {/* Sidebar */}
        <div className="mob-sb" style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition:'transform 0.25s cubic-bezier(0.4,0,0.2,1)', flexShrink:0 }}>
          <Sidebar currentPage={page} onNavigate={navigate} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main */}
        <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          {/* Mobile top bar */}
          <div className="mob-bar" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#fff', borderBottom:'1px solid #E2E8F8', flexShrink:0, boxShadow:'0 1px 6px rgba(91,91,214,0.06)' }}>
            <button onClick={() => setSidebarOpen(true)} style={{ width:38, height:38, borderRadius:11, border:'none', background:'rgba(91,91,214,0.1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Menu size={18} color="#5B5BD6" />
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'linear-gradient(135deg,#5B5BD6,#4747B8)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Heart size={14} color="#fff" fill="#fff" />
              </div>
              <span style={{ fontFamily:'Poppins,system-ui', fontWeight:600, fontSize:17, color:'#1A1A3E' }}>MindCare</span>
            </div>
            <div style={{ width:38 }} />
          </div>

          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <PageComponent />
          </div>
        </main>
      </div>
    </AppProvider>
  )
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}
