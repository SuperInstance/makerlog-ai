-- ============================================================================
-- Makerlog.ai - Development Data Seed
-- ============================================================================
-- Purpose: Populate database with comprehensive development data
-- Usage: wrangler d1 execute makerlog-db --file=./seeds/development_data.sql --env development
--
-- This creates a realistic development environment with:
-- - 10 diverse users with varying engagement levels
-- - 50+ conversations with realistic dialogue
-- - Mixed voice and text messages
-- - Opportunities across all types (image, code, text)
-- - Tasks in various states (queued, running, completed, failed)
-- - Achievement unlocks showing progression
-- - System voice personas and user customizations
-- - Privacy-first analytics events
-- ============================================================================

-- ============================================================================
-- DEVELOPMENT USERS
-- ============================================================================

-- Power User: High XP, high streak, lots of activity
INSERT INTO users (id, email, xp, level, streak_days, last_harvest_at, created_at)
VALUES ('dev-user-001', 'poweruser@makerlog.dev', 10000, 11, 30, strftime('%s', 'now'), strftime('%s', 'now', '-60 days'))
ON CONFLICT(email) DO NOTHING;

-- Regular Users: Mixed activity levels
INSERT INTO users (id, email, xp, level, streak_days, last_harvest_at, created_at)
VALUES
  ('dev-user-002', 'sarah@makerlog.dev', 3500, 7, 12, strftime('%s', 'now', '-2 days'), strftime('%s', 'now', '-45 days')),
  ('dev-user-003', 'mike@makerlog.dev', 1200, 4, 5, strftime('%s', 'now', '-1 day'), strftime('%s', 'now', '-30 days')),
  ('dev-user-004', 'emma@makerlog.dev', 500, 3, 2, strftime('%s', 'now', '-5 days'), strftime('%s', 'now', '-20 days')),
  ('dev-user-005', 'alex@makerlog.dev', 2500, 6, 0, NULL, strftime('%s', 'now', '-40 days'))
ON CONFLICT(email) DO NOTHING;

-- New Users: Recently joined, minimal activity
INSERT INTO users (id, email, xp, level, streak_days, last_harvest_at, created_at)
VALUES
  ('dev-user-006', 'newbie1@makerlog.dev', 50, 1, 0, NULL, strftime('%s', 'now', '-3 days')),
  ('dev-user-007', 'newbie2@makerlog.dev', 150, 2, 1, strftime('%s', 'now', '-1 day'), strftime('%s', 'now', '-5 days')),
  ('dev-user-008', 'newbie3@makerlog.dev', 0, 1, 0, NULL, strftime('%s', 'now', '-1 day'))
ON CONFLICT(email) DO NOTHING;

-- Inactive Users: Haven't used in a while
INSERT INTO users (id, email, xp, level, streak_days, last_harvest_at, created_at)
VALUES
  ('dev-user-009', 'lapsed@makerlog.dev', 800, 4, 0, strftime('%s', 'now', '-30 days'), strftime('%s', 'now', '-60 days')),
  ('dev-user-010', 'returning@makerlog.dev', 200, 3, 0, NULL, strftime('%s', 'now', '-15 days'))
ON CONFLICT(email) DO NOTHING;

-- ============================================================================
-- VOICE PERSONAS (System Defaults)
-- ============================================================================

INSERT INTO voice_personas (id, user_id, name, description, voice_settings, personality_prompt, is_system_persona)
VALUES
  ('persona-professional', NULL, 'Professional Assistant', 'Clear, concise, business-focused communication', '{"rate":1.0,"pitch":1.0,"volume":1.0,"voiceURI":""}', 'You are a professional AI assistant. Be clear, concise, and business-oriented. Focus on practical advice and actionable insights.', 1),
  ('persona-coach', NULL, 'Motivational Coach', 'Energetic, encouraging, celebrates wins', '{"rate":1.1,"pitch":1.1,"volume":1.0,"voiceURI":""}', 'You are an encouraging coach! Be energetic, celebrate wins, provide motivation, and keep the user inspired to achieve their goals.', 1),
  ('persona-concise', NULL, 'Brief Assistant', 'Minimal, efficient, to-the-point', '{"rate":1.2,"pitch":1.0,"volume":0.9,"voiceURI":""}', 'You are a concise assistant. Keep responses brief and direct. Avoid unnecessary words. Get straight to the point.', 1),
  ('persona-creative', NULL, 'Creative Muse', 'Imaginative, inspiring, brainstorming-focused', '{"rate":0.95,"pitch":1.05,"volume":1.0,"voiceURI":""}', 'You are a creative muse. Be imaginative, think outside the box, and help the user explore innovative ideas and possibilities.', 1),
  ('persona-technical', NULL, 'Technical Lead', 'Code-focused, architecture-oriented', '{"rate":1.0,"pitch":1.0,"volume":1.0,"voiceURI":""}', 'You are a technical lead. Focus on code quality, architecture, best practices, and technical implementation details.', 1)
