# 三端共享规范清单

发布源是 `contract.json`。`resource-package.schema.json`、两份 AI 规则中的宿主事实和 `release.json` 从它生成或校验。三端应用启动时校验哈希并缓存契约；导入资源包、运行脚本时按缓存契约检查。新增公共能力必须先增加契约，再更新三端实现与样例。

| 类别 | 云端位置 | 三端使用点 |
| --- | --- | --- |
| 资源包对象、必填／可选字段、类型枚举 | `manifest.required/optional/nested/valueTypes/bindingSourceTypes/riveTypes` | manifest 导入与 UI 解析 |
| 包 ID、版本、域名、资源路径格式 | `manifest.validation.patterns` | manifest 导入 |
| 固定文件、名称长度、持久字段、触发命名空间 | `manifest.validation.fixedFiles/limits/persistentValueTypes/persistentPathPrefix/forbiddenTriggerPrefixes` | manifest 导入 |
| Rive 版面、绑定方向／转换、音频用途／音量 | `manifest.validation.rive/binding/audio` | manifest 导入、绑定与音频实例 |
| UI 控件字段、集合字段、条件／格式／选项字段 | `ui.commonFields/typeFields/setFields/conditionFields/formatFields/optionFields` | 资源包 UI、脚本 UI |
| UI ID、组数、深度、各项上限、布局枚举与 scope | `ui.validation` | 资源包 UI、脚本 UI |
| QVMI 公开字段、类型、可写字段、平台可用性、触发参数 | `qvmi.observable/fieldTypes/writablePublicPaths/availability/triggers/triggerPayloadFields` | QVMI 读写／订阅／触发 |
| JS 入口、公共参数、options 字段、脚本注解与限额 | `script.hostOperations/operationArguments/operationOptionFields/definitionOptions/validation` | JS 桥、脚本编辑与启动 |
| 归档文件数、大小、路径安全、保留目录 | `archive` | `.qjpkg` 导入 |
| 资源读取与 Rive 资源大小 | `resources` | 资源 token、读取、Rive 加载 |
| HTTPS、域名声明、网络请求／传输限额 | `network` | JS 网络入口 |

云端规则控制接受条件和公开能力。原生层继续实现文件解压、Rive 绘制、音频、传感器、网络传输与权限请求。JSON 不能执行这些设备操作。鸿蒙网络传输器在下载契约前使用固定的启动安全限额，加载契约后切换到云端限额。

`DIFFERENCES.md` 列出仍存在的平台能力和设备字段取值差异；这些差异不是可以靠字段白名单消除的。
