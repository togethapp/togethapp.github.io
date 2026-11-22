/**
 * Ce qui donne à l'app la sensation d'une app de téléphone : l'écran qui glisse
 * d'une page à l'autre (en avant vers un document, en arrière au retour, en
 * fondu entre deux onglets), et tirer le haut de la page pour aller chercher
 * ce que les autres ont fait, une fois l'app installée.
 *
 * Les autres suites voient les écrans sans glissement (navigator.webdriver) :
 * celle-ci le remet, pour le vérifier.
 */
import { chromium } from 'playwright';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const PAGE = 'http://localhost:8099/dist/marque-points.html';

const seed = {
  'marque-points:prefs:v1': {
    me: 'Gui',
    groups: [{ id: 'grp_famille', name: 'Mifa', key: 'la-cle-famille', admits: true }],
  },
  'marque-points:remote:v1': { url: 'http://127.0.0.1:8123', key: 'test-anon-key' },
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function open({ reducedMotion = 'no-preference', installed = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', hasTouch: true, reducedMotion });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e.message)));
  await page.addInitScript(({ data, installed }) => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    for (const [k, v] of Object.entries(data)) if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(v));
    // Every direction the page took, as it took it.
    window.__navs = [];
    new MutationObserver(() => {
      const nav = document.documentElement.dataset.nav;
      if (nav) window.__navs.push(nav);
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-nav'] });
    // An app opened from the home screen.
    if (installed) {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (query) =>
        query.includes('display-mode: standalone') ? { ...real(query), matches: true, media: query } : real(query);
    }
  }, { data: seed, installed });
  await page.goto(PAGE);
  await page.waitForSelector('.app-bar');
  return page;
}

const go = async (page, hash) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(450);
};
const navs = (page) => page.evaluate(() => window.__navs.splice(0));

/* --- l'écran glisse -------------------------------------------------------- */

const page = await open();
await go(page, '#/lists/new');
check('vers un formulaire, la page avance', (await navs(page)).join() === 'forward');
await go(page, '#/');
check('au retour, elle recule', (await navs(page)).join() === 'back');
await go(page, '#/agenda');
check('d’un onglet à l’autre, un fondu', (await navs(page)).join() === 'across');
check('et rien ne reste en cours', await page.evaluate(() => !document.documentElement.dataset.nav));
await page.click('[data-tab="settings"]');
await page.waitForSelector('[aria-current="page"][data-tab="settings"]');
check('les onglets marchent toujours', /Apparence/.test(await page.locator('#view').textContent()));

const still = await open({ reducedMotion: 'reduce' });
await go(still, '#/lists/new');
check('le téléphone demande moins d’animations : rien ne glisse', (await navs(still)).length === 0);
check('et la page change quand même', (await still.locator('#new-list').count()) === 1);

/* --- tirer pour actualiser -------------------------------------------------- */

/** Un doigt posé en haut, tiré de `distance` pixels, puis levé. */
async function pull(target, distance) {
  const cdp = await target.context().newCDPSession(target);
  const point = (y) => [{ x: 195, y }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(200) });
  for (let i = 1; i <= 8; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(200 + (distance * i) / 8) });
  }
  const shown = await target.locator('.pull').count();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return shown;
}
const countSyncs = (target) =>
  target.evaluate(() => {
    window.__syncs = 0;
    document.getElementById('sync').addEventListener('click', () => { window.__syncs += 1; });
  });

const app = await open({ installed: true });
await go(app, '#/agenda');
await countSyncs(app);
check('la flèche apparaît sous le doigt', (await pull(app, 160)) === 1);
await app.waitForTimeout(300);
check('tirée assez loin, elle va chercher', (await app.evaluate(() => window.__syncs)) === 1);
check('et s’en va', (await app.locator('.pull').count()) === 0);
await app.waitForFunction(() => !document.getElementById('sync').disabled);
await pull(app, 40);
await app.waitForTimeout(300);
check('à peine tirée, rien ne part', (await app.evaluate(() => window.__syncs)) === 1);

const tab = await open();
await go(tab, '#/agenda');
await countSyncs(tab);
check('dans un onglet du navigateur, le navigateur garde son geste', (await pull(tab, 160)) === 0);
await tab.waitForTimeout(300);
check('et l’app ne va rien chercher', (await tab.evaluate(() => window.__syncs)) === 0);

const bad = results.filter((r) => !r.ok);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
bad.forEach((b) => console.log('   ÉCHEC:', b.n, '→', b.d));
console.log('erreurs :', errors);
await browser.close();
