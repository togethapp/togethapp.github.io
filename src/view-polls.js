/**
 * Polls and events on screen: the list, the form, the grid, the day kept,
 * and what a document's page shares with the others (its share bar, its
 * « Plus d’actions »).
 *
 * Split out of app.js, which it calls back into: only from inside functions,
 * so the two may import each other.
 */

import {
  attachedHtml, chainButtonsHtml, chainLabel, chainLabelShort, chainOf, documentHref, escapeHtml, everything, flash,
  flashHtml, formatDate, formatDay, formatDayLong, gameCardHtml, gameTitle, groupChipsHtml, isBusy, isHidden,
  kindsHtml, navigate, pollHome, render, route, signature, state, stopWatching, view, whenText,
} from './app.js';
import { openEventMenu } from './view-home.js';
import { archivedHtml, getGame, getList, listCardHtml, listTitle, openPeopleEditor, persistList } from './view-lists.js';
import { spendCardHtml, spendTitle } from './view-spends.js';
import { boardCardHtml, boardTitle, getBoard } from './view-ideas.js';
import { ask, download, fileName, makeDialog, showCopyDialog } from './view-games.js';
import {
  NAME_KEPT, groups, hiddenByGroupHtml, inGroupHtml, isOrganiser, keyFor, landing, myName,
  organise, organiserSecret, claimChoices, ownsChoice, choiceUnlocks, resetGroupChoice, shownDocs, startSharing, willBeInHtml,
  removeEverywhere, linkedEvent, chooseEvent,
} from './view-groups.js';
import { markForActivity, activitiesOnClose } from './flows.js';
import {
  eventFlowsHtml, pollFlowsHtml, programmeHtml, activityHeadHtml, pollActivitiesHtml, dayChipsHtml,
} from './view-flows.js';
import { recentNames } from './model.js';
import { sameName } from './stats.js';
import { icsFor, pollEvent, eventName } from './ics.js';
import { createList } from './lists.js';
import {
  createPoll, addOptions, renameOption, removeOption, setVote, voteOf, nextValue, setClosed, tally,
  mergePolls, isValidPoll, addPollPerson, renamePollPerson, removePollPerson, archivePoll,
  setPollDate, setEventName, isEvent, dayOfChoice, choiceOfDay, seeksDay, optionDay, hasOptionDays, setOptionDay,
  optionsByDay, addChoice, addDays, choiceWhen, isDayChoice, choiceText,
} from './polls.js';
import { createSpend, addSpend, mergeSpends, isValidSpend } from './spends.js';
import { recentPeople, withMeFirst } from './people.js';
import {
  isLive, eventParts, forEvent, partsCount, chainTree, treeSize, isEventDoc, kindOf, relationsOf, isDone, waitingOn,
  isActivity, topEventOf, eventDays,
} from './dashboard.js';
import { saveGames, saveLists, savePolls, saveSpends, saveBoards, savePrefs } from './storage.js';
import { pollLink, wasDeleted } from './remote.js';
import { swipeable } from './swipe.js';
import { t, getLanguage } from './i18n.js';

/* ------------------------------------------------------------------ polls --- */

/**
 * A poll is a question, the choices it offers, and a grid: one answer per
 * person and per choice. The "which evening suits you" case is the one worth
 * building, and picking one thing out of several is the same grid with a
 * single yes in it.
 */

export function pollTitle(poll) {
  return poll.question || t('polls.untitled');
}

/** A cell says one thing: available. What was "maybe" or "no" before shows as nothing. */
const VOTE_MARK = { yes: '✓' };

/**
 * A poll card's last line: what a poll still being answered offers — « 3 jours
 * proposés » —, rather than when it was last touched; the day it settled on
 * once it has; when it closed, otherwise.
 */
function cardWhenText(poll) {
  if (poll.date) {
    const settled = t(poll.until ? 'polls.settledRange' : 'polls.settledOn', { day: whenText(poll) });
    return settled.charAt(0).toUpperCase() + settled.slice(1);
  }
  if (poll.closedAt) return formatDate(poll.closedAt);
  const count = poll.options.length;
  if (!count) return formatDate(poll.updatedAt);
  const days = poll.options.filter((option) => isDayChoice(option, poll.createdAt)).length;
  return t(days === count ? 'polls.daysOffered' : 'polls.choicesOffered', { count });
}

export function pollCardHtml(poll) {
  const { answered, leaders, ranked } = tally(poll);
  const leading = ranked.find((row) => leaders.includes(row.option.id));
  return `
    <button type="button" class="game-card" data-goto="#/poll/${escapeHtml(poll.id)}">
      <span class="game-card__title">
        ${escapeHtml(pollTitle(poll))}
        ${poll.forActivity ? `<span class="pill pill--activity">🎯 ${escapeHtml(t('activity.pollPill'))}</span>` : ''}
        <span class="pill ${poll.closedAt ? 'pill--done' : ''}">
          ${escapeHtml(poll.closedAt ? t('polls.closed') : t('polls.answered', { count: answered, total: poll.people.length }))}
        </span>
      </span>
      ${
        leading
          ? `<span class="game-card__meta">${escapeHtml(
              t('polls.leading', { option: choiceLabel(leading.option), count: leading.yes }),
            )}</span>`
          : `<span class="game-card__meta">${escapeHtml(t('polls.noAnswerYet'))}</span>`
      }
      <span class="game-card__meta">
        ${escapeHtml(cardWhenText(poll))}
      </span>
      ${eventTagHtml(poll)}
    </button>`;
}

export function pollsView() {
  // An event made without a vote is not a question: it lives in the agenda.
  const sorted = [...shownDocs(state.polls).filter((poll) => !isEvent(poll))].sort((a, b) => b.updatedAt - a.updatedAt);
  const live = sorted.filter(isLive);
  const open = live.filter((poll) => !poll.closedAt);
  const closed = live.filter((poll) => poll.closedAt);

  return `
    ${flashHtml()}
    ${kindsHtml('polls')}
    <button type="button" class="button button--primary button--block" data-goto="#/polls/new">
      + ${escapeHtml(t('polls.new'))}
    </button>
    ${groupChipsHtml()}

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('kinds.ongoing'))}</h2></div>
      ${
        open.length
          ? `<div class="game-list">${open.map(swipeable(pollCardHtml, isOrganiser)).join('')}</div>`
          : `<p class="muted small">${escapeHtml(t('polls.none'))}</p>`
      }
      ${hiddenByGroupHtml(state.polls)}
    </section>

    ${
      closed.length
        ? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('polls.done'))}</h2></div>
             <div class="game-list">${closed.map(swipeable(pollCardHtml, isOrganiser)).join('')}</div>
           </section>`
        : ''
    }

    ${archivedHtml(sorted, swipeable(pollCardHtml, isOrganiser))}`;
}

export function newPollView() {
  const suggestions = [...new Set([myName(), ...recentPeople(state.polls), ...recentPeople(state.lists), ...recentNames(state.games)].filter(Boolean))].slice(0, 12);
  return `
    ${flashHtml()}
    <div class="spread">
      <h1>${escapeHtml(t('polls.new'))}</h1>
      <button type="button" class="button button--small button--ghost" data-goto="#/polls" data-back>
        ${escapeHtml(t('action.back'))}
      </button>
    </div>

    <form id="new-poll" class="card stack">
      <label>
        ${escapeHtml(t('polls.question'))}
        <input type="text" id="poll-question" placeholder="${escapeHtml(t('polls.questionPlaceholder'))}"
               value="${escapeHtml(state.newPollQuestion)}" required />
      </label>

      <label>
        ${escapeHtml(t('polls.choices'))}
        <textarea id="poll-choices" rows="5" placeholder="${escapeHtml(t('polls.choicesPlaceholder'))}">${escapeHtml(state.newPollChoices)}</textarea>
      </label>
      ${newPollDaysHtml()}

      <div class="stack stack--tight">
        <span class="muted small">${escapeHtml(t('polls.peopleHint'))}</span>
        ${state.newPollPeople
          .map(
            (name, index) => `
              <input type="text" data-person-index="${index}" value="${escapeHtml(name)}"
                     placeholder="${escapeHtml(t('lists.person', { n: index + 1 }))}"
                     aria-label="${escapeHtml(t('lists.person', { n: index + 1 }))}" />`,
          )
          .join('')}
        <div class="row">
          <button type="button" class="button button--small" id="add-person">+ ${escapeHtml(t('lists.addPerson'))}</button>
          ${
            state.newPollPeople.length > 1
              ? `<button type="button" class="button button--small button--ghost" id="drop-person">− ${escapeHtml(t('lists.dropPerson'))}</button>`
              : ''
          }
        </div>
        ${
          suggestions.length
            ? `<div class="row">${suggestions
                .map((name) => `<button type="button" class="chip" data-suggest="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
                .join('')}</div>`
            : ''
        }
      </div>

      <label class="checkbox">
        <input type="checkbox" id="poll-for-activity" ${state.newPollForActivity ? 'checked' : ''} />
        <span>🎯 ${escapeHtml(t('activity.pollMark'))}</span>
      </label>

      ${willBeInHtml()}
      <button type="submit" class="button button--primary button--block">${escapeHtml(t('polls.create'))}</button>
    </form>`;
}

