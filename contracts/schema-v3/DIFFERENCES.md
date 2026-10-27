# 三端已核对的差异

核对范围：schema v3 资源包字段、8 种 UI 组件类型及其字段、79 个公开 QVMI 观察字段（含 `app.theme.brand`）、11 个运行时触发项、30 个 JS 宿主调用和 5 个脚本注解。字段集合已对齐；下列差异是平台能力、值语义或资源处理上的实际区别。

| 范围 | 鸿蒙 | Android | Apple |
| --- | --- | --- | --- |
| `device.ambientLight.normalized` | 环境光传感器更新 | 光传感器更新 | 未注册该字段 |
| `device.proximity.isNear`、`normalized` | 已注册 | 已注册 | iOS 已注册，macOS 不提供 |

`system.deviceInfo` 三端都有 35 个字段，但以下值不能视为同一语义：

| 字段 | Android 当前取值 | Apple 当前取值 | 差异 |
| --- | --- | --- | --- |
| `marketName` | `Build.MODEL` | 设备型号 | 鸿蒙为面向市场的名称；其他两端是型号近似值 |
| `productSeries`、`productModelAlias`、`softwareModel` | `Build.DEVICE`、`Build.MODEL`、`Build.MODEL` | 设备型号、设备型号、系统发行版名称 | 鸿蒙是三个独立设备属性 |
| `productModel`、`hardwareModel`、`chipType` | `Build.PRODUCT`、`Build.HARDWARE`、`Build.SOC_MODEL` | 设备型号、硬件型号、空串 | 来源不同，Apple 芯片类型是占位值 |
| `displayVersion`、`incrementalVersion`、`osFullName`、`versionId` | Android 版本／构建信息 | Apple 系统版本／内核构建号 | 版本体系和来源不同 |
| `osReleaseType`、`securityPatchTag`、`buildType` | Android 构建／补丁信息 | 空串 | Apple 是占位值 |
| `osMajorVersion`、`osSeniorVersion`、`osFeatureVersion` | 拆分 Android 发布版本 | Apple 系统主／次／修订版本 | 鸿蒙提供独立版本字段 |
| `osBuildVersion` | `0` | `0` | 鸿蒙提供构建版本；其他两端占位 |
| `sdkApiVersion`、`sdkMinorApiVersion`、`sdkPatchApiVersion` | 当前 SDK 主版本、`0`、`0` | 均为 `0` | 后两项及 Apple 全部是占位值 |
| `firstApiVersion` | 当前 SDK 版本 | `0` | 鸿蒙表示设备首发 API；其他两端不具备此语义 |
| `performanceClass` | Android 媒体性能等级，设备未声明等级时为 `0` | `0` | 与鸿蒙设备性能分级标准不同 |
| `buildTime` | `Build.TIME` 转为字符串 | 空串 | 鸿蒙提供构建时间；Apple 占位 |
| `distributionOSName`、`distributionOSVersion` | Android 发行信息 | Apple 系统发行信息 | 平台内容不同 |
| `distributionOSApiVersion`、`distributionOSApiName`、`distributionOSReleaseType` | Android SDK 版本数字、`API`、构建类型 | `0`、空串、空串 | API 版本类型已与鸿蒙统一；Android 近似映射，Apple 占位 |
| `deviceColor` | 空串 | 空串 | 鸿蒙提供机身颜色，其他两端占位 |
| `bootCount` | Android 全局启动次数，读取不到为 `0` | `0` | Apple 占位；Android 来源与权限环境不同 |

已修复的差异：Android 补全了 15 个 `deviceInfo` 字段并把 `buildTime` 改为字符串；三端 `distributionOSApiVersion` 统一为数字；鸿蒙与 Apple 补齐名称、说明和默认值类型限制；Apple 补上纯域名检查；鸿蒙递归检查嵌套资源引用；三端脚本 `@id` 现在强制存在并拒绝尾随非空白字符，文件名不再充当身份。三端 QVMI 现在统一为纯运行时数据通道，跨冷启动数据统一使用独立脚本存储。

`qu.viewModel.define` 的完整字段元数据由 `script.definitionOptions.shared` 统一发布：新版 Apple 与 Android、鸿蒙均实现说明、单位、空值、可写性、投递方式、范围、候选值、长度、访问规则和值显示格式。旧版 Apple 仍只读取 `portable`，因此保留其 `label` 安全基线；`harmonyAndroidOnly` 仅保留供旧 Android／鸿蒙读取，名称不再表示新版平台能力差异。云端更新不会为旧 Apple 安装原生能力，使用完整选项需要包含本次实现的 Apple 客户端。

音频触发参数三端统一使用 `audio`／`policy`／`volume`。`id`／`options` 已从公开契约和三端运行路径删除。

本次补齐的共同规范：归档文件数／大小／路径限制，保留目录 `data`、`.rivelab`、`.qu`，Rive 资源和脚本读取限额，网络请求／响应／传输限额，UI 数量与嵌套限制，以及编辑器写入统一以 UTF-16 单元计数。Apple 原先只拒绝 `.qu`，鸿蒙和 Android 原先只拒绝 `.rivelab`；现三端都拒绝两者。Android 现允许 `assets/` 不同目录的同名文件；完整相对路径可引用，裸文件名仅在唯一时注册。

云端 JSON 控制资源包和 UI 声明、QVMI 公开字段及类型／写权限、触发参数、JS 宿主调用及参数、归档、资源与网络限额。资源文件是否存在、Rive 属性是否真实存在、设备权限和传感器值仍由设备端执行。此表不声称运行行为或 UI 绘制已在三端逐项等价。

## Rive JS（11.0.4）

完整平台矩阵由 script.rive.availability 发布。Apple 6.28.1 新 Swift API 不公开 JS 程序化焦点、
指针、键盘/文本注入或全局覆盖清除；Android 11.14.3 Compose 无 Blob 和程序化键盘/文本注入。
鸿蒙对应能力由官方 C++ 适配层开放；不能将它们写成所有平台都支持。
独立对象和当前播放器分别查询能力、使用各自生命周期；共享 Worker 不意味着可以跨 Worker 传引用。
鸿蒙当前播放器与独立状态机的键盘布尔参数命名不同，见 script.rive.parameters.keyInput。
