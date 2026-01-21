# Gamification Feature Proposals for Makerlog.ai

**Project**: Makerlog.ai
**Version**: 1.0.0
**Date**: 2026-01-21
**Status**: Proposed - Awaiting Review

---

## Executive Summary

This document proposes 5 concrete gamification features for Makerlog.ai, designed to increase daily engagement, make quota harvesting genuinely fun, and foster a sustainable developer community. Each proposal includes technical implementation details, user experience design, and success metrics.

**Proposed Features**:
1. **Adaptive Quest System** - AI-generated personalized daily/weekly challenges
2. **Smart Streaks with Forgiveness** - Enhanced streak system with burnout prevention
3. **Harvest Efficiency Scoring** - Quality-over-quantity gamification
4. **Voice Persona Progression** - Unlockable AI voice personalities
5. **Community Build Weeks** - Seasonal collaborative events

---

## Feature 1: Adaptive Quest System

### Overview

AI-generated, personalized quests that adapt to the user's skill level, tech stack, and recent work. Quests provide clear goals, learning opportunities, and meaningful rewards.

**Priority**: High
**Effort**: 3-4 weeks
**Impact**: High (increases daily engagement, provides clear goals)

### User Experience

**Daily Quest Flow**:
1. User receives 3 personalized quests each morning (via voice or dashboard)
2. Quests vary in difficulty (Easy, Medium, Hard) based on user skill
3. User completes quests through normal voice conversations and harvests
4. Progress updates in real-time via voice notifications
5. Completion grants XP, unlocks new features, and reveals tomorrow's quests

**Example Quests**:

| Difficulty | Example Quest | Objectives | XP Reward |
|------------|---------------|------------|-----------|
| Easy | "Icon Harvest" | Generate 5 icons for your dashboard | 100 XP |
| Medium | "API Documentation" | Document 3 endpoints from your conversations | 250 XP |
| Hard | "Component Refactor" | Refactor a component to use React Hooks | 500 XP |

### Technical Implementation

**Database Schema**:

```sql
-- Quest templates
CREATE TABLE quest_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- 'harvest', 'learning', 'challenge'
  difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard'
  objectives_json TEXT NOT NULL, -- JSON array of objectives
  base_xp_reward INTEGER NOT NULL,
  estimated_time_minutes INTEGER NOT NULL,
  prerequisites_json TEXT, -- JSON array of skill IDs
  created_at INTEGER NOT NULL
);

-- User quest instances
CREATE TABLE user_quests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  quest_template_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'active', 'completed', 'abandoned', 'expired'
  progress_json TEXT NOT NULL, -- JSON tracking objective progress
  assigned_at INTEGER NOT NULL,
  completed_at INTEGER,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (quest_template_id) REFERENCES quest_templates(id)
);
```

**API Endpoints**:

```typescript
// GET /api/quests/daily - Get today's personalized quests
interface DailyQuestsResponse {
  quests: Quest[];
  refreshes_remaining: number;
  next_refresh_at: Date;
}

// POST /api/quests/:id/abandon - Abandon a quest (can replace 1/day)
interface AbandonQuestResponse {
  abandoned: boolean;
  replacement_quest?: Quest;
  replacements_remaining: number;
}

// GET /api/quests/history - Get quest history
interface QuestHistoryResponse {
  completed: Quest[];
  abandoned: Quest[];
  completion_rate: number;
  total_xp_earned: number;
}
```

**Quest Generation Algorithm**:

```typescript
async function generateDailyQuests(
  env: Env,
  userId: string
): Promise<Quest[]> {
  // 1. Get user context
  const userProfile = await getUserProfile(env, userId);
  const recentActivity = await getRecentActivity(env, userId, 7);
  const techStack = await inferTechStack(env, userId);

  // 2. Determine difficulty distribution
  const difficultyMix = calculateDifficultyMix(userProfile.level);
  // e.g., Level 1-5: 2 easy, 1 medium
  //      Level 6-10: 1 easy, 2 medium
  //      Level 11+: 1 easy, 1 medium, 1 hard

  // 3. Select appropriate quest templates
  const questTemplates = await selectQuestTemplates(
    env,
    difficultyMix,
    techStack,
    userProfile.completed_quest_ids
  );

  // 4. Generate AI-powered customizations
  const personalizedQuests = await Promise.all(
    questTemplates.map(async (template) => {
      const customization = await personalizeQuest(
        env,
        template,
        recentActivity,
        techStack
      );

      return {
        ...template,
        ...customization,
        objectives: customization.objectives.map(obj => ({
          ...obj,
          current: 0,
          target: obj.target
        }))
      };
    })
  );

  // 5. Create quest instances
  const questInstances = personalizedQuests.map(quest => ({
    id: crypto.randomUUID(),
    user_id: userId,
    quest_template_id: quest.id,
    status: 'active',
    progress_json: JSON.stringify(quest.objectives),
    assigned_at: Math.floor(Date.now() / 1000),
    expires_at: getNextMidnight()
  }));

  // 6. Save to database
  await Promise.all(
    questInstances.map(quest =>
      env.DB.prepare(`
        INSERT INTO user_quests (id, user_id, quest_template_id, status, progress_json, assigned_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        quest.id, quest.user_id, quest.quest_template_id,
        quest.status, quest.progress_json, quest.assigned_at, quest.expires_at
      ).run()
    )
  );

  return questInstances;
}

