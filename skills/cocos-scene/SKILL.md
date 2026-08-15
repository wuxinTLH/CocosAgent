---
name: cocos-scene
description: 读取、查询和写入 Cocos Creator Scene/Prefab 资源；支持节点树查询、JSON 校验与受控写入；允许创建节点和基础模型占位。仅允许访问当前 Cocos 项目 assets 目录。
---

# cocos-scene

## 用途

- 读取 `.scene`、`.prefab` 文件并列出节点树。
- 按条件查询节点、组件、组件属性。
- 在编辑器协议允许的前提下创建节点、空物体、基础模型占位。
- 对资源做 JSON 结构校验后受控写入。

## 输入

- 资源相对路径：如 `assets/scenes/main.scene`。
- 写入内容：完整合法 JSON 数组或补丁操作。

## 输出

- 节点树/查询结果。
- 写入成功后的校验结果。

## 约束

- 只允许访问当前项目 `assets/` 内的资源。
- 不破坏资源 UUID 与 `__type__` 结构；写入前必须完整校验 JSON。
- 创建模型优先使用官方编辑器/API；CLI 只提供占位与校验能力。
- 写操作必须可回滚：写入前备份原文件到项目内 `temp/agent-backup/`。

## MCP 工具

- `scene_read`
- `scene_write`
- `scene_nodes`

## CLI

```powershell
node cli/dist/index.js scene nodes assets/scenes/main.scene
```
