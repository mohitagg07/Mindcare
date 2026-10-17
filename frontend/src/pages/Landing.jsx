import { useState } from 'react'
import LegalNotice from '../components/LegalNotice'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Feather,
  Heart,
  LifeBuoy,
  LockKeyhole,
  Menu,
  MessageCircle,
  Sparkles,
  X,
} from 'lucide-react'
import './Landing.css'

const features = [
  {
    number: '01',
    icon: MessageCircle,
    title: 'Talk it through',
    description: 'Start with what is actually on your mind. You do not need the perfect words or a clear answer before you begin.',
    note: 'Open conversation',
    tone: 'sage',
  },
  {
    number: '02',
    icon: ClipboardList,
    title: 'Reflect with structure',
    description: 'PHQ-9 and GAD-7 self-screeners can help you review symptoms in a more structured way. Results are not a diagnosis.',
    note: 'Optional check-ins',
    tone: 'clay',
  },
  {
    number: '03',
    icon: Feather,
    title: 'Keep the choice yours',
    description: 'An optional image-based tool estimates visible facial expression only. It cannot tell you what you truly feel or diagnose a condition.',
    note: 'Optional visual estimate',
    tone: 'blue',
  },
]

const steps = [
  {
    number: '01',
    title: 'Bring one thing',
    body: 'A hard day, a repeating thought, or a feeling you have not quite found words for yet.',
  },
  {
    number: '02',
    title: 'Make room to reflect',
    body: 'Use a conversation or a structured check-in to look at what you are experiencing, at your own pace.',
  },
  {
    number: '03',
    title: 'Choose what feels useful',
    body: 'Take away a thought, a question to explore, or a small next step that you decide is right for you.',
  },
]

const faqs = [
  {
    question: 'Is MindCare a therapist or a diagnostic tool?',
    answer: 'No. MindCare offers AI-assisted conversation and self-reflection tools. It does not diagnose conditions, provide therapy, or replace a qualified mental-health professional.',
  },
  {
    question: 'Do I have to use the camera?',
    answer: 'No. The visual-expression tool is optional. A facial expression is not a reliable measure of someone’s internal emotional state, and you can use MindCare without it.',
  },
  {
    question: 'Are my conversations saved?',
    answer: 'Conversations are associated with your account so the app can provide conversation history. Do not share passwords or details you do not need to share. Review the privacy notice for more information about data handling.',
  },
  {
    question: 'What if I need more support than an app can provide?',
    answer: 'Consider contacting someone you trust or a qualified professional. If you may be in immediate danger, contact local emergency services. In India, Tele-MANAS can be reached at 14416.',
  },
]

function Brand({ light = false }) {
  return (
    <a className={light ? 'mc-brand mc-brand-light' : 'mc-brand'} href="#top" aria-label="MindCare home">
      <span className="mc-brand-symbol">
        <img src="/brand/mindcare-mark.png" alt="" />
      </span>
      <span className="mc-brand-word">MindCare<span>.</span></span>
    </a>
  )
}

