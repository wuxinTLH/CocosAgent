import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const extensionRoot = path.join(repoRoot, 'extensions', 'cocos-agent');
const launcherRoot = path.join(repoRoot, 'launcher');
const require = createRequire(import.meta.url);
const globals = globalThis as typeof globalThis & { Editor?: unknown; WebSocket?: unknown };

class FakeElement {
  id: string;
  value = '';
  textContent = '';
  scrollTop = 0;
  scrollHeight = 0;
  options: FakeElement[] = [];
  selectedOptions: FakeElement[] = [];
  private listeners = new Map<string, Set<(event: { target?: FakeElement; preventDefault?: () => void }) => void>>();

  constructor(id: string) {
    this.id = id;
  }

  addEventListener(event: string, handler: (event: { target?: FakeElement; preventDefault?: () => void }) => void) {
    const handlers = this.listeners.get(event) ?? new Set();
    handlers.add(handler);
    this.listeners.set(event, handlers);
  }

  removeEventListener(event: string, handler: (event: { target?: FakeElement; preventDefault?: () => void }) => void) {
    this.listeners.get(event)?.delete(handler);
  }

  dispatch(event: string) {
    const payload = { target: this, preventDefault: () => undefined };
    for (const handler of this.listeners.get(event) ?? []) handler(payload);
  }
}

class FakeRoot {
  nodes: Record<string, FakeElement>;
  listeners = new Map<string, Set<(event: { target?: FakeElement; preventDefault?: () => void }) => void>>();

  constructor(ids: string[]) {
    this.nodes = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
  }

