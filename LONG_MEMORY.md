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

### AGT-20260815-003

- TaskHash：`sha256:5f53596cedf715f6d6606265ce090f40430adbed6db6df1fe9d8a403b799c342`
- 开始：`2026-08-15T18:53:35+08:00`
- 结束：`2026-08-15T18:53:35+08:00`
- 请求：根据 TODO.md 完成完整系统性测试、提交 GitHub 仓库并创建 v0.0.0.1-a release。
- 推理：发布前先审计 staged 文件，发现 WSS mock PFX 是私钥容器，因此从 public repo 移除，改为 CI 临时生成证书；之后执行完整 verify、创建提交并推送，使用标签触发 GitHub Actions Release 工作流，最后通过 GitHub API 确认 release 已创建。
- 计划：
1. 完成系统测试和公开仓库敏感文件审计。
2. 提交并推送 `master`。
3. 创建、推送 `v0.0.0.1-a` 标签并触发 Release 工作流。
4. 查询 GitHub Release API，更新 TODO 与记忆。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-15T18:35:00 | `npm run verify` 通过，常规测试与文档校验完成 |
| 2026-08-15T18:40:00 | 审计并移除仓库内 WSS 测试私钥容器，CI 改为临时证书 |
| 2026-08-15T18:45:00 | 提交 `dc3cdf4` 并推送到公开 GitHub 仓库 |
| 2026-08-15T18:50:00 | 提交 Release workflow、推送 `master`、强制更新版本标签 |
| 2026-08-15T18:53:35 | GitHub API 确认 prerelease 已创建 |

- 结果：公开仓库 `https://github.com/wuxinTLH/CocosAgent` 已同步；`master` 包含完整实现与 CI；`v0.0.0.1-a` 标签与 GitHub prerelease 已创建；发布前不含 `.env`、PFX、PEM 或私钥文件。
- 文件：CHANGELOG、VERSION、.github/workflows/ci.yml、.github/workflows/release.yml、TODO、LONG_MEMORY、SHORT_MEMORY、.gitignore。
- 后续：生产网关使用 `.env.example` 配置；Cocos Creator 3.8 安装后执行扩展 UI 烟测。

### AGT-20260815-004

- TaskHash：`sha256:1c6dc9953dcd50f6bda922c2aa596cb944cab3fa676624520eff030c23f016ef`
- 开始：`2026-08-15T21:11:39+08:00`
- 结束：`2026-08-15T21:11:39+08:00`
- 请求：根据 TODO.md 完成 release 实际可执行文件和覆盖 Cocos 原生 UI 的一键式 Overlay 功能。
- 推理：现有 release 只有源码和脚本，不能满足一键执行；因此增加 Cocos Creator `float` 面板、项目级扩展复制器、Creator 探测/启动脚本、Windows self-contained .NET 启动器，并把 CLI runtime dependencies 一并放入 release zip。
- 计划：
1. 增加 Overlay 面板与菜单入口，自动启动 bridge。
2. 增加 PowerShell/命令行/Windows self-contained 启动器。
3. 增加 Overlay manifest、脚本、dry-run、扩展契约测试。
4. 更新 release zip 打包并完成完整验证。
5. 更新 TODO 与记忆，提交并发布修订版本。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-15T20:55:00 | 审计 TODO，确认 release 缺少实际可执行入口 |
| 2026-08-15T21:02:00 | 完成 `cocos-agent.overlay` 浮动覆盖面板 |
| 2026-08-15T21:06:00 | 完成 PowerShell/.cmd/`.NET` 一键启动器 |
| 2026-08-15T21:09:00 | `npm run verify`、Overlay dry-run、启动器 dry-run 通过 |
| 2026-08-15T21:11:39 | 更新 release zip 打包、TODO 与记忆 |