async function personalizeQuest(
  env: Env,
  template: QuestTemplate,
  recentActivity: Activity[],
  techStack: string[]
): Promise<Partial<Quest>> {
  const prompt = `
Personalize this quest for a developer with:
- Tech Stack: ${techStack.join(', ')}
- Recent Work: ${recentActivity.slice(0, 3).map(a => a.description).join(', ')}

Quest Template:
- Title: ${template.title}
- Description: ${template.description}
- Objectives: ${JSON.stringify(template.objectives)}

Customization Requirements:
1. Adapt the quest to their tech stack
2. Reference their recent work if relevant
3. Make objectives specific and achievable
4. Keep XP reward proportional to difficulty

Return JSON:
{
  "title": "Personalized quest title",
  "description": "Engaging, specific description",
  "objectives": [{"description": "...", "target": 10, "unit": "..."}],
  "estimated_time_minutes": 30
}
  `;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.response);
}
```

### Quest Template Examples

**Harvest Quests** (Focus on quota utilization):

```typescript
const harvestQuests = [
  {
    id: 'harvest-icons-5',
    title: 'Icon Harvest',
    description: 'Generate {techStack} icon variations for your {projectType} project',
    type: 'harvest',
    difficulty: 'easy',
    objectives: [
      { description: 'Generate icons', target: 5, unit: 'icons' }
    ],
    base_xp_reward: 100,
    estimated_time_minutes: 30
  },
  {
    id: 'harvest-api-docs-3',
    title: 'API Documentation Sprint',
    description: 'Document {recentEndpoints} endpoints from your recent conversations',
    type: 'harvest',
    difficulty: 'medium',
    objectives: [
      { description: 'Document endpoints', target: 3, unit: 'endpoints' },
      { description: 'Include examples', target: 3, unit: 'examples' }
    ],
    base_xp_reward: 250,
    estimated_time_minutes: 45
  }
];
```

**Learning Quests** (Focus on skill development):

```typescript
const learningQuests = [
  {
    id: 'learn-react-hooks',
    title: 'React Hooks Journey',
    description: 'Refactor a {framework} component to use modern React Hooks',
    type: 'learning',
    difficulty: 'medium',
    prerequisites: ['react-basics'],
    objectives: [
      { description: 'Refactor component', target: 1, unit: 'component' },
      { description: 'Use useState', target: 1, unit: 'hook' },
      { description: 'Use useEffect', target: 1, unit: 'hook' }
    ],
    base_xp_reward: 300,
    estimated_time_minutes: 60
  }
];
```

**Challenge Quests** (Focus on quality and optimization):

```typescript
const challengeQuests = [
  {
    id: 'challenge-optimize-bundle',
    title: 'Bundle Size Challenge',
    description: 'Optimize your {projectType} bundle size by 20KB',
    type: 'challenge',
    difficulty: 'hard',
    objectives: [
      { description: 'Reduce bundle size', target: 20, unit: 'KB' },
      { description: 'Maintain functionality', target: 100, unit: '%' }
    ],
    base_xp_reward: 500,
    estimated_time_minutes: 90
  }
];
```

### Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Quest completion rate | > 70% | Week 4 |
| Daily quest engagement | > 60% DAU | Week 4 |
| Quest satisfaction score | > 4.0/5.0 | Week 6 |
| Quest-induced quota usage | +15% | Week 4 |

---

## Feature 2: Smart Streaks with Forgiveness

### Overview

Enhanced streak system that protects against burnout through grace periods, streak freezes, and quality-based scoring. Streaks become meaningful without becoming anxiety-inducing.

**Priority**: High
**Effort**: 2-3 weeks
**Impact**: High (retention, daily habit formation)

### User Experience

**Streak Features**:

1. **24-Hour Grace Period**
   - After midnight, users have 24 hours to complete a harvest before streak breaks
   - Visual countdown shows remaining grace period
   - Voice notification: "Your streak is at risk! 6 hours left to harvest."

2. **Streak Freezes**
   - Users can freeze their streak for 1 day (cost: 100 XP)
   - Maximum 3 freezes per month
   - Cannot freeze on active streak (only during grace period)

3. **Streak Restoration**
   - If streak breaks, users can restore it (cost: 500 XP)
   - Only available for streaks ≥ 7 days
   - Can only restore once per broken streak

4. **Quality-Based Streaks**
   - Streaks only count if harvest quality score > 70%
   - Discourages token activity to maintain streaks
   - "Quality Streak" badge for high-quality consecutive days

### Technical Implementation

**Database Schema**:

```sql
-- Enhance users table
ALTER TABLE users ADD COLUMN streak_grace_until INTEGER;
ALTER TABLE users ADD COLUMN streak_freezes_available INTEGER DEFAULT 3;
ALTER TABLE users ADD COLUMN streak_frozen_until INTEGER;
ALTER TABLE users ADD COLUMN longest_quality_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN current_quality_streak INTEGER DEFAULT 0;

-- Streak events tracking
CREATE TABLE streak_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'started', 'extended', 'grace_activated', 'frozen', 'broken', 'restored'
  streak_length INTEGER NOT NULL,
  metadata_json TEXT, -- Additional event-specific data
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**API Endpoints**:

```typescript
// GET /api/streaks/status - Get current streak status
interface StreakStatusResponse {
  daily_streak: number;
  weekly_streak: number;
  monthly_streak: number;
  longest_daily_streak: number;
  current_quality_streak: number;
  grace_period_active: boolean;
  grace_period_ends_at: Date | null;
  hours_remaining_in_grace: number | null;
  streak_freezes_available: number;
  can_restore_streak: boolean;
  restore_cost: number | null;
}

// POST /api/streaks/freeze - Freeze streak for 1 day
interface FreezeStreakResponse {
  success: boolean;
  frozen_until: Date;
  freezes_remaining: number;
  cost_xp: number;
}

// POST /api/streaks/restore - Restore broken streak
interface RestoreStreakResponse {
  success: boolean;
  restored_streak_length: number;
  cost_xp: number;
}
```

**Streak Calculation Logic**:

