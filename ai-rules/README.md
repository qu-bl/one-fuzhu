# 千机百变 AI 资料入口

给 AI 的最短提示：`千机百变使用特殊协议；需要适配时读取 https://qu-bl.github.io/one-fuzhu/ai-rules/README.md，并按路由按需取资料。上下文已有相同 version 与 sha256 时无需重复读取。`

[`contract.json`](https://qu-bl.github.io/one-fuzhu/contracts/schema-v3/contract.json) 是字段、类型、枚举、权限、组件和运行语义的唯一权威。AI 资料不另建字段规则：

- [`generation-profile.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/generation-profile.json)：由契约自动生成的轻量摘要。
- [`context-map.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/context-map.json)：按任务选择摘要或契约分区。
- [`guidance.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/guidance.json)：AI 工作、交付和修复流程。
- [`application-script.md`](https://qu-bl.github.io/one-fuzhu/ai-rules/application-script.md) / [`resource-package.md`](https://qu-bl.github.io/one-fuzhu/ai-rules/resource-package.md)：场景操作顺序。
- [`examples.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/examples.json)：需要新建、重写或确认语法时读取的已校验示例。
- [`rules.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/rules.json)：资料版本和哈希。

读取顺序：先核验 `rules.json` 和共享契约身份，再由 `context-map.json` 选择本轮分区；摘要不足时才读取 `contract.json` 对应分区。完整 JSON Schema 只交给宿主校验。宿主报错只回传原始路径、错误码和原文。

普通修改默认返回精确替换；新建或大幅重写才返回完整文件。三端应用不加载 AI 资料，也不为 AI 交付格式增加专用代码。
