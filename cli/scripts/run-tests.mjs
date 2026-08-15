import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const testsDir = resolve('dist', 'tests');
const tests = readdirSync(testsDir)
  .filter((file) => file.endsWith('.test.js'))
  .map((file) => resolve(testsDir, file));

if (tests.length === 0) {
  throw new Error('NO_COMPILED_TESTS');
}

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...tests], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
