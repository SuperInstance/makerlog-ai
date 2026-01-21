# Episodic and Semantic Memory Systems for AI Agents

**Research Document:** Dual-Memory Architecture for AI Self-Improvement
**Created:** 2026-01-21
**Applies to:** Makerlog.ai Desktop Connector and Cloud Services

## Executive Summary

Human memory operates through two complementary systems: **episodic memory** (specific experiences tied to time and context) and **semantic memory** (general knowledge detached from specific events). AI systems that mimic this dual-memory architecture can achieve more robust learning, faster adaptation, and better generalization.

This document demonstrates how Makerlog.ai can implement dual-memory to:
- **Store specific experiences** (individual assets, one-time feedback) as episodic memories
- **Extract general rules** (style preferences, patterns) as semantic memories
- **Consolidate experiences** into knowledge over time
- **Retrieve appropriate memory type** based on query context

## Core Concepts

### Human Memory Architecture

```
Human Memory System:

┌─────────────────────────────────────────────────────────────┐
│                        Working Memory                       │
│                   (Active Processing)                       │
│                   Capacity: 7±2 items                       │
│                   Duration: Seconds                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ Episodic Memory  │      │ Semantic Memory  │
│  (Hippocampus)   │      │   (Neocortex)    │
├──────────────────┤      ├──────────────────┤
│ Specific events  │      │ General facts    │
│ Time-stamped     │      │ Context-free     │
│ Autobiographical │      │ Abstract concepts│
│ "When I created  │      │ "Icons should be │
│  that icon..."   │      │  minimalist"     │
└─────────┬────────┘      └────────┬─────────┘
          │                         │
          │      Consolidation      │
          └────────────►────────────┘
                (During Sleep)
```

### Key Differences

| Aspect | Episodic Memory | Semantic Memory |
|--------|----------------|-----------------|
| **Content** | Specific experiences | General knowledge |
| **Context** | Time, place, emotions | Detached from context |
| **Organization** | Chronological | Conceptual/network |
| **Retrieval** | Pattern completion | Association |
| **Capacity** | Limited (detailed) | Unlimited (compressed) |
| **Example** | "User rated Asset #123 5★ on Jan 15" | "User prefers minimalist style" |

### Consolidation Process

```
Immediate Experience:
"I created a landing page and the user said it was too cluttered"

      │
      ▼ (Repeated exposure)

Episodic Memory (Stored):
Asset #456, prompt: "landing page", feedback: "too cluttered", timestamp: 2026-01-15

      │
      ▼ (Pattern detection across multiple episodes)

Semantic Memory (Extracted):
Style Preference: "minimalist", strength: 0.8, evidence_count: 23
```

## AI Memory Architecture

### Dual-Memory Design

```typescript
interface MemorySystem {
  // Episodic: Raw experiences
  episodic: EpisodicMemoryStore;

  // Semantic: Extracted knowledge
  semantic: SemanticMemoryStore;

  // Consolidation: Transform episodes into semantics
  consolidator: MemoryConsolidator;

  // Retrieval: Smart routing based on query
  retriever: MemoryRetriever;
}

interface EpisodicMemory {
  id: string;              // Unique episode ID
  type: 'asset' | 'feedback' | 'conversation';
  timestamp: number;       // Unix timestamp
  context: {
    userId: string;
    sessionId: string;
    task: string;
  };
  content: {
    prompt: string;
    result: string;
    rating?: number;
    feedback?: string;
  };
  embedding: number[];     // 768-dim vector
  metadata: Record<string, any>;
}

interface SemanticMemory {
  id: string;              // Concept ID
  type: 'style_preference' | 'pattern' | 'rule';
  confidence: number;      // 0-1
  evidence_count: number;  // How many episodes support this
  last_updated: number;
  content: {
    // Style preferences
    style_vector?: number[];      // 512-dim preference vector
    keywords?: string[];          // ["minimalist", "clean"]

    // Patterns
    pattern?: {
      if_condition: string;       // "user requests landing page"
      then_action: string;        // "use minimalist style"
    };

    // Rules
    rule?: {
      condition: string;
      action: string;
      exceptions: string[];
    };
  };
  source_episodes: string[];  // IDs of supporting episodes
}
```

## Implementation for Makerlog.ai

### Current System Analysis

**Problem:** Everything is stored as flat assets with no memory distinction.

```typescript
// Current: Single-tier storage
interface GeneratedAsset {
  id: string;
  prompt: string;
  file_url: string;
  style_vector?: number[];      // Not utilized effectively
  average_rating?: number;      // Aggregate, not episodic
  created_at: number;
}
```

**Limitations:**
- No separation between specific experiences and general preferences
- No consolidation mechanism
- No way to say "this was a one-time request" vs "this is a pattern"
- Style profiles are simple averages, not learned abstractions

