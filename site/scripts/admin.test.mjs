import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../../tools/one-fuzhu-admin.html', import.meta.url), 'utf8');
const content = JSON.parse(readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));
const context = vm.createContext({ URL, console });
const between = (start, end) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));
vm.runInContext(between('const ACCESS_PLATFORMS =', '// 卡片的「平台」')
  + html.match(/const LINK_SCHEMES = .*;/)[0]
  + between('function videoIsValid(', 'function renderVideoEditor(')
  + between('function guessVideo(', 'function labelledSelect(')
  + between('function accessFeedback(', 'function renderAccessEditor(')
  + between('function linkSchemeOk(', 'function validateTranslation(')
  + between('const NOTICE_GRID =', 'function noticeGridField(')
  + between('function normalizeNotice(', 'function noticeActionEditor('), context);
vm.runInContext(readFileSync(new URL('../media.js', import.meta.url), 'utf8'), context);

let count = 0;
function test(label, run) {
  try { run(); count++; } catch (error) { error.message = `${label}: ${error.message}`; throw error; }
}
function invoke(expression, value) { context.sample = structuredClone(value); return vm.runInContext(expression, context); }

test('current published content remains valid and intact', () => {
  const before = JSON.stringify(content);
  invoke('validateContent(sample)', content);
  assert.equal(JSON.stringify(content), before);
});

test('video validation agrees with the public player', () => {
  for (const video of [
    { platform: 'bilibili', id: 'BV1NahH6SEfV' },
    { platform: 'youtube', id: 'dQw4w9WgXcQ' },
    { platform: 'douyin', id: '7234567890123456789' },
    { platform: 'douyin', id: 72345678901 },
    { platform: 'youtube', id: 'bad' },
    { platform: 'unknown', id: 'dQw4w9WgXcQ' }
  ]) assert.equal(invoke('videoIsValid(sample)', video), invoke('Boolean(SiteMedia.videoSource(sample))', video));
});

test('pasted links and embed codes identify their playback platform', () => {
  for (const [input, platform, id] of [
    ['https://www.bilibili.com/video/BV1NahH6SEfV/', 'bilibili', 'BV1NahH6SEfV'],
    ['<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>', 'youtube', 'dQw4w9WgXcQ'],
    ['https://www.douyin.com/video/7234567890123456789', 'douyin', '7234567890123456789']
  ]) {
    const result = invoke('guessVideo(sample)', input);
    assert.equal(result.platform, platform); assert.equal(result.id, id);
  }
});

test('entry feedback agrees with actual link, copy and pending behavior', () => {
  for (const item of [
    { platform: 'bilibili', url: 'https://example.com/' },
    { platform: 'qq', value: '862835994' },
    { platform: 'qq', url: 'https://example.com/' },
    { platform: 'kdocs', value: '学习资料' },
    { platform: 'github', value: '' },
    { platform: 'youtube', url: 'https://example.com/', copyable: false }
  ]) {
    const type = invoke('SiteMedia.accessAction(sample).type', item);
    const feedback = invoke('accessFeedback(sample)', item);
    assert.match(feedback, type === 'link' ? /新窗口/ : type === 'copy' ? /复制/ : /待发布/);
  }
});

test('empty entries publish as pending instead of requiring dummy content', () => {
  const draft = structuredClone(content);
  draft.cards[0].access = { items: [{ platform: 'qq', value: '' }] };
  invoke('validateContent(sample)', draft);
  assert.equal(invoke('SiteMedia.accessAction(sample).type', draft.cards[0].access.items[0]), 'unavailable');
});

test('unsupported entry platforms and invalid videos are rejected before publishing', () => {
  for (const modify of [
    card => { card.video = { platform: 'youtube', id: 'bad' }; },
    card => { card.access = { items: [{ platform: 'invisible-platform', value: 'value' }] }; },
    card => { card.access = { items: [{ platform: 'github', url: 'https://user:password@example.com/' }] }; },
    card => { card.access = { items: [{ platform: 'github', value: 'javascript:alert(1)' }] }; }
  ]) {
    const draft = structuredClone(content); modify(draft.cards[0]);
    assert.throws(() => invoke('validateContent(sample)', draft));
  }
});

