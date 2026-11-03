import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import createDecoder from '../../tools/vendor/avif/avif_dec.js';

const media = readFileSync(new URL('../media.js', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../../tools/one-fuzhu-admin.html', import.meta.url), 'utf8');
const between = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const normalize = text => text.split('\n').map(line => line.trim()).join('\n').trim();
let count = 0;
async function test(name, run) { try { await run(); count++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; } }
function node(tag) {
  return { tag, children: [], events: {},
    append(...children) { for (const child of children) { child.remove(); child.parentNode = this; this.children.push(child); } },
    remove() { if (this.parentNode) { this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; } },
    replaceChild(next, old) { const index = this.children.indexOf(old); assert.ok(index >= 0); this.children[index] = next; next.parentNode = this; old.parentNode = null; },
    addEventListener(type, callback) { this.events[type] = callback; },
  };
}
const document = { baseURI: 'https://qu-bl.github.io/one-fuzhu/site/', createElement: node };
const context = vm.createContext({ URL, document, location: { href: document.baseURI } });
vm.runInContext(media, context);
const { imageSources, imagePicture } = context.SiteMedia;

await test('the standalone admin uses exactly the same image selection as the website', () => {
  assert.equal(normalize(between(media, '  function imageSources(', '  function webUrl(')), normalize(between(admin, 'function imageSources(', '// 仓库路径 site/assets/x.riv')));
});
await test('managed AVIF companions preserve query strings and fragments', () => {
  assert.equal(imageSources('./assets/a.avif?v=123#image').fallback, './assets/a.webp?v=123#image');
  assert.equal(imageSources('../site/assets/a.avif?v=123').fallback, '../site/assets/a.webp?v=123');
  assert.equal(imageSources('https://qu-bl.github.io/one-fuzhu/site/assets/a.avif').fallback, 'https://qu-bl.github.io/one-fuzhu/site/assets/a.webp');
});
await test('external URLs, WebP, PNG, SVG, blobs and embedded images do not invent companion requests', () => {
  for (const value of ['https://example.com/site/assets/a.avif', './assets/a.webp', './assets/a.png', './assets/icon.svg', 'blob:uploaded', 'data:image/avif;base64,AAAA']) assert.equal(imageSources(value).fallback, '');
});
await test('picture prefers AVIF while the image fallback is WebP and existing geometry node is preserved', () => {
  const parent = node('div'), image = node('img'); parent.append(image);
  const picture = imagePicture(image, './assets/a.avif?v=1');
  assert.equal(parent.children[0], picture);
  assert.equal(image.parentNode, picture);
  assert.equal(picture.children[0].type, 'image/avif');
  assert.equal(picture.children[0].srcset, './assets/a.avif?v=1');
  assert.equal(image.src, './assets/a.webp?v=1');
});
await test('a failed AVIF removes its source and retries WebP without reporting a terminal error', () => {
  const image = node('img'), picture = imagePicture(image, './assets/a.avif');
  image.currentSrc = 'https://qu-bl.github.io/one-fuzhu/site/assets/a.avif';
  let suppressed = 0;
  image.events.error({ stopImmediatePropagation() { suppressed++; } });
  assert.equal(suppressed, 1); assert.equal(picture.children.length, 1);
  assert.equal(image.src, './assets/a.webp');
  image.currentSrc = 'https://qu-bl.github.io/one-fuzhu/site/assets/a.webp';
  image.events.error({ stopImmediatePropagation() { suppressed++; } });
  assert.equal(suppressed, 1);
});
await test('a browser already using WebP reports its failure instead of looping', () => {
  const image = node('img'); imagePicture(image, './assets/a.avif');
  image.currentSrc = 'https://qu-bl.github.io/one-fuzhu/site/assets/a.webp';
  image.events.error({ stopImmediatePropagation() { throw new Error('WebP failure must remain visible'); } });
});

const pendingUploads = new Map(), uploadPreviews = new Map(), revoked = [];
let sequence = 0;
const uploads = vm.createContext({ Blob, Uint8Array, Uint8ClampedArray, DataView, ImageData: class { constructor(data, width, height) { Object.assign(this, {data,width,height}); } },
  btoa, URL: { createObjectURL: () => `blob:${++sequence}`, revokeObjectURL: value => revoked.push(value) },
  pendingUploads, uploadPreviews, setStatus() {},
});
vm.runInContext(between(admin, 'function bytesToBase64(', '// 与官网保持相同')
  + between(admin, 'function encodeWebp(', '\nfunction stageUpload('), uploads);
const prepared = { file: new Blob(['avif'], { type: 'image/avif' }), ext: '.avif', backup: { file: new Blob(['webp'], { type: 'image/webp' }), ext: '.webp' } };
await test('one upload stages both images together and a repeated upload replaces both', async () => {
  const slot = { base: 'site/assets/notice' };
  pendingUploads.set('site/assets/unrelated.riv', 'keep');
  pendingUploads.set('site/assets/notice.png', 'old');
  uploadPreviews.set('site/assets/notice.png', 'blob:old');
  const result = await uploads.stagePreparedUpload(slot, prepared);
  assert.equal(result.count, 2); assert.equal(result.path, 'site/assets/notice.avif');
  assert.equal(pendingUploads.size, 3); assert.equal(pendingUploads.has('site/assets/notice.png'), false);
  assert.equal(pendingUploads.get('site/assets/notice.webp'), 'd2VicA==');
  assert.ok(revoked.includes('blob:old'));
  await uploads.stagePreparedUpload(slot, prepared);
  assert.equal(pendingUploads.size, 3); assert.equal(uploadPreviews.size, 2);
});
await test('a failed variant read preserves the previous staged pair', async () => {
  const before = JSON.stringify([...pendingUploads]);
  await assert.rejects(uploads.stagePreparedUpload({ base: 'site/assets/notice' }, { ...prepared, backup: { file: { arrayBuffer() { throw Error('read failed'); } }, ext: '.webp' } }));
  assert.equal(JSON.stringify([...pendingUploads]), before);
});
await test('Rive uploads remain a single untouched file', async () => {
  const result = await uploads.stagePreparedUpload({ base: 'site/assets/hero' }, { file: new Blob(['rive']), ext: '.riv' });
  assert.equal(result.count, 1); assert.equal(pendingUploads.get('site/assets/hero.riv'), 'cml2ZQ==');
});
await test('an unsupported WebP encoder rejects PNG output rather than mislabelling it', async () => {
  await assert.rejects(uploads.encodeWebp({ toBlob(callback) { callback(new Blob(['png'], { type: 'image/png' })); } }), /WebP/);
});

const slot = { convertToAvif: true, maxBytes: 4194304 };
const avifBytes = readFileSync(new URL('../assets/notice.avif', import.meta.url));
const avifFile = new Blob([avifBytes], {type: 'image/avif'});
let nativeFail = false, decodeCalls = 0, encodeCalls = 0, pixelWrites = 0;
uploads.Image = class {
  naturalWidth = 1080; naturalHeight = 1440;
  set src(value) { queueMicrotask(() => nativeFail ? this.onerror() : this.onload()); }
};
uploads.document = { createElement() { return { getContext: () => ({ drawImage() {}, putImageData() { pixelWrites++; }, getImageData() { return { data: new Uint8ClampedArray(16), width: 2, height: 2 }; } }), toBlob(callback) { callback(new Blob(['webp'], {type:'image/webp'})); } }; } };
uploads.avifTask = async task => { assert.equal(task, 'decode'); decodeCalls++; return { pixels: new ArrayBuffer(16), width: 2, height: 2 }; };
uploads.encodeAvif = async () => { encodeCalls++; return new Blob(['avif'], { type: 'image/avif' }); };
await test('native AVIF uploads retain their exact bytes and add a WebP companion', async () => {
  const result = await uploads.prepareUpload(avifFile, slot, '.avif');
  assert.equal(result.file, avifFile); assert.equal(result.backup.file.type, 'image/webp'); assert.equal(encodeCalls, 0); assert.equal(decodeCalls, 0);
});
await test('a browser unable to decode AVIF uses the worker and still creates both variants', async () => {
  nativeFail = true;
  const result = await uploads.prepareUpload(avifFile, slot, '.avif');
  assert.equal(result.file, avifFile); assert.equal(result.backup.ext, '.webp'); assert.equal(decodeCalls, 1); assert.equal(pixelWrites, 1);
  nativeFail = false;
});
await test('other image uploads are encoded to AVIF and WebP, and renamed invalid AVIF is rejected', async () => {
  const result = await uploads.prepareUpload(new Blob(['png']), slot, '.png');
  assert.equal(result.file.type, 'image/avif'); assert.equal(result.backup.file.type, 'image/webp'); assert.equal(encodeCalls, 1);
  await assert.rejects(uploads.prepareUpload(new Blob(['not avif']), slot, '.avif'), /不是 AVIF/);
});

const refs = vm.createContext({ content: { notice: { image: './assets/notice.avif?v=1' }, cards: [{id:'copy',cover:'./assets/cover-original.avif'}] },
  CONFIG: { uploads: { heroRive: {base:'site/assets/hero'}, noticeImage:{base:'site/assets/notice'},cardCover:{} } },
});
vm.runInContext(between(admin, 'function safeId(', 'function uploadCardCover(') + between(admin, 'function currentUploadRefs(', '\nasync function save()'), refs);
await test('cleanup protects both companions including images shared by copied cards', async () => {
  refs.pendingUploads = new Map([['site/assets/cover-original.avif','new'],['site/assets/cover-original.webp','new']]);
  refs.contentsApi = () => '/assets'; refs.CONFIG.branch='main';
  refs.gh = async () => ['avif','webp','png'].map(ext => ({type:'file',path:`site/assets/cover-original.${ext}`}));
  const current = refs.currentUploadRefs();
  assert.equal(current.get('site/assets/cover-original').has('site/assets/cover-original.webp'), true);
  assert.equal(current.get('site/assets/notice').has('site/assets/notice.webp'), true);
  assert.deepEqual(Array.from(await refs.staleUploadPaths()), ['site/assets/cover-original.png']);
});
await test('all existing AVIF assets decode with the vendored decoder and have valid WebP companions', async () => {
  const decoder = await createDecoder({ wasmBinary: readFileSync(new URL('../../tools/vendor/avif/avif_dec.wasm', import.meta.url)) });
  for (const name of readdirSync(new URL('../assets/', import.meta.url)).filter(name => name.endsWith('.avif'))) {
    const input = readFileSync(new URL('../assets/' + name, import.meta.url));
    const decoded = decoder.decode(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength), 8);
    assert.ok(decoded.width > 0 && decoded.height > 0); assert.equal(decoded.data.length, decoded.width * decoded.height * 4);
    const backup = readFileSync(new URL('../assets/' + name.replace(/\.avif$/, '.webp'), import.meta.url));
    assert.equal(backup.toString('ascii',0,4), 'RIFF'); assert.equal(backup.toString('ascii',8,12), 'WEBP');
  }
});
console.log(`${count} image compatibility checks passed.`);
