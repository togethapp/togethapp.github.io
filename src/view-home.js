/**
 * Home, the groups tab and the settings: what is coming, what waits on me, the
 * groups this device is in and who knocks at them, and the app's own settings.
 *
 * Calls back into app.js and the other views only from inside functions.
 */

import {
  appVersion, countsText, escapeHtml, everything, flash, flashHtml, forEventText, formatDate, gameCardHtml,
  gameTitle, groupChipsHtml, isBusy, kindsHtml, navigate, render, route, state, view, whenText,
  backButtonHtml,
} from './app.js';
import { dayNow, groupCounts, inGroup, isLive, peopleIn, personFile, topEventOf, upcomingEvents } from './dashboard.js';
import { getLanguage, t } from './i18n.js';
import { agendaFor, eventName } from './ics.js';
import { progress } from './lists.js';
import { readCode, readInvite } from './lock.js';
import { goers, isEvent, lastDay, seeksDay, tally } from './polls.js';
import { joinLink } from './remote.js';
import { gameStatus } from './scoring.js';
import { balances, showAmount, spendCurrency, spendTotal } from './spends.js';
import { sameName } from './stats.js';
import {
  accountHtml, accountNeededHtml, accountOfferHtml, accountToken, leaveWithAccount, syncAccount,
} from './view-account.js';
import { openActivityDialog, openActivityPicker, unblockedHtml } from './view-flows.js';
import { purchasesToWrite } from './flows.js';
import { ask, makeDialog, shareMessage, showCopyDialog } from './view-games.js';
import {
  bindData, bindInAppWarning, catchUpWith, checkPending, chooseEvent, destinationForNew, deviceLabel, forgetGate,
  forgetGroup, forgetPending, gate, groups, groupsByName, heldOrganiserSecrets, hiddenByGroupHtml, inAppWarningHtml,
  joinGroup, LINK_ONLY, loadGate, lots, myName, NAME_KEPT, onHomeScreen, pendings, refreshGroup, rememberPending,
  remoteReason, resetGroupChoice, setMyName, shownDocs,
} from './view-groups.js';
import { holoHtml } from './view-holo.js';
import { boardCardHtml } from './view-ideas.js';
import { installReminderHtml } from './view-install.js';
import { askInvitationShape, groupNamed, showCalendar, showMyLink, showsGate } from './view-join.js';
import { notifyHtml } from './view-notify.js';
import { listCardHtml, listTitle } from './view-lists.js';
import { languageHtml, lookHtml } from './view-look.js';
import { getPoll, heldCounts, pollCardHtml, pollTitle } from './view-polls.js';
import { eventCardHtml, money, myBalance, spendCardHtml, spendTitle } from './view-spends.js';

/* --------------------------------------------------------------- overview --- */

/**
 * The page the app opens on: what is going on, and what the app is made of.
 *
 * It holds what belongs to no one tab — the groups this device is in, the
 * data, the app's own link — and the few things actually in progress across
 * the three, so that opening the app answers "where were we" before it asks
 * anything.
 */
/**
 * What is coming: the days this group's polls settled on, and the lines that
 * are due on one, in the order they will happen.
 *
 * Built from the very same agendaFor() the .ics is built from, so what shows
 * here and what a subscribed calendar receives cannot drift apart. Overdue
 * lines come first: a day that has passed is the one thing worth looking at
 * before the ones that have not.
 */
function comingHtml() {
  const today = dayNow();
  // Events have their own section above; what is left is the lines given a day.
  const events = agendaFor({ lists: shownDocs(state.lists), polls: [] });
  // An event over several days is late only once its last day has gone.
  const ends = (event) => event.until || event.day;
  const late = events.filter((event) => ends(event) < today);
  const coming = events.filter((event) => ends(event) >= today);

  // Nothing dated on show: say so only when the group filter is what hides it.
  if (!events.length) return hiddenByGroupHtml(state.lists.filter((list) => isLive(list) && list.items.some((item) => item.due)));

  const shown = [...late.slice(-3), ...coming.slice(0, 8)];
  const hidden = events.length - shown.length;

  const row = (event) => {
    const overdue = ends(event) < today;
    const when = whenText({ date: event.day, until: event.until, at: event.at }, { long: true });
    return `
      <button type="button" class="game-card" data-goto="#/${event.kind === 'poll' ? 'poll' : 'list'}/${escapeHtml(event.docId)}">
        <span class="game-card__title">
          ${escapeHtml(event.summary)}
          ${overdue ? `<span class="pill pill--late">${escapeHtml(t('agenda.late'))}</span>` : ''}
        </span>
        <span class="game-card__meta">${escapeHtml(when)}${event.description ? ` · ${escapeHtml(event.description)}` : ''}</span>
      </button>`;
  };

  return `
    <div class="game-list">${shown.map(row).join('')}</div>
    ${hidden > 0 ? `<p class="muted small">${escapeHtml(t('agenda.more', { count: hidden }))}</p>` : ''}`;
}

/**
 * The events coming, first on Home: an event is what most of the rest is for —
 * the list of what to bring, the account, the polls, the ideas. Each card says
 * where those stand; the event's page holds them all. Polls still looking for
 * a day are counted, one tap from the agenda where they are decided.
 */
function eventsHtml() {
  const coming = upcomingEvents(shownDocs(state.polls));
  const deciding = shownDocs(state.polls).filter((poll) => isLive(poll) && !poll.date && !poll.closedAt && seeksDay(poll));
  const shown = coming.slice(0, 3);
  return `
    <section class="section">
      <div class="section__head">
        <h2>${escapeHtml(t('events.title'))}</h2>
        <button type="button" class="button button--small button--ghost" data-goto="#/agenda">${escapeHtml(t('events.seeAgenda'))}</button>
      </div>
      ${
        shown.length
          ? `<div class="game-list">${shown.map(eventCardHtml).join('')}</div>`
          : `<p class="muted small">${escapeHtml(t('events.noneHome'))}</p>`
      }
      ${coming.length > shown.length ? `<p class="muted small">${escapeHtml(t('events.more', { count: coming.length - shown.length }))}</p>` : ''}
      ${hiddenByGroupHtml(upcomingEvents(state.polls))}
      ${
        deciding.length
          ? `<button type="button" class="game-card" data-goto="#/agenda">
               <span class="game-card__title">${escapeHtml(t('polls.toDecide'))}</span>
               <span class="game-card__meta">${escapeHtml(t('events.deciding', { count: deciding.length }))}</span>
             </button>`
          : ''
      }
      <div class="row">
        <button type="button" class="button button--small button--new" data-goto="#/agenda/new">+ ${escapeHtml(t('events.new'))}</button>
      </div>
    </section>`;
}






/**
 * The rest of what is going on, a few of each kind — leaving out what "For
 * you" already shows, which is given as the addresses it opens.
 */