- 结果：TODO 唯一任务已闭环。现在可以使用 `bin/cocos-agent-overlay.cmd -ProjectRoot <project>`，或 Release 中的 `CocosAgentOverlay.exe <project>`；它会复制项目扩展、配置 CLI bridge、探测并启动 Cocos Creator，扩展加载后自动打开覆盖原生工作区的 `cocos-agent.overlay` 浮动面板。当前机器未安装 Creator 时 dry-run 返回 `creator=not-found`，不会伪造启动成功。
- 文件：extensions/cocos-agent/package.json、extensions/cocos-agent/src/overlay.js、scripts/launch-cocos-agent.ps1、bin/cocos-agent-overlay.cmd、launcher/*、.github/workflows/release.yml、README、CHANGELOG、TODO。
- 后续：安装 Cocos Creator 3.8 后运行启动器即可进行真实编辑器 UI 烟测；Release workflow 会上传包含 `CocosAgentOverlay.exe`、扩展、CLI dist 和 runtime dependencies 的 Windows zip。

### AGT-20260815-005

- TaskHash：`sha256:254e3f4d2dc10165019184ef2757a534aec10ed78af24620a6690298cd8a146b`
- 开始：`2026-08-15T21:18:35+08:00`
- 结束：`2026-08-15T21:18:35+08:00`
- 请求：验证一键 Overlay Windows release 资产并同步 TODO 和记忆。
- 推理：版本标签已触发 Release 工作流，必须通过 GitHub Release API 确认实际资产上传成功，而不能仅依据 git tag 判断发布完成。
- 计划：
1. 查询 `v0.0.0.1-a` Release API。
2. 核对资产名称、大小和 uploaded 状态。
3. 更新 TODO 和长期/短期记忆。
4. 提交并推送发布记录。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-15T21:17:30 | 修复项目扩展重复复制问题并推送标签 |
| 2026-08-15T21:18:35 | GitHub API 确认 Windows zip 资产为 uploaded |

- 结果：Release 资产 `cocos-agent-v0.0.0.1-a-windows.zip` 已上传，大小 48,758,029 bytes；资产包含 `CocosAgentOverlay.exe`、CLI dist/runtime、Cocos 扩展与一键启动脚本。
- 文件：TODO、LONG_MEMORY、SHORT_MEMORY。
- 后续：使用 Release zip 解压后运行 `CocosAgentOverlay.exe <Cocos项目根目录>`。

### AGT-20260817-006

- TaskHash：`sha256:41a71183f0f823a5e4a9dd5ea633e0b7ef2855799cdec3d7db25aa2621834ee5`
- 开始：`2026-08-17T20:06:40+08:00`
- 结束：`2026-08-17T20:43:30+08:00`
- 请求：根据 TODO.md 的内容约束等，完成 TODO.md 的需要解决的任务（一次性解决）。
- 推理：六项待办必须在 CLI、MCP 和 Cocos 扩展间共享同一分发层。项目配置和会话只保存到当前项目 `.cocos-agent/`，API Key 始终只读环境变量；权限模式必须由统一工具分发器执行，并用进程启动环境门禁阻止受限 MCP 客户端自行提升权限。
- 计划：
1. 审查 CLI、Gateway、MCP、桥接和扩展结构。
2. 增加多提供商、i18n、会话工作区和回退链。
3. 增加权限策略、Windows 终端、MCP/Skills 与面板命令。
4. 增加测试、文档并执行验证。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-17T20:06:40+08:00 | 读取 TODO、WorkFlow 与约束，确认六项待办未实现。 |
| 2026-08-17T20:23:46+08:00 | 完成多提供商、工作区、i18n、权限与终端核心模块。 |
| 2026-08-17T20:29:00+08:00 | 完成 CLI、MCP 和 Cocos CLI/Overlay 命令接入。 |
| 2026-08-17T20:35:00+08:00 | 完成回退、权限、终端边界测试并安装新增 Skills。 |
| 2026-08-17T20:36:16+08:00 | 验证 MCP `initialize` 与 `tools/list`，新工具可被客户端发现。 |
| 2026-08-17T20:41:31+08:00 | 计算任务 hash，更新文档、TODO 与记忆。 |
| 2026-08-17T20:43:30+08:00 | 完成最终验证、审查与收尾记录。 |

- 结果：完成 TODO 六项任务。新增 OpenAI、Anthropic、DeepSeek、Kimi、Qwen 和 WSS Gateway 提供商；支持 `zh-CN`/`en-US`；支持多会话、会话切换与回退链；支持 `only-access`、`only-safe`、`full-access` 并要求 `COCOS_AGENT_PERMISSION_ELEVATION` 显式提升；支持受控 cmd/PowerShell/Windows Terminal；新增模型工作区、权限与终端 Skills，扩展 MCP 工具和 Cocos 面板命令。`npm run verify`、MCP stdio 发现、18 组测试（17 通过，1 个既有 WSS 证书测试按环境跳过）均通过。
- 文件：
- `.env.example`、`.gitignore`、`README.md`、`TODO.md`
- `cli/README.md`、`cli/src/config.ts`、`cli/src/i18n.ts`、`cli/src/permissions.ts`
- `cli/src/providers.ts`、`cli/src/workspace.ts`、`cli/src/terminal.ts`
- `cli/src/tools.ts`、`cli/src/index.ts`、`cli/src/gateway.ts`
- `cli/src/tests/agent-workspace.test.ts`、`cli/src/tests/extension.test.ts`
- `extensions/cocos-agent/*`、`mcp/README.md`、`skills/model-workspace/SKILL.md`
- `skills/agent-permissions/SKILL.md`、`skills/windows-terminal/SKILL.md`
- 后续：
- 安装 Cocos Creator 3.8 后，用真实编辑器启动 Overlay 做 UI 烟测；当前机器未检测到 Creator，未声称外部编辑器验证完成。
### AGT-20260817-007

- TaskHash：`sha256:41a71183f0f823a5e4a9dd5ea633e0b7ef2855799cdec3d7db25aa2621834ee5`
- 开始：`2026-08-17T20:43:31+08:00`
- 结束：`2026-08-17T20:45:00+08:00`
- 请求：修正 AGT-20260817-006 的最终验证记录。
- 推理：后续补充了 `only-safe` Gateway 端点覆盖拒绝测试，并按 HASH 规范用实际开始时间重算任务 hash；必须以追加方式更正长期记忆，不能改写历史结论。
- 计划：
1. 用实际开始时间重算任务 hash。
2. 同步 LONG_MEMORY 与 SHORT_MEMORY。
3. 记录最终验证数量和安全扫描结果。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-17T20:43:31+08:00 | 重算 AGT-20260817-006 的任务 hash 为 `sha256:41a71183...` 并同步短期记忆。 |
| 2026-08-17T20:45:00+08:00 | 增加 Gateway 端点覆盖限制测试，最终验证为 19 组测试、18 通过、1 跳过。 |

- 结果：AGT-20260817-006 的最终验证更正为：`npm run verify` 通过；19 组测试中 18 组通过，1 组既有 WSS 证书测试因未设置 `COCOS_AGENT_TEST_WSS_PFX` 按条件跳过；文档检查通过，密钥扫描无发现。
- 文件：
- `LONG_MEMORY.md`
- `SHORT_MEMORY.md`
- `cli/src/config.ts`
- `cli/src/tools.ts`
- `cli/src/terminal.ts`
- `cli/src/tests/agent-workspace.test.ts`
- 后续：
- 无代码待办；真实 Cocos Creator 编辑器 UI 烟测仍需安装 Creator 后执行。

### AGT-20260819-008

- TaskHash：`sha256:e2b70ec62d7fd774ae09ba34956a8df1a8a1ad5c640136c64c3f26da1150db24`
- 开始：`2026-08-19T19:47:44+08:00`
- 结束：`2026-08-19T19:48:58+08:00`
- 请求：根据 TODO.md 的内容约束等，完成 TODO.md 的需要解决的任务（一次性解决）。
- 推理：本轮待办聚焦 Cocos AnimationClip 工作流和版本发布收尾。动画资源由 Cocos 编辑器管理，必须只读解析 `.anim`，状态控制器只能生成基于官方 `Animation.crossFade` 的 TypeScript；所有工具继续复用当前项目 sandbox 和权限门禁。发布前还需清理文档排版残留、安装 Skill、验证 MCP 工具发现，并以可复现 hash 和 UTC+8 记录结果。
- 计划：
  1. 检查并修复 Markdown 字面量换行与版本/待办状态。
  2. 安装 `cocos-animation` Skill，验证 MCP `initialize` 与 `tools/list`。
  3. 执行 `npm run verify`、Release 构建验证、安全扫描和 diff 检查。
  4. 更新 TODO、LONG_MEMORY、SHORT_MEMORY，提交并推送版本。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-19T19:47:44 | 按 HASH.md 规范确定请求、项目根目录和任务开始时间。 |
| 2026-08-19T19:47:55 | 修复 README 与 CLI README 中的 `` `r`n `` 字面量换行。 |
| 2026-08-19T19:48:05 | 安装全部项目 Skills，包含新增 `cocos-animation`。 |
| 2026-08-19T19:48:20 | MCP `initialize` 与 `tools/list` 通过，发现四个动画工具。 |
| 2026-08-19T19:48:58 | 更新 TODO 和短长期记忆，进入提交发布阶段。 |

- 结果：动画分析、优化、OCR 状态候选、`idle -> run -> jump` 控制器生成已实现并接入 CLI、MCP、扩展面板和 Skill；版本统一为 `v0.0.0.2-a`，本地 Windows Release 构建已验证。`npm run verify` 为 TypeScript/JavaScript 检查通过、21 项测试中 20 项通过、1 项 WSS 证书测试因未设置 `COCOS_AGENT_TEST_WSS_PFX` 按设计跳过；文档检查通过，`git diff --check` 通过。当前机器没有 Cocos Creator，真实编辑器 UI 烟测未宣称完成。
- 文件：
  - `cli/src/animation.ts`、`cli/src/tools.ts`、`cli/src/index.ts`
  - `cli/src/tests/animation.test.ts`、`cli/tests/fixtures/sample.anim`
  - `skills/cocos-animation/SKILL.md`
  - `README.md`、`cli/README.md`、`mcp/README.md`、`TODO.md`、`CHANGELOG.md`
  - `VERSION` 及 npm/Cocos manifest、扩展面板和发布脚本
- 后续：提交当前变更并推送 `master` 与 `v0.0.0.2-a`；推送后核对 GitHub Release 资产。真实 Cocos Creator UI 烟测仍需在安装 Creator 的机器执行。

### AGT-20260819-009

- TaskHash：`sha256:d1efeaddc3a92046878147a0fa171acac7fbfe016b06a65cb906c3d50fd9866e`
- 开始：`2026-08-19T19:48:58+08:00`
- 结束：`2026-08-19T19:55:02+08:00`
- 请求：完成本轮 TODO 收尾后的提交、推送与 Release 核验。
- 推理：代码和本地验证已通过，发布阶段必须分别确认 master、版本标签、GitHub Actions 和 Release 资产，不能把本地 tag 视为发布成功。首次标签推送遇到 Schannel TLS 握手失败，改用 HTTP/1.1 重试成功；随后用 GitHub API 验证工作流和资产状态。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-19T19:49:10 | 提交 `0d1b003`：`feat: add cocos animation workflow`，提交钩子再次通过 `npm run verify`。 |
| 2026-08-19T19:50:00 | `master` 推送成功；标签首次推送因 TLS 握手失败。 |
| 2026-08-19T19:51:00 | 使用 HTTP/1.1 成功推送 `v0.0.0.2-a`。 |
| 2026-08-19T19:54:30 | GitHub Actions Release run `32249853193` 完成，结论 `success`。 |
| 2026-08-19T19:55:02 | GitHub API 确认 prerelease 与 Windows zip 资产已上传。 |

- 结果：远程 `master` 与 `v0.0.0.2-a` 均指向 `0d1b003c555087234536eb88cc705b7ab844e24e`。Release 地址为 `https://github.com/wuxinTLH/CocosAgent/releases/tag/v0.0.0.2-a`，资产 `cocos-agent-v0.0.0.2-a-windows.zip` 状态为 `uploaded`，大小 48,787,181 bytes。
- 后续：无代码待办；真实 Cocos Creator UI 烟测仍需在安装 Creator 的机器执行。

### AGT-20260819-010

- TaskHash：`sha256:1463191d8e8171e4c298b65589356570364a38072e2ac488f8f1d58da2340175`
- 开始：`2026-08-19T22:13:23+08:00`
- 结束：`2026-08-19T22:22:50+08:00`
- 请求：根据 TODO.md 的内容约束等，完成 TODO.md 的需要解决的任务（一次性解决）。
- 推理：用户验证到 `v0.0.0.2-a` 的 Overlay 启动器未显示 UI 且没有错误。原实现使用了不可靠的 `float` 面板类型，EXE 只启动 Creator 而未确认扩展加载；同时文档使用的 `-ProjectRoot` 参数不被 EXE 解析，双击出错也不会留下可见反馈。修复必须仅使用公开 `Editor.Panel` 协议，不能尝试强制改写 Creator 私有 UI。
- 计划：
  1. 将 Overlay 改为标准 `dockable` 面板，并捕获打开失败。
  2. 让项目扩展写入 `.cocos-agent/overlay-status.json`，启动脚本等待 `ready/error` 回执。
  3. 为 EXE 加入 `-ProjectRoot`、PowerShell 参数安全传递、错误窗口和持久日志。
  4. 修正 Creator Electron 启动 CLI bridge 的 Node 运行环境，完善测试、发布路径和版本映射。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-19T22:13:23 | 读取 TODO、WorkFlow、启动器与扩展链路，确认 `float`、无回执和参数不兼容风险。 |
| 2026-08-19T22:16:00 | 实现 dockable 面板、扩展状态回执、启动日志、错误窗口和 20 秒加载超时。 |
| 2026-08-19T22:18:00 | 为 Electron bridge 设置 `ELECTRON_RUN_AS_NODE` 与当前项目根目录。 |
| 2026-08-19T22:19:30 | `dotnet build`、`dotnet publish`、PowerShell 语法检查和 `-ProjectRoot` dry-run 通过。 |
| 2026-08-19T22:21:20 | `npm run verify` 通过，21 项测试中 20 项通过、1 项证书测试按环境跳过，文档检查通过。 |
| 2026-08-19T22:22:50 | 更新 TODO、版本、记忆和 Release workflow 路径，进入提交发布阶段。 |

- 结果：修复 Overlay 启动器和扩展加载链路，版本提升到 `v0.0.0.3-a`。`CocosAgentOverlay.exe` 现在同时接受位置项目路径和 `-ProjectRoot`；失败时展示原生错误窗口，并将诊断写入 `%USERPROFILE%\\.cocos-agent\\launcher.log`。项目内扩展使用官方 `dockable` 面板，在 `.cocos-agent/overlay-status.json` 写入 `ready/error` 回执；Creator 不提供强制覆盖整个原生工作区的公开 API，因此文档已改为准确的“自动打开 Cocos Agent 面板”表述。发布单文件 EXE 的 dry-run、扩展安装、TypeScript/JavaScript 检查、完整 CLI 测试、文档检查和 `git diff --check` 均通过。当前机器未安装 Cocos Creator，不能宣称真实编辑器 UI 已烟测。
- 文件：
  - `launcher/Program.cs`、`launcher/CocosAgentOverlay.csproj`
  - `scripts/launch-cocos-agent.ps1`、`scripts/install-extension.ps1`
  - `extensions/cocos-agent/*`、`examples/cocos3d-demo/extensions/cocos-agent/*`
  - `.github/workflows/release.yml`、`cli/src/tests/extension.test.ts`
  - `VERSION`、`CHANGELOG.md`、`README.md`、`TODO.md`
- 后续：在安装 Cocos Creator 3.8 的 Windows 环境运行 `CocosAgentOverlay.exe -ProjectRoot <项目路径>`，确认 `overlay-status.json` 为 `ready` 并检查自动打开的 Cocos Agent 面板；然后推送 `v0.0.0.3-a` 触发 Windows prerelease。

### AGT-20260819-011

- TaskHash：`sha256:3ce66f76959cf13c45d222aa4b1921b14e65379d54a42f3665f0f5866d83ab0d`
- 开始：`2026-08-19T22:22:50+08:00`
- 结束：`2026-08-19T22:27:36+08:00`
- 请求：完成本轮 TODO 收尾后的提交、推送与 Release 核验。
- 推理：修复完成后必须确认远程分支、版本标签、GitHub Actions 和真实 Release 资产。标签首推遇到短暂 Schannel TLS 握手失败，`master` 已成功推送；按既有可行方案使用 HTTP/1.1 单独重试标签推送，再通过 GitHub API 验证发布。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-19T22:23:10 | 提交 `df060ad`：`fix: report cocos overlay startup failures`，提交钩子再次通过 `npm run verify`。 |
| 2026-08-19T22:24:00 | `master` 推送成功；首次标签推送出现 TLS 握手失败。 |
| 2026-08-19T22:24:20 | 使用 HTTP/1.1 成功推送 `v0.0.0.3-a`。 |
| 2026-08-19T22:26:55 | GitHub Actions Release run `32263993635` 完成，结论 `success`。 |
| 2026-08-19T22:27:36 | GitHub API 确认 prerelease 和 Windows zip 资产上传完成。 |

- 结果：远程 `master` 与 `v0.0.0.3-a` 均指向 `df060adf556c8694c6b33a1836f50aea6f95d935`。Release 地址为 `https://github.com/wuxinTLH/CocosAgent/releases/tag/v0.0.0.3-a`，资产 `cocos-agent-v0.0.0.3-a-windows.zip` 状态为 `uploaded`，大小 48,792,827 bytes。
- 后续：真实 Cocos Creator UI 烟测仍需在安装 Creator 的 Windows 环境执行；启动后查看项目 `.cocos-agent/overlay-status.json` 与用户级 `launcher.log`。

### AGT-20260820-012

- TaskHash：`sha256:918677c76f2c5ad1abd0438d6a1d427a2aeeae30c06f8d4539654d21637d0920`
- 开始：`2026-08-20T20:35:00+08:00`
- 结束：`2026-08-20T20:37:46+08:00`
- 请求：继续未完成内容，修复无参数启动 `CocosAgentOverlay.exe` 仅显示 Usage。
- 推理：TODO 中保留的真实日志表明用户从资源管理器直接启动 EXE。该场景没有命令行参数，单纯显示 Usage 不可用；应使用 Windows 原生目录选择器让用户选择 Cocos 项目，同时保留适合脚本和 CI 的位置参数、`-ProjectRoot` 与 `--dry-run`。取消选择不是异常，应安静成功退出。
- 计划：
  1. 将启动器无项目参数分支替换为 STA Windows FolderBrowserDialog。
  2. 为 `--dry-run` 返回稳定的 `selection-required` 结果，避免自动化中打开 UI。
  3. 升级版本、补充回归测试、构建单文件 EXE 并验证两种启动方式。
  4. 更新 TODO 和记忆，提交并发布新 prerelease。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-20T20:35:00 | 恢复中断任务，确认 TODO 新增无参数 Usage 日志。 |
| 2026-08-20T20:35:40 | 加入 Windows 项目目录选择器和取消选择正常退出逻辑。 |
| 2026-08-20T20:36:20 | `dotnet build` 通过；发布版 EXE 无参数 dry-run 返回 `selection-required`。 |
| 2026-08-20T20:36:50 | 发布版 EXE `-ProjectRoot` dry-run 成功解析 demo 项目。 |
| 2026-08-20T20:37:30 | `npm run verify` 通过：20/21 测试通过，1 个 WSS 证书测试按环境跳过；文档检查 55/0。 |
| 2026-08-20T20:37:46 | 更新版本、TODO 和记忆，准备推送 `v0.0.0.4-a`。 |

- 结果：`CocosAgentOverlay.exe` 无参数启动时不再只显示 Usage，而是显示 Cocos 项目目录选择器；用户取消选择时返回 0。显式项目路径和 `-ProjectRoot <项目路径>` 保持兼容，`--dry-run` 可非交互测试。Windows 单文件发布构建、无参数 dry-run、`-ProjectRoot` dry-run、TypeScript/JavaScript 检查、完整 CLI 测试、文档检查与 `git diff --check` 均通过。版本升级为 `v0.0.0.4-a`。没有安装 Cocos Creator，因此实际编辑器 UI 烟测仍不能宣称完成。
- 文件：
  - `launcher/Program.cs`、`launcher/CocosAgentOverlay.csproj`
  - `cli/src/tests/extension.test.ts`
  - `VERSION`、npm/Cocos manifest、安装与启动脚本
  - `README.md`、`CHANGELOG.md`、`TODO.md`、`LONG_MEMORY.md`、`SHORT_MEMORY.md`
- 后续：推送 `v0.0.0.4-a`，核验 GitHub Windows prerelease 资产；真实 Creator 环境中双击 EXE 选择项目后检查面板和 `overlay-status.json`。

### AGT-20260820-013

- TaskHash：`sha256:b96915e4510732142195e6514986378b9718e9c50fa366038ecb1986048a1c1d`
- 开始：`2026-08-20T20:37:46+08:00`
- 结束：`2026-08-20T20:42:35+08:00`
- 请求：完成 v0.0.0.4-a 启动器修复后的提交、推送与 Release 核验。
- 推理：本地实现和验证已经完成，发布阶段需要确认 commit、master、tag、GitHub Actions 和实际 Release 资产。Windows Forms 引入后自包含包体积会增加，必须以 API 返回的真实资产大小记录。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-20T20:38:00 | 提交 `256f6b4`：`fix: select cocos project on launcher startup`。 |
| 2026-08-20T20:38:30 | `master` 与 `v0.0.0.4-a` 推送成功。 |
| 2026-08-20T20:41:15 | GitHub Actions Release run `32370125145` 开始执行。 |
| 2026-08-20T20:42:09 | GitHub Actions 完成，结论 `success`。 |
| 2026-08-20T20:42:35 | GitHub API 确认 prerelease 与 Windows zip 资产上传完成。 |

- 结果：远程 `master` 与 `v0.0.0.4-a` 指向 `256f6b4`；资产 `cocos-agent-v0.0.0.4-a-windows.zip` 状态 `uploaded`，大小 84,871,034 bytes。

### AGT-20260820-014

- TaskHash：`sha256:5d9bb44356a61720130deae30733bf8133e3be6a6d872e62c2d94d268e9c2116`
- 开始：`2026-08-20T20:49:00+08:00`
- 结束：`2026-08-20T21:00:40+08:00`
- 请求：根据 TODO.md 的内容约束等，完成 TODO.md 的需要解决的任务（一次性解决）。
- 推理：TODO 日志显示用户选择了 `C:\Users\13929\NewProject` 后启动器找不到 Creator，随后误把 `E:\cocos editor\Creator\3.8.8` 当作项目目录。根因是 Creator 探测范围未覆盖该安装位置，且目录选择器没有区分项目目录和编辑器安装目录。修复应扩大自动探测范围、记住 `creatorPath`，并对误选目录给出明确提示。
- 计划：
  1. 扩展 `Resolve-CocosCreator` 的探测根目录，并持久化 `creatorPath`。
  2. 在 EXE 中选择项目后校验 `assets` 与 manifest，识别 Creator 安装目录并给出提示。
  3. 升级到 `v0.0.0.5-a`，补充回归断言，构建并验证单文件 EXE。
  4. 更新 TODO 和记忆，提交并发布新 prerelease。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-20T20:49:00 | 确认 TODO 日志与 Creator 安装路径 `E:\cocos editor\Creator\3.8.8\CocosCreator.exe`。 |
| 2026-08-20T20:52:00 | 扩展探测目录并持久化 `creatorPath`；脚本 dry-run 自动找到本机 Creator。 |
| 2026-08-20T20:55:00 | EXE 增加项目目录校验和 Creator 安装目录识别。 |
| 2026-08-20T20:58:00 | `npm run verify` 与 Windows 单文件发布构建通过。 |
| 2026-08-20T21:00:00 | 发布版 EXE 无参数和 `-ProjectRoot` dry-run 均通过。 |
| 2026-08-20T21:00:40 | 更新 TODO 和长短记忆，准备提交。 |

- 结果：`CocosAgentOverlay.exe` 现在能自动找到 `E:\cocos editor\Creator\3.8.8\CocosCreator.exe`，并会把路径写入 `%USERPROFILE%\.cocos-agent\config.json` 的 `creatorPath`。选择 Creator 安装目录时不再只报“assets missing”，而是提示应选择包含 `assets` 的项目目录。`npm run verify`（20 通过、1 个 WSS 证书测试按环境跳过）、文档检查 55/0、发布版 EXE dry-run 和 `git diff --check` 均通过。真实 Creator UI 启动仍需在安装该版本后由用户最终确认。
- 文件：
  - `scripts/launch-cocos-agent.ps1`、`launcher/Program.cs`
  - `cli/src/tests/extension.test.ts`
  - `VERSION`、npm/Cocos manifest、`CHANGELOG.md`、`README.md`、`TODO.md`
- 后续：推送 `v0.0.0.5-a` 并核验 GitHub Windows prerelease；安装后选择 `C:\Users\13929\NewProject` 应自动启动 Creator 并等待 `overlay-status.json` 为 `ready`。

### AGT-20260820-015

- TaskHash：`sha256:e9b1ac5ccc94cc1a1759e447bcd9560fa6f12213786c48f5a7b58de84a417577`
- 开始：`2026-08-20T21:06:03+08:00`
- 结束：`2026-08-20T21:06:47+08:00`
- 请求：根据 TODO.md 的内容约束等，完成 TODO.md 的需要解决的任务（一次性解决）。
- 推理：上一轮已完成 `v0.0.0.5-a` 的本地修复与构建，TODO 剩余发布闭环为推送 master/tag、等待 GitHub Actions Release、核验 Windows zip 资产并同步记忆。
- 计划：
  1. 推送 `e5be5d4` 到 master 并创建/推送 `v0.0.0.5-a` 标签。
  2. 等待 GitHub Actions Release 完成，用 GitHub API 核验 prerelease 与资产。
  3. 更新 TODO、LONG_MEMORY、SHORT_MEMORY 并提交。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-20T21:03:10 | 推送 `e5be5d4` 到 master，随后推送 `v0.0.0.5-a` 标签。 |
| 2026-08-20T21:04:22 | GitHub Actions Release run `32372115396` 完成，结论 `success`。 |
| 2026-08-20T21:06:03 | GitHub API 确认 prerelease 与 Windows zip 资产 `uploaded`。 |
| 2026-08-20T21:06:47 | 更新 TODO 与长短记忆，准备提交。 |

- 结果：远程 `master` 与 `v0.0.0.5-a` 指向 `e5be5d4`；Release 资产 `cocos-agent-v0.0.0.5-a-windows.zip` 状态 `uploaded`，大小 84,878,860 bytes。
- 文件：`TODO.md`、`LONG_MEMORY.md`、`SHORT_MEMORY.md`
- 后续：安装 release zip 后选择 `C:\Users\13929\NewProject`，确认 Overlay 面板显示并等待 `overlay-status.json` 为 `ready`。

### AGT-20260820-016

- TaskHash：`sha256:c8af21146a574452e25990cb8aef53ba43121a31f9d2011037f062ec1481ab24`
- 开始：`2026-08-20T21:41:10+08:00`
- 结束：`2026-08-20T21:44:37+08:00`
- 请求：根据 TODO.md 的内容约束等，完成 TODO.md 的需要解决的任务（一次性解决）。
- 推理：TODO 待办显示 Overlay 能覆盖原始 bar 并新增 Cocos Agent，但二级菜单显示为 `undefined`。对照官方 Cocos Creator 3.8 自定义主菜单规范，菜单贡献必须提供必填 `label`；现有扩展只写了 `path` 和 `message`，因此子菜单项标签为空。
- 计划：
  1. 为 `Open CLI` 与 `Overlay` 菜单项补充 `label`，同步根扩展与 demo 项目扩展。
  2. 增加扩展清单菜单项 `path`/`label`/`message` 回归断言。
  3. 升级 `v0.0.0.6-a`，运行 CLI 验证、Windows 发布构建和启动器 dry-run。
  4. 提交、推送并发布 `v0.0.0.6-a` prerelease，核验资产后写入记忆。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-20T21:41:10 | 确认官方菜单规范并要求菜单项 `label`，生成任务 hash。 |
| 2026-08-20T21:42:00 | 为扩展菜单项补充 `label` 并新增回归断言，升级版本号。 |
| 2026-08-20T21:43:00 | `npm run verify`、Windows 发布构建与启动器 dry-run 通过。 |
| 2026-08-20T21:43:20 | 提交 `71b03fe` 并推送 master 与 `v0.0.0.6-a` 标签。 |
| 2026-08-20T21:44:17 | GitHub Actions Release run `32375891360` 完成，结论 `success`。 |
| 2026-08-20T21:44:37 | GitHub API 确认 prerelease 与 Windows zip 资产 `uploaded`，更新记忆。 |

- 结果：`Open CLI` 与 `Overlay` 子菜单现在带官方必填 `label`，不再显示 `undefined`。`npm run verify`（20 通过、1 个按环境跳过）、文档检查 55/0、Windows 单文件发布构建与 EXE/脚本 dry-run 均通过。远程 `master` 与 `v0.0.0.6-a` 指向 `71b03fe`，Release 资产 `cocos-agent-v0.0.0.6-a-windows.zip` 大小 84,879,106 bytes。
- 文件：
  - `extensions/cocos-agent/package.json`、`examples/cocos3d-demo/extensions/cocos-agent/package.json`
  - `cli/src/tests/extension.test.ts`
  - `VERSION`、npm/Cocos manifest、`CHANGELOG.md`、约束文档、`TODO.md`
- 后续：安装 `v0.0.0.6-a` release zip 后在 Cocos Creator 中确认 `Cocos Agent -> Open CLI/Overlay` 子菜单可正常点击并打开面板。
