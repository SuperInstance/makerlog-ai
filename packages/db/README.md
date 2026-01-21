# Makerlog.ai Database Schema

Production-ready database schema for Cloudflare D1 (SQLite).

## Overview

This database supports Makerlog.ai's core functionality:
- **User Management**: Accounts with gamification (XP, levels, streaks)
- **Voice-First Conversations**: Audio storage with transcriptions
- **Opportunity Detection**: AI-detected generative tasks
- **Task Queue**: Overnight batch processing with quota optimization
- **Achievement System**: Gamification and user engagement
- **Privacy-First Analytics**: Anonymized event tracking

## Directory Structure

```
packages/db/
├── schema.sql                    # Complete database schema with documentation
├── migrations/
│   └── 001_initial_schema.sql    # Initial schema migration
├── seeds/
│   ├── test_data.sql             # Minimal test data
│   └── development_data.sql      # Comprehensive development data
└── README.md                     # This file
```

## Quick Start

### 1. Create D1 Database

```bash
# Create production database
wrangler d1 create makerlog-db

# Create development database
wrangler d1 create makerlog-db-dev

# Create test database
wrangler d1 create makerlog-db-test
```

Add the binding IDs to your `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "makerlog-db"
database_id = "<your-database-id>"

[[d1_databases]]
binding = "DB"
database_name = "makerlog-db-dev"
database_id = "<your-dev-database-id>"
```

### 2. Run Migrations

```bash
# Production
wrangler d1 execute makerlog-db --file=./migrations/001_initial_schema.sql

# Development
wrangler d1 execute makerlog-db-dev --file=./migrations/001_initial_schema.sql --local

# Test
wrangler d1 execute makerlog-db-test --file=./migrations/001_initial_schema.sql --local
```

### 3. Seed Data (Optional)

```bash
# Test data (minimal, for CI/CD)
wrangler d1 execute makerlog-db-test --file=./seeds/test_data.sql --local

# Development data (comprehensive, for local dev)
wrangler d1 execute makerlog-db-dev --file=./seeds/development_data.sql --local
```

## Schema Overview

### Core Tables

#### `users`
User accounts with gamification state.

```sql
id                    TEXT PRIMARY KEY
email                 TEXT UNIQUE NOT NULL
cloudflare_account_id TEXT UNIQUE
xp                    INTEGER DEFAULT 0
level                 INTEGER DEFAULT 1
streak_days           INTEGER DEFAULT 0
last_harvest_at       INTEGER
voice_persona_id      TEXT
tts_settings          TEXT DEFAULT '{"rate":1.0,"pitch":1.0,"volume":1.0}'
accessibility_mode    TEXT DEFAULT 'standard'
created_at            INTEGER NOT NULL
updated_at            INTEGER NOT NULL
```

**Key Indexes:**
- `idx_users_email`
- `idx_users_level_xp` (for leaderboards)
- `idx_users_streaks` (for streak tracking)

#### `conversations`
Voice and text conversation metadata.

```sql
id            TEXT PRIMARY KEY
user_id       TEXT NOT NULL (FK → users)
title         TEXT NOT NULL
summary       TEXT
message_count INTEGER DEFAULT 0
created_at    INTEGER NOT NULL
updated_at    INTEGER NOT NULL
```

**Key Indexes:**
- `idx_conversations_user_created`
- `idx_conversations_user_updated`

#### `messages`
Individual messages in conversations.

```sql
id              TEXT PRIMARY KEY
conversation_id TEXT NOT NULL (FK → conversations)
role            TEXT NOT NULL (user|assistant|system)
content         TEXT NOT NULL
audio_url       TEXT
audio_duration  REAL
voice_metadata  TEXT (JSON)
timestamp       INTEGER NOT NULL
deleted_at      INTEGER
```

**Key Indexes:**
- `idx_messages_conversation_timestamp`
- `idx_messages_role`

**Note:** Vector embeddings are stored externally in Vectorize, with `message_id` as the vector ID.

#### `tasks`
Generative tasks queued for execution.

```sql
id             TEXT PRIMARY KEY
user_id        TEXT NOT NULL (FK → users)
type           TEXT NOT NULL (image-gen|text-gen|code-gen|code-summary|research)
status         TEXT NOT NULL (queued|running|completed|failed|cancelled)
prompt         TEXT NOT NULL
refined_prompt TEXT
priority       INTEGER DEFAULT 1
result_url     TEXT
cost_estimate  REAL NOT NULL
actual_cost    REAL
error_message  TEXT
retry_count    INTEGER DEFAULT 0
created_at     INTEGER NOT NULL
completed_at   INTEGER
```

**Key Indexes:**
- `idx_tasks_user_status` (user task list)
- `idx_tasks_status_priority` (harvest queue)

