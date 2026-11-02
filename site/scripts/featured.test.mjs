import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const source = app.slice(app.indexOf('function setFeatured('), app.indexOf('// 区块滚动入场：'));
function setup() {
  const timers = new Map(), windowEvents = new Map(), documentEvents = new Map();
  let sequence = 0;
  const element = () => {
    const classes = new Set(), events = new Map();
    const node = {
      dataset: {}, attrs: {}, children: [], classes, events,
      classList: { add: key => classes.add(key), toggle(key, on) { if (on) classes.add(key); else classes.delete(key); } },
      append(...items) { this.children.push(...items); },
      replaceChildren(...items) { this.children = items; },
      setAttribute(key, value) { this.attrs[key] = value; },
      removeAttribute(key) { delete this.attrs[key]; },
      addEventListener(type, callback) { events.set(type, callback); },
      querySelector() { return this.trigger ||= element(); },
    };
    return node;
  };
  const featured = { index: 0, timer: null, paused: false, slides: [], dots: [], status: null, lastSwipe: 0 };
  const host = element();
  const context = vm.createContext({
    featured, featuredBanners: host, expandedCard: null,
    document: { hidden: false, createElement: element, addEventListener(type, callback) { documentEvents.set(type, callback); } },
    window: {
      setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
      clearTimeout(id) { timers.delete(id); },
      addEventListener(type, callback) { windowEvents.set(type, callback); },
    },
    createCaseCard: () => element(),
    Date: { now: () => 123456 },
  });
  vm.runInContext(source, context);
  context.bindFeaturedControls();
  const create = count => context.createFeaturedCarousel(Array.from({ length: count }, (_, index) => ({ id: `card-${index}`, name: `精选 ${index + 1}` })));
  const pointer = (type, x = 0) => (type === 'pointerdown' ? host.events : windowEvents).get(type)?.({ isPrimary: true, clientX: x, target: { closest: () => ({}) } });
  const hidden = value => { context.document.hidden = value; documentEvents.get('visibilitychange')(); };
  const tick = () => { const task = timers.get(featured.timer); assert.ok(task); timers.delete(featured.timer); task.callback(); };
  return { context, featured, timers, host, create, pointer, hidden, tick, element };
}

let checks = 0;
function test(label, run) { try { run(); checks++; } catch (error) { error.message = `${label}: ${error.message}`; throw error; } }

test('one featured item is a static poster with no timer or carousel controls', () => {
  const h = setup(), wrapper = h.create(1);
  assert.equal(wrapper.dataset.rotating, 'false');
  assert.equal(wrapper.attrs['aria-roledescription'], undefined);
  assert.equal(wrapper.children.length, 1);
  assert.equal(h.featured.dots.length, 0);
  assert.equal(h.featured.status, null);
  assert.equal(h.featured.timer, null);
  assert.equal(h.timers.size, 0);
  assert.equal(h.featured.slides[0].attrs['aria-hidden'], 'false');
});

test('multiple items rotate every six seconds and wrap to the first item', () => {
  const h = setup(), wrapper = h.create(3);
  assert.equal(wrapper.dataset.rotating, 'true');
  assert.equal(wrapper.attrs['aria-roledescription'], '轮播');
  assert.equal(h.featured.dots.length, 3);
  assert.equal(h.timers.get(h.featured.timer).delay, 6000);
  h.tick(); assert.equal(h.featured.index, 1);
  h.tick(); assert.equal(h.featured.index, 2);
  h.tick(); assert.equal(h.featured.index, 0);
  assert.equal(h.timers.size, 1);
});

test('inactive slides stay unfocusable during rotation', () => {
  const h = setup(); h.create(2); h.tick();
  assert.equal(h.featured.slides[0].inert, true);
  assert.equal(h.featured.slides[0].attrs['aria-hidden'], 'true');
  assert.equal(h.featured.slides[0].querySelector().attrs.tabindex, '-1');
  assert.equal(h.featured.slides[1].inert, false);
  assert.equal(h.featured.slides[1].querySelector().attrs.tabindex, '0');
});

test('swiping a single poster never starts rotation or suppresses its click', () => {
  const h = setup(); h.create(1);
  h.pointer('pointerdown', 200); h.pointer('pointerup', 20);
  assert.equal(h.featured.index, 0);
  assert.equal(h.featured.paused, false);
  assert.equal(h.featured.lastSwipe, 0);
  assert.equal(h.timers.size, 0);
});

test('multiple posters support swiping and resume automatic rotation', () => {
  const h = setup(); h.create(3);
  h.pointer('pointerdown', 200);
  assert.equal(h.featured.paused, true); assert.equal(h.timers.size, 0);
  h.pointer('pointerup', 20);
  assert.equal(h.featured.index, 1); assert.equal(h.featured.lastSwipe, 123456);
  assert.equal(h.featured.paused, false); assert.equal(h.timers.size, 1);
});

test('backgrounding pauses rotation and returning resumes only a multi-item carousel', () => {
  for (const count of [1, 2]) {
    const h = setup(); h.create(count);
    h.hidden(true); assert.equal(h.timers.size, 0);
    h.hidden(false); assert.equal(h.timers.size, count > 1 ? 1 : 0);
  }
});

test('backgrounding during a swipe cannot leave rotation permanently paused', () => {
  const h = setup(); h.create(2); h.pointer('pointerdown', 200);
  h.hidden(true); h.hidden(false); h.pointer('pointerup', 20);
  assert.equal(h.featured.paused, false); assert.equal(h.featured.index, 0);
  assert.equal(h.timers.size, 1);
});

test('an expanded card pauses automatic rotation until it collapses', () => {
  const h = setup(); h.create(2);
  h.context.expandedCard = {}; h.context.pauseFeatured(); h.hidden(false);
  assert.equal(h.timers.size, 0);
  h.context.expandedCard = null; h.context.resumeFeatured();
  assert.equal(h.timers.size, 1);
});

test('changing from multiple items to one removes the old timer and controls', () => {
  const h = setup(); h.create(3); h.tick(); h.create(1);
  assert.equal(h.featured.index, 0); assert.equal(h.featured.dots.length, 0);
  assert.equal(h.featured.timer, null); assert.equal(h.timers.size, 0);
});

test('removing all featured posters clears rotation and stale swipe suppression', () => {
  const h = setup(); h.create(2); h.featured.lastSwipe = 123456;
  h.context.destroyFeatured();
  assert.equal(h.featured.slides.length, 0); assert.equal(h.featured.dots.length, 0);
  assert.equal(h.featured.lastSwipe, 0); assert.equal(h.featured.timer, null); assert.equal(h.timers.size, 0);
});

console.log(`${checks} featured carousel checks passed.`);
