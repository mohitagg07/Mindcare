import {
  MessageCircle, ClipboardList, ScanFace, LayoutDashboard, BarChart3,
  LogOut, X, ShieldCheck, UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

const NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { id: 'chat', icon: MessageCircle, label: 'Talk' },
  { id: 'assessment', icon: ClipboardList, label: 'Check-in' },
  { id: 'emotion', icon: ScanFace, label: 'Reflect' },
  { id: 'metrics', icon: BarChart3, label: 'Insights' },
  { id: 'profile', icon: UserRound, label: 'Profile' },
]

export default function Sidebar({ currentPage, onNavigate, onClose }) {
  const { user, logout } = useAuth()
  const initial = (user?.display_name || user?.username || user?.email || 'U')
    .trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

  return (
    <aside className="mc-sidebar mc-side-rail" aria-label="Main navigation">
      <div className="mc-side-brand">
        <div className="mc-side-mark"><img src="/brand/mindcare-mark.png" alt="" /></div>
        <span className="mc-side-wordmark">mindcare<span>.</span></span>
        {onClose && <button className="mc-side-close" type="button" onClick={onClose} aria-label="Close menu"><X size={18} /></button>}
      </div>
      <nav className="mc-side-nav" aria-label="Your pages">
        {NAV.map(({ id, icon: Icon, label }) => {
          const active = currentPage === id
          return (
            <button key={id} type="button" onClick={() => onNavigate(id)} className={`mc-side-item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
              <Icon className="mc-side-item-icon" size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>
      <div className="mc-side-bottom">
        <div className="mc-side-user">
          <div className={`mc-user-avatar mc-side-avatar mc-avatar-${user?.avatar_tone || 'sage'}${user?.avatar_url ? ' has-photo' : ''}`}>
            {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initial}
          </div>
          <div className="mc-side-user-copy">
            <span className="mc-side-user-name">{user?.display_name || user?.username || 'Your account'}</span>
            <span className="mc-side-user-email">{user?.email || 'Signed in'}</span>
          </div>
          <button className="mc-side-signout" type="button" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
        </div>
        <p className="mc-side-privacy"><ShieldCheck size={13} aria-hidden="true" /><span>Private to your account</span></p>
      </div>
    </aside>
  )
}
