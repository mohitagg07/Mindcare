import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Trash2, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useApp }  from '../context/AppContext'
import { sendChat, clearSession } from '../api/client'

/* ── Helpers ──────────────────────────────────────────── */
function MindCareAvatar({ size = 32 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*0.3), flexShrink:0,
      background:'linear-gradient(135deg,#9B6DFF,#7C52D9)',
      display:'flex', alignItems:'center', justifyContent:'center',
      boxShadow:'0 2px 10px rgba(155,109,255,0.35)' }}>
      <svg width={Math.round(size*0.45)} height={Math.round(size*0.45)} viewBox="0 0 24 24" fill="none">
        <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="white"/>
      </svg>
    </div>
  )
}

function TrajBadge({ trigger }) {
  if (!trigger || trigger === 'stable') return null
  const cfg = {
    high_risk:         { Icon:TrendingDown, color:'#FF6B6B', label:'High Risk Trend' },
    positive_progress: { Icon:TrendingUp,   color:'#56CFB2', label:'Improving' },
  }
  const c = cfg[trigger]; if (!c) return null
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px',
      borderRadius:99, fontSize:10, fontWeight:700, color:c.color,
      background:c.color+'15', border:`1px solid ${c.color}30` }}>
      <c.Icon size={9}/>{c.label}
    </span>
  )
}

