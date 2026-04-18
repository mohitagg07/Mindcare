import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Camera, Upload, Zap, RefreshCw, Scan, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import { analyzeEmotion } from '../api/client'
import { useApp } from '../context/AppContext'

/* ── Emotion metadata ── unified colour palette ── */
const EMOTION_META = {
  happy:    { color:'#10D9A8', bg:'rgba(16,217,168,0.10)',  label:'Happy',     emoji:'😊', desc:'Positive, joyful expression'    },
  sad:      { color:'#60A5FA', bg:'rgba(96,165,250,0.10)',  label:'Sad',       emoji:'😢', desc:'Low mood or distress'            },
  angry:    { color:'#FF6B6B', bg:'rgba(255,107,107,0.10)', label:'Angry',     emoji:'😠', desc:'Frustration or irritation'       },
  fear:     { color:'#B4A0FF', bg:'rgba(180,160,255,0.10)', label:'Fearful',   emoji:'😨', desc:'Anxiety or apprehension'         },
  disgust:  { color:'#FBBF24', bg:'rgba(251,191,36,0.10)',  label:'Disgust',   emoji:'🤢', desc:'Aversion or discomfort'          },
  surprise: { color:'#F9A8D4', bg:'rgba(249,168,212,0.10)', label:'Surprised', emoji:'😲', desc:'Unexpected strong reaction'      },
  neutral:  { color:'#8B87B8', bg:'rgba(139,135,184,0.10)', label:'Neutral',   emoji:'😐', desc:'Calm or composed expression'     },
}

/* ── Large animated face SVG ── */
function FaceSVG({ emotion, size = 52 }) {
  const m = EMOTION_META[emotion] ?? EMOTION_META.neutral
  const c = m.color, s = size
  const faces = {
    happy:   <svg width={s} height={s} viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" fill={c+'20'} stroke={c} strokeWidth="2"/>
                <circle cx="19" cy="22" r="3" fill={c}/>
                <circle cx="37" cy="22" r="3" fill={c}/>
                <path d="M17 33 Q28 43 39 33" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M22 20 Q28 17 34 20" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4"/>
              </svg>,
    sad:     <svg width={s} height={s} viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" fill={c+'20'} stroke={c} strokeWidth="2"/>
                <circle cx="19" cy="22" r="3" fill={c}/>
                <circle cx="37" cy="22" r="3" fill={c}/>
                <path d="M17 39 Q28 31 39 39" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M13 17 L19 21" stroke={c} strokeWidth="2" strokeLinecap="round"/>
                <path d="M43 17 L37 21" stroke={c} strokeWidth="2" strokeLinecap="round"/>
                <circle cx="15" cy="34" r="2.5" fill={c} opacity="0.5"/>
                <circle cx="13" cy="38" r="2" fill={c} opacity="0.3"/>
              </svg>,
    angry:   <svg width={s} height={s} viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" fill={c+'20'} stroke={c} strokeWidth="2"/>
                <circle cx="19" cy="24" r="3" fill={c}/>
                <circle cx="37" cy="24" r="3" fill={c}/>
                <path d="M17 38 Q28 31 39 38" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M12 15 L22 21" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M44 15 L34 21" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 30 L34 30" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              </svg>,
    fear:    <svg width={s} height={s} viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" fill={c+'20'} stroke={c} strokeWidth="2"/>
                <ellipse cx="19" cy="22" rx="3.5" ry="4.5" fill={c}/>
                <ellipse cx="37" cy="22" rx="3.5" ry="4.5" fill={c}/>
                <path d="M19 37 Q28 31 37 37" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M12 15 L20 20" stroke={c} strokeWidth="2" strokeLinecap="round"/>
                <path d="M44 15 L36 20" stroke={c} strokeWidth="2" strokeLinecap="round"/>
                <path d="M24 43 L28 47 L32 43" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
              </svg>,
    disgust: <svg width={s} height={s} viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" fill={c+'20'} stroke={c} strokeWidth="2"/>
                <circle cx="19" cy="22" r="3" fill={c}/>
                <circle cx="37" cy="22" r="3" fill={c}/>
                <path d="M14 16 L22 20" stroke={c} strokeWidth="2" strokeLinecap="round"/>
                <path d="M42 16 L34 20" stroke={c} strokeWidth="2" strokeLinecap="round"/>
                <path d="M19 36 L27 32 L33 36 L39 32" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>,
    surprise:<svg width={s} height={s} viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" fill={c+'20'} stroke={c} strokeWidth="2"/>
                <ellipse cx="19" cy="21" rx="3.5" ry="4" fill={c}/>
                <ellipse cx="37" cy="21" rx="3.5" ry="4" fill={c}/>
                <ellipse cx="28" cy="38" rx="5.5" ry="6" stroke={c} strokeWidth="2" fill={c+'25'}/>
                <path d="M20 12 Q28 8 36 12" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
              </svg>,
    neutral: <svg width={s} height={s} viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" fill={c+'20'} stroke={c} strokeWidth="2"/>
                <circle cx="19" cy="22" r="3" fill={c}/>
                <circle cx="37" cy="22" r="3" fill={c}/>
                <line x1="17" y1="36" x2="39" y2="36" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 18 Q28 15 34 18" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
              </svg>,
  }
  return faces[emotion] ?? faces.neutral
}

