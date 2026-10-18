/**
 * Les listes et les comptes, ensemble, et les comptes mieux que seuls : le
 * ticket de ce qu'une personne a acheté (plusieurs lignes, une dépense), le
 * prix écrit dans une ligne, la liste qui dit qui a payé quoi, la liste d'une
 * activité qui va au compte du week-end pour ceux qui la font ; puis les parts
 * (une personne qui compte pour deux), un montant à part, ceux d'une activité
 * d'une touche, comment rembourser chacun et le message à lui envoyer.
 */
import { chromium } from 'playwright';
import { createEvent } from '../../src/polls.js';
import { createList, addItems, assignItem, toggleItem } from '../../src/lists.js';
import { createSpend, addSpend } from '../../src/spends.js';
import { attach } from '../../src/dashboard.js';
import { activityFor } from '../../src/flows.js';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const B = 'http://localhost:8099/dist/marque-points.html';
const pad = (n) => String(n).padStart(2, '0');
const dayIn = (days) => { const d = new Date(Date.now() + days * 864e5); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

const event = createEvent({ name: 'Week-end', names: ['Gui', 'Alice', 'Bob', 'Zoé'], date: dayIn(3) });
const kayak = activityFor(event, { name: 'Kayak', names: ['Gui', 'Zoé'] });
let courses = attach(addItems(createList({ name: 'Courses', names: ['Gui', 'Alice', 'Bob', 'Zoé'] }),
  'Fromage 25 €\nPatates\nVin (12,50€)\nPain\nCharcuterie 18 €'), event.id);
const [gui, alice] = courses.people;
courses = assignItem(courses, courses.items[0].id, alice.id);
courses = assignItem(courses, courses.items[1].id, alice.id);
courses = assignItem(courses, courses.items[2].id, gui.id);
for (const item of courses.items.slice(0, 4)) courses = toggleItem(courses, item.id);
let piquenique = attach(addItems(createList({ name: 'Pique-nique' }), 'Sandwichs 15 €'), kayak.id);
piquenique = toggleItem(piquenique, piquenique.items[0].id);
let compte = attach(createSpend({ name: 'Compte du week-end', names: ['Gui', 'Alice', 'Bob', 'Zoé'] }), event.id);
compte = addSpend(compte, { text: 'Gîte', amount: 48000, by: compte.people[0].id });

const seed = {
  'marque-points:prefs:v1': { me: 'Gui' },
  'marque-points:polls:v1': [event, kayak],
  'marque-points:lists:v1': [courses, piquenique],
  'marque-points:spends:v1': [compte],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-FR' })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message)));
await page.addInitScript((data) => {
  if (localStorage.getItem('marque-points:prefs:v1')) return;
  for (const [key, value] of Object.entries(data)) localStorage.setItem(key, JSON.stringify(value));
}, seed);
const text = async (locator) => ((await locator.first().textContent()) || '').replace(/\s+/g, ' ').trim();
const account = async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('marque-points:spends:v1'))))[0];
const goto = async (hash) => {
  await page.goto(`${B}${hash}`);
  await page.waitForSelector('.app-bar');
  await page.waitForTimeout(250);
};

/* --- 1. la liste : ce qu'on prévoit, et un ticket par personne ------------ */

await goto(`#/list/${courses.id}`);
check('la liste dit ce que ses prix annoncent', /Prévu ≈ 55,50/.test(await text(page.locator('.list-money'))),
  await text(page.locator('.list-money')));
const chips = (await page.locator('[data-flow-ticket]').allTextContents()).map((one) => one.replace(/\s+/g, ' ').trim());
check('un ticket par personne, ce que personne n’avait en dernier',
  chips.length === 3 && /Gui : Vin/.test(chips[0]) && /Alice : Fromage, Patates/.test(chips[1]) && /Pain/.test(chips[2]),
  chips.join(' | '));

await page.locator('[data-flow-ticket]', { hasText: 'Alice' }).click();
await page.waitForSelector('dialog[open] #ticket-amount');
const ticked = await page.locator('dialog[open] [data-ticket-line]:checked').count();
check('le ticket d’Alice coche ses deux lignes, les autres attendent à côté',
  ticked === 2 && (await page.locator('dialog[open] [data-ticket-line]').count()) === 4, String(ticked));
check('le montant part de ce que les lignes annonçaient', (await page.inputValue('#ticket-amount')) === '25,00',
  await page.inputValue('#ticket-amount'));
