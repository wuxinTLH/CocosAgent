# 版本约束

- MUST: 全局版本设置为 `v0.0.0.1-a`，根目录 `VERSION` 为唯一来源。
- MSUT: 测试项目位置: "C:\\Users\\13929\\NewProject"

# TODO 全局任务队列
更新时间：`2026-10-27T18:27:00+08:00`（UTC+8）
说明：所有 Agent 执行必须以本文件为全局任务入口；任务完成前更新状态，完成后写入 LONG_MEMORY 与 SHORT_MEMORY。

## 约束覆盖声明

本文件作为全局任务执行器，覆盖以下全部 `.md` 文档中的约束。任何任务不得违反下表约束。

| 文档                                                                     | 必须覆盖的约束                                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [WORKFLOW.md](WORKFLOW.md)                                               | WF-00 至 WF-07 阶段与门禁；任务 hash；记忆写入；收尾汇报                                                          |
| [CONSTRAINTS.md](CONSTRAINTS.md)                                         | 官方规范优先；UTC+8；访问范围；WorkFlow；hash；记忆；TODO；审查；语言；项目结构；安全；Skills/MCP；编辑纪律；验证 |
| [CODE_REVIEW.md](CODE_REVIEW.md)                                         | P0-P3 分级；审查清单；审查输出；门禁                                                                              |
| [HASH.md](HASH.md)                                                       | SHA-256 规范；规范化 JSON；hash 记录                                                                              |
| [LONG_MEMORY.md](LONG_MEMORY.md)                                         | 每次执行追加；包含推理、计划、时间线、hash                                                                        |
| [SHORT_MEMORY.md](SHORT_MEMORY.md)                                       | 保持最近 10 次；最新在前                                                                                          |
| [docs/constraints/cocos-creator.md](docs/constraints/cocos-creator.md)   | 官方资源结构；组件生命周期；编辑器扩展协议；构建流程                                                              |
| [docs/constraints/typescript.md](docs/constraints/typescript.md)         | strict；禁止 any；命名；Cocos 装饰器；测试                                                                        |
| [docs/constraints/javascript.md](docs/constraints/javascript.md)         | 现代语法；严格模式；JSDoc；扩展模板                                                                               |
| [docs/constraints/project-scope.md](docs/constraints/project-scope.md)   | 当前项目判定；sandbox；越界拒绝                                                                                   |
| [templates/PROJECT_CONSTRAINTS.md](templates/PROJECT_CONSTRAINTS.md)     | 新项目必须生成独立约束                                                                                            |
| [docs/native-library-integration.md](docs/native-library-integration.md) | C/C++ 原生库、CMake、平台架构与数值验证约束                                                                       |
| [skills/](skills/) 各 SKILL.md                                           | 各 Skill 的输入、输出、范围与集成方式                                                                             |
| [mcp/](mcp/)                                                             | MCP 服务启动、工具列表、sandbox                                                                                   |
| [cli/](cli/README.md)                                                    | CLI 构建、运行、验证                                                                                              |
| [extensions/cocos-agent/](extensions/cocos-agent/README.md)              | Cocos 扩展安装、CLI 窗口连接                                                                                      |
| [VERSION](VERSION)                                                       | 全局版本 `v0.0.0.1-a` 与 manifest 映射                                                                            |
| [examples/cocos3d-demo/](examples/cocos3d-demo/README.md)                | 独立 Cocos 项目约束、Scene 与素材库验证                                                                           |
| [launcher/](launcher/)                                                   | Windows 一键启动、项目扩展安装、Overlay 打开与 Creator 探测                                                       |

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

## 任务约束
- MUST: 只有提到需要提交release时才提交release,否则只提交版本
- MUST: 每次任务完成时,根据"测试项目位置"进行验证代码可行性

# 任务队列

## 待办任务

- [进行中] 修复 GitHub CI 的跨平台凭据测试，重新推送并构建更新 `v0.0.0.1-a` Release；核验 CI、标签与 Windows 资产。TaskHash: `sha256:af655a696f70f725cb31c34d55eb75afe99a27089fd26cd8e81e22f09fa545aa`。

