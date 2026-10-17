import { useEffect } from 'react'
import { X, ShieldCheck, Scale } from 'lucide-react'

export default function LegalNotice({ view, onClose }) {
  const isPrivacy = view === 'privacy'
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="legal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="legal-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-notice-title">
        <header className="legal-dialog-header">
          <div className="legal-dialog-icon">{isPrivacy ? <ShieldCheck size={19}/> : <Scale size={19}/>}</div>
          <div className="legal-dialog-title-wrap">
            <span className="legal-dialog-eyebrow">MINDCARE · IMPORTANT INFORMATION</span>
            <h2 id="legal-notice-title">{isPrivacy ? 'Privacy notice' : 'Terms of use'}</h2>
          </div>
          <button type="button" className="legal-close" aria-label="Close notice" onClick={onClose}><X size={18}/></button>
        </header>
        {isPrivacy ? (
          <div className="legal-dialog-copy">
            <p><strong>What may be stored.</strong> Account details, conversation messages, assessment scores and answers, and related activity may be stored by the configured Supabase project so the app can provide account-based features.</p>
            <p><strong>AI providers.</strong> Messages you send are processed by the configured Groq service to generate replies. If you explicitly enable the optional camera or upload an image, that image is sent for the requested visual estimate.</p>
            <p><strong>Browser storage.</strong> This build stores authentication tokens and the active session identifier in browser local storage. Use a personal device and sign out when finished.</p>
            <p><strong>Limitations.</strong> This is an application privacy summary, not a complete legal policy. Before public launch, the operator must document retention periods, deletion requests, access controls, and the relevant data-controller contact.</p>
            <p><strong>Share carefully.</strong> Avoid entering passwords, payment details, or information that is not needed for your reflection.</p>
          </div>
        ) : (
          <div className="legal-dialog-copy">
            <p><strong>Support, not healthcare.</strong> MindCare provides AI-assisted reflection and is not a diagnostic tool, therapist, healthcare provider, or emergency service.</p>
            <p><strong>Screening limits.</strong> The PHQ-9 is a self-reflection screening questionnaire. Its result and any visual-expression estimate do not establish a diagnosis or reliably determine a person's emotional state.</p>
            <p><strong>AI can be wrong.</strong> Responses and resources may be incomplete or inaccurate. Use your judgement and consult a qualified professional for health concerns.</p>
            <p><strong>Urgent support in India.</strong> Tele-MANAS provides nationwide mental-health support at <a href="tel:14416">14416</a>. If you are in immediate danger, contact local emergency services or someone who can help you now.</p>
            <p><strong>Development version.</strong> The app’s availability depends on its configured backend and third-party services. Do not rely on it as the only way to obtain support.</p>
          </div>
        )}
        <footer className="legal-dialog-footer"><span>Read with care · Updated October 2026</span><button type="button" className="cta-main" onClick={onClose}>I understand</button></footer>
      </section>
    </div>
  )
}
