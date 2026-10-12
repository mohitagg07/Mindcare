import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Login from '../pages/Login'
import Register from '../pages/Register'
import ForgotPassword from '../pages/ForgotPassword'
import ResendConfirmation from '../pages/ResendConfirmation'
import ResetPassword from '../pages/ResetPassword'

export default function AuthGate({ defaultView = 'login' }) {
  const { clearAuthNotice, setAuthFlow } = useAuth()
  const [view, setView] = useState(defaultView)
  useEffect(() => setView(defaultView), [defaultView])

  const navigate = next => {
    clearAuthNotice()
    if (next !== 'reset') setAuthFlow('normal')
    setView(next)
  }
  const resend = email => {
    if (email) localStorage.setItem('mc_pending_email', email.trim().toLowerCase())
    clearAuthNotice()
    setView('resend')
  }

  if (view === 'register') return <Register onSwitch={() => navigate('login')} onResend={resend} />
  if (view === 'forgot') return <ForgotPassword onSwitch={() => navigate('login')} />
  if (view === 'resend') return <ResendConfirmation onSwitch={() => navigate('login')} />
  if (view === 'reset') return <ResetPassword onSwitch={() => navigate('login')} />
  return <Login onSwitch={() => navigate('register')} onForgotPassword={() => navigate('forgot')} onResend={() => resend()} />
}
