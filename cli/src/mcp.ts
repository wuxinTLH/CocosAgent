import readline from 'node:readline';
import { loadContext } from './context.js';
import { dispatchTool, MCP_TOOLS } from './tools.js';

interface McpRequest {
  id?: unknown;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

function respond(id: unknown, result: unknown, isError = false): void {
  const body = isError ? { error: result } : { result };
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, ...body })}\n`);
}

export async function runMcpServer(): Promise<void> {
  const ctx = loadContext();
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }
    let request: McpRequest;
    try {
      request = JSON.parse(line) as McpRequest;
    } catch {
      continue;
    }
    if (request.method === 'initialize') {
      respond(request.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'cocos-agent', version: '0.1.0' },
      });
    } else if (request.method === 'tools/list') {
      respond(request.id, { tools: MCP_TOOLS });
    } else if (request.method === 'tools/call') {
      try {
        const result = await dispatchTool(
          ctx,
          String(request.params?.name ?? ''),
          request.params?.arguments ?? {},
        );
        respond(request.id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      } catch (error) {
        respond(
          request.id,
          { content: [{ type: 'text', text: (error as Error).message }], isError: true },
          true,
        );
      }
    } else if (request.method === 'notifications/initialized') {
      // notification, no response
    } else if (request.id !== undefined) {
      respond(request.id, { code: -32601, message: `method not found: ${request.method}` }, true);
    }
  }
}
