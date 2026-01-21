-- ============================================================================
-- Makerlog.ai - Test Data Seed
-- ============================================================================
-- Purpose: Seed database with minimal test data for development/testing
-- Usage: wrangler d1 execute makerlog-db --file=./seeds/test_data.sql --env test
--
-- This creates:
-- - 2 test users with different levels and streaks
-- - 3 conversations with mixed voice/text messages
-- - Opportunities and tasks in various states
-- - Sample achievements
-- - System voice personas
-- ============================================================================

-- ============================================================================
-- TEST USERS
-- ============================================================================

-- User 1: Active user with XP, level, and streak
INSERT INTO users (id, email, xp, level, streak_days, last_harvest_at)
VALUES (
  'test-user-001',
  'maker@example.com',
  2500,
  6, -- Level 6: floor(sqrt(2500/100)) + 1
  5,
  strftime('%s', 'now', '-1 day')
)
ON CONFLICT(email) DO NOTHING;

-- User 2: New user with minimal activity
INSERT INTO users (id, email, xp, level, streak_days, last_harvest_at)
VALUES (
  'test-user-002',
  'newbie@example.com',
  50,
  1,
  0,
  NULL
)
ON CONFLICT(email) DO NOTHING;

-- ============================================================================
-- VOICE PERSONAS (System Default)
-- ============================================================================

INSERT INTO voice_personas (id, user_id, name, description, voice_settings, personality_prompt, is_system_persona)
VALUES
  ('persona-professional', NULL, 'Professional Assistant', 'Clear and business-focused', '{"rate":1.0,"pitch":1.0,"volume":1.0}', 'You are a professional assistant. Be concise, clear, and business-oriented in your responses.', 1),
  ('persona-coach', NULL, 'Motivational Coach', 'Energetic and encouraging', '{"rate":1.1,"pitch":1.1,"volume":1.0}', 'You are an encouraging coach. Be energetic, celebrate wins, and keep the user motivated!', 1),
  ('persona-concise', NULL, 'Brief Assistant', 'Minimal and efficient', '{"rate":1.2,"pitch":1.0,"volume":0.9}', 'You are a concise assistant. Keep responses brief and to the point. Avoid unnecessary words.', 1)
ON CONFLICT(id) DO NOTHING;

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================

-- User 1 Conversations
INSERT INTO conversations (id, user_id, title, summary, message_count, created_at, updated_at)
VALUES
  ('conv-001', 'test-user-001', 'Project Ideas Brainstorm', 'Discussion about building a SaaS product for indie makers', 4, strftime('%s', 'now', '-2 days'), strftime('%s', 'now', '-2 days')),
  ('conv-002', 'test-user-001', 'Logo Design Discussion', 'Planning logo design for new app', 2, strftime('%s', 'now', '-1 day'), strftime('%s', 'now', '-1 day'))
ON CONFLICT(id) DO NOTHING;

-- User 2 Conversations
INSERT INTO conversations (id, user_id, title, message_count, created_at, updated_at)
VALUES
  ('conv-003', 'test-user-002', 'Welcome Chat', 2, strftime('%s', 'now', '-12 hours'), strftime('%s', 'now', '-12 hours'))
ON CONFLICT(id) DO NOTHING;

-- ============================================================================
-- MESSAGES (Voice + Text)
-- ============================================================================

