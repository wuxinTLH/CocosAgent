import fs from 'node:fs';
import path from 'node:path';

export interface ProjectContext {
  root: string;
  cwd: string;
}

export function normalizeRoot(target: string): string {
  const resolved = path.resolve(target);
  const withSlashes = resolved.replace(/\\/g, '/');
  if (process.platform === 'win32') {
    return withSlashes.replace(/^([A-Za-z]):/, (_match, drive: string) => `${drive.toLowerCase()}:`);
  }
  return withSlashes;
}

export function findProjectRoot(start: string): string {
  const envRoot = process.env.COCOS_AGENT_PROJECT_ROOT;
  if (envRoot) {
    return normalizeRoot(envRoot);
  }
  let current = path.resolve(start);
  for (;;) {
    const hasAssets = fs.existsSync(path.join(current, 'assets'));
    const hasMarker = ['package.json', 'project.json', 'settings'].some((marker) =>
      fs.existsSync(path.join(current, marker)),
    );
    if (hasAssets && hasMarker) {
      return normalizeRoot(current);
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return normalizeRoot(start);
}

export function loadContext(cwd?: string): ProjectContext {
  const base = cwd ?? process.cwd();
  return {
    root: findProjectRoot(base),
    cwd: path.resolve(base),
  };
}
