import { PROVIDER_IDS, type ProviderId, type SupportedLocale, loadAgentConfig } from './config.js';
import { translate } from './i18n.js';
import { chatOnce, type GatewayChatResult } from './gateway.js';

type ProviderProtocol = 'openai' | 'anthropic' | 'gateway';
interface ProviderDefinition { id: ProviderId; label: string; protocol: ProviderProtocol; endpoint: string; model: string; tokenEnv: string; }
const DEFINITIONS: Record<ProviderId, ProviderDefinition> = {
  openai: { id: 'openai', label: 'OpenAI', protocol: 'openai', endpoint: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', tokenEnv: 'OPENAI_API_KEY' },
  anthropic: { id: 'anthropic', label: 'Anthropic', protocol: 'anthropic', endpoint: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-5', tokenEnv: 'ANTHROPIC_API_KEY' },
  deepseek: { id: 'deepseek', label: 'DeepSeek', protocol: 'openai', endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat', tokenEnv: 'DEEPSEEK_API_KEY' },
  kimi: { id: 'kimi', label: 'Kimi', protocol: 'openai', endpoint: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', tokenEnv: 'KIMI_API_KEY' },
  qwen: { id: 'qwen', label: 'Qwen', protocol: 'openai', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', tokenEnv: 'DASHSCOPE_API_KEY' },
  gateway: { id: 'gateway', label: 'Cocos Agent Gateway', protocol: 'gateway', endpoint: '', model: 'agent-default', tokenEnv: 'COCOS_AGENT_GATEWAY_TOKEN' },
};
export interface ResolvedProvider extends ProviderDefinition { endpoint: string; model: string; }
export interface ProviderChatResult { provider: ProviderId; model: string; content: string; status: 'done' | 'error'; }
export interface ProviderFallbackResult extends ProviderChatResult { attempts: Array<{ provider: ProviderId; error?: string }>; usedFallback: boolean; }
function envToken(id: ProviderId, envName: string): string | undefined { return process.env[`COCOS_AGENT_${id.toUpperCase()}_API_KEY`] ?? process.env[envName]; }
export function resolveProvider(root: string, id: ProviderId): ResolvedProvider {
  const definition = DEFINITIONS[id]; const override = loadAgentConfig(root).providers[id];
  const endpoint = override?.endpoint ?? (id === 'gateway' ? process.env.COCOS_AGENT_GATEWAY_URL ?? '' : definition.endpoint);
  return { ...definition, endpoint, model: override?.model ?? (id === 'gateway' ? process.env.COCOS_AGENT_GATEWAY_MODEL : undefined) ?? definition.model };
}
export function providerCatalog(root: string): Array<Record<string, unknown>> {
  return PROVIDER_IDS.map((id) => { const provider = resolveProvider(root, id); return { id, label: provider.label, protocol: provider.protocol, endpoint: provider.endpoint || null, model: provider.model, credentialEnvironment: provider.tokenEnv, configured: Boolean(envToken(id, provider.tokenEnv)) }; });
}
function apiUrl(endpoint: string, suffix: string): string { if (!endpoint) throw new Error('PROVIDER_ENDPOINT_REQUIRED'); return `${endpoint.replace(/\/$/, '')}/${suffix}`; }
function textContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => typeof item === 'object' && item && 'text' in item ? String(item.text) : '').join('');
  return '';
}
async function postJson(url: string, headers: Record<string, string>, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: controller.signal });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) { const error = typeof data.error === 'object' && data.error ? JSON.stringify(data.error) : response.statusText; throw new Error(`PROVIDER_HTTP_${response.status}: ${error}`); }
    return data;
  } finally { clearTimeout(timer); }
}
export async function chatWithProvider(options: { root: string; provider: ProviderId; chat: string; memoryContext: string; locale: SupportedLocale; }): Promise<ProviderChatResult> {
  const selected = resolveProvider(options.root, options.provider); const token = envToken(selected.id, selected.tokenEnv);
  if (!token && selected.id !== 'gateway') throw new Error(`PROVIDER_TOKEN_REQUIRED: set ${selected.tokenEnv}`);
  const system = `${translate(options.locale, 'dialogueLanguage')}\n${options.memoryContext}`.trim();
  if (selected.protocol === 'gateway') {
    if (!selected.endpoint) throw new Error('PROVIDER_ENDPOINT_REQUIRED: set COCOS_AGENT_GATEWAY_URL or configure gateway endpoint');
    const result: GatewayChatResult = await chatOnce({ url: selected.endpoint, token, chat: options.chat, memoryContext: system, model: selected.model });
    return { provider: selected.id, model: selected.model, content: result.content, status: result.status };
  }
  if (!token) throw new Error(`PROVIDER_TOKEN_REQUIRED: set ${selected.tokenEnv}`);
  if (selected.protocol === 'anthropic') {
    const data = await postJson(apiUrl(selected.endpoint, 'messages'), { 'x-api-key': token, 'anthropic-version': '2023-06-01' }, { model: selected.model, max_tokens: 4096, system, messages: [{ role: 'user', content: options.chat }] });
    return { provider: selected.id, model: selected.model, content: textContent(data.content), status: 'done' };
  }
  const data = await postJson(apiUrl(selected.endpoint, 'chat/completions'), { Authorization: `Bearer ${token}` }, { model: selected.model, messages: [{ role: 'system', content: system }, { role: 'user', content: options.chat }], stream: false });
  const choices = data.choices; const first = Array.isArray(choices) ? choices[0] as Record<string, unknown> | undefined : undefined; const message = first?.message as Record<string, unknown> | undefined; const content = textContent(message?.content);
  if (!content) throw new Error('PROVIDER_INVALID_RESPONSE: response has no assistant content');
  return { provider: selected.id, model: selected.model, content, status: 'done' };
}
export async function chatWithFallback(options: { root: string; provider: ProviderId; fallbacks: ProviderId[]; chat: string; memoryContext: string; locale: SupportedLocale; }): Promise<ProviderFallbackResult> {
  const chain = [...new Set([options.provider, ...options.fallbacks])]; const attempts: Array<{ provider: ProviderId; error?: string }> = [];
  for (const provider of chain) {
    try { const result = await chatWithProvider({ ...options, provider }); if (result.status === 'done') { attempts.push({ provider }); return { ...result, attempts, usedFallback: provider !== options.provider }; } attempts.push({ provider, error: result.content }); }
    catch (error) { attempts.push({ provider, error: (error as Error).message }); }
  }
  throw new Error(`ALL_PROVIDERS_FAILED: ${JSON.stringify(attempts)}`);
}
