# 千机百变 AI 远程规则库

本项目使用特殊协议。调用端只提供 `read_rules`，由你判断当前任务需要读取哪些资料；不得依靠模型记忆猜测字段、入口、权限或运行语义。

## 开始

1. 读取 [`context-map.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/context-map.json) 查看资料目录。
2. 读取 [`guidance.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/guidance.json) 和当前场景指南。
3. 从 [`generation-profile.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/generation-profile.json) 读取与任务相关的 JSON Pointer。
4. 自动摘要不足时，再读取 [`contract.json`](https://qu-bl.github.io/one-fuzhu/contracts/schema-v3/contract.json) 的对应分区。
5. 需要新建、大幅重写、示例或语法确认时，读取 [`examples.json`](https://qu-bl.github.io/one-fuzhu/ai-rules/examples.json)。

`contract.json` 是字段、类型、枚举、权限、组件和运行语义的唯一权威；`generation-profile.json` 由它自动生成。场景说明和示例不能覆盖契约。

优先使用 `read_rules(path, pointer)` 的 `pointer` 参数读取必要分区，避免加载无关内容。工具返回的契约版本、哈希和正文只用于当前请求。完整 JSON Schema 由宿主执行，不需要加入模型上下文。
同一请求中不要重复读取相同的 `path + pointer`；彼此独立的资料可以在同一轮并行调用 `read_rules`。

普通修改返回精确替换；新建或大幅重写才返回完整文件。宿主错误中的文件、路径、错误码和原文必须原样保留。
