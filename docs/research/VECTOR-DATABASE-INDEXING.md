# Vector Database Indexing: HNSW, FAISS, and ANN Search

**Research Document:** High-Performance Vector Similarity Search
**Created:** 2026-01-21
**Applies to:** Makerlog.ai Semantic Search and Style Profiles

## Overview

Vector databases enable **semantic similarity search** by finding nearest neighbors in high-dimensional embedding space. As datasets grow, exact search becomes impractical, necessitating **Approximate Nearest Neighbor (ANN)** algorithms that trade small accuracy losses for massive speed improvements.

## Core Concepts

### Vector Embeddings

```
Text/Image → Neural Network → 512-768 dimensional vector
Example: "minimalist icon" → [0.23, -0.45, 0.67, ..., 0.12]
                                            (768 floats)
```

### Similarity Metrics

```typescript
// Cosine Similarity (most common)
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Euclidean Distance (alternative)
function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  );
}
```

### Exact vs Approximate Search

| Method | Complexity | Latency | Recall | Use Case |
|--------|------------|---------|--------|----------|
| **Brute Force** | O(N) | High (seconds) | 100% | Small datasets (<10k) |
| **ANN (HNSW)** | O(log N) | Low (ms) | 95-99% | Large datasets (>100k) |
| **IVF + PQ** | O(√N) | Medium | 90-95% | Very large datasets (>1M) |

## ANN Algorithms

### 1. HNSW (Hierarchical Navigable Small World)

**How it works:**
```
Layer 2: 1 entry point (long-range connections)
Layer 1: 10 entry points (medium-range connections)
Layer 0: 1000 points (short-range connections)

Search: Start at top, greedily move to nearest neighbor at each layer
```

**Characteristics:**
- **Build time:** O(N log N)
- **Query time:** O(log N)
- **Memory:** O(N) with overhead (2-3x vectors)
- **Recall:** 95-99% at 100x speedup vs brute force

**Parameters:**
```typescript
interface HNSWParams {
  efConstruction: number; // Depth during build (default: 200)
  M: number;              // Connections per node (default: 16)
  efSearch: number;       // Candidates during search (default: 50)
}

// Trade-offs:
// Higher M = Better recall, more memory, slower build
// Higher efSearch = Better recall, slower query
```

### 2. FAISS IVF (Inverted File Index)

**How it works:**
```
1. Cluster vectors into V Voronoi cells (k-means)
2. Search only in nearest nprobe cells
3. Quantize vectors for compression

Query:
  → Find nearest cells (100 out of 1000)
  → Search only those cells (10x speedup)
```

**Characteristics:**
- **Build time:** O(N) with clustering
- **Query time:** O(N/V + nprobe × V/M)
- **Memory:** Compressible with Product Quantization
- **Recall:** 90-95% with proper tuning

**Parameters:**
```typescript
interface IVFParams {
  nlist: number;    // Number of clusters (default: sqrt(N))
  nprobe: number;   // Cells to search (default: 10)
  quantizer: 'PQ' | 'SQ'; // Compression type
}
```

### 3. Product Quantization (PQ)

**How it works:**
```
768-dim vector → Split into 8 sub-vectors (96 dims each)
Each sub-vector → Quantized to 256 centroids (8 bits)
Total: 768 floats → 8 bytes (384x compression!)

Query:
  → Compare using compressed distances (approximate)
  → Re-rank top candidates with exact distances
```

**Characteristics:**
- **Compression:** 32-64x reduction
- **Memory:** Fits 1B vectors in 32GB RAM
- **Speed:** Faster distance computation (bytes vs floats)
- **Recall:** 85-95% with re-ranking

## Vector Database Options

### Cloudflare Vectorize

```typescript
// Current: Cloudflare Vectorize
const index = await env.VECTORIZE;

// Insert
await index.insert([
  { id: asset.id, vector: embedding }
]);

// Search (HNSW-based)
const results = await index.query(embedding, {
  topK: 10,
  namespace: userId,
  returnMetadata: true
});
```

**Pros:**
- Native Cloudflare integration
- Edge deployment (low latency)
- Automatic scaling
- Free tier: 1M vectors

**Cons:**
- Limited configuration options
- No custom distance metrics
- No filtering on metadata

### Pinecone

```typescript
// Alternative: Pinecone
const index = pinecone.Index('makerlog-assets');

// Upsert
await index.upsert([{
  id: asset.id,
  values: embedding,
  metadata: { type: 'image', rating: 5 }
}]);

// Query with metadata filter
const results = await index.query({
  vector: embedding,
  topK: 10,
  filter: { type: 'image', rating: { $gte: 4 } },
  includeMetadata: true
});
```

