/**
 * Un compte proposé à l'entrée : qui vient d'être accepté dans un groupe voit,
 * là où il arrive, de quoi se connecter tout de suite — ou « Plus tard ».
 */
import { chromium } from 'playwright';
const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const BASE = 'http://127.0.0.1:8123';
const CONFIG = JSON.stringify({ url: BASE, key: 'test-anon-key' });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function device(label, prefs) {
  const page = await (await browser.newContext({ viewport: { width: 400, height: 950 }, locale: 'fr-FR' })).newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.addInitScript(([c, p]) => {
    if (localStorage.getItem('marque-points:remote:v1')) return;
    localStorage.setItem('marque-points:remote:v1', c);
    if (p) localStorage.setItem('marque-points:prefs:v1', JSON.stringify(p));
  }, [CONFIG, prefs]);
  await page.goto('http://localhost:8099/dist/marque-points.html#/groups');
  await page.waitForSelector('.app-bar');
  return page;
}
async function rpc(fn, body) {
  const response = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: 'test-anon-key', authorization: 'Bearer test-anon-key' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
const codeFor = async (email) => (await (await fetch(`${BASE}/__code?email=${encodeURIComponent(email)}`)).json()).code;

/** Frapper avec une invitation, être accepté, arriver sur l'onglet Groupes. */
async function letIn(page, who) {
  const code = (await rpc('marque_points_invite', { p_key: 'la-cle-famille', p_minutes: 60, p_uses: 1 })).code;
  await page.fill('#group-name', 'Mifa');
  await page.fill('#group-code', code);
  await page.click('#group-join');
  await page.waitForSelector('[data-check]', { timeout: 15000 });
  const waiting = (await rpc('marque_points_requests', { p_key: 'la-cle-famille' })).find((one) => one.name === who);
  await rpc('marque_points_answer', { p_key: 'la-cle-famille', p_id: waiting.id, p_accept: true });
  await page.click('[data-check]');
  await page.waitForSelector('[data-catch-up]', { timeout: 15000 });
}

/* --- 1. Alice entre, et se connecte depuis la proposition ---------------- */

const alice = await device('Alice', { me: 'Alice' });
check('avant d’entrer, pas de proposition', (await alice.locator('.account-offer').count()) === 0);
await letIn(alice, 'Alice');
check('à peine entrée, un compte lui est proposé', (await alice.locator('.account-offer').count()) === 1);
const offer = await alice.locator('.account-offer').textContent();
check('qui nomme le groupe, dit « facultatif » et parle du lien de retour',
  /Garder Mifa sur un compte/.test(offer) && /Facultatif/.test(offer) && /lien de retour/.test(offer), offer.slice(0, 160));
check('avec le formulaire, sur place', (await alice.locator('.account-offer #account-email').count()) === 1);
check('le groupe est bien là, sous la proposition', (await alice.locator('[data-my-link]').count()) === 1);

await alice.fill('#account-email', 'alice@exemple.fr');
await alice.click('#account-email-form button[type=submit]');
await alice.waitForSelector('.account-offer #account-code');
await alice.fill('#account-code', await codeFor('alice@exemple.fr'));
await alice.click('#account-code-form button[type=submit]');
await alice.waitForFunction(() => !document.querySelector('.account-offer'), null, { timeout: 15000 });
check('connectée, la proposition s’en va', true);
await alice.waitForTimeout(1500);
const linked = await rpc('marque_points_group_of', {
  p_key: await alice.evaluate(() => JSON.parse(localStorage.getItem('marque-points:prefs:v1')).groups[0].key),
});
check('et sa clé est marquée à son compte', linked?.linked === true, JSON.stringify(linked));
await alice.reload();
await alice.waitForSelector('[data-catch-up]');
check('elle ne revient pas', (await alice.locator('.account-offer').count()) === 0);

/* --- 2. Bob entre, et répond « Plus tard » -------------------------------- */

const bob = await device('Bob', { me: 'Bob' });
await letIn(bob, 'Bob');
check('Bob aussi se voit proposer un compte', (await bob.locator('.account-offer').count()) === 1);
await bob.click('[data-account-later]');
await bob.waitForTimeout(300);
check('« Plus tard » la range', (await bob.locator('.account-offer').count()) === 0);
await bob.reload();
await bob.waitForSelector('[data-catch-up]');
check('pour de bon', (await bob.locator('.account-offer').count()) === 0);
check('Bob reste dans le groupe, sans compte', (await bob.locator('[data-catch-up]').count()) === 1);

/* --- 3. Qui est déjà connecté n'a rien à se voir proposer ---------------- */

const settled = await device('Gui', { me: 'Gui', groups: [{ id: 'grp_famille', name: 'Mifa', key: 'la-cle-famille', admits: true }] });
check('un appareil déjà dans le groupe, sans invitation, ne voit rien', (await settled.locator('.account-offer').count()) === 0);

check('aucune erreur de page', errors.length === 0, errors.join(' | '));
await browser.close();
const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log(`ÉCHEC: ${r.n} → ${r.d}`);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
process.exit(bad.length ? 1 : 0);
