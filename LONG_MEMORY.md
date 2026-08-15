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

### AGT-20260815-002

- TaskHash：`sha256:bdabea1e0813e01477b0cdbed6bb62c45a4fce8f6c3cae05ed739d3bbf120058`
- 开始：`2026-08-15T18:22:40+08:00`
- 结束：`2026-08-15T18:25:47+08:00`
- 请求：根据 TODO.md 的内容约束等，完成 TODO.md 的需要解决的任务（一次性解决）。
- 推理：待办项中 OCR、WSS、CCS 和 Cocos 编辑器存在外部环境依赖，因此实现离线 Windows OCR、受控本地 WSS mock、ccs doctor 与扩展契约/桥接验证，把不可用外部环境转为可审计诊断；同时创建可打开的 Cocos 3D demo 项目并为其生成独立约束。
- 计划：
1. 修复 OCR 编译并验证项目内真实图像识别。
2. 创建 demo Cocos 项目及独立项目约束。
3. 补齐 WSS、CCS、扩展、Scene、sandbox 等自动测试。
4. 安装扩展、配置 hooks、加入 CI 与文档检查。
5. 更新 TODO 与记忆，执行最终验证。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-15T17:04:13 | 开始处理 TODO 未解决任务 |
| 2026-08-15T17:08:00 | Windows 离线 OCR 返回真实识别文字与坐标 |
| 2026-08-15T17:30:00 | 完成 WSS mock、Token、上下文和重连测试 |
| 2026-08-15T18:00:00 | 完成 CLI 测试、CI、pre-commit、CCS 与扩展契约测试 |
| 2026-08-15T18:16:45 | 安装用户级 Cocos 扩展并配置 CLI bridge |
| 2026-08-15T18:19:00 | 生成 Cocos Creator 3D demo 项目与独立约束 |
| 2026-08-15T18:22:40 | `npm run verify`、WSS smoke、文档校验全部通过 |
| 2026-08-15T18:25:47 | TODO、版本、记忆与最终工作区状态完成同步 |

- 结果：完成全部 TODO 实现项。OCR 使用 Windows 离线能力完成真实识别；WSS mock 覆盖鉴权、流式、心跳、重连和上下文；CCS 连接逻辑对本机 cc-switch 配置与 mock 路由验证通过；扩展已安装并完成 bridge 健康检查；CI/hook/文档检查已启用。`ccs doctor` 确认当前机器没有已安装的 Cocos Creator 3.8，因此无法对不存在的编辑器进程进行 UI 级运行验证，但安装、配置、协议和自动化验证均已完成。
- 文件：VERSION、.env.example、.github/workflows/ci.yml、.githooks/pre-commit、cli/scripts/*、cli/src/tests/*、cli/scripts/windows-ocr.ps1、examples/cocos3d-demo/*、docs/constraints/PROJECT-cocos-agent.md、extensions/cocos-agent/*、scripts/*、TODO、CONSTRAINTS。
- 后续：当安装 Cocos Creator 3.8 后，打开 `examples/cocos3d-demo` 并从 `Cocos Agent -> Open CLI` 执行最终 UI 烟测；生产 WSS 仅需设置 `.env.example` 所列环境变量。