/** From how many people the gauge is worth its room above the grid. */
const GAUGE_FROM = 4;

/**
 * Which evenings suit the most people, at a glance: one bar per choice, the
 * longest first.
 *
 * The grid answers "who can make what"; this answers "so, which one?", which
 * is the question everyone opens the poll to ask. A bar's full length is
 * everyone asked — not the best score — so three out of twelve looks like
 * three out of twelve, and not like a landslide. The exact count sits at the
 * end of every bar, in plain text: the length is for the eye, the number is
 * for certainty. Ranked, unlike the grid: nobody taps a bar, so nothing moves
 * under anyone's finger when the order changes.
 */
function gaugeHtml(poll) {
  const total = poll.people.length;
  // Up to three people, the grid's « Oui » column says it all at a glance.
  if (total < GAUGE_FROM) return '';
  const { ranked, leaders } = tally(poll);
  if (!total || !ranked.some((row) => row.yes > 0)) return '';
  return `
    <section class="gauge" aria-labelledby="gauge-title">
      <h2 id="gauge-title" class="gauge__title">${escapeHtml(t('polls.gauge'))}</h2>
      <ol class="gauge__rows">
        ${ranked
          .map((row) => {
            const share = Math.round((row.yes / total) * 100);
            const lead = leaders.includes(row.option.id);
            const said = t('polls.countLine', { yes: row.yes, total });
            return `
              <li class="gauge__row ${lead ? 'gauge__row--lead' : ''}" title="${escapeHtml(`${choiceLabel(row.option)} — ${said}`)}">
                <span class="gauge__label">${escapeHtml(choiceLabel(row.option))}</span>
                <span class="gauge__track" aria-hidden="true">
                  <span class="gauge__fill" style="width: ${share}%"></span>
                </span>
                <span class="gauge__count">
                  <span aria-hidden="true">${row.yes}/${total}</span>
                  <span class="visually-hidden">${escapeHtml(said)}</span>
                </span>
              </li>`;
          })
          .join('')}
      </ol>
    </section>`;
}

export function pollView(poll, { solo = false } = {}) {
  const me = state.prefs.voter?.[poll.id] || null;
  // Solo: a visitor from a link, with the app's chrome gone too. Guest: anyone
  // who is not the organiser — a visitor, or another member of the group — and
  // who is therefore shown the voting and nothing else.
  const guest = solo || !isOrganiser(poll);
  const { rows, leaders, answered } = tally(poll);
  const closed = Boolean(poll.closedAt);
  // An event whose day was known from the start: no choices, no votes, only
  // the day, who comes, and what hangs off it.
  const fixed = isEvent(poll);

  // Nobody ticks before saying who they are: until a name is chosen above,
  // no cell votes — a thumb landing on the grid would otherwise tick for
  // whoever's column it hit, and settle who this device is on the way. A tap
  // there points at the names instead (see bindPoll), so it stays a button.
  const locked = !me && !closed;

  const cellHtml = (option, person) => {
    const yes = voteOf(poll, person.id, option.id) === 'yes';
    // Once this device has said who it answers for, the other columns are out
    // of reach: a thumb that lands one column over would tick someone else's
    // evening, and nothing on screen would say so. Switching name is still one
    // tap on the chips above — a choice, rather than a slip.
    const others = Boolean(me) && person.id !== me;
    return `
      <td class="${person.id === me ? 'votes__mine' : ''}">
        <button type="button" class="vote ${yes ? 'vote--yes' : 'vote--none'} ${others ? 'vote--other' : ''} ${locked ? 'vote--locked' : ''}"
                data-vote="${escapeHtml(person.id)}|${escapeHtml(option.id)}" ${closed || others ? 'disabled' : ''}
                ${locked ? 'aria-disabled="true"' : ''}
                aria-pressed="${yes ? 'true' : 'false'}"
                aria-label="${escapeHtml(`${person.name} — ${choiceLabel(option)}`)}">
          ${yes ? VOTE_MARK.yes : ''}
        </button>
      </td>`;
  };

  return `
    ${flashHtml()}
    <div class="spread">
      <div>
        <h1>${escapeHtml(pollTitle(poll))}</h1>
        <p class="muted small">
          ${
            fixed
              ? escapeHtml(poll.people.map((person) => person.name).join(' · ') || t('events.nobody'))
              : `${escapeHtml(t('polls.answered', { count: answered, total: poll.people.length }))}
                 ${closed ? ` · ${escapeHtml(t('polls.closed'))}` : ''}`
          }
          ${poll.shared && !guest ? ` · ${escapeHtml(t('lists.sharedMark'))}` : ''}
        </p>
        ${poll.date ? `<p class="event-when"><strong>${escapeHtml(whenText(poll, { long: true }))}</strong></p>` : ''}
        ${signedByHtml(poll)}
      </div>
      ${
        solo
          ? ''
          : `<button type="button" class="button button--small button--ghost" data-goto="${pollHome(poll)}" data-back>
               ${escapeHtml(t('action.back'))}
             </button>`
      }
    </div>

    ${guest ? '' : eventLinkHtml(poll)}

    ${solo ? '' : activityHeadHtml(poll)}

    ${guest ? '' : pollFlowsHtml(poll)}

    ${guest ? '' : pollActivitiesHtml(poll)}

    ${guest ? '' : inGroupHtml(poll)}

    ${guest ? '' : shareBarHtml(`
      ${state.remote ? `<button type="button" class="button button--primary" id="poll-share">${escapeHtml(t(fixed ? 'events.share' : 'polls.share'))}</button>` : ''}
      ${state.remote && !fixed && !closed && answered < poll.people.length && poll.options.length
        ? `<button type="button" class="button" id="poll-nudge">${escapeHtml(t('polls.nudge'))}</button>`
        : ''}`)}

    ${
      poll.people.length && !fixed
        ? `<div class="row iam ${locked ? 'iam--needed' : ''}" data-iam>
             <span class="muted small">${escapeHtml(t('polls.iAm'))}</span>
             ${poll.people
               .map(
                 (person) => `<button type="button" class="chip ${person.id === me ? 'chip--on' : ''}" data-me="${escapeHtml(person.id)}">${escapeHtml(person.name)}</button>`,
               )
               .join('')}
           </div>`
        : ''
    }

    ${guest && !closed ? soloJoinHtml() : ''}

    ${
      // An event: what is made for it first — it is what the page is for —
      // then its date, to change.
      solo ? '' : eventHtml(poll, { guest })
    }

    ${guest ? soloDateHtml(poll) : poll.date || fixed ? dateCardHtml(poll, fixed) : ''}

    ${fixed ? '' : gaugeHtml(poll)}

    ${guest || poll.date || fixed || hasOptionDays(poll) ? '' : retainHtml(poll)}

    ${
      fixed
        ? ''
        : poll.options.length && poll.people.length
        ? `<div class="table-wrap table-wrap--flush" data-keep-scroll="poll-${escapeHtml(poll.id)}">
             <table class="votes">
               <thead>
                 <tr>
                   <th>${escapeHtml(t('polls.choice'))}</th>
                   ${poll.people.map((person) => `<th class="${person.id === me ? 'votes__mine' : ''}">${escapeHtml(person.name)}</th>`).join('')}
                   <th>${escapeHtml(t('polls.count'))}</th>
                 </tr>
               </thead>
               <tbody>
                 ${gridRows(poll, rows)
                   .map(
                     (row) => row.day !== undefined ? `
                       <tr class="votes__day">
                         <th scope="rowgroup">${escapeHtml(row.day ? formatDayLong(row.day) : t('polls.anyDay'))}</th>
                         <td colspan="${poll.people.length + 1}"></td>
                       </tr>` : `
                       <tr class="${leaders.includes(row.option.id) ? 'votes__leader' : ''}">
                         <th scope="row">
                           ${
                             guest
                               ? `${dayMark(poll, row.option)}${escapeHtml(rowLabel(poll, row.option))}${
                                   ownsChoice(row.option) && !closed
                                     ? ` <button type="button" class="button button--small button--ghost choice-drop"
                                                 data-drop-option="${escapeHtml(row.option.id)}"
                                                 aria-label="${escapeHtml(t('polls.dropMine', { choice: choiceLabel(row.option) }))}">✕</button>`
                                     : ''
                                 }`
                               : `<button type="button" class="line__text" data-option="${escapeHtml(row.option.id)}">${dayMark(poll, row.option)}${escapeHtml(rowLabel(poll, row.option))}</button>`
                           }
                         </th>
                         ${poll.people.map((person) => cellHtml(row.option, person)).join('')}
                         <td class="votes__score">${row.yes}</td>
                       </tr>`,
                   )
                   .join('')}
               </tbody>
             </table>
           </div>
           ${
             locked
               ? `<p class="small poll-ask">${escapeHtml(t('polls.pickFirst'))}</p>`
               : `<p class="muted small">${escapeHtml(
                 me && !closed
                   ? t('polls.answeringAs', { name: poll.people.find((person) => person.id === me)?.name || '' })
                   : t('polls.tapHint'),
               )}</p>`
           }`
        : `<p class="muted small">${escapeHtml(poll.people.length ? t('polls.addChoices') : t('polls.addPeople'))}</p>`
    }

    ${
      // A guest adds choices too — another evening, another place — as long
      // as there is still something to choose: not once the day is set.
      closed || (guest && (fixed || poll.date))
        ? ''
        : addChoiceHtml(poll)
    }

    ${
      // No day to set by hand on a poll choosing what to do on the days of
      // its event: its choices have days of their own.
      guest || poll.date || fixed || poll.whenFor || hasOptionDays(poll) ? '' : `<details class="details" id="poll-date-by-hand">
      <summary>${escapeHtml(t('polls.dateByHand'))}</summary>
      ${dateCardHtml(poll, fixed)}
    </details>`}

    ${poll.date ? '' : attachedHtml(poll)}

    ${guest ? '' : actionsHtml(`
        <button type="button" class="button button--small" id="poll-people">${escapeHtml(t('lists.people'))}</button>
        <button type="button" class="button button--small" id="poll-text">${escapeHtml(t('action.recap'))}</button>
        ${
          fixed
            ? ''
            : `<button type="button" class="button button--small" id="poll-close">
                 ${escapeHtml(closed ? t('polls.reopen') : t('polls.close'))}
               </button>`
        }
`, `
        <button type="button" class="button button--small button--ghost" id="poll-rename">${escapeHtml(t(fixed ? 'events.rename' : 'polls.rename'))}</button>
        ${fixed || poll.whenFor ? '' : `<button type="button" class="button button--small button--ghost" id="poll-for-activity-toggle">🎯 ${escapeHtml(t(poll.forActivity ? 'activity.pollUnmark' : 'activity.pollMark'))}</button>`}
        <button type="button" class="button button--small button--ghost" id="poll-sign">${escapeHtml(t('sign.edit'))}</button>
        ${chainButtonsHtml(poll)}
        <button type="button" class="button button--small button--ghost" id="poll-archive">
          ${escapeHtml(poll.archivedAt ? t('archive.back') : t('archive.put'))}
        </button>
        <button type="button" class="button button--small button--ghost" id="poll-delete">${escapeHtml(t('action.delete'))}</button>`)}`;
}

