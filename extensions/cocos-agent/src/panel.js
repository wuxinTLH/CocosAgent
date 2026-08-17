'use strict';

const BRIDGE_URL = 'ws://127.0.0.1:8899/ws';

function parseCommand(line) {
  const parts = line.trim().split(/\s+/);
  const head = parts[0] || '';
  const rest = parts.slice(1);
  const map = {
    status: { tool: 'status', args: {} },
    hash: { tool: 'task_hash', args: { request: rest.join(' ') } },
    'scene read': { tool: 'scene_read', args: { path: rest[0] || '' } },
    'scene nodes': { tool: 'scene_nodes', args: { path: rest[0] || '' } },
    'assets find': { tool: 'asset_find', args: { query: rest.join(' ') } },
    'ccs resolve': { tool: 'ccs_resolve', args: {} },
    'ccs connect': { tool: 'ccs_connect', args: {} },
    providers: { tool: 'provider_list', args: {} },
    sessions: { tool: 'workspace_list', args: {} },
    skills: { tool: 'skills_list', args: {} },
    mcp: { tool: 'mcp_status', args: {} },
  };
  const twoWords = `${head} ${rest[0] || ''}`;
  if (map[twoWords]) {
    const command = map[twoWords];
    return {
      tool: command.tool,
      args: command.args,
    };
  }
  if (head === 'chat') return { tool: 'workspace_chat', args: { chat: rest.join(' ') } };
  if (head === 'session' && rest[0] === 'new') return { tool: 'workspace_create', args: { name: rest.slice(1).join(' ') } };
  if (head === 'session' && rest[0] === 'switch') return { tool: 'workspace_switch', args: { id: rest[1] || '' } };
  if (head === 'provider' && rest[0] === 'select') return { tool: 'provider_select', args: { provider: rest[1] || '' } };
  if (head === 'locale') return { tool: 'agent_config', args: { locale: rest[0] || '' } };
  if (head === 'permission') return { tool: 'agent_config', args: { permissionMode: rest[0] || '' } };
  if (head === 'terminal') return { tool: 'terminal_run', args: { shell: rest[0] || '', command: rest.slice(1).join(' ') } };
  if (map[head]) {
    return map[head];
  }
  return { tool: head, args: {} };
}

module.exports = Editor.Panel.define({
  template: `
    <div style="display:flex;flex-direction:column;height:100%;background:#1e1e1e;color:#d4d4d4;font-family:Consolas,monospace;font-size:13px;">
      <div id="output" style="flex:1;overflow:auto;padding:8px;white-space:pre-wrap;"></div>
      <div style="display:flex;border-top:1px solid #333333;">
        <input id="input" type="text" placeholder="cocos-agent> status" style="flex:1;background:#252526;border:none;color:#d4d4d4;padding:8px;outline:none;" />
        <button id="send" style="background:#0e639c;border:none;color:#ffffff;padding:8px 14px;cursor:pointer;">发送</button>
      </div>
    </div>
  `,
  ready() {
    this.messageId = 0;
    this.output = document.getElementById('output');
    this.input = document.getElementById('input');
    this.sendButton = document.getElementById('send');
    this.connect();
    this.sendButton.addEventListener('click', () => this.run());
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.run();
      }
    });
    this.append('Cocos Agent CLI ready. Input: status | providers | sessions | chat <text> | provider select <id> | locale <id> | permission <mode>');
  },
  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  },
  connect() {
    try {
      this.ws = new WebSocket(BRIDGE_URL);
      this.ws.onmessage = (event) => this.append(event.data);
      this.ws.onclose = () => {
        this.append('[bridge] disconnected, retrying in 3s');
        setTimeout(() => this.connect(), 3000);
      };
    } catch (error) {
      this.append(`[bridge] ${error.message}`);
      setTimeout(() => this.connect(), 3000);
    }
  },
  run() {
    const line = this.input.value;
    if (!line.trim()) {
      return;
    }
    this.input.value = '';
    this.append(`> ${line}`);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.append('[bridge] not connected');
      return;
    }
    const command = parseCommand(line);
    this.messageId += 1;
    this.ws.send(
      JSON.stringify({
        type: 'tool',
        id: this.messageId,
        tool: command.tool,
        args: command.args,
      }),
    );
  },
  append(text) {
    const formatted = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    this.output.textContent += `${formatted}\n`;
    this.output.scrollTop = this.output.scrollHeight;
  },
});
