# Holistic Multi-Model Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a device-adaptive AI system that seamlessly combines cloud and local processing with progressive enhancement - basic features work on low-end mobile devices while advanced features unlock on powerful desktops.

**Architecture:** Four-pillar system combining Memory Hierarchy (Engram + HNSW + Tiered), Model Cascade (speculative execution with 8B/32B/R1), Adaptive Retrieval (O(1) → O(log N) → O(N)), and Episodic Learning (experience → knowledge consolidation).

**Tech Stack:**
- **Frontend:** React 18, TypeScript, Tailwind CSS, Progressive Web App
- **Backend:** Cloudflare Workers (Hono), D1 Database, R2 Storage, Vectorize
- **Desktop:** Electron, Ollama (GGUF models), ComfyUI integration
- **Memory:** Engram n-gram index, Qdrant HNSW, tiered KV/D1/R2
- **Models:** Llama 3.1 8B, DeepSeek V3 32B, DeepSeek R1 (via Ollama)

---

## Overview: The Four Pillars

```
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   MEMORY      │ │   MODELS      │ │  RETRIEVAL    │ │  LEARNING     │
│   HIERARCHY   │ │   CASCADE     │ │   STRATEGY    │ │   SYSTEM      │
├───────────────┤ ├───────────────┤ ├───────────────┤ ├───────────────┤
│ Tier 1: O(1)  │ │ Speculative   │ │ N-gram        │ │ Episodic      │
│ Engram Index  │ │ - Draft       │ │ (Engram)      │ │ + Semantic    │
│               │ │ - Fast        │ │               │ │               │
│ Tier 2: O(log │ │ - Balanced    │ │ Tier 2: HNSW  │ │ Consolidation │
│ HNSW Vectors  │ │ - Deep        │ │   ANN search  │ │ + Patterns    │
│               │ │               │ │               │ │               │
│ Tier 3: O(N)  │ │ Parallel      │ │ Tier 3: Full  │ │ Style Profile │
│ D1/R2 Storage │ │ Execution     │ │   exact scan  │ │ + Vectors     │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

---

## Phase 0: Foundation (Weeks 1-2) ⭐ START HERE

**Priority:** CRITICAL - All future phases depend on this foundation
**Expected Outcomes:** Robust testing infrastructure, error handling, modular architecture

### Task 1: Testing Infrastructure Setup

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `package.json` test scripts

**Step 1: Create Vitest configuration**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
      },
    },
  },
});
```

**Step 2: Create test setup file**

```typescript
// tests/setup.ts
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Cloudflare Workers bindings
global.Worker = class Worker {
  constructor() {}
} as any;

// Mock Web Speech API
const speechSynthesisMock = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => []),
};

Object.defineProperty(window, 'speechSynthesis', {
  value: speechSynthesisMock,
});

// Mock MediaRecorder
const mediaRecorderMock = {
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
};

global.MediaRecorder = class MediaRecorder {
  constructor() {}
  start() {}
  stop() {}
  addEventListener() {}
} as any;
```

**Step 3: Add test scripts to package.json**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Step 4: Run tests to verify setup**

```bash
npm run test
```

Expected: Vitest starts successfully with 0 tests

**Step 5: Commit**

```bash
git add vitest.config.ts tests/setup.ts package.json
git commit -m "test: add vitest configuration and test setup"
```

---

### Task 2: Error Handling Infrastructure

**Files:**
- Create: `src/errors/types.ts`
- Create: `src/errors/handlers.ts`
- Create: `src/errors/middleware.ts`

**Step 1: Define error types**

```typescript
// src/errors/types.ts
export class MakerlogError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'MakerlogError';
  }
}

export class QuotaExceededError extends MakerlogError {
  constructor(message: string = 'Daily quota exceeded') {
    super(message, 'QUOTA_EXCEEDED', 429, true);
    this.name = 'QuotaExceededError';
  }
}

export class ModelUnavailableError extends MakerlogError {
  constructor(modelName: string) {
    super(`Model ${modelName} unavailable`, 'MODEL_UNAVAILABLE', 503, true);
    this.name = 'ModelUnavailableError';
  }
}

export class DeviceCapabilityError extends MakerlogError {
  constructor(capability: string) {
    super(`Device lacks capability: ${capability}`, 'DEVICE_CAPABILITY', 400, false);
    this.name = 'DeviceCapabilityError';
  }
}
```

**Step 2: Create error handlers**

```typescript
// src/errors/handlers.ts
import { MakerlogError } from './types';

export interface ErrorHandler {
  handle(error: Error): Promise<Response>;
}

export class WorkerErrorHandler implements ErrorHandler {
  async handle(error: Error): Promise<Response> {
    if (error instanceof MakerlogError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
          retryable: error.retryable,
        }),
        {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Unknown error - log and return generic response
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**Step 3: Create middleware for Workers**

```typescript
// src/errors/middleware.ts
import { MiddlewareHandler } from 'hono';
import { WorkerErrorHandler } from './handlers';

export const errorMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      const handler = new WorkerErrorHandler();
      return handler.handle(error as Error);
    }
  };
};
```

**Step 4: Write tests**

```typescript
// tests/errors/types.test.ts
import { describe, it, expect } from 'vitest';
import { QuotaExceededError, ModelUnavailableError, DeviceCapabilityError } from '../../src/errors/types';