1. [x] 更新文档、验证指定 NewProject 并完成提交前审查；本条随累计功能提交至 GitHub，远端结果以 Git 历史及执行回执为准。版本保持 `v0.0.0.1-a`，不创建 Release。
   - 最终验证：20 个测试文件、TypeScript strict、8 个 JS 文件、60 篇文档／0 问题；指定 NewProject 同步、CLI status 与 Creator 3.8.8 dry-run 通过。
   - 审查修复：自主场景写入增加根结构与本地引用校验，无效输入不会覆盖现有资源；无其他确认 P0/P1/P2。
   - TaskHash: `sha256:b1f5ba82b88678744501fa2be0aa3348b683e59880c72e7978640971de012a11`。
   - 已知限制（独立记录，不以文档提交掩盖）：最近实机扩展桥接未持续监听，独立桥接查询返回 `EDITOR_NOT_CONNECTED`；真实云端模型与本轮逐项人工交互尚未验收。


### Agent 模式与会话操作完善（2026-10-25，已实现）

- [x] 已添加自定义模型可确认删除，清理凭据与会话引用；预检损坏会话，写入失败尽力恢复配置、会话与加密凭据。
- [x] 仅保留 Agent 模式；提供有限权限／完整权限，新配置默认有限权限，提权由用户显式确认；模型与 MCP 不可调用授权入口。
- [x] 保留脱敏 API 错误详情、HTTP 状态与网络原因，支持界面文字自由选择及消息复制。
- [x] 提供上下文回滚与上下键输入历史导航；回滚不撤销项目写入，校验所选消息内容及时间，拒绝跨面板过期操作；输入历史兼容 IME、多行与草稿恢复。
- [x] 完成回归与审查修复：20 个测试文件、TypeScript strict、9 个 JS 文件、文档 58/0 通过；指定 NewProject 同步、CLI status 与 Creator 3.8.8 dry-run 通过，已更新记忆。本轮未重新打开 Creator 目视验证七项操作，也未用真实云端密钥验收。

本轮任务 hash：`sha256:d1c3a1ba48b4fa9525ea2f69ad8a98b28b88e4a49bba8098d8ca0c807cda55e8`。

### IDE 聊天界面与可执行 Cocos Agent（2026-10-25，已实现）

- [x] 移除高级设置及固定未配置服务商；已存模型选择与二级添加／编辑界面，采用紧凑 IDE 聊天布局。
- [x] 添加带确认的对话删除；删除当前／最后／默认对话后安全建立可用会话，保留其他对话。
- [x] 实现有次数与范围限制的模型工具循环，支持项目场景／脚本读写及测试，严格执行权限，不允许模型管理密钥或自提权，展示工具结果。
- [x] 完成回归、完整验证、代码审查及 NewProject/Creator 实机验证：19 个测试文件、严格类型、9 个 JS 文件、文档 58/0 通过；NewProject 最终同步成功，实时查询返回 Scene/Main Light/Main Camera、dirty=false。修复审查确认的 Origin:null 网页跨源调用风险并补回归。模型三种协议的工具循环通过本地 HTTP 端点测试；不把它当成外部云端模型的全链路验收，也不声称已实机执行任意生成／调试任务。

本轮任务 hash：`sha256:2fa7465888e5fbf445e79b315a4722af65ac9087b3453c878b0499417c04df95`。

### 简化模型 API 连接（2026-10-24，已实现）

- [x] 参照 Novel Agent 将模型切换与新增／修改连接分开；统一 Base URL、协议、模型 ID 与 API Key 表单，保存后自动切换当前对话模型，保留原有安全存储及 Creator 会话能力。
- [x] 补齐交互回归，`npm run verify` 通过 16 个测试文件、TypeScript strict、8 个 JS 文件检查、文档 58/0；指定 `C:\Users\13929\NewProject` 同步测试成功，根／示例／项目面板字节一致。审查反馈的工作区配置响应顺序、自然语言命令误判和当前对话历史刷新问题均已修复并补回归。
- [ ] 无真实供应商密钥，外部模型回答未做端到端验证；本轮仅 dry-run 同步，没有重新打开 Creator 目视验证新设置界面。

本轮任务 hash：`sha256:c9baff05826c15320bb5d16a62b56f9a80f1d311ec6606ff2096e0e331a00d87`。

### API Key 与自定义第三方服务商配置（2026-10-24，已实现）

- [x] Creator 面板在设置内提供密钥添加/清除，不在界面或桥接响应回显；Windows 当前用户 DPAPI 加密存储于用户目录，环境变量优先。
- [x] 新增自定义 OpenAI 兼容服务商（名称、端点、模型、协议与可选 API Key），可加入快捷切换和会话选择。
- [x] 增加 CLI/桥接回归测试：`npm run verify` 通过 16 个测试文件、严格类型与 8 个 JS 文件检查、文档 58/0；指定 NewProject 同步及安装 CLI status 成功，面板字节一致，新桥接 `provider_list` 成功。未输入真实供应商密钥，也未对新界面做本轮 Creator 人工目视测试。

