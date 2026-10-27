import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { dispatchTool, MCP_TOOLS } from '../tools.js';
import { loadAgentConfig, saveAgentConfig, createCustomProvider } from '../config.js';
import { appendMessage, createSession, beginSessionRun, listSessions } from '../workspace.js';
import { sanitizeProviderDiagnostic } from '../providers.js';
import { runAgent } from '../agent-runner.js';

const setup = () => { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cocos-controls-')); return { root, ctx: { root, cwd: root } }; };
test('permission elevation requires dedicated trusted UI dispatch and never weakens config guard', async () => {
  const { root, ctx } = setup(); const previous = process.env.COCOS_AGENT_PERMISSION_ELEVATION;
  delete process.env.COCOS_AGENT_PERMISSION_ELEVATION;
  try {
    assert.equal(loadAgentConfig(root).permissionMode, 'only-safe');
    assert.ok(!MCP_TOOLS.some(tool => tool.name === 'permission_set'));
    await assert.rejects(dispatchTool(ctx, 'permission_set', { mode: 'full-access', userInitiated: true }), /UI_ONLY/);
    for (const args of [{ mode: 'full-access' }, { mode: 'full-access', userInitiated: 'true' }, { mode: 'only-access', userInitiated: true }, { mode: 'full-access', userInitiated: true, extra: true }]) {
      await assert.rejects(dispatchTool(ctx, 'permission_set', args, { allowUserPermissionChange: true }), /PERMISSION_SET_INVALID/);
    }
    await dispatchTool(ctx, 'permission_set', { mode: 'full-access', userInitiated: true }, { allowUserPermissionChange: true });
    assert.equal(loadAgentConfig(root).permissionMode, 'full-access');
    await dispatchTool(ctx, 'permission_set', { mode: 'only-safe', userInitiated: true }, { allowUserPermissionChange: true });
    assert.throws(() => saveAgentConfig(root, { permissionMode: 'full-access' }), /PERMISSION_ELEVATION_REQUIRED/);
    await assert.rejects(dispatchTool(ctx, 'unknown_read', {}), /PERMISSION_DENIED/);
  } finally { if (previous === undefined) delete process.env.COCOS_AGENT_PERMISSION_ELEVATION; else process.env.COCOS_AGENT_PERMISSION_ELEVATION = previous; fs.rmSync(root, { recursive: true, force: true }); }
});

test('provider deletion clears credentials and repairs active, fallback and all workspace references', async () => {
  const { root, ctx } = setup(); const credentials = fs.mkdtempSync(path.join(os.tmpdir(), 'cocos-creds-')); const previous = process.env.COCOS_AGENT_CREDENTIAL_DIR;
  process.env.COCOS_AGENT_CREDENTIAL_DIR = credentials;
  try {
    const provider = createCustomProvider(root, { name: 'Third party', endpoint: 'https://example.org/v1', model: 'x', protocol: 'responses' });
    saveAgentConfig(root, { activeProvider: provider.id, fallbackProviders: ['openai', 'gateway'] });
    const first = createSession(root, 'first', provider.id, ['gateway', provider.id]);
    createSession(root, 'second', 'anthropic', [provider.id, 'openai']);
    appendMessage(root, first.id, { role: 'assistant', content: 'old', timeUtc8: 'old', provider: provider.id });
    const entry = crypto.createHash('sha256').update(path.resolve(root).toLowerCase()).digest('hex') + ':' + provider.id;
    fs.writeFileSync(path.join(credentials, 'credentials.json'), JSON.stringify({ [entry]: 'fake-encrypted-credential', unrelated: 'keep' }));
    const release = beginSessionRun(root, first.id);
    await assert.rejects(dispatchTool(ctx, 'provider_delete', { provider: provider.id }), /WORKSPACE_BUSY/);
    release();
    await assert.rejects(dispatchTool(ctx, 'provider_delete', { provider: 'openai' }), /BUILTIN/);
    const workspacePath = path.join(root, '.cocos-agent', 'workspace.json');
    const before = fs.readFileSync(workspacePath, 'utf8');
    for (const corrupt of [{ fallbackProviders: null }, { messages: [null] }]) {
      const malformed = JSON.parse(before); Object.assign(malformed.sessions.at(-1), corrupt);
      fs.writeFileSync(workspacePath, JSON.stringify(malformed));
      await assert.rejects(dispatchTool(ctx, 'provider_delete', { provider: provider.id }), /WORKSPACE_INVALID/);
      assert.equal(JSON.parse(fs.readFileSync(path.join(credentials, 'credentials.json'), 'utf8'))[entry], 'fake-encrypted-credential');
      assert.equal(loadAgentConfig(root).activeProvider, provider.id);
    }
    fs.writeFileSync(workspacePath, before);
    const originalWrite = fs.writeFileSync; let injected = false;
    fs.writeFileSync = ((file: fs.PathOrFileDescriptor, ...args: unknown[]) => {
      if (path.basename(String(file)) === 'config.json' && !injected) { injected = true; throw new Error('injected config write failure'); }
      return (originalWrite as (...values: unknown[]) => void)(file, ...args);
    }) as typeof fs.writeFileSync;
    try { await assert.rejects(dispatchTool(ctx, 'provider_delete', { provider: provider.id }), /injected config write failure/); }
    finally { fs.writeFileSync = originalWrite; }
    assert.equal(injected, true);
    assert.equal(fs.readFileSync(workspacePath, 'utf8'), before);
    assert.equal(loadAgentConfig(root).activeProvider, provider.id);
    assert.equal(JSON.parse(fs.readFileSync(path.join(credentials, 'credentials.json'), 'utf8'))[entry], 'fake-encrypted-credential');
    const result = await dispatchTool(ctx, 'provider_delete', { provider: provider.id }) as { deleted: string };
    assert.equal(result.deleted, provider.id);
    assert.equal(loadAgentConfig(root).activeProvider, 'openai');
    assert.deepEqual(loadAgentConfig(root).fallbackProviders, ['gateway']);
    assert.ok(!JSON.stringify(listSessions(root)).includes(provider.id));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(credentials, 'credentials.json'), 'utf8')), { unrelated: 'keep' });
    await assert.rejects(dispatchTool(ctx, 'provider_delete', { provider: provider.id }), /PROVIDER_NOT_SUPPORTED/);
  } finally { if (previous === undefined) delete process.env.COCOS_AGENT_CREDENTIAL_DIR; else process.env.COCOS_AGENT_CREDENTIAL_DIR = previous; fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(credentials, { recursive: true, force: true }); }
});

