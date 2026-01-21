/**
 * Makerlog.ai - Unified API Worker
 * 
 * Voice-First Development Assistant with Gamified Quota Harvesting
 * 
 * Core endpoints:
 * 
 * VOICE (Primary Interface):
 * - POST /api/voice/transcribe - Record & transcribe voice, get AI response
 * - POST /api/voice/synthesize - Text-to-speech (returns config for browser TTS)
 * 
 * CONVERSATIONS:
 * - GET /api/conversations - List all conversations
 * - GET /api/conversations/:id - Get conversation with messages
 * - POST /api/conversations - Create new conversation
 * - POST /api/search - Semantic search across all conversations
 * 
 * OPPORTUNITIES (Detected from conversations):
 * - GET /api/opportunities - List detected generative opportunities
 * - POST /api/opportunities/:id/queue - Queue for overnight generation
 * - POST /api/opportunities/:id/reject - Skip this opportunity
 * - POST /api/opportunities/:id/refine - Edit the prompt before queueing
 * 
 * TASKS & HARVEST:
 * - GET /api/tasks - List all tasks
 * - POST /api/tasks - Queue a task manually
 * - POST /api/tasks/:id/execute - Execute a single task
 * - POST /api/harvest - Execute all queued tasks (use remaining quota)
 * - GET /api/digest - Daily summary of conversations and opportunities
 * 
 * QUOTA & GAMIFICATION:
 * - GET /api/quota - Current quota usage
 * - GET /api/achievements - User achievements, XP, level, streak
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ASSETS: R2Bucket;
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
}

interface Task {
  id: string;
  user_id: string;
  type: 'image-gen' | 'text-gen' | 'code-summary';
  status: 'queued' | 'running' | 'completed' | 'failed';
  prompt: string;
  priority: number;
  result_url?: string;
  cost_estimate: number;
  created_at: number;
  completed_at?: number;
}

interface QuotaUsage {
  images: { used: number; limit: number; remaining: number };
  tokens: { used: number; limit: number; remaining: number };
  resetAt: string;
}

const ACHIEVEMENTS = {
  'first_harvest': { name: 'First Harvest', description: 'Complete your first harvest', xp: 100, icon: '🌾' },
  'perfect_day': { name: 'Perfect Day', description: '100% quota usage in one day', xp: 500, icon: '🔥' },
  'time_saver': { name: 'Time Hacker', description: 'Save 10 hours total', xp: 1000, icon: '⏱️' },
  'streak_7': { name: 'Week Warrior', description: '7-day harvest streak', xp: 2000, icon: '🏆' },
  'hundred_tasks': { name: 'Century Club', description: 'Complete 100 tasks', xp: 1500, icon: '💯' },
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['http://localhost:3000', 'https://makerlog.ai', 'https://www.makerlog.ai'],
  credentials: true,
}));

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'makerlog-api', version: '1.0.0' }));

// ============ QUOTA ENDPOINTS ============

app.get('/api/quota', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  
  // Check KV cache first (60s TTL)
  const cached = await c.env.KV.get(`quota:${userId}`, { type: 'json' }) as QuotaUsage | null;
  if (cached) {
    return c.json(cached);
  }

  // Cloudflare Workers AI free tier limits (as of 2025)
  // These would ideally come from the CF API, but for MVP we estimate
  const quota: QuotaUsage = {
    images: { used: 0, limit: 1000, remaining: 1000 },
    tokens: { used: 0, limit: 100000, remaining: 100000 },
    resetAt: getNextMidnightUTC(),
  };

  // Count today's completed tasks to estimate usage
  const todayStart = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000);
  const tasks = await c.env.DB.prepare(`
    SELECT type, COUNT(*) as count FROM tasks 
    WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
    GROUP BY type
  `).bind(userId, todayStart).all();

  for (const row of tasks.results || []) {
    const r = row as { type: string; count: number };
    if (r.type === 'image-gen') {
      quota.images.used = r.count;
      quota.images.remaining = Math.max(0, quota.images.limit - r.count);
    } else if (r.type === 'text-gen' || r.type === 'code-summary') {
      quota.tokens.used += r.count * 1000; // Estimate 1000 tokens per task
      quota.tokens.remaining = Math.max(0, quota.tokens.limit - quota.tokens.used);
    }
  }

  // Cache for 60 seconds
  await c.env.KV.put(`quota:${userId}`, JSON.stringify(quota), { expirationTtl: 60 });
  
  return c.json(quota);
});

// ============ TASK ENDPOINTS ============

app.get('/api/tasks', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  const status = c.req.query('status');
  
  let query = 'SELECT * FROM tasks WHERE user_id = ?';
  const params: string[] = [userId];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC LIMIT 50';
  
  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ tasks: result.results || [] });
});

app.post('/api/tasks', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  const body = await c.req.json() as { type: string; prompt: string; priority?: number };
  
  const task: Task = {
    id: crypto.randomUUID(),
    user_id: userId,
    type: body.type as Task['type'],
    status: 'queued',
    prompt: body.prompt,
    priority: body.priority || 1,
    cost_estimate: body.type === 'image-gen' ? 0.001 : 0.0001,
    created_at: Math.floor(Date.now() / 1000),
  };

  await c.env.DB.prepare(`
    INSERT INTO tasks (id, user_id, type, status, prompt, priority, cost_estimate, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    task.id, task.user_id, task.type, task.status,
    task.prompt, task.priority, task.cost_estimate, task.created_at
  ).run();

  return c.json({ task }, 201);
});

app.post('/api/tasks/:id/execute', async (c) => {
  const taskId = c.req.param('id');
  const userId = c.req.header('X-User-Id') || 'demo-user';
  
  // Get the task
  const task = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
  ).bind(taskId, userId).first() as Task | null;
  
  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  // Update status to running
  await c.env.DB.prepare(
    'UPDATE tasks SET status = ? WHERE id = ?'
  ).bind('running', taskId).run();

  try {
    let resultUrl: string | undefined;

    if (task.type === 'image-gen') {
      // Generate image using Workers AI
      const response = await c.env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
        prompt: task.prompt,
      }) as ArrayBuffer;

      // Store in R2
      const key = `images/${userId}/${taskId}.png`;
      await c.env.ASSETS.put(key, response, {
        httpMetadata: { contentType: 'image/png' },
      });
      resultUrl = `/assets/${key}`;
      
    } else if (task.type === 'text-gen') {
      // Generate text using Workers AI
      const response = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt: task.prompt,
        max_tokens: 1000,
      }) as { response: string };

      // Store result in R2
      const key = `text/${userId}/${taskId}.txt`;
      await c.env.ASSETS.put(key, response.response, {
        httpMetadata: { contentType: 'text/plain' },
      });
      resultUrl = `/assets/${key}`;
    }

    // Update task as completed
    await c.env.DB.prepare(`
      UPDATE tasks SET status = 'completed', result_url = ?, completed_at = ?
      WHERE id = ?
    `).bind(resultUrl, Math.floor(Date.now() / 1000), taskId).run();

    // Award XP
    await awardXP(c.env, userId, 50);

    // Invalidate quota cache
    await c.env.KV.delete(`quota:${userId}`);

    return c.json({ success: true, resultUrl });

  } catch (error) {
    await c.env.DB.prepare(
      'UPDATE tasks SET status = ? WHERE id = ?'
    ).bind('failed', taskId).run();
    
    return c.json({ error: 'Task execution failed' }, 500);
  }
});

// ============ HARVEST ENDPOINT ============

app.post('/api/harvest', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  
  // Get all queued tasks
  const queuedTasks = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE user_id = ? AND status = ? ORDER BY priority DESC, created_at ASC'
  ).bind(userId, 'queued').all();

  // Get current quota
  const quotaRes = await fetch(`${c.req.url.replace('/harvest', '/quota')}`, {
    headers: { 'X-User-Id': userId },
  });
  const quota = await quotaRes.json() as QuotaUsage;

  const results: { taskId: string; success: boolean }[] = [];
  let tasksExecuted = 0;

  // Execute tasks up to quota limit
  for (const row of queuedTasks.results || []) {
    const task = row as Task;
    
    // Check if we have quota
    if (task.type === 'image-gen' && quota.images.remaining <= 0) continue;
    if ((task.type === 'text-gen' || task.type === 'code-summary') && quota.tokens.remaining <= 0) continue;

    // Execute the task
    const execRes = await fetch(`${c.req.url.replace('/harvest', `/tasks/${task.id}/execute`)}`, {
      method: 'POST',
      headers: { 'X-User-Id': userId },
    });

    results.push({
      taskId: task.id,
      success: execRes.ok,
    });

    tasksExecuted++;

    // Update remaining quota estimates
    if (task.type === 'image-gen') quota.images.remaining--;
    else quota.tokens.remaining -= 1000;
  }

  // Check for achievements
  await checkAchievements(c.env, userId, 'harvest', { tasksExecuted });

  // Update streak
  await updateStreak(c.env, userId);

  return c.json({
    harvestComplete: true,
    tasksExecuted,
    results,
    quotaRemaining: {
      images: quota.images.remaining,
      tokens: quota.tokens.remaining,
    },
  });
});

// ============ ACHIEVEMENTS ENDPOINTS ============

app.get('/api/achievements', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  
  const unlocked = await c.env.DB.prepare(
    'SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC'
  ).bind(userId).all();

  const user = await c.env.DB.prepare(
    'SELECT xp, level, streak_days FROM users WHERE id = ?'
  ).bind(userId).first();

  return c.json({
    user: user || { xp: 0, level: 1, streak_days: 0 },
    unlocked: unlocked.results || [],
    available: ACHIEVEMENTS,
  });
});

// ============ USER ENDPOINTS ============

app.post('/api/users', async (c) => {
  const body = await c.req.json() as { email: string; cloudflare_account_id?: string };
  const userId = crypto.randomUUID();

  await c.env.DB.prepare(`
    INSERT INTO users (id, email, cloudflare_account_id, xp, level, streak_days)
    VALUES (?, ?, ?, 0, 1, 0)
  `).bind(userId, body.email, body.cloudflare_account_id || null).run();

  return c.json({ id: userId, email: body.email }, 201);
});

app.get('/api/users/me', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(userId).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user);
});

// ============ ASSETS ENDPOINT ============

app.get('/assets/*', async (c) => {
  const key = c.req.path.replace('/assets/', '');
  const object = await c.env.ASSETS.get(key);
  
  if (!object) {
    return c.json({ error: 'Asset not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=86400');
  
  return new Response(object.body, { headers });
});

// ============ HELPER FUNCTIONS ============

function getNextMidnightUTC(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

async function awardXP(env: Env, userId: string, xp: number): Promise<void> {
  await env.DB.prepare(`
    UPDATE users SET xp = xp + ? WHERE id = ?
  `).bind(xp, userId).run();

  // Check for level up (simple formula: level = floor(sqrt(xp / 100)))
  const user = await env.DB.prepare('SELECT xp FROM users WHERE id = ?').bind(userId).first() as { xp: number } | null;
  if (user) {
    const newLevel = Math.floor(Math.sqrt(user.xp / 100)) + 1;
    await env.DB.prepare('UPDATE users SET level = ? WHERE id = ?').bind(newLevel, userId).run();
  }
}

async function updateStreak(env: Env, userId: string): Promise<void> {
  const user = await env.DB.prepare(
    'SELECT last_harvest_at, streak_days FROM users WHERE id = ?'
  ).bind(userId).first() as { last_harvest_at: number; streak_days: number } | null;

  if (!user) return;

  const now = Math.floor(Date.now() / 1000);
  const lastHarvest = user.last_harvest_at || 0;
  const daysSinceLast = Math.floor((now - lastHarvest) / 86400);

  let newStreak = user.streak_days;
  if (daysSinceLast === 0) {
    // Same day, no change
  } else if (daysSinceLast === 1) {
    // Consecutive day
    newStreak++;
  } else {
    // Streak broken
    newStreak = 1;
  }

  await env.DB.prepare(`
    UPDATE users SET streak_days = ?, last_harvest_at = ? WHERE id = ?
  `).bind(newStreak, now, userId).run();
}

async function checkAchievements(
  env: Env, 
  userId: string, 
  trigger: string, 
  data: Record<string, number>
): Promise<void> {
  // Check first harvest
  if (trigger === 'harvest' && data.tasksExecuted > 0) {
    const existing = await env.DB.prepare(
      'SELECT id FROM achievements WHERE user_id = ? AND achievement_type = ?'
    ).bind(userId, 'first_harvest').first();

    if (!existing) {
      await unlockAchievement(env, userId, 'first_harvest');
    }
  }

  // Check 100 tasks
  const taskCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = ?'
  ).bind(userId, 'completed').first() as { count: number } | null;

  if (taskCount && taskCount.count >= 100) {
    const existing = await env.DB.prepare(
      'SELECT id FROM achievements WHERE user_id = ? AND achievement_type = ?'
    ).bind(userId, 'hundred_tasks').first();

    if (!existing) {
      await unlockAchievement(env, userId, 'hundred_tasks');
    }
  }

  // Check 7-day streak
  const user = await env.DB.prepare(
    'SELECT streak_days FROM users WHERE id = ?'
  ).bind(userId).first() as { streak_days: number } | null;

  if (user && user.streak_days >= 7) {
    const existing = await env.DB.prepare(
      'SELECT id FROM achievements WHERE user_id = ? AND achievement_type = ?'
    ).bind(userId, 'streak_7').first();

    if (!existing) {
      await unlockAchievement(env, userId, 'streak_7');
    }
  }
}

async function unlockAchievement(env: Env, userId: string, achievementType: string): Promise<void> {
  const achievement = ACHIEVEMENTS[achievementType as keyof typeof ACHIEVEMENTS];
  if (!achievement) return;

  await env.DB.prepare(`
    INSERT INTO achievements (id, user_id, achievement_type, xp_awarded)
    VALUES (?, ?, ?, ?)
  `).bind(crypto.randomUUID(), userId, achievementType, achievement.xp).run();

  await awardXP(env, userId, achievement.xp);
}

// ============ VOICE ENDPOINTS ============

/**
 * POST /api/voice/transcribe
 * 
 * The core voice-first interaction:
 * 1. Accepts audio blob from push-to-talk
 * 2. Transcribes with Whisper
 * 3. Stores in conversation + vector DB
 * 4. Generates contextual response
 * 5. Detects generative opportunities
 */
