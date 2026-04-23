import { useState, useEffect, useRef, useCallback } from 'react'
import { useChat } from '../hooks/useChat.js'

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
)

/**
 * Right panel — streaming chat interface.
 * Props:
 *   apiKeyRef      {React.MutableRefObject<string>}
 *   transcriptRef  {React.MutableRefObject<string>}
 *   onError        {function(err)}
 *   injectedMsg    {object|null}  — suggestion to inject
 *   onInjected     {function}     — clear injected msg
 */
export default function ChatPanel({ apiKeyRef, transcriptRef, onError, injectedMsg, onInjected }) {
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  // Stable callbacks that don't cause re-renders in hooks
  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() }])
  }, [])

  const updateLast = useCallback((updater, done = false) => {
    setMessages(prev => {
      if (prev.length === 0) return prev
      const copy = [...prev]
      const last = { ...copy[copy.length - 1] }
      if (done) {
        last.streaming = false
      } else {
        last.content = updater(last.content)
      }
      copy[copy.length - 1] = last
      return copy
    })
    if (done) setStreaming(false)
  }, [])

  const handleError = useCallback((err) => {
    onError(err)
    setStreaming(false)
  }, [onError])

  const { send } = useChat(transcriptRef, addMessage, updateLast, handleError, apiKeyRef)

  // Handle injected suggestion from SuggestionsPanel
  useEffect(() => {
    if (!injectedMsg) return
    setStreaming(true)
    send(injectedMsg.preview, injectedMsg.full_context)
    onInjected()
  }, [injectedMsg]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    setStreaming(true)
    await send(text, text)
  }, [input, streaming, send])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="glass-panel flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <span className="panel-title">Chat</span>
        {streaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--cyan)', fontSize: 12 }}>
            <div className="spinner" style={{ borderTopColor: 'var(--cyan)' }} />
            Thinking…
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        id="chat-messages"
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Ask anything, or click a suggestion card to start a conversation.
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
              {msg.role === 'user' ? 'You' : 'TwinMind'}
            </span>
            <div className={`chat-bubble ${msg.role} ${msg.streaming ? 'streaming-cursor' : ''}`}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>
                {msg.content}
              </pre>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <textarea
            id="chat-input"
            ref={inputRef}
            className="chat-input"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or type a message…"
            style={{ maxHeight: 120, overflowY: 'auto' }}
            disabled={streaming}
          />
        </div>
        <button
          id="chat-send-btn"
          className="btn btn-primary"
          style={{ padding: '10px 14px', flexShrink: 0 }}
          onClick={handleSend}
          disabled={streaming || !input.trim()}
          title="Send (Enter)"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}
