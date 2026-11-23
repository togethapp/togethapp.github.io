/**
 * « Quoi de neuf », on a group's page and on an event's: what changed there
 * since this device last opened that page — votes, ticked lines, expenses,
 * ideas, rounds, words — one line per document, each opening it.
 *
 * The moment of the last visit is all that is kept, on the device
 * (`prefs.seen`). During one visit it holds still: a page drawn again because
 * something arrived keeps showing what was new when one came in, and the
 * new arrival with it. The next visit starts from this one.
 */

import { documentHref, documentTitle, escapeHtml, everything, state } from './app.js';
import { getLanguage, t } from './i18n.js';
import { descendantsOf, inGroup } from './dashboard.js';
import { NEWS_FIRST_LOOK, newsKey, newsOf, seenWith } from './news.js';
import { savePrefs } from './storage.js';
import { kindLabel, myNameFor } from './view-groups.js';
import { money } from './view-spends.js';

/** How many documents are listed before the rest folds away. */
const NEWS_SHOWN = 5;

/** The visit under way: which page, and from when its news is counted. */
let newsVisit = null;

/** When the news of a page starts, for this visit; its first drawing writes the visit down. */
function visitSince(key) {
  const now = Date.now();
  if (newsVisit?.key !== key) {
    const last = state.prefs.seen?.[key];
    newsVisit = { key, since: typeof last === 'number' ? last : now - NEWS_FIRST_LOOK, first: typeof last !== 'number' };
  }
  // Written at every drawing, so that leaving by any way — another page,
  // closing the app — counts as having seen what was shown. A few seconds
  // apart at most, not at every arrival.
  if (now - (state.prefs.seen?.[key] || 0) > 5000) {
    state.prefs.seen = seenWith(state.prefs.seen, key, now);
    savePrefs({ seen: state.prefs.seen });
  }
  return newsVisit;
}

/** A page left: the next time it opens is a new visit. Called on every change of address. */
export function endNewsVisit(route) {
  if (!newsVisit) return;
  const [scope, id] = newsVisit.key.split(':');
  const still = (scope === 'group' && route.name === 'group' && route.id === id)
    || (scope === 'event' && route.name === 'poll' && route.id === id);
  if (!still) newsVisit = null;
}

/** « il y a 3 h », « hier », « il y a 4 jours ». */
function agoText(at) {
  const minutes = Math.round((Date.now() - at) / 60000);
  try {
    const format = new Intl.RelativeTimeFormat(getLanguage(), { numeric: 'auto' });
    if (minutes < 60) return format.format(-Math.max(1, minutes), 'minute');
    if (minutes < 24 * 60) return format.format(-Math.round(minutes / 60), 'hour');
    return format.format(-Math.round(minutes / (24 * 60)), 'day');
  } catch {
    return '';
  }
}

/** One fact, in words. */
function factText(fact, document_) {
  switch (fact.type) {
    case 'new': return t('news.new');
    case 'added': return t('news.added', { count: fact.count });
    case 'ticked': {
      const what = fact.texts.join(', ') + (fact.count > fact.texts.length ? '…' : '');
      return t('news.ticked', { count: fact.count, what });
    }
    case 'answered': return t('news.answered', { count: fact.names.length, names: fact.names.join(', ') });
    case 'choices': return t('news.choices', { count: fact.count });
    case 'dated': return t('news.dated', { day: [formatNewsDay(fact.date), fact.at].filter(Boolean).join(' · ') });
    case 'closed': return t('news.closed');
    case 'spent': {
      const amount = money(fact.cents, document_);
      return fact.names.length
        ? t('news.spentBy', { count: fact.count, amount, names: fact.names.join(', ') })
        : t('news.spent', { count: fact.count, amount });
    }
    case 'repaid': return t('news.repaid', { count: fact.count });
    case 'cards': return t('news.cards', { count: fact.count });
    case 'rounds': return t('news.rounds', { count: fact.count });
    case 'words': {
      const text = fact.text.length > 60 ? `${fact.text.slice(0, 59)}…` : fact.text;
      return fact.count > 1
        ? t('news.wordsMore', { name: fact.name, text, count: fact.count - 1 })
        : t('news.words', { name: fact.name, text });
    }
    case 'reacts': return t('news.reacts', { count: fact.count });
    default: return '';
  }
}

/** « samedi 12 déc. »: a day held as text, read where it is. */
function formatNewsDay(day) {
  const [year, month, date] = String(day).split('-').map(Number);
  try {
    return new Date(year, month - 1, date).toLocaleDateString(getLanguage(), { weekday: 'long', day: 'numeric', month: 'short' });
  } catch {
    return day;
  }
}

function newsRowHtml(entry) {
  const meta = entry.facts.map((fact) => factText(fact, entry.doc)).filter(Boolean).join(' · ');
  return `
    <button type="button" class="game-card" data-goto="${escapeHtml(documentHref(entry.doc))}">
      <span class="game-card__title">${escapeHtml(documentTitle(entry.doc))}</span>
      <span class="game-card__meta">${escapeHtml(kindLabel(entry.doc))} · ${escapeHtml(agoText(entry.at))}</span>
      <span class="game-card__meta">${escapeHtml(meta)}</span>
    </button>`;
}

/** The section: a title, since when, and what changed. */
function newsSectionHtml(key, documents, here = null) {
  const visit = visitSince(key);
  const entries = newsOf(documents, visit.since, { me: myNameFor, here });
  const since = visit.first ? t('news.sinceWeek') : t('news.since', { when: agoText(visit.since) });
  const rows = entries.slice(0, NEWS_SHOWN).map(newsRowHtml).join('');
  const rest = entries.slice(NEWS_SHOWN);
  return `
    <section class="section stack stack--tight" id="news">
      <div class="section__head"><h2>${escapeHtml(t('news.title'))}</h2></div>
      <p class="muted small">${escapeHtml(since)}</p>
      ${
        entries.length
          ? `<div class="game-list">${rows}</div>
             ${
               rest.length
                 ? `<details class="news-more">
                      <summary class="muted small">${escapeHtml(t('news.more', { count: rest.length }))}</summary>
                      <div class="game-list">${rest.map(newsRowHtml).join('')}</div>
                    </details>`
                 : ''
             }`
          : `<p class="muted small">${escapeHtml(t('news.nothing'))}</p>`
      }
    </section>`;
}

/** Everything in a group, for its page. */
export function groupNewsHtml(group) {
  return newsSectionHtml(newsKey('group', group.id), everything().filter((one) => inGroup(one, group.id)));
}

/** An event and everything in its chain, for its page. */
export function eventNewsHtml(poll) {
  return newsSectionHtml(newsKey('event', poll.id), [poll, ...descendantsOf(poll, everything())], poll.id);
}

/**
 * On the group's board in the groups tab: how much is new there since its
 * page was last opened — said, not counted as seen. Nothing before a first visit.
 */
export function groupNewsCount(group) {
  const last = state.prefs.seen?.[newsKey('group', group.id)];
  if (typeof last !== 'number') return 0;
  return newsOf(everything().filter((one) => inGroup(one, group.id)), last, { me: myNameFor }).length;
}
