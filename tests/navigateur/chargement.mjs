/**
 * La première ouverture, sur l'app publiée (index.html, pas le fichier
 * unique) : un seul fichier pour l'app, la langue utilisée seulement, et la
 * vue 3D et l'arcade chargées quand on les ouvre — pas avant.
 *
 * Sans service worker : il irait chercher tout le reste en arrière-plan pour
 * le hors-ligne, et l'on ne verrait plus ce que l'écran a demandé lui-même.
 */
import { chromium } from 'playwright';
import { createList, addItems } from '../../src/lists.js';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const B = 'http://localhost:8099/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function open({ locale = 'fr-FR', seed = {}, route } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, locale, serviceWorkers: 'block' });
  await ctx.addInitScript((data) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [key, value] of Object.entries(data)) localStorage.setItem(key, JSON.stringify(value));
  }, seed);
  if (route) await route(ctx);
  const page = await ctx.newPage();
  const asked = [];
  page.on('request', (request) => asked.push(new URL(request.url()).pathname));
  page.on('pageerror', (e) => errors.push(String(e.message)));
  return { ctx, page, asked };
}
const fetched = (asked, name) => asked.some((path) => path.endsWith(`/dist/${name}`));

/* --- en anglais, rien dans l'app ---------------------------------------- */

{
  const { ctx, page, asked } = await open({ locale: 'en-US' });
  await page.goto(B);
  await page.waitForSelector('#view *');
  await page.waitForTimeout(400);
  check('l’app arrive en un seul fichier', fetched(asked, 'app.js') && !asked.some((path) => path.includes('/src/')),
    asked.filter((path) => path.endsWith('.js')).join(' '));
  check('avec la langue du téléphone seulement', fetched(asked, 'lang-en.js') && !fetched(asked, 'lang-fr.js'));
  const tab = await page.locator('[data-tab="home"]').textContent();
  check('et l’écran est en anglais, pas en clés', tab.trim() === 'Home' && !/\b(tab|home|action)\.[a-z]/.test(await page.locator('#view').innerText()), tab);
  check('ni la 3D ni l’arcade ne sont chargées d’avance', !fetched(asked, 'holo.js') && !fetched(asked, 'arcade.js'));

  await page.goto(`${B}#/games`);
  await page.waitForSelector('.arcade-card');
  check('l’onglet Jeux montre les jeux sans charger l’arcade', !fetched(asked, 'arcade.js'));
  await page.locator('.arcade-card').first().click();
  await page.waitForSelector('#arcade-board', { timeout: 10000 });
  check('ouvrir un jeu charge l’arcade, et le jeu s’affiche', fetched(asked, 'arcade.js'));

  await page.goto(`${B}#/settings`);
  await page.locator('[data-pick-lang="fr"]').click();
  await page.waitForFunction(() => document.querySelector('[data-tab="home"]')?.textContent.trim() === 'Accueil', null, { timeout: 10000 })
    .catch(() => {});
  check('choisir le français va le chercher, et l’app le parle', fetched(asked, 'lang-fr.js')
    && (await page.locator('[data-tab="home"]').textContent()).trim() === 'Accueil');
  await ctx.close();
}

/* --- des éléments : la 3D vient après l'Accueil, à sa place --------------- */

const courses = addItems(createList({ name: 'Courses', names: ['Gui', 'Alice'] }), 'Pain\nLait');
const seed = { 'marque-points:prefs:v1': { me: 'Gui' }, 'marque-points:lists:v1': [courses] };
{
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const { ctx, page, asked } = await open({
    seed,
    route: (ctx) => ctx.route('**/dist/holo.js', async (route) => {
      await held;
      await route.continue();
    }),
  });
  await page.goto(B, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#holo-wait', { timeout: 10000 });
  const before = await page.locator('#holo-wait').boundingBox();
  check('l’Accueil s’affiche sans attendre la 3D, sa place gardée', before && before.height > 150,
    JSON.stringify(before));
  check('la 3D est demandée seulement quand l’Accueil a de quoi la montrer', fetched(asked, 'holo.js'));
  release();
  await page.waitForSelector('#holo-canvas', { timeout: 10000 });
  const after = await page.locator('#holo').boundingBox();
  check('puis elle se dessine à sa place, à la même hauteur',
    !(await page.locator('#holo-wait').count()) && Math.abs(after.height - before.height) < 4, `${before.height} → ${after.height}`);
  await ctx.close();
}

/* --- hors réseau : un jeu qui ne vient pas le dit ------------------------- */

{
  const { ctx, page } = await open({ route: (ctx) => ctx.route('**/dist/arcade.js', (route) => route.abort()) });
  await page.goto(`${B}#/arcade/snake`);
  await page.waitForFunction(() => location.hash === '#/games', null, { timeout: 10000 }).catch(() => {});
  const flash = await page.locator('.banner').first().textContent().catch(() => '');
  check('un jeu qui n’a pas pu venir ramène aux Jeux, et le dit',
    (await page.evaluate(() => location.hash)) === '#/games' && /réseau/.test(flash), flash);
  await ctx.close();
}

check('aucune erreur dans la page', errors.length === 0, errors.join(' | '));
await browser.close();

const bad = results.filter((r) => !r.ok);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
bad.forEach((b) => console.log('   ÉCHEC:', b.n, '→', b.d));
process.exit(bad.length ? 1 : 0);
