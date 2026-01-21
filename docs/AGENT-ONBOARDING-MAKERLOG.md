# Makerlog.ai Implementation Agent Guide

**For:** Implementation Agents working on Makerlog.ai features
**Platform:** Makerlog.ai (Adults 18+, Voice-First)
**Version:** 1.0
**Date:** January 21, 2026

---

## Platform Overview

**Makerlog.ai** is a voice-first development assistant that gamifies Cloudflare free tier quota harvesting.

**Target User:** Adult developers (18+) who want to:
- Capture ideas while mobile (walking, commuting, cooking)
- Automate generative tasks that run overnight
- Maximize their Cloudflare free tier quota (10,000 neurons/day)
- Build a searchable knowledge base of voice conversations

**Core Value Proposition:**
> "Talk through your day, harvest overnight."

**Key Philosophy:**
- **Voice-first design** - Text for review, voice for capture
- **Mobile capture, desktop review** - 90% audio-first workflow
- **Autonomous execution** - System detects opportunities, queues tasks, harvests overnight
- **Developer gamification** - XP, levels, streaks, achievements (not childish rewards)

---

## Voice-First Architecture

### Recording Flow

```typescript
// src/hooks/useVoiceRecorder.ts
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [segmentCount, setSegmentCount] = useState(0);

  const startRecording = async () => {
    // Request wake lock (prevent screen sleep)
    await requestWakeLock();

    // Get stream with optimal settings for voice
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
      },
    });

    // Create MediaRecorder with VAD support
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: getOptimalMimeType(),
      audioBitsPerSecond: 24000,
    });

    // Progressive upload: Collect small chunks, upload immediately
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);

        // Progressive upload: Send every 5 seconds
        if (chunks.length >= 5) {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          await uploadSegment(blob, segmentCount);
          chunks.length = 0; // Clear chunks
          setSegmentCount(prev => prev + 1);
        }
      }
    };

    mediaRecorder.start(1000); // Collect data every second
    setIsRecording(true);
  };

  const stopRecording = async () => {
    mediaRecorder.stop();

    // Upload final segment
    const finalBlob = new Blob(chunks, { type: 'audio/webm' });
    await uploadSegment(finalBlob, segmentCount + 1);

    // Release wake lock
    releaseWakeLock();

    setIsRecording(false);
  };

  return { isRecording, startRecording, stopRecording };
}
```

### Push-to-Talk UI

```typescript
// src/components/VoiceChat.tsx
export function VoiceChat() {
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
  const [duration, setDuration] = useState(0);

  // 96×96px button (exceeds WCAG AAA minimum of 44×44px)
  return (
    <div className="voice-chat">
      <div className="recording-status">
        {isRecording && (
          <>
            <div className="pulse-animation" />
            <span className="duration">{formatDuration(duration)}</span>
          </>
        )}
      </div>

      {/* Push-to-talk button */}
      <button
        className={`
          ptt-button
          ${isRecording ? 'recording' : ''}
        `}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        aria-label="Hold to talk"
      >
        {isRecording ? '🎙️' : '🎤'}
      </button>

      {/* Visual feedback */}
      {isRecording && (
        <div className="audio-visualizer">
          <WaveformAnalyzer stream={mediaStream} />
        </div>
      )}
    </div>
  );
}
```

### VAD-Based Segmentation

```typescript
// workers/api/src/services/voice.ts
export async function transcribeWithVAD(
  env: Env,
  audioUrl: string
): Promise<TranscriptionResult> {

  // Download audio
  const audioResponse = await fetch(audioUrl);
  const audioBlob = await audioResponse.blob();

  // Use WebRTC VAD for segmentation (via browser)
  // Or: Use duration-based segmentation for MVP

  // For MVP: Split on silence
  const segments = await splitOnSilence(audioBlob, {
    minSilenceDuration: 1000,  // 1 second silence = new segment
    minSegmentDuration: 3000,  // Minimum 3 seconds per segment
  });

  // Transcribe each segment
  const transcriptions = await Promise.all(
    segments.map(async (segment) => {
      const result = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
        audio: [...new Uint8Array(await segment.arrayBuffer())],
      });

      return {
        text: result.text,
        start: segment.startTime,
        end: segment.endTime,
      };
    })
  );

  // Merge segments
  const fullText = transcriptions.map(t => t.text).join(' ');

  return {
    text: fullText,
    segments: transcriptions,
    wordTimestamps: extractWordTimestamps(transcriptions),
  };
}
```

