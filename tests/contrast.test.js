import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The colours that carry words, read from the tokens at the top of
// styles.css: night (the app's own look) and light (the moon button). Each
// pair of words and ground must reach 4.5:1, the WCAG level for body text.
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function tokens(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} not found`);
  const block = css.slice(start, css.indexOf('\n}', start));
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]));
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const PAIRS = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surface-alt'],
  ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-alt'],
  ['accent', 'bg'], ['accent', 'surface'], ['accent', 'accent-soft'], ['accent-text', 'accent'],
  ['good', 'surface'], ['bad', 'surface'],
];

for (const [name, selector] of [['night', ':root'], ['light', ":root[data-theme='light']"]]) {
  test(`${name}: every colour that carries words reads at 4.5:1 at least`, () => {
    const colours = tokens(selector);
    for (const [words, ground] of PAIRS) {
      assert.ok(colours[words] && colours[ground], `${name}: --${words} or --${ground} missing`);
      const ratio = contrast(colours[words], colours[ground]);
      assert.ok(ratio >= 4.5, `${name}: --${words} on --${ground} is ${ratio.toFixed(2)}:1`);
    }
  });
}
