import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function Login({ onSwitch }) {
  const { login } = useAuth()
  const [form,     setForm]     = useState({ username:'', password:'' })
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handle = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) return setError('Please fill in all fields')
    setLoading(true); setError('')
    try { await login(form.username, form.password) }
    catch { setError('Invalid credentials. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#13111C', display:'flex', alignItems:'center',
      justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>
      {/* ambient glows */}
      <div style={{ position:'fixed', top:'-20%', left:'-10%', width:500, height:500, borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(circle, rgba(155,109,255,0.08), transparent)' }}/>
      <div style={{ position:'fixed', bottom:'-20%', right:'-10%', width:400, height:400, borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(circle, rgba(86,207,178,0.06), transparent)' }}/>

      <div style={{ width:'100%', maxWidth:380, position:'relative' }}>
        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:18, margin:'0 auto 16px', animation:'float 4s ease-in-out infinite',
            background:'linear-gradient(135deg,#9B6DFF,#7C52D9)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 32px rgba(155,109,255,0.4)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="white"/>
            </svg>
          </div>
          <h1 style={{ fontSize:30, color:'#F5F0FF', margin:0, fontFamily:'Fraunces,Georgia,serif', fontStyle:'italic', letterSpacing:'-0.5px' }}>
            MindCare
          </h1>
          <p style={{ fontSize:14, color:'#4A4870', marginTop:6 }}>Your compassionate mental health companion</p>
        </div>

        {/* Card */}
        <div style={{ background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:22, padding:30 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#F5F0FF', margin:'0 0 6px' }}>Welcome back</h2>
          <p style={{ fontSize:13, color:'#4A4870', marginBottom:24 }}>Sign in to continue your journey</p>

          {error && (
            <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:12, marginBottom:20,
              background:'rgba(255,107,107,0.07)', border:'1px solid rgba(255,107,107,0.2)' }}>
              <AlertCircle size={13} color="#FF6B6B" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:12, color:'#FF9999', margin:0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#8B8AAA', fontWeight:600, marginBottom:7 }}>
                Username or Email
              </label>
              <input className="input-field" placeholder="Enter your username"
                value={form.username} onChange={e => setForm({ ...form, username:e.target.value })}
                autoComplete="username" autoFocus />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, color:'#8B8AAA', fontWeight:600, marginBottom:7 }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <input className="input-field" placeholder="Enter your password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password} onChange={e => setForm({ ...form, password:e.target.value })}
                  style={{ paddingRight:44 }} autoComplete="current-password"/>
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'#4A4870',
                  display:'flex', alignItems:'center', transition:'color 0.18s' }}
                  onMouseEnter={e=>e.currentTarget.style.color='#9B6DFF'}
                  onMouseLeave={e=>e.currentTarget.style.color='#4A4870'}>
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', marginTop:4 }}>
              {loading && <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)',
                borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign:'center', fontSize:13, color:'#4A4870', marginTop:22 }}>
            No account?{' '}
            <button onClick={onSwitch} style={{ background:'none', border:'none', cursor:'pointer',
              color:'#9B6DFF', fontWeight:700, fontSize:13, fontFamily:'inherit' }}>
              Create one
            </button>
          </p>
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'#2E2B40', marginTop:20, lineHeight:1.7 }}>
          MindCare is a support tool, not a medical service.<br/>
          Crisis: <strong style={{ color:'#4A4870' }}>iCall 9152987821</strong>
        </p>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}