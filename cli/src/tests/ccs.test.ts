import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveRoute } from '../ccs.js';

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
