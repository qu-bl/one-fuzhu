# AI 应用脚本生成步骤

只用于生成或修复应用脚本。入口、注解、宿主操作、参数、UI 和 QVMI 字段全部从同一版 `contract.json` 读取。

1. 读取并核验 `release.json`、`contract.json`、`guidance.json` 和 `examples.json`，同时读取当前编辑器完整源码。
2. 保留用户现有的 `@id`；新脚本必须生成符合 `script.idPattern` 且不与其他脚本重复的 `@id`。
3. 只为脚本自己拥有的新 `app.*` 字段调用 `viewModel.define`；已有公开字段按 `qvmi.fieldTypes` 选择句柄，禁止重新定义。
4. `@observe`、`@interval` 和 `@ui` 与处理函数保持一致。所有 UI 组件只使用 `contract.ui` 当前类型和字段。
   按钮外观和状态路径写在 `@ui` JSON；动态文字、启用条件、加载和选中值由脚本写入相应 QVMI 字段。不得生成图标字段。
5. 只调用 `script.hostOperations`；操作参数和 options 分别取 `operationArguments` 与 `operationOptionFields`。
6. 输出后检查 JavaScript 入口、注解、路径类型、写权限、UI 所有权、异步重入和停止清理。
7. 校验错误逐条修复，最多两轮。仍有错误时返回错误说明，不写入编辑器。

交付对象只允许包含 `applicationJavaScript`，值为完整脚本字符串。禁止输出资源包文件、Markdown 代码围栏或模型记忆中的旧 API。
