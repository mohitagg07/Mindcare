import { useRef, useState } from 'react'
import LegalNotice from '../components/LegalNotice'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
    number: '01',
    icon: MessageCircle,
    label: 'Open conversation',
    title: 'Put it into words.',
    body: 'Talk about what is going on, even if you are not sure where to begin. You can start with one sentence.',
    tone: 'green',
  },
  {
    number: '02',
    icon: ClipboardList,
    label: 'Optional self-check',
    title: 'Make space to reflect.',
    body: 'PHQ-9 and GAD-7 questionnaires offer a structured way to review symptoms. They are screening tools, not a diagnosis.',
    tone: 'amber',
  },
  {
    number: '03',
    icon: ScanFace,
    label: 'Optional visual tool',
    title: 'Keep things in perspective.',
    body: 'The image tool estimates a visible facial expression only. It cannot know how you feel inside or assess your mental health.',
    tone: 'blue',
  },
]

const steps = [
  {
    number: '01',
    icon: MessageCircle,
    label: 'Start with the messy bit',
    title: 'Say it your way.',
    summary: 'You do not need to know where to begin.',
    body: 'Bring a worry, a moment that stuck with you, or a thought you keep circling back to. A perfect explanation is not the entry fee.',
    example: 'I keep replaying a conversation from today.',
    question: 'What part of that moment keeps coming back to you?',
    tone: 'sage',
  },
  {
    number: '02',
    icon: Compass,
    label: 'Find the thread',
    title: 'Make a little sense of it.',
    summary: 'Explore it without jumping to a verdict.',
    body: 'Take a closer look at what happened, what matters to you, and what you wish someone understood. You can correct anything that does not feel right.',
    example: 'I think what upset me was feeling dismissed.',
    question: 'Does that feel close, or is there another part we should understand?',
    tone: 'clay',
  },
  {
    number: '03',
    icon: Footprints,
    label: 'Choose the next bit',
    title: 'Keep the next step small.',
    summary: 'You decide what feels useful from here.',
    body: 'You might want to reflect a little longer, try a grounding exercise, make a practical plan, or prepare to talk to someone. You stay in control of the choice.',
    example: 'I do not need to fix everything tonight. I need to work out one thing I can do tomorrow.',
    question: 'Would a pause, a practical plan, or help talking to someone be most useful right now?',
    tone: 'blue',
  },
]

const faqs = [
  {
    question: 'Is MindCare a therapist or a diagnostic tool?',
    answer: 'No. MindCare offers AI-assisted conversation and self-reflection tools. It does not diagnose conditions or replace a qualified mental-health professional.',
  },
  {
    question: 'Do I have to use the camera?',
    answer: 'No. The visual-expression tool is optional. A facial expression is not a reliable measure of a person’s internal emotional state, and you can use MindCare without it.',
  },
  {
    question: 'Are my conversations saved?',
    answer: 'Conversations are associated with your account so the app can provide conversation history. Avoid sharing passwords or details you do not need to share, and review the privacy notice for details about data handling.',
  },
  {
    question: 'What if I need more support?',
    answer: 'Consider reaching out to someone you trust or a qualified professional. If you may be in immediate danger, contact local emergency services. In India, Tele-MANAS is available at 14416.',
  },
]

function Brand({ light = false }) {
  return (
    <a className={`mc-landing-brand${light ? ' is-light' : ''}`} href="#top" aria-label="MindCare home">
      <span className="mc-brand-mark">
        <img src="/brand/mindcare-mark.png" alt="" />
      </span>
      <span className="mc-brand-name">mindcare<span>.</span></span>
    </a>
  )
}

const previewScenarios = [
  {
    id: 'work',
    label: 'Work & study',
    user: 'I keep worrying that I’m falling behind.',
    response: 'That is a tiring thought to carry. What part feels most urgent today?',
    followups: ['Too much to do', 'Fear of falling behind', 'Not sure yet'],
  },
  {
    id: 'compare',
    label: 'Comparing myself',
    user: 'Everyone else seems to be moving forward.',
    response: 'It can be hard when other people’s timelines become the measure for your own. What are you comparing most?',
    followups: ['Career progress', 'Expectations from others', 'Not sure yet'],
  },
  {
    id: 'overwhelmed',
    label: 'Feeling overwhelmed',
    user: 'Everything feels like a lot right now.',
    response: 'We do not have to untangle everything at once. Is there one thing taking up the most space today?',
    followups: ['One specific problem', 'Too many things', 'I can’t tell yet'],
  },
  {
    id: 'unsure',
    label: 'Not sure yet',
    user: 'I don’t really know how to explain how I feel.',
    response: 'That is an okay place to start. We can begin with how the last few days have felt, without needing a label.',
    followups: ['The last few days', 'One moment', 'I’d rather just start'],
  },
]