describe('Error Types', () => {
  it('should create QuotaExceededError with correct defaults', () => {
    const error = new QuotaExceededError();
    expect(error.code).toBe('QUOTA_EXCEEDED');
    expect(error.statusCode).toBe(429);
    expect(error.retryable).toBe(true);
  });

  it('should create ModelUnavailableError with model name', () => {
    const error = new ModelUnavailableError('llama-3.1-8b');
    expect(error.message).toContain('llama-3.1-8b');
    expect(error.retryable).toBe(true);
  });

  it('should create DeviceCapabilityError', () => {
    const error = new DeviceCapabilityError('vram');
    expect(error.code).toBe('DEVICE_CAPABILITY');
    expect(error.retryable).toBe(false);
  });
});
```

**Step 5: Run tests**

```bash
npm run test tests/errors/types.test.ts
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/errors/ tests/errors/
git commit -m "feat: add error handling infrastructure"
```

---

### Task 3: Modular Architecture - Device Capability Detection

**Files:**
- Create: `src/device/types.ts`
- Create: `src/device/detection.ts`
- Create: `src/device/detection.test.ts`

**Step 1: Define capability types**

```typescript
// src/device/types.ts
export interface DeviceCapabilities {
  // Hardware
  vramGB: number | null;
  cpuCores: number | null;
  ramGB: number | null;

  // Network
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  online: boolean;

  // Battery
  batteryLevel: number | null; // 0-1
  batteryCharging: boolean | null;

  // Software
  platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';
  hasDesktopConnector: boolean;
  supportedModels: string[];

  // Computed strategy
  processingStrategy: 'cloud-only' | 'hybrid' | 'local-first' | 'local-only';
}

export type StrategyTier = 'cloud-only' | 'hybrid' | 'local-first' | 'local-only';
```

**Step 2: Implement capability detection**

```typescript
// src/device/detection.ts
import type { DeviceCapabilities, StrategyTier } from './types';

export class DeviceDetector {
  private capabilities: DeviceCapabilities | null = null;

  async detect(): Promise<DeviceCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    const capabilities: DeviceCapabilities = {
      vramGB: null,
      cpuCores: navigator.hardwareConcurrency || null,
      ramGB: null, // Can't detect in browser
      connectionType: this.getConnectionType(),
      effectiveType: this.getEffectiveType(),
      online: navigator.onLine,
      batteryLevel: null,
      batteryCharging: null,
      platform: this.getPlatform(),
      hasDesktopConnector: false,
      supportedModels: [],
      processingStrategy: 'cloud-only',
    };

    // Detect battery if available
    await this.detectBattery(capabilities);

    // Query desktop connector
    await this.queryDesktopConnector(capabilities);

    // Determine processing strategy
    capabilities.processingStrategy = this.determineStrategy(capabilities);

    this.capabilities = capabilities;
    return capabilities;
  }

  private getConnectionType(): DeviceCapabilities['connectionType'] {
    const conn = (navigator as any).connection;
    if (!conn) return 'unknown';
    if (conn.type === 'wifi') return 'wifi';
    if (conn.type === 'cellular') return 'cellular';
    if (conn.type === 'ethernet') return 'ethernet';
    return 'unknown';
  }

  private getEffectiveType(): DeviceCapabilities['effectiveType'] {
    const conn = (navigator as any).connection;
    return conn?.effectiveType || 'unknown';
  }

  private getPlatform(): DeviceCapabilities['platform'] {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'windows';
    if (ua.includes('Mac')) return 'macos';
    if (ua.includes('Linux')) return 'linux';
    if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iOS')) return 'ios';
    if (ua.includes('Android')) return 'android';
    return 'unknown';
  }

  private async detectBattery(capabilities: DeviceCapabilities): Promise<void> {
    const battery = await (navigator as any).getBattery?.();
    if (battery) {
      capabilities.batteryLevel = battery.level;
      capabilities.batteryCharging = battery.charging;
    }
  }

  private async queryDesktopConnector(capabilities: DeviceCapabilities): Promise<void> {
    try {
      // Try to connect to local desktop connector
      const response = await fetch('http://localhost:4242/api/capabilities', {
        signal: AbortSignal.timeout(1000), // 1 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        capabilities.hasDesktopConnector = true;
        capabilities.vramGB = data.vramGB;
        capabilities.supportedModels = data.models;
      }
    } catch {
      // Desktop connector not available
      capabilities.hasDesktopConnector = false;
    }
  }

  private determineStrategy(capabilities: DeviceCapabilities): StrategyTier {
    // Mobile: cloud-only
    if (capabilities.platform === 'ios' || capabilities.platform === 'android') {
      return 'cloud-only';
    }

    // Has desktop connector with VRAM: local-first
    if (capabilities.hasDesktopConnector && capabilities.vramGB && capabilities.vramGB >= 8) {
      return 'local-first';
    }

    // Desktop without connector: hybrid
    if (capabilities.platform === 'windows' || capabilities.platform === 'macos' || capabilities.platform === 'linux') {
      return 'hybrid';
    }

    // Default: cloud-only
    return 'cloud-only';
  }

  // Get optimal model for task based on capabilities
  getOptimalModel(taskType: 'transcribe' | 'chat' | 'reasoning'): string {
    const caps = this.capabilities;
    if (!caps || caps.processingStrategy === 'cloud-only') {
      // Cloud models
      return taskType === 'reasoning' ? '@cf/meta/llama-3.1-8b-instruct' : '@cf/meta/llama-3.1-8b-instruct';
    }

    // Local models via desktop connector
    switch (taskType) {
      case 'transcribe':
        return caps.supportedModels.includes('whisper-large-v3-turbo') ? 'whisper-large-v3-turbo' : 'whisper-base';
      case 'chat':
        return caps.supportedModels.includes('llama-3.1-8b') ? 'llama-3.1-8b' : 'llama-3.1-8b';
      case 'reasoning':
        return caps.supportedModels.includes('deepseek-r1') ? 'deepseek-r1' : 'llama-3.1-8b';
    }
  }
}
```

**Step 3: Write tests**

```typescript
// tests/device/detection.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceDetector } from '../../src/device/detection';

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    hardwareConcurrency: 8,
    onLine: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  },
  writable: true,
});

