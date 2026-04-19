import { useEffect, useRef, useState } from 'react'
import {
  Heart, MessageCircle, ArrowRight,
  TrendingUp, Shield, Brain, Activity, CheckCircle,
  BarChart2, Zap, ChevronDown,
  Youtube, Linkedin, Instagram, Phone, ExternalLink,
  Smile, ClipboardList
} from 'lucide-react'

/* ── Scroll reveal ── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect() }
    }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, vis]
}

function Reveal({ children, delay = 0, from = 'bottom', className = '' }) {
  const [ref, vis] = useReveal()
  const transforms = {
    bottom: 'translateY(32px)', left: 'translateX(-40px)',
    right:  'translateX(40px)', top:  'translateY(-20px)',
  }
  return (
    <div ref={ref} className={className} style={{
      opacity:   vis ? 1 : 0,
      transform: vis ? 'none' : (transforms[from] || transforms.bottom),
      transition:`opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

/* ── Minimal page background ── */
function PageBg() {
  return (
    <div aria-hidden style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      <div style={{ position:'absolute', inset:0, background:'#F5F3EF' }}/>
      <div style={{ position:'absolute', top:'-8%', right:'-4%', width:520, height:520, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(42,125,111,0.08) 0%,transparent 68%)' }}/>
      <div style={{ position:'absolute', bottom:'-6%', left:'-3%', width:440, height:440, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(59,110,168,0.06) 0%,transparent 68%)' }}/>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.03 }}>
        <defs>
          <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#2A7D6F"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)"/>
      </svg>
    </div>
  )
}

/* ── App chat preview — zero emojis ── */
function AppPreview() {
  const msgs = [
    { role:'ai',   text:"I notice things feel heavier today. That's okay — you don't have to have it all figured out." },
    { role:'user', text:"Work has been really draining. I can't seem to switch off." },
    { role:'ai',   text:"That makes a lot of sense. Let's try a 4-7-8 breath — it genuinely takes the edge off." },
  ]
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (shown >= msgs.length) return
    const t = setTimeout(() => setShown(s => s + 1), shown === 0 ? 800 : 1600)
    return () => clearTimeout(t)
  }, [shown])

  const moodItems = [
    { label:'Risk',  value:'Low',    color:'#2A7D6F', Icon: Shield      },
    { label:'Mood',  value:'Calm',   color:'#3B6EA8', Icon: Smile       },
    { label:'Trend', value:'Rising', color:'#C07436', Icon: TrendingUp  },
  ]

  return (
    <div style={{ background:'#fff', borderRadius:22, overflow:'hidden', boxShadow:'0 24px 64px rgba(26,35,50,0.11),0 4px 16px rgba(26,35,50,0.05)', border:'1px solid rgba(232,228,220,0.8)', animation:'floatCard 8s ease-in-out infinite' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1C3D35,#2A7D6F)', padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.16)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Heart size={14} color="#fff" fill="#fff"/>
        </div>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:14, fontFamily:'Lora,serif' }}>MindCare</div>
          <div style={{ color:'rgba(255,255,255,0.55)', fontSize:10, marginTop:1 }}>Session active</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99, background:'rgba(255,255,255,0.12)' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#6EE7B7', animation:'pulse 2s infinite' }}/>
          <span style={{ color:'rgba(255,255,255,0.9)', fontSize:10, fontWeight:600 }}>Live</span>
        </div>
      </div>

      {/* Mood strip — icons, no emojis */}
      <div style={{ display:'flex', gap:6, padding:'10px 16px', background:'#F9F8F6', borderBottom:'1px solid #EDEBE8' }}>
        {moodItems.map(({ label, value, color, Icon }) => (
          <div key={label} style={{ flex:1, display:'flex', alignItems:'center', gap:6, padding:'7px 10px', borderRadius:9, background:`${color}08`, border:`1px solid ${color}18` }}>
            <Icon size={11} color={color}/>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color }}>{value}</div>
              <div style={{ fontSize:9, color:'#9CA3AF' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10, minHeight:152 }}>
        {msgs.slice(0, shown).map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', animation:'msgPop 0.36s cubic-bezier(0.34,1.4,0.64,1) both' }}>
            {m.role==='ai' && (
              <div style={{ width:24, height:24, borderRadius:7, background:'linear-gradient(135deg,#2A7D6F,#38A594)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginRight:7, marginTop:2 }}>
                <Heart size={10} color="#fff" fill="#fff"/>
              </div>
            )}
            <div style={{ maxWidth:'78%', padding:'9px 13px', borderRadius:m.role==='user'?'12px 12px 3px 12px':'12px 12px 12px 3px', background:m.role==='user'?'linear-gradient(135deg,#2A7D6F,#38A594)':'#F0EDE8', fontSize:12, color:m.role==='user'?'#fff':'#374151', lineHeight:1.58 }}>
              {m.text}
            </div>
          </div>
        ))}
        {shown < msgs.length && (
          <div style={{ display:'flex', gap:4, paddingLeft:31 }}>
            {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:'50%', background:'#2A7D6F', animation:`typingBounce 1.4s ease-in-out ${i*0.18}s infinite` }}/>)}
          </div>
        )}
      </div>

      {/* Sparkline */}
      <div style={{ margin:'0 16px 16px', padding:'10px 12px', background:'#F9F8F6', borderRadius:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:9, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.07em' }}>72h Trend</span>
          <span style={{ fontSize:10, fontWeight:700, color:'#2A7D6F' }}>Improving ↑</span>
        </div>
        <svg width="100%" height="28" viewBox="0 0 220 28">
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2A7D6F" stopOpacity="0.20"/>
              <stop offset="100%" stopColor="#2A7D6F" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M0,25 C40,23 65,21 90,16 C115,11 148,8 175,5 C195,3 210,2 220,1" fill="none" stroke="#2A7D6F" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M0,25 C40,23 65,21 90,16 C115,11 148,8 175,5 C195,3 210,2 220,1 L220,28 L0,28Z" fill="url(#cg)"/>
          <circle cx="220" cy="1" r="3.5" fill="#2A7D6F"/>
          <circle cx="220" cy="1" r="6.5" fill="rgba(42,125,111,0.18)"/>
        </svg>
      </div>
    </div>
  )
}

