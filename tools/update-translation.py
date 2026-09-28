#!/usr/bin/env python3
"""Publish metadata for translation only; never bump host contracts or AI versions."""
import datetime
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
contract_path = ROOT / 'contracts/schema-v3/contract.json'
contract = json.loads(contract_path.read_text())
rules = contract['translation']['riveEditor']
changed = False
for filename, key in [('translation.json', 'sha256'), ('translation.js', 'scriptSha256'),
                      ('fonts/NotoSansSC-Regular.ttf', 'fontSha256')]:
    data = (ROOT / 'rive-editor' / filename).read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    changed |= rules.get(key) != digest
    rules[key] = digest
    if key == 'fontSha256':
        changed |= rules.get('fontBytes') != len(data)
        rules['fontBytes'] = len(data)
if changed:
    rules['version'] = datetime.datetime.now().astimezone().strftime('%Y.%m.%d-%H%M%S')
    contract_path.write_text(json.dumps(contract, ensure_ascii=False, indent=2) + '\n')
release_path = ROOT / 'contracts/schema-v3/release.json'
release = json.loads(release_path.read_text())
release['files']['contract.json'] = hashlib.sha256(contract_path.read_bytes()).hexdigest()
release_path.write_text(json.dumps(release, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'rive-editor/release.json').write_text(json.dumps(rules, ensure_ascii=False, indent=2) + '\n')
print('Translation version:', rules['version'], '(updated)' if changed else '(unchanged)')
