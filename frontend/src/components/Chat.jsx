import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Send, Plus, Heart, UserRound, BookOpen, AlertCircle, Sparkles,
  ShieldCheck, ArrowUpRight, Wind, Moon, Brain, LoaderCircle,
  Bookmark, X, RefreshCw, Check, Trash2,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { sendChat, getChatHistory, getChatMemories, createChatMemory, deleteChatMemory } from '../api/client.js'
import './ChatPhase3.css'

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

function Message({ msg, timeZone, onRetry }) {
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
        {msg.error && msg.retryText && (
          <div className="chat-retry-row"><span>The reply failed. You can retry this message.</span><button type="button" onClick={() => onRetry?.(msg)}><RefreshCw size={13} /> Try again</button></div>
        )}
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
  const [historyError, setHistoryError] = useState('')
  const [historyReload, setHistoryReload] = useState(0)
  const [notice, setNotice] = useState('')
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [memories, setMemories] = useState([])
  const [memoryLoading, setMemoryLoading] = useState(false)
  const [memoryReload, setMemoryReload] = useState(0)
  const [memoryText, setMemoryText] = useState('')
  const [memorySaving, setMemorySaving] = useState(false)
  const [memoryDeletingId, setMemoryDeletingId] = useState('')
  const [memoryError, setMemoryError] = useState('')
  const [memorySuccess, setMemorySuccess] = useState('')
  const scrollAreaRef = useRef(null)
  const inputRef = useRef(null)
  const memoryTriggerRef = useRef(null)
  const memoryDialogRef = useRef(null)
  const interacted = useRef(false)

  useEffect(() => {
    let alive = true
    interacted.current = false
    setNotice('')
    setHistoryError('')
    replaceMessages([])
    setHistoryLoading(true)
    getChatHistory(sessionId)
      .then(({ data }) => {
        if (!alive || interacted.current || !Array.isArray(data.history)) return
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
        // A 404 is the normal response for a fresh session with no persisted messages.
        if (alive && error.status !== 404) setHistoryError(error.message || 'Your conversation could not be restored.')
      })
      .finally(() => { if (alive) setHistoryLoading(false) })
    return () => { alive = false }
  }, [sessionId, historyReload, replaceMessages])

  useEffect(() => {
    if (!memoryOpen) return
    let alive = true
    setMemoryLoading(true)
    setMemoryError('')
    setMemories([])
    getChatMemories()
      .then(({ data }) => { if (alive) setMemories(Array.isArray(data.memories) ? data.memories : []) })
      .catch((error) => { if (alive) setMemoryError(error.message || 'Saved memories could not be loaded.') })
      .finally(() => { if (alive) setMemoryLoading(false) })
    return () => { alive = false }
  }, [memoryOpen, memoryReload])

  useEffect(() => {
    if (!memoryOpen) return
    const dialog = memoryDialogRef.current
    const focusable = () => [...(dialog?.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])]
      .filter(element => element.getClientRects().length > 0)
    const firstControl = focusable()[0]
    ;(firstControl || dialog)?.focus()

    const containFocus = event => {
      if (event.key === 'Escape') {
        setMemoryOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const controls = focusable()
      if (!controls.length) {
        event.preventDefault()
        dialog?.focus()
        return
      }
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', containFocus)
    return () => {
      window.removeEventListener('keydown', containFocus)
      memoryTriggerRef.current?.focus()
    }
  }, [memoryOpen])

  useEffect(() => {
    if (!pendingChatPrompt) return
    setInput(pendingChatPrompt)
    setPendingChatPrompt('')
  }, [pendingChatPrompt, setPendingChatPrompt])

  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`
  }, [input])

  useEffect(() => {
    const shell = scrollAreaRef.current?.closest('.mc-app-shell')
    const viewport = window.visualViewport
    if (!shell || !viewport) return

    const updateForKeyboard = () => {
      const focusedElement = document.activeElement
      const editing = focusedElement instanceof HTMLElement
        && shell.contains(focusedElement)
        && focusedElement.matches('input, textarea, [contenteditable="true"]')
      const keyboardVisible = editing && window.innerHeight - viewport.height > 120

      if (keyboardVisible) {
        shell.classList.add('is-chat-keyboard-open')
        shell.style.setProperty('--mc-chat-viewport-height', `${viewport.height}px`)
        shell.style.setProperty('--mc-chat-viewport-top', `${viewport.offsetTop}px`)
      } else {
        shell.classList.remove('is-chat-keyboard-open')
        shell.style.removeProperty('--mc-chat-viewport-height')
        shell.style.removeProperty('--mc-chat-viewport-top')
      }
    }
    const updateAfterFocus = () => window.requestAnimationFrame(updateForKeyboard)

    window.addEventListener('resize', updateForKeyboard)
    viewport.addEventListener('resize', updateForKeyboard)
    viewport.addEventListener('scroll', updateForKeyboard)
    shell.addEventListener('focusin', updateAfterFocus)
    shell.addEventListener('focusout', updateAfterFocus)
    updateForKeyboard()

    return () => {
      window.removeEventListener('resize', updateForKeyboard)
      viewport.removeEventListener('resize', updateForKeyboard)
      viewport.removeEventListener('scroll', updateForKeyboard)
      shell.removeEventListener('focusin', updateAfterFocus)
      shell.removeEventListener('focusout', updateAfterFocus)
      shell.classList.remove('is-chat-keyboard-open')
      shell.style.removeProperty('--mc-chat-viewport-height')
      shell.style.removeProperty('--mc-chat-viewport-top')
    }
  }, [])

  useEffect(() => {
    const area = scrollAreaRef.current
    if (!area) return
    // Keep scrolling scoped to the chat viewport; scrollIntoView can scroll outer
    // containers too and caused the workspace header/sidebar to visually collide.
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    area.scrollTo({ top: area.scrollHeight, behavior })
  }, [messages, loading])

  const handleSend = async (providedText, { appendUser = true } = {}) => {
    const text = (providedText ?? input).trim()
    if (!text || loading) return
    const keepComposerFocused = document.activeElement === inputRef.current
    interacted.current = true
    setNotice('')
    if (appendUser) {
      setInput('')
      addMessage({ role: 'user', content: text })
    }
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
      addMessage({ role: 'assistant', content: `I couldn’t complete that reply. ${error.message || 'Check your connection, then try again.'}`, error: true, retryText: text })
    } finally {
      setLoading(false)
      if (keepComposerFocused) setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleNewConversation = () => {
    if (loading || historyLoading) return
    const hasMessages = messages.some(message => message.role === 'user')
    if (hasMessages && !window.confirm('Start a new conversation? Your current chat will stay in your history.')) return
    createNewSession()
    interacted.current = false
    setInput('')
    setNotice('A new conversation is ready.')
    setHistoryError('')
  }

  const retryMessage = (failedMessage) => {
    if (!failedMessage?.retryText || loading) return
    replaceMessages(messages.filter(message => message.id !== failedMessage.id))
    handleSend(failedMessage.retryText, { appendUser: false })
  }

  const saveMemory = async (event) => {
    event.preventDefault()
    const content = memoryText.trim().replace(/\s+/g, ' ')
    if (content.length < 2 || memorySaving || memories.length >= 20) return
    setMemoryError('')
    setMemorySuccess('')
    setMemorySaving(true)
    try {
      const { data } = await createChatMemory(content)
      if (data.memory) setMemories(current => [data.memory, ...current].slice(0, 20))
      setMemoryText('')
      setMemorySuccess('Saved. MindCare can use this note in future conversations.')
    } catch (error) {
      setMemoryError(error.message || 'This note could not be saved. Please retry.')
    } finally {
      setMemorySaving(false)
    }
  }

  const removeMemory = async (memory) => {
    if (!memory?.id || memoryDeletingId) return
    if (!window.confirm('Remove this saved memory? MindCare will no longer use it in future replies.')) return
    setMemoryError('')
    setMemorySuccess('')
    setMemoryDeletingId(memory.id)
    try {
      await deleteChatMemory(memory.id)
      setMemories(current => current.filter(item => item.id !== memory.id))
      setMemorySuccess('Memory removed.')
    } catch (error) {
      setMemoryError(error.message || 'This memory could not be removed. Please retry.')
    } finally {
      setMemoryDeletingId('')
    }
  }


  const isNewChat = messages.length === 0

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
          <button ref={memoryTriggerRef} type="button" className="chat-memory-trigger" onClick={() => { setMemoryOpen(true); setMemoryError(''); setMemorySuccess('') }} aria-label="Manage saved memories" title="Manage saved memories"><Bookmark size={15} /><span>Memory</span></button>
          <button type="button" className="chat-icon-button chat-new-button" onClick={handleNewConversation} disabled={loading || historyLoading} aria-label="Start a new conversation" title="New conversation"><Plus size={18} /></button>
        </div>
      </header>

      <div ref={scrollAreaRef} className={`chat-scroll-area${isNewChat ? ' is-new-chat' : ''}`}>
        <div className="chat-content-column">
          {historyLoading && messages.length === 0 ? (
            <div className="chat-history-loading" role="status"><span className="chat-loading-line wide" /><span className="chat-loading-line" /><span className="chat-loading-line short" /><span className="chat-loading-caption"><LoaderCircle size={15} className="spin-icon" /> Restoring your conversation…</span></div>
          ) : historyError ? (
            <div className="chat-history-error" role="alert"><span className="chat-state-icon"><AlertCircle size={19} /></span><h2>Couldn’t restore this chat</h2><p>{historyError}</p><div><button type="button" className="chat-memory-primary" onClick={() => setHistoryReload(value => value + 1)}><RefreshCw size={14} /> Try again</button><button type="button" className="chat-memory-secondary" onClick={handleNewConversation}>Start a new chat</button></div></div>
          ) : isNewChat ? (
            <div className="chat-welcome animate-fade-up">
              <div className="chat-welcome-orb"><Heart size={28} strokeWidth={1.6} /></div>
              <p className="chat-welcome-kicker"><Sparkles size={13} /> START HERE</p>
              <h2>{String(user?.display_name || '').trim() ? <>Hi, {String(user.display_name).trim().split(/\s+/)[0]}.<br /></> : <>Start anywhere.<br /></>}<em>One thing at a time.</em></h2>
              <p className="chat-welcome-copy">{String(user?.display_name || '').trim() ? 'Your saved preferences come with you. Start with whatever is on your mind today.' : 'You can start with a thought, a feeling, or a question.'}</p>
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
            <div className="chat-message-list" role="log" aria-label="Conversation messages" aria-relevant="additions">
              {messages.map(msg => <Message key={msg.id} msg={msg} timeZone={user?.timezone} onRetry={retryMessage} />)}
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
            enterKeyHint="send"
            onChange={(event) => setInput(event.target.value)}
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

      {memoryOpen && (
        <div className="chat-memory-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setMemoryOpen(false) }}>
          <section ref={memoryDialogRef} className="chat-memory-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-memory-title" tabIndex={-1}>
            <header className="chat-memory-heading">
              <div className="chat-memory-heading-icon"><Bookmark size={19} /></div>
              <div><span>YOUR CONTROL</span><h2 id="chat-memory-title">Saved memories</h2><p>Only notes you choose to save carry into future chats.</p></div>
              <button type="button" className="chat-memory-close" onClick={() => setMemoryOpen(false)} aria-label="Close memory manager"><X size={18} /></button>
            </header>

            <div className="chat-memory-privacy"><ShieldCheck size={16} /><p><strong>Nothing is saved automatically.</strong> These notes are sent to MindCare’s AI when you chat. Don’t save passwords, payment details, or anything you don’t want used for personalization.</p></div>

            {memoryError && <div className="chat-memory-alert" role="alert"><AlertCircle size={15} /><span>{memoryError}</span><button type="button" onClick={() => setMemoryReload(value => value + 1)} title="Retry loading saved memories"><RefreshCw size={13} /></button></div>}
            {memorySuccess && <p className="chat-memory-success" role="status"><Check size={14} />{memorySuccess}</p>}

            <form className="chat-memory-form" onSubmit={saveMemory}>
              <label htmlFor="chat-memory-note">Add a note <span>{memoryText.trim().length}/240</span></label>
              <textarea id="chat-memory-note" value={memoryText} onChange={event => setMemoryText(event.target.value.slice(0, 240))} maxLength={240} rows={3} placeholder="For example: I prefer short, practical suggestions." disabled={memoryLoading || memorySaving || memories.length >= 20} />
              <div className="chat-memory-form-footer"><small>{memories.length}/20 saved</small><button type="submit" className="chat-memory-primary" disabled={memoryLoading || memorySaving || memories.length >= 20 || memoryText.trim().length < 2}>{memorySaving ? <LoaderCircle size={14} className="spin-icon" /> : <Plus size={14} />}{memorySaving ? 'Saving…' : 'Save memory'}</button></div>
            </form>

            <div className="chat-memory-list-heading"><strong>Your notes</strong><span>{memories.length === 1 ? '1 memory' : `${memories.length} memories`}</span></div>
            {memoryLoading ? (
              <div className="chat-memory-loading" role="status"><LoaderCircle size={17} className="spin-icon" /> Loading your saved notes…</div>
            ) : memories.length ? (
              <div className="chat-memory-list">
                {memories.map(memory => <article className="chat-memory-item" key={memory.id}><p>{memory.content}</p><button type="button" onClick={() => removeMemory(memory)} disabled={Boolean(memoryDeletingId)} aria-label={`Remove memory: ${memory.content}`} title="Remove memory">{memoryDeletingId === memory.id ? <LoaderCircle size={15} className="spin-icon" /> : <Trash2 size={15} />}</button></article>)}
              </div>
            ) : !memoryError ? (
              <div className="chat-memory-empty"><span><Bookmark size={18} /></span><strong>No saved memories yet</strong><p>Add a small preference or detail that would help MindCare in another conversation.</p></div>
            ) : null}
            <footer className="chat-memory-footer"><span>You can remove a note at any time.</span><button type="button" className="chat-memory-secondary" onClick={() => setMemoryOpen(false)}>Done</button></footer>
          </section>
        </div>
      )}
    </section>
  )
}
