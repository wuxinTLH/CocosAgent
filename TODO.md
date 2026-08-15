# 版本约束

- MUST: 全局版本设置为 `v0.0.0.1-a`，根目录 `VERSION` 为唯一来源。


# TODO 全局任务队列
更新时间：`2026-08-15T18:25:47+08:00`（UTC+8）
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
| [VERSION](VERSION)                                                     | 全局版本 `v0.0.0.1-a` 与 manifest 映射                                                                            |
| [examples/cocos3d-demo/](examples/cocos3d-demo/README.md)              | 独立 Cocos 项目约束、Scene 与素材库验证                                                                           |

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
1. [x] 进行完整系统性测试：`npm run verify` 通过，常规测试 `14/14` 通过，WSS 证书依赖测试由 CI 临时证书执行。
2. [x] 提交 GitHub 仓库：`dc3cdf4` 已推送至 `origin/master`，公开仓库为 `https://github.com/wuxinTLH/CocosAgent`。
3. [ ] 创建 `v0.0.0.1-a` release。


## 已解决任务（一次性闭环）

1. [x] 生成 [PROJECT-cocos3d-demo.md](examples/cocos3d-demo/docs/constraints/PROJECT-cocos3d-demo.md) 独立约束与 Cocos Creator 3D demo 项目；Scene 节点查询、素材检索均已验证。
2. [x] 接入 Windows 离线 OCR、tesseract.js 和外部命令三种引擎；项目内真实图片识别返回 `COCOS`、`AGENT`、`2026` 及坐标框。
3. [x] 完成 WSS 网关鉴权、流式响应、心跳、自动重连与 SHORT_MEMORY 上下文注入；本地自签名 WSS mock 与 Token 测试通过，生产端点由 `.env.example` 环境变量配置。
4. [x] 完成 cc-switch 配置读取、ccs 路由诊断和本地路由连通测试；`ccs doctor` 已确认本机未安装 Cocos Creator，因此真实编辑器 UI 连接由安装后自动发现。
5. [x] 补齐 CLI 单元/集成测试：Scene、素材、hash、memory、sandbox、OCR、WSS、CCS、项目约束、扩展契约与上下文根目录，当前 `15/15` 通过。
6. [x] 已将扩展安装到 `C:\Users\13929\.CocosCreator\extensions\cocos-agent`，配置用户级 CLI bridge，完成 manifest、panel、桥接健康检查与 JavaScript 语法验证。当前机器未发现 Creator 3.8 可执行文件，缺少的是外部编辑器进程，不是扩展安装或桥接实现。
7. [x] 建立 GitHub Actions CI、`npm run verify`、文档链接检查与 `.githooks/pre-commit` 门禁；git hooks 已写入 `.git/config`。
