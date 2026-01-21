# Cloudflare Workers AI Integration Patterns for Voice-First Platforms

**Research Document**: Comprehensive integration patterns for Cloudflare Workers AI with user-owned account architecture, quota optimization, and multi-model coordination.

**Date**: January 21, 2026
**Version**: 1.0
**Status**: Research & Architecture

---

## Executive Summary

Makerlog.ai requires integrating **9 Cloudflare Workers AI models** into a voice-first development assistant where users connect **their own Cloudflare accounts**. This document provides comprehensive patterns for:

1. **OAuth/account linking architecture** - Users authenticate with their Cloudflare account
2. **Real-time neuron tracking** - Monitor quota consumption per model
3. **Quota optimization strategies** - Batch operations and smart caching
4. **Multi-model coordination** - Orchestrate 9 AI models efficiently
5. **Error handling** - Graceful degradation when quota exceeded
6. **Gamification integration** - "Harvest" unused quota mechanics

**Key Insight**: We're an **I/O layer** (voice UI, task queue, storage) while users own their AI infrastructure and quotas. This creates a unique user-owned AI model vs. our interface layer separation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [OAuth & Account Linking](#oauth--account-linking)
3. [Quota Tracking System](#quota-tracking-system)
4. [9 Models Integration Guide](#9-models-integration-guide)
5. [Neuron Optimization Strategies](#neuron-optimization-strategies)
6. [Multi-Model Coordination](#multi-model-coordination)
7. [Error Handling & Fallbacks](#error-handling--fallbacks)
8. [Implementation Code Examples](#implementation-code-examples)
9. [Monitoring & Analytics](#monitoring--analytics)
10. [Security & Privacy](#security--privacy)
11. [Roadmap & Phases](#roadmap--phases)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MAKERLOG.AI ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐         ┌─────────────────┐│
│  │   FRONTEND UI    │         │   MAKERLOG API   │         │  USER'S CLOUD   ││
│  │  (React/WebApp)  │◄────────►│   (Our Worker)  │◄────────►│   FLARE ACCOUNT  ││
│  │                  │         │                  │  OAuth  │                 ││
│  │  • Voice Chat    │         │  • Coordination  │         │  • Workers AI   ││
│  │  • Dashboard     │         │  • Queuing       │         │  • D1 Database  ││
│  │  • Settings      │         │  • Optimization  │         │  • R2 Storage   ││
│  └──────────────────┘         └──────────────────┘         │  • Vectorize    ││
│                                                          │  • KV Cache     ││
│  ┌──────────────────┐                                      │  • AI Gateway   ││
│  │ DESKTOP CONNECTOR│                                      └─────────────────┘│
│  │  (Local AI)      │                                                            │
│  │  • Ollama        │         KEY:                                                    │
│  │  • ComfyUI       │         → User's quota/students                                     │
│  │  • A1111         │         → Our coordination layer                                  │
│  └──────────────────┘         → Heavy tasks to desktop, light to Cloudflare             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Separation of Concerns

| Layer | Responsibility | Owner |
|-------|---------------|-------|
| **UI/I-O Layer** (Makerlog) | Voice capture, task queue, gamification, storage coordination | Us (Makerlog.ai) |
| **AI/Compute Layer** (User's CF) | Model inference, neuron quota, data persistence | User (their account) |
| **Local Compute** (Desktop) | Heavy generation, style learning, iteration loops | User (local hardware) |

### Data Flow

1. **Voice Capture** (Makerlog UI) → Transcribe (User's CF: Whisper)
2. **Conversation Analysis** (User's CF: Llama) → Detect Opportunities
3. **Task Queue** (Makerlog DB) → Route based on cost:
   - **Light tasks** (<1000 neurons) → User's CF AI
   - **Heavy tasks** (>1000 neurons) → Desktop Connector (Ollama/ComfyUI)
4. **Results** → Store (User's R2) → Index (User's Vectorize) → Display (Makerlog UI)

---

## OAuth & Account Linking

### OAuth 2.1 Flow with Cloudflare

**Recommended Approach**: Use Cloudflare's OAuth Provider Library for Workers

```typescript
import { OAuthProvider } from '@cloudflare/workers-oauth-provider';

// wrangler.toml binding
interface Env {
  DB: D1Database;
  KV: KVNamespace;
  OAUTH_PROVIDER: OAuthProvider;
}
```

#### Step 1: Initialize OAuth Provider

```typescript
// workers/api/src/oauth/setup.ts

export async function initializeOAuthProvider(env: Env) {
  const provider = new OAuthProvider({
    clientId: env.CLOUDFLARE_CLIENT_ID,
    clientSecret: env.CLOUDFLARE_CLIENT_SECRET,
    redirectUri: 'https://makerlog.ai/auth/callback',
    scopes: ['account:read', 'workers:edit', 'workers_ai:edit'],
  });

  return provider;
}
```

#### Step 2: Authorization Endpoint

```typescript
// workers/api/src/routes/auth.ts

app.get('/auth/connect', async (c) => {
  const userId = c.req.header('X-User-Id');
  if (!userId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Generate state parameter for security
  const state = crypto.randomUUID();
  await c.env.KV.put(`oauth_state:${state}`, userId, { expirationTtl: 600 });

  // Redirect to Cloudflare OAuth
  const authUrl = `https://dash.cloudflare.com/authorize?` +
    `client_id=${c.env.CLOUDFLARE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent('https://makerlog.ai/auth/callback')}&` +
    `response_type=code&` +
    `scope=account:read workers:edit workers_ai:edit&` +
    `state=${state}`;

  return c.redirect(authUrl);
});
```

#### Step 3: OAuth Callback Handler

```typescript
app.get('/auth/callback', async (c) => {
  const { code, state } = c.req.query();
  const userId = await c.env.KV.get(`oauth_state:${state}`);

  if (!userId) {
    return c.json({ error: 'Invalid state parameter' }, 400);
  }

  // Exchange code for access token
  const tokenResponse = await fetch('https://dash.cloudflare.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: c.env.CLOUDFLARE_CLIENT_ID,
      client_secret: c.env.CLOUDFLARE_CLIENT_SECRET,
      code,
      redirect_uri: 'https://makerlog.ai/auth/callback',
    }),
  });

  const tokens = await tokenResponse.json();

  // Get user's Cloudflare account ID
  const accountResponse = await fetch('https://api.cloudflare.com/client/v4/user', {
    headers: { 'Authorization': `Bearer ${tokens.access_token}` },
  });

  const cfUser = await accountResponse.json();

  // Store connection in database
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO cloudflare_connections
    (user_id, cf_account_id, access_token, refresh_token, token_expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    userId,
    cfUser.result.id,
    tokens.access_token,
    tokens.refresh_token,
    Math.floor(Date.now() / 1000) + tokens.expires_in
  ).run();

  // Delete used state
  await c.env.KV.delete(`oauth_state:${state}`);

  // Redirect to settings page
  return c.redirect('/settings?connected=true');
});
```

#### Step 4: Refresh Token Handler

```typescript
async function refreshAccessToken(env: Env, userId: string): Promise<string> {
  const connection = await env.DB.prepare(`
    SELECT cf_account_id, refresh_token FROM cloudflare_connections
    WHERE user_id = ?
  `).bind(userId).first();

  if (!connection) {
    throw new Error('No Cloudflare connection found');
  }

  const tokenResponse = await fetch('https://dash.cloudflare.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: env.CLOUDFLARE_CLIENT_ID,
      client_secret: env.CLOUDFLARE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
    }),
  });

  const tokens = await tokenResponse.json();

  // Update stored tokens
  await env.DB.prepare(`
    UPDATE cloudflare_connections
    SET access_token = ?, refresh_token = ?, token_expires_at = ?
    WHERE user_id = ?
  `).bind(
    tokens.access_token,
    tokens.refresh_token || connection.refresh_token,
    Math.floor(Date.now() / 1000) + tokens.expires_in,
    userId
  ).run();

  return tokens.access_token;
}

// Middleware to auto-refresh tokens
export async function withValidToken(
  env: Env,
  userId: string,
  callback: (token: string) => Promise<Response>
): Promise<Response> {
  const connection = await env.DB.prepare(`
    SELECT access_token, token_expires_at FROM cloudflare_connections
    WHERE user_id = ?
  `).bind(userId).first() as { access_token: string; token_expires_at: number } | null;

  if (!connection) {
    return new Response('Not connected to Cloudflare', { status: 401 });
  }

  // Check if token needs refresh (5 minute buffer)
  if (connection.token_expires_at < Math.floor(Date.now() / 1000) + 300) {
    const newToken = await refreshAccessToken(env, userId);
    return callback(newToken);
  }

  return callback(connection.access_token);
}
```

### Alternative: API Token Approach

For simpler integration, users can manually provide an API token:

```typescript
app.post('/settings/cloudflare/token', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const { apiToken } = await c.req.json();

  // Verify token by making test request
  const testResponse = await fetch('https://api.cloudflare.com/client/v4/user', {
    headers: { 'Authorization': `Bearer ${apiToken}` },
  });

  if (!testResponse.ok) {
    return c.json({ error: 'Invalid API token' }, 400);
  }

  const cfUser = await testResponse.json();

  // Store encrypted token (use Workers secrets or KMS)
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO cloudflare_connections
    (user_id, cf_account_id, access_token, token_expires_at)
    VALUES (?, ?, ?, NULL)
  `).bind(userId, cfUser.result.id, apiToken).run();

  return c.json({ success: true });
});
```

**Pros**: Simpler implementation, no OAuth redirect flow
**Cons**: Manual token renewal, less secure

---

## Quota Tracking System

### Neuron Measurement Strategy

**Key Challenge**: Cloudflare doesn't provide real-time neuron usage via API. We must:

1. **Estimate per-model costs** based on documentation
2. **Track actual usage** via AI Gateway analytics
3. **Cache estimates** in KV with periodic sync
4. **Display usage** with confidence intervals

### Neuron Cost Reference Table

| Model | Input Neurons/1K tokens | Output Neurons/1K tokens | Typical Voice Task | Est. Cost |
|-------|------------------------|-------------------------|-------------------|-----------|
| **@cf/openai/whisper-large-v3-turbo** | N/A (audio) | ~120-180 neurons/audio | 30s voice memo | ~150 neurons |
| **@cf/meta/llama-3.1-8b-instruct** | 0.63 | 1.89 | 500-token response | ~1,260 neurons |
| **@cf/baai/bge-base-en-v1.5** | 0.09 | N/A | 256-token embedding | ~23 neurons |
| **@cf/stabilityai/stable-diffusion-xl-base-1.0** | N/A (fixed) | ~50 neurons/image | 512×512 image | ~50 neurons |
| **@cf/microsoft/florence-2-base** | ~50 neurons/image | N/A | Image analysis | ~50 neurons |
| **@cf/microsoft/resnet-50** | ~20 neurons/image | N/A | Image classification | ~20 neurons |

### Real-Time Quota Tracking Implementation

#### Step 1: Quota Cache Structure

```typescript
// workers/api/src/quota/tracker.ts

interface QuotaSnapshot {
  userId: string;
  date: string; // YYYY-MM-DD
  neuronsUsed: number;
  neuronsLimit: number;
  modelBreakdown: {
    [modelName: string]: {
      requests: number;
      neurons: number;
    };
  };
  lastSyncAt: number;
  estimated?: boolean; // true if extrapolated from partial data
}

async function getQuotaSnapshot(env: Env, userId: string): Promise<QuotaSnapshot> {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `quota:${userId}:${today}`;

  // Check KV cache (5 min TTL for estimates, 30 min for actual data)
  const cached = await env.KV.get(cacheKey, { type: 'json' }) as QuotaSnapshot | null;
  if (cached) {
    return cached;
  }

  // Fetch from AI Gateway analytics
  const snapshot = await fetchQuotaFromGateway(env, userId, today);

  // Cache with shorter TTL if estimated
  const ttl = snapshot.estimated ? 300 : 1800;
  await env.KV.put(cacheKey, JSON.stringify(snapshot), { expirationTtl: ttl });

  return snapshot;
}
```

#### Step 2: AI Gateway Analytics Fetch

```typescript
async function fetchQuotaFromGateway(
  env: Env,
  userId: string,
  date: string
): Promise<QuotaSnapshot> {
  const connection = await getCloudflareConnection(env, userId);

  // Query AI Gateway GraphQL API
  const query = `
    query getAIUsage($accountTag: string, $date: string!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          aiGatewayAnalytics(
            limit: 1000
            filter: { date_geq: $date, date_leq: $date }
          ) {
            sum {
              modelRequests
              modelInputTokens
              modelOutputTokens
              modelCacheHits
              modelCacheMisses
            }
            byModel {
              id
              sum {
                modelRequests
                modelInputTokens
                modelOutputTokens
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { accountTag: connection.cf_account_id, date },
    }),
  });

  const data = await response.json();
  const analytics = data.data.viewer.accounts[0].aiGatewayAnalytics[0];

  // Calculate neuron usage
  const neuronsUsed = calculateNeuronsFromAnalytics(analytics);

  const modelBreakdown: Record<string, { requests: number; neurons: number }> = {};
  for (const model of analytics.byModel || []) {
    modelBreakdown[model.id] = {
      requests: model.sum.modelRequests,
      neurons: calculateNeuronsFromAnalytics(model.sum),
    };
  }

  return {
    userId,
    date,
    neuronsUsed,
    neuronsLimit: 10000, // Free tier daily limit
    modelBreakdown,
    lastSyncAt: Date.now(),
    estimated: false,
  };
}

function calculateNeuronsFromAnalytics(analytics: any): number {
  // Neuron pricing as of 2025
  const INPUT_NEURONS_PER_1K = 1.0; // Simplified
  const OUTPUT_NEURONS_PER_1K = 1.0;

  const inputNeurons = (analytics.modelInputTokens || 0) / 1000 * INPUT_NEURONS_PER_1K;
  const outputNeurons = (analytics.modelOutputTokens || 0) / 1000 * OUTPUT_NEURONS_PER_1K;

  return Math.ceil(inputNeurons + outputNeurons);
}
```

#### Step 3: Real-Time Usage Estimation

```typescript
// Track usage as it happens (estimate before official sync)
async function recordModelUsage(
  env: Env,
  userId: string,
  model: string,
  inputTokens?: number,
  outputTokens?: number,
  audioSeconds?: number,
  imageCount?: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `quota:${userId}:${today}`;

  // Get current snapshot
  const current = await env.KV.get(cacheKey, { type: 'json' }) as QuotaSnapshot | null;

  // Estimate neuron cost
  const neurons = estimateNeuronCost(model, inputTokens, outputTokens, audioSeconds, imageCount);

  const updated: QuotaSnapshot = current || {
    userId,
    date: today,
    neuronsUsed: 0,
    neuronsLimit: 10000,
    modelBreakdown: {},
    lastSyncAt: Date.now(),
    estimated: true,
  };

  // Update totals
  updated.neuronsUsed += neurons;
  updated.modelBreakdown[model] = updated.modelBreakdown[model] || { requests: 0, neurons: 0 };
  updated.modelBreakdown[model].requests += 1;
  updated.modelBreakdown[model].neurons += neurons;
  updated.lastSyncAt = Date.now();
  updated.estimated = true;

  // Cache with short TTL (will be overwritten by official sync)
  await env.KV.put(cacheKey, JSON.stringify(updated), { expirationTtl: 300 });

  // Log to analytics
  await env.CF_ANALYTICS?.writeDataPoint({
    blobs: [model, 'usage_estimate'],
    doubles: [neurons],
    indexes: [userId],
  });
}

function estimateNeuronCost(
  model: string,
  inputTokens?: number,
  outputTokens?: number,
  audioSeconds?: number,
  imageCount?: number
): number {
  const NEURON_COSTS: Record<string, (params: any) => number> = {
    '@cf/openai/whisper-large-v3-turbo': ({ audioSeconds }) => Math.ceil((audioSeconds || 0) * 5), // ~5 neurons/sec
    '@cf/meta/llama-3.1-8b-instruct': ({ inputTokens, outputTokens }) =>
      Math.ceil(((inputTokens || 0) / 1000 * 0.63) + ((outputTokens || 0) / 1000 * 1.89)),
    '@cf/baai/bge-base-en-v1.5': ({ inputTokens }) =>
      Math.ceil((inputTokens || 0) / 1000 * 0.09),
    '@cf/stabilityai/stable-diffusion-xl-base-1.0': ({ imageCount }) => (imageCount || 0) * 50,
    '@cf/microsoft/florence-2-base': ({ imageCount }) => (imageCount || 0) * 50,
    '@cf/microsoft/resnet-50': ({ imageCount }) => (imageCount || 0) * 20,
  };

  const calculator = NEURON_COSTS[model];
  if (!calculator) {
    return 100; // Default estimate
  }

  return calculator({ inputTokens, outputTokens, audioSeconds, imageCount });
}
```

#### Step 4: Public Quota API Endpoint

```typescript
app.get('/api/quota', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';

  try {
    const quota = await getQuotaSnapshot(c.env, userId);

    // Calculate reset time (midnight UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return c.json({
      neuronsUsed: quota.neuronsUsed,
      neuronsLimit: quota.neuronsLimit,
      neuronsRemaining: Math.max(0, quota.neuronsLimit - quota.neuronsUsed),
      percentageUsed: (quota.neuronsUsed / quota.neuronsLimit) * 100,
      modelBreakdown: quota.modelBreakdown,
      resetAt: tomorrow.toISOString(),
      lastSyncAt: new Date(quota.lastSyncAt).toISOString(),
      estimated: quota.estimated,
      warnings: generateQuotaWarnings(quota),
    });
  } catch (error) {
    // If user hasn't connected Cloudflare, return demo quota
    return c.json({
      neuronsUsed: 0,
      neuronsLimit: 10000,
      neuronsRemaining: 10000,
      percentageUsed: 0,
      modelBreakdown: {},
      resetAt: tomorrow.toISOString(),
      lastSyncAt: null,
      estimated: false,
      warnings: ['Connect your Cloudflare account to track real quota usage'],
    });
  }
});

function generateQuotaWarnings(quota: QuotaSnapshot): string[] {
  const warnings: string[] = [];
  const percentageUsed = (quota.neuronsUsed / quota.neuronsLimit) * 100;

  if (percentageUsed >= 95) {
    warnings.push('⚠️ Critical: You have used 95% of your daily quota. Consider upgrading or using desktop connector for heavy tasks.');
  } else if (percentageUsed >= 80) {
    warnings.push('⚠️ Warning: You have used 80% of your daily quota.');
  } else if (percentageUsed >= 50) {
    warnings.push('ℹ️ Info: You have used 50% of your daily quota.');
  }

  if (quota.estimated) {
    warnings.push('ℹ️ Usage is estimated. Official sync pending.');
  }

  return warnings;
}
```

---

## 9 Models Integration Guide

### Model 1: Text Embeddings (@cf/baai/bge-base-en-v1.5)

**Purpose**: Semantic search, conversation similarity, opportunity clustering

```typescript
// workers/api/src/models/embeddings.ts

export async function generateEmbedding(env: Env, text: string): Promise<number[]> {
  const userId = env.USER_ID; // From request context
  const model = '@cf/baai/bge-base-en-v1.5';

  const response = await env.AI.run(model, {
    text: text.substring(0, 8192), // Max input length
  }) as { data: number[][] };

  const embedding = response.data[0];

  // Record usage
  await recordModelUsage(env, userId, model, {
    inputTokens: Math.ceil(text.length / 4), // Rough estimate
  });

  return embedding;
}

// Usage in voice pipeline
app.post('/api/voice/transcribe', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const transcript = "User's transcribed voice";

  // Generate embedding for semantic search
  const embedding = await generateEmbedding(c.env, transcript);

  // Store in Vectorize
  await c.env.VECTORIZE.upsert([{
    id: messageId,
    values: embedding,
    metadata: {
      user_id: userId,
      content: transcript.substring(0, 500),
      timestamp: Date.now(),
    },
  }]);

  return c.json({ success: true });
});
```

### Model 2: Text Classification (@cf/meta/llama-3.1-8b-instruct)

**Purpose**: Opportunity detection, sentiment analysis, task categorization

```typescript
// workers/api/src/models/classification.ts

