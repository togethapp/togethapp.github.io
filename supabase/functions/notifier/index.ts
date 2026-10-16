// Généré par tools/bundle.js — modifiez les sources, pas ce fichier.
//
// Collez ce fichier dans Supabase → Edge Functions, sous le nom « notifier »,
// avec la vérification du JWT **désactivée**. Voir docs/DEPLOIEMENT.md, étape 10.
//
// Le fichier fait 561 lignes. Si l'éditeur en affiche moins une fois collé,
// le collage est incomplet : refaites un « tout sélectionner » dans l'éditeur,
// puis recollez. Le plus sûr est de copier depuis la version brute du fichier
// sur GitHub (bouton « Raw »), qui est du texte et rien d'autre.
/**
 * The calendar file: what the app has settled, in the one format every
 * calendar on earth already reads.
 *
 * iCalendar (RFC 5545) is written by hand here, like the .docx and the .pdf,
 * for the same reason: it is a text format with a handful of rules, and a
 * dependency would weigh more than the rules do.
 *
 * Two kinds of thing end up in it — a poll that has settled on a day, and a
 * line that is due on one. Both are days rather than instants, so both are
 * all-day events unless an hour was given; a day carries no time zone, which
 * is exactly why a family calendar can be read from anywhere without anything
 * moving.
 *
 * Pure: documents in, one string out.
 */

/** The characters iCalendar reserves inside a value. */
function icsEscape(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** A day as the app writes one, `AAAA-MM-JJ`, and an hour, `HH:MM`. */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Lines are folded at 75 octets — octets, not characters: an accented letter
 * weighs two, and a fold counted in characters splits one of them in half and
 * hands the calendar a broken file. The continuation starts with one space.
 */
function foldLine(line) {
  const bytes = new TextEncoder().encode(String(line));
  if (bytes.length <= 75) return String(line);

  const parts = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never cut inside a character: continuation bytes are 10xxxxxx.
    while (end > start && end < bytes.length && (bytes[end] & 0b1100_0000) === 0b1000_0000) end -= 1;
    parts.push(new TextDecoder().decode(bytes.slice(start, end)));
    start = end;
    // Every line after the first carries a leading space of its own.
    limit = 74;
  }
  return parts.join('\r\n ');
}

/** `AAAA-MM-JJ` as iCalendar writes a day: `AAAAMMJJ`. */
function stampDay(day) {
  return String(day || '').replace(/-/g, '');
}

/** The day after, which is where an all-day event ends: DTEND is exclusive. */
function dayAfter(day) {
  const [year, month, date] = String(day).split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + 1));
  const pad = (value) => String(value).padStart(2, '0');
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
}

/**
 * An hour later, as iCalendar writes a local instant: `AAAAMMJJTHHMM00`. Past
 * eleven at night it is the next day — iCalendar has no hour 24.
 */
function hourLater(day, at) {
  const [year, month, date] = String(day).split('-').map(Number);
  const [hour, minute] = String(at).split(':').map(Number);
  const end = new Date(Date.UTC(year, month - 1, date, hour + 1, minute));
  const pad = (value) => String(value).padStart(2, '0');
  return `${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(end.getUTCDate())}`
    + `T${pad(end.getUTCHours())}${pad(end.getUTCMinutes())}00`;
}

