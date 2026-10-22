/**
 * Accounts on screen: the form, the expenses, the balances, the repayments.
 *
 * Split out of app.js, which it calls back into: only from inside functions,
 * so the two may import each other.
 */

import {
  askForText, escapeHtml, flash, flashHtml, formatDate, formatDay, groupChipsHtml, kindsHtml,
  navigate, render, state, view, whenText,
  attachedHtml, chainButtonsHtml,
  backButtonHtml, hintHtml, newButtonHtml, peopleHtml, everything, documentTitle,
} from './app.js';
import {
  actionsHtml, eventLinkHtml, eventTagHtml, getSpend, persistPoll, persistSpend, pollCardHtml, pollTitle,
  replaceSpend, shareBarHtml, signed,
} from './view-polls.js';
import { archivedHtml, openPeopleEditor } from './view-lists.js';
import { ask, makeDialog, showCopyDialog } from './view-games.js';
import {
  askGroup, bindData, groups, hiddenByGroupHtml, inGroupHtml, keyFor, landing, myName, organise,
  organiserSecret, resetGroupChoice, shownDocs, willBeInHtml, isOrganiser,
  removeEverywhere,
} from './view-groups.js';
import { recentNames } from './model.js';
import { sameName } from './stats.js';
import { eventName } from './ics.js';
import { progress } from './lists.js';
import { createEvent, isEvent, seeksDay, lastDay } from './polls.js';
import {
  createSpend, readAmount, showAmount, spendCurrency, CURRENCIES, addSpend, editSpend, removeSpend,
  archiveSpend, addSpendPerson, renameSpendPerson, removeSpendPerson, canRemovePerson, balances,
  spendTotal, settle, addRepayment, isRepayment, readParts, weightOf, stepParts, splitProblem, lineShares,
  setSpendWeight, setSpendPay, payOf, sharedWithEveryone, addLatecomer, PAID_IN, readRate, convertPaid, paidInOf,
  lastRate,
} from './spends.js';
import { forWhomGroups, listsFeeding } from './flows.js';
import { ticketOffersHtml } from './view-flows.js';
import { recentPeople, withMeFirst } from './people.js';
import { isLive, dayNow, eventParts } from './dashboard.js';
import { saveSpends } from './storage.js';
import { swipeHtml, swipeable, bindSwipes } from './swipe.js';
import { t, getLanguage } from './i18n.js';
import { talkSumHtml } from './view-reacts.js';

/* --------------------------------------------------------------- dépenses --- */

export function spendTitle(spend) {
  return spend.name || t('spends.untitled');
}

/** Ce que ce compte dit de moi : ce qu'on me doit, ou ce que je dois. */
export function myBalance(spend) {
  const me = sameName(myName());
  if (!me) return null;
  return balances(spend).find((row) => sameName(row.name) === me) || null;
}

export function spendCardHtml(spend) {
  const mine = myBalance(spend);
  const line = mine && mine.balance !== 0
    ? t(mine.balance > 0 ? 'spends.owedToMe' : 'spends.iOwe', { amount: money(Math.abs(mine.balance), spend) })
    : t('spends.even');
  return `
    <button type="button" class="game-card" data-goto="#/spend/${escapeHtml(spend.id)}">
      <span class="game-card__title">
        ${escapeHtml(spendTitle(spend))}
        <span class="pill">${escapeHtml(money(spendTotal(spend), spend))}</span>
      </span>
      ${peopleHtml(spend.people.map((person) => person.name))}
      <span class="game-card__meta">
        ${escapeHtml(formatDate(spend.updatedAt))} — <span class="${mine && mine.balance < 0 ? 'late' : ''}">${escapeHtml(line)}</span>
      </span>
      ${eventTagHtml(spend)}
    </button>`;
}

/**
 * The agenda: what is coming, day by day, each event with what hangs off it;
 * then the accounts that belong to no event still coming — a flatshare, or the
 * weekend just past whose money is not settled yet; then the past, folded.
 *
 * An event is a poll with a day: settled by a vote, or made with its day
 * already known. A question still looking for its day comes first, under "to
 * decide": when it settles it only moves down the same page. Questions about
 * anything else stay on the home page, and the accounts have their own.
 */
export function agendaView() {
  const today = dayNow();
  const byDay = (a, b) => a.date.localeCompare(b.date) || String(a.at || '').localeCompare(String(b.at || ''));
  const dated = shownDocs(state.polls).filter((poll) => isLive(poll) && poll.date);
  // Under way still counts as coming: a weekend is not past on its Saturday.
  const coming = dated.filter((poll) => lastDay(poll) >= today).sort(byDay);
  const past = dated.filter((poll) => lastDay(poll) < today).sort(byDay).reverse();

  const deciding = shownDocs(state.polls)
    .filter((poll) => isLive(poll) && !poll.date && !poll.closedAt && seeksDay(poll))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const archivedEvents = shownDocs(state.polls).filter((poll) => isEvent(poll) && poll.archivedAt);

  return `
    ${flashHtml()}
    ${newButtonHtml('#/agenda/new', t('events.new'), Boolean(dated.length || deciding.length))}
    ${groupChipsHtml()}

    ${
      deciding.length
        ? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('polls.toDecide'))}</h2></div>
             <div class="game-list">${deciding.map(swipeable(pollCardHtml, isOrganiser)).join('')}</div>
           </section>`
        : ''
    }

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('events.coming'))}</h2></div>
      ${
        coming.length
          ? `<div class="game-list">${coming.map(swipeable(eventCardHtml, isOrganiser)).join('')}</div>`
          : hintHtml('agenda', t('events.none'))
      }
      ${hiddenByGroupHtml(state.polls.filter((poll) => poll.date))}
    </section>
    ${coming.length && coming.length + deciding.length <= 2 ? hintHtml('agenda', t('hint.agenda')) : ''}

    ${
      past.length
        ? `<details class="details">
             <summary>${escapeHtml(t('events.past', { count: past.length }))}</summary>
             <div class="game-list">${past.map(swipeable(eventCardHtml, isOrganiser)).join('')}</div>
           </details>`
        : ''
    }

    ${archivedHtml(archivedEvents, swipeable(eventCardHtml, isOrganiser))}`;
}

/** Every account, on the home page: the ones someone still owes on, then the settled. */
export function spendsView() {
  const sorted = [...shownDocs(state.spends)].sort((a, b) => b.updatedAt - a.updatedAt);
  const live = sorted.filter(isLive);
  const settled = (spend) => spend.lines.length && balances(spend).every((row) => row.balance === 0);
  const open = live.filter((spend) => !settled(spend));
  const done = live.filter(settled);

  return `
    ${flashHtml()}
    ${kindsHtml('spends')}
    ${newButtonHtml('#/spends/new', t('spends.new'), live.length > 0)}
    ${groupChipsHtml()}

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('kinds.ongoing'))}</h2></div>
      ${
        open.length
          ? `<div class="game-list">${open.map(swipeable(spendCardHtml)).join('')}</div>`
          : hintHtml('spends', t('spends.none'))
      }
      ${hiddenByGroupHtml(state.spends)}
    </section>
    ${open.length && live.length <= 2 ? hintHtml('spends', t('hint.spends')) : ''}

    ${
      done.length
        ? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('spends.settled'))}</h2></div>
             <div class="game-list">${done.map(swipeable(spendCardHtml)).join('')}</div>
           </section>`
        : ''
    }

    ${archivedHtml(sorted, swipeable(spendCardHtml))}`;
}

