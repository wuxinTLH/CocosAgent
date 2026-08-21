import fs from 'node:fs';
import { loadContext } from './context.js';
import { computeTaskHash } from './hash.js';
import { nowUtc8, writeExecution, type ExecutionRecord } from './memory.js';
import { loadSkills, skillManifest } from './skills.js';
import { runOcr } from './ocr.js';
import { listNodes, readScene, writeScene } from './scene.js';
import { findAssets } from './assets.js';
import { ccsDoctor, connectRoute, resolveRoute } from './ccs.js';
import { chatOnce, keepAlive } from './gateway.js';
import { startMockGateway } from './gateway-mock.js';
import { checkDocLinks } from './check-docs.js';
import { initProjectConstraints } from './project.js';
import { runMcpServer } from './mcp.js';
import { startBridge } from './bridge.js';
import { buildMemoryContext, dispatchTool, statusReport } from './tools.js';
import { resolveInside } from './sandbox.js';

interface ParsedArgs {
  flags: Record<string, string | boolean>;
  positional: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        index += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function requireString(args: ParsedArgs, key: string): string {
  const value = args.flags[key];
  if (typeof value !== 'string' || !value) {
    throw new Error(`MISSING_ARG: --${key}`);
  }
  return value;
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;
  const ctx = loadContext();
  const [sub, ...subRest] = rest;
  const args = parseArgs(subRest);

  switch (command) {
    case 'status':
      console.log(JSON.stringify(statusReport(ctx), null, 2));
      break;
    case 'hash': {
      const request = String(args.flags.request ?? args.positional[0] ?? '');
      if (!request) {
        throw new Error('MISSING_ARG: --request');
      }
      const hash = computeTaskHash({ projectRoot: ctx.root, request, utc8Start: nowUtc8() });
      console.log(`sha256:${hash}`);
      break;
    }
    case 'run': {
      const request = requireString(args, 'request');
      const startUtc8 = nowUtc8();
      const hash = computeTaskHash({ projectRoot: ctx.root, request, utc8Start: startUtc8 });
      const plan = String(
        args.flags.plan ??
          'WF-01 上下文分析,WF-02 计划,WF-03 执行,WF-04 验证,WF-05 审查,WF-06 记忆写入',
      )
        .split(',')
        .map((step) => step.trim())
        .filter(Boolean);
      const record: ExecutionRecord = {
        id: '',
        hash,
        startUtc8,
        endUtc8: nowUtc8(),
        request,
        reasoning: String(args.flags.reasoning ?? 'CLI run 按 WorkFlow 记录执行'),
        plan,
        timeline: [
          { time: startUtc8, event: '任务开始' },
          { time: nowUtc8(), event: '任务结束' },
        ],
        result: String(args.flags.result ?? '已通过 CLI run 记录执行'),
        files: [],
        nextSteps: [],
      };
      const saved = writeExecution(ctx.root, record);
      console.log(JSON.stringify(saved, null, 2));
      break;
    }
    case 'skills':
      if (sub === 'list') {
        console.log(JSON.stringify(loadSkills(ctx.root), null, 2));
      } else if (sub === 'run') {
        const name = args.positional[0];
        if (!name) {
          throw new Error('MISSING_ARG: skill name');
        }
        console.log(skillManifest(ctx.root, name));
      } else {
        throw new Error(`UNKNOWN_SUBCOMMAND: skills ${sub ?? ''}`);
      }
      break;
    case 'ocr':
      if (sub !== 'capture') {
        throw new Error(`UNKNOWN_SUBCOMMAND: ocr ${sub ?? ''}`);
      }
      const ocrResult = await runOcr(
        ctx.root,
        requireString(args, 'image'),
        args.flags.region ? String(args.flags.region) : undefined,
        args.flags.engine
          ? (String(args.flags.engine) as 'external' | 'tesseract-js' | 'windows-ocr')
          : undefined,
      );
      console.log(JSON.stringify(ocrResult, null, 2));
      break;
    case 'scene':
      if (sub === 'read') {
        console.log(JSON.stringify(readScene(ctx.root, scenePath(args)), null, 2));
      } else if (sub === 'nodes') {
        console.log(JSON.stringify(listNodes(ctx.root, scenePath(args)), null, 2));
      } else if (sub === 'write') {
        const relPath = scenePath(args);
        const jsonValue = args.flags.json
          ? String(args.flags.json)
          : args.flags['json-file']
            ? fs.readFileSync(resolveInside(ctx.root, String(args.flags['json-file'])), 'utf8')
            : '';
        if (!jsonValue) {
          throw new Error('MISSING_ARG: --json or --json-file');
        }
        writeScene(ctx.root, relPath, jsonValue);
        console.log(JSON.stringify({ ok: true, path: relPath }, null, 2));
      } else {
        throw new Error(`UNKNOWN_SUBCOMMAND: scene ${sub ?? ''}`);
      }
      break;
    case 'assets':
      if (sub !== 'find') {
        throw new Error(`UNKNOWN_SUBCOMMAND: assets ${sub ?? ''}`);
      }
      console.log(
        JSON.stringify(
          findAssets(
            ctx.root,
            args.flags.query ? String(args.flags.query) : '',
            args.flags.type ? String(args.flags.type) : undefined,
            args.flags.dir ? String(args.flags.dir) : undefined,
          ),
          null,
          2,
        ),
      );
      break;
    case 'ccs':
      if (sub === 'resolve') {
        console.log(JSON.stringify(resolveRoute(args.flags.route ? String(args.flags.route) : undefined), null, 2));
      } else if (sub === 'connect') {
        console.log(JSON.stringify(await connectRoute(args.flags.route ? String(args.flags.route) : undefined), null, 2));
      } else if (sub === 'doctor') {
        console.log(JSON.stringify(ccsDoctor(ctx.root), null, 2));
      } else {
        throw new Error(`UNKNOWN_SUBCOMMAND: ccs ${sub ?? ''}`);
      }
      break;
    case 'gateway':
      if (sub === 'mock') {
        const port = Number(args.flags.port ?? 8787);
        const dropAfter = Number(args.flags['drop-after'] ?? 0);
        const server = startMockGateway(port, {
          dropAfterMessages: Number.isFinite(dropAfter) && dropAfter > 0 ? dropAfter : undefined,
        });
        console.log(`mock gateway listening on ws://127.0.0.1:${port}/ws`);
        process.on('SIGINT', () => {
          server.close();
          process.exit(0);
        });
        break;
      }
      if (sub !== 'connect') {
        throw new Error(`UNKNOWN_SUBCOMMAND: gateway ${sub ?? ''}`);
      }
      {
        const url = String(args.flags.url ?? process.env.COCOS_AGENT_GATEWAY_URL ?? '');
        if (!url) {
          throw new Error('MISSING_ARG: --url or COCOS_AGENT_GATEWAY_URL');
        }
        const token = process.env.COCOS_AGENT_GATEWAY_TOKEN;
        const allowSelfSigned = args.flags.insecure === true;
        if (args.flags.chat) {
          const result = await chatOnce({
            url,
            token,
            chat: String(args.flags.chat),
            memoryContext: buildMemoryContext(ctx.root),
            allowSelfSigned,
          });
          console.log(JSON.stringify(result, null, 2));
        } else {
          await keepAlive({
            url,
            token,
            allowSelfSigned,
            onEvent: (event) => console.log(JSON.stringify(event)),
          });
        }
      }
      break;
    case 'provider':
      if (sub === 'list') {
        console.log(JSON.stringify(await dispatchTool(ctx, 'provider_list', {}), null, 2));
      } else if (sub === 'select') {
        console.log(JSON.stringify(await dispatchTool(ctx, 'provider_select', { provider: requireString(args, 'provider') }), null, 2));
      } else if (sub === 'configure') {
        const result = await dispatchTool(ctx, 'provider_configure', {
          provider: requireString(args, 'provider'),
          endpoint: args.flags.endpoint ? String(args.flags.endpoint) : undefined,
          model: args.flags.model ? String(args.flags.model) : undefined,
        });
        console.log(JSON.stringify(result, null, 2));
      } else {
        throw new Error(`UNKNOWN_SUBCOMMAND: provider ${sub ?? ''}`);
      }
      break;
    case 'agent':
      if (sub !== 'config') throw new Error(`UNKNOWN_SUBCOMMAND: agent ${sub ?? ''}`);
      console.log(JSON.stringify(await dispatchTool(ctx, 'agent_config', {
        locale: args.flags.locale ? String(args.flags.locale) : undefined,
        permissionMode: args.flags.permission ? String(args.flags.permission) : undefined,
        activeProvider: args.flags.provider ? String(args.flags.provider) : undefined,
        fallbackProviders: args.flags.fallback ? String(args.flags.fallback).split(',').map((item) => item.trim()) : undefined,
      }), null, 2));
      break;
    case 'workspace':
      if (sub === 'list') {
        console.log(JSON.stringify(await dispatchTool(ctx, 'workspace_list', {}), null, 2));
      } else if (sub === 'new') {
        console.log(JSON.stringify(await dispatchTool(ctx, 'workspace_create', { name: requireString(args, 'name'), provider: args.flags.provider ? String(args.flags.provider) : undefined }), null, 2));
      } else if (sub === 'switch') {
        console.log(JSON.stringify(await dispatchTool(ctx, 'workspace_switch', { id: requireString(args, 'id') }), null, 2));
      } else if (sub === 'delete') {
        console.log(JSON.stringify(await dispatchTool(ctx, 'workspace_delete', { id: requireString(args, 'id') }), null, 2));
      } else if (sub === 'chat') {
        console.log(JSON.stringify(await dispatchTool(ctx, 'workspace_chat', { chat: requireString(args, 'chat') }), null, 2));
      } else {
        throw new Error(`UNKNOWN_SUBCOMMAND: workspace ${sub ?? ''}`);
      }
      break;
    case 'animation':
      if (sub === 'analyze') {
        console.log(JSON.stringify(await dispatchTool(ctx, 'animation_analyze', { path: scenePath(args) }), null, 2));
      } else if (sub === 'optimize') {
        console.log(JSON.stringify(await dispatchTool(ctx, 'animation_optimize', { path: scenePath(args) }), null, 2));
      } else if (sub === 'ocr') {
        console.log(JSON.stringify(await dispatchTool(ctx, 'animation_ocr_states', {
          image: requireString(args, 'image'),
          region: args.flags.region ? String(args.flags.region) : undefined,
          engine: args.flags.engine ? String(args.flags.engine) : undefined,
        }), null, 2));
      } else if (sub === 'controller') {
        const definition = args.flags.definition ? JSON.parse(String(args.flags.definition)) : JSON.parse(fs.readFileSync(resolveInside(ctx.root, requireString(args, 'definition-file')), 'utf8'));
        console.log(JSON.stringify(await dispatchTool(ctx, 'animation_create_controller', {
          path: requireString(args, 'path'),
          className: requireString(args, 'class'),
          definition,
        }), null, 2));
      } else {
        throw new Error(`UNKNOWN_SUBCOMMAND: animation ${sub ?? ''}`);
      }
      break;
    case 'math':
      if (sub !== 'analyze') throw new Error(`UNKNOWN_SUBCOMMAND: math ${sub ?? ''}`);
      console.log(JSON.stringify(await dispatchTool(ctx, 'math_analyze', { path: args.flags.path ? String(args.flags.path) : undefined }), null, 2));
      break;
    case 'terminal':
      if (sub !== 'run') throw new Error(`UNKNOWN_SUBCOMMAND: terminal ${sub ?? ''}`);
      console.log(JSON.stringify(await dispatchTool(ctx, 'terminal_run', {
        shell: requireString(args, 'shell'), command: requireString(args, 'command'), dryRun: args.flags['dry-run'] === true,
      }), null, 2));
      break;    case 'mcp':
      await runMcpServer();
      break;
    case 'bridge': {
      if (sub !== 'start') {
        throw new Error(`UNKNOWN_SUBCOMMAND: bridge ${sub ?? ''}`);
      }
      const port = Number(args.flags.port ?? 8899);
      const server = startBridge(port, ctx);
      console.log(`bridge listening on ws://127.0.0.1:${port}/ws`);
      process.on('SIGINT', () => {
        server.close();
        process.exit(0);
      });
      break;
    }
    case 'docs':
      if (sub !== 'check') {
        throw new Error(`UNKNOWN_SUBCOMMAND: docs ${sub ?? ''}`);
      }
      {
        const result = checkDocLinks(ctx.root);
        console.log(JSON.stringify(result, null, 2));
        if (result.issues.length > 0) {
          process.exitCode = 1;
        }
      }
      break;
    case 'project':
      if (sub !== 'init') {
        throw new Error(`UNKNOWN_SUBCOMMAND: project ${sub ?? ''}`);
      }
      {
        const name = String(args.flags.name ?? args.positional[0] ?? '');
        const targetRoot = args.flags.root
          ? resolveInside(ctx.root, String(args.flags.root))
          : ctx.root;
        const creatorVersion = args.flags['creator-version']
          ? String(args.flags['creator-version'])
          : undefined;
        const target = initProjectConstraints(ctx.root, name, targetRoot, creatorVersion);
        console.log(JSON.stringify({ ok: true, file: target }, null, 2));
      }
      break;
    default:
      throw new Error(`UNKNOWN_COMMAND: ${command ?? ''}`);
  }
}

function scenePath(args: ParsedArgs): string {
  const value = String(args.positional[0] ?? args.flags.path ?? '');
  if (!value) {
    throw new Error('MISSING_ARG: path');
  }
  return value;
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
