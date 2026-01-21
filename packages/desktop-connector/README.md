# Makerlog Desktop Connector

A local daemon that bridges Makerlog.ai cloud services with local AI compute resources.

## Features

- **Hybrid Generation**: Seamlessly switches between cloud AI (Cloudflare Workers) and local models (Ollama, ComfyUI, Automatic1111)
- **Overnight Processing**: Automatically detects idle time and runs heavy generations when you're not using your computer
- **Self-Improving**: Learns from your feedback to generate better outputs over time
- **Asset Management**: Organize generated assets by project, save favorites to your library, or prune unwanted content
- **Iterative Refinement**: Quick iterations on generations with natural language refinements

## Installation

```bash
npm install -g makerlog-connector
```

Or from source:

```bash
cd packages/desktop-connector
npm install
npm run build
npm link
```

## Configuration

Run the interactive setup:

```bash
makerlog-connector config
```

This will prompt for:
- API credentials
- Local model preferences
- Storage locations
- Compute preferences

## Usage

### Start the Daemon

```bash
makerlog-connector start
```

The daemon will:
1. Connect to Makerlog.ai via WebSocket
2. Report local capabilities (enabled models, storage, compute settings)
3. Receive tasks from the cloud
4. Execute generations using local models
5. Upload results back to cloud
6. Learn from user feedback

### Check Status

```bash
makerlog-connector status
```

Shows:
- Connection status
- Enabled local models
- Model availability
- Storage usage

## Local Model Setup

### Ollama (Text/Code Generation)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.1
ollama pull codellama
ollama pull nomic-embed-text
```

### ComfyUI (Image Generation)

```bash
# Install ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt

# Start server
python main.py --listen 0.0.0.0
```

### Automatic1111 (Alternative Image Gen)

```bash
# Install
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui
./webui.sh --api --listen
```

## Directory Structure

```
~/.makerlog/
├── workspace/          # Active generation output
├── projects/           # Assets for current project
├── library/            # Assets saved for future
├── cache/              # Temporary files (auto-pruned)
└── workflows/          # ComfyUI workflow templates
```

## Architecture

The connector runs as a daemon that:

1. **Connects** to cloud via WebSocket with authentication
2. **Receives** tasks (image-gen, text-gen, code-gen, iteration)
3. **Executes** using local models
4. **Reports** progress and results back to cloud
5. **Learns** from user feedback to improve future generations

## Self-Improvement

The system learns from your feedback:

- **Star ratings** (1-5): Teach the system what you like
- **Disposition**: Save to project/library or prune
- **Tags**: Add custom labels that become automatic prompt modifiers
- **Refinements**: Natural language adjustments for iterations

Over time, the system builds a **style profile** that:
- Captures your aesthetic preferences
- Automatically enhances prompts
- Generates better results

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build
npm run build
```

## Troubleshooting

### Connection Issues

```bash
# Check configuration
cat ~/.config/makerlog-connector/config.json

# Test API endpoint
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
makerlog-connector status

# Manually prune cache
rm -rf ~/.makerlog/cache/*
```

## License

MIT