interface ClassificationResult {
  category: string;
  confidence: number;
  reasoning: string;
}

export async function classifyMessage(
  env: Env,
  message: string,
  categories: string[]
): Promise<ClassificationResult[]> {
  const userId = env.USER_ID;
  const model = '@cf/meta/llama-3.1-8b-instruct';

  const systemPrompt = `You are a classification assistant. Given a message and a list of categories, respond ONLY with valid JSON in this format:
{
  "classifications": [
    {"category": "category_name", "confidence": 0.0-1.0, "reasoning": "brief explanation"}
  ]
}

Categories: ${categories.join(', ')}`;

  const response = await env.AI.run(model, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    max_tokens: 500,
    temperature: 0.1, // Low temperature for consistent classification
  }) as { response: string };

  // Record usage
  await recordModelUsage(env, userId, model, {
    inputTokens: Math.ceil((systemPrompt.length + message.length) / 4),
    outputTokens: Math.ceil(response.response.length / 4),
  });

  // Parse JSON from response
  const jsonMatch = response.response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse classification response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as { classifications: ClassificationResult[] };
  return parsed.classifications;
}

// Usage: Detect opportunity type
app.post('/api/opportunities/detect', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const { message } = await c.req.json();

  const categories = ['code_generation', 'image_generation', 'text_generation', 'research_task'];
  const classifications = await classifyMessage(c.env, message, categories);

  // Filter high-confidence detections
  const opportunities = classifications
    .filter(c => c.confidence > 0.7)
    .map(c => ({
      type: c.category,
      confidence: c.confidence,
      reasoning: c.reasoning,
    }));

  return c.json({ opportunities });
});
```

### Model 3: Text-to-Speech (Deepgram Aura-2 / Nova-3)

**Purpose**: Voice assistant responses, real-time voice feedback

**Note**: As of 2025, Cloudflare partners with Deepgram for TTS. This requires special handling.

```typescript
// workers/api/src/models/tts.ts

