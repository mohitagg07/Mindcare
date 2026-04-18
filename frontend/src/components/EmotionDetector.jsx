import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Camera, Upload, Zap, RefreshCw, Scan, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import { analyzeEmotion } from '../api/client'
import { useApp } from '../context/AppContext'

const EMOTION_META = {
  happy:    { color:'#2A7D6F', bg:'rgba(42,125,111,0.08)',  label:'Happy',     emoji:'😊', desc:'Positive, joyful expression'    },
  sad:      { color:'#3B6EA8', bg:'rgba(59,110,168,0.08)',  label:'Sad',       emoji:'😢', desc:'Low mood or distress'            },
  angry:    { color:'#C0424A', bg:'rgba(192,66,74,0.08)',   label:'Angry',     emoji:'😠', desc:'Frustration or irritation'       },
  fear:     { color:'#7B5EA8', bg:'rgba(123,94,168,0.08)',  label:'Fearful',   emoji:'😨', desc:'Anxiety or apprehension'         },
  disgust:  { color:'#C07436', bg:'rgba(192,116,54,0.08)',  label:'Disgust',   emoji:'🤢', desc:'Aversion or discomfort'          },
  surprise: { color:'#B05090', bg:'rgba(176,80,144,0.08)',  label:'Surprised', emoji:'😲', desc:'Unexpected strong reaction'      },
  neutral:  { color:'#6B7280', bg:'rgba(107,114,128,0.08)', label:'Neutral',   emoji:'😐', desc:'Calm or composed expression'     },
}

function FaceSVG({ emotion, size = 44 }) {
  const m = EMOTION_META[emotion] ?? EMOTION_META.neutral
  const c = m.color, s = size
  const faces = {
    happy:   <svg width={s} height={s} viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="26" fill={c+'15'} stroke={c} strokeWidth="1.5"/><circle cx="19" cy="22" r="3" fill={c}/><circle cx="37" cy="22" r="3" fill={c}/><path d="M17 33 Q28 43 39 33" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/></svg>,
    sad:     <svg width={s} height={s} viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="26" fill={c+'15'} stroke={c} strokeWidth="1.5"/><circle cx="19" cy="22" r="3" fill={c}/><circle cx="37" cy="22" r="3" fill={c}/><path d="M17 39 Q28 31 39 39" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/><path d="M13 17 L19 21" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M43 17 L37 21" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>,
    angry:   <svg width={s} height={s} viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="26" fill={c+'15'} stroke={c} strokeWidth="1.5"/><circle cx="19" cy="24" r="3" fill={c}/><circle cx="37" cy="24" r="3" fill={c}/><path d="M17 38 Q28 31 39 38" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/><path d="M12 15 L22 21" stroke={c} strokeWidth="2.5" strokeLinecap="round"/><path d="M44 15 L34 21" stroke={c} strokeWidth="2.5" strokeLinecap="round"/></svg>,
    fear:    <svg width={s} height={s} viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="26" fill={c+'15'} stroke={c} strokeWidth="1.5"/><ellipse cx="19" cy="22" rx="3.5" ry="4.5" fill={c}/><ellipse cx="37" cy="22" rx="3.5" ry="4.5" fill={c}/><path d="M19 37 Q28 31 37 37" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/></svg>,
    disgust: <svg width={s} height={s} viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="26" fill={c+'15'} stroke={c} strokeWidth="1.5"/><circle cx="19" cy="22" r="3" fill={c}/><circle cx="37" cy="22" r="3" fill={c}/><path d="M14 16 L22 20" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M42 16 L34 20" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M19 36 L27 32 L33 36 L39 32" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    surprise:<svg width={s} height={s} viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="26" fill={c+'15'} stroke={c} strokeWidth="1.5"/><ellipse cx="19" cy="21" rx="3.5" ry="4" fill={c}/><ellipse cx="37" cy="21" rx="3.5" ry="4" fill={c}/><ellipse cx="28" cy="38" rx="5.5" ry="6" stroke={c} strokeWidth="2" fill={c+'20'}/></svg>,
    neutral: <svg width={s} height={s} viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="26" fill={c+'15'} stroke={c} strokeWidth="1.5"/><circle cx="19" cy="22" r="3" fill={c}/><circle cx="37" cy="22" r="3" fill={c}/><line x1="17" y1="36" x2="39" y2="36" stroke={c} strokeWidth="2.5" strokeLinecap="round"/></svg>,
  }
  return faces[emotion] ?? faces.neutral
}

