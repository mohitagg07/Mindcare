const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getToken() { return localStorage.getItem('mc_token') }

async function request(path, options = {}) {
  const token = getToken()
  const res   = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization:`Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'Request failed')
  return { data: json }
}

export const getQuestions  = ()     => request('/api/assessment/questions')
export const submitPHQ9    = (a)    => request('/api/assessment/phq9', { method:'POST', body:JSON.stringify({ responses:a }) })
export const submitGAD7    = (a)    => request('/api/assessment/gad7', { method:'POST', body:JSON.stringify({ responses:a }) })
export const sendChat      = (body) => request('/api/chat',             { method:'POST', body:JSON.stringify(body) })
export const clearSession  = (sid)  => request(`/api/chat/session/${sid}`, { method:'DELETE' })
export const analyzeEmotion= (img)  => request('/api/emotion/analyze',  { method:'POST', body:JSON.stringify({ image:img }) })
export const getTrajectory = ()     => request('/api/metrics/trajectory')
export const heartbeat     = ()     => request('/api/metrics/heartbeat', { method:'POST' })

export const api = {
  metricsOverview: () => request('/api/metrics/overview'),
  emotionDist:     () => request('/api/metrics/emotion-distribution'),
  riskDist:        () => request('/api/metrics/risk-distribution'),
  modelPerf:       () => request('/api/metrics/model-performance'),
  mySessions:      () => request('/api/metrics/my-sessions'),
  trajectory:      () => request('/api/metrics/trajectory'),
}