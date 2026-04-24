import { useState, useEffect, useRef, useCallback } from 'react'
import { useChat } from '../hooks/useChat.js'
import ReactMarkdown from 'react-markdown'

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
export default function ChatPanel({ apiKeyRef, transcriptRef, onError, injectedMsg, onInjected, messagesRef }) {
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  // Stable callbacks that don't cause re-renders in hooks
  const addMessage = useCallback((msg) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random(), ts }])
  }, [])

  // Keep messagesRef current for export (without triggering re-renders)
  useEffect(() => {
    if (messagesRef) messagesRef.current = messages
  }, [messages, messagesRef])

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
              {msg.role === 'user' ? 'You' : 'TwinMind'}{msg.ts ? ` · ${msg.ts}` : ''}
            </span>
            <div className={`chat-bubble ${msg.role} ${msg.streaming ? 'streaming-cursor' : ''}`}>
              {msg.role === 'user' ? (
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{msg.content}</p>
              ) : (
                <ReactMarkdown
                  components={{
                    p:      ({ children }) => <p style={{ margin: '0 0 8px', fontSize: 13.5, lineHeight: 1.65 }}>{children}</p>,
                    ul:     ({ children }) => <ul style={{ margin: '4px 0 8px', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.65 }}>{children}</ul>,
                    ol:     ({ children }) => <ol style={{ margin: '4px 0 8px', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.65 }}>{children}</ol>,
                    li:     ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ color: 'var(--cyan)', fontWeight: 600 }}>{children}</strong>,
                    em:     ({ children }) => <em style={{ color: 'var(--violet)' }}>{children}</em>,
                    h1:     ({ children }) => <h1 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>{children}</h1>,
                    h2:     ({ children }) => <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-primary)' }}>{children}</h2>,
                    h3:     ({ children }) => <h3 style={{ fontSize: 13.5, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-secondary)' }}>{children}</h3>,
                    code:   ({ children }) => <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{children}</code>,
                    blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--border-bright)', margin: '6px 0', paddingLeft: 12, color: 'var(--text-secondary)' }}>{children}</blockquote>,
                    table:  ({ children }) => <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5, margin: '6px 0' }}>{children}</table>,
                    th:     ({ children }) => <th style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-bright)', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{children}</th>,
                    td:     ({ children }) => <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{children}</td>,
                    hr:     () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
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
