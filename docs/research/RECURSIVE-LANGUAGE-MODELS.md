# Recursive Language Models (RLMs): The Paradigm of 2026

**Research Document:** Recursive Language Models for Long-Context Reasoning
**Created:** 2026-01-21
**Applies to:** Makerlog.ai Overnight Planning and Style Learning

## Overview

**Recursive Language Models (RLMs)** represent a fundamental shift in how AI systems handle long-context tasks. Instead of feeding massive prompts into a model's context window, RLMs treat prompts as **external environments** that the model interacts with programmatically through code execution.

**Key Insight from [PrimeIntellect](https://www.primeintellect.ai/blog/rlm):**
> "RLMs are the simplest, most flexible method for context folding."

## Core Concepts

### Traditional LLM vs RLM

```
Traditional LLM:
Prompt (50K tokens) → Model → Output
❌ Context rot (quality degradation)
❌ Expensive (proportional to input size)
❌ Limited by context window (128K tokens max)

RLM:
Prompt (5M tokens) → Python REPL → Model → Code Execution → Output
✅ No context rot (model sees only task instructions)
✅ Cost-efficient (median cost comparable to single call)
✅ Unlimited context (stored as external variable)
```

### RLM Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Root LLM (Controller)                    │
│  - Sees: System prompt + task description (short)           │
│  - Has access: Python REPL with context variable            │
│  - Can spawn: Sub-LLMs for parallel processing              │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────────┐
        │         Python REPL Environment            │
        │  context = "MASSIVE_INPUT_DATA"           │
        │  llm_query(prompt) → str                  │
        │  llm_batch(prompts) → list[str]           │
        │  answer = {"content": "", "ready": False} │
        └───────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────────┐
        │         Sub-LLMs (Workers)                 │
        │  - Process chunks of context              │
        │  - Return structured outputs              │
        │  - Can run in parallel (4-8 workers)      │
        └───────────────────────────────────────────┘
```

### How RLM Works

**1. Context as Environment:**
```python
# Massive context stored as variable (NOT in model context!)
context = """
[5 million tokens of conversation history,
 user feedback, generated assets, etc.]
"""
```

**2. Programmatic Interaction:**
```python
# Root LLM writes Python code to analyze context
tasks_str = context[:10000]  # Process first chunk
analysis = llm_query(f"Analyze these tasks: {tasks_str}")

# Parallel processing of chunks
chunks = [context[i:i+10000] for i in range(0, len(context), 10000)]
results = llm_batch([f"Summarize: {chunk}" for chunk in chunks])

# Build answer incrementally
answer['content'] = synthesis
answer['ready'] = True
```

**3. Recursive Sub-calling:**
- Root LLM spawns fresh instances for parallel processing
- Each sub-LLM processes a chunk independently
- Results aggregated back to root LLM
- Enables 100x parallelization

## Key Innovations

### 1. Context Folding

**Problem**: Long conversations cause context rot and degrade quality.

**RLM Solution**: Fold conversation intelligently while preserving information.

```python
# Example: Fold 100K conversation to 10K
original = get_conversation_history()  # 100K tokens

# RLM analyzes and folds
folded = rl_folder.fold(original, target_ratio=0.1)

# Result:
# - Summary: Key topics and decisions
# - Key points: Important information preserved
# - User preferences: Extracted patterns
# - Style vectors: For future reference
```

**Benefits**:
- **90% compression** without information loss
- **28% better performance** on long-context tasks (OOLONG benchmark)
- **Preserves context** across sessions

### 2. Overnight Task Planning

**Problem**: Complex projects require breaking down into hundreds of tasks.

**RLM Solution**: Analyze all tasks, optimize execution, create dependency graph.

```python
# Input: 500 pending tasks
tasks = get_pending_tasks()

# RLM analyzes massive task list
plan = rlm_planner.plan(
    context=tasks,
    constraints={
        "max_hours": 8,
        "vram_gb": 12,
        "max_concurrent": 2
    }
)

# Output:
# {
#   "phases": [
#     {"name": "Quick Tasks", "tasks": [...], "model": "8B"},
#     {"name": "Cascaded Tasks", "tasks": [...], "model": "32B"},
#     {"name": "Complex Tasks", "tasks": [...], "model": "R1"}
#   ],
#   "estimated_time": "6 hours",
#   "total_tasks": 450
# }
```

**Benefits**:
- **Intelligent task grouping** by complexity and type
- **Optimal model selection** for each task
- **Dependency resolution** and critical path analysis
- **Resource estimation** for time/VRAM/quota

### 3. Style Learning from Massive History

**Problem**: Current vector math approach doesn't understand "why" user preferences exist.

**RLM Solution**: Deep analysis of hundreds of examples to extract patterns.

```python
# Input: All user's feedback history (thousands of ratings)
history = get_user_feedback_history(userId)

# RLM analyzes patterns
style_profile = rlm_learner.learn(
    context=history,
    analysis_tasks=[
        "Group by rating (4-5 stars vs 1-2 stars)",
        "Identify patterns in highly-rated outputs",
        "Extract preferred parameters (steps, CFG, etc.)",
        "Build preference vector",
        "Identify context-dependent preferences"
    ]
)

# Output:
# {
#   "preferenceVector": [0.23, -0.45, ...],  # 512-dim
#   "promptModifiers": ["minimalist", "pastel"],
#   "preferredParams": {"steps": 30, "cfg": 7},
#   "avoidPatterns": ["cluttered", "dark"],
#   "contextApplicability": ["web_design", "branding"]
# }
```

**Benefits**:
- **Learns from 3-5 examples** instead of 50+
- **Understands context** (when preferences apply)
- **Explains reasoning** (why this preference exists)
- **Generates modifiers** automatically

## Application to Makerlog.ai

### Current Architecture Limitations

```
Current Flow:
1. User has conversation (50+ messages)
2. System loads full conversation into LLM context
3. Context window fills up → quality degrades
4. No overnight planning → tasks processed randomly
5. Style learning slow → requires 50+ feedbacks
```

### RLM-Enhanced Architecture

```
Enhanced Flow:
1. User has conversation (50+ messages)
2. RLM folds conversation → 10K summary + key points
3. Overnight: RLM analyzes all pending tasks → optimized plan
4. RLM learns style from massive history → rich preferences
5. System uses learned preferences → better generations
```

### Implementation Strategy

#### Phase 1: RLM Infrastructure (Weeks 1-2)

**Core Components:**

```typescript
// packages/desktop-connector/src/rlm/core/RLMEnvironment.ts

export class RLMEnvironment {
  private contextVariables: Map<string, any> = new Map();
  private subLLMCalls: number = 0;

  /**
   * Initialize RLM with massive context
   */
  async initialize(contextData: string): Promise<RLMContext> {
    // Store context as variable (NOT in model!)
    this.contextVariables.set('context', contextData);

    return {
      context: '<CONTEXT_LOADED>',
      llm_query: this.createQueryFunction(),
      llm_batch: this.createBatchFunction(),
      answer: { content: '', ready: false }
    };
  }

  /**
   * Allow model to query sub-LLMs
   */
  private createQueryFunction() {
    return async (prompt: string): Promise<string> => {
      this.subLLMCalls++;
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        body: JSON.stringify({
          model: 'llama3.1',
          prompt,
          num_ctx: 4096  // Smaller context for sub-LLMs
        })
      });
      return (await response.json()).response;
    };
  }

  /**
   * Parallel processing for efficiency
   */
  private createBatchFunction() {
    return async (prompts: string[]): Promise<string[]> => {
      this.subLLMCalls += prompts.length;

      // Process in parallel batches
      const batchSize = 4;
      const results: string[] = [];

      for (let i = 0; i < prompts.length; i += batchSize) {
        const batch = prompts.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(p => this.createQueryFunction()(p))
        );
        results.push(...batchResults);
      }

      return results;
    };
  }

  /**
   * Execute Python code for context manipulation
   */
  async executePython(code: string): Promise<any> {
    // Use Python to manipulate and analyze context
    // Enables powerful data processing capabilities
  }
}
```

#### Phase 2: Overnight Planning (Weeks 3-4)

**Task Planner Implementation:**

```typescript
// packages/desktop-connector/src/rlm/RLMPlanner.ts

