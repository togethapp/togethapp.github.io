/**
 * How the app looks, chosen in Réglages → Apparence: a style (the hologram,
 * the first warm look, a calm grey one, the sky, or the seasons), a colour,
 * a background, and night or light. And the language it speaks, chosen just
 * above (Réglages → Langue).
 *
 * Kept on this device with the other preferences, and written as attributes
 * on the root element that styles.css reads — `data-look`, `data-accent`,
 * `data-decor`, `data-season`, `data-theme`. index.html sets them once more
 * before the first paint, so that a phone on the classic style does not flash
 * the hologram while the app loads.
 *
 * Calls back into app.js only from inside functions.
 */

import { escapeHtml, render, state, switchLanguage } from './app.js';
import { savePrefs } from './storage.js';
import { skyMoonLine, skyMoonMask, skyMoonPhase, skySeason } from './sky.js';
import { getLanguage, t } from './i18n.js';

/** The styles, the app's own first: it is the one with no attribute. */
export const LOOKS = ['holo', 'classic', 'calm', 'astro', 'seasons'];

/** The colours one may choose, in the order of the rainbow. */
export const LOOK_ACCENTS = ['red', 'orange', 'amber', 'green', 'cyan', 'blue', 'violet', 'pink'];

/** What may move behind the page, besides the style's own. */
export const LOOK_DECORS = ['stars', 'aurora', 'season', 'confetti'];

/** Each style's own colour, the one shown under « Celle du style »; the seasons' changes with them. */
const LOOK_OWN_ACCENT = { holo: 'cyan', classic: 'amber', calm: 'blue', astro: 'violet' };
const SEASON_ACCENT = { spring: 'pink', summer: 'amber', autumn: 'orange', winter: 'blue' };

/** The background a style brings when none is chosen: the sky, the season — or its own pattern. */
const LOOK_OWN_DECOR = { astro: 'stars', seasons: 'season' };

/** A style's own colour, today: the seasons' is the season's. */
function ownAccent(look) {
  return look === 'seasons' ? SEASON_ACCENT[skySeason()] : LOOK_OWN_ACCENT[look];
}

/** Night is the app's own; light is a choice, made here or with the round button at the top. */
export function lookIsDark() {
  return state.prefs.theme !== 'light';
}

function chosenLook() {
  return LOOKS.includes(state.prefs.look) ? state.prefs.look : 'holo';
}

function chosenAccent() {
  return LOOK_ACCENTS.includes(state.prefs.accent) ? state.prefs.accent : '';
}

function chosenDecor() {
  return LOOK_DECORS.includes(state.prefs.decor) ? state.prefs.decor : '';
}

/** What is behind the page: the background chosen, or the style's own, or nothing moving. */
function shownDecor() {
  return chosenDecor() || LOOK_OWN_DECOR[chosenLook()] || '';
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
  root.dataset.season = skySeason();
  const decor = shownDecor();
  if (decor) root.dataset.decor = decor;
  else delete root.dataset.decor;
  // The moon, among the stars, as it is tonight: lit, or drawn on the chart.
  if (decor === 'stars') {
    const phase = skyMoonPhase();
    root.style.setProperty('--moon', skyMoonMask(phase));
    root.style.setProperty('--moon-line', skyMoonLine(phase));
  } else {
    root.style.removeProperty('--moon');
    root.style.removeProperty('--moon-line');
  }
  const ground = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground || '#050b16');
}

/**
 * Back in front, perhaps days later — an app on a phone's home screen is
 * resumed, not reloaded: the season may have turned, the moon has moved.
 * Says whether the season turned, for a page that names it to be redrawn.
 */
export function refreshSky() {
  const turned = document.documentElement.dataset.season !== skySeason();
  applyLook();
  return turned;
}

/**
 * Each language by its own name, whatever the app speaks: someone who does
 * not read the one on screen still finds theirs. Chosen here, once — a button
 * for it at the top of every page took the room of what is used every day.
 */
const LANGUAGE_NAMES = { fr: 'Français', en: 'English' };

