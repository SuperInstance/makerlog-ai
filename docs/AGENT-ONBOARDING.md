# Agent Onboarding Guide

**For:** Claude Code Agents and Implementation Specialists
**Version:** 1.0
**Date:** January 21, 2026
**Status:** Ready for Use

---

## Quick Reference

**You are working on:** Two voice-first AI platforms with shared infrastructure
- **Studylog.ai** - Kid-friendly AI learning platform (under-18)
- **Makerlog.ai** - Adult voice-first Cloudflare quota harvester (18+)

**Core Philosophy:**
1. **MVP First** - Build only core features initially
2. **Modular Add-Ons** - Everything beyond MVP is an optional module
3. **Progressive Enhancement** - Simple for beginners, powerful for power users
4. **"The Microsoft Problem"** - Don't design for imaginary "middle users"

**Tech Stack:**
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Cloudflare Workers (Hono framework)
- Database: D1, Vectorize, R2, KV
- AI: Cloudflare Workers AI (all 9 models)

---

## Before You Code

### Step 1: Understand Which Platform

| Question | Studylog.ai | Makerlog.ai |
|----------|-------------|-------------|
| **Target Age** | 8-17 years | 18+ years |
| **Primary Goal** | Learning with supervision | Harvest quota autonomously |
| **Key Constraint** | COPPA compliance | Voice-first efficiency |
| **Supervision** | Parent/Teacher required | User autonomy |
| **Safety** | Multi-layer filtering | Basic moderation |
| **Gamification** | Educational progression | Developer achievements |

**If you're unsure, check:**
- File path: `/src/StudylogChat.tsx` = Studylog
- File path: `/src/VoiceChat.tsx` = Makerlog
- API route: `/api/studylog/*` = Studylog
- API route: `/api/opportunities/*` = Makerlog

### Step 2: Check If Feature Is MVP or Add-On

**Core MVP Features** (implement first):
1. Voice recording with push-to-talk
2. STT/TTS dialogue system
3. Cloudflare account linking
4. Quota tracking and gamification
5. All 9 AI models accessible
6. Markdown memory with search

**Modular Add-Ons** (implement later):
- Threaded conversations
- AI summaries
- Desktop connector
- Advanced memory (Engram, HNSW)
- RLM (Recursive Language Models)
- Agent swarms

**If feature is an add-on:**
- Create in `workers/api/src/modules/{module-name}/`
- Implement `MakerlogModule` interface
- Add feature flag to KV
- Document as optional

### Step 3: Read Relevant Documentation

**For MVP Implementation:**
- `docs/research/STUDYLOG-KIDS-PLATFORM.md` - Studylog complete specification
- `docs/research/MAKERLOG-MVP-VOICE-FIRST.md` - Makerlog complete specification
- `docs/research/CLOUDFLARE-INTEGRATION-PATTERNS.md` - All AI models + OAuth

**For Add-Ons:**
- `docs/research/MODULAR-ADDON-ARCHITECTURE.md` - Module system
- `docs/research/MODULE-DEVELOPMENT-GUIDE.md` - How to build modules

**For Patterns:**
- `CLAUDE.md` - Project overview and code patterns
- `docs/plans/IMPLEMENTATION-ROADMAP.md` - 12-week execution plan

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER'S WORKFLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DAYTIME (Mobile/Web)              OVERNIGHT (Automated)                     │
│  ──────────────────────            ───────────────────                       │
│  • Voice capture                    • Opportunity detection                  │
│  • Review opportunities             • Task execution                         │
│  • Approve/reject                   • Quota harvesting                       │
│  • Check quota/progress             • XP/achievement awards                  │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                           FEEDBACK LOOP                                      │
│                                                                              │
│   Generate → Review → [Keep/Project/Future/Prune] → Learn → Better           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Shared Services

Both platforms share these core services:

| Service | Purpose | Location |
|---------|---------|----------|
| **Voice Recorder** | Push-to-talk with VAD segmentation | `workers/api/src/services/voice.ts` |
| **STT Service** | Whisper transcription | `workers/api/src/services/transcribe.ts` |
| **TTS Service** | Web Speech API responses | `workers/api/src/services/synthesize.ts` |
| **AI Gateway** | All 9 model access | `workers/api/src/services/ai-gateway.ts` |
| **Quota Tracker** | Neuron usage monitoring | `workers/api/src/services/quota.ts` |
| **Embedding Service** | BGE vector embeddings | `workers/api/src/services/embeddings.ts` |
| **Vector Search** | Semantic search via Vectorize | `workers/api/src/services/search.ts` |
| **Gamification** | XP, levels, achievements | `workers/api/src/services/gamification.ts` |

