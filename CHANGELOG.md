# Changelog

## v0.0.0.1-a 更新构建 - 2026-10-29

- Creator 面板采用紧凑 Agent 对话布局与二级模型管理，支持自定义 OpenAI 兼容渠道和 Windows DPAPI 加密 API Key。
- 增加受限工具循环、项目脚本与场景操作、实时编辑器工具、显式权限控制、会话删除与上下文回滚。
- 自主场景写入校验根结构与本地引用，API 错误脱敏并保留诊断细节。
- 修复 Ubuntu CI 错误调用 Windows 凭据存储的测试；CI 同时验证 Linux 与 Windows，发布包附构建提交及 SHA-256 校验文件。
- 保持固定版本并更新现有预发布；实机桥接生命周期与真实云端模型完整验收仍有已记录限制，不将 dry-run 视作实机通过。

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
