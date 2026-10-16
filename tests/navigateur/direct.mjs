/**
 * Ce que les autres changent arrive aussitôt : la base l'annonce (Realtime),
 * l'app n'attend plus sa relève de 5 ou 20 secondes.
 */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8123';
const CONFIG = JSON.stringify({ url: BASE, key: 'test-anon-key' });
const MIFA = { id: 'grp_famille', name: 'Mifa', key: 'la-cle-famille', admits: true };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const errors = [];
async function device(label, prefs, hash = '') {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 1000 }, locale: 'fr-FR' })).newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.addInitScript(([c, p]) => {
    localStorage.setItem('marque-points:remote:v1', c);
    if (p && !localStorage.getItem('marque-points:prefs:v1')) localStorage.setItem('marque-points:prefs:v1', JSON.stringify(p));
  }, [CONFIG, prefs]);
  await page.goto(`http://localhost:8099/dist/marque-points.html${hash}`);
  await page.waitForSelector('.app-bar');
  return page;
}
/** Une autre personne, qui écrit dans la base sans passer par l'app. */
async function rpc(fn, body) {
  const response = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: 'test-anon-key', authorization: 'Bearer test-anon-key' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
/** Le temps qu'il faut pour que la condition soit vraie sur la page, ou null. */
async function delay(page, fn, arg) {
  const start = Date.now();
  const ok = await page.waitForFunction(fn, arg, { timeout: 15000, polling: 100 }).then(() => true).catch(() => false);
  return ok ? Date.now() - start : null;
}
const now = Date.now();

// 1. Une liste partagée dans le groupe par quelqu'un d'autre arrive sur l'accueil,
// sans attendre la relève de vingt secondes.
const me = await device('Gui', { me: 'Gui', groups: [MIFA] });
await me.waitForTimeout(2500); // la relève de l'ouverture est passée
const list = {
  kind: 'list', id: 'l_direct_1', name: 'Courses du week-end', createdAt: now, updatedAt: now, peopleAt: now,
  shared: true, groupId: 'grp_famille', archivedAt: null, template: false, removed: {}, people: [],
  items: [{ id: 'i_pain', text: 'Pain', done: false, createdAt: now, updatedAt: now }],
};
await rpc('marque_points_put', { p_id: list.id, p_data: list, p_key: 'la-cle-famille', p_owner: null });
let took = await delay(me, () => (JSON.parse(localStorage.getItem('marque-points:lists:v1') || '[]')).some((l) => l.id === 'l_direct_1'));
check('une liste partagée par un autre arrive en moins de 3 s', took !== null && took < 3000, `${took} ms`);

// 2. La liste ouverte : une ligne ajoutée ailleurs s'affiche, bien avant les 5 s.
await me.goto('http://localhost:8099/dist/marque-points.html#/list/l_direct_1');
await me.waitForSelector('text=Pain');
await me.waitForTimeout(1500);
const later = Date.now();
await rpc('marque_points_put', {
  p_id: list.id, p_key: 'la-cle-famille', p_owner: null,
  p_data: { ...list, updatedAt: later, items: [...list.items, { id: 'i_lait', text: 'Lait', done: false, createdAt: later, updatedAt: later }] },
});
took = await delay(me, () => document.body.innerText.includes('Lait'));
check('une ligne ajoutée ailleurs s’affiche en moins de 2 s', took !== null && took < 2000, `${took} ms`);

// 3. Un visiteur, sur un sondage par lien, voit arriver les autres réponses.
const poll = {
  kind: 'poll', id: 'v_direct_1', question: 'Quel soir ?', linkOnly: true, createdAt: now, updatedAt: now,
  options: [{ id: 'o1', text: 'vendredi' }, { id: 'o2', text: 'samedi' }], peopleAt: now, removed: {}, people: [{ id: 'p1', name: 'Paul' }], votes: {},
};
await rpc('marque_points_put', { p_id: poll.id, p_data: poll, p_key: 'la-cle-famille', p_owner: null });
const guest = await device('Léa', null, `#/poll/${poll.id}/solo`);
await guest.waitForSelector('#solo-me');
await guest.fill('#solo-me', 'Léa'); await guest.click('#solo-me-form button[type=submit]');
await guest.waitForSelector('.votes');
await guest.waitForTimeout(1500);
const voted = Date.now();
const stored = await rpc('marque_points_get', { p_id: poll.id });
await rpc('marque_points_put', {
  p_id: poll.id, p_key: null, p_owner: null,
  p_data: {
    ...stored, updatedAt: voted, peopleAt: voted, people: [...stored.people, { id: 'p2', name: 'Karim' }],
    votes: { ...stored.votes, 'p2|o2': { v: 'yes', at: voted } },
  },
});
took = await delay(guest, () => [...document.querySelectorAll('.votes thead th')].some((th) => th.textContent.includes('Karim')));
check('le visiteur voit arriver la réponse de Karim en moins de 2 s', took !== null && took < 2000, `${took} ms`);

// 4. Quelqu'un qui frappe : le portier le voit aussitôt.
await me.goto('http://localhost:8099/dist/marque-points.html#/groups');
await me.waitForTimeout(1500);
const code = (await rpc('marque_points_invite', { p_key: 'la-cle-famille', p_minutes: 60, p_uses: 1 }))?.code;
await rpc('marque_points_ask', { p_name: 'Mifa', p_code: code, p_who: 'Zoé', p_label: 'téléphone' });
took = await delay(me, () => document.body.innerText.includes('Zoé'));
check('qui frappe apparaît en moins de 3 s', took !== null && took < 3000, `${took} ms`);

check('aucune erreur de page', errors.length === 0, errors.join(' | '));
await browser.close();
const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log(`ÉCHEC: ${r.n} → ${r.d}`);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
process.exit(bad.length ? 1 : 0);