/**
 * Sharing is what a document is made for here, so it has a row of its own
 * under the title, not a place among nine buttons at the bottom.
 */
export function shareBarHtml(buttons) {
  return buttons.trim() ? `<div class="row share-bar">${buttons}</div>` : '';
}

/**
 * A document's other actions: the everyday ones in sight, the rare ones —
 * archive, rename, sign, delete — folded under « Plus d’actions ».
 */
export function actionsHtml(everyday, rare) {
  return `
    <section class="section actions">
      <div class="row">${everyday}</div>
      <details class="details actions__more">
        <summary>${escapeHtml(t('actions.more'))}</summary>
        <div class="row">${rare}</div>
      </details>
    </section>`;
}

/** The day an event is on, as its organiser sets it by hand. */
function dateCardHtml(poll, fixed) {
  return `<section class="card stack stack--tight">
      <div class="section__head">
        <h2>${escapeHtml(t(fixed ? 'events.date' : 'polls.date'))}</h2>
        ${poll.date ? `<span class="pill">${escapeHtml(whenText(poll))}</span>` : ''}
      </div>
      <p class="muted small">${escapeHtml(t(fixed ? 'events.dateHint' : 'polls.dateHint'))}</p>
      <div class="row">
        <label class="visually-hidden" for="poll-day">${escapeHtml(t('polls.date'))}</label>
        <input type="date" id="poll-day" value="${escapeHtml(poll.date || '')}" />
        <label class="visually-hidden" for="poll-hour">${escapeHtml(t('polls.hour'))}</label>
        <input type="time" id="poll-hour" value="${escapeHtml(poll.at || '')}" />
      </div>
      <label class="small">
        ${escapeHtml(t('events.until'))}
        <input type="date" id="poll-until" value="${escapeHtml(poll.until || '')}" />
      </label>
      <div class="row">
        <label class="visually-hidden" for="poll-title">${escapeHtml(t('polls.eventName'))}</label>
        <input type="text" id="poll-title" value="${escapeHtml(eventName(poll))}"
               placeholder="${escapeHtml(t('polls.eventNamePlaceholder'))}" />
        <button type="button" class="button" id="poll-date-save">${escapeHtml(t('action.save'))}</button>
      </div>
      ${
        poll.date
          ? `<div class="row">
               <button type="button" class="button button--small" id="poll-ics">${escapeHtml(t('agenda.add'))}</button>
             </div>`
          : ''
      }
    </section>`;
}

/**
 * The event of several days a poll is part of, whose days its choices may be
 * pinned to — « Kayak » on the Saturday, « Rando » on the Sunday —, or null.
 * Never for a poll that asks when: its choices are days already.
 */
function choiceDaysEvent(poll) {
  if (isEvent(poll) || poll.whenFor) return null;
  const event = topEventOf(poll, everything());
  return event && eventDays(event).length > 1 ? event : null;
}

/**
 * The day and hour picked for the next choice, per poll: the day kept while
 * adding several things to do on it, both dropped once a day alone is added.
 */
const pickedDays = {};
const pickedHours = {};

/** A choice as read outside the grid: with its day, when it is done on one. */
export function choiceLabel(option) {
  const words = choiceText(option, getLanguage());
  const day = optionDay(option);
  if (!day || isDayChoice(option)) return words;
  return `${words} · ${[formatDayLong(day), option.at].filter(Boolean).join(' ')}`;
}

/** 📅 before a day to vote on, inside its label so the two wrap as one. */
const dayMark = (poll, option) => (dayOfOption(poll, option) ? '<span class="choice-day" aria-hidden="true">📅</span>' : '');

/** A choice in the grid: under its day's heading when it is done on one. */
function rowLabel(poll, option) {
  if (hasOptionDays(poll) && optionDay(option) && !isDayChoice(option)) return [option.text, option.at].filter(Boolean).join(' · ');
  return choiceText(option, getLanguage());
}

/**
 * The grid's rows: as they are, or under the day each choice is done on, with
 * a `{ day }` heading before each day.
 */
function gridRows(poll, rows) {
  if (!hasOptionDays(poll)) return rows;
  const byOption = new Map(rows.map((row) => [row.option.id, row]));
  return optionsByDay(poll).flatMap(({ day, options }) => [{ day }, ...options.map((option) => byOption.get(option.id))]);
}

/**
 * One way in for every choice: a few words, a day, an hour — any of them, so
 * long as there are words or a day. A day alone is a day to vote on; words
 * with a day are something done that day. In an event of several days the
 * day is one of the event's, picked from its chips.
 */
function addChoiceHtml(poll) {
  const event = choiceDaysEvent(poll);
  const day = pickedDays[poll.id] || '';
  const hour = pickedHours[poll.id] || '';
  return `
    <form id="add-choice" class="card stack stack--tight">
      <label class="visually-hidden" for="new-choice">${escapeHtml(t('polls.addChoice'))}</label>
      <div class="row row--tight">
        <input type="text" id="new-choice" placeholder="${escapeHtml(t(seeksDay(poll) ? 'polls.dayPlaceholder' : 'polls.otherPlaceholder'))}" autocomplete="off" />
        <button type="submit" class="button button--primary" aria-label="${escapeHtml(t('polls.addChoice'))}">+</button>
      </div>
      ${
        event
          ? `<span class="small">${escapeHtml(t('polls.choiceDay'))}</span>
             ${dayChipsHtml(event, day, { attr: 'data-choice-day', noneLabel: t('polls.anyDay') })}`
          : `<label class="small add-day">
               ${escapeHtml(t('polls.pickDay'))}
               <input type="date" id="new-choice-day" value="${escapeHtml(day)}" />
             </label>`
      }
      <label class="small add-day">
        ${escapeHtml(t('polls.pickHour'))}
        <input type="time" id="new-choice-at" value="${escapeHtml(day ? hour : '')}" ${day ? '' : 'disabled'} />
      </label>
    </form>`;
}

/** The day a choice stands for, when it is a day to vote on. */
function dayOfOption(poll, option) {
  return isDayChoice(option, poll.createdAt) ? choiceWhen(option, poll.createdAt) : null;
}

/**
 * The poll has a favourite, and it is a day: its organiser keeps it
 * in one tap — the day goes in the agendas and the poll closes — instead of
 * writing again a date that is already on screen.
 */
function retainHtml(poll) {
  const { rows, leaders } = tally(poll);
  const kept = rows
    .filter((row) => leaders.includes(row.option.id))
    .map((row) => ({ row, day: dayOfOption(poll, row.option) }))
    .filter(({ day }) => day);
  if (!kept.length) return '';
  const total = poll.people.length;
  return `
    <section class="card stack stack--tight retain">
      <p class="small">${escapeHtml(
        kept.length > 1 ? t('polls.retainTie') : t('polls.retainHint', { choice: choiceLabel(kept[0].row.option), yes: kept[0].row.yes, total }),
      )}</p>
      <div class="row">
        ${kept
          .map(
            ({ row, day }) => `<button type="button" class="button button--primary" data-retain="${escapeHtml(row.option.id)}">
                ${escapeHtml(t('polls.retain', { day: formatDayLong(day.date) }))}
              </button>`,
          )
          .join('')}
      </div>
    </section>`;
}

