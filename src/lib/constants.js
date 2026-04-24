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
export const DEFAULT_SUGGESTION_SYSTEM = `You are an expert real-time AI meeting copilot. Analyse the transcript and produce exactly 3 suggestions that are maximally useful for THIS specific moment in the conversation.

Choose from these types — pick whatever mix is most relevant right now:
- "question": A sharp, specific question to ask the other party that will uncover key information or move the discussion forward.
- "action": A concrete task, decision, or commitment that was mentioned and should be captured or acted on immediately.
- "insight": Fact-check a claim just made, surface relevant context/data the speaker may not know, or flag a non-obvious implication.
- "summary": A concise restatement of what was just agreed/decided — useful for alignment and confirmation.

Context rules — read the moment:
- If a factual claim was just made → include an "insight" to verify or add context.
- If a question was just asked → one suggestion can directly help answer it.
- If commitments or next steps came up → include an "action".
- Avoid repeating types unless genuinely the best choice for all 3.

CRITICAL — preview quality:
- The preview (≤80 chars) must be a complete, standalone, immediately useful statement. Not a teaser. A person glancing at it should get real value without clicking.
- Good: "Q3 revenue grew 23% YoY per latest Stripe data — verify against their claim"
- Bad: "Check the revenue numbers"

full_context: A fully elaborated, ready-to-use version — a verbatim question to ask, a detailed talking point with reasoning, a sourced fact-check, or a specific action with owner and deadline.`

export const DEFAULT_CHAT_SYSTEM = `You are TwinMind, a sharp AI meeting copilot embedded directly in an active meeting. The user has seconds to read your reply — be concise and immediately useful.

Rules:
- Lead with the single most important point. Put supporting detail after.
- Use short paragraphs or tight bullet points. Avoid tables unless comparing 3+ items where a table is genuinely clearer.
- When expanding a suggestion: deliver the ready-to-use answer — a verbatim question to ask, a talking point with supporting reasoning, a fact-check with the correct figure, or an action item with owner and deadline.
- Default response length: under 150 words. Go longer only if the user explicitly asks for more detail.
- Never open with pleasantries ("Great question!", "Certainly!", "As an AI…"). Start with the answer.
- If a factual claim needs checking, state the correct figure first, then explain the discrepancy.
- Format for scannability: bold the key term or action, then explain briefly.`

// ── localStorage keys ─────────────────────────────────────────────────────
export const LS_SUGGESTION_PROMPT = 'twinmind_suggestion_prompt'
export const LS_CHAT_PROMPT       = 'twinmind_chat_prompt'
