import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Heart, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function Login({ onSwitch }) {
  const { login } = useAuth()
  const [form,    setForm]    = useState({ username:'', password:'' })
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handle = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) return setError('Please fill in all fields')
    setLoading(true); setError('')
    try { await login(form.username, form.password) }
    catch (err) { setError(err.message || 'Invalid username or password') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(150deg, #F0EDE8 0%, #E8F2EF 50%, #EEF0F5 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Soft background blobs */}
      <div style={{ position:'fixed', top:'-10%', right:'-5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(42,125,111,0.07), transparent)', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:'-10%', left:'-5%', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,110,168,0.06), transparent)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:400, position:'relative' }}>
        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:58, height:58, borderRadius:17, margin:'0 auto 16px', background:'linear-gradient(135deg,#2A7D6F,#38A594)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 24px rgba(42,125,111,0.32)', animation:'float 4s ease-in-out infinite' }}>
            <Heart size={26} color="#fff" fill="#fff"/>
          </div>
          <h1 style={{ fontSize:28, fontWeight:700, color:'#1A2332', margin:0, fontFamily:'Lora,serif' }}>MindCare</h1>
          <p style={{ fontSize:13, color:'#6B7280', marginTop:6 }}>Your compassionate mental health companion</p>
        </div>

        {/* Card */}
        <div style={{ background:'#fff', borderRadius:20, padding:32, boxShadow:'0 4px 32px rgba(26,35,50,0.10)', border:'1px solid #E8E4DC' }}>
          <h2 style={{ fontSize:21, fontWeight:700, color:'#1A2332', margin:'0 0 4px', fontFamily:'Lora,serif' }}>Welcome back</h2>
          <p style={{ fontSize:13, color:'#9CA3AF', marginBottom:24 }}>Sign in to continue your journey</p>

          {error && (
            <div style={{ display:'flex', gap:10, padding:'11px 14px', borderRadius:10, marginBottom:18, background:'rgba(192,66,74,0.06)', border:'1px solid rgba(192,66,74,0.18)' }}>
              <AlertCircle size={14} color="#C0424A" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:12, color:'#C0424A', margin:0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#374151', fontWeight:600, marginBottom:7 }}>Username or Email</label>
              <input className="input-field" placeholder="Enter your username or email" value={form.username} onChange={e => setForm({...form, username:e.target.value})} autoComplete="username" autoFocus/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#374151', fontWeight:600, marginBottom:7 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input className="input-field" placeholder="Enter your password" type={showPw?'text':'password'} value={form.password} onChange={e => setForm({...form, password:e.target.value})} style={{ paddingRight:44 }} autoComplete="current-password"/>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', display:'flex', alignItems:'center' }}
                  onMouseEnter={e=>e.currentTarget.style.color='#2A7D6F'}
                  onMouseLeave={e=>e.currentTarget.style.color='#9CA3AF'}>
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', marginTop:4 }}>
              {loading && <div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign:'center', fontSize:13, color:'#9CA3AF', marginTop:20 }}>
            No account?{' '}
            <button onClick={onSwitch} style={{ color:'#2A7D6F', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}
              onMouseEnter={e=>e.currentTarget.style.color='#38A594'}
              onMouseLeave={e=>e.currentTarget.style.color='#2A7D6F'}>Create one free</button>
          </p>
        </div>

        <p style={{ textAlign:'center', color:'#C5C5BD', fontSize:11, marginTop:20 }}>
          Not a substitute for professional care · Crisis: iCall 9152987821
        </p>
      </div>
    </div>
  )
}