#!/usr/bin/env python3
"""Build and verify the immutable public schema-v3 release descriptor."""

import argparse
import hashlib
import json
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