function pendingHtml(shown = new Set()) {
  const lines = [];
  const recent = (a, b) => b.updatedAt - a.updatedAt;
  const notShown = (goto) => (document_) => !shown.has(`${goto}${document_.id}`);

  const ongoing = shownDocs(state.games).filter((game) => isLive(game) && !gameStatus(game).finished)
    .filter(notShown('#/game/')).sort(recent);
  const open = shownDocs(state.lists).filter((list) => isLive(list) && progress(list).left > 0)
    .filter(notShown('#/list/')).sort(recent);
  const asked = shownDocs(state.polls).filter((poll) => isLive(poll) && !poll.closedAt)
    .filter(notShown('#/poll/')).sort(recent);
  const owing = shownDocs(state.spends).filter((spend) => isLive(spend) && balances(spend).some((row) => row.balance !== 0))
    .filter(notShown('#/spend/')).sort(recent);

  for (const list of open.slice(0, 3)) {
    const { left } = progress(list);
    lines.push({
      goto: `#/list/${list.id}`,
      title: listTitle(list),
      meta: t('lists.leftToDo', { count: left }) + forEventText(list),
    });
  }
  for (const poll of asked.slice(0, 3)) {
    const { answered } = tally(poll);
    lines.push({
      goto: `#/poll/${poll.id}`,
      title: pollTitle(poll),
      meta: t('polls.answered', { count: answered, total: poll.people.length }) + forEventText(poll),
    });
  }
  for (const spend of owing.slice(0, 3)) {
    const mine = myBalance(spend);
    lines.push({
      goto: `#/spend/${spend.id}`,
      title: spendTitle(spend),
      meta: (mine && mine.balance !== 0
        ? t(mine.balance > 0 ? 'spends.owedToMe' : 'spends.iOwe', { amount: money(Math.abs(mine.balance), spend) })
        : t('spends.total', { amount: money(spendTotal(spend), spend) })) + forEventText(spend),
    });
  }
  for (const game of ongoing.slice(0, 3)) {
    lines.push({
      goto: `#/game/${game.id}`,
      title: gameTitle(game),
      meta: t('home.rounds', { count: game.rounds.length }) + forEventText(game),
    });
  }

  if (!lines.length) {
    return shown.size ? '' : `<p class="muted small">${escapeHtml(t('overview.nothing'))}</p>`;
  }
  return `<div class="game-list">${lines
    .map(
      (line) => `
        <button type="button" class="game-card" data-goto="${escapeHtml(line.goto)}">
          <span class="game-card__title">${escapeHtml(line.title)}</span>
          <span class="game-card__meta">${escapeHtml(line.meta)}</span>
        </button>`,
    )
    .join('')}</div>`;
}

/**
 * What the gatekeeper of a group sees: the people knocking, each with the first
 * name they gave, and one tap to let them in or turn them away.
 */
function requestsHtml(group) {
  const rows = gate().requests[group.id];
  if (!rows) return `<p class="muted small">${escapeHtml(t('gate.loading'))}</p>`;
  if (!rows.length) return `<p class="muted small">${escapeHtml(t('gate.nobody'))}</p>`;

  return `<div class="stack stack--tight">${rows
    .map(
      (row) => `
        <div class="knock">
          <div>
            <strong>${escapeHtml(row.name || t('gate.someone'))}</strong>
            <span class="muted small">${escapeHtml(row.label || '')}</span>
          </div>
          <div class="row row--tight">
            <button type="button" class="button button--small button--primary"
                    data-admit="${escapeHtml(group.id)}" data-request="${escapeHtml(row.id)}">
              ${escapeHtml(t('gate.admit'))}
            </button>
            <button type="button" class="button button--small button--ghost"
                    data-refuse="${escapeHtml(group.id)}" data-request="${escapeHtml(row.id)}">
              ${escapeHtml(t('gate.refuse'))}
            </button>
          </div>
        </div>`,
    )
    .join('')}</div>`;
}

/** Who is in the group, device by device, and the one tap that cuts one off. */
function devicesHtml(group) {
  const rows = gate().devices[group.id];
  if (!rows) return `<p class="muted small">${escapeHtml(t('gate.loading'))}</p>`;

  // How many devices have an account: what tells whether everyone has moved
  // over, before requiring one.
  const withAccount = rows.filter((row) => row.account).length;
  const accounts = `
    <div class="card stack stack--tight accounts-switch">
      <p class="small">${escapeHtml(t('gate.accountsCount', { count: withAccount, total: rows.length }))}</p>
      <p class="muted small">${escapeHtml(t(group.accounts ? 'gate.accountsOnHint' : 'gate.accountsOffHint'))}</p>
      <div class="row">
        <button type="button" class="button button--small ${group.accounts ? 'button--ghost' : ''}"
                data-accounts="${escapeHtml(group.id)}" data-on="${group.accounts ? 'no' : 'yes'}">
          ${escapeHtml(t(group.accounts ? 'gate.accountsOff' : 'gate.accountsOn'))}
        </button>
      </div>
    </div>`;
  return `<div class="stack stack--tight">${accounts}${rows
    .map(
      (row) => `
        <div class="knock">
          <div>
            <strong>${escapeHtml(row.label || t('gate.unnamedDevice'))}</strong>
            <span class="muted small">${escapeHtml(
              [
                row.mine ? t('gate.thisDevice') : '',
                row.admits ? t('gate.admitsToo') : '',
                row.link ? t('back.hasLink') : '',
                row.account ? t('gate.hasAccount') : t('gate.noAccount'),
              ]
                .filter(Boolean)
                .join(' · '),
            )}</span>
          </div>
          <div class="row row--tight">
            ${
              row.link
                ? `<button type="button" class="button button--small button--ghost"
                           data-cut-link="${escapeHtml(group.id)}" data-person="${escapeHtml(row.person)}">
                     ${escapeHtml(t('back.cutLink'))}
                   </button>`
                : ''
            }
            <button type="button" class="button button--small button--ghost"
                    data-admits="${escapeHtml(group.id)}" data-key="${escapeHtml(row.id)}"
                    data-allow="${row.admits ? 'no' : 'yes'}">
              ${escapeHtml(t(row.admits ? 'gate.dropAdmits' : 'gate.giveAdmits'))}
            </button>
            ${
              row.mine
                ? ''
                : `<button type="button" class="button button--small button--ghost"
                           data-cut="${escapeHtml(group.id)}" data-key="${escapeHtml(row.id)}">
                     ${escapeHtml(t('gate.cut'))}
                   </button>`
            }
          </div>
        </div>`,
    )
    .join('')}</div>`;
}

/** The knocks this device is waiting on, so a wait is never invisible. */
function myKnocksHtml() {
  const held = pendings();
  if (!held.length) return '';
  return `
    <div class="stack stack--tight">${held
      .map(
        // The ticket is this device's future key: it stays in storage, and the
        // buttons carry a place in the list instead.
        (knock, index) => `
          <div class="knock">
            <div>
              <strong>${escapeHtml(knock.groupName)}</strong>
              <span class="muted small">${escapeHtml(t('gate.askedAt', { date: formatDate(knock.at) }))}</span>
            </div>
            <div class="row row--tight">
              <button type="button" class="button button--small" data-check="${index}">
                ${escapeHtml(t('gate.check'))}
              </button>
              <button type="button" class="button button--small button--ghost" data-drop="${index}">
                ${escapeHtml(t('gate.dropMine'))}
              </button>
            </div>
          </div>`,
      )
      .join('')}</div>`;
}

