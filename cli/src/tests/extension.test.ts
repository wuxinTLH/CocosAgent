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
  hidden = false;
  disabled = false;
  selected = false;
  selectionStart = 0;
  selectionEnd = 0;
  type = '';
  scrollTop = 0;
  scrollHeight = 0;
  options: FakeElement[] = [];
  selectedOptions: FakeElement[] = [];
  ownerDocument = { createElement: (id: string) => new FakeElement(id) };
  children: FakeElement[] = [];
  className = '';
  parent: FakeElement | null = null;
  attributes = new Map<string, string>();
  focus() { /* no-op in the DOM stub */ }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  appendChild(child: FakeElement) { child.parent = this; this.children.push(child); if (['provider', 'active-provider', 'fallback-providers', 'quick-provider', 'sessions'].includes(this.id)) this.options.push(child); return child; }
  replaceChildren() { for (const child of this.children) child.parent = null; this.children = []; this.options = []; }
  querySelector(selector: string) { return this.children.find((child) => child.className.split(/\s+/).includes(selector.slice(1))) ?? null; }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((child) => child !== this); this.parent = null; } }
  private listeners = new Map<string, Set<(event: { target?: FakeElement; key?: string; shiftKey?: boolean; isComposing?: boolean; preventDefault?: () => void }) => void>>();

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

  dispatch(event: string, keys: { key?: string; shiftKey?: boolean; isComposing?: boolean; keyCode?: number; ctrlKey?: boolean } = {}) {
    let prevented = false;
    const payload = { target: this, ...keys, preventDefault: () => { prevented = true; } };
    for (const handler of this.listeners.get(event) ?? []) handler(payload);
    return prevented;
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

test('conversation-first panel sends chat, switches sessions and restores quick provider', () => {
  const previousEditor = globals.Editor;
  const previousWebSocket = globals.WebSocket;
  globals.Editor = { Panel: { define: (definition: unknown) => definition } };
  globals.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  const ids = ['output', 'input', 'state', 'provider', 'model', 'endpoint', 'protocol', 'protocol-label', 'credential', 'api-key', 'clear-key', 'provider-name', 'connection-status', 'provider-editor', 'add-provider', 'edit-provider', 'cancel-provider', 'form', 'save-provider', 'select-provider', 'copy-output', 'settings-toggle', 'settings', 'quick-provider', 'activity-toggle', 'activity', 'chat-history', 'new-chat', 'sessions', 'active-model', 'back-chat', 'composer', 'permission', 'permission-confirm', 'confirm-permission', 'cancel-permission', 'delete-provider', 'provider-delete-confirm', 'confirm-provider-delete', 'cancel-provider-delete', 'rollback-confirm', 'confirm-rollback', 'cancel-rollback', 'execution-state', 'history-toggle', 'history-menu', 'delete-chat', 'delete-confirm', 'confirm-delete', 'cancel-delete', 'permission-info'];
  const root = new FakeRoot(ids);
  root.nodes.settings.hidden = true;
  root.nodes.activity.hidden = true;
  root.nodes['provider-editor'].hidden = true;
  root.nodes['settings-toggle'].setAttribute('aria-expanded', 'false');
  root.nodes['activity-toggle'].setAttribute('aria-expanded', 'false');
  const welcome = root.nodes['chat-history'].appendChild(new FakeElement('p'));
  welcome.className = 'agent-cli__welcome';
  let instance: Record<string, unknown> | undefined;
  try {
    const panelPath = path.join(extensionRoot, 'src', 'panel.js');
    delete require.cache[require.resolve(panelPath)];
    const panel = require(panelPath) as { ready: (this: Record<string, unknown>) => void };
    instance = { $: root.nodes };
    panel.ready.call(instance);
    const socket = instance.ws as FakeWebSocket;
    const requests = () => socket.sent.map((payload) => JSON.parse(payload) as { id: number; tool: string; args: Record<string, string> });
    const latest = (tool: string) => {
      const request = requests().filter((item) => item.tool === tool).at(-1);
      assert.ok(request, `expected ${tool} request`);
      return request;
    };
    const reply = (request: { id: number }, result: unknown, ok = true) => socket.onmessage?.({ data: JSON.stringify({ id: request.id, ok, ...(ok ? { result } : { error: result }) }) });
    const messages = () => root.nodes['chat-history'].children.filter((child) => child.className.includes('agent-cli__message'));
    assert.equal(root.nodes.settings.hidden, true);
    assert.equal(root.nodes.activity.hidden, true);
    root.nodes['settings-toggle'].dispatch('click');
    assert.equal(root.nodes.settings.hidden, false);
    assert.equal(root.nodes.composer.hidden, true);
    root.nodes['back-chat'].dispatch('click');
    assert.equal(root.nodes.settings.hidden, true);
    assert.equal(root.nodes.composer.hidden, false);
    for (const [section, toggle] of [['history-menu', 'history-toggle'], ['activity', 'activity-toggle']]) {
      root.nodes[section].hidden = true;
      root.nodes[toggle].dispatch('click');
      assert.equal(root.nodes[section].hidden, false);
      assert.equal(root.nodes[toggle].getAttribute('aria-expanded'), 'true');
      root.nodes[toggle].dispatch('click');
      assert.equal(root.nodes[section].hidden, true);
      assert.equal(root.nodes[toggle].getAttribute('aria-expanded'), 'false');
    }
    socket.onopen?.();
    reply(latest('provider_list'), [
      { id: 'openai', label: 'OpenAI', model: 'gpt-4.1', configured: true },
      { id: 'deepseek', label: 'DeepSeek', model: 'deepseek-chat', configured: true },
      { id: 'qwen', label: 'Default template', configured: false, saved: false },
      { id: 'mine', label: 'Saved without key', configured: false, saved: true },
    ]);
    assert.deepEqual(root.nodes['quick-provider'].options.map((option) => option.value), ['openai', 'deepseek', 'mine']);
    const sessions = [
      { id: 'first', name: '第一段', provider: 'openai', messages: [] },
      { id: 'second', name: '第二段', provider: 'deepseek', messages: [{ role: 'user', content: '旧提问' }] },
    ];
    const workspace = (activeSessionId: string, items = sessions) => ({ activeSessionId, sessions: items });
    reply(latest('workspace_list'), workspace('first'));
    assert.equal(root.nodes.sessions.value, 'first');
    assert.equal(root.nodes['quick-provider'].value, 'openai');
    assert.equal(root.nodes['active-model'].textContent, 'OpenAI · gpt-4.1');
    root.nodes.input.value = '  直接提问  ';
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'Enter', shiftKey: true }), false);
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'Enter', isComposing: true }), false);
    assert.equal(requests().filter((item) => item.tool === 'workspace_chat').length, 0);
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'Enter' }), true);
    const firstChat = latest('workspace_chat');
    assert.deepEqual(firstChat.args, { chat: '直接提问', mode: 'agent' });
    assert.equal(root.nodes.input.value, '');
    assert.equal(welcome.parent, null);
    assert.deepEqual(messages().map((item) => [item.children[0].textContent, item.children[1].textContent]), [['你', '直接提问']]);
    root.nodes.input.value = '不能重复';
    root.nodes.form.dispatch('submit');
    assert.equal(requests().filter((item) => item.tool === 'workspace_chat').length, 1);
    assert.equal(root.nodes.input.value, '不能重复');
    reply(firstChat, { content: '完成回答' });
    assert.deepEqual(messages().at(-1)?.children.map((item) => item.textContent), ['Cocos Agent', '完成回答', '复制']);
    assert.equal(instance.chatBusy, false);
    // Actual workspace_chat response has no session; reload persisted indexes for rollback.
    reply(latest('workspace_list'), workspace('first', [{ ...sessions[0], messages: [{ role: 'user', content: '直接提问' }, { role: 'assistant', content: '完成回答' }] }, sessions[1]]));
    assert.equal(messages()[0].children.at(-1)?.textContent, '回退到此处');
    root.nodes.form.dispatch('submit');
    const failedChat = latest('workspace_chat');
    assert.equal(failedChat.args.chat, '不能重复');
    reply(failedChat, '模型不可用', false);
    assert.deepEqual(messages().at(-1)?.children.map((item) => item.textContent), ['提示', '模型不可用', '复制']);
    assert.equal(instance.chatBusy, false);
    root.nodes.input.value = 'status of my scene';
    root.nodes.form.dispatch('submit');
    const naturalQuestion = latest('workspace_chat');
    assert.equal(naturalQuestion.args.chat, 'status of my scene', 'command-like natural language must remain chat');
    reply(naturalQuestion, { content: '场景状态' });
    root.nodes.sessions.value = 'second';
    root.nodes.sessions.dispatch('change');
    assert.deepEqual(latest('workspace_switch').args, { id: 'second' });
    reply(latest('workspace_switch'), {});
    reply(latest('workspace_list'), workspace('second'));
    assert.equal(root.nodes.sessions.value, 'second');
    assert.equal(root.nodes['quick-provider'].value, 'deepseek');
    assert.equal(root.nodes['active-model'].textContent, 'DeepSeek · deepseek-chat');
    assert.deepEqual(messages().map((item) => item.children[1].textContent), ['旧提问']);
    (instance.refreshWorkspace as (() => void))();
    reply(latest('workspace_list'), workspace('second', [sessions[0], { ...sessions[1], messages: [{ role: 'user', content: '旧提问' }, { role: 'assistant', content: '新回答' }] }]));
    assert.deepEqual(messages().map((item) => item.children[1].textContent), ['旧提问', '新回答'], 'same session refresh must synchronize server history');
    root.nodes['new-chat'].dispatch('click');
    assert.match(latest('workspace_create').args.name, /^对话 /);
    reply(latest('workspace_create'), { id: 'third' });
    reply(latest('workspace_list'), workspace('third', [...sessions, { id: 'third', name: '新对话', provider: 'deepseek', messages: [] }]));
    assert.equal(root.nodes.sessions.value, 'third');
    assert.equal(root.nodes['chat-history'].children[0]?.className, 'agent-cli__welcome');
    root.nodes['quick-provider'].value = 'openai';
    root.nodes['quick-provider'].dispatch('change');
    assert.deepEqual(latest('provider_select').args, { provider: 'openai' });
    reply(latest('provider_select'), {});
    reply(latest('workspace_list'), workspace('third', [...sessions, { id: 'third', name: '新对话', provider: 'openai', messages: [] }]));
    assert.equal(root.nodes['quick-provider'].value, 'openai');
    assert.equal(root.nodes['active-model'].textContent, 'OpenAI · gpt-4.1');
    root.nodes['quick-provider'].value = 'deepseek';
    root.nodes['quick-provider'].dispatch('change');
    reply(latest('provider_select'), '无可用密钥', false);
    reply(latest('workspace_list'), workspace('third', [...sessions, { id: 'third', name: '新对话', provider: 'openai', messages: [] }]));
    assert.equal(root.nodes['quick-provider'].value, 'openai');
    assert.match(root.nodes['connection-status'].textContent, /切换失败/);
    assert.match(root.nodes.output.textContent, /无可用密钥/);
    assert.equal(root.nodes.permission.value, 'only-safe');
    root.nodes.input.value = '执行任务';
    root.nodes.form.dispatch('submit');
    const agentRequest = latest('workspace_chat');
    assert.deepEqual(agentRequest.args, { chat: '执行任务', mode: 'agent' });
    assert.equal(root.nodes['execution-state'].hidden, false);
    const toolTrace = [{ id: 'call-1', name: '<script>tool</script>', status: 'completed', result: '<img src=x>' }];
    reply(agentRequest, { content: '任务完成', toolTrace });
    assert.equal(root.nodes['execution-state'].hidden, true);
    assert.equal(messages().at(-1)?.children[2].textContent, '✓ <script>tool</script>\n<img src=x>');
    (instance.renderSession as (session: unknown) => void)({ id: 'third', provider: 'openai', messages: [{ role: 'assistant', content: '已保存', toolTrace }] });
    assert.equal(messages().at(-1)?.children[2].textContent, '✓ <script>tool</script>\n<img src=x>');
    const count = requests().length;
    root.nodes['delete-chat'].dispatch('click');
    assert.equal(requests().length, count, 'delete requires inline confirmation');
    root.nodes['cancel-delete'].dispatch('click');
    root.nodes['confirm-delete'].dispatch('click');
    assert.equal(requests().length, count);
    root.nodes['delete-chat'].dispatch('click');
    root.nodes['confirm-delete'].dispatch('click');
    assert.deepEqual(latest('workspace_delete').args, { id: 'third' });
    reply(latest('workspace_delete'), {});
    reply(latest('workspace_list'), workspace('first'));
    assert.equal(root.nodes.sessions.value, 'first');

    // Privilege changes require a dedicated human confirmation and backend acknowledgement.
    const staleStatus = latest('status');
    root.nodes.permission.value = 'full-access';
    root.nodes.permission.dispatch('change');
    assert.equal(root.nodes.permission.value, 'only-safe');
    assert.equal(root.nodes['permission-confirm'].hidden, false);
    root.nodes['cancel-permission'].dispatch('click');
    root.nodes['confirm-permission'].dispatch('click');
    assert.equal(requests().some((item) => item.tool === 'permission_set'), false);
    root.nodes.permission.value = 'full-access'; root.nodes.permission.dispatch('change');
    root.nodes['confirm-permission'].dispatch('click');
    const privilege = latest('permission_set');
    assert.deepEqual(privilege.args, { mode: 'full-access', userInitiated: true });
    assert.equal(root.nodes.permission.value, 'only-safe');
    reply(privilege, { current: { permissionMode: 'full-access' } });
    assert.equal(root.nodes.permission.value, 'full-access');
    reply(staleStatus, { permissions: { mode: 'only-safe' } });
    assert.equal(root.nodes.permission.value, 'full-access', 'stale status cannot undo acknowledgement');
    root.nodes.permission.value = 'only-safe'; root.nodes.permission.dispatch('change');
    reply(latest('permission_set'), 'PERMISSION_DENIED: denied', false);
    assert.equal(root.nodes.permission.value, 'full-access');
    assert.equal(root.nodes.permission.disabled, false);

    // History only takes over on boundary lines and preserves the unsent draft.
    root.nodes.input.value = '未发送草稿'; root.nodes.input.selectionStart = root.nodes.input.selectionEnd = 3;
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'ArrowUp', isComposing: true }), false);
    root.nodes.input.dispatch('compositionstart');
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'Enter' }), false);
    root.nodes.input.dispatch('compositionend');
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'ArrowUp', keyCode: 229 }), false);
    root.nodes.input.selectionEnd = 4;
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'ArrowUp' }), false, 'text selection remains editable');
    root.nodes.input.selectionEnd = root.nodes.input.selectionStart;
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'ArrowUp', ctrlKey: true }), false);
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'ArrowUp' }), true);
    assert.equal(root.nodes.input.value, '执行任务');
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'ArrowDown' }), true);
    assert.equal(root.nodes.input.value, '未发送草稿');
    root.nodes.input.value = '第一行\n第二行'; root.nodes.input.selectionStart = root.nodes.input.selectionEnd = 5;
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'ArrowUp' }), false);
    root.nodes.input.selectionStart = root.nodes.input.selectionEnd = 1;
    assert.equal(root.nodes.input.dispatch('keydown', { key: 'ArrowDown' }), false);

    // Rollback uses absolute message indexes and never changes draft on cancel/error/stale action.
    const rollbackSession = { id: 'first', provider: 'openai', messages: [{ role: 'user', content: '第一问' }, { role: 'assistant', content: '回答' }, { role: 'user', content: '重新提问', timeUtc8: '2026-07-21 10:00:00 +08:00' }] };
    (instance.renderSession as (session: unknown) => void)(rollbackSession);
    const rollbackButton = messages().at(-1)!.children.at(-1)!;
    rollbackButton.dispatch('click');
    root.nodes['cancel-rollback'].dispatch('click');
    const beforeRollback = requests().length;
    root.nodes['confirm-rollback'].dispatch('click');
    assert.equal(requests().length, beforeRollback);
    rollbackButton.dispatch('click'); root.nodes['confirm-rollback'].dispatch('click');
    assert.deepEqual(latest('workspace_rollback').args, { id: 'first', messageIndex: 2, expectedMessage: { content: '重新提问', timeUtc8: '2026-07-21 10:00:00 +08:00' } });
    reply(latest('workspace_rollback'), 'WORKSPACE_ROLLBACK_STALE: selected message changed in another panel', false);
    assert.match(messages().at(-1)!.children[1].textContent, /WORKSPACE_ROLLBACK_STALE/);
    assert.equal(root.nodes.input.value, '第一行\n第二行');
    rollbackButton.dispatch('click'); root.nodes['confirm-rollback'].dispatch('click');
    reply(latest('workspace_rollback'), { session: { ...rollbackSession, messages: rollbackSession.messages.slice(0, 2) }, draft: '重新提问' });
    assert.equal(root.nodes.input.value, '重新提问');
    reply(latest('workspace_list'), workspace('first', [{ ...sessions[0], messages: rollbackSession.messages.slice(0, 2) }]));
    const beforeStale = requests().length;
    rollbackButton.dispatch('click'); root.nodes['confirm-rollback'].dispatch('click');
    assert.equal(requests().length, beforeStale);

    // Built-ins are protected; custom removal requires confirmation and is busy guarded.
    root.nodes.provider.value = 'openai'; root.nodes['delete-provider'].dispatch('click');
    assert.match(root.nodes['connection-status'].textContent, /只能删除自定义/);
    (instance.providers as unknown[]).push({ id: 'custom-cloud', label: 'Custom', saved: true });
    root.nodes.provider.value = 'custom-cloud'; root.nodes['delete-provider'].dispatch('click');
    root.nodes['cancel-provider-delete'].dispatch('click');
    root.nodes['confirm-provider-delete'].dispatch('click');
    assert.equal(requests().some((item) => item.tool === 'provider_delete'), false);
    root.nodes['delete-provider'].dispatch('click'); root.nodes['confirm-provider-delete'].dispatch('click');
    const deletion = latest('provider_delete');
    assert.deepEqual(deletion.args, { provider: 'custom-cloud' });
    root.nodes['confirm-provider-delete'].dispatch('click');
    assert.equal(latest('provider_delete').id, deletion.id);
    reply(deletion, 'PROVIDER_DELETE_FAILED: storage unavailable', false);
    assert.match(root.nodes['connection-status'].textContent, /storage unavailable/);
    assert.match(root.nodes.output.textContent, /storage unavailable/);
    root.nodes['delete-provider'].dispatch('click'); root.nodes['confirm-provider-delete'].dispatch('click');
    reply(latest('provider_delete'), { deleted: 'custom-cloud' });
    reply(latest('provider_list'), [{ id: 'openai', label: 'OpenAI', configured: true }]);
    assert.equal(root.nodes.provider.options.some((item) => item.value === 'custom-cloud'), false);
    assert.ok(latest('workspace_list'));
  } finally {
    (instance?.dispose as (() => void) | undefined)?.call(instance);
    globals.Editor = previousEditor;
    globals.WebSocket = previousWebSocket;
  }
});

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
    assert.equal(fs.readFileSync(panelPath, 'utf8'), fs.readFileSync(path.join(repoRoot, 'examples', 'cocos3d-demo', 'extensions', 'cocos-agent', 'src', 'panel.js'), 'utf8'));
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
    assert.match(panel.template ?? '', /使用模型/);
    assert.doesNotMatch(panel.template ?? '', /id="locale"|cc-switch|fallback-providers|save-workspace/);
    assert.doesNotMatch(panel.template ?? '', /id="mode"/);
    assert.match(panel.template ?? '', /id="permission"/);
    assert.match(panel.template ?? '', /id="confirm-delete"/);
    assert.match(panel.template ?? '', /id="save-provider"/);
    assert.match(panel.template ?? '', /id="api-key" type="password"[^>]*autocomplete="new-password"/);
    assert.match(panel.template ?? '', /id="provider-editor" hidden/);
    assert.match(panel.template ?? '', /id="provider-name"/);
    assert.match(panel.template ?? '', /id="add-provider"/);
    assert.match(panel.template ?? '', /id="edit-provider"/);
    assert.match(panel.template ?? '', /id="cancel-provider"/);
    assert.match(panel.template ?? '', /id="clear-key"/);
    assert.doesNotMatch(panel.template ?? '', /id="custom-api-key"/);
    assert.match(panel.template ?? '', /id="protocol"[^>]*><option value="chat-completions">[^<]*<\/option><option value="responses">/);
    assert.match(panel.template ?? '', /id="settings-toggle"/);
    assert.match(panel.template ?? '', /id="settings"[^>]*hidden/);
    assert.match(panel.template ?? '', /id="activity-toggle"[^>]*aria-expanded="false"/);
    assert.match(panel.template ?? '', /id="activity"[^>]*hidden/);
    assert.match(panel.template ?? '', /id="input"[^>]*Enter 发送，Shift\+Enter 换行/);
    assert.equal(typeof panel.ready, 'function');
    assert.equal(typeof panel.methods?.run, 'function');
    assert.match(fs.readFileSync(panelPath, 'utf8'), /queryPanelElement/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /const panelDefinition =/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /panelDefinition\.methods\[name\]\.apply\(this, args\)/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /\$:\s*\{/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /panelEventRoot/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /bindEvent\(root, 'click'/);
    assert.match(panel.template ?? '', /id="save-provider"/);
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
    const ids = ['output', 'input', 'state', 'provider', 'model', 'endpoint', 'protocol', 'protocol-label', 'credential', 'api-key', 'clear-key', 'provider-name', 'connection-status', 'provider-editor', 'add-provider', 'edit-provider', 'cancel-provider', 'form', 'save-provider', 'select-provider', 'copy-output', 'settings-toggle', 'settings', 'quick-provider', 'activity-toggle', 'activity', 'chat-history', 'new-chat', 'sessions', 'active-model', 'back-chat', 'composer', 'permission', 'permission-confirm', 'confirm-permission', 'cancel-permission', 'delete-provider', 'provider-delete-confirm', 'confirm-provider-delete', 'cancel-provider-delete', 'rollback-confirm', 'confirm-rollback', 'cancel-rollback', 'execution-state', 'history-toggle', 'history-menu', 'delete-chat', 'delete-confirm', 'confirm-delete', 'cancel-delete', 'permission-info'];
    const root = new FakeRoot(ids);
    root.nodes['provider-editor'].hidden = true;
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
    const latest = () => JSON.parse(socket.sent.at(-1)!);
    const reply = (request: { id: number }, result: unknown, ok = true) => socket.onmessage?.({ data: JSON.stringify({ id: request.id, ok, ...(ok ? { result } : { error: result }) }) });
    assert.equal(root.nodes['provider-editor'].hidden, true);
    root.nodes['add-provider'].dispatch('click');
    assert.equal(root.nodes['provider-editor'].hidden, false);
    assert.equal(root.nodes.endpoint.value, 'https://api.openai.com/v1');
    assert.equal(root.nodes.protocol.value, 'chat-completions');
    root.nodes['api-key'].value = 'cancel-secret';
    root.nodes['cancel-provider'].dispatch('click');
    assert.equal(root.nodes['provider-editor'].hidden, true);
    assert.equal(root.nodes['api-key'].value, '');
    root.nodes['add-provider'].dispatch('click');
    root.nodes['provider-name'].value = 'My Cloud';
    root.nodes.endpoint.value = 'https://example.com/v1';
    root.nodes.model.value = 'example-chat';
    root.nodes.protocol.value = 'responses';
    root.nodes['api-key'].value = 'custom-private-token';
    root.nodes['save-provider'].dispatch('click');
    const customRequest = latest();
    assert.equal(customRequest.tool, 'provider_create');
    assert.deepEqual(customRequest.args, { name: 'My Cloud', endpoint: 'https://example.com/v1', model: 'example-chat', protocol: 'responses', apiKey: 'custom-private-token' });
    assert.equal(root.nodes['api-key'].value, '');
    root.nodes['save-provider'].dispatch('click');
    assert.equal(latest().id, customRequest.id, 'busy form cannot submit twice');
    reply(customRequest, 'PROVIDER_HTTP_ERROR: HTTP 401 [redacted] rejected', false);
    assert.match(root.nodes['connection-status'].textContent, /保存失败/);
    assert.doesNotMatch(root.nodes['connection-status'].textContent + root.nodes.output.textContent, /custom-private-token/);
    root.nodes['save-provider'].dispatch('click');
    const saved = latest();
    reply(saved, { id: 'my-cloud' });
    const selectedAfterSave = latest();
    assert.deepEqual({ tool: selectedAfterSave.tool, args: selectedAfterSave.args }, { tool: 'provider_select', args: { provider: 'my-cloud' } });
    reply(selectedAfterSave, { provider: 'my-cloud' });
    assert.equal(root.nodes['provider-editor'].hidden, true);
    assert.equal(root.nodes.provider.value, 'my-cloud');
    assert.match(root.nodes['connection-status'].textContent, /已保存并启用/);
    root.nodes['add-provider'].dispatch('click');
    root.nodes['provider-name'].value = 'Offline';
    root.nodes.model.value = 'offline-model';
    socket.readyState = 3;
    const sentCount = socket.sent.length;
    root.nodes['save-provider'].dispatch('click');
    assert.equal(socket.sent.length, sentCount);
    assert.match(root.nodes['connection-status'].textContent, /未连接/);
    socket.readyState = 1;
    root.nodes['cancel-provider'].dispatch('click');
    socket.onmessage?.({ data: JSON.stringify({ id: 'unexpected', ok: false, error: 'custom-private-token' }) });
    socket.onmessage?.({ data: 'custom-private-token' });
    assert.doesNotMatch(root.nodes.output.textContent, /custom-private-token/);
    const catalog = [
      { id: 'openai', model: 'gpt-4.1', modelProtocol: 'responses', endpoint: '', configured: false, credentialEnvironment: 'OPENAI_API_KEY' },
      { id: 'deepseek', model: 'deepseek-chat', endpoint: '', configured: false, credentialEnvironment: 'DEEPSEEK_API_KEY' },
      { id: 'anthropic', model: 'claude', endpoint: '', configured: false, credentialEnvironment: 'ANTHROPIC_API_KEY' },
      { id: 'gateway', model: 'agent-default', endpoint: 'http://127.0.0.1:9000', configured: false, credentialEnvironment: 'COCOS_AGENT_GATEWAY_TOKEN' },
      { id: 'my-cloud', label: 'My Cloud', model: 'example-chat', modelProtocol: 'responses', endpoint: 'https://example.com/v1', configured: true },
    ];
    reply(socket.sent.map((payload) => JSON.parse(payload)).filter((payload) => payload.tool === 'provider_list').at(-1), catalog);
    assert.ok(root.nodes.provider.options.some((option) => option.value === 'my-cloud'));
    assert.deepEqual(root.nodes.provider.options.map((option) => option.value), ['my-cloud']);
    root.nodes.provider.value = 'my-cloud';
    root.nodes['edit-provider'].dispatch('click');
    assert.equal(root.nodes.protocol.value, 'responses');
    assert.equal(root.nodes['provider-name'].disabled, true);
    assert.match(root.nodes.credential.textContent, /已配置凭据/);
    root.nodes.model.value = 'unsaved-model';
    root.nodes['api-key'].value = 'unsaved-secret';
    const pendingCatalog = socket.sent.map((payload) => JSON.parse(payload)).filter((payload) => payload.tool === 'provider_list').at(-1);
    reply(pendingCatalog, catalog);
    assert.equal(root.nodes.model.value, 'unsaved-model', 'refresh must not overwrite edits');
    for (const item of catalog) Object.assign(item, { saved: true });
    // Configuration may arrive before the catalog on a fresh bridge connection.
    const pendingConfig = socket.sent.map((payload) => JSON.parse(payload)).filter((payload) => payload.tool === 'status').at(-1);
    reply(pendingConfig, { current: { activeProvider: 'my-cloud', fallbackProviders: ['deepseek'], locale: 'zh-CN' } });
    (instance.refresh as (() => void))();
    const reorderedCatalog = socket.sent.map((payload) => JSON.parse(payload)).filter((payload) => payload.tool === 'provider_list').at(-1);
    const reorderedConfig = socket.sent.map((payload) => JSON.parse(payload)).filter((payload) => payload.tool === 'status').at(-1);
    reply(reorderedConfig, { current: { activeProvider: 'my-cloud', fallbackProviders: ['deepseek'], locale: 'zh-CN' } });
    reply(reorderedCatalog, catalog);
    assert.equal(root.nodes.provider.value, 'my-cloud');
    assert.equal(root.nodes['api-key'].value, 'unsaved-secret');
    root.nodes['api-key'].value = '';
    root.nodes['save-provider'].dispatch('click');
    const configured = latest();
    assert.deepEqual(configured.args, { provider: 'my-cloud', model: 'unsaved-model', endpoint: 'https://example.com/v1', protocol: 'responses' });
    reply(configured, { id: 'my-cloud' });
    const selectedEdit = latest();
    assert.equal(selectedEdit.tool, 'provider_select');
    reply(selectedEdit, {});
    root.nodes.provider.value = 'anthropic';
    root.nodes['edit-provider'].dispatch('click');
    assert.equal(root.nodes['protocol-label'].hidden, true);
    assert.equal(root.nodes.protocol.disabled, true);
    root.nodes['save-provider'].dispatch('click');
    const anthropicRequest = latest();
    assert.equal('protocol' in anthropicRequest.args, false);
    reply(anthropicRequest, { id: 'anthropic' });
    reply(latest(), {});
    root.nodes.provider.value = 'gateway';
    root.nodes['edit-provider'].dispatch('click');
    root.nodes['save-provider'].dispatch('click');
    const gatewayRequest = latest();
    assert.equal(gatewayRequest.args.endpoint, 'http://127.0.0.1:9000');
    assert.equal('protocol' in gatewayRequest.args, false);
    reply(gatewayRequest, { id: 'gateway' });
    reply(latest(), {});
    root.nodes.provider.value = 'my-cloud';
    root.nodes['edit-provider'].dispatch('click');
    root.nodes['api-key'].value = 'unsaved-token';
    root.nodes['clear-key'].dispatch('click');
    const cleared = latest();
    assert.deepEqual({ tool: cleared.tool, args: cleared.args }, { tool: 'provider_credential_clear', args: { provider: 'my-cloud' } });
    assert.equal(root.nodes['api-key'].value, '');
    reply(cleared, { id: 'my-cloud' });
    root.nodes['cancel-provider'].dispatch('click');
    root.nodes.provider.value = 'openai';
    root.nodes['select-provider'].dispatch('click');
    const selected = latest();
    assert.deepEqual({ tool: selected.tool, args: selected.args }, { tool: 'provider_select', args: { provider: 'openai' } });
    reply(selected, 'PROVIDER_HTTP_ERROR: HTTP 503 upstream unavailable', false);
    assert.match(root.nodes['connection-status'].textContent, /切换失败/);
    assert.doesNotMatch(root.nodes['connection-status'].textContent, /secret/);
    instance.$ = { ...mapped, provider: null };
    assert.doesNotThrow(() => socket.onmessage?.({ data: JSON.stringify({ id: 1, ok: true, result: catalog }) }));
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
