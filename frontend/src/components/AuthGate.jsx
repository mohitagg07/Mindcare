import { useState } from 'react'
import Login    from '../pages/Login'
import Register from '../pages/Register'

export default function AuthGate() {
  const [view, setView] = useState('login')
  return view === 'login'
    ? <Login    onSwitch={() => setView('register')} />
    : <Register onSwitch={() => setView('login')} />
}