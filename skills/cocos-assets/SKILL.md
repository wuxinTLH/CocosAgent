---
name: cocos-assets
description: 在当前 Cocos 项目中检索和定位素材库资源（场景、预制体、材质、模型、贴图、脚本），返回相对路径与元数据；访问范围严格限制为当前项目 assets 目录。
---

# cocos-assets

## 用途

- 按文件名或路径片段检索素材。
- 按类型过滤：scene、prefab、material、model、texture、script。
- 为 Agent 提供后续 scene/OCR 操作的精确路径。

## 输入

- 查询词：`query`。
- 类型过滤：`type`。
- 可选目录限制：`dir`。

## 输出

```json
[
  {
    "path": "assets/scenes/main.scene",
    "type": "scene",
    "name": "main"
  }
]
```

## 约束

- 仅遍历当前项目 `assets/`；`library/`、`temp/`、`build/` 不参与检索。
- 不修改素材内容；导入/删除素材由编辑器或明确授权任务执行。
- 模型与材质引用必须在项目内解析。

## MCP 工具

- `asset_find`

## CLI

```powershell
node cli/dist/index.js assets find --query main --type scene
```
