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

/**
 * Why turning notifications on failed, from the step that failed and what it
 * met there — so the app can say what to do rather than « try again »:
 *
 *   'worker'    the app's service worker never got ready (reload the page)
 *   'offline'   nothing answers, the database no more than the notifier
 *   'function'  the notifier is not in place, or does not start. Supabase
 *               answers for such a function without the headers a page needs
 *               to read the answer, so the browser reports a failed fetch, not
 *               a 404 — told apart from no network by `answers`: whether the
 *               database itself still answers
 *   'database'  the notifier answers, but cannot read the database (502: the
 *               SQL of the notifications not run, most likely)
 *   'denied'    the browser refused to subscribe despite the permission
 *   'browser'   the browser's own push service (Microsoft for Edge, Google for
 *               Chrome, Mozilla for Firefox) did not subscribe it
 *   'account'   every group asks for an account, and this device has none
 *   'refused'   the database kept the subscription for no group
 *
 * `met` is what was thrown, or for 'register' what each group answered.
 */
export function activationProblem(step, met = null, answers = true) {
  if (step === 'worker') return 'worker';
  if (step === 'key') {
    const status = Number(met?.status) || 0;
    if (!status) return answers ? 'function' : 'offline';
    return status === 502 ? 'database' : 'function';
  }
  if (step === 'subscribe') return met?.name === 'NotAllowedError' ? 'denied' : 'browser';
  if (step === 'register') {
    const said = Array.isArray(met) ? met : [];
    if (said.length && said.every((one) => one?.status === 'account')) return 'account';
    if (said.length && said.every((one) => one instanceof Error && !one.status)) return 'offline';
    return 'refused';
  }
  return 'failed';
}

/** What the browser or the database said, short: for whoever asks why. */
export function problemDetail(error) {
  if (!error) return '';
  if (!(error instanceof Error) && typeof error.status === 'string') return error.status;
  const name = error.name && error.name !== 'Error' ? `${error.name}: ` : '';
  return `${name}${error.message || ''}`.replace(/\s+/g, ' ').trim().slice(0, 160);
}
