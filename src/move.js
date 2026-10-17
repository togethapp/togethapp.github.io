/**
 * Moving house. Together changed address, and a phone keeps what it knows of
 * an app under the address it was opened at: at the new one, it starts with
 * nothing — no group, no key, no document. The page left at the old address
 * (relais/) hands over what this phone kept there, in the link that brings it
 * here, after the `#` that never leaves the phone; takeMove() puts it in place
 * before the app reads anything.
 *
 * Who may hand data over is the old address itself: a link of the same shape
 * from anywhere else — someone's message, a page that sends here — is shown
 * for what it is and asked about first, never taken in silence.
 */

/** The address Together had: the only one whose hand-over is taken without asking. */
export const MOVE_FROM = ['https://wjrnj9zy72-design.github.io/'];

/** `#/move/<what was kept>/<where it was going>`. */
export const MOVE_ROUTE = /^#\/move\/([^/]*)(?:\/(.*))?$/;

const MOVE_PREFIX = 'marque-points:';

/**
 * What never moves: the account's session (signing in again is one code
 * away), a database other than the app's own (the app knows its own, and a
 * link must not point it at another), and the old address's own note.
 */
const MOVE_LEFT = new Set(['marque-points:account:v1', 'marque-points:remote:v1', 'marque-points:moved']);

/** What this phone kept of Together, as the old address sends it: everything but what never moves. */
export function moveKept(storage) {
  const kept = {};
  for (let index = 0; index < storage.length; index += 1) {
    const name = storage.key(index);
    if (name && name.startsWith(MOVE_PREFIX) && !MOVE_LEFT.has(name)) kept[name] = storage.getItem(name);
  }
  return kept;
}

/** Text fit for an address: the entries as JSON, in UTF-8, in URL-safe base64. */
export function moveEncode(entries) {
  let binary = '';
  for (const byte of new TextEncoder().encode(JSON.stringify(entries))) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The entries back, or null for anything that is not a hand-over: only text values, under Together's keys. */
export function moveDecode(text) {
  try {
    const binary = atob(String(text).replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const entries = Object.entries(parsed).filter(([name, value]) => name.startsWith(MOVE_PREFIX) && !MOVE_LEFT.has(name) && typeof value === 'string');
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

const moveIsObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const moveWithIds = (value) => Array.isArray(value) && value.every((item) => moveIsObject(item) && typeof item.id === 'string');
const moveOfText = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');

/** Two values of one place: what is here stays, what came fills the gaps. */
function moveFill(here, came) {
  if (moveWithIds(here) && moveWithIds(came)) {
    const known = new Set(here.map((item) => item.id));
    return [...here, ...came.filter((item) => !known.has(item.id))];
  }
  if (moveOfText(here) && moveOfText(came)) return [...new Set([...here, ...came])];
  if (moveIsObject(here) && moveIsObject(came)) {
    const filled = { ...here };
    for (const [name, value] of Object.entries(came)) {
      if (!(name in here)) filled[name] = value;
      else if (moveWithIds(here[name]) && moveWithIds(value)) filled[name] = moveFill(here[name], value);
      else if (moveIsObject(here[name]) && moveIsObject(value)) filled[name] = { ...value, ...here[name] };
    }
    return filled;
  }
  return here;
}

/**
 * What to write, given what is here and what came. Nothing here is lost or
 * changed: a key not here is taken whole; the documents not here are added
 * beside those that are; the preferences not set here — a name, groups and
 * their keys, the right to organise a poll — are added to those that are.
 */
export function moveMerge(here, came) {
  const writes = {};
  for (const [name, value] of Object.entries(came)) {
    if (here[name] == null) {
      writes[name] = value;
      continue;
    }
    try {
      const filled = JSON.stringify(moveFill(JSON.parse(here[name]), JSON.parse(value)));
      if (filled !== here[name]) writes[name] = filled;
    } catch {
      // Not JSON on one side or the other: what is here stays.
    }
  }
  return writes;
}

/** How much came: groups and documents, to say so — or to ask about it. */
export function moveCount(entries) {
  const count = (name) => {
    try {
      const value = JSON.parse(entries[name] || 'null');
      return Array.isArray(value) ? value.length : 0;
    } catch {
      return 0;
    }
  };
  let groups = 0;
  try {
    groups = (JSON.parse(entries['marque-points:prefs:v1'] || 'null')?.groups || []).length;
  } catch {
    groups = 0;
  }
  const documents = ['games', 'lists', 'polls', 'spends', 'boards'].reduce((sum, kind) => sum + count(`marque-points:${kind}:v1`), 0);
  return { groups, documents };
}

/** Write what came into what is here. */
export function moveInto(storage, came) {
  const here = {};
  for (let index = 0; index < storage.length; index += 1) {
    const name = storage.key(index);
    if (name) here[name] = storage.getItem(name);
  }
  for (const [name, value] of Object.entries(moveMerge(here, came))) storage.setItem(name, value);
}

/**
 * On arriving, before the app reads anything: a hand-over in the address is
 * taken in — at once when it comes from the old address, else kept aside for
 * the app to ask about (`asking`) — and the address goes back to where the
 * link was going. Returns what happened, or null when nothing was handed over.
 */
export function takeMove({ location, history, storage, aside, referrer = '', from = MOVE_FROM }) {
  const found = String(location.hash || '').match(MOVE_ROUTE);
  if (!found) return null;
  const came = moveDecode(found[1]);
  let then = '';
  try {
    then = decodeURIComponent(found[2] || '');
  } catch {
    then = '';
  }
  // Where the link was going, and nothing of what it carried left in sight.
  history.replaceState(null, '', `${location.pathname}${location.search}${/^#\//.test(then) ? then : ''}`);
  if (!came || !Object.keys(came).length) return { status: 'empty' };
  const counts = moveCount(came);
  if (!from.some((origin) => String(referrer).startsWith(origin))) {
    try {
      aside.setItem('marque-points:arriving', JSON.stringify(came));
    } catch {
      return { status: 'empty' };
    }
    return { status: 'asking', ...counts };
  }
  try {
    moveInto(storage, came);
  } catch {
    return { status: 'failed' };
  }
  return { status: 'moved', ...counts };
}
