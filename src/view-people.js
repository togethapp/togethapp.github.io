/**
 * People: one person's page, the table of everyone's evenings, and renaming a
 * player in every game at once.
 *
 * Calls back into app.js and the other views only from inside functions.
 */

import {
  askForText, escapeHtml, flash, flashHtml, formatDate, formatDay, gameTitle, groupChipsHtml, navigate, presetLabel,
  render, route, state,
  backButtonHtml,
} from './app.js';
import { personFile } from './dashboard.js';
import { getPreset } from './games.js';
import { t } from './i18n.js';
import { renameListPerson } from './lists.js';
import { renamePlayer } from './model.js';
import { renamePollPerson } from './polls.js';
import { presetsPlayed, sameName, statsFor } from './stats.js';
import { groups, shownDocs } from './view-groups.js';
import { waitingLine } from './view-home.js';
import { listTitle, persist, persistList } from './view-lists.js';
import { persistPoll, pollTitle } from './view-polls.js';
import { money, spendTitle } from './view-spends.js';

/**
 * Rename a player in every game they appear in.
 *
 * The statistics gather players by name, because a game mints fresh ids for its
 * own players and nothing ties them together otherwise. So a name that changed —
 * "Alex" who comes back as "Alexandre" — is two people in the table, and only
 * the person concerned can say it is one. This is how they say it.
 */
export async function renameEverywhere(before) {
  const after = await askForText({
    title: t('stats.renameTitle'),
    hint: t('stats.renameHint', { name: before }),
    value: before,
    confirmLabel: t('stats.rename'),
  });
  const clean = String(after || '').trim();
  if (!clean || clean === before) return;

  const key = sameName(before);
  let touched = 0;

  // Games first, then lists and polls: the same person, written the same way,
  // in every document that names them. A name matched forgivingly here, as
  // everywhere else — otherwise the rename would miss exactly the spellings it
  // exists to reconcile.
  for (const game of state.games) {
    const players = game.players.filter((player) => sameName(player.name) === key);
    if (!players.length) continue;
    let next = game;
    for (const player of players) next = renamePlayer(next, player.id, clean);
    if (next === game) continue;
    state.games = state.games.map((held) => (held.id === next.id ? next : held));
    persist(next);
    touched += 1;
  }

  for (const list of state.lists) {
    const people = list.people.filter((person) => sameName(person.name) === key);
    if (!people.length) continue;
    let next = list;
    for (const person of people) next = renameListPerson(next, person.id, clean);
    if (next === list) continue;
    state.lists = state.lists.map((held) => (held.id === next.id ? next : held));
    persistList(next);
    touched += 1;
  }

  for (const poll of state.polls) {
    const people = poll.people.filter((person) => sameName(person.name) === key);
    if (!people.length) continue;
    let next = poll;
    for (const person of people) next = renamePollPerson(next, person.id, clean);
    if (next === poll) continue;
    state.polls = state.polls.map((held) => (held.id === next.id ? next : held));
    persistPoll(next);
    touched += 1;
  }

  flash(touched ? t('stats.renamed', { name: clean, count: touched }) : t('stats.renamedNone'));
  // The page may be keyed on the old name: follow the person to their new one.
  if (route().name === 'person' && sameName(route().who) === key) {
    navigate(`#/person/${encodeURIComponent(clean)}`);
    return;
  }
  render();
}

/* ---------------------------------------------------------------- person --- */

/**
 * One person's page.
 *
 * The three tabs answer "where is this list" and "who is winning"; none of
 * them answers "and Claire?" — what she was given, what she has not answered,
 * how her evenings went. That question is asked about a name, so this page is
 * keyed on a name, matched the forgiving way the tables match it.
 *
 * What waits on her comes first, because it is the only part anyone can act
 * on; the rest is what she has done, newest first.
 */
