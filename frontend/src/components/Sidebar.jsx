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
      width: 240, height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#1D1A2C',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0,
      boxShadow: '4px 0 24px rgba(0,0,0,0.35)'
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '20px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: 'linear-gradient(135deg,#7B5EF8,#5B44D6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(123,94,248,0.4)', flexShrink: 0
          }}>
            <Heart size={18} color="#fff" fill="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:17, fontWeight:700, color:'#F0ECFF', fontFamily:'Poppins,system-ui', lineHeight:1 }}>
              MindCare
            </div>
            <div style={{ fontSize:10, color:'#4A4870', marginTop:3, fontWeight:500, letterSpacing:'0.5px' }}>
              Predictive AI · v5
            </div>
          </div>
        </div>

        {onClose && (
          <>
            <style>{`@media(min-width:768px){.sb-close{display:none!important;}}`}</style>
            <button
              onClick={onClose}
              className="sb-close"
              style={{
                width:30, height:30, borderRadius:9, border:'none',
                background:'rgba(255,255,255,0.06)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#8B87B8', transition:'all 0.15s'
              }}
            >
              <X size={14}/>
            </button>
          </>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
        <p style={{
          fontSize:9, color:'#2E2B40', fontWeight:700,
          letterSpacing:'1.2px', textTransform:'uppercase',
          padding:'4px 14px 10px'
        }}>
          NAVIGATION
        </p>

        {NAV.map(({ id, icon:Icon, label, sub }) => {
          const active = currentPage === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: active ? 'rgba(123,94,248,0.18)' : 'rgba(255,255,255,0.05)',
                border: active ? '1px solid rgba(123,94,248,0.3)' : '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s'
              }}>
                <Icon size={15} style={{ opacity: active ? 1 : 0.5 }}
                  color={active ? '#B4A0FF' : '#8B87B8'}/>
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:600, lineHeight:1.2,
                  color: active ? '#B4A0FF' : '#8B87B8' }}>
                  {label}
                </div>
                <div style={{ fontSize:10, marginTop:2, opacity:0.5, color:'#4A4870' }}>{sub}</div>
              </div>
            </button>
          )
        })}
      </nav>

      {/* ── User ── */}
      <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{
          display:'flex', alignItems:'center', gap:9,
          padding:'10px 12px', marginBottom:6, borderRadius:13,
          background:'rgba(123,94,248,0.07)',
          border:'1px solid rgba(123,94,248,0.15)'
        }}>
          <div style={{
            width:34, height:34, borderRadius:'50%',
            background:'linear-gradient(135deg,#7B5EF8,#10D9A8)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, fontWeight:700, color:'#fff', flexShrink:0
          }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ overflow:'hidden', flex:1 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#F0ECFF', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.username}
            </p>
            <p style={{ fontSize:10, color:'#4A4870', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:8,
            padding:'9px 12px', borderRadius:11, border:'none',
            background:'transparent', color:'#4A4870',
            fontSize:13, fontWeight:500, cursor:'pointer',
            transition:'all 0.18s', fontFamily:'inherit'
          }}
          onMouseEnter={e => { e.currentTarget.style.color='#FF6B6B'; e.currentTarget.style.background='rgba(255,107,107,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color='#4A4870'; e.currentTarget.style.background='transparent' }}
        >
          <LogOut size={13}/> Sign Out
        </button>
      </div>
    </aside>
  )
}