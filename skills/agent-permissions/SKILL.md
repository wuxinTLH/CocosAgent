---
name: agent-permissions
description: Apply and verify Cocos Agent full-access, only-safe, and only-access permission modes within the current project sandbox.
---

# Agent Permissions

Use this Skill to inspect or set the Cocos Agent permission policy before invoking project tools.

## Modes

| Mode | Allowed | Denied |
| --- | --- | --- |
| `only-access` | Read-only project queries and safe capability discovery | Network chat, writes, terminal, route connections |
| `only-safe` | Read-only queries and configured model chat | Project writes, terminal execution |
| `full-access` | Current-project writes, configured networking, terminal | Any path outside the current project sandbox |

## Commands

```text
agent config --permission only-access
agent config --permission only-safe
agent config --permission full-access
```

## Enforcement

- The bridge and MCP server enforce the mode through the shared tool dispatcher.
- Scene writes, memory writes, terminal execution, and privileged routing are never permitted outside `full-access`.
- The project sandbox remains mandatory in every mode.