本轮任务 hash：`sha256:16c14d13208bf50dc1fec8771f80c746621df49142cd8d450ffd4d06eb6e49b4`。

### Creator 3.8.8 实机面板验证（2026-10-24）

- [x] 在指定 `C:\Users\13929\NewProject` 启动 Creator 3.8.8；项目扩展与仓库面板字节一致，Overlay 状态 `ready`，面板显示“已连接”。
- [x] 目视核验新版布局：对话/模型快捷切换与底部输入区常驻；设置和诊断默认折叠；实际点击设置切换、展开诊断。
- [x] 在 Creator 面板中输入并执行 `/status`；诊断记录显示项目根 `C:/Users/13929/NewProject`、版本 `v0.0.0.1-a`；新对话按钮创建并切换成功，本地桥接 `status/provider_list/workspace_list/ccs_doctor` 全部响应成功。
- [ ] 无模型供应商密钥，真实外部模型聊天暂未验证；取得密钥后需单独验证端到端对话。

本轮实机验证任务 hash：`sha256:acfa033d73b047b665ca1f13020c3933184327f7c27c5b69298f6fa3bc1b917f`。

- [x] 根据 Novel Agent 的信息架构简化 Creator 的 Open CLI：对话与模型快捷切换保持常驻，配置及诊断按需展开；保留历史命令、协议配置、工作区和 cc-switch 操作。

### 对话优先面板重设计（2026-10-24）

- [x] 主面板显示当前对话/新对话、快捷模型选择、对话记录和固定输入区；普通输入直接聊天，Enter 发送、Shift+Enter 换行，`/` 命令与旧格式 `status`、`chat 你好` 等继续可用。
- [x] 将模型渠道、工作区和 cc-switch 收纳进“设置”；诊断记录默认收起，自动健康检查不再填满聊天界面。
- [x] 修正审查发现的会话加载和快速切换竞态：加载中阻止发送与新建/切换冲突，忽略过期列表响应；保持日志和 API 错误显示。
- [x] 根扩展、示例镜像及 `C:\Users\13929\NewProject` 同步；Creator 3.8.8 dry-run 与项目 CLI/status 检查通过。原任务当时未实际打开 Creator；后续实机验证见下方记录。
- [x] `cd cli && npm run verify` 通过：15 个测试文件、严格类型检查、JavaScript 检查、文档检查 58/0；扩展交互测试 3/3 包括对话发送/设置展开/会话与模型切换；`git diff --check` 通过。

本轮任务 hash：`sha256:55d4db8268a180bfe68a66014eba2fc5244d3f6b3864c8ac6217c456da7f7d9b`。

1. [x] 根据 Novel Agent 的连接方式完善 Cocos Agent 的模型 API 连接：OpenAI 兼容提供商支持 Chat Completions/Responses 协议选择；配置持久化并通过 CLI、MCP 和 Cocos 面板透传；限制安全端点、禁止自动重定向、提供商响应失败/拒绝/截断/空输出给出明确诊断；Anthropic 与 Gateway 保持各自协议。

### 本轮实现与验证（2026-10-24）

- [x] CLI 配置、工具 schema、命令行 `provider configure --protocol`、提供商目录和 Cocos 面板已支持协议选择。
- [x] OpenAI-compatible Responses 解析、Chat Completions 兼容路径、Anthropic 空响应/截断、HTTP/网络/重定向错误和敏感信息不回显已覆盖回归测试。
- [x] 提供商端点仅允许 HTTPS 或 loopback HTTP；禁止 URL 凭据、查询、片段；请求设置 `redirect: 'error'`。
- [x] `cd cli && npm run verify` 通过：TypeScript strict、JavaScript 检查（8 文件）、15 个测试文件（全部通过）、文档链接 58/0。
- [x] `cd cli && npm run test:local-project -- --ProjectRoot 'C:\\Users\\13929\\NewProject'` 通过：CLI status、版本 `v0.0.0.1-a`、项目同步及 Creator 3.8.8 dry-run 均正常；使用授权的 Creator 3.8.8 实际启动该项目，Overlay 状态报告 `ready`；根扩展、示例及 NewProject 的 Panel 内容一致。`E:\\CocosDashboard` 是 Dashboard 安装目录而非 Cocos 项目，不向其同步扩展。
- [x] 代码审查：P0=0、P1=0、P2=0；已修复 HTTP 非成功响应体未取消及 Responses 助手消息非完成状态误判。`git diff --check` 通过；历史审查插件部分分组耗尽 reader budget，最终以实际编译、测试、Creator 启动和人工差异复核补充。无供应商密钥，因此未执行真实外部模型认证/聊天请求。

