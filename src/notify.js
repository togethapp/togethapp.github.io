/**
 * Notifications, the parts that need no browser: whether this one can receive
 * them, what to tell the notifier, and what to remember having told it.
 */

/** The kinds of document whose arrival in a group is worth a notification. */
const NEWS_KINDS = new Set(['poll', 'list', 'spend', 'board']);

/**
 * What this browser can do: 'ready' (ask away), 'install' (an iPhone in
 * Safari: only the app on the home screen receives them), 'denied' (refused
 * in the phone's settings), or 'unsupported'.
 */
export function pushSupport({ worker, push, notification, permission, phone, standalone }) {
  if (worker && push && notification) return permission === 'denied' ? 'denied' : 'ready';
  if (phone === 'ios' && !standalone) return 'install';
  return 'unsupported';
}

/**
 * Whether a document just written with a group key may be news for the
 * group: one of the kinds above, shared in the group rather than by link.
 */
export function mayBeNews(document_) {
  return Boolean(document_ && typeof document_.id === 'string' && NEWS_KINDS.has(document_.kind) && !document_.linkOnly);
}

/**
 * What has been told about a document: its arrival, and the day it settled
 * on. Told once each, so a list ticked twenty times costs one call.
 */
export function toldKey(document_) {
  return `${document_.id}|${document_.kind === 'poll' && document_.date ? document_.date : ''}`;
}

/** Remember a key told, the newest last, the oldest forgotten past `limit`. */
export function rememberTold(told, key, limit = 400) {
  return [...told.filter((one) => one !== key), key].slice(-limit);
}

/** The fields the database keeps of a subscription, from its JSON form. */
export function subscriptionFields(json) {
  const endpoint = typeof json?.endpoint === 'string' ? json.endpoint : '';
  const p256dh = typeof json?.keys?.p256dh === 'string' ? json.keys.p256dh : '';
  const auth = typeof json?.keys?.auth === 'string' ? json.keys.auth : '';
  return endpoint && p256dh && auth ? { endpoint, p256dh, auth } : null;
}

/** A base64url key as the bytes `pushManager.subscribe` takes. */
export function keyBytes(text) {
  const plain = String(text || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = plain + '='.repeat((4 - (plain.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}
