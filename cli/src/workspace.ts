import fs from 'node:fs';
import path from 'node:path';
import { type ProviderId, isProviderId, loadAgentConfig } from './config.js';
import { nowUtc8 } from './memory.js';
import { resolveInside } from './sandbox.js';

export interface WorkspaceMessage { role: 'user' | 'assistant'; content: string; timeUtc8: string; provider?: ProviderId; }
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
  if (provider !== undefined && !isProviderId(provider)) throw new Error('PROVIDER_NOT_SUPPORTED: ' + provider);
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
  if (!isProviderId(provider)) throw new Error('PROVIDER_NOT_SUPPORTED: ' + provider);
  const file = loadFile(root); const session = file.sessions.find((item) => item.id === file.activeSessionId) ?? file.sessions[0];
  session.provider = provider; session.updatedUtc8 = nowUtc8(); saveFile(root, file); return session;
}
export function deleteSession(root: string, id: string): { activeSessionId: string; deleted: string } {
  if (id === 'default') throw new Error('WORKSPACE_DEFAULT_CANNOT_DELETE');
  const file = loadFile(root); const remaining = file.sessions.filter((session) => session.id !== id);
  if (remaining.length === file.sessions.length) throw new Error(`WORKSPACE_NOT_FOUND: ${id}`);
  file.sessions = remaining; if (file.activeSessionId === id) file.activeSessionId = remaining[0].id; saveFile(root, file); return { activeSessionId: file.activeSessionId, deleted: id };
}
export function appendMessage(root: string, id: string, message: WorkspaceMessage): ChatSession {
  const file = loadFile(root); const session = file.sessions.find((item) => item.id === id);
  if (!session) throw new Error(`WORKSPACE_NOT_FOUND: ${id}`);
  session.messages = [...session.messages, message].slice(-100); session.updatedUtc8 = message.timeUtc8; saveFile(root, file); return session;
}
export function conversationContext(session: ChatSession): string { return session.messages.slice(-12).map((item) => `${item.role}: ${item.content}`).join('\n'); }
