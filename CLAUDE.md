# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Table of Contents

- [Project Overview](#project-overview)
- [Quick Start](#quick-start)
- [Essential Reference Docs](#essential-reference-docs)
- [Development Commands](#development-commands)
- [Architecture](#architecture)
- [Key Files](#key-files)

---

## Project Overview

**Makerlog.ai** is a hybrid cloud-local voice-first development assistant. Users talk through ideas during the day, and the system automatically detects generative opportunities (code snippets, images, text) that execute:

- **Light tasks** via Cloudflare free tier AI (10,000 neurons/day)
- **Heavy tasks** via local Desktop Connector (Ollama, ComfyUI, Automatic1111)

The system learns from user feedback to improve generations over time, creating a self-improving loop.

**Architecture:**
- **Phone (Daytime)**: Voice capture, quick QC, approve/reject
- **Desktop (Overnight)**: Heavy generation, local models, iteration loops
- **Cloud (Always)**: Coordination, vector DB, user prefs, quota tracking

**Tech Stack:**
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Cloudflare Workers (Hono framework)
- Desktop Connector: Node.js, WebSocket, local AI models
- Database: D1 (SQLite), Vectorize (vector search), R2 (storage), KV (cache)
- AI: Cloudflare Workers AI (Whisper, Llama, BGE) + Local (Ollama, ComfyUI, A1111)

---

## Quick Start

```bash
# Install dependencies
npm install

# Start frontend (localhost:5173)
npm run dev

# Start worker API (localhost:8787) - in another terminal
npm run api:dev

# Run tests
npm run test

# Deploy everything
npm run deploy:all
```

**Before development:**
1. Install Wrangler CLI: `npm install -g wrangler`
2. Login: `wrangler login`
3. Create resources: `wrangler d1 create makerlog-db` and `wrangler vectorize create makerlog-conversations --dimensions=768 --metric=cosine`

---

## Essential Reference Docs

For detailed implementation guidance, patterns, and research, see:

| Topic | Document |
|-------|----------|
| **Getting Started** | `docs/ONBOARDING.md` |
| **Desktop Connector** | `docs/DESKTOP-CONNECTOR.md` |
| **Self-Improvement System** | `docs/SELF-IMPROVEMENT.md` |
| **AI Agent Architecture** | `docs/EMERGENT-AGENT-ARCHITECTURES.md` |
| **Voice Features** | `docs/EMERGENT-VOICE-PATTERNS.md` |
| **Mobile Development** | `docs/MOBILE-DEVELOPMENT-PATTERNS.md` |
| **Edge Computing** | `docs/EDGE-COMPUTING-PATTERNS.md` |
| **Performance Optimization** | `docs/PERFORMANCE-OPTIMIZATION.md` |
| **Analytics & Monitoring** | `docs/ANALYTICS-OBSERVABILITY.md` |
| **CI/CD Pipeline** | `docs/CICD-AUTOMATION-PATTERNS.md`, `docs/CICD-SETUP-GUIDE.md` |
| **Gamification** | `docs/GAMIFICATION-PATTERNS.md` |
| **Roadmap** | `docs/ROADMAP.md` |

---

## Development Commands

### Frontend
```bash
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Worker API
```bash
npm run api:dev      # Start Wrangler dev server (localhost:8787)
npm run deploy       # Deploy to development
npm run deploy:prod  # Deploy to production
npm run tail         # View real-time logs
```

### Testing
```bash
npm run test              # Run all tests
npm run test:ui           # Vitest UI mode
npm run test:coverage     # Coverage report
npm run test:e2e          # Playwright E2E tests
```

### Database
```bash
npm run db:migrate        # Execute migrations
npm run db:migrate:test   # Set up test database
```

---

## Architecture

```
makerlog-ai/
├── src/                          # React frontend
│   ├── VoiceChat.tsx             # Main voice interface
│   ├── Dashboard.tsx             # Quota tracking & tasks
│   └── main.tsx                  # App entry point
├── workers/api/                  # Cloudflare Worker (Hono)
│   └── src/
│       ├── routes/               # API endpoints
│       ├── agents/               # AI agent system
│       ├── websocket/            # WebSocket for desktop connector
│       └── middleware/           # Request processing
├── packages/
│   ├── desktop-connector/        # Node.js desktop daemon
│   │   ├── src/
│   │   │   ├── index.ts          # Main connector
│   │   │   ├── generators/       # Local AI integrations
│   │   │   ├── learning/         # Self-improvement system
│   │   │   └── storage/          # Asset management
│   │   ├── package.json
│   │   └── README.md
│   └── db/                       # Database package
│       ├── migrations/
│       ├── seeds/
│       └── schema.sql
├── schema/                       # D1 database migrations
├── docs/                         # Detailed documentation
└── .github/workflows/            # CI/CD pipelines
```

### Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER'S WORKFLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHONE (Daytime)              DESKTOP (Overnight)         CLOUD (Always)    │
│  ─────────────────           ──────────────────          ───────────────    │
│  • Voice capture             • Heavy generation           • Coordination    │
│  • Quick QC                  • Iteration loops            • Vector DB       │
│  • Approve/reject            • Local models               • User prefs      │
│  • Fine-tune prompts         • File organization          • Quota tracking  │
│                              • Watch for changes          • Sync state      │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                           FEEDBACK LOOP                                      │
│                                                                              │
│   Generate → Review → [Keep/Project/Future/Prune] → Learn → Better Prompts  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/voice/transcribe` | Voice processing pipeline |
| `GET/POST /api/conversations` | Conversation management |
| `POST /api/search` | Semantic vector search |
| `GET /api/opportunities` | List detected generative tasks |
| `POST /api/harvest` | Execute all queued tasks (cloud) |
| `GET /api/quota` | Real-time quota tracking |
| `WebSocket /api/ws` | Desktop connector real-time sync |

### Desktop Connector

**Installation:** `npm install -g makerlog-connector`

**Features:**
- Connects to cloud via WebSocket for task distribution
- Runs local AI models (Ollama, ComfyUI, Automatic1111)
- Self-improving style profiles from user feedback
- Overnight batch execution with idle detection
- Automatic storage management and pruning

**CLI Commands:**
```bash
makerlog-connector start     # Start the daemon
makerlog-connector config    # Configure connection
makerlog-connector status    # Show status
```

See `docs/DESKTOP-CONNECTOR.md` for complete documentation.

---

## Key Files

### Configuration
- `wrangler.toml` - Worker deployment config (bindings, env vars)
- `vite.config.ts` - Frontend build config
- `package.json` - Scripts and dependencies

### Worker Bindings (wrangler.toml)
- `AI` - Cloudflare AI services
- `DB` - D1 database (makerlog-db)
- `ASSETS` - R2 bucket for files
- `KV` - Cache namespace
- `VECTORIZE` - Semantic search index

### Database Schema
Key tables: `users`, `conversations`, `messages`, `tasks`, `opportunities`, `achievements`, `style_profiles`, `generated_assets`, `user_feedback`

---

## Code Patterns

### Worker API Structure
- Hono router with `/api` prefix
- Zod validation for request/response schemas
- Parameterized D1 queries
- Consistent error handling with HTTP status codes

### Frontend Patterns
- Functional components with TypeScript
- Tailwind CSS for styling
- Push-to-talk recording via MediaRecorder API

### Audio Processing Flow
1. Record audio → WebM blob
2. Upload to R2 → Get URL
3. Transcribe with Whisper → Text
4. Generate response with Llama → JSON
5. Create embeddings with BGE → Vector
6. Store in D1 + add to Vectorize index

---

## Testing

**Stack:** Vitest + React Testing Library + Playwright + MSW (for AI mocking)

**Strategy:**
- Mock AI responses with MSW (no quota consumption)
- Use real bindings in integration tests via `@cloudflare/vitest-pool-workers`
- Database seed files for consistent test data

---

## Deployment

- **Frontend:** Cloudflare Pages (`wrangler pages deploy`)
- **Worker:** Cloudflare Workers (`wrangler deploy`)
- **Environments:** development, staging, production
- **CI/CD:** GitHub Actions (see `docs/CICD-AUTOMATION-PATTERNS.md`)

---

## Agent System

Makerlog.ai uses a multi-agent architecture for Cloudflare Workers edge environment:

**Agent Types:**
- **Opportunity Detection Swarm** - Parallel specialist agents (code, image, text, research)
- **ReAct Reasoning** - Thought → Action → Observation loops
- **Hierarchical Task Planner** - BabyAGI-inspired decomposition
- **Reflective Learning** - Experience storage + few-shot learning
- **Event-Driven Pipeline** - Async D1 queue communication

**Constraints:** Stateless, <25s per task, 128MB memory, aggressive KV caching (24h TTL)

See `docs/EMERGENT-AGENT-ARCHITECTURES.md` for complete details.

---

## Gamification

**Current Features:** XP/leveling, streak tracking, achievements (First Harvest, Perfect Day, Week Warrior, etc.)

**Philosophy:** Developer-focused (mastery, autonomy, efficiency) not childish rewards. Quality over quantity. Anti-burnout with streak forgiveness.

See `docs/GAMIFICATION-PATTERNS.md` for design principles and roadmap.

---

## Production Readiness

**Error Handling:** Exponential backoff, circuit breakers, graceful degradation

**Security:** Input validation, Llama Guard 3 content moderation, rate limiting, prompt injection protection

**Monitoring:** Workers Analytics (built-in), Sentry (recommended), custom metrics

**Privacy-First Analytics:** See `docs/ANALYTICS-OBSERVABILITY.md` for GDPR/EU AI Act compliant strategy

---

## Performance

**Targets:**
- Frontend: LCP <2.5s, TTI <3.5s
- Backend (cached): P95 <200ms
- Backend (AI): P95 <8s
- Cache hit rate: >30%
- Neuron reduction: 40-50% through optimization

See `docs/PERFORMANCE-OPTIMIZATION.md` for comprehensive strategies, code examples, and monitoring setup.

---

## Self-Improvement System

**Core Concept:** The system learns from user feedback to improve future generations.

**Feedback Loop:**
1. Generate asset (image/text/code)
2. User reviews: 1-5 stars + disposition (project/library/prune)
3. System learns: Style vectors, prompt modifiers, preferences
4. Next generation: Enhanced prompts based on learned profile

**Style Profile:**
- **Positive examples**: Assets rated 4-5 stars
- **Negative examples**: Assets rated 1-2 stars
- **Preference vector**: Learned direction in embedding space
- **Prompt modifiers**: Tags and phrases added to prompts automatically

**Asset Lifecycle:**
- **Cache**: Temporary generation results (auto-pruned)
- **Project**: Assets for current project
- **Library**: Assets saved for future projects
- **Prune**: Marked for deletion when storage is full

See `docs/SELF-IMPROVEMENT.md` for complete documentation.

---

## Repository

- **GitHub:** https://github.com/SuperInstance/makerlog-ai
- **Production:** https://makerlog.ai
- **License:** MIT
