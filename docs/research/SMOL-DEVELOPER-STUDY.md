# Smol-Developer Study: Local AI Development & VRAM Optimization

**Project:** Makerlog.ai Desktop Connector Research
**Date:** 2026-01-21
**Focus:** VRAM-constrained local AI development (8-16GB VRAM)
**Subject:** smol-developer (smol-ai/developer)

---

## Executive Summary

This study analyzes **smol-developer** (https://github.com/smol-ai/developer), a pioneering library for embedding AI developer agents, to extract best practices for Makerlog.ai's desktop connector targeting 8-16GB VRAM systems running Ollama, ComfyUI, and potentially DeepSeek R1.

**Key Finding:** smol-developer is **cloud-first** (OpenAI API + Modal serverless), but its **architectural patterns**—parallel code generation, shared dependency management, and iterative refinement—directly apply to local AI development with VRAM constraints.

**Critical Insight for Makerlog.ai:** smol-developer's success comes from **prompt engineering over model size**. It achieves impressive results with GPT-3.5/4 not through model power, but through clever context management and structured generation—exactly what we need for VRAM-constrained local models.

---

## Table of Contents

1. [Smol-Developer Architecture](#1-smol-developer-architecture)
2. [VRAM Optimization Strategies](#2-vram-optimization-strategies)
3. [Model Quantization Recommendations](#3-model-quantization-recommendations)
4. [Applying Lessons to Desktop Connector](#4-applying-lessons-to-desktop-connector)
5. [Tools & Workflows](#5-tools--workflows)
6. [Implementation Roadmap](#6-implementation-roadmap)
7. [Sources](#sources)

---

## 1. Smol-Developer Architecture

### 1.1 Core Design Philosophy

**"Human-centric & Coherent Whole Program Synthesis"**

smol-developer positions itself as a "junior developer agent" that either:
1. **Scaffolds entire codebases** from a single product spec
2. **Provides building blocks** to embed a smol developer in your own app

**Key Innovation:** It's **not** about having the biggest model—it's about having the **best prompts** and workflow.

### 1.2 Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    smol-developer Flow                       │
├─────────────────────────────────────────────────────────────┤
│  1. PLAN     → Generate coding plan (shared_deps.md)        │
│  2. SPECIFY  → Generate file paths (Function Calling API)   │
│  3. GENERATE → Generate code for each file (parallel)       │
│  4. ITERATE  → Human-in-the-loop refinement                 │
└─────────────────────────────────────────────────────────────┘
```

#### Three-Stage Generation Pipeline

**Stage 1: Plan Generation (`plan()` function)**
- Input: User prompt (product spec)
- Output: `shared_deps.md` containing:
  - Technology stack choices
  - Shared dependencies (functions, variables, imports)
  - File structure overview
  - Cross-file references

**Why This Matters for VRAM:**
- Reduces model context window requirements per request
- Enables parallel file generation (no sequential dependencies)
- Acts as "compiled" knowledge for subsequent steps

**Stage 2: File Path Specification (`specify_file_paths()` function)**
- Uses **OpenAI Function Calling API** for guaranteed JSON output
- Input: Prompt + `shared_deps.md`
- Output: Array of file paths to generate
- Validates structure before generation (waste reduction)

**Stage 3: Code Generation (`generate_code_sync()` function)**
- Input: Prompt + `shared_deps.md` + single file path
- Output: Complete source code for that file
- **Can run in parallel** across multiple files
- Each generation is independent (thanks to Stage 1)

### 1.3 Parallel Code Generation Strategy

**From smol-developer's README:**
> "The feedback loop is very slow right now (`time` says about 2-4 mins to generate a program with GPT4, **even with parallelization due to Modal**)"

**Parallelization Approach:**
```python
# Conceptual flow from smol-developer
files = specify_file_paths(prompt, shared_deps)

# Parallel generation across all files
with ThreadPoolExecutor() as executor:
    futures = {
        executor.submit(generate_code_sync, prompt, shared_deps, file): file
        for file in files
    }
    results = {futures[f]: f.result() for f in as_completed(futures)}
```

**VRAM Implication for Desktop Connector:**
- **Don't sequentialize** model calls if parallel is possible
- But **respect VRAM limits**—can't load 2x models simultaneously on 8GB
- **Solution:** Queue requests, load model once, process batch sequentially

### 1.4 Fault Tolerance & Reliability

**smol-developer's Modal Integration:**
- Fault-tolerant OpenAI API calls with **exponential backoff retries**
- Attached storage for intermediate results
- Parallelizable code generation with error isolation

**Lesson for Local AI:**
- Implement **retry logic** for Ollama API calls (network/timeout issues)
- Save **intermediate state** (cache `shared_deps.md` equivalents)
- Design for **partial failure** (one file generation fails = retry only that file)

---

## 2. VRAM Optimization Strategies

### 2.1 Understanding smol-developer's Cloud-First Approach

**Reality Check:** smol-developer **does not run locally**. It uses:
- OpenAI API (GPT-3.5/4 hosted by OpenAI)
- Modal serverless platform (cloud compute)
- No local model management

**Why Study It Then?**
The **architectural patterns** transfer directly:
1. **Context partitioning** → Smaller prompts fit smaller models
2. **Shared dependencies** → Reduce redundant context across calls
3. **Parallel generation** → Batch optimization for overnight processing
4. **Iterative refinement** → Human-in-the-loop reduces model requirements

### 2.2 Quantization Strategies for 8-16GB VRAM

**Research from 2025 local AI ecosystem:**

#### Quantization Levels & VRAM Impact

| Quantization | VRAM (7B Model) | Quality | Use Case |
|--------------|-----------------|---------|----------|
| **Q4_K_M** | ~4-5GB | ⭐⭐⭐⭐ | Sweet spot for most tasks |
| **Q5_K_M** | ~5-6GB | ⭐⭐⭐⭐⭐ | High-quality coding |
| **Q3_K_M** | ~3-4GB | ⭐⭐⭐ | Acceptable for simple tasks |
| **Q2_K** | ~2-3GB | ⭐⭐ | Last resort |

**Critical Finding from Reddit LocalLLaMA:**
> "Q4_K_M models typically require ~20GB of VRAM to run entirely on GPU"

**Reality:** For 8-16GB VRAM:
- **8GB VRAM:** Use Q3_K_M or Q2_K, or partial GPU offloading with Q4_K_M
- **16GB VRAM:** Q4_K_M with partial offloading, Q5_K_M for critical models

#### Hybrid CPU/GPU Offloading Strategy

**For 8GB VRAM (DeepSeek R1 7B example):**
```bash
# Ollama: Use NUM_GPU parameter
OLLAMA_NUM_GPU=3 ollama run deepseek-r1:7b-q4_K_M

# Result: 3 layers on GPU, rest on system RAM
# ~5GB VRAM usage, ~8GB system RAM
```

**For 16GB VRAM (DeepSeek R1 14B example):**
```bash
# Full GPU offloading for Q4_K_M
OLLAMA_NUM_GPU=-1 ollama run deepseek-r1:14b-q4_K_M

# Result: ~10GB VRAM usage
```

### 2.3 KV Cache Optimization

**From Ollama Performance Tuning:**

**What is KV Cache?**
- Stores Key-Value pairs from attention mechanism
- Grows with context length
- **Major VRAM consumer** for long conversations

**Optimization Strategies:**

1. **Context Window Limits:**
```python
# For overnight batch processing
MAX_CONTEXT = 4096  # Instead of 32768
# Reduces KV cache by 87.5%
```

2. **Batch Processing with Cache Reset:**
```python
# Process each task with fresh context
for task in overnight_tasks:
    response = ollama.generate(
        model="deepseek-r1:7b-q4_K_M",
        prompt=task.prompt,
        options={"num_ctx": 4096}  # Reset KV cache each time
    )
```

3. **Cache Quantization:**
```bash
# Ollama supports KV cache quantization (FP16 → FP8)
OLLAMA_KV_CACHE_TYPE=f8 ollama serve
# Saves ~50% KV cache VRAM with minimal quality loss
```

### 2.4 Model Loading & Unloading Strategy

**Smol-developer's "Modal" Pattern Applied Locally:**

**Problem:** Loading/unloading models is slow (~30 seconds)

**Solution:** **Session-based model management**

```python
class ModelManager:
    def __init__(self):
        self.current_model = None
        self.session_start = None

    async def load_model(self, model_name):
        """Load model once per session"""
        if self.current_model == model_name:
            return  # Already loaded

        # Unload previous model if needed
        if self.current_model:
            await self._unload_model()

        # Load new model
        self.current_model = model_name
        self.session_start = time.time()

        # Preload next model if VRAM allows
        if self._has_vram_for_two_models():
            await self._preload_next_model()

    async def process_batch(self, tasks):
        """Process entire batch with single model load"""
        await self.load_model(tasks[0].model)

        results = []
        for task in tasks:
            result = await self._generate(task)
            results.append(result)

        return results
```

**Benefits:**
- Load model **once** for overnight batch (not per-task)
- Reduces overhead from 30s × N tasks → 30s total
- Enables **true batch optimization**

---

## 3. Model Quantization Recommendations

### 3.1 Quantization Format: GGUF vs. GPTQ vs. AWQ

**2025 State of the Art:**

| Format | Ecosystem | VRAM Efficiency | Loading Speed | Recommendation |
|--------|-----------|-----------------|---------------|----------------|
| **GGUF** | Ollama, llama.cpp | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **DEFAULT CHOICE** |
| GPTQ | AutoGPTQ, ExLlamaV2 | ⭐⭐⭐⭐ | ⭐⭐⭐ | For advanced users |
| AWQ | vLLM, AutoAWQ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | For inference servers |

**Why GGUF for Desktop Connector?**
1. **Native Ollama support** (already using Ollama)
2. **Fast loading** (critical for session-based management)
3. **Wide model availability** (HuggingFace ecosystem)
4. **CPU fallback** (graceful degradation when VRAM insufficient)

### 3.2 Recommended Quantization Levels

**For 8GB VRAM (Minimum Spec):**

| Model Size | Quantization | VRAM Usage | System RAM | Quality | Use Case |
|------------|--------------|------------|------------|---------|----------|
| **7B** | Q4_K_M | ~4.5GB | ~8GB | ⭐⭐⭐⭐ | **DEFAULT** |
| 7B | Q3_K_M | ~3.5GB | ~6GB | ⭐⭐⭐ | Last resort |
| 7B | Q5_K_S | ~5.5GB | ~10GB | ⭐⭐⭐⭐⭐ | High quality (may need CPU offload) |

**For 16GB VRAM (Recommended Spec):**

| Model Size | Quantization | VRAM Usage | System RAM | Quality | Use Case |
|------------|--------------|------------|------------|---------|----------|
| **14B** | Q4_K_M | ~8GB | ~12GB | ⭐⭐⭐⭐⭐ | **DEFAULT** |
| 7B | Q6_K | ~6GB | ~10GB | ⭐⭐⭐⭐⭐ | High quality single-task |
| 32B | Q4_K_M | ~16GB | ~24GB | ⭐⭐⭐⭐⭐ | Max quality (full GPU) |

### 3.3 Model Selection for Makerlog.ai Use Cases

**Task Breakdown:**

| Task | Min Model | Recommended Model | Quantization | VRAM |
|------|-----------|-------------------|--------------|------|
| **Code Generation** | DeepSeek 7B | DeepSeek 14B | Q4_K_M | 8GB |
| **Image Generation** | FLUX.1-schnell | FLUX.1-dev | BF16 (ComfyUI) | 12-16GB |
| **Text Analysis** | Llama 3.1 8B | Llama 3.1 8B | Q4_K_M | 5GB |
| **Opportunity Detection** | DeepSeek 7B | DeepSeek 14B | Q5_K_M | 10GB |

**Overnight Batch Processing Strategy:**

```python
# Optimize for 16GB VRAM target
NIGHTLY_BATCH = [
    {
        "task": "code_generation",
        "model": "deepseek-r1:14b-q4_K_M",
        "vram_budget": 8192,  # 8GB
        "priority": "high",
    },
    {
        "task": "image_generation",
        "model": "flux.1-dev",
        "vram_budget": 12288,  # 12GB (ComfyUI)
        "priority": "medium",
    },
    {
        "task": "opportunity_detection",
        "model": "deepseek-r1:7b-q5_K_M",
        "vram_budget": 6144,  # 6GB
        "priority": "low",  # Can run while images generating
    }
]
```

### 3.4 Imatrix Quantization (2025 Best Practice)

**Static Quantization (Old Way):**
- Calibrate once on generic dataset
- May produce artifacts for specific domains

**Imatrix Quantization (New Way):**
- Calibrate on **your actual data**
- Better quality for domain-specific tasks
- Available in llama.cpp 3.2+

**For Desktop Connector:**
```bash
# Create Imatrix calibration from Makerlog.ai conversations
./llama-cli \
  --model /path/to/base_model.gguf \
  --file /path/to/makerlog_conversations.txt \
  --export-imatrix /path/to/makerlog.imatrix

# Quantize with Imatrix
./llama-quantize \
  --imatrix /path/to/makerlog.imatrix \
  base_model.gguf \
  deepseek-7b-q4_k_m.gguf \
  Q4_K_M
```

**Expected Improvement:** 5-10% better quality on coding tasks with same VRAM

---

## 4. Applying Lessons to Desktop Connector

### 4.1 Smol-Developer Pattern: Shared Dependencies

**Adaptation for Overnight Batch Processing:**

**Problem:** Each overnight task needs context about:
- Project structure
- Previous opportunities
- User preferences
- Code style guidelines

**Smol-developer solution:** Generate `shared_deps.md` once, reuse across all files

**Desktop connector adaptation:**

```python
# Generate "context pack" before overnight batch
async def generate_context_pack(conversation_history, user_profile):
    """Single model call to generate shared context"""

    prompt = f"""
    Analyze this conversation and generate a context pack containing:

    1. **Project Overview**: 2-3 sentence summary
    2. **Tech Stack**: List of frameworks, languages, tools
    3. **Code Style**: Indentation, naming conventions, patterns
    4. **Opportunity Pattern**: What types of opportunities are valuable
    5. **User Preferences**: Explicit and implicit preferences

    Format as JSON.

    Conversation History:
    {conversation_history}

    User Profile:
    {user_profile}
    """

    response = await ollama.generate(
        model="deepseek-r1:7b-q4_K_M",
        prompt=prompt,
        format="json",  # Ollama native JSON mode
        options={"num_ctx": 4096}
    )

    return json.loads(response["response"])

# Use context pack for all subsequent tasks
context_pack = await generate_context_pack(history, profile)

for opportunity in overnight_opportunities:
    result = await process_opportunity(
        opportunity,
        context_pack  # Reuse across all tasks (reduces redundant context)
    )
```

**Benefits:**
- **Reduces VRAM per task** (no need to include full conversation history)
- **Consistent context** across all overnight tasks
- **Faster generation** (smaller prompts)
- **Lower neuron quota** (for hybrid cloud scenarios)

### 4.2 Smol-Developer Pattern: Parallel Generation

**Adaptation for VRAM Constraints:**

**smol-developer approach:** Generate all files in parallel on cloud

**Desktop connector constraint:** Can't parallelize model calls (single model in VRAM)

**Solution:** **Sequential generation with model persistence**

```python
class OvernightBatchProcessor:
    def __init__(self):
        self.model_loaded = False
        self.current_model = None

    async def process_batch(self, tasks, model_name):
        """Process batch with single model load"""

        # Load model once
        if not self.model_loaded or self.current_model != model_name:
            await self._load_model(model_name)
            self.model_loaded = True
            self.current_model = model_name

        # Process tasks sequentially (but efficiently)
        results = []
        for task in tasks:
            result = await self._process_task(task)
            results.append(result)

        return results

    async def _process_task(self, task):
        """Process single task with optimized prompt"""
        prompt = self._build_prompt(task)

        # Use Ollama streaming for progress feedback
        response = await ollama.generate(
            model=self.current_model,
            prompt=prompt,
            stream=True,  # Progress updates
            options={
                "num_ctx": 4096,  # Limit context for VRAM
                "temperature": 0.7,  # Creativity
            }
        )

        return self._parse_response(response)
```

**Optimization: Group by Model**

```python
# Organize overnight tasks by model
tasks_by_model = {
    "deepseek-r1:7b-q4_K_M": [task1, task2, task3],
    "flux.1-dev": [task4, task5],
    "llama3.1:8b-q4_K_M": [task6, task7, task8],
}

# Process each model group (only 3 model loads total)
for model, tasks in tasks_by_model.items():
    await processor.process_batch(tasks, model)
```

### 4.3 Smol-Developer Pattern: Iterative Refinement

**Adaptation for Overnight Processing:**

**smol-developer workflow:**
1. Generate code
2. Human reviews
3. Human adds feedback to prompt
4. Regenerate
5. Repeat until satisfaction

**Desktop connector challenge:** No human available overnight

**Solution:** **Self-refinement with quality checks**

```python
async def generate_with_self_refinement(task, context_pack, max_iterations=3):
    """Generate output with automatic quality checking"""

    for iteration in range(max_iterations):
        # Generate
        output = await generate(task, context_pack)

        # Quality check
        quality_score = await evaluate_quality(output, task.criteria)

        if quality_score >= 0.8:  # Good enough threshold
            return output

        # Refine prompt for next iteration
        feedback = await generate_feedback(output, quality_score)
        task.prompt += f"\n\nPrevious attempt feedback: {feedback}"

    # Return best attempt after max iterations
    return output

async def evaluate_quality(output, criteria):
    """Use smaller model for quality evaluation"""

    prompt = f"""
    Rate this output on a scale of 0.0 to 1.0 based on:
    {criteria}

    Output:
    {output}

    Return only the score.
    """

    response = await ollama.generate(
        model="llama3.1:8b-q4_K_M",  # Smaller, faster model
        prompt=prompt,
        options={"num_ctx": 2048}
    )

    return float(response["response"].strip())
```

**Benefits:**
- **Automatic quality improvement** without human intervention
- **Uses smaller model** for evaluation (VRAM efficient)
- **Fallback to best effort** if quality threshold not met

### 4.4 Smol-Developer Pattern: Function Calling

**Adaptation for Structured Output:**

**smol-developer uses:** OpenAI Function Calling API for guaranteed JSON

**Desktop connector equivalent:** Ollama's native JSON mode

```python
# Opportunity detection with structured output
prompt = """
Analyze this conversation for generative opportunities.

Return JSON matching this schema:
{
  "opportunities": [
    {
      "type": "code" | "image" | "text",
      "description": "string",
      "confidence": 0.0-1.0,
      "prompt_template": "string"
    }
  ]
}

Conversation: {conversation_text}
"""

response = await ollama.generate(
    model="deepseek-r1:7b-q4_K_M",
    prompt=prompt,
    format="json",  # Ollama guarantees JSON output
    options={"num_ctx": 4096}
)

opportunities = json.loads(response["response"])
```

**Reliability:** Ollama's JSON mode (llama.cpp 3.2+) provides similar guarantees to OpenAI's function calling

---

## 5. Tools & Workflows

### 5.1 Recommended Toolchain

**For Desktop Connector Development:**

| Category | Tool | Why |
|----------|------|-----|
| **Model Runtime** | Ollama | Native GGUF support, JSON mode, easy model management |
| **Image Generation** | ComfyUI | Workflow-based, VRAM-efficient, modular |
| **Quantization** | llama.cpp | Best GGUF support, Imatrix quantization |
| **Monitoring** | nvtop | Real-time VRAM monitoring |
| **Batch Processing** | Custom Python | Session-based model management |

**Installation Commands:**

```bash
# Ollama (model runtime)
curl -fsSL https://ollama.com/install.sh | sh

# ComfyUI (image generation)
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt

# llama.cpp (quantization)
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp
make

# VRAM monitoring
sudo apt install nvtop  # Ubuntu/Debian
```

### 5.2 Model Management Workflow

**Initial Setup (One-time):**

```bash
# 1. Pull recommended models
ollama pull deepseek-r1:14b-q4_K_M
ollama pull llama3.1:8b-q4_K_M
ollama pull flux.1-dev  # For ComfyUI

# 2. Verify VRAM usage
nvtop  # Monitor during model load

# 3. Test batch processing
python scripts/test_batch.py
```

**Daily Overnight Workflow:**

```python
# 1. Collect opportunities from day's conversations
opportunities = await collect_opportunities()

# 2. Generate context pack (smol-developer pattern)
context_pack = await generate_context_pack(conversations, user_profile)

# 3. Group by model
tasks_by_model = group_by_model(opportunities, context_pack)

# 4. Process batch
for model, tasks in tasks_by_model.items():
    results = await process_batch(tasks, model)
    await save_results(results)

# 5. Cleanup
await unload_all_models()
```

### 5.3 Monitoring & Debugging

**VRAM Usage Tracking:**

```python
import subprocess
import json

def get_vram_usage():
    """Get current VRAM usage"""
    result = subprocess.run(
        ["nvidia-smi", "--query-gpu=memory.used,memory.total", "--format=csv,noheader,nounits"],
        capture_output=True,
        text=True
    )

    used, total = map(int, result.stdout.strip().split(","))
    return {"used_mb": used, "total_mb": total, "percent": used / total * 100}

# Use during batch processing
vram = get_vram_usage()
if vram["percent"] > 90:
    logger.warning(f"VRAM usage critical: {vram['percent']:.1f}%")
```

**Model Loading Benchmarking:**

```python
import time

async def benchmark_model_load(model_name):
    """Benchmark model loading time"""

    start = time.time()

    # Cold load
    await ollama.generate(model=model_name, prompt="", options={"num_ctx": 1})

    cold_load_time = time.time() - start

    # Warm load (from cache)
    start = time.time()
    await ollama.generate(model=model_name, prompt="", options={"num_ctx": 1})

    warm_load_time = time.time() - start

    return {
        "model": model_name,
        "cold_load_s": cold_load_time,
        "warm_load_s": warm_load_time,
    }

# Expected results (approximate):
# DeepSeek 7B Q4_K_M:  cold_load=25s, warm_load=2s
# DeepSeek 14B Q4_K_M: cold_load=35s, warm_load=3s
```

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Basic batch processing with VRAM awareness

**Tasks:**
- [ ] Implement ModelManager class with session-based loading
- [ ] Add VRAM monitoring utilities (nvtop integration)
- [ ] Create context pack generation (smol-developer pattern)
- [ ] Implement basic batch processor with model grouping
- [ ] Add error handling and retry logic

**Deliverables:**
- `src/model-manager.py` - Session-based model management
- `src/vram-monitor.py` - VRAM tracking utilities
- `src/context-pack.py` - Shared context generation
- `src/batch-processor.py` - Overnight batch processing

**Success Criteria:**
- Process 10 opportunities overnight with <5GB VRAM
- Model loads once per batch (not per-task)
- Automatic fallback to CPU if VRAM insufficient

### Phase 2: Optimization (Week 3-4)

**Goal:** Advanced VRAM optimization and quantization

**Tasks:**
- [ ] Implement Imatrix quantization for domain-specific models
- [ ] Add KV cache quantization (FP8)
- [ ] Implement self-refinement with quality checks
- [ ] Optimize context window sizing per task type
- [ ] Add model preloading for multi-model batches

**Deliverables:**
- `src/quantization/` - Custom quantization pipeline
- `src/quality-check.py` - Self-refinement system
- `src/context-optimizer.py` - Dynamic context sizing
- Optimized model variants (Makerlog.ai Imatrix)

**Success Criteria:**
- 20% VRAM reduction through quantization
- 15% quality improvement through self-refinement
- Support for 14B models on 16GB VRAM

### Phase 3: Production Readiness (Week 5-6)

**Goal:** Monitoring, logging, and graceful degradation

**Tasks:**
- [ ] Add comprehensive logging (generation stats, VRAM usage)
- [ ] Implement progress reporting (streaming responses)
- [ ] Add circuit breaker for failing models
- [ ] Create configuration system (VRAM budgets, model selection)
- [ ] Build admin dashboard (batch status, VRAM monitoring)

**Deliverables:**
- `src/monitoring.py` - Metrics collection
- `src/config.py` - VRAM-aware configuration
- `src/dashboard/` - Admin interface
- Documentation and runbooks

**Success Criteria:**
- Real-time VRAM monitoring dashboard
- Automatic model fallback on OOM errors
- Batch completion rate >95%

### Phase 4: Advanced Features (Week 7-8)

**Goal:** Multi-model orchestration and ComfyUI integration

**Tasks:**
- [ ] Integrate ComfyUI for image generation
- [ ] Implement multi-model task scheduling
- [ ] Add model caching between batches
- [ ] Implement progressive generation (low-res → high-res)
- [ ] Add A/B testing for model/quantization variants

**Deliverables:**
- `src/comfyui-bridge.py` - ComfyUI integration
- `src/scheduler.py` - Multi-model orchestration
- `src/cache.py` - Model state caching
- Performance benchmarking suite

**Success Criteria:**
- End-to-end overnight batch (code + images)
- <1 hour for 50 tasks on 16GB VRAM
- Automated model selection based on VRAM availability

---

## 7. Key Takeaways

### What smol-developer Teaches Us

1. **Prompt Engineering > Model Size**
   - Clever context management beats brute-force model power
   - Shared dependencies pattern reduces redundant context

2. **Parallelization Requires Serial First**
   - Can't parallelize without independent tasks
   - Plan → Specify → Generate workflow enables parallel execution

3. **Fault Tolerance is Critical**
   - Individual file failures shouldn't crash entire batch
   - Retry logic with exponential backoff (standard in cloud, needed locally)

4. **Human-in-the-Loop is Powerful**
   - For overnight processing, simulate with self-refinement
   - Quality checks with smaller models

### VRAM Optimization Hierarchy

**For 8GB VRAM:**
1. Use Q3_K_M or Q4_K_M with CPU offloading
2. Limit context to 4096 tokens
3. Use 7B models only
4. Enable KV cache quantization (FP8)

**For 16GB VRAM:**
1. Use Q4_K_M or Q5_K_M quantization
2. Support 14B models comfortably
3. Limit context to 8192 tokens
4. Enable KV cache quantization for safety margin

### Desktop Connector Architecture Recommendations

```python
# Recommended architecture
┌─────────────────────────────────────────────────────────────┐
│                  Desktop Connector Flow                      │
├─────────────────────────────────────────────────────────────┤
│  1. COLLECT  → Gather opportunities from conversations       │
│  2. CONTEXT  → Generate shared context pack (smol pattern)   │
│  3. GROUP    → Group tasks by model (minimize model loads)   │
│  4. PROCESS  → Sequential batch with model persistence       │
│  5. REFINE   → Self-refinement with quality checks           │
│  6. DELIVER  → Save results, cleanup models                  │
└─────────────────────────────────────────────────────────────┘
```

**VRAM Budget Allocation (16GB Example):**
- Model weights: 8GB (DeepSeek 14B Q4_K_M)
- KV cache: 2GB (8K context)
- Activation overhead: 2GB
- ComfyUI (separate): 12GB (not concurrent)
- Safety margin: 2GB

---

## Sources

### Smol-Developer Research
- [smol-ai/developer GitHub Repository](https://github.com/smol-ai/developer) - Official smol-developer library
- [Smol Developer on Hacker News](https://news.ycombinator.com/item?id=35945467) - Community discussion on architecture
- [e2b-dev/smol-developer Fork](https://github.com/e2b-dev/smol-developer) - Alternative implementation
- [Let's level up the smol developer (Issue #34)](https://github.com/smol-ai/developer/issues/34) - Improvement discussions
- [Bootstrap a React app with smol developer](https://blog.logrocket.com/bootstrap-react-app-smol-developer/) - Tutorial example

### VRAM Optimization
- [Ollama VRAM Requirements: Complete 2025 Guide](https://localllm.in/blog/ollama-vram-requirements-for-local-llms) - VRAM benchmarks
- [Optimizing generative AI models with quantization (Red Hat, 2025)](https://developers.redhat.com/articles/2025/08/18/optimizing-generative-ai-models-quantization) - FP8 quantization
- [Run Big LLMs on Small GPUs: 4-bit Quantization Guide](https://dev.to/aairom/run-big-llms-on-small-gpus-a-hands-on-guide-to-4-bit-quantization-and-qlora-4bi) - Hands-on quantization
- [GGUF Explained: Revolutionizing Local AI](https://medium.com/@orami98/gguf-explained-why-this-format-is-revolutionizing-local-ai-deployment-and-how-to-actually-use-it-7b26f71841cb) - GGUF format overview

### Model Quantization
- [Running a local model with 8GB VRAM (Reddit)](https://www.reddit.com/r/LocalLLaMA/comments/19f9z64/running_a_local_model_with_8gb_vram_is_it_even/) - Real-world VRAM discussions
- [GGUF Quantization: From Theory to Practice](https://atalupadhyay.wordpress.com/2025/08/24/gguf-quantization-from-theory-to-practice/) - Practical quantization guide
- [A "quantized" guide to quantization in LLMs](https://abiks.me/posts/quantization/) - Comprehensive quantization explanation

### Ollama & Model Management
- [Ollama Performance Tuning: GPU Optimization](https://collabnix.com/ollama-performance-tuning-gpu-optimization-techniques-for-production/) - Production optimization
- [New Model Scheduling (Ollama Blog)](https://ollama.com/blog/new-model-scheduling) - Memory management updates
- [Ollama FAQ](https://docs.ollama.com/faq) - Official documentation
- [Ollama's Hidden VRAM Bug](https://medium.com/@rafal.kedziorski/ollamas-hidden-vram-bug-scripted-detection-and-cleanup-b3d6439d2199) - Memory leak detection
- [hclivess/ollama-batch-processor](https://github.com/hclivess/ollama-batch-processor) - Batch processing tool

### AI Agent Architecture
- [Building AI Agents with Llama 2 and Smol Agents](https://medium.com/thedeephub/building-ai-agents-with-llama-2-and-smol-agents-a-code-driven-tutorial-d507dcd01841) - Agent tutorial
- [Anatomy of a High-Performance Agent (Google Cloud)](https://medium.com/google-cloud/anatomy-of-a-high-performance-agent-giving-your-ai-agent-a-brain-transplant-dc499e6d153f) - Agent optimization

### Local AI Guides
- [murataslan1/local-ai-coding-guide](https://github.com/murataslan1/local-ai-coding-guide) - Quick start guide
- [Best AI for Coding 2025: VRAM Requirements](https://localaimaster.com/blog/best-local-ai-models-programming) - Model recommendations
- [Tiny Models, Local Throttles: Local AI Setup](http://blog.nilenso.com/blog/2025/05/06/local-llm-setup/) - Practical local AI setup

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-21
**Next Review:** After Phase 1 implementation (Week 2)
