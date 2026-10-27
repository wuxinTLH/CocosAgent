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

function copyText(value, output) {
  if (!value) return Promise.resolve(false);
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(value).then(() => true).catch(() => copyTextFallback(value, output));
  }
  return Promise.resolve(copyTextFallback(value, output));
}

function copyTextFallback(value, output) {
  const ownerDocument = output && output.ownerDocument;
  if (!ownerDocument || typeof ownerDocument.createElement !== 'function' || !ownerDocument.body) return false;
  const textarea = ownerDocument.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  ownerDocument.body.appendChild(textarea);
  textarea.select();
  const copied = typeof ownerDocument.execCommand === 'function' && ownerDocument.execCommand('copy');
  ownerDocument.body.removeChild(textarea);
  return copied;
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
  if (head === 'chat') return { tool: 'workspace_chat', args: { chat: rest.join(' '), mode: 'agent' } };
  if (head === 'math' && rest[0] === 'analyze') return { tool: 'math_analyze', args: { path: rest[1] || undefined } };
  if (head === 'provider' && rest[0] === 'select') return { tool: 'provider_select', args: { provider: rest[1] || '' } };
  if (head === 'terminal') return { tool: 'terminal_run', args: { shell: rest[0] || '', command: rest.slice(1).join(' ') } };
  return map[head] || { tool: head, args: {} };
}

