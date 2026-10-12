const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getToken() { return localStorage.getItem('mc_token') }

function clearStoredAuth() {
  localStorage.removeItem('mc_token')
  localStorage.removeItem('mc_refresh_token')
  localStorage.removeItem('mc_active_session')
}

function notifyAuthExpired() {
  clearStoredAuth()
  window.dispatchEvent(new Event('mindcare:auth-expired'))
}

let refreshInFlight = null

// Single-flight refresh prevents parallel 401s from rotating the same refresh token twice.
export function refreshAuthSession() {
  if (refreshInFlight) return refreshInFlight
  const refreshToken = localStorage.getItem('mc_refresh_token')
  if (!refreshToken) return Promise.resolve(null)

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) throw new Error('Refresh failed')
      const data = await res.json()
      if (!data.access_token) throw new Error('Supabase did not return an access token')
      localStorage.setItem('mc_token', data.access_token)
      if (data.refresh_token) localStorage.setItem('mc_refresh_token', data.refresh_token)
      return data.access_token
    } catch {
      clearStoredAuth()
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

async function request(path, options = {}, alreadyRetried = false) {
  const token = getToken()
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401 && token && !alreadyRetried && !path.startsWith('/api/auth/')) {
    const nextToken = await refreshAuthSession()
    if (nextToken) return request(path, options, true)
    // Let the auth context switch to signed-out state without a hard page reload.
    notifyAuthExpired()
    throw new Error('Your session expired. Please sign in again.')
  }

  const contentType = res.headers.get('content-type') || ''
  const json = contentType.includes('application/json') ? await res.json() : null
  if (!res.ok) {
    const error = new Error(json?.detail || json?.message || `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return { data: json ?? {} }
}

export const getQuestions   = ()      => request('/api/assessment/questions')
export const getAssessmentHistory = () => request('/api/assessment/history')
export const submitPHQ9     = (a)     => request('/api/assessment/phq9',          { method:'POST', body:JSON.stringify({ responses:a }) })
export const submitGAD7     = (a)     => request('/api/assessment/gad7',          { method:'POST', body:JSON.stringify({ responses:a }) })
export const sendChat       = (body)  => request('/api/chat',                     { method:'POST', body:JSON.stringify(body) })
export const getChatHistory = (sid)   => request(`/api/chat/history/${encodeURIComponent(sid)}`)
export const clearSession   = (sid)   => request(`/api/chat/session/${sid}`,      { method:'DELETE' })
export const analyzeEmotion = (img)   => request('/api/emotion/analyze',          { method:'POST', body:JSON.stringify({ image:img }) })
export const getTrajectory  = ()      => request('/api/metrics/trajectory')
export const getMyProfile  = ()      => request('/api/auth/profile')
export const updateMyProfile = (body) => request('/api/auth/profile', { method:'PATCH', body:JSON.stringify(body) })
export const uploadMyAvatar = (file) => { const body = new FormData(); body.append('file', file); return request('/api/auth/profile/avatar', { method: 'POST', body }) }
export const deleteMyAvatar = () => request('/api/auth/profile/avatar', { method: 'DELETE' })

export const api = {
  metricsOverview: () => request('/api/metrics/overview'),
  emotionDist:     () => request('/api/metrics/emotion-distribution'),
  riskDist:        () => request('/api/metrics/risk-distribution'),
  modelPerf:       () => request('/api/metrics/model-performance'),
  mySessions:      () => request('/api/metrics/my-sessions'),
  assessmentHistory: () => request('/api/assessment/history'),
  trajectory:      () => request('/api/metrics/trajectory'),
}