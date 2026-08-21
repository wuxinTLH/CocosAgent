# LONG_MEMORY 长期记忆

规则：

- 每一次 Agent 执行完成后必须追加一条记录。
- 每条记录包含：请求、推理、计划、时间线（UTC+8）、任务 hash、结果。
- 记录只追加、不删除；修正错误时追加修正记录。
- 任务 hash 按 [HASH.md](HASH.md) 计算。

## 发布记忆基线

- 旧 prerelease、Release 资产及 `v0.0.0.1-a` 至 `v0.0.0.8-a` 标签已按任务要求清理。
- 版本与 Release 记忆从 `v0.0.0.1-a` 重新建立；仓库提交历史保留，作为可审计的开发历史。

## 执行记录

### AGT-20260821-002

- TaskHash：`sha256:29c6cbd338c99522105b234a7f82114ce5a4889962b28ee26eedb70ac5184a72`
- 开始：`2026-08-21T22:07:59+08:00`
- 结束：`2026-08-21T22:08:46+08:00`
- 请求：根据 TODO.md 完成剩余任务并收口上一轮 Cocos Agent 面板、中文配置、C/C++ 与数学优化实现。
- 推理：TODO 的功能项已经闭环，但代码和文档仍未提交。应按 WorkFlow 重新审查当前 diff，验证 CLI、扩展契约、文档、安全和实际 math_analyze 命令，再把成果提交到现有 master；不修改外部测试项目或历史 Release。
- 计划：读取约束与 TODO；执行代码审查和完整验证；更新 TODO、LONG_MEMORY、SHORT_MEMORY；提交并推送 master；核验远程状态。
- 时间线：2026-08-21T22:07:59 读取约束、TODO 和工作区状态；22:08:20 运行完整 CLI 验证、数学分析命令和敏感信息扫描；22:08:46 生成任务 hash 并完成账本更新，准备提交推送。
- 结果：当前 TODO 无新增待办；上一轮三项任务成果已完成最终审查。`npm run verify` 通过，24 项测试通过、1 项按环境跳过，文档检查 58/0；`math analyze --path cli/src/math.ts` 实际返回 Transform/Ray 分析结果；敏感信息扫描通过。代码审查结论：P0=0、P1=0、P2=0、P3=0。

### AGT-20260821-001

- TaskHash：`sha256:5eb48e7504266f091968712c98433291ee9ba8a623044162a258cf940b76d5de`
- 开始：`2026-08-21T21:44:00+08:00`
- 结束：`2026-08-21T22:00:52+08:00`
- 请求：根据 TODO.md 的约束一次性完成剩余任务：修复 Cocos Creator 面板初始化错误，默认中文配置，增加 C/C++ 接入和 Transform/Ray 等高等数学代码优化能力。
- 推理：Creator 面板 DOM 不应依赖全局 document；需要优先使用面板提供的 `$` 映射和 panel/shadow 根节点，并在延迟挂载时保护事件绑定。中文配置应沿用现有 `agent_config.locale`，避免引入第二套状态。数学优化应采用当前项目内只读扫描，输出可审查建议而不是自动改写 Cocos 引擎或用户代码；C/C++ 接入必须限于项目目录并遵循 Cocos Native/CMake 官方路径。
- 计划：修复根扩展与 demo 扩展；加入中文 locale；新增 native-math-optimization Skill、math_analyze CLI/MCP 工具和测试；更新约束、TODO 与记忆并验证。
- 时间线：2026-08-21T21:44:00 读取约束；21:48 完成面板根节点查询保护并同步 demo；21:51 完成中文 locale 与 math analyze 命令；21:55 完成数学模块、MCP、Skill 和 C/C++ 接入文档；21:58 通过类型检查和扩展测试；22:00:52 完成 verify、TODO 和记忆收口。
- 结果：三项剩余 TODO 已闭环。面板不再直接调用 `document.getElementById`，缺失节点不会触发 `addEventListener` 空引用；Open CLI 默认中文并持久化 locale；`math_analyze` 扫描当前项目 `assets/`、`native/`、`plugins/` 中的 TypeScript、JavaScript、C/C++，报告 Transform、Mat4 求逆、Ray/AABB、向量、normalize、sqrt 优化候选。验证为 24 通过、1 跳过，文档检查 56/0，未发现 P0/P1。

### AGT-20260820-001

- TaskHash：`sha256:9a1ccc6e8a4c31c95dd7aabfd70cd2008fd0a4f4fbf85824a2fcf83b7b8f574e`
- 开始：`2026-08-20T22:22:25+08:00`
- 结束：`2026-08-20T22:37:12+08:00`
- 请求：简化 Cocos Agent CLI 模型与 cc-switch 配置，清理历史 Release 并从 `v0.0.0.1-a` 重建。
- 推理：CLI 面板已能打开，但此前把模型、端点、回退链与 cc-switch 配置暴露为命令行参数，操作成本过高。底层已支持 OpenAI、Anthropic、DeepSeek、Kimi、Qwen、Gateway 与 ccs；应提供表单入口，同时保持凭据只从环境变量读取。Release 重建要求清理旧线上资产、标签与发布记忆，而保留 Git 提交历史用于审计。
- 计划：
  1. 将 CLI 面板改为提供商、模型、端点、默认/回退渠道和 cc-switch 的表单式配置界面。
  2. 新增 `ccs_doctor` bridge/MCP 工具与回归测试。
  3. 清理 GitHub Release、资产和旧版本标签，将版本重置为 `v0.0.0.1-a`。
  4. 完整验证后重新创建 `v0.0.0.1-a` Release，并写入新的发布基线。
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
| 2026-08-20T22:22:25 | 读取 TODO，计算任务 hash，确认配置易用性与 Release 重建任务。 |
| 2026-08-20T22:23:00 | 实现模型提供商、工作区回退链、cc-switch 诊断与连接表单。 |
| 2026-08-20T22:24:00 | 通过 GitHub API 删除旧 Release 与 Windows 资产。 |
| 2026-08-20T22:24:30 | 删除远程与本地 `v0.0.0.1-a` 至 `v0.0.0.8-a` 标签。 |
| 2026-08-20T22:29:00 | `npm run verify` 通过；cc-switch 诊断和非敏感模型配置均通过默认权限桥接实测。 |
| 2026-08-20T22:32:20 | 刷新本机扩展，准备提交并重建唯一 `v0.0.0.1-a` Release。 |
| 2026-08-20T22:33:00 | 推送基线提交 `befbb79`，创建新的 `v0.0.0.1-a` 标签。 |
| 2026-08-20T22:35:42 | GitHub Actions Release run `32380856246` 完成，结论 `success`。 |
| 2026-08-20T22:37:12 | 核验新的 prerelease 与 Windows zip 资产，更新记忆。 |

- 结果：Open CLI 已提供模型和 cc-switch 的表单式配置，OpenAI、Anthropic、DeepSeek、Kimi、Qwen、Gateway 的端点/模型、默认提供商和回退链可直接保存；cc-switch 读取 `CC_SWITCH_CONFIG` 或 `~/.cc-switch/settings.json` 并可诊断/连接路由。API Key/Token 不会由 UI 写入，仅读取环境变量。完整验证为 23 通过、1 项按环境跳过，文档检查 55/0，Windows 单文件启动器构建与 dry-run 通过。旧 Release/资产和旧标签已清理；新的唯一 `v0.0.0.1-a` Release 指向 `befbb79`，资产 `cocos-agent-v0.0.0.1-a-windows.zip` 状态 `uploaded`，大小 84,872,903 bytes。
