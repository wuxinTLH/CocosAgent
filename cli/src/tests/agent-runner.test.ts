import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { runAgent, AGENT_LIMITS, type AgentRunResult } from '../agent-runner.js';
import { agentWithFallback } from '../providers.js';
import { saveAgentConfig, updateProvider } from '../config.js';
import { executeProjectTool, PROJECT_TOOLS } from '../project-tools.js';
import { dispatchTool } from '../tools.js';
import { activeSession } from '../workspace.js';

const root = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cocos-agent-loop-'));
const tool = { name: 'script_write', description: 'write', inputSchema: { type: 'object' } };
function allowFullAccess(directory: string): void {
  const before = process.env.COCOS_AGENT_PERMISSION_ELEVATION;
  process.env.COCOS_AGENT_PERMISSION_ELEVATION = 'full-access';
  try { saveAgentConfig(directory, { permissionMode: 'full-access', activeProvider: 'openai', fallbackProviders: [] }); }
  finally { if (before === undefined) delete process.env.COCOS_AGENT_PERMISSION_ELEVATION; else process.env.COCOS_AGENT_PERMISSION_ELEVATION = before; }
}
test('all three protocols send actual tool outputs back to a local endpoint; workspace persists trace', async () => {
  const directory = root(); const requests: Array<{ url: string; body: Record<string, unknown> }> = []; let turn = 0;
  const oldOpenai = process.env.COCOS_AGENT_OPENAI_API_KEY; const oldAnthropic = process.env.COCOS_AGENT_ANTHROPIC_API_KEY;
  process.env.COCOS_AGENT_OPENAI_API_KEY = 'mock-secret'; process.env.COCOS_AGENT_ANTHROPIC_API_KEY = 'mock-secret';
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString()); requests.push({ url: req.url ?? '', body });
    const first = turn++ === 0; const args = { path: 'assets/Generated.ts', content: 'export const generated = true;' };
    const payload = req.url?.endsWith('/messages')
      ? { stop_reason: first ? 'tool_use' : 'end_turn', content: first ? [{ type: 'tool_use', id: 'c1', name: 'script_write', input: args }] : [{ type: 'text', text: 'done' }] }
      : req.url?.endsWith('/responses')
        ? { status: 'completed', output: first ? [{ type: 'function_call', call_id: 'c1', name: 'script_write', arguments: JSON.stringify(args) }] : [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'done' }] }] }
        : { choices: [{ finish_reason: first ? 'tool_calls' : 'stop', message: first ? { role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'script_write', arguments: JSON.stringify(args) } }] } : { content: 'done' } }] };
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(payload));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = (server.address() as { port: number }).port;
  try {
    allowFullAccess(directory);
    for (const protocol of ['chat-completions', 'responses', 'anthropic'] as const) {
      turn = 0; requests.length = 0;
      const provider = protocol === 'anthropic' ? 'anthropic' : 'openai';
      updateProvider(directory, provider, { endpoint: `http://127.0.0.1:${port}/v1`, ...(protocol !== 'anthropic' ? { protocol } : {}) });
      const result = await agentWithFallback({ root: directory, provider, fallbacks: [], chat: 'generate script', locale: 'en-US', memoryContext: '', tools: PROJECT_TOOLS, execute: (name, args) => executeProjectTool(directory, name, args) });
      assert.equal(result.status, 'done'); assert.equal(result.toolTrace[0].status, 'completed'); assert.equal(requests.length, 2);
      assert.equal(fs.readFileSync(path.join(directory, 'assets/Generated.ts'), 'utf8'), 'export const generated = true;');
      const next = requests[1].body;
      if (protocol === 'responses') assert.equal((next.input as Array<{ type: string }>).at(-1)?.type, 'function_call_output');
      else if (protocol === 'anthropic') assert.equal((next.messages as Array<{ content: Array<{ type: string }> }>).at(-1)?.content[0].type, 'tool_result');
      else assert.equal((next.messages as Array<{ role: string }>).at(-1)?.role, 'tool');
      assert.ok(!JSON.stringify(result).includes('mock-secret'));
    }
    for (const mode of [undefined, 'chat', 'agent']) {
      turn = 0;
      const result = await dispatchTool({ root: directory, cwd: directory }, 'workspace_chat', { chat: 'generate', ...(mode ? { mode } : {}) }) as AgentRunResult;
      assert.equal(result.toolTrace[0].status, 'completed');
      assert.equal(activeSession(directory).messages.at(-1)?.toolTrace?.[0].name, 'script_write');
    }
  } finally {
    server.close(); await once(server, 'close'); fs.rmSync(directory, { recursive: true, force: true });
    if (oldOpenai === undefined) delete process.env.COCOS_AGENT_OPENAI_API_KEY; else process.env.COCOS_AGENT_OPENAI_API_KEY = oldOpenai;
    if (oldAnthropic === undefined) delete process.env.COCOS_AGENT_ANTHROPIC_API_KEY; else process.env.COCOS_AGENT_ANTHROPIC_API_KEY = oldAnthropic;
  }
});

