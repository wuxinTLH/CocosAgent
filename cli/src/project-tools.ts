import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertToolPermission } from './permissions.js';
import { resolveInside } from './sandbox.js';
import { readScene, listNodes, writeScene } from './scene.js';
import type { AgentTool } from './agent-runner.js';

const string = { type: 'string' };
const definition = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []): AgentTool => ({ name, description, inputSchema: { type: 'object', properties, required, additionalProperties: false } });
export const PROJECT_TOOLS: AgentTool[] = [
  definition('asset_find', 'Search assets on disk, at most 200 results. Not a live editor query.', { query: string, type: string, dir: string }),
  definition('scene_read', 'Read a Cocos .scene/.prefab JSON on disk under assets/.', { path: string }, ['path']),
  definition('scene_nodes', 'Read Cocos scene/prefab node tree on disk.', { path: string }, ['path']),
  definition('scene_write', 'Write validated JSON array to assets/*.scene or *.prefab, backing up existing file. Disk only; no live editor manipulation.', { path: string, json: string }, ['path', 'json']),
  definition('script_read', 'Read a .ts/.js script under assets/ or tests/.', { path: string }, ['path']),
  definition('script_write', 'Write a .ts/.js script under assets/ or tests/. Full access required.', { path: string, content: string }, ['path', 'content']),
  definition('project_test', 'Execute an existing npm test/typecheck/build/lint script at project root (full access). Project scripts are trusted code, not OS sandboxed; bounded output and 30s timeout.', { script: { type: 'string', enum: ['test', 'typecheck', 'build', 'lint'] } }, ['script']),
];

