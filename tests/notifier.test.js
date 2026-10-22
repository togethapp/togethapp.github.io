import test from 'node:test';
import assert from 'node:assert/strict';

import { dayText, handle, isPushService, messageFor } from '../supabase/functions/notifier/handler.js';
import { toBase64Url } from '../supabase/functions/notifier/webpush.js';

const subtle = globalThis.crypto.subtle;

async function subscription(endpoint, lang = 'fr') {
  const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  return {
    endpoint, lang, app: 'https://x.github.io/Code/',
    p256dh: toBase64Url(new Uint8Array(await subtle.exportKey('raw', pair.publicKey))),
    auth: toBase64Url(crypto.getRandomValues(new Uint8Array(16))),
  };
}

/** A database and push services that answer what the test says, and remember what they were asked. */
function world(answers) {
  const calls = [];
  const vapid = { held: null };
  const fetchImpl = async (url, options) => {
    const body = options.body instanceof Uint8Array ? options.body : JSON.parse(options.body || 'null');
    calls.push({ url, options, body });
    const fn = /\/rpc\/(\w+)$/.exec(url)?.[1];
    const reply = (status, value) => ({ ok: status < 300, status, text: async () => (value === undefined ? '' : JSON.stringify(value)) });
    if (fn === 'marque_points_push_vapid') {
      if (body.p_public && !vapid.held) vapid.held = { public: body.p_public, private: body.p_private };
      return reply(200, vapid.held);
    }
    if (fn) return reply(200, answers[fn] ?? null);
    // A push service.
    return reply(answers.pushStatus?.[url] ?? 201);
  };
  return { calls, fetchImpl, vapid };
}

const post = (body) => new Request('https://p.supabase.co/functions/v1/notifier', { method: 'POST', body: JSON.stringify(body) });
const ENV = { base: 'https://p.supabase.co', serviceKey: 'service-key' };

test('a day reads as people say it, in both languages', () => {
  assert.equal(dayText('2026-10-17', '20:00', 'fr'), 'samedi 17 octobre à 20:00');
  assert.equal(dayText('2026-10-17', null, 'en'), 'Saturday 17 October');
  assert.equal(dayText('pas une date', null, 'fr'), '');
});

test('messages say what is new, where, and open the right page', () => {
  const target = { lang: 'fr', app: 'https://x.github.io/Code/' };
  const poll = messageFor({ event: 'new', id: 'v_1', group: 'Mifa', doc: { kind: 'poll', question: 'Quel soir ?' } }, target);
  assert.deepEqual(poll, { title: 'Mifa', body: 'Nouveau sondage : Quel soir ?', url: 'https://x.github.io/Code/#/poll/v_1', tag: 'new-v_1' });
  const event = messageFor({ event: 'new', id: 'v_2', group: 'Mifa', doc: { kind: 'poll', fixed: true, title: 'Raclette', date: '2026-10-17', at: '20:00' } }, target);
  assert.equal(event.body, 'Nouvel événement : Raclette — samedi 17 octobre à 20:00');
  const date = messageFor({ event: 'date', id: 'v_1', group: 'Mifa', doc: { kind: 'poll', question: 'Quel soir pour la raclette ?', date: '2026-10-17' } }, { lang: 'en', app: '' });
  assert.match(date.body, /^Date set: .+ — Saturday 17 October$/);
  assert.equal(date.url, '#/poll/v_1', 'without a known address, the page the worker serves');
  assert.equal(messageFor({ event: 'new', id: 'l_1', group: 'Mifa', doc: { kind: 'list', name: 'Courses' } }, target).body, 'Nouvelle liste : Courses');
  assert.equal(messageFor({ event: 'new', id: 'b_1', group: 'Mifa', doc: { kind: 'board', name: 'Cadeau' } }, target).url, 'https://x.github.io/Code/#/idea/b_1');
  const knock = messageFor({ event: 'knock', group: 'Mifa', who: 'Zoé' }, target);
  assert.equal(knock.body, 'Zoé demande à entrer.');
  assert.equal(knock.url, 'https://x.github.io/Code/#/groups');
});

