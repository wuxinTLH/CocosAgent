import path from 'node:path';
import { assertToolPermission } from './permissions.js';
import type { AgentTool } from './agent-runner.js';

const uuid = { type: 'string', minLength: 1, maxLength: 128 };
export const EDITOR_TOOLS: AgentTool[] = [
  { name: 'editor_scene_query', description: 'Query the live Creator node tree (optionally under a node UUID) and scene dirty state. Requires the authenticated Creator extension; not an on-disk scene read. Results are bounded.', inputSchema: { type: 'object', properties: { uuid }, additionalProperties: false } },
  { name: 'editor_node_create', description: 'Create one empty node in the currently open Creator scene, with optional parent UUID and position. Full access required. Leaves scene unsaved; never saves or opens scenes.', inputSchema: { type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 128 }, parent: uuid, position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }, required: ['x', 'y', 'z'], additionalProperties: false } }, required: ['name'], additionalProperties: false } },
];

export type EditorSender = (name: string, args: Record<string, unknown>) => Promise<unknown>;
const editors = new Map<string, EditorSender>();
/** Internal bridge registration only; never exposed as a model tool. */
export function registerEditorConnection(root: string, sender: EditorSender): () => void {
  const key = path.resolve(root);
  if (editors.has(key)) throw new Error('EDITOR_ALREADY_CONNECTED');
  editors.set(key, sender);
  return () => { if (editors.get(key) === sender) editors.delete(key); };
}

export function validateEditorArguments(name: string, args: Record<string, unknown>): Record<string, unknown> {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('EDITOR_ARGUMENT_INVALID');
  const allowed = name === 'editor_scene_query' ? ['uuid'] : name === 'editor_node_create' ? ['name', 'parent', 'position'] : [];
  if (!allowed.length) throw new Error('AGENT_TOOL_NOT_ALLOWED');
  if (Object.keys(args).some(key => !allowed.includes(key))) throw new Error('EDITOR_ARGUMENT_INVALID');
  for (const key of ['uuid', 'parent']) {
    if (args[key] !== undefined && (typeof args[key] !== 'string' || !/^[A-Za-z0-9_+\-/=]{1,128}$/.test(args[key] as string))) throw new Error('EDITOR_UUID_INVALID');
  }
  if (name === 'editor_node_create' && (typeof args.name !== 'string' || !args.name.trim() || args.name.length > 128 || /[\x00-\x1f\x7f]/.test(args.name))) throw new Error('EDITOR_NAME_INVALID');
  if (args.position !== undefined) {
    const p = args.position as Record<string, unknown>;
    if (!p || typeof p !== 'object' || Array.isArray(p) || Object.keys(p).length !== 3 || !['x', 'y', 'z'].every(key => typeof p[key] === 'number' && Number.isFinite(p[key]) && Math.abs(p[key] as number) <= 1000000)) throw new Error('EDITOR_POSITION_INVALID');
  }
  // Strip prototypes and retain only the narrowly validated data.
  return JSON.parse(JSON.stringify(args)) as Record<string, unknown>;
}

export async function executeEditorTool(root: string, name: string, args: Record<string, unknown>): Promise<unknown> {
  const clean = validateEditorArguments(name, args);
  assertToolPermission(root, name);
  const sender = editors.get(path.resolve(root));
  if (!sender) throw new Error('EDITOR_NOT_CONNECTED: open this project in Creator with the Cocos Agent extension and its managed bridge.');
  return sender(name, clean);
}
