const TYPE_BADGE = {
  question: { cls: 'badge-cyan',    label: 'Question' },
  action:   { cls: 'badge-emerald', label: 'Action'   },
  insight:  { cls: 'badge-violet',  label: 'Insight'  },
  summary:  { cls: 'badge-amber',   label: 'Summary'  },
}

const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)

const ExpandIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

function SuggestionCard({ suggestion, onExpand, cardId }) {
  const badge = TYPE_BADGE[suggestion.type] ?? TYPE_BADGE.insight
  return (
    <div
      id={cardId}
      className={`card suggestion-card type-${suggestion.type}`}
      onClick={() => onExpand(suggestion)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onExpand(suggestion)}
      style={{ marginBottom: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
          Expand <ExpandIcon />
        </span>
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.55, margin: 0 }}>
        {suggestion.preview}
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="card" style={{ padding: 16, opacity: 0.45 }}>
          <div style={{ height: 10, background: 'var(--border-bright)', borderRadius: 4, marginBottom: 8, width: '35%' }} />
          <div style={{ height: 12, background: 'var(--border)', borderRadius: 4, width: '85%' }} />
        </div>
      ))}
    </div>
  )
}

/**
 * Middle panel — batched suggestion history, newest at top.
 * Props:
 *   suggestionBatches  {Array<{ts: string, items: Array<{type,preview,full_context}>}>}
 *   loading            {boolean}
 *   onExpand           {function(suggestion)}
 *   onRefresh          {function}
 */
export default function SuggestionsPanel({ suggestionBatches, loading, onExpand, onRefresh }) {
  return (
    <div className="glass-panel flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <span className="panel-title">Live Suggestions</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading && <div className="spinner" />}
          <button
            id="suggestions-refresh-btn"
            className="btn btn-ghost"
            onClick={onRefresh}
            disabled={loading}
            title="Manually refresh suggestions now"
            style={{ padding: '5px 10px', fontSize: 12, gap: 5, display: 'flex', alignItems: 'center' }}
          >
            <RefreshIcon />
            Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ minHeight: 0 }}>

        {/* Empty state */}
        {suggestionBatches.length === 0 && !loading && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Suggestions appear once you start speaking.<br />
            <span style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
              Auto-refreshes every 30 s · or tap Refresh
            </span>
          </div>
        )}

        {/* Loading with no batches yet */}
        {loading && suggestionBatches.length === 0 && <LoadingSkeleton />}

        {/* Batches — newest first */}
        {suggestionBatches.map((batch, batchIdx) => (
          <div key={`${batch.ts}-${batchIdx}`} style={{ marginBottom: 24 }}>
            {/* Batch header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className={`badge ${batchIdx === 0 ? 'badge-cyan' : 'badge-rose'}`}
                style={{ opacity: batchIdx === 0 ? 1 : 0.6 }}>
                {batchIdx === 0 ? '● Latest' : 'Earlier'}
              </span>
              <span style={{
                fontSize: 10, color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.5px'
              }}>
                {batch.ts}
              </span>
              {batchIdx === 0 && loading && (
                <div className="spinner" style={{ width: 10, height: 10 }} />
              )}
            </div>

            {/* Cards for this batch */}
            {batch.items.map((s, i) => (
              <SuggestionCard
                key={i}
                cardId={batchIdx === 0 ? `suggestion-card-${i}` : undefined}
                suggestion={s}
                onExpand={onExpand}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 20px', borderTop: '1px solid var(--border)',
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {suggestionBatches.length > 0
            ? `${suggestionBatches.length} batch${suggestionBatches.length > 1 ? 'es' : ''} · ${suggestionBatches.length * 3} suggestions`
            : 'Click any card to expand in chat →'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto · 30 s</p>
      </div>
    </div>
  )
}
