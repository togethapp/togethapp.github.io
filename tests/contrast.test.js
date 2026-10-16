import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The colours that carry words, read from the tokens at the top of
// styles.css, in every style (hologram, classic, calm), every colour one may
// choose (and the style's own), night and light. Each pair of words and ground
// must reach 4.5:1, the WCAG level for body text.
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} not found`);
  const body = css.slice(start, css.indexOf('\n}', start));
  return Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6}|var\(--[a-z-]+\))\s*;/gi)].map((m) => [m[1], m[2]]));
}

const night = block(':root');
const light = block(":root[data-theme='light']");
const looks = {
  holo: [{}, {}],
  classic: [block(":root[data-look='classic']"), block(":root[data-look='classic'][data-theme='light']")],
  calm: [block(":root[data-look='calm']"), block(":root[data-look='calm'][data-theme='light']")],
};
const accents = Object.keys(night).filter((name) => /^accent-/.test(name) && !/^accent-(text|soft)$/.test(name))
  .map((name) => name.slice('accent-'.length));

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** A token's colour, following `var(--…)` until a colour comes. */
function resolve(tokens, value) {
  for (let step = 0; step < 5 && /^var\(/.test(value || ''); step += 1) value = tokens[value.match(/--([a-z-]+)/)[1]];
  return value;
}

/** `--accent-soft` as styles.css makes it: 14% of the colour into the surface. */
function soft(accent, surface) {
  const channel = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(channel(accent, i) * 0.14 + channel(surface, i) * 0.86)
    .toString(16).padStart(2, '0')).join('')}`;
}

const PAIRS = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surface-alt'],
  ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-alt'],
  ['accent', 'bg'], ['accent', 'surface'], ['accent', 'surface-alt'], ['accent', 'accent-soft'], ['accent-text', 'accent'],
  ['good', 'surface'], ['bad', 'surface'],
];

test('there are colours to choose, and each has a night and a light shade', () => {
  assert.ok(accents.length >= 6, accents.join());
  for (const name of accents) assert.ok(/^#/.test(light[`accent-${name}`] || ''), `--accent-${name} has no light shade`);
});

for (const [look, [lookNight, lookLight]] of Object.entries(looks)) {
  for (const theme of ['night', 'light']) {
    test(`${look}, ${theme}: every colour that carries words reads at 4.5:1 at least, whatever the colour`, () => {
      // The cascade, in the order styles.css applies it.
      const tokens = { ...night, ...(theme === 'light' ? light : {}), ...lookNight, ...(theme === 'light' ? lookLight : {}) };
      for (const choice of ['own', ...accents]) {
        const named = choice === 'own' ? tokens.accent.match(/--accent-([a-z]+)/)[1] : choice;
        const colours = Object.fromEntries(Object.keys(tokens).map((name) => [name, resolve(tokens, tokens[name])]));
        colours.accent = resolve(tokens, tokens[`accent-${named}`]);
        colours['accent-soft'] = soft(colours.accent, colours.surface);
        for (const [words, ground] of PAIRS) {
          assert.ok(/^#/.test(colours[words] || '') && /^#/.test(colours[ground] || ''), `${look}/${theme}/${choice}: --${words} or --${ground} missing`);
          const ratio = contrast(colours[words], colours[ground]);
          assert.ok(ratio >= 4.5, `${look}/${theme}/${choice}: --${words} on --${ground} is ${ratio.toFixed(2)}:1`);
        }
      }
    });
  }
}
