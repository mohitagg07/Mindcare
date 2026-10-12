import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import { AlertCircle, Eye, EyeOff, Mail, ShieldCheck, Chrome } from 'lucide-react'

export default function Login({ onSwitch, onForgotPassword, onResend }) {
  const { login, signInWithGoogle, authNotice } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Enter your email address and password.'); return }
    setLoading(true)
    try { await login(email, password) }
    catch (err) { setError(err.message || 'Unable to sign in. Please try again.') }
    finally { setLoading(false) }
  }

  async function googleSignIn() {
    setError('')
    setGoogleLoading(true)
    try { await signInWithGoogle() }
    catch (err) { setError(err.message || 'Google sign-in could not be started.') }
    finally { setGoogleLoading(false) }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to your private wellbeing space.">
      {authNotice && <div className={`mc-auth-notice ${authNotice.type === 'success' ? 'is-success' : 'is-warning'}`} role="status"><ShieldCheck size={17} /><span>{authNotice.message}</span></div>}
      {error && <div className="mc-auth-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}
      <form className="mc-auth-form" onSubmit={submit}>
        <label className="mc-auth-label" htmlFor="login-email">Email address</label>
        <div className="mc-auth-input-wrap"><Mail size={17} /><input id="login-email" className="mc-auth-input" type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <div className="mc-auth-label-row"><label className="mc-auth-label" htmlFor="login-password">Password</label><button type="button" className="mc-auth-link" onClick={onForgotPassword}>Forgot password?</button></div>
        <div className="mc-auth-input-wrap"><ShieldCheck size={17} /><input id="login-password" className="mc-auth-input" type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required /><button className="mc-auth-eye" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        <button className="mc-auth-submit" type="submit" disabled={loading}>{loading ? <><span className="mc-auth-spinner" /> Signing in…</> : 'Sign in securely'}</button>
      </form>
      {(error.toLowerCase().includes('confirm') || error.toLowerCase().includes('unverified')) && <button className="mc-auth-link mc-auth-resend-inline" type="button" onClick={() => onResend(email)}>Didn't receive a confirmation email? Resend it</button>}
      <div className="mc-auth-divider"><span /> <small>OR CONTINUE WITH</small> <span /></div>
      <button className="mc-auth-google" type="button" onClick={googleSignIn} disabled={googleLoading}><Chrome size={18} />{googleLoading ? 'Connecting to Google…' : 'Continue with Google'}</button>
      <p className="mc-auth-switch">New to MindCare? <button className="mc-auth-link" type="button" onClick={onSwitch}>Create an account</button></p>
    </AuthShell>
  )
}