```typescript
async function updateStreakAfterHarvest(
  env: Env,
  userId: string,
  harvestQuality: number
): Promise<StreakUpdateResult> {
  const user = await getUserRecord(env, userId);
  const now = Math.floor(Date.now() / 1000);

  // Check if streak is frozen
  if (user.streak_frozen_until && user.streak_frozen_until > now) {
    return { status: 'frozen', streak_length: user.streak_days };
  }

  // Calculate days since last harvest
  const daysSinceLastHarvest = Math.floor(
    (now - (user.last_harvest_at || 0)) / 86400
  );

  let newStreak = user.streak_days;
  let newQualityStreak = user.current_quality_streak;
  let streakBroken = false;
  let graceActivated = false;

  // Check grace period
  if (daysSinceLastHarvest === 1 && !user.streak_grace_until) {
    // Activate grace period
    const graceEnd = now + 86400; // 24 hours from now
    await env.DB.prepare(`
      UPDATE users SET streak_grace_until = ? WHERE id = ?
    `).bind(graceEnd, userId).run();

    await logStreakEvent(env, userId, 'grace_activated', user.streak_days);

    return {
      status: 'grace_activated',
      grace_period_ends_at: new Date(graceEnd * 1000),
      streak_length: user.streak_days
    };
  }

  // Still in grace period
  if (user.streak_grace_until && user.streak_grace_until > now) {
    // Clear grace period and extend streak
    newStreak++;
    graceActivated = true;
  } else if (daysSinceLastHarvest > 2) {
    // Streak broken
    streakBroken = true;
    newStreak = 1;
    newQualityStreak = 0;
  } else if (daysSinceLastHarvest <= 1) {
    // Extend streak
    newStreak++;
  }

  // Update quality streak
  if (harvestQuality >= 70 && !streakBroken) {
    newQualityStreak++;
  } else {
    newQualityStreak = 0;
  }

  // Update user record
  await env.DB.prepare(`
    UPDATE users
    SET streak_days = ?,
        current_quality_streak = ?,
        last_harvest_at = ?,
        streak_grace_until = NULL,
        streak_frozen_until = NULL
    WHERE id = ?
  `).bind(newStreak, newQualityStreak, now, userId).run();

  // Update longest streaks
  if (newStreak > (user.longest_daily_streak || 0)) {
    await env.DB.prepare(`
      UPDATE users SET longest_daily_streak = ? WHERE id = ?
    `).bind(newStreak, userId).run();
  }

  if (newQualityStreak > (user.longest_quality_streak || 0)) {
    await env.DB.prepare(`
      UPDATE users SET longest_quality_streak = ? WHERE id = ?
    `).bind(newQualityStreak, userId).run();
  }

  // Log event
  await logStreakEvent(env, userId, streakBroken ? 'broken' : 'extended', newStreak, {
    quality: harvestQuality,
    grace_activated: graceActivated
  });

  // Check for streak achievements
  await checkStreakAchievements(env, userId, newStreak, newQualityStreak);

  return {
    status: streakBroken ? 'broken' : 'extended',
    streak_length: newStreak,
    quality_streak_length: newQualityStreak,
    can_restore: streakBroken && newStreak >= 7
  };
}

async function freezeStreak(env: Env, userId: string): Promise<FreezeResult> {
  const user = await getUserRecord(env, userId);

  if (user.streak_freezes_available <= 0) {
    throw new Error('No streak freezes available');
  }

  const now = Math.floor(Date.now() / 1000);
  const frozenUntil = now + 86400; // 24 hours
  const freezeCost = 100;

  // Deduct XP
  await awardXP(env, userId, -freezeCost);

  // Update user record
  await env.DB.prepare(`
    UPDATE users
    SET streak_frozen_until = ?,
        streak_freezes_available = streak_freezes_available - 1
    WHERE id = ?
  `).bind(frozenUntil, userId).run();

  await logStreakEvent(env, userId, 'frozen', user.streak_days, {
    duration_hours: 24,
    cost_xp: freezeCost
  });

  return {
    success: true,
    frozen_until: new Date(frozenUntil * 1000),
    freezes_remaining: user.streak_freezes_available - 1,
    cost_xp: freezeCost
  };
}
```

**Streak UI Components**:

```tsx
function StreakDisplay({ streak, gracePeriod, freezesAvailable }: StreakDisplayProps) {
  return (
    <div className="streak-container">
      {/* Streak Counter */}
      <div className="streak-counter">
        <span className="fire-icon">🔥</span>
        <span className="streak-number">{streak.daily_streak}</span>
        <span className="streak-label">days</span>
      </div>

      {/* Quality Streak Badge */}
      {streak.current_quality_streak >= 7 && (
        <div className="quality-streak-badge">
          <span>⭐</span>
          <span>{streak.current_quality_streak} quality days</span>
        </div>
      )}

      {/* Grace Period Countdown */}
      {gracePeriod.active && (
        <div className="grace-period-countdown">
          <span className="warning-icon">⚠️</span>
          <span>Streak at risk!</span>
          <Countdown
            endTime={gracePeriod.ends_at}
            onComplete={handleGracePeriodEnd}
          />
          <button onClick={handleFreezeStreak}>
            Freeze Streak (100 XP)
          </button>
        </div>
      )}

      {/* Streak Actions */}
      <div className="streak-actions">
        <button
          onClick={handleFreezeStreak}
          disabled={freezesAvailable === 0}
        >
          ❄️ Freeze ({freezesAvailable} available)
        </button>
      </div>
    </div>
  );
}
```

### Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Streak retention (7+ days) | > 30% | Week 8 |
| Grace period usage | > 40% of at-risk streaks saved | Week 4 |
| Streak freeze usage | < 20% of users (indicating healthy system) | Week 4 |
| Quality streak adoption | > 15% of users with 7+ quality streaks | Week 8 |

---

## Feature 3: Harvest Efficiency Scoring

### Overview

Quality-over-quantity scoring system that rewards efficient quota usage, high success rates, and valuable outputs. Makes harvesting strategic rather than mindless.

**Priority**: Medium
**Effort**: 2 weeks
**Impact**: Medium (encourages quality, reduces waste)

### User Experience

**Efficiency Score Components**:

1. **Task Success Rate** (40% weight)
   - % of tasks completed successfully
   - Failed tasks reduce score significantly

2. **Quota Utilization** (30% weight)
   - Tasks completed / quota used
   - Higher score for completing more tasks with less quota

3. **Output Quality** (20% weight)
   - User "keep" rate for generated assets
   - Iteration count (fewer iterations = higher score)

4. **Time Efficiency** (10% weight)
   - Actual time / estimated time
   - Faster completion = higher score

**Score Display**:
```
┌─────────────────────────────────┐
│   Harvest Efficiency Score      │
│                                 │
│        ★★★★☆ 87/100            │
│                                 │
│  Success Rate: ████████ 95%    │
│  Quota Efficiency: ██████ 80%   │
│  Output Quality: ████████ 92%   │
│  Time Efficiency: ████████ 88%  │
│                                 │
│  +50 XP Bonus (Excellent!)      │
└─────────────────────────────────┘
```

### Technical Implementation

**Database Schema**:

