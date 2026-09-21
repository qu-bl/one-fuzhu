#!/usr/bin/env python3
"""Build and verify the immutable public schema-v3 release descriptor."""

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent
FILES = ("contract.json", "resource-package.schema.json")


def build_release():
    contract = json.loads((ROOT / "contract.json").read_text(encoding="utf-8"))
    return {
        "contractVersion": contract["contractVersion"],
        "schemaVersion": 3,
        "files": {
            name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
            for name in FILES
        },
    }


def verify_schema_and_fixtures():
    contract = json.loads((ROOT / "contract.json").read_text(encoding="utf-8"))
    script = contract["script"]
    if contract.get("compatibility") != {
        "unknownObjectFields": "warn",
        "unavailablePublicCapabilities": "warn",
        "invalidRequiredFields": "error",
        "runtimeCapabilityFailure": "error",
    }:
        raise ValueError("compatibility severity rules are invalid")
    manifest_validation = contract["manifest"]["validation"]
    ui_validation = contract["ui"]["validation"]
    for section, names in (
        (manifest_validation["patterns"], ("id", "version", "identifier", "qvmiPath", "packageValuePath",
                                           "networkDomain", "audioFile", "fileExtension")),
        (ui_validation, ("idPattern",)),
    ):
        for name in names:
            pattern = section[name]
            if not pattern.startswith("^") or not pattern.endswith("$"):
                raise ValueError(f"validation pattern must cover the complete value: {name}")
            re.compile(pattern)
    for section in (manifest_validation, ui_validation):
        if any(not isinstance(value, int) or value < 0 for value in section["limits"].values()):
            raise ValueError("validation limits must be nonnegative integers")
    if manifest_validation["limits"]["uiSetsMax"] != ui_validation["limits"]["setsMax"]:
        raise ValueError("manifest and script UI set limits must agree")
    if set(manifest_validation["persistentValueTypes"]) - set(contract["manifest"]["valueTypes"]):
        raise ValueError("persistent value type is not a package value type")
    if set(ui_validation["inputTypes"]) - set(contract["ui"]["typeFields"]):
        raise ValueError("input UI type is not a component type")
    if set(ui_validation["enums"]["scope"]) != {"persistent", "runtime"}:
        raise ValueError("UI scopes must retain the two runtime lifetimes")
    archive = contract["archive"]
    for name in ("maxFiles", "maxTotalBytes", "maxSingleFileBytes", "maxPathUtf8Bytes"):
        if not isinstance(archive[name], int) or archive[name] <= 0:
            raise ValueError(f"archive limit must be a positive integer: {name}")
    if archive["maxSingleFileBytes"] > archive["maxTotalBytes"]:
        raise ValueError("single archive file cannot exceed total archive size")
    for name in ("forbiddenRootSegments", "forbiddenSegments", "windowsDeviceNames"):
        if not archive[name] or len(archive[name]) != len(set(archive[name])):
            raise ValueError(f"archive list must contain unique values: {name}")
    for section, names in (
        (contract["resources"], ("readTextMaxBytes", "readBinaryMaxBytes", "riveImageMaxBytes", "riveAssetMaxBytes")),
        (contract["network"], ("requestMaxBytes", "responseMaxBytes", "transferMaxBytes", "streamMaxBytes")),
        (script["validation"], ("uiDeclarationMaxChars", "editorApplyMaxUtf16Units", "sourceReadMaxBytes")),
    ):
        for name in names:
            if not isinstance(section[name], int) or section[name] <= 0:
                raise ValueError(f"shared limit must be positive: {name}")
    operations = script["hostOperations"]
    if len(operations) != len(set(operations)) or not operations:
        raise ValueError("script.hostOperations must contain unique operations")
    if set(script["operationArguments"]) != set(operations):
        raise ValueError("every host operation must declare public arguments")
    if any(len(args) != len(set(args)) for args in script["operationArguments"].values()):
        raise ValueError("host operation arguments must be unique")
    if not set(script["applicationOnlyOperations"]).issubset(operations):
        raise ValueError("applicationOnlyOperations must be host operations")
    if not set(script["operationOptionFields"]).issubset(operations):
        raise ValueError("operationOptionFields reference unknown host operations")
    for operation, fields in script["operationOptionFields"].items():
        if len(fields) != len(set(fields)):
            raise ValueError(f"duplicate option for {operation}")
    if len(script["valueAccessorTypes"]) != len(set(script["valueAccessorTypes"])):
        raise ValueError("valueAccessorTypes must be unique")
    if not script["idPattern"].startswith("^") or not script["idPattern"].endswith("$"):
        raise ValueError("script.idPattern must match a complete identity")
    re.compile(script["idPattern"])
    if not isinstance(script["minimumIntervalMs"], int) or script["minimumIntervalMs"] < 1:
        raise ValueError("script.minimumIntervalMs must be positive")
    qvmi = contract["qvmi"]
    public_paths = {f"{group}.{name}" for group, fields in qvmi["observable"].items() for name in fields}
    if len(public_paths) != sum(map(len, qvmi["observable"].values())):
        raise ValueError("public QVMI paths must be unique")
    if set(qvmi["fieldTypes"]) != public_paths:
        raise ValueError("each public QVMI path must declare exactly one type")
    if not set(qvmi["writablePublicPaths"]).issubset(public_paths):
        raise ValueError("writable QVMI paths must be public paths")
    if not set(qvmi["fieldTypes"].values()).issubset(script["valueAccessorTypes"]):
        raise ValueError("public QVMI type has no JavaScript accessor")
    if not set(qvmi["availability"]).issubset(public_paths):
        raise ValueError("QVMI availability references unknown paths")
    if set(qvmi["triggerPayloadFields"]) != set(qvmi["triggers"]):
        raise ValueError("each public trigger must declare payload fields")
    if any(len(fields) != len(set(fields)) for fields in qvmi["triggerPayloadFields"].values()):
        raise ValueError("trigger payload fields must be unique")
    verify_ai_source_map(contract)
    rules = json.loads((ROOT.parent.parent / "ai-rules" / "rules.json").read_text(encoding="utf-8"))
    if rules.get("schemaVersion") != 3:
        raise ValueError("AI release schema must be version 3")
    expected_ai_files = {"README.md", "guidance.json", "sources.json"}
    if {item["name"] for item in rules["files"]} != expected_ai_files or len(rules["files"]) != len(expected_ai_files):
        raise ValueError("AI release must list exactly the published AI files")
    for item in rules["files"]:
        payload = (ROOT.parent.parent / "ai-rules" / item["name"]).read_bytes()
        if hashlib.sha256(payload).hexdigest() != item["sha256"]:
            raise ValueError(f"AI rule hash is stale: {item['name']}")
    verify_ai_guidance()
    generated = subprocess.run(
        [sys.executable, str(ROOT / "generate_schema.py"), "--check"],
        capture_output=True, text=True, check=False,
    )
    if generated.returncode:
        raise ValueError(generated.stderr.strip() or generated.stdout.strip())
    schema = json.loads((ROOT / "resource-package.schema.json").read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    for category in ("valid", "invalid"):
        fixtures = sorted((ROOT / "fixtures" / category).glob("*.json"))
        if not fixtures:
            raise ValueError(f"missing {category} fixtures")
        for path in fixtures:
            manifest = json.loads(path.read_text(encoding="utf-8"))
            accepted = validator.is_valid(manifest)
            if accepted != (category == "valid"):
                raise ValueError(f"wrong fixture result: {path}")


def verify_ai_source_map(contract):
    repository = ROOT.parent.parent
    mapping = json.loads((repository / "ai-rules" / "sources.json").read_text(encoding="utf-8"))
    if mapping.get("schemaVersion") != 1 or mapping.get("baseUrl") != "https://qu-bl.github.io/one-fuzhu/":
        raise ValueError("AI source map version or base URL is invalid")
    sources = mapping.get("sources", {})
    if set(sources) != {"resourcePackage", "script", "translation", "ai"}:
        raise ValueError("AI source map must list all four rule families")
    for name in ("resourcePackage", "script"):
        source = sources[name]
        if source.get("contract") != "contracts/schema-v3/contract.json" or source.get("release") != "contracts/schema-v3/release.json":
            raise ValueError(f"{name} must use the published shared contract")
        if not set(source.get("sections", [])).issubset(contract) or not source["sections"]:
            raise ValueError(f"{name} references an unknown contract section")
    if sources["translation"].get("dictionary") != "rive-editor/translation.json":
        raise ValueError("translation must use the published dictionary")
    if sources["ai"].get("guide") != "ai-rules/README.md":
        raise ValueError("AI guide path is invalid")
    if sources["ai"].get("guidance") != "ai-rules/guidance.json" or sources["ai"].get("release") != "ai-rules/rules.json":
        raise ValueError("AI guidance or release path is invalid")
    if mapping.get("consumers") != {
        "apps": ["resourcePackage", "script", "translation"],
        "aiScripts": {
            "generateApplicationScript": ["script", "ai"],
            "generateResourcePackage": ["resourcePackage", "script", "ai"],
        },
    }:
        raise ValueError("AI source map has an unsupported consumer")
    def check_path(path):
        if not isinstance(path, str) or path.startswith("/") or ".." in Path(path).parts or not (repository / path).is_file():
            raise ValueError(f"AI source path is unavailable: {path}")
    for source in sources.values():
        for key, value in source.items():
            if key == "sections":
                continue
            if isinstance(value, str):
                check_path(value)
            elif isinstance(value, dict):
                for path in value.values():
                    check_path(path)


def verify_ai_guidance():
    ai = ROOT.parent.parent / "ai-rules"
    guidance = json.loads((ai / "guidance.json").read_text(encoding="utf-8"))
    if (guidance.get("schemaVersion") != 1 or guidance.get("audience") != "aiScriptsOnly" or
            guidance.get("contract") != "contracts/schema-v3/contract.json"):
        raise ValueError("AI guidance must reference the published shared contract")
    shared = guidance.get("shared", {})
    if not isinstance(shared, dict) or set(shared) != {"delivery", "runtime", "qvmi", "network", "quality"}:
        raise ValueError("AI guidance has no shared instructions")
    if any(not isinstance(items, list) or not items or any(not isinstance(item, str) or not item.strip() for item in items)
           for items in shared.values()):
        raise ValueError("AI guidance contains an empty shared instruction")
    scenarios = guidance.get("scenarios", {})
    if set(scenarios) != {"applicationScript", "resourcePackage"}:
        raise ValueError("AI guidance must cover both generation scenarios")
    for name, expected_files, expected_fields in (
        ("applicationScript", ["application.js"], ["applicationJavaScript"]),
        ("resourcePackage", ["resource-package.json", "main.js"], ["manifestJson", "mainJavaScript"]),
    ):
        scenario = scenarios[name]
        if (scenario.get("files") != expected_files or scenario.get("deliveryFields") != expected_fields or
                not isinstance(scenario.get("entry"), str) or not scenario.get("rules")):
            raise ValueError(f"AI guidance scenario is invalid: {name}")
    for name in ("README.md",):
        markdown = (ai / name).read_text(encoding="utf-8")
        if len(markdown) > 2500 or "BEGIN GENERATED HOST CONTRACT" in markdown:
            raise ValueError(f"AI guide repeats the contract or is too long: {name}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    verify_schema_and_fixtures()
    expected = json.dumps(build_release(), ensure_ascii=False, indent=2) + "\n"
    path = ROOT / "release.json"
    if args.check:
        if not path.exists() or path.read_text(encoding="utf-8") != expected:
            raise ValueError("release.json is stale; run release.py")
        print("PASS contract schema, fixtures, and release hashes")
    else:
        path.write_text(expected, encoding="utf-8")
        print("updated", path)


if __name__ == "__main__":
    main()
