import { useEffect, useRef, useState } from 'react'
import {
  Heart, MessageCircle, Scan, ClipboardList, ArrowRight,
  TrendingUp, Shield, Brain, ChevronRight, Activity,
  CheckCircle, BarChart2, Smile, Zap
} from 'lucide-react'

/* ── Animated soft blobs background ── */
function BlobBg() {
  return (
    <div aria-hidden style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
      <div style={{ position:'absolute', top:'-10%', left:'-5%', width:'55vw', height:'55vw', maxWidth:700, maxHeight:700, borderRadius:'60% 40% 55% 45% / 50% 55% 45% 50%', background:'radial-gradient(ellipse,rgba(42,125,111,0.10) 0%,transparent 70%)', animation:'blobDrift1 18s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', top:'20%', right:'-8%', width:'45vw', height:'45vw', maxWidth:580, maxHeight:580, borderRadius:'45% 55% 40% 60% / 55% 40% 60% 45%', background:'radial-gradient(ellipse,rgba(192,116,54,0.07) 0%,transparent 70%)', animation:'blobDrift2 22s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', bottom:'-5%', left:'30%', width:'40vw', height:'40vw', maxWidth:500, maxHeight:500, borderRadius:'50% 50% 40% 60% / 40% 60% 50% 50%', background:'radial-gradient(ellipse,rgba(59,110,168,0.07) 0%,transparent 70%)', animation:'blobDrift3 25s ease-in-out infinite' }}/>
    </div>
  )
}

/* ── Thin horizontal rule with icon ── */
function Divider({ icon: Icon, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16, margin:'0 0 40px' }}>
      <div style={{ flex:1, height:1, background:'var(--border)' }}/>
      <div style={{ width:32, height:32, borderRadius:9, background:`${color}12`, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={14} color={color}/>
      </div>
      <div style={{ flex:1, height:1, background:'var(--border)' }}/>
    </div>
  )
}