function ProductPreview() {
  const [activeId, setActiveId] = useState('compare')
  const [activeFollowup, setActiveFollowup] = useState(null)
  const scenario = previewScenarios.find(item => item.id === activeId) || previewScenarios[1]
  const activeIndex = previewScenarios.findIndex(item => item.id === scenario.id)

  function chooseScenario(id) {
    setActiveId(id)
    setActiveFollowup(null)
  }

  return (
    <div className="mc-preview-scene" aria-label="Interactive sample conversation. Choose a topic to change the example.">
      <div className="mc-preview-caption"><span className="mc-preview-caption-mark"><MessageCircle size={14} /></span><span>Try a starting point</span><span className="mc-caption-hint">A small interactive example</span></div>
      <article className="mc-product-window">
        <header className="mc-product-topbar">
          <span className="mc-product-mark"><img src="/brand/mindcare-mark.png" alt="" /></span>
          <div className="mc-product-branding">
            <strong>MindCare</strong>
            <span>A space to reflect</span>
          </div>
          <span className="mc-preview-label"><span className="mc-preview-label-dot" /> SAMPLE</span>
        </header>

        <div className="mc-product-context">
          <span className="mc-product-kicker">START WHERE YOU ARE</span>
          <span className="mc-context-dot" />
          <span className="mc-product-context-text">Choose what feels closest</span>
        </div>

        <div className="mc-preview-interaction">
          <div className="mc-preview-choice-heading">
            <span>What’s on your mind?</span>
            <span>{String(activeIndex + 1).padStart(2, '0')} <i>/</i> 04</span>
          </div>
          <div className="mc-product-prompt-list" role="group" aria-label="Choose an example topic">
            {previewScenarios.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={'mc-preview-choice' + (item.id === activeId ? ' is-active' : '')}
                aria-pressed={item.id === activeId}
                onClick={() => chooseScenario(item.id)}
              >
                <span className="mc-choice-number">0{index + 1}</span>
                <span>{item.label}</span>
                <span className="mc-choice-check" aria-hidden="true">{item.id === activeId ? '✓' : '↗'}</span>
              </button>
            ))}
          </div>

          <div className="mc-preview-exchange" aria-live="polite" aria-atomic="true">
            <div className="mc-product-message user-message" key={scenario.id + '-user'}>
              <span className="mc-message-author">YOU MIGHT SAY</span>
              <p>“{scenario.user}”</p>
            </div>
            <div className="mc-product-message assistant-message" key={scenario.id + '-assistant'}>
              <span className="mc-assistant-avatar"><Heart size={13} strokeWidth={1.8} /></span>
              <div className="mc-preview-response-copy">
                <span className="mc-message-author">A POSSIBLE RESPONSE</span>
                <p>{scenario.response}</p>
              </div>
            </div>
          </div>

          <div className="mc-preview-followups">
            <span className="mc-product-prompt-label">You could explore…</span>
            <div className="mc-preview-followup-list">
              {scenario.followups.map((followup, index) => (
                <button
                  key={followup}
                  type="button"
                  className={'mc-preview-followup' + (activeFollowup === followup ? ' is-selected' : '')}
                  aria-pressed={activeFollowup === followup}
                  onClick={() => setActiveFollowup(followup)}
                >
                  {followup}
                </button>
              ))}
            </div>
            {activeFollowup && (
              <p className="mc-preview-followup-note">A possible next step to explore: <strong>{activeFollowup.toLowerCase()}</strong>. In MindCare, your own conversation starts after you sign in.</p>
            )}
          </div>
        </div>

        <footer className="mc-product-footnote">
          <span className="mc-footnote-lock"><LockKeyhole size={12} /></span>
          <span>Sample only. Nothing is sent or saved from this preview.</span>
        </footer>
      </article>
    </div>
  )
}

