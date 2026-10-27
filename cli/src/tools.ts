import fs from 'node:fs';
import path from 'node:path';
import type { ProjectContext } from './context.js';
import { computeTaskHash } from './hash.js';
import { countLongMemory, nowUtc8, writeExecution, type ExecutionRecord } from './memory.js';
import { loadSkills, skillManifest } from './skills.js';
import { runOcr, type OcrEngine } from './ocr.js';
import { listNodes, readScene, writeScene } from './scene.js';
import { findAssets } from './assets.js';
import { ccsDoctor, connectRoute, resolveRoute } from './ccs.js';
import { chatOnce } from './gateway.js';
import { AGENT_VERSION } from './version.js';
import { loadAgentConfig, saveAgentConfig, setUserPermission, updateProvider, createCustomProvider, saveProviderCredential, clearProviderCredential, validateProviderCredential, isProviderId, type PermissionMode } from './config.js';
import { localeCatalog } from './i18n.js';
import { assertToolPermission, permissionSummary } from './permissions.js';
import { providerCatalog, agentWithFallback, resolveProvider, providerToken } from './providers.js';
import { PROJECT_TOOLS, executeProjectTool } from './project-tools.js';
import { EDITOR_TOOLS, executeEditorTool } from './editor-tools.js';
import { activeSession, beginSessionRun, assertProjectIdle, repairSessionProviders, rollbackSession, appendMessage, conversationContext, createSession, deleteSession, listSessions, switchSession, updateSessionProvider } from './workspace.js';
import { runTerminal, type TerminalShell } from './terminal.js';
import { analyzeAnimation, createAnimationController, optimizeAnimation, recognizeAnimationStates } from './animation.js';
import { analyzeMath } from './math.js';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const MCP_TOOLS: McpToolDefinition[] = [
  ...EDITOR_TOOLS,
  ...PROJECT_TOOLS.filter(tool => ['script_read', 'script_write', 'project_test'].includes(tool.name)),
  {
    name: 'ocr_recognize',
    description: 'OCR 识别当前项目内图像或场景区域',
    inputSchema: {
      type: 'object',
      properties: {
        image: { type: 'string' },
        region: { type: 'string' },
        engine: { type: 'string', enum: ['windows-ocr', 'tesseract-js', 'external'] },
      },
      required: ['image'],
    },
  },
  {
    name: 'scene_read',
    description: '读取 Scene/Prefab JSON',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'scene_write',
    description: '校验并写入 Scene/Prefab JSON（自动备份）',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        json: { type: 'string' },
      },
      required: ['path', 'json'],
    },
  },
  {
    name: 'scene_nodes',
    description: '列出 Scene/Prefab 节点树',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'asset_find',
    description: '检索当前项目素材库',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        type: { type: 'string' },
        dir: { type: 'string' },
      },
    },
  },
  {
    name: 'ccs_resolve',
    description: '解析 cc-switch/ccs 路由',
    inputSchema: {
      type: 'object',
      properties: { route: { type: 'string' } },
    },
  },
  {
    name: 'ccs_connect',
    description: '按 ccs 路由模式建立直连',
    inputSchema: {
      type: 'object',
      properties: { route: { type: 'string' }, url: { type: 'string', description: '独立的 http://ip:port 或 ws://ip:port/ws 端点' } },
    },
  },
  {
    name: 'ccs_doctor',
    description: '检查 cc-switch 配置、ccs 路由与当前 Creator 环境',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'gateway_chat',
    description: '通过 WSS 长连接发送 Chat Completions 请求',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        chat: { type: 'string' },
      },
      required: ['chat'],
    },
  },
  {
    name: 'workspace_chat',
    description: '当前工作区 Agent 对话，始终启用有界项目工具执行（兼容旧 mode 参数）',
    inputSchema: { type: 'object', properties: { chat: { type: 'string', maxLength: 32000 }, mode: { type: 'string', enum: ['chat', 'agent'], default: 'agent' } }, required: ['chat'], additionalProperties: false },
  },
  {
    name: 'workspace_list',
    description: '列出模型工作区会话并标识当前会话',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'workspace_create',
    description: '创建并切换模型工作区会话',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, provider: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'workspace_switch',
    description: '切换当前模型工作区会话',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'workspace_delete',
    description: '删除非默认模型工作区会话',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'workspace_rollback', description: '截断指定用户消息及其后续消息，返回待编辑草稿；不回滚项目文件',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, messageIndex: { type: 'integer', minimum: 0 }, expectedMessage: { type: 'object', properties: { content: { type: 'string' }, timeUtc8: { type: 'string' } }, required: ['content', 'timeUtc8'], additionalProperties: false } }, required: ['id', 'messageIndex'], additionalProperties: false },
  },
  {
    name: 'provider_delete', description: '删除自定义提供商及凭据并修复全部会话引用；项目运行时禁止',
    inputSchema: { type: 'object', properties: { provider: { type: 'string' } }, required: ['provider'], additionalProperties: false },
  },
  {
    name: 'provider_list',
    description: '列出 OpenAI、Anthropic、DeepSeek、Kimi、Qwen 和 Gateway 配置状态',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'provider_configure',
    description: '配置端点、模型、协议和用户级加密保存的 API Key（绝不在响应中返回密钥）',
    inputSchema: { type: 'object', properties: { provider: { type: 'string' }, endpoint: { type: 'string' }, model: { type: 'string' }, protocol: { type: 'string', enum: ['chat-completions', 'responses'] }, apiKey: { type: 'string' } }, required: ['provider'] },
  },
  {
    name: 'provider_create',
    description: '创建第三方 OpenAI 兼容提供商，返回非密钥元数据',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, endpoint: { type: 'string' }, model: { type: 'string' }, protocol: { type: 'string', enum: ['chat-completions', 'responses'] }, apiKey: { type: 'string' } }, required: ['name', 'endpoint', 'model', 'protocol'] },
  },
  {
    name: 'provider_credential_clear',
    description: '删除该项目该提供商在用户凭据库中的 API Key（不影响环境变量）',
    inputSchema: { type: 'object', properties: { provider: { type: 'string' } }, required: ['provider'] },
  },
  {
    name: 'provider_select',
    description: '为当前会话选择模型提供商',
    inputSchema: { type: 'object', properties: { provider: { type: 'string' } }, required: ['provider'] },
  },
  {
    name: 'agent_config',
    description: '读取或设置语言、权限模式、默认提供商和回退链',
    inputSchema: { type: 'object', properties: { locale: { type: 'string' }, permissionMode: { type: 'string' }, activeProvider: { type: 'string' }, fallbackProviders: { type: 'array', items: { type: 'string' } } } },
  },
  {
    name: 'skills_list',
    description: '列出当前项目内启用的 Skills',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'mcp_status',
    description: '返回 MCP 服务工具清单',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'terminal_run',
    description: '在当前项目根目录通过 cmd、PowerShell 或 Windows Terminal 执行命令',
    inputSchema: { type: 'object', properties: { shell: { type: 'string', enum: ['cmd', 'powershell', 'wt'] }, command: { type: 'string' }, dryRun: { type: 'boolean' } }, required: ['shell', 'command'] },
  },
  {
    name: 'animation_analyze',
    description: '只读分析当前项目内的 Cocos AnimationClip (.anim)',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'animation_optimize',
    description: '基于 AnimationClip 结构生成非破坏性动作优化建议',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'animation_ocr_states',
    description: '通过 OCR 从当前项目截图提取动画状态候选',
    inputSchema: { type: 'object', properties: { image: { type: 'string' }, region: { type: 'string' }, engine: { type: 'string' } }, required: ['image'] },
  },
  {
    name: 'animation_create_controller',
    description: '生成使用 Cocos Animation 公开 API 的状态控制器脚本',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, className: { type: 'string' }, definition: { type: 'object' } }, required: ['path', 'className', 'definition'] },
  },
  {
    name: 'math_analyze',
    description: '只读分析当前 Cocos 项目内 TypeScript、JavaScript、C/C++ 的 Transform、Ray 与向量计算',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
  },
  {
    name: 'task_hash',
    description: '计算任务 hash',
    inputSchema: {
      type: 'object',
      properties: { request: { type: 'string' } },
      required: ['request'],
    },
  },
  {
    name: 'memory_write',
    description: '写入 LONG_MEMORY 与 SHORT_MEMORY',
    inputSchema: {
      type: 'object',
      properties: {
        hash: { type: 'string' },
        request: { type: 'string' },
        reasoning: { type: 'string' },
        result: { type: 'string' },
      },
      required: ['hash', 'request'],
    },
  },
];

