import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { countLongMemory, nowUtc8, writeExecution } from '../memory.js';

test('memory write creates long and short records', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-memory-'));
  try {
    const stamp = nowUtc8();
    writeExecution(root, {
      id: '',
      hash: 'a'.repeat(64),
      startUtc8: stamp,
      endUtc8: stamp,
      request: 'test memory',
      reasoning: 'unit test',
      plan: ['step one'],
      timeline: [{ time: stamp, event: 'start' }],
      result: 'ok',
      files: [],
      nextSteps: [],
    });
    assert.ok(fs.existsSync(path.join(root, 'LONG_MEMORY.md')));
    assert.ok(fs.existsSync(path.join(root, 'SHORT_MEMORY.md')));
    assert.equal(countLongMemory(root), 1);
    const short = fs.readFileSync(path.join(root, 'SHORT_MEMORY.md'), 'utf8');
    assert.match(short, /test memory/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
