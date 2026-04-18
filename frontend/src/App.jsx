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
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'#13111C', gap:16
    }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 20px rgba(123,94,248,0.4);}50%{opacity:0.8;box-shadow:0 0 40px rgba(123,94,248,0.7);}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      `}</style>
      <div style={{
        width:64, height:64, borderRadius:20,
        background:'linear-gradient(135deg,#7B5EF8,#5B44D6)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 8px 32px rgba(123,94,248,0.4)',
        animation:'pulse 2s ease-in-out infinite'
      }}>
        <Heart size={28} color="#fff" fill="#fff"/>
      </div>
      <div style={{ animation:'fadeUp 0.5s ease 0.2s both', textAlign:'center' }}>
        <p style={{ color:'#C4C0E8', fontSize:16, fontWeight:600, fontFamily:'Poppins,system-ui' }}>MindCare</p>
        <p style={{ color:'#4A4870', fontSize:13, marginTop:4 }}>Loading your space…</p>
      </div>
      <div style={{
        marginTop:8, width:28, height:28,
        border:'2.5px solid rgba(123,94,248,0.2)',
        borderTopColor:'#7B5EF8', borderRadius:'50%',
        animation:'spin 0.9s linear infinite'
      }}/>
    </div>
  )

  if (!isAuthed) return <AuthGate/>

  const pages = { chat:Chat, assessment:Assessment, emotion:EmotionDetector, dashboard:Dashboard, metrics:Metrics }
  const PageComponent = pages[page] || Chat
  const navigate = (p) => { setPage(p); setSidebarOpen(false) }

  return (
    <AppProvider>
      <style>{`
        @media(min-width:768px){
          .mob-sb{position:relative!important;transform:none!important;z-index:auto!important;flex-shrink:0!important;}
          .mob-bar{display:none!important;}
        }
        @media(max-width:767px){
          .mob-sb{position:fixed!important;top:0;left:0;bottom:0;z-index:50;width:260px!important;}
        }
      `}</style>
      <div style={{ display:'flex', height:'100dvh', background:'#13111C', overflow:'hidden', position:'relative' }}>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position:'fixed', inset:0,
              background:'rgba(0,0,0,0.55)',
              zIndex:40, backdropFilter:'blur(4px)'
            }}
          />
        )}

        {/* Sidebar */}
        <div
          className="mob-sb"
          style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition:'transform 0.25s cubic-bezier(0.4,0,0.2,1)', flexShrink:0 }}
        >
          <Sidebar currentPage={page} onNavigate={navigate} onClose={() => setSidebarOpen(false)}/>
        </div>

        {/* Main */}
        <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

          {/* ── Mobile Top Bar ── */}
          <div
            className="mob-bar"
            style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'12px 16px',
              background:'#1D1A2C',
              borderBottom:'1px solid rgba(255,255,255,0.07)',
              flexShrink:0,
              boxShadow:'0 2px 12px rgba(0,0,0,0.3)'
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                width:40, height:40, borderRadius:12, border:'none',
                background:'rgba(123,94,248,0.12)',
                border:'1px solid rgba(123,94,248,0.22)',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
              }}
            >
              <Menu size={18} color="#B4A0FF"/>
            </button>

            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <div style={{
                width:32, height:32, borderRadius:10,
                background:'linear-gradient(135deg,#7B5EF8,#5B44D6)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 3px 10px rgba(123,94,248,0.35)'
              }}>
                <Heart size={14} color="#fff" fill="#fff"/>
              </div>
              <span style={{ fontFamily:'Poppins,system-ui', fontWeight:700, fontSize:17, color:'#F0ECFF' }}>
                MindCare
              </span>
            </div>

            <div style={{ width:40 }}/>
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