test('project tools enforce permission, strict schemas, path boundaries, symlinks and file limits', async () => {
  const directory = root();
  try {
    await assert.rejects(executeProjectTool(directory, 'script_write', { path: 'assets/x.ts', content: 'x' }), /PERMISSION_DENIED/);
    allowFullAccess(directory);
    for (const file of ['../outside.ts', 'assets/../../outside.ts', '.cocos-agent/config.json', 'assets/.env', 'assets/config.json', 'assets/C:/x.ts']) {
      await assert.rejects(executeProjectTool(directory, 'script_write', { path: file, content: 'x' }));
    }
    await assert.rejects(executeProjectTool(directory, 'script_write', { path: 'assets/a.ts', content: 'x', extra: true }), /ARGUMENT_INVALID/);
    await assert.rejects(executeProjectTool(directory, 'project_test', { script: 'test & whoami' }), /PROJECT_TEST_INVALID/);
    await assert.rejects(executeProjectTool(directory, 'provider_configure', {}), /NOT_ALLOWED/);
    fs.mkdirSync(path.join(directory, 'assets'));
    fs.symlinkSync(os.tmpdir(), path.join(directory, 'assets/link'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(executeProjectTool(directory, 'script_write', { path: 'assets/link/out.ts', content: 'x' }), /SYMLINK_DENIED/);
    const first = 'export const value = 1;';
    fs.writeFileSync(path.join(directory, 'assets/existing.ts'), first);
    const replaced = await executeProjectTool(directory, 'script_write', { path: 'assets/existing.ts', content: 'export const value = 2;' }) as { backup: string };
    assert.equal(fs.readFileSync(path.join(directory, replaced.backup), 'utf8'), first);
    fs.writeFileSync(path.join(directory, 'assets/large.ts'), 'x'.repeat(65537));
    await assert.rejects(executeProjectTool(directory, 'script_read', { path: 'assets/large.ts' }), /FILE_LIMIT/);
    await assert.rejects(executeProjectTool(directory, 'scene_write', { path: 'assets/a.scene', json: '{}' }), /SCENE_FORMAT_INVALID/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('autonomous scene writes reject invalid roots and references before touching existing assets', async () => {
  const directory = root();
  try {
    allowFullAccess(directory);
    fs.mkdirSync(path.join(directory, 'assets'));
    for (const extension of ['scene', 'prefab']) {
      const prefab = extension === 'prefab';
      const asset = [
        { __type__: prefab ? 'cc.Prefab' : 'cc.SceneAsset', [prefab ? 'data' : 'scene']: { __id__: 1 } },
        { __type__: prefab ? 'cc.Node' : 'cc.Scene', _children: [{ __id__: 2 }], _components: [], _parent: null },
        { __type__: 'cc.Node', _parent: { __id__: 1 }, _children: [], _components: [], _externalAsset: { __uuid__: 'external-asset' } },
      ];
      const relative = `assets/valid.${extension}`;
      const file = path.join(directory, relative);
      const original = JSON.stringify(asset);
      fs.writeFileSync(file, original);
      for (const invalid of [[], [null], [{}], [{ __type__: 'cc.Node' }], [asset[0]], [asset[0], { __type__: 'wrong' }], [...asset, { ref: { __id__: -1 } }], [...asset, { ref: { __id__: 99 } }], [...asset, { ref: { __id__: 1.5 } }]]) {
        await assert.rejects(executeProjectTool(directory, 'scene_write', { path: relative, json: JSON.stringify(invalid) }), /SCENE_FORMAT_INVALID/);
        assert.equal(fs.readFileSync(file, 'utf8'), original);
        assert.equal(fs.existsSync(path.join(directory, 'temp/agent-backup')), false);
      }
      const result = await executeProjectTool(directory, 'scene_write', { path: relative, json: original }) as { ok: boolean };
      assert.equal(result.ok, true);
      assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), asset);
      // Clear only the backup produced by this test before checking the next extension.
      fs.rmSync(path.join(directory, 'temp'), { recursive: true, force: true });
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('runner reports tool errors, bounds results, rejects repeats and stops after post-mutation failure', async () => {
  let turn = 0; let executions = 0;
  const result = await runAgent({ protocol: 'chat-completions', model: 'mock', system: '', chat: 'do', tools: [tool],
    post: async () => { if (turn++ > 0) throw new Error('PROVIDER_HTTP_500'); return { choices: [{ message: { tool_calls: [{ id: 'one', function: { name: 'script_write', arguments: '{}' } }] } }] }; },
    execute: async () => { executions++; return 'x'.repeat(30000); },
  });
  assert.equal(executions, 1); assert.equal(result.status, 'error'); assert.equal(result.toolTrace[0].result.length, AGENT_LIMITS.resultChars);
  assert.match(result.content, /PROVIDER_HTTP_500/);
  let calls = 0;
  const repeated = await runAgent({ protocol: 'chat-completions', model: 'mock', system: '', chat: 'do', tools: [tool], post: async () => ({ choices: [{ message: { tool_calls: [{ id: 'repeat', function: { name: 'script_write', arguments: '{}' } }] } }] }), execute: async () => { calls++; throw new Error('PERMISSION_DENIED'); } });
  assert.equal(calls, 1); assert.equal(repeated.toolTrace[0].status, 'error'); assert.match(repeated.content, /DUPLICATE/);
});

test('turn, tool and argument budgets bound an otherwise endless model', async () => {
  let id = 0; let executions = 0;
  const makeCall = (args: string) => ({ id: `c${++id}`, function: { name: 'script_write', arguments: args } });
  const result = await runAgent({ protocol: 'chat-completions', model: 'mock', system: '', chat: '', tools: [tool], post: async () => ({ choices: [{ message: { tool_calls: [makeCall('{}')] } }] }), execute: async () => { executions++; return true; } });
  assert.equal(executions, AGENT_LIMITS.turns); assert.match(result.content, /TURN_LIMIT/);
  executions = 0; id = 0;
  const oversized = await runAgent({ protocol: 'chat-completions', model: 'mock', system: '', chat: '', tools: [tool], post: async () => id ? { choices: [{ message: { content: 'stopped' } }] } : { choices: [{ message: { tool_calls: [makeCall('x'.repeat(AGENT_LIMITS.argumentChars + 1))] } }] }, execute: async () => { executions++; } });
  assert.equal(executions, 0); assert.match(oversized.toolTrace[0].result, /ARGUMENT_LIMIT/);
  await assert.rejects(runAgent({ protocol: 'chat-completions', model: 'mock', system: '', chat: '', tools: [tool], post: async () => ({ choices: [{ message: { tool_calls: Array.from({ length: AGENT_LIMITS.tools + 1 }, () => makeCall('{}')) } }] }), execute: async () => { executions++; } }), /TOOL_LIMIT/);
  assert.equal(executions, 0);
});

test('project tests execute only existing allowlisted scripts, return exit status and omit provider environment secrets', async () => {
  const directory = root(); const before = process.env.COCOS_AGENT_OPENAI_API_KEY; process.env.COCOS_AGENT_OPENAI_API_KEY = 'never-pass-to-tests';
  try {
    allowFullAccess(directory);
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ scripts: { test: 'node check.js', typecheck: 'node fail.js' } }));
    fs.writeFileSync(path.join(directory, 'check.js'), 'if(process.env.COCOS_AGENT_OPENAI_API_KEY) process.exit(2); console.log("mock checks passed")');
    fs.writeFileSync(path.join(directory, 'fail.js'), 'process.exit(3)');
    const success = await executeProjectTool(directory, 'project_test', { script: 'test' }) as { ok: boolean; exitCode: number; stdout: string };
    assert.equal(success.ok, true); assert.match(success.stdout, /mock checks passed/);
    const failure = await executeProjectTool(directory, 'project_test', { script: 'typecheck' }) as { ok: boolean; exitCode: number; stdout: string };
    assert.equal(failure.ok, false); assert.equal(failure.exitCode, 3);
    await assert.rejects(executeProjectTool(directory, 'project_test', { script: 'build' }), /SCRIPT_MISSING/);
  } finally { if (before === undefined) delete process.env.COCOS_AGENT_OPENAI_API_KEY; else process.env.COCOS_AGENT_OPENAI_API_KEY = before; fs.rmSync(directory, { recursive: true, force: true }); }
});

test('fallback never replays mutations; Gateway agent execution is explicitly unsupported', async () => {
  const directory = root(); const oldFetch = globalThis.fetch; const oldToken = process.env.COCOS_AGENT_OPENAI_API_KEY; let calls = 0; let mutations = 0;
  process.env.COCOS_AGENT_OPENAI_API_KEY = 'secret';
  try {
    globalThis.fetch = async () => { calls++; return calls === 1 ? new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ id: 'mutate', function: { name: 'script_write', arguments: '{}' } }] } }] })) : new Response('', { status: 503 }); };
    const options = { root: directory, provider: 'openai' as const, fallbacks: ['gateway' as const], chat: 'do', memoryContext: '', locale: 'en-US' as const, tools: [tool], execute: async () => { mutations++; return { ok: true }; } };
    const result = await agentWithFallback(options);
    assert.equal(result.status, 'error'); assert.equal(mutations, 1); assert.equal(result.attempts.length, 1); assert.equal(calls, 2);
    await assert.rejects(agentWithFallback({ ...options, provider: 'gateway', fallbacks: [] }), /PROVIDER_TOOLS_UNSUPPORTED/);
  } finally { globalThis.fetch = oldFetch; if (oldToken === undefined) delete process.env.COCOS_AGENT_OPENAI_API_KEY; else process.env.COCOS_AGENT_OPENAI_API_KEY = oldToken; fs.rmSync(directory, { recursive: true, force: true }); }
});
