import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolveInside } from './sandbox.js';

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const PERMISSION_MODES = ['full-access', 'only-safe', 'only-access'] as const;
export type PermissionMode = (typeof PERMISSION_MODES)[number];
export const PROVIDER_IDS = ['openai', 'anthropic', 'deepseek', 'kimi', 'qwen', 'gateway'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number] | `custom-${string}`;
export interface CustomProvider { id: ProviderId; label: string; endpoint: string; model: string; protocol: OpenAIProtocol; }

export type OpenAIProtocol = 'chat-completions' | 'responses';
export interface ProviderOverride { endpoint?: string; model?: string; protocol?: OpenAIProtocol; }
const OPENAI_PROVIDERS: readonly ProviderId[] = ['openai', 'deepseek', 'kimi', 'qwen'];
export function validateProviderEndpoint(endpoint: string): void {
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new Error('PROVIDER_ENDPOINT_INVALID: expected an absolute HTTPS URL or loopback HTTP URL'); }
  const loopback = url.hostname === 'localhost' || url.hostname === '[::1]' || /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) || !url.hostname || url.username || url.password || url.search || url.hash || /[\\\s]/.test(endpoint)) {
    throw new Error('PROVIDER_ENDPOINT_INVALID: use HTTPS or loopback HTTP without credentials, query or fragment');
  }
}
export interface AgentConfig {
  version: 1;
  locale: SupportedLocale;
  permissionMode: PermissionMode;
  activeProvider: ProviderId;
  fallbackProviders: ProviderId[];
  providers: Partial<Record<ProviderId, ProviderOverride>>;
  customProviders: CustomProvider[];
}