function groupsHtml() {
  const held = groups();
  return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('groups.manage'))}</h2></div>
      <p class="muted small">${escapeHtml(t('groups.hint'))}</p>
      ${
        held.length
          ? `<p class="muted small">${escapeHtml(t('groups.keepKey'))}</p>`
          : ''
      }
      ${
        // Une app posée sur l'écran d'accueil part de zéro : le dire ici, avant
        // qu'on la pose, plutôt que de la laisser paraître cassée une fois posée.
        held.length && !onHomeScreen()
          ? `<p class="muted small">${escapeHtml(t('groups.beforeHomeScreen'))}</p>`
          : ''
      }
      ${
        held.length
          ? `<div class="stack stack--tight">${held
              .map(
                (group) => `
                  <div class="group">
                    <div>
                      <strong>${escapeHtml(group.name)}</strong>
                      <span class="muted small">${escapeHtml(t('groups.shared', {
                        count: [...state.games, ...state.lists, ...state.polls, ...state.spends, ...state.boards]
                          .filter((document_) => document_.groupId === group.id).length,
                      }))}</span>
                    </div>
                    <div class="row">
                      <button type="button" class="button button--small" data-invite="${escapeHtml(group.id)}">
                        ${escapeHtml(t('groups.invite'))}
                      </button>
                      <button type="button" class="button button--small" data-catch-up="${escapeHtml(group.id)}">
                        ${escapeHtml(t('groups.catchUp'))}
                      </button>
                      <button type="button" class="button button--small button--ghost" data-show-key="${escapeHtml(group.id)}">
                        ${escapeHtml(t('groups.showKey'))}
                      </button>
                      ${
                        // The founder's key belongs to no person, so it has no
                        // return link — it is the one that gets pasted instead.
                        group.admits
                          ? ''
                          : `<button type="button" class="button button--small button--ghost" data-my-link="${escapeHtml(group.id)}">
                               ${escapeHtml(t('back.myLink'))}
                             </button>`
                      }
                      <button type="button" class="button button--small button--ghost" data-calendar="${escapeHtml(group.id)}">
                        ${escapeHtml(t('agenda.group'))}
                      </button>
                      ${
                        // Cutting the address stops everyone's calendar: the
                        // database leaves it to a key that lets people in.
                        group.admits
                          ? `<button type="button" class="button button--small button--ghost" data-cut-calendar="${escapeHtml(group.id)}">
                               ${escapeHtml(t('agenda.cut'))}
                             </button>`
                          : ''
                      }
                      <button type="button" class="button button--small button--ghost" data-leave="${escapeHtml(group.id)}">
                        ${escapeHtml(t('groups.leave'))}
                      </button>
                    </div>
                    ${
                      group.admits === false
                        ? ''
                        : `<div class="stack stack--tight">
                             <span class="muted small">${escapeHtml(t('gate.knocking'))}</span>
                             ${requestsHtml(group)}
                             <details class="details">
                               <summary>${escapeHtml(t('gate.who'))}</summary>
                               ${devicesHtml(group)}
                             </details>
                           </div>`
                    }
                  </div>`,
              )
              .join('')}</div>`
          : `<p class="muted small">${escapeHtml(t('groups.none'))}</p>
             ${inAppWarningHtml()}
             ${
               // An app added to the home screen keeps its own files and its own
               // storage: it is a second device, not the same one, and the first
               // time that surprises someone is when their group is not there.
               onHomeScreen()
                 ? `<p class="muted small">${escapeHtml(t('groups.standaloneNew'))}</p>`
                 : ''
             }`
      }

      ${
        pendings().length
          ? `<div class="stack stack--tight">
               <span class="muted small">${escapeHtml(t('gate.mine'))}</span>
               ${myKnocksHtml()}
             </div>`
          : ''
      }

      <label for="group-name">${escapeHtml(t('groups.add'))}</label>
      <div class="row row--tight">
        <input type="text" id="group-name" autocomplete="off"
               placeholder="${escapeHtml(t('groups.namePlaceholder'))}" />
        <input type="text" id="group-code" class="code-input" inputmode="numeric" autocomplete="one-time-code"
               placeholder="000000" aria-label="${escapeHtml(t('groups.codePlaceholder'))}" />
      </div>
      <button type="button" class="button button--primary button--block" id="group-join">${escapeHtml(t('gate.knock'))}</button>
      <p class="muted small" id="group-state">${escapeHtml(t('groups.codeHint'))}</p>

      <details class="details">
        <summary>${escapeHtml(t('groups.withKey'))}</summary>
        <p class="muted small">${escapeHtml(t('groups.keyHint'))}</p>
        <div class="row row--tight">
          <input type="password" id="group-key" autocomplete="off" spellcheck="false"
                 placeholder="${escapeHtml(t('groups.keyPlaceholder'))}" />
          <button type="button" class="button" id="group-paste">${escapeHtml(t('groups.join'))}</button>
        </div>
      </details>
    </section>`;
}

/**
 * Who this device belongs to. Shown here rather than buried in a setting,
 * because it is what the app puts in a group's list of keys and what it offers
 * as the first person of every new list.
 */
function meHtml() {
  return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('me.title'))}</h2></div>
      <p class="muted small">${escapeHtml(t(state.remote ? 'me.hint' : 'me.hintAlone'))}</p>
      <div class="row row--tight">
        <input type="text" id="me-name" autocomplete="given-name" maxlength="${NAME_KEPT}"
               value="${escapeHtml(myName())}" placeholder="${escapeHtml(t('me.placeholder'))}"
               aria-label="${escapeHtml(t('me.title'))}" />
        <button type="button" class="button" id="me-save">${escapeHtml(t('action.save'))}</button>
      </div>
    </section>`;
}

/**
 * The overview's group boards: what each group has on the go, in numbers that
 * are also the way in — tapping one opens that tab, already on that group.
 */
function byGroupHtml() {
  const held = groupsByName();
  if (!held.length) return '';
  return `
    <section class="section">
      <div class="section__head">
        <h2>${escapeHtml(t('groups.title'))}</h2>
        <span class="muted small">${escapeHtml(t('dash.groupCount', { count: held.length }))}</span>
      </div>
      ${held.map(groupBoardHtml).join('')}
    </section>`;
}

function groupBoardHtml(group) {
  const counts = groupCounts(state, group.id);
  const tile = (value, label, goto) => `
    <button type="button" class="tile" data-group-tile="${escapeHtml(group.id)}" data-tile-goto="${goto}"
            aria-label="${escapeHtml(`${group.name} — ${value} ${label}`)}">
      <span class="tile__value">${value}</span>
      <span class="tile__label">${escapeHtml(label)}</span>
    </button>`;
  return `
    <div class="card stack stack--tight">
      <div class="spread">
        <button type="button" class="group-link" data-goto="#/group/${escapeHtml(encodeURIComponent(group.id))}">
          <strong>${escapeHtml(group.name)}</strong>
          <span class="muted small">${escapeHtml(t('group.open'))} ›</span>
        </button>
        ${
          // The key that may let people in is the one worth naming: it is the
          // only one whose holder has anything to do when someone knocks.
          group.admits === false
            ? `<span class="muted small">${escapeHtml(t('dash.member'))}</span>`
            : `<span class="pill">${escapeHtml(t('dash.gate'))}</span>`
        }
      </div>
      <div class="tiles">
        ${tile(counts.lists, t('tab.lists'), '#/lists')}
        ${tile(counts.polls, t('tab.polls'), '#/polls')}
        ${tile(counts.games, t('tab.games'), '#/games')}
        ${tile(counts.spends, t('tab.spends'), '#/spends')}
        ${tile(counts.boards, t('tab.ideas'), '#/ideas')}
      </div>
      <p class="muted small">
        ${escapeHtml(t('dash.peopleCount', { count: counts.people }))}${
          counts.at ? ` · ${escapeHtml(formatDate(counts.at))}` : ''
        }${counts.late ? ` · <span class="late">${escapeHtml(t('lists.late', { count: counts.late }))}</span>` : ''}
      </p>
    </div>`;
}

