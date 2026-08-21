---
name: native-math-optimization
description: 在当前 Cocos Creator 3D 项目内分析 C/C++ 原生库接入与 Transform、Ray、矩阵、向量的性能优化候选；默认只读。
---

# native-math-optimization

## 用途

- 在当前项目的 `native/`、`plugins/` 与 `assets/` 内分析 TypeScript、JavaScript、C/C++ 数学热路径。
- 为 Cocos Creator 3D 的 `Mat4`、`Vec3`、`Vec4`、`Ray`、AABB 与平面相交提供可审查的优化建议。
- 指导项目内 C/C++ 库通过 Cocos Native 与 CMake 官方接入方式集成。

## 输入与输出

- 输入：可选的项目内源码相对路径；未提供时扫描项目内 `assets/`、`native/`、`plugins/`。
- 输出：文件、语言、行号、分类、严重度、说明和建议；不直接修改任何源文件。

## 约束

- 仅允许访问当前 Cocos 项目根目录内的文件；路径必须经 sandbox 校验。
- 只允许分析 `assets/`、`native/`、`plugins/`；不得读写 Cocos 安装目录、引擎私有头文件或用户目录。
- 原生库接入使用项目内 CMake 与 Cocos 官方 Native 扩展点；禁止自动下载、链接未审查二进制文件或修改编辑器私有文件。
- C/C++ 修改必须声明目标平台、CPU 架构、编译器与 CMake 依赖，并保持跨平台回退路径。
- 优化必须先由 `math_analyze` 给出证据，再通过 profile、基准测试或目标设备验证；禁止仅凭猜测改写数值逻辑。
- 保持浮点精度和 Cocos 坐标空间语义。Ray、Transform、碰撞与渲染计算的变更必须有边界测试。

## 优化清单

- 缓存不变的 Transform、`Mat4` 和逆矩阵，避免每帧重复 `invert`。
- 在碰撞或拾取前先做 AABB、平面或平方距离剔除；仅在需要真实距离时计算 `sqrt`。
- 复用 `Vec3`、`Vec4`、`Ray` 临时对象，避免循环中分配；批量计算可评估 SIMD，但必须保留非 SIMD 回退。
- `normalize` 前检查可缓存长度，避免对同一向量重复归一化。
- 使用公开 Cocos 数学 API；不得复制或修改引擎内部实现。

## MCP 与 CLI

- MCP：`math_analyze`
- CLI：`node cli/dist/index.js math analyze [--path assets/scripts/Player.ts]`
- 原生库接入步骤：[C/C++ 原生库接入](../../docs/native-library-integration.md)
