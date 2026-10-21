/**
 * The search page (#/search/<words>): a field, and what holds the words, kind
 * by kind — in the group the pastilles choose, as on the other tabs. Typing
 * redraws the results alone, so the field keeps its focus; the words go into
 * the address, so coming back from a result finds them again.
 *
 * Calls back into app.js and the other views only from inside functions.
 */

import {
  backButtonHtml, documentHref, documentTitle, escapeHtml, everything, flashHtml, groupChipsHtml, navigate, render,
  rewriteHere,
} from './app.js';
import { isEventDoc, kindOf } from './dashboard.js';
import { t } from './i18n.js';
import { searchDocuments } from './search.js';
import { groups, setGroupFilter, shownDocs } from './view-groups.js';

/** The kinds, in the order their sections come: events first, as on the Home page. */
const SEARCH_KINDS = ['event', 'list', 'poll', 'spend', 'board', 'game'];

/** The address of a search for these words. */
export function searchHash(words) {
  const clean = String(words || '').trim();
  return clean ? `#/search/${encodeURIComponent(clean)}` : '#/search';
}

/** A text with the words found in it marked, everything escaped. */
function markedHtml(text, marks) {
  let html = '';
  let at = 0;
  for (const [start, end] of marks) {
    html += `${escapeHtml(text.slice(at, start))}<mark>${escapeHtml(text.slice(start, end))}</mark>`;
    at = end;
  }
  return html + escapeHtml(text.slice(at));
}

/** One document found: its title, its group, and the parts that hold the words. */
function foundHtml(hit) {
  const group = groups().find((one) => one.id === hit.document.groupId);
  return `
    <button type="button" class="entry search-hit" data-search-goto="${escapeHtml(documentHref(hit.document))}">
      <span class="entry__what">
        <strong>${markedHtml(hit.title, hit.marks)}</strong>
        ${group ? `<span class="muted small"> · ${escapeHtml(group.name)}</span>` : ''}
        ${hit.parts.map((part) => `<span class="search-hit__part">${markedHtml(part.text, part.marks)}</span>`).join('')}
        ${hit.more ? `<span class="muted small search-hit__part">${escapeHtml(t('search.more', { count: hit.more }))}</span>` : ''}
      </span>
    </button>`;
}

/** What the words find, in the chosen group, kind by kind. */
function resultsHtml(words) {
  if (!String(words || '').trim()) return `<p class="muted small">${escapeHtml(t('search.hint'))}</p>`;
  const everywhere = searchDocuments(everything(), words, { titleOf: documentTitle });
  const found = shownDocs(everywhere.map((hit) => hit.document));
  const shown = everywhere.filter((hit) => found.includes(hit.document));
  // What the chosen group keeps out of sight, and the way to look everywhere.
  const hidden = everywhere.length > shown.length
    ? `<p class="muted small">
         ${escapeHtml(t('search.hidden', { count: everywhere.length - shown.length }))}
         <button type="button" class="button button--small button--ghost" data-search-everywhere>${escapeHtml(t('filter.all'))}</button>
       </p>`
    : '';
  if (!shown.length) {
    return `<p class="muted">${escapeHtml(t('search.none', { words: String(words).trim() }))}</p>${hidden}`;
  }
  const kindOfHit = (hit) => (isEventDoc(hit.document) ? 'event' : kindOf(hit.document));
  const sections = SEARCH_KINDS.map((kind) => {
    const hits = shown.filter((hit) => kindOfHit(hit) === kind);
    if (!hits.length) return '';
    return `
      <section class="section card">
        <div class="section__head"><h2>${escapeHtml(t(`chain.kind.${kind}`))} · ${hits.length}</h2></div>
        <div class="entries">${hits.map(foundHtml).join('')}</div>
      </section>`;
  });
  return `<p class="muted small">${escapeHtml(t('search.count', { count: shown.length }))}</p>${sections.join('')}${hidden}`;
}

export function searchView(words) {
  return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/')}
      <h1>${escapeHtml(t('search.title'))}</h1>
    </div>
    <input type="search" id="search-words" class="field-pill" value="${escapeHtml(words)}" autocomplete="off"
           enterkeyhint="search" placeholder="${escapeHtml(t('search.placeholder'))}"
           aria-label="${escapeHtml(t('search.field'))}" />
    ${groupChipsHtml()}
    <div id="search-results" aria-live="polite">${resultsHtml(words)}</div>`;
}

export function bindSearch(words) {
  const field = document.getElementById('search-words');
  const results = document.getElementById('search-results');
  if (!field || !results) return;
  // Opened with words, the caret goes after them; opened empty, ready to type.
  field.focus();
  field.setSelectionRange(field.value.length, field.value.length);
  let shown = words;
  field.addEventListener('input', () => {
    if (field.value === shown) return;
    shown = field.value;
    rewriteHere(searchHash(shown));
    results.innerHTML = resultsHtml(shown);
  });
  field.addEventListener('keydown', (event) => {
    // The phone's « Search » key: the results are already there; the keyboard goes.
    if (event.key === 'Enter') field.blur();
  });
  results.addEventListener('click', (event) => {
    const hit = event.target.closest('[data-search-goto]');
    if (hit) {
      navigate(hit.dataset.searchGoto);
      return;
    }
    if (event.target.closest('[data-search-everywhere]')) {
      setGroupFilter('');
      render();
    }
  });
}
