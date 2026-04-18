import { createContext, useContext, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [sessionId]  = useState(() => uuidv4())
  const [activePage, setActivePage]   = useState('chat')
  const [phq9Result, setPhq9Result]   = useState(null)
  const [gad7Result, setGad7Result]   = useState(null)
  const [currentEmotion, setCurrentEmotion] = useState({ emotion:'neutral', confidence:0 })
  const [riskData, setRiskData]       = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [messages, setMessages] = useState([{
    id: uuidv4(), role:'assistant',
    content: "Hello, I'm **MindCare** — your safe space to talk.\n\nI'm here to listen without judgment. Share what's on your mind, take a **PHQ-9** or **GAD-7** screening, or use the **Emotion Detection** tool.\n\nHow are you feeling today?",
    timestamp: new Date(),
  }])

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id:uuidv4(), timestamp:new Date(), ...msg }])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([{ id:uuidv4(), role:'assistant', content:"Session cleared. I'm here when you're ready.", timestamp:new Date() }])
  }, [])

  return (
    <AppContext.Provider value={{ sessionId, activePage, setActivePage, phq9Result, setPhq9Result, gad7Result, setGad7Result, currentEmotion, setCurrentEmotion, riskData, setRiskData, recommendations, setRecommendations, messages, addMessage, clearMessages }}>
      {children}
    </AppContext.Provider>
  )
}
export const useApp = () => useContext(AppContext)
