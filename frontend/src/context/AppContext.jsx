import { createContext, useContext, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

const AppContext = createContext(null)

const welcomeMessage = () => ({
  id: uuidv4(),
  role: 'assistant',
  content: "Hello, I'm **MindCare** — a calm space to talk about your wellbeing.\n\nYou can share what's on your mind, explore a PHQ-9 or GAD-7 screening, or try a guided reflection. I'll respond without judgment.\n\nWhat feels most important to talk about today?",
  timestamp: new Date().toISOString(),
})

function getInitialSessionId() {
  try {
    const saved = localStorage.getItem('mc_active_session')
    if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return saved
    const next = uuidv4()
    localStorage.setItem('mc_active_session', next)
    return next
  } catch {
    return uuidv4()
  }
}

export function AppProvider({ children }) {
  const [sessionId, setSessionIdState] = useState(getInitialSessionId)
  const [activePage, setActivePage] = useState('dashboard')
  const [pendingChatPrompt, setPendingChatPrompt] = useState('')
  const [phq9Result, setPhq9Result] = useState(null)
  const [gad7Result, setGad7Result] = useState(null)
  const [currentEmotion, setCurrentEmotion] = useState({ emotion: 'unavailable', confidence: 0 })
  const [riskData, setRiskData] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [trajectory, setTrajectory] = useState(null)
  const [messages, setMessages] = useState([welcomeMessage()])

  const setSessionId = useCallback((nextId) => {
    setSessionIdState(nextId)
    try { localStorage.setItem('mc_active_session', nextId) } catch { /* storage can be unavailable */ }
  }, [])

  const createNewSession = useCallback(() => {
    const nextId = uuidv4()
    setSessionId(nextId)
    setMessages([welcomeMessage()])
    setRiskData(null)
    setRecommendations(null)
    setTrajectory(null)
    return nextId
  }, [setSessionId])

  const replaceMessages = useCallback((nextMessages) => {
    setMessages(nextMessages)
  }, [])

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: uuidv4(), timestamp: new Date().toISOString(), ...msg }])
  }, [])

  return (
    <AppContext.Provider value={{
      sessionId, setSessionId, createNewSession,
      activePage, setActivePage, pendingChatPrompt, setPendingChatPrompt,
      phq9Result, setPhq9Result, gad7Result, setGad7Result,
      currentEmotion, setCurrentEmotion, riskData, setRiskData,
      recommendations, setRecommendations, trajectory, setTrajectory,
      messages, setMessages, replaceMessages, addMessage,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