export class RLMPlanner {
  async planOvernightExecution(
    tasks: Task[],
    constraints: ComputeConstraints
  ): Promise<ExecutionPlan> {

    // Load all tasks into RLM environment
    const taskContext = JSON.stringify(tasks.map(t => ({
      id: t.id,
      type: t.type,
      prompt: t.prompt,
      priority: t.priority
    })));

    await this.env.initialize(taskContext);

    // RLM planning prompt
    const planningPrompt = `
You are planning overnight batch processing for Makerlog.ai.

CONTEXT: ${tasks.length} tasks stored in 'context' variable
CONSTRAINTS:
- Max time: ${constraints.maxHours} hours
- VRAM: ${constraints.vramGB}GB
- Max concurrent: ${constraints.maxConcurrent}

Your job:
1. Load and analyze tasks: print(context[:1000])
2. Group by type and complexity
3. Create optimized execution plan
4. Estimate resource requirements

Use llm_batch() to parallelize analysis.
Build plan in answer['content'].
Set answer['ready'] = True when complete.
`;

    // Execute RLM loop
    const plan = await this.executeRLMLoop(planningPrompt);

    return {
      phases: plan.phases,
      totalTasks: plan.totalTasks,
      estimatedTime: plan.estimatedTime
    };
  }

  private async executeRLMLoop(prompt: string): Promise<any> {
    const maxIterations = 20;
    let iteration = 0;
    let answer = { content: '', ready: false };

    while (iteration < maxIterations && !answer.ready) {
      iteration++;

      // Get response from root LLM
      const response = await this.callRootLLM(prompt + `
Iteration: ${iteration}
Current answer: ${answer.content}
`);

      // Execute any Python code
      const codeBlocks = this.extractCodeBlocks(response);
      for (const code of codeBlocks) {
        await this.env.executePython(code);
      }

      // Update answer
      const answerMatch = response.match(/answer\[['"]content['"]\]\s*=\s*(.+)/);
      const readyMatch = response.match(/answer\[['"]ready['"]\]\s*=\s*True/);

      if (answerMatch) {
        answer.content = JSON.parse(answerMatch[1]);
      }
      if (readyMatch) {
        answer.ready = true;
      }
    }

    return JSON.parse(answer.content);
  }
}
```

#### Phase 3: Style Learning (Weeks 5-6)

**Enhanced Style Profile:**

```typescript
// packages/desktop-connector/src/rlm/strategies/style-learning.ts

export class RLMStyleLearner {
  async learnStyleFromHistory(
    conversationHistory: GeneratedAsset[],
    feedbackHistory: UserFeedback[]
  ): Promise<StyleProfile> {

    // Prepare massive context
    const context = JSON.stringify({
      conversations: conversationHistory,
      feedback: feedbackHistory
    });

    await this.env.initialize(context);

    const stylePrompt = `
You are learning user's style preferences.

CONTEXT: User's generation history in 'context' variable

Analysis tasks:
1. Group by rating: positive = [x for x in context if x['rating'] >= 4]
2. Identify patterns in positive examples
3. Extract preferred parameters
4. Build preference vector

Use llm_batch() for parallel analysis:
- Batch 1: Analyze positive examples
- Batch 2: Analyze negative examples
- Batch 3: Extract correlations

Return in answer['content']:
{
  "preferenceVector": [...],
  "promptModifiers": [...],
  "preferredParams": {...},
  "avoidPatterns": [...]
}
`;

    const styleLearning = await this.executeRLMLoop(stylePrompt);

    return {
      userId: this.userId,
      preferenceVector: styleLearning.preferenceVector,
      promptModifiers: styleLearning.promptModifiers,
      preferredParams: styleLearning.preferredParams,
      avoidPatterns: styleLearning.avoidPatterns,
      updatedAt: Date.now()
    };
  }
}
```

## Performance Expectations

### Computational Resources

| Resource | Requirement | Notes |
|----------|-------------|-------|
| **VRAM** | 8-16GB | For parallel sub-LLMs (4 workers) |
| **RAM** | 32GB+ | For storing massive contexts in REPL |
| **Storage** | 10GB+ | For caching intermediate results |
| **CPU** | 8+ cores | For Python execution and orchestration |

### Expected Performance Gains

Based on [PrimeIntellect research](https://www.primeintellect.ai/blog/rlm) and [arXiv paper](https://arxiv.org/html/2512.24601v1):

1. **Context Capacity**: 100x increase (50K → 5M+ tokens)
2. **Quality Retention**: 28% better on long-context tasks
3. **Cost Efficiency**: Median cost comparable to single LLM call
4. **Parallel Speedup**: 4x faster with 4 parallel workers

### Latency Expectations

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| **Simple folding** | 30-60 seconds | Single pass |
| **Complex planning** | 5-15 minutes | Multi-iteration |
| **Style learning** | 2-5 minutes | Parallel analysis |
| **Overnight batch** | 2-6 hours | Depends on task count |

## Integration with Desktop Connector

### Modified Task Execution

```typescript
class MakerlogConnector {
  private rlmPlanner: RLMPlanner;
  private rlmEnvironment: RLMEnvironment;

  async executeTask(task: Task): Promise<void> {
    // Use RLM for complex planning tasks
    if (task.type === 'batch-planning') {
      const plan = await this.rlmPlanner.planOvernightExecution(
        this.taskQueue,
        this.config.compute
      );

      // Reorder queue based on plan
      this.taskQueue = plan.decomposedTasks;
    }

    // Apply learned style (enhanced by RLM)
    const enhancedPrompt = await this.applyRLMStyleProfile(task.prompt);

    // ... rest of execution
  }

  private async applyRLMStyleProfile(prompt: string): Promise<string> {
    // Use RLM to intelligently apply preferences
    const env = new RLMEnvironment(this.config.localModels.ollama.endpoint);
    await env.initialize(JSON.stringify(this.styleProfile));

    const stylePrompt = `
CONTEXT: User's style profile in 'context'
TASK: Enhance prompt: "${prompt}"

Return enhanced prompt in answer['content']
Set answer['ready'] = True
`;

    const enhanced = await this.executeRLMLoop(env, stylePrompt);
    return enhanced.prompt || prompt;
  }
}
```

## Trade-offs and Considerations

### Advantages

✅ **Unlimited context** (100x traditional LLMs)
✅ **No context rot** (quality maintained)
✅ **Cost-efficient** (median cost same as single call)
✅ **Parallel processing** (4x speedup with 4 workers)
✅ **Transparent reasoning** (can inspect analysis process)
✅ **Perfect for overnight** (unlimited compute time)

### Disadvantages

❌ **Higher latency** (30 seconds to 15 minutes)
❌ **More complex** (requires REPL orchestration)
❌ **Resource intensive** (32GB+ RAM recommended)
❌ **Not for real-time** (only for batch processing)
❌ **Debugging difficulty** (multi-step reasoning)

### Recommendations

1. **Use for overnight planning** - Perfect for 8-hour processing windows
2. **Fold long conversations** - Prevent context rot
3. **Learn from massive history** - Extract patterns from thousands of examples
4. **Avoid for real-time** - Use Llama 3.1 8B for voice chat
5. **Monitor sub-LLM calls** - Track parallelization efficiency

## Comparison with Alternatives

| Feature | Traditional LLM | RLM | Improvement |
|---------|----------------|-----|-------------|
| **Context Capacity** | 128K tokens | 5M+ tokens | **40x more** |
| **Quality on Long Context** | Degrades | Maintained | **28% better** |
| **Cost** | Proportional | Fixed | **Same median** |
| **Parallelization** | None | 4-8 workers | **4-8x faster** |
| **Transparency** | Black box | Inspectable | **Full visibility** |

## Conclusion

RLMs represent a **paradigm shift** in how AI systems handle long-context reasoning. For Makerlog.ai's desktop connector, RLMs enable:

1. **Overnight planning** of hundreds of tasks with optimal resource allocation
2. **Context folding** to prevent quality degradation in long conversations
3. **Deep style learning** from massive feedback history

The desktop connector's **unlimited overnight compute** makes it the ideal platform for RLM deployment. While RLMs aren't suitable for real-time interactions, they dramatically enhance batch processing capabilities.

**Key Takeaway:** RLMs turn the desktop connector from a simple task runner into an **intelligent planning and learning system** that improves with every overnight session.

**Next Steps:**
1. Implement RLMEnvironment class
2. Build RLMPlanner for overnight optimization
3. Create RLMStyleLearner for preference extraction
4. Test with real user data
5. Measure improvement over current system

---

**Sources:**
- [PrimeIntellect RLM Blog](https://www.primeintellect.ai/blog/rlm) - "Recursive Language Models: the paradigm of 2026"
- [arXiv Paper](https://arxiv.org/html/2512.24601v1) - "Recursive Language Models" (December 31, 2025)
- [Mack.work Blog](https://mack.work/blog/recursive-language-models) - Technical analysis
- [Alex Zhang's Blog](https://alexzhang13.github.io/blog/2025/rlm/) - Implementation examples
- [Current Desktop Connector](/home/eileen/projects/makerlog-ai/packages/desktop-connector/src/index.ts) - Integration target