/** Reject symlinks/junctions at every existing component, including the backup path. */
function safePath(root: string, relative: string): string {
  if (!relative || relative.length > 500 || relative.includes('\\') || relative.includes(':') || relative.startsWith('/') || relative.split('/').some(p => !p || p === '.' || p === '..' || p.startsWith('.')) || /[\0\r\n]/.test(relative)) throw new Error('PROJECT_PATH_INVALID');
  const file = resolveInside(root, relative);
  let current = path.resolve(root);
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('PROJECT_SYMLINK_DENIED');
    // lstat also catches dangling links.
    try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error('PROJECT_SYMLINK_DENIED'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  return file;
}
function boundedRead(file: string): string {
  if (fs.statSync(file).size > 65536) throw new Error('PROJECT_FILE_LIMIT');
  return fs.readFileSync(file, 'utf8');
}
/** Conservative structural gate for autonomous writes, not a complete Creator deserializer. */
function validateSceneDocument(relative: string, json: string): void {
  const data: unknown = JSON.parse(json);
  const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const invalid = (): never => { throw new Error('SCENE_FORMAT_INVALID: expected a Creator asset root and valid local references'); };
  if (!Array.isArray(data) || !data.length || !data.every(object)) invalid();
  const entries = data as Record<string, unknown>[];
  const prefab = /\.prefab$/i.test(relative);
  const root = entries[0];
  if (root.__type__ !== (prefab ? 'cc.Prefab' : 'cc.SceneAsset')) invalid();
  const target = root[prefab ? 'data' : 'scene'];
  if (!object(target) || !Number.isSafeInteger(target.__id__)) invalid();
  const index = (target as Record<string, unknown>).__id__ as number;
  if (index <= 0 || index >= entries.length || entries[index].__type__ !== (prefab ? 'cc.Node' : 'cc.Scene')) invalid();
  // Check references recursively without following them: cycles in valid node graphs are normal.
  const pending: unknown[] = [...entries];
  while (pending.length) {
    const value = pending.pop();
    if (Array.isArray(value)) { pending.push(...value); continue; }
    if (!object(value)) continue;
    if (Object.hasOwn(value, '__id__') && (!Number.isSafeInteger(value.__id__) || (value.__id__ as number) < 0 || (value.__id__ as number) >= entries.length)) invalid();
    pending.push(...Object.values(value));
  }
}
export async function executeProjectTool(root: string, name: string, args: Record<string, unknown>): Promise<unknown> {
  const tool = PROJECT_TOOLS.find(t => t.name === name);
  if (!tool) throw new Error('AGENT_TOOL_NOT_ALLOWED');
  const properties = tool.inputSchema.properties as Record<string, unknown>;
  for (const key of Object.keys(args)) if (!(key in properties) || typeof args[key] !== 'string' || (args[key] as string).length > 65536) throw new Error('PROJECT_ARGUMENT_INVALID');
  for (const key of tool.inputSchema.required as string[]) if (typeof args[key] !== 'string') throw new Error('PROJECT_ARGUMENT_REQUIRED');
  assertToolPermission(root, name);
  if (name === 'project_test') {
    const script = String(args.script);
    if (!['test', 'typecheck', 'build', 'lint'].includes(script)) throw new Error('PROJECT_TEST_INVALID');
    const manifest = JSON.parse(boundedRead(safePath(root, 'package.json'))) as { scripts?: Record<string, unknown> };
    if (typeof manifest.scripts?.[script] !== 'string') throw new Error('PROJECT_TEST_SCRIPT_MISSING');
    const env: NodeJS.ProcessEnv = {};
    for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'PATHEXT']) if (process.env[key]) env[key] = process.env[key];
    const result = process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', `npm run ${script}`], { cwd: root, env, encoding: 'utf8', timeout: 30000, maxBuffer: 65536, windowsHide: true })
      : spawnSync('npm', ['run', script], { cwd: root, env, encoding: 'utf8', timeout: 30000, maxBuffer: 65536 });
    return { ok: result.status === 0 && !result.error, exitCode: result.status, error: result.error ? 'PROJECT_TEST_FAILED_OR_TIMED_OUT' : undefined, stdout: result.stdout?.slice(-12000), stderr: result.stderr?.slice(-2000) };
  }
  if (name === 'asset_find') {
    const dir = String(args.dir ?? 'assets');
    if (dir !== 'assets' && !dir.startsWith('assets/')) throw new Error('PROJECT_ASSET_PATH_REQUIRED');
    const base = safePath(root, dir); const results: Array<{ path: string; type: string }> = [];
    const types: Record<string, string> = { '.scene': 'scene', '.prefab': 'prefab', '.ts': 'script', '.js': 'script', '.png': 'texture', '.jpg': 'texture', '.jpeg': 'texture', '.webp': 'texture', '.fbx': 'model', '.gltf': 'model', '.glb': 'model', '.material': 'material', '.anim': 'animation' };
    let visited = 0;
    function walk(current: string, depth: number): void {
      if (depth > 16 || !fs.existsSync(current)) return;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        if (++visited > 10000 || results.length >= 200) return;
        if (entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) walk(full, depth + 1);
        else if (entry.isFile()) {
          const rel = path.relative(root, full).replace(/\\/g, '/'); const type = types[path.extname(full).toLowerCase()];
          if (type && (!args.type || args.type === type) && rel.toLowerCase().includes(String(args.query ?? '').toLowerCase())) results.push({ path: rel, type });
        }
      }
    }
    walk(base, 0); return { assets: results, limited: visited > 10000 || results.length >= 200 };
  }
  const relative = String(args.path); const file = safePath(root, relative);
  if (name.startsWith('scene_')) {
    if (!relative.startsWith('assets/') || !/\.(scene|prefab)$/i.test(relative)) throw new Error('PROJECT_SCENE_PATH_REQUIRED');
    if (name === 'scene_write') {
      validateSceneDocument(relative, String(args.json));
      if (fs.existsSync(file)) { if (!fs.statSync(file).isFile()) throw new Error('PROJECT_FILE_REQUIRED'); boundedRead(file); }
      safePath(root, 'temp/agent-backup'); fs.mkdirSync(path.dirname(file), { recursive: true });
      writeScene(root, relative, String(args.json)); return { ok: true, path: relative, diskOnly: true };
    }
    boundedRead(file); return name === 'scene_nodes' ? listNodes(root, relative) : readScene(root, relative);
  }
  if (!/^(assets|tests)\/.+\.(ts|js)$/i.test(relative)) throw new Error('PROJECT_SCRIPT_PATH_REQUIRED');
  if (name === 'script_read') return { path: relative, content: boundedRead(file) };
  let backup: string | undefined;
  if (fs.existsSync(file)) {
    if (!fs.statSync(file).isFile()) throw new Error('PROJECT_FILE_REQUIRED');
    const existing = boundedRead(file);
    backup = `temp/agent-backup/script-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.bak`;
    const backupFile = safePath(root, backup); fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    fs.writeFileSync(backupFile, existing, { encoding: 'utf8', flag: 'wx' });
  }
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, String(args.content), 'utf8');
  return { ok: true, path: relative, backup };
}
