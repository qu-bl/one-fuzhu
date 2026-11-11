import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const loader = app.slice(app.indexOf('async function loadJson('), app.indexOf('function renderActivities('));
const contentFile = readFileSync(new URL('../data/content.json', import.meta.url));
const publishedVersion = JSON.parse(readFileSync(new URL('../data/version.json', import.meta.url), 'utf8')).version;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const content = title => ({ cards: [{ title }], banners: [] });
const old = { version: hash(JSON.stringify(content('old'))), content: content('old') };
const nextText = JSON.stringify(content('new'));
const nextVersion = hash(nextText);
const versionURL = './data/version.json';
const contentURL = './data/content.json';
const nextURL = `${contentURL}?v=${nextVersion}`;

function harness(snapshot, respond) {
  let stored = snapshot ? JSON.stringify(snapshot) : null;
  const requests = [];
  const renders = [];
  const ctx = vm.createContext({
    crypto: webcrypto,
    TextDecoder,
    console: { warn() {} },
    localStorage: {
      getItem: () => stored,
      setItem: (_, value) => { stored = value; }
    },
    fetch: async url => {
      requests.push(url);
      return respond(url);
    }
  });
  vm.runInContext(loader, ctx);
  const run = () => ctx.loadSiteContent((value, preserveScroll = false) => {
    renders.push([value.cards[0].title, preserveScroll]);
  });
  return { requests, renders, run, snapshot: () => JSON.parse(stored) };
}

test('the published version identifies the exact content file', () => {
  assert.equal(publishedVersion, hash(contentFile));
});

test('the same version displays the cache immediately and fetches only the version file', async () => {
  const h = harness(old, () => Response.json({ version: old.version }));
  const task = h.run();
  assert.deepEqual(h.renders, [['old', false]]);
  await task;
  assert.deepEqual(h.requests, [versionURL]);
  assert.deepEqual(h.snapshot(), old);
});

test('a new version replaces visible content and storage only after the download is verified', async () => {
  let finish;
  const body = new Promise(resolve => { finish = resolve; });
  const h = harness(old, url => url === versionURL ? Response.json({ version: nextVersion }) : body);
  const task = h.run();
  assert.deepEqual(h.renders, [['old', false]]);
  assert.deepEqual(h.snapshot(), old);
  finish(new Response(nextText));
  await task;
  assert.deepEqual(h.requests, [versionURL, nextURL]);
  assert.deepEqual(h.renders, [['old', false], ['new', true]]);
  assert.deepEqual(h.snapshot(), { version: nextVersion, content: content('new') });
});

test('a failed check, interrupted download or CDN mismatch preserves the last successful version', async () => {
  for (const respond of [
    () => { throw new Error('offline'); },
    url => url === versionURL ? Response.json({ version: nextVersion }) : new Response(null, { status: 503 }),
    url => url === versionURL ? Response.json({ version: nextVersion }) : Response.json(old.content)
  ]) {
    const h = harness(old, respond);
    await h.run();
    assert.deepEqual(h.renders, [['old', false]]);
    assert.deepEqual(h.snapshot(), old);
  }
});

test('a first visit can render content during the version file rollout', async () => {
  const h = harness(null, url => url === versionURL
    ? new Response(null, { status: 404 }) : Response.json(old.content));
  await h.run();
  assert.deepEqual(h.requests, [versionURL, contentURL]);
  assert.deepEqual(h.renders, [['old', false]]);
  assert.equal(h.snapshot(), null);
});
