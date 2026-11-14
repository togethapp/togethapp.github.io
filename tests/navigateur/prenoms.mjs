/**
 * Les prénoms d'un groupe, décidés à l'avance : qui fait entrer en fixe la
 * liste ; chacun dit lequel il est ; un prénom écrit autrement avant se fond
 * dans un prénom de la liste ; les formulaires du groupe se cochent au lieu de
 * s'écrire ; et qui frappe à la porte choisit son prénom dans la liste.
 */
import { chromium } from 'playwright';
import { createList, addItems } from '../../src/lists.js';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const CONFIG = JSON.stringify({ url: 'http://127.0.0.1:8123', key: 'test-anon-key' });
const B = 'http://localhost:8099/dist/marque-points.html';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

// Une liste d'avant : « Guillaume » et « Alice », quand la liste dira « Gui ».
const old = { ...addItems(createList({ name: 'Courses', names: ['Guillaume', 'Alice'] }), 'Pain'), groupId: 'grp_famille', shared: true };

async function device(label, { key = null, me = null, lists = [] } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 950 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.addInitScript(([c, k, name, docs]) => {
    if (localStorage.getItem('marque-points:remote:v1')) return;
    localStorage.setItem('marque-points:remote:v1', c);
    const prefs = {};
    if (k) prefs.groups = [{ id: 'grp_famille', name: 'Mifa', key: k, admits: true }];
    if (name) prefs.me = name;
    localStorage.setItem('marque-points:prefs:v1', JSON.stringify(prefs));
    if (docs.length) localStorage.setItem('marque-points:lists:v1', JSON.stringify(docs));
  }, [CONFIG, key, me, lists]);
  await page.goto(`${B}#/groups`);
  await page.waitForSelector('.app-bar');
  return page;
}
const chips = async (locator) => (await locator.allTextContents()).map((s) => s.trim());

/* --- 1. qui fait entrer fixe la liste ------------------------------------- */

const mine = await device('moi', { key: 'la-cle-famille', me: 'Guillaume', lists: [old] });
await mine.waitForSelector('.group-link');
check('l’onglet Groupes le propose déjà, sur le bloc du groupe',
  /Prénoms libres/.test(await mine.locator('#view').textContent())
  && (await mine.locator('.card button[data-goto="#/group/grp_famille"]', { hasText: 'Fixer les prénoms' }).count()) === 1);
await mine.locator('.card button[data-goto="#/group/grp_famille"]', { hasText: 'Fixer les prénoms' }).click();
await mine.waitForSelector('#group-roster');
check('et la page du groupe le montre en tête, avant ce qui est en cours',
  await mine.evaluate(() => {
    const roster = document.querySelector('#group-roster');
    const first = document.querySelector('#view .section:not(#group-roster)');
    return !first || Boolean(roster.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING);
  }));
check('sans liste, la page du groupe propose de fixer les prénoms',
  (await mine.locator('[data-roster-edit]').textContent()).trim() === 'Fixer les prénoms');
await mine.click('[data-roster-edit]');
await mine.waitForSelector('dialog[open] #roster-names');
check('la fenêtre part des prénoms déjà écrits dans le groupe',
  (await mine.inputValue('#roster-names')) === 'Guillaume\nAlice', await mine.inputValue('#roster-names'));
await mine.fill('#roster-names', 'Gui\nAlice\n  Léa \ngui\n');
await mine.click('[data-roster-save]');
await mine.waitForSelector('[data-roster-me]');
check('la liste est gardée, chaque prénom une fois',
  (await chips(mine.locator('[data-roster-me]'))).join('/') === 'Gui/Alice/Léa', (await chips(mine.locator('[data-roster-me]'))).join('/'));

/* --- 2. chacun dit lequel il est ------------------------------------------ */

check('un appareil dont le prénom n’est pas dans la liste doit dire qui il est',
  (await mine.locator('[data-roster-me].chip--on').count()) === 0 && /Touchez votre prénom/.test(await mine.locator('#group-roster').textContent()));
