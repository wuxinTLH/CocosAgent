import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeMath } from '../math.js';
import { dispatchTool, MCP_TOOLS } from '../tools.js';
import type { ProjectContext } from '../context.js';

test('math analysis reads only project source directories and reports Cocos 3D candidates', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cocos-agent-math-'));
  const ctx: ProjectContext = { root, cwd: root };
  try {
    fs.mkdirSync(path.join(root, 'assets', 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(root, 'native'), { recursive: true });
    fs.writeFileSync(path.join(root, 'project.json'), '{}\n', 'utf8');
    fs.writeFileSync(path.join(root, 'assets', 'scripts', 'Player.ts'), [
      'const point = new Vec3();',
      'const distance = Math.sqrt(point.lengthSqr());',
      'ray.intersect(aabb);',
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(root, 'native', 'RayQuery.cpp'), 'Mat4::invert(inverse, world);\n', 'utf8');

    const result = analyzeMath(root);
    assert.equal(result.files.length, 2);
    const findings = result.files.flatMap((file) => file.findings);
    assert.ok(findings.some((item) => item.category === 'ray'));
    assert.ok(findings.some((item) => item.category === 'transform' && item.severity === 'warning'));
    assert.match(result.scannedAtUtc8, /\+08:00$/);

    const targeted = await dispatchTool(ctx, 'math_analyze', { path: 'assets/scripts/Player.ts' }) as { files: Array<{ path: string }> };
    assert.deepEqual(targeted.files.map((item) => item.path), ['assets/scripts/Player.ts']);
    assert.throws(() => analyzeMath(root, '../outside.ts'), /SANDBOX_VIOLATION/);
    assert.ok(MCP_TOOLS.some((tool) => tool.name === 'math_analyze'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