export function personView(who) {
  const file = personFile(state, who);
  const head = (title, tail) => `
    <div class="spread page-head">
      ${backButtonHtml('#/')}
      ${title}
    </div>
    ${tail}`;


  if (!file.known) {
    return `
      ${flashHtml()}
      ${head(`<h1>${escapeHtml(file.name || who)}</h1>`, `<p class="muted small">${escapeHtml(t('person.none'))}</p>`)}`;
  }

  const inGroups = file.groupIds
    .map((id) => groups().find((group) => group.id === id)?.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const waiting = waitingLine(file);

  const tile = (value, label) => `
    <div class="tile">
      <span class="tile__value">${value}</span>
      <span class="tile__label">${escapeHtml(label)}</span>
    </div>`;

  const entry = (goto, what, aside, value, tone) => `
    <button type="button" class="entry" data-goto="${goto}">
      <span class="entry__what">
        ${what}${aside ? ` <span class="muted small">${aside}</span>` : ''}
      </span>
      <span class="entry__value ${tone || ''}">${value}</span>
    </button>`;

  const section = (title, entries) =>
    entries.length
      ? `<section class="section card">
           <div class="section__head"><h2>${escapeHtml(title)}</h2></div>
           <div class="entries">${entries.join('')}</div>
         </section>`
      : '';

  return `
    ${flashHtml()}
    ${head(
      `<div class="who">
         <span class="who__mark" aria-hidden="true">${escapeHtml([...file.name][0] || '?')}</span>
         <span>
           <h1>${escapeHtml(file.name)}</h1>
           ${inGroups.length ? `<span class="muted small">${escapeHtml(inGroups.join(' · '))}</span>` : ''}
         </span>
       </div>`,
      waiting ? `<p class="banner">${escapeHtml(waiting)}</p>` : '',
    )}

    <div class="tiles">
      ${tile(file.counts.games, t('person.statGames'))}
      ${tile(file.counts.wins, t('person.statWins'))}
      ${tile(file.counts.left, t('person.statLines'))}
      ${tile(file.counts.votes, t('person.statVotes'))}
    </div>

    ${section(
      t('person.lists'),
      file.lines.map((row) =>
        entry(
          `#/list/${escapeHtml(row.list.id)}`,
          escapeHtml(listTitle(row.list)),
          // The soonest day still ahead of them, or nothing: a list with no
          // days says nothing about when, and should not pretend to.
          row.next ? escapeHtml(t(row.late ? 'lists.lateOn' : 'lists.dueOn', { day: formatDay(row.next) })) : '',
          escapeHtml(t('person.assigned', { done: row.done, total: row.total })),
          row.late ? 'entry__value--bad' : row.left ? '' : 'entry__value--good',
        ),
      ),
    )}

    ${section(
      t('person.votes'),
      file.votes.map((row) =>
        entry(
          `#/poll/${escapeHtml(row.poll.id)}`,
          escapeHtml(pollTitle(row.poll)),
          row.closed ? escapeHtml(t('polls.closed')) : '',
          escapeHtml(row.answered ? t('person.answered') : t('person.notAnswered')),
          row.closed ? '' : row.answered ? 'entry__value--good' : 'entry__value--bad',
        ),
      ),
    )}

    ${section(
      t('person.spends'),
      file.accounts.map((row) =>
        entry(
          `#/spend/${escapeHtml(row.spend.id)}`,
          escapeHtml(spendTitle(row.spend)),
          escapeHtml(t('spends.paidTotal', { amount: money(row.paid, row.spend) })),
          escapeHtml(
            row.balance === 0
              ? t('spends.even')
              : t(row.balance > 0 ? 'spends.isOwed' : 'spends.owes', {
                  amount: money(Math.abs(row.balance), row.spend),
                }),
          ),
          row.balance > 0 ? 'entry__value--good' : row.balance < 0 ? 'entry__value--bad' : '',
        ),
      ),
    )}

    ${section(
      t('person.games'),
      file.played
        .slice(0, GAMES_SHOWN)
        .map((row) =>
          entry(
            `#/game/${escapeHtml(row.game.id)}`,
            escapeHtml(gameTitle(row.game)),
            escapeHtml(formatDate(row.game.updatedAt)),
            escapeHtml(
              row.won
                ? t('person.won', { total: row.total })
                : t('person.rank', { rank: row.rank, of: row.of, total: row.total }),
            ),
            row.won ? 'entry__value--good' : '',
          ),
        ),
    )}

    <div class="row">
      <button type="button" class="button button--small button--ghost"
              data-rename-everywhere="${escapeHtml(file.name)}">
        ${escapeHtml(t('stats.rename'))}
      </button>
    </div>

    <p class="notes">${escapeHtml(t('person.sameName'))}</p>`;
}

/** How many of someone's evenings the page shows before it stops being a page. */
const GAMES_SHOWN = 8;

export function statsView() {
  const mine = shownDocs(state.games);
  const played = presetsPlayed(mine);

  return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/games')}
      <h1>${escapeHtml(t('stats.title'))}</h1>
    </div>
    ${groupChipsHtml()}

    ${
      played.length
        ? played
            .map(({ presetId, played: count }) => {
              const preset = getPreset(presetId);
              const rows = statsFor(mine, presetId);
              return `
                <section class="section card">
                  <div class="section__head">
                    <h2>${escapeHtml(preset ? presetLabel(preset) : presetId)}</h2>
                    <span class="muted small">${escapeHtml(t('stats.games', { count }))}</span>
                  </div>
                  <div class="table-wrap">
                    <table class="scores">
                      <thead>
                        <tr>
                          <th>${escapeHtml(t('new.players'))}</th>
                          <th>${escapeHtml(t('stats.played'))}</th>
                          <th>${escapeHtml(t('stats.won'))}</th>
                          <th>${escapeHtml(t('stats.average'))}</th>
                          <th>${escapeHtml(t('stats.best'))}</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${rows
                          .map(
                            (row) => `
                            <tr>
                              <td>
                                ${escapeHtml(row.name)}
                                <button type="button" class="button button--small button--ghost"
                                        data-rename-everywhere="${escapeHtml(row.name)}"
                                        title="${escapeHtml(t('stats.renameTitle'))}">✎</button>
                              </td>
                              <td>${row.played}</td>
                              <td>${row.won}</td>
                              <td>${row.average}</td>
                              <td>${row.best}</td>
                            </tr>`,
                          )
                          .join('')}
                      </tbody>
                    </table>
                  </div>
                </section>`;
            })
            .join('')
        : `<p class="muted small">${escapeHtml(t('stats.empty'))}</p>`
    }

    <p class="notes">${escapeHtml(t('stats.note'))}</p>`;
}