```sql
-- Harvest scores
CREATE TABLE harvest_scores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  harvest_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL, -- 0-100
  success_rate_score INTEGER NOT NULL,
  quota_efficiency_score INTEGER NOT NULL,
  output_quality_score INTEGER NOT NULL,
  time_efficiency_score INTEGER NOT NULL,
  tasks_completed INTEGER NOT NULL,
  quota_used INTEGER NOT NULL,
  xp_bonus INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User efficiency stats (cached)
CREATE TABLE user_efficiency_stats (
  user_id TEXT PRIMARY KEY,
  avg_efficiency_score INTEGER NOT NULL,
  total_harvests INTEGER NOT NULL,
  excellent_harvests INTEGER NOT NULL, -- 90+ score
  good_harvests INTEGER NOT NULL, -- 70-89 score
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Scoring Algorithm**:

```typescript
interface HarvestScoreInput {
  tasks_completed: number;
  tasks_failed: number;
  quota_used: number;
  quota_estimated: number;
  outputs_kept: number;
  outputs_total: number;
  actual_time_minutes: number;
  estimated_time_minutes: number;
}

function calculateHarvestScore(input: HarvestScoreInput): HarvestScore {
  const totalTasks = input.tasks_completed + input.tasks_failed;

  // 1. Success Rate (40% weight)
  const successRate = totalTasks > 0
    ? (input.tasks_completed / totalTasks) * 100
    : 0;
  const successRateScore = successRate;

  // 2. Quota Efficiency (30% weight)
  // Higher score for using less quota than estimated
  const quotaRatio = input.quota_estimated > 0
    ? input.quota_used / input.quota_estimated
    : 1;
  // If quotaRatio < 1, score = 100 (great efficiency!)
  // If quotaRatio > 1, score decreases
  const quotaEfficiencyScore = quotaRatio <= 1
    ? 100
    : Math.max(0, 100 - ((quotaRatio - 1) * 50));

  // 3. Output Quality (20% weight)
  // Based on user keep rate
  const outputQualityScore = input.outputs_total > 0
    ? (input.outputs_kept / input.outputs_total) * 100
    : 100;

  // 4. Time Efficiency (10% weight)
  // Faster than estimated = higher score
  const timeRatio = input.estimated_time_minutes > 0
    ? input.actual_time_minutes / input.estimated_time_minutes
    : 1;
  const timeEfficiencyScore = timeRatio <= 1
    ? 100
    : Math.max(0, 100 - ((timeRatio - 1) * 30));

  // Calculate weighted overall score
  const overallScore = Math.round(
    (successRateScore * 0.40) +
    (quotaEfficiencyScore * 0.30) +
    (outputQualityScore * 0.20) +
    (timeEfficiencyScore * 0.10)
  );

  // Determine XP bonus
  let xpBonus = 0;
  if (overallScore >= 90) xpBonus = 50;
  else if (overallScore >= 80) xpBonus = 30;
  else if (overallScore >= 70) xpBonus = 10;

  return {
    overall_score: overallScore,
    success_rate_score: Math.round(successRateScore),
    quota_efficiency_score: Math.round(quotaEfficiencyScore),
    output_quality_score: Math.round(outputQualityScore),
    time_efficiency_score: Math.round(timeEfficiencyScore),
    xp_bonus: xpBonus
  };
}

