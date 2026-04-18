import { Heart, MessageCircle, Scan, ClipboardList, BarChart3,
         Shield, Zap, Brain, ArrowRight, CheckCircle } from 'lucide-react'

const FEATURES = [
  {
    icon: MessageCircle, color: '#2A7D6F',
    title: 'AI Therapy Chat',
    desc: 'Talk to MindCare anytime. Our LLaMA-powered AI adapts to your emotional state and tracks your mental trajectory over time.',
  },
  {
    icon: Scan, color: '#3B6EA8',
    title: 'Facial Emotion Detection',
    desc: 'Real-time emotion recognition using computer vision. Detects 7 emotions and feeds them into your personalised risk score.',
  },
  {
    icon: ClipboardList, color: '#7B5EA8',
    title: 'Clinical Assessments',
    desc: 'Validated PHQ-9 and GAD-7 screening tools used by healthcare professionals worldwide to screen for depression and anxiety.',
  },
  {
    icon: BarChart3, color: '#C07436',
    title: 'Live Analytics',
    desc: 'Track your emotional trajectory, session history, and risk trends over time with real-time EMA-based analytics.',
  },
  {
    icon: Brain, color: '#B05090',
    title: 'Trajectory Engine',
    desc: 'Exponential moving average algorithm tracks your mental state trends and triggers adaptive AI responses automatically.',
  },
  {
    icon: Shield, color: '#2A7D6F',
    title: 'Private & Secure',
    desc: 'End-to-end JWT authentication, bcrypt encryption, and MongoDB Atlas storage. Your data stays yours.',
  },
]

const STATS = [
  { value: '7', label: 'Emotion Classes' },
  { value: 'PHQ-9', label: '+ GAD-7 Assessments' },
  { value: 'EMA', label: 'Trajectory Engine' },
  { value: 'RAG', label: 'Knowledge Base' },
]

