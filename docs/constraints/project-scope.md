# 项目访问范围约束

版本：`PS-1.0`  
适用：所有 Skills、MCP 工具、CLI 与 Agent 文件操作。

## 当前 Cocos 项目

“当前 Cocos 项目”判定顺序：

1. 环境变量 `COCOS_AGENT_PROJECT_ROOT`（最高优先级）。
2. 当前目录向上查找包含 `assets/` 且存在 `package.json`/`project.json`/`settings/` 的目录。
3. 当前工作目录。

## 沙箱规则

- 所有路径必须解析到项目根目录内才允许读写。
- Windows 路径比较忽略盘符大小写；统一使用 `/` 比较。
- 禁止通过符号链接、`..`、环境变量注入绕过沙箱。
- `temp/`、`library/`、`build/` 等生成目录默认不允许作为任务目标。

## 工具要求

- OCR 识别：输入截图与输出结果必须在项目根目录内。
- Scene/Prefab：读写目标必须在 `assets/` 内。
- 素材库：仅遍历当前项目 `assets/`。
- cc-switch 连接：配置可读取用户级配置，但连接动作不得写入项目外资源。
- 网关：只连接项目约束中声明的 WSS 地址。

## 越界处理

越界访问必须：

- 返回明确错误：`SANDBOX_VIOLATION: <path>`。
- 写入记忆与 TODO 风险记录。
- 不执行任何部分写入。
