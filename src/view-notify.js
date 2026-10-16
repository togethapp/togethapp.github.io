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
import { keyBytes, mayBeNews, pushSupport, rememberTold, subscriptionFields, toldKey } from './notify.js';
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

/** This browser's subscription, made with the database's key if there is none yet. */
async function subscribe(registration) {
  const held = await registration.pushManager.getSubscription();
  if (held) return held;
  const answer = await state.remote.notifier({ action: 'key' });
  if (!answer?.key) throw new Error('no key');
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(answer.key) });
}

/** Hand the subscription to the database, once per group. */
async function register(subscription) {
  const fields = subscriptionFields(subscription.toJSON());
  if (!fields) throw new Error('no subscription');
  for (const group of groups()) {
    await state.remote.pushSubscribe(group.key, fields, getLanguage(), appAddress()).catch(() => null);
  }
}

/* ---------------------------------------------------------------- screen --- */

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
      ? `<div class="row"><button type="button" class="button button--small button--primary" id="notify-on">${escapeHtml(t('notify.enable'))}</button></div>`
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
    const permission = await Notification.requestPermission().catch(() => 'denied');
    if (permission !== 'granted') {
      flash(t('notify.refused'), 'error');
      render();
      return;
    }
    try {
      const registration = await worker();
      if (!registration) throw new Error('no worker');
      await register(await subscribe(registration));
    } catch (error) {
      flash(t(/no key|404/.test(String(error?.message)) ? 'notify.notReady' : 'notify.failed'), 'error');
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
