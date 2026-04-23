import {
  GROQ_BASE_URL,
  MODEL_WHISPER,
  MODEL_CHAT,
  SUGGESTION_SCHEMA,
} from './constants.js'

// ── transcribe ────────────────────────────────────────────────────────────
/**
 * Send an audio Blob to Groq Whisper Large V3 and return the transcript text.
 * @param {Blob}   blob    - Raw audio blob from MediaRecorder
 * @param {string} apiKey
 * @returns {Promise<string>}
 */
export async function transcribe(blob, apiKey) {
  if (!apiKey) throw new Error('No API key set. Open Settings to add your Groq API key.')
  if (!blob || blob.size === 0) return ''

  const form = new FormData()
  // Use .webm extension; Whisper accepts it
  form.append('file', blob, 'audio.webm')
  form.append('model', MODEL_WHISPER)
  form.append('response_format', 'json')
  form.append('language', 'en')

  const res = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Whisper error ${res.status}`)
  }

  const data = await res.json()
  return (data.text ?? '').trim()
}

// ── getSuggestions ────────────────────────────────────────────────────────
/**
 * Request exactly 3 structured suggestions from GPT-OSS 120B.
 * @param {string} transcriptWindow  - Rolling window of transcript text
 * @param {string} systemPrompt
 * @param {string} apiKey
 * @returns {Promise<Array<{type:string, preview:string, full_context:string}>>}
 */
export async function getSuggestions(transcriptWindow, systemPrompt, apiKey) {
  if (!apiKey) throw new Error('No API key set.')
  if (!transcriptWindow.trim()) return []

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_CHAT,
      response_format: SUGGESTION_SCHEMA,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Meeting transcript so far:\n\n${transcriptWindow}` },
      ],
      temperature: 0.4,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Suggestions error ${res.status}`)
  }

  const data = await res.json()
  const raw  = data.choices?.[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw)
  return parsed.items ?? []
}

// ── streamChat ────────────────────────────────────────────────────────────
/**
 * Stream a chat completion via SSE and call onToken for each new token.
 * @param {Array}    messages  - Full messages array
 * @param {string}   apiKey
 * @param {function} onToken   - Called with each text chunk
 * @param {function} onDone    - Called when stream completes
 * @param {AbortSignal} signal - Optional abort signal
 */
export async function streamChat(messages, apiKey, onToken, onDone, signal) {
  if (!apiKey) throw new Error('No API key set.')

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_CHAT,
      messages,
      stream: true,
      temperature: 0.6,
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Chat error ${res.status}`)
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      try {
        const json  = JSON.parse(trimmed.slice(6))
        const token = json.choices?.[0]?.delta?.content
        if (token) onToken(token)
      } catch {
        // skip malformed lines
      }
    }
  }

  onDone()
}