function TypingIndicator() {
  return (
    <div className="msg-enter" style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
      <MindCareAvatar size={32}/>
      <div style={{ padding:'12px 16px', borderRadius:'18px 18px 18px 4px',
        background:'#252238', border:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', gap:5, height:16, alignItems:'center' }}>
          <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
        </div>
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  const time   = new Date(msg.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })

  if (isUser) return (
    <div className="msg-enter" style={{ display:'flex', gap:10, alignItems:'flex-end', justifyContent:'flex-end' }}>
      <div style={{ maxWidth:'72%' }}>
        <p style={{ textAlign:'right', fontSize:10, color:'#4A4870', marginBottom:5 }}>{time}</p>
        <div style={{ padding:'13px 17px', borderRadius:'18px 18px 4px 18px',
          background:'linear-gradient(135deg,#9B6DFF,#7C52D9)',
          color:'#fff', fontSize:14, lineHeight:1.6,
          boxShadow:'0 4px 20px rgba(155,109,255,0.3)' }}>
          {msg.content}
        </div>
      </div>
      <div style={{ width:30, height:30, borderRadius:9, flexShrink:0,
        background:'rgba(155,109,255,0.18)', border:'1px solid rgba(155,109,255,0.3)',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" fill="#C4A3FF"/>
        </svg>
      </div>
    </div>
  )

  return (
    <div className="msg-enter" style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
      <MindCareAvatar size={32}/>
      <div style={{ maxWidth:'76%' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
          <p style={{ fontSize:10, color:'#4A4870' }}>MindCare · {time}</p>
          {msg.trajectory_trigger && <TrajBadge trigger={msg.trajectory_trigger}/>}
          {msg.rag_used && (
            <span style={{ fontSize:9, color:'#56CFB2', fontWeight:700,
              background:'rgba(86,207,178,0.1)', border:'1px solid rgba(86,207,178,0.2)',
              padding:'1px 6px', borderRadius:99 }}>RAG</span>
          )}
        </div>
        <div style={{ padding:'13px 17px', borderRadius:'18px 18px 18px 4px',
          background:'#252238', border:'1px solid rgba(255,255,255,0.07)',
          color:'#D4CEE8', fontSize:14, lineHeight:1.65 }}>
          <ReactMarkdown components={{
            p:      ({ children }) => <p style={{ marginBottom:8 }}>{children}</p>,
            strong: ({ children }) => <strong style={{ color:'#F5F0FF', fontWeight:600 }}>{children}</strong>,
            ul:     ({ children }) => <ul style={{ paddingLeft:18, margin:'6px 0', display:'flex', flexDirection:'column', gap:3 }}>{children}</ul>,
            li:     ({ children }) => <li>{children}</li>,
          }}>{msg.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────────── */
const QUICK_PROMPTS = [
  "I've been feeling very anxious lately",
  "I'm struggling to sleep",
  "I feel overwhelmed and can't focus",
  "Can you suggest coping strategies?",
]

export default function Chat() {
  const { sessionId, phq9Result, gad7Result, currentEmotion,
          setRiskData, setRecommendations, setTrajectory,
          messages, addMessage, clearMessages } = useApp()

  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, loading])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    addMessage({ role:'user', content:text })
    setLoading(true)
    try {
      const { data } = await sendChat({
        session_id:    sessionId,
        message:       text,
        phq9_score:    phq9Result?.score    ?? 0,
        phq9_category: phq9Result?.category ?? 'Not assessed',
        gad7_score:    gad7Result?.score    ?? 0,
        gad7_category: gad7Result?.category ?? 'Not assessed',
        emotion:       currentEmotion?.emotion ?? 'neutral',
      })
      addMessage({
        role:                'assistant',
        content:             data.response,
        rag_used:            data.rag_used,
        trajectory_trigger:  data.trajectory?.trigger,
      })
      if (data.risk)            setRiskData(data.risk)
      if (data.recommendations) setRecommendations(data.recommendations)
      if (data.trajectory)      setTrajectory(data.trajectory)
    } catch (err) {
      addMessage({ role:'assistant', content:`Connection error: ${err.message}. Is the backend running?` })
    } finally {
      setLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [input, loading, sessionId, phq9Result, gad7Result, currentEmotion])

  const handleClear = async () => {
    try { await clearSession(sessionId) } catch {}
    clearMessages()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#13111C' }}>
      {/* Header */}
      <div style={{ padding:'14px 24px', flexShrink:0,
        borderBottom:'1px solid rgba(255,255,255,0.05)',
        background:'rgba(29,26,44,0.85)', backdropFilter:'blur(12px)',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:15, fontWeight:700, color:'#F5F0FF', margin:0 }}>Talk to MindCare</h2>
          <p style={{ fontSize:11, color:'#4A4870', marginTop:2 }}>
            Adaptive · Trajectory-aware · Confidential
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {phq9Result && (
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99,
              background:'rgba(155,109,255,0.12)', color:'#C4A3FF',
              border:'1px solid rgba(155,109,255,0.25)' }}>
              PHQ-9: {phq9Result.score} · {phq9Result.category}
            </span>
          )}
          {gad7Result && (
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99,
              background:'rgba(86,207,178,0.1)', color:'#56CFB2',
              border:'1px solid rgba(86,207,178,0.2)' }}>
              GAD-7: {gad7Result.score}
            </span>
          )}
          <button onClick={handleClear} title="Clear session"
            style={{ width:30, height:30, borderRadius:9, border:'none', background:'transparent',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              color:'#4A4870', transition:'all 0.18s' }}
            onMouseEnter={e=>{ e.currentTarget.style.color='#FF6B6B'; e.currentTarget.style.background='rgba(255,107,107,0.08)' }}
            onMouseLeave={e=>{ e.currentTarget.style.color='#4A4870'; e.currentTarget.style.background='transparent' }}>
            <Trash2 size={14}/>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px',
        display:'flex', flexDirection:'column', gap:14 }}>
        {messages.map(msg => <Message key={msg.id} msg={msg}/>)}
        {loading && <TypingIndicator/>}
        <div ref={bottomRef}/>
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && !loading && (
        <div style={{ padding:'0 24px 10px', display:'flex', flexWrap:'wrap', gap:7 }}>
          {QUICK_PROMPTS.map(q => (
            <button key={q} onClick={() => { setInput(q); textareaRef.current?.focus() }}
              style={{ fontSize:11, padding:'6px 13px', borderRadius:99, cursor:'pointer',
                background:'rgba(155,109,255,0.07)', border:'1px solid rgba(155,109,255,0.2)',
                color:'#8B8AAA', fontFamily:'inherit', transition:'all 0.18s' }}
              onMouseEnter={e=>{ e.currentTarget.style.color='#C4A3FF'; e.currentTarget.style.borderColor='rgba(155,109,255,0.4)' }}
              onMouseLeave={e=>{ e.currentTarget.style.color='#8B8AAA'; e.currentTarget.style.borderColor='rgba(155,109,255,0.2)' }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'14px 24px', flexShrink:0,
        borderTop:'1px solid rgba(255,255,255,0.05)',
        background:'rgba(29,26,44,0.85)', backdropFilter:'blur(12px)' }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
          <textarea ref={textareaRef} value={input} rows={1}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
            placeholder="Share how you're feeling… (Enter to send)"
            className="input-field"
            style={{ resize:'none', minHeight:46, maxHeight:120, lineHeight:1.55, paddingTop:14 }}
          />
          <button onClick={handleSend} disabled={!input.trim()||loading}
            style={{ width:46, height:46, borderRadius:13, border:'none', flexShrink:0, cursor:'pointer',
              background: input.trim()&&!loading ? 'linear-gradient(135deg,#9B6DFF,#7C52D9)' : 'rgba(155,109,255,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: input.trim()&&!loading ? '0 4px 16px rgba(155,109,255,0.35)' : 'none',
              transition:'all 0.2s' }}>
            {loading
              ? <RefreshCw size={15} color="rgba(155,109,255,0.7)" style={{ animation:'spin 1s linear infinite' }}/>
              : <Send size={15} color={input.trim()?'#fff':'rgba(155,109,255,0.4)'}/>}
          </button>
        </div>
        <p style={{ fontSize:10, color:'#2E2B40', marginTop:7, textAlign:'center' }}>
          Not a substitute for professional care · Crisis: iCall 9152987821
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}