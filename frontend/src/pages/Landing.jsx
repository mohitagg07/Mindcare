import { useState } from 'react'
import LegalNotice from '../components/LegalNotice'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
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

function FeatureCard({ feature }) {
  const Icon = feature.icon
  return (
    <article className={`mc-feature-card mc-feature-${feature.tone}`}>
      <div className="mc-feature-topline">
        <span className="mc-feature-number">{feature.number}</span>
        <span className="mc-feature-icon"><Icon size={19} strokeWidth={1.7} /></span>
      </div>
      <p className="mc-feature-label">{feature.label}</p>
      <h3>{feature.title}</h3>
      <p className="mc-feature-body">{feature.body}</p>
      <span className="mc-feature-end" aria-hidden="true"><ArrowUpRight size={16} /></span>
    </article>
  )
}

export default function Landing({ onGetStarted, onSignIn }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [legalView, setLegalView] = useState('')
  const [activeJourneyStep, setActiveJourneyStep] = useState(0)
  const currentJourneyStep = steps[activeJourneyStep] || steps[0]
  const CurrentJourneyIcon = currentJourneyStep.icon
  const handleSignIn = onSignIn || onGetStarted
  const closeMobileNav = () => setMobileNavOpen(false)

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
          <div className="mc-section-heading">
            <div>
              <p className="mc-eyebrow"><span className="mc-eyebrow-line" />Ways to begin</p>
              <h2 id="mc-approach-title">A few tools. <em>No pressure to use them all.</em></h2>
            </div>
            <p className="mc-section-aside">Use what feels helpful today. Leave the rest for another time.</p>
          </div>
          <div className="mc-feature-grid">
            {features.map(feature => <FeatureCard key={feature.number} feature={feature} />)}
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
