import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import { AlertCircle, Mail, ArrowLeft, Send } from 'lucide-react'

export default function ForgotPassword({ onSwitch }) {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true)
    try { await forgotPassword(email); setSent(true) }
    catch (err) { setError(err.message || 'Could not request a reset link. Please try again.') }
    finally { setLoading(false) }
  }

  return <AuthShell title={sent ? 'Check your inbox' : 'Reset your password'} subtitle={sent ? 'If an account exists for this address, an email is on the way.' : 'We will email you a secure, one-time password-reset link.'}>
    {error && <div className="mc-auth-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}
    {sent ? <div className="mc-auth-confirmation"><span><Mail size={28} /></span><h3>Look for a reset email</h3><p>Check <strong>{email}</strong> and your spam folder. Open the newest link on this device to choose a new password.</p><p className="mc-auth-muted">For your privacy, this page does not reveal whether an account exists for that email address.</p><button className="mc-auth-submit" type="button" onClick={onSwitch}>Back to sign in</button></div> : <form className="mc-auth-form" onSubmit={submit}>
      <label className="mc-auth-label" htmlFor="forgot-email">Email address</label>
      <div className="mc-auth-input-wrap"><Mail size={17} /><input id="forgot-email" className="mc-auth-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required /></div>
      <button className="mc-auth-submit" type="submit" disabled={loading}>{loading ? <><span className="mc-auth-spinner" /> Sending…</> : <><Send size={16} /> Send reset link</>}</button>
    </form>}
    <button className="mc-auth-back" type="button" onClick={onSwitch}><ArrowLeft size={15} /> Back to sign in</button>
  </AuthShell>
}