export function buildMemoryContext(root: string): string {
  const file = path.join(root, 'SHORT_MEMORY.md');
  if (!fs.existsSync(file)) {
    return 'Cocos Agent';
  }
  const text = fs.readFileSync(file, 'utf8');
  return text.slice(-2000);
}

export function statusReport(ctx: ProjectContext): Record<string, unknown> {
  const skills = loadSkills(ctx.root);
  const config = loadAgentConfig(ctx.root);
  const workspace = listSessions(ctx.root);
  return {
    projectRoot: ctx.root,
    version: AGENT_VERSION,
    timeUtc8: nowUtc8(),
    skills: skills.map((skill) => skill.name),
    locale: config.locale,
    locales: localeCatalog(),
    permissions: permissionSummary(config.permissionMode),
    activeProvider: config.activeProvider,
    fallbackProviders: config.fallbackProviders,
    providers: providerCatalog(ctx.root),
    activeSessionId: workspace.activeSessionId,
    sessions: workspace.sessions.map((session) => ({ id: session.id, name: session.name, provider: session.provider, updatedUtc8: session.updatedUtc8 })),
    longMemoryEntries: countLongMemory(ctx.root),
    memoryFiles: ['LONG_MEMORY.md', 'SHORT_MEMORY.md'],
    mcpTools: MCP_TOOLS.map((tool) => tool.name),
  };
}