const panelDefinition = {
  $: {
    output: '#output', input: '#input', state: '#state', locale: '#locale', provider: '#provider', model: '#model', endpoint: '#endpoint', protocol: '#protocol', 'protocol-label': '#protocol-label', credential: '#credential', 'api-key': '#api-key', 'clear-key': '#clear-key', 'provider-name': '#provider-name', 'connection-status': '#connection-status', 'provider-editor': '#provider-editor', 'add-provider': '#add-provider', 'edit-provider': '#edit-provider', 'cancel-provider': '#cancel-provider',
    'permission': '#permission', 'permission-confirm': '#permission-confirm', 'confirm-permission': '#confirm-permission', 'cancel-permission': '#cancel-permission', 'delete-provider': '#delete-provider', 'provider-delete-confirm': '#provider-delete-confirm', 'confirm-provider-delete': '#confirm-provider-delete', 'cancel-provider-delete': '#cancel-provider-delete', 'rollback-confirm': '#rollback-confirm', 'confirm-rollback': '#confirm-rollback', 'cancel-rollback': '#cancel-rollback',
    'permission-info': '#permission-info', 'back-chat': '#back-chat', 'composer': '#composer', 'mode': '#mode', 'execution-state': '#execution-state', 'history-toggle': '#history-toggle', 'history-menu': '#history-menu', 'delete-chat': '#delete-chat', 'delete-confirm': '#delete-confirm', 'confirm-delete': '#confirm-delete', 'cancel-delete': '#cancel-delete', form: '#form',
    'save-provider': '#save-provider', 'select-provider': '#select-provider', 'copy-output': '#copy-output',
    'settings-toggle': '#settings-toggle', 'settings': '#settings', 'quick-provider': '#quick-provider', 'activity-toggle': '#activity-toggle', 'activity': '#activity', 'chat-history': '#chat-history', 'new-chat': '#new-chat', 'sessions': '#sessions', 'active-model': '#active-model',
  },
  template: `
    <div class="agent-cli">
      <header class="agent-cli__header"><div class="agent-cli__brand"><strong>Cocos Agent</strong><span id="state" role="status">离线</span></div><nav><button id="new-chat" type="button" title="创建新对话">＋</button><button id="history-toggle" type="button" aria-controls="history-menu" aria-expanded="false">历史</button><button id="delete-chat" type="button">删除</button></nav></header>
      <section id="history-menu" hidden><label>历史对话<select id="sessions" aria-label="切换对话"></select></label></section>
      <section id="delete-confirm" hidden role="alert">永久删除当前对话？此操作不可撤销。<button id="confirm-delete" type="button">确认删除</button><button id="cancel-delete" type="button">取消</button></section>
      <section id="permission-confirm" hidden role="alert">完整权限允许修改项目及执行终端命令。仅由你手动授权，是否继续？<button id="confirm-permission" type="button">确认授予完整权限</button><button id="cancel-permission" type="button">取消</button></section>
      <section id="rollback-confirm" hidden role="alert">回退将删除所选用户消息及后续对话，仅改变对话上下文，不会撤销或恢复任何项目文件。所选消息将放回输入框并替换当前草稿。<button id="confirm-rollback" type="button">确认回退</button><button id="cancel-rollback" type="button">取消</button></section>
      <section id="settings" class="agent-cli__settings" hidden aria-label="模型管理"><div class="agent-cli__settings-head"><button id="back-chat" type="button">← 返回对话</button><strong>模型管理</strong></div><div class="agent-cli__config">
        <div class="agent-cli__section-title">使用模型</div>
        <div class="agent-cli__grid"><label>已保存的模型<select id="provider"><option value="">尚无已保存模型</option></select></label></div>
        <div class="agent-cli__actions"><button id="select-provider" type="button">使用所选模型</button><button id="add-provider" type="button">新增模型</button><button id="edit-provider" type="button">编辑所选模型</button><button id="delete-provider" type="button">删除自定义模型</button><span id="connection-status" role="status"></span></div>
        <div id="provider-delete-confirm" hidden role="alert">删除此自定义模型及其保存的凭据？历史对话保留，但模型引用将被清除。<button id="confirm-provider-delete" type="button">确认删除模型</button><button id="cancel-provider-delete" type="button">取消</button></div>
        <div id="provider-editor" hidden>
          <div class="agent-cli__section-title">模型连接信息</div>
          <div class="agent-cli__grid">
            <label>显示名称<input id="provider-name" type="text" autocomplete="off" placeholder="例如：我的模型服务" /></label>
            <label>模型 ID<input id="model" type="text" autocomplete="off" /></label>
            <label id="protocol-label">API 协议<select id="protocol"><option value="chat-completions">chat-completions</option><option value="responses">responses</option></select></label>
            <label class="agent-cli__wide">服务地址 · Base URL<input id="endpoint" type="url" autocomplete="off" placeholder="https://api.openai.com/v1" /></label>
          </div>
          <label class="agent-cli__secret">API Key / Token<input id="api-key" type="password" autocomplete="new-password" placeholder="编辑时留空保留已保存密钥" /></label>
          <div class="agent-cli__actions"><button id="save-provider" type="button">保存并使用</button><button id="cancel-provider" type="button">取消</button><button id="clear-key" type="button">清除已保存密钥</button><span id="credential" role="status"></span></div>
          <p class="agent-cli__quick-hint">可不填密钥保存模型；没有可用的密钥时无法聊天。密钥不会显示在面板中。</p>
        </div>
      </div></section>
      <section id="chat-history" class="agent-cli__conversation" role="log" aria-label="对话记录" aria-live="polite"><p class="agent-cli__welcome">从这里开始对话。可询问当前 Cocos 项目，也可让 Agent 分析场景与资源。</p></section>
      <section id="activity" class="agent-cli__activity" hidden aria-label="诊断记录"><div class="agent-cli__output-actions"><span>诊断记录</span><button id="copy-output" type="button" title="复制诊断记录">复制记录</button></div><pre id="output" class="agent-cli__output"></pre></section>
      <div id="execution-state" role="status" hidden></div><div id="composer" class="agent-cli__footer"><form id="form" class="agent-cli__command"><textarea id="input" rows="3" placeholder="向 Cocos Agent 提问… (Enter 发送，Shift+Enter 换行)" aria-label="输入消息"></textarea><div class="agent-cli__composer-tools"><select id="quick-provider" aria-label="使用模型"><option value="">尚无已保存模型</option></select><button id="settings-toggle" type="button">管理模型</button><select id="permission" aria-label="Agent 权限"><option value="only-safe">有限权限</option><option value="full-access">完整权限</option></select><button type="submit" title="发送消息">发送 ↑</button></div></form><div class="agent-cli__footer-line"><span id="active-model">请添加模型</span><button id="activity-toggle" type="button" aria-controls="activity" aria-expanded="false">诊断记录</button></div><small><span id="permission-info">当前权限：正在读取</span> · Agent 不会自动提升权限。</small></div>
    </div>
  `,
  style: `
    :host, .agent-cli, .agent-cli * { user-select:text; -webkit-user-select:text; }
    #permission-confirm, #rollback-confirm { padding:10px 14px; background:#3b3029; }
    :host { display:block; height:100%; overflow:hidden; background:#181e27; }
    .agent-cli__header nav { display:flex; gap:4px; }
    .agent-cli__settings { flex:1 !important; max-height:none !important; }
    #history-menu, #delete-confirm, #execution-state { padding:10px 14px; background:#252e3b; }
    .agent-cli__command { flex-direction:column; align-items:stretch !important; }
    .agent-cli__composer-tools { display:flex; gap:5px; align-items:center; flex-wrap:wrap; }
    .agent-cli__composer-tools select { width:auto; max-width:45%; flex:1; font-size:11px; }
    .agent-cli__composer-tools button { font-size:11px; }
    .agent-cli__footer small { display:block; color:#91a8b9; padding:0 14px 8px; font-size:10px; }
    .agent-cli__trace { margin-top:8px; padding:8px 10px; border:1px solid #475a70; border-radius:7px; font-size:12px; color:#aec9df; }
    .agent-cli__trace--error { border-color:#a25a5a; color:#e3a2a2; }
    .agent-cli { display:flex; flex-direction:column; height:100%; min-height:0; color:#e7edf5; background:#181e27; font:13px system-ui, 'Microsoft YaHei', sans-serif; }
    .agent-cli [hidden] { display:none !important; }
    .agent-cli__header, .agent-cli__toolbar { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 14px; }
    .agent-cli__header { min-height:38px; border-bottom:1px solid #303b4b; }
    .agent-cli__brand, .agent-cli__identity { display:flex; flex-direction:column; min-width:0; gap:3px; }
    .agent-cli__brand strong { color:#f0f6fc; font-size:15px; } .agent-cli__brand span, .agent-cli__identity span { color:#92a9ba; font-size:11px; }
    .agent-cli__toolbar { padding-top:12px; padding-bottom:9px; } .agent-cli__identity { flex:1; } .agent-cli__identity label { color:#92a9ba; font-size:11px; }
    .agent-cli__quick { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:0 14px 12px; border-bottom:1px solid #303b4b; }
    .agent-cli__quick label { color:#9daebe; white-space:nowrap; } .agent-cli__quick select { flex:1; min-width:150px; }
    .agent-cli__quick-hint { color:#8498aa; font-size:11px; }
    .agent-cli__settings { flex:0 1 auto; min-height:0; max-height:60%; overflow:auto; border-bottom:1px solid #475a70; background:#212a35; }
    .agent-cli__settings-head { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:12px 14px 0; }
    .agent-cli__settings-head span { color:#9aafc0; font-size:11px; }
    .agent-cli__config { padding:12px 14px 18px; }
    .agent-cli__section-title { margin:0 0 9px; color:#dce9f5; font-weight:700; }
    .agent-cli__section-title:not(:first-child) { margin-top:19px; padding-top:13px; border-top:1px solid #364657; }
    .agent-cli__grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(155px, 1fr)); gap:10px; }
    .agent-cli__grid label { display:flex; flex-direction:column; gap:5px; min-width:0; color:#aab8c5; } .agent-cli__wide { grid-column:1 / -1; }
    .agent-cli input, .agent-cli select, .agent-cli textarea { box-sizing:border-box; width:100%; min-height:32px; color:#eaf2f8; background:#141c25; border:1px solid #46576a; border-radius:7px; padding:6px 9px; outline:none; font:inherit; }
    .agent-cli input:focus, .agent-cli select:focus, .agent-cli textarea:focus { border-color:#70b9ef; }
    .agent-cli select[multiple] { min-height:70px; }
    .agent-cli__secret { display:flex; flex-direction:column; gap:5px; margin-top:10px; color:#aab8c5; }
    .agent-cli__advanced { margin-top:18px; border-top:1px solid #364657; padding-top:12px; } .agent-cli__advanced summary { cursor:pointer; color:#afc9df; }
    .agent-cli__actions { display:flex; align-items:center; gap:8px; margin-top:10px; flex-wrap:wrap; }
    .agent-cli button { min-height:31px; color:#deebf7; background:#304355; border:1px solid #445c70; border-radius:7px; padding:5px 11px; cursor:pointer; font:inherit; }
    .agent-cli button:hover { background:#405d75; } .agent-cli button:focus-visible { outline:2px solid #81caff; }
    .agent-cli__actions span { color:#aab8c5; overflow-wrap:anywhere; }
    .agent-cli__conversation { flex:1; min-height:0; overflow:auto; display:flex; flex-direction:column; gap:12px; padding:18px 14px; }
    .agent-cli__welcome { max-width:36em; margin:auto; color:#99adbf; text-align:center; line-height:1.7; }
    .agent-cli__message { max-width:94%; align-self:flex-start; border:1px solid #35465a; background:#243140; border-radius:12px 12px 12px 3px; padding:10px 12px; overflow-wrap:anywhere; white-space:pre-wrap; line-height:1.55; }
    .agent-cli__message--user { align-self:flex-end; border-color:#376a8d; border-radius:12px 12px 3px 12px; background:#214663; }
    .agent-cli__message--error { border-color:#9b5954; background:#3b292d; }
    .agent-cli__message strong { display:block; color:#abd8f4; font-size:11px; margin-bottom:5px; }
    .agent-cli__activity { flex:0 1 35%; min-height:90px; overflow:auto; border-top:1px solid #35465a; background:#121922; }
    .agent-cli__output { box-sizing:border-box; margin:0; min-height:60px; overflow:auto; padding:8px 14px; white-space:pre-wrap; overflow-wrap:anywhere; font:12px/1.5 Consolas, monospace; }
    .agent-cli__output-actions { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:7px 14px 0; color:#a8bacc; }
    .agent-cli__footer { flex:none; border-top:1px solid #35465a; background:#202a35; }
    .agent-cli__command { display:flex; align-items:flex-end; gap:8px; margin:0; padding:10px 12px 5px; }
    .agent-cli__command textarea { flex:1; min-width:0; resize:vertical; max-height:130px; }
    .agent-cli__command button { color:#0f202f; background:#82cfff; border-color:#82cfff; font-weight:700; }
    .agent-cli__footer-line { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 14px 8px; color:#91a8b9; font-size:11px; }
    .agent-cli__footer-line button { min-height:25px; padding:2px 6px; background:transparent; border-color:transparent; color:#9dcdf0; }
  `,
  ready() {
    // Creator may invoke lifecycle callbacks with a panel instance that does
    // not inherit methods from this definition object.
    for (const name of ['bindElements', 'bindEvent', 'removeEventBindings', 'scheduleBind', 'currentElement', 'reportUnavailable', 'connect', 'scheduleReconnect', 'request', 'handleMessage', 'refresh', 'refreshWorkspace', 'switchChat', 'renderSession', 'showProvider', 'openProviderEditor', 'cancelProviderEditor', 'providerStatus', 'providerError', 'saveProvider', 'clearProviderKey', 'selectProvider', 'selectQuickProvider', 'navigate', 'confirmDelete', 'deleteChat', 'renderTrace', 'copyOutput', 'inputKeydown', 'rememberInput', 'applyPermission', 'choosePermission', 'setPermission', 'cancelPermission', 'confirmProviderDelete', 'deleteProvider', 'confirmRollback', 'rollback', 'cancelRollback', 'toggleSection', 'addMessage', 'startChat', 'newChat', 'run', 'append', 'dispose', 'close']) {
      this[name] = (...args) => panelDefinition.methods[name].apply(this, args);
    }
    this.messageId = 0;
    this.pending = new Map();
    this.providers = [];
    this.providerMode = 'switch';
    this.providerBusy = false;
    this.preferredProviderId = null;
    this.eventsBound = false;
    this.destroyed = false;
    this.panelClosed = false;
    this.bindTimer = null;
    this.reconnectTimer = null;
    this.eventRoot = null;
    this.eventBindings = [];
    this.bindAttempts = 0;
    this.chatBusy = false;
    this.chatSessionId = null;
    this.sessionSwitching = false;
    this.workspaceRequestId = 0;
    this.providerRequestId = 0;
    this.permissionMode = 'only-safe';
    this.permissionRequestId = 0;
    this.permissionBusy = false;
    this.inputHistory = [];
    this.historyCursor = 0;
    this.historyDraft = '';
    this.composing = false;
    this.getElement = (id) => queryPanelElement(this, id);
    this.output = this.getElement('output');
    this.input = this.getElement('input');
    this.state = this.getElement('state');
    this.provider = this.getElement('provider');
    this.model = this.getElement('model');
    this.endpoint = this.getElement('endpoint');
    this.protocol = this.getElement('protocol');
    this.protocolLabel = this.getElement('protocol-label');
    this.credential = this.getElement('credential');
    this.bindElements();
    this.applyPermission({ permissionMode:'only-safe' });
    this.connect();
  },
  methods: {
  bindElements() {
    if (this.destroyed) return false;
    const ids = ['output', 'input', 'state', 'provider', 'model', 'endpoint', 'protocol', 'protocol-label', 'credential', 'api-key', 'clear-key', 'provider-name', 'connection-status', 'provider-editor', 'add-provider', 'edit-provider', 'cancel-provider', 'back-chat', 'composer', 'permission', 'permission-confirm', 'confirm-permission', 'cancel-permission', 'delete-provider', 'provider-delete-confirm', 'confirm-provider-delete', 'cancel-provider-delete', 'rollback-confirm', 'confirm-rollback', 'cancel-rollback', 'execution-state', 'history-toggle', 'history-menu', 'delete-chat', 'delete-confirm', 'confirm-delete', 'cancel-delete', 'form', 'save-provider', 'select-provider', 'copy-output', 'settings-toggle', 'settings', 'quick-provider', 'activity-toggle', 'activity', 'chat-history', 'new-chat', 'sessions', 'active-model'];
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
      this.protocol = elements.protocol;
      this.protocolLabel = elements['protocol-label'];
      this.credential = elements.credential;
        this.bindEvent(elements.form, 'submit', (event) => { event.preventDefault(); this.run(); });
        this.bindEvent(elements.input, 'keydown', (event) => this.inputKeydown(event));
        this.bindEvent(elements.input, 'compositionstart', () => { this.composing = true; });
        this.bindEvent(elements.input, 'compositionend', () => { this.composing = false; });
        this.bindEvent(elements.input, 'input', () => { this.historyCursor = this.inputHistory.length; this.historyDraft = elements.input.value; });
        this.bindEvent(elements.permission, 'change', () => this.choosePermission());
        this.bindEvent(elements['confirm-permission'], 'click', () => { if (this.permissionTarget === 'full-access') this.setPermission('full-access'); });
        this.bindEvent(elements['cancel-permission'], 'click', () => this.cancelPermission());
        this.bindEvent(elements['delete-provider'], 'click', () => this.confirmProviderDelete());
        this.bindEvent(elements['confirm-provider-delete'], 'click', () => this.deleteProvider());
        this.bindEvent(elements['cancel-provider-delete'], 'click', () => { this.providerDeleteTarget = null; elements['provider-delete-confirm'].hidden = true; });
        this.bindEvent(elements['confirm-rollback'], 'click', () => this.rollback());
        this.bindEvent(elements['cancel-rollback'], 'click', () => this.cancelRollback());
        this.bindEvent(elements['settings-toggle'], 'click', (event) => { event.preventDefault(); this.navigate('manager'); });
        this.bindEvent(elements['activity-toggle'], 'click', (event) => { event.preventDefault(); this.toggleSection('activity', 'activity-toggle'); });
        this.bindEvent(elements['new-chat'], 'click', (event) => { event.preventDefault(); this.newChat(); });
        this.bindEvent(elements['quick-provider'], 'change', () => this.selectQuickProvider());
        this.bindEvent(elements.sessions, 'change', () => { const id = this.currentElement('sessions')?.value; if (id) this.switchChat(id); });
        this.bindEvent(elements['save-provider'], 'click', (event) => { event.preventDefault(); this.saveProvider(); });
        this.bindEvent(elements['clear-key'], 'click', (event) => { event.preventDefault(); this.clearProviderKey(); });
        this.bindEvent(elements['add-provider'], 'click', (event) => { event.preventDefault(); this.openProviderEditor('add'); });
         this.bindEvent(elements['edit-provider'], 'click', (event) => { event.preventDefault(); this.openProviderEditor('edit'); });
         this.bindEvent(elements['cancel-provider'], 'click', (event) => { event.preventDefault(); this.cancelProviderEditor(); });
        this.bindEvent(elements['select-provider'], 'click', (event) => { event.preventDefault(); this.selectProvider(); });
        this.bindEvent(elements['back-chat'], 'click', () => this.navigate('chat'));
         this.bindEvent(elements['history-toggle'], 'click', () => this.toggleSection('history-menu', 'history-toggle'));
         this.bindEvent(elements['delete-chat'], 'click', () => this.confirmDelete());
         this.bindEvent(elements['confirm-delete'], 'click', () => this.deleteChat());
         this.bindEvent(elements['cancel-delete'], 'click', () => { this.deleteTargetId = null; this.currentElement('delete-confirm').hidden = true; });
         this.bindEvent(elements['copy-output'], 'click', (event) => { event.preventDefault(); this.copyOutput(); });
        this.bindEvent(elements.provider, 'change', () => { this.providerDeleteTarget = null; elements['provider-delete-confirm'].hidden = true; if (this.providerMode === 'edit') this.cancelProviderEditor(); this.providerStatus(''); });
        if (!this.eventBindings.length && root && typeof root.addEventListener === 'function') {
          this.bindEvent(root, 'click', (event) => {
            const actions = { 'save-provider': () => this.saveProvider(), 'clear-key': () => this.clearProviderKey(), 'add-provider': () => this.openProviderEditor('add'), 'edit-provider': () => this.openProviderEditor('edit'), 'cancel-provider': () => this.cancelProviderEditor(), 'select-provider': () => this.selectProvider(), 'back-chat': () => this.navigate('chat'), 'delete-chat': () => this.confirmDelete(), 'confirm-delete': () => this.deleteChat(), 'history-toggle': () => this.toggleSection('history-menu', 'history-toggle'), 'copy-output': () => this.copyOutput(), 'settings-toggle': () => this.navigate('manager'), 'activity-toggle': () => this.toggleSection('activity', 'activity-toggle'), 'new-chat': () => this.newChat() };
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
      socket.onopen = () => { if (this.destroyed || this.ws !== socket) return; const state = this.currentElement('state'); if (state) state.textContent = '已连接'; this.refresh(); };
      socket.onmessage = (event) => { if (!this.destroyed && this.ws === socket) this.handleMessage(event.data); };
      socket.onclose = () => { if (this.ws !== socket) return; this.ws = null; this.providerBusy = false; this.permissionBusy = false; this.permissionRequestId += 1; this.cancelPermission(); this.applyPermission({ permissionMode:this.permissionMode }); this.sessionSwitching = false; this.cancelRollback(); this.providerDeleteTarget = null; this.providerStatus('连接已断开，请启动本地桥接后重试。'); if (this.chatBusy) this.addMessage('error', '连接已断开，消息可能未送达，请检查后重试'); this.chatBusy = false; if (this.pending) this.pending.clear(); const state = this.currentElement('state'); if (state) state.textContent = '连接断开 · 正在重试'; this.scheduleReconnect(); };
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
  request(tool, args, callback) {
    if (this.destroyed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.append('[bridge] offline; start the local bridge and retry'); return false; }
    this.messageId += 1;
    if (callback) this.pending.set(this.messageId, callback);
    this.ws.send(JSON.stringify({ type:'tool', id:this.messageId, tool, args }));
    return true;
  },
  handleMessage(raw) {
    let message;
    try { message = JSON.parse(raw); } catch { this.append('[bridge] 无法解析响应'); return; }
    if (!message || typeof message !== 'object') { this.append('[bridge] 无效响应'); return; }
    const callback = this.pending.get(message.id);
    if (callback) { this.pending.delete(message.id); try { callback(message); } catch { this.append('[panel] 响应处理失败'); } return; }
    // Never print an unexpected server payload: it might echo a credential.
    this.append('[bridge] 未匹配的响应');
  },
  navigate(page) {
    if (this.providerBusy) return;
    const manager = this.currentElement('settings');
    const editor = this.currentElement('provider-editor');
    if (manager) manager.hidden = page === 'chat';
    if (editor) editor.hidden = page !== 'editor';
    for (const id of ['chat-history', 'composer']) { const node = this.currentElement(id); if (node) node.hidden = page !== 'chat'; }
    if (manager) for (const child of Array.from(manager.children || [])) {
      if (child.className === 'agent-cli__settings-head') child.hidden = page === 'editor';
    }
    const config = manager?.querySelector?.('.agent-cli__config');
    if (config) for (const child of Array.from(config.children || [])) { if (child !== editor) child.hidden = page === 'editor'; }
  },
  confirmDelete() {
    if (this.chatBusy || this.sessionSwitching || !this.chatSessionId) return;
    this.deleteTargetId = this.chatSessionId;
    const node = this.currentElement('delete-confirm');
    if (node) node.hidden = false;
  },
  deleteChat() {
    if (this.chatBusy || this.sessionSwitching || !this.deleteTargetId || this.deleteTargetId !== this.chatSessionId) return;
    const id = this.deleteTargetId;
    this.deleteTargetId = null;
    this.currentElement('delete-confirm').hidden = true;
    this.sessionSwitching = true;
    this.workspaceRequestId += 1;
    if (!this.request('workspace_delete', { id }, (message) => {
      if (!message.ok) this.addMessage('error', '删除失败，请检查连接和权限后重试。');
      this.refreshWorkspace();
    })) this.sessionSwitching = false;
  },
  renderTrace(container, trace) {
    if (!Array.isArray(trace) || !container?.ownerDocument) return;
    for (const entry of trace) {
      if (!entry || typeof entry.name !== 'string') continue;
      const card = container.ownerDocument.createElement('div');
      card.className = `agent-cli__trace${entry.status === 'error' ? ' agent-cli__trace--error' : ''}`;
      card.textContent = `${entry.status === 'error' ? '✕' : '✓'} ${entry.name}${typeof entry.result === 'string' ? `\n${entry.result}` : ''}`;
      container.appendChild(card);
    }
  },
  refresh() {
    const requestId = ++this.providerRequestId;
    this.request('provider_list', {}, (message) => {
      if (requestId !== this.providerRequestId) return;
      if (!message.ok) { this.providerError(message, '加载模型'); return; }
      this.providers = Array.isArray(message.result) ? message.result.filter((item) => item.saved || item.configured || item.custom) : [];
      const quick = this.currentElement('quick-provider');
      if (quick && typeof quick.replaceChildren === 'function') {
        quick.replaceChildren();
        for (const item of this.providers) {
          const option = quick.ownerDocument.createElement('option');
          option.value = item.id;
          option.textContent = `${item.label}${item.configured ? '' : ' · 未配置密钥'}`;
          quick.appendChild(option);
        }
      }
      for (const id of ['provider']) {
        const select = this.currentElement(id);
        if (!select || typeof select.replaceChildren !== 'function') continue;
        const previousValue = select.value;
        select.replaceChildren();
        for (const item of this.providers) {
          const option = select.ownerDocument.createElement('option');
          option.value = item.id;
          option.textContent = item.label;
          option.selected = item.id === previousValue;
          select.appendChild(option);
        }
        const preferred = this.preferredProviderId;
        select.value = (preferred && this.providers.some((item) => item.id === preferred) ? preferred : previousValue && this.providers.some((item) => item.id === previousValue) ? previousValue : this.providers[0]?.id) || '';
        if (id === 'provider' && this.providers.some((item) => item.id === this.preferredProviderId)) this.preferredProviderId = null;
      }
      const provider = this.currentElement('provider');
      const selected = this.providers.find((item) => item.id === provider?.value) || this.providers[0];
      if (selected && provider) provider.value = selected.id;
      else if (!provider) this.reportUnavailable('provider controls');
      this.refreshWorkspace();
    });
    const permissionRequestId = this.permissionRequestId;
    this.request('status', {}, (message) => {
      if (permissionRequestId !== this.permissionRequestId || this.permissionBusy) return;
      if (message.ok) this.applyPermission(message.result);
    });
  },
  switchChat(id) {
    if (this.sessionSwitching || this.chatBusy) { const select = this.currentElement('sessions'); if (select) select.value = this.chatSessionId || ''; return; }
    this.sessionSwitching = true;
    this.workspaceRequestId += 1;
    if (!this.request('workspace_switch', { id }, (message) => {
      if (!message.ok) this.addMessage('error', `[workspace] ${message.error}`);
      this.refreshWorkspace();
    })) this.sessionSwitching = false;
  },
  refreshWorkspace() {
    const requestId = ++this.workspaceRequestId;
    if (!this.request('workspace_list', {}, (message) => {
      if (requestId !== this.workspaceRequestId) return;
      this.sessionSwitching = false;
      if (!message.ok) { this.append(`[workspace] ${message.error}`); return; }
      const result = message.result || {};
      const sessions = Array.isArray(result.sessions) ? result.sessions : [];
      const select = this.currentElement('sessions');
      if (select && typeof select.replaceChildren === 'function') {
        select.replaceChildren();
        for (const item of sessions) {
          const option = select.ownerDocument.createElement('option');
          option.value = item.id;
          option.textContent = item.name;
          select.appendChild(option);
        }
      }
      if (select) select.value = result.activeSessionId || sessions[0]?.id || '';
      const active = sessions.find((item) => item.id === (result.activeSessionId || sessions[0]?.id));
      if (active) this.renderSession(active);
    })) this.sessionSwitching = false;
  },
  renderSession(session) {
    if (this.chatBusy && this.chatSessionId === session.id) return;
    if (this.chatSessionId !== session.id) {
      this.deleteTargetId = null;
      const confirmation = this.currentElement('delete-confirm');
      if (confirmation) confirmation.hidden = true;
    }
    const quick = this.currentElement('quick-provider');
    if (quick) quick.value = session.provider;
    const model = this.currentElement('active-model');
    const provider = this.providers.find((item) => item.id === session.provider);
    if (model) model.textContent = provider ? `${provider.label} · ${provider.model}` : session.provider;
    const messages = Array.isArray(session.messages) ? session.messages : [];
    const signature = JSON.stringify(messages);
    if (this.chatSessionId === session.id && this.chatHistorySignature === signature) return;
    this.chatSessionId = session.id;
    this.chatHistorySignature = signature;
    const history = this.currentElement('chat-history');
    if (!history || typeof history.replaceChildren !== 'function') return;
    history.replaceChildren();
    if (!messages.length) {
      const welcome = history.ownerDocument.createElement('p');
      welcome.className = 'agent-cli__welcome';
      welcome.textContent = '从这里开始对话。可询问当前 Cocos 项目，也可让 Agent 分析场景与资源。';
      history.appendChild(welcome);
    }
    this.cancelRollback();
    for (const [index, message] of messages.entries()) this.addMessage(message.role, message.content, message.toolTrace, index, message.timeUtc8);
  },
  providerStatus(text) {
    const status = this.currentElement('credential');
    if (status) status.textContent = text;
    const visible = this.currentElement('connection-status');
    if (visible) visible.textContent = text;
  },
  providerError(message, action) {
    // The authenticated local bridge sanitizes error details before sending them.
    const code = typeof message?.error === 'string' ? message.error.match(/^([A-Z][A-Z0-9_]+)(?::|$)/)?.[1] : '';
    const hints = {
      PROVIDER_NOT_SUPPORTED: '模型已不存在，请刷新列表后重试。',
      PROVIDER_ENDPOINT_INVALID: '服务地址无效，请填写有效的 Base URL。',
      PROVIDER_ENDPOINT_REQUIRED: '请填写服务地址。',
      PROVIDER_MODEL_INVALID: '模型 ID 无效，请检查后重试。',
      PROVIDER_CREDENTIAL_STORAGE_UNAVAILABLE: '本机无法保存密钥，请检查 Windows 凭据存储。',
      PROVIDER_CREDENTIAL_INVALID: '密钥格式无效，请检查后重试。',
      PERMISSION_DENIED: '当前权限不允许操作，请检查 CLI 权限设置。',
    };
    const detail = typeof message?.error === 'string' ? message.error : '请检查模型配置、本地桥接和权限后重试。';
    this.providerStatus(`${action}失败：${hints[code] ? `${hints[code]}\n` : ''}${detail}`);
    this.append(`[provider] ${action}: ${detail}`);
  },
  showProvider(id) {
    const provider = this.providers.find((item) => item.id === id);
    if (!provider) return;
    const model = this.currentElement('model');
    const endpoint = this.currentElement('endpoint');
    const protocol = this.currentElement('protocol');
    const protocolLabel = this.currentElement('protocol-label');
    const name = this.currentElement('provider-name');
    if (!model || !endpoint || !protocol || !protocolLabel || !name) { this.reportUnavailable('provider controls'); return; }
    name.value = provider.label || provider.id;
    name.disabled = true; // Built-in and custom provider IDs/names cannot be renamed by provider_configure.
    model.value = provider.model || '';
    endpoint.value = provider.endpoint || '';
    const selectableProtocol = !['anthropic', 'gateway'].includes(id);
    protocolLabel.hidden = !selectableProtocol;
    protocol.disabled = !selectableProtocol;
    protocol.value = provider.modelProtocol === 'responses' ? 'responses' : 'chat-completions';
    this.currentElement('api-key').value = '';
    this.providerStatus(provider.configured ? '已配置凭据（不会在面板显示）；留空保留现有密钥' : '尚未配置凭据；没有可用密钥时无法聊天');
  },
  openProviderEditor(mode) {
    if (this.providerBusy) return;
    const selected = this.currentElement('provider')?.value;
    if (mode === 'edit' && !this.providers.some((item) => item.id === selected)) { this.providerStatus('请先选择要编辑的模型。'); return; }
    this.providerMode = mode;
    this.editingProviderId = mode === 'edit' ? selected : null;
    const editor = this.currentElement('provider-editor');
    const name = this.currentElement('provider-name');
    const model = this.currentElement('model');
    const endpoint = this.currentElement('endpoint');
    const protocol = this.currentElement('protocol');
    const label = this.currentElement('protocol-label');
    const key = this.currentElement('api-key');
    if (!editor || !name || !model || !endpoint || !protocol || !label || !key) { this.reportUnavailable('provider controls'); return; }
    this.navigate('editor');
    editor.hidden = false;
    key.value = '';
    this.currentElement('clear-key').hidden = mode === 'add';
    if (mode === 'edit') this.showProvider(selected);
    else {
      name.disabled = false; name.value = ''; model.value = '';
      endpoint.value = 'https://api.openai.com/v1'; protocol.value = 'chat-completions';
      protocol.disabled = false; label.hidden = false;
      this.providerStatus('新增模型：填写连接信息，保存后将自动使用。密钥可稍后填写。');
    }
  },
  cancelProviderEditor() {
    if (this.providerBusy) return;
    this.providerMode = 'switch';
    this.editingProviderId = null;
    const key = this.currentElement('api-key');
    if (key) key.value = '';
    const editor = this.currentElement('provider-editor');
    if (editor) editor.hidden = true;
    this.navigate('manager');
    this.providerStatus('');
  },
  saveProvider() {
    if (this.providerBusy || this.providerMode === 'switch') return;
    const mode = this.providerMode;
    const id = this.editingProviderId;
    const name = this.currentElement('provider-name')?.value.trim();
    const model = this.currentElement('model')?.value.trim();
    const endpoint = this.currentElement('endpoint')?.value.trim();
    const protocolElement = this.currentElement('protocol');
    const keyInput = this.currentElement('api-key');
    if (!keyInput || !protocolElement) { this.reportUnavailable('provider controls'); return; }
    const apiKey = keyInput.value.trim();
    keyInput.value = '';
    if (!name || !model || (mode === 'add' && !endpoint)) { this.providerStatus('请填写显示名称、模型 ID 和新增模型的 Base URL。'); return; }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.providerStatus('本地桥接未连接，请启动后重试。'); return; }
    const selectableProtocol = mode === 'add' || !['anthropic', 'gateway'].includes(id);
    const args = mode === 'add'
      ? { name, endpoint, model, protocol:protocolElement.value, ...(apiKey ? { apiKey } : {}) }
      : { provider:id, endpoint, model, ...(selectableProtocol ? { protocol:protocolElement.value } : {}), ...(apiKey ? { apiKey } : {}) };
    this.providerBusy = true;
    this.providerStatus('正在保存模型连接…');
    const tool = mode === 'add' ? 'provider_create' : 'provider_configure';
    if (!this.request(tool, args, (message) => {
      if (!message.ok || !message.result?.id) { this.providerBusy = false; this.providerError(message, '保存'); return; }
      const savedId = message.result.id;
      this.providerStatus('模型已保存，正在切换…');
      if (!this.request('provider_select', { provider:savedId }, (selection) => {
        this.providerBusy = false;
        if (!selection.ok) { this.providerError(selection, '切换'); this.refresh(); return; }
        this.cancelProviderEditor();
        this.providerStatus('模型已保存并启用。');
        const picker = this.currentElement('provider');
        if (picker) picker.value = savedId;
        this.preferredProviderId = savedId;
        this.refresh();
      })) { this.providerBusy = false; this.providerStatus('模型已保存，但桥接已断开；请重连后选择模型。'); }
    })) { this.providerBusy = false; this.providerStatus('本地桥接未连接，请启动后重试。'); }
  },
  clearProviderKey() {
    if (this.providerBusy || this.providerMode !== 'edit') return;
    const provider = this.editingProviderId;
    const keyInput = this.currentElement('api-key');
    if (keyInput) keyInput.value = '';
    if (!provider) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.providerStatus('本地桥接未连接，请启动后重试。'); return; }
    this.providerBusy = true;
    if (!this.request('provider_credential_clear', { provider }, (message) => {
      this.providerBusy = false;
      if (!message.ok) { this.providerError(message, '清除密钥'); return; }
      this.providerStatus('已清除保存的密钥；没有可用密钥时无法聊天。');
      this.refresh();
    })) this.providerBusy = false;
  },
  selectProvider() {
    if (this.providerBusy || this.chatBusy || this.sessionSwitching) return;
    const providerId = this.currentElement('provider')?.value;
    if (!providerId) { this.providerStatus('请先选择模型。'); return; }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.providerStatus('本地桥接未连接，请启动后重试。'); return; }
    this.providerBusy = true;
    if (!this.request('provider_select', { provider:providerId }, (message) => {
      this.providerBusy = false;
      if (!message.ok) { this.providerError(message, '切换'); this.refreshWorkspace(); return; }
      this.providerStatus('已切换模型。');
      this.refreshWorkspace();
    })) this.providerBusy = false;
  },
  selectQuickProvider() {
    if (this.providerBusy || this.chatBusy || this.sessionSwitching) { this.refreshWorkspace(); return; }
    const provider = this.currentElement('quick-provider')?.value;
    if (!provider) return;
    this.providerBusy = true;
    if (!this.request('provider_select', { provider }, (message) => {
      this.providerBusy = false;
      if (!message.ok) { this.providerError(message, '切换'); this.refreshWorkspace(); return; }
      const settingsProvider = this.currentElement('provider');
      if (settingsProvider) { settingsProvider.value = provider; if (this.providerMode === 'edit') this.cancelProviderEditor(); }
      this.refreshWorkspace();
    })) this.providerBusy = false;
  },
  inputKeydown(event) {
    if (this.composing || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.run(); return; }
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
    const input = this.currentElement('input');
    if (!input || !this.inputHistory.length || input.selectionStart !== input.selectionEnd) return;
    const position = input.selectionStart;
    if (typeof position !== 'number') return;
    const up = event.key === 'ArrowUp';
    if (up ? input.value.slice(0, position).includes('\n') : input.value.slice(position).includes('\n')) return;
    const next = this.historyCursor + (up ? -1 : 1);
    if (next < 0 || next > this.inputHistory.length || next === this.historyCursor) return;
    if (this.historyCursor === this.inputHistory.length) this.historyDraft = input.value;
    this.historyCursor = next;
    input.value = next === this.inputHistory.length ? this.historyDraft : this.inputHistory[next];
    input.selectionStart = input.selectionEnd = input.value.length;
    event.preventDefault();
  },
  rememberInput(text) {
    if (this.inputHistory.at(-1) !== text) this.inputHistory.push(text);
    this.historyCursor = this.inputHistory.length;
    this.historyDraft = '';
  },
  applyPermission(result) {
    const mode = result?.current?.permissionMode || result?.permissions?.mode || result?.permissionMode;
    this.permissionMode = mode === 'full-access' ? 'full-access' : 'only-safe';
    const select = this.currentElement('permission');
    if (select) { select.value = this.permissionMode; select.disabled = this.permissionBusy; }
    const label = this.currentElement('permission-info');
    if (label) label.textContent = this.permissionMode === 'full-access' ? '当前权限：完整权限' : '当前权限：有限权限';
  },
  cancelPermission() {
    this.permissionTarget = null;
    const confirmation = this.currentElement('permission-confirm');
    if (confirmation) confirmation.hidden = true;
    const select = this.currentElement('permission');
    if (select) select.value = this.permissionMode;
  },
  choosePermission() {
    const mode = this.currentElement('permission')?.value;
    this.cancelPermission();
    if (this.permissionBusy || this.chatBusy || this.sessionSwitching || mode === this.permissionMode) return;
    if (mode === 'full-access') { this.permissionTarget = mode; this.currentElement('permission-confirm').hidden = false; }
    else if (mode === 'only-safe') this.setPermission(mode);
  },
  setPermission(mode) {
    if (this.permissionBusy || this.chatBusy || this.sessionSwitching) return;
    if (mode === 'full-access' && this.permissionTarget !== mode) return;
    this.cancelPermission();
    this.permissionBusy = true;
    this.currentElement('permission').disabled = true;
    const requestId = ++this.permissionRequestId;
    const done = (message) => {
      if (requestId !== this.permissionRequestId) return;
      this.permissionBusy = false;
      this.applyPermission(message.ok ? message.result : { permissionMode:this.permissionMode });
      if (!message.ok) { this.addMessage('error', `权限切换失败：${message.error || '连接不可用'}`); this.append(`[permission] ${message.error || '连接不可用'}`); }
    };
    if (!this.request('permission_set', { mode, userInitiated:true }, done)) done({ ok:false, error:'本地桥接未连接' });
  },
  confirmProviderDelete() {
    if (this.providerBusy || this.chatBusy || this.sessionSwitching) return;
    const provider = this.providers.find((item) => item.id === this.currentElement('provider')?.value);
    if (!provider || !/^custom-/.test(provider.id)) { this.providerStatus('只能删除自定义模型；内置模型可清除配置的密钥。'); return; }
    this.providerDeleteTarget = provider.id;
    this.currentElement('provider-delete-confirm').hidden = false;
  },
  deleteProvider() {
    const provider = this.providerDeleteTarget;
    if (this.providerBusy || this.chatBusy || this.sessionSwitching || !provider || provider !== this.currentElement('provider')?.value) return;
    this.providerDeleteTarget = null;
    this.currentElement('provider-delete-confirm').hidden = true;
    this.providerBusy = true;
    if (!this.request('provider_delete', { provider }, (message) => {
      this.providerBusy = false;
      if (!message.ok) { this.providerError(message, '删除模型'); return; }
      this.cancelProviderEditor();
      this.providerStatus('自定义模型已删除。');
      this.refresh();
    })) { this.providerBusy = false; this.providerStatus('本地桥接未连接，请重试。'); }
  },
  cancelRollback() {
    this.rollbackTarget = null;
    const confirmation = this.currentElement('rollback-confirm');
    if (confirmation) confirmation.hidden = true;
  },
  confirmRollback(id, messageIndex, content, signature, timeUtc8) {
    if (this.chatBusy || this.sessionSwitching || id !== this.chatSessionId || signature !== this.chatHistorySignature) return;
    this.rollbackTarget = { id, messageIndex, content, signature, timeUtc8 };
    this.currentElement('rollback-confirm').hidden = false;
  },
  rollback() {
    const target = this.rollbackTarget;
    if (!target || this.chatBusy || this.sessionSwitching) return;
    this.cancelRollback();
    if (target.id !== this.chatSessionId || target.signature !== this.chatHistorySignature) return;
    this.sessionSwitching = true;
    const requestId = ++this.workspaceRequestId;
    if (!this.request('workspace_rollback', { id:target.id, messageIndex:target.messageIndex, expectedMessage:{ content:target.content, timeUtc8:target.timeUtc8 } }, (message) => {
      if (requestId !== this.workspaceRequestId || target.id !== this.chatSessionId) return;
      this.sessionSwitching = false;
      if (!message.ok) { this.addMessage('error', `回退失败：${message.error || '请重试'}`); return; }
      if (message.result?.session) this.renderSession(message.result.session);
      const input = this.currentElement('input');
      if (input) { input.value = message.result?.draft ?? target.content; input.focus?.(); }
      this.historyCursor = this.inputHistory.length;
      this.refreshWorkspace();
    })) this.sessionSwitching = false;
  },
  copyOutput() {
    const output = this.currentElement('output');
    if (!output) { this.reportUnavailable('log output'); return; }
    copyText(output.textContent || '', output).then((copied) => {
      const state = this.currentElement('state');
      if (state) state.textContent = copied ? '日志已复制' : '复制失败，请选择文本后复制';
    });
  },
  toggleSection(sectionId, buttonId) {
    const section = this.currentElement(sectionId);
    const button = this.currentElement(buttonId);
    if (!section || !button) return;
    section.hidden = !section.hidden;
    button.setAttribute('aria-expanded', String(!section.hidden));
  },
  addMessage(role, content, toolTrace, messageIndex, timeUtc8) {
    const history = this.currentElement('chat-history');
    if (!history || !history.ownerDocument || typeof history.appendChild !== 'function') return;
    const welcome = history.querySelector?.('.agent-cli__welcome');
    if (welcome) welcome.remove();
    const message = history.ownerDocument.createElement('div');
    message.className = `agent-cli__message agent-cli__message--${role}`;
    const label = history.ownerDocument.createElement('strong');
    label.textContent = role === 'user' ? '你' : role === 'error' ? '提示' : 'Cocos Agent';
    const body = history.ownerDocument.createElement('span');
    body.textContent = String(content);
    message.appendChild(label);
    message.appendChild(body);
    this.renderTrace(message, toolTrace);
    const copy = history.ownerDocument.createElement('button');
    copy.type = 'button'; copy.textContent = '复制';
    copy.addEventListener('click', () => copyText(String(content), history));
    message.appendChild(copy);
    if (role === 'user' && Number.isInteger(messageIndex)) {
      const rollback = history.ownerDocument.createElement('button');
      rollback.type = 'button'; rollback.textContent = '回退到此处';
      const id = this.chatSessionId, signature = this.chatHistorySignature;
      rollback.addEventListener('click', () => this.confirmRollback(id, messageIndex, content, signature, timeUtc8));
      message.appendChild(rollback);
    }
    history.appendChild(message);
    history.scrollTop = history.scrollHeight;
  },
  startChat(text) {
    if (this.chatBusy || this.sessionSwitching || this.permissionBusy || this.providerBusy || !this.chatSessionId) { this.addMessage('error', '对话正在加载，请稍后重试'); return false; }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.addMessage('error', '连接已断开，请启动本地服务后重试'); return false; }
    this.cancelPermission();
    this.cancelRollback();
    const sessionId = this.chatSessionId;
    const mode = 'agent';
    const status = this.currentElement('execution-state');
    const sent = this.request('workspace_chat', { chat:text, mode }, (message) => {
      this.chatBusy = false;
      if (status) status.hidden = true;
      this.chatHistorySignature = null;
      if (this.chatSessionId !== sessionId) { this.refreshWorkspace(); return; }
      if (!message.ok) { const detail = message.error || '请求失败，请重试。'; this.addMessage('error', detail); this.append(`[agent] ${detail}`); this.refreshWorkspace(); return; }
      if (message.result?.session && Array.isArray(message.result.session.messages)) this.renderSession(message.result.session);
      else { this.addMessage('assistant', message.result?.content || '模型未返回内容', message.result?.toolTrace); this.refreshWorkspace(); }
    });
    if (!sent) return false;
    this.chatBusy = true;
    if (status) { status.hidden = false; status.textContent = mode === 'agent' ? 'Agent 正在执行任务 · 沿用当前 CLI 权限…' : '正在等待模型回复…'; }
    this.addMessage('user', text);
    this.chatHistorySignature = null;
    return true;
  },
  newChat() {
    if (this.chatBusy || this.sessionSwitching) return;
    this.sessionSwitching = true;
    this.workspaceRequestId += 1;
    if (!this.request('workspace_create', { name:`对话 ${new Date().toLocaleString('zh-CN')}` }, (message) => {
      if (!message.ok) { this.sessionSwitching = false; this.addMessage('error', message.error || '创建对话失败'); return; }
      this.refreshWorkspace();
      this.currentElement('input')?.focus?.();
    })) this.sessionSwitching = false;
  },
  run() {
    const input = this.currentElement('input');
    if (!input) { this.reportUnavailable('command input'); return; }
    const line = input.value.trim();
    if (!line || this.chatBusy) return;
    const legacyCommand = /^(?:status|providers|sessions|skills|mcp|ccs doctor|ccs connect(?:\s+\S+(?:\s+\S+)?)?|math analyze(?:\s+\S+)?|provider select\s+\S+|chat\s+.+|terminal\s+.+)$/.test(line);
    if (line.startsWith('/') || legacyCommand) {
      input.value = '';
      const command = parseCommand(line.startsWith('/') ? line.slice(1) : line);
      this.append(`> ${line}`);
      this.request(command.tool, command.args, (message) => this.append(message.ok ? message.result : `[error] ${message.error}`));
      this.rememberInput(line);
    } else if (this.startChat(line)) { this.rememberInput(line); input.value = ''; }
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
  },
  beforeClose() {
    if (typeof this.dispose === 'function') this.dispose();
  },
  close() {
    if (typeof this.dispose === 'function') this.dispose();
  },
};

module.exports = Editor.Panel.define(panelDefinition);
