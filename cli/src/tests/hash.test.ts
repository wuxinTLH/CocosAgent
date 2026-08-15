import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { computeTaskHash } from '../hash.js';
import { normalizeRoot } from '../context.js';

test('task hash is deterministic and canonical', () => {
  const projectRoot = normalizeRoot(path.resolve('agent-repo'));
  const utc8Start = '2026-08-15T16:57:00+08:00';
  const request = '  init   cocos   agent  ';
  const hash = computeTaskHash({ projectRoot, request, utc8Start });
  const payload = {
    workflowVersion: 'WF-1.0',
    projectRoot,
    request: 'init cocos agent',
    utc8Start,
  };
  const expected = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload, null, 2))
    .digest('hex');
  assert.equal(hash, expected);
});
