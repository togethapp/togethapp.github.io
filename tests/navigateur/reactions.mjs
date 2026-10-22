/**
 * Les réactions et les mots : 👍 sous une idée, sous un choix de sondage,
 * sur un événement — d'un téléphone à l'autre, sans s'écraser, et sur un
 * événement organisé par un autre, qui est clos d'office.
 */
import { chromium } from 'playwright';
import { createBoard, addCard, editCardText } from '../../src/ideas.js';
import { createPoll, addOptions, createEvent } from '../../src/polls.js';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const BASE = 'http://127.0.0.1:8123';
const CONFIG = JSON.stringify({ url: BASE, key: 'test-anon-key' });
const B = 'http://localhost:8099/dist/marque-points.html';
const MIFA = { id: 'grp_famille', name: 'Mifa', key: 'la-cle-famille', admits: true };
const OWNER = 'secret-de-gui-0123456789abcdef';

const pad = (n) => String(n).padStart(2, '0');
const inDays = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
async function rpc(fn, body) {
  const response = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: 'test-anon-key', authorization: 'Bearer test-anon-key' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Dans la base : un tableau d'idées, un sondage et un événement de Gui.
const made = addCard({ ...createBoard({ name: 'Cadeau de Léa' }), shared: true, groupId: MIFA.id }, 'note');
const board = editCardText(made.board, made.cardId, 'Un livre de cuisine');
const poll = { ...addOptions(createPoll({ question: 'Quel dessert ?', names: ['Gui', 'Alice'] }), 'Tarte\nCrème brûlée'), shared: true, groupId: MIFA.id };
const event = { ...createEvent({ name: 'Raclette', names: ['Gui', 'Alice'], date: inDays(6), at: '20:00' }), shared: true, groupId: MIFA.id };
await rpc('marque_points_put', { p_id: board.id, p_data: board, p_key: MIFA.key });
await rpc('marque_points_put', { p_id: poll.id, p_data: poll, p_key: MIFA.key, p_owner: OWNER });
await rpc('marque_points_put', { p_id: event.id, p_data: event, p_key: MIFA.key, p_owner: OWNER });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
async function device(label, prefs) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 1000 }, locale: 'fr-FR' })).newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.addInitScript(([c, p]) => {
    if (localStorage.getItem('marque-points:prefs:v1')) return;
    localStorage.setItem('marque-points:remote:v1', c);
    localStorage.setItem('marque-points:prefs:v1', JSON.stringify(p));
  }, [CONFIG, prefs]);
  await page.goto(B);
  await page.waitForSelector('.app-bar');
  return page;
}
const open = async (page, hash, selector) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForSelector(selector, { timeout: 15000 });
};
const text = async (locator) => (await locator.textContent()).replace(/\s+/g, ' ').trim();

const alice = await device('Alice', { me: 'Alice', groups: [MIFA] });
const bob = await device('Bob', { me: 'Bob', groups: [MIFA] });

/* ---- 1. une idée ---------------------------------------------------------- */

await open(alice, `#/idea/${board.id}`, '.idea-card');
const aliceCard = alice.locator('.swipe', { hasText: 'Un livre de cuisine' });
check('sous chaque idée, de quoi réagir', (await aliceCard.locator('[data-talk-open]').count()) === 1);
await aliceCard.locator('[data-talk-open]').click();
await alice.waitForSelector('.dialog--talk[open]');
await alice.click('.dialog--talk [data-talk-pick="👍"]');
await alice.waitForSelector('.dialog--talk [data-talk-pick="👍"][aria-pressed="true"]');
await alice.fill('.dialog--talk [data-talk-text]', 'Lequel ? Il en a déjà trois');
await alice.click('.dialog--talk [data-talk-send]');
await alice.waitForSelector('.dialog--talk .talk-word');
check('la fenêtre montre la réaction et le mot', /Alice/.test(await text(alice.locator('.dialog--talk'))) && /Lequel \?/.test(await text(alice.locator('.dialog--talk .talk-words'))));
await alice.click('.dialog--talk [data-talk-close]');
check('sous l’idée : 👍 1, et 1 mot', /👍 1/.test(await text(aliceCard.locator('.talk'))) && /💬 1/.test(await text(aliceCard.locator('.talk'))),
  await text(aliceCard.locator('.talk')));

// Bob, sur son téléphone, ajoute son 👍 d'un toucher sur la pastille, et ❤️ n'est pas à lui.
await alice.waitForTimeout(800);
await open(bob, `#/idea/${board.id}`, '.idea-card');
const bobSees = await bob.waitForFunction(() => /👍 1/.test(document.querySelector('.talk')?.textContent || ''), null, { timeout: 15000 })
  .then(() => true).catch(() => false);
