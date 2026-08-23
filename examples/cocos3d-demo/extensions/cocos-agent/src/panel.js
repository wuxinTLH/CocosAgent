'use strict';

function queryPanelElement(panel, id) {
  const roots = [panel.shadowRoot, panel.$el, panel.element, panel.root].filter(Boolean);
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
  $: {
    output: '#output', input: '#input', state: '#state', locale: '#locale', provider: '#provider', model: '#model', endpoint: '#endpoint', credential: '#credential',
    'active-provider': '#active-provider', 'fallback-providers': '#fallback-providers', 'ccs-route': '#ccs-route', 'ccs-state': '#ccs-state', form: '#form',
    'save-provider': '#save-provider', 'select-provider': '#select-provider', 'save-workspace': '#save-workspace', 'ccs-doctor': '#ccs-doctor', 'ccs-connect': '#ccs-connect',
  },
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
    for (const name of ['bindElements', 'bindEvent', 'removeEventBindings', 'scheduleBind', 'currentElement', 'reportUnavailable', 'connect', 'scheduleReconnect', 'request', 'handleMessage', 'refresh', 'showProvider', 'saveProvider', 'selectProvider', 'saveWorkspace', 'ccsDoctor', 'ccsConnect', 'run', 'append', 'dispose', 'beforeClose', 'close']) {
      this[name] = (...args) => panelDefinition[name].apply(this, args);
    }
    this.messageId = 0;
    this.pending = new Map();
    this.providers = [];
    this.eventsBound = false;
    this.destroyed = false;
    this.panelClosed = false;
    this.bindTimer = null;
    this.reconnectTimer = null;
    this.eventRoot = null;
    this.eventBindings = [];
    this.bindAttempts = 0;
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
    this.bindElements();
    this.connect();
  },
  bindElements() {
    if (this.destroyed) return false;
    const ids = ['output', 'input', 'state', 'provider', 'model', 'endpoint', 'credential', 'active-provider', 'fallback-providers', 'ccs-route', 'ccs-state', 'form', 'save-provider', 'select-provider', 'save-workspace', 'ccs-doctor', 'ccs-connect'];
    const elements = Object.fromEntries(ids.map((id) => [id, this.getElement(id)]));
    const ready = ids.every((id) => elements[id] && (id === 'output' || typeof elements[id].addEventListener === 'function'));
    const root = panelEventRoot(this);
    if (ready && (!this.eventsBound || this.eventRoot !== root)) {
      this.removeEventBindings();
      this.output = elements.output;
      this.input = elements.input;
      this.state = elements.state;
      this.provider = elements.provider;
      this.model = elements.model;
      this.endpoint = elements.endpoint;
      this.credential = elements.credential;
      this.activeProvider = elements['active-provider'];
      this.fallbackProviders = elements['fallback-providers'];
      this.ccsRoute = elements['ccs-route'];
      this.ccsState = elements['ccs-state'];
        this.bindEvent(elements.form, 'submit', (event) => { event.preventDefault(); this.run(); });
        this.bindEvent(elements['save-provider'], 'click', (event) => { event.preventDefault(); this.saveProvider(); });
        this.bindEvent(elements['select-provider'], 'click', (event) => { event.preventDefault(); this.selectProvider(); });
        this.bindEvent(elements['save-workspace'], 'click', (event) => { event.preventDefault(); this.saveWorkspace(); });
        this.bindEvent(elements['ccs-doctor'], 'click', (event) => { event.preventDefault(); this.ccsDoctor(); });
        this.bindEvent(elements['ccs-connect'], 'click', (event) => { event.preventDefault(); this.ccsConnect(); });
        this.bindEvent(elements.provider, 'change', () => this.showProvider(this.getElement('provider')?.value));
        if (!this.eventBindings.length && root && typeof root.addEventListener === 'function') {
          this.bindEvent(root, 'click', (event) => {
            const actions = { 'save-provider': () => this.saveProvider(), 'select-provider': () => this.selectProvider(), 'save-workspace': () => this.saveWorkspace(), 'ccs-doctor': () => this.ccsDoctor(), 'ccs-connect': () => this.ccsConnect() };
            const action = actions[eventTargetId(event)];
            if (action) { event.preventDefault(); action(); }
          });
          this.bindEvent(root, 'submit', (event) => { if (event.target?.id === 'form') { event.preventDefault(); this.run(); } });
        }
       this.eventRoot = root;
       this.eventsBound = true;
       return true;
    }
    this.bindAttempts += 1;
    if (this.bindAttempts < 40) this.scheduleBind();
    else if (typeof console !== 'undefined' && typeof console.warn === 'function') console.warn('[panel] template elements were not mounted');
    return false;
  },
  scheduleBind() {
    if (this.destroyed || this.bindTimer) return;
    this.bindTimer = setTimeout(() => { this.bindTimer = null; this.bindElements(); }, 50);
  },
  bindEvent(element, event, handler) {
    if (!element || typeof element.addEventListener !== 'function') return null;
    element.addEventListener(event, handler);
    this.eventBindings.push([element, event, handler]);
    return element;
  },
  removeEventBindings() {
    for (const [element, event, handler] of this.eventBindings || []) {
      if (typeof element.removeEventListener === 'function') element.removeEventListener(event, handler);
    }
    this.eventBindings = [];
    this.eventsBound = false;
    this.eventRoot = null;
  },
  currentElement(id) {
    if (this.destroyed) return null;
    return this.getElement(id);
  },
  reportUnavailable(area) {
    if (this.destroyed) return;
    const message = `[panel] ${area} is unavailable; reopen the Cocos Agent panel`;
    const state = this.getElement('state');
    if (state) state.textContent = message;
    this.append(message);
  },
  connect() {
    if (this.destroyed) return;
    try {
      const socket = new WebSocket(BRIDGE_URL);
      this.ws = socket;
      socket.onopen = () => { if (this.destroyed || this.ws !== socket) return; const state = this.currentElement('state'); if (state) state.textContent = 'online'; this.refresh(); };
      socket.onmessage = (event) => { if (!this.destroyed && this.ws === socket) this.handleMessage(event.data); };
      socket.onclose = () => { if (this.ws !== socket) return; this.ws = null; const state = this.currentElement('state'); if (state) state.textContent = 'offline'; this.scheduleReconnect(); };
    } catch (error) { this.append(`[bridge] ${error.message}`); this.scheduleReconnect(); }
  },
  scheduleReconnect() {
    if (this.destroyed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; this.connect(); }, 3000);
  },
  dispose() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.bindTimer) clearTimeout(this.bindTimer);
    this.bindTimer = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.removeEventBindings();
    if (this.pending) this.pending.clear();
    const socket = this.ws;
    this.ws = null;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      try { socket.close(); } catch {}
    }
  },
  beforeClose() {
    this.dispose();
  },
  request(tool, args, callback) {
    if (this.destroyed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.append('[bridge] offline; start the local bridge and retry'); return; }
    this.messageId += 1;
    if (callback) this.pending.set(this.messageId, callback);
    this.ws.send(JSON.stringify({ type:'tool', id:this.messageId, tool, args }));
  },
  handleMessage(raw) {
    let message;
    try { message = JSON.parse(raw); } catch { this.append(raw); return; }
    if (!message || typeof message !== 'object') { this.append(String(raw)); return; }
    const callback = this.pending.get(message.id);
    if (callback) { this.pending.delete(message.id); try { callback(message); } catch (error) { this.append(`[panel] response handling failed: ${error.message}`); } return; }
    this.append(message.ok ? message.result : `[error] ${message.error}`);
  },
  refresh() {
    this.request('provider_list', {}, (message) => {
      if (!message.ok) { this.append(`[provider] ${message.error}`); return; }
      this.providers = Array.isArray(message.result) ? message.result : [];
      const provider = this.currentElement('provider');
      const selected = this.providers.find((item) => item.id === provider?.value) || this.providers[0];
      if (selected && provider) { provider.value = selected.id; this.showProvider(selected.id); }
      else if (!provider) this.reportUnavailable('provider controls');
    });
    this.request('agent_config', {}, (message) => {
      if (!message.ok) { this.append(`[workspace] ${message.error}`); return; }
      const result = message.result && typeof message.result === 'object' ? message.result : {};
      const config = result.current || result;
      if (!config || !config.activeProvider) return;
      const locale = this.getElement('locale');
      if (locale) locale.value = config.locale || 'zh-CN';
      const activeProvider = this.currentElement('active-provider');
      const fallbackProviders = this.currentElement('fallback-providers');
      if (!activeProvider || !fallbackProviders) { this.reportUnavailable('workspace controls'); return; }
      activeProvider.value = config.activeProvider;
      for (const option of fallbackProviders.options) option.selected = (config.fallbackProviders || []).includes(option.value);
    });
    this.ccsDoctor();
  },
  showProvider(id) {
    const provider = this.providers.find((item) => item.id === id);
    if (!provider) return;
    const model = this.currentElement('model');
    const endpoint = this.currentElement('endpoint');
    const credential = this.currentElement('credential');
    if (!model || !endpoint || !credential) { this.reportUnavailable('provider controls'); return; }
    model.value = provider.model || '';
    endpoint.value = provider.endpoint || '';
    credential.textContent = provider.configured ? `Credential available: ${provider.credentialEnvironment}` : `Set environment variable: ${provider.credentialEnvironment}`;
  },
  saveProvider() {
    const provider = this.currentElement('provider');
    const model = this.currentElement('model');
    const endpoint = this.currentElement('endpoint');
    if (!provider || !model || !endpoint) { this.reportUnavailable('provider controls'); return; }
    const providerId = provider.value;
    this.request('provider_configure', { provider:providerId, model:model.value.trim(), endpoint:endpoint.value.trim() }, (message) => {
      this.append(message.ok ? { provider:providerId, saved:true } : `[provider] ${message.error}`);
      if (message.ok) this.refresh();
    });
  },
  selectProvider() {
    const provider = this.currentElement('provider');
    if (!provider) { this.reportUnavailable('provider controls'); return; }
    const providerId = provider.value;
    this.request('provider_select', { provider:providerId }, (message) => this.append(message.ok ? { provider:providerId, selected:true } : `[provider] ${message.error}`));
  },
  saveWorkspace() {
    const locale = this.currentElement('locale');
    const activeProvider = this.currentElement('active-provider');
    const fallbackProviders = this.currentElement('fallback-providers');
    if (!activeProvider || !fallbackProviders) { this.reportUnavailable('workspace controls'); return; }
    const activeProviderId = activeProvider.value;
    const fallbacks = Array.from(fallbackProviders.selectedOptions).map((option) => option.value).filter((id) => id !== activeProviderId);
    this.request('agent_config', { locale:locale?.value || 'zh-CN', activeProvider:activeProviderId, fallbackProviders:fallbacks }, (message) => this.append(message.ok ? { workspace:'saved', activeProvider:activeProviderId, fallbackProviders:fallbacks } : `[workspace] ${message.error}`));
  },
  ccsDoctor() {
    this.request('ccs_doctor', {}, (message) => {
      const ccsState = this.currentElement('ccs-state');
      if (!ccsState) { this.reportUnavailable('cc-switch controls'); return; }
      if (!message.ok) { ccsState.textContent = message.error; return; }
      const result = message.result && typeof message.result === 'object' ? message.result : {};
      const checks = result.checks && typeof result.checks === 'object' ? result.checks : {};
      const config = checks.ccSwitchConfig || {};
      const ccsRoute = this.currentElement('ccs-route');
      if (result.route && result.route.route && ccsRoute) ccsRoute.value = result.route.route;
      ccsState.textContent = config.ok ? `Config: ${config.path}` : `cc-switch config missing: ${config.path}`;
      this.append({ ccs:result });
    });
  },
  ccsConnect() {
    const ccsRoute = this.currentElement('ccs-route');
    if (!ccsRoute) { this.reportUnavailable('cc-switch controls'); return; }
    const route = ccsRoute.value.trim();
    this.request('ccs_connect', { route }, (message) => this.append(message.ok ? { ccs:message.result } : `[ccs] ${message.error}`));
  },
  run() {
    const input = this.currentElement('input');
    if (!input) { this.reportUnavailable('command input'); return; }
    const line = input.value.trim();
    if (!line) return;
    input.value = '';
    this.append(`> ${line}`);
    const command = parseCommand(line);
    this.request(command.tool, command.args);
  },
  append(value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    const output = this.currentElement('output');
    if (!output) return;
    output.textContent += `${text}\n`;
    output.scrollTop = output.scrollHeight;
  },
  close() {
    if (this.panelClosed) return;
    this.panelClosed = true;
    this.dispose();
    if (typeof Editor !== 'undefined' && Editor.Panel) Editor.Panel.close('cocos-agent.cli');
  },
};

module.exports = Editor.Panel.define(panelDefinition);
