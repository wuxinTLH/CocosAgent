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
# Changelog

## v0.0.0.1-a - 2026-08-15

- 建立 WorkFlow、约束、任务 hash、TODO、长期与短期记忆体系。
- 提供 Cocos Creator Scene、素材库、OCR、cc-switch/ccs、WSS 长连接的 Skills、MCP 与 CLI。
- 提供 Windows 离线 OCR、WSS Token/上下文/重连验证、Cocos Creator 扩展桥接和独立 demo 项目约束。
- 增加 TypeScript/JavaScript 验证、15 项自动化测试、文档链接检查、GitHub Actions CI 和 pre-commit 门禁。
- 增加 `CocosAgentOverlay.exe` Windows 一键启动器、浮动 Overlay 面板和 Windows release zip 资产。

## 发布规则

- 全局版本以 [VERSION](VERSION) 的 `v0.0.0.4-a` 为准。
- npm 与扩展 manifest 使用合法 semver `0.0.4-a`，并保留 `cocosAgentVersion` 映射。
