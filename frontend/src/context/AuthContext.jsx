import { createContext, useContext, useState, useEffect, useRef } from 'react'

const AuthContext = createContext(null)
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(() => localStorage.getItem('mc_token') || null)
  const [loading, setLoading] = useState(true)
  const verified  = useRef(false)

  useEffect(() => {
    if (verified.current) return
    verified.current = true
    const stored = localStorage.getItem('mc_token')
    if (!stored) { setLoading(false); return }
    fetch(`${API}/api/auth/me`, { headers:{ Authorization:`Bearer ${stored}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(u  => { setUser(u); setToken(stored) })
      .catch(() => { setToken(null); setUser(null); localStorage.removeItem('mc_token') })
      .finally(() => setLoading(false))
  }, [])

  async function register(username, email, password) {
    const r    = await fetch(`${API}/api/auth/register`, {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.detail || 'Registration failed')
    _store(data); return data
  }

  async function login(usernameOrEmail, password) {
    const form = new URLSearchParams()
    form.append('username', usernameOrEmail)
    form.append('password', password)
    const r    = await fetch(`${API}/api/auth/login`, {
      method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: form,
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.detail || 'Login failed')
    _store(data); return data
  }

  function logout() {
    setUser(null); setToken(null); localStorage.removeItem('mc_token')
  }

  function _store(data) {
    localStorage.setItem('mc_token', data.access_token)
    setToken(data.access_token)
    setUser({ id:data.user_id, username:data.username, email:data.email })
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthed:!!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)