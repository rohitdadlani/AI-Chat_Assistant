// ── Model & endpoint constants ─────────────────────────────────────────────
export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

export const MODEL_WHISPER      = 'whisper-large-v3'
export const MODEL_CHAT         = 'openai/gpt-oss-120b'

// ── Timings ───────────────────────────────────────────────────────────────
export const AUDIO_CHUNK_MS       = 30_000   // stop/start MediaRecorder every 30 s
export const SUGGESTION_INTERVAL_MS = 30_000 // poll suggestions every 30 s
export const TRANSCRIPT_WINDOW    = 3000     // chars sent to suggestion engine

// ── Structured output schema — forces exactly 3 suggestion items ──────────
export const SUGGESTION_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'meeting_suggestions',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['question', 'action', 'insight', 'summary'],
              },
              preview: {
                type: 'string',
                description: 'Short one-line preview shown on the card, max ~80 chars',
              },
              full_context: {
                type: 'string',
                description: 'Full elaborated suggestion injected into chat',
              },
            },
            required: ['type', 'preview', 'full_context'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
}

// ── Default prompts (can be overridden via Settings) ─────────────────────
export const DEFAULT_SUGGESTION_SYSTEM = `You are an expert AI meeting assistant. Analyse the provided meeting transcript and generate exactly 3 helpful suggestions. Each suggestion must have:
- type: one of question|action|insight|summary
- preview: a concise one-line label (≤80 chars)
- full_context: a thorough elaboration or follow-up the user can use directly in the meeting.`

export const DEFAULT_CHAT_SYSTEM = `You are TwinMind, an AI meeting copilot. You have full context of the ongoing meeting transcript. Provide clear, actionable, and concise responses to help the user in their meeting.`

// ── localStorage keys ─────────────────────────────────────────────────────
export const LS_SUGGESTION_PROMPT = 'twinmind_suggestion_prompt'
export const LS_CHAT_PROMPT       = 'twinmind_chat_prompt'
