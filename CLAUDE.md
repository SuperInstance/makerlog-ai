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
- [Code Patterns](#code-patterns)
- [Testing](#testing)
- [Deployment](#deployment)
- [Production Readiness](#production-readiness)
- [Current Status](#current-status)

---

## Strategic Priorities

**Product: Makerlog.ai (Adult Developers 18+)**

A voice-first development assistant that gamifies Cloudflare free tier quota harvesting. Users talk through ideas during the day, and the system automatically detects generative opportunities (code snippets, images, text) that execute overnight using unused free tier credits.

**Current Status: LAUNCHED**

The 4-week MVP milestone is complete. The application is deployed and functional at https://makerlog.ai.

**Current Focus: Iteration & Enhancement**

We're now in the post-launch phase, iterating based on real user behavior and feedback. Advanced features are being progressively added based on usage patterns.

**Value Proposition**

> "Talk through your day. Wake up to results."

**Core Features (Implemented):**
- Push-to-talk voice recording with transcription (Whisper)
- AI chat with Cloudflare Workers AI (Llama 3.1 8B)
- Opportunity detection (code, images, text generation)
- Batch overnight execution ("harvesting")
- Gamification (XP, levels, streaks, achievements)
- Real-time streaming AI responses (SSE)
- Offline support with IndexedDB
- WCAG 2.2 AAA accessibility

**Enhanced Features (Recently Added):**
- Server-Sent Events for streaming AI responses
- Offline capture and sync
- Advanced accessibility (skip links, focus management, live regions)
- Performance optimization (75KB gzipped bundle)
- Enhanced gamification (XP animations, level-up celebrations)
- Audio waveform visualization
- Haptic feedback

**Future Roadmap (Priority Based on User Feedback):**
- Desktop Connector (local AI acceleration for power users)
- Advanced agent swarms (specialist agents for complex tasks)
- Recursive Language Models (unlimited context)
- Engram Memory System (O(1) conditional memory)
- Studylog.ai (deferred - student-focused companion product)

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
- AI: Cloudflare Workers AI (Whisper, Llama 3.1 8B, SDXL, BGE, and more)

**Monetization:** Banner ads (unobtrusive footer/sidebar)

**Development Philosophy:**
Ship core features first, then iterate based on real usage. Progressive enhancement from basic to advanced.

---

## Product Philosophy

### Developer-Focused Experience

**Our Audience:** Adult developers (18+) who want to capture ideas while mobile and review generated code on desktop.

**Design Principles:**
- Voice-first, not voice-only
- Mobile capture, desktop review
- Developer-centric gamification (mastery, autonomy, efficiency)
- Quota as a game mechanic, not a constraint

### Progressive Enhancement

**Tier 1: Core MVP (Launched)**
- Cloudflare account linking (users bring their own quota)
- Push-to-talk voice recording with transcription
- AI chat with Llama 3.1 8B
- Opportunity detection (code, images, text generation)
- Batch overnight execution
- Basic gamification (XP, levels, streaks)

**Tier 2: Enhanced Experience (Recently Added)**
- Real-time streaming AI responses (SSE)
- Offline support with IndexedDB
- WCAG 2.2 AAA accessibility
- Performance optimization
- Enhanced gamification polish

**Tier 3: Power User Features (In Progress)**
- Desktop Connector (local AI acceleration)
- Advanced agent swarms
- Unlimited context (RLM)

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
3. Resources are already created (makerlog-db, makerlog-conversations)

---

## Essential Reference Docs

### Core Documentation
| Topic | Document |
|-------|----------|
| **Main Roadmap** | `docs/ROADMAP.md` |
| **Product Vision** | `docs/VISION-REFINEMENT.md` |
| **Onboarding Guide** | `docs/ONBOARDING.md` |

### Architecture & Integration
| Topic | Document |
|-------|----------|
| **Cloudflare Integration** | `docs/research/CLOUDFLARE-INTEGRATION-PATTERNS.md` |
| **Voice Recording** | `docs/research/VOICE-RECORDER-SEGMENTATION.md` |
| **Voice Features** | `docs/EMERGENT-VOICE-PATTERNS.md` |
| **AI Agent Architecture** | `docs/EMERGENT-AGENT-ARCHITECTURES.md` |

### Recently Implemented Features
| Topic | Document |
|-------|----------|
| **Streaming Implementation** | `docs/STREAMING-IMPLEMENTATION.md` |
| **Streaming Quick Ref** | `docs/STREAMING-QUICK-REF.md` |
| **Streaming Integration** | `docs/STREAMING-INTEGRATION-GUIDE.md` |
| **Offline Support** | `docs/OFFLINE-SUPPORT.md` |
| **Accessibility Guide** | `docs/ACCESSIBILITY-QUICKSTART.md` |
| **Accessibility Implementation** | `docs/ACCESSIBILITY-IMPLEMENTATION.md` |
| **Gamification Implementation** | `docs/GAMIFICATION-IMPLEMENTATION.md` |
| **Gamification Quick Start** | `docs/GAMIFICATION-QUICK-START.md` |

### Optimization & Operations
| Topic | Document |
|-------|----------|
| **Performance Optimization** | `docs/PERFORMANCE-OPTIMIZATION.md` |
| **Edge Computing** | `docs/EDGE-COMPUTING-PATTERNS.md` |
| **Mobile Development** | `docs/MOBILE-DEVELOPMENT-PATTERNS.md` |
| **Analytics & Monitoring** | `docs/ANALYTICS-OBSERVABILITY.md` |
| **CI/CD Pipeline** | `docs/CICD-AUTOMATION-PATTERNS.md` |
| **CI/CD Setup Guide** | `docs/CICD-SETUP-GUIDE.md` |

### Advanced Features (Future)
| Topic | Document |
|-------|----------|
| **Desktop Connector** | `docs/DESKTOP-CONNECTOR.md` |
| **Self-Improvement** | `docs/SELF-IMPROVEMENT.md` |
| **Recursive Language Models** | `docs/research/RECURSIVE-LANGUAGE-MODELS.md` |
| **Engram Memory** | `docs/research/ENGRAM-CONDITIONAL-MEMORY.md` |
| **Tiered Memory** | `docs/research/TIERED-MEMORY-ARCHITECTURES.md` |
| **Vector Indexing** | `docs/research/VECTOR-DATABASE-INDEXING.md` |
| **Gamification Patterns** | `docs/GAMIFICATION-PATTERNS.md` |

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
npm run deploy       # Deploy worker to development
npm run deploy:prod  # Deploy worker to production
npm run tail         # View real-time logs
```

### Testing
```bash
npm run test              # Run all tests (Vitest)
npm run test:ui           # Vitest UI mode
npm run test:coverage     # Coverage report
npm run test:e2e          # Playwright E2E tests
npm run test:unit         # Frontend unit tests only
npm run test:worker       # Worker unit tests only
```

### Database
```bash
npm run db:migrate        # Execute D1 migrations
npm run db:migrate:test   # Set up test D1 database
```

### Deployment
```bash
npm run deploy:all        # Build frontend + deploy worker + deploy pages
```

---

## Architecture

### Project Structure

```
makerlog-ai/
├── src/                          # React frontend
│   ├── VoiceChat.tsx             # Main voice interface
│   ├── Dashboard.tsx             # Quota tracking & tasks
│   ├── main.tsx                  # App entry point
│   ├── components/               # Reusable components
│   │   ├── StreamingMessageBubble.tsx
│   │   ├── OfflineStatusIndicator.tsx
│   │   ├── accessibility/        # A11y components
│   │   └── gamification/         # Gamification components
│   ├── hooks/                    # Custom React hooks
│   │   ├── useStreamingTranscription.ts
│   │   ├── useOfflineSync.ts
│   │   ├── useFocusManager.ts
│   │   └── useLiveRegion.ts
│   ├── lib/                      # Libraries and utilities
│   │   ├── offlineStorage.ts
│   │   └── serviceWorkerRegistration.ts
│   └── utils/                    # Utility functions
│       └── performance.ts
├── workers/api/                  # Cloudflare Worker (Hono)
│   ├── src/
│   │   └── index.ts              # Main API router
│   └── wrangler.toml             # Worker config
├── packages/
│   └── db/                       # Database package
│       └── migrations/           # D1 schema migrations
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
│  │  • Push-to-Talk Recording (96×96px button, WCAG AAA compliant)     │   │
│  │  • Real-Time Transcription (Whisper Large-v3-turbo)                 │   │
│  │  • AI Chat (Llama 3.1 8B with SSE streaming)                       │   │
│  │  • Visual Waveform & Duration Display                               │   │
│  │  • Haptic Feedback & Audio Beeps                                    │   │
│  │  • Offline Capture (IndexedDB)                                      │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    OPPORTUNITY DETECTION ENGINE                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  • Code Generation Opportunities                                     │   │
│  │  • Image Generation Requests (SDXL)                                  │   │
│  │  • Text/Documentation Tasks                                          │   │
│  │  • Smart Caching (KV, AI Gateway)                                    │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      OVERNIGHT HARVEST SYSTEM                        │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  • Batch Task Execution                                              │   │
│  │  • Quota Optimization (Free Tier Maximization)                       │   │
│  │  • Progress Tracking (Real-Time)                                      │   │
│  │  • Daily Digest Generation                                           │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    GAMIFICATION & ACHIEVEMENTS                       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  • XP & Leveling System (sqrt formula)                               │   │
│  │  • Streak Tracking (with Grace Periods)                              │   │
│  │  • Achievement Badges (First Harvest, Perfect Day, Week Warrior)     │   │
│  │  • XP Float Animations & Level Up Celebrations                       │   │
│  │  • Sound Effects (Optional)                                           │   │
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
│  │  • Workers AI (Whisper, Llama, SDXL, BGE, and more)                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                         FUTURE ENHANCEMENTS                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Desktop    │  │ RLM        │  │ Engram     │  │ Agent      │           │
│  │ Connector  │  │ (Unlimited │  │ Memory     │  │ Swarms     │           │
│  │ (In Dev)   │  │  Context)  │  │ System     │  │            │           │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key API Endpoints

| Endpoint | Purpose | Implementation |
|----------|---------|----------------|
| `POST /api/voice/upload-chunk` | Progressive audio upload | `uploadChunk()` with R2 |
| `POST /api/voice/finalize` | Finalize and transcribe recording | `finalizeRecording()` with Whisper |
| `GET/POST /api/conversations` | Conversation management | `ensureUser()` helper |
| `POST /api/search` | Semantic vector search | Vectorize + BGE embeddings |
| `GET /api/opportunities` | List detected generative tasks | Swarm analysis |
| `POST /api/opportunities/:id/queue` | Queue opportunity for generation | Task creation |
| `POST /api/opportunities/:id/refine` | Edit prompt before queueing | Prompt refinement |
| `POST /api/opportunities/:id/reject` | Skip opportunity | Status update |
| `POST /api/harvest` | Execute all queued tasks | Batch processing |
| `GET /api/quota` | Real-time quota tracking | KV cached |
| `GET /api/digest` | Daily summary | Aggregated metrics |
| `GET /api/stream` | SSE streaming for AI responses | Real-time updates |

---

## Key Files

### Configuration Files
- `wrangler.toml` - Worker deployment config (AI, DB, R2, KV, VECTORIZE bindings)
- `wrangler.pages.toml` - Pages deployment config (VITE_API_URL env var)
- `vite.config.ts` - Frontend build config with proxy
- `package.json` - Scripts and dependencies
- `tailwind.config.js` - Tailwind CSS configuration

### Worker Bindings (wrangler.toml)
```toml
[ai]
binding = "AI"

[[kv_namespaces]]
binding = "KV"
id = "cd2b23e7003d43f2afb9bf53c2cbbcb3"

[[r2_buckets]]
binding = "R2"
bucket_name = "makerlog-assets"

[[d1_databases]]
binding = "DB"
database_name = "makerlog-db"
database_id = "e8540ce2-a898-4669-8afe-00fe04c1eb41"

[[vectorize]]
binding = "VECTORIZE"
index_name = "makerlog-conversations"
```

### Database Schema
**Core Tables:** `users`, `conversations`, `messages`, `tasks`, `opportunities`, `achievements`

**Helper Function:**
```typescript
async function ensureUser(env: Env, userId: string): Promise<string> {
  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) {
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(`INSERT INTO users (id, email, xp, level, streak_days, created_at, updated_at) VALUES (?, ?, 0, 1, 0, ?, ?)`).bind(
      userId, userId === 'demo-user' ? 'demo@example.com' : `${userId}@makerlog.ai`, now, now
    ).run();
  }
  return userId;
}
```

---

## Code Patterns

### Worker API Structure
- Hono router with `/api` prefix
- Zod validation for request/response schemas
- Parameterized D1 queries (SQL injection safe)
- Consistent error handling with HTTP status codes
- `ensureUser()` helper for auto-user-creation on 13 endpoints

### Frontend Patterns
- Functional components with TypeScript
- Tailwind CSS for styling
- Push-to-talk recording via MediaRecorder API
- Progressive Web App (PWA) capabilities
- Custom hooks for logic separation

### Audio Processing Flow
1. Record audio → WebM blob chunks
2. Upload chunks progressively to R2 → Prevent data loss
3. On stop: await final chunk upload
4. Finalize recording → Transcribe with Whisper
5. Generate response with Llama → Stream via SSE
6. Create embeddings with BGE → Store in Vectorize

### Streaming Pattern
```typescript
// Server-Sent Events for streaming AI responses
const response = await fetch('/api/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, conversationId }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Process SSE chunk: update UI with delta
}
```

---

## Testing

**Stack:** Vitest + React Testing Library + Playwright + MSW (for AI mocking)

**Test Commands:**
```bash
npm run test              # Run all tests
npm run test:ui           # Vitest UI mode
npm run test:coverage     # Coverage report
npm run test:e2e          # Playwright E2E tests
npm run test:unit         # Frontend unit tests only
npm run test:worker       # Worker unit tests only
```

**Strategy:**
- Mock AI responses with MSW (no quota consumption in tests)
- Use real bindings in integration tests via `@cloudflare/vitest-pool-workers`
- Database seed files for consistent test data
- Test error handling and retry logic with fault injection

---

## Deployment

### Production URLs
- **Frontend:** https://makerlog.ai (Cloudflare Pages)
- **Worker API:** https://makerlog-api-v2.casey-digennaro.workers.dev

### Deployment Process
- **Frontend:** `npm run build && wrangler pages deploy dist`
- **Worker:** `cd workers/api && wrangler deploy`
- **Combined:** `npm run deploy:all`

### Environments
- **Development:** Local (wrangler dev), mock AI services
- **Staging:** Preview deployments per PR
- **Production:** main branch, full AI quota

### CI/CD Pipeline
See `docs/CICD-AUTOMATION-PATTERNS.md` for comprehensive CI/CD setup including:
- GitHub Actions workflows
- Automated testing and linting
- Preview deployments for PRs
- Production deployment on merge to main
- Health checks and rollback procedures

---

## Production Readiness

### Error Handling
- Exponential backoff with jitter for transient failures
- Circuit breakers to prevent cascading failures
- Graceful degradation when AI services unavailable
- Timeout management per AI model type

### Security
- Input validation for all user inputs (Zod schemas)
- Rate limiting via Cloudflare Rate Limiter
- Prompt injection protection
- Content safety checks (age-appropriate filtering)
- Parameterized queries (SQL injection safe)

### Monitoring & Analytics
- Cloudflare Workers Analytics (built-in, free)
- Sentry (optional, for error tracking)
- Custom metrics for quota tracking

**Privacy-First Analytics:** See `docs/ANALYTICS-OBSERVABILITY.md` for GDPR/EU AI Act compliant strategy

### Performance Targets
- **Frontend:** LCP <2.5s, TTI <3.5s
- **Backend (cached):** P95 <200ms
- **Backend (AI):** P95 <8s
- **Cache hit rate:** >30%
- **Neuron reduction:** 40-50% through optimization

See `docs/PERFORMANCE-OPTIMIZATION.md` for comprehensive strategies.

---

## Current Status

### Launched Features (Production)
✅ Push-to-talk voice recording with Whisper transcription
✅ AI chat with Llama 3.1 8B
✅ Opportunity detection (code, images, text)
✅ Batch overnight execution
✅ Gamification (XP, levels, streaks, achievements)
✅ Real-time streaming AI responses (SSE)
✅ Offline support with IndexedDB
✅ WCAG 2.2 AAA accessibility
✅ Performance optimization (75KB gzipped)

### Known Issues & Fixes
- ✅ Fixed: FOREIGN KEY constraint error on task creation → Added `ensureUser()` helper
- ✅ Fixed: Recording upload failure → Await final chunk upload before finalizing
- ✅ Fixed: TypeScript compilation errors → Changed `NodeJS.Timeout` to `number`

### In Progress
- Desktop Connector (local AI acceleration)
- Advanced agent swarms
- Recursive Language Models (unlimited context)

### Deferred (Post-Launch)
- Studylog.ai (student-focused companion product)
- Enterprise collaboration features
- Advanced analytics dashboard

---

## Important Notes

### Decision Framework
When making implementation decisions, ask:
1. Does this improve the core user experience?
2. Is this based on real user feedback or data?
3. Can this be implemented without breaking existing functionality?
4. Is the effort justified by the value delivered?

### Progressive Enhancement Philosophy
- Start with the simplest working solution
- Add sophistication based on actual usage patterns
- Never sacrifice simplicity for theoretical power
- Measure everything, optimize what matters

### Technical Debt Management
We accepted technical debt during the 4-week launch to ship fast. Now we prioritize:
1. Paying down debt that impacts user experience
2. Refactoring based on real usage patterns
3. Adding features based on user feedback
4. Maintaining velocity while improving quality

---

## Repository

- **GitHub:** https://github.com/SuperInstance/makerlog-ai
- **Production:** https://makerlog.ai
- **License:** MIT

---

**Last Updated:** 2026-01-23 (Post-Launch Iteration Phase)
