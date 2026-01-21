#!/usr/bin/env node

/**
 * Makerlog Desktop Connector
 *
 * A local daemon that:
 * 1. Connects to Makerlog.ai cloud via WebSocket
 * 2. Runs local AI models (Ollama, ComfyUI, etc.)
 * 3. Executes overnight batch generation
 * 4. Syncs generated assets back to cloud
 * 5. Learns from user feedback to improve future generations
 *
 * Install: npm install -g makerlog-connector
 * Run: makerlog-connector start
 */

import WebSocket from 'ws';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createHash, randomUUID } from 'crypto';
import Conf from 'conf';

// ============ CONFIGURATION ============

interface Config {
  apiUrl: string;
  wsUrl: string;
  apiKey: string;
  userId: string;

  // Local compute settings
  localModels: {
    ollama: { enabled: boolean; endpoint: string; models: string[] };
    comfyui: { enabled: boolean; endpoint: string; workflows: string };
    automatic1111: { enabled: boolean; endpoint: string };
  };

  // Storage paths
  paths: {
    workspace: string;
    projectAssets: string;
    library: string;
    cache: string;
  };

  // Compute preferences
  compute: {
    maxConcurrentJobs: number;
    preferLocal: boolean;
    overnightOnly: boolean;
    idleThresholdMinutes: number;
    maxLocalStorageGB: number;
  };

  // Self-improvement
  learning: {
    enabled: boolean;
    feedbackWeight: number;
    styleVectorDimensions: number;
  };
}

const defaultConfig: Partial<Config> = {
  apiUrl: 'https://api.makerlog.ai',
  wsUrl: 'wss://api.makerlog.ai/ws',
  localModels: {
    ollama: { enabled: true, endpoint: 'http://localhost:11434', models: ['llama3.1', 'codellama'] },
    comfyui: { enabled: false, endpoint: 'http://localhost:8188', workflows: path.join(os.homedir(), '.makerlog', 'workflows') },
    automatic1111: { enabled: false, endpoint: 'http://localhost:7860' },
  },
  paths: {
    workspace: path.join(os.homedir(), '.makerlog', 'workspace'),
    projectAssets: path.join(os.homedir(), '.makerlog', 'projects'),
    library: path.join(os.homedir(), '.makerlog', 'library'),
    cache: path.join(os.homedir(), '.makerlog', 'cache'),
  },
  compute: {
    maxConcurrentJobs: 2,
    preferLocal: true,
    overnightOnly: false,
    idleThresholdMinutes: 15,
    maxLocalStorageGB: 50,
  },
  learning: {
    enabled: true,
    feedbackWeight: 0.3,
    styleVectorDimensions: 512,
  },
};

// ============ TYPES ============

interface Task {
  id: string;
  type: 'image-gen' | 'text-gen' | 'code-gen' | 'iteration';
  prompt: string;
  priority: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  params?: Record<string, any>;
  parentTaskId?: string;
  iterationCount?: number;
  userFeedback?: UserFeedback;
}

interface UserFeedback {
  rating: 1 | 2 | 3 | 4 | 5;
  disposition: 'project' | 'library' | 'prune';
  tags?: string[];
  refinements?: string;
  timestamp: number;
}

interface GeneratedAsset {
  id: string;
  taskId: string;
  type: 'image' | 'text' | 'code';
  localPath: string;
  cloudUrl?: string;
  hash: string;
  metadata: {
    prompt: string;
    model: string;
    params: Record<string, any>;
    generatedAt: number;
    iterationOf?: string;
  };
  feedback?: UserFeedback;
  styleVector?: number[];
}

interface StyleProfile {
  userId: string;
  positiveExamples: number[][];
  negativeExamples: number[][];
  preferenceVector: number[];
  promptModifiers: string[];
  updatedAt: number;
}

// ============ DESKTOP CONNECTOR CLASS ============

class MakerlogConnector {
  private config: Config;
  private store: Conf;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private taskQueue: Task[] = [];
  private runningTasks: Map<string, ChildProcess> = new Map();
  private styleProfile: StyleProfile | null = null;
  private lastActivityTime = Date.now();
  private isOvernightMode = false;

