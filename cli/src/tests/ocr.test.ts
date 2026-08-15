import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOcr } from '../ocr.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..', '..');

test('windows OCR recognizes project-local fixture', { skip: process.platform !== 'win32' }, async () => {
  const result = await runOcr(root, 'cli/tests/fixtures/ocr-text.png', undefined, 'windows-ocr');
  assert.equal(result.engine, 'windows-ocr');
  assert.deepEqual(result.items.map((item) => item.text), ['COCOS', 'AGENT', '2026']);
  assert.ok(result.items.every((item) => item.box.w > 0 && item.box.h > 0));
});
