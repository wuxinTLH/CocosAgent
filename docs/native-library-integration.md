# C/C++ 原生库接入

适用范围：当前 Cocos Creator 3D 项目的原生扩展和 C/C++ 第三方库接入。

## 接入步骤

1. 在项目内创建 `native/` 或 `plugins/<library-name>/`，保留库的源码、许可证与平台说明。
2. 通过项目内 `CMakeLists.txt` 定义目标、包含目录和链接依赖；使用 Cocos Creator Native 公开扩展点生成各平台工程。
3. 为 Windows、macOS、Android、iOS 和目标 CPU 架构分别声明是否支持；没有验证的平台必须显式禁用或使用 TypeScript 回退实现。
4. 将 C++ 对外接口限制为稳定、可序列化的参数，TypeScript 组件仍使用公开的 Cocos API 管理节点、资源、生命周期和事件。
5. 在目标设备上执行构建、运行和数值边界测试；记录编译器、CMake 版本和基准结果。

## 禁止事项

- 不修改 Cocos Creator 安装目录、引擎私有头文件或编辑器私有 API。
- 不将未审查的预编译二进制、API Key、Token 或本机路径提交到仓库。
- 不把 `library/`、`temp/`、`build/` 等生成目录作为源代码接入位置。
- 不在没有性能基准与边界测试时替换 Transform、Ray、碰撞或渲染相关计算。

## 验证

- 在 Cocos Creator 官方构建流程中完成目标平台构建。
- `math_analyze` 仅用于识别候选，不代替 profile、单元测试或真实设备验证。
- 任意路径必须保留在当前项目根目录内，并通过 Cocos Agent sandbox 校验。
