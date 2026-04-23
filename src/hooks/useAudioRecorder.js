import { useRef, useCallback } from 'react'
import { transcribe } from '../lib/groqClient.js'
import { AUDIO_CHUNK_MS } from '../lib/constants.js'

/**
 * Manages the MediaRecorder with a 30-second stop/start interval.
 * Audio chunks are sent to Groq Whisper for transcription.
 *
 * @param {function} onTranscript  - Called with (text: string, timestamp: string)
 * @param {function} onError       - Called with (err: Error)
 * @param {React.MutableRefObject} apiKeyRef - ref to current API key string
 * @returns {{ start, stop, isRecording: React.MutableRefObject<boolean> }}
 */
export function useAudioRecorder(onTranscript, onError, apiKeyRef) {
  const mediaRecorderRef = useRef(null)
  const streamRef        = useRef(null)
  const intervalRef      = useRef(null)
  const isRecordingRef   = useRef(false)

  const processBlob = useCallback(async (blob) => {
    if (!blob || blob.size < 1000) return // skip near-empty chunks
    try {
      const text = await transcribe(blob, apiKeyRef.current)
      if (text) {
        const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        onTranscript(text, ts)
      }
    } catch (err) {
      onError(err)
    }
  }, [onTranscript, onError, apiKeyRef])

  const startChunk = useCallback((stream) => {
    // Pick an audio mime type the browser supports
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', '']
      .find(t => t === '' || MediaRecorder.isTypeSupported(t))

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) processBlob(e.data)
    }

    recorder.start()
    return recorder
  }, [processBlob])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      isRecordingRef.current = true

      startChunk(stream)

      // Every AUDIO_CHUNK_MS: stop current recorder (fires ondataavailable), start new one
      intervalRef.current = setInterval(() => {
        if (!isRecordingRef.current) return
        const old = mediaRecorderRef.current
        if (old && old.state !== 'inactive') {
          // Start new recorder first so there is no gap
          startChunk(stream)
          old.stop()
        }
      }, AUDIO_CHUNK_MS)
    } catch (err) {
      onError(err)
    }
  }, [startChunk, onError])

  const stop = useCallback(() => {
    isRecordingRef.current = false
    clearInterval(intervalRef.current)

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()

    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
  }, [])

  return { start, stop, isRecordingRef }
}
