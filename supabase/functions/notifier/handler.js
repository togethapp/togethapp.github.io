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
 * POST { action: 'words', key, id }       words were left on a poll, an event
 *                                         or a board: the group hears them
 * POST { action: 'remind' }               the eve of tomorrow's events, asked
 *                                         every hour (tools/rappels.js); the
 *                                         database says what is due, once
 */

import { eventName } from '../../../src/ics.js';
import { makeVapidKeys, sendPush } from './webpush.js';

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
    tomorrow: 'Demain', during: 'Demain, pendant « {name} »', programme: 'Au programme', left: 'Reste à faire',
    lines: ['{count} ligne à cocher', '{count} lignes à cocher'], polls: ['{count} sondage ouvert', '{count} sondages ouverts'],
    wordOn: '{who} sur « {name} »', wordsOn: '{count} mots sur « {name} »',
  },
  en: {
    poll: 'New poll', event: 'New event', list: 'New list', spend: 'New shared expenses',
    board: 'New board of ideas', date: 'Date set', knock: '{who} is asking to join.',
    someone: 'Someone', at: 'at', locale: 'en-GB',
    tomorrow: 'Tomorrow', during: 'Tomorrow, during « {name} »', programme: 'On the programme', left: 'Still to do',
    lines: ['{count} line to tick', '{count} lines to tick'], polls: ['{count} open poll', '{count} open polls'],
    wordOn: '{who} on « {name} »', wordsOn: '{count} words on « {name} »',
  },
};

const PAGES = { poll: 'poll', list: 'list', spend: 'spend', board: 'idea' };

/** A day as people say it: « samedi 12 octobre à 20:00 ». */
export function dayText(date, at, lang) {
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

/** « 3 lignes à cocher », or nothing when there are none. */
function counted(forms, count) {
  const number = Number(count) || 0;
  return number > 0 ? forms[number === 1 ? 0 : 1].replace('{count}', String(number)) : '';
}

/**
 * The eve of an event: « Demain : Raclette à 20:00. Reste à faire : 2 lignes
 * à cocher, 1 sondage ouvert. » — or, for a stay already begun, tomorrow's
 * activities in it.
 */
function reminderBody(news, words, lang) {
  const colon = lang === 'en' ? ': ' : ' : ';
  const timed = (name, at) => (/^\d{2}:\d{2}$/.test(String(at || '')) ? `${name} ${words.at} ${at}` : name);
  const doc = news.doc || {};
  const name = eventName(doc).trim();
  const programme = (Array.isArray(news.activities) ? news.activities : [])
    .map((one) => timed(eventName(one).trim(), one?.at))
    .filter(Boolean)
    .join(', ');
  const said = news.starts
    ? [`${words.tomorrow}${colon}${timed(name, doc.at)}.`, programme ? `${words.programme}${colon}${programme}.` : '']
    : [`${words.during.replace('{name}', name)}${colon}${programme}.`];
  const left = [counted(words.lines, news.left?.lines), counted(words.polls, news.left?.polls)].filter(Boolean).join(', ');
  if (left) said.push(`${words.left}${colon}${left}.`);
  return said.filter(Boolean).join(' ');
}

/**
 * Words left on a document: « Alice sur « Raclette » : J'apporte le
 * fromage » — or, several at once, how many and from whom.
 */
function wordsBody(news, words, lang) {
  const doc = news.doc || {};
  const name = (doc.kind === 'poll'
    ? (doc.fixed === true || doc.date ? eventName(doc) : String(doc.question || ''))
    : String(doc.name || '')).trim();
  const said = (Array.isArray(news.words) ? news.words : []).filter((one) => String(one?.t || '').trim());
  const colon = lang === 'en' ? ': ' : ' : ';
  const who = (one) => String(one?.n || '').trim() || words.someone;
  if (said.length === 1) {
    return `${words.wordOn.replace('{who}', who(said[0])).replace('{name}', name)}${colon}${String(said[0].t).trim()}`;
  }
  const names = [...new Set(said.map(who))].join(', ');
  return `${words.wordsOn.replace('{count}', String(said.length)).replace('{name}', name)}${colon}${names}`;
}

/** What one person reads, in their language, for what the database answered. */
export function messageFor(news, target) {
  const lang = target?.lang === 'en' ? 'en' : 'fr';
  const words = WORDS[lang];
  const title = String(news.group || 'Together');
  if (news.event === 'eve') {
    return {
      title,
      body: reminderBody(news, words, lang),
      url: appUrl(target?.app, `#/poll/${news.id}`),
      tag: `eve-${news.id}-${news.day}`,
    };
  }
  if (news.event === 'words') {
    return {
      title,
      body: wordsBody(news, words, lang),
      url: appUrl(target?.app, `#/${PAGES[news.doc?.kind] || 'poll'}/${news.id}`),
      tag: `words-${news.id}`,
    };
  }
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

/**
 * The browsers' own push services, the only addresses written to. The database
 * keeps no other (marque_points_push_subscribe); checked again here, so that a
 * row slipped in some other way never turns the function into a messenger.
 */
const PUSH_SERVICES = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)\//;

export function isPushService(endpoint) {
  return PUSH_SERVICES.test(String(endpoint || ''));
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
export async function handle(request, { base, serviceKey, fetchImpl = fetch }) {
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

  /** Send each piece of news to its targets; a gone subscription is forgotten. */
  const deliver = async (all) => {
    const sends = all.flatMap((news) => (Array.isArray(news?.targets) ? news.targets : [])
      .filter((target) => isPushService(target?.endpoint))
      .map((target) => ({ news, target })));
    if (!sends.length) return 0;
    const keys = await vapid();
    let sent = 0;
    await Promise.all(sends.map(async ({ news, target }) => {
      const result = await sendPush(target, messageFor(news, target), keys, subjectFor(target), fetchImpl);
      if (result.ok) sent += 1;
      if (result.gone) await rpc('marque_points_push_gone', { p_endpoint: target.endpoint }).catch(() => null);
    }));
    return sent;
  };

  try {
    if (asked?.action === 'key') return json({ status: 'ok', key: (await vapid()).publicKey });
    if (asked?.action === 'remind') {
      const due = await rpc('marque_points_push_reminders', {});
      const reminders = Array.isArray(due) ? due : [];
      return json({ status: 'ok', reminders: reminders.length, sent: await deliver(reminders) });
    }

    let news = null;
    if (asked?.action === 'doc' && typeof asked.key === 'string' && typeof asked.id === 'string') {
      news = await rpc('marque_points_push_event', { p_key: asked.key, p_id: asked.id });
    } else if (asked?.action === 'words' && typeof asked.key === 'string' && typeof asked.id === 'string') {
      news = await rpc('marque_points_push_words', { p_key: asked.key, p_id: asked.id });
    } else if (asked?.action === 'knock' && typeof asked.ticket === 'string') {
      news = await rpc('marque_points_push_knock', { p_ticket: asked.ticket });
    } else {
      return json({ status: 'error', message: 'unknown action' }, 400);
    }
    if (news?.status !== 'ok') return json({ status: news?.status || 'unknown', sent: 0 });
    return json({ status: 'ok', sent: await deliver([news]) });
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
