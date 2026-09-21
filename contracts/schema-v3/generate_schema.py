#!/usr/bin/env python3
"""Generate the portable JSON shape from the versioned public contract."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTRACT = json.loads((ROOT / "contract.json").read_text())
TYPES = CONTRACT["manifest"]["valueTypes"]
MV = CONTRACT["manifest"]["validation"]
UV = CONTRACT["ui"]["validation"]


def obj(properties, required=(), *, extra=None):
    if extra is None:
        extra = CONTRACT["compatibility"]["unknownObjectFields"] == "warn"
    return {"type": "object", "properties": properties, "required": list(required),
            "additionalProperties": extra}


def arr(items, **kwargs):
    return {"type": "array", "items": items, **kwargs}


string = {"type": "string"}
number = {"type": "number"}
boolean = {"type": "boolean"}
scalar = {"type": ["string", "number", "boolean"]}
ui_value = {"oneOf": [scalar, arr(string)]}
path = arr({"type": "string", "minLength": 1}, minItems=1, maxItems=MV["limits"]["rivePropertySegmentsMax"])
ui_path = arr({"type": "string", "minLength": 1}, minItems=1, maxItems=UV["limits"]["propertyPathSegmentsMax"])

condition = obj({"path": string, "equals": scalar, "in": arr(scalar, minItems=1,
                                                               maxItems=UV["limits"]["optionsMax"])}, ["path"])
condition["anyOf"] = [{"required": ["equals"]}, {"required": ["in"]}]
format_shape = obj({"decimals": {"type": "integer", "minimum": UV["limits"]["decimalsMin"], "maximum": UV["limits"]["decimalsMax"]},
                    "prefix": string, "suffix": string, "percent": boolean})
option = obj({"value": scalar, "resource": string, "label": {"type": "string", "minLength": 1,
                                                           "maxLength": UV["limits"]["labelMax"]}}, ["label"])

ui_properties = {
    "id": {"type": "string", "pattern": UV["idPattern"]}, "type": string,
    "label": {"type": "string", "minLength": 1, "maxLength": UV["limits"]["labelMax"]},
    "description": {"type": "string", "maxLength": UV["limits"]["labelMax"]}, "enabled": boolean,
    "visible": boolean, "visibleWhen": condition,
    "flex": {"type": "number", "minimum": 0},
    "text": string, "textPath": string, "format": format_shape,
    "size": {"enum": UV["enums"]["size"]}, "multiline": boolean, "copyable": boolean,
    "hug": boolean, "space": {"type": "number", "minimum": 0, "maximum": UV["limits"]["spaceMax"]},
    "propertyPath": ui_path, "valueType": {"enum": TYPES}, "defaultValue": ui_value,
    "placeholder": string, "lines": {"type": "integer", "minimum": UV["limits"]["linesMin"], "maximum": UV["limits"]["linesMax"]},
    "secure": boolean, "min": number, "max": number, "step": number,
    "options": arr(option, maxItems=UV["limits"]["optionsMax"]), "optionsPath": string,
    "acceptedFileExtensions": arr(string, maxItems=UV["limits"]["extensionsMax"]), "maxBytes": {"type": "integer", "minimum": 0},
    "style": {"enum": UV["enums"]["style"]},
    "layout": {"enum": UV["enums"]["layout"]},
    "surface": {"enum": UV["enums"]["surface"]},
    "action": {"enum": UV["enums"]["action"]},
    "inputMode": {"enum": UV["enums"]["inputMode"]},
    "selectionMin": {"type": "integer", "minimum": 0, "maximum": UV["limits"]["optionsMax"]},
    "selectionMax": {"type": "integer", "minimum": 1, "maximum": UV["limits"]["optionsMax"]},
    "presentation": {"enum": UV["enums"]["presentation"]},
    "children": arr({"$ref": "#/$defs/uiComponent"}, maxItems=UV["limits"]["childrenMax"]),
    "gap": {"type": "number", "minimum": 0},
    "align": {"enum": UV["enums"]["align"]},
    "valign": {"enum": UV["enums"]["valign"]},
    "wrap": boolean, "scroll": boolean,
    "padding": {"type": "number", "minimum": 0, "maximum": UV["limits"]["paddingMax"]},
    "radius": {"type": "number", "minimum": 0, "maximum": UV["limits"]["radiusMax"]},
}
common = CONTRACT["ui"]["commonFields"]
variants = []
for component_type, fields in CONTRACT["ui"]["typeFields"].items():
    allowed = common + fields
    properties = {key: ui_properties[key] for key in allowed}
    properties["type"] = {"const": component_type}
    required = UV["requiredByType"][component_type]
    variant = obj(properties, required)
    alternatives = UV["oneOfRequiredByType"].get(component_type)
    if alternatives:
        variant["anyOf"] = [{"required": fields} for fields in alternatives]
    disallowed_known = sorted(set(ui_properties) - set(allowed))
    variant["propertyNames"] = {"not": {"enum": disallowed_known}}
    variants.append(variant)

layout = obj({
    "fit": {"enum": MV["rive"]["fits"]},
    "alignment": {"enum": MV["rive"]["alignments"]},
    "layoutScaleFactor": {"type": "number", "exclusiveMinimum": 0},
}, ["fit", "alignment"])
rive = obj({"file": {"const": MV["fixedFiles"]["rive"]}, "artboard": {"type": "string", "minLength": 1},
            "stateMachine": {"type": "string", "minLength": 1},
            "viewModel": {"type": "string", "minLength": 1},
            "instance": {"type": "string", "minLength": 1}, "layout": layout},
           ["file", "artboard", "stateMachine", "layout"])
rive["dependentRequired"] = {"viewModel": ["instance"], "instance": ["viewModel"]}

value = obj({"path": {"type": "string", "pattern": MV["patterns"]["packageValuePath"]},
             "type": {"enum": TYPES}, "defaultValue": ui_value,
             "writable": boolean, "persistent": boolean},
            ["path", "type", "writable", "persistent"])
value["if"] = {"properties": {"persistent": {"const": True}}, "required": ["persistent"]}
value["then"] = {"properties": {
    "path": {"pattern": "^" + MV["persistentPathPrefix"].replace(".", "\\.") + "[A-Za-z0-9]+(\\.[A-Za-z0-9]+)*$"},
    "type": {"enum": MV["persistentValueTypes"]},
    "writable": {"const": True}}}
value["allOf"] = []
for value_type, default_schema in (
    ("number", number), ("boolean", boolean), ("list", arr(string)),
    *((item, string) for item in ("string", "color", "enum", "resource", "image", "artboard")),
):
    value["allOf"].append({"if": {"properties": {"type": {"const": value_type}}, "required": ["type"]},
                           "then": {"properties": {"defaultValue": default_schema}}})
for value_type in ("trigger", "viewModel"):
    value["allOf"].append({"if": {"properties": {"type": {"const": value_type}}, "required": ["type"]},
                           "then": {"not": {"required": ["defaultValue"]}}})

transform = obj({"scale": number, "offset": number, "invert": boolean,
                 "clamp": arr(number, minItems=2, maxItems=2)})
binding = obj({"id": {"type": "string", "minLength": 1},
               "qu": string, "quType": {"enum": CONTRACT["manifest"]["bindingSourceTypes"]},
               "rive": path, "riveType": {"enum": CONTRACT["manifest"]["riveTypes"]},
               "direction": {"enum": MV["binding"]["directions"]},
               "mode": {"const": MV["binding"]["mode"]}, "required": boolean, "transform": transform},
              ["id", "qu", "quType", "rive", "riveType", "direction", "mode", "required"])
audio = obj({"id": string, "file": {"type": "string", "pattern": MV["patterns"]["audioFile"]},
             "usage": {"enum": MV["audio"]["usages"]},
             "volume": {"type": "number", "minimum": MV["audio"]["volumeMin"], "maximum": MV["audio"]["volumeMax"]}, "loop": boolean},
            ["id", "file", "usage", "volume", "loop"])

schema = obj({
    "$schema": string,
    "schemaVersion": {"const": 3},
    "id": {"type": "string", "pattern": MV["patterns"]["id"]},
    "version": {"type": "string", "pattern": MV["patterns"]["version"]},
    "name": {"type": "string", "minLength": 1, "maxLength": MV["limits"]["nameMax"]},
    "author": {"type": "string", "minLength": 1, "maxLength": MV["limits"]["authorMax"]},
    "description": {"type": "string", "maxLength": MV["limits"]["descriptionMax"]},
    "preview": {"const": MV["fixedFiles"]["preview"]},
    "rive": rive,
    "javascript": obj({"entry": {"const": MV["fixedFiles"]["javascript"]},
                       "networkDomains": arr({"type": "string", "pattern": MV["patterns"]["networkDomain"]})},
                      ["entry", "networkDomains"]),
    "values": arr(value),
    "capabilities": obj({"observe": arr(string), "trigger": arr({"type": "string", "pattern": "^runtime\\."})},
                        ["observe", "trigger"]),
    "bindings": arr(binding),
    "assets": obj({"audio": arr(audio)}, ["audio"]),
    "ui": arr(obj({"id": {"type": "string", "pattern": UV["idPattern"]}, "title": string,
                   "scope": {"enum": UV["enums"]["scope"]},
                   "components": arr({"$ref": "#/$defs/uiComponent"},
                                     maxItems=UV["limits"]["componentsPerSetMax"]),
                   "density": {"enum": UV["enums"]["density"]}},
                  ["id", "title", "scope", "components"]), maxItems=UV["limits"]["setsMax"]),
}, CONTRACT["manifest"]["required"])
schema.update({"$schema": "https://json-schema.org/draft/2020-12/schema",
               "title": "千机百变资源包 schema v3",
               "$defs": {"uiComponent": {"oneOf": variants}}})

output = json.dumps(schema, ensure_ascii=False, indent=2) + "\n"
target = ROOT / "resource-package.schema.json"
if "--check" in sys.argv:
    if not target.exists() or target.read_text() != output:
        sys.exit("resource-package.schema.json is stale; run generate_schema.py")
else:
    target.write_text(output)
