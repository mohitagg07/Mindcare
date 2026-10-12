import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Send, Trash2, Heart, UserRound, BookOpen, AlertCircle, Sparkles,
  ShieldCheck, ArrowUpRight, MessageCircle, Wind, Moon, Brain, LoaderCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { sendChat, clearSession, getChatHistory } from '../api/client.js'

const QUICK_STARTS = [
  { icon: Wind, title: 'I feel anxious', text: "I've been feeling anxious lately", tint: 'sage' },
  { icon: Moon, title: 'Sleep has been hard', text: "I've been having trouble sleeping", tint: 'blue' },
  { icon: Brain, title: 'Too much on my mind', text: 'I feel overwhelmed with everything', tint: 'plum' },
]

function formatTime(value, timeZone) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  try {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', ...(timeZone ? { timeZone } : {}) })
  } catch {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

function Message({ msg, timeZone }) {
  const isUser = msg.role === 'user'
  return (
    <article className={`chat-message ${isUser ? 'from-user' : 'from-assistant'}`}>
      {!isUser && <div className="chat-avatar assistant-avatar"><Heart size={15} fill="currentColor" /></div>}
      <div className="chat-message-stack">
        <div className="chat-message-meta">
          <span>{isUser ? 'You' : 'MindCare'}</span>
          <time>{formatTime(msg.timestamp || msg.created_at, timeZone)}</time>
        </div>
        <div className="chat-bubble">
          {isUser ? <p>{msg.content}</p> : (
            <ReactMarkdown components={{
              p: ({ children }) => <p>{children}</p>,
              strong: ({ children }) => <strong>{children}</strong>,
              ul: ({ children }) => <ul>{children}</ul>,
              ol: ({ children }) => <ol>{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
              blockquote: ({ children }) => <blockquote>{children}</blockquote>,
            }}>{msg.content}</ReactMarkdown>
          )}
        </div>
        {!isUser && (msg.rag_used || msg.crisis_detected || msg.metadata?.crisis_detected) && (
          <div className="chat-message-badges">
            {(msg.rag_used || msg.metadata?.rag_used) && <span><BookOpen size={12} /> Knowledge resources used</span>}
            {(msg.crisis_detected || msg.metadata?.crisis_detected) && <span className="crisis-badge"><AlertCircle size={12} /> Safety resources included</span>}
          </div>
        )}
      </div>
      {isUser && <div className="chat-avatar user-avatar"><UserRound size={15} /></div>}
    </article>
  )
}

function TypingIndicator() {
  return (
    <div className="chat-message from-assistant" role="status" aria-label="MindCare is responding">
      <div className="chat-avatar assistant-avatar"><Heart size={15} fill="currentColor" /></div>
      <div className="chat-message-stack">
        <div className="chat-message-meta"><span>MindCare</span><span>Thinking it through</span></div>
        <div className="chat-typing"><i /><i /><i /></div>
      </div>
    </div>
  )
}

export default function Chat() {
  const { user } = useAuth()
  const {
    sessionId, setSessionId, createNewSession, phq9Result, gad7Result,
    currentEmotion, setRiskData, setRecommendations, setTrajectory,
    messages, addMessage, replaceMessages, pendingChatPrompt, setPendingChatPrompt,
  } = useApp()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const scrollAreaRef = useRef(null)
  const inputRef = useRef(null)
  const interacted = useRef(false)

  useEffect(() => {
    let alive = true
    interacted.current = false
    setNotice('')
    replaceMessages([])
    setHistoryLoading(true)
    getChatHistory(sessionId)
      .then(({ data }) => {
        if (!alive || interacted.current || !Array.isArray(data.history) || data.history.length === 0) return
        const restored = data.history.map((row, index) => ({
          id: row.id || `${sessionId}-${index}`,
          role: row.role,
          content: row.content,
          timestamp: row.created_at || new Date().toISOString(),
          emotion: row.emotion,
          risk_score: row.risk_score,
          metadata: row.metadata || {},
        }))
        replaceMessages(restored)
      })
      .catch((error) => {
        // A 404 means this is a new session or its prior session was removed.
        if (alive && error.status !== 404) setNotice('Could not restore the previous conversation. You can still start a new message.')
      })
      .finally(() => { if (alive) setHistoryLoading(false) })
    return () => { alive = false }
  }, [sessionId, replaceMessages])

  useEffect(() => {
    if (!pendingChatPrompt) return
    setInput(pendingChatPrompt)
    setPendingChatPrompt('')
    window.setTimeout(() => inputRef.current?.focus(), 80)
  }, [pendingChatPrompt, setPendingChatPrompt])

  useEffect(() => {
    const area = scrollAreaRef.current
    if (!area) return
    // Keep scrolling scoped to the chat viewport; scrollIntoView can scroll outer
    // containers too and caused the workspace header/sidebar to visually collide.
    area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (providedText) => {
    const text = (providedText ?? input).trim()
    if (!text || loading) return
    interacted.current = true
    setNotice('')
    setInput('')
    addMessage({ role: 'user', content: text })
    setLoading(true)
    try {
      const { data } = await sendChat({
        session_id: sessionId,
        message: text,
        phq9_score: phq9Result?.score ?? null,
        phq9_category: phq9Result?.category ?? 'Not assessed',
        phq9_crisis_flag: !!phq9Result?.crisis_flag,
        gad7_score: gad7Result?.score ?? null,
        gad7_category: gad7Result?.category ?? 'Not assessed',
        emotion: currentEmotion?.confidence > 0 && currentEmotion?.emotion !== 'unavailable' ? currentEmotion.emotion : null,
      })
      if (data.session_id && data.session_id !== sessionId) setSessionId(data.session_id)
      addMessage({
        role: 'assistant', content: data.response, rag_used: data.rag_used,
        crisis_detected: data.crisis_detected,
      })
      if (data.risk) setRiskData(data.risk)
      if (data.recommendations) setRecommendations(data.recommendations)
      if (data.trajectory) setTrajectory(data.trajectory)
    } catch (error) {
      addMessage({ role: 'assistant', content: `I couldn't complete that message just now. ${error.message || 'Please check your connection and try again.'}`, error: true })
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleNewConversation = async () => {
    if (loading) return
    const confirmed = window.confirm('Start a new conversation? This removes the current conversation from your account history.')
    if (!confirmed) return
    try { await clearSession(sessionId) } catch { /* A fresh local session can still begin if no saved session exists. */ }
    createNewSession()
    interacted.current = false
    setInput('')
    setNotice('A new conversation is ready.')
  }

  const isNewChat = messages.length <= 1

  return (
    <section className="chat-workspace" aria-label="Chat with MindCare">
      <header className="chat-panel-header">
        <div className="chat-title-lockup">
          <div className="chat-title-mark"><Heart size={18} fill="currentColor" /></div>
          <div>
            <h1>Talk to MindCare</h1>
            <p>A little space to think out loud</p>
          </div>
        </div>
        <div className="chat-header-actions">
          <div className="chat-secure-label"><ShieldCheck size={14} /><span>Account-protected</span></div>
          <button type="button" className="chat-icon-button" onClick={handleNewConversation} disabled={loading} aria-label="Start a new conversation" title="New conversation"><Trash2 size={17} /></button>
        </div>
      </header>

      <div ref={scrollAreaRef} className={`chat-scroll-area${isNewChat ? ' is-new-chat' : ''}`}>
        <div className="chat-content-column">
          {isNewChat ? (
            <div className="chat-welcome animate-fade-up">
              <div className="chat-welcome-orb"><Heart size={28} strokeWidth={1.6} /></div>
              <p className="chat-welcome-kicker"><Sparkles size={13} /> START HERE</p>
              <h2>Start anywhere.<br /><em>One thing at a time.</em></h2>
              <p className="chat-welcome-copy">You can start with a thought, a feeling, or a question.</p>
              <div className="chat-prompt-grid">
                {QUICK_STARTS.map(({ icon: Icon, title, text, tint }) => (
                  <button key={title} type="button" className={`chat-prompt-card tint-${tint}`} onClick={() => handleSend(text)} disabled={loading || historyLoading}>
                    <span className="chat-prompt-icon"><Icon size={17} /></span>
                    <span className="chat-prompt-title">{title}</span>
                    <ArrowUpRight size={15} className="chat-prompt-arrow" />
                  </button>
                ))}
              </div>
              <div className="chat-welcome-note"><ShieldCheck size={15} /><span>Your chat is associated with your account. Avoid sharing passwords or information you don't need to share.</span></div>
            </div>
          ) : (
            <div className="chat-message-list">
              {messages.map(msg => <Message key={msg.id} msg={msg} timeZone={user?.timezone} />)}
              {loading && <TypingIndicator />}
            </div>
          )}
        </div>
      </div>

      {notice && <div className="chat-notice" role="status">{notice}</div>}

      <footer className="chat-composer-shell">
        <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); handleSend() }}>
          <label className="sr-only" htmlFor="mindcare-chat-input">Your message</label>
          <textarea
            id="mindcare-chat-input"
            ref={inputRef}
            value={input}
            rows={1}
            maxLength={2000}
            onChange={(event) => {
              setInput(event.target.value)
              event.target.style.height = 'auto'
              event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSend() }
            }}
            placeholder="Write what’s on your mind…"
            disabled={loading || historyLoading}
          />
          <button type="submit" disabled={!input.trim() || loading || historyLoading} aria-label="Send message" className="chat-send-button">
            {loading ? <LoaderCircle size={18} className="spin-icon" /> : <Send size={17} />}
          </button>
        </form>
        <div className="chat-composer-meta">
          <span><kbd>Enter</kbd> to send <span className="meta-separator">·</span> <kbd>Shift + Enter</kbd> for a new line</span>
          <span className="chat-care-note">Not a substitute for professional care</span>
        </div>
      </footer>
    </section>
  )
}
