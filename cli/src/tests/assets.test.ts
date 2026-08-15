import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findAssets } from '../assets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..', '..');

test('asset find locates fixture scene', () => {
  const results = findAssets(root, 'sample', 'scene', 'cli/tests/fixtures');
  assert.ok(results.some((entry) => entry.path.includes('sample.scene')));
});

test('asset find rejects out-of-project dir', () => {
  assert.throws(() => findAssets(root, '', undefined, '../'), /SANDBOX_VIOLATION/);
});