**Pros:**
- Rich metadata filtering
- Multiple distance metrics
- Hybrid search (keyword + vector)
- Auto-scaling

**Cons:**
- Additional service dependency
- Cost: $70/month for 1M vectors
- US-only regions (higher latency elsewhere)

### Qdrant (Self-Hosted)

```typescript
// Alternative: Qdrant on desktop connector
const client = new QdrantClient({ url: 'http://localhost:6333' });

// Create collection with HNSW
await client.createCollection('assets', {
  vectors: { size: 512, distance: 'Cosine', HNSW: { m: 16 } }
});

// Search with filter
const results = await client.search('assets', {
  vector: embedding,
  limit: 10,
  filter: {
    must: [
      { key: 'user_id', match: { value: userId } },
      { key: 'rating', range: { gte: 4 } }
    ]
  }
});
```

**Pros:**
- Self-hosted (no API costs)
- Rich filtering and payload indexing
- HNSW + Quantization support
- Real-time updates

**Cons:**
- Operations overhead
- Scaling complexity
- Requires infrastructure

## Application to Makerlog.ai

### Current Architecture

```
Problem: Everything in Vectorize with no tiering

Flow:
User Query → Worker → Vectorize → Return Results
- No caching of repeated queries
- No metadata filtering (post-process only)
- No local caching on desktop
```

### Proposed Hybrid Architecture

```
Tier 1: Desktop Connector (Local Qdrant)
  - Stores: User's assets, style profile examples
  - Size: 10k-100k vectors per user
  - Latency: <10ms (local)
  - Recall: 95-99% (HNSW)

Tier 2: Cloudflare Vectorize (Cloud)
  - Stores: All user embeddings
  - Size: Millions of vectors
  - Latency: 50-200ms (cloud)
  - Recall: 95-99% (HNSW)

Tier 3: Brute Force Fallback
  - Stores: Recent assets for exact search
  - Size: 1000 vectors
  - Latency: 100-500ms
  - Recall: 100%
```

### Implementation

#### 1. Local Vector Database on Desktop

```typescript
// packages/desktop-connector/src/vectordb/local-idx.ts

import { QdrantClient } from '@qdrant/js-client-rest';

export class LocalVectorDB {
  private client: QdrantClient;
  private collectionName = 'user_assets';

  constructor() {
    this.client = new QdrantClient({ url: 'http://localhost:6333' });
  }

  async initialize(): Promise<void> {
    const exists = await this.client.collectionExists(this.collectionName);

    if (!exists) {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: 512,
          distance: 'Cosine',
          hnsw_config: {
            m: 16,              // Connections per node
            ef_construct: 200,  // Build depth
            full_scan_threshold: 10000 // Brute force below this
          }
        }
      });
    }
  }

  async insert(asset: GeneratedAsset, embedding: number[]): Promise<void> {
    await this.client.upsert(this.collectionName, {
      points: [{
        id: asset.id,
        vector: embedding,
        payload: {
          user_id: asset.user_id,
          type: asset.type,
          created_at: asset.created_at,
          prompt: asset.metadata.prompt,
          rating: asset.average_rating
        }
      }]
    });
  }

  async search(
    userId: string,
    queryEmbedding: number[],
    filters?: { type?: string; minRating?: number }
  ): Promise<SearchResult[]> {
    const results = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit: 10,
      score_threshold: 0.7, // Only return good matches
      filter: {
        must: [
          { key: 'user_id', match: { value: userId } },
          ...(filters?.type ? [{ key: 'type', match: { value: filters.type } }] : []),
          ...(filters?.minRating ? [{
            key: 'rating',
            range: { gte: filters.minRating }
          }] : [])
        ]
      }
    });

    return results.map(r => ({
      id: r.id,
      score: r.score,
      payload: r.payload
    }));
  }

  async delete(userId: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      filter: {
        must: [{ key: 'user_id', match: { value: userId } }]
      }
    });
  }
}
```

#### 2. Hybrid Search Strategy