-- Conversation 1: Project brainstorm with voice messages
INSERT INTO messages (id, conversation_id, role, content, audio_url, audio_duration, timestamp)
VALUES
  ('msg-001', 'conv-001', 'user', 'I have an idea for a tool that helps makers track their daily progress with voice notes', '/assets/voice/test-user-001/conv-001/001.webm', 8.5, strftime('%s', 'now', '-2 days')),
  ('msg-002', 'conv-001', 'assistant', 'That sounds interesting! Voice-first progress tracking could really help developers who spend a lot of time thinking through ideas verbally. What kind of features are you imagining?', NULL, NULL, strftime('%s', 'now', '-2 days')),
  ('msg-003', 'conv-001', 'user', 'Main features would be automatic transcription, AI-powered opportunity detection like "oh you mentioned needing an icon, I can generate that tonight", and then a daily harvest that runs overnight using free tier credits', '/assets/voice/test-user-001/conv-001/003.webm', 15.2, strftime('%s', 'now', '-2 days')),
  ('msg-004', 'conv-001', 'assistant', 'I love that concept! It gamifies the free tier usage. So users talk through their day, the system detects tasks, and executes them during off-peak hours. That is brilliant for quota optimization!', NULL, NULL, strftime('%s', 'now', '-2 days'))
ON CONFLICT(id) DO NOTHING;

-- Conversation 2: Logo design discussion
INSERT INTO messages (id, conversation_id, role, content, audio_url, audio_duration, timestamp)
VALUES
  ('msg-005', 'conv-002', 'user', 'I need a logo for my app. It should be modern, minimal, and use a purple color scheme', '/assets/voice/test-user-001/conv-002/005.webm', 6.8, strftime('%s', 'now', '-1 day')),
  ('msg-006', 'conv-002', 'assistant', 'Got it! A modern, minimal logo in purple. I have detected an opportunity to generate some logo concepts for you overnight. Would you like me to queue that up?', NULL, NULL, strftime('%s', 'now', '-1 day'))
ON CONFLICT(id) DO NOTHING;

-- Conversation 3: New user welcome
INSERT INTO messages (id, conversation_id, role, content, timestamp)
VALUES
  ('msg-007', 'conv-003', 'user', 'Hi, I am new here. How does this work?', strftime('%s', 'now', '-12 hours')),
  ('msg-008', 'conv-003', 'assistant', 'Welcome to Makerlog.ai! Just press and hold the microphone button to talk. I will transcribe your voice, respond, and detect opportunities for things I can generate overnight (like images, code, or text). Check your dashboard to see queued tasks and harvest them when ready!', strftime('%s', 'now', '-12 hours'))
ON CONFLICT(id) DO NOTHING;

-- ============================================================================
-- OPPORTUNITIES (Detected from conversations)
-- ============================================================================

INSERT INTO opportunities (id, conversation_id, type, prompt, confidence, source_messages, status, created_at)
VALUES
  ('opp-001', 'conv-002', 'image', 'Generate a modern, minimal logo design with a purple color scheme for a tech startup app. The logo should be clean, professional, and suitable for both light and dark backgrounds. Style should be geometric with abstract shapes.', 0.92, '["msg-005"]', 'detected', strftime('%s', 'now', '-1 day')),
  ('opp-002', 'conv-001', 'text', 'Write a one-page product description for a voice-first progress tracking tool for indie makers. Highlight features: automatic transcription, AI-powered opportunity detection, and overnight batch processing using free tier credits.', 0.85, '["msg-001", "msg-003"]', 'detected', strftime('%s', 'now', '-2 days')),
  ('opp-003', 'conv-001', 'code', 'Generate a React component for a push-to-talk voice recording button with visual feedback. The button should show recording state with a pulsing animation and display audio duration.', 0.78, '["msg-003"]', 'queued', strftime('%s', 'now', '-2 days'))
ON CONFLICT(id) DO NOTHING;

-- ============================================================================
-- TASKS (Various states)
-- ============================================================================

