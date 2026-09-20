# 千机百变公开规则（schema v3）

这里是鸿蒙、Android、Apple 共用的发布源。三端读取 `release.json`，按 SHA-256 校验并缓存
`contract.json`；`resource-package.schema.json` 用于发布时验证资源包结构。公开地址为
`https://qu-bl.github.io/one-fuzhu/contracts/schema-v3/`。

`contract.json` 是字段、能力、组件与平台例外的规则，JSON Schema 是资源包声明的结构规则。
修改规则时同时更新有效／无效样例，运行 `python release.py` 生成发布描述。
GitHub Actions 会重新生成 Schema、校验样例及哈希；检查通过后才应合并。

当前三端运行时从云端读取资源包顶层字段和 UI 控件字段规则；其余字段仍由三端现有解码器处理。
静态站点只能发布已审核的规则，不能代替设备端检查用户导入的包、权限或硬件结果。
规则版本变更若需要新的客户端能力，必须与三端应用版本的发布协调。