  querySelector(selector: string) {
    return this.nodes[selector.replace(/^#/, '')] ?? null;
  }

  addEventListener(event: string, handler: (event: { target?: FakeElement; preventDefault?: () => void }) => void) {
    const handlers = this.listeners.get(event) ?? new Set();
    handlers.add(handler);
    this.listeners.set(event, handlers);
  }

  removeEventListener(event: string, handler: (event: { target?: FakeElement; preventDefault?: () => void }) => void) {
    this.listeners.get(event)?.delete(handler);
  }
}

class FakeWebSocket {
  static readonly OPEN = 1;
  readyState = FakeWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  closeCount = 0;

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.closeCount += 1;
    this.readyState = 3;
  }
}

test('Cocos Creator extension manifest and panel contract are valid', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'package.json'), 'utf8')) as {
    package_version?: number;
    cocosAgentVersion?: string;
    panels?: Record<string, { main?: string; type?: string }>;
    contributions?: {
      menu?: Array<{ path?: string; label?: string; message?: string }>;
      messages?: Record<string, unknown>;
    };
  };
  assert.equal(manifest.cocosAgentVersion, 'v0.0.0.1-a');
  assert.equal(manifest.package_version, 2);
  assert.equal(manifest.panels?.cli?.type, 'dockable');
  assert.equal(manifest.panels?.cli?.main, './src/panel.js');
  assert.equal(manifest.panels?.overlay?.type, 'dockable');
  assert.equal(manifest.panels?.overlay?.main, './src/overlay.js');
  assert.equal('panels' in (manifest.contributions ?? {}), false);
  const menu = manifest.contributions?.menu ?? [];
  assert.ok(menu.length >= 2);
  for (const item of menu) {
    assert.ok(item.path?.startsWith('Cocos Agent/'));
    assert.ok(item.label && item.label.length > 0);
    assert.ok(item.message && Object.keys(manifest.contributions?.messages ?? {}).includes(item.message));
  }
  assert.equal(menu.find((item) => item.message === 'open-cli')?.label, 'Open CLI');
  assert.equal(menu.find((item) => item.message === 'open-overlay')?.label, 'Overlay');

  const previousEditor = globals.Editor;
  const opened: string[] = [];
  globals.Editor = {
    Project: { path: repoRoot },
    Panel: {
      define: (definition: unknown) => definition,
      open: (name: string) => opened.push(name),
    },
  };
  try {
    const panelPath = path.join(extensionRoot, 'src', 'panel.js');
    const mainPath = path.join(extensionRoot, 'src', 'main.js');
    delete require.cache[require.resolve(panelPath)];
    delete require.cache[require.resolve(mainPath)];
    const panel = require(panelPath) as { template?: string; ready?: () => void; methods?: { run?: () => void } };
    const overlayPath = path.join(extensionRoot, 'src', 'overlay.js');
    delete require.cache[require.resolve(overlayPath)];
    const overlay = require(overlayPath) as { template?: string; style?: string; ready?: () => void };
    const main = require(mainPath) as { methods?: { openCli?: () => void } };
    const mainSource = fs.readFileSync(mainPath, 'utf8');
    const launcherSource = fs.readFileSync(path.join(launcherRoot, 'Program.cs'), 'utf8');
    const launchScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'launch-cocos-agent.ps1'), 'utf8');
    assert.match(panel.template ?? '', /模型渠道/);
    assert.match(panel.template ?? '', /id="locale"/);
    assert.match(panel.template ?? '', /cc-switch \/ ccs/);
    assert.match(panel.template ?? '', /id="save-provider"/);
    assert.match(panel.template ?? '', /id="ccs-doctor"/);
    assert.equal(typeof panel.ready, 'function');
    assert.equal(typeof panel.methods?.run, 'function');
    assert.match(fs.readFileSync(panelPath, 'utf8'), /queryPanelElement/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /const panelDefinition =/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /panelDefinition\.methods\[name\]\.apply\(this, args\)/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /\$:\s*\{/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /panelEventRoot/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /bindEvent\(root, 'click'/);
    assert.match(panel.template ?? '', /id="save-provider"/);
    assert.match(panel.template ?? '', /id="ccs-connect"/);
    assert.match(panel.template ?? '', /id="ccs-url"/);
    assert.match(panel.template ?? '', /id="copy-output"/);
    assert.doesNotMatch(fs.readFileSync(panelPath, 'utf8'), /document\.getElementById/);
    assert.match(overlay.template ?? '', /Cocos Agent/);
    assert.match(overlay.template ?? '', /chat/);
    assert.match(overlay.style ?? '', /agent-overlay/);
    assert.equal(typeof overlay.ready, 'function');
    assert.match(fs.readFileSync(overlayPath, 'utf8'), /queryPanelElement/);
    assert.match(fs.readFileSync(overlayPath, 'utf8'), /\$:\s*\{/);
    assert.match(fs.readFileSync(overlayPath, 'utf8'), /const panelDefinition =/);
    assert.match(fs.readFileSync(overlayPath, 'utf8'), /panelDefinition\.methods\[name\]\.apply\(this, args\)/);
    assert.match(fs.readFileSync(overlayPath, 'utf8'), /panelEventRoot/);
    assert.match(fs.readFileSync(overlayPath, 'utf8'), /bindEvent\(root, 'click'/);
    assert.match(overlay.template ?? '', /id="close"/);
    assert.match(overlay.template ?? '', /id="copy-output"/);
    assert.doesNotMatch(fs.readFileSync(overlayPath, 'utf8'), /document\.getElementById/);
    assert.match(mainSource, /ELECTRON_RUN_AS_NODE/);
    assert.match(mainSource, /overlay-status\.json/);
    assert.match(mainSource, /Editor\.Panel\.open\('cocos-agent\.overlay'\)/);
    assert.match(launcherSource, /-ProjectRoot/);
    assert.match(launcherSource, /MessageBoxW/);
    assert.match(launcherSource, /FolderBrowserDialog/);
    assert.match(launcherSource, /DRY_RUN project=selection-required/);
    assert.match(launcherSource, /IsCocosProject/);
    assert.match(launcherSource, /LooksLikeCreatorInstallation/);
    assert.match(launchScript, /creatorPath/);
    assert.match(launchScript, /cocos editor/);
    assert.match(launchScript, /ExtensionTimeoutSeconds/);
    assert.match(launchScript, /overlay-status\.json/);
    assert.match(launchScript, /projectCliRoot/);
    assert.match(launchScript, /npm run build/);
    assert.match(launchScript, /VERSION/);
    const localProjectTest = fs.readFileSync(path.join(repoRoot, 'scripts', 'test-local-project.ps1'), 'utf8');
    assert.match(localProjectTest, /COCOS_AGENT_PROJECT_ROOT/);
    assert.match(localProjectTest, /status/);
    assert.match(localProjectTest, /Project-local CLI version mismatch/);
    assert.match(mainSource, /\.cocos-agent', 'cli', 'dist', 'index\.js/);
    main.methods?.openCli?.();
    assert.deepEqual(opened, ['cocos-agent.cli']);
  } finally {
    globals.Editor = previousEditor;
  }
});

test('extension callbacks tolerate unloaded DOM, copy logs, and dispose bridge resources', async () => {
  const previousEditor = globals.Editor;
  const previousWebSocket = globals.WebSocket;
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const closedPanels: string[] = [];
  globals.Editor = { Panel: { define: (definition: unknown) => definition, close: (name: string) => closedPanels.push(name) } };
  globals.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  let copiedText = '';
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async (value: string) => { copiedText = value; } } } });
  try {
    const panelPath = path.join(extensionRoot, 'src', 'panel.js');
    delete require.cache[require.resolve(panelPath)];
    const panelDefinition = require(panelPath) as {
      ready?: () => void;
      close?: () => void;
    };
    const ids = ['output', 'input', 'state', 'locale', 'provider', 'model', 'endpoint', 'credential', 'active-provider', 'fallback-providers', 'ccs-route', 'ccs-url', 'ccs-state', 'form', 'save-provider', 'select-provider', 'save-workspace', 'ccs-doctor', 'ccs-connect', 'copy-output'];
    const root = new FakeRoot(ids);
    const mapped = Object.fromEntries(ids.map((id) => [id, root.nodes[id]]));
    const instance = { $: mapped } as Record<string, unknown>;
    panelDefinition.ready?.call(instance as never);
    const socket = instance.ws as FakeWebSocket;
    assert.ok(socket);
    root.nodes.output.textContent = 'panel log';
    root.nodes['copy-output'].dispatch('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(copiedText, 'panel log');
    socket.onopen?.();
    root.nodes['save-provider'].dispatch('click');
    assert.ok(socket.sent.some((payload) => JSON.parse(payload).tool === 'provider_configure'));
    root.nodes['ccs-url'].value = 'http://127.0.0.1:8787';
    root.nodes['ccs-connect'].dispatch('click');
    const ccsRequest = socket.sent.map((payload) => JSON.parse(payload)).find((payload) => payload.tool === 'ccs_connect');
    assert.equal(ccsRequest.args.url, 'http://127.0.0.1:8787');
    instance.$ = { ...mapped, provider: null };
    assert.doesNotThrow(() => socket.onmessage?.({ data: JSON.stringify({ id: 1, ok: true, result: [{ id: 'openai', model: 'gpt-4.1', endpoint: '', configured: false, credentialEnvironment: 'OPENAI_API_KEY' }] }) }));
    (instance.close as (() => void) | undefined)?.call(instance);
    assert.equal(instance.destroyed, true);
    assert.equal(socket.closeCount, 1);
    assert.deepEqual(closedPanels, ['cocos-agent.cli']);

    const overlayPath = path.join(extensionRoot, 'src', 'overlay.js');
    delete require.cache[require.resolve(overlayPath)];
    const overlayDefinition = require(overlayPath) as { ready?: () => void; close?: () => void };
    const overlayRoot = new FakeRoot(['output', 'input', 'state', 'form', 'close', 'copy-output']);
    const overlay = { $: Object.fromEntries(Object.entries(overlayRoot.nodes)) } as Record<string, unknown>;
    overlayDefinition.ready?.call(overlay as never);
    const overlaySocket = overlay.ws as FakeWebSocket;
    overlayRoot.nodes.output.textContent = 'overlay log';
    overlayRoot.nodes['copy-output'].dispatch('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(copiedText, 'overlay log');
    overlayRoot.nodes.close.dispatch('click');
    (overlay.close as (() => void) | undefined)?.call(overlay);
    assert.equal(overlay.destroyed, true);
    assert.equal(overlay.bindTimer, null);
    assert.equal(overlaySocket.closeCount, 1);
    assert.deepEqual(closedPanels, ['cocos-agent.cli', 'cocos-agent.overlay']);
  } finally {
    globals.Editor = previousEditor;
    globals.WebSocket = previousWebSocket;
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator); else delete (globalThis as { navigator?: unknown }).navigator;
  }
});
