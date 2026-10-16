/**
 * Réglages → Apparence : un style (Hologramme, Classique, Épuré), une couleur
 * (celle du style, ou une des six), nuit ou clair. Le choix s'applique tout
 * de suite, reste après un rechargement — avant même que l'app ne démarre —,
 * et le bouton rond du haut dit la même chose que les réglages.
 *
 * SHOTS=<dossier> : y laisse des captures, pour regarder.
 */
import { chromium } from 'playwright';
import { createList, addItems } from '../../src/lists.js';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const SHOTS = process.env.SHOTS || '';
const B = 'http://localhost:8099/dist/marque-points.html';

const liste = addItems(createList({ name: 'Courses', names: ['Gui'] }), 'Pain\nLait');
const seed = {
  'marque-points:prefs:v1': { me: 'Gui' },
  'marque-points:lists:v1': [liste],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e.message)));
await page.addInitScript((stored) => {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  for (const [k, v] of Object.entries(stored)) localStorage.setItem(k, JSON.stringify(v));
}, seed);

const root = () => page.evaluate(() => ({ ...document.documentElement.dataset }));
const token = (name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const pressed = async (selector) => (await page.locator(selector).getAttribute('aria-pressed')) === 'true';
const settle = () => page.waitForTimeout(150);

await page.goto(`${B}#/settings`);
await page.waitForSelector('[data-pick-look]');

check('une section Apparence dans les réglages', /Apparence/.test(await page.locator('#view').textContent()));
check('trois styles, sept couleurs, deux thèmes',
  (await page.locator('[data-pick-look]').count()) === 3 && (await page.locator('[data-pick-accent]').count()) === 7
  && (await page.locator('[data-pick-theme]').count()) === 2);
check('d’origine : hologramme, sa couleur, la nuit',
  await pressed('[data-pick-look="holo"]') && await pressed('[data-pick-accent=""]') && await pressed('[data-pick-theme="dark"]'));
check('et rien d’écrit sur la page', JSON.stringify(await root()) === '{}', JSON.stringify(await root()));
check('le fond de nuit de l’hologramme', (await token('--bg')) === '#050b16', await token('--bg'));
if (SHOTS) await page.screenshot({ path: `${SHOTS}/apparence-holo.png`, fullPage: true });

await page.click('[data-pick-look="classic"]');
await settle();
check('Classique s’applique tout de suite', (await root()).look === 'classic' && (await token('--bg')) === '#17150f', JSON.stringify(await root()));
check('le bouton dit qu’il est choisi', await pressed('[data-pick-look="classic"]'));
check('sa couleur à lui : l’ambre', (await token('--accent')) === '#f2b14d', await token('--accent'));
check('la vue 3D de l’Accueil prend la même lumière', (await token('--holo-hue')) === '#f2b14d', await token('--holo-hue'));
const titleCase = await page.locator('.section__head h2').first().evaluate((n) => getComputedStyle(n).textTransform);
check('ses titres ne sont plus en capitales', titleCase === 'none', titleCase);
const tick = await page.locator('.section__head h2').first().evaluate((n) => getComputedStyle(n, '::before').display);
check('ni précédés d’un trait de lumière', tick === 'none', tick);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/apparence-classique.png`, fullPage: true });

await page.click('[data-pick-accent="violet"]');
await settle();
check('une couleur choisie passe avant celle du style', (await root()).accent === 'violet' && (await token('--accent')) === '#b9a0ff', await token('--accent'));
const primary = await page.locator('.button--primary, .chip--on').first().evaluate((n) => getComputedStyle(n).borderColor);
check('et se voit sur la page', primary === 'rgb(185, 160, 255)', primary);

await page.click('[data-pick-theme="light"]');
await settle();
check('Clair : le papier du style classique', (await root()).theme === 'light' && (await token('--bg')) === '#f6f4ef', await token('--bg'));
check('la couleur en clair, assez foncée pour se lire', (await token('--accent')) === '#6a3fcf', await token('--accent'));
check('la vue 3D garde la nuance de nuit, son écran restant sombre', (await token('--holo-hue')) === '#b9a0ff', await token('--holo-hue'));
check('la barre du téléphone prend la couleur de la page',
  (await page.locator('meta[name="theme-color"]').getAttribute('content')) === '#f6f4ef');
if (SHOTS) await page.screenshot({ path: `${SHOTS}/apparence-classique-clair-violet.png`, fullPage: true });

// Après un rechargement : déjà là avant que l'app ne démarre.
await page.goto(`${B}?n=2#/settings`, { waitUntil: 'commit' });
const early = await page.evaluate(() => new Promise((resolve) => {
  const read = () => ({ ...document.documentElement.dataset });
  if (document.readyState === 'loading') document.addEventListener('readystatechange', () => resolve(read()), { once: true });
  else resolve(read());
}));
check('après un rechargement, le choix est là d’emblée', early.look === 'classic' && early.accent === 'violet' && early.theme === 'light', JSON.stringify(early));
await page.waitForSelector('[data-pick-look]');
check('et les réglages le disent', await pressed('[data-pick-look="classic"]') && await pressed('[data-pick-accent="violet"]') && await pressed('[data-pick-theme="light"]'));

// Le bouton rond du haut : la nuit, et les réglages suivent.
await page.click('#theme-toggle');
await settle();
check('le bouton rond repasse en nuit', (await root()).theme === 'dark' && (await token('--bg')) === '#17150f');
check('les réglages suivent', await pressed('[data-pick-theme="dark"]'));

await page.click('[data-pick-look="calm"]');
await settle();
await page.click('[data-pick-accent=""]');
await settle();
check('Épuré, avec sa couleur à lui', (await root()).look === 'calm' && !(await root()).accent && (await token('--accent')) === '#7ab8ff',
  `${JSON.stringify(await root())} ${await token('--accent')}`);
if (SHOTS) {
  await page.goto(`${B}#/list/${liste.id}`);
  await page.waitForSelector('.lines');
  await page.screenshot({ path: `${SHOTS}/apparence-epure-liste.png` });
  await page.goto(`${B}#/settings`);
  await page.waitForSelector('[data-pick-look]');
}

await page.click('[data-pick-look="holo"]');
await settle();
check('retour à l’hologramme : plus rien d’écrit pour le style', !(await root()).look && (await token('--bg')) === '#050b16');

// Un autre onglet de l'app change le style : celui-ci suit, sans rechargement.
const other = await context.newPage();
await other.goto(`${B}#/settings`);
await other.waitForSelector('[data-pick-look]');
await other.click('[data-pick-look="classic"]');
await page.waitForTimeout(400);
check('un autre onglet change le style : celui-ci suit', (await root()).look === 'classic', JSON.stringify(await root()));
await other.click('[data-pick-look="holo"]');
await page.waitForTimeout(400);
await other.close();

// Rechargé en clair : la barre du téléphone a la bonne couleur dès l'en-tête.
await page.click('[data-pick-theme="light"]');
await settle();
await page.goto(`${B}?n=3#/settings`, { waitUntil: 'commit' });
const bar = await page.evaluate(() => new Promise((resolve) => {
  const read = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
  if (document.readyState === 'loading') document.addEventListener('readystatechange', () => resolve(read()), { once: true });
  else resolve(read());
}));
check('rechargé en clair, la barre du téléphone est claire d’emblée', bar === '#eaf1f8', bar);
await page.waitForSelector('[data-pick-theme]');
await page.click('[data-pick-theme="dark"]');
await settle();

// En anglais, les mêmes choix.
await page.click('#lang-toggle');
await settle();
check('en anglais', /Appearance/.test(await page.locator('#view').textContent()) && /Hologram/.test(await page.locator('#view').textContent()));

check('aucune erreur de script', errors.length === 0, errors.join(' | '));
await browser.close();

const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log('ÉCHEC:', r.n, r.d);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
