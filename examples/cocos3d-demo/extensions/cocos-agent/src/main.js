'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const BRIDGE_PORT = 8899;
let bridgeProcess = null;

function statusFile() {
  return path.join(projectRoot(), '.cocos-agent', 'overlay-status.json');
}

function writeStatus(state, message = '') {
  try {
    const file = statusFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({
      state,
      message,
      version: 'v0.0.0.1-a',
      updatedAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00'),
    }, null, 2));
  } catch (error) {
    console.error(`[cocos-agent] unable to write status: ${error.message}`);
  }
}

function resolveCliIndex() {
  const configFile = path.join(os.homedir(), '.cocos-agent', 'config.json');
  let configuredCliIndex = null;
  try {
    configuredCliIndex = JSON.parse(fs.readFileSync(configFile, 'utf8')).cliIndex;
  } catch {
    // User-level configuration is optional for project-local installs.
  }
  const candidates = [
    process.env.COCOS_AGENT_CLI_INDEX,
    configuredCliIndex,
    path.join(projectRoot(), 'cli', 'dist', 'index.js'),
    path.join(__dirname, '..', '..', '..', 'cli', 'dist', 'index.js'),
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function projectRoot() {
  return typeof Editor !== 'undefined' && Editor.Project && Editor.Project.path
    ? Editor.Project.path
    : process.cwd();
}

function startBridge() {
  if (bridgeProcess) {
    return;
  }
  const indexFile = resolveCliIndex();
  if (!indexFile) {
    console.warn('[cocos-agent] CLI not built. Run: cd cli && npm install && npm run build');
    return;
  }
  bridgeProcess = spawn(
    process.execPath,
    [indexFile, 'bridge', 'start', '--port', String(BRIDGE_PORT)],
    {
      cwd: projectRoot(),
      stdio: 'ignore',
      windowsHide: true,
      env: {
        ...process.env,
        COCOS_AGENT_PROJECT_ROOT: projectRoot(),
        ELECTRON_RUN_AS_NODE: '1',
      },
    },
  );
  bridgeProcess.on('error', (error) => {
    writeStatus('error', `CLI bridge failed to start: ${error.message}`);
  });
  bridgeProcess.on('exit', () => {
    bridgeProcess = null;
  });
}

function openOverlay() {
  if (typeof Editor === 'undefined' || !Editor.Panel) {
    throw new Error('Cocos Creator Editor.Panel API is unavailable.');
  }
  return Promise.resolve(Editor.Panel.open('cocos-agent.overlay'));
}

function stopBridge() {
  if (bridgeProcess) {
    bridgeProcess.kill();
    bridgeProcess = null;
  }
}

module.exports = {
  load() {
    writeStatus('loading', 'Cocos Agent extension is loading.');
    try {
      startBridge();
      setTimeout(() => {
        openOverlay()
          .then(() => writeStatus('ready', 'Cocos Agent panel opened.'))
          .catch((error) => {
            writeStatus('error', `Unable to open Cocos Agent panel: ${error.message}`);
            console.error(`[cocos-agent] ${error.stack || error.message}`);
          });
      }, 250);
    } catch (error) {
      writeStatus('error', error.message);
      console.error(`[cocos-agent] ${error.stack || error.message}`);
    }
  },
  unload() {
    stopBridge();
  },
  methods: {
    openCli() {
      Editor.Panel.open('cocos-agent.cli');
    },
    openOverlay() {
      openOverlay().catch((error) => {
        writeStatus('error', `Unable to open Cocos Agent panel: ${error.message}`);
        console.error(`[cocos-agent] ${error.stack || error.message}`);
      });
    },
  },
};
