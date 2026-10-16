/** UI layer: hash router, views, event wiring. */

import { getPreset } from './games.js';
import { isValidGame, mergeGames } from './model.js';
import { gameStatus } from './scoring.js';
import { eventName } from './ics.js';
import { isValidList } from './lists.js';
import { isEvent, isValidPoll, seeksDay } from './polls.js';
import { CURRENCIES, isValidSpend } from './spends.js';
import { isValidBoard } from './ideas.js';
import {
  allDocuments, ancestorsOf, attachTargets, childrenOf, groupCounts, isEventDoc, isLive, kindOf, parentId,
} from './dashboard.js';
import { loadBoards, loadGames, loadLists, loadPolls, loadPrefs, loadSpends, saveGames, savePrefs } from './storage.js';
import { connectStore } from './cloud.js';
import { backTokenFrom, createRemote, joinFrom } from './remote.js';
import { readCode } from './lock.js';
import { remoteConfig } from './config.js';
import { detectLanguage, getLanguage, setLanguage, t } from './i18n.js';
import {
  adoptPoll, adoptSpend, bindNewPoll, bindPoll, eventTagHtml, getPoll, getSpend, newPollView, pollCardHtml,
  pollsView, pollTitle, pollView, pullPoll, pullSpend, watchPoll, watchSpend, whenAbsent,
} from './view-polls.js';
import {
  adoptList, archivedHtml, bindList, bindNewList, getGame, getList, listCardHtml, listsView, listTitle, listView,
  newListView, pullList,
} from './view-lists.js';
import {
  agendaView, bindNewEvent, bindNewSpend, bindSpend, eventCardHtml, newEventView, newSpendView, spendCardHtml,
  spendsView, spendTitle, spendView,
} from './view-spends.js';
import {
  adoptBoard, bindBoard, bindNewBoard, boardCardHtml, boardTitle, boardView, getBoard, ideasView, newBoardView,
  pullBoard, watchBoard,
} from './view-ideas.js';
import { bindGame, bindNewGame, gameView, makeDialog, newGameView } from './view-games.js';
import {
  bindDocSwipes, bindEventChips, bindHome, catchUpAll, catchUpQuietly, checkAllPendings, copyToGroup, groupFilter,
  groups, groupsByName, hiddenByGroupHtml, offerMeInForms, openAttachDialog, openGatherDialog, openRelateDialog,
  openSet, OUTSIDE_GROUPS, outsideGroups, pendingFor, pendings, putInGroup, refreshGate, setGroupFilter, shownDocs,
  verifyGroups,
} from './view-groups.js';
import { bindFlows } from './view-flows.js';
import { bindAccount, privacyView, syncAccount } from './view-account.js';
import { bindInstall, startInstall } from './view-install.js';
import { bindHolo } from './view-holo.js';
import { applyLook, bindLook, lookIsDark } from './view-look.js';
import { swipeable } from './swipe.js';
import { prefillOf, withoutPrefill } from './prefill.js';
import { bindOverview, groupsView, groupView, openCreateMenu, overviewView, settingsView } from './view-home.js';
import { backView, bindBack, bindJoin, joinView, showsGate, watchGate, watchPending } from './view-join.js';
import { personView, renameEverywhere, statsView } from './view-people.js';

export const view = document.getElementById('view');

export const state = {
  games: loadGames(),
  lists: loadLists(),
  polls: loadPolls(),
  spends: loadSpends(),
  boards: loadBoards(),
  prefs: loadPrefs(),
  flash: null, // { message, kind: 'info' | 'error' }
  editingRoundId: null,
  // New-game form draft, kept across re-renders of that view.
  search: '',
  newPresetId: null,
  newConfig: null,
  newName: '',
  // Set once the host's document store answers; null means this browser only.
  store: null,
  // The shared database, when this copy of the app is configured for one.
  remote: createRemote(remoteConfig()),
  // Polling while a shared game is on screen.
  poll: null,
  // The set of games being fetched, so a redraw does not start a second fetch.
  openingSet: null,
  // The same, for a shared list opened from its link.
  openingList: null,
  // And for a poll.
  openingPoll: null,
  // And for a shared account of expenses.
  openingSpend: null,
  // And for a board of ideas.
  openingBoard: null,
  // Whose lines are on screen in a list: null for everyone, 'none' for the
  // ones nobody has taken.
  listFilter: null,
  // The screens walked through to get here, oldest first, without loops: what
  // "Back" returns to. See followTrail().
  trail: [],
  // The new-list form's draft, kept across re-renders like the new-game one:
  // adding a person must not throw away the lines already typed.
  newListName: '',
  newListPeople: ['', ''],
  newListLines: '',
  // And the new board's.
  newBoardName: '',
  // And the new account's.
  newSpendName: '',
  newSpendCurrency: 'EUR',
  // The account whose « add an expense » form is unfolded. Once an account has
  // lines, the form folds behind one button, so the lines are what is in sight.
  spendFormOpen: null,
  newSpendPeople: ['', ''],
  // Which half of an account's page is showing — reset when a different
  // account is opened, kept when this one just redraws (adding a line, say).
  spendTabId: null,
  spendTab: 'expenses',
  // And the new-poll form's.
  newEventName: '',
  newEventDay: '',
  newEventHour: '',
  newEventUntil: '',
  newEventPeople: ['', ''],
  newPollQuestion: '',
  newPollChoices: '',
  // Days picked on the calendar, as YYYY-MM-DD, shown apart from the typed choices.
  newPollDays: [],
  // One hour for all the picked days, when the evening has one.
  newPollAt: '',
  newPollPeople: ['', ''],
  // Names typed so far, so switching preset does not wipe them.
  newGameNames: ['', '', ''],
  // Whether anyone has touched the entrant fields since the form was emptied.
  //
  // My own first name is offered as the first *player*, never as a team, and the
  // preset is only known once the form is drawn — so the offer is made at draw
  // time. Which means it must be made once: put back after someone deleted it, it
  // would put them in a game they had just taken themselves out of.
  newGameTouched: false,
  // Where a thing about to be created will land — decided on the form, before it
  // exists, rather than left for a later that never came.
  //
  // A dialog would do the job and was tried; it puts a modal in front of every
  // single creation, which is a heavy price for a question whose answer is
  // almost always the obvious one. Chips answer it in advance, in the open, and
  // cost a tap only when the answer is wrong.
  //
  // `chosen` is null until someone touches a chip, and only then does it beat
  // the default — so opening the form after changing the pastille follows the
  // pastille rather than a stale choice.
  newGroupChoice: { touched: false, id: null },
  // The event a new thing is made for, if any: the id of its poll. Picked on
  // the form, or already set when « Ajouter » was pressed on the event.
  newEventLink: null,
  // The deal being entered on the Tarot screen.
  deal: null,
};

