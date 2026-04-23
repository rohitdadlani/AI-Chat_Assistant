import { useState, useRef, useCallback, useEffect } from 'react'
import TranscriptPanel  from './components/TranscriptPanel.jsx'
import SuggestionsPanel from './components/SuggestionsPanel.jsx'
import ChatPanel        from './components/ChatPanel.jsx'
import SettingsModal    from './components/SettingsModal.jsx'
import ExportButton     from './components/ExportButton.jsx'
import { useSuggestionEngine } from './hooks/useSuggestionEngine.js'
import { LS_API_KEY }   from './lib/constants.js'

// ── Toast ─────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return <div className={`toast ${type}`}>{message}</div>
}

// ── Logo ──────────────────────────────────────────────────────────────────
const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: 'linear-gradient(135deg, #22d3ee, #6366f1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, boxShadow: '0 0 16px rgba(34,211,238,0.35)',
    }}>🧠</div>
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>TwinMind</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>AI Meeting Copilot</div>
    </div>
  </div>
)

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  // ── Global state (API key, modal) ────────────────────────────────────
  const apiKeyRef = useRef(localStorage.getItem(LS_API_KEY) || '')
  const [showSettings, setShowSettings] = useState(!apiKeyRef.current)
  const [toast,        setToast]        = useState(null)

  // ── Shared transcript state ──────────────────────────────────────────
  // Lines displayed in TranscriptPanel
  const [transcriptLines, setTranscriptLines] = useState([])
  // Flat string for suggestion engine + chat context (stored in ref to avoid loops)
  const transcriptRef = useRef('')

  // ── Suggestion state (owned here, passed to SuggestionsPanel) ────────
  const [suggestions,      setSuggestions]      = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  // ── Injected suggestion → ChatPanel ──────────────────────────────────
  const [injectedSuggestion, setInjectedSuggestion] = useState(null)

  // ── Error handler ────────────────────────────────────────────────────
  const showError = useCallback((err) => {
    setToast({ message: err.message, type: 'error' })
  }, [])

  // ── Transcript updates from TranscriptPanel ──────────────────────────
  const handleTranscriptUpdate = useCallback((text, ts) => {
    setTranscriptLines(prev => [...prev, { text, ts }])
    transcriptRef.current = transcriptRef.current
      ? transcriptRef.current + '\n' + text
      : text
  }, [])

  // ── Suggestion engine ────────────────────────────────────────────────
  const { start: startSuggestions, stop: stopSuggestions } = useSuggestionEngine(
    transcriptRef,
    setSuggestions,
    setSuggestionsLoading,
    showError,
    apiKeyRef,
  )

  useEffect(() => {
    startSuggestions()
    return () => stopSuggestions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Settings save ────────────────────────────────────────────────────
  const handleSettingsSave = useCallback((key) => {
    apiKeyRef.current = key
    setToast({ message: '✓ API key saved', type: 'success' })
  }, [])

  // ── Suggestion card expand → inject into chat ────────────────────────
  const handleSuggestionExpand = useCallback((suggestion) => {
    setInjectedSuggestion(suggestion)
  }, [])

  // ── Export payload ───────────────────────────────────────────────────
  const getExportPayload = useCallback(() => ({
    transcript: transcriptLines,
    suggestions,
    transcriptText: transcriptRef.current,
  }), [transcriptLines, suggestions])

  return (
    <>
      {/* Background gradient mesh */}
      <div className="bg-mesh" />

      {/* Root layout */}
      <div style={{
        position: 'relative', zIndex: 1,
        height: '100vh', display: 'flex', flexDirection: 'column',
        padding: '12px', gap: '12px',
      }}>

        {/* ── Top Bar ─────────────────────────────────────────────────── */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
        }}>
          <Logo />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ExportButton getPayload={getExportPayload} />
            <button
              id="settings-open-btn"
              className="btn-icon"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <SettingsIcon />
            </button>
          </div>
        </header>

        {/* ── Three-column layout ──────────────────────────────────────── */}
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          minHeight: 0,
        }}>
          {/* Left: Transcript */}
          <TranscriptPanel
            apiKeyRef={apiKeyRef}
            onTranscriptUpdate={handleTranscriptUpdate}
            transcriptLines={transcriptLines}
            onError={showError}
          />

          {/* Middle: Suggestions */}
          <SuggestionsPanel
            suggestions={suggestions}
            loading={suggestionsLoading}
            onExpand={handleSuggestionExpand}
          />

          {/* Right: Chat */}
          <ChatPanel
            apiKeyRef={apiKeyRef}
            transcriptRef={transcriptRef}
            onError={showError}
            injectedMsg={injectedSuggestion}
            onInjected={() => setInjectedSuggestion(null)}
          />
        </div>
      </div>

      {/* ── Settings Modal ───────────────────────────────────────────── */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSave={handleSettingsSave}
        />
      )}

      {/* ── Toast ────────────────────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}