/* ── Confidence ring ── */
function ConfRing({ value, color, size = 88 }) {
  const r = 34, circ = 2 * Math.PI * r, dash = circ * (1 - value)
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <svg width={size} height={size} viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6"/>
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          style={{ transform:'rotate(-90deg)', transformOrigin:'38px 38px', transition:'stroke-dashoffset 1s ease' }}/>
        <text x="38" y="43" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>
          {Math.round(value * 100)}%
        </text>
      </svg>
      <span style={{ fontSize:9, color:'#4A4870', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px' }}>
        CONFIDENCE
      </span>
    </div>
  )
}

/* ── Camera frame overlay ── */
function CamFrame({ active }) {
  const corner = (style) => (
    <div style={{
      position:'absolute', width:24, height:24,
      borderWidth: 2.5, borderStyle:'solid',
      borderColor: active ? '#10D9A8' : '#2E2B40',
      transition:'border-color 0.4s', ...style
    }}/>
  )
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
      {corner({ top:10, left:10,  borderRight:'none', borderBottom:'none', borderTopLeftRadius:5 })}
      {corner({ top:10, right:10, borderLeft:'none',  borderBottom:'none', borderTopRightRadius:5 })}
      {corner({ bottom:10, left:10,  borderRight:'none', borderTop:'none',  borderBottomLeftRadius:5 })}
      {corner({ bottom:10, right:10, borderLeft:'none',  borderTop:'none',  borderBottomRightRadius:5 })}
      {active && (
        <div style={{
          position:'absolute', left:0, right:0, height:2, top:'50%', opacity:0.7,
          background:'linear-gradient(90deg, transparent, #10D9A8, transparent)',
          animation:'scanLine 2s ease-in-out infinite'
        }}/>
      )}
      <div style={{
        position:'absolute', top:12, right:48,
        display:'flex', alignItems:'center', gap:5,
        padding:'3px 9px', borderRadius:7,
        background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)'
      }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#10D9A8', animation:'pulse 1.5s infinite' }}/>
        <span style={{ fontSize:9, fontWeight:700, color:'#10D9A8', letterSpacing:'1.2px' }}>LIVE</span>
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
      setCurrentEmotion({ emotion: data.emotion, confidence: data.confidence })
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
    <div style={{ height:'100%', overflowY:'auto', background:'#13111C' }}>
      <style>{`
        @keyframes scanLine { 0%{top:10%;opacity:0} 15%{opacity:0.7} 85%{opacity:0.7} 100%{top:90%;opacity:0} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes detectPulse { 0%,100%{box-shadow:0 0 0 0 rgba(16,217,168,0)} 50%{box-shadow:0 0 0 10px rgba(16,217,168,0.15)} }
      `}</style>
      <div style={{ maxWidth: 960, margin:'0 auto', padding:'24px 16px' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24, flexWrap:'wrap' }}>
          <div style={{
            width:48, height:48, borderRadius:14, flexShrink:0,
            background:'rgba(16,217,168,0.10)', border:'1px solid rgba(16,217,168,0.22)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 16px rgba(16,217,168,0.15)'
          }}>
            <Scan size={22} color="#10D9A8"/>
          </div>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'#F0ECFF', margin:0, letterSpacing:'-0.3px' }}>
              Emotion Detection
            </h2>
            <p style={{ fontSize:13, color:'#4A4870', marginTop:3 }}>
              CNN-powered facial expression analysis · 7 emotion classes
            </p>
          </div>
          {result && (
            <div style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'6px 14px', borderRadius:99, fontSize:12, fontWeight:700,
              background: result.model_available ? 'rgba(16,217,168,0.10)' : 'rgba(251,191,36,0.10)',
              border: `1px solid ${result.model_available ? 'rgba(16,217,168,0.25)' : 'rgba(251,191,36,0.25)'}`,
              color: result.model_available ? '#10D9A8' : '#FBBF24'
            }}>
              <div style={{
                width:7, height:7, borderRadius:'50%',
                background: result.model_available ? '#10D9A8' : '#FBBF24',
                animation: 'pulse 1.5s infinite'
              }}/>
              {result.model_available ? 'Model Active' : 'Model Offline'}
            </div>
          )}
        </div>

        {/* ── Responsive grid ── */}
        <div className="grid-emotion">

          {/* ── LEFT: Camera / Upload ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Mode toggle */}
            <div style={{
              display:'flex', gap:6, padding:5, borderRadius:14,
              background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)'
            }}>
              {[
                { id:'webcam', Icon:Camera, label:'Webcam' },
                { id:'upload', Icon:Upload, label:'Upload Photo' }
              ].map(m => (
                <button key={m.id}
                  onClick={() => { setMode(m.id); setPreview(null); setResult(null); setError(null) }}
                  style={{
                    flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                    padding:'10px 14px', borderRadius:11, cursor:'pointer', fontFamily:'inherit',
                    border:`1.5px solid ${mode === m.id ? 'rgba(16,217,168,0.3)' : 'transparent'}`,
                    background: mode === m.id ? 'rgba(16,217,168,0.10)' : 'transparent',
                    color: mode === m.id ? '#10D9A8' : '#4A4870',
                    fontSize:13, fontWeight:600, transition:'all 0.18s'
                  }}>
                  <m.Icon size={14}/>{m.label}
                </button>
              ))}
            </div>

            {/* Webcam panel */}
            {mode === 'webcam' && (
              <div style={{ background:'#1D1A2C', borderRadius:18, padding:14, border:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{
                  position:'relative', borderRadius:14, overflow:'hidden',
                  aspectRatio:'4/3', background:'#0D0B15',
                  border:'1px solid rgba(255,255,255,0.06)'
                }}>
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={0.92}
                    onUserMedia={() => setCamReady(true)}
                    onUserMediaError={() => setError('Camera access denied or not available')}
                    style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                    mirrored
                  />
                  {!camReady && (
                    <div style={{
                      position:'absolute', inset:0, display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center', gap:10, background:'#0D0B15'
                    }}>
                      <div style={{
                        width:24, height:24, border:'2.5px solid rgba(16,217,168,0.2)',
                        borderTopColor:'#10D9A8', borderRadius:'50%', animation:'spin 0.9s linear infinite'
                      }}/>
                      <span style={{ color:'#4A4870', fontSize:13 }}>Initializing camera…</span>
                    </div>
                  )}
                  <CamFrame active={scanning}/>
                </div>
                <button
                  onClick={captureWebcam}
                  disabled={loading || !camReady}
                  style={{
                    marginTop:12, width:'100%', padding:'14px',
                    borderRadius:13, border:'none',
                    background: loading
                      ? 'rgba(16,217,168,0.10)'
                      : 'linear-gradient(135deg,#10D9A8,#059669)',
                    color: loading ? '#10D9A8' : '#0D0B15',
                    fontSize:14, fontWeight:700, fontFamily:'inherit',
                    cursor: camReady && !loading ? 'pointer' : 'not-allowed',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:9,
                    opacity: camReady ? 1 : 0.5,
                    boxShadow: camReady && !loading ? '0 4px 20px rgba(16,217,168,0.35)' : 'none',
                    transition:'all 0.2s'
                  }}
                >
                  {loading
                    ? <><RefreshCw size={15} style={{ animation:'spin 1s linear infinite' }}/> Analysing…</>
                    : <><Zap size={15}/> Capture &amp; Analyse</>
                  }
                </button>
              </div>
            )}

            {/* Upload panel */}
            {mode === 'upload' && (
              <div style={{ background:'#1D1A2C', borderRadius:18, padding:14, border:'1px solid rgba(255,255,255,0.07)' }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    position:'relative', borderRadius:14, overflow:'hidden', aspectRatio:'4/3',
                    cursor:'pointer', transition:'all 0.18s',
                    background: preview ? 'transparent' : '#0D0B15',
                    border: preview ? 'none' : '2px dashed rgba(16,217,168,0.25)',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'
                  }}
                >
                  {preview
                    ? <img src={preview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:12 }}/>
                    : <>
                        <div style={{
                          width:56, height:56, borderRadius:16, marginBottom:14,
                          background:'rgba(16,217,168,0.10)', border:'1px solid rgba(16,217,168,0.25)',
                          display:'flex', alignItems:'center', justifyContent:'center'
                        }}>
                          <Upload size={22} color="#10D9A8"/>
                        </div>
                        <p style={{ color:'#C4C0E8', fontSize:14, fontWeight:600, margin:0 }}>Click to upload a photo</p>
                        <p style={{ color:'#4A4870', fontSize:12, marginTop:5 }}>Face should be clearly visible</p>
                      </>
                  }
                  {preview && <CamFrame active={scanning}/>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile}/>
                {preview && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={loading}
                    style={{
                      marginTop:12, width:'100%', padding:'12px', borderRadius:12,
                      border:'1px solid rgba(255,255,255,0.08)',
                      background:'rgba(255,255,255,0.04)',
                      color:'#8B87B8', fontSize:13, fontWeight:600,
                      cursor:'pointer', fontFamily:'inherit',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8
                    }}
                  >
                    {loading ? <RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/> : <Upload size={13}/>}
                    {loading ? 'Analysing…' : 'Upload Different Image'}
                  </button>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                display:'flex', gap:10, padding:'12px 14px', borderRadius:12,
                background:'rgba(255,107,107,0.07)', border:'1px solid rgba(255,107,107,0.2)'
              }}>
                <AlertTriangle size={14} color="#FF6B6B" style={{ flexShrink:0, marginTop:1 }}/>
                <p style={{ fontSize:12, color:'#FCA5A5', lineHeight:1.5, margin:0 }}>{error}</p>
              </div>
            )}

            {/* Model offline */}
            {result && !result.model_available && (
              <div style={{
                padding:'14px 16px', borderRadius:14,
                background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)'
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                  <Info size={13} color="#FBBF24"/>
                  <span style={{ fontSize:12, fontWeight:700, color:'#FBBF24' }}>Model Not Loaded</span>
                </div>
                <p style={{ fontSize:12, color:'#8B87B8', lineHeight:1.6, margin:0 }}>
                  To enable: <code style={{ color:'#10D9A8', fontSize:11 }}>pip install fer opencv-python</code>, then place <code style={{ color:'#10D9A8', fontSize:11 }}>emotion_model.h5</code> in <code style={{ color:'#10D9A8', fontSize:11 }}>backend/models/</code> and restart.
                </p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Results ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {result && dominant ? (
              <div style={{ animation:'fadeIn 0.4s ease', display:'flex', flexDirection:'column', gap:14 }}>

                {/* ── BIG Detected Emotion Card ── */}
                <div style={{
                  background:`linear-gradient(135deg, ${dominant.color}18, ${dominant.color}08)`,
                  border:`1.5px solid ${dominant.color}35`,
                  borderRadius:20, padding:'22px 20px',
                  position:'relative', overflow:'hidden'
                }}>
                  {/* Glow blob */}
                  <div style={{
                    position:'absolute', top:-30, right:-30, width:120, height:120,
                    borderRadius:'50%', background:dominant.color+'15', filter:'blur(30px)',
                    pointerEvents:'none'
                  }}/>

                  <p style={{
                    fontSize:9, color:dominant.color, fontWeight:700,
                    textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:16, opacity:0.8
                  }}>
                    DETECTED EXPRESSION
                  </p>

                  <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                    {/* Big face */}
                    <div style={{
                      width:80, height:80, borderRadius:22, flexShrink:0,
                      background:dominant.color+'18',
                      border:`2px solid ${dominant.color}40`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      animation:'detectPulse 2.5s ease-in-out infinite',
                      boxShadow:`0 8px 24px ${dominant.color}20`
                    }}>
                      <FaceSVG emotion={result.emotion} size={52}/>
                    </div>

                    <div style={{ flex:1, minWidth:120 }}>
                      {/* Emoji + Label */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                        <span style={{ fontSize:28 }}>{dominant.emoji}</span>
                        <h3 style={{
                          fontSize:26, fontWeight:800, color:'#F0ECFF', margin:0,
                          letterSpacing:'-0.5px', lineHeight:1
                        }}>
                          {dominant.label}
                        </h3>
                      </div>
                      <p style={{ fontSize:13, color:'#8B87B8', margin:0, lineHeight:1.5 }}>
                        {dominant.desc}
                      </p>
                      {/* Confidence badge */}
                      <div style={{
                        marginTop:10, display:'inline-flex', alignItems:'center', gap:6,
                        padding:'5px 12px', borderRadius:99,
                        background:dominant.color+'18',
                        border:`1px solid ${dominant.color}35`
                      }}>
                        <CheckCircle size={12} color={dominant.color}/>
                        <span style={{ fontSize:12, fontWeight:700, color:dominant.color }}>
                          {Math.round(result.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>

                    <ConfRing value={result.confidence} color={dominant.color} size={88}/>
                  </div>
                </div>

                {/* ── Full breakdown ── */}
                <div style={{
                  background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:18, padding:18
                }}>
                  <p style={{
                    fontSize:9, color:'#4A4870', fontWeight:700,
                    textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:14
                  }}>
                    FULL BREAKDOWN
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {scores.map(([emotion, score]) => {
                      const meta = EMOTION_META[emotion] ?? { color:'#8B87B8', label:emotion, emoji:'🙂' }
                      const pct  = Math.round(score * 100)
                      const isTop = emotion === result.emotion
                      return (
                        <div
                          key={emotion}
                          style={{
                            display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                            borderRadius:12, transition:'all 0.2s',
                            background: isTop ? meta.color + '12' : 'rgba(255,255,255,0.02)',
                            border:`1.5px solid ${isTop ? meta.color + '30' : 'transparent'}`
                          }}
                        >
                          {/* Emoji */}
                          <span style={{ fontSize:20, flexShrink:0, width:28, textAlign:'center' }}>
                            {meta.emoji}
                          </span>
                          {/* Face SVG */}
                          <FaceSVG emotion={emotion} size={28}/>
                          {/* Label */}
                          <span style={{
                            width:68, fontSize:12, fontWeight:600, flexShrink:0,
                            color: isTop ? meta.color : '#4A4870'
                          }}>
                            {meta.label}
                          </span>
                          {/* Bar */}
                          <div style={{
                            flex:1, height:6, borderRadius:99,
                            background:'rgba(255,255,255,0.05)', overflow:'hidden'
                          }}>
                            <div style={{
                              height:'100%', borderRadius:99,
                              background: isTop
                                ? `linear-gradient(90deg, ${meta.color}CC, ${meta.color})`
                                : meta.color + '60',
                              width:`${pct}%`, transition:'width 0.8s ease',
                              boxShadow: isTop ? `0 0 10px ${meta.color}70` : 'none'
                            }}/>
                          </div>
                          {/* Pct */}
                          <span style={{
                            width:34, fontSize:12, fontWeight:800,
                            textAlign:'right', flexShrink:0,
                            color: isTop ? meta.color : '#4A4870'
                          }}>
                            {pct}%
                          </span>
                          {isTop && <CheckCircle size={12} color={meta.color} style={{ flexShrink:0 }}/>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Info note */}
                <div style={{
                  padding:'12px 14px', borderRadius:12,
                  background:'rgba(123,94,248,0.06)', border:'1px solid rgba(123,94,248,0.15)'
                }}>
                  <p style={{ fontSize:12, color:'#8B87B8', lineHeight:1.6, margin:0 }}>
                    <strong style={{ color:'#B4A0FF' }}>{dominant.emoji} {dominant.label}</strong> recorded.
                    This will personalise your next AI chat session.
                  </p>
                </div>
              </div>
            ) : (
              /* ── Empty state ── */
              <div style={{
                display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center', minHeight:380, gap:20, textAlign:'center',
                background:'#1D1A2C', border:'1px solid rgba(255,255,255,0.07)',
                borderRadius:20, padding:24
              }}>
                <div style={{ position:'relative', width:100, height:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{
                    position:'absolute', inset:0, borderRadius:'50%',
                    border:'1px solid rgba(16,217,168,0.15)',
                    animation:'pulse 2.5s ease-in-out infinite'
                  }}/>
                  <div style={{
                    position:'absolute', inset:14, borderRadius:'50%',
                    border:'1px solid rgba(16,217,168,0.10)',
                    animation:'pulse 2.5s ease-in-out 0.5s infinite'
                  }}/>
                  <div style={{
                    width:60, height:60, borderRadius:18,
                    background:'rgba(16,217,168,0.10)', border:'1px solid rgba(16,217,168,0.22)',
                    display:'flex', alignItems:'center', justifyContent:'center'
                  }}>
                    <Camera size={24} color="#10D9A8"/>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize:16, fontWeight:600, color:'#C4C0E8', margin:0 }}>No capture yet</p>
                  <p style={{ fontSize:13, color:'#4A4870', marginTop:6, maxWidth:220, lineHeight:1.6 }}>
                    Use your webcam or upload a photo to detect your emotion
                  </p>
                </div>
                {/* Preview faces */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', opacity:0.4 }}>
                  {Object.keys(EMOTION_META).map(e => (
                    <div key={e} title={EMOTION_META[e].label}>
                      <FaceSVG emotion={e} size={32}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}