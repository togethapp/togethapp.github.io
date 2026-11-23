// Généré par tools/bundle.js — modifiez les sources, pas ce fichier.
(globalThis.TOGETHER_PARTS ||= {}).arcade = ({ ARCADE_MODES, arcadeMode, backButtonHtml, bestOf, escapeHtml, keepBest, modeOf, savePrefs, sendScore, state, t }) => {
// ---- src/arcade.js ---------------------------------------------------
const GLOUTON_MAZE = [
'###################',
'#........#........#',
'#o##.###.#.###.##o#',
'#.................#',
'#.##.#.#####.#.##.#',
'#....#...#...#....#',
'####.### # ###.####',
'   #.#   G   #.#   ',
'####.# ##-## #.####',
'    .  #GGG#  .    ',
'####.# ##### #.####',
'   #.#       #.#   ',
'####.# ##### #.####',
'#........#........#',
'#.##.###.#.###.##.#',
'#o.#.....P.....#.o#',
'##.#.#.#####.#.#.##',
'#....#...#...#....#',
'#.######.#.######.#',
'#.................#',
'###################',
];
const ARCADE_DIRS = {
up: { x: 0, y: -1 },
left: { x: -1, y: 0 },
down: { x: 0, y: 1 },
right: { x: 1, y: 0 },
};
const DIR_ORDER = ['up', 'left', 'down', 'right'];
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const GHOST_NAMES = ['red', 'pink', 'cyan', 'orange'];
const RELEASE = [0, 1.5, 5, 9];
const PHASES = [7, 20, 7, 20, 5, 20, 5];
const SHORT_SCATTER_LEVEL = 3;
const POINTS = { pellet: 10, power: 50 };
const READY_TIME = 2;
const DYING_TIME = 1.6;
const CLEARED_TIME = 1.8;
const GHOST_FREEZE = 0.5;
const POPUP_TIME = 1.2;
const EXTRA_LIFE = 10000;
const FRUIT_AT = [0.3, 0.7];
const FRUIT_TIME = 9.5;
const FRUITS = [
{ kind: 'cherry', points: 100 },
{ kind: 'strawberry', points: 300 },
{ kind: 'orange', points: 500 },
{ kind: 'apple', points: 700 },
{ kind: 'grapes', points: 1000 },
{ kind: 'melon', points: 2000 },
{ kind: 'bell', points: 3000 },
{ kind: 'key', points: 5000 },
];
const CORNER = 0.35;
const GLOUTON_MODES = {
easy: { lives: 5, ghost: 0.82, release: 1.6, fright: 2.5, angry: false },
normal: { lives: 3, ghost: 1, release: 1, fright: 0, angry: true },
hard: { lives: 3, ghost: 1.1, release: 0.6, fright: -1.5, angry: true },
};
const EPSILON = 1e-6;
function parseMaze(rows = GLOUTON_MAZE) {
const height = rows.length;
const width = Math.max(...rows.map((row) => row.length));
const cells = [];
const ghosts = [];
let player = null;
let door = null;
for (let y = 0; y < height; y += 1) {
const line = [];
for (let x = 0; x < width; x += 1) {
const char = rows[y][x] || ' ';
if (char === 'P') player = { x, y };
if (char === 'G') ghosts.push({ x, y });
if (char === '-') door = { x, y };
line.push(char === 'P' || char === 'G' ? ' ' : char);
}
cells.push(line);
}
const tunnel = new Set();
for (let y = 0; y < height; y += 1) {
if (cells[y][0] === '#' || cells[y][width - 1] === '#') continue;
for (let x = 0; x < width && cells[y][x] === ' '; x += 1) tunnel.add(`${x},${y}`);
for (let x = width - 1; x >= 0 && cells[y][x] === ' '; x -= 1) tunnel.add(`${x},${y}`);
}
const under = door && { x: door.x, y: door.y + 3 };
const fruit = under && cells[under.y]?.[under.x] === ' ' ? under : player;
return { width, height, cells, player, ghosts, door, tunnel, fruit };
}
function inTunnel(maze, x, y) {
const column = ((Math.round(x) % maze.width) + maze.width) % maze.width;
return maze.tunnel.has(`${column},${Math.round(y)}`);
}
function cellAt(maze, x, y) {
if (y < 0 || y >= maze.height) return '#';
const column = ((x % maze.width) + maze.width) % maze.width;
return maze.cells[y][column];
}
function canEnter(maze, x, y, throughDoor = false) {
const cell = cellAt(maze, x, y);
if (cell === '#') return false;
if (cell === '-') return throughDoor;
return true;
}
function pelletsLeft(maze) {
let count = 0;
for (const line of maze.cells) for (const cell of line) if (cell === '.' || cell === 'o') count += 1;
return count;
}
function newGlouton(rows = GLOUTON_MAZE, mode = 'normal') {
const maze = parseMaze(rows);
const settings = GLOUTON_MODES[arcadeMode(mode)];
const game = {
rows,
maze,
mode: arcadeMode(mode),
score: 0,
lives: settings.lives,
level: 1,
total: pelletsLeft(maze),
eaten: 0,
fruits: 0,
fruit: null,
popups: [],
freeze: 0,
extra: false,
};
startLife(game);
return game;
}
function fruitOf(level) {
return FRUITS[Math.min(level, FRUITS.length) - 1];
}
function addPoints(game, points) {
game.score += points;
if (!game.extra && game.score >= EXTRA_LIFE) {
game.extra = true;
game.lives += 1;
game.events.push('life');
}
}
function phasesOf(game) {
if (game.level < SHORT_SCATTER_LEVEL) return PHASES;
return PHASES.map((time, index) => (index % 2 ? time : Math.min(time, 5)));
}
function startLife(game) {
const { maze } = game;
game.player = { x: maze.player.x, y: maze.player.y, dir: 'left', want: 'left', moving: true };
game.ghosts = maze.ghosts.map((at, index) => ({
name: GHOST_NAMES[index % GHOST_NAMES.length],
x: at.x,
y: at.y,
dir: index === 0 ? 'left' : null,
mode: index === 0 ? 'out' : 'house',
release: (RELEASE[index] ?? RELEASE.at(-1) + index) * GLOUTON_MODES[game.mode || 'normal'].release,
home: { x: at.x, y: at.y },
}));
game.phase = 0;
game.phaseTime = 0;
game.clock = 0;
game.fright = 0;
game.chain = 0;
game.fruit = null;
game.freeze = 0;
game.popups = [];
game.state = 'ready';
game.timer = READY_TIME;
}
function steerGlouton(game, dir) {
if (!ARCADE_DIRS[dir]) return;
const { player, maze } = game;
player.want = dir;
if (dir === OPPOSITE[player.dir]) {
player.dir = dir;
player.moving = true;
return;
}
if (dir === player.dir || centred(player) || !ARCADE_DIRS[player.dir]) return;
const step = ARCADE_DIRS[player.dir];
const tile = { x: Math.round(player.x), y: Math.round(player.y) };
const past = (player.x - tile.x) * step.x + (player.y - tile.y) * step.y;
const turn = ARCADE_DIRS[dir];
if (past > 0 && past <= CORNER && canEnter(maze, tile.x + turn.x, tile.y + turn.y)) {
player.x = tile.x;
player.y = tile.y;
player.dir = dir;
player.moving = true;
}
}
function speeds(level, mode = 'normal') {
const settings = GLOUTON_MODES[arcadeMode(mode)];
const lift = Math.min(level - 1, 6) * 0.05;
return {
player: 6 * (1 + lift / 2),
ghost: 5.4 * (1 + lift) * settings.ghost,
scared: 3.4,
eaten: 12,
fright: Math.max(1, 6.5 - level + settings.fright),
};
}
function angerOf(game) {
if (!GLOUTON_MODES[game.mode || 'normal'].angry) return 0;
const left = game.total - game.eaten;
const threshold = Math.max(10, Math.round(game.total * 0.12));
if (left <= threshold / 2) return 2;
if (left <= threshold) return 1;
return 0;
}
function centred(actor) {
return Math.abs(actor.x - Math.round(actor.x)) < EPSILON && Math.abs(actor.y - Math.round(actor.y)) < EPSILON;
}
function advance(maze, actor, distance, choose) {
let left = distance;
for (let guard = 0; left > EPSILON && guard < 64; guard += 1) {
if (centred(actor)) {
actor.x = Math.round(actor.x);
actor.y = Math.round(actor.y);
if (actor.x < 0) actor.x += maze.width;
if (actor.x >= maze.width) actor.x -= maze.width;
const dir = choose(actor);
if (!dir) return;
actor.dir = dir;
}
const step = ARCADE_DIRS[actor.dir];
const along = step.x ? actor.x : actor.y;
const sign = step.x || step.y;
const toNext = sign > 0 ? Math.floor(along + EPSILON) + 1 - along : along - (Math.ceil(along - EPSILON) - 1);
const move = Math.min(left, toNext);
actor.x += step.x * move;
actor.y += step.y * move;
left -= move;
}
}
function playerChoice(maze, player) {
for (const dir of [player.want, player.dir]) {
const step = ARCADE_DIRS[dir];
if (step && canEnter(maze, player.x + step.x, player.y + step.y)) {
player.moving = true;
return dir;
}
}
player.moving = false;
return null;
}
function exitTile(maze) {
return { x: maze.door.x, y: maze.door.y - 1 };
}
function ghostTarget(game, ghost) {
const { maze, player } = game;
if (ghost.mode === 'eaten') return { x: maze.door.x, y: maze.door.y + 1 };
if (ghost.mode === 'leaving') return exitTile(maze);
const corners = {
red: { x: maze.width - 2, y: -2 },
pink: { x: 1, y: -2 },
cyan: { x: maze.width - 1, y: maze.height },
orange: { x: 0, y: maze.height },
};
const scatter = phasesOf(game).length > game.phase && game.phase % 2 === 0;
if (scatter && !(ghost.name === 'red' && angerOf(game))) return corners[ghost.name];
const px = Math.round(player.x);
const py = Math.round(player.y);
const ahead = ARCADE_DIRS[player.dir] || { x: 0, y: 0 };
if (ghost.name === 'pink') return { x: px + 4 * ahead.x, y: py + 4 * ahead.y };
if (ghost.name === 'cyan') {
const red = game.ghosts.find((other) => other.name === 'red') || ghost;
const pivot = { x: px + 2 * ahead.x, y: py + 2 * ahead.y };
return { x: 2 * pivot.x - Math.round(red.x), y: 2 * pivot.y - Math.round(red.y) };
}
if (ghost.name === 'orange') {
const far = (px - ghost.x) ** 2 + (py - ghost.y) ** 2 > 64;
return far ? { x: px, y: py } : corners.orange;
}
return { x: px, y: py };
}
function ghostChoice(game, ghost, random) {
const { maze } = game;
const throughDoor = ghost.mode === 'eaten' || ghost.mode === 'leaving';
const open = DIR_ORDER.filter((dir) => {
const step = ARCADE_DIRS[dir];
return canEnter(maze, ghost.x + step.x, ghost.y + step.y, throughDoor);
});
if (!open.length) return null;
const forward = open.filter((dir) => dir !== OPPOSITE[ghost.dir]);
const options = forward.length ? forward : open;
if (ghost.scared && ghost.mode === 'out') return options[Math.floor(random() * options.length) % options.length];
const target = ghostTarget(game, ghost);
let best = options[0];
let bestDistance = Infinity;
for (const dir of options) {
const step = ARCADE_DIRS[dir];
const distance = (ghost.x + step.x - target.x) ** 2 + (ghost.y + step.y - target.y) ** 2;
if (distance < bestDistance) {
best = dir;
bestDistance = distance;
}
}
return best;
}
function eatAt(game) {
const { maze, player } = game;
if (!centred(player)) return;
const x = ((Math.round(player.x) % maze.width) + maze.width) % maze.width;
const y = Math.round(player.y);
const cell = maze.cells[y][x];
if (cell === '.') {
addPoints(game, POINTS.pellet);
game.events.push('pellet');
} else if (cell === 'o') {
addPoints(game, POINTS.power);
game.fright = speeds(game.level, game.mode).fright;
game.chain = 0;
for (const ghost of game.ghosts) {
if (ghost.mode !== 'out') continue;
ghost.scared = true;
if (ghost.dir) ghost.dir = OPPOSITE[ghost.dir];
}
game.events.push('power');
} else {
return;
}
maze.cells[y][x] = ' ';
game.eaten += 1;
if (game.fruits < FRUIT_AT.length && game.eaten >= Math.ceil(game.total * FRUIT_AT[game.fruits])) {
game.fruits += 1;
game.fruit = { ...maze.fruit, ...fruitOf(game.level), left: FRUIT_TIME };
}
}
function touching(a, b, width) {
let dx = Math.abs(a.x - b.x);
dx = Math.min(dx, width - dx);
return dx < 0.6 && Math.abs(a.y - b.y) < 0.6;
}
function stepGlouton(game, dt, random = Math.random) {
game.events = [];
const time = Math.min(Math.max(dt, 0), 0.1);
if (game.state === 'over' || game.state === 'paused') return game.events;
game.popups = (game.popups || []).filter((popup) => (popup.left -= time) > 0);
if (game.state !== 'play') {
game.timer -= time;
if (game.timer > 0) return game.events;
if (game.state === 'dying') {
if (game.lives <= 0) {
game.state = 'over';
game.events.push('over');
return game.events;
}
startLife(game);
} else if (game.state === 'cleared') {
game.level += 1;
game.maze = parseMaze(game.rows);
game.eaten = 0;
game.fruits = 0;
startLife(game);
} else {
game.state = 'play';
}
return game.events;
}
if (game.freeze > 0) {
game.freeze = Math.max(0, game.freeze - time);
return game.events;
}
const speed = speeds(game.level, game.mode);
const phases = phasesOf(game);
game.clock += time;
if (game.fruit) {
game.fruit.left -= time;
if (game.fruit.left <= 0) game.fruit = null;
}
if (game.fright > 0) {
game.fright = Math.max(0, game.fright - time);
if (!game.fright) for (const ghost of game.ghosts) ghost.scared = false;
} else if (game.phase < phases.length) {
game.phaseTime += time;
if (game.phaseTime >= phases[game.phase]) {
game.phaseTime = 0;
game.phase += 1;
for (const ghost of game.ghosts) if (ghost.mode === 'out' && ghost.dir) ghost.dir = OPPOSITE[ghost.dir];
}
}
const { maze, player } = game;
let left = speed.player * time;
while (left > EPSILON) {
const bit = Math.min(left, 0.5);
advance(maze, player, bit, (actor) => playerChoice(maze, actor));
eatAt(game);
left -= bit;
}
for (const ghost of game.ghosts) {
if (ghost.mode === 'house') {
if (game.clock >= ghost.release) ghost.mode = 'leaving';
else continue;
}
let pace = ghost.mode === 'eaten' ? speed.eaten : ghost.scared ? speed.scared : speed.ghost;
if (ghost.mode === 'out' && !ghost.scared && ghost.name === 'red') pace *= 1 + 0.07 * angerOf(game);
if (ghost.mode !== 'eaten' && inTunnel(maze, ghost.x, ghost.y)) pace *= 0.5;
advance(maze, ghost, pace * time, (actor) => {
const exit = exitTile(maze);
if (actor.mode === 'leaving' && actor.x === exit.x && actor.y === exit.y) {
actor.mode = 'out';
actor.dir = 'left';
}
if (actor.mode === 'eaten' && actor.x === maze.door.x && actor.y === maze.door.y + 1) {
actor.mode = 'leaving';
actor.scared = false;
actor.dir = null;
}
return ghostChoice(game, actor, random);
});
}
for (const ghost of game.ghosts) {
if (ghost.mode !== 'out' || !touching(player, ghost, maze.width)) continue;
if (ghost.scared) {
game.chain += 1;
const points = 100 * 2 ** game.chain;
addPoints(game, points);
game.popups.push({ x: ghost.x, y: ghost.y, points, left: POPUP_TIME });
game.freeze = GHOST_FREEZE;
ghost.mode = 'eaten';
ghost.scared = false;
game.events.push('ghost');
} else {
game.lives -= 1;
game.state = 'dying';
game.timer = DYING_TIME;
game.events.push('caught');
return game.events;
}
}
if (game.fruit && touching(player, game.fruit, maze.width)) {
addPoints(game, game.fruit.points);
game.popups.push({ x: game.fruit.x, y: game.fruit.y, points: game.fruit.points, left: POPUP_TIME });
game.fruit = null;
game.events.push('fruit');
}
if (!pelletsLeft(maze)) {
game.state = 'cleared';
game.timer = CLEARED_TIME;
game.events.push('cleared');
}
return game.events;
}
const SNAKE_SIZE = 17;
const SNAKE_LENGTH = 3;
const SNAKE_QUEUE = 3;
const SNAKE_DYING_TIME = 1.2;
const STAR_EVERY = 5;
const STAR_TIME = 6;
const SNAKE_MODES = {
easy: { start: 5, gain: 0.12, top: 9, apple: 5, wrap: true },
normal: { start: 6.5, gain: 0.2, top: 14, apple: 10, wrap: false },
hard: { start: 8.5, gain: 0.3, top: 18, apple: 20, wrap: false },
};
function snakeRate(apples, mode = 'normal') {
const settings = SNAKE_MODES[arcadeMode(mode)];
return Math.min(settings.top, settings.start + apples * settings.gain);
}
function starPoints(left) {
return 20 + 10 * Math.ceil(Math.max(0, left));
}
function newSnake(random = Math.random, size = SNAKE_SIZE, mode = 'normal') {
const middle = Math.floor(size / 2);
const body = [];
for (let i = 0; i < SNAKE_LENGTH; i += 1) body.push({ x: middle - 2 - i, y: middle });
const game = {
width: size,
height: size,
mode: arcadeMode(mode),
wrap: SNAKE_MODES[arcadeMode(mode)].wrap,
body,
dir: 'right',
queue: [],
trail: { x: middle - 2 - SNAKE_LENGTH, y: middle },
apple: null,
star: null,
swallowing: null,
apples: 0,
score: 0,
won: false,
state: 'ready',
acc: 0,
progress: 0,
timer: 0,
};
game.apple = freeTile(game, random);
return game;
}
function freeTile(game, random, avoid = []) {
const taken = new Set([...game.body, ...avoid.filter(Boolean)].map((tile) => `${tile.x},${tile.y}`));
const free = [];
for (let y = 0; y < game.height; y += 1) {
for (let x = 0; x < game.width; x += 1) if (!taken.has(`${x},${y}`)) free.push({ x, y });
}
return free.length ? free[Math.floor(random() * free.length) % free.length] : null;
}
function steerSnake(game, dir) {
if (!ARCADE_DIRS[dir]) return;
if (game.state === 'ready') game.state = 'play';
if (game.state !== 'play') return;
const last = game.queue.at(-1) || game.dir;
if (dir === last || dir === OPPOSITE[last]) return;
if (game.queue.length < SNAKE_QUEUE) game.queue.push(dir);
}
function slither(game, random) {
if (game.queue.length) game.dir = game.queue.shift();
const step = ARCADE_DIRS[game.dir];
const next = { x: game.body[0].x + step.x, y: game.body[0].y + step.y };
if (game.wrap) {
next.x = (next.x + game.width) % game.width;
next.y = (next.y + game.height) % game.height;
}
const here = (tile) => Boolean(tile) && tile.x === next.x && tile.y === next.y;
const grows = here(game.apple);
const stays = grows ? game.body : game.body.slice(0, -1);
const outside = next.x < 0 || next.y < 0 || next.x >= game.width || next.y >= game.height;
if (outside || stays.some(here)) {
game.state = 'dying';
game.timer = SNAKE_DYING_TIME;
game.swallowing = null;
game.events.push('crash');
return;
}
game.trail = grows ? null : game.body.at(-1);
game.body = [next, ...stays];
game.swallowing = null;
if (here(game.star)) {
game.score += starPoints(game.star.left);
game.star = null;
game.events.push('star');
}
if (!grows) return;
game.apples += 1;
game.score += SNAKE_MODES[game.mode || 'normal'].apple;
game.swallowing = next;
game.events.push('apple');
if (game.body.length >= game.width * game.height) {
game.apple = null;
game.won = true;
game.state = 'over';
game.events.push('over');
return;
}
const spot = freeTile(game, random, [game.star]);
if (spot) {
game.apple = spot;
} else {
game.apple = { x: game.star.x, y: game.star.y };
game.star = null;
}
if (!game.star && game.apples % STAR_EVERY === 0) {
const place = freeTile(game, random, [game.apple]);
if (place) game.star = { ...place, left: STAR_TIME };
}
}
function stepSnake(game, dt, random = Math.random) {
game.events = [];
const time = Math.min(Math.max(dt, 0), 0.1);
if (game.state === 'dying') {
game.timer -= time;
if (game.timer <= 0) {
game.state = 'over';
game.events.push('over');
}
return game.events;
}
if (game.state !== 'play') return game.events;
if (game.star) {
game.star.left -= time;
if (game.star.left <= 0) game.star = null;
}
game.acc += time;
const rate = () => snakeRate(game.apples, game.mode);
while (game.state === 'play' && game.acc >= 1 / rate()) {
game.acc -= 1 / rate();
slither(game, random);
}
game.progress = game.state === 'play' ? Math.min(1, game.acc * rate()) : 1;
return game.events;
}
function togglePause(game) {
if (game.state === 'paused') game.state = game.pausedFrom || 'play';
else if (game.state !== 'over') {
game.pausedFrom = game.state;
game.state = 'paused';
}
return game.state;
}

// ---- src/view-arcade-play.js -----------------------------------------
const arcadeRuns = new Map();
const ARCADE_ENGINES = {
glouton: {
create: (mode) => newGlouton(GLOUTON_MAZE, mode),
step: stepGlouton,
steer: steerGlouton,
draw: drawGlouton,
hud: ['level', 'lives'],
texts: { ready: 'arcade.ready', dying: 'arcade.caught' },
shake: 'caught',
},
snake: {
create: (mode) => newSnake(Math.random, SNAKE_SIZE, mode),
step: stepSnake,
steer: steerSnake,
draw: drawSnake,
hud: [],
texts: { ready: 'arcade.snake.ready', dying: 'arcade.snake.crash' },
shake: 'crash',
},
};
const GHOST_COLOURS = { red: '#ff4b5c', pink: '#ff8fd8', cyan: '#5ff3ff', orange: '#ffad4d' };
const SNAKE_GREEN = '#46f0a0';
const APPLE_RED = '#ff4b5c';
const GOLD = '#ffd23f';
const ARROWS = [
['up', 'M12 6 5 16h14z'],
['left', 'M6 12l10-7v14z'],
['down', 'M12 18 5 8h14z'],
['right', 'M18 12 8 5v14z'],
];
const SOUND_ON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const SOUND_OFF_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m16 9 6 6m0-6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const KEYS = {
ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
z: 'up', w: 'up', s: 'down', q: 'left', a: 'left', d: 'right',
};
function engineOf(id) {
return Object.hasOwn(ARCADE_ENGINES, id) ? ARCADE_ENGINES[id] : null;
}
let audio = null;
let pellets = 0;
function soundOn() {
return state.prefs?.arcadeSound !== false;
}
function wakeAudio() {
if (!soundOn()) return;
try {
const Context = window.AudioContext || window.webkitAudioContext;
if (!audio && Context) audio = new Context();
if (audio?.state === 'suspended') audio.resume();
} catch {
audio = null;
}
}
function tone(freq, start, length, { type = 'square', volume = 0.035, to = 0 } = {}) {
const at = audio.currentTime + start;
const oscillator = audio.createOscillator();
const gain = audio.createGain();
oscillator.type = type;
oscillator.frequency.setValueAtTime(freq, at);
if (to) oscillator.frequency.exponentialRampToValueAtTime(to, at + length);
gain.gain.setValueAtTime(volume, at);
gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
oscillator.connect(gain);
gain.connect(audio.destination);
oscillator.start(at);
oscillator.stop(at + length + 0.02);
}
const notes = (list, gap, options) => list.forEach((freq, index) => tone(freq, index * gap, gap * 1.4, options));
const SOUNDS = {
pellet: () => {
pellets += 1;
tone(pellets % 2 ? 480 : 360, 0, 0.06, { type: 'triangle', volume: 0.06 });
},
power: () => tone(180, 0, 0.4, { type: 'sawtooth', to: 720, volume: 0.03 }),
ghost: () => tone(300, 0, 0.3, { type: 'square', to: 1400 }),
fruit: () => notes([660, 990], 0.08, { type: 'triangle', volume: 0.06 }),
life: () => notes([523, 659, 784, 1047], 0.09, { type: 'square' }),
caught: () => tone(700, 0, 1.1, { type: 'triangle', to: 90, volume: 0.07 }),
cleared: () => notes([523, 659, 784, 1047, 784, 1047], 0.1, { type: 'square' }),
apple: () => notes([440, 660], 0.05, { type: 'square', volume: 0.04 }),
star: () => notes([784, 988, 1175, 1568], 0.06, { type: 'triangle', volume: 0.06 }),
crash: () => tone(260, 0, 0.5, { type: 'sawtooth', to: 50, volume: 0.05 }),
record: () => notes([523, 659, 784, 659, 784, 1047], 0.11, { type: 'square' }),
};
function playSounds(events) {
if (!audio || !soundOn() || audio.state !== 'running') return;
for (const event of new Set(events)) {
try {
SOUNDS[event]?.();
} catch {
}
}
}
function arcadeView(id) {
const engine = engineOf(id);
if (!engine) return '';
const name = escapeHtml(t(`arcade.${id}.name`));
const arrow = ([dir, path]) => `
    <button type="button" class="arcade-pad__key arcade-pad__key--${dir}" data-arcade-dir="${dir}"
            aria-label="${escapeHtml(t(`arcade.dir.${dir}`))}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>
    </button>`;
const chosen = modeOf(id);
const mode = (option) => `
    <button type="button" class="segmented__option" data-arcade-mode="${option}"
            aria-pressed="${option === chosen}">${escapeHtml(t(`arcade.mode.${option}`))}</button>`;
return `
    <div class="spread page-head">
      ${backButtonHtml('#/games')}
      <h1>${name}</h1>
    </div>
    <div class="arcade">
      <div class="segmented arcade__modes" role="group" aria-label="${escapeHtml(t('arcade.mode'))}">
        ${ARCADE_MODES.map(mode).join('')}
      </div>
      <div class="arcade__hud">
        <span>${escapeHtml(t('arcade.score'))} <strong id="arcade-score">0</strong></span>
        ${engine.hud.includes('level') ? `<span>${escapeHtml(t('arcade.level'))} <strong id="arcade-level">1</strong></span>` : ''}
        <span>${escapeHtml(t('arcade.record'))} <strong id="arcade-best">${bestOf(id, chosen)}</strong></span>
        ${engine.hud.includes('lives') ? '<span id="arcade-lives" class="arcade__lives" role="img"></span>' : ''}
      </div>
      <canvas id="arcade-board" class="arcade__board arcade__board--${escapeHtml(id)}" data-arcade="${escapeHtml(id)}"
              role="img" aria-label="${name}"></canvas>
      <p id="arcade-status" class="arcade__status" aria-live="polite"></p>
      <div class="arcade-pad">
        ${ARROWS.map(arrow).join('')}
        <button type="button" class="arcade-pad__key arcade-pad__key--pause" id="arcade-pause"
                aria-label="${escapeHtml(t('arcade.pause'))}" title="${escapeHtml(t('arcade.pause'))}">${PAUSE_ICON}</button>
        <button type="button" class="arcade-pad__key arcade-pad__key--sound" id="arcade-sound"
                aria-pressed="${soundOn()}" aria-label="${escapeHtml(t('arcade.sound'))}"
                title="${escapeHtml(t('arcade.sound'))}">${soundOn() ? SOUND_ON_ICON : SOUND_OFF_ICON}</button>
      </div>
    </div>
    <p class="muted small arcade__rules">${escapeHtml(t(`arcade.${id}.rules`))} <span id="arcade-mode-rule">${escapeHtml(t(`arcade.${id}.mode.${chosen}`))}</span> ${escapeHtml(t('arcade.how'))}</p>`;
}
function bindArcade(id) {
const canvas = document.getElementById('arcade-board');
const engine = engineOf(id);
if (!canvas || !engine) return;
if (!arcadeRuns.has(id)) arcadeRuns.set(id, { game: engine.create(modeOf(id)), shown: null });
const run = arcadeRuns.get(id);
run.shown = null;
const context = canvas.getContext('2d');
const afresh = () => {
run.game = engine.create(modeOf(id));
run.record = false;
run.flash = null;
};
const restartOrResume = () => {
if (run.game.state === 'over') afresh();
else if (run.game.state === 'paused') togglePause(run.game);
};
const pauseOrRestart = () => {
if (run.game.state === 'over') afresh();
else togglePause(run.game);
};
const go = (dir) => {
wakeAudio();
restartOrResume();
engine.steer(run.game, dir);
};
document.querySelectorAll('[data-arcade-mode]').forEach((button) => {
button.addEventListener('click', () => {
const mode = arcadeMode(button.dataset.arcadeMode);
state.prefs.arcadeMode = { ...(state.prefs.arcadeMode || {}), [id]: mode };
savePrefs(state.prefs);
afresh();
document.querySelectorAll('[data-arcade-mode]').forEach((other) => {
other.setAttribute('aria-pressed', String(other === button));
});
const rule = document.getElementById('arcade-mode-rule');
if (rule) rule.textContent = t(`arcade.${id}.mode.${mode}`);
run.shown = null;
});
});
const sound = document.getElementById('arcade-sound');
sound.addEventListener('click', () => {
state.prefs.arcadeSound = !soundOn();
savePrefs(state.prefs);
sound.setAttribute('aria-pressed', String(soundOn()));
sound.innerHTML = soundOn() ? SOUND_ON_ICON : SOUND_OFF_ICON;
wakeAudio();
});
document.querySelectorAll('[data-arcade-dir]').forEach((button) => {
button.addEventListener('pointerdown', (event) => {
event.preventDefault();
go(button.dataset.arcadeDir);
});
button.addEventListener('click', (event) => {
if (event.detail === 0) go(button.dataset.arcadeDir);
});
});
document.getElementById('arcade-pause').addEventListener('click', () => {
wakeAudio();
pauseOrRestart();
});
const zone = canvas.closest('.arcade') || canvas;
let origin = null;
zone.addEventListener('pointerdown', (event) => {
if (event.target instanceof Element && event.target.closest('button')) return;
wakeAudio();
origin = { x: event.clientX, y: event.clientY };
try {
zone.setPointerCapture?.(event.pointerId);
} catch {
}
});
zone.addEventListener('pointermove', (event) => {
if (!origin) return;
const dx = event.clientX - origin.x;
const dy = event.clientY - origin.y;
if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) return;
go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
origin = { x: event.clientX, y: event.clientY };
});
const lift = () => {
if (origin && ['over', 'paused'].includes(run.game.state)) restartOrResume();
origin = null;
};
zone.addEventListener('pointerup', lift);
zone.addEventListener('pointercancel', () => { origin = null; });
const onKey = (event) => {
if (event.ctrlKey || event.metaKey || event.altKey) return;
const target = event.target instanceof Element ? event.target : null;
if (target?.closest('input, textarea, select, [contenteditable]')) return;
if ((event.key === ' ' || event.key === 'Enter') && target?.closest('button')) return;
const dir = KEYS[event.key] || KEYS[event.key?.toLowerCase?.()];
if (dir) {
event.preventDefault();
go(dir);
} else if (event.key === ' ' || event.key === 'p') {
event.preventDefault();
pauseOrRestart();
} else if (event.key === 'Escape' && !['paused', 'over'].includes(run.game.state)) {
togglePause(run.game);
}
};
const onHide = () => {
if (document.hidden && !['paused', 'over'].includes(run.game.state)) togglePause(run.game);
};
document.addEventListener('keydown', onKey);
document.addEventListener('visibilitychange', onHide);
let last = null;
const frame = (now) => {
if (!canvas.isConnected) {
document.removeEventListener('keydown', onKey);
document.removeEventListener('visibilitychange', onHide);
const still = document.getElementById('arcade-board')?.dataset.arcade === id;
if (!still && !['paused', 'over'].includes(run.game.state)) togglePause(run.game);
return;
}
const dt = last === null ? 0 : (now - last) / 1000;
last = now;
const events = engine.step(run.game, dt);
if (events.includes(engine.shake)) navigator.vibrate?.(200);
else if (events.includes('ghost') || events.includes('star')) navigator.vibrate?.(30);
if (events.includes('over')) {
const before = bestOf(id, run.game.mode);
run.record = keepBest(id, run.game.mode, run.game.score) && before > 0;
run.game.record = run.record;
const { mode, score } = run.game;
void sendScore(id, mode, score);
if (run.record) events.push('record');
}
if (events.includes('life')) run.flash = { text: t('arcade.extraLife'), until: now + 2000 };
playSounds(events);
run.now = now;
engine.draw(canvas, context, run.game, now);
showHud(run, id, engine);
requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
}
function statusOf(run, engine) {
const { game } = run;
if (game.state === 'over' && run.record) return t('arcade.newRecord', { score: game.score });
if (game.state === 'over') return t(game.won ? 'arcade.won' : 'arcade.over', { score: game.score });
if (run.flash && run.now < run.flash.until) return run.flash.text;
if (game.state === 'cleared') return t('arcade.cleared', { level: game.level });
if (game.state === 'paused') return t('arcade.paused');
return engine.texts[game.state] ? t(engine.texts[game.state]) : '';
}
function bannerOf(game) {
if (game.state === 'over' && game.record) return t('arcade.recordShort');
if (game.state === 'over') return t(game.won ? 'arcade.wonShort' : 'arcade.overShort');
if (game.state === 'cleared') return t('arcade.cleared', { level: game.level });
if (game.state === 'paused') return t('arcade.paused');
if (game.state === 'ready') return t('arcade.ready');
return '';
}
function showHud(run, id, engine) {
const { game } = run;
const status = statusOf(run, engine);
const shown = `${game.score}|${game.level}|${game.lives}|${status}`;
if (run.shown === shown) return;
run.shown = shown;
const put = (where, value) => {
const element = document.getElementById(where);
if (element) element.textContent = value;
};
put('arcade-score', game.score);
put('arcade-level', game.level);
put('arcade-best', Math.max(bestOf(id, game.mode), game.score));
put('arcade-status', status);
const lives = document.getElementById('arcade-lives');
if (lives) {
const count = Math.max(0, game.lives);
lives.textContent = '●'.repeat(count);
lives.setAttribute('aria-label', t('arcade.lives', { count }));
}
const pause = document.getElementById('arcade-pause');
const label = t(game.state === 'over' ? 'arcade.again' : game.state === 'paused' ? 'arcade.resume' : 'arcade.pause');
pause.setAttribute('aria-label', label);
pause.title = label;
pause.innerHTML = ['over', 'paused'].includes(game.state) ? PLAY_ICON : PAUSE_ICON;
}
function fitBoard(canvas, context, columns, rows) {
const ratio = Math.min(2, window.devicePixelRatio || 1);
const width = canvas.clientWidth;
if (!width) return null;
const size = width / columns;
const height = size * rows;
if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
canvas.width = Math.round(width * ratio);
canvas.height = Math.round(height * ratio);
}
const root = getComputedStyle(document.documentElement);
const token = (name, fallback) => {
const value = root.getPropertyValue(name).trim();
return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
};
const deep = token('--holo-deep', '#03060d');
context.setTransform(ratio, 0, 0, ratio, 0, 0);
context.fillStyle = deep;
context.fillRect(0, 0, width, height);
return { width, height, size, deep, wall: token('--holo-hue', '#5ff3ff') };
}
function glowStroke(context, colour, wide, thin) {
context.lineCap = 'round';
context.lineJoin = 'round';
context.strokeStyle = colour;
context.shadowColor = colour;
context.shadowBlur = wide;
context.globalAlpha = 0.35;
context.lineWidth = wide;
context.stroke();
context.globalAlpha = 1;
context.shadowBlur = wide / 2;
context.lineWidth = thin;
context.stroke();
context.shadowBlur = 0;
}
function drawBanner(context, text, x, y, size, deep) {
if (!text) return;
context.font = `700 ${Math.round(size * 1.1)}px system-ui, sans-serif`;
context.textAlign = 'center';
context.textBaseline = 'middle';
const boxWidth = context.measureText(text).width + size;
context.fillStyle = deep;
context.fillRect(x - boxWidth / 2, y - size * 0.8, boxWidth, size * 1.6);
context.fillStyle = GOLD;
context.fillText(text, x, y);
}
function drawGlouton(canvas, context, game, now) {
const { maze } = game;
const board = fitBoard(canvas, context, maze.width, maze.height);
if (!board) return;
const { width, size, deep, wall } = board;
const wallAt = (x, y) => x >= 0 && x < maze.width && y >= 0 && y < maze.height && maze.cells[y][x] === '#';
const centre = (value) => (value + 0.5) * size;
context.beginPath();
for (let y = 0; y < maze.height; y += 1) {
for (let x = 0; x < maze.width; x += 1) {
if (!wallAt(x, y)) continue;
context.moveTo(centre(x), centre(y));
if (wallAt(x + 1, y)) context.lineTo(centre(x + 1), centre(y));
else context.lineTo(centre(x) + 0.01, centre(y));
if (wallAt(x, y + 1)) {
context.moveTo(centre(x), centre(y));
context.lineTo(centre(x), centre(y + 1));
}
}
}
glowStroke(context, wall, size * 0.55, Math.max(1.5, size * 0.14));
context.strokeStyle = GHOST_COLOURS.pink;
context.lineWidth = Math.max(1.5, size * 0.14);
context.beginPath();
context.moveTo(maze.door.x * size, (maze.door.y + 0.5) * size);
context.lineTo((maze.door.x + 1) * size, (maze.door.y + 0.5) * size);
context.stroke();
const blink = Math.floor(now / 250) % 2 === 0 || game.state !== 'play';
context.fillStyle = '#ffe2c4';
for (let y = 0; y < maze.height; y += 1) {
for (let x = 0; x < maze.width; x += 1) {
const cell = maze.cells[y][x];
if (cell !== '.' && !(cell === 'o' && blink)) continue;
context.beginPath();
context.arc((x + 0.5) * size, (y + 0.5) * size, cell === 'o' ? size * 0.3 : size * 0.1, 0, Math.PI * 2);
context.fill();
}
}
if (game.fruit && (game.fruit.left > 2 || Math.floor(now / 150) % 2 === 0)) {
drawFruit(context, game.fruit.kind, (game.fruit.x + 0.5) * size, (game.fruit.y + 0.5) * size, size * 0.42);
}
const { player } = game;
const angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[player.dir] || 0;
let mouth = player.moving && game.state === 'play' ? 0.05 + 0.3 * Math.abs(Math.sin(now / 70)) : 0.2;
let radius = size * 0.45;
if (game.state === 'dying') {
const gone = 1 - Math.max(0, game.timer) / 1.6;
mouth = 0.2 + gone * 0.8;
radius *= 1 - gone * 0.3;
}
const at = (value) => (value + 0.5) * size;
context.fillStyle = GOLD;
context.shadowColor = GOLD;
context.shadowBlur = size / 2;
for (const offset of [0, -maze.width, maze.width]) {
context.beginPath();
context.moveTo(at(player.x + offset), at(player.y));
context.arc(at(player.x + offset), at(player.y), radius, angle + mouth * Math.PI, angle - mouth * Math.PI + Math.PI * 2);
context.closePath();
context.fill();
}
context.shadowBlur = 0;
if (game.state !== 'dying') {
for (const ghost of game.ghosts) {
if (!(game.freeze > 0 && ghost.mode === 'eaten')) drawGhost(context, ghost, game, size, now);
}
}
context.font = `800 ${Math.round(size * 0.75)}px system-ui, sans-serif`;
context.textAlign = 'center';
context.textBaseline = 'middle';
for (const popup of game.popups || []) {
const rise = (1.2 - popup.left) * size * 0.4;
context.fillStyle = deep;
context.globalAlpha = 0.7;
const text = String(popup.points);
const boxWidth = context.measureText(text).width + size * 0.3;
context.fillRect(at(popup.x) - boxWidth / 2, at(popup.y) - rise - size * 0.45, boxWidth, size * 0.9);
context.globalAlpha = 1;
context.fillStyle = GHOST_COLOURS.cyan;
context.fillText(text, at(popup.x), at(popup.y) - rise);
}
drawBanner(context, bannerOf(game), width / 2, (maze.door.y + 3.5) * size, size, deep);
}
function drawGhost(context, ghost, game, size, now) {
const x = (ghost.x + 0.5) * size;
const y = (ghost.y + 0.5) * size;
const r = size * 0.45;
if (ghost.mode !== 'eaten') {
const ending = ghost.scared && game.fright < 2 && Math.floor(now / 200) % 2 === 0;
context.fillStyle = ghost.scared ? (ending ? '#f2f2ff' : '#3a55ff') : GHOST_COLOURS[ghost.name];
context.beginPath();
context.arc(x, y - r * 0.15, r, Math.PI, 0);
const bottom = y + r * 0.85;
context.lineTo(x + r, bottom);
const waves = 3;
const wiggle = Math.floor(now / 150) % 2 ? 0 : r / waves;
for (let i = 0; i < waves * 2; i += 1) {
const px = x + r - ((i + 1) * r) / waves;
context.lineTo(px + (i % 2 ? 0 : wiggle * 0.3), bottom - (i % 2 ? 0 : r * 0.25));
}
context.closePath();
context.fill();
if (ghost.scared) {
context.fillStyle = ending ? '#ff4b5c' : '#ffe2c4';
for (const side of [-1, 1]) {
context.beginPath();
context.arc(x + side * r * 0.35, y - r * 0.25, r * 0.12, 0, Math.PI * 2);
context.fill();
}
return;
}
}
const look = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[ghost.dir] || [0, 0];
for (const side of [-1, 1]) {
const ex = x + side * r * 0.38;
const ey = y - r * 0.2;
context.fillStyle = '#ffffff';
context.beginPath();
context.arc(ex, ey, r * 0.28, 0, Math.PI * 2);
context.fill();
context.fillStyle = '#1b2a8f';
context.beginPath();
context.arc(ex + look[0] * r * 0.12, ey + look[1] * r * 0.12, r * 0.14, 0, Math.PI * 2);
context.fill();
}
}
function drawFruit(context, kind, x, y, r) {
const disc = (cx, cy, radius, colour) => {
context.fillStyle = colour;
context.beginPath();
context.arc(cx, cy, radius, 0, Math.PI * 2);
context.fill();
};
const stem = (points, colour = SNAKE_GREEN) => {
context.strokeStyle = colour;
context.lineWidth = Math.max(1, r * 0.16);
context.lineCap = 'round';
context.beginPath();
context.moveTo(...points[0]);
for (const point of points.slice(1)) context.lineTo(...point);
context.stroke();
};
context.shadowBlur = r * 0.8;
if (kind === 'cherry') {
context.shadowColor = APPLE_RED;
stem([[x - r * 0.45, y + r * 0.3], [x + r * 0.35, y - r * 0.85], [x + r * 0.4, y + r * 0.4]]);
disc(x - r * 0.45, y + r * 0.4, r * 0.45, APPLE_RED);
disc(x + r * 0.4, y + r * 0.5, r * 0.45, APPLE_RED);
} else if (kind === 'strawberry') {
context.shadowColor = APPLE_RED;
context.fillStyle = APPLE_RED;
context.beginPath();
context.moveTo(x - r * 0.85, y - r * 0.35);
context.quadraticCurveTo(x, y - r * 0.75, x + r * 0.85, y - r * 0.35);
context.quadraticCurveTo(x + r * 0.6, y + r * 0.7, x, y + r);
context.quadraticCurveTo(x - r * 0.6, y + r * 0.7, x - r * 0.85, y - r * 0.35);
context.fill();
context.shadowBlur = 0;
for (const [dx, dy] of [[-0.35, 0], [0.35, 0], [0, 0.4], [0, -0.2]]) disc(x + dx * r, y + dy * r, r * 0.08, '#ffe2c4');
stem([[x - r * 0.4, y - r * 0.6], [x, y - r * 0.45], [x + r * 0.4, y - r * 0.6]]);
} else if (kind === 'orange') {
context.shadowColor = '#ffad4d';
disc(x, y + r * 0.1, r * 0.85, '#ffad4d');
context.shadowBlur = 0;
stem([[x, y - r * 0.7], [x + r * 0.45, y - r * 0.95]]);
} else if (kind === 'apple') {
context.shadowBlur = 0;
drawApple(context, x, y + r * 0.1, r * 0.8);
} else if (kind === 'grapes') {
context.shadowColor = '#b46cff';
for (const [dx, dy] of [[-0.45, -0.35], [0, -0.35], [0.45, -0.35], [-0.22, 0.1], [0.22, 0.1], [0, 0.55]]) {
disc(x + dx * r, y + dy * r, r * 0.3, '#b46cff');
}
context.shadowBlur = 0;
stem([[x, y - r * 0.65], [x + r * 0.2, y - r]]);
} else if (kind === 'melon') {
context.shadowColor = SNAKE_GREEN;
context.fillStyle = SNAKE_GREEN;
context.beginPath();
context.ellipse(x, y + r * 0.1, r * 0.95, r * 0.75, 0, 0, Math.PI * 2);
context.fill();
context.shadowBlur = 0;
context.strokeStyle = '#0b5d36';
context.lineWidth = Math.max(1, r * 0.1);
for (const dx of [-0.45, 0, 0.45]) {
context.beginPath();
context.moveTo(x + dx * r, y - r * 0.6);
context.quadraticCurveTo(x + dx * r * 1.4, y + r * 0.1, x + dx * r, y + r * 0.8);
context.stroke();
}
} else if (kind === 'bell') {
context.shadowColor = GOLD;
context.fillStyle = GOLD;
context.beginPath();
context.moveTo(x - r * 0.9, y + r * 0.6);
context.quadraticCurveTo(x - r * 0.7, y - r * 0.95, x, y - r * 0.9);
context.quadraticCurveTo(x + r * 0.7, y - r * 0.95, x + r * 0.9, y + r * 0.6);
context.closePath();
context.fill();
context.shadowBlur = 0;
disc(x, y + r * 0.75, r * 0.22, GOLD);
} else {
context.shadowColor = GHOST_COLOURS.cyan;
context.strokeStyle = GHOST_COLOURS.cyan;
context.lineWidth = Math.max(1.5, r * 0.25);
context.beginPath();
context.arc(x, y - r * 0.45, r * 0.4, 0, Math.PI * 2);
context.moveTo(x, y - r * 0.05);
context.lineTo(x, y + r);
context.moveTo(x, y + r * 0.55);
context.lineTo(x + r * 0.35, y + r * 0.55);
context.moveTo(x, y + r * 0.9);
context.lineTo(x + r * 0.3, y + r * 0.9);
context.stroke();
}
context.shadowBlur = 0;
}
function drawSnake(canvas, context, game, now) {
const board = fitBoard(canvas, context, game.width + 1, game.height + 1);
if (!board) return;
const { width, height, size, deep, wall } = board;
const at = (value) => (value + 1) * size;
context.fillStyle = wall;
context.globalAlpha = 0.06;
for (let y = 0; y < game.height; y += 1) {
for (let x = y % 2; x < game.width; x += 2) context.fillRect(at(x) - size / 2, at(y) - size / 2, size, size);
}
context.globalAlpha = 1;
context.beginPath();
context.rect(size / 4, size / 4, width - size / 2, height - size / 2);
if (game.wrap) context.setLineDash([size * 0.5, size * 0.6]);
glowStroke(context, wall, size * 0.4, Math.max(1.5, size * 0.12));
context.setLineDash([]);
const pulse = 1 + 0.06 * Math.sin(now / 180);
if (game.apple) drawApple(context, at(game.apple.x), at(game.apple.y), size * 0.36 * pulse);
if (game.swallowing) drawApple(context, at(game.swallowing.x), at(game.swallowing.y), size * 0.36);
if (game.star && (game.star.left > 1.5 || Math.floor(now / 150) % 2 === 0)) {
drawStar(context, at(game.star.x), at(game.star.y), size * 0.48, now / 900);
}
const { body } = game;
const mix = (from, to) => ({
x: from.x + (to.x - from.x) * game.progress,
y: from.y + (to.y - from.y) * game.progress,
});
const near = (value, from, span) => value + Math.round((from - value) / span) * span;
const beside = (tile, before) => ({ x: near(tile.x, before.x, game.width), y: near(tile.y, before.y, game.height) });
const flat = [{ ...body[0] }];
for (const tile of body.slice(1)) flat.push(beside(tile, flat.at(-1)));
const flatTrail = game.trail && beside(game.trail, flat.at(-1));
const ahead = { x: flat[0].x - flat[1].x, y: flat[0].y - flat[1].y };
const head = mix(flat[1], flat[0]);
const tail = flatTrail ? mix(flatTrail, flat.at(-1)) : flat.at(-1);
const points = [head, ...flat.slice(1), tail];
const colour = game.state === 'dying' && Math.floor(now / 120) % 2 === 0 ? APPLE_RED : SNAKE_GREEN;
const shifts = [{ x: 0, y: 0 }];
if (game.wrap) {
const xs = points.map((point) => point.x);
const ys = points.map((point) => point.y);
for (const dx of [-game.width, 0, game.width]) {
for (const dy of [-game.height, 0, game.height]) {
if (!dx && !dy) continue;
const inside = Math.max(...xs) + dx > -1 && Math.min(...xs) + dx < game.width
&& Math.max(...ys) + dy > -1 && Math.min(...ys) + dy < game.height;
if (inside) shifts.push({ x: dx, y: dy });
}
}
context.save();
context.beginPath();
context.rect(size / 2, size / 2, width - size, height - size);
context.clip();
}
context.globalAlpha = game.state === 'over' ? 0.5 : 1;
const r = size * 0.42;
for (const shift of shifts) {
context.beginPath();
context.moveTo(at(points[0].x + shift.x), at(points[0].y + shift.y));
for (const point of points.slice(1)) context.lineTo(at(point.x + shift.x), at(point.y + shift.y));
context.lineCap = 'round';
context.lineJoin = 'round';
context.strokeStyle = colour;
context.shadowColor = colour;
context.shadowBlur = size * 0.5;
context.lineWidth = size * 0.72;
context.stroke();
context.shadowBlur = 0;
context.strokeStyle = 'rgba(255, 255, 255, 0.28)';
context.lineWidth = size * 0.2;
context.stroke();
drawSnakeHead(context, game, at(head.x + shift.x), at(head.y + shift.y), ahead, r, colour, size, now);
}
if (game.wrap) context.restore();
context.globalAlpha = 1;
drawBanner(context, bannerOf(game), width / 2, height * 0.27, size, deep);
}
function drawSnakeHead(context, game, hx, hy, ahead, r, colour, size, now) {
const side = { x: -ahead.y, y: ahead.x };
if (game.state === 'play' && Math.floor(now / 700) % 3 === 0) {
const tip = { x: hx + ahead.x * r * 1.7, y: hy + ahead.y * r * 1.7 };
context.strokeStyle = APPLE_RED;
context.lineWidth = Math.max(1, size * 0.07);
context.beginPath();
context.moveTo(hx + ahead.x * r, hy + ahead.y * r);
context.lineTo(tip.x, tip.y);
for (const turn of [-1, 1]) {
context.moveTo(tip.x, tip.y);
context.lineTo(tip.x + (ahead.x + turn * side.x) * r * 0.25, tip.y + (ahead.y + turn * side.y) * r * 0.25);
}
context.stroke();
}
context.fillStyle = colour;
context.beginPath();
context.arc(hx, hy, r, 0, Math.PI * 2);
context.fill();
for (const turn of [-1, 1]) {
const ex = hx + ahead.x * r * 0.25 + turn * side.x * r * 0.45;
const ey = hy + ahead.y * r * 0.25 + turn * side.y * r * 0.45;
context.fillStyle = '#ffffff';
context.beginPath();
context.arc(ex, ey, r * 0.26, 0, Math.PI * 2);
context.fill();
context.fillStyle = '#04101a';
context.beginPath();
context.arc(ex + ahead.x * r * 0.1, ey + ahead.y * r * 0.1, r * 0.13, 0, Math.PI * 2);
context.fill();
}
}
function drawApple(context, x, y, r) {
context.fillStyle = APPLE_RED;
context.shadowColor = APPLE_RED;
context.shadowBlur = r;
context.beginPath();
context.arc(x, y + r * 0.08, r, 0, Math.PI * 2);
context.fill();
context.shadowBlur = 0;
context.fillStyle = SNAKE_GREEN;
context.beginPath();
context.ellipse(x + r * 0.32, y - r * 0.92, r * 0.36, r * 0.17, -0.6, 0, Math.PI * 2);
context.fill();
context.fillStyle = 'rgba(255, 255, 255, 0.5)';
context.beginPath();
context.arc(x - r * 0.38, y - r * 0.2, r * 0.2, 0, Math.PI * 2);
context.fill();
}
function drawStar(context, x, y, r, turn) {
context.fillStyle = GOLD;
context.shadowColor = GOLD;
context.shadowBlur = r;
context.beginPath();
for (let i = 0; i < 10; i += 1) {
const angle = turn + (i * Math.PI) / 5 - Math.PI / 2;
const reach = i % 2 ? r * 0.45 : r;
context.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
}
context.closePath();
context.fill();
context.shadowBlur = 0;
}

  return { GLOUTON_MAZE, ARCADE_DIRS, GHOST_NAMES, EXTRA_LIFE, FRUITS, parseMaze, inTunnel, cellAt, canEnter, pelletsLeft, newGlouton, fruitOf, steerGlouton, speeds, angerOf, ghostTarget, stepGlouton, SNAKE_SIZE, snakeRate, starPoints, newSnake, steerSnake, stepSnake, togglePause, arcadeView, bindArcade };
};