export default function Landing({ onGetStarted }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-page)', overflowX:'hidden' }}>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .feature-card:hover{transform:translateY(-3px);box-shadow:0 8px 32px rgba(26,35,50,0.1)!important;}
        .feature-card{transition:all 0.25s ease!important;}
        .cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(42,125,111,0.45)!important;}
        .cta-btn{transition:all 0.2s ease!important;}
      `}</style>

      {/* Nav */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(248,246,242,0.92)',
        backdropFilter:'blur(12px)', borderBottom:'1px solid var(--border)',
        padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#2A7D6F,#38A594)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 3px 12px rgba(42,125,111,0.3)' }}>
            <Heart size={15} color="#fff" fill="#fff"/>
          </div>
          <span style={{ fontFamily:'Lora,serif', fontWeight:700, fontSize:18, color:'var(--text-1)' }}>MindCare</span>
        </div>
        <button className="cta-btn" onClick={onGetStarted}
          style={{ padding:'9px 20px', borderRadius:10, border:'none', cursor:'pointer',
            background:'linear-gradient(135deg,#2A7D6F,#38A594)', color:'#fff',
            fontSize:13, fontWeight:600, fontFamily:'inherit',
            boxShadow:'0 4px 16px rgba(42,125,111,0.3)', display:'flex', alignItems:'center', gap:7 }}>
          Get Started <ArrowRight size={14}/>
        </button>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth:900, margin:'0 auto', padding:'72px 24px 56px', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px',
          borderRadius:99, background:'var(--teal-dim)', border:'1px solid var(--teal-border)',
          marginBottom:24, animation:'fadeUp 0.6s ease both' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--teal)', animation:'pulse 1.5s infinite' }}/>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)', letterSpacing:'0.03em' }}>
            AI-Powered Mental Health Platform
          </span>
        </div>

        <h1 style={{ fontFamily:'Lora,serif', fontSize:'clamp(32px,6vw,60px)', fontWeight:700,
          color:'var(--text-1)', lineHeight:1.15, margin:'0 0 22px',
          animation:'fadeUp 0.6s ease 0.1s both' }}>
          Your mental wellness,<br/>
          <span style={{ color:'var(--teal)' }}>understood deeply.</span>
        </h1>

        <p style={{ fontSize:'clamp(15px,2vw,18px)', color:'var(--text-3)', maxWidth:580,
          margin:'0 auto 36px', lineHeight:1.75, animation:'fadeUp 0.6s ease 0.2s both' }}>
          MindCare combines facial emotion detection, clinical assessments, and adaptive AI therapy
          to give you a complete picture of your mental health — in real time.
        </p>

        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap',
          animation:'fadeUp 0.6s ease 0.3s both' }}>
          <button className="cta-btn" onClick={onGetStarted}
            style={{ padding:'14px 30px', borderRadius:12, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg,#2A7D6F,#38A594)', color:'#fff',
              fontSize:15, fontWeight:700, fontFamily:'inherit',
              boxShadow:'0 6px 24px rgba(42,125,111,0.35)',
              display:'flex', alignItems:'center', gap:8 }}>
            Start for Free <ArrowRight size={16}/>
          </button>
          <button style={{ padding:'14px 24px', borderRadius:12, border:'1.5px solid var(--border-md)',
            background:'var(--bg-card)', color:'var(--text-2)', fontSize:15, fontWeight:600,
            cursor:'pointer', fontFamily:'inherit' }}
            onClick={onGetStarted}>
            Sign In
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:0, justifyContent:'center', marginTop:56,
          background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)',
          boxShadow:'0 1px 4px rgba(26,35,50,0.06)', overflow:'hidden',
          animation:'fadeUp 0.6s ease 0.4s both', flexWrap:'wrap' }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ flex:'1 1 120px', padding:'20px 16px', textAlign:'center',
              borderRight: i < STATS.length-1 ? '1px solid var(--border)' : 'none' }}>
              <p style={{ fontSize:22, fontWeight:800, color:'var(--teal)', margin:0,
                fontFamily:'Lora,serif' }}>{s.value}</p>
              <p style={{ fontSize:11, color:'var(--text-4)', marginTop:4, fontWeight:600 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hero visual */}
      <section style={{ maxWidth:800, margin:'0 auto 64px', padding:'0 24px' }}>
        <div style={{ background:'linear-gradient(135deg,var(--teal-dim),rgba(59,110,168,0.06))',
          border:'1px solid var(--teal-border)', borderRadius:24, padding:'28px',
          boxShadow:'0 4px 24px rgba(26,35,50,0.08)', animation:'fadeUp 0.6s ease 0.5s both' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { label:'Risk Score', value:'Low · 18%', color:'#2A7D6F', icon:'🛡️' },
              { label:'Emotion',    value:'Happy · 82%', color:'#2A7D6F', icon:'😊' },
              { label:'Trajectory', value:'Improving ↑', color:'#2A7D6F', icon:'📈' },
            ].map(item => (
              <div key={item.label} style={{ background:'var(--bg-card)', borderRadius:14,
                padding:'16px', border:`1px solid ${item.color}22`,
                boxShadow:'0 1px 4px rgba(26,35,50,0.05)', textAlign:'center' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{item.icon}</div>
                <p style={{ fontSize:11, color:'var(--text-4)', margin:'0 0 5px',
                  fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{item.label}</p>
                <p style={{ fontSize:14, fontWeight:700, color:item.color, margin:0 }}>{item.value}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, padding:'14px 16px', background:'var(--bg-card)',
            borderRadius:14, border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginBottom:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#2A7D6F,#38A594)',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Heart size={12} color="#fff" fill="#fff"/>
              </div>
              <div style={{ background:'var(--bg-elevated)', borderRadius:'12px 12px 12px 3px',
                padding:'10px 14px', maxWidth:'80%' }}>
                <p style={{ fontSize:13, color:'var(--text-2)', margin:0, lineHeight:1.5 }}>
                  I can see you're feeling positive today! Your trajectory has been improving over the past 3 days. Keep it up! 🌟
                </p>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <div style={{ background:'linear-gradient(135deg,#2A7D6F,#38A594)',
                borderRadius:'12px 12px 3px 12px', padding:'10px 14px', maxWidth:'70%' }}>
                <p style={{ fontSize:13, color:'#fff', margin:0, lineHeight:1.5 }}>
                  Thanks! I've been practicing the breathing exercises you suggested.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth:980, margin:'0 auto', padding:'0 24px 64px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h2 style={{ fontFamily:'Lora,serif', fontSize:'clamp(24px,4vw,36px)',
            fontWeight:700, color:'var(--text-1)', margin:'0 0 12px' }}>
            Everything you need for mental wellness
          </h2>
          <p style={{ fontSize:15, color:'var(--text-3)', maxWidth:480, margin:'0 auto', lineHeight:1.7 }}>
            Built with clinical-grade tools and cutting-edge AI, designed to be your daily mental health companion.
          </p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="feature-card"
              style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
                borderRadius:18, padding:'22px', boxShadow:'0 1px 4px rgba(26,35,50,0.06)',
                animationDelay:`${i*0.08}s` }}>
              <div style={{ width:44, height:44, borderRadius:13, marginBottom:14,
                background:f.color+'12', border:`1px solid ${f.color}22`,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <f.icon size={20} color={f.color}/>
              </div>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', margin:'0 0 8px',
                fontFamily:'Lora,serif' }}>{f.title}</h3>
              <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.65, margin:0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth:700, margin:'0 auto', padding:'0 24px 80px', textAlign:'center' }}>
        <div style={{ background:'linear-gradient(135deg,var(--teal-dim),rgba(59,110,168,0.06))',
          border:'1px solid var(--teal-border)', borderRadius:24, padding:'44px 32px' }}>
          <h2 style={{ fontFamily:'Lora,serif', fontSize:'clamp(22px,4vw,32px)',
            fontWeight:700, color:'var(--text-1)', margin:'0 0 14px' }}>
            Ready to understand your mind better?
          </h2>
          <p style={{ fontSize:15, color:'var(--text-3)', marginBottom:28, lineHeight:1.7 }}>
            Join thousands of people using MindCare to track, understand, and improve their mental wellbeing.
          </p>
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', marginBottom:20 }}>
            {['Free forever', 'No credit card', 'Private & secure'].map(t => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:7,
                fontSize:13, color:'var(--teal)', fontWeight:600 }}>
                <CheckCircle size={14} color="var(--teal)"/>
                {t}
              </div>
            ))}
          </div>
          <button className="cta-btn" onClick={onGetStarted}
            style={{ padding:'14px 36px', borderRadius:12, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg,#2A7D6F,#38A594)', color:'#fff',
              fontSize:15, fontWeight:700, fontFamily:'inherit',
              boxShadow:'0 6px 24px rgba(42,125,111,0.35)',
              display:'inline-flex', alignItems:'center', gap:8 }}>
            Get Started Free <ArrowRight size={16}/>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid var(--border)', padding:'20px 24px',
        textAlign:'center', background:'var(--bg-card)' }}>
        <p style={{ fontSize:12, color:'var(--text-4)', margin:0 }}>
          © 2026 MindCare · Built with ❤️ for mental wellness · Not a substitute for professional care
        </p>
      </footer>
    </div>
  )
}