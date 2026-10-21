/**
 * La recherche : la loupe en haut de l'écran, des mots trouvés partout —
 * titres, lignes, choix, notes, dépenses — sans compter les accents ; les
 * résultats suivent la frappe sans que le champ perde la main, et « Retour »
 * depuis un résultat retrouve les mots.
 */
import { chromium } from 'playwright';
import { createList, addItems } from '../../src/lists.js';
import { createPoll, addOptions } from '../../src/polls.js';
import { createSpend, addSpend } from '../../src/spends.js';
import { createBoard, addCard, editCardText } from '../../src/ideas.js';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const B = 'http://localhost:8099/dist/marque-points.html';

const MIFA = { id: 'grp_famille', name: 'Mifa', key: 'la-cle-famille', admits: true };
const VOISINS = { id: 'grp_voisins', name: 'Voisins', key: 'la-cle-voisins', admits: true };
const list = { ...addItems(createList({ name: 'Courses' }), 'Fromage 25 €\nPain\nCrème fraîche'), groupId: MIFA.id, shared: true };
const poll = { ...addOptions(createPoll({ question: 'Quel dessert ?' }), 'Crème brûlée\nTarte'), groupId: MIFA.id, shared: true };
const made = addCard(createBoard({ name: 'Fête des voisins' }), 'note');
const board = { ...editCardText(made.board, made.cardId, 'Plateau de fromages'), groupId: VOISINS.id, shared: true };
let spend = createSpend({ name: 'Week-end', names: ['Gui', 'Alice'] });
spend = addSpend(spend, { text: 'Fromagerie', amount: 1800, by: spend.people[0].id });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
const context = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-FR' });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((data) => {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  for (const [key, value] of Object.entries(data)) localStorage.setItem(key, JSON.stringify(value));
}, {
  'marque-points:prefs:v1': { me: 'Gui', groups: [MIFA, VOISINS] },
  'marque-points:lists:v1': [list],
  'marque-points:polls:v1': [poll],
  'marque-points:spends:v1': [spend],
  'marque-points:boards:v1': [board],
});
await page.goto(`${B}#/`);
await page.waitForSelector('.app-bar');

/* ---- 1. la loupe ---------------------------------------------------------- */

await page.click('#search-open');
await page.waitForSelector('#search-words');
check('la loupe ouvre la recherche, le champ prêt à taper',
  (await page.evaluate(() => location.hash)) === '#/search' && await page.evaluate(() => document.activeElement?.id === 'search-words'));
check('sans mot, la page dit où elle cherche', /lignes des listes/.test(await page.locator('#search-results').textContent()));

/* ---- 2. taper ------------------------------------------------------------- */

await page.keyboard.type('fromage');
await page.waitForFunction(() => document.querySelectorAll('.search-hit').length === 3);
const titles = await page.locator('.search-hit strong').allTextContents();
check('les mots sont trouvés dans une liste, des notes et des dépenses',
  titles.join(' | ') === 'Courses | Week-end | Fête des voisins', titles.join(' | '));
check('les résultats sont rangés par sorte',
  (await page.locator('#search-results h2').allTextContents()).map((h) => h.replace(/\s+/g, ' ').trim()).join(' | ') === 'Liste · 1 | Compte · 1 | Tableau d’idées · 1',
  (await page.locator('#search-results h2').allTextContents()).join(' | '));
check('le mot est marqué là où il est écrit',
  (await page.locator('.search-hit mark').first().textContent()) === 'Fromage');
check('le champ garde la main pendant qu’on tape', await page.evaluate(() => document.activeElement?.id === 'search-words'));
check('et les mots sont dans l’adresse', (await page.evaluate(() => location.hash)) === '#/search/fromage');

await page.fill('#search-words', 'creme');
await page.waitForFunction(() => document.querySelectorAll('.search-hit').length === 2);
check('sans compter les accents : « creme » trouve « Crème »',
  (await page.locator('.search-hit mark').allTextContents()).every((text) => text === 'Crème'));

await page.fill('#search-words', 'creme fromage');
await page.waitForFunction(() => document.querySelectorAll('.search-hit').length === 1);
check('tous les mots doivent y être', /Courses/.test(await page.locator('.search-hit').textContent()));

await page.fill('#search-words', 'pizza');
await page.waitForFunction(() => !document.querySelector('.search-hit'));
check('rien trouvé se dit', /Rien ne contient « pizza »/.test(await page.locator('#search-results').textContent()));

/* ---- 3. un résultat, et « Retour » ---------------------------------------- */

await page.fill('#search-words', 'brulee');
await page.waitForSelector('.search-hit');
await page.click('.search-hit');
await page.waitForFunction((id) => location.hash === `#/poll/${id}`, poll.id);
check('un résultat ouvre son élément', true);
await page.click('#view [data-back]');
await page.waitForSelector('#search-words');
check('« Retour » retrouve la recherche, avec ses mots',
  (await page.inputValue('#search-words')) === 'brulee' && (await page.locator('.search-hit').count()) === 1,
  await page.evaluate(() => location.hash));

/* ---- 4. le groupe choisi -------------------------------------------------- */

await page.fill('#search-words', 'fromage');
await page.waitForFunction(() => document.querySelectorAll('.search-hit').length === 3);
await page.locator('[data-group-filter="grp_famille"]').click();
await page.waitForSelector('[data-search-everywhere]');
check('dans un groupe, seulement ce qui y est', (await page.locator('.search-hit').count()) === 1
  && /2 de plus dans les autres groupes/.test(await page.locator('#search-results').textContent()),
  (await page.locator('#search-results').textContent()).replace(/\s+/g, ' ').slice(0, 200));
check('et les mots sont restés', (await page.inputValue('#search-words')) === 'fromage');
await page.click('[data-search-everywhere]');
await page.waitForFunction(() => document.querySelectorAll('.search-hit').length === 3);
check('« Tous » cherche de nouveau partout', true);

/* ---- 5. l'adresse seule --------------------------------------------------- */

await page.goto(`${B}#/search/${encodeURIComponent('crème fraîche')}`);
await page.waitForSelector('.search-hit');
check('une adresse de recherche s’ouvre avec ses résultats',
  (await page.inputValue('#search-words')) === 'crème fraîche' && (await page.locator('.search-hit').count()) === 1);

check('aucune erreur de page', errors.length === 0, errors.join(' | '));
await browser.close();
const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log(`ÉCHEC: ${r.n} → ${r.d}`);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
process.exit(bad.length ? 1 : 0);
