# 千机百变 AI 资料入口

本文件只规定如何找到并使用资料，不重复抄写字段表或取值。完整路径见同目录的 [`sources.json`](sources.json)。

1. **资源包规则**：读取 `contracts/schema-v3/release.json`，按其中的 SHA-256 核验 `contract.json`；资源包结构参考 `resource-package.schema.json`。查询 `manifest`、`ui`、`qvmi`、`archive`、`resources`、`network`。
2. **脚本规则**：读取同一份已核验的 `contract.json`，查询 `script`、`ui`、`qvmi`、`resources`、`network`。应用脚本与资源包脚本的能力差异以 `script.applicationOnlyOperations` 等字段为准。
3. **翻译规则**：Rive 编辑器词典在 `rive-editor/translation.json`。仅用于编辑器翻译，不作为宿主 API 或资源包字段来源。
4. **AI 规则**：仅供对应的 AI 脚本调用。先按 `ai-rules/rules.json` 校验本目录全部文件，再读取 `guidance.json`、`generation-profile.json`、对应场景 Markdown 和 `examples.json`。资源包使用 `resource-package.md`，应用脚本使用 `application-script.md`。

相关 AI 脚本必须把 guidance、场景指南、generation-profile、examples、用户当前文件，以及宿主实际加载的 `contractVersion` 和 `contractSha256` 放入模型上下文，不能只传 URL。宿主身份与本次发布不一致时停止生成。完整 Schema 留在宿主执行机器校验，只有相关片段随错误进入修复上下文。动态 UI binding 由宿主直接观察所属作用域的 QVMI，不需要重复写入 `@observe`；`@observe` 只声明 `onValue` 实际消费且脚本可访问的路径。`viewModel.define` 类型必须来自 `script.valueAccessorTypes`，并与同路径值绑定一致。失败时必须逐字保留宿主的路径、错误码和原始消息，最多修复两轮，仍失败则只返回错误而不写入编辑器。三端应用代码不加载 AI 规则。拉取失败时可使用已核验缓存；没有缓存时提示规则未就绪。每次请求只使用同一发布版本，JSON 与文字冲突时以已核验 JSON 为准。
