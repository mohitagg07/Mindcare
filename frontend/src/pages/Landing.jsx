import { useEffect, useRef, useState } from 'react'
import {
  Heart, MessageCircle, Scan, ClipboardList, ArrowRight,
  TrendingUp, Shield, Brain, Activity, CheckCircle,
  BarChart2, Smile, Zap, Star, ChevronDown
} from 'lucide-react'

/* ── Animated SVG nature particles ── */
function NatureBg() {
  return (
    <div aria-hidden style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      {/* Warm sunrise gradient mesh */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg, #FFF8F0 0%, #F0FAF5 35%, #EDF5FF 65%, #FFF4F8 100%)' }}/>

      {/* Floating orbs */}
      <div style={{ position:'absolute', top:'-8%', left:'5%', width:520, height:520, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(255,183,77,0.18) 0%, transparent 65%)', animation:'orbFloat1 20s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', top:'15%', right:'-5%', width:440, height:440, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(42,125,111,0.13) 0%, transparent 65%)', animation:'orbFloat2 26s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', bottom:'5%', left:'20%', width:380, height:380, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(180,130,255,0.10) 0%, transparent 65%)', animation:'orbFloat3 22s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', top:'40%', left:'40%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(255,150,100,0.09) 0%, transparent 65%)', animation:'orbFloat1 18s ease-in-out 5s infinite' }}/>

      {/* Petals / leaves floating */}
      {[
        { left:'8%',  top:'20%', size:18, delay:0,    dur:12, color:'rgba(255,120,80,0.25)',  rot:15 },
        { left:'85%', top:'15%', size:22, delay:2,    dur:15, color:'rgba(42,125,111,0.20)', rot:-20 },
        { left:'15%', top:'60%', size:14, delay:4,    dur:10, color:'rgba(255,183,77,0.25)',  rot:30 },
        { left:'75%', top:'55%', size:20, delay:1,    dur:13, color:'rgba(180,130,255,0.18)', rot:-10 },
        { left:'50%', top:'10%', size:12, delay:6,    dur:11, color:'rgba(255,100,150,0.20)', rot:45 },
        { left:'92%', top:'70%', size:16, delay:3,    dur:14, color:'rgba(42,125,111,0.18)', rot:25 },
        { left:'30%', top:'80%', size:10, delay:7,    dur:9,  color:'rgba(255,183,77,0.22)',  rot:-35 },
      ].map((p, i) => (
        <div key={i} style={{
          position:'absolute', left:p.left, top:p.top,
          width:p.size, height:p.size,
          borderRadius:'60% 40% 60% 40%',
          background:p.color,
          transform:`rotate(${p.rot}deg)`,
          animation:`petalFloat ${p.dur}s ease-in-out ${p.delay}s infinite`,
          filter:'blur(0.5px)',
        }}/>
      ))}

      {/* Soft grid lines */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#2A7D6F" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>
    </div>
  )
}

/* ── Animated word cycle ── */
function WordCycle({ words }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i+1) % words.length); setVisible(true) }, 400)
    }, 2800)
    return () => clearInterval(iv)
  }, [words.length])
  return (
    <span style={{
      display:'inline-block', color:'var(--teal)',
      borderBottom:'3px solid var(--teal)',
      paddingBottom:2,
      opacity:visible ? 1 : 0,
      transform:visible ? 'translateY(0)' : 'translateY(8px)',
      transition:'opacity 0.35s ease, transform 0.35s ease',
      minWidth:180, textAlign:'left',
    }}>
      {words[idx]}
    </span>
  )
}

