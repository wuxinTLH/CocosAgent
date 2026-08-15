import path from 'node:path';
import { normalizeRoot } from './context.js';

export function resolveInside(root: string, target: string): string {
  const rootNormalized = normalizeRoot(root);
  const targetNormalized = normalizeRoot(path.resolve(root, target));
  const prefix = rootNormalized.endsWith('/') ? rootNormalized : `${rootNormalized}/`;
  if (targetNormalized !== rootNormalized && !targetNormalized.startsWith(prefix)) {
    throw new Error(`SANDBOX_VIOLATION: ${targetNormalized}`);
  }
  return targetNormalized;
}

export function isInside(root: string, target: string): boolean {
  try {
    resolveInside(root, target);
    return true;
  } catch {
    return false;
  }
}
