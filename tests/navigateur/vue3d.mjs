/**
 * La vue d'ensemble en 3D, en tête de l'Accueil : chaque groupe une étoile,
 * ses éléments en orbite, ce qui est rattaché à un événement autour de lui.
 * Aucune personne dans le ciel. Elle se dessine, un doigt la tourne sans
 * empêcher de faire défiler la page, toucher un point dit ce que c'est et
 * l'ouvre, le plein écran va et revient. Sans rien, pas de vue.
 *
 * Sans base partagée : ce qui est dans le ciel est ce que la suite y met.
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
const B = 'http://localhost:8099/dist/marque-points.html';

const mifa = { groupId: 'grp_famille', shared: true };
const copains = { groupId: 'grp_copains', shared: true };
const noel = { ...createEvent({ name: 'Noël', names: ['Gui', 'Alice', 'Léa'], date: '2027-12-24', at: '19:00' }), ...mifa };
const courses = { ...addItems(createList({ name: 'Courses de Noël', names: ['Gui', 'Alice'] }), 'Dinde\nMarrons'), ...mifa, parent: noel.id };
const cadeaux = { ...createSpend({ name: 'Cadeaux', names: ['Gui', 'Léa'] }), ...mifa, parent: noel.id, links: [{ id: courses.id, kind: 'with' }] };
const soir = { ...addOptions(createPoll({ question: 'Quel soir ?', names: ['Gui', 'Bob', 'Chloé'] }), 'Vendredi\nSamedi'), ...copains };
const bieres = { ...addItems(createList({ name: 'Bières', names: ['Bob'] }), 'Blonde'), ...copains };
const partie = createGame({ presetId: 'papayoo', names: ['Gui', 'Bob', 'Zoé'] });
const people = ['Gui', 'Alice', 'Léa', 'Bob', 'Chloé', 'Zoé'];

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
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function open(width, height, data, { scheme = 'light', motion = 'no-preference', lang = 'fr' } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, locale: lang === 'fr' ? 'fr-FR' : 'en-GB', colorScheme: scheme, reducedMotion: motion,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e.message)));
  await page.addInitScript(([stored, language]) => {
    for (const [k, v] of Object.entries(stored)) if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(v));
    const prefs = JSON.parse(localStorage.getItem('marque-points:prefs:v1'));
    localStorage.setItem('marque-points:prefs:v1', JSON.stringify({ ...prefs, lang: language }));
  }, [data, lang]);
  await page.goto(B);
  await page.waitForSelector('.app-bar');
  return page;
}

/** How many pixels of the canvas are not blank. */
const inked = (page) => page.evaluate(() => {
  const canvas = document.getElementById('holo-canvas');
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) count += 1;
  return count;
});
const spot = (page, label) => page.evaluate((name) => document.getElementById('holo-canvas').holoSpot(name), label);
const tapOn = async (page, label) => {
  const box = await page.locator('#holo-canvas').boundingBox();
  const at = await spot(page, label);
  if (!at) return false;
  await page.mouse.click(box.x + at.x, box.y + at.y);
  await page.waitForTimeout(120);
  return true;
};

/* --- sur l'Accueil -------------------------------------------------------- */

const page = await open(390, 700, seed);
await page.waitForSelector('#holo-canvas');
await page.waitForTimeout(1700);
const tabs = (await page.locator('.tab').allTextContents()).map((s) => s.trim());
check('toujours quatre onglets', tabs.join(' / ') === 'Accueil / Agenda / Groupes / Réglages', tabs.join(' / '));
check('la vue est sur l’Accueil', (await page.locator('.tab[aria-current]').textContent()).trim() === 'Accueil');
const order = await page.evaluate(() => {
  const kinds = document.querySelector('.segmented--kinds');
  const holo = document.getElementById('holo');
  return Boolean(kinds.compareDocumentPosition(holo) & Node.DOCUMENT_POSITION_FOLLOWING);
});
check('sous la rangée des sortes, en tête', order);
const readout = (await page.locator('.holo__readout').textContent()).trim();
check('les nombres', readout === '6 éléments · 2 groupes · 1 lien', readout);
check('le dessin est fait', (await inked(page)) > 5000);
const labels = await page.evaluate(() => document.getElementById('holo-canvas').holoLabels());
check('chaque élément et chaque groupe est dans le ciel',
  ['Mifa', 'Copains', 'Hors groupe', 'Courses de Noël', 'Cadeaux', 'Quel soir ?', 'Bières'].every((name) => labels.includes(name)),
  labels.join(', '));
