/**
 * Des noms piégés partout — un prénom, un titre, une ligne, un choix, un groupe
 * qui seraient du HTML — et chaque écran les affiche comme du texte, sans
 * jamais les exécuter. C'est par là qu'une faille entrerait : un membre du
 * groupe, ou un visiteur d'un lien, qui écrit ce qu'il veut.
 */
import { chromium } from 'playwright';
import { createList, addItems } from '../../src/lists.js';
import { createPoll, addOptions, setVote, createEvent } from '../../src/polls.js';
import { createSpend, addSpend } from '../../src/spends.js';
import { createGame } from '../../src/model.js';
import { createBoard, addCard, editCardText } from '../../src/ideas.js';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const B = 'http://localhost:8099/dist/marque-points.html';

// Trois façons d'essayer : une balise, une sortie d'attribut, une fin de champ.
const TAG = '<img src=x onerror="window.__pieges=(window.__pieges||0)+1">';
const ATTR = '" autofocus onfocus="window.__pieges=1" x="';
const END = '</textarea><script>window.__pieges=1</script>';

const pad = (n) => String(n).padStart(2, '0');
const inDays = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function documents(where) {
  const list = { ...addItems(createList({ name: TAG, names: [TAG, ATTR] }), `${TAG}\n${ATTR}\n${END}`), ...where };
  let poll = { ...addOptions(createPoll({ question: `${TAG} ?`, names: [TAG, ATTR] }), `${TAG}\n${ATTR}`), ...where };
  poll = setVote(poll, poll.people[0].id, poll.options[0].id, true);
  const event = { ...createEvent({ name: TAG, names: [TAG, ATTR], date: inDays(4), at: '19:00' }), ...where };
  list.parent = event.id;
  let spend = { ...createSpend({ name: ATTR, names: [TAG, ATTR] }), ...where };
  spend = addSpend(spend, { text: TAG, amount: 4200, by: spend.people[0].id, forWhom: spend.people.map((p) => p.id) });
  const game = { ...createGame({ presetId: 'papayoo', names: [TAG, ATTR, END] }), name: TAG, ...where };
  let board = { ...createBoard({ name: TAG }), ...where };
  const made = addCard(board, 'note');
  board = editCardText(made.board, made.cardId, `${TAG} ${END}`);
  return { list, poll, event, spend, game, board };
}

const routesOf = (docs) => [
  '#/', '#/agenda', '#/groups', '#/settings', '#/lists', '#/polls', '#/games', '#/spends', '#/ideas',
  `#/list/${docs.list.id}`, `#/poll/${docs.poll.id}`, `#/poll/${docs.poll.id}/solo`, `#/poll/${docs.event.id}`,
  `#/spend/${docs.spend.id}`, `#/game/${docs.game.id}`, `#/idea/${docs.board.id}`, '#/group/grp_famille',
  `#/person/${encodeURIComponent(TAG)}`, `#/person/${encodeURIComponent(ATTR)}`, '#/stats',
  // Les liens qui remplissent un formulaire (« Remplir avec Claude ») : du texte venu d'ailleurs.
  `#/lists/new?titre=${enc(TAG)}&lignes=${enc(`${TAG}\n${ATTR}\n${END}`)}&personnes=${enc(ATTR)}`,
  `#/polls/new?question=${enc(TAG)}&choix=${enc(`${TAG}\n${END}`)}&personnes=${enc(TAG)}`,
  `#/spends/new?titre=${enc(ATTR)}&personnes=${enc(TAG)}`,
  `#/agenda/new?titre=${enc(TAG)}&personnes=${enc(ATTR)}`,
];
const enc = encodeURIComponent;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function tour(label, seed, docs) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-FR' })).newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('dialog', (dialog) => { errors.push(`${label}: une boîte « ${dialog.message()} »`); void dialog.dismiss(); });
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    for (const [key, value] of Object.entries(data)) localStorage.setItem(key, JSON.stringify(value));
  }, seed);
  let n = 0;
  const caught = [];
  let shownAsText = 0;
  for (const hash of routesOf(docs)) {
    n += 1;
    await page.goto(`${B}?n=${n}${hash}`);
    await page.waitForSelector('.app-bar');
    // Tout ce qui se replie s'ouvre, pour que le piège soit bien à l'écran.
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    await page.waitForTimeout(250);
    const facts = await page.evaluate(() => ({
      ran: window.__pieges || 0,
      // L'app n'écrit jamais d'attribut on… : en trouver un, c'est une injection.
      handlers: [...document.querySelectorAll('*')].filter((node) => [...node.attributes].some((a) => /^on/i.test(a.name)))
        .map((node) => node.outerHTML.slice(0, 80)),
      images: document.querySelectorAll('img[src="x"]').length,
      scripts: [...document.scripts].filter((s) => /__pieges/.test(s.textContent)).length,
      text: document.body.innerText.includes('<img src=x'),
    }));
    if (facts.ran || facts.handlers.length || facts.images || facts.scripts) caught.push(`${hash} ${JSON.stringify(facts)}`);
    if (facts.text) shownAsText += 1;
  }
  check(`${label} : aucun piège ne s’exécute ni ne s’insère, sur ${n} écrans`, caught.length === 0, caught.join(' | ').slice(0, 400));
  check(`${label} : les noms piégés se lisent comme du texte`, shownAsText >= 8, `${shownAsText} écrans`);
  await page.context().close();
}

// Sur l'appareil seul, puis partagé dans un groupe au nom piégé lui aussi.
const alone = documents({});
await tour('appareil seul', {
  'marque-points:prefs:v1': { me: TAG },
  'marque-points:lists:v1': [alone.list],
  'marque-points:polls:v1': [alone.poll, alone.event],
  'marque-points:games:v1': [alone.game],
  'marque-points:spends:v1': [alone.spend],
  'marque-points:boards:v1': [alone.board],
}, alone);

const shared = documents({ groupId: 'grp_famille', shared: true });
await tour('dans un groupe', {
  'marque-points:prefs:v1': { me: ATTR, groups: [{ id: 'grp_famille', name: TAG, key: 'la-cle-famille', admits: true }] },
  'marque-points:lists:v1': [shared.list],
  'marque-points:polls:v1': [shared.poll, shared.event],
  'marque-points:games:v1': [shared.game],
  'marque-points:spends:v1': [shared.spend],
  'marque-points:boards:v1': [shared.board],
  'marque-points:remote:v1': { url: 'http://127.0.0.1:8123', key: 'test-anon-key' },
}, shared);

check('aucune erreur de page', errors.length === 0, errors.join(' | ').slice(0, 300));
await browser.close();
const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log(`ÉCHEC: ${r.n} → ${r.d}`);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
process.exit(bad.length ? 1 : 0);
