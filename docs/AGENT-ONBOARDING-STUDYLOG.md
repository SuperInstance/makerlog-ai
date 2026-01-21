# Studylog.ai Implementation Agent Guide

**For:** Implementation Agents working on Studylog.ai features
**Platform:** Studylog.ai (Under-18, COPPA Compliant)
**Version:** 1.0
**Date:** January 21, 2026

---

## Platform Overview

**Studylog.ai** is a kid-friendly AI learning platform for ages 8-17.

**Target Users:**
- **Students (8-17):** Learn through voice conversations with AI
- **Parents:** Supervise children, set quotas, approve requests
- **Teachers:** Manage classrooms (up to 25 students), share lessons

**Key Constraints:**
- **COPPA Compliance Required** - Federal law for children's privacy
- **Parental Supervision Mandatory** - Under-13 requires consent
- **Multi-Layer Safety** - Input filtering, output filtering, context monitoring
- **No Data Storage Beyond Necessary** - Right to be forgotten

---

## Critical: COPPA Compliance

**What is COPPA?**
Children's Online Privacy Protection Act - US federal law requiring parental consent for data collection from children under 13.

**Non-Negotiable Requirements:**

1. **Age Verification**
   ```typescript
   // MUST: Collect exact birth date, NOT age range
   interface AgeVerification {
     step1: "Enter birth date";  // MM/DD/YYYY format
     step2: "Parent email";      // For under-13 only
     step3: "Parent consent";    // Verifiable consent required
     step4: "Account created";   // With parental controls enabled
   }
   ```

2. **Parental Consent (Under-13)**
   ```typescript
   // MUST: Verifiable parental consent BEFORE data collection
   export async function verifyParentConsent(
     env: Env,
     parentId: string,
     consentMethod: 'email' | 'sms' | 'government_id'
   ): Promise<boolean> {

     // Send verification link
     const token = generateSecureToken();
     await sendVerificationLink(parentId, token);

     // Parent must click link AND confirm
     const confirmed = await waitForConfirmation(token, 24 * 60 * 60 * 1000);

     if (!confirmed) {
       throw new Error('Parental consent timeout - account not created');
     }

     return true;
   }
   ```

3. **Data Minimization**
   ```typescript
   // MUST: Collect only what's necessary
   interface StudentData {
     // REQUIRED (minimal)
     id: string;
     birth_date: Date;           // For age verification
     parent_id: string;           // For under-13
     created_at: number;          // For right-to-be-forgotten

     // OPTIONAL (with parental consent)
     nickname?: string;           // NO real names
     avatar_url?: string;         // NO photos (use generated)
     learning_progress?: any;     // Only if parent opts in

     // PROHIBITED
     // real_name: string;         ❌ NEVER collect
     // address: string;           ❌ NEVER collect
     // phone: string;             ❌ NEVER collect
     // school_name: string;       ❌ WITHOUT separate consent
   }
   ```

4. **Right to Be Forgotten**
   ```typescript
   // MUST: Allow complete data deletion
   export async function deleteStudentAccount(env: Env, studentId: string) {
     const txn = env.DB.batch();

     // Delete all student data
     const tables = [
       'students',
       'conversations',
       'messages',
       'approval_requests',
       'daily_allowances',
       'projects',
     ];

     for (const table of tables) {
       txn.push(
         env.DB.prepare(`DELETE FROM ${table} WHERE student_id = ?`)
           .bind(studentId)
       );
     }

     // Delete assets from R2
     const assets = await listStudentAssets(env, studentId);
     for (const asset of assets) {
       await env.ASSETS.delete(asset.key);
     }

     await txn;

     // Log deletion for compliance
     await logDataDeletion(env, {
       studentId,
       deletedAt: Date.now(),
       tablesDeleted: tables.length,
       assetsDeleted: assets.length,
     });
   }
   ```

---

## Safety Infrastructure

### Three-Layer Content Filtering

**Layer 1: Input Filtering (Before AI)**
```typescript
// workers/api/src/services/safety.ts
export async function filterUserInput(env: Env, input: string): Promise<SafetyResult> {
  const result = await env.AI.run('@cf/meta/llama-guard-3-8b', {
    input: [{ role: 'user', content: input }],
  });

  if (!result.safe) {
    // Log for parent review
    await logBlockedContent(env, {
      studentId: getStudentId(),
      type: 'input',
      content: input,
      reason: result.violation,
      timestamp: Date.now(),
    });

    // Notify parent for serious violations
    if (result.severity === 'high') {
      await notifyParentOfViolation(env, getStudentId(), result);
    }
  }

  return {
    safe: result.safe,
    violation: result.violation,
    severity: result.severity,
  };
}
```