async function scoreHarvest(
  env: Env,
  userId: string,
  harvestId: string,
  harvestData: HarvestData
): Promise<HarvestScoreResult> {
  // Collect score input data
  const tasks = await env.DB.prepare(`
    SELECT * FROM tasks
    WHERE harvest_id = ?
  `).bind(harvestId).all();

  const scoreInput: HarvestScoreInput = {
    tasks_completed: tasks.results.filter(t => t.status === 'completed').length,
    tasks_failed: tasks.results.filter(t => t.status === 'failed').length,
    quota_used: harvestData.quota_used,
    quota_estimated: harvestData.quota_estimated,
    outputs_kept: harvestData.outputs_kept,
    outputs_total: harvestData.outputs_total,
    actual_time_minutes: harvestData.actual_time_minutes,
    estimated_time_minutes: harvestData.estimated_time_minutes
  };

  // Calculate score
  const score = calculateHarvestScore(scoreInput);

  // Save score
  await env.DB.prepare(`
    INSERT INTO harvest_scores (
      id, user_id, harvest_id, overall_score,
      success_rate_score, quota_efficiency_score,
      output_quality_score, time_efficiency_score,
      tasks_completed, quota_used, xp_bonus, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), userId, harvestId, score.overall_score,
    score.success_rate_score, score.quota_efficiency_score,
    score.output_quality_score, score.time_efficiency_score,
    scoreInput.tasks_completed, scoreInput.quota_used,
    score.xp_bonus, Math.floor(Date.now() / 1000)
  ).run();

  // Update user efficiency stats
  await updateUserEfficiencyStats(env, userId, score);

  // Award XP bonus
  if (score.xp_bonus > 0) {
    await awardXP(env, userId, score.xp_bonus);
  }

  // Check for efficiency achievements
  await checkEfficiencyAchievements(env, userId, score);

  return {
    score,
    message: getEfficiencyMessage(score.overall_score)
  };
}

function getEfficiencyMessage(score: number): string {
  if (score >= 95) return "Perfect harvest! Exceptional efficiency! 🌟";
  if (score >= 90) return "Outstanding work! Nearly perfect! ⭐";
  if (score >= 80) return "Great efficiency! Keep it up! 👍";
  if (score >= 70) return "Good harvest, room for improvement. 💪";
  if (score >= 60) return "Fair harvest. Focus on quality. 📈";
  return "Low efficiency. Review and optimize. 🔧";
}
```

### Efficiency Achievements

```typescript
const efficiencyAchievements = [
  {
    id: 'efficiency-perfect',
    name: 'Perfect Harvest',
    description: 'Achieve 95-100% efficiency score',
    icon: '🌟',
    rarity: 'legendary',
    xp_reward: 500,
    requirement: { score: 95, count: 1 }
  },
  {
    id: 'efficiency-consistent',
    name: 'Reliable Harvester',
    description: 'Maintain 80%+ efficiency for 10 harvests',
    icon: '🎯',
    rarity: 'epic',
    xp_reward: 750,
    requirement: { score: 80, count: 10 }
  },
  {
    id: 'efficiency-master',
    name: 'Efficiency Master',
    description: 'Average 85%+ efficiency over 50 harvests',
    icon: '🏆',
    rarity: 'epic',
    xp_reward: 1000,
    requirement: { avg_score: 85, count: 50 }
  },
  {
    id: 'efficiency-quota-saver',
    name: 'Quota Saver',
    description: 'Complete harvests using < 50% estimated quota',
    icon: '💰',
    rarity: 'rare',
    xp_reward: 300,
    requirement: { quota_ratio: 0.5, count: 5 }
  }
];
```

### Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Average efficiency score | > 75% | Week 4 |
| Efficiency awareness (users check scores) | > 50% | Week 2 |
| Efficiency improvement over time | +5% | Week 8 |
| Low-efficiency harvest reduction | -20% | Week 4 |

---

## Feature 4: Voice Persona Progression

### Overview

Unlockable AI voice personalities that users can progress toward. Voice personas provide variety, emotional connection, and long-term goals for users.

**Priority**: Medium
**Effort**: 3 weeks
**Impact**: Medium (emotional engagement, voice interaction retention)

### User Experience

**Voice Personas**:

| Level | Persona | Personality | Voice Style | Unlock Requirement |
|-------|---------|-------------|-------------|-------------------|
| 1 | **Maker** (Default) | Friendly, efficient | Neutral, clear | Default |
| 5 | **Coach** | Motivational, energetic | Upbeat, encouraging | Reach Level 5 |
| 10 | **Mentor** | Wise, thoughtful | Calm, measured | Reach Level 10 |
| 15 | **Comedian** | Witty, humorous | Expressive, playful | Reach Level 15 |
| 20 | **Zen Master** | Peaceful, philosophical | Slow, soothing | Reach Level 20 |
| 25 | **Custom** | User-created | Customizable | Create custom persona |

**Persona Switching**:
- Users can switch between unlocked personas anytime
- Each persona has unique responses and TTS settings
- Voice conversations adapt to selected persona's style

**Example Persona Differences**:

**Coach Persona**:
- User: "I'm stuck on this bug."
- Coach: "Hey, you've got this! Let's tackle it together. What have you tried so far? I bet we can figure this out and learn something cool along the way!"

**Mentor Persona**:
- User: "I'm stuck on this bug."
- Mentor: "I understand. Debugging is an opportunity to deepen your understanding. Let's approach this systematically. Can you walk me through the symptoms?"

**Zen Master Persona**:
- User: "I'm stuck on this bug."
- Zen Master: "Every bug is a teacher. Breathe. Observe. The solution will come in time. What does the code tell you?"

### Technical Implementation

**Database Schema**:

```sql
-- Voice personas
CREATE TABLE voice_personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  personality_prompt TEXT NOT NULL,
  voice_settings_json TEXT NOT NULL, -- TTS settings
  unlock_level INTEGER NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT 0,
  created_by TEXT, -- User ID for custom personas
  created_at INTEGER NOT NULL
);

-- User persona preferences
ALTER TABLE users ADD COLUMN active_persona_id TEXT;
ALTER TABLE users ADD COLUMN unlocked_personas_json TEXT; -- JSON array

-- Persona usage stats
CREATE TABLE persona_usage_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  conversation_count INTEGER NOT NULL,
  total_minutes INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (persona_id) REFERENCES voice_personas(id)
);
```

**Persona Configuration**:

```typescript
interface VoicePersona {
  id: string;
  name: string;
  description: string;
  personality_prompt: string;
  voice_settings: {
    voiceURI?: string; // Web Speech API voice
    pitch: number; // 0.0 - 2.0
    rate: number; // 0.1 - 10
    volume: number; // 0.0 - 1.0
  };
  unlock_level: number;
  is_custom: boolean;
  example_phrases: string[];
}

const DEFAULT_PERSONAS: VoicePersona[] = [
  {
    id: 'maker',
    name: 'Maker',
    description: 'Your friendly development assistant',
    personality_prompt: `You are Maker, a friendly and efficient AI assistant for developers.
- Be concise and direct
- Focus on practical solutions
- Celebrate small wins
- Keep responses conversational (voice-first)
- Use technical terminology appropriately`,
    voice_settings: {
      pitch: 1.0,
      rate: 1.0,
      volume: 1.0
    },
    unlock_level: 1,
    is_custom: false,
    example_phrases: [
      "Let's build this together!",
      "Great question! Here's what I think...",
      "Nice work on that implementation!"
    ]
  },
  {
    id: 'coach',
    name: 'Coach',
    description: 'Your motivational development coach',
    personality_prompt: `You are Coach, an energetic and motivating AI assistant.
- Be enthusiastic and encouraging
- Use motivational language
- Celebrate progress and effort
- Frame challenges as opportunities
- Keep energy high but positive`,
    voice_settings: {
      pitch: 1.1,
      rate: 1.1,
      volume: 1.0
    },
    unlock_level: 5,
    is_custom: false,
    example_phrases: [
      "You've got this! Let's crush it!",
      "Amazing progress! Keep pushing!",
      "Every expert was once a beginner. You're doing great!"
    ]
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Your wise and thoughtful mentor',
    personality_prompt: `You are Mentor, a wise and patient AI teacher.
- Speak calmly and thoughtfully
- Explain the "why" behind concepts
- Share relevant experience and insights
- Ask questions that deepen understanding
- Take time to reflect before responding`,
    voice_settings: {
      pitch: 0.9,
      rate: 0.9,
      volume: 1.0
    },
    unlock_level: 10,
    is_custom: false,
    example_phrases: [
      "Let's think through this carefully.",
      "Understanding the fundamentals will serve you well.",
      "This is a valuable learning opportunity."
    ]
  },
  {
    id: 'comedian',
    name: 'Comedian',
    description: 'Your witty and humorous coding companion',
    personality_prompt: `You are Comedian, a witty AI assistant with a sense of humor.
- Use appropriate humor and wit
- Make light of frustrating situations
- Use programming jokes and puns
- Keep it fun but not distracting
- Know when to be serious`,
    voice_settings: {
      pitch: 1.05,
      rate: 1.15,
      volume: 1.0
    },
    unlock_level: 15,
    is_custom: false,
    example_phrases: [
      "Looks like we have a bug... or a feature? 😉",
      "Why did the developer go broke? Because he used up all his cache!",
      "Let's debug this... comedy routine!"
    ]
  },
  {
    id: 'zen-master',
    name: 'Zen Master',
    description: 'Your peaceful and philosophical guide',
    personality_prompt: `You are Zen Master, a peaceful AI assistant with a philosophical approach.
- Speak slowly and calmly
- Use metaphors and analogies
- Emphasize mindfulness and patience
- Frame coding as a meditation
- Focus on the journey, not just the destination`,
    voice_settings: {
      pitch: 0.85,
      rate: 0.85,
      volume: 0.95
    },
    unlock_level: 20,
    is_custom: false,
    example_phrases: [
      "The code reflects the mind. Let yours be clear.",
      "In patience, there is wisdom. Let us observe.",
      "Every bug is a teacher. Every error, enlightenment."
    ]
  }
];
```

**API Endpoints**:

```typescript
// GET /api/voice/personas - Get available personas
interface GetPersonasResponse {
  default_persona: VoicePersona;
  unlocked_personas: VoicePersona[];
  locked_personas: Array<{ persona: VoicePersona; unlock_level: number }>;
  active_persona_id: string;
}

// POST /api/voice/personas/:id/activate - Switch persona
interface ActivatePersonaResponse {
  success: boolean;
  active_persona: VoicePersona;
}

// POST /api/voice/personas/custom - Create custom persona
interface CreateCustomPersonaResponse {
  persona: VoicePersona;
  xp_cost: number;
}
```

**Custom Persona Creation**:

```typescript
async function createCustomPersona(
  env: Env,
  userId: string,
  personaData: {
    name: string;
    description: string;
    personality_traits: string[];
    voice_settings: Partial<VoicePersona['voice_settings']>;
  }
): Promise<VoicePersona> {
  // Check user level (require Level 25)
  const user = await getUserRecord(env, userId);
  if (user.level < 25) {
    throw new Error('Custom personas unlock at Level 25');
  }

  // Deduct XP (cost: 1000 XP)
  await awardXP(env, userId, -1000);

  // Generate personality prompt from traits
  const personalityPrompt = await generatePersonalityPrompt(
    env,
    personaData.personality_traits
  );

  // Create persona
  const persona: VoicePersona = {
    id: crypto.randomUUID(),
    name: personaData.name,
    description: personaData.description,
    personality_prompt: personalityPrompt,
    voice_settings: {
      pitch: personaData.voice_settings.pitch || 1.0,
      rate: personaData.voice_settings.rate || 1.0,
      volume: personaData.voice_settings.volume || 1.0
    },
    unlock_level: 0,
    is_custom: true,
    example_phrases: []
  };

  await env.DB.prepare(`
    INSERT INTO voice_personas (id, name, description, personality_prompt, voice_settings_json, unlock_level, is_custom, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)
  `).bind(
    persona.id, persona.name, persona.description, persona.personality_prompt,
    JSON.stringify(persona.voice_settings), userId, Math.floor(Date.now() / 1000)
  ).run();

  // Add to user's unlocked personas
  await addPersonaToUser(env, userId, persona.id);

  return persona;
}

async function generatePersonalityPrompt(
  env: Env,
  traits: string[]
): Promise<string> {
  const prompt = `
Create a personality prompt for an AI voice assistant with these traits: ${traits.join(', ')}

The prompt should:
1. Define the assistant's communication style
2. Specify how to respond to users
3. Include guidelines for tone and approach
4. Be 3-5 sentences long

Return only the personality prompt text.
  `;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300
  });

  return response.response;
}
```

**Persona Usage in Voice Chat**:

```typescript
async function generatePersonaResponse(
  env: Env,
  userId: string,
  conversationHistory: Message[],
  userMessage: string
): Promise<string> {
  // Get user's active persona
  const user = await getUserRecord(env, userId);
  const persona = await getPersona(env, user.active_persona_id);

  // Build system prompt with personality
  const systemPrompt = `
${persona.personality_prompt}

Recent conversation:
${conversationHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Respond in character as ${persona.name}. Keep it conversational and concise.
  `;

  // Generate response
  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 300
  });

  // Track usage
  await trackPersonaUsage(env, userId, persona.id);

  return response.response;
}

// Apply persona voice settings to TTS
function speakWithPersona(text: string, persona: VoicePersona): void {
  const utterance = new SpeechSynthesisUtterance(text);

  // Apply persona voice settings
  if (persona.voice_settings.voiceURI) {
    utterance.voice = speechSynthesis.getVoices().find(
      v => v.voiceURI === persona.voice_settings.voiceURI
    );
  }
  utterance.pitch = persona.voice_settings.pitch;
  utterance.rate = persona.voice_settings.rate;
  utterance.volume = persona.voice_settings.volume;

  speechSynthesis.speak(utterance);
}
```

### Persona Progression Achievements

```typescript
const personaAchievements = [
  {
    id: 'persona-coach-unlock',
    name: 'Coach unlocked!',
    description: 'Reach Level 5 and unlock the Coach persona',
    icon: '📣',
    rarity: 'common',
    xp_reward: 200
  },
  {
    id: 'persona-mentor-unlock',
    name: 'Mentor unlocked!',
    description: 'Reach Level 10 and unlock the Mentor persona',
    icon: '🧠',
    rarity: 'rare',
    xp_reward: 500
  },
  {
    id: 'persona-master-unlock',
    name: 'All personas unlocked!',
    description: 'Unlock all default personas',
    icon: '🎭',
    rarity: 'epic',
    xp_reward: 2000
  },
  {
    id: 'persona-custom-creator',
    name: 'Persona Creator',
    description: 'Create your first custom persona',
    icon: '✨',
    rarity: 'legendary',
    xp_reward: 1000
  }
];
```

### Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Persona switching (users try multiple personas) | > 40% | Week 4 |
| Voice interaction retention (persona users) | +15% vs. non-persona | Week 6 |
| Custom persona creations | > 5% of Level 25+ users | Week 8 |
| Persona preference diversity (no single persona > 60%) | Balanced usage | Week 4 |

---

## Feature 5: Community Build Weeks

### Overview

Seasonal, themed week-long events where the community collaborates on shared challenges. Combines friendly competition with collaborative learning and showcases collective creativity.

**Priority**: Medium
**Effort**: 3-4 weeks
**Impact**: High (community building, retention, new user acquisition)

### User Experience

**Event Format**:

**Duration**: 7 days (Monday - Sunday)

**Daily Structure**:
- **Daily Quest**: Community-wide challenge (e.g., "Generate 5 Halloween-themed icons")
- **Leaderboard**: Team-based competition
- **Showcase**: Highlight top contributions
- **Learning**: Daily tutorial/workshop

**Teams**:
- Users join teams (5-10 members per team)
- Teams compete for collective points
- Emphasis on collaboration, not individual glory

**Example Event: "Hacktober Harvest Week"**

```
┌─────────────────────────────────────────────┐
│      HACKTOBER HARVEST WEEK                 │
│           October 1-7                       │
│                                             │
│  🎃 Daily Challenge: Generate 5 Halloween   │
│     themed icons for your project           │
│                                             │
│  👥 Your Team: Pumpkin Patchers             │
│     Rank: #12 / 156                        │
│     Points: 4,250                           │
│                                             │
│  🏆 Daily Prizes:                           │
│     - Top team: 500 XP each                │
│     - Most creative: Custom avatar frame   │
│     - All participants: 50 XP              │
│                                             │
│  [VIEW LEADERBOARD] [JOIN TEAM] [RULES]     │
└─────────────────────────────────────────────┘
```

### Technical Implementation

**Database Schema**:

```sql
-- Events
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  theme TEXT NOT NULL,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'upcoming', 'active', 'completed'
  rules_json TEXT NOT NULL,
  prizes_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Event teams
CREATE TABLE event_teams (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  max_members INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Team memberships
CREATE TABLE team_memberships (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  points_contributed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (team_id) REFERENCES event_teams(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Event challenges (daily quests)
CREATE TABLE event_challenges (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  day INTEGER NOT NULL, -- 1-7
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  objectives_json TEXT NOT NULL,
  xp_reward INTEGER NOT NULL,
  points_multiplier REAL NOT NULL DEFAULT 1.0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Challenge submissions
CREATE TABLE challenge_submissions (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  team_id TEXT,
  result_url TEXT,
  quality_score INTEGER,
  points_awarded INTEGER NOT NULL,
  submitted_at INTEGER NOT NULL,
  FOREIGN KEY (challenge_id) REFERENCES event_challenges(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (team_id) REFERENCES event_teams(id)
);
```

**Event Management System**:

```typescript
interface Event {
  id: string;
  name: string;
  description: string;
  theme: string;
  start_at: Date;
  end_at: Date;
  status: 'upcoming' | 'active' | 'completed';
  rules: EventRules;
  prizes: EventPrizes;
}

interface EventRules {
  team_size: { min: number; max: number };
  scoring: string; // Scoring methodology
  submissions: {
    per_user: number;
    per_team: number;
  };
  eligibility: string[];
}

interface EventPrizes {
  first_place: { xp: number; custom_reward: string };
  second_place: { xp: number; custom_reward: string };
  third_place: { xp: number; custom_reward: string };
  participation: { xp: number };
  daily_winners: { xp: number };
}

// Event creation
async function createEvent(
  env: Env,
  eventData: {
    name: string;
    description: string;
    theme: string;
    start_at: Date;
    end_at: Date;
    rules: EventRules;
    prizes: EventPrizes;
  }
): Promise<Event> {
  const eventId = crypto.randomUUID();

  // Generate daily challenges
  const challenges = await generateEventChallenges(env, eventData.theme, 7);

  await env.DB.prepare(`
    INSERT INTO events (id, name, description, theme, start_at, end_at, status, rules_json, prizes_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?)
  `).bind(
    eventId, eventData.name, eventData.description, eventData.theme,
    Math.floor(eventData.start_at.getTime() / 1000),
    Math.floor(eventData.end_at.getTime() / 1000),
    JSON.stringify(eventData.rules),
    JSON.stringify(eventData.prizes),
    Math.floor(Date.now() / 1000)
  ).run();

  // Create challenges
  for (let day = 0; day < challenges.length; day++) {
    await env.DB.prepare(`
      INSERT INTO event_challenges (id, event_id, day, title, description, objectives_json, xp_reward, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), eventId, day + 1,
      challenges[day].title, challenges[day].description,
      JSON.stringify(challenges[day].objectives),
      challenges[day].xp_reward,
      Math.floor(Date.now() / 1000)
    ).run();
  }

  return {
    id: eventId,
    ...eventData,
    status: 'upcoming'
  };
}

