import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initProjectConstraints } from '../project.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentRoot = path.resolve(__dirname, '..', '..', '..');

test('project init creates an independent constraint file in target project', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-project-'));
  try {
    const file = initProjectConstraints(agentRoot, 'Demo Game', projectRoot, '3.8.7');
    assert.equal(file, path.join(projectRoot, 'docs', 'constraints', 'PROJECT-Demo Game.md'));
    const content = fs.readFileSync(file, 'utf8');
    assert.match(content, /PROJECT-Demo Game/);
    assert.match(content, /3\.8\.7/);
    assert.match(content, new RegExp(projectRoot.replace(/\\/g, '/').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
