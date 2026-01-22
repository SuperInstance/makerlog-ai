# Strategic Decisions Log

*Decisions made to refine product direction - January 2026*

---

## Decision 1: Ship Makerlog.ai First, Defer Studylog.ai

**Decision:** Focus exclusively on Makerlog.ai for launch. Defer Studylog.ai until after market validation.

**Rationale:**
- COPPA compliance for under-18 users is a major legal/technical undertaking
- Building two products simultaneously dilutes focus
- Makerlog is 75% complete; Studylog is 0% complete
- Adult users provide direct feedback; kids need parent intermediaries
- One great product > two mediocre products

**Revisit when:** Makerlog reaches 100+ weekly active users with positive retention metrics.

---

## Decision 2: Remove "Quota Harvesting" Framing

**Decision:** Reposition from "gamifying quota harvesting" to "turning conversations into creations."

**Rationale:**
- "Quota harvesting" sounds like exploiting free tiers
- Users want outcomes, not resource consumption
- May conflict with Cloudflare ToS interpretations
- "Talk through your day, wake up to results" is clearer value prop

**Implementation:**
- Update all user-facing copy
- Change gamification to reward completed outputs, not API calls
- Remove "harvest" terminology from UI

---

## Decision 3: Descope Module/Add-On System

**Decision:** Do not build the three-layer feature flag and module registry system for MVP.

**Rationale:**
- Zero add-ons exist to use the system
- Premature abstraction adds complexity without value
- Can add plugin architecture later if needed
- Ship speed matters more than extensibility at this stage

**What's descoped:**
- `MakerlogModule` interface implementation
- KV-based feature flags
- Dynamic module loading
- Add-on marketplace concepts

---

## Decision 4: Descope Desktop Connector

**Decision:** Do not build local Ollama/ComfyUI integration for MVP.

**Rationale:**
- No user demand signal (zero requests)
- Significant complexity (local service discovery, task routing)
- Cloud-only is simpler and sufficient for validation
- Can add later if power users request it

---

## Decision 5: Launch Free, Monetize Later

**Decision:** No monetization at launch. No ads, no subscriptions.

**Rationale:**
- Friction masks product-market fit signals
- Need to validate people want this before optimizing revenue
- Ads signal lack of confidence in product value
- Cloudflare free tier is sufficient for early users

**Revisit when:** 100+ weekly active users with clear retention.

---

## Decision 6: Simplify Gamification

**Decision:** Launch with minimal gamification. XP, levels, and 5 achievements only.

**What's in:**
- XP for completed generations (not queued tasks)
- Level display (existing formula)
- 5 starter achievements

**What's out (for now):**
- Streaks (creates anxiety)
- Leaderboards (no social features yet)
- Complex achievement trees
- XP for API calls/quota usage

---

## Decision 7: Voice-First, Not Voice-Only

**Decision:** Voice is primary input, but text input is first-class.

**Rationale:**
- Some contexts don't allow voice (meetings, quiet spaces)
- Accessibility considerations
- Reduces risk if voice hypothesis is wrong
- Users should choose their preferred input

**Implementation:**
- Keep voice button prominent
- Add visible text input field
- Both inputs feed same pipeline

---

## Decision 8: 4-Week Ship Target

**Decision:** Target production launch in 4 weeks, not 12.

**Week 1-2:** Complete core loop + auth
**Week 3:** Supporting features (search, logs, basic gamification)
**Week 4:** Launch, monitor, hotfix

**What enables this:**
- Descoping Studylog
- Descoping module system
- Descoping desktop connector
- Using existing 75% implementation

---

## Decisions Deferred (Not Decided Yet)

| Topic | Defer Until |
|-------|-------------|
| Studylog.ai development | Makerlog validation |
| Monetization model | 100+ WAU |
| Desktop connector | User requests |
| Advanced memory (Engram) | Performance issues arise |
| Streaks and leaderboards | Core gamification validated |
| Multi-provider support | Cloudflare dependency concerns |

---

## Anti-Patterns to Avoid

1. **Don't build for imaginary users** - Ship to real users, learn from them
2. **Don't build infrastructure for features that don't exist** - YAGNI
3. **Don't optimize revenue before product-market fit** - Validate first
4. **Don't build two products when one isn't proven** - Focus
5. **Don't write docs instead of code** - The ratio is already inverted

---

*These decisions should be revisited as we learn from real user behavior.*