describe('DeviceDetector', () => {
  let detector: DeviceDetector;

  beforeEach(() => {
    detector = new DeviceDetector();
    global.fetch = vi.fn();
  });

  it('should detect basic capabilities', async () => {
    (global.fetch as any).mockRejectedValue(new Error('No connector'));

    const caps = await detector.detect();

    expect(caps.cpuCores).toBe(8);
    expect(caps.online).toBe(true);
    expect(caps.platform).toBe('windows');
  });

  it('should use cloud-only strategy for mobile', async () => {
    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });

    const caps = await detector.detect();
    expect(caps.processingStrategy).toBe('cloud-only');
  });

  it('should detect desktop connector when available', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ vramGB: 12, models: ['llama-3.1-8b', 'deepseek-r1'] }),
    });

    const caps = await detector.detect();
    expect(caps.hasDesktopConnector).toBe(true);
    expect(caps.vramGB).toBe(12);
    expect(caps.processingStrategy).toBe('local-first');
  });
});
```

**Step 4: Run tests**

```bash
npm run test tests/device/detection.test.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/device/ tests/device/
git commit -m "feat: add device capability detection"
```

---

### Phase 0 Success Criteria

- [ ] Vitest runs successfully with 0 tests (baseline)
- [ ] Error types defined and tested
- [ ] Device detector implemented and tested
- [ ] All commits follow conventional commit format
- [ ] Code coverage threshold met (80% lines)

---

## Phase 1: Memory System (Weeks 3-8)

**Priority:** HIGH - Critical for performance and scalability
**Expected Outcomes:** O(1) Engram index, O(log N) HNSW vectors, tiered caching

### Task 1.1: Engram Conditional Memory (O(1) Lookup)

**Files:**
- Create: `packages/desktop-connector/src/engram/index.ts`
- Create: `packages/desktop-connector/src/engram/ngram.ts`
- Test: `tests/engram/ngram.test.ts`

**Step 1: Implement n-gram extraction**

```typescript
// packages/desktop-connector/src/engram/ngram.ts
export class NgramExtractor {
  /**
   * Extract character-level n-grams from text
   */
  extract(text: string, n: number = 3): string[] {
    const cleaned = text.toLowerCase().replace(/\s+/g, ' ');
    const ngrams: string[] = [];

    for (const token of cleaned.split(' ')) {
      for (let i = 0; i <= token.length - n; i++) {
        ngrams.push(token.slice(i, i + n));
      }
    }

    return ngrams;
  }

  /**
   * Compute n-gram overlap similarity (0-1)
   */
  similarity(text1: string, text2: string, n: number = 3): number {
    const ngrams1 = new Set(this.extract(text1, n));
    const ngrams2 = new Set(this.extract(text2, n));

    if (ngrams1.size === 0 && ngrams2.size === 0) return 1;

    const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
    const union = new Set([...ngrams1, ...ngrams2]);

    return intersection.size / union.size;
  }
}
```

**Step 2: Implement Engram index**

```typescript
// packages/desktop-connector/src/engram/index.ts
import { NgramExtractor } from './ngram';
import type { GeneratedAsset } from '../types';

export class EngramIndex {
  private ngramIndex: Map<string, Set<string>> = new Map();
  private metadata: Map<string, GeneratedAsset> = new Map();
  private extractor = new NgramExtractor();

  /**
   * Build index from existing assets
   */
  async build(assets: GeneratedAsset[]): Promise<void> {
    for (const asset of assets) {
      await this.indexAsset(asset);
    }
  }

  /**
   * Add single asset to index
   */
  async indexAsset(asset: GeneratedAsset): Promise<void> {
    const ngrams = this.extractor.extract(asset.metadata.prompt);
    this.metadata.set(asset.id, asset);

    for (const ngram of ngrams) {
      if (!this.ngramIndex.has(ngram)) {
        this.ngramIndex.set(ngram, new Set());
      }
      this.ngramIndex.get(ngram)!.add(asset.id);
    }
  }

  /**
   * O(1) lookup by query text
   */
  lookup(query: string): string[] {
    const ngrams = this.extractor.extract(query);
    const results = new Set<string>();

    for (const ngram of ngrams) {
      const bucket = this.ngramIndex.get(ngram);
      if (bucket) {
        bucket.forEach(id => results.add(id));
      }
    }

    return Array.from(results);
  }

  /**
   * Remove asset from index
   */
  remove(assetId: string): void {
    const asset = this.metadata.get(assetId);
    if (!asset) return;

    const ngrams = this.extractor.extract(asset.metadata.prompt);
    for (const ngram of ngrams) {
      const bucket = this.ngramIndex.get(ngram);
      if (bucket) {
        bucket.delete(assetId);
        if (bucket.size === 0) {
          this.ngramIndex.delete(ngram);
        }
      }
    }

    this.metadata.delete(assetId);
  }

