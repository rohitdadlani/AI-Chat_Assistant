import { useRef, useCallback } from 'react'
import { getSuggestions } from '../lib/groqClient.js'
import {
  SUGGESTION_INTERVAL_MS,
  TRANSCRIPT_WINDOW,
  DEFAULT_SUGGESTION_SYSTEM,
  LS_SUGGESTION_PROMPT,
} from '../lib/constants.js'

/**
 * Polls the Groq API every 30 seconds with a rolling window of transcript.
 * Calls onSuggestions with the new array and onLoading with true/false.
 *
 * @param {React.MutableRefObject<string>} transcriptRef  - ref to full transcript text
 * @param {function} onSuggestions  - (items[]) => void
 * @param {function} onLoading      - (bool) => void
 * @param {function} onError        - (err) => void
 * @param {React.MutableRefObject<string>} apiKeyRef
 */
export function useSuggestionEngine(transcriptRef, onSuggestions, onLoading, onError, apiKeyRef) {
  const intervalRef = useRef(null)

  const fetchSuggestions = useCallback(async () => {
    const fullText = transcriptRef.current ?? ''
    if (!fullText.trim()) return

    const window = fullText.slice(-TRANSCRIPT_WINDOW)
    const systemPrompt = localStorage.getItem(LS_SUGGESTION_PROMPT) || DEFAULT_SUGGESTION_SYSTEM

    onLoading(true)
    try {
      const items = await getSuggestions(window, systemPrompt, apiKeyRef.current)
      if (items.length > 0) onSuggestions(items)
    } catch (err) {
      onError(err)
    } finally {
      onLoading(false)
    }
  }, [transcriptRef, onSuggestions, onLoading, onError, apiKeyRef])

  const start = useCallback(() => {
    // Fetch once immediately, then every interval
    fetchSuggestions()
    intervalRef.current = setInterval(fetchSuggestions, SUGGESTION_INTERVAL_MS)
  }, [fetchSuggestions])

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
  }, [])

  return { start, stop, refresh: fetchSuggestions }
}
