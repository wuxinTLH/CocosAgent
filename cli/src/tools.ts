import fs from 'node:fs';
import path from 'node:path';
import type { ProjectContext } from './context.js';
import { computeTaskHash } from './hash.js';
import { countLongMemory, nowUtc8, writeExecution, type ExecutionRecord } from './memory.js';
import { loadSkills } from './skills.js';
import { runOcr, type OcrEngine } from './ocr.js';
import { listNodes, readScene, writeScene } from './scene.js';
import { findAssets } from './assets.js';
import { connectRoute, resolveRoute } from './ccs.js';
import { chatOnce } from './gateway.js';

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
        engine: { type: 'string', enum: ['tesseract-js', 'external'] },
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
  return {
    projectRoot: ctx.root,
    timeUtc8: nowUtc8(),
    skills: skills.map((skill) => skill.name),
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
    case 'gateway_chat':
      return chatOnce({
        url: String(args.url ?? process.env.COCOS_AGENT_GATEWAY_URL ?? ''),
        token: process.env.COCOS_AGENT_GATEWAY_TOKEN,
        chat: String(args.chat ?? ''),
        memoryContext: buildMemoryContext(ctx.root),
      });
    case 'memory_write':
      return writeExecution(ctx.root, args as unknown as ExecutionRecord);
    default:
      throw new Error(`UNKNOWN_TOOL: ${tool}`);
  }
}