interface TTSConfig {
  model: '@cf/deepgram/aura-2' | '@cf/deepgram/nova-3';
  voice: 'default' | 'female' | 'male';
  speed?: number;
  pitch?: number;
}

export async function synthesizeSpeech(
  env: Env,
  text: string,
  config: TTSConfig
): Promise<ArrayBuffer> {
  const userId = env.USER_ID;

  // Option 1: Use Cloudflare's Deepgram integration
  const response = await env.AI.run(config.model, {
    text,
    voice: config.voice,
    speed: config.speed || 1.0,
    pitch: config.pitch || 1.0,
  }) as ArrayBuffer;

  // Record usage (TTS is typically priced per character)
  await recordModelUsage(env, userId, config.model, {
    inputTokens: text.length, // Approximate
  });

  return response;

  // Option 2: Return config for browser TTS (no quota cost)
  // return {
  //   useBrowserTTS: true,
  //   text,
  //   config: { voice: 'Google US English', rate: 1.1, pitch: 1.0 }
  // };
}

// Usage in voice pipeline
app.post('/api/voice/synthesize', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const { text, useBrowser } = await c.req.json();

  if (useBrowser) {
    // Return config for Web Speech API (no neuron cost)
    return c.json({
      useBrowserTTS: true,
      text,
      config: {
        voice: 'Google US English',
        rate: 1.1,
        pitch: 1.0,
      },
    });
  }

  // Use Cloudflare TTS (consumes quota)
  const audioBuffer = await synthesizeSpeech(c.env, text, {
    model: '@cf/deepgram/aura-2',
    voice: 'default',
  });

  // Store in R2
  const key = `tts/${userId}/${Date.now()}.mp3`;
  await c.env.ASSETS.put(key, audioBuffer, {
    httpMetadata: { contentType: 'audio/mpeg' },
  });

  return c.json({ audioUrl: `/assets/${key}` });
});
```

### Model 4: Automatic Speech Recognition (@cf/openai/whisper-large-v3-turbo)

**Purpose**: Transcribe voice memos, meeting recordings

```typescript
// workers/api/src/models/asr.ts

