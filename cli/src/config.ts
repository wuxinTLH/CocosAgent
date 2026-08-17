import fs from 'node:fs';
import path from 'node:path';
import { resolveInside } from './sandbox.js';

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const PERMISSION_MODES = ['full-access', 'only-safe', 'only-access'] as const;
export type PermissionMode = (typeof PERMISSION_MODES)[number];
export const PROVIDER_IDS = ['openai', 'anthropic', 'deepseek', 'kimi', 'qwen', 'gateway'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ProviderOverride { endpoint?: string; model?: string; }
export interface AgentConfig {
  version: 1;
  locale: SupportedLocale;
  permissionMode: PermissionMode;
  activeProvider: ProviderId;
  fallbackProviders: ProviderId[];
  providers: Partial<Record<ProviderId, ProviderOverride>>;
}

const DEFAULT_CONFIG: AgentConfig = {
  version: 1, locale: 'zh-CN', permissionMode: 'only-safe', activeProvider: 'gateway', fallbackProviders: [], providers: {},
};
function configFile(root: string): string { return resolveInside(root, '.cocos-agent/config.json'); }
function validLocale(value: unknown): value is SupportedLocale { return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value); }
function validPermissionMode(value: unknown): value is PermissionMode { return typeof value === 'string' && (PERMISSION_MODES as readonly string[]).includes(value); }
export function isProviderId(value: unknown): value is ProviderId { return typeof value === 'string' && (PROVIDER_IDS as readonly string[]).includes(value); }
function normalizeProviderList(value: unknown): ProviderId[] { return Array.isArray(value) ? [...new Set(value.filter(isProviderId))] : []; }
function normalizeOverrides(value: unknown): AgentConfig['providers'] {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const providers: AgentConfig['providers'] = {};
  for (const id of PROVIDER_IDS) {
    const override = raw[id];
    if (!override || typeof override !== 'object') continue;
    const candidate = override as Record<string, unknown>;
    const endpoint = typeof candidate.endpoint === 'string' ? candidate.endpoint.trim() : undefined;
    const model = typeof candidate.model === 'string' ? candidate.model.trim() : undefined;
    if (endpoint || model) providers[id] = { ...(endpoint ? { endpoint } : {}), ...(model ? { model } : {}) };
  }
  return providers;
}
export function loadAgentConfig(root: string): AgentConfig {
  const file = configFile(root);
  if (!fs.existsSync(file)) return { ...DEFAULT_CONFIG, providers: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    const activeProvider = isProviderId(raw.activeProvider) ? raw.activeProvider : DEFAULT_CONFIG.activeProvider;
    return {
      version: 1,
      locale: validLocale(raw.locale) ? raw.locale : DEFAULT_CONFIG.locale,
      permissionMode: validPermissionMode(raw.permissionMode) ? raw.permissionMode : DEFAULT_CONFIG.permissionMode,
      activeProvider,
      fallbackProviders: normalizeProviderList(raw.fallbackProviders).filter((id) => id !== activeProvider),
      providers: normalizeOverrides(raw.providers),
    };
  } catch (error) { throw new Error(`CONFIG_INVALID: ${(error as Error).message}`); }
}
export function saveAgentConfig(root: string, updates: Partial<AgentConfig>): AgentConfig {
  const current = loadAgentConfig(root);
  if (updates.locale !== undefined && !validLocale(updates.locale)) {
    throw new Error('LOCALE_NOT_SUPPORTED: ' + String(updates.locale));
  }
  if (updates.permissionMode !== undefined && !validPermissionMode(updates.permissionMode)) {
    throw new Error('PERMISSION_MODE_NOT_SUPPORTED: ' + String(updates.permissionMode));
  }
  if (updates.fallbackProviders !== undefined && (!Array.isArray(updates.fallbackProviders) || updates.fallbackProviders.some((provider) => !isProviderId(provider)))) {
    throw new Error('FALLBACK_PROVIDER_NOT_SUPPORTED');
  }
  if (updates.activeProvider !== undefined && !isProviderId(updates.activeProvider)) {
    throw new Error('PROVIDER_NOT_SUPPORTED: ' + String(updates.activeProvider));
  }
  const requestedMode = validPermissionMode(updates.permissionMode) ? updates.permissionMode : current.permissionMode;
  const ranks: Record<PermissionMode, number> = { 'only-access': 0, 'only-safe': 1, 'full-access': 2 };
  if (ranks[requestedMode] > ranks[current.permissionMode] && process.env.COCOS_AGENT_PERMISSION_ELEVATION !== requestedMode) {
    throw new Error('PERMISSION_ELEVATION_REQUIRED: set COCOS_AGENT_PERMISSION_ELEVATION=' + requestedMode + ' before starting the CLI or bridge');
  }
  const activeProvider = updates.activeProvider ?? current.activeProvider;
  const next: AgentConfig = {
    version: 1,
    locale: validLocale(updates.locale) ? updates.locale : current.locale,
    permissionMode: requestedMode,
    activeProvider,
    fallbackProviders: updates.fallbackProviders ? normalizeProviderList(updates.fallbackProviders).filter((id) => id !== activeProvider) : current.fallbackProviders.filter((id) => id !== activeProvider),
    providers: updates.providers ? normalizeOverrides(updates.providers) : current.providers,
  };
  const file = configFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}
export function updateProvider(root: string, id: ProviderId, override: ProviderOverride): AgentConfig {
  if (!isProviderId(id)) throw new Error('PROVIDER_NOT_SUPPORTED: ' + String(id));
  const current = loadAgentConfig(root);
  return saveAgentConfig(root, {
    providers: {
      ...current.providers,
      [id]: {
        ...current.providers[id],
        ...(override.endpoint !== undefined ? { endpoint: override.endpoint } : {}),
        ...(override.model !== undefined ? { model: override.model } : {}),
      },
    },
  });
}