/* ── Animated counter on scroll ── */
function Counter({ target, suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      const start = Date.now(), dur = 1600
      const tick = () => {
        const p = Math.min(1, (Date.now()-start)/dur)
        const ease = 1 - Math.pow(1-p, 3)
        setVal(Math.round(ease * target))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold:0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{val}{suffix}</span>
}

/* ── Scroll reveal wrapper ── */
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect() }
    }, { threshold:0.12 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

/* ── App chat preview ── */
function AppPreview() {
  const msgs = [
    { role:'ai',   text:"Hello! I can see you're feeling a bit tired today. Want to talk about it?" },
    { role:'user', text:"Yes, work has been overwhelming lately." },
    { role:'ai',   text:"I understand. Let's try a quick grounding exercise together — it only takes 2 minutes." },
  ]
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (shown >= msgs.length) return
    const t = setTimeout(() => setShown(s => s+1), shown === 0 ? 800 : 1400)
    return () => clearTimeout(t)
  }, [shown])

  return (
    <div style={{
      background:'#fff', borderRadius:24, overflow:'hidden',
      boxShadow:'0 24px 64px rgba(26,35,50,0.13), 0 4px 16px rgba(26,35,50,0.06)',
      border:'1px solid rgba(232,228,220,0.8)',
      animation:'floatCard 7s ease-in-out infinite',
    }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1C3D35 0%,#2A7D6F 100%)', padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Heart size={14} color="#fff" fill="#fff"/>
        </div>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:14, fontFamily:'Lora,serif', lineHeight:1 }}>MindCare</div>
          <div style={{ color:'rgba(255,255,255,0.65)', fontSize:10, marginTop:2 }}>AI • Facial Emotion Detected: 😊 Happy</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99, background:'rgba(255,255,255,0.15)' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#6EE7B7', animation:'pulse 2s infinite' }}/>
          <span style={{ color:'rgba(255,255,255,0.9)', fontSize:10, fontWeight:600 }}>Live</span>
        </div>
      </div>

      {/* Emotion bar */}
      <div style={{ display:'flex', gap:8, padding:'10px 16px', background:'#F9F8F6', borderBottom:'1px solid #EEE' }}>
        {[{ l:'Risk', v:'Low', c:'#2A7D6F' },{ l:'Mood', v:'Happy 😊', c:'#C07436' },{ l:'Trend', v:'↑ Better', c:'#3B6EA8' }].map(x => (
          <div key={x.l} style={{ flex:1, textAlign:'center', padding:'7px 4px', borderRadius:9, background:`${x.c}10`, border:`1px solid ${x.c}20` }}>
            <div style={{ fontSize:11, fontWeight:700, color:x.c }}>{x.v}</div>
            <div style={{ fontSize:9, color:'#9CA3AF', marginTop:1 }}>{x.l}</div>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10, minHeight:140 }}>
        {msgs.slice(0, shown).map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', animation:'msgPop 0.35s cubic-bezier(0.34,1.4,0.64,1) both' }}>
            {m.role==='ai' && (
              <div style={{ width:24, height:24, borderRadius:7, background:'linear-gradient(135deg,#2A7D6F,#38A594)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginRight:7, marginTop:2 }}>
                <Heart size={10} color="#fff" fill="#fff"/>
              </div>
            )}
            <div style={{ maxWidth:'80%', padding:'9px 12px', borderRadius:m.role==='user'?'12px 12px 3px 12px':'12px 12px 12px 3px', background:m.role==='user'?'linear-gradient(135deg,#2A7D6F,#38A594)':'#F0EDE8', fontSize:12, color:m.role==='user'?'#fff':'#374151', lineHeight:1.5 }}>
              {m.text}
            </div>
          </div>
        ))}
        {shown < msgs.length && (
          <div style={{ display:'flex', gap:5, paddingLeft:31 }}>
            {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay:`${i*0.18}s` }}/>)}
          </div>
        )}
      </div>

      {/* Mini EMA chart */}
      <div style={{ margin:'0 16px 14px', padding:'10px 12px', background:'#F9F8F6', borderRadius:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:9, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.07em' }}>72h EMA Trajectory</span>
          <span style={{ fontSize:10, fontWeight:700, color:'#2A7D6F' }}>Improving ↑</span>
        </div>
        <svg width="100%" height="32" viewBox="0 0 220 32">
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2A7D6F" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="#2A7D6F" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M0,28 C40,26 60,24 90,19 C120,14 150,11 180,8 C200,6 215,5 220,4" fill="none" stroke="#2A7D6F" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M0,28 C40,26 60,24 90,19 C120,14 150,11 180,8 C200,6 215,5 220,4 L220,32 L0,32Z" fill="url(#g1)"/>
          <circle cx="220" cy="4" r="4" fill="#2A7D6F"/>
          <circle cx="220" cy="4" r="7" fill="rgba(42,125,111,0.2)"/>
        </svg>
      </div>
    </div>
  )
}

