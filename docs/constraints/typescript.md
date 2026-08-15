# TypeScript 约束

版本：`TS-1.0`  
适用：游戏脚本、CLI、MCP、扩展逻辑。

## 编译与配置

- `strict: true`，`target` 不低于 ES2020，模块方案按运行环境选择。
- 禁止 `any` 逃逸；必须显式声明类型或使用精确联合类型。
- 未使用变量、隐式返回、非空断言滥用均视为审查问题。
- CLI 与工具链默认使用 ESM；Cocos Creator 脚本遵循引擎模块约定。

## 命名

| 类别 | 规则 | 示例 |
| --- | --- | --- |
| 类/组件/接口 | PascalCase | `PlayerController` |
| 函数/变量 | camelCase | `getSceneName` |
| 常量 | UPPER_SNAKE | `MAX_PLAYERS` |
| 文件 | kebab-case 或与主类同名 | `player-controller.ts` |
| 枚举成员 | PascalCase | `GameState.Ready` |

## Cocos 脚本约定

- 组件类用 `@ccclass` 与装饰器 API；属性用 `@property`。
- 序列化字段类型明确，避免 `@property({ type: Object })` 这类宽类型。
- 导入 Cocos 模块按官方路径，不引用内部私有模块。

## 代码质量

- 函数职责单一，超过约 80 行需拆解。
- 异步使用 `async/await`，所有 `await` 必须处理错误或声明向上抛出。
- 避免深层嵌套回调；优先 Promise 与事件流。
- 公共函数与模块导出必须写 JSDoc。

## 测试

- 工具逻辑编写单测；Cocos 组件逻辑按可测试性拆分纯函数。
- 测试命令与验证结果写入记忆。