  /**
   * Get index statistics
   */
  stats() {
    return {
      totalAssets: this.metadata.size,
      totalNgrams: this.ngramIndex.size,
      avgNgramsPerAsset: Array.from(this.metadata.values()).reduce(
        (sum, asset) => sum + this.extractor.extract(asset.metadata.prompt).length,
        0
      ) / this.metadata.size,
    };
  }
}
```

**Step 3: Write tests**

```typescript
// tests/engram/ngram.test.ts
import { describe, it, expect } from 'vitest';
import { NgramExtractor } from '../../packages/desktop-connector/src/engram/ngram';

describe('NgramExtractor', () => {
  it('should extract character trigrams', () => {
    const extractor = new NgramExtractor();
    const ngrams = extractor.extract('hello world', 3);

    expect(ngrams).toContain('hel');
    expect(ngrams).toContain('ell');
    expect(ngrams).toContain('llo');
    expect(ngrams).toContain('wor');
  });

  it('should handle short words', () => {
    const extractor = new NgramExtractor();
    const ngrams = extractor.extract('hi', 3);

    expect(ngrams).toHaveLength(0);
  });

  it('should compute similarity correctly', () => {
    const extractor = new NgramExtractor();
    const sim = extractor.similarity('minimalist icon', 'minimalist design', 3);

    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThanOrEqual(1);
  });
});
```

**Step 4: Run tests**

```bash
npm run test tests/engram/
```

**Step 5: Commit**

```bash
git add packages/desktop-connector/src/engram/ tests/engram/
git commit -m "feat: add engram conditional memory with O(1) lookup"
```

---

### Task 1.2: HNSW Vector Index (O(log N) Search)

**Files:**
- Create: `packages/desktop-connector/src/vector/hnsw.ts`
- Create: `packages/desktop-connector/src/vector/qdrant.ts`
- Test: `tests/vector/hnsw.test.ts`

**Step 1: Define HNSW interface**

```typescript
// packages/desktop-connector/src/vector/hnsw.ts
export interface HNSWConfig {
  m: number;              // Connections per node (default: 16)
  efConstruction: number; // Build depth (default: 200)
  efSearch: number;       // Search candidates (default: 50)
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: any;
}

export class HNSWIndex {
  private vectors: Map<string, number[]> = new Map();
  private config: HNSWConfig;

  constructor(config: Partial<HNSWConfig> = {}) {
    this.config = {
      m: config.m ?? 16,
      efConstruction: config.efConstruction ?? 200,
      efSearch: config.efSearch ?? 50,
    };
  }

  /**
   * Insert vector into index
   */
  insert(id: string, vector: number[]): void {
    if (vector.length !== 512 && vector.length !== 768) {
      throw new Error(`Invalid vector dimension: ${vector.length}`);
    }
    this.vectors.set(id, vector);
  }

  /**
   * Search for nearest neighbors
   * Note: This is a simplified implementation. Production should use Qdrant.
   */
  search(query: number[], k: number = 10): VectorSearchResult[] {
    const results: VectorSearchResult[] = [];

    for (const [id, vector] of this.vectors) {
      const similarity = this.cosineSimilarity(query, vector);
      results.push({ id, score: similarity });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get index size
   */
  size(): number {
    return this.vectors.size;
  }
}
```

**Step 2: Integrate with Qdrant for production**

```typescript
// packages/desktop-connector/src/vector/qdrant.ts
import { QdrantClient } from '@qdrant/js-client-rest';
import type { VectorSearchResult, HNSWConfig } from './hnsw';

export class QdrantVectorDB {
  private client: QdrantClient;
  private collectionName = 'makerlog_assets';

  constructor(url: string = 'http://localhost:6333') {
    this.client = new QdrantClient({ url });
  }

  /**
   * Initialize collection with HNSW index
   */
  async initialize(dimensions: number = 768): Promise<void> {
    const exists = await this.client.collectionExists(this.collectionName);

    if (!exists) {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: dimensions,
          distance: 'Cosine',
          hnsw_config: {
            m: 16,
            ef_construct: 200,
            full_scan_threshold: 10000,
          },
        },
      });
    }
  }

  /**
   * Insert vector with payload
   */
  async insert(id: string, vector: number[], payload: any): Promise<void> {
    await this.client.upsert(this.collectionName, {
      points: [{ id, vector, payload }],
    });
  }

  /**
   * Search with filters
   */
  async search(
    query: number[],
    filters?: Record<string, any>,
    topK: number = 10
  ): Promise<VectorSearchResult[]> {
    const results = await this.client.search(this.collectionName, {
      vector: query,
      limit: topK,
      score_threshold: 0.7,
      filter: filters ? {
        must: Object.entries(filters).map(([key, value]) => ({
          key,
          match: { value },
        })),
      } : undefined,
    });

    return results.map(r => ({
      id: r.id as string,
      score: r.score,
      metadata: r.payload,
    }));
  }

  /**
   * Delete vectors by filter
   */
  async delete(filters: Record<string, any>): Promise<void> {
    await this.client.delete(this.collectionName, {
      filter: {
        must: Object.entries(filters).map(([key, value]) => ({
          key,
          match: { value },
        })),
      },
    });
  }
}
```

**Step 3: Write tests**

```typescript
// tests/vector/hnsw.test.ts
import { describe, it, expect } from 'vitest';
import { HNSWIndex } from '../../packages/desktop-connector/src/vector/hnsw';

