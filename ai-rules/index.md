# 千机百变 AI 资料入口

本文件只规定如何找到并使用资料，不重复抄写字段表或取值。完整路径见同目录的 [`sources.json`](sources.json)。

1. **资源包规则**：读取 `contracts/schema-v3/release.json`，按其中的 SHA-256 核验 `contract.json`；资源包结构参考 `resource-package.schema.json`。查询 `manifest`、`ui`、`qvmi`、`archive`、`resources`、`network`。
2. **脚本规则**：读取同一份已核验的 `contract.json`，查询 `script`、`ui`、`qvmi`、`resources`、`network`。应用脚本与资源包脚本的能力差异以 `script.applicationOnlyOperations` 等字段为准。
3. **翻译规则**：Rive 编辑器词典在 `rive-editor/translation.json`。仅用于编辑器翻译，不作为宿主 API 或资源包字段来源。
4. **AI 规则**：仅供对应的 AI 脚本调用。本文件说明资料入口；生成与交付要求在 `ai-rules/guidance.json`，按场景选择 `application-script.md` 或 `resource-package.md` 的短说明。`ai-rules/rules.json` 给这些 AI 资料提供版本与 SHA-256。

相关 AI 脚本必须取得实际 JSON 内容并放入模型上下文，不能只把 URL 或本文件交给没有联网能力的模型。三端应用代码不加载 AI 规则；应用的资源包与脚本执行仍从共享契约取规范，翻译功能读取词典。拉取失败时 AI 脚本可使用已核验的缓存；没有可用缓存时提示规则未就绪。每次请求使用同一版契约，不能混用不同版本的字段和示例。JSON 与文字说明冲突时，以已核验的 JSON 为准。