// Generate themed challenges
async function generateEventChallenges(
  env: Env,
  theme: string,
  days: number
): Promise<DailyChallenge[]> {
  const challenges: DailyChallenge[] = [];

  for (let day = 1; day <= days; day++) {
    const prompt = `
Generate a daily challenge for Day ${day} of a "${theme}" themed developer event.

Challenge Requirements:
1. Should be completable in 30-60 minutes
2. Should involve AI generation (images, code, or text)
3. Should align with the "${theme}" theme
4. Should be fun and creative

Return JSON:
{
  "title": "Challenge title",
  "description": "Engaging description",
  "objectives": [{"description": "...", "target": 5, "unit": "..."}],
  "xp_reward": 100
}
    `;

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    challenges.push(JSON.parse(response.response));
  }

  return challenges;
}

// Team creation
async function createTeam(
  env: Env,
  eventId: string,
  userId: string,
  teamData: {
    name: string;
    description: string;
  }
): Promise<EventTeam> {
  const teamId = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO event_teams (id, event_id, name, description, max_members, points, created_at)
    VALUES (?, ?, ?, ?, 10, 0, ?)
  `).bind(
    teamId, eventId, teamData.name, teamData.description,
    Math.floor(Date.now() / 1000)
  ).run();

  // Creator joins team automatically
  await joinTeam(env, teamId, userId);

  return {
    id: teamId,
    event_id: eventId,
    ...teamData,
    max_members: 10,
    points: 0
  };
}

// Join team
async function joinTeam(env: Env, teamId: string, userId: string): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO team_memberships (id, team_id, user_id, joined_at)
    VALUES (?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), teamId, userId,
    Math.floor(Date.now() / 1000)
  ).run();
}

// Submit challenge
async function submitChallenge(
  env: Env,
  challengeId: string,
  userId: string,
  resultUrl: string
): Promise<SubmissionResult> {
  // Get challenge and team
  const challenge = await getChallenge(env, challengeId);
  const membership = await getUserTeamMembership(env, userId, challenge.event_id);

  // Calculate score
  const qualityScore = await evaluateSubmission(env, resultUrl, challenge.objectives);
  const basePoints = 100;
  const pointsAwarded = Math.round(basePoints * (qualityScore / 100) * challenge.points_multiplier);

  // Record submission
  await env.DB.prepare(`
    INSERT INTO challenge_submissions (id, challenge_id, user_id, team_id, result_url, quality_score, points_awarded, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), challengeId, userId, membership.team_id,
    resultUrl, qualityScore, pointsAwarded,
    Math.floor(Date.now() / 1000)
  ).run();

  // Update team points
  await env.DB.prepare(`
    UPDATE event_teams SET points = points + ? WHERE id = ?
  `).bind(pointsAwarded, membership.team_id).run();

  // Update user contribution
  await env.DB.prepare(`
    UPDATE team_memberships SET points_contributed = points_contributed + ? WHERE id = ?
  `).bind(pointsAwarded, membership.id).run();

  // Award XP
  await awardXP(env, userId, challenge.xp_reward);

  return {
    success: true,
    quality_score: qualityScore,
    points_awarded: pointsAwarded,
    xp_awarded: challenge.xp_reward
  };
}

