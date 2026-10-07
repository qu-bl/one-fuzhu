#!/usr/bin/env python3
"""清洗 Rive 编辑器导出的未匹配报告，并把翻译并入词典。

编辑器把画布上渲染过、而词典里没有的每一段文字都记进报告，所以报告里绝大多数
不是界面文案：

  * 快捷键、纯数字、十六进制色值、版本号、链接、邮箱、功能键、体积时长
  * 字体名 —— 字体选择器把每个字体用各自的字形画出来，一次就是几百条
  * 打字中间态 —— 输入法逐字上屏的每一步（zha / zhao / zhao h / zhao hu）
  * 读者自己的内容 —— 文件名、画板名、图层名、他自己写的中文文案

前两类按形态挡掉，第三类按「与更长条目构成前缀链」挡掉，第四类按「已经是中文」
挡掉。剩下的才是真正的界面文案。

用法：
    # 只清洗、看看剩下什么
    python3 tools/import-unmatched-report.py ~/Downloads/rive-editor-unmatched-report.json

    # 清洗并把译文并入词典（会顺带跑 update-translation.py）
    python3 tools/import-unmatched-report.py 报告.json --translations 译文.json

译文.json 是 {键: 中文} 的映射。键要用 {number} 模板形式：运行时的
translateParameterizedText() 会把文本里唯一的数字换成 {number} 再查词典，
所以 {number} items 一条就能同时应付 "2 items" 和 "17 items"。
"""
import argparse
import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DICTIONARY = ROOT / 'rive-editor/translation.json'
FONT_CACHE = Path(__file__).resolve().parent / '.google-fonts.txt'
FONT_URL = 'https://fonts.google.com/metadata/fonts'

CJK = re.compile(r'[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]')


def google_fonts():
    """字体家族名全集。首次运行拉取并缓存，之后离线可用。"""
    if FONT_CACHE.exists():
        return {line for line in FONT_CACHE.read_text(encoding='utf-8').split('\n') if line}
    raw = urllib.request.urlopen(FONT_URL, timeout=30).read().decode('utf-8')
    payload = json.loads(re.sub(r"^\)\]\}'\s*", '', raw))
    families = [item['family'] for item in payload['familyMetadataList']]
    FONT_CACHE.write_text('\n'.join(families) + '\n', encoding='utf-8')
    return set(families)


def shape_noise(text):
    """形态上不可能需要翻译的：符号、数字、色值、快捷键、链接、邮箱等。"""
    return (
        not re.search(r'[A-Za-z]', text)
        or re.fullmatch(r'[\dA-Fa-f]{6,8}', text)
        or re.search(r'[⌘⌥⇧⌃]', text)
        or re.fullmatch(r'\d+(?:F|ms|s|%)', text)
        or re.fullmatch(r'\d+:\d+s', text)
        or re.match(r'^BETA\s', text, re.I)
        or re.match(r'^[:.]', text)
        or re.search(r'https?://', text)
        or re.search(r'[\w.+-]+@[\w.-]+\.[a-z]+', text, re.I)
        or text in ('__proto__', 'prototype', 'constructor')
        or re.fullmatch(r'F\d{1,2}', text)
        or re.fullmatch(r'\d+(?:\.\d+)?\s*(?:KB|MB|GB|B|M|s|ms|%)', text)
        or re.fullmatch(r'\d+\s+times?', text)
    )


def split(entries, fonts):
    """把报告拆成「各类噪声」与「真正的候选」。"""
    texts = list(dict.fromkeys(
        entry['text'].strip() for entry in entries
        if isinstance(entry.get('text'), str) and entry['text'].strip()))
    seen = set(texts)

    def numbered_duplicate(text):
        match = re.fullmatch(r'(.+?)\s+\d+', text)
        return bool(match and match.group(1) in seen)

    def typing_fragment(text):
        # 输入法逐字上屏：自己全小写（或很短），且是另一条更长文本的前缀。
        return (
            len(text) <= 12
            and (text.islower() or len(text) <= 4)
            and any(other != text and other.startswith(text) for other in seen)
        )

    buckets = {
        '形态噪声': [t for t in texts if shape_noise(t)],
        '字体名': [t for t in texts if not shape_noise(t) and t in fonts],
        '打字中间态': [t for t in texts if not shape_noise(t) and t not in fonts and typing_fragment(t)],
        '已是中文': [t for t in texts if not shape_noise(t) and t not in fonts
                    and not typing_fragment(t) and CJK.search(t)],
        '编号副本': [t for t in texts if not shape_noise(t) and t not in fonts
                    and not typing_fragment(t) and numbered_duplicate(t)],
    }
    noise = {t for values in buckets.values() for t in values}
    candidates = [t for t in texts if t not in noise]
    return texts, buckets, candidates


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('report', type=Path, help='rive-editor-unmatched-report.json')
    parser.add_argument('--translations', type=Path,
                        help='{键: 中文} 映射；给了就并入词典并刷新发布元数据')
    args = parser.parse_args()

    entries = json.loads(args.report.read_text(encoding='utf-8'))
    dictionary = json.loads(DICTIONARY.read_text(encoding='utf-8'))
    texts, buckets, candidates = split(entries, google_fonts())

    print(f'报告 {len(texts)} 条，其中：')
    for name, values in buckets.items():
        print(f'  {name}: {len(values)}')

    # 报告可能导出于词典更新之前；已经在词典里的不必再看。
    known = [t for t in candidates if t in dictionary]
    candidates = [t for t in candidates if t not in dictionary]
    if known:
        print(f'  已在词典中（报告早于词典更新）: {len(known)}')
    print(f'\n待判断 {len(candidates)} 条：')
    for text in sorted(candidates, key=lambda t: (len(t), t)):
        print(f'  {text!r}')

    if not args.translations:
        return 0

    incoming = json.loads(args.translations.read_text(encoding='utf-8'))
    conflicts = sorted(key for key in incoming if key in dictionary)
    if conflicts:
        print(f'\n这些键已存在，未覆盖：{conflicts}', file=sys.stderr)
        return 1
    # 含数字的条目，运行时会把它换成 {number} 再查，所以那种形态的键也算数：
    # "Remove Redundant Keys (0)" 的键是 "Remove Redundant Keys ({number})"。
    acceptable = set(candidates)
    for text in candidates:
        numbers = re.findall(r'\b\d+(?:\.\d+)?(?![\d.])', text)
        if len(numbers) == 1:
            acceptable.add(re.sub(r'\b\d+(?:\.\d+)?(?![\d.])', '{number}', text, count=1))
    unknown = sorted(key for key in incoming if key not in acceptable)
    if unknown:
        print(f'\n这些键不在待判断清单里，请核对拼写：{unknown}', file=sys.stderr)
        return 1

    dictionary.update(incoming)
    DICTIONARY.write_text(json.dumps(dictionary, ensure_ascii=False, indent=2) + '\n',
                          encoding='utf-8')
    print(f'\n词典 {len(dictionary) - len(incoming)} → {len(dictionary)} 条（新增 {len(incoming)}）')
    subprocess.run([sys.executable, str(ROOT / 'tools/update-translation.py')], check=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