/** Réglages → Langue, titled in both languages for the same reason. */
export function languageHtml() {
  const on = getLanguage();
  return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('lang.title'))}</h2></div>
      <div class="row row--chips" role="group" aria-label="${escapeHtml(t('lang.title'))}">
        ${Object.entries(LANGUAGE_NAMES).map(([value, name]) => `
          <button type="button" class="chip ${on === value ? 'chip--on' : ''}" data-pick-lang="${value}" lang="${value}"
                  aria-pressed="${on === value ? 'true' : 'false'}">${escapeHtml(name)}</button>`).join('')}
      </div>
    </section>`;
}

/** Réglages → Apparence. */
export function lookHtml() {
  const look = chosenLook();
  const accent = chosenAccent();
  const decor = chosenDecor();
  const shown = shownDecor();
  const season = skySeason();
  const dark = lookIsDark();
  const chip = (kind, value, label, on) => `
    <button type="button" class="chip ${on ? 'chip--on' : ''}" data-pick-${kind}="${escapeHtml(value)}"
            aria-pressed="${on ? 'true' : 'false'}">${escapeHtml(label)}</button>`;
  // A colour is shown as itself, in the theme on screen: the same token the
  // page would take, read from styles.css rather than written twice.
  //
  // The style's own colour is one of the dots, not a dot of its own beside
  // them — that showed the same colour twice. Picking it means « the style's
  // own »: no colour is kept, and changing style changes the colour with it.
  // A colour kept that the season has since come round to is still kept,
  // and named plainly: it will not follow the next season.
  const own = ownAccent(look);
  const tint = accent || own;
  const name = (value) => (value === own && !accent ? t('look.accent.own', { name: t(`look.accent.${value}`) }) : t(`look.accent.${value}`));
  const dot = (value) => `
    <button type="button" class="tint ${tint === value ? 'tint--on' : ''}" data-pick-accent="${value === own ? '' : escapeHtml(value)}"
            aria-pressed="${tint === value ? 'true' : 'false'}" aria-label="${escapeHtml(name(value))}" title="${escapeHtml(name(value))}">
      <span class="tint__dot" style="--tint: var(--accent-${value})" aria-hidden="true"></span>
    </button>`;
  // What the background on screen is, when there is something to say: the
  // season it follows, the moon it shows.
  const about = [
    shown === 'season' ? t('look.seasonNow', { season: t(`look.season.${season}`) }) : '',
    shown === 'stars' ? t('look.moonNow') : '',
    shown ? t('look.decorStill') : '',
  ].filter(Boolean).join(' ');
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
          ${LOOK_ACCENTS.map(dot).join('')}
        </div>
        <span class="muted small" id="look-colour-name">${escapeHtml(name(tint))}</span>
        <span class="muted small">${escapeHtml(t('look.decor'))}</span>
        <div class="row row--chips" role="group" aria-label="${escapeHtml(t('look.decor'))}">
          ${['', ...LOOK_DECORS].map((value) => chip('decor', value, t(`look.decor.${value || 'own'}`), decor === value)).join('')}
        </div>
        ${about ? `<span class="muted small" id="look-decor-about">${escapeHtml(about)}</span>` : ''}
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
      // A colour kept that is the new style's own is the style's own: no
      // need to keep it, and the seasons' would otherwise stop changing.
      const kept = state.prefs.accent === ownAccent(look) ? undefined : state.prefs.accent;
      pickLook({ look: look === 'holo' ? undefined : look, accent: kept });
    });
  });
  view.querySelectorAll('[data-pick-accent]').forEach((button) => {
    button.addEventListener('click', () => pickLook({ accent: button.dataset.pickAccent || undefined }));
  });
  view.querySelectorAll('[data-pick-decor]').forEach((button) => {
    button.addEventListener('click', () => pickLook({ decor: button.dataset.pickDecor || undefined }));
  });
  view.querySelectorAll('[data-pick-theme]').forEach((button) => {
    button.addEventListener('click', () => pickLook({ theme: button.dataset.pickTheme }));
  });
  view.querySelectorAll('[data-pick-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.pickLang !== getLanguage()) switchLanguage(button.dataset.pickLang);
    });
  });
}
