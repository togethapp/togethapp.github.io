/**
 * How the app looks, chosen in Réglages → Apparence: a style (the hologram,
 * the first warm look, or a calm grey one), a colour, and night or light.
 *
 * Kept on this device with the other preferences, and written as attributes
 * on the root element that styles.css reads — `data-look`, `data-accent`, `data-theme`.
 * index.html sets them once more before the first paint, so that a phone on
 * the classic style does not flash the hologram while the app loads.
 *
 * Calls back into app.js only from inside functions.
 */

import { escapeHtml, render, state } from './app.js';
import { savePrefs } from './storage.js';
import { t } from './i18n.js';

/** The styles, the app's own first: it is the one with no attribute. */
export const LOOKS = ['holo', 'classic', 'calm'];

/** The colours one may choose over a style's own. */
export const LOOK_ACCENTS = ['cyan', 'violet', 'green', 'amber', 'pink', 'blue'];

/** Each style's own colour, the one shown under « Celle du style ». */
const LOOK_OWN_ACCENT = { holo: 'cyan', classic: 'amber', calm: 'blue' };

/** Night is the app's own; light is a choice, made here or with the moon. */
export function lookIsDark() {
  return state.prefs.theme !== 'light';
}

function chosenLook() {
  return LOOKS.includes(state.prefs.look) ? state.prefs.look : 'holo';
}

function chosenAccent() {
  return LOOK_ACCENTS.includes(state.prefs.accent) ? state.prefs.accent : '';
}

/** Write the choices on the root element; the phone's bar takes the page's colour. */
export function applyLook() {
  const root = document.documentElement;
  const theme = state.prefs.theme;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
  const look = chosenLook();
  if (look === 'holo') delete root.dataset.look;
  else root.dataset.look = look;
  const accent = chosenAccent();
  if (accent) root.dataset.accent = accent;
  else delete root.dataset.accent;
  const ground = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground || '#050b16');
}

/** Réglages → Apparence. */
export function lookHtml() {
  const look = chosenLook();
  const accent = chosenAccent();
  const dark = lookIsDark();
  const chip = (kind, value, label, on) => `
    <button type="button" class="chip ${on ? 'chip--on' : ''}" data-pick-${kind}="${escapeHtml(value)}"
            aria-pressed="${on ? 'true' : 'false'}">${escapeHtml(label)}</button>`;
  // A colour is shown as itself, in the theme on screen: the same token the
  // page would take, read from styles.css rather than written twice.
  const dot = (value, label) => `
    <button type="button" class="tint ${accent === value ? 'tint--on' : ''}" data-pick-accent="${escapeHtml(value)}"
            aria-pressed="${accent === value ? 'true' : 'false'}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
      <span class="tint__dot" style="--tint: var(--accent-${value || LOOK_OWN_ACCENT[look]})" aria-hidden="true">${value ? '' : 'A'}</span>
    </button>`;
  return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('look.title'))}</h2></div>
      <div class="stack stack--tight">
        <span class="muted small">${escapeHtml(t('look.style'))}</span>
        <div class="row row--chips" role="group" aria-label="${escapeHtml(t('look.style'))}">
          ${LOOKS.map((value) => chip('look', value, t(`look.${value}`), look === value)).join('')}
        </div>
        <span class="muted small">${escapeHtml(t('look.colour'))}</span>
        <div class="row row--chips tints" role="group" aria-label="${escapeHtml(t('look.colour'))}">
          ${dot('', t('look.accent.auto'))}
          ${LOOK_ACCENTS.map((value) => dot(value, t(`look.accent.${value}`))).join('')}
        </div>
        <span class="muted small">${escapeHtml(t('look.theme'))}</span>
        <div class="row row--chips" role="group" aria-label="${escapeHtml(t('look.theme'))}">
          ${chip('theme', 'dark', t('look.night'), dark)}
          ${chip('theme', 'light', t('look.light'), !dark)}
        </div>
        <p class="muted small">${escapeHtml(t('look.hint'))}</p>
      </div>
    </section>`;
}

/** One choice made: kept, applied at once, and the page redrawn to say so. */
function pickLook(change) {
  state.prefs = { ...state.prefs, ...change };
  savePrefs(state.prefs);
  applyLook();
  render();
}

export function bindLook(view) {
  view.querySelectorAll('[data-pick-look]').forEach((button) => {
    button.addEventListener('click', () => {
      const look = button.dataset.pickLook;
      pickLook({ look: look === 'holo' ? undefined : look });
    });
  });
  view.querySelectorAll('[data-pick-accent]').forEach((button) => {
    button.addEventListener('click', () => pickLook({ accent: button.dataset.pickAccent || undefined }));
  });
  view.querySelectorAll('[data-pick-theme]').forEach((button) => {
    button.addEventListener('click', () => pickLook({ theme: button.dataset.pickTheme }));
  });
}
