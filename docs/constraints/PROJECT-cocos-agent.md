# PROJECT-cocos-agent 约束

项目根目录：`e:/code/Cocos Agent`
Cocos Creator 版本：`3.8.x`
语言：TypeScript / JavaScript
时区：UTC+8
全局版本：`v0.0.0.4-a`
创建时间：`2026-08-15T18:25:37+08:00`

## 项目目标

- 本文件仅约束 `cocos-agent`，与其他 Cocos 项目互不覆盖。
- Agent 可查询和受控修改当前项目 `assets/`；场景、预制体、材质和模型必须保持 Cocos Creator 官方序列化格式。

## 目录与命名

- 场景放 `assets/scenes/`，预制体放 `assets/prefabs/`，脚本放 `assets/scripts/`，材质放 `assets/materials/`，模型放 `assets/models/`。
- 组件使用 PascalCase，脚本文件使用 kebab-case 或与组件同名；资源 UUID 仅由编辑器管理。

## 引擎能力边界

- 使用 Cocos Creator `3.8.x` 官方 3D、渲染、物理、动画和 UI API；引擎升级必须作为独立任务审查。
- 不调用 Cocos Creator 私有 API；编辑器扩展仅通过官方 `Editor.Panel`、message 与 manifest 协议交互。

## 素材库策略

- 素材库、OCR 输入/输出、场景备份仅限本项目根目录；素材检索默认只扫描 `assets/`。
- `library/`、`temp/`、`build/`、`local/` 为生成目录，禁止作为任务源文件修改。

## Skills 与 MCP

- 启用 `cocos-ocr`、`cocos-scene`、`cocos-assets`、`cc-switch-connect`、`chat-longlink`；每个工具必须经过 sandbox 校验。
- MCP 仅调用已登记工具，写入 Scene/Prefab 前自动备份到当前项目 `temp/agent-backup/`。
- 网关仅允许 `wss://` 地址；Token 只从环境变量读取，禁止写入项目、记忆、日志和 git。

## 禁止事项

- 禁止越界访问、符号链接逃逸、未授权导入和删除。
- 禁止破坏资源 UUID、`__type__`、Scene/Prefab JSON 结构。
- 禁止提交密钥、Token、鉴权文件和编辑器生成目录。

## 验证方式

- `node <agent-root>/cli/dist/index.js scene nodes assets/scenes/main.scene` 必须能读取有效节点树。
- `node <agent-root>/cli/dist/index.js assets find --query <query>` 只返回项目 `assets/` 内资源。
- 所有代码变更必须通过 TypeScript 编译、测试、代码审查和记忆写入。