context.content = structuredClone(content);
context.activeIndex = 1;
context.markDirty = context.renderCardRail = context.renderForm = context.syncPreview = context.setStatus = () => {};
vm.runInContext(between('function reorderCard(', 'function bindCardSort('), context);
test('sorting preserves the selected card and every card field', () => {
  const original = structuredClone(context.content.cards);
  const selected = original[1].id;
  assert.equal(vm.runInContext('reorderCard(0, 2)', context), true);
  assert.equal(context.content.cards[context.activeIndex].id, selected);
  assert.deepEqual(context.content.cards.map(card => card.id), [original[1].id, original[2].id, original[0].id]);
  for (const card of context.content.cards) assert.deepEqual(card, original.find(item => item.id === card.id));
});
test('invalid sort destinations leave the draft intact', () => {
  const before = JSON.stringify(context.content);
  assert.equal(vm.runInContext('reorderCard(-1, 2)', context), false);
  assert.equal(vm.runInContext('reorderCard(0, 99)', context), false);
  assert.equal(JSON.stringify(context.content), before);
});

context.CONFIG = { uploads: { heroRive: { base: 'site/assets/hero-cat' }, noticeImage: { base: 'site/assets/notice' }, cardCover: {} } };
vm.runInContext(between('function safeId(', 'function uploadCardCover(')
  + between('function currentUploadRefs(', '// 上传换过扩展名时'), context);
test('shared covers remain protected when another card changes file extension', () => {
  context.content = { cards: [{ id: 'original', cover: './assets/cover-original.avif' }, { id: 'copy', cover: './assets/cover-original.jpg' }] };
  const refs = vm.runInContext('currentUploadRefs()', context);
  assert.equal(refs.get('site/assets/cover-original').has('site/assets/cover-original.jpg'), true);
});

const site = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function previewHarness() {
  const frames = [], scrolls = [], activityChanges = [];
  const value = { banners: [{ id: 'hidden', visible: false }, { id: 'selected' }], cards: [], hero: null, notice: null, contact: null };
  const preview = vm.createContext({
    frames, scrolls, activityChanges, value,
    state: { source: structuredClone(value), activities: [], cases: [] },
    window: { scrollX: 0, scrollY: 744, scrollTo: point => scrolls.push(point), clearTimeout() {}, setTimeout() { throw Error('Unexpected autoplay while editing'); } },
    document: { hidden: false, querySelectorAll: () => [], querySelector: () => null },
    informationScroll: { scrollTop: 120 }, accessDialog: { open: false },
    requestAnimationFrame: frame => frames.push(frame),
    setActivity: index => activityChanges.push(index),
    initHeroRive() {}, renderContact() {}, renderActivities() {}, renderFilters() {}, renderCases() {}, initNotice() {},
  });
  const start = site.indexOf('let previewScrollVersion =');
  const end = site.indexOf('// 宿主（管理台）', start);
  vm.runInContext(site.slice(start, end) + '\n' + site.slice(site.indexOf('function scheduleCarousel()'), site.indexOf('function bindCarouselControls()')), preview);
  const flush = () => { while (frames.length) frames.shift()(); };
  return { preview, frames, scrolls, activityChanges, flush };
}
test('editing restores scroll after masonry layout without moving to the selected card', () => {
  const h = previewHarness();
  vm.runInContext('applyContent(value, { preserveScroll: true })', h.preview);
  h.preview.window.scrollY = 285;
  h.flush();
  assert.equal(h.scrolls.at(-1).top, 744);
  assert.equal(h.preview.informationScroll.scrollTop, 120);
});
test('a newer preview update cancels stale scroll restoration', () => {
  const h = previewHarness();
  vm.runInContext('applyContent(value, { preserveScroll: true })', h.preview);
  h.preview.window.scrollY = 510;
  vm.runInContext('applyContent(value, { preserveScroll: true })', h.preview);
  h.flush();
  assert.equal(h.scrolls.every(point => point.top === 510), true);
});
test('explicit selection can reposition the preview without restoration fighting it', () => {
  const h = previewHarness();
  vm.runInContext('applyContent(value, { preserveScroll: true, focusPreview: true })', h.preview);
  h.flush(); assert.equal(h.scrolls.length, 0);
});
test('editing a carousel uses the visible slide index and suspends autoplay', () => {
  const h = previewHarness();
  vm.runInContext("applyContent(value, { previewActivity: 'selected' }); scheduleCarousel()", h.preview);
  assert.deepEqual(h.activityChanges, [0]);
  assert.equal(h.preview.state.previewActivityId, 'selected');
});

console.log(`${count} admin behavior checks passed.`);
