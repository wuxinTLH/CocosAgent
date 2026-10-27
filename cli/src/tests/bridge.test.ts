import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { startBridge } from '../bridge.js';

function connect(url: string, origin?: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, origin ? { origin } : undefined);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

test('bridge accepts local panel origins but rejects foreign web pages', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cocos-bridge-test-'));
  const server = startBridge(0, { root, cwd: root });
  try {
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `ws://127.0.0.1:${address.port}/ws`;
    for (const origin of [undefined, 'packages://cocos-agent/cli', 'file:///editor/panel.html']) {
      const socket = await connect(url, origin);
      socket.close();
    }
    const panel = await connect(url, 'packages://cocos-agent/cli');
    try {
      const reply = new Promise<{ ok: boolean; result: { current: { permissionMode: string } } }>((resolve, reject) => {
        panel.once('message', raw => resolve(JSON.parse(raw.toString())));
        panel.once('error', reject);
      });
      panel.send(JSON.stringify({ type: 'tool', id: 'permission', tool: 'permission_set', args: { mode: 'full-access', userInitiated: true } }));
      const result = await reply;
      assert.equal(result.ok, true);
      assert.equal(result.result.current.permissionMode, 'full-access');
    } finally { panel.close(); }
    await assert.rejects(connect(url, 'null'), /403/); // Sandboxed remote iframe has this opaque origin.
    await assert.rejects(connect(url, 'https://attacker.example'), /403/);
    await assert.rejects(connect(url, 'http://127.0.0.1:3000'), /403/);
    await new Promise<void>((resolve, reject) => {
      http.get(`http://127.0.0.1:${address.port}/health`, (response) => {
        assert.equal(response.statusCode, 200);
        response.resume();
        response.once('end', resolve);
      }).once('error', reject);
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
