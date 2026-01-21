# Desktop Connector

**Version:** 1.0
**Status:** Core Architecture
**Last Updated:** 2026-01-21

---

## Overview

The Desktop Connector is a local daemon that bridges Makerlog.ai cloud services with local compute resources. It enables:

- **Heavy overnight generation** using local GPU/CPU
- **Iterative refinement** of generated assets
- **Self-improving** generation from user feedback
- **Storage management** with intelligent pruning

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DESKTOP CONNECTOR DAEMON                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────┐   │
│  │ WebSocket   │    │   Task       │    │  Generator  │    │   Asset   │   │
│  │   Client    │◄──►│  Queue      │◄──►│  Pool       │◄──►│ Manager   │   │
│  └─────────────┘    └──────────────┘    └─────────────┘    └───────────┘   │
│         │                  │                   │                  │         │
│         ▼                  ▼                   ▼                  ▼         │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────┐   │
│  │   Cloud     │    │   Priority   │    │  Ollama     │    │  Local    │   │
│  │   Sync      │    │   Scheduler  │    │  ComfyUI    │    │  Storage  │   │
│  └─────────────┘    └──────────────┘    │  A1111      │    └───────────┘   │
│                                         └─────────────┘                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Self-Improvement System                          │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │   │
│  │  │   Style      │    │   Prompt     │    │   Feedback   │          │   │
│  │  │   Profile    │◄──►│   Modifier   │◄──►│    Loop      │          │   │
│  │  └──────────────┘    └──────────────┘    └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Installation

```bash
# Install globally
npm install -g makerlog-connector

# Or install from source
cd packages/desktop-connector
npm install
npm link
```

---

## Configuration

Configuration is stored in `~/.config/makerlog-connector/config.json` (macOS/Linux)
or `%APPDATA%\makerlog-connector\config.json` (Windows).

### Default Configuration

```json
{
  "apiUrl": "https://api.makerlog.ai",
  "wsUrl": "wss://api.makerlog.ai/ws",
  "apiKey": "YOUR_API_KEY",
  "userId": "YOUR_USER_ID",

  "localModels": {
    "ollama": {
      "enabled": true,
      "endpoint": "http://localhost:11434",
      "models": ["llama3.1", "codellama", "nomic-embed-text"]
    },
    "comfyui": {
      "enabled": false,
      "endpoint": "http://localhost:8188",
      "workflows": "~/.makerlog/workflows"
    },
    "automatic1111": {
      "enabled": false,
      "endpoint": "http://localhost:7860"
    }
  },

  "paths": {
    "workspace": "~/.makerlog/workspace",
    "projectAssets": "~/.makerlog/projects",
    "library": "~/.makerlog/library",
    "cache": "~/.makerlog/cache"
  },

  "compute": {
    "maxConcurrentJobs": 2,
    "preferLocal": true,
    "overnightOnly": false,
    "idleThresholdMinutes": 15,
    "maxLocalStorageGB": 50
  },

  "learning": {
    "enabled": true,
    "feedbackWeight": 0.3,
    "styleVectorDimensions": 512
  }
}
```

### Setup Command

```bash
makerlog-connector config
```

Interactive setup prompts for:
- API credentials
- Local model preferences
- Storage locations
- Compute preferences

---

## CLI Usage

```bash
# Start the connector daemon
makerlog-connector start

# Configure settings
makerlog-connector config

# Check connection status
makerlog-connector status

# View task queue
makerlog-connector queue

# View local assets
makerlog-connector assets

# Clear cache
makerlog-connector prune

# View style profile
makerlog-connector profile
```

---

## WebSocket Protocol

### Connection

```javascript
const ws = new WebSocket('wss://api.makerlog.ai/ws', {
  headers: {
    'Authorization': 'Bearer <API_KEY>',
    'X-User-Id': '<USER_ID>',
    'X-Client-Type': 'desktop-connector',
    'X-Client-Version': '1.0.0'
  }
});
```

### Client → Server Messages

**CAPABILITIES**
```json
{
  "type": "CAPABILITIES",
  "payload": {
    "localModels": {
      "ollama": { "enabled": true, "models": ["llama3.1", "codellama"] },
      "comfyui": { "enabled": false }
    },
    "compute": {
      "maxConcurrentJobs": 2,
      "preferLocal": true
    },
    "storageAvailableGB": 150
  }
}
```

**TASK_STATUS**
```json
{
  "type": "TASK_STATUS",
  "payload": {
    "taskId": "task-123",
    "status": "running" | "completed" | "failed"
  }
}
```

