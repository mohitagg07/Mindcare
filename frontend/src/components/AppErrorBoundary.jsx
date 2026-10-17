import { Component } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default class AppErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    // Keep production diagnostics free of message text, profile details, and props.
    if (import.meta.env.DEV) console.error('MindCare render error:', error?.name || 'Error')
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="app-render-error" role="alert">
        <div className="app-render-error-card">
          <span className="app-render-error-icon" aria-hidden="true"><AlertCircle size={21} /></span>
          <p className="app-render-error-kicker">A MOMENT TO RESET</p>
          <h1>This page didn’t load as expected.</h1>
          <p>Your saved account data is not affected. Reload MindCare to try again.</p>
          <button type="button" onClick={() => window.location.reload()}><RefreshCw size={15} /> Reload MindCare</button>
        </div>
      </main>
    )
  }
}
