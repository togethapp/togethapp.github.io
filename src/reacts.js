/**
 * Reactions and a few words: 👍 or « J'apporte le fromage » on an idea, a
 * poll's choice, an event or one of its activities. Kept in the document
 * itself, beside what they are about, in two sets of cells merged one by one
 * — the latest of each kept, as votes are: two people reacting at once both
 * stay, and taking a reaction back, or one's words, is a cell too.
 *
 *   reacts:   { '<target>|<who>': { e: '👍' or '', n: 'Alice', at } }
 *   comments: { '<id>': { on: '<target>', n: 'Alice', t: 'Les mots' or '', made, at } }
 *
 * The target is what is reacted to: an idea's card, a poll's choice — or ''
 * for the document itself, an event or an activity. Who reacts is a first
 * name, as everywhere else: a name is not an account.
 */

import { uid } from './model.js';
import { later, touch } from './stamp.js';
import { sameName } from './stats.js';

/** What one may react with: one each per thing, tapped again to take it back. */
export const REACTIONS = ['👍', '❤️', '😂', '😮', '🎉'];

/** A few words, not a letter. */
export const WORDS_MOST = 280;

const cellsIn = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const stampOf = (cell) => (typeof cell?.at === 'number' ? cell.at : 0);

/** Two copies' cells, each the latest of the two — the second copy's on a tie, as the database does. */
export function mergeCells(first, second) {
  const out = { ...cellsIn(first) };
  for (const [key, cell] of Object.entries(cellsIn(second))) {
    const held = out[key];
    if (!held || stampOf(cell) >= stampOf(held)) out[key] = cell;
  }
  return out;
}

/** Whether two sets of cells are the same, cell for cell. */
export function sameCells(a, b) {
  const one = cellsIn(a);
  const two = cellsIn(b);
  const keys = Object.keys(one);
  return keys.length === Object.keys(two).length && keys.every((key) => one[key] === two[key]);
}

/** A document's cells after a merge, with nothing said when there is nothing. */
export function mergedTalk(older, newer) {
  const reacts = mergeCells(older?.reacts, newer?.reacts);
  const comments = mergeCells(older?.comments, newer?.comments);
  return {
    ...(Object.keys(reacts).length ? { reacts } : {}),
    ...(Object.keys(comments).length ? { comments } : {}),
  };
}

/** Whether a merge learnt nothing about the reactions and words of `newer`. */
export function sameTalk(newer, merged) {
  return sameCells(newer?.reacts, merged.reacts) && sameCells(newer?.comments, merged.comments);
}

/**
 * React to a target as `name`. The same reaction again takes it back;
 * another one replaces it.
 */
export function react(document_, target, name, emoji) {
  const who = sameName(name);
  if (!who || !REACTIONS.includes(emoji)) return document_;
  const key = `${target}|${who}`;
  const held = cellsIn(document_.reacts)[key];
  const cell = { e: held?.e === emoji ? '' : emoji, n: String(name).trim(), at: later(stampOf(held)) };
  return touch(document_, { reacts: { ...cellsIn(document_.reacts), [key]: cell } });
}

/**
 * The reactions to a target, in the palette's order: each with who reacted
 * so, and whether `name` is among them.
 */
export function reactionsTo(document_, target, name = '') {
  const me = sameName(name);
  const found = new Map();
  for (const [key, cell] of Object.entries(cellsIn(document_.reacts))) {
    const cut = key.indexOf('|');
    if (cut < 0 || key.slice(0, cut) !== target || !REACTIONS.includes(cell?.e)) continue;
    const who = key.slice(cut + 1);
    const row = found.get(cell.e) || { emoji: cell.e, names: [], mine: false };
    row.names.push(typeof cell.n === 'string' && cell.n.trim() ? cell.n.trim() : who);
    if (who === me) row.mine = true;
    found.set(cell.e, row);
  }
  return REACTIONS.filter((emoji) => found.has(emoji)).map((emoji) => found.get(emoji));
}

/** The reaction `name` gave a target, or ''. */
export function myReaction(document_, target, name) {
  const cell = cellsIn(document_.reacts)[`${target}|${sameName(name)}`];
  return REACTIONS.includes(cell?.e) ? cell.e : '';
}

/** Leave a few words on a target, as `name`. Without words, or without a name, nothing. */
export function addWords(document_, target, name, text) {
  const words = String(text || '').trim().slice(0, WORDS_MOST);
  const who = String(name || '').trim();
  if (!words || !who) return document_;
  const held = cellsIn(document_.comments);
  // After every word already there, even within the same millisecond.
  const now = later(Math.max(0, ...Object.values(held).map((cell) => (typeof cell?.made === 'number' ? cell.made : 0))));
  return touch(document_, { comments: { ...held, [uid('m')]: { on: target, n: who, t: words, made: now, at: now } } });
}

/** Take words back: the cell stays, emptied, so that the other copies learn it too. */
export function removeWords(document_, id) {
  const held = cellsIn(document_.comments)[id];
  if (!held || typeof held.t !== 'string' || !held.t) return document_;
  return touch(document_, { comments: { ...cellsIn(document_.comments), [id]: { ...held, t: '', at: later(stampOf(held)) } } });
}

/** The words left on a target, the oldest first: { id, name, text, at, mine }. */
export function wordsOn(document_, target, name = '') {
  const me = sameName(name);
  return Object.entries(cellsIn(document_.comments))
    .filter(([, cell]) => cell?.on === target && typeof cell.t === 'string' && cell.t.trim())
    .map(([id, cell]) => ({
      id,
      name: typeof cell.n === 'string' ? cell.n : '',
      text: cell.t.trim(),
      at: typeof cell.made === 'number' ? cell.made : stampOf(cell),
      mine: Boolean(me) && sameName(cell.n) === me,
    }))
    .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
}
