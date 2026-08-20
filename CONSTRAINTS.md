# 全局约束系统

版本：`CS-1.0`  
生效范围：本仓库及由本仓库驱动的全部 Cocos 项目。

## 文档层级

```text
官方 Cocos Creator 规范
  └─ 项目级约束（docs/constraints/PROJECT-<name>.md）
      └─ 平台/语言约束（Cocos Creator、TypeScript、JavaScript）
          └─ 全局约束（本文件）
              └─ 惯例与风格
```

冲突时，按从上到下的优先级裁决：官方规范 > 项目级约束 > 语言约束 > 全局约束 > 惯例。

## 全局约束

### G-01 官方规范优先

- 本项目完全基于 Cocos Creator 3D 官方规范开发。
- 使用官方 API、编辑器扩展协议、资源格式与构建流程。
- 不得用自定义脚本替换官方编辑器能力；存在官方方案时必须使用官方方案。
- 官方文档见 `docs/constraints/cocos-creator.md`。

### G-02 UTC+8 时间

- 全局采用 UTC+8，即 Asia/Hong_Kong。
- 文档、日志、记忆、任务记录中的时间格式统一为 `YYYY-MM-DDTHH:mm:ss+08:00`。
- 禁止混用其他时区时间；系统日志如使用 UTC 必须显式标注并换算。

### G-03 访问范围

- Agent 的读写范围限制为“当前 Cocos 项目根目录”。
- 项目根目录优先取 `COCOS_AGENT_PROJECT_ROOT`，其次自动探测。
- 所有路径必须经过 sandbox 校验，越界读写直接拒绝。
- 素材库访问、Scene 读写、OCR 输出均不得超出项目根目录。

### G-04 WorkFlow

- 所有 Agent 执行必须遵循 `WORKFLOW.md` 的阶段与门禁。
- 禁止跳过 WF-02（计划）、WF-04（验证）、WF-06（记忆写入）。

### G-05 任务 hash

- 每次执行必须按 `HASH.md` 计算任务 hash。
- 记忆条目、日志与 TODO 中必须携带任务 hash。

### G-06 记忆

- 每一次执行结果必须写入 `LONG_MEMORY.md`。
- `SHORT_MEMORY.md` 必须保持最近 10 次执行，最新在前。
- 记忆内容必须包含：请求、推理、计划、时间线（UTC+8）、结果、任务 hash。

### G-07 TODO 管理

- 全局任务统一在 `TODO.md` 中跟踪。
- TODO.md 必须覆盖本仓库所有 `.md` 文档中的约束内容。
- 任务状态变更时同步更新 TODO.md。

### G-08 代码审查

- 代码变更必须按 `CODE_REVIEW.md` 审查。
- 未通过门禁的变更不得标记完成。

### G-09 语言

- 游戏逻辑、编辑器扩展与工具默认使用 TypeScript。
- 允许 JavaScript 用于 Cocos 扩展面板、脚本与快速工具。
- 语言级约束见 `docs/constraints/typescript.md` 与 `docs/constraints/javascript.md`。

### G-10 项目结构

- Cocos 资源遵循 Creator 项目目录结构：`assets/`、`extensions/`、`settings/` 等。
- 场景、预制体、材质、模型等资产不得破坏官方 JSON 结构。

### G-11 安全

- 不在仓库中提交密钥、Token、鉴权文件。
- 网络连接仅允许已配置的网关与本地桥接地址。
- 外部命令执行必须经过参数校验，防止路径注入。

### G-12 Skills 与 MCP

- 工具能力优先通过 `skills/` 与 `mcp/` 暴露。
- MCP 工具调用必须执行 sandbox 校验。
- Skills 使用范围与输出格式见各 SKILL.md。

### G-13 编辑纪律

- 使用 apply_patch 或等效受控方式编辑文件。
- 禁止破坏性命令；保留用户已有修改。
- 不执行未授权的递归删除、reset、checkout。

### G-14 验证

- 变更必须附带可复现的验证结果。
- TypeScript 必须通过严格编译；CLI 必须实际运行验证。

### G-15 版本

- 全局版本固定为 `v0.0.0.8-a`，以根目录 `VERSION` 为唯一来源。
- npm 包与 Cocos 扩展使用合法 semver `0.0.8-a`，并在 manifest 的 `cocosAgentVersion` 中保留全局版本。
- 版本变更必须更新 `VERSION`、CLI、扩展、项目约束、TODO 与记忆记录。

## 项目级约束

每个 Cocos 项目生成独立约束文件：

```text
docs/constraints/PROJECT-<项目名>.md
```

项目级约束必须包含：

- 项目目标与范围。
- Cocos Creator 版本与引擎能力边界。
- 场景/目录/命名约定。
- 素材库访问策略（仅当前项目）。
- 允许使用的 Skills、MCP 与网络端点。
- 禁止事项（越界访问、未授权导入等）。

模板见 [templates/PROJECT_CONSTRAINTS.md](templates/PROJECT_CONSTRAINTS.md)。

## 约束索引

| 编号 | 主题 | 文档 |
| --- | --- | --- |
| G-01 | 官方规范 | [cocos-creator.md](docs/constraints/cocos-creator.md) |
| G-02 | UTC+8 | [WORKFLOW.md](WORKFLOW.md) |
| G-03 | 访问范围 | [project-scope.md](docs/constraints/project-scope.md) |
| G-04 | WorkFlow | [WORKFLOW.md](WORKFLOW.md) |
| G-05 | 任务 hash | [HASH.md](HASH.md) |
| G-06 | 记忆 | [LONG_MEMORY.md](LONG_MEMORY.md) |
| G-07 | TODO | [TODO.md](TODO.md) |
| G-08 | 审查 | [CODE_REVIEW.md](CODE_REVIEW.md) |
| G-09 | 语言 | [typescript.md](docs/constraints/typescript.md)、[javascript.md](docs/constraints/javascript.md) |
| G-10 | 项目结构 | [cocos-creator.md](docs/constraints/cocos-creator.md) |
| G-11 | 安全 | [project-scope.md](docs/constraints/project-scope.md) |
| G-12 | Skills/MCP | [skills/](skills/)、[mcp/](mcp/) |
| G-13 | 编辑纪律 | 本文件 |
| G-14 | 验证 | [CODE_REVIEW.md](CODE_REVIEW.md) |
| G-15 | 版本 | [VERSION](VERSION) |
