# 千机百变 AI 资料入口

千机百变有自己的资源包、脚本、QVMI 和动态 UI 协议。需要生成、修改或解释这些内容时，先读取轻量路由：

给 AI 的最短提示：`千机百变使用特殊协议；需要适配时先读取 https://qu-bl.github.io/one-fuzhu/ai-rules/README.md，并按其中路由按需取资料。当前上下文已有相同 version 与 sha256 的资料时无需重复读取。`

- 资料发布清单：[`rules.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/rules.json)
- 按需读取路由：[`context-map.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/context-map.json)
- 四类规则位置：[`sources.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/sources.json)

如果当前对话已经包含同一文件在 `rules.json` 中的 **version 和 sha256**，并且本轮没有涉及新的主题，可以继续使用，不必重复读取。只有“以前看过”、文件名相同、模型记忆或版本无法核对时，必须重新读取。模型自身不能访问链接时，由调用脚本拉取、核验并只注入本轮所需片段。

## 按任务读取

1. 先确认场景：应用脚本或资源包。
2. 读取 [`guidance.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/guidance.json) 中的交付协议、当前场景和本轮相关检查项。
3. 按 `context-map.json` 命中的主题，读取 [`generation-profile.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/generation-profile.json) 或 [`contract.json`](https://qu-bl.github.io/one-fuzhu/contracts/schema-v3/contract.json) 的对应分区。
4. 应用脚本的场景步骤在 [`application-script.md`](https://qu-bl.github.io/one-fuzhu/ai-rules/application-script.md)；资源包在 [`resource-package.md`](https://qu-bl.github.io/one-fuzhu/ai-rules/resource-package.md)。首次适配、完整新建、大幅重写或语法不确定时读取，普通局部修改无需重复加入上下文。
5. [`examples.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/examples.json) 只用于完整新建、大幅重写、明确索要示例或语法不确定的任务。

## 主题范围

- UI：只读取 UI 分区。
- QVMI、RVMI、字段、绑定、状态和事件：读取 QVMI 与脚本值访问器分区。
- 网络：读取 network 分区。
- 持久化：读取 script.storage。
- Rive、图片、音频、字体和包内文件：读取 resources；资源包同时读取 manifest。

完整 JSON Schema 留给宿主机器校验，不放进模型上下文。宿主报错时只加入原始路径、错误码和原文。现有文件默认返回 `edits` 精确替换；新建或大幅重写才返回 `apply_files`。三端应用不加载 AI 资料，也不为 AI 交付格式增加专用代码。
