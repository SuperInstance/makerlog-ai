# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Table of Contents

- [Current Priorities](#current-priorities)
- [Project Overview](#project-overview)
- [Product Philosophy](#product-philosophy)
- [Quick Start](#quick-start)
- [Essential Reference Docs](#essential-reference-docs)
- [Development Commands](#development-commands)
- [Architecture](#architecture)
- [Modular Add-On System](#modular-add-on-system)
- [Key Files](#key-files)

---

## Current Priorities

> **Strategic Focus (January 2026):** Ship Makerlog.ai first. Studylog.ai is deferred.
>
> See `docs/plans/VISION-REFINEMENT-2026.md` and `docs/plans/STRATEGIC-DECISIONS.md` for full rationale.

### What We're Building NOW

**Makerlog.ai** - Voice-first AI assistant that captures ideas throughout the day and turns them into real outputs overnight.

**Core Value Prop:** "Talk through your day. Wake up to results."

1. **Capture** - Voice input during commute, walks, downtime
2. **Detect** - AI identifies things you mentioned wanting to create
3. **Generate** - Automatic execution overnight
4. **Deliver** - Wake up to images, code, content ready for review

### What's Descoped (For Now)

| Feature | Reason |
|---------|--------|
| Studylog.ai (kids platform) | COPPA complexity; validate adult market first |
| Desktop connector | No user demand signal yet |
| Module/add-on system | Premature abstraction |
| Advanced memory (Engram, HNSW) | Research, not product feature |

### 4-Week Ship Target

- **Week 1-2:** Complete core loop + auth
- **Week 3:** Search UI, daily logs, basic gamification
- **Week 4:** Launch, monitor, iterate

---

## Project Overview

**Makerlog.ai** is a voice-first AI platform for adults (18+).

> *Note: Studylog.ai (under-18 platform) is documented but deferred until Makerlog.ai is validated.*

### Makerlog.ai (Adults, 18+)
Voice-first AI assistant that captures your ideas through conversation and automatically generates outputs overnight. Users talk through ideas during the day, and the system detects generative opportunities that execute in the background.

**Core Features:**
- Voice capture with push-to-talk recording
- Speech-to-text transcription (Whisper)
- Opportunity detection (AI identifies tasks from conversation)
- Task queue with batch execution
- Generated asset storage and retrieval
- Semantic search across conversations
- Basic gamification (XP, levels)

**Tech Stack:**
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Cloudflare Workers (Hono framework)
- Database: D1 (SQLite), Vectorize (vector search), R2 (storage), KV (cache)
- AI: Cloudflare Workers AI (Whisper, Llama, SDXL, BGE)

**Monetization:** Deferred until product-market fit validation (100+ WAU)

---

## Product Philosophy

### Ship One Product Well

**Principle:** One great product beats two mediocre ones.

The original vision included Studylog.ai (kids) and Makerlog.ai (adults) as dual platforms. Strategic analysis revealed this violated our own "Microsoft Problem" principle - building "shared infrastructure" for two audiences creates exactly the bloated middle-ground we wanted to avoid.

**Current Approach:**
- **Makerlog.ai**: Full focus on voice-first workflow for adults
- **Studylog.ai**: Deferred until Makerlog is validated with real users
- **Ship fast**: 4 weeks to launch, not 12

### MVP Only - No Premature Abstraction

**Core MVP Features:**
1. Voice recording with transcription
2. Opportunity detection from conversation
3. Task queue with batch execution
4. Basic auth (email/password)
5. Semantic search
6. Daily logs viewer
7. Basic gamification (XP, level)

**Explicitly Descoped:**
- Module/add-on system (no add-ons exist to use it)
- Desktop connector (no demand signal)
- Threaded conversations (complexity without clear value)
- Advanced memory systems (research, not product)
- COPPA compliance (no kids platform yet)

**Progressive Enhancement:**
- Basic users get simple, fast experience
- Power users can add complexity as needed
- No performance penalty for unused features

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

### Strategic Direction (Start Here)
| Topic | Document |
|-------|----------|
| **Vision Refinement** | `docs/plans/VISION-REFINEMENT-2026.md` |
| **Strategic Decisions** | `docs/plans/STRATEGIC-DECISIONS.md` |
| **Makerlog.ai MVP** | `docs/research/MAKERLOG-MVP-VOICE-FIRST.md` |

### Deferred (Reference Only)
| Topic | Document |
|-------|----------|
| **Studylog.ai Platform** | `docs/research/STUDYLOG-KIDS-PLATFORM.md` *(deferred)* |
| **Original Roadmap** | `docs/plans/IMPLEMENTATION-ROADMAP.md` *(superseded)* |
| **Add-On Architecture** | `docs/research/MODULAR-ADDON-ARCHITECTURE.md` *(descoped)* |
| **Module Development** | `docs/research/MODULE-DEVELOPMENT-GUIDE.md` *(descoped)* |

### Integration & Patterns
| Topic | Document |
|-------|----------|
| **Cloudflare Integration** | `docs/research/CLOUDFLARE-INTEGRATION-PATTERNS.md` |
| **Voice Recorder** | `docs/research/VOICE-RECORDER-SEGMENTATION.md` |
| **AI Agent Architecture** | `docs/EMERGENT-AGENT-ARCHITECTURES.md` |
| **Voice Features** | `docs/EMERGENT-VOICE-PATTERNS.md` |

### Optimization & Operations
| Topic | Document |
|-------|----------|
| **Performance Optimization** | `docs/PERFORMANCE-OPTIMIZATION.md` |
| **Edge Computing** | `docs/EDGE-COMPUTING-PATTERNS.md` |
| **Mobile Development** | `docs/MOBILE-DEVELOPMENT-PATTERNS.md` |
| **Analytics & Monitoring** | `docs/ANALYTICS-OBSERVABILITY.md` |
| **CI/CD Pipeline** | `docs/CICD-AUTOMATION-PATTERNS.md` |

### Advanced Features (Add-Ons)
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
│   ├── StudylogChat.tsx          # Kid-friendly chat UI
│   └── main.tsx                  # App entry point
├── workers/api/                  # Cloudflare Worker (Hono)
│   └── src/
│       ├── routes/               # API endpoints
│       ├── middleware/           # Auth, safety, rate limiting
│       ├── modules/              # Add-on system
│       └── services/             # Business logic
├── packages/
│   ├── db/                       # Database package
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── schema.sql
│   └── desktop-connector/        # OPTIONAL ADD-ON
│       └── src/                  # Local AI acceleration
├── schema/                       # D1 database migrations
├── docs/                         # Detailed documentation
└── .github/workflows/            # CI/CD pipelines
```

### Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SHARED CLOUDFLARE INFRASTRUCTURE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐         ┌─────────────────┐                            │
│  │   Studylog.ai   │         │  Makerlog.ai    │                            │
│  │    (Under-18)   │         │    (Adults 18+) │                            │
│  ├─────────────────┤         ├─────────────────┤                            │
│  │ Voice Chat UI   │         │ Voice Chat UI   │                            │
│  │ Daily Quota     │         │ Harvest Tasks   │                            │
│  │ Parent Dashboard│         │ Achievement Sys │                            │
│  │ Approval Queue  │         │ Opportunity Det │                            │
│  └────────┬────────┘         └────────┬────────┘                            │
│           │                           │                                     │
│           └───────────┬───────────────┘                                     │
│                       ▼                                                     │
│           ┌───────────────────────┐                                        │
│           │  SHARED SERVICES      │                                        │
│           ├───────────────────────┤                                        │
│           │ Voice Recorder (VAD)  │                                        │
│           │ STT/TTS Pipeline      │                                        │
│           │ All 9 AI Models       │                                        │
│           │ Quota Gamification    │                                        │
│           │ Markdown Memory       │                                        │
│           └───────────┬───────────┘                                        │
│                       ▼                                                     │
│           ┌───────────────────────┐                                        │
│           │  CLOUDFLARE WORKERS   │                                        │
│           ├───────────────────────┤                                        │
│           │ D1 Database           │                                        │
│           │ Vectorize Search      │                                        │
│           │ R2 Storage            │                                        │
│           │ KV Cache              │                                        │
│           │ AI Gateway            │                                        │
│           └───────────────────────┘                                        │
│                                                                              │
│                         MODULAR ADD-ONS (Optional)                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Desktop    │  │ Threaded   │  │ AI         │  │ Advanced   │           │
│  │ Connector  │  │ Convers    │  │ Summaries  │  │ Memory     │           │
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
| `POST /api/harvest` | Execute all queued tasks |
| `GET /api/quota` | Real-time quota tracking |
| `POST /api/studylog/approvals/:id` | Parent approval (Studylog) |
| `POST /api/studylog/allowance` | Daily quota request (Studylog) |

---

## Modular Add-On System

> **Status: DESCOPED for MVP**
>
> The module system is designed but not implemented. Focus is on shipping core functionality first.
> This section is retained for future reference only.

<details>
<summary>Original design (click to expand)</summary>

### Three-Layer Feature Flags

**Layer 1: Static (Build-time)**
- Vite code splitting
- `import()` for lazy loading
- No runtime overhead

**Layer 2: Dynamic (KV)**
- Feature flags in Cloudflare KV
- <5ms evaluation
- User-level or global toggles

**Layer 3: Permission (D1)**
- User entitlements in database
- Subscription tracking
- Add-on enable/disable

### Module Interface

```typescript
export interface MakerlogModule {
  id: string;
  name: string;
  version: string;
  dependencies?: string[];

  initialize(context: ModuleContext): Promise<void>;
  destroy?(): Promise<void>;

  routes?: RouteDefinition[];
  components?: ComponentDefinition[];
  apiEndpoints?: ApiEndpointDefinition[];
  databaseMigrations?: MigrationDefinition[];

  capabilities: ModuleCapability[];
  pricing: ModulePricing;
}
```

### Add-On Catalog (Future)

**Tier 1 Add-Ons** ($5/month or usage-based):
- Threaded Conversations - Multi-thread chat UI
- AI Summaries - Automatic conversation summaries
- Advanced Memory - HNSW vector indexing + Engram O(1) lookup

**Tier 2 Add-Ons** ($10/month):
- Desktop Connector - Local AI acceleration (8-16GB VRAM required)
- Agent Swarms - Parallel specialist agents
- Hierarchical Planning - BabyAGI task decomposition

**Tier 3 Add-Ons** ($15/month):
- Recursive Language Models - Unlimited context reasoning
- Real-Time Collaboration - Multi-user sessions
- Custom Voice Personas - ElevenLabs integration

</details>

### Developing Add-Ons

1. Create module in `workers/api/src/modules/{module-name}/`
2. Implement `MakerlogModule` interface
3. Add routes, components, migrations as needed
4. Register in module registry
5. Add feature flag to KV

See `docs/research/MODULE-DEVELOPMENT-GUIDE.md` for complete guide.

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

**Studylog Tables:** `students`, `parent_child_relationships`, `approval_requests`, `daily_allowances`, `teacher_classes`

**Add-On Tables:** `style_profiles`, `generated_assets`, `user_feedback`, `voice_personas`, `user_settings`

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

## Platform-Specific Features

### Studylog.ai (Under-18)

**COPPA Compliance:**
- Age verification (birth date + parent consent)
- Parental supervision dashboard
- Approval workflows for sensitive requests
- Content filtering with Llama Guard 3
- Data minimization (right to be forgotten)

**User Personas:**
- **Students (8-17)**: Voice chat, project save, share with teacher
- **Parents**: Real-time activity, approval queue, daily allowance settings
- **Teachers**: Class overview (25 students), lesson planning, analytics

**Safety Features:**
- Multi-layer content filtering (input, output, context)
- Daily quota limits (set by parents)
- Time-of-day restrictions
- Push notifications for approvals

**Gamification:**
- XP for learning activities
- Level progression (Explorer → Builder → Architect)
- Educational achievements (First Code, Story Master, Quiz Whiz)
- Streaks with grace days

**Monetization:** Tutorial videos (non-intrusive, educational value)

### Makerlog.ai (Adults 18+)

**Voice-First Workflow:**
- Push-to-talk recording (96×96px button)
- Progressive upload to R2 (prevents data loss)
- VAD-based segmentation (intelligent breaks)
- Screenshot integration with timeline sync

**All 9 AI Models:**
- Whisper (STT), Web Speech API (TTS)
- Llama 3.1 8B (text, code, translation, summarization)
- SDXL (image generation)
- Florence-2 (image analysis)
- Resnet-50 (classification)
- BGE (embeddings)

**Gamification:**
- XP formula: `level = floor(sqrt(xp / 100)) + 1`
- Achievements: First Harvest (100 XP), Perfect Day (500 XP), Week Warrior (2000 XP)
- Streaks: Daily harvest tracking
- Quota dashboard: Real-time neuron usage

**Monetization:** Banner ads (unobtrusive footer/sidebar)

---

## Production Readiness

**Error Handling:** Exponential backoff, circuit breakers, graceful degradation

**Security:**
- Input validation for all user inputs
- Llama Guard 3 content moderation (Studylog)
- Rate limiting via Cloudflare Rate Limiter
- Prompt injection protection

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

**Studylog.ai:** Educational progression (Explorer → Builder → Architect)

**Makerlog.ai:** Developer-focused (mastery, autonomy, efficiency)

**Anti-Burnout:** Streak forgiveness, grace days, quality metrics

See `docs/GAMIFICATION-PATTERNS.md` for design principles and roadmap.

---

## 12-Week Implementation Roadmap

**Phase 1: Foundation (Weeks 1-2)**
- Database schema extensions
- Safety infrastructure (Llama Guard 3)
- Feature flag system (KV + Vite)
- Module registry

**Phase 2-4: Studylog.ai (Weeks 3-8)**
- Student chat interface
- Parent dashboard + push notifications
- Teacher classroom management

**Phase 5-6: Makerlog.ai Core (Weeks 3-6)**
- Voice recorder with VAD
- STT/TTS integration
- All 9 AI models
- Markdown memory

**Phase 7: Gamification (Weeks 7-8)**
- XP/leveling system
- Achievements
- Streaks
- Quota dashboards

**Phase 8: Modular Add-Ons (Weeks 9-10)**
- Threaded conversations
- AI summaries
- Desktop connector
- Advanced memory

**Phase 9: Polish & Launch (Weeks 11-12)**
- COPPA compliance testing
- Safety testing
- User testing
- Documentation

See `docs/plans/IMPLEMENTATION-ROADMAP.md` for complete details.

---

## Repository

- **GitHub:** https://github.com/SuperInstance/makerlog-ai
- **Makerlog.ai:** https://makerlog.ai (adults 18+)
- **Studylog.ai:** https://studylog.ai (under-18, coming soon)
- **License:** MIT