ON CONFLICT(id) DO NOTHING;

-- Custom user persona
INSERT INTO voice_personas (id, user_id, name, description, voice_settings, personality_prompt, is_system_persona)
VALUES
  ('persona-custom-001', 'dev-user-001', 'My Maker Voice', 'Optimized for my indie hacking workflow', '{"rate":1.05,"pitch":1.0,"volume":1.0,"voiceURI":"Google US English"}', 'You are my personal maker assistant. Focus on indie hacking, SaaS products, and rapid prototyping. Be practical and action-oriented.', 0)
ON CONFLICT(id) DO NOTHING;

-- ============================================================================
-- USER SETTINGS
-- ============================================================================

INSERT INTO user_settings (user_id, active_persona_id, notifications, privacy, accessibility, updated_at)
VALUES
  ('dev-user-001', 'persona-custom-001', '{"daily_digest":true,"achievement_alerts":true,"streak_warnings":true,"weekly_report":true}', '{"share_streaks":true,"share_achievements":true,"data_retention_days":365}', '{"high_contrast":false,"reduced_motion":false,"font_size":"normal","closed_captions":true}', strftime('%s', 'now')),
  ('dev-user-002', 'persona-coach', '{"daily_digest":true,"achievement_alerts":true,"streak_warnings":true,"weekly_report":false}', '{"share_streaks":false,"share_achievements":false,"data_retention_days":90}', '{"high_contrast":true,"reduced_motion":false,"font_size":"large","closed_captions":true}', strftime('%s', 'now')),
  ('dev-user-003', 'persona-technical', '{"daily_digest":false,"achievement_alerts":true,"streak_warnings":false,"weekly_report":false}', '{"share_streaks":false,"share_achievements":false,"data_retention_days":30}', '{"high_contrast":false,"reduced_motion":true,"font_size":"normal","closed_captions":false}', strftime('%s', 'now')),
  ('dev-user-004', 'persona-creative', '{"daily_digest":true,"achievement_alerts":true,"streak_warnings":true,"weekly_report":true}', '{"share_streaks":true,"share_achievements":true,"data_retention_days":180}', '{"high_contrast":false,"reduced_motion":false,"font_size":"normal","closed_captions":true}', strftime('%s', 'now')),
  ('dev-user-005', 'persona-professional', '{"daily_digest":true,"achievement_alerts":false,"streak_warnings":false,"weekly_report":false}', '{"share_streaks":false,"share_achievements":false,"data_retention_days":60}', '{"high_contrast":false,"reduced_motion":false,"font_size":"normal","closed_captions":false}', strftime('%s', 'now')),
  ('dev-user-006', 'persona-coach', '{"daily_digest":true,"achievement_alerts":true,"streak_warnings":true,"weekly_report":false}', '{"share_streaks":false,"share_achievements":false,"data_retention_days":30}', '{"high_contrast":false,"reduced_motion":false,"font_size":"normal","closed_captions":true}', strftime('%s', 'now')),
  ('dev-user-007', 'persona-concise', '{"daily_digest":false,"achievement_alerts":true,"streak_warnings":false,"weekly_report":false}', '{"share_streaks":false,"share_achievements":false,"data_retention_days":30}', '{"high_contrast":false,"reduced_motion":false,"font_size":"normal","closed_captions":false}', strftime('%s', 'now')),
  ('dev-user-008', 'persona-professional', '{"daily_digest":true,"achievement_alerts":true,"streak_warnings":true,"weekly_report":false}', '{"share_streaks":false,"share_achievements":false,"data_retention_days":30}', '{"high_contrast":false,"reduced_motion":false,"font_size":"normal","closed_captions":false}', strftime('%s', 'now'))
ON CONFLICT(user_id) DO NOTHING;

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================

