import test from 'node:test';
import assert from 'node:assert/strict';

import {
  encrypt, fromBase64Url, makeVapidKeys, sendPush, toBase64Url, vapidHeader,
} from '../supabase/functions/notifier/webpush.js';

const subtle = globalThis.crypto.subtle;

/**
 * A message encrypted once with fixed keys and salt, and checked then with an
 * independent implementation (the http_ece package, outside this project):
 * any change to the derivation shows here.
 */
const VECTOR = {
  uaPrivate: 'JzmVYfp0lkIyQmcvb6Z6G7PrvBxC3u9OyQNCtPNAcAU',
  p256dh: 'BA3xkPq8MXN8qJ3wk_0BrivFfuUnIdGzFWzitn3FfhXJyS5nAgjhs3xLrV-TvwrlAz6OYo_vwuqCGf6w7SIYtlw',
  auth: 'IxNSocK0BfpuTPJ-9QH84w',
  local: {
    kty: 'EC', crv: 'P-256',
    x: 'LpRCKyRVUlzxclDfZb8GXieX3dQ9MmYwlSTwWvJbC7Y',
    y: 'X6koQncU7xLm3GAAB-iaSm0R0ohpoFcu2ZfwA2mlh_I',
    d: 'MLxLX_G6d5XW3NtZbUPhn2MVofFKI0XNkXsx9-FRBy4',
  },
  salt: 'oBWEbcrJIdfM4YKzz6AhZw',
  body: 'oBWEbcrJIdfM4YKzz6AhZwAAEABBBC6UQiskVVJc8XJQ32W_Bl4nl93UPTJmMJUk8FryWwu2X6koQncU7xLm3GAAB-iaSm0R0ohpoFcu2ZfwA2mlh_JJAw5-CTacYnjmOIO0DdQs4-ESY5X9AzmbZWNMoHZSLxh7SpltEAER16BImCYGFzdE4ktS43Bd-t5DinI1',
  plain: 'Quand je serai grand, je serai une pastèque',
};

async function localPair() {
  const { d, ...pub } = VECTOR.local;
  return {
    privateKey: await subtle.importKey('jwk', { ...VECTOR.local, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']),
    publicKey: await subtle.importKey('jwk', { ...pub, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
  };
}

/** The browser's side of RFC 8291, written apart from the sender's. */
async function decrypt(body, uaPrivateD, p256dh, auth) {
  const bytes = new Uint8Array(body);
  const salt = bytes.slice(0, 16);
  const idLength = bytes[20];
  const asPublic = bytes.slice(21, 21 + idLength);
  const sealed = bytes.slice(21 + idLength);
  const uaPublic = fromBase64Url(p256dh);
  const jwk = {
    kty: 'EC', crv: 'P-256', d: uaPrivateD,
    x: toBase64Url(uaPublic.slice(1, 33)), y: toBase64Url(uaPublic.slice(33)),
  };
  const mine = await subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const theirs = await subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: theirs }, mine, 256));
  const derive = async (s, ikm, info, n) => new Uint8Array(await subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: s, info }, await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
  const text = new TextEncoder();
  const info = new Uint8Array([...text.encode('WebPush: info\0'), ...uaPublic, ...asPublic]);
  const ikm = await derive(fromBase64Url(auth), shared, info, 32);
  const cek = await derive(salt, ikm, text.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await derive(salt, ikm, text.encode('Content-Encoding: nonce\0'), 12);
  const key = await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, sealed));
  assert.equal(plain.at(-1), 2, 'the last record ends with its delimiter');
  return new TextDecoder().decode(plain.slice(0, -1));
}

test('base64url goes both ways', () => {
  const bytes = new Uint8Array([0, 255, 62, 63, 1, 2]);
  assert.deepEqual(fromBase64Url(toBase64Url(bytes)), bytes);
  assert.equal(/[+/=]/.test(toBase64Url(bytes)), false);
});

test('the encryption gives exactly the bytes checked against another implementation', async () => {
  const body = await encrypt(VECTOR.plain, VECTOR, { salt: fromBase64Url(VECTOR.salt), local: await localPair() });
  assert.equal(toBase64Url(body), VECTOR.body);
});

test('a fresh message decrypts on the browser’s side, and differs every time', async () => {
  const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const raw = new Uint8Array(await subtle.exportKey('raw', pair.publicKey));
  const { d } = await subtle.exportKey('jwk', pair.privateKey);
  const sub = { p256dh: toBase64Url(raw), auth: toBase64Url(crypto.getRandomValues(new Uint8Array(16))) };
  const one = await encrypt('{"title":"Mifa"}', sub);
  const two = await encrypt('{"title":"Mifa"}', sub);
  assert.equal(await decrypt(one, d, sub.p256dh, sub.auth), '{"title":"Mifa"}');
  assert.notEqual(toBase64Url(one), toBase64Url(two));
  assert.equal(one.length, 16 + 4 + 1 + 65 + '{"title":"Mifa"}'.length + 1 + 16, 'header, message, delimiter, tag');
});

test('the VAPID token is for the push service’s origin, signed, and short-lived', async () => {
  const keys = await makeVapidKeys();
  assert.equal(fromBase64Url(keys.publicKey).length, 65, 'a raw P-256 point, as browsers take it');
  const now = Date.UTC(2026, 9, 16);
  const header = await vapidHeader('https://web.push.apple.com/QGx-abc', keys, 'https://x.github.io', now);
  const [, token, k] = /^vapid t=([^,]+), k=(.+)$/.exec(header);
  assert.equal(k, keys.publicKey);
  const [head, claims, signature] = token.split('.');
  assert.deepEqual(JSON.parse(new TextDecoder().decode(fromBase64Url(head))), { typ: 'JWT', alg: 'ES256' });
  const body = JSON.parse(new TextDecoder().decode(fromBase64Url(claims)));
  assert.equal(body.aud, 'https://web.push.apple.com');
  assert.equal(body.sub, 'https://x.github.io');
  assert.equal(body.exp, now / 1000 + 12 * 3600);
  const point = fromBase64Url(keys.publicKey);
  const verifier = await subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', x: toBase64Url(point.slice(1, 33)), y: toBase64Url(point.slice(33)),
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  assert.ok(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifier, fromBase64Url(signature),
    new TextEncoder().encode(`${head}.${claims}`)));
});

test('sending says when a subscription is gone, and survives a network failure', async () => {
  const keys = await makeVapidKeys();
  const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const sub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    p256dh: toBase64Url(new Uint8Array(await subtle.exportKey('raw', pair.publicKey))),
    auth: toBase64Url(new Uint8Array(16)),
  };
  let seen = null;
  const ok = await sendPush(sub, { title: 'Mifa' }, keys, 'https://x.github.io', async (url, options) => {
    seen = { url, options };
    return { ok: true, status: 201 };
  });
  assert.deepEqual(ok, { ok: true, gone: false, status: 201 });
  assert.equal(seen.url, sub.endpoint);
  assert.equal(seen.options.headers['content-encoding'], 'aes128gcm');
  assert.match(seen.options.headers.authorization, /^vapid t=/);
  assert.equal((await sendPush(sub, {}, keys, 's', async () => ({ ok: false, status: 410 }))).gone, true);
  assert.equal((await sendPush(sub, {}, keys, 's', async () => ({ ok: false, status: 404 }))).gone, true);
  assert.equal((await sendPush(sub, {}, keys, 's', async () => ({ ok: false, status: 429 }))).gone, false);
  assert.deepEqual(await sendPush(sub, {}, keys, 's', async () => { throw new Error('offline'); }), { ok: false, gone: false });
});
