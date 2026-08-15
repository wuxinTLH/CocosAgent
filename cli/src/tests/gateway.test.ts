import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chatOnce, keepAlive } from '../gateway.js';
import {
  mockPort,
  mockRequests,
  startMockGateway,
  waitForMockGateway,
} from '../gateway-mock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');

test('gateway chat returns streamed mock response', async () => {
  const server = startMockGateway(0);
  try {
    await waitForMockGateway(server);
    const port = mockPort(server);
    const result = await chatOnce({
      url: `ws://127.0.0.1:${port}/ws`,
      chat: 'hello gateway',
      timeoutMs: 5000,
    });
    assert.equal(result.status, 'done');
    assert.match(result.content, /hello gateway/);
  } finally {
    server.close();
  }
});

test('gateway keepalive reconnects after server drops', async () => {
  const server = startMockGateway(0, { dropAfterMessages: 2 });
  try {
    await waitForMockGateway(server);
    const port = mockPort(server);
    const events: string[] = [];
    await keepAlive({
      url: `ws://127.0.0.1:${port}/ws`,
      maxReconnects: 2,
      onEvent: (event) => events.push((event as { type?: string }).type ?? 'raw'),
    });
    assert.ok(events.includes('ping'));
  } finally {
    server.close();
  }
});

test(
  'gateway WSS validates token and forwards memory context',
  { skip: !process.env.COCOS_AGENT_TEST_WSS_PFX },
  async () => {
    const pfxFile = process.env.COCOS_AGENT_TEST_WSS_PFX as string;
    const server = startMockGateway(0, {
      pfx: fs.readFileSync(pfxFile),
      passphrase: process.env.COCOS_AGENT_TEST_WSS_PASSPHRASE ?? 'cocos-agent-test',
      expectedToken: 'test-token',
      echoSystemContext: true,
    });
    try {
      await waitForMockGateway(server);
      const result = await chatOnce({
        url: `wss://localhost:${mockPort(server)}/ws`,
        token: 'test-token',
        chat: 'secure hello',
        memoryContext: 'short-memory-context',
        allowSelfSigned: true,
        timeoutMs: 5000,
      });
      assert.equal(result.status, 'done');
      assert.match(result.content, /secure hello/);
      assert.match(result.content, /short-memory-context/);
      assert.equal(mockRequests(server).length, 1);
    } finally {
      server.close();
    }
  },
);
