# Tiered Memory Architectures for AI Systems

**Research Document:** Multi-Tier Memory Management
**Created:** 2026-01-21
**Applies to:** Makerlog.ai Desktop Connector and Cloud Services

## Overview

Tiered memory architectures organize data across **multiple storage layers** based on access patterns, placing frequently-used ("hot") data in fast memory and rarely-used ("cold") data in slower but cheaper storage. This approach optimizes both **performance** and **cost** for large-scale AI systems.

## Core Concepts

### The Memory Hierarchy

```
Level 1: CPU Cache / GPU Memory
  - Latency: 1-100ns
  - Size: MB to GB
  - Cost per GB: $$$$$
  - Use: Active computations

Level 2: RAM / In-Memory Store
  - Latency: 100-1000ns
  - Size: GB to TB
  - Cost per GB: $$$$
  - Use: Hot data, frequent lookups

Level 3: NVMe SSD / Local Storage
  - Latency: 10-100μs
  - Size: TB to PB
  - Cost per GB: $$
  - Use: Warm data, moderate access

Level 4: Cloud Storage (S3, R2)
  - Latency: 50-200ms
  - Size: Unlimited
  - Cost per GB: $
  - Use: Cold data, archival
```

### Hot/Cold Data Detection

**Hot Data Characteristics:**
- Accessed frequently (>10 times/day)
- Recent access time (last 24 hours)
- Small size (<1MB per item)
- Predictable access patterns

**Cold Data Characteristics:**
- Rarely accessed (<1 time/week)
- Large files (>10MB)
- Accessed unpredictably
- Suitable for archival

### Automatic Tier Migration

```typescript
interface TierMigrationRule {
  // Promote: Cold → Hot
  promoteWhen: (access: AccessStats) => boolean;

  // Demote: Hot → Cold
  demoteWhen: (access: AccessStats) => boolean;

  // Target tier
  targetTier: 'memory' | 'local' | 'cloud';
}

const defaultRules: TierMigrationRule[] = [
  {
    // Keep recent assets in memory
    promoteWhen: access => access.recency < 3600 && access.frequency > 5,
    demoteWhen: access => access.recency > 86400,
    targetTier: 'memory'
  },
  {
    // Move old assets to cloud
    promoteWhen: () => false,
    demoteWhen: access => access.recency > 604800, // 7 days
    targetTier: 'cloud'
  }
];
```

## Tiered Memory Patterns

### Pattern 1: LRU Cache with Write-Through

```
Read Flow:
1. Check L1 (in-memory cache)
2. If miss, check L2 (local SSD)
3. If miss, fetch from L3 (cloud R2)
4. Promote to L1 and L2
5. Evict oldest if full

Write Flow:
1. Write to L1 (immediate)
2. Write to L2 (async, durable)
3. Write to L3 (batched, cost-optimized)
```

### Pattern 2: Multi-Level Lookaside Cache

```typescript
class TieredCache<K, V> {
  private l1: LRUCache<K, V>;      // Memory (1000 items)
  private l2: Map<K, V>;           // Local SSD (100k items)
  private l3: CloudStorage<K, V>;  // R2 (unlimited)

  async get(key: K): Promise<V | null> {
    // L1: Fastest path
    if (this.l1.has(key)) {
      return this.l1.get(key)!;
    }

    // L2: Moderate latency
    if (this.l2.has(key)) {
      const value = this.l2.get(key)!;
      this.l1.set(key, value); // Promote to L1
      return value;
    }

    // L3: Slowest but unlimited
    const value = await this.l3.get(key);
    if (value) {
      this.l2.set(key, value); // Promote to L2
      this.l1.set(key, value); // Promote to L1
    }
    return value;
  }

  async set(key: K, value: V): Promise<void> {
    // Write-through all tiers
    this.l1.set(key, value);
    this.l2.set(key, value);
    await this.l3.put(key, value); // Async, non-blocking
  }
}
```

### Pattern 3: Bloom Filter Accelerator

```typescript
class TieredCacheWithBloom<K, V> {
  private bloom: BloomFilter;  // Memory-efficient membership test
  private l1: LRUCache<K, V>;
  private l2: Map<K, V>;
  private l3: CloudStorage<K, V>;

  async get(key: K): Promise<V | null> {
    // Fast negative check
    if (!this.bloom.mightContain(key)) {
      return null; // Definitely not in any tier
    }

    // Proceed with tiered lookup
    if (this.l1.has(key)) return this.l1.get(key)!;
    if (this.l2.has(key)) {
      const value = this.l2.get(key)!;
      this.l1.set(key, value);
      return value;
    }

    return await this.l3.get(key);
  }
}
```

