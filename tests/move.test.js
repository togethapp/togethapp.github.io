import test from 'node:test';
import assert from 'node:assert/strict';

import { MOVE_FROM, moveCount, moveDecode, moveEncode, moveInto, moveKept, moveMerge, takeMove } from '../src/move.js';

/** A localStorage of our own. */
function storage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (name) => (map.has(name) ? map.get(name) : null),
    setItem: (name, value) => map.set(name, String(value)),
    removeItem: (name) => map.delete(name),
    entries: () => Object.fromEntries(map),
  };
}

const prefs = (value) => JSON.stringify(value);

test('what was kept travels whole, accents and all, and nothing else comes back from it', () => {
  const entries = {
    'marque-points:prefs:v1': prefs({ me: 'Zoé', groups: [{ id: 'g1', name: 'Mifa ☀', key: 'k1' }] }),
    'marque-points:lists:v1': JSON.stringify([{ id: 'l1', name: 'Courses de Noël 🎄' }]),
  };
  const text = moveEncode(entries);
  assert.match(text, /^[A-Za-z0-9_-]+$/, 'fit for an address');
  assert.deepEqual(moveDecode(text), entries);
  // Not a hand-over: garbage, a list, keys that are not Together's, values that are not text.
  assert.equal(moveDecode('%%%'), null);
  assert.equal(moveDecode(moveEncode([1, 2])), null);
  assert.deepEqual(moveDecode(moveEncode({ 'autre:cle': 'x', 'marque-points:polls:v1': 3, 'marque-points:games:v1': '[]' })),
    { 'marque-points:games:v1': '[]' });
});

test('the session of the account, another database and the old address’s note never move', () => {
  const kept = moveKept(storage({
    'marque-points:prefs:v1': '{}',
    'marque-points:account:v1': '{"refresh":"secret"}',
    'marque-points:remote:v1': '{"url":"https://ailleurs.example","key":"k"}',
    'marque-points:moved': '1',
    'autre-app:cle': 'x',
  }));
  assert.deepEqual(Object.keys(kept), ['marque-points:prefs:v1']);
  assert.deepEqual(moveDecode(moveEncode({ 'marque-points:account:v1': '{}', 'marque-points:remote:v1': '{}' })), {});
});

test('what is here stays; what came fills the gaps', () => {
  const here = {
    'marque-points:prefs:v1': prefs({ lang: 'en', groups: [{ id: 'g2', name: 'Copains', key: 'new' }], organiser: { v_2: 'b' } }),
    'marque-points:polls:v1': JSON.stringify([{ id: 'v_1', question: 'Ici' }]),
    'marque-points:told:v1': JSON.stringify(['a']),
    'marque-points:games:v1': 'pas du JSON',
  };
  const came = {
    'marque-points:prefs:v1': prefs({
      lang: 'fr', me: 'Gui', groups: [{ id: 'g1', name: 'Mifa', key: 'k1' }, { id: 'g2', name: 'Vieux', key: 'old' }], organiser: { v_1: 'a', v_2: 'z' },
    }),
    'marque-points:polls:v1': JSON.stringify([{ id: 'v_1', question: 'Là-bas' }, { id: 'v_3', question: 'Nouveau' }]),
    'marque-points:told:v1': JSON.stringify(['a', 'b']),
    'marque-points:games:v1': '[]',
    'marque-points:lists:v1': JSON.stringify([{ id: 'l1' }]),
  };
  const writes = moveMerge(here, came);
  assert.deepEqual(JSON.parse(writes['marque-points:prefs:v1']), {
    lang: 'en', me: 'Gui', groups: [{ id: 'g2', name: 'Copains', key: 'new' }, { id: 'g1', name: 'Mifa', key: 'k1' }], organiser: { v_1: 'a', v_2: 'b' },
  });
  assert.deepEqual(JSON.parse(writes['marque-points:polls:v1']).map((poll) => poll.question), ['Ici', 'Nouveau']);
  assert.deepEqual(JSON.parse(writes['marque-points:told:v1']), ['a', 'b']);
  assert.equal(writes['marque-points:lists:v1'], came['marque-points:lists:v1'], 'a key not here is taken whole');
  assert.ok(!('marque-points:games:v1' in writes), 'what cannot be read here is left alone');
  // Nothing to fill: nothing to write.
  assert.deepEqual(moveMerge(here, { 'marque-points:polls:v1': JSON.stringify([{ id: 'v_1', question: 'Là-bas' }]) }), {});
});