describe('HNSWIndex', () => {
  it('should insert and search vectors', () => {
    const index = new HNSWIndex();

    index.insert('doc1', [1, 0, 0]);
    index.insert('doc2', [0, 1, 0]);
    index.insert('doc3', [0, 0, 1]);

    const results = index.search([1, 0, 0], 2);

    expect(results[0].id).toBe('doc1');
    expect(results[0].score).toBeCloseTo(1);
  });

  it('should compute cosine similarity correctly', () => {
    const index = new HNSWIndex();

    index.insert('doc1', [1, 0]);
    index.insert('doc2', [0, 1]);
    index.insert('doc3', [1, 1]);

    const results = index.search([1, 0], 3);

    expect(results[0].id).toBe('doc1'); // Perfect match
    expect(results[2].id).toBe('doc3'); // Partial match
  });
});
```

**Step 4: Run tests**

```bash
npm run test tests/vector/
```

**Step 5: Commit**

```bash
git add packages/desktop-connector/src/vector/ tests/vector/
git commit -m "feat: add HNSW vector index with Qdrant integration"
```

---

### Task 1.3: Tiered Cache (L1: KV, L2: D1, L3: R2)

**Files:**
- Create: `workers/api/src/cache/tiered.ts`
- Create: `workers/api/src/cache/kv.ts`
- Create: `workers/api/src/cache/d1.ts`
- Test: `tests/cache/tiered.test.ts`

**Step 1: Implement tiered cache**

```typescript
// workers/api/src/cache/tiered.ts
import { KVNamespace } from '@cloudflare/workers-types';
import { D1Database } from '@cloudflare/workers-types';

export interface CacheTier {
  name: string;
  get: (key: string) => Promise<any | null>;
  set: (key: string, value: any, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export class TieredCache {
  private tiers: CacheTier[];

  constructor(
    private l1: CacheTier, // KV (fastest)
    private l2: CacheTier, // D1 (moderate)
    private l3: CacheTier  // R2/Vectorize (slowest)
  ) {
    this.tiers = [l1, l2, l3];
  }

  async get<T>(key: string): Promise<T | null> {
    for (const tier of this.tiers) {
      const value = await tier.get(key);
      if (value !== null) {
        // Promote to higher tiers
        await this.promote(key, value, tier);
        return value as T;
      }
    }
    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await Promise.all(
      this.tiers.map(tier => tier.set(key, value, ttl))
    );
  }

  async delete(key: string): Promise<void> {
    await Promise.all(
      this.tiers.map(tier => tier.delete(key))
    );
  }

  private async promote(key: string, value: any, currentTier: CacheTier): Promise<void> {
    const currentIndex = this.tiers.indexOf(currentTier);
    for (let i = 0; i < currentIndex; i++) {
      await this.tiers[i].set(key, value, this.getTierTTL(i));
    }
  }

  private getTierTTL(tierIndex: number): number {
    const TTLs = [3600, 86400, 604800]; // 1h, 24h, 7d
    return TTLs[tierIndex];
  }
}
```

**Step 2: Implement KV tier**

```typescript
// workers/api/src/cache/kv.ts
import { KVNamespace } from '@cloudflare/workers-types';
import type { CacheTier } from './tiered';

export class KVCache implements CacheTier {
  name = 'KV';

  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(key, 'json');
    return value as T | null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl ?? 3600,
    });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}
```

**Step 3: Write tests**

```typescript
// tests/cache/tiered.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TieredCache } from '../../workers/api/src/cache/tiered';

describe('TieredCache', () => {
  it('should get from L1 cache', async () => {
    const l1 = {
      name: 'L1',
      get: vi.fn().mockResolvedValue({ data: 'from L1' }),
      set: vi.fn(),
      delete: vi.fn(),
    };

    const l2 = {
      name: 'L2',
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      delete: vi.fn(),
    };

    const cache = new TieredCache(l1 as any, l2 as any, l2 as any);
    const result = await cache.get('test-key');

    expect(result).toEqual({ data: 'from L1' });
    expect(l1.get).toHaveBeenCalledWith('test-key');
  });

  it('should promote from L2 to L1', async () => {
    const l1 = {
      name: 'L1',
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      delete: vi.fn(),
    };

    const l2 = {
      name: 'L2',
      get: vi.fn().mockResolvedValue({ data: 'from L2' }),
      set: vi.fn(),
      delete: vi.fn(),
    };

    const cache = new TieredCache(l1 as any, l2 as any, l2 as any);
    const result = await cache.get('test-key');

    expect(result).toEqual({ data: 'from L2' });
    expect(l1.set).toHaveBeenCalledWith('test-key', { data: 'from L2' }, 3600);
  });
});
```

**Step 4: Run tests**

```bash
npm run test tests/cache/
```

**Step 5: Commit**

```bash
git add workers/api/src/cache/ tests/cache/
git commit -m "feat: add tiered cache with KV/D1/R2"
```

---

### Phase 1 Success Criteria

- [ ] Engram index with O(1) lookup implemented and tested
- [ ] HNSW vector search with Qdrant integration
- [ ] Tiered cache with promotion/demotion
- [ ] End-to-end integration tests passing
- [ ] Performance benchmarks showing <10ms for Engram, <50ms for HNSW

---

## Phase 2: Model Cascade (Weeks 9-12)

**Priority:** HIGH - Enables intelligent model selection based on device and task
**Expected Outcomes:** Speculative execution with draft/fast/balanced/deep models

### Task 2.1: Speculative Cascade Implementation

**Files:**
- Create: `packages/desktop-connector/src/models/cascade.ts`
- Create: `packages/desktop-connector/src/models/ollama.ts`
- Test: `tests/models/cascade.test.ts`

**Step 1: Define cascade types**

```typescript
// packages/desktop-connector/src/models/cascade.ts
export type ModelTier = 'draft' | 'fast' | 'balanced' | 'deep';

