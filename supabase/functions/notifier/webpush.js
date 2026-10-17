/**
 * Web Push, with nothing but WebCrypto — which Deno (the Edge Function) and
 * Node (the tests) both have.
 *
 *   VAPID (RFC 8292): the sender proves who it is with a short ES256 token,
 *   signed by a key pair made once and kept in the database.
 *   aes128gcm (RFC 8188, RFC 8291): the message is encrypted for the one
 *   browser it goes to; the push service carrying it reads nothing.
 */

const encoder = new TextEncoder();

export function toBase64Url(bytes) {
  let text = '';
  for (const byte of new Uint8Array(bytes)) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text) {
  const plain = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const padded = plain + '='.repeat((4 - (plain.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** A new VAPID key pair: the public half raw (what browsers take), the private half as a JWK. */
export async function makeVapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { publicKey: toBase64Url(raw), privateJwk: jwk };
}

/**
 * The Authorization header for one push service: a token for its origin,
 * good for twelve hours, signed with the private key.
 */
export async function vapidHeader(endpoint, { publicKey, privateJwk }, subject, now = Date.now()) {
  const header = toBase64Url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = toBase64Url(encoder.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(now / 1000) + 12 * 3600,
    sub: subject,
  })));
  const key = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  // WebCrypto signs ECDSA as r‖s, which is exactly what ES256 asks for.
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${toBase64Url(signature)}, k=${publicKey}`;
}

async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

/**
 * Encrypt a message for one subscription (its `p256dh` and `auth`, as the
 * browser gave them). `salt` and `local` are there for the tests; left out,
 * they are drawn fresh, as they must be for every message.
 */
export async function encrypt(payload, { p256dh, auth }, { salt = null, local = null } = {}) {
  const uaPublic = fromBase64Url(p256dh);
  const authSecret = fromBase64Url(auth);
  const pair = local || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const peer = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: peer }, pair.privateKey, 256));

  const keyInfo = concat(encoder.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);
  const recordSalt = salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(recordSalt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(recordSalt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);

  // One record, the last: the message, then the delimiter 0x02.
  const plain = concat(typeof payload === 'string' ? encoder.encode(payload) : new Uint8Array(payload), new Uint8Array([2]));
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, plain));

  const recordSize = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(recordSalt, recordSize, new Uint8Array([asPublic.length]), asPublic, sealed);
}

/**
 * Send one notification. Answers what the push service said: `gone` when the
 * subscription no longer exists (the browser unsubscribed, the app was
 * removed) and should be forgotten.
 */
export async function sendPush(subscription, message, vapid, subject, fetchImpl = fetch) {
  const body = await encrypt(JSON.stringify(message), subscription);
  let response;
  try {
    response = await fetchImpl(subscription.endpoint, {
      method: 'POST',
      headers: {
        authorization: await vapidHeader(subscription.endpoint, vapid, subject),
        'content-encoding': 'aes128gcm',
        'content-type': 'application/octet-stream',
        ttl: '86400',
        urgency: 'normal',
      },
      body,
    });
  } catch {
    return { ok: false, gone: false };
  }
  return { ok: response.ok, gone: response.status === 404 || response.status === 410, status: response.status };
}