app.post('/api/voice/transcribe', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  
  const formData = await c.req.formData();
  const audioFile = formData.get('audio') as File;
  let conversationId = formData.get('conversation_id') as string;
  
  if (!audioFile) {
    return c.json({ error: 'No audio file provided' }, 400);
  }

  const audioBuffer = await audioFile.arrayBuffer();
  
  // 1. Transcribe with Whisper
  const transcription = await c.env.AI.run('@cf/openai/whisper', {
    audio: [...new Uint8Array(audioBuffer)],
  }) as { text: string };

  const transcript = transcription.text.trim();
  
  if (!transcript) {
    return c.json({ error: 'Could not transcribe audio' }, 400);
  }

  // 2. Create conversation if needed
  if (!conversationId) {
    conversationId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await c.env.DB.prepare(`
      INSERT INTO conversations (id, user_id, title, created_at, updated_at, message_count)
      VALUES (?, ?, ?, ?, ?, 0)
    `).bind(conversationId, userId, `Conversation ${new Date().toLocaleDateString()}`, now, now).run();
  }

  // 3. Store audio in R2
  const audioKey = `voice/${userId}/${conversationId}/${Date.now()}.webm`;
  await c.env.ASSETS.put(audioKey, audioBuffer, {
    httpMetadata: { contentType: audioFile.type || 'audio/webm' },
  });

  // 4. Create message record
  const messageId = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  
  await c.env.DB.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, audio_url, timestamp)
    VALUES (?, ?, 'user', ?, ?, ?)
  `).bind(messageId, conversationId, transcript, `/assets/${audioKey}`, timestamp).run();

  // 5. Generate embedding and store in Vectorize (if available)
  try {
    const embedding = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: transcript,
    }) as { data: number[][] };

    if (c.env.VECTORIZE) {
      await c.env.VECTORIZE.upsert([{
        id: messageId,
        values: embedding.data[0],
        metadata: {
          user_id: userId,
          conversation_id: conversationId,
          content: transcript.substring(0, 500),
          timestamp,
        },
      }]);
    }
  } catch (e) {
    console.error('Vectorize error:', e);
  }

  // 6. Update conversation
  await c.env.DB.prepare(`
    UPDATE conversations SET updated_at = ?, message_count = message_count + 1
    WHERE id = ?
  `).bind(timestamp, conversationId).run();

  // 7. Get recent context for response
  const recentMessages = await c.env.DB.prepare(`
    SELECT role, content FROM messages 
    WHERE conversation_id = ? 
    ORDER BY timestamp DESC 
    LIMIT 5
  `).bind(conversationId).all();

  const context = (recentMessages.results || [])
    .reverse()
    .map((m: any) => `${m.role}: ${m.content}`)
    .join('\n');

  // 8. Generate response
  const systemPrompt = `You are Makerlog, a friendly AI assistant that helps makers think through their ideas.