export interface ModelConfig {
  name: string;
  tier: ModelTier;
  vramGB: number;
  contextWindow: number;
  avgLatencyMs: number;
}

export const MODEL_CONFIGS: Record<ModelTier, ModelConfig> = {
  draft: {
    name: 'llama-3.1-8b-q3',
    tier: 'draft',
    vramGB: 4,
    contextWindow: 8192,
    avgLatencyMs: 500,
  },
  fast: {
    name: 'llama-3.1-8b-q4',
    tier: 'fast',
    vramGB: 6,
    contextWindow: 8192,
    avgLatencyMs: 800,
  },
  balanced: {
    name: 'deepseek-v3-32b-q4',
    tier: 'balanced',
    vramGB: 12,
    contextWindow: 16384,
    avgLatencyMs: 2000,
  },
  deep: {
    name: 'deepseek-r1-q5',
    tier: 'deep',
    vramGB: 16,
    contextWindow: 32768,
    avgLatencyMs: 5000,
  },
};

export interface CascadeResult {
  draft: string;
  verified: boolean;
  finalResponse: string;
  modelsUsed: ModelTier[];
  totalTimeMs: number;
}
```

**Step 2: Implement speculative cascade**

```typescript
// packages/desktop-connector/src/models/cascade.ts
// Continued from above...

export class ModelCascade {
  private ollama: OllamaClient;
  private availableModels: Set<ModelTier>;

  constructor(ollamaEndpoint: string = 'http://localhost:11434') {
    this.ollama = new OllamaClient(ollamaEndpoint);
    this.availableModels = new Set();
  }

  async initialize(vramGB: number): Promise<void> {
    // Determine available models based on VRAM
    if (vramGB >= 16) {
      this.availableModels = new Set(['draft', 'fast', 'balanced', 'deep']);
    } else if (vramGB >= 12) {
      this.availableModels = new Set(['draft', 'fast', 'balanced']);
    } else if (vramGB >= 6) {
      this.availableModels = new Set(['draft', 'fast']);
    } else {
      this.availableModels = new Set(['draft']);
    }
  }

  /**
   * Execute speculative cascade
   * 1. Draft model generates quick response
   * 2. Verify model checks quality
   * 3. If verification fails, use deep model
   */
  async execute(prompt: string, taskType: 'chat' | 'reasoning'): Promise<CascadeResult> {
    const startTime = Date.now();
    const modelsUsed: ModelTier[] = [];
    let draftResponse = '';
    let verified = false;
    let finalResponse = '';

    // Step 1: Draft
    if (this.availableModels.has('draft')) {
      draftResponse = await this.ollama.generate(MODEL_CONFIGS.draft.name, prompt);
      modelsUsed.push('draft');
    }

    // Step 2: Verify with fast model
    if (this.availableModels.has('fast') && draftResponse) {
      verified = await this.verifyResponse(draftResponse, prompt);
      modelsUsed.push('fast');

      if (verified) {
        finalResponse = draftResponse;
      }
    }

    // Step 3: Use balanced if verification failed
    if (!verified && this.availableModels.has('balanced')) {
      const balancedResponse = await this.ollama.generate(MODEL_CONFIGS.balanced.name, prompt);
      verified = await this.verifyResponse(balancedResponse, prompt);
      modelsUsed.push('balanced');

      if (verified) {
        finalResponse = balancedResponse;
      }
    }

    // Step 4: Use deep for complex reasoning
    if (!verified && taskType === 'reasoning' && this.availableModels.has('deep')) {
      finalResponse = await this.ollama.generate(MODEL_CONFIGS.deep.name, prompt);
      modelsUsed.push('deep');
    }

    return {
      draft: draftResponse,
      verified,
      finalResponse: finalResponse || draftResponse,
      modelsUsed,
      totalTimeMs: Date.now() - startTime,
    };
  }

  private async verifyResponse(response: string, prompt: string): Promise<boolean> {
    // Simple heuristic: check if response has sufficient length
    if (response.length < 50) return false;

    // Check for coherence indicators
    const hasStructure = response.includes('\n') || response.split('.').length > 2;
    if (!hasStructure) return false;

    return true;
  }

  /**
   * Parallel execution for batch tasks
   */
  async executeBatch(prompts: string[], taskType: 'chat' | 'reasoning'): Promise<CascadeResult[]> {
    // Group by available model tier
    const modelTier = this.getBestAvailableTier();

    // Execute in parallel
    const results = await Promise.all(
      prompts.map(prompt => this.ollama.generate(MODEL_CONFIGS[modelTier].name, prompt))
    );

    return results.map(response => ({
      draft: response,
      verified: true,
      finalResponse: response,
      modelsUsed: [modelTier],
      totalTimeMs: 0,
    }));
  }

  private getBestAvailableTier(): ModelTier {
    if (this.availableModels.has('deep')) return 'deep';
    if (this.availableModels.has('balanced')) return 'balanced';
    if (this.availableModels.has('fast')) return 'fast';
    return 'draft';
  }
}
```

**Step 3: Implement Ollama client**

```typescript
// packages/desktop-connector/src/models/ollama.ts
export class OllamaClient {
  constructor(private endpoint: string = 'http://localhost:11434') {}