/**
 * An event, in the agenda and on Home: its day, who comes, and what hangs off
 * it — where its list and account stand, and how many polls, idea boards and
 * games were made for it.
 */
export function eventCardHtml(poll) {
  const { list, spend, polls, boards, games, activities } = eventParts(poll, state);
  const when = poll.date ? whenText(poll, { long: true }) : t('activity.unscheduled');
  const parts = [];
  if (list) {
    const { done, total } = progress(list);
    parts.push(total ? `${t('event.list')} : ${t('lists.progress', { done, total })}` : `${t('event.list')} : ${t('lists.empty')}`);
  }
  if (spend) parts.push(t('spends.total', { amount: money(spendTotal(spend), spend) }));
  if (polls.length) parts.push(t('count.polls', { count: polls.length }));
  if (boards.length) parts.push(t('count.boards', { count: boards.length }));
  if (games.length) parts.push(t('count.games', { count: games.length }));
  // What is on the programme, first things first: a card says what is coming.
  const programme = activities.slice(0, 3).map((one) => [one.date ? whenText(one) : '', eventName(one) || pollTitle(one)].filter(Boolean).join(' '));
  if (activities.length > 3) programme.push('…');
  return `
    <button type="button" class="game-card" data-goto="#/poll/${escapeHtml(poll.id)}">
      <span class="game-card__title">
        ${escapeHtml(eventName(poll) || pollTitle(poll))}
        <span class="pill">${escapeHtml(when)}</span>
      </span>
      ${peopleHtml(poll.people.map((person) => person.name))}
      ${parts.length ? `<span class="game-card__meta">${escapeHtml(parts.join(' · '))}</span>` : ''}
      ${programme.length ? `<span class="game-card__meta">${escapeHtml(t('activity.onProgramme', { items: programme.join(' · ') }))}</span>` : ''}
      ${talkSumHtml(poll)}
    </button>`;
}

/** A new event whose day is known: a name, the day, perhaps an hour, and who comes. */
export function newEventView() {
  const suggestions = [...new Set([
    myName(), ...recentPeople(state.polls), ...recentPeople(state.lists), ...recentPeople(state.spends), ...recentNames(state.games),
  ].filter(Boolean))].slice(0, 12);

  return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/agenda')}
      <h1>${escapeHtml(t('events.new'))}</h1>
    </div>

    <form id="new-event" class="card stack">
      <label>
        ${escapeHtml(t('events.name'))}
        <input type="text" id="event-name" placeholder="${escapeHtml(t('polls.eventNamePlaceholder'))}"
               value="${escapeHtml(state.newEventName)}" required />
      </label>

      <div class="row">
        <label>
          ${escapeHtml(t('events.day'))}
          <input type="date" id="event-day" value="${escapeHtml(state.newEventDay)}" required />
        </label>
        <label>
          ${escapeHtml(t('polls.hour'))}
          <input type="time" id="event-hour" value="${escapeHtml(state.newEventHour)}" />
        </label>
      </div>
      <label>
        ${escapeHtml(t('events.until'))}
        <input type="date" id="event-until" value="${escapeHtml(state.newEventUntil)}" />
      </label>

      <div class="stack stack--tight">
        <span class="muted small">${escapeHtml(t('events.peopleHint'))}</span>
        ${state.newEventPeople
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
            state.newEventPeople.length > 1
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

      ${willBeInHtml({ events: false })}

      <button type="submit" class="button button--primary button--block">${escapeHtml(t('events.create'))}</button>
    </form>`;
}

export function bindNewEvent() {
  const form = view.querySelector('#new-event');
  if (!form) return;

  const snapshot = () => {
    state.newEventName = view.querySelector('#event-name').value;
    state.newEventDay = view.querySelector('#event-day').value;
    state.newEventHour = view.querySelector('#event-hour').value;
    state.newEventUntil = view.querySelector('#event-until').value;
    view.querySelectorAll('[data-person-index]').forEach((input) => {
      state.newEventPeople[Number(input.dataset.personIndex)] = input.value;
    });
  };

  view.querySelector('#add-person')?.addEventListener('click', () => {
    snapshot();
    state.newEventPeople = [...state.newEventPeople, ''];
    render();
    view.querySelector(`[data-person-index="${state.newEventPeople.length - 1}"]`)?.focus();
  });

  view.querySelector('#drop-person')?.addEventListener('click', () => {
    snapshot();
    state.newEventPeople = state.newEventPeople.slice(0, -1);
    render();
  });

  view.querySelectorAll('[data-new-group]').forEach((chip) => {
    chip.addEventListener('click', () => {
      snapshot();
      state.newGroupChoice = { touched: true, id: chip.dataset.newGroup || null };
      render();
    });
  });

  view.querySelectorAll('[data-suggest]').forEach((chip) => {
    chip.addEventListener('click', () => {
      snapshot();
      const { suggest } = chip.dataset;
      if (state.newEventPeople.some((name) => sameName(name) === sameName(suggest))) return;
      const empty = state.newEventPeople.findIndex((name) => !name.trim());
      if (empty >= 0) state.newEventPeople[empty] = suggest;
      else state.newEventPeople = [...state.newEventPeople, suggest];
      render();
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    snapshot();
    const poll = signed(organise(landing(createEvent({
      name: state.newEventName,
      names: state.newEventPeople,
      date: state.newEventDay,
      at: state.newEventHour,
      until: state.newEventUntil,
    }), { forEvent: false })));
    state.polls = [...state.polls, poll];
    persistPoll(poll);
    resetGroupChoice();
    state.newEventName = '';
    state.newEventDay = '';
    state.newEventHour = '';
    state.newEventUntil = '';
    state.newEventPeople = withMeFirst(['', ''], myName());
    navigate(`#/poll/${poll.id}`);
  });
}

