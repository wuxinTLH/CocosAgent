import http from 'node:http';
import { WebSocketServer } from 'ws';
import type { ProjectContext } from './context.js';
import { dispatchTool } from './tools.js';

interface BridgeRequest {
  id?: unknown;
  type?: string;
  tool?: string;
  args?: Record<string, unknown>;
}

export function startBridge(port: number, ctx: ProjectContext): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', projectRoot: ctx.root }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let request: BridgeRequest;
      try {
        request = JSON.parse(raw.toString()) as BridgeRequest;
      } catch {
        ws.send(JSON.stringify({ id: null, ok: false, error: 'INVALID_JSON' }));
        return;
      }
      if (request.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      if (request.type === 'tool') {
        dispatchTool(ctx, String(request.tool ?? ''), request.args ?? {})
          .then((result) => {
            ws.send(JSON.stringify({ id: request.id ?? null, ok: true, result }));
          })
          .catch((error: unknown) => {
            ws.send(JSON.stringify({ id: request.id ?? null, ok: false, error: (error as Error).message }));
          });
      }
    });
  });
  server.listen(port, '127.0.0.1');
  return server;
}
