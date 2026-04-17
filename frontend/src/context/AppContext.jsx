import { createContext, useContext, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [sessionId]  = useState(() => uuidv4())

  const [phq9Result, setPhq9Result]         = useState(null)
  const [gad7Result, setGad7Result]         = useState(null)
  const [currentEmotion, setCurrentEmotion] = useState({ emotion:'neutral', confidence:0 })
  const [riskData, setRiskData]             = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [trajectory, setTrajectory]         = useState(null)  // { trend, trigger }

  const [messages, setMessages] = useState([{
    id: uuidv4(), role:'assistant', timestamp: new Date(),
    content: "Hello, I'm **MindCare** — a safe space to talk.\n\nI track your emotional trajectory over time and adapt my responses accordingly. Start by taking a **PHQ-9** or **GAD-7** assessment, then chat with me.\n\nHow are you feeling today?",
  }])

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id:uuidv4(), timestamp:new Date(), ...msg }])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([{
      id:uuidv4(), role:'assistant', timestamp:new Date(),
      content:"Session cleared. I'm here whenever you're ready.",
    }])
  }, [])

  return (
    <AppContext.Provider value={{
      sessionId,
      phq9Result, setPhq9Result,
      gad7Result, setGad7Result,
      currentEmotion, setCurrentEmotion,
      riskData, setRiskData,
      recommendations, setRecommendations,
      trajectory, setTrajectory,
      messages, addMessage, clearMessages,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)