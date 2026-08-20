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

### AGT-20260820-001

- TaskHash：`sha256:9a1ccc6e8a4c31c95dd7aabfd70cd2008fd0a4f4fbf85824a2fcf83b7b8f574e`
- 开始：`2026-08-20T22:22:25+08:00`
- 结束：`2026-08-20T22:32:20+08:00`
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

- 结果：Open CLI 已提供模型和 cc-switch 的表单式配置，OpenAI、Anthropic、DeepSeek、Kimi、Qwen、Gateway 的端点/模型、默认提供商和回退链可直接保存；cc-switch 读取 `CC_SWITCH_CONFIG` 或 `~/.cc-switch/settings.json` 并可诊断/连接路由。API Key/Token 不会由 UI 写入，仅读取环境变量。完整验证为 23 通过、1 项按环境跳过，文档检查 55/0，Windows 单文件启动器构建与 dry-run 通过。旧 Release/资产和旧标签已清理，待推送当前基线并重新创建唯一 `v0.0.0.1-a` Release。
