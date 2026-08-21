# Cocos Agent 扩展

在 Cocos Creator 内自动打开 Cocos Agent 面板，通过本地 WebSocket 桥接调用 Cocos Agent CLI 与 MCP 工具。

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

一键打开项目并自动显示 Cocos Agent 面板：

```powershell
bin\cocos-agent-overlay.cmd -ProjectRoot examples\cocos3d-demo
```

## 使用

- 扩展加载后自动启动本地桥接 `ws://127.0.0.1:8899/ws` 并打开 `cocos-agent.overlay` 标准 dockable 面板。
- 菜单：`Cocos Agent -> Open CLI`。
- 菜单：`Cocos Agent -> Overlay`，可重新打开浮动覆盖层。
- Overlay 使用官方 `dockable` 面板协议自动打开，不修改 Cocos 原生资源或私有 UI 文件。Cocos Creator 不提供将第三方扩展强制覆盖整个原生工作区的公开 API。
- 面板默认使用简体中文，并读取/保存工作区的 `locale` 设置。可直接输入：`status`、`providers`、`sessions`、`chat <文本>`、`session new <名称>`、`session switch <id>`、`provider select <id>`、`locale zh-CN|en-US`、`math analyze <项目内路径>`、`permission only-access|only-safe|full-access`。`terminal <cmd|powershell|wt> <命令>` 仅在 `full-access` 可用。
- 面板控件通过 Creator panel 根节点、`$` 映射与兼容回退查询；延迟挂载时只记录诊断，不会抛出空节点监听错误。

## 说明

- 桥接进程只监听 `127.0.0.1`，不对外网开放。
- 安装脚本会写入 `~/.cocos-agent/config.json`，将用户级扩展关联到已构建的 CLI；CLI 重新构建后可重新运行安装脚本刷新路径。
- 面板发送的路径会由 CLI 的 sandbox 校验，越界自动拒绝。
- 启动器会等待项目内 `.cocos-agent/overlay-status.json` 写入 `ready` 或 `error`；异常详情同时写入 `%USERPROFILE%\.cocos-agent\launcher.log`。若面板未显示，可从 `Cocos Agent -> Overlay` 手动打开并查看该状态文件。