export function newSpendView() {
  const suggestions = [...new Set([
    myName(), ...recentPeople(state.spends), ...recentPeople(state.lists), ...recentNames(state.games),
  ].filter(Boolean))].slice(0, 12);

  return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/spends')}
      <h1>${escapeHtml(t('spends.new'))}</h1>
    </div>

    <form id="new-spend" class="card stack">
      <label>
        ${escapeHtml(t('spends.name'))}
        <input type="text" id="spend-name" placeholder="${escapeHtml(t('spends.namePlaceholder'))}"
               value="${escapeHtml(state.newSpendName)}" required />
      </label>

      <label>
        ${escapeHtml(t('spends.currency'))}
        <select id="spend-currency">
          ${CURRENCIES.map((code) => `<option value="${code}" ${code === state.newSpendCurrency ? 'selected' : ''}>${escapeHtml(currencyName(code))}</option>`).join('')}
        </select>
      </label>

      <div class="stack stack--tight">
        <span class="muted small">${escapeHtml(t('spends.peopleHint'))}</span>
        ${state.newSpendPeople
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
            state.newSpendPeople.length > 1
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

      ${willBeInHtml()}

      <button type="submit" class="button button--primary button--block">${escapeHtml(t('spends.create'))}</button>
    </form>`;
}

/** Who pays whom, as text: what the group chat needs to settle up — and how to pay each back. */
function settleText(spend) {
  const moves = settle(spend);
  const paidTo = [...new Set(moves.map((move) => move.toId))]
    .map((id) => spend.people.find((person) => person.id === id))
    .filter((person) => payOf(person));
  return [
    `${spendTitle(spend)} — ${t('spends.total', { amount: money(spendTotal(spend), spend) })}`,
    '',
    t('spends.settle'),
    ...moves.map((move) => `${t('spends.move', { from: move.from, to: move.to })} — ${money(move.amount, spend)}`),
    ...(paidTo.length ? ['', ...paidTo.map((person) => `${t('spends.payTo', { name: person.name })} ${payOf(person)}`)] : []),
  ].join('\n');
}

/** One transfer, as a message to whoever owes it: how much, to whom, for what, and how. */
function remindText(spend, move) {
  const pay = payOf(spend.people.find((person) => person.id === move.toId));
  return [
    t('spends.remindText', { from: move.from, to: move.to, amount: money(move.amount, spend), name: spendTitle(spend) }),
    ...(pay ? [`${t('spends.payTo', { name: move.to })} ${pay}`] : []),
  ].join('\n');
}

/**
 * How someone wrote they want to be paid back in another account, the most
 * recent first: written once, offered everywhere — the same IBAN for the
 * holidays and the flatshare.
 */
function payElsewhere(name) {
  const key = sameName(name);
  for (const other of [...state.spends].sort((a, b) => (b.peopleAt || 0) - (a.peopleAt || 0))) {
    const person = other.people.find((one) => sameName(one.name) === key && payOf(one));
    if (person) return payOf(person);
  }
  return '';
}

/** An amount of an account, in that account's currency. */
export function money(cents, spend) {
  return showAmount(cents, getLanguage(), spendCurrency(spend));
}

/** « € », « CHF », « £ »: what follows an amount being typed. */
function currencySymbol(code) {
  try {
    return new Intl.NumberFormat(getLanguage(), { style: 'currency', currency: code })
      .formatToParts(0).find((part) => part.type === 'currency')?.value || code;
  } catch {
    return code;
  }
}

/** « € — euro », as the currency list of a new account shows it. */
function currencyName(code) {
  try {
    const symbol = currencySymbol(code);
    const name = new Intl.DisplayNames([getLanguage()], { type: 'currency' }).of(code) || code;
    return `${symbol} — ${name}`;
  } catch {
    return code;
  }
}

/** An amount as it is typed back into a field: « 12,50 », « 12.50 » in English. */
export function typedAmount(cents) {
  const text = ((Number(cents) || 0) / 100).toFixed(2);
  return getLanguage() === 'fr' ? text.replace('.', ',') : text;
}

/** A rate as it is typed back into a field: « 0,86 ». */
function typedRate(rate) {
  const text = String(readRate(rate) ?? '');
  return getLanguage() === 'fr' ? text.replace('.', ',') : text;
}

/** « 1 € = 0,86 £ »: how a rate reads, the way a bank quotes it. */
function rateText(spend, currency, rate) {
  return `1 ${currencySymbol(spendCurrency(spend))} = ${typedRate(rate)} ${currencySymbol(currency)}`;
}

/** The currencies an expense may be paid in: the account's, those it has already met, then the rest. */
function paidInChoices(spend) {
  const met = spend.lines.map((line) => paidInOf(spend, line)?.currency).filter(Boolean);
  return [...new Set([spendCurrency(spend), ...met, ...PAID_IN])];
}

/**
 * How much an expense was, and in what: the account's currency unless
 * another is picked — then the rate (« 1 € = 0,86 £ »), the last one written
 * for that currency to begin with, and what it comes to in the account. Held
 * by the markup, like the split editor: nothing has to redraw it.
 */
function amountFieldHtml(spend, { id, cents = null, paid = null, pill = false }) {
  const own = spendCurrency(spend);
  const currency = paid?.currency || own;
  const typed = paid ? paid.amount : cents;
  return `
    <div class="amount-block" data-amount-field>
      <label>
        ${escapeHtml(t('spends.amount'))}
        <span class="${pill ? 'field-pill field-pill--amount' : 'amount-field'}">
          <input type="text" id="${id}" data-amount-input inputmode="decimal" placeholder="0,00" autocomplete="off"
                 value="${typed ? escapeHtml(typedAmount(typed)) : ''}" />
          <span class="field-pill__suffix currency-pick">
            <span data-currency-sign>${escapeHtml(currencySymbol(currency))}</span><span class="currency-pick__caret" aria-hidden="true">▾</span>
            <select data-currency aria-label="${escapeHtml(t('spends.paidInLabel'))}">
              ${paidInChoices(spend).map((code) => `<option value="${code}" ${code === currency ? 'selected' : ''}>${escapeHtml(currencyName(code))}</option>`).join('')}
            </select>
          </span>
        </span>
      </label>
      <div class="rate-row" data-rate-row ${currency === own ? 'hidden' : ''}>
        <label class="rate-row__rate">
          <span data-rate-from>1 ${escapeHtml(currencySymbol(own))} =</span>
          <input type="text" data-rate inputmode="decimal" autocomplete="off" ${pill ? 'class="field-pill"' : ''}
                 value="${paid ? escapeHtml(typedRate(paid.rate)) : ''}" aria-label="${escapeHtml(t('spends.rateLabel'))}" />
          <span data-rate-sign>${escapeHtml(currencySymbol(currency))}</span>
        </label>
        <span class="muted small" data-converted aria-live="polite"></span>
      </div>
    </div>`;
}

/**
 * Make an amount field work. `read()` answers what was typed — `cents`, in
 * the account's currency or null; `amount`, `currency` and `rate`, as
 * addSpend() takes them; `error`, 'amount' or 'rate' — and `problem()` says
 * what is missing where it is, without redrawing what was typed. `changed`
 * is told of every change: the split editor's shares follow.
 */
function bindAmountField(root, spend, changed = () => {}) {
  const box = root.querySelector('[data-amount-field]');
  const own = spendCurrency(spend);
  const input = box.querySelector('[data-amount-input]');
  const pick = box.querySelector('[data-currency]');
  const rate = box.querySelector('[data-rate]');
  const note = box.querySelector('[data-converted]');

  const read = () => {
    const currency = pick.value || own;
    const typed = readAmount(input.value);
    if (currency === own) return { cents: typed, amount: typed, currency, rate: null, error: typed ? null : 'amount' };
    const kept = readRate(rate.value);
    return {
      cents: typed && kept ? convertPaid(typed, kept) : null,
      amount: typed, currency, rate: kept,
      error: !typed ? 'amount' : kept ? null : 'rate',
    };
  };

  const refresh = () => {
    const now = read();
    box.querySelector('[data-currency-sign]').textContent = currencySymbol(now.currency);
    box.querySelector('[data-rate-sign]').textContent = currencySymbol(now.currency);
    box.querySelector('[data-rate-row]').hidden = now.currency === own;
    note.classList.remove('late');
    note.textContent = now.cents && now.currency !== own ? t('spends.converted', { amount: money(now.cents, spend) }) : '';
  };

  pick.addEventListener('change', () => {
    if (pick.value !== own && !readRate(rate.value)) {
      const known = lastRate(spend, pick.value, state.spends);
      rate.value = known ? typedRate(known) : '';
    }
    refresh();
    changed();
    if (pick.value !== own && !rate.value) rate.focus();
  });
  for (const field of [input, rate]) {
    field.addEventListener('input', () => {
      refresh();
      changed();
    });
  }
  refresh();

  const problem = () => {
    const now = read();
    if (now.error === 'rate') {
      note.textContent = t('spends.notARate', { sign: currencySymbol(own) });
      note.classList.add('late');
      rate.focus();
    } else {
      input.focus();
    }
    return now.error === 'rate' ? t('spends.notARate', { sign: currencySymbol(own) }) : t('spends.notAnAmount');
  };
  return { read, problem };
}

/** « ½ », « 2 », « 1½ »: a number of parts as one reads it. */
function partsShown(value) {
  const whole = Math.floor(value);
  return `${whole || ''}${value % 1 ? '½' : ''}`;
}

/** « 2 parts », « ½ part ». */
export function partsText(value) {
  return t('spends.partsCount', { count: value, shown: partsShown(value) });
}

/** What someone counts for, beside their name — only when it is not one part. */
function weightMarkHtml(person) {
  const weight = weightOf(person);
  return weight === 1 ? '' : ` <span class="split-row__weight">×${escapeHtml(partsShown(weight))}</span>`;
}

/**
 * Who an expense is for, and how it is shared — the same wherever an expense
 * is written: the form, the dialog that corrects it, a receipt from a list.
 *
 * A checklist ticked by default, each with what they owe as soon as the
 * amount is known. « Répartir autrement » gives, for this expense alone,
 * each one's parts and an amount apart (the pizza Alice had alone); the rest
 * is shared between the others. The activities of the account's event come
 * first, as quick choices: the kayak, for those who went.
 *
 * Everything is held by the markup itself: nothing has to redraw the page
 * while it is being filled in, which would lose what was typed.
 */
export function splitEditorHtml(spend, { forWhom = [], parts = null, fixed = null, groups = [] } = {}) {
  const open = Boolean(Object.keys(parts || {}).length || Object.keys(fixed || {}).length);
  const rows = spend.people.map((person) => {
    const id = escapeHtml(person.id);
    const ticked = !forWhom.length || forWhom.includes(person.id);
    const own = readParts(parts?.[person.id]) ?? weightOf(person);
    const apart = Number.isInteger(fixed?.[person.id]) ? fixed[person.id] : null;
    return `
      <div class="split-row" data-split-row="${id}">
        <label class="split-row__who">
          <input type="checkbox" data-for="${id}" ${ticked ? 'checked' : ''} />
          <span class="split-row__name">${escapeHtml(person.name)}${weightMarkHtml(person)}</span>
        </label>
        <span class="split-row__share" data-share-of="${id}"></span>
        <span class="split-row__more">
          <span class="stepper" role="group" aria-label="${escapeHtml(t('spends.partsOf', { name: person.name }))}">
            <button type="button" class="stepper__button" data-parts-step="-1" aria-label="${escapeHtml(t('spends.partsLess'))}">−</button>
            <span class="stepper__value" data-parts-of="${id}" data-value="${own}">${escapeHtml(partsText(own))}</span>
            <button type="button" class="stepper__button" data-parts-step="1" aria-label="${escapeHtml(t('spends.partsMore'))}">+</button>
          </span>
          <input type="text" inputmode="decimal" class="split-row__apart" data-apart-of="${id}" autocomplete="off"
                 value="${apart ? escapeHtml(typedAmount(apart)) : ''}"
                 aria-label="${escapeHtml(t('spends.apartOf', { name: person.name }))}" />
        </span>
      </div>`;
  });
  return `
    <div class="split-list ${open ? 'split-list--open' : ''}" data-split>
      <div class="split-list__head">
        <span>${escapeHtml(t('spends.splitTitle'))}</span>
        <span class="muted small" data-split-note aria-live="polite"></span>
      </div>
      ${
        groups.length
          ? `<div class="row row--chips split-list__groups">
               <button type="button" class="chip" data-split-group="">${escapeHtml(t('spends.everyoneChip'))}</button>
               ${groups.map((group) => `<button type="button" class="chip" data-split-group="${escapeHtml(group.ids.join(' '))}">${escapeHtml(group.name)}</button>`).join('')}
             </div>`
          : ''
      }
      ${rows.join('')}
      <button type="button" class="split-list__open" data-split-open>${escapeHtml(t('spends.splitOther'))}</button>
    </div>`;
}

/**
 * Make a split editor work. `amount()` reads the amount being typed, in
 * cents or null. Returns `read()` — { forWhom, parts, fixed } as addSpend
 * takes them, and what is wrong if anything is (`error`, a sentence) — and
 * `refresh()`, for when the amount changes.
 */
export function bindSplitEditor(root, spend, amount) {
  const box = root.querySelector('[data-split]');
  if (!box) return { read: () => ({ forWhom: [], parts: null, fixed: null, error: null }), refresh: () => {} };
  const boxes = () => [...box.querySelectorAll('[data-for]')];
  const isOpen = () => box.classList.contains('split-list--open');

  const read = () => {
    const ticked = boxes().filter((one) => one.checked).map((one) => one.dataset.for);
    const forWhom = ticked.length === boxes().length ? [] : ticked;
    const parts = {};
    const fixed = {};
    let unreadable = false;
    if (isOpen()) {
      for (const node of box.querySelectorAll('[data-parts-of]')) parts[node.dataset.partsOf] = Number(node.dataset.value);
      for (const input of box.querySelectorAll('[data-apart-of]')) {
        if (!input.value.trim() || !ticked.includes(input.dataset.apartOf)) continue;
        const cents = readAmount(input.value);
        if (cents) fixed[input.dataset.apartOf] = cents;
        else unreadable = true;
      }
    }
    const total = amount();
    const apart = Object.values(fixed).reduce((sum, cents) => sum + cents, 0);
    const problem = total ? splitProblem(spend, { amount: total, forWhom, fixed }) : null;
    let error = null;
    if (!ticked.length) error = t('spends.noOneChosen');
    else if (unreadable) error = t('spends.notAnAmount');
    else if (problem === 'over') error = t('spends.apartOver', { amount: money(apart - total, spend) });
    else if (problem === 'left') error = t('spends.apartLeft', { amount: money(total - apart, spend) });
    return { forWhom, parts, fixed, error };
  };

  const refresh = () => {
    const now = read();
    const total = amount();
    const shares = total && !now.error
      ? lineShares(spend, { amount: total, forWhom: now.forWhom, parts: now.parts, fixed: now.fixed })
      : new Map();
    for (const node of box.querySelectorAll('[data-share-of]')) {
      const cents = shares.get(node.dataset.shareOf);
      node.textContent = cents === undefined ? '' : money(cents, spend);
    }
    // What each would owe, written where an amount apart would go.
    for (const input of box.querySelectorAll('[data-apart-of]')) {
      const cents = shares.get(input.dataset.apartOf);
      input.placeholder = cents === undefined ? '' : typedAmount(cents);
    }
    const weighted = spend.people.some((person) => weightOf(person) !== 1);
    const note = box.querySelector('[data-split-note]');
    note.textContent = now.error || t(isOpen() ? 'spends.splitOpenHint' : weighted ? 'spends.splitPartsHint' : 'spends.splitHint');
    note.classList.toggle('late', Boolean(now.error));
  };

  box.addEventListener('change', refresh);
  box.addEventListener('input', (event) => {
    // An amount apart for someone unticked: they are concerned after all.
    const id = event.target.dataset?.apartOf;
    if (id && event.target.value.trim()) {
      const tick = boxes().find((one) => one.dataset.for === id);
      if (tick) tick.checked = true;
    }
    refresh();
  });
  box.querySelectorAll('[data-parts-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.closest('.stepper').querySelector('[data-parts-of]');
      const next = stepParts(Number(value.dataset.value), Number(button.dataset.partsStep));
      value.dataset.value = String(next);
      value.textContent = partsText(next);
      refresh();
    });
  });
  box.querySelector('[data-split-open]')?.addEventListener('click', () => {
    box.classList.add('split-list--open');
    refresh();
    box.querySelector('[data-parts-step]')?.focus();
  });
  box.querySelectorAll('[data-split-group]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const ids = chip.dataset.splitGroup ? chip.dataset.splitGroup.split(' ') : null;
      for (const tick of boxes()) tick.checked = !ids || ids.includes(tick.dataset.for);
      refresh();
    });
  });
  refresh();
  return { read, refresh };
}

/** Une dépense, telle qu'elle se lit dans la liste : qui, combien, pour qui. */
function spendLineHtml(spend, line) {
  const who = spend.people.find((person) => person.id === line.by)?.name || '';
  if (isRepayment(line)) {
    const to = spend.people.find((person) => person.id === line.forWhom[0])?.name || '';
    return swipeHtml(line.id, `
        <button type="button" class="line__text" data-spend-line="${escapeHtml(line.id)}">
          <span>${escapeHtml(t('spends.repaid', { from: who, to }))}</span>
          <span class="line__due">${escapeHtml(t('spends.repayment'))}${line.day ? ` · ${escapeHtml(formatDay(line.day))}` : ''}</span>
        </button>
        <span class="line__amount">${escapeHtml(money(line.amount, spend))}</span>`,
      { kind: 'line', tag: 'li', bodyClass: 'line line--money line--repay' });
  }
  const forWhom = line.forWhom.length
    ? spend.people.filter((person) => line.forWhom.includes(person.id)).map((person) => person.name).join(', ')
    : t('spends.everyone');
  const paid = paidInOf(spend, line);
  return swipeHtml(line.id, `
      <button type="button" class="line__text" data-spend-line="${escapeHtml(line.id)}">
        <span>${escapeHtml(line.text || t('spends.untitledLine'))}</span>
        <span class="line__due">
          ${escapeHtml(who ? t('spends.paidBy', { name: who }) : t('spends.paidByNobody'))}
          · ${escapeHtml(t('spends.forWhom', { names: forWhom }))}${
            line.parts || line.fixed ? ` · ${escapeHtml(t('spends.splitOwn'))}` : ''
          }${paid ? ` · ${escapeHtml(t('spends.paidIn', {
            amount: showAmount(paid.amount, getLanguage(), paid.currency), rate: rateText(spend, paid.currency, paid.rate),
          }))}` : ''}${line.day ? ` · ${escapeHtml(formatDay(line.day))}` : ''}
        </span>
      </button>
      <span class="line__amount">${escapeHtml(money(line.amount, spend))}</span>`,
    { kind: 'line', tag: 'li', bodyClass: 'line line--money' });
}

export function spendView(spend) {
  if (state.spendTabId !== spend.id) {
    state.spendTabId = spend.id;
    state.spendTab = 'expenses';
  }
  const rows = balances(spend);
  const moves = settle(spend);
  const me = sameName(myName());

  const segmented = `
    <div class="segmented" role="tablist" aria-label="${escapeHtml(t('spends.sections'))}">
      <button type="button" class="segmented__option" data-spend-tab="expenses"
              role="tab" aria-selected="${state.spendTab === 'expenses' ? 'true' : 'false'}"
              aria-current="${state.spendTab === 'expenses' ? 'true' : 'false'}">
        ${escapeHtml(t('spend.tabExpenses'))}
      </button>
      <button type="button" class="segmented__option" data-spend-tab="balances"
              role="tab" aria-selected="${state.spendTab === 'balances' ? 'true' : 'false'}"
              aria-current="${state.spendTab === 'balances' ? 'true' : 'false'}">
        ${escapeHtml(t('spend.tabBalances'))}
      </button>
    </div>`;

  const formShut = spend.lines.length > 0 && state.spendFormOpen !== spend.id;
  // What lists of the same event have ticked and nobody has written here yet.
  const waiting = listsFeeding(spend, everything())
    .map((list) => ticketOffersHtml(list, spend, t('flows.fromList', { name: documentTitle(list) })))
    .filter(Boolean);
  const expensesTab = `
    ${
      waiting.length
        ? `<section class="card stack flows" aria-label="${escapeHtml(t('flows.waiting'))}">${waiting.join('')}</section>`
        : ''
    }
    ${
      spend.people.length && formShut
        ? `<button type="button" class="button button--block" id="spend-add-open">+ ${escapeHtml(t('spends.addOpen'))}</button>`
        : spend.people.length
        ? `<form id="add-spend" class="card stack">
             <label>
               ${escapeHtml(t('spends.what'))}
               <input class="field-pill" type="text" id="spend-text"
                      placeholder="${escapeHtml(t('spends.textPlaceholder'))}" autocomplete="off" />
             </label>

             ${amountFieldHtml(spend, { id: 'spend-amount', pill: true })}

             <div class="field-row">
               <label>
                 ${escapeHtml(t('spends.by'))}
                 <select class="field-pill" id="spend-by">
                   ${spend.people
                     .map(
                       (person) => `<option value="${escapeHtml(person.id)}" ${me && sameName(person.name) === me ? 'selected' : ''}>
                          ${escapeHtml(person.name)}
                        </option>`,
                     )
                     .join('')}
                 </select>
               </label>
               <label>
                 ${escapeHtml(t('spends.when'))}
                 <input class="field-pill" type="date" id="spend-day" value="${escapeHtml(dayNow())}" />
               </label>
             </div>

             ${spend.people.length > 1 ? splitEditorHtml(spend, { groups: forWhomGroups(spend, everything()) }) : ''}

             <button type="submit" class="button button--primary button--block field-pill--submit">
               ${escapeHtml(t('spends.add'))}
             </button>
           </form>`
        : `<p class="muted small">${escapeHtml(t('spends.noPeople'))}</p>`
    }

    ${
      spend.lines.length
        ? `<ul class="lines">${[...spend.lines]
            .sort((a, b) => (b.day || '').localeCompare(a.day || '') || b.createdAt - a.createdAt)
            .map((line) => spendLineHtml(spend, line))
            .join('')}</ul>`
        : `<p class="muted small">${escapeHtml(t('spends.addFirst'))}</p>`
    }
    ${spend.people.length && spend.lines.length <= 2 ? hintHtml('spends', t('hint.spend')) : ''}`;

  const balancesTab = !spend.lines.length
    ? `<p class="muted small">${escapeHtml(t('spends.balancesEmpty'))}</p>`
    : `
    <section class="section card">
      <div class="section__head"><h2>${escapeHtml(t('spends.balances'))}</h2></div>
      <div class="entries">
        ${rows
          .map(
            (row) => `
              <div class="entry">
                <span class="entry__what">
                  ${escapeHtml(row.name)}${weightMarkHtml(spend.people.find((person) => person.id === row.id))}
                  <span class="muted small entry__detail">${escapeHtml([
                    row.paid ? t('spends.paidTotal', { amount: money(row.paid, spend) }) : '',
                    t('spends.shareTotal', { amount: money(row.owed, spend) }),
                  ].filter(Boolean).join(' · '))}</span>
                </span>
                <span class="entry__value ${row.balance > 0 ? 'entry__value--good' : row.balance < 0 ? 'entry__value--bad' : ''}">
                  ${escapeHtml(
                    row.balance === 0
                      ? t('spends.even')
                      : t(row.balance > 0 ? 'spends.isOwed' : 'spends.owes', {
                          amount: money(Math.abs(row.balance), spend),
                        }),
                  )}
                </span>
              </div>`,
          )
          .join('')}
      </div>
    </section>

    ${
      moves.length
        ? `<section class="section card">
             <div class="section__head"><h2>${escapeHtml(t('spends.settle'))}</h2></div>
             <div class="entries">
               ${moves
                 .map(
                   (move, index, all) => {
                     const pay = payOf(spend.people.find((person) => person.id === move.toId));
                     // How to pay someone back is said once, at the first transfer to them.
                     const first = all.findIndex((other) => other.toId === move.toId) === index;
                     return `
                     <div class="move">
                       <div class="entry">
                         <span class="entry__what">${escapeHtml(t('spends.move', { from: move.from, to: move.to }))}</span>
                         <span class="entry__value">${escapeHtml(money(move.amount, spend))}</span>
                       </div>
                       ${
                         pay && first
                           ? `<p class="move__pay small">
                                <span class="muted">${escapeHtml(t('spends.payTo', { name: move.to }))}</span>
                                <span class="move__pay-text">${escapeHtml(pay)}</span>
                              </p>`
                           : ''
                       }
                       <div class="move__actions">
                         <button type="button" class="button button--small button--primary" data-repay="${index}">
                           ${escapeHtml(t('spends.markPaid'))}
                         </button>
                         <button type="button" class="button button--small" data-remind="${index}">
                           ${escapeHtml(t('spends.remind', { name: move.from }))}
                         </button>
                       </div>
                       ${
                         first
                           ? `<button type="button" class="button button--small button--ghost move__pay-edit" data-pay-edit="${escapeHtml(move.toId)}">
                                ${escapeHtml(pay ? t('spends.payEdit', { name: move.to }) : t('spends.payAdd', { name: move.to }))}
                              </button>`
                           : ''
                       }
                     </div>`;
                   },
                 )
                 .join('')}
             </div>
             <p class="muted small">${escapeHtml(t('spends.settleHint'))}</p>
             <button type="button" class="button button--small" id="settle-text">${escapeHtml(t('spends.settleSend'))}</button>
           </section>`
        : `<div class="settled-banner">
             <span class="settled-banner__icon" aria-hidden="true">👍</span>
             <span>
               <strong class="settled-banner__title">${escapeHtml(t('spends.allSettled'))}</strong>
               <br />
               <span class="muted small">${escapeHtml(t('spends.allSettledHint'))}</span>
             </span>
           </div>`
    }`;

  return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/spends')}
      <div>
        <h1>${escapeHtml(spendTitle(spend))}</h1>
        <p class="muted small">
          ${escapeHtml(t('spends.total', { amount: money(spendTotal(spend), spend) }))}
          ${spend.shared ? ` · ${escapeHtml(t('lists.sharedMark'))}` : ''}
        </p>
      </div>
    </div>

    ${eventLinkHtml(spend)}

    ${inGroupHtml(spend)}

    ${state.remote ? shareBarHtml(`<button type="button" class="button button--primary" id="spend-share">${escapeHtml(t('spends.share'))}</button>`) : ''}

    ${segmented}

    ${state.spendTab === 'balances' ? balancesTab : expensesTab}

    ${attachedHtml(spend)}

    ${actionsHtml(`
        <button type="button" class="button button--small" id="spend-people">${escapeHtml(t('lists.people'))}</button>`, `
        <button type="button" class="button button--small button--ghost" id="spend-rename">${escapeHtml(t('spends.rename'))}</button>
        ${chainButtonsHtml(spend)}
        <button type="button" class="button button--small button--ghost" id="spend-archive">
          ${escapeHtml(spend.archivedAt ? t('archive.back') : t('archive.put'))}
        </button>
        <button type="button" class="button button--small button--ghost" id="spend-delete">${escapeHtml(t('action.delete'))}</button>`)}`;
}

export function bindNewSpend() {
  const form = view.querySelector('#new-spend');
  if (!form) return;

  const snapshot = () => {
    state.newSpendName = view.querySelector('#spend-name').value;
    state.newSpendCurrency = view.querySelector('#spend-currency')?.value || 'EUR';
    view.querySelectorAll('[data-person-index]').forEach((input) => {
      state.newSpendPeople[Number(input.dataset.personIndex)] = input.value;
    });
  };

  view.querySelector('#add-person')?.addEventListener('click', () => {
    snapshot();
    state.newSpendPeople = [...state.newSpendPeople, ''];
    render();
  });

  view.querySelector('#drop-person')?.addEventListener('click', () => {
    snapshot();
    state.newSpendPeople = state.newSpendPeople.slice(0, -1);
    render();
  });

  view.querySelectorAll('[data-new-group]').forEach((chip) => {
    chip.addEventListener('click', () => {
      snapshot();
      state.newGroupChoice = { touched: true, id: chip.dataset.newGroup || null };
      render();
    });
  });

  view.querySelectorAll('[data-suggest]').forEach((chip) => {
    chip.addEventListener('click', () => {
      snapshot();
      const { suggest } = chip.dataset;
      if (state.newSpendPeople.some((name) => name.trim().toLowerCase() === suggest.toLowerCase())) return;
      const empty = state.newSpendPeople.findIndex((name) => !name.trim());
      if (empty >= 0) state.newSpendPeople[empty] = suggest;
      else state.newSpendPeople = [...state.newSpendPeople, suggest];
      render();
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    snapshot();
    const spend = landing(createSpend({
      name: state.newSpendName,
      names: state.newSpendPeople,
      currency: state.newSpendCurrency,
    }));
    state.spends = [...state.spends, spend];
    persistSpend(spend);
    resetGroupChoice();
    state.newSpendName = '';
    state.newSpendCurrency = 'EUR';
    state.newSpendPeople = withMeFirst(['', ''], myName());
    navigate(`#/spend/${spend.id}`);
  });
}

export function bindSpend(spend) {
  bindData();

  // An expense or a repayment slides left to be deleted, as in its dialog.
  bindSwipes('line', (lineId) => {
    const current = getSpend(spend.id);
    if (!current) return;
    flash(t('swipe.lineDeleted'));
    replaceSpend(removeSpend(current, lineId));
  });

  view.querySelectorAll('[data-spend-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.spendTab = button.dataset.spendTab;
      render();
    });
  });

  view.querySelector('#spend-add-open')?.addEventListener('click', () => {
    state.spendFormOpen = spend.id;
    render();
    view.querySelector('#spend-text')?.focus();
  });

  const addForm = view.querySelector('#add-spend');
  let split = null;
  const amountField = addForm ? bindAmountField(addForm, spend, () => split?.refresh()) : null;
  split = addForm ? bindSplitEditor(addForm, spend, () => amountField.read().cents) : null;

  addForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = view.querySelector('#spend-text');
    const paid = amountField.read();
    if (paid.error === 'rate') {
      // Said under the rate, without redrawing what has been typed.
      amountField.problem();
      return;
    }
    if (paid.error) {
      flash(t('spends.notAnAmount'), 'error');
      render();
      return;
    }
    // Tous cochés (ou une seule personne, sans case) : « tout le monde » au
    // sens large, qui inclut qui rejoint le compte plus tard. Voir addSpend().
    const shared = split.read();
    if (shared.error) {
      // Said where it is wrong, without redrawing what has been typed.
      addForm.querySelector('[data-split-note]')?.scrollIntoView({ block: 'center' });
      return;
    }
    state.spendFormOpen = null;
    replaceSpend(addSpend(spend, {
      text: text.value,
      amount: paid.amount,
      currency: paid.currency,
      rate: paid.rate,
      by: view.querySelector('#spend-by').value,
      forWhom: shared.forWhom,
      parts: shared.parts,
      fixed: shared.fixed,
      day: view.querySelector('#spend-day')?.value || dayNow(),
    }));
  });

  view.querySelectorAll('[data-spend-line]').forEach((button) => {
    button.addEventListener('click', () => {
      const line = spend.lines.find((entry) => entry.id === button.dataset.spendLine);
      if (isRepayment(line)) openRepayDialog(spend, { line });
      else openSpendLineDialog(spend, button.dataset.spendLine);
    });
  });

  view.querySelector('#settle-text')?.addEventListener('click', () => {
    showCopyDialog({ title: spendTitle(spend), hint: t('lists.textHint'), text: settleText(spend) });
  });

  view.querySelectorAll('[data-repay]').forEach((button) => {
    button.addEventListener('click', () => {
      const move = settle(spend)[Number(button.dataset.repay)];
      if (move) openRepayDialog(spend, { move });
    });
  });

  view.querySelectorAll('[data-remind]').forEach((button) => {
    button.addEventListener('click', () => {
      const move = settle(spend)[Number(button.dataset.remind)];
      if (!move) return;
      showCopyDialog({ title: t('spends.remindTitle', { name: move.from }), hint: t('spends.remindHint'), text: remindText(spend, move), send: true });
    });
  });

  view.querySelectorAll('[data-pay-edit]').forEach((button) => {
    button.addEventListener('click', async () => {
      const person = spend.people.find((one) => one.id === button.dataset.payEdit);
      if (!person) return;
      const text = await askForText({
        title: t('spends.payTitle', { name: person.name }),
        hint: t('spends.payHint'),
        value: payOf(person) || payElsewhere(person.name),
        confirmLabel: t('action.save'),
        maxLength: 300,
      });
      if (text === null) return;
      replaceSpend(setSpendPay(getSpend(spend.id) || spend, person.id, text));
    });
  });

  view.querySelector('#spend-people')?.addEventListener('click', () => openSpendPeopleDialog(spend));

  view.querySelector('#spend-share')?.addEventListener('click', async () => {
    const group = await askGroup();
    if (!group) {
      flash(t('groups.needOne'));
      render();
      return;
    }
    const next = { ...spend, shared: true, groupId: group.id, updatedAt: Date.now() };
    replaceSpend(next);
    flash(t('spends.shared', { name: group.name }));
    render();
  });

  view.querySelector('#spend-archive')?.addEventListener('click', () => {
    const next = archiveSpend(spend, !spend.archivedAt);
    flash(t(next.archivedAt ? 'archive.done' : 'archive.undone'));
    replaceSpend(next, { redraw: !next.archivedAt });
    if (next.archivedAt) navigate('#/spends');
  });

  view.querySelector('#spend-rename')?.addEventListener('click', async () => {
    const name = await askForText({
      title: t('spends.rename'),
      hint: t('spends.renameHint'),
      value: spend.name,
      confirmLabel: t('action.save'),
    });
    if (name === null) return;
    replaceSpend({ ...spend, name: String(name).trim(), updatedAt: Date.now() });
  });

  view.querySelector('#spend-delete')?.addEventListener('click', async () => {
    if (!(await ask(t('spends.confirmDelete'), { confirmLabel: t('action.delete'), danger: true }))) return;
    if (!(await removeEverywhere(spend))) return;
    state.spends = state.spends.filter((item) => item.id !== spend.id);
    saveSpends(state.spends);
    if (state.store) void state.store.remove(spend.id);
    navigate('#/spends');
  });
}

