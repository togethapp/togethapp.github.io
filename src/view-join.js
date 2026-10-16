/**
 * Coming into a group: the invitation, the knock and the wait, and the return
 * link that hands a known person a key again.
 *
 * Calls back into app.js and the other views only from inside functions.
 */

import {
  escapeHtml, flash, flashHtml, isBusy, isHidden, liveCoversGroups, navigate, render, route, state, stopWatching,
  view,
} from './app.js';
import { t } from './i18n.js';
import { readCode } from './lock.js';
import { backLink } from './remote.js';
import { offerAccount } from './view-account.js';
import { ask, makeDialog, showCopyDialog } from './view-games.js';
import {
  bindInAppWarning, catchUpWith, checkPending, deviceLabel, forgetPending, groups, inAppWarningHtml, myName,
  NAME_KEPT, onHomeScreen, pendingFor, refreshGate, rememberGroup, rememberPending, setMyName,
} from './view-groups.js';
import { bindInvitationPaste, waitingLine } from './view-home.js';
import { installFirstHtml, installOfferHtml, phoneToInstall } from './view-install.js';

/* ------------------------------------------------------------- coming back --- */

/**
 * The screen a return link opens: one button, because there is nothing to ask.
 * The token is the person's own, it was accepted once, and what it hands over is
 * a key for this browser — which is exactly what a browser that knows nothing
 * about the group needs.
 */
export function backView(token) {
  return `
    ${flashHtml()}
    <div class="spread">
      <h1>${escapeHtml(t('back.title'))}</h1>
      <button type="button" class="button button--small button--ghost" data-goto="#/" data-back>
        ${escapeHtml(t('action.back'))}
      </button>
    </div>

    ${inAppWarningHtml()}

    <div class="card stack">
      <p>${escapeHtml(token ? t('back.what') : t('back.broken'))}</p>
      <p class="muted small" id="back-state"></p>
      ${
        token
          ? `<button type="button" class="button button--primary button--block" id="back-go">
               ${escapeHtml(t('back.action'))}
             </button>`
          : ''
      }
    </div>`;
}

export function bindBack(token) {
  bindInAppWarning();
  const line = view.querySelector('#back-state');
  view.querySelector('#back-go')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (!state.remote) {
      line.textContent = t('join.noDatabase');
      return;
    }
    button.disabled = true;
    line.textContent = t('groups.checking');

    let answer = { status: 'unknown' };
    try {
      answer = await state.remote.returnWith(token, deviceLabel());
    } catch {
      button.disabled = false;
      line.textContent = t('groups.unsure');
      return;
    }
    button.disabled = false;

    if (answer.status === 'busy') return void (line.textContent = t('gate.busy'));
    if (answer.status !== 'ok') return void (line.textContent = t('back.refused'));

    if (answer.who) setMyName(answer.who);
    const group = { id: answer.id, name: answer.name, key: answer.key, admits: false };
    rememberGroup(group);
    let taken = 0;
    try {
      taken = await catchUpWith(group);
    } catch {
      // In the group either way.
    }
    offerAccount(group);
    flash(taken
      ? t('groups.joinedWith', { name: group.name, count: taken })
      : t('groups.joined', { name: group.name }));
    // Onto the groups tab, where the group just joined now shows.
    if (location.hash.startsWith('#/back/')) location.replace(`${location.pathname}${location.search}#/groups`);
    else navigate('#/groups');
  });
}

/**
 * Show this device's return link — drawing a fresh one, which retires the
 * previous. Offered right after being let in, and available afterwards in
 * *Mes groupes*, because the moment someone will want it is not the moment they
 * are told about it.
 */
export async function showMyLink(group) {
  let answer = { status: 'none' };
  try {
    answer = await state.remote.myLink(group.key);
  } catch {
    flash(t('groups.unsure'), 'error');
    render();
    return;
  }
  if (answer.status !== 'ok') {
    flash(t('back.noneForThisKey'));
    render();
    return;
  }
  showCopyDialog({
    title: t('back.linkTitle', { name: group.name }),
    hint: t('back.linkHint'),
    text: backLink(location, answer.token),
    qr: true,
  });
}

/**
 * The group's calendar address: one link, which every calendar knows how to
 * subscribe to — and which anyone holding it can read, so it is shown with
 * what it costs, and with the way to cut it.
 */