INSERT INTO tasks (id, user_id, type, status, prompt, priority, result_url, cost_estimate, actual_cost, created_at, completed_at)
VALUES
  -- Completed tasks
  ('task-001', 'test-user-001', 'image-gen', 'completed', 'A minimalist purple geometric logo design suitable for a tech startup', 2, '/assets/images/test-user-001/task-001.png', 0.001, 0.00095, strftime('%s', 'now', '-3 days'), strftime('%s', 'now', '-3 days')),
  ('task-002', 'test-user-001', 'text-gen', 'completed', 'Generate a product tagline for a voice-first productivity app', 1, '/assets/text/test-user-001/task-002.txt', 0.0001, 0.00008, strftime('%s', 'now', '-2 days'), strftime('%s', 'now', '-2 days')),

  -- Queued tasks
  ('task-003', 'test-user-001', 'code-gen', 'queued', 'React push-to-talk button component with pulsing animation', 2, NULL, 0.0002, NULL, strftime('%s', 'now', '-2 days'), NULL),
  ('task-004', 'test-user-001', 'image-gen', 'queued', 'Generate a set of 5 app icon variations in purple theme', 1, NULL, 0.005, NULL, strftime('%s', 'now', '-1 day'), NULL),

  -- Failed task
  ('task-005', 'test-user-001', 'text-gen', 'failed', 'This task was designed to fail for testing', 1, NULL, 0.0001, NULL, strftime('%s', 'now', '-5 days'), strftime('%s', 'now', '-5 days'))
ON CONFLICT(id) DO NOTHING;

-- Update the failed task error message
UPDATE tasks SET error_message = 'Simulated failure for testing purposes' WHERE id = 'task-005';

-- ============================================================================
-- ACHIEVEMENTS
-- ============================================================================

INSERT INTO achievements (id, user_id, achievement_type, xp_awarded, unlocked_at)
VALUES
  ('ach-001', 'test-user-001', 'first_harvest', 100, strftime('%s', 'now', '-3 days')),
  ('ach-002', 'test-user-001', 'hundred_tasks', 1500, strftime('%s', 'now', '-10 days'))
ON CONFLICT(user_id, achievement_type) DO NOTHING;

-- ============================================================================
-- USER SETTINGS
-- ============================================================================

INSERT INTO user_settings (user_id, active_persona_id, notifications, privacy, accessibility, updated_at)
VALUES
  ('test-user-001', 'persona-professional', '{"daily_digest":true,"achievement_alerts":true,"streak_warnings":true}', '{"share_streaks":false,"share_achievements":false,"data_retention_days":90}', '{"high_contrast":false,"reduced_motion":false,"font_size":"normal"}', strftime('%s', 'now')),
  ('test-user-002', 'persona-coach', '{"daily_digest":true,"achievement_alerts":true,"streak_warnings":false}', '{"share_streaks":false,"share_achievements":false,"data_retention_days":30}', '{"high_contrast":false,"reduced_motion":true,"font_size":"large"}', strftime('%s', 'now'))
ON CONFLICT(user_id) DO NOTHING;

-- ============================================================================
-- ANALYTICS EVENTS (Anonymized)
-- ============================================================================

-- Sample analytics events (aggregated, no PII)
INSERT INTO analytics_events (id, event_type, event_data, timestamp_hour, user_hash, dimensions)
VALUES
  ('evt-001', 'voice_transcribe', '{"success":true,"duration_seconds":8.5,"model":"whisper"}', strftime('%s', 'now', '-2 days', 'start of hour'), 'a1b2c3d4', '{"region":"us-east"}'),
  ('evt-002', 'task_completed', '{"task_type":"image-gen","duration_seconds":2.3,"model":"stable-diffusion"}', strftime('%s', 'now', '-3 days', 'start of hour'), 'a1b2c3d4', '{"region":"us-east"}'),
  ('evt-003', 'opportunity_detected', '{"type":"image","confidence":0.92,"source":"voice"}', strftime('%s', 'now', '-1 day', 'start of hour'), 'a1b2c3d4', '{"region":"us-east"}')
ON CONFLICT(id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Display seed data summary
SELECT 'Test Data Seeded Successfully' as status;

SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages
UNION ALL
SELECT 'Opportunities', COUNT(*) FROM opportunities
UNION ALL
SELECT 'Tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'Achievements', COUNT(*) FROM achievements
UNION ALL
SELECT 'Voice Personas', COUNT(*) FROM voice_personas;
