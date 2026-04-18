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
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #F0F4FF 0%, #EEF2FF 50%, #F5F0FF 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>
      {/* Background blobs */}
      <div style={{ position:'fixed', top:'-20%', left:'-10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(91,91,214,0.08), transparent)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-20%', right:'-10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(16,185,129,0.07), transparent)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:400, position:'relative' }}>
        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:60, height:60, borderRadius:18, margin:'0 auto 16px', background:'linear-gradient(135deg,#5B5BD6,#4747B8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 28px rgba(91,91,214,0.35)', animation:'float 4s ease-in-out infinite' }}>
            <Heart size={28} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ fontSize:30, fontWeight:700, color:'#1A1A3E', margin:0, fontFamily:'Poppins,system-ui' }}>MindCare</h1>
          <p style={{ fontSize:14, color:'#8892B0', marginTop:6 }}>Your compassionate mental health companion</p>
        </div>

        {/* Card */}
        <div style={{ background:'#fff', borderRadius:22, padding:32, boxShadow:'0 8px 40px rgba(91,91,214,0.1)', border:'1px solid #E2E8F8' }}>
          <h2 style={{ fontSize:22, fontWeight:700, color:'#1A1A3E', margin:'0 0 4px' }}>Welcome back</h2>
          <p style={{ fontSize:13, color:'#8892B0', marginBottom:24 }}>Sign in to continue your journey</p>

          {error && (
            <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:12, marginBottom:20, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} color="#EF4444" style={{ flexShrink:0, marginTop:1 }} />
              <p style={{ fontSize:12, color:'#EF4444', margin:0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#4A5580', fontWeight:600, marginBottom:7 }}>Username or Email</label>
              <input className="input-field" placeholder="Enter your username or email"
                value={form.username} onChange={e => setForm({...form, username:e.target.value})}
                autoComplete="username" autoFocus />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#4A5580', fontWeight:600, marginBottom:7 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input className="input-field" placeholder="Enter your password"
                  type={showPw?'text':'password'} value={form.password}
                  onChange={e => setForm({...form, password:e.target.value})}
                  style={{ paddingRight:44 }} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#8892B0', display:'flex', alignItems:'center' }}
                  onMouseEnter={e=>e.currentTarget.style.color='#5B5BD6'}
                  onMouseLeave={e=>e.currentTarget.style.color='#8892B0'}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', marginTop:4 }}>
              {loading && <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 1s linear infinite' }} />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign:'center', fontSize:14, color:'#8892B0', marginTop:20 }}>
            No account?{' '}
            <button onClick={onSwitch} style={{ color:'#5B5BD6', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14 }}
              onMouseEnter={e=>e.currentTarget.style.color='#4747B8'}
              onMouseLeave={e=>e.currentTarget.style.color='#5B5BD6'}>Create one free</button>
          </p>
        </div>
        <p style={{ textAlign:'center', color:'#C5CCE0', fontSize:11, marginTop:20 }}>
          Not a substitute for professional care · Crisis: iCall 9152987821
        </p>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
