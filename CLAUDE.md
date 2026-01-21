# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Makerlog.ai is a voice-first development assistant that gamifies Cloudflare free tier quota harvesting. Users talk through ideas during the day, and the system automatically detects generative opportunities (like generating code snippets, images, or text) that execute overnight using unused free tier credits.

## Architecture

The application follows a serverless architecture with two main components:

1. **React Frontend** (`/src/`) - Voice UI built with Vite, React 18, and Tailwind CSS
2. **Cloudflare Worker API** (`/workers/api/`) - Hono-based server handling all business logic

### Technology Stack
- **Frontend**: React 18.2.0, TypeScript, Vite, Tailwind CSS
- **Backend**: Cloudflare Workers with Hono framework
- **Database**: Cloudflare D1 (SQLite)
- **AI Services**: Cloudflare Workers AI (Whisper, Llama, BGE embeddings)
- **Search**: Cloudflare Vectorize for semantic search
- **Storage**: Cloudflare R2 for assets, KV for caching

## Development Commands

### Frontend Development
```bash
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Worker Development
```bash
cd workers/api
npm run dev          # Start Wrangler dev server (localhost:8787)
npm run deploy       # Deploy to production
npm run deploy:prod  # Deploy to production environment
npm run tail         # View logs in real-time
```

### Full Stack Development
```bash
npm run api:dev      # Start worker API in development (from root)
```

### Database Operations
```bash
npm run db:migrate  # Execute database migrations
```

### Deployment
```bash
npm run deploy:all  # Build frontend + deploy worker + deploy pages
```

## Key API Endpoints

### Voice Processing Pipeline
- `POST /api/voice/transcribe` - Complete voice processing: upload → transcribe → AI response → store

### Conversation Management
- `GET/POST /api/conversations` - List/create conversations
- `GET /api/conversations/:id` - Get conversation with messages
- `POST /api/search` - Semantic search using vector embeddings

### Opportunity Detection
- `GET /api/opportunities` - List detected generative tasks
- `POST /api/opportunities/:id/queue` - Queue opportunity for generation
- `POST /api/opportunities/:id/refine` - Edit prompt before queueing
- `POST /api/opportunities/:id/reject` - Skip opportunity

### Task Execution
- `GET /api/tasks` - List all queued tasks
- `POST /api/tasks` - Create manual task
- `POST /api/harvest` - Execute all queued tasks (quota optimization)
- `GET /api/quota` - Real-time quota usage tracking
- `GET /api/digest` - Daily summary

## Configuration

### Frontend Proxy
Vite is configured to proxy API calls to the worker dev server (`/api/*` → `http://localhost:8787`).

### Worker Configuration
The worker uses Wrangler with bindings for:
- `AI` - Cloudflare AI services
- `DB` - D1 database (makerlog-db)
- `ASSETS` - R2 bucket for files
- `KV` - Cache namespace
- `VECTORIZE` - Semantic search index

### Environment Variables
Set in `wrangler.toml`:
- `ENVIRONMENT` - "development" or "production"

## Database Schema

Key tables (based on API usage):
- `users` - XP, level, streak tracking
- `conversations` - Conversation metadata
- `messages` - Audio + text with vector embeddings
- `tasks` - Queued generative tasks
- `opportunities` - Detected generation opportunities
- `achievements` - User achievement unlocks

## Frontend Components

### Core Views
- `src/main.tsx` - App entry point with bottom navigation
- `src/VoiceChat.tsx` - Main voice interface with push-to-talk recording
- `src/Dashboard.tsx` - Quota tracking and task management

### Key Features
- Push-to-talk recording with visual feedback
- Real-time transcription and AI responses
- Conversation history sidebar
- Opportunity detection panel
- Achievement system with XP/levels
- Batch task execution with quota optimization

## Cloudflare Setup Requirements

Before development:
1. Install Wrangler CLI: `npm install -g wrangler`
2. Login: `wrangler login`
3. Create Vectorize index: `wrangler vectorize create makerlog-conversations --dimensions=768 --metric=cosine`
4. Create D1 database: `wrangler d1 create makerlog-db`

## Code Patterns

### Worker API Structure
- Hono router with `/api` prefix
- Zod validation for request/response schemas
- Consistent error handling with HTTP status codes
- Database queries use parameterized statements

### Frontend Patterns
- Functional components with TypeScript
- Tailwind CSS for styling
- Vite for fast development builds
- Push-to-talk recording using MediaRecorder API

### Audio Processing Flow
1. Record audio → WebM blob
2. Upload to R2 → Get URL
3. Transcribe with Whisper → Text
4. Generate response with Llama → JSON
5. Create embeddings with BGE → Vector
6. Store in D1 + add to Vectorize index

## Testing

**Recommended Testing Stack:**
- **Frontend Unit Tests**: Vitest + React Testing Library
- **Worker Unit Tests**: Vitest + @cloudflare/vitest-pool-workers
- **Integration Tests**: Miniflare + Wrangler Dev for local D1/R2/AI testing
- **E2E Tests**: Playwright (native Workers support)
- **AI Mocking**: MSW (Mock Service Worker) for network-level interception

**Test Commands:**
```bash
npm run test              # Run all tests with Vitest
npm run test:ui           # Vitest UI mode
npm run test:coverage     # Coverage report
npm run test:unit         # Frontend unit tests only
npm run test:worker       # Worker unit tests only
npm run test:e2e          # Playwright E2E tests
npm run db:migrate:test   # Set up test D1 database
```

**Testing Strategy:**
- Test AI-dependent code with mocked responses (MSW)
- Use real bindings in integration tests via @cloudflare/vitest-pool-workers
- Implement database seed files for consistent test data
- Mock external dependencies (AI models, R2 uploads)
- Test error handling and retry logic with fault injection

## Deployment Notes

- Frontend deploys to Cloudflare Pages via `wrangler pages deploy`
- Worker deploys independently via `wrangler deploy`
- Database migrations require manual execution
- Vectorize index must be created before deployment

## Production Readiness

### Error Handling
- **Retry Logic**: Exponential backoff with jitter for transient failures
- **Circuit Breaker**: Prevent cascading failures from AI model errors
- **Graceful Degradation**: Fallback responses when AI services unavailable
- **Timeout Management**: Configurable timeouts per AI model type

### Security
- **Input Validation**: Comprehensive validation for all AI inputs
- **Content Moderation**: Llama Guard 3 for unsafe content detection
- **Rate Limiting**: Per-user and per-IP limits via Cloudflare Rate Limiter
- **Prompt Injection Protection**: Firewall for AI rules

### Monitoring
- **Workers Observability**: OpenTelemetry integration for traces and metrics
- **Custom Metrics**: Track AI requests, errors, latency, neuron usage
- **Alerting**: Critical alerts for quota thresholds, error rates, latency
- **Logging**: Structured JSON logs for all AI operations

### Cost Management
- **Daily Quota Tracking**: Monitor neuron usage with alerts at 80%/95%
- **Smart Caching**: AI Gateway cache with appropriate TTLs
- **Model Selection**: Use smaller models when appropriate

### Accessibility (WCAG 2.2 Level AA)
- **Multi-Modal Design**: Text/visual/haptic alternatives to voice-only
- **Real-Time Captioning**: Live captions for voice content (< 2s delay)
- **Screen Reader Support**: Full keyboard navigation and ARIA labels
- **Audio Control**: User-controllable TTS playback with volume/rate controls

## AI Agent Architecture

### Agent Design Principles

Makerlog.ai employs a multi-agent architecture designed specifically for Cloudflare Workers' edge environment. Key principles:

1. **Stateless Operation**: Agents maintain no in-memory state between invocations
2. **Async Communication**: Agents communicate via D1 queues, not direct calls
3. **Task Granularity**: Every agent task must complete in <25 seconds (buffer for overhead)
4. **Parallel Execution**: Leverage Promise.all for concurrent agent operations
5. **Edge Caching**: Aggressive KV cache usage for shared context (24h TTL)

### Agent Types

#### Opportunity Detection Swarm
**Location**: `workers/api/src/agents/swarm/`

Four specialist agents analyze conversations in parallel:
- **Code Specialist**: Detects component/API generation opportunities
- **Image Specialist**: Identifies visual asset needs (icons, mockups)
- **Text Specialist**: Finds copy/documentation opportunities
- **Research Specialist**: Suggestes information gathering tasks

**Usage**:
```typescript
import { swarmAnalyze } from '../agents/swarm/consolidation';

const opportunities = await swarmAnalyze(env, conversationId, messageContent);
```

#### ReAct Reasoning Agent
**Location**: `workers/api/src/agents/react-agent.ts`

Interleaves reasoning and acting for complex queries:
1. **Thought**: Analyzes current context
2. **Action**: Uses tools (search, quota check, cost estimation)
3. **Observation**: Processes tool results
4. **Iteration**: Repeats until final answer

**Tools Available**:
- `search_conversations` - Vectorize semantic search
- `get_quota` - Current neuron usage
- `estimate_cost` - Task cost prediction

**Usage**:
```typescript
import { reactAgent } from '../agents/react-agent';

const result = await reactAgent(env, userId, query, maxIterations);
```

#### Hierarchical Task Planner
**Location**: `workers/api/src/agents/hierarchical/`

BabyAGI-inspired decomposition of complex requests:
1. **Planning Phase**: Break request into subtasks with dependencies
2. **Validation**: Check if plan fits within quota
3. **Execution**: Execute tasks in topological order
4. **Tracking**: Monitor progress and handle failures

**Usage**:
```typescript
import { planAndExecute } from '../agents/hierarchical/task-planner';

const result = await planAndExecute(env, userId, "Create a complete landing page");
```

#### Reflective Learning Agent
**Location**: `workers/api/src/agents/reflective/`

Self-improving agent that learns from experience:
1. **Experience Storage**: Stores high-quality outputs in D1 + Vectorize
2. **Few-Shot Learning**: Retrieves similar examples for new tasks
3. **Quality Evaluation**: Self-assesses output quality
4. **Continuous Improvement**: Builds knowledge base over time

**Usage**:
```typescript
import { reflectiveGenerate } from '../agents/reflective/few-shot-learner';

const output = await reflectiveGenerate(env, userId, 'code', prompt);
```

#### Event-Driven Pipeline
**Location**: `workers/api/src/agents/events/`

Agents respond to system events asynchronously:
- `new_message` → Opportunity detection swarm
- `quota_threshold` → Harvest scheduling
- `task_completed` → XP awarding + learning
- `midnight` → Batch execution

**Usage**:
```typescript
import { publishEvent } from '../agents/events/publisher';

await publishEvent(env, 'new_message', { message, conversationId });
```

### Agent Constraints

**Per-Request Limits**:
- CPU Time: 30 seconds (hard limit)
- Memory: 128MB
- AI Calls: Plan for 3-5 calls max per request

**Neuron Budgeting**:
- Single LLM call (1000 tokens): ~1 neuron
- Swarm (4 parallel calls): ~4-5 neurons
- ReAct (3 sequential): ~3-8 neurons
- Daily free tier: 10,000 neurons

**Cost Optimization**:
- Cache embeddings in KV (24h TTL)
- Use confidence thresholds (>70%) before AI calls
- Batch small tasks into single requests
- Implement circuit breakers for failing agents

### Agent Development Guidelines

When creating new agents:

1. **Define Agent Interface**:
```typescript
interface Agent {
  name: string;
  description: string;
  execute: (input: any, env: Env) => Promise<any>;
  estimateCost: (input: any) => number;
}
```

2. **Add Error Handling**:
```typescript
try {
  const result = await agent.execute(input, env);
  return result;
} catch (error) {
  // Log to Workers Analytics
  // Return graceful fallback
  // Trigger circuit breaker if failing
}
```

3. **Include Metrics**:
```typescript
await env.AI.run(model, input, {
  gateway: {
    id: 'makerlog-gateway',
    metrics: ['latency', 'neurons', 'errors'],
  },
});
```

4. **Test with Mocked AI**:
```typescript
// Use MSW to mock AI responses in tests
const mockAI = {
  run: vi.fn().mockResolvedValue({ response: 'test' });
};
```

### Agent Roadmap

**Phase 1** (Current): Single-agent enhancement
- Basic opportunity detection
- ReAct reasoning for complex queries

**Phase 2**: Specialist agent swarm
- Parallel opportunity detection
- Specialist consolidation

**Phase 3**: Hierarchical planning
- Task decomposition
- Dependency resolution

**Phase 4**: Reflection & learning
- Experience storage
- Few-shot learning

**Phase 5**: Production multi-agent system
- Full orchestration framework
- Monitoring & observability

See `docs/EMERGENT-AGENT-ARCHITECTURES.md` for complete research and implementation details.

## Voice Features & Emerging Patterns

### Current Voice Capabilities
- Push-to-talk recording with MediaRecorder API
- Whisper-based transcription via Cloudflare Workers AI
- Web Speech API for text-to-speech responses
- Real-time conversation streaming
- Voice-activated opportunity detection

### Emerging Voice Patterns (2025-2026)

**Research Document**: See `docs/EMERGENT-VOICE-PATTERNS.md` for comprehensive research on voice interaction patterns, technologies, and implementation guides.

**Key Patterns Identified**:
1. **Full-Duplex Conversations with Barge-In** - Natural interruptible voice interactions using WebRTC VAD
2. **Emotionally Responsive Voice AI** - Detect user emotion and adapt TTS/response accordingly
3. **Ambient Voice Capture** - Privacy-first always-listening with wake word detection (Sherpa-ONNX)
4. **Multi-Modal Voice Collaboration** - Real-time multi-user voice + code generation
5. **Voice Persona & Customization** - Custom voice personalities and cloning

**Priority Features for 3-6 Month Implementation**:

1. **Emotionally Responsive Voice** (3-4 weeks)
   - LLM-based emotion inference from transcripts
   - TTS parameter adaptation (pitch, rate, volume)
   - AI response tone adjustment based on detected emotion
   - Optional Hume AI integration for advanced emotion detection

2. **Full-Duplex Conversations** (4-6 weeks)
   - WebRTC VAD for continuous voice monitoring
   - Barge-in detection and handling
   - Streaming audio pipeline
   - Interruptible TTS and conversation flow

3. **Voice Persona System** (2-3 weeks)
   - Multiple voice personalities (Professional, Coach, Concise)
   - Web Speech API voice parameter controls
   - Custom persona creation
   - Optional ElevenLabs integration for premium voices

**Voice Technology Stack**:
- **VAD**: WebRTC built-in VAD (Cobra/Sherpa-ONNX for advanced)
- **STT**: Cloudflare Whisper (already integrated)
- **TTS**: Web Speech API (tier 1), ElevenLabs (tier 2), Hume AI (tier 3)
- **Emotion**: LLM inference (tier 1), Hume AI/Imentiv AI (tier 2)
- **RTC**: WebRTC for bidirectional audio, Web Audio API for processing

**Cloudflare Workers AI Integration**:
```typescript
// Model usage recommendations for voice features
const VOICE_MODELS = {
  transcription: '@cf/openai/whisper-large-v3-turbo',
  chat: '@cf/meta/llama-3.1-8b-instruct',
  embedding: '@cf/baai/bge-base-en-v1.5',
  emotion_inference: '@cf/meta/llama-3.1-8b-instruct', // Until dedicated API
};
```

**Implementation Considerations**:
- Quota management for voice features (10% allocation recommended)
- Caching strategies for emotion inference and voice responses
- Privacy controls for emotional data storage
- Fallback mechanisms when premium voice services unavailable

See `docs/EMERGENT-VOICE-PATTERNS.md` for code examples, implementation checklists, and detailed technology recommendations.

## Repository

- **GitHub**: https://github.com/SuperInstance/makerlog-ai
- **Production**: https://makerlog.ai
- **License**: MIT