check('la dépense prend le nom de la liste et de ses lignes, sans les prix',
  (await page.inputValue('#ticket-text')) === 'Courses : Fromage, Patates', await page.inputValue('#ticket-text'));
check('payé par Alice, qui avait les lignes',
  (await text(page.locator('dialog[open] [data-flow-payer][aria-pressed="true"]'))) === 'Alice');
await page.fill('#ticket-amount', '31,40');
await page.click('#ticket-ok');
await page.waitForFunction(() => !document.querySelector('dialog[open]'));
await page.waitForTimeout(200);
let saved = await account();
check('un seul ticket, une seule dépense', saved.lines.length === 2 && saved.lines[1].amount === 3140
  && saved.lines[1].from.parts.length === 2, JSON.stringify(saved.lines[1]));

const paid = (await page.locator('.line__paid').allTextContents()).map((one) => one.replace(/\s+/g, ' ').trim());
check('la liste dit qui a payé, et pour combien de lignes',
  paid.length === 2 && paid.every((one) => /Alice a payé 31,40 € pour 2 lignes/.test(one)), paid.join(' | '));
check('et ce qui a été payé en tout', /Payé 31,40/.test(await text(page.locator('.list-money'))),
  await text(page.locator('.list-money')));

// Le pain, et le vin ajouté au même ticket ; pas pour Bob, qui ne boit pas.
await page.locator('[data-flow-ticket]', { hasText: 'Pain' }).click();
await page.waitForSelector('dialog[open] #ticket-amount');
check('une ligne sans prix ne propose pas de montant', (await page.inputValue('#ticket-amount')) === '');
await page.locator('dialog[open] [data-ticket-line]').nth(0).check();
check('cocher le vin ajoute son prix et son nom',
  (await page.inputValue('#ticket-amount')) === '12,50' && (await page.inputValue('#ticket-text')) === 'Courses : Vin, Pain',
  `${await page.inputValue('#ticket-amount')} / ${await page.inputValue('#ticket-text')}`);
check('ce que personne n’avait, c’est moi qui l’ai payé',
  (await text(page.locator('dialog[open] [data-flow-payer][aria-pressed="true"]'))) === 'Gui');
await page.locator('dialog[open] [data-for]').nth(2).uncheck();
check('ce que chacun doit se lit avant d’écrire',
  /4,17/.test(await text(page.locator('dialog[open] [data-share-of]'))), await text(page.locator('dialog[open] [data-share-of]')));
await page.click('#ticket-ok');
await page.waitForFunction(() => !document.querySelector('dialog[open]'));
await page.waitForTimeout(200);
saved = await account();
check('le second ticket n’est pas pour Bob', saved.lines[2].forWhom.length === 3
  && !saved.lines[2].forWhom.includes(saved.people[2].id), JSON.stringify(saved.lines[2].forWhom));
check('plus rien n’attend le compte', (await page.locator('[data-flow-ticket]').count()) === 0);

/* --- 2. le compte : la liste de l'activité l'attend ----------------------- */

await goto(`#/spend/${compte.id}`);
check('le compte montre ce qu’une liste a coché et pas encore noté',
  /Cochées dans « Pique-nique »/.test(await text(page.locator('#view'))) && (await page.locator('[data-flow-ticket]').count()) === 1);
await page.locator('[data-flow-ticket]').click();
await page.waitForSelector('dialog[open] #ticket-amount');
const kayakers = await page.locator('dialog[open] [data-for]:checked').evaluateAll((nodes) => nodes.map((n) => n.closest('.split-row').textContent.replace(/\s+/g, ' ').trim()));
check('la liste du kayak est pour ceux qui y vont', kayakers.length === 2 && /Gui/.test(kayakers[0]) && /Zoé/.test(kayakers[1]),
  kayakers.join(' | '));
await page.click('#ticket-ok');
await page.waitForFunction(() => !document.querySelector('dialog[open]'));
await page.waitForTimeout(200);
saved = await account();
check('écrit pour eux deux, 15 €', saved.lines[3].amount === 1500 && saved.lines[3].forWhom.length === 2);

/* --- 3. les parts --------------------------------------------------------- */

await page.click('#spend-people');
await page.waitForSelector('dialog[open] [data-weight-step]');
await page.locator('dialog[open] .knock', { hasText: 'Alice' }).locator('[data-weight-step="1"]').click();
await page.waitForTimeout(100);
check('Alice compte pour deux', /2 parts/.test(await text(page.locator('dialog[open] .knock', { hasText: 'Alice' }))));
await page.locator('dialog[open] #people-close').click();
await page.waitForTimeout(200);
saved = await account();
check('et c’est écrit avec les personnes', saved.people[1].weight === 2);