export async function transcribeAudio(
  env: Env,
  audioBuffer: ArrayBuffer,
  language?: string
): Promise<{ text: string; language: string; duration: number }> {
  const userId = env.USER_ID;
  const model = '@cf/openai/whisper-large-v3-turbo';

  // Calculate duration (rough estimate from buffer size)
  const duration = Math.ceil(audioBuffer.byteLength / 32000); // Assuming 32kbps

  const response = await env.AI.run(model, {
    audio: [...new Uint8Array(audioBuffer)],
    language: language || 'en', // Auto-detect if not specified
  }) as { text: string };

  // Record usage (Whisper is priced per second of audio)
  await recordModelUsage(env, userId, model, {
    audioSeconds: duration,
  });

  return {
    text: response.text,
    language: language || 'en',
    duration,
  };
}

// Usage in voice pipeline
app.post('/api/voice/transcribe', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const formData = await c.req.formData();
  const audioFile = formData.get('audio') as File;

  const audioBuffer = await audioFile.arrayBuffer();

  // Transcribe
  const { text, language, duration } = await transcribeAudio(c.env, audioBuffer);

  // Store in R2
  const key = `voice/${userId}/${Date.now()}.webm`;
  await c.env.ASSETS.put(key, audioBuffer, {
    httpMetadata: { contentType: 'audio/webm' },
  });

  return c.json({
    transcript: text,
    language,
    duration,
    audioUrl: `/assets/${key}`,
  });
});
```

### Model 5: Image-to-Text (@cf/microsoft/florence-2-base)

**Purpose**: Analyze screenshots, understand UI mockups, extract text from images

```typescript
// workers/api/src/models/image-to-text.ts

export async function analyzeImage(
  env: Env,
  imageBuffer: ArrayBuffer,
  prompt: string
): Promise<{ analysis: string; entities: string[]; text: string }> {
  const userId = env.USER_ID;
  const model = '@cf/microsoft/florence-2-base';

  const response = await env.AI.run(model, {
    image: [...new Uint8Array(imageBuffer)],
    prompt,
  }) as {
    analysis: string;
    entities: string[];
    extracted_text: string;
  };

  // Record usage (fixed cost per image)
  await recordModelUsage(env, userId, model, {
    imageCount: 1,
  });

  return {
    analysis: response.analysis,
    entities: response.entities,
    text: response.extracted_text,
  };
}

// Usage: Screenshot analysis
app.post('/api/images/analyze', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const formData = await c.req.formData();
  const imageFile = formData.get('image') as File;
  const prompt = formData.get('prompt') as string || 'Describe this image in detail.';

  const imageBuffer = await imageFile.arrayBuffer();
  const analysis = await analyzeImage(c.env, imageBuffer, prompt);

  return c.json(analysis);
});
```

### Model 6: Text-to-Image (@cf/stabilityai/stable-diffusion-xl-base-1.0)

**Purpose**: Generate icons, illustrations, UI mockups

```typescript
// workers/api/src/models/text-to-image.ts

export interface ImageGenConfig {
  width: number;
  height: number;
  steps?: number;
  cfg_scale?: number;
}

export async function generateImage(
  env: Env,
  prompt: string,
  config: ImageGenConfig
): Promise<{ imageUrl: string; seed: number }> {
  const userId = env.USER_ID;
  const model = '@cf/stabilityai/stable-diffusion-xl-base-1.0';

  const seed = Math.floor(Math.random() * 2147483647);

  const response = await env.AI.run(model, {
    prompt,
    width: config.width,
    height: config.height,
    seed,
    steps: config.steps || 20,
    cfg_scale: config.cfg_scale || 7,
  }) as ArrayBuffer;

  // Record usage (fixed cost per image)
  await recordModelUsage(env, userId, model, {
    imageCount: 1,
  });

  // Store in R2
  const key = `images/${userId}/${Date.now()}-${seed}.png`;
  await env.ASSETS.put(key, response, {
    httpMetadata: { contentType: 'image/png' },
  });

  return {
    imageUrl: `/assets/${key}`,
    seed,
  };
}

// Usage: Task execution
app.post('/api/tasks/image/execute', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const { taskId } = c.req.param();

  const task = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
  ).bind(taskId, userId).first() as Task | null;

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  // Generate image
  const { imageUrl, seed } = await generateImage(c.env, task.prompt, {
    width: 512,
    height: 512,
    steps: 20,
  });

  // Update task
  await c.env.DB.prepare(`
    UPDATE tasks SET status = 'completed', result_url = ?, completed_at = ?
    WHERE id = ?
  `).bind(imageUrl, Math.floor(Date.now() / 1000), taskId).run();

  return c.json({ success: true, imageUrl, seed });
});
```

### Model 7: Image Classification (@cf/microsoft/resnet-50)

**Purpose**: Categorize images, detect NSFW content, tag visual assets

```typescript
// workers/api/src/models/image-classification.ts

export interface Classification {
  label: string;
  confidence: number;
}

export async function classifyImage(
  env: Env,
  imageBuffer: ArrayBuffer
): Promise<{ classifications: Classification[]; isNSFW: boolean }> {
  const userId = env.USER_ID;
  const model = '@cf/microsoft/resnet-50';

  const response = await env.AI.run(model, {
    image: [...new Uint8Array(imageBuffer)],
  }) as {
    predictions: Array<{ label: string; confidence: number }>;
  };

  // Record usage (fixed cost per image)
  await recordModelUsage(env, userId, model, {
    imageCount: 1,
  });

  // Check for NSFW content
  const isNSFW = response.predictions.some(p =>
    p.label.toLowerCase().includes('nsfw') ||
    (p.label.toLowerCase().includes('unsafe') && p.confidence > 0.5)
  );

  return {
    classifications: response.predictions.slice(0, 10), // Top 10
    isNSFW,
  };
}

// Usage: Content moderation
app.post('/api/images/classify', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const formData = await c.req.formData();
  const imageFile = formData.get('image') as File;

  const imageBuffer = await imageFile.arrayBuffer();
  const { classifications, isNSFW } = await classifyImage(c.env, imageBuffer);

  if (isNSFW) {
    return c.json({ error: 'NSFW content detected' }, 400);
  }

  return c.json({ classifications });
});
```

### Model 8: Translation (m2m100 or similar)

**Purpose**: Multi-language support for global users

```typescript
// workers/api/src/models/translation.ts

export async function translateText(
  env: Env,
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{ translatedText: string; sourceLangDetected: string }> {
  const userId = env.USER_ID;
  // Note: As of 2025, Cloudflare may not have a dedicated translation model
  // Alternative: Use Llama with translation prompt

  const model = '@cf/meta/llama-3.1-8b-instruct';

  const systemPrompt = `You are a professional translator. Translate the given text from ${sourceLang} to ${targetLang}. Only return the translated text, no explanations.`;

  const response = await env.AI.run(model, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    max_tokens: Math.min(text.length * 2, 4000), // Allow for longer translations
  }) as { response: string };

  // Record usage
  await recordModelUsage(env, userId, model, {
    inputTokens: Math.ceil((systemPrompt.length + text.length) / 4),
    outputTokens: Math.ceil(response.response.length / 4),
  });

  return {
    translatedText: response.response,
    sourceLangDetected: sourceLang,
  };
}

// Usage in voice pipeline
app.post('/api/voice/translate', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const { text, targetLang } = await c.req.json();

  const result = await translateText(c.env, text, 'en', targetLang);

  return c.json(result);
});
```

### Model 9: Summarization (@cf/meta/llama-3.1-8b-instruct)

**Purpose**: Daily digest, conversation summaries, opportunity consolidation

```typescript
// workers/api/src/models/summarization.ts

export async function summarizeText(
  env: Env,
  text: string,
  maxLength: number = 200
): Promise<{ summary: string; keyPoints: string[] }> {
  const userId = env.USER_ID;
  const model = '@cf/meta/llama-3.1-8b-instruct';

  const systemPrompt = `Summarize the following text in ${maxLength} words or less. Extract 3-5 key points as a JSON array.

Response format:
{
  "summary": "Concise summary",
  "keyPoints": ["Point 1", "Point 2", "Point 3"]
}`;

  const response = await env.AI.run(model, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    max_tokens: 1000,
    temperature: 0.3,
  }) as { response: string };

  // Record usage
  await recordModelUsage(env, userId, model, {
    inputTokens: Math.ceil((systemPrompt.length + text.length) / 4),
    outputTokens: Math.ceil(response.response.length / 4),
  });

  // Parse JSON response
  const jsonMatch = response.response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse summary response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    summary: string;
    keyPoints: string[];
  };

  return parsed;
}

