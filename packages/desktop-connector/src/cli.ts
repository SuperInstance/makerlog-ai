#!/usr/bin/env node

/**
 * Makerlog Desktop Connector CLI
 *
 * Command-line interface for the desktop connector daemon.
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import Conf from 'conf';

const CONFIG_PATH = path.join(os.homedir(), '.config', 'makerlog-connector');
const CONFIG_FILE = path.join(CONFIG_PATH, 'config.json');

async function ensureConfigDir(): Promise<void> {
  await fs.mkdir(CONFIG_PATH, { recursive: true });
}

async function interactiveConfig(): Promise<void> {
  const readline = (await import('readline')).createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise(resolve => readline.question(query, resolve));
  };

  console.log('\n🔧 Makerlog Desktop Connector Setup\n');

  const apiUrl = await question('API URL (default: https://api.makerlog.ai): ') || 'https://api.makerlog.ai';
  const wsUrl = await question('WebSocket URL (default: wss://api.makerlog.ai/ws): ') || 'wss://api.makerlog.ai/ws';
  const apiKey = await question('API Key: ');
  const userId = await question('User ID: ');

  console.log('\n🤖 Local Model Configuration\n');

  const ollamaEnabled = (await question('Enable Ollama? (Y/n): ')).toLowerCase() !== 'n';
  const ollamaEndpoint = await question('Ollama endpoint (default: http://localhost:11434): ') || 'http://localhost:11434';

  const comfyuiEnabled = (await question('Enable ComfyUI? (y/N): ')).toLowerCase() === 'y';
  let comfyuiEndpoint = 'http://localhost:8188';
  if (comfyuiEnabled) {
    comfyuiEndpoint = await question('ComfyUI endpoint (default: http://localhost:8188): ') || 'http://localhost:8188';
  }

  const a1111Enabled = (await question('Enable Automatic1111? (y/N): ')).toLowerCase() === 'y';
  let a1111Endpoint = 'http://localhost:7860';
  if (a1111Enabled) {
    a1111Endpoint = await question('Automatic1111 endpoint (default: http://localhost:7860): ') || 'http://localhost:7860';
  }

  const config = {
    apiUrl,
    wsUrl,
    apiKey,
    userId,
    localModels: {
      ollama: {
        enabled: ollamaEnabled,
        endpoint: ollamaEndpoint,
        models: ['llama3.1', 'codellama', 'nomic-embed-text'],
      },
      comfyui: {
        enabled: comfyuiEnabled,
        endpoint: comfyuiEndpoint,
        workflows: path.join(os.homedir(), '.makerlog', 'workflows'),
      },
      automatic1111: {
        enabled: a1111Enabled,
        endpoint: a1111Endpoint,
      },
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

  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));

  // Create directories
  for (const dir of Object.values(config.paths)) {
    await fs.mkdir(dir, { recursive: true });
  }

  console.log('\n✅ Configuration saved!');
  console.log(`📁 Config: ${CONFIG_FILE}`);
  console.log('\nYou can now start the connector with:');
  console.log('  makerlog-connector start\n');

  readline.close();
}

async function showStatus(): Promise<void> {
  try {
    const configContent = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(configContent);

    console.log('\n📊 Makerlog Desktop Connector Status\n');
    console.log(`API URL: ${config.apiUrl}`);
    console.log(`User ID: ${config.userId}`);
    console.log('\nLocal Models:');
    console.log(`  Ollama: ${config.localModels.ollama.enabled ? '✅' : '❌'} (${config.localModels.ollama.endpoint})`);
    console.log(`  ComfyUI: ${config.localModels.comfyui.enabled ? '✅' : '❌'} (${config.localModels.comfyui.endpoint})`);
    console.log(`  Automatic1111: ${config.localModels.automatic1111.enabled ? '✅' : '❌'} (${config.localModels.automatic1111.endpoint})`);
    console.log('\nStorage:');
    for (const [key, value] of Object.entries(config.paths)) {
      console.log(`  ${key}: ${value}`);
    });

    // Test Ollama connection
    if (config.localModels.ollama.enabled) {
      try {
        const response = await fetch(`${config.localModels.ollama.endpoint}/api/tags`);
        if (response.ok) {
          const models = await response.json();
          console.log('\n✅ Ollama is running');
          console.log('   Available models:', models.models.map((m: any) => m.name).join(', '));
        } else {
          console.log('\n❌ Ollama is not responding');
        }
      } catch (e) {
        console.log('\n❌ Cannot connect to Ollama');
      }
    }

    // Test ComfyUI connection
    if (config.localModels.comfyui.enabled) {
      try {
        const response = await fetch(`${config.localModels.comfyui.endpoint}/system_stats`);
        if (response.ok) {
          console.log('\n✅ ComfyUI is running');
        } else {
          console.log('\n❌ ComfyUI is not responding');
        }
      } catch (e) {
        console.log('\n❌ Cannot connect to ComfyUI');
      }
    }

  } catch (e) {
    console.log('❌ Configuration not found. Run: makerlog-connector config');
  }
}

async function startDaemon(): Promise<void> {
  // Check if config exists
  try {
    await fs.access(CONFIG_FILE);
  } catch {
    console.log('❌ Configuration not found. Run: makerlog-connector config');
    process.exit(1);
  }

  // Import and start the connector
  const { MakerlogConnector } = await import('./index.js');
  const connector = new MakerlogConnector();
  await connector.connect();
}

// CLI entry point
yargs(hideBin(process.argv))
  .command('start', 'Start the connector daemon', {}, () => startDaemon())
  .command('config', 'Configure the connector', {}, () => interactiveConfig())
  .command('status', 'Show connection status', {}, () => showStatus())
  .demandCommand(1, 'You need to specify a command')
  .help()
  .alias('h', 'help')
  .version('1.0.0')
  .alias('v', 'version')
  .parse();
