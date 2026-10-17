/**
 * Le déménagement : un téléphone qui avait Together à l'ancienne adresse
 * ouvre un ancien lien. La page laissée là-bas (relais/404.html) l'envoie à la
 * nouvelle adresse avec ce qu'il gardait, et l'app le reprend — ici sur
 * demande, l'ancienne adresse de ce test n'étant pas celle que l'app connaît
 * (la reprise sans question est vérifiée par tests/move.test.js).
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { createPoll, addOptions } from '../../src/polls.js';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const APP = 'http://localhost:8099/dist/marque-points.html';
const OLD = 'http://localhost:8097';

// L'ancienne adresse : sa page « introuvable » pour tout chemin, comme GitHub,
// qui envoie ici vers l'app de ce test.
const relay = readFileSync(new URL('../../relais/404.html', import.meta.url), 'utf8')
  .replace("const NEW = 'https://togethapp.github.io/';", `const NEW = '${APP}';`);
const server = createServer((req, res) => {
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
  res.end(relay);
}).listen(8097);

const poll = addOptions(createPoll({ question: 'Quel soir pour la raclette ?', names: ['Zoé', 'Léa'] }), 'Vendredi\nSamedi');
const kept = {
  'marque-points:prefs:v1': JSON.stringify({ me: 'Zoé', lang: 'fr', organiser: { [poll.id]: 'secret-orga' } }),
  'marque-points:polls:v1': JSON.stringify([poll]),
  'marque-points:account:v1': JSON.stringify({ refresh: 'session' }),
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function phone(seed) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' })).newPage();
  page.on('pageerror', (e) => errors.push(String(e.message)));
  await page.addInitScript(([entries, old]) => {
    if (location.origin !== old || localStorage.getItem('graine')) return;
    localStorage.setItem('graine', '1');
    for (const [name, value] of Object.entries(entries)) localStorage.setItem(name, value);
  }, [seed, OLD]);
  return page;
}

// 1. Un ancien lien de sondage, sur le téléphone qui avait tout.
const zoe = await phone(kept);
await zoe.goto(`${OLD}/Code/sondage.html#/poll/${poll.id}/solo`);
await zoe.waitForURL((url) => url.href.startsWith(APP), { timeout: 15000 });
await zoe.waitForSelector('.dialog--ask[open]', { timeout: 15000 });
const asked = await zoe.locator('.ask-message').textContent();
check('l’app demande avant de reprendre des données d’une autre adresse', /1 document/.test(asked) && /0 groupe/.test(asked), asked);
check('l’adresse ne garde rien de ce qui a voyagé', !zoe.url().includes('#/move/') && zoe.url().endsWith(`#/poll/${poll.id}/solo`), zoe.url());
await zoe.click('.dialog--ask [data-answer="yes"]');
await zoe.waitForSelector('.votes', { timeout: 15000 });
const here = await zoe.evaluate(() => ({
  prefs: JSON.parse(localStorage.getItem('marque-points:prefs:v1') || '{}'),
  polls: JSON.parse(localStorage.getItem('marque-points:polls:v1') || '[]'),
  account: localStorage.getItem('marque-points:account:v1'),
}));
check('le prénom et le droit d’organiser ont suivi', here.prefs.me === 'Zoé' && here.prefs.organiser?.[poll.id] === 'secret-orga', JSON.stringify(here.prefs));
check('le sondage aussi, et il s’ouvre là où allait le lien',
  here.polls.some((one) => one.id === poll.id) && /Quel soir pour la raclette/.test(await zoe.locator('h1').textContent()));
check('la session du compte est restée là-bas', here.account === null);

// 2. Le même téléphone rouvre un ancien lien : rien ne repart.
await zoe.goto(`${OLD}/Code/#/poll/${poll.id}/solo`);
await zoe.waitForURL((url) => url.href.startsWith(APP), { timeout: 15000 });
await zoe.waitForSelector('.votes', { timeout: 15000 });
check('la seconde fois, l’ancien lien mène droit au sondage, sans rien emporter',
  (await zoe.locator('.dialog--ask[open]').count()) === 0 && zoe.url() === `${APP}#/poll/${poll.id}/solo`, zoe.url());

// 3. Quelqu'un qui dit non : rien n'est écrit.
const leo = await phone(kept);
await leo.goto(`${OLD}/Code/#/`);
await leo.waitForSelector('.dialog--ask[open]', { timeout: 15000 });
await leo.click('.dialog--ask [data-answer="no"]');
await leo.waitForTimeout(300);
const refused = await leo.evaluate(() => localStorage.getItem('marque-points:polls:v1'));
check('non : rien n’est repris', !refused || JSON.parse(refused).length === 0, String(refused));

// 4. Un téléphone qui n'avait rien : il arrive, simplement.
const new_ = await phone({});
await new_.goto(`${OLD}/Code/#/settings`);
await new_.waitForURL((url) => url.href.startsWith(APP), { timeout: 15000 });
await new_.waitForSelector('[data-pick-look]', { timeout: 15000 });
check('sans rien gardé, l’ancien lien mène là où il allait', new_.url() === `${APP}#/settings`, new_.url());

check('aucune erreur de page', errors.length === 0, errors.join(' | '));
await browser.close();
server.close();

const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log('ÉCHEC:', r.n, r.d);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
