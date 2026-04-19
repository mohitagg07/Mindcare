import { useState } from 'react'
import Login    from '../pages/Login'
import Register from '../pages/Register'

export default function AuthGate({ defaultView = 'login' }) {
  const [view, setView] = useState(defaultView)

  if (view === 'register')
    return <Register onSwitch={() => setView('login')} />

  return <Login onSwitch={() => setView('register')} />
}