export async function showCalendar(group) {
  let answer = { status: 'unknown' };
  try {
    answer = await state.remote.calendar(group.key);
  } catch {
    flash(t('groups.unsure'), 'error');
    render();
    return;
  }
  if (answer.status !== 'ok') {
    flash(t(answer.status === 'account' ? 'agenda.needsAccount' : 'agenda.none'), 'error');
    render();
    return;
  }

  showCopyDialog({
    title: t('agenda.title', { name: group.name }),
    hint: t('agenda.hint'),
    text: state.remote.calendarUrl(answer.token),
  });
}

/* ------------------------------------------------------- joining a group --- */

/**
 * The page an invitation link opens: one field, the first name of whoever is
 * joining, and a button. The group's name and the six digits arrived in the
 * link, and are shown so that a link mangled by a messaging app can still be
 * corrected by hand rather than being a dead end.
 */
export function joinView(invitation) {
  const waiting = invitation.group ? pendingFor(invitation.group) : null;
  if (waiting) return waitingView(waiting);

  const already = invitation.group ? groupNamed(invitation.group) : null;
  const head = `
    ${flashHtml()}
    <div class="spread">
      <h1>${escapeHtml(invitation.group ? t('join.title', { name: invitation.group }) : t('join.titlePlain'))}</h1>
      <button type="button" class="button button--small button--ghost" data-goto="#/" data-back>
        ${escapeHtml(t('action.back'))}
      </button>
    </div>

    ${inAppWarningHtml()}`;
  // On an iPhone, in Safari: install first, and join from the app — a group
  // joined here would not be in the app on the home screen.
  if (!already && phoneToInstall() === 'ios' && !state.joinHere) return `${head}${installFirstHtml(invitation)}`;
  return `
    ${head}

    ${installOfferHtml()}

    <form id="join-form" class="card stack">
      <p class="muted small">${escapeHtml(already ? t('join.already', { name: already.name }) : t('join.hint'))}</p>
      <label>
        ${escapeHtml(t('join.me'))}
        <input type="text" id="join-me" autocomplete="given-name" maxlength="${NAME_KEPT}" aria-required="true"
               value="${escapeHtml(myName())}" placeholder="${escapeHtml(t('me.placeholder'))}" />
      </label>

      <button type="submit" class="button button--primary button--block">
        ${escapeHtml(already ? t('groups.catchUp') : t('join.action'))}
      </button>
      <p class="muted small" id="join-state"></p>

      <details class="details">
        <summary>${escapeHtml(t('join.byHand'))}</summary>
        <div class="row row--tight">
          <input type="text" id="join-group" autocomplete="off" value="${escapeHtml(invitation.group)}"
                 placeholder="${escapeHtml(t('groups.namePlaceholder'))}" aria-label="${escapeHtml(t('groups.namePlaceholder'))}" />
          <input type="text" id="join-code" class="code-input" inputmode="numeric" autocomplete="one-time-code"
                 value="${escapeHtml(invitation.code || '')}" placeholder="000000"
                 aria-label="${escapeHtml(t('groups.codePlaceholder'))}" />
        </div>
      </details>

      ${toHomeScreenHtml(invitation)}
    </form>`;
}

/**
 * How to enter a group from the app rather than from the page this link opened.
 *
 * The invitation travels as a link, and a link always opens in the browser —
 * never in an app sitting on a home screen, which iOS gives its own storage and
 * no way of being handed a URL. So someone who joins here and then installs the
 * app finds it empty, and has every reason to think the app is broken. The only
 * order that works is the other one: install first, join from inside. That is
 * worth saying on the very page where the mistake is made, with the two things
 * to copy right underneath.
 *
 * Folded away, because most people are not installing anything: one line until
 * it is the line they need.
 */
function toHomeScreenHtml(invitation) {
  if (onHomeScreen()) return '';
  const name = String(invitation.group || '').trim();
  const code = String(invitation.code || '').trim();
  return `
    <details class="details">
      <summary>${escapeHtml(t('join.toHomeScreen'))}</summary>
      <p class="muted small">${escapeHtml(t('join.toHomeScreenWhy'))}</p>
      <ol class="steps muted small">
        <li>${escapeHtml(t('join.toHomeScreenStep1'))}</li>
        <li>${escapeHtml(t('join.toHomeScreenStep2'))}</li>
        <li>${escapeHtml(t('join.toHomeScreenStep3'))}</li>
      </ol>
      ${
        name && code
          ? `<p class="small"><strong>${escapeHtml(t('join.toHomeScreenWhat'))}</strong>
               ${escapeHtml(name)} · <span class="code-shown">${escapeHtml(code)}</span></p>
             <div class="row row--tight">
               <button type="button" class="button button--small" id="join-copy-code">
                 ${escapeHtml(t('join.toHomeScreenCopy'))}
               </button>
             </div>`
          : ''
      }
      <p class="muted small">${escapeHtml(t('join.toHomeScreenDone'))}</p>
    </details>`;
}

