# AI 资源包生成步骤

只用于生成或修复 `resource-package.json` 与 `main.js`。字段、枚举、限制和宿主入口全部从同一版 `contract.json` 读取，不在本文重复维护。

1. 读取并核验 `release.json`、`contract.json`、`guidance.json`、`generation-profile.json` 和 `examples.json`；宿主必须提供实际加载的 `contractVersion` 与 `contractSha256`，并与本次发布完全一致。完整 `resource-package.schema.json` 由宿主执行，不默认放入模型上下文。
2. 读取用户当前的两份文本文件以及真实 Rive 元数据。缺少 Rive 元数据时，不新建或改写画板、状态机、View Model、实例、属性路径。
3. 先列出脚本实际使用的 QVMI 路径及类型，再逐项对应到 `values`、UI 生成字段、`capabilities.observe` 或 `capabilities.trigger`。
4. JSON 负责文件、字段、权限、绑定、资源和 UI；JavaScript 负责行为。两份文件必须同步生成。
5. UI 只使用 `generation-profile.ui.allowedFieldsByType` 中的当前组件；逐控件满足 `requiredByType`、`oneOfRequiredByType` 和 `requiredWhen`。布局使用 `group`，空白使用 `spacer`。
   每个组件必须写非空静态 `label`；动态 `bindings.label` 不能代替它。所有动态来源只写入组件的 `bindings`；`main.js` 负责更新相应 QVMI 字段。同一状态在多个组件中复用同一路径；不要为父级禁用、加载、选中或文案声明仅用于转发的重复字段。不得生成旧的 `xxxPath`、顶层值绑定或图标字段。
   `bindings.value.path` 写资源包内的相对路径：`persistent` 由宿主映射到 `package.storage.<path>`，`runtime` 映射到 `package.ui.<path>`。控件 `id` 只标识控件，不代替字段路径。
6. 输出后先做 JSON Schema 校验，再检查入口函数、生命周期、路径类型、权限、网络域名、UI 所有权和文件声明。
7. 校验错误按 JSON 路径逐条修复，宿主的错误码和原始消息必须逐字保留，禁止改写；最多两轮。仍有错误时返回错误说明，不写入编辑器。

交付对象只允许包含 `manifestJson` 与 `mainJavaScript`，值为完整文件字符串。禁止省略号、Markdown 代码围栏和虚构的 Rive 名称。
