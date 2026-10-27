import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { once } from 'node:events';
import WebSocket from 'ws';
import { startBridge } from '../bridge.js';
import { executeEditorTool, validateEditorArguments } from '../editor-tools.js';
import { saveAgentConfig } from '../config.js';

function full(root: string): void {
  const before = process.env.COCOS_AGENT_PERMISSION_ELEVATION;
  process.env.COCOS_AGENT_PERMISSION_ELEVATION = 'full-access';
  try { saveAgentConfig(root, { permissionMode: 'full-access' }); }
  finally { if (before === undefined) delete process.env.COCOS_AGENT_PERMISSION_ELEVATION; else process.env.COCOS_AGENT_PERMISSION_ELEVATION = before; }
}

test('live editor validates strict allowlist and requires full access for mutations', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'editor-tools-'));
  try {
    for (const [name, args] of [['execute-scene-script', {}], ['editor_scene_query', { message: 'save-scene' }], ['editor_scene_query', { uuid: '../../bad\n' }], ['editor_node_create', { name: '' }], ['editor_node_create', { name: 'node', position: { x: NaN, y: 0, z: 0 } }]] as const) {
      assert.throws(() => validateEditorArguments(name, args));
    }
    await assert.rejects(executeEditorTool(root, 'editor_node_create', { name: 'node' }), /PERMISSION_DENIED/);
    full(root);
    await assert.rejects(executeEditorTool(root, 'editor_scene_query', {}), /EDITOR_NOT_CONNECTED/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('separate editor registration authenticates and request-response disconnect cleans up', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'editor-ws-'));
  const prior = process.env.COCOS_AGENT_EDITOR_TOKEN;
  process.env.COCOS_AGENT_EDITOR_TOKEN = 'unit-test-editor-token';
  const server = startBridge(0, { root, cwd: root });
  const sockets: WebSocket[] = [];
  try {
    assert.equal(process.env.COCOS_AGENT_EDITOR_TOKEN, undefined);
    full(root);
    await once(server, 'listening');
    const port = (server.address() as { port: number }).port;
    const connect = async () => { const s = new WebSocket(`ws://127.0.0.1:${port}/ws`); sockets.push(s); await once(s, 'open'); return s; };
    const ordinary = await connect();
    for (const invalid of [null, [], 'x']) {
      const reply = once(ordinary, 'message');
      ordinary.send(JSON.stringify(invalid));
      assert.equal(JSON.parse(String((await reply)[0])).error, 'INVALID_JSON_OR_REQUEST');
    }
    ordinary.close();
    const bad = await connect();
    const closed = once(bad, 'close'); bad.send(JSON.stringify({ type: 'editor_register', token: 'wrong' }));
    assert.equal((await closed)[0], 1008);
    const socket = await connect();
    const registered = once(socket, 'message');
    socket.send(JSON.stringify({ type: 'editor_register', token: 'unit-test-editor-token' }));
    assert.equal(JSON.parse(String((await registered)[0])).type, 'editor_registered');
    const incoming = once(socket, 'message');
    const query = executeEditorTool(root, 'editor_scene_query', {});
    const request = JSON.parse(String((await incoming)[0]));
    assert.equal(request.tool, 'editor_scene_query');
    assert.ok(!JSON.stringify(request).includes('unit-test-editor-token'));
    socket.send(JSON.stringify({ type: 'editor_result', id: request.id, ok: true, result: { tree: { name: 'Scene' }, dirty: false } }));
    assert.deepEqual(await query, { tree: { name: 'Scene' }, dirty: false });
    const next = once(socket, 'message');
    const pending = executeEditorTool(root, 'editor_node_create', { name: 'Empty' });
    const rejected = assert.rejects(pending, /EDITOR_DISCONNECTED/);
    await next; const end = once(socket, 'close'); socket.close(); await end; await rejected;
    await assert.rejects(executeEditorTool(root, 'editor_scene_query', {}), /EDITOR_NOT_CONNECTED/);
  } finally {
    for (const socket of sockets) socket.terminate();
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (prior === undefined) delete process.env.COCOS_AGENT_EDITOR_TOKEN; else process.env.COCOS_AGENT_EDITOR_TOKEN = prior;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Creator adapter invokes only verified official IPC without saving scene', async () => {
  const source = fs.readFileSync(new URL('../../../extensions/cocos-agent/src/main.js', import.meta.url), 'utf8');
  const start = source.indexOf('async function executeEditorRequest(');
  const end = source.indexOf('\nfunction connectEditor(', start);
  const calls: unknown[][] = [];
  const context = vm.createContext({ Editor: { Message: { request: async (...args: unknown[]) => {
    calls.push(args);
    if (args[1] === 'query-is-ready') return true;
    if (args[1] === 'query-node-tree') return { name: { value: 'Scene' }, uuid: { value: 'scene-id' }, children: [] };
    if (args[1] === 'query-dirty') return false;
    if (args[1] === 'create-node') return 'new-node';
    throw new Error('unexpected IPC');
  } } } });
  vm.runInContext(source.slice(start, end), context);
  const execute = context.executeEditorRequest as (name: string, args: unknown) => Promise<unknown>;
  const tree = await execute('editor_scene_query', {});
  assert.equal(JSON.parse(JSON.stringify(tree)).tree.name, 'Scene');
  const result = await execute('editor_node_create', { name: 'Empty', parent: 'parent-id', position: { x: 1, y: 2, z: 3 } });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { uuid: 'new-node', name: 'Empty', saved: false });
  assert.equal(calls.at(-1)?.[1], 'create-node');
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1)?.[2])), { name: 'Empty', snapshot: true, parent: 'parent-id', position: { x: 1, y: 2, z: 3 } });
  await assert.rejects(execute('save-scene', {}), /DENIED/);
  assert.ok(!calls.some(args => args[1] === 'save-scene'));
});
