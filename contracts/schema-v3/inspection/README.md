# 共享规则检查器

应用脚本与资源包制作台检查器、资源包导入与导出预检、动态 UI 声明共用 `contract.json.inspection.program`。它随宿主契约一起下载、校验和缓存；三端不另建下载链路，也不内置一份兜底规则。没有可用规则时明确报告未就绪。

- JSON Schema：字段结构、类型、必填、枚举和长度。
- inspector.mjs：字段关联、绑定方向、UI 上下文、脚本入口及注解。
- Acorn：只解析作者脚本，不执行作者脚本。
- 三端桥接：在独立 JavaScript 引擎中执行共享检查器，传入文本及文件就绪信息，展示 errors / warnings / waiting。

附加平台字段只产生 warning，不参与导出按钮的阻塞条件。物理文件、Rive 加载、原生权限与运行时值检查仍在本机。此检查器不是代码执行测试，也不能证明脚本运行结果正确。

三端已删除这几条路径重复的声明规则判断。本地保留原生模型解码、资源文件检查，以及运行时 QVMI 所有权、可写性、实际 Rive 属性和系统权限判断。UI 默认 scope、绑定 fallback 和空说明由共享检查器规范化后返回。规则文件不随应用内置；安卓测试目录中的契约仅供测试，不进入安装包。

请求 `manifest` 返回 `document`，请求 `ui` 返回 `uiSets`，请求 `applicationScript` 返回 `metadata`；只有 errors 为空时才可使用这些数据。警告不影响使用。平台标识仅用于能力可用性警告，不改变公共字段规范。

## 更新与验证

在仓库根目录执行：

```sh
python3 contracts/schema-v3/generate_schema.py
npm ci --ignore-scripts --prefix contracts/schema-v3/inspection
npm run build --prefix contracts/schema-v3/inspection
npm test --prefix contracts/schema-v3/inspection
python3 contracts/schema-v3/generate_ai_profile.py
bash tools/update-rules.sh
python3 contracts/schema-v3/release.py
```

发布检查会核对程序来源摘要、重新构建对比并运行合法/非法样例。修改宿主规则需要同步契约版本及 AI 索引的契约版本；翻译发布版本独立。

新客户端依赖包含检查器的契约（10.4.0 起）。发布顺序为先云端、后客户端；旧客户端忽略新增检查器字段。

## 新建模板

10.5.0 起，`contract.json.templates` 提供 `applicationScript`、`packageManifest`、`packageScript` 文本。三端新建应用脚本时仅替换 `{{identity}}`；安卓制作台原有的默认清单和脚本也从这里读取。模板不另外下载，不在客户端内置备用副本，不改变其他端空工程的创建行为。发布测试会验证模板及其组合，防止模板与规则不同步。

安卓资源包运行入口使用共享声明检查；WebDAV 恢复使用与导入相同的声明及文件检查，再安装资源包。仅用于列表展示的元数据读取不重复执行预检。

## 适用边界

共用检查引擎不代表所有入口使用相同约束。应用脚本检查 `defineQuScript` 与身份注解；资源包脚本检查 `defineResourcePackage`。资源包 UI 的标题、说明、包内资源路径和字段关联要求仅用于资源包；应用脚本 UI 使用挂载位置及运行时资源标识。10.5.1 修正了将包内 `assets/` 路径限制误用于应用脚本资源选项的问题，并增加两种上下文的对照测试。原生资源标识的可用性与所有权仍由宿主运行时处理。

注解解析只读取 `@ui` JSON 之前的注释部分。UI 文案内出现的 `@id`、`@observe`、`@interval` 等文字不会改变脚本身份、订阅和定时设置。
