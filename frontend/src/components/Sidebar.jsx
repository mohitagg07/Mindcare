import {
  MessageCircle, ClipboardList, ScanFace, LayoutDashboard, BarChart3,
  LogOut, X, ShieldCheck, Sparkles, ArrowUpRight, UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home', detail: 'Your space' },
  { id: 'chat', icon: MessageCircle, label: 'Talk', detail: 'Open conversation' },
  { id: 'assessment', icon: ClipboardList, label: 'Check-in', detail: 'PHQ-9 screening' },
  { id: 'emotion', icon: ScanFace, label: 'Reflect', detail: 'Optional tool' },
  { id: 'metrics', icon: BarChart3, label: 'Insights', detail: 'Your activity' },
  { id: 'profile', icon: UserRound, label: 'Profile', detail: 'Your preferences' },
]

export default function Sidebar({ currentPage, onNavigate, onClose }) {
  const { user, logout } = useAuth()
  const initial = (user?.display_name || user?.username || user?.email || 'U').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

  return (
    <aside className="mc-sidebar" aria-label="Main navigation">
      <div className="mc-brand">
        <div className="mc-brand-mark"><img src="/brand/mindcare-mark.png" alt="" /></div>
        <div className="mc-brand-copy">
          <span className="mc-brand-name">mindcare<span>.</span></span>
          <span className="mc-brand-caption">A CALMER YOU, EVERYDAY</span>
        </div>
        {onClose && <button className="mc-sidebar-close" onClick={onClose} aria-label="Close menu"><X size={18} /></button>}
      </div>

      <div className="mc-sidebar-intro">
        <div className="mc-live-dot" />
        <span>Your space</span>
      </div>

      <nav className="mc-nav">
        <p className="mc-nav-label">WORKSPACE</p>
        {NAV.map(({ id, icon: Icon, label, detail }) => {
          const active = currentPage === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`mc-nav-item${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="mc-nav-icon"><Icon size={18} strokeWidth={1.8} /></span>
              <span className="mc-nav-copy">
                <span className="mc-nav-title">{label}</span>
                <span className="mc-nav-detail">{detail}</span>
              </span>
              {active && <span className="mc-nav-indicator" />}
            </button>
          )
        })}
      </nav>

      <div className="mc-sidebar-bottom">
        <div className="mc-privacy-card">
          <div className="mc-privacy-icon"><ShieldCheck size={16} /></div>
          <div>
            <p>Private by default</p>
            <span>Your conversations stay tied to your account.</span>
          </div>
        </div>
        <div className="mc-user-row">
          <div className={`mc-user-avatar mc-avatar-${user?.avatar_tone || 'sage'}${user?.avatar_url ? ' has-photo' : ''}`}>{user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initial}</div>
          <div className="mc-user-copy">
            <span className="mc-user-name">{user?.display_name || user?.username || 'Your account'}</span>
            <span className="mc-user-email">{user?.email || 'Signed in'}</span>
          </div>
          <button className="mc-logout" type="button" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
        </div>
        <button className="mc-sidebar-help" type="button" onClick={() => onNavigate('chat')}>
          <Sparkles size={14} /><span>Need a moment?</span><ArrowUpRight size={13} />
        </button>
      </div>
    </aside>
  )
}
