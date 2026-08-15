import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface EditorInfo {
  path: string;
  version?: string;
  source: string;
}

export function detectEditors(): EditorInfo[] {
  const results: EditorInfo[] = [];
  const executable = process.platform === 'win32' ? 'CocosCreator.exe' : 'CocosCreator';
  const addFrom = (dir: string, source: string): void => {
    if (!dir || !fs.existsSync(dir)) {
      return;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const candidate = path.join(dir, entry.name);
      const hasExecutable =
        fs.existsSync(path.join(candidate, executable)) ||
        fs.existsSync(path.join(candidate, 'CocosCreator.app'));
      if (hasExecutable) {
        results.push({ path: candidate, version: entry.name, source });
      }
    }
  };
  const envPath = process.env.COCOS_CREATOR_PATH;
  if (envPath) {
    addFrom(path.dirname(envPath), 'env');
  }
  const roots = [
    'C:/ProgramData/cocos/editors',
    'C:/Program Files/CocosCreator',
    'C:/CocosDashboard/editors',
    'D:/CocosDashboard/editors',
    'E:/CocosDashboard/editors',
    path.join(os.homedir(), '.CocosCreator', 'editors'),
  ];
  for (const root of roots) {
    addFrom(root, root);
  }
  return results;
}

export function projectCreatorVersion(root: string): string | null {
  const packageFile = path.join(root, 'package.json');
  if (fs.existsSync(packageFile)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8')) as {
        creator?: { version?: string };
      };
      if (pkg.creator?.version) {
        return pkg.creator.version;
      }
    } catch {
      // ignore malformed package.json
    }
  }
  return null;
}
