import { MessageCircle, ClipboardList, Scan, LayoutDashboard, BarChart3, LogOut, Heart, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { id:'chat',       icon:MessageCircle,   label:'Chat',       sub:'Talk to MindCare' },
  { id:'assessment', icon:ClipboardList,   label:'Assessment', sub:'PHQ-9 & GAD-7'   },
  { id:'emotion',    icon:Scan,            label:'Emotion',    sub:'Facial analysis'  },
  { id:'dashboard',  icon:LayoutDashboard, label:'Dashboard',  sub:'Risk overview'    },
  { id:'metrics',    icon:BarChart3,       label:'Analytics',  sub:'Sessions & trends'},
]

export default function Sidebar({ currentPage, onNavigate, onClose }) {
  const { user, logout } = useAuth()

  return (
    <aside style={{
      width:240, height:'100%',
      display:'flex', flexDirection:'column',
      background:'#1C2B3A',
      borderRight:'none',
      flexShrink:0,
    }}>
      {/* Logo */}
      <div style={{ padding:'22px 18px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#2A7D6F,#38A594)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(42,125,111,0.4)', flexShrink:0 }}>
            <Heart size={16} color="#fff" fill="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#fff', fontFamily:'Lora,serif', lineHeight:1 }}>MindCare</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:3, letterSpacing:'0.5px' }}>Predictive AI · v5</div>
          </div>
        </div>
        {onClose && (
          <>
            <style>{`@media(min-width:768px){.sb-close{display:none!important;}}`}</style>
            <button onClick={onClose} className="sb-close" style={{ width:28, height:28, borderRadius:8, border:'none', background:'rgba(255,255,255,0.07)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)' }}>
              <X size={13}/>
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'14px 10px', display:'flex', flexDirection:'column', gap:1, overflowY:'auto' }}>
        <p style={{ fontSize:9, color:'rgba(255,255,255,0.25)', fontWeight:700, letterSpacing:'1.4px', textTransform:'uppercase', padding:'2px 12px 10px' }}>NAVIGATION</p>
        {NAV.map(({ id, icon:Icon, label, sub }) => {
          const active = currentPage === id
          return (
            <button key={id} onClick={() => onNavigate(id)} className={`nav-item ${active ? 'active' : ''}`}>
              <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, background: active ? 'rgba(42,125,111,0.30)' : 'rgba(255,255,255,0.05)', border: active ? '1px solid rgba(42,125,111,0.45)' : '1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.16s' }}>
                <Icon size={14} color={active ? '#38A594' : 'rgba(255,255,255,0.4)'}/>
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:600, lineHeight:1.2, color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}>{label}</div>
                <div style={{ fontSize:10, marginTop:2, color:'rgba(255,255,255,0.25)' }}>{sub}</div>
              </div>
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 12px', marginBottom:6, borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#2A7D6F,#3B6EA8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ overflow:'hidden', flex:1 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.username}</p>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.30)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:9, border:'none', background:'transparent', color:'rgba(255,255,255,0.30)', fontSize:13, fontWeight:500, cursor:'pointer', transition:'all 0.16s', fontFamily:'inherit' }}
          onMouseEnter={e=>{ e.currentTarget.style.color='#F87171'; e.currentTarget.style.background='rgba(248,113,113,0.10)' }}
          onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.30)'; e.currentTarget.style.background='transparent' }}>
          <LogOut size={13}/> Sign Out
        </button>
      </div>
    </aside>
  )
}