# Cocos Agent

全局版本：`v0.0.0.1-a`

面向 Cocos Creator 3D 项目的 Agent 工作区。本项目以 WorkFlow 工作流为骨架，统一约束系统、任务管理、记忆体系、Skills、MCP 工具、CLI 接入与 Cocos 编辑器扩展。

## 定位

- 基于 Cocos Creator 3D 官方规范开发，主语言 TypeScript，工具链允许 JavaScript。
- 所有时间记录统一使用 UTC+8（Asia/Hong_Kong）。
- Agent 的每一次执行都按 WorkFlow 运行，并写入任务 hash、LONG_MEMORY 与 SHORT_MEMORY。
- 所有读写范围默认限制为“当前 Cocos 项目根目录”，禁止越界访问。
- 提供 Skills（OCR 识别、Scene 读写、素材库、cc-switch 连接、长连接对话）和 MCP 服务。
- 提供 TypeScript CLI，并可在 Cocos Creator 内打开 CLI 面板窗口。
- 支持 OpenAI、Anthropic、DeepSeek、Kimi、Qwen 与 WSS Gateway，提供会话工作区、回退链及中英文对话。
- Cocos Creator 的 `Open CLI` 面板采用 IDE 风格 Agent 对话布局，模型通过二级页面添加、编辑或删除；API Key 可加密保存在 Windows 当前用户凭据存储，环境变量优先，不写入项目配置。
- 默认有限权限；完整权限须用户明确确认。支持对话管理、上下文回退、输入历史、可复制的脱敏 API 诊断，以及受控项目工具执行；回退上下文不撤销项目修改。
- 内置 `only-access`、`only-safe`、`full-access` 权限模式；支持项目内受控 CMD、PowerShell 与 Windows Terminal。
- 提供 Cocos AnimationClip 分析、OCR 状态识别、动作优化建议和公开 Animation API 状态控制器生成。

## 文档体系

| 文档 | 作用 |
| --- | --- |
| [WORKFLOW.md](WORKFLOW.md) | Agent 执行工作流：阶段、产物、门禁 |
| [CONSTRAINTS.md](CONSTRAINTS.md) | 全局约束主文档 |
| [CODE_REVIEW.md](CODE_REVIEW.md) | 代码审查规范与 P0-P3 门禁 |
| [HASH.md](HASH.md) | 任务 hash 计算规范 |
| [TODO.md](TODO.md) | 全局任务执行队列与约束覆盖声明 |
| [LONG_MEMORY.md](LONG_MEMORY.md) | 长期记忆，记录每一次执行结果 |
| [SHORT_MEMORY.md](SHORT_MEMORY.md) | 短期记忆，最近 10 次执行 |
| [docs/constraints/](docs/constraints/) | 项目级、语言级约束细则 |
| [skills/](skills/) | Codex/Agent Skills 定义 |
| [mcp/](mcp/) | MCP 服务配置 |
| [cli/](cli/) | TypeScript CLI 与 MCP/桥接服务 |
| [extensions/cocos-agent/](extensions/cocos-agent/) | Cocos Creator 扩展（编辑器内 CLI 窗口） |
| [examples/cocos3d-demo/](examples/cocos3d-demo/) | 独立约束已生成的 Cocos Creator 3D demo 项目 |
| [launcher/](launcher/) | Windows 一键 Overlay 启动器源码 |

## 快速开始

```powershell
cd cli
npm install
npm run build
node dist/index.js status
```

查看当前任务 hash：

```powershell
node dist/index.js hash --request "在这里填写任务请求"
```

安装 Skills 到本机 Codex：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-skills.ps1
```

安装 Cocos 扩展：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-extension.ps1
```

一键安装项目扩展、启动 bridge、探测 Cocos Creator 并自动打开 Cocos Agent 面板：

```powershell
bin\cocos-agent-overlay.cmd -ProjectRoot examples\cocos3d-demo
```

Release 包提供 `CocosAgentOverlay.exe`。不传项目路径时会打开 Cocos 项目目录选择器；也接受位置项目路径或 `-ProjectRoot <项目路径>`。它会等待扩展回执，失败时显示错误窗口并写入 `%USERPROFILE%\.cocos-agent\launcher.log`。

完整本地验证：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify.ps1
powershell -ExecutionPolicy Bypass -File scripts/run-wss-smoke.ps1
```

## 使用与验证边界

- 模型设置与 Agent 工具范围见 [CLI 说明](cli/README.md#agent-项目执行)，面板操作与连接排查见 [扩展说明](extensions/cocos-agent/README.md)。仅保存连接不表示认证成功；WSS Gateway 尚不支持 Agent 工具协议。
- 验证入口：在 `cli` 中运行 `npm run verify`；指定项目验证使用 `npm run test:local-project -- --ProjectRoot C:/Users/13929/NewProject`。后者构建并同步项目扩展、检查安装后的 CLI 与 Creator 启动参数，属于 dry-run，不等于编辑器联动成功。
- 最近实机测试已看到 Creator 3.8.8 新面板，权限切换、临时模型删除及上下文回退接口通过；扩展桥接未持续监听，独立启动桥接后实时编辑器查询返回 `EDITOR_NOT_CONNECTED`。因此不宣称实时编辑器联动或真实云端模型端到端验收通过；面板 `ready` 只证明面板已打开。
- 本轮仅更新并提交源码与文档，版本保持 `v0.0.0.1-a`，不创建 Release。

## 目录结构

```text
.
|-- WORKFLOW.md
|-- CONSTRAINTS.md
|-- CODE_REVIEW.md
|-- HASH.md
|-- TODO.md
|-- LONG_MEMORY.md
|-- SHORT_MEMORY.md
|-- docs/constraints/         项目与语言约束
|-- skills/                   各 Agent Skills
|-- mcp/                      MCP 配置
|-- cli/                      TypeScript CLI
|-- extensions/cocos-agent/   Cocos Creator 扩展
|-- scripts/                  安装与维护脚本
|-- templates/                项目约束模板
`-- assets/                   本工作区自身的 Cocos 资产占位
```

## 约束入口

执行任何任务前，先读取 `WORKFLOW.md`、`CONSTRAINTS.md`、`TODO.md`；修改代码前读取 `CODE_REVIEW.md` 与对应语言约束。所有 `.md` 文档中的约束均纳入 TODO.md 的约束覆盖声明。
