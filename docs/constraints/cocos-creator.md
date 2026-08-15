# Cocos Creator 3D 约束

版本：`CC-1.0`  
适用：所有基于 Cocos Creator 3D 的项目。

## 官方规范

- 以 Cocos Creator 官方文档为准：<https://docs.cocos.com/creator/3.8/manual/zh/>
- 版本必须固定并在项目约束中声明；升级引擎需单独任务。
- 编辑器生成的资源（Scene、Prefab、材质、模型）结构不得被手工破坏。

## 项目结构

```text
项目根目录
|-- assets/       游戏资源
|-- extensions/   项目扩展
|-- settings/     项目设置
|-- package.json
|-- tsconfig.json
`-- project.json（如存在）
```

- 脚本默认放在 `assets/scripts/`，按模块分子目录。
- 场景放 `assets/scenes/`，预制体放 `assets/prefabs/`，材质放 `assets/materials/`，模型放 `assets/models/`。
- 公共资源通过 `assets/resources/` 按需加载；禁止把全部场景放入 resources。

## 脚本约束

- 组件类使用 `@ccclass` 注册，类名全局唯一。
- 属性使用 `@property` 并声明类型；编辑器可见属性必须有明确默认值。
- 生命周期只使用官方回调：`onLoad`、`start`、`update`、`lateUpdate`、`onDestroy`、`onEnable`、`onDisable`。
- 节点操作在 `onLoad/start` 后进行，不依赖执行顺序。
- 事件使用官方 EventTarget/Node 事件系统，移除监听必须成对。
- 输入系统使用官方 `input` 模块，不直接轮询底层平台事件。

## 资源约束

- 资源 UUID 由编辑器管理；脚本只允许通过 `assetManager`、`resources` 或编辑器 API 引用。
- 直接读写 `.scene`、`.prefab` 时必须保持 JSON 数组结构与 `__type__` 完整。
- 模型导入使用官方管线（FBX/GLTF）；创建模型优先使用编辑器 API 或官方 Mesh 工具。
- 素材库访问仅限当前 Cocos 项目根目录。

## 构建约束

- 构建流程使用官方 Build 面板或命令行构建工具。
- 分包、Bundle、首包内容由项目约束声明。
- 构建产物目录不入库。

## 编辑器扩展约束

- 扩展遵循 Cocos Creator 扩展协议：`package.json`、main、panel、message。
- 扩展只访问当前项目上下文；编辑器全局能力需显式授权。
- CLI 窗口通过扩展面板展示，与 CLI 桥接服务使用本机 WebSocket。