### Platform-Specific Services

**Studylog.ai Only:**
| Service | Purpose | Location |
|---------|---------|----------|
| **Safety Filter** | Llama Guard 3 content filtering | `workers/api/src/services/safety.ts` |
| **Approval Queue** | Parent/teacher approvals | `workers/api/src/services/approvals.ts` |
| **Daily Allowance** | Quota limit management | `workers/api/src/services/allowance.ts` |
| **Age Verification** | COPPA compliance | `workers/api/src/services/age-verify.ts` |

**Makerlog.ai Only:**
| Service | Purpose | Location |
|---------|---------|----------|
| **Opportunity Detector** | Find generative tasks | `workers/api/src/services/opportunities.ts` |
| **Task Queue** | Overnight execution | `workers/api/src/services/tasks.ts` |
| **Harvest Scheduler** | Batch execution | `workers/api/src/services/harvest.ts` |

---

## Development Workflow

### 1. Start With Reading

**Before writing any code:**
1. Read the relevant research document (Studylog or Makerlog)
2. Check if the feature is MVP or add-on
3. Review existing code patterns in similar files
4. Check database schema to understand data model

### 2. Follow Code Patterns

**Worker API Pattern:**
```typescript
// workers/api/src/routes/{feature}.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env }>();

// Request schema
const requestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  userId: z.string(),
});

// Response schema
const responseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
});

// Route handler
app.post('/api/feature', zValidator('json', requestSchema), async (c) => {
  const { prompt, userId } = c.req.valid('json');

  try {
    // Business logic
    const result = await doSomething(c.env, prompt, userId);

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
```

**Frontend Pattern:**
```typescript
// src/components/Feature.tsx
import { useState } from 'react';

export function Feature() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'example' }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const data = await response.json();
      // Handle success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      {/* UI here */}
    </div>
  );
}
```

### 3. Database Operations

**Always use parameterized queries:**
```typescript
// GOOD - Parameterized
const result = await env.DB.prepare(
  'SELECT * FROM users WHERE id = ?'
).bind(userId).first();

// BAD - String interpolation (SQL injection risk)
const result = await env.DB.prepare(
  `SELECT * FROM users WHERE id = '${userId}'`
).first();
```

**Use transactions for multi-step operations:**
```typescript
// Start transaction
const txn = env.DB.batch();

// Queue operations
txn.push(
  env.DB.prepare('INSERT INTO tasks (user_id, prompt) VALUES (?, ?)').bind(userId, prompt)
);
txn.push(
  env.DB.prepare('UPDATE users SET task_count = task_count + 1 WHERE id = ?').bind(userId)
);

// Execute atomically
await txn;
```

### 4. AI Model Usage

**Use the AI Gateway for all AI calls:**
```typescript
// workers/api/src/services/ai-gateway.ts
export async function callAIModel(
  env: Env,
  model: string,
  input: any
): Promise<any> {
  const response = await env.AI.run(model, input, {
    gateway: {
      id: 'makerlog-gateway',
      metrics: ['latency', 'neurons', 'errors'],
    },
  });

  return response;
}

// Usage
const result = await callAIModel(env, '@cf/meta/llama-3.1-8b-instruct', {
  messages: [{ role: 'user', content: prompt }],
});
```

**Model Selection Guide:**
| Use Case | Model | Neurons |
|----------|-------|---------|
| Transcription | `@cf/openai/whisper-large-v3-turbo` | ~50 |
| Chat | `@cf/meta/llama-3.1-8b-instruct` | ~1 per 1K tokens |
| Embeddings | `@cf/baai/bge-base-en-v1.5` | ~1 |
| Images | `@cf/stabilityai/stable-diffusion-xl-base-1.0` | ~20 |

### 5. Error Handling

**Always implement graceful degradation:**
```typescript
try {
  const result = await expensiveAIOperation(env, input);
  return result;
} catch (error) {
  // Log for monitoring
  console.error('AI operation failed:', error);

  // Return fallback
  return {
    success: false,
    fallback: true,
    message: 'AI service temporarily unavailable',
  };
}
```

### 6. Testing

