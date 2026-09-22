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


def verify_ui_generation_rules(contract):
    ui = contract["ui"]
    validation = ui["validation"]
    types = set(ui["typeFields"])
    required = validation.get("requiredByType", {})
    alternatives = validation.get("oneOfRequiredByType", {})
    conditions = validation.get("requiredWhen", [])
    bindings_by_type = validation.get("bindingsByType", {})
    required_bindings = validation.get("requiredBindingsByType", {})
    binding_kinds = validation.get("bindingKinds", {})
    semantics = validation.get("valueSemantics", {})
    if set(bindings_by_type) != types or set(required_bindings) != types:
        raise ValueError("ui binding matrices must cover every component type exactly once")
    known_bindings = set(binding_kinds)
    for name in types:
        allowed_bindings = bindings_by_type[name]
        if len(allowed_bindings) != len(set(allowed_bindings)) or not set(allowed_bindings).issubset(known_bindings):
            raise ValueError(f"ui.bindingsByType is invalid: {name}")
        if not set(required_bindings[name]).issubset(allowed_bindings):
            raise ValueError(f"ui.requiredBindingsByType is invalid: {name}")
    if set(required) != types:
        raise ValueError("ui.requiredByType must cover every component type exactly once")
    for name, fields in required.items():
        allowed = set(ui["commonFields"] + ui["typeFields"][name])
        if not fields or len(fields) != len(set(fields)) or not set(fields).issubset(allowed):
            raise ValueError(f"ui.requiredByType is invalid: {name}")
        if not {"id", "type"}.issubset(fields):
            raise ValueError(f"ui.requiredByType omits common identity fields: {name}")
    if not set(alternatives).issubset(types):
        raise ValueError("ui.oneOfRequiredByType references an unknown component type")
    for name, groups in alternatives.items():
        allowed = set(ui["commonFields"] + ui["typeFields"][name])
        if not groups or any(not group or not set(group).issubset(allowed) for group in groups):
            raise ValueError(f"ui.oneOfRequiredByType is invalid: {name}")
    ids = [rule.get("id") for rule in conditions]
    if not ids or len(ids) != len(set(ids)) or any(not isinstance(item, str) or not item for item in ids):
        raise ValueError("ui.requiredWhen must have unique nonempty ids")
    known_fields = set(ui["commonFields"])
    for fields in ui["typeFields"].values():
        known_fields.update(fields)
    for rule in conditions:
        if not isinstance(rule.get("when"), dict) or not rule["when"]:
            raise ValueError(f"ui.requiredWhen has no condition: {rule['id']}")
        for key in ("required", "forbidden"):
            fields = rule.get(key, [])
            if len(fields) != len(set(fields)) or not set(fields).issubset(known_fields):
                raise ValueError(f"ui.requiredWhen has invalid {key}: {rule['id']}")
    expected_semantics = {
        "defaultRequired": True,
        "typesByComponent": {"toggle": ["boolean"], "slider": ["number"]},
        "inputTypesByMode": {"text": ["string"], "multiline": ["string"],
                             "number": ["number"], "password": ["string"]},
        "choiceSingleTypes": ["string", "enum", "resource"],
        "choiceMultipleTypes": ["list"],
        "buttonValueActions": ["pickFile", "pickResource"],
        "buttonValueTypes": ["resource"],
        "maxBytesMinimum": 1,
        "sliderRequiresRange": True,
        "sliderRangeOrder": "min<max",
        "sliderStepPositive": True,
        "sliderStepAtMostRange": True,
        "selectionMinDefault": 0,
        "selectionMinAtMostMax": True,
    }
    if semantics != expected_semantics:
        raise ValueError("ui.valueSemantics is incomplete")
        for key in ("requiredBindings", "forbiddenBindings"):
            fields = rule.get(key, [])
            if len(fields) != len(set(fields)) or not set(fields).issubset(known_bindings):
                raise ValueError(f"ui.requiredWhen has invalid {key}: {rule['id']}")


def condition_matches(when, facts):
    return all(facts.get(key) == value for key, value in when.items())