  constructor() {
    this.store = new Conf({ projectName: 'makerlog-connector' });
    this.config = { ...defaultConfig, ...this.store.get('config') } as Config;

    // Initialize style profile
    this.styleProfile = this.store.get('styleProfile') as StyleProfile || {
      userId: this.config.userId,
      positiveExamples: [],
      negativeExamples: [],
      preferenceVector: new Array(this.config.learning.styleVectorDimensions).fill(0),
      promptModifiers: [],
      updatedAt: Date.now(),
    };
  }

  // ============ CONNECTION MANAGEMENT ============

  async connect(): Promise<void> {
    console.log('🔌 Connecting to Makerlog.ai...');

    this.ws = new WebSocket(this.config.wsUrl, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-User-Id': this.config.userId,
        'X-Client-Type': 'desktop-connector',
        'X-Client-Version': '1.0.0',
      },
    });

    this.ws.on('open', () => {
      this.isConnected = true;
      console.log('✅ Connected to Makerlog.ai');
      this.sendCapabilities();
      this.requestPendingTasks();
    });

    this.ws.on('message', (data) => {
      this.handleMessage(JSON.parse(data.toString()));
    });

    this.ws.on('close', () => {
      this.isConnected = false;
      console.log('🔌 Disconnected. Reconnecting in 5s...');
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });

    // Start idle monitor
    this.startIdleMonitor();

    // Start storage monitor
    this.startStorageMonitor();
  }

  private sendCapabilities(): void {
    this.send({
      type: 'CAPABILITIES',
      payload: {
        localModels: this.config.localModels,
        compute: this.config.compute,
        learning: this.config.learning.enabled,
        storageAvailableGB: this.getAvailableStorage(),
      },
    });
  }

  private requestPendingTasks(): void {
    this.send({
      type: 'REQUEST_TASKS',
      payload: {
        maxTasks: 50,
        preferLocal: this.config.compute.preferLocal,
        overnightOnly: this.config.compute.overnightOnly && !this.isOvernightMode,
      },
    });
  }

  private send(message: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // ============ MESSAGE HANDLING ============

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'TASKS':
        this.handleTasks(message.payload.tasks);
        break;
      case 'TASK_ADDED':
        this.handleTaskAdded(message.payload.task);
        break;
      case 'TASK_CANCELLED':
        this.handleTaskCancelled(message.payload.taskId);
        break;
      case 'FEEDBACK_RECEIVED':
        this.handleFeedback(message.payload);
        break;
      case 'STYLE_PROFILE_UPDATED':
        this.handleStyleProfileUpdate(message.payload);
        break;
      case 'ITERATION_REQUEST':
        this.handleIterationRequest(message.payload);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private async handleTasks(tasks: Task[]): Promise<void> {
    console.log(`📥 Received ${tasks.length} tasks`);

    // Sort by priority and add to queue
    this.taskQueue = [
      ...this.taskQueue,
      ...tasks.sort((a, b) => b.priority - a.priority),
    ];

    // Process queue
    this.processQueue();
  }

  private handleTaskAdded(task: Task): void {
    console.log(`📥 New task: ${task.id} (${task.type})`);

    // Insert by priority
    const insertIndex = this.taskQueue.findIndex(t => t.priority < task.priority);
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }

    this.processQueue();
  }

  private handleTaskCancelled(taskId: string): void {
    // Remove from queue
    this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);

    // Kill if running
    const running = this.runningTasks.get(taskId);
    if (running) {
      running.kill();
      this.runningTasks.delete(taskId);
    }
  }

  // ============ TASK EXECUTION ============

  private async processQueue(): Promise<void> {
    // Check if we can run more tasks
    while (
      this.runningTasks.size < this.config.compute.maxConcurrentJobs &&
      this.taskQueue.length > 0
    ) {
      // Check overnight mode
      if (this.config.compute.overnightOnly && !this.isOvernightMode) {
        const nextTask = this.taskQueue[0];
        if (nextTask.type === 'image-gen') {
          console.log('⏰ Waiting for overnight mode for image generation');
          break;
        }
      }

      const task = this.taskQueue.shift()!;
      await this.executeTask(task);
    }
  }

  private async executeTask(task: Task): Promise<void> {
    console.log(`🚀 Starting task: ${task.id} (${task.type})`);

    // Update status
    this.send({
      type: 'TASK_STATUS',
      payload: { taskId: task.id, status: 'running' },
    });

    try {
      let result: GeneratedAsset;

      // Apply learned style modifiers to prompt
      const enhancedPrompt = this.applyStyleProfile(task.prompt, task.type);
      const enhancedTask = { ...task, prompt: enhancedPrompt };

      switch (task.type) {
        case 'image-gen':
          result = await this.generateImage(enhancedTask);
          break;
        case 'text-gen':
          result = await this.generateText(enhancedTask);
          break;
        case 'code-gen':
          result = await this.generateCode(enhancedTask);
          break;
        case 'iteration':
          result = await this.iterateOnAsset(enhancedTask);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Compute style vector for the result
      result.styleVector = await this.computeStyleVector(result);

      // Save locally
      await this.saveAsset(result, 'cache');

      // Upload to cloud
      const cloudUrl = await this.uploadAsset(result);
      result.cloudUrl = cloudUrl;

      // Report success
      this.send({
        type: 'TASK_COMPLETED',
        payload: {
          taskId: task.id,
          asset: result,
          styleVector: result.styleVector,
        },
      });

      console.log(`✅ Task completed: ${task.id}`);

    } catch (error: any) {
      console.error(`❌ Task failed: ${task.id}`, error.message);

      this.send({
        type: 'TASK_FAILED',
        payload: {
          taskId: task.id,
          error: error.message,
        },
      });
    }

    // Continue processing queue
    this.processQueue();
  }

  // ============ GENERATION METHODS ============

  private async generateImage(task: Task): Promise<GeneratedAsset> {
    const outputPath = path.join(
      this.config.paths.workspace,
      `${task.id}.png`
    );

    // Try ComfyUI first if enabled
    if (this.config.localModels.comfyui.enabled) {
      return await this.generateWithComfyUI(task, outputPath);
    }

    // Fall back to Automatic1111
    if (this.config.localModels.automatic1111.enabled) {
      return await this.generateWithA1111(task, outputPath);
    }

    throw new Error('No image generation backend configured');
  }

  private async generateWithComfyUI(task: Task, outputPath: string): Promise<GeneratedAsset> {
    const endpoint = this.config.localModels.comfyui.endpoint;

    // Load workflow template
    const workflowPath = path.join(
      this.config.localModels.comfyui.workflows,
      task.params?.workflow || 'default.json'
    );
    const workflowTemplate = JSON.parse(await fs.readFile(workflowPath, 'utf-8'));

    // Inject prompt into workflow
    const workflow = this.injectPromptIntoWorkflow(workflowTemplate, task.prompt, task.params);

    // Queue the prompt
    const queueResponse = await fetch(`${endpoint}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });
    const { prompt_id } = await queueResponse.json();

    // Poll for completion
    let result;
    while (!result) {
      await new Promise(r => setTimeout(r, 1000));

      const historyResponse = await fetch(`${endpoint}/history/${prompt_id}`);
      const history = await historyResponse.json();

      if (history[prompt_id]?.outputs) {
        result = history[prompt_id];
      }
    }

    // Download the generated image
    const imageOutput = Object.values(result.outputs)[0] as any;
    const imageInfo = imageOutput.images[0];

    const imageResponse = await fetch(
      `${endpoint}/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder}&type=${imageInfo.type}`
    );
    const imageBuffer = await imageResponse.arrayBuffer();

    await fs.writeFile(outputPath, Buffer.from(imageBuffer));

    return {
      id: randomUUID(),
      taskId: task.id,
      type: 'image',
      localPath: outputPath,
      hash: createHash('sha256').update(Buffer.from(imageBuffer)).digest('hex'),
      metadata: {
        prompt: task.prompt,
        model: 'comfyui',
        params: task.params || {},
        generatedAt: Date.now(),
        iterationOf: task.parentTaskId,
      },
    };
  }

  private async generateWithA1111(task: Task, outputPath: string): Promise<GeneratedAsset> {
    const endpoint = this.config.localModels.automatic1111.endpoint;

    const response = await fetch(`${endpoint}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: task.prompt,
        negative_prompt: task.params?.negative_prompt || '',
        steps: task.params?.steps || 30,
        width: task.params?.width || 512,
        height: task.params?.height || 512,
        cfg_scale: task.params?.cfg_scale || 7,
        sampler_name: task.params?.sampler || 'DPM++ 2M Karras',
        seed: task.params?.seed || -1,
      }),
    });

    const result = await response.json();
    const imageBuffer = Buffer.from(result.images[0], 'base64');

    await fs.writeFile(outputPath, imageBuffer);

    return {
      id: randomUUID(),
      taskId: task.id,
      type: 'image',
      localPath: outputPath,
      hash: createHash('sha256').update(imageBuffer).digest('hex'),
      metadata: {
        prompt: task.prompt,
        model: 'automatic1111',
        params: { ...task.params, seed: result.info?.seed },
        generatedAt: Date.now(),
        iterationOf: task.parentTaskId,
      },
    };
  }

  private async generateText(task: Task): Promise<GeneratedAsset> {
    const endpoint = this.config.localModels.ollama.endpoint;
    const model = task.params?.model || this.config.localModels.ollama.models[0];

    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: task.prompt,
        stream: false,
      }),
    });

    const result = await response.json();
    const outputPath = path.join(this.config.paths.workspace, `${task.id}.txt`);

    await fs.writeFile(outputPath, result.response);

    return {
      id: randomUUID(),
      taskId: task.id,
      type: 'text',
      localPath: outputPath,
      hash: createHash('sha256').update(result.response).digest('hex'),
      metadata: {
        prompt: task.prompt,
        model,
        params: task.params || {},
        generatedAt: Date.now(),
      },
    };
  }

  private async generateCode(task: Task): Promise<GeneratedAsset> {
    const endpoint = this.config.localModels.ollama.endpoint;
    const model = 'codellama';

    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: task.prompt,
        stream: false,
      }),
    });

    const result = await response.json();
    const extension = task.params?.language === 'python' ? '.py' :
                      task.params?.language === 'typescript' ? '.ts' : '.txt';
    const outputPath = path.join(this.config.paths.workspace, `${task.id}${extension}`);

    await fs.writeFile(outputPath, result.response);

    return {
      id: randomUUID(),
      taskId: task.id,
      type: 'code',
      localPath: outputPath,
      hash: createHash('sha256').update(result.response).digest('hex'),
      metadata: {
        prompt: task.prompt,
        model,
        params: task.params || {},
        generatedAt: Date.now(),
      },
    };
  }

  // ============ ITERATION SYSTEM ============

  private async iterateOnAsset(task: Task): Promise<GeneratedAsset> {
    const parentAssetPath = task.params?.parentAssetPath;
    if (!parentAssetPath) {
      throw new Error('Iteration requires parent asset');
    }

    const refinedPrompt = this.applyRefinements(
      task.params?.originalPrompt || task.prompt,
      task.params?.refinements || ''
    );

    const iterationTask: Task = {
      ...task,
      type: 'image-gen',
      prompt: refinedPrompt,
    };

    return await this.generateImage(iterationTask);
  }

  private async handleIterationRequest(payload: any): Promise<void> {
    const { assetId, refinements, parentAssetPath, originalPrompt } = payload;

    console.log(`🔄 Iteration requested for asset: ${assetId}`);

    const task: Task = {
      id: randomUUID(),
      type: 'iteration',
      prompt: refinements,
      priority: 3,
      status: 'queued',
      parentTaskId: assetId,
      params: {
        parentAssetPath,
        originalPrompt,
        refinements,
      },
    };

    this.handleTaskAdded(task);
  }

  private applyRefinements(originalPrompt: string, refinements: string): string {
    const refinementMap: Record<string, string> = {
      'more blue': ', blue tones, cool colors',
      'less blue': ', warm tones, reduced blue',
      'more contrast': ', high contrast, dramatic lighting',
      'less contrast': ', soft lighting, low contrast',
      'more detail': ', highly detailed, intricate',
      'less detail': ', simplified, clean lines',
      'more busy': ', complex composition, many elements',
      'less busy': ', minimalist, simple composition',
      'brighter': ', bright, well-lit, luminous',
      'darker': ', dark, moody, shadowy',
    };

    let modifiedPrompt = originalPrompt;

    for (const [key, modifier] of Object.entries(refinementMap)) {
      if (refinements.toLowerCase().includes(key)) {
        modifiedPrompt += modifier;
      }
    }

    if (!Object.keys(refinementMap).some(k => refinements.toLowerCase().includes(k))) {
      modifiedPrompt += `, ${refinements}`;
    }

    return modifiedPrompt;
  }

  // ============ SELF-IMPROVEMENT SYSTEM ============

  private async handleFeedback(payload: any): Promise<void> {
    const { assetId, feedback } = payload as { assetId: string; feedback: UserFeedback };

    console.log(`📊 Feedback received for asset ${assetId}: ${feedback.disposition}`);

    const asset = await this.loadAsset(assetId);
    if (!asset) {
      console.error('Asset not found:', assetId);
      return;
    }

    switch (feedback.disposition) {
      case 'project':
        await this.moveAsset(asset, 'projectAssets');
        break;
      case 'library':
        await this.moveAsset(asset, 'library');
        break;
      case 'prune':
        await this.markForPruning(asset);
        break;
    }

    await this.learnFromFeedback(asset, feedback);
  }

  private async learnFromFeedback(asset: GeneratedAsset, feedback: UserFeedback): Promise<void> {
    if (!this.config.learning.enabled || !asset.styleVector) return;

    const profile = this.styleProfile!;
    const weight = this.config.learning.feedbackWeight;

    if (feedback.rating >= 4) {
      profile.positiveExamples.push(asset.styleVector);

      profile.preferenceVector = profile.preferenceVector.map((v, i) =>
        v + weight * (asset.styleVector![i] - v)
      );

      if (feedback.tags) {
        for (const tag of feedback.tags) {
          if (!profile.promptModifiers.includes(tag)) {
            profile.promptModifiers.push(tag);
          }
        }
      }
    } else if (feedback.rating <= 2) {
      profile.negativeExamples.push(asset.styleVector);

      profile.preferenceVector = profile.preferenceVector.map((v, i) =>
        v - weight * (asset.styleVector![i] - v)
      );
    }

    const magnitude = Math.sqrt(
      profile.preferenceVector.reduce((sum, v) => sum + v * v, 0)
    );
    if (magnitude > 0) {
      profile.preferenceVector = profile.preferenceVector.map(v => v / magnitude);
    }

    const maxExamples = 100;
    if (profile.positiveExamples.length > maxExamples) {
      profile.positiveExamples = profile.positiveExamples.slice(-maxExamples);
    }
    if (profile.negativeExamples.length > maxExamples) {
      profile.negativeExamples = profile.negativeExamples.slice(-maxExamples);
    }

    profile.updatedAt = Date.now();

    this.store.set('styleProfile', profile);

    this.send({
      type: 'STYLE_PROFILE_UPDATE',
      payload: {
        preferenceVector: profile.preferenceVector,
        promptModifiers: profile.promptModifiers,
        positiveCount: profile.positiveExamples.length,
        negativeCount: profile.negativeExamples.length,
      },
    });

    console.log(`🧠 Style profile updated: ${profile.positiveExamples.length} positive, ${profile.negativeExamples.length} negative examples`);
  }

  private handleStyleProfileUpdate(payload: any): void {
    const { preferenceVector, promptModifiers } = payload;

    if (this.styleProfile) {
      this.styleProfile.preferenceVector = this.mergeVectors(
        this.styleProfile.preferenceVector,
        preferenceVector
      );
      this.styleProfile.promptModifiers = [
        ...new Set([...this.styleProfile.promptModifiers, ...promptModifiers])
      ];
      this.store.set('styleProfile', this.styleProfile);
    }
  }

  private applyStyleProfile(prompt: string, taskType: string): string {
    if (!this.config.learning.enabled || !this.styleProfile) {
      return prompt;
    }

    const profile = this.styleProfile;

    let enhancedPrompt = prompt;

    if (profile.promptModifiers.length > 0 && taskType === 'image-gen') {
      const relevantModifiers = profile.promptModifiers.slice(0, 3);
      enhancedPrompt += `, ${relevantModifiers.join(', ')}`;
    }

    return enhancedPrompt;
  }

  private async computeStyleVector(asset: GeneratedAsset): Promise<number[]> {
    if (!this.config.localModels.ollama.enabled) {
      return new Array(this.config.learning.styleVectorDimensions).fill(0);
    }

    try {
      const response = await fetch(`${this.config.localModels.ollama.endpoint}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: asset.metadata.prompt,
        }),
      });

      const result = await response.json();
      return result.embedding || new Array(this.config.learning.styleVectorDimensions).fill(0);
    } catch (e) {
      return new Array(this.config.learning.styleVectorDimensions).fill(0);
    }
  }

  private mergeVectors(local: number[], remote: number[]): number[] {
    return local.map((v, i) => (v + (remote[i] || 0)) / 2);
  }

  // ============ ASSET MANAGEMENT ============

  private async saveAsset(asset: GeneratedAsset, location: keyof Config['paths']): Promise<void> {
    const targetDir = this.config.paths[location];
    await fs.mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, path.basename(asset.localPath));
    await fs.copyFile(asset.localPath, targetPath);

    const metadataPath = targetPath + '.json';
    await fs.writeFile(metadataPath, JSON.stringify(asset, null, 2));
  }

  private async moveAsset(asset: GeneratedAsset, location: keyof Config['paths']): Promise<void> {
    const targetDir = this.config.paths[location];
    await fs.mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, path.basename(asset.localPath));
    await fs.rename(asset.localPath, targetPath);
    asset.localPath = targetPath;

    const metadataPath = targetPath + '.json';
    await fs.writeFile(metadataPath, JSON.stringify(asset, null, 2));

    console.log(`📁 Moved asset to ${location}: ${path.basename(targetPath)}`);
  }

  private async loadAsset(assetId: string): Promise<GeneratedAsset | null> {
    for (const location of ['cache', 'workspace', 'projectAssets', 'library'] as const) {
      const dir = this.config.paths[location];
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const content = await fs.readFile(path.join(dir, file), 'utf-8');
            const asset = JSON.parse(content) as GeneratedAsset;
            if (asset.id === assetId || asset.taskId === assetId) {
              return asset;
            }
          }
        }
      } catch (e) {
        // Directory might not exist
      }
    }
    return null;
  }

  private async markForPruning(asset: GeneratedAsset): Promise<void> {
    const pruneQueue = (this.store.get('pruneQueue') as string[]) || [];
    pruneQueue.push(asset.localPath);
    this.store.set('pruneQueue', pruneQueue);
  }

  private async uploadAsset(asset: GeneratedAsset): Promise<string> {
    const fileContent = await fs.readFile(asset.localPath);

    const response = await fetch(`${this.config.apiUrl}/api/assets/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/octet-stream',
        'X-Asset-Id': asset.id,
        'X-Asset-Type': asset.type,
        'X-Asset-Hash': asset.hash,
      },
      body: fileContent,
    });

    const result = await response.json();
    return result.url;
  }

  // ============ MONITORING ============

  private startIdleMonitor(): void {
    setInterval(async () => {
      const idleTime = await this.getSystemIdleTime();
      const thresholdMs = this.config.compute.idleThresholdMinutes * 60 * 1000;

      const wasOvernightMode = this.isOvernightMode;
      this.isOvernightMode = idleTime > thresholdMs;

      if (this.isOvernightMode && !wasOvernightMode) {
        console.log('🌙 Entering overnight mode (system idle)');
        this.send({ type: 'OVERNIGHT_MODE', payload: { enabled: true } });
        this.requestPendingTasks();
      } else if (!this.isOvernightMode && wasOvernightMode) {
        console.log('☀️ Exiting overnight mode (activity detected)');
        this.send({ type: 'OVERNIGHT_MODE', payload: { enabled: false } });
      }
    }, 60000);
  }

  private async getSystemIdleTime(): Promise<number> {
    const platform = os.platform();

    if (platform === 'darwin') {
      const proc = spawn('ioreg', ['-c', 'IOHIDSystem']);
      let output = '';
      proc.stdout.on('data', (data) => { output += data; });
      await new Promise(r => proc.on('close', r));

      const match = output.match(/"HIDIdleTime" = (\d+)/);
      if (match) {
        return parseInt(match[1]) / 1000000;
      }
    } else if (platform === 'linux') {
      try {
        const proc = spawn('xprintidle');
        let output = '';
        proc.stdout.on('data', (data) => { output += data; });
        await new Promise(r => proc.on('close', r));
        return parseInt(output.trim());
      } catch (e) {
        // xprintidle not available
      }
    }

    return Date.now() - this.lastActivityTime;
  }

  private startStorageMonitor(): void {
    setInterval(async () => {
      const availableGB = this.getAvailableStorage();
      const cacheSize = await this.getCacheSize();
      const maxGB = this.config.compute.maxLocalStorageGB;

      if (cacheSize > maxGB * 0.9) {
        console.log(`🗑️ Storage ${Math.round(cacheSize)}GB > ${maxGB}GB limit. Pruning...`);
        await this.pruneOldAssets();
      }
    }, 3600000);
  }

  private getAvailableStorage(): number {
    return 100; // TODO: Implement actual disk space check
  }

  private async getCacheSize(): Promise<number> {
    let totalSize = 0;

    for (const location of ['cache', 'workspace'] as const) {
      const dir = this.config.paths[location];
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const stats = await fs.stat(path.join(dir, file));
          totalSize += stats.size;
        }
      } catch (e) {
        // Directory might not exist
      }
    }

    return totalSize / (1024 * 1024 * 1024);
  }

  private async pruneOldAssets(): Promise<void> {
    const pruneQueue = (this.store.get('pruneQueue') as string[]) || [];
    const cacheDir = this.config.paths.cache;
    const cacheFiles: { path: string; mtime: number }[] = [];

    try {
      const files = await fs.readdir(cacheDir);
      for (const file of files) {
        if (!file.endsWith('.json')) {
          const stats = await fs.stat(path.join(cacheDir, file));
          cacheFiles.push({ path: path.join(cacheDir, file), mtime: stats.mtimeMs });
        }
      }
    } catch (e) {
      // Directory might not exist
    }

    cacheFiles.sort((a, b) => a.mtime - b.mtime);

    for (const filePath of pruneQueue) {
      try {
        await fs.unlink(filePath);
        await fs.unlink(filePath + '.json').catch(() => {});
        console.log(`🗑️ Pruned: ${path.basename(filePath)}`);
      } catch (e) {
        // Already deleted
      }
    }
    this.store.set('pruneQueue', []);

    const maxGB = this.config.compute.maxLocalStorageGB;
    while (await this.getCacheSize() > maxGB * 0.8 && cacheFiles.length > 0) {
      const file = cacheFiles.shift()!;
      try {
        await fs.unlink(file.path);
        await fs.unlink(file.path + '.json').catch(() => {});
        console.log(`🗑️ Cleaned cache: ${path.basename(file.path)}`);
      } catch (e) {
        // Already deleted
      }
    }
  }

  // ============ WORKFLOW HELPERS ============

  private injectPromptIntoWorkflow(workflow: any, prompt: string, params?: Record<string, any>): any {
    const workflowCopy = JSON.parse(JSON.stringify(workflow));

    for (const nodeId in workflowCopy) {
      const node = workflowCopy[nodeId];
      if (node.class_type === 'CLIPTextEncode' && node.inputs?.text !== undefined) {
        if (!node._meta?.title?.toLowerCase().includes('negative')) {
          node.inputs.text = prompt;
        }
      }

      if (params) {
        if (node.class_type === 'KSampler' && params.steps) {
          node.inputs.steps = params.steps;
        }
        if (node.class_type === 'EmptyLatentImage') {
          if (params.width) node.inputs.width = params.width;
          if (params.height) node.inputs.height = params.height;
        }
      }
    }

    return workflowCopy;
  }
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const connector = new MakerlogConnector();

  switch (command) {
    case 'start':
      console.log('🪵 Makerlog Desktop Connector');
      console.log('================================');
      await connector.connect();
      break;

    case 'config':
      console.log('Run: makerlog-connector config to set up your connection');
      break;

    case 'status':
      console.log('Status: Not implemented yet');
      break;

    default:
      console.log(`
Makerlog Desktop Connector

Usage:
  makerlog-connector start     Start the connector daemon
  makerlog-connector config    Configure your connection
  makerlog-connector status    Show connection status

For more info: https://makerlog.ai/docs/desktop-connector
      `);
  }
}

main().catch(console.error);

export { MakerlogConnector, Config, Task, GeneratedAsset, UserFeedback, StyleProfile };
