---
name: windows-terminal
description: Run controlled CMD, PowerShell, or Windows Terminal commands from the current Cocos project root when full-access is enabled.
---

# Windows Terminal

Use this Skill for project-local command execution in Windows Cocos development workflows.

## Scope

- Requires `full-access`.
- Current working directory is always the active Cocos project root.
- Supported shells: `cmd`, `powershell`, `wt`.
- Commands containing control operators, absolute paths, or parent-directory traversal are rejected.

## Commands

```text
terminal run --shell cmd --command "dir assets" --dry-run
terminal run --shell powershell --command "Get-ChildItem assets"
terminal run --shell wt --command "npm run build"
```

## MCP

Call `terminal_run` with `shell`, `command`, and optional `dryRun`.

## Output

CMD and PowerShell return exit code, stdout, and stderr. Windows Terminal launches a detached user-visible tab only after validation.