---

## Opportunity Detection

### Detection Categories

```typescript
// workers/api/src/services/opportunities.ts
export const OPPORTUNITY_TYPES = {
  CODE_GENERATION: {
    name: 'Code Generation',
    patterns: [
      /generate\s+(a\s+)?(function|component|class|module)/i,
      /write\s+(some\s+)?code\s+to/i,
      /create\s+(a\s+)?(react|vue|angular)\s+component/i,
      /implement\s+(a\s+)?(.+?)\s+function/i,
    ],
    confidence: 0.8,
    estimatedCost: 15, // neurons
  },

  IMAGE_GENERATION: {
    name: 'Image Generation',
    patterns: [
      /generate\s+(an?\s+)?image/i,
      /create\s+(a\s+)?(picture|photo|graphic|illustration)/i,
      /make\s+(an?\s+)?(icon|logo|mockup)/i,
      /design\s+(a\s+)?(banner|thumbnail|cover)/i,
    ],
    confidence: 0.85,
    estimatedCost: 25,
  },

  DOCUMENTATION: {
    name: 'Documentation',
    patterns: [
      /write\s+(some\s+)?docs?\s+for/i,
      /document\s+(the\s+)?(.+?)\s+(function|feature|api)/i,
      /create\s+(a\s+)?readme/i,
      /explain\s+how\s+(the\s+)?(.+?)\s+works/i,
    ],
    confidence: 0.75,
    estimatedCost: 10,
  },

  REFINEMENT: {
    name: 'Refinement',
    patterns: [
      /improve\s+(this\s+)?code/i,
      /refactor\s+(the\s+)?(.+?)\s+function/i,
      /optimize\s+(the\s+)?(.+?)\s+(performance|speed)/i,
      /fix\s+(the\s+)?bugs?\s+in/i,
    ],
    confidence: 0.7,
    estimatedCost: 20,
  },
};
```

### Detection Pipeline

```typescript
export async function detectOpportunities(
  env: Env,
  conversationId: string
): Promise<Opportunity[]> {

  // Get recent messages
  const messages = await getRecentMessages(env, conversationId, 10);

  // Analyze with AI for pattern matching
  const prompt = `
Analyze this conversation for opportunities to generate:
- Code snippets or functions
- Images, icons, or graphics
- Documentation or explanations
- Code improvements or refactoring

Return JSON array:
[{
  "type": "code|image|docs|refine",
  "prompt": "detailed prompt for generation",
  "confidence": 0.0-1.0,
  "reasoning": "why this is an opportunity"
}]

Conversation:
${JSON.stringify(messages)}
`;

  const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  let opportunities: Opportunity[];
  try {
    opportunities = JSON.parse(result.response);
  } catch {
    // Fallback: pattern-based detection
    opportunities = detectByPatterns(messages);
  }

  // Filter by confidence threshold (70%)
  const highConfidence = opportunities.filter(o => o.confidence > 0.7);

  // Deduplicate by type and similarity
  const deduplicated = deduplicateOpportunities(highConfidence);

  // Queue high-confidence opportunities
  for (const opp of deduplicated) {
    await queueOpportunity(env, {
      ...opp,
      conversationId,
      userId: messages[0].userId,
      status: 'pending',
      createdAt: Date.now(),
    });
  }

  return deduplicated;
}
```

### Opportunity Queue

