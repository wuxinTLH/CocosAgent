---
name: model-workspace
description: Manage provider-backed Cocos Agent chat workspaces, sessions, language, and fallback chains without persisting API keys.
---

# Model Workspace

Use this Skill when a Cocos project needs multi-provider chat, session switching, language selection, or provider fallback.

## Scope

- State is restricted to `.cocos-agent/config.json` and `.cocos-agent/workspace.json` inside the current Cocos project.
- API keys are read only from process environment variables and must never be written to project files, messages, logs, or memory.
- Supported providers are `openai`, `anthropic`, `deepseek`, `kimi`, `qwen`, and `gateway`.

## Commands

```text
provider list
provider configure --provider <id> [--endpoint <url>] [--model <id>]
provider select --provider <id>
agent config --locale zh-CN|en-US --fallback <id,id>
workspace new --name <name> [--provider <id>]
workspace list|switch|delete|chat
```

## MCP

Use `provider_list`, `provider_configure`, `provider_select`, `agent_config`, `workspace_list`, `workspace_create`, `workspace_switch`, `workspace_delete`, and `workspace_chat`.

## Safety

- `only-access` denies chat networking.
- `only-safe` allows configured chat but no project writes or terminal execution.
- `full-access` is required for privileged operations.