  async generate(model: string, prompt: string): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          num_ctx: 4096,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.endpoint}/api/tags`);
    const data = await response.json();
    return data.models.map((m: any) => m.name);
  }

  async pullModel(model: string): Promise<void> {
    await fetch(`${this.endpoint}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: false }),
    });
  }
}
```

**Step 4: Write tests**

```typescript
// tests/models/cascade.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ModelCascade, MODEL_CONFIGS } from '../../packages/desktop-connector/src/models/cascade';

describe('ModelCascade', () => {
  it('should select draft model for low VRAM', async () => {
    const cascade = new ModelCascade();
    await cascade.initialize(4); // 4GB VRAM

    const result = await cascade.execute('Hello', 'chat');

    expect(result.modelsUsed).toContain('draft');
    expect(result.finalResponse).toBeTruthy();
  });

  it('should use all models for high VRAM', async () => {
    const cascade = new ModelCascade();
    await cascade.initialize(16); // 16GB VRAM

    const result = await cascade.execute('Explain quantum computing', 'reasoning');

    expect(result.modelsUsed.length).toBeGreaterThan(1);
  });
});
```

**Step 5: Run tests**

```bash
npm run test tests/models/
```

**Step 6: Commit**

```bash
git add packages/desktop-connector/src/models/ tests/models/
git commit -m "feat: add speculative cascade with multi-model execution"
```

---

### Phase 2 Success Criteria

- [ ] Model cascade selects appropriate models based on VRAM
- [ ] Speculative execution reduces latency by 40%+
- [ ] Parallel batch processing implemented
- [ ] Integration with Ollama for local inference
- [ ] Tests covering all VRAM configurations (4GB, 8GB, 12GB, 16GB+)

---

## Phase 3: Advanced Retrieval (Weeks 13-16)

**Priority:** MEDIUM - Improves search quality and performance
**Expected Outcomes:** Hybrid retrieval combining Engram + HNSW with re-ranking

### Task 3.1: Hybrid Search Engine

**Files:**
- Create: `packages/desktop-connector/src/search/hybrid.ts`
- Create: `packages/desktop-connector/src/search/reranker.ts`
- Test: `tests/search/hybrid.test.ts`

**Step 1: Implement hybrid search**

```typescript
// packages/desktop-connector/src/search/hybrid.ts
import { EngramIndex } from '../engram';
import { QdrantVectorDB } from '../vector/qdrant';
import type { VectorSearchResult } from '../vector/hnsw';

export interface HybridSearchResult {
  id: string;
  engramScore: number;
  vectorScore: number;
  combinedScore: number;
  metadata?: any;
}

export class HybridSearchEngine {
  constructor(
    private engram: EngramIndex,
    private vectorDB: QdrantVectorDB
  ) {}

  /**
   * Hybrid search: Engram (O(1)) + HNSW (O(log N)) + Re-rank
   */
  async search(
    query: string,
    queryEmbedding: number[],
    filters?: Record<string, any>,
    topK: number = 10
  ): Promise<HybridSearchResult[]> {
    // Stage 1: O(1) Engram exact match
    const engramIds = new Set(this.engram.lookup(query));

    // Stage 2: O(log N) HNSW semantic search
    const vectorResults = await this.vectorDB.search(queryEmbedding, filters, topK * 2);

    // Stage 3: Combine scores
    const combined = new Map<string, HybridSearchResult>();

    // Add Engram matches (boost score)
    for (const id of engramIds) {
      combined.set(id, {
        id,
        engramScore: 1.0,
        vectorScore: 0,
        combinedScore: 0.5, // Base score for exact match
      });
    }

    // Add/merge vector results
    for (const result of vectorResults) {
      const existing = combined.get(result.id);
      if (existing) {
        existing.vectorScore = result.score;
        existing.combinedScore = existing.engramScore * 0.4 + result.score * 0.6;
        existing.metadata = result.metadata;
      } else {
        combined.set(result.id, {
          id: result.id,
          engramScore: 0,
          vectorScore: result.score,
          combinedScore: result.score,
          metadata: result.metadata,
        });
      }
    }

    // Sort by combined score
    return Array.from(combined.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, topK);
  }
}
```

**Step 2: Implement cross-encoder re-ranker**

```typescript
// packages/desktop-connector/src/search/reranker.ts
export class ReRanker {
  /**
   * Re-rank results using cross-encoder attention
   * For production, use a proper cross-encoder model
   */
  async rerank(
    query: string,
    results: HybridSearchResult[]
  ): Promise<HybridSearchResult[]> {
    // Simple heuristic re-ranking
    // Production should use actual cross-encoder model
    return results.map(result => {
      let boost = 1.0;

      // Boost exact n-gram matches
      if (result.engramScore > 0) {
        boost *= 1.2;
      }

      // Boost high vector similarity
      if (result.vectorScore > 0.9) {
        boost *= 1.1;
      }

      return {
        ...result,
        combinedScore: Math.min(result.combinedScore * boost, 1.0),
      };
    }).sort((a, b) => b.combinedScore - a.combinedScore);
  }
}
```

**Step 3: Write tests**

```typescript
// tests/search/hybrid.test.ts
import { describe, it, expect } from 'vitest';
import { HybridSearchEngine } from '../../packages/desktop-connector/src/search/hybrid';

