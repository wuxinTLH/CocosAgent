import http from 'node:http';
import { WebSocketServer } from 'ws';

export interface MockGatewayOptions {
  dropAfterMessages?: number;
}

interface MockMessage {
  type?: string;
  id?: unknown;
  payload?: {
    messages?: Array<{ content?: string }>;
  };
}

export function startMockGateway(port: number, options: MockGatewayOptions = {}): http.Server {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'mock-gateway' }));
  });
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    let messageCount = 0;
    const heartbeat = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 100);
    ws.on('message', (raw) => {
      let message: MockMessage;
      try {
        message = JSON.parse(raw.toString()) as MockMessage;
      } catch {
        return;
      }
      messageCount += 1;
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      if (message.type === 'chat.completions') {
        const id = message.id ?? 'mock';
        const userText =
          message.payload?.messages?.at(-1)?.content ?? 'no message';
        ws.send(
          JSON.stringify({ type: 'chat.completion.chunk', id, payload: { delta: 'mock:' } }),
        );
        ws.send(
          JSON.stringify({
            type: 'chat.completion.chunk',
            id,
            payload: { delta: ` echo ${userText}` },
          }),
        );
        ws.send(JSON.stringify({ type: 'chat.completion.done', id, payload: {} }));
      }
      if (options.dropAfterMessages && messageCount >= options.dropAfterMessages) {
        clearInterval(heartbeat);
        ws.close();
      }
    });
    ws.on('close', () => {
      clearInterval(heartbeat);
    });
  });
  server.listen(port, '127.0.0.1');
  return server;
}

export function mockPort(server: http.Server): number {
  const address = server.address();
  return typeof address === 'object' && address ? address.port : 0;
}
