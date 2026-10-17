/**
 * The sky the backgrounds draw: which season it is, and what the moon looks
 * like tonight. Pure — a date in, an answer out; view-look.js writes them on
 * the page, styles.css draws them.
 *
 * Both are the northern half of the Earth's, where the app is used: there,
 * spring starts at the March equinox and the moon is lit from the right while
 * it waxes.
 */

/** The seasons, in the year's order. */
export const SKY_SEASONS = ['spring', 'summer', 'autumn', 'winter'];

/**
 * The season on a day: from the equinoxes and solstices, which fall within a
 * day of 20 March, 21 June, 22 September and 21 December. index.html says the
 * same before the first paint (tests/sky.test.js checks the two agree).
 */
export function skySeason(date = new Date()) {
  const day = (date.getMonth() + 1) * 100 + date.getDate();
  if (day >= 1221 || day < 320) return 'winter';
  if (day < 621) return 'spring';
  if (day < 922) return 'summer';
  return 'autumn';
}

/** A new moon: 6 January 2000, 18:14 UTC. */
const SKY_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

/** One lunation, new moon to new moon, in days, as it is on average. */
const SKY_LUNATION = 29.530588853;

/**
 * Where the moon is in its round, from 0 (new) through 0.5 (full) to 1: right
 * within a day, the length of a lunation wandering a little round its mean.
 */
export function skyMoonPhase(time = Date.now()) {
  const days = (time - SKY_NEW_MOON) / 86400000;
  return (((days / SKY_LUNATION) % 1) + 1) % 1;
}

/**
 * The moon in a phase, on a disc of radius 20 in a box of 48: the edge of its
 * shadow, from its foot to its top — an ellipse bulging towards the light for
 * a crescent, away from it once past the quarter —, and its lit side, a half
 * disc that this edge closes.
 */
function skyMoonShape(phase) {
  const cos = Math.cos(phase * 2 * Math.PI);
  const waxing = phase < 0.5;
  const crescent = cos > 0;
  const edge = `A${Math.round(Math.abs(cos) * 2000) / 100} 20 0 0 ${waxing === crescent ? 0 : 1} 24 4`;
  return { edge, lit: `M24 4A20 20 0 0 ${waxing ? 1 : 0} 24 44${edge}Z` };
}

const skyMask = (inner) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'>${inner}</svg>`)}")`;

/** The moon as a CSS mask: its lit part whole, the rest faint, the way earthshine shows it. */
export function skyMoonMask(phase) {
  return skyMask(`<circle cx='24' cy='24' r='20' fill-opacity='.2'/><path d='${skyMoonShape(phase).lit}'/>`);
}

/** The moon of a star chart: its outline and the edge of its shadow, as lines. */
export function skyMoonLine(phase) {
  return skyMask(`<g fill='none' stroke='black' stroke-width='1.6'><circle cx='24' cy='24' r='20'/><path d='M24 44${skyMoonShape(phase).edge}'/></g>`);
}
