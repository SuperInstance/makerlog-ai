# Database Quick Reference

Quick reference for common database operations.

## Table Summaries

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts with gamification | id, email, xp, level, streak_days |
| `conversations` | Voice/chat conversations | id, user_id, title, message_count |
| `messages` | Individual messages | id, conversation_id, role, content, audio_url |
| `tasks` | Generative task queue | id, user_id, type, status, prompt, priority |
| `opportunities` | AI-detected opportunities | id, conversation_id, type, confidence, status |
| `achievements` | User achievements | id, user_id, achievement_type, xp_awarded |
| `voice_personas` | Voice TTS personas | id, user_id, name, voice_settings |
| `user_settings` | User preferences | user_id, active_persona_id, notifications |
| `analytics_events` | Privacy-first analytics | id, event_type, event_data, user_hash |

## Common Queries

### User Queries

```sql
-- Get user profile with stats
SELECT * FROM user_profile WHERE id = 'user-id';

-- Update user XP
UPDATE users SET xp = xp + 50, level = floor(sqrt((xp + 50) / 100)) + 1 WHERE id = 'user-id';

-- Update streak
UPDATE users SET streak_days = streak_days + 1, last_harvest_at = strftime('%s', 'now') WHERE id = 'user-id';

-- Get leaderboard
SELECT email, xp, level, streak_days FROM users ORDER BY xp DESC LIMIT 10;
```

### Conversation Queries

```sql
-- List user conversations
SELECT * FROM conversations WHERE user_id = 'user-id' ORDER BY updated_at DESC;

-- Get conversation with messages
SELECT c.*, COUNT(m.id) as actual_message_count
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE c.id = 'conv-id' AND c.user_id = 'user-id'
GROUP BY c.id;

-- Search conversations
SELECT * FROM conversations
WHERE user_id = 'user-id' AND title LIKE '%search%'
ORDER BY updated_at DESC;
```

### Message Queries

```sql
-- Get conversation messages
SELECT * FROM messages WHERE conversation_id = 'conv-id' ORDER BY timestamp ASC;

-- Get voice messages only
SELECT * FROM messages WHERE audio_url IS NOT NULL ORDER BY timestamp DESC;

-- Soft delete message
UPDATE messages SET deleted_at = strftime('%s', 'now') WHERE id = 'msg-id';
```

### Task Queries

```sql
-- Get user tasks
SELECT * FROM tasks WHERE user_id = 'user-id' AND status = 'queued' ORDER BY priority DESC, created_at ASC;

-- Get harvest queue
SELECT * FROM tasks WHERE status = 'queued' ORDER BY priority DESC, created_at ASC;

-- Update task status
UPDATE tasks SET status = 'running' WHERE id = 'task-id';

-- Complete task
UPDATE tasks SET status = 'completed', result_url = 'url', completed_at = strftime('%s', 'now') WHERE id = 'task-id';

-- Fail task
UPDATE tasks SET status = 'failed', error_message = 'error', retry_count = retry_count + 1 WHERE id = 'task-id';
```

### Opportunity Queries

```sql
-- Get detected opportunities
SELECT * FROM opportunities_with_context WHERE user_id = 'user-id' AND status = 'detected' ORDER BY confidence DESC;

-- Queue opportunity
UPDATE opportunities SET status = 'queued' WHERE id = 'opp-id';

-- Reject opportunity
UPDATE opportunities SET status = 'rejected' WHERE id = 'opp-id';

-- Refine prompt
UPDATE opportunities SET refined_prompt = 'new prompt' WHERE id = 'opp-id';

-- Cleanup expired opportunities
UPDATE opportunities SET status = 'expired' WHERE expires_at < strftime('%s', 'now');
```

### Achievement Queries

```sql
-- Get user achievements
SELECT a.*, ach.name, ach.description, ach.icon
FROM achievements a
JOIN achievement_definitions ach ON a.achievement_type = ach.type
WHERE a.user_id = 'user-id'
ORDER BY a.unlocked_at DESC;

-- Check for achievement
SELECT * FROM achievements WHERE user_id = 'user-id' AND achievement_type = 'first_harvest';

-- Unlock achievement
INSERT INTO achievements (id, user_id, achievement_type, xp_awarded, unlocked_at)
VALUES ('uuid', 'user-id', 'first_harvest', 100, strftime('%s', 'now'));
```

## Wrangler Commands

### Database Operations

