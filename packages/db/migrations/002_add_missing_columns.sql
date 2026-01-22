-- ============================================================================
-- Migration 002: Add missing columns to existing tables
-- ============================================================================
-- This migration adds columns that were added after the initial schema
-- was applied to the production database.
-- ============================================================================

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN voice_persona_id TEXT;
ALTER TABLE users ADD COLUMN tts_settings TEXT DEFAULT '{"rate":1.0,"pitch":1.0,"volume":1.0}';
ALTER TABLE users ADD COLUMN accessibility_mode TEXT DEFAULT 'standard';
ALTER TABLE users ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'));

-- Add missing columns to conversations table
ALTER TABLE conversations ADD COLUMN summary TEXT;

-- Add missing columns to messages table
ALTER TABLE messages ADD COLUMN deleted_at INTEGER DEFAULT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create indexes for users table if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_level_xp ON users(level DESC, xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_streaks ON users(streak_days DESC);