**Layer 2: Output Filtering (Before Student)**
```typescript
export async function filterAIOutput(env: Env, output: string): Promise<SafetyResult> {
  const result = await env.AI.run('@cf/meta/llama-guard-3-8b', {
    input: [{ role: 'assistant', content: output }],
  });

  if (!result.safe) {
    // Log unsafe AI generation
    await logBlockedContent(env, {
      studentId: getStudentId(),
      type: 'output',
      content: output,
      reason: result.violation,
      timestamp: Date.now(),
    });

    // Return safe fallback
    return {
      safe: false,
      fallback: "I'm sorry, I can't help with that. Let's try something else!",
    };
  }

  return { safe: true };
}
```

**Layer 3: Context Monitoring (Ongoing)**
```typescript
// Monitor conversation patterns for safety issues
export async function monitorConversationSafety(env: Env, conversationId: string) {
  const messages = await getMessages(env, conversationId);

  // Check for patterns
  const patterns = {
    personalInfoSharing: detectPersonalInfo(messages),
    inappropriateTopics: detectInappropriateTopics(messages),
    groomingBehavior: detectGroomingBehavior(messages),
    distressSignals: detectDistressSignals(messages),
  };

  // Alert parent for serious concerns
  if (patterns.greetingBehavior || patterns.distressSignals) {
    await alertParentImmediately(env, {
      studentId: getStudentId(conversationId),
      concern: Object.keys(patterns).filter(k => patterns[k]),
      urgency: 'high',
    });
  }

  // Log for review
  if (Object.values(patterns).some(p => p)) {
    await logSafetyConcern(env, { patterns, conversationId });
  }
}
```

---

## Approval Workflows

### Sensitive Request Categories

**Requests Requiring Parent Approval:**

| Category | Examples | Approval Flow |
|----------|----------|---------------|
| **Image Generation** | "Generate a picture of..." | Parent reviews prompt |
| **Code Generation** | "Write code to..." | Parent reviews code |
| **External Links** | "Search for..." | Parent reviews destination |
| **Quota Increase** | "I need more turns..." | Parent grants/rejects |
| **Account Changes** | Change nickname, avatar | Parent approves |

### Approval Flow Implementation

```typescript
// workers/api/src/services/approvals.ts
export async function requestApproval(
  env: Env,
  request: ApprovalRequest
): Promise<string> {

  // Validate parent exists
  const parent = await getParent(env, request.parentId);
  if (!parent) {
    throw new Error('No parent associated with account');
  }

  // Create approval request
  const approvalId = generateId();
  await env.DB.prepare(`
    INSERT INTO approval_requests (
      id, student_id, parent_id, type, payload, status, created_at
    ) VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).bind(
    approvalId,
    request.studentId,
    request.parentId,
    request.type,
    JSON.stringify(request.payload),
    Date.now()
  ).run();

  // Send push notification to parent
  await sendPushNotification(env, {
    to: parent.push_token,
    title: `${request.studentName} needs your approval`,
    body: getApprovalMessage(request.type, request.payload),
    data: {
      type: 'approval_request',
      approvalId: approvalId,
      action: `studylog://approvals/${approvalId}`,
    },
  });

  // Also send email if parent has email notifications enabled
  if (parent.notifications.email) {
    await sendApprovalEmail(env, parent.email, {
      approvalId,
      studentName: request.studentName,
      type: request.type,
      approveUrl: `https://studylog.ai/approve/${approvalId}`,
      rejectUrl: `https://studylog.ai/reject/${approvalId}`,
    });
  }

  return approvalId;
}

