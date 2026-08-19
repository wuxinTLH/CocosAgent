# 版本约束

- MUST: 全局版本设置为 `v0.0.0.3-a`，根目录 `VERSION` 为唯一来源。


# TODO 全局任务队列
更新时间：`2026-08-19T22:22:50+08:00`（UTC+8）
说明：所有 Agent 执行必须以本文件为全局任务入口；任务完成前更新状态，完成后写入 LONG_MEMORY 与 SHORT_MEMORY。

## 约束覆盖声明

本文件作为全局任务执行器，覆盖以下全部 `.md` 文档中的约束。任何任务不得违反下表约束。

| 文档                                                                   | 必须覆盖的约束                                                                                                    |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [WORKFLOW.md](WORKFLOW.md)                                             | WF-00 至 WF-07 阶段与门禁；任务 hash；记忆写入；收尾汇报                                                          |
| [CONSTRAINTS.md](CONSTRAINTS.md)                                       | 官方规范优先；UTC+8；访问范围；WorkFlow；hash；记忆；TODO；审查；语言；项目结构；安全；Skills/MCP；编辑纪律；验证 |
| [CODE_REVIEW.md](CODE_REVIEW.md)                                       | P0-P3 分级；审查清单；审查输出；门禁                                                                              |
| [HASH.md](HASH.md)                                                     | SHA-256 规范；规范化 JSON；hash 记录                                                                              |
| [LONG_MEMORY.md](LONG_MEMORY.md)                                       | 每次执行追加；包含推理、计划、时间线、hash                                                                        |
| [SHORT_MEMORY.md](SHORT_MEMORY.md)                                     | 保持最近 10 次；最新在前                                                                                          |
| [docs/constraints/cocos-creator.md](docs/constraints/cocos-creator.md) | 官方资源结构；组件生命周期；编辑器扩展协议；构建流程                                                              |
| [docs/constraints/typescript.md](docs/constraints/typescript.md)       | strict；禁止 any；命名；Cocos 装饰器；测试                                                                        |
| [docs/constraints/javascript.md](docs/constraints/javascript.md)       | 现代语法；严格模式；JSDoc；扩展模板                                                                               |
| [docs/constraints/project-scope.md](docs/constraints/project-scope.md) | 当前项目判定；sandbox；越界拒绝                                                                                   |
| [templates/PROJECT_CONSTRAINTS.md](templates/PROJECT_CONSTRAINTS.md)   | 新项目必须生成独立约束                                                                                            |
| [skills/](skills/) 各 SKILL.md                                         | 各 Skill 的输入、输出、范围与集成方式                                                                             |
| [mcp/](mcp/)                                                           | MCP 服务启动、工具列表、sandbox                                                                                   |
| [cli/](cli/README.md)                                                  | CLI 构建、运行、验证                                                                                              |
| [extensions/cocos-agent/](extensions/cocos-agent/README.md)            | Cocos 扩展安装、CLI 窗口连接                                                                                      |
| [VERSION](VERSION)                                                     | 全局版本 `v0.0.0.3-a` 与 manifest 映射                                                                            |
| [examples/cocos3d-demo/](examples/cocos3d-demo/README.md)              | 独立 Cocos 项目约束、Scene 与素材库验证                                                                           |
| [launcher/](launcher/)                                                 | Windows 一键启动、项目扩展安装、Overlay 打开与 Creator 探测                                                       |

## 全局任务队列

### 已完成

- [x] 建立 WorkFlow 工作流文档（WF-1.0）。
- [x] 建立全局约束系统与语言/项目约束文档。
- [x] 建立代码审查规范（P0-P3）。
- [x] 建立任务 hash 规范（SHA-256）。
- [x] 建立 TODO、LONG_MEMORY、SHORT_MEMORY 并写入首条执行记录。
- [x] 建立 Skills：OCR、Scene、素材库、cc-switch、长连接对话。
- [x] 建立 MCP 配置与 MCP 服务入口。
- [x] 建立 TypeScript CLI 骨架。
- [x] 建立 Cocos Creator 扩展骨架（编辑器内 CLI 窗口）。
- [x] 构建 CLI 并验证 status/hash/scene/assets/sandbox/MCP/桥接。
- [x] 将 5 个 Skills 安装到本机 Codex 目录。


## 风险与注意

- 访问范围必须始终限制在当前 Cocos 项目内。
- 时间记录统一 UTC+8。
- 每次执行必须携带任务 hash。
- 外部 OCR/网关能力未配置时，CLI 必须给出明确错误而不是静默成功。

## 记忆入口

- 长期记忆：[LONG_MEMORY.md](LONG_MEMORY.md)
- 短期记忆：[SHORT_MEMORY.md](SHORT_MEMORY.md)


# 任务队列

## 代办列表
1. [x] 修复 `CocosAgentOverlay.exe` 无法打开 Cocos Agent UI 且无错误提示：改用官方 `dockable` 面板、等待扩展 `ready/error` 状态回执、记录启动日志并显示失败窗口；兼容 `-ProjectRoot` 参数。

本轮任务 hash：`sha256:1463191d8e8171e4c298b65589356570364a38072e2ac488f8f1d58da2340175`


## 已解决任务（一次性闭环）

8. [x] 完成 Cocos 原生 UI 一键覆盖能力：扩展自动打开 Overlay，Windows 启动器和 Release zip 已接入发布流程。

9. [x] 完成多模型、i18n、会话工作区、权限模式、Windows Terminal/CMD、MCP/Skills 增强；npm run verify、MCP initialize/tools/list、回退/权限/终端单测均已通过。

## 本轮收尾结果

- [x] `cocos-animation` Skill 已安装到本机 Codex Skills 目录，动画 MCP 四工具已通过 `initialize` 与 `tools/list` 发现验证。
- [x] 文档字面量换行已修复，`git diff --check` 通过。
- [x] TypeScript/JavaScript 检查、21 项测试（20 通过、1 个按环境跳过）与 Windows Release 构建已完成；真实 Cocos Creator UI 烟测因本机未安装 Creator 保留为环境条件项。
- [x] 详细记录已追加到 `LONG_MEMORY.md`，最近记录已同步到 `SHORT_MEMORY.md`。
- [x] GitHub Actions Release 已成功完成，`v0.0.0.2-a` prerelease 及 Windows zip 资产已上传。
- [x] `v0.0.0.3-a` 已完成启动器、扩展与 Release workflow 的本地验证；真实 Creator UI 烟测等待安装 Creator 的环境执行。