**TASK_COMPLETED**
```json
{
  "type": "TASK_COMPLETED",
  "payload": {
    "taskId": "task-123",
    "asset": {
      "id": "asset-456",
      "type": "image",
      "localPath": "/path/to/file.png",
      "hash": "abc123...",
      "metadata": { "prompt": "...", "model": "..." }
    },
    "styleVector": [0.1, 0.2, ...]
  }
}
```

**TASK_FAILED**
```json
{
  "type": "TASK_FAILED",
  "payload": {
    "taskId": "task-123",
    "error": "Out of memory"
  }
}
```

**STYLE_PROFILE_UPDATE**
```json
{
  "type": "STYLE_PROFILE_UPDATE",
  "payload": {
    "preferenceVector": [0.1, 0.2, ...],
    "promptModifiers": ["minimalist", "blue tones"],
    "positiveCount": 25,
    "negativeCount": 5
  }
}
```

**OVERNIGHT_MODE**
```json
{
  "type": "OVERNIGHT_MODE",
  "payload": {
    "enabled": true | false
  }
}
```

**REQUEST_TASKS**
```json
{
  "type": "REQUEST_TASKS",
  "payload": {
    "maxTasks": 50,
    "preferLocal": true,
    "overnightOnly": false
  }
}
```

### Server → Client Messages

**TASKS**
```json
{
  "type": "TASKS",
  "payload": {
    "tasks": [
      {
        "id": "task-123",
        "type": "image-gen" | "text-gen" | "code-gen" | "iteration",
        "prompt": "...",
        "priority": 1-10,
        "status": "queued",
        "params": {}
      }
    ]
  }
}
```

**TASK_ADDED**
```json
{
  "type": "TASK_ADDED",
  "payload": {
    "task": { /* same as above */ }
  }
}
```

**TASK_CANCELLED**
```json
{
  "type": "TASK_CANCELLED",
  "payload": {
    "taskId": "task-123"
  }
}
```

**FEEDBACK_RECEIVED**
```json
{
  "type": "FEEDBACK_RECEIVED",
  "payload": {
    "assetId": "asset-456",
    "feedback": {
      "rating": 1-5,
      "disposition": "project" | "library" | "prune",
      "tags": ["tag1", "tag2"],
      "refinements": "more blue",
      "timestamp": 1234567890
    }
  }
}
```

**STYLE_PROFILE_UPDATED**
```json
{
  "type": "STYLE_PROFILE_UPDATED",
  "payload": {
    "preferenceVector": [0.1, 0.2, ...],
    "promptModifiers": ["minimalist"]
  }
}
```

**ITERATION_REQUEST**
```json
{
  "type": "ITERATION_REQUEST",
  "payload": {
    "assetId": "asset-456",
    "refinements": "more blue, less busy",
    "parentAssetPath": "/path/to/file.png",
    "originalPrompt": "a landscape..."
  }
}
```

---

## Task Types

### image-gen

Generate images using ComfyUI or Automatic1111.

```json
{
  "id": "task-123",
  "type": "image-gen",
  "prompt": "a futuristic city at sunset, cyberpunk style",
  "priority": 5,
  "status": "queued",
  "params": {
    "workflow": "default.json",
    "width": 1024,
    "height": 1024,
    "steps": 30,
    "cfg_scale": 7,
    "negative_prompt": "blurry, low quality"
  }
}
```

### text-gen

Generate text using Ollama.

```json
{
  "id": "task-124",
  "type": "text-gen",
  "prompt": "Write a function that validates email addresses",
  "priority": 3,
  "status": "queued",
  "params": {
    "model": "llama3.1",
    "max_tokens": 500
  }
}
```

### code-gen

Generate code using CodeLlama.

```json
{
  "id": "task-125",
  "type": "code-gen",
  "prompt": "Create a React component for a modal dialog",
  "priority": 5,
  "status": "queued",
  "params": {
    "language": "typescript"
  }
}
```

### iteration

Iterate on an existing asset.

```json
{
  "id": "task-126",
  "type": "iteration",
  "prompt": "more blue, less busy",
  "priority": 8,
  "status": "queued",
  "parentTaskId": "task-123",
  "params": {
    "parentAssetPath": "/path/to/original.png",
    "originalPrompt": "a futuristic city...",
    "refinements": "more blue, less busy"
  }
}
```

---

## Local Model Integration

### Ollama (Text/Code)

**Endpoint:** `http://localhost:11434`

**Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.1
ollama pull codellama
ollama pull nomic-embed-text
```

**API:**
```bash
# Generate
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1",
  "prompt": "Write a hello world function",
  "stream": false
}'

# Embeddings
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "a futuristic city at sunset"
}'
```

### ComfyUI (Image Generation)

**Endpoint:** `http://localhost:8188`

**Setup:**
```bash
# Install ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt

# Start server
python main.py --listen 0.0.0.0
```

**Workflow Format:**
```json
{
  "1": {
    "class_type": "KSampler",
    "inputs": {
      "seed": 123456,
      "steps": 30,
      "cfg": 7,
      "sampler_name": "dpmpp_2m",
      "scheduler": "karras"
    }
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "a futuristic city at sunset"
    }
  },
  "3": {
    "class_type": "VAEDecode",
    "inputs": {}
  },
  "4": {
    "class_type": "SaveImage",
    "inputs": {
      "images": ["3", 0]
    }
  }
}
```

**API:**
```bash
# Queue prompt
curl http://localhost:8188/prompt -d '{
  "prompt": { /* workflow JSON */ }
}'

# Check history
curl http://localhost:8188/history/{prompt_id}

# View image
curl http://localhost:8188/view?filename={filename}
```

### Automatic1111 (Alternative Image Gen)

**Endpoint:** `http://localhost:7860`

**Setup:**
```bash
# Install Automatic1111
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui
./webui.sh --api --listen
```

**API:**
```bash
# Text to Image
curl http://localhost:7860/sdapi/v1/txt2img -d '{
  "prompt": "a futuristic city at sunset",
  "negative_prompt": "blurry",
  "steps": 30,
  "width": 1024,
  "height": 1024,
  "cfg_scale": 7
}'
```

---

## Idle Detection

The connector monitors system activity to enter "overnight mode" automatically.

### macOS
```bash
ioreg -c IOHIDSystem | grep "HIDIdleTime"
# Returns nanoseconds since last input
```

### Linux
```bash
# Install xprintidle
sudo apt install xprintidle

# Check idle time
xprintidle
# Returns milliseconds since last input
```

### Windows
```powershell
# Get idle time using Windows API
# (Implementation uses node-addon-api or Edge.js)
```

---

## Storage Management

### Directory Structure

```
~/.makerlog/
├── workspace/          # Active generation output
│   ├── task-123.png
│   ├── task-124.txt
│   └── task-125.ts
├── projects/           # Assets for current project
│   ├── my-game/
│   │   ├── sprite-001.png
│   │   └── background-001.png
├── library/            # Assets saved for future
│   ├── backgrounds/
│   ├── sprites/
│   └── ui-elements/
├── cache/              # Temporary files (auto-pruned)
└── workflows/          # ComfyUI workflow templates
```

### Pruning Strategy

1. **Explicit prune queue** - User-marked assets deleted first
2. **Oldest cache** - FIFO for cache directory
3. **Low-rated assets** - 1-star deleted before 2-star, etc.

**Auto-prune triggers:**
- Cache > 90% of maxLocalStorageGB
- User requests manual prune
- Overnight mode enters

---

## Development

```bash
# Clone repo
git clone https://github.com/SuperInstance/makerlog-ai.git
cd makerlog-ai/packages/desktop-connector

# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build
npm run build

# Link globally
npm link
```

---

## Troubleshooting

### Connection Issues

```bash
# Check WebSocket connection
makerlog-connector status

# Verify API key
makerlog-connector config

# Test cloud endpoint
curl https://api.makerlog.ai/health
```

### Model Issues

```bash
# Check Ollama
curl http://localhost:11434/api/tags

# Check ComfyUI
curl http://localhost:8188/system_stats

# Check Automatic1111
curl http://localhost:7860/sdapi/v1/sd-models
```

### Storage Issues

```bash
# Check storage usage
makerlog-connector assets

# Manually prune
makerlog-connector prune

# Clear all cache
rm -rf ~/.makerlog/cache/*
```

---

## Security

- **API Key Storage**: Encrypted in system keychain
- **WebSocket**: TLS encryption required
- **Local Models**: No external network access
- **Asset Uploads**: Signed URLs with expiration

---

## Future Enhancements

- [ ] GPU-aware scheduling (NVIDIA, AMD, Apple Silicon)
- [ ] Distributed generation across multiple machines
- [ ] Torrent-style P2P asset sharing
- [ ] Local fine-tuning of models
- [ ] Integration with cloud storage (Google Drive, Dropbox)
