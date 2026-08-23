---
name: cc-switch-connect
description: 集成 cc-switch 与 ccs 路由模式，读取本机 cc-switch 配置并建立到编辑器/代理的路由连接；用于统一切换 Cocos/Codex 运行环境并保持直连。
---

# cc-switch-connect

## 用途

- 读取 `~/.cc-switch/settings.json` 与 `CC_SWITCH_CONFIG` 指定配置。
- 解析当前路由：`COCOS_AGENT_CCS_ROUTE`、配置中的 provider/route 字段或项目约束。
- 以 ccs 路由模式建立直连；端点可独立填写 `http://ip:port`，默认 `http://127.0.0.1:15721`，WebSocket 端点使用 `ws://ip:port/ws`。
- 验证连接健康状态与重连能力。

## 输入

- 路由标识：`route`（可选，默认取当前配置）。
- 目标地址：`url`（可选，默认取路由配置）。
- Token：`token`（可选，优先环境变量 `COCOS_AGENT_GATEWAY_TOKEN`）。

## 输出

```json
{
  "route": "current",
  "resolvedUrl": "wss://...",
  "status": "connected",
  "latencyMs": 12
}
```

## 约束

- 允许读取用户级 cc-switch 配置，但不得修改项目外内容。
- 连接目标必须来自配置或项目约束，禁止任意地址直连。
- Token 不得写入记忆与日志。

## MCP 工具

- `ccs_resolve`
- `ccs_connect`

## CLI

```powershell
node cli/dist/index.js ccs resolve
node cli/dist/index.js ccs connect --route current
```
