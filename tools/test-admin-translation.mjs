import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
const html = fs.readFileSync(new URL('./one-fuzhu-admin.html', import.meta.url), 'utf8');
const source = html.split('<script>')[1].split('</script>')[0];
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, { value: '', textContent: '', disabled: false });
  return elements.get(id);
};
let reply;
const ctx = vm.createContext({ URL, AbortSignal, TextEncoder, crypto: webcrypto,
  sessionStorage: { getItem: () => null }, window: { addEventListener() {} }, customElements: { get() {} },
  document: { getElementById: element },
  fetch: async () => ({ ok: true, json: async () => reply }) });
vm.runInContext(source, ctx);
const run = s => vm.runInContext(s, ctx);
assert.equal(run('reportSources([{text:"Menu"}, "Menu", {text:"Other"}]).length'), 2);
for (const s of ['083AA7','⇧ E','BETA 0.9.21','15F','00:00s','user@example.com','__proto__']) assert.equal(run(`skipReportText(${JSON.stringify(s)})`), true);
element('aiBase').value = 'https://example.com/v1'; element('aiKey').value='test'; element('aiModel').value='model';
assert.equal(run('aiConfig().url'), 'https://example.com/v1/chat/completions');
reply = { choices: [{finish_reason:'stop',message:{content:JSON.stringify({items:[{source:'Menu',translation:'菜单',reason:'菜单'}]})}}] };
assert.equal((await run('translateBatch(["Menu"], aiConfig())'))[0].translation, '菜单');
reply.choices[0].finish_reason='length';
await assert.rejects(run('translateBatch(["Menu"], aiConfig())'), /未完整/);
reply.choices[0].finish_reason='stop'; reply.choices[0].message.content='{"items":[]}';
await assert.rejects(run('translateBatch(["Menu"], aiConfig())'), /遗漏/);
reply.choices[0].message.content='{"items":[{"source":"Other","translation":"其他","reason":"通用"}]}';
await assert.rejects(run('translateBatch(["Menu"], aiConfig())'), /未知/);
const root = new URL('../', import.meta.url);
ctx.docs = Object.fromEntries(Object.entries({ content:'site/data/content.json', translation:'rive-editor/translation.json', translationRelease:'rive-editor/release.json', contract:'contracts/schema-v3/contract.json',release:'contracts/schema-v3/release.json' }).map(([k,p]) => [k,fs.readFileSync(new URL(p,root),'utf8')]));
run(`loadedTexts=docs;content=JSON.parse(docs.content);contract=JSON.parse(docs.contract);release=JSON.parse(docs.release);translation=JSON.parse(docs.translation);translation['Test menu']='测试菜单';`);
const docs = await run('buildPublishDocuments()');
assert.equal(docs.content, ctx.docs.content);
assert.equal(JSON.parse(docs.contract).contractVersion, JSON.parse(ctx.docs.contract).contractVersion);
assert.equal(JSON.parse(docs.release).version, JSON.parse(ctx.docs.release).version);
assert.equal(JSON.parse(docs.translationRelease).sha256, await run(`sha256(${JSON.stringify(docs.translation)})`));
// Exercise automatic import and ensure only translation documents get published.
run(`loadedHeadSha='old';token='test';renderTranslations=()=>{};translation=JSON.parse(docs.translation);`);
ctx.filesPublished=[];
run(`publishFiles=async files=>{filesPublished=files;return 'newcommit';}; translateBatch=async sources=>sources.map(source=>({source,translation:'测试菜单',reason:'通用'}));`);
await run(`aiTranslateAndPublish({text:async()=>JSON.stringify([{text:'New test menu'}])})`);
assert.equal(run('filesPublished.length'),4);
assert.equal(run('filesPublished.some(f=>f.path===CONFIG.paths.content)'),false);
assert.equal(run('translation["New test menu"]'),'测试菜单');
run(`publishFiles=async()=>{throw new Error('conflict');};`);
await assert.rejects(run(`aiTranslateAndPublish({text:async()=>JSON.stringify([{text:'Other test menu'}])})`), /conflict/);
assert.equal(run('Object.hasOwn(translation,"Other test menu")'),false);
assert.equal(run('busy'),false);
console.log('PASS admin translation: filtering, malformed/truncated replies, version/hash, translation-only publish, rollback');