/* ── Feature card with illustration ── */
function FeatureCard({ icon:Icon, color, accent, title, tagline, points, illustration }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:'#fff', borderRadius:22, overflow:'hidden',
        border:`1px solid ${hov ? color+'30' : 'var(--border)'}`,
        boxShadow:hov ? `0 16px 48px ${color}18` : '0 2px 12px rgba(26,35,50,0.05)',
        transition:'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        transform:hov ? 'translateY(-6px)' : 'none',
        cursor:'default',
      }}
    >
      {/* Illustration band */}
      <div style={{ height:140, background:`linear-gradient(135deg, ${color}15, ${color}06)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        {illustration}
        <div style={{ position:'absolute', bottom:-1, left:0, right:0, height:32, background:'linear-gradient(to top, #fff, transparent)' }}/>
      </div>

      <div style={{ padding:'22px 24px 26px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:accent, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon size={18} color={color}/>
          </div>
          <div>
            <h3 style={{ fontFamily:'Lora,serif', fontSize:16, fontWeight:700, color:'var(--text-1)', margin:0 }}>{title}</h3>
            <p style={{ fontSize:11, color, margin:0, marginTop:2, fontWeight:600 }}>{tagline}</p>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {points.map((pt, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
              <div style={{ width:15, height:15, borderRadius:'50%', background:accent, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                <CheckCircle size={8} color={color}/>
              </div>
              <span style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.6 }}>{pt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── SVG Illustrations for feature cards ── */
function ChatIllustration({ color }) {
  return (
    <svg width="200" height="100" viewBox="0 0 200 100" style={{ position:'absolute' }}>
      <rect x="20" y="15" width="100" height="28" rx="14" fill={color} fillOpacity="0.12"/>
      <rect x="25" y="22" width="70" height="7" rx="3.5" fill={color} fillOpacity="0.35"/>
      <rect x="25" y="32" width="50" height="5" rx="2.5" fill={color} fillOpacity="0.2"/>
      <rect x="80" y="52" width="90" height="24" rx="12" fill={color} fillOpacity="0.18"/>
      <rect x="88" y="59" width="65" height="6" rx="3" fill={color} fillOpacity="0.35"/>
      <circle cx="16" cy="29" r="10" fill={color} fillOpacity="0.15"/>
      <circle cx="16" cy="29" r="6" fill={color} fillOpacity="0.25"/>
      {/* Heart */}
      <path d="M16,30 C16,28 14,26 12,28 C10,30 16,34 16,34 C16,34 22,30 20,28 C18,26 16,28 16,30Z" fill={color} fillOpacity="0.6"/>
    </svg>
  )
}
function ScanIllustration({ color }) {
  return (
    <svg width="200" height="110" viewBox="0 0 200 110" style={{ position:'absolute' }}>
      {/* Face outline */}
      <ellipse cx="100" cy="55" rx="38" ry="44" fill={color} fillOpacity="0.07" stroke={color} strokeOpacity="0.18" strokeWidth="1.5"/>
      {/* Eyes */}
      <ellipse cx="86" cy="44" rx="5" ry="6" fill={color} fillOpacity="0.30"/>
      <ellipse cx="114" cy="44" rx="5" ry="6" fill={color} fillOpacity="0.30"/>
      {/* Smile */}
      <path d="M84,65 Q100,76 116,65" stroke={color} strokeOpacity="0.4" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Corner scan frames */}
      {[[28,8],[148,8],[28,80],[148,80]].map(([x,y], i) => (
        <g key={i} transform={`translate(${x},${y}) rotate(${[0,90,270,180][i]})`}>
          <path d="M0,0 L12,0" stroke={color} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round"/>
          <path d="M0,0 L0,12" stroke={color} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round"/>
        </g>
      ))}
      {/* Scan line */}
      <line x1="50" y1="55" x2="150" y2="55" stroke={color} strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4,4"/>
    </svg>
  )
}
function AssessIllustration({ color }) {
  return (
    <svg width="200" height="110" viewBox="0 0 200 110" style={{ position:'absolute' }}>
      {/* Clipboard */}
      <rect x="60" y="12" width="80" height="88" rx="10" fill={color} fillOpacity="0.08" stroke={color} strokeOpacity="0.15" strokeWidth="1.5"/>
      <rect x="78" y="6" width="44" height="16" rx="8" fill={color} fillOpacity="0.2"/>
      {/* Lines with check marks */}
      {[30,46,62,78].map((y, i) => (
        <g key={i}>
          <circle cx="76" cy={y} r="5" fill={color} fillOpacity={i<2?0.4:0.15}/>
          {i<2 && <path d={`M73,${y} L75,${y+2} L79,${y-2}`} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>}
          <rect x="86" y={y-3} width={[44,36,44,28][i]} height="6" rx="3" fill={color} fillOpacity={0.18-i*0.03}/>
        </g>
      ))}
    </svg>
  )
}

const FEATURES = [
  { icon:MessageCircle, color:'#2A7D6F', accent:'rgba(42,125,111,0.09)', title:'AI Therapy Chat', tagline:'Always there for you', points:['Listens without judgment, 24/7','Adapts its tone to your mood in real time','Suggests grounding exercises when needed'], illustration:<ChatIllustration color="#2A7D6F"/> },
  { icon:Scan, color:'#C07436', accent:'rgba(192,116,54,0.09)', title:'Facial Emotion Detection', tagline:'Reads what words cannot say', points:['Instant analysis from your webcam or photo','Detects 7 distinct emotions accurately','No biometric data stored — fully private'], illustration:<ScanIllustration color="#C07436"/> },
  { icon:ClipboardList, color:'#3B6EA8', accent:'rgba(59,110,168,0.09)', title:'Clinical Screening', tagline:'Doctor-grade tools, simplified', points:['PHQ-9 depression & GAD-7 anxiety screeners','Results in plain language, not clinical jargon','Scores feed directly into your AI session'], illustration:<AssessIllustration color="#3B6EA8"/> },
]

export default function Landing({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive:true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ minHeight:'100vh', fontFamily:"'DM Sans',system-ui,sans-serif", overflowX:'hidden', background:'var(--bg-page)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        @keyframes orbFloat1  { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(3%,4%) scale(1.05)} 70%{transform:translate(-2%,2%) scale(0.96)} }
        @keyframes orbFloat2  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-4%,-3%)} }
        @keyframes orbFloat3  { 0%,100%{transform:translate(0,0) scale(1)} 60%{transform:translate(2%,-4%) scale(1.04)} }
        @keyframes petalFloat { 0%,100%{transform:translateY(0) rotate(var(--r,15deg)) scale(1)} 50%{transform:translateY(-18px) rotate(calc(var(--r,15deg) + 15deg)) scale(1.1)} }
        @keyframes floatCard  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes heroTitle  { from{opacity:0;transform:translateY(30px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes heroBadge  { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:none} }
        @keyframes heroSub    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes heroBtns   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes heroCard   { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes msgPop     { from{opacity:0;transform:translateY(8px) scale(0.96)} to{opacity:1;transform:none} }
        @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes scrollBob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }
        @keyframes shimmer    { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

        .cta-main {
          display:inline-flex; align-items:center; gap:9px;
          padding:14px 30px; border-radius:13px; border:none;
          background:linear-gradient(135deg,#1C3D35,#2A7D6F);
          color:#fff; font-size:15px; font-weight:700;
          cursor:pointer; font-family:inherit;
          box-shadow:0 6px 24px rgba(42,125,111,0.32);
          transition:all 0.22s;
        }
        .cta-main:hover { transform:translateY(-3px); box-shadow:0 12px 36px rgba(42,125,111,0.40); }

        .cta-ghost {
          display:inline-flex; align-items:center; gap:7px;
          padding:13px 24px; border-radius:13px;
          border:1.5px solid var(--border-md); background:rgba(255,255,255,0.8);
          color:var(--text-2); font-size:14px; font-weight:600;
          cursor:pointer; font-family:inherit; transition:all 0.18s;
          backdrop-filter:blur(8px);
        }
        .cta-ghost:hover { border-color:var(--teal); color:var(--teal); background:#fff; }

        .nav-link { color:var(--text-3); font-size:14px; font-weight:500; cursor:pointer; background:none; border:none; font-family:inherit; transition:color 0.16s; padding:4px 0; }
        .nav-link:hover { color:var(--teal); }

        .stat-item:hover .stat-num { color:var(--teal); }

        @media(max-width:860px) {
          .hero-grid { grid-template-columns:1fr !important; }
          .hero-card-col { display:none !important; }
          .feat-grid { grid-template-columns:1fr !important; }
          .ema-grid  { grid-template-columns:1fr !important; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter:scrolled ? 'blur(18px)' : 'none',
        borderBottom:scrolled ? '1px solid var(--border)' : '1px solid transparent',
        height:62, padding:'0 max(24px,5vw)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        transition:'all 0.35s ease',
        boxShadow:scrolled ? '0 2px 16px rgba(26,35,50,0.06)' : 'none',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:11, background:'linear-gradient(135deg,#1C3D35,#2A7D6F)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 12px rgba(42,125,111,0.30)' }}>
            <Heart size={15} color="#fff" fill="#fff"/>
          </div>
          <span style={{ fontFamily:'Lora,serif', fontWeight:700, fontSize:18, color:'var(--text-1)', letterSpacing:'-0.3px' }}>MindCare</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <button className="nav-link" onClick={onGetStarted}>Sign In</button>
          <button className="cta-main" onClick={onGetStarted} style={{ padding:'9px 20px', fontSize:13 }}>
            Get Started <ArrowRight size={13}/>
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position:'relative', minHeight:'92vh', display:'flex', alignItems:'center', overflow:'hidden' }}>
        <NatureBg/>
        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:1140, margin:'0 auto', padding:'64px max(24px,5vw) 72px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'center' }} className="hero-grid">

          {/* Text */}
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:99, background:'rgba(42,125,111,0.10)', border:'1px solid rgba(42,125,111,0.22)', marginBottom:26, animation:'heroBadge 0.6s ease both' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--teal)', animation:'pulse 2s infinite' }}/>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--teal)', letterSpacing:'0.07em' }}>AI-POWERED MENTAL WELLNESS</span>
              <Star size={10} color="var(--teal)" fill="var(--teal)"/>
            </div>

            <h1 style={{ fontFamily:'Lora,serif', fontSize:'clamp(32px,4.8vw,58px)', fontWeight:700, color:'var(--text-1)', lineHeight:1.12, margin:'0 0 12px', letterSpacing:'-0.5px', animation:'heroTitle 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}>
              Your mind deserves
            </h1>
            <h1 style={{ fontFamily:'Lora,serif', fontSize:'clamp(32px,4.8vw,58px)', fontWeight:700, lineHeight:1.12, margin:'0 0 22px', letterSpacing:'-0.5px', animation:'heroTitle 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both' }}>
              to feel{' '}
              <WordCycle words={['understood.', 'supported.', 'peaceful.', 'heard.', 'better.']}/>
            </h1>

            <p style={{ fontSize:'clamp(14px,1.8vw,17px)', color:'var(--text-3)', lineHeight:1.78, maxWidth:480, margin:'0 0 34px', animation:'heroSub 0.7s ease 0.35s both' }}>
              MindCare blends facial emotion AI, clinical assessments, and adaptive therapy chat to give you a real, honest picture of your mental health — updated in real time.
            </p>

            <div style={{ display:'flex', gap:13, flexWrap:'wrap', animation:'heroBtns 0.6s ease 0.5s both' }}>
              <button className="cta-main" onClick={onGetStarted}>
                Start for Free <ArrowRight size={15}/>
              </button>
              <button className="cta-ghost" onClick={onGetStarted}>
                Sign In
              </button>
            </div>

            <div style={{ display:'flex', gap:22, marginTop:30, flexWrap:'wrap', animation:'heroBtns 0.6s ease 0.65s both' }}>
              {[{ icon:Shield, label:'100% Private' },{ icon:Zap, label:'Real-time AI' },{ icon:CheckCircle, label:'Free forever' }].map(({ icon:Icon, label }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-4)', fontWeight:500 }}>
                  <Icon size={13} color="var(--teal)"/> {label}
                </div>
              ))}
            </div>
          </div>

          {/* App preview */}
          <div className="hero-card-col" style={{ animation:'heroCard 0.8s cubic-bezier(0.22,1,0.36,1) 0.3s both' }}>
            <AppPreview/>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:6, animation:'scrollBob 2s ease-in-out infinite' }}>
          <span style={{ fontSize:10, color:'var(--text-4)', fontWeight:500, letterSpacing:'0.06em' }}>SCROLL</span>
          <ChevronDown size={16} color="var(--text-4)"/>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(16px)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:'26px max(24px,5vw)', display:'flex', justifyContent:'space-around', flexWrap:'wrap', gap:16 }}>
          {[
            { value:7, suffix:'', label:'Emotions detected', icon:Smile, color:'#2A7D6F' },
            { value:2, suffix:'', label:'Clinical tools (PHQ-9 & GAD-7)', icon:ClipboardList, color:'#3B6EA8' },
            { value:100, suffix:'%', label:'Private — nothing stored', icon:Shield, color:'#C07436' },
            { value:24, suffix:'/7', label:'AI always available', icon:Brain, color:'#7B5EA8' },
          ].map(({ value, suffix, label, icon:Icon, color }) => (
            <Reveal key={label}>
              <div className="stat-item" style={{ display:'flex', alignItems:'center', gap:11, cursor:'default' }}>
                <div style={{ width:38, height:38, borderRadius:11, background:`${color}10`, border:`1px solid ${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={16} color={color}/>
                </div>
                <div>
                  <div className="stat-num" style={{ fontSize:24, fontWeight:800, color:'var(--text-1)', lineHeight:1, fontFamily:'Lora,serif', transition:'color 0.2s' }}>
                    <Counter target={value}/>{suffix}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-4)', marginTop:2, fontWeight:500 }}>{label}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth:1080, margin:'0 auto', padding:'80px max(24px,5vw)' }}>
        <Reveal>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--teal)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:12 }}>WHAT MINDCARE DOES</p>
            <h2 style={{ fontFamily:'Lora,serif', fontSize:'clamp(24px,3.5vw,40px)', fontWeight:700, color:'var(--text-1)', margin:'0 0 14px', letterSpacing:'-0.3px' }}>
              Three tools. One complete picture.
            </h2>
            <p style={{ fontSize:15, color:'var(--text-3)', maxWidth:420, margin:'0 auto', lineHeight:1.7 }}>
              Everything needed to understand your mental wellbeing — clearly and compassionately.
            </p>
          </div>
        </Reveal>

        <div className="feat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:22 }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <FeatureCard {...f}/>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── HOW EMA WORKS ── */}
      <section style={{ background:'linear-gradient(160deg,#F0FAF5 0%,#F8F6F2 60%,#EDF5FF 100%)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'80px max(24px,5vw)' }}>
        <div style={{ maxWidth:980, margin:'0 auto' }}>
          <div className="ema-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'start' }}>

            <Reveal>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--teal)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:14 }}>HOW WE TRACK YOUR MOOD</p>
                <h2 style={{ fontFamily:'Lora,serif', fontSize:'clamp(22px,3vw,36px)', fontWeight:700, color:'var(--text-1)', margin:'0 0 20px', lineHeight:1.2, letterSpacing:'-0.3px' }}>
                  Your emotional trajectory,<br/><em style={{ fontStyle:'italic', color:'var(--teal)' }}>not just a snapshot</em>
                </h2>
                <p style={{ fontSize:14.5, color:'var(--text-3)', lineHeight:1.78, marginBottom:20 }}>
                  A single day doesn't define you. MindCare uses an <strong style={{ color:'var(--text-2)' }}>Exponential Moving Average (EMA)</strong> — the same technique used in financial markets — to track your emotional trend over 72 hours.
                </p>
                <p style={{ fontSize:14.5, color:'var(--text-3)', lineHeight:1.78, marginBottom:30 }}>
                  Recent conversations weigh more than older ones, so your score always reflects <em>how you're doing right now</em> — not last week.
                </p>

                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {[
                    { range:'Trend improving', meaning:'AI is warm, affirming, and celebratory', color:'#2A7D6F', icon:TrendingUp },
                    { range:'Trend stable',    meaning:'AI offers steady, balanced support',    color:'#C07436',  icon:BarChart2 },
                    { range:'Trend declining', meaning:'AI is extra gentle and therapeutic',     color:'#3B6EA8',  icon:Activity },
                  ].map(e => (
                    <div key={e.range} style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 14px', borderRadius:12, background:`${e.color}08`, border:`1px solid ${e.color}18` }}>
                      <div style={{ width:30, height:30, borderRadius:9, background:`${e.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <e.icon size={13} color={e.color}/>
                      </div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:e.color }}>{e.range}</div>
                        <div style={{ fontSize:12, color:'var(--text-3)', marginTop:1 }}>{e.meaning}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Step cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { icon:MessageCircle, color:'#2A7D6F', step:'01', title:'You express yourself', desc:'Send a message. Our AI reads your emotional tone — joyful, calm, or struggling.' },
                { icon:Activity,      color:'#C07436', step:'02', title:'We calculate your trend', desc:'Each session is weighted. Recent feelings matter more — just like real life.' },
                { icon:TrendingUp,    color:'#3B6EA8', step:'03', title:'A clear direction emerges', desc:'Over days, a pattern appears: improving, stable, or needing extra care.' },
                { icon:Brain,         color:'#7B5EA8', step:'04', title:'AI responds accordingly', desc:'MindCare adjusts its style automatically — gentler when you struggle, uplifting when you thrive.' },
              ].map((s, i) => (
                <Reveal key={s.step} delay={i * 80}>
                  <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 6px rgba(26,35,50,0.04)', display:'flex', gap:14, alignItems:'flex-start' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0 }}>
                      <div style={{ width:34, height:34, borderRadius:10, background:`${s.color}12`, border:`1px solid ${s.color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <s.icon size={15} color={s.color}/>
                      </div>
                      {i < 3 && <div style={{ width:1, height:14, background:'var(--border)' }}/>}
                    </div>
                    <div style={{ paddingTop:2 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:9, fontWeight:800, color:s.color, letterSpacing:'0.1em' }}>STEP {s.step}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', fontFamily:'Lora,serif' }}>{s.title}</span>
                      </div>
                      <p style={{ fontSize:12.5, color:'var(--text-3)', lineHeight:1.62, margin:0 }}>{s.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding:'88px max(24px,5vw)' }}>
        <Reveal>
          <div style={{ maxWidth:660, margin:'0 auto', background:'linear-gradient(145deg,#fff,#F3F8F5)', border:'1px solid var(--border)', borderRadius:26, padding:'52px 44px', textAlign:'center', boxShadow:'0 8px 48px rgba(42,125,111,0.08), 0 2px 12px rgba(26,35,50,0.06)', position:'relative', overflow:'hidden' }}>
            {/* Background glow */}
            <div style={{ position:'absolute', top:'-30%', left:'20%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(42,125,111,0.08),transparent)', pointerEvents:'none' }}/>

            <div style={{ width:56, height:56, borderRadius:17, background:'linear-gradient(135deg,#1C3D35,#2A7D6F)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 22px', boxShadow:'0 8px 24px rgba(42,125,111,0.30)' }}>
              <Heart size={24} color="#fff" fill="#fff"/>
            </div>
            <h2 style={{ fontFamily:'Lora,serif', fontSize:'clamp(22px,3.5vw,32px)', fontWeight:700, color:'var(--text-1)', margin:'0 0 14px', letterSpacing:'-0.3px' }}>
              Ready to understand yourself better?
            </h2>
            <p style={{ fontSize:15, color:'var(--text-3)', marginBottom:32, lineHeight:1.72, maxWidth:400, margin:'0 auto 32px' }}>
              MindCare is free, private, and takes less than two minutes to begin. No credit card. No data sold. Ever.
            </p>
            <button className="cta-main" onClick={onGetStarted} style={{ fontSize:15, padding:'15px 34px' }}>
              Begin Your Journey <ArrowRight size={16}/>
            </button>
            <div style={{ display:'flex', justifyContent:'center', gap:22, marginTop:24, flexWrap:'wrap' }}>
              {['No credit card', 'Private & secure', 'Free forever'].map(t => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-4)', fontWeight:500 }}>
                  <CheckCircle size={11} color="var(--teal)"/> {t}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid var(--border)', padding:'20px max(24px,5vw)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, background:'rgba(255,255,255,0.6)', backdropFilter:'blur(8px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:24, height:24, borderRadius:7, background:'linear-gradient(135deg,#1C3D35,#2A7D6F)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Heart size={11} color="#fff" fill="#fff"/>
          </div>
          <span style={{ fontFamily:'Lora,serif', fontWeight:600, fontSize:14, color:'var(--text-2)' }}>MindCare</span>
        </div>
        <p style={{ fontSize:11, color:'var(--text-4)', margin:0 }}>© 2026 MindCare · Not a substitute for professional mental health care · Crisis: iCall 9152987821</p>
      </footer>
    </div>
  )
}