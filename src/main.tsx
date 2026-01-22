import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import VoiceChat from './VoiceChat'
import Dashboard from './Dashboard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Onboarding, useOnboarding } from './components/Onboarding'
import './index.css'

function App() {
  const [view, setView] = useState<'voice' | 'dashboard'>('voice');
  const { hasCompletedOnboarding } = useOnboarding();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900">
        {!hasCompletedOnboarding && (
          <Onboarding onComplete={() => window.location.reload()} />
        )}

        {/* Navigation */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 backdrop-blur rounded-full px-2 py-2 flex gap-2 shadow-lg border border-slate-700">
          <button
            onClick={() => setView('voice')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              view === 'voice'
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎤 Voice
          </button>
          <button
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              view === 'dashboard'
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Dashboard
          </button>
        </nav>

        {/* Views */}
        {view === 'voice' ? <VoiceChat /> : <Dashboard />}
      </div>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