Your role is to:
- Listen actively and ask clarifying questions
- Help users articulate their ideas more clearly
- Identify potential generative tasks (images, code, text) that could help
- Keep responses concise and conversational (this is voice chat)

Recent conversation:
${context}

Respond naturally to the user's latest message. If you notice something that could be generated (icon, code snippet, copy, etc.), mention it briefly.`;

  const aiResponse = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: transcript },
    ],
    max_tokens: 300,
  }) as { response: string };

  const response = aiResponse.response;

  // 9. Store assistant response
  const assistantMessageId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, timestamp)
    VALUES (?, ?, 'assistant', ?, ?)
  `).bind(assistantMessageId, conversationId, response, Math.floor(Date.now() / 1000)).run();

  // 10. Analyze for opportunities (async)
  c.executionCtx.waitUntil(analyzeForOpportunities(c.env, conversationId, messageId, transcript));

  return c.json({
    transcript,
    response,
    conversationId,
    messageId,
    audioUrl: `/assets/${audioKey}`,
  });
});

// Helper: Analyze message for generative opportunities
async function analyzeForOpportunities(
  env: Env,
  conversationId: string,
  messageId: string,
  content: string
): Promise<void> {
  const analysisPrompt = `Analyze this message for potential generative AI tasks.

Message: "${content}"

