-- ============================================================================
-- Makerlog.ai - Database Schema
-- ============================================================================
-- Database: Cloudflare D1 (SQLite)
-- Schema Version: 1.0.0
-- Last Updated: 2026-01-21
--
-- This schema supports the core functionality of Makerlog.ai:
-- - User management with gamification (XP, levels, streaks)
-- - Voice-first conversations with audio storage
-- - Opportunity detection and task queue management
-- - Achievement tracking and unlocks
-- - Semantic search via vector embeddings (external Vectorize)
--
-- Migration Tracking:
--   CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT);
--   INSERT INTO schema_migrations (version, applied_at) VALUES (1, '2026-01-21T00:00:00Z');
-- ============================================================================

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores user account information and gamification state
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  -- Primary key: UUID v4
  id TEXT PRIMARY KEY,

  -- Authentication & Identity
  email TEXT NOT NULL UNIQUE,
  cloudflare_account_id TEXT UNIQUE,

  -- Gamification: XP & Leveling
  -- Level formula: level = floor(sqrt(xp / 100)) + 1
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,

  -- Gamification: Streak Tracking
  -- streak_days: Consecutive days with at least one harvest
  -- last_harvest_at: Unix timestamp of last harvest completion
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_harvest_at INTEGER,

  -- Voice & Accessibility Preferences
  voice_persona_id TEXT,
  tts_settings TEXT DEFAULT '{"rate":1.0,"pitch":1.0,"volume":1.0}',
  accessibility_mode TEXT DEFAULT 'standard', -- standard, high_contrast, screen_reader

  -- Timestamps (Unix timestamps in seconds)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cloudflare_account ON users(cloudflare_account_id);
CREATE INDEX IF NOT EXISTS idx_users_level_xp ON users(level DESC, xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_streaks ON users(streak_days DESC);

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
-- Stores conversation metadata for voice and text interactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  -- Primary key: UUID v4
  id TEXT PRIMARY KEY,

  -- User relationship
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Conversation metadata
  title TEXT NOT NULL DEFAULT 'New Conversation',

  -- Optional: AI-generated summary for searchability
  summary TEXT,

  -- Message tracking
  message_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps (Unix timestamps in seconds)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_message_count ON conversations(user_id, message_count DESC);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
-- Stores individual messages in conversations
-- Supports voice (with audio URL) and text-only messages
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  -- Primary key: UUID v4
  id TEXT PRIMARY KEY,

  -- Conversation relationship
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Message role
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),

  -- Message content (transcript for voice, text for chat)
  content TEXT NOT NULL,

  -- Audio: URL to R2-stored audio file (NULL for text-only messages)
  audio_url TEXT,

  -- Audio duration in seconds (for voice messages)
  audio_duration REAL,

  -- Voice metadata (emotion, confidence, etc.)
  voice_metadata TEXT, -- JSON: {"emotion":"neutral","confidence":0.95}

  -- Timestamp (Unix timestamp in seconds)
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Soft delete support
  deleted_at INTEGER DEFAULT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp ON messages(conversation_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(conversation_id, role);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- Vector embeddings are stored in Vectorize (external service)
-- The message_id is used as the vector ID for semantic search

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
-- Stores generative tasks queued for execution (overnight harvesting)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  -- Primary key: UUID v4
  id TEXT PRIMARY KEY,

  -- User relationship
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Task type determines which AI model to use
  type TEXT NOT NULL CHECK(type IN (
    'image-gen',      -- Stable Diffusion XL
    'text-gen',       -- Llama 3.1 8B
    'code-gen',       -- Llama 3.1 8B (code-focused)
    'code-summary',   -- Llama 3.1 8B
    'research'        -- Future: web research agent
  )),

  -- Task status workflow
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN (
    'queued',      -- Awaiting execution
    'running',     -- Currently executing
    'completed',   -- Successfully finished
    'failed',      -- Execution failed
    'cancelled'    -- User cancelled
  )),

  -- Generation prompt
  prompt TEXT NOT NULL,

  -- Refined prompt (opportunities can be edited before queuing)
  refined_prompt TEXT,

  -- Priority (higher = executed first during harvest)
  -- Manual tasks: priority 1, Opportunity-detected: priority 2
  priority INTEGER NOT NULL DEFAULT 1,

  -- Result: URL to R2-stored generated asset
  result_url TEXT,

  -- Cost estimation (neurons/tokens)
  cost_estimate REAL NOT NULL,

  -- Actual cost tracked after execution
  actual_cost REAL,

  -- Execution metadata
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps (Unix timestamps in seconds)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  completed_at INTEGER
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);