/**
 * Who is in a group, and what is still waiting on each of them — folded away
 * by default. It used to sit in the open on the overview, for every group at
 * once; on a page already scoped to one group, it earns a spot, but not one
 * that pushes past what a group is coming here for: what is going on.
 */
function groupPeopleHtml(group) {
  const mine = (documents) => documents.filter((document_) => inGroup(document_, group.id));
  const me = sameName(myName());
  const names = [...peopleIn({
    lists: mine(state.lists), polls: mine(state.polls), games: mine(state.games), spends: mine(state.spends),
  })].sort((a, b) => (me ? (sameName(a) === me ? 0 : 1) - (sameName(b) === me ? 0 : 1) : 0) || a.localeCompare(b));
  if (!names.length) return '';

  const row = (name) => {
    const waiting = waitingLine(personFile(state, name));
    return `
      <button type="button" class="game-card" data-goto="#/person/${escapeHtml(encodeURIComponent(name))}">
        <span class="game-card__title">${escapeHtml(me && sameName(name) === me ? t('dash.you', { name }) : name)}</span>
        <span class="game-card__meta">${escapeHtml(waiting || t('dash.nothing'))}</span>
      </button>`;
  };

  return `
    <details class="details">
      <summary>${escapeHtml(t('group.who'))}</summary>
      <div class="game-list">${names.map(row).join('')}</div>
    </details>`;
}

/**
 * One group, and everything going on in it, on one page.
 *
 * The tabs sort by kind — lists here, polls there — but the question people
 * come with is about a group: "what is on with the Thursday lot?". So the
 * answer is on one page: what is coming, what is left to tick, to vote, to
 * play, to pay back. Only what is in progress; "see all" opens the tab,
 * already set on this group, for the rest.
 */
