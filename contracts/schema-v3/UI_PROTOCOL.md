# 动态原生 UI 协议 5.0

三端只实现 `group/text/button/toggle/slider/input/choice/spacer` 八种节点，并使用平台原生组件绘制。
字段、绑定、枚举和限制以 `contract.json` 的 `ui` 段为唯一依据。5.0 是破坏式更新，不解析旧的
`propertyPath`、`valueType`、`defaultValue`、`textPath`、`optionsPath`、`visibleWhen`、
`enabledWhen`、`loadingPath` 或 `selectedPath`。

## 统一绑定

静态值位于组件顶层，动态来源全部位于 `bindings`。路径统一使用点分字符串。

- `value`：`path/type/default`，用于输入、开关、滑杆、选择器和选择文件按钮。
- `text`：`path/fallback/format`，用于文本、按钮文字、标题、说明、占位和错误。
- `condition`：`path + equals/in + fallback`，用于可见、启用、加载、选中和只读。
- `list`：`path/fallback`，用于动态选项。
- `number`：`path/fallback`，用于动态最小值、最大值和步长。

允许的绑定键由 `validation.bindingsByType` 给出，绑定种类由 `bindingKinds` 给出，
逐组件固定必填项由 `requiredByType` 和 `requiredBindingsByType` 给出。未取得动态值时必须使用
`fallback` 或顶层静态值；条件默认值以 `bindingDefaults` 为准。

## 组件职责

| 类型 | 职责 | 动态能力摘要 |
| --- | --- | --- |
| `group` | `column/row/stack` 布局、嵌套、卡片和滚动 | 标题、说明、可见、整体启用、整体加载、错误 |
| `text` | 文本展示 | 文本、可见；`copyable` 启用原生选择复制 |
| `button` | 触发操作或系统文件/资源选择器 | 文字、可见、启用、加载、选中、错误、选择结果 |
| `toggle` | 布尔开关 | 值、标题、说明、可见、启用、错误 |
| `slider` | 范围数值 | 值、范围、步长、标题、说明、可见、启用、错误 |
| `input` | 文本、数字、密码或颜色输入 | 值、标题、说明、占位、可见、启用、只读、错误 |
| `choice` | 单选或多选 | 值、选项、标题、说明、可见、启用、加载、错误 |
| `spacer` | 固定或弹性空白 | 可见 |

按钮样式为 `plain/filled/outlined/tonal/danger`，不提供图标字段。选择器的
`selectionMax=1` 表示单选，大于 1 表示多选。布局继续使用 `gap/padding/align/valign/wrap/scroll/flex/hug`，
由原生布局在窗口、横竖屏和分栏变化时重新测量。

## 失败语义

路径暂时无值时使用回退值；读取失败或类型不匹配时警告并保留上一份有效值。
`loading=true` 禁止相关交互，`group.enabled=false` 递归禁用子组件。未知第三方扩展字段只警告；
已知字段结构、必填项、绑定类型或枚举错误属于协议错误，检查器阻止对应组件运行。