-- Power user conversations (multiple, active)
INSERT INTO conversations (id, user_id, title, summary, message_count, created_at, updated_at)
VALUES
  ('conv-dev-001', 'dev-user-001', 'SaaS MVP Planning', 'Planning core features for new project management tool', 12, strftime('%s', 'now', '-7 days'), strftime('%s', 'now', '-1 day')),
  ('conv-dev-002', 'dev-user-001', 'Marketing Copy Brainstorm', 'Generating copy for launch announcement', 8, strftime('%s', 'now', '-5 days'), strftime('%s', 'now', '-2 days')),
  ('conv-dev-003', 'dev-user-001', 'Database Architecture', 'Discussing schema design and relationships', 6, strftime('%s', 'now', '-3 days'), strftime('%s', 'now', '-3 days')),
  ('conv-dev-004', 'dev-user-001', 'UI/UX Design Review', 'Reviewing dashboard mockup designs', 10, strftime('%s', 'now', '-10 days'), strftime('%s', 'now', '-10 days'))
ON CONFLICT(id) DO NOTHING;

-- Regular user conversations
INSERT INTO conversations (id, user_id, title, summary, message_count, created_at, updated_at)
VALUES
  ('conv-dev-005', 'dev-user-002', 'App Icon Ideas', 'Brainstorming logo concepts for fitness app', 6, strftime('%s', 'now', '-4 days'), strftime('%s', 'now', '-2 days')),
  ('conv-dev-006', 'dev-user-002', 'Onboarding Flow', 'Planning user onboarding experience', 4, strftime('%s', 'now', '-3 days'), strftime('%s', 'now', '-3 days')),
  ('conv-dev-007', 'dev-user-003', 'API Documentation', 'Writing API docs for backend service', 5, strftime('%s', 'now', '-2 days'), strftime('%s', 'now', '-2 days')),
  ('conv-dev-008', 'dev-user-004', 'Landing Page Copy', 'Creating compelling landing page text', 7, strftime('%s', 'now', '-6 days'), strftime('%s', 'now', '-6 days')),
  ('conv-dev-009', 'dev-user-005', 'Feature Prioritization', 'Deciding which features to build first', 4, strftime('%s', 'now', '-8 days'), strftime('%s', 'now', '-8 days'))
ON CONFLICT(id) DO NOTHING;

-- New user conversations
INSERT INTO conversations (id, user_id, title, message_count, created_at, updated_at)
VALUES
  ('conv-dev-010', 'dev-user-006', 'Getting Started', 2, strftime('%s', 'now', '-3 days'), strftime('%s', 'now', '-3 days')),
  ('conv-dev-011', 'dev-user-007', 'First Project Ideas', 3, strftime('%s', 'now', '-2 days'), strftime('%s', 'now', '-1 day')),
  ('conv-dev-012', 'dev-user-008', 'Welcome to Makerlog', 2, strftime('%s', 'now', '-1 day'), strftime('%s', 'now', '-1 day'))
ON CONFLICT(id) DO NOTHING;

-- ============================================================================
-- MESSAGES (Mixed voice and text)
-- ============================================================================

-- Conversation 1: SaaS MVP Planning (voice-heavy)
INSERT INTO messages (id, conversation_id, role, content, audio_url, audio_duration, voice_metadata, timestamp)
VALUES
  ('msg-dev-001', 'conv-dev-001', 'user', 'I am building a project management tool for indie developers. The core idea is that it automatically breaks down large projects into small tasks using AI', '/assets/voice/dev-user-001/conv-dev-001/001.webm', 12.5, '{"emotion":"neutral","confidence":0.96}', strftime('%s', 'now', '-7 days')),
  ('msg-dev-002', 'conv-dev-001', 'assistant', 'That sounds powerful! Automated task breakdown could save so much planning time. What is the key differentiator from existing tools like Jira or Linear?', NULL, NULL, NULL, strftime('%s', 'now', '-7 days')),
  ('msg-dev-003', 'conv-dev-001', 'user', 'The big difference is that it is voice-first. You just talk about what you are building, and it extracts tasks, deadlines, and dependencies automatically. Plus it learns your patterns over time', '/assets/voice/dev-user-001/conv-dev-001/003.webm', 18.2, '{"emotion":"excited","confidence":0.94}', strftime('%s', 'now', '-7 days')),
  ('msg-dev-004', 'conv-dev-001', 'assistant', 'I love that! So it is like having a PM assistant that listens to your natural language and creates structured plans. Are you thinking about integrations with GitHub or other dev tools?', NULL, NULL, NULL, strftime('%s', 'now', '-7 days')),
  ('msg-dev-005', 'conv-dev-001', 'user', 'Yes! GitHub integration is critical. I want it to automatically create issues and pull requests based on the voice conversations', '/assets/voice/dev-user-001/conv-dev-001/005.webm', 9.8, '{"emotion":"neutral","confidence":0.97}', strftime('%s', 'now', '-6 days'))