Identify any of these that could be generated:
1. Images (icons, illustrations, UI mockups, etc.)
2. Code (functions, components, boilerplate, etc.)
3. Text (copy, documentation, descriptions, etc.)

For each opportunity found, respond in JSON format:
{
  "opportunities": [
    {
      "type": "image|code|text",
      "prompt": "Detailed prompt for generation",
      "confidence": 0.0-1.0
    }
  ]
}

If no clear opportunities, respond with: {"opportunities": []}
Only include opportunities with confidence > 0.5.`;

  const analysis = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'You are an AI that identifies generative opportunities. Respond only in valid JSON.' },
      { role: 'user', content: analysisPrompt },
    ],
    max_tokens: 500,
  }) as { response: string };

  try {
    const jsonMatch = analysis.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const parsed = JSON.parse(jsonMatch[0]) as {
      opportunities: Array<{ type: string; prompt: string; confidence: number }>;
    };

    for (const opp of parsed.opportunities) {
      if (opp.confidence < 0.5) continue;

      await env.DB.prepare(`
        INSERT INTO opportunities (id, conversation_id, type, prompt, confidence, source_messages, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'detected', ?)
      `).bind(
        crypto.randomUUID(),
        conversationId,
        opp.type,
        opp.prompt,
        opp.confidence,
        JSON.stringify([messageId]),
        Math.floor(Date.now() / 1000)
      ).run();
    }
  } catch (e) {
    console.error('Failed to parse opportunities:', e);
  }
}

// ============ CONVERSATION ENDPOINTS ============

app.get('/api/conversations', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM conversations 
    WHERE user_id = ? 
    ORDER BY updated_at DESC 
    LIMIT 50
  `).bind(userId).all();

  return c.json({ conversations: result.results || [] });
});

