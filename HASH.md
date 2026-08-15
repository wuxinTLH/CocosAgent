# 任务 hash 规范

版本：`HASH-1.0`  
算法：SHA-256，输出 hex，前缀 `sha256:`。

## 用途

- 唯一标识一次 Agent 任务。
- 关联 TODO、LONG_MEMORY、SHORT_MEMORY 与执行日志。
- 支持任务去重与复现。

## 输入结构

对以下 JSON 对象进行规范化后计算 SHA-256：

```json
{
  "workflowVersion": "WF-1.0",
  "projectRoot": "<绝对路径，正斜杠，Windows 盘符小写>",
  "request": "<规范化请求文本>",
  "utc8Start": "<YYYY-MM-DDTHH:mm:ss+08:00>"
}
```

## 规范化规则

1. JSON 使用两个空格缩进，键按声明顺序排列。
2. `projectRoot`：绝对路径，分隔符统一为 `/`；Windows 盘符转为小写；末尾无 `/`。
3. `request`：去除首尾空白；连续空白折叠为单个空格；Unicode 使用 NFC。
4. `utc8Start`：使用 Asia/Hong_Kong 时间，格式 `YYYY-MM-DDTHH:mm:ss+08:00`。

## 计算示例

```powershell
node cli/dist/index.js hash --request "初始化 Cocos Agent 工作区"
```

输出：

```text
sha256:<64 位十六进制>
```

说明：`utc8Start` 取命令执行时刻，因此同一请求在不同时间执行会得到不同 hash。本仓库引导任务的记录 hash 为 `sha256:92aa5ecf27794f7fa14c19ba2603d4b93f67bca0248826aa18f6e1dc69138952`，见 LONG_MEMORY `AGT-20260815-001`。

## 记录要求

- LONG_MEMORY 每次执行必须写入 `TaskHash`。
- SHORT_MEMORY 每次执行必须写入 `Hash` 列。
- TODO 中关联任务可写 `Hash` 字段，便于溯源。
- 同一请求在相同项目与开始时间下 hash 相同；不同执行因 `utc8Start` 不同而不同。
