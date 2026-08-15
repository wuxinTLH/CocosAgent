# JavaScript 约束

版本：`JS-1.0`  
适用：Cocos 扩展面板、脚本、快速工具。

## 语言

- 使用 ES2022+：`const`/`let`，禁止 `var`。
- 使用模板字符串、解构、可选链与空值合并。
- 禁止隐式全局变量；严格模式必须开启。

## 扩展与工具

- Cocos Creator 扩展 main/panel 使用 CommonJS 风格时遵循官方模板。
- CLI 与 Node 工具使用 ESM；两种模块风格不得混写在同一文件。
- 异步回调必须处理错误；`child_process` 必须绑定 `error` 事件。

## JSDoc

- 导出函数必须写 JSDoc：参数、返回值、异常。
- 复杂对象建议给出形状注释或类型化 `@typedef`。

## 示例

```js
'use strict';

/** 打开扩展面板 */
exports.methods = {
  openPanel() {
    Editor.Panel.open('cocos-agent.cli');
  },
};
```