check('la réaction d’Alice arrive chez Bob', bobSees);
await bob.click('.talk [data-talk-react="👍"]');
await bob.waitForFunction(() => /👍 2/.test(document.querySelector('.talk')?.textContent || ''));
check('Bob ajoute la sienne d’un toucher', true);
const both = await alice.waitForFunction(() => /👍 2/.test(document.querySelector('.talk')?.textContent || ''), null, { timeout: 20000 })
  .then(() => true).catch(() => false);
check('et chez Alice, les deux restent', both, await text(alice.locator('.talk').first()));

/* ---- 2. un choix de sondage, par qui n'organise pas ----------------------- */

await open(bob, `#/poll/${poll.id}`, '.talk-line');
check('chaque choix a sa rangée', (await bob.locator('.talk-line').count()) === 2);
await bob.locator('.talk-line', { hasText: 'Crème brûlée' }).locator('[data-talk-open]').click();
await bob.waitForSelector('.dialog--talk[open]');
await bob.click('.dialog--talk [data-talk-pick="😮"]');
await bob.waitForSelector('.dialog--talk [data-talk-pick="😮"][aria-pressed="true"]');
await bob.click('.dialog--talk [data-talk-close]');
await bob.waitForTimeout(1000);
const stored = await rpc('marque_points_get', { p_id: poll.id });
check('la base garde la réaction d’un choix, même de qui n’organise pas',
  Object.values(stored?.reacts || {}).some((cell) => cell.e === '😮' && cell.n === 'Bob'), JSON.stringify(stored?.reacts));

/* ---- 3. un événement, clos d'office --------------------------------------- */

await open(alice, `#/poll/${event.id}`, '.talk[data-talk=""]');
await alice.locator('.talk[data-talk=""] [data-talk-open]').click();
await alice.waitForSelector('.dialog--talk[open]');
await alice.click('.dialog--talk [data-talk-pick="🎉"]');
await alice.waitForSelector('.dialog--talk [data-talk-pick="🎉"][aria-pressed="true"]');
await alice.fill('.dialog--talk [data-talk-text]', 'J’apporte le fromage');
await alice.click('.dialog--talk [data-talk-send]');
await alice.waitForSelector('.dialog--talk .talk-word');
await alice.click('.dialog--talk [data-talk-close]');
check('sur la page de l’événement, les derniers mots se lisent', /Alice J’apporte le fromage/.test(await text(alice.locator('.talk__said'))));
await alice.waitForTimeout(1000);
const party = await rpc('marque_points_get', { p_id: event.id });
check('sur un événement clos, la base garde réactions et mots',
  Object.values(party?.reacts || {}).some((cell) => cell.e === '🎉') && Object.values(party?.comments || {}).some((cell) => cell.t === 'J’apporte le fromage'),
  JSON.stringify(party));

// Alice retire ses mots : chez Bob aussi, ils s'en vont.
await alice.locator('.talk[data-talk=""] [data-talk-open]').click();
await alice.waitForSelector('.dialog--talk [data-talk-drop]');
await alice.click('.dialog--talk [data-talk-drop]');
await alice.waitForFunction(() => !document.querySelector('.dialog--talk [data-talk-drop]'));
await alice.click('.dialog--talk [data-talk-close]');
await alice.waitForTimeout(1000);
await open(bob, `#/poll/${event.id}`, '.talk[data-talk=""]');
await bob.waitForTimeout(1500);
check('des mots retirés s’en vont partout', !(await bob.locator('.talk__said').count())
  && /🎉 1/.test(await text(bob.locator('.talk[data-talk=""]'))), await text(bob.locator('.talk[data-talk=""]')));

/* ---- 4. sans prénom, il est demandé une fois ----------------------------- */

const zoe = await device('Zoé', { groups: [MIFA] });
await open(zoe, `#/idea/${board.id}`, '.idea-card');
await zoe.waitForFunction(() => /👍/.test(document.querySelector('.talk')?.textContent || ''), null, { timeout: 15000 });
await zoe.click('.talk [data-talk-react="👍"]');
await zoe.waitForSelector('dialog[open] input');
check('sans prénom, l’app le demande avant de réagir', /prénom/i.test(await text(zoe.locator('dialog[open]'))));
await zoe.fill('dialog[open] input', 'Zoé');
await zoe.keyboard.press('Enter');
await zoe.waitForFunction(() => /👍 3/.test(document.querySelector('.talk')?.textContent || ''));
check('puis la réaction compte, à son nom', (await zoe.locator('.talk [data-talk-react="👍"]').getAttribute('title')).includes('Zoé'));

check('aucune erreur de page', errors.length === 0, errors.join(' | '));
await browser.close();
const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log(`ÉCHEC: ${r.n} → ${r.d}`);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
process.exit(bad.length ? 1 : 0);
