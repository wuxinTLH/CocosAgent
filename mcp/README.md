# MCP 配置

Cocos Agent 提供单个 MCP 服务入口 `cocos-agent`，通过 CLI 的 `mcp` 命令以 stdio JSON-RPC 方式运行。

## 启动前

```powershell
cd cli
npm install
npm run build
```

## Codex 配置

在 Codex 配置中加入：

```toml
[mcp_servers.cocos-agent]
command = "node"
args = ["E:/code/Cocos Agent/cli/dist/index.js", "mcp"]
env = { COCOS_AGENT_PROJECT_ROOT = "E:/code/Cocos Agent" }
```

示例文件见 `.codex/config.toml.example`。

## 通用客户端

将 [cocos-mcp.json](cocos-mcp.json) 中 `mcpServers` 合并到客户端的 MCP 配置。

## 工具列表

| 工具 | 能力 | 对应 Skill |
| --- | --- | --- |
| `ocr_recognize` | OCR 识别截图/场景区域 | cocos-ocr |
| `scene_read` | 读取 Scene/Prefab | cocos-scene |
| `scene_write` | 校验并写入 Scene/Prefab | cocos-scene |
| `scene_nodes` | 列出节点树 | cocos-scene |
| `asset_find` | 检索素材库 | cocos-assets |
| `ccs_resolve` | 解析 cc-switch/ccs 路由 | cc-switch-connect |
| `ccs_connect` | 建立路由直连 | cc-switch-connect |
| `gateway_chat` | WSS 长连接对话 | chat-longlink |
| `task_hash` | 计算任务 hash | HASH.md |
| `memory_write` | 写入长短记忆 | WORKFLOW.md |

所有工具自动执行 sandbox 校验，越界路径返回 `SANDBOX_VIOLATION`。