test('rollback validates exact user index and truncates before it while respecting session locks', async () => {
  const { root, ctx } = setup();
  try {
    const session = createSession(root, 'edit');
    for (const [role, content] of [['user', 'first'], ['assistant', 'answer'], ['user', 'revise'], ['assistant', 'later']] as const) appendMessage(root, session.id, { role, content, timeUtc8: 'now' });
    for (const messageIndex of [-1, 1, 4, 1.5, '2', null, Number.NaN]) await assert.rejects(dispatchTool(ctx, 'workspace_rollback', { id: session.id, messageIndex }), /ROLLBACK_INVALID/);
    await assert.rejects(dispatchTool(ctx, 'workspace_rollback', { id: session.id, messageIndex: 2, extra: true }), /ROLLBACK_INVALID/);
    await assert.rejects(dispatchTool(ctx, 'workspace_rollback', { id: 'missing', messageIndex: 0 }), /NOT_FOUND/);
    const release = beginSessionRun(root, session.id);
    await assert.rejects(dispatchTool(ctx, 'workspace_rollback', { id: session.id, messageIndex: 2 }), /WORKSPACE_BUSY/); release();
    const result = await dispatchTool(ctx, 'workspace_rollback', { id: session.id, messageIndex: 2 }) as { draft: string; session: { messages: unknown[] } };
    assert.equal(result.draft, 'revise'); assert.equal(result.session.messages.length, 2);
    await assert.rejects(dispatchTool(ctx, 'workspace_rollback', { id: session.id, messageIndex: 0, expectedMessage: { content: 'previous first message', timeUtc8: 'now' } }), /WORKSPACE_ROLLBACK_STALE/);
    assert.equal(listSessions(root).sessions.find(item => item.id === session.id)?.messages.length, 2);
    const first = await dispatchTool(ctx, 'workspace_rollback', { id: session.id, messageIndex: 0, expectedMessage: { content: 'first', timeUtc8: 'now' } }) as { session: { messages: unknown[] } };
    assert.equal(first.session.messages.length, 0);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('diagnostics retain actionable details while removing auth and request secrets', () => {
  const diagnostic = sanitizeProviderDiagnostic('model unavailable; Authorization: Bearer abc123; x-api-key=private; {"request_key":"hidden","code":"model_not_found"}; token=another; sk-private', ['abc123']);
  assert.match(diagnostic, /model unavailable/); assert.match(diagnostic, /model_not_found/);
  for (const secret of ['abc123', 'private', 'hidden', 'another', 'sk-private']) assert.ok(!diagnostic.includes(secret));
});

test('runner cannot expose permission_set even if accidentally supplied', async () => {
  let executed = false; let turn = 0;
  const result = await runAgent({ protocol: 'chat-completions', model: 'x', system: '', chat: '', tools: [{ name: 'permission_set', description: '', inputSchema: {} }], execute: async () => { executed = true; }, post: async body => {
    assert.deepEqual(body.tools, []);
    return ++turn === 1 ? { choices: [{ message: { tool_calls: [{ id: 'elevate', function: { name: 'permission_set', arguments: '{"mode":"full-access","userInitiated":true}' } }] } }] } : { choices: [{ message: { content: 'denied' } }] };
  } });
  assert.equal(executed, false); assert.equal(result.toolTrace[0]?.status, 'error');
});