function ConfRing({ value, color, size = 80 }) {
  const r = 30, circ = 2 * Math.PI * r, dash = circ * (1 - value)
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
      <svg width={size} height={size} viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={r} fill="none" stroke="var(--border)" strokeWidth="5"/>
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round" style={{ transform:'rotate(-90deg)', transformOrigin:'34px 34px', transition:'stroke-dashoffset 1s ease' }}/>
        <text x="34" y="39" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>{Math.round(value * 100)}%</text>
      </svg>
      <span style={{ fontSize:9, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px' }}>CONFIDENCE</span>
    </div>
  )
}

function CamFrame({ active }) {
  const corner = (style) => <div style={{ position:'absolute', width:22, height:22, borderWidth:2, borderStyle:'solid', borderColor:active?'var(--teal)':'var(--border)', transition:'border-color 0.4s', ...style }}/>
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
      {corner({ top:8, left:8,  borderRight:'none', borderBottom:'none', borderTopLeftRadius:4 })}
      {corner({ top:8, right:8, borderLeft:'none',  borderBottom:'none', borderTopRightRadius:4 })}
      {corner({ bottom:8, left:8,  borderRight:'none', borderTop:'none',  borderBottomLeftRadius:4 })}
      {corner({ bottom:8, right:8, borderLeft:'none',  borderTop:'none',  borderBottomRightRadius:4 })}
      {active && <div style={{ position:'absolute', left:0, right:0, height:2, top:'50%', opacity:0.6, background:'linear-gradient(90deg, transparent, var(--teal), transparent)', animation:'scanLine 2s ease-in-out infinite' }}/>}
      <div style={{ position:'absolute', top:10, right:44, display:'flex', alignItems:'center', gap:4, padding:'2px 7px', borderRadius:6, background:'rgba(255,255,255,0.9)', backdropFilter:'blur(6px)' }}>
        <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--teal)', animation:'pulse 1.5s infinite' }}/>
        <span style={{ fontSize:9, fontWeight:700, color:'var(--teal)', letterSpacing:'1px' }}>LIVE</span>
      </div>
    </div>
  )
}

