import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Heart, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react'

export default function Register({ onSwitch }) {
  const { register } = useAuth()
  const [form,    setForm]    = useState({ username:'', email:'', password:'' })
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const set = k => e => setForm(f => ({...f, [k]:e.target.value}))

  const validate = () => {
    if (!form.username||!form.email||!form.password) return 'Please fill in all fields'
    if (form.username.length < 3) return 'Username must be at least 3 characters'
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return 'Username: letters, numbers and underscores only'
    if (!form.email.includes('@')) return 'Enter a valid email address'
    if (form.password.length < 8) return 'Password must be at least 8 characters'
    if (!/[a-zA-Z]/.test(form.password)) return 'Password must contain at least one letter'
    if (!/\d/.test(form.password)) return 'Password must contain at least one number'
    return ''
  }

  const handle = async (e) => {
    e.preventDefault()
    const err = validate(); if (err) return setError(err)
    setLoading(true); setError('')
    try { await register(form.username, form.email, form.password) }
    catch (err) { setError(err.message || 'Registration failed. Please try again.') }
    finally { setLoading(false) }
  }

  const strength = form.password.length===0 ? 0 : form.password.length<8 ? 1 : form.password.length<12 ? 2 : 3
  const sColors  = ['','#C0424A','#C07436','#2A7D6F']
  const sLabels  = ['','Too short','Good','Strong']

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(150deg, #F0EDE8 0%, #E8F2EF 50%, #EEF0F5 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', overflowY:'auto' }}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ position:'fixed', top:'-10%', left:'-5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(42,125,111,0.07), transparent)', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:'-10%', right:'-5%', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle, rgba(192,116,54,0.05), transparent)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:400, position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:58, height:58, borderRadius:17, margin:'0 auto 16px', background:'linear-gradient(135deg,#2A7D6F,#38A594)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 24px rgba(42,125,111,0.32)', animation:'float 4s ease-in-out infinite' }}>
            <Heart size={26} color="#fff" fill="#fff"/>
          </div>
          <h1 style={{ fontSize:28, fontWeight:700, color:'#1A2332', margin:0, fontFamily:'Lora,serif' }}>MindCare</h1>
          <p style={{ fontSize:13, color:'#6B7280', marginTop:6 }}>Begin your wellbeing journey</p>
        </div>

        <div style={{ background:'#fff', borderRadius:20, padding:32, boxShadow:'0 4px 32px rgba(26,35,50,0.10)', border:'1px solid #E8E4DC' }}>
          <h2 style={{ fontSize:21, fontWeight:700, color:'#1A2332', margin:'0 0 4px', fontFamily:'Lora,serif' }}>Create account</h2>
          <p style={{ fontSize:13, color:'#9CA3AF', marginBottom:24 }}>Free, private, no credit card needed</p>

          {error && (
            <div style={{ display:'flex', gap:10, padding:'11px 14px', borderRadius:10, marginBottom:18, background:'rgba(192,66,74,0.06)', border:'1px solid rgba(192,66,74,0.18)' }}>
              <AlertCircle size={14} color="#C0424A" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:12, color:'#C0424A', margin:0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#374151', fontWeight:600, marginBottom:7 }}>Username</label>
              <input className="input-field" placeholder="Letters, numbers, underscores" value={form.username} onChange={set('username')} autoFocus/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#374151', fontWeight:600, marginBottom:7 }}>Email</label>
              <input className="input-field" placeholder="your@email.com" type="email" value={form.email} onChange={set('email')}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#374151', fontWeight:600, marginBottom:7 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input className="input-field" placeholder="Min. 8 chars, letter + number" type={showPw?'text':'password'} value={form.password} onChange={set('password')} style={{ paddingRight:44 }}/>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', display:'flex', alignItems:'center' }}>
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {form.password && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                  <div style={{ flex:1, display:'flex', gap:3 }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{ height:3, flex:1, borderRadius:99, background:i<=strength?sColors[strength]:'var(--border)', transition:'background 0.3s' }}/>
                    ))}
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, color:sColors[strength] }}>{sLabels[strength]}</span>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', marginTop:4 }}>
              {loading && <div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginTop:16, padding:'10px 12px', borderRadius:10, background:'rgba(42,125,111,0.06)', border:'1px solid rgba(42,125,111,0.14)' }}>
            <ShieldCheck size={13} color="#2A7D6F" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ fontSize:11, color:'#374151', margin:0, lineHeight:1.5 }}>No personal data stored permanently. All sessions are private.</p>
          </div>

          <p style={{ textAlign:'center', fontSize:13, color:'#9CA3AF', marginTop:18 }}>
            Already have an account?{' '}
            <button onClick={onSwitch} style={{ color:'#2A7D6F', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>Sign in</button>
          </p>
        </div>
        <p style={{ textAlign:'center', color:'#C5C5BD', fontSize:11, marginTop:20 }}>
          Not a substitute for professional care · Crisis: iCall 9152987821
        </p>
      </div>
    </div>
  )
}