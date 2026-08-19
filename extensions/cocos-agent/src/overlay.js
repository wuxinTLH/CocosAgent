'use strict';

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
  if (head === 'session' && rest[0] === 'new') return { tool: 'workspace_create', args: { name: rest.slice(1).join(' ') } };
  if (head === 'session' && rest[0] === 'switch') return { tool: 'workspace_switch', args: { id: rest[1] || '' } };
  if (head === 'provider' && rest[0] === 'select') return { tool: 'provider_select', args: { provider: rest[1] || '' } };
  if (head === 'locale') return { tool: 'agent_config', args: { locale: rest[0] || '' } };
  if (head === 'permission') return { tool: 'agent_config', args: { permissionMode: rest[0] || '' } };
  if (head === 'terminal') return { tool: 'terminal_run', args: { shell: rest[0] || '', command: rest.slice(1).join(' ') } };
  const selected = aliases[`${head} ${rest[0] || ''}`] || aliases[head] || [head, {}];
  return { tool: selected[0], args: selected[1] };
}

module.exports = Editor.Panel.define({
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
    this.ws = null;
    this.messageId = 0;
    this.output = document.getElementById('output');
    this.input = document.getElementById('input');
    this.state = document.getElementById('state');
    document.getElementById('form').addEventListener('submit', (event) => { event.preventDefault(); this.run(); });
    document.getElementById('close').addEventListener('click', () => this.close());
    this.append('overlay ready');
    this.connect();
  },
  close() {
    if (this.ws) this.ws.close();
    if (typeof Editor !== 'undefined' && Editor.Panel) Editor.Panel.close('cocos-agent.overlay');
  },
  connect() {
    try {
      this.ws = new WebSocket(BRIDGE_URL);
      this.ws.onopen = () => { this.state.textContent = 'online'; };
      this.ws.onmessage = (event) => this.append(event.data);
      this.ws.onclose = () => { this.state.textContent = 'offline'; };
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
    this.output.textContent += `${text}\n`;
    this.output.scrollTop = this.output.scrollHeight;
  },
});