// Evaluate submission quality
async function evaluateSubmission(
  env: Env,
  resultUrl: string,
  objectives: any[]
): Promise<number> {
  // AI-based quality evaluation
  const prompt = `
Evaluate this submission against the following objectives:

Objectives: ${JSON.stringify(objectives)}
Submission URL: ${resultUrl}

Rate the submission on:
1. How well it meets the objectives (0-100)
2. Creativity and originality (0-100)
3. Technical quality (0-100)

Return JSON:
{
  "objectives_score": 85,
  "creativity_score": 90,
  "quality_score": 88,
  "overall_score": 87
}
  `;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    response_format: { type: 'json_object' }
  });

  const evaluation = JSON.parse(response.response);
  return evaluation.overall_score;
}

// Update rankings
async function updateEventRankings(env: Env, eventId: string): Promise<void> {
  await env.DB.prepare(`
    UPDATE event_teams
    SET rank = subquery.rank
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY points DESC) as rank
      FROM event_teams
      WHERE event_id = ?
    ) subquery
    WHERE event_teams.id = subquery.id
  `).bind(eventId).run();
}
```

**API Endpoints**:

```typescript
// GET /api/events - List events
interface GetEventsResponse {
  upcoming: Event[];
  active: Event[];
  completed: Event[];
}

