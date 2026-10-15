/**
 * L'onglet 3D : tout ce que l'appareil tient, en trois dimensions. L'onglet
 * est dans la barre, le dessin se fait, un doigt le tourne, toucher un point
 * dit ce que c'est et ouvre sa page. Sans rien, une phrase.
 *
 * SHOTS=<dossier> : y laisse des captures, pour regarder.
 */
import { chromium } from 'playwright';
import { createPoll, addOptions, createEvent } from '../../src/polls.js';
import { createList, addItems } from '../../src/lists.js';
import { createSpend } from '../../src/spends.js';
import { createGame } from '../../src/model.js';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const SHOTS = process.env.SHOTS || '';

const mifa = { groupId: 'grp_famille', shared: true };
const copains = { groupId: 'grp_copains', shared: true };
const noel = { ...createEvent({ name: 'Noël', names: ['Gui', 'Alice', 'Léa'], date: '2026-12-24', at: '19:00' }), ...mifa };
const courses = { ...addItems(createList({ name: 'Courses de Noël', names: ['Gui', 'Alice'] }), 'Dinde\nMarrons'), ...mifa, parent: noel.id };
const cadeaux = { ...createSpend({ name: 'Cadeaux', names: ['Gui', 'Léa'] }), ...mifa, parent: noel.id, links: [{ id: courses.id, kind: 'with' }] };
const soir = { ...addOptions(createPoll({ question: 'Quel soir ?', names: ['Gui', 'Bob', 'Chloé'] }), 'Vendredi\nSamedi'), ...copains };
const bieres = { ...addItems(createList({ name: 'Bières', names: ['Bob'] }), 'Blonde'), ...copains };
const partie = createGame({ presetId: 'papayoo', names: ['Gui', 'Bob', 'Zoé'] });

const seed = {
  'marque-points:prefs:v1': {
    me: 'Gui',
    groups: [
      { id: 'grp_famille', name: 'Mifa', key: 'la-cle-famille', admits: true },
      { id: 'grp_copains', name: 'Copains', key: 'la-cle-copains', admits: true },
    ],
  },
  'marque-points:polls:v1': [noel, soir],
  'marque-points:lists:v1': [courses, bieres],
  'marque-points:spends:v1': [cadeaux],
  'marque-points:games:v1': [partie],
  'marque-points:remote:v1': { url: 'http://127.0.0.1:8123', key: 'test-anon-key' },
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function open(width, height, data, scheme = 'light') {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'fr-FR', colorScheme: scheme });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e.message)));
  await page.addInitScript((stored) => {
    for (const [k, v] of Object.entries(stored)) if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(v));
  }, data);
  await page.goto('http://localhost:8099/dist/marque-points.html');
  await page.waitForSelector('.app-bar');
  return page;
}

/** How many pixels of the canvas are not blank. */
const inked = (page) => page.evaluate(() => {
  const canvas = document.getElementById('universe-canvas');
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) count += 1;
  return count;
});

const page = await open(390, 800, seed);
const tabs = (await page.locator('.tab').allTextContents()).map((s) => s.trim());
check('l’onglet 3D est dans la barre', tabs.join(' / ') === 'Accueil / Agenda / 3D / Groupes / Réglages', tabs.join(' / '));
const plus = await page.locator('#create').boundingBox();
check('le « + » reste au milieu', Math.abs(plus.x + plus.width / 2 - 195) < 3, JSON.stringify(plus));

await page.click('[data-tab="universe"]');
await page.waitForSelector('#universe-canvas');
await page.waitForTimeout(400);
check('l’adresse est #/3d', page.url().endsWith('#/3d'), page.url());
check('l’onglet est allumé', (await page.locator('.tab[aria-current]').textContent()).trim() === '3D');
check('le titre', (await page.locator('h1').textContent()).trim() === 'Tout, en 3D');
check('les nombres', (await page.locator('#view').textContent()).includes('6 documents · 6 personnes'));
const first = await inked(page);
check('le dessin est fait', first > 2000, String(first));
if (SHOTS) await page.screenshot({ path: `${SHOTS}/univers-clair.png`, fullPage: true });

// Arrêter, puis un doigt qui glisse : l'image change.
await page.click('#universe-spin');
check('« Arrêter » devient « Faire tourner »', (await page.locator('#universe-spin').textContent()).trim() === 'Faire tourner');
const box = await page.locator('#universe-canvas').boundingBox();
const before = await page.locator('#universe-canvas').screenshot();
await page.mouse.move(box.x + 100, box.y + 100);
await page.mouse.down();
await page.mouse.move(box.x + 220, box.y + 140, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(100);
const after = await page.locator('#universe-canvas').screenshot();
check('glisser tourne la vue', !before.equals(after));

// Toucher le point d'un groupe : son nom, et de quoi l'ouvrir.
const spot = await page.evaluate(() => document.getElementById('universe-canvas').universeSpot('Mifa'));
if (spot) {
  await page.mouse.click(box.x + spot.x, box.y + spot.y);
  await page.waitForTimeout(100);
  const said = await page.locator('#universe-picked').textContent();
  check('toucher un point dit ce que c’est', said.includes('Mifa') && said.includes('Groupe'), said.trim());
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/univers-choisi.png`, fullPage: true });
  await page.click('#universe-open');
  await page.waitForTimeout(200);
  check('« Ouvrir » mène au groupe', page.url().endsWith('#/group/grp_famille'), page.url());
} else {
  check('un point se trouve', false);
}

// Une pastille de groupe : seulement ce groupe.
await page.goto('http://localhost:8099/dist/marque-points.html#/3d');
await page.waitForSelector('#universe-canvas');
await page.click('[data-group-filter="grp_copains"]');
await page.waitForTimeout(200);
check('une pastille garde un seul groupe', (await page.locator('#view').textContent()).includes('2 documents · 3 personnes'));
await page.click('[data-group-filter=""]');

// Sombre, et petit écran.
const dark = await open(320, 640, seed, 'dark');
await dark.goto('http://localhost:8099/dist/marque-points.html#/3d');
await dark.waitForSelector('#universe-canvas');
await dark.waitForTimeout(300);
check('rien ne déborde sur 320 px', (await dark.evaluate(() => document.documentElement.scrollWidth)) <= 320);
const cut = await dark.evaluate(() => [...document.querySelectorAll('.tab > span')]
  .filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.textContent));
check('aucun nom d’onglet n’est coupé sur 320 px', cut.length === 0, cut.join(', '));
if (SHOTS) await dark.screenshot({ path: `${SHOTS}/univers-sombre-320.png`, fullPage: true });

// Rien sur l'appareil : une phrase, pas de toile.
const empty = await open(390, 800, { 'marque-points:prefs:v1': { me: 'Gui' } });
await empty.goto('http://localhost:8099/dist/marque-points.html#/3d');
await empty.waitForSelector('h1');
check('sans rien, une phrase et pas de dessin',
  (await empty.locator('#universe-canvas').count()) === 0 && (await empty.locator('#view').textContent()).includes('Rien à voir'));

check('aucune erreur de script', errors.length === 0, errors.join(' | '));
await browser.close();

const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log('ÉCHEC:', r.n, r.d);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
