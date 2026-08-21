# Changelog

## v0.0.0.2-a - 2026-08-21

- 修复 Cocos Creator 面板 DOM 初始化和 Release 构建版本注入。
- Open CLI 默认简体中文，增加 locale 持久化和 `math_analyze` 数学优化工具。

## v0.0.0.1-a - 2026-08-20

- 重新建立发布基线，历史 prerelease 资产与标签已清理；后续版本从 `v0.0.0.1-a` 重新递增。
- `Open CLI` 面板改为表单式配置：支持 OpenAI、Anthropic、DeepSeek、Kimi、Qwen 和 Cocos Agent Gateway 的模型、端点、默认提供商及回退链。
- 增加 cc-switch / ccs 配置诊断与路由连接入口；凭据只读取系统环境变量，不保存到项目、日志或仓库。
- 保留 Cocos Creator 官方顶层 `panels` 注册和标准 `dockable` 面板协议。

## 发布规则

- 当前发布版本以 [VERSION](VERSION) 为准；本条历史记录对应 `v0.0.0.1-a`。
- npm 与扩展 manifest 使用合法 semver，并保留 `cocosAgentVersion` 映射。
- 发布前必须通过 `npm run verify`、Windows 启动器构建和 dry-run；Release 仅从 `v*` 标签创建。