**Unit Test Pattern:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { handler } from './route';

describe('POST /api/feature', () => {
  it('should return success', async () => {
    const mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: '123' }),
      },
    };

    const result = await handler(mockEnv, { prompt: 'test', userId: '123' });

    expect(result.success).toBe(true);
  });
});
```

---

## Platform-Specific Guidelines

### Studylog.ai Implementation

**COPPA Compliance Is Mandatory:**

```typescript
// Age verification before any feature
export async function verifyAge(env: Env, birthDate: Date): Promise<boolean> {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();

  if (age >= 18) {
    return false; // Not allowed on Studylog
  }

  if (age < 8) {
    return false; // Too young
  }

  // Under 13 requires parent consent
  if (age < 13) {
    const hasConsent = await checkParentConsent(env, userId);
    if (!hasConsent) {
      throw new Error('Parental consent required');
    }
  }

  return true;
}
```

**Safety Filtering Required:**

```typescript
// All user input must be filtered
export async function filterInput(env: Env, input: string): Promise<boolean> {
  const result = await env.AI.run('@cf/meta/llama-guard-3-8b', {
    input: [{ role: 'user', content: input }],
  });

  return result.safe; // true = safe, false = blocked
}

// All AI output must be filtered
export async function filterOutput(env: Env, output: string): Promise<boolean> {
  const result = await env.AI.run('@cf/meta/llama-guard-3-8b', {
    input: [{ role: 'assistant', content: output }],
  });

  return result.safe;
}
```

**Approval Workflows:**

```typescript
// Sensitive requests require approval
export async function queueForApproval(env: Env, request: SensitiveRequest) {
  await env.DB.prepare(`
    INSERT INTO approval_requests (student_id, type, payload, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(request.studentId, request.type, JSON.stringify(request.payload), Date.now())
   .run();

  // Send push notification to parent
  await sendPushNotification(env, {
    to: request.parentId,
    title: 'Approval Required',
    body: `${request.studentName} wants to ${request.type}`,
    action: `studylog://approvals/${request.id}`,
  });
}
```

### Makerlog.ai Implementation

**Voice-First Design:**

```typescript
// Progressive upload (prevents data loss)
export async function uploadRecording(blob: Blob, userId: string) {
  const formData = new FormData();
  formData.append('audio', blob);
  formData.append('userId', userId);

  // Use keepalive for uploads that continue after tab closes
  await fetch('/api/voice/upload', {
    method: 'POST',
    body: formData,
    keepalive: true,
  });
}
```

**Opportunity Detection:**

```typescript
// Analyze conversation for generative tasks
export async function detectOpportunities(env: Env, conversationId: string) {
  const messages = await getMessages(env, conversationId);

  const prompt = `
Analyze this conversation for opportunities to generate:
- Code snippets
- Images
- Documentation
- Other assets

Return JSON array of opportunities with confidence scores.
`;

  const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt + JSON.stringify(messages) }],
  });

  const opportunities = JSON.parse(result.response);

  // Queue high-confidence opportunities (>70%)
  for (const opp of opportunities) {
    if (opp.confidence > 0.7) {
      await queueOpportunity(env, opp);
    }
  }
}
```

**Harvest Scheduling:**

```typescript
// Execute queued tasks when quota available
export async function executeHarvest(env: Env, userId: string) {
  const quota = await getQuotaStatus(env, userId);

  if (quota.used > quota.limit * 0.9) {
    throw new Error('Quota almost full, cannot harvest');
  }

  const tasks = await getQueuedTasks(env, userId);

  for (const task of tasks) {
    const cost = estimateTaskCost(task.type);

    if (quota.used + cost > quota.limit) {
      break; // Don't exceed quota
    }

    await executeTask(env, task);
    quota.used += cost;
  }
}
```

---

## Common Pitfalls to Avoid

### ❌ Don't: Design for "Middle Users"

```typescript
// BAD: Trying to be everything for everyone
export function getUserDashboard() {
  if (user.isParent || user.isTeacher || user.isStudent) {
    // Too complex!
  }
}

// GOOD: Separate dashboards for specific users
export function getStudentDashboard() { /* ... */ }
export function getParentDashboard() { /* ... */ }
export function getTeacherDashboard() { /* ... */ }
```

### ❌ Don't: Build Add-Ons as Core Features

```typescript
// BAD: Threaded conversations in MVP
export function getMessages(threadId?: string) {
  // Threaded logic is complex!
}