test('the eve of an event says what is tomorrow, and what is still to do', () => {
  const target = { lang: 'fr', app: 'https://x.github.io/Code/' };
  const raclette = messageFor({
    event: 'eve', id: 'v_1', group: 'Mifa', day: '2026-10-17', starts: true,
    doc: { kind: 'poll', title: 'Raclette', date: '2026-10-17', at: '20:00' },
    activities: [], left: { lines: 2, polls: 1 },
  }, target);
  assert.deepEqual(raclette, {
    title: 'Mifa',
    body: 'Demain : Raclette à 20:00. Reste à faire : 2 lignes à cocher, 1 sondage ouvert.',
    url: 'https://x.github.io/Code/#/poll/v_1',
    tag: 'eve-v_1-2026-10-17',
  });
  const nothingLeft = messageFor({
    event: 'eve', id: 'v_2', group: 'Mifa', day: '2026-10-17', starts: true,
    doc: { kind: 'poll', question: 'Quel soir pour la raclette ?' },
    activities: [{ title: 'Apéro', at: '19:00' }], left: { lines: 0, polls: 0 },
  }, { lang: 'en', app: '' });
  assert.equal(nothingLeft.body, 'Tomorrow: Raclette. On the programme: Apéro at 19:00.');
  const stay = messageFor({
    event: 'eve', id: 'v_3', group: 'Mifa', day: '2026-10-17', starts: false,
    doc: { kind: 'poll', title: 'Vacances', date: '2026-10-15' },
    activities: [{ question: 'Resto' }, { title: 'Kayak', at: '10:00' }], left: { lines: 0, polls: 0 },
  }, target);
  assert.equal(stay.body, 'Demain, pendant « Vacances » : Resto, Kayak à 10:00.');
  assert.equal(messageFor({ event: 'eve', id: 'v_4', group: 'Mifa', starts: true, doc: { title: 'Ciné' }, left: { lines: 1 } }, target).body,
    'Demain : Ciné. Reste à faire : 1 ligne à cocher.');
});

test('reminders are asked of the database, and each goes to its own targets', async () => {
  const alice = await subscription('https://fcm.googleapis.com/fcm/send/alice');
  const bob = await subscription('https://web.push.apple.com/bob', 'en');
  const { calls, fetchImpl } = world({
    marque_points_push_reminders: [
      { event: 'eve', id: 'v_1', group: 'Mifa', day: '2026-10-17', starts: true, doc: { title: 'Raclette' }, targets: [alice] },
      { event: 'eve', id: 'v_2', group: 'Voisins', day: '2026-10-17', starts: true, doc: { title: 'Fête' }, targets: [alice, bob] },
    ],
  });
  const answer = await (await handle(post({ action: 'remind' }), { ...ENV, fetchImpl })).json();
  assert.deepEqual(answer, { status: 'ok', reminders: 2, sent: 3 });
  assert.deepEqual(calls.find((call) => call.url.endsWith('/marque_points_push_reminders')).body, {});
  assert.equal(calls.filter((call) => !call.url.includes('/rpc/')).length, 3);

  const quiet = world({ marque_points_push_reminders: [] });
  assert.deepEqual(await (await handle(post({ action: 'remind' }), { ...ENV, fetchImpl: quiet.fetchImpl })).json(),
    { status: 'ok', reminders: 0, sent: 0 });
  assert.equal(quiet.calls.some((call) => call.url.endsWith('/marque_points_push_vapid')), false, 'nothing to send, no key to read');
});

test('words left say who, where and what', async () => {
  const target = { lang: 'fr', app: 'https://x.github.io/Code/' };
  const one = messageFor({
    event: 'words', id: 'v_1', group: 'Mifa', doc: { kind: 'poll', fixed: true, title: 'Raclette', date: '2026-10-30' },
    words: [{ n: 'Alice', t: 'J’apporte le fromage' }],
  }, target);
  assert.deepEqual(one, { title: 'Mifa', body: 'Alice sur « Raclette » : J’apporte le fromage', url: 'https://x.github.io/Code/#/poll/v_1', tag: 'words-v_1' });
  const many = messageFor({
    event: 'words', id: 'b_1', group: 'Mifa', doc: { kind: 'board', name: 'Cadeau' },
    words: [{ n: 'Alice', t: 'Un livre ?' }, { n: 'Bob', t: 'Ou un jeu' }, { n: 'Alice', t: 'Les deux' }],
  }, { lang: 'en', app: '' });
  assert.equal(many.body, '3 words on « Cadeau »: Alice, Bob');
  assert.equal(many.url, '#/idea/b_1');
  assert.equal(messageFor({ event: 'words', id: 'v_2', group: 'Mifa', doc: { kind: 'poll', question: 'Quel soir ?' }, words: [{ t: 'Samedi' }] }, target).body,
    'Quelqu’un sur « Quel soir ? » : Samedi');

  const alice = await subscription('https://fcm.googleapis.com/fcm/send/alice');
  const { calls, fetchImpl } = world({
    marque_points_push_words: { status: 'ok', event: 'words', id: 'b_1', group: 'Mifa', doc: { kind: 'board', name: 'Cadeau' }, words: [{ n: 'Bob', t: 'Un jeu' }], targets: [alice] },
  });
  assert.deepEqual(await (await handle(post({ action: 'words', key: 'cle', id: 'b_1' }), { ...ENV, fetchImpl })).json(), { status: 'ok', sent: 1 });
  assert.deepEqual(calls.find((call) => call.url.endsWith('/marque_points_push_words')).body, { p_key: 'cle', p_id: 'b_1' });
});

test('the first call makes the key pair, later ones keep it', async () => {
  const { fetchImpl, vapid } = world({});
  const first = await (await handle(post({ action: 'key' }), { ...ENV, fetchImpl })).json();
  const second = await (await handle(post({ action: 'key' }), { ...ENV, fetchImpl })).json();
  assert.equal(first.status, 'ok');
  assert.equal(first.key, vapid.held.public);
  assert.equal(second.key, first.key);
});

