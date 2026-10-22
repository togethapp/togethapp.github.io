/**
 * Les devises : une dépense payée en livres dans un compte en euros entre
 * convertie au taux dit (« 1 € = 0,86 £ »), garde ce qui a été payé, et le
 * taux revient pour la suivante. Le compte, ses parts et qui rembourse qui
 * restent en euros.
 */
import { chromium } from 'playwright';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const PAGE = 'http://localhost:8099/dist/marque-points.html';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

const context = await browser.newContext({ viewport: { width: 430, height: 950 }, locale: 'fr-FR' });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('marque-points:prefs:v1', JSON.stringify({ me: 'Gui' })));
await page.goto(`${PAGE}#/spends/new`);
await page.waitForSelector('#new-spend');
await page.fill('#spend-name', 'Londres');
await page.fill('[data-person-index="0"]', 'Gui');
await page.fill('[data-person-index="1"]', 'Alice');
await page.click('#new-spend button[type=submit]');
await page.waitForSelector('#add-spend');

const form = page.locator('#add-spend');
const clean = (text) => String(text || '').replace(/\s+/g, ' ').trim();
const lineText = async (what) => clean(await page.locator('.line', { hasText: what }).first().textContent());

/* ---- 1. en euros, rien ne change ----------------------------------------- */

check('le montant est en euros, et le taux caché', (await form.locator('[data-currency-sign]').textContent()) === '€'
  && await form.locator('[data-rate-row]').isHidden());

/* ---- 2. en livres : le taux est demandé, là où il manque ------------------ */

await page.fill('#spend-text', 'Pub');
await page.fill('#spend-amount', '30');
await form.locator('[data-currency]').selectOption('GBP');
check('choisir la livre montre son signe, et le taux à écrire',
  (await form.locator('[data-currency-sign]').textContent()).startsWith('£') && await form.locator('[data-rate-row]').isVisible()
  && /1 € =/.test(await form.locator('[data-rate-row]').textContent()));
check('sans taux connu, le champ du taux attend, vide et choisi',
  (await form.locator('[data-rate]').inputValue()) === ''
  && await page.evaluate(() => document.activeElement?.hasAttribute('data-rate')));
await page.click('#add-spend button[type=submit]');
await page.waitForTimeout(200);
check('sans taux, rien n’est noté, et c’est dit sous le taux',
  (await page.locator('.line').count()) === 0 && /Écrivez le taux/.test(await form.locator('[data-converted]').textContent()));
check('et ce qui était tapé est toujours là',
  (await page.inputValue('#spend-amount')) === '30' && (await form.locator('[data-currency]').inputValue()) === 'GBP');

await form.locator('[data-rate]').fill('0,86');
check('le montant converti se lit avant de noter',
  /Soit 34,88 € dans le compte/.test(clean(await form.locator('[data-converted]').textContent())),
  await form.locator('[data-converted]').textContent());
check('et les parts de chacun suivent, en euros',
  /17,44 €/.test(clean(await form.locator('[data-share-of]').first().textContent())),
  await form.locator('[data-share-of]').first().textContent());
await page.click('#add-spend button[type=submit]');
await page.waitForSelector('.line');
check('la dépense entre en euros, et dit ce qui a été payé',
  /34,88 €/.test(await lineText('Pub')) && /payé 30,00 £\S* \(1 € = 0,86 £\S*\)/.test(await lineText('Pub')), await lineText('Pub'));

/* ---- 3. le taux revient --------------------------------------------------- */

if (await page.locator('#spend-add-open').count()) await page.click('#spend-add-open');
await page.waitForSelector('#add-spend');
await page.fill('#spend-text', 'Musée');
await page.fill('#spend-amount', '20');
await page.selectOption('#spend-by', { label: 'Alice' });
await form.locator('[data-currency]').selectOption('GBP');
check('pour la suivante, le dernier taux revient', (await form.locator('[data-rate]').inputValue()) === '0,86');
check('et la livre est proposée juste après l’euro',
  (await form.locator('[data-currency] option').nth(1).getAttribute('value')) === 'GBP');
await page.click('#add-spend button[type=submit]');
await page.waitForFunction(() => document.querySelectorAll('.line').length === 2);

await page.click('[data-spend-tab="balances"]');
await page.waitForSelector('.entry');
const balance = async (name) => clean(await page.locator('.entry', { hasText: name }).first().locator('.entry__value').textContent());
// 34,88 € de pub moins sa part (17,44 €) et celle du musée d'Alice (20 £ → 23,26 €, 11,63 € chacun).
check('les soldes sont en euros', /on lui doit 5,81 €/.test(await balance('Gui')), await balance('Gui'));
await page.click('[data-spend-tab="expenses"]');

/* ---- 4. corriger : la monnaie et le taux reviennent, et se changent ------- */

await page.locator('.line__text', { hasText: 'Pub' }).click();
await page.waitForSelector('dialog[open] [data-currency]');
const dialog = page.locator('dialog[open]');
check('la fenêtre de la dépense rouvre en livres, au même taux',
  (await dialog.locator('[data-currency]').inputValue()) === 'GBP' && (await dialog.locator('[data-rate]').inputValue()) === '0,86'
  && (await page.inputValue('#line-amount')) === '30,00');
await dialog.locator('[data-rate]').fill('');
await page.click('#line-save');
check('sans taux, la fenêtre le dit et reste ouverte',
  await dialog.isVisible() && /Écrivez le taux/.test(await page.locator('#line-error').textContent()));
await dialog.locator('[data-currency]').selectOption('EUR');
await page.fill('#line-amount', '40');
await page.click('#line-save');
await page.waitForFunction(() => !document.querySelector('dialog[open]'));
check('repassée en euros, elle ne dit plus rien d’autre',
  /40,00 €/.test(await lineText('Pub')) && !/£/.test(await lineText('Pub')), await lineText('Pub'));

/* ---- 5. sur un petit téléphone, rien ne déborde --------------------------- */

if (await page.locator('#spend-add-open').count()) await page.click('#spend-add-open');
await page.waitForSelector('#add-spend');
await form.locator('[data-currency]').selectOption('JPY');
await page.setViewportSize({ width: 320, height: 800 });
await page.waitForTimeout(200);
const spill = await page.evaluate(() => {
  const box = document.querySelector('#add-spend').getBoundingClientRect();
  return Math.max(...[...document.querySelectorAll('#add-spend [data-amount-field] *')]
    .map((node) => Math.round(node.getBoundingClientRect().right - box.right)));
});
check('le montant, la monnaie et le taux tiennent dans le formulaire', spill <= 0, `${spill} px`);
check('le yen se lit comme le français l’écrit', /^(JPY|¥)$/.test(await form.locator('[data-currency-sign]').textContent()),
  await form.locator('[data-currency-sign]').textContent());

check('aucune erreur de page', errors.length === 0, errors.join(' | '));
await browser.close();
const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log(`ÉCHEC: ${r.n} → ${r.d}`);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
process.exit(bad.length ? 1 : 0);
