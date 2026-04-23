import { useState, useEffect, useRef, useCallback } from 'react'
import { useAudioRecorder } from '../hooks/useAudioRecorder.js'

const MicIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
  </svg>
)

const StopIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
  </svg>
)

function formatTimer(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

/**
 * Left panel — mic controls + auto-scrolling transcript
 * Props:
 *   apiKeyRef      {React.MutableRefObject<string>}
 *   onTranscriptUpdate  {function(text: string, ts: string)}
 *   transcriptLines {Array<{text, ts}>}
 *   onError        {function(err)}
 */
export default function TranscriptPanel({ apiKeyRef, onTranscriptUpdate, transcriptLines, onError }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds]     = useState(0)
  const timerRef    = useRef(null)
  const bottomRef   = useRef(null)

  const handleTranscript = useCallback((text, ts) => {
    onTranscriptUpdate(text, ts)
  }, [onTranscriptUpdate])

  const { start, stop } = useAudioRecorder(handleTranscript, onError, apiKeyRef)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcriptLines])

  const handleToggle = useCallback(async () => {
    if (recording) {
      stop()
      clearInterval(timerRef.current)
      setRecording(false)
    } else {
      await start()
      setSeconds(0)
      setRecording(true)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    }
  }, [recording, start, stop])

  return (
    <div className="glass-panel flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <span className="panel-title">
          {recording && <span className="live-dot" />}
          Transcript
        </span>
        {recording && (
          <span className="rec-timer">{formatTimer(seconds)}</span>
        )}
      </div>

      {/* Mic control */}
      <div className="flex flex-col items-center gap-4 py-6 px-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          id="mic-toggle-btn"
          className={`mic-btn ${recording ? 'recording' : 'idle'}`}
          onClick={handleToggle}
          title={recording ? 'Stop recording' : 'Start recording'}
        >
          {recording ? <StopIcon /> : <MicIcon />}
        </button>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
          {recording
            ? 'Recording… chunks sent every 30 s'
            : 'Click to start capturing audio'}
        </p>
      </div>

      {/* Transcript list */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: 0 }}>
        {transcriptLines.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 32 }}>
            Transcript will appear here as you speak…
          </div>
        ) : (
          transcriptLines.map((line, i) => (
            <div key={i} className="transcript-line">
              <span className="transcript-ts">{line.ts}</span>
              <span className="transcript-text">{line.text}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
