import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Trash2, Heart, User, Zap, AlertCircle, BookOpen, RefreshCw, TrendingUp } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { sendChat, clearSession } from '../api/client.js'

function TypingIndicator() {
  return (
    <div style={{ display:'flex', gap:12, alignItems:'flex-end' }} className="animate-fade-in">
      <div style={{ width:34, height:34, borderRadius:11, background:'linear-gradient(135deg,#5B5BD6,#4747B8)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 3px 10px rgba(91,91,214,0.25)' }}>
        <Heart size={14} color="#fff" fill="#fff" />
      </div>
      <div style={{ padding:'12px 16px', borderRadius:'18px 18px 18px 4px', background:'#fff', border:'1px solid #E2E8F8', boxShadow:'0 2px 8px rgba(91,91,214,0.06)' }}>
        <div style={{ display:'flex', gap:5, alignItems:'center', height:16 }}>
          <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
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
        <p style={{ textAlign:'right', fontSize:10, color:'#C5CCE0', marginBottom:5 }}>{time}</p>
        <div style={{ padding:'12px 17px', borderRadius:'18px 18px 4px 18px', background:'linear-gradient(135deg,#5B5BD6,#4747B8)', color:'#fff', fontSize:14, lineHeight:1.6, boxShadow:'0 4px 16px rgba(91,91,214,0.25)' }}>
          {msg.content}
        </div>
      </div>
      <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, background:'rgba(91,91,214,0.1)', border:'1px solid rgba(91,91,214,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <User size={14} color="#5B5BD6" />
      </div>
    </div>
  )

  return (
    <div className="msg-enter" style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
      <div style={{ width:34, height:34, borderRadius:11, flexShrink:0, background:'linear-gradient(135deg,#5B5BD6,#4747B8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 10px rgba(91,91,214,0.25)' }}>
        <Heart size={14} color="#fff" fill="#fff" />
      </div>
      <div style={{ maxWidth:'76%' }}>
        <p style={{ fontSize:10, color:'#C5CCE0', marginBottom:5 }}>MindCare · {time}</p>
        <div style={{ padding:'13px 17px', borderRadius:'18px 18px 18px 4px', background:'#fff', border:'1px solid #E2E8F8', color:'#1A1A3E', fontSize:14, lineHeight:1.65, boxShadow:'0 2px 8px rgba(91,91,214,0.06)' }}>
          <ReactMarkdown components={{
            p:      ({ children }) => <p style={{ marginBottom:8 }}>{children}</p>,
            strong: ({ children }) => <strong style={{ color:'#1A1A3E', fontWeight:600 }}>{children}</strong>,
            ul:     ({ children }) => <ul style={{ paddingLeft:18, marginTop:6, marginBottom:6, display:'flex', flexDirection:'column', gap:4 }}>{children}</ul>,
            li:     ({ children }) => <li>{children}</li>,
          }}>
            {msg.content}
          </ReactMarkdown>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:6, paddingLeft:2, flexWrap:'wrap' }}>
          {msg.rag_used && (
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <BookOpen size={9} color="#10B981" />
              <span style={{ fontSize:10, color:'#10B981' }}>Knowledge base used</span>
            </div>
          )}
          {msg.crisis_detected && (
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <AlertCircle size={9} color="#EF4444" />
              <span style={{ fontSize:10, color:'#EF4444', fontWeight:600 }}>Crisis resources included</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const QUICK = [
  "I've been feeling anxious lately",
  "I'm having trouble sleeping",
  "I feel overwhelmed with everything",
  "What coping strategies can help me?",
]

export default function Chat() {
  const { sessionId, phq9Result, gad7Result, currentEmotion,
          setRiskData, setRecommendations, messages, addMessage, clearMessages } = useApp()
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  const handleSend = async () => {
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
      addMessage({ role:'assistant', content:data.response, rag_used:data.rag_used, crisis_detected:data.crisis_detected })
      if (data.risk)            setRiskData(data.risk)
      if (data.recommendations) setRecommendations(data.recommendations)
    } catch (err) {
      addMessage({ role:'assistant', content:`Connection issue — is the backend running? (${err.message})` })
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleClear = async () => {
    try { await clearSession(sessionId) } catch {}
    clearMessages()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#F7F9FF' }}>
      {/* Header */}
      <div style={{ padding:'14px 20px', flexShrink:0, borderBottom:'1px solid #E2E8F8', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 6px rgba(91,91,214,0.06)' }}>
        <div>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#1A1A3E', margin:0, fontFamily:'Poppins,system-ui' }}>Chat with MindCare</h2>
          <p style={{ fontSize:12, color:'#8892B0', marginTop:2 }}>Compassionate · Confidential · 24/7</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {phq9Result && (
            <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99, background:'rgba(91,91,214,0.1)', color:'#5B5BD6', border:'1px solid rgba(91,91,214,0.2)' }}>PHQ-9: {phq9Result.score}</span>
          )}
          {currentEmotion?.confidence > 0 && (
            <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99, background:'rgba(16,185,129,0.1)', color:'#10B981', border:'1px solid rgba(16,185,129,0.2)', textTransform:'capitalize' }}>{currentEmotion.emotion}</span>
          )}
          <button onClick={handleClear} style={{ width:32, height:32, borderRadius:9, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#C5CCE0', transition:'all 0.18s' }}
            onMouseEnter={e=>{ e.currentTarget.style.color='#EF4444'; e.currentTarget.style.background='rgba(239,68,68,0.08)' }}
            onMouseLeave={e=>{ e.currentTarget.style.color='#C5CCE0'; e.currentTarget.style.background='transparent' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:16 }}>
        {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && (
        <div style={{ padding:'0 20px 12px', display:'flex', flexWrap:'wrap', gap:8 }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => { setInput(q); inputRef.current?.focus() }}
              style={{ fontSize:12, padding:'7px 14px', borderRadius:99, cursor:'pointer', background:'rgba(91,91,214,0.07)', border:'1px solid rgba(91,91,214,0.18)', color:'#5B5BD6', fontFamily:'inherit', transition:'all 0.18s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(91,91,214,0.12)'; e.currentTarget.style.borderColor='rgba(91,91,214,0.35)' }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(91,91,214,0.07)'; e.currentTarget.style.borderColor='rgba(91,91,214,0.18)' }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'14px 20px', flexShrink:0, borderTop:'1px solid #E2E8F8', background:'#fff', boxShadow:'0 -1px 6px rgba(91,91,214,0.05)' }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
          <textarea ref={inputRef} value={input} rows={1}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
            placeholder="Share how you're feeling… (Enter to send)"
            className="input-field"
            style={{ resize:'none', minHeight:46, maxHeight:120, lineHeight:1.55, paddingTop:13 }}
          />
          <button onClick={handleSend} disabled={!input.trim()||loading}
            style={{ width:46, height:46, borderRadius:13, border:'none', flexShrink:0, background:input.trim()&&!loading?'linear-gradient(135deg,#5B5BD6,#4747B8)':'rgba(91,91,214,0.15)', cursor:input.trim()&&!loading?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:input.trim()&&!loading?'0 4px 14px rgba(91,91,214,0.3)':'none', transition:'all 0.2s' }}>
            {loading ? <RefreshCw size={16} color="rgba(91,91,214,0.7)" style={{ animation:'spin 1s linear infinite' }} /> : <Send size={16} color={input.trim()?'#fff':'rgba(91,91,214,0.4)'} />}
          </button>
        </div>
        <p style={{ fontSize:10, color:'#C5CCE0', marginTop:8, textAlign:'center' }}>
          Not a substitute for professional care · Crisis: iCall 9152987821
          {phq9Result && ` · PHQ-9: ${phq9Result.score}`}
          {gad7Result && ` · GAD-7: ${gad7Result.score}`}
        </p>
      </div>
    </div>
  )
}