本轮任务 hash：`sha256:c3de863f081f24bcd010e6750a4b543445b00e024dce2803419f2f4e1d1ce9c1`（开始 `2026-10-24T19:51:05+08:00`，请求：根据 TODO.md 待办，参照 Novel Agent 完善 Cocos Agent 模型 API 连接，并验证 Cocos Creator 集成）。

### 历史方案与验证

- [x] `normalizeCcsUrl` 支持 `127.0.0.1:15721` 和带路径的裸 `host:port`，统一规范化为 HTTP URL。
- [x] 新增裸端点规范化回归测试，保留 HTTP 404 可达性和 WS/WSS 测试。

本轮任务 hash：`sha256:d938bb20368ebb9969497dc2488f5c46c5f4fe63df31ce43167e09c76be650c6`。

- [x] `ccs_connect` 区分 HTTP 服务可达与网络不可达：任何 HTTP 响应（包括 404）返回 `status: connected`、`transport: http` 和 `httpStatus`。
- [x] 新增 HTTP 404 可达性回归测试，保留 WS/WSS 连接检测和环境变量覆盖。

本轮任务 hash：`sha256:f6311ea8994564b5159151dde3d7b87688a7f66e130778b57cace0bb47012ab6`。

- [x] 新增 Panel/Overlay 日志复制控件、剪贴板 API 与兼容回退实现，扩展契约测试覆盖真实按钮 dispatch。
- [x] ccs doctor 默认返回 `http://127.0.0.1:15721`，ccs connect 支持 HTTP/WS 端点并保留环境变量覆盖。

本轮任务 hash：`sha256:2381b5639e007fbc8e2dc40ef4b24c72e44be3fa440ede9c6ded5f8387252790`。

- [x] 参考 Cocos Creator 3.8.8 官方 `html-panel` 模板：使用 `Editor.Panel.define({ $, ready, beforeClose, close })` 生命周期和 `$` 控件映射。
- [x] Panel/Overlay 使用控件级 `click`、`submit`、`change` 监听；根节点委托只作为没有可靠控件映射时的回退。
- [x] 扩展契约测试覆盖 `$` 映射、真实按钮 dispatch、Bridge 请求发送和销毁清理。
- [x] 根扩展、`examples/cocos3d-demo` 与 `C:\Users\13929\NewProject` 已同步。
- [x] `cd cli; npm run verify`：14 个测试文件通过，TypeScript strict、JavaScript 检查和文档链接 `58/0` 通过。
- [x] `npm run test:local-project -- --ProjectRoot C:\Users\13929\NewProject` 通过。
- [x] PowerShell 解析、JavaScript 语法检查和 `git diff --check` 通过。

本轮任务 hash：`sha256:6bb3e7ddd191ba500fd026b032f9d50893364079620a41f2d67c63ab2bb74e36`。

### 本轮验证

- [x] `cd cli; npm run verify`：14 个测试文件全部通过，新增 DOM 卸载/销毁回归测试通过，TypeScript strict、JavaScript 检查和文档链接 `58/0` 通过。
- [x] `npm run test:local-project -- --ProjectRoot C:\Users\13929\NewProject`：项目同步、CLI status、版本和路径校验通过。
- [x] PowerShell 脚本解析、JavaScript 语法检查和 `git diff --check` 通过。
- [x] 根扩展、`examples/cocos3d-demo` 与 `C:\Users\13929\NewProject` 的 Panel/Overlay 源码已同步。
- [x] 最终 Release workflow `32626332873` 成功；`v0.0.0.1-a` 指向提交 `21f6f1b`，Release `375146749` 的 Windows zip 资产状态为 `uploaded`，大小 `84,884,231` bytes。
- [x] 发布账本最终校正：workflow `32626506631` 已对最终提交 `e2865b6` 成功，Release `375147432` 的 Windows zip 资产状态为 `uploaded`，大小 `84,884,739` bytes。
- [x] 最终发布确认：workflow `32626676068` 对提交 `dc93bbe` 成功，Release `375148277` 的 Windows zip 资产状态为 `uploaded`，大小 `84,884,050` bytes。