export default function EmotionDetector() {
  const { setCurrentEmotion } = useApp()
  const webcamRef  = useRef(null)
  const fileRef    = useRef(null)
  const [mode,     setMode]     = useState('webcam')
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [preview,  setPreview]  = useState(null)
  const [camReady, setCamReady] = useState(false)
  const [error,    setError]    = useState(null)
  const [scanning, setScanning] = useState(false)

  const analyze = async (b64) => {
    setLoading(true); setScanning(true); setError(null)
    try {
      const { data } = await analyzeEmotion(b64)
      setResult(data)
      setCurrentEmotion({ emotion:data.emotion, confidence:data.confidence })
    } catch (e) {
      setError(e.message || 'Analysis failed. Is the backend running?')
    } finally {
      setLoading(false)
      setTimeout(() => setScanning(false), 600)
    }
  }

  const captureWebcam = useCallback(() => {
    const img = webcamRef.current?.getScreenshot()
    if (!img) return
    setPreview(img); analyze(img)
  }, [])

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setPreview(ev.target.result); analyze(ev.target.result) }
    reader.readAsDataURL(file)
  }

  const dominant = result ? (EMOTION_META[result.emotion] ?? EMOTION_META.neutral) : null
  const scores   = result?.all_scores ? Object.entries(result.all_scores).sort((a, b) => b[1] - a[1]) : []

  return (
    <div style={{ height:'100%', overflowY:'auto', background:'var(--bg-page)' }}>
      <style>{`@keyframes scanLine{0%{top:10%;opacity:0}15%{opacity:0.6}85%{opacity:0.6}100%{top:90%;opacity:0}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'24px 16px' }}>

        <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:22, flexWrap:'wrap' }}>
          <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:'var(--teal-dim)', border:'1px solid var(--teal-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Scan size={20} color="var(--teal)"/>
          </div>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:19, fontWeight:700, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif' }}>Emotion Detection</h2>
            <p style={{ fontSize:12, color:'var(--text-4)', marginTop:3 }}>AI-powered facial expression analysis · 7 emotion classes</p>
          </div>
          {result && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:99, fontSize:11, fontWeight:600, background:result.backend==='claude-vision'?'var(--teal-dim)':result.model_available?'var(--teal-dim)':'var(--amber-dim)', border:`1px solid ${result.backend==='claude-vision'?'var(--teal-border)':result.model_available?'var(--teal-border)':'rgba(192,116,54,0.25)'}`, color:result.backend==='claude-vision'?'var(--teal)':result.model_available?'var(--teal)':'var(--amber)' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'currentColor', animation:'pulse 1.5s infinite' }}/>
              {result.backend==='claude-vision' ? '✦ Claude Vision' : result.model_available ? 'Model Active' : 'Model Offline'}
            </div>
          )}
        </div>

        <div className="grid-emotion">
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* Mode toggle */}
            <div style={{ display:'flex', gap:4, padding:4, borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
              {[{ id:'webcam', Icon:Camera, label:'Webcam' }, { id:'upload', Icon:Upload, label:'Upload Photo' }].map(m => (
                <button key={m.id} onClick={() => { setMode(m.id); setPreview(null); setResult(null); setError(null) }} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 12px', borderRadius:9, cursor:'pointer', fontFamily:'inherit', border:`1px solid ${mode===m.id?'var(--teal-border)':'transparent'}`, background:mode===m.id?'var(--teal-dim)':'transparent', color:mode===m.id?'var(--teal)':'var(--text-3)', fontSize:13, fontWeight:500, transition:'all 0.16s' }}>
                  <m.Icon size={13}/>{m.label}
                </button>
              ))}
            </div>

            {/* Webcam */}
            {mode === 'webcam' && (
              <div style={{ background:'var(--bg-card)', borderRadius:16, padding:12, border:'1px solid var(--border)' }}>
                <div style={{ position:'relative', borderRadius:12, overflow:'hidden', aspectRatio:'4/3', background:'#1A2332', border:'1px solid var(--border)' }}>
                  <Webcam ref={webcamRef} screenshotFormat="image/jpeg" screenshotQuality={0.92} onUserMedia={() => setCamReady(true)} onUserMediaError={() => setError('Camera access denied')} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} mirrored/>
                  {!camReady && (
                    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:9, background:'#1A2332' }}>
                      <div style={{ width:20, height:20, border:'2px solid rgba(255,255,255,0.15)', borderTopColor:'var(--teal)', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
                      <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>Initializing camera…</span>
                    </div>
                  )}
                  <CamFrame active={scanning}/>
                </div>
                <button onClick={captureWebcam} disabled={loading || !camReady} style={{ marginTop:10, width:'100%', padding:'12px', borderRadius:10, border:'none', background:loading?'var(--teal-dim)':'var(--teal)', color:loading?'var(--teal)':'#fff', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:camReady&&!loading?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:camReady?1:0.5, boxShadow:camReady&&!loading?'0 2px 12px rgba(42,125,111,0.28)':'none', transition:'all 0.18s' }}>
                  {loading ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Analysing…</> : <><Zap size={14}/> Capture &amp; Analyse</>}
                </button>
              </div>
            )}

            {/* Upload */}
            {mode === 'upload' && (
              <div style={{ background:'var(--bg-card)', borderRadius:16, padding:12, border:'1px solid var(--border)' }}>
                <div onClick={() => fileRef.current?.click()} style={{ position:'relative', borderRadius:12, overflow:'hidden', aspectRatio:'4/3', cursor:'pointer', transition:'all 0.16s', background:preview?'transparent':'var(--bg-elevated)', border:preview?'none':'2px dashed var(--border-md)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  {preview
                    ? <img src={preview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:10 }}/>
                    : <>
                        <div style={{ width:50, height:50, borderRadius:14, marginBottom:12, background:'var(--teal-dim)', border:'1px solid var(--teal-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Upload size={20} color="var(--teal)"/>
                        </div>
                        <p style={{ color:'var(--text-2)', fontSize:13, fontWeight:600, margin:0 }}>Click to upload a photo</p>
                        <p style={{ color:'var(--text-4)', fontSize:12, marginTop:4 }}>Face should be clearly visible</p>
                      </>
                  }
                  {preview && <CamFrame active={scanning}/>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile}/>
                {preview && (
                  <button onClick={() => fileRef.current?.click()} disabled={loading} style={{ marginTop:10, width:'100%', padding:'11px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-elevated)', color:'var(--text-3)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                    {loading ? <RefreshCw size={12} style={{ animation:'spin 1s linear infinite' }}/> : <Upload size={12}/>}
                    {loading ? 'Analysing…' : 'Upload Different Image'}
                  </button>
                )}
              </div>
            )}

            {error && (
              <div style={{ display:'flex', gap:9, padding:'11px 13px', borderRadius:10, background:'var(--rose-dim)', border:'1px solid rgba(192,66,74,0.18)' }}>
                <AlertTriangle size={13} color="var(--rose)" style={{ flexShrink:0, marginTop:1 }}/>
                <p style={{ fontSize:12, color:'var(--rose)', lineHeight:1.5, margin:0 }}>{error}</p>
              </div>
            )}

            {result && !result.model_available && (
              <div style={{ padding:'13px 15px', borderRadius:12, background:'var(--amber-dim)', border:'1px solid rgba(192,116,54,0.20)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:7 }}>
                  <Info size={12} color="var(--amber)"/>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--amber)' }}>Emotion Backend Offline</span>
                </div>
                <p style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.6, margin:0 }}>
                  Set <code style={{ color:'var(--teal)', fontSize:11 }}>ANTHROPIC_API_KEY</code> in your backend <code style={{ color:'var(--teal)', fontSize:11 }}>.env</code> to enable Claude Vision detection.
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {result && dominant ? (
              <div style={{ animation:'fadeIn 0.4s ease', display:'flex', flexDirection:'column', gap:12 }}>

                <div style={{ background:'#fff', border:`1.5px solid ${dominant.color}28`, borderRadius:18, padding:'20px 18px', position:'relative', overflow:'hidden', boxShadow:'0 2px 16px rgba(26,35,50,0.08)' }}>
                  <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:dominant.color+'08', filter:'blur(20px)', pointerEvents:'none' }}/>
                  <p style={{ fontSize:9, color:dominant.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:14, opacity:0.8 }}>DETECTED EXPRESSION</p>

                  <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <div style={{ width:72, height:72, borderRadius:18, flexShrink:0, background:dominant.color+'12', border:`1.5px solid ${dominant.color}28`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <FaceSVG emotion={result.emotion} size={48}/>
                    </div>
                    <div style={{ flex:1, minWidth:110 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                        <span style={{ fontSize:24 }}>{dominant.emoji}</span>
                        <h3 style={{ fontSize:22, fontWeight:700, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif', letterSpacing:'-0.3px' }}>{dominant.label}</h3>
                      </div>
                      <p style={{ fontSize:12, color:'var(--text-3)', margin:0, lineHeight:1.5 }}>{dominant.desc}</p>
                      <div style={{ marginTop:9, display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:99, background:dominant.color+'12', border:`1px solid ${dominant.color}28` }}>
                        <CheckCircle size={11} color={dominant.color}/>
                        <span style={{ fontSize:11, fontWeight:700, color:dominant.color }}>{Math.round(result.confidence * 100)}% confidence</span>
                      </div>
                    </div>
                    <ConfRing value={result.confidence} color={dominant.color} size={80}/>
                  </div>
                </div>

                <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:16, padding:16, boxShadow:'0 1px 4px rgba(26,35,50,0.05)' }}>
                  <p style={{ fontSize:9, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:12 }}>FULL BREAKDOWN</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    {scores.map(([emotion, score]) => {
                      const meta = EMOTION_META[emotion] ?? { color:'var(--text-3)', label:emotion, emoji:'🙂' }
                      const pct  = Math.round(score * 100)
                      const isTop = emotion === result.emotion
                      return (
                        <div key={emotion} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:10, background:isTop ? meta.color+'08' : 'transparent', border:`1px solid ${isTop ? meta.color+'22' : 'transparent'}` }}>
                          <span style={{ fontSize:17, flexShrink:0, width:24, textAlign:'center' }}>{meta.emoji}</span>
                          <FaceSVG emotion={emotion} size={24}/>
                          <span style={{ width:62, fontSize:12, fontWeight:600, flexShrink:0, color:isTop ? meta.color : 'var(--text-3)' }}>{meta.label}</span>
                          <div style={{ flex:1, height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:99, background:isTop ? meta.color : meta.color+'60', width:`${pct}%`, transition:'width 0.8s ease' }}/>
                          </div>
                          <span style={{ width:30, fontSize:12, fontWeight:700, textAlign:'right', flexShrink:0, color:isTop ? meta.color : 'var(--text-3)' }}>{pct}%</span>
                          {isTop && <CheckCircle size={11} color={meta.color} style={{ flexShrink:0 }}/>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ padding:'11px 13px', borderRadius:11, background:'var(--teal-dim)', border:'1px solid var(--teal-border)' }}>
                  <p style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.6, margin:0 }}>
                    <strong style={{ color:'var(--teal)' }}>{dominant.emoji} {dominant.label}</strong> recorded. This will personalise your next AI chat session.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:340, gap:18, textAlign:'center', background:'#fff', border:'1px solid var(--border)', borderRadius:18, padding:24, boxShadow:'0 1px 4px rgba(26,35,50,0.05)' }}>
                <div style={{ position:'relative', width:90, height:90, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1px solid var(--teal-border)', animation:'pulse 2.5s ease-in-out infinite' }}/>
                  <div style={{ position:'absolute', inset:14, borderRadius:'50%', border:'1px solid var(--border)', animation:'pulse 2.5s ease-in-out 0.5s infinite' }}/>
                  <div style={{ width:52, height:52, borderRadius:15, background:'var(--teal-dim)', border:'1px solid var(--teal-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Camera size={22} color="var(--teal)"/>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize:15, fontWeight:600, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif' }}>No capture yet</p>
                  <p style={{ fontSize:13, color:'var(--text-4)', marginTop:6, maxWidth:200, lineHeight:1.6 }}>Use your webcam or upload a photo to detect your emotion</p>
                </div>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap', justifyContent:'center', opacity:0.5 }}>
                  {Object.keys(EMOTION_META).map(e => <div key={e} title={EMOTION_META[e].label}><FaceSVG emotion={e} size={28}/></div>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}