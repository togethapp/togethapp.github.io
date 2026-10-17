import test from 'node:test';
import assert from 'node:assert/strict';

import { keyBytes, mayBeNews, pushSupport, rememberTold, subscriptionFields, toldKey } from '../src/notify.js';

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

test('a subscription’s fields, or nothing', () => {
  assert.deepEqual(subscriptionFields({ endpoint: 'https://p/x', keys: { p256dh: 'P', auth: 'A' } }), { endpoint: 'https://p/x', p256dh: 'P', auth: 'A' });
  assert.equal(subscriptionFields({ endpoint: 'https://p/x', keys: {} }), null);
  assert.equal(subscriptionFields(null), null);
});

test('the public key becomes the bytes the browser takes', () => {
  assert.deepEqual([...keyBytes('AP8-_w')], [0, 255, 62, 255]);
});
