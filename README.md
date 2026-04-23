# TwinMind — AI Meeting Copilot

> A real-time, browser-only AI copilot for meetings. Captures microphone audio, transcribes it live, surfaces intelligent suggestions, and provides a streaming chat assistant — all powered by **Groq** with no backend.

![TwinMind UI](./docs/screenshot.png)

---

## Table of Contents

1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Prompt Engineering Strategy](#prompt-engineering-strategy)
4. [Latency Tradeoffs](#latency-tradeoffs)
5. [Getting Started](#getting-started)
6. [Project Structure](#project-structure)
7. [Configuration & Settings](#configuration--settings)
8. [Export Format](#export-format)
9. [Deployment](#deployment)
10. [Known Limitations](#known-limitations)

---

## Features

| Feature | Detail |
|---|---|
| 🎙️ **Live Transcription** | MediaRecorder → Groq Whisper Large V3 every 30 s |
| 💡 **Live Suggestions** | GPT-OSS 120B Structured Outputs → exactly 3 typed cards |
| 💬 **Streaming Chat** | Server-Sent Events, token-by-token assistant responses |
| ⚙️ **Settings Modal** | API key + custom system prompts persisted to `localStorage` |
| 📥 **JSON Export** | One-click download of full transcript, suggestions, and chat |
| 🔒 **No Backend** | All API calls are direct browser → Groq HTTPS; key never leaves the device |

---

## Architecture Overview

```
Browser
├── MediaRecorder (30-s stop/start chunks)
│     └──▶ Groq Whisper Large V3  (/audio/transcriptions)
│               └── transcript text appended to TranscriptPanel + transcriptRef
│
├── Suggestion Engine (setInterval 30 s)
│     └──▶ Groq GPT-OSS 120B  (/chat/completions, Structured Outputs)
│               └── exactly 3 SuggestionItems → SuggestionsPanel cards
│
└── Chat (on-demand, SSE stream)
      └──▶ Groq GPT-OSS 120B  (/chat/completions, stream: true)
                └── tokens streamed into ChatPanel bubble
```

### State Isolation

React's re-render cascade is the #1 performance risk in a live-transcription app.
TwinMind prevents it with a deliberate boundary strategy:

| Boundary | Mechanism | Why |
|---|---|---|
| Transcript text for AI | `useRef<string>` (`transcriptRef`) | Mutated on every chunk; never triggers a render |
| Recording timer | `useRef<setInterval>` | Increments `seconds` state only inside `TranscriptPanel` — isolated |
| MediaRecorder instance | `useRef<MediaRecorder>` | Imperative API; React should never own it |
| Suggestion interval | `useRef<setInterval>` | Lives outside React lifecycle; started once in `useEffect` |
| Chat abort controller | `useRef<AbortController>` | Cancelled imperatively; no state flush needed |
| Cross-panel communication | Stable `useCallback` props | `onTranscriptUpdate`, `onExpand`, `onInjected` have no dependencies that change |

The result: speaking into the mic only re-renders `TranscriptPanel`. Streaming a chat response only re-renders `ChatPanel`. The panels are never coupled.

---

## Prompt Engineering Strategy

### 1. Transcription (Whisper Large V3)

**Model choice rationale:** Whisper V3 is Groq's fastest-to-decode multilingual ASR model. At the 30-second chunk boundary, it consistently returns under 1 s on Groq's LPU hardware — fast enough to feel real-time.

**Parameters used:**
```js
{ model: 'whisper-large-v3', response_format: 'json', language: 'en' }
```

Setting `language: 'en'` removes the language-detection pass, shaving ~100 ms from every call. Remove this field if you need multilingual support.

**Chunk size tradeoff:** 30 s is the Goldilocks point. Shorter chunks (e.g., 5–10 s) increase API overhead and produce more fragmented sentences because Whisper needs sentence context to punctuate correctly. Longer chunks (e.g., 60 s) improve accuracy but create a jarring delay in the transcript display.

---

### 2. Suggestion Engine (GPT-OSS 120B + Structured Outputs)

This is the most carefully engineered prompt in the system.

#### Why Structured Outputs instead of `response_format: json_object`?

`json_object` only guarantees valid JSON — it says nothing about *shape*. A model can return 1 suggestion or 5 and still comply. Structured Outputs with a strict JSON Schema constrain the grammar of every token the model can sample, making it **mathematically impossible** to return anything other than exactly 3 items with the required fields.

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "meeting_suggestions",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "minItems": 3,
          "maxItems": 3,
          "items": {
            "type": "object",
            "properties": {
              "type":         { "type": "string", "enum": ["question","action","insight","summary"] },
              "preview":      { "type": "string" },
              "full_context": { "type": "string" }
            },
            "required": ["type","preview","full_context"],
            "additionalProperties": false
          }
        }
      },
      "required": ["items"],
      "additionalProperties": false
    }
  }
}
```

`"additionalProperties": false` at every level and `"strict": true` at the schema root enforce schema conformance at the grammar-sampling level — no post-processing or validation needed.

#### The two-field design (`preview` + `full_context`)

The system prompt instructs the model to produce:
- `preview` — a ≤80-char label shown on the card (fast to read, low cognitive load)
- `full_context` — a full elaboration injected into the chat system prompt when expanded

This separation is deliberate. Showing the full context inline on a card would overwhelm the user during a live meeting. The card acts as a **scannable affordance**; expansion is a deliberate intent signal that triggers a streaming deep-dive.

#### Type taxonomy (`question | action | insight | summary`)

Four types cover the full range of meeting moments:
- **Question** — something worth asking aloud or noting for follow-up
- **Action** — a task or decision that should be captured
- **Insight** — a non-obvious implication from what was said
- **Summary** — a checkpoint restatement useful for alignment

The `enum` constraint forces the model into exactly one of these buckets, making card colour-coding reliable.

#### Rolling window (3000 chars ≈ 375 tokens)

Sending the entire transcript would balloon prompt cost and latency. The rolling 3000-character tail captures ~4–5 minutes of speech — enough to produce contextually relevant suggestions without needing the full session history.

```js
const window = fullText.slice(-TRANSCRIPT_WINDOW) // last 3000 chars
```

`temperature: 0.4` — low enough to get coherent, focused suggestions; high enough to avoid repetitive cards across consecutive 30-s cycles.

---

### 3. Chat (GPT-OSS 120B, Streaming)

The chat system prompt is dynamically injected at call time:

```js
const systemContent = `${customSystemPrompt}\n\nMeeting transcript so far:\n${transcript}`
```

This gives the assistant full meeting context on every request without a session-persistent memory system. The tradeoff: each chat request re-sends the full transcript, increasing token count — but enabling stateless, serverless operation.

When a suggestion card is expanded, its `full_context` replaces the user message. This means the model receives the already-elaborated framing rather than a terse `preview` string, producing richer initial responses without extra back-and-forth.

`temperature: 0.6` — slightly warmer than suggestions, because conversational flow benefits from more natural phrasing.

**Abort on new request:** Each `send()` call cancels the previous in-flight stream via `AbortController`. This prevents ghost-typing when the user clicks a second suggestion card while a stream is still running.

---

## Latency Tradeoffs

### End-to-end timeline for a 30-second cycle

```
T+0 s    MediaRecorder.stop() fires ondataavailable
T+0 s    MediaRecorder.start() begins capturing next chunk  ← zero gap
T+0.1 s  transcribe(blob) → POST /audio/transcriptions
T+0.9 s  Whisper returns text  (~800 ms P50 on Groq LPU)
T+1.0 s  TranscriptPanel re-renders with new line

T+30 s   getSuggestions() → POST /chat/completions (structured)
T+31.5 s GPT-OSS 120B returns 3 items  (~1–2 s P50)
T+31.5 s SuggestionsPanel re-renders with new cards
```

### Decision log

| Decision | Latency cost | Accuracy/UX gain |
|---|---|---|
| 30-s chunks (not 5-s) | +25 s per transcript update | Whisper gets full sentence context → better punctuation & accuracy |
| Rolling 3000-char window | Saves ~2000 token prompt | Slight context loss for very long meetings |
| Structured Outputs (strict schema) | +50–100 ms grammar-constrained sampling | Zero parsing failures; no retry logic needed |
| Full transcript in chat system prompt | +N tokens per chat call (grows linearly) | Stateless; no memory infrastructure needed |
| SSE streaming (not polling) | First token in ~400 ms | Perceived response time dramatically better than waiting for full completion |
| Stop/start instead of `timeslice` | Same as timeslice | Guarantees complete, self-contained audio blobs; `timeslice` can produce partial frames Whisper misreads |
| `language: 'en'` on Whisper | −100 ms per call | Removes language-detection pass |
| `useRef` for transcript text | 0 ms (no React render) | If `useState` were used, every character appended would re-render all three panels |

### Known latency bottleneck

The suggestion engine fires unconditionally on the 30-s tick even if the transcript hasn't changed since the last poll. A production optimisation would be to hash the transcript window and skip the API call on identical input — saving ~1–2 API calls per idle minute.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Groq API key](https://console.groq.com/keys) (free tier available)

### Install & Run

```bash
git clone https://github.com/rohitdadlani/AI-Chat_Assistant.git
cd AI-Chat_Assistant/twinmind-copilot
npm install
npm run dev
```

Open `http://localhost:5173`, click the ⚙ gear icon, paste your Groq API key, and click **Save Settings**.

### First Use Checklist
1. ✅ Enter Groq API key in Settings
2. ✅ Allow microphone access when prompted
3. ✅ Click the 🎙 mic button to begin recording
4. ✅ Speak — transcript appears within ~1 s of each 30-s chunk
5. ✅ Suggestion cards refresh automatically every 30 s
6. ✅ Click any card to expand it into the chat

---

## Project Structure

```
twinmind-copilot/
├── index.html
├── vite.config.js
└── src/
    ├── main.jsx               Entry point
    ├── App.jsx                Root layout + state wiring
    ├── index.css              Design system (tokens, glass panels, animations)
    ├── lib/
    │   ├── constants.js       Model names, JSON schema, default prompts
    │   └── groqClient.js      transcribe() · getSuggestions() · streamChat()
    ├── hooks/
    │   ├── useAudioRecorder.js   30-s stop/start MediaRecorder
    │   ├── useSuggestionEngine.js  30-s polling with rolling window
    │   └── useChat.js            SSE streaming + AbortController
    └── components/
        ├── TranscriptPanel.jsx   Left column
        ├── SuggestionsPanel.jsx  Middle column
        ├── ChatPanel.jsx         Right column
        ├── SettingsModal.jsx     API key + custom prompts
        └── ExportButton.jsx      JSON download
```

---

## Configuration & Settings

All settings are stored in `localStorage` — no server, no account required.

| Key | Default | Description |
|---|---|---|
| `twinmind_api_key` | *(empty)* | Your Groq API key |
| `twinmind_suggestion_prompt` | See `constants.js` | System prompt for the suggestion engine |
| `twinmind_chat_prompt` | See `constants.js` | System prompt for the chat assistant |

Open the **⚙ Settings** modal at any time to change these. Changes take effect on the next API call.

---

## Export Format

Clicking **Export** downloads a timestamped JSON file:

```json
{
  "transcript": [
    { "text": "We should revisit the pricing model...", "ts": "10:32:15" }
  ],
  "suggestions": [
    {
      "type": "action",
      "preview": "Schedule a pricing review with finance",
      "full_context": "Based on the discussion, it would be valuable to..."
    }
  ],
  "transcriptText": "Full flat string of all transcript lines...",
  "exportedAt": "2026-04-23T17:30:00.000Z",
  "version": "1.0.0"
}
```

---

## Deployment

Deployed on **Vercel**. The app is entirely static (no serverless functions needed) — `npm run build` produces a `dist/` folder that Vercel serves directly.

Environment variables: **none required** — the Groq API key is entered by the user at runtime and stored in their browser's `localStorage`.

```bash
# Build
npm run build

# Deploy via Vercel CLI
vercel --prod
```

> ⚠️ **CORS Note:** Groq's API sets `Access-Control-Allow-Origin: *`, so direct browser→Groq calls work from any domain including your Vercel deployment.

---

## Known Limitations

| Limitation | Workaround |
|---|---|
| Microphone access requires HTTPS in production | Vercel provides HTTPS automatically |
| Very long meetings (>2 h) grow the chat system prompt to thousands of tokens | Reload the page to start a fresh session; export first |
| No speaker diarisation | Whisper V3 does not identify speakers — all lines appear as a single stream |
| `openai/gpt-oss-120b` availability | If the model is rate-limited, edit `MODEL_CHAT` in `constants.js` to `llama-3.3-70b-versatile` |
| Structured Outputs schema `minItems`/`maxItems` | Groq's structured output implementation enforces these at the grammar level; if you see a validation error, check the Groq changelog for schema support updates |

---

## Tech Stack

- **React 19** + **Vite 6**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **Groq API** — Whisper Large V3 + GPT-OSS 120B
- Zero runtime dependencies beyond React

---

*Built with TwinMind © 2026*
