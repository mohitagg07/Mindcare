import { ShieldCheck, Leaf, Sparkles } from 'lucide-react'

export default function AuthShell({ title, subtitle, children, footer = true }) {
  return (
    <main className="mc-auth-root">
      <div className="mc-auth-orb mc-auth-orb-one" aria-hidden="true" />
      <div className="mc-auth-orb mc-auth-orb-two" aria-hidden="true" />
      <div className="mc-auth-layout">
        <section className="mc-auth-story" aria-label="MindCare introduction">
          <a className="mc-auth-brand mc-auth-brand-lockup" href="/" aria-label="MindCare — A calmer you, everyday">
            <img src="/brand/mindcare-lockup.webp" alt="MindCare — A calmer you, everyday" />
          </a>
          <div className="mc-auth-story-copy">
            <span className="mc-auth-kicker"><span /> A GENTLER CHECK-IN</span>
            <h1>A little more space to <em>feel like you.</em></h1>
            <p>A private place to reflect, find helpful resources, and take your next small step at your own pace.</p>
            <div className="mc-auth-promise"><span><ShieldCheck size={17} /></span><div><strong>Your space stays yours</strong><small>Your conversations are associated with your account. You control your saved sessions.</small></div></div>
            <div className="mc-auth-promise"><span><Leaf size={17} /></span><div><strong>Support, not judgement</strong><small>MindCare is a wellbeing companion, not a diagnosis or a replacement for professional care.</small></div></div>
          </div>
          <div className="mc-auth-story-foot"><Sparkles size={14} /> Small steps count, even when they don't feel small.</div>
        </section>
        <section className="mc-auth-panel">
          <div className="mc-auth-mobile-brand"><img className="mc-auth-mobile-mark" src="/brand/mindcare-mark.png" alt="" /><span>mindcare<span className="mc-auth-brand-dot">.</span></span></div>
          <header className="mc-auth-panel-head"><h2>{title}</h2><p>{subtitle}</p></header>
          {children}
          {footer && <p className="mc-auth-professional-note">Need urgent help? In India, Tele-MANAS: <strong>14416</strong>. If you're in immediate danger, contact local emergency services.</p>}
        </section>
      </div>
    </main>
  )
}
