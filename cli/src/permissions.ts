import { loadAgentConfig, type PermissionMode } from './config.js';

const ACCESS_TOOLS = new Set([
  'status', 'task_hash', 'ocr_recognize', 'scene_read', 'scene_nodes', 'asset_find',
  'ccs_resolve', 'skills_list', 'mcp_status', 'provider_list', 'workspace_list', 'agent_config',
]);
const SAFE_TOOLS = new Set([...ACCESS_TOOLS, 'gateway_chat', 'workspace_chat', 'ccs_connect', 'workspace_create', 'workspace_switch', 'workspace_delete', 'provider_select']);

export function permissionSummary(mode: PermissionMode): { mode: PermissionMode; description: string } {
  switch (mode) {
    case 'full-access': return { mode, description: '项目根目录内读写、已配置网络服务与 Windows 终端执行' };
    case 'only-safe': return { mode, description: '只读项目访问与已配置网关对话；禁止写入和终端执行' };
    case 'only-access': return { mode, description: '只读项目访问；禁止网络连接、写入和终端执行' };
  }
}

export function assertToolPermission(root: string, tool: string): void {
  const mode = loadAgentConfig(root).permissionMode;
  if (mode === 'full-access') return;
  const allowed = mode === 'only-safe' ? SAFE_TOOLS : ACCESS_TOOLS;
  if (!allowed.has(tool)) throw new Error(`PERMISSION_DENIED: ${tool} requires full-access; current mode is ${mode}`);
}

export function assertFullAccess(root: string, capability: string): void {
  const mode = loadAgentConfig(root).permissionMode;
  if (mode !== 'full-access') throw new Error(`PERMISSION_DENIED: ${capability} requires full-access; current mode is ${mode}`);
}
