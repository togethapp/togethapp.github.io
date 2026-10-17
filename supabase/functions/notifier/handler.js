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
  },
  en: {
    poll: 'New poll', event: 'New event', list: 'New list', spend: 'New shared expenses',
    board: 'New board of ideas', date: 'Date set', knock: '{who} is asking to join.',
    someone: 'Someone', at: 'at', locale: 'en-GB',
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

/** What one person reads, in their language, for what the database answered. */
export function messageFor(news, target) {
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

    const targets = (Array.isArray(news.targets) ? news.targets : []).filter((target) => isPushService(target?.endpoint));
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
