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
| `workspace_chat` | 多模型工作区对话与回退 | model-workspace |
| `workspace_list/create/switch/delete` | 会话工作区管理 | model-workspace |
| `provider_list/configure/select` | 模型提供商、端点、模型与当前会话选择 | model-workspace |
| `agent_config` | i18n、权限与默认回退链 | agent-permissions |
| `skills_list` / `mcp_status` | Skills 和 MCP 能力自检 | CLI registry |
| `terminal_run` | `cmd`/PowerShell/Windows Terminal | windows-terminal |
| `animation_analyze` | 只读分析 Cocos AnimationClip (.anim) | cocos-animation |
| `animation_optimize` | 生成非破坏性动画优化建议 | cocos-animation |
| `animation_ocr_states` | OCR 提取编辑器截图中的状态候选 | cocos-animation + cocos-ocr |
| `animation_create_controller` | 生成使用公开 Animation API 的 TypeScript 控制器 | cocos-animation |

所有工具自动执行 sandbox 校验，越界路径返回 `SANDBOX_VIOLATION`。

## 权限与凭据

- MCP 每次工具调用都读取当前项目 `.cocos-agent/config.json` 的权限模式。`only-access` 拒绝网络、写入和终端；`only-safe` 仅允许只读与已配置模型对话；`full-access` 才允许写入、终端与提升操作。
- API 凭据不通过 MCP 参数或配置文件传递，仅从环境变量读取：`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`DEEPSEEK_API_KEY`、`KIMI_API_KEY`、`DASHSCOPE_API_KEY`。这避免凭据被保存进会话或提交到仓库。
- 从较低权限提升时必须在 MCP 进程启动前设置 `COCOS_AGENT_PERMISSION_ELEVATION=only-safe` 或 `COCOS_AGENT_PERMISSION_ELEVATION=full-access`；工具调用本身不能自行提升权限。
