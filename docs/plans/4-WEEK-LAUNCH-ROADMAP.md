# Makerlog.ai Launch Roadmap: 4-Week Sprint

**Document Version:** 1.0
**Date:** January 21, 2026
**Status:** Ready for Execution
**Philosophy:** "Talk through your day. Wake up to results."

---

## Strategic Decision

**We are building ONE product for ONE audience:**

- **Product:** Makerlog.ai (adults 18+)
- **Users:** Developers who want to capture ideas while mobile
- **Value Prop:** Voice capture + automatic transcription + searchable memory + AI generation

**What we're NOT building (anymore):**
- ❌ Studylog.ai (deferred until Makerlog has 100+ WAU)
- ❌ Module system (premature abstraction - zero add-ons exist)
- ❌ Desktop connector (zero demand signal, defer until post-launch)
- ❌ Threaded conversations (add-on later)
- ❌ AI summaries (add-on later)
- ❌ Advanced memory systems (add-on later)

**Ship → Learn → Iterate**

---

## The Core Insight

**Voice-first capture with automatic opportunity detection is genuinely novel.**

The path to success is validating that insight with real users as fast as possible, not building infrastructure for hypothetical scale.

---

## Week 1: Voice Recording + Transcription

### Goal

Users can record voice notes and see transcriptions appear in real-time.

### Tasks

#### Day 1-2: Push-to-Talk Recording
- [ ] Large PTT button (96×96px, WCAG AAA compliant)
- [ ] Audio feedback (start/stop beeps, haptic vibration)
- [ ] Wake lock (prevent screen sleep during recording)
- [ ] Recording duration display

#### Day 3-4: Progressive Upload + STT
- [ ] Upload 10-second chunks immediately to R2
- [ ] Integrate Cloudflare Whisper STT
- [ ] Store transcriptions in D1
- [ ] Error handling and retry logic

