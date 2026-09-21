# 动态原生 UI 协议 5.1.0

三端只实现 `group/text/button/toggle/slider/input/choice/spacer` 八种节点，并使用平台原生组件绘制。
字段、绑定、枚举和限制以 `contract.json` 的 `ui` 段为唯一依据。5.0 是破坏式更新，不解析旧的
`propertyPath`、`valueType`、`defaultValue`、`textPath`、`optionsPath`、`visibleWhen`、
`enabledWhen`、`loadingPath` 或 `selectedPath`。

## 统一绑定

静态值位于组件顶层，动态来源全部位于 `bindings`。路径统一使用点分字符串。

- `value`：`path/type/default`，用于输入、开关、滑杆、选择器和选择文件按钮。
- `text`：`path/fallback/format`，用于文本、按钮文字、标题、说明、占位和错误。
- `condition`：`path + equals/in + fallback`，用于可见、启用和只读。
- `list`：`path/fallback`，用于动态选项。
- `number`：`path/fallback`，用于动态最小值、最大值和步长。

允许的绑定键由 `validation.bindingsByType` 给出，绑定种类由 `bindingKinds` 给出，
逐组件固定必填项由 `requiredByType` 和 `requiredBindingsByType` 给出。未取得动态值时必须使用
`fallback` 或顶层静态值；条件默认值以 `bindingDefaults` 为准。
每个组件都必须提供非空的静态 `label`，动态 `bindings.label` 只负责运行时替换显示文字，不能代替静态必填值。

## 运行时数据流

所有动态绑定都直接观察当前脚本或资源包所属作用域中的 QVMI 字段。宿主将 QVMI 值转换为原生组件状态，
不得把 `enabled`、文案或父级布局状态重新发布为另一组 QVMI 字段。
同一组件内多个绑定引用同一路径时，宿主只建立一次观察；该路径变化后重新计算所有引用它的绑定。

`group` 的禁用结果属于宿主渲染状态：支持原生继承的平台直接在容器应用，其他平台在渲染树内部传递
计算结果，但不得写回 QVMI。叶子控件自身的有效启用状态由静态 `enabled`、动态 `bindings.enabled`
和祖先分组状态共同决定。

## 组件职责

| 类型 | 职责 | 动态能力摘要 |
| --- | --- | --- |
| `group` | `column/row/stack` 布局、嵌套和滚动 | 标题、说明、可见、整体启用、错误 |
| `text` | 文本展示 | 文本、可见；`copyable` 启用原生选择复制 |
| `button` | 触发操作或系统文件/资源选择器 | 文字、可见、启用、错误、选择结果 |
| `toggle` | 布尔开关 | 值、标题、说明、可见、启用、错误 |
| `slider` | 范围数值 | 值、范围、步长、标题、说明、可见、启用、错误 |
| `input` | 文本、数字、密码或多行文本输入 | 值、标题、说明、占位、可见、启用、只读、错误 |
| `choice` | 单选或多选 | 值、选项、标题、说明、可见、启用、错误 |
| `spacer` | 固定或弹性空白 | 可见 |

按钮只选择宿主提供的原生样式，不覆盖颜色、背景、边框、圆角或字体。`plain` 选择原生文本按钮，
`filled` 选择原生强调按钮。按钮不提供图标、加载态、选中态或平台角色字段；选择状态使用 `toggle`
或 `choice` 表达。选择器的 `selectionMax=1` 表示单选，大于 1 表示多选。布局使用
`gap/padding/align/valign/scroll/flex/hug`，由原生布局在窗口、横竖屏和分栏变化时重新测量。
协议不提供卡片表面、圆角、流式换行或颜色选择器，因为三端没有语义一致的原生实现。

## 失败语义

路径暂时无值时使用回退值；读取失败或类型不匹配时警告并保留上一份有效值。
`group.enabled=false` 递归禁用子组件。未知第三方扩展字段只警告；
已知字段结构、必填项、绑定类型或枚举错误属于协议错误，检查器阻止对应组件运行。