export function groupView(group) {
  const ours = (documents) => documents.filter((document_) => isLive(document_) && inGroup(document_, group.id));
  const today = dayNow();
  const byDay = (a, b) => a.date.localeCompare(b.date) || String(a.at || '').localeCompare(String(b.at || ''));
  const recent = (a, b) => b.updatedAt - a.updatedAt;
  const events = ours(state.polls).filter((poll) => poll.date && lastDay(poll) >= today).sort(byDay);
  const polls = ours(state.polls)
    .filter((poll) => !isEvent(poll) && !poll.closedAt && !events.includes(poll))
    .sort(recent);
  const lists = ours(state.lists).filter((list) => progress(list).left > 0).sort(recent);
  const games = ours(state.games).filter((game) => !gameStatus(game).finished).sort(recent);
  const spends = ours(state.spends)
    .filter((spend) => balances(spend).some((row) => row.balance !== 0))
    .sort(recent);
  const boards = ours(state.boards).sort(recent);
  const counts = groupCounts(state, group.id);

  const section = (title, documents, cardHtml, tab) =>
    documents.length
      ? `<section class="section">
           <div class="section__head">
             <h2>${escapeHtml(title)}</h2>
             <button type="button" class="button button--small button--ghost"
                     data-group-tile="${escapeHtml(group.id)}" data-tile-goto="${tab}">
               ${escapeHtml(t('group.seeAll'))}
             </button>
           </div>
           <div class="game-list">${documents.map(cardHtml).join('')}</div>
         </section>`
      : '';

  const sections = [
    section(t('events.coming'), events, eventCardHtml, '#/agenda'),
    section(t('tab.lists'), lists, listCardHtml, '#/lists'),
    section(t('tab.polls'), polls, pollCardHtml, '#/polls'),
    section(t('tab.games'), games, gameCardHtml, '#/games'),
    section(t('tab.spends'), spends, spendCardHtml, '#/spends'),
    section(t('tab.ideas'), boards, boardCardHtml, '#/ideas'),
  ].join('');

  return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/groups')}
      <h1>${escapeHtml(group.name)}</h1>
    </div>
    <p class="muted small">
      ${escapeHtml(t('dash.peopleCount', { count: counts.people }))} · ${escapeHtml(countsText(counts))}
    </p>
    <button type="button" class="button button--primary button--block" data-create-menu>
      + ${escapeHtml(t('create.title'))}
    </button>
    ${sections || `<p class="muted small">${escapeHtml(t('group.nothing'))}</p>`}
    ${groupPeopleHtml(group)}`;
}

/**
 * The "+" in the tab bar: whatever can be made, from wherever one is — and
 * where it will go, said and changeable right here.
 *
 * The destination was once only stated ("it will go into Mifa"), and followed
 * whatever filter happened to be set; people found everything landing in one
 * group without having chosen it. So the menu shows the choice as chips, set
 * on the obvious answer — the group whose page this is, the group picked at
 * the top of Home, the only group there is — and one tap changes it. The form
 * that opens carries it on, with the same chips.
 */
export function openCreateMenu() {
  const here = route();
  // On an event's page, the "+" adds to that event.
  const poll = here.name === 'poll' && !here.solo ? getPoll(here.id) : null;
  if (poll?.date) openEventMenu(poll);
  else openPlainMenu();
}

function openPlainMenu() {
  const here = route();
  const dialog = makeDialog();
  resetGroupChoice();
  const fromPage = here.name === 'group' ? groups().find((group) => group.id === here.id) : null;
  const start = fromPage ? { group: fromPage, linkOnly: false } : destinationForNew();
  let chosen = start.linkOnly ? LINK_ONLY : start.group?.id || '';
  const asks = Boolean(state.remote && groups().length);

  const choice = (goto, label) => `
    <button type="button" class="button button--block" data-create="${goto}">+ ${escapeHtml(label)}</button>`;
  const chip = (id, label) => `
    <button type="button" class="chip ${chosen === id ? 'chip--on' : ''}"
            data-create-into="${escapeHtml(id)}" aria-pressed="${chosen === id ? 'true' : 'false'}">
      ${escapeHtml(label)}
    </button>`;
  dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('create.what'))}</h2>
      ${
        asks
          ? `<div class="stack stack--tight">
               <span class="muted small">${escapeHtml(t('groups.willGoIn'))}</span>
               <div class="row" role="group" aria-label="${escapeHtml(t('groups.willGoIn'))}">
                 ${groupsByName().map((group) => chip(group.id, group.name)).join('')}
                 ${chip(LINK_ONLY, t('groups.linkOnly'))}
                 ${chip('', t('groups.keepToMyself'))}
               </div>
             </div>`
          : ''
      }
      <div class="create-menu">
        ${choice('#/lists/new', t('lists.new'))}
        ${choice('#/polls/new', t('polls.new'))}
        ${choice('#/agenda/new', t('events.new'))}
        <button type="button" class="button button--block" data-create-activity>+ ${escapeHtml(t('activity.new'))}</button>
        ${choice('#/new', t('action.newGame'))}
        ${choice('#/spends/new', t('spends.new'))}
        ${choice('#/ideas/new', t('ideas.new'))}
      </div>
      <div class="row">
        <button type="button" class="button button--ghost" data-create-close>${escapeHtml(t('action.cancel'))}</button>
      </div>
    </div>`;
  dialog.querySelectorAll('[data-create-into]').forEach((node) => {
    node.addEventListener('click', () => {
      chosen = node.dataset.createInto;
      dialog.querySelectorAll('[data-create-into]').forEach((other) => {
        const on = other.dataset.createInto === chosen;
        other.classList.toggle('chip--on', on);
        other.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  });
  dialog.querySelectorAll('[data-create]').forEach((node) => {
    node.addEventListener('click', () => {
      // Said in the menu is chosen: the form starts from it.
      if (asks) state.newGroupChoice = { touched: true, id: chosen };
      dialog.close();
      navigate(node.dataset.create);
    });
  });
  dialog.querySelector('[data-create-activity]').addEventListener('click', () => {
    dialog.close();
    openActivityPicker();
  });
  dialog.querySelector('[data-create-close]').addEventListener('click', () => dialog.close());
  dialog.showModal();
}

/**
 * Add something to an event: whatever can be made, already set on the event —
 * in its group, and between the people who are coming. No group to choose:
 * what is made for an event lives where the event does.
 */
export function openEventMenu(poll) {
  const dialog = makeDialog();
  const name = eventName(poll) || pollTitle(poll);
  const choice = (goto, label) => `
    <button type="button" class="button button--block" data-create="${goto}">+ ${escapeHtml(label)}</button>`;
  dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('event.addTo', { name }))}</h2>
      <p class="muted small">${escapeHtml(t('event.addToHint'))}</p>
      <div class="create-menu">
        <button type="button" class="button button--block" data-create-activity>+ ${escapeHtml(t('activity.new'))}</button>
        ${choice('#/lists/new', t('lists.new'))}
        ${choice('#/polls/new', t('polls.new'))}
        ${choice('#/new', t('action.newGame'))}
        ${choice('#/spends/new', t('spends.new'))}
        ${choice('#/ideas/new', t('ideas.new'))}
      </div>
      <div class="row">
        <button type="button" class="button button--ghost" data-create-close>${escapeHtml(t('action.cancel'))}</button>
        <button type="button" class="button button--ghost" data-create-plain>${escapeHtml(t('event.addElsewhere'))}</button>
      </div>
    </div>`;
  dialog.querySelector('[data-create-plain]').addEventListener('click', () => {
    dialog.close();
    openPlainMenu();
  });
  // On an activity's page, a new activity is its event's: one level only.
  dialog.querySelector('[data-create-activity]').addEventListener('click', () => {
    dialog.close();
    openActivityDialog(topEventOf(poll, everything()) || poll);
  });
  dialog.querySelectorAll('[data-create]').forEach((node) => {
    node.addEventListener('click', () => {
      resetGroupChoice();
      chooseEvent(poll);
      // Those coming are the people of whatever is made for the event.
      const coming = goers(poll);
      if (coming.length) {
        state.newListPeople = [...coming];
        state.newPollPeople = [...coming];
        state.newSpendPeople = [...coming];
        state.newGameNames = [...coming];
        state.newGameTouched = true;
      }
      dialog.close();
      navigate(node.dataset.create);
    });
  });
  dialog.querySelector('[data-create-close]').addEventListener('click', () => dialog.close());
  dialog.showModal();
}

/**
 * What someone owes across accounts: added up per currency, since euros and
 * pounds do not add — « 12,00 € + 8,00 £ ».
 */
function owedText(accounts) {
  const byCurrency = new Map();
  for (const row of accounts) {
    if (row.balance >= 0) continue;
    const code = spendCurrency(row.spend);
    byCurrency.set(code, (byCurrency.get(code) || 0) - row.balance);
  }
  return [...byCurrency].map(([code, cents]) => showAmount(cents, getLanguage(), code)).join(' + ');
}

/**
 * What is waiting on someone, in one line. Late first: a line whose day has
 * passed is the only part of this that is worse today than it was yesterday.
 */
export function waitingLine({ counts, accounts = [] }) {
  return [
    counts.late ? t('lists.late', { count: counts.late }) : '',
    counts.left ? t('lists.leftToDo', { count: counts.left }) : '',
    counts.votes ? t('dash.votes', { count: counts.votes }) : '',
    counts.owes ? t('spends.owes', { amount: owedText(accounts) }) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * The first time the app opens, empty and in no group: what it is for, the
 * first name it goes by, and three ways to begin — rather than three empty
 * sections, each saying there is nothing yet.
 */
function welcomeHtml() {
  const start = (goto, label, primary = false) =>
    `<button type="button" class="button ${primary ? 'button--primary' : ''}" data-goto="${goto}">${escapeHtml(label)}</button>`;
  return `
    <section class="card stack welcome">
      <h2>${escapeHtml(t('welcome.title'))}</h2>
      <p class="lead">${escapeHtml(t('overview.what'))}</p>
      ${
        myName()
          ? `<p>${escapeHtml(t('welcome.hello', { name: myName() }))}</p>`
          : `<label for="me-name">${escapeHtml(t('welcome.name'))}</label>
             <div class="row row--tight">
               <input type="text" id="me-name" autocomplete="given-name" maxlength="${NAME_KEPT}"
                      placeholder="${escapeHtml(t('me.placeholder'))}" />
               <button type="button" class="button" id="me-save">${escapeHtml(t('welcome.itsMe'))}</button>
             </div>
             <p class="muted small">${escapeHtml(t(state.remote ? 'me.hint' : 'me.hintAlone'))}</p>`
      }
      <span class="muted small">${escapeHtml(t('welcome.then'))}</span>
      <div class="row">
        ${state.remote ? start('#/groups', t('welcome.join'), true) : ''}
        ${start('#/polls/new', t('welcome.poll'))}
        ${start('#/lists/new', t('welcome.list'))}
        ${start('#/spends/new', t('welcome.spend'))}
      </div>
    </section>`;
}

export function overviewView() {
  const forYou = forYouItems();
  const nothingYet = ![...state.lists, ...state.polls, ...state.games, ...state.spends, ...state.boards].length;
  const pending = pendingHtml(new Set(forYou.items.map((item) => item.goto)));
  const coming = comingHtml();
  // The first opening: the welcome says it all, and empty sections under it
  // would only say « nothing yet » three more times.
  if (nothingYet && !groups().length) {
    return `
      ${flashHtml()}
      ${kindsHtml('overview')}
      ${welcomeHtml()}`;
  }

  return `
    ${flashHtml()}
    ${kindsHtml('overview')}
    ${groupChipsHtml()}
    ${holoHtml()}
    ${nothingYet ? `<p class="lead">${escapeHtml(t('overview.what'))}</p>` : ''}

    ${accountNeededHtml()}

    ${installReminderHtml()}

    ${eventsHtml()}

    ${unblockedHtml()}

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('forYou.title'))}</h2></div>
      ${forYouHtml(forYou)}
    </section>

    ${
      coming
        ? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('agenda.dated'))}</h2></div>
             ${coming}
           </section>`
        : ''
    }

    ${
      pending
        ? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('overview.pending'))}</h2></div>
             ${pending}
           </section>`
        : ''
    }`;
}


/**
 * What is waiting on this device's person, and on nobody else: a poll they
 * have not answered, lines they were given, money they owe — and, for whoever
 * opens a group's door, the people knocking at it. It is what opening the app
 * is for, so it comes first; the rest of what is going on comes after.
 */
function forYouItems() {
  const items = [];
  for (const group of groupsByName()) {
    const rows = group.admits === false ? null : gate().requests[group.id];
    if (!rows?.length) continue;
    items.push({
      goto: '#/groups',
      title: t('forYou.knocks', { count: rows.length }),
      meta: t('forYou.knocksWhere', { name: group.name }),
    });
  }
  const me = myName();
  if (!me) return { items, noName: true };

  const file = personFile({
    lists: shownDocs(state.lists), polls: shownDocs(state.polls), spends: shownDocs(state.spends),
  }, me);
  for (const row of file.votes.filter((one) => !one.closed && !one.answered)) {
    items.push({ goto: `#/poll/${row.poll.id}`, title: pollTitle(row.poll), meta: t('forYou.vote') + forEventText(row.poll) });
  }
  for (const row of file.lines.filter((one) => one.left > 0).sort((a, b) => b.late - a.late)) {
    items.push({
      goto: `#/list/${row.list.id}`,
      title: listTitle(row.list),
      meta: t('forYou.lines', { count: row.left }) + forEventText(row.list),
      late: row.late ? t('lists.late', { count: row.late }) : '',
    });
  }
  // Bought, ticked, and in no account yet: the receipt is still in a pocket.
  for (const row of purchasesToWrite(me, shownDocs(state.lists), everything())) {
    items.push({
      goto: `#/list/${row.list.id}`,
      title: listTitle(row.list),
      meta: t('forYou.purchases', { count: row.items.length, name: spendTitle(row.account) }) + forEventText(row.list),
    });
  }
  for (const row of file.accounts.filter((one) => one.balance < 0)) {
    items.push({
      goto: `#/spend/${row.spend.id}`,
      title: spendTitle(row.spend),
      meta: t('spends.iOwe', { amount: money(-row.balance, row.spend) }) + forEventText(row.spend),
    });
  }
  return { items };
}