export async function handleApprovalResponse(
  env: Env,
  approvalId: string,
  decision: 'approve' | 'reject',
  parentId: string
): Promise<void> {

  // Verify parent owns this approval
  const approval = await env.DB.prepare(`
    SELECT * FROM approval_requests
    WHERE id = ? AND parent_id = ?
  `).bind(approvalId, parentId).first();

  if (!approval) {
    throw new Error('Approval not found or unauthorized');
  }

  // Update status
  await env.DB.prepare(`
    UPDATE approval_requests
    SET status = ?, decided_at = ?
    WHERE id = ?
  `).bind(decision === 'approve' ? 'approved' : 'rejected', Date.now(), approvalId)
   .run();

  // If approved, execute the request
  if (decision === 'approve') {
    await executeApprovedRequest(env, approval);
  }

  // Notify student
  await notifyStudentOfDecision(env, {
    studentId: approval.student_id,
    decision,
    type: approval.type,
  });
}
```

---

## Daily Allowance System

### Allowance Templates

```typescript
// workers/api/src/services/allowance.ts
export const ALLOWANCE_TEMPLATES = {
  // Age 8-10: Limited exploration
  explorer: {
    dailyQuota: 10,           // 10 AI turns per day
    timeWindow: {             // Only after school
      start: '15:00',
      end: '20:00',
    },
    weekendExtension: true,    // Extra time on weekends
  },

  // Age 11-13: Moderate usage
  builder: {
    dailyQuota: 20,
    timeWindow: {
      start: '14:00',
      end: '21:00',
    },
    weekendExtension: true,
  },

  // Age 14-17: More autonomy
  architect: {
    dailyQuota: 30,
    timeWindow: null,         // No time restrictions
    weekendExtension: false,   // Same every day
  },
};
```

### Quota Enforcement

```typescript
export async function checkQuotaBeforeRequest(env: Env, studentId: string): Promise<QuotaCheck> {
  const student = await getStudent(env, studentId);
  const today = new Date().toISOString().split('T')[0];

  // Get today's usage
  const usage = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM messages
    WHERE student_id = ?
      AND DATE(created_at / 1000, 'unixepoch') = ?
  `).bind(studentId, today).first();

  const used = usage.count || 0;
  const allowance = getAllowanceForAge(student.age);

  // Check time window
  if (allowance.timeWindow) {
    const now = new Date();
    const currentHour = now.getHours();
    const [startHour, endHour] = [
      parseInt(allowance.timeWindow.start.split(':')[0]),
      parseInt(allowance.timeWindow.end.split(':')[0]),
    ];

    if (currentHour < startHour || currentHour > endHour) {
      return {
        allowed: false,
        reason: 'outside_time_window',
        message: `Studylog is available from ${allowance.timeWindow.start} to ${allowance.timeWindow.end}`,
        canRequestMore: false,
      };
    }
  }

  // Check quota
  if (used >= allowance.dailyQuota) {
    return {
      allowed: false,
      reason: 'quota_exceeded',
      message: "You've used all your AI turns for today!",
      canRequestMore: true,
    };
  }

  return {
    allowed: true,
    remaining: allowance.dailyQuota - used,
  };
}
```

---

## UI Guidelines for Studylog

### Visual Design

**Age-Appropriate Aesthetics:**
```typescript
// Color palette by age group
export const THEMES = {
  // Ages 8-10: Bright, friendly
  explorer: {
    primary: '#4ECDC4',      // Bright teal
    secondary: '#FF6B6B',    // Friendly red
    background: '#F7FFF7',   // Soft green-white
    text: '#2D3436',
  },

  // Ages 11-13: Balanced
  builder: {
    primary: '#6C5CE7',      // Purple
    secondary: '#00B894',    // Green
    background: '#DFE6E9',
    text: '#2D3436',
  },

  // Ages 14-17: More mature
  architect: {
    primary: '#0984E3',      // Blue
    secondary: '#6C5CE7',    // Purple
    background: '#2D3436',
    text: '#DFE6E9',
  },
};
```

**Large Touch Targets:**
```css
/* Minimum 44×44px for all interactive elements */
.studylog-button {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 12px;
}
```

**Simple Language:**
```typescript
// Use 8th grade reading level
export const MESSAGES = {
  quotaExceeded: "You've used all your turns for today!",
  requestMore: "Ask your parent for more turns",
  approvalNeeded: "Ask your parent for permission",
  parentApproved: "Your parent said yes!",
  parentRejected: "Your parent said not right now",
};
```

### Student Dashboard

```typescript
// src/components/StudentDashboard.tsx
export function StudentDashboard({ student }: Props) {
  return (
    <div className="student-dashboard">
      {/* Progress bar - visual and friendly */}
      <div className="quota-progress">
        <div className="bar-container">
          <div
            className="bar-fill"
            style={{ width: `${(used / total) * 100}%` }}
          />
        </div>
        <p className="turns-remaining">
          🎯 {remaining} turns left today!
        </p>
      </div>

      {/* Learning level */}
      <div className="level-badge">
        <span className="level-icon">
          {student.level === 'explorer' && '🚀'}
          {student.level === 'builder' && '🔨'}
          {student.level === 'architect' && '🏛️'}
        </span>
        <span className="level-name">
          {student.level.charAt(0).toUpperCase() + student.level.slice(1)}
        </span>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <Button icon="🎤" label="Start Chat" />
        <Button icon="📁" label="My Projects" />
        <Button icon="⭐" label="Achievements" />
      </div>
    </div>
  );
}
```

---

## Parent Dashboard Implementation

### Real-Time Activity Monitoring

```typescript
// src/components/ParentDashboard.tsx
export function ParentDashboard({ parent }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);

  // Subscribe to real-time updates
  useEffect(() => {
    const ws = new WebSocket(`wss://api.studylog.ai/parent/updates?token=${parent.token}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'activity':
          setActivities(prev => [data.activity, ...prev]);
          break;
        case 'approval_request':
          setApprovals(prev => [data.request, ...prev]);
          break;
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="parent-dashboard">
      {/* Multi-child selector */}
      <ChildSelector children={parent.children} />

      {/* Today's quota usage */}
      <QuotaUsageChart childId={selectedChild} />

      {/* Approval queue */}
      {approvals.length > 0 && (
        <ApprovalQueue
          requests={approvals}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* Activity timeline */}
      <ActivityTimeline activities={activities} />

      {/* Settings */}
      <QuickSettings childId={selectedChild} />
    </div>
  );
}
```

### Quick Settings Panel

```typescript
// src/components/QuickSettings.tsx
export function QuickSettings({ childId }: Props) {
  const [settings, setSettings] = useState<ChildSettings>();

  return (
    <div className="quick-settings">
      <h3>Daily Settings</h3>

      {/* Quota slider */}
      <div className="setting">
        <label>Daily AI Turns</label>
        <input
          type="range"
          min="5"
          max="50"
          value={settings.dailyQuota}
          onChange={(e) => updateSetting('dailyQuota', e.target.value)}
        />
        <span>{settings.dailyQuota} turns</span>
      </div>

      {/* Time window */}
      <div className="setting">
        <label>Available Hours</label>
        <TimeRangePicker
          value={settings.timeWindow}
          onChange={(value) => updateSetting('timeWindow', value)}
        />
      </div>

      {/* Content filter level */}
      <div className="setting">
        <label>Safety Level</label>
        <select
          value={settings.safetyLevel}
          onChange={(e) => updateSetting('safetyLevel', e.target.value)}
        >
          <option value="strict">Strict (blocks more)</option>
          <option value="moderate">Moderate (balanced)</option>
          <option value="permissive">Permissive (blocks less)</option>
        </select>
      </div>
    </div>
  );
}
```

---

## Teacher Dashboard Implementation

### Classroom Management

```typescript
// src/components/TeacherDashboard.tsx
export function TeacherDashboard({ teacher }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class>();

  return (
    <div className="teacher-dashboard">
      {/* Class selector */}
      <ClassSelector
        classes={teacher.classes}
        selected={selectedClass}
        onSelect={setSelectedClass}
      />

      {/* Class overview (max 25 students) */}
      <ClassOverview classId={selectedClass.id}>
        {/* Student roster with status */}
        <StudentRoster students={students}>
          {(student) => (
            <StudentCard
              key={student.id}
              student={student}
              metrics={{
                activitiesToday: student.activityCount,
                quotaUsed: student.quotaUsed,
                currentLevel: student.level,
                strugglingWith: student.weakTopics,
              }}
            />
          )}
        </StudentRoster>

        {/* Class-wide metrics */}
        <ClassMetrics>
          <MetricCard label="Active Today" value={`${activeCount}/${students.length}`} />
          <MetricCard label="Avg Quota Used" value={`${avgQuotaUsed}%`} />
          <MetricCard label="Struggling Students" value={strugglingCount} />
        </ClassMetrics>
      </ClassOverview>

      {/* Lesson planning */}
      <LessonBuilder classId={selectedClass.id} />

      {/* Analytics */}
      <ClassAnalytics classId={selectedClass.id} />
    </div>
  );
}
```

---

## Testing Requirements for Studylog

### Safety Testing

```typescript
// tests/safety/studylog-safety.test.ts
describe('Studylog Safety', () => {
  it('should block inappropriate input', async () => {
    const result = await filterUserInput(env, 'How do I make a bomb?');
    expect(result.safe).toBe(false);
    expect(result.severity).toBe('high');
  });

  it('should block inappropriate AI output', async () => {
    const malicious = 'Here is how to make a bomb...';
    const result = await filterAIOutput(env, malicious);
    expect(result.safe).toBe(false);
  });

  it('should detect grooming behavior', async () => {
    const messages = [
      { role: 'user', content: 'What is your real name?' },
      { role: 'assistant', content: "I don't have a real name, but you can call me Study Buddy!" },
      { role: 'user', content: 'Where do you live? Can we meet?' },
    ];

    const detected = await detectGroomingBehavior(messages);
    expect(detected).toBe(true);
  });
});
```

### COPPA Compliance Testing

```typescript
// tests/compliance/coppa.test.ts
describe('COPPA Compliance', () => {
  it('should require parent consent for under-13', async () => {
    const under13 = new Date('2015-01-01'); // 11 years old
    await expect(createAccount(env, { birthDate: under13 }))
      .rejects.toThrow('Parental consent required');
  });

  it('should delete all data on request', async () => {
    const studentId = await createTestStudent(env);
    await generateActivity(env, studentId, 10);

    await deleteStudentAccount(env, studentId);

    const messages = await env.DB.prepare(
      'SELECT * FROM messages WHERE student_id = ?'
    ).bind(studentId).all();

    expect(messages.results).toHaveLength(0);
  });

  it('should not collect real names', async () => {
    const student = await getStudent(env, studentId);

    expect(student.realName).toBeUndefined();
    expect(student.nickname).toBeDefined();
  });
});
```

---

## Common Studylog Pitfalls

### ❌ Don't: Skip Safety Filtering

```typescript
// BAD: Unfiltered AI response
const response = await env.AI.run(model, { prompt });
return response; // Could show inappropriate content!
```

### ✅ Do: Always Filter Studylog Responses

```typescript
// GOOD: Filtered AI response
const response = await env.AI.run(model, { prompt });
const isSafe = await filterAIOutput(env, response.content);
if (!isSafe) {
  return { safe: false, fallback: getFallbackResponse() };
}
return { safe: true, content: response.content };
```

### ❌ Don't: Collect More Data Than Necessary

```typescript
// BAD: Collecting real names
interface Student {
  firstName: string;   // ❌ COPPA violation
  lastName: string;    // ❌ COPPA violation
}
```

### ✅ Do: Use Nicknames Only

```typescript
// GOOD: Nicknames only
interface Student {
  nickname: string;    // ✅ "SpaceExplorer99"
  displayName: string; // ✅ "Junior Astronaut"
}
```

### ❌ Don't: Allow Unrestricted Access

```typescript
// BAD: No quota checking
export async function chat(env: Env, studentId: string, message: string) {
  const response = await env.AI.run(model, { prompt: message });
  return response;
}
```

### ✅ Do: Enforce Quotas

```typescript
// GOOD: Check quota first
export async function chat(env: Env, studentId: string, message: string) {
  const quotaCheck = await checkQuotaBeforeRequest(env, studentId);
  if (!quotaCheck.allowed) {
    throw new Error(quotaCheck.message);
  }

  const response = await env.AI.run(model, { prompt: message });
  await recordQuotaUsage(env, studentId);
  return response;
}
```

---

## Checklist: Studylog Feature Implementation

Before committing any Studylog feature:

- [ ] **COPPA Compliance:**
  - [ ] Under-13 requires parental consent?
  - [ ] Collecting only necessary data?
  - [ ] Right to be forgotten implemented?

- [ ] **Safety:**
  - [ ] Input filtering before AI?
  - [ ] Output filtering before display?
  - [ ] Context monitoring for patterns?

- [ ] **Approvals:**
  - [ ] Sensitive requests require approval?
  - [ ] Parents notified of requests?
  - [ ] Approval queue accessible?

- [ ] **Quota:**
  - [ ] Daily limits enforced?
  - [ ] Time windows respected?
  - [ ] Visual feedback for remaining?

- [ ] **UI:**
  - [ ] Age-appropriate design?
  - [ ] Touch targets 44×44px minimum?
  - [ ] Simple language (8th grade level)?

---

**Remember:** Studylog serves children. Safety and compliance are non-negotiable. When in doubt, ask: "What would a parent expect?"

**Sources:**
- `docs/research/STUDYLOG-KIDS-PLATFORM.md` - Complete Studylog specification
- `docs/AGENT-ONBOARDING.md` - General agent onboarding
- `CLAUDE.md` - Project overview
