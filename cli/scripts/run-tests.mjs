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

for (const testFile of tests) {
  console.log(`\n[test] ${testFile}`);
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', testFile], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(`[test] unable to start ${testFile}: ${result.error.message}`);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}
console.log(`\n[test] passed ${tests.length} test files`);