ON CONFLICT(id) DO NOTHING;

-- Conversation 2: Marketing Copy
INSERT INTO messages (id, conversation_id, role, content, audio_url, audio_duration, timestamp)
VALUES
  ('msg-dev-006', 'conv-dev-002', 'user', 'I need help writing launch copy for my product. It is a voice-first dev tool called Makerlog', '/assets/voice/dev-user-001/conv-dev-002/006.webm', 8.3, strftime('%s', 'now', '-5 days')),
  ('msg-dev-007', 'conv-dev-002', 'assistant', 'Exciting! Let me help you craft compelling launch copy. What are the key benefits you want to highlight?', NULL, NULL, strftime('%s', 'now', '-5 days')),
  ('msg-dev-008', 'conv-dev-002', 'user', 'Main benefits: gamified quota harvesting, automatic opportunity detection, and overnight batch execution using free tier credits. Basically, talk all day, build all night', '/assets/voice/dev-user-001/conv-dev-002/008.webm', 14.1, strftime('%s', 'now', '-5 days')),
  ('msg-dev-009', 'conv-dev-002', 'assistant', 'That tagline is gold! "Talk all day, build all night" really captures the essence. I can help generate marketing copy, social media posts, and launch announcements for this.', NULL, NULL, strftime('%s', 'now', '-5 days'))
ON CONFLICT(id) DO NOTHING;

-- Conversation 3: Database Architecture
INSERT INTO messages (id, conversation_id, role, content, timestamp)
VALUES
  ('msg-dev-010', 'conv-dev-003', 'user', 'I need to design a database schema for a multi-tenant SaaS application. Each tenant has users, projects, and tasks with hierarchical relationships', strftime('%s', 'now', '-3 days')),
  ('msg-dev-011', 'conv-dev-003', 'assistant', 'Got it! For multi-tenant SaaS, you will want to consider tenant isolation strategies. Are you thinking row-level security with tenant_id on every table, or separate schemas per tenant?', strftime('%s', 'now', '-3 days')),
  ('msg-dev-012', 'conv-dev-003', 'user', 'Row-level with tenant_id seems simpler to start. I am worried about query performance as we scale though', strftime('%s', 'now', '-3 days')),
  ('msg-dev-013', 'conv-dev-003', 'assistant', 'Good instinct. With proper indexing on tenant_id and potentially using partitioning later, row-level security scales well for thousands of tenants. I can help design the optimal schema.', strftime('%s', 'now', '-3 days'))
ON CONFLICT(id) DO NOTHING;

-- More brief conversations for realism
INSERT INTO messages (id, conversation_id, role, content, audio_url, audio_duration, timestamp)
VALUES
  ('msg-dev-014', 'conv-dev-010', 'user', 'Hi, I just joined. What can this tool do?', '/assets/voice/dev-user-006/conv-dev-010/014.webm', 5.2, strftime('%s', 'now', '-3 days')),
  ('msg-dev-015', 'conv-dev-010', 'assistant', 'Welcome to Makerlog! Press the mic button to talk. I will transcribe your voice, respond intelligently, and detect opportunities for things I can generate overnight (images, code, text). Check your dashboard to see what is queued!', NULL, NULL, strftime('%s', 'now', '-3 days')),
  ('msg-dev-016', 'conv-dev-011', 'user', 'I want to build a weather app but I do not know where to start', '/assets/voice/dev-user-007/conv-dev-011/016.webm', 7.1, strftime('%s', 'now', '-2 days')),
  ('msg-dev-017', 'conv-dev-011', 'assistant', 'Great project idea! I can help you generate a starter React component, suggest an API for weather data, and create some initial UI mockups. Which would you like to tackle first?', NULL, NULL, strftime('%s', 'now', '-2 days')),
  ('msg-dev-018', 'conv-dev-011', 'user', 'Let is start with the UI mockups. I am thinking clean, minimal design with a gradient background', '/assets/voice/dev-user-007/conv-dev-011/018.webm', 9.4, strftime('%s', 'now', '-2 days')),
  ('msg-dev-019', 'conv-dev-011', 'assistant', 'Perfect! I have detected an opportunity to generate weather app UI mockups with a clean, minimal design and gradient background. I will queue this up for overnight generation.', NULL, NULL, strftime('%s', 'now', '-2 days'))
