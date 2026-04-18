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
    <aside style={{ width:240, height:'100%', display:'flex', flexDirection:'column', background:'#fff', borderRight:'1px solid #E2E8F8', flexShrink:0, boxShadow:'2px 0 16px rgba(91,91,214,0.06)' }}>
      {/* Logo */}
      <div style={{ padding:'20px 18px', borderBottom:'1px solid #E2E8F8', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:40, height:40, borderRadius:13, background:'linear-gradient(135deg,#5B5BD6,#4747B8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(91,91,214,0.3)', flexShrink:0 }}>
            <Heart size={18} color="#fff" fill="#fff" />
          </div>
          <div>
            <div style={{ fontSize:17, fontWeight:700, color:'#1A1A3E', fontFamily:'Poppins,system-ui', lineHeight:1 }}>MindCare</div>
            <div style={{ fontSize:10, color:'#8892B0', marginTop:3, fontWeight:500, letterSpacing:'0.4px' }}>Predictive AI · v5</div>
          </div>
        </div>
        {onClose && (
          <>
            <style>{`@media(min-width:768px){.sb-close{display:none!important;}}`}</style>
            <button onClick={onClose} className="sb-close" style={{ width:28, height:28, borderRadius:8, border:'none', background:'#F0F4FF', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#8892B0' }}>
              <X size={14} />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
        <p style={{ fontSize:9, color:'#C5CCE0', fontWeight:700, letterSpacing:'1.2px', textTransform:'uppercase', padding:'4px 14px 8px' }}>NAVIGATION</p>
        {NAV.map(({ id, icon:Icon, label, sub }) => {
          const active = currentPage === id
          return (
            <button key={id} onClick={() => onNavigate(id)} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon size={16} style={{ flexShrink:0, opacity:active?1:0.55 }} />
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:600, lineHeight:1.2 }}>{label}</div>
                <div style={{ fontSize:10, opacity:0.6, marginTop:1 }}>{sub}</div>
              </div>
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding:'12px 10px', borderTop:'1px solid #E2E8F8' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 12px', marginBottom:6, borderRadius:13, background:'rgba(91,91,214,0.06)', border:'1px solid rgba(91,91,214,0.12)' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#5B5BD6,#10B981)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ overflow:'hidden', flex:1 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#1A1A3E', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.username}</p>
            <p style={{ fontSize:10, color:'#8892B0', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:11, border:'none', background:'transparent', color:'#8892B0', fontSize:13, fontWeight:500, cursor:'pointer', transition:'all 0.18s', fontFamily:'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.color='#EF4444'; e.currentTarget.style.background='rgba(239,68,68,0.07)' }}
          onMouseLeave={e => { e.currentTarget.style.color='#8892B0'; e.currentTarget.style.background='transparent' }}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
