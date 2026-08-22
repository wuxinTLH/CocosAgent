'use strict';

function queryPanelElement(panel, id) {
  const roots = [panel.shadowRoot, panel.$el, panel.element, panel.root, typeof document !== 'undefined' ? document : null].filter(Boolean);
  if (typeof panel.$ === 'function') {
    try {
      const mapped = panel.$(`#${id}`) || panel.$(id);
      if (mapped) return mapped;
    } catch {}
  } else if (panel.$ && typeof panel.$ === 'object') {
    const mapped = panel.$[id] || panel.$[`#${id}`];
    if (mapped) return mapped;
  }
  for (const root of roots) {
    if (typeof root.getElementById === 'function') {
      const found = root.getElementById(id);
      if (found) return found;
    }
    if (typeof root.querySelector === 'function') {
      const found = root.querySelector(`#${id}`);
      if (found) return found;
    }
  }
  return null;
}

function bindPanelEvent(panel, id, event, handler) {
  const element = queryPanelElement(panel, id);
  if (!element || typeof element.addEventListener !== 'function') return null;
  element.addEventListener(event, handler);
  return element;
}

function panelEventRoot(panel) {
  return panel.shadowRoot || panel.$el || panel.element || panel.root || null;
}

function eventTargetId(event) {
  const target = event && event.target;
  if (!target) return '';
  if (target.id) return target.id;
  if (typeof target.closest === 'function') {
    const button = target.closest('button');
    return button ? button.id : '';
  }
  return '';
}

const BRIDGE_URL = 'ws://127.0.0.1:8899/ws';

function commandFor(line) {
  const parts = line.trim().split(/\s+/);
  const head = parts.shift() || '';
  const rest = parts;
  const aliases = {
    status: ['status', {}],
    hash: ['task_hash', { request: rest.join(' ') }],
    'scene read': ['scene_read', { path: rest[0] || '' }],
    'scene nodes': ['scene_nodes', { path: rest[0] || '' }],
    'assets find': ['asset_find', { query: rest.join(' ') }],
    'ccs doctor': ['ccs_resolve', {}],
    providers: ['provider_list', {}],
    sessions: ['workspace_list', {}],
    skills: ['skills_list', {}],
    mcp: ['mcp_status', {}],
    'animation optimize': ['animation_optimize', { path: rest[1] || '' }],
    'animation analyze': ['animation_analyze', { path: rest[1] || '' }],
  };
  if (head === 'chat') return { tool: 'workspace_chat', args: { chat: rest.join(' ') } };
  if (head === 'math' && rest[0] === 'analyze') return { tool: 'math_analyze', args: { path: rest[1] || undefined } };
  if (head === 'session' && rest[0] === 'new') return { tool: 'workspace_create', args: { name: rest.slice(1).join(' ') } };
  if (head === 'session' && rest[0] === 'switch') return { tool: 'workspace_switch', args: { id: rest[1] || '' } };
  if (head === 'provider' && rest[0] === 'select') return { tool: 'provider_select', args: { provider: rest[1] || '' } };
  if (head === 'locale') return { tool: 'agent_config', args: { locale: rest[0] || '' } };
  if (head === 'permission') return { tool: 'agent_config', args: { permissionMode: rest[0] || '' } };
  if (head === 'terminal') return { tool: 'terminal_run', args: { shell: rest[0] || '', command: rest.slice(1).join(' ') } };
  const selected = aliases[`${head} ${rest[0] || ''}`] || aliases[head] || [head, {}];
  return { tool: selected[0], args: selected[1] };
}