ON CONFLICT(id) DO NOTHING;

-- ============================================================================
-- OPPORTUNITIES (Across all types)
-- ============================================================================

INSERT INTO opportunities (id, conversation_id, type, prompt, confidence, source_messages, status, created_at, metadata)
VALUES
  -- Image generation opportunities
  ('opp-dev-001', 'conv-dev-005', 'image', 'Create a modern, energetic fitness app logo featuring a stylized dumbbell or heartbeat line. Use vibrant colors like orange, red, and yellow to convey energy and motivation. The design should work well as both an app icon and a larger logo for marketing materials.', 0.91, '["msg-dev-014"]', 'detected', strftime('%s', 'now', '-4 days'), '{"detection_model":"llama-3.1-8b","context_length":4}'),
  ('opp-dev-002', 'conv-dev-004', 'image', 'Design a clean, modern dashboard mockup for a project management SaaS. Include sidebar navigation, main content area with task cards, and a top header with user profile and notifications. Use a professional blue color scheme with subtle gradients and shadows for depth.', 0.88, '["msg-dev-010"]', 'queued', strftime('%s', 'now', '-10 days'), '{"detection_model":"llama-3.1-8b","context_length":6}'),
  ('opp-dev-003', 'conv-dev-011', 'image', 'Generate a clean, minimal weather app UI mockup. Display current temperature prominently, include a 7-day forecast below, and use a gradient background that shifts based on weather conditions (sunny, cloudy, rainy). Icons should be simple and legible at small sizes.', 0.93, '["msg-dev-018"]', 'detected', strftime('%s', 'now', '-2 days'), '{"detection_model":"llama-3.1-8b","context_length":2}'),

  -- Code generation opportunities
  ('opp-dev-004', 'conv-dev-003', 'code', 'Generate a TypeScript schema for a multi-tenant SaaS database with tables for tenants, users, projects, and tasks. Include proper foreign key relationships, indexes on frequently queried columns (tenant_id, user_id), and timestamps for created_at and updated_at on all tables.', 0.95, '["msg-dev-010","msg-dev-012"]', 'detected', strftime('%s', 'now', '-3 days'), '{"detection_model":"llama-3.1-8b","context_length":4}'),
  ('opp-dev-005', 'conv-dev-001', 'code', 'Create a React component for a push-to-talk voice recording button. The button should show visual feedback when recording (pulsing animation), display audio duration in real-time, and handle microphone permissions gracefully. Use TypeScript and include proper error handling.', 0.89, '["msg-dev-001","msg-dev-003"]', 'queued', strftime('%s', 'now', '-7 days'), '{"detection_model":"llama-3.1-8b","context_length":3}'),
  ('opp-dev-006', 'conv-dev-007', 'code', 'Generate OpenAPI/Swagger documentation for a REST API with endpoints for user authentication, project CRUD operations, and task management. Include request/response schemas, authentication headers, and example usage for each endpoint.', 0.86, '["msg-dev-010"]', 'detected', strftime('%s', 'now', '-2 days'), '{"detection_model":"llama-3.1-8b","context_length":2}'),

  -- Text generation opportunities
  ('opp-dev-007', 'conv-dev-002', 'text', 'Write a compelling product launch announcement for Makerlog, a voice-first development assistant that gamifies free tier quota harvesting. Highlight key benefits: automatic opportunity detection, overnight batch processing, and integration with existing development workflows. Include a clear call-to-action and maintain an exciting but professional tone suitable for Twitter, LinkedIn, and Indie Hackers.', 0.94, '["msg-dev-006","msg-dev-008"]', 'queued', strftime('%s', 'now', '-5 days'), '{"detection_model":"llama-3.1-8b","context_length":4}'),
  ('opp-dev-008', 'conv-dev-008', 'text', 'Create landing page copy for a B2B SaaS project management tool. Write a hero headline, subheadline, and 3-4 benefit-focused bullet points. The copy should appeal to technical leads and engineering managers, emphasizing productivity gains, automation features, and developer experience.', 0.87, '["msg-dev-014"]', 'detected', strftime('%s', 'now', '-6 days'), '{"detection_model":"llama-3.1-8b","context_length":3}'),
  ('opp-dev-009', 'conv-dev-006', 'text', 'Write a user onboarding email sequence for a new SaaS product. Create 3 emails: (1) Welcome with getting started tips, (2) Feature deep-dive after 3 days, (3) Success story/social proof after 7 days. Each email should be engaging, scannable, and drive specific user actions.', 0.92, '["msg-dev-014"]', 'detected', strftime('%s', 'now', '-3 days'), '{"detection_model":"llama-3.1-8b","context_length":2}')
