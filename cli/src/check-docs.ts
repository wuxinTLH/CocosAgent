import fs from 'node:fs';
import path from 'node:path';

export interface DocLinkIssue {
  file: string;
  link: string;
  message: string;
}

export interface DocCheckResult {
  checked: number;
  issues: DocLinkIssue[];
}

const MARKDOWN_LINK = /\[[^\]]*\]\(([^)]+)\)/g;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'temp', 'library', 'build']);

export function collectMarkdownFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(full);
      }
    }
  };
  walk(root);
  return files.sort();
}

export function checkDocLinks(root: string): DocCheckResult {
  const issues: DocLinkIssue[] = [];
  let checked = 0;
  for (const file of collectMarkdownFiles(root)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(MARKDOWN_LINK)) {
      const raw = match[1].trim();
      if (!raw || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('#')) {
        continue;
      }
      const target = raw.split('#')[0];
      if (!target) {
        continue;
      }
      const resolved = path.resolve(path.dirname(file), target);
      if (!fs.existsSync(resolved)) {
        issues.push({
          file: path.relative(root, file),
          link: raw,
          message: `missing target: ${path.relative(root, resolved)}`,
        });
      }
      checked += 1;
    }
  }
  return { checked, issues };
}
