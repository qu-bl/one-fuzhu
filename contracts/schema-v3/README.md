# 千机百变公开规则（schema v3）

这里是鸿蒙、Android、Apple 共用的发布源。三端读取 `release.json`，按 SHA-256 校验并缓存
`contract.json`；`resource-package.schema.json` 用于发布时验证资源包结构。公开地址为
`https://qu-bl.github.io/one-fuzhu/contracts/schema-v3/`。

`contract.json` 是资源包、UI、QVMI、JS、归档、资源读取与网络的共同规则，JSON Schema 是由它生成的资源包结构规则。
UI 的允许字段、逐类型必填字段、任选字段组和条件必填规则都由 `contract.ui.validation` 发布；Schema、AI 精简索引和示例发布检查从这里派生，不再各自维护必填表。
制作台的工程名长度、资源包 UI 文案长度、Rive 路径长度和脚本声明入口也由本契约发布。
动态原生 UI 的八种组件、布局、绑定、动作与破坏式升级边界见 [UI_PROTOCOL.md](UI_PROTOCOL.md)。
动态 UI 的所有运行时绑定统一读取所属作用域的 QVMI；宿主只负责响应式映射和原生组件状态，不创建镜像字段。
资源包值绑定使用相对路径：所有资源包 UI 值统一映射到运行时 `package.ui.<path>`；控件 `id` 不参与字段命名。
应用脚本的 `@observe` 只用于 `onValue` 实际消费的字段，UI binding 不需要重复观察。`viewModel.define`
只能使用 `script.valueAccessorTypes`，并与同路径值绑定保持同型；其他 UI 值类型由宿主管理。
每份应用脚本必须声明符合 `script.idPattern` 的唯一 `@id`；该值是字段、UI 和独立存储的身份，文件名只用于保存文件，不能替代 `@id`。更新已有脚本时必须保持 `@id` 不变，否则会被视为另一份脚本并进入新的独立存储。
`qvmi.lifecycle` 规定应用脚本创建的字段和 UI 只在所有者会话存活期间存在，脚本停止时全部释放。
所有脚本的跨冷启动和应用版本更新数据使用独立的 `qu.storage` JSON 存储；需要恢复的每个值都必须由脚本显式读写，任何 QVMI 字段都不承担数据持久化。 初次启动在 `onStart` 恢复；其他设备或外部同步改变存储内容后，宿主调用可选的 `onStorageChange(qu)`，脚本再次显式读取并更新运行时状态。本机存储写入不触发该回调。
`contract.ui.runtimeSemantics` 要求声明只携带值、状态、行为与相对或自适应布局；所有组件外观、尺寸和实际间距均由平台原生默认值决定。
修改规则时同时更新有效／无效样例，运行 `python release.py` 生成发布描述。
GitHub Actions 会重新生成 Schema、校验样例及哈希；检查通过后才应合并。

三端运行时从云端读取资源包字段与格式、UI 字段与限额、公开 QVMI 路径／类型／写权限及展示元数据、
JavaScript 宿主入口与参数、脚本长度、持久化存储限额、归档安全限额、资源读取、网络方法与超时、
资源包显示缩放规则。Rive 编辑器翻译词典仍按需单独下载，但 URL、哈希、容量、词条范围和冷启动加载策略由本契约发布；翻译字体统一使用云端发布的 Noto Sans SC Regular 静态 TTF，三端按契约校验后交给 CanvasKit 缓存与渲染。
AI 生成默认读取
由契约生成的 `ai-rules/generation-profile.json`，完整 Schema 留给宿主校验；发布检查同时验证 AI 资料的哈希与示例字段。
平台执行器仍负责实现入口、检查本地文件和处理设备权限。
静态站点只能发布已审核的规则，不能代替设备端执行文件检查、权限或硬件访问。
规则版本变更若需要新的客户端能力，必须与三端应用版本的发布协调。
AI 生成请求还必须携带宿主实际加载的契约版本和哈希；与发布身份不一致时不得生成或写入文件。

从 3.3.0 起，第三方资源包在对象中附带平台专用字段，或声明当前平台没有的公开能力时，
三端记录兼容性警告并继续加载。已经定义的必需字段、类型和约束仍须正确；某个已知 UI 字段
用在错误的组件上仍是错误。运行时若必需绑定实际无法执行，按运行错误处理；可选绑定失败
记录警告并跳过。云端 `compatibility` 明确发布这四类情况的严重级别，三端读取同一份规则。

云端规则规定可接受的声明和公开能力；原生层仍执行解压、Rive 绘制、音频、传感器、网络传输与权限请求。鸿蒙网络传输器在取得云端契约前使用启动安全限额，加载后切换为契约限额。[平台差异](DIFFERENCES.md)记录不能仅靠字段清单消除的能力和取值差异。

## 可选版权授权说明

