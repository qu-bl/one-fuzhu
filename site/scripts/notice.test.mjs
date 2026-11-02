import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const source = app.slice(app.indexOf('function bindNoticeDialog()'), app.indexOf('\nfunction renderLoadError('));
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function setup({ reduced = false, copySuccess = true, platform = null } = {}) {
  const frames = new Map(), listeners = new Map(), animations = [], sands = [], navigations = [];
  let now = 0, sequence = 0, closes = 0, copies = 0;
  const classes = new Set(['dialog-open']);
  const style = () => ({ setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } });
  const element = tag => {
    const nodeClasses = new Set();
    return ({
    tagName: tag.toUpperCase(), dataset: {}, style: style(), children: [], attrs: {}, scrollTop: 0,
    classList: { add: k => nodeClasses.add(k), remove: k => nodeClasses.delete(k), contains: k => nodeClasses.has(k) },
    getBoundingClientRect() { return { left: 360, top: 40, width: 480, height: 640 }; },
    setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
    append(child) { this.children.push(child); }, replaceChildren(...children) { this.children = children; },
    remove() { this.removed = true; }, focus() {},
    addEventListener() {}, querySelector() { return {}; }, querySelectorAll() { return this.children; },
    getContext() { return { scale() {}, clearRect() {} }; },
    animate(keyframes, options) {
      let resolve;
      const finished = new Promise(done => { resolve = done; });
      const animation = { finished, resolve, options, cancel() { this.cancelled = true; } };
      animations.push(animation); return animation;
    },
  }); };
  const dialog = Object.assign(element('dialog'), {
    open: true, modal: true,
    matches(selector) { return selector === ':modal' && this.modal; },
    addEventListener(type, callback, options) { const list = listeners.get(type) || []; list.push({ callback, capture: options?.capture }); listeners.set(type, list); },
    close() { closes++; this.open = false; this.modal = false; for (const { callback } of listeners.get('close') || []) callback(); },
    show() { this.open = true; this.modal = false; },
    showModal() { this.open = true; this.modal = true; },
  });
  const media = element('div'), actions = element('div'), action = element('a');
  actions.children = [action, element('button')];
  const state = { notice: { enabled: false } };
  const document = { hidden: false, fonts: { ready: Promise.resolve() }, createElement: element,
    addEventListener(type, callback, options) { const list = listeners.get(`document:${type}`) || []; list.push({ callback, capture: options?.capture }); listeners.set(`document:${type}`, list); },
    body: { append() {}, classList: { add: k => classes.add(k), remove: k => classes.delete(k), contains: k => classes.has(k) } },
  };
  const context = vm.createContext({
    document, state, noticeDialog: dialog, noticeMedia: media, noticeActions: actions, accessDialog: { open: false },
    reduceMotion: { matches: reduced }, appPlatform: platform, innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1,
    performance: { now: () => now }, getComputedStyle: () => ({ opacity: '1', transform: 'none' }),
    requestAnimationFrame: callback => { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id), window: { open(href, target, options) { navigations.push({ href, target, options, now }); } },
    location: { assign: href => navigations.push({ href, now }) },
    copyAccessValue() { copies++; return Promise.resolve(copySuccess); }, contactHref: href => href || '',
    testSands: sands,
  });
  vm.runInContext(source, context);
  vm.runInContext(`
    noticeRaster = element => ({ element });
    noticeSand = (raster, count, start, duration) => {
      const sand = { raster, start, duration, end: start + duration + 1160 };
      testSands.push(sand); return sand;
    };
    drawNoticeSand = () => {};
    bindNoticeDialog();
  `, context);
  const event = (extra = {}) => Object.assign({ target: dialog, prevented: false, stopped: false,
    preventDefault() { this.prevented = true; }, stopPropagation() {}, stopImmediatePropagation() { this.stopped = true; },
  }, extra);
  const dispatch = (type, extra = {}) => {
    const e = event(extra);
    const list = [...listeners.get(type) || []].sort((a, b) => Number(!!b.capture) - Number(!!a.capture));
    for (const { callback } of list) { callback(e); if (e.stopped) break; }
    if (type === 'cancel' && !e.prevented) dialog.close();
    return e;
  };
  return {
    context, dialog, media, action, animations, sands, frames, classes, navigations, state, event, dispatch,
    get closes() { return closes; }, get copies() { return copies; },
    start: (actions = ['link', 'close']) => context.activateNoticeButton(event(), action, { actions, linkHref: 'https://example.com/after', copyValue: 'value' }),
    async bounce() { animations[0].resolve(); await flush(); },
    async tick(time) { now = time; const queue = [...frames.values()]; frames.clear(); for (const cb of queue) cb(now); await flush(); },
    inspect: expression => vm.runInContext(expression, context),
  };
}

const tests = [];
async function test(name, run) { await run(); tests.push(name); }
const plain = value => JSON.parse(JSON.stringify(value));