const DEFAULT_CONFIG: AgentConfig = {
  version: 1, locale: 'zh-CN', permissionMode: 'only-safe', activeProvider: 'gateway', fallbackProviders: [], providers: {}, customProviders: [],
};
function configFile(root: string): string { return resolveInside(root, '.cocos-agent/config.json'); }
function normalizedCustomProviders(value: unknown): CustomProvider[] {
  if (!Array.isArray(value)) return [];
  const providers: CustomProvider[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') throw new Error('CUSTOM_PROVIDER_INVALID');
    const candidate = item as Record<string, unknown>;
    if ('apiKey' in candidate || 'token' in candidate || 'key' in candidate) throw new Error('PROVIDER_CREDENTIAL_IN_PROJECT_CONFIG');
    if (typeof candidate.id !== 'string' || !/^custom-[a-f0-9]{24}$/.test(candidate.id) ||
        typeof candidate.label !== 'string' || !candidate.label.trim() || candidate.label.length > 80 || /[\r\n]/.test(candidate.label) ||
        typeof candidate.endpoint !== 'string' || typeof candidate.model !== 'string' || !candidate.model.trim() || candidate.model.length > 200 || /[\r\n]/.test(candidate.model) ||
        (candidate.protocol !== 'chat-completions' && candidate.protocol !== 'responses') ||
        providers.some((provider) => provider.id === candidate.id)) throw new Error('CUSTOM_PROVIDER_INVALID');
    validateProviderEndpoint(candidate.endpoint);
    providers.push({ id: candidate.id as ProviderId, label: candidate.label.trim(), endpoint: candidate.endpoint, model: candidate.model.trim(), protocol: candidate.protocol });
  }
  return providers;
}
function knownProvider(value: unknown, customProviders: CustomProvider[]): value is ProviderId {
  return typeof value === 'string' && ((PROVIDER_IDS as readonly string[]).includes(value) || customProviders.some((provider) => provider.id === value));
}
function validLocale(value: unknown): value is SupportedLocale { return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value); }
function validPermissionMode(value: unknown): value is PermissionMode { return typeof value === 'string' && (PERMISSION_MODES as readonly string[]).includes(value); }
export function isProviderId(value: unknown, root?: string): value is ProviderId { return knownProvider(value, root ? loadAgentConfig(root).customProviders : []); }
function normalizeProviderList(value: unknown, customProviders: CustomProvider[]): ProviderId[] { return Array.isArray(value) ? [...new Set(value.filter((provider) => knownProvider(provider, customProviders)))] as ProviderId[] : []; }
function normalizeOverrides(value: unknown, customProviders: CustomProvider[]): AgentConfig['providers'] {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const providers: AgentConfig['providers'] = {};
  for (const id of [...PROVIDER_IDS, ...customProviders.map((provider) => provider.id)]) {
    const override = raw[id];
    if (!override || typeof override !== 'object') continue;
    const candidate = override as Record<string, unknown>;
    if ('apiKey' in candidate || 'token' in candidate || 'key' in candidate) throw new Error('PROVIDER_CREDENTIAL_IN_PROJECT_CONFIG');
    const endpoint = typeof candidate.endpoint === 'string' ? candidate.endpoint.trim() : undefined;
    const model = typeof candidate.model === 'string' ? candidate.model.trim() : undefined;
    const protocol = candidate.protocol;
    if (protocol !== undefined && (!(OPENAI_PROVIDERS.includes(id) || customProviders.some((provider) => provider.id === id)) || (protocol !== 'chat-completions' && protocol !== 'responses'))) {
      throw new Error(`PROVIDER_PROTOCOL_NOT_SUPPORTED: ${id}`);
    }
    if (endpoint && id !== 'gateway') validateProviderEndpoint(endpoint);
    if (model && (model.length > 200 || /[\r\n]/.test(model))) throw new Error('PROVIDER_MODEL_INVALID');
    const modelProtocol = protocol as OpenAIProtocol | undefined;
    if (endpoint || model || modelProtocol) providers[id] = { ...(endpoint ? { endpoint } : {}), ...(model ? { model } : {}), ...(modelProtocol ? { protocol: modelProtocol } : {}) };
  }
  return providers;
}
export function loadAgentConfig(root: string): AgentConfig {
  const file = configFile(root);
  if (!fs.existsSync(file)) return { ...DEFAULT_CONFIG, providers: {}, customProviders: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    const customProviders = normalizedCustomProviders(raw.customProviders);
    const activeProvider = knownProvider(raw.activeProvider, customProviders) ? raw.activeProvider : DEFAULT_CONFIG.activeProvider;
    return {
      version: 1,
      locale: validLocale(raw.locale) ? raw.locale : DEFAULT_CONFIG.locale,
      permissionMode: validPermissionMode(raw.permissionMode) ? raw.permissionMode : DEFAULT_CONFIG.permissionMode,
      activeProvider,
      fallbackProviders: normalizeProviderList(raw.fallbackProviders, customProviders).filter((id) => id !== activeProvider),
      providers: normalizeOverrides(raw.providers, customProviders),
      customProviders,
    };
  } catch { throw new Error('CONFIG_INVALID: malformed or unsupported provider configuration'); }
}
export function saveAgentConfig(root: string, updates: Partial<AgentConfig>): AgentConfig {
  return writeAgentConfig(root, updates, false);
}
/** Deliberate UI action only; general config writes retain the elevation guard. */
export function setUserPermission(root: string, mode: unknown, userInitiated: unknown): AgentConfig {
  if (userInitiated !== true || (mode !== 'only-safe' && mode !== 'full-access')) throw new Error('PERMISSION_SET_INVALID: explicit userInitiated:true and only-safe/full-access mode required');
  return writeAgentConfig(root, { permissionMode: mode }, true);
}
function writeAgentConfig(root: string, updates: Partial<AgentConfig>, userPermission: boolean): AgentConfig {
  if (updates.locale !== undefined && !validLocale(updates.locale)) {
    throw new Error('LOCALE_NOT_SUPPORTED: ' + String(updates.locale));
  }
  if (updates.permissionMode !== undefined && !validPermissionMode(updates.permissionMode)) {
    throw new Error('PERMISSION_MODE_NOT_SUPPORTED: ' + String(updates.permissionMode));
  }
  const current = loadAgentConfig(root);
  const customProviders = updates.customProviders !== undefined ? normalizedCustomProviders(updates.customProviders) : current.customProviders;
  if (updates.fallbackProviders !== undefined && (!Array.isArray(updates.fallbackProviders) || updates.fallbackProviders.some((provider) => !knownProvider(provider, customProviders)))) {
    throw new Error('FALLBACK_PROVIDER_NOT_SUPPORTED');
  }
  if (updates.activeProvider !== undefined && !knownProvider(updates.activeProvider, customProviders)) {
    throw new Error('PROVIDER_NOT_SUPPORTED: ' + String(updates.activeProvider));
  }
  const requestedMode = validPermissionMode(updates.permissionMode) ? updates.permissionMode : current.permissionMode;
  const ranks: Record<PermissionMode, number> = { 'only-access': 0, 'only-safe': 1, 'full-access': 2 };
  if (!userPermission && ranks[requestedMode] > ranks[current.permissionMode] && process.env.COCOS_AGENT_PERMISSION_ELEVATION !== requestedMode) {
    throw new Error('PERMISSION_ELEVATION_REQUIRED: set COCOS_AGENT_PERMISSION_ELEVATION=' + requestedMode + ' before starting the CLI or bridge');
  }
  const activeProvider = updates.activeProvider ?? current.activeProvider;
  const next: AgentConfig = {
    version: 1,
    locale: validLocale(updates.locale) ? updates.locale : current.locale,
    permissionMode: requestedMode,
    activeProvider,
    fallbackProviders: updates.fallbackProviders ? normalizeProviderList(updates.fallbackProviders, customProviders).filter((id) => id !== activeProvider) : current.fallbackProviders.filter((id) => id !== activeProvider),
    providers: updates.providers ? normalizeOverrides(updates.providers, customProviders) : current.providers,
    customProviders,
  };
  const file = configFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}