/* --- 4. un montant à part, ceux du kayak d'une touche --------------------- */

if (await page.locator('#spend-add-open').count()) await page.click('#spend-add-open');
await page.waitForSelector('#add-spend [data-split]');
await page.click('#add-spend [data-split-group]:not([data-split-group=""])');
check('« Kayak » coche ceux qui y vont', (await page.locator('#add-spend [data-for]:checked').count()) === 2);
await page.click('#add-spend [data-split-group=""]');
check('« Tout le monde » les recoche tous', (await page.locator('#add-spend [data-for]:checked').count()) === 4);

await page.fill('#spend-text', 'Restau');
await page.fill('#spend-amount', '90');
await page.selectOption('#spend-by', { label: 'Bob' });
check('la part de chacun suit les parts : deux sur cinq pour Alice', /36,00/.test(await text(page.locator('#add-spend [data-share-of]').nth(1))),
  await text(page.locator('#add-spend [data-share-of]').nth(1)));
await page.click('#add-spend [data-split-open]');
await page.fill('#add-spend [data-apart-of]', '95');
check('un montant à part plus grand que la dépense se signale',
  /dépassent la dépense de 5,00/.test(await text(page.locator('#add-spend [data-split-note]'))),
  await text(page.locator('#add-spend [data-split-note]')));
await page.fill('#add-spend [data-apart-of]', '12');
const placeholders = await page.locator('#add-spend [data-apart-of]').evaluateAll((nodes) => nodes.map((n) => n.placeholder));
check('le reste se partage entre les autres, selon leurs parts',
  placeholders.slice(1).join(' ') === '39,00 19,50 19,50', placeholders.join(' '));
await page.click('#add-spend button[type=submit]');
await page.waitForFunction(() => [...document.querySelectorAll('.line__text')].some((n) => n.textContent.includes('Restau')));
check('la dépense dit qu’elle est répartie autrement',
  /réparti autrement/.test(await text(page.locator('.line', { hasText: 'Restau' }))));

/* --- 5. les soldes, comment rembourser, le message ------------------------ */

await page.click('[data-spend-tab="balances"]');
await page.waitForSelector('.move');
const row = async (name) => text(page.locator('.entry', { hasText: name }).first());
check('Gui : on lui doit 382,59 €', /on lui doit 382,59/.test(await row('Gui')), await row('Gui'));
check('Alice, deux parts, doit 218,41 €', /×2/.test(await row('Alice')) && /doit 218,41/.test(await row('Alice')), await row('Alice'));
check('sa part se lit à côté de ce qu’elle a avancé', /a avancé 31,40 € · sa part 249,81 €/.test(await row('Alice')), await row('Alice'));

await page.click('[data-pay-edit]');
await page.waitForSelector('dialog[open] #asked-text');
await page.fill('#asked-text', 'FR76 3000 6000 0112 3456 7890 189');
await page.click('#asked-ok');
await page.waitForSelector('.move__pay');
check('comment rembourser Gui se lit sous son premier virement, une fois',
  (await page.locator('.move__pay').count()) === 1 && /FR76 3000/.test(await text(page.locator('.move__pay'))));
await page.locator('[data-remind]').first().click();
await page.waitForSelector('#export-dialog[open]');
const message = await page.inputValue('#export-text');
check('le message dit qui, combien, pour quoi, et comment', /Alice → Gui, 218,41/.test(message) && /FR76 3000/.test(message)
  && /Compte du week-end/.test(message), message);
await page.click('#export-close');
await page.click('#settle-text');
await page.waitForSelector('#export-dialog[open]');
check('le texte pour le groupe le dit aussi', /Pour rembourser Gui : FR76/.test(await page.inputValue('#export-text')));
await page.click('#export-close');

/* --- 6. tout est gardé ---------------------------------------------------- */

saved = await account();
check('cinq dépenses, le montant à part de Gui compris',
  saved.lines.length === 5 && saved.lines[4].fixed?.[saved.people[0].id] === 1200, JSON.stringify(saved.lines[4]));

check('aucune erreur de page', errors.length === 0, errors.join(' | '));
await browser.close();
const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log(`ÉCHEC: ${r.n}\n      ${r.d}`);
console.log(`${results.length} vérifications | ${results.length - bad.length} ok | ${bad.length} échecs`);
process.exit(bad.length ? 1 : 0);