// Usage: Daily digest
app.get('/api/digest', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const todayStart = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000);

  // Get today's conversations
  const conversations = await c.env.DB.prepare(`
    SELECT c.title, m.content FROM conversations c
    JOIN messages m ON c.id = m.conversation_id
    WHERE c.user_id = ? AND m.timestamp >= ?
    ORDER BY m.timestamp ASC
  `).bind(userId, todayStart).all();

  if (!conversations.results || conversations.results.length === 0) {
    return c.json({ summary: 'No conversations today.', keyPoints: [] });
  }

  // Combine all messages
  const fullText = conversations.results
    .map((r: any) => `[${r.title}] ${r.content}`)
    .join('\n\n');

  // Generate summary
  const summary = await summarizeText(c.env, fullText, 300);

  return c.json(summary);
});
```

---

## Neuron Optimization Strategies

### Strategy 1: Request Batching

**Goal**: Reduce neuron consumption by 40-60% by batching similar requests

```typescript
// workers/api/src/optimization/batching.ts

interface BatchRequest {
  id: string;
  model: string;
  input: any;
  priority: number;
}

class RequestBatcher {
  private batch: Map<string, BatchRequest[]> = new Map();
  private timer: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async add(request: BatchRequest): Promise<any> {
    const modelKey = request.model;
    const maxWaitTime = 5000; // 5 seconds
    const minBatchSize = 5;

    // Add to batch
    if (!this.batch.has(modelKey)) {
      this.batch.set(modelKey, []);
    }
    this.batch.get(modelKey)!.push(request);

    // Clear existing timer
    if (this.timer.has(modelKey)) {
      clearTimeout(this.timer.get(modelKey)!);
    }

    // Check if batch is ready
    const batch = this.batch.get(modelKey)!;

    if (batch.length >= minBatchSize) {
      // Process immediately
      this.batch.delete(modelKey);
      return this.processBatch(modelKey, batch);
    } else {
      // Wait for more requests or timeout
      return new Promise((resolve) => {
        this.timer.set(modelKey, setTimeout(async () => {
          this.batch.delete(modelKey);
          const result = await this.processBatch(modelKey, batch);
          resolve(result);
        }, maxWaitTime));
      });
    }
  }

  private async processBatch(modelKey: string, batch: BatchRequest[]): Promise<any[]> {
    const results: Map<string, any> = new Map();

    // Group by input type for efficient batching
    const grouped = this.groupByInputType(batch);

    for (const [inputType, requests] of grouped.entries()) {
      const combined = await this.combineRequests(requests);

      try {
        const response = await this.env.AI.run(modelKey, combined);

        // Split response back to individual requests
        const individualResults = this.splitResponse(response, requests);

        for (let i = 0; i < requests.length; i++) {
          results.set(requests[i].id, individualResults[i]);
        }
      } catch (error) {
        // Fallback: process individually
        for (const request of requests) {
          try {
            const response = await this.env.AI.run(modelKey, request.input);
            results.set(request.id, response);
          } catch (e) {
            results.set(request.id, { error: 'Batch processing failed' });
          }
        }
      }
    }

    // Return results in original order
    return batch.map(r => results.get(r.id));
  }

  private groupByInputType(batch: BatchRequest[]): Map<string, BatchRequest[]> {
    // Simple grouping by input structure
    const grouped = new Map<string, BatchRequest[]>();

    for (const request of batch) {
      const type = this.getInputType(request.input);
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(request);
    }

    return grouped;
  }

  private getInputType(input: any): string {
    if (Array.isArray(input.text)) return 'batch_text';
    if (input.image) return 'image';
    return 'text';
  }

  private async combineRequests(requests: BatchRequest[]): Promise<any> {
    // Model-specific combination logic
    const firstInput = requests[0].input;

    if (firstInput.text && Array.isArray(firstInput.text)) {
      // Already batched
      return firstInput;
    } else if (firstInput.text) {
      // Combine text inputs
      return {
        text: requests.map(r => r.input.text).join('\n---\n'),
      };
    }

    return firstInput;
  }

  private splitResponse(response: any, requests: BatchRequest[]): any[] {
    // Model-specific splitting logic
    if (response.response && typeof response.response === 'string') {
      // Split by delimiter
      const parts = response.response.split('\n---\n');
      return requests.map((r, i) => ({ response: parts[i] || '' }));
    }

    return requests.map(() => response);
  }
}

// Usage: Embedding generation with batching
const batcher = new RequestBatcher(env);

app.post('/api/embeddings/batch', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const { texts } = await c.req.json();

  const promises = texts.map((text: string) =>
    batcher.add({
      id: crypto.randomUUID(),
      model: '@cf/baai/bge-base-en-v1.5',
      input: { text },
      priority: 1,
    })
  );

  const results = await Promise.all(promises);

  return c.json({ embeddings: results });
});
```

### Strategy 2: Multi-Layer Caching

**Goal**: Achieve 40-60% cache hit rate across edge, browser, and CDN

```typescript
// workers/api/src/optimization/caching.ts

interface CacheConfig {
  edge: boolean;    // KV cache
  browser: boolean; // Client-side cache
  cdn: boolean;     // Cloudflare CDN cache
  ttl: number;      // Time-to-live in seconds
}

const CACHE_STRATEGIES: Record<string, CacheConfig> = {
  embeddings: {
    edge: true,
    browser: false,
    cdn: false,
    ttl: 86400, // 24 hours
  },
  transcriptions: {
    edge: true,
    browser: true,
    cdn: false,
    ttl: 604800, // 7 days
  },
  image_generation: {
    edge: false,
    browser: true,
    cdn: true,
    ttl: 2592000, // 30 days
  },
  classification: {
    edge: true,
    browser: true,
    cdn: false,
    ttl: 3600, // 1 hour
  },
};

export class CacheManager {
  constructor(private env: Env) {}

  async get<T>(
    userId: string,
    operation: string,
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const config = CACHE_STRATEGIES[operation];
    if (!config) {
      return fetcher();
    }

    const cacheKey = `cache:${operation}:${userId}:${this.hashKey(key)}`;

    // 1. Check KV cache (Edge)
    if (config.edge) {
      const cached = await this.env.KV.get(cacheKey, { type: 'json' }) as T | null;
      if (cached) {
        return cached;
      }
    }

    // 2. Fetch fresh data
    const data = await fetcher();

    // 3. Store in KV cache
    if (config.edge) {
      await this.env.KV.put(cacheKey, JSON.stringify(data), {
        expirationTtl: config.ttl,
      });
    }

    return data;
  }

  private hashKey(key: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  getCacheHeaders(operation: string): Headers {
    const config = CACHE_STRATEGIES[operation];
    const headers = new Headers();

    if (config.browser || config.cdn) {
      headers.set('Cache-Control', `public, max-age=${config.ttl}`);
    }

    if (config.cdn) {
      headers.set('CDN-Cache-Control', `public, max-age=${config.ttl}`);
    }

    return headers;
  }
}

// Usage: Cached embedding generation
const cacheManager = new CacheManager(env);

app.post('/api/embeddings/generate', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const { text } = await c.req.json();

  const embedding = await cacheManager.get(
    userId,
    'embeddings',
    text,
    async () => {
      return generateEmbedding(c.env, text);
    }
  );

  const headers = cacheManager.getCacheHeaders('embeddings');
  return c.json(embedding, { headers });
});
```

### Strategy 3: Smart Model Selection

**Goal**: Choose optimal model based on quota remaining and task complexity

```typescript
// workers/api/src/optimization/model-selection.ts

interface ModelOption {
  model: string;
  neuronsPerInput: number;
  neuronsPerOutput: number;
  quality: 'high' | 'medium' | 'low';
  speed: 'fast' | 'medium' | 'slow';
}