本轮任务 hash：`sha256:ad18547f9321bbbcf88acb8b0ea8cd349938b641d0b7e3d27fca94095b05b0d0`。

### 已完成任务

- [x] `cd cli; npm run verify`：14 个测试文件全部通过，TypeScript strict、JavaScript 检查和文档链接 `58/0` 通过。
- [x] `npm run test:local-project -- --ProjectRoot C:\Users\13929\NewProject`：项目同步、CLI status、版本和路径校验通过。
- [x] PowerShell 三个脚本解析通过，`git diff --check` 无问题。

本轮任务 hash：`sha256:d644489138fa252c5c5f0aff3508df53e74887c7ea88fcb96dccd93b17cf3dd4`。
### 已完成任务

1. [x] 修复 Cocos Creator 面板与 Overlay 的空节点 `addEventListener` 崩溃。查询顺序为 Creator `$` 映射、`shadowRoot`/panel root、最后兼容回退到 `document`；缺失节点只输出诊断，不中断扩展加载。根扩展与 `examples/cocos3d-demo` 已同步。
2. [x] Open CLI 默认简体中文，新增 `locale` 选择控件；工作区刷新读取 `agent_config.locale`，保存工作区时写回 `locale`，并保留 `en-US` 选项。面板命令可直接调用 `math analyze`。
3. [x] 新增 `native-math-optimization` Skill、`math_analyze` CLI/MCP 工具及 C/C++ 原生库接入约束。只读扫描当前项目 `assets/`、`native/`、`plugins/`，覆盖 Transform、Mat4 求逆、Ray/AABB、Vec3/Vec4、normalize、sqrt 等优化候选；不触碰 Cocos 私有引擎文件或项目外资源。

### 本轮验证

- [x] `cd cli; npm run verify`：24 项通过、1 项按环境跳过，JavaScript 检查通过，文档链接 `58/0`。
- [x] TypeScript strict 类型检查通过。
- [x] 扩展契约测试覆盖中文默认文本、locale 控件、panel root 查询和无全局 `document.getElementById`。
- [x] C/C++ 接入说明已写入 [docs/native-library-integration.md](docs/native-library-integration.md)，并纳入本 TODO 约束覆盖表。

本轮任务 hash：`sha256:29c6cbd338c99522105b234a7f82114ce5a4889962b28ee26eedb70ac5184a72`。

<!-- 原始待办日志 -->
1.
```log
TypeError: this.append is not a function
at Object.ready (C:\Users\13929\NewProject\extensions\cocos-agent\src\overlay.js:98:10)
at E:\cocos editor\Creator\3.8.8\resources\app.asar\node_modules\@editor\panel\lib\element.ccc:1:4682
at new Promise (<anonymous>)
at PanelFrame.emit (E:\cocos editor\Creator\3.8.8\resources\app.asar\node_modules\@editor\panel\lib\element.ccc:1:4637)
at loadPanel (E:\cocos editor\Creator\3.8.8\resources\app.asar\node_modules\@editor\panel\lib\element.ccc:1:7297)
at E:\cocos editor\Creator\3.8.8\resources\app.asar\node_modules\@editor\panel\lib\element.ccc:1:4434
at sentryWrapped (E:\cocos editor\Creator\3.8.8\resources\app.asar\node_modules\@sentry\browser\build\npm\cjs\helpers.js:95:17)
```
以及
```log
TypeError: this.connect is not a function
at Object.ready (C:\Users\13929\NewProject\extensions\cocos-agent\src\panel.js:130:10)
at E:\cocos editor\Creator\3.8.8\resources\app.asar\node_modules\@editor\panel\lib\element.ccc:1:4682
at new Promise (<anonymous>)
at PanelFrame.emit (E:\cocos editor\Creator\3.8.8\resources\app.asar\node_modules\@editor\panel\lib\element.ccc:1:4637)
at loadPanel (E:\cocos editor\Creator\3.8.8\resources\app.asar\node_modules\@editor\panel\lib\element.ccc:1:7297)
at E:\cocos editor\Creator\3.8.8\resources\app.asar\node_modules\@editor\panel\lib\element.ccc:1:4434
at sentryWrapped (E:\cocos editor\Creator\3.8.8\resources\app.asar\node_modules\@sentry\browser\build\npm\cjs\helpers.js:95:17)
```
1. cc switch配置项单独选择应该让其选项成为独立项,连接http://ip:port



