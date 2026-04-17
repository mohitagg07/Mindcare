import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Camera, Upload, Zap, RefreshCw, Scan, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import { analyzeEmotion } from '../api/client'
import { useApp } from '../context/AppContext'

const EMOTION_META = {
  happy:    { color:'#56CFB2', label:'Happy',     desc:'Positive, joyful expression'   },
  sad:      { color:'#60A5FA', label:'Sad',       desc:'Low mood or distress'           },
  angry:    { color:'#FF6B6B', label:'Angry',     desc:'Frustration or irritation'      },
  fear:     { color:'#C4A3FF', label:'Fearful',   desc:'Anxiety or apprehension'        },
  disgust:  { color:'#FFB547', label:'Disgust',   desc:'Aversion or discomfort'         },
  surprise: { color:'#F9A8D4', label:'Surprised', desc:'Unexpected reaction'            },
  neutral:  { color:'#8B8AAA', label:'Neutral',   desc:'Calm or composed expression'   },
}

function Face({ emotion, size=44 }) {
  const c = EMOTION_META[emotion]?.color ?? '#8B8AAA', s=size
  const faces = {
    happy:   <svg width={s} height={s} viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="21" fill={c+'15'} stroke={c} strokeWidth="1.5"/><circle cx="15" cy="18" r="2" fill={c}/><circle cx="29" cy="18" r="2" fill={c}/><path d="M14 26 Q22 33 30 26" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/></svg>,
    sad:     <svg width={s} height={s} viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="21" fill={c+'15'} stroke={c} strokeWidth="1.5"/><circle cx="15" cy="18" r="2" fill={c}/><circle cx="29" cy="18" r="2" fill={c}/><path d="M14 30 Q22 24 30 30" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M27 16 L30 13" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><path d="M17 16 L14 13" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
    angry:   <svg width={s} height={s} viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="21" fill={c+'15'} stroke={c} strokeWidth="1.5"/><circle cx="15" cy="19" r="2" fill={c}/><circle cx="29" cy="19" r="2" fill={c}/><path d="M14 30 Q22 24 30 30" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M12 15 L18 18" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M32 15 L26 18" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>,
    fear:    <svg width={s} height={s} viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="21" fill={c+'15'} stroke={c} strokeWidth="1.5"/><ellipse cx="15" cy="18" rx="2.5" ry="3" fill={c}/><ellipse cx="29" cy="18" rx="2.5" ry="3" fill={c}/><path d="M15 29 Q22 25 29 29" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M12 14 L17 17" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><path d="M32 14 L27 17" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
    disgust: <svg width={s} height={s} viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="21" fill={c+'15'} stroke={c} strokeWidth="1.5"/><circle cx="15" cy="18" r="2" fill={c}/><circle cx="29" cy="18" r="2" fill={c}/><path d="M15 29 Q22 26 29 29" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M12 15 L17 17" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><path d="M32 15 L27 17" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
    surprise:<svg width={s} height={s} viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="21" fill={c+'15'} stroke={c} strokeWidth="1.5"/><ellipse cx="15" cy="18" rx="2.5" ry="3" fill={c}/><ellipse cx="29" cy="18" rx="2.5" ry="3" fill={c}/><ellipse cx="22" cy="30" rx="4" ry="4.5" stroke={c} strokeWidth="1.5" fill={c+'25'}/></svg>,
    neutral: <svg width={s} height={s} viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="21" fill={c+'15'} stroke={c} strokeWidth="1.5"/><circle cx="15" cy="18" r="2" fill={c}/><circle cx="29" cy="18" r="2" fill={c}/><line x1="15" y1="29" x2="29" y2="29" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>,
  }
  return faces[emotion] ?? faces.neutral
}