## Application to Makerlog.ai

### Current Architecture

**Problem:** Everything in Vectorize (no tiering)

```
Current Flow:
User Query → Cloudflare Worker → Vectorize Search → Return Results
- Latency: 100-500ms per query
- Cost: $0.50 per million searches
- No caching of repeated queries
- Cold starts on every request
```

### Proposed Tiered Architecture

```
Tier 1: Browser KV Cache (1 hour TTL)
  - Stores: Recent query results
  - Hit Rate Target: 20-30%
  - Latency: <5ms

Tier 2: Cloudflare KV (24 hour TTL)
  - Stores: User style profiles, popular queries
  - Hit Rate Target: 30-40%
  - Latency: <50ms

Tier 3: D1 Database (Persistent)
  - Stores: User assets, feedback, embeddings
  - Hit Rate Target: 20-30%
  - Latency: <200ms

Tier 4: Vectorize (Semantic Search)
  - Stores: Conversation embeddings
  - Hit Rate Target: 10-20% (fallback)
  - Latency: <500ms
```

### Implementation

#### 1. Multi-Tier Query Cache

```typescript
// workers/api/src/cache/tiered-cache.ts

interface CacheTier {
  name: string;
  get: (key: string) => Promise<any | null>;
  set: (key: string, value: any, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export class TieredQueryCache {
  private tiers: CacheTier[];

  constructor(
    private l1: CacheTier, // KV (1 hour)
    private l2: CacheTier, // D1 query cache (24 hours)
    private l3: CacheTier  // Vectorize (fallback)
  ) {
    this.tiers = [l1, l2, l3];
  }

  async query(
    userId: string,
    queryText: string,
    semantic: (q: string) => Promise<any[]>
  ): Promise<any[]> {
    const cacheKey = this.buildKey(userId, queryText);

    // Try each tier in order
    for (const tier of this.tiers) {
      const result = await tier.get(cacheKey);
      if (result) {
        // Promote to higher tiers
        await this.promoteToHigherTiers(cacheKey, result, tier);
        return result;
      }
    }

    // Cache miss - query Vectorize
    const results = await semantic(queryText);

    // Store in all tiers
    await this.setAllTiers(cacheKey, results);

    return results;
  }

  private async promoteToHigherTiers(
    key: string,
    value: any,
    currentTier: CacheTier
  ): Promise<void> {
    const currentIndex = this.tiers.indexOf(currentTier);

    // Promote to all higher tiers
    for (let i = 0; i < currentIndex; i++) {
      await this.tiers[i].set(key, value, this.getTierTTL(i));
    }
  }

  private async setAllTiers(key: string, value: any): Promise<void> {
    // Set all tiers in parallel (non-blocking)
    await Promise.all(
      this.tiers.map((tier, i) =>
        tier.set(key, value, this.getTierTTL(i))
      )
    );
  }

  private getTierTier(tierIndex: number): number {
    const TTLs = [3600, 86400, 604800]; // 1h, 24h, 7d
    return TTLs[tierIndex];
  }
}
```

#### 2. Hot/Cold Asset Migration