export async function dispatchTool(
  ctx: ProjectContext,
  tool: string,
  args: Record<string, unknown>,
  options: { allowUserPermissionChange?: boolean } = {},
): Promise<unknown> {
  // This dedicated dispatch is never included in the Agent's project/editor allowlist.
  if (tool === 'permission_set') {
    if (options.allowUserPermissionChange !== true) throw new Error('PERMISSION_SET_UI_ONLY');
    if (Object.keys(args).some(key => key !== 'mode' && key !== 'userInitiated')) throw new Error('PERMISSION_SET_INVALID');
    const previous = loadAgentConfig(ctx.root);
    const current = setUserPermission(ctx.root, args.mode, args.userInitiated);
    return { previous, current, permissions: permissionSummary(current.permissionMode) };
  }
  assertToolPermission(ctx.root, tool);
  switch (tool) {
    case 'status':
      return statusReport(ctx);
    case 'task_hash':
      return {
        hash: `sha256:${computeTaskHash({
          projectRoot: ctx.root,
          request: String(args.request ?? ''),
          utc8Start: nowUtc8(),
        })}`,
      };
    case 'ocr_recognize':
      return runOcr(
        ctx.root,
        String(args.image),
        args.region ? String(args.region) : undefined,
        args.engine ? (String(args.engine) as OcrEngine) : undefined,
      );
    case 'scene_read':
      return readScene(ctx.root, String(args.path));
    case 'scene_nodes':
      return listNodes(ctx.root, String(args.path));
    case 'scene_write':
      writeScene(ctx.root, String(args.path), String(args.json));
      return { ok: true };
    case 'asset_find':
      return findAssets(
        ctx.root,
        String(args.query ?? ''),
        args.type ? String(args.type) : undefined,
        args.dir ? String(args.dir) : undefined,
      );
    case 'ccs_resolve':
      return resolveRoute(args.route ? String(args.route) : undefined);
    case 'ccs_connect':
      return connectRoute(args.route ? String(args.route) : undefined, args.url ? String(args.url) : undefined);
    case 'ccs_doctor':
      return ccsDoctor(ctx.root);
    case 'gateway_chat': {
      const gateway = resolveProvider(ctx.root, 'gateway');
      const requestedUrl = args.url ? String(args.url) : gateway.endpoint;
      if (!requestedUrl) throw new Error('PROVIDER_ENDPOINT_REQUIRED: configure gateway endpoint');
      if (loadAgentConfig(ctx.root).permissionMode !== 'full-access' && requestedUrl !== gateway.endpoint) {
        throw new Error('PERMISSION_DENIED: only-safe gateway_chat requires the configured gateway endpoint');
      }
      return chatOnce({
        url: requestedUrl,
        token: providerToken(ctx.root, 'gateway', gateway.tokenEnv),
        chat: String(args.chat ?? ''),
        memoryContext: buildMemoryContext(ctx.root),
        model: gateway.model,
      });
    }
    case 'workspace_list':
      return listSessions(ctx.root);
    case 'workspace_create':
      return createSession(ctx.root, String(args.name ?? ''), args.provider ? String(args.provider) as never : undefined);
    case 'workspace_switch':
      return switchSession(ctx.root, String(args.id ?? ''));
    case 'workspace_delete':
      return deleteSession(ctx.root, String(args.id ?? ''));
    case 'workspace_rollback':
      if (Object.keys(args).some(key => key !== 'id' && key !== 'messageIndex' && key !== 'expectedMessage')) throw new Error('WORKSPACE_ROLLBACK_INVALID');
      return rollbackSession(ctx.root, args.id, args.messageIndex, args.expectedMessage);
    case 'provider_delete': {
      assertProjectIdle(ctx.root);
      const config = loadAgentConfig(ctx.root); const id = args.provider;
      if (!isProviderId(id, ctx.root)) throw new Error('PROVIDER_NOT_SUPPORTED');
      if (!config.customProviders.some(provider => provider.id === id)) throw new Error('PROVIDER_DELETE_BUILTIN: built-in providers cannot be deleted');
      const replacement = config.activeProvider === id ? config.fallbackProviders.find(provider => provider !== id) ?? 'gateway' : config.activeProvider;
      // Compute every repair before deleting credentials, including inactive sessions.
      repairSessionProviders(ctx.root, id, replacement, true);
      const snapshots = ['workspace.json', 'config.json'].map(name => { const file = path.join(ctx.root, '.cocos-agent', name); return { file, content: fs.existsSync(file) ? fs.readFileSync(file) : undefined }; });
      const restoreCredential = clearProviderCredential(ctx.root, id);
      try {
        const workspace = repairSessionProviders(ctx.root, id, replacement);
        const providers = { ...config.providers }; delete providers[id];
        const current = saveAgentConfig(ctx.root, { customProviders: config.customProviders.filter(provider => provider.id !== id), providers, activeProvider: replacement, fallbackProviders: config.fallbackProviders.filter(provider => provider !== id && provider !== replacement) });
        return { deleted: id, config: current, ...workspace };
      } catch (error) {
        const rollbackErrors: string[] = [];
        for (const snapshot of snapshots) try { if (snapshot.content === undefined) fs.rmSync(snapshot.file, { force: true }); else fs.writeFileSync(snapshot.file, snapshot.content); } catch { rollbackErrors.push('project state'); }
        try { restoreCredential(); } catch { rollbackErrors.push('credential'); }
        if (rollbackErrors.length) throw new Error(`PROVIDER_DELETE_ROLLBACK_FAILED: could not restore ${rollbackErrors.join(', ')}; ${(error as Error).message}`);
        throw error;
      }
    }
    case 'provider_list':
      return providerCatalog(ctx.root);
    case 'provider_configure': {
      const id = args.provider;
      if (!isProviderId(id, ctx.root)) throw new Error('PROVIDER_NOT_SUPPORTED');
      if (args.apiKey !== undefined) validateProviderCredential(args.apiKey);
      if (args.apiKey !== undefined && process.platform !== 'win32') throw new Error('PROVIDER_CREDENTIAL_STORAGE_UNAVAILABLE');
      if (args.endpoint !== undefined && typeof args.endpoint !== 'string') throw new Error('PROVIDER_ENDPOINT_INVALID');
      if (args.model !== undefined && typeof args.model !== 'string') throw new Error('PROVIDER_MODEL_INVALID');
      if (args.endpoint !== undefined || args.model !== undefined || args.protocol !== undefined) {
        updateProvider(ctx.root, id, { endpoint: args.endpoint as string | undefined, model: args.model as string | undefined, protocol: args.protocol as never });
      }
      if (args.apiKey !== undefined) saveProviderCredential(ctx.root, id, args.apiKey);
      return providerCatalog(ctx.root).find((provider) => provider.id === id);
    }
    case 'provider_create': {
      if (args.apiKey !== undefined) validateProviderCredential(args.apiKey);
      if (args.apiKey !== undefined && process.platform !== 'win32') throw new Error('PROVIDER_CREDENTIAL_STORAGE_UNAVAILABLE');
      const provider = createCustomProvider(ctx.root, { name: args.name as string, endpoint: args.endpoint as string, model: args.model as string, protocol: args.protocol as never });
      try {
        if (args.apiKey !== undefined) saveProviderCredential(ctx.root, provider.id, args.apiKey);
      } catch {
        const config = loadAgentConfig(ctx.root);
        saveAgentConfig(ctx.root, { customProviders: config.customProviders.filter((item) => item.id !== provider.id) });
        throw new Error('PROVIDER_CREDENTIAL_STORAGE_UNAVAILABLE');
      }
      return providerCatalog(ctx.root).find((item) => item.id === provider.id);
    }
    case 'provider_credential_clear': {
      const id = args.provider;
      if (!isProviderId(id, ctx.root)) throw new Error('PROVIDER_NOT_SUPPORTED');
      clearProviderCredential(ctx.root, id);
      return providerCatalog(ctx.root).find((provider) => provider.id === id);
    }
    case 'provider_select':
      return updateSessionProvider(ctx.root, String(args.provider ?? '') as never);
    case 'agent_config': {
      const current = loadAgentConfig(ctx.root);
      const next = saveAgentConfig(ctx.root, {
        locale: args.locale as never,
        permissionMode: args.permissionMode as PermissionMode,
        activeProvider: args.activeProvider as never,
        fallbackProviders: Array.isArray(args.fallbackProviders) ? args.fallbackProviders as never : undefined,
      });
      return { previous: current, current: next, permissions: permissionSummary(next.permissionMode) };
    }
    case 'skills_list':
      return loadSkills(ctx.root);
    case 'skills_show':
      return { file: skillManifest(ctx.root, String(args.name ?? '')) };
    case 'mcp_status':
      return { name: 'cocos-agent', tools: MCP_TOOLS.map((item) => item.name) };
    case 'editor_scene_query':
    case 'editor_node_create':
      return executeEditorTool(ctx.root, tool, args);
    case 'script_read':
    case 'script_write':
    case 'project_test':
      return executeProjectTool(ctx.root, tool, args);
    case 'terminal_run':
      return runTerminal(ctx.root, String(args.shell ?? '') as TerminalShell, String(args.command ?? ''), args.dryRun === true);
    case 'workspace_chat': {
      const session = activeSession(ctx.root);
      const config = loadAgentConfig(ctx.root);
      const chat = String(args.chat ?? '').trim();
      if (!chat) throw new Error('MISSING_ARG: chat');
      if (chat.length > 32000) throw new Error('WORKSPACE_CHAT_LIMIT');
      if (args.mode !== undefined && args.mode !== 'chat' && args.mode !== 'agent') throw new Error('WORKSPACE_MODE_INVALID');
      const release = beginSessionRun(ctx.root, session.id);
      try {
        const memoryContext = `${buildMemoryContext(ctx.root)}\n${conversationContext(session)}`;
        appendMessage(ctx.root, session.id, { role: 'user', content: chat, timeUtc8: nowUtc8() });
        const options = { root: ctx.root, provider: session.provider, fallbacks: session.fallbackProviders, chat, memoryContext, locale: config.locale };
        const result = await agentWithFallback({ ...options, tools: [...PROJECT_TOOLS, ...EDITOR_TOOLS], execute: (name, toolArgs) => EDITOR_TOOLS.some(tool => tool.name === name) ? executeEditorTool(ctx.root, name, toolArgs) : executeProjectTool(ctx.root, name, toolArgs) });
        const toolTrace = 'toolTrace' in result ? result.toolTrace as import('./agent-runner.js').ToolTrace[] : [];
        appendMessage(ctx.root, session.id, { role: 'assistant', content: result.content, timeUtc8: nowUtc8(), provider: result.provider, toolTrace });
        return { sessionId: session.id, ...result, toolTrace };
      } finally { release(); }
    }
    case 'animation_analyze':
      return analyzeAnimation(ctx.root, String(args.path ?? ''));
    case 'animation_optimize':
      return optimizeAnimation(analyzeAnimation(ctx.root, String(args.path ?? '')));
    case 'animation_ocr_states':
      return recognizeAnimationStates(
        ctx.root,
        String(args.image ?? ''),
        args.region ? String(args.region) : undefined,
        args.engine ? String(args.engine) as OcrEngine : undefined,
      );
    case 'animation_create_controller':
      return createAnimationController(
        ctx.root,
        String(args.path ?? ''),
        String(args.className ?? ''),
        args.definition,
      );
    case 'math_analyze':
      return analyzeMath(ctx.root, args.path ? String(args.path) : undefined);
    case 'memory_write':
      return writeExecution(ctx.root, args as unknown as ExecutionRecord);
    default:
      throw new Error(`UNKNOWN_TOOL: ${tool}`);
  }
}
