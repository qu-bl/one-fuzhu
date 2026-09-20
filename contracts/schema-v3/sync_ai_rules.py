#!/usr/bin/env python3
"""Keep the machine facts in both AI prompts derived from the published contract."""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
AI = ROOT.parent.parent / "ai-rules"
START = "<!-- BEGIN GENERATED HOST CONTRACT -->"
END = "<!-- END GENERATED HOST CONTRACT -->"


def appendix(contract):
    manifest = contract["manifest"]
    script = contract["script"]
    qvmi = contract["qvmi"]
    ui = contract["ui"]
    lines = [
        START,
        f"## 云端宿主契约 {contract['contractVersion']}（自动生成）",
        "",
        "以下字段、类型和入口取自同一份 `contracts/schema-v3/contract.json`。"
        "若下文示例或叙述与此清单冲突，以此清单和当前应用能力为准。",
        "",
        "### 资源包与 UI",
        "",
        "- 顶层必填：" + "、".join(f"`{name}`" for name in manifest["required"]),
        "- 顶层可选：" + "、".join(f"`{name}`" for name in manifest["optional"]),
        "", "| 资源包对象 | 允许字段 |", "| --- | --- |",
    ]
    for name, fields in manifest["nested"].items():
        lines.append(f"| `{name}` | " + "、".join(f"`{field}`" for field in fields) + " |")
    lines += [
        "",
        "- UI 公共字段：" + "、".join(f"`{name}`" for name in ui["commonFields"]),
        "",
        "| UI 类型 | 专属字段 |",
        "| --- | --- |",
    ]
    for name, fields in ui["typeFields"].items():
        lines.append(f"| `{name}` | " + ("、".join(f"`{field}`" for field in fields) or "无") + " |")
    mv = manifest["validation"]
    uv = ui["validation"]
    archive = contract["archive"]
    resources = contract["resources"]
    network = contract["network"]
    lines += [
        "", "### 共享行为规则", "",
        "- 固定文件：" + "、".join(f"`{name}={file}`" for name, file in mv["fixedFiles"].items()),
        "- 资源包 ID 格式：`" + mv["patterns"]["id"] + "`；版本格式：`" + mv["patterns"]["version"] + "`",
        "- 持久字段路径前缀：`" + mv["persistentPathPrefix"] + "`；允许类型：" +
        "、".join(f"`{name}`" for name in mv["persistentValueTypes"]),
        "- 绑定方向：" + "、".join(f"`{name}`" for name in mv["binding"]["directions"]) +
        "；模式：`" + mv["binding"]["mode"] + "`；变换仅用于数字到数字的单向绑定。",
        "- 音频用途：" + "、".join(f"`{name}`" for name in mv["audio"]["usages"]) +
        f"；音量范围 {mv['audio']['volumeMin']}～{mv['audio']['volumeMax']}；循环仅供 `{mv['audio']['loopUsage']}`。",
        f"- UI 最多 {uv['limits']['setsMax']} 组，每组最多 {uv['limits']['componentsPerSetMax']} 个控件，"
        f"嵌套最多 {uv['limits']['depthMax']} 层；控件 ID 格式：`{uv['idPattern']}`。",
        "- 自绘资源包 UI 不声明 `slot`；`dialog` 使用运行时 scope，其他挂载位置使用持久 scope。",
        f"- `.qjpkg` 归档最多 {archive['maxFiles']} 个文件，解压总大小最多 {archive['maxTotalBytes']} 字节，"
        f"单文件最多 {archive['maxSingleFileBytes']} 字节，路径最多 {archive['maxPathUtf8Bytes']} 个 UTF-8 字节。",
        "- 归档保留目录：" + "、".join(f"`{name}`" for name in
                                  archive["forbiddenRootSegments"] + archive["forbiddenSegments"]),
        f"- 脚本资源读取上限：文本 {resources['readTextMaxBytes']} 字节、二进制 {resources['readBinaryMaxBytes']} 字节；"
        f"Rive 单个资源 {resources['riveAssetMaxBytes']} 字节。",
        f"- 网络限额：请求／响应分别 {network['requestMaxBytes']}／{network['responseMaxBytes']} 字节，"
        f"上传下载 {network['transferMaxBytes']} 字节，流式响应 {network['streamMaxBytes']} 字节；"
        "仅允许已声明域名的 HTTPS 请求。",
        f"- `@ui` 最多 {script['validation']['uiDeclarationMaxChars']} 个 UTF-16 单元；"
        f"`editor.apply` 最多 {script['validation']['editorApplyMaxUtf16Units']} 个 UTF-16 单元。",
    ]
    lines += ["", "### JavaScript 宿主", "",
              "- 可调用入口：" + "、".join(f"`{name}`" for name in script["hostOperations"]),
              "- 仅应用脚本入口：" + "、".join(f"`{name}`" for name in script["applicationOnlyOperations"]),
              "- QVMI 类型入口：" + "、".join(f"`{name}`" for name in script["valueAccessorTypes"]),
              "- `viewModel.define` 三端通用选项：" + "、".join(f"`{name}`" for name in script["definitionOptions"]["portable"]),
              "- `viewModel.define` 当前仅鸿蒙与 Android 支持的选项：" +
              "、".join(f"`{name}`" for name in script["definitionOptions"]["harmonyAndroidOnly"]),
              "- 脚本注解：" + "、".join(f"`@{name}`" for name in script["annotations"]),
              f"- `@id` 格式：`{script['idPattern']}`；`@interval` 非零时最小值：{script['minimumIntervalMs']} ms",
              "", "| 宿主调用 | 允许的 options 字段 |", "| --- | --- |"]
    for operation, fields in script["operationOptionFields"].items():
        lines.append(f"| `{operation}` | " + "、".join(f"`{field}`" for field in fields) + " |")
    lines += ["", "| 宿主调用 | 公共参数顺序 |", "| --- | --- |"]
    for operation, arguments in script["operationArguments"].items():
        lines.append(f"| `{operation}` | " + ("、".join(f"`{name}`" for name in arguments) or "无") + " |")
    lines += [
              "", "### 公开 QVMI 字段", "", "| 路径 | 类型 |", "| --- | --- |"]
    for path, type_name in qvmi["fieldTypes"].items():
        lines.append(f"| `{path}` | `{type_name}` |")
    lines += ["", "- 可写公开字段：" + "、".join(f"`{path}`" for path in qvmi["writablePublicPaths"])]
    lines += ["", "### 公共触发项", "", "| 路径 | 允许的 payload 字段 |", "| --- | --- |"]
    for path, fields in qvmi["triggerPayloadFields"].items():
        lines.append(f"| `{path}` | " + "、".join(f"`{field}`" for field in fields) + " |")
    lines += ["", "音频字段优先使用 `audio`；`id` 与 `options` 仅供旧脚本兼容。", "", END]
    return "\n".join(lines)


def render(source, generated):
    if START in source or END in source:
        if source.count(START) != 1 or source.count(END) != 1:
            raise ValueError("broken generated host contract markers")
        before, remainder = source.split(START, 1)
        _, after = remainder.split(END, 1)
        return before + generated + after
    title, intro, rest = source.split("\n\n", 2)
    return title + "\n\n" + intro + "\n\n" + generated + "\n\n" + rest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    contract = json.loads((ROOT / "contract.json").read_text(encoding="utf-8"))
    generated = appendix(contract)
    for name in ("application-script.md", "resource-package.md"):
        path = AI / name
        source = path.read_text(encoding="utf-8")
        expected = render(source, generated)
        if args.check:
            if expected != source:
                raise ValueError(f"AI rule is stale: {name}")
        else:
            path.write_text(expected, encoding="utf-8")
    print("PASS AI host facts" if args.check else "updated AI host facts")


if __name__ == "__main__":
    main()
