import fs from 'node:fs';
import path from 'node:path';
import { resolveInside } from './sandbox.js';

const EXT_TYPES: Record<string, string> = {
  '.scene': 'scene',
  '.prefab': 'prefab',
  '.material': 'material',
  '.mtl': 'material',
  '.fbx': 'model',
  '.gltf': 'model',
  '.glb': 'model',
  '.obj': 'model',
  '.png': 'texture',
  '.jpg': 'texture',
  '.jpeg': 'texture',
  '.webp': 'texture',
  '.tga': 'texture',
  '.ts': 'script',
  '.js': 'script',
};

export interface AssetEntry {
  path: string;
  type: string;
  name: string;
}

export function findAssets(
  root: string,
  query = '',
  type?: string,
  dir?: string,
): AssetEntry[] {
  const baseDir = resolveInside(root, dir && dir.trim() ? dir : 'assets');
  if (!fs.existsSync(baseDir)) {
    return [];
  }
  const results: AssetEntry[] = [];
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const assetType = EXT_TYPES[ext];
        if (!assetType) {
          continue;
        }
        if (type && assetType !== type) {
          continue;
        }
        const rel = path.relative(root, full).replace(/\\/g, '/');
        if (query && !rel.toLowerCase().includes(query.toLowerCase())) {
          continue;
        }
        results.push({
          path: rel,
          type: assetType,
          name: path.basename(entry.name, path.extname(entry.name)),
        });
      }
    }
  };
  walk(baseDir);
  return results.sort((a, b) => a.path.localeCompare(b.path));
}