/** Une dépense : ce qu'elle était, pour qui, quel jour — et de quoi l'effacer. */
function openSpendLineDialog(spend, lineId) {
  const line = spend.lines.find((entry) => entry.id === lineId);
  if (!line) return;

  const dialog = makeDialog();
  dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('spends.lineTitle'))}</h2>
      <label>
        ${escapeHtml(t('spends.what'))}
        <input type="text" id="line-what" value="${escapeHtml(line.text)}" />
      </label>
      ${amountFieldHtml(spend, { id: 'line-amount', cents: line.amount, paid: paidInOf(spend, line) })}
      <label>
        ${escapeHtml(t('spends.by'))}
        <select id="line-by">
          ${spend.people
            .map(
              (person) => `<option value="${escapeHtml(person.id)}" ${person.id === line.by ? 'selected' : ''}>
                 ${escapeHtml(person.name)}
               </option>`,
            )
            .join('')}
        </select>
      </label>
      ${
        spend.people.length > 1
          ? splitEditorHtml(spend, { forWhom: line.forWhom, parts: line.parts, fixed: line.fixed, groups: forWhomGroups(spend, everything()) })
          : ''
      }
      <label>
        ${escapeHtml(t('lists.due'))}
        <input type="date" id="line-day" value="${escapeHtml(line.day || '')}" />
      </label>
      <p class="late small" id="line-error" hidden></p>
      <div class="row">
        <button type="button" class="button button--primary" id="line-save">${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" id="line-cancel">${escapeHtml(t('action.cancel'))}</button>
        <button type="button" class="button button--danger" id="line-delete">${escapeHtml(t('action.delete'))}</button>
      </div>
    </form>`;

  let split = null;
  const amountField = bindAmountField(dialog, spend, () => split?.refresh());
  split = bindSplitEditor(dialog, spend, () => amountField.read().cents);
  const problem = (text) => {
    const error = dialog.querySelector('#line-error');
    error.textContent = text;
    error.hidden = false;
  };

  dialog.querySelector('#line-save').addEventListener('click', () => {
    const paid = amountField.read();
    if (paid.error) {
      problem(amountField.problem());
      return;
    }
    const shared = split.read();
    if (shared.error) {
      problem(shared.error);
      return;
    }
    dialog.close();
    replaceSpend(editSpend(getSpend(spend.id) || spend, lineId, {
      text: dialog.querySelector('#line-what').value,
      amount: paid.amount,
      currency: paid.currency,
      rate: paid.rate,
      by: dialog.querySelector('#line-by').value,
      forWhom: shared.forWhom,
      parts: shared.parts,
      fixed: shared.fixed,
      day: dialog.querySelector('#line-day').value,
    }));
  });

  dialog.querySelector('#line-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#line-delete').addEventListener('click', () => {
    dialog.close();
    replaceSpend(removeSpend(getSpend(spend.id) || spend, lineId));
  });

  dialog.showModal();
}

/**
 * A repayment: who gave back how much to whom, and when. Opened from a line
 * of "who pays whom", filled in with it — the amount stays editable, since a
 * debt is often paid back in more than one go — or from a repayment already
 * noted, to correct it or take it back.
 */
function openRepayDialog(spend, { move = null, line = null }) {
  const from = line ? line.by : move.fromId;
  const to = line ? line.forWhom[0] : move.toId;
  const amount = line ? line.amount : move.amount;
  const person = (id) => spend.people.find((one) => one.id === id)?.name || '';
  const choose = (id, selected) => `
    <select id="${id}">
      ${spend.people
        .map((one) => `<option value="${escapeHtml(one.id)}" ${one.id === selected ? 'selected' : ''}>${escapeHtml(one.name)}</option>`)
        .join('')}
    </select>`;

  const dialog = makeDialog();
  dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(line ? t('spends.repayment') : t('spends.repaid', { from: person(from), to: person(to) }))}</h2>
      ${
        line
          ? `<div class="field-row">
               <label>${escapeHtml(t('spends.repayFrom'))} ${choose('repay-from', from)}</label>
               <label>${escapeHtml(t('spends.repayTo'))} ${choose('repay-to', to)}</label>
             </div>`
          : `<p class="muted small">${escapeHtml(t('spends.repayHint'))}</p>`
      }
      <label>
        ${escapeHtml(t('spends.amount'))}
        <input type="text" id="repay-amount" inputmode="decimal" value="${escapeHtml((amount / 100).toFixed(2).replace('.', ','))}" />
      </label>
      <label>
        ${escapeHtml(t('spends.when'))}
        <input type="date" id="repay-day" value="${escapeHtml(line?.day || dayNow())}" />
      </label>
      <div class="row">
        <button type="button" class="button button--primary" id="repay-save">
          ${escapeHtml(line ? t('action.save') : t('spends.markPaid'))}
        </button>
        <button type="button" class="button" id="repay-cancel">${escapeHtml(t('action.cancel'))}</button>
        ${line ? `<button type="button" class="button button--danger" id="repay-delete">${escapeHtml(t('action.delete'))}</button>` : ''}
      </div>
    </form>`;

  dialog.querySelector('#repay-save').addEventListener('click', () => {
    const typed = dialog.querySelector('#repay-amount').value;
    const cents = readAmount(typed);
    const day = dialog.querySelector('#repay-day').value || dayNow();
    const payer = dialog.querySelector('#repay-from')?.value || from;
    const payee = dialog.querySelector('#repay-to')?.value || to;
    dialog.close();
    if (!cents) {
      flash(t('spends.notAnAmount'), 'error');
      render();
      return;
    }
    if (payer === payee) {
      flash(t('spends.repaySame'), 'error');
      render();
      return;
    }
    const current = getSpend(spend.id) || spend;
    replaceSpend(line
      ? editSpend(current, line.id, { amount: cents, by: payer, forWhom: [payee], day })
      : addRepayment(current, { from: payer, to: payee, amount: cents, day }));
  });
  dialog.querySelector('#repay-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#repay-delete')?.addEventListener('click', () => {
    dialog.close();
    replaceSpend(removeSpend(getSpend(spend.id) || spend, line.id));
  });

  dialog.showModal();
}

