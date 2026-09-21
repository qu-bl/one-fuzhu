# AI 资源包生成步骤

只用于生成或修复 `resource-package.json` 与 `main.js`。字段、枚举、限制和宿主入口全部从同一版 `contract.json` 读取，不在本文重复维护。

1. 读取并核验 `release.json`、`contract.json`、`resource-package.schema.json`、`guidance.json` 和 `examples.json`。
2. 读取用户当前的两份文本文件以及真实 Rive 元数据。缺少 Rive 元数据时，不新建或改写画板、状态机、View Model、实例、属性路径。
3. 先列出脚本实际使用的 QVMI 路径及类型，再逐项对应到 `values`、UI 生成字段、`capabilities.observe` 或 `capabilities.trigger`。
4. JSON 负责文件、字段、权限、绑定、资源和 UI；JavaScript 负责行为。两份文件必须同步生成。
5. UI 只使用 `contract.ui.typeFields` 中的当前组件；组件允许字段取公共字段与该类型字段的并集。布局使用 `group`，空白使用 `spacer`。
6. 输出后先做 JSON Schema 校验，再检查入口函数、生命周期、路径类型、权限、网络域名、UI 所有权和文件声明。
7. 校验错误按 JSON 路径逐条修复，最多两轮。仍有错误时返回错误说明，不写入编辑器。

交付对象只允许包含 `manifestJson` 与 `mainJavaScript`，值为完整文件字符串。禁止省略号、Markdown 代码围栏和虚构的 Rive 名称。
