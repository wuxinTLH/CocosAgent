# Cocos Agent CLI

TypeScript 实现的 CLI，用于执行 WorkFlow、计算任务 hash、读写记忆、调用 Skills 能力，并提供 MCP 服务与 Cocos 编辑器本地桥接。

全局版本：`v0.0.0.1-a`

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
provider list|configure|select|delete  管理模型提供商、连接与删除自定义模型
agent config                 设置 locale、permission、默认提供商与回退链
workspace list|new|switch|delete|rollback|chat  管理 Agent 会话与上下文回滚
terminal run                在 full-access 下运行 cmd/PowerShell/Windows Terminal
animation analyze|optimize 分析和优化当前项目内 .anim 动画
animation ocr|controller   OCR 提取状态或生成 Animation 控制器
math analyze [--path]      只读分析 Transform、Ray、向量与 C/C++ 数学热路径
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
| `OPENAI_API_KEY` / `COCOS_AGENT_OPENAI_API_KEY` | OpenAI 凭据 |
| `ANTHROPIC_API_KEY` / `COCOS_AGENT_ANTHROPIC_API_KEY` | Anthropic 凭据 |
| `DEEPSEEK_API_KEY` / `COCOS_AGENT_DEEPSEEK_API_KEY` | DeepSeek 凭据 |
| `KIMI_API_KEY` / `COCOS_AGENT_KIMI_API_KEY` | Kimi/Moonshot 凭据 |
| `DASHSCOPE_API_KEY` / `COCOS_AGENT_QWEN_API_KEY` | Qwen/DashScope 凭据 |
| `COCOS_AGENT_CCS_URL` | ccs 路由直连地址，默认 `http://127.0.0.1:15721`；CLI 面板也可单独填写 `http://ip:port` |
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
node dist/index.js provider configure --provider openai --model gpt-4.1-mini --protocol responses
node dist/index.js provider configure --provider qwen --endpoint https://dashscope.aliyuncs.com/compatible-mode/v1 --model qwen-plus
node dist/index.js agent config --locale en-US --permission only-safe --provider deepseek --fallback gateway
node dist/index.js ccs doctor
node dist/index.js ccs connect --route current --url http://127.0.0.1:15721
node dist/index.js workspace new --name "Level design" --provider qwen
node dist/index.js workspace chat --chat "为主场景创建 3D 光照方案"
node dist/index.js terminal run --shell powershell --command "Get-ChildItem assets" --dry-run
node dist/index.js animation analyze --path assets/animations/locomotion.anim
node dist/index.js animation optimize --path assets/animations/locomotion.anim
node dist/index.js animation controller --path assets/scripts/PlayerAnimation.ts --class PlayerAnimation --definition-file animation-state.json
node dist/index.js math analyze --path assets/scripts/Player.ts
```

## 多模型、工作区与权限

- 内置提供商：OpenAI、Anthropic、DeepSeek、Kimi、Qwen 与既有 WSS Gateway。OpenAI 兼容平台默认使用 `/chat/completions`，可通过 `provider configure --provider openai --protocol responses` 切换 `/responses` 协议（服务端须支持）；Anthropic 使用官方 `/messages` 协议，Gateway 保持既有流式 WSS 协议。配置并不代表已向供应商认证成功；实际网络请求及模型响应才可确认连接可用。
- 项目本地状态写入 `.cocos-agent/config.json` 和 `.cocos-agent/workspace.json`，已被 Git 忽略。该目录只保存语言、权限、端点、模型和会话消息，绝不保存 API Key。
- Creator 面板只展示已保存／已配置模型；通过二级模型管理添加兼容服务。端点/模型写入项目配置，API Key 可从面板保存到操作系统保护的用户凭据存储或从环境变量读取，不写入项目与会话。编辑密钥留空表示保留，普通配置与日志不回显密钥。
- `workspace chat` 会按当前会话提供商执行；失败时依次尝试该会话的 `fallbackProviders`。响应与尝试信息会被写回当前会话。
- `zh-CN`、`en-US` 是当前内置 UI/对话语言。`agent config --locale <id>` 可切换。
- CLI／通用 MCP 配置从较低权限提升时仍需预先设置 `COCOS_AGENT_PERMISSION_ELEVATION=<目标模式>`；Creator 面板另有用户确认的权限切换通道，该通道不暴露给模型工具和通用 MCP。
- 权限模式：`only-access` 仅允许安全的项目只读/MCP 查询；`only-safe` 允许已配置网关的安全对话、cc-switch 诊断和不含密钥的模型端点/模型配置；`full-access` 才能写 Scene、执行终端或建立需要提升权限的连接。
- `terminal run` 的工作目录固定为当前 Cocos 项目根目录，支持 `cmd`、`powershell`、`wt`；命令拒绝控制操作符、绝对路径和 `..` 越界片段。

## Agent 项目执行

`workspace chat --chat "检查脚本并运行测试"` 始终启用 Agent 工具循环；不再提供普通 Chat 模式。Creator 面板展示最终工具执行记录（不是实时流式进度），支持选择复制文本与输入框上下键历史导航（中文输入法候选操作不被拦截）。

- 默认**有限权限**（`only-safe`）：允许读取项目、调用已配置模型，不得写项目或运行测试；**完整权限**（`full-access`）由用户在面板明确确认后启用，工具调用仍有项目路径与次数限制，不是系统沙箱。模型不能自行提权。
- 自定义模型支持确认后删除，同时清理其加密凭据、默认／回退配置及会话引用；运行期间禁止删除模型。
- 用户消息提供上下文回滚：`workspace rollback --id <会话ID> --message-index <用户消息索引>` 截断该消息及之后的上下文，恢复该消息到草稿。**不撤销已完成的项目或编辑器变更**；运行中的会话不能回滚。
- API 错误保留可复制的脱敏诊断详情，敏感凭据不应进入日志。

- 支持 OpenAI Chat Completions、Responses 和 Anthropic 工具协议；现有 WSS Gateway 没有工具协议，Agent 模式明确报不支持。只有尚未分派任何工具调用时才允许供应商回退，防止重复写入。
- 只读工具检索素材、读取项目场景与脚本。写场景、写脚本、创建实时场景节点和运行测试必须为 `full-access`；模型没有提权、管理凭据或任意终端工具。
- 脚本只允许项目 `assets` / `tests` 下的 `.ts` / `.js`，场景限定 `assets` 下的 `.scene` / `.prefab`；拒绝目录穿越、符号链接／junction 和超限内容。已有脚本覆写前备份到 `temp/agent-backup`。
- 每轮最多 8 次模型响应、16 次工具调用；参数最多 64KiB、单工具结果约 16Ki 字符，HTTP 响应最多 1MiB。失败会保留已执行工具记录，**不自动回滚已完成修改**。
- `project_test` 只运行项目已定义的 npm `test` / `typecheck` / `build` / `lint`，超时 30 秒，输出最多 64KiB，并移除供应商凭据环境变量。**项目脚本本身是可信本地代码，不是操作系统沙箱，仍可访问项目外资源；只对可信项目启用。**
- 实时 `editor_scene_query` / `editor_node_create` 需要由 Creator 扩展启动的认证桥接；后者只新建空节点，可指定父节点及位置，保持场景未保存，不自动覆盖用户场景。普通独立 CLI bridge 不具备实时编辑器连接。
- 当前未实现图像生成、任意组件／材质编辑和自动交互式调试器；工具错误与模型解释不能替代真实渲染或游戏运行验证。

## 验证与连接诊断

在 `cli` 中执行 `npm run verify`（严格类型、JS 检查、测试及文档检查）；再执行 `npm run test:local-project -- --ProjectRoot C:/Users/13929/NewProject`，构建并同步指定测试项目、验证安装 CLI 与 Creator 参数。项目测试是 dry-run，不会证明实时编辑器 IPC 成功。

最近实机测试看到了 Creator 3.8.8 新面板；权限切换、临时模型删除、上下文回退与过期回退拒绝接口成功，但扩展桥接没有持续监听。临时独立桥接的实时查询返回 `EDITOR_NOT_CONNECTED`，该问题尚未修复。请分别核对面板 ready、桥接连接、编辑器 IPC、模型真实认证；任一前级成功都不能替代后级验收。没有真实供应商密钥，本轮未验证外部模型端到端执行。
