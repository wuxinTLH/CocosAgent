import { spawn, spawnSync } from 'node:child_process';
import { assertFullAccess } from './permissions.js';

export const TERMINAL_SHELLS = ['cmd', 'powershell', 'wt'] as const;
export type TerminalShell = (typeof TERMINAL_SHELLS)[number];

function validateCommand(command: string): void {
  const blocked = ['&', '|', ';', '<', '>', '\r', '\n'];
  if (!command.trim() || command.includes('\0') || blocked.some((value) => command.includes(value))) {
    throw new Error('TERMINAL_COMMAND_INVALID');
  }
  if (command.includes('..\\') || command.includes('../') || /^[A-Za-z]:[\\/]/.test(command)) {
    throw new Error('TERMINAL_PATH_OUTSIDE_PROJECT');
  }
}

function validateShell(shell: string): asserts shell is TerminalShell {
  if (!(TERMINAL_SHELLS as readonly string[]).includes(shell)) {
    throw new Error('TERMINAL_SHELL_UNSUPPORTED: ' + shell);
  }
}

export function terminalInvocation(root: string, shell: TerminalShell, command: string): { executable: string; args: string[]; cwd: string } {
  validateCommand(command);
  validateShell(shell);
  if (shell === 'cmd') return { executable: 'cmd.exe', args: ['/d', '/s', '/c', command], cwd: root };
  if (shell === 'powershell') return { executable: 'powershell.exe', args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], cwd: root };
  return { executable: 'wt.exe', args: ['-w', '0', 'nt', '--startingDirectory', root, 'cmd.exe', '/d', '/s', '/c', command], cwd: root };
}

export function runTerminal(root: string, shell: TerminalShell, command: string, dryRun = false): Record<string, unknown> {
  assertFullAccess(root, 'terminal execution');
  const invocation = terminalInvocation(root, shell, command);
  if (dryRun) return { ok: true, dryRun: true, ...invocation };
  if (process.platform !== 'win32') throw new Error('WINDOWS_TERMINAL_UNAVAILABLE: Windows is required');
  if (shell === 'wt') {
    const child = spawn(invocation.executable, invocation.args, { cwd: root, detached: true, stdio: 'ignore', windowsHide: false });
    child.unref();
    return { ok: true, launched: true, ...invocation };
  }
  const result = spawnSync(invocation.executable, invocation.args, { cwd: root, encoding: 'utf8', timeout: 120000, windowsHide: true });
  if (result.error) throw result.error;
  return { ok: result.status === 0, exitCode: result.status, stdout: result.stdout, stderr: result.stderr, ...invocation };
}
