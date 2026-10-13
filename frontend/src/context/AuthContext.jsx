import { createContext, useContext, useEffect, useState } from 'react'
import { refreshAuthSession } from '../api/client'

const AuthContext = createContext(null)
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function readResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || data.message || `Request failed (${response.status})`)
  return data
}

async function enrichWithProfile(accessToken, baseUser) {
  if (!accessToken || !baseUser) return baseUser
  try {
    const response = await fetch(`${API}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) return baseUser
    const profile = await response.json()
    return { ...baseUser, ...profile }
  } catch {
    // An unavailable profile must never prevent a valid sign-in.
    return baseUser
  }
}

function saveTokens(data) {
  if (data?.access_token) localStorage.setItem('mc_token', data.access_token)
  if (data?.refresh_token) localStorage.setItem('mc_refresh_token', data.refresh_token)
}

function clearTokens() {
  localStorage.removeItem('mc_token')
  localStorage.removeItem('mc_refresh_token')
  localStorage.removeItem('mc_active_session')
}

function cleanCallbackUrl() {
  window.history.replaceState({}, document.title, '/')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('mc_token') || null)
  const [loading, setLoading] = useState(true)
  const [authFlow, setAuthFlow] = useState('normal')
  const [authNotice, setAuthNotice] = useState(null)
  const [authEmail, setAuthEmail] = useState(() => localStorage.getItem('mc_pending_email') || '')

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const url = new URL(window.location.href)
      const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
      const combined = new URLSearchParams(url.search.startsWith('?') ? url.search.slice(1) : url.search)
      for (const [key, value] of hash.entries()) combined.set(key, value)

      const errorCode = combined.get('error_code') || ''
      const errorDescription = combined.get('error_description') || ''
      const callbackPath = url.pathname === '/auth/callback' || url.pathname === '/auth/callback/'
      const incomingAccessToken = hash.get('access_token')
      const incomingRefreshToken = hash.get('refresh_token')
      const flowType = hash.get('type')
      const recoveryRequested = url.searchParams.get('flow') === 'recovery' || flowType === 'recovery'

      if (errorCode || combined.get('error')) {
        const expired = errorCode === 'otp_expired' || /expired|invalid.*link/i.test(errorDescription)
        const readable = expired
          ? 'This email link has expired or was already used. Request a fresh email and open its newest link.'
          : (errorDescription.replace(/\+/g, ' ') || 'Authentication could not be completed. Please try again.')
        if (!cancelled) {
          setAuthNotice({ type: expired ? 'expired' : 'error', message: readable })
          setAuthEmail(localStorage.getItem('mc_pending_email') || '')
        }
        cleanCallbackUrl()
      }

      if (incomingAccessToken) {
        saveTokens({ access_token: incomingAccessToken, refresh_token: incomingRefreshToken })
        if (recoveryRequested && !cancelled) setAuthFlow('recovery')
        // Never leave access/refresh tokens in the address bar after capturing them.
        cleanCallbackUrl()
        try {
          const response = await fetch(`${API}/api/auth/me`, {
            headers: { Authorization: `Bearer ${incomingAccessToken}` },
          })
          if (!response.ok) throw new Error('The authentication callback did not create a valid session.')
          const currentUser = await response.json()
          const enrichedUser = await enrichWithProfile(incomingAccessToken, currentUser)
          if (!cancelled) {
            setUser(enrichedUser)
            setToken(incomingAccessToken)
            if (flowType === 'signup') {
              localStorage.removeItem('mc_pending_email')
              setAuthEmail('')
              setAuthNotice({ type: 'success', message: 'Your email is confirmed. You are signed in to MindCare.' })
            }
          }
          if (!recoveryRequested && !cancelled) setAuthFlow('normal')
        } catch (error) {
          clearTokens()
          if (!cancelled) {
            setUser(null)
            setToken(null)
            setAuthFlow('normal')
            setAuthNotice({ type: 'error', message: error.message || 'The link could not be verified. Please request a new one.' })
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
        return
      }

      const stored = localStorage.getItem('mc_token')
      if (!stored) {
        if (callbackPath && !errorCode && !cancelled) {
          setAuthNotice({ type: 'error', message: 'No active session was returned. The link may have expired; request a fresh email and try again.' })
          cleanCallbackUrl()
        }
        if (!cancelled) setLoading(false)
        return
      }

      let activeToken = stored
      let invalidSession = false
      try {
        let response = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${activeToken}` } })
        if (response.status === 401) {
          const refreshed = await refreshAuthSession()
          if (refreshed) {
            activeToken = refreshed
            response = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${activeToken}` } })
          }
          if (!refreshed || response.status === 401) invalidSession = true
        }
        if (!response.ok) throw new Error('Session could not be restored')
        const currentUser = await response.json()
        const enrichedUser = await enrichWithProfile(activeToken, currentUser)
        if (!cancelled) { setUser(enrichedUser); setToken(activeToken) }
      } catch {
        if (invalidSession) {
          clearTokens()
          if (!cancelled) { setToken(null); setUser(null) }
        } else if (!cancelled) {
          // Keep a stored session through temporary network/server failures.
          setUser(null)
          setToken(localStorage.getItem('mc_token'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restoreSession()
    const onExpired = () => {
      setUser(null); setToken(null); setAuthFlow('normal')
      setAuthNotice({ type: 'error', message: 'Your session expired. Please sign in again.' })
      localStorage.removeItem('mc_active_session')
      setLoading(false)
    }
    window.addEventListener('mindcare:auth-expired', onExpired)
    return () => { cancelled = true; window.removeEventListener('mindcare:auth-expired', onExpired) }
  }, [])

  async function register(username, email, password) {
    setAuthNotice(null)
    const response = await fetch(`${API}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
    const data = await readResponse(response)
    if (data.access_token) {
      saveTokens(data)
      setToken(data.access_token)
      const baseUser = { id: data.user_id, username: data.username, email: data.email }
      setUser(baseUser)
      enrichWithProfile(data.access_token, baseUser).then(enriched => {
        if (enriched) setUser(enriched)
      })
      localStorage.removeItem('mc_pending_email')
      setAuthEmail('')
    } else if (data.requires_email_confirmation) {
      localStorage.setItem('mc_pending_email', email.trim().toLowerCase())
      setAuthEmail(email.trim().toLowerCase())
    }
    return data
  }

  async function login(email, password) {
    setAuthNotice(null)
    const form = new URLSearchParams()
    form.append('username', email.trim().toLowerCase())
    form.append('password', password)
    const response = await fetch(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
    })
    const data = await readResponse(response)
    saveTokens(data)
    setToken(data.access_token)
    const baseUser = { id: data.user_id, username: data.username, email: data.email }
    setUser(baseUser)
    enrichWithProfile(data.access_token, baseUser).then(enriched => {
      if (enriched) setUser(enriched)
    })
    localStorage.removeItem('mc_pending_email')
    setAuthEmail('')
    setAuthFlow('normal')
    return data
  }

  async function resendConfirmation(email) {
    const response = await fetch(`${API}/api/auth/resend-confirmation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
    const data = await readResponse(response)
    setAuthNotice(null)
    localStorage.setItem('mc_pending_email', email.trim().toLowerCase())
    setAuthEmail(email.trim().toLowerCase())
    return data
  }

  async function forgotPassword(email) {
    const response = await fetch(`${API}/api/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
    return readResponse(response)
  }

  async function updatePassword(password) {
    const activeToken = localStorage.getItem('mc_token')
    if (!activeToken) throw new Error('Your password-reset session is missing or has expired. Request a new reset email.')
    const response = await fetch(`${API}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeToken}` },
      body: JSON.stringify({ password }),
    })
    const data = await readResponse(response)
    await logout()
    setAuthFlow('normal')
    setAuthNotice({ type: 'success', message: 'Password updated. Sign in with your new password.' })
    return data
  }

  async function signInWithGoogle() {
    setAuthNotice(null)
    const response = await fetch(`${API}/api/auth/oauth/google-url`)
    const data = await readResponse(response)
    if (!data.url || !/^https:\/\//i.test(data.url)) throw new Error('Supabase returned an invalid Google sign-in URL.')
    window.location.assign(data.url)
  }

  async function logout() {
    const stored = localStorage.getItem('mc_token')
    try {
      if (stored) await fetch(`${API}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${stored}` } })
    } catch { /* Clear the local session even when the network is unavailable. */ }
    setUser(null); setToken(null); setAuthFlow('normal')
    clearTokens()
  }

  function clearAuthNotice() { setAuthNotice(null) }
  function syncProfile(profile) { setUser((current) => current ? { ...current, ...profile } : current) }

  return (
    <AuthContext.Provider value={{
      user, token, loading, authFlow, authNotice, authEmail,
      login, register, logout, forgotPassword, resendConfirmation, updatePassword, signInWithGoogle,
      clearAuthNotice, setAuthFlow, syncProfile, isAuthed: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
