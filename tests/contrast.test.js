import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The colours that carry words, read from the tokens at the top of
// styles.css, in every style (hologram, classic, calm, astronomy, and each of
// the four seasons), every colour one may choose (and the style's own), night
// and light. Each pair of words and ground must reach 4.5:1, the WCAG level
// for body text — and so must words standing on the backgrounds that move
// behind the page, below.
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} not found`);
  const body = css.slice(start, css.indexOf('\n}', start));
  return Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6}|var\(--[a-z-]+\)|\d+%)\s*;/gi)].map((m) => [m[1], m[2]]));
}

const night = block(':root');
const light = block(":root[data-theme='light']");
const looks = {
  holo: [{}, {}],
  classic: [block(":root[data-look='classic']"), block(":root[data-look='classic'][data-theme='light']")],
  calm: [block(":root[data-look='calm']"), block(":root[data-look='calm'][data-theme='light']")],
  astro: [block(":root[data-look='astro']"), block(":root[data-look='astro'][data-theme='light']")],
};
// The seasons' style shares a block, then each season has its own.
const seasonsNight = block(":root[data-look='seasons']");
const seasonsLight = block(":root[data-look='seasons'][data-theme='light']");
for (const season of ['spring', 'summer', 'autumn', 'winter']) {
  looks[`seasons/${season}`] = [
    { ...seasonsNight, ...block(`:root[data-look='seasons']:where([data-season='${season}'])`) },
    { ...seasonsLight, ...block(`:root[data-look='seasons'][data-theme='light']:where([data-season='${season}'])`) },
  ];
}
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

/** The tokens of a style, theme and colour, in the order styles.css applies them. */
function tokensOf(look, theme, choice) {
  const [lookNight, lookLight] = looks[look];
  const tokens = { ...night, ...(theme === 'light' ? light : {}), ...lookNight, ...(theme === 'light' ? lookLight : {}) };
  if (choice !== 'own') {
    tokens.accent = `var(--accent-${choice})`;
    tokens['holo-hue'] = `var(--night-${choice})`;
  }
  return tokens;
}

test('there are colours to choose, and each has a night and a light shade', () => {
  assert.ok(accents.length >= 6, accents.join());
  for (const name of accents) assert.ok(/^#/.test(light[`accent-${name}`] || ''), `--accent-${name} has no light shade`);
});

for (const look of Object.keys(looks)) {
  for (const theme of ['night', 'light']) {
    test(`${look}, ${theme}: every colour that carries words reads at 4.5:1 at least, whatever the colour`, () => {
      for (const choice of ['own', ...accents]) {
        const tokens = tokensOf(look, theme, choice);
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

/* --- the backgrounds -------------------------------------------------------- */

// Their colours, as the layer behind the page defines them: --p-… the pieces
// (a star, a flake, a leaf, a confetti), --g-… the glows (a veil of aurora, a
// nebula, the moon), each made faint by a token the style sets.
const layer = css.indexOf(':root[data-decor] .decor {');
assert.ok(layer >= 0, 'the backgrounds’ layer is not found');
const decor = Object.fromEntries([...css.slice(layer, css.indexOf('\n}', layer)).matchAll(/--([pg]-[a-z]+):\s*([^;]+);/g)]
  .map((m) => [m[1], m[2].trim()]));

/** The top-level arguments of a CSS function's text. */
function args(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') depth -= 1;
    else if (text[i] === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

/**
 * A colour as `color-mix(in srgb, …)` makes it — with its alpha, and colour
 * mixed with alpha the way the browser does, premultiplied.
 */
function paint(value, tokens) {
  value = value.trim();
  if (value === 'transparent') return { rgb: [0, 0, 0], alpha: 0 };
  if (/^#[0-9a-f]{6}$/i.test(value)) return { rgb: [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)), alpha: 1 };
  const named = value.match(/^var\(--([a-z-]+)\)$/);
  if (named) {
    assert.ok(tokens[named[1]], `--${named[1]} is not defined`);
    return paint(tokens[named[1]], tokens);
  }
  const mixed = value.match(/^color-mix\(in srgb,([\s\S]*)\)$/);
  assert.ok(mixed, `cannot read ${value}`);
  const [first, second] = args(mixed[1]);
  const share = first.match(/\s(\d+%|var\(--[a-z-]+\))$/);
  assert.ok(share, `no share in ${first}`);
  const amount = parseFloat(resolve(tokens, share[1])) / 100;
  const a = paint(first.slice(0, share.index), tokens);
  const b = paint(second, tokens);
  const alpha = a.alpha * amount + b.alpha * (1 - amount);
  const rgb = alpha ? a.rgb.map((c, i) => (c * a.alpha * amount + b.rgb[i] * b.alpha * (1 - amount)) / alpha) : [0, 0, 0];
  return { rgb, alpha };
}

/** A colour with its alpha laid on an opaque ground, as a hex colour. */
function laid({ rgb, alpha }, ground) {
  const under = [1, 3, 5].map((i) => parseInt(ground.slice(i, i + 2), 16));
  return `#${rgb.map((c, i) => Math.round(c * alpha + under[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
}

