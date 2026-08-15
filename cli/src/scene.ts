import fs from 'node:fs';
import path from 'node:path';
import { resolveInside } from './sandbox.js';

export type CocosScene = unknown[];

export interface SceneNodeInfo {
  id: number;
  name: string;
  type: string;
  children: SceneNodeInfo[];
}

export function readScene(root: string, relPath: string): CocosScene {
  const file = resolveInside(root, relPath);
  if (!fs.existsSync(file)) {
    throw new Error(`SCENE_NOT_FOUND: ${relPath}`);
  }
  const data: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(data)) {
    throw new Error('SCENE_FORMAT_INVALID: expected JSON array');
  }
  return data;
}

export function writeScene(root: string, relPath: string, json: string, backup = true): void {
  const file = resolveInside(root, relPath);
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('SCENE_FORMAT_INVALID: expected JSON array');
  }
  if (backup && fs.existsSync(file)) {
    const backupDir = resolveInside(root, 'temp/agent-backup');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(file).replace(/\.[^/.]+$/, '');
    fs.copyFileSync(file, path.join(backupDir, `${baseName}-${stamp}.json`));
  }
  fs.writeFileSync(file, JSON.stringify(parsed, null, 2), 'utf8');
}

export function listNodes(root: string, relPath: string): SceneNodeInfo[] {
  const data = readScene(root, relPath);
  const visited = new Set<number>();
  const build = (id: number): SceneNodeInfo | null => {
    if (visited.has(id)) {
      return null;
    }
    visited.add(id);
    const obj = data[id] as Record<string, unknown> | undefined;
    if (!obj || typeof obj !== 'object') {
      return null;
    }
    const childRefs = Array.isArray(obj._children) ? (obj._children as Array<{ __id__?: number }>) : [];
    const children: SceneNodeInfo[] = [];
    for (const ref of childRefs) {
      if (typeof ref.__id__ === 'number') {
        const child = build(ref.__id__);
        if (child) {
          children.push(child);
        }
      }
    }
    return {
      id,
      name: typeof obj._name === 'string' ? obj._name : '',
      type: typeof obj.__type__ === 'string' ? obj.__type__ : 'unknown',
      children,
    };
  };
  const roots: SceneNodeInfo[] = [];
  data.forEach((entry, id) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const parent = (entry as { _parent?: { __id__?: number } | null })._parent;
    const hasParent = Boolean(parent && typeof parent.__id__ === 'number' && parent.__id__ >= 0);
    if (!hasParent) {
      const node = build(id);
      if (node) {
        roots.push(node);
      }
    }
  });
  return roots;
}
