# Long-Running Voice Recording with Intelligent Segmentation

**Research Document**: Technical implementation strategies for continuous voice recording with intelligent segmentation for Makerlog.ai

**Date**: 2026-01-21
**Author**: Claude Code Research
**Status**: Technical Research

---

## Executive Summary

This document researches technical implementation options for long-running voice recording with intelligent segmentation. The target use case is users who talk for hours daily while mobile (walking, commuting, with phone in pocket/headset), requiring a system that can:

1. Record continuous voice for extended periods (hours)
2. Intelligently segment at natural breaks (not arbitrary time chunks)
3. Perform speech-to-text either locally or in the cloud
4. Process text into markdown/structured memory
5. Support screenshots captured during conversation
6. Work reliably on mobile (iOS Safari, Chrome Android)
7. Handle multi-hour recordings without memory issues

## Key Findings Summary

| Aspect | Recommended Approach | Alternatives |
|--------|---------------------|--------------|
| **STT Engine** | Cloudflare Whisper (cloud) | Web Speech API (local, limited), Sherpa-ONNX (local, high quality) |
| **Segmentation** | Hybrid: VAD + silence + prosodic features | Time-based, manual |
| **VAD** | AudioWorklet + Silero VAD (WebAssembly) | RMS-based detection, WebRTC VAD |
| **Memory** | Streaming chunks with progressive upload | In-memory blobs (not recommended for long sessions) |
| **Screenshots** | Timestamp-based sync with audio timeline | Manual attachment after recording |
| **Mobile Support** | Cloud-based STT (universal) | Local STT (Chrome Android only, iOS limited) |
| **Offline** | Queue for later upload | Sherpa-ONNX (research phase) |

---

## Table of Contents