test('the backgrounds have pieces and glows to draw', () => {
  const names = Object.keys(decor);
  assert.ok(names.filter((name) => name.startsWith('p-')).length >= 8, names.join());
  assert.ok(names.filter((name) => name.startsWith('g-')).length >= 3, names.join());
});

for (const look of Object.keys(looks)) {
  for (const theme of ['night', 'light']) {
    test(`${look}, ${theme}: words stay readable on the backgrounds, whatever the colour`, () => {
      for (const choice of ['own', ...accents]) {
        const tokens = tokensOf(look, theme, choice);
        const named = choice === 'own' ? tokens.accent.match(/--accent-([a-z]+)/)[1] : choice;
        const colour = (name) => resolve(tokens, `var(--${name})`);
        const words = { text: colour('text'), muted: colour('muted'), accent: resolve(tokens, tokens[`accent-${named}`]) };
        // Under a background the page's ground is its plain colour: the
        // style's own pattern and haze give way (styles.css), and nothing is
        // drawn over a glow — the moon is in front of the stars, and two veils
        // of the aurora never add up to more than one at its brightest.
        const ground = colour('bg');
        for (const [name, value] of Object.entries(decor)) {
          // On light, the moon is a line, drawn like the pieces (--p-light).
          if (name === 'g-moon' && theme === 'light') continue;
          const under = laid(paint(value, tokens), ground);
          // A piece is smaller than a letter, and keeps moving: the words in
          // the text's colour stay at 4.5:1 over it. A glow is as large as a
          // line of words: every colour of words does.
          const shown = name.startsWith('p-') ? ['text'] : Object.keys(words);
          for (const kind of shown) {
            const ratio = contrast(words[kind], under);
            assert.ok(ratio >= 4.5, `${look}/${theme}/${choice}: --${kind} over --${name} is ${ratio.toFixed(2)}:1`);
          }
        }
      }
    });
  }
}

// What Réglages calls each style's own colour — the dot marked « celle du
// style », for the seasons the season's — is the colour styles.css gives it.
test('the colour the settings call the style’s own is the one the style has', () => {
  const look = readFileSync(new URL('../src/view-look.js', import.meta.url), 'utf8');
  const table = (name) => {
    const found = look.match(new RegExp(`const ${name} = (\\{[^}]*\\});`));
    assert.ok(found, `${name} not found in view-look.js`);
    return Object.fromEntries([...found[1].matchAll(/(\w+): '(\w+)'/g)].map((m) => [m[1], m[2]]));
  };
  const owns = table('LOOK_OWN_ACCENT');
  const seasons = table('SEASON_ACCENT');
  const accentOf = (tokens) => tokens.accent.match(/--accent-([a-z]+)/)[1];
  assert.equal(owns.holo, accentOf(night));
  for (const name of ['classic', 'calm', 'astro']) assert.equal(owns[name], accentOf(looks[name][0]), name);
  for (const season of ['spring', 'summer', 'autumn', 'winter']) assert.equal(seasons[season], accentOf(looks[`seasons/${season}`][0]), season);
});

/* --- the people's initials -------------------------------------------------- */

// A person's initial, on a card, sits on a disc of one of the colours one may
// choose, in its night shade whatever the theme (app.js, peopleHtml).
test('a person’s initial reads at 4.5:1 on every colour a face may take', () => {
  const start = css.indexOf('\n.face {');
  assert.ok(start >= 0, 'the faces’ rule is not found');
  const ink = css.slice(start, css.indexOf('\n}', start + 1)).match(/\n\s*color:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(ink, 'the faces have no ink of their own');
  for (const name of accents) {
    const ratio = contrast(ink, night[`night-${name}`]);
    assert.ok(ratio >= 4.5, `an initial on --night-${name} is ${ratio.toFixed(2)}:1`);
  }
});