#### Day 5-7: Markdown Storage
- [ ] Format transcriptions as daily markdown logs
- [ ] Timestamp and duration metadata
- [ ] Chronological viewer (list today's recordings)
- [ ] Basic editing (correct transcription errors)

### Deliverable

> A user can record a 2-minute voice note while walking, and 30 seconds after stopping, see it appear in their daily log as searchable text.

### Success Criteria
- Recording doesn't crash after 30+ minutes
- <30 seconds from "stop" to readable text
- Transcription accuracy >90% (user-reported)

---

## Week 2: Semantic Search + Quota Tracking

### Goal

Users can find old voice notes by meaning and see their Cloudflare quota status.

### Tasks

#### Day 1-2: Vector Search
- [ ] Generate BGE embeddings for each transcription
- [ ] Store in Vectorize index (namespace = user_id)
- [ ] Semantic search interface ("What did I say about...")
- [ ] Full-text search fallback

#### Day 3-4: Quota Dashboard
- [ ] Real-time quota display (neurons used / 10,000)
- [ ] Quota resets in countdown
- [ ] Efficiency percentage (how much of daily quota used)
- [ ] Simple, minimal UI (dark theme, developer-focused)

#### Day 5-7: Daily Log Browser
- [ ] Date-based navigation (Jan 21, Jan 20, Jan 19...)
- [ ] Individual recording pages with full transcription
- [ ] Audio playback (play original recording)
- [ ] Export as markdown

### Deliverable

> A user can search "what I said about React hooks last Tuesday" and see relevant recordings with highlighted matches.

### Success Criteria
- Search results <100ms
- >80% relevance for semantic queries
- Quota updates in real-time

---

## Week 3: Voice Commands + All 9 AI Models

### Goal

Users can generate code, images, and text using voice commands.

### Tasks

#### Day 1-2: Voice Command Parser
- [ ] Detect generation intent from transcriptions
- [ ] Extract type (code/image/text) and prompt
- [ ] Show opportunity card with confidence score
- [ ] Queue/reject/skip interface

#### Day 3-4: AI Integration
- [ ] Text generation (Llama 3.1 8B)
- [ ] Code generation (Llama 3.1 8B)
- [ ] Image generation (SDXL)
- [ ] Translation (Llama 3.1 8B)
- [ ] Summarization (Llama 3.1 8B)

#### Day 5-7: Screenshot Integration + TTS
- [ ] Paste screenshot from clipboard
- [ ] Image analysis (Florence-2, Resnet-50)
- [ ] Text-to-speech responses (Web Speech API)
- [ ] Queue for tonight's batch execution

### Deliverable

> A user says "Generate a React component for a user profile with avatar and name" and sees it queued for tonight's execution.

### Success Criteria
- All 9 models accessible via voice
- Clear quota feedback before generation
- <10s average generation time

---

## Week 4: Gamification + Overnight Harvest

### Goal

Users wake up to completed tasks and feel motivated to continue.

### Tasks

#### Day 1-2: Gamification Engine
- [ ] XP calculation (50 XP per task)
- [ ] Level formula: `level = floor(sqrt(xp / 100)) + 1`
- [ ] Achievement system (First Harvest, Perfect Day, Week Warrior)
- [ ] Streak tracking (daily activity)

#### Day 3-4: Midnight Harvest
- [ ] Cron trigger at midnight
- [ ] Execute all queued tasks
- [ ] Stop at 90% quota (don't waste)
- [ ] Result notifications

#### Day 5-7: Polish + Launch
- [ ] Performance optimization (bundle size, lazy loading)
- [ ] Error handling and graceful degradation
- [ ] Onboarding flow (first-run experience)
- [ ] Beta testing with 10 users

### Deliverable

> A user queues 5 tasks during the day, wakes up to find 4 completed with a notification "You earned 200 XP and leveled up to Level 3!"

### Success Criteria
- >90% daily quota utilization
- <5% task failure rate
- 4.5+ user satisfaction (beta testers)

---

## Success Metrics

### Technical
- <3s Time to Interactive on 3G mobile
- <2s transcription latency (90th percentile)
- 95%+ transcription accuracy
- <5% crash rate

### Engagement
- 50%+ users record 3+ times/day
- 70%+ quota utilization rate
- 30%+ 7-day streak retention
- 4.5+ user satisfaction (5-point scale)

### Business
- 100 active users by end of Week 4
- 1,000+ recordings in first month
- 100+ generated assets
- <20% churn rate

---

## What Got Cut (And Why)

| Feature | Status | Reason |
|---------|--------|--------|
| **Studylog.ai** | ❌ CUT | Different audience, requires COPPA compliance |
| **Module system** | ❌ CUT | Premature abstraction - zero add-ons to use it |
| **Desktop connector** | ❌ CUT | Zero demand signal, can add post-launch |
| **Threaded conversations** | ❌ CUT | Chronological is simpler and sufficient |
| **AI summaries** | ❌ CUT | Users can read their own logs |
| **Engram O(1) memory** | ❌ CUT | Vectorize is sufficient for MVP |
| **HNSW indexing** | ❌ CUT | Vectorize has built-in ANN |
| **Tiered memory cache** | ❌ CUT | Single-tier works fine |
| **RLM (Recursive Language Models)** | ❌ CUT | Research project, add-on later |
| **Agent swarms** | ❌ CUT | Over-engineering for v1 |

**Key Principle:** If it's not essential for Week 1 launch, cut it. We can always add it later based on user feedback.

---

## Development Commands

```bash
# Start development
npm run dev          # Frontend (localhost:5173)
npm run api:dev      # Worker API (localhost:8787)

# Run tests
npm run test         # All tests
npm run test:e2e     # E2E tests

# Database
npm run db:migrate   # Run migrations
```

---

## Launch Checklist

### Week 1
- [ ] Voice recording works for 30+ minutes
- [ ] Transcriptions appear in <30 seconds
- [ ] Daily logs format correctly as markdown
- [ ] Offline queue handles connection loss

### Week 2
- [ ] Semantic search finds relevant recordings
- [ ] Quota display updates in real-time
- [ ] Can navigate between days
- [ ] Audio playback works

### Week 3
- [ ] All 9 AI models generate correctly
- [ ] Voice commands parse reliably
- [ ] Screenshots attach to recordings
- [ ] TTS responses are intelligible

### Week 4
- [ ] XP and leveling work correctly
- [ ] Achievements unlock appropriately
- [ ] Midnight harvest executes tasks
- [ ] Beta testers give 4.5+ rating

---

## Post-Launch Roadmap (Future)

Once we have 100+ weekly active users and validated the core value prop, we can iterate based on real feedback:

**If users ask for threading** → Add threaded conversations
**If users want better search** → Add Engram O(1) memory
**If users want faster generation** → Add desktop connector
**If users want planning** → Add RLM overnight optimization

Until then: **Ship → Learn → Iterate**

---

**Document Version:** 1.0
**Last Updated:** 2026-01-21
**Status:** Ready for Execution
**Next Step:** Begin Week 1 - Voice Recording + Transcription

**Sources:**
- Vision Refinement Analysis (Opus 4.5)
- Original Makerlog MVP research
- Cloudflare Workers AI documentation
