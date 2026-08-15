import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listNodes, readScene } from '../scene.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..', '..');
const fixture = 'cli/tests/fixtures/sample.scene';

test('scene nodes parse fixture tree', () => {
  const data = readScene(root, fixture);
  assert.ok(Array.isArray(data));
  const roots = listNodes(root, fixture);
  assert.equal(roots.length, 1);
  assert.equal(roots[0].name, 'SampleScene');
  assert.equal(roots[0].children[0].name, 'Canvas');
  assert.equal(roots[0].children[0].children[0].name, 'Main Camera');
});
