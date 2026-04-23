const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

/**
 * ExportButton — aggregates transcript, suggestions, chat → JSON download.
 * Props:
 *   getPayload {function(): {transcript, suggestions, chat}}
 */
export default function ExportButton({ getPayload }) {
  const handleExport = () => {
    const payload = {
      ...getPayload(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href     = url
    a.download = `twinmind-export-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button id="export-btn" className="btn btn-ghost" onClick={handleExport} title="Export session as JSON">
      <DownloadIcon />
      Export
    </button>
  )
}
