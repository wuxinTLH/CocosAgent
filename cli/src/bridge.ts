import http from 'node:http';
import { WebSocketServer } from 'ws';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { registerEditorConnection } from './editor-tools.js';
import type { ProjectContext } from './context.js';
import { dispatchTool } from './tools.js';

interface BridgeRequest {
  id?: unknown;
  type?: string;
  tool?: string;
  args?: Record<string, unknown>;
}

export function startBridge(port: number, ctx: ProjectContext): http.Server {
  // Capture and remove the internal credential so project test children cannot inherit it.
  const editorToken = process.env.COCOS_AGENT_EDITOR_TOKEN;
  delete process.env.COCOS_AGENT_EDITOR_TOKEN;
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', projectRoot: ctx.root }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  // Reject browser pages from remote origins before they can invoke project tools.
  // Opaque "null" origins can be forged by sandboxed hostile browser frames; deny them.
  const wss = new WebSocketServer({
    server, path: '/ws', maxPayload: 262144,
    verifyClient: ({ origin }, done) => {
      const trusted = !origin || origin.startsWith('packages://') || origin.startsWith('file://');
      done(trusted, trusted ? undefined : 403, trusted ? undefined : 'Forbidden Origin');
    },
  });
  wss.on('connection', (ws) => {
    let unregister: (() => void) | undefined;
    const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
    ws.on('close', () => {
      unregister?.();
      for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('EDITOR_DISCONNECTED')); }
      pending.clear();
    });
    ws.on('message', (raw) => {
      if (Buffer.byteLength(raw.toString()) > 262144) { ws.close(1009, 'Message too large'); return; }
      const envelope = (() => { try { return JSON.parse(raw.toString()) as Record<string, unknown>; } catch { return null; } })();
      if (envelope?.type === 'editor_register') {
        const supplied = typeof envelope.token === 'string' ? envelope.token : '';
        if (unregister || !editorToken || Buffer.byteLength(supplied) !== Buffer.byteLength(editorToken) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(editorToken))) {
          ws.close(1008, 'Editor authentication failed'); return;
        }
        try {
          unregister = registerEditorConnection(ctx.root, (name, args) => new Promise((resolve, reject) => {
            if (pending.size >= 8 || ws.readyState !== 1) { reject(new Error('EDITOR_BUSY_OR_DISCONNECTED')); return; }
            const id = randomUUID();
            const timer = setTimeout(() => { pending.delete(id); reject(new Error('EDITOR_TIMEOUT: outcome may be unknown; query scene before retrying mutations.')); }, 10000);
            pending.set(id, { resolve, reject, timer });
            ws.send(JSON.stringify({ type: 'editor_request', id, tool: name, args }));
          }));
          ws.send(JSON.stringify({ type: 'editor_registered' }));
        } catch { ws.close(1008, 'Editor already connected'); }
        return;
      }
      if (unregister) {
        if (envelope?.type !== 'editor_result' || typeof envelope.id !== 'string') return;
        const item = pending.get(envelope.id);
        if (!item) return;
        pending.delete(envelope.id); clearTimeout(item.timer);
        if (envelope.ok === true) item.resolve(envelope.result);
        else item.reject(new Error(typeof envelope.error === 'string' ? envelope.error.slice(0, 1000) : 'EDITOR_REQUEST_FAILED'));
        return;
      }
      const send = (value: unknown) => { if (ws.readyState === 1) ws.send(JSON.stringify(value)); };
      let request: BridgeRequest;
      try {
        const parsed: unknown = JSON.parse(raw.toString());
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_REQUEST');
        request = parsed as BridgeRequest;
      } catch {
        send({ id: null, ok: false, error: 'INVALID_JSON_OR_REQUEST' });
        return;
      }
      if (request.type === 'ping') {
        send({ type: 'pong' });
        return;
      }
      if (request.type === 'tool') {
        dispatchTool(ctx, String(request.tool ?? ''), request.args ?? {}, { allowUserPermissionChange: request.tool === 'permission_set' })
          .then((result) => {
            send({ id: request.id ?? null, ok: true, result });
          })
          .catch((error: unknown) => {
            send({ id: request.id ?? null, ok: false, error: (error as Error).message });
          });
      }
    });
  });
  server.listen(port, '127.0.0.1');
  return server;
}