const protectScript = `Add-Type -AssemblyName System.Security; $inputData = [Console]::In.ReadToEnd().Trim(); $raw = [Convert]::FromBase64String($inputData); $secured = [Security.Cryptography.ProtectedData]::Protect($raw,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($secured))`;
const unprotectScript = `Add-Type -AssemblyName System.Security; $inputData = [Console]::In.ReadToEnd().Trim(); $raw = [Convert]::FromBase64String($inputData); $plain = [Security.Cryptography.ProtectedData]::Unprotect($raw,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($plain))`;
function credentialFile(): string {
  return path.join(process.env.COCOS_AGENT_CREDENTIAL_DIR || path.join(os.homedir(), '.cocos-agent'), 'credentials.json');
}
function credentialEntry(root: string, id: ProviderId): string {
  return crypto.createHash('sha256').update(path.resolve(root).toLowerCase()).digest('hex') + ':' + id;
}
function credentialRecords(): Record<string, string> {
  const file = credentialFile();
  if (!fs.existsSync(file)) return {};
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.values(raw).some((value) => typeof value !== 'string')) throw new Error('invalid');
    return raw as Record<string, string>;
  } catch { throw new Error('PROVIDER_CREDENTIAL_STORE_INVALID'); }
}
function cryptCredential(value: string, decrypt: boolean): string {
  if (process.platform !== 'win32') throw new Error('PROVIDER_CREDENTIAL_STORAGE_UNAVAILABLE: Windows user protection required');
  const script = decrypt ? unprotectScript : protectScript;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
    input: decrypt ? value : Buffer.from(value, 'utf8').toString('base64'), encoding: 'utf8', windowsHide: true, timeout: 10000, maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0 || !result.stdout.trim()) throw new Error('PROVIDER_CREDENTIAL_STORAGE_UNAVAILABLE');
  try { return decrypt ? Buffer.from(result.stdout.trim(), 'base64').toString('utf8') : result.stdout.trim(); }
  catch { throw new Error('PROVIDER_CREDENTIAL_STORAGE_UNAVAILABLE'); }
}
export function storedProviderCredential(root: string, id: ProviderId): string | undefined {
  const encrypted = credentialRecords()[credentialEntry(root, id)];
  return encrypted ? cryptCredential(encrypted, true) : undefined;
}
export function hasStoredProviderCredential(root: string, id: ProviderId): boolean {
  return Boolean(credentialRecords()[credentialEntry(root, id)]);
}
export function validateProviderCredential(apiKey: unknown): asserts apiKey is string {
  if (typeof apiKey !== 'string' || !apiKey.trim() || apiKey.length > 16384 || /[\r\n]/.test(apiKey)) throw new Error('PROVIDER_CREDENTIAL_INVALID');
}
export function saveProviderCredential(root: string, id: ProviderId, apiKey: string): void {
  if (!isProviderId(id, root)) throw new Error('PROVIDER_NOT_SUPPORTED');
  validateProviderCredential(apiKey);
  const records = credentialRecords();
  records[credentialEntry(root, id)] = cryptCredential(apiKey.trim(), false);
  writeCredentialRecords(records);
}
export function clearProviderCredential(root: string, id: ProviderId): () => void {
  if (!isProviderId(id, root)) throw new Error('PROVIDER_NOT_SUPPORTED');
  const records = credentialRecords(); const entry = credentialEntry(root, id); const previous = records[entry];
  delete records[entry];
  writeCredentialRecords(records);
  // Restore only this encrypted entry, without overwriting other projects' keys.
  return () => { const latest = credentialRecords(); if (previous === undefined) delete latest[entry]; else latest[entry] = previous; writeCredentialRecords(latest); };
}
function writeCredentialRecords(records: Record<string, string>): void {
  const file = credentialFile();
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  try { fs.writeFileSync(temporary, JSON.stringify(records), { mode: 0o600, flag: 'wx' }); fs.renameSync(temporary, file); }
  finally { if (fs.existsSync(temporary)) fs.rmSync(temporary); }
}

