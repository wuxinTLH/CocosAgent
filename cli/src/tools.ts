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
import { loadAgentConfig, saveAgentConfig, updateProvider, type PermissionMode } from './config.js';
import { localeCatalog } from './i18n.js';
import { assertToolPermission, permissionSummary } from './permissions.js';
import { providerCatalog, chatWithFallback, resolveProvider } from './providers.js';
import { activeSession, appendMessage, conversationContext, createSession, deleteSession, listSessions, switchSession, updateSessionProvider } from './workspace.js';
import { runTerminal, type TerminalShell } from './terminal.js';
import { analyzeAnimation, createAnimationController, optimizeAnimation, recognizeAnimationStates } from './animation.js';
import { analyzeMath } from './math.js';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const MCP_TOOLS: McpToolDefinition[] = [
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
      properties: { route: { type: 'string' } },
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
    description: '使用当前模型工作区会话对话，并按配置自动回退提供商',
    inputSchema: { type: 'object', properties: { chat: { type: 'string' } }, required: ['chat'] },
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
    name: 'provider_list',
    description: '列出 OpenAI、Anthropic、DeepSeek、Kimi、Qwen 和 Gateway 配置状态',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'provider_configure',
    description: '配置提供商的 API 端点或默认模型，令牌仅从环境变量读取',
    inputSchema: { type: 'object', properties: { provider: { type: 'string' }, endpoint: { type: 'string' }, model: { type: 'string' } }, required: ['provider'] },
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
): Promise<unknown> {
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
      return connectRoute(args.route ? String(args.route) : undefined);
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
        token: process.env.COCOS_AGENT_GATEWAY_TOKEN,
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
    case 'provider_list':
      return providerCatalog(ctx.root);
    case 'provider_configure':
      return updateProvider(ctx.root, String(args.provider ?? '') as never, {
        endpoint: args.endpoint ? String(args.endpoint) : undefined,
        model: args.model ? String(args.model) : undefined,
      });
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
    case 'terminal_run':
      return runTerminal(ctx.root, String(args.shell ?? '') as TerminalShell, String(args.command ?? ''), args.dryRun === true);
    case 'workspace_chat': {
      const session = activeSession(ctx.root);
      const config = loadAgentConfig(ctx.root);
      const chat = String(args.chat ?? '').trim();
      if (!chat) throw new Error('MISSING_ARG: chat');
      appendMessage(ctx.root, session.id, { role: 'user', content: chat, timeUtc8: nowUtc8() });
      const result = await chatWithFallback({
        root: ctx.root, provider: session.provider, fallbacks: session.fallbackProviders, chat,
        memoryContext: `${buildMemoryContext(ctx.root)}\n${conversationContext(activeSession(ctx.root))}`,
        locale: config.locale,
      });
      appendMessage(ctx.root, session.id, { role: 'assistant', content: result.content, timeUtc8: nowUtc8(), provider: result.provider });
      return { sessionId: session.id, ...result };
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
