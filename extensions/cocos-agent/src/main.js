'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BRIDGE_PORT = 8899;
let bridgeProcess = null;

function resolveCliIndex() {
  const candidates = [
    process.env.COCOS_AGENT_CLI_INDEX,
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
    },
  );
  bridgeProcess.on('exit', () => {
    bridgeProcess = null;
  });
}

function stopBridge() {
  if (bridgeProcess) {
    bridgeProcess.kill();
    bridgeProcess = null;
  }
}

module.exports = {
  load() {
    startBridge();
  },
  unload() {
    stopBridge();
  },
  methods: {
    openCli() {
      Editor.Panel.open('cocos-agent.cli');
    },
  },
};