const TEXT_GENERATION_MODELS: ModelOption[] = [
  {
    model: '@cf/meta/llama-3.1-8b-instruct',
    neuronsPerInput: 0.63,
    neuronsPerOutput: 1.89,
    quality: 'high',
    speed: 'medium',
  },
  {
    model: '@cf/meta/llama-3.1-8b-instruct',
    neuronsPerInput: 0.63,
    neuronsPerOutput: 1.89,
    quality: 'medium',
    speed: 'fast', // With reduced max_tokens
  },
];

const IMAGE_GENERATION_MODELS: ModelOption[] = [
  {
    model: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    neuronsPerInput: 50,
    neuronsPerOutput: 0,
    quality: 'high',
    speed: 'slow', // More steps
  },
  {
    model: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    neuronsPerInput: 50,
    neuronsPerOutput: 0,
    quality: 'medium',
    speed: 'fast', // Fewer steps
  },
];

export class ModelSelector {
  constructor(private env: Env) {}

  async selectModel(
    taskType: 'text' | 'image',
    qualityPreference?: 'high' | 'medium' | 'low'
  ): Promise<ModelOption> {
    // Get current quota
    const quota = await getQuotaSnapshot(this.env, this.env.USER_ID);
    const quotaPercentage = (quota.neuronsUsed / quota.neuronsLimit) * 100;

    const models = taskType === 'text' ? TEXT_GENERATION_MODELS : IMAGE_GENERATION_MODELS;

    // Strategy:
    // - <50% quota: Use high quality
    // - 50-80% quota: Use medium quality
    // - >80% quota: Use low quality or suggest desktop

    if (quotaPercentage < 50) {
      return models.find(m => m.quality === 'high') || models[0];
    } else if (quotaPercentage < 80) {
      return models.find(m => m.quality === 'medium') || models[0];
    } else {
      // Low quota: suggest desktop connector for heavy tasks
      return models.find(m => m.quality === 'low') || models[0];
    }
  }

  estimateCost(model: ModelOption, inputSize: number, outputSize: number): number {
    return Math.ceil(
      (inputSize / 1000) * model.neuronsPerInput +
      (outputSize / 1000) * model.neuronsPerOutput
    );
  }
}

// Usage: Adaptive quality
const modelSelector = new ModelSelector(env);

app.post('/api/chat/completions', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const { messages, max_tokens = 500 } = await c.req.json();

  // Select optimal model based on quota
  const model = await modelSelector.selectModel('text');

  // Check if user should use desktop instead
  const quota = await getQuotaSnapshot(c.env, userId);
  if ((quota.neuronsUsed / quota.neuronsLimit) > 0.9) {
    return c.json({
      error: 'Quota exhausted',
      suggestion: 'Use desktop connector for this task',
    }, 429);
  }

  // Run inference
  const response = await c.env.AI.run(model.model, {
    messages,
    max_tokens: model.quality === 'high' ? max_tokens : Math.floor(max_tokens / 2),
  });

  return c.json({
    response,
    model: model.model,
    quality: model.quality,
    neuronsUsed: modelSelector.estimateCost(model, messages.length * 50, max_tokens),
  });
});
```

---

## Multi-Model Coordination

### Orchestration Pattern: Voice Processing Pipeline

```typescript
// workers/api/src/orchestration/voice-pipeline.ts

export class VoiceProcessingPipeline {
  constructor(private env: Env) {}

  async process(
    userId: string,
    audioBuffer: ArrayBuffer,
    conversationId?: string
  ): Promise<{
    transcript: string;
    response: string;
    opportunities: Opportunity[];
    quotaUsed: number;
  }> {
    const quotaUsed = { total: 0 };

    // Step 1: Transcribe audio (Model 4: ASR)
    const { text: transcript, duration } = await this.transcribe(audioBuffer, userId, quotaUsed);

    // Step 2: Generate embedding (Model 1: Embeddings)
    const embedding = await this.embed(transcript, userId, quotaUsed);

    // Step 3: Classify message (Model 2: Classification)
    const classification = await this.classify(transcript, userId, quotaUsed);

    // Step 4: Generate response (Model 2: Text Generation)
    const { response } = await this.generateResponse(transcript, classification, userId, quotaUsed);

    // Step 5: Detect opportunities (Model 2: Text Generation)
    const opportunities = await this.detectOpportunities(transcript, userId, quotaUsed);

    // Store all in database
    await this.storeResults(userId, conversationId, transcript, response, embedding, opportunities);

    return {
      transcript,
      response,
      opportunities,
      quotaUsed: quotaUsed.total,
    };
  }

  private async transcribe(audioBuffer: ArrayBuffer, userId: string, quotaUsed: any) {
    const model = '@cf/openai/whisper-large-v3-turbo';
    const duration = Math.ceil(audioBuffer.byteLength / 32000);

    const response = await this.env.AI.run(model, {
      audio: [...new Uint8Array(audioBuffer)],
    }) as { text: string };

    quotaUsed.total += estimateNeuronCost(model, { audioSeconds: duration });
    await recordModelUsage(this.env, userId, model, { audioSeconds: duration });

    return { text: response.text, duration };
  }

  private async embed(text: string, userId: string, quotaUsed: any) {
    const model = '@cf/baai/bge-base-en-v1.5';

    const response = await this.env.AI.run(model, {
      text: text.substring(0, 8192),
    }) as { data: number[][] };

    quotaUsed.total += estimateNeuronCost(model, { inputTokens: Math.ceil(text.length / 4) });
    await recordModelUsage(this.env, userId, model, { inputTokens: Math.ceil(text.length / 4) });

    return response.data[0];
  }

  private async classify(text: string, userId: string, quotaUsed: any) {
    const model = '@cf/meta/llama-3.1-8b-instruct';
    const categories = ['question', 'statement', 'request', 'feedback'];

    const systemPrompt = `Classify this message as one of: ${categories.join(', ')}. Respond with only the category name.`;

    const response = await this.env.AI.run(model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      max_tokens: 10,
    }) as { response: string };

    quotaUsed.total += estimateNeuronCost(model, {
      inputTokens: Math.ceil((systemPrompt.length + text.length) / 4),
      outputTokens: 10,
    });

