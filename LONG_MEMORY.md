# LONG_MEMORY 长期记忆

规则：

- 每一次 Agent 执行完成后必须追加一条记录。
- 每条记录包含：请求、推理、计划、时间线（UTC+8）、任务 hash、结果。
- 记录只追加、不删除；修正错误时追加修正记录。
- 任务 hash 按 [HASH.md](HASH.md) 计算。

## 执行记录

### AGT-20260815-001

- TaskHash：`sha256:92aa5ecf27794f7fa14c19ba2603d4b93f67bca0248826aa18f6e1dc69138952`
- 开始：`2026-08-15T16:57:00+08:00`
- 结束：`2026-08-15T17:04:13+08:00`
- 请求：初始化 Cocos Agent 工作区：约束系统、记忆体系、TODO、Skills、MCP、CLI 与 Cocos 扩展骨架。
- 推理：仓库为空，需要一次性建立可运行的基础设施；约束与记忆文档优先，因为后续所有执行都依赖它们；Skills/MCP/CLI/扩展按同一约束体系设计，避免返工。cc-switch 按本机 `~/.cc-switch/settings.json` 实际配置设计为可配置路由，不硬编码编辑器路径。
- 计划：
  1. 生成 WorkFlow、约束、审查、hash 文档。
  2. 生成 TODO 与长短记忆并写入首条记录。
  3. 生成 Skills 与 MCP 配置。
  4. 搭建 TypeScript CLI 与 Cocos 扩展。
  5. 安装依赖、构建并验证 CLI。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-15T16:46:47 | 创建空仓库 |
| 2026-08-15T16:57:00 | 开始引导任务，计算任务 hash |
| 2026-08-15T16:58:20 | 完成根文档与约束细则 |
| 2026-08-15T16:59:30 | 写入 TODO 与记忆初始记录 |
| 2026-08-15T17:00:00 | 完成 Skills 与 MCP 配置 |
| 2026-08-15T17:01:20 | 完成 CLI 核心模块与 Cocos 扩展 |
| 2026-08-15T17:02:00 | 安装依赖并完成 TypeScript 编译 |
| 2026-08-15T17:03:50 | 验证 status/hash/scene/assets/sandbox/MCP |
| 2026-08-15T17:04:00 | 验证本地桥接健康检查并安装 Skills |

- 结果：完成约束系统、记忆体系、Skills/MCP、CLI 与 Cocos 扩展骨架；CLI 已构建并验证，MCP initialize/tools/call、场景节点树、素材检索、沙箱越界拒绝、桥接健康检查均通过；5 个 Skills 已安装到本机 Codex。
- 文件：README、WORKFLOW、CONSTRAINTS、CODE_REVIEW、HASH、TODO、LONG_MEMORY、SHORT_MEMORY、docs/constraints/*、skills/*、mcp/*、cli/*、extensions/cocos-agent/*。
- 后续：按 TODO.md 待办联调 OCR、网关、cc-switch 路由与真实 Cocos 项目。
