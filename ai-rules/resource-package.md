# AI 资源包操作顺序

`contract.json` 是唯一权威，`generation-profile.json` 是它自动生成的摘要；本文不维护字段、枚举、入口或限制清单。

1. 核验共享契约及 AI 资料的版本和哈希，由 `context-map.json` 加载本轮主题。
2. 同时读取 `resource-package.json`、`main.js` 和真实 Rive 元数据；持久值在 `activate` 恢复，需响应多设备同步时在可选 `onStorageChange(qu)` 中重新读取；缺少资产信息时保留现有名称并说明缺口。
3. 按 `guidance.json` 的资源包场景建立清单、程序、字段、权限、绑定和资产对应关系。
4. 清单与程序作为一次原子交付；普通修改使用精确替换，新建或大幅重写才返回完整文件。
5. 依次执行 JSON Schema、跨文件和宿主校验。失败时逐字保留原始错误并最多修复两轮，仍失败则停止写入。