/* ── Animated counter ── */
function Counter({ target, suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      const dur = 1400, start = Date.now()
      const tick = () => {
        const p = Math.min(1, (Date.now() - start) / dur)
        setVal(Math.round(p * p * target))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{val}{suffix}</span>
}

/* ── App preview mockup (pure SVG/HTML, no image needed) ── */
function AppMockup() {
  return (
    <div style={{ position:'relative', width:'100%', maxWidth:460, margin:'0 auto' }}>
      {/* Subtle shadow beneath */}
      <div style={{ position:'absolute', bottom:-20, left:'10%', right:'10%', height:40, borderRadius:'50%', background:'rgba(26,35,50,0.08)', filter:'blur(20px)' }}/>
      {/* Phone frame */}
      <div style={{
        background:'#fff', borderRadius:28, border:'1px solid var(--border)',
        boxShadow:'0 20px 60px rgba(26,35,50,0.12), 0 4px 16px rgba(26,35,50,0.06)',
        overflow:'hidden', animation:'floatCard 6s ease-in-out infinite'
      }}>
        {/* Top bar */}
        <div style={{ background:'linear-gradient(135deg,#1C3D35,#2A7D6F)', padding:'16px 18px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Heart size={13} color="#fff" fill="#fff"/>
          </div>
          <span style={{ color:'#fff', fontWeight:700, fontSize:14, fontFamily:'Lora,serif' }}>MindCare</span>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:99, background:'rgba(255,255,255,0.15)' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#6EE7B7', animation:'pulse 2s infinite' }}/>
            <span style={{ color:'rgba(255,255,255,0.9)', fontSize:10, fontWeight:600 }}>Live</span>
          </div>
        </div>

        {/* Risk score row */}
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', gap:10 }}>
          {[
            { label:'Risk Level', value:'Low', color:'#2A7D6F', bg:'rgba(42,125,111,0.10)', icon:Shield },
            { label:'Emotion', value:'Happy', color:'#C07436', bg:'rgba(192,116,54,0.10)', icon:Smile },
            { label:'Trend', value:'↑ Rising', color:'#3B6EA8', bg:'rgba(59,110,168,0.10)', icon:TrendingUp },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} style={{ flex:1, padding:'10px 8px', borderRadius:10, background:bg, textAlign:'center' }}>
              <Icon size={12} color={color} style={{ marginBottom:4 }}/>
              <div style={{ fontSize:11, fontWeight:800, color, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:9, color:'var(--text-4)', marginTop:2, fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Chat messages */}
        <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
            <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#2A7D6F,#38A594)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Heart size={11} color="#fff" fill="#fff"/>
            </div>
            <div style={{ background:'var(--bg-elevated)', borderRadius:'10px 10px 10px 3px', padding:'9px 12px', maxWidth:'80%' }}>
              <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.5 }}>
                I can see you're feeling positive today. Your trajectory has been improving this week.
              </p>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <div style={{ background:'linear-gradient(135deg,#2A7D6F,#38A594)', borderRadius:'10px 10px 3px 10px', padding:'9px 12px', maxWidth:'75%' }}>
              <p style={{ fontSize:12, color:'#fff', margin:0, lineHeight:1.5 }}>
                Thank you, the exercises really helped me today.
              </p>
            </div>
          </div>
        </div>

        {/* EMA mini chart */}
        <div style={{ padding:'0 18px 16px' }}>
          <div style={{ background:'var(--bg-elevated)', borderRadius:10, padding:'10px 12px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.06em' }}>EMA Trajectory</span>
              <span style={{ fontSize:10, fontWeight:700, color:'#2A7D6F' }}>Improving ↑</span>
            </div>
            <svg width="100%" height="36" viewBox="0 0 200 36">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2A7D6F" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="#2A7D6F" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0,30 C30,28 50,26 70,22 C90,18 110,16 130,13 C150,10 170,8 200,6" fill="none" stroke="#2A7D6F" strokeWidth="2" strokeLinecap="round"/>
              <path d="M0,30 C30,28 50,26 70,22 C90,18 110,16 130,13 C150,10 170,8 200,6 L200,36 L0,36 Z" fill="url(#lineGrad)"/>
              <circle cx="200" cy="6" r="3.5" fill="#2A7D6F"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  {
    icon: MessageCircle,
    color: '#2A7D6F',
    accent: 'rgba(42,125,111,0.10)',
    title: 'AI Therapy Chat',
    tagline: 'Always there for you',
    points: [
      'Listens without judgment, 24/7',
      'Adapts its tone to your mood',
      'Suggests exercises when you need them',
    ],
  },
  {
    icon: Scan,
    color: '#C07436',
    accent: 'rgba(192,116,54,0.10)',
    title: 'Facial Emotion Detection',
    tagline: 'Reads what words cannot say',
    points: [
      'Instant analysis from your webcam',
      'Detects 7 distinct emotions accurately',
      'No data stored — fully private',
    ],
  },
  {
    icon: ClipboardList,
    color: '#3B6EA8',
    accent: 'rgba(59,110,168,0.10)',
    title: 'Clinical Screening',
    tagline: 'Doctor-grade tools, simplified',
    points: [
      'PHQ-9 (depression) & GAD-7 (anxiety)',
      'Results explained in plain language',
      'No scores — just clear guidance',
    ],
  },
]

const EMA_STEPS = [
  { icon: MessageCircle, color: '#2A7D6F', step:'01', title: 'You express yourself', desc: 'Send a message. Our AI reads the emotional tone — positive, neutral, or difficult.' },
  { icon: Activity,      color: '#C07436', step:'02', title: 'We calculate your trend', desc: 'Each session is weighted. Recent feelings matter more than older ones — just like real life.' },
  { icon: TrendingUp,    color: '#3B6EA8', step:'03', title: 'A trend emerges', desc: 'Over days, a clear direction appears: improving, stable, or needing attention.' },
  { icon: Brain,         color: '#7B5EA8', step:'04', title: 'AI responds accordingly', desc: 'MindCare automatically adjusts its support style — gentler when you\'re struggling, celebratory when you\'re thriving.' },
]

export default function Landing({ onGetStarted }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-page)', fontFamily:"'DM Sans',system-ui,sans-serif", overflowX:'hidden' }}>
      <style>{`
        @keyframes blobDrift1 { 0%,100%{border-radius:60% 40% 55% 45%/50% 55% 45% 50%;transform:translate(0,0) scale(1)} 33%{border-radius:50% 50% 45% 55%/55% 45% 55% 45%;transform:translate(2%,3%) scale(1.03)} 66%{border-radius:55% 45% 60% 40%/45% 60% 40% 55%;transform:translate(-2%,1%) scale(0.97)} }
        @keyframes blobDrift2 { 0%,100%{border-radius:45% 55% 40% 60%/55% 40% 60% 45%;transform:translate(0,0)} 50%{border-radius:55% 45% 55% 45%/45% 55% 45% 55%;transform:translate(-3%,-2%)} }
        @keyframes blobDrift3 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(2%,-3%) scale(1.04)} 80%{transform:translate(-1%,2%) scale(0.96)} }
        @keyframes floatCard  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeSlideUp{ from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes lineGrow   { from{stroke-dashoffset:400} to{stroke-dashoffset:0} }

        .nav-link { color:var(--text-3); font-size:14px; font-weight:500; cursor:pointer; background:none; border:none; font-family:inherit; padding:4px 0; transition:color 0.18s; }
        .nav-link:hover { color:var(--teal); }
        .cta-primary { display:inline-flex;align-items:center;gap:9px;padding:13px 28px;border-radius:12px;border:none;background:linear-gradient(135deg,#1C3D35,#2A7D6F);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 18px rgba(42,125,111,0.28);transition:all 0.2s; }
        .cta-primary:hover { transform:translateY(-2px);box-shadow:0 8px 28px rgba(42,125,111,0.38); }
        .cta-secondary { display:inline-flex;align-items:center;gap:7px;padding:12px 22px;border-radius:12px;border:1.5px solid var(--border-md);background:var(--bg-card);color:var(--text-2);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.18s; }
        .cta-secondary:hover { border-color:var(--teal);color:var(--teal); }
        .feat-card { background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:28px;box-shadow:0 2px 12px rgba(26,35,50,0.05);transition:all 0.25s;cursor:default; }
        .feat-card:hover { transform:translateY(-4px);box-shadow:0 12px 40px rgba(26,35,50,0.10); }
        .step-card { background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:22px;box-shadow:0 1px 6px rgba(26,35,50,0.04); }
        .a1 { animation:fadeSlideUp 0.5s ease 0.0s both; }
        .a2 { animation:fadeSlideUp 0.5s ease 0.1s both; }
        .a3 { animation:fadeSlideUp 0.5s ease 0.2s both; }
        .a4 { animation:fadeSlideUp 0.5s ease 0.3s both; }
        .a5 { animation:fadeSlideUp 0.5s ease 0.4s both; }
      `}</style>

      {/* ── NAVIGATION ── */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(243,241,237,0.92)', backdropFilter:'blur(16px)',
        borderBottom:'1px solid var(--border)',
        height:58, padding:'0 max(24px, 5vw)',
        display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#1C3D35,#2A7D6F)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 12px rgba(42,125,111,0.28)' }}>
            <Heart size={15} color="#fff" fill="#fff"/>
          </div>
          <span style={{ fontFamily:'Lora,serif', fontWeight:700, fontSize:17, color:'var(--text-1)', letterSpacing:'-0.2px' }}>MindCare</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <button className="nav-link" onClick={onGetStarted}>Sign In</button>
          <button className="cta-primary" onClick={onGetStarted} style={{ padding:'9px 18px', fontSize:13 }}>
            Get Started <ArrowRight size={13}/>
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position:'relative', overflow:'hidden', background:'linear-gradient(170deg,#FFFFFF 0%,#F3F8F6 40%,#F8F4EE 100%)', minHeight:'88vh', display:'flex', alignItems:'center' }}>
        <BlobBg/>
        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:1100, margin:'0 auto', padding:'60px max(24px,5vw)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center' }}>

          {/* Left text */}
          <div>
            <div className="a1" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 12px', borderRadius:99, background:'rgba(42,125,111,0.08)', border:'1px solid rgba(42,125,111,0.20)', marginBottom:22 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--teal)', animation:'pulse 2s infinite' }}/>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--teal)', letterSpacing:'0.06em' }}>AI-POWERED MENTAL WELLNESS</span>
            </div>

            <h1 className="a2" style={{ fontFamily:'Lora,serif', fontSize:'clamp(30px,4.5vw,54px)', fontWeight:700, color:'var(--text-1)', lineHeight:1.15, margin:'0 0 18px', letterSpacing:'-0.5px' }}>
              Understanding your mind<br/>
              <span style={{ color:'var(--teal)' }}>starts here.</span>
            </h1>

            <p className="a3" style={{ fontSize:'clamp(14px,1.8vw,17px)', color:'var(--text-3)', lineHeight:1.75, maxWidth:460, margin:'0 0 32px' }}>
              MindCare uses facial emotion detection, clinical assessments, and adaptive AI therapy to give you a clear, honest picture of your mental health — updated in real time.
            </p>

            <div className="a4" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button className="cta-primary" onClick={onGetStarted}>
                Start for Free <ArrowRight size={15}/>
              </button>
              <button className="cta-secondary" onClick={onGetStarted}>
                Sign In
              </button>
            </div>

            {/* Trust indicators */}
            <div className="a5" style={{ display:'flex', gap:20, marginTop:28, flexWrap:'wrap' }}>
              {[
                { icon:Shield, label:'Private & secure' },
                { icon:Zap,    label:'Real-time analysis' },
                { icon:CheckCircle, label:'Free to use' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-4)', fontWeight:500 }}>
                  <Icon size={13} color="var(--teal)"/> {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right — App mockup */}
          <div className="a4" style={{ display:'flex', justifyContent:'center' }}>
            <AppMockup/>
          </div>
        </div>

        {/* Responsive mobile stack override */}
        <style>{`@media(max-width:720px){
          section:first-of-type > div { grid-template-columns:1fr !important; }
          section:first-of-type > div > div:last-child { display:none; }
        }`}</style>
      </section>

      {/* ── STATS STRIP ── */}
      <div style={{ background:'var(--bg-card)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:'28px max(24px,5vw)', display:'flex', justifyContent:'space-around', flexWrap:'wrap', gap:20 }}>
          {[
            { value:7,    suffix:'',   label:'Emotion classes detected',   icon:Smile,     color:'#2A7D6F' },
            { value:2,    suffix:'',   label:'Clinical screening tools',    icon:ClipboardList, color:'#3B6EA8' },
            { value:100,  suffix:'%',  label:'Cloud-based, no data stored', icon:Shield,    color:'#C07436' },
            { value:24,   suffix:'/7', label:'AI available round the clock', icon:Brain,    color:'#7B5EA8' },
          ].map(({ value, suffix, label, icon: Icon, color }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${color}10`, border:`1px solid ${color}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={16} color={color}/>
              </div>
              <div>
                <p style={{ fontSize:22, fontWeight:800, color:'var(--text-1)', margin:0, fontFamily:'Lora,serif', lineHeight:1 }}>
                  <Counter target={value}/>{suffix}
                </p>
                <p style={{ fontSize:11, color:'var(--text-4)', margin:0, marginTop:2, fontWeight:500 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth:1060, margin:'0 auto', padding:'72px max(24px,5vw)' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--teal)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:12 }}>WHAT MINDCARE DOES</p>
          <h2 style={{ fontFamily:'Lora,serif', fontSize:'clamp(24px,3.5vw,38px)', fontWeight:700, color:'var(--text-1)', margin:'0 0 14px', letterSpacing:'-0.3px' }}>
            Three tools. One complete picture.
          </h2>
          <p style={{ fontSize:15, color:'var(--text-3)', maxWidth:440, margin:'0 auto', lineHeight:1.7 }}>
            Everything needed to understand your mental wellbeing — clearly and honestly.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))', gap:20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="feat-card">
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
                <div style={{ width:44, height:44, borderRadius:13, background:f.accent, border:`1px solid ${f.color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <f.icon size={20} color={f.color}/>
                </div>
                <div>
                  <h3 style={{ fontFamily:'Lora,serif', fontSize:16, fontWeight:700, color:'var(--text-1)', margin:0, lineHeight:1.2 }}>{f.title}</h3>
                  <p style={{ fontSize:12, color:f.color, margin:0, marginTop:3, fontWeight:600 }}>{f.tagline}</p>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {f.points.map((pt, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
                    <div style={{ width:16, height:16, borderRadius:'50%', background:f.accent, border:`1px solid ${f.color}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                      <CheckCircle size={9} color={f.color}/>
                    </div>
                    <span style={{ fontSize:13.5, color:'var(--text-3)', lineHeight:1.6 }}>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EMA EXPLAINED ── */}
      <section style={{ background:'var(--bg-card)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'72px max(24px,5vw)' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:52, alignItems:'start' }}>

            {/* Left — explanation */}
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--teal)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:12 }}>HOW WE TRACK YOUR MOOD</p>
              <h2 style={{ fontFamily:'Lora,serif', fontSize:'clamp(22px,3vw,34px)', fontWeight:700, color:'var(--text-1)', margin:'0 0 18px', letterSpacing:'-0.3px', lineHeight:1.2 }}>
                Your emotional trajectory, not just a snapshot
              </h2>
              <p style={{ fontSize:15, color:'var(--text-3)', lineHeight:1.75, marginBottom:24 }}>
                A single day doesn't define you. MindCare uses an <strong style={{ color:'var(--text-2)' }}>Exponential Moving Average (EMA)</strong> — the same method used in financial markets — to track your emotional trend over 72 hours.
              </p>
              <p style={{ fontSize:15, color:'var(--text-3)', lineHeight:1.75, marginBottom:28 }}>
                Recent conversations carry more weight than older ones, so your score always reflects <em>how you're doing now</em>, not just how you were last week.
              </p>

              {/* EMA value guide */}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { range:'EMA above 0%',  meaning:'Trending positive — AI is warm and affirming',       color:'#2A7D6F', icon:TrendingUp },
                  { range:'EMA near 0%',   meaning:'Stable — AI offers steady, balanced support',         color:'#C07436', icon:BarChart2 },
                  { range:'EMA below 0%',  meaning:'Trending low — AI is extra gentle and therapeutic',   color:'#3B6EA8', icon:Activity },
                ].map(e => (
                  <div key={e.range} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:`${e.color}08`, border:`1px solid ${e.color}18` }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:`${e.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <e.icon size={14} color={e.color}/>
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:e.color }}>{e.range}</div>
                      <div style={{ fontSize:12, color:'var(--text-3)', marginTop:1 }}>{e.meaning}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — step cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {EMA_STEPS.map((s, i) => (
                <div key={s.step} className="step-card">
                  <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:`${s.color}12`, border:`1px solid ${s.color}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <s.icon size={16} color={s.color}/>
                      </div>
                      {i < EMA_STEPS.length - 1 && (
                        <div style={{ width:1, height:16, background:'var(--border)' }}/>
                      )}
                    </div>
                    <div style={{ paddingTop:3 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:9, fontWeight:800, color:s.color, letterSpacing:'0.08em' }}>STEP {s.step}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', fontFamily:'Lora,serif' }}>{s.title}</span>
                      </div>
                      <p style={{ fontSize:12.5, color:'var(--text-3)', lineHeight:1.6, margin:0 }}>{s.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <style>{`@media(max-width:720px){ section:nth-of-type(2) > div > div { grid-template-columns:1fr!important; } }`}</style>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ maxWidth:680, margin:'0 auto', padding:'80px max(24px,5vw)' }}>
        <div style={{ background:'linear-gradient(145deg,#fff,var(--bg-elevated))', border:'1px solid var(--border)', borderRadius:24, padding:'48px 40px', textAlign:'center', boxShadow:'0 4px 32px rgba(26,35,50,0.07)' }}>
          <div style={{ width:52, height:52, borderRadius:15, background:'linear-gradient(135deg,#1C3D35,#2A7D6F)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 6px 20px rgba(42,125,111,0.28)' }}>
            <Heart size={22} color="#fff" fill="#fff"/>
          </div>
          <h2 style={{ fontFamily:'Lora,serif', fontSize:'clamp(20px,3.5vw,30px)', fontWeight:700, color:'var(--text-1)', margin:'0 0 14px', letterSpacing:'-0.3px' }}>
            Ready to understand yourself better?
          </h2>
          <p style={{ fontSize:15, color:'var(--text-3)', marginBottom:30, lineHeight:1.7, maxWidth:420, margin:'0 auto 30px' }}>
            MindCare is free, private, and takes less than 2 minutes to get started.
          </p>
          <button className="cta-primary" onClick={onGetStarted} style={{ fontSize:15, padding:'14px 32px' }}>
            Get Started Free <ChevronRight size={16}/>
          </button>
          <div style={{ display:'flex', justifyContent:'center', gap:24, marginTop:22, flexWrap:'wrap' }}>
            {['No credit card', 'Private & secure', 'Free forever'].map(t => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-4)', fontWeight:500 }}>
                <CheckCircle size={12} color="var(--teal)"/> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid var(--border)', padding:'18px max(24px,5vw)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, background:'var(--bg-card)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,#1C3D35,#2A7D6F)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Heart size={10} color="#fff" fill="#fff"/>
          </div>
          <span style={{ fontFamily:'Lora,serif', fontWeight:600, fontSize:13, color:'var(--text-2)' }}>MindCare</span>
        </div>
        <p style={{ fontSize:11, color:'var(--text-4)', margin:0 }}>
          © 2026 MindCare · Not a substitute for professional mental health care
        </p>
      </footer>
    </div>
  )
}