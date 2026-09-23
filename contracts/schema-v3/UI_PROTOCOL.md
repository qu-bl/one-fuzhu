# 三端动态原生 UI 规范 8.0.2

本规范是 Apple、Android、鸿蒙动态 UI 的共同最小集合。权威机器规则位于
[`contract.json`](contract.json) 的 `ui` 段；本文用于说明它能表达什么。

## 设计原则

- **短板原则**：任一端无法用含义相同的原生能力实现，字段就不进入公共协议。
- **原生组件**：宿主直接使用平台默认组件和默认外观，不接收颜色、字体、圆角、描边、背景、图标等样式。
- **自适应布局**：不接收像素、点、vp、固定间距、固定尺寸或绝对坐标。
- **数据与 UI 分离**：声明描述组件和绑定；动态值通过当前脚本或资源包作用域的 QVMI 传递。
- **运行与持久化分离**：QVMI 和 UI 随所有者停止而释放；跨冷启动数据由脚本显式使用 `qu.storage` 保存。
- **云端为准**：制作台、检查器和运行时读取同一份已校验云端契约。

## 八种组件

所有组件共有 `id`、`type`、非空 `label`，并可带 `description`、`visible`、`bindings`。

| 类型 | 用途 | 可用静态字段 |
| --- | --- | --- |
| `group` | 分组、嵌套和布局 | `children`、`layout`、`align`、`valign`、`scroll`、`enabled` |
| `text` | 展示文字 | `text`、`copyable` |
| `button` | 触发事件或打开系统文件选择器 | `text`、`action`、`acceptedFileExtensions`、`maxBytes`、`enabled`、`hug` |
| `toggle` | 布尔开关 | `enabled`、`hug` |
| `slider` | 范围数值 | `min`、`max`、`step`、`enabled`、`hug` |
| `input` | 文本、多行文本、数字或密码输入 | `placeholder`、`inputMode`、`enabled`、`hug` |
| `choice` | 单选或多选 | `options`、`enabled`、`hug` |
| `spacer` | 使用剩余空间的弹性空白 | 无专属字段 |

`hug` 只用于交互控件，表示按内容自适应；它不是尺寸。`text` 使用原生文字的自然换行，
因此不提供 `multiline`。输入框通过 `inputMode=multiline` 表示多行输入。

## 布局

`group.layout` 必填，只允许以下三种值：

| `layout` | 含义 | 可用布局字段 |
| --- | --- | --- |
| `column` | 子组件从上到下排列 | `align`、`scroll` |
| `row` | 子组件从左到右排列 | 无 |
| `stack` | 子组件叠加 | `align`、`valign` |

- `align`：`start`、`center`、`end`。
- `valign`：`top`、`center`、`bottom`。
- `scroll`：仅 `column` 可启用原生滚动。
- 宿主页面已有纵向滚动时，内层 `scroll=true` 由最近的上级原生滚动容器承接，不再创建同向嵌套滚动。
- `spacer`：使用原生弹性布局占据剩余空间。
- `group.enabled=false`：其全部后代在宿主渲染状态中禁用，不写回 QVMI。

字段放在不适用的布局中属于协议错误。组件间距、边距和实际尺寸全部由平台自行测量。
弹窗的系统安全区和内容边距由三端宿主弹窗容器负责；脚本与资源包不得声明 `padding`、
`margin`、安全区或内容缩进，也不应通过 `spacer` 模拟弹窗边距。

## 宿主原生表现

- 原子 UI 只声明内容、值、状态、动作和相对布局；不声明外观。
- 宿主使用 SwiftUI、Material 3、ArkUI 的原生控件及默认样式，不补画边框、背景、圆角、颜色或阴影。
- 输入、开关、滑杆和选择控件的 `label` 必须由宿主以平台标准的可见标签呈现，并同时保留无障碍名称；按钮显示 `text`，`label` 作为动作语义和无障碍名称。
- 页面、表单、列表和弹窗使用平台原生容器负责安全区、内容边距、滚动和行对齐。原子控件不得自行模拟页面边距。
- 平台默认外观允许不同：例如 iOS 表单中的输入框和普通按钮可以没有独立描边，macOS 与 Material 3 可以具有各自的系统边框或填充。
- 控件组合必须符合平台结构。文件选择按钮作为独立原生按钮调用系统选择器，不嵌入输入框的图标槽位。

