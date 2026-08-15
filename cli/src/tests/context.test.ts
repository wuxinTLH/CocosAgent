import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProjectRoot, normalizeRoot } from '../context.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');

test('context finds the agent workspace root from cli directory', () => {
  assert.equal(findProjectRoot(path.join(repoRoot, 'cli')), normalizeRoot(repoRoot));
});
