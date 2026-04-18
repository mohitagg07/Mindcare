import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Trash2, Heart, User, RefreshCw, BookOpen, AlertCircle, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { sendChat, clearSession } from '../api/client.js'

function TypingIndicator() {
  return (
    <div style={{ display:'flex', gap:10, alignItems:'flex-end' }} className="animate-fade-in">
      <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#2A7D6F,#38A594)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 8px rgba(42,125,111,0.22)' }}>
        <Heart size={13} color="#fff" fill="#fff"/>
      </div>
      <div style={{ padding:'11px 14px', borderRadius:'16px 16px 16px 4px', background:'#fff', border:'1px solid var(--border)', boxShadow:'0 1px 4px rgba(26,35,50,0.06)' }}>
        <div style={{ display:'flex', gap:4, alignItems:'center', height:14 }}>
          <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
        </div>
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })

  if (isUser) return (
    <div className="msg-enter" style={{ display:'flex', gap:8, alignItems:'flex-end', justifyContent:'flex-end' }}>
      <div style={{ maxWidth:'72%' }}>
        <p style={{ textAlign:'right', fontSize:10, color:'var(--text-4)', marginBottom:5 }}>{time}</p>
        <div style={{ padding:'11px 16px', borderRadius:'16px 16px 4px 16px', background:'var(--teal)', color:'#fff', fontSize:14, lineHeight:1.6, boxShadow:'0 2px 12px rgba(42,125,111,0.22)' }}>
          {msg.content}
        </div>
      </div>
      <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, background:'var(--teal-dim)', border:'1px solid var(--teal-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <User size={13} color="var(--teal)"/>
      </div>
    </div>
  )

  return (
    <div className="msg-enter" style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
      <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,#2A7D6F,#38A594)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(42,125,111,0.22)' }}>
        <Heart size={13} color="#fff" fill="#fff"/>
      </div>
      <div style={{ maxWidth:'76%' }}>
        <p style={{ fontSize:10, color:'var(--text-4)', marginBottom:5 }}>MindCare · {time}</p>
        <div style={{ padding:'12px 16px', borderRadius:'16px 16px 16px 4px', background:'#fff', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:14, lineHeight:1.65, boxShadow:'0 1px 4px rgba(26,35,50,0.06)' }}>
          <ReactMarkdown components={{
            p:      ({ children }) => <p style={{ marginBottom:8 }}>{children}</p>,
            strong: ({ children }) => <strong style={{ color:'var(--teal)', fontWeight:600 }}>{children}</strong>,
            ul:     ({ children }) => <ul style={{ paddingLeft:18, marginTop:6, marginBottom:6, display:'flex', flexDirection:'column', gap:4 }}>{children}</ul>,
            li:     ({ children }) => <li style={{ color:'var(--text-2)' }}>{children}</li>,
          }}>
            {msg.content}
          </ReactMarkdown>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:5, paddingLeft:2, flexWrap:'wrap' }}>
          {msg.rag_used && (
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <BookOpen size={9} color="var(--teal)"/>
              <span style={{ fontSize:10, color:'var(--teal)' }}>Knowledge base</span>
            </div>
          )}
          {msg.crisis_detected && (
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <AlertCircle size={9} color="var(--rose)"/>
              <span style={{ fontSize:10, color:'var(--rose)', fontWeight:600 }}>Crisis resources included</span>
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
  const { sessionId, phq9Result, gad7Result, currentEmotion, setRiskData, setRecommendations, messages, addMessage, clearMessages } = useApp()
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
      const { data } = await sendChat({ session_id:sessionId, message:text, phq9_score:phq9Result?.score??0, phq9_category:phq9Result?.category??'Not assessed', gad7_score:gad7Result?.score??0, gad7_category:gad7Result?.category??'Not assessed', emotion:currentEmotion?.emotion??'neutral' })
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
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg-page)' }}>
      {/* Header */}
      <div style={{ padding:'13px 20px', flexShrink:0, borderBottom:'1px solid var(--border)', background:'var(--bg-card)', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 4px rgba(26,35,50,0.05)' }}>
        <div>
          <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif' }}>Chat with MindCare</h2>
          <p style={{ fontSize:11, color:'var(--text-4)', marginTop:2 }}>Compassionate · Confidential · 24/7</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          {phq9Result && <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:99, background:'var(--teal-dim)', color:'var(--teal)', border:'1px solid var(--teal-border)' }}>PHQ-9: {phq9Result.score}</span>}
          {currentEmotion?.confidence > 0 && <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:99, background:'var(--blue-dim)', color:'var(--blue)', border:'1px solid rgba(59,110,168,0.22)', textTransform:'capitalize' }}>{currentEmotion.emotion}</span>}
          <button onClick={handleClear} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-4)', transition:'all 0.16s' }}
            onMouseEnter={e=>{ e.currentTarget.style.color='var(--rose)'; e.currentTarget.style.borderColor='rgba(192,66,74,0.25)'; e.currentTarget.style.background='var(--rose-dim)' }}
            onMouseLeave={e=>{ e.currentTarget.style.color='var(--text-4)'; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='transparent' }}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:14 }}>
        {messages.map(msg => <Message key={msg.id} msg={msg}/>)}
        {loading && <TypingIndicator/>}
        <div ref={bottomRef}/>
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && (
        <div style={{ padding:'0 20px 12px', display:'flex', flexWrap:'wrap', gap:6 }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => { setInput(q); inputRef.current?.focus() }}
              style={{ fontSize:12, padding:'6px 12px', borderRadius:99, cursor:'pointer', background:'#fff', border:'1px solid var(--border)', color:'var(--text-3)', fontFamily:'inherit', transition:'all 0.16s', display:'flex', alignItems:'center', gap:5 }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--teal-border)'; e.currentTarget.style.color='var(--teal)'; e.currentTarget.style.background='var(--teal-dim)' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-3)'; e.currentTarget.style.background='#fff' }}>
              <Sparkles size={10}/>{q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'12px 20px', flexShrink:0, borderTop:'1px solid var(--border)', background:'var(--bg-card)', boxShadow:'0 -1px 4px rgba(26,35,50,0.05)' }}>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          <textarea ref={inputRef} value={input} rows={1}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
            placeholder="Share how you're feeling… (Enter to send)"
            className="input-field"
            style={{ resize:'none', minHeight:44, maxHeight:120, lineHeight:1.55, paddingTop:12 }}
          />
          <button onClick={handleSend} disabled={!input.trim()||loading}
            style={{ width:44, height:44, borderRadius:11, border:'none', flexShrink:0, background:input.trim()&&!loading?'var(--teal)':'var(--bg-elevated)', cursor:input.trim()&&!loading?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:input.trim()&&!loading?'0 2px 12px rgba(42,125,111,0.28)':'none', transition:'all 0.18s' }}>
            {loading ? <RefreshCw size={15} color="var(--teal)" style={{ animation:'spin 1s linear infinite' }}/> : <Send size={15} color={input.trim()?'#fff':'var(--text-4)'}/>}
          </button>
        </div>
        <p style={{ fontSize:10, color:'var(--text-4)', marginTop:7, textAlign:'center' }}>
          Not a substitute for professional care · Crisis: iCall 9152987821
          {phq9Result && ` · PHQ-9: ${phq9Result.score}`}
          {gad7Result && ` · GAD-7: ${gad7Result.score}`}
        </p>
      </div>
    </div>
  )
}