app.get('/api/conversations/:id', async (c) => {
  const conversationId = c.req.param('id');
  const userId = c.req.header('X-User-Id') || 'demo-user';
  
  const conversation = await c.env.DB.prepare(`
    SELECT * FROM conversations WHERE id = ? AND user_id = ?
  `).bind(conversationId, userId).first();

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  const messages = await c.env.DB.prepare(`
    SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC
  `).bind(conversationId).all();

  return c.json({
    conversation,
    messages: messages.results || [],
  });
});

app.post('/api/conversations', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  const body = await c.req.json().catch(() => ({})) as { title?: string };
  
  const conversationId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  
  await c.env.DB.prepare(`
    INSERT INTO conversations (id, user_id, title, created_at, updated_at, message_count)
    VALUES (?, ?, ?, ?, ?, 0)
  `).bind(conversationId, userId, body.title || `Conversation ${new Date().toLocaleDateString()}`, now, now).run();
  
  return c.json({ id: conversationId }, 201);
});

// ============ SEMANTIC SEARCH ============

app.post('/api/search', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  const { query, limit = 10 } = await c.req.json() as { query: string; limit?: number };

  if (!c.env.VECTORIZE) {
    return c.json({ error: 'Vectorize not configured' }, 500);
  }

  const embedding = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: query,
  }) as { data: number[][] };

  const results = await c.env.VECTORIZE.query(embedding.data[0], {
    topK: limit,
    filter: { user_id: userId },
    returnMetadata: 'all',
  });

  return c.json({ results: results.matches });
});

