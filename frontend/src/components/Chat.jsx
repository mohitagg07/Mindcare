import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Send, Plus, Heart, UserRound, BookOpen, AlertCircle, Sparkles,
  ShieldCheck, ArrowUpRight, Wind, Moon, Brain, LoaderCircle, Square,
  Bookmark, X, RefreshCw, Check, Trash2, History as HistoryIcon, Copy, CheckCheck,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api, sendChatStream, getChatHistory, getChatMemories, createChatMemory, deleteChatMemory } from '../api/client.js'
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

function formatConversationDate(value, timeZone) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return 'Saved conversation'
  try {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', ...(timeZone ? { timeZone } : {}) })
  } catch {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }
}

function Message({ msg, timeZone, onRetry }) {
  const [copyState, setCopyState] = useState('')
  const isUser = msg.role === 'user'

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(msg.content)
      setCopyState('copied')
      window.setTimeout(() => setCopyState(''), 1800)
    } catch {
      setCopyState('failed')
      window.setTimeout(() => setCopyState(''), 2400)
    }
  }

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
        {isUser && msg.deliveryState === 'pending' && <span className="chat-delivery-status" role="status">Sending…</span>}
        {isUser && msg.deliveryState === 'unconfirmed' && <span className="chat-delivery-status is-error" role="status">Delivery not confirmed</span>}
        {msg.error && msg.retryText && (
          <div className="chat-retry-row"><span>The reply failed. You can retry this message.</span><button type="button" onClick={() => onRetry?.(msg)}><RefreshCw size={13} /> Try again</button></div>
        )}
        {!isUser && !msg.error && !msg.streaming && msg.content && <div className="chat-message-actions"><button type="button" onClick={copyMessage} aria-label={copyState === 'copied' ? 'Reply copied' : copyState === 'failed' ? 'Could not copy reply' : 'Copy reply'}>{copyState === 'copied' ? <CheckCheck size={14} /> : <Copy size={14} />}{copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy unavailable' : 'Copy'}</button></div>}
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
    sessionId, setSessionId, createNewSession, phq9Result,
    currentEmotion, setRiskData, setRecommendations, setTrajectory,
    messages, addMessage, updateMessage, replaceMessages, pendingChatPrompt, setPendingChatPrompt,
  } = useApp()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamStarted, setStreamStarted] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historyReload, setHistoryReload] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [conversationRows, setConversationRows] = useState([])
  const [conversationListLoading, setConversationListLoading] = useState(false)
  const [conversationListError, setConversationListError] = useState('')
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
  const activeRequestRef = useRef(null)
  const pendingDraftRef = useRef(null)
  const stickToBottomRef = useRef(true)
  const draftsBySessionRef = useRef({})
  const historyTriggerRef = useRef(null)

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

  useEffect(() => () => activeRequestRef.current?.controller.abort(), [])

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
    if (!historyOpen) return
    let alive = true
    setConversationListLoading(true)
    setConversationListError('')
    api.mySessions()
      .then(({ data }) => {
        if (!alive) return
        setConversationRows(Array.isArray(data) ? data.filter(item => item.session_id && Number(item.message_count) > 0) : [])
      })
      .catch(error => { if (alive) setConversationListError(error.message || 'Your saved conversations could not be loaded.') })
      .finally(() => { if (alive) setConversationListLoading(false) })
    return () => { alive = false }
  }, [historyOpen, historyReload])

  useEffect(() => {
    if (!historyOpen) return
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setHistoryOpen(false)
        historyTriggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [historyOpen])

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
    if (!area || !stickToBottomRef.current) return
    // Keep scrolling scoped to the chat viewport; scrollIntoView can scroll outer
    // containers too and caused the workspace header/sidebar to visually collide.
    const behavior = loading || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    area.scrollTo({ top: area.scrollHeight, behavior })
  }, [messages, loading])

  const handleSend = async (providedText, { appendUser = true, clientMessageId, userMessageId } = {}) => {
    const text = (providedText ?? input).trim()
    if (!text || loading) return
    const keepComposerFocused = document.activeElement === inputRef.current
    interacted.current = true
    setNotice('')
    setHistoryOpen(false)
    const requestId = clientMessageId || (pendingDraftRef.current?.text === text ? pendingDraftRef.current.id : uuidv4())
    pendingDraftRef.current = { text, id: requestId }
    if (appendUser) {
      setInput('')
      userMessageId = addMessage({ role: 'user', content: text, clientMessageId: requestId, deliveryState: 'pending' })
    } else if (userMessageId) updateMessage(userMessageId, { deliveryState: 'pending' })
    const assistantMessageId = addMessage({ role: 'assistant', content: '', streaming: true })
    const controller = new AbortController()
    activeRequestRef.current = { controller, text, requestId, userMessageId, assistantMessageId }
    setLoading(true)
    setStreamStarted(false)
    try {
      const { data } = await sendChatStream({
        session_id: sessionId,
        client_message_id: requestId,
        message: text,
        phq9_score: phq9Result?.score ?? null,
        phq9_category: phq9Result?.category ?? 'Not assessed',
        phq9_crisis_flag: !!phq9Result?.crisis_flag,
        emotion: currentEmotion?.confidence > 0 && currentEmotion?.emotion !== 'unavailable' ? currentEmotion.emotion : null,
      }, {
        signal: controller.signal,
        onDelta: delta => {
          setStreamStarted(true)
          updateMessage(assistantMessageId, message => ({ ...message, content: message.content + delta }))
        },
      })
      if (data.session_id && data.session_id !== sessionId) setSessionId(data.session_id)
      if (userMessageId) updateMessage(userMessageId, { deliveryState: 'saved' })
      updateMessage(assistantMessageId, { streaming: false, rag_used: data.rag_used, crisis_detected: data.crisis_detected })
      pendingDraftRef.current = null
      if (data.risk) setRiskData(data.risk)
      if (data.recommendations) setRecommendations(data.recommendations)
      if (data.trajectory) setTrajectory(data.trajectory)
    } catch (error) {
      if (controller.signal.aborted) {
        replaceMessages(previous => previous.filter(message => message.id !== userMessageId && message.id !== assistantMessageId))
        setInput(text)
        setNotice('Response stopped. Your draft is back in the composer; resend it to confirm the saved reply.')
      } else {
        if (userMessageId) updateMessage(userMessageId, { deliveryState: 'unconfirmed' })
        updateMessage(assistantMessageId, {
          content: `I couldn’t confirm that reply was saved. ${error.message || 'Check your connection, then try again.'}`,
          streaming: false, error: true, retryText: text, clientMessageId: requestId, userMessageId,
        })
      }
    } finally {
      if (activeRequestRef.current?.controller === controller) activeRequestRef.current = null
      setLoading(false)
      setStreamStarted(false)
      if (keepComposerFocused) setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const stopGeneration = () => activeRequestRef.current?.controller.abort()

  const handleNewConversation = () => {
    if (loading || historyLoading) return
    if (input.trim() && messages.length === 0) {
      setNotice('Send or clear your draft before starting a new conversation.')
      return
    }
    if (messages.some(message => message.deliveryState === 'unconfirmed' || message.error)) {
      setNotice('Retry the unconfirmed reply before starting another conversation so your draft stays available.')
      return
    }
    const hasMessages = messages.some(message => message.role === 'user')
    if (hasMessages && !window.confirm('Start a new conversation? Your current chat will stay in your history.')) return
    draftsBySessionRef.current[sessionId] = input
    createNewSession()
    interacted.current = false
    setInput('')
    setHistoryOpen(false)
    setNotice('A new conversation is ready.')
    setHistoryError('')
  }

  const retryMessage = (failedMessage) => {
    if (!failedMessage?.retryText || loading) return
    replaceMessages(messages.filter(message => message.id !== failedMessage.id))
    handleSend(failedMessage.retryText, {
      appendUser: false,
      clientMessageId: failedMessage.clientMessageId,
      userMessageId: failedMessage.userMessageId,
    })
  }

  const selectConversation = row => {
    if (loading || historyLoading || !row?.session_id) return
    if (input.trim() && messages.length === 0) {
      setNotice('Send or clear your draft before switching conversations.')
      return
    }
    if (messages.some(message => message.deliveryState === 'unconfirmed' || message.error)) {
      setNotice('Retry the unconfirmed reply before switching conversations so your draft stays available.')
      return
    }
    if (row.session_id === sessionId) {
      setHistoryOpen(false)
      return
    }
    draftsBySessionRef.current[sessionId] = input
    setInput(draftsBySessionRef.current[row.session_id] || '')
    setSessionId(row.session_id)
    pendingDraftRef.current = null
    setHistoryOpen(false)
    setNotice('Saved conversation opened.')
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
          <button ref={historyTriggerRef} type="button" className="chat-history-trigger" onClick={() => setHistoryOpen(value => !value)} aria-label="Saved conversations" aria-expanded={historyOpen} aria-controls={historyOpen ? 'chat-history-panel' : undefined}><HistoryIcon size={15} /><span>History</span></button>
          <button ref={memoryTriggerRef} type="button" className="chat-memory-trigger" onClick={() => { setMemoryOpen(true); setMemoryError(''); setMemorySuccess('') }} aria-label="Manage saved memories" title="Manage saved memories"><Bookmark size={15} /><span>Memory</span></button>
          <button type="button" className="chat-icon-button chat-new-button" onClick={handleNewConversation} disabled={loading || historyLoading} aria-label="Start a new conversation" title="New conversation"><Plus size={18} /></button>
        </div>
      </header>

      {historyOpen && <section id="chat-history-panel" className="chat-history-panel" aria-label="Saved conversations">
        <div className="chat-history-panel-heading"><div><strong>Saved conversations</strong><span>Your recent chats on this account</span></div><button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close conversation history"><X size={16} /></button></div>
        {conversationListLoading ? <div className="chat-history-panel-state" role="status"><LoaderCircle size={15} className="spin-icon" /> Loading your history…</div>
          : conversationListError ? <div className="chat-history-panel-state is-error" role="alert"><span>{conversationListError}</span><button type="button" onClick={() => setHistoryReload(value => value + 1)}>Retry</button></div>
            : conversationRows.length ? <div className="chat-history-list">{conversationRows.map(row => <button key={row.session_id} type="button" className={`chat-history-item${row.session_id === sessionId ? ' is-active' : ''}`} onClick={() => selectConversation(row)} disabled={loading || historyLoading} aria-current={row.session_id === sessionId ? 'page' : undefined}>
              <span className="chat-history-item-main"><strong>{String(row.title || 'Conversation').trim() || 'Conversation'}</strong><small>{formatConversationDate(row.started_at, user?.timezone)} · {Number(row.message_count || 0)} messages</small></span>
              {row.session_id === sessionId && <span className="chat-history-current">Current</span>}
            </button>)}</div>
              : <div className="chat-history-panel-state">No saved conversations yet. Messages appear here after MindCare confirms they’re saved.</div>}
      </section>}

      <div ref={scrollAreaRef} onScroll={event => {
        const area = event.currentTarget
        stickToBottomRef.current = area.scrollHeight - area.scrollTop - area.clientHeight < 140
      }} className={`chat-scroll-area${isNewChat ? ' is-new-chat' : ''}`}>
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
              {messages.filter(msg => !msg.streaming || msg.content).map(msg => <Message key={msg.id} msg={msg} timeZone={user?.timezone} onRetry={retryMessage} />)}
              {loading && !streamStarted && <TypingIndicator />}
              {loading && streamStarted && <span className="sr-only" role="status">MindCare is writing a response.</span>}
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
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); handleSend() }
            }}
            placeholder="Write what’s on your mind…"
            disabled={loading || historyLoading}
          />
          {loading ? <button type="button" onClick={stopGeneration} aria-label="Stop response" title="Stop response" className="chat-send-button chat-stop-button"><Square size={15} fill="currentColor" /></button> : <button type="submit" disabled={!input.trim() || historyLoading} aria-label="Send message" className="chat-send-button"><Send size={17} /></button>}
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
