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
    operations = script["hostOperations"]
    if len(operations) != len(set(operations)) or not operations:
        raise ValueError("script.hostOperations must contain unique operations")
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
    if not set(qvmi["fieldTypes"].values()).issubset(script["valueAccessorTypes"]):
        raise ValueError("public QVMI type has no JavaScript accessor")
    if not set(qvmi["availability"]).issubset(public_paths):
        raise ValueError("QVMI availability references unknown paths")
    if set(qvmi["triggerPayloadFields"]) != set(qvmi["triggers"]):
        raise ValueError("each public trigger must declare payload fields")
    if any(len(fields) != len(set(fields)) for fields in qvmi["triggerPayloadFields"].values()):
        raise ValueError("trigger payload fields must be unique")
    ai_check = subprocess.run(
        [sys.executable, str(ROOT / "sync_ai_rules.py"), "--check"],
        capture_output=True, text=True, check=False,
    )
    if ai_check.returncode:
        raise ValueError(ai_check.stderr.strip() or ai_check.stdout.strip())
    rules = json.loads((ROOT.parent.parent / "ai-rules" / "rules.json").read_text(encoding="utf-8"))
    for item in rules["files"]:
        payload = (ROOT.parent.parent / "ai-rules" / item["name"]).read_bytes()
        if hashlib.sha256(payload).hexdigest() != item["sha256"]:
            raise ValueError(f"AI rule hash is stale: {item['name']}")
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
