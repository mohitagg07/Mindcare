import { useState } from 'react'
import Landing  from '../pages/Landing'
import Login    from '../pages/Login'
import Register from '../pages/Register'

export default function AuthGate() {
  const [view, setView] = useState('landing') // 'landing' | 'login' | 'register'

  if (view === 'login')    return <Login    onSwitch={() => setView('register')} onBack={() => setView('landing')}/>
  if (view === 'register') return <Register onSwitch={() => setView('login')}    onBack={() => setView('landing')}/>
  return <Landing onGetStarted={() => setView('register')}/>
}