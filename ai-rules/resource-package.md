# 资源包 AI 资料入口

仅供生成或修改资源包的 AI 脚本调用。先读取 [`sources.json`](sources.json) 的 `consumers.aiScripts.generateResourcePackage`，按 [`index.md`](index.md) 核验并装配所需资料。

- **资源包结构、UI、QVMI、归档、资源和网络**：`contracts/schema-v3/contract.json` 的 `manifest`、`ui`、`qvmi`、`archive`、`resources`、`network`；结构校验参考 `contracts/schema-v3/resource-package.schema.json`。
- **脚本宿主能力**：同一契约的 `script`，注意 `applicationOnlyOperations` 不属于资源包。
- **生成和交付行为**：`ai-rules/guidance.json` 的 `shared` 与 `scenarios.resourcePackage`。
- **当前可修改文件**：`resource-package.json` 与 `main.js`；交付字段为 `manifestJson` 与 `mainJavaScript`。新增字段、UI、权限或绑定时，JSON 与 JS 一起更新。

具体规范以已核验 JSON 为准，不从本 Markdown 推断遗漏字段。三端应用代码不加载本文件。