check('aucune personne dans le ciel', !labels.some((name) => people.includes(name)), labels.join(', '));
check('7 points en tout : 3 étoiles, 6 éléments… et pas un de plus', labels.length === 9, String(labels.length));
if (SHOTS) await page.screenshot({ path: `${SHOTS}/vue3d-accueil.png` });

// Ça tourne tout seul.
const a = await page.locator('#holo-canvas').screenshot();
await page.waitForTimeout(400);
const b = await page.locator('#holo-canvas').screenshot();
check('le ciel tourne tout seul', !a.equals(b));

// Toucher une étoile : son nom, et le chemin vers son groupe.
check('l’étoile Mifa se trouve', await tapOn(page, 'Mifa'));
let card = await page.locator('#holo-card').textContent();
check('toucher une étoile dit ce que c’est', card.includes('Groupe') && card.includes('Mifa') && card.includes('3 éléments'), card.trim());
const still1 = await page.locator('#holo-canvas').screenshot({ animations: 'disabled' });
await page.waitForTimeout(300);
const pickedHub = await spot(page, 'Mifa');
await page.waitForTimeout(300);
const pickedHub2 = await spot(page, 'Mifa');
check('ce qui est choisi ne bouge plus', JSON.stringify(pickedHub) === JSON.stringify(pickedHub2));
if (SHOTS) await page.screenshot({ path: `${SHOTS}/vue3d-choisi.png` });
void still1;

// Un nouveau dessin de l'Accueil (une pastille) garde le choix.
await page.click('[data-group-filter=""]');
await page.waitForTimeout(250);
card = await page.locator('#holo-card').textContent();
check('le choix survit à un nouveau dessin de l’Accueil', card.includes('Mifa'), card.trim());

await page.click('#holo-open');
await page.waitForTimeout(250);
check('« Ouvrir » mène au groupe', page.url().endsWith('#/group/grp_famille'), page.url());

// Un élément rattaché : « pour Noël », et sa page.
await page.click('[data-tab="home"]');
await page.waitForSelector('#holo-canvas');
await page.waitForTimeout(300);
check('revenir sur l’Accueil ne garde pas l’ancien choix', await page.locator('#holo-card').isHidden());
await page.click('#holo-spin');
await page.waitForTimeout(100);
check('un élément se trouve', await tapOn(page, 'Courses de Noël'));
card = await page.locator('#holo-card').textContent();
check('il dit sa sorte et à quoi il est rattaché', card.includes('Liste') && card.includes('pour Noël') && card.includes('Mifa') && card.includes('1 lien'), card.trim());
await page.click('#holo-open');
await page.waitForTimeout(250);
check('« Ouvrir » mène à la liste', page.url().endsWith(`#/list/${courses.id}`), page.url());