-- ============================================================================
-- OPPORTUNITIES TABLE
-- ============================================================================
-- Stores AI-detected generative opportunities from conversations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunities (
  -- Primary key: UUID v4
  id TEXT PRIMARY KEY,

  -- Source conversation
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Opportunity type
  type TEXT NOT NULL CHECK(type IN (
    'image',  -- Icon, illustration, mockup
    'code',   -- Component, function, boilerplate
    'text'    -- Copy, documentation, description
  )),

  -- AI-generated prompt for this opportunity
  prompt TEXT NOT NULL,

  -- User can refine the prompt before accepting
  refined_prompt TEXT,

  -- AI confidence score (0.0 - 1.0)
  -- Only opportunities with confidence > 0.5 are stored
  confidence REAL NOT NULL CHECK(confidence >= 0.0 AND confidence <= 1.0),

  -- Source message IDs that triggered this detection (JSON array)
  source_messages TEXT NOT NULL,

  -- Opportunity workflow status
  status TEXT NOT NULL DEFAULT 'detected' CHECK(status IN (
    'detected',  -- AI-detected, awaiting user decision
    'queued',    -- User accepted, moved to tasks queue
    'rejected',  -- User declined
    'expired'    -- Auto-expired after 7 days
  )),

  -- Metadata (JSON: detection_model, context, etc.)
  metadata TEXT,

  -- Timestamps (Unix timestamps in seconds)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') + 604800) -- 7 days
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_opportunities_conversation ON opportunities(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status, confidence DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_expires ON opportunities(expires_at) WHERE status = 'detected';

-- ============================================================================
-- ACHIEVEMENTS TABLE
-- ============================================================================
-- Stores unlocked achievements for users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
  -- Primary key: UUID v4
  id TEXT PRIMARY KEY,

  -- User relationship
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Achievement type identifier
  -- Examples: 'first_harvest', 'perfect_day', 'streak_7', 'hundred_tasks'
  achievement_type TEXT NOT NULL,

  -- XP awarded for this achievement
  xp_awarded INTEGER NOT NULL,

  -- Timestamp (Unix timestamp in seconds)
  unlocked_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Unique constraint: one achievement per type per user
  UNIQUE(user_id, achievement_type)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);

-- ============================================================================
-- VOICE_PERSONAS TABLE (Optional - for voice persona system)
-- ============================================================================
-- Stores custom voice personas for TTS customization
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_personas (
  -- Primary key: UUID v4
  id TEXT PRIMARY KEY,

  -- User relationship (NULL for system personas)
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,

  -- Persona metadata
  name TEXT NOT NULL,
  description TEXT,

  -- Voice settings (JSON: pitch, rate, volume, voiceURI)
  voice_settings TEXT NOT NULL,

  -- Personality prompt for AI response adaptation
  personality_prompt TEXT,

  -- Is this a system-wide default persona?
  is_system_persona INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_personas_user ON voice_personas(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_personas_system ON voice_personas(is_system_persona) WHERE is_system_persona = 1;

-- ============================================================================
-- USER_SETTINGS TABLE (Optional - for extended preferences)
-- ============================================================================
-- Stores user-specific settings and preferences
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
  -- Primary key
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Active voice persona
  active_persona_id TEXT REFERENCES voice_personas(id) ON DELETE SET NULL,

  -- Notification preferences (JSON)
  notifications TEXT DEFAULT '{"daily_digest":true,"achievement_alerts":true,"streak_warnings":true}',

  -- Privacy settings (JSON)
  privacy TEXT DEFAULT '{"share_streaks":false,"share_achievements":false,"data_retention_days":90}',

  -- Accessibility settings (JSON)
  accessibility TEXT DEFAULT '{"high_contrast":false,"reduced_motion":false,"font_size":"normal"}',

  -- Timestamp
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ============================================================================
-- GENERATED_ASSETS TABLE
-- ============================================================================
-- Stores metadata for all generated assets (images, text, code)
-- Supports both cloud and desktop-generated assets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generated_assets (
  -- Primary key: UUID v4
  id TEXT PRIMARY KEY,

  -- User who owns this asset
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Source task that generated this asset
  task_id TEXT,

  -- Desktop connector that generated this (NULL for cloud generation)
  desktop_connector_id TEXT,

  -- Asset type
  type TEXT NOT NULL CHECK(type IN ('image', 'text', 'code')),

  -- Storage location (could be R2 URL or local path)
  storage_url TEXT NOT NULL,

  -- Storage backend: 'r2' or 'local'
  storage_backend TEXT NOT NULL CHECK(storage_backend IN ('r2', 'local')),

  -- Content hash for deduplication
  content_hash TEXT NOT NULL,

  -- Generation metadata (JSON)
  -- Includes: prompt, model, parameters, generation time, etc.
  metadata TEXT NOT NULL,

  -- Optional: Iteration parent (if this is a refinement of another asset)
  parent_asset_id TEXT REFERENCES generated_assets(id) ON DELETE SET NULL,
  iteration_number INTEGER,

  -- Style vector embedding (computed from prompt/content)
  -- Used for self-improvement learning
  style_vector TEXT, -- JSON array of floats

  -- Asset lifecycle disposition
  disposition TEXT CHECK(disposition IN ('cache', 'project', 'library', 'pruned')),

  -- File metadata
  file_size_bytes INTEGER,
  mime_type TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generated_assets_user ON generated_assets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_assets_type ON generated_assets(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_assets_task ON generated_assets(task_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_disposition ON generated_assets(user_id, disposition, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_assets_hash ON generated_assets(content_hash);

-- ============================================================================
-- USER_FEEDBACK TABLE
-- ============================================================================
-- Stores user feedback on generated assets for self-improvement learning
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_feedback (
  -- Primary key: UUID v4
  id TEXT PRIMARY KEY,

  -- User who provided feedback
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Asset being rated
  asset_id TEXT NOT NULL REFERENCES generated_assets(id) ON DELETE CASCADE,

  -- Star rating (1-5)
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),

  -- Disposition decision
  disposition TEXT NOT NULL CHECK(disposition IN ('project', 'library', 'prune')),

  -- Optional: User-added tags for learning
  tags TEXT, -- JSON array of strings

  -- Optional: Natural language refinements
  refinements TEXT,

  -- Timestamp
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Unique: one feedback per asset per user
  UNIQUE(user_id, asset_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_asset ON user_feedback(asset_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON user_feedback(rating, created_at DESC);

-- ============================================================================
-- STYLE_PROFILES TABLE
-- ============================================================================
-- Stores self-improvement learning data for each user
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS style_profiles (
  -- Primary key: user_id (one profile per user)
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Preference vector: 512-dimensional direction vector
  -- Computed from positive/negative example embeddings
  preference_vector TEXT NOT NULL, -- JSON array of floats

  -- Learned prompt modifiers automatically added to generations
  prompt_modifiers TEXT NOT NULL, -- JSON array of strings

  -- Counts for tracking learning progress
  positive_example_count INTEGER NOT NULL DEFAULT 0,
  negative_example_count INTEGER NOT NULL DEFAULT 0,

  -- Learning parameters
  feedback_weight REAL NOT NULL DEFAULT 0.3,

  -- Timestamp
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_style_profiles_updated ON style_profiles(updated_at DESC);

-- ============================================================================
-- STYLE_PROFILE_EXAMPLES TABLE
-- ============================================================================
-- Stores individual examples (embeddings) that make up the style profile
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS style_profile_examples (
  -- Primary key: UUID v4
  id TEXT PRIMARY KEY,

  -- User relationship
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Asset being used as example
  asset_id TEXT NOT NULL REFERENCES generated_assets(id) ON DELETE CASCADE,

  -- Example type: positive (liked) or negative (disliked)
  example_type TEXT NOT NULL CHECK(example_type IN ('positive', 'negative')),

  -- The embedding vector (512-dimensional)
  embedding TEXT NOT NULL, -- JSON array of floats

  -- Timestamp
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes for sliding window queries
CREATE INDEX IF NOT EXISTS idx_style_examples_user_type ON style_profile_examples(user_id, example_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_style_examples_user_created ON style_profile_examples(user_id, created_at DESC);

-- Trigger: Update style profile counts when example is added
CREATE TRIGGER IF NOT EXISTS update_style_profile_counts
AFTER INSERT ON style_profile_examples
BEGIN
  UPDATE style_profiles
  SET positive_example_count = positive_example_count + (CASE WHEN NEW.example_type = 'positive' THEN 1 ELSE 0 END),
      negative_example_count = negative_example_count + (CASE WHEN NEW.example_type = 'negative' THEN 1 ELSE 0 END),
      updated_at = NEW.created_at
  WHERE user_id = NEW.user_id;
END;

-- ============================================================================
-- ANALYTICS_EVENTS TABLE (Optional - for privacy-first analytics)
-- ============================================================================
-- Stores anonymized analytics events (no user IDs, no voice content)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_events (
  -- Primary key
  id TEXT PRIMARY KEY,

  -- Event type (aggregate only, no user linkage)
  event_type TEXT NOT NULL,

  -- Event data (JSON, sanitized, no PII)
  event_data TEXT NOT NULL,

  -- Timestamp (Unix timestamp, truncated to hour for privacy)
  timestamp_hour INTEGER NOT NULL,

  -- Hash of user_id for aggregate metrics only (one-way hash, salted)
  -- This allows counting unique users without storing identifiable data
  user_hash TEXT,

  -- Additional dimensions (for aggregation)
  dimensions TEXT -- JSON: {"region":"us-east","task_type":"image-gen"}
);

-- Indexes for analytics queries (time-series aggregation)
CREATE INDEX IF NOT EXISTS idx_analytics_type_hour ON analytics_events(event_type, timestamp_hour DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp_hour DESC);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- Enable foreign key enforcement (D1 default)
PRAGMA foreign_keys = ON;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update conversations.updated_at when new message is added
CREATE TRIGGER IF NOT EXISTS update_conversation_timestamp
AFTER INSERT ON messages
BEGIN
  UPDATE conversations
  SET updated_at = NEW.timestamp,
      message_count = message_count + 1
  WHERE id = NEW.conversation_id;
END;

-- Trigger: Update users.updated_at on profile changes
CREATE TRIGGER IF NOT EXISTS update_user_timestamp
AFTER UPDATE OF xp, level, streak_days ON users
BEGIN
  UPDATE users
  SET updated_at = strftime('%s', 'now')
  WHERE id = NEW.id;
END;

-- Trigger: Auto-expire opportunities after 7 days
CREATE TRIGGER IF NOT EXISTS expire_opportunities
AFTER INSERT ON opportunities
BEGIN
  UPDATE opportunities
  SET status = 'expired'
  WHERE status = 'detected'
    AND expires_at <= strftime('%s', 'now');
END;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: User profile with stats
CREATE VIEW IF NOT EXISTS user_profile AS
SELECT
  u.id,
  u.email,
  u.xp,
  u.level,
  u.streak_days,
  u.created_at,
  COUNT(DISTINCT c.id) as conversation_count,
  COUNT(DISTINCT CASE WHEN m.role = 'user' THEN m.id END) as message_count,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
  COUNT(DISTINCT a.id) as achievement_count
FROM users u
LEFT JOIN conversations c ON c.user_id = u.id
LEFT JOIN messages m ON m.conversation_id = c.id AND m.deleted_at IS NULL
LEFT JOIN tasks t ON t.user_id = u.id
LEFT JOIN achievements a ON a.user_id = u.id
GROUP BY u.id;

-- View: Opportunities with conversation context
CREATE VIEW IF NOT EXISTS opportunities_with_context AS
SELECT
  o.id,
  o.conversation_id,
  c.title as conversation_title,
  o.type,
  o.prompt,
  o.confidence,
  o.status,
  o.created_at,
  o.expires_at,
  c.user_id
FROM opportunities o
JOIN conversations c ON o.conversation_id = c.id
WHERE o.status != 'expired';

-- View: Recent tasks with execution stats
CREATE VIEW IF NOT EXISTS tasks_stats AS
SELECT
  user_id,
  type,
  status,
  COUNT(*) as count,
  AVG(CASE WHEN completed_at IS NOT NULL THEN (completed_at - created_at) END) as avg_duration_seconds,
  AVG(cost_estimate) as avg_cost_estimate,
  AVG(actual_cost) as avg_actual_cost
FROM tasks
GROUP BY user_id, type, status;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