#### `opportunities`
AI-detected generative opportunities.

```sql
id               TEXT PRIMARY KEY
conversation_id  TEXT NOT NULL (FK → conversations)
type             TEXT NOT NULL (image|code|text)
prompt           TEXT NOT NULL
refined_prompt   TEXT
confidence       REAL NOT NULL (0.0-1.0)
source_messages  TEXT NOT NULL (JSON array)
status           TEXT NOT NULL (detected|queued|rejected|expired)
metadata         TEXT
created_at       INTEGER NOT NULL
expires_at       INTEGER NOT NULL (7 days)
```

**Key Indexes:**
- `idx_opportunities_status`
- `idx_opportunities_expires` (for cleanup)

#### `achievements`
Unlocked achievements for users.

```sql
id               TEXT PRIMARY KEY
user_id          TEXT NOT NULL (FK → users)
achievement_type TEXT NOT NULL
xp_awarded       INTEGER NOT NULL
unlocked_at      INTEGER NOT NULL
UNIQUE(user_id, achievement_type)
```

**Key Indexes:**
- `idx_achievements_user`

### Optional Tables

#### `voice_personas`
Custom voice personas for TTS customization.

```sql
id                TEXT PRIMARY KEY
user_id           TEXT (FK → users, NULL for system personas)
name              TEXT NOT NULL
description       TEXT
voice_settings    TEXT NOT NULL (JSON)
personality_prompt TEXT
is_system_persona INTEGER DEFAULT 0
created_at        INTEGER NOT NULL
updated_at        INTEGER NOT NULL
```

#### `user_settings`
User preferences and settings.

```sql
user_id        TEXT PRIMARY KEY (FK → users)
active_persona_id TEXT (FK → voice_personas)
notifications  TEXT (JSON)
privacy        TEXT (JSON)
accessibility  TEXT (JSON)
updated_at     INTEGER NOT NULL
```

#### `analytics_events`
Privacy-first analytics (no PII).

```sql
id             TEXT PRIMARY KEY
event_type     TEXT NOT NULL
event_data     TEXT NOT NULL (JSON, sanitized)
timestamp_hour INTEGER NOT NULL (truncated for privacy)
user_hash      TEXT (one-way hash, salted)
dimensions     TEXT (JSON)
```

## Database Triggers

### `update_conversation_timestamp`
Updates `conversations.updated_at` and increments `message_count` when a new message is added.

### `update_user_timestamp`
Updates `users.updated_at` when gamification fields change (XP, level, streak).

### `expire_opportunities`
Automatically sets `status = 'expired'` for opportunities past their 7-day expiry.

## Database Views

### `user_profile`
Aggregated user profile with stats:
- Conversation count
- Message count
- Completed tasks
- Achievement count

### `opportunities_with_context`
Opportunities joined with conversation metadata for display.

### `tasks_stats`
Task statistics by user, type, and status:
- Count
- Average duration
- Average cost

## Foreign Key Relationships

```
users (id)
├── conversations.user_id
├── tasks.user_id
├── achievements.user_id
├── voice_personas.user_id
└── user_settings.user_id

conversations (id)
├── messages.conversation_id
└── opportunities.conversation_id

voice_personas (id)
└── user_settings.active_persona_id
```

**Cascade Policies:**
- `ON DELETE CASCADE`: Users → conversations, tasks, achievements, etc.
- `ON DELETE SET NULL`: user_settings.active_persona_id

## Common Query Patterns

### Get user with stats
```sql
SELECT * FROM user_profile WHERE id = ?;
```

### Get conversation with messages
```sql
SELECT * FROM conversations WHERE id = ? AND user_id = ?;
SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC;
```

### Get pending tasks for harvest
```sql
SELECT * FROM tasks
WHERE user_id = ? AND status = 'queued'
ORDER BY priority DESC, created_at ASC;
```

### Get detected opportunities
```sql
SELECT * FROM opportunities_with_context
WHERE user_id = ? AND status = 'detected'
ORDER BY confidence DESC, created_at DESC;
```

### Check achievements
```sql
SELECT * FROM achievements
WHERE user_id = ?
ORDER BY unlocked_at DESC;
```

## Migration Strategy

### Creating New Migrations

1. Create a new migration file:
```bash
touch migrations/002_add_feature_x.sql
```

2. Add your SQL changes:
```sql
-- Migration 002: Add feature_x
ALTER TABLE users ADD COLUMN feature_x_enabled INTEGER DEFAULT 0;

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at, rollback_sql)
VALUES (2, '002_add_feature_x', datetime('now'), 'ALTER TABLE users DROP COLUMN feature_x_enabled;');
```

3. Apply migration:
```bash
wrangler d1 execute makerlog-db --file=./migrations/002_add_feature_x.sql
```

