import { useRef, useState } from 'react'
import LegalNotice from '../components/LegalNotice'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ClipboardList,
  Compass,
  Footprints,
  Heart,
  LifeBuoy,
  LockKeyhole,
  Menu,
  MessageCircle,
  ScanFace,
  X,
} from 'lucide-react'
import './Landing.css'

const features = [
  {
    number: '01', icon: MessageCircle, label: 'Conversation', title: 'Talk it out.',
    body: 'One thought is enough to start.', tone: 'green',
  },
  {
    number: '02', icon: ClipboardList, label: 'Self-check', title: 'Check in.',
    body: 'A structured reflection, not a diagnosis.', tone: 'amber',
  },
  {
    number: '03', icon: ScanFace, label: 'Optional visual tool', title: 'Notice, don’t assume.',
    body: 'A visible expression can’t tell the whole story.', tone: 'blue',
  },
]

const steps = [
  {
    number: '01', icon: MessageCircle, tab: 'Say it', label: 'Start where you are',
    title: 'Put it into words.', body: 'Start with one worry, moment, or thought. It can be unfinished.',
    example: 'I keep replaying a conversation.', question: 'What part keeps coming back?', tone: 'sage',
  },
  {
    number: '02', icon: Compass, tab: 'Untangle', label: 'Find the thread',
    title: 'Make a little sense of it.', body: 'Look at what happened and why it mattered to you.',
    example: 'I think I felt dismissed.', question: 'Does that feel right, or is there more to it?', tone: 'clay',
  },
  {
    number: '03', icon: Footprints, tab: 'Next step', label: 'Choose what helps',
    title: 'Keep the next step small.', body: 'Reflect a little longer, make a plan, or consider talking to someone.',
    example: 'I can focus on one thing tomorrow.', question: 'What would feel useful right now?', tone: 'blue',
  },
]

const scenarios = [
  { id: 'work', label: 'Work & study', short: 'Falling behind', user: 'I keep worrying that I’m falling behind.', response: 'That is a tiring thought to carry. What feels most urgent today?', choices: ['Too much to do', 'Fear of falling behind', 'Not sure yet'] },
  { id: 'compare', label: 'Comparison', short: 'Everyone’s ahead', user: 'Everyone else seems to be moving forward.', response: 'It can be hard when other people’s timelines become the measure for your own.', choices: ['Career progress', 'Others’ expectations', 'Not sure yet'] },
  { id: 'overwhelmed', label: 'Overwhelmed', short: 'Too much at once', user: 'Everything feels like a lot right now.', response: 'We do not have to untangle everything at once. What is taking up the most space today?', choices: ['One specific problem', 'Too many things', 'I can’t tell yet'] },
  { id: 'unsure', label: 'Not sure', short: 'Hard to explain', user: 'I don’t really know how to explain how I feel.', response: 'That is an okay place to start. We can begin without needing a label.', choices: ['The last few days', 'One moment', 'I’d rather just start'] },
]

const faqs = [
  { question: 'Is MindCare a therapist?', answer: 'No. MindCare offers AI-assisted reflection, not therapy or diagnosis. It is not an emergency service or a substitute for qualified care.' },
  { question: 'Are my conversations saved?', answer: 'Conversations are associated with your account so you can revisit them. Avoid sharing passwords or details you do not need to share; see the privacy notice for data-handling details.' },
  { question: 'Do I have to use the camera?', answer: 'No. The visual tool is optional. A facial expression cannot reliably tell us what someone feels inside or assess their mental health.' },
]

function Brand({ light = false }) {
  return (
    <a className={`mc-landing-brand${light ? ' is-light' : ''}`} href="#top" aria-label="MindCare home">
      <span className="mc-brand-mark"><img src="/brand/mindcare-mark.png" alt="" /></span>
      <span className="mc-brand-name">mindcare<span>.</span></span>
    </a>
  )
}