// Glisser tourne ; la molette, elle, fait défiler la page.
await page.click('[data-tab="home"]');
await page.waitForSelector('#holo-canvas');
await page.waitForTimeout(300);
const box = await page.locator('#holo-canvas').boundingBox();
const before = await page.locator('#holo-canvas').screenshot();
await page.mouse.move(box.x + 80, box.y + 120);
await page.mouse.down();
await page.mouse.move(box.x + 220, box.y + 130, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(100);
check('glisser tourne le ciel', !before.equals(await page.locator('#holo-canvas').screenshot()));
await page.mouse.move(box.x + 150, box.y + 100);
await page.mouse.wheel(0, 400);
await page.waitForTimeout(250);
check('la molette sur la vue fait défiler la page', (await page.evaluate(() => window.scrollY)) > 50, String(await page.evaluate(() => window.scrollY)));
const style = await page.locator('#holo-canvas').evaluate((node) => getComputedStyle(node).touchAction);
check('un doigt qui glisse de haut en bas fait défiler la page', style === 'pan-y', style);
await page.evaluate(() => window.scrollTo(0, 0));

/* --- plein écran ---------------------------------------------------------- */

await page.click('#holo-full');
await page.waitForTimeout(300);
const full = await page.locator('#holo').boundingBox();
check('le plein écran couvre l’écran', full.x === 0 && full.y === 0 && full.width === 390 && Math.abs(full.height - 700) < 2, JSON.stringify(full));
check('la page dessous ne défile plus', (await page.evaluate(() => getComputedStyle(document.body).overflow)) === 'hidden');
check('la légende des couleurs y est', await page.locator('.holo__legend').isVisible());
check('le bouton dit comment en sortir', (await page.locator('#holo-full').getAttribute('aria-label')) === 'Quitter le plein écran');
if (SHOTS) await page.screenshot({ path: `${SHOTS}/vue3d-plein-ecran.png` });
const zoomA = await page.locator('#holo-canvas').screenshot();
await page.mouse.move(195, 350);
await page.mouse.wheel(0, -300);
await page.waitForTimeout(150);
check('la molette y rapproche', !zoomA.equals(await page.locator('#holo-canvas').screenshot()));
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
check('Échap quitte le plein écran', !(await page.locator('#holo').evaluate((node) => node.classList.contains('holo--full'))));
check('et rend la page', (await page.evaluate(() => getComputedStyle(document.body).overflow)) !== 'hidden');

// Ouvrir depuis le plein écran rend la page aussi.
await page.click('#holo-full');
await page.waitForTimeout(200);
await tapOn(page, 'Copains');
await page.click('#holo-open');
await page.waitForTimeout(250);
check('ouvrir depuis le plein écran mène au groupe', page.url().endsWith('#/group/grp_copains'), page.url());
check('et la page n’est plus figée', (await page.evaluate(() => getComputedStyle(document.body).overflow)) !== 'hidden');
await page.goBack();
await page.waitForSelector('#holo-canvas');
await page.waitForTimeout(200);
check('l’Accueil revient en petit', !(await page.locator('#holo').evaluate((node) => node.classList.contains('holo--full'))));

/* --- une pastille, l'anglais, le sombre, un petit écran ------------------- */

await page.click('[data-group-filter="grp_copains"]');
await page.waitForTimeout(250);
const only = (await page.locator('.holo__readout').textContent()).trim();
check('une pastille ne garde que son groupe', only === '2 éléments · 1 groupe', only);
await page.click('[data-group-filter=""]');

const english = await open(390, 800, seed, { lang: 'en', scheme: 'dark' });
await english.waitForSelector('#holo-canvas');
const said = (await english.locator('.holo__readout').textContent()).trim();
check('en anglais', said === '6 items · 2 groups · 1 link' && (await english.locator('.holo__title').textContent()).includes('3D overview'), said);
if (SHOTS) await english.screenshot({ path: `${SHOTS}/vue3d-sombre-en.png` });

const small = await open(320, 640, seed);
await small.waitForSelector('#holo-canvas');
check('rien ne déborde sur 320 px', (await small.evaluate(() => document.documentElement.scrollWidth)) <= 320);
if (SHOTS) await small.screenshot({ path: `${SHOTS}/vue3d-320.png` });

// Moins d'animations demandées : immobile, et le bouton le dit.
const calm = await open(390, 800, seed, { motion: 'reduce' });
await calm.waitForSelector('#holo-canvas');
await calm.waitForTimeout(300);
const c1 = await calm.locator('#holo-canvas').screenshot();
await calm.waitForTimeout(500);
check('immobile quand on demande moins d’animations', c1.equals(await calm.locator('#holo-canvas').screenshot()));
check('le bouton propose de remettre en mouvement', (await calm.locator('#holo-spin').getAttribute('aria-label')) === 'Remettre en mouvement');

// Rien sur l'appareil, ou que des choses rangées : pas de vue.
const empty = await open(390, 800, { 'marque-points:prefs:v1': { me: 'Gui' } });
await empty.waitForTimeout(300);
check('sans rien, pas de vue', (await empty.locator('#holo').count()) === 0);
const archived = await open(390, 800, {
  ...seed,
  'marque-points:polls:v1': [], 'marque-points:spends:v1': [], 'marque-points:games:v1': [],
  'marque-points:lists:v1': [{ ...bieres, archivedAt: Date.now() }],
});
await archived.waitForTimeout(300);
check('que des choses rangées : pas de vue', (await archived.locator('#holo').count()) === 0);

check('aucune erreur de script', errors.length === 0, errors.join(' | '));
await browser.close();

const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log('ÉCHEC:', r.n, r.d);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