/* ── Feature card ── */
function FeatureCard({ color, accent, title, tagline, points, imgSrc, imgAlt, from }) {
  const [ref, vis] = useReveal(0.08)
  const [hov, setHov] = useState(false)
  return (
    <div ref={ref} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background:'#fff', borderRadius:20, overflow:'hidden',
      border:`1px solid ${hov ? color+'30' : '#E8E4DC'}`,
      boxShadow: hov ? `0 16px 48px ${color}15,0 4px 14px rgba(26,35,50,0.05)` : '0 2px 12px rgba(26,35,50,0.05)',
      transition:'all 0.3s cubic-bezier(0.22,1,0.36,1)',
      transform: vis ? (hov ? 'translateY(-6px)' : 'translateY(0)') : (from==='left' ? 'translateX(-40px)' : 'translateX(40px)'),
      opacity: vis ? 1 : 0,
    }}>
      <div style={{ height:176, overflow:'hidden', position:'relative' }}>
        <img src={imgSrc} alt={imgAlt} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s ease', transform:hov?'scale(1.05)':'scale(1)' }}/>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.08) 100%)' }}/>
        <div style={{ position:'absolute', top:12, left:12, padding:'4px 10px', borderRadius:99, background:'rgba(255,255,255,0.90)', backdropFilter:'blur(8px)', fontSize:10, fontWeight:700, color, border:`1px solid ${color}20` }}>{tagline}</div>
      </div>
      <div style={{ padding:'20px 22px 24px' }}>
        <h3 style={{ fontFamily:'Lora,serif', fontSize:17, fontWeight:700, color:'#1A2332', margin:'0 0 14px', letterSpacing:'-0.2px' }}>{title}</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
          {points.map((pt, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
              <CheckCircle size={13} color={color} style={{ flexShrink:0, marginTop:2 }}/>
              <span style={{ fontSize:13, color:'#6B7280', lineHeight:1.62 }}>{pt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Step card ── */
function StepCard({ icon:Icon, color, step, title, desc, delay, isLast }) {
  const [ref, vis] = useReveal(0.1)
  const [hov, setHov] = useState(false)
  return (
    <div ref={ref} style={{ position:'relative', opacity:vis?1:0, transform:vis?'none':'translateX(40px)', transition:`opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms` }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ background:'#fff', border:`1.5px solid ${hov?color+'35':'#E8E4DC'}`, borderRadius:14, padding:'18px 20px', boxShadow:hov?`0 10px 32px ${color}12`:'0 2px 10px rgba(26,35,50,0.04)', display:'flex', gap:14, alignItems:'flex-start', transition:'all 0.26s cubic-bezier(0.22,1,0.36,1)', transform:hov?'translateX(3px)':'none' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:`${color}10`, border:`1.5px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <Icon size={16} color={color}/>
            <div style={{ position:'absolute', top:-7, right:-7, width:18, height:18, borderRadius:'50%', background:`linear-gradient(135deg,${color},${color}cc)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:900, color:'#fff', border:'2px solid #F5F3EF' }}>{step}</div>
          </div>
          {!isLast && <div style={{ width:1.5, height:22, marginTop:4, background:`linear-gradient(to bottom,${color}30,transparent)` }}/>}
        </div>
        <div style={{ paddingTop:2 }}>
          <h4 style={{ fontSize:13.5, fontWeight:700, color:'#1A2332', margin:'0 0 5px', fontFamily:'Lora,serif' }}>{title}</h4>
          <p style={{ fontSize:12.5, color:'#6B7280', lineHeight:1.66, margin:0 }}>{desc}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Static data ── */
const FEATURES = [
  {
    color:'#2A7D6F', accent:'rgba(42,125,111,0.08)',
    title:'AI Therapy Chat', tagline:'Always listening',
    imgSrc:'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=600&q=80&auto=format&fit=crop',
    imgAlt:'Person in a calm, supported conversation',
    points:['Responds to how you actually feel, not just what you type','Adapts its tone — gentle when you struggle, uplifting when you thrive','Grounding exercises available any time, day or night'],
    from:'left',
  },
  {
    color:'#C07436', accent:'rgba(192,116,54,0.08)',
    title:'Facial Emotion Detection', tagline:'Reads what words miss',
    imgSrc:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80&auto=format&fit=crop',
    imgAlt:'Person with a natural, calm expression',
    points:['Instant read from your webcam or a photo','Recognises 7 distinct emotional states','No biometric data stored — ever'],
    from:'right',
  },
  {
    color:'#3B6EA8', accent:'rgba(59,110,168,0.08)',
    title:'Clinical Screening', tagline:'Doctor-grade, simplified',
    imgSrc:'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80&auto=format&fit=crop',
    imgAlt:'Calm wellness and mental health setting',
    points:['PHQ-9 and GAD-7 validated screeners','Results in plain language, not clinical jargon','Scores feed directly into your AI session context'],
    from:'left',
  },
]

const STEPS = [
  { icon:MessageCircle, color:'#2A7D6F', step:'01', title:'You express yourself',    desc:'Send a message. The AI reads your tone — joyful, drained, or somewhere in between.' },
  { icon:Activity,      color:'#C07436', step:'02', title:'We calculate your trend', desc:'Each session is weighted by recency. How you feel today matters more than last week.' },
  { icon:TrendingUp,    color:'#3B6EA8', step:'03', title:'A direction emerges',     desc:'Over days, a clear pattern forms: improving, holding steady, or needing more support.' },
  { icon:Brain,         color:'#7B5EA8', step:'04', title:'The AI responds accordingly', desc:'MindCare adjusts its voice — quieter when you struggle, warmer when you rise.' },
]

/* ── Main export ── */
export default function Landing({ onGetStarted, onSignIn }) {
  const handleSignIn = onSignIn || onGetStarted
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive:true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ minHeight:'100vh', fontFamily:"'DM Sans',system-ui,sans-serif", overflowX:'hidden', background:'#F5F3EF' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        @keyframes floatCard   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes msgPop      { from{opacity:0;transform:translateY(6px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes pulse       { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes typingBounce{ 0%,80%,100%{transform:translateY(0);opacity:0.35} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes heroIn      { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:none} }
        @keyframes cardIn      { from{opacity:0;transform:translateX(32px)} to{opacity:1;transform:none} }
        @keyframes scrollBob   { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(5px)} }

        .cta-main  { display:inline-flex;align-items:center;gap:8px;padding:13px 28px;border-radius:12px;border:none;background:linear-gradient(135deg,#1C3D35,#2A7D6F);color:#fff;font-size:14.5px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 20px rgba(42,125,111,0.28);transition:all 0.2s; }
        .cta-main:hover  { transform:translateY(-2px);box-shadow:0 10px 32px rgba(42,125,111,0.36); }
        .cta-ghost { display:inline-flex;align-items:center;gap:7px;padding:12px 22px;border-radius:12px;border:1.5px solid #DDD8CE;background:rgba(255,255,255,0.82);color:#374151;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.18s;backdrop-filter:blur(8px); }
        .cta-ghost:hover { border-color:#2A7D6F;color:#2A7D6F;background:#fff; }
        .nav-link  { color:#6B7280;font-size:14px;font-weight:500;cursor:pointer;background:none;border:none;font-family:inherit;transition:color 0.15s;padding:4px 0; }
        .nav-link:hover { color:#2A7D6F; }
        .social-btn{ width:36px;height:36px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;text-decoration:none; }
        .social-btn:hover{ background:rgba(42,125,111,0.3);border-color:rgba(42,125,111,0.5);transform:translateY(-2px); }
        .footer-link{ color:rgba(255,255,255,0.5);font-size:13px;font-weight:400;cursor:pointer;background:none;border:none;font-family:inherit;transition:color 0.15s;text-decoration:none;padding:0;text-align:left; }
        .footer-link:hover{ color:#fff; }

        @media(max-width:860px){
          .hero-grid { grid-template-columns:1fr !important; }
          .hero-right{ display:none !important; }
          .feat-grid { grid-template-columns:1fr !important; }
          .ema-grid  { grid-template-columns:1fr !important; gap:40px !important; }
          .trust-row { flex-wrap:wrap !important; gap:16px !important; }
          .footer-cols{ grid-template-columns:1fr 1fr !important; }
        }
        @media(max-width:560px){
          .footer-cols{ grid-template-columns:1fr !important; }
          .cta-main,.cta-ghost{ width:100%; justify-content:center; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:scrolled?'rgba(245,243,239,0.94)':'transparent', backdropFilter:scrolled?'blur(18px)':'none', borderBottom:scrolled?'1px solid #E6E2DA':'1px solid transparent', height:62, padding:'0 max(24px,5vw)', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all 0.3s ease', boxShadow:scrolled?'0 2px 14px rgba(26,35,50,0.05)':'none' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:35, height:35, borderRadius:10, background:'linear-gradient(135deg,#1C3D35,#2A7D6F)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 10px rgba(42,125,111,0.25)' }}>
            <Heart size={14} color="#fff" fill="#fff"/>
          </div>
          <span style={{ fontFamily:'Lora,serif', fontWeight:700, fontSize:17, color:'#1A2332', letterSpacing:'-0.3px' }}>MindCare</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:18 }}>
          {/* Sign In → goes to login */}
          <button className="nav-link" onClick={handleSignIn}>Sign In</button>
          {/* Get Started → goes to register */}
          <button className="cta-main" onClick={onGetStarted} style={{ padding:'8px 18px', fontSize:13 }}>
            Get Started <ArrowRight size={13}/>
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position:'relative', minHeight:'90vh', display:'flex', alignItems:'center', overflow:'hidden' }}>
        <PageBg/>
        <div className="hero-grid" style={{ position:'relative', zIndex:1, width:'100%', maxWidth:1120, margin:'0 auto', padding:'72px max(24px,5vw) 84px', display:'grid', gridTemplateColumns:'1.15fr 1fr', gap:52, alignItems:'center' }}>

          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 13px', borderRadius:8, background:'rgba(42,125,111,0.09)', border:'1px solid rgba(42,125,111,0.20)', marginBottom:28, animation:'heroIn 0.55s ease both' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#2A7D6F', animation:'pulse 2.2s infinite' }}/>
              <span style={{ fontSize:11, fontWeight:600, color:'#2A7D6F', letterSpacing:'0.04em' }}>Mental wellness, powered by AI</span>
            </div>

            <h1 style={{ fontFamily:'Lora,serif', fontSize:'clamp(32px,4.8vw,58px)', fontWeight:700, color:'#1C2B3A', lineHeight:1.12, margin:'0 0 20px', letterSpacing:'-0.5px', animation:'heroIn 0.65s cubic-bezier(0.22,1,0.36,1) 0.08s both' }}>
              Some days feel heavier<br/>
              <em style={{ fontStyle:'italic', color:'#2A7D6F' }}>than others.</em>
            </h1>

            <p style={{ fontSize:'clamp(14px,1.7vw,16.5px)', color:'#4A5A6A', lineHeight:1.80, maxWidth:480, margin:'0 0 36px', animation:'heroIn 0.65s ease 0.22s both' }}>
              MindCare helps you understand why. Emotion tracking, clinical screening, and an AI that adapts to exactly where you are — updated in real time, completely private.
            </p>

            <div style={{ display:'flex', gap:12, flexWrap:'wrap', animation:'heroIn 0.55s ease 0.36s both' }}>
              <button className="cta-main" onClick={onGetStarted}>Start for free <ArrowRight size={14}/></button>
              <button className="cta-ghost" onClick={handleSignIn}>Sign in</button>
            </div>

            <div className="trust-row" style={{ display:'flex', gap:20, marginTop:28, flexWrap:'wrap', animation:'heroIn 0.55s ease 0.48s both' }}>
              {[{Icon:Shield,l:'100% private'},{Icon:Zap,l:'Real-time'},{Icon:CheckCircle,l:'Free forever'}].map(({Icon,l}) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#9CA3AF', fontWeight:500 }}>
                  <Icon size={12} color="#2A7D6F"/> {l}
                </div>
              ))}
            </div>
          </div>

          <div className="hero-right" style={{ animation:'cardIn 0.75s cubic-bezier(0.22,1,0.36,1) 0.25s both' }}>
            <AppPreview/>
          </div>
        </div>

        <div style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:4, animation:'scrollBob 2.4s ease-in-out infinite' }}>
          <span style={{ fontSize:9, color:'#B0A99C', fontWeight:600, letterSpacing:'0.09em' }}>SCROLL</span>
          <ChevronDown size={14} color="#B0A99C"/>
        </div>
      </section>

      {/* ── QUIET FEATURE STRIP ── */}
      <div style={{ background:'rgba(255,255,255,0.80)', backdropFilter:'blur(12px)', borderTop:'1px solid #E6E2DA', borderBottom:'1px solid #E6E2DA' }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'22px max(24px,5vw)', display:'flex', justifyContent:'space-around', gap:20, flexWrap:'wrap' }}>
          {[
            { Icon:Smile,        label:'7 emotions detected',     color:'#2A7D6F' },
            { Icon:ClipboardList,label:'PHQ-9 & GAD-7 screeners', color:'#3B6EA8' },
            { Icon:Shield,       label:'Nothing stored. Ever.',   color:'#C07436' },
            { Icon:Brain,        label:'AI available 24/7',       color:'#7B5EA8' },
          ].map(({ Icon, label, color }, i) => (
            <Reveal key={label} delay={i * 60} from="bottom">
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${color}0F`, border:`1px solid ${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={15} color={color}/>
                </div>
                <span style={{ fontSize:12.5, color:'#6B7280', fontWeight:500 }}>{label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth:1060, margin:'0 auto', padding:'80px max(24px,5vw)' }}>
        <Reveal from="bottom">
          <div style={{ marginBottom:52 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#2A7D6F', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>What MindCare does</p>
            <h2 style={{ fontFamily:'Lora,serif', fontSize:'clamp(24px,3.2vw,40px)', fontWeight:700, color:'#1C2B3A', margin:'0 0 12px', letterSpacing:'-0.4px' }}>
              Three tools. One complete picture.
            </h2>
            <p style={{ fontSize:14.5, color:'#6B7280', maxWidth:400, lineHeight:1.74, margin:0 }}>
              Everything you need to understand your wellbeing — clearly and compassionately.
            </p>
          </div>
        </Reveal>
        <div className="feat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:22 }}>
          {FEATURES.map(f => <FeatureCard key={f.title} {...f}/>)}
        </div>
      </section>

      {/* ── HOW EMA WORKS ── */}
      <section style={{ background:'linear-gradient(155deg,#EDF7F3 0%,#F5F3EF 55%,#EEF4FD 100%)', borderTop:'1px solid #E6E2DA', borderBottom:'1px solid #E6E2DA', padding:'80px max(24px,5vw)' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <div className="ema-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'start' }}>

            <Reveal from="left">
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'#2A7D6F', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:14 }}>How we track your mood</p>
                <h2 style={{ fontFamily:'Lora,serif', fontSize:'clamp(22px,2.8vw,36px)', fontWeight:700, color:'#1C2B3A', margin:'0 0 18px', lineHeight:1.20, letterSpacing:'-0.3px' }}>
                  Your emotional<br/>
                  <em style={{ fontStyle:'italic', color:'#2A7D6F' }}>trajectory, not just a snapshot</em>
                </h2>
                <p style={{ fontSize:14, color:'#6B7280', lineHeight:1.80, marginBottom:16 }}>
                  One bad day doesn't define you. MindCare uses an <strong style={{ color:'#374151' }}>Exponential Moving Average</strong> — the same technique used in financial markets — to track your emotional trend across 72 hours.
                </p>
                <p style={{ fontSize:14, color:'#6B7280', lineHeight:1.80, marginBottom:28 }}>
                  Recent conversations carry more weight, so your score always reflects <em>where you are right now</em>.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {[
                    { range:'Improving', meaning:'AI is warm, affirming, and forward-looking', color:'#2A7D6F', Icon:TrendingUp },
                    { range:'Stable',    meaning:'AI offers steady, grounded support',         color:'#C07436',  Icon:BarChart2 },
                    { range:'Declining', meaning:'AI is extra gentle and therapeutic',          color:'#3B6EA8',  Icon:Activity  },
                  ].map(e => (
                    <div key={e.range} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:11, background:`${e.color}07`, border:`1px solid ${e.color}16` }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:`${e.color}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <e.Icon size={13} color={e.color}/>
                      </div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:e.color }}>{e.range}</div>
                        <div style={{ fontSize:11.5, color:'#6B7280', marginTop:1 }}>{e.meaning}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {STEPS.map((s, i) => (
                <StepCard key={s.step} {...s} delay={i * 110} isLast={i === STEPS.length - 1}/>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding:'88px max(24px,5vw)' }}>
        <Reveal from="bottom">
          <div style={{ maxWidth:620, margin:'0 auto', background:'#fff', border:'1px solid #E6E2DA', borderRadius:24, padding:'52px 44px', textAlign:'center', boxShadow:'0 6px 48px rgba(42,125,111,0.08),0 2px 10px rgba(26,35,50,0.04)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:'-15%', right:'10%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(42,125,111,0.05),transparent)', pointerEvents:'none' }}/>
            <div style={{ width:54, height:54, borderRadius:16, background:'linear-gradient(135deg,#1C3D35,#2A7D6F)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 22px', boxShadow:'0 6px 20px rgba(42,125,111,0.26)' }}>
              <Heart size={23} color="#fff" fill="#fff"/>
            </div>
            <h2 style={{ fontFamily:'Lora,serif', fontSize:'clamp(20px,3.2vw,32px)', fontWeight:700, color:'#1C2B3A', margin:'0 0 14px', letterSpacing:'-0.3px' }}>
              Ready to understand yourself better?
            </h2>
            <p style={{ fontSize:14.5, color:'#6B7280', lineHeight:1.74, maxWidth:380, margin:'0 auto 32px' }}>
              MindCare is free and private. No credit card, no data sold, no conditions.
            </p>
            <button className="cta-main" onClick={onGetStarted} style={{ fontSize:15, padding:'14px 34px' }}>
              Begin your journey <ArrowRight size={15}/>
            </button>
            <div style={{ display:'flex', justifyContent:'center', gap:20, marginTop:22, flexWrap:'wrap' }}>
              {['No credit card','Private & secure','Free forever'].map(t => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:'#9CA3AF', fontWeight:500 }}>
                  <CheckCircle size={10} color="#2A7D6F"/> {t}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:'linear-gradient(160deg,#1C2B3A,#0F1E2A)', color:'#fff', padding:0 }}>
        <div style={{ height:2, background:'linear-gradient(90deg,#2A7D6F,#38A594,#3B6EA8,#7B5EA8,#C07436)' }}/>
        <div style={{ maxWidth:1060, margin:'0 auto', padding:'52px max(24px,5vw) 36px' }}>
          <div className="footer-cols" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:36, marginBottom:44 }}>

            <div>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:14 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#2A7D6F,#38A594)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(42,125,111,0.30)', flexShrink:0 }}>
                  <Heart size={16} color="#fff" fill="#fff"/>
                </div>
                <span style={{ fontFamily:'Lora,serif', fontWeight:700, fontSize:19, color:'#fff' }}>MindCare</span>
              </div>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.48)', lineHeight:1.76, maxWidth:240, marginBottom:20 }}>
                AI-powered mental wellness that listens, understands, and grows with you.
              </p>
              <div style={{ display:'flex', gap:8 }}>
                {[
                  ['https://www.youtube.com/@MohitAgg07',   Youtube,   'YouTube'],
                  ['https://www.linkedin.com/in/mohitagg07', Linkedin,  'LinkedIn'],
                  ['https://www.instagram.com/mohitaggg7',  Instagram, 'Instagram'],
                ].map(([href, Icon, title]) => (
                  <a key={title} href={href} target="_blank" rel="noopener noreferrer" className="social-btn" title={title}>
                    <Icon size={15} color="rgba(255,255,255,0.65)"/>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.30)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16 }}>Product</p>
              <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
                {['AI Chat','Emotion Detection','PHQ-9 Screening','GAD-7 Screening','Dashboard','Analytics'].map(label => (
                  <button key={label} onClick={onGetStarted} className="footer-link" style={{ border:'none', cursor:'pointer', background:'none', padding:0, fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:5 }}>
                    <ExternalLink size={9} style={{ opacity:0.35 }}/>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.30)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16 }}>Support</p>
              <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
                <a href="https://www.linkedin.com/in/mohitagg07" target="_blank" rel="noopener noreferrer" className="footer-link">Privacy Policy</a>
                <a href="https://www.linkedin.com/in/mohitagg07" target="_blank" rel="noopener noreferrer" className="footer-link">Terms of Use</a>
                <button onClick={onGetStarted} className="footer-link" style={{ border:'none', cursor:'pointer', background:'none', padding:0, fontFamily:'inherit', textAlign:'left' }}>How It Works</button>
                <a href="https://www.instagram.com/mohitaggg7" target="_blank" rel="noopener noreferrer" className="footer-link">Contact</a>
                <a href="https://www.youtube.com/@MohitAgg07" target="_blank" rel="noopener noreferrer" className="footer-link">Demo Video</a>
                <a href="https://github.com/mohitagg07" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
              </div>
            </div>

            <div>
              <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.30)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16 }}>Crisis Lines</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { name:'iCall India', num:'9152987821'    },
                  { name:'Vandrevala',  num:'1860-2662-345' },
                  { name:'AASRA',       num:'9820466627'    },
                ].map(c => (
                  <div key={c.name}>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.30)', marginBottom:3 }}>{c.name}</div>
                    <a href={`tel:${c.num}`} style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.75)', textDecoration:'none', display:'flex', alignItems:'center', gap:5, transition:'color 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.color='#6EE7B7'}
                      onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.75)'}>
                      <Phone size={10}/> {c.num}
                    </a>
                  </div>
                ))}
                <div style={{ marginTop:4, padding:'9px 11px', borderRadius:9, background:'rgba(42,125,111,0.15)', border:'1px solid rgba(42,125,111,0.28)' }}>
                  <p style={{ fontSize:10.5, color:'rgba(255,255,255,0.50)', margin:0, lineHeight:1.56 }}>
                    MindCare is <strong style={{ color:'rgba(255,255,255,0.70)' }}>not</strong> a substitute for professional care. If you are in crisis, call a helpline immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height:1, background:'rgba(255,255,255,0.07)', marginBottom:22 }}/>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.28)', margin:0 }}>
              © 2026 MindCare · Built with care by{' '}
              <a href="https://www.linkedin.com/in/mohitagg07" target="_blank" rel="noopener noreferrer"
                style={{ color:'rgba(255,255,255,0.50)', textDecoration:'none', transition:'color 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.color='#6EE7B7'}
                onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.50)'}>
                Mohit Aggarwal
              </a>
            </p>
            <div style={{ display:'flex', gap:18 }}>
              {[['Privacy','https://www.linkedin.com/in/mohitagg07'],['Terms','https://www.linkedin.com/in/mohitagg07'],['GitHub','https://github.com/mohitagg07']].map(([label,href]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:12, color:'rgba(255,255,255,0.28)', textDecoration:'none', transition:'color 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.65)'}
                  onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.28)'}>{label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}