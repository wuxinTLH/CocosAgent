import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { connectRoute, resolveRoute } from '../ccs.js';
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
