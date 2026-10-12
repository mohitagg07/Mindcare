import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import { AlertCircle, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'

export default function ResetPassword({ onSwitch }) {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault(); setError('')
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) { setError('Use at least 8 characters, including a letter and a number.'); return }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return }
    setLoading(true)
    try { await updatePassword(password) }
    catch (err) { setError(err.message || 'The password could not be updated. Request a new reset email if this link has expired.') }
    finally { setLoading(false) }
  }

  return <AuthShell title="Choose a new password" subtitle="Use a strong password you have not used elsewhere.">
    {error && <div className="mc-auth-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}
    <form className="mc-auth-form" onSubmit={submit}>
      <label className="mc-auth-label" htmlFor="new-password">New password</label>
      <div className="mc-auth-input-wrap"><KeyRound size={17} /><input id="new-password" className="mc-auth-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} required /><button className="mc-auth-eye" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
      <label className="mc-auth-label" htmlFor="confirm-password">Confirm new password</label>
      <input id="confirm-password" className="mc-auth-input mc-auth-input-standalone" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required />
      <p className="mc-auth-password-hint"><ShieldCheck size={14} /> Minimum 8 characters, including at least one letter and one number.</p>
      <button className="mc-auth-submit" type="submit" disabled={loading}>{loading ? <><span className="mc-auth-spinner" /> Updating password…</> : 'Update password'}</button>
    </form>
    <button className="mc-auth-back" type="button" onClick={onSwitch}>Back to sign in</button>
  </AuthShell>
}