function ConfRing({ value, color, size=72 }) {
  const r=27, circ=2*Math.PI*r, dash=circ*(1-value)
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <svg width={size} height={size} viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          style={{ transform:'rotate(-90deg)', transformOrigin:'32px 32px', transition:'stroke-dashoffset 0.8s ease' }}/>
        <text x="32" y="37" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>
          {Math.round(value*100)}%
        </text>
      </svg>
      <span style={{ fontSize:9, color:'#4A4870', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>
        Confidence
      </span>
    </div>
  )
}

function CamFrame({ active }) {
  const corner = (style) => (
    <div style={{ position:'absolute', width:20, height:20, borderWidth:2,
      borderStyle:'solid', borderColor: active?'#56CFB2':'#2E2B40',
      transition:'border-color 0.3s', ...style }}/>
  )
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
      {corner({ top:10, left:10,  borderRight:'none', borderBottom:'none', borderTopLeftRadius:4 })}
      {corner({ top:10, right:10, borderLeft:'none',  borderBottom:'none', borderTopRightRadius:4 })}
      {corner({ bottom:10, left:10,  borderRight:'none', borderTop:'none', borderBottomLeftRadius:4 })}
      {corner({ bottom:10, right:10, borderLeft:'none',  borderTop:'none', borderBottomRightRadius:4 })}
      {active && (
        <div style={{ position:'absolute', left:0, right:0, height:1, top:'50%', opacity:0.7,
          background:'linear-gradient(90deg, transparent, #56CFB2, transparent)',
          animation:'scanLine 2s ease-in-out infinite' }}/>
      )}
      <div style={{ position:'absolute', top:10, right:42, display:'flex', alignItems:'center', gap:5,
        padding:'3px 8px', borderRadius:6, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)' }}>
        <div style={{ width:5, height:5, borderRadius:'50%', background:'#56CFB2', animation:'pulse 2s infinite' }}/>
        <span style={{ fontSize:9, fontWeight:700, color:'#56CFB2', letterSpacing:'1px' }}>LIVE</span>
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
  const scores   = result?.all_scores ? Object.entries(result.all_scores).sort((a,b)=>b[1]-a[1]) : []

  return (
    <div className="bg-page" style={{ height:'100%', overflowY:'auto' }}>
      <style>{`
        @keyframes scanLine { 0%{top:10%;opacity:0} 15%{opacity:0.7} 85%{opacity:0.7} 100%{top:90%;opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
      <div style={{ maxWidth:940, margin:'0 auto', padding:'28px 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
          <div style={{ width:44, height:44, borderRadius:13, flexShrink:0,
            background:'rgba(86,207,178,0.12)', border:'1px solid rgba(86,207,178,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Scan size={20} color="#56CFB2"/>
          </div>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:22, fontWeight:700, color:'#F5F0FF', margin:0, letterSpacing:'-0.3px' }}>
              Emotion Detection
            </h2>
            <p style={{ fontSize:13, color:'#4A4870', marginTop:3 }}>
              CNN-powered facial expression analysis · 7 emotion classes
            </p>
          </div>
          {result && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 13px', borderRadius:99,
              fontSize:12, fontWeight:600,
              background: result.model_available ? 'rgba(86,207,178,0.1)' : 'rgba(255,181,71,0.1)',
              border: `1px solid ${result.model_available ? 'rgba(86,207,178,0.25)' : 'rgba(255,181,71,0.25)'}`,
              color: result.model_available ? '#56CFB2' : '#FFB547' }}>
              <div style={{ width:6, height:6, borderRadius:'50%',
                background: result.model_available ? '#56CFB2' : '#FFB547' }}/>
              {result.model_available ? 'Model Active' : 'Model Offline'}
            </div>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 400px', gap:20 }}>

          {/* Left */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Mode toggle */}
            <div style={{ display:'flex', gap:6, padding:5, borderRadius:14,
              background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.06)' }}>
              {[{ id:'webcam',Icon:Camera,label:'Webcam' },{ id:'upload',Icon:Upload,label:'Upload Photo' }].map(m => (
                <button key={m.id}
                  onClick={() => { setMode(m.id); setPreview(null); setResult(null); setError(null) }}
                  style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                    padding:'10px 14px', borderRadius:11, cursor:'pointer', fontFamily:'inherit',
                    border:`1px solid ${mode===m.id?'rgba(86,207,178,0.3)':'transparent'}`,
                    background: mode===m.id?'rgba(86,207,178,0.1)':'transparent',
                    color: mode===m.id?'#56CFB2':'#4A4870', fontSize:13, fontWeight:600, transition:'all 0.18s' }}>
                  <m.Icon size={14}/>{m.label}
                </button>
              ))}
            </div>

            {/* Webcam */}
            {mode==='webcam' && (
              <div className="card" style={{ padding:14 }}>
                <div style={{ position:'relative', borderRadius:12, overflow:'hidden', aspectRatio:'4/3',
                  background:'#0D0B15', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <Webcam ref={webcamRef} screenshotFormat="image/jpeg" screenshotQuality={0.92}
                    onUserMedia={() => setCamReady(true)}
                    onUserMediaError={() => setError('Camera access denied or not available')}
                    style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                    mirrored/>
                  {!camReady && (
                    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center', gap:10, background:'#0D0B15' }}>
                      <div style={{ width:20, height:20, border:'2px solid rgba(86,207,178,0.3)',
                        borderTopColor:'#56CFB2', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
                      <span style={{ color:'#4A4870', fontSize:13 }}>Initializing camera…</span>
                    </div>
                  )}
                  <CamFrame active={scanning}/>
                </div>
                <button onClick={captureWebcam} disabled={loading||!camReady} style={{
                  marginTop:12, width:'100%', padding:'13px', borderRadius:12, border:'none',
                  background: loading?'rgba(86,207,178,0.15)':'linear-gradient(135deg,#56CFB2,#3DB89D)',
                  color: loading?'#56CFB2':'#13111C', fontSize:14, fontWeight:700,
                  cursor: camReady&&!loading?'pointer':'not-allowed', fontFamily:'inherit',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:9,
                  opacity: camReady?1:0.5,
                  boxShadow: camReady&&!loading?'0 4px 18px rgba(86,207,178,0.3)':'none',
                  transition:'all 0.2s' }}>
                  {loading ? <><RefreshCw size={15} style={{ animation:'spin 1s linear infinite' }}/> Analysing…</>
                           : <><Zap size={15}/> Capture &amp; Analyse</>}
                </button>
              </div>
            )}

            {/* Upload */}
            {mode==='upload' && (
              <div className="card" style={{ padding:14 }}>
                <div onClick={() => fileRef.current?.click()} style={{ position:'relative', borderRadius:12,
                  overflow:'hidden', aspectRatio:'4/3', cursor:'pointer', transition:'all 0.18s',
                  background: preview?'transparent':'#0D0B15',
                  border: preview?'none':'2px dashed rgba(86,207,178,0.2)',
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  {preview
                    ? <img src={preview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:12 }}/>
                    : <>
                        <div style={{ width:48, height:48, borderRadius:14, marginBottom:12,
                          background:'rgba(86,207,178,0.1)', border:'1px solid rgba(86,207,178,0.2)',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Upload size={20} color="#56CFB2"/>
                        </div>
                        <p style={{ color:'#8B8AAA', fontSize:14, fontWeight:600, margin:0 }}>Click to upload a photo</p>
                        <p style={{ color:'#4A4870', fontSize:12, marginTop:4 }}>Face should be clearly visible</p>
                      </>}
                  {preview && <CamFrame active={scanning}/>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile}/>
                {preview && (
                  <button onClick={() => fileRef.current?.click()} disabled={loading} style={{
                    marginTop:12, width:'100%', padding:'12px', borderRadius:12,
                    border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)',
                    color:'#8B8AAA', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    {loading ? <RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/> : <Upload size={13}/>}
                    {loading ? 'Analysing…' : 'Upload Different Image'}
                  </button>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:12,
                background:'rgba(255,107,107,0.07)', border:'1px solid rgba(255,107,107,0.2)' }}>
                <AlertTriangle size={13} color="#FF6B6B" style={{ flexShrink:0, marginTop:1 }}/>
                <p style={{ fontSize:12, color:'#FF9999', lineHeight:1.5, margin:0 }}>{error}</p>
              </div>
            )}

            {/* Model offline */}
            {result && !result.model_available && (
              <div style={{ padding:'14px 16px', borderRadius:14,
                background:'rgba(255,181,71,0.06)', border:'1px solid rgba(255,181,71,0.2)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                  <Info size={13} color="#FFB547"/>
                  <span style={{ fontSize:12, fontWeight:700, color:'#FFB547' }}>Model Not Loaded</span>
                </div>
                <p style={{ fontSize:12, color:'#8B8AAA', lineHeight:1.6, margin:0 }}>
                  Showing defaults. To enable: <code style={{ color:'#56CFB2', fontSize:11 }}>pip install fer opencv-python</code>, then place <code style={{ color:'#56CFB2', fontSize:11 }}>emotion_model.h5</code> in <code style={{ color:'#56CFB2', fontSize:11 }}>backend/models/</code> and restart.
                </p>
              </div>
            )}
          </div>

          {/* Right — Results */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {result && dominant ? (
              <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {/* Dominant */}
                <div className="card" style={{ background:dominant.color+'0E', border:`1px solid ${dominant.color}25` }}>
                  <p style={{ fontSize:10, color:'#4A4870', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'1px', marginBottom:14 }}>Detected Expression</p>
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <Face emotion={result.emotion} size={60}/>
                    <div style={{ flex:1 }}>
                      <h3 style={{ fontSize:28, fontWeight:800, color:'#F5F0FF', margin:0, letterSpacing:'-0.5px' }}>
                        {dominant.label}
                      </h3>
                      <p style={{ fontSize:13, color:'#8B8AAA', marginTop:4 }}>{dominant.desc}</p>
                    </div>
                    <ConfRing value={result.confidence} color={dominant.color} size={72}/>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="card" style={{ padding:18 }}>
                  <p style={{ fontSize:10, color:'#4A4870', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'1px', marginBottom:14 }}>Full Breakdown</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    {scores.map(([emotion, score]) => {
                      const meta = EMOTION_META[emotion] ?? { color:'#8B8AAA', label:emotion }
                      const pct  = Math.round(score*100)
                      const isTop = emotion===result.emotion
                      return (
                        <div key={emotion} style={{ display:'flex', alignItems:'center', gap:10,
                          padding:'8px 10px', borderRadius:10, transition:'all 0.2s',
                          background: isTop ? meta.color+'0E' : 'transparent',
                          border:`1px solid ${isTop?meta.color+'25':'transparent'}` }}>
                          <Face emotion={emotion} size={22}/>
                          <span style={{ width:64, fontSize:12, fontWeight:600, color:isTop?meta.color:'#4A4870' }}>
                            {meta.label}
                          </span>
                          <div style={{ flex:1, height:5, borderRadius:99, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:99, background:meta.color,
                              width:`${pct}%`, transition:'width 0.7s ease',
                              boxShadow:isTop?`0 0 8px ${meta.color}60`:'none' }}/>
                          </div>
                          <span style={{ width:30, fontSize:11, fontWeight:700, textAlign:'right',
                            color:isTop?meta.color:'#4A4870' }}>{pct}%</span>
                          {isTop && <CheckCircle size={11} color={meta.color}/>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ padding:'12px 14px', borderRadius:12,
                  background:'rgba(155,109,255,0.06)', border:'1px solid rgba(155,109,255,0.15)' }}>
                  <p style={{ fontSize:12, color:'#8B8AAA', lineHeight:1.6, margin:0 }}>
                    <strong style={{ color:'#C4A3FF' }}>{dominant.label}</strong> recorded.
                    This will personalise your next chat session.
                  </p>
                </div>
              </div>
            ) : (
              <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center', minHeight:400, gap:20, textAlign:'center' }}>
                <div style={{ position:'relative', width:90, height:90, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1px solid rgba(86,207,178,0.15)', animation:'pulse 2.5s ease-in-out infinite' }}/>
                  <div style={{ position:'absolute', inset:12, borderRadius:'50%', border:'1px solid rgba(86,207,178,0.1)', animation:'pulse 2.5s ease-in-out infinite', animationDelay:'0.5s' }}/>
                  <div style={{ width:54, height:54, borderRadius:16, background:'rgba(86,207,178,0.1)',
                    border:'1px solid rgba(86,207,178,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Camera size={22} color="#56CFB2"/>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize:15, fontWeight:600, color:'#D4CEE8', margin:0 }}>No capture yet</p>
                  <p style={{ fontSize:13, color:'#4A4870', marginTop:6, maxWidth:200, lineHeight:1.6 }}>
                    Use your webcam or upload a photo to detect emotion
                  </p>
                </div>
                <div style={{ display:'flex', gap:10, opacity:0.35 }}>
                  {Object.keys(EMOTION_META).map(e => <Face key={e} emotion={e} size={26}/>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}