function ReflectionIllustration() {
  return (
    <div className="mc-hero-art" aria-label="An illustration of a thought being gently unpacked">
      <div className="mc-art-orbit mc-art-orbit-one" />
      <div className="mc-art-orbit mc-art-orbit-two" />
      <div className="mc-art-caption"><span className="mc-caption-dot" /> A little space to think</div>
      <div className="mc-art-paper mc-art-paper-back">
        <span className="mc-paper-kicker">A NOTE TO SELF</span>
        <span className="mc-paper-line mc-paper-line-long" />
        <span className="mc-paper-line mc-paper-line-mid" />
        <span className="mc-paper-line mc-paper-line-short" />
        <span className="mc-paper-stamp">take<br />your time</span>
      </div>
      <div className="mc-art-paper mc-art-paper-front">
        <div className="mc-note-topline"><span>RIGHT NOW</span><span className="mc-note-spark"><Sparkles size={14} /></span></div>
        <p className="mc-note-question">“I have a lot on my mind. I don’t know where to start.”</p>
        <div className="mc-note-divider" />
        <div className="mc-note-response">
          <span className="mc-note-heart"><Heart size={13} /></span>
          <p>That’s okay. We can take it one piece at a time.</p>
        </div>
        <div className="mc-note-followup">What feels heaviest today?</div>
      </div>
      <div className="mc-art-side-note">
        <span className="mc-side-note-mark"><Feather size={15} /></span>
        <span>There is no perfect<br />way to begin.</span>
      </div>
      <svg className="mc-art-doodle" viewBox="0 0 150 62" fill="none" aria-hidden="true">
        <path d="M5 48C26 4 53 4 64 28C73 49 88 55 103 32C115 13 131 8 145 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M119 8L145 15L135 35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function FeatureCard({ feature }) {
  const Icon = feature.icon
  return (
    <article className={'mc-feature-card mc-tone-' + feature.tone}>
      <div className="mc-feature-meta">
        <span>{feature.number} / 03</span>
        <span className="mc-feature-icon"><Icon size={19} strokeWidth={1.7} /></span>
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
      <div className="mc-feature-foot"><span className="mc-feature-marker" />{feature.note}</div>
    </article>
  )
}

export default function Landing({ onGetStarted, onSignIn }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [legalView, setLegalView] = useState('')
  const handleSignIn = onSignIn || onGetStarted
  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <div className="mc-landing" id="top">
      <div className="mc-grain" aria-hidden="true" />
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
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className={'mc-site-nav' + (mobileNavOpen ? ' is-open' : '')} aria-label="Main navigation">
            <a href="#approach" onClick={closeMobileNav}>Our approach</a>
            <a href="#how-it-works" onClick={closeMobileNav}>How it works</a>
            <a href="#care-and-privacy" onClick={closeMobileNav}>Care & privacy</a>
            <button type="button" className="mc-nav-signin" onClick={() => { closeMobileNav(); handleSignIn?.() }}>Sign in</button>
            <button type="button" className="mc-button mc-button-dark mc-nav-cta" onClick={() => { closeMobileNav(); onGetStarted?.() }}>
              Start here <ArrowUpRight size={16} />
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mc-hero" aria-labelledby="mc-hero-title">
          <div className="mc-hero-inner">
            <div className="mc-hero-copy">
              <p className="mc-eyebrow"><span className="mc-eyebrow-line" />A calmer place to begin</p>
              <h1 id="mc-hero-title">You don’t have to make sense of <em>everything</em> at once.</h1>
              <p className="mc-hero-lede">Some days, it is enough to start with one thing. MindCare gives you space to talk, reflect, and explore what might help next — without needing to have the answers first.</p>
              <div className="mc-hero-actions">
                <button type="button" className="mc-button mc-button-dark" onClick={onGetStarted}>
                  Start with a conversation <ArrowRight size={17} />
                </button>
                <a className="mc-text-link" href="#how-it-works">Get to know MindCare <span aria-hidden="true">↓</span></a>
              </div>
              <div className="mc-hero-note">
                <span className="mc-note-lock"><LockKeyhole size={15} /></span>
                <p><strong>Your pace. Your choice.</strong><br />Share only what you feel comfortable sharing.</p>
              </div>
            </div>
            <ReflectionIllustration />
          </div>
          <div className="mc-hero-bottomline"><span>FOR THE DAYS THAT FEEL A LITTLE TOO FULL</span><span className="mc-bottomline-rule" /><span>TAKE IT ONE STEP AT A TIME</span></div>
        </section>

        <section className="mc-intro-strip" aria-label="MindCare principles">
          <div className="mc-intro-inner">
            <div><span className="mc-intro-number">01</span><span>Start with your own words</span></div>
            <div><span className="mc-intro-number">02</span><span>Reflect at your own pace</span></div>
            <div><span className="mc-intro-number">03</span><span>Stay in control of your choices</span></div>
          </div>
        </section>

        <section className="mc-section mc-approach" id="approach" aria-labelledby="mc-approach-title">
          <div className="mc-section-heading">
            <div>
              <p className="mc-eyebrow"><span className="mc-eyebrow-line" />What you can use</p>
              <h2 id="mc-approach-title">Support that meets you <em>where you are.</em></h2>
            </div>
            <p className="mc-section-aside">No grand promises. Just a few thoughtful ways to pause, put things into words, and reflect.</p>
          </div>
          <div className="mc-feature-grid">
            {features.map(feature => <FeatureCard key={feature.number} feature={feature} />)}
          </div>
        </section>

        <section className="mc-how-section" id="how-it-works" aria-labelledby="mc-how-title">
          <div className="mc-how-inner">
            <div className="mc-how-heading">
              <p className="mc-eyebrow mc-eyebrow-light"><span className="mc-eyebrow-line" />A simple way in</p>
              <h2 id="mc-how-title">You can begin <em>before</em> you know what you need.</h2>
              <p>There is no score to chase and no perfect way to explain yourself. Start with whatever feels easiest.</p>
              <button type="button" className="mc-button mc-button-light" onClick={onGetStarted}>
                Begin at your pace <ArrowRight size={16} />
              </button>
            </div>
            <div className="mc-steps" role="list" aria-label="How MindCare works">
              {steps.map((step, index) => (
                <article className="mc-step" key={step.number} role="listitem">
                  <span className="mc-step-number">{step.number}</span>
                  <div className="mc-step-copy">
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                  {index < steps.length - 1 && <span className="mc-step-connector" aria-hidden="true" />}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mc-care-section" id="care-and-privacy" aria-labelledby="mc-care-title">
          <div className="mc-care-stamp" aria-hidden="true"><BookOpen size={21} /><span>READ<br />WITH CARE</span></div>
          <div className="mc-care-copy">
            <p className="mc-eyebrow"><span className="mc-eyebrow-line" />A note on care & privacy</p>
            <h2 id="mc-care-title">Your story is yours. <em>Keep the choice, too.</em></h2>
            <p>MindCare conversations are associated with your account so you can revisit your history. Share thoughtfully, and avoid including passwords or personal details you do not need to share.</p>
            <p>AI can misunderstand or get things wrong. MindCare is a reflection tool, not a diagnosis, therapy, or emergency service. You remain in charge of what you share and what steps you take.</p>
            <div className="mc-care-actions">
              <button type="button" className="mc-text-link mc-text-link-button" onClick={() => setLegalView('privacy')}>Read the privacy notice <ArrowUpRight size={15} /></button>
              <button type="button" className="mc-text-link mc-text-link-button" onClick={() => setLegalView('terms')}>Read the terms <ArrowUpRight size={15} /></button>
            </div>
          </div>
          <aside className="mc-help-note">
            <div className="mc-help-note-icon"><LifeBuoy size={20} /></div>
            <p className="mc-help-kicker">When you need more support</p>
            <h3>An app should never be your only source of help.</h3>
            <p>Consider speaking with someone you trust or a qualified professional. If you may be in immediate danger, contact local emergency services.</p>
            <a href="https://dghs.mohfw.gov.in/national-mental-health-programme.php" target="_blank" rel="noreferrer" className="mc-help-link">India: Tele-MANAS · 14416 <ArrowUpRight size={14} /></a>
          </aside>
        </section>

        <section className="mc-faq-section" aria-labelledby="mc-faq-title">
          <div className="mc-faq-heading">
            <p className="mc-eyebrow"><span className="mc-eyebrow-line" />A few clear answers</p>
            <h2 id="mc-faq-title">Before you begin.</h2>
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
          <div className="mc-final-ornament" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </div>
          <p className="mc-eyebrow mc-eyebrow-light"><span className="mc-eyebrow-line" />One thing at a time</p>
          <h2 id="mc-final-cta-title">You can start small.</h2>
          <p>No need to solve the whole day. Begin with the part you can put into words.</p>
          <button type="button" className="mc-button mc-button-paper" onClick={onGetStarted}>
            Start with one thought <ArrowRight size={16} />
          </button>
          <span className="mc-final-small">MindCare offers AI-assisted reflection. It is not a diagnostic or emergency service.</span>
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
              <a href="#approach">What you can use</a>
              <a href="#how-it-works">How it works</a>
              <button type="button" onClick={onGetStarted}>Get started</button>
            </div>
            <div>
              <span className="mc-footer-heading">Information</span>
              <button type="button" onClick={() => setLegalView('privacy')}>Privacy notice</button>
              <button type="button" onClick={() => setLegalView('terms')}>Terms of use</button>
              <a href="https://github.com/mohitagg07" target="_blank" rel="noreferrer">Project on GitHub <ArrowUpRight size={12} /></a>
            </div>
          </div>
        </div>
        <div className="mc-footer-bottom">
          <span>© {new Date().getFullYear()} MindCare</span>
          <span>Made thoughtfully. Still learning, like all of us.</span>
        </div>
      </footer>

      {legalView && <LegalNotice view={legalView} onClose={() => setLegalView('')} />}
    </div>
  )
}