describe('HybridSearchEngine', () => {
  it('should combine Engram and vector results', async () => {
    // Mock implementation
    const engine = new HybridSearchEngine({} as any, {} as any);

    const results = await engine.search(
      'test query',
      new Array(768).fill(0.1),
      {},
      5
    );

    expect(results).toBeDefined();
    expect(results.length).toBeLessThanOrEqual(5);
  });
});
```

**Step 4: Run tests**

```bash
npm run test tests/search/
```

**Step 5: Commit**

```bash
git add packages/desktop-connector/src/search/ tests/search/
git commit -m "feat: add hybrid search with Engram + HNSW re-ranking"
```

---

### Phase 3 Success Criteria

- [ ] Hybrid search combines exact and semantic results
- [ ] Re-ranking improves relevance by 20%+
- [ ] End-to-end search latency <100ms
- [ ] Integration tests with real data

---

## Phase 4-10 Summary

**Phase 4: RLM Integration (Weeks 17-22)**
- Implement recursive language models for long-context reasoning
- Python REPL environment for context manipulation
- Overnight planning with massive task analysis

**Phase 5: Agent System (Weeks 23-28)**
- Specialist swarm (code, image, text, research)
- ReAct reasoning agents
- Hierarchical task planner

**Phase 6: Mobile Experience (Weeks 29-34)**
- Progressive Web App configuration
- Offline voice capture with IndexedDB queue
- Push notifications (iOS 16.4+, Android)
- Mobile-optimized UI patterns

**Phase 7: Voice Enhancement (Weeks 35-40)**
- Emotionally responsive voice AI
- Full-duplex conversations with barge-in
- Voice persona system

**Phase 8: Analytics & Monitoring (Weeks 41-44)**
- Privacy-first analytics (no voice data)
- Performance monitoring dashboards
- Custom metrics and alerting

**Phase 9: Social Features (Weeks 45-48)**
- Opt-in leaderboards
- Collaborative sessions
- Community quests

**Phase 10: Optimization (Weeks 49-52)**
- Performance tuning
- A/B testing
- Documentation and knowledge transfer

---

## Testing Strategy

### Unit Tests
- Run: `npm run test`
- Coverage: 80%+ lines, functions, branches
- All tests mock AI services (MSW)

### Integration Tests
- Run: `npm run test:integration`
- Use @cloudflare/vitest-pool-workers
- Test real D1, R2, Vectorize bindings

### E2E Tests
- Run: `npm run test:e2e`
- Playwright with mobile and desktop viewports
- Test critical user journeys

---

## Performance Benchmarks

### Target Metrics

| Operation | Current | Target | Improvement |
|-----------|---------|--------|-------------|
| **Search (cached)** | 200-500ms | <10ms | 20-50x |
| **Search (uncached)** | 200-500ms | <50ms | 4-10x |
| **Model cascade** | N/A | <2s | New |
| **Memory lookup** | O(N) | O(1) | ∞ |
| **Vector search** | O(N) | O(log N) | Significant |

### Monitoring

- Track P50, P95, P99 latencies
- Monitor cache hit rates (target: >50%)
- Alert on P95 latency >8s (AI) or >200ms (cached)
- Neuron usage alerts at 80% and 95%

---

## Risk Mitigation

### Technical Risks

1. **Desktop Connector Adoption**
   - Risk: Users won't install desktop app
   - Mitigation: Make cloud-only experience excellent first
   - Fallback: Graceful degradation to cloud-only

2. **VRAM Limitations**
   - Risk: Users don't have 8-16GB VRAM
   - Mitigation: Aggressive quantization (Q3_K_M)
   - Fallback: Cloud processing

3. **Mobile Complexity**
   - Risk: Mobile features too complex
   - Mitigation: Progressive enhancement
   - Fallback: Basic PWA without advanced features

### Operational Risks

1. **Cloudflare Quota**
   - Risk: Exceed free tier limits
   - Mitigation: Aggressive caching, local processing
   - Monitoring: Daily quota tracking with alerts

2. **Model Availability**
   - Risk: Ollama models unavailable
   - Mitigation: Automatic fallback to cloud
   - Monitoring: Health checks every 5 minutes

---

## Dependencies

### External Services

- **Cloudflare Workers**: Core backend
- **Cloudflare D1**: Database
- **Cloudflare R2**: Storage
- **Cloudflare Vectorize**: Vector search
- **Ollama**: Local model inference
- **Qdrant**: Local vector database (optional, can use Vectorize)

### NPM Packages

```json
{
  "dependencies": {
    "@qdrant/js-client-rest": "^1.7.0",
    "hono": "^3.12.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.1.0",
    "@testing-library/react": "^14.1.0",
    "@vitest/ui": "^1.0.0",
    "msw": "^2.0.0",
    "playwright": "^1.40.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Success Criteria

### Phase Completion

Each phase is complete when:
- [ ] All tasks implemented and committed
- [ ] Unit tests passing with 80%+ coverage
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Documentation updated

### Overall Success

The architecture is successful when:
- [ ] Mobile users get <5s response times
- [ ] Desktop users with connector get <500ms response times
- [ ] Cache hit rate >50%
- [ ] Neuron consumption reduced by 40%+
- [ ] User satisfaction >4.5/5

---

## Next Steps After Plan Approval

1. **Create isolated worktree**: Use `superpowers:using-git-worktrees`
2. **Begin Phase 0**: Foundation with testing infrastructure
3. **Execute iteratively**: Use `superpowers:executing-plans` for task-by-task implementation
4. **Review checkpoints**: After each phase, review and adjust

**This plan provides bite-sized tasks (2-5 minutes each) with exact file paths, complete code, test commands, and success criteria. Ready for execution!**
