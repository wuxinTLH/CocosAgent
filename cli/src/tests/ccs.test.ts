import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ccsDoctor, connectRoute, normalizeCcsUrl, resolveRoute } from '../ccs.js';
import { mockPort, startMockGateway, waitForMockGateway } from '../gateway-mock.js';

test('ccs route resolves from CC_SWITCH_CONFIG', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ccs-'));
  const settings = path.join(dir, 'settings.json');
  fs.writeFileSync(settings, JSON.stringify({ currentProviderCodex: 'test-provider' }), 'utf8');
  const previous = process.env.CC_SWITCH_CONFIG;
  process.env.CC_SWITCH_CONFIG = settings;
  try {
    const route = resolveRoute();
    assert.equal(route.route, 'test-provider');
    assert.equal(route.provider, 'test-provider');
  } finally {
    if (previous === undefined) {
      delete process.env.CC_SWITCH_CONFIG;
    } else {
      process.env.CC_SWITCH_CONFIG = previous;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('ccs doctor reports the configured cc-switch route without exposing credentials', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ccs-doctor-'));
  const settings = path.join(dir, 'settings.json');
  fs.writeFileSync(settings, JSON.stringify({ currentProviderCodex: 'doctor-route' }), 'utf8');
  const previous = process.env.CC_SWITCH_CONFIG;
  process.env.CC_SWITCH_CONFIG = settings;
  try {
    const result = ccsDoctor();
    assert.equal((result.checks as { ccSwitchConfig: { ok: boolean } }).ccSwitchConfig.ok, true);
    assert.equal((result.route as { route: string }).route, 'doctor-route');
    assert.equal(JSON.stringify(result).includes('TOKEN'), false);
  } finally {
    if (previous === undefined) delete process.env.CC_SWITCH_CONFIG; else process.env.CC_SWITCH_CONFIG = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('ccs route connection validates the configured local route', async () => {
  const server = startMockGateway(0);
  const previousUrl = process.env.COCOS_AGENT_CCS_URL;
  try {
    await waitForMockGateway(server);
    process.env.COCOS_AGENT_CCS_URL = `ws://127.0.0.1:${mockPort(server)}/ws`;
    const result = await connectRoute('local-test-route');
    assert.equal(result.status, 'connected');
    assert.equal(result.route, 'local-test-route');
  } finally {
    if (previousUrl === undefined) {
      delete process.env.COCOS_AGENT_CCS_URL;
    } else {
      process.env.COCOS_AGENT_CCS_URL = previousUrl;
    }
    server.close();
  }
});

test('ccs accepts an independent http ip:port endpoint and converts it to websocket', () => {
  assert.equal(normalizeCcsUrl('http://127.0.0.1:8787'), 'http://127.0.0.1:8787');
  assert.equal(normalizeCcsUrl('ws://127.0.0.1:8787'), 'ws://127.0.0.1:8787/ws');
  assert.equal(normalizeCcsUrl('https://example.test:9443/ccs'), 'https://example.test:9443/ccs');
});

test('ccs endpoint remains independently resolvable when cc-switch settings are absent', () => {
  const previous = process.env.CC_SWITCH_CONFIG;
  process.env.CC_SWITCH_CONFIG = path.join(os.tmpdir(), 'missing-cc-switch-settings.json');
  try {
    const route = resolveRoute(undefined, 'http://127.0.0.1:15721');
    assert.equal(route.route, 'current');
    assert.equal(route.url, 'http://127.0.0.1:15721');
  } finally {
    if (previous === undefined) delete process.env.CC_SWITCH_CONFIG; else process.env.CC_SWITCH_CONFIG = previous;
  }
});