// GOOD: Simple chronological for MVP
export function getMessages(conversationId: string, after?: number) {
  return db.messages
    .where({ conversation_id: conversationId })
    .where('timestamp', '>', after || 0)
    .orderBy('timestamp', 'asc');
}
```

### ❌ Don't: Ignore Safety for Studylog

```typescript
// BAD: Unfiltered AI responses
const response = await env.AI.run(model, { prompt });
return response; // Could be unsafe!

// GOOD: Always filter Studylog responses
const response = await env.AI.run(model, { prompt });
const isSafe = await filterOutput(env, response.content);
if (!isSafe) {
  throw new Error('Content blocked by safety filter');
}
return response;
```

### ❌ Don't: Block on AI in Hot Paths

```typescript
// BAD: Synchronous AI calls in request handler
const result = await env.AI.run(slowModel, input);
return result; // User waits 10+ seconds

// GOOD: Queue for background processing
await env.DB.prepare('INSERT INTO tasks (payload) VALUES (?)')
  .bind(JSON.stringify(input))
  .run();

return { success: true, taskId: id }; // Instant response
```

### ✅ Do: Use Caching Aggressively

```typescript
// GOOD: Cache expensive AI results
const cacheKey = `embeddings:${hash(content)}`;

let embedding = await env.KV.get(cacheKey, 'json');
if (!embedding) {
  embedding = await createEmbedding(env, content);
  await env.KV.put(cacheKey, JSON.stringify(embedding), {
    expirationTtl: 86400, // 24 hours
  });
}

return embedding;
```

### ✅ Do: Follow Platform Conventions

**Studylog.ai:**
- Use bright, friendly colors (blues, greens, purples)
- Large buttons (min 44×44px)
- Emoji and icons for visual interest
- Simple language (8th grade reading level)
- Always show parental controls to parents

**Makerlog.ai:**
- Use dark theme by default
- Minimal, efficient UI
- Technical language appropriate for developers
- Keyboard shortcuts
- CLI-style aesthetics

---

## Checklist Before Committing

- [ ] **Platform Correct:** Does this belong on Studylog or Makerlog?
- [ ] **MVP vs Add-On:** Is this core functionality or optional module?
- [ ] **Safety:** Studylog features have content filtering?
- [ ] **COPPA:** Studylog features comply with children's privacy?
- [ ] **Error Handling:** Graceful degradation when AI fails?
- [ ] **Performance:** No blocking AI calls in hot paths?
- [ ] **Caching:** Expensive operations cached in KV?
- [ ] **Tests:** Unit tests for business logic?
- [ ] **Documentation:** Code is self-documenting with clear names?
- [ ] **TypeScript:** All code properly typed?

---

## Getting Help

**Documentation:**
- `CLAUDE.md` - Project overview and quick reference
- `docs/research/` - In-depth research on specific topics
- `docs/plans/IMPLEMENTATION-ROADMAP.md` - What to build when

**Code Examples:**
- `workers/api/src/routes/` - Existing API endpoints
- `src/components/` - Existing React components
- `packages/db/schema.sql` - Database schema

**Key Contacts:**
- Studylog questions: `docs/research/STUDYLOG-KIDS-PLATFORM.md`
- Makerlog questions: `docs/research/MAKERLOG-MVP-VOICE-FIRST.md`
- Module development: `docs/research/MODULAR-ADDON-ARCHITECTURE.md`

---

## Quick Command Reference

```bash
# Development
npm run dev          # Start frontend (localhost:5173)
npm run api:dev      # Start worker (localhost:8787)

# Testing
npm run test         # Run all tests
npm run test:unit    # Unit tests only
npm run test:e2e     # E2E tests

# Database
npm run db:migrate   # Run migrations

# Deployment
npm run deploy       # Deploy to development
npm run deploy:prod  # Deploy to production
```

---

**Remember:** We're building two specific products for specific users. Keep it simple. Make it modular. Ship the MVP first.

**Sources:**
- `CLAUDE.md` - Project overview
- `docs/research/STUDYLOG-KIDS-PLATFORM.md` - Studylog specification
- `docs/research/MAKERLOG-MVP-VOICE-FIRST.md` - Makerlog specification
- `docs/research/MODULAR-ADDON-ARCHITECTURE.md` - Module system
- `docs/plans/IMPLEMENTATION-ROADMAP.md` - 12-week plan
