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

Currently no formal test framework is configured. The application relies on:
- Manual testing via browser + worker dev servers
- Wrangler's built-in error handling
- TypeScript for type safety
- Cloudflare's production environment for integration testing

## Deployment Notes

- Frontend deploys to Cloudflare Pages via `wrangler pages deploy`
- Worker deploys independently via `wrangler deploy`
- Database migrations require manual execution
- Vectorize index must be created before deployment

## Repository

- **GitHub**: https://github.com/SuperInstance/makerlog-ai
- **Production**: https://makerlog.ai
- **License**: MIT