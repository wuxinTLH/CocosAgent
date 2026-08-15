import test from 'node:test';
import assert from 'node:assert/strict';
import { chatOnce, keepAlive } from '../gateway.js';
import { mockPort, startMockGateway } from '../gateway-mock.js';

test('gateway chat returns streamed mock response', async () => {
  const server = startMockGateway(0);
  try {
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