```typescript
// packages/desktop-connector/src/search/hybrid-search.ts

export class HybridSearchEngine {
  private localDB: LocalVectorDB;
  private cloudDB: VectorizeIndex;

  async search(
    userId: string,
    query: string,
    strategy: 'local' | 'cloud' | 'hybrid'
  ): Promise<Asset[]> {
    const queryEmbed = await this.embed(query);

    switch (strategy) {
      case 'local':
        // Fast local search (preferred)
        return await this.localDB.search(userId, queryEmbed);

      case 'cloud':
        // Cloud search (fallback)
        return await this.cloudDB.query(queryEmbed, {
          topK: 10,
          namespace: userId
        });

      case 'hybrid':
        // Combine local + cloud for best results
        return await this.hybridQuery(userId, queryEmbed);
    }
  }

  private async hybridQuery(
    userId: string,
    queryEmbed: number[]
  ): Promise<Asset[]> {
    // Tier 1: Local search (fast, recent assets)
    const localResults = await this.localDB.search(userId, queryEmbed);

    // Tier 2: Cloud search (slower, complete history)
    const cloudResults = await this.cloudDB.query(queryEmbed, {
      topK: 20,
      namespace: userId
    });

    // Merge and deduplicate
    const merged = this.mergeResults(localResults, cloudResults);

    // Re-rank by combined score
    return this.rerank(queryEmbed, merged).slice(0, 10);
  }

  private mergeResults(local: Asset[], cloud: Asset[]): Asset[] {
    const seen = new Set<string>();
    const merged: Asset[] = [];

    // Prioritize local results (higher confidence)
    for (const asset of local) {
      merged.push(asset);
      seen.add(asset.id);
    }

    // Add unique cloud results
    for (const asset of cloud) {
      if (!seen.has(asset.id)) {
        merged.push(asset);
      }
    }

    return merged;
  }

  private async rerank(
    queryEmbed: number[],
    assets: Asset[]
  ): Promise<Asset[]> {
    // Combine:
    // - Semantic similarity (cosine)
    // - Recency boost (recent assets preferred)
    // - Rating boost (high-rated assets preferred)
    // - Local vs cloud (local preferred)

    const now = Date.now();
    const DAY_MS = 86400000;

    return assets.map(asset => {
      const similarity = cosine(queryEmbed, asset.style_vector || []);
      const recencyBoost = Math.exp(-(now - asset.created_at) / (7 * DAY_MS));
      const ratingBoost = asset.average_rating / 5;
      const localBoost = asset.storage_backend === 'local' ? 1.1 : 1.0;

      return {
        ...asset,
        combinedScore: similarity * recencyBoost * ratingBoost * localBoost
      };
    }).sort((a, b) => b.combinedScore - a.combinedScore);
  }
}
```

#### 3. Vector Index Maintenance

```typescript
// packages/desktop-connector/src/vectordb/maintenance.ts

export class VectorIndexMaintenance {
  private localDB: LocalVectorDB;
  private cloudDB: VectorizeIndex;

  // Sync strategy: Periodic full sync
  async syncToCloud(userId: string): Promise<void> {
    // Get all local assets not in cloud
    const localAssets = await this.getLocalAssets(userId);
    const cloudIds = await this.getCloudAssetIds(userId);

    const toUpload = localAssets.filter(a => !cloudIds.has(a.id));

    // Batch upload to cloud
    for (const batch of this.chunk(toUpload, 100)) {
      await this.cloudDB.upsert(batch.map(a => ({
        id: a.id,
        vector: a.style_vector,
        namespace: userId
      })));
    }
  }

  // Prune strategy: Remove old local vectors
  async pruneLocalIndex(userId: string): Promise<void> {
    const cutoff = Date.now() - (30 * 86400000); // 30 days

    await this.localDB.deleteMany({
      user_id: userId,
      created_at: { $lt: cutoff }
    });
  }

  // Optimization: Rebuild HNSW index periodically
  async optimizeIndex(): Promise<void> {
    await this.localDB.rebuildIndex({
      m: 16,
      ef_construct: 200
    });
  }
}
```

### Benefits for Makerlog.ai

#### 1. Performance Improvements

| Operation | Vectorize Only | Local HNSW | Improvement |
|-----------|----------------|------------|-------------|
| **Search (local assets)** | 50-200ms | <10ms | **5-20x faster** |
| **Search (with filter)** | 100-500ms | <20ms | **5-25x faster** |
| **Insert new asset** | 50-100ms | <10ms | **5-10x faster** |
| **Batch operations** | 5-10s | <1s | **5-10x faster** |

#### 2. Offline Capability

```
With Local Index:
- Search works offline (desktop connector)
- New assets indexed locally
- Sync when connection restored
```

#### 3. Cost Reduction

```
Current:
- 100k searches/day × $0.50/M = $0.05/day
- Monthly: $1.50

With Local Index (80% hit rate):
- 20k cloud searches × $0.50/M = $0.01/day
- Monthly: $0.30 (80% savings)
```

## HNSW Parameter Tuning

### Finding Optimal M and ef

