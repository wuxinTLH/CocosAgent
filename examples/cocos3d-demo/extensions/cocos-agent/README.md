# Cocos Agent 扩展

在 Cocos Creator 内自动打开浮动 Overlay，覆盖原生编辑器工作区，通过本地 WebSocket 桥接调用 Cocos Agent CLI 与 MCP 工具。

## 前置

1. 构建 CLI：

```powershell
cd cli
npm install
npm run build
```

2. 安装扩展：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-extension.ps1
```

一键打开项目并覆盖编辑器 UI：

```powershell
bin\cocos-agent-overlay.cmd -ProjectRoot examples\cocos3d-demo
```

## 使用

- 扩展加载后自动启动本地桥接 `ws://127.0.0.1:8899/ws` 并打开 `cocos-agent.overlay` 浮动面板。
- 菜单：`Cocos Agent -> Open CLI`。
- 菜单：`Cocos Agent -> Overlay`，可重新打开浮动覆盖层。
- 面板内可直接输入：`status`、`scene nodes assets/scenes/main.scene`、`assets find main`、`ccs resolve`。

## 说明

- 桥接进程只监听 `127.0.0.1`，不对外网开放。
- 安装脚本会写入 `~/.cocos-agent/config.json`，将用户级扩展关联到已构建的 CLI；CLI 重新构建后可重新运行安装脚本刷新路径。
- 面板发送的路径会由 CLI 的 sandbox 校验，越界自动拒绝。
- 如果编辑器扩展 API 版本差异导致面板不显示，先按官方扩展协议调整 `package.json` 的 `contributions` 字段。