await mine.locator('[data-roster-me]', { hasText: 'Gui' }).click();
await mine.waitForSelector('[data-roster-me].chip--on');
check('toucher son prénom le retient pour ce groupe',
  (await mine.locator('[data-roster-me].chip--on').textContent()).trim() === 'Gui'
  && (await mine.evaluate(() => JSON.parse(localStorage.getItem('marque-points:prefs:v1')).groups[0].me)) === 'Gui');
check('le prénom de l’appareil, hors groupe, ne change pas',
  (await mine.evaluate(() => JSON.parse(localStorage.getItem('marque-points:prefs:v1')).me)) === 'Guillaume');

await mine.goto(`${B}#/groups`);
await mine.waitForSelector('.group-link');
check('fixés, l’onglet Groupes les dit', /Prénoms : Gui · Alice · Léa/.test(await mine.locator('#view').textContent()));
await mine.goto(`${B}#/group/grp_famille`);
await mine.waitForSelector('#group-roster');

/* --- 3. un prénom d'avant se fond dans la liste --------------------------- */

check('« Guillaume », écrit avant, est signalé hors liste',
  (await mine.locator('[data-stray-merge]').count()) === 1 && /Guillaume/.test(await mine.locator('#roster-strays').textContent()));
await mine.click('[data-stray-merge]');
await mine.waitForSelector('dialog[open] [data-merge-into]');
await mine.locator('[data-merge-into]', { hasText: 'Gui' }).click();
await mine.waitForFunction(() => !document.querySelector('#roster-strays'));
const names = await mine.evaluate(() => JSON.parse(localStorage.getItem('marque-points:lists:v1'))[0].people.map((p) => p.name).join('/'));
check('la liste d’avant dit maintenant « Gui »', names === 'Gui/Alice', names);
check('et l’app le dit', /« Guillaume » est maintenant « Gui » dans 1 élément/.test(await mine.locator('.banner').first().textContent()),
  await mine.locator('.banner').first().textContent());

/* --- 4. un formulaire du groupe se coche ---------------------------------- */

await mine.goto(`${B}#/lists/new`);
await mine.waitForSelector('#new-list [data-roster-name]');
check('une nouvelle liste propose les prénoms du groupe, sans champ à remplir',
  (await chips(mine.locator('[data-roster-name]'))).join('/') === 'Gui/Alice/Léa' && (await mine.locator('[data-person-index]').count()) === 0);
check('celui que je suis dans ce groupe est déjà coché',
  (await chips(mine.locator('[data-roster-name].chip--on'))).join('/') === 'Gui', (await chips(mine.locator('[data-roster-name].chip--on'))).join('/'));
await mine.locator('[data-roster-name]', { hasText: 'Léa' }).click();
await mine.fill('#list-name', 'Pique-nique');
await mine.click('#new-list button[type=submit]');
await mine.waitForSelector('#list-people');
const made = await mine.evaluate(() => JSON.parse(localStorage.getItem('marque-points:lists:v1')).find((l) => l.name === 'Pique-nique').people.map((p) => p.name).join('/'));
check('la liste créée a les personnes cochées, écrites comme la liste', made === 'Gui/Léa', made);

await mine.click('#list-people');
await mine.waitForSelector('dialog[open] [data-add-listed]');
check('« Les personnes » : on ajoute en touchant un prénom du groupe, rien à écrire',
  (await mine.locator('dialog[open] #person-new').count()) === 0
  && (await chips(mine.locator('dialog[open] [data-add-listed]'))).join('/') === '+ Alice');
await mine.click('dialog[open] [data-add-listed]');
await mine.waitForFunction(() => /Tout le groupe y est/.test(document.querySelector('dialog[open]')?.textContent || ''));
check('tout le groupe ajouté, il n’y a plus personne à proposer', (await mine.locator('dialog[open] [data-add-listed]').count()) === 0);
await mine.click('#people-close');

