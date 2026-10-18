import { readChatEventStream } from './sse.js'

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
    const detail = Array.isArray(json?.detail)
      ? json.detail.map(item => item?.msg).filter(Boolean).join(' ')
      : json?.detail
    const error = new Error(detail || json?.message || `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return { data: json ?? {} }
}

export const getQuestions   = ()      => request('/api/assessment/questions')
export const getAssessmentHistory = () => request('/api/assessment/history')
export const submitPHQ9     = (answers, submissionId) => request('/api/assessment/phq9', { method:'POST', body:JSON.stringify({ responses:answers, submission_id:submissionId }) })
export const submitGAD7     = (answers, submissionId) => request('/api/assessment/gad7', { method:'POST', body:JSON.stringify({ responses:answers, submission_id:submissionId }) })
export const sendChat       = (body)  => request('/api/chat', { method:'POST', body:JSON.stringify(body) })
export async function sendChatStream(body, { signal, onDelta } = {}) {
  const controller = new AbortController()
  const relayAbort = () => controller.abort(signal?.reason)
  if (signal?.aborted) relayAbort()
  else signal?.addEventListener('abort', relayAbort, { once: true })
  const timeoutId = window.setTimeout(() => controller.abort(new DOMException('The response took too long. Please try again.', 'TimeoutError')), 90000)

  const readError = async response => {
    const contentType = response.headers.get('content-type') || ''
    const json = contentType.includes('application/json') ? await response.json().catch(() => null) : null
    const detail = Array.isArray(json?.detail) ? json.detail.map(item => item?.msg).filter(Boolean).join(' ') : json?.detail
    const error = new Error(detail || json?.message || `Request failed (${response.status})`)
    error.status = response.status
    return error
  }

  try {
    const makeRequest = token => fetch(`${API}/api/chat/stream`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
    let token = getToken()
    let response = await makeRequest(token)
    if (response.status === 401 && token) {
      const nextToken = await refreshAuthSession()
      if (nextToken) {
        token = nextToken
        response = await makeRequest(token)
      } else {
        notifyAuthExpired()
        throw new Error('Your session expired. Please sign in again.')
      }
    }
    if (!response.ok) throw await readError(response)
    return await readChatEventStream(response, onDelta)
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', relayAbort)
  }
}
export const getChatHistory = (sid)   => request(`/api/chat/history/${encodeURIComponent(sid)}`)
export const getChatMemories = () => request('/api/chat/memories')
export const createChatMemory = (content) => request('/api/chat/memories', { method: 'POST', body: JSON.stringify({ content }) })
export const deleteChatMemory = (memoryId) => request(`/api/chat/memories/${encodeURIComponent(memoryId)}`, { method: 'DELETE' })
export const clearSession   = (sid)   => request(`/api/chat/session/${sid}`,      { method:'DELETE' })
export const analyzeEmotion = (img)   => request('/api/emotion/analyze',          { method:'POST', body:JSON.stringify({ image:img }) })
export const getTrajectory  = ()      => request('/api/metrics/trajectory')
export const getMyProfile  = ()      => request('/api/auth/profile')
export const updateMyProfile = (body) => request('/api/auth/profile', { method:'PATCH', body:JSON.stringify(body) })
export const uploadMyAvatar = (file) => { const body = new FormData(); body.append('file', file); return request('/api/auth/profile/avatar', { method: 'POST', body }) }
export const deleteMyAvatar = () => request('/api/auth/profile/avatar', { method: 'DELETE' })
export const deleteMyAccount = () => request('/api/auth/profile/account', { method: 'DELETE', body: JSON.stringify({ confirmation: 'DELETE' }) })

export const api = {
  metricsOverview: () => request('/api/metrics/overview'),
  emotionDist:     () => request('/api/metrics/emotion-distribution'),
  riskDist:        () => request('/api/metrics/risk-distribution'),
  modelPerf:       () => request('/api/metrics/model-performance'),
  mySessions:      () => request('/api/metrics/my-sessions'),
  assessmentHistory: () => request('/api/assessment/history'),
  trajectory:      () => request('/api/metrics/trajectory'),
}
