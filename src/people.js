/**
 * The people a shared document concerns — a list's, a poll's.
 *
 * They behave the same everywhere: added by name, renamed without losing what
 * hangs off them, and removed together with whatever the document held about
 * them. What differs is only that last part, so each document says how to
 * forget someone and the rest is written once, here.
 *
 * They also carry their own clock, `peopleAt`. A merge needs it: without it,
 * "Alice was just removed" and "this copy has never heard of Alice" look
 * exactly alike, and removing someone gets undone by the next sync.
 */

import { uid } from './model.js';
import { later, touch } from './stamp.js';
import { sameName } from './stats.js';

/**
 * The names a new document starts with: trimmed, and each person once —
 * « gui » written after « Gui » is the same person, not a second one.
 */
export function distinctNames(names) {
  const seen = new Set();
  return (names || [])
    .map((raw) => String(raw || '').trim())
    .filter((name) => {
      const key = sameName(name) || name;
      if (!name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Whether someone of that name is already among the document's people. */
export function hasPerson(document_, name, exceptId = null) {
  const key = sameName(name);
  return Boolean(key) && document_.people.some((person) => person.id !== exceptId && sameName(person.name) === key);
}

export function addPerson(document_, name) {
  const clean = String(name || '').trim();
  // Already there, however it is written: one person, not two.
  if (!clean || hasPerson(document_, clean)) return document_;
  return touch(document_, {
    people: [...document_.people, { id: uid('w'), name: clean }],
    peopleAt: later(document_.peopleAt),
  });
}

export function renamePerson(document_, personId, name) {
  const clean = String(name || '').trim();
  // Never onto someone else's name: the document would have that person twice.
  if (!clean || hasPerson(document_, clean, personId)) return document_;
  return touch(document_, {
    people: document_.people.map((person) =>
      (person.id === personId ? { ...person, name: clean } : person)),
    peopleAt: later(document_.peopleAt),
  });
}

/**
 * Remove someone. `forget` returns whatever else the document must change —
 * the lines that were theirs, the answers they gave — as a patch.
 */
export function removePerson(document_, personId, forget = () => ({})) {
  return touch(document_, {
    people: document_.people.filter((person) => person.id !== personId),
    peopleAt: later(document_.peopleAt),
    ...forget(document_, personId),
  });
}

/** The names already used, most recent first, to offer when starting another. */
export function recentPeople(documents, limit = 12) {
  const seen = [];
  for (const document_ of [...documents].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))) {
    for (const person of document_.people || []) {
      if (!seen.includes(person.name)) seen.push(person.name);
      if (seen.length >= limit) return seen;
    }
  }
  return seen;
}

/**
 * Me first, in a form nothing has been typed into yet — because whoever fills
 * in a list is nearly always on it.
 *
 * Only ever called on a form that has just been emptied, never on every
 * redraw: a name put back after someone deleted it would put them on a list
 * they had just taken themselves off.
 */
export function withMeFirst(names, me) {
  const clean = String(me || '').trim();
  if (!clean) return names;
  if (names.some((name) => String(name || '').trim().toLowerCase() === clean.toLowerCase())) return names;
  if (names.some((name) => String(name || '').trim())) return names;
  return [clean, ...names.slice(1)];
}

/** The other way round: take my name back out of a form nobody has typed in. */
export function withoutMe(names, me) {
  const clean = String(me || '').trim().toLowerCase();
  if (!clean) return names;
  const index = names.findIndex((name) => String(name || '').trim().toLowerCase() === clean);
  if (index < 0) return names;
  const kept = [...names];
  kept[index] = '';
  return kept;
}
