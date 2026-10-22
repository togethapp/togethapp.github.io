import test from 'node:test';
import assert from 'node:assert/strict';

import {
  activationProblem, keyBytes, mayAskReminders, mayBeNews, problemDetail, pushSupport, rememberTold, subscriptionFields,
  toldKey, wordsKey,
} from '../src/notify.js';

test('what this browser can do with notifications', () => {
  const full = { worker: true, push: true, notification: true, permission: 'default', phone: null, standalone: false };
  assert.equal(pushSupport(full), 'ready');
  assert.equal(pushSupport({ ...full, permission: 'denied' }), 'denied');
  assert.equal(pushSupport({ ...full, push: false, phone: 'ios' }), 'install', 'Safari on an iPhone: install first');
  assert.equal(pushSupport({ ...full, push: false, phone: 'ios', standalone: true }), 'unsupported', 'an old iPhone, installed');
  assert.equal(pushSupport({ ...full, worker: false }), 'unsupported', 'the single-file page has no worker');
});

test('only documents shared in a group may be news', () => {
  assert.equal(mayBeNews({ id: 'v1', kind: 'poll' }), true);
  assert.equal(mayBeNews({ id: 'l1', kind: 'list' }), true);
  assert.equal(mayBeNews({ id: 's1', kind: 'spend' }), true);
  assert.equal(mayBeNews({ id: 'b1', kind: 'board' }), true);
  assert.equal(mayBeNews({ id: 'g1', players: [] }), false, 'a game is not announced');
  assert.equal(mayBeNews({ id: 'v2', kind: 'poll', linkOnly: true }), false, 'nor what is shared by link only');
  assert.equal(mayBeNews(null), false);
});

test('a document is told once for its arrival, and again for each day it settles on', () => {
  assert.equal(toldKey({ id: 'v1', kind: 'poll', date: null }), 'v1|');
  assert.equal(toldKey({ id: 'v1', kind: 'poll', date: '2026-10-17' }), 'v1|2026-10-17');
  assert.equal(toldKey({ id: 'l1', kind: 'list', date: '2026-10-17' }), 'l1|', 'a list’s day is no news');
});

test('what was told is kept newest last, within a limit', () => {
  assert.deepEqual(rememberTold(['a', 'b'], 'a'), ['b', 'a']);
  assert.deepEqual(rememberTold(['a', 'b', 'c'], 'd', 3), ['b', 'c', 'd']);
});

test('of an evening, a device asks for the eve’s reminders, once an hour at most', () => {
  const at = (hour, minute = 0) => new Date(2026, 9, 21, hour, minute);
  assert.equal(mayAskReminders(0, at(18)), true);
  assert.equal(mayAskReminders(0, at(22, 59)), true);
  assert.equal(mayAskReminders(0, at(17, 59)), false, 'not before six');
  assert.equal(mayAskReminders(0, at(23)), false, 'nor at night');
  assert.equal(mayAskReminders(at(19).getTime(), at(19, 30)), false, 'asked half an hour ago');
  assert.equal(mayAskReminders(at(19).getTime(), at(20, 1)), true);
});

test('a subscription’s fields, or nothing', () => {
  assert.deepEqual(subscriptionFields({ endpoint: 'https://p/x', keys: { p256dh: 'P', auth: 'A' } }), { endpoint: 'https://p/x', p256dh: 'P', auth: 'A' });
  assert.equal(subscriptionFields({ endpoint: 'https://p/x', keys: {} }), null);
  assert.equal(subscriptionFields(null), null);
});

test('the public key becomes the bytes the browser takes', () => {
  assert.deepEqual([...keyBytes('AP8-_w')], [0, 255, 62, 255]);
});

test('turning notifications on says which step failed, not « try again »', () => {
  const answered = (status, message = '') => Object.assign(new Error(message), { status });
  assert.equal(activationProblem('worker'), 'worker', 'the service worker never got ready');

  // The notifier, asked for its key.
  const unread = new TypeError('Failed to fetch');
  assert.equal(activationProblem('key', unread, true), 'function',
    'no answer the page can read while the database answers: Supabase without the function, which sends no CORS headers');
  assert.equal(activationProblem('key', unread, false), 'offline', 'nothing answers at all: the network');
  assert.equal(activationProblem('key', answered(404)), 'function', 'a function that is not there, said plainly');
  assert.equal(activationProblem('key', answered(200, 'no key')), 'function', 'a function of that name, but not this one');
  assert.equal(activationProblem('key', answered(502)), 'database', 'the function answers but cannot read the database');

  // The browser's own push service.
  const refused = Object.assign(new Error('Registration failed - push service error'), { name: 'AbortError' });
  assert.equal(activationProblem('subscribe', refused), 'browser');
  assert.equal(activationProblem('subscribe', Object.assign(new Error('denied'), { name: 'NotAllowedError' })), 'denied');

  // The database, once per group.
  assert.equal(activationProblem('register', [{ status: 'account' }, { status: 'account' }]), 'account',
    'every group asks for an account');
  assert.equal(activationProblem('register', [{ status: 'account' }, { status: 'unknown' }]), 'refused');
  assert.equal(activationProblem('register', [new TypeError('Failed to fetch')]), 'offline');
  assert.equal(activationProblem('register', [answered(400, 'abonnement invalide')]), 'refused');
  assert.equal(activationProblem(undefined, new Error('?')), 'failed', 'anything else');
});

test('what was said, short enough to read out', () => {
  const refused = Object.assign(new Error('Registration failed - push service error'), { name: 'AbortError' });
  assert.equal(problemDetail(refused), 'AbortError: Registration failed - push service error');
  assert.equal(problemDetail(new Error('notifier failed: 502\n{"status":"error"}')), 'notifier failed: 502 {"status":"error"}');
  assert.equal(problemDetail({ status: 'account' }), 'account', 'an answer from the database');
  assert.equal(problemDetail(new Error('x'.repeat(500))).length, 160);
  assert.equal(problemDetail(null), '');
});

test('the words left on a poll or a board are told once, while they are recent', () => {
  const now = Date.UTC(2026, 9, 22);
  const said = (made) => ({ id: 'v_1', kind: 'poll', comments: { m_1: { on: '', n: 'Alice', t: 'Oui', made, at: made } } });
  assert.equal(wordsKey(said(now - 1000), now), `v_1|words|${now - 1000}`);
  assert.equal(wordsKey(said(now - 3 * 86400000), now), null, 'too old to be news');
  assert.equal(wordsKey({ id: 'v_1', kind: 'poll' }, now), null);
  assert.equal(wordsKey({ ...said(now), kind: 'list' }, now), null, 'lists have no words');
  assert.equal(wordsKey({ ...said(now), comments: { m_1: { on: '', n: 'Alice', t: '', made: now, at: now } } }, now), null, 'taken back');
});
