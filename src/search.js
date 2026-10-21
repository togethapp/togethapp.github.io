/**
 * Search: words found in everything this device holds — titles, list lines,
 * choices, notes and captions, expenses — without minding accents or
 * capitals: « creme » finds « Crème brûlée ». Every word must be somewhere in
 * a document for it to be found; the parts that hold one are shown, the words
 * marked where they are written.
 *
 * Pure: the screen is view-search.js.
 */

import { kindOf } from './dashboard.js';

/** Words beyond these are not looked for: a query is a few words, not a text. */
const MOST_WORDS = 8;

/** A part's text, folded letter by letter, each letter knowing where it was written. */
function foldMapped(text) {
  const source = String(text || '');
  let folded = '';
  const starts = [];
  const ends = [];
  for (let index = 0; index < source.length;) {
    const char = String.fromCodePoint(source.codePointAt(index));
    const plain = char.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    for (let unit = 0; unit < plain.length; unit += 1) {
      starts.push(index);
      ends.push(index + char.length);
    }
    folded += plain;
    index += char.length;
  }
  return { folded, starts, ends };
}

/** The words of a query, folded: « Crème  brûlée » → ['creme', 'brulee']. */
export function searchWords(query) {
  return [...new Set(foldMapped(query).folded.split(/\s+/).filter(Boolean))].slice(0, MOST_WORDS);
}

/** Where the words are in a text, as written: [start, end) pairs, in order, never overlapping. */
export function foundAt(text, words) {
  const { folded, starts, ends } = foldMapped(text);
  const ranges = [];
  for (const word of words) {
    for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + 1)) {
      ranges.push([starts[at], ends[at + word.length - 1]]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

/** What can be found in a document besides its title: its lines, choices, notes, expenses. */
function searchableParts(document_) {
  const texts = (things, field = 'text') => (Array.isArray(things) ? things : []).map((one) => one?.[field]);
  switch (kindOf(document_)) {
    case 'list': return texts(document_.items);
    case 'poll': return [document_.title && document_.question !== document_.title ? document_.question : '', ...texts(document_.options)];
    case 'board': return texts(document_.cards);
    case 'spend': return texts((document_.lines || []).filter((line) => !line.repay));
    default: return [];
  }
}

/**
 * The documents the words are found in, the best first: those whose title
 * holds every word, then those holding the most parts that match, then the
 * most recently changed. Each comes with its title and the parts where a word
 * is, marked: { document, title, marks, parts: [{ text, marks }], more }.
 * `titleOf` names a document as the screens do.
 */
export function searchDocuments(all, query, { titleOf = (one) => one?.name || '', parts = 3 } = {}) {
  const words = searchWords(query);
  if (!words.length) return [];
  const found = [];
  for (const document_ of all) {
    const title = String(titleOf(document_) || '');
    const texts = searchableParts(document_).map((text) => String(text || '').trim()).filter(Boolean);
    const whole = foldMapped([title, ...texts].join('\n')).folded;
    if (!words.every((word) => whole.includes(word))) continue;
    const hits = texts.map((text) => ({ text, marks: foundAt(text, words) })).filter((hit) => hit.marks.length);
    const titleMarks = foundAt(title, words);
    const titleHolds = words.every((word) => foldMapped(title).folded.includes(word));
    found.push({
      document: document_, title, marks: titleMarks, parts: hits.slice(0, parts), more: Math.max(0, hits.length - parts),
      rank: [titleHolds ? 1 : 0, hits.length, document_.updatedAt || 0],
    });
  }
  return found
    .sort((a, b) => b.rank[0] - a.rank[0] || b.rank[1] - a.rank[1] || b.rank[2] - a.rank[2])
    .map(({ rank, ...hit }) => hit);
}
