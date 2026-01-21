# Implementation Roadmap: Studylog.ai & Makerlog.ai MVP

**Document Version:** 1.0
**Date:** January 21, 2026
**Status:** Ready for Execution
**Timeline:** 12 weeks to launch both platforms

---

## Overview

This roadmap provides a **parallel execution strategy** for building two products simultaneously:

1. **Studylog.ai** - Kid-friendly AI learning platform (under-18)
2. **Makerlog.ai MVP** - Adult voice-first Cloudflare quota harvester

**Key Principle:** Share core infrastructure, optimize for different users.

---

## Phase 1: Foundation (Weeks 1-2)

### Shared Infrastructure

**Goal:** Set up core systems that both platforms will use

- [ ] **Database Schema Extensions**
  - Add `students` table (COPPA compliance)
  - Add `approval_requests` table (parent supervision)
  - Add `daily_allowances` table (quota management)
  - Add `parent_child_relationships` table
  - Add `teacher_classes` table

- [ ] **Safety Infrastructure**
  - Integrate Llama Guard 3 for content filtering
  - Implement input/output validation pipeline
  - Create safety monitoring system
  - Build approval workflow state machine

- [ ] **Feature Flag System**
  - Set up Cloudflare KV for dynamic flags
  - Implement static code splitting (Vite)
  - Build permission tracking in D1
  - Create flag evaluation service

- [ ] **Module Registry**
  - Build `ModuleRegistry` class
  - Implement `MakerlogModule` interface
  - Create module loading system
  - Add dependency resolution

**Deliverables:**
- Extended database schema
- Safety infrastructure operational
- Feature flag system working
- Module registry ready

---

## Phase 2: Studylog.ai Core (Weeks 3-4)

### Student Features

- [ ] **Student Chat Interface**
  - Voice/text input (simple push-to-talk)
  - AI responses via TTS
  - Conversation history (chronological)
  - Emoji reactions for feedback
  - Age-appropriate UI

- [ ] **Daily Allowance System**
  - Parent-set quota limits
  - Time-of-day restrictions
  - Visual progress bar for kids
  - "Request more" button
  - Bonus quota grants

- [ ] **Project Management**
  - Save conversations as "projects"
  - Export as PDF/markdown
  - Simple folder organization
  - Share with teacher

**Deliverables:**
- Students can chat with AI safely
- Parents can set allowances
- Basic project functionality working

---

## Phase 3: Studylog.ai Supervision (Weeks 5-6)

### Parent Features

- [ ] **Parent Dashboard**
  - Real-time activity display
  - Today's quota usage
  - Approval queue (if any)
  - Multi-child management
  - Settings interface

- [ ] **Push Notifications**
  - Image generation request
  - Quota increase request
  - Daily activity summary
  - Alert notifications
  - One-tap approvals

- [ ] **Settings Management**
  - Daily quota configuration
  - Allowed hours (time windows)
  - Content filter levels
  - Multiple child management

**Deliverables:**
- Parents can supervise in real-time
- Push notification system working
- Granular control interface

---

## Phase 4: Studylog.ai Education (Weeks 7-8)

### Teacher Features

- [ ] **Teacher Dashboard**
  - Class overview (25 students)
  - Activity metrics
  - Struggling student identification
  - Resource usage tracking

- [ ] **Lesson Planning**
  - Share files/prompts with students
  - Create guided dialogues
  - Set learning objectives
  - Track progress

- [ ] **Analytics**
  - Per-student conversation summaries
  - Learning progress tracking
  - Resource allocation
  - Engagement metrics

**Deliverables:**
- Teachers can manage classes
- Lesson planning tools working
- Basic analytics operational

---

## Phase 5: Makerlog.ai Core (Weeks 3-4)

### Voice Features

- [ ] **Voice Recorder**
  - Push-to-talk button
  - Continuous recording mode
  - Intelligent segmentation (VAD)
  - Progressive upload (R2)
  - Offline queue (IndexedDB)

- [ ] **STT/TTS Integration**
  - Cloudflare Whisper STT
  - Web Speech API TTS
  - Audio feedback system
  - Error handling

- [ ] **Markdown Memory**
  - Daily log format
  - Chronological viewer
  - Full-text + semantic search
  - Export functionality

**Deliverables:**
- Voice recording working smoothly
- Transcriptions accurate
- Daily logs browsable and searchable

---

## Phase 6: Makerlog.ai AI Integration (Weeks 5-6)

### AI Model Access

- [ ] **All 9 Models**
  - Text Embeddings (BGE)
  - Text Classification (Llama)
  - Text-to-Speech (Web Speech)
  - ASR (Whisper)
  - Image-to-Text (Florence-2)
  - Text-to-Image (SDXL)
  - Image Classification (Resnet-50)
  - Translation (Llama)
  - Summarization (Llama)

- [ ] **Opportunity Detection**
  - Analyze transcripts
  - Detect generation tasks
  - Queue management
  - Priority scoring

- [ ] **Task Execution**
  - Batch processing
  - Harvest scheduling
  - Auto-harvest at midnight
  - Result storage

