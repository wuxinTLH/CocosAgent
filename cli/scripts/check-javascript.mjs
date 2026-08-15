import { readdirSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const root = resolve('..');
const skipDirectories = new Set(['.git', 'node_modules', 'dist', 'temp', 'library', 'build']);
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirectories.has(entry.name)) {
      continue;
    }
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (extname(entry.name) === '.js' || extname(entry.name) === '.mjs') {
      files.push(full);
    }
  }
}

walk(root);
const failures = [];
for (const file of files) {
  if (file === import.meta.filename) {
    continue;
  }
  const text = readFileSync(file, 'utf8');
  if (/\bvar\b/.test(text)) {
    failures.push(`${file}: var is prohibited`);
  }
  const forbiddenMarkers = [new RegExp(`\\b${'TO' + 'DO'}\\b`), new RegExp(`\\b${'FIX' + 'ME'}\\b`)];
  if (forbiddenMarkers.some((marker) => marker.test(text))) {
    failures.push(`${file}: unresolved TODO/FIXME marker`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`JavaScript check passed (${files.length} files).`);