```typescript
export async function queueOpportunity(
  env: Env,
  opportunity: Opportunity
): Promise<string> {

  // Check if similar opportunity already exists
  const existing = await env.DB.prepare(`
    SELECT id FROM opportunities
    WHERE user_id = ?
      AND type = ?
      AND similarity(prompt, ?) > 0.8
      AND status != 'rejected'
  `).bind(
    opportunity.userId,
    opportunity.type,
    opportunity.prompt
  ).first();

  if (existing) {
    return existing.id; // Don't duplicate
  }

  // Create opportunity
  const opportunityId = generateId();
  await env.DB.prepare(`
    INSERT INTO opportunities (
      id, user_id, conversation_id, type, prompt,
      confidence, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `).bind(
    opportunityId,
    opportunity.userId,
    opportunity.conversationId,
    opportunity.type,
    opportunity.prompt,
    opportunity.confidence,
    Date.now()
  ).run();

  return opportunityId;
}
```

---

## Harvest Scheduling

### Quota Management

```typescript
// workers/api/src/services/quota.ts
export async function getQuotaStatus(env: Env, userId: string): Promise<QuotaStatus> {
  const today = new Date().toISOString().split('T')[0];

  // Get neuron usage from AI Gateway
  const usage = await env.AI_GATEWAY.getMetrics(userId, today);

  // Get quota limit from Cloudflare
  const limit = 10000; // Free tier daily limit

  // Get executed task count
  const tasks = await env.DB.prepare(`
    SELECT COUNT(*) as count, SUM(estimated_cost) as cost
    FROM tasks
    WHERE user_id = ?
      AND DATE(executed_at / 1000, 'unixepoch') = ?
      AND status = 'completed'
  `).bind(userId, today).first();

  return {
    userId,
    date: today,
    used: usage.totalNeurons || 0,
    limit,
    tasksCompleted: tasks.count || 0,
    tasksCost: tasks.cost || 0,
    remaining: limit - (usage.totalNeurons || 0),
    percentage: ((usage.totalNeurons || 0) / limit) * 100,
  };
}
```

### Auto-Harvest Trigger

```typescript
// workers/api/src/services/harvest.ts
export async function executeHarvest(env: Env, userId: string): Promise<HarvestResult> {
  const quota = await getQuotaStatus(env, userId);

  // Don't harvest if quota almost full
  if (quota.percentage > 90) {
    throw new Error('Quota almost full - cannot harvest');
  }

  // Get pending opportunities
  const opportunities = await env.DB.prepare(`
    SELECT * FROM opportunities
    WHERE user_id = ? AND status = 'pending'
    ORDER BY confidence DESC, created_at ASC
  `).bind(userId).all();

  const results = [];
  let neuronsUsed = 0;

  for (const opp of opportunities.results) {
    // Estimate cost
    const cost = estimateTaskCost(opp.type);

    // Check if we have quota
    if (neuronsUsed + cost > (quota.limit * 0.9)) {
      break; // Don't exceed 90% of quota
    }

    try {
      // Execute task
      const result = await executeTask(env, opp);

      // Update opportunity
      await env.DB.prepare(`
        UPDATE opportunities
        SET status = 'completed', result = ?, executed_at = ?
        WHERE id = ?
      `).bind(JSON.stringify(result), Date.now(), opp.id).run();

      results.push({ opportunityId: opp.id, success: true, result });
      neuronsUsed += cost;

      // Award XP
      await awardXP(env, userId, 50); // 50 XP per task

    } catch (error) {
      console.error(`Task ${opp.id} failed:`, error);

      await env.DB.prepare(`
        UPDATE opportunities
        SET status = 'failed', error = ?
        WHERE id = ?
      `).bind(error.message, opp.id).run();

      results.push({ opportunityId: opp.id, success: false, error: error.message });
    }
  }

  // Check for perfect harvest
  const finalQuota = await getQuotaStatus(env, userId);
  if (finalQuota.percentage > 95 && finalQuota.percentage < 100) {
    await unlockAchievement(env, userId, 'perfect_day');
  }

  return {
    tasksExecuted: results.length,
    neuronsUsed,
    quotaRemaining: finalQuota.remaining,
    results,
  };
}
```

### Midnight Cron Trigger

```typescript
// workers/api/src/routes/cron.ts
export const harvestCron = async (c: Context) => {
  const env = c.env;

  // Get all users with pending opportunities
  const users = await env.DB.prepare(`
    SELECT DISTINCT user_id FROM opportunities
    WHERE status = 'pending'
  `).all();

  // Execute harvest for each user
  const results = await Promise.allSettled(
    users.results.map(({ user_id }) => executeHarvest(env, user_id))
  );

  // Log results
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  await logHarvestResults(env, {
    timestamp: Date.now(),
    usersProcessed: users.results.length,
    successful,
    failed,
  });

  return c.json({ ok: true });
};
```

---

## Markdown Memory System

### Daily Log Format

```typescript
export interface DailyLog {
  date: string;           // YYYY-MM-DD
  entries: LogEntry[];
  summary?: string;       // AI-generated
  tags: string[];         // Auto-extracted
}

export interface LogEntry {
  timestamp: number;
  type: 'voice' | 'image' | 'screenshot' | 'note';
  content: string;
  attachments?: Attachment[];
}
```

### Creating a Daily Log

```typescript
// src/components/DailyLog.tsx
export function DailyLog({ date, entries }: Props) {
  return (
    <div className="daily-log">
      <header>
        <h2>{formatDate(date)}</h2>
        <div className="stats">
          <span>{entries.length} entries</span>
          <span>{entries.filter(e => e.type === 'voice').length} voice notes</span>
        </div>
      </header>

      <div className="timeline">
        {entries.map(entry => (
          <LogEntry key={entry.timestamp} entry={entry} />
        ))}
      </div>

      {/* AI-generated summary */}
      {entries.length >= 5 && (
        <DailySummary date={date} entries={entries} />
      )}
    </div>
  );
}

function LogEntry({ entry }: Props) {
  return (
    <div className={`log-entry type-${entry.type}`}>
      <time>{formatTime(entry.timestamp)}</time>

      {entry.type === 'voice' && (
        <div className="voice-entry">
          <button className="play-button" aria-label="Play recording">
            ▶️
          </button>
          <TranscriptionText content={entry.content} />
        </div>
      )}

      {entry.type === 'screenshot' && (
        <div className="screenshot-entry">
          <img src={entry.content} alt="Screenshot" loading="lazy" />
          <TimestampDisplay time={entry.timestamp} />
        </div>
      )}

      {entry.attachments && (
        <div className="attachments">
          {entry.attachments.map(att => (
            <Attachment key={att.url} attachment={att} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Semantic Search

```typescript
export async function searchMemory(
  env: Env,
  userId: string,
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {

  // Create query embedding
  const queryEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: query,
  });

  // Search Vectorize
  const matches = await env.VECTORIZE.query(queryEmbedding, {
    topK: 20,
    namespace: userId,
    filter: buildVectorFilter(filters),
  });

  // Fetch full records
  const results = await Promise.all(
    matches.map(async (match) => {
      const record = await env.DB.prepare(`
        SELECT * FROM messages WHERE id = ?
      `).bind(match.id).first();

      return {
        ...record,
        score: match.score,
        highlighted: highlightMatch(record.content, query),
      };
    })
  );

  return results;
}
```

---

## Gamification System

### XP and Leveling

```typescript
// workers/api/src/services/gamification.ts
export const XP_VALUES = {
  TASK_COMPLETED: 50,
  PERFECT_HARVEST: 500,
  STREAK_DAY: 100,
  OPPORTUNITY_ACCEPTED: 25,
  FIRST_HARVEST: 100,
};