```bash
# Create database
wrangler d1 create makerlog-db

# List databases
wrangler d1 list

# Execute migration
wrangler d1 execute makerlog-db --file=./migrations/001_initial_schema.sql

# Execute single command
wrangler d1 execute makerlog-db --command="SELECT * FROM users LIMIT 10"

# Local execution
wrangler d1 execute makerlog-db --local --command="SELECT COUNT(*) FROM tasks"

# Seed data
wrangler d1 execute makerlog-db --file=./seeds/development_data.sql --local
```

### Query Tips

```bash
# Format JSON output
wrangler d1 execute makerlog-db --command="SELECT * FROM users" --json

# Save to file
wrangler d1 execute makerlog-db --command="SELECT * FROM users" > output.json

# Multiple statements
wrangler d1 execute makerlog-db --command="
  SELECT COUNT(*) as total FROM users;
  SELECT AVG(xp) as avg_xp FROM users;
"
```

## Indexes

All indexes for reference:

```sql
-- Users
idx_users_email
idx_users_cloudflare_account
idx_users_level_xp
idx_users_streaks

-- Conversations
idx_conversations_user_created
idx_conversations_user_updated
idx_conversations_message_count

-- Messages
idx_messages_conversation_timestamp
idx_messages_role
idx_messages_deleted

-- Tasks
idx_tasks_user_status
idx_tasks_status_priority
idx_tasks_type
idx_tasks_created

-- Opportunities
idx_opportunities_conversation
idx_opportunities_status
idx_opportunities_expires

-- Achievements
idx_achievements_user
idx_achievements_type

-- Voice Personas
idx_voice_personas_user
idx_voice_personas_system

-- Analytics
idx_analytics_type_hour
idx_analytics_timestamp
```

## Data Types

| Type | Usage | Example |
|------|-------|---------|
| TEXT | IDs, emails, JSON, metadata | `uuid`, `user@example.com` |
| INTEGER | Timestamps, counts, foreign keys | `strftime('%s', 'now')` |
| REAL | Costs, confidence scores | `0.95`, `0.001` |

## Constraints

```sql
-- Foreign keys
ON DELETE CASCADE   -- Delete child records when parent deleted
ON DELETE SET NULL  -- Set foreign key to NULL when parent deleted

-- Check constraints
CHECK(role IN ('user', 'assistant', 'system'))
CHECK(confidence >= 0.0 AND confidence <= 1.0)

-- Unique constraints
UNIQUE(user_id, achievement_type)  -- One achievement per type per user
```

## Triggers

```sql
-- Auto-update conversation timestamp
CREATE TRIGGER update_conversation_timestamp
AFTER INSERT ON messages
BEGIN
  UPDATE conversations SET updated_at = NEW.timestamp WHERE id = NEW.conversation_id;
END;

-- Auto-update user timestamp
CREATE TRIGGER update_user_timestamp
AFTER UPDATE OF xp, level, streak_days ON users
BEGIN
  UPDATE users SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;
```

## Timestamps

All timestamps use **Unix seconds**:

```sql
-- Current timestamp
strftime('%s', 'now')

-- 1 day ago
strftime('%s', 'now', '-1 day')

-- 7 days from now
strftime('%s', 'now', '+7 days')

-- Start of today
strftime('%s', 'now', 'start of day')
```

## JSON Columns

Several columns store JSON as TEXT:

```sql
-- Voice settings
'{"rate":1.0,"pitch":1.0,"volume":1.0,"voiceURI":""}'

-- Voice metadata
'{"emotion":"neutral","confidence":0.96}'

-- Notifications
'{"daily_digest":true,"achievement_alerts":true}'

-- Source messages (array)
'["msg-001","msg-002","msg-003"]'
```

## Batch Operations

```sql
-- Insert multiple records
INSERT INTO users (id, email, xp) VALUES
  ('id1', 'user1@example.com', 100),
  ('id2', 'user2@example.com', 200),
  ('id3', 'user3@example.com', 300);

-- Update multiple records
UPDATE tasks SET status = 'queued' WHERE id IN ('id1', 'id2', 'id3');
```

## Performance Tips

1. **Use indexes** on all WHERE, JOIN, ORDER BY columns
2. **Limit results** with LIMIT clause
3. **Avoid SELECT \*** in production
4. **Use parameterized queries** to prevent SQL injection
5. **Batch operations** when possible
6. **Use views** for complex queries

## Error Handling

```sql
-- Check for existence
SELECT COUNT(*) FROM users WHERE id = 'user-id';

-- Handle foreign key errors
-- Ensure parent record exists before inserting child

-- Handle unique constraint violations
-- Use ON CONFLICT clause: INSERT OR IGNORE, INSERT OR REPLACE, ON CONFLICT DO NOTHING
```
