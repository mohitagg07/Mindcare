import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { v4 as uuidv4 } from 'uuid'
import {
  Send, Plus, Trash2, Heart, UserRound, BookOpen, AlertCircle, Sparkles,
  ShieldCheck, ArrowUpRight, MessageCircle, Wind, Moon, Brain, LoaderCircle, RefreshCw,
  ClipboardCheck, ArrowRight, Compass, Footprints,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  sendChat, clearSession, getChatHistory,
  generateReflectionDraft, getConversationReflection,
  saveConversationReflection, deleteConversationReflection,
} from '../api/client.js'
import {
  canDeleteConversation,
  deleteConversationAndStartFresh,
  startNewConversation,
} from '../chat/conversationLifecycle.js'

const QUICK_STARTS = [
  { icon: Wind, title: 'I feel anxious', text: "I've been feeling anxious lately", tint: 'sage' },
  { icon: Moon, title: 'Sleep has been hard', text: "I've been having trouble sleeping", tint: 'blue' },
  { icon: Brain, title: 'Too much on my mind', text: 'I feel overwhelmed with everything', tint: 'plum' },
]

const CONVERSATION_MODES = [
  { id: 'listen', label: 'Just listen', Icon: Heart },
  { id: 'explore', label: 'Explore', Icon: Compass },
  { id: 'next_step', label: 'Next step', Icon: Footprints },
  { id: 'reflect', label: 'Reflect', Icon: BookOpen },
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
        {!isUser && (msg.rag_used || msg.metadata?.rag_used || msg.safety_follow_up_required || msg.metadata?.safety_follow_up_required || msg.crisis_detected || msg.metadata?.crisis_detected) && (
          <div className="chat-message-badges">
            {(msg.rag_used || msg.metadata?.rag_used) && <span><BookOpen size={12} /> Knowledge resources used</span>}
            {(msg.safety_follow_up_required || msg.metadata?.safety_follow_up_required || msg.crisis_detected || msg.metadata?.crisis_detected) && <span className="safety-badge"><AlertCircle size={12} /> Safety check-in included</span>}
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
    sessionId, setSessionId, createNewSession,
    currentEmotion, setRiskData, setRecommendations, setTrajectory,
    messages, addMessage, replaceMessages, pendingChatPrompt, setPendingChatPrompt,
    pendingAssessmentFollowUpId, setPendingAssessmentFollowUpId, setActivePage,
    conversationMode, setConversationMode,
  } = useApp()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [failedTurn, setFailedTurn] = useState(null)
  const [reflection, setReflection] = useState(null)
  const [reflectionOpen, setReflectionOpen] = useState(false)
  const [reflectionLoaded, setReflectionLoaded] = useState(false)
  const [reflectionSaved, setReflectionSaved] = useState(false)
  const [reflectionDirty, setReflectionDirty] = useState(false)
  const [reflectionLoading, setReflectionLoading] = useState(false)
  const [reflectionSaving, setReflectionSaving] = useState(false)
  const [reflectionError, setReflectionError] = useState('')
  const reflectionRequestIdRef = useRef(0)
  const scrollAreaRef = useRef(null)
  const inputRef = useRef(null)
  const interacted = useRef(false)
  const isNewChat = messages.length <= 1 && (messages.length === 0 || messages[0]?.role === 'assistant') && !failedTurn
  const canDeleteActiveConversation = canDeleteConversation(messages, failedTurn)

  useEffect(() => {
    reflectionRequestIdRef.current += 1
    setReflection(null)
    setReflectionOpen(false)
    setReflectionLoaded(false)
    setReflectionSaved(false)
    setReflectionDirty(false)
    setReflectionLoading(false)
    setReflectionSaving(false)
    setReflectionError('')
  }, [sessionId])

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
  }, [messages, loading, reflectionOpen])

  const handleSend = async (providedText, retryTurn = null) => {
    const text = (providedText ?? input).trim()
    if (!text || loading || historyLoading) return
    const clientTurnId = retryTurn?.clientTurnId || uuidv4()
    const assessmentFollowUpId = retryTurn?.assessmentFollowUpId || pendingAssessmentFollowUpId || null
    const selectedConversationMode = retryTurn?.conversationMode || conversationMode || 'listen'
    if (!retryTurn && pendingAssessmentFollowUpId) setPendingAssessmentFollowUpId(null)
    interacted.current = true
    setNotice('')
    setFailedTurn(null)
    if (!retryTurn) {
      setInput('')
      addMessage({ role: 'user', content: text })
    }
    setLoading(true)
    try {
      const { data } = await sendChat({
        session_id: sessionId,
        client_turn_id: clientTurnId,
        message: text,
        conversation_mode: selectedConversationMode,
        ...(assessmentFollowUpId ? { assessment_follow_up_id: assessmentFollowUpId } : {}),
        // The backend reads canonical saved assessment data for pending safety follow-up.
        // Avoid sending questionnaire scores again from client-side state.
        emotion: currentEmotion?.confidence > 0 && currentEmotion?.emotion !== 'unavailable' ? currentEmotion.emotion : null,
      })
      if (data.session_id && data.session_id !== sessionId) setSessionId(data.session_id)
      addMessage({
        role: 'assistant', content: data.response, rag_used: data.rag_used,
        safety_follow_up_required: data.safety_follow_up_required,
      })
      if (data.risk) setRiskData(data.risk)
      if (data.recommendations) setRecommendations(data.recommendations)
      if (data.trajectory) setTrajectory(data.trajectory)
      const feedback = [
        ...(Array.isArray(data.context_warnings) ? data.context_warnings : []),
        data.persistence_warning,
      ].filter(Boolean)
      setNotice(feedback.join(' '))
    } catch (error) {
      // Keep the failed user bubble visible. Retry reuses this same UUID, so a server
      // that already saved the answer can return it instead of storing a duplicate turn.
      setFailedTurn({ clientTurnId, text, assessmentFollowUpId, conversationMode: selectedConversationMode })
      setNotice(`MindCare couldn't confirm a response. ${error.message || 'Check your connection, then retry the same message.'}`)
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const resetTransientConversationState = () => {
    interacted.current = false
    setInput('')
    setFailedTurn(null)
    setNotice('')
  }

  const handleNewConversation = () => {
    // A new session is a local lifecycle change, not a request to delete saved history.
    // Keep retryable failed turns on screen until the user retries or resolves them.
    if (loading || historyLoading || failedTurn) return
    startNewConversation({
      createNewSession,
      resetTransientState: resetTransientConversationState,
    })
  }

  const handleDeleteConversation = async () => {
    if (loading || historyLoading || !canDeleteActiveConversation) return
    const confirmed = window.confirm('Delete this conversation and all its saved messages? This cannot be undone.')
    if (!confirmed) return

    try {
      await deleteConversationAndStartFresh({
        sessionId,
        deleteSession: clearSession,
        createNewSession,
        resetTransientState: resetTransientConversationState,
      })
    } catch (error) {
      setNotice(error?.status === 404
        ? 'This conversation was not found in saved history. Nothing was deleted, and your current view has been kept.'
        : `MindCare couldn't delete this conversation. ${error?.message || 'Please try again.'}`)
    }
  }

  const handleToggleReflection = async () => {
    if (reflectionOpen) {
      setReflectionOpen(false)
      return
    }
    if (reflectionLoaded && reflection) {
      setReflectionOpen(true)
      setReflectionError('')
      return
    }
    if (loading || historyLoading || failedTurn) return

    const requestId = ++reflectionRequestIdRef.current
    setReflectionLoading(true)
    setReflectionError('')
    try {
      const savedResult = await getConversationReflection(sessionId)
      if (requestId !== reflectionRequestIdRef.current) return
      setReflectionLoaded(true)
      if (savedResult.data?.reflection) {
        setReflection({
          what_i_shared: savedResult.data.reflection.what_i_shared || '',
          what_i_noticed: savedResult.data.reflection.what_i_noticed || '',
          possible_next_step: savedResult.data.reflection.possible_next_step || '',
        })
        setReflectionSaved(true)
        setReflectionDirty(false)
        setReflectionOpen(true)
        return
      }

      const draftResult = await generateReflectionDraft(sessionId)
      if (requestId !== reflectionRequestIdRef.current) return
      setReflection({
        what_i_shared: draftResult.data?.draft?.what_i_shared || '',
        what_i_noticed: draftResult.data?.draft?.what_i_noticed || '',
        possible_next_step: draftResult.data?.draft?.possible_next_step || '',
      })
      setReflectionSaved(false)
      setReflectionDirty(false)
      setReflectionLoaded(true)
      setReflectionOpen(true)
    } catch (error) {
      if (requestId !== reflectionRequestIdRef.current) return
      setReflectionError(error?.message || 'We could not prepare your reflection. Please try again.')
      setReflectionOpen(true)
    } finally {
      if (requestId === reflectionRequestIdRef.current) setReflectionLoading(false)
    }
  }

  const updateReflectionField = (field, value) => {
    setReflection(previous => ({ ...(previous || {}), [field]: value }))
    setReflectionDirty(true)
    setReflectionError('')
  }

  const handleSaveReflection = async () => {
    if (!reflection || reflectionSaving) return
    const hasContent = ['what_i_shared', 'what_i_noticed', 'possible_next_step']
      .some(field => String(reflection[field] || '').trim())
    if (!hasContent) {
      setReflectionError('Add something to at least one field before saving.')
      return
    }

    const requestId = ++reflectionRequestIdRef.current
    setReflectionSaving(true)
    setReflectionError('')
    try {
      const { data } = await saveConversationReflection(sessionId, reflection)
      if (requestId !== reflectionRequestIdRef.current) return
      const saved = data.reflection
      setReflection({
        what_i_shared: saved.what_i_shared || '',
        what_i_noticed: saved.what_i_noticed || '',
        possible_next_step: saved.possible_next_step || '',
      })
      setReflectionSaved(true)
      setReflectionDirty(false)
      setReflectionLoaded(true)
    } catch (error) {
      if (requestId !== reflectionRequestIdRef.current) return
      setReflectionError(error?.message || 'Your reflection could not be saved. Please try again.')
    } finally {
      if (requestId === reflectionRequestIdRef.current) setReflectionSaving(false)
    }
  }

  const handleDeleteReflection = async () => {
    if (!reflectionSaved || reflectionSaving) return
    if (!window.confirm('Delete the saved reflection for this conversation? This cannot be undone.')) return

    const requestId = ++reflectionRequestIdRef.current
    setReflectionSaving(true)
    setReflectionError('')
    try {
      await deleteConversationReflection(sessionId)
      if (requestId !== reflectionRequestIdRef.current) return
      setReflection(null)
      setReflectionSaved(false)
      setReflectionDirty(false)
      setReflectionLoaded(false)
      setReflectionOpen(false)
    } catch (error) {
      if (requestId !== reflectionRequestIdRef.current) return
      setReflectionError(error?.message || 'Your reflection could not be deleted. Please try again.')
    } finally {
      if (requestId === reflectionRequestIdRef.current) setReflectionSaving(false)
    }
  }

  const handleDismissReflection = () => {
    setReflectionOpen(false)
    setReflectionError('')
    if (!reflectionSaved) {
      setReflection(null)
      setReflectionLoaded(false)
      setReflectionDirty(false)
    }
  }

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
          <button type="button" className="chat-icon-button chat-new-button" onClick={handleNewConversation} disabled={loading || historyLoading || Boolean(failedTurn)} aria-label="Start a new conversation" title="New conversation"><Plus size={17} /></button>
          <button type="button" className="chat-icon-button chat-delete-button" onClick={handleDeleteConversation} disabled={loading || historyLoading || !canDeleteActiveConversation} aria-label="Delete current conversation" title="Delete current conversation"><Trash2 size={17} /></button>
        </div>
      </header>

      <div className="chat-mode-bar">
        <span className="chat-mode-label">How would you like me to respond?</span>
        <div className="chat-mode-options" role="group" aria-label="Choose a conversation approach">
          {CONVERSATION_MODES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`chat-mode-option${conversationMode === id ? ' is-selected' : ''}`}
              onClick={() => setConversationMode(id)}
              aria-pressed={conversationMode === id}
              disabled={loading || historyLoading || Boolean(failedTurn)}
            >
              <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollAreaRef} className={`chat-scroll-area${isNewChat ? ' is-new-chat' : ''}`}>
        <div className="chat-content-column">
          {isNewChat ? (
            <div className="chat-welcome animate-fade-up">
              <div className="chat-welcome-orb"><Heart size={28} strokeWidth={1.6} /></div>
              <p className="chat-welcome-kicker"><Sparkles size={13} /> START HERE</p>
              <h2>{String(user?.display_name || '').trim() ? <>Hi, {String(user.display_name).trim().split(/\s+/)[0]}.<br /></> : <>Start anywhere.<br /></>}<em>One thing at a time.</em></h2>
              <p className="chat-welcome-copy">{String(user?.display_name || '').trim() ? 'Your saved preferences come with you. Start with whatever is on your mind today.' : 'You can start with a thought, a feeling, or a question.'}</p>
              <div className="chat-prompt-grid">
                {QUICK_STARTS.map(({ icon: Icon, title, text, tint }) => (
                  <button key={title} type="button" className={`chat-prompt-card tint-${tint}`} onClick={() => handleSend(text)} disabled={loading || historyLoading || Boolean(failedTurn)}>
                    <span className="chat-prompt-icon"><Icon size={17} /></span>
                    <span className="chat-prompt-title">{title}</span>
                    <ArrowUpRight size={15} className="chat-prompt-arrow" />
                  </button>
                ))}
              </div>
              <section className="chat-checkin-invite" aria-label="Optional guided check-in">
                <span className="chat-checkin-invite-icon"><ClipboardCheck size={18} /></span>
                <div className="chat-checkin-invite-copy"><strong>Would a little structure help?</strong><p>Try an optional guided check-in, then come back here to reflect on the result.</p></div>
                <button type="button" onClick={() => setActivePage('assessment')} disabled={loading || historyLoading || Boolean(failedTurn)}>Explore check-ins <ArrowRight size={14} /></button>
              </section>
              <div className="chat-welcome-note"><ShieldCheck size={15} /><span>Your chat is associated with your account. Avoid sharing passwords or information you don't need to share.</span></div>
            </div>
          ) : (
            <div className="chat-message-list">
              {messages.map(msg => <Message key={msg.id} msg={msg} timeZone={user?.timezone} />)}
              {loading && <TypingIndicator />}
              {(messages.some(message => message.role === 'user') && messages.some(message => message.role === 'assistant')) && (
                <div className="chat-reflection-launch">
                  <div>
                    <strong>Ready to wrap up?</strong>
                    <p>Make a small reflection you can edit and keep for this conversation.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleReflection}
                    disabled={loading || historyLoading || Boolean(failedTurn) || reflectionLoading || reflectionSaving}
                  >
                    {reflectionLoading ? <><LoaderCircle size={14} className="spin-icon" /> Preparing…</> : (
                      <>{reflectionOpen ? 'Hide reflection' : reflectionSaved ? 'View reflection' : reflection ? 'Continue reflection' : 'Wrap up & reflect'} <ArrowRight size={14} /></>
                    )}
                  </button>
                </div>
              )}

              {reflectionOpen && (
                <section className="chat-reflection-card" aria-labelledby="chat-reflection-title">
                  <header className="chat-reflection-heading">
                    <div>
                      <p className="chat-reflection-eyebrow">A MOMENT TO REFLECT</p>
                      <h2 id="chat-reflection-title">Keep what feels useful.</h2>
                      <p>This is a draft based on this conversation. Change anything that doesn’t feel right.</p>
                    </div>
                    <span className="chat-reflection-mark" aria-hidden="true"><BookOpen size={18} /></span>
                  </header>

                  {reflectionError && <p className="chat-reflection-error" role="alert">{reflectionError}</p>}
                  {reflectionLoading && <p className="chat-reflection-loading" role="status">Preparing a short reflection from your conversation…</p>}

                  {reflection && (
                    <>
                      <div className="chat-reflection-fields">
                        <label>
                          <span>What I shared</span>
                          <textarea value={reflection.what_i_shared || ''} maxLength={600} rows={2}
                            onChange={event => updateReflectionField('what_i_shared', event.target.value)}
                            disabled={reflectionSaving} />
                        </label>
                        <label>
                          <span>What I noticed</span>
                          <textarea value={reflection.what_i_noticed || ''} maxLength={600} rows={2}
                            onChange={event => updateReflectionField('what_i_noticed', event.target.value)}
                            disabled={reflectionSaving} />
                        </label>
                        <label>
                          <span>One possible next step <small>Optional</small></span>
                          <textarea value={reflection.possible_next_step || ''} maxLength={400} rows={2}
                            onChange={event => updateReflectionField('possible_next_step', event.target.value)}
                            disabled={reflectionSaving} />
                        </label>
                      </div>
                      <p className="chat-reflection-privacy" aria-live="polite">
                        {reflectionSaved && !reflectionDirty
                          ? 'Saved to this conversation. You can edit or delete it.'
                          : 'Nothing is saved until you choose Save reflection.'}
                      </p>
                      <div className="chat-reflection-actions">
                        {reflectionSaved && (
                          <button type="button" className="chat-reflection-delete" onClick={handleDeleteReflection} disabled={reflectionSaving}>
                            Delete saved reflection
                          </button>
                        )}
                        <button type="button" className="chat-reflection-dismiss" onClick={handleDismissReflection} disabled={reflectionSaving}>
                          {reflectionSaved ? 'Close' : 'Dismiss draft'}
                        </button>
                        <button type="button" className="chat-reflection-save" onClick={handleSaveReflection}
                          disabled={reflectionSaving || !['what_i_shared', 'what_i_noticed', 'possible_next_step'].some(field => String(reflection[field] || '').trim()) || (reflectionSaved && !reflectionDirty)}>
                          {reflectionSaving ? <><LoaderCircle size={14} className="spin-icon" /> Saving…</> : <>{reflectionSaved ? 'Save changes' : 'Save reflection'}</>}
                        </button>
                      </div>
                    </>
                  )}
                  {!reflection && !reflectionLoading && (
                    <div className="chat-reflection-empty">
                      <p>No draft is open. Close this panel and try again.</p>
                      <button type="button" onClick={handleDismissReflection}>Close <ArrowRight size={14} /></button>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      {notice && (
        <div className={`chat-notice${failedTurn ? " is-retryable" : ""}`} role={failedTurn ? "alert" : "status"}>
          <span>{notice}</span>
          {failedTurn && <button type="button" className="chat-retry-button" onClick={() => handleSend(failedTurn.text, failedTurn)} disabled={loading}><RefreshCw size={14} /> Retry same message</button>}
        </div>
      )}

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
            disabled={loading || historyLoading || Boolean(failedTurn)}
          />
          <button type="submit" disabled={!input.trim() || loading || historyLoading || Boolean(failedTurn)} aria-label="Send message" className="chat-send-button">
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
