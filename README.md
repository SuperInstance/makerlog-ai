# Makerlog.ai

**Voice-first development assistant with gamified quota harvesting.**

Talk through your ideas all day. Wake up to generated assets.

## The Core Loop

```
┌─────────────────────────────────────────────────────────────────┐
│  DAYTIME: Vibe through ideas (voice → transcript → vectors)    │
│  ──────────────────────────────────────────────────────────────│
│  "I'm thinking about a pixel art style for the game..."        │
│  "Maybe the API should have a /harvest endpoint..."            │
│  "The onboarding flow needs to feel more playful..."           │
├─────────────────────────────────────────────────────────────────┤
│  EVENING: Commit compute (review detected opportunities)       │
│  ──────────────────────────────────────────────────────────────│
│  System detects from your conversations:                       │
│  • 12 pixel art icon variations to generate                    │
│  • API endpoint boilerplate to scaffold                        │
│  • 3 onboarding copy alternatives to write                     │
├─────────────────────────────────────────────────────────────────┤
│  OVERNIGHT: Batch execution (using Cloudflare free tier)       │
├─────────────────────────────────────────────────────────────────┤
│  MORNING: Review generated assets (keep/discard/iterate)       │
└─────────────────────────────────────────────────────────────────┘
```

## Why Voice-First?

Most AI tools require you to **stop what you're doing** and type a prompt. Makerlog lets you **talk while you work**—walking, cooking, on a boat, whatever. Your ideas accumulate in a vector database, and the system figures out what to generate overnight.

**90% audio-first development.** Your phone is for occasional QC and iteration.

## Features

### Voice Conversation Engine
- 🎤 **Push-to-talk recording** — Hold to speak, release to send
- 📝 **Real-time transcription** — Cloudflare Whisper
- 🧠 **Contextual responses** — AI that remembers your conversation
- 🔊 **Text-to-speech** — Hear responses without looking at screen
- 🔍 **Semantic search** — Find anything you've ever said (Vectorize)

### Opportunity Detection
- ✨ **Auto-detect generative tasks** — From natural conversation
- 🎯 **Confidence scoring** — Only surfaces high-value opportunities
- ✏️ **Refine prompts** — Edit before committing to generation
- 📋 **Queue management** — Prioritize what matters

### Gamified Quota Harvesting
- 📊 **Quota dashboard** — Real-time Cloudflare free tier usage
- 🌾 **Harvest mode** — Use remaining quota before midnight reset
- 🏆 **Achievements** — XP, levels, streaks
- 🔥 **"Use it or lose it"** — Alerts when quota is about to reset

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React App     │────▶│  Cloudflare     │────▶│   Workers AI    │
│   (Voice UI)    │     │  Worker (API)   │     │                 │
│                 │     │                 │     │  • Whisper STT  │
│ • Push-to-talk  │     │  • Transcribe   │     │  • Llama chat   │
│ • TTS playback  │     │  • Respond      │     │  • BGE embed    │
│ • Opportunities │     │  • Detect opps  │     │  • SDXL images  │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│       D1        │     │    Vectorize    │     │       R2        │
│   (Database)    │     │  (Embeddings)   │     │   (Assets)      │
│                 │     │                 │     │                 │
│ • Conversations │     │ • Message       │     │ • Audio files   │
│ • Messages      │     │   embeddings    │     │ • Generated     │
│ • Opportunities │     │ • Semantic      │     │   images        │
│ • Tasks         │     │   search        │     │ • Exports       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- Cloudflare account (free tier works)
- Wrangler CLI: `npm install -g wrangler`

### 1. Clone & Install

```bash
git clone https://github.com/SuperInstance/makerlog-ai.git
cd makerlog-ai
npm install
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Create Vectorize Index

```bash
wrangler vectorize create makerlog-conversations --dimensions=768 --metric=cosine
```

### 4. Deploy the API Worker

```bash
cd workers/api
npm install
npm run deploy
```

### 5. Deploy the Dashboard

```bash
cd ../..
npm run build
wrangler pages deploy dist --project-name makerlog
```

## API Reference

### Voice Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/voice/transcribe` | Upload audio, get transcript + AI response |

### Conversation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List all conversations |
| GET | `/api/conversations/:id` | Get conversation with messages |
| POST | `/api/conversations` | Create new conversation |
| POST | `/api/search` | Semantic search across conversations |

### Opportunity Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/opportunities` | List detected opportunities |
| POST | `/api/opportunities/:id/queue` | Queue for overnight generation |
| POST | `/api/opportunities/:id/reject` | Skip this opportunity |
| POST | `/api/opportunities/:id/refine` | Edit prompt before queueing |

### Task & Quota Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quota` | Current quota usage |
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Queue a task manually |
| POST | `/api/harvest` | Execute all queued tasks |
| GET | `/api/digest` | Daily summary |

## Cloudflare Resources

| Resource | Type | Purpose |
|----------|------|---------|
| `makerlog-db` | D1 Database | Conversations, messages, tasks |
| `makerlog-cache` | KV Namespace | Quota caching, sessions |
| `makerlog-assets` | R2 Bucket | Audio files, generated assets |
| `makerlog-conversations` | Vectorize | Semantic search embeddings |

## Roadmap

### Phase 1: Voice-First MVP ✅
- [x] Push-to-talk recording
- [x] Whisper transcription
- [x] Contextual AI responses
- [x] Opportunity detection
- [x] Basic quota tracking

### Phase 2: Desktop Connector
- [ ] Local runtime for file access
- [ ] Watch filesystem for code changes
- [ ] Execute generated code locally
- [ ] Sync with cloud state

### Phase 3: Multi-Modal
- [ ] Image upload for context
- [ ] Screen sharing for QC
- [ ] Generated asset preview on phone
- [ ] Iteration via voice commands

## Philosophy

**The best interface is no interface.** You shouldn't have to stop thinking to interact with AI. Makerlog is designed for people who have ideas while their hands are busy—fishermen, parents, commuters, anyone who thinks better out loud than typing.

Your free tier quota is a resource. Use it or lose it. Makerlog makes sure every token, every image generation, every API call counts toward something you actually want.

## License

MIT

---

**Built for makers who think out loud. 🎤**
