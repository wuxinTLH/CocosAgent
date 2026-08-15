import WebSocket from 'ws';

export interface GatewayEvent {
  type: string;
  payload?: unknown;
}

export interface GatewayChatOptions {
  url: string;
  token?: string;
  chat: string;
  memoryContext?: string;
  timeoutMs?: number;
  allowSelfSigned?: boolean;
}

export interface GatewayChatResult {
  id: string;
  content: string;
  status: 'done' | 'error';
}

function authHeaders(token?: string): Record<string, string> | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export function openSocket(
  url: string,
  token?: string,
  timeoutMs = 5000,
  allowSelfSigned = false,
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: authHeaders(token),
      rejectUnauthorized: !allowSelfSigned,
    });
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`WEBSOCKET_TIMEOUT: ${url}`));
    }, timeoutMs);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export async function pingWebSocket(
  url: string,
  timeoutMs = 5000,
  token = process.env.COCOS_AGENT_GATEWAY_TOKEN,
  allowSelfSigned = false,
): Promise<void> {
  const ws = await openSocket(url, token, timeoutMs, allowSelfSigned);
  ws.close();
}

export function chatOnce(options: GatewayChatOptions): Promise<GatewayChatResult> {
  return new Promise((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? 120_000;
    openSocket(options.url, options.token, 10_000, options.allowSelfSigned)
      .then((ws) => {
        const timer = setTimeout(() => {
          ws.terminate();
          reject(new Error('GATEWAY_RESPONSE_TIMEOUT'));
        }, timeoutMs);
        const messageId = `msg-${Date.now()}`;
        let content = '';
        ws.on('message', (raw) => {
          let event: GatewayEvent;
          try {
            event = JSON.parse(raw.toString()) as GatewayEvent;
          } catch {
            return;
          }
          if (event.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          if (event.type === 'chat.completion.chunk') {
            const payload = event.payload as { delta?: string } | undefined;
            content += payload?.delta ?? '';
            return;
          }
          if (event.type === 'chat.completion.done') {
            clearTimeout(timer);
            ws.close();
            resolve({ id: messageId, content, status: 'done' });
            return;
          }
          if (event.type === 'chat.completion.error') {
            clearTimeout(timer);
            ws.close();
            const payload = event.payload as { error?: unknown } | undefined;
            resolve({
              id: messageId,
              content: content || String(payload?.error ?? 'unknown error'),
              status: 'error',
            });
          }
        });
        ws.on('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
        ws.send(
          JSON.stringify({
            type: 'chat.completions',
            id: messageId,
            payload: {
              model: process.env.COCOS_AGENT_GATEWAY_MODEL ?? 'agent-default',
              messages: [
                { role: 'system', content: options.memoryContext ?? 'Cocos Agent' },
                { role: 'user', content: options.chat },
              ],
              stream: true,
            },
          }),
        );
      })
      .catch(reject);
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function keepAlive(options: {
  url: string;
  token?: string;
  onEvent?: (event: unknown) => void;
  maxReconnects?: number;
  allowSelfSigned?: boolean;
}): Promise<void> {
  let delayMs = 1000;
  let reconnects = 0;
  for (;;) {
    let ws: WebSocket;
    try {
      ws = await openSocket(options.url, options.token, 10_000, options.allowSelfSigned);
      delayMs = 1000;
      process.stderr.write(`[gateway] connected ${options.url}\n`);
    } catch (error) {
      process.stderr.write(`[gateway] connect failed: ${(error as Error).message}; retry in ${delayMs}ms\n`);
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, 30_000);
      continue;
    }
    await new Promise<void>((done) => {
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30_000);
      ws.on('message', (raw) => {
        let event: unknown;
        try {
          event = JSON.parse(raw.toString());
        } catch {
          event = { type: 'raw', data: raw.toString() };
        }
        options.onEvent?.(event);
        if ((event as { type?: string }).type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      });
      ws.on('close', () => {
        clearInterval(heartbeat);
        done();
      });
      ws.on('error', () => {
        // close event follows
      });
    });
    reconnects += 1;
    if (options.maxReconnects !== undefined && reconnects >= options.maxReconnects) {
      return;
    }
  }
}
