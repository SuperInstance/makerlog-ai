# Self-Improvement System

**Version:** 1.0
**Status:** Core Architecture
**Last Updated:** 2026-01-21

---

## Overview

The Self-Improvement System transforms Makerlog.ai from a static generator into an adaptive assistant that learns your preferences over time. Every piece of feedback—star ratings, approvals, rejections—makes the system better at generating what you actually want.

---

## The Learning Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FEEDBACK LOOP                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────┐│
│  │ Generate │───►│  Review  │───►│  Learn   │───►│  Apply   │───►│Better││
│  │          │    │          │    │          │    │          │    │Gen   ││
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────┘│
│       ▲                                                            │       │
│       └────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Each Iteration

1. **Generate**: Create asset with enhanced prompt
2. **Review**: User rates 1-5 stars + disposition
3. **Learn**: Update style profile with feedback
4. **Apply**: Next generation uses improved profile

---

## Style Profile

The style profile is a compact representation of user preferences stored in the database and synced across devices.

### Structure

```typescript
interface StyleProfile {
  userId: string;

  // Learned examples
  positiveExamples: number[][];    // Embeddings of 4-5 star assets
  negativeExamples: number[][];    // Embeddings of 1-2 star assets

  // Computed preference direction
  preferenceVector: number[];      // 512-dimensional vector
  promptModifiers: string[];       // Learned additions to prompts

  // Metadata
  updatedAt: number;
}
```

### How It Works

**Preference Vector**: A 512-dimensional vector that points in the "direction" of assets the user likes.

- Start at zero vector
- When user likes an asset: move vector TOWARD its embedding
- When user dislikes an asset: move vector AWAY from its embedding
- Gradually converges on user's taste

**Prompt Modifiers**: Tags and phrases automatically added to prompts.

- User consistently tags assets "minimalist" → add "minimalist" to future prompts
- User rates blue-toned images highly → add "blue tones, cool colors"
- User rejects busy compositions → add "clean composition, minimal elements"

---

## User Feedback

### Feedback Types

**Star Rating** (1-5)
- 5 stars: Strong positive → large step toward embedding
- 4 stars: Positive → medium step toward embedding
- 3 stars: Neutral → no update
- 2 stars: Negative → medium step away from embedding
- 1 star: Strong negative → large step away from embedding

**Disposition** (What happens to the asset)
- `project`: Save to current project folder
- `library`: Save to library for future projects
- `prune`: Mark for deletion (but learn from it first)

**Tags** (Optional user-added labels)
- User can add custom tags: "minimalist", "retro", "isometric"
- Tags that appear on high-rated assets become prompt modifiers

**Refinements** (Natural language adjustments)
- "more blue", "less busy", "darker mood"
- Parsed and applied to next generation

### Feedback Flow

```
User views asset
    │
    ├─► Rating (1-5)
    │
    ├─► Disposition (project/library/prune)
    │
    ├─► Optional tags
    │
    └─► Optional refinements
           │
           ▼
    Update style profile
           │
           ├─► Compute asset embedding
           │
           ├─► Update preference vector
           │
           ├─► Extract prompt modifiers
           │
           └─► Save profile (local + cloud)
```

---

## Learning Algorithm

### Preference Vector Update

```typescript
function updatePreferenceVector(
  currentVector: number[],
  assetEmbedding: number[],
  rating: number,
  feedbackWeight: number = 0.3
): number[] {

  // Normalize rating to [-1, 1]
  const normalizedRating = (rating - 3) / 2;
  // 5 stars → +1, 4 stars → +0.5, 3 stars → 0, 2 stars → -0.5, 1 star → -1

  // Move preference vector toward/away from asset embedding
  return currentVector.map((v, i) =>
    v + feedbackWeight * normalizedRating * (assetEmbedding[i] - v)
  );
}
```

**Example:**
- Current preference vector: `[0.1, 0.2, -0.1, ...]`
- Asset embedding: `[0.8, 0.7, 0.3, ...]`
- User rating: 5 stars → +1
- Feedback weight: 0.3

New vector moves toward the liked asset.