## 已解决任务（一次性闭环）

1. [x] CLI 配置方式改为表单：支持 OpenAI、Anthropic、DeepSeek、Kimi、Qwen、Gateway 的模型和端点配置、默认/回退渠道，以及 cc-switch / ccs 路由诊断与连接；API Key/Token 仅从环境变量读取。
2. [x] 已删除历史 GitHub Release、资产与 `v0.0.0.1-a` 至 `v0.0.0.8-a` 标签；发布基线当前递增为 `v0.0.0.2-a`。

## 本轮收尾结果

- [x] 修复 Release 构建失败并发布 `v0.0.0.2-a`：CI WSS 测试地址、版本一致性校验和 Release workflow 已修复；Release 构建成功，Windows zip 资产已上传，CI workflow 已拆分为可诊断步骤。
- [x] 修复 Cocos Agent AI 功能不可用：CLI 面板与 Overlay 显式绑定生命周期辅助方法，避免 Cocos Creator `Editor.Panel.define` 回调上下文缺少 `connect` / `append`；同步 `examples/cocos3d-demo` 与 `C:\Users\13929\NewProject`，并加入扩展契约断言。

本轮任务 hash：`sha256:9a1ccc6e8a4c31c95dd7aabfd70cd2008fd0a4f4fbf85824a2fcf83b7b8f574e`

发布修复任务 hash：`sha256:ee430e7a489bd03a3dd61760bbd1d5d8d032484c00f3aa494d55934c9510ef60`。

CI 修复任务 hash：sha256:5993a064ace7e3b76296e78f6eac6c833db1aad48aecd1438b0a4f30a4dadd29。

CI 诊断任务 hash：sha256:5993a064ace7e3b76296e78f6eac6c833db1aad48aecd1438b0a4f30a4dadd29。

CI 测试隔离任务 hash：sha256:e5df0f57d3f1788739092aa13c9f927116386459ee881084193992e8d1124bf3。

AI 面板修复与 CI 诊断任务 hash：`sha256:2678686cf61da7495bacb8768d5eb073777dafacdb4695cd0e459beb746942cb`。

CI 逐文件诊断任务 hash：`sha256:2194d58332d605ccbdab1c45e9920e52045347b091bb3ef89d8f9319485d2718`。

CI check annotation 诊断任务 hash：`sha256:50b2b8a0be9d14f1c4a2c5f7c54a5dac2ad13dc43ee183e53726fbba877150c0`。

CI 诊断提交收口 hash：`sha256:8eae9c0ea9afee18f3551188079888385698e4eb2b731efbcda46ba0fe09d54a`。

Release 重建任务 hash：`sha256:72d9cd1b1d84d2cff92252104c4d9754fa0cb25fa41bf4399af28898780fb2df`。

Release 验证收口任务 hash：`sha256:b9795dd22b79ef5a3d2528038ce0ad51a146a48174628a2d98896bd5fa38b397`。

Creator 构建与面板挂载修复任务 hash：`sha256:85a32c08907eefa8564da80e1d3ef4db2fceb47b4cafc88a6969909ace7db20f`。

任务账本整理 hash：`sha256:231856d765f17be56129fdb0078de34894dcfd9b8e8407f3e12917b0dd677d0d`。

## 本轮收尾结果（2026-08-24）

- [x] 固化 Gateway 完整操作链路回归测试：`provider_configure` 保存端点和模型、`provider_select` 选择当前工作区会话、`agent_config` 保存 `activeProvider=gateway` 与空回退列表。
- [x] 回归验证 `ccs_doctor` 读取独立 cc-switch 路由，并验证 `ccs_connect` 对 HTTP 404 返回 `connected`、`transport=http` 和 `httpStatus=404`。
- [x] 断言 Gateway 配置、全局工作区配置和会话提供商均已持久化到当前项目范围内。
- [x] `cd cli; npm run verify`：14 个测试文件通过，TypeScript strict、JavaScript 检查和文档链接 `58/0` 通过。
- [x] `npm run test:local-project -- --ProjectRoot "C:\\Users\\13929\\NewProject"` 通过：版本、CLI、扩展路径和 Creator 3.8.8 dry-run 校验通过。
- [x] 完成代码审查：本轮新增测试无 P0-P3 问题；`git diff --check` 仅报告用户原有 TODO 日志的尾随空格。

本轮任务 hash：`sha256:211886ffa4b10a7661a8d822c9662f940348ab9cf54959d364753023a371576f`。