def verify_example_component(component, contract, owner):
    ui = contract["ui"]
    validation = ui["validation"]
    component_type = component.get("type")
    if component_type not in ui["typeFields"]:
        raise ValueError(f"AI component example has unknown type: {owner}")
    allowed = set(ui["commonFields"] + ui["typeFields"][component_type])
    unknown = set(component) - allowed
    if unknown:
        raise ValueError(f"AI component example has fields outside contract: {owner}: {sorted(unknown)}")
    missing = set(validation["requiredByType"][component_type]) - set(component)
    if missing:
        raise ValueError(f"AI component example misses required fields: {owner}: {sorted(missing)}")
    alternatives = validation["oneOfRequiredByType"].get(component_type, [])
    if alternatives and not any(set(group).issubset(component) for group in alternatives):
        raise ValueError(f"AI component example misses required alternative: {owner}")
    bindings = component.get("bindings", {})
    unknown_bindings = set(bindings) - set(validation["bindingsByType"][component_type])
    missing_bindings = set(validation["requiredBindingsByType"][component_type]) - set(bindings)
    if unknown_bindings or missing_bindings:
        raise ValueError(f"AI component example has invalid bindings: {owner}")
    action = component.get("action")
    value_control = component_type in validation["inputTypes"] or (component_type == "button" and action != "emit")
    facts = {
        "context": "resourcePackage",
        "hosting": "selfDrawn",
        "scope": "runtime" if component_type == "button" and action == "emit" else "persistent",
        "slot": None,
        "type": component_type,
        "action": action,
        "valueControl": value_control,
    }
    for rule in validation["requiredWhen"]:
        if not condition_matches(rule["when"], facts):
            continue
        missing = set(rule.get("required", [])) - set(component)
        forbidden = set(rule.get("forbidden", [])) & set(component)
        missing_bound = set(rule.get("requiredBindings", [])) - set(bindings)
        forbidden_bound = set(rule.get("forbiddenBindings", [])) & set(bindings)
        alternatives = rule.get("oneOf", [])
        has_alternative = not alternatives or any(
            (item.startswith("bindings.") and item.removeprefix("bindings.") in bindings) or
            (not item.startswith("bindings.") and item in component) for item in alternatives)
        if missing or forbidden or missing_bound or forbidden_bound or not has_alternative or \
                (rule.get("allowedScopes") and facts["scope"] not in rule["allowedScopes"]):
            raise ValueError(f"AI component example violates {rule['id']}: {owner}")
    for index, child in enumerate(component.get("children", [])):
        verify_example_component(child, contract, f"{owner}.children[{index}]")


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
    if not isinstance(contract["builder"]["projectNameMax"], int) or contract["builder"]["projectNameMax"] < 1:
        raise ValueError("builder project name limit must be positive")
    builder_pattern = contract["builder"]["projectNamePattern"]
    if not builder_pattern.startswith("^") or not builder_pattern.endswith("$"):
        raise ValueError("builder project name pattern must cover the complete name")
    re.compile(builder_pattern)
    if not re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", manifest_validation["packageScriptEntryFunction"]):
        raise ValueError("package script entry function must be a JavaScript identifier")
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
    if manifest_validation.get("persistentPathPrefix") != "package.storage." or \
            manifest_validation.get("runtimePathPrefix") != "package.ui.":
        raise ValueError("resource-package UI value namespaces are incomplete")
    if set(ui_validation["inputTypes"]) - set(contract["ui"]["typeFields"]):
        raise ValueError("input UI type is not a component type")
    verify_ui_generation_rules(contract)
    if contract["ui"].get("runtimeSemantics") != {
        "dynamicBindingTransport": "qvmi",
        "bindingScope": "owner",
        "observeUniquePathsPerComponent": True,
        "reevaluateAllBindingsForChangedPath": True,
        "republishDerivedUiState": False,
        "nativeComponents": True,
        "groupDisabledRecursively": True,
        "nativeComponentIntersectionOnly": True,
        "customDrawingAllowed": False,
        "declarationCarriesAppearance": False,
        "appearancePolicy": "platformDefaultOnly",
        "layoutPolicy": "adaptiveRelativeOnly",
        "absoluteLayoutValuesAllowed": False,
    }:
        raise ValueError("UI runtime semantics must keep QVMI as the single dynamic data path")
    forbidden_appearance = {"style", "size", "density", "presentation", "format"}
    forbidden_absolute_layout = {"flex", "gap", "padding", "space", "lines"}
    forbidden_legacy_binding = {
        "propertyPath", "valueType", "defaultValue", "textPath", "optionsPath",
        "visibleWhen", "enabledWhen", "loadingPath", "selectedPath",
    }
    if set(contract["ui"].get("forbiddenDeclarationFields", [])) != \
            forbidden_appearance | forbidden_absolute_layout | forbidden_legacy_binding:
        raise ValueError("UI contract must publish every removed declaration field")
    all_ui_fields = set(contract["ui"]["commonFields"] + contract["ui"]["setFields"])
    for fields in contract["ui"]["typeFields"].values():
        all_ui_fields.update(fields)
    if forbidden_appearance & all_ui_fields or forbidden_absolute_layout & all_ui_fields or \
            forbidden_legacy_binding & all_ui_fields or \
            forbidden_appearance & set(ui_validation["enums"]) or \
            "color" in ui_validation["enums"]["inputMode"] or \
            any(field in contract["ui"]["typeFields"]["group"] for field in ("surface", "radius", "wrap")):
        raise ValueError("UI declarations must contain only values, states, and adaptive or relative layout")
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
    expected_generation_checks = {
        "requireHostContractIdentity": True,
        "hostContractMismatchPolicy": "reject",
        "observeOnlyWhenOnValueConsumes": True,
        "uiBindingAloneDoesNotRequireObserve": True,
        "selfOwnedObservedPathRequiresSource": True,
        "definitionTypesFromValueAccessorTypes": True,
        "definitionTypeMustMatchValueBinding": True,
        "uiValueBindingCreatedByHost": True,
    }
    if script["validation"].get("generationChecks") != expected_generation_checks:
        raise ValueError("application script generation checks are incomplete")
    if not script["idPattern"].startswith("^") or not script["idPattern"].endswith("$"):
        raise ValueError("script.idPattern must match a complete identity")
    re.compile(script["idPattern"])
    if not isinstance(script["minimumIntervalMs"], int) or script["minimumIntervalMs"] < 1:
        raise ValueError("script.minimumIntervalMs must be positive")
    qvmi = contract["qvmi"]
    if qvmi.get("lifecycle") != {
        "fieldExistsWhileOwnerActive": True,
        "releaseOnOwnerStop": True,
        "persistentStoresValueOnly": True,
        "restoreAfterRedeclaration": True,
    }:
        raise ValueError("QVMI lifecycle must release fields on stop and persist values only")
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
    expected_ai_files = {"README.md", "guidance.json", "sources.json", "examples.json",
                         "generation-profile.json", "application-script.md", "resource-package.md"}
    if {item["name"] for item in rules["files"]} != expected_ai_files or len(rules["files"]) != len(expected_ai_files):
        raise ValueError("AI release must list exactly the published AI files")
    for item in rules["files"]:
        payload = (ROOT.parent.parent / "ai-rules" / item["name"]).read_bytes()
        if hashlib.sha256(payload).hexdigest() != item["sha256"]:
            raise ValueError(f"AI rule hash is stale: {item['name']}")
    verify_ai_guidance()
    generated_profile = subprocess.run(
        [sys.executable, str(ROOT / "generate_ai_profile.py"), "--check"],
        capture_output=True, text=True, check=False,
    )
    if generated_profile.returncode:
        raise ValueError(generated_profile.stderr.strip() or generated_profile.stdout.strip())
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
    if (sources["ai"].get("guidance") != "ai-rules/guidance.json" or
            sources["ai"].get("examples") != "ai-rules/examples.json" or
            sources["ai"].get("generationProfile") != "ai-rules/generation-profile.json" or
            sources["ai"].get("scenarioGuides") != {
                "applicationScript": "ai-rules/application-script.md",
                "resourcePackage": "ai-rules/resource-package.md",
            } or sources["ai"].get("release") != "ai-rules/rules.json"):
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
    if (guidance.get("schemaVersion") != 3 or guidance.get("audience") != "aiScriptsOnly" or
            guidance.get("contract") != "contracts/schema-v3/contract.json" or
            guidance.get("generationProfile") != "ai-rules/generation-profile.json"):
        raise ValueError("AI guidance must reference the published shared contract")
    shared = guidance.get("shared", {})
    if not isinstance(shared, dict) or set(shared) != {"delivery", "runtime", "qvmi", "network", "quality"}:
        raise ValueError("AI guidance has no shared instructions")
    if any(not isinstance(items, list) or not items or any(not isinstance(item, str) or not item.strip() for item in items)
           for items in shared.values()):
        raise ValueError("AI guidance contains an empty shared instruction")
    workflow = guidance.get("workflow", {})
    if set(workflow) != {"prepare", "generate", "verify"} or any(
            not isinstance(items, list) or not items for items in workflow.values()):
        raise ValueError("AI workflow is incomplete")
    checklist = workflow["verify"]
    if any(not isinstance(item, dict) or set(item) != {"id", "check", "appliesTo"} or
           not item["id"] or not item["check"] or not item["appliesTo"] for item in checklist):
        raise ValueError("AI verify checklist is invalid")
    checklist_ids = {item["id"] for item in checklist}
    required_checks = {
        "host-error-verbatim", "ui-qvmi-dataflow", "host-contract-identity",
        "application-observe-closure", "application-definition-types",
    }
    if len(checklist_ids) != len(checklist) or not required_checks.issubset(checklist_ids):
        raise ValueError("AI verify checklist ids are incomplete")
    host_context = guidance.get("hostContractContext", {})
    if host_context.get("requiredFields") != ["contractVersion", "contractSha256"] or \
            host_context.get("matchAgainst") != [
                "contracts/schema-v3/release.json",
                "ai-rules/generation-profile.json",
                "ai-rules/examples.json",
            ] or "禁止 apply_files" not in host_context.get("mismatchPolicy", ""):
        raise ValueError("AI guidance does not lock generation to the host contract identity")
    feedback = guidance.get("hostErrorFeedback", {})
    if feedback.get("requiredFields") != ["source", "file", "path", "code", "messageRaw"] or \
            "逐字" not in feedback.get("messagePolicy", ""):
        raise ValueError("AI host errors are not preserved verbatim")
    scenarios = guidance.get("scenarios", {})
    if set(scenarios) != {"applicationScript", "resourcePackage"}:
        raise ValueError("AI guidance must cover both generation scenarios")
    for name, expected_files, expected_fields in (
        ("applicationScript", ["application.js"], ["applicationJavaScript"]),
        ("resourcePackage", ["resource-package.json", "main.js"], ["manifestJson", "mainJavaScript"]),
    ):
        scenario = scenarios[name]
        if (scenario.get("files") != expected_files or scenario.get("deliveryFields") != expected_fields or
                scenario.get("guide") != f"ai-rules/{'application-script' if name == 'applicationScript' else 'resource-package'}.md" or
                scenario.get("example") != name or not isinstance(scenario.get("entry"), str) or not scenario.get("rules")):
            raise ValueError(f"AI guidance scenario is invalid: {name}")
    examples = json.loads((ai / "examples.json").read_text(encoding="utf-8"))
    if examples.get("schemaVersion") != 1 or set(examples.get("examples", {})) != {"applicationScript", "resourcePackage"}:
        raise ValueError("AI examples are incomplete")
    if examples.get("contractVersion") != json.loads((ROOT / "contract.json").read_text(encoding="utf-8"))["contractVersion"]:
        raise ValueError("AI examples target a stale contract version")
    schema = json.loads((ROOT / "resource-package.schema.json").read_text(encoding="utf-8"))
    example_manifest = examples["examples"]["resourcePackage"]["manifestJson"]
    errors = list(Draft202012Validator(schema).iter_errors(example_manifest))
    if errors:
        raise ValueError(f"AI resource-package example is invalid: {errors[0].message}")
    contract = json.loads((ROOT / "contract.json").read_text(encoding="utf-8"))
    component_examples = examples["examples"]["resourcePackage"].get("currentUiComponents", {})
    example_types = [component.get("type") for component in component_examples.values()]
    if not set(contract["ui"]["typeFields"]).issubset(example_types):
        raise ValueError("AI component examples must cover every UI type")
    component_validator = Draft202012Validator({
        "$schema": schema["$schema"], "$defs": schema["$defs"], "$ref": "#/$defs/uiComponent"
    })
    for name, component in component_examples.items():
        verify_example_component(component, contract, f"currentUiComponents.{name}")
        component_errors = list(component_validator.iter_errors(component))
        if component_errors:
            raise ValueError(f"AI component example is invalid: {name}: {component_errors[0].message}")
    application_source = examples["examples"]["applicationScript"]["applicationJavaScript"]
    ui_match = re.search(r"(?ms)^\s*\*\s*@ui\s*$\n(?P<body>.*?)^\s*\*/", application_source)
    if ui_match is None:
        raise ValueError("AI application script example must include a checkable @ui declaration")
    ui_text = "\n".join(re.sub(r"^\s*\*\s?", "", line) for line in ui_match.group("body").splitlines()).strip()
    application_sets = json.loads(ui_text)
    if isinstance(application_sets, dict):
        application_sets = [application_sets]
    definition_pairs = re.findall(
        r"viewModel\.define\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]",
        application_source,
    )
    definitions = dict(definition_pairs)
    if len(definitions) != len(definition_pairs):
        raise ValueError("AI application example defines one QVMI path more than once")
    accessor_types = set(contract["script"]["valueAccessorTypes"])
    invalid_definition_types = sorted({field_type for _, field_type in definition_pairs} - accessor_types)
    if invalid_definition_types:
        raise ValueError(f"AI application example uses unsupported definition types: {invalid_definition_types}")
    observed = re.findall(r"(?m)^\s*\*\s*@observe\s+([A-Za-z][A-Za-z0-9.-]*)\s*$", application_source)
    if len(observed) != len(set(observed)):
        raise ValueError("AI application example repeats an @observe path")
    on_value = re.search(r"onValue\s*\([^)]*\)\s*\{(?P<body>.*?)\n\s*\}", application_source, re.S)
    if observed and on_value is None:
        raise ValueError("AI application example observes fields without onValue")
    for path in observed:
        if path.startswith("app.") and path not in definitions:
            raise ValueError(f"AI application example observes an app field without a script definition: {path}")
        if path not in on_value.group("body"):
            raise ValueError(f"AI application example does not consume observed path in onValue: {path}")

    saw_host_managed_value = False

    def verify_application_component(component, owner):
        component_errors = list(component_validator.iter_errors(component))
        if component_errors:
            raise ValueError(f"AI application UI example is invalid: {owner}: {component_errors[0].message}")
        component_type = component["type"]
        value_control = component_type in contract["ui"]["validation"]["inputTypes"] or (
            component_type == "button" and component.get("action") != "emit")
        if value_control:
            binding = component.get("bindings", {}).get("value")
            if not isinstance(binding, dict):
                raise ValueError(f"AI application UI binding has no value declaration: {owner}")
            path = binding.get("path")
            field_type = binding.get("type")
            if field_type in accessor_types:
                if definitions.get(path) != field_type:
                    raise ValueError(f"AI application UI binding has no matching viewModel.define: {owner}")
            else:
                nonlocal saw_host_managed_value
                saw_host_managed_value = True
                if path in definitions or path in observed:
                    raise ValueError(f"AI application host-managed UI value is defined or observed by script: {owner}")
        for index, child in enumerate(component.get("children", [])):
            verify_application_component(child, f"{owner}.children[{index}]")

    for set_index, ui_set in enumerate(application_sets):
        for component_index, component in enumerate(ui_set.get("components", [])):
            verify_application_component(component, f"applicationScript.ui[{set_index}].components[{component_index}]")
    if not saw_host_managed_value:
        raise ValueError("AI application example must cover a host-managed UI value type")
    if "defineResourcePackage" not in examples["examples"]["resourcePackage"]["mainJavaScript"] or \
            "defineQuScript" not in application_source:
        raise ValueError("AI script examples have no required entry")
    for name in ("README.md", "application-script.md", "resource-package.md"):
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