const panelDefinition = {
  template: `
    <div class="agent-overlay">
      <div class="agent-overlay__bar"><strong>Cocos Agent</strong><span id="state">offline</span><button id="close" title="Close overlay">x</button></div>
      <div id="output" class="agent-overlay__output"></div>
      <form id="form" class="agent-overlay__form"><input id="input" autocomplete="off" placeholder="chat 你好" /><button title="Run command">Run</button></form>
    </div>
  `,
  style: `
    :host { background: transparent; overflow: hidden; }
    .agent-overlay { position: relative; display: flex; flex-direction: column; width: 100%; height: 100%; color: #e7edf5; background: rgba(18, 24, 32, .97); border: 1px solid #4b6075; box-shadow: 0 12px 36px rgba(0, 0, 0, .42); font: 13px Consolas, monospace; }
    .agent-overlay__bar { display: flex; align-items: center; gap: 10px; padding: 9px 11px; background: #243342; border-bottom: 1px solid #4b6075; }
    .agent-overlay__bar strong { color: #7ed6ff; }
    .agent-overlay__bar span { flex: 1; color: #9fb2c3; }
    .agent-overlay__bar button { color: #d8e2ed; background: transparent; border: 0; cursor: pointer; font-weight: 700; }
    .agent-overlay__output { flex: 1; overflow: auto; padding: 10px; white-space: pre-wrap; }
    .agent-overlay__form { display: flex; gap: 8px; padding: 9px; border-top: 1px solid #4b6075; }
    .agent-overlay__form input { flex: 1; min-width: 0; color: #e7edf5; background: #111820; border: 1px solid #526b81; padding: 7px 8px; outline: none; }
    .agent-overlay__form button { color: #071018; background: #7ed6ff; border: 0; padding: 0 13px; cursor: pointer; font-weight: 700; }
  `,
  ready() {
    // Creator may invoke lifecycle callbacks with a panel instance that does
    // not inherit methods from this definition object.
    for (const name of ['bindElements', 'close', 'connect', 'run', 'append']) {
      this[name] = (...args) => panelDefinition[name].apply(this, args);
    }
    this.ws = null;
    this.messageId = 0;
    this.eventsBound = false;
    this.bindAttempts = 0;
    this.getElement = (id) => queryPanelElement(this, id);
    this.output = this.getElement('output');
    this.input = this.getElement('input');
    this.state = this.getElement('state');
    this.bindElements();
    this.append('overlay ready');
    this.connect();
  },
  bindElements() {
    const form = this.getElement('form');
    const close = this.getElement('close');
    const output = this.getElement('output');
    const input = this.getElement('input');
    const state = this.getElement('state');
    if (form && close && output && input && state && typeof form.addEventListener === 'function' && typeof close.addEventListener === 'function') {
      this.output = output;
      this.input = input;
      this.state = state;
      const root = panelEventRoot(this);
      if (root && typeof root.addEventListener === 'function') {
        root.addEventListener('click', (event) => { if (eventTargetId(event) === 'close') { event.preventDefault(); this.close(); } });
        root.addEventListener('submit', (event) => { if (event.target?.id === 'form') { event.preventDefault(); this.run(); } });
      } else {
        bindPanelEvent(this, 'form', 'submit', (event) => { event.preventDefault(); this.run(); });
        bindPanelEvent(this, 'close', 'click', () => this.close());
      }
      this.eventsBound = true;
      return true;
    }
    this.bindAttempts += 1;
    if (this.bindAttempts < 40) setTimeout(() => this.bindElements(), 50);
    else if (typeof console !== 'undefined' && typeof console.warn === 'function') console.warn('[overlay] template elements were not mounted');
    return false;
  },
  close() {
    if (this.ws) this.ws.close();
    if (typeof Editor !== 'undefined' && Editor.Panel) Editor.Panel.close('cocos-agent.overlay');
  },
  connect() {
    try {
      this.ws = new WebSocket(BRIDGE_URL);
      this.ws.onopen = () => { if (this.state) this.state.textContent = 'online'; };
      this.ws.onmessage = (event) => this.append(event.data);
      this.ws.onclose = () => { if (this.state) this.state.textContent = 'offline'; };
    } catch (error) { this.append(`[bridge] ${error.message}`); }
  },
  run() {
    const line = this.input.value.trim();
    if (!line) return;
    this.input.value = '';
    this.append(`> ${line}`);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.append('[bridge] offline'); return; }
    const command = commandFor(line);
    this.messageId += 1;
    this.ws.send(JSON.stringify({ type: 'tool', id: this.messageId, tool: command.tool, args: command.args }));
  },
  append(value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    if (!this.output) return;
    this.output.textContent += `${text}\n`;
    this.output.scrollTop = this.output.scrollHeight;
  },
};

module.exports = Editor.Panel.define(panelDefinition);
