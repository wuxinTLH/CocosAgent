# Changelog

## v0.0.0.8-a - 2026-08-20

- 修复点击 `Cocos Agent -> Open CLI` 报 `Panel(cocos-agent.cli) is not defined` 的问题。
- 按 Cocos Creator 扩展 manifest 规范将 `panels` 从 `contributions` 移至 package 顶层，使 `cocos-agent.overlay` 与 `cocos-agent.cli` 在扩展加载时注册。
- 扩展清单测试拒绝将面板配置放回 `contributions.panels`。

## v0.0.0.7-a - 2026-08-20

- 修复点击 `Cocos Agent -> Open CLI` 报 `Message does not exist cocos-agent-cocos-agent:open-cli` 的问题。
- 按官方扩展消息协议，菜单 `message` 改为不带扩展名前缀的 `open-cli` 与 `open-overlay`，由 Cocos Creator 自动注册为 `cocos-agent:open-cli` / `cocos-agent:open-overlay`。
- 扩展清单测试新增菜单 `message` 与 `contributions.messages` 键一致性断言。

## v0.0.0.6-a - 2026-08-20

- 修复 Cocos Agent 扩展自定义主菜单二级菜单显示为 `undefined` 的问题：按官方 3.8 规范为 `Open CLI` 与 `Overlay` 菜单项补充必填 `label`。
- 扩展清单增加菜单项 `path`/`label`/`message` 回归断言，防止再次出现空标签子菜单。

## v0.0.0.5-a - 2026-08-20

- 扩展 Cocos Creator 自动探测目录，支持 `E:\cocos editor\Creator`、CocosDashboard 与 Program Files 等常见安装位置。
- 启动器记住 `creatorPath`，再次启动无需重复传入 Creator 路径。
- 目录选择器明确区分 Cocos 项目目录和 Creator 安装目录；误选安装目录时给出可操作提示。

## v0.0.0.4-a - 2026-08-20

- 修复无参数运行 `CocosAgentOverlay.exe` 时仅显示 Usage 的问题；现在会打开 Cocos 项目目录选择器，取消选择会正常退出。
- 保持位置项目路径与 `-ProjectRoot <项目路径>` 两种自动化启动方式。

## v0.0.0.3-a - 2026-08-19

- 修复 `CocosAgentOverlay.exe` 的 `-ProjectRoot` 参数兼容性、启动日志、错误窗口与扩展加载超时诊断。
- 将 Cocos Agent Overlay 改为官方 `dockable` 面板，并在项目内写入 `ready/error` 状态回执。
- 修复 Creator Electron 下 CLI bridge 的 Node 启动环境和项目根目录传递。

## v0.0.0.2-a - 2026-08-19

- 新增 Cocos AnimationClip 分析、动作优化建议和 OCR 状态识别。
- 新增 `idle -> run -> jump` 等状态机控制器生成，使用官方 `Animation.crossFade` API。
- 新增 `cocos-animation` Skill 与四个 MCP 动画工具。
- 修复版本约束漂移，并验证 Windows Release 构建流程。

## v0.0.0.1-a - 2026-08-15

- 建立 WorkFlow、约束、任务 hash、TODO、长期与短期记忆体系。
- 提供 Cocos Creator Scene、素材库、OCR、cc-switch/ccs、WSS 长连接的 Skills、MCP 与 CLI。
- 提供 Windows 离线 OCR、WSS Token/上下文/重连验证、Cocos Creator 扩展桥接和独立 demo 项目约束。
- 增加 TypeScript/JavaScript 验证、15 项自动化测试、文档链接检查、GitHub Actions CI 和 pre-commit 门禁。
- 增加 `CocosAgentOverlay.exe` Windows 一键启动器、浮动 Overlay 面板和 Windows release zip 资产。

## 发布规则

- 全局版本以 [VERSION](VERSION) 的 `v0.0.0.8-a` 为准。
- npm 与扩展 manifest 使用合法 semver `0.0.8-a`，并保留 `cocosAgentVersion` 映射。
