/** Tiny translation layer. `t('key', {count: 3})` interpolates {placeholders}. */

import { FR } from './lang-fr.js';
import { EN } from './lang-en.js';

/**
 * The words of each language. In the published app only the one in use comes
 * with it (tools/bundle.js), the other is fetched once chosen: loadLanguage().
 */
export const STRINGS = { fr: FR, en: EN };

export const LANGUAGES = Object.keys(STRINGS);

let current = 'fr';

export function detectLanguage() {
  const candidates = typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language];
  for (const tag of candidates) {
    if (!tag) continue;
    const base = tag.toLowerCase().split('-')[0];
    if (LANGUAGES.includes(base)) return base;
  }
  return 'fr';
}

export function setLanguage(lang) {
  current = LANGUAGES.includes(lang) ? lang : 'fr';
  return current;
}

/**
 * Make sure the words of `lang` are here; resolves once they are.
 *
 * Served from src/, or in the single-file build, both languages are always
 * here and this resolves at once. The published app comes with only the one
 * in use: index.html starts fetching dist/lang-<lang>.js before the app itself
 * (the <script data-lang> it adds), and another language chosen in Réglages is
 * fetched here, the same way. The file sets `TOGETHER_STRINGS[lang]`.
 */
export function loadLanguage(lang) {
  const take = () => (STRINGS[lang] ||= globalThis.TOGETHER_STRINGS?.[lang]);
  if (!LANGUAGES.includes(lang)) return Promise.reject(new Error(`No such language: ${lang}`));
  if (take()) return Promise.resolve(lang);
  return new Promise((resolve, reject) => {
    let script = document.querySelector(`script[data-lang="${lang}"]`);
    // One that failed already — offline, before the cache held it — is tried again.
    if (script?.dataset.failed) {
      script.remove();
      script = null;
    }
    if (!script) {
      script = document.createElement('script');
      script.src = new URL(`lang-${lang}.js`, globalThis.TOGETHER_PARTS_AT || document.baseURI).href;
      script.dataset.lang = lang;
      document.head.append(script);
    }
    script.addEventListener('load', () => (take() ? resolve(lang) : reject(new Error(`No words in lang-${lang}.js`))));
    script.addEventListener('error', () => {
      script.dataset.failed = '1';
      reject(new Error(`Could not fetch lang-${lang}.js`));
    });
  });
}

export function getLanguage() {
  return current;
}

export function t(key, params = {}) {
  const template = STRINGS[current]?.[key] ?? STRINGS.fr?.[key] ?? key;
  return template
    .replace(/\{(\w+)\|([^|{}]*)\|([^|{}]*)\}/g, (match, name, one, many) =>
      Object.prototype.hasOwnProperty.call(params, name) ? (isOne(params[name]) ? one : many) : match,
    )
    .replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
    );
}

/**
 * Whether a count takes the singular: « 0 ligne, 1 ligne, 2 lignes » in
 * French, "0 lines, 1 line, 2 lines" in English.
 */
function isOne(count) {
  const n = Math.abs(Number(count));
  return current === 'en' ? n === 1 : n < 2;
}
