/**
 * Le classement des jeux, par groupe : le record gardé sur un téléphone part
 * vers ses groupes sous le prénom qu'il y a ; la page du jeu montre les dix
 * meilleurs du groupe choisi, par difficulté ; on passe d'un groupe à l'autre.
 * Sans base, pas de classement.
 */
import { chromium } from 'playwright';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const CONFIG = JSON.stringify({ url: 'http://127.0.0.1:8123', key: 'test-anon-key' });
const B = 'http://localhost:8099/dist/marque-points.html';
const SHOTS = process.env.SHOTS || '';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function device(label, prefs, remote = true) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.addInitScript(([c, p, r]) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    if (r) localStorage.setItem('marque-points:remote:v1', c);
    localStorage.setItem('marque-points:prefs:v1', JSON.stringify(p));
  }, [CONFIG, prefs, remote]);
  return page;
}
const lines = async (page) => (await page.locator('.arcade-ranking__line').allTextContents())
  .map((text) => text.replace(/\s+/g, ' ').trim());
const until = async (page, test) => {
  for (let i = 0; i < 40; i += 1) {
    if (await test()) return true;
    await page.waitForTimeout(100);
  }
  return false;
};

const gui = await device('Gui', {
  me: 'Gui', lang: 'fr', arcade: { snake: 500 },
  groups: [{ id: 'grp_famille', name: 'Mifa', key: 'la-cle-famille', admits: true }],
});
await gui.goto(`${B}#/arcade/snake`);
await gui.waitForSelector('#arcade-board');
check('le record du téléphone entre au classement du groupe',
  await until(gui, async () => (await lines(gui)).join('|') === '1 Gui 500'), (await lines(gui)).join('|'));
check('le classement dit son groupe et sa difficulté', /Classement Mifa · Normal/.test(await gui.locator('#arcade-ranking h2').innerText()));
check('ma ligne ressort', (await gui.locator('.arcade-ranking__line--me').count()) === 1);
check('un seul groupe : pas de choix de groupe', (await gui.locator('[data-arcade-group]').count()) === 0);

const alice = await device('Alice', {
  me: 'Alice', lang: 'fr', arcade: { snake: 800, 'snake:hard': 40 },
  groups: [
    { id: 'grp_famille', name: 'Mifa', key: 'la-cle-famille', admits: true },
    { id: 'grp_copains', name: 'Copains du mardi', key: 'la-cle-copains', admits: true },
  ],
});
await alice.goto(`${B}#/arcade/snake`);
await alice.waitForSelector('#arcade-board');
check('Alice passe devant Gui',
  await until(alice, async () => (await lines(alice)).join('|') === '1 Alice 800|2 Gui 500'), (await lines(alice)).join('|'));
if (SHOTS) await alice.locator('#arcade-ranking').scrollIntoViewIfNeeded().then(() => alice.screenshot({ path: `${SHOTS}/classement.png` }));
check('deux groupes : on choisit lequel', (await alice.locator('[data-arcade-group]').count()) === 2);
await alice.locator('[data-arcade-group="grp_copains"]').click();
check('aux Copains, seule Alice', await until(alice, async () => (await lines(alice)).join('|') === '1 Alice 800'), (await lines(alice)).join('|'));
check('le groupe choisi est gardé',
  await alice.evaluate(() => JSON.parse(localStorage.getItem('marque-points:prefs:v1')).arcadeGroup === 'grp_copains'));

await alice.locator('[data-arcade-mode="hard"]').click();
check('en Difficile, un autre classement', await until(alice, async () => (await lines(alice)).join('|') === '1 Alice 40'),
  (await lines(alice)).join('|'));
await alice.locator('[data-arcade-mode="easy"]').click();
check('en Facile, personne encore', await until(alice, async () => /Personne encore/.test(await alice.locator('#arcade-ranking').innerText())));

await gui.reload();
await gui.waitForSelector('#arcade-board');
check('Gui voit Alice devant lui, à son tour',
  await until(gui, async () => (await lines(gui)).join('|') === '1 Alice 800|2 Gui 500'), (await lines(gui)).join('|'));
await gui.goto(`${B}#/arcade/glouton`);
await gui.waitForSelector('#arcade-board[data-arcade="glouton"]');
check('le Glouton a son propre classement, vide', await until(gui, async () => /Personne encore/.test(await gui.locator('#arcade-ranking').innerText())));

const alone = await device('seul', { me: 'Zoé', lang: 'fr', arcade: { snake: 300 } }, false);
await alone.goto(`${B}#/arcade/snake`);
await alone.waitForSelector('#arcade-board');
await alone.waitForTimeout(500);
check('sans base ni groupe, pas de classement', await alone.locator('#arcade-ranking').isHidden());

check('aucune erreur de script', errors.length === 0, errors.join(' | '));
await browser.close();
const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log('ÉCHEC:', r.n, r.d);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
process.exit(bad.length ? 1 : 0);
