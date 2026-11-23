// « Quoi de neuf » : sur la page d'un groupe et sur celle d'un événement, ce
// qui a changé depuis le dernier passage ; sur l'onglet Groupes, combien.
import { chromium } from 'playwright';
const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const yesterday = now - DAY;
const before = now - 3 * DAY;
const soon = new Date(now + 5 * DAY).toISOString().slice(0, 10);

const list = {
  id: 'l_courses', kind: 'list', name: 'Courses', createdAt: before, updatedAt: now - 1000, peopleAt: before,
  shared: false, groupId: 'grp_famille', archivedAt: null, template: false, removed: {},
  people: [{ id: 'p1', name: 'Gui' }, { id: 'p2', name: 'Alice' }],
  items: [
    { id: 'i1', text: 'Pain', who: null, done: true, due: null, createdAt: before, updatedAt: now - 2000 },
    { id: 'i2', text: 'Lait', who: null, done: false, due: null, createdAt: before, updatedAt: before },
    { id: 'i3', text: 'Fromage', who: null, done: false, due: null, createdAt: now - 1000, updatedAt: now - 1000 },
  ],
  parent: 'v_raclette',
};
const event = {
  id: 'v_raclette', kind: 'poll', question: 'Raclette', title: 'Raclette', createdAt: before, updatedAt: before, peopleAt: before,
  closedAt: before, fixed: true, date: soon, at: null, until: null, shared: false, groupId: 'grp_famille',
  archivedAt: null, template: false, removed: {}, people: [{ id: 'q1', name: 'Gui' }, { id: 'q2', name: 'Alice' }],
  options: [], votes: {},
};

const ctx = await browser.newContext({ viewport: { width: 430, height: 950 }, locale: 'fr-FR' });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(([l, v, seenAt]) => {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  localStorage.setItem('marque-points:lists:v1', JSON.stringify([l]));
  localStorage.setItem('marque-points:polls:v1', JSON.stringify([v]));
  localStorage.setItem('marque-points:prefs:v1', JSON.stringify({
    me: 'Gui',
    groups: [{ id: 'grp_famille', name: 'Mifa', key: 'k_test' }],
    seen: { 'group:grp_famille': seenAt },
  }));
}, [list, event, yesterday]);
await page.goto('http://localhost:8099/dist/marque-points.html#/groups');
await page.waitForSelector('.app-bar');
await page.waitForSelector('[data-goto="#/group/grp_famille"]');

const board = await page.locator('.card', { has: page.locator('[data-goto="#/group/grp_famille"]') }).textContent();
check('l’onglet Groupes dit combien de nouveautés', /1 nouveauté/.test(board), board.replace(/\s+/g, ' '));

await page.click('[data-goto="#/group/grp_famille"]');
await page.waitForSelector('#news');
const news = (await page.locator('#news').textContent()).replace(/\s+/g, ' ');
check('la page du groupe a « Quoi de neuf »', /Quoi de neuf/.test(news), news);
check('depuis le dernier passage', /Depuis votre dernier passage/.test(news), news);
check('la liste dit la ligne ajoutée et ce qui est coché',
  /Courses/.test(news) && /1 ligne ajoutée/.test(news) && /coché : Pain/.test(news), news);
check('une ligne de « Quoi de neuf » ouvre la liste',
  (await page.locator('#news [data-goto="#/list/l_courses"]').count()) === 1);

// Revenir : le passage est noté, plus rien de neuf.
await page.click('[data-tab="groups"]');
await page.waitForSelector('[data-goto="#/group/grp_famille"]');
const after = await page.locator('.card', { has: page.locator('[data-goto="#/group/grp_famille"]') }).textContent();
check('vu, la pastille s’en va', !/nouveauté/.test(after), after.replace(/\s+/g, ' '));
await page.click('[data-goto="#/group/grp_famille"]');
await page.waitForSelector('#news');
check('et la page dit qu’il n’y a rien de neuf', /Rien de neuf/.test(await page.locator('#news').textContent()));

// L'événement : jamais ouvert, il regarde la dernière semaine.
await page.goto('http://localhost:8099/dist/marque-points.html#/poll/v_raclette');
await page.waitForSelector('#news');
const eventNews = (await page.locator('#news').textContent()).replace(/\s+/g, ' ');
check('la page de l’événement a aussi son « Quoi de neuf »', /Ces 7 derniers jours/.test(eventNews) && /Courses/.test(eventNews), eventNews);

const bad = results.filter((r) => !r.ok);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
bad.forEach((b) => console.log('   ÉCHEC:', b.n, '→', b.d));
console.log('erreurs :', errors.filter((e) => !/404|TUNNEL/.test(e)));
await browser.close();