// Hors groupe, rien ne change : on écrit les prénoms qu'on veut.
await mine.goto(`${B}#/polls/new`);
await mine.waitForSelector('#new-poll');
check('un sondage du groupe se coche aussi', (await mine.locator('#new-poll [data-roster-name]').count()) === 3);
await mine.click('[data-new-group=""]');
await mine.waitForSelector('[data-person-index]');
check('gardé pour soi, il retrouve ses champs libres',
  (await mine.locator('[data-roster-name]').count()) === 0 && (await mine.inputValue('[data-person-index="0"]')) === 'Guillaume');

/* --- 5. qui frappe choisit son prénom dans la liste ----------------------- */

await mine.goto(`${B}#/groups`);
await mine.waitForSelector('[data-invite]');
await mine.click('[data-invite]');
await mine.waitForSelector('#invite-one', { timeout: 15000 });
await mine.click('#invite-one');
await mine.waitForSelector('#export-dialog[open]', { timeout: 15000 });
const code = (await mine.locator('#export-code-value').textContent()).trim();
await mine.click('#export-close');

const other = await device('autre', { me: 'Alicia' });
await other.fill('#group-name', 'Mifa');
await other.fill('#group-code', code);
await other.click('#group-join');
await other.waitForSelector('dialog[open] [data-who]', { timeout: 15000 });
check('un prénom hors liste : le groupe montre les siens, à toucher',
  (await chips(other.locator('dialog[open] [data-who]'))).join('/') === 'Gui/Alice/Léa');
await other.locator('dialog[open] [data-who]', { hasText: 'Alice' }).click();
await other.waitForSelector('[data-check]', { timeout: 15000 });
check('le prénom choisi, la demande part', (await other.locator('[data-check]').count()) === 1);

await mine.reload();
await mine.waitForSelector('[data-admit]', { timeout: 15000 });
check('celui qui fait entrer voit le prénom de la liste, pas celui tapé',
  /Alice/.test(await mine.locator('.knock', { has: mine.locator('[data-admit]') }).textContent())
  && !/Alicia/.test(await mine.locator('.knock', { has: mine.locator('[data-admit]') }).textContent()));
await mine.click('[data-admit]');
await mine.waitForSelector('.banner', { timeout: 15000 });
await other.click('[data-check]');
await other.waitForSelector('[data-catch-up]', { timeout: 15000 });
const joined = await other.evaluate(() => JSON.parse(localStorage.getItem('marque-points:prefs:v1')));
check('entré, l’appareil sait qui il est dans ce groupe, et garde son prénom ailleurs',
  joined.groups[0].me === 'Alice' && joined.me === 'Alicia', JSON.stringify({ me: joined.me, in: joined.groups[0].me }));
check('et connaît les prénoms du groupe', (joined.groups[0].people || []).join('/') === 'Gui/Alice/Léa', JSON.stringify(joined.groups[0].people));

await other.goto(`${B}#/spends/new`);
await other.waitForSelector('#new-spend [data-roster-name]');
check('sur son formulaire, c’est « Alice » qui est cochée',
  (await chips(other.locator('[data-roster-name].chip--on'))).join('/') === 'Alice', (await chips(other.locator('[data-roster-name].chip--on'))).join('/'));
await other.click('[data-roster-all]');
check('« Tout le monde » coche tout le groupe', (await other.locator('[data-roster-name].chip--on').count()) === 3);
check('une clé qui ne fait pas entrer ne modifie pas la liste', await (async () => {
  await other.goto(`${B}#/group/grp_famille`);
  await other.waitForSelector('#group-roster');
  return (await other.locator('[data-roster-edit]').count()) === 0 && (await other.locator('[data-roster-me].chip--on').textContent()).trim() === 'Alice';
})());

check('aucune erreur', errors.length === 0, errors.join(' | '));
await browser.close();

const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log(`   ÉCHEC: ${r.n} → ${r.d}`);
console.log(`${results.length} vérifications | ${results.length - bad.length} ok | ${bad.length} échecs`);
