import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadAgentConfig, saveAgentConfig, updateProvider } from '../config.js';
import { startMockGateway, mockPort, waitForMockGateway } from '../gateway-mock.js';
import { providerCatalog } from '../providers.js';
import { terminalInvocation } from '../terminal.js';
import { dispatchTool, MCP_TOOLS } from '../tools.js';
import type { ProjectContext } from '../context.js';

function tempContext(): { root: string; ctx: ProjectContext } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cocos-agent-workspace-'));
  fs.mkdirSync(path.join(root, 'assets'));
  fs.writeFileSync(path.join(root, 'project.json'), '{}\n', 'utf8');
  return { root, ctx: { root, cwd: root } };
}

test('agent configuration persists i18n, permission modes, and provider metadata', async () => {
  const { root, ctx } = tempContext();
  try {
    assert.equal(loadAgentConfig(root).locale, 'zh-CN');
    const previousElevation = process.env.COCOS_AGENT_PERMISSION_ELEVATION;
    process.env.COCOS_AGENT_PERMISSION_ELEVATION = 'full-access';
    const configured = await dispatchTool(ctx, 'agent_config', {
      locale: 'en-US',
      permissionMode: 'full-access',
      activeProvider: 'deepseek',
      fallbackProviders: ['gateway'],
    }) as { current: { locale: string; permissionMode: string; activeProvider: string; fallbackProviders: string[] } };
    assert.equal(configured.current.locale, 'en-US');
    assert.equal(configured.current.permissionMode, 'full-access');
    assert.equal(configured.current.activeProvider, 'deepseek');
    assert.deepEqual(configured.current.fallbackProviders, ['gateway']);
    assert.equal(providerCatalog(root).length, 6);
    if (previousElevation === undefined) delete process.env.COCOS_AGENT_PERMISSION_ELEVATION; else process.env.COCOS_AGENT_PERMISSION_ELEVATION = previousElevation;
    saveAgentConfig(root, { permissionMode: 'only-safe' });
    assert.throws(() => saveAgentConfig(root, { permissionMode: 'full-access' }), /PERMISSION_ELEVATION_REQUIRED/);
    assert.throws(() => saveAgentConfig(root, { activeProvider: 'not-a-provider' as never }), /PROVIDER_NOT_SUPPORTED/);
    assert.throws(() => saveAgentConfig(root, { fallbackProviders: ['not-a-provider'] as never }), /FALLBACK_PROVIDER_NOT_SUPPORTED/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('workspace chat falls back to a configured gateway and records the conversation', async () => {
  const { root, ctx } = tempContext();
  const server = startMockGateway(0);
  try {
    await waitForMockGateway(server);
    process.env.COCOS_AGENT_PERMISSION_ELEVATION = 'full-access';
    saveAgentConfig(root, { permissionMode: 'full-access', activeProvider: 'deepseek', fallbackProviders: ['gateway'] });
    delete process.env.COCOS_AGENT_PERMISSION_ELEVATION;
    updateProvider(root, 'gateway', { endpoint: `ws://127.0.0.1:${mockPort(server)}/ws`, model: 'mock-model' });
    const session = await dispatchTool(ctx, 'workspace_create', { name: 'Fallback', provider: 'deepseek' }) as { id: string };
    assert.ok(session.id);
    const result = await dispatchTool(ctx, 'workspace_chat', { chat: 'fallback works' }) as { usedFallback: boolean; provider: string; content: string };
    assert.equal(result.usedFallback, true);
    assert.equal(result.provider, 'gateway');
    assert.match(result.content, /fallback works/);
    const sessions = await dispatchTool(ctx, 'workspace_list', {}) as { sessions: Array<{ messages: unknown[] }> };
    assert.equal(sessions.sessions.at(-1)?.messages.length, 2);
  } finally {
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('only-access denies network chat and full-access gates Windows terminal invocations', async () => {
  const { root, ctx } = tempContext();
  try {
    saveAgentConfig(root, { permissionMode: 'only-access' });
    await assert.rejects(dispatchTool(ctx, 'workspace_chat', { chat: 'blocked' }), /PERMISSION_DENIED/);
    process.env.COCOS_AGENT_PERMISSION_ELEVATION = 'full-access';
    saveAgentConfig(root, { permissionMode: 'full-access' });
    delete process.env.COCOS_AGENT_PERMISSION_ELEVATION;
    const invocation = terminalInvocation(root, 'cmd', 'dir');
    assert.equal(invocation.executable, 'cmd.exe');
    assert.equal(invocation.cwd, root);
    assert.throws(() => terminalInvocation(root, 'cmd', 'dir & whoami'), /TERMINAL_COMMAND_INVALID/);
    assert.throws(() => terminalInvocation(root, 'cmd', '..\\outside'), /TERMINAL_PATH_OUTSIDE_PROJECT/);
    assert.ok(MCP_TOOLS.some((tool) => tool.name === 'workspace_chat'));
    assert.ok(MCP_TOOLS.some((tool) => tool.name === 'terminal_run'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test('only-safe gateway chat rejects endpoint overrides outside configured routing', async () => {
  const { root, ctx } = tempContext();
  try {
    saveAgentConfig(root, { providers: { gateway: { endpoint: 'ws://127.0.0.1:8787/ws' } } });
    await assert.rejects(
      dispatchTool(ctx, 'gateway_chat', { chat: 'blocked override', url: 'ws://127.0.0.1:9999/ws' }),
      /only-safe gateway_chat requires the configured gateway endpoint/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});