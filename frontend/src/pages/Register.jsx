import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import { AlertCircle, Eye, EyeOff, ShieldCheck, Chrome, MailCheck } from 'lucide-react'

export default function Register({ onSwitch, onResend }) {
  const { register, signInWithGoogle } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmationPending, setConfirmationPending] = useState(false)
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }))

  const strength = !form.password ? 0 : form.password.length < 8 ? 1 : form.password.length < 12 ? 2 : 3
  const strengthLabel = ['', 'Too short', 'Getting stronger', 'Strong password']

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username.trim())) { setError('Use 3–30 letters, numbers, or underscores for your username.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Enter a valid email address.'); return }
    if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password)) { setError('Use at least 8 characters, including a letter and a number.'); return }
    setLoading(true)
    try {
      const result = await register(form.username.trim(), form.email.trim(), form.password)
      setConfirmationPending(Boolean(result?.requires_email_confirmation))
    } catch (err) { setError(err.message || 'Account creation failed. Please try again.') }
    finally { setLoading(false) }
  }

  async function googleSignIn() {
    setError(''); setGoogleLoading(true)
    try { await signInWithGoogle() }
    catch (err) { setError(err.message || 'Google sign-in could not be started.') }
    finally { setGoogleLoading(false) }
  }

  if (confirmationPending) {
    return <AuthShell title="Check your inbox" subtitle="One more step before you begin.">
      <div className="mc-auth-confirmation"><span><MailCheck size={28} /></span><h3>Confirm your email address</h3><p>We sent a confirmation link to <strong>{form.email}</strong>. Open the newest email on this device to confirm your account and return to MindCare.</p><p className="mc-auth-muted">If you don't see it, check your spam folder. Confirmation links expire and can only be used once.</p><button className="mc-auth-submit" type="button" onClick={() => onResend(form.email)}>Resend confirmation email</button><button className="mc-auth-secondary-link" type="button" onClick={onSwitch}>Back to sign in</button></div>
    </AuthShell>
  }

  return (
    <AuthShell title="Create your account" subtitle="A secure account helps you keep track of your reflections.">
      {error && <div className="mc-auth-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}
      <form className="mc-auth-form" onSubmit={submit}>
        <label className="mc-auth-label" htmlFor="register-username">Username</label>
        <input id="register-username" className="mc-auth-input mc-auth-input-standalone" name="username" autoComplete="username" placeholder="e.g. mindful_morning" value={form.username} onChange={set('username')} minLength={3} maxLength={30} required />
        <label className="mc-auth-label" htmlFor="register-email">Email address</label>
        <input id="register-email" className="mc-auth-input mc-auth-input-standalone" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
        <label className="mc-auth-label" htmlFor="register-password">Password</label>
        <div className="mc-auth-input-wrap"><ShieldCheck size={17} /><input id="register-password" className="mc-auth-input" type={showPassword ? 'text' : 'password'} name="new-password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} minLength={8} required /><button className="mc-auth-eye" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        {form.password && <div className="mc-auth-strength" aria-live="polite"><div>{[1, 2, 3].map(value => <i key={value} className={value <= strength ? `strength-${strength}` : ''} />)}</div><span>{strengthLabel[strength]}</span></div>}
        <button className="mc-auth-submit" type="submit" disabled={loading}>{loading ? <><span className="mc-auth-spinner" /> Creating account…</> : 'Create account'}</button>
      </form>
      <p className="mc-auth-privacy-note"><ShieldCheck size={15} /> MindCare is a wellbeing support tool, not a diagnostic or emergency service.</p>
      <div className="mc-auth-divider"><span /> <small>OR CONTINUE WITH</small> <span /></div>
      <button className="mc-auth-google" type="button" onClick={googleSignIn} disabled={googleLoading}><Chrome size={18} />{googleLoading ? 'Connecting to Google…' : 'Continue with Google'}</button>
      <p className="mc-auth-switch">Already have an account? <button className="mc-auth-link" type="button" onClick={onSwitch}>Sign in</button></p>
    </AuthShell>
  )
}
