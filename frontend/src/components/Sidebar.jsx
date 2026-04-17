import { MessageCircle, ClipboardList, Brain, LayoutDashboard, BarChart3, LogOut,
         TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp }  from '../context/AppContext'

const NAV = [
  { id:'chat',       icon:MessageCircle,   label:'Chat',       sub:'Talk to MindCare'  },
  { id:'assessment', icon:ClipboardList,   label:'Assessment', sub:'PHQ-9 & GAD-7'    },
  { id:'emotion',    icon:Brain,           label:'Emotion',    sub:'Facial analysis'   },
  { id:'dashboard',  icon:LayoutDashboard, label:'Dashboard',  sub:'Risk overview'     },
  { id:'metrics',    icon:BarChart3,       label:'Analytics',  sub:'Sessions & trends' },
]

export default function Sidebar({ currentPage, onNavigate }) {
  const { user, logout }                         = useAuth()
  const { trajectory, riskData, phq9Result }     = useApp()

  const trend = trajectory?.trend
  const TrendIcon = trend==='improving' ? TrendingUp : trend==='deteriorating' ? TrendingDown : Minus
  const trendColor = trend==='improving' ? '#56CFB2' : trend==='deteriorating' ? '#FF6B6B' : '#8B8AAA'

  const riskColors = { HIGH:'#FF6B6B', MODERATE:'#FFB547', LOW:'#60A5FA', MINIMAL:'#56CFB2' }
  const riskColor  = riskColors[riskData?.risk_level] || '#8B8AAA'

  return (
    <aside style={{ width:230, height:'100%', display:'flex', flexDirection:'column',
      background:'#1D1A2C', borderRight:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>

      {/* Logo */}
      <div style={{ padding:'22px 20px 18px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:38, height:38, borderRadius:12, flexShrink:0,
            background:'linear-gradient(135deg,#9B6DFF,#7C52D9)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 16px rgba(155,109,255,0.4)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="white"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#F5F0FF', letterSpacing:'-0.3px',
              fontFamily:'Fraunces,Georgia,serif', fontStyle:'italic' }}>MindCare</div>
            <div style={{ fontSize:9, color:'#4A4870', marginTop:1, fontWeight:600, letterSpacing:'0.5px' }}>
              Predictive AI · v5
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'12px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
        <p style={{ fontSize:9, color:'#4A4870', fontWeight:700, letterSpacing:'1.2px',
          textTransform:'uppercase', padding:'4px 14px 8px' }}>Navigation</p>
        {NAV.map(({ id, icon:Icon, label, sub }) => (
          <button key={id} onClick={() => onNavigate(id)} className={`nav-item ${currentPage===id?'active':''}`}>
            <Icon size={14} style={{ flexShrink:0, opacity:currentPage===id?1:0.6 }}/>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:13, fontWeight:600, lineHeight:1.2 }}>{label}</div>
              <div style={{ fontSize:10, opacity:0.55, marginTop:1 }}>{sub}</div>
            </div>
          </button>
        ))}
      </nav>

      {/* Live state panel */}
      {(trajectory || riskData) && (
        <div style={{ margin:'0 12px 10px', padding:'12px 14px', borderRadius:14,
          background:'rgba(155,109,255,0.06)', border:'1px solid rgba(155,109,255,0.15)' }}>
          <p style={{ fontSize:9, color:'#4A4870', fontWeight:700, letterSpacing:'1px',
            textTransform:'uppercase', marginBottom:10 }}>Live State</p>

          {trajectory?.trend && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
              <span style={{ fontSize:11, color:'#4A4870' }}>Trajectory</span>
              <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, color:trendColor }}>
                <TrendIcon size={10}/>{trend}
              </div>
            </div>
          )}
          {riskData && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
              <span style={{ fontSize:11, color:'#4A4870' }}>Risk</span>
              <span style={{ fontSize:11, fontWeight:700, color:riskColor }}>
                {riskData.risk_level} · {Math.round(riskData.risk_score*100)}%
              </span>
            </div>
          )}
          {phq9Result && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#4A4870' }}>PHQ-9</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#C4A3FF' }}>
                {phq9Result.score}/27 · {phq9Result.category}
              </span>
            </div>
          )}
          {trajectory?.trigger === 'high_risk' && (
            <div style={{ marginTop:8, padding:'5px 10px', borderRadius:8, textAlign:'center',
              background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
              fontSize:10, color:'#FF6B6B', fontWeight:700 }}>
              Risk Alert Active
            </div>
          )}
        </div>
      )}

      {/* User footer */}
      <div style={{ padding:'0 12px 14px', borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', marginBottom:5,
          borderRadius:12, background:'rgba(155,109,255,0.06)', border:'1px solid rgba(155,109,255,0.1)' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
            background:'linear-gradient(135deg,#9B6DFF,#56CFB2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, fontWeight:700, color:'#fff' }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ overflow:'hidden', flex:1 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#D4CEE8', margin:0,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.username}</p>
            <p style={{ fontSize:10, color:'#4A4870', margin:0,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} style={{ width:'100%', display:'flex', alignItems:'center', gap:8,
          padding:'8px 12px', borderRadius:10, border:'none', background:'transparent',
          color:'#4A4870', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all 0.18s' }}
          onMouseEnter={e=>{ e.currentTarget.style.color='#FF6B6B'; e.currentTarget.style.background='rgba(255,107,107,0.07)' }}
          onMouseLeave={e=>{ e.currentTarget.style.color='#4A4870'; e.currentTarget.style.background='transparent' }}>
          <LogOut size={13}/> Sign Out
        </button>
      </div>
    </aside>
  )
}