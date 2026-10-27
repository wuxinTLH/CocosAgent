# Cocos Agent 扩展

在 Cocos Creator 内自动打开 Cocos Agent 面板，通过本地 WebSocket 桥接调用 Cocos Agent CLI 与 MCP 工具。

## 前置

1. 构建 CLI：

```powershell
cd cli
npm install
npm run build
```

2. 安装扩展：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-extension.ps1
```

一键打开项目并自动显示 Cocos Agent 面板：

```powershell
bin\cocos-agent-overlay.cmd -ProjectRoot examples\cocos3d-demo
```

## 使用

- 扩展加载后自动启动本地桥接 `ws://127.0.0.1:8899/ws` 并打开 `cocos-agent.overlay` 标准 dockable 面板。
- 菜单：`Cocos Agent -> Open CLI`。
- 菜单：`Cocos Agent -> Overlay`，可重新打开浮动覆盖层。
- Overlay 使用官方 `dockable` 面板协议自动打开，不修改 Cocos 原生资源或私有 UI 文件。Cocos Creator 不提供将第三方扩展强制覆盖整个原生工作区的公开 API。
- `Open CLI` 默认进入简体中文对话界面：顶部管理对话，中央显示消息，底部固定输入区、模型和权限选择器，仅提供 Agent 执行模式。普通文本直接发送，Enter 发送、Shift+Enter 换行，输入法组词时 Enter/上下键不触发发送或历史。上下键只在首行/末行且没有文本选区时切换已发送输入历史，向前返回时恢复未发送草稿，不拦截多行正文编辑。
- 顶栏提供新建、历史与删除；删除必须在面板内再次确认，删除后重新加载当前活动对话。底部模型选择器只显示有凭据的模型或主动保存的自定义/覆盖配置，不展示未配置的内置模板。无密钥模型可以保存，但不代表可以聊天。
- “管理模型”打开独立二级页面，“新增模型”/“编辑模型”进入下一级连接页面；返回路径为连接页 → 模型管理 → 对话。面板不再提供工作区、回退渠道或 cc-switch 设置。新增填写显示名称、Base URL（默认 `https://api.openai.com/v1`）、模型 ID、协议及可选密钥；编辑名称只读。保存并使用会先保存再切换模型，保存不等于认证成功。
- 自然语言始终以 Agent 模式进入工具执行流程。底部“有限权限 / 完整权限”初始为有限权限，再由后端状态同步；选择完整权限必须阅读面板内警告并手动确认，模型不能调用此授权入口。权限以服务端确认结果为准，失败恢复原值，不自动提权。面板显示当前权限、等待状态，以及完成后返回的工具状态卡；工具卡不是实时流式进度。后端若保存了工具轨迹，历史对话也会恢复显示。可执行工具与编辑器操作范围取决于后端及连接状态，不承诺任意编辑器操作或生图。
- 用户历史消息提供“回退到此处”：确认后移除所选消息及之后的对话，将所选问题恢复到输入框（替换当前草稿）。这只回退模型上下文，不撤销、恢复或改动项目文件；执行任务期间不可回退。
- 模型管理提供“删除自定义模型”，必须再次确认；删除自定义配置、保存的凭据及模型引用，保留历史对话。内置模型不可删除，执行任务时也不可删除模型。
- 面板正文、状态和诊断文本可直接选择复制，每条消息还提供“复制”按钮。CLI 与 Overlay 均提供“复制日志”操作；优先使用 Creator WebView 剪贴板 API，失败时回退到浏览器兼容复制实现。
- 面板会优先通过 Creator 的 panel 根节点与 `$` 映射查询控件；DOM 延迟挂载时仅输出诊断，不会因空节点监听而中断扩展加载。
- 可用命令还包括 `math analyze <项目内路径>`，用于只读检查 Transform、Ray、向量和 C/C++ 数学优化候选。
- 密钥使用密码输入框，新增时随 `provider_create`、编辑时随 `provider_configure` 写入 CLI 用户级凭据存储；编辑留空保留原密钥，编辑表单可单独清除已保存密钥。提交或取消后立即清空输入，错误在设置区和诊断区显示后端脱敏后的具体 API 错误（如 HTTP 状态与服务端说明），不回显密钥；密钥不会写入项目配置。启动 Creator 前设置的环境变量仍可提供凭据，优先级由 CLI 决定。
- 保留命令输入：`status`、`providers`、`sessions`、`chat <文本>`、`ccs doctor`、`ccs connect`。`terminal <cmd|powershell|wt> <命令>` 仅在 `full-access` 可用。

## 连接排查与已知限制

- 面板 `ready` 仅表示已打开；同步、构建或 dry-run 不证明桥接持续监听或编辑器 IPC 可用，重建后需重新加载扩展并核对实际连接。
- 最近 NewProject / Creator 3.8.8 已显示新面板，但扩展桥接未持续监听；独立 `bridge start` 的实时查询返回 `EDITOR_NOT_CONNECTED`，该联动问题尚未解决。普通接口测试成功不能替代编辑器验收。
- 检查端口占用、扩展控制台和启动器日志；实时工具需要由扩展启动的认证桥接。无真实供应商凭据时不宣称云端模型端到端通过。

## 说明

- 桥接进程只监听 `127.0.0.1`，不对外网开放。
- 安装脚本会写入 `~/.cocos-agent/config.json`，将用户级扩展关联到已构建的 CLI；CLI 重新构建后可重新运行安装脚本刷新路径。
- 面板发送的路径会由 CLI 的 sandbox 校验，越界自动拒绝。
- 启动器会等待项目内 `.cocos-agent/overlay-status.json` 写入 `ready` 或 `error`；异常详情同时写入 `%USERPROFILE%\.cocos-agent\launcher.log`。若面板未显示，可从 `Cocos Agent -> Overlay` 手动打开并查看该状态文件。
