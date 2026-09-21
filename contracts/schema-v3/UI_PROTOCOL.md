# 动态原生 UI 协议 4.0

三端只实现八种节点，并使用各平台原生组件绘制。节点树、字段、枚举和限制均以同目录
`contract.json` 的 `ui` 段为准；客户端启动后异步更新契约，制作台、检查器和运行时读取同一份缓存。

## 节点

| `type` | 用途 | 关键参数 |
| --- | --- | --- |
| `group` | 布局和嵌套 | `layout: column/row/stack`、`surface: none/card`、`children`、`gap`、`padding`、`wrap`、`scroll` |
| `text` | 静态或数据文本 | `text` 或 `textPath`、`size`、`format` |
| `button` | 触发操作或唤起系统选择器 | `action: emit/pickFile/pickResource`、`text`、`style`；选择结果写入 `propertyPath` |
| `toggle` | 布尔开关 | `propertyPath`、`valueType: boolean` |
| `slider` | 范围数值 | `min`、`max`、`step`、`propertyPath`、`valueType: number` |
| `input` | 文本、数字、密码或颜色输入 | `inputMode: text/multiline/number/password/color`；`valueType` 必须匹配模式 |
| `choice` | 单选或多选 | `selectionMax: 1` 为单选，大于 1 为多选；`presentation: list/segmented/menu` |
| `spacer` | 固定或弹性空白 | `space` 或公共字段 `flex` |

`group` 可以任意嵌套。`column` 纵向排列，`row` 横向排列并可用 `wrap` 在窄容器内换行，
`stack` 叠加子节点；`align`、`valign`、`flex` 和 `hug` 控制剩余空间。布局以组件实际可用宽度计算，
因此窗口、横竖屏和分栏变化时由原生布局重新测量，不在 JSON 中写设备像素或平台分支。

## 破坏式边界

4.0 不接受 `column`、`row`、`stack`、`card`、`action`、`filePicker`、`number`、`color`、
`singleChoice`、`multiChoice`、`segmented`、`resourceChoice` 或 `divider`。资源包必须直接使用新节点，
三端不提供旧字段迁移、别名或降级渲染。

第三方包的未知平台附加字段仍按兼容策略给出警告。已知旧节点属于协议错误，检查器应阻止该节点运行，
避免三端各自猜测含义。