// ============ OPPORTUNITIES ENDPOINTS ============

app.get('/api/opportunities', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  const status = c.req.query('status') || 'detected';

  const result = await c.env.DB.prepare(`
    SELECT o.*, c.title as conversation_title
    FROM opportunities o
    JOIN conversations c ON o.conversation_id = c.id
    WHERE c.user_id = ? AND o.status = ?
    ORDER BY o.confidence DESC, o.created_at DESC
    LIMIT 50
  `).bind(userId, status).all();

  return c.json({ opportunities: result.results || [] });
});

app.post('/api/opportunities/:id/queue', async (c) => {
  const opportunityId = c.req.param('id');
  const userId = c.req.header('X-User-Id') || 'demo-user';

  const opp = await c.env.DB.prepare(`
    SELECT o.* FROM opportunities o
    JOIN conversations c ON o.conversation_id = c.id
    WHERE o.id = ? AND c.user_id = ?
  `).bind(opportunityId, userId).first() as any;

  if (!opp) {
    return c.json({ error: 'Opportunity not found' }, 404);
  }

  const taskId = crypto.randomUUID();
  const taskType = opp.type === 'image' ? 'image-gen' : opp.type === 'code' ? 'code-gen' : 'text-gen';
  
  await c.env.DB.prepare(`
    INSERT INTO tasks (id, user_id, type, status, prompt, priority, created_at)
    VALUES (?, ?, ?, 'queued', ?, 2, ?)
  `).bind(taskId, userId, taskType, opp.prompt, Math.floor(Date.now() / 1000)).run();

  await c.env.DB.prepare(`
    UPDATE opportunities SET status = 'queued' WHERE id = ?
  `).bind(opportunityId).run();

  return c.json({ taskId, status: 'queued' });
});

app.post('/api/opportunities/:id/reject', async (c) => {
  const opportunityId = c.req.param('id');
  
  await c.env.DB.prepare(`
    UPDATE opportunities SET status = 'rejected' WHERE id = ?
  `).bind(opportunityId).run();

  return c.json({ status: 'rejected' });
});

app.post('/api/opportunities/:id/refine', async (c) => {
  const opportunityId = c.req.param('id');
  const { prompt } = await c.req.json() as { prompt: string };

  await c.env.DB.prepare(`
    UPDATE opportunities SET prompt = ? WHERE id = ?
  `).bind(prompt, opportunityId).run();

  return c.json({ success: true });
});

// ============ DAILY DIGEST ============

app.get('/api/digest', async (c) => {
  const userId = c.req.header('X-User-Id') || 'demo-user';
  const todayStart = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000);

  const conversations = await c.env.DB.prepare(`
    SELECT * FROM conversations 
    WHERE user_id = ? AND updated_at >= ?
    ORDER BY updated_at DESC
  `).bind(userId, todayStart).all();

  const opportunities = await c.env.DB.prepare(`
    SELECT o.* FROM opportunities o
    JOIN conversations c ON o.conversation_id = c.id
    WHERE c.user_id = ? AND o.status = 'detected' AND o.created_at >= ?
    ORDER BY o.confidence DESC
  `).bind(userId, todayStart).all();

  const messageCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.user_id = ? AND m.timestamp >= ?
  `).bind(userId, todayStart).first() as { count: number };

  return c.json({
    date: new Date().toISOString().split('T')[0],
    conversations: conversations.results || [],
    conversationCount: (conversations.results || []).length,
    messageCount: messageCount?.count || 0,
    opportunities: opportunities.results || [],
    opportunityCount: (opportunities.results || []).length,
  });
});

export default app;
