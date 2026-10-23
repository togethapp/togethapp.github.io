/**
 * Les jeux qu'on joue dans l'app : les cartes en tête de l'onglet Jeux, la page
 * du Glouton qui se dessine, des flèches et un glissement qui le font avancer
 * et manger, la pause, et la partie qui survit à un rafraîchissement de la page
 * (sans s'arrêter) et à un aller-retour ailleurs (en pause, à reprendre). Le
 * Snake : il attend un premier geste, part, finit dans le mur. Chaque jeu garde
 * sa partie pendant qu'on joue à l'autre. Le record reste sur le téléphone.
 *
 * SHOTS=<dossier> : y laisse des captures, pour regarder.
 */
import { chromium } from 'playwright';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const SHOTS = process.env.SHOTS || '';
const B = 'http://localhost:8099/dist/marque-points.html';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message)));
await page.addInitScript(() => {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  localStorage.clear();
  localStorage.setItem('marque-points:prefs:v1', JSON.stringify({ me: 'Gui', lang: 'fr' }));
});
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const card = (id) => page.locator(`.arcade-card[data-goto="#/arcade/${id}"]`);
const status = async () => (await page.locator('#arcade-status').innerText()).trim();

await page.goto(`${B}#/games`);
await page.waitForSelector('.arcade-card');
check('la carte du Glouton en tête de l’onglet Jeux', /Glouton/.test(await card('glouton').innerText()));
check('et celle du Snake', /Snake/.test(await card('snake').innerText()));
await shot('arcade-onglet');

await card('glouton').click();
await page.waitForSelector('#arcade-board');
check('pas de barre d’onglets pendant le jeu', await page.locator('#tabs').isHidden());
check('la page du jeu a son titre', (await page.locator('#view h1').innerText()).trim() === 'Glouton');
check('« Prêt ! » au départ', /Prêt/.test(await page.locator('#arcade-status').innerText()));
const box = await page.locator('#arcade-board').boundingBox();
check('le labyrinthe tient dans l’écran', box.width > 250 && box.x >= 0 && box.x + box.width <= 390, JSON.stringify(box));
const painted = await page.evaluate(() => {
  const canvas = document.getElementById('arcade-board');
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let lit = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 300) lit += 1;
  return lit;
});
check('le labyrinthe est dessiné', painted > 1000, `${painted} points clairs`);

await page.waitForTimeout(2600);
check('la partie commence', (await page.locator('#arcade-status').innerText()).trim() === '');
const score = async () => Number(await page.locator('#arcade-score').innerText());
await page.waitForTimeout(600);
check('il mange en avançant', (await score()) > 0, String(await score()));
await shot('arcade-jeu');

// Les flèches à l'écran, et le clavier.
await page.locator('[data-arcade-dir="right"]').dispatchEvent('pointerdown');
await page.waitForTimeout(800);
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(400);
const before = await score();
// Un glissement du doigt vers le haut sur le labyrinthe.
await page.evaluate(() => {
  const canvas = document.getElementById('arcade-board');
  const r = canvas.getBoundingClientRect();
  const at = (y) => ({ clientX: r.x + r.width / 2, clientY: r.y + y, pointerId: 1, bubbles: true });
  canvas.dispatchEvent(new PointerEvent('pointerdown', at(300)));
  canvas.dispatchEvent(new PointerEvent('pointermove', at(260)));
  canvas.dispatchEvent(new PointerEvent('pointerup', at(260)));
});
await page.waitForTimeout(1200);
check('les commandes ne cassent rien et il continue de manger', (await score()) >= before);

await page.keyboard.press(' ');
await page.waitForTimeout(100);
check('Espace met en pause', /Pause/.test(await page.locator('#arcade-status').innerText()));
const paused = await score();
await page.waitForTimeout(600);
check('en pause, rien ne bouge', (await score()) === paused);
check('le bouton propose de reprendre', (await page.locator('#arcade-pause').getAttribute('aria-label')) === 'Reprendre');
await page.locator('#arcade-pause').click();
await page.waitForTimeout(500);

