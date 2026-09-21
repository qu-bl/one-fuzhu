#!/usr/bin/env python3
"""Generate the compact, model-facing subset of the shared contract."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parent.parent
CONTRACT = json.loads((ROOT / "contract.json").read_text(encoding="utf-8"))


def build_profile():
    manifest = CONTRACT["manifest"]
    ui = CONTRACT["ui"]
    script = CONTRACT["script"]
    validation = ui["validation"]
    return {
        "schemaVersion": 1,
        "contractVersion": CONTRACT["contractVersion"],
        "purpose": "模型生成前使用的精简索引；最终结果仍由宿主使用完整契约和 JSON Schema 校验。",
        "manifest": {
            "required": manifest["required"],
            "optional": manifest["optional"],
            "fixedFiles": manifest["validation"]["fixedFiles"],
            "valueTypes": manifest["valueTypes"],
            "packageScriptEntryFunction": manifest["validation"]["packageScriptEntryFunction"],
        },
        "ui": {
            "runtimeSemantics": ui["runtimeSemantics"],
            "allowedFieldsByType": {
                name: ui["commonFields"] + fields for name, fields in ui["typeFields"].items()
            },
            "requiredByType": validation["requiredByType"],
            "oneOfRequiredByType": validation["oneOfRequiredByType"],
            "requiredWhen": validation["requiredWhen"],
            "bindingsByType": validation["bindingsByType"],
            "bindingKinds": validation["bindingKinds"],
            "bindingDefaults": validation["bindingDefaults"],
            "requiredBindingsByType": validation["requiredBindingsByType"],
            "enums": validation["enums"],
            "limits": validation["limits"],
        },
        "script": {
            "applicationEntryFunction": script["validation"]["entryFunction"],
            "packageEntryFunction": manifest["validation"]["packageScriptEntryFunction"],
            "applicationOnlyOperations": script["applicationOnlyOperations"],
            "hostOperations": script["hostOperations"],
        },
    }


output = json.dumps(build_profile(), ensure_ascii=False, indent=2) + "\n"
target = REPOSITORY / "ai-rules" / "generation-profile.json"
if "--check" in sys.argv:
    if not target.exists() or target.read_text(encoding="utf-8") != output:
        sys.exit("ai-rules/generation-profile.json is stale; run generate_ai_profile.py")
else:
    target.write_text(output, encoding="utf-8")