await test('legacy link and copy notices retain their implicit close action', () => {
  const h = setup();
  for (const behavior of ['link', 'copy', 'close']) {
    h.context.legacy = { buttonAction: behavior, linkLabel: '原按钮', buttonColor: '#fff', buttonPosition: 'top-right' };
    const config = h.inspect('noticeConfiguration(legacy)');
    assert.deepEqual(plain(config.buttons[0].actions), behavior === 'close' ? ['close'] : [behavior, 'close']);
    assert.equal(config.buttons[0].label, '原按钮'); assert.equal(config.buttons[0].buttonPosition, 'top-right');
    assert.deepEqual(plain(config.imageAction.actions), []);
  }
});

await test('legacy text alignment cannot offset labels while button positions stay independent', () => {
  const h = setup();
  h.context.poster = {};
  h.context.notice = { buttons: [
    { label: '左上按钮', actions: ['close'], buttonPosition: 'top-left', textPosition: 'bottom-right', textOffsetX: 25, textOffsetY: 30 },
    { label: '右下按钮', actions: ['close'], buttonPosition: 'bottom-right', textPosition: 'top-left' },
  ] };
  h.inspect('renderNoticeActions(notice, poster)');
  const groups = h.inspect('noticeActions.children');
  assert.deepEqual(Array.from(groups, group => group.dataset.position), ['top-left', 'bottom-right']);
  assert.equal(groups[0].style['--notice-button-x'], '0%');
  assert.equal(groups[1].style['--notice-button-x'], '100%');
  for (const group of groups) assert.equal(group.children[0].children[0].style.transform, undefined);
});

await test('blank clicks, repeated Escape and cancel requests never dismiss an idle poster', () => {
  const h = setup();
  h.dispatch('click'); h.dispatch('cancel'); h.dispatch('cancel');
  assert.equal(h.dispatch('document:keydown', { key: 'Escape' }).prevented, true);
  assert.equal(h.closes, 0); assert.equal(h.dialog.modal, true);
});

await test('link-only opens once synchronously in a safe new window and retains the modal', async () => {
  const h = setup(); const done = h.start(['link']);
  assert.equal(h.navigations.length, 1); assert.equal(h.navigations[0].target, '_blank');
  assert.equal(h.navigations[0].options, 'noopener,noreferrer');
  await h.start(['link']); assert.equal(h.navigations.length, 1);
  await h.bounce(); await done;
  assert.equal(h.closes, 0); assert.equal(h.dialog.modal, true); assert.equal(h.classes.has('dialog-open'), true);
  assert.equal(h.action.attrs['aria-disabled'], undefined); assert.equal(h.sands.length, 0);
});

await test('link plus close opens immediately, releases input and finishes all button/poster particles', async () => {
  const h = setup(); const done = h.start();
  assert.equal(h.navigations.length, 1); assert.equal(h.dialog.modal, false); assert.equal(h.classes.has('dialog-open'), false);
  await h.bounce();
  assert.equal(h.sands.length, 3); // Two buttons, one shared poster.
  assert.equal(h.sands[2].start, h.sands[0].duration / 2);
  for (const time of [500, 1500, 3000]) {
    await h.tick(time); h.dispatch('click'); h.dispatch('cancel');
    assert.equal(h.dialog.open, true); assert.equal(h.closes, 1);
  }
  await h.tick(3910); await done;
  assert.equal(h.closes, 2); assert.equal(h.dialog.open, false); assert.equal(h.frames.size, 0);
  assert.equal(h.navigations.length, 1); assert.equal(h.inspect('noticeActivation'), null);
});

await test('an independent close button runs no external action', async () => {
  const h = setup(); const done = h.start(['close']); await h.bounce(); await h.tick(3910); await done;
  assert.equal(h.navigations.length, 0); assert.equal(h.closes, 2);
});

await test('image actions may close the poster even with no overlaid buttons', async () => {
  const h = setup(); h.context.noticeActions.children = []; h.action.classList.add('notice-image-action');
  const done = h.start(['link', 'close']); await h.bounce();
  assert.equal(h.sands.length, 1); assert.equal(h.navigations.length, 1);
  await h.tick(3910); await done; assert.equal(h.dialog.open, false);
});

await test('copy-only retains the modal while copy plus close dismisses it', async () => {
  const keep = setup(); const kept = keep.start(['copy']); await keep.bounce(); await kept;
  assert.equal(keep.copies, 1); assert.equal(keep.closes, 0);
  const close = setup(); const closed = close.start(['copy', 'close']); await close.bounce(); await close.tick(3910); await closed;
  assert.equal(close.copies, 1); assert.equal(close.closes, 2);
});

await test('copy failure keeps a retryable poster even when link and close are also selected', async () => {
  const h = setup({ copySuccess: false }); const done = h.start(['link', 'copy', 'close']); await h.bounce(); await done;
  assert.equal(h.navigations.length, 1); assert.equal(h.copies, 1); assert.equal(h.dialog.modal, true);
  assert.equal(h.inspect('noticeActivation'), null); assert.equal(h.action.attrs['aria-disabled'], undefined);
});

