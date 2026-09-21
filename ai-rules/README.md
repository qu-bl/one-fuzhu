# 千机百变规则资料

这份目录为相关 AI 脚本提供资料入口。短说明见 [`index.md`](index.md)，机器可读的地址见 [`sources.json`](sources.json)。三端应用代码不加载 AI 规则。

| 规则 | 权威资料 | 使用方 |
| --- | --- | --- |
| 资源包 | `contracts/schema-v3/contract.json` 的 `manifest`、`ui`、`qvmi`、`archive`、`resources`、`network`，及生成的 Schema | 三端宿主、相关 AI 脚本 |
| 脚本 | 同一 `contract.json` 的 `script`、`ui`、`qvmi`、`resources`、`network` | 三端宿主、相关 AI 脚本 |
| 翻译 | `rive-editor/translation.json` | 三端 Rive 编辑器 |
| AI | `index.md`；过渡期保留两份场景提示词 | 仅相关 AI 脚本 |

`contracts/schema-v3/release.json` 记录契约文件哈希。AI 脚本应取回并核验实际 JSON 内容，再将所需内容和场景说明一起送入模型。单独传 Markdown 链接，不会让没有联网能力的模型获得规则。一个请求内使用同一版契约。

## 过渡期文件

`application-script.md` 和 `resource-package.md` 目前仍是完整的独立提示词；`rules.json` 为这两个文件提供版本和 SHA-256。保留它们是为了兼容现有读取方式。待相关 AI 脚本改为读取 `sources.json` 并装配 JSON 后，才能将两份长提示词缩为简短的场景说明。此次新增的索引不代表这个切换已经完成。

更新旧提示词时运行 `tools/update-rules.sh`，然后按现有发布流程提交。更新共享契约时运行 `python contracts/schema-v3/release.py`；发布检查会验证契约、索引路径、AI 提示词哈希和资源包样例。