test('news goes to every target, encrypted, and a gone subscription is forgotten', async () => {
  const alice = await subscription('https://fcm.googleapis.com/fcm/send/alice');
  const bob = await subscription('https://web.push.apple.com/bob', 'en');
  const { calls, fetchImpl } = world({
    marque_points_push_event: {
      status: 'ok', event: 'new', id: 'v_1', group: 'Mifa', doc: { kind: 'poll', question: 'Quel soir ?' }, targets: [alice, bob],
    },
    pushStatus: { 'https://web.push.apple.com/bob': 410 },
  });
  const answer = await (await handle(post({ action: 'doc', key: 'cle', id: 'v_1' }), { ...ENV, fetchImpl })).json();
  assert.deepEqual(answer, { status: 'ok', sent: 1 });
  const asked = calls.find((call) => call.url.endsWith('/marque_points_push_event'));
  assert.deepEqual(asked.body, { p_key: 'cle', p_id: 'v_1' });
  assert.equal(asked.options.headers.authorization, 'Bearer service-key', 'with the service key, never the page’s');
  const pushed = calls.filter((call) => /^https:\/\/(fcm|web\.push)/.test(call.url));
  assert.equal(pushed.length, 2);
  assert.ok(pushed.every((call) => call.options.headers['content-encoding'] === 'aes128gcm'));
  assert.ok(pushed.every((call) => !new TextDecoder().decode(call.body).includes('Quel soir')), 'nothing readable on the way');
  const gone = calls.find((call) => call.url.endsWith('/marque_points_push_gone'));
  assert.deepEqual(gone.body, { p_endpoint: 'https://web.push.apple.com/bob' });
});

test('nothing new, nothing sent', async () => {
  const { calls, fetchImpl } = world({ marque_points_push_event: { status: 'quiet' } });
  const answer = await (await handle(post({ action: 'doc', key: 'cle', id: 'v_1' }), { ...ENV, fetchImpl })).json();
  assert.deepEqual(answer, { status: 'quiet', sent: 0 });
  assert.equal(calls.some((call) => !call.url.includes('/rest/v1/')), false);
});

test('a knock is asked with its ticket', async () => {
  const gui = await subscription('https://updates.push.services.mozilla.com/wpush/v2/gui');
  const { calls, fetchImpl } = world({ marque_points_push_knock: { status: 'ok', event: 'knock', group: 'Mifa', who: 'Zoé', targets: [gui] } });
  const answer = await (await handle(post({ action: 'knock', ticket: 'jeton' }), { ...ENV, fetchImpl })).json();
  assert.deepEqual(answer, { status: 'ok', sent: 1 });
  assert.deepEqual(calls.find((call) => call.url.endsWith('/marque_points_push_knock')).body, { p_ticket: 'jeton' });
});

test('anything else is refused, and the browser may ask first', async () => {
  const { fetchImpl } = world({});
  assert.equal((await handle(post({ action: 'everyone' }), { ...ENV, fetchImpl })).status, 400);
  assert.equal((await handle(post({ action: 'doc', key: 1 }), { ...ENV, fetchImpl })).status, 400);
  assert.equal((await handle(new Request('https://p/x', { method: 'GET' }), { ...ENV, fetchImpl })).status, 405);
  const preflight = await handle(new Request('https://p/x', { method: 'OPTIONS' }), { ...ENV, fetchImpl });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
  assert.equal((await handle(post({ action: 'key' }), { base: '', serviceKey: '', fetchImpl })).status, 500);
});

test('only the browsers’ push services are written to', async () => {
  assert.equal(isPushService('https://fcm.googleapis.com/fcm/send/x'), true);
  assert.equal(isPushService('https://updates.push.services.mozilla.com/wpush/v2/x'), true);
  assert.equal(isPushService('https://web.push.apple.com/x'), true);
  assert.equal(isPushService('https://wns2-par02p.notify.windows.com/w/?token=x'), true);
  assert.equal(isPushService('https://attacker.example/push'), false);
  assert.equal(isPushService('https://fcm.googleapis.com.attacker.example/x'), false);
  assert.equal(isPushService('http://fcm.googleapis.com/fcm/send/x'), false);
  const odd = await subscription('https://attacker.example/push');
  const { calls, fetchImpl } = world({
    marque_points_push_event: { status: 'ok', event: 'new', id: 'v_1', group: 'Mifa', doc: { kind: 'poll', question: 'Q' }, targets: [odd] },
  });
  const answer = await (await handle(post({ action: 'doc', key: 'cle', id: 'v_1' }), { ...ENV, fetchImpl })).json();
  assert.deepEqual(answer, { status: 'ok', sent: 0 });
  assert.equal(calls.some((call) => call.url.startsWith('https://attacker.example')), false);
});
