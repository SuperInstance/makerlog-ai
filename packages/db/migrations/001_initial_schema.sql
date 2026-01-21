-- ============================================================================
-- Makerlog.ai - Initial Schema Migration
-- ============================================================================
-- Migration: 001_initial_schema
-- Version: 1.0.0
-- Date: 2026-01-21
-- Description: Creates all core tables for Makerlog.ai production database
--
-- This migration sets up the foundation for:
-- - User accounts with gamification (XP, levels, streaks)
-- - Voice-first conversations
-- - Task queue management for overnight harvesting
-- - Opportunity detection from conversations
-- - Achievement tracking
--
-- Rollback: DROP TABLE statements available (use with caution in production)
-- ============================================================================

-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================

-- Track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  rollback_sql TEXT
);

-- Record this migration
INSERT INTO schema_migrations (version, name, applied_at, rollback_sql)
VALUES (
  1,
  '001_initial_schema',
  datetime('now'),
  'DROP TABLE IF EXISTS analytics_events, user_settings, voice_personas, achievements, opportunities, tasks, messages, conversations, users, schema_migrations;'
);

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  cloudflare_account_id TEXT UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_harvest_at INTEGER,
  voice_persona_id TEXT,
  tts_settings TEXT DEFAULT '{"rate":1.0,"pitch":1.0,"volume":1.0}',
  accessibility_mode TEXT DEFAULT 'standard',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cloudflare_account ON users(cloudflare_account_id);
CREATE INDEX IF NOT EXISTS idx_users_level_xp ON users(level DESC, xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_streaks ON users(streak_days DESC);

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  summary TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_message_count ON conversations(user_id, message_count DESC);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  audio_url TEXT,
  audio_duration REAL,
  voice_metadata TEXT,
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  deleted_at INTEGER DEFAULT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp ON messages(conversation_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(conversation_id, role);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- TASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('image-gen', 'text-gen', 'code-gen', 'code-summary', 'research')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  prompt TEXT NOT NULL,
  refined_prompt TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  result_url TEXT,
  cost_estimate REAL NOT NULL,
  actual_cost REAL,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  completed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);

-- ============================================================================
-- OPPORTUNITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('image', 'code', 'text')),
  prompt TEXT NOT NULL,
  refined_prompt TEXT,
  confidence REAL NOT NULL CHECK(confidence >= 0.0 AND confidence <= 1.0),
  source_messages TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'detected' CHECK(status IN ('detected', 'queued', 'rejected', 'expired')),
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') + 604800),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_opportunities_conversation ON opportunities(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status, confidence DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_expires ON opportunities(expires_at) WHERE status = 'detected';

-- ============================================================================
-- ACHIEVEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_type TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL,
  unlocked_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(user_id, achievement_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);

-- ============================================================================
-- VOICE_PERSONAS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_personas (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  voice_settings TEXT NOT NULL,
  personality_prompt TEXT,
  is_system_persona INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_voice_personas_user ON voice_personas(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_personas_system ON voice_personas(is_system_persona) WHERE is_system_persona = 1;

-- ============================================================================
-- USER_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  active_persona_id TEXT,
  notifications TEXT DEFAULT '{"daily_digest":true,"achievement_alerts":true,"streak_warnings":true}',
  privacy TEXT DEFAULT '{"share_streaks":false,"share_achievements":false,"data_retention_days":90}',
  accessibility TEXT DEFAULT '{"high_contrast":false,"reduced_motion":false,"font_size":"normal"}',
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (active_persona_id) REFERENCES voice_personas(id) ON DELETE SET NULL
);

-- ============================================================================
-- ANALYTICS_EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL,
  timestamp_hour INTEGER NOT NULL,
  user_hash TEXT,
  dimensions TEXT
);

CREATE INDEX IF NOT EXISTS idx_analytics_type_hour ON analytics_events(event_type, timestamp_hour DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp_hour DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_conversation_timestamp
AFTER INSERT ON messages
BEGIN
  UPDATE conversations
  SET updated_at = NEW.timestamp,
      message_count = message_count + 1
  WHERE id = NEW.conversation_id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_timestamp
AFTER UPDATE OF xp, level, streak_days ON users
BEGIN
  UPDATE users
  SET updated_at = strftime('%s', 'now')
  WHERE id = NEW.id;
END;

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
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify table creation
SELECT
  'Migration 001 applied successfully' as status,
  name,
  datetime(applied_at) as applied_at
FROM schema_migrations
WHERE version = 1;