/**
 * Once a poll has settled on a day, it is an event, and the event is where
 * everything made for it is found: what to bring, what it cost, the polls,
 * the ideas, the games — each under its kind. The two things almost every
 * event needs are one tap away; anything else is added from « Ajouter ».
 * A guest sees what is there and nothing to press.
 */
function eventHtml(poll, { guest }) {
  // An activity with no day yet is already an event of sorts: what it needs
  // can be made for it before its day is known.
  const activity = isActivity(poll, everything());
  if (!poll.date && !activity) return '';
  const parts = eventParts(poll, state);
  const { list, spend } = parts;
  if (guest && !partsCount(parts)) return '';
  const day = formatDay(poll.date);
  const kind = (label, documents, cardHtml) =>
    documents.length
      ? `<span class="muted small">${escapeHtml(label)}</span>
         <div class="game-list">${documents.map(cardHtml).join('')}</div>`
      : '';
  return `
    <section class="section stack stack--tight" id="event-parts">
      <div class="section__head"><h2>${escapeHtml(t(activity ? 'activity.title' : 'event.title'))}</h2></div>
      ${activity ? '' : programmeHtml(poll, { guest })}
      ${kind(t('tab.lists'), parts.lists, listCardHtml)}
      ${kind(t('tab.polls'), parts.polls, pollCardHtml)}
      ${kind(t('tab.games'), parts.games, gameCardHtml)}
      ${kind(t('tab.spends'), parts.spends, spendCardHtml)}
      ${kind(t('tab.ideas'), parts.boards, boardCardHtml)}
      ${guest ? '' : eventFlowsHtml(poll)}
      ${
        guest
          ? ''
          : `${list && spend ? '' : `<p class="muted small">${escapeHtml(t(isEvent(poll) || !poll.date ? 'event.hintFixed' : 'event.hint', { day }))}</p>`}
             <div class="row">
               ${list ? '' : `<button type="button" class="button button--small" id="event-list">${escapeHtml(t('event.addList'))}</button>`}
               ${spend ? '' : `<button type="button" class="button button--small" id="event-spend">${escapeHtml(t('event.addSpend'))}</button>`}
               <button type="button" class="button button--small" id="event-add">${escapeHtml(t('event.addMore'))}</button>
               <button type="button" class="button button--small" data-gather-doc="${escapeHtml(poll.id)}">${escapeHtml(t('chain.gather'))}</button>
             </div>`
      }
    </section>`;
}

/**
 * On a card, what a document hangs from — « Pour Raclette · 1 oct. › Courses ».
 * On the page of something in that chain, only what lies below it is said:
 * the card already sits under the rest. And what it still waits for, when a
 * link says it comes after something not done yet.
 */
export function eventTagHtml(document_) {
  let chain = chainOf(document_);
  const here = chain.findIndex((one) => one.id === route().id);
  if (here >= 0) chain = chain.slice(here + 1);
  const waits = waitingOn(document_, everything());
  const waiting = waits.length
    ? `<span class="game-card__meta">${escapeHtml(t('relate.waiting', { name: waits.map(chainLabel).join(', ') }))}</span>`
    : '';
  if (!chain.length) return waiting;
  return `<span class="game-card__meta game-card__event">${escapeHtml(
    t('event.tagUndated', { name: chain.map(chainLabel).join(' › ') }),
  )}</span>${waiting}`;
}

/**
 * At the top of a document's page, the whole chain it belongs to, drawn as a
 * tree: its event on top, everything attached below, this page marked. Every
 * other node opens its page. Under it, the links across the chain: what goes
 * with this page, what it waits for — done or not — and what it unblocks.
 * Nothing is shown for a document on its own.
 */
export function eventLinkHtml(document_) {
  const all = everything();
  const tree = chainTree(document_, all);
  const relations = relationsOf(document_, all);
  const hasTree = treeSize(tree) > 1;
  if (!hasTree && !relations.length) return '';
  const icon = (one) => (isEventDoc(one) ? '📅' : one.forActivity ? '🎯' : { list: '☑️', poll: '🗳️', spend: '💶', board: '💡', game: '🃏' }[kindOf(one)] || '•');
  const kindTitle = (one) => t(isEventDoc(one) ? 'chain.kind.event' : `chain.kind.${kindOf(one) || 'game'}`);
  const byRelation = new Map(relations.map((one) => [one.document.id, one]));
  // How this page and another are linked, said beside the other one.
  const badge = (one) => {
    const relation = byRelation.get(one.id);
    if (!relation) return '';
    const done = relation.kind === 'waits' ? isDone(one) : null;
    return `<span class="pill chain-map__link">${escapeHtml(t(`relate.${relation.kind}`))}</span>${
      done === null ? '' : `<span class="pill ${done ? 'pill--done' : 'pill--late'}">${escapeHtml(t(done ? 'relate.isDone' : 'relate.notDone'))}</span>`
    }`;
  };
  const label = (one) => {
    const waits = waitingOn(one, all);
    return `<span class="chain-map__icon" aria-hidden="true">${icon(one)}</span>
      <span class="chain-map__title">${escapeHtml(chainLabel(one))}</span>
      ${waits.length ? `<span class="chain-map__wait" title="${escapeHtml(t('relate.waiting', { name: waits.map(chainLabel).join(', ') }))}">⏳</span>` : ''}`;
  };
  const nodeHtml = (one) => (one.id === document_.id
    ? `<span class="chain-map__node chain-map__node--here" aria-current="page" data-press="${escapeHtml(one.id)}">${label(one)}
         <span class="pill">${escapeHtml(t('chain.youAreHere'))}</span></span>`
    : `<button type="button" class="chain-map__node" data-goto="${escapeHtml(documentHref(one))}" title="${escapeHtml(kindTitle(one))}">${label(one)}</button>`);
  const inTree = new Set();
  const node = ({ document: one, children }) => {
    inTree.add(one.id);
    return `
      <li>
        <div class="chain-map__row">${nodeHtml(one)}${badge(one)}</div>
        ${children.length ? `<ul>${children.map(node).join('')}</ul>` : ''}
      </li>`;
  };
  const treeHtml = hasTree ? node(tree) : '';
  // What the page is linked to outside its chain: the tree cannot show it.
  const outside = relations.filter((one) => !inTree.has(one.document.id));
  return `
    <nav class="chain-map card" aria-label="${escapeHtml(t('chain.map'))}">
      ${hasTree ? `<span class="muted small">${escapeHtml(t('chain.map'))}</span><ul class="chain-map__tree">${treeHtml}</ul>` : ''}
      ${
        outside.length
          ? `<span class="muted small">${escapeHtml(t(hasTree ? 'relate.outside' : 'relate.map'))}</span>
             <ul class="chain-map__links">${outside.map(({ document: one }) => `
               <li><div class="chain-map__row">${nodeHtml(one)}${badge(one)}</div></li>`).join('')}</ul>`
          : ''
      }
    </nav>`;
}

/**
 * For a guest whose name the poll does not have yet: add it, and answer.
 * Whoever sends a link to a chat does not know every name in it; without
 * this, a guest could look but never tick.
 */
function soloJoinHtml() {
  return `
    <form id="solo-me-form" class="row row--tight">
      <label class="visually-hidden" for="solo-me">${escapeHtml(t('polls.soloMe'))}</label>
      <input type="text" id="solo-me" autocomplete="given-name" maxlength="${NAME_KEPT}"
             placeholder="${escapeHtml(t('polls.soloMe'))}" />
      <button type="submit" class="button">${escapeHtml(t('polls.soloAdd'))}</button>
    </form>`;
}

/** The day the poll settled on, to read — and to take away — but not to change. */
function soloDateHtml(poll) {
  if (!poll.date) return '';
  const when = whenText(poll, { long: true });
  return `
    <section class="card stack stack--tight">
      <p><strong>${escapeHtml(t('polls.soloSettled', { when }))}</strong></p>
      <div class="row">
        <button type="button" class="button button--small" id="poll-ics">${escapeHtml(t('agenda.add'))}</button>
      </div>
    </section>`;
}

/* ------------------------------------------------------ polls: behaviour --- */

/**
 * Whether a change that could not be written to this device survives anywhere
 * else — and so whether its loss is worth a word.
 *
 * Holding a database is not enough: only a *shared* document is sent to one.
 * A poll kept to oneself, on a device whose storage refuses, exists in the
 * page and nowhere else, and is gone at the next reload. That used to pass in
 * silence, because a database was configured. It no longer does.
 */
/**
 * What this device is actually holding, all groups and filters aside.
 *
 * The filters are what make a screen look empty when nothing has been lost, so
 * the one place that counts without filtering is worth having: it separates
 * "it is not being shown" from "it is not there", which is the first question
 * to answer when someone says their polls are gone.
 */
