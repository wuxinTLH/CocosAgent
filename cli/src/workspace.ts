import fs from 'node:fs';
import path from 'node:path';
import { type ProviderId, isProviderId, loadAgentConfig } from './config.js';
import { nowUtc8 } from './memory.js';
import { resolveInside } from './sandbox.js';

export interface ToolTrace { id: string; name: string; status: 'completed' | 'error'; result: string; }
export interface WorkspaceMessage { role: 'user' | 'assistant'; content: string; timeUtc8: string; provider?: ProviderId; toolTrace?: ToolTrace[]; }
// Serialize model runs per project. A running conversation cannot be deleted;
// switching views is safe because appends always target the captured session id.
const runningSessions = new Map<string, string>();
function runKey(root: string): string { const resolved = path.resolve(root); return process.platform === 'win32' ? resolved.toLowerCase() : resolved; }
export function beginSessionRun(root: string, id: string): () => void {
  const key = runKey(root);
  if (runningSessions.has(key)) throw new Error('WORKSPACE_BUSY: a conversation is already running');
  runningSessions.set(key, id);
  return () => { if (runningSessions.get(key) === id) runningSessions.delete(key); };
}
export interface ChatSession {
  id: string; name: string; provider: ProviderId; fallbackProviders: ProviderId[];
  createdUtc8: string; updatedUtc8: string; messages: WorkspaceMessage[];
}
interface WorkspaceFile { version: 1; activeSessionId: string; sessions: ChatSession[]; }
function workspaceFile(root: string): string { return resolveInside(root, '.cocos-agent/workspace.json'); }
function newId(): string { return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
function defaultSession(root: string): ChatSession {
  const config = loadAgentConfig(root); const timeUtc8 = nowUtc8();
  return { id: 'default', name: 'Default', provider: config.activeProvider, fallbackProviders: config.fallbackProviders, createdUtc8: timeUtc8, updatedUtc8: timeUtc8, messages: [] };
}
function loadFile(root: string): WorkspaceFile {
  const file = workspaceFile(root);
  if (!fs.existsSync(file)) { const session = defaultSession(root); return { version: 1, activeSessionId: session.id, sessions: [session] }; }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as WorkspaceFile;
    if (!Array.isArray(parsed.sessions) || parsed.sessions.length === 0) throw new Error('sessions is empty');
    return parsed;
  } catch (error) { throw new Error(`WORKSPACE_INVALID: ${(error as Error).message}`); }
}
function saveFile(root: string, value: WorkspaceFile): void {
  const file = workspaceFile(root); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
export function listSessions(root: string): { activeSessionId: string; sessions: ChatSession[] } { const file = loadFile(root); return { activeSessionId: file.activeSessionId, sessions: file.sessions }; }
export function activeSession(root: string): ChatSession { const file = loadFile(root); return file.sessions.find((item) => item.id === file.activeSessionId) ?? file.sessions[0]; }
export function createSession(root: string, name: string, provider?: ProviderId, fallbackProviders?: ProviderId[]): ChatSession {
  const file = loadFile(root); const config = loadAgentConfig(root); const normalizedName = name.trim().slice(0, 80);
  if (provider !== undefined && !isProviderId(provider, root)) throw new Error('PROVIDER_NOT_SUPPORTED: ' + provider);
  if (!normalizedName) throw new Error('WORKSPACE_NAME_REQUIRED');
  const timeUtc8 = nowUtc8();
  const session: ChatSession = { id: newId(), name: normalizedName, provider: provider ?? config.activeProvider, fallbackProviders: fallbackProviders ?? config.fallbackProviders, createdUtc8: timeUtc8, updatedUtc8: timeUtc8, messages: [] };
  file.sessions.push(session); file.activeSessionId = session.id; saveFile(root, file); return session;
}
export function switchSession(root: string, id: string): ChatSession {
  const file = loadFile(root); const session = file.sessions.find((item) => item.id === id);
  if (!session) throw new Error(`WORKSPACE_NOT_FOUND: ${id}`);
  file.activeSessionId = id; saveFile(root, file); return session;
}
export function updateSessionProvider(root: string, provider: ProviderId): ChatSession {
  if (!isProviderId(provider, root)) throw new Error('PROVIDER_NOT_SUPPORTED: ' + provider);
  const file = loadFile(root); const session = file.sessions.find((item) => item.id === file.activeSessionId) ?? file.sessions[0];
  session.provider = provider; session.updatedUtc8 = nowUtc8(); saveFile(root, file); return session;
}
export function deleteSession(root: string, id: string): { activeSessionId: string; deleted: string } {
  if (runningSessions.get(runKey(root)) === id) throw new Error('WORKSPACE_BUSY: cannot delete a running conversation');
  const file = loadFile(root); const remaining = file.sessions.filter((session) => session.id !== id);
  if (remaining.length === file.sessions.length) throw new Error(`WORKSPACE_NOT_FOUND: ${id}`);
  // The default conversation is not special user data: it is deletable too.
  // A fresh identity prevents stale responses from targeting its replacement.
  if (remaining.length === 0) remaining.push({ ...defaultSession(root), id: newId(), name: '新对话' });
  file.sessions = remaining;
  if (file.activeSessionId === id || !remaining.some((session) => session.id === file.activeSessionId)) file.activeSessionId = remaining[0].id;
  saveFile(root, file); return { activeSessionId: file.activeSessionId, deleted: id };
}
export function appendMessage(root: string, id: string, message: WorkspaceMessage): ChatSession {
  const file = loadFile(root); const session = file.sessions.find((item) => item.id === id);
  if (!session) throw new Error(`WORKSPACE_NOT_FOUND: ${id}`);
  session.messages = [...session.messages, message].slice(-100); session.updatedUtc8 = message.timeUtc8; saveFile(root, file); return session;
}
export function assertProjectIdle(root: string): void {
  if (runningSessions.has(runKey(root))) throw new Error('WORKSPACE_BUSY: cannot delete a provider during a project run');
}
export function repairSessionProviders(root: string, deleted: ProviderId, replacement: ProviderId, dryRun = false): ReturnType<typeof listSessions> {
  const file = loadFile(root);
  for (const session of file.sessions) {
    if (!session || typeof session !== 'object' || !Array.isArray(session.fallbackProviders) || session.fallbackProviders.some(id => typeof id !== 'string') || !Array.isArray(session.messages) || session.messages.some(message => !message || typeof message !== 'object')) throw new Error('WORKSPACE_INVALID: invalid session provider references or messages');
    if (session.provider === deleted) session.provider = replacement;
    session.fallbackProviders = session.fallbackProviders.filter(id => id !== deleted && id !== session.provider);
    // Remove dangling attribution rather than falsely crediting a different model.
    for (const message of session.messages) if (message.provider === deleted) delete message.provider;
  }
  if (!dryRun) saveFile(root, file);
  return { activeSessionId: file.activeSessionId, sessions: file.sessions };
}
export function rollbackSession(root: string, id: unknown, messageIndex: unknown, expectedMessage?: unknown): { session: ChatSession; draft: string } {
  if (expectedMessage !== undefined && (!expectedMessage || typeof expectedMessage !== 'object' || Array.isArray(expectedMessage) || Object.keys(expectedMessage).some(key => key !== 'content' && key !== 'timeUtc8') || typeof (expectedMessage as WorkspaceMessage).content !== 'string' || typeof (expectedMessage as WorkspaceMessage).timeUtc8 !== 'string')) throw new Error('WORKSPACE_ROLLBACK_INVALID');
  if (typeof id !== 'string' || !id || typeof messageIndex !== 'number' || !Number.isSafeInteger(messageIndex) || messageIndex < 0) throw new Error('WORKSPACE_ROLLBACK_INVALID');
  if (runningSessions.get(runKey(root)) === id) throw new Error('WORKSPACE_BUSY: cannot roll back a running conversation');
  const file = loadFile(root); const session = file.sessions.find(item => item.id === id);
  if (!session) throw new Error(`WORKSPACE_NOT_FOUND: ${id}`);
  const selected = session.messages[messageIndex];
  if (!selected || selected.role !== 'user') throw new Error('WORKSPACE_ROLLBACK_INVALID: select an existing user message');
  if (expectedMessage !== undefined && (selected.content !== (expectedMessage as WorkspaceMessage).content || selected.timeUtc8 !== (expectedMessage as WorkspaceMessage).timeUtc8)) throw new Error('WORKSPACE_ROLLBACK_STALE: selected message changed; refresh the conversation');
  const draft = selected.content;
  session.messages = session.messages.slice(0, messageIndex);
  session.updatedUtc8 = nowUtc8(); saveFile(root, file);
  return { session, draft };
}
export function conversationContext(session: ChatSession): string { return session.messages.slice(-12).map((item) => `${item.role}: ${item.content}`).join('\n'); }