function FeatureArtwork({ tone }) {
  if (tone === 'green') {
    return (
      <svg viewBox="0 0 560 220" className="mc-feature-art-svg" aria-hidden="true" focusable="false">
        <rect width="560" height="220" fill="#E7EEE1" />
        <path d="M0 174C92 131 142 216 245 181S424 105 560 153V220H0Z" fill="#D5E2CD" />
        <circle cx="490" cy="22" r="104" fill="#D0DFC9" />
        <path d="M44 45C67 19 93 20 113 38" fill="none" stroke="#83A28A" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="42" cy="48" r="3" fill="#83A28A" />
        <g transform="translate(76 19) rotate(-3 168 88)">
          <rect x="9" y="8" width="326" height="176" rx="19" fill="#B6C8B0" opacity=".45" />
          <rect x="0" y="0" width="326" height="176" rx="19" fill="#FCFBF5" stroke="#DCE5D7" />
          <text x="21" y="25" fill="#7C9380" fontSize="8" fontWeight="700" letterSpacing="1.5">A MOMENT, PUT INTO WORDS</text>
          <rect x="19" y="40" width="215" height="52" rx="12" fill="#EDF2E8" />
          <text x="31" y="60" fill="#425B49" fontSize="11">“I don’t know where</text>
          <text x="31" y="76" fill="#425B49" fontSize="11">to start.”</text>
          <circle cx="279" cy="65" r="17" fill="#E0EBDD" />
          <path d="M272 65c0-4 6-6 7-1 2-5 8-3 7 1l-7 7Z" fill="none" stroke="#4F7B60" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M20 110H304" stroke="#E7E9DF" />
          <circle cx="30" cy="137" r="11" fill="#E2ECDD" />
          <path d="M25 137h10m-5-5v10" stroke="#5F8766" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="49" y="127" width="204" height="8" rx="4" fill="#DCE5D8" />
          <rect x="49" y="143" width="150" height="6" rx="3" fill="#E9EDE5" />
        </g>
        <g transform="translate(333 131) rotate(3)">
          <rect width="184" height="54" rx="13" fill="#285B48" />
          <circle cx="22" cy="20" r="5" fill="#B9D0B5" />
          <rect x="34" y="16" width="121" height="5" rx="2.5" fill="#E4EEE0" opacity=".9" />
          <rect x="34" y="27" width="94" height="5" rx="2.5" fill="#C2D8BE" opacity=".8" />
          <path d="M18 54l8 0-6 8Z" fill="#285B48" />
        </g>
      </svg>
    )
  }
  if (tone === 'amber') {
    return (
      <svg viewBox="0 0 560 220" className="mc-feature-art-svg" aria-hidden="true" focusable="false">
        <rect width="560" height="220" fill="#F1E3D7" />
        <path d="M0 170C120 126 194 222 326 177S471 151 560 166V220H0Z" fill="#E8D3C3" />
        <circle cx="480" cy="30" r="93" fill="#EBD2BF" />
        <path d="M60 36c13-15 30-15 43 0m-5-11 8 11-12 2" fill="none" stroke="#BB896A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <g transform="translate(132 15) rotate(4 145 94)">
          <rect x="13" y="8" width="286" height="184" rx="14" fill="#CDAE98" opacity=".38" />
          <rect width="286" height="184" rx="14" fill="#FFFBF4" stroke="#E5D4C6" />
          <path d="M38 0v184" stroke="#E7C5B1" strokeWidth="1.2" />
          <text x="56" y="28" fill="#A97656" fontSize="8" fontWeight="700" letterSpacing="1.4">A GENTLE CHECK-IN</text>
          <text x="56" y="48" fill="#344A3C" fontSize="14" fontFamily="Georgia,serif">How have things felt?</text>
          <g transform="translate(56 66)">
            <circle cx="8" cy="7" r="7" fill="#D9E6D2" /><path d="m4 7 3 3 5-6" fill="none" stroke="#4F7B58" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="24" y="3" width="155" height="7" rx="3.5" fill="#DCE4D7" />
          </g>
          <g transform="translate(56 94)">
            <circle cx="8" cy="7" r="7" fill="#F0DFD1" /><path d="M4 7h8" stroke="#A66A4C" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="24" y="3" width="137" height="7" rx="3.5" fill="#E8E6DB" />
          </g>
          <g transform="translate(56 122)">
            <circle cx="8" cy="7" r="7" fill="#E8E9E0" /><path d="M4 7h8" stroke="#90998B" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="24" y="3" width="168" height="7" rx="3.5" fill="#E8E6DB" />
          </g>
          <path d="M56 153H249" stroke="#E9E0D6" />
          <text x="56" y="169" fill="#9C7A62" fontSize="8">No right or wrong answer.</text>
        </g>
        <g transform="translate(30 135) rotate(-5)">
          <rect width="113" height="52" rx="13" fill="#FBF4E9" stroke="#E5D4C4" />
          <circle cx="20" cy="19" r="5" fill="#D4A17E" />
          <rect x="33" y="16" width="61" height="5" rx="2.5" fill="#CFB8A5" />
          <rect x="15" y="33" width="79" height="5" rx="2.5" fill="#E9DCD0" />
        </g>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 560 220" className="mc-feature-art-svg" aria-hidden="true" focusable="false">
      <rect width="560" height="220" fill="#E2EAEB" />
      <path d="M0 165C107 194 184 123 294 164S450 203 560 150V220H0Z" fill="#D0DFE0" />
      <circle cx="475" cy="28" r="94" fill="#D2E0E2" />
      <g stroke="#71909B" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M78 51V30h22M78 51v17M78 152v22h22M78 152v-17M397 51V30h-22M397 51v17M397 152v22h-22M397 152v-17" />
      </g>
      <g transform="translate(145 16)">
        <rect width="184" height="174" rx="80" fill="#C9DADB" />
        <path d="M36 174c7-36 32-52 56-52s51 16 57 52" fill="#8EA8AB" />
        <path d="M66 66c0-30 19-48 39-48 23 0 39 19 39 48v23c0 28-18 47-39 47S66 117 66 89Z" fill="#F4E8D9" stroke="#7E9A9D" strokeWidth="1.4" />
        <path d="M68 65c1-27 16-44 38-44 23 0 38 16 39 44-9-4-18-13-22-23-10 13-31 22-55 23Z" fill="#476B67" />
        <path d="M83 82h8m25 0h8" stroke="#587B7A" strokeWidth="2" strokeLinecap="round" />
        <path d="M98 99c6 4 12 4 18 0" stroke="#B77D65" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M103 85l-2 8 5 1" stroke="#C69A82" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      <g transform="translate(342 52) rotate(4)">
        <rect width="165" height="79" rx="14" fill="#FBFAF4" stroke="#D4E0DF" />
        <text x="15" y="20" fill="#80949A" fontSize="7.5" fontWeight="700" letterSpacing="1">OPTIONAL VISUAL TOOL</text>
        <rect x="15" y="31" width="135" height="6" rx="3" fill="#D9E5E5" />
        <rect x="15" y="44" width="98" height="6" rx="3" fill="#E7EAE3" />
        <text x="15" y="66" fill="#547A81" fontSize="8">An expression estimate only.</text>
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
        <span className="mc-feature-art-index">{feature.number}<span> / 03</span></span>
        <span className="mc-feature-art-label"><Icon size={13} strokeWidth={1.8} />{feature.label}</span>
      </div>
      <div className="mc-feature-content">
        <div className="mc-feature-content-heading">
          <h3>{feature.title}</h3>
          <span className="mc-feature-icon"><Icon size={17} strokeWidth={1.7} /></span>
        </div>
        <p className="mc-feature-body">{feature.body}</p>
        <button type="button" className="mc-feature-explore" aria-pressed={isActive} onClick={() => onSelect(index)}>
          <span>{isActive ? 'In focus' : 'Explore this'}</span><ArrowRight size={14} />
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
    if (rail && card) {
      const railLeft = rail.getBoundingClientRect().left
      const cardLeft = card.getBoundingClientRect().left
      rail.scrollTo({ left: rail.scrollLeft + cardLeft - railLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
    setActiveFeatureIndex(safeIndex)
  }

  const moveFeature = (direction) => moveFeatureTo(activeFeatureIndex + direction)

  const handleFeatureRailScroll = () => {
    const rail = featureRailRef.current
    if (!rail) return
    const railLeft = rail.getBoundingClientRect().left
    let nearest = activeFeatureIndex
    let nearestDistance = Number.POSITIVE_INFINITY
    featureCardRefs.current.forEach((card, index) => {
      if (!card) return
      const distance = Math.abs(card.getBoundingClientRect().left - railLeft)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = index
      }
    })
    setActiveFeatureIndex(current => current === nearest ? current : nearest)
  }

  return (
    <div className="mc-landing" id="top">
      <header className="mc-site-header">
        <div className="mc-header-inner">
          <Brand />
          <button
            className="mc-mobile-menu-toggle"
            type="button"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileNavOpen(value => !value)}
          >
            {mobileNavOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <nav className={`mc-site-nav${mobileNavOpen ? ' is-open' : ''}`} aria-label="Main navigation">
            <a href="#approach" onClick={closeMobileNav}>What you can do</a>
            <a href="#how-it-works" onClick={closeMobileNav}>How it works</a>
            <a href="#care-and-privacy" onClick={closeMobileNav}>Care & privacy</a>
            <button type="button" className="mc-nav-signin" onClick={() => { closeMobileNav(); handleSignIn?.() }}>Sign in</button>
            <button type="button" className="mc-button mc-button-dark mc-nav-cta" onClick={() => { closeMobileNav(); onGetStarted?.() }}>
              Get started <ArrowRight size={15} />
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mc-hero" aria-labelledby="mc-hero-title">
          <div className="mc-hero-inner">
            <div className="mc-hero-copy">
              <p className="mc-eyebrow"><span className="mc-eyebrow-line" />A little room to think</p>
              <h1 id="mc-hero-title">Start with what’s on your <em>mind.</em></h1>
              <p className="mc-hero-lede">Some things are easier to face when you can put them into words. MindCare gives you a place to talk, reflect, and explore what might help next — at your own pace.</p>
              <div className="mc-hero-actions">
                <button type="button" className="mc-button mc-button-dark" onClick={onGetStarted}>
                  Start a conversation <ArrowRight size={17} />
                </button>
                <a className="mc-text-link" href="#how-it-works">Get to know MindCare <ArrowDownRight size={16} /></a>
              </div>
              <div className="mc-hero-note">
                <span className="mc-note-lock"><LockKeyhole size={15} /></span>
                <p><strong>Your pace. Your choice.</strong><br />Share only what you feel comfortable sharing.</p>
              </div>
            </div>
            <ProductPreview />
          </div>
          <div className="mc-hero-bottomline"><span>NO PERFECT WORDS REQUIRED</span><span className="mc-bottomline-rule" /><span>ONE THING AT A TIME</span></div>
        </section>

        <section className="mc-intro-strip" aria-label="MindCare principles">
          <div className="mc-intro-inner">
            <div><span className="mc-intro-number">01</span><span>Start with your own words</span></div>
            <div><span className="mc-intro-number">02</span><span>Reflect at your own pace</span></div>
            <div><span className="mc-intro-number">03</span><span>Choose what feels useful</span></div>
          </div>
        </section>

        <section className="mc-section mc-approach" id="approach" aria-labelledby="mc-approach-title">
          <div className="mc-section-heading mc-feature-section-heading">
            <div className="mc-feature-heading-copy">
              <p className="mc-eyebrow"><span className="mc-eyebrow-line" />Ways to begin</p>
              <h2 id="mc-approach-title">There’s more than one <em>way in.</em></h2>
            </div>
            <div className="mc-feature-carousel-side">
              <p className="mc-section-aside">Take a look around. Choose just one thing that feels useful today.</p>
              <div className="mc-feature-controls" aria-label="Browse ways to begin">
                <span className="mc-feature-count" aria-live="polite"><strong>{String(activeFeatureIndex + 1).padStart(2, '0')}</strong><i> / 03</i></span>
                <button type="button" className="mc-feature-arrow" aria-label="Previous card" onClick={() => moveFeature(-1)} disabled={activeFeatureIndex === 0}><ChevronLeft size={18} /></button>
                <button type="button" className="mc-feature-arrow" aria-label="Next card" onClick={() => moveFeature(1)} disabled={activeFeatureIndex === features.length - 1}><ChevronRight size={18} /></button>
              </div>
            </div>
          </div>
          <div className="mc-feature-carousel">
            <div className="mc-feature-grid" ref={featureRailRef} onScroll={handleFeatureRailScroll} role="region" aria-label="MindCare ways to begin. Swipe or scroll horizontally to explore." tabIndex={0}>
              {features.map((feature, index) => (
                <FeatureCard
                  key={feature.number}
                  feature={feature}
                  index={index}
                  isActive={index === activeFeatureIndex}
                  onSelect={moveFeatureTo}
                  cardRef={element => { featureCardRefs.current[index] = element }}
                />
              ))}
            </div>
            <div className="mc-feature-rail-footer">
              <div className="mc-feature-pagination" role="group" aria-label="Go to a way to begin">
                {features.map((feature, index) => (
                  <button key={feature.number} type="button" className={`mc-feature-page-dot${index === activeFeatureIndex ? ' is-active' : ''}`} aria-label={`Show card ${index + 1}: ${feature.title}`} aria-pressed={index === activeFeatureIndex} onClick={() => moveFeatureTo(index)} />
                ))}
              </div>
              <p><span className="mc-swipe-hint-icon"><ArrowRight size={12} /></span> Swipe or use arrows to explore</p>
            </div>
          </div>
        </section>

        <section className="mc-how-section" id="how-it-works" aria-labelledby="mc-how-title">
          <div className="mc-how-inner">
            <div className="mc-how-heading">
              <p className="mc-eyebrow mc-eyebrow-light"><span className="mc-eyebrow-line" />A small, human process</p>
              <h2 id="mc-how-title">We can take it <em>one piece at a time.</em></h2>
              <p>No perfect explanation. No pressure to solve your whole day. Explore how a conversation can move from getting it out, to finding a little clarity, to choosing what feels useful next.</p>
              <div className="mc-how-reassurance">
                <span className="mc-how-reassurance-icon"><LockKeyhole size={15} /></span>
                <span><strong>You stay in charge.</strong><br />Skip a step, change your mind, or take a pause.</span>
              </div>
              <button type="button" className="mc-button mc-button-light" onClick={onGetStarted}>
                Start with a conversation <ArrowRight size={16} />
              </button>
            </div>

            <div className="mc-journey-explorer">
              <div className="mc-journey-topline">
                <span><span className="mc-journey-live-dot" /> HOW A CONVERSATION CAN UNFOLD</span>
                <span className="mc-journey-counter">{currentJourneyStep.number}<i> / 03</i></span>
              </div>

              <div className="mc-journey-cards" role="group" aria-label="Choose a step to explore">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  const isActive = index === activeJourneyStep
                  return (
                    <button
                      key={step.number}
                      id={`mc-journey-tab-${index}`}
                      type="button"
                      className={`mc-journey-card mc-journey-${step.tone}${isActive ? ' is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => setActiveJourneyStep(index)}
                    >
                      <span className="mc-journey-card-top"><span className="mc-journey-number">{step.number}</span><Icon size={17} strokeWidth={1.7} /></span>
                      <span className="mc-journey-card-title">{step.title}</span>
                      <span className="mc-journey-card-summary">{step.summary}</span>
                      <span className="mc-journey-card-indicator" aria-hidden="true"><ArrowDownRight size={15} /></span>
                    </button>
                  )
                })}
              </div>

              <div
                className="mc-journey-panel"
                id="mc-journey-panel"
                role="region"
                aria-label={`Step details: ${currentJourneyStep.title}`}
                aria-live="polite"
              >
                <div className="mc-journey-panel-content" key={activeJourneyStep}>
                  <div className="mc-journey-panel-heading">
                    <span className={`mc-journey-panel-icon mc-journey-${currentJourneyStep.tone}`}>
                      <CurrentJourneyIcon size={18} strokeWidth={1.7} />
                    </span>
                    <div>
                      <span className="mc-journey-panel-kicker">{currentJourneyStep.label}</span>
                      <h3>{currentJourneyStep.title}</h3>
                    </div>
                  </div>
                  <p className="mc-journey-panel-body">{currentJourneyStep.body}</p>
                  <div className="mc-journey-example">
                    <span className="mc-journey-example-label">IT MIGHT SOUND LIKE</span>
                    <p>“{currentJourneyStep.example}”</p>
                  </div>
                  <div className="mc-journey-question">
                    <span className="mc-journey-question-mark"><MessageCircle size={14} /></span>
                    <div><span>A question to gently open things up</span><p>{currentJourneyStep.question}</p></div>
                  </div>
                </div>
              </div>

              <div className="mc-journey-footer">
                <div className="mc-journey-progress" aria-label={`Step ${activeJourneyStep + 1} of 3`}>
                  {steps.map((step, index) => <span key={step.number} className={index <= activeJourneyStep ? 'is-filled' : ''} />)}
                </div>
                <span>Explore the steps in any order</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mc-care-section" id="care-and-privacy" aria-labelledby="mc-care-title">
          <div className="mc-care-stamp" aria-hidden="true"><BookOpen size={20} /><span>READ<br />WITH CARE</span></div>
          <div className="mc-care-copy">
            <p className="mc-eyebrow"><span className="mc-eyebrow-line" />A note on care & privacy</p>
            <h2 id="mc-care-title">Your story is yours. <em>So are your choices.</em></h2>
            <p>Conversations are associated with your account so you can revisit your history. Avoid sharing passwords or personal details you do not need to share, and review the privacy notice for information about data handling.</p>
            <p>AI can misunderstand or get things wrong. MindCare supports reflection; it is not a diagnosis, therapy, or emergency service. You remain in charge of what you share and what steps you take.</p>
            <div className="mc-care-actions">
              <button type="button" className="mc-text-link mc-text-link-button" onClick={() => setLegalView('privacy')}>Read the privacy notice <ArrowUpRight size={15} /></button>
              <button type="button" className="mc-text-link mc-text-link-button" onClick={() => setLegalView('terms')}>Read the terms <ArrowUpRight size={15} /></button>
            </div>
          </div>
          <aside className="mc-help-note">
            <div className="mc-help-note-icon"><LifeBuoy size={19} /></div>
            <p className="mc-help-kicker">When you need more support</p>
            <h3>An app should not be your only source of help.</h3>
            <p>Consider speaking with someone you trust or a qualified professional. If you may be in immediate danger, contact local emergency services.</p>
            <a href="https://dghs.mohfw.gov.in/national-mental-health-programme.php" target="_blank" rel="noreferrer" className="mc-help-link">India: Tele-MANAS · 14416 <ArrowUpRight size={14} /></a>
          </aside>
        </section>

        <section className="mc-faq-section" aria-labelledby="mc-faq-title">
          <div className="mc-faq-heading">
            <p className="mc-eyebrow"><span className="mc-eyebrow-line" />Before you begin</p>
            <h2 id="mc-faq-title">A few clear answers.</h2>
          </div>
          <div className="mc-faq-list">
            {faqs.map(faq => (
              <details className="mc-faq-item" key={faq.question}>
                <summary>{faq.question}<ChevronDown size={17} /></summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mc-final-cta" aria-labelledby="mc-final-cta-title">
          <div className="mc-final-ornament" aria-hidden="true"><span /><span /><span /><span /><span /></div>
          <p className="mc-eyebrow mc-eyebrow-light"><span className="mc-eyebrow-line" />Start where you are</p>
          <h2 id="mc-final-cta-title">One thing at a time.</h2>
          <p>You do not have to solve the whole day to take a first step.</p>
          <button type="button" className="mc-button mc-button-paper" onClick={onGetStarted}>
            Start with one thought <ArrowRight size={16} />
          </button>
          <span className="mc-final-small">AI-assisted reflection · Not a diagnostic or emergency service</span>
        </section>
      </main>

      <footer className="mc-footer">
        <div className="mc-footer-main">
          <div className="mc-footer-brand">
            <Brand light />
            <p>A little more room to think, at your own pace.</p>
          </div>
          <div className="mc-footer-links">
            <div>
              <span className="mc-footer-heading">Explore</span>
              <a href="#approach">Ways to begin</a>
              <a href="#how-it-works">How it works</a>
              <button type="button" onClick={onGetStarted}>Get started</button>
            </div>
            <div>
              <span className="mc-footer-heading">Information</span>
              <button type="button" onClick={() => setLegalView('privacy')}>Privacy notice</button>
              <button type="button" onClick={() => setLegalView('terms')}>Terms of use</button>
              <a href="https://github.com/mohitagg07/Mindcare" target="_blank" rel="noreferrer">Project on GitHub <ArrowUpRight size={12} /></a>
            </div>
          </div>
        </div>
        <div className="mc-footer-bottom">
          <span>© {new Date().getFullYear()} MindCare</span>
          <span>Built thoughtfully. Use what helps; leave what doesn’t.</span>
        </div>
      </footer>

      {legalView && <LegalNotice view={legalView} onClose={() => setLegalView('')} />}
    </div>
  )
}