export function heldCounts() {
  const all = [...state.lists, ...state.polls, ...state.games, ...state.spends, ...state.boards];
  return {
    lists: state.lists.length,
    polls: state.polls.length,
    games: state.games.length,
    spends: state.spends.length,
    shared: all.filter((document_) => document_.shared).length,
    archived: all.filter((document_) => document_.archivedAt).length,
  };
}

export function keptElsewhere(changed, { store = false } = {}) {
  if (state.remote && changed?.shared) return true;
  return Boolean(store && state.store && changed);
}

/**
 * What to do when a write does not go through. Most often it is the network:
 * the copy here stays, and goes up with the next change. But when the
 * database answers that the thing was deleted, keeping it would only fail
 * again at every change — so it leaves this device too, and the page says why.
 */
/**
 * Send a list, an account of spends or a game — after taking in what the
 * database already has. It keeps whatever it is sent, so a copy written
 * straight away would erase the lines someone else added since this device
 * last looked. `adopt` merges a stored copy in and says whether it brought
 * anything; `find` hands back the merged one.
 */
export async function pushMerged(changed, { valid, adopt, find }) {
  let outgoing = changed;
  try {
    const stored = await state.remote.get(changed.id);
    if (valid(stored) && adopt(stored)) {
      outgoing = find(changed.id) || changed;
      if (!isBusy()) render();
    }
  } catch {
    // Unreadable just now: this copy goes up, and the next look merges.
  }
  await state.remote.put(outgoing, keyFor(outgoing), organiserSecret(outgoing.id));
}

export function pushFailed(changed) {
  return (error) => {
    if (wasDeleted(error)) dropDeleted(changed.id);
    else flash(t('share.pushFailed'), 'error');
  };
}

/**
 * The database has nothing under an id this device holds as shared. Reading
 * cannot tell « deleted » from « never arrived » — only a write is answered
 * « document supprimé ». So: a poll someone else organises came from the
 * database and nowhere else, and gone from it, it is gone; anything else is
 * sent again — refused as deleted, it leaves this device; accepted, it was a
 * share that never arrived, and now has. True when it left.
 */
export async function whenAbsent(id) {
  const held = everything().find((one) => one.id === id);
  if (!held?.shared || !state.remote) return false;
  if (held.kind === 'poll' && !isOrganiser(held)) {
    dropDeleted(id);
    return true;
  }
  try {
    await state.remote.put(held, keyFor(held), organiserSecret(id));
    return false;
  } catch (error) {
    if (!wasDeleted(error)) return false;
    dropDeleted(id);
    return true;
  }
}

export function dropDeleted(id) {
  const poll = getPoll(id);
  const list = getList(id);
  const spend = getSpend(id);
  const board = getBoard(id);
  const game = getGame(id);
  if (poll) {
    state.polls = state.polls.filter((item) => item.id !== id);
    savePolls(state.polls);
  } else if (list) {
    state.lists = state.lists.filter((item) => item.id !== id);
    saveLists(state.lists);
  } else if (spend) {
    state.spends = state.spends.filter((item) => item.id !== id);
    saveSpends(state.spends);
  } else if (board) {
    state.boards = state.boards.filter((item) => item.id !== id);
    saveBoards(state.boards);
  } else if (game) {
    state.games = state.games.filter((item) => item.id !== id);
    saveGames(state.games);
  } else {
    return;
  }
  if (state.store) void state.store.remove(id);
  const name = poll ? pollTitle(poll) : list ? listTitle(list) : spend ? spendTitle(spend) : board ? boardTitle(board) : gameTitle(game);
  flash(t('share.deleted', { name }));
  // On its page, the page finds it gone and says so as any missing thing does.
  if (route().id === id) render();
}

export function persistPoll(changed) {
  const ok = savePolls(state.polls);
  if (!ok && !keptElsewhere(changed)) flash(t('home.storageWarning'), 'error');
  if (state.store && changed) void state.store.save(changed);
  if (state.remote && changed?.shared) {
    pushPoll(changed).catch(pushFailed(changed));
  }
  return ok;
}

/**
 * Send a poll — after taking in what the database already has.
 *
 * Writing this device's copy straight away used to erase whatever had come
 * in since it last looked: Paul ticks Saturday from a link, the organiser
 * ticks Friday a moment later on a copy without Paul, and Paul was gone —
 * his tick and his name. The copy stored is now merged in first, cell by
 * cell, exactly as a poll arriving on screen is; and the database does the
 * same on its side, for the moment between this read and that write, and
 * for any app not yet up to date.
 */
async function pushPoll(changed) {
  let outgoing = changed;
  try {
    const stored = await state.remote.get(changed.id);
    if (isValidPoll(stored) && adoptPoll(stored)) {
      outgoing = getPoll(changed.id) || changed;
      if (!isBusy()) render();
    }
  } catch {
    // Unreadable just now: the database merges on its side all the same.
  }
  // A guest taking back a choice of their own sends the secret that proves it
  // was theirs; the database keeps it nowhere.
  const unlock = isOrganiser(outgoing) ? {} : choiceUnlocks(outgoing);
  if (Object.keys(unlock).length) outgoing = { ...outgoing, unlock };
  await state.remote.put(outgoing, keyFor(outgoing), organiserSecret(outgoing.id));
}

export function getPoll(id) {
  return state.polls.find((poll) => poll.id === id) || null;
}

export function persistSpend(changed) {
  const ok = saveSpends(state.spends);
  if (!ok && !keptElsewhere(changed)) flash(t('home.storageWarning'), 'error');
  if (state.store && changed) void state.store.save(changed);
  if (state.remote && changed?.shared) {
    pushMerged(changed, { valid: isValidSpend, adopt: adoptSpend, find: getSpend }).catch(pushFailed(changed));
  }
  return ok;
}

export function getSpend(id) {
  return state.spends.find((spend) => spend.id === id) || null;
}

export function replaceSpend(next, { redraw = true } = {}) {
  state.spends = state.spends.map((spend) => (spend.id === next.id ? next : spend));
  persistSpend(next);
  if (redraw) render();
}

export function replacePoll(next, { redraw = true } = {}) {
  state.polls = state.polls.map((poll) => (poll.id === next.id ? next : poll));
  persistPoll(next);
  if (redraw) render();
}

/**
 * The days of a new poll, apart from the typed choices: those of the event it
 * is for, a tap each, when it runs over several; any other on the calendar;
 * and one hour for them all, when the evening has one.
 */
function newPollDaysHtml() {
  const event = linkedEvent();
  const eventDaysOf = event && eventDays(event).length > 1 ? eventDays(event) : [];
  const picked = state.newPollDays;
  const chip = (day) => `<button type="button" class="chip ${picked.includes(day) ? 'chip--on' : ''}" data-toggle-day="${escapeHtml(day)}"
      aria-pressed="${picked.includes(day) ? 'true' : 'false'}">${escapeHtml(formatDayLong(day))}</button>`;
  const others = picked.filter((day) => !eventDaysOf.includes(day));
  return `
      ${
        eventDaysOf.length
          ? `<span class="small">${escapeHtml(t('polls.eventDays'))}</span>
             <div class="row row--chips" role="group">${eventDaysOf.map(chip).join('')}</div>
             <p class="muted small">${escapeHtml(t('polls.eventDaysHint'))}</p>`
          : ''
      }
      <div class="row row--tight">
        <label class="small add-day">
          ${escapeHtml(t(eventDaysOf.length ? 'polls.addOtherDay' : 'polls.addDay'))}
          <input type="date" id="poll-add-day" />
        </label>
        <label class="small add-day" id="poll-add-at-label" ${picked.length ? '' : 'hidden'}>
          ${escapeHtml(t('polls.daysHour'))}
          <input type="time" id="poll-add-at" value="${escapeHtml(state.newPollAt || '')}" />
        </label>
      </div>
      <div class="row" id="poll-days" ${others.length ? '' : 'hidden'}>${pickedDaysHtml(others)}</div>`;
}

/** The picked days that are not the event's, as chips a tap takes away. */
function pickedDaysHtml(days) {
  return days
    .map(
      (day) => `<button type="button" class="chip chip--on" data-drop-day="${escapeHtml(day)}"
                        aria-label="${escapeHtml(t('polls.dropDay', { day: choiceOfDay(day, getLanguage()) }))}">
                  ${escapeHtml(choiceOfDay(day, getLanguage()))} ×
                </button>`,
    )
    .join('');
}

/**
 * A plausible day from a date field. Typing the year on a keyboard goes
 * through 0002, 0020 and 0202 before 2026, each a valid date to the browser.
 */
function typedDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number(value.slice(0, 4)) >= 1900 ? value : '';
}

