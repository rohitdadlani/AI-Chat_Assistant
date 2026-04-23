import { useState, useEffect } from 'react'
import {
  LS_API_KEY,
  LS_SUGGESTION_PROMPT,
  LS_CHAT_PROMPT,
  DEFAULT_SUGGESTION_SYSTEM,
  DEFAULT_CHAT_SYSTEM,
} from '../lib/constants.js'

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const EyeIcon = ({ show }) => show ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

/**
 * Settings modal — stores API key + custom prompts in localStorage.
 * Props:
 *   onClose    {function}
 *   onSave     {function(apiKey: string)}
 */
export default function SettingsModal({ onClose, onSave }) {
  const [apiKey,      setApiKey]      = useState('')
  const [showKey,     setShowKey]     = useState(false)
  const [suggPrompt,  setSuggPrompt]  = useState('')
  const [chatPrompt,  setChatPrompt]  = useState('')
  const [saved,       setSaved]       = useState(false)

  useEffect(() => {
    setApiKey(localStorage.getItem(LS_API_KEY) || '')
    setSuggPrompt(localStorage.getItem(LS_SUGGESTION_PROMPT) || DEFAULT_SUGGESTION_SYSTEM)
    setChatPrompt(localStorage.getItem(LS_CHAT_PROMPT)       || DEFAULT_CHAT_SYSTEM)
  }, [])

  const handleSave = () => {
    localStorage.setItem(LS_API_KEY,           apiKey.trim())
    localStorage.setItem(LS_SUGGESTION_PROMPT, suggPrompt)
    localStorage.setItem(LS_CHAT_PROMPT,       chatPrompt)
    onSave(apiKey.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 900)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="glass-panel modal-box" style={{ padding: 0 }}>
        {/* Modal header */}
        <div className="panel-header">
          <span className="panel-title" style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0, color: 'var(--text-primary)', fontWeight: 600 }}>
            ⚙ Settings
          </span>
          <button id="settings-close-btn" className="btn-icon" onClick={onClose}><CloseIcon /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* API Key */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Groq API Key <span style={{ color: 'var(--rose)' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="settings-api-key"
                className="input-field"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="gsk_…"
                style={{ paddingRight: 40 }}
              />
              <button
                className="btn-icon"
                style={{ position: 'absolute', right: 6, border: 'none', background: 'transparent' }}
                onClick={() => setShowKey(s => !s)}
                tabIndex={-1}
              >
                <EyeIcon show={showKey} />
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Get your key at{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer"
                 style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
                console.groq.com/keys
              </a>
              . Stored only in your browser's localStorage.
            </p>
          </div>

          <div className="divider" />

          {/* Suggestion prompt */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Suggestion System Prompt
            </label>
            <textarea
              id="settings-sugg-prompt"
              className="input-field"
              rows={4}
              value={suggPrompt}
              onChange={e => setSuggPrompt(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </div>

          {/* Chat prompt */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Chat System Prompt
            </label>
            <textarea
              id="settings-chat-prompt"
              className="input-field"
              rows={3}
              value={chatPrompt}
              onChange={e => setChatPrompt(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button id="settings-cancel-btn" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              id="settings-save-btn"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!apiKey.trim()}
            >
              {saved ? '✓ Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
