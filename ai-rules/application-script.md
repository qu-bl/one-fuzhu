# AI 应用脚本生成步骤

只用于生成或修复应用脚本。入口、注解、宿主操作、参数、UI 和 QVMI 字段全部从同一版 `contract.json` 读取。

1. 读取并核验 `release.json`、`contract.json`、`guidance.json`、`generation-profile.json` 和 `examples.json`，同时读取当前编辑器完整源码。宿主必须提供实际加载的 `contractVersion` 与 `contractSha256`；任一缺失或与本次发布不一致时停止生成。
2. 保留用户现有的 `@id`；新脚本必须生成符合 `script.idPattern` 且不与其他脚本重复的 `@id`。
3. 只为脚本自己拥有且脚本确实读写的新 `app.*` 字段调用 `viewModel.define`；类型必须属于 `generation-profile.script.valueAccessorTypes`。已有公开字段禁止重新定义；UI 绑定类型不在该集合时由宿主管理，不能改写类型或补造 `define`。
   QVMI 字段只属于当前脚本会话，脚本停止后全部释放。跨冷启动数据必须写入 `qu.storage`，再由 `onStart` 读取并用于字段初值；禁止给 QVMI 字段添加 `persistent`。
4. `@observe` 只列出 `onValue` 实际消费的路径；UI binding 由宿主自行观察，不因控件绑定而加入 `@observe`。自有观察路径必须有真实来源，且类型可由脚本访问。`@interval` 和 `@ui` 与处理函数保持一致。所有 UI 组件只使用 `contract.ui` 当前类型和字段。
   每个组件必须写非空静态 `label`；动态 `bindings.label` 不能代替它。所有动态来源只写入组件的 `bindings`；脚本负责更新相应 QVMI 字段。同一状态在多个组件中复用同一路径，每个自有路径只 `define` 一次；不要为父级禁用、加载、选中或文案建立转发字段。不得生成旧的 `xxxPath`、顶层值绑定或图标字段。
   每个值控件必须写完整的 `path/type/default`，并逐项满足 `generation-profile.ui.valueSemantics` 中的输入类型、单选/多选、滑杆范围和文件选择规则。
5. 只调用 `script.hostOperations`；操作参数和 options 分别取 `operationArguments` 与 `operationOptionFields`。`qu.storage.set` 每次调用立即写入脚本私有本地存储，适合保存经纬度、用户选择和恢复点；不得把 QVMI 当作本地数据库。
6. 输出后建立 `@observe → onValue`、`bindings.value → 字段来源`、`viewModel.define → valueAccessorTypes` 三张对应表；再检查入口、注解、写权限、UI 所有权、异步重入和停止清理。
7. 校验错误逐条修复，最多两轮。仍有错误时返回错误说明，不写入编辑器。

交付对象只允许包含 `applicationJavaScript`，值为完整脚本字符串。禁止输出资源包文件、Markdown 代码围栏或模型记忆中的旧 API。