### Rollback Strategy

Each migration includes a `rollback_sql` field. To rollback:

```sql
-- Get rollback SQL
SELECT rollback_sql FROM schema_migrations WHERE version = 2;

-- Execute rollback
ALTER TABLE users DROP COLUMN feature_x_enabled;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = 2;
```

**Warning:** Rollbacks in production should be carefully planned and tested.

## Seed Data

### Test Data (`test_data.sql`)
Minimal dataset for CI/CD and testing:
- 2 users (power user + new user)
- 3 conversations
- Voice + text messages
- Opportunities and tasks
- System voice personas

### Development Data (`development_data.sql`)
Comprehensive dataset for local development:
- 10 diverse users (power users, regular, new, inactive)
- 50+ conversations with realistic dialogue
- Mixed voice and text messages
- Opportunities across all types
- Tasks in various states
- Achievement unlocks showing progression
- Custom voice personas
- Analytics events

## Best Practices

### 1. Always Use Parameterized Queries
```typescript
// GOOD
await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

// BAD (SQL injection risk)
await env.DB.prepare(`SELECT * FROM users WHERE id = '${userId}'`).first();
```

### 2. Use Transactions for Multi-Step Operations
```typescript
// D1 supports transactions via batch operations
await env.DB.batch([
  env.DB.prepare('INSERT INTO conversations (...) VALUES (...)'),
  env.DB.prepare('INSERT INTO messages (...) VALUES (...)')
]);
```

### 3. Index Common Query Patterns
Add indexes for:
- Foreign keys (user_id, conversation_id, etc.)
- Common filters (status, type, created_at)
- Sort orders (updated_at DESC, priority DESC)

### 4. Use Appropriate Data Types
- `TEXT` for IDs (UUIDs)
- `INTEGER` for timestamps (Unix seconds)
- `REAL` for costs and confidence scores
- `TEXT` for JSON metadata

### 5. Consider D1 Limitations
- Max database size: 5 GB (free tier)
- Max rows read: 10,000 per query
- Max rows written: 1,000 per batch
- Query timeout: 30 seconds CPU time

## Performance Optimization

### Query Optimization
1. **Use indexes** for all WHERE, JOIN, and ORDER BY columns
2. **Limit results** with LIMIT clause (default 50-100)
3. **Avoid SELECT \*** in production, specify columns
4. **Use views** for complex aggregates

### Caching Strategy
1. **KV cache** for user quota (60s TTL)
2. **Computed values** stored in tables (message_count, xp, level)
3. **Denormalized views** for common read patterns

### Cleanup Jobs
Run periodically to maintain performance:
```sql
-- Delete old soft-deleted messages (30 days)
DELETE FROM messages WHERE deleted_at < strftime('%s', 'now', '-30 days');

-- Delete expired opportunities
UPDATE opportunities SET status = 'expired' WHERE expires_at < strftime('%s', 'now');

-- Aggregate old analytics events
DELETE FROM analytics_events WHERE timestamp_hour < strftime('%s', 'now', '-90 days');
```

## Security Considerations

### 1. Input Validation
Always validate and sanitize user input before database operations.

### 2. Privacy Protection
- Use `user_hash` (one-way hash) in analytics, not direct `user_id`
- Truncate timestamps to hour/day granularity where possible
- Never store voice recordings in analytics, only metadata

### 3. Data Retention
- Implement automatic cleanup of old data
- Provide user data export (GDPR right to portability)
- Provide user data deletion (GDPR right to be forgotten)

### 4. Access Control
- Always include `user_id` in WHERE clauses
- Use Cloudflare Workers authentication headers
- Implement row-level security via application logic

## Troubleshooting

### Common Issues

**Issue**: Foreign key constraint fails
```bash
# Solution: Ensure referenced records exist before inserting
# Check the foreign key value is valid
```

**Issue**: Query timeout
```bash
# Solution: Reduce result set with LIMIT
# Add missing indexes
# Break complex queries into smaller ones
```

**Issue**: Database locked
```bash
# Solution: D1 handles concurrency automatically
# Ensure you're not creating long-running transactions
```

### Debug Queries

Use `wrangler d1 execute` with `--command` flag:

```bash
# Query production data
wrangler d1 execute makerlog-db --command="SELECT COUNT(*) FROM users"

# Query local data
wrangler d1 execute makerlog-db --local --command="SELECT * FROM tasks LIMIT 10"
```

## Additional Resources

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

## Support

For issues or questions about the database schema:
1. Check this README
2. Review inline comments in `schema.sql`
3. Consult the main project CLAUDE.md

---

**Last Updated**: 2026-01-21
**Schema Version**: 1.0.0
**Migration Version**: 001
