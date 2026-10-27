'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const BRIDGE_PORT = 8899;
let bridgeProcess = null;
let editorSocket = null;
let editorRetry = null;
let editorToken = null;

// Creator 3.8.8 installed creator-types scene/@types/message.d.ts and public.d.ts:
// query-node-tree([] | [uuid]), query-dirty(), create-node({name,parent?,position?}).
// Deliberately no eval, execute-scene-script, arbitrary message/property or save-scene.
async function executeEditorRequest(tool, args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('EDITOR_ARGUMENT_INVALID');
  const allowed = tool === 'editor_scene_query' ? ['uuid'] : tool === 'editor_node_create' ? ['name', 'parent', 'position'] : [];
  if (!allowed.length || Object.keys(args).some(key => !allowed.includes(key))) throw new Error('EDITOR_TOOL_OR_ARGUMENT_DENIED');
  for (const key of ['uuid', 'parent']) {
    if (args[key] !== undefined && (typeof args[key] !== 'string' || !/^[A-Za-z0-9_+\-/=]{1,128}$/.test(args[key]))) throw new Error('EDITOR_UUID_INVALID');
  }
  if (!await Editor.Message.request('scene', 'query-is-ready')) throw new Error('EDITOR_SCENE_NOT_READY');
  if (tool === 'editor_scene_query') {
    const tree = await Editor.Message.request('scene', 'query-node-tree', ...args.uuid ? [args.uuid] : []);
    let remaining = 500;
    const value = item => item && typeof item === 'object' && 'value' in item ? item.value : item;
    function node(item, depth) {
      if (!item || typeof item !== 'object' || depth > 32 || remaining-- <= 0) return null;
      return { uuid: String(value(item.uuid) || '').slice(0, 128), name: String(value(item.name) || '').slice(0, 128), active: value(item.active), children: Array.isArray(item.children) ? item.children.slice(0, 500).map(child => node(child, depth + 1)).filter(Boolean) : [] };
    }
    return { tree: node(tree, 0), dirty: await Editor.Message.request('scene', 'query-dirty'), limited: remaining <= 0 };
  }
  if (typeof args.name !== 'string' || !args.name.trim() || args.name.length > 128 || /[\x00-\x1f\x7f]/.test(args.name)) throw new Error('EDITOR_NAME_INVALID');
  if (args.position !== undefined) {
    const p = args.position;
    if (!p || typeof p !== 'object' || Array.isArray(p) || Object.keys(p).length !== 3 || !['x', 'y', 'z'].every(key => typeof p[key] === 'number' && Number.isFinite(p[key]) && Math.abs(p[key]) <= 1000000)) throw new Error('EDITOR_POSITION_INVALID');
  }
  const options = { name: args.name, snapshot: true };
  if (args.parent !== undefined) options.parent = args.parent;
  if (args.position !== undefined) options.position = args.position;
  const uuid = await Editor.Message.request('scene', 'create-node', options);
  if (typeof uuid !== 'string' || !uuid) throw new Error('EDITOR_CREATE_FAILED');
  return { uuid, name: args.name, saved: false };
}

function connectEditor(indexFile, token) {
  if (!bridgeProcess || token !== editorToken) return;
  const WebSocket = createRequire(indexFile)('ws');
  const socket = new WebSocket(`ws://127.0.0.1:${BRIDGE_PORT}/ws`, { maxPayload: 65536 });
  editorSocket = socket;
  let busy = false;
  socket.on('open', () => socket.send(JSON.stringify({ type: 'editor_register', token })));
  socket.on('message', async raw => {
    let request;
    try { request = JSON.parse(raw.toString()); } catch { return; }
    if (request.type !== 'editor_request' || typeof request.id !== 'string') return;
    const respond = result => {
      let payload = JSON.stringify({ type: 'editor_result', id: request.id, ...result });
      if (Buffer.byteLength(payload) > 60000) payload = JSON.stringify({ type: 'editor_result', id: request.id, ok: false, error: 'EDITOR_RESULT_TOO_LARGE: query a smaller subtree by UUID.' });
      if (socket.readyState === 1) socket.send(payload);
    };
    if (busy) { respond({ ok: false, error: 'EDITOR_BUSY' }); return; }
    busy = true;
    try { respond({ ok: true, result: await executeEditorRequest(request.tool, request.args) }); }
    catch (error) { respond({ ok: false, error: String(error.message || error).slice(0, 1000) }); }
    finally { busy = false; }
  });
  socket.on('error', () => {});
  socket.on('close', (code) => {
    if (editorSocket === socket) editorSocket = null;
    // Authentication failures are terminal; never claim an unrelated existing bridge.
    if (code !== 1008 && bridgeProcess && token === editorToken) editorRetry = setTimeout(() => connectEditor(indexFile, token), 1000);
  });
}

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
    path.join(projectRoot(), '.cocos-agent', 'cli', 'dist', 'index.js'),
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
  editorToken = randomBytes(32).toString('hex');
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
        COCOS_AGENT_EDITOR_TOKEN: editorToken,
        ELECTRON_RUN_AS_NODE: '1',
      },
    },
  );
  bridgeProcess.on('error', (error) => {
    writeStatus('error', `CLI bridge failed to start: ${error.message}`);
  });
  bridgeProcess.on('exit', () => {
    bridgeProcess = null;
    editorToken = null;
    if (editorRetry) clearTimeout(editorRetry);
    if (editorSocket) editorSocket.close();
  });
  connectEditor(indexFile, editorToken);
}

function openOverlay() {
  if (typeof Editor === 'undefined' || !Editor.Panel) {
    throw new Error('Cocos Creator Editor.Panel API is unavailable.');
  }
  return Promise.resolve(Editor.Panel.open('cocos-agent.overlay'));
}

function stopBridge() {
  editorToken = null;
  if (editorRetry) { clearTimeout(editorRetry); editorRetry = null; }
  if (editorSocket) { editorSocket.close(); editorSocket = null; }
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