**Deliverables:**
- All AI models accessible via voice
- Opportunity detection working
- Task execution operational

---

## Phase 7: Gamification (Weeks 7-8)

### Both Platforms

- [ ] **XP & Leveling**
  - XP calculation: 50 XP per task
  - Level formula: `floor(sqrt(xp / 100)) + 1`
  - Level-up notifications

- [ ] **Achievements**
  - Studylog: "First Code", "Story Master", "Quiz Whiz"
  - Makerlog: "First Harvest", "Perfect Day", "Week Warrior"
  - Badge system
  - Celebration UI

- [ ] **Streaks**
  - Daily tracking
  - Harvest/usage tracking
  - Visual streak display
  - Forgiveness (grace days)

- [ ] **Quota Dashboards**
  - Real-time quota display
  - Neuron consumption
  - Efficiency metrics
  - Harvest notifications

**Deliverables:**
- Both platforms have gamification
- XP, leveling, achievements working
- Streaks and quota tracking live

---

## Phase 8: Modular Add-Ons (Weeks 9-10)

### Shared Module System

- [ ] **Module Infrastructure**
  - Implement `ModuleRegistry`
  - Build module loader
  - Create capability detection
  - Add suggestion engine

- [ ] **Add-On Extraction**
  - Extract "Threaded Conversations" module
  - Extract "AI Summaries" module
  - Extract "Desktop Connector" (already separate)
  - Extract "Advanced Memory" module

- [ ] **Add-On Store**
  - Discovery UI
  - Pricing display
  - Enable/disable functionality
  - Trial management

- [ ] **Pricing & Billing**
  - Stripe integration
  - Subscription management
  - Usage tracking
  - Invoicing

**Deliverables:**
- Module system operational
- 4 core add-ons available
- Billing and payment working

---

## Phase 9: Polish & Launch (Weeks 11-12)

### Studylog.ai Launch

- [ ] **COPPA Compliance Testing**
  - Age verification flow
  - Parent consent workflow
  - Data minimization audit
  - Right to be forgotten

- [ ] **Safety Testing**
  - Content filtering validation
  - Approval workflow testing
  - Alert system testing
  - Edge case handling

- [ ] **User Testing**
  - Student testing (ages 8-17)
  - Parent testing (supervision)
  - Teacher testing (classroom)
  - Feedback and iteration

### Makerlog.ai Launch

- [ ] **Performance Optimization**
  - Bundle size optimization
  - Lazy loading add-ons
  - Caching strategies
  - Index optimization

- [ ] **User Testing**
  - Voice recording (mobile)
  - Transcription quality
  - Search effectiveness
  - AI model access

- [ ] **Documentation**
  - User guides
  - API documentation
  - Admin guides
  - Onboarding flows

**Deliverables:**
- Both platforms production-ready
- All tests passing
- Documentation complete
- Deployed to production

---

## Success Criteria

### Studylog.ai

- **Safety:** Zero safety incidents
- **Compliance:** 100% COPPA compliant
- **Engagement:** 70%+ DAU/MAU stickiness
- **Learning:** 85%+ advance levels within 6 months
- **Satisfaction:** 4.5+ educational value rating

### Makerlog.ai

- **Technical:** <3s TTI on 3G, <2s transcription
- **Engagement:** 50%+ record 3+ times/day
- **Quota:** 70%+ average daily usage
- **Retention:** 30%+ 7-day streak
- **Satisfaction:** 4.5+ overall satisfaction

### Shared Infrastructure

- **Performance:** Feature flags <5ms evaluation
- **Uptime:** 99.9% uptime
- **Costs:** <5% over neuron budget
- **Security:** No vulnerabilities in critical areas

---

## Team Structure

### Recommended Team

- **1 Product Manager** - Prioritize backlog, manage roadmap
- **2 Full-Stack Developers** - Frontend (React) + Backend (Workers)
- **1 Safety/Compliance Specialist** - COPPA, content filtering
- **1 DevOps Engineer** - Cloudflare, CI/CD, monitoring
- **1 QA Engineer** - Testing across both platforms

### Development Approach

- **Parallel Sprints:** Work on Studylog and Makerlog features simultaneously
- **Shared Core:** Build infrastructure once, use for both
- **Incremental:** Ship features every 2 weeks
- **User Testing:** Test with real users (kids, parents, teachers, developers)

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Feature flags slow | KV cache, static flags for critical |
| Module loading fails | Graceful degradation, error boundaries |
| Database migrations | Rollback support, test migrations |
| Cloudflare quota | Monitoring, alerts, optimization |

### Business Risks

| Risk | Mitigation |
|------|------------|
| Low adoption | Free tier, educational value, clear differentiation |
| Churn high | Gamification, engagement, feature stickiness |
| Safety incidents | Multi-layer filtering, human review, rapid response |
| Support burden | Self-service, documentation, automation |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-21
**Status:** Ready for Execution
**Next Step:** Begin Phase 1 - Foundation

**Sources:**
- All research documents in `/docs/research/`
- Database schema: `/packages/db/schema.sql`
- Existing codebase analysis
- Industry best practices for modular architecture
