/**
 * Remplir avec Claude : une adresse qui ouvre un formulaire déjà rempli, collée
 * ou touchée, et le texte à donner à Claude pour qu'il sache les écrire.
 */
import { chromium } from 'playwright';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const PAGE = 'http://localhost:8099/dist/marque-points.html';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  if (!localStorage.getItem('marque-points:prefs:v1')) localStorage.setItem('marque-points:prefs:v1', JSON.stringify({ me: 'Gui' }));
});
const people = (form) => page.locator(`${form} input[data-person-index]`).evaluateAll((e) => e.map((x) => x.value));

/* ---- 1. une liste ---------------------------------------------------------- */
await page.goto(`${PAGE}#/lists/new?titre=Raclette&lignes=Fromage%0A2%20baguettes%0ACornichons&personnes=Gui,Alice`);
await page.waitForSelector('#new-list');
check('le titre est rempli', (await page.inputValue('#list-name')) === 'Raclette');
check('les lignes aussi', (await page.inputValue('#list-lines')) === 'Fromage\n2 baguettes\nCornichons', await page.inputValue('#list-lines'));
const listPeople = await people('#new-list');
check('et les personnes', listPeople.join(',') === 'Gui,Alice', listPeople.join(','));
check('l’adresse perd ce qu’elle a rempli', (await page.evaluate(() => location.hash)) === '#/lists/new');
await page.click('#new-list button[type=submit]');
await page.waitForSelector('.lines');
check('rien n’est créé sans le bouton, puis la liste est là', (await page.locator('.line').count()) === 3);

/* ---- 2. un sondage, un compte, un événement ---------------------------------- */
await page.goto(`${PAGE}?n=2#/polls/new?question=Quel%20soir%20%3F&choix=Vendredi%0ASamedi`);
await page.waitForSelector('#new-poll');
check('un sondage : la question et les choix',
  (await page.inputValue('#poll-question')) === 'Quel soir ?' && (await page.inputValue('#poll-choices')) === 'Vendredi\nSamedi');

await page.goto(`${PAGE}?n=3#/spends/new?titre=Corse&monnaie=CHF&personnes=Gui,Alice,Bob`);
await page.waitForSelector('#new-spend');
check('un compte : le nom, la monnaie, les personnes',
  (await page.inputValue('#spend-name')) === 'Corse' && (await page.inputValue('#spend-currency')) === 'CHF'
  && (await people('#new-spend')).join(',') === 'Gui,Alice,Bob', (await people('#new-spend')).join(','));

await page.goto(`${PAGE}?n=4#/agenda/new?titre=Anniversaire&jour=2026-11-14&heure=19:30`);
await page.waitForSelector('#new-event');
check('un événement : le nom, le jour, l’heure',
  (await page.inputValue('#event-name')) === 'Anniversaire' && (await page.inputValue('#event-day')) === '2026-11-14'
  && (await page.inputValue('#event-hour')) === '19:30');

/* ---- 3. ce qu'on donne à Claude, et le lien collé ----------------------------- */
await page.goto(`${PAGE}?n=5#/settings`);
await page.click('#claude-guide');
await page.waitForSelector('#export-dialog[open]');
const guide = await page.inputValue('#export-text');
check('le texte pour Claude donne les adresses de cette app',
  guide.includes(`${PAGE}?n=5#/lists/new?titre=`) && guide.includes('#/polls/new?question=')
  && guide.includes('#/spends/new?') && guide.includes('#/agenda/new?'), guide.slice(0, 200));
check('et dit qui est « moi »', guide.includes('(Gui)'));
await page.click('#export-close');

await page.click('#open-link');
await page.fill('#link-text', `Voici : https://ailleurs.example/Code/#/lists/new?titre=Valise&lignes=Maillot%0ACr%C3%A8me bon week-end`);
await page.click('#link-open');
await page.waitForSelector('#new-list');
check('un lien collé ouvre le formulaire rempli, ici',
  (await page.inputValue('#list-name')) === 'Valise' && (await page.inputValue('#list-lines')) === 'Maillot\nCrème');

check('aucune erreur', errors.length === 0, errors.join(' | '));
await browser.close();

const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log(`ÉCHEC: ${r.n} → ${r.d}`);
console.log(`${results.length} vérifications | ${results.length - bad.length} ok | ${bad.length} échecs`);
process.exit(bad.length ? 1 : 0);
