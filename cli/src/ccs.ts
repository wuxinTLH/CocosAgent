import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectEditors, projectCreatorVersion } from './editor.js';
import { pingWebSocket } from './gateway.js';

export interface CcsRoute {
  route: string;
  source: string;
  provider?: string;
  url?: string;
}

export function ccsSettingsPath(): string {
  return process.env.CC_SWITCH_CONFIG ?? path.join(os.homedir(), '.cc-switch', 'settings.json');
}

export function resolveRoute(route?: string): CcsRoute {
  const settingsPath = ccsSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    throw new Error(`CC_SWITCH_CONFIG_NOT_FOUND: ${settingsPath}`);
  }
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Record<string, unknown>;
  const current =
    typeof settings.currentProviderCodex === 'string' ? settings.currentProviderCodex : 'current';
  const selected = route ?? process.env.COCOS_AGENT_CCS_ROUTE ?? current;
  return {
    route: selected,
    source: settingsPath,
    provider:
      typeof settings.currentProviderCodex === 'string' ? settings.currentProviderCodex : undefined,
    url: process.env.COCOS_AGENT_CCS_URL,
  };
}

export async function connectRoute(route?: string): Promise<Record<string, unknown>> {
  const resolved = resolveRoute(route);
  const bin = process.env.COCOS_AGENT_CCS_BIN;
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
  const url = resolved.url ?? process.env.COCOS_AGENT_GATEWAY_URL;
  if (!url) {
    throw new Error('CCS_ROUTE_URL_NOT_CONFIGURED: set COCOS_AGENT_CCS_URL or COCOS_AGENT_GATEWAY_URL');
  }
  await pingWebSocket(
    url,
    5000,
    process.env.COCOS_AGENT_GATEWAY_TOKEN,
    process.env.COCOS_AGENT_CCS_INSECURE === 'true',
  );
  return { route: resolved.route, url, status: 'connected' };
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
      ok: Boolean(process.env.COCOS_AGENT_CCS_URL),
      value: process.env.COCOS_AGENT_CCS_URL ?? null,
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
