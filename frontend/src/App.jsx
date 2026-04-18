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
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-page)', gap:16 }}>
      <style>{`@keyframes pulse2{0%,100%{opacity:1;box-shadow:0 0 20px rgba(42,125,111,0.3);}50%{opacity:0.85;box-shadow:0 0 40px rgba(42,125,111,0.5);}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ width:60, height:60, borderRadius:18, background:'linear-gradient(135deg,#2A7D6F,#38A594)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 28px rgba(42,125,111,0.3)', animation:'pulse2 2s ease-in-out infinite' }}>
        <Heart size={26} color="#fff" fill="#fff"/>
      </div>
      <div style={{ animation:'fadeUp 0.5s ease 0.2s both', textAlign:'center' }}>
        <p style={{ color:'var(--text-1)', fontSize:16, fontWeight:600, fontFamily:'Lora,serif' }}>MindCare</p>
        <p style={{ color:'var(--text-4)', fontSize:13, marginTop:4 }}>Loading your space…</p>
      </div>
      <div style={{ marginTop:8, width:24, height:24, border:'2.5px solid var(--border-md)', borderTopColor:'var(--teal)', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
    </div>
  )

  if (!isAuthed) return <AuthGate/>

  const pages = { chat:Chat, assessment:Assessment, emotion:EmotionDetector, dashboard:Dashboard, metrics:Metrics }
  const PageComponent = pages[page] || Chat
  const navigate = (p) => { setPage(p); setSidebarOpen(false) }

  return (
    <AppProvider>
      <style>{`
        @media(min-width:768px){.mob-sb{position:relative!important;transform:none!important;z-index:auto!important;flex-shrink:0!important;} .mob-bar{display:none!important;}}
        @media(max-width:767px){.mob-sb{position:fixed!important;top:0;left:0;bottom:0;z-index:50;width:250px!important;}}
      `}</style>
      <div style={{ display:'flex', height:'100dvh', background:'var(--bg-page)', overflow:'hidden', position:'relative' }}>
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(26,35,50,0.4)', zIndex:40, backdropFilter:'blur(3px)' }}/>}

        <div className="mob-sb" style={{ transform:sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition:'transform 0.25s cubic-bezier(0.4,0,0.2,1)', flexShrink:0 }}>
          <Sidebar currentPage={page} onNavigate={navigate} onClose={() => setSidebarOpen(false)}/>
        </div>

        <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          <div className="mob-bar" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--bg-card)', borderBottom:'1px solid var(--border)', flexShrink:0, boxShadow:'0 1px 4px rgba(26,35,50,0.06)' }}>
            <button onClick={() => setSidebarOpen(true)} style={{ width:38, height:38, borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-elevated)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-3)' }}>
              <Menu size={17}/>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'linear-gradient(135deg,#2A7D6F,#38A594)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Heart size={13} color="#fff" fill="#fff"/>
              </div>
              <span style={{ fontFamily:'Lora,serif', fontWeight:700, fontSize:16, color:'var(--text-1)' }}>MindCare</span>
            </div>
            <div style={{ width:38 }}/>
          </div>

          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <PageComponent/>
          </div>
        </main>
      </div>
    </AppProvider>
  )
}

export default function App() {
  return <AuthProvider><AppInner/></AuthProvider>
}