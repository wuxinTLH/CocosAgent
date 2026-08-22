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
  if (!element || typeof element.addEventListener !== 'function') {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') console.warn(`[panel] missing element: #${id}`);
    return null;
  }
  element.addEventListener(event, handler);
  return element;
}

const BRIDGE_URL = 'ws://127.0.0.1:8899/ws';

function parseCommand(line) {
  const parts = line.trim().split(/\s+/);
  const head = parts[0] || '';
  const rest = parts.slice(1);
  const map = {
    status: { tool: 'status', args: {} },
    providers: { tool: 'provider_list', args: {} },
    sessions: { tool: 'workspace_list', args: {} },
    skills: { tool: 'skills_list', args: {} },
    mcp: { tool: 'mcp_status', args: {} },
    'ccs doctor': { tool: 'ccs_doctor', args: {} },
    'ccs connect': { tool: 'ccs_connect', args: { route: rest[1] || '' } },
  };
  const twoWords = `${head} ${rest[0] || ''}`;
  if (map[twoWords]) return map[twoWords];
  if (head === 'chat') return { tool: 'workspace_chat', args: { chat: rest.join(' ') } };
  if (head === 'math' && rest[0] === 'analyze') return { tool: 'math_analyze', args: { path: rest[1] || undefined } };
  if (head === 'provider' && rest[0] === 'select') return { tool: 'provider_select', args: { provider: rest[1] || '' } };
  if (head === 'terminal') return { tool: 'terminal_run', args: { shell: rest[0] || '', command: rest.slice(1).join(' ') } };
  return map[head] || { tool: head, args: {} };
}