    return response.response.trim();
  }

  private async generateResponse(
    transcript: string,
    classification: string,
    userId: string,
    quotaUsed: any
  ) {
    const model = '@cf/meta/llama-3.1-8b-instruct';

    const systemPrompt = `You are Makerlog, a friendly AI assistant. The user's message was classified as "${classification}". Respond naturally and concisely (this is voice chat).`;

    const response = await this.env.AI.run(model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      max_tokens: 300,
    }) as { response: string };

    quotaUsed.total += estimateNeuronCost(model, {
      inputTokens: Math.ceil((systemPrompt.length + transcript.length) / 4),
      outputTokens: 300,
    });

    return { response: response.response };
  }

  private async detectOpportunities(text: string, userId: string, quotaUsed: any) {
    // Reuse classification logic with opportunity categories
    const categories = ['code_generation', 'image_generation', 'text_generation', 'research'];
    const result = await classifyMessage(this.env, text, categories);

    quotaUsed.total += estimateNeuronCost('@cf/meta/llama-3.1-8b-instruct', {
      inputTokens: Math.ceil(text.length / 4),
      outputTokens: 500,
    });

    return result
      .filter(c => c.confidence > 0.7)
      .map(c => ({
        id: crypto.randomUUID(),
        type: c.category.replace('_generation', '') as 'code' | 'image' | 'text',
        prompt: text,
        confidence: c.confidence,
        status: 'detected',
      }));
  }

  private async storeResults(
    userId: string,
    conversationId: string | undefined,
    transcript: string,
    response: string,
    embedding: number[],
    opportunities: any[]
  ) {
    // Create conversation if needed
    if (!conversationId) {
      conversationId = crypto.randomUUID();
      await this.env.DB.prepare(`
        INSERT INTO conversations (id, user_id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        conversationId,
        userId,
        transcript.substring(0, 50),
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000)
      ).run();
    }

    // Store messages
    const messageId = crypto.randomUUID();
    await this.env.DB.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, timestamp)
      VALUES (?, ?, 'user', ?, ?)
    `).bind(messageId, conversationId, transcript, Math.floor(Date.now() / 1000)).run();

    // Store embedding in Vectorize
    await this.env.VECTORIZE?.upsert([{
      id: messageId,
      values: embedding,
      metadata: {
        user_id: userId,
        conversation_id: conversationId,
        content: transcript.substring(0, 500),
        timestamp: Date.now(),
      },
    }]);

    // Store assistant response
    await this.env.DB.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, timestamp)
      VALUES (?, ?, 'assistant', ?, ?)
    `).bind(crypto.randomUUID(), conversationId, response, Math.floor(Date.now() / 1000)).run();

    // Store opportunities
    for (const opp of opportunities) {
      await this.env.DB.prepare(`
        INSERT INTO opportunities (id, conversation_id, type, prompt, confidence, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'detected', ?)
      `).bind(
        crypto.randomUUID(),
        conversationId,
        opp.type,
        opp.prompt,
        opp.confidence,
        Math.floor(Date.now() / 1000)
      ).run();
    }
  }
}
```

---

## Error Handling & Fallbacks

### Quota Exceeded Handling

```typescript
// workers/api/src/middleware/quota-check.ts

export async function checkQuota(
  env: Env,
  userId: string,
  estimatedNeurons: number
): Promise<{ allowed: boolean; reason?: string; fallback?: string }> {
  const quota = await getQuotaSnapshot(env, userId);
  const remaining = quota.neuronsLimit - quota.neuronsUsed;

  if (remaining >= estimatedNeurons) {
    return { allowed: true };
  }

  // Quota exceeded - suggest alternatives
  if (remaining < estimatedNeurons) {
    return {
      allowed: false,
      reason: `Insufficient quota. Need ${estimatedNeurons} neurons, but only ${remaining} remaining.`,
      fallback: 'Use desktop connector for this task',
    };
  }

  return { allowed: false };
}

// Usage in endpoints
app.post('/api/voice/transcribe', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const formData = await c.req.formData();
  const audioFile = formData.get('audio') as File;

  // Estimate cost (30s audio ≈ 150 neurons)
  const estimatedNeurons = Math.ceil(audioFile.size / 32000) * 5;

  // Check quota
  const quotaCheck = await checkQuota(c.env, userId, estimatedNeurons);

  if (!quotaCheck.allowed) {
    return c.json({
      error: quotaCheck.reason,
      fallback: quotaCheck.fallback,
      quotaReset: (await getQuotaSnapshot(c.env, userId)).resetAt,
    }, 429);
  }

  // Proceed with transcription
  const pipeline = new VoiceProcessingPipeline(c.env);
  const result = await pipeline.process(userId, await audioFile.arrayBuffer());

  return c.json(result);
});
```

### Graceful Degradation

```typescript
// workers/api/src/middleware/graceful-degradation.ts

export class GracefulDegradation {
  constructor(private env: Env) {}

  async runWithFallback<T>(
    primaryModel: string,
    input: any,
    fallbackModel?: string,
    fallbackFunction?: () => Promise<T>
  ): Promise<T> {
    try {
      // Try primary model
      const response = await this.env.AI.run(primaryModel, input);
      return response as T;
    } catch (error) {
      console.error(`Primary model ${primaryModel} failed:`, error);

      // Fallback 1: Secondary model
      if (fallbackModel) {
        try {
          console.log(`Trying fallback model: ${fallbackModel}`);
          const fallback = await this.env.AI.run(fallbackModel, input);
          return fallback as T;
        } catch (fallbackError) {
          console.error(`Fallback model ${fallbackModel} also failed:`, fallbackError);
        }
      }

      // Fallback 2: Custom function
      if (fallbackFunction) {
        console.log('Using custom fallback function');
        return await fallbackFunction();
      }

      // Fallback 3: Return cached response
      const cacheKey = `fallback:${primaryModel}:${this.hashInput(input)}`;
      const cached = await this.env.KV.get(cacheKey, { type: 'json' }) as T | null;
      if (cached) {
        console.log('Returning cached response');
        return cached;
      }

      throw new Error('All fallbacks failed');
    }
  }

  private hashInput(input: any): string {
    return JSON.stringify(input);
  }
}

// Usage: Robust image generation
const degrader = new GracefulDegradation(env);

app.post('/api/generate-image', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const { prompt } = await c.req.json();

  try {
    const result = await degrader.runWithFallback(
      '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      { prompt, width: 512, height: 512 },
      undefined, // No secondary model for SDXL
      async () => {
        // Fallback: Return task for desktop connector
        const taskId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO tasks (id, user_id, type, prompt, status, created_at)
          VALUES (?, ?, 'image-gen', ?, 'queued', ?)
        `).bind(taskId, userId, prompt, Math.floor(Date.now() / 1000)).run();

        return {
          fallback: true,
          taskId,
          message: 'Image queued for desktop processing',
        } as any;
      }
    );

    return c.json(result);
  } catch (error) {
    return c.json({
      error: 'Failed to generate image',
      message: error.message,
    }, 500);
  }
});
```

---

## Implementation Code Examples

### Complete Voice Endpoint

```typescript
// workers/api/src/routes/voice.ts

app.post('/api/voice/transcribe', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  const formData = await c.req.formData();
  const audioFile = formData.get('audio') as File;
  const conversationId = formData.get('conversation_id') as string | undefined;

  if (!audioFile) {
    return c.json({ error: 'No audio file provided' }, 400);
  }

  try {
    // Estimate cost
    const audioBuffer = await audioFile.arrayBuffer();
    const estimatedNeurons = Math.ceil(audioBuffer.byteLength / 32000) * 5;

    // Check quota
    const quotaCheck = await checkQuota(c.env, userId, estimatedNeurons);
    if (!quotaCheck.allowed) {
      return c.json({
        error: quotaCheck.reason,
        fallback: quotaCheck.fallback,
        quotaReset: (await getQuotaSnapshot(c.env, userId)).resetAt,
      }, 429);
    }

    // Process through pipeline
    const pipeline = new VoiceProcessingPipeline(c.env);
    const result = await pipeline.process(userId, audioBuffer, conversationId);

    // Return response
    return c.json({
      transcript: result.transcript,
      response: result.response,
      conversationId: conversationId || result.conversationId,
      quotaUsed: result.quotaUsed,
      opportunities: result.opportunities,
    });

  } catch (error) {
    console.error('Voice processing failed:', error);
    return c.json({
      error: 'Voice processing failed',
      message: error.message,
    }, 500);
  }
});
```

### Dashboard Quota Display

```typescript
// src/components/QuotaDisplay.tsx