/** An instant, in the UTC form iCalendar uses for DTSTAMP. */
function stampNow(at) {
  return new Date(at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * One event.
 *
 * With an hour, the time is written without a zone — "floating" local time,
 * which every calendar reads as the reader's own clock. A dinner at eight is
 * at eight; carrying a time zone would only be right until someone travels.
 */
function vevent({ uid, day, at = null, until = null, summary, description = '', stamp = Date.now() }) {
  // Whatever the documents hold goes into the file: a day or an hour that is
  // not one would break the line it lands on, or the whole feed.
  if (!DAY.test(String(day ?? ''))) return [];
  if (!HOUR.test(String(at ?? ''))) at = null;
  if (!DAY.test(String(until ?? ''))) until = null;
  const lines = [
    'BEGIN:VEVENT',
    `UID:${icsEscape(uid)}`,
    `DTSTAMP:${stampNow(stamp)}`,
  ];

  // Over several days: all of each day, from the first to the last —
  // or, with an hour, from that hour on the first day to the end of the last.
  const last = until && until > day ? until : null;
  if (last && at) {
    const [hour, minute] = String(at).split(':');
    lines.push(`DTSTART:${stampDay(day)}T${hour}${minute}00`);
    lines.push(`DTEND:${dayAfter(last)}T000000`);
  } else if (last) {
    lines.push(`DTSTART;VALUE=DATE:${stampDay(day)}`);
    lines.push(`DTEND;VALUE=DATE:${dayAfter(last)}`);
  } else if (at) {
    const [hour, minute] = String(at).split(':');
    lines.push(`DTSTART:${stampDay(day)}T${hour}${minute}00`);
    lines.push(`DTEND:${hourLater(day, at)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${stampDay(day)}`);
    lines.push(`DTEND;VALUE=DATE:${dayAfter(day)}`);
  }

  lines.push(`SUMMARY:${icsEscape(summary)}`);
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  lines.push('END:VEVENT');
  return lines;
}

/**
 * A whole calendar. CRLF between lines, and a trailing one: readers are
 * forgiving about it, and the specification is not.
 */
function icsFor(events, { name = 'Together' } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Together//Calendrier//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(name)}`,
    ...events.flatMap((event) => vevent(event)),
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/**
 * What the event is called in a calendar.
 *
 * The question makes a poor calendar entry: "Quel soir pour la raclette ?" asks
 * something, and once the day is settled there is nothing left to ask — there
 * is a raclette, and it is on Friday. A name written by hand always wins; the
 * rest is only so that, most of the time, there is nothing to write.
 */
function eventName(poll) {
  if (!poll) return '';
  const own = String(poll.title || '').trim();
  return own || nameFromQuestion(poll.question || '');
}

/**
 * The turns of phrase a date gets asked in, and the thing left over once the
 * date is known.
 *
 * Deliberately timid: each one only fires when what follows is a thing — an
 * article and then a noun. "Quand est-ce qu'on mange ?" leaves a verb behind,
 * and "Mange" is a worse entry than the question itself, so it is left alone.
 * Whatever is not recognised comes back whole, and the field sits in plain
 * sight to be corrected.
 */
const THING = "(?:la|le|les|l['’]|une|un|des|du)\\s+\\S";
const ASKINGS = [
  // "Quel soir pour la raclette ?", "Quelle date pour l'anniversaire de Léa ?"
  /^quel(?:le)?s?\s+\S+\s+pour\s+(.+)$/i,
  // "Quand fait-on la raclette ?", "Quand est-ce qu'on fait la crémaillère ?"
  new RegExp(`^quand\\s+(?:est-ce\\s+qu['’]on|fait-on|faisons-nous|on)\\s+(?:\\S+\\s+)?(${THING}.*)$`, 'i'),
  // "On fait la raclette quand ?"
  new RegExp(`^on\\s+(?:\\S+\\s+){1,2}?(${THING}.*?)\\s+(?:quand|quel(?:le)?s?\\s+\\S+)$`, 'i'),
  // "When for the barbecue?", "What day for the picnic?"
  /^(?:when|what\s+\S+|which\s+\S+)\s+for\s+(.+)$/i,
];

/**
 * The articles one does not put at the head of a calendar entry. Longest
 * first: an alternation takes the first branch that fits, so "le" before
 * "les" would leave an "s" behind.
 */
const ARTICLE = /^(?:de\s+la|de\s+l['’]|des|du|de|les|la|le|l['’]|une|un|the|an|a)\s*/i;

function nameFromQuestion(question) {
  const asked = String(question || '')
    .trim()
    .replace(/\s*[?？]+\s*$/, '')
    .trim();
  if (!asked) return '';

  const matched = ASKINGS.map((pattern) => pattern.exec(asked)).find(Boolean);
  const kept = (matched ? matched[1] : asked).trim().replace(ARTICLE, '').trim();

  // Nothing recognisable under the turn of phrase: the whole question beats an
  // empty name.
  if (!kept) return asked;
  return kept.charAt(0).toUpperCase() + kept.slice(1);
}

/**
 * What a poll has settled, as an event — or nothing, while it has settled
 * nothing. A poll with no day is a question, not an appointment.
 */
function pollEvent(poll, { stamp } = {}) {
  if (!poll || !poll.date) return null;
  return {
    uid: `${poll.id}@together`,
    // Not written into the file — carried so that whatever shows the agenda can
    // send someone back to the thing the day came from.
    kind: 'poll',
    docId: poll.id,
    day: poll.date,
    at: poll.at || null,
    until: poll.until && poll.until > poll.date ? poll.until : null,
    summary: eventName(poll) || 'Sondage',
    description: poll.people?.length ? poll.people.map((person) => person.name).join(', ') : '',
    stamp: stamp ?? poll.updatedAt ?? Date.now(),
  };
}

/** Every line of a list that is due on a day, each on its day. */
function listEvents(list, { stamp } = {}) {
  if (!list || !Array.isArray(list.items)) return [];
  return list.items
    .filter((item) => item.due && !item.done)
    .map((item) => ({
      uid: `${item.id}@together`,
      kind: 'list',
      docId: list.id,
      day: item.due,
      at: null,
      summary: String(item.text ?? ''),
      description: [list.name, list.people?.find((person) => person.id === item.who)?.name]
        .filter(Boolean)
        .join(' · '),
      stamp: stamp ?? item.updatedAt ?? Date.now(),
    }));
}

/**
 * Everything one group has put on a day: its settled polls, then the lines
 * still to do. Archived documents and models are left out — the calendar is
 * for what is still coming, not for what has been put away.
 */
function agendaFor({ lists = [], polls = [] } = {}, groupId = '') {
  const mine = (document_) => (groupId ? document_.groupId === groupId : true);
  const live = (document_) => !document_.archivedAt && !document_.template;

  const events = [
    ...polls.filter((poll) => mine(poll) && live(poll)).map((poll) => pollEvent(poll)).filter(Boolean),
    ...lists.filter((list) => mine(list) && live(list)).flatMap((list) => listEvents(list)),
  ].filter((event) => DAY.test(String(event.day ?? '')));
  return events.sort((a, b) => a.day.localeCompare(b.day) || a.summary.localeCompare(b.summary));
}

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

function toBase64Url(bytes) {
  let text = '';
  for (const byte of new Uint8Array(bytes)) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
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
async function makeVapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { publicKey: toBase64Url(raw), privateJwk: jwk };
}

/**
 * The Authorization header for one push service: a token for its origin,
 * good for twelve hours, signed with the private key.
 */
async function vapidHeader(endpoint, { publicKey, privateJwk }, subject, now = Date.now()) {
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
async function encrypt(payload, { p256dh, auth }, { salt = null, local = null } = {}) {
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
async function sendPush(subscription, message, vapid, subject, fetchImpl = fetch) {
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

/**
 * Notifications: told by the app that something happened, ask the database
 * what is new and whom to tell, then send it.
 *
 * This file is the source; what gets deployed is `index.ts`, built by
 * `node tools/bundle.js` — one file, no import, to be pasted as is into the
 * Supabase editor. Do not edit `index.ts` by hand.
 *
 * The app only says « this document » or « this knock »; the database decides
 * whether it is news (a new document, a date set, someone knocking), and that
 * it is news once. What the message says comes from the database too, never
 * from the caller. The function reads the subscriptions with the service key,
 * which Supabase gives every Edge Function and the page never sees.
 *
 * POST { action: 'key' }                  the public key browsers subscribe with
 * POST { action: 'doc', key, id }         a document was written in a group
 * POST { action: 'knock', ticket }        someone knocked at a group
 */



const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

const WORDS = {
  fr: {
    poll: 'Nouveau sondage', event: 'Nouvel événement', list: 'Nouvelle liste', spend: 'Nouveau compte',
    board: 'Nouveau tableau d’idées', date: 'Date retenue', knock: '{who} demande à entrer.',
    someone: 'Quelqu’un', at: 'à', locale: 'fr-FR',
  },
  en: {
    poll: 'New poll', event: 'New event', list: 'New list', spend: 'New shared expenses',
    board: 'New board of ideas', date: 'Date set', knock: '{who} is asking to join.',
    someone: 'Someone', at: 'at', locale: 'en-GB',
  },
};

const PAGES = { poll: 'poll', list: 'list', spend: 'spend', board: 'idea' };

/** A day as people say it: « samedi 12 octobre à 20:00 ». */
function dayText(date, at, lang) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return '';
  const words = WORDS[lang] || WORDS.fr;
  const day = new Intl.DateTimeFormat(words.locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`));
  return /^\d{2}:\d{2}$/.test(String(at || '')) ? `${day} ${words.at} ${at}` : day;
}

/** Where the app's own page is, so a tap opens the right thing. */
function appUrl(app, hash) {
  return /^https?:\/\//.test(String(app || '')) ? `${app}${hash}` : hash;
}

/** What one person reads, in their language, for what the database answered. */
function messageFor(news, target) {
  const lang = target?.lang === 'en' ? 'en' : 'fr';
  const words = WORDS[lang];
  const title = String(news.group || 'Together');
  if (news.event === 'knock') {
    return {
      title,
      body: words.knock.replace('{who}', String(news.who || '').trim() || words.someone),
      url: appUrl(target?.app, '#/groups'),
      tag: `knock-${news.group}`,
    };
  }
  const doc = news.doc || {};
  const isEvent = doc.kind === 'poll' && doc.fixed === true;
  const name = doc.kind === 'poll'
    ? (isEvent || news.event === 'date' ? eventName(doc) : String(doc.question || '')).trim()
    : String(doc.name || '').trim();
  const when = doc.date ? dayText(doc.date, doc.at, lang) : '';
  const label = news.event === 'date' ? words.date : words[isEvent ? 'event' : doc.kind] || words.poll;
  const colon = lang === 'en' ? ': ' : ' : ';
  const body = [name ? `${label}${colon}${name}` : label, (isEvent || news.event === 'date') && when ? when : '']
    .filter(Boolean).join(' — ');
  return {
    title,
    body,
    url: appUrl(target?.app, `#/${PAGES[doc.kind] || 'poll'}/${news.id}`),
    tag: `${news.event}-${news.id}`,
  };
}

/** The VAPID subject: the app's own address, which every push service accepts. */
function subjectFor(target) {
  try {
    const origin = new URL(target.app).origin;
    if (origin.startsWith('https://')) return origin;
  } catch {
    // No address kept: the fallback below.
  }
  return 'mailto:notifications@together.invalid';
}

/**
 * The function itself, without Deno: `env` gives the database's address and
 * service key, `fetchImpl` the network — both stand-ins in the tests.
 */
async function handle(request, { base, serviceKey, fetchImpl = fetch }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ status: 'error', message: 'POST only' }, 405);
  if (!base || !serviceKey) return json({ status: 'error', message: 'missing configuration' }, 500);

  const rpc = async (fn, body) => {
    const response = await fetchImpl(`${base}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${fn}: ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };

  const vapid = async () => {
    let held = await rpc('marque_points_push_vapid', {});
    if (!held?.public) {
      const made = await makeVapidKeys();
      held = await rpc('marque_points_push_vapid', { p_public: made.publicKey, p_private: made.privateJwk });
    }
    return { publicKey: held.public, privateJwk: held.private };
  };

  let asked = null;
  try {
    asked = await request.json();
  } catch {
    return json({ status: 'error', message: 'JSON expected' }, 400);
  }

  try {
    if (asked?.action === 'key') return json({ status: 'ok', key: (await vapid()).publicKey });

    let news = null;
    if (asked?.action === 'doc' && typeof asked.key === 'string' && typeof asked.id === 'string') {
      news = await rpc('marque_points_push_event', { p_key: asked.key, p_id: asked.id });
    } else if (asked?.action === 'knock' && typeof asked.ticket === 'string') {
      news = await rpc('marque_points_push_knock', { p_ticket: asked.ticket });
    } else {
      return json({ status: 'error', message: 'unknown action' }, 400);
    }
    if (news?.status !== 'ok') return json({ status: news?.status || 'unknown', sent: 0 });

    const targets = Array.isArray(news.targets) ? news.targets : [];
    if (!targets.length) return json({ status: 'ok', sent: 0 });
    const keys = await vapid();
    let sent = 0;
    await Promise.all(targets.map(async (target) => {
      const result = await sendPush(target, messageFor(news, target), keys, subjectFor(target), fetchImpl);
      if (result.ok) sent += 1;
      if (result.gone) await rpc('marque_points_push_gone', { p_endpoint: target.endpoint }).catch(() => null);
    }));
    return json({ status: 'ok', sent });
  } catch {
    return json({ status: 'error', message: 'database unreachable' }, 502);
  }
}

if (typeof Deno !== 'undefined') {
  Deno.serve((request) => handle(request, {
    base: Deno.env.get('SUPABASE_URL'),
    serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  }));
}