/** The picked days shown again, the date field left alone. */
function showNewPollDays() {
  const picked = state.newPollDays;
  view.querySelectorAll('[data-toggle-day]').forEach((chip) => {
    const on = picked.includes(chip.dataset.toggleDay);
    chip.classList.toggle('chip--on', on);
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const eventDaysOf = [...view.querySelectorAll('[data-toggle-day]')].map((chip) => chip.dataset.toggleDay);
  const others = picked.filter((day) => !eventDaysOf.includes(day));
  const hour = view.querySelector('#poll-add-at-label');
  if (hour) hour.hidden = !picked.length;
  const list = view.querySelector('#poll-days');
  if (list) {
    list.innerHTML = pickedDaysHtml(others);
    list.hidden = !others.length;
  }
}

export function bindNewPoll() {
  const form = view.querySelector('#new-poll');
  if (!form) return;

  const snapshot = () => {
    state.newPollForActivity = Boolean(view.querySelector('#poll-for-activity')?.checked);
    state.newPollQuestion = view.querySelector('#poll-question').value;
    state.newPollChoices = view.querySelector('#poll-choices').value;
    state.newPollAt = view.querySelector('#poll-add-at')?.value ?? state.newPollAt;
    view.querySelectorAll('[data-person-index]').forEach((input) => {
      state.newPollPeople[Number(input.dataset.personIndex)] = input.value;
    });
  };

  view.querySelectorAll('[data-new-group]').forEach((chip) => {
    chip.addEventListener('click', () => {
      snapshot();
      state.newGroupChoice = { touched: true, id: chip.dataset.newGroup || null };
      render();
    });
  });

  view.querySelector('#add-person')?.addEventListener('click', () => {
    snapshot();
    state.newPollPeople = [...state.newPollPeople, ''];
    render();
    view.querySelector(`[data-person-index="${state.newPollPeople.length - 1}"]`)?.focus();
  });

  view.querySelector('#drop-person')?.addEventListener('click', () => {
    snapshot();
    state.newPollPeople = state.newPollPeople.slice(0, -1);
    render();
  });

  view.querySelectorAll('[data-suggest]').forEach((chip) => {
    chip.addEventListener('click', () => {
      snapshot();
      const { suggest } = chip.dataset;
      if (state.newPollPeople.includes(suggest)) return;
      const empty = state.newPollPeople.findIndex((name) => !name.trim());
      if (empty >= 0) state.newPollPeople[empty] = suggest;
      else state.newPollPeople = [...state.newPollPeople, suggest];
      render();
    });
  });

  // Picked days are kept apart from the typed choices, in date order, as chips
  // a tap takes away; they become choices — days, not words about days — only
  // when the poll is created.
  // No redraw here: it would rebuild the date field under the finger, and
  // iOS closes its calendar the moment its field goes. Only what the days
  // change is touched.
  view.querySelector('#poll-add-day')?.addEventListener('change', (event) => {
    const day = typedDay(event.target.value);
    if (!day) return;
    snapshot();
    if (!state.newPollDays.includes(day)) state.newPollDays = [...state.newPollDays, day].sort();
    showNewPollDays();
  });

  view.querySelectorAll('[data-toggle-day]').forEach((chip) => {
    chip.addEventListener('click', () => {
      snapshot();
      const day = chip.dataset.toggleDay;
      state.newPollDays = state.newPollDays.includes(day)
        ? state.newPollDays.filter((one) => one !== day)
        : [...state.newPollDays, day].sort();
      render();
    });
  });

  // Another event picked: its days are the ones to offer.
  view.querySelectorAll('[data-new-event]').forEach((chip) => {
    chip.addEventListener('click', () => {
      snapshot();
      chooseEvent(state.polls.find((one) => one.id === chip.dataset.newEvent) || null);
      render();
    });
  });

  view.querySelector('#poll-days')?.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-drop-day]');
    if (!chip) return;
    snapshot();
    state.newPollDays = state.newPollDays.filter((day) => day !== chip.dataset.dropDay);
    render();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    snapshot();
    let poll = signed(organise(landing(createPoll({ question: state.newPollQuestion, names: state.newPollPeople }))));
    poll = addOptions(poll, state.newPollChoices);
    // A day typed out already is not offered twice.
    const typed = new Set(poll.options.map((option) => choiceWhen(option)?.date).filter(Boolean));
    poll = addDays(poll, state.newPollDays.filter((day) => !typed.has(day)), state.newPollAt || null);
    if (state.newPollForActivity) poll = markForActivity(poll, true);

    state.polls = [...state.polls, poll];
    persistPoll(poll);
    resetGroupChoice();
    state.newPollQuestion = '';
    state.newPollChoices = '';
    state.newPollDays = [];
    state.newPollAt = '';
    state.newPollForActivity = false;
    state.newPollPeople = withMeFirst(['', ''], myName());
    navigate(`#/poll/${poll.id}`);
  });
}

/**
 * Bring one's own column into view in the poll grid, just right of the column
 * of choices, which stays put. Does nothing when it is already in sight,
 * unless asked to.
 */
function showMyColumn({ always = false } = {}) {
  const box = view.querySelector('.table-wrap[data-keep-scroll]');
  const mine = box?.querySelector('thead th.votes__mine');
  const first = box?.querySelector('thead th');
  if (!box || !mine || !first) return;
  const start = mine.offsetLeft - first.offsetWidth;
  const inSight = start >= box.scrollLeft && mine.offsetLeft + mine.offsetWidth <= box.scrollLeft + box.clientWidth;
  if (inSight && !always) return;

  // Opening the poll: a quiet jump, before anything has been looked at.
  if (!always) {
    box.scrollLeft = Math.max(0, start);
    return;
  }

  // Asked for with a tap on a name: go there, visibly. The name chips sit at
  // the top of the page and the grid well below them — below the fold on a
  // phone — so lighting up a column nobody can see answered nothing. The page
  // comes down to the grid, just under the bar that stays at the top, and the
  // grid slides to the column; both move, so the eye follows where it went.
  const still = matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const behavior = still ? 'auto' : 'smooth';
  const bar = document.querySelector('.app-bar');
  const top = box.getBoundingClientRect().top + window.scrollY - (bar?.offsetHeight || 0) - 8;
  window.scrollTo({ top: Math.max(0, top), behavior });
  box.scrollTo({ left: Math.max(0, start), behavior });
}

/**
 * A tap on the grid before any name is chosen: the names above light up, and
 * come into sight if the page had scrolled them away.
 */
function askWhoFirst() {
  const names = view.querySelector('[data-iam]');
  if (!names) return;
  names.classList.remove('iam--nudge');
  // Read the layout between the two, so the same light plays again on a
  // second tap rather than being merged into the first.
  names.getBoundingClientRect();
  names.classList.add('iam--nudge');
  const still = matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  names.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
}