1. [Speech-to-Technology Options](#1-speech-to-text-options)
2. [Voice Activity Detection (VAD)](#2-voice-activity-detection-vad)
3. [Intelligent Segmentation Strategies](#3-intelligent-segmentation-strategies)
4. [Audio Recording & Memory Management](#4-audio-recording--memory-management)
5. [Progressive Upload Pattern](#5-progressive-upload-pattern)
6. [Screenshot Integration](#6-screenshot-integration)
7. [Browser Compatibility Matrix](#7-browser-compatibility-matrix)
8. [Recommended Architecture](#8-recommended-architecture)
9. [Implementation Examples](#9-implementation-examples)
10. [Performance Considerations](#10-performance-considerations)

---

## 1. Speech-to-Text Options

### 1.1 Cloudflare Workers AI Whisper (Recommended)

**Overview**: Cloud-hosted STT with excellent accuracy and reasonable pricing for the use case.

**Models Available**:
- `@cf/openai/whisper-tiny` - Fastest, lowest cost
- `@cf/openai/whisper-base` - Balanced speed/accuracy
- `@cf/openai/whisper-small` - Better accuracy
- `@cf/openai/whisper-medium` - High accuracy
- `@cf/openai/whisper-large-v3-turbo` - Best quality, slower

**Pricing (2025-2026)**:
- **Free allocation**: 10,000 neurons/day on Workers Paid plan
- **Paid usage**: $0.011 per 1,000 neurons (above free tier)
- **Note**: Cloudflare is transitioning from neuron-based to unit-based pricing

**Neuron Consumption Estimates** (approximate):
| Audio Duration | Whisper Model | Neurons |
|----------------|---------------|---------|
| 1 minute | tiny | ~100-150 |
| 1 minute | base | ~150-200 |
| 1 minute | medium | ~300-400 |
| 1 hour | base | ~9,000-12,000 |

**Pros**:
- Universal browser support (works everywhere)
- Excellent accuracy with Whisper models
- Scales to handle hours of recording
- No client-side resource requirements
- Automatic language detection
- Punctuation and formatting support

**Cons**:
- Requires internet connection
- Incurs neuron/quota costs
- Latency for cloud processing
- Privacy consideration (audio sent to cloud)

**Best For**: Production implementation where internet is available and quality is paramount.

**Sources**:
- [Cloudflare Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Cloudflare Whisper Models](https://developers.cloudflare.com/workers-ai/models/whisper/)
- [Cloudflare AI Platform Update](https://blog.cloudflare.com/workers-ai-bigger-better-faster/)

### 1.2 Web Speech API (Local STT)

**Overview**: Browser-native speech recognition using Web Speech API `SpeechRecognition` interface.

**Browser Support (2025)**:

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome Desktop | Full | Best support, sends to Google cloud by default |
| Chrome Android | Full | Mobile Chrome excellent support |
| Edge (Chromium) | Full | Same as Chrome |
| Safari Desktop | Partial | Limited support, Apple's backend |
| Safari iOS | Limited | Poor support, "super bad" results |
| Firefox | None | Not supported |

**Key Limitations**:
1. **Fragmented Support**: Only Chrome/Edge have full support
2. **Cloud-Dependent**: Most implementations send audio to cloud (Google/Apple)
3. **iOS Safari**: Very poor quality results
4. **Callback-Based**: Uses outdated callback design (no Promises by default)
5. **Privacy Concerns**: Audio data sent to cloud servers
6. **No Offline**: Requires internet connection for cloud-based recognition

**New Feature (Chrome 139+)**: `processLocally` flag for on-device processing
```javascript
const recognition = new webkitSpeechRecognition();
recognition.processLocally = true; // On-device processing (Chrome 139+)
```

**Pros**:
- Free to use
- Native browser API (no libraries needed)
- Chrome 139+ supports local processing
- Real-time streaming recognition available

**Cons**:
- No Firefox support
- Poor iOS Safari support
- Cloud-based by default (privacy)
- Varying quality across browsers
- Requires feature detection
- No guaranteed offline support

**Best For**: Fallback option for Chrome/Edge users, supplemental real-time feedback during recording.

**Sources**:
- [Can I Use - Speech Recognition](https://caniuse.com/speech-recognition)
- [MDN - SpeechRecognition API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [AssemblyAI Web Speech API Guide](https://www.assemblyai.com/blog/speech-recognition-javascript-web-speech-api)
- [Top Speech Recognition APIs 2025](https://anotherwrapper.com/blog/speech-recognition-api-free)

### 1.3 Sherpa-ONNX (Local STT - Research Phase)

**Overview**: WebAssembly-based speech recognition running entirely in the browser, offline-capable.

**Technology Stack**:
- Next-gen Kaldi with ONNX Runtime
- WebAssembly (WASM) + SIMD for performance
- Pure client-side, no server required
- Works offline

**Capabilities**:
- Speech-to-text (STT)
- Voice Activity Detection (VAD)
- Text-to-speech (TTS)
- Speaker diarization
- Speech enhancement

**Browser Support**: All modern browsers with WebAssembly support

**Pros**:
- Fully offline capability
- Privacy-first (no cloud communication)
- Cross-browser compatibility
- Real-time performance with WASM+SIMD
- No server costs
- Includes VAD built-in

**Cons**:
- Research phase for this use case
- Initial WASM download (~5-10MB)
- Device performance dependent
- Less accurate than cloud Whisper
- Battery consideration on mobile

**Best For**: Phase 2 research for offline-first capability, privacy-sensitive applications.

**Sources**:
- [Sherpa-ONNX GitHub](https://github.com/k2-fsa/sherpa-onnx)
- [Sherpa-ONNX WebAssembly Build Guide](https://k2-fsa.github.io/sherpa/onnx/wasm/index.html)
- [Sherpa-ONNX VAD Demo](https://modelscope.cn/studios/csukuangfj/web-assembly-vad-sherpa-onnx)
- [NPM Package: speech-asr](https://libraries.io/npm/speech-asr)

### 1.4 Recommendation: Hybrid Approach

**Phase 1 (Immediate)**:
- Primary: Cloudflare Whisper (cloud)
- Fallback/Preview: Web Speech API for Chrome users (real-time feedback)

**Phase 2 (Research)**:
- Offline queue: Store audio locally, upload when online
- Offline STT: Evaluate Sherpa-ONNX for local transcription

**Phase 3 (Advanced)**:
- Adaptive: Use local STT when available, cloud when needed
- Cost optimization: Cache common phrases locally

---

## 2. Voice Activity Detection (VAD)

VAD is the foundation of intelligent segmentation - detecting when the user is speaking vs. silent periods.

### 2.1 AudioWorklet + Silero VAD (Recommended)

**Overview**: Modern, high-performance VAD using AudioWorklet API with Silero VAD model running in WebAssembly.

**Technology**:
- **AudioWorklet**: Web Audio API extension for audio processing in separate thread
- **Silero VAD**: State-of-the-art VAD model (~95%+ accuracy)
- **WebAssembly**: Cross-platform performance

**Implementation Pattern**:
```javascript
// Main thread
const audioContext = new AudioContext();
await audioContext.audioWorklet.addModule('vad-processor.js');
const vadNode = new AudioWorkletNode(audioContext, 'vad-processor');

const source = audioContext.createMediaStreamSource(audioStream);
source.connect(vadNode);

vadNode.port.onmessage = (event) => {
  const { isSpeech, probability } = event.data;
  handleVoiceActivity(isSpeech, probability);
};
```

**Worklet Processor (vad-processor.js)**:
```javascript
class VADProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sileroVAD = new SileroVAD(); // WASM implementation
    this.buffer = [];
  }

  process(inputs, outputs) {
    const input = inputs[0][0]; // Audio samples
    const isSpeech = this.sileroVAD.detect(input);

    this.port.postMessage({ isSpeech, probability });
    return true;
  }
}

registerProcessor('vad-processor', VADProcessor);
```

**Pros**:
- High accuracy (95%+)
- Low latency (~10ms)
- Runs on separate thread (non-blocking)
- Modern, maintainable approach
- Works across browsers

**Cons**:
- Requires WebAssembly download (~2-3MB)
- More complex implementation
- Mobile battery consideration

**Best For**: Production implementation requiring accurate VAD.

**Sources**:
- [GitHub: vad-audio-worklet](https://github.com/thurti/vad-audio-worklet)
- [GitHub: ricky0123/vad](https://github.com/ricky0123/vad)
- [AudioWorklet Deep Dive (Chinese, Dec 2025)](https://blog.csdn.net/gitblog_00912/article/details/156414758)
- [Frontend VAD Research (Chinese, Jan 2025)](https://zhuanlan.zhihu.com/p/10396574546)
- [JavaScript Real-time VAD (Chinese, Sep 2025)](https://cloud.baidu.com/article/3703587)

### 2.2 RMS-Based Detection (Simple Fallback)

**Overview**: Calculate Root Mean Square (RMS) of audio samples to detect energy levels.

**Algorithm**:
```javascript
function calculateRMS(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

function detectSpeech(samples, threshold = 0.02) {
  const rms = calculateRMS(samples);
  return rms > threshold;
}
```

**Pros**:
- Simple to implement
- No external dependencies
- Fast computation
- Works everywhere

**Cons**:
- Less accurate than ML-based VAD
- Susceptible to background noise
- Requires threshold tuning
- False positives from non-speech sounds

**Best For**: Quick prototype, fallback when AudioWorklet unavailable.

### 2.3 WebRTC Built-in VAD

**Overview**: WebRTC includes built-in VAD for voice communication.

**Usage**:
```javascript
// WebRTC VAD is typically internal, but some implementations expose it
// Check browser-specific documentation
```

**Pros**:
- Native browser implementation
- Optimized for voice communication

**Cons**:
- Inconsistent across browsers
- May not be exposed in all browsers
- Designed for real-time communication, not recording

**Best For**: Real-time communication scenarios.

### 2.4 VAD Comparison Summary

| Method | Accuracy | Latency | Complexity | Offline | Recommendation |
|--------|----------|---------|------------|---------|----------------|
| Silero VAD (WASM) | 95%+ | ~10ms | High | Yes | Production |
| RMS-based | 70-80% | ~5ms | Low | Yes | Fallback |
| WebRTC VAD | 85-90% | ~15ms | Medium | Yes | Real-time comms |

---

## 3. Intelligent Segmentation Strategies

Segmentation is the art of breaking continuous audio into meaningful chunks at natural breaks.

### 3.1 Research Background: Sentence Boundary Detection

**Key Research Findings**:

1. **Pause-Based Detection** (Most Common)
   - Use silence duration as primary indicator
   - Typical pause threshold: 500-1000ms for sentence breaks
   - Longer pauses (2000ms+) for paragraph/topic breaks

2. **Prosodic Features**
   - Analyze intonation, stress, rhythm patterns
   - F0 (fundamental frequency) changes indicate phrase boundaries
   - Energy drop signals sentence completion

3. **Machine Learning Approaches**
   - Deep Neural Networks (DNN) for classification
   - Hidden Markov Models (HMMs) for sequence modeling
   - Multi-class classification for boundary types

**Sources**:
- [Dynamic Sentence Boundary Detection (ACL 2020)](https://aclanthology.org/2020.autosimtrans-1.1.pdf)
- [Deep Neural Network Approach (Interspeech 2014)](https://www.isca-archive.org/interspeech_2014/xu14g_interspeech.pdf)
- [Sentence Segmentation for Speech Processing](https://www.researchgate.net/publication/301411470_Sentence_segmentation_for_speech_processing)
- [Conversational Speech Segmentation (Microsoft Research)](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/IS14-hany.pdf)

### 3.2 Recommended Segmentation Algorithm

**Hybrid Multi-Factor Approach**:

```javascript
interface SegmentationConfig {
  silenceThreshold: number;      // Silence duration (ms)
  minSegmentDuration: number;    // Minimum segment length (ms)
  maxSegmentDuration: number;    // Maximum segment length (ms)
  energyThreshold: number;       // RMS energy threshold
  prosodicAnalysis: boolean;     // Enable F0/energy analysis
}

class IntelligentSegmenter {
  private config: SegmentationConfig;
  private silenceBuffer: number[] = [];
  private currentSegmentStartTime: number;
  private lastSpeechTime: number;

  async processAudioFrame(frame: AudioFrame): Promise<SegmentationEvent | null> {
    const now = Date.now();
    const isSpeech = await this.detectSpeech(frame);

    if (isSpeech) {
      this.lastSpeechTime = now;
      this.silenceBuffer = [];

      // Check max duration
      const duration = now - this.currentSegmentStartTime;
      if (duration > this.config.maxSegmentDuration) {
        return this.createSegment('max_duration');
      }
    } else {
      this.silenceBuffer.push(now);

      const silenceDuration = now - this.lastSpeechTime;

      // Natural break detection
      if (silenceDuration > this.config.silenceThreshold) {
        const segmentDuration = now - this.currentSegmentStartTime;

        if (segmentDuration > this.config.minSegmentDuration) {
          return this.createSegment('natural_break');
        }
      }
    }

    return null;
  }

  private async detectSpeech(frame: AudioFrame): Promise<boolean> {
    // Combine VAD + energy analysis
    const vadResult = await this.vad.detect(frame);
    const energyResult = this.analyzeEnergy(frame);

    return vadResult.isSpeech && energyResult.aboveThreshold;
  }

  private analyzeEnergy(frame: AudioFrame): EnergyAnalysis {
    const rms = calculateRMS(frame.samples);
    const zcr = calculateZeroCrossingRate(frame.samples);

    return {
      rms,
      zcr,
      aboveThreshold: rms > this.config.energyThreshold
    };
  }

  private createSegment(reason: string): SegmentationEvent {
    return {
      type: 'segment',
      reason,
      startTime: this.currentSegmentStartTime,
      endTime: Date.now(),
      metadata: {
        silenceDuration: this.silenceBuffer.length,
        estimatedSentences: this.estimateSentences()
      }
    };
  }
}
```

### 3.3 Segmentation Triggers

| Trigger Type | Description | Threshold | Use Case |
|--------------|-------------|-----------|----------|
| **Natural Pause** | User stops speaking | 800-1500ms silence | Sentence/topic breaks |
| **Prosodic Drop** | Pitch/energy drops significantly | F0 drop >20% | Sentence completion |
| **Max Duration** | Time limit reached | 5-10 minutes | Prevent huge segments |
| **Manual User** | User explicitly requests segment | Button press | Topic changes |
| **Context Change** | Screenshot/annotation added | Metadata event | Reference points |

### 3.4 Segment Metadata

Each segment should include:
```typescript
interface SegmentMetadata {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  trigger: 'silence' | 'max_duration' | 'manual' | 'screenshot';
  silenceDuration: number;
  estimatedSentences: number;
  confidence: number;
  screenshots: ScreenshotReference[];
  transcription?: string;
  summary?: string;
}
```

---

## 4. Audio Recording & Memory Management

### 4.1 Memory Challenges

Multi-hour recordings present significant memory challenges:

- **Audio Data Rate**: 16kHz, 16-bit mono = ~32KB/second = ~115MB/hour
- **3-hour session**: ~345MB of raw audio
- **Browser Memory Limits**: Varies, but 500MB-1GB typical on mobile

**Key Issue**: Keeping entire recording in memory will crash browsers on long sessions.

### 4.2 Recommended: Chunked Recording with Streaming

**Strategy**: Process audio in chunks, never hold entire recording in memory.

**MediaRecorder with timeslice**:
```javascript
class StreamingAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private currentChunkSize = 0;
  private readonly MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

  async startRecording(stream: MediaStream) {
    // Determine best MIME type
    const mimeType = this.getBestMimeType();

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 32000 // 32kbps for voice
    });

    // Request chunks every 10 seconds
    this.mediaRecorder.start(10000);

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        await this.processChunk(event.data);
      }
    };
  }

  private async processChunk(chunk: Blob) {
    // Upload immediately
    await this.uploadChunk(chunk);

    // Clear from memory
    this.currentChunkSize = 0;

    // Notify UI
    this.onChunkProcessed(chunk);
  }

  private async uploadChunk(chunk: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', chunk);
    formData.append('segmentId', this.currentSegmentId);

    const response = await fetch('/api/audio/chunk', {
      method: 'POST',
      body: formData
    });

    return response.json().url;
  }

  private getBestMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',    // Chrome/Android
      'audio/mp4',                  // iOS Safari
      'audio/ogg;codecs=opus',      // Firefox
      'audio/webm'                  // Fallback
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ''; // Let browser choose
  }
}
```

### 4.3 Memory Optimization Techniques

1. **Stream Processing**: Process audio as it arrives, don't buffer
2. **Immediate Upload**: Send chunks to server immediately
3. **Compression**: Use Opus codec (32kbps is sufficient for voice)
4. **Garbage Collection**: Clear references immediately after use
5. **Worker Threads**: Offload processing to workers

```javascript
// Use Web Worker for audio processing
const audioWorker = new Worker('audio-processor.js');

audioWorker.postMessage({
  type: 'process',
  audioBuffer: chunk
}, [chunk.buffer]); // Transferable, zero-copy
```

### 4.4 Progressive File Assembly

Server-side assembly of chunks:
```typescript
// Cloudflare Worker endpoint
app.post('/api/audio/chunk', async (c) => {
  const chunk = await c.req.formData();
  const audio = chunk.get('audio') as File;
  const segmentId = chunk.get('segmentId') as string;

  // Stream directly to R2
  const key = `segments/${segmentId}/${Date.now()}.webm`;
  await env.ASSETS.put(key, audio.stream());

  // Track chunk in database
  await c.env.DB.prepare(`
    INSERT INTO audio_chunks (segment_id, r2_key, size, timestamp)
    VALUES (?, ?, ?, ?)
  `).bind(segmentId, key, audio.size, Date.now()).run();

  return c.json({ key });
});
```

---

## 5. Progressive Upload Pattern

### 5.1 Architecture

**Progressive Upload**: Upload audio chunks while recording continues, reducing memory pressure and enabling parallel processing.

```
┌─────────────────┐
│   Recording     │
│   (10s chunks)  │
└────────┬────────┘
         │
         ├─> Chunk 1 ──> Upload ──> Queue for STT
         │
         ├─> Chunk 2 ──> Upload ──> Queue for STT
         │
         ├─> Chunk 3 ──> Upload ──> Queue for STT
         │
         └─> ...
```

### 5.2 Implementation Pattern

```typescript
class ProgressiveUploader {
  private uploadQueue: UploadTask[] = [];
  private concurrentUploads = 2;
  private retryAttempts = 3;

  async uploadChunk(chunk: Blob, metadata: ChunkMetadata) {
    const task: UploadTask = {
      chunk,
      metadata,
      status: 'pending',
      attempts: 0
    };

    this.uploadQueue.push(task);
    this.processQueue();
  }

  private async processQueue() {
    const activeUploads = this.uploadQueue.filter(t => t.status === 'uploading');

    if (activeUploads.length < this.concurrentUploads) {
      const nextTask = this.uploadQueue.find(t => t.status === 'pending');
      if (nextTask) {
        await this.uploadWithRetry(nextTask);
        this.processQueue(); // Process next
      }
    }
  }

  private async uploadWithRetry(task: UploadTask) {
    task.status = 'uploading';

    try {
      const url = await this.doUpload(task.chunk, task.metadata);
      task.status = 'completed';
      task.url = url;

      // Trigger STT for this chunk
      await this.queueTranscription(url, task.metadata);

    } catch (error) {
      task.attempts++;

      if (task.attempts < this.retryAttempts) {
        task.status = 'pending';
        setTimeout(() => this.processQueue(), 1000 * task.attempts);
      } else {
        task.status = 'failed';
        task.error = error;
      }
    }
  }

  private async doUpload(chunk: Blob, metadata: ChunkMetadata): Promise<string> {
    const formData = new FormData();
    formData.append('audio', chunk);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch('/api/audio/chunk', {
      method: 'POST',
      body: formData,
      keepalive: true // Critical: complete upload even if page closes
    });

    if (!response.ok) throw new Error('Upload failed');

    return response.json().url;
  }
}
```

**Sources**:
- [Streaming Screen Recordings in WebM Chunks](https://javascript.plainenglish.io/stream-and-store-screen-recordings-in-webm-chunks-using-mediarecorder-api-recordrtc-4e2dc188f23b)
- [Audio Capture Streaming to Node.js](https://subvisual.com/blog/posts/39-tutorial-html-audio-capture-streaming-to-node-js-no-browser-extensions/)
- [Continuous Audio Stream Stack Overflow](https://stackoverflow.com/questions/64744309/how-can-i-get-a-continuous-stream-of-samples-from-the-javascript-audioapi)

### 5.3 Keep-Alive Critical Pattern

**Critical**: Use `keepalive: true` for uploads to ensure they complete even if user navigates away or closes tab.

```javascript
fetch('/api/audio/chunk', {
  method: 'POST',
  body: formData,
  keepalive: true  // ← Critical!
});
```

### 5.4 Offline Queue Pattern

For users without internet during recording:

```typescript
class OfflineAudioQueue {
  private db: IDBDatabase;

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MakerlogAudioQueue', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.createObjectStore('chunks', { keyPath: 'id' });
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async enqueueChunk(chunk: Blob, metadata: any) {
    const transaction = this.db.transaction(['chunks'], 'readwrite');
    const store = transaction.objectStore('chunks');

    await store.add({
      id: crypto.randomUUID(),
      chunk,
      metadata,
      timestamp: Date.now()
    });
  }

  async processQueue() {
    if (!navigator.onLine) return;

    const transaction = this.db.transaction(['chunks'], 'readwrite');
    const store = transaction.objectStore('chunks');
    const chunks = await store.getAll();

    for (const item of chunks) {
      try {
        await this.uploadChunk(item.chunk, item.metadata);
        await store.delete(item.id);
      } catch (error) {
        console.error('Upload failed, keeping in queue', error);
        break;
      }
    }
  }
}

// Listen for online events
window.addEventListener('online', () => {
  offlineQueue.processQueue();
});
```

---

## 6. Screenshot Integration

### 6.1 Use Case

User captures screenshots during voice conversation (e.g., "Look at this design mockup"). Screenshots need to be synchronized with the audio timeline.

### 6.2 Technical Approach

**Timestamp-Based Synchronization**:

```typescript
interface ScreenshotReference {
  id: string;
  timestamp: number;        // Audio timestamp (ms from start)
  r2Key: string;            // Storage location
  thumbnail: string;        // Thumbnail URL
  description?: string;     // User or AI-generated description
  recognizedContent?: string; // OCR/text recognition
}

class ScreenshotCapture {
  private recordingStartTime: number;

  async captureScreenshot(): Promise<ScreenshotReference> {
    // Capture from screen
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { mediaSource: 'screen' }
    });

    const videoTrack = stream.getVideoTracks()[0];
    const capture = new ImageCapture(videoTrack);
    const bitmap = await capture.grabFrame();

    // Calculate timestamp relative to recording start
    const audioTimestamp = Date.now() - this.recordingStartTime;

    // Convert to blob
    const blob = await this.bitmapToBlob(bitmap);

    // Upload
    const r2Key = await this.uploadScreenshot(blob);

    return {
      id: crypto.randomUUID(),
      timestamp: audioTimestamp,
      r2Key,
      thumbnail: await this.generateThumbnail(blob)
    };
  }

  private async uploadScreenshot(blob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('screenshot', blob);
    formData.append('timestamp', Date.now().toString());

    const response = await fetch('/api/screenshots', {
      method: 'POST',
      body: formData
    });

    return response.json().key;
  }

  private bitmapToBlob(bitmap: ImageBitmap): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);

      canvas.convertToBlob({ type: 'image/png', quality: 0.9 })
        .then(resolve);
    });
  }
}
```

### 6.3 User Interface

**Quick Capture During Recording**:

```typescript
function VoiceRecordingUI() {
  const [screenshots, setScreenshots] = useState<ScreenshotReference[]>([]);

  const handleScreenshot = async () => {
    const screenshot = await screenshotCapture.captureScreenshot();
    setScreenshots(prev => [...prev, screenshot]);

    // Provide haptic feedback
    navigator.vibrate([10, 50, 10]);
  };

  return (
    <div className="recording-ui">
      <div className="recording-controls">
        <RecordingButton />
        <button onClick={handleScreenshot}>
          📷 Screenshot
        </button>
      </div>

      <div className="timeline">
        <AudioTimeline />
        {screenshots.map(ss => (
          <ScreenshotMarker
            key={ss.id}
            timestamp={ss.timestamp}
            thumbnail={ss.thumbnail}
          />
        ))}
      </div>
    </div>
  );
}
```

### 6.4 Synchronization on Playback

During playback, show screenshots at their timestamp:

```typescript
class AudioPlaybackWithScreenshots {
  play(segment: Segment, screenshots: ScreenshotReference[]) {
    const audio = new Audio(segment.audioUrl);

    audio.ontimeupdate = () => {
      const currentTime = audio.currentTime * 1000; // Convert to ms

      const currentScreenshots = screenshots.filter(
        ss => Math.abs(ss.timestamp - currentTime) < 2000 // Within 2 seconds
      );

      this.displayScreenshots(currentScreenshots);
    };
  }
}
```

### 6.5 AI Content Recognition

**Post-Processing with Vision AI**:

```typescript
// After recording, use AI to describe screenshot content
async function analyzeScreenshot(screenshot: ScreenshotReference) {
  const response = await fetch('/api/screenshots/analyze', {
    method: 'POST',
    body: JSON.stringify({ r2Key: screenshot.r2Key })
  });

  const { description, text } = await response.json();

  return {
    ...screenshot,
    description,  // AI-generated description
    recognizedContent: text  // OCR content
  };
}
```

**Sources**:
- [Microsoft Game Capture Documentation](https://learn.microsoft.com/en-us/windows/uwp/gaming/capture-game-audio-video-screenshots-and-metadata)
- [Chinese Patent: Audio-Image Sync](https://patents.google.com/patent/CN102932623A/zh)
- [Label Studio Time Series Sync](https://labelstud.io/templates/timeseries_audio_video)

---

## 7. Browser Compatibility Matrix

### 7.1 Feature Support Comparison

| Feature | Chrome Desktop | Chrome Android | Safari Desktop | Safari iOS | Edge | Firefox |
|---------|---------------|----------------|----------------|------------|------|---------|
| **MediaRecorder** | Full | Full | Full | Full | Full | Full |
| **Web Audio API** | Full | Full | Full | Full | Full | Full |
| **AudioWorklet** | Full (66+) | Full (66+) | Full (14.1+) | Full (14.1+) | Full | No |
| **Web Speech API** | Full | Full | Partial | Poor | Full | No |
| **getDisplayMedia** | Full | Full | Full | No | Full | Full |
| **IndexedDB** | Full | Full | Full | Full | Full | Full |
| **Service Worker** | Full | Full | Full | Full | Full | Full |
| **Background Sync** | Full | Limited | No | No | Full | No |

### 7.2 Platform-Specific Considerations

#### iOS Safari
- **MediaRecorder**: Supports `audio/mp4` format (not `audio/webm`)
- **AudioWorklet**: Supported iOS 14.1+
- **Web Speech API**: Poor quality results
- **Background Recording**: Stops when app backgrounds
- **Solution**: Auto-upload chunks immediately with `keepalive: true`

#### Chrome Android
- **Best support** for all features
- **Web Speech API**: Excellent quality
- **Background Recording**: Stops when screen off/app backgrounds
- **Workaround**: Request partial wake lock for screen

#### Desktop Browsers
- **Chrome/Edge**: Full support, recommended primary platform
- **Firefox**: No Web Speech API, but everything else works
- **Safari Desktop**: Good support, Web Speech API is Apple's backend

### 7.3 Feature Detection Pattern

```javascript
const FeatureDetection = {
  mediaRecorder: () => 'MediaRecorder' in window,
  audioWorklet: () => 'AudioWorkletNode' in window,
  webSpeechAPI: () => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
  screenCapture: () => 'getDisplayMedia' in navigator.mediaDevices,
  indexedDB: () => 'indexedDB' in window,
  serviceWorker: () => 'serviceWorker' in navigator,
  backgroundSync: () => 'ServiceWorkerRegistration' in window && 'sync' in ServiceWorkerRegistration.prototype,

  getBestMimeType: () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }
};

// Usage
if (FeatureDetection.audioWorklet()) {
  // Use AudioWorklet for VAD
} else {
  // Fallback to ScriptProcessorNode or RMS-based
}
```

---

## 8. Recommended Architecture

### 8.1 System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Audio       │    │   VAD        │    │  Segmenter   │      │
│  │  Capture     │───>│  (Silero     │───>│  (Hybrid)    │      │
│  │  (MediaRec.) │    │   WASM)      │    │              │      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
│                                                  │              │
│                                                  v              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Screenshot  │    │  Chunk       │    │  Progressive │      │
│  │  Capture     │    │  Queue       │    │  Upload      │      │
│  │              │    │              │    │  (Keepalive) │      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
│                                                  │              │
└──────────────────────────────────────────────────┼──────────────┘
                                                   │ HTTP/2
                                                   v
┌──────────────────────────────────────────────────────────────────┐
│                     Cloudflare Worker API                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Chunk       │    │  Assemble    │    │  Whisper     │      │
│  │  Receiver    │───>│  Segments    │───>│  STT         │      │
│  │              │    │              │    │              │      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
│                                                  │              │
│                                                  v              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Markdown    │    │  Vector      │    │  Store       │      │
│  │  Processing  │<───│  Embeddings  │<───│  in D1       │      │
│  │              │    │              │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Data Flow

**Recording Phase**:
1. Audio captured in 10-second chunks
2. VAD analyzes each frame for speech activity
3. Segmenter detects natural breaks
4. Chunks uploaded progressively with `keepalive: true`
5. Screenshots captured with timestamps
6. Offline queue used if no internet

**Processing Phase** (parallel):
1. Assemble chunks into segments
2. Cloudflare Whisper transcribes each segment
3. Generate embeddings with BGE
4. Store in D1 + Vectorize
5. Link screenshots to audio timeline

**Retrieval Phase**:
1. Semantic search with Vectorize
2. Retrieve segments with screenshots
3. Display in chronological order
4. Audio playback synchronized with screenshots

### 8.3 Database Schema

```sql
-- Recording sessions
CREATE TABLE recording_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  duration INTEGER,
  status TEXT NOT NULL, -- 'recording', 'processing', 'completed'
  total_chunks INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audio segments (intelligently segmented)
CREATE TABLE audio_segments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  trigger_type TEXT NOT NULL, -- 'silence', 'max_duration', 'manual', 'screenshot'
  silence_duration INTEGER,
  estimated_sentences INTEGER,
  r2_key TEXT NOT NULL,
  transcription TEXT,
  summary TEXT,
  embedding_id TEXT,
  status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES recording_sessions(id)
);

-- Audio chunks (progressive upload)
CREATE TABLE audio_chunks (
  id TEXT PRIMARY KEY,
  segment_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  size INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  uploaded_at INTEGER NOT NULL,
  FOREIGN KEY (segment_id) REFERENCES audio_segments(id)
);

-- Screenshots linked to timeline
CREATE TABLE screenshots (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  segment_id TEXT,
  timestamp INTEGER NOT NULL, -- Audio timestamp (ms from session start)
  r2_key TEXT NOT NULL,
  thumbnail_r2_key TEXT,
  description TEXT, -- AI-generated or user-provided
  recognized_content TEXT, -- OCR
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES recording_sessions(id),
  FOREIGN KEY (segment_id) REFERENCES audio_segments(id)
);

-- Vector embeddings for semantic search
CREATE TABLE segment_embeddings (
  id TEXT PRIMARY KEY,
  segment_id TEXT NOT NULL UNIQUE,
  vectorize_id TEXT NOT NULL, -- Vectorize index ID
  created_at INTEGER NOT NULL,
  FOREIGN KEY (segment_id) REFERENCES audio_segments(id)
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_created ON recording_sessions(user_id, created_at DESC);
CREATE INDEX idx_segments_session_time ON audio_segments(session_id, start_time ASC);
CREATE INDEX idx_chunks_segment ON audio_chunks(segment_id, chunk_index ASC);
CREATE INDEX idx_screenshots_session_time ON screenshots(session_id, timestamp ASC);
CREATE INDEX idx_embeddings_vectorize ON segment_embeddings(vectorize_id);
```

### 8.4 API Endpoints

```typescript
// Progressive upload
POST /api/audio/chunk
// Receives audio chunk, streams to R2, tracks in database

// Screenshot capture
POST /api/screenshots
// Uploads screenshot with timestamp, links to session

// Segmentation trigger
POST /api/audio/segments/create
// Creates segment from accumulated chunks

// Transcription
POST /api/audio/segments/:id/transcribe
// Triggers Whisper transcription for segment

// Screenshot analysis
POST /api/screenshots/:id/analyze
// AI analysis of screenshot content

// Session completion
POST /api/sessions/:id/complete
// Finalizes session, triggers processing

// Retrieval
GET /api/sessions/:id
// Returns session with segments, screenshots, transcriptions

// Semantic search
POST /api/search
// Searches transcriptions with Vectorize
```

---

## 9. Implementation Examples

### 9.1 Complete Recording Flow

```typescript
class LongFormRecorder {
  private vad: VoiceActivityDetector;
  private segmenter: IntelligentSegmenter;
  private uploader: ProgressiveUploader;
  private screenshotCapture: ScreenshotCapture;
  private session: RecordingSession;

  async startRecording() {
    // Get microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000
      }
    });

    // Initialize components
    this.vad = new SileroVAD();
    this.segmenter = new IntelligentSegmenter({
      silenceThreshold: 1200, // 1.2 seconds
      minSegmentDuration: 5000, // 5 seconds
      maxSegmentDuration: 600000, // 10 minutes
    });
    this.uploader = new ProgressiveUploader();
    this.screenshotCapture = new ScreenshotCapture();

    // Create recording session
    this.session = await this.createSession();

    // Start audio capture
    await this.startAudioCapture(stream);

    // Start VAD processing
    await this.startVADProcessing(stream);

    // Setup screenshot handler
    this.setupScreenshotHandler();
  }

  private async startAudioCapture(stream: MediaStream) {
    const mimeType = FeatureDetection.getBestMimeType();

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 32000
    });

    // 10-second chunks
    mediaRecorder.start(10000);

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        await this.handleAudioChunk(event.data);
      }
    };

    this.mediaRecorder = mediaRecorder;
  }

  private async startVADProcessing(stream: MediaStream) {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);

    if (FeatureDetection.audioWorklet()) {
      await audioContext.audioWorklet.addModule('/workers/vad-processor.js');
      const vadNode = new AudioWorkletNode(audioContext, 'vad-processor');

      source.connect(vadNode);

      vadNode.port.onmessage = async (event) => {
        const { isSpeech, probability } = event.data;
        await this.handleVADResult(isSpeech, probability);
      };
    } else {
      // Fallback to ScriptProcessorNode
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = async (event) => {
        const isSpeech = await this.vad.detect(event.inputBuffer);
        await this.handleVADResult(isSpeech, 0.8);
      };
    }
  }

  private async handleVADResult(isSpeech: boolean, probability: number) {
    const segmentationEvent = await this.segmenter.processSpeechActivity(
      isSpeech,
      probability
    );

    if (segmentationEvent) {
      await this.createSegment(segmentationEvent);
    }
  }

  private async handleAudioChunk(chunk: Blob) {
    await this.uploader.uploadChunk(chunk, {
      sessionId: this.session.id,
      segmentId: this.segmenter.currentSegmentId,
      timestamp: Date.now()
    });
  }

  private async createSegment(event: SegmentationEvent) {
    const response = await fetch('/api/audio/segments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: this.session.id,
        ...event
      })
    });

    const segment = await response.json();

    // Queue for transcription
    await fetch(`/api/audio/segments/${segment.id}/transcribe`, {
      method: 'POST'
    });
  }

  private setupScreenshotHandler() {
    // Global keyboard shortcut
    document.addEventListener('keydown', async (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        await this.captureScreenshot();
      }
    });

    // UI button handler would also call this
  }

  async captureScreenshot() {
    const screenshot = await this.screenshotCapture.capture();

    // Upload with timestamp
    await fetch('/api/screenshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: this.session.id,
        ...screenshot
      })
    });

    // Trigger segmentation to create reference point
    await this.createSegment({
      type: 'screenshot',
      timestamp: screenshot.timestamp
    });
  }

  async stopRecording() {
    this.mediaRecorder?.stop();

    // Finalize any pending segment
    if (this.segmenter.hasPendingSegment) {
      await this.createSegment({
        type: 'manual',
        reason: 'recording_stopped'
      });
    }

    // Mark session complete
    await fetch(`/api/sessions/${this.session.id}/complete`, {
      method: 'POST'
    });
  }
}
```

### 9.2 AudioWorklet VAD Processor

```javascript
// vad-processor.js
class VADProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sileroVAD = null;
    this.buffer = [];
    this.bufferSize = 4096; // ~256ms at 16kHz
    this.isInitialized = false;

    this.initVAD();
  }

  async initVAD() {
    // Load Silero VAD WASM module
    // This would typically be loaded from a separate file
    try {
      const module = await import('./silero-vad-wasm.js');
      this.sileroVAD = new module.SileroVAD();
      this.isInitialized = true;
      this.port.postMessage({ type: 'initialized' });
    } catch (error) {
      this.port.postMessage({ type: 'error', error: error.message });
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input.length === 0) return true;

    const channel = input[0];

    // Accumulate samples
    for (let i = 0; i < channel.length; i++) {
      this.buffer.push(channel[i]);
    }

    // Process when buffer is full
    if (this.buffer.length >= this.bufferSize) {
      this.processBuffer();
    }

    return true;
  }

  processBuffer() {
    if (!this.isInitialized || !this.sileroVAD) {
      this.buffer = [];
      return;
    }

    // Convert Float32Array to Int16Array (expected by Silero)
    const int16Buffer = new Int16Array(this.buffer.length);
    for (let i = 0; i < this.buffer.length; i++) {
      int16Buffer[i] = Math.max(-32768, Math.min(32767, this.buffer[i] * 32768));
    }

    // Run VAD
    const result = this.sileroVAD.detect(int16Buffer);

    // Send result to main thread
    this.port.postMessage({
      type: 'vad',
      isSpeech: result.isSpeech,
      probability: result.probability
    });

    this.buffer = [];
  }
}

registerProcessor('vad-processor', VADProcessor);
```

### 9.3 Worker API: Chunk Receiver

```typescript
// Cloudflare Worker endpoint
import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

app.post('/api/audio/chunk', async (c) => {
  const formData = await c.req.formData();
  const audio = formData.get('audio') as File;
  const metadata = JSON.parse(formData.get('metadata') as string);

  // Generate unique key
  const chunkId = crypto.randomUUID();
  const key = `chunks/${metadata.sessionId}/${metadata.segmentId}/${chunkId}.webm`;

  // Stream directly to R2 (no buffering)
  await c.env.ASSETS.put(key, audio.stream(), {
    customMetadata: {
      contentType: audio.type,
      originalSize: audio.size.toString(),
      timestamp: metadata.timestamp.toString()
    }
  });

  // Track in database
  await c.env.DB.prepare(`
    INSERT INTO audio_chunks (id, segment_id, chunk_index, r2_key, size, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    chunkId,
    metadata.segmentId,
    metadata.chunkIndex || 0,
    key,
    audio.size,
    Date.now()
  ).run();

  // Update segment chunk count
  await c.env.DB.prepare(`
    UPDATE audio_segments
    SET chunk_count = chunk_count + 1
    WHERE id = ?
  `).bind(metadata.segmentId).run();

  return c.json({
    success: true,
    chunkId,
    key
  });
});

export default app;
```

### 9.4 Worker API: Segment Assembly & Transcription

```typescript
app.post('/api/audio/segments/create', async (c) => {
  const { session_id, start_time, end_time, trigger_type, metadata } = await c.req.json();

  const segmentId = crypto.randomUUID();

  // Create segment record
  await c.env.DB.prepare(`
    INSERT INTO audio_segments (
      id, session_id, start_time, end_time, trigger_type,
      silence_duration, estimated_sentences, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    segmentId,
    session_id,
    start_time,
    end_time,
    trigger_type,
    metadata?.silenceDuration || 0,
    metadata?.estimatedSentences || 0,
    'pending'
  ).run();

  // Trigger assembly and transcription in background
  c.env.QUEUE.send({
    type: 'process_segment',
    segmentId,
    sessionId: session_id
  });

  return c.json({ segmentId });
});

// Queue handler for segment processing
export async function queue(batch: MessageBatch<Env>, env: Env) {
  for (const message of batch.messages) {
    const { type, segmentId, sessionId } = message.body;

    if (type === 'process_segment') {
      await processSegment(env, segmentId, sessionId);
    }

    message.ack();
  }
}

async function processSegment(env: Env, segmentId: string, sessionId: string) {
  // Get chunks for this segment
  const chunks = await env.DB.prepare(`
    SELECT r2_key FROM audio_chunks
    WHERE segment_id = ?
    ORDER BY chunk_index ASC
  `).bind(segmentId).all();

  // Assemble chunks (could be done as stream in future)
  const assembledKey = `segments/${segmentId}/complete.webm`;

  // Trigger Whisper transcription
  const transcription = await transcribeSegment(env, assembledKey);

  // Generate embeddings
  const embedding = await generateEmbedding(env, transcription);

  // Store in Vectorize
  const vectorizeId = await env.VECTORIZE.insert([
    {
      id: segmentId,
      values: embedding,
      metadata: {
        sessionId,
        transcription: transcription.substring(0, 100) // Preview
      }
    }
  ]);

  // Update segment record
  await env.DB.prepare(`
    UPDATE audio_segments
    SET transcription = ?, summary = ?, r2_key = ?, embedding_id = ?, status = ?
    WHERE id = ?
  `).bind(
    transcription,
    generateSummary(transcription),
    assembledKey,
    vectorizeId,
    'completed',
    segmentId
  ).run();
}

async function transcribeSegment(env: Env, audioKey: string): Promise<string> {
  const audio = await env.ASSETS.get(audioKey);
  if (!audio) throw new Error('Audio not found');

  const response = await env.AI.run('@cf/openai/whisper-base', {
    audio: [...new Uint8Array(await audio.arrayBuffer())]
  });

  return response.text;
}

async function generateEmbedding(env: Env, text: string): Promise<number[]> {
  const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: text.substring(0, 512) // First 512 chars for embedding
  });

  return response.data[0];
}

function generateSummary(transcription: string): string {
  // Simple sentence-based summary
  const sentences = transcription.split('.').filter(s => s.trim().length > 0);
  return sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '...' : '');
}
```

---

## 10. Performance Considerations

### 10.1 Memory Optimization

| Technique | Impact | Implementation |
|-----------|--------|----------------|
| **Streaming upload** | High (80% reduction) | Use `keepalive: true`, upload immediately |
| **Audio compression** | Medium (50% reduction) | Opus @ 32kbps for voice |
| **Worker threads** | Medium (UI responsiveness) | Offload VAD/compression to workers |
| **Chunk sizing** | High | 10-second chunks balance overhead/reliability |
| **Garbage collection** | Low-Medium | Explicit null assignments, transferable objects |

### 10.2 Network Optimization

| Technique | Benefit | Implementation |
|-----------|---------|----------------|
| **Concurrent uploads** | Faster upload | 2-3 parallel chunk uploads |
| **Retry logic** | Reliability | Exponential backoff, 3 attempts |
| **Compression** | Bandwidth | HTTP/2 + gzip response bodies |
| **Progressive rendering** | UX | Show segments as they complete |
| **Offline queue** | Robustness | IndexedDB fallback for offline |

### 10.3 Battery Optimization (Mobile)

```typescript
class BatteryOptimizedRecorder {
  async getOptimalConfig() {
    // Get battery status if available
    const battery = await (navigator as any).getBattery?.();

    if (battery && battery.level < 0.2 && !battery.charging) {
      // Low power mode
      return {
        audioBitsPerSecond: 16000,  // Lower bitrate
        vadInterval: 200,           // Less frequent VAD
        chunkDuration: 15000,       // Longer chunks (fewer uploads)
        disableVisualizations: true
      };
    }

    // Normal mode
    return {
      audioBitsPerSecond: 32000,
      vadInterval: 100,
      chunkDuration: 10000,
      disableVisualizations: false
    };
  }
}
```

### 10.4 Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Memory usage** | <200MB rising slowly | Chrome DevTools Memory profiler |
| **Upload latency** | <2s per chunk | Network timing |
| **VAD latency** | <50ms | Time from audio to detection |
| **Segmentation delay** | <500ms | Time from silence to segment creation |
| **Transcription time** | <30s per 10-min segment | Cloudflare Worker timing |
| **End-to-end latency** | <2 minutes | Recording to searchable text |

### 10.5 Error Handling

```typescript
class ResilientRecorder {
  private errorCounts = new Map<string, number>();
  private readonly MAX_ERRORS = 3;

  async handleError(component: string, error: Error) {
    const count = (this.errorCounts.get(component) || 0) + 1;
    this.errorCounts.set(component, count);

    // Log error
    console.error(`[${component}]`, error);

    // Circuit breaker
    if (count >= this.MAX_ERRORS) {
      await this.triggerCircuitBreaker(component);
    }

    // Attempt recovery
    await this.attemptRecovery(component, error);
  }

  private async triggerCircuitBreaker(component: string) {
    switch (component) {
      case 'upload':
        // Switch to offline queue mode
        this.uploader.enableOfflineMode();
        break;

      case 'vad':
        // Fallback to simple RMS detection
        this.vad = new RMSVAD();
        break;

      case 'transcription':
        // Retry later with exponential backoff
        setTimeout(() => this.retryTranscription(), 60000);
        break;
    }
  }

  private async attemptRecovery(component: string, error: Error) {
    // Component-specific recovery logic
    if (component === 'upload' && error.message.includes('network')) {
      // Check if we're offline
      if (!navigator.onLine) {
        this.uploader.enableOfflineMode();
      }
    }
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)
- [ ] Basic MediaRecorder recording with chunking
- [ ] Simple RMS-based VAD
- [ ] Progressive upload with keepalive
- [ ] Basic silence detection segmentation
- [ ] R2 storage integration

### Phase 2: Enhanced Segmentation (Weeks 4-6)
- [ ] AudioWorklet VAD integration
- [ ] Silero VAD WASM implementation
- [ ] Hybrid segmentation algorithm
- [ ] Segment metadata tracking
- [ ] Cloudflare Whisper integration

### Phase 3: Screenshot Integration (Weeks 7-8)
- [ ] getDisplayMedia screenshot capture
- [ ] Timestamp synchronization
- [ ] Timeline UI with screenshot markers
- [ ] Playback with screenshot display

### Phase 4: Advanced Features (Weeks 9-12)
- [ ] Offline queue with IndexedDB
- [ ] Battery-aware adaptive recording
- [ ] Web Speech API real-time feedback (Chrome)
- [ ] Vector embeddings and semantic search
- [ ] AI screenshot analysis

### Phase 5: Polish & Optimization (Weeks 13-14)
- [ ] Performance profiling
- [ ] Memory optimization
- [ ] Error handling and recovery
- [ ] Cross-browser testing
- [ ] Documentation

---

## Conclusion

Long-running voice recording with intelligent segmentation is feasible with modern web technologies. The recommended approach combines:

1. **Cloudflare Whisper** for high-quality STT (universal support)
2. **AudioWorklet + Silero VAD** for accurate voice activity detection
3. **Hybrid segmentation** using silence, duration, and prosodic features
4. **Progressive upload** with `keepalive: true` for memory efficiency
5. **Timestamp-based synchronization** for screenshot integration
6. **Offline queue** for robustness during network interruptions

The architecture is designed to handle multi-hour recording sessions while maintaining browser stability, providing excellent mobile support, and delivering searchable, referenceable voice memory.

**Next Steps**:
1. Prototype Phase 1 (basic recording + upload)
2. Test memory characteristics on target devices
3. Evaluate Silero VAD WASM bundle size and performance
4. Design segment merge/split UI for user control
5. Research Sherpa-ONNX for offline capability (Phase 2+)

---

## Sources & References

### Speech Recognition
- [Cloudflare Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Cloudflare Whisper Models](https://developers.cloudflare.com/workers-ai/models/whisper/)
- [Can I Use - Speech Recognition](https://caniuse.com/speech-recognition)
- [MDN - SpeechRecognition API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [AssemblyAI Web Speech API Guide](https://www.assemblyai.com/blog/speech-recognition-javascript-web-speech-api)

### VAD & Audio Processing
- [GitHub: vad-audio-worklet](https://github.com/thurti/vad-audio-worklet)
- [GitHub: ricky0123/vad](https://github.com/ricky0123/vad)
- [Picovoice VAD Complete Guide](https://picovoice.ai/blog/complete-guide-voice-activity-detection-vad/)
- [AudioWorklet Deep Dive (Chinese, Dec 2025)](https://blog.csdn.net/gitblog_00912/article/details/156414758)
- [JavaScript Real-time VAD (Chinese, Sep 2025)](https://cloud.baidu.com/article/3703587)

### Segmentation Research
- [Dynamic Sentence Boundary Detection (ACL 2020)](https://aclanthology.org/2020.autosimtrans-1.1.pdf)
- [Deep Neural Network Approach (Interspeech 2014)](https://www.isca-archive.org/interspeech_2014/xu14g_interspeech.pdf)
- [Sentence Segmentation for Speech Processing](https://www.researchgate.net/publication/301411470_Sentence_segmentation_for_speech_processing)
- [Conversational Speech Segmentation (Microsoft Research)](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/IS14-hany.pdf)

### Audio Recording & Upload
- [Streaming Screen Recordings in WebM Chunks](https://javascript.plainenglish.io/stream-and-store-screen-recordings-in-webm-chunks-using-mediarecorder-api-recordrtc-4e2dc188b23b)
- [Audio Capture Streaming to Node.js](https://subvisual.com/blog/posts/39-tutorial-html-audio-capture-streaming-to-node-js-no-browser-extensions/)
- [Continuous Audio Stream Stack Overflow](https://stackoverflow.com/questions/64744309/how-can-i-get-a-continuous-stream-of-samples-from-the-javascript-audioapi)
- [MDN - MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API/Using_the_MediaStream_Recording_API)

### Screenshot Integration
- [Microsoft Game Capture Documentation](https://learn.microsoft.com/en-us/windows/uwp/gaming/capture-game-audio-video-screenshots-and-metadata)
- [Label Studio Time Series Sync](https://labelstud.io/templates/timeseries_audio_video)

### WebAssembly STT
- [Sherpa-ONNX GitHub](https://github.com/k2-fsa/sherpa-onnx)
- [Sherpa-ONNX WebAssembly Build Guide](https://k2-fsa.github.io/sherpa/onnx/wasm/index.html)
- [Sherpa-ONNX VAD Demo](https://modelscope.cn/studios/csukuangfj/web-assembly-vad-sherpa-onnx)
- [NPM Package: speech-asr](https://libraries.io/npm/speech-asr)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-21
**Research Summary**: Complete technical foundation for implementing long-running voice recording with intelligent segmentation in Makerlog.ai