```typescript
// packages/desktop-connector/src/storage/tiered-assets.ts

interface AssetAccessStats {
  assetId: string;
  accessCount: number;
  lastAccessed: number; // Unix timestamp
  sizeBytes: number;
}

export class TieredAssetStore {
  private memoryCache: LRUCache<string, GeneratedAsset>;
  private localStorage: Map<string, GeneratedAsset>;
  private cloudStorage: R2Bucket;

  private accessStats: Map<string, AssetAccessStats> = new Map();

  async getAsset(assetId: string): Promise<GeneratedAsset | null> {
    // Update access stats
    this.recordAccess(assetId);

    // Tier 1: Memory cache
    if (this.memoryCache.has(assetId)) {
      return this.memoryCache.get(assetId)!;
    }

    // Tier 2: Local storage
    if (this.localStorage.has(assetId)) {
      const asset = this.localStorage.get(assetId)!;
      this.memoryCache.set(assetId, asset); // Promote
      return asset;
    }

    // Tier 3: Cloud storage
    const asset = await this.fetchFromCloud(assetId);
    if (asset) {
      this.localStorage.set(assetId, asset); // Promote
      this.memoryCache.set(assetId, asset);   // Promote
    }

    return asset;
  }

  async storeAsset(asset: GeneratedAsset): Promise<void> {
    // Determine initial tier based on size and access pattern
    const tier = this.determineInitialTier(asset);

    switch (tier) {
      case 'memory':
        this.memoryCache.set(asset.id, asset);
        break;
      case 'local':
        this.localStorage.set(asset.id, asset);
        break;
      case 'cloud':
        await this.uploadToCloud(asset);
        break;
    }

    // Initialize access stats
    this.accessStats.set(asset.id, {
      assetId: asset.id,
      accessCount: 0,
      lastAccessed: Date.now(),
      sizeBytes: asset.file_size_bytes || 0
    });
  }

  // Periodic migration: Move cold assets to lower tiers
  async migrateAssets(): Promise<void> {
    const now = Date.now();

    for (const [assetId, stats] of this.accessStats) {
      // Hot → Local: Frequently accessed
      if (stats.accessCount > 10 && stats.lastAccessed > now - 86400) {
        await this.promoteToMemory(assetId);
      }

      // Local → Cloud: Rarely accessed
      if (stats.accessCount < 2 && stats.lastAccessed < now - 604800) {
        await this.demoteToCloud(assetId);
      }
    }
  }

  private determineInitialTier(asset: GeneratedAsset): 'memory' | 'local' | 'cloud' {
    // Recent and small → Memory
    if (asset.file_size_bytes < 1024 * 1024) { // <1MB
      return 'memory';
    }

    // Recent and medium → Local
    if (asset.file_size_bytes < 10 * 1024 * 1024) { // <10MB
      return 'local';
    }

    // Large → Cloud
    return 'cloud';
  }

  private recordAccess(assetId: string): void {
    const stats = this.accessStats.get(assetId);
    if (stats) {
      stats.accessCount++;
      stats.lastAccessed = Date.now();
    }
  }
}
```

#### 3. Style Profile Tiering

```typescript
// workers/api/src/style-profiles/tiered-profiles.ts

export class TieredStyleProfile {
  private l1: KVNamespace;        // Browser cache
  private l2: D1Database;         // User settings
  private l3: VectorizeIndex;     // Example embeddings

  async getProfile(userId: string): Promise<StyleProfile | null> {
    const cacheKey = `profile:${userId}`;

    // Tier 1: KV cache (1 hour)
    const cached = await this.l1.get(cacheKey, 'json');
    if (cached) return cached as StyleProfile;

    // Tier 2: D1 database
    const profile = await this.l2
      .prepare('SELECT * FROM style_profiles WHERE user_id = ?')
      .bind(userId)
      .first();

    if (profile) {
      await this.l1.put(cacheKey, JSON.stringify(profile), {
        expirationTtl: 3600
      });
      return profile as StyleProfile;
    }

    return null;
  }

  async updateProfile(userId: string, feedback: UserFeedback): Promise<void> {
    // Invalidate all caches
    await this.l1.delete(`profile:${userId}`);

    // Update D1
    await this.recomputeProfile(userId);

    // Pre-fetch related examples to Tier 1
    await this.warmupCache(userId);
  }

  private async warmupCache(userId: string): Promise<void> {
    // Fetch recent examples to cache
    const examples = await this.l2
      .prepare(`
        SELECT e.*, a.metadata
        FROM style_profile_examples e
        JOIN generated_assets a ON e.asset_id = a.id
        WHERE e.user_id = ?
        ORDER BY e.created_at DESC
        LIMIT 50
      `)
      .bind(userId)
      .all();

    // Cache in KV for instant access
    await this.l1.put(
      `examples:${userId}`,
      JSON.stringify(examples),
      { expirationTtl: 3600 }
    );
  }
}
```

### Benefits for Makerlog.ai

#### 1. Performance Improvements

| Operation | Current | Tiered | Improvement |
|-----------|---------|--------|-------------|
| **Repeated Query** | 200-500ms | <5ms (cache hit) | **40-100x faster** |
| **Style Profile Lookup** | 100-200ms | <10ms (cached) | **10-20x faster** |
| **Asset Retrieval** | 100-500ms | <20ms (local) | **5-25x faster** |
| **Cold Start** | 500-1000ms | 100-200ms | **2-5x faster** |

