# Cocos Agent CLI

TypeScript 实现的 CLI，用于执行 WorkFlow、计算任务 hash、读写记忆、调用 Skills 能力，并提供 MCP 服务与 Cocos 编辑器本地桥接。

## 构建

```powershell
cd cli
npm install
npm run build
```

## 命令

```text
status                 输出项目状态、Skills 与记忆统计
hash                   计算任务 hash
run                    按 WorkFlow 记录一次执行
skills list|run        列出/定位 Skills
ocr capture            运行 OCR 识别
scene read|write|nodes 读写 Scene/Prefab
assets find            检索素材库
ccs resolve|connect|doctor  cc-switch/ccs 路由解析、直连与诊断
gateway connect|mock        WSS 长连接对话与本地模拟网关
docs check                  校验文档链接
project init                生成项目独立约束
mcp                    启动 stdio MCP 服务
bridge start           启动本地桥接服务
```

## 环境变量

| 变量 | 作用 |
| --- | --- |
| `COCOS_AGENT_PROJECT_ROOT` | 当前 Cocos 项目根目录 |
| `COCOS_AGENT_OCR_CMD` | OCR 引擎命令模板，支持 `{image}`、`{output}`、`{region}` |
| `COCOS_AGENT_OCR_ENGINE` | OCR 引擎：`tesseract-js`（默认）或 `external` |
| `COCOS_AGENT_TESSERACT_LANG` | tesseract.js 语言，默认 `eng`，可设 `chi_sim` |
| `COCOS_AGENT_GATEWAY_URL` | WSS 网关地址 |
| `COCOS_AGENT_GATEWAY_TOKEN` | WSS 鉴权 Token |
| `COCOS_AGENT_GATEWAY_MODEL` | 默认模型名 |
| `COCOS_AGENT_CCS_URL` | ccs 路由直连地址 |
| `COCOS_AGENT_CCS_ROUTE` | 默认 ccs 路由 |
| `COCOS_AGENT_CCS_BIN` | ccs CLI 可执行文件路径 |
| `CC_SWITCH_CONFIG` | cc-switch 配置路径，默认 `~/.cc-switch/settings.json` |

## 示例

```powershell
node dist/index.js status
node dist/index.js hash --request "创建玩家移动脚本"
node dist/index.js scene nodes assets/scenes/main.scene
node dist/index.js assets find --query main --type scene
node dist/index.js bridge start --port 8899
node dist/index.js gateway mock --port 8787
node dist/index.js gateway connect --url ws://127.0.0.1:8787/ws --chat "你好"
node dist/index.js docs check
node dist/index.js project init --name cocos-agent
```