// L'app redessine la page quand la base dit quelque chose : la partie continue.
const running = await score();
await page.evaluate(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
await page.waitForTimeout(700);
check('un rafraîchissement de la page n’arrête pas la partie', !/Pause/.test(await status()) && (await score()) >= running, await status());

// Échap met en pause.
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
check('Échap met en pause', /Pause/.test(await status()));
await page.keyboard.press(' ');
await page.waitForTimeout(300);

// Un aller-retour : la partie attend, en pause.
await page.locator('[data-back]').click();
await page.waitForSelector('.arcade-card');
await card('glouton').click();
await page.waitForSelector('#arcade-board');
await page.waitForTimeout(200);
check('revenu, la partie est là, en pause', /Pause/.test(await page.locator('#arcade-status').innerText()) && (await score()) >= paused);

// Perdre toutes ses vies : le record est gardé.
await page.evaluate(() => {
  const board = document.getElementById('arcade-board');
  board.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }));
  board.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
});
let over = false;
for (let i = 0; i < 120 && !over; i += 1) {
  await page.waitForTimeout(500);
  over = /terminée/.test(await page.locator('#arcade-status').innerText());
}
check('les fantômes finissent par gagner', over);
await shot('arcade-fin');
const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('marque-points:prefs:v1')).arcade?.glouton);
check('le record est gardé', kept > 0, String(kept));
check('« Rejouer » proposé', (await page.locator('#arcade-pause').getAttribute('aria-label')) === 'Rejouer');
await page.locator('#arcade-pause').click();
await page.waitForTimeout(100);
check('une nouvelle partie repart de zéro', (await score()) === 0 && /Prêt/.test(await page.locator('#arcade-status').innerText()));
await page.goto(`${B}#/games`);
await page.waitForSelector('.arcade-card');
check('les onglets reviennent en quittant le jeu', await page.locator('#tabs').isVisible());
check('la carte montre le record', /Record/.test(await card('glouton').innerText()));

// Le Snake.
await card('snake').click();
await page.waitForSelector('#arcade-board[data-arcade="snake"]');
check('le Snake a son titre', (await page.locator('#view h1').innerText()).trim() === 'Snake');
const square = await page.locator('#arcade-board').boundingBox();
check('son terrain est carré et tient dans l’écran',
  Math.abs(square.width - square.height) < 2 && square.width > 250 && square.x >= 0 && square.x + square.width <= 390,
  JSON.stringify(square));
check('ni niveau ni vies au Snake', (await page.locator('#arcade-level, #arcade-lives').count()) === 0);
const green = await page.evaluate(() => {
  const canvas = document.getElementById('arcade-board');
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] < 130 && data[i + 1] > 200 && data[i + 2] > 110 && data[i + 2] < 210) count += 1;
  return count;
});
check('le serpent est dessiné', green > 200, `${green} points verts`);
await page.waitForTimeout(800);
check('il attend un premier geste', /Glissez/.test(await status()), await status());
await shot('snake-pret');
await page.keyboard.press('ArrowUp');
await page.waitForTimeout(150);
check('une flèche le fait partir', (await status()) === '', await status());
let crashed = false;
for (let i = 0; i < 40 && !crashed; i += 1) {
  await page.waitForTimeout(150);
  crashed = /terminée/.test(await status());
}
check('laissé à lui-même, il finit dans le mur', crashed);
await shot('snake-fin');
check('« Rejouer » proposé au Snake', (await page.locator('#arcade-pause').getAttribute('aria-label')) === 'Rejouer');
await page.keyboard.press(' ');
await page.waitForTimeout(100);
check('Espace relance une partie, qui attend son premier geste', /Glissez/.test(await status()));
await page.locator('[data-arcade-dir="down"]').dispatchEvent('pointerdown');
await page.waitForTimeout(500);
check('une flèche à l’écran le fait partir', (await status()) === '');
await shot('snake-jeu');

// Chaque jeu garde sa partie.
await page.goto(`${B}#/arcade/glouton`);
await page.waitForSelector('#arcade-board[data-arcade="glouton"]');
await page.waitForTimeout(200);
check('le Glouton a gardé sa partie, en pause', /Pause/.test(await status()), await status());
await page.goto(`${B}#/arcade/snake`);
await page.waitForSelector('#arcade-board[data-arcade="snake"]');
await page.waitForTimeout(200);
check('le Snake aussi', /Pause/.test(await status()), await status());

check('une adresse de jeu inconnue ramène aux Jeux', await (async () => {
  await page.goto(`${B}#/arcade/inconnu`);
  await page.waitForTimeout(400);
  return page.evaluate(() => location.hash === '#/games');
})());

check('aucune erreur de script', errors.length === 0, errors.join(' | '));
await browser.close();

const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log('ÉCHEC:', r.n, r.d);
console.log(results.length, 'vérifications |', results.length - bad.length, 'ok |', bad.length, 'échecs');
