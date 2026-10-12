import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import { AlertCircle, Mail, MailCheck, ArrowLeft, Send } from 'lucide-react'

export default function ResendConfirmation({ onSwitch, initialEmail = '' }) {
  const { resendConfirmation, authNotice, authEmail } = useAuth()
  const [email, setEmail] = useState(initialEmail || authEmail || localStorage.getItem('mc_pending_email') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true)
    try { await resendConfirmation(email); setSent(true) }
    catch (err) { setError(err.message || 'Could not resend the email. Please wait a moment and try again.') }
    finally { setLoading(false) }
  }

  return <AuthShell title={sent ? 'Email requested' : 'Verify your email'} subtitle={sent ? 'Check for the newest confirmation email.' : 'Confirmation links expire. We can send a fresh one.'}>
    {authNotice && <div className={`mc-auth-notice ${authNotice.type === 'success' ? 'is-success' : 'is-warning'}`} role="status"><AlertCircle size={16} /><span>{authNotice.message}</span></div>}
    {error && <div className="mc-auth-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}
    {sent ? <div className="mc-auth-confirmation"><span><MailCheck size={28} /></span><h3>Check your inbox</h3><p>If <strong>{email}</strong> has a pending confirmation, Supabase will send a fresh link. Use the newest message and open it on this device.</p><p className="mc-auth-muted">If the address is already confirmed, sign in instead. Check spam if the email does not arrive.</p><button className="mc-auth-submit" type="button" onClick={onSwitch}>Back to sign in</button><button className="mc-auth-secondary-link" type="button" onClick={() => setSent(false)}>Try another email</button></div> : <form className="mc-auth-form" onSubmit={submit}>
      <label className="mc-auth-label" htmlFor="resend-email">Email address</label>
      <div className="mc-auth-input-wrap"><Mail size={17} /><input id="resend-email" className="mc-auth-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required /></div>
      <button className="mc-auth-submit" type="submit" disabled={loading}>{loading ? <><span className="mc-auth-spinner" /> Sending…</> : <><Send size={16} /> Resend confirmation</>}</button>
    </form>}
    <button className="mc-auth-back" type="button" onClick={onSwitch}><ArrowLeft size={15} /> Back to sign in</button>
  </AuthShell>
}
