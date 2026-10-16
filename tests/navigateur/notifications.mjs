/**
 * Les notifications : les activer dans les Réglages abonne l'appareil, groupe
 * par groupe ; écrire dans un groupe et frapper préviennent la fonction
 * « notifier ». Le navigateur de test n'a pas de service d'envoi : l'abonnement
 * est imité, le reste est le vrai chemin.
 */
import { chromium } from 'playwright';
const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const BASE = 'http://127.0.0.1:8123';
const CONFIG = JSON.stringify({ url: BASE, key: 'test-anon-key' });
const MIFA = { id: 'grp_famille', name: 'Mifa', key: 'la-cle-famille', admits: true };
const APP = 'http://localhost:8099/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function device(label, prefs, { where = `${APP}#/settings`, allow = true } = {}) {
  const context = await browser.newContext({ viewport: { width: 400, height: 950 }, locale: 'fr-FR' });
  if (allow) await context.grantPermissions(['notifications'], { origin: 'http://localhost:8099' });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.addInitScript(([c, p, who]) => {
    if (!localStorage.getItem('marque-points:remote:v1')) {
      localStorage.setItem('marque-points:remote:v1', c);
      if (p) localStorage.setItem('marque-points:prefs:v1', JSON.stringify(p));
    }
    // Pas de service d'envoi ici : un abonnement de la bonne forme.
    if (typeof PushManager === 'undefined') return;
    const fake = () => ({
      endpoint: `https://push.example/${who}`,
      toJSON: () => ({
        endpoint: `https://push.example/${who}`,
        keys: { p256dh: 'BA3xkPq8MXN8qJ3wk_0BrivFfuUnIdGzFWzitn3FfhXJyS5nAgjhs3xLrV-TvwrlAz6OYo_vwuqCGf6w7SIYtlw', auth: 'IxNSocK0BfpuTPJ-9QH84w' },
      }),
      unsubscribe: async () => { localStorage.removeItem('fake-sub'); return true; },
    });
    PushManager.prototype.getSubscription = async function () { return localStorage.getItem('fake-sub') ? fake() : null; };
    PushManager.prototype.subscribe = async function (options) {
      localStorage.setItem('fake-sub', String(options?.applicationServerKey?.byteLength ?? 0));
      return fake();
    };
  }, [CONFIG, prefs, label]);
  await page.goto(where);
  await page.waitForSelector('.app-bar');
  return page;
}
const seen = async () => (await fetch(`${BASE}/__notifier`)).json();
async function rpc(fn, body) {
  const response = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: 'test-anon-key', authorization: 'Bearer test-anon-key' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/* --- 1. Gui active les notifications ------------------------------------- */

const gui = await device('gui', { me: 'Gui', groups: [MIFA] });
await gui.evaluate(() => navigator.serviceWorker.ready);
await gui.reload();
await gui.waitForSelector('#notify');
check('les Réglages ont une section Notifications, qui dit ce qui est annoncé',
  /Notifications[\s\S]*nouveau sondage[\s\S]*date retenue[\s\S]*frappe/.test(await gui.locator('#notify').textContent()));
await gui.click('#notify-on');
await gui.waitForFunction(() => /Activées sur cet appareil/.test(document.querySelector('#notify')?.textContent || ''), null, { timeout: 15000 });
check('un toucher, et c’est activé', true);
let state = await seen();
check('la clé publique a été demandée à la fonction', state.calls.some((call) => call.action === 'key'));
check('l’abonnement a été pris avec cette clé (65 octets)', (await gui.evaluate(() => localStorage.getItem('fake-sub'))) === '65');
check('et confié à la base pour Mifa, avec l’adresse de l’app',
  state.subscriptions.length === 1 && state.subscriptions[0].group === 'grp_famille'
    && state.subscriptions[0].endpoint === 'https://push.example/gui' && state.subscriptions[0].app === APP
    && state.subscriptions[0].lang === 'fr',
  JSON.stringify(state.subscriptions));

/* --- 2. Ce que Gui écrit prévient la fonction, une fois par nouveauté ---- */

await gui.goto(`${APP}#/lists/new`);
await gui.waitForSelector('#new-list');
await gui.fill('#list-name', 'Courses');
await gui.fill('#list-lines', 'Pain\nLait');
await gui.click('#new-list button[type=submit]');
await gui.waitForFunction(() => /^#\/list\//.test(location.hash));
const listId = (await gui.evaluate(() => location.hash)).split('/')[2];
await gui.waitForTimeout(1500);
state = await seen();
const told = state.calls.filter((call) => call.action === 'doc' && call.id === listId);
check('une liste créée dans le groupe prévient la fonction, avec la clé du groupe',
  told.length === 1 && told[0].key === 'la-cle-famille', JSON.stringify(told));
await gui.locator('[data-tick]').first().click();
await gui.waitForTimeout(1500);
state = await seen();
check('cocher une ligne ensuite ne la redit pas', state.calls.filter((call) => call.action === 'doc' && call.id === listId).length === 1);

/* --- 3. Quelqu'un frappe : la fonction en est prévenue ------------------- */

const code = (await rpc('marque_points_invite', { p_key: 'la-cle-famille', p_minutes: 60, p_uses: 1 })).code;
const zoe = await device('zoe', { me: 'Zoé' }, { where: `${APP}#/groups` });
await zoe.fill('#group-name', 'Mifa');
await zoe.fill('#group-code', code);
await zoe.click('#group-join');
await zoe.waitForSelector('[data-check]', { timeout: 15000 });
await zoe.waitForTimeout(800);
state = await seen();
check('frapper prévient la fonction, avec le ticket', state.calls.some((call) => call.action === 'knock' && typeof call.ticket === 'string' && call.ticket.length > 5));
check('Zoé, sans clé, ne s’est abonnée à rien', !state.subscriptions.some((one) => one.endpoint.endsWith('/zoe')));

/* --- 4. Désactiver ------------------------------------------------------- */

await gui.goto(`${APP}#/settings`);
await gui.waitForSelector('#notify-off');
await gui.click('#notify-off');
await gui.waitForSelector('#notify-on');
state = await seen();
check('désactiver oublie l’abonnement, dans la base et dans le navigateur',
  state.subscriptions.length === 0 && (await gui.evaluate(() => localStorage.getItem('fake-sub'))) === null,
  JSON.stringify(state.subscriptions));

/* --- 5. Les cas où il n'y a rien à activer -------------------------------- */

const alone = await device('seul', { me: 'Léo' });
await alone.waitForSelector('#notify');
check('sans groupe, on dit d’entrer d’abord dans un groupe', /Entrez d’abord dans un groupe/.test(await alone.locator('#notify').textContent()));
const blocked = await device('bloque', { me: 'Ana', groups: [MIFA] }, { allow: false });
await blocked.waitForSelector('#notify-on');
await blocked.evaluate(() => { Notification.requestPermission = async () => 'denied'; });
await blocked.click('#notify-on');
await blocked.waitForFunction(() => /permission/.test(document.querySelector('#view')?.textContent || ''), null, { timeout: 10000 });
check('refusé par le téléphone, l’app le dit et n’abonne rien', !(await seen()).subscriptions.some((one) => one.endpoint.endsWith('/bloque')));
const single = await device('fichier', { me: 'Gui', groups: [MIFA] }, { where: `${APP}dist/marque-points.html#/settings` });
await single.waitForSelector('#notify');
check('le fichier unique, sans service worker, dit qu’il ne reçoit pas de notifications',
  /ne reçoit pas de notifications/.test(await single.locator('#notify').textContent()));

check('aucune erreur de page', errors.length === 0, errors.join(' | '));
await browser.close();
const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log(`ÉCHEC: ${r.n} → ${r.d}`);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
process.exit(bad.length ? 1 : 0);
