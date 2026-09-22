/**
 * @id AllNativeUiLab54
 * @description 千机百变动态原生 UI 5.4.1 全量组件与状态测试
 * @interval 0
 * @ui
 * [
 *   {
 *     "slot": "applicationScript",
 *     "id": "ui-lab-layout",
 *     "title": "01 · 布局与联动状态",
 *     "scope": "persistent",
 *     "components": [
 *       {
 *         "id": "layoutIntro",
 *         "type": "text",
 *         "label": "布局说明",
 *         "description": "覆盖 column、row、stack 与相对对齐",
 *         "text": "所有尺寸与间距均由三端原生布局决定。",
 *         "multiline": true,
 *         "copyable": true,
 *         "hug": true
 *       },
 *       {
 *         "id": "stateControls",
 *         "type": "group",
 *         "label": "状态控制",
 *         "layout": "row",
 *         "children": [
 *           {
 *             "id": "showLayout",
 *             "type": "toggle",
 *             "label": "显示测试区",
 *             "description": "测试动态 visible",
 *             "hug": true,
 *             "bindings": {
 *               "value": {
 *                 "path": "app.uiLab54.showSection",
 *                 "type": "boolean",
 *                 "default": true
 *               }
 *             }
 *           },
 *           {
 *             "id": "enableLayout",
 *             "type": "toggle",
 *             "label": "启用测试区",
 *             "description": "测试父组递归禁用",
 *             "hug": true,
 *             "bindings": {
 *               "value": {
 *                 "path": "app.uiLab54.sectionEnabled",
 *                 "type": "boolean",
 *                 "default": true
 *               }
 *             }
 *           },
 *           {
 *             "id": "readOnlyInputs",
 *             "type": "toggle",
 *             "label": "输入只读",
 *             "description": "测试动态 readOnly",
 *             "hug": true,
 *             "bindings": {
 *               "value": {
 *                 "path": "app.uiLab54.readOnly",
 *                 "type": "boolean",
 *                 "default": false
 *               }
 *             }
 *           }
 *         ],
 *         "align": "start",
 *         "valign": "center",
 *         "scroll": false,
 *         "enabled": true,
 *         "visible": true,
 *         "hug": true
 *       },
 *       {
 *         "id": "errorEditor",
 *         "type": "input",
 *         "label": "统一错误文字",
 *         "description": "留空表示无错误；输入后用于动态 error",
 *         "placeholder": "例如：这是测试错误",
 *         "inputMode": "text",
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.errorText",
 *             "type": "string",
 *             "default": ""
 *           }
 *         }
 *       },
 *       {
 *         "id": "dynamicSection",
 *         "type": "group",
 *         "label": "动态布局测试区",
 *         "layout": "column",
 *         "children": [
 *           {
 *             "id": "rowStart",
 *             "type": "group",
 *             "label": "起始对齐",
 *             "layout": "row",
 *             "children": [
 *               {
 *                 "id": "startText",
 *                 "type": "text",
 *                 "label": "起始文本",
 *                 "text": "Start / Top",
 *                 "hug": true
 *               },
 *               {
 *                 "id": "startSpace",
 *                 "type": "spacer",
 *                 "label": "起始弹性占位"
 *               },
 *               {
 *                 "id": "startAction",
 *                 "type": "button",
 *                 "label": "起始按钮",
 *                 "text": "执行",
 *                 "action": "emit",
 *                 "hug": true
 *               }
 *             ],
 *             "description": "align=start，valign=top",
 *             "align": "start",
 *             "valign": "top",
 *             "scroll": false,
 *             "enabled": true,
 *             "hug": true
 *           },
 *           {
 *             "id": "rowCenter",
 *             "type": "group",
 *             "label": "居中对齐",
 *             "layout": "row",
 *             "children": [
 *               {
 *                 "id": "centerText",
 *                 "type": "text",
 *                 "label": "居中文本",
 *                 "text": "Center / Center",
 *                 "hug": true
 *               },
 *               {
 *                 "id": "centerSpace",
 *                 "type": "spacer",
 *                 "label": "居中弹性占位"
 *               },
 *               {
 *                 "id": "centerAction",
 *                 "type": "button",
 *                 "label": "居中按钮",
 *                 "text": "执行",
 *                 "action": "emit",
 *                 "hug": true
 *               }
 *             ],
 *             "description": "align=center，valign=center",
 *             "align": "center",
 *             "valign": "center",
 *             "scroll": false,
 *             "enabled": true,
 *             "hug": true
 *           },
 *           {
 *             "id": "rowEnd",
 *             "type": "group",
 *             "label": "末端对齐",
 *             "layout": "row",
 *             "children": [
 *               {
 *                 "id": "endText",
 *                 "type": "text",
 *                 "label": "末端文本",
 *                 "text": "End / Bottom",
 *                 "hug": true
 *               },
 *               {
 *                 "id": "endSpace",
 *                 "type": "spacer",
 *                 "label": "末端弹性占位"
 *               },
 *               {
 *                 "id": "endAction",
 *                 "type": "button",
 *                 "label": "末端按钮",
 *                 "text": "执行",
 *                 "action": "emit",
 *                 "hug": true
 *               }
 *             ],
 *             "description": "align=end，valign=bottom",
 *             "align": "end",
 *             "valign": "bottom",
 *             "scroll": false,
 *             "enabled": true,
 *             "hug": false
 *           },
 *           {
 *             "id": "stackDemo",
 *             "type": "group",
 *             "label": "叠加布局",
 *             "layout": "stack",
 *             "children": [
 *               {
 *                 "id": "stackBase",
 *                 "type": "text",
 *                 "label": "叠加底层",
 *                 "text": "底层原生文本",
 *                 "multiline": false,
 *                 "copyable": false,
 *                 "hug": true
 *               },
 *               {
 *                 "id": "stackTop",
 *                 "type": "text",
 *                 "label": "叠加上层",
 *                 "text": "上层原生文本",
 *                 "multiline": false,
 *                 "copyable": true,
 *                 "hug": true
 *               }
 *             ],
 *             "description": "两个原生文本使用 stack 关系布局",
 *             "align": "center",
 *             "valign": "center",
 *             "scroll": false,
 *             "enabled": true,
 *             "hug": true
 *           }
 *         ],
 *         "description": "标签、说明、可见、启用与错误全部经 QVMI 绑定",
 *         "align": "start",
 *         "valign": "top",
 *         "scroll": true,
 *         "enabled": true,
 *         "hug": false,
 *         "bindings": {
 *           "label": {
 *             "path": "app.uiLab54.groupLabel",
 *             "fallback": "动态布局测试区"
 *           },
 *           "description": {
 *             "path": "app.uiLab54.groupDescription",
 *             "fallback": "动态组说明"
 *           },
 *           "visible": {
 *             "path": "app.uiLab54.showSection",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "enabled": {
 *             "path": "app.uiLab54.sectionEnabled",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "error": {
 *             "path": "app.uiLab54.errorText",
 *             "fallback": ""
 *           }
 *         }
 *       }
 *     ]
 *   },
 *   {
 *     "slot": "applicationScript",
 *     "id": "ui-lab-text-buttons",
 *     "title": "02 · 文本与按钮",
 *     "scope": "persistent",
 *     "components": [
 *       {
 *         "id": "plainText",
 *         "type": "text",
 *         "label": "静态文本",
 *         "description": "最小静态文本",
 *         "text": "静态文本内容",
 *         "visible": true,
 *         "multiline": false,
 *         "copyable": false,
 *         "hug": false
 *       },
 *       {
 *         "id": "copyText",
 *         "type": "text",
 *         "label": "可复制多行文本",
 *         "description": "长按或选择后复制",
 *         "text": "第一行\n第二行\n第三行",
 *         "multiline": true,
 *         "copyable": true,
 *         "hug": true
 *       },
 *       {
 *         "id": "dynamicTextEditor",
 *         "type": "input",
 *         "label": "动态文本内容",
 *         "description": "修改后同步到下方文本",
 *         "placeholder": "输入动态文字",
 *         "inputMode": "text",
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.dynamicText",
 *             "type": "string",
 *             "default": "动态文本"
 *           }
 *         }
 *       },
 *       {
 *         "id": "dynamicText",
 *         "type": "text",
 *         "label": "动态文本",
 *         "description": "bindings.text 与 bindings.visible",
 *         "copyable": true,
 *         "multiline": true,
 *         "hug": true,
 *         "bindings": {
 *           "text": {
 *             "path": "app.uiLab54.dynamicText",
 *             "fallback": "动态文本"
 *           },
 *           "visible": {
 *             "path": "app.uiLab54.showSection",
 *             "fallback": true,
 *             "equals": true
 *           }
 *         }
 *       },
 *       {
 *         "id": "buttonTextEditor",
 *         "type": "input",
 *         "label": "动态按钮文字",
 *         "description": "修改后同步到动态按钮",
 *         "placeholder": "按钮文字",
 *         "inputMode": "text",
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.buttonText",
 *             "type": "string",
 *             "default": "动态执行"
 *           }
 *         }
 *       },
 *       {
 *         "id": "emitButton",
 *         "type": "button",
 *         "label": "普通按钮",
 *         "description": "测试 emit 点击",
 *         "text": "执行操作",
 *         "action": "emit",
 *         "visible": true,
 *         "enabled": true,
 *         "hug": true
 *       },
 *       {
 *         "id": "dynamicButton",
 *         "type": "button",
 *         "label": "动态按钮",
 *         "description": "动态文字、显示、启用和错误",
 *         "text": "动态执行",
 *         "action": "emit",
 *         "visible": true,
 *         "enabled": true,
 *         "hug": false,
 *         "bindings": {
 *           "text": {
 *             "path": "app.uiLab54.buttonText",
 *             "fallback": "动态执行"
 *           },
 *           "visible": {
 *             "path": "app.uiLab54.showSection",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "enabled": {
 *             "path": "app.uiLab54.sectionEnabled",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "error": {
 *             "path": "app.uiLab54.errorText",
 *             "fallback": ""
 *           }
 *         }
 *       },
 *       {
 *         "id": "disabledButton",
 *         "type": "button",
 *         "label": "禁用按钮",
 *         "description": "静态 enabled=false",
 *         "text": "不可点击",
 *         "action": "emit",
 *         "enabled": false,
 *         "hug": true
 *       },
 *       {
 *         "id": "fileButton",
 *         "type": "button",
 *         "label": "选择文件",
 *         "description": "唤起系统文件选择器",
 *         "text": "选择 JSON 或文本文件",
 *         "action": "pickFile",
 *         "acceptedFileExtensions": [
 *           ".json",
 *           ".txt"
 *         ],
 *         "maxBytes": 1048576,
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.file",
 *             "type": "resource",
 *             "default": ""
 *           }
 *         }
 *       },
 *       {
 *         "id": "resourceButton",
 *         "type": "button",
 *         "label": "选择资源",
 *         "description": "唤起宿主资源选择器",
 *         "text": "选择资源",
 *         "action": "pickResource",
 *         "maxBytes": 10485760,
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.resource",
 *             "type": "resource",
 *             "default": ""
 *           }
 *         }
 *       },
 *       {
 *         "id": "hiddenButton",
 *         "type": "button",
 *         "label": "隐藏按钮",
 *         "description": "静态 visible=false",
 *         "text": "不会显示",
 *         "action": "emit",
 *         "visible": false
 *       }
 *     ]
 *   },
 *   {
 *     "slot": "applicationScript",
 *     "id": "ui-lab-inputs",
 *     "title": "03 · 全部输入模式",
 *     "scope": "persistent",
 *     "components": [
 *       {
 *         "id": "textInput",
 *         "type": "input",
 *         "label": "单行文本",
 *         "description": "覆盖输入框全部动态绑定",
 *         "placeholder": "请输入文字",
 *         "inputMode": "text",
 *         "visible": true,
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.textValue",
 *             "type": "string",
 *             "default": "千机百变"
 *           },
 *           "label": {
 *             "path": "app.uiLab54.inputLabel",
 *             "fallback": "单行文本"
 *           },
 *           "description": {
 *             "path": "app.uiLab54.inputDescription",
 *             "fallback": "动态输入说明"
 *           },
 *           "placeholder": {
 *             "path": "app.uiLab54.placeholder",
 *             "fallback": "请输入文字"
 *           },
 *           "visible": {
 *             "path": "app.uiLab54.showSection",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "enabled": {
 *             "path": "app.uiLab54.sectionEnabled",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "readOnly": {
 *             "path": "app.uiLab54.readOnly",
 *             "fallback": false,
 *             "equals": true
 *           },
 *           "error": {
 *             "path": "app.uiLab54.errorText",
 *             "fallback": ""
 *           }
 *         }
 *       },
 *       {
 *         "id": "multilineInput",
 *         "type": "input",
 *         "label": "多行文本",
 *         "description": "inputMode=multiline",
 *         "placeholder": "请输入多行内容",
 *         "inputMode": "multiline",
 *         "enabled": true,
 *         "hug": false,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.notesValue",
 *             "type": "string",
 *             "default": "第一行\n第二行"
 *           }
 *         }
 *       },
 *       {
 *         "id": "numberInput",
 *         "type": "input",
 *         "label": "数字输入",
 *         "description": "包含最小值、最大值和步长",
 *         "placeholder": "0 至 100",
 *         "inputMode": "number",
 *         "min": 0,
 *         "max": 100,
 *         "step": 0.5,
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.numberValue",
 *             "type": "number",
 *             "default": 25
 *           }
 *         }
 *       },
 *       {
 *         "id": "passwordInput",
 *         "type": "input",
 *         "label": "密码输入",
 *         "description": "inputMode=password",
 *         "placeholder": "请输入密码",
 *         "inputMode": "password",
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.passwordValue",
 *             "type": "string",
 *             "default": ""
 *           }
 *         }
 *       },
 *       {
 *         "id": "readOnlyInput",
 *         "type": "input",
 *         "label": "只读联动输入",
 *         "description": "由第一页的输入只读开关控制",
 *         "placeholder": "切换只读状态",
 *         "inputMode": "text",
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.readOnlyValue",
 *             "type": "string",
 *             "default": "测试只读"
 *           },
 *           "readOnly": {
 *             "path": "app.uiLab54.readOnly",
 *             "fallback": false,
 *             "equals": true
 *           }
 *         }
 *       },
 *       {
 *         "id": "disabledInput",
 *         "type": "input",
 *         "label": "禁用输入",
 *         "description": "静态 enabled=false",
 *         "placeholder": "不可编辑",
 *         "inputMode": "text",
 *         "enabled": false,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.disabledInput",
 *             "type": "string",
 *             "default": "禁用状态"
 *           }
 *         }
 *       }
 *     ]
 *   },
 *   {
 *     "slot": "applicationScript",
 *     "id": "ui-lab-values",
 *     "title": "04 · 开关与滑杆",
 *     "scope": "persistent",
 *     "components": [
 *       {
 *         "id": "toggleOn",
 *         "type": "toggle",
 *         "label": "默认开启",
 *         "description": "boolean=true",
 *         "visible": true,
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.toggleOn",
 *             "type": "boolean",
 *             "default": true
 *           }
 *         }
 *       },
 *       {
 *         "id": "toggleOff",
 *         "type": "toggle",
 *         "label": "默认关闭",
 *         "description": "boolean=false",
 *         "enabled": true,
 *         "hug": false,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.toggleOff",
 *             "type": "boolean",
 *             "default": false
 *           }
 *         }
 *       },
 *       {
 *         "id": "toggleDynamic",
 *         "type": "toggle",
 *         "label": "动态开关",
 *         "description": "覆盖 label、description、visible、enabled、error",
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.toggleDynamic",
 *             "type": "boolean",
 *             "default": true
 *           },
 *           "label": {
 *             "path": "app.uiLab54.toggleLabel",
 *             "fallback": "动态开关"
 *           },
 *           "description": {
 *             "path": "app.uiLab54.toggleDescription",
 *             "fallback": "动态说明"
 *           },
 *           "visible": {
 *             "path": "app.uiLab54.showSection",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "enabled": {
 *             "path": "app.uiLab54.sectionEnabled",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "error": {
 *             "path": "app.uiLab54.errorText",
 *             "fallback": ""
 *           }
 *         }
 *       },
 *       {
 *         "id": "toggleDisabled",
 *         "type": "toggle",
 *         "label": "禁用开关",
 *         "description": "静态 enabled=false",
 *         "enabled": false,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.toggleDisabled",
 *             "type": "boolean",
 *             "default": false
 *           }
 *         }
 *       },
 *       {
 *         "id": "sliderBasic",
 *         "type": "slider",
 *         "label": "基础滑杆",
 *         "description": "静态范围 0 至 100",
 *         "min": 0,
 *         "max": 100,
 *         "step": 1,
 *         "visible": true,
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.sliderValue",
 *             "type": "number",
 *             "default": 50
 *           }
 *         }
 *       },
 *       {
 *         "id": "sliderPercent",
 *         "type": "slider",
 *         "label": "百分比滑杆",
 *         "description": "0 至 1，步长 0.01",
 *         "min": 0,
 *         "max": 1,
 *         "step": 0.01,
 *         "enabled": true,
 *         "hug": false,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.ratioValue",
 *             "type": "number",
 *             "default": 0.5
 *           }
 *         }
 *       },
 *       {
 *         "id": "sliderDynamic",
 *         "type": "slider",
 *         "label": "动态范围滑杆",
 *         "description": "范围、步长、标题、说明、状态和错误均动态绑定",
 *         "min": 0,
 *         "max": 100,
 *         "step": 5,
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.sliderDynamic",
 *             "type": "number",
 *             "default": 25
 *           },
 *           "min": {
 *             "path": "app.uiLab54.sliderMin",
 *             "fallback": 0
 *           },
 *           "max": {
 *             "path": "app.uiLab54.sliderMax",
 *             "fallback": 100
 *           },
 *           "step": {
 *             "path": "app.uiLab54.sliderStep",
 *             "fallback": 5
 *           },
 *           "label": {
 *             "path": "app.uiLab54.sliderLabel",
 *             "fallback": "动态范围滑杆"
 *           },
 *           "description": {
 *             "path": "app.uiLab54.sliderDescription",
 *             "fallback": "动态滑杆说明"
 *           },
 *           "visible": {
 *             "path": "app.uiLab54.showSection",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "enabled": {
 *             "path": "app.uiLab54.sectionEnabled",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "error": {
 *             "path": "app.uiLab54.errorText",
 *             "fallback": ""
 *           }
 *         }
 *       },
 *       {
 *         "id": "sliderDisabled",
 *         "type": "slider",
 *         "label": "禁用滑杆",
 *         "description": "静态 enabled=false",
 *         "min": -10,
 *         "max": 10,
 *         "step": 1,
 *         "enabled": false,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.sliderDisabled",
 *             "type": "number",
 *             "default": 0
 *           }
 *         }
 *       }
 *     ]
 *   },
 *   {
 *     "slot": "applicationScript",
 *     "id": "ui-lab-choices",
 *     "title": "05 · 选择器与占位",
 *     "scope": "persistent",
 *     "components": [
 *       {
 *         "id": "singleString",
 *         "type": "choice",
 *         "label": "字符串单选",
 *         "description": "selectionMax=1，type=string",
 *         "options": [
 *           {
 *             "value": "one",
 *             "label": "选项一"
 *           },
 *           {
 *             "value": "two",
 *             "label": "选项二"
 *           },
 *           {
 *             "value": "three",
 *             "label": "选项三"
 *           }
 *         ],
 *         "selectionMin": 1,
 *         "selectionMax": 1,
 *         "visible": true,
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.choiceString",
 *             "type": "string",
 *             "default": "one"
 *           }
 *         }
 *       },
 *       {
 *         "id": "singleEnum",
 *         "type": "choice",
 *         "label": "枚举单选",
 *         "description": "selectionMax=1，type=enum",
 *         "options": [
 *           {
 *             "value": "normal",
 *             "label": "普通"
 *           },
 *           {
 *             "value": "advanced",
 *             "label": "高级"
 *           },
 *           {
 *             "value": "expert",
 *             "label": "专家"
 *           }
 *         ],
 *         "selectionMin": 1,
 *         "selectionMax": 1,
 *         "enabled": true,
 *         "hug": false,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.choiceEnum",
 *             "type": "enum",
 *             "default": "normal"
 *           }
 *         }
 *       },
 *       {
 *         "id": "advancedText",
 *         "type": "text",
 *         "label": "条件显示文本",
 *         "description": "测试 condition.in",
 *         "text": "高级或专家模式下可见",
 *         "bindings": {
 *           "visible": {
 *             "path": "app.uiLab54.choiceEnum",
 *             "fallback": false,
 *             "in": [
 *               "advanced",
 *               "expert"
 *             ]
 *           }
 *         }
 *       },
 *       {
 *         "id": "singleResource",
 *         "type": "choice",
 *         "label": "资源单选",
 *         "description": "选项使用 resource 字段",
 *         "options": [
 *           {
 *             "label": "资源 A",
 *             "resource": "resource-a"
 *           },
 *           {
 *             "label": "资源 B",
 *             "resource": "resource-b"
 *           }
 *         ],
 *         "selectionMin": 0,
 *         "selectionMax": 1,
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.choiceResource",
 *             "type": "resource",
 *             "default": ""
 *           }
 *         }
 *       },
 *       {
 *         "id": "multiChoice",
 *         "type": "choice",
 *         "label": "自由多选",
 *         "description": "selectionMin=0，selectionMax=3，type=list",
 *         "options": [
 *           {
 *             "value": "rive",
 *             "label": "Rive"
 *           },
 *           {
 *             "value": "native",
 *             "label": "原生组件"
 *           },
 *           {
 *             "value": "qvmi",
 *             "label": "QVMI"
 *           },
 *           {
 *             "value": "adaptive",
 *             "label": "自适应布局"
 *           }
 *         ],
 *         "selectionMin": 0,
 *         "selectionMax": 3,
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.multiChoice",
 *             "type": "list",
 *             "default": [
 *               "rive",
 *               "native"
 *             ]
 *           }
 *         }
 *       },
 *       {
 *         "id": "exactMultiChoice",
 *         "type": "choice",
 *         "label": "固定数量多选",
 *         "description": "必须正好选择两项",
 *         "options": [
 *           {
 *             "value": "a",
 *             "label": "A"
 *           },
 *           {
 *             "value": "b",
 *             "label": "B"
 *           },
 *           {
 *             "value": "c",
 *             "label": "C"
 *           }
 *         ],
 *         "selectionMin": 2,
 *         "selectionMax": 2,
 *         "enabled": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.exactMultiChoice",
 *             "type": "list",
 *             "default": [
 *               "a",
 *               "b"
 *             ]
 *           }
 *         }
 *       },
 *       {
 *         "id": "dynamicChoice",
 *         "type": "choice",
 *         "label": "动态选项",
 *         "description": "覆盖 choice 的所有 bindings",
 *         "options": [
 *           {
 *             "value": "fallback-a",
 *             "label": "回退 A"
 *           },
 *           {
 *             "value": "fallback-b",
 *             "label": "回退 B"
 *           }
 *         ],
 *         "selectionMin": 1,
 *         "selectionMax": 1,
 *         "enabled": true,
 *         "hug": true,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.dynamicChoice",
 *             "type": "string",
 *             "default": "fallback-a"
 *           },
 *           "options": {
 *             "path": "app.uiLab54.dynamicOptions",
 *             "fallback": [
 *               {
 *                 "value": "fallback-a",
 *                 "label": "回退 A"
 *               },
 *               {
 *                 "value": "fallback-b",
 *                 "label": "回退 B"
 *               }
 *             ]
 *           },
 *           "label": {
 *             "path": "app.uiLab54.choiceLabel",
 *             "fallback": "动态选项"
 *           },
 *           "description": {
 *             "path": "app.uiLab54.choiceDescription",
 *             "fallback": "动态选择说明"
 *           },
 *           "visible": {
 *             "path": "app.uiLab54.showSection",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "enabled": {
 *             "path": "app.uiLab54.sectionEnabled",
 *             "fallback": true,
 *             "equals": true
 *           },
 *           "error": {
 *             "path": "app.uiLab54.errorText",
 *             "fallback": ""
 *           }
 *         }
 *       },
 *       {
 *         "id": "disabledChoice",
 *         "type": "choice",
 *         "label": "禁用选择器",
 *         "description": "静态 enabled=false",
 *         "options": [
 *           {
 *             "value": "locked",
 *             "label": "锁定"
 *           }
 *         ],
 *         "selectionMin": 1,
 *         "selectionMax": 1,
 *         "enabled": false,
 *         "bindings": {
 *           "value": {
 *             "path": "app.uiLab54.disabledChoice",
 *             "type": "string",
 *             "default": "locked"
 *           }
 *         }
 *       },
 *       {
 *         "id": "spacerDemo",
 *         "type": "group",
 *         "label": "弹性占位测试",
 *         "layout": "row",
 *         "children": [
 *           {
 *             "id": "spacerLeft",
 *             "type": "text",
 *             "label": "占位左侧",
 *             "text": "左"
 *           },
 *           {
 *             "id": "spacerVisible",
 *             "type": "spacer",
 *             "label": "可见弹性占位",
 *             "description": "使用剩余空间",
 *             "visible": true,
 *             "bindings": {
 *               "visible": {
 *                 "path": "app.uiLab54.showSection",
 *                 "fallback": true,
 *                 "equals": true
 *               }
 *             }
 *           },
 *           {
 *             "id": "spacerRight",
 *             "type": "text",
 *             "label": "占位右侧",
 *             "text": "右"
 *           },
 *           {
 *             "id": "spacerHidden",
 *             "type": "spacer",
 *             "label": "隐藏弹性占位",
 *             "description": "静态 visible=false",
 *             "visible": false
 *           }
 *         ],
 *         "description": "左右文本之间由原生弹性占位分隔",
 *         "align": "center",
 *         "valign": "center",
 *         "scroll": false,
 *         "enabled": true,
 *         "hug": true
 *       }
 *     ]
 *   }
 * ]
 */
