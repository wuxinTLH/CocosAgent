import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeAnimation, createAnimationController, optimizeAnimation, validateStateMachine } from '../animation.js';
import { saveAgentConfig } from '../config.js';
import { dispatchTool } from '../tools.js';
import type { ProjectContext } from '../context.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');

test('animation analysis and optimization preserve editor-managed clips', () => {
  const summary = analyzeAnimation(repoRoot, 'cli/tests/fixtures/sample.anim');
  assert.equal(summary.name, 'Locomotion');
  assert.equal(summary.duration, 1.2);
  assert.equal(summary.trackCount, 1);
  assert.equal(summary.eventCount, 1);
  const result = optimizeAnimation(summary);
  assert.ok(result.suggestions.some((item) => item.includes('预览')));
});

test('animation state machine validates idle run jump and generates a public API component', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cocos-agent-animation-'));
  fs.mkdirSync(path.join(root, 'assets', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'project.json'), '{}\n', 'utf8');
  const ctx: ProjectContext = { root, cwd: root };
  const definition = {
    initial: 'idle',
    states: ['idle', 'run', 'jump'],
    transitions: [
      { from: 'idle', to: 'run', trigger: 'move' },
      { from: 'run', to: 'jump', trigger: 'jump' },
      { from: 'jump', to: 'idle', trigger: 'land' },
    ],
  };
  try {
    assert.deepEqual(validateStateMachine(definition), definition);
    assert.rejects(
      dispatchTool(ctx, 'animation_create_controller', { path: 'assets/scripts/PlayerAnimation.ts', className: 'PlayerAnimation', definition }),
      /PERMISSION_DENIED/,
    );
    process.env.COCOS_AGENT_PERMISSION_ELEVATION = 'full-access';
    saveAgentConfig(root, { permissionMode: 'full-access' });
    delete process.env.COCOS_AGENT_PERMISSION_ELEVATION;
    const result = await dispatchTool(ctx, 'animation_create_controller', { path: 'assets/scripts/PlayerAnimation.ts', className: 'PlayerAnimation', definition }) as { file: string };
    const output = fs.readFileSync(result.file, 'utf8');
    assert.match(output, /crossFade\(next, 0\.12\)/);
    assert.match(output, /idle:move/);
    assert.match(output, /run:jump/);
    assert.throws(() => createAnimationController(root, '../outside.ts', 'PlayerAnimation', definition), /SANDBOX_VIOLATION/);
  } finally {
    delete process.env.COCOS_AGENT_PERMISSION_ELEVATION;
    fs.rmSync(root, { recursive: true, force: true });
  }
});