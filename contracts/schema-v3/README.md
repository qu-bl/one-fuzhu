# 千机百变公开规则（schema v3）

这里是鸿蒙、Android、Apple 共用的发布源。三端读取 `release.json`，按 SHA-256 下载
`contract.json` 与 `resource-package.schema.json`；网页端公开地址为
`https://qu-bl.github.io/one-fuzhu/contracts/schema-v3/`。

`contract.json` 是字段、能力、组件与平台例外的规则，JSON Schema 是资源包声明的结构规则。
修改规则时同时更新有效／无效样例，运行 `python release.py` 生成发布描述。
GitHub Actions 会重新生成 Schema、校验样例及哈希；检查通过后才应合并。

静态站点只能发布已审核的规则，不能代替设备端检查用户导入的包、权限或硬件结果。
规则版本变更若需要新的客户端能力，必须与三端应用版本的发布协调。
