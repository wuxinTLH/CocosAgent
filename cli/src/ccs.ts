import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectEditors, projectCreatorVersion } from './editor.js';
import { pingWebSocket } from './gateway.js';

export const DEFAULT_CCS_URL = 'http://127.0.0.1:15721';

export interface CcsRoute {
  route: string;
  source: string;
  provider?: string;
  url?: string;
}

export function normalizeCcsUrl(value: string): string {
  const rawCandidate = value.trim();
  const candidate = /^[^/:\s]+:\d+(?:\/[^\s]*)?$/.test(rawCandidate)
    ? `http://${rawCandidate}`
    : rawCandidate;
  if (!candidate) throw new Error('CCS_ROUTE_URL_EMPTY: provide http://ip:port');
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`CCS_ROUTE_URL_INVALID: ${candidate}`);
  }
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
    throw new Error(`CCS_ROUTE_URL_INVALID_PROTOCOL: ${parsed.protocol}`);
  }
  if ((parsed.protocol === 'ws:' || parsed.protocol === 'wss:') && (parsed.pathname === '' || parsed.pathname === '/')) {
    parsed.pathname = '/ws';
  }
  return parsed.toString().replace(/\/$/, '');
}

export function ccsSettingsPath(): string {
  return process.env.CC_SWITCH_CONFIG ?? path.join(os.homedir(), '.cc-switch', 'settings.json');
}

export function resolveRoute(route?: string, url?: string): CcsRoute {
  const settingsPath = ccsSettingsPath();
  const settings = fs.existsSync(settingsPath)
    ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Record<string, unknown>
    : {};
  const current =
    typeof settings.currentProviderCodex === 'string' ? settings.currentProviderCodex : 'current';
  const selected = route ?? process.env.COCOS_AGENT_CCS_ROUTE ?? current;
  return {
    route: selected,
    source: settingsPath,
    provider:
      typeof settings.currentProviderCodex === 'string' ? settings.currentProviderCodex : undefined,
    url: normalizeCcsUrl(url ?? process.env.COCOS_AGENT_CCS_URL ?? DEFAULT_CCS_URL),
  };
}

export async function connectRoute(route?: string, url?: string): Promise<Record<string, unknown>> {
  const explicitUrl = url ?? process.env.COCOS_AGENT_CCS_URL;
  const resolved = resolveRoute(route, url);
  const bin = process.env.COCOS_AGENT_CCS_BIN;
  if (resolved.url && (explicitUrl || !bin)) {
    if (resolved.url.startsWith('http://') || resolved.url.startsWith('https://')) {
      let response: Response;
      try {
        response = await fetch(resolved.url, { signal: AbortSignal.timeout(5000) });
      } catch (error) {
        throw new Error(`CCS_HTTP_UNREACHABLE: ${(error as Error).message}`);
      }
      return {
        route: resolved.route,
        url: resolved.url,
        status: 'connected',
        transport: 'http',
        httpStatus: response.status,
      };
    } else {
      await pingWebSocket(resolved.url, 5000, process.env.COCOS_AGENT_GATEWAY_TOKEN, process.env.COCOS_AGENT_CCS_INSECURE === 'true');
    }
    return { route: resolved.route, url: resolved.url, status: 'connected' };
  }
  if (bin) {
    const output = execFileSync(bin, ['route', 'connect', resolved.route], {
      encoding: 'utf8',
      windowsHide: true,
    });
    return {
      route: resolved.route,
      url: resolved.url ?? '',
      status: 'connected',
      ccsOutput: output.trim(),
    };
  }
  const gatewayUrl = process.env.COCOS_AGENT_GATEWAY_URL;
  if (!gatewayUrl) {
    throw new Error('CCS_ROUTE_URL_NOT_CONFIGURED: set COCOS_AGENT_CCS_URL or COCOS_AGENT_GATEWAY_URL');
  }
  await pingWebSocket(
    gatewayUrl,
    5000,
    process.env.COCOS_AGENT_GATEWAY_TOKEN,
    process.env.COCOS_AGENT_CCS_INSECURE === 'true',
  );
  return { route: resolved.route, url: gatewayUrl, status: 'connected' };
}

export function ccsDoctor(projectRoot?: string): Record<string, unknown> {
  const settingsPath = ccsSettingsPath();
  const checks: Record<string, unknown> = {
    ccSwitchConfig: { ok: fs.existsSync(settingsPath), path: settingsPath },
    ccsBin: {
      ok: Boolean(process.env.COCOS_AGENT_CCS_BIN),
      value: process.env.COCOS_AGENT_CCS_BIN ?? null,
    },
    ccsUrl: {
      ok: true,
      value: process.env.COCOS_AGENT_CCS_URL ?? DEFAULT_CCS_URL,
    },
    gatewayUrl: {
      ok: Boolean(process.env.COCOS_AGENT_GATEWAY_URL),
      value: process.env.COCOS_AGENT_GATEWAY_URL ?? null,
    },
  };
  let route: CcsRoute | null = null;
  try {
    route = resolveRoute();
  } catch (error) {
    checks.routeError = (error as Error).message;
  }
  const editors = detectEditors();
  const creatorVersion = projectRoot ? projectCreatorVersion(projectRoot) : null;
  return { checks, route, editors, creatorVersion };
}