// GET /api/events/:id - Get event details
interface GetEventResponse {
  event: Event;
  challenges: DailyChallenge[];
  teams: EventTeam[];
  user_team?: EventTeam;
  leaderboard: EventTeam[];
}

// POST /api/events/:id/teams - Create team
interface CreateTeamResponse {
  team: EventTeam;
  invite_code: string;
}

// POST /api/events/:id/teams/:teamId/join - Join team
interface JoinTeamResponse {
  success: boolean;
  team: EventTeam;
}

// POST /api/events/:id/challenges/:challengeId/submit - Submit challenge
interface SubmitChallengeResponse {
  submission: SubmissionResult;
  team_rank: number;
}
```

### Event Calendar

**Proposed 2026 Event Schedule**:

| Month | Event | Theme | Duration |
|-------|-------|-------|----------|
| February | **Winter Build** | New Year, New Projects | 1 week |
| April | **Spring Cleaning** | Refactoring & Optimization | 1 week |
| July | **Summer Hack** - Collaboration Month | Four 1-week themed events | 4 weeks |
| October | **Hacktober Harvest** | Open Source & Halloween | 1 week |
| December | **Holiday Creator** | Gift & Card Generation | 1 week |

### Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Event participation rate | > 40% of active users | Per event |
| Team formation | > 80% of participants join teams | Per event |
| New user acquisition during events | +25% | Per event |
| Retention post-event | +15% (30-day) | Post-event |
| Social media mentions | +50% | During event |

---

## Implementation Priority Matrix

| Feature | Priority | Effort | Impact | Dependencies |
|---------|----------|--------|--------|--------------|
| **Smart Streaks with Forgiveness** | High | 2-3 weeks | High | None |
| **Adaptive Quest System** | High | 3-4 weeks | High | User profiling |
| **Harvest Efficiency Scoring** | Medium | 2 weeks | Medium | None |
| **Voice Persona Progression** | Medium | 3 weeks | Medium | Voice system |
| **Community Build Weeks** | Medium | 3-4 weeks | High | Quest system, teams |

**Recommended Implementation Order**:
1. **Smart Streaks** (Quick win, high impact)
2. **Harvest Efficiency** (Foundation for quality scoring)
3. **Adaptive Quests** (Core engagement driver)
4. **Voice Personas** (Differentiation feature)
5. **Community Events** (Community builder)

---

## Conclusion

These 5 gamification features are designed to work together to create a comprehensive, engaging experience for Makerlog.ai users:

- **Smart Streaks** provides daily habit formation with burnout prevention
- **Adaptive Quests** gives users clear, personalized goals
- **Efficiency Scoring** rewards quality over quantity
- **Voice Personas** adds emotional connection and variety
- **Community Events** fosters collaboration and competition

**Expected Outcomes**:
- +40% increase in daily active users
- +25% improvement in user retention (30-day)
- +15% increase in quota utilization efficiency
- Stronger community and word-of-mouth growth

**Next Steps**:
1. Prioritize features based on development capacity
2. Create detailed technical specifications
3. Begin with Smart Streaks implementation
4. Iterate based on user feedback

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-21
**See Also**: `docs/GAMIFICATION-PATTERNS.md` for comprehensive research and patterns
