/**
 * Notifications on this device: turned on in the settings, and told to the
 * notifier (supabase/functions/notifier) whenever this device writes
 * something that may be news for its group, or knocks at one.
 *
 * Turning them on asks the phone, subscribes the browser with the database's
 * public key, and hands the subscription to the database once per group, with
 * that group's key — so a key cut off stops the notifications too.
 *
 * Calls back into app.js and the other views only from inside functions.
 */

import { escapeHtml, flash, render, state, view } from './app.js';
import { getLanguage, t } from './i18n.js';
import {
  activationProblem, keyBytes, mayBeNews, problemDetail, pushSupport, rememberTold, subscriptionFields, toldKey,
} from './notify.js';
import { savePrefs } from './storage.js';
import { groups, onHomeScreen } from './view-groups.js';
import { phoneToInstall } from './view-install.js';

const TOLD = 'marque-points:told:v1';

/** What this browser can do with notifications. */
function support() {
  const served = Boolean(document.querySelector('link[rel="manifest"]'));
  return pushSupport({
    worker: served && 'serviceWorker' in navigator,
    push: 'PushManager' in window,
    notification: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'default',
    phone: phoneToInstall(),
    standalone: onHomeScreen(),
  });
}

function isOn() {
  return Boolean(state.prefs.push) && support() === 'ready' && Notification.permission === 'granted';
}

/** The app's own address, for a notification to open. */
function appAddress() {
  return `${location.origin}${location.pathname}`;
}

/** The service worker, within a few seconds, or null. */
async function worker() {
  if (!('serviceWorker' in navigator)) return null;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
  ]);
}

/** Throw `error` on, saying which step of turning notifications on it stopped. */
function stopAt(step, error) {
  const stop = error instanceof Error ? error : new Error(String(error));
  stop.step = stop.step || step;
  throw stop;
}

/** This browser's subscription, made with the database's key if there is none yet. */
async function subscribe(registration) {
  const held = await registration.pushManager.getSubscription();
  if (held) return held;
  const answer = await state.remote.notifier({ action: 'key' }).catch((error) => stopAt('key', error));
  // Answered, but not with a key: a function of that name that is not this one.
  if (!answer?.key) stopAt('key', Object.assign(new Error('no key'), { status: 200 }));
  return registration.pushManager
    .subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(answer.key) })
    .catch((error) => stopAt('subscribe', error));
}

/**
 * Hand the subscription to the database, once per group. Answers what each
 * group said — the database's answer, or the error on the way.
 */
async function register(subscription) {
  const fields = subscriptionFields(subscription.toJSON());
  if (!fields) stopAt('subscribe', new Error('no keys in the subscription'));
  const said = [];
  for (const group of groups()) {
    said.push(await state.remote.pushSubscribe(group.key, fields, getLanguage(), appAddress()).catch((error) => error));
  }
  return said;
}

/**
 * Whether the database itself answers, the notifier aside: a call to the
 * notifier that got no answer the page could read is then the notifier's
 * fault, not the network's.
 */
async function databaseAnswers() {
  if (navigator.onLine === false) return false;
  const [group] = groups();
  if (!group) return false;
  try {
    await state.remote.groupOf(group.key);
    return true;
  } catch (error) {
    return Boolean(error?.status);
  }
}

/**
 * Subscribe this browser and hand the subscription to the database. Answers
 * null when done, or why not: { reason, detail } — the reason one of
 * activationProblem's, the detail what the browser or the database said.
 */
async function turnOn() {
  try {
    const registration = await worker();
    if (!registration) return { reason: activationProblem('worker'), detail: '' };
    const said = await register(await subscribe(registration));
    if (said.some((one) => one?.status === 'ok')) return null;
    return { reason: activationProblem('register', said), detail: problemDetail(said[0]) };
  } catch (error) {
    const answers = error?.step === 'key' && !error.status ? await databaseAnswers() : true;
    return { reason: activationProblem(error?.step, error, answers), detail: problemDetail(error) };
  }
}

/* ---------------------------------------------------------------- screen --- */

/** What to read for each reason turning them on can fail (notify.js). */
const PROBLEMS = {
  worker: 'notify.worker',
  offline: 'notify.offline',
  function: 'notify.notReady',
  database: 'notify.database',
  denied: 'notify.denied',
  browser: 'notify.browser',
  account: 'notify.account',
  refused: 'notify.kept',
  failed: 'notify.failed',
};