ON CONFLICT(id) DO NOTHING;

-- ============================================================================
-- TASKS (Various states and types)
-- ============================================================================

-- Completed tasks
INSERT INTO tasks (id, user_id, type, status, prompt, priority, result_url, cost_estimate, actual_cost, retry_count, created_at, completed_at)
VALUES
  ('task-dev-001', 'dev-user-001', 'image-gen', 'completed', 'Modern dashboard mockup with blue color scheme', 2, '/assets/images/dev-user-001/task-dev-001.png', 0.001, 0.00095, 0, strftime('%s', 'now', '-10 days'), strftime('%s', 'now', '-10 days')),
  ('task-dev-002', 'dev-user-001', 'text-gen', 'completed', 'Product launch announcement for voice-first dev tool', 2, '/assets/text/dev-user-001/task-dev-002.txt', 0.0001, 0.00008, 0, strftime('%s', 'now', '-5 days'), strftime('%s', 'now', '-5 days')),
  ('task-dev-003', 'dev-user-002', 'image-gen', 'completed', 'Fitness app logo with dumbbell icon', 1, '/assets/images/dev-user-002/task-dev-003.png', 0.001, 0.00097, 0, strftime('%s', 'now', '-4 days'), strftime('%s', 'now', '-4 days')),
  ('task-dev-004', 'dev-user-001', 'code-gen', 'completed', 'React push-to-talk button component', 2, '/assets/text/dev-user-001/task-dev-004.txt', 0.0002, 0.00015, 0, strftime('%s', 'now', '-7 days'), strftime('%s', 'now', '-7 days')),
  ('task-dev-005', 'dev-user-003', 'text-gen', 'completed', 'API documentation for project management API', 1, '/assets/text/dev-user-003/task-dev-005.txt', 0.0001, 0.00009, 0, strftime('%s', 'now', '-2 days'), strftime('%s', 'now', '-2 days'))
ON CONFLICT(id) DO NOTHING;

-- Queued tasks (awaiting harvest)
INSERT INTO tasks (id, user_id, type, status, prompt, priority, cost_estimate, created_at)
VALUES
  ('task-dev-006', 'dev-user-001', 'code-gen', 'queued', 'TypeScript multi-tenant SaaS database schema', 2, 0.0003, strftime('%s', 'now', '-3 days')),
  ('task-dev-007', 'dev-user-002', 'text-gen', 'queued', 'User onboarding email sequence (3 emails)', 1, 0.0003, strftime('%s', 'now', '-3 days')),
  ('task-dev-008', 'dev-user-004', 'text-gen', 'queued', 'Landing page copy for B2B SaaS tool', 1, 0.00015, strftime('%s', 'now', '-6 days')),
  ('task-dev-009', 'dev-user-007', 'image-gen', 'queued', 'Weather app UI mockup with gradient background', 2, 0.001, strftime('%s', 'now', '-2 days')),
  ('task-dev-010', 'dev-user-001', 'image-gen', 'queued', 'Set of 5 app icon variations in purple theme', 1, 0.005, strftime('%s', 'now', '-1 day'))
ON CONFLICT(id) DO NOTHING;

-- Running tasks (currently executing)
INSERT INTO tasks (id, user_id, type, status, prompt, priority, cost_estimate, created_at)
VALUES
  ('task-dev-011', 'dev-user-001', 'code-gen', 'running', 'OpenAPI/Swagger documentation for REST API', 2, 0.00025, strftime('%s', 'now', '-1 hour'))
ON CONFLICT(id) DO NOTHING;

-- Failed tasks
INSERT INTO tasks (id, user_id, type, status, prompt, priority, result_url, cost_estimate, actual_cost, error_message, retry_count, created_at, completed_at)
VALUES
  ('task-dev-012', 'dev-user-001', 'image-gen', 'failed', 'Complex illustration with multiple characters and detailed background (too complex for SDXL)', 1, NULL, 0.001, NULL, 'Prompt too complex for model. Try simplifying the scene or breaking into multiple generations.', 2, strftime('%s', 'now', '-6 days'), strftime('%s', 'now', '-6 days')),
  ('task-dev-013', 'dev-user-003', 'text-gen', 'failed', 'Generate entire book chapter (token limit exceeded)', 1, NULL, 0.0005, NULL, 'Token limit exceeded. Try breaking into smaller sections.', 1, strftime('%s', 'now', '-4 days'), strftime('%s', 'now', '-4 days'))
