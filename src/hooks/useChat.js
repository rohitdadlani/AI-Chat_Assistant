import { useCallback, useRef } from 'react'
import { streamChat } from '../lib/groqClient.js'
import { DEFAULT_CHAT_SYSTEM, LS_CHAT_PROMPT } from '../lib/constants.js'

/**
 * Manages streaming chat with Groq.
 *
 * @param {React.MutableRefObject<string>} transcriptRef - full meeting transcript
 * @param {function} addMessage     - (msg: {role, content, streaming}) => void
 * @param {function} updateLast     - (updater: fn) => void  — patches the last assistant msg
 * @param {function} onError        - (err) => void
 * @param {React.MutableRefObject<string>} apiKeyRef
 */
export function useChat(transcriptRef, addMessage, updateLast, onError, apiKeyRef) {
  const abortRef = useRef(null)

  const send = useCallback(async (userText, fullContext) => {
    // Cancel any in-progress stream
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    const systemPrompt = localStorage.getItem(LS_CHAT_PROMPT) || DEFAULT_CHAT_SYSTEM
    const transcript = transcriptRef.current || '(no transcript yet)'

    const systemContent = `${systemPrompt}\n\nMeeting transcript so far:\n${transcript}`

    const messages = [
      { role: 'system', content: systemContent },
      { role: 'user',   content: fullContext || userText },
    ]

    // Add user bubble immediately
    addMessage({ role: 'user', content: userText, streaming: false })
    // Add empty assistant bubble with streaming flag
    addMessage({ role: 'assistant', content: '', streaming: true })

    try {
      await streamChat(
        messages,
        apiKeyRef.current,
        (token) => updateLast((prev) => prev + token),
        ()     => updateLast(null, /* done */ true),
        abortRef.current.signal,
      )
    } catch (err) {
      if (err.name !== 'AbortError') onError(err)
    }
  }, [transcriptRef, addMessage, updateLast, onError, apiKeyRef])

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { send, abort }
}