/** Why the last try failed, by the button that tries again: what to do, then what was said. */
function problemHtml() {
  const problem = state.notifyProblem;
  if (!problem) return '';
  // Brave turns Google's push service off: it refuses every subscription.
  const reason = problem.reason === 'browser' && 'brave' in navigator ? 'notify.brave' : PROBLEMS[problem.reason];
  return `
      <p class="banner banner--warn" id="notify-problem">${escapeHtml(t(reason || PROBLEMS.failed))}</p>
      ${problem.detail ? `<p class="muted small">${escapeHtml(t('notify.detail', { detail: problem.detail }))}</p>` : ''}`;
}

/** The settings section. */
export function notifyHtml() {
  if (!state.remote) return '';
  const can = support();
  const on = isOn();
  let body = '';
  if (on) {
    body = `
      <p class="small">${escapeHtml(t('notify.on'))}</p>
      <div class="row"><button type="button" class="button button--small button--ghost" id="notify-off">${escapeHtml(t('notify.disable'))}</button></div>`;
  } else if (can === 'ready') {
    body = groups().length
      ? `${problemHtml()}
      <div class="row"><button type="button" class="button button--small button--primary" id="notify-on">${escapeHtml(t('notify.enable'))}</button></div>`
      : `<p class="muted small">${escapeHtml(t('notify.noGroup'))}</p>`;
  } else {
    body = `<p class="muted small">${escapeHtml(t(`notify.${can}`))}</p>`;
  }
  return `
    <section class="section" id="notify">
      <div class="section__head"><h2>${escapeHtml(t('notify.title'))}</h2></div>
      <p class="muted small">${escapeHtml(t('notify.why'))}</p>
      ${body}
    </section>`;
}

export function bindNotify() {
  view.querySelector('#notify-on')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    state.notifyProblem = null;
    const permission = await Notification.requestPermission().catch(() => 'denied');
    if (permission !== 'granted') {
      flash(t('notify.refused'), 'error');
      render();
      return;
    }
    // Said where the button is, and kept there: a banner at the top of the
    // page would be out of sight, and gone before the reason was read.
    state.notifyProblem = await turnOn();
    if (state.notifyProblem) {
      render();
      return;
    }
    state.prefs = { ...state.prefs, push: true };
    savePrefs(state.prefs);
    flash(t('notify.enabled'));
    render();
  });
  view.querySelector('#notify-off')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    try {
      const registration = await worker();
      const held = await registration?.pushManager.getSubscription();
      if (held) {
        await state.remote.pushUnsubscribe(held.endpoint).catch(() => null);
        await held.unsubscribe().catch(() => null);
      }
    } catch {
      // Turned off here all the same; the database forgets it at the next send.
    }
    state.prefs = { ...state.prefs, push: false };
    savePrefs(state.prefs);
    flash(t('notify.disabled'));
    render();
  });
}

/**
 * On opening, and after joining a group: the database holds this device's
 * subscription for every group it is in — a new group, a key made anew, a
 * subscription the browser renewed.
 */
export async function syncPush() {
  if (!state.remote || !isOn()) return;
  try {
    const registration = await worker();
    if (registration) await register(await subscribe(registration));
  } catch {
    // Tried again at the next opening.
  }
}

/* --------------------------------------------------------------- telling --- */

function told() {
  try {
    const list = JSON.parse(localStorage.getItem(TOLD) || '[]');
    return Array.isArray(list) ? list.filter((one) => typeof one === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * A document written with a group key: the notifier decides whether that is
 * news (new, or a day settled) and for whom. Asked once per document and day,
 * whatever this device's own notifications.
 */
export async function tell(document_, key) {
  if (!state.remote || !key || !mayBeNews(document_)) return;
  const said = toldKey(document_);
  if (told().includes(said)) return;
  try {
    await state.remote.notifier({ action: 'doc', key, id: document_.id });
  } catch (error) {
    // No network: asked again at the next write. Anything else — no notifier
    // in this database — is not worth asking again for the same thing.
    if (!error?.status) return;
  }
  try {
    localStorage.setItem(TOLD, JSON.stringify(rememberTold(told(), said)));
  } catch {
    // No storage: the notifier tells each piece of news once anyway.
  }
}

/** Someone knocked from this device: the group's door-keepers hear of it. */
export function tellKnock(ticket) {
  if (!state.remote || !ticket) return;
  state.remote.notifier({ action: 'knock', ticket }).catch(() => null);
}
