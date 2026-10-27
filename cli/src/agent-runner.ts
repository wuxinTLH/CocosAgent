export interface AgentTool { name: string; description: string; inputSchema: Record<string, unknown>; }
export interface ToolTrace { id: string; name: string; status: 'completed' | 'error'; result: string; }
export const AGENT_LIMITS = { turns: 8, tools: 16, argumentChars: 65536, resultChars: 16000 } as const;
type Json = Record<string, unknown>;
const record = (value: unknown): Json => value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {};
const records = (value: unknown): Json[] => Array.isArray(value) ? value.map(record) : [];
const text = (value: unknown): string => typeof value === 'string' ? value : '';
export interface AgentRunResult { content: string; status: 'done' | 'error'; toolTrace: ToolTrace[]; }
/** Transport and executor are injected so the runner cannot call configuration/MCP recursively. */
export async function runAgent(options: {
  protocol: 'chat-completions' | 'responses' | 'anthropic'; model: string; system: string; chat: string;
  tools: AgentTool[]; post: (body: Json) => Promise<Json>;
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  sanitize?: (text: string) => string;
}): Promise<AgentRunResult> {
  // Administrative elevation is never a model capability, even if a caller supplies it.
  options = { ...options, tools: options.tools.filter(tool => tool.name !== 'permission_set') };
  const trace: ToolTrace[] = []; const seen = new Set<string>();
  const clean = (text: string) => (options.sanitize?.(text) ?? text);
  const bounded = (text: string) => clean(text).slice(0, AGENT_LIMITS.resultChars);
  const messages: Json[] = [{ role: 'user', content: options.chat }];
  const input: Json[] = [{ role: 'user', content: options.chat }];
  const tools = options.tools.map(t => options.protocol === 'anthropic' ? { name: t.name, description: t.description, input_schema: t.inputSchema } : options.protocol === 'responses' ? { type: 'function', name: t.name, description: t.description, parameters: t.inputSchema } : { type: 'function', function: { name: t.name, description: t.description, parameters: t.inputSchema } });
  try {
    for (let turn = 0; turn < AGENT_LIMITS.turns; turn++) {
      const body = options.protocol === 'anthropic' ? { model: options.model, max_tokens: 4096, system: options.system, messages, tools } : options.protocol === 'responses' ? { model: options.model, instructions: options.system, input, tools, stream: false } : { model: options.model, messages: [{ role: 'system', content: options.system }, ...messages], tools, stream: false };
      const data = await options.post(body);
      let calls: Array<{ id: string; name: string; args: unknown }> = []; let content = '';
      if (options.protocol === 'anthropic') {
        if (data.stop_reason === 'max_tokens') throw new Error('PROVIDER_INCOMPLETE_RESPONSE');
        if (!Array.isArray(data.content)) throw new Error('PROVIDER_INVALID_RESPONSE');
        content = records(data.content).filter(b => b.type === 'text').map(b => text(b.text)).join('');
        calls = records(data.content).filter(b => b.type === 'tool_use').map(b => ({ id: text(b.id), name: text(b.name), args: b.input }));
        messages.push({ role: 'assistant', content: data.content });
      } else if (options.protocol === 'responses') {
        if (data.status !== 'completed') throw new Error('PROVIDER_INCOMPLETE_RESPONSE');
        const output = records(data.output);
        if (output.some(b => b.type === 'message' && b.status && b.status !== 'completed')) throw new Error('PROVIDER_INCOMPLETE_RESPONSE');
        if (output.some(b => b.type === 'message' && records(b.content).some(p => p.type === 'refusal'))) throw new Error('PROVIDER_REFUSAL');
        content = output.filter(b => b.type === 'message' && b.role === 'assistant').flatMap(b => records(b.content)).filter(p => p.type === 'output_text').map(p => text(p.text)).join('') || text(data.output_text);
        calls = output.filter(b => b.type === 'function_call').map(b => ({ id: text(b.call_id), name: text(b.name), args: b.arguments }));
        input.push(...output);
      } else {
        const first = records(data.choices)[0]; const message = record(first?.message);
        if (first?.finish_reason === 'length') throw new Error('PROVIDER_INCOMPLETE_RESPONSE');
        if (!first?.message || message.refusal) throw new Error('PROVIDER_INVALID_RESPONSE');
        content = text(message.content);
        calls = records(message.tool_calls).map(c => ({ id: text(c.id), name: text(record(c.function).name), args: record(c.function).arguments }));
        messages.push({ role: 'assistant', content: message.content ?? null, ...(calls.length ? { tool_calls: message.tool_calls } : {}) });
      }
      if (!calls.length) {
        if (!content.trim()) throw new Error('PROVIDER_INVALID_RESPONSE');
        return { content: clean(content), status: 'done', toolTrace: trace };
      }
      if (trace.length + calls.length > AGENT_LIMITS.tools) throw new Error('AGENT_TOOL_LIMIT');
      // Validate all IDs before dispatching any call; never replay a provider call ID.
      for (const call of calls) {
        if (typeof call.id !== 'string' || !call.id || call.id.length > 200 || seen.has(call.id)) throw new Error('AGENT_DUPLICATE_OR_INVALID_CALL_ID');
        seen.add(call.id);
      }
      const results: Json[] = [];
      for (const call of calls) {
        let result: string; let status: ToolTrace['status'] = 'completed';
        try {
          if (!options.tools.some(t => t.name === call.name)) throw new Error('AGENT_TOOL_NOT_ALLOWED');
          const raw = typeof call.args === 'string' ? call.args : JSON.stringify(call.args);
          if (!raw || raw.length > AGENT_LIMITS.argumentChars) throw new Error('AGENT_ARGUMENT_LIMIT');
          const args: unknown = JSON.parse(raw);
          if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('AGENT_ARGUMENT_INVALID');
          const value = await options.execute(call.name, args as Record<string, unknown>);
          if (value && typeof value === 'object' && 'ok' in value && value.ok === false) status = 'error';
          result = bounded(JSON.stringify(value) ?? 'null');
        } catch (error) { status = 'error'; result = bounded((error as Error).message); }
        trace.push({ id: call.id, name: String(call.name).slice(0, 100), status, result });
        const output = JSON.stringify({ status, result });
        if (options.protocol === 'responses') input.push({ type: 'function_call_output', call_id: call.id, output });
        else if (options.protocol === 'anthropic') results.push({ type: 'tool_result', tool_use_id: call.id, content: output, is_error: status === 'error' });
        else messages.push({ role: 'tool', tool_call_id: call.id, content: output });
      }
      if (options.protocol === 'anthropic') messages.push({ role: 'user', content: results });
    }
    throw new Error('AGENT_TURN_LIMIT');
  } catch (error) {
    // Once anything was dispatched, return the partial trace, never fall back and repeat mutations.
    if (trace.length) return { content: bounded(`Agent stopped: ${(error as Error).message}. Completed tools are not rolled back.`), status: 'error', toolTrace: trace };
    throw error;
  }
}