## 值控件与选择模式

`input`、`toggle`、`slider`、`choice` 必须声明 `bindings.value`，其中包含
`path`、`type`、`default`。选择文件的按钮也必须声明该绑定。

| 组件 | 值类型规则 |
| --- | --- |
| `toggle` | 仅 `boolean` |
| `slider` | 仅 `number`；必须满足 `min < max`、`step > 0`、`step <= max - min` |
| `input` | `text/multiline/password` 对应 `string`；`number` 对应 `number` |
| `choice` | `string/enum/resource` 自动使用单选；`list` 自动使用多选 |
| 文件按钮 | 仅 `resource`，且 `maxBytes` 为正数 |

`choice` 不再声明选择数量。宿主仅根据绑定类型选择原生单选或多选组件。

## 动态绑定

静态回退值位于组件顶层；动态值位于 `bindings`。路径使用点分字符串。

| 绑定 | 结构 | 用途 |
| --- | --- | --- |
| `value` | `path/type/default` | 值控件和文件选择结果 |
| `text` | `path/fallback` | 文本与按钮文字 |
| `label`、`description`、`placeholder`、`error` | `path/fallback` | 相应文案 |
| `visible`、`enabled`、`readOnly` | `path + equals/in + fallback` | 条件状态 |
| `options` | `path/fallback` | 动态选择项 |
| `min`、`max`、`step` | `path/fallback` | 滑杆动态范围 |

每种组件可用的绑定键由 `validation.bindingsByType` 给出。动态值暂不可用时使用
`fallback` 或静态值；类型错误时警告并保留上一份有效状态。同一组件多次引用同一路径时，宿主只观察一次。
动态 `options` 可由脚本使用 `viewModel.define(path, "json", optionsArray)` 提供；三端必须把该数组建立为
原生 QVMI `list` 字段。`json` 对象仍建立为 `json` 字段。

## 按钮动作

| `action` | 行为 |
| --- | --- |
| `emit` | 触发 `onUiAction`，不允许 `bindings.value` |
| `pickFile` | 打开系统原生文件选择器，把结果写入 `resource` 值绑定 |

文件类型由 `acceptedFileExtensions` 限制，大小由 `maxBytes` 限制。协议不区分“文件”和“资源”两种选择器，
因为三端都由同一类系统原生选择界面完成。

## UI 集合

集合字段为 `id`、`title`、`scope`、`slot`、`components`。

- `scope=persistent`：UI 在所有者本次运行期间持续挂载。
- `scope=runtime`：UI 用于本次临时交互。
- `scope` 只控制挂载周期，不保存数据。
- 应用脚本使用 `slot` 指定宿主位置；资源包自绘面板不声明 `slot`。

## 已删除的差异字段

8.0.0 删除下列公共能力，旧声明会直接校验失败：

- `choice.selectionMin`、`choice.selectionMax`：三端没有一致的数量限制行为。
- `input.min`、`input.max`、`input.step`：三端数字输入行为不一致；这些字段只保留给 `slider`。
- `text.multiline`：三端原生文字均可自然换行，不需要额外开关。
- `group.hug`、`text.hug`：三端容器和文字的测量语义不一致。
- `button.action=pickResource`：与 `pickFile` 没有可观察的共同差异。
- `row.align`、所有非 `stack` 的 `valign`、所有非 `column` 的 `scroll`：三端布局含义不一致。

此前已删除的样式、绝对布局和旧绑定字段继续列在 `ui.forbiddenDeclarationFields` 中。
未知的第三方扩展字段只产生兼容性警告；已知字段用错组件、缺少必填项、类型不匹配或枚举错误会阻止该 UI 运行。
