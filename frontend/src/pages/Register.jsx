import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Heart, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

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
    if (!/\d/.test(form.password))       return 'Password must contain at least one number'
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
  const sColors  = ['','#EF4444','#F59E0B','#10B981']
  const sLabels  = ['','Too short','Good','Strong']

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #F0F4FF 0%, #EEF2FF 50%, #F5F0FF 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', overflowY:'auto' }}>
      <div style={{ position:'fixed', top:'-15%', right:'-10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(91,91,214,0.07), transparent)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-15%', left:'-10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(16,185,129,0.06), transparent)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:400, position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:60, height:60, borderRadius:18, margin:'0 auto 16px', background:'linear-gradient(135deg,#5B5BD6,#4747B8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 28px rgba(91,91,214,0.35)', animation:'float 4s ease-in-out infinite' }}>
            <Heart size={28} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ fontSize:30, fontWeight:700, color:'#1A1A3E', margin:0, fontFamily:'Poppins,system-ui' }}>MindCare</h1>
          <p style={{ fontSize:14, color:'#8892B0', marginTop:6 }}>Begin your wellbeing journey</p>
        </div>

        <div style={{ background:'#fff', borderRadius:22, padding:32, boxShadow:'0 8px 40px rgba(91,91,214,0.1)', border:'1px solid #E2E8F8' }}>
          <h2 style={{ fontSize:22, fontWeight:700, color:'#1A1A3E', margin:'0 0 4px' }}>Create account</h2>
          <p style={{ fontSize:13, color:'#8892B0', marginBottom:24 }}>Free, private, no credit card needed</p>

          {error && (
            <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:12, marginBottom:20, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} color="#EF4444" style={{ flexShrink:0, marginTop:1 }} />
              <p style={{ fontSize:12, color:'#EF4444', margin:0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#4A5580', fontWeight:600, marginBottom:7 }}>Username</label>
              <input className="input-field" placeholder="Letters, numbers, underscores only"
                value={form.username} onChange={set('username')} autoFocus />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#4A5580', fontWeight:600, marginBottom:7 }}>Email</label>
              <input className="input-field" placeholder="your@email.com" type="email"
                value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#4A5580', fontWeight:600, marginBottom:7 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input className="input-field" placeholder="Min. 8 chars, letter + number"
                  type={showPw?'text':'password'} value={form.password} onChange={set('password')}
                  style={{ paddingRight:44 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#8892B0', display:'flex', alignItems:'center' }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {form.password && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                  <div style={{ flex:1, display:'flex', gap:4 }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{ height:4, flex:1, borderRadius:99, background:i<=strength?sColors[strength]:'#E2E8F8', transition:'background 0.3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, color:sColors[strength] }}>{sLabels[strength]}</span>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', marginTop:4 }}>
              {loading && <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 1s linear infinite' }} />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <div style={{ display:'flex', alignItems:'start', gap:8, marginTop:16, padding:'10px 12px', borderRadius:12, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)' }}>
            <CheckCircle size={13} color="#10B981" style={{ flexShrink:0, marginTop:1 }} />
            <p style={{ fontSize:11, color:'#4A5580', margin:0, lineHeight:1.5 }}>No personal data stored permanently. All sessions are private.</p>
          </div>
          <p style={{ textAlign:'center', fontSize:14, color:'#8892B0', marginTop:18 }}>
            Already have an account?{' '}
            <button onClick={onSwitch} style={{ color:'#5B5BD6', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14 }}>Sign in</button>
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
