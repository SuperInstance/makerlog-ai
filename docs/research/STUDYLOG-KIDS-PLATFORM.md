# Studylog.ai: Kid-Friendly AI Learning Platform

**Document Version:** 1.0
**Date:** January 21, 2026
**Status:** Platform Definition & Implementation Blueprint
**Philosophy:** "Apple, not Microsoft - create users who love our approach, not bloat for imaginary 'middle users'"

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [User Personas](#user-personas)
3. [Safety & Compliance](#safety--compliance)
4. [Feature Breakdown](#feature-breakdown)
5. [Parent/Teacher Supervision](#parentteacher-supervision)
6. [Daily Allowance System](#daily-allowance-system)
7. [Educational Progression](#educational-progression)
8. [Integration with Makerlog](#integration-with-makerlog)
9. [Technical Implementation](#technical-implementation)
10. [12-Week Roadmap](#12-week-roadmap)

---

## 1. Platform Overview

### 1.1 What is Studylog.ai?

**Studylog.ai** is a kid-friendly (under-18) version of Makerlog.ai that serves as:

1. **Safe AI Playground** - Children chat with AI, explore capabilities, learn technology
2. **Educational Tool** - Teachers guide learning through dialogue and projects
3. **Parent-Supervised** - Parents approve activities, monitor progress, set boundaries
4. **Cloudflare-Powered** - Same Makerlog technology, age-appropriate constraints
5. **Zero Ads** - Tutorial spots where ads would be on Makerlog

### 1.2 Core Philosophy

**"Long-game Strategy"** - Get users accustomed to:
- How we think about AI (as tools, not magic)
- How to work with Cloudflare services
- How to get the most out of technology for their applications

This creates lifelong users who prefer our approach, not Microsoft's bloated "middle user" products.

### 1.3 Key Differentiators

| Feature | Studylog.ai | Makerlog.ai |
|---------|-------------|-------------|
| **Target Age** | Under 18 | Adults 18+ |
| **Supervision** | Parent/Teacher required | Self-governing |
| **Content** | Educational-focused | Productivity-focused |
| **Monetization** | Zero ads, tutorials | Banner ads |
| **Quota Source** | Parent allowance or own account | Own Cloudflare account |
| **Image Generation** | Parent approval required | Self-governing |
| **Advanced Features** | Teacher-enabled modules | User-enabled add-ons |

---

## 2. User Personas

### 2.1 Student Personas

#### Alex (Age 10) - "The Explorer"
- **Tech Comfort:** Medium - plays tablet games, uses school Chromebook
- **Goals:** Have fun, create things, learn about AI
- **Parental Supervision:** High - parents set strict daily limits
- **Use Case:** "Tell me a story about robots" / "Generate a picture of a dragon"
- **Learning Path:** AI Explorer (Level 1) - Basic concepts and simple prompts

#### Maya (Age 14) - "The Builder"
- **Tech Comfort:** High - codes in Scratch, learning Python
- **Goals:** Build projects, learn programming, create games
- **Parental Supervision:** Medium - parents monitor, allow more freedom
- **Use Case:** "Help me write Python code for a guessing game" / "Generate pixel art sprites"
- **Learning Path:** AI Builder (Level 2) - Prompt engineering and ethics

#### Jordan (Age 17) - "The Architect"
- **Tech Comfort:** Very High - builds websites, learning cloud technologies
- **Goals:** Learn professional skills, build portfolio, prepare for career
- **Parental Supervision:** Low - mostly independent, parents check in weekly
- **Use Case:** "Help me architect a React app with Workers backend" / "Deploy to Cloudflare"
- **Learning Path:** Cloud Architect (Level 3) - Workers, D1, deployment

### 2.2 Parent Personas

#### Sarah - "Tech-Savvy Mom"
- **Background:** Software engineer, understands AI/Cloudflare
- **Goals:** Kids learn technology safely, develop good habits
- **Supervision Style:** Proactive - sets up rules in advance, monitors dashboards
- **Concerns:** Screen time, appropriate content, online safety
- **Features Needed:** Real-time notifications, detailed analytics, granular controls

#### Michael - "Busy Professional Dad"
- **Background:** Marketing manager, basic tech literacy
- **Goals:** Kids have educational screen time, don't get into trouble
- **Supervision Style:** Reactive - checks in occasionally, responds to alerts
- **Concerns:** Too much screen time, inappropriate content, quota costs
- **Features Needed:** Simple dashboard, emergency alerts, easy approval

### 2.3 Teacher Personas

#### Ms. Rodriguez - "Middle School CS Teacher"
- **Background:** 7th grade computer science, 15 years experience
- **Goals:** Teach AI concepts, prepare students for tech careers
- **Class Size:** 25 students, varying skill levels
- **Use Case:** "Help me plan a lesson on prompt engineering" / "Which students need help?"
- **Features Needed:** Class dashboard, lesson planning tools, progress tracking

#### Mr. Thompson - "High School Tech Teacher"
- **Background:** 11th grade technology, former software developer
- **Goals:** Prepare students for certifications, build real projects
- **Class Size:** 20 students, advanced learners
- **Use Case:** "Help students deploy portfolio websites" / "Auto-grade assignments"
- **Features Needed:** Advanced tools, project management, certification prep

---

## 3. Safety & Compliance

### 3.1 COPPA Compliance (Critical)

**Children's Online Privacy Protection Act** - April 2026 deadline

#### Age Verification

```typescript
// Age verification flow
interface AgeVerification {
  step1: "Enter birth date";  // Exact date, not age range
  step2: "Parent email";      // For under-13
  step3: "Parent consent";    // Verifiable consent
  step4: "Account created";   // With parental controls enabled
}

// Database schema extension
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  birth_date TEXT NOT NULL,      // YYYY-MM-DD (exact date)
  parent_email TEXT NOT NULL,     // For under-13
  parent_consent BOOLEAN,         // Verifiable consent timestamp
  consent_expires_at INTEGER,     // Consent renewal required
  data_retention_days INTEGER DEFAULT 90,  // Auto-delete policy
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Data Minimization

**Collect ONLY what's necessary:**
- ✅ Student name (first name only for display)
- ✅ Birth date (age verification only)
- ✅ Parent email (consent and notifications)
- ✅ Transcripts (for learning and reference)
- ✅ Generated content (educational purposes)
- ❌ Last name (optional, for certificates only)
- ❌ Home address (never collected)
- ❌ Phone number (never collected)
- ❌ Location data (never collected)
- ❌ Voice recordings (deleted immediately after transcription)

#### Right to be Forgotten

```typescript
// Parent request to delete all data
POST /api/parent/delete-child-data
{
  "student_id": "abc-123",
  "confirmation": "I understand this cannot be undone"
}

// Response: All data deleted within 24 hours
// - Conversations
// - Transcripts
// - Generated content
// - Achievements
// - Style profiles
// - Analytics data
```

### 3.2 Multi-Layer Content Safety

#### Layer 1: Input Filtering (Before AI)

```typescript
// Llama Guard 3 integration
async function validateStudentInput(input: string, studentAge: number): Promise<{
  safe: boolean;
  filtered: boolean;
  reason?: string;
}> {
  // Run through Llama Guard 3
  const guardResult = await AI.run('@cf/meta/llama-guard-3-8b', {
    messages: [{ role: 'user', content: input }]
  });

  // Age-appropriate additional checks
  const ageRestricted = checkAgeRestrictions(input, studentAge);

  if (ageRestricted) {
    return {
      safe: false,
      filtered: true,
      reason: 'Content not age-appropriate'
    };
  }

  return {
    safe: guardResult.safe,
    filtered: false
  };
}
```

#### Layer 2: Output Filtering (After AI)

```typescript
// Post-generation filtering
async function validateGeneratedContent(content: string, type: string): Promise<{
  safe: boolean;
  needsApproval: boolean;
}> {
  // Images ALWAYS need parent approval
  if (type === 'image') {
    return { safe: true, needsApproval: true };
  }

  // Text content filtering
  const containsPII = detectPersonallyIdentifiableInformation(content);
  const containsInappropriate = checkInappropriateContent(content);

  if (containsPII || containsInappropriate) {
    return { safe: false, needsApproval: false };
  }

  return { safe: true, needsApproval: false };
}
```

#### Layer 3: Context Monitoring

```typescript
// Ongoing conversation monitoring
async function monitorConversation(studentId: string): Promise<{
  alertLevel: 'none' | 'info' | 'warning' | 'critical';
  reason?: string;
}> {
  const recentMessages = await getRecentMessages(studentId, 10);
  const sentiment = await analyzeSentiment(recentMessages);
  const topics = await extractTopics(recentMessages);

  // Check for concerning patterns
  if (sentiment.negative > 0.7) {
    return {
      alertLevel: 'warning',
      reason: 'Student expressing distress'
    };
  }

  if (topics.includes('self-harm') || topics.includes('violence')) {
    return {
      alertLevel: 'critical',
      reason: 'Concerning topics detected'
    };
  }

  return { alertLevel: 'none' };
}
```

### 3.3 Approval Workflow State Machine

```typescript
type ApprovalStatus =
  | 'auto-approved'    // Safe content, no approval needed
  | 'pending-review'   // Awaiting parent decision
  | 'approved'         // Parent approved
  | 'rejected'         // Parent rejected
  | 'expired'          // Request expired (24 hours);

interface ApprovalRequest {
  id: string;
  student_id: string;
  type: 'image-generation' | 'link-access' | 'quota-increase' | 'advanced-feature';
  content: {
    prompt?: string;
    preview_url?: string;
    quota_requested?: number;
  };
  status: ApprovalStatus;
  created_at: number;
  reviewed_at?: number;
  reviewed_by?: string; // parent_id
}

// State machine
const APPROVAL_WORKFLOW = {
  'auto-approved': ['auto-approved'],  // Text responses, safe content
  'pending-review': ['approved', 'rejected', 'expired'],
  'approved': ['approved'],             // Final state
  'rejected': ['rejected'],             // Final state
  'expired': ['expired']                // Final state
};
```

---

## 4. Feature Breakdown

### 4.1 MVP Features (Weeks 1-8)

#### Core Student Features

1. **Voice/Text Chat Interface**
   - Simple push-to-talk or text input
   - AI responses via TTS or text
   - Conversation history (chronological)
   - Emoji reactions for feedback

2. **Basic Generation (Pre-Approved)**
   - Text generation (stories, explanations)
   - Code generation (simple examples)
   - Summarization of topics
   - Translation (language learning)

3. **Daily Allowance System**
   - Parent-set neuron quota
   - Visual progress bar
   - "Request more" button
   - Time-of-day restrictions

4. **Project Management**
   - Save conversations as "projects"
   - Export as PDF or markdown
   - Simple folder organization

#### Parent Features (MVP)

1. **Real-Time Dashboard**
   - Current activity display
   - Today's quota usage
   - Recent conversation preview
   - Approval queue (if any)

2. **Push Notifications**
   - Image generation request
   - Quota increase request
   - Daily activity summary
   - Alert notifications

3. **Settings Management**
   - Daily quota limits
   - Allowed hours (e.g., 3 PM - 8 PM)
   - Content filters (strict/medium/permissive)
   - Multi-child management

#### Teacher Features (MVP)

1. **Class Dashboard**
   - All students overview
   - Activity metrics
   - Struggling student identification
   - Resource usage tracking

2. **Lesson Planning**
   - Share files/prompts with students
   - Create guided dialogues
   - Set learning objectives
   - Track progress

3. **Analytics**
   - Per-student conversation summaries
   - Learning progress tracking
   - Resource allocation
   - Engagement metrics

### 4.2 Add-On Features (Weeks 9+)

#### Advanced Modules

1. **Interactive Tutorials** (Replace ads)
   - "How to write better prompts"
   - "Understanding AI limitations"
   - "Cloudflare Workers basics"
   - "Prompt engineering techniques"

2. **Personalized AI Tutors**
   - Subject-specific helpers (math, science, coding)
   - Adaptive difficulty
   - Progress tracking
   - Homework assistance

3. **LMS Integration**
   - Google Classroom sync
   - Canvas integration
   - Schoology compatibility
   - Automatic grade submission

4. **Social Features (Opt-In)
   - Class-wide projects
   - Peer collaboration (supervised)
   - Show-and-tell gallery
   - Achievement sharing

---

## 5. Parent/Teacher Supervision

### 5.1 Parent Dashboard Design

#### Mobile View (Simplified)

```
┌─────────────────────────────────────┐
│  👤 Alex's Activity                │
│                                     │
│  Status: ✅ Chatting with AI        │
│  Quota: 45% / 100 neurons used     │
│  Time: 15 min today (60 min limit) │
│                                     │
│  📸 Approval Needed (1)            │
│  ┌─────────────────────────────┐   │
│  │ Generate: dragon in castle  │   │
│  │ [Approve] [Reject] [View]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Today's Summary                   │
│  • 3 conversations                │
│  • 2 images generated             │
│  • Learned about: dragons, castles│
│                                     │
│  [View Full Dashboard]             │
└─────────────────────────────────────┘
```

#### Desktop View (Full)

```
┌─────────────────────────────────────────────────────────────────┐
│  👨‍👩‍👧‍👦 Parent Dashboard                           🔔 Settings    │
│                                                                  │
│  Children: [Alex ▼]                     [Week ▼]              │
│                                                                  │
│  📊 Today's Activity                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Quota Used: 45 / 100 neurons    Time: 15 / 60 min      │  │
│  │  ████████████████░░░░░░░░░░░░                            │  │
│  │                                                                 │  │
│  │  Recent Conversations:                                       │  │
│  │  1. "Tell me about dragons" (9:15 AM)                     │  │
│  │  2. "Generate dragon picture" (9:20 AM) → [Approved]      │  │
│  │  3. "How do castles defend against enemies?" (9:30 AM)    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ⚙️  Settings                                                      │
│  • Daily Quota: [100] neurons                                    │
│  • Time Limits: 3 PM - 8 PM (school days only)                 │
│  • Content Filter: [Medium ▼]                                   │
│  • Approve Images: [Always ▼]                                   │
│                                                                  │
│  📈 Weekly Progress                                                │
│  • Most-discussed topics: dragons, castles, medieval history    │
│  • Skills practiced: storytelling, creative thinking             │
│  • Quota efficiency: 89% (great!)                              │
│                                                                  │
│  [View Full Analytics] [Manage Approvals] [Lesson Guides]      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Teacher Dashboard Design

```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Ms. Rodriguez's Class              Period 3 [▼]         │
│                                                                  │
│  Class Overview (25 students)                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Active Now: 18 / 25 students                               │  │
│  │  Average Quota Used: 67 neurons / student                  │  │
│  │  Struggling Students: 3 (needs attention)                  │  │
│  │                                                                 │  │
│  │  Recent Class Activity:                                     │  │
│  │  • Topic: Medieval castles (lesson-aligned) ✅             │  │
│  │  • Skills: Historical inquiry, creative writing            │  │
│  │                                                                 │  │
│  │  [View Student Breakdown] [Manage Lessons]                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  📋 Today's Lesson                                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Medieval Castles Project                                   │  │
│  │                                                                 │  │
│  │  Guiding Prompts:                                            │  │
│  │  1. "What were the main defenses of medieval castles?"      │  │
│  │  2. "Generate a picture of a castle with a moat"           │  │
│  │  3. "How would you improve castle defenses?"              │  │
│  │                                                                 │  │
│  │  Student Progress:                                           │  │
│  │  ✅ 20/25 completed (80%)                                    │  │
│  │  ⚠️  3 need help                                              │  │
│  │  ❌ 2 haven't started                                        │  │
│  │                                                                 │  │
│  │  [View Detailed Analytics] [Send Reminder]                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Lesson Planner] [Analytics] [Resources]                       │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Approval Notification Flow

```typescript
// Notification types
type NotificationType =
  | 'image-approval'      // Parent must approve image
  | 'quota-request'       // Student requesting more quota
  | 'daily-summary'       // End-of-day summary
  | 'concerning-alert'    // Safety concern detected
  | 'milestone'          // Student achievement

// Push notification payload
interface PushNotification {
  type: NotificationType;
  student_id: string;
  student_name: string;
  title: string;
  body: string;
  data: {
    approval_id?: string;
    preview_url?: string;
    quota_requested?: number;
    urgency: 'low' | 'medium' | 'high';
  };
}

// Example notification flow
const NOTIFICATION_EXAMPLES = {
  'image-approval': {
    title: '🖼️ Image Approval Needed',
    body: 'Alex wants to generate: "dragon in a medieval castle"',
    data: {
      approval_id: 'req-123',
      preview_url: 'https://...',
      urgency: 'medium'
    }
  },
  'quota-request': {
    title: '🧠 Quota Request',
    body: 'Alex is requesting 50 more neurons for a project',
    data: {
      quota_requested: 50,
      urgency: 'low'
    }
  },
  'concerning-alert': {
    title: '⚠️ Attention Needed',
    body: 'Concerning topics detected in conversation',
    data: {
      urgency: 'high'
    }
  }
};
```

---

## 6. Daily Allowance System

### 6.1 Quota Templates

#### Conservative (For Younger Students)

```typescript
{
  name: "Conservative",
  daily_quota: 10,      // neurons
  time_limit: 30,        // minutes
  allowed_hours: {
    start: "15:00",      // 3 PM
    end: "17:30"         // 5:30 PM
  },
  auto_approved: [
    "text-generation",
    "summarization"
  ],
  requires_approval: [
    "image-generation",
    "code-generation",
    "web-search"
  ]
}
```

#### Balanced (For Middle School)

```typescript
{
  name: "Balanced",
  daily_quota: 20,      // neurons
  time_limit: 60,        // minutes
  allowed_hours: {
    weekdays: { start: "15:00", end: "20:00" },
    weekends: { start: "10:00", end: "21:00" }
  },
  auto_approved: [
    "text-generation",
    "summarization",
    "code-generation",
    "translation"
  ],
  requires_approval: [
    "image-generation",
    "web-search"
  ]
}
```

#### Generous (For High School)

```typescript
{
  name: "Generous",
  daily_quota: 50,      // neurons
  time_limit: 120,       // minutes
  allowed_hours: "any",  // No time restrictions
  auto_approved: [
    "text-generation",
    "summarization",
    "code-generation",
    "translation",
    "image-generation"
  ],
  requires_approval: [
    "web-search",
    "advanced-models"
  ]
}
```

### 6.2 Bonus Quota System

#### Parent-Granted Bonuses

```typescript
interface BonusQuota {
  id: string;
  student_id: string;
  amount: number;           // Additional neurons
  reason: string;           // "Completed homework", "Good grades"
  granted_by: string;        // parent_id
  expires_at: number;        // Unix timestamp
  one_time: boolean;        // True = doesn't renew daily
}

// Grant bonus quota
POST /api/parent/grant-bonus-quota
{
  "student_id": "abc-123",
  "amount": 50,
  "reason": "Finished science project early",
  "one_time": true
}
```

#### Makerlog-Attached Quota

```typescript
// Makerlog account attaches paid Cloudflare to Studylog
interface AttachedQuota {
  makerlog_account_id: string;
  studylog_student_id: string;
  quota_type: 'paid-cloudflare' | 'makerlog-subscription';
  monthly_allowance: number;     // Neurons per month
  reset_day: 1;                   // Day of month
  billing_source: 'makerlog';     // Billed to Makerlog account
}

// Use case: Parent wants to give student access to expensive models
// Solution: Attach Makerlog's paid Cloudflare account to student's Studylog
```

---

## 7. Educational Progression

### 7.1 Three-Level Learning Path

#### Level 1: AI Explorer (Ages 8-11)

**Focus:** Basic concepts and simple interactions

**Learning Objectives:**
- Understand what AI can and cannot do
- Learn to give clear instructions
- Practice appropriate AI etiquette
- Explore creative applications

**Skills:**
```
✅ Ask questions: "What is a robot?"
✅ Give instructions: "Tell me a story about..."
✅ Provide feedback: "I liked that story"
✅ Request changes: "Make it shorter"
```

**Projects:**
1. **"My AI Friend"** - Create a character through dialogue
2. **"Story Time"** - Generate and illustrate stories
3. **"Question Machine"** - Ask 20 questions about one topic
4. **"Creative Assistant"** - Generate ideas for art projects

**Badge:** 🌟 AI Explorer

#### Level 2: AI Builder (Ages 11-14)

**Focus:** Prompt engineering and ethics

**Learning Objectives:**
- Write effective prompts
- Understand AI limitations and biases
- Learn about responsible AI use
- Explore coding and logic

**Skills:**
```
✅ Structure prompts: "Write a Python function that..."
✅ Iterate: "That's not quite right, try..."
✅ Combine concepts: "Generate code with X and Y"
✅ Verify outputs: "Check if this code works"
```

**Projects:**
1. **"Teach the AI"** - Create a custom personality
2. **"Prompt Master"** - Solve challenges with minimal prompts
3. **"Code Helper"** - Generate and debug simple programs
4. **"Research Assistant"** - Gather and summarize information

**Badges:** 🏆 Prompt Engineer | 🔍 Fact Checker | 🐛 Debug Detective

#### Level 3: Cloud Architect (Ages 14-17)

**Focus:** Workers, D1, deployment, professional skills

**Learning Objectives:**
- Understand cloud architecture
- Deploy real applications
- Learn about APIs and databases
- Build professional portfolio

**Skills:**
```
✅ Use Cloudflare Workers: "Deploy an API endpoint"
✅ Query D1 database: "Store and retrieve user data"
✅ Handle authentication: "Create login system"
✅ Optimize performance: "Cache responses for speed"
```

**Projects:**
1. **"My First Server"** - Deploy a Cloudflare Worker
2. **"Database Builder"** - Create a D1 database schema
3. **"Portfolio Site"** - Deploy personal website
4. **"API Developer"** - Build and document an API

**Badges:** ☁️ Cloud Architect | 🗄️ Database Master | 🚀 Full Stack Developer

### 7.2 Badge System (Aligned with Standards)

**ISTE Standards Alignment:**
- **1.5 Computational Thinker** - Algorithm design, debugging
- **1.6 Creative Communicator** - Multimedia creation, communication
- **1.7 Global Collaborator** - Collaboration with diverse teams
- **2.4 Digital Citizen** - Safe, legal, ethical behavior

**CSTA Standards Alignment:**
- **2-AP-11** - Create clearly and logically organized computational artifacts
- **2-AP-13** - Decompose problems and subproblems
- **2-AP-16** - Incorporate existing code, media, libraries into new programs
- **2-AP-17** - Describe ethical tradeoffs when computing resources are constrained

---

## 8. Integration with Makerlog

### 8.1 Account Linking

```typescript
interface LinkedAccount {
  studylog_student_id: string;
  makerlog_account_id: string;
  linked_by: string;          // parent_id
  linked_at: number;
  permissions: LinkedPermissions;
}

interface LinkedPermissions {
  can_attach_paid_quota: boolean;    // Use Makerlog's paid CF
  can_use_addons: boolean;           // Access Makerlog add-ons
  can_view_makerlog_content: boolean; // See parent's projects
  daily_transfer_limit: number;      // Neurons/day
}
```

### 8.2 Quota Transfer

```typescript
// Parent grants quota from Makerlog to Studylog
POST /api/link/transfer-quota
{
  "makerlog_account_id": "parent-123",
  "studylog_student_id": "child-456",
  "amount": 1000,                    // Neurons to transfer
  "recurring": "daily"              // One-time or recurring
}

// Response
{
  "transferred": 1000,
  "new_studylog_balance": 1050,
  "new_makerlog_balance": 9000,
  "reset_at": "2026-01-22T00:00:00Z"
}
```

### 8.3 Advanced Feature Access

```typescript
// Studylog student can use Makerlog add-ons
interface AddonAccess {
  addon_id: string;
  studylog_student_id: string;
  granted_by: string;              // parent's makerlog_id
  granted_at: number;
  expires_at: number;             // Optional expiration
  permissions: string[];           // What student can do
}

// Example: Grant access to "Desktop Connector" add-on
POST /api/link/grant-addon
{
  "makerlog_account_id": "parent-123",
  "studylog_student_id": "child-456",
  "addon": "desktop-connector",
  "permissions": ["generate-code", "train-models"],
  "supervision": "full"           // Full parental oversight
}
```

---

## 9. Technical Implementation

### 9.1 Database Schema Extensions

```sql
-- Students table (COPPA compliance)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  birth_date TEXT NOT NULL,          -- YYYY-MM-DD
  parent_email TEXT NOT NULL,
  parent_consent_at INTEGER,
  consent_expires_at INTEGER,
  data_retention_days INTEGER DEFAULT 90,
  learning_level TEXT DEFAULT 'explorer', -- explorer, builder, architect
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Parent-child relationships
CREATE TABLE IF NOT EXISTS parent_child_relationships (
  id TEXT PRIMARY KEY,
  parent_user_id TEXT NOT NULL,       -- Makerlog account
  student_user_id TEXT NOT NULL,      -- Studylog account
  relationship_type TEXT NOT NULL,    -- parent, guardian, teacher
  permissions_json TEXT NOT NULL,     -- JSON: granted capabilities
  created_at INTEGER NOT NULL,
  FOREIGN KEY (parent_user_id) REFERENCES users(id),
  FOREIGN KEY (student_user_id) REFERENCES users(id)
);

-- Approval queue
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  type TEXT NOT NULL,                  -- image, quota, feature
  request_data TEXT NOT NULL,         -- JSON: prompt, preview_url, etc.
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, expired
  requested_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT,                   -- parent_user_id
  review_reason TEXT,
  expires_at INTEGER NOT NULL,        -- Auto-expire in 24h
  FOREIGN KEY (student_id) REFERENCES users(id)
);

-- Daily allowances
CREATE TABLE IF NOT EXISTS daily_allowances (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL,                 -- YYYY-MM-DD
  quota_template TEXT NOT NULL,       -- conservative, balanced, generous
  daily_quota INTEGER NOT NULL,
  quota_used INTEGER DEFAULT 0,
  time_limit_minutes INTEGER,
  allowed_hours_start TEXT,
  allowed_hours_end TEXT,
  bonus_quota INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(student_id, date),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

-- Teacher classes
CREATE TABLE IF NOT EXISTS teacher_classes (
  id TEXT PRIMARY KEY,
  teacher_user_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  student_ids TEXT NOT NULL,         -- JSON array
  created_at INTEGER NOT NULL,
  FOREIGN KEY (teacher_user_id) REFERENCES users(id)
);

-- Lesson plans
CREATE TABLE IF NOT EXISTS lesson_plans (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  guiding_prompts TEXT,              -- JSON: array of prompts
  learning_objectives TEXT,          -- JSON: array of objectives
  created_at INTEGER NOT NULL,
  scheduled_for TEXT,
  FOREIGN KEY (class_id) REFERENCES teacher_classes(id)
);

-- Indexes
CREATE INDEX idx_approval_student_status
  ON approval_requests(student_id, status, expires_at);
CREATE INDEX idx_daily_allowances_date
  ON daily_allowances(date, student_id);
CREATE INDEX idx_parent_child_parent
  ON parent_child_relationships(parent_user_id);
```

### 9.2 API Endpoints

```typescript
// Student-facing
GET    /api/student/quota                    // Current quota status
POST   /api/student/request-bonus           // Ask for more quota
GET    /api/student/conversations           // Chat history
POST   /api/student/generate                // Generate (with approval check)

// Parent-facing
GET    /api/parent/dashboard               // Overview of children
GET    /api/parent/approvals                // Pending approvals
POST   /api/parent/approve/:id              // Approve request
POST   /api/parent/reject/:id               // Reject request
PUT    /api/parent/settings/:child          // Update allowance
POST   /api/parent/link-makerlog            // Link Makerlog account
GET    /api/parent/analytics/:child         // Detailed analytics

// Teacher-facing
GET    /api/teacher/dashboard              // Class overview
GET    /api/teacher/class/:id               // Class details
POST   /api/teacher/lesson                  // Create lesson
GET    /api/teacher/analytics/:class        // Class analytics
POST   /api/teacher/share-file             // Share resource with students

// Safety & Compliance
POST   /api/verify-age                     // Age verification
POST   /api/parent/consent                  // Parental consent
POST   /api/parent/delete-data              // Right to be forgotten
GET    /api/parent/data-export              // Export all data
```

### 9.3 Frontend Components

#### Student Chat Interface

```typescript
// components/studylog/StudentChat.tsx
export function StudentChat() {
  const { student } = useStudentContext();
  const { quota } = useQuotaContext();
  const { sendMessage, isRecording } = useVoiceChat();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4">
      {/* Header with quota */}
      <header className="flex items-center justify-between mb-4">
        <div className="text-2xl">👋 Hi, {student.firstName}!</div>
        <QuotaBar used={quota.used} total={quota.total} />
      </header>

      {/* Conversation area */}
      <ConversationList messages={messages} />

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        {isRecording ? (
          <RecordingIndicator onCancel={stopRecording} />
        ) : (
          <InputArea
            onSend={sendMessage}
            onRecordStart={startRecording}
            disabled={quota.remaining < 10}
          />
        )}
      </div>
    </div>
  );
}
```

#### Parent Dashboard

```typescript
// components/studylog/ParentDashboard.tsx
export function ParentDashboard() {
  const { children } = useParentContext();
  const { approvals } = useApprovalContext();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">👨‍👩‍👧‍👦 Parent Dashboard</h1>
      </header>

      {/* Children selector */}
      <ChildSelector children={children} />

      {/* Today's overview */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Today's Activity</h2>
        <ActivityOverview childId={selectedChild} />
      </section>

      {/* Approvals queue */}
      {approvals.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            🔔 {approvals.length} Approval{approvals.length > 1 ? 's' : ''} Needed
          </h2>
          <ApprovalList items={approvals} />
        </section>
      )}

      {/* Quick settings */}
      <section>
        <h2 className="text-xl font-semibold mb-4">⚙️ Quick Settings</h2>
        <QuickSettings childId={selectedChild} />
      </section>
    </div>
  );
}
```

---

## 10. 12-Week Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goals:** Setup, safety infrastructure, basic chat

- [ ] Extend database schema (students, approvals, allowances)
- [ ] Implement COPPA compliance (age verification, consent)
- [ ] Build Llama Guard 3 integration (content filtering)
- [ ] Create simple chat interface
- [ ] Implement TTS responses
- [ ] Add basic quota tracking

**Deliverable:** Safe chat interface for students

### Phase 2: Parent Features (Weeks 3-4)

**Goals:** Dashboard, approvals, notifications

- [ ] Build parent dashboard web app
- [ ] Implement approval workflow
- [ ] Add push notification system
- [ ] Create allowance management UI
- [ ] Build multi-child support
- [ ] Add analytics overview

**Deliverable:** Parents can supervise and approve

### Phase 3: Teacher Features (Weeks 5-6)

**Goals:** Class dashboard, lesson planning

- [ ] Build teacher dashboard
- [ ] Implement class management
- [ ] Create lesson planner
- [ ] Add file sharing system
- [ ] Build student analytics
- [ ] Implement progress tracking

**Deliverable:** Teachers can manage classes

### Phase 4: Advanced Features (Weeks 7-8)

**Goals:** Quota transfer, Makerlog linking

- [ ] Implement Makerlog account linking
- [ ] Build quota transfer system
- [ ] Add add-on access for students
- [ ] Create export/import functionality
- [ ] Build certificate generation
- [ ] Add educational badges

**Deliverable:** Full Makerlog integration

### Phase 5: Polish & Launch (Weeks 9-10)

**Goals:** Testing, optimization, documentation

- [ ] Comprehensive safety testing
- [ ] Performance optimization
- [ ] Accessibility audit (WCAG 2.2 AA)
- [ ] User testing (parents, teachers, students)
- [ ] Security audit
- [ ] Documentation (user guides, API docs)

**Deliverable:** Production-ready platform

### Phase 6: Launch & Iterate (Weeks 11-12)

**Goals:** Deployment, monitoring, iteration

- [ ] Deploy to production (studylog.ai)
- [ ] Set up monitoring and alerts
- [ ] Create onboarding flow
- [ ] Build tutorial system (replace ads)
- [ ] Gather user feedback
- [ ] Plan next features based on data

**Deliverable:** Live Studylog.ai platform

---

## Success Metrics

### Safety Metrics

- **Zero safety incidents** - No inappropriate content reaches students
- **100% COPPA compliance** - All requirements met
- **<1 hour** response time for concerning alerts
- **95%+ approval rate** - Parental satisfaction with supervision

### Engagement Metrics

- **70%+ DAU/MAU stickiness** - Daily active users / monthly active
- **50%+ students complete 3+ projects/week**
- **80%+ parents check dashboard weekly**
- **90%+ teachers use platform weekly**

### Learning Metrics

- **85%+ students advance to next level within 6 months**
- **90%+ badge completion rate for introduced skills
- **75%+ teacher satisfaction with lesson planning tools
- **4.5+ educational value rating (5-point scale)

---

**Sources:**
- COPPA Rule: https://www.ftc.gov/enforcement/rules/rulemaking-regulations-under-the-coppa-act
- ISTE Standards: https://www.iste.org/standards
- CSTA Standards: https://www.csteachers.org/page/cstak12standards
- Llama Guard 3: https://llama-meta.com/llama-guard/
- Cloudflare Workers AI: https://developers.cloudflare.com/workers-ai/

**Document Version:** 1.0
**Last Updated:** 2026-01-21
**Next Review:** 2026-02-01