export function calculateLevel(xp: number): number {
  // level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpForNextLevel(currentLevel: number): number {
  // Reverse: XP = (level - 1)^2 * 100
  return Math.pow(currentLevel, 2) * 100;
}

export async function awardXP(
  env: Env,
  userId: string,
  amount: number,
  reason: string
): Promise<void> {

  // Get current XP
  const user = await getUser(env, userId);
  const oldLevel = calculateLevel(user.xp);
  const newXP = user.xp + amount;
  const newLevel = calculateLevel(newXP);

  // Update XP
  await env.DB.prepare(`
    UPDATE users SET xp = ? WHERE id = ?
  `).bind(newXP, userId).run();

  // Check for level up
  if (newLevel > oldLevel) {
    await unlockAchievement(env, userId, `level_${newLevel}`);
    await sendNotification(env, {
      userId,
      title: `🎉 Level ${newLevel}!`,
      body: `You've reached level ${newLevel}!`,
    });
  }

  // Log XP award
  await env.DB.prepare(`
    INSERT INTO xp_history (user_id, amount, reason, awarded_at)
    VALUES (?, ?, ?, ?)
  `).bind(userId, amount, reason, Date.now()).run();
}
```

### Streak Tracking

```typescript
export async function updateStreak(env: Env, userId: string): Promise<StreakStatus> {
  const user = await getUser(env, userId);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Check if user harvested today
  const harvestedToday = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM tasks
    WHERE user_id = ? AND DATE(executed_at / 1000, 'unixepoch') = ?
  `).bind(userId, today).first();

  if (harvestedToday.count === 0) {
    return user.streak; // No change
  }

  // Check if harvested yesterday
  const harvestedYesterday = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM tasks
    WHERE user_id = ? AND DATE(executed_at / 1000, 'unixepoch') = ?
  `).bind(userId, yesterday).first();

  let newStreak = user.streak || 0;

  if (harvestedYesterday.count > 0) {
    // Continue streak
    newStreak += 1;

    // Check for milestone streaks
    if (newStreak === 7) {
      await unlockAchievement(env, userId, 'streak_7');
    } else if (newStreak === 30) {
      await unlockAchievement(env, userId, 'streak_30');
    }
  } else {
    // Start new streak
    newStreak = 1;
  }

  await env.DB.prepare(`
    UPDATE users SET streak = ? WHERE id = ?
  `).bind(newStreak, userId).run();

  return {
    current: newStreak,
    lastHarvest: today,
    hasGraceDay: user.graceDayAvailable,
  };
}
```

---

## UI Guidelines for Makerlog

### Dark Theme Aesthetic

```css
/* src/styles/makerlog.css */
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #2a2a2a;
  --text-primary: #e5e5e5;
  --text-secondary: #a0a0a0;
  --accent: #00ff9d;       /* Matrix green */
  --accent-dim: #00cc7d;
  --border: #333333;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'JetBrains Mono', 'SF Mono', monospace; /* Code aesthetic */
}
```

### Minimal, Efficient UI

```typescript
// src/components/Dashboard.tsx
export function Dashboard() {
  const quota = useQuota();
  const opportunities = useOpportunities();

  return (
    <div className="dashboard">
      {/* Quota meter - prominent but minimal */}
      <div className="quota-meter">
        <div className="bar">
          <div
            className="fill"
            style={{ width: `${quota.percentage}%` }}
          />
        </div>
        <div className="labels">
          <span>{quota.used.toLocaleString()} / {quota.limit.toLocaleString()} neurons</span>
          <span className={quota.percentage > 80 ? 'warning' : ''}>
            {quota.remaining.toLocaleString()} remaining
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="quick-stats">
        <Stat label="Level" value={quota.level} />
        <Stat label="Streak" value={`${quota.streak}🔥`} />
        <Stat label="Today" value={quota.tasksCompleted} />
      </div>

      {/* Opportunities queue - swipeable */}
      <div className="opportunities">
        <h3>Review Opportunities ({opportunities.length})</h3>
        <SwipeableList>
          {opportunities.map(opp => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </SwipeableList>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <Button icon="🎤" label="Record" primary />
        <Button icon="📊" label="Stats" />
        <Button icon="🔍" label="Search" />
      </div>
    </div>
  );
}
```

### Opportunity Review Interface

```typescript
// src/components/OpportunityCard.tsx
export function OpportunityCard({ opportunity }: Props) {
  const [loading, setLoading] = useState(false);

  const handleQueue = async () => {
    setLoading(true);
    await queueForExecution(opportunity.id);
    setLoading(false);
  };

  const handleReject = async () => {
    await rejectOpportunity(opportunity.id);
  };

  const handleRefine = async () => {
    // Open prompt editor
    setShowEditor(true);
  };

  return (
    <div className="opportunity-card">
      <div className="card-header">
        <span className={`type type-${opportunity.type}`}>
          {opportunity.type}
        </span>
        <span className="confidence">
          {Math.round(opportunity.confidence * 100)}%
        </span>
      </div>

      <div className="prompt-preview">
        {opportunity.prompt}
      </div>

      <div className="meta">
        <span>~{estimateCost(opportunity.type)} neurons</span>
        <span>{timeAgo(opportunity.createdAt)}</span>
      </div>

      <div className="actions">
        <Button
          icon="✅"
          label="Queue"
          onClick={handleQueue}
          disabled={loading}
          primary
        />
        <Button
          icon="✏️"
          label="Edit"
          onClick={handleRefine}
        />
        <Button
          icon="❌"
          label="Skip"
          onClick={handleReject}
          variant="ghost"
        />
      </div>
    </div>
  );
}
```

---

## Screenshot Integration

### Timeline Sync

```typescript
// src/hooks/useScreenshotSync.ts
export function useScreenshotSync(conversationId: string) {
  useEffect(() => {
    // Listen for screenshot events (desktop connector or manual upload)
    const handler = async (event: MessageEvent) => {
      if (event.data.type === 'screenshot') {
        const { image, timestamp } = event.data;

        // Upload to R2
        const url = await uploadScreenshot(image);

        // Link to conversation at nearest voice entry
        const nearestEntry = await findNearestVoiceEntry(conversationId, timestamp);

        await env.DB.prepare(`
          INSERT INTO screenshots (conversation_id, url, timestamp, nearest_message_id)
          VALUES (?, ?, ?, ?)
        `).bind(conversationId, url, timestamp, nearestEntry.id).run();

        // Trigger refresh
        queryClient.invalidateQueries(['conversation', conversationId]);
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [conversationId]);
}
```

---

## All 9 AI Models

### Voice Command Patterns

```typescript
// workers/api/src/services/voice-commands.ts
export const VOICE_COMMANDS = {
  // Text-to-Text
  CHAT: {
    patterns: [/ask\s+(.+)/i, /tell\s+me\s+about\s+(.+)/i],
    model: '@cf/meta/llama-3.1-8b-instruct',
    maxTokens: 1000,
  },

  TRANSLATE: {
    patterns: [/translate\s+(.+)\s+to\s+(.+)/i],
    model: '@cf/meta/llama-3.1-8b-instruct',
    systemPrompt: 'You are a translator. Translate only, no explanations.',
  },

  SUMMARIZE: {
    patterns: [/summarize\s+(.+)/i],
    model: '@cf/meta/llama-3.1-8b-instruct',
    systemPrompt: 'Provide a concise summary in 3-4 bullet points.',
  },

  // Text-to-Image
  GENERATE_IMAGE: {
    patterns: [/generate\s+(an?\s+)?image\s+of\s+(.+)/i],
    model: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    parameters: {
      num_steps: 30,
      guidance_scale: 7.5,
    },
  },

  // Image-to-Text
  DESCRIBE_IMAGE: {
    patterns: [/describe\s+(this\s+)?image/i, /what\s+is\s+(this|that)/i],
    model: '@cf/microsoft/florence-2-base',
  },

  CLASSIFY_IMAGE: {
    patterns: [/categorize\s+(this\s+)?image/i],
    model: '@cf/microsoft/resnet-50',
  },

  // Embeddings (for search)
  SEMANTIC_SEARCH: {
    patterns: [/search\s+for\s+(.+)/i, /find\s+(.+)/i],
    embeddingModel: '@cf/baai/bge-base-en-v1.5',
    searchModel: 'vectorize',
  },
};

export async function parseVoiceCommand(
  env: Env,
  transcription: string
): Promise<VoiceCommand | null> {

  for (const [commandType, config] of Object.entries(VOICE_COMMANDS)) {
    for (const pattern of config.patterns) {
      const match = transcription.match(pattern);

      if (match) {
        return {
          type: commandType,
          config,
          params: match.slice(1),
          originalTranscription: transcription,
        };
      }
    }
  }

  return null; // No command detected, treat as chat
}
```

---

## Testing Requirements for Makerlog

### Voice Recording Tests

```typescript
// tests/voice/recording.test.ts
describe('Voice Recording', () => {
  it('should upload segments progressively', async () => {
    const { uploadSegment } = useVoiceRecorder();

    // Simulate 5 segments
    for (let i = 0; i < 5; i++) {
      await uploadSegment(createMockBlob(), i);
    }

    // Verify all uploaded
    const uploads = await getUploads();
    expect(uploads).toHaveLength(5);
  });

  it('should handle recording interruption', async () => {
    const recorder = new VoiceRecorder();

    await recorder.start();
    await recorder.stop();

    // Verify final segment uploaded
    const segments = await getSegments();
    expect(segments[segments.length - 1].isFinal).toBe(true);
  });
});
```

### Opportunity Detection Tests

```typescript
// tests/opportunities/detection.test.ts
describe('Opportunity Detection', () => {
  it('should detect code generation opportunities', async () => {
    const messages = [
      { role: 'user', content: "I need a React component for a user profile" },
    ];

    const opportunities = await detectOpportunities(env, 'conv-id', messages);

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0].type).toBe('CODE_GENERATION');
    expect(opportunities[0].confidence).toBeGreaterThan(0.7);
  });

  it('should not create duplicate opportunities', async () => {
    const prompt = "Create a React button component";

    await queueOpportunity(env, { prompt, type: 'code' });
    await queueOpportunity(env, { prompt, type: 'code' });

    const opportunities = await getOpportunities(env);
    expect(opportunities).toHaveLength(1); // Deduplicated
  });
});
```

---

## Common Makerlog Pitfalls

### ❌ Don't: Block UI on Long Operations

```typescript
// BAD: User waits for AI response
const result = await env.AI.run(slowModel, input);
return result; // Takes 10+ seconds
```

### ✅ Do: Queue for Background Execution

```typescript
// GOOD: Queue for overnight harvest
await queueOpportunity(env, { prompt, type: 'code' });
return { queued: true, willExecuteTonight: true }; // Instant
```

### ❌ Don't: Store Audio Files Forever

```typescript
// BAD: Indefinite storage
await env.ASSETS.put(`audio/${id}.webm`, blob); // No expiration!
```

### ✅ Do: Set TTL on Recordings

```typescript
// GOOD: 24-hour retention
await env.ASSETS.put(`audio/${id}.webm`, blob, {
  customMetadata: { ttl: '86400' }, // 24 hours
});
```

### ❌ Don't: Ignore Quota Limits

```typescript
// BAD: Execute until quota exhausted
while (hasTasks()) {
  await executeTask(); // Could exceed quota!
}
```

### ✅ Do: Check Quota Before Execution

```typescript
// GOOD: Stop at 90% quota
const quota = await getQuotaStatus(env, userId);
if (quota.percentage > 90) {
  return; // Save remaining quota
}
```

---

## Checklist: Makerlog Feature Implementation

Before committing any Makerlog feature:

- [ ] **Voice-First:**
  - [ ] Works with audio input?
  - [ ] Progressive upload prevents data loss?
  - [ ] VAD segmentation working?

- [ ] **Opportunities:**
  - [ ] Detection confidence >70%?
  - [ ] Duplicate detection working?
  - [ ] Easy to approve/reject?

- [ ] **Quota:**
  - [ ] Respects 10,000 neuron daily limit?
  - [ ] Stops harvesting at 90%?
  - [ ] Real-time quota display?

- [ ] **Gamification:**
  - [ ] XP awarded for actions?
  - [ ] Level formula correct?
  - [ ] Streak tracking working?

- [ ] **UI:**
  - [ ] Dark theme by default?
  - [ ] Touch targets adequate for mobile?
  - [ ] Minimal, developer-focused aesthetic?

---

**Remember:** Makerlog serves adult developers. Efficiency, autonomy, and workflow optimization are paramount. When in doubt, ask: "Does this help them ship faster?"

**Sources:**
- `docs/research/MAKERLOG-MVP-VOICE-FIRST.md` - Complete Makerlog specification
- `docs/AGENT-ONBOARDING.md` - General agent onboarding
- `CLAUDE.md` - Project overview
