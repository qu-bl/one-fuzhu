# 三端已核对的差异

核对范围：schema v3 资源包字段、18 种 UI 组件字段、79 个公开 QVMI 观察字段（含 `app.theme.brand`）、11 个运行时触发项、27 个 JS 宿主调用和 5 个脚本注解。字段集合已对齐；下列差异是平台能力、值语义或资源处理上的实际区别。

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
| `performanceClass` | Android 媒体性能等级，旧版本为 `0` | `0` | 与鸿蒙设备性能分级标准不同 |
| `buildTime` | `Build.TIME` 转为字符串 | 空串 | 鸿蒙提供构建时间；Apple 占位 |
| `distributionOSName`、`distributionOSVersion` | Android 发行信息 | Apple 系统发行信息 | 平台内容不同 |
| `distributionOSApiVersion`、`distributionOSApiName`、`distributionOSReleaseType` | Android SDK 版本数字、`API`、构建类型 | `0`、空串、空串 | API 版本类型已与鸿蒙统一；Android 近似映射，Apple 占位 |
| `deviceColor` | 空串 | 空串 | 鸿蒙提供机身颜色，其他两端占位 |
| `bootCount` | Android 全局启动次数，读取不到为 `0` | `0` | Apple 占位；Android 来源与权限环境不同 |

已修复的差异：Android 补全了 15 个 `deviceInfo` 字段并把 `buildTime` 改为字符串；三端 `distributionOSApiVersion` 统一为数字；鸿蒙与 Apple 补齐名称、说明和默认值类型限制；Apple 补上纯域名检查；鸿蒙递归检查嵌套资源引用；三端脚本 `@id` 现在拒绝尾随非空白字符。三端 QVMI 现在统一为纯运行时数据通道，跨冷启动数据统一使用独立脚本存储。

`qu.viewModel.define` 的扩展选项仍有平台差异：`label` 三端通用；`description`、`unit`、`nullable`、`writable`、`delivery`、`range`、`values`、`maxLength`、`access`、`valueLabels`、`displayPrecision`、`displayMultiplier`、`displaySuffix` 目前由鸿蒙和 Android 实现，Apple 不接受。此差异已写入云端契约并由调用端按平台执行。

音频触发参数曾有差异：鸿蒙使用 `audio`／`policy`／`volume`，Android 和 Apple 使用 `id`／`options`。三端现都接受两种写法，云端规则推荐前者并将后者标记为兼容写法。

本次补齐的共同规范：归档文件数／大小／路径限制，保留目录 `data`、`.rivelab`、`.qu`，Rive 资源和脚本读取限额，网络请求／响应／传输限额，UI 数量与嵌套限制，以及编辑器写入统一以 UTF-16 单元计数。Apple 原先只拒绝 `.qu`，鸿蒙和 Android 原先只拒绝 `.rivelab`；现三端都拒绝两者。Android 现允许 `assets/` 不同目录的同名文件；完整相对路径可引用，裸文件名仅在唯一时注册。

云端 JSON 控制资源包和 UI 声明、QVMI 公开字段及类型／写权限、触发参数、JS 宿主调用及参数、归档、资源与网络限额。资源文件是否存在、Rive 属性是否真实存在、设备权限和传感器值仍由设备端执行。此表不声称运行行为或 UI 绘制已在三端逐项等价。