function ProductPreview() {
  const [activeId, setActiveId] = useState('compare')
  const [activeChoice, setActiveChoice] = useState(null)
  const scenario = scenarios.find(item => item.id === activeId) || scenarios[1]

  const chooseScenario = (id) => {
    setActiveId(id)
    setActiveChoice(null)
  }

  return (
    <div className="mc-preview-scene" aria-label="Interactive sample conversation. Choose a topic to change the example.">
      <div className="mc-preview-caption"><span className="mc-preview-caption-mark"><MessageCircle size={13} /></span><span>Try a starting point</span></div>
      <article className="mc-product-window">
        <header className="mc-product-topbar">
          <span className="mc-product-mark"><img src="/brand/mindcare-mark.png" alt="" /></span>
          <div className="mc-product-branding"><strong>MindCare</strong><span>A space to reflect</span></div>
          <span className="mc-preview-label"><span className="mc-preview-label-dot" /> SAMPLE</span>
        </header>
        <div className="mc-preview-interaction">
          <div className="mc-preview-choice-heading"><span>What’s on your mind?</span><span className="mc-preview-step-count">Choose one</span></div>
          <div className="mc-product-prompt-list" role="group" aria-label="Choose an example topic">
            {scenarios.map(item => (
              <button key={item.id} type="button" className={`mc-preview-choice${item.id === activeId ? ' is-active' : ''}`} aria-pressed={item.id === activeId} onClick={() => chooseScenario(item.id)}>{item.label}</button>
            ))}
          </div>
          <div className="mc-preview-exchange" aria-live="polite" aria-atomic="true">
            <div className="mc-product-message user-message" key={`${scenario.id}-user`}>
              <span className="mc-message-author">YOU MIGHT SAY</span><p>“{scenario.user}”</p>
            </div>
            <div className="mc-product-message assistant-message" key={`${scenario.id}-assistant`}>
              <span className="mc-assistant-avatar"><Heart size={13} strokeWidth={1.8} /></span>
              <div className="mc-preview-response-copy"><span className="mc-message-author">A POSSIBLE RESPONSE</span><p>{scenario.response}</p></div>
            </div>
          </div>
          <details className="mc-preview-followups">
            <summary>Explore a little further <ChevronDown size={13} /></summary>
            <div className="mc-preview-followup-list">
              {scenario.choices.map(choice => (
                <button key={choice} type="button" className={`mc-preview-followup${activeChoice === choice ? ' is-selected' : ''}`} aria-pressed={activeChoice === choice} onClick={() => setActiveChoice(choice)}>{choice}</button>
              ))}
            </div>
            {activeChoice && <p className="mc-preview-followup-note">A possible place to start: <strong>{activeChoice.toLowerCase()}</strong>.</p>}
          </details>
        </div>
        <footer className="mc-product-footnote"><LockKeyhole size={12} /><span>Example only. Nothing is sent or saved.</span></footer>
      </article>
    </div>
  )
}