export function createCustomProvider(root: string, options: { name: string; endpoint: string; model: string; protocol: OpenAIProtocol }): CustomProvider {
  if (!options || typeof options.name !== 'string' || !options.name.trim() || options.name.length > 80 || /[\r\n]/.test(options.name) ||
      typeof options.endpoint !== 'string' || typeof options.model !== 'string' || !options.model.trim() || options.model.length > 200 || /[\r\n]/.test(options.model) ||
      (options.protocol !== 'chat-completions' && options.protocol !== 'responses')) throw new Error('CUSTOM_PROVIDER_INVALID');
  validateProviderEndpoint(options.endpoint);
  const provider: CustomProvider = { id: `custom-${crypto.randomBytes(12).toString('hex')}`, label: options.name.trim(), endpoint: options.endpoint, model: options.model.trim(), protocol: options.protocol };
  saveAgentConfig(root, { customProviders: [...loadAgentConfig(root).customProviders, provider] });
  return provider;
}

export function updateProvider(root: string, id: ProviderId, override: ProviderOverride): AgentConfig {
  if (!isProviderId(id, root)) throw new Error('PROVIDER_NOT_SUPPORTED: ' + String(id));
  const current = loadAgentConfig(root);
  if (override.endpoint !== undefined && typeof override.endpoint !== 'string') throw new Error('PROVIDER_ENDPOINT_INVALID');
  if (override.model !== undefined && typeof override.model !== 'string') throw new Error('PROVIDER_MODEL_INVALID');
  const custom = current.customProviders.find((provider) => provider.id === id);
  if (custom) {
    const next = { ...custom, ...(override.endpoint !== undefined ? { endpoint: override.endpoint } : {}), ...(override.model !== undefined ? { model: override.model } : {}), ...(override.protocol !== undefined ? { protocol: override.protocol } : {}) };
    return saveAgentConfig(root, { customProviders: current.customProviders.map((provider) => provider.id === id ? next : provider) });
  }
  return saveAgentConfig(root, {
    providers: {
      ...current.providers,
      [id]: {
        ...current.providers[id],
        ...(override.endpoint !== undefined ? { endpoint: override.endpoint } : {}),
        ...(override.model !== undefined ? { model: override.model } : {}),
        ...(override.protocol !== undefined ? { protocol: override.protocol } : {}),
      },
    },
  });
}
