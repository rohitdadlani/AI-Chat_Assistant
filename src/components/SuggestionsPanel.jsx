const TYPE_BADGE = {
  question: { cls: 'badge-cyan',    label: 'Question' },
  action:   { cls: 'badge-emerald', label: 'Action'   },
  insight:  { cls: 'badge-violet',  label: 'Insight'  },
  summary:  { cls: 'badge-amber',   label: 'Summary'  },
}

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)

const ExpandIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

/**
 * Middle panel — 3 live suggestion cards.
 * Props:
 *   suggestions {Array<{type, preview, full_context}>}
 *   loading     {boolean}
 *   onExpand    {function(suggestion)}
 */
export default function SuggestionsPanel({ suggestions, loading, onExpand }) {
  return (
    <div className="glass-panel flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <span className="panel-title">
          Live Suggestions
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading && <div className="spinner" />}
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {loading ? 'Thinking…' : 'Every 30 s'}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ minHeight: 0 }}>
        {suggestions.length === 0 && !loading && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Suggestions appear once you start speaking.<br/>
            <span style={{ fontSize: 11, marginTop: 6, display: 'block' }}>Updated every 30 seconds</span>
          </div>
        )}

        {loading && suggestions.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} className="card" style={{ padding: 16, opacity: 0.5 }}>
                <div style={{ height: 10, background: 'var(--border-bright)', borderRadius: 4, marginBottom: 8, width: '40%' }} />
                <div style={{ height: 12, background: 'var(--border)', borderRadius: 4, width: '80%' }} />
              </div>
            ))}
          </div>
        )}

        {suggestions.map((s, i) => {
          const badge = TYPE_BADGE[s.type] ?? TYPE_BADGE.insight
          return (
            <div
              key={i}
              id={`suggestion-card-${i}`}
              className={`card suggestion-card type-${s.type}`}
              onClick={() => onExpand(s)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onExpand(s)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className={`badge ${badge.cls}`}>{badge.label}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                  Expand <ExpandIcon />
                </span>
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.5 }}>{s.preview}</p>
            </div>
          )
        })}
      </div>

      {/* Footer hint */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          Click any card to expand in chat →
        </p>
      </div>
    </div>
  )
}
