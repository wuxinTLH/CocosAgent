import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { activeSession, appendMessage, beginSessionRun, createSession, deleteSession, listSessions, switchSession } from '../workspace.js';

function fixture(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'cocos-workspace-delete-')); }

test('deleting default or last conversation creates a fresh empty identity', () => {
  const root = fixture();
  try {
    appendMessage(root, 'default', { role: 'user', content: 'private conversation', timeUtc8: '2026-10-24T21:00:00+08:00' });
    const result = deleteSession(root, 'default');
    assert.equal(result.deleted, 'default');
    const replacement = activeSession(root);
    assert.notEqual(replacement.id, 'default');
    assert.equal(result.activeSessionId, replacement.id);
    assert.deepEqual(replacement.messages, []);
    assert.equal(listSessions(root).sessions.length, 1);
    const next = deleteSession(root, replacement.id);
    assert.notEqual(next.activeSessionId, replacement.id);
    assert.throws(() => deleteSession(root, 'absent'), /WORKSPACE_NOT_FOUND/);
    assert.equal(listSessions(root).sessions.length, 1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('deleting inactive or active conversation preserves other histories and active pointer', () => {
  const root = fixture();
  try {
    const first = createSession(root, 'Keep');
    appendMessage(root, first.id, { role: 'assistant', content: 'keep this', timeUtc8: '2026-10-24T21:00:00+08:00' });
    const second = createSession(root, 'Remove');
    deleteSession(root, 'default');
    assert.equal(activeSession(root).id, second.id);
    deleteSession(root, second.id);
    assert.equal(activeSession(root).id, first.id);
    assert.equal(activeSession(root).messages[0].content, 'keep this');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('running conversation cannot be deleted or run twice and release permits later deletion', () => {
  const root = fixture();
  try {
    const session = activeSession(root);
    const release = beginSessionRun(root, session.id);
    assert.throws(() => beginSessionRun(root, session.id), /WORKSPACE_BUSY/);
    assert.throws(() => deleteSession(root, session.id), /WORKSPACE_BUSY/);
    const other = createSession(root, 'Other');
    switchSession(root, other.id);
    appendMessage(root, session.id, { role: 'assistant', content: 'run result', timeUtc8: '2026-10-24T21:00:00+08:00' });
    assert.equal(activeSession(root).id, other.id);
    assert.equal(listSessions(root).sessions.find((item) => item.id === session.id)?.messages[0].content, 'run result');
    release(); release();
    assert.doesNotThrow(() => deleteSession(root, session.id));
    const releaseNext = beginSessionRun(root, other.id);
    releaseNext();
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