#### 2. Cost Reduction

```
Current Costs:
- Vectorize: $0.50 per million queries
- 10k users × 10 queries/day = 100k queries/day
- Monthly: $15

Tiered Costs (30% hit rate):
- Vectorize: 70k queries/day = $10.50
- KV storage: $0.50 per million reads
- Savings: 30% on query costs
```

#### 3. Offline Operation

Desktop Connector with local tier enables:

```typescript
// Offline mode: Use Tier 2 (local) when unavailable
async queryOffline(query: string): Promise<Asset[]> {
  // Skip Tier 1 (cloud) when offline
  const localResults = await this.localStorage.search(query);

  // Fallback to local style profile
  const profile = await this.localProfile.get();

  return this.combineResults(localResults, profile);
}
```

## Implementation Strategy

### Phase 1: Core Tiering (Week 1-2)

1. Implement `TieredQueryCache` with KV + D1
2. Add cache hit/miss metrics
3. A/B test cache hit rates

### Phase 2: Asset Tiering (Week 3-4)

1. Implement `TieredAssetStore` for desktop connector
2. Add hot/cold detection logic
3. Implement periodic migration

### Phase 3: Optimization (Week 5-6)

1. Tune TTL values based on access patterns
2. Add bloom filter for negative caching
3. Implement cache warming strategies

## Monitoring and Metrics

### Key Metrics to Track

```typescript
interface CacheMetrics {
  // Hit rates per tier
  l1HitRate: number;    // Target: >20%
  l2HitRate: number;    // Target: >30%
  l3HitRate: number;    // Target: >20%

  // Latency per tier
  l1Latency: number;    // Target: <5ms
  l2Latency: number;    // Target: <50ms
  l3Latency: number;    // Target: <200ms

  // Promotion/demotion rates
  promotionRate: number; // Assets promoted per day
  demotionRate: number;  // Assets demoted per day

  // Cost savings
  costSavings: number;   // Dollars saved per month
}
```

### Alert Thresholds

- **L1 hit rate < 15%**: Increase cache size or TTL
- **L3 hit rate > 30%**: Cache not effective, review strategy
- **Promotion rate spike**: Access pattern changed, retune rules
- **Cache eviction rate > 50%**: Cache too small, increase size

## Trade-offs and Considerations

### Advantages

✅ **Dramatic latency improvements** for repeated queries
✅ **Reduced cloud costs** via caching
✅ **Offline operation** capability
✅ **Automatic optimization** based on access patterns
✅ **Scalable** to millions of queries

### Disadvantages

❌ **Complexity** in managing multiple tiers
❌ **Consistency challenges** (cache invalidation)
❌ **Memory overhead** for caching
❌ **Tuning required** for optimal performance
❌ **Stale data risk** if cache invalidation fails

### Recommendations

1. **Start simple**: 2-tier system (KV + D1)
2. **Measure everything**: Hit rates, latency, costs
3. **Tune iteratively**: Adjust TTLs based on metrics
4. **Monitor consistency**: Implement cache invalidation
5. **Plan for scale**: Design for 3+ tiers from start

## Comparison with Alternatives

| Feature | Single Tier | 2-Tier | 3-Tier (Proposed) |
|---------|-------------|--------|-------------------|
| **Latency (cached)** | N/A | <50ms | <5ms |
| **Latency (miss)** | 200-500ms | 200-500ms | 200-500ms |
| **Hit Rate** | 0% | 30-40% | 50-70% |
| **Complexity** | Low | Medium | High |
| **Cost** | High | Medium | Low |

## Conclusion

Tiered memory architectures provide **substantial performance and cost improvements** for Makerlog.ai by leveraging hot/cold data separation and multi-level caching.

**Key Takeaway:** A 3-tier system (KV → D1 → Vectorize) can achieve 50-70% cache hit rates, reducing latency by 10-100x for cached queries while lowering costs by 30%.

**Next Steps:**
1. Implement 2-tier cache (KV + D1)
2. Measure hit rates and latency
3. Add third tier if needed
4. Optimize TTLs and migration rules

---

**Sources:**
- Multi-Tier Caching: https://www.arangodb.com/docs/stable/foxx-guide-caching.html
- Cloudflare KV Caching: https://developers.cloudflare.com/kv/
- LRU Cache Implementation: https://github.com/isaacs/node-lru-cache