test('how much came: groups and documents', () => {
  assert.deepEqual(moveCount({
    'marque-points:prefs:v1': prefs({ groups: [{ id: 'g1' }, { id: 'g2' }] }),
    'marque-points:lists:v1': JSON.stringify([{ id: 'l1' }]),
    'marque-points:polls:v1': JSON.stringify([{ id: 'v_1' }, { id: 'v_2' }]),
  }), { groups: 2, documents: 3 });
  assert.deepEqual(moveCount({}), { groups: 0, documents: 0 });
});

function arriving(hash, referrer, here = {}) {
  const location = { hash, pathname: '/', search: '' };
  const addresses = [];
  const history = { replaceState: (state, title, url) => addresses.push(url) };
  const kept = storage(here);
  const aside = storage();
  const result = takeMove({ location, history, storage: kept, aside, referrer });
  return { result, addresses, kept, aside };
}

const came = {
  'marque-points:prefs:v1': prefs({ me: 'Gui', groups: [{ id: 'g1', name: 'Mifa', key: 'k1' }] }),
  'marque-points:polls:v1': JSON.stringify([{ id: 'v_1' }]),
};
const link = `#/move/${moveEncode(came)}/${encodeURIComponent('#/poll/v_1/solo')}`;

test('from the old address, the hand-over is taken in at once, and the link goes where it was going', () => {
  const { result, addresses, kept } = arriving(link, MOVE_FROM[0]);
  assert.deepEqual(result, { status: 'moved', groups: 1, documents: 1 });
  assert.deepEqual(addresses, ['/#/poll/v_1/solo'], 'nothing of what it carried left in the address');
  assert.equal(kept.getItem('marque-points:prefs:v1'), came['marque-points:prefs:v1']);
  assert.equal(kept.getItem('marque-points:polls:v1'), came['marque-points:polls:v1']);
});

test('from anywhere else, it is set aside for the app to ask about, and nothing is written', () => {
  for (const referrer of ['', 'https://ailleurs.example/', 'https://wjrnj9zy72-design.github.io.ailleurs.example/']) {
    const { result, kept, aside, addresses } = arriving(link, referrer);
    assert.deepEqual(result, { status: 'asking', groups: 1, documents: 1 }, referrer);
    assert.equal(kept.length, 0, referrer);
    assert.deepEqual(JSON.parse(aside.getItem('marque-points:arriving')), came);
    assert.deepEqual(addresses, ['/#/poll/v_1/solo']);
  }
});

test('a broken hand-over, or one going nowhere in the app, leaves only a clean address', () => {
  assert.equal(arriving('#/poll/v_1', MOVE_FROM[0]).result, null, 'an ordinary link is none of this');
  const broken = arriving('#/move/@@@', MOVE_FROM[0]);
  assert.deepEqual(broken.result, { status: 'empty' });
  assert.deepEqual(broken.addresses, ['/']);
  const elsewhere = arriving(`#/move/${moveEncode(came)}/${encodeURIComponent('javascript:alert(1)')}`, MOVE_FROM[0]);
  assert.deepEqual(elsewhere.addresses, ['/'], 'only a place in the app is gone to');
});

test('moving twice adds nothing twice', () => {
  const kept = storage();
  moveInto(kept, came);
  moveInto(kept, came);
  assert.deepEqual(JSON.parse(kept.getItem('marque-points:polls:v1')), [{ id: 'v_1' }]);
  assert.deepEqual(JSON.parse(kept.getItem('marque-points:prefs:v1')).groups, [{ id: 'g1', name: 'Mifa', key: 'k1' }]);
});