export function bindPoll(poll) {
  view.querySelectorAll('[data-vote]').forEach((button) => {
    button.addEventListener('click', () => {
      const [personId, optionId] = button.dataset.vote.split('|');
      const answeringAs = state.prefs.voter?.[poll.id];
      // No name chosen yet: the tap asks for one rather than voting.
      if (!answeringAs) {
        askWhoFirst();
        return;
      }
      // The screen already refuses; this refuses too, whatever the screen did.
      if (answeringAs !== personId) return;
      const next = setVote(poll, personId, optionId, nextValue(voteOf(poll, personId, optionId)));
      if (next === poll) return;
      replacePoll(next);
    });
  });

  view.querySelectorAll('[data-me]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const chosen = state.prefs.voter?.[poll.id] === chip.dataset.me ? null : chip.dataset.me;
      state.prefs = { ...state.prefs, voter: { ...state.prefs.voter, [poll.id]: chosen } };
      savePrefs(state.prefs);
      render();
      // Asked for by the tap itself: show that person's column, wherever the
      // grid had been left.
      showMyColumn({ always: true });
    });
  });

  // A guest not on the list adds their own name, and is then who answers.
  view.querySelector('#solo-me-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = view.querySelector('#solo-me').value.trim();
    if (!name) return;
    // Matched the way everywhere else matches names — case, accents and
    // blanks aside — so "chloe" does not add a second Chloé.
    const same = (person) => sameName(person.name) === sameName(name);
    let next = poll;
    let person = poll.people.find(same);
    if (!person) {
      next = addPollPerson(poll, name);
      person = next.people.find(same);
    }
    state.prefs = { ...state.prefs, voter: { ...state.prefs.voter, [poll.id]: person.id } };
    savePrefs(state.prefs);
    if (next === poll) render();
    else replacePoll(next);
    showMyColumn({ always: true });
  });

  // Opening the poll: straight to one's own column, so answering takes no
  // scrolling at all. A redraw of the same poll keeps its place instead — see
  // render(), which runs after this and puts the grid back where it was.
  showMyColumn();

  // A guest's own choices carry the fingerprint that lets them take them back.
  const added = async (next) => (isOrganiser(poll) ? next : claimChoices(poll, next));

  view.querySelector('#add-choice')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const field = view.querySelector('#new-choice');
    const day = pickedDays[poll.id] || null;
    const at = day ? view.querySelector('#new-choice-at')?.value || null : null;
    const next = addChoice(poll, { text: field.value, day, at });
    if (next === poll) {
      field.focus();
      return;
    }
    // Something done on a day keeps the day for the next one; a day added on
    // its own leaves the form empty for another.
    // The hour goes either way: it was this one's.
    delete pickedHours[poll.id];
    if (!field.value.trim()) delete pickedDays[poll.id];
    replacePoll(await added(next));
    view.querySelector('#new-choice')?.focus();
  });

  view.querySelectorAll('[data-drop-option]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!(await ask(t('polls.confirmRemoveChoice'), { confirmLabel: t('action.delete'), danger: true }))) return;
      replacePoll(removeOption(poll, button.dataset.dropOption));
    });
  });

  // Picking a day or an hour redraws the form — the hour waits for a day —
  // and keeps whatever was being typed.
  const pickDay = (day) => {
    const typed = view.querySelector('#new-choice')?.value || '';
    pickedDays[poll.id] = day;
    if (!day) delete pickedHours[poll.id];
    render();
    const field = view.querySelector('#new-choice');
    if (field) field.value = typed;
    // No keyboard popping up over a day just picked, unless words go with it.
    if (typed) field?.focus();
  };
  view.querySelectorAll('[data-choice-day]').forEach((button) => {
    button.addEventListener('click', () => pickDay(button.dataset.choiceDay));
  });
  // The calendar is not redrawn under the finger: iOS closes it the moment
  // its field is rebuilt. The day is kept, and the hour opened or closed.
  view.querySelector('#new-choice-day')?.addEventListener('change', (event) => {
    const day = typedDay(event.target.value);
    if (event.target.value && !day) return;
    if (day) pickedDays[poll.id] = day;
    else {
      delete pickedDays[poll.id];
      delete pickedHours[poll.id];
    }
    const hour = view.querySelector('#new-choice-at');
    if (!hour) return;
    hour.disabled = !day;
    if (!day) hour.value = '';
  });
  view.querySelector('#new-choice-at')?.addEventListener('change', (event) => {
    pickedHours[poll.id] = event.target.value;
  });

  view.querySelectorAll('[data-option]').forEach((button) => {
    button.addEventListener('click', () => openChoiceDialog(poll, button.dataset.option));
  });

  view.querySelector('#poll-people')?.addEventListener('click', () => openPollPeopleDialog(poll));

  view.querySelector('#poll-text')?.addEventListener('click', () => {
    showCopyDialog({ title: pollTitle(poll), hint: t('lists.textHint'), text: pollText(poll) });
  });

  view.querySelector('#poll-close')?.addEventListener('click', () => {
    const next = setClosed(poll, !poll.closedAt);
    // Closing a poll that chooses an activity puts its clear winner on the
    // event's programme — here only, on the device that closes it, so that
    // two phones never make it twice.
    const activities = next.closedAt ? activitiesOnClose(next, everything().map((one) => (one.id === next.id ? next : one))) : [];
    for (const activity of activities) {
      const made = organise(signed(activity));
      state.polls = [...state.polls, made];
      persistPoll(made);
      flash(t('activity.made', { name: pollTitle(made), event: chainLabelShort(getPoll(made.parent) || made) }));
    }
    replacePoll(next);
  });
  view.querySelector('#poll-for-activity-toggle')?.addEventListener('click', () => {
    flash(t(poll.forActivity ? 'activity.pollUnmarked' : 'activity.pollMarked'));
    replacePoll(markForActivity(poll, !poll.forActivity));
  });

  view.querySelectorAll('[data-retain]').forEach((button) => {
    button.addEventListener('click', () => {
      const option = poll.options.find((one) => one.id === button.dataset.retain);
      const day = option && dayOfOption(poll, option);
      if (!day) return;
      // A poll asking when an activity is gives the activity its day, and
      // closes: it is not itself the event.
      const activity = poll.whenFor && getPoll(poll.whenFor);
      if (activity) {
        flash(t('activity.dayKept', { day: formatDayLong(day.date) }));
        replacePoll(setPollDate(activity, day.date, day.at || activity.at || null, null), { redraw: false });
        replacePoll(setClosed(poll, true));
        return;
      }
      const next = setClosed(setPollDate(poll, day.date, day.at), true);
      flash(t('polls.dateKept', { day: whenText(next) }));
      replacePoll(next);
    });
  });

  view.querySelector('#poll-date-save')?.addEventListener('click', () => {
    const day = view.querySelector('#poll-day').value;
    const hour = view.querySelector('#poll-hour').value;
    const until = view.querySelector('#poll-until')?.value || null;
    const written = view.querySelector('#poll-title').value;
    // Le nom proposé n'est pas un nom choisi : ne le garder que s'il a bougé.
    const named = written.trim() === eventName(poll) ? poll : setEventName(poll, written);
    const next = setPollDate(named, day, hour, until);
    flash(next.date ? t('polls.dateKept', { day: whenText(next) }) : t('polls.dateCleared'));
    replacePoll(next);
  });

  view.querySelector('#event-add')?.addEventListener('click', () => openEventMenu(poll));

  view.querySelector('#event-list')?.addEventListener('click', () => {
    const list = signed(forEvent(poll, createList, eventName(poll) || pollTitle(poll)));
    state.lists = [...state.lists, list];
    persistList(list);
    navigate(`#/list/${list.id}`);
  });

  view.querySelector('#event-spend')?.addEventListener('click', () => {
    const spend = forEvent(poll, createSpend, eventName(poll) || pollTitle(poll));
    state.spends = [...state.spends, spend];
    persistSpend(spend);
    navigate(`#/spend/${spend.id}`);
  });

  view.querySelector('#poll-ics')?.addEventListener('click', () => {
    const event = pollEvent(poll);
    if (!event) return;
    const named = eventName(poll) || pollTitle(poll);
    download(`${fileName(named)}.ics`, icsFor([event], { name: named }), 'text/calendar');
  });

  view.querySelector('#poll-archive')?.addEventListener('click', () => {
    const next = archivePoll(poll, !poll.archivedAt);
    flash(t(next.archivedAt ? 'archive.done' : 'archive.undone'));
    replacePoll(next, { redraw: !next.archivedAt });
    if (next.archivedAt) navigate(pollHome(next));
  });

  view.querySelector('#poll-rename')?.addEventListener('click', () => openPollNameDialog(poll));
  view.querySelector('#poll-sign')?.addEventListener('click', () =>
    openSignatureDialog(poll, (signedBy) => replacePoll({ ...poll, signedBy, updatedAt: Date.now() })));

  view.querySelector('#poll-delete')?.addEventListener('click', async () => {
    if (!(await ask(t('polls.confirmDelete'), { confirmLabel: t('action.delete'), danger: true }))) return;
    if (!(await removeEverywhere(poll))) return;
    state.polls = state.polls.filter((item) => item.id !== poll.id);
    savePolls(state.polls);
    if (state.store) void state.store.remove(poll.id);
    navigate(pollHome(poll));
  });

  // Nobody is told a poll waits for them unless someone says so: the
  // organiser sends a reminder naming who has not answered, with the link.
  view.querySelector('#poll-nudge')?.addEventListener('click', async (event) => {
    let current = poll;
    if (!current.shared) {
      event.currentTarget.disabled = true;
      current = await startSharing(current);
      if (!current) return;
      replacePoll(current);
    }
    showCopyDialog({
      title: t('polls.nudge'),
      hint: t('polls.nudgeHint'),
      text: nudgeText(current, pollLink(location, current.id)),
      send: true,
    });
  });

  view.querySelector('#poll-share')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    let current = poll;

    if (!current.shared) {
      button.disabled = true;
      button.textContent = t('share.sending');
      current = await startSharing(current);
      if (!current) return;
      replacePoll(current);
    }

    showCopyDialog({
      title: t('polls.shareTitle'),
      hint: t('polls.shareHint'),
      text: pollLink(location, current.id),
      qr: true,
    });
  });
}

/**
 * Correct a choice — its words, its day, its hour —, or drop it. The day is
 * kept apart from the words: renaming « Samedi 13 octobre » « Samedi soir »
 * leaves it the Saturday it was.
 */