/**
 * The screen of someone who has knocked: nothing to do but wait, and nothing
 * shown that they are not yet entitled to see. It looks in on its own while it
 * is open, so being accepted needs no gesture on this side.
 */
function waitingView(knock) {
  return `
    ${flashHtml()}
    <div class="spread">
      <h1>${escapeHtml(t('gate.waitingTitle', { name: knock.groupName }))}</h1>
      <button type="button" class="button button--small button--ghost" data-goto="#/" data-back>
        ${escapeHtml(t('action.back'))}
      </button>
    </div>

    <div class="card stack">
      <p>${escapeHtml(t('gate.waitingWhat', { name: knock.groupName, me: knock.me || t('gate.someone') }))}</p>
      <p class="muted small">${escapeHtml(t('gate.waitingHow'))}</p>
      <p class="muted small" id="waiting-state"></p>
      <div class="row">
        <button type="button" class="button button--primary" id="waiting-check">${escapeHtml(t('gate.check'))}</button>
        <button type="button" class="button button--ghost" id="waiting-drop">${escapeHtml(t('gate.dropMine'))}</button>
      </div>
    </div>`;
}

/**
 * How long an invitation lasts: two days.
 *
 * A day was too short for a link sent in the evening to someone who opens
 * their messages the following evening; two covers a weekend, and a link found
 * a week later is still dead. The database caps it as well — the guide's SQL
 * has to allow it, or the server quietly shortens it back.
 */
const INVITE_MINUTES = 2 * 24 * 60;

/**
 * Which invitation to draw. Both last two days; what separates them is how many
 * people may knock with it: the first is for a family, the second for someone
 * you would rather not see a link forwarded for.
 */
export async function askInvitationShape() {
  return new Promise((resolve) => {
    const dialog = makeDialog('dialog dialog--ask');
    dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(t('groups.inviteWhich'))}</h2>
        <p class="muted small">${escapeHtml(t('groups.inviteWhichHint'))}</p>
        <div class="stack stack--tight">
          <button type="button" class="button button--primary button--block" id="invite-open">
            ${escapeHtml(t('groups.inviteOpen'))}
          </button>
          <button type="button" class="button button--block" id="invite-one">
            ${escapeHtml(t('groups.inviteOne'))}
          </button>
        </div>
        <div class="row">
          <button type="button" class="button" id="invite-cancel">${escapeHtml(t('action.cancel'))}</button>
        </div>
      </div>`;

    let answered = false;
    const done = (shape) => {
      if (answered) return;
      answered = true;
      resolve(shape);
      dialog.close();
    };
    dialog.addEventListener('close', () => done(null));
    dialog.querySelector('#invite-cancel').addEventListener('click', () => done(null));
    dialog.querySelector('#invite-open').addEventListener('click', () => done({ minutes: INVITE_MINUTES, uses: 50 }));
    dialog.querySelector('#invite-one').addEventListener('click', () => done({ minutes: INVITE_MINUTES, uses: 1 }));
    dialog.showModal();
  });
}

/** The group of that name this device is in, if any. */
export function groupNamed(name) {
  const wanted = String(name || '').trim().toLowerCase();
  if (!wanted) return null;
  return groups().find((group) => String(group.name || '').trim().toLowerCase() === wanted) || null;
}

/**
 * Leave the invitation screen for the overview, without leaving the link in
 * the history: the code is spent, and a back button that lands on a dead
 * invitation explains nothing to anyone.
 */
function leaveInvitation() {
  // Replacing rather than pushing: the hash really changes, so the redraw comes
  // from the hashchange the way it does everywhere else. Drawing here as well
  // would show the "you are in Mifa" line and then immediately wipe it.
  if (location.hash.startsWith('#/join/')) {
    location.replace(`${location.pathname}${location.search}#/groups`);
    return;
  }
  navigate('#/groups');
}

/** True while a knock is on its way, so no second one leaves for the same form. */
export let knocking = false;

