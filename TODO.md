# 版本约束

- MUST: 全局版本设置为 `v0.0.0.1-a`，根目录 `VERSION` 为唯一来源。
- MSUT: 测试项目位置: "C:\\Users\\13929\\NewProject"

# TODO 全局任务队列
更新时间：`2026-08-24T18:31:49+08:00`（UTC+8）
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

## 代办列表
1. [x] cc-switch HTTP 根路径返回 404 时，视为服务端点可达并显示 HTTP 状态，不再误报 `CCS_HTTP_ERROR`；网络不可达仍返回明确错误。
```log
{
  "ccs": {
    "checks": {
      "ccSwitchConfig": {
        "ok": true,
        "path": "C:\\Users\\13929\\.cc-switch\\settings.json"
      },
      "ccsBin": {
        "ok": false,
        "value": null
      },
      "ccsUrl": {
        "ok": true,
        "value": "http://127.0.0.1:15721"
      },
      "gatewayUrl": {
        "ok": false,
        "value": null
      }
    },
    "route": {
      "route": "universal-codex-d85fbc03-b560-418d-9b00-bbbc1a94c881",
      "source": "C:\\Users\\13929\\.cc-switch\\settings.json",
      "provider": "universal-codex-d85fbc03-b560-418d-9b00-bbbc1a94c881",
      "url": "http://127.0.0.1:15721"
    },
    "editors": [],
    "creatorVersion": "3.8.8"
  }
}
[ccs] CCS_HTTP_ERROR: 404
{
  "ccs": {
    "checks": {
      "ccSwitchConfig": {
        "ok": true,
        "path": "C:\\Users\\13929\\.cc-switch\\settings.json"
      },
      "ccsBin": {
        "ok": false,
        "value": null
      },
      "ccsUrl": {
        "ok": true,
        "value": "http://127.0.0.1:15721"
      },
      "gatewayUrl": {
        "ok": false,
        "value": null
      }
    },
    "route": {
      "route": "universal-codex-d85fbc03-b560-418d-9b00-bbbc1a94c881",
      "source": "C:\\Users\\13929\\.cc-switch\\settings.json",
      "provider": "universal-codex-d85fbc03-b560-418d-9b00-bbbc1a94c881",
      "url": "http://127.0.0.1:15721"
    },
    "editors": [],
    "creatorVersion": "3.8.8"
  }
}
[ccs] CCS_HTTP_ERROR: 404

```


### 本轮解决方案与验证

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
