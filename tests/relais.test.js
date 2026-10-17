import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { MOVE_FROM, MOVE_ROUTE, moveDecode } from '../src/move.js';

// The page left at the old address (relais/, the content of the repository
// wjrnj9zy72-design.github.io): run on its own, with a phone of our own.
const read = (name) => readFileSync(new URL(`../relais/${name}`, import.meta.url), 'utf8');
const page = read('404.html');
const script = page.match(/<script>([\s\S]*?)<\/script>/)[1];

function storage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (name) => (map.has(name) ? map.get(name) : null),
    setItem: (name, value) => map.set(name, String(value)),
  };
}

/** Where the old address sends a phone, from `path` (+ `hash`), with what it kept. */
function visit(path, kept = storage()) {
  const [pathname, search = ''] = path.split('?');
  const [plain, hash = ''] = pathname.split('#');
  let sent = null;
  const location = { pathname: plain, search: search ? `?${search.split('#')[0]}` : '', hash: hash ? `#${hash}` : '', replace: (url) => { sent = url; } };
  runInNewContext(script, { location, localStorage: kept, TextEncoder, btoa, encodeURIComponent });
  return sent;
}

const NEW = 'https://togethapp.github.io/';
const kept = () => storage({
  'marque-points:prefs:v1': JSON.stringify({ me: 'Zoé', groups: [{ id: 'g1', name: 'Mifa', key: 'k1' }], organiser: { v_1: 's' } }),
  'marque-points:polls:v1': JSON.stringify([{ id: 'v_1', question: 'Quel soir ?' }]),
  'marque-points:account:v1': JSON.stringify({ refresh: 'secret' }),
  'marque-points:remote:v1': JSON.stringify({ url: 'https://ailleurs.example', key: 'k' }),
  'autre-app:cle': 'x',
});

test('the old address sends everything on to the new one, at the same place', () => {
  assert.match(page, new RegExp(`const NEW = '${NEW.replace(/\./g, '\\.')}';`));
  assert.equal(read('index.html'), page, 'its front page is the same page');
  assert.equal(visit('/Code/sondage.html#/poll/v_1/solo'), `${NEW}sondage.html#/poll/v_1/solo`);
  assert.equal(visit('/Code/#/list/l_1'), `${NEW}#/list/l_1`);
  assert.equal(visit('/Code'), NEW);
  assert.equal(visit('/'), NEW);
  assert.equal(visit('/Code/invitation.html#/join/123456/Mifa'), `${NEW}invitation.html#/join/123456/Mifa`);
});

test('the first time, it takes along what the phone kept — the account’s session and another database left behind', () => {
  const phone = kept();
  const sent = visit('/Code/sondage.html#/poll/v_1/solo', phone);
  assert.ok(sent.startsWith(`${NEW}#/move/`), sent);
  const found = sent.slice(NEW.length).match(MOVE_ROUTE);
  assert.ok(found, 'in the shape the app reads');
  assert.deepEqual(Object.keys(moveDecode(found[1])).sort(), ['marque-points:polls:v1', 'marque-points:prefs:v1']);
  assert.equal(moveDecode(found[1])['marque-points:prefs:v1'], phone.getItem('marque-points:prefs:v1'), 'accents and all');
  assert.equal(decodeURIComponent(found[2]), '#/poll/v_1/solo', 'and where the link was going');
  assert.ok(phone.getItem('marque-points:moved'), 'noted, so as not to carry it every time');
  // Then: the same place, nothing carried — unless asked to again.
  assert.equal(visit('/Code/sondage.html#/poll/v_1/solo', phone), `${NEW}sondage.html#/poll/v_1/solo`);
  assert.ok(visit('/Code/?encore#/', phone).startsWith(`${NEW}#/move/`));
});

test('a phone that kept nothing of Together, or cannot say, simply goes on', () => {
  assert.equal(visit('/Code/sondage.html#/poll/v_9/solo', storage({ 'autre-app:cle': 'x' })), `${NEW}sondage.html#/poll/v_9/solo`);
  const refusing = { get length() { throw new Error('blocked'); }, key: () => null, getItem: () => { throw new Error('blocked'); }, setItem: () => {} };
  assert.equal(visit('/Code/#/', refusing), `${NEW}#/`);
});

test('the app at the new address takes the hand-over without asking from the old one only', () => {
  assert.deepEqual(MOVE_FROM, ['https://wjrnj9zy72-design.github.io/']);
});

test('the old service worker gives way: caches emptied, pages let go, gone', () => {
  const worker = read('Code/sw.js');
  assert.doesNotThrow(() => new Function(worker), 'it parses');
  for (const step of ['skipWaiting()', "caches.delete", 'clients.claim()', 'registration.unregister()', 'navigate(']) {
    assert.ok(worker.includes(step), step);
  }
  assert.ok(!/addEventListener\('fetch'/.test(worker), 'it answers no request: they all go to the network');
});