### Prompt Modifier Extraction

```typescript
function extractPromptModifiers(
  highRatedAssets: GeneratedAsset[],
  minFrequency: number = 3
): string[] {

  // Count tag frequency across high-rated assets
  const tagCounts = new Map<string, number>();

  for (const asset of highRatedAssets) {
    if (asset.feedback && asset.feedback.rating >= 4) {
      for (const tag of asset.feedback.tags || []) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
  }

  // Return tags that appear frequently
  return [...tagCounts.entries()]
    .filter(([_, count]) => count >= minFrequency)
    .map(([tag, _]) => tag);
}
```

### Sliding Window

Keep only recent examples to avoid staleness:

```typescript
const MAX_EXAMPLES = 100;

if (positiveExamples.length > MAX_EXAMPLES) {
  positiveExamples = positiveExamples.slice(-MAX_EXAMPLES);
}
if (negativeExamples.length > MAX_EXAMPLES) {
  negativeExamples = negativeExamples.slice(-MAX_EXAMPLES);
}
```

---

## Applying the Style Profile

### Prompt Enhancement

```typescript
function applyStyleProfile(
  basePrompt: string,
  taskType: string,
  profile: StyleProfile
): string {

  if (!profile || taskType !== 'image-gen') {
    return basePrompt;
  }

  // Add learned prompt modifiers
  const modifiers = profile.promptModifiers.slice(0, 3);
  return `${basePrompt}, ${modifiers.join(', ')}`;
}
```

**Example:**
- Base prompt: "a futuristic cityscape"
- Profile modifiers: ["minimalist", "blue tones", "clean composition"]
- Enhanced prompt: "a futuristic cityscape, minimalist, blue tones, clean composition"

### Asset Ranking (Future)

When displaying generated assets to users, rank by similarity to preference vector:

```typescript
function rankAssetsByPreference(
  assets: GeneratedAsset[],
  preferenceVector: number[]
): GeneratedAsset[] {

  return assets.sort((a, b) => {
    const similarityA = cosineSimilarity(a.embedding, preferenceVector);
    const similarityB = cosineSimilarity(b.embedding, preferenceVector);
    return similarityB - similarityA;
  });
}
```

This shows the user assets they're most likely to want first.

---

## Storage & Sync

### Database Schema

```sql
CREATE TABLE style_profiles (
  user_id TEXT PRIMARY KEY,
  preference_vector TEXT NOT NULL,        -- JSON-encoded array
  prompt_modifiers TEXT NOT NULL,         -- JSON-encoded array
  positive_example_count INTEGER DEFAULT 0,
  negative_example_count INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE style_profile_examples (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  example_type TEXT NOT NULL,             -- 'positive' or 'negative'
  embedding TEXT NOT NULL,                -- JSON-encoded array
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES style_profiles(user_id),
  FOREIGN KEY (asset_id) REFERENCES generated_assets(id)
);

CREATE INDEX idx_style_examples_user_type ON style_profile_examples(user_id, example_type);
```

### Sync Strategy

**Desktop → Cloud**
- Batch upload every 10 minutes
- Upload immediately on overnight mode exit
- Upload on user request

**Cloud → Desktop**
- Poll for updates every 5 minutes
- Download on connector start
- Merge local and remote profiles (average vectors)

**Conflict Resolution**
```typescript
function mergeStyleProfiles(
  local: StyleProfile,
  remote: StyleProfile
): StyleProfile {

  return {
    ...local,
    preferenceVector: local.preferenceVector.map((v, i) =>
      (v + (remote.preferenceVector[i] || 0)) / 2
    ),
    promptModifiers: [
      ...new Set([...local.promptModifiers, ...remote.promptModifiers])
    ],
    updatedAt: Date.now()
  };
}
```

---

## Privacy & Security

### Data Minimization

- Only store embeddings, not raw asset content
- No voice recordings in style profile
- Aggregate metrics only

### User Control

```typescript
// User can view their style profile
GET /api/style-profile

// User can reset their profile
DELETE /api/style-profile

// User can export their data
GET /api/style-profile/export

// User can opt out of learning
PUT /api/user/preferences { learningEnabled: false }
```

