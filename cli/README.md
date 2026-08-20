# Cocos Agent CLI

TypeScript 实现的 CLI，用于执行 WorkFlow、计算任务 hash、读写记忆、调用 Skills 能力，并提供 MCP 服务与 Cocos 编辑器本地桥接。

全局版本：`v0.0.0.8-a`

## 构建

```powershell
cd cli
npm install
npm run build
```

## 命令

```text
status                 输出项目状态、Skills 与记忆统计
hash                   计算任务 hash
run                    按 WorkFlow 记录一次执行
skills list|run        列出/定位 Skills
ocr capture            运行 OCR 识别
scene read|write|nodes 读写 Scene/Prefab
assets find            检索素材库
ccs resolve|connect|doctor  cc-switch/ccs 路由解析、直连与诊断
gateway connect|mock        WSS 长连接对话与本地模拟网关
provider list|configure|select  管理多模型提供商、模型与当前会话模型
agent config                 设置 locale、permission、默认提供商与回退链
workspace list|new|switch|delete|chat  管理模型工作区、多会话和对话回退
terminal run                在 full-access 下运行 cmd/PowerShell/Windows Terminal
animation analyze|optimize 分析和优化当前项目内 .anim 动画
animation ocr|controller   OCR 提取状态或生成 Animation 控制器
docs check                  校验文档链接
project init                生成项目独立约束
mcp                    启动 stdio MCP 服务
bridge start           启动本地桥接服务
```

## 环境变量

| 变量 | 作用 |
| --- | --- |
| `COCOS_AGENT_PROJECT_ROOT` | 当前 Cocos 项目根目录 |
| `COCOS_AGENT_OCR_CMD` | OCR 引擎命令模板，支持 `{image}`、`{output}`、`{region}` |
| `COCOS_AGENT_OCR_ENGINE` | OCR 引擎：Windows 默认 `windows-ocr`，或 `tesseract-js`、`external` |
| `COCOS_AGENT_WINDOWS_OCR_LANG` | Windows OCR 语言，默认 `en-US`，可设 `zh-CN` |
| `COCOS_AGENT_TESSERACT_LANG` | tesseract.js 语言，默认 `eng`，可设 `chi_sim` |
| `COCOS_AGENT_GATEWAY_URL` | WSS 网关地址 |
| `COCOS_AGENT_GATEWAY_TOKEN` | WSS 鉴权 Token |
| `COCOS_AGENT_GATEWAY_MODEL` | 默认模型名 |
| `COCOS_AGENT_CCS_URL` | ccs 路由直连地址 |
| `COCOS_AGENT_CCS_ROUTE` | 默认 ccs 路由 |
| `COCOS_AGENT_CCS_BIN` | ccs CLI 可执行文件路径 |
| `COCOS_AGENT_CCS_INSECURE` | 仅本地自签名 ccs 测试时设为 `true` |
| `CC_SWITCH_CONFIG` | cc-switch 配置路径，默认 `~/.cc-switch/settings.json` |

## 示例

```powershell
node dist/index.js status
node dist/index.js hash --request "创建玩家移动脚本"
node dist/index.js scene nodes assets/scenes/main.scene
node dist/index.js assets find --query main --type scene
node dist/index.js bridge start --port 8899
node dist/index.js gateway mock --port 8787
node dist/index.js gateway connect --url ws://127.0.0.1:8787/ws --chat "你好"
node dist/index.js gateway connect --url "wss://gateway.example.com/chat" --chat "你好"
node dist/index.js docs check
node dist/index.js project init --name cocos-agent
node dist/index.js provider list
node dist/index.js provider configure --provider deepseek --model deepseek-chat
node dist/index.js agent config --locale en-US --permission only-safe --provider deepseek --fallback gateway
node dist/index.js workspace new --name "Level design" --provider qwen
node dist/index.js workspace chat --chat "为主场景创建 3D 光照方案"
node dist/index.js terminal run --shell powershell --command "Get-ChildItem assets" --dry-run
node dist/index.js animation analyze --path assets/animations/locomotion.anim
node dist/index.js animation optimize --path assets/animations/locomotion.anim
node dist/index.js animation controller --path assets/scripts/PlayerAnimation.ts --class PlayerAnimation --definition-file animation-state.json
```

## 多模型、工作区与权限

- 内置提供商：OpenAI、Anthropic、DeepSeek、Kimi、Qwen 与既有 WSS Gateway。OpenAI 兼容平台使用 `/chat/completions`，Anthropic 使用官方 `/messages` 协议，Gateway 保持既有流式 WSS 协议。
- 项目本地状态写入 `.cocos-agent/config.json` 和 `.cocos-agent/workspace.json`，已被 Git 忽略。该目录只保存语言、权限、端点、模型和会话消息，绝不保存 API Key。
- `workspace chat` 会按当前会话提供商执行；失败时依次尝试该会话的 `fallbackProviders`。响应与尝试信息会被写回当前会话。
- `zh-CN`、`en-US` 是当前内置 UI/对话语言。`agent config --locale <id>` 可切换。
- 从较低权限提升到 `only-safe` 或 `full-access` 时，必须在启动 CLI/bridge 前设置 `COCOS_AGENT_PERMISSION_ELEVATION=<目标模式>`；MCP 调用不能静默绕过这个门禁。
- 权限模式：`only-access` 仅允许安全的项目只读/MCP 查询；`only-safe` 允许已配置网关的安全对话；`full-access` 才能写 Scene、写配置、执行终端或建立需要提升权限的连接。
- `terminal run` 的工作目录固定为当前 Cocos 项目根目录，支持 `cmd`、`powershell`、`wt`；命令拒绝控制操作符、绝对路径和 `..` 越界片段。
