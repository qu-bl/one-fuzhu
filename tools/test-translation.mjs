import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../rive-editor/translation.js', import.meta.url), 'utf8');
const rules = JSON.parse(fs.readFileSync(new URL('../rive-editor/release.json', import.meta.url)));
for (const apple of [false, true]) {
  const texts = [], requests = [], reports = [];
  class Builder {
    addText(text) { texts.push(text); }
    pushStyle() {}
    pop() {}
  }
  const font = Uint8Array.from([1, 2, 3]);
  const config = { ...rules, fontBytes: font.length };
  const window = {
    CanvasKit: { ParagraphBuilder: Builder },
    fetch: async (url) => {
      requests.push(url);
      if (url.includes('FontManifest.json')) return Response.json([]);
      return new Response(font);
    },
  };
  if (apple) window.webkit = { messageHandlers: {
    quRiveFont: { postMessage: async hash => {
      assert.equal(hash, rules.fontSha256);
      return Buffer.from(font).toString('base64');
    } },
    quUnmatched: { postMessage: report => reports.push(JSON.parse(report)) },
  } };
  const context = vm.createContext({ window, Response, Headers, atob,
    localStorage: { getItem: () => null, setItem() {} },
    location: { pathname: '/editor/123456789', origin: 'https://editor.rive.app' },
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1,
  });
  vm.runInContext(source.replace('__RIVE_EDITOR_CONFIG__', JSON.stringify(config))
    .replace('__RIVE_EDITOR_DICTIONARY__', JSON.stringify({ Hello: '你好', '{number} items': '{number} 项' })), context);
  const builder = new Builder();
  builder.addText('Hello');
  builder.addText('12 items');
  builder.addText('Untranslated control');
  builder.addText('private@example.com');
  assert.deepEqual(texts, ['你好', '12 项', 'Untranslated control', 'private@example.com']);
  const translator = window.__QU_RIVE_TRANSLATOR__;
  const report = JSON.parse(translator.exportUnmatchedReport());
  assert.equal(report.entries.length, 1);
  assert.equal(report.entries[0].text, 'Untranslated control');
  assert.equal(report.entries[0].reviewRequired, true);
  assert.equal(report.collectorVersion, '2.0');
  if (apple) assert.ok(reports.length > 0);
  const manifest = await (await window.fetch('https://editor.rive.app/assets/FontManifest.json')).json();
  const asset = manifest[0].fonts[0].asset;
  assert.equal(asset, `https://editor.rive.app/assets/fonts/qu-translation-${rules.fontSha256}.ttf`);
  assert.deepEqual(new Uint8Array(await (await window.fetch(asset)).arrayBuffer()), font);
  assert.equal(requests.includes(asset), !apple);
  translator.setEnabled(false);
  builder.addText('Hello');
  assert.equal(texts.at(-1), 'Hello');
  const original = window.__QU_RIVE_TRANSLATOR__;
  vm.runInContext(source, context); // repeated injection returns before evaluating placeholders
  assert.equal(window.__QU_RIVE_TRANSLATOR__, original);
}
console.log('PASS shared translator: text, parameters, disable, reports, font manifest, native font transports, reinjection');