export function bindJoin() {
  bindInAppWarning();
  bindInvitationPaste(view.querySelector('#join-group'), view.querySelector('#join-code'));

  view.querySelector('#join-copy-code')?.addEventListener('click', () => {
    const invitation = route();
    showCopyDialog({
      title: t('join.toHomeScreen'),
      hint: t('join.toHomeScreenStep3'),
      text: `${invitation.group} · ${invitation.code}`,
    });
  });

  const waitingLine = view.querySelector('#waiting-state');
  if (waitingLine) {
    const knock = pendingFor(route().group);
    const look = async (button) => {
      if (!knock) return;
      if (button) button.disabled = true;
      waitingLine.textContent = t('groups.checking');
      const status = await checkPending(knock);
      if (status === 'waiting') {
        waitingLine.textContent = t('gate.stillWaiting');
        if (button) button.disabled = false;
        return;
      }
      if (status === null) {
        waitingLine.textContent = t('groups.unsure');
        if (button) button.disabled = false;
        return;
      }
      leaveInvitation();
    };

    view.querySelector('#waiting-check')?.addEventListener('click', (event) => look(event.currentTarget));
    view.querySelector('#waiting-drop')?.addEventListener('click', async () => {
      if (!knock) return;
      const sure = await ask(t('gate.confirmDropMine', { name: knock.groupName }),
        { confirmLabel: t('gate.dropMine'), danger: true });
      if (!sure) return;
      forgetPending(knock.ticket);
      flash(t('gate.droppedMine', { name: knock.groupName }));
      leaveInvitation();
    });
    return;
  }

  const form = view.querySelector('#join-form');
  const line = view.querySelector('#join-state');
  const say = (message) => {
    line.textContent = message;
  };

  knocking = false;
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (knocking) return;
    const button = form.querySelector('button[type="submit"]');
    const me = view.querySelector('#join-me').value.trim();
    const group = view.querySelector('#join-group').value.trim();
    const code = readCode(view.querySelector('#join-code').value);
    if (!me) return say(t('join.needMe'));
    if (!group) return say(t('groups.needName'));
    if (!code) return say(t('groups.needCode'));
    if (!state.remote) return say(t('join.noDatabase'));

    setMyName(me);

    // Already in this group: the invitation is worth keeping for someone else,
    // so take what the group shares instead of spending it. Groups are told
    // apart by name here, which is what the link carries — the database keeps
    // those names unique for exactly this reason.
    const held = groupNamed(group);
    if (held) {
      button.disabled = true;
      say(t('groups.checking'));
      let taken = 0;
      try {
        taken = await catchUpWith(held);
      } catch {
        button.disabled = false;
        return say(t('groups.unsure'));
      }
      flash(taken
        ? t('join.alreadyCaughtUp', { name: held.name, count: taken })
        : t('join.alreadyUpToDate', { name: held.name }));
      leaveInvitation();
      return;
    }

    button.disabled = true;
    knocking = true;
    say(t('groups.checking'));
    let answer = { status: 'unknown' };
    try {
      answer = await state.remote.ask(group, code, me, deviceLabel());
    } catch {
      button.disabled = false;
      knocking = false;
      return say(t('groups.unsure'));
    }
    button.disabled = false;
    knocking = false;

    if (answer.status === 'busy') return say(t('gate.busy'));
    if (answer.status !== 'waiting') return say(t('groups.codeRefused'));

    rememberPending({
      ticket: answer.ticket,
      groupId: answer.id,
      groupName: answer.name || group,
      me,
      at: Date.now(),
    });
    render();
  });

  view.querySelector('#join-me')?.focus();
}

/**
 * While the overview is on screen, ask again for the knocks — fifteen seconds
 * apart, and only redraw when the answer actually changed, so the screen does
 * not flicker and the database is not hammered.
 */
/** The pages that show who is knocking: the groups tab, and "for you" at home. */
export function showsGate() {
  return ['overview', 'groups'].includes(route().name);
}

/** When the knocks were last asked for, while the group's channel is heard. */
let lastGateLook = 0;

export function watchGate() {
  stopWatching();
  if (!state.remote) return;
  state.poll = setInterval(async () => {
    if (isBusy() || isHidden() || !showsGate()) return;
    // Heard as they happen: a knock is announced on the group's channel.
    if (liveCoversGroups() && Date.now() - lastGateLook < 60000) return;
    lastGateLook = Date.now();
    if (await refreshGate()) render();
  }, 15000);
}

/** While someone waits to be let in, look in on their own — five seconds apart. */
export function watchPending() {
  stopWatching();
  if (!state.remote) return;
  state.poll = setInterval(async () => {
    if (isBusy() || isHidden()) return;
    const knock = pendingFor(route().group);
    if (!knock) return;
    const status = await checkPending(knock);
    if (status && status !== 'waiting') {
      stopWatching();
      leaveInvitation();
    }
  }, 5000);
}