/**
 * Someone joins an account whose expenses for everyone are already noted:
 * do they share those too ('all'), or only what comes next ('next')? Null
 * when called off.
 */
function askLatecomer(name) {
  return new Promise((resolve) => {
    const dialog = makeDialog('dialog dialog--ask');
    dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(t('spends.lateTitle', { name }))}</h2>
        <p class="muted small">${escapeHtml(t('spends.lateHint', { name }))}</p>
        <div class="stack stack--tight">
          <button type="button" class="button" data-late="all">${escapeHtml(t('spends.lateAll'))}</button>
          <button type="button" class="button" data-late="next">${escapeHtml(t('spends.lateNext'))}</button>
          <button type="button" class="button button--ghost" data-late="">${escapeHtml(t('action.cancel'))}</button>
        </div>
      </div>`;
    let answer = null;
    dialog.querySelectorAll('[data-late]').forEach((button) => {
      button.addEventListener('click', () => {
        answer = button.dataset.late || null;
        dialog.close();
      });
    });
    dialog.addEventListener('close', () => resolve(answer));
    dialog.showModal();
  });
}

/**
 * Qui ce compte concerne : ajouter, renommer, retirer — quand c'est possible
 * —, et pour combien de parts chacun compte : un couple pour deux, une
 * famille pour quatre, un enfant pour moitié.
 */
function openSpendPeopleDialog(spend) {
  const held = () => getSpend(spend.id) || spend;
  openPeopleEditor({
    hint: t('spends.peoplePartsHint'),
    extra: {
      html: (person) => `
        <span class="stepper" role="group" aria-label="${escapeHtml(t('spends.partsOf', { name: person.name }))}">
          <button type="button" class="stepper__button" data-weight-step="-1" data-weight-of="${escapeHtml(person.id)}"
                  aria-label="${escapeHtml(t('spends.partsLess'))}">−</button>
          <span class="stepper__value">${escapeHtml(partsText(weightOf(person)))}</span>
          <button type="button" class="stepper__button" data-weight-step="1" data-weight-of="${escapeHtml(person.id)}"
                  aria-label="${escapeHtml(t('spends.partsMore'))}">+</button>
        </span>`,
      bind: (dialog, redraw) => {
        dialog.querySelectorAll('[data-weight-step]').forEach((button) => {
          button.addEventListener('click', () => {
            const current = held();
            const person = current.people.find((one) => one.id === button.dataset.weightOf);
            if (!person) return;
            replaceSpend(setSpendWeight(current, person.id, stepParts(weightOf(person), Number(button.dataset.weightStep))), { redraw: false });
            redraw();
            dialog.querySelector(`[data-weight-of="${CSS.escape(person.id)}"][data-weight-step="${button.dataset.weightStep}"]`)?.focus();
          });
        });
      },
    },
    confirmRemove: t('spends.confirmRemovePerson'),
    people: () => held().people,
    // Someone added once expenses for everyone are noted: from now on, or all along?
    add: async (name) => {
      if (!sharedWithEveryone(held())) {
        replaceSpend(addSpendPerson(held(), name), { redraw: false });
        return true;
      }
      const since = await askLatecomer(String(name).trim());
      if (!since) return false;
      replaceSpend((since === 'next' ? addLatecomer : addSpendPerson)(held(), name), { redraw: false });
      return true;
    },
    rename: (id, name) => replaceSpend(renameSpendPerson(held(), id, name), { redraw: false }),
    remove: (id) => replaceSpend(removeSpendPerson(held(), id), { redraw: false }),
    // Retirer un payeur déséquilibrerait le compte sans rien dire : mieux vaut
    // refuser en expliquant que rendre un remboursement faux.
    blocked: (id) => {
      const why = canRemovePerson(held(), id);
      if (why === 'ok') return null;
      return t({ paid: 'spends.cannotDropPaid', alone: 'spends.cannotDropAlone', apart: 'spends.cannotDropApart' }[why]);
    },
  });
}