function forYouHtml({ items, noName }) {
  const rows = items.map((item) => `
    <button type="button" class="game-card" data-goto="${escapeHtml(item.goto)}">
      <span class="game-card__title">
        ${escapeHtml(item.title)}
        ${item.late ? `<span class="pill pill--late">${escapeHtml(item.late)}</span>` : ''}
      </span>
      <span class="game-card__meta">${escapeHtml(item.meta)}</span>
    </button>`).join('');
  return `
    ${rows ? `<div class="game-list" id="for-you">${rows}</div>` : ''}
    ${
      noName
        ? `<p class="muted small">${escapeHtml(t('forYou.noName'))}</p>
           <div class="row row--tight">
             <input type="text" id="me-name" autocomplete="given-name" maxlength="${NAME_KEPT}"
                    placeholder="${escapeHtml(t('me.placeholder'))}" aria-label="${escapeHtml(t('me.title'))}" />
             <button type="button" class="button" id="me-save">${escapeHtml(t('welcome.itsMe'))}</button>
           </div>`
        : rows ? '' : `<p class="muted small">${escapeHtml(t('forYou.nothing'))}</p>`
    }`;
}

/**
 * The groups tab: each group this device is in, as a board that opens the
 * group's own page — then everything that lets people in or out of one.
 */
export function groupsView() {
  if (!state.remote) {
    return `
      ${flashHtml()}
      <p class="muted small">${escapeHtml(t('groups.noDatabase'))}</p>`;
  }
  return `
    ${flashHtml()}
    ${
      // Just let in, an account is offered with its form; the same form says
      // what the reminder would.
      accountOfferHtml() || accountNeededHtml()
    }
    ${
      // Knocking at a group asks for a first name: better to meet the field
      // here than to be sent to the settings by an error.
      myName() ? '' : meHtml()
    }
    ${byGroupHtml()}
    ${groupsHtml()}`;
}

/** The app's own settings: who this device is, and its data. */
export function settingsView() {
  return `
    ${flashHtml()}
    ${meHtml()}
    ${languageHtml()}
    ${lookHtml()}
    ${accountHtml()}
    ${notifyHtml()}
    ${dataHtml()}`;
}