### Differential Privacy (Future)

Add noise to preference vector before storage:

```typescript
function addDifferentialPrivacy(
  vector: number[],
  epsilon: number = 1.0
): number[] {

  const sigma = Math.sqrt(2) / epsilon;
  return vector.map(v => v + gaussianNoise(0, sigma));
}
```

---

## Advanced Features

### Style Clusters

Group similar style profiles to discover "taste communities":

```typescript
async function discoverStyleClusters(
  profiles: StyleProfile[]
): Promise<StyleCluster[]> {

  // Use K-means or hierarchical clustering
  // Users in same cluster have similar tastes
  // Can be used for recommendations
}
```

### Cross-User Learning (Opt-in)

Allow users to benefit from similar users' profiles:

```typescript
function getCollaborativeRecommendations(
  user: User,
  similarUsers: User[]
): PromptModifier[] {

  // Average prompt modifiers from similar users
  // Suggest as "people like you also use..."
}
```

### Temporal Adaptation

Detect and adapt to changing tastes:

```typescript
function detectTasteDrift(
  profile: StyleProfile,
  windowSize: number = 20
): boolean {

  // Compare recent examples to older examples
  // If drift detected, suggest resetting profile
  // or adjusting learning rate
}
```

---

## Evaluation Metrics

### Learning Quality

- **Convergence Rate**: How fast does preference vector stabilize?
- **Prediction Accuracy**: Do high-ranked assets get high ratings?
- **User Satisfaction**: Are users happy with generations over time?

### Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Acceptance Rate | > 70% | (4-5 star) / total ratings |
| Improvement Rate | > 5%/week | Reduction in 1-2 star ratings |
| Profile Stability | < 10% change/week | Vector movement after convergence |

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Create style profile database schema
- [ ] Implement embedding computation (CLIP/Nomic)
- [ ] Build preference vector update algorithm
- [ ] Create feedback API endpoints

### Phase 2: Desktop Integration (Week 3-4)
- [ ] Implement prompt modifier extraction
- [ ] Add style profile to desktop connector
- [ ] Build profile sync (cloud ↔ desktop)
- [ ] Add profile CLI commands

### Phase 3: Frontend (Week 5-6)
- [ ] Build feedback UI (star rating, disposition)
- [ ] Add tag input interface
- [ ] Show "Why this was recommended"
- [ ] Profile visualization dashboard

### Phase 4: Advanced (Week 7-8)
- [ ] Style clustering
- [ ] Collaborative filtering
- [ ] Temporal adaptation detection
- [ ] Privacy controls

---

## Example Workflow

### First Time User

1. User generates 10 images of "futuristic cities"
2. Rates 7 of them 4-5 stars (minimalist, blue tones)
3. Rates 3 of them 1-2 stars (busy, orange tones)
4. Style profile learns:
   - Preference vector: points toward minimalist blue
   - Prompt modifiers: ["minimalist", "blue tones", "clean"]
5. Next generation: "a futuristic cityscape, minimalist, blue tones, clean"

### Experienced User (100+ ratings)

1. Profile has converged on user's taste
2. 80% of generations rated 4-5 stars
3. System can predict user preferences
4. Generations feel "personalized"

### Taste Drift

1. User starts new project with different aesthetic
2. First few generations get low ratings
3. System detects drift (recent vs. older examples)
4. Suggests: "Your tastes seem to be changing. Reset profile?"
5. User confirms → fresh learning cycle

---

## Research Directions

- **Multi-modal embeddings**: Combine image + text + code embeddings
- **Active learning**: System asks user to rate ambiguous assets
- **Explainable AI**: "I added 'minimalist' because you've used it 15 times"
- **Transfer learning**: Pre-train on similar users, fine-tune on individual
- **Continual learning**: Adapt without catastrophic forgetting

---

## References

- Style Transfer research (Gatys et al.)
- CLIP (Radford et al.)
- Recommender Systems (Netflix Prize)
- Bandit Algorithms (UCB, Thompson Sampling)
- Differential Privacy (Dwork et al.)