/* ------------------------------------------------------------- utilities --- */

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]),
  );
}

/** Read a score input: '' means "not filled in" (null), otherwise a number. */
export function parseScore(raw) {
  const value = String(raw ?? '').trim().replace(',', '.');
  if (value === '') return null;
  const number = Number(value);
  return Number.isNaN(number) ? NaN : number;
}

export function parseIntOrNull(raw) {
  const value = String(raw ?? '').trim();
  if (value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

export function presetLabel(preset) {
  return preset.labelKey ? t(preset.labelKey) : preset.name;
}

export function gameTitle(game) {
  if (game.name) return game.name;
  const preset = getPreset(game.presetId);
  return preset ? presetLabel(preset) : t('new.customLabel');
}

/** The title of a game or of a list, whichever this is. */
export function documentTitle(document_) {
  if (isValidList(document_)) return listTitle(document_);
  if (isValidPoll(document_)) return pollTitle(document_);
  if (isValidBoard(document_)) return boardTitle(document_);
  if (isValidSpend(document_)) return spendTitle(document_);
  return gameTitle(document_);
}

/** Where a document's page is, whatever its kind. */
export function documentHref(document_) {
  const page = { list: 'list', poll: 'poll', spend: 'spend', board: 'idea', game: 'game' }[kindOf(document_)] || 'game';
  return `#/${page}/${document_.id}`;
}

/** Every document this device holds, of every kind. */
export function everything() {
  return allDocuments(state);
}

/** What a document hangs from, up to its event: the farthest first. */
export function chainOf(document_) {
  return ancestorsOf(document_, everything());
}

/** A link in the chain, as it reads: an event says its day. */
export function chainLabel(document_) {
  const title = isEventDoc(document_) ? eventName(document_) || pollTitle(document_) : documentTitle(document_);
  return isEventDoc(document_) && document_.date ? t('event.named', { name: title, day: formatDay(document_.date) }) : title;
}

/**
 * A day written `AAAA-MM-JJ`, shown the way the reader's language shows days.
 * Built field by field rather than handed to Date(), which reads that form as
 * UTC midnight and so shows the day before, west of Greenwich.
 */
export function formatDay(day) {
  const [year, month, date] = String(day || '').split('-').map(Number);
  if (!year || !month || !date) return String(day || '');
  try {
    return new Date(year, month - 1, date).toLocaleDateString(getLanguage(), {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return String(day);
  }
}

/**
 * When an event is: its day — or its first and last, when it runs over
 * several — and its hour. `long` adds the weekday, as an agenda wants it.
 */
export function whenText(poll, { long = false } = {}) {
  const show = long ? formatDayLong : formatDay;
  const days = poll.until && poll.until > poll.date
    ? t('events.range', { from: show(poll.date), to: show(poll.until) })
    : show(poll.date);
  return [days, poll.at].filter(Boolean).join(' · ');
}

/**
 * A day in an agenda: the weekday matters as much as the number, since "jeudi"
 * is how anyone actually holds a date in their head.
 */
export function formatDayLong(day) {
  const [year, month, date] = String(day || '').split('-').map(Number);
  if (!year || !month || !date) return String(day || '');
  try {
    return new Date(year, month - 1, date).toLocaleDateString(getLanguage(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return formatDay(day);
  }
}

export function formatDate(timestamp) {
  try {
    return new Date(timestamp).toLocaleDateString(getLanguage(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/** The app's own address, with no game attached to it. */
export function appLink() {
  const { origin, pathname, search } = location;
  return `${origin}${pathname}${search}`;
}

export function flash(message, kind = 'info') {
  state.flash = { message, kind, shownAt: null };
}

/**
 * How long a message stays on screen once it has been read.
 *
 * Long enough to survive what follows it: something is answered, the app asks
 * the database what the answer changed, and redraws when it knows. A message
 * consumed by the first of those two redraws would flash and vanish. Going
 * somewhere else, on the other hand, ends it — a line about a group accepted is
 * nothing to a screen of games.
 */
const FLASH_KEPT = 4000;

/* ------------------------------------------------------------- persisting --- */

/* ----------------------------------------------------------------- router --- */

export function route() {
  return routeOf(location.hash);
}

/** What an address opens, without going there. */
function routeOf(address) {
  // A form may come filled in: `#/lists/new?titre=…`. See prefill.js.
  const hash = withoutPrefill(address).replace(/^#\/?/, '');
  const [name, param] = hash.split('/');
  if (name === 'games') return { name: 'home' };
  // An invitation link carries both the six digits and the group's name, so
  // the person who receives it has nothing to read out and nothing to type.
  // A return link: a person's own token, which hands this browser a key.
  if (name === 'back' && param) return { name: 'back', token: backTokenFrom(address) };
  if (name === 'join' && param) {
    const invitation = joinFrom(address);
    if (invitation) return { name: 'join', code: invitation.code, group: invitation.name };
    // Half a link is still half a link: whichever of the two survived is kept,
    // and the page asks for the other rather than for both.
    return { name: 'join', code: readCode(param), group: groupSegment(hash) };
  }
  // Someone's own page, reached from the overview. Both spellings open it: the
  // app speaks two languages, and a link once sent is a link for ever.
  if ((name === 'person' || name === 'personne') && param) {
    return { name: 'person', who: personFrom(param) };
  }
  // One group, everything in it: #/group/<id>, from the overview.
  if (name === 'group' && param) return { name: 'group', id: decodeSegment(param) };
  if (name === 'groups') return { name: 'groups' };
  if (name === 'settings' || name === 'reglages') return { name: 'settings' };
  if (name === 'privacy' || name === 'confidentialite') return { name: 'privacy' };
  if (name === 'new') return { name: 'new' };
  if (name === 'stats') return { name: 'stats' };
  if (name === 'game' && param) return { name: 'game', id: param };
  if (name === 'set' && param) return { name: 'set', id: param };
  if (name === 'lists' && param === 'new') return { name: 'new-list' };
  if (name === 'lists') return { name: 'lists' };
  if (name === 'list' && param) return { name: 'list', id: param };
  if (name === 'spends' && param === 'new') return { name: 'new-spend' };
  if (name === 'spends') return { name: 'spends' };
  if (name === 'agenda' && param === 'new') return { name: 'new-event' };
  if (name === 'agenda') return { name: 'agenda' };
  if (name === 'spend' && param) return { name: 'spend', id: param };
  if (name === 'ideas' && param === 'new') return { name: 'new-board' };
  if (name === 'ideas') return { name: 'ideas' };
  if (name === 'idea' && param) return { name: 'board', id: param };
  if (name === 'polls' && param === 'new') return { name: 'new-poll' };
  if (name === 'polls') return { name: 'polls' };
  // A shared link opens the poll alone: `#/poll/<id>/solo`. See pollView().
  if (name === 'poll' && param) return { name: 'poll', id: param, solo: hash.split('/')[2] === 'solo' };
  return { name: 'overview' };
}

/**
 * Where a poll is listed, so its page goes back there: the agenda for a day
 * that is settled or still being looked for, the home page's polls otherwise.
 */
export function pollHome(poll) {
  return isEvent(poll) || poll.date || (!poll.closedAt && seeksDay(poll)) ? '#/agenda' : '#/polls';
}

/** A segment of the address, decoded if it can be. */
function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** The name written in `#/person/<name>`, decoded if it can be. */
function personFrom(segment) {
  try {
    return decodeURIComponent(segment).trim();
  } catch {
    return String(segment).trim();
  }
}

/** The group's name as written in `#/join/<code>/<name>`, decoded if it can be. */
function groupSegment(hash) {
  const segment = hash.split('/')[2] || '';
  try {
    return decodeURIComponent(segment).trim();
  } catch {
    return segment.trim();
  }
}

export function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

/** The address of the screen on show, spelled one way. */
function hereHash() {
  return location.hash && location.hash !== '#' ? location.hash : '#/';
}

/**
 * Note the screen just reached. Reaching the one before is going back: it is
 * taken off, so "Back" never bounces between two screens. Any other screen goes
 * on top, and leaves the place it had lower down.
 */
function followTrail() {
  const here = hereHash();
  const trail = state.trail;
  if (trail[trail.length - 1] === here) return;
  if (trail[trail.length - 2] === here) state.trail = trail.slice(0, -1);
  else state.trail = [...trail.filter((hash) => hash !== here), here].slice(-50);
}

/**
 * Where "Back" goes: the screen one came from — the group's page for a list
 * opened there, the person's for a poll opened from it — and the usual place
 * when there is none (a link just opened). A form already filled in is not
 * somewhere to go back to.
 */
function backTarget(fallback) {
  const here = hereHash();
  for (let index = state.trail.length - 1; index >= 0; index -= 1) {
    const hash = state.trail[index];
    if (hash === here || /^#\/(lists|polls|spends|agenda|ideas)\/new$|^#\/new$/.test(hash)) continue;
    return hash;
  }
  return fallback;
}

/* ------------------------------------------------------------------ views --- */

export function flashHtml() {
  if (!state.flash) return '';
  const { message, kind, shownAt } = state.flash;
  // Shown for the first time: the clock starts here rather than when the message
  // was raised, so one that had to wait — for a screen where someone was typing,
  // say — is still read rather than silently dropped.
  if (!shownAt) {
    state.flash = { ...state.flash, shownAt: Date.now() };
  } else if (Date.now() - shownAt > FLASH_KEPT) {
    state.flash = null;
    return '';
  }
  return `<p class="banner ${kind === 'error' ? 'banner--warn' : ''}">${escapeHtml(message)}</p>`;
}

/**
 * The group pastilles, shown above the lists, the polls and the games.
 *
 * From two groups on: with one, there is nothing to choose between, and a row
 * of buttons that can only say "everything" is noise. The line under them is
 * the same count the overview shows, for whatever is on screen.
 */
export function groupChipsHtml() {
  const held = groupsByName();
  const everything = [...state.lists, ...state.polls, ...state.games, ...state.spends, ...state.boards];
  const outside = everything.some(outsideGroups);
  // With one group and nothing outside it, there is nothing to choose between.
  if (!held.length || (held.length < 2 && !outside)) return '';
  const active = groupFilter();
  const counted = active === OUTSIDE_GROUPS
    ? groupCounts({
        lists: shownDocs(state.lists), polls: shownDocs(state.polls),
        games: shownDocs(state.games), spends: shownDocs(state.spends), boards: shownDocs(state.boards),
      })
    : groupCounts(state, active);
  const chip = (id, label) => `
    <button type="button" class="chip ${active === id ? 'chip--on' : ''}"
            data-group-filter="${escapeHtml(id)}" aria-pressed="${active === id ? 'true' : 'false'}">
      ${escapeHtml(label)}
    </button>`;
  return `
    <div class="row" role="group" aria-label="${escapeHtml(t('filter.by'))}">
      ${chip('', t('filter.all'))}
      ${held.map((group) => chip(group.id, group.name)).join('')}
      ${outside || active === OUTSIDE_GROUPS ? chip(OUTSIDE_GROUPS, t('filter.others')) : ''}
    </div>
    <p class="muted small">${escapeHtml(countsText(counted))}</p>`;
}

/**
 * What is going on, kind by kind, in the order of the tabs — leaving out the
 * kinds with nothing: « 1 liste · 2 parties », not five numbers, three of
 * them nought.
 */
export function countsText(counts) {
  const said = ['lists', 'polls', 'games', 'spends', 'boards']
    .filter((kind) => counts[kind])
    .map((kind) => t(`count.${kind}`, { count: counts[kind] }));
  return said.length ? said.join(' · ') : t('count.none');
}

export function gameCardHtml(game) {
  const status = gameStatus(game);
  const names = status.finished
    ? status.winners.map((row) => row.name)
    : status.leaders.map((row) => row.name);
  let line = '';
  if (game.rounds.length && names.length) {
    const key = status.finished
      ? names.length > 1 ? 'home.winners' : 'home.winner'
      : 'home.leader';
    line = t(key, { name: names.join(', ') });
  }
  return `
    <button type="button" class="game-card" data-goto="#/game/${escapeHtml(game.id)}">
      <span class="game-card__title">
        ${escapeHtml(gameTitle(game))}
        <span class="pill ${status.finished ? 'pill--done' : ''}">
          ${status.finished ? escapeHtml(t('game.finished')) : escapeHtml(t('home.rounds', { count: game.rounds.length }))}
        </span>
      </span>
      <span class="game-card__meta">${escapeHtml(game.players.map((p) => p.name).join(' · '))}</span>
      <span class="game-card__meta">${escapeHtml(formatDate(game.updatedAt))}${line ? ` — ${escapeHtml(line)}` : ''}</span>
      ${eventTagHtml(game)}
    </button>`;
}

/** « · Pour Raclette › Courses » after a line about something attached. */
export function forEventText(document_) {
  const chain = document_ ? chainOf(document_) : [];
  return chain.length ? ` · ${t('event.tagUndated', { name: chain.map(chainLabelShort).join(' › ') })}` : '';
}
/** A document's card, whatever its kind. */
export function documentCardHtml(document_) {
  const kind = kindOf(document_);
  if (kind === 'list') return listCardHtml(document_);
  if (kind === 'poll') return isEventDoc(document_) ? eventCardHtml(document_) : pollCardHtml(document_);
  if (kind === 'spend') return spendCardHtml(document_);
  if (kind === 'board') return boardCardHtml(document_);
  return gameCardHtml(document_);
}
/**
 * On a document's page, what is attached to it — a poll under a list, a board
 * under that poll — and the way to bring more. An event has its own section,
 * which holds its whole chain.
 */
export function attachedHtml(document_) {
  const children = childrenOf(document_, everything()).filter(isLive);
  if (!children.length) return '';
  return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('chain.here'))}</h2></div>
      <div class="game-list">${children.map(documentCardHtml).join('')}</div>
    </section>`;
}
/** The buttons of « Plus d'actions » for the chain and the links: attach, detach, link. */
export function chainButtonsHtml(document_) {
  // An event goes under another event only, as one of its activities; one
  // with activities of its own stays on top.
  const all = everything();
  const attach = isEventDoc(document_) && !attachTargets(document_, all).length && !parentId(document_)
    ? ''
    : `<button type="button" class="button button--small button--ghost" data-attach-doc="${escapeHtml(document_.id)}">${escapeHtml(t(isEventDoc(document_) ? 'activity.attach' : 'chain.attach'))}</button>`;
  return `${attach}<button type="button" class="button button--small button--ghost" data-relate-doc="${escapeHtml(document_.id)}">${escapeHtml(t('relate.button'))}</button>`;
}
/** A link in the chain, in a line of text: its title alone. */
export function chainLabelShort(document_) {
  return isEventDoc(document_) ? eventName(document_) || pollTitle(document_) : documentTitle(document_);
}
/**
 * Which kind of thing Home shows: everything at once, or one kind in full.
 *
 * The kinds used to be tabs of their own; they are one row of the home page
 * now, so the tab bar can answer other questions — when, with whom — and each
 * kind keeps its own address, so a link once sent still opens it.
 */
export function kindsHtml(active) {
  const kind = (id, goto, label) => `
    <button type="button" class="segmented__option" data-goto="${goto}"
            aria-current="${active === id ? 'true' : 'false'}">${escapeHtml(label)}</button>`;
  return `
    <nav class="segmented segmented--kinds" aria-label="${escapeHtml(t('home.kinds'))}">
      ${kind('overview', '#/', t('tab.all'))}
      ${kind('lists', '#/lists', t('tab.lists'))}
      ${kind('polls', '#/polls', t('tab.polls'))}
      ${kind('games', '#/games', t('tab.games'))}
      ${kind('spends', '#/spends', t('tab.spends'))}
      ${kind('ideas', '#/ideas', t('tab.ideas'))}
    </nav>`;
}
/**
 * Ask for one line of text, the same way the app asks anything else: a dialog
 * that removes itself, Escape answering null.
 */
export function askForText({ title, hint, value = '', confirmLabel }) {
  return new Promise((resolve) => {
    const dialog = makeDialog('dialog dialog--ask');
    dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(title)}</h2>
        <p class="muted small">${escapeHtml(hint)}</p>
        <input type="text" id="asked-text" value="${escapeHtml(value)}" maxlength="40" />
        <div class="row">
          <button type="button" class="button button--primary" id="asked-ok">${escapeHtml(confirmLabel)}</button>
          <button type="button" class="button" id="asked-cancel">${escapeHtml(t('action.cancel'))}</button>
        </div>
      </div>`;

    let answered = false;
    const done = (answer) => {
      if (answered) return;
      answered = true;
      resolve(answer);
      dialog.close();
    };
    dialog.addEventListener('close', () => done(null));
    dialog.querySelector('#asked-cancel').addEventListener('click', () => done(null));
    dialog.querySelector('#asked-ok').addEventListener('click', () => done(dialog.querySelector('#asked-text').value));
    dialog.querySelector('#asked-text').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') done(dialog.querySelector('#asked-text').value);
    });
    dialog.showModal();
    dialog.querySelector('#asked-text').select();
  });
}

function homeView() {
  const query = (state.search || '').trim().toLowerCase();
  const matches = (game) => {
    if (!query) return true;
    const preset = getPreset(game.presetId);
    const haystack = [gameTitle(game), preset ? presetLabel(preset) : '', ...game.players.map((p) => p.name)]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  };

  const mine = shownDocs(state.games);
  const sorted = [...mine].sort((a, b) => b.updatedAt - a.updatedAt).filter(matches);
  const live = sorted.filter(isLive);
  const ongoing = live.filter((game) => !gameStatus(game).finished);
  const finished = live.filter((game) => gameStatus(game).finished);

  return `
    ${flashHtml()}
    ${kindsHtml('games')}
    <button type="button" class="button button--primary button--block" data-goto="#/new">
      + ${escapeHtml(t('action.newGame'))}
    </button>
    ${groupChipsHtml()}
    ${
      mine.length
        ? `<div class="row">
             <button type="button" class="button button--small button--ghost" data-goto="#/stats">${escapeHtml(t('action.stats'))}</button>
           </div>`
        : ''
    }

    ${
      mine.length > 4
        ? `<label class="visually-hidden" for="search">${escapeHtml(t('home.search'))}</label>
           <input type="text" id="search" placeholder="${escapeHtml(t('home.search'))}" value="${escapeHtml(state.search || '')}" />`
        : ''
    }

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('kinds.ongoing'))}</h2></div>
      ${
        ongoing.length
          ? `<div class="game-list">${ongoing.map(swipeable(gameCardHtml)).join('')}</div>`
          : `<p class="muted small">${escapeHtml(t('home.empty'))}</p>`
      }
      ${hiddenByGroupHtml(state.games)}
    </section>

    ${
      finished.length
        ? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('home.finished'))}</h2></div>
             <div class="game-list">${finished.map(swipeable(gameCardHtml)).join('')}</div>
           </section>`
        : ''
    }

    ${archivedHtml(sorted, swipeable(gameCardHtml))}`;
}

/* ---------------------------------------------------------------- chrome --- */

function applyStaticText() {
  document.documentElement.lang = getLanguage();
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((node) => {
    const label = t(node.dataset.i18nTitle);
    node.title = label;
    node.setAttribute('aria-label', label);
  });
}

function bindChrome() {
  document.getElementById('create')?.addEventListener('click', openCreateMenu);
  // Night or light, from any page; the settings say the same, so on that page
  // they are drawn again to show it. See view-look.js for the rest.
  document.getElementById('theme-toggle').addEventListener('click', () => {
    state.prefs = { ...state.prefs, theme: lookIsDark() ? 'light' : 'dark' };
    savePrefs(state.prefs);
    applyLook();
    if (route().name === 'settings') render();
  });

  // One button for "bring me what the others have done", on every screen: the
  // tabs each show their own list, and a list is not refreshed by looking at it.
  document.getElementById('sync').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    button.classList.add('icon-button--busy');
    let taken = 0;
    let failed = false;
    try {
      taken = await catchUpAll();
      if (showsGate()) await refreshGate();
    } catch {
      failed = true;
    }
    button.disabled = false;
    button.classList.remove('icon-button--busy');
    flash(failed ? t('sync.failed') : taken ? t('sync.done', { count: taken }) : t('sync.nothing'),
      failed ? 'error' : 'info');
    render();
  });

  document.getElementById('lang-toggle').addEventListener('click', () => {
    const next = getLanguage() === 'fr' ? 'en' : 'fr';
    setLanguage(next);
    state.prefs = { ...state.prefs, lang: next };
    savePrefs(state.prefs);
    applyStaticText();
    render();
  });
}

/* ----------------------------------------------------------------- render --- */

/**
 * Where each marked box was scrolled to, taken just before a redraw.
 *
 * A redraw replaces the whole view, and a box that scrolls sideways — the poll
 * grid with a dozen people across it — comes back at its left edge. Tapping
 * Léa's cell at the far right then threw the grid back to Gui's, every single
 * time. Boxes that should hold their place carry data-keep-scroll, keyed by
 * what they show; a redraw of the same thing puts them back where they were.
 */
function keptScrolls() {
  const kept = new Map();
  view.querySelectorAll('[data-keep-scroll]').forEach((box) => {
    kept.set(box.dataset.keepScroll, { left: box.scrollLeft, top: box.scrollTop });
  });
  return kept;
}

function restoreScrolls(kept) {
  view.querySelectorAll('[data-keep-scroll]').forEach((box) => {
    const was = kept.get(box.dataset.keepScroll);
    if (!was) return;
    box.scrollLeft = was.left;
    box.scrollTop = was.top;
  });
}

/**
 * The page reduced to one poll, for whoever opened a shared link.
 *
 * Someone who got the link in a Messenger chat came to tick their evenings,
 * not to find an app: the tabs, the overview, the button that makes a new list
 * were all doors into rooms that are none of theirs — empty rooms, since their
 * device holds nothing else, but doors all the same. Here there are none. The
 * tabs go, the name at the top stops being a link, and the poll page keeps
 * only what a guest does with it.
 *
 * It is a way of showing, not a lock: the data was already walled off by the
 * database, which lists nothing of a group without its key. Someone who edits
 * the address by hand reaches the app — their own, empty one.
 */
function setSolo(on) {
  document.body.classList.toggle('solo', on);
  // Hidden outright, not only by the stylesheet: out of reach of a tap, of the
  // keyboard and of a screen reader alike, whatever the styles do.
  const tabs = document.getElementById('tabs');
  if (tabs) tabs.hidden = on;
  const brand = document.querySelector('.app-bar__brand');
  if (!brand) return;
  if (on) {
    brand.removeAttribute('href');
    brand.setAttribute('aria-disabled', 'true');
  } else {
    brand.setAttribute('href', '#/');
    brand.removeAttribute('aria-disabled');
  }
}

/**
 * A poll that is not there: back to the list — or, for a guest, a sentence and
 * nothing else. Out of reach is not gone: the guest is asked to try again.
 */
function leavePoll(current, { unreachable = false } = {}) {
  if (!current.solo) {
    if (unreachable) flash(t('polls.unreachable'), 'error');
    navigate('#/polls');
    return;
  }
  if (!unreachable) {
    view.innerHTML = `<p class="lead">${escapeHtml(t('polls.soloGone'))}</p>`;
    return;
  }
  view.innerHTML = `
    <p class="lead">${escapeHtml(t('polls.unreachable'))}</p>
    <button type="button" class="button" id="poll-retry">${escapeHtml(t('polls.retry'))}</button>`;
  view.querySelector('#poll-retry').addEventListener('click', () => render());
}

/**
 * Put what a form's address fills in into that form's draft, once: the address
 * then loses it, so going back or reloading keeps what the person changed.
 */
function takePrefill(current) {
  const fill = prefillOf(location.hash);
  if (!fill) return;
  history.replaceState(null, '', `${location.pathname}${location.search}${withoutPrefill(location.hash)}`);
  const people = fill.people ? [...fill.people, ...(fill.people.length < 2 ? [''] : [])] : null;
  const lines = (list) => (list || []).join('\n');
  if (current.name === 'new-list') {
    if (fill.title) state.newListName = fill.title;
    if (fill.lines) state.newListLines = lines(fill.lines);
    if (people) state.newListPeople = people;
  } else if (current.name === 'new-poll') {
    if (fill.question || fill.title) state.newPollQuestion = fill.question || fill.title;
    if (fill.choices) state.newPollChoices = lines(fill.choices);
    if (people) state.newPollPeople = people;
  } else if (current.name === 'new-spend') {
    if (fill.title) state.newSpendName = fill.title;
    if (CURRENCIES.includes(fill.currency)) state.newSpendCurrency = fill.currency;
    if (people) state.newSpendPeople = people;
  } else if (current.name === 'new-event') {
    if (fill.title) state.newEventName = fill.title;
    if (fill.day) state.newEventDay = fill.day;
    if (fill.hour) state.newEventHour = fill.hour;
    if (fill.until) state.newEventUntil = fill.until;
    if (people) state.newEventPeople = people;
  }
}

export function render() {
  const current = route();
  takePrefill(current);
  markTab(current);
  setSolo(Boolean(current.solo));
  const kept = keptScrolls();
  // Nothing to fetch without a database, or before this device is in a group.
  const sync = document.getElementById('sync');
  if (sync) sync.hidden = !(state.remote && groups().length);
  if (current.name === 'lists') {
    stopWatching();
    view.innerHTML = listsView();
    bindDocSwipes();
  } else if (current.name === 'new-list') {
    stopWatching();
    view.innerHTML = newListView();
    bindNewList();
  } else if (current.name === 'list') {
    const list = getList(current.id);
    if (!list) {
      stopWatching();
      // Perhaps a list someone shared: ask the database before giving up.
      if (state.remote) {
        view.innerHTML = `<p class="muted small">${escapeHtml(t('lists.loading'))}</p>`;
        // A redraw while it is on its way must not ask for it twice.
        if (state.openingList !== current.id) {
          const asked = current.id;
          state.openingList = asked;
          pullList(asked).then((found) => {
            if (state.openingList !== asked) return;
            state.openingList = null;
            if (found) render();
            else if (route().id === asked) navigate('#/lists');
          });
        }
        return;
      }
      navigate('#/lists');
      return;
    }
    watchList(list.id);
    view.innerHTML = listView(list);
    bindList(list);
  } else if (current.name === 'agenda') {
    stopWatching();
    view.innerHTML = agendaView();
    bindDocSwipes();
  } else if (current.name === 'new-event') {
    stopWatching();
    view.innerHTML = newEventView();
    bindNewEvent();
  } else if (current.name === 'new-spend') {
    stopWatching();
    view.innerHTML = newSpendView();
    bindNewSpend();
  } else if (current.name === 'spend') {
    const spend = getSpend(current.id);
    if (!spend) {
      stopWatching();
      // Peut-être un compte que quelqu'un partage : demander avant d'abandonner.
      if (state.remote) {
        view.innerHTML = `<p class="muted small">${escapeHtml(t('spends.loading'))}</p>`;
        if (state.openingSpend !== current.id) {
          const asked = current.id;
          state.openingSpend = asked;
          pullSpend(asked).then((found) => {
            if (state.openingSpend !== asked) return;
            state.openingSpend = null;
            if (found) render();
            else if (route().id === asked) navigate('#/spends');
          });
        }
        return;
      }
      navigate('#/spends');
      return;
    }
    watchSpend(spend.id);
    view.innerHTML = spendView(spend);
    bindSpend(spend);
  } else if (current.name === 'ideas') {
    stopWatching();
    view.innerHTML = ideasView();
    bindDocSwipes();
  } else if (current.name === 'new-board') {
    stopWatching();
    view.innerHTML = newBoardView();
    bindNewBoard();
  } else if (current.name === 'board') {
    const board = getBoard(current.id);
    if (!board) {
      stopWatching();
      // Perhaps a board someone shares: ask before giving up.
      if (state.remote) {
        view.innerHTML = `<p class="muted small">${escapeHtml(t('ideas.loading'))}</p>`;
        if (state.openingBoard !== current.id) {
          const asked = current.id;
          state.openingBoard = asked;
          pullBoard(asked).then((found) => {
            if (state.openingBoard !== asked) return;
            state.openingBoard = null;
            if (found) render();
            else if (route().id === asked) navigate('#/ideas');
          });
        }
        return;
      }
      navigate('#/ideas');
      return;
    }
    watchBoard(board.id);
    view.innerHTML = boardView(board);
    bindBoard(board);
  } else if (current.name === 'polls') {
    stopWatching();
    view.innerHTML = pollsView();
    bindDocSwipes();
  } else if (current.name === 'new-poll') {
    stopWatching();
    view.innerHTML = newPollView();
    bindNewPoll();
  } else if (current.name === 'poll') {
    const poll = getPoll(current.id);
    if (!poll) {
      stopWatching();
      if (state.remote) {
        view.innerHTML = `<p class="muted small">${escapeHtml(t('polls.loading'))}</p>`;
        if (state.openingPoll !== current.id) {
          const asked = current.id;
          state.openingPoll = asked;
          pullPoll(asked).then((found) => {
            if (state.openingPoll !== asked) return;
            state.openingPoll = null;
            if (found) render();
            else if (route().id === asked) leavePoll(current, { unreachable: found === null });
          });
        }
        return;
      }
      leavePoll(current);
      return;
    }
    watchPoll(poll.id);
    view.innerHTML = pollView(poll, { solo: current.solo });
    bindPoll(poll);
  } else if (current.name === 'stats') {
    stopWatching();
    view.innerHTML = statsView();
  } else if (current.name === 'new') {
    stopWatching();
    view.innerHTML = newGameView();
    bindNewGame();
  } else if (current.name === 'set') {
    stopWatching();
    view.innerHTML = `<p class="muted small">${escapeHtml(t('shareSet.loading'))}</p>`;
    // A redraw while the games are on their way must not fetch them twice.
    if (state.openingSet !== current.id) {
      const asked = current.id;
      state.openingSet = asked;
      openSet(asked).then(() => {
        // Another lot may have been asked for meanwhile: that one is now the
        // one in flight, and neither its guard nor its view is ours to clear.
        if (state.openingSet !== asked) return;
        state.openingSet = null;
        // Somewhere else by now: leave them there, the games are in the list.
        if (route().name === 'set') navigate('#/');
      });
    }
    return;
  } else if (current.name === 'game') {
    const game = getGame(current.id);
    if (!game) {
      // Perhaps it is a game someone shared: ask the database before giving up.
      if (state.remote) {
        view.innerHTML = `<p class="muted small">${escapeHtml(t('share.loading'))}</p>`;
        pullGame(current.id).then((found) => {
          if (found) render();
          else if (route().id === current.id) navigate('#/games');
        });
        return;
      }
      navigate('#/games');
      return;
    }
    watchGame(game.id);
    if (state.editingRoundId && !game.rounds.some((round) => round.id === state.editingRoundId)) {
      state.editingRoundId = null;
    }
    view.innerHTML = gameView(game);
    bindGame(game);
  } else if (current.name === 'person') {
    stopWatching();
    view.innerHTML = personView(current.who);
  } else if (current.name === 'group') {
    stopWatching();
    const group = groups().find((held) => held.id === current.id);
    if (!group) {
      navigate('#/groups');
      return;
    }
    // Looking at a group sets nothing for the rest of the app: it used to set
    // the filter, which then quietly sent everything the "+" made afterwards,
    // from anywhere, into this group. The "+" opened here proposes it instead.
    view.innerHTML = groupView(group);
  } else if (current.name === 'back') {
    stopWatching();
    view.innerHTML = backView(current.token);
    bindBack(current.token);
  } else if (current.name === 'join') {
    view.innerHTML = joinView(current);
    bindJoin();
    bindInstall();
    if (pendingFor(current.group)) watchPending();
    else stopWatching();
  } else if (current.name === 'home') {
    stopWatching();
    view.innerHTML = homeView();
    bindHome();
    bindDocSwipes();
  } else if (current.name === 'spends') {
    stopWatching();
    view.innerHTML = spendsView();
    bindDocSwipes();
  } else if (current.name === 'privacy') {
    stopWatching();
    view.innerHTML = privacyView();
    bindOverview();
  } else if (current.name === 'settings') {
    stopWatching();
    view.innerHTML = settingsView();
    bindOverview();
    bindAccount();
    bindLook(view);
  } else if (current.name === 'groups') {
    view.innerHTML = groupsView();
    bindOverview();
    if (state.remote && groups().some((group) => group.admits !== false)) watchGate();
    else stopWatching();
  } else {
    view.innerHTML = overviewView();
    bindOverview();
    bindHolo();
    if (state.remote && groups().some((group) => group.admits !== false)) watchGate();
    else stopWatching();
  }

  view.querySelectorAll('[data-goto]').forEach((node) => {
    node.addEventListener('click', () => navigate('back' in node.dataset ? backTarget(node.dataset.goto) : node.dataset.goto));
  });
  view.querySelectorAll('[data-create-menu]').forEach((node) => {
    node.addEventListener('click', openCreateMenu);
  });
  bindEventChips(view);
  bindFlows(view);
  bindInstall(view);
  view.querySelectorAll('[data-attach-doc]').forEach((node) => {
    node.addEventListener('click', () => {
      const document_ = everything().find((one) => one.id === node.dataset.attachDoc);
      if (document_) openAttachDialog(document_);
    });
  });
  view.querySelectorAll('[data-relate-doc]').forEach((node) => {
    node.addEventListener('click', () => {
      const document_ = everything().find((one) => one.id === node.dataset.relateDoc);
      if (document_) openRelateDialog(document_);
    });
  });
  view.querySelectorAll('[data-gather-doc]').forEach((node) => {
    node.addEventListener('click', () => {
      const document_ = everything().find((one) => one.id === node.dataset.gatherDoc);
      if (document_) openGatherDialog(document_);
    });
  });

  // The group pastilles, and the overview's numbers — which pick a group and
  // open its tab in one tap, so the filter is set before the page changes.
  view.querySelectorAll('[data-group-filter]').forEach((node) => {
    node.addEventListener('click', () => {
      setGroupFilter(node.dataset.groupFilter);
      render();
    });
  });
  view.querySelectorAll('[data-put-in-group]').forEach((node) => {
    node.addEventListener('click', () => {
      node.disabled = true;
      void putInGroup(node.dataset.putInGroup);
    });
  });

  view.querySelectorAll('[data-copy-to-group]').forEach((node) => {
    node.addEventListener('click', () => {
      node.disabled = true;
      void copyToGroup(node.dataset.copyToGroup);
    });
  });

  view.querySelectorAll('[data-group-tile]').forEach((node) => {
    node.addEventListener('click', () => {
      setGroupFilter(node.dataset.groupTile);
      navigate(node.dataset.tileGoto);
    });
  });

  // Offered from the statistics, where two spellings show as two lines, and
  // from a person's own page, which is the other place a name is looked at.
  view.querySelectorAll('[data-rename-everywhere]').forEach((button) => {
    button.addEventListener('click', () => renameEverywhere(button.dataset.renameEverywhere));
  });

  restoreScrolls(kept);
}

/**
 * Pull one game from the shared database and take it if it is newer than what
 * this browser holds — which is how a link to a game opens that game for
 * someone who has never seen it.
 */
export async function pullGame(id) {
  if (!state.remote) return false;
  let stored = null;
  try {
    stored = await state.remote.get(id);
  } catch {
    return false;
  }
  if (stored === null) return whenAbsent(id);
  return isValidGame(stored) ? adoptGame(stored) : false;
}

/**
 * Take in a game the database handed over. Merge rather than replace: two
 * people scoring the same evening on two phones would otherwise lose whichever
 * round was written second.
 */
export function adoptGame(stored) {
  const local = getGame(stored.id);
  const merged = local ? mergeGames(local, stored) : stored;
  if (local && merged === local) return false;

  const adopted = { ...merged, shared: true };
  state.games = local
    ? state.games.map((game) => (game.id === stored.id ? adopted : game))
    : [...state.games, adopted];
  saveGames(state.games);
  return true;
}

/** Which part of the app we are in, so the tab bar says so. */
function markTab(current) {
  const bar = document.getElementById('tabs');
  if (!bar) return;
  const tabOf = (at) => {
    if (['agenda', 'new-event'].includes(at.name)) return 'agenda';
    if (['groups', 'group', 'person', 'join', 'back'].includes(at.name)) return 'groups';
    if (at.name === 'settings') return 'settings';
    return 'home';
  };
  // A document's page stays under the tab it was opened from: a poll opened
  // from Home does not light up Agenda. Opened from a link, it goes where it
  // is listed.
  const document_ = ['list', 'poll', 'spend', 'board', 'game', 'person'].includes(current.name);
  const from = document_ ? backTarget(null) : null;
  const poll = current.name === 'poll' ? getPoll(current.id) : null;
  const here = from
    ? tabOf(routeOf(from))
    : poll && pollHome(poll) === '#/agenda'
      ? 'agenda'
      : tabOf(current);
  bar.querySelectorAll('[data-tab]').forEach((tab) => {
    if (tab.dataset.tab === here) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
}

/**
 * Fetch by identifier without being told what it is: a lot holds games and
 * lists side by side, and a link pasted in says even less.
 */
export async function pullAny(id) {
  if (!state.remote) return false;
  let stored = null;
  try {
    stored = await state.remote.get(id);
  } catch {
    return false;
  }
  // One request, then whichever kind it turns out to be — a lot of twenty
  // would otherwise cost forty.
  if (isValidGame(stored)) return adoptGame(stored);
  if (isValidList(stored)) return adoptList(stored);
  if (isValidPoll(stored)) return adoptPoll(stored);
  if (isValidSpend(stored)) return adoptSpend(stored);
  if (isValidBoard(stored)) return adoptBoard(stored);
  if (stored === null) return whenAbsent(id);
  return false;
}

/** While a shared list is on screen, watch for what the others are ticking. */
function watchList(id) {
  stopWatching();
  if (!state.remote) return;
  state.poll = setInterval(async () => {
    if (isBusy() || isHidden()) return;
    if (await pullList(id)) render();
  }, 5000);
}

/** While a game is on screen, watch for rounds someone else has entered. */
function watchGame(id) {
  stopWatching();
  if (!state.remote) return;
  state.poll = setInterval(async () => {
    if (isBusy() || isHidden()) return; // never redraw under someone's fingers
    if (await pullGame(id)) render();
  }, 5000);
}

export function stopWatching() {
  if (state.poll) clearInterval(state.poll);
  state.poll = null;
  // The same timer serves lists and games: forget whose it was.
  state.pollWatched = null;
}

/** A list's identity for comparison: which games, and how recently each changed. */
export function signature(games) {
  return games
    .map((game) => `${game.id}:${game.updatedAt}`)
    .sort()
    .join('|');
}

/**
 * The app is in the background: nobody is looking, so the watchers ask the
 * base nothing until it comes back (a document is caught up at once then).
 */
export function isHidden() {
  return document.visibilityState === 'hidden';
}

/** Someone is typing, or a dialog is open: a bad moment to redraw the view. */
export function isBusy() {
  if (document.querySelector('dialog[open]')) return true;
  const active = document.activeElement;
  return Boolean(
    active && active.closest?.('#view') && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName),
  );
}

/**
 * Ask the host for a document store. It answers late or not at all, so the
 * app is already running by the time this resolves.
 */
/**
 * Games created before sharing became deliberate were all being sent up, so
 * they are already in the database: keep them that way rather than silently
 * cutting them off.
 */
function adoptOlderGames() {
  if (!state.remote) return;
  const migrated = state.games.map((game) =>
    game.shared === undefined ? { ...game, shared: true } : game,
  );
  if (migrated.some((game, index) => game !== state.games[index])) {
    state.games = migrated;
    saveGames(state.games);
  }
}

function connectToStore() {
  connectStore({
    getLocalGames: () => state.games,
    onGames: (games) => {
      if (signature(games) === signature(state.games)) return;
      state.games = games;
      saveGames(games);
      // Redrawing under someone's fingers would throw away what they are
      // typing; the next render picks the change up anyway.
      if (!isBusy()) render();
    },
    onLost: () => {
      state.store = null;
      if (!isBusy()) render();
    },
  }).then((store) => {
    if (!store) return;
    state.store = store;
    if (!isBusy()) render();
  });
}

setLanguage(state.prefs.lang || detectLanguage());
applyStaticText();
applyLook();
bindChrome();
followTrail();
window.addEventListener('hashchange', () => {
  followTrail();
  // An event chosen for a form holds for that form only.
  if (!/^new/.test(route().name)) state.newEventLink = null;
  state.editingRoundId = null;
  state.listFilter = null;
  // A message already read belongs to the screen it was read on. One that has
  // not been seen yet follows, so that nothing is lost on the way.
  if (state.flash?.shownAt) state.flash = null;
  render();
});

/**
 * Another tab of the same app changed what is kept on this device. Take it in:
 * two tabs each holding their own idea of the keys, and the last one to write
 * anything would wipe the other's — a ticket that only exists on this device
 * included.
 */
window.addEventListener('storage', (event) => {
  if (event.key && !event.key.startsWith('marque-points:')) return;
  state.prefs = loadPrefs();
  // The look chosen over there, here too.
  applyLook();
  state.games = loadGames();
  state.lists = loadLists();
  state.polls = loadPolls();
  state.spends = loadSpends();
  state.boards = loadBoards();
  if (!isBusy()) render();
});
/**
 * Register the cache that makes the app open without a network. It is absent
 * from a file opened off the disk and from a page served without https, and
 * the app must not care either way.
 */
function registerOfflineCache() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  // The served app carries a manifest; the single-file build has it stripped,
  // and has no sw.js beside it to register either.
  if (!document.querySelector('link[rel="manifest"]')) return;

  window.addEventListener('load', () => {
    // `updateViaCache: 'none'` is what makes a published update arrive at all:
    // without it the browser may hand the *old* sw.js back from its own HTTP
    // cache, and an app added to the home screen then stays on that version for
    // as long as the cache holds it.
    navigator.serviceWorker
      .register('sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        state.worker = registration;
        // Coming back to the app is when to ask whether a new one was published
        // — an app on a home screen is opened far more often than it is
        // reloaded, and may never be reloaded at all.
        const look = () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {});
        };
        document.addEventListener('visibilitychange', look);
        window.addEventListener('focus', look);
      })
      .catch(() => {
        // No offline cache, then: everything else still works.
      });

    // A new worker has taken over: the page is showing the old version's code,
    // so it is reloaded once — never twice, whatever happens next.
    //
    // Only when a worker was already in charge, though. On a page's very first
    // visit the brand-new worker claims it too, and reloading there would make
    // every first visit reload itself — under the fingers of someone who may
    // already be typing.
    let controlled = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!controlled) {
        // The first worker taking charge of a page that had none: nothing to
        // reload, and the page is now controlled — so the *next* hand-over is
        // a new version, and that one is worth a reload.
        controlled = true;
        return;
      }
      if (state.reloading) return;
      state.reloading = true;
      location.reload();
    });
  });
}

/**
 * Which copy of the app this is: the version, bumped by hand when something
 * worth announcing changes, and the build stamp, which moves on its own
 * whenever any source file does.
 */
export function appVersion() {
  const version = document.querySelector('meta[name="app-version"]')?.content || '';
  const build = document.querySelector('meta[name="app-build"]')?.content || '';
  return [version, build].filter(Boolean).join(' · ');
}

/**
 * Go and see whether a newer copy has been published, and say what came of it.
 *
 * The app is network-first, so a reload with a network is usually enough — but
 * "usually" is not something to leave someone guessing about, least of all on a
 * phone where the app is resumed rather than opened.
 */
export async function lookForUpdate() {
  if (!state.worker) return 'unsupported';
  try {
    await state.worker.update();
  } catch {
    return 'failed';
  }
  if (state.worker.installing || state.worker.waiting) return 'coming';
  return 'current';
}

adoptOlderGames();
offerMeInForms();
startInstall();
render();
// What happened while the app was closed, learnt on opening it rather than left
// waiting for someone to press a button: a knock answered, a key cut off.
if (state.remote) {
  (async () => {
    const answered = pendings().length ? await checkAllPendings() : false;
    const changed = await verifyGroups();
    if ((answered || changed) && !isBusy()) render();
    // Signed in: what the account holds that this device does not — a group
    // joined on the phone, a poll organised on the computer — and the other way.
    await syncAccount({ force: true });
    // And what the others pushed meanwhile, without being asked for it.
    await catchUpQuietly();
  })();

  // Coming back to the app — from Safari, from another app, from a locked
  // screen — is exactly the moment to find out what happened elsewhere.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void catchUpQuietly();
  });
  window.addEventListener('focus', () => void catchUpQuietly());

  // And while it stays open in front of someone: the answers to a poll left
  // on the list, or on the overview, arrive without anyone having to leave
  // and come back. Nothing is asked of a hidden page, nor more often than the
  // catch-up allows itself: it is looked at every few seconds, and goes only
  // when its own twenty have passed. Ticking at exactly twenty would miss by
  // a hair every other time, and make it forty.
  setInterval(() => {
    if (document.visibilityState === 'visible') void catchUpQuietly();
  }, 5000);
}
connectToStore();
registerOfflineCache();
