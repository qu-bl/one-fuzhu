# 千机百变公开规则（schema v3）

这里是鸿蒙、Android、Apple 共用的发布源。规范分类见 [NORMS.md](NORMS.md)。三端读取 `release.json`，按 SHA-256 校验并缓存
`contract.json`；`resource-package.schema.json` 用于发布时验证资源包结构。公开地址为
`https://qu-bl.github.io/one-fuzhu/contracts/schema-v3/`。

`contract.json` 是资源包、UI、QVMI、JS、归档、资源读取与网络的共同规则，JSON Schema 是由它生成的资源包结构规则。
修改规则时同时更新有效／无效样例，运行 `python release.py` 生成发布描述。
GitHub Actions 会重新生成 Schema、校验样例及哈希；检查通过后才应合并。

三端运行时从云端读取资源包字段与格式、UI 字段与限额、公开 QVMI 路径／类型／写权限、
JavaScript 宿主入口与参数、脚本长度、归档安全限额、资源读取与网络限额。两份 AI 提示词中的
宿主清单由 `sync_ai_rules.py` 从本文件生成；发布检查同时验证提示词哈希。
平台执行器仍负责实现入口、检查本地文件和处理设备权限。
静态站点只能发布已审核的规则，不能代替设备端执行文件检查、权限或硬件访问。
规则版本变更若需要新的客户端能力，必须与三端应用版本的发布协调。
