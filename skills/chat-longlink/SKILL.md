---
name: chat-longlink
description: 建立 Chat Completions 的 WSS 长连接，保持心跳与自动重连，维护上下文记忆并支持流式推理；用于 Agent 与远程推理网关持续协作。
---

# chat-longlink

## 用途

- 通过 WSS 长连接发送 Chat Completions 请求。
- 接收流式/非流式响应，保持连接状态。
- 注入 SHORT_MEMORY 与当前任务上下文。
- 断线自动重连，心跳保活。

## 消息协议

请求：

```json
{
  "type": "chat.completions",
  "id": "msg-001",
  "payload": {
    "model": "agent-default",
    "messages": [
      { "role": "system", "content": "..." },
      { "role": "user", "content": "..." }
    ],
    "stream": true
  }
}
```

响应事件：`chat.completion.chunk`、`chat.completion.done`、`chat.completion.error`、`ping`/`pong`。

## 配置

- `COCOS_AGENT_GATEWAY_URL`：网关地址。
- `COCOS_AGENT_GATEWAY_TOKEN`：鉴权 Token。
- `COCOS_AGENT_LONG_TERM_MEMORY`：是否注入长期记忆，默认 false。
- 本地自签名 WSS mock 仅可通过 CLI `--insecure` 或测试参数访问；生产连接保持证书校验。

## 约束

- 只连接项目约束声明的网关地址。
- Token 不得写入日志、记忆或 TODO。
- 心跳超时后必须重连，重连采用指数退避。

## MCP 工具

- `gateway_chat`

## CLI

```powershell
node cli/dist/index.js gateway connect --url "wss://example.com/chat" --chat "你好"
```
