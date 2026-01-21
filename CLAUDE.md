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

**Makerlog.ai** is a voice-first development assistant that gamifies Cloudflare free tier quota harvesting. Users talk through ideas during the day, and the system automatically detects generative opportunities (code snippets, images, text) that execute overnight using unused free tier credits.

**Tech Stack:**
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Cloudflare Workers (Hono framework)
- Database: D1 (SQLite), Vectorize (vector search), R2 (storage), KV (cache)
- AI: Cloudflare Workers AI (Whisper, Llama, BGE embeddings)

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
| **AI Agent Architecture** | `docs/EMERGENT-AGENT-ARCHITECTURES.md` |
| **Voice Features** | `docs/EMERGENT-VOICE-PATTERNS.md` |
| **Mobile Development** | `docs/MOBILE-DEVELOPMENT-PATTERNS.md` |
| **Edge Computing** | `docs/EDGE-COMPUTING-PATTERNS.md` |
| **Performance Optimization** | `docs/PERFORMANCE-OPTIMIZATION.md` |
| **Analytics & Monitoring** | `docs/ANALYTICS-OBSERVABILITY.md` |
| **CI/CD Pipeline** | `docs/CICD-AUTOMATION-PATTERNS.md`, `docs/CICD-SETUP-GUIDE.md` |
| **Gamification** | `docs/GAMIFICATION-PATTERNS.md` |

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
├── src/                    # React frontend
│   ├── VoiceChat.tsx       # Main voice interface
│   ├── Dashboard.tsx       # Quota tracking & tasks
│   └── main.tsx            # App entry point
├── workers/api/            # Cloudflare Worker (Hono)
│   └── src/
│       ├── routes/         # API endpoints
│       ├── agents/         # AI agent system
│       └── middleware/     # Request processing
├── schema/                 # D1 database migrations
├── docs/                   # Detailed documentation
└── .github/workflows/      # CI/CD pipelines
```

### Key API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/voice/transcribe` | Voice processing pipeline |
| `GET/POST /api/conversations` | Conversation management |
| `POST /api/search` | Semantic vector search |
| `GET /api/opportunities` | List detected generative tasks |
| `POST /api/harvest` | Execute all queued tasks |
| `GET /api/quota` | Real-time quota tracking |

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
Key tables: `users`, `conversations`, `messages`, `tasks`, `opportunities`, `achievements`

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

## Repository

- **GitHub:** https://github.com/SuperInstance/makerlog-ai
- **Production:** https://makerlog.ai
- **License:** MIT
