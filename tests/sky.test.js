import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { SKY_SEASONS, skySeason, skyMoonPhase, skyMoonMask, skyMoonLine } from '../src/sky.js';

test('the seasons turn at the equinoxes and solstices', () => {
  const on = (month, day) => skySeason(new Date(2026, month - 1, day, 12));
  assert.equal(on(1, 1), 'winter');
  assert.equal(on(3, 19), 'winter');
  assert.equal(on(3, 20), 'spring');
  assert.equal(on(6, 20), 'spring');
  assert.equal(on(6, 21), 'summer');
  assert.equal(on(9, 21), 'summer');
  assert.equal(on(9, 22), 'autumn');
  assert.equal(on(12, 20), 'autumn');
  assert.equal(on(12, 21), 'winter');
  assert.equal(on(12, 31), 'winter');
  assert.deepEqual([...SKY_SEASONS].sort(), ['autumn', 'spring', 'summer', 'winter']);
});

// The script that sets the look before the first paint, from index.html, run
// on its own: a page, a storage, and a clock of our choosing.
const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const early = page.match(/<script id="early-look">([\s\S]*?)<\/script>/)[1];

function firstPaint(prefs, when = new Date(2026, 9, 17, 9)) {
  const dataset = {};
  class Clock extends Date {
    constructor(...given) {
      super(...(given.length ? given : [when.getTime()]));
    }
  }
  runInNewContext(early, {
    Date: Clock,
    localStorage: { getItem: () => (prefs ? JSON.stringify(prefs) : null) },
    document: { documentElement: { dataset }, querySelector: () => null },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
  });
  return dataset;
}

test('before the first paint, the season is the one src/sky.js tells, every day of the year', () => {
  for (let day = 0; day < 366; day += 1) {
    const when = new Date(2028, 0, 1 + day, 8);
    assert.equal(firstPaint(null, when).season, skySeason(when), when.toDateString());
  }
});

test('before the first paint, the style brings its background, unless another is chosen', () => {
  assert.deepEqual(firstPaint({ look: 'astro' }), { season: 'autumn', look: 'astro', decor: 'stars' });
  assert.deepEqual(firstPaint({ look: 'seasons', theme: 'light' }), { season: 'autumn', theme: 'light', look: 'seasons', decor: 'season' });
  assert.deepEqual(firstPaint({ look: 'astro', decor: 'confetti', accent: 'green' }), { season: 'autumn', look: 'astro', accent: 'green', decor: 'confetti' });
  assert.deepEqual(firstPaint({ decor: 'aurora' }), { season: 'autumn', decor: 'aurora' });
  // The hologram, and anything unknown, write nothing but the season.
  assert.deepEqual(firstPaint({}), { season: 'autumn' });
  assert.deepEqual(firstPaint({ look: 'holo', decor: 'fireworks', accent: 'gold' }), { season: 'autumn' });
});

test('the moon is new and full when eclipses say it was', () => {
  // Total eclipses of the sun (a new moon) and of the moon (a full moon).
  const fromNew = (time) => Math.min(skyMoonPhase(time), 1 - skyMoonPhase(time));
  assert.ok(fromNew(Date.UTC(2017, 7, 21, 18, 26)) < 0.04, String(skyMoonPhase(Date.UTC(2017, 7, 21, 18, 26))));
  assert.ok(fromNew(Date.UTC(2024, 3, 8, 18, 18)) < 0.04, String(skyMoonPhase(Date.UTC(2024, 3, 8, 18, 18))));
  assert.ok(Math.abs(skyMoonPhase(Date.UTC(2025, 2, 14, 6, 59)) - 0.5) < 0.04, String(skyMoonPhase(Date.UTC(2025, 2, 14, 6, 59))));
  for (const time of [0, Date.UTC(1990, 5, 1), Date.now(), Date.UTC(2100, 0, 1)]) {
    const phase = skyMoonPhase(time);
    assert.ok(phase >= 0 && phase < 1, String(phase));
  }
});

/** The SVG inside a mask, as the page receives it. */
function drawn(mask) {
  const inner = mask.match(/^url\("data:image\/svg\+xml,([^"]*)"\)$/);
  assert.ok(inner, mask);
  return decodeURIComponent(inner[1]);
}

test('the moon is lit from the right while it waxes, from the left while it wanes', () => {
  // The lit half first — right or left —, then the edge of the shadow: at the
  // quarters a straight line, whichever way an arc of no width would turn.
  assert.match(drawn(skyMoonMask(0.25)), /d='M24 4A20 20 0 0 1 24 44A0 20 0 0 [01] 24 4Z'/);
  assert.match(drawn(skyMoonMask(0.75)), /d='M24 4A20 20 0 0 0 24 44A0 20 0 0 [01] 24 4Z'/);
  // A crescent: the edge bulges towards the light, leaving a sliver…
  assert.match(drawn(skyMoonMask(0.1)), /d='M24 4A20 20 0 0 1 24 44A16\.18 20 0 0 0 24 4Z'/);
  assert.match(drawn(skyMoonMask(0.9)), /d='M24 4A20 20 0 0 0 24 44A16\.18 20 0 0 1 24 4Z'/);
  // … and past the quarter, away from it, lighting more than half.
  assert.match(drawn(skyMoonMask(0.4)), /d='M24 4A20 20 0 0 1 24 44A16\.18 20 0 0 1 24 4Z'/);
  assert.match(drawn(skyMoonMask(0.6)), /d='M24 4A20 20 0 0 0 24 44A16\.18 20 0 0 0 24 4Z'/);
  // Full: both halves, round one way and back round the other; new: nothing
  // lit, only the faint disc.
  assert.match(drawn(skyMoonMask(0.499)), /d='M24 4A20 20 0 0 1 24 44A20 20 0 0 1 24 4Z'/);
  assert.match(drawn(skyMoonMask(0.5)), /d='M24 4A20 20 0 0 ([01]) 24 44A20 20 0 0 \1 24 4Z'/);
  assert.match(drawn(skyMoonMask(0)), /d='M24 4A20 20 0 0 1 24 44A20 20 0 0 0 24 4Z'/);
  assert.match(drawn(skyMoonMask(0)), /<circle cx='24' cy='24' r='20' fill-opacity='.2'\/>/);
});

test('the moon of a chart is its outline and the edge of its shadow', () => {
  const chart = drawn(skyMoonLine(0.1));
  assert.match(chart, /fill='none' stroke='black'/);
  assert.match(chart, /<circle cx='24' cy='24' r='20'\/>/);
  assert.match(chart, /d='M24 44A16\.18 20 0 0 0 24 4'/);
  // Nothing in either that could close the url("…") it is written in.
  for (const mask of [skyMoonMask(0.3), skyMoonLine(0.6)]) assert.ok(!/["\\]/.test(mask.slice(5, -2)), mask);
});