let uiValues = [];

defineQuScript({
  onStart(qu) {
    uiValues = [
      qu.viewModel.define('app.uiLab54.showSection', 'boolean', true, { label: '显示测试区', persistent: true }),
      qu.viewModel.define('app.uiLab54.sectionEnabled', 'boolean', true, { label: '启用测试区', persistent: true }),
      qu.viewModel.define('app.uiLab54.readOnly', 'boolean', false, { label: '输入只读', persistent: true }),
      qu.viewModel.define('app.uiLab54.errorText', 'string', '', { label: '统一错误文字', persistent: true }),
      qu.viewModel.define('app.uiLab54.groupLabel', 'string', '动态布局测试区', { label: '动态分组标题', persistent: true }),
      qu.viewModel.define('app.uiLab54.groupDescription', 'string', '动态组说明', { label: '动态分组说明', persistent: true }),
      qu.viewModel.define('app.uiLab54.dynamicText', 'string', '动态文本', { label: '动态文本', persistent: true }),
      qu.viewModel.define('app.uiLab54.buttonText', 'string', '动态执行', { label: '动态按钮文字', persistent: true }),
      qu.viewModel.define('app.uiLab54.file', 'resource', '', { label: '已选文件', persistent: true }),
      qu.viewModel.define('app.uiLab54.resource', 'resource', '', { label: '已选资源', persistent: true }),
      qu.viewModel.define('app.uiLab54.inputLabel', 'string', '单行文本', { label: '输入框标题', persistent: true }),
      qu.viewModel.define('app.uiLab54.inputDescription', 'string', '动态输入说明', { label: '输入框说明', persistent: true }),
      qu.viewModel.define('app.uiLab54.placeholder', 'string', '请输入文字', { label: '输入框占位', persistent: true }),
      qu.viewModel.define('app.uiLab54.textValue', 'string', '千机百变', { label: '单行文本值', persistent: true }),
      qu.viewModel.define('app.uiLab54.notesValue', 'string', '第一行\n第二行', { label: '多行文本值', persistent: true }),
      qu.viewModel.define('app.uiLab54.numberValue', 'number', 25, { label: '数字输入值', persistent: true }),
      qu.viewModel.define('app.uiLab54.passwordValue', 'string', '', { label: '密码输入值', persistent: true }),
      qu.viewModel.define('app.uiLab54.readOnlyValue', 'string', '测试只读', { label: '只读输入值', persistent: true }),
      qu.viewModel.define('app.uiLab54.disabledInput', 'string', '禁用状态', { label: '禁用输入值', persistent: true }),
      qu.viewModel.define('app.uiLab54.toggleOn', 'boolean', true, { label: '默认开启', persistent: true }),
      qu.viewModel.define('app.uiLab54.toggleOff', 'boolean', false, { label: '默认关闭', persistent: true }),
      qu.viewModel.define('app.uiLab54.toggleDynamic', 'boolean', true, { label: '动态开关', persistent: true }),
      qu.viewModel.define('app.uiLab54.toggleDisabled', 'boolean', false, { label: '禁用开关', persistent: true }),
      qu.viewModel.define('app.uiLab54.toggleLabel', 'string', '动态开关', { label: '动态开关标题', persistent: true }),
      qu.viewModel.define('app.uiLab54.toggleDescription', 'string', '动态说明', { label: '动态开关说明', persistent: true }),
      qu.viewModel.define('app.uiLab54.sliderValue', 'number', 50, { label: '基础滑杆', persistent: true }),
      qu.viewModel.define('app.uiLab54.ratioValue', 'number', 0.5, { label: '百分比滑杆', persistent: true }),
      qu.viewModel.define('app.uiLab54.sliderDynamic', 'number', 25, { label: '动态范围滑杆', persistent: true }),
      qu.viewModel.define('app.uiLab54.sliderDisabled', 'number', 0, { label: '禁用滑杆', persistent: true }),
      qu.viewModel.define('app.uiLab54.sliderMin', 'number', 0, { label: '滑杆最小值', persistent: true }),
      qu.viewModel.define('app.uiLab54.sliderMax', 'number', 100, { label: '滑杆最大值', persistent: true }),
      qu.viewModel.define('app.uiLab54.sliderStep', 'number', 5, { label: '滑杆步长', persistent: true }),
      qu.viewModel.define('app.uiLab54.sliderLabel', 'string', '动态范围滑杆', { label: '滑杆标题', persistent: true }),
      qu.viewModel.define('app.uiLab54.sliderDescription', 'string', '动态滑杆说明', { label: '滑杆说明', persistent: true }),
      qu.viewModel.define('app.uiLab54.choiceString', 'string', 'one', { label: '字符串单选', persistent: true }),
      qu.viewModel.define('app.uiLab54.choiceEnum', 'enum', 'normal', { label: '枚举单选', persistent: true }),
      qu.viewModel.define('app.uiLab54.choiceResource', 'resource', '', { label: '资源单选', persistent: true }),
      qu.viewModel.define('app.uiLab54.dynamicChoice', 'string', 'fallback-a', { label: '动态选项', persistent: true }),
      qu.viewModel.define('app.uiLab54.disabledChoice', 'string', 'locked', { label: '禁用选择器', persistent: true }),
      qu.viewModel.define('app.uiLab54.choiceLabel', 'string', '动态选项', { label: '选择器标题', persistent: true }),
      qu.viewModel.define('app.uiLab54.choiceDescription', 'string', '动态选择说明', { label: '选择器说明', persistent: true })
    ];
  },
  onInterval() {},
  onValue() {},
  onUiAction() {},
  onStop() {
    uiValues = [];
  }
});