function FeatureArtwork({ tone }) {
  if (tone === 'green') {
    return (
      <svg viewBox="0 0 480 150" className="mc-feature-art-svg" aria-hidden="true" focusable="false">
        <rect width="480" height="150" fill="#E7EEE1" />
        <circle cx="388" cy="18" r="74" fill="#D4E2CE" />
        <path d="M0 120C68 92 112 145 190 119S342 99 480 130V150H0Z" fill="#D7E4D0" />
        <g transform="translate(95 20) rotate(-3 130 54)">
          <rect x="6" y="7" width="245" height="106" rx="18" fill="#AFC5AC" opacity=".45" />
          <rect width="245" height="106" rx="18" fill="#FFFCF4" stroke="#DCE5D7" />
          <path d="M23 30H174" stroke="#D9E3D5" strokeWidth="7" strokeLinecap="round" />
          <path d="M23 47H202" stroke="#E6EAE0" strokeWidth="7" strokeLinecap="round" />
          <path d="M23 64H145" stroke="#E6EAE0" strokeWidth="7" strokeLinecap="round" />
          <circle cx="211" cy="78" r="17" fill="#DFEBDD" />
          <path d="m204 78 5 5 9-11" fill="none" stroke="#4C7B5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d="M35 37c13-14 28-14 40-2m-7-12 8 10-12 3" fill="none" stroke="#719477" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (tone === 'amber') {
    return (
      <svg viewBox="0 0 480 150" className="mc-feature-art-svg" aria-hidden="true" focusable="false">
        <rect width="480" height="150" fill="#F2E4D8" />
        <circle cx="385" cy="20" r="75" fill="#EBD6C5" />
        <path d="M0 128C89 97 140 142 231 118S385 109 480 127V150H0Z" fill="#EAD6C5" />
        <g transform="translate(133 16) rotate(2 107 58)">
          <rect x="5" y="6" width="214" height="116" rx="15" fill="#D4B39D" opacity=".42" />
          <rect width="214" height="116" rx="15" fill="#FFFCF5" stroke="#E9D7C8" />
          <circle cx="28" cy="30" r="7" fill="#DCE8D6" /><path d="m24 30 3 3 5-6" fill="none" stroke="#507A58" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M44 30H178" stroke="#DDE5D8" strokeWidth="6" strokeLinecap="round" />
          <circle cx="28" cy="55" r="7" fill="#F0DFD3" /><path d="M24 55h8" stroke="#AE7656" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M44 55H163" stroke="#E7E6DC" strokeWidth="6" strokeLinecap="round" />
          <circle cx="28" cy="80" r="7" fill="#E4E9E5" /><path d="M24 80h8" stroke="#6F8D94" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M44 80H184" stroke="#E7E6DC" strokeWidth="6" strokeLinecap="round" />
        </g>
        <path d="M43 40c10-12 24-12 34 0m-6-10 7 10-10 2" fill="none" stroke="#BA8869" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 480 150" className="mc-feature-art-svg" aria-hidden="true" focusable="false">
      <rect width="480" height="150" fill="#E3EBEC" />
      <circle cx="385" cy="20" r="76" fill="#D3E0E2" />
      <path d="M0 128C92 111 148 143 240 119S386 101 480 127V150H0Z" fill="#D4E1E2" />
      <g transform="translate(164 7)">
        <rect x="0" y="0" width="116" height="132" rx="54" fill="#C7D9DA" />
        <path d="M26 132c5-27 18-39 32-39 16 0 29 12 34 39" fill="#91AAAD" />
        <path d="M37 52c0-24 10-38 23-38 17 0 28 14 28 38v20c0 20-11 32-26 32S37 92 37 72Z" fill="#F6EADC" stroke="#7B989B" strokeWidth="1.3" />
        <path d="M38 52c1-24 10-36 24-36 16 0 25 12 26 36-9-5-15-12-19-20-8 11-19 17-31 20Z" fill="#4D716A" />
        <path d="M48 65h5m19 0h5" stroke="#587B7A" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M55 80c5 3 10 3 15 0" fill="none" stroke="#B77D65" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <g stroke="#718F96" strokeWidth="1.7" fill="none" strokeLinecap="round">
        <path d="M110 36V23h14M110 36v12M110 102v13h14M110 102V90M369 36V23h-14M369 36v12M369 102v13h-14M369 102V90" />
      </g>
    </svg>
  )
}

function FeatureCard({ feature, index, isActive, onSelect, cardRef }) {
  const Icon = feature.icon
  return (
    <article ref={cardRef} className={`mc-feature-card mc-feature-${feature.tone}${isActive ? ' is-current' : ''}`}>
      <div className={`mc-feature-art-frame mc-art-tone-${feature.tone}`}>
        <FeatureArtwork tone={feature.tone} />
        <span className="mc-feature-art-label"><Icon size={13} strokeWidth={1.8} />{feature.label}</span>
      </div>
      <div className="mc-feature-content">
        <div className="mc-feature-content-heading"><h3>{feature.title}</h3><span className="mc-feature-icon"><Icon size={17} strokeWidth={1.7} /></span></div>
        <p className="mc-feature-body">{feature.body}</p>
        <button type="button" className="mc-feature-explore" aria-pressed={isActive} onClick={() => onSelect(index)}>
          <span>{isActive ? 'Selected' : 'Explore'}</span><ArrowRight size={14} />
        </button>
      </div>
    </article>
  )
}

export default function Landing({ onGetStarted, onSignIn }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [legalView, setLegalView] = useState('')
  const [activeJourneyStep, setActiveJourneyStep] = useState(0)
  const currentJourneyStep = steps[activeJourneyStep] || steps[0]
  const CurrentJourneyIcon = currentJourneyStep.icon
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0)
  const featureRailRef = useRef(null)
  const featureCardRefs = useRef([])
  const handleSignIn = onSignIn || onGetStarted
  const closeMobileNav = () => setMobileNavOpen(false)

  const moveFeatureTo = (index) => {
    const safeIndex = Math.max(0, Math.min(features.length - 1, index))
    const rail = featureRailRef.current
    const card = featureCardRefs.current[safeIndex]
    if (rail && card && window.matchMedia('(max-width: 760px)').matches) {
      const railRect = rail.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      rail.scrollTo({ left: rail.scrollLeft + cardRect.left - railRect.left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
    setActiveFeatureIndex(safeIndex)
  }

  const handleFeatureRailScroll = () => {
    const rail = featureRailRef.current
    if (!rail || !window.matchMedia('(max-width: 760px)').matches) return
    const railLeft = rail.getBoundingClientRect().left
    let nearest = activeFeatureIndex
    let nearestDistance = Number.POSITIVE_INFINITY
    featureCardRefs.current.forEach((card, index) => {
      if (!card) return
      const distance = Math.abs(card.getBoundingClientRect().left - railLeft)
      if (distance < nearestDistance) { nearestDistance = distance; nearest = index }
    })
    setActiveFeatureIndex(current => current === nearest ? current : nearest)
  }

  return (
    <div className="mc-landing" id="top">
      <header className="mc-site-header">
        <div className="mc-header-inner">
          <Brand />
          <button className="mc-mobile-menu-toggle" type="button" aria-expanded={mobileNavOpen} aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setMobileNavOpen(value => !value)}>
            {mobileNavOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <nav className={`mc-site-nav${mobileNavOpen ? ' is-open' : ''}`} aria-label="Main navigation">
            <a href="#approach" onClick={closeMobileNav}>Explore</a>
            <a href="#how-it-works" onClick={closeMobileNav}>How it works</a>
            <a href="#care-and-privacy" onClick={closeMobileNav}>Care & privacy</a>
            <button type="button" className="mc-nav-signin" onClick={() => { closeMobileNav(); handleSignIn?.() }}>Sign in</button>
            <button type="button" className="mc-button mc-button-dark mc-nav-cta" onClick={() => { closeMobileNav(); onGetStarted?.() }}>Get started <ArrowRight size={15} /></button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mc-hero" aria-labelledby="mc-hero-title">
          <div className="mc-hero-inner">
            <div className="mc-hero-copy">
              <p className="mc-eyebrow"><span className="mc-eyebrow-line" />A little room to think</p>
              <h1 id="mc-hero-title">Start with what’s on your <em>mind.</em></h1>
              <p className="mc-hero-lede">Talk it through. Reflect. Find a small next step — at your own pace.</p>
              <div className="mc-hero-actions">
                <button type="button" className="mc-button mc-button-dark" onClick={onGetStarted}>Start a conversation <ArrowRight size={17} /></button>
                <a className="mc-text-link" href="#approach">Explore MindCare <ArrowDownRight size={16} /></a>
              </div>
              <div className="mc-hero-note"><span className="mc-note-lock"><LockKeyhole size={15} /></span><p><strong>Your pace. Your choice.</strong><br />Share only what feels comfortable.</p></div>
            </div>
            <ProductPreview />
          </div>
          <div className="mc-hero-bottomline"><span>NO PERFECT WORDS REQUIRED</span><span className="mc-bottomline-rule" /><span>ONE THING AT A TIME</span></div>
        </section>

        <section className="mc-section mc-approach" id="approach" aria-labelledby="mc-approach-title">
          <div className="mc-section-heading mc-feature-section-heading">
            <div className="mc-feature-heading-copy">
              <p className="mc-eyebrow"><span className="mc-eyebrow-line" />Ways to begin</p>
              <h2 id="mc-approach-title">Choose what feels <em>useful.</em></h2>
            </div>
          </div>
          <div className="mc-feature-carousel">
            <div className="mc-feature-grid" ref={featureRailRef} onScroll={handleFeatureRailScroll} role="region" aria-label="MindCare ways to begin. Swipe to explore on mobile." tabIndex={0}>
              {features.map((feature, index) => <FeatureCard key={feature.number} feature={feature} index={index} isActive={index === activeFeatureIndex} onSelect={moveFeatureTo} cardRef={element => { featureCardRefs.current[index] = element }} />)}
            </div>
            <div className="mc-feature-rail-footer">
              <div className="mc-feature-pagination" role="group" aria-label="Go to a way to begin">
                {features.map((feature, index) => <button key={feature.number} type="button" className={`mc-feature-page-dot${index === activeFeatureIndex ? ' is-active' : ''}`} aria-label={`Show card ${index + 1}: ${feature.title}`} aria-pressed={index === activeFeatureIndex} onClick={() => moveFeatureTo(index)} />)}
              </div>
              <p><span className="mc-swipe-hint-icon"><ArrowRight size={12} /></span> Swipe to explore</p>
            </div>
          </div>
        </section>

        <section className="mc-how-section" id="how-it-works" aria-labelledby="mc-how-title">
          <div className="mc-how-inner">
            <div className="mc-how-heading">
              <p className="mc-eyebrow mc-eyebrow-light"><span className="mc-eyebrow-line" />How it works</p>
              <h2 id="mc-how-title">From tangled to a little <em>clearer.</em></h2>
              <p>One conversation. One step at a time.</p>
              <button type="button" className="mc-button mc-button-light" onClick={onGetStarted}>Try a conversation <ArrowRight size={16} /></button>
            </div>

            <div className="mc-journey-explorer">
              <div className="mc-journey-cards" role="group" aria-label="Explore the steps">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  const active = index === activeJourneyStep
                  return (
                    <button key={step.number} type="button" className={`mc-journey-card mc-journey-${step.tone}${active ? ' is-active' : ''}`} aria-pressed={active} onClick={() => setActiveJourneyStep(index)}>
                      <span className="mc-journey-card-top"><span className="mc-journey-number">{step.number}</span><Icon size={16} strokeWidth={1.7} /></span>
                      <span className="mc-journey-card-title">{step.tab}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mc-journey-panel" role="region" aria-label={`Step ${activeJourneyStep + 1}: ${currentJourneyStep.title}`} aria-live="polite">
                <div className="mc-journey-panel-content" key={activeJourneyStep}>
                  <div className="mc-journey-panel-heading">
                    <span className={`mc-journey-panel-icon mc-journey-${currentJourneyStep.tone}`}><CurrentJourneyIcon size={18} strokeWidth={1.7} /></span>
                    <div><span className="mc-journey-panel-kicker">{currentJourneyStep.label}</span><h3>{currentJourneyStep.title}</h3></div>
                  </div>
                  <p className="mc-journey-panel-body">{currentJourneyStep.body}</p>
                  <div className="mc-journey-example"><span className="mc-journey-example-label">For example</span><p>“{currentJourneyStep.example}”</p></div>
                  <div className="mc-journey-question"><span className="mc-journey-question-mark"><MessageCircle size={14} /></span><div><span>A gentle prompt</span><p>{currentJourneyStep.question}</p></div></div>
                </div>
                <div className="mc-journey-footer"><div className="mc-journey-progress" aria-label={`Step ${activeJourneyStep + 1} of 3`}>{steps.map((step, index) => <span key={step.number} className={index <= activeJourneyStep ? 'is-filled' : ''} />)}</div><span>{activeJourneyStep + 1} of 3</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mc-care-section" id="care-and-privacy" aria-labelledby="mc-care-title">
          <div className="mc-care-copy">
            <p className="mc-eyebrow"><span className="mc-eyebrow-line" />Care & privacy</p>
            <h2 id="mc-care-title">Your space. <em>Your choices.</em></h2>
            <p>Conversations are linked to your account so you can revisit them. AI can make mistakes; MindCare is reflection, not diagnosis or emergency care.</p>
            <div className="mc-care-actions"><button type="button" className="mc-text-link mc-text-link-button" onClick={() => setLegalView('privacy')}>Privacy notice <ArrowUpRight size={14} /></button><button type="button" className="mc-text-link mc-text-link-button" onClick={() => setLegalView('terms')}>Terms of use <ArrowUpRight size={14} /></button></div>
          </div>
          <aside className="mc-help-note">
            <div className="mc-help-note-top"><span className="mc-help-note-icon"><LifeBuoy size={18} /></span><p className="mc-help-kicker">Need more support?</p></div>
            <h3>You don’t have to figure it out alone.</h3>
            <p>Talk to someone you trust or a qualified professional. In India, Tele-MANAS is available at 14416.</p>
            <a href="https://dghs.mohfw.gov.in/national-mental-health-programme.php" target="_blank" rel="noreferrer" className="mc-help-link">Support information <ArrowUpRight size={14} /></a>
          </aside>
        </section>

        <section className="mc-faq-section" aria-labelledby="mc-faq-title">
          <div className="mc-faq-heading"><p className="mc-eyebrow"><span className="mc-eyebrow-line" />Good to know</p><h2 id="mc-faq-title">A few clear answers.</h2></div>
          <div className="mc-faq-list">
            {faqs.map(faq => <details className="mc-faq-item" key={faq.question}><summary>{faq.question}<ChevronDown size={17} /></summary><p>{faq.answer}</p></details>)}
          </div>
        </section>

        <section className="mc-final-cta" aria-labelledby="mc-final-cta-title">
          <div className="mc-final-ornament" aria-hidden="true"><span /><span /><span /><span /><span /></div>
          <p className="mc-eyebrow mc-eyebrow-light"><span className="mc-eyebrow-line" />Begin wherever you are</p>
          <h2 id="mc-final-cta-title">Start with one thing.</h2>
          <p>No perfect words needed.</p>
          <button type="button" className="mc-button mc-button-paper" onClick={onGetStarted}>Start a conversation <ArrowRight size={16} /></button>
        </section>
      </main>

      <footer className="mc-footer">
        <div className="mc-footer-main">
          <div className="mc-footer-brand"><Brand light /><p>A little room to think.</p></div>
          <div className="mc-footer-links">
            <div><span className="mc-footer-heading">Explore</span><a href="#approach">Ways to begin</a><a href="#how-it-works">How it works</a><button type="button" onClick={onGetStarted}>Get started</button></div>
            <div><span className="mc-footer-heading">Information</span><button type="button" onClick={() => setLegalView('privacy')}>Privacy notice</button><button type="button" onClick={() => setLegalView('terms')}>Terms of use</button><a href="https://github.com/mohitagg07/Mindcare" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={12} /></a></div>
          </div>
        </div>
        <div className="mc-footer-bottom"><span>© {new Date().getFullYear()} MindCare</span><span>AI-assisted reflection · Not a diagnostic or emergency service</span></div>
      </footer>

      {legalView && <LegalNotice view={legalView} onClose={() => setLegalView('')} />}
    </div>
  )
}
