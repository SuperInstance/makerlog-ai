# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Table of Contents

- [Strategic Priorities](#strategic-priorities)
- [Project Overview](#project-overview)
- [Product Philosophy](#product-philosophy)
- [Quick Start](#quick-start)
- [Essential Reference Docs](#essential-reference-docs)
- [Development Commands](#development-commands)
- [Architecture](#architecture)
- [Key Files](#key-files)

---

## Strategic Priorities

**Current Focus: Makerlog.ai ONLY**

We are building a single, focused product for adult developers (18+). Studylog.ai is deferred to post-launch.

**Launch Timeline: 4 Weeks**

We ship a functional MVP in 4 weeks, not 12. Every feature decision must pass the "is this essential for launch?" test.

**MVP Features Only**

The launch includes ONLY core features:
- Push-to-talk voice recording with transcription
- AI chat with all 9 Cloudflare models
- Opportunity detection (code, images, text generation)
- Batch overnight execution ("harvesting")
- Basic gamification (XP, levels, streaks)

**Value Proposition**

> "Talk through your day. Wake up to results."

Capture ideas via voice while mobile. The system detects generative opportunities (code snippets, images, documentation). Execute them overnight using unused Cloudflare free tier quota.

**Advanced Features = Post-Launch**

RLM, Engram, Desktop Connector, agent swarms, and other sophisticated features are documented for future implementation but are NOT part of the current 4-week sprint.

---

## Project Overview

**Makerlog.ai** is a voice-first development assistant for adult developers (18+) that gamifies Cloudflare free tier quota harvesting.

**Core Workflow:**
1. Users talk through ideas during the day via push-to-talk voice recording
2. AI analyzes conversations and detects generative opportunities (code, images, text)
3. Users review and queue opportunities for generation
4. System executes tasks overnight using unused Cloudflare free tier quota
5. Users wake up to completed work (code snippets, images, documentation)

**Tech Stack:**
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Cloudflare Workers (Hono framework)
- Database: D1 (SQLite), Vectorize (vector search), R2 (storage), KV (cache)
- AI: Cloudflare Workers AI (all 9 models)

**Monetization:** Banner ads (unobtrusive footer/sidebar)

**MVP-First Philosophy:**
Ship core features only in 4 weeks. Advanced features become post-launch enhancements.

---

## Product Philosophy

### Launch Fast, Iterate Later

**Principle:** Ship a focused MVP in 4 weeks. Add sophistication based on real usage.

We don't build for imaginary edge cases. We build for the core workflow: voice → opportunity detection → overnight execution → wake up to results.

**Core MVP Features:**
1. Cloudflare account linking (users bring their own quota)
2. Push-to-talk voice recording with transcription
3. AI chat with all 9 Cloudflare models
4. Opportunity detection (code, images, text generation)
5. Batch overnight execution
6. Basic gamification (XP, levels, streaks)

**Progressive Enhancement (Post-Launch):**
- Advanced features are documented for future implementation
- Add sophistication based on real user behavior
- Never sacrifice simplicity for theoretical power

### Developer-Focused Experience

**Our Audience:** Adult developers (18+) who want to capture ideas while mobile and review/generated code on desktop.

**Not Our Audience (Right Now):**
- Students under 18 (Studylog.ai is post-launch)
- Enterprise teams (collaboration features are post-launch)
- Non-technical users (we assume familiarity with development workflows)

**Design Principles:**
- Voice-first, not voice-only
- Mobile capture, desktop review
- Developer-centric gamification (mastery, autonomy, efficiency)
- Quota as a game mechanic, not a constraint

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

### Launch Strategy (4-Week Plan)
| Topic | Document |
|-------|----------|
| **4-Week Launch Roadmap** | `docs/plans/4-WEEK-LAUNCH-ROADMAP.md` |
| **Makerlog.ai MVP** | `docs/research/MAKERLOG-MVP-VOICE-FIRST.md` |
| **Vision & Strategy** | `docs/VISION-REFINEMENT.md` |

### Architecture & Integration
| Topic | Document |
|-------|----------|
| **Cloudflare Integration** | `docs/research/CLOUDFLARE-INTEGRATION-PATTERNS.md` |
| **Voice Recording** | `docs/research/VOICE-RECORDER-SEGMENTATION.md` |
| **Voice Features** | `docs/EMERGENT-VOICE-PATTERNS.md` |
| **AI Agent Architecture** | `docs/EMERGENT-AGENT-ARCHITECTURES.md` |

### Optimization & Operations
| Topic | Document |
|-------|----------|
| **Performance Optimization** | `docs/PERFORMANCE-OPTIMIZATION.md` |
| **Edge Computing** | `docs/EDGE-COMPUTING-PATTERNS.md` |
| **Mobile Development** | `docs/MOBILE-DEVELOPMENT-PATTERNS.md` |
| **Analytics & Monitoring** | `docs/ANALYTICS-OBSERVABILITY.md` |
| **CI/CD Pipeline** | `docs/CICD-AUTOMATION-PATTERNS.md` |

### Advanced Features (Post-Launch)
| Topic | Document |
|-------|----------|
| **Desktop Connector** | `docs/DESKTOP-CONNECTOR.md` |
| **Self-Improvement** | `docs/SELF-IMPROVEMENT.md` |
| **Recursive Language Models** | `docs/research/RECURSIVE-LANGUAGE-MODELS.md` |
| **Engram Memory** | `docs/research/ENGRAM-CONDITIONAL-MEMORY.md` |
| **Tiered Memory** | `docs/research/TIERED-MEMORY-ARCHITECTURES.md` |
| **Vector Indexing** | `docs/research/VECTOR-DATABASE-INDEXING.md` |
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
├── src/                          # React frontend
│   ├── VoiceChat.tsx             # Main voice interface
│   ├── Dashboard.tsx             # Quota tracking & tasks
│   └── main.tsx                  # App entry point
├── workers/api/                  # Cloudflare Worker (Hono)
│   └── src/
│       ├── routes/               # API endpoints
│       ├── middleware/           # Auth, rate limiting
│       └── services/             # Business logic
├── packages/
│   └── db/                       # Database package
│       ├── migrations/
│       ├── seeds/
│       └── schema.sql
├── schema/                       # D1 database migrations
├── docs/                         # Detailed documentation
└── .github/workflows/            # CI/CD pipelines
```

### Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MAKERLOG.AI (Adults 18+)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         VOICE FIRST INTERFACE                        │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  • Push-to-Talk Recording (96×96px button)                           │   │
│  │  • Real-Time Transcription (Whisper)                                 │   │
│  │  • AI Chat (Llama 3.1 8B)                                            │   │
│  │  • Visual Waveform & Duration Display                                │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    OPPORTUNITY DETECTION ENGINE                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  • Code Generation Opportunities                                     │   │
│  │  • Image Generation Requests (SDXL)                                  │   │
│  │  • Text/Documentation Tasks                                          │   │
│  │  • Smart Caching & Deduplication                                     │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      OVERNIGHT HARVEST SYSTEM                        │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  • Batch Task Execution                                              │   │
│  │  • Quota Optimization                                                │   │
│  │  • Progress Tracking                                                 │   │
│  │  • Daily Digest Generation                                           │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    GAMIFICATION & ACHIEVEMENTS                       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  • XP & Leveling System                                              │   │
│  │  • Streak Tracking                                                   │   │
│  │  • Achievement Badges (First Harvest, Perfect Day, Week Warrior)     │   │
│  │  • Real-Time Quota Dashboard                                         │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CLOUDFLARE SERVICES LAYER                         │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  • D1 Database (users, conversations, messages, tasks, opportunities)│   │
│  │  • Vectorize (semantic search, 768-dim cosine similarity)           │   │
│  │  • R2 Storage (audio files, generated assets)                        │   │
│  │  • KV Cache (quota status, session data, feature flags)              │   │
│  │  • Workers AI (all 9 models: Whisper, Llama, SDXL, Florence, BGE)   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                         ADVANCED FEATURES (Post-Launch)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Desktop    │  │ RLM        │  │ Engram     │  │ Agent      │           │
│  │ Connector  │  │ (Unlimited │  │ Memory     │  │ Swarms     │           │
│  │            │  │  Context)  │  │ System     │  │            │           │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘           │
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
| `POST /api/opportunities/:id/queue` | Queue opportunity for generation |
| `POST /api/opportunities/:id/refine` | Edit prompt before queueing |
| `POST /api/opportunities/:id/reject` | Skip opportunity |
| `POST /api/harvest` | Execute all queued tasks |
| `GET /api/quota` | Real-time quota tracking |
| `GET /api/digest` | Daily summary |

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
- `KV` - Cache namespace + feature flags
- `VECTORIZE` - Semantic search index

### Database Schema
**Core Tables:** `users`, `conversations`, `messages`, `tasks`, `opportunities`, `achievements`

**Advanced Features (Post-Launch):** Add-on tables will be added as needed for modular features.

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
- Progressive Web App (PWA) capabilities

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

## Makerlog.ai Core Features

### Voice-First Workflow
- Push-to-talk recording (96×96px button, exceeds WCAG AAA minimum)
- Progressive upload to R2 (prevents data loss on mobile)
- Real-time transcription with Whisper
- Visual waveform and duration display
- Haptic feedback for recording confirmation

### AI Capabilities (All 9 Cloudflare Models)
- **Whisper** (STT): Large-v3-turbo for transcription
- **Llama 3.1 8B**: Text, code, translation, summarization
- **SDXL**: Image generation
- **Florence-2**: Image analysis and understanding
- **Resnet-50**: Image classification
- **BGE**: Text embeddings for semantic search
- Additional models available for specialized tasks

### Opportunity Detection
AI analyzes conversations and detects:
- Code generation opportunities (components, APIs, utilities)
- Image generation requests (icons, mockups, diagrams)
- Text/documentation tasks (README files, comments, docs)
- Research and information gathering tasks

### Overnight Harvest System
- Batch execution of queued tasks during off-hours
- Quota optimization (maximize free tier usage)
- Progress tracking and status updates
- Daily digest of completed work

### Gamification
- **XP System**: `level = floor(sqrt(xp / 100)) + 1`
- **Achievements**: First Harvest (100 XP), Perfect Day (500 XP), Week Warrior (2000 XP)
- **Streaks**: Daily harvest tracking with grace periods
- **Quota Dashboard**: Real-time neuron usage tracking

### Monetization
Banner ads (unobtrusive footer/sidebar placement)

---

## Production Readiness

**Error Handling:** Exponential backoff, circuit breakers, graceful degradation

**Security:**
- Input validation for all user inputs
- Rate limiting via Cloudflare Rate Limiter
- Prompt injection protection
- Content safety checks (age-appropriate filtering)

**Monitoring:**
- Cloudflare Workers Analytics (built-in, free)
- Sentry (optional, for error tracking)
- Custom metrics for quota tracking

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

## Gamification

**Philosophy:** Quality over quantity. Meaningful contributions, not token activity.

**Developer-Focused:** Designed for developers who value mastery, autonomy, and efficiency.

**Anti-Burnout:** Streak forgiveness, grace days, quality metrics.

**Achievement Examples:**
- First Harvest (100 XP) - Complete your first overnight harvest
- Perfect Day (500 XP) - 100% quota usage in one day
- Week Warrior (2000 XP) - 7-day harvest streak
- Century Club (1500 XP) - Complete 100 tasks

See `docs/GAMIFICATION-PATTERNS.md` for design principles and roadmap.

---

## 4-Week Launch Roadmap

**Week 1: Foundation & Voice Core**
- Cloudflare Workers API setup
- D1 database schema and migrations
- Vectorize index configuration
- Push-to-talk voice recording
- Whisper transcription integration
- Basic voice UI (record, transcribe, display)

**Week 2: AI Chat & Opportunity Detection**
- Llama 3.1 8B chat integration
- All 9 AI models accessible
- Opportunity detection engine (code, images, text)
- Opportunity review interface
- Queue/reject/refine workflows
- Semantic search with Vectorize

**Week 3: Harvest System & Gamification**
- Overnight batch execution system
- Quota optimization and tracking
- XP and leveling system
- Achievement system
- Streak tracking
- Daily digest generation

**Week 4: Polish & Launch**
- Mobile optimization and PWA setup
- Performance optimization (caching, batching)
- Error handling and edge cases
- User testing and feedback
- Documentation
- Production deployment

See `docs/plans/4-WEEK-LAUNCH-ROADMAP.md` for complete details.

---

## Advanced Features (Post-Launch)

The following features are documented for future implementation but are **NOT part of the 4-week MVP**:

### Desktop Connector
Local AI acceleration using user's GPU (8-16GB VRAM required). Reduces Cloudflare quota usage for power users.

**Documentation:** `docs/DESKTOP-CONNECTOR.md`

### Recursive Language Models (RLM)
Unlimited context reasoning through recursive summarization and expansion.

**Documentation:** `docs/research/RECURSIVE-LANGUAGE-MODELS.md`

### Engram Conditional Memory
O(1) lookup system for context-aware memory retrieval with conditional filtering.

**Documentation:** `docs/research/ENGRAM-CONDITIONAL-MEMORY.md`

### Agent Swarms & Hierarchical Planning
Parallel specialist agents for complex task decomposition and execution.

**Documentation:** `docs/EMERGENT-AGENT-ARCHITECTURES.md`

### Advanced Memory Systems
Tiered memory architectures with HNSW vector indexing and intelligent caching.

**Documentation:** `docs/research/TIERED-MEMORY-ARCHITECTURES.md`

**Implementation Timeline:** These features will be prioritized based on user feedback after the initial 4-week launch.

---

## Repository

- **GitHub:** https://github.com/SuperInstance/makerlog-ai
- **Production:** https://makerlog.ai
- **License:** MIT

---

## Important Notes

### Current Sprint Focus
We are building **Makerlog.ai only** for a 4-week launch. Studylog.ai and advanced features are deferred to post-launch.

### Decision Framework
When making implementation decisions, ask:
1. Is this essential for the 4-week launch?
2. Does this support the core workflow (voice → opportunity → harvest → results)?
3. Can this be added later without breaking changes?

If the answer to any of these is "no," defer to post-launch.

### Technical Debt Acceptance
We accept technical debt in favor of speed. The goal is a functional MVP in 4 weeks, not perfect code. We will refactor based on real usage patterns after launch.
