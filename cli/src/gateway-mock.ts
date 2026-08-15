import http from 'node:http';
import https from 'node:https';
import { WebSocketServer } from 'ws';

export interface MockGatewayOptions {
  dropAfterMessages?: number;
  expectedToken?: string;
  pfx?: Buffer;
  passphrase?: string;
  echoSystemContext?: boolean;
}

export interface MockMessage {
  type?: string;
  id?: unknown;
  payload?: {
    messages?: Array<{ content?: string }>;
  };
}

const requestsByServer = new WeakMap<http.Server, MockMessage[]>();

export function startMockGateway(port: number, options: MockGatewayOptions = {}): http.Server {
  const handler: http.RequestListener = (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'mock-gateway' }));
  };
  const server = options.pfx
    ? https.createServer({ pfx: options.pfx, passphrase: options.passphrase }, handler)
    : http.createServer(handler);
  const requests: MockMessage[] = [];
  requestsByServer.set(server, requests);
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws, request) => {
    if (
      options.expectedToken &&
      request.headers.authorization !== `Bearer ${options.expectedToken}`
    ) {
      ws.close(1008, 'unauthorized');
      return;
    }
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
        requests.push(message);
        const id = message.id ?? 'mock';
        const userText =
          message.payload?.messages?.at(-1)?.content ?? 'no message';
        const systemText = message.payload?.messages?.[0]?.content ?? '';
        ws.send(
          JSON.stringify({ type: 'chat.completion.chunk', id, payload: { delta: 'mock:' } }),
        );
        if (options.echoSystemContext) {
          ws.send(
            JSON.stringify({
              type: 'chat.completion.chunk',
              id,
              payload: { delta: ` context ${systemText}` },
            }),
          );
        }
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

export function mockRequests(server: http.Server): readonly MockMessage[] {
  return requestsByServer.get(server) ?? [];
}

export function mockPort(server: http.Server): number {
  const address = server.address();
  return typeof address === 'object' && address ? address.port : 0;
}

export function waitForMockGateway(server: http.Server): Promise<void> {
  if (server.listening) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
}