### Proposed Dual-Memory System

#### 1. Episodic Memory Store

```typescript
// workers/api/src/memory/episodic.ts

interface Episode {
  id: string;
  type: 'asset_generation' | 'user_feedback' | 'conversation';
  timestamp: number;
  userId: string;
  sessionId: string;

  // Event-specific data
  eventData: {
    // For asset_generation
    prompt?: string;
    assetId?: string;
    generatedContent?: string;

    // For user_feedback
    rating?: number;
    feedbackText?: string;
    assetId?: string;

    // For conversation
    messageContent?: string;
    responseContent?: string;
  };

  // Contextual information
  context: {
    previousAssets?: string[];
    taskType?: string;
    timeOfDay?: number;
    deviceType?: string;
  };

  // Embedding for similarity search
  embedding: number[];
}

export class EpisodicMemoryStore {
  constructor(
    private db: D1Database,
    private vectorize: VectorizeIndex
  ) {}

  async storeEpisode(episode: Episode): Promise<void> {
    // 1. Store in D1 for structured queries
    await this.db.prepare(`
      INSERT INTO episodes (
        id, type, timestamp, user_id, session_id,
        event_data, context, embedding_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      episode.id,
      episode.type,
      episode.timestamp,
      episode.userId,
      episode.sessionId,
      JSON.stringify(episode.eventData),
      JSON.stringify(episode.context),
      `${episode.id}_emb`
    ).run();

    // 2. Store embedding in Vectorize for semantic search
    await this.vectorize.upsert([
      {
        id: `${episode.id}_emb`,
        values: episode.embedding,
        metadata: {
          type: episode.type,
          userId: episode.userId,
          timestamp: episode.timestamp
        }
      }
    ]);
  }

  async retrieveRecentEpisodes(
    userId: string,
    limit: number = 10
  ): Promise<Episode[]> {
    const result = await this.db.prepare(`
      SELECT * FROM episodes
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(userId, limit).all();

    return result.results.map(row => this.parseEpisode(row));
  }

  async searchSimilarEpisodes(
    queryEmbedding: number[],
    userId: string,
    limit: number = 5
  ): Promise<Episode[]> {
    // Vectorize semantic search
    const matches = await this.vectorize.query(queryEmbedding, {
      topK: limit,
      filter: { userId },
      returnMetadata: true
    });

    // Fetch full episodes from D1
    const episodeIds = matches.map(m => m.id.replace('_emb', ''));
    const episodes = await Promise.all(
      episodeIds.map(id => this.fetchEpisode(id))
    );

    return episodes.filter(e => e !== null);
  }

  private parseEpisode(row: any): Episode {
    return {
      id: row.id,
      type: row.type,
      timestamp: row.timestamp,
      userId: row.user_id,
      sessionId: row.session_id,
      eventData: JSON.parse(row.event_data),
      context: JSON.parse(row.context),
      embedding: [] // Fetch separately if needed
    };
  }
}
```

**Database Schema:**

```sql
-- Episodic memory table
CREATE TABLE episodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'asset_generation', 'user_feedback', 'conversation'
  timestamp INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT,
  event_data TEXT NOT NULL, -- JSON
  context TEXT, -- JSON
  embedding_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_episodes_user_timestamp
  ON episodes(user_id, timestamp DESC);
CREATE INDEX idx_episodes_type
  ON episodes(type, timestamp DESC);
```

#### 2. Semantic Memory Store

```typescript
// workers/api/src/memory/semantic.ts

export class SemanticMemoryStore {
  constructor(
    private db: D1Database,
    private vectorize: VectorizeIndex
  ) {}

  async storeSemanticMemory(memory: SemanticMemory): Promise<void> {
    await this.db.prepare(`
      INSERT INTO semantic_memories (
        id, type, confidence, evidence_count,
        last_updated, content, source_episodes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        confidence = excluded.confidence,
        evidence_count = excluded.evidence_count,
        last_updated = excluded.last_updated,
        content = excluded.content,
        source_episodes = excluded.source_episodes
    `).bind(
      memory.id,
      memory.type,
      memory.confidence,
      memory.evidence_count,
      memory.last_updated,
      JSON.stringify(memory.content),
      JSON.stringify(memory.source_episodes)
    ).run();

    // Update semantic index for retrieval
    if (memory.content.style_vector) {
      await this.vectorize.upsert([
        {
          id: `semantic_${memory.id}`,
          values: memory.content.style_vector,
          metadata: {
            type: 'semantic',
            memoryType: memory.type,
            confidence: memory.confidence
          }
        }
      ]);
    }
  }

  async retrieveStylePreferences(
    userId: string
  ): Promise<SemanticMemory[]> {
    const result = await this.db.prepare(`
      SELECT * FROM semantic_memories
      WHERE type = 'style_preference'
      AND id IN (
        SELECT DISTINCT semantic_memory_id
        FROM user_semantic_memories
        WHERE user_id = ?
      )
      ORDER BY confidence DESC
    `).bind(userId).all();

    return result.results.map(row => this.parseSemanticMemory(row));
  }

  async retrieveRelevantPatterns(
    query: string,
    userId: string
  ): Promise<SemanticMemory[]> {
    // Embed query
    const queryEmbed = await embed(query);

    // Search semantic memories
    const matches = await this.vectorize.query(queryEmbed, {
      topK: 5,
      filter: {
        type: 'semantic',
        memoryType: 'pattern'
      },
      returnMetadata: true
    });

    // Fetch full memories
    const memoryIds = matches.map(m => m.id.replace('semantic_', ''));
    return await Promise.all(
      memoryIds.map(id => this.fetchSemanticMemory(id))
    );
  }

  private parseSemanticMemory(row: any): SemanticMemory {
    return {
      id: row.id,
      type: row.type,
      confidence: row.confidence,
      evidence_count: row.evidence_count,
      last_updated: row.last_updated,
      content: JSON.parse(row.content),
      source_episodes: JSON.parse(row.source_episodes)
    };
  }
}
```

**Database Schema:**

```sql
-- Semantic memory table
CREATE TABLE semantic_memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'style_preference', 'pattern', 'rule'
  confidence REAL NOT NULL,
  evidence_count INTEGER DEFAULT 1,
  last_updated INTEGER NOT NULL,
  content TEXT NOT NULL, -- JSON
  source_episodes TEXT NOT NULL, -- JSON array of episode IDs
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- User-semantic memory mapping (many-to-many)
CREATE TABLE user_semantic_memories (
  user_id TEXT NOT NULL,
  semantic_memory_id TEXT NOT NULL,
  adopted_at INTEGER NOT NULL,
  strength REAL DEFAULT 1.0,
  PRIMARY KEY (user_id, semantic_memory_id),
  FOREIGN KEY (semantic_memory_id) REFERENCES semantic_memories(id)
);

CREATE INDEX idx_semantic_type_confidence
  ON semantic_memories(type, confidence DESC);
```

#### 3. Memory Consolidation Engine

```typescript
// workers/api/src/memory/consolidation.ts

export class MemoryConsolidator {
  constructor(
    private episodic: EpisodicMemoryStore,
    private semantic: SemanticMemoryStore,
    private ai: Ai
  ) {}

  // Main consolidation loop (runs daily or after N episodes)
  async consolidateMemories(userId: string): Promise<void> {
    // 1. Fetch recent unconsolidated episodes
    const recentEpisodes = await this.episodic.retrieveRecentEpisodes(userId, 50);

    // 2. Group by type for different consolidation strategies
    const assetEpisodes = recentEpisodes.filter(e => e.type === 'asset_generation');
    const feedbackEpisodes = recentEpisodes.filter(e => e.type === 'user_feedback');

    // 3. Consolidate style preferences from feedback
    await this.consolidateStylePreferences(userId, feedbackEpisodes);

    // 4. Detect patterns in asset generation
    await this.consolidatePatterns(userId, assetEpisodes);

    // 5. Update episodic flags
    await this.markAsConsolidated(recentEpisodes.map(e => e.id));
  }

  private async consolidateStylePreferences(
    userId: string,
    feedbackEpisodes: Episode[]
  ): Promise<void> {
    // Group feedback by asset characteristics
    const feedbackGroups = await this.groupByCharacteristics(feedbackEpisodes);

    for (const [characteristic, episodes] of feedbackGroups) {
      // Calculate preference strength
      const positiveCount = episodes.filter(e =>
        e.eventData.rating && e.eventData.rating >= 4
      ).length;

      const strength = positiveCount / episodes.length;

      if (strength > 0.7 && episodes.length >= 3) {
        // Strong preference detected - create semantic memory
        const semanticMemory: SemanticMemory = {
          id: `style_${userId}_${characteristic}`,
          type: 'style_preference',
          confidence: strength,
          evidence_count: episodes.length,
          last_updated: Date.now(),
          content: {
            style_vector: await this.aggregateStyleVectors(episodes),
            keywords: await this.extractKeywords(episodes)
          },
          source_episodes: episodes.map(e => e.id)
        };

        await this.semantic.storeSemanticMemory(semanticMemory);
      }
    }
  }

  private async consolidatePatterns(
    userId: string,
    assetEpisodes: Episode[]
  ): Promise<void> {
    // Use AI to detect patterns across episodes
    const patternPrompt = this.buildPatternDetectionPrompt(assetEpisodes);

    const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You detect patterns in user behavior. Return JSON with pattern descriptions.'
        },
        {
          role: 'user',
          content: patternPrompt
        }
      ]
    });

    const patterns = JSON.parse(response.response);

    for (const pattern of patterns) {
      const semanticMemory: SemanticMemory = {
        id: `pattern_${userId}_${hash(pattern.description)}`,
        type: 'pattern',
        confidence: pattern.confidence || 0.7,
        evidence_count: pattern.supporting_episodes.length,
        last_updated: Date.now(),
        content: {
          pattern: {
            if_condition: pattern.if_condition,
            then_action: pattern.then_action
          }
        },
        source_episodes: pattern.supporting_episodes
      };

      await this.semantic.storeSemanticMemory(semanticMemory);
    }
  }

  private async aggregateStyleVectors(episodes: Episode[]): Promise<number[]> {
    // Fetch embeddings from episodes
    const embeddings = await Promise.all(
      episodes.map(e => this.fetchEpisodeEmbedding(e.id))
    );

    // Average embeddings to create style vector
    const dimension = embeddings[0].length;
    const averaged = new Array(dimension).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dimension; i++) {
        averaged[i] += emb[i];
      }
    }

    for (let i = 0; i < dimension; i++) {
      averaged[i] /= embeddings.length;
    }

    return averaged;
  }

  private async extractKeywords(episodes: Episode[]): Promise<string[]> {
    // Use AI to extract common keywords from feedback
    const feedbackTexts = episodes
      .map(e => e.eventData.feedbackText)
      .filter(Boolean)
      .join('\n');

    const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'Extract 5-10 key style keywords from feedback. Return JSON array.'
        },
        {
          role: 'user',
          content: feedbackTexts
        }
      ]
    });

    return JSON.parse(response.response);
  }

  private buildPatternDetectionPrompt(episodes: Episode[]): string {
    const episodeDescriptions = episodes.map(e =>
      `- Prompt: "${e.eventData.prompt}" (Task: ${e.context.taskType})`
    ).join('\n');

    return `Analyze these user prompts and detect patterns:

${episodeDescriptions}

Return JSON array of patterns:
[
  {
    "description": "User frequently requests landing pages",
    "if_condition": "task contains 'landing page'",
    "then_action": "use minimalist design style",
    "confidence": 0.8,
    "supporting_episodes": ["episode_id_1", "episode_id_2"]
  }
]`;
  }

  private async markAsConsolidated(episodeIds: string[]): Promise<void> {
    // Update consolidation flags in database
    // Implementation depends on schema
  }
}
```

#### 4. Smart Memory Retrieval

```typescript
// workers/api/src/memory/retrieval.ts

interface RetrievalOptions {
  preferEpisodic?: boolean;      // True for specific event queries
  preferSemantic?: boolean;      // True for general preference queries
  timeRange?: [number, number];  // Filter episodes by time
  minConfidence?: number;        // Filter semantics by confidence
  includeContext?: boolean;      // Include surrounding episodes
}

export class MemoryRetriever {
  constructor(
    private episodic: EpisodicMemoryStore,
    private semantic: SemanticMemoryStore
  ) {}

  async retrieve(
    userId: string,
    query: string,
    options: RetrievalOptions = {}
  ): Promise<MemoryRetrievalResult> {
    // Determine query type
    const queryType = this.classifyQuery(query);

    // Route to appropriate memory system
    switch (queryType) {
      case 'specific_event':
        return await this.retrieveEpisodic(userId, query, options);

      case 'general_preference':
        return await this.retrieveSemantic(userId, query, options);

      case 'contextual':
        return await this.retrieveMixed(userId, query, options);

      default:
        return await this.retrieveSemantic(userId, query, options);
    }
  }

  private classifyQuery(query: string): 'specific_event' | 'general_preference' | 'contextual' {
    // Use heuristics or lightweight classifier

    // Specific event indicators
    const specificPhrases = [
      'what did i create', 'show me', 'last time',
      'previous', 'that asset', 'the one from'
    ];

    // General preference indicators
    const generalPhrases = [
      'my style', 'preferences', 'usually', 'typically',
      'i like', 'i prefer', 'my taste'
    ];

    const lowerQuery = query.toLowerCase();

    if (specificPhrases.some(p => lowerQuery.includes(p))) {
      return 'specific_event';
    }

    if (generalPhrases.some(p => lowerQuery.includes(p))) {
      return 'general_preference';
    }

    return 'contextual';
  }

  private async retrieveEpisodic(
    userId: string,
    query: string,
    options: RetrievalOptions
  ): Promise<MemoryRetrievalResult> {
    // Search for similar episodes
    const queryEmbed = await embed(query);
    const episodes = await this.episodic.searchSimilarEpisodes(
      queryEmbed,
      userId,
      10
    );

    // Filter by time range if specified
    let filtered = episodes;
    if (options.timeRange) {
      filtered = episodes.filter(e =>
        e.timestamp >= options.timeRange![0] &&
        e.timestamp <= options.timeRange![1]
      );
    }

    // Include context if requested
    if (options.includeContext) {
      for (const episode of filtered) {
        episode.context = await this.fetchEpisodeContext(episode.id);
      }
    }

    return {
      type: 'episodic',
      results: filtered,
      confidence: this.calculateEpisodicConfidence(filtered)
    };
  }

  private async retrieveSemantic(
    userId: string,
    query: string,
    options: RetrievalOptions
  ): Promise<MemoryRetrievalResult> {
    // Search semantic memories
    const memories = await this.semantic.retrieveRelevantPatterns(query, userId);

    // Filter by confidence if specified
    let filtered = memories;
    if (options.minConfidence) {
      filtered = memories.filter(m => m.confidence >= options.minConfidence!);
    }

    // Fetch supporting episodes for transparency
    for (const memory of filtered) {
      memory.supportingEpisodes = await this.fetchSupportingEpisodes(
        memory.source_episodes.slice(0, 5) // Limit to 5 for performance
      );
    }

    return {
      type: 'semantic',
      results: filtered,
      confidence: this.calculateSemanticConfidence(filtered)
    };
  }

  private async retrieveMixed(
    userId: string,
    query: string,
    options: RetrievalOptions
  ): Promise<MemoryRetrievalResult> {
    // Parallel retrieval from both systems
    const [episodic, semantic] = await Promise.all([
      this.retrieveEpisodic(userId, query, options),
      this.retrieveSemantic(userId, query, options)
    ]);

    // Merge and rank results
    return {
      type: 'mixed',
      results: this.mergeResults(episodic.results, semantic.results),
      confidence: Math.max(episodic.confidence, semantic.confidence)
    };
  }

  private mergeResults(
    episodic: Episode[],
    semantic: SemanticMemory[]
  ): Array<Episode | SemanticMemory> {
    // Interleave results by confidence/relevance
    const merged: Array<Episode | SemanticMemory> = [];

    let i = 0, j = 0;
    while (i < episodic.length || j < semantic.length) {
      if (i < episodic.length && j < semantic.length) {
        // Compare and add most relevant
        const episodicScore = this.episodicRelevance(episodic[i]);
        const semanticScore = semantic[j].confidence;

        if (episodicScore > semanticScore) {
          merged.push(episodic[i++]);
        } else {
          merged.push(semantic[j++]);
        }
      } else if (i < episodic.length) {
        merged.push(episodic[i++]);
      } else {
        merged.push(semantic[j++]);
      }
    }

    return merged;
  }
}

interface MemoryRetrievalResult {
  type: 'episodic' | 'semantic' | 'mixed';
  results: Array<Episode | SemanticMemory>;
  confidence: number;
}
```

## Integration with Tiered Memory

### Combining Episodic/Semantic with Hot/Cold Tiers

```
Memory Matrix:

                │ Episodic      │ Semantic
────────────────┼────────────────┼────────────────
Hot (Memory)    │ Recent        │ High-Confidence
                │ Sessions      │ Active Patterns
────────────────┼────────────────┼────────────────
Warm (KV)       │ This Week     │ Medium-Confidence
                │ Key Events    │ Common Patterns
────────────────┼────────────────┼────────────────
Cold (D1/R2)    │ Archive       │ Low-Confidence
                │ All History   │ All Patterns
```

### Implementation

```typescript
// workers/api/src/memory/tiered-dual.ts

export class TieredDualMemory {
  // Hot tier: In-memory worker state
  private hotEpisodic: Map<string, Episode> = new Map();
  private hotSemantic: Map<string, SemanticMemory> = new Map();

  // Warm tier: Cloudflare KV
  private warmEpisodic: KVNamespace;
  private warmSemantic: KVNamespace;

  // Cold tier: D1 + Vectorize
  private coldEpisodic: EpisodicMemoryStore;
  private coldSemantic: SemanticMemoryStore;

  async retrieve(
    userId: string,
    query: string,
    options: RetrievalOptions
  ): Promise<MemoryRetrievalResult> {
    // 1. Check hot tier first
    const hotResults = this.queryHot(userId, query);
    if (hotResults.length > 0) {
      return { type: 'mixed', results: hotResults, confidence: 0.9 };
    }

    // 2. Check warm tier
    const warmResults = await this.queryWarm(userId, query);
    if (warmResults.length > 0) {
      // Promote to hot
      this.promoteToHot(warmResults);
      return { type: 'mixed', results: warmResults, confidence: 0.7 };
    }

    // 3. Query cold tier
    const coldResults = await this.queryCold(userId, query, options);

    // Promote relevant results to warmer tiers
    await this.promoteResults(coldResults);

    return coldResults;
  }

  private promoteToHot(results: Array<Episode | SemanticMemory>): void {
    for (const result of results) {
      if (result.type === 'asset_generation' || result.type === 'style_preference') {
        if (result instanceof Episode) {
          this.hotEpisodic.set(result.id, result);
        } else {
          this.hotSemantic.set(result.id, result);
        }
      }
    }
  }
}
```

## Integration with Engram Research

### O(1) Episodic Lookup with Engram

```typescript
// workers/api/src/memory/engram-episodic.ts

export class EngramEpisodicMemory {
  private engram: EngramIndex; // O(1) n-gram index
  private episodic: EpisodicMemoryStore;

  async retrieveEpisode(
    query: string,
    userId: string
  ): Promise<Episode[]> {
    // Stage 1: O(1) exact match via n-grams
    const candidateIds = this.engram.lookup(query);

    // Stage 2: Filter by user
    const userEpisodes = await this.episodic.fetchEpisodes(candidateIds);
    const filtered = userEpisodes.filter(e => e.userId === userId);

    // Stage 3: Semantic re-ranking if needed
    if (filtered.length > 10) {
      const queryEmbed = await embed(query);
      return filtered
        .map(e => ({
          episode: e,
          similarity: cosine(queryEmbed, e.embedding)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)
        .map(r => r.episode);
    }

    return filtered;
  }
}
```

### Semantic Memory with Engram Pattern Index

```typescript
// workers/api/src/memory/engram-semantic.ts

export class EngramSemanticMemory {
  private engram: EngramIndex;
  private semantic: SemanticMemoryStore;

  async retrievePattern(
    query: string,
    userId: string
  ): Promise<SemanticMemory[]> {
    // O(1) pattern lookup via n-grams
    const patternIds = this.engram.lookup(query);

    // Fetch full semantic memories
    const patterns = await this.semantic.fetchMemories(patternIds);

    // Filter by user-adoption and confidence
    return patterns.filter(p =>
      p.confidence > 0.7 &&
      this.isUserAdopted(p, userId)
    );
  }
}
```

## Use Cases for Makerlog.ai

### 1. Enhanced Prompt Construction

```typescript
// workers/api/src/generation/prompt-enhancement.ts

export class PromptEnhancer {
  constructor(
    private memoryRetriever: MemoryRetriever
  ) {}

  async enhancePrompt(
    userPrompt: string,
    userId: string
  ): Promise<EnhancedPrompt> {
    // 1. Retrieve semantic preferences (general style)
    const semanticResult = await this.memoryRetriever.retrieve(
      userId,
      userPrompt,
      { preferSemantic: true }
    );

    // 2. Retrieve episodic examples (specific similar works)
    const episodicResult = await this.memoryRetriever.retrieve(
      userId,
      userPrompt,
      { preferEpisodic: true }
    );

    // 3. Extract style modifiers from semantic memory
    const stylePreferences = semanticResult.results
      .filter(r => r.type === 'style_preference')
      .map(s => s.content.keywords)
      .flat();

    // 4. Extract reference examples from episodic memory
    const referenceExamples = episodicResult.results
      .filter(r => r.type === 'asset_generation')
      .slice(0, 3);

    // 5. Build enhanced prompt
    return {
      basePrompt: userPrompt,
      styleModifiers: stylePreferences,
      referenceExamples: referenceExamples.map(e => ({
        prompt: e.eventData.prompt,
        assetUrl: e.eventData.generatedContent
      })),
      confidence: Math.max(semanticResult.confidence, episodicResult.confidence)
    };
  }
}

interface EnhancedPrompt {
  basePrompt: string;
  styleModifiers: string[];
  referenceExamples: Array<{
    prompt: string;
    assetUrl: string;
  }>;
  confidence: number;
}
```

### 2. Contextual Autocomplete

```typescript
// workers/api/src/autocomplete/contextual.ts

export class ContextualAutocomplete {
  constructor(
    private memoryRetriever: MemoryRetriever
  ) {}

  async suggestCompletions(
    partialPrompt: string,
    userId: string
  ): Promise<string[]> {
    // Retrieve similar episodic memories
    const result = await this.memoryRetriever.retrieve(
      userId,
      partialPrompt,
      { preferEpisodic: true, includeContext: true }
    );

    // Extract completion patterns
    const completions = result.results
      .filter(r => r.type === 'asset_generation')
      .map(e => e.eventData.prompt as string)
      .filter(p => p.startsWith(partialPrompt))
      .slice(0, 5);

    return completions;
  }
}
```

### 3. Adaptive Quality Control

```typescript
// workers/api/src/quality/adaptive-control.ts

export class AdaptiveQualityController {
  constructor(
    private memoryRetriever: MemoryRetriever
  ) {}

  async shouldGenerate(
    prompt: string,
    userId: string
  ): Promise<{ shouldProceed: boolean; reason?: string }> {
    // 1. Check semantic memory for rejections
    const semantic = await this.memoryRetriever.retrieve(
      userId,
      prompt,
      { preferSemantic: true, minConfidence: 0.8 }
    );

    // Look for rejection patterns
    const rejectionPattern = semantic.results.find(r =>
      r.type === 'pattern' &&
      r.content.pattern?.then_action.includes('reject')
    );

    if (rejectionPattern) {
      return {
        shouldProceed: false,
        reason: `Pattern detected: ${rejectionPattern.content.pattern.if_condition}`
      };
    }

    // 2. Check episodic memory for recent rejections
    const episodic = await this.memoryRetriever.retrieve(
      userId,
      prompt,
      { preferEpisodic: true, timeRange: [Date.now() - 86400000, Date.now()] }
    );

    const recentRejections = episodic.results.filter(r =>
      r.type === 'user_feedback' &&
      (r as Episode).eventData.rating &&
      (r as Episode).eventData.rating! < 3
    );

    if (recentRejections.length >= 3) {
      return {
        shouldProceed: false,
        reason: 'Recent pattern of low ratings for similar requests'
      };
    }

    return { shouldProceed: true };
  }
}
```

## Benefits of Dual-Memory Architecture

### 1. Robust Self-Improvement

**Before (Single Tier):**
```
User Request → Check All Assets → Simple Average Style
- Limited by asset count
- No distinction between one-time vs patterns
- Brittle with sparse data
```

**After (Dual Memory):**
```
User Request →
  1. Check Semantic Preferences (fast, high-level)
  2. Check Episodic Examples (specific, contextual)
  3. Consolidate and Refine
- Works with sparse data (semantic from few examples)
- Respects one-time requests (episodic isolation)
- Improves over time (consolidation)
```

### 2. Memory Efficiency

| Memory Type | Storage | Retrieval | Use Case |
|-------------|---------|-----------|----------|
| **Episodic** | Detailed, raw | O(N) or O(log N) | Specific queries |
| **Semantic** | Compressed, abstract | O(1) with Engram | General preferences |
| **Combined** | Optimal balance | Adaptive routing | All queries |

**Storage Savings:**
- Episodic: Keep raw data for recent episodes (7 days)
- Semantic: Compress old episodes into abstractions
- Result: 60-80% storage reduction for long-term memory

### 3. Faster Adaptation

```
Time to Learn Preference:

Single Tier: 50+ examples for stable average
Semantic: 3-5 examples for pattern detection (with confidence 0.7+)
Episodic: Immediate access to specific examples

Combined: Fast learning + detailed recall
```

### 4. Better User Experience

**Scenario: "User typically likes minimalist icons but wants a detailed illustration this one time"**

```typescript
// Semantic memory says: minimalist
const semantic = await retrieveSemantic(userId, "icon");
// Result: { style: "minimalist", confidence: 0.9 }

// Episodic memory shows: detailed request
const episodic = await retrieveEpisodic(userId, "illustration");
// Result: { prompt: "detailed illustration...", context: "one-off request" }

// Decision: Use episodic context
if (episodic.context.oneOff) {
  // Override semantic preference
  useStyle("detailed");
} else {
  // Use semantic preference
  useStyle("minimalistic");
}
```

## Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-3)

**Week 1: Database Schema**
```sql
-- Add episodes and semantic_memories tables
-- Create indexes for efficient querying
-- Set up consolidation triggers
```

**Week 2: Episodic Memory Store**
```typescript
// Implement EpisodicMemoryStore class
// Integrate with existing asset generation
// Capture all user interactions as episodes
```

**Week 3: Semantic Memory Store**
```typescript
// Implement SemanticMemoryStore class
// Create basic consolidation logic
// Set up pattern detection
```

### Phase 2: Consolidation Engine (Weeks 4-6)

**Week 4: Style Preference Extraction**
```typescript
// Implement aggregateStyleVectors()
// Implement extractKeywords()
// Test with historical feedback data
```

**Week 5: Pattern Detection**
```typescript
// Implement LLM-based pattern detection
// Create pattern validation logic
// Set up confidence scoring
```

**Week 6: Consolidation Orchestration**
```typescript
// Implement MemoryConsolidator class
// Set up daily consolidation jobs
// Create monitoring and metrics
```

### Phase 3: Smart Retrieval (Weeks 7-9)

**Week 7: Query Classification**
```typescript
// Implement classifyQuery()
// Create routing logic
// Test with various query types
```

**Week 8: Memory Retrieval**
```typescript
// Implement MemoryRetriever class
// Create result merging logic
// Add confidence calculation
```

**Week 9: Integration**
```typescript
// Integrate with prompt enhancement
// Update quality control
// Add contextual autocomplete
```

### Phase 4: Tiered Integration (Weeks 10-12)

**Week 10: Hot/Cold Tiering**
```typescript
// Implement TieredDualMemory class
// Set up promotion/demotion logic
// Create cache warming strategies
```

**Week 11: Engram Integration**
```typescript
// Implement EngramEpisodicMemory class
// Implement EngramSemanticMemory class
// Create hybrid lookup strategies
```

**Week 12: Testing & Optimization**
```typescript
// A/B test against baseline
// Measure latency and accuracy
// Tune consolidation parameters
```

## Monitoring and Metrics

### Key Metrics

```typescript
interface DualMemoryMetrics {
  // Episodic memory metrics
  episodicCount: number;
  episodicRetrievalLatency: number;
  episodicHitRate: number;

  // Semantic memory metrics
  semanticCount: number;
  semanticRetrievalLatency: number;
  semanticHitRate: number;

  // Consolidation metrics
  consolidationFrequency: number;
  patternsDetected: number;
  averageConfidence: number;

  // Overall performance
  totalRetrievalLatency: number;
  cacheHitRate: number;
  userSatisfaction: number;
}
```

### Alert Thresholds

- **Episodic hit rate < 10%**: May indicate consolidation issue
- **Semantic confidence < 0.5**: Patterns not strong enough
- **Retrieval latency > 500ms**: Tiering not effective
- **Consolidation failures**: Check AI service availability

## Trade-offs and Considerations

### Advantages

✅ **Robust learning** from sparse data (semantic memory)
✅ **Detailed recall** of specific experiences (episodic memory)
✅ **Efficient storage** through consolidation
✅ **Fast adaptation** to new preferences
✅ **Contextual awareness** for one-time requests
✅ **Transparent reasoning** (source episodes traceable)

### Disadvantages

❌ **Complexity** in managing two memory systems
❌ **Consolidation latency** (not instant)
❌ **Parameter tuning** (confidence thresholds, consolidation intervals)
❌ **Storage overhead** (maintain both systems)
❌ **Consistency challenges** (keeping systems in sync)

### Mitigation Strategies

1. **Start simple**: Implement episodic first, add semantic later
2. **Gradual consolidation**: Consolidate in batches, not all at once
3. **Fallback mechanisms**: Use episodic if semantic unavailable
4. **Monitoring**: Track metrics to detect issues early
5. **User control**: Allow users to reset semantic memory

## Comparison with Alternatives

| Feature | Single Memory | Dual Memory | Hybrid (Recommended) |
|---------|--------------|-------------|---------------------|
| **Learning Speed** | Slow (50+ examples) | Fast (3-5 examples) | Adaptive |
| **Storage Efficiency** | Low (all raw) | High (compressed) | Optimal |
| **Retrieval Speed** | Variable | Fast (semantic) | Fast + detailed |
| **Context Awareness** | Limited | High | High |
| **Complexity** | Low | High | Medium |
| **Cold Start** | Poor | Good | Good |

## Conclusion

Dual-memory architecture enables Makerlog.ai to learn like humans: forming quick generalizations (semantic) while retaining specific experiences (episodic). This combination provides fast adaptation, efficient storage, and contextual awareness.

**Key Takeaway:** Episodic memory captures "what happened" while semantic memory extracts "what we learned." Together, they enable robust self-improvement that works with sparse data and respects user context.

**Next Steps:**
1. Implement episodic memory store (Phase 1)
2. Build consolidation engine (Phase 2)
3. Create smart retrieval system (Phase 3)
4. Integrate with tiered memory and Engram (Phase 4)
5. Monitor and optimize based on metrics

---

**Sources:**
- Human Memory Systems: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3122166/
- Episodic vs Semantic Memory: https://doi.org/10.1016/j.cognition.2015.10.015
- Memory Consolidation: https://doi.org/10.1038/nrn.2016.163
- AI Memory Architectures: https://arxiv.org/abs/2305.14314
- Vector Databases for RAG: https://arxiv.org/abs/2004.08100
- DeepSeek Engram: https://www.youtube.com/watch?v=iDkePlVasEk