资源包可声明 `license` 对象；省略表示未提供授权说明，不自动推定任何授权。
填写时 `copyright`（版权归属）和 `text`（授权说明）均须为含非空文字的字符串，支持中文。
此信息仅作为包内版权及授权告示保留，不在应用界面展示，也不参与购买权益、身份认证或运行权限判断。
无需增加固定文件，资源包格式仍为 `schemaVersion: 3`。

```json
"license": {
  "copyright": "© 2026 作者名称",
  "text": "允许个人使用。商业使用须另行获得作者授权。"
}
```

## 11.0.2：按原生 Rive 属性能力校验

`manifest.riveTypes` 与 QVMI 值类型分开，包含官方的 Font、Blob 属性。Font／Blob 使用
`quType: resource` 传递资源引用；Image、Font、Blob、Artboard 只允许 `toRive`，不把资源引用
作为可回读或可双向同步的普通值。空资源引用由当前客户端交给官方空值接口清除。

检查器读取宿主声明的 `riveWritableResourceTypes` 与平台标识。当前 Apple、鸿蒙可以设置
Font、Blob；Android 的 Compose SDK 可以设置 Font，但没有公开 Blob 写入接口，声明会被拒绝。
没有声明新资源能力的旧宿主也不会被误判为支持 Font／Blob。

List／View Model 的回读继续由宿主能力标识控制；回读只是可读属性投影，跳过只写资源、
Trigger 事件和计算索引，不代表完整实例复制。Trigger 允许分别发送或监听，禁止 `twoWay` 状态同步。
`manifest.validation.binding.runtimeOperations` 记录各平台真实公开操作；没有公开接口的操作不通过其他类型模拟。

规则版本与三端当前实现配套；未升级客户端不会因为拉取新规则而自动获得新的原生能力。

## 11.0.3：按真实实例操作列表

撤销 11.0.1／11.0.2 的整表 JSON 回读及自动双向镜像约定。官方列表是 View Model
实例集合；JSON 可读属性快照不包含身份、资源和内部状态，不能充当实例或用于猜测复用。

资源包脚本通过 `qu.rive.viewModelInstance()` 取得当前根实例，通过
`qu.rive.createViewModelInstance({viewModel, source, instance})` 创建官方来源实例。
引用只在当前脚本及当前 Rive 图有效；停止脚本、切换画板或关闭文件会释放引用和监听。
`instance.close()` 释放脚本自己的包装引用，不删除列表中的实例。

`instance.list(path)` 提供 `size()`、`at(index)`、`append(instance)`、
`insert(index, instance)`、`removeAt(index)`、`remove(instance)`、`swap(a,b)`。
`at` 返回真实列表项引用。`instance.viewModel(path).get()/set(instance)` 读取或替换嵌套实例。
数字、布尔、文本、枚举、颜色属性使用 `.get()`／`.set(value)`／`.observe(listener,onError)`；
Trigger 只有 `.fire()`／`.observe()`，不作为可读取的布尔状态。

`ListProperty` 没有数组整值 setter，也没有跨平台统一的原生结构流，应用不再模拟。
逐项值更新订阅官方属性流；结构在官方增删交换后显式读取，调试台也提供刷新按钮。
同一个实例添加两次会共享状态，创建两个实例则分别持有状态，完全沿用官方行为。

旧 `toRive` 实例描述仍作为显式整值替换输入保留，不承诺保留旧组件状态；旧
`fromRive`／`twoWay` 容器描述会被明确拒绝。普通标量属性的双向绑定继续可用。
需要从列表项同步 QVMI 时，在保留的实例上订阅对应属性，再显式写入已声明的 QVMI 字段；
反向写入同一实例的属性即可，不把整个列表做 JSON 往返。

原生订阅能力通过 `await qu.rive.capabilities()` 查询：目前鸿蒙 `listObserve` 为真，
Apple／Android 为假；`nestedObserve` 均为假。只有实际公开了结构订阅的宿主可调用
`instance.list(path).observe(listener,onError)`，其他宿主明确拒绝，绝不以定时器模拟。
图片、字体、Blob、画板通过对应 `.set(resourceReference)` 赋值，空字符串清空；
Android 的 `blobSet` 为假，沿用 SDK 限制。资源属性不提供 `.get()` 或 `.observe()`。
所有属性通知遵守官方状态机／画板推进与帧消息处理时机，不把 setter 的调用当作已收到 Rive 通知。
Trigger 事件回调不携带伪造的布尔状态；重复事件不参与 QVMI 状态去重。

## 11.0.4：JS 高级对象与共享 Worker

本版补全 script.rive 的公开方法、参数、平台能力矩阵、对象归属与释放语义。
当前播放器的元数据、播放、全局实例、资源解码、语义与输入，以及独立文件/画板/状态机、
离屏原始像素输出、共享 Worker 均按已实现的官方接口记录。详见 [RIVE_JS.md](RIVE_JS.md)。
不新增 hostOperations，不改变 schemaVersion，不修改 QVMI/UI 或现有三种连接方式。
规则仅发布说明和检查依据；旧客户端不会自动增加原生能力，脚本必须先查询能力。
