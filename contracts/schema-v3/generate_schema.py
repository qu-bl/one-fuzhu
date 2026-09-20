#!/usr/bin/env python3
"""Generate the portable JSON shape from the versioned public contract."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTRACT = json.loads((ROOT / "contract.json").read_text())
TYPES = CONTRACT["manifest"]["valueTypes"]


def obj(properties, required=(), *, extra=False):
    return {"type": "object", "properties": properties, "required": list(required),
            "additionalProperties": extra}


def arr(items, **kwargs):
    return {"type": "array", "items": items, **kwargs}


string = {"type": "string"}
number = {"type": "number"}
boolean = {"type": "boolean"}
scalar = {"type": ["string", "number", "boolean"]}
ui_value = {"oneOf": [scalar, arr(string)]}
path = arr({"type": "string", "minLength": 1}, minItems=1, maxItems=16)

condition = obj({"path": string, "equals": scalar, "in": arr(scalar, minItems=1)}, ["path"])
condition["anyOf"] = [{"required": ["equals"]}, {"required": ["in"]}]
format_shape = obj({"decimals": {"type": "integer", "minimum": 0, "maximum": 6},
                    "prefix": string, "suffix": string, "percent": boolean})
option = obj({"value": scalar, "resource": string, "label": {"type": "string", "minLength": 1}}, ["label"])

ui_properties = {
    "id": {"type": "string", "minLength": 1}, "type": string,
    "label": string, "description": string, "enabled": boolean,
    "visible": boolean, "visibleWhen": condition,
    "flex": {"type": "number", "minimum": 0},
    "text": string, "textPath": string, "format": format_shape,
    "size": {"enum": ["sm", "md", "lg"]}, "multiline": boolean,
    "hug": boolean, "space": {"type": "number", "minimum": 0, "maximum": 200},
    "propertyPath": path, "valueType": {"enum": TYPES}, "defaultValue": ui_value,
    "placeholder": string, "lines": {"type": "integer", "minimum": 1, "maximum": 20},
    "secure": boolean, "min": number, "max": number, "step": number,
    "options": arr(option), "optionsPath": string,
    "acceptedFileExtensions": arr(string), "maxBytes": {"type": "integer", "minimum": 0},
    "style": {"enum": ["normal", "emphasized"]},
    "children": arr({"$ref": "#/$defs/uiComponent"}),
    "gap": {"type": "number", "minimum": 0},
    "align": {"enum": ["start", "center", "end"]},
    "valign": {"enum": ["top", "center", "bottom"]},
    "wrap": boolean, "scroll": boolean,
    "padding": {"type": "number", "minimum": 0, "maximum": 64},
    "radius": {"type": "number", "minimum": 0, "maximum": 64},
}
common = CONTRACT["ui"]["commonFields"]
variants = []
for component_type, fields in CONTRACT["ui"]["typeFields"].items():
    allowed = common + fields
    properties = {key: ui_properties[key] for key in allowed}
    properties["type"] = {"const": component_type}
    variants.append(obj(properties, ["id", "type", "label"]))

layout = obj({
    "fit": {"enum": ["contain", "cover", "fill", "fitWidth", "fitHeight", "none", "scaleDown", "layout"]},
    "alignment": {"enum": ["center", "topLeft", "topCenter", "topRight", "centerLeft", "centerRight",
                            "bottomLeft", "bottomCenter", "bottomRight"]},
    "layoutScaleFactor": {"type": "number", "exclusiveMinimum": 0},
}, ["fit", "alignment"])
rive = obj({"file": {"const": "main.riv"}, "artboard": {"type": "string", "minLength": 1},
            "stateMachine": {"type": "string", "minLength": 1},
            "viewModel": {"type": "string", "minLength": 1},
            "instance": {"type": "string", "minLength": 1}, "layout": layout},
           ["file", "artboard", "stateMachine", "layout"])
rive["dependentRequired"] = {"viewModel": ["instance"], "instance": ["viewModel"]}

value = obj({"path": {"type": "string", "pattern": "^package\\.[A-Za-z0-9]+(\\.[A-Za-z0-9]+)*$"},
             "type": {"enum": TYPES}, "defaultValue": ui_value,
             "writable": boolean, "persistent": boolean},
            ["path", "type", "writable", "persistent"])
value["if"] = {"properties": {"persistent": {"const": True}}, "required": ["persistent"]}
value["then"] = {"properties": {
    "path": {"pattern": "^package\\.storage\\.[A-Za-z0-9]+(\\.[A-Za-z0-9]+)*$"},
    "type": {"enum": ["number", "string", "boolean", "color", "enum", "resource", "image", "list"]},
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
               "direction": {"enum": ["toRive", "fromRive", "twoWay"]},
               "mode": {"const": "latest"}, "required": boolean, "transform": transform},
              ["id", "qu", "quType", "rive", "riveType", "direction", "mode", "required"])
audio = obj({"id": string, "file": {"type": "string", "pattern": "^assets/.+\\.(mp3|m4a|aac|wav|ogg|flac)$"},
             "usage": {"enum": ["effect", "music"]},
             "volume": {"type": "number", "minimum": 0, "maximum": 1}, "loop": boolean},
            ["id", "file", "usage", "volume", "loop"])

schema = obj({
    "$schema": string,
    "schemaVersion": {"const": 3},
    "id": {"type": "string", "pattern": "^[a-z][a-z0-9]*(?:[.-][a-z0-9][a-z0-9-]*)+$"},
    "version": {"type": "string", "pattern": "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?$"},
    "name": {"type": "string", "minLength": 1, "maxLength": 128},
    "author": {"type": "string", "minLength": 1, "maxLength": 128},
    "description": {"type": "string", "maxLength": 1024},
    "preview": {"const": "preview.webp"},
    "rive": rive,
    "javascript": obj({"entry": {"const": "main.js"},
                       "networkDomains": arr({"type": "string", "pattern":
                                              "^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,63}$"})},
                      ["entry", "networkDomains"]),
    "values": arr(value),
    "capabilities": obj({"observe": arr(string), "trigger": arr({"type": "string", "pattern": "^runtime\\."})},
                        ["observe", "trigger"]),
    "bindings": arr(binding),
    "assets": obj({"audio": arr(audio)}, ["audio"]),
    "ui": arr(obj({"id": string, "title": string, "scope": {"enum": ["persistent", "runtime"]},
                   "components": arr({"$ref": "#/$defs/uiComponent"}),
                   "density": {"enum": ["normal", "compact"]}},
                  ["id", "title", "scope", "components"]), maxItems=8),
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
