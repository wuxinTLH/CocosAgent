import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeRoot } from '../context.js';
import { resolveInside } from '../sandbox.js';

test('sandbox allows inside and rejects outside', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-sandbox-'));
  try {
    const inside = normalizeRoot(path.join(root, 'assets', 'scene.scene'));
    assert.equal(resolveInside(root, 'assets/scene.scene'), inside);
    assert.throws(() => resolveInside(root, '../outside.txt'), /SANDBOX_VIOLATION/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
