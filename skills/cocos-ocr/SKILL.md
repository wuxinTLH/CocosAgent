---
name: cocos-ocr
description: 使用 OCR 全局识别 Cocos Creator 编辑器或场景截图，返回识别文本与区域坐标；用于确认 Scene、UI、层级面板等区域实际状态。仅允许访问当前 Cocos 项目内的图像与输出文件。
---

# cocos-ocr

## 用途

- 识别 Scene 视图、预览画面、UI 截图中的文字与位置。
- 将识别结果转为结构化数据，供 Agent 判断场景实际状态。
- 支持区域识别，避免整屏噪声。

## 输入

- 图像路径：必须位于当前 Cocos 项目根目录内。
- 可选区域：`x,y,width,height`。
- 可选语言参数：如 `chi_sim`、`eng`。

## 输出

```json
{
  "items": [
    { "text": "Button", "box": { "x": 10, "y": 20, "w": 120, "h": 40 }, "confidence": 0.93 }
  ],
  "engine": "configured-ocr-engine"
}
```

## 约束

- 图像输入与结果文件必须在项目根目录内，越界报错 `SANDBOX_VIOLATION`。
- Windows 默认使用系统离线 OCR（`windows-ocr`）；`COCOS_AGENT_OCR_ENGINE` 可切换为 `tesseract-js` 或 `external`。
- 外部引擎通过 `COCOS_AGENT_OCR_CMD` 配置；tesseract.js 使用项目/本机缓存的语言数据，运行时下载失败必须返回明确错误。
- 识别结果不得自动写入游戏资产；如需写入，走 scene/asset 工具。

## MCP 工具

- `ocr_recognize`

## CLI

```powershell
node cli/dist/index.js ocr capture --image assets/tmp/scene.png --region "0,0,800,600"
```