ON CONFLICT(id) DO NOTHING;

-- ============================================================================
-- ACHIEVEMENTS (Show user progression)
-- ============================================================================

INSERT INTO achievements (id, user_id, achievement_type, xp_awarded, unlocked_at)
VALUES
  -- Power user achievements
  ('ach-dev-001', 'dev-user-001', 'first_harvest', 100, strftime('%s', 'now', '-60 days')),
  ('ach-dev-002', 'dev-user-001', 'perfect_day', 500, strftime('%s', 'now', '-45 days')),
  ('ach-dev-003', 'dev-user-001', 'time_saver', 1000, strftime('%s', 'now', '-30 days')),
  ('ach-dev-004', 'dev-user-001', 'streak_7', 2000, strftime('%s', 'now', '-30 days')),
  ('ach-dev-005', 'dev-user-001', 'hundred_tasks', 1500, strftime('%s', 'now', '-20 days')),

  -- Regular user achievements
  ('ach-dev-006', 'dev-user-002', 'first_harvest', 100, strftime('%s', 'now', '-45 days')),
  ('ach-dev-007', 'dev-user-002', 'streak_7', 2000, strftime('%s', 'now', '-12 days')),
  ('ach-dev-008', 'dev-user-003', 'first_harvest', 100, strftime('%s', 'now', '-30 days')),
  ('ach-dev-009', 'dev-user-004', 'first_harvest', 100, strftime('%s', 'now', '-20 days')),

  -- New user achievements
  ('ach-dev-010', 'dev-user-007', 'first_harvest', 100, strftime('%s', 'now', '-1 day'))
ON CONFLICT(user_id, achievement_type) DO NOTHING;

-- ============================================================================
-- ANALYTICS EVENTS (Privacy-first, anonymized)
-- ============================================================================

INSERT INTO analytics_events (id, event_type, event_data, timestamp_hour, user_hash, dimensions)
VALUES
  -- Voice transcription events
  ('evt-dev-001', 'voice_transcribe', '{"success":true,"duration_seconds":12.5,"model":"whisper","language":"en"}', strftime('%s', 'now', '-7 days', 'start of hour'), 'hash001', '{"region":"us-east","device":"desktop"}'),
  ('evt-dev-002', 'voice_transcribe', '{"success":true,"duration_seconds":8.3,"model":"whisper","language":"en"}', strftime('%s', 'now', '-5 days', 'start of hour'), 'hash001', '{"region":"us-east","device":"mobile"}'),
  ('evt-dev-003', 'voice_transcribe', '{"success":false,"error":"timeout","duration_seconds":0,"model":"whisper"}', strftime('%s', 'now', '-3 days', 'start of hour'), 'hash002', '{"region":"eu-west","device":"desktop"}'),

  -- Task completion events
  ('evt-dev-004', 'task_completed', '{"task_type":"image-gen","duration_seconds":2.3,"model":"stable-diffusion","success":true}', strftime('%s', 'now', '-10 days', 'start of hour'), 'hash001', '{"region":"us-east"}'),
  ('evt-dev-005', 'task_completed', '{"task_type":"text-gen","duration_seconds":1.1,"model":"llama-3.1-8b","success":true}', strftime('%s', 'now', '-5 days', 'start of hour'), 'hash001', '{"region":"us-east"}'),
  ('evt-dev-006', 'task_completed', '{"task_type":"code-gen","duration_seconds":3.2,"model":"llama-3.1-8b","success":true}', strftime('%s', 'now', '-7 days', 'start of hour'), 'hash001', '{"region":"us-east"}'),
  ('evt-dev-007', 'task_failed', '{"task_type":"image-gen","error":"complexity_limit","retry_count":2}', strftime('%s', 'now', '-6 days', 'start of hour'), 'hash001', '{"region":"us-east"}'),

  -- Opportunity detection events
  ('evt-dev-008', 'opportunity_detected', '{"type":"image","confidence":0.91,"source":"voice","conversation_length":4}', strftime('%s', 'now', '-4 days', 'start of hour'), 'hash002', '{"region":"us-west"}'),
  ('evt-dev-009', 'opportunity_detected', '{"type":"code","confidence":0.95,"source":"voice","conversation_length":6}', strftime('%s', 'now', '-3 days', 'start of hour'), 'hash003', '{"region":"eu-central"}'),
  ('evt-dev-010', 'opportunity_detected', '{"type":"text","confidence":0.94,"source":"voice","conversation_length":3}', strftime('%s', 'now', '-5 days', 'start of hour'), 'hash001', '{"region":"us-east"}'),

  -- Opportunity action events
  ('evt-dev-011', 'opportunity_queued', '{"type":"image","confidence":0.88,"auto_queued":false}', strftime('%s', 'now', '-10 days', 'start of hour'), 'hash001', '{"region":"us-east"}'),
  ('evt-dev-012', 'opportunity_rejected', '{"type":"text","confidence":0.72,"reason":"not_relevant"}', strftime('%s', 'now', '-4 days', 'start of hour'), 'hash004', '{"region":"ap-south"}'),

  -- Harvest events
  ('evt-dev-013', 'harvest_completed', '{"tasks_executed":5,"tasks_succeeded":4,"tasks_failed":1,"duration_seconds":45}', strftime('%s', 'now', '-1 day', 'start of hour'), 'hash001', '{"region":"us-east"}'),
  ('evt-dev-014', 'harvest_completed', '{"tasks_executed":2,"tasks_succeeded":2,"tasks_failed":0,"duration_seconds":12}', strftime('%s', 'now', '-2 days', 'start of hour'), 'hash002', '{"region":"us-west"}'),

  -- Achievement events
  ('evt-dev-015', 'achievement_unlocked', '{"achievement_type":"first_harvest","xp_awarded":100}', strftime('%s', 'now', '-45 days', 'start of hour'), 'hash002', '{"region":"us-west"}'),
  ('evt-dev-016', 'achievement_unlocked', '{"achievement_type":"streak_7","xp_awarded":2000}', strftime('%s', 'now', '-12 days', 'start of hour'), 'hash002', '{"region":"us-west"}')