function openChoiceDialog(poll, optionId) {
  const option = poll.options.find((entry) => entry.id === optionId);
  if (!option) return;
  const event = choiceDaysEvent(poll);
  const when = choiceWhen(option, poll.createdAt);
  let day = when?.date || '';
  let dayTouched = false;

  const dialog = makeDialog();
  dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('polls.choiceTitle'))}</h2>
      <label class="visually-hidden" for="choice-text">${escapeHtml(t('polls.choiceTitle'))}</label>
      <input type="text" id="choice-text" value="${escapeHtml(option.text)}"
             placeholder="${escapeHtml(t('polls.otherPlaceholder'))}" />
      ${
        event
          ? `<span class="small">${escapeHtml(t('polls.choiceDay'))}</span>
             ${dayChipsHtml(event, day, { attr: 'data-choice-day', noneLabel: t('polls.anyDay') })}`
          : `<label class="small add-day">
               ${escapeHtml(t('polls.pickDay'))}
               <input type="date" id="choice-day" value="${escapeHtml(day)}" />
             </label>`
      }
      <label class="small add-day">
        ${escapeHtml(t('polls.pickHour'))}
        <input type="time" id="choice-at" value="${escapeHtml(when?.at || '')}" />
      </label>
      <div class="row">
        <button type="button" class="button button--primary" id="choice-save">${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" id="choice-cancel">${escapeHtml(t('action.cancel'))}</button>
        <button type="button" class="button button--danger" id="choice-delete">${escapeHtml(t('action.delete'))}</button>
      </div>
    </form>`;

  const field = dialog.querySelector('#choice-text');
  dialog.querySelectorAll('[data-choice-day]').forEach((chip) => {
    chip.addEventListener('click', () => {
      day = chip.dataset.choiceDay;
      dayTouched = true;
      dialog.querySelectorAll('[data-choice-day]').forEach((one) => {
        const on = one.dataset.choiceDay === day;
        one.classList.toggle('chip--on', on);
        one.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  });
  dialog.querySelector('#choice-day')?.addEventListener('change', (change) => {
    day = change.target.value;
    dayTouched = true;
  });
  const save = () => {
    dialog.close();
    const words = field.value.trim();
    // Words rewritten to name another day, the day left as it was: the words
    // say which day is meant.
    const named = !dayTouched && words !== option.text ? dayOfChoice(words, new Date()) : null;
    const kept = named?.date || day || null;
    const at = kept ? named?.at || dialog.querySelector('#choice-at').value || null : null;
    if (!words && !kept) return;
    replacePoll(renameOption(setOptionDay(poll, optionId, kept, at), optionId, words));
  };
  dialog.querySelector('#choice-save').addEventListener('click', save);
  field.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    save();
  });
  dialog.querySelector('#choice-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#choice-delete').addEventListener('click', async () => {
    if (!(await ask(t('polls.confirmRemoveChoice'), { confirmLabel: t('action.delete'), danger: true }))) return;
    dialog.close();
    replacePoll(removeOption(poll, optionId));
  });

  dialog.showModal();
  field.focus();
  field.select();
}

/** Who is being asked. */
function openPollPeopleDialog(poll) {
  const held = () => getPoll(poll.id) || poll;
  openPeopleEditor({
    hint: t('polls.peopleHint'),
    confirmRemove: t('polls.confirmRemovePerson'),
    people: () => held().people,
    add: (name) => replacePoll(addPollPerson(held(), name), { redraw: false }),
    rename: (id, name) => replacePoll(renamePollPerson(held(), id, name), { redraw: false }),
    remove: (id) => replacePoll(removePollPerson(held(), id), { redraw: false }),
  });
}

function openPollNameDialog(poll) {
  const dialog = makeDialog();
  dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('polls.rename'))}</h2>
      <label class="visually-hidden" for="poll-new-name">${escapeHtml(t('polls.question'))}</label>
      <input type="text" id="poll-new-name" value="${escapeHtml(poll.question)}" />
      <div class="row">
        <button type="button" class="button button--primary" id="poll-name-save">${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" id="poll-name-cancel">${escapeHtml(t('action.cancel'))}</button>
      </div>
    </form>`;

  const field = dialog.querySelector('#poll-new-name');
  const save = () => {
    dialog.close();
    replacePoll({ ...poll, question: field.value.trim(), updatedAt: Date.now() });
  };
  dialog.querySelector('#poll-name-save').addEventListener('click', save);
  field.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    save();
  });
  dialog.querySelector('#poll-name-cancel').addEventListener('click', () => dialog.close());

  dialog.showModal();
  field.focus();
  field.select();
}

/**
 * "Proposé par …": a nickname under the title of a list or a poll, for the
 * people who open it from a link and would otherwise not know who is asking.
 *
 * Per document, because the same person is "Gui" to the family and "le voisin
 * du 3e" to the building. One nickname is remembered and put on whatever this
 * device creates next; each list or poll can then carry another, or none, and
 * change at any time. On a poll with an organiser it is the organiser's to
 * set, like the rest of what frames the poll — the database keeps it so.
 */
export function signedByHtml(document_) {
  const name = String(document_?.signedBy || '').trim();
  if (!name) return '';
  return `<p class="signed small">${escapeHtml(t('sign.by', { name }))}</p>`;
}

/** A new list or poll takes the nickname this device signs with, if it has one. */
export function signed(document_) {
  const name = String(state.prefs.signature || '').trim();
  return name ? { ...document_, signedBy: name } : document_;
}

export function openSignatureDialog(document_, save) {
  const current = String(document_.signedBy || '').trim();
  const remembered = String(state.prefs.signature || '').trim();
  const dialog = makeDialog();
  dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('sign.edit'))}</h2>
      <p class="muted small">${escapeHtml(t('sign.hint'))}</p>
      <label class="visually-hidden" for="sign-name">${escapeHtml(t('sign.placeholder'))}</label>
      <input type="text" id="sign-name" maxlength="40" autocomplete="nickname"
             value="${escapeHtml(current || remembered)}" placeholder="${escapeHtml(t('sign.placeholder'))}" />
      <label class="checkbox">
        <input type="checkbox" id="sign-remember" ${!remembered || remembered === (current || remembered) ? 'checked' : ''} />
        ${escapeHtml(t('sign.remember'))}
      </label>
      <div class="row">
        <button type="button" class="button button--primary" id="sign-save">${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" id="sign-cancel">${escapeHtml(t('action.cancel'))}</button>
      </div>
    </form>`;

  const field = dialog.querySelector('#sign-name');
  const done = () => {
    const name = field.value.trim().slice(0, 40) || null;
    if (dialog.querySelector('#sign-remember').checked) {
      state.prefs = { ...state.prefs, signature: name };
      savePrefs(state.prefs);
    }
    dialog.close();
    // Emptied: the signature comes off this one, and says so nowhere else.
    if (name !== (current || null)) save(name);
  };
  dialog.querySelector('#sign-save').addEventListener('click', done);
  field.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    done();
  });
  dialog.querySelector('#sign-cancel').addEventListener('click', () => dialog.close());
  dialog.showModal();
  field.focus();
  field.select();
}

/** The poll as text, to paste into a message. */
/** The reminder: the question, who has not answered yet, and the link. */
function nudgeText(poll, link) {
  const silent = poll.people
    .filter((person) => !poll.options.some((option) => voteOf(poll, person.id, option.id)))
    .map((person) => person.name);
  return t('polls.nudgeText', { question: pollTitle(poll), names: silent.join(', '), count: silent.length, link });
}

function pollText(poll) {
  const { rows } = tally(poll);
  const line = (row) =>
    `${choiceLabel(row.option)} — ${t('polls.countLine', { yes: row.yes, total: poll.people.length })}`;
  return [pollTitle(poll), '', ...rows.map(line)].join('\n');
}

/**
 * Fetch a poll from the shared database and take what it knows. False when
 * there is nothing new, and null — falsy all the same — when the database
 * could not be reached: "this poll no longer exists" would be untrue then.
 */
export async function pullPoll(id) {
  if (!state.remote) return false;
  let stored = null;
  try {
    stored = await state.remote.get(id);
  } catch {
    return null;
  }
  if (stored === null) return whenAbsent(id);
  return isValidPoll(stored) ? adoptPoll(stored) : false;
}

/** Answers arrive cell by cell, so nobody's answer is lost to someone else's. */
export function adoptPoll(stored) {
  const local = getPoll(stored.id);
  const merged = local ? mergePolls(local, stored) : stored;
  if (local && merged === local) return false;

  const adopted = { ...merged, shared: true };
  state.polls = local
    ? state.polls.map((poll) => (poll.id === stored.id ? adopted : poll))
    : [...state.polls, adopted];
  savePolls(state.polls);
  return true;
}

/** While a shared poll is on screen, watch for the answers coming in. */
export function watchPoll(id) {
  // Already watching this one: a redraw — a vote, a tick — must not restart
  // the clock, or answers would only ever arrive to a screen left untouched.
  if (state.pollWatched === id && state.poll) return;
  stopWatching();
  if (!state.remote) return;
  state.pollWatched = id;
  const look = async () => {
    if (isBusy() || isHidden()) return;
    if (await pullPoll(id)) render();
  };
  // At once, and then every five seconds: opening a poll should show the
  // answers that are already in, not the ones that were in last time.
  void look();
  state.poll = setInterval(look, 5000);
}

/** Le compte que la base détient, s'il est plus récent que celui d'ici. */
export async function pullSpend(id) {
  if (!state.remote) return false;
  let stored = null;
  try {
    stored = await state.remote.get(id);
  } catch {
    return false;
  }
  if (stored === null) return whenAbsent(id);
  return isValidSpend(stored) ? adoptSpend(stored) : false;
}

/** Les dépenses arrivent ligne par ligne : celle de l'un ne chasse pas l'autre. */
export function adoptSpend(stored) {
  const local = getSpend(stored.id);
  const merged = local ? mergeSpends(local, stored) : stored;
  if (local && merged === local) return false;

  const adopted = { ...merged, shared: true };
  state.spends = local
    ? state.spends.map((spend) => (spend.id === stored.id ? adopted : spend))
    : [...state.spends, adopted];
  saveSpends(state.spends);
  return true;
}

/** Tant qu'un compte partagé est à l'écran, guetter ce que les autres notent. */
export function watchSpend(id) {
  stopWatching();
  if (!state.remote) return;
  state.poll = setInterval(async () => {
    if (isBusy() || isHidden()) return;
    if (await pullSpend(id)) render();
  }, 5000);
}