const panelDefinition = {
  template: `
    <div class="agent-cli">
      <header class="agent-cli__header"><strong>Cocos Agent</strong><span id="state">offline</span></header>
      <section class="agent-cli__config">
        <div class="agent-cli__section-title">模型渠道</div>
        <label class="agent-cli__locale">界面语言<select id="locale"><option value="zh-CN">简体中文</option><option value="en-US">English</option></select></label>
        <div class="agent-cli__grid">
          <label>提供商<select id="provider"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="deepseek">DeepSeek</option><option value="kimi">Kimi</option><option value="qwen">Qwen</option><option value="gateway">Cocos Agent Gateway</option></select></label>
          <label>模型<input id="model" type="text" autocomplete="off" /></label>
          <label class="agent-cli__wide">端点<input id="endpoint" type="text" autocomplete="off" placeholder="使用提供商默认端点" /></label>
        </div>
        <div class="agent-cli__actions"><button id="save-provider">保存渠道</button><button id="select-provider">使用渠道</button><span id="credential"></span></div>
        <div class="agent-cli__section-title">工作区</div>
        <div class="agent-cli__grid">
          <label>默认渠道<select id="active-provider"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="deepseek">DeepSeek</option><option value="kimi">Kimi</option><option value="qwen">Qwen</option><option value="gateway">Cocos Agent Gateway</option></select></label>
          <label class="agent-cli__wide">回退渠道<select id="fallback-providers" multiple size="2"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="deepseek">DeepSeek</option><option value="kimi">Kimi</option><option value="qwen">Qwen</option><option value="gateway">Cocos Agent Gateway</option></select></label>
        </div>
        <div class="agent-cli__actions"><button id="save-workspace">保存工作区</button></div>
        <div class="agent-cli__section-title">cc-switch / ccs</div>
        <div class="agent-cli__grid"><label class="agent-cli__wide">路由<input id="ccs-route" type="text" autocomplete="off" placeholder="当前 cc-switch 路由" /></label></div>
        <div class="agent-cli__actions"><button id="ccs-doctor">检查 cc-switch</button><button id="ccs-connect">连接路由</button><span id="ccs-state"></span></div>
      </section>
      <section id="output" class="agent-cli__output"></section>
      <form id="form" class="agent-cli__command"><input id="input" autocomplete="off" placeholder="chat 你好 | status | ccs doctor" /><button title="Run command">Run</button></form>
    </div>
  `,
  style: `
    :host { display:block; height:100%; overflow:hidden; background:#171b21; }
    .agent-cli { display:flex; flex-direction:column; height:100%; color:#dfe6ee; background:#171b21; font:13px Consolas, monospace; }
    .agent-cli__header { display:flex; align-items:center; gap:10px; min-height:34px; padding:0 10px; background:#25313c; border-bottom:1px solid #455767; }
    .agent-cli__header strong { color:#7ed6ff; } .agent-cli__header span { color:#aab8c5; }
    .agent-cli__config { padding:10px; border-bottom:1px solid #455767; background:#202831; }
    .agent-cli__section-title { margin:0 0 6px; color:#9fb8ce; font-weight:700; }
    .agent-cli__section-title:not(:first-child) { margin-top:10px; }
    .agent-cli__grid { display:grid; grid-template-columns:minmax(140px, 1fr) minmax(180px, 2fr); gap:7px 10px; }
    .agent-cli__grid label { display:flex; flex-direction:column; gap:4px; min-width:0; color:#aab8c5; } .agent-cli__wide { grid-column:1 / -1; }
    .agent-cli input, .agent-cli select { box-sizing:border-box; width:100%; min-height:28px; color:#eaf2f8; background:#12181e; border:1px solid #506474; padding:4px 6px; outline:none; font:inherit; }
    .agent-cli select[multiple] { min-height:52px; }
    .agent-cli__actions { display:flex; align-items:center; gap:7px; margin-top:7px; flex-wrap:wrap; }
    .agent-cli button { min-height:28px; color:#061018; background:#7ed6ff; border:0; padding:4px 10px; cursor:pointer; font:inherit; font-weight:700; }
    .agent-cli button:hover { background:#a1e2ff; } .agent-cli__actions span { color:#aab8c5; overflow-wrap:anywhere; }
    .agent-cli__output { flex:1; min-height:90px; overflow:auto; padding:9px 10px; white-space:pre-wrap; background:#171b21; }
    .agent-cli__command { display:flex; gap:7px; margin:0; padding:8px 10px; border-top:1px solid #455767; background:#202831; }
    .agent-cli__command input { flex:1; min-width:0; }
  `,
  ready() {
    // Creator may invoke lifecycle callbacks with a panel instance that does
    // not inherit methods from this definition object.
    for (const name of ['connect', 'request', 'handleMessage', 'refresh', 'showProvider', 'saveProvider', 'selectProvider', 'saveWorkspace', 'ccsDoctor', 'ccsConnect', 'run', 'append']) {
      this[name] = (...args) => panelDefinition[name].apply(this, args);
    }
    this.messageId = 0;
    this.pending = new Map();
    this.providers = [];
    this.getElement = (id) => queryPanelElement(this, id);
    this.output = this.getElement('output');
    this.input = this.getElement('input');
    this.state = this.getElement('state');
    this.provider = this.getElement('provider');
    this.model = this.getElement('model');
    this.endpoint = this.getElement('endpoint');
    this.credential = this.getElement('credential');
    this.activeProvider = this.getElement('active-provider');
    this.fallbackProviders = this.getElement('fallback-providers');
    this.ccsRoute = this.getElement('ccs-route');
    this.ccsState = this.getElement('ccs-state');
    bindPanelEvent(this, 'form', 'submit', (event) => { event.preventDefault(); this.run(); });
    bindPanelEvent(this, 'provider', 'change', () => this.showProvider(this.provider?.value));
    bindPanelEvent(this, 'save-provider', 'click', () => this.saveProvider());
    bindPanelEvent(this, 'select-provider', 'click', () => this.selectProvider());
    bindPanelEvent(this, 'save-workspace', 'click', () => this.saveWorkspace());
    bindPanelEvent(this, 'ccs-doctor', 'click', () => this.ccsDoctor());
    bindPanelEvent(this, 'ccs-connect', 'click', () => this.ccsConnect());
    this.connect();
  },
  connect() {
    try {
      this.ws = new WebSocket(BRIDGE_URL);
      this.ws.onopen = () => { if (this.state) this.state.textContent = 'online'; this.refresh(); };
      this.ws.onmessage = (event) => this.handleMessage(event.data);
      this.ws.onclose = () => { if (this.state) this.state.textContent = 'offline'; setTimeout(() => this.connect(), 3000); };
    } catch (error) { this.append(`[bridge] ${error.message}`); setTimeout(() => this.connect(), 3000); }
  },
  request(tool, args, callback) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.append('[bridge] not connected'); return; }
    this.messageId += 1;
    if (callback) this.pending.set(this.messageId, callback);
    this.ws.send(JSON.stringify({ type:'tool', id:this.messageId, tool, args }));
  },
  handleMessage(raw) {
    let message;
    try { message = JSON.parse(raw); } catch { this.append(raw); return; }
    const callback = this.pending.get(message.id);
    if (callback) { this.pending.delete(message.id); callback(message); return; }
    this.append(message.ok ? message.result : `[error] ${message.error}`);
  },
  refresh() {
    this.request('provider_list', {}, (message) => {
      if (!message.ok) { this.append(`[provider] ${message.error}`); return; }
      this.providers = Array.isArray(message.result) ? message.result : [];
      const selected = this.providers.find((item) => item.id === this.provider.value) || this.providers[0];
      if (selected) { this.provider.value = selected.id; this.showProvider(selected.id); }
    });
    this.request('agent_config', {}, (message) => {
      if (!message.ok) { this.append(`[workspace] ${message.error}`); return; }
      const config = message.result.current || message.result;
      if (!config || !config.activeProvider) return;
      const locale = this.getElement('locale');
      if (locale) locale.value = config.locale || 'zh-CN';
      this.activeProvider.value = config.activeProvider;
      for (const option of this.fallbackProviders.options) option.selected = (config.fallbackProviders || []).includes(option.value);
    });
    this.ccsDoctor();
  },
  showProvider(id) {
    const provider = this.providers.find((item) => item.id === id);
    if (!provider) return;
    this.model.value = provider.model || '';
    this.endpoint.value = provider.endpoint || '';
    this.credential.textContent = provider.configured ? `Credential available: ${provider.credentialEnvironment}` : `Set environment variable: ${provider.credentialEnvironment}`;
  },
  saveProvider() {
    this.request('provider_configure', { provider:this.provider.value, model:this.model.value.trim(), endpoint:this.endpoint.value.trim() }, (message) => {
      this.append(message.ok ? { provider:this.provider.value, saved:true } : `[provider] ${message.error}`);
      if (message.ok) this.refresh();
    });
  },
  selectProvider() {
    this.request('provider_select', { provider:this.provider.value }, (message) => this.append(message.ok ? { provider:this.provider.value, selected:true } : `[provider] ${message.error}`));
  },
  saveWorkspace() {
    const fallbacks = Array.from(this.fallbackProviders.selectedOptions).map((option) => option.value).filter((id) => id !== this.activeProvider.value);
    this.request('agent_config', { locale:this.getElement('locale')?.value || 'zh-CN', activeProvider:this.activeProvider.value, fallbackProviders:fallbacks }, (message) => this.append(message.ok ? { workspace:'saved', activeProvider:this.activeProvider.value, fallbackProviders:fallbacks } : `[workspace] ${message.error}`));
  },
  ccsDoctor() {
    this.request('ccs_doctor', {}, (message) => {
      if (!message.ok) { this.ccsState.textContent = message.error; return; }
      const checks = message.result.checks || {};
      const config = checks.ccSwitchConfig || {};
      if (message.result.route && message.result.route.route) this.ccsRoute.value = message.result.route.route;
      this.ccsState.textContent = config.ok ? `Config: ${config.path}` : `cc-switch config missing: ${config.path}`;
      this.append({ ccs:message.result });
    });
  },
  ccsConnect() {
    this.request('ccs_connect', { route:this.ccsRoute.value.trim() }, (message) => this.append(message.ok ? { ccs:message.result } : `[ccs] ${message.error}`));
  },
  run() {
    const line = this.input.value.trim();
    if (!line) return;
    this.input.value = '';
    this.append(`> ${line}`);
    const command = parseCommand(line);
    this.request(command.tool, command.args);
  },
  append(value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    if (!this.output) return;
    this.output.textContent += `${text}\n`;
    this.output.scrollTop = this.output.scrollHeight;
  },
};

module.exports = Editor.Panel.define(panelDefinition);