```typescript
// Grid search for optimal parameters
async function tuneHNSW(
  dataset: { vector: number[] }[],
  queries: number[]
): Promise<{ m: number; ef: number; recall: number; latency: number }> {
  const results = [];

  for (const m of [8, 16, 24, 32]) {
    for (const ef of [50, 100, 200, 400]) {
      const index = new HNSWIndex({ m, efConstruction: ef });

      // Build index
      for (const item of dataset) {
        await index.insert(item.vector);
      }

      // Measure performance
      const start = Date.now();
      const recall = measureRecall(index, queries);
      const latency = Date.now() - start;

      results.push({ m, ef, recall, latency });
    }
  }

  // Select best based on recall vs latency trade-off
  return results.sort((a, b) => {
    const scoreA = a.recall - (a.latency / 1000);
    const scoreB = b.recall - (b.latency / 1000);
    return scoreB - scoreA;
  })[0];
}
```

### Recommended Parameters

```typescript
const HNSW_PRESETS = {
  // Fast: Build quickly, good for small datasets
  fast: {
    m: 8,
    efConstruction: 100,
    efSearch: 50,
    expectedRecall: 0.90
  },

  // Balanced: Good trade-off for most use cases
  balanced: {
    m: 16,
    efConstruction: 200,
    efSearch: 100,
    expectedRecall: 0.95
  },

  // Accurate: Best recall, slower
  accurate: {
    m: 32,
    efConstruction: 400,
    efSearch: 200,
    expectedRecall: 0.99
  }
};

// Makerlog.ai recommendation: Balanced
const MAKERLOG_HNSW = HNSW_PRESETS.balanced;
```

## Implementation Strategy

### Phase 1: Local Index Setup (Week 1-2)

1. Run Qdrant in Docker on desktop connector
2. Implement `LocalVectorDB` class
3. Sync existing user assets to local index
4. Test search performance

### Phase 2: Hybrid Search (Week 3)

1. Implement `HybridSearchEngine`
2. Add fallback to cloud for missing data
3. Implement re-ranking strategy
4. A/B test against Vectorize-only

### Phase 3: Optimization (Week 4)

1. Tune HNSW parameters
2. Implement periodic sync
3. Add pruning strategy
4. Monitor recall and latency

## Monitoring and Metrics

### Key Metrics

```typescript
interface VectorDBMetrics {
  // Search performance
  avgSearchLatency: number;   // Target: <20ms (local)
  p95SearchLatency: number;   // Target: <50ms
  cacheHitRate: number;        // Target: >80%

  // Index quality
  recall: number;              // Target: >0.95
  indexSize: number;           // MB
  indexBuildTime: number;      // For new assets

  // Maintenance
  lastSyncTime: number;        // Unix timestamp
  syncErrors: number;          // Count
  indexFragments: number;      // For optimization
}
```

### Alert Thresholds

- **Search latency > 100ms**: Index needs optimization
- **Recall < 0.90**: HNSW parameters too aggressive
- **Sync failures > 5**: Cloud connectivity issues
- **Index size > 10GB**: Prune old vectors

## Trade-offs and Considerations

### Advantages

✅ **Massive speedup** vs brute force (100-1000x)
✅ **Scalable** to millions of vectors
✅ **Low latency** for cached/local searches
✅ **Offline capable** with local index
✅ **Cost reduction** via local caching

### Disadvantages

❌ **Approximate results** (95-99% recall)
❌ **Parameter tuning** required
❌ **Memory overhead** (2-3x vector size)
❌ **Build time** for large indexes
❌ **Complexity** vs simple exact search

### Recommendations

1. **Start with Vectorize**: Cloud-hosted, zero maintenance
2. **Add local index**: For power users and desktop connector
3. **Use hybrid search**: Combine local + cloud
4. **Monitor recall**: Ensure quality doesn't degrade
5. **Tune parameters**: Balance speed vs accuracy

## Comparison

| Feature | Vectorize | Local Qdrant | Pinecone |
|---------|-----------|--------------|----------|
| **Latency** | 50-200ms | <10ms | 50-100ms |
| **Recall** | 95-99% | 95-99% | 95-99% |
| **Cost** | Free tier | Self-hosted | $70/month |
| **Operations** | Zero | Manual | Managed |
| **Offline** | No | Yes | No |
| **Filtering** | Limited | Rich | Rich |

## Conclusion

Vector database indexing with HNSW provides **100-1000x speedup** over brute force search with minimal accuracy loss. A hybrid approach combining local and cloud indexes offers the best of both worlds: speed, offline capability, and scalability.

**Key Takeaway:** Local HNSW index on desktop connector enables <10ms semantic search with 95%+ recall, making self-improvement responses feel instant.

**Next Steps:**
1. Deploy Qdrant with desktop connector
2. Implement hybrid search strategy
3. Tune HNSW parameters
4. Measure and optimize recall

---

**Sources:**
- HNSW Paper: https://arxiv.org/abs/1603.09320
- FAISS Documentation: https://faiss.ai/
- Qdrant Documentation: https://qdrant.tech/documentation/
- Cloudflare Vectorize: https://developers.cloudflare.com/vectorize/
