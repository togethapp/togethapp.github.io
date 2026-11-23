/**
 * What is new, in a group or around an event, since one last looked.
 *
 * Nothing new is stored for it: every line, vote, expense, idea, round, word
 * and reaction already carries when it was written, and that is all this
 * needs. The only thing kept is, on the device, when each group's and each
 * event's page was last opened (see view-news.js).
 *
 * Who did a thing is said where the document knows it — a vote, a word, who
 * paid — and one's own votes, words and reactions are left out: they are not
 * news to whoever made them. A ticked line does not say who ticked it, so it
 * is shown whoever did.
 *
 * Pure, like the models: documents and a moment in, facts out.
 */

import { sameName } from './stats.js';
import { kindOf } from './dashboard.js';

/** How many ticked lines a fact names before it only counts them. */
const NEWS_NAMED = 3;

/** What changed in one document after `since`: its facts and the latest moment among them, or null. */
export function factsOf(document_, since, me = '') {
  if (!document_ || (document_.updatedAt || 0) <= since) return null;
  const kind = kindOf(document_);
  const mine = (name) => Boolean(me) && sameName(name) === sameName(me);
  const fresh = (document_.createdAt || 0) > since;
  // What came with a document made since is part of « new »; what came after
  // its making is news of its own.
  const from = fresh ? document_.createdAt || 0 : since;
  const facts = [];
  let latest = 0;
  const seen = (at) => {
    if (at > latest) latest = at;
  };

  if (fresh) {
    facts.push({ type: 'new' });
    seen(document_.createdAt);
  }

  if (kind === 'list') {
    const items = document_.items || [];
    const added = items.filter((item) => (item.createdAt || 0) > from);
    const ticked = items.filter((item) => item.done && (item.updatedAt || 0) > since);
    added.forEach((item) => seen(item.createdAt));
    ticked.forEach((item) => seen(item.updatedAt));
    if (added.length) facts.push({ type: 'added', count: added.length });
    if (ticked.length) {
      facts.push({ type: 'ticked', count: ticked.length, texts: ticked.slice(0, NEWS_NAMED).map((item) => item.text) });
    }
  }

  if (kind === 'poll') {
    const names = [];
    for (const [key, vote] of Object.entries(document_.votes || {})) {
      if (!vote?.v || (vote.at || 0) <= since) continue;
      const person = (document_.people || []).find((one) => one.id === key.split('|')[0]);
      if (!person || mine(person.name) || names.some((name) => sameName(name) === sameName(person.name))) continue;
      names.push(person.name);
      seen(vote.at);
    }
    if (names.length) facts.push({ type: 'answered', names });
    const choices = (document_.options || []).filter((option) => (option.createdAt || 0) > from);
    choices.forEach((option) => seen(option.createdAt));
    if (choices.length) facts.push({ type: 'choices', count: choices.length });
    // Closed after the moment, and not an event made with its day already
    // known (closed the moment it was made): a decision, worth saying.
    const closedAt = document_.closedAt || 0;
    if (closedAt > since && closedAt !== document_.createdAt) {
      seen(closedAt);
      facts.push(document_.date ? { type: 'dated', date: document_.date, at: document_.at || null } : { type: 'closed' });
    }
  }

  if (kind === 'spend') {
    const lines = (document_.lines || []).filter((line) => (line.createdAt || 0) > from);
    lines.forEach((line) => seen(line.createdAt));
    const spent = lines.filter((line) => !line.repay);
    const repaid = lines.filter((line) => line.repay);
    if (spent.length) {
      const names = [];
      for (const line of spent) {
        const name = (document_.people || []).find((person) => person.id === line.by)?.name;
        if (name && !names.some((other) => sameName(other) === sameName(name))) names.push(name);
      }
      facts.push({ type: 'spent', count: spent.length, cents: spent.reduce((sum, line) => sum + (line.amount || 0), 0), names });
    }
    if (repaid.length) facts.push({ type: 'repaid', count: repaid.length });
  }

  if (kind === 'board') {
    const cards = (document_.cards || []).filter((card) => (card.createdAt || 0) > from);
    cards.forEach((card) => seen(card.createdAt));
    if (cards.length) facts.push({ type: 'cards', count: cards.length });
  }

  if (kind === 'game') {
    // Rounds say when they were played since they carry `at`; older ones do not.
    const rounds = (document_.rounds || []).filter((round) => (round.at || 0) > from);
    rounds.forEach((round) => seen(round.at));
    if (rounds.length) facts.push({ type: 'rounds', count: rounds.length });
  }

  // Words and reactions, on any kind that holds them.
  const words = Object.values(document_.comments || {})
    .filter((cell) => cell?.t && typeof cell.made === 'number' && cell.made > since && !mine(cell.n))
    .sort((a, b) => a.made - b.made);
  if (words.length) {
    const last = words.at(-1);
    seen(last.made);
    facts.push({ type: 'words', count: words.length, name: last.n, text: last.t });
  }
  const reactions = Object.values(document_.reacts || {}).filter((cell) => cell?.e && (cell.at || 0) > since && !mine(cell.n));
  if (reactions.length) {
    reactions.forEach((cell) => seen(cell.at));
    facts.push({ type: 'reacts', count: reactions.length });
  }

  return facts.length ? { latest, facts } : null;
}

/**
 * What is new among these documents since `since`: one entry per document
 * that has news, the most recent first. Archived ones and models are left out.
 * `here` is the document whose page this is: that it is new goes without saying.
 */
export function newsOf(documents, since, { me = '', here = null } = {}) {
  const entries = [];
  for (const document_ of documents || []) {
    if (!document_ || document_.archivedAt || document_.template) continue;
    const found = factsOf(document_, since, typeof me === 'function' ? me(document_) : me);
    const facts = (found?.facts || []).filter((fact) => !(fact.type === 'new' && document_.id === here));
    if (facts.length) entries.push({ doc: document_, at: found.latest || document_.updatedAt || 0, facts });
  }
  return entries.sort((a, b) => b.at - a.at || (a.doc.id < b.doc.id ? -1 : 1));
}

/** The key under which a page's last visit is kept: `group:<id>` or `event:<id>`. */
export function newsKey(scope, id) {
  return `${scope}:${id}`;
}

/** How long a page that was never opened looks back: a week. */
export const NEWS_FIRST_LOOK = 7 * 24 * 60 * 60 * 1000;

/** How many pages' last visits are kept on the device: the most recent ones. */
const NEWS_KEPT = 200;

/** The last visits, with this one written in, the oldest dropped past the limit. */
export function seenWith(seen, key, now = Date.now()) {
  const next = { ...(seen && typeof seen === 'object' ? seen : {}), [key]: now };
  const keys = Object.keys(next);
  if (keys.length <= NEWS_KEPT) return next;
  const kept = keys.sort((a, b) => next[b] - next[a]).slice(0, NEWS_KEPT);
  return Object.fromEntries(kept.map((one) => [one, next[one]]));
}