await test('embedded app link actions retain the existing copy-link behavior', async () => {
  const h = setup({ platform: 'Android' }); const done = h.start(['link']); await h.bounce(); await done;
  assert.equal(h.copies, 1); assert.equal(h.navigations.length, 0); assert.equal(h.closes, 0);
});

await test('another open dialog keeps its scroll lock when particles finish', async () => {
  const h = setup(); const done = h.start(['close']); await h.bounce();
  h.context.accessDialog.open = true; h.classes.add('dialog-open'); await h.tick(3910); await done;
  assert.equal(h.context.accessDialog.open, true); assert.equal(h.classes.has('dialog-open'), true);
});

await test('live admin changes queue until exit finishes', async () => {
  const h = setup(); const done = h.start(['close']); h.context.initNotice({ showNotice: false });
  assert.equal(h.inspect('noticeGeneration'), 0); await h.bounce(); await h.tick(3910); await done;
  assert.equal(h.inspect('noticeGeneration'), 1); assert.equal(h.inspect('noticePendingOptions'), null);
});

await test('reduced motion still runs configured actions and closes cleanly', async () => {
  const h = setup({ reduced: true }); const done = h.start(); await h.bounce(); await done;
  assert.equal(h.navigations.length, 1); assert.equal(h.dialog.open, false); assert.equal(h.sands.length, 0);
});

const admin = readFileSync(new URL('../../tools/one-fuzhu-admin.html', import.meta.url), 'utf8');
const adminContext = vm.createContext({ URL });
const protocols = admin.match(/const LINK_SCHEMES = .*;/)[0];
vm.runInContext(protocols + '\n' + admin.slice(admin.indexOf('function linkSchemeOk('), admin.indexOf('function httpUrlOk(')) + '\n'
  + admin.slice(admin.indexOf('const NOTICE_GRID ='), admin.indexOf('function noticeGridField(')) + '\n'
  + admin.slice(admin.indexOf('function normalizeNotice('), admin.indexOf('function noticeActionEditor(')), adminContext);
const validate = value => { adminContext.notice = value; vm.runInContext('validateNotice(notice)', adminContext); return value; };
const button = (actions, extra = {}) => ({ label: '测试按钮', actions, linkHref: 'https://example.com/', copyValue: '123', ...extra });
const notice = buttons => ({ enabled: true, image: 'poster.avif', buttons, imageAction: { actions: [] } });

await test('admin migrates legacy fields without losing colors or nine-grid positions', () => {
  const value = validate({ enabled: true, image: 'poster.avif', linkLabel: '原按钮', buttonAction: 'link', linkHref: 'https://example.com', buttonColor: '#fff', buttonPosition: 'top-left' });
  assert.equal(value.buttons[0].buttonColor, '#fff'); assert.equal(value.buttons[0].buttonPosition, 'top-left');
  assert.deepEqual(plain(value.buttons[0].actions), ['link', 'close']); assert.equal(value.linkLabel, undefined);
});

await test('admin accepts independent buttons and image-only close entry', () => {
  validate(notice([button(['link']), button(['close'])]));
  const value = notice([]); value.imageAction = { actions: ['link', 'close'], linkHref: 'https://example.com/' }; validate(value);
});

await test('admin drops obsolete text positions while retaining button positions, colors and actions', () => {
  const value = validate(notice([
    button(['link', 'close'], { buttonPosition: 'top-left', textPosition: 'bottom-right', textOffsetX: 12, textOffsetY: -9, buttonColor: '#fff', textColor: '#123' }),
    button(['close'], { buttonPosition: 'bottom-right', textPosition: 'top-left' }),
  ]));
  assert.deepEqual(value.buttons.map(item => item.buttonPosition), ['top-left', 'bottom-right']);
  assert.equal(value.buttons[0].buttonColor, '#fff'); assert.equal(value.buttons[0].textColor, '#123');
  assert.deepEqual(value.buttons[0].actions, ['link', 'close']);
  for (const item of value.buttons) for (const key of ['textPosition', 'textOffsetX', 'textOffsetY']) assert.equal(key in item, false);
});

await test('admin rejects a poster with no configured close entry', () => {
  assert.throws(() => validate(notice([button(['link'])])), /关闭弹窗/);
});

await test('admin rejects unsupported URLs, unknown actions, missing copy data and invalid positions', () => {
  for (const config of [button(['link', 'close'], { linkHref: 'javascript:alert(1)' }), button(['launch']), button(['copy', 'close'], { copyValue: '' }), button(['close'], { buttonPosition: 'pixel' })]) {
    assert.throws(() => validate(notice([config])));
  }
});

console.log(`${tests.length} notice checks passed.`);

