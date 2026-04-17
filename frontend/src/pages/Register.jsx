import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react'

export default function Register({ onSwitch }) {
  const { register } = useAuth()
  const [form,     setForm]     = useState({ username:'', email:'', password:'' })
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]:e.target.value }))

  const validate = () => {
    if (!form.username || !form.email || !form.password) return 'Please fill in all fields'
    if (form.username.length < 3)    return 'Username must be at least 3 characters'
    if (!form.email.includes('@'))   return 'Enter a valid email address'
    if (form.password.length < 6)    return 'Password must be at least 6 characters'
    return ''
  }

  const handle = async (e) => {
    e.preventDefault()
    const err = validate(); if (err) return setError(err)
    setLoading(true); setError('')
    try { await register(form.username, form.email, form.password) }
    catch (err) { setError(err.message || 'Registration failed') }
    finally { setLoading(false) }
  }

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3
  const strColors = ['','#FF6B6B','#FFB547','#56CFB2']
  const strLabels = ['','Too short','Good','Strong']

  return (
    <div style={{ minHeight:'100vh', background:'#13111C', display:'flex', alignItems:'center',
      justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:'-20%', right:'-10%', width:500, height:500, borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(circle, rgba(155,109,255,0.07), transparent)' }}/>
      <div style={{ position:'fixed', bottom:'-20%', left:'-10%', width:400, height:400, borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(circle, rgba(86,207,178,0.06), transparent)' }}/>

      <div style={{ width:'100%', maxWidth:380, position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:18, margin:'0 auto 16px', animation:'float 4s ease-in-out infinite',
            background:'linear-gradient(135deg,#9B6DFF,#56CFB2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 32px rgba(155,109,255,0.4)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="white"/>
            </svg>
          </div>
          <h1 style={{ fontSize:30, color:'#F5F0FF', margin:0, fontFamily:'Fraunces,Georgia,serif', fontStyle:'italic' }}>
            MindCare
          </h1>
          <p style={{ fontSize:14, color:'#4A4870', marginTop:6 }}>Begin your wellbeing journey</p>
        </div>

        <div style={{ background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:22, padding:30 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#F5F0FF', margin:'0 0 6px' }}>Create account</h2>
          <p style={{ fontSize:13, color:'#4A4870', marginBottom:24 }}>Free, private, no credit card needed</p>

          {error && (
            <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:12, marginBottom:20,
              background:'rgba(255,107,107,0.07)', border:'1px solid rgba(255,107,107,0.2)' }}>
              <AlertCircle size={13} color="#FF6B6B" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:12, color:'#FF9999', margin:0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#8B8AAA', fontWeight:600, marginBottom:7 }}>Username</label>
              <input className="input-field" placeholder="Choose a username" value={form.username} onChange={set('username')} autoFocus/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#8B8AAA', fontWeight:600, marginBottom:7 }}>Email</label>
              <input className="input-field" placeholder="your@email.com" type="email" value={form.email} onChange={set('email')}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#8B8AAA', fontWeight:600, marginBottom:7 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input className="input-field" placeholder="Min. 6 characters"
                  type={showPass?'text':'password'} value={form.password} onChange={set('password')} style={{ paddingRight:44 }}/>
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'#4A4870', display:'flex', alignItems:'center' }}>
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {form.password && (
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
                  <div style={{ flex:1, display:'flex', gap:4 }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:99, transition:'background 0.3s',
                        background: i<=strength ? strColors[strength] : 'rgba(255,255,255,0.06)' }}/>
                    ))}
                  </div>
                  <span style={{ fontSize:11, color:strColors[strength], fontWeight:700, minWidth:44 }}>
                    {strLabels[strength]}
                  </span>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', marginTop:4 }}>
              {loading && <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)',
                borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div style={{ display:'flex', gap:8, marginTop:16, padding:'10px 12px', borderRadius:11,
            background:'rgba(86,207,178,0.05)', border:'1px solid rgba(86,207,178,0.12)' }}>
            <ShieldCheck size={12} color="#56CFB2" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ fontSize:11, color:'#4A4870', margin:0, lineHeight:1.6 }}>
              No personal data stored permanently. Sessions are private.
            </p>
          </div>

          <p style={{ textAlign:'center', fontSize:13, color:'#4A4870', marginTop:20 }}>
            Already have an account?{' '}
            <button onClick={onSwitch} style={{ background:'none', border:'none', cursor:'pointer',
              color:'#9B6DFF', fontWeight:700, fontSize:13, fontFamily:'inherit' }}>
              Sign in
            </button>
          </p>
        </div>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}