# AI 资源包生成步骤

只用于生成或修复 `resource-package.json` 与 `main.js`。字段、枚举、限制和宿主入口全部从同一版 `contract.json` 读取，不在本文重复维护。

1. 按 `context-map.json` 核验并读取 guidance 的基础段、当前场景、manifest 以及本轮命中的 generation-profile 或 contract 分区。只有完整新建、大幅重写、明确索要示例或语法不确定时读取 `examples.json`。宿主实际加载的 `contractVersion` 与 `contractSha256` 必须和本次发布一致；完整 Schema 只由宿主执行。
2. 读取用户当前的两份文本文件以及真实 Rive 元数据。缺少 Rive 元数据时，不新建或改写画板、状态机、View Model、实例、属性路径。
3. 先列出脚本实际使用的 QVMI 路径及类型，再逐项对应到 `values`、UI 生成字段、`capabilities.observe` 或 `capabilities.trigger`。
4. JSON 负责文件、字段、权限、绑定、资源和 UI；JavaScript 负责行为。两份文件必须同步生成。
   脚本私有且需要跨冷启动恢复的数据使用 `qu.storage`；所有 QVMI 值仅存在于当前包会话；需要跨冷启动的数据由脚本显式写入 `qu.storage`，启动后读取并重新发布。
5. UI 只使用 `generation-profile.ui.allowedFieldsByType` 中的当前组件；逐控件满足 `requiredByType`、`oneOfRequiredByType`、`requiredWhen` 和 `valueSemantics`。布局使用 `group`，空白使用 `spacer`。
   每个组件必须写非空静态 `label`；动态 `bindings.label` 不能代替它。所有动态来源只写入组件的 `bindings`；`main.js` 负责更新相应 QVMI 字段。同一状态在多个组件中复用同一路径；不要为父级禁用、加载、选中或文案声明仅用于转发的重复字段。不得生成旧的 `xxxPath`、顶层值绑定或图标字段。
   `bindings.value.path` 写资源包内的相对路径，宿主统一映射到运行时 `package.ui.<path>`；UI scope 只控制挂载位置和显示周期。控件 `id` 只标识控件，不代替字段路径。
   每个值控件必须写完整的 `path/type/default`。按 `valueSemantics` 检查 inputMode 与类型、单选与多选类型、滑杆范围和步长、文件选择类型和 maxBytes；布局字段只能用在 `layoutFieldApplicability` 指定的布局中。不要等宿主报错后猜字段。
6. 输出后先做 JSON Schema 校验，再检查入口函数、生命周期、路径类型、权限、网络域名、UI 所有权和文件声明。
7. 校验错误按 JSON 路径逐条修复，宿主的错误码和原始消息必须逐字保留，禁止改写；最多两轮。仍有错误时返回错误说明，不写入编辑器。

普通修改使用 `edits`，每项的 `file` 只允许 `manifestJson` 或 `mainJavaScript`，`oldText` 必须非空且在当前演进中的对应文件恰好出现一次，多项按数组顺序应用。只有新建文件或大幅重写时才使用 `apply_files` 交付完整文件字符串。`edits` 与 `apply_files` 必须互斥；只讨论时两者均为 `null`。禁止省略号、Markdown 代码围栏和虚构的 Rive 名称。