function dataHtml() {
  return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('home.data'))}</h2></div>
      <div class="row">
        <button type="button" class="button button--small button--ghost" id="share-app">${escapeHtml(t('action.shareApp'))}</button>
        <button type="button" class="button button--small" id="export">${escapeHtml(t('action.export'))}</button>
        <button type="button" class="button button--small" id="import">${escapeHtml(t('action.import'))}</button>
        <button type="button" class="button button--small" id="import-paste">${escapeHtml(t('action.importPaste'))}</button>
        <button type="button" class="button button--small" id="open-link">${escapeHtml(t('action.openLink'))}</button>
        <button type="button" class="button button--small" id="claude-guide">${escapeHtml(t('claude.button'))}</button>
        ${
          lots().length
            ? `<button type="button" class="button button--small" id="my-shares">${escapeHtml(t('lots.title', { count: lots().length }))}</button>`
            : ''
        }
        <input type="file" id="import-file" accept="application/json,.json" class="visually-hidden" />
      </div>
      <p class="muted small">${escapeHtml(
        t(state.remote ? 'home.storedShared' : state.store ? 'home.storedCloud' : 'home.storedLocal'),
      )}</p>
      <p class="muted small">${escapeHtml(t('data.holds', heldCounts()))}</p>
      ${
        Object.keys(heldOrganiserSecrets()).length
          ? `<p class="muted small" id="organiser-backup">${escapeHtml(
              t('data.organiserBackup', { count: Object.keys(heldOrganiserSecrets()).length }),
            )}</p>`
          : ''
      }
      ${
        appVersion()
          ? `<p class="muted small">
               ${escapeHtml(t('data.version', { version: appVersion() }))}
               ${
                 'serviceWorker' in navigator
                   ? `<button type="button" class="button button--small button--ghost" id="look-update">
                        ${escapeHtml(t('data.lookForUpdate'))}
                      </button>`
                   : ''
               }
             </p>`
          : ''
      }
      ${
        state.remote && groups().length
          ? `<label class="checkbox">
               <input type="checkbox" id="auto-share" ${state.prefs.autoShare ? 'checked' : ''} />
               ${escapeHtml(t('data.autoShare'))}
             </label>
             <p class="muted small">${escapeHtml(t('data.autoShareHint'))}</p>`
          : ''
      }
    </section>`;
}

/**
 * Paste an invitation into either field and both fill.
 *
 * Whatever lands in the name or the code box is read as a whole invitation
 * first: the message carries the name, the six digits and the link, and
 * selecting exactly one of them on a phone is the step people fail at. What is
 * not an invitation is left to paste normally.
 */
export function bindInvitationPaste(nameField, codeField) {
  if (!nameField || !codeField) return;
  const take = (event) => {
    const pasted = event.clipboardData?.getData('text') || '';
    const { name, code } = readInvite(pasted);
    if (!code && !name) return;
    event.preventDefault();
    if (name) nameField.value = name;
    if (code) codeField.value = code;
    // Where the paste landed is where the eye is; the other field is now
    // filled behind it, so the button is the only thing left to press.
    (code ? codeField : nameField).focus();
  };
  nameField.addEventListener('paste', take);
  codeField.addEventListener('paste', take);

  // Typed, or pasted by a route that skips the event: the digits are the only
  // thing this box is for.
  codeField.addEventListener('input', () => {
    const digits = codeField.value.replace(/[^0-9]/g, '').slice(0, 6);
    if (digits !== codeField.value) codeField.value = digits;
  });
}

export function bindOverview() {
  bindData();
  bindInAppWarning();

  view.querySelector('#me-save')?.addEventListener('click', () => {
    const name = setMyName(view.querySelector('#me-name').value);
    flash(name ? t('me.saved', { name }) : t('me.cleared'));
    render();
  });
  view.querySelector('#me-name')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    view.querySelector('#me-save')?.click();
  });

  const joining = (line, message) => {
    line.textContent = message;
  };

  bindInvitationPaste(view.querySelector('#group-name'), view.querySelector('#group-code'));

  view.querySelector('#group-join')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const line = view.querySelector('#group-state');
    const name = view.querySelector('#group-name').value.trim();
    const code = readCode(view.querySelector('#group-code').value);
    if (!name) return joining(line, t('groups.needName'));
    if (!code) return joining(line, t('groups.needCode'));
    // Everything that can refuse without asking the database is refused before
    // the button goes dead, or a missing first name would leave it dead.
    if (!myName()) return joining(line, t('gate.needNameFirst'));

    button.disabled = true;
    joining(line, t('groups.checking'));
    const me = myName();

    // Already in this group: knocking again would hand this device a second,
    // ordinary key — and remembering it would throw away the one it holds,
    // which on the founder's phone is the only key that lets anyone in.
    const held = groupNamed(name);
    if (held) {
      let taken = 0;
      try {
        taken = await catchUpWith(held);
      } catch {
        button.disabled = false;
        return joining(line, t('groups.unsure'));
      }
      button.disabled = false;
      flash(taken
        ? t('join.alreadyCaughtUp', { name: held.name, count: taken })
        : t('join.alreadyUpToDate', { name: held.name }));
      render();
      return;
    }

    let answer = { status: 'unknown' };
    try {
      answer = await state.remote.ask(name, code, me, deviceLabel());
    } catch {
      button.disabled = false;
      return joining(line, t('groups.unsure'));
    }
    button.disabled = false;

    if (answer.status === 'busy') return joining(line, t('gate.busy'));
    if (answer.status !== 'waiting') return joining(line, t('groups.codeRefused'));

    rememberPending({
      ticket: answer.ticket,
      groupId: answer.id,
      groupName: answer.name || name,
      me,
      at: Date.now(),
    });
    flash(t('gate.asked', { name: answer.name || name }));
    render();
  });

  view.querySelector('#group-code')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    view.querySelector('#group-join')?.click();
  });

  // The very first device of a group has no one to invite it: it starts from
  // the key the database printed in the SQL editor.
  view.querySelector('#group-paste')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const line = view.querySelector('#group-state');
    const key = view.querySelector('#group-key').value.trim();
    if (!key) return;

    button.disabled = true;
    joining(line, t('groups.checking'));
    let group = null;
    try {
      group = await joinGroup(key);
    } catch {
      button.disabled = false;
      return joining(line, t('groups.unsure'));
    }
    button.disabled = false;
    if (!group) return joining(line, t('groups.refused'));

    flash(t('groups.joined', { name: group.name }));
    render();
  });

  view.querySelectorAll('[data-invite]').forEach((button) => {
    button.addEventListener('click', async () => {
      const group = groups().find((item) => item.id === button.dataset.invite);
      if (!group) return;

      // Two shapes, and the usual one first: a link good for the day that
      // several people can knock with, or one meant for a single person.
      const shape = await askInvitationShape();
      if (!shape) return;

      button.disabled = true;
      button.textContent = t('share.sending');
      let invitation = null;
      try {
        invitation = await state.remote.invite(group.key, shape.minutes, shape.uses);
      } catch (error) {
        flash(remoteReason(error), 'error');
        render();
        return;
      }
      if (!invitation) {
        flash(t('groups.unsure'), 'error');
        render();
        return;
      }
      render();
      // Everything in one message: the group, the code in plain sight, the link
      // and how to install the app. It is the only thing the person will read —
      // they will not open a guide, and will remember nothing else.
      const url = joinLink(location, group.name, invitation.code);
      const days = Math.max(1, Math.round(invitation.minutes / (24 * 60)));
      await shareMessage({
        title: t('groups.inviteReady', { name: group.name }),
        hint: t('groups.inviteWhy'),
        message: t('groups.inviteText', { name: group.name, code: invitation.code, url, days }),
        url,
        code: invitation.code,
      });
    });
  });

  view.querySelectorAll('[data-admit], [data-refuse]').forEach((button) => {
    button.addEventListener('click', async () => {
      const admit = 'admit' in button.dataset;
      const group = groups().find((item) => item.id === (admit ? button.dataset.admit : button.dataset.refuse));
      if (!group) return;
      button.disabled = true;
      let status = 'unknown';
      try {
        status = await state.remote.answer(group.key, button.dataset.request, admit);
      } catch {
        flash(t('groups.unsure'), 'error');
        render();
        return;
      }
      forgetGate(group.id);
      await loadGate(group);
      if (status === 'ok') flash(t('gate.admitted'));
      else if (status === 'refused') flash(t('gate.refused'));
      else flash(t('gate.gone'), 'error');
      render();
    });
  });

  // Who may let people in, decided from the app: the same thing the guide used to
  // ask for an `update` in the SQL editor for.
  view.querySelectorAll('[data-accounts]').forEach((button) => {
    button.addEventListener('click', async () => {
      const group = groups().find((item) => item.id === button.dataset.accounts);
      if (!group) return;
      const on = button.dataset.on === 'yes';
      const sure = await ask(t(on ? 'gate.accountsConfirmOn' : 'gate.accountsConfirmOff'),
        { confirmLabel: t(on ? 'gate.accountsOn' : 'gate.accountsOff'), danger: on });
      if (!sure) return;
      button.disabled = true;
      let status = 'unknown';
      try {
        // Requiring one takes this device signed in, its key the account's:
        // the account learns the key first.
        if (on) await syncAccount({ restore: false, force: true });
        status = await state.remote.setAccounts(group.key, on, on ? await accountToken() : null);
      } catch {
        flash(t('groups.unsure'), 'error');
        render();
        return;
      }
      await refreshGroup(group);
      forgetGate(group.id);
      await loadGate(group);
      flash(t(status === 'ok' ? (on ? 'gate.accountsDoneOn' : 'gate.accountsDoneOff') : 'gate.accountsNeedMine'), status === 'ok' ? 'info' : 'error');
      render();
    });
  });

  view.querySelectorAll('[data-admits]').forEach((button) => {
    button.addEventListener('click', async () => {
      const group = groups().find((item) => item.id === button.dataset.admits);
      if (!group) return;
      const allow = button.dataset.allow === 'yes';
      const sure = await ask(t(allow ? 'gate.confirmGiveAdmits' : 'gate.confirmDropAdmits'),
        { confirmLabel: t(allow ? 'gate.giveAdmits' : 'gate.dropAdmits'), danger: !allow });
      if (!sure) return;

      button.disabled = true;
      let status = 'unknown';
      try {
        status = await state.remote.setAdmits(group.key, button.dataset.key, allow);
      } catch {
        flash(t('groups.unsure'), 'error');
        render();
        return;
      }
      forgetGate(group.id);
      await loadGate(group);
      // This device may have just changed what it is allowed to do.
      await refreshGroup(group);
      if (status === 'ok') flash(t(allow ? 'gate.gaveAdmits' : 'gate.droppedAdmits'));
      else if (status === 'last') flash(t('gate.cutLast'), 'error');
      else flash(t('gate.gone'), 'error');
      render();
    });
  });

  view.querySelectorAll('[data-cut-link]').forEach((button) => {
    button.addEventListener('click', async () => {
      const group = groups().find((item) => item.id === button.dataset.cutLink);
      if (!group) return;
      if (!(await ask(t('back.confirmCutLink'), { confirmLabel: t('back.cutLink'), danger: true }))) return;
      button.disabled = true;
      let status = 'unknown';
      try {
        status = await state.remote.forgetLink(group.key, button.dataset.person);
      } catch {
        flash(t('groups.unsure'), 'error');
        render();
        return;
      }
      forgetGate(group.id);
      await loadGate(group);
      flash(status === 'ok' ? t('back.cutLinkDone') : t('gate.gone'), status === 'ok' ? 'info' : 'error');
      render();
    });
  });

  view.querySelectorAll('[data-cut]').forEach((button) => {
    button.addEventListener('click', async () => {
      const group = groups().find((item) => item.id === button.dataset.cut);
      if (!group) return;
      if (!(await ask(t('gate.confirmCut'), { confirmLabel: t('gate.cut'), danger: true }))) return;
      let status = 'unknown';
      try {
        status = await state.remote.cutKey(group.key, button.dataset.key);
      } catch {
        flash(t('groups.unsure'), 'error');
        render();
        return;
      }
      forgetGate(group.id);
      await loadGate(group);
      if (status === 'ok') flash(t('gate.cutDone'));
      else if (status === 'last') flash(t('gate.cutLast'), 'error');
      else flash(t('gate.gone'), 'error');
      render();
    });
  });

  view.querySelectorAll('[data-check]').forEach((button) => {
    button.addEventListener('click', async () => {
      const knock = pendings()[Number(button.dataset.check)];
      if (!knock) return;
      button.disabled = true;
      const status = await checkPending(knock);
      if (status === 'waiting') flash(t('gate.stillWaiting'));
      else if (status === null) flash(t('groups.unsure'), 'error');
      render();
    });
  });

  view.querySelectorAll('[data-drop]').forEach((button) => {
    button.addEventListener('click', async () => {
      const knock = pendings()[Number(button.dataset.drop)];
      if (!knock) return;
      if (!(await ask(t('gate.confirmDropMine', { name: knock.groupName }),
        { confirmLabel: t('gate.dropMine'), danger: true }))) return;
      forgetPending(knock.ticket);
      flash(t('gate.droppedMine', { name: knock.groupName }));
      render();
    });
  });

  // What the gatekeeper's blocks need, asked once and then kept.
  for (const group of showsGate() ? groups() : []) {
    if (group.admits === undefined) {
      refreshGroup(group).then((learnt) => {
        if (learnt && !isBusy() && showsGate()) render();
      });
      continue;
    }
    if (group.admits === false) continue;
    loadGate(group).then((learnt) => {
      if (learnt && !isBusy() && showsGate()) render();
    });
  }

  view.querySelectorAll('[data-catch-up]').forEach((button) => {
    button.addEventListener('click', async () => {
      const group = groups().find((item) => item.id === button.dataset.catchUp);
      if (!group) return;
      button.disabled = true;
      button.textContent = t('share.sending');
      let taken = 0;
      try {
        taken = await catchUpWith(group);
      } catch {
        flash(t('groups.unsure'), 'error');
        render();
        return;
      }
      flash(taken ? t('groups.caughtUp', { count: taken }) : t('groups.upToDate'));
      render();
    });
  });

  // The key this device holds, readable again — so it can be kept somewhere safe,
  // or put into a second installation (the app on a home screen, a new phone)
  // without inviting anyone or asking anyone to accept anything.
  view.querySelectorAll('[data-my-link]').forEach((button) => {
    button.addEventListener('click', async () => {
      const group = groups().find((item) => item.id === button.dataset.myLink);
      if (!group) return;
      if (!(await ask(t('back.confirmMyLink'), { confirmLabel: t('back.myLink') }))) return;
      button.disabled = true;
      await showMyLink(group);
    });
  });

  view.querySelectorAll('[data-calendar]').forEach((button) => {
    button.addEventListener('click', async () => {
      const group = groups().find((item) => item.id === button.dataset.calendar);
      if (!group) return;
      // Disabled while the database is asked, and given back afterwards: the
      // dialog that opens does not redraw the page behind it, so a button left
      // disabled here would stay grey until something else redrew it.
      button.disabled = true;
      try {
        await showCalendar(group);
      } finally {
        button.disabled = false;
      }
    });
  });

  view.querySelectorAll('[data-cut-calendar]').forEach((button) => {
    button.addEventListener('click', async () => {
      const group = groups().find((item) => item.id === button.dataset.cutCalendar);
      if (!group) return;
      if (!(await ask(t('agenda.confirmCut'), { confirmLabel: t('agenda.cut'), danger: true }))) return;
      button.disabled = true;
      let answer = 'unknown';
      try {
        answer = await state.remote.forgetCalendar(group.key);
      } catch {
        button.disabled = false;
        flash(t('groups.unsure'), 'error');
        render();
        return;
      }
      flash(answer === 'ok' ? t('agenda.cutDone') : t('agenda.none'), answer === 'ok' ? 'info' : 'error');
      render();
    });
  });

  view.querySelectorAll('[data-show-key]').forEach((button) => {
    button.addEventListener('click', async () => {
      const group = groups().find((item) => item.id === button.dataset.showKey);
      if (!group) return;
      if (!(await ask(t('groups.confirmShowKey', { name: group.name }), { confirmLabel: t('groups.showKey') }))) return;
      showCopyDialog({
        title: t('groups.keyTitle', { name: group.name }),
        // Which key this is matters more than the key itself: the one printed at
        // the group's creation lets people in, every other one does not.
        hint: `${t('groups.keyWarning')} ${t(group.admits ? 'groups.keyAdmits' : 'groups.keyPlain')}`,
        text: group.key,
      });
    });
  });

  view.querySelectorAll('[data-leave]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!(await ask(t('groups.confirmLeave'), { confirmLabel: t('groups.leave'), danger: true }))) return;
      await leaveWithAccount(groups().find((group) => group.id === button.dataset.leave));
      forgetGroup(button.dataset.leave);
      render();
    });
  });
}