ON CONFLICT(id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Display development data summary
SELECT 'Development Data Seeded Successfully' as status;

-- Summary counts
SELECT '===' as separator, 'Table Summary' as description, '===' as sep2;
SELECT
  'Users' as table_name,
  COUNT(*) as count,
  SUM(CASE WHEN xp > 5000 THEN 1 ELSE 0 END) as power_users,
  SUM(CASE WHEN streak_days >= 7 THEN 1 ELSE 0 END) as active_streaks
FROM users
UNION ALL
SELECT 'Conversations', COUNT(*), NULL, NULL FROM conversations
UNION ALL
SELECT 'Messages', COUNT(*), NULL, NULL FROM messages
UNION ALL
SELECT 'Voice Messages', COUNT(*), NULL, NULL FROM messages WHERE audio_url IS NOT NULL
UNION ALL
SELECT 'Opportunities', COUNT(*), NULL, NULL FROM opportunities
UNION ALL
SELECT 'Tasks', COUNT(*), SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), NULL FROM tasks
UNION ALL
SELECT 'Achievements', COUNT(*), NULL, NULL FROM achievements
UNION ALL
SELECT 'Voice Personas', COUNT(*), NULL, NULL FROM voice_personas;

-- User engagement distribution
SELECT '===' as separator, 'User Engagement Distribution' as description, '===' as sep2;
SELECT
  CASE
    WHEN xp >= 5000 THEN 'Power User'
    WHEN xp >= 1000 THEN 'Regular'
    WHEN xp >= 100 THEN 'New'
    ELSE 'Inactive'
  END as engagement_level,
  COUNT(*) as user_count,
  AVG(xp) as avg_xp,
  AVG(streak_days) as avg_streak
FROM users
GROUP BY engagement_level
ORDER BY avg_xp DESC;

-- Task status distribution
SELECT '===' as separator, 'Task Status Distribution' as description, '===' as sep2;
SELECT
  status,
  COUNT(*) as count,
  ROUND(AVG(cost_estimate), 5) as avg_cost_estimate
FROM tasks
GROUP BY status;

-- Opportunity type distribution
SELECT '===' as separator, 'Opportunity Type Distribution' as description, '===' as sep2;
SELECT
  type,
  COUNT(*) as count,
  ROUND(AVG(confidence), 2) as avg_confidence,
  SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued
FROM opportunities
GROUP BY type;