export function QuotaDisplay() {
  const [quota, setQuota] = useState<QuotaUsage | null>(null);

  useEffect(() => {
    const fetchQuota = async () => {
      const response = await fetch('/api/quota', {
        headers: { 'X-User-Id': getUserId() },
      });
      const data = await response.json();
      setQuota(data);
    };

    fetchQuota();
    const interval = setInterval(fetchQuota, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (!quota) return <div>Loading quota...</div>;

  const percentageUsed = (quota.neuronsUsed / quota.neuronsLimit) * 100;
  const isLow = percentageUsed > 80;

  return (
    <div className={`p-4 rounded-xl ${isLow ? 'bg-red-900/30 ring-2 ring-red-500' : 'bg-slate-800'}`}>
      <h3 className="font-bold text-lg mb-2">Daily Quota</h3>

      <div className="w-full bg-slate-700 rounded-full h-4 mb-2">
        <div
          className={`h-full rounded-full transition-all ${
            percentageUsed > 90 ? 'bg-red-500' :
            percentageUsed > 70 ? 'bg-yellow-500' :
            'bg-green-500'
          }`}
          style={{ width: `${percentageUsed}%` }}
        />
      </div>

      <div className="flex justify-between text-sm text-slate-400">
        <span>{quota.neuronsUsed.toLocaleString()} / {quota.neuronsLimit.toLocaleString()} neurons</span>
        <span>{Math.floor(quota.neuronsRemaining).toLocaleString()} remaining</span>
      </div>

      {quota.warnings && quota.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {quota.warnings.map((warning, i) => (
            <p key={i} className="text-xs text-yellow-400">{warning}</p>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-slate-500">
        <p>Resets in: {formatTimeToReset(quota.resetAt)}</p>
        {quota.estimated && <p>* Usage is estimated</p>}
      </div>
    </div>
  );
}
```

---

## Monitoring & Analytics

### Custom Metrics with Workers Analytics

```typescript
// workers/api/src/monitoring/metrics.ts

export async function recordMetrics(
  env: Env,
  event: string,
  data: {
    model?: string;
    userId?: string;
    neurons?: number;
    duration?: number;
    success?: boolean;
  }
) {
  await env.CF_ANALYTICS?.writeDataPoint({
    blobs: [
      event,
      data.model || 'unknown',
      data.success ? 'success' : 'failure',
    ],
    doubles: [
      data.neurons || 0,
      data.duration || 0,
      Date.now(),
    ],
    indexes: [data.userId || 'anonymous'],
  });
}

// Usage in model calls
app.post('/api/voice/transcribe', async (c) => {
  const startTime = Date.now();
  const userId = c.req.header('X-User-Id')!;

  try {
    const result = await pipeline.process(userId, audioBuffer);

    await recordMetrics(c.env, 'voice_transcription', {
      model: '@cf/openai/whisper-large-v3-turbo',
      userId,
      neurons: result.quotaUsed,
      duration: Date.now() - startTime,
      success: true,
    });

    return c.json(result);
  } catch (error) {
    await recordMetrics(c.env, 'voice_transcription', {
      model: '@cf/openai/whisper-large-v3-turbo',
      userId,
      duration: Date.now() - startTime,
      success: false,
    });

    throw error;
  }
});
```

### GraphQL Analytics Dashboard

```typescript
// workers/api/src/monitoring/analytics.ts

app.get('/api/analytics/usage', async (c) => {
  const userId = c.req.header('X-User-Id')!;
  const connection = await getCloudflareConnection(c.env, userId);

  const query = `
    query getUsage($accountTag: string, $startDate: string!, $endDate: string!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          aiGatewayAnalytics(
            filter: { date_geq: $startDate, date_leq: $endDate }
          ) {
            sum {
              modelRequests
              modelInputTokens
              modelOutputTokens
              modelCacheHits
              modelCacheMisses
            }
            byModel {
              id
              sum {
                modelRequests
                modelInputTokens
                modelOutputTokens
              }
            }
            overtime {
              bucket
              sum {
                modelRequests
              }
            }
          }
        }
      }
    }
  `;

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: connection.cf_account_id,
        startDate,
        endDate,
      },
    }),
  });

  const data = await response.json();
  const analytics = data.data.viewer.accounts[0].aiGatewayAnalytics[0];

  return c.json({
    total: analytics.sum,
    byModel: analytics.byModel,
    overtime: analytics.overtime,
    period: { startDate, endDate },
  });
});
```

---

## Security & Privacy

### Token Storage Best Practices

```typescript
// workers/api/src/security/tokens.ts

// Encrypt tokens before storing (using Workers SubtleCrypto)
async function encryptToken(
  env: Env,
  token: string
): Promise<{ encrypted: string; keyId: string }> {
  const key = await env.KV.get('encryption_key') || await generateEncryptionKey(env);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
    await importKey(key),
    new TextEncoder().encode(token)
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    keyId: 'key-1',
  };
}

// Always use user-scoped tokens
app.use('*', async (c, next) => {
  const userId = c.req.header('X-User-Id');
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Attach user-scoped token to context
  c.set('userToken', await getUserToken(c.env, userId));

  await next();
});
```

### Content Moderation

```typescript
// workers/api/src/security/moderation.ts

export async function moderateContent(env: Env, content: string): Promise<{
  safe: boolean;
  categories: string[];
  confidence: number;
}> {
  // Use Llama Guard 3 or similar
  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content: 'You are a content moderator. Check if the following content violates safety guidelines. Respond with JSON: { "safe": true/false, "categories": ["category1", ...], "confidence": 0.0-1.0 }',
      },
      { role: 'user', content },
    ],
    max_tokens: 200,
  }) as { response: string };

  const jsonMatch = response.response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { safe: true, categories: [], confidence: 0 };
  }

  return JSON.parse(jsonMatch[0]);
}
```

---

## Roadmap & Phases

### Phase 1: Foundation (Weeks 1-4)

**Goal**: Basic OAuth + quota tracking + 3 core models

- [ ] Implement OAuth 2.1 flow with Cloudflare
- [ ] Build quota tracking system with KV cache
- [ ] Integrate 3 core models:
  - Whisper (ASR)
  - Llama (Text generation)
  - BGE (Embeddings)
- [ ] Basic quota dashboard
- [ ] Error handling for quota exceeded

**Expected**: Users can connect CF account, see quota usage, transcribe voice

### Phase 2: Multi-Model Integration (Weeks 5-8)

**Goal**: Integrate remaining 6 models + caching

- [ ] Integrate remaining models:
  - Deepgram (TTS)
  - Florence-2 (Image-to-Text)
  - SDXL (Text-to-Image)
  - Resnet-50 (Image Classification)
  - Translation (via Llama)
  - Summarization (via Llama)
- [ ] Implement multi-layer caching (KV, CDN, browser)
- [ ] Build model selection logic based on quota
- [ ] Add batch processing for embeddings

**Expected**: Full 9-model integration with smart caching

### Phase 3: Optimization (Weeks 9-12)

**Goal**: Reduce neuron consumption by 40-60%

- [ ] Implement request batching
- [ ] Add AI Gateway caching
- [ ] Build quota-aware routing
- [ ] Desktop connector fallback
- [ ] Advanced monitoring dashboards

**Expected**: Significant quota reduction, graceful degradation

### Phase 4: Gamification & Polish (Weeks 13-16)

**Goal**: Engaging quota optimization experience

- [ ] Quota "harvest" mechanics
- [ ] Achievement unlocks for optimization
- [ ] Daily/weekly quota reports
- [ ] User education on model costs
- [ ] Progressive web app features

**Expected**: Users actively optimize quota usage

---

## References & Resources

### Official Documentation

- **[Cloudflare Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)** - Complete model catalog
- **[AI Gateway Documentation](https://developers.cloudflare.com/ai-gateway/)** - Caching, monitoring, analytics
- **[OAuth Provider Library](https://github.com/cloudflare/workers-oauth-provider)** - OAuth 2.1 implementation
- **[GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/)** - Custom analytics queries
- **[AI Week 2025 Updates](https://www.cloudflare.com/innovation-week/ai-week-2025/updates/)** - Latest model announcements

### Integration Guides

- **[Adding Voice to Blog with Workers AI](https://www.youtube.com/watch?v=Y9CsdkXHq3s)** - Video tutorial
- **[Monitoring OpenAI with AI Gateway](https://www.antstack.com/blog/monitoring-and-caching-openai-requests-with-cloudflare-ai-gateway/)** - Caching strategies
- **[Building MCP Server with OAuth](https://stytch.com/blog/building-an-mcp-server-oauth-cloudflare-workers/)** - OAuth patterns

### Community Resources

- **[awesome-cloudflare](https://github.com/zhuima/awesome-cloudflare)** - Curated Cloudflare resources
- **[Cloudflare Workers Discord](https://discord.gg/cloudflaredev)** - Community support

---

## Appendix: Neuron Cost Calculator

### Quick Reference

| Task | Model | Input | Est. Neurons |
|------|-------|-------|--------------|
| 30s voice memo | Whisper | 30s audio | ~150 |
| 500-token response | Llama 3.1 8B | 500 input + 500 output | ~1,260 |
| Semantic search | BGE | 256-token text | ~23 |
| 512×512 image | SDXL | Prompt | ~50 |
| Screenshot analysis | Florence-2 | Image | ~50 |
| Image classification | Resnet-50 | Image | ~20 |
| Daily digest | Llama 3.1 8B | 5000 input + 500 output | ~4,200 |
| Translation | Llama 3.1 8B | 200 input + 300 output | ~700 |

### Budget Planning

**Free Tier (10,000 neurons/day)**:
- ~66 voice memos (30s each)
- ~8 chat responses (500 tokens each)
- ~200 images (512×512)
- ~2 daily digests

**Recommended Allocation**:
- Voice transcription: 30% (3,000 neurons)
- Chat responses: 40% (4,000 neurons)
- Image generation: 20% (2,000 neurons)
- Summarization/Search: 10% (1,000 neurons)

---

**Document Status**: ✅ Complete
**Last Updated**: January 21, 2026
**Maintainer**: Makerlog.ai Team
**Next Review**: After Phase 1 completion (March 2026)
