# 应用脚本 AI 资料入口

仅供生成或修改应用脚本的 AI 脚本调用。先读取 [`sources.json`](sources.json) 的 `consumers.aiScripts.generateApplicationScript`，按 [`index.md`](index.md) 核验并装配所需资料。

- **字段、类型、UI、QVMI、网络和宿主入口**：`contracts/schema-v3/contract.json` 的 `script`、`ui`、`qvmi`、`resources`、`network`。
- **生成和交付行为**：`ai-rules/guidance.json` 的 `shared` 与 `scenarios.applicationScript`。
- **当前可修改文件**：`application.js`；交付字段为 `applicationJavaScript`。

这一场景不使用资源包清单或包内 Rive 资产。具体规范以已核验 JSON 为准，不从本 Markdown 推断遗漏字段。三端应用代码不加载本文件。
