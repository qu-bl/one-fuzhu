# 千机百变规则资料

短说明见 [`index.md`](index.md)，机器可读的四类资料地址见 [`sources.json`](sources.json)。**AI 规则只供相关 AI 脚本调用，不进入三端应用代码。**

| 规则 | 权威资料 | 使用方 |
| --- | --- | --- |
| 资源包 | `contracts/schema-v3/contract.json` 的 `manifest`、`ui`、`qvmi`、`archive`、`resources`、`network`，及生成的 Schema | 三端宿主、相关 AI 脚本 |
| 脚本 | 同一 `contract.json` 的 `script`、`ui`、`qvmi`、`resources`、`network` | 三端宿主、相关 AI 脚本 |
| 翻译 | `rive-editor/translation.json` | 三端 Rive 编辑器 |
| AI | `guidance.json` 与对应场景的短 Markdown | 仅相关 AI 脚本 |

资源包与脚本规范共用一份契约，避免字段列表在两个提示词中漂移。`contracts/schema-v3/release.json` 为契约和 Schema 提供 SHA-256；`rules.json` 为 AI 资料提供 SHA-256。相关 AI 脚本以后应先核验所需 JSON，再将实际内容放进模型上下文。只传链接不会让没有联网能力的模型获得规则。

`guidance.json` 提炼旧提示词中不属于宿主字段表的生成和交付说明。`application-script.md` 与 `resource-package.md` 现在只说明各场景应读取哪些资料。当前尚无调用这些 AI 规则的脚本，因此这里只预留发布格式；不宣称已经实现实时加载。

更新 AI 资料后运行 `tools/update-rules.sh`；更新共享契约后运行 `python contracts/schema-v3/release.py`。发布检查会验证文件哈希、索引路径、契约和资源包样例。
