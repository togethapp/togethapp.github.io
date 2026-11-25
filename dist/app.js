// Généré par tools/bundle.js — modifiez les sources, pas ce fichier.
(() => {
  // ---- fetching the parts (tools/bundle.js) -----------------------------
  const TOGETHER_AT = new URL('.', document.currentScript?.src || document.baseURI).href;
  globalThis.TOGETHER_PARTS_AT = TOGETHER_AT;
  function togetherPart(name, takes) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(`${name}.js`, TOGETHER_AT).href;
      script.addEventListener('load', () => {
        script.remove();
        const make = globalThis.TOGETHER_PARTS?.[name];
        if (!make) {
          reject(new Error(`${name}.js brought nothing`));
          return;
        }
        try {
          resolve(make(takes()));
        } catch (error) {
          reject(error);
        }
      });
      script.addEventListener('error', () => {
        script.remove();
        reject(new Error(`Could not fetch ${name}.js`));
      });
      document.head.append(script);
    });
  }

// ---- src/lang-fr.js --------------------------------------------------
const FR = globalThis.TOGETHER_STRINGS?.fr;

// ---- src/lang-en.js --------------------------------------------------
const EN = globalThis.TOGETHER_STRINGS?.en;

// ---- src/i18n.js -----------------------------------------------------
const STRINGS = { fr: FR, en: EN };
const LANGUAGES = Object.keys(STRINGS);
let current = 'fr';
function detectLanguage() {
const candidates = typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language];
for (const tag of candidates) {
if (!tag) continue;
const base = tag.toLowerCase().split('-')[0];
if (LANGUAGES.includes(base)) return base;
}
return 'fr';
}
function setLanguage(lang) {
current = LANGUAGES.includes(lang) ? lang : 'fr';
return current;
}
function loadLanguage(lang) {
const take = () => (STRINGS[lang] ||= globalThis.TOGETHER_STRINGS?.[lang]);
if (!LANGUAGES.includes(lang)) return Promise.reject(new Error(`No such language: ${lang}`));
if (take()) return Promise.resolve(lang);
return new Promise((resolve, reject) => {
let script = document.querySelector(`script[data-lang="${lang}"]`);
if (script?.dataset.failed) {
script.remove();
script = null;
}
if (!script) {
script = document.createElement('script');
script.src = new URL(`lang-${lang}.js`, globalThis.TOGETHER_PARTS_AT || document.baseURI).href;
script.dataset.lang = lang;
document.head.append(script);
}
script.addEventListener('load', () => (take() ? resolve(lang) : reject(new Error(`No words in lang-${lang}.js`))));
script.addEventListener('error', () => {
script.dataset.failed = '1';
reject(new Error(`Could not fetch lang-${lang}.js`));
});
});
}
function getLanguage() {
return current;
}
function t(key, params = {}) {
const template = STRINGS[current]?.[key] ?? STRINGS.fr?.[key] ?? key;
return template
.replace(/\{(\w+)\|([^|{}]*)\|([^|{}]*)\}/g, (match, name, one, many) =>
Object.prototype.hasOwnProperty.call(params, name) ? (isOne(params[name]) ? one : many) : match,
)
.replace(/\{(\w+)\}/g, (match, name) =>
Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
);
}
function isOne(count) {
const n = Math.abs(Number(count));
return current === 'en' ? n === 1 : n < 2;
}

// ---- src/later.js ----------------------------------------------------
const parts = new Map();
function laterPart(name, load) {
let part = parts.get(name);
if (!part) {
part = { module: null, coming: null };
part.coming = load().then(
(module) => (part.module = module),
(error) => {
parts.delete(name);
throw error;
},
);
parts.set(name, part);
}
return part;
}

// ---- src/arcade-games.js ---------------------------------------------
const ARCADE_GAMES = [{ id: 'glouton' }, { id: 'snake' }];
const ARCADE_MODES = ['easy', 'normal', 'hard'];
function arcadeMode(mode) {
return ARCADE_MODES.includes(mode) ? mode : 'normal';
}

// ---- src/games.js ----------------------------------------------------
const SKYJO_VALUES = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const PAYOOS = Array.from({ length: 20 }, (_, index) => index + 1);
const SUITS = [
{ value: 'hearts', label: '♥' },
{ value: 'diamonds', label: '♦' },
{ value: 'spades', label: '♠' },
{ value: 'clubs', label: '♣' },
];
const PRESETS = [
{
id: 'papayoo',
name: 'Papayoo',
players: [3, 8],
direction: 'low',
endMode: 'threshold',
target: 250,
rounds: null,
roundSum: 250,
allowNegative: false,
entrantLabel: 'player',
meta: { key: 'papayooSuit', labelKey: 'meta.papayooSuit', options: SUITS },
helper: {
mode: 'toggle',
values: PAYOOS,
hintKey: 'helper.papayoo.hint',
toggles: [{ key: 'papayoo', labelKey: 'helper.papayoo.card', add: 40 }],
},
group: 'cards',
notesKey: 'notes.papayoo',
},
{
id: 'hearts',
name: 'Hearts / Cœurs',
players: [3, 6],
direction: 'low',
endMode: 'threshold',
target: 100,
rounds: null,
roundSum: 26,
allowNegative: false,
entrantLabel: 'player',
meta: null,
helper: {
mode: 'count',
values: [1],
labels: { 1: '♥' },
hintKey: 'helper.hearts.hint',
toggles: [{ key: 'queen', labelKey: 'helper.hearts.queen', add: 13 }],
},
group: 'cards',
notesKey: 'notes.hearts',
},
{
id: 'belote',
name: 'Belote / Coinche',
players: [2, 2],
direction: 'high',
endMode: 'threshold',
target: 1000,
rounds: null,
roundSum: 162,
allowNegative: false,
entrantLabel: 'team',
meta: null,
group: 'cards',
notesKey: 'notes.belote',
},
{
id: 'tarot',
name: 'Tarot',
players: [3, 5],
direction: 'high',
endMode: 'rounds',
target: null,
rounds: 5,
roundSum: 0,
allowNegative: true,
entrantLabel: 'player',
meta: null,
calculator: 'tarot',
group: 'cards',
notesKey: 'notes.tarot',
},
{
id: 'skyjo',
name: 'Skyjo',
players: [2, 8],
direction: 'low',
endMode: 'threshold',
target: 100,
rounds: null,
roundSum: null,
allowNegative: true,
entrantLabel: 'player',
meta: null,
helper: {
mode: 'count',
values: SKYJO_VALUES,
hintKey: 'helper.skyjo.hint',
toggles: [{ key: 'doubled', labelKey: 'helper.skyjo.doubled', multiply: 2 }],
},
group: 'cards',
notesKey: 'notes.skyjo',
},
{
id: 'sixquiprend',
name: '6 qui prend !',
players: [2, 10],
direction: 'low',
endMode: 'threshold',
target: 66,
rounds: null,
roundSum: null,
allowNegative: false,
entrantLabel: 'player',
meta: null,
helper: {
mode: 'count',
values: [1, 2, 3, 5, 7],
hintKey: 'helper.sixquiprend.hint',
toggles: [],
},
group: 'cards',
notesKey: 'notes.sixquiprend',
},
{
id: 'uno',
name: 'Uno',
players: [2, 10],
direction: 'high',
endMode: 'threshold',
target: 500,
rounds: null,
roundSum: null,
allowNegative: false,
entrantLabel: 'player',
meta: null,
group: 'cards',
notesKey: 'notes.uno',
},
{
id: 'rummy',
name: 'Rami / Rummy',
players: [2, 6],
direction: 'high',
endMode: 'threshold',
target: 500,
rounds: null,
roundSum: null,
allowNegative: true,
entrantLabel: 'player',
meta: null,
group: 'cards',
notesKey: 'notes.rummy',
},
{
id: 'yams',
name: 'Yams / Yahtzee',
players: [1, 8],
direction: 'high',
endMode: 'manual',
target: null,
rounds: null,
roundSum: null,
allowNegative: false,
entrantLabel: 'player',
meta: null,
group: 'dice',
notesKey: 'notes.yams',
},
{
id: 'millebornes',
name: 'Mille Bornes',
players: [2, 6],
direction: 'high',
endMode: 'threshold',
target: 5000,
rounds: null,
roundSum: null,
allowNegative: false,
entrantLabel: 'player',
meta: null,
group: 'cards',
notesKey: 'notes.millebornes',
},
{
id: 'skullking',
name: 'Skull King',
players: [2, 8],
direction: 'high',
endMode: 'rounds',
target: null,
rounds: 10,
roundSum: null,
allowNegative: true,
entrantLabel: 'player',
meta: null,
group: 'cards',
notesKey: 'notes.skullking',
},
{
id: 'wizard',
name: 'Wizard',
players: [3, 6],
direction: 'high',
endMode: 'rounds',
target: null,
rounds: 15,
roundSum: null,
allowNegative: true,
entrantLabel: 'player',
meta: null,
group: 'cards',
notesKey: 'notes.wizard',
},
{
id: 'canasta',
name: 'Canasta',
players: [2, 6],
direction: 'high',
endMode: 'threshold',
target: 5000,
rounds: null,
roundSum: null,
allowNegative: true,
entrantLabel: 'player',
meta: null,
group: 'cards',
notesKey: 'notes.canasta',
},
{
id: 'scopa',
name: 'Scopa',
players: [2, 4],
direction: 'high',
endMode: 'threshold',
target: 11,
rounds: null,
roundSum: null,
allowNegative: false,
entrantLabel: 'player',
meta: null,
group: 'cards',
notesKey: 'notes.scopa',
},
{
id: 'cabo',
name: 'Cabo / Dutch',
players: [2, 6],
direction: 'low',
endMode: 'threshold',
target: 100,
rounds: null,
roundSum: null,
allowNegative: true,
entrantLabel: 'player',
meta: null,
group: 'cards',
notesKey: 'notes.cabo',
},
{
id: 'rummikub',
name: 'Rummikub',
players: [2, 4],
direction: 'high',
endMode: 'manual',
target: null,
rounds: null,
roundSum: 0,
allowNegative: true,
entrantLabel: 'player',
meta: null,
helper: {
mode: 'count',
values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 30],
labels: { 30: 'Joker' },
hintKey: 'helper.rummikub.hint',
toggles: [],
},
group: 'tiles',
notesKey: 'notes.rummikub',
},
{
id: 'dominos',
name: 'Dominos',
players: [2, 4],
direction: 'high',
endMode: 'threshold',
target: 100,
rounds: null,
roundSum: null,
allowNegative: false,
entrantLabel: 'player',
meta: null,
group: 'tiles',
notesKey: 'notes.dominos',
},
{
id: 'scrabble',
name: 'Scrabble',
players: [2, 4],
direction: 'high',
endMode: 'manual',
target: null,
rounds: null,
roundSum: null,
allowNegative: true,
entrantLabel: 'player',
meta: null,
group: 'tiles',
notesKey: 'notes.scrabble',
},
{
id: 'petanque',
name: 'Pétanque',
players: [2, 2],
direction: 'high',
endMode: 'threshold',
target: 13,
rounds: null,
roundSum: null,
allowNegative: false,
entrantLabel: 'team',
meta: null,
group: 'outdoor',
notesKey: 'notes.petanque',
},
{
id: 'molkky',
name: 'Mölkky',
players: [2, 8],
direction: 'high',
endMode: 'threshold',
target: 50,
rounds: null,
roundSum: null,
allowNegative: true,
entrantLabel: 'player',
meta: null,
group: 'outdoor',
notesKey: 'notes.molkky',
},
{
id: 'president',
name: 'Président',
players: [3, 8],
direction: 'high',
endMode: 'threshold',
target: 10,
rounds: null,
roundSum: null,
allowNegative: true,
entrantLabel: 'player',
meta: null,
group: 'cards',
notesKey: 'notes.president',
},
{
id: 'plateau',
name: 'plateau',
labelKey: 'new.boardLabel',
players: [1, 12],
direction: 'high',
endMode: 'manual',
target: null,
rounds: null,
roundSum: null,
allowNegative: true,
entrantLabel: 'player',
meta: null,
group: 'other',
notesKey: 'notes.plateau',
},
{
id: 'custom',
name: 'custom',
labelKey: 'new.customLabel',
players: [1, 12],
direction: 'low',
endMode: 'manual',
target: null,
rounds: null,
roundSum: null,
allowNegative: true,
entrantLabel: 'player',
meta: null,
group: 'other',
notesKey: 'notes.custom',
},
];
function getPreset(id) {
return PRESETS.find((p) => p.id === id) || null;
}
function presetConfig(preset) {
return {
direction: preset.direction,
endMode: preset.endMode,
target: preset.target,
rounds: preset.rounds,
roundSum: preset.roundSum,
allowNegative: preset.allowNegative,
entrantLabel: preset.entrantLabel,
};
}
const PRESET_GROUPS = ['cards', 'tiles', 'dice', 'outdoor', 'other'];

// ---- src/model.js ----------------------------------------------------
function uid(prefix = 'id') {
const uuid = globalThis.crypto?.randomUUID?.();
if (uuid) return `${prefix}_${uuid}`;
const random = () => Math.random().toString(36).slice(2, 10);
return `${prefix}_${Date.now().toString(36)}_${random()}${random()}`;
}
function createGame({ presetId, names, overrides = {}, name = '', shared = false, groupId = null }) {
const preset = getPreset(presetId);
if (!preset) throw new Error(`Unknown preset: ${presetId}`);
const players = names
.map((raw, index) => (raw || '').trim() || `#${index + 1}`)
.map((playerName) => ({ id: uid('p'), name: playerName }));
const now = Date.now();
return {
id: uid('g'),
presetId,
name: name.trim(),
createdAt: now,
updatedAt: now,
finishedAt: null,
shared: Boolean(shared),
groupId: groupId || null,
archivedAt: null,
players,
config: { ...presetConfig(preset), ...overrides },
rounds: [],
};
}
function normaliseScores(game, scores) {
const clean = {};
for (const player of game.players) {
const value = scores?.[player.id];
clean[player.id] = Number.isFinite(value) ? value : 0;
}
return clean;
}
function addRound(game, { scores, meta = null, note = '' }) {
const round = {
id: uid('r'),
scores: normaliseScores(game, scores),
meta,
note,
at: Date.now(),
};
return { ...game, rounds: [...game.rounds, round], updatedAt: Date.now() };
}
function updateRound(game, roundId, { scores, meta, note }) {
const rounds = game.rounds.map((round) => {
if (round.id !== roundId) return round;
return {
...round,
scores: scores ? normaliseScores(game, scores) : round.scores,
meta: meta === undefined ? round.meta : meta,
note: note === undefined ? round.note : note,
};
});
return { ...game, rounds, updatedAt: Date.now() };
}
function removeRound(game, roundId) {
return {
...game,
rounds: game.rounds.filter((round) => round.id !== roundId),
updatedAt: Date.now(),
};
}
function renamePlayer(game, playerId, name) {
const cleaned = String(name || '').trim();
if (!cleaned) return game;
const players = game.players.map((player) =>
player.id === playerId ? { ...player, name: cleaned } : player,
);
return { ...game, players, updatedAt: Date.now() };
}
function setShared(game, shared = true) {
if (Boolean(game.shared) === Boolean(shared)) return game;
return { ...game, shared: Boolean(shared), updatedAt: Date.now() };
}
function setFinished(game, finished) {
return { ...game, finishedAt: finished ? Date.now() : null, updatedAt: Date.now() };
}
function archiveGame(game, yes = true) {
const at = yes ? Date.now() : null;
if (at === (game.archivedAt || null)) return game;
return { ...game, archivedAt: at, updatedAt: Date.now() };
}
function mergeGames(a, b) {
if (!isValidGame(a)) return b;
if (!isValidGame(b)) return a;
if (a.id !== b.id) return a;
const [newer, older] = (a.updatedAt || 0) >= (b.updatedAt || 0) ? [a, b] : [b, a];
const byId = new Map();
for (const round of [...older.rounds, ...newer.rounds]) {
if (round && typeof round.id === 'string') byId.set(round.id, round);
}
const ordered = [
...newer.rounds.filter((round) => byId.has(round.id)).map((round) => byId.get(round.id)),
...older.rounds.filter((round) => !newer.rounds.some((other) => other.id === round.id)),
];
if (ordered.length === newer.rounds.length) return newer;
return { ...newer, rounds: ordered, updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0) };
}
function replayGame(game) {
return createGame({
presetId: game.presetId,
names: game.players.map((player) => player.name),
overrides: { ...game.config },
name: game.name,
shared: Boolean(game.shared),
groupId: game.groupId,
});
}
function dealerFor(game, roundNumber) {
if (!game.players.length) return null;
return game.players[roundNumber % game.players.length];
}
function recentNames(games, limit = 12) {
const seen = [];
for (const game of [...games].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))) {
for (const player of game.players) {
if (!seen.includes(player.name)) seen.push(player.name);
if (seen.length >= limit) return seen;
}
}
return seen;
}
function isValidGame(value) {
return Boolean(
value &&
typeof value === 'object' &&
typeof value.id === 'string' &&
Array.isArray(value.players) &&
value.players.every((p) => p && typeof p.id === 'string' && typeof p.name === 'string') &&
Array.isArray(value.rounds) &&
value.config &&
typeof value.config === 'object',
);
}

// ---- src/scoring.js --------------------------------------------------
function roundScore(round, playerId) {
const value = round.scores?.[playerId];
return Number.isFinite(value) ? value : 0;
}
function roundSum(round) {
return Object.values(round.scores || {}).reduce(
(sum, value) => sum + (Number.isFinite(value) ? value : 0),
0,
);
}
function totals(game, upTo = Infinity) {
const result = {};
for (const player of game.players) result[player.id] = 0;
game.rounds.slice(0, upTo).forEach((round) => {
for (const player of game.players) {
result[player.id] += roundScore(round, player.id);
}
});
return result;
}
function standings(game) {
const totalsById = totals(game);
const sign = game.config.direction === 'low' ? 1 : -1;
const rows = game.players
.map((player) => ({
id: player.id,
name: player.name,
total: totalsById[player.id],
}))
.sort((a, b) => sign * (a.total - b.total));
const best = rows.length ? rows[0].total : 0;
let rank = 0;
let previous = null;
rows.forEach((row, index) => {
if (previous === null || row.total !== previous) rank = index + 1;
previous = row.total;
row.rank = rank;
row.gap = Math.abs(row.total - best);
});
return rows;
}
function gameStatus(game) {
const rows = standings(game);
const { endMode, target, rounds } = game.config;
const leaders = rows.filter((row) => rows.length && row.total === rows[0].total);
let finished = false;
let reason = null;
let remaining = null;
if (game.finishedAt) {
finished = true;
reason = 'manual';
} else if (endMode === 'threshold' && Number.isFinite(target)) {
const highest = rows.length ? Math.max(...rows.map((r) => r.total)) : 0;
finished = rows.length > 0 && highest >= target;
if (finished) reason = 'threshold';
remaining = Math.max(0, target - highest);
} else if (endMode === 'rounds' && Number.isFinite(rounds)) {
finished = game.rounds.length >= rounds;
if (finished) reason = 'rounds';
remaining = Math.max(0, rounds - game.rounds.length);
}
return {
finished,
reason,
standings: rows,
leaders,
winners: finished ? leaders : [],
remaining,
};
}
function validateRound(game, scores) {
const errors = [];
const warnings = [];
const missing = [];
for (const player of game.players) {
const value = scores?.[player.id];
if (value === null || value === undefined || value === '') {
missing.push(player.name);
continue;
}
if (!Number.isFinite(value)) {
errors.push({ code: 'notANumber', player: player.name });
continue;
}
if (!Number.isInteger(value)) {
errors.push({ code: 'notAnInteger', player: player.name });
continue;
}
if (value < 0 && !game.config.allowNegative) {
errors.push({ code: 'negative', player: player.name });
}
}
if (missing.length) warnings.push({ code: 'missing', players: missing });
const expected = game.config.roundSum;
if (Number.isFinite(expected) && !missing.length) {
const sum = Object.values(scores).reduce(
(acc, value) => acc + (Number.isFinite(value) ? value : 0),
0,
);
if (sum !== expected) warnings.push({ code: 'sum', sum, expected });
}
return { ok: errors.length === 0, errors, warnings };
}
function completingScore(game, scores) {
const expected = game.config.roundSum;
if (!Number.isFinite(expected)) return null;
const missing = game.players.filter((player) => {
const value = scores?.[player.id];
return value === null || value === undefined || value === '';
});
if (missing.length !== 1) return null;
const sum = Object.values(scores).reduce(
(acc, value) => acc + (Number.isFinite(value) ? value : 0),
0,
);
const rest = expected - sum;
if (rest < 0 && !game.config.allowNegative) return null;
return { playerId: missing[0].id, value: rest };
}

// ---- src/helpers.js --------------------------------------------------
function emptyHelperEntry() {
return { cards: [], toggles: {} };
}
function tapCard(helper, entry, value) {
if (helper.mode === 'toggle') {
const cards = entry.cards.includes(value)
? entry.cards.filter((card) => card !== value)
: [...entry.cards, value];
return { ...entry, cards };
}
return { ...entry, cards: [...entry.cards, value] };
}
function undoCard(entry) {
return { ...entry, cards: entry.cards.slice(0, -1) };
}
function toggleSwitch(entry, key) {
return { ...entry, toggles: { ...entry.toggles, [key]: !entry.toggles[key] } };
}
function cardCount(entry, value) {
return entry.cards.filter((card) => card === value).length;
}
function helperTotal(helper, entry) {
let total = entry.cards.reduce((sum, value) => sum + value, 0);
for (const item of helper.toggles || []) {
if (entry.toggles?.[item.key] && Number.isFinite(item.add)) total += item.add;
}
for (const item of helper.toggles || []) {
if (entry.toggles?.[item.key] && Number.isFinite(item.multiply)) total *= item.multiply;
}
return total;
}
function isEmptyEntry(entry) {
return entry.cards.length === 0 && !Object.values(entry.toggles || {}).some(Boolean);
}
const IN_APP_BROWSERS = [
['MessengerForiOS', 'Messenger'],
['MESSENGER', 'Messenger'],
['MicroMessenger', 'WeChat'],
['FBAN', 'Facebook'],
['FBAV', 'Facebook'],
['FB_IAB', 'Facebook'],
['Messenger', 'Messenger'],
['Instagram', 'Instagram'],
['LinkedInApp', 'LinkedIn'],
['Twitter', 'X'],
['Line/', 'LINE'],
['Snapchat', 'Snapchat'],
['TikTok', 'TikTok'],
['BytedanceWebview', 'TikTok'],
['Pinterest', 'Pinterest'],
['WhatsApp', 'WhatsApp'],
];
function inAppBrowser(userAgent) {
const text = String(userAgent || '');
if (!text) return null;
for (const [needle, name] of IN_APP_BROWSERS) {
if (text.includes(needle)) return name;
}
return null;
}
function phoneKind(userAgent, touchPoints = 0) {
const text = String(userAgent || '');
if (/iPhone|iPad|iPod/.test(text)) return 'ios';
if (/Macintosh/.test(text) && touchPoints > 1) return 'ios';
if (/Android/.test(text)) return 'android';
return null;
}

// ---- src/tarot.js ----------------------------------------------------
const THRESHOLDS = { 0: 56, 1: 51, 2: 41, 3: 36 };
const TOTAL_POINTS = 91;
const CONTRACTS = [
{ id: 'petite', multiplier: 1 },
{ id: 'garde', multiplier: 2 },
{ id: 'gardeSans', multiplier: 4 },
{ id: 'gardeContre', multiplier: 6 },
];
const POIGNEES = [
{ id: 'none', value: 0 },
{ id: 'simple', value: 20 },
{ id: 'double', value: 30 },
{ id: 'triple', value: 40 },
];
const CHELEMS = [
{ id: 'none', value: 0 },
{ id: 'announcedMade', value: 400 },
{ id: 'announcedFailed', value: -200 },
{ id: 'unannouncedMade', value: 200 },
];
function contractMultiplier(id) {
return CONTRACTS.find((contract) => contract.id === id)?.multiplier ?? 1;
}
function valueOf(list, id) {
return list.find((item) => item.id === id)?.value ?? 0;
}
function scoreDeal(players, deal) {
const threshold = THRESHOLDS[deal.oudlers] ?? THRESHOLDS[0];
const gap = deal.points - threshold;
const won = gap >= 0;
const multiplier = contractMultiplier(deal.contract);
const petit = deal.petitAuBout === 'taker' ? 10 : deal.petitAuBout === 'defence' ? -10 : 0;
const inner = 25 + Math.abs(gap) + (won ? petit : -petit);
const poignee = valueOf(POIGNEES, deal.poignee);
const chelem = valueOf(CHELEMS, deal.chelem);
const amount = (won ? 1 : -1) * inner * multiplier + (won ? poignee : -poignee) + chelem;
const scores = {};
const partnered = deal.partnerId && deal.partnerId !== deal.takerId;
for (const player of players) {
if (player.id === deal.takerId) {
scores[player.id] = partnered ? 2 * amount : (players.length - 1) * amount;
} else if (partnered && player.id === deal.partnerId) {
scores[player.id] = amount;
} else {
scores[player.id] = -amount;
}
}
return {
threshold,
gap,
won,
multiplier,
amount,
scores,
breakdown: {
threshold,
points: deal.points,
gap,
base: 25,
petit,
inner,
multiplier,
poignee: won ? poignee : -poignee,
chelem,
amount,
},
};
}
function isCompleteDeal(players, deal) {
if (!deal?.takerId || !players.some((player) => player.id === deal.takerId)) return false;
if (!CONTRACTS.some((contract) => contract.id === deal.contract)) return false;
if (![0, 1, 2, 3].includes(deal.oudlers)) return false;
return Number.isFinite(deal.points) && deal.points >= 0 && deal.points <= TOTAL_POINTS;
}

// ---- src/qr.js -------------------------------------------------------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
let x = 1;
for (let i = 0; i < 255; i += 1) {
EXP[i] = x;
LOG[x] = i;
x <<= 1;
if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();
const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);
function generatorPoly(degree) {
let poly = [1];
for (let i = 0; i < degree; i += 1) {
const next = new Array(poly.length + 1).fill(0);
for (let j = 0; j < poly.length; j += 1) {
next[j] ^= poly[j];
next[j + 1] ^= mul(poly[j], EXP[i]);
}
poly = next;
}
return poly;
}
function errorCorrection(data, count) {
const poly = generatorPoly(count);
const result = new Array(count).fill(0);
for (const byte of data) {
const factor = byte ^ result[0];
result.shift();
result.push(0);
for (let i = 0; i < count; i += 1) result[i] ^= mul(poly[i + 1], factor);
}
return result;
}
const VERSIONS = {
1: [26, 10, 1, 0], 2: [44, 16, 1, 0], 3: [70, 26, 1, 0],
4: [100, 18, 2, 0], 5: [134, 24, 2, 0], 6: [172, 16, 4, 0],
};
const ALIGNMENT = {
1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
};
function dataCapacity(version) {
const [total, ecPerBlock, group1, group2] = VERSIONS[version];
return total - ecPerBlock * (group1 + group2);
}
function chooseVersion(byteLength) {
for (const version of Object.keys(VERSIONS).map(Number)) {
if (dataCapacity(version) * 8 >= 4 + 8 + byteLength * 8) return version;
}
return null;
}
const MAX_BYTES = (() => {
let max = 0;
for (const version of Object.keys(VERSIONS).map(Number)) {
max = Math.max(max, Math.floor((dataCapacity(version) * 8 - 12) / 8));
}
return max;
})();
function encodeData(bytes, version) {
const bits = [];
const push = (value, length) => {
for (let i = length - 1; i >= 0; i -= 1) bits.push((value >> i) & 1);
};
push(0b0100, 4); 
push(bytes.length, 8);
for (const byte of bytes) push(byte, 8);
const capacity = dataCapacity(version) * 8;
push(0, Math.min(4, capacity - bits.length)); 
while (bits.length % 8) bits.push(0);
const codewords = [];
for (let i = 0; i < bits.length; i += 8) {
codewords.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
}
const padding = [0xec, 0x11];
let index = 0;
while (codewords.length < dataCapacity(version)) {
codewords.push(padding[index++ % 2]);
}
return codewords;
}
function finalCodewords(dataCodewords, version) {
const [, ecPerBlock, group1, group2] = VERSIONS[version];
const blocks = group1 + group2;
const shortLength = Math.floor(dataCodewords.length / blocks);
const dataBlocks = [];
const ecBlocks = [];
let at = 0;
for (let i = 0; i < blocks; i += 1) {
const length = i < group1 ? shortLength : shortLength + 1;
const block = dataCodewords.slice(at, at + length);
at += length;
dataBlocks.push(block);
ecBlocks.push(errorCorrection(block, ecPerBlock));
}
const out = [];
const longest = Math.max(...dataBlocks.map((block) => block.length));
for (let i = 0; i < longest; i += 1) {
for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
}
for (let i = 0; i < ecPerBlock; i += 1) {
for (const block of ecBlocks) out.push(block[i]);
}
return out;
}
function emptyMatrix(size) {
return {
modules: Array.from({ length: size }, () => new Array(size).fill(null)),
reserved: Array.from({ length: size }, () => new Array(size).fill(false)),
size,
};
}
function placeFinder(matrix, row, col) {
for (let r = -1; r <= 7; r += 1) {
for (let c = -1; c <= 7; c += 1) {
const y = row + r;
const x = col + c;
if (y < 0 || y >= matrix.size || x < 0 || x >= matrix.size) continue;
const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
matrix.modules[y][x] = inRing || inCore;
matrix.reserved[y][x] = true;
}
}
}
function placePatterns(matrix, version) {
const size = matrix.size;
placeFinder(matrix, 0, 0);
placeFinder(matrix, 0, size - 7);
placeFinder(matrix, size - 7, 0);
for (let i = 8; i < size - 8; i += 1) {
const dark = i % 2 === 0;
matrix.modules[6][i] = dark;
matrix.reserved[6][i] = true;
matrix.modules[i][6] = dark;
matrix.reserved[i][6] = true;
}
for (const row of ALIGNMENT[version]) {
for (const col of ALIGNMENT[version]) {
if (matrix.reserved[row][col]) continue;
for (let r = -2; r <= 2; r += 1) {
for (let c = -2; c <= 2; c += 1) {
matrix.modules[row + r][col + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
matrix.reserved[row + r][col + c] = true;
}
}
}
}
matrix.modules[size - 8][8] = true;
matrix.reserved[size - 8][8] = true;
for (let i = 0; i < 9; i += 1) {
if (!matrix.reserved[8][i]) { matrix.modules[8][i] = false; matrix.reserved[8][i] = true; }
if (!matrix.reserved[i][8]) { matrix.modules[i][8] = false; matrix.reserved[i][8] = true; }
}
for (let i = size - 8; i < size; i += 1) {
if (!matrix.reserved[8][i]) { matrix.modules[8][i] = false; matrix.reserved[8][i] = true; }
if (!matrix.reserved[i][8]) { matrix.modules[i][8] = false; matrix.reserved[i][8] = true; }
}
}
function placeData(matrix, codewords) {
const size = matrix.size;
const bits = [];
for (const codeword of codewords) {
for (let i = 7; i >= 0; i -= 1) bits.push((codeword >> i) & 1);
}
let bit = 0;
for (let right = size - 1; right >= 1; right -= 2) {
if (right === 6) right -= 1; 
const upward = ((right + 1) & 2) === 0;
for (let step = 0; step < size; step += 1) {
const row = upward ? size - 1 - step : step;
for (const col of [right, right - 1]) {
if (matrix.reserved[row][col]) continue;
matrix.modules[row][col] = bit < bits.length ? bits[bit] === 1 : false;
bit += 1;
}
}
}
}
const MASKS = [
(r, c) => (r + c) % 2 === 0,
(r) => r % 2 === 0,
(r, c) => c % 3 === 0,
(r, c) => (r + c) % 3 === 0,
(r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
(r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
(r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
(r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];
function placeFormat(matrix, mask) {
const data = (0b00 << 3) | mask; 
let bits = data << 10;
for (let i = 4; i >= 0; i -= 1) {
if (bits & (1 << (i + 10))) bits ^= 0b10100110111 << i;
}
const format = ((data << 10) | bits) ^ 0b101010000010010;
const size = matrix.size;
for (let i = 0; i < 15; i += 1) {
const dark = ((format >> i) & 1) === 1;
if (i < 6) matrix.modules[i][8] = dark;
else if (i === 6) matrix.modules[7][8] = dark;
else if (i === 7) matrix.modules[8][8] = dark;
else if (i === 8) matrix.modules[8][7] = dark;
else matrix.modules[8][14 - i] = dark;
if (i < 8) matrix.modules[8][size - 1 - i] = dark;
else matrix.modules[size - 15 + i][8] = dark;
}
}
function penalty(modules) {
const size = modules.length;
let score = 0;
const run = (get) => {
for (let a = 0; a < size; a += 1) {
let last = null;
let length = 0;
for (let b = 0; b < size; b += 1) {
const value = get(a, b);
if (value === last) length += 1;
else { last = value; length = 1; }
if (length === 5) score += 3;
else if (length > 5) score += 1;
}
}
};
run((r, c) => modules[r][c]);
run((c, r) => modules[r][c]);
for (let r = 0; r < size - 1; r += 1) {
for (let c = 0; c < size - 1; c += 1) {
const v = modules[r][c];
if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) score += 3;
}
}
let dark = 0;
for (const row of modules) for (const value of row) if (value) dark += 1;
const ratio = (dark * 100) / (size * size);
score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
return score;
}
function qrMatrix(text, { mask: forced = null } = {}) {
const bytes = Array.from(new TextEncoder().encode(text));
const version = chooseVersion(bytes.length);
if (!version) return null;
const codewords = finalCodewords(encodeData(bytes, version), version);
const size = 17 + version * 4;
let best = null;
const masks = forced === null ? [0, 1, 2, 3, 4, 5, 6, 7] : [forced];
for (const mask of masks) {
const matrix = emptyMatrix(size);
placePatterns(matrix, version);
placeData(matrix, codewords);
for (let r = 0; r < size; r += 1) {
for (let c = 0; c < size; c += 1) {
if (!matrix.reserved[r][c] && MASKS[mask](r, c)) matrix.modules[r][c] = !matrix.modules[r][c];
}
}
placeFormat(matrix, mask);
const score = penalty(matrix.modules);
if (!best || score < best.score) best = { score, modules: matrix.modules };
}
return best.modules;
}
function qrSvg(text, { size = 220, quiet = 4 } = {}) {
const modules = qrMatrix(text);
if (!modules) return null;
const count = modules.length + quiet * 2;
const rects = [];
modules.forEach((row, r) => {
row.forEach((dark, c) => {
if (dark) rects.push(`<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1"/>`);
});
});
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${count} ${count}" width="${size}" height="${size}" role="img"><rect width="${count}" height="${count}" fill="#fff"/><g fill="#000">${rects.join('')}</g></svg>`;
}

// ---- src/stamp.js ----------------------------------------------------
function later(previous) {
return Math.max(Date.now(), (previous || 0) + 1);
}
function touch(document_, patch) {
return { ...document_, ...patch, updatedAt: later(document_.updatedAt) };
}
const FORGET_AFTER = 30 * 24 * 60 * 60 * 1000;
function prune(removed, now = Date.now()) {
const kept = {};
for (const [id, at] of Object.entries(removed || {})) {
if (now - at < FORGET_AFTER) kept[id] = at;
}
return kept;
}

// ---- src/people.js ---------------------------------------------------
function distinctNames(names) {
const seen = new Set();
return (names || [])
.map((raw) => String(raw || '').trim())
.filter((name) => {
const key = sameName(name) || name;
if (!name || seen.has(key)) return false;
seen.add(key);
return true;
});
}
function hasPerson(document_, name, exceptId = null) {
const key = sameName(name);
return Boolean(key) && document_.people.some((person) => person.id !== exceptId && sameName(person.name) === key);
}
function addPerson(document_, name) {
const clean = String(name || '').trim();
if (!clean || hasPerson(document_, clean)) return document_;
return touch(document_, {
people: [...document_.people, { id: uid('w'), name: clean }],
peopleAt: later(document_.peopleAt),
});
}
function renamePerson(document_, personId, name) {
const clean = String(name || '').trim();
if (!clean || hasPerson(document_, clean, personId)) return document_;
return touch(document_, {
people: document_.people.map((person) =>
(person.id === personId ? { ...person, name: clean } : person)),
peopleAt: later(document_.peopleAt),
});
}
function removePerson(document_, personId, forget = () => ({})) {
return touch(document_, {
people: document_.people.filter((person) => person.id !== personId),
peopleAt: later(document_.peopleAt),
...forget(document_, personId),
});
}
function recentPeople(documents, limit = 12) {
const seen = [];
for (const document_ of [...documents].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))) {
for (const person of document_.people || []) {
if (!seen.includes(person.name)) seen.push(person.name);
if (seen.length >= limit) return seen;
}
}
return seen;
}
function withMeFirst(names, me) {
const clean = String(me || '').trim();
if (!clean) return names;
if (names.some((name) => String(name || '').trim().toLowerCase() === clean.toLowerCase())) return names;
if (names.some((name) => String(name || '').trim())) return names;
return [clean, ...names.slice(1)];
}
function withoutMe(names, me) {
const clean = String(me || '').trim().toLowerCase();
if (!clean) return names;
const index = names.findIndex((name) => String(name || '').trim().toLowerCase() === clean);
if (index < 0) return names;
const kept = [...names];
kept[index] = '';
return kept;
}

// ---- src/reacts.js ---------------------------------------------------
const REACTIONS = ['👍', '❤️', '😂', '😮', '🎉'];
const WORDS_MOST = 280;
const cellsIn = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const stampOf = (cell) => (typeof cell?.at === 'number' ? cell.at : 0);
function mergeCells(first, second) {
const out = { ...cellsIn(first) };
for (const [key, cell] of Object.entries(cellsIn(second))) {
const held = out[key];
if (!held || stampOf(cell) >= stampOf(held)) out[key] = cell;
}
return out;
}
function sameCells(a, b) {
const one = cellsIn(a);
const two = cellsIn(b);
const keys = Object.keys(one);
return keys.length === Object.keys(two).length && keys.every((key) => one[key] === two[key]);
}
function mergedTalk(older, newer) {
const reacts = mergeCells(older?.reacts, newer?.reacts);
const comments = mergeCells(older?.comments, newer?.comments);
return {
...(Object.keys(reacts).length ? { reacts } : {}),
...(Object.keys(comments).length ? { comments } : {}),
};
}
function sameTalk(newer, merged) {
return sameCells(newer?.reacts, merged.reacts) && sameCells(newer?.comments, merged.comments);
}
function react(document_, target, name, emoji) {
const who = sameName(name);
if (!who || !REACTIONS.includes(emoji)) return document_;
const key = `${target}|${who}`;
const held = cellsIn(document_.reacts)[key];
const cell = { e: held?.e === emoji ? '' : emoji, n: String(name).trim(), at: later(stampOf(held)) };
return touch(document_, { reacts: { ...cellsIn(document_.reacts), [key]: cell } });
}
function reactionsTo(document_, target, name = '') {
const me = sameName(name);
const found = new Map();
for (const [key, cell] of Object.entries(cellsIn(document_.reacts))) {
const cut = key.indexOf('|');
if (cut < 0 || key.slice(0, cut) !== target || !REACTIONS.includes(cell?.e)) continue;
const who = key.slice(cut + 1);
const row = found.get(cell.e) || { emoji: cell.e, names: [], mine: false };
row.names.push(typeof cell.n === 'string' && cell.n.trim() ? cell.n.trim() : who);
if (who === me) row.mine = true;
found.set(cell.e, row);
}
return REACTIONS.filter((emoji) => found.has(emoji)).map((emoji) => found.get(emoji));
}
function myReaction(document_, target, name) {
const cell = cellsIn(document_.reacts)[`${target}|${sameName(name)}`];
return REACTIONS.includes(cell?.e) ? cell.e : '';
}
function addWords(document_, target, name, text) {
const words = String(text || '').trim().slice(0, WORDS_MOST);
const who = String(name || '').trim();
if (!words || !who) return document_;
const held = cellsIn(document_.comments);
const now = later(Math.max(0, ...Object.values(held).map((cell) => (typeof cell?.made === 'number' ? cell.made : 0))));
return touch(document_, { comments: { ...held, [uid('m')]: { on: target, n: who, t: words, made: now, at: now } } });
}
function removeWords(document_, id) {
const held = cellsIn(document_.comments)[id];
if (!held || typeof held.t !== 'string' || !held.t) return document_;
return touch(document_, { comments: { ...cellsIn(document_.comments), [id]: { ...held, t: '', at: later(stampOf(held)) } } });
}
function wordsOn(document_, target, name = '') {
const me = sameName(name);
return Object.entries(cellsIn(document_.comments))
.filter(([, cell]) => cell?.on === target && typeof cell.t === 'string' && cell.t.trim())
.map(([id, cell]) => ({
id,
name: typeof cell.n === 'string' ? cell.n : '',
text: cell.t.trim(),
at: typeof cell.made === 'number' ? cell.made : stampOf(cell),
mine: Boolean(me) && sameName(cell.n) === me,
}))
.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
}
function talkTotals(document_) {
const counts = new Map();
for (const cell of Object.values(cellsIn(document_?.reacts))) {
if (REACTIONS.includes(cell?.e)) counts.set(cell.e, (counts.get(cell.e) || 0) + 1);
}
const reactions = REACTIONS.filter((emoji) => counts.has(emoji))
.map((emoji) => ({ emoji, count: counts.get(emoji) }))
.sort((a, b) => b.count - a.count);
const words = Object.values(cellsIn(document_?.comments))
.filter((cell) => typeof cell?.t === 'string' && cell.t.trim()).length;
return { reactions, words };
}
function latestWords(document_) {
return Object.values(cellsIn(document_?.comments))
.filter((cell) => typeof cell?.t === 'string' && cell.t.trim() && typeof cell.made === 'number')
.reduce((latest, cell) => Math.max(latest, cell.made), 0);
}

// ---- src/lists.js ----------------------------------------------------
function createList({ name = '', names = [], shared = false, groupId = null } = {}) {
const now = Date.now();
return {
id: uid('l'),
kind: 'list',
name: String(name).trim(),
createdAt: now,
updatedAt: now,
peopleAt: now,
shared: Boolean(shared),
groupId: groupId || null,
archivedAt: null,
template: false,
removed: {},
people: distinctNames(names).map((personName) => ({ id: uid('w'), name: personName })),
items: [],
};
}
function linesOf(text) {
return String(text || '')
.split('\n')
.map((line) => line.replace(/^\s*(?:[-*•–—]+|\d+\s*[.)])\s+/, '').trim())
.filter(Boolean);
}
const sameLine = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function newLines(list, text) {
const open = new Set(list.items.filter((item) => !item.done).map((item) => sameLine(item.text)));
const typed = new Set();
const fresh = [];
const known = [];
for (const line of linesOf(text)) {
const key = sameLine(line);
if (open.has(key)) known.push(line);
else if (!typed.has(key)) fresh.push(line);
typed.add(key);
}
return { fresh: fresh.join('\n'), known };
}
function addItems(list, text) {
const now = Date.now();
const fresh = linesOf(text)
.map((line) => ({
id: uid('i'),
text: line,
who: null,
done: false,
due: null,
createdAt: now,
updatedAt: now,
}));
return fresh.length ? touch(list, { items: [...list.items, ...fresh] }) : list;
}
function patchItem(list, itemId, patch) {
let changed = false;
const items = list.items.map((item) => {
if (item.id !== itemId) return item;
changed = true;
return { ...item, ...patch, updatedAt: later(item.updatedAt) };
});
return changed ? touch(list, { items }) : list;
}
function renameItem(list, itemId, text) {
const clean = String(text || '').trim();
return clean ? patchItem(list, itemId, { text: clean }) : list;
}
function assignItem(list, itemId, who) {
const known = who === null || list.people.some((person) => person.id === who);
return known ? patchItem(list, itemId, { who }) : list;
}
function setItemDue(list, itemId, due) {
const clean = /^\d{4}-\d{2}-\d{2}$/.test(String(due || '')) ? String(due) : null;
return patchItem(list, itemId, { due: clean });
}
function toggleItem(list, itemId) {
const item = list.items.find((entry) => entry.id === itemId);
return item ? patchItem(list, itemId, { done: !item.done }) : list;
}
function removeItem(list, itemId) {
const items = list.items.filter((item) => item.id !== itemId);
if (items.length === list.items.length) return list;
return touch(list, { items, removed: { ...list.removed, [itemId]: Date.now() } });
}
function archiveList(list, yes = true) {
const at = yes ? Date.now() : null;
return at === (list.archivedAt || null) ? list : touch(list, { archivedAt: at });
}
function makeTemplate(list, yes = true) {
return Boolean(list.template) === Boolean(yes) ? list : touch(list, { template: Boolean(yes) });
}
function reuseList(list, name = list.name) {
const now = Date.now();
return {
...createList({ name, shared: list.shared, groupId: list.groupId }),
people: list.people,
peopleAt: list.peopleAt || now,
items: list.items.map((item) => ({ ...item, id: uid('i'), done: false, due: null, updatedAt: now })),
};
}
const addListPerson = addPerson;
const renameListPerson = renamePerson;
function removeListPerson(list, personId) {
return removePerson(list, personId, (current) => ({
items: current.items.map((item) => (item.who === personId ? { ...item, who: null } : item)),
}));
}
function shareOut(list) {
if (!list.people.length) return list;
if (!list.items.some((item) => !item.who && !item.done)) return list;
const load = new Map(list.people.map((person) => [person.id, 0]));
for (const item of list.items) {
if (item.who && !item.done && load.has(item.who)) load.set(item.who, load.get(item.who) + 1);
}
const now = Date.now();
const items = list.items.map((item) => {
if (item.who || item.done) return item;
let lightest = list.people[0].id;
for (const person of list.people) {
if (load.get(person.id) < load.get(lightest)) lightest = person.id;
}
load.set(lightest, load.get(lightest) + 1);
return { ...item, who: lightest, updatedAt: now };
});
return touch(list, { items });
}
function progress(list, personId = undefined) {
const items = personId === undefined ? list.items : list.items.filter((item) => item.who === personId);
const done = items.filter((item) => item.done).length;
return { done, total: items.length, left: items.length - done };
}
function mergeLists(a, b) {
if (!isValidList(a)) return b;
if (!isValidList(b)) return a;
if (a.id !== b.id) return a;
const [newer, older] = (a.updatedAt || 0) >= (b.updatedAt || 0) ? [a, b] : [b, a];
const removed = prune({ ...older.removed, ...newer.removed });
const byId = new Map();
for (const item of [...older.items, ...newer.items]) {
if (removed[item.id]) continue;
const held = byId.get(item.id);
if (!held || (item.updatedAt || 0) >= (held.updatedAt || 0)) byId.set(item.id, item);
}
const ordered = [
...newer.items.filter((item) => byId.has(item.id)).map((item) => byId.get(item.id)),
...older.items.filter(
(item) => byId.has(item.id) && !newer.items.some((other) => other.id === item.id),
),
];
const people = (newer.peopleAt || 0) >= (older.peopleAt || 0) ? newer.people : older.people;
const peopleAt = Math.max(newer.peopleAt || 0, older.peopleAt || 0);
const sameItems =
ordered.length === newer.items.length &&
ordered.every((item, index) => item === newer.items[index]);
const samePeople = people === newer.people && Object.keys(removed).length === Object.keys(newer.removed || {}).length;
if (sameItems && samePeople) return newer;
return {
...newer,
people,
peopleAt,
removed,
items: ordered,
updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
};
}
function isValidList(value) {
return Boolean(
value &&
typeof value === 'object' &&
value.kind === 'list' &&
typeof value.id === 'string' &&
Array.isArray(value.people) &&
Array.isArray(value.items) &&
value.items.every((item) => item && typeof item.id === 'string' && typeof item.text === 'string'),
);
}

// ---- src/polls.js ----------------------------------------------------
const VALUES = ['yes', 'maybe', 'no'];
const answerKey = (personId, optionId) => `${personId}|${optionId}`;
function createPoll({ question = '', names = [], shared = false, groupId = null } = {}) {
const now = Date.now();
return {
id: uid('v'),
kind: 'poll',
question: String(question).trim(),
createdAt: now,
updatedAt: now,
peopleAt: now,
closedAt: null,
archivedAt: null,
date: null,
at: null,
title: null,
shared: Boolean(shared),
groupId: groupId || null,
removed: {},
people: distinctNames(names).map((name) => ({ id: uid('w'), name })),
options: [],
votes: {},
};
}
function setPollDate(poll, date, at = null, until = null) {
const isDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const day = isDay(date) ? String(date) : null;
const hour = day && /^\d{2}:\d{2}$/.test(String(at || '')) ? String(at) : null;
const last = day && isDay(until) && String(until) > day ? String(until) : null;
if (day === (poll.date || null) && hour === (poll.at || null) && last === (poll.until || null)) return poll;
return touch(poll, { date: day, at: hour, until: last });
}
function lastDay(poll) {
return poll?.until || poll?.date || null;
}
function createEvent({ name = '', names = [], date = null, at = null, until = null } = {}) {
const made = createPoll({ question: name, names });
const dated = setPollDate(made, date, at, until);
return { ...dated, fixed: true, title: made.question || null, closedAt: dated.createdAt };
}
function isEvent(poll) {
return Boolean(poll?.fixed);
}
const WHEN_ASKED = /\b(quand|quel(le)?s? (jour|soir|date|week-?end|midi|matin|après-midi|semaine)|when|which (day|evening|night|date|weekend)|what (day|date|evening))\b/i;
const READS_AS_DAY = new RegExp([
'\\b(lun|mar|mer|jeu|ven|sam|dim)(\\.|di|redi|credi|udi|dredi|edi|anche)?\\b',
'\\b(mon|tue|wed|thu|fri|sat|sun)(day|s|\\.)?\\b',
'\\b(janv|févr|fevr|mars|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec|jan|feb|apr|jun|jul|aug|sep)[a-zéû]*\\b',
'\\b\\d{1,2}[/.]\\d{1,2}\\b',
'\\b\\d{4}-\\d{2}-\\d{2}\\b',
'\\b(demain|ce soir|tomorrow|tonight|week-?end)\\b',
].join('|'), 'i');
function seeksDay(poll) {
if (!poll || isEvent(poll)) return false;
if (WHEN_ASKED.test(poll.question || '')) return true;
const options = poll.options || [];
if (!options.length) return false;
const days = options.filter((option) => (optionDay(option) ? isDayChoice(option) : READS_AS_DAY.test(option.text || '')));
return days.length * 2 >= options.length;
}
function setEventName(poll, name) {
const kept = String(name || '').trim() || null;
return kept === (poll.title || null) ? poll : touch(poll, { title: kept });
}
function archivePoll(poll, yes = true) {
const at = yes ? Date.now() : null;
return at === (poll.archivedAt || null) ? poll : touch(poll, { archivedAt: at });
}
function addOptions(poll, text, { day = null, at = null } = {}) {
const now = Date.now();
const pinned = pinOf(day, at);
const fresh = String(text || '')
.split('\n')
.map((line) => line.replace(/^\s*(?:[-*•–—]+|\d+\s*[.)])\s+/, '').trim())
.filter(Boolean)
.map((line) => ({ id: uid('o'), text: line, ...pinned, createdAt: now, updatedAt: now }));
return fresh.length ? touch(poll, { options: [...poll.options, ...fresh] }) : poll;
}
function addChoice(poll, { text = '', day = null, at = null } = {}) {
const words = String(text || '').replace(/\s+/g, ' ').trim();
const pinned = pinOf(day, at);
if (!words && !pinned.day) return poll;
if (!words && poll.options.some((option) => !option.text.trim() && option.day === pinned.day && (option.at || null) === (pinned.at || null))) {
return poll;
}
const now = Date.now();
return touch(poll, { options: [...poll.options, { id: uid('o'), text: words, ...pinned, createdAt: now, updatedAt: now }] });
}
function addDays(poll, days, at = null) {
return [...days].sort().reduce((current, day) => addChoice(current, { day, at }), poll);
}
const isDayText = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const isHourText = (value) => /^\d{2}:\d{2}$/.test(String(value || ''));
const pinOf = (day, at) => (isDayText(day) ? { day: String(day), ...(isHourText(at) ? { at: String(at) } : {}) } : {});
function optionDay(option) {
return isDayText(option?.day) ? option.day : null;
}
function choiceWhen(option, from = Date.now()) {
const day = optionDay(option);
if (day) return { date: day, at: isHourText(option.at) ? option.at : null };
return dayOfChoice(option?.text, new Date(option?.createdAt || from));
}
function isDayChoice(option, from = Date.now()) {
const when = choiceWhen(option, from);
if (!when) return false;
const words = String(option.text || '').trim();
return !words || dayOfChoice(words, new Date(option.createdAt || from))?.date === when.date;
}
const onItsDay = (option) => Boolean(optionDay(option)) && !isDayChoice(option);
function choiceText(option, language = 'fr') {
const words = String(option?.text || '').trim();
if (words) return words;
const day = optionDay(option);
if (!day) return '';
return [choiceOfDay(day, language), isHourText(option.at) ? option.at : null].filter(Boolean).join(' · ');
}
function hasOptionDays(poll) {
return (poll?.options || []).some(onItsDay);
}
function setOptionDay(poll, optionId, day, at) {
const kept = isDayText(day) ? String(day) : null;
let changed = false;
const options = poll.options.map((option) => {
if (option.id !== optionId) return option;
const hour = kept ? (at === undefined ? (kept === optionDay(option) ? option.at : null) : at) : null;
const pinned = pinOf(kept, hour);
if (optionDay(option) === (pinned.day || null) && (isHourText(option.at) ? option.at : null) === (pinned.at || null)) return option;
changed = true;
const { day: _day, at: _at, ...rest } = option;
return { ...rest, ...pinned, updatedAt: later(option.updatedAt) };
});
return changed ? touch(poll, { options }) : poll;
}
function pollDay(poll) {
return isDayText(poll?.onDay) ? poll.onDay : null;
}
function setPollDay(poll, day) {
const kept = isDayText(day) ? String(day) : null;
const was = pollDay(poll);
if (kept === was) return poll;
const follows = (option) => Boolean(String(option.text || '').trim()) && !isDayChoice(option) && optionDay(option) === was;
const options = poll.options.map((option) => {
if (!follows(option)) return option;
const { day: _day, at: _at, ...rest } = option;
return { ...rest, ...pinOf(kept, option.at), updatedAt: later(option.updatedAt) };
});
return touch(poll, { onDay: kept, options });
}
function optionsByDay(poll) {
const groups = new Map();
for (const option of poll.options) {
const day = onItsDay(option) ? optionDay(option) : '';
if (!groups.has(day)) groups.set(day, []);
groups.get(day).push(option);
}
return [...groups.entries()]
.sort(([a], [b]) => (a === b ? 0 : !a ? 1 : !b ? -1 : a < b ? -1 : 1))
.map(([day, options]) => ({ day: day || null, options }));
}
function renameOption(poll, optionId, text) {
const clean = String(text || '').trim();
let changed = false;
const options = poll.options.map((option) => {
if (option.id !== optionId || option.text === clean || (!clean && !optionDay(option))) return option;
changed = true;
return { ...option, text: clean, updatedAt: later(option.updatedAt) };
});
return changed ? touch(poll, { options }) : poll;
}
function removeOption(poll, optionId) {
const options = poll.options.filter((option) => option.id !== optionId);
if (options.length === poll.options.length) return poll;
const votes = {};
for (const [key, vote] of Object.entries(poll.votes)) {
if (!key.endsWith(`|${optionId}`)) votes[key] = vote;
}
return touch(poll, { options, votes, removed: { ...poll.removed, [optionId]: Date.now() } });
}
function setVote(poll, personId, optionId, value) {
if (poll.closedAt) return poll;
if (!poll.people.some((person) => person.id === personId)) return poll;
if (!poll.options.some((option) => option.id === optionId)) return poll;
if (value !== null && !VALUES.includes(value)) return poll;
const key = answerKey(personId, optionId);
const held = poll.votes[key];
if (!held && value === null) return poll;
if (held?.v === value) return poll;
const votes = { ...poll.votes };
if (value === null) votes[key] = { v: null, at: later(held?.at) };
else votes[key] = { v: value, at: later(held?.at) };
return touch(poll, { votes });
}
function voteOf(poll, personId, optionId) {
return poll.votes[answerKey(personId, optionId)]?.v ?? null;
}
function nextValue(value) {
return value === 'yes' ? null : 'yes';
}
const addPollPerson = addPerson;
const renamePollPerson = renamePerson;
function removePollPerson(poll, personId) {
return removePerson(poll, personId, (current) => {
const votes = {};
for (const [key, vote] of Object.entries(current.votes)) {
if (!key.startsWith(`${personId}|`)) votes[key] = vote;
}
return { votes };
});
}
function setClosed(poll, closed) {
const closedAt = closed ? Date.now() : null;
return poll.closedAt === closedAt ? poll : touch(poll, { closedAt });
}
function tally(poll) {
const rows = poll.options.map((option) => {
const counts = { yes: 0, maybe: 0, no: 0, missing: 0 };
for (const person of poll.people) {
const value = voteOf(poll, person.id, option.id);
if (value) counts[value] += 1;
else counts.missing += 1;
}
return { option, ...counts, score: counts.yes };
});
const ranked = [...rows].sort((a, b) => b.yes - a.yes);
const leaders = [];
for (const { options } of optionsByDay(poll)) {
const ids = new Set(options.map((option) => option.id));
const group = rows.filter((row) => ids.has(row.option.id));
const best = Math.max(0, ...group.map((row) => row.yes));
if (best > 0) leaders.push(...group.filter((row) => row.yes === best).map((row) => row.option.id));
}
return {
rows,
ranked,
leaders,
answered: poll.people.filter((person) =>
poll.options.some((option) => voteOf(poll, person.id, option.id)),
).length,
};
}
function goers(poll) {
const { leaders } = tally(poll);
if (leaders.length !== 1) return poll.people.map((person) => person.name);
return poll.people
.filter((person) => voteOf(poll, person.id, leaders[0]) === 'yes')
.map((person) => person.name);
}
function mergePolls(a, b) {
if (!isValidPoll(a)) return b;
if (!isValidPoll(b)) return a;
if (a.id !== b.id) return a;
const [newer, older] = (a.updatedAt || 0) >= (b.updatedAt || 0) ? [a, b] : [b, a];
const removed = prune({ ...older.removed, ...newer.removed });
const byId = new Map();
for (const option of [...older.options, ...newer.options]) {
if (removed[option.id]) continue;
const held = byId.get(option.id);
if (!held || (option.updatedAt || 0) >= (held.updatedAt || 0)) byId.set(option.id, option);
}
const options = [
...newer.options.filter((option) => byId.has(option.id)).map((option) => byId.get(option.id)),
...older.options.filter(
(option) => byId.has(option.id) && !newer.options.some((other) => other.id === option.id),
),
];
const votes = { ...older.votes };
for (const [key, vote] of Object.entries(newer.votes)) {
const held = votes[key];
if (!held || (vote.at || 0) >= (held.at || 0)) votes[key] = vote;
}
const live = new Set(options.map((option) => option.id));
for (const key of Object.keys(votes)) {
if (!live.has(key.split('|')[1])) delete votes[key];
}
const people = (newer.peopleAt || 0) >= (older.peopleAt || 0) ? newer.people : older.people;
const sameOptions =
options.length === newer.options.length &&
options.every((option, index) => option === newer.options[index]);
const sameVotes =
Object.keys(votes).length === Object.keys(newer.votes).length &&
Object.entries(votes).every(([key, vote]) => newer.votes[key] === vote);
const sameRemoved = Object.keys(removed).length === Object.keys(newer.removed || {}).length;
const talk = mergedTalk(older, newer);
if (sameOptions && sameVotes && sameRemoved && people === newer.people && sameTalk(newer, talk)) return newer;
return {
...newer,
people,
peopleAt: Math.max(newer.peopleAt || 0, older.peopleAt || 0),
closedAt: newer.closedAt,
removed,
options,
votes,
...talk,
updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
};
}
function isValidPoll(value) {
return Boolean(
value &&
typeof value === 'object' &&
value.kind === 'poll' &&
typeof value.id === 'string' &&
Array.isArray(value.people) &&
Array.isArray(value.options) &&
value.options.every((option) => option && typeof option.id === 'string' && typeof option.text === 'string') &&
value.votes &&
typeof value.votes === 'object',
);
}
const CHOICE_MONTHS = [
['janv', 'jan'], ['févr', 'fevr', 'fév', 'fev', 'feb'], ['mars', 'march'], ['avr', 'apr'], ['mai', 'may'],
['juin', 'june', 'jun'], ['juil', 'july', 'jul'], ['août', 'aout', 'aug'], ['sept', 'sep'], ['oct'], ['nov'], ['déc', 'dec'],
];
const CHOICE_WEEKDAYS = [
['dim', 'dimanche', 'sun', 'sunday'], ['lun', 'lundi', 'mon', 'monday'], ['mar', 'mardi', 'tue', 'tues', 'tuesday'],
['mer', 'mercredi', 'wed', 'wednesday'], ['jeu', 'jeudi', 'thu', 'thur', 'thurs', 'thursday'],
['ven', 'vendredi', 'fri', 'friday'], ['sam', 'samedi', 'sat', 'saturday'],
];
const monthOfWord = (word) => CHOICE_MONTHS.findIndex((names) => names.some((name) => word.startsWith(name)));
const weekdayOfWord = (word) => CHOICE_WEEKDAYS.findIndex((names) => names.includes(word));
const isoDay = (date) =>
`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const realDay = (year, month, day) => {
const date = new Date(year, month, day);
return date.getMonth() === month && date.getDate() === day ? date : null;
};
function dayOfChoice(text, from = new Date()) {
const source = String(text || '').toLowerCase();
const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
const fits = (date) => date && date >= start;
let at = null;
const hour = source.match(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/);
if (hour && Number(hour[1]) < 24 && Number(hour[2] || 0) < 60) {
at = `${hour[1].padStart(2, '0')}:${hour[2] || '00'}`;
}
const rest = hour ? source.replace(hour[0], ' ') : source;
const iso = rest.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
if (iso) {
const date = realDay(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
return date ? { date: isoDay(date), at } : null;
}
const pick = (month, day, year) => {
if (year) {
const date = realDay(year, month, day);
return date ? { date: isoDay(date), at } : null;
}
for (const candidate of [start.getFullYear(), start.getFullYear() + 1]) {
const date = realDay(candidate, month, day);
if (fits(date)) return { date: isoDay(date), at };
}
return null;
};
const slashed = rest.match(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2}|\d{4}))?\b/);
if (slashed) {
let [day, month] = [Number(slashed[1]), Number(slashed[2])];
if (month > 12 && day <= 12) [day, month] = [month, day];
const year = slashed[3] ? Number(slashed[3].length === 2 ? `20${slashed[3]}` : slashed[3]) : null;
return pick(month - 1, day, year);
}
const words = rest.split(/[^\p{L}\d]+/u).filter(Boolean);
const year = Number(words.find((word) => /^\d{4}$/.test(word))) || null;
const weekday = words.map(weekdayOfWord).find((index) => index >= 0) ?? -1;
for (let i = 0; i < words.length; i += 1) {
const number = words[i].match(/^(\d{1,2})(?:er|st|nd|rd|th)?$/);
if (!number) continue;
const day = Number(number[1]);
if (day < 1 || day > 31) continue;
const after = words[i + 1] ? monthOfWord(words[i + 1]) : -1;
const beforeWord = words[i - 1] || '';
const before = beforeWord && weekdayOfWord(beforeWord) < 0 ? monthOfWord(beforeWord) : -1;
const month = after >= 0 ? after : before;
if (month >= 0) return pick(month, day, year);
if (weekday >= 0) {
for (let ahead = 0; ahead < 4; ahead += 1) {
const first = new Date(start.getFullYear(), start.getMonth() + ahead, 1);
const date = realDay(first.getFullYear(), first.getMonth(), day);
if (fits(date) && date.getDay() === weekday) return { date: isoDay(date), at };
}
return null;
}
}
return null;
}
function choiceOfDay(day, language = 'fr', now = new Date()) {
const [year, month, date] = String(day || '').split('-').map(Number);
if (!year || !month || !date) return '';
const options = { weekday: 'long', day: 'numeric', month: 'long' };
if (year !== now.getFullYear()) options.year = 'numeric';
const text = new Date(year, month - 1, date).toLocaleDateString(language, options);
return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---- src/spends.js ---------------------------------------------------
function createSpend({ name = '', names = [], shared = false, groupId = null, currency = 'EUR' } = {}) {
const now = Date.now();
return {
id: uid('d'),
kind: 'spend',
name: String(name).trim(),
currency: CURRENCIES.includes(currency) ? currency : 'EUR',
createdAt: now,
updatedAt: now,
peopleAt: now,
shared: Boolean(shared),
groupId: groupId || null,
archivedAt: null,
removed: {},
people: distinctNames(names).map((personName) => ({ id: uid('w'), name: personName })),
lines: [],
};
}
const CURRENCIES = ['EUR', 'CHF', 'GBP', 'USD', 'CAD'];
function spendCurrency(spend) {
return CURRENCIES.includes(spend?.currency) ? spend.currency : 'EUR';
}
const PAID_IN = [
'EUR', 'CHF', 'GBP', 'USD', 'CAD', 'AUD', 'NZD', 'JPY', 'CNY', 'HKD', 'SGD', 'THB', 'VND', 'IDR', 'INR', 'KRW',
'SEK', 'NOK', 'DKK', 'ISK', 'PLN', 'CZK', 'HUF', 'RON', 'TRY', 'MAD', 'TND', 'EGP', 'ZAR', 'XOF', 'XPF', 'MXN',
'BRL', 'ILS', 'AED',
];
function readRate(raw) {
if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 && raw <= 1e6 ? Math.round(raw * 1e6) / 1e6 : null;
const clean = String(raw ?? '').replace(/\s/g, '').replace(',', '.');
if (!/^\d+(\.\d{1,6})?$/.test(clean)) return null;
return readRate(Number(clean));
}
function convertPaid(cents, rate) {
const value = Math.round(cents / rate);
return Number.isInteger(value) && value > 0 ? value : null;
}
function paidInOf(spend, line) {
const paid = line?.paidIn;
if (!paid || typeof paid !== 'object' || isRepayment(line)) return null;
if (!PAID_IN.includes(paid.currency) || paid.currency === spendCurrency(spend)) return null;
return Number.isInteger(paid.amount) && paid.amount > 0 && readRate(paid.rate) ? paid : null;
}
function lastRate(spend, currency, others = []) {
const latest = (account) => account.lines
.map((line) => ({ line, paid: paidInOf(account, line) }))
.filter(({ paid }) => paid?.currency === currency)
.sort((a, b) => (b.line.updatedAt || 0) - (a.line.updatedAt || 0))[0]?.paid.rate ?? null;
const candidates = [spend, ...others
.filter((other) => other.id !== spend.id && spendCurrency(other) === spendCurrency(spend))
.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))];
for (const account of candidates) {
const rate = latest(account);
if (rate) return rate;
}
return null;
}
function paidFields(spend, amount, currency, rate) {
const cents = Number.isInteger(amount) ? amount : readAmount(amount);
if (!cents || cents < 0) return null;
if (!currency || currency === spendCurrency(spend)) return { amount: cents, paidIn: undefined };
const kept = PAID_IN.includes(currency) ? readRate(rate) : null;
const converted = kept ? convertPaid(cents, kept) : null;
return converted ? { amount: converted, paidIn: { currency, amount: cents, rate: kept } } : null;
}
function readAmount(raw) {
let clean = String(raw ?? '').replace(/[\s\u00a0\u202f€$£'’]|chf/gi, '');
if (clean.includes(',') && clean.includes('.')) {
const point = Math.max(clean.lastIndexOf(','), clean.lastIndexOf('.'));
const whole = clean.slice(0, point);
if (!/^\d{1,3}([.,]\d{3})*$/.test(whole)) return null;
clean = `${whole.replace(/[.,]/g, '')}.${clean.slice(point + 1)}`;
}
clean = clean.replace(',', '.');
if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
const value = Math.round(Number(clean) * 100);
return Number.isFinite(value) && value > 0 ? value : null;
}
function showAmount(cents, language = 'fr', currency = 'EUR') {
const value = (Number(cents) || 0) / 100;
try {
return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
} catch {
return `${value.toFixed(2)} ${currency === 'EUR' ? '€' : currency}`;
}
}
const PRICE = /(?:\b(\d+(?:[.,]\d{1,2})?)\s?(?:€|eur(?:os?)?\b|chf\b|£|\$)|(?:€|£|\$|\bchf)\s?(\d+(?:[.,]\d{1,2})?)\b)/gi;
function priceIn(text) {
const found = [...String(text || '').matchAll(PRICE)];
if (!found.length) return null;
const last = found[found.length - 1];
return readAmount(last[1] || last[2]);
}
function priceCurrency(text) {
const found = [...String(text || '').matchAll(PRICE)];
if (!found.length) return null;
const sign = found[found.length - 1][0].toLowerCase();
if (sign.includes('chf')) return 'CHF';
if (sign.includes('£')) return 'GBP';
if (sign.includes('$')) return 'USD';
return 'EUR';
}
function withoutPrice(text) {
const clean = String(text || '').replace(PRICE, ' ').replace(/\(\s*\)/g, ' ')
.replace(/\s+([,.;:])/g, '$1').replace(/[\s:=—–-]+$/, '').replace(/\s{2,}/g, ' ').trim();
return clean || String(text || '').trim();
}
const MOST_PARTS = 99;
function readParts(value) {
if (value === null || value === undefined || value === '') return null;
const number = Number(String(value).replace(',', '.'));
if (!Number.isFinite(number)) return null;
const halves = number * 2;
return Number.isInteger(halves) && halves >= 1 && halves <= MOST_PARTS * 2 ? halves / 2 : null;
}
function weightOf(person) {
return readParts(person?.weight) ?? 1;
}
function stepParts(value, step) {
const now = readParts(value) ?? 1;
if (step > 0) return now < 1 ? 1 : Math.min(MOST_PARTS, Math.floor(now) + 1);
return now <= 1 ? 0.5 : Math.max(1, Math.ceil(now) - 1);
}
function setSpendWeight(spend, personId, weight) {
const parts = readParts(weight) ?? 1;
return patchPerson(spend, personId, (person) => {
if (weightOf(person) === parts) return person;
const next = { ...person, weight: parts };
if (parts === 1) delete next.weight;
return next;
});
}
function payOf(person) {
return typeof person?.pay === 'string' ? person.pay.trim() : '';
}
function setSpendPay(spend, personId, text) {
const clean = String(text || '').trim().slice(0, 300);
return patchPerson(spend, personId, (person) => {
if (payOf(person) === clean) return person;
const next = { ...person, pay: clean };
if (!clean) delete next.pay;
return next;
});
}
function patchPerson(spend, personId, change) {
let changed = false;
const people = spend.people.map((person) => {
if (person.id !== personId) return person;
const next = change(person);
if (next !== person) changed = true;
return next;
});
return changed ? touch(spend, { people, peopleAt: later(spend.peopleAt) }) : spend;
}
function concernedBy(spend, forWhom) {
const known = spend.people.map((person) => person.id);
return forWhom?.length ? forWhom.filter((id) => known.includes(id)) : known;
}
function cleanParts(spend, parts, concerned) {
const kept = {};
for (const id of concerned) {
const value = readParts(parts?.[id]);
if (value !== null && value !== weightOf(spend.people.find((person) => person.id === id))) kept[id] = value;
}
return kept;
}
function cleanFixed(fixed, concerned) {
const kept = {};
for (const id of concerned) {
const cents = fixed?.[id];
if (Number.isInteger(cents) && cents > 0) kept[id] = cents;
}
return kept;
}
const centsIn = (amounts) => Object.values(amounts).reduce((sum, cents) => sum + cents, 0);
function splitProblem(spend, { amount, forWhom = [], fixed = null } = {}) {
const concerned = concernedBy(spend, forWhom);
const apart = cleanFixed(fixed, concerned);
const total = centsIn(apart);
if (total > amount) return 'over';
if (total < amount && concerned.length && concerned.every((id) => id in apart)) return 'left';
return null;
}
function splitFields(spend, { amount, forWhom, parts, fixed }) {
if (splitProblem(spend, { amount, forWhom, fixed })) return null;
const concerned = concernedBy(spend, forWhom);
const ownParts = cleanParts(spend, parts, concerned);
const apart = cleanFixed(fixed, concerned);
return {
parts: Object.keys(ownParts).length ? ownParts : undefined,
fixed: Object.keys(apart).length ? apart : undefined,
};
}
function tidy(line) {
for (const key of Object.keys(line)) if (line[key] === undefined) delete line[key];
return line;
}
function addSpend(spend, { text = '', amount = 0, currency = null, rate = null, by = null, forWhom = [], day = null, parts = null, fixed = null } = {}) {
const paid = paidFields(spend, amount, currency, rate);
if (!paid) return spend;
const cents = paid.amount;
const known = new Set(spend.people.map((person) => person.id));
const whom = spend.people.filter((person) => forWhom.includes(person.id)).map((person) => person.id);
const shared = splitFields(spend, { amount: cents, forWhom: whom, parts, fixed });
if (!shared) return spend;
const line = tidy({
id: uid('s'),
text: String(text || '').trim(),
amount: cents,
paidIn: paid.paidIn,
by: known.has(by) ? by : null,
forWhom: whom,
...shared,
day: /^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) ? String(day) : null,
createdAt: Date.now(),
updatedAt: Date.now(),
});
return touch(spend, { lines: [...spend.lines, line] });
}
function addRepayment(spend, { from = null, to = null, amount = 0, day = null } = {}) {
const cents = Number.isInteger(amount) ? amount : readAmount(amount);
const known = new Set(spend.people.map((person) => person.id));
if (!cents || !known.has(from) || !known.has(to) || from === to) return spend;
const added = addSpend(spend, { amount: cents, by: from, forWhom: [to], day });
const line = added.lines.at(-1);
return { ...added, lines: [...added.lines.slice(0, -1), { ...line, repay: true }] };
}
function isRepayment(line) {
return Boolean(line?.repay);
}
function patchLine(spend, lineId, patch) {
let changed = false;
const lines = spend.lines.map((line) => {
if (line.id !== lineId) return line;
changed = true;
return tidy({ ...line, ...patch, updatedAt: later(line.updatedAt) });
});
return changed ? touch(spend, { lines }) : spend;
}
function editSpend(spend, lineId, { text, amount, currency, rate, by, forWhom, day, parts, fixed } = {}) {
const line = spend.lines.find((entry) => entry.id === lineId);
if (!line) return spend;
const patch = {};
if (text !== undefined) patch.text = String(text || '').trim();
if (amount !== undefined && !isRepayment(line)) {
const paid = paidFields(spend, amount, currency, rate);
if (paid) Object.assign(patch, paid);
} else if (amount !== undefined) {
const cents = Number.isInteger(amount) ? amount : readAmount(amount);
if (cents) patch.amount = cents;
}
if (by !== undefined) {
patch.by = spend.people.some((person) => person.id === by) ? by : null;
}
if (forWhom !== undefined) {
patch.forWhom = spend.people.filter((person) => forWhom.includes(person.id)).map((person) => person.id);
}
if (day !== undefined) {
patch.day = /^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) ? String(day) : null;
}
if (!isRepayment(line) && (forWhom !== undefined || parts !== undefined || fixed !== undefined || patch.amount)) {
const shared = splitFields(spend, {
amount: patch.amount || line.amount,
forWhom: patch.forWhom || line.forWhom,
parts: parts !== undefined ? parts : line.parts,
fixed: fixed !== undefined ? fixed : line.fixed,
});
if (!shared) return spend;
Object.assign(patch, shared);
}
return Object.keys(patch).length ? patchLine(spend, lineId, patch) : spend;
}
function removeSpend(spend, lineId) {
const lines = spend.lines.filter((line) => line.id !== lineId);
if (lines.length === spend.lines.length) return spend;
return touch(spend, { lines, removed: { ...spend.removed, [lineId]: Date.now() } });
}
function archiveSpend(spend, yes = true) {
const at = yes ? Date.now() : null;
return at === (spend.archivedAt || null) ? spend : touch(spend, { archivedAt: at });
}
const addSpendPerson = addPerson;
const renameSpendPerson = renamePerson;
function sharedWithEveryone(spend) {
return spend.lines.some((line) => !isRepayment(line) && !line.forWhom.length);
}
function addLatecomer(spend, name) {
const now = spend.people.map((person) => person.id);
let changed = false;
const lines = spend.lines.map((line) => {
if (isRepayment(line) || line.forWhom.length) return line;
changed = true;
return { ...line, forWhom: now, updatedAt: later(line.updatedAt) };
});
return addPerson(changed ? touch(spend, { lines }) : spend, name);
}
function canRemovePerson(spend, personId) {
if (spend.lines.some((line) => line.by === personId)) return 'paid';
if (spend.lines.some((line) => line.forWhom.length === 1 && line.forWhom[0] === personId)) return 'alone';
if (spend.lines.some((line) => !isRepayment(line) && Number.isInteger(line.fixed?.[personId]))) return 'apart';
return 'ok';
}
function removeSpendPerson(spend, personId) {
if (canRemovePerson(spend, personId) !== 'ok') return spend;
const without = (parts) => {
const kept = { ...parts };
delete kept[personId];
return Object.keys(kept).length ? kept : undefined;
};
return removePerson(spend, personId, (current) => ({
lines: current.lines.map((line) =>
(line.forWhom.includes(personId) || line.parts?.[personId] !== undefined
? tidy({
...line,
forWhom: line.forWhom.filter((id) => id !== personId),
parts: line.parts ? without(line.parts) : undefined,
updatedAt: later(line.updatedAt),
})
: line)),
}));
}
function split(amount, count) {
if (count <= 0) return [];
const each = Math.floor(amount / count);
const extra = amount - each * count;
return Array.from({ length: count }, (_, index) => each + (index < extra ? 1 : 0));
}
function splitBy(amount, parts) {
const total = parts.reduce((sum, part) => sum + part, 0);
if (total <= 0) return parts.map(() => 0);
const shares = parts.map((part) => (amount * part - ((amount * part) % total)) / total);
let left = amount - shares.reduce((sum, share) => sum + share, 0);
const order = parts
.map((part, index) => ({ index, rest: (amount * part) % total }))
.sort((a, b) => b.rest - a.rest || a.index - b.index);
for (const { index } of order) {
if (left <= 0) break;
shares[index] += 1;
left -= 1;
}
return shares;
}
function lineShares(spend, line) {
const concerned = concernedBy(spend, line.forWhom);
const owed = new Map(concerned.map((id) => [id, 0]));
if (!concerned.length) return owed;
let apart = cleanFixed(line.fixed, concerned);
if (centsIn(apart) > line.amount) apart = {};
for (const [id, cents] of Object.entries(apart)) owed.set(id, cents);
const free = concerned.filter((id) => !(id in apart));
const pool = free.length ? free : concerned;
const halves = pool.map((id) => {
const own = readParts(line.parts?.[id]);
return (own ?? weightOf(spend.people.find((person) => person.id === id))) * 2;
});
const shares = splitBy(line.amount - centsIn(apart), halves);
pool.forEach((id, index) => owed.set(id, owed.get(id) + shares[index]));
return owed;
}
function balances(spend) {
const paid = new Map(spend.people.map((person) => [person.id, 0]));
const owed = new Map(spend.people.map((person) => [person.id, 0]));
const sent = new Map(spend.people.map((person) => [person.id, 0]));
const received = new Map(spend.people.map((person) => [person.id, 0]));
for (const line of spend.lines) {
if (isRepayment(line)) {
const to = line.forWhom[0];
if (!sent.has(line.by) || !received.has(to) || line.by === to) continue;
sent.set(line.by, sent.get(line.by) + line.amount);
received.set(to, received.get(to) + line.amount);
continue;
}
if (line.by && paid.has(line.by)) paid.set(line.by, paid.get(line.by) + line.amount);
for (const [id, cents] of lineShares(spend, line)) owed.set(id, owed.get(id) + cents);
}
return spend.people.map((person) => ({
id: person.id,
name: person.name,
paid: paid.get(person.id) || 0,
owed: owed.get(person.id) || 0,
sent: sent.get(person.id) || 0,
received: received.get(person.id) || 0,
balance: (paid.get(person.id) || 0) - (owed.get(person.id) || 0)
+ (sent.get(person.id) || 0) - (received.get(person.id) || 0),
}));
}
function spendTotal(spend) {
return spend.lines.reduce((sum, line) => sum + (isRepayment(line) ? 0 : line.amount), 0);
}
function settle(spend) {
const owing = balances(spend)
.filter((row) => row.balance !== 0)
.map((row) => ({ ...row }));
const debtors = owing.filter((row) => row.balance < 0).sort((a, b) => a.balance - b.balance);
const creditors = owing.filter((row) => row.balance > 0).sort((a, b) => b.balance - a.balance);
const moves = [];
let d = 0;
let c = 0;
while (d < debtors.length && c < creditors.length) {
const amount = Math.min(-debtors[d].balance, creditors[c].balance);
if (amount > 0) {
moves.push({ from: debtors[d].name, fromId: debtors[d].id, to: creditors[c].name, toId: creditors[c].id, amount });
debtors[d].balance += amount;
creditors[c].balance -= amount;
}
if (debtors[d].balance === 0) d += 1;
if (creditors[c].balance === 0) c += 1;
}
return moves;
}
function mergeSpends(a, b) {
if (!isValidSpend(a)) return b;
if (!isValidSpend(b)) return a;
if (a.id !== b.id) return a;
const [newer, older] = (a.updatedAt || 0) >= (b.updatedAt || 0) ? [a, b] : [b, a];
const removed = prune({ ...older.removed, ...newer.removed });
const byId = new Map();
for (const line of [...older.lines, ...newer.lines]) {
if (removed[line.id]) continue;
const held = byId.get(line.id);
if (!held || (line.updatedAt || 0) >= (held.updatedAt || 0)) byId.set(line.id, line);
}
const lines = [
...newer.lines.filter((line) => byId.has(line.id)).map((line) => byId.get(line.id)),
...older.lines.filter(
(line) => byId.has(line.id) && !newer.lines.some((other) => other.id === line.id),
),
];
const people = (newer.peopleAt || 0) >= (older.peopleAt || 0) ? newer.people : older.people;
const sameLines =
lines.length === newer.lines.length && lines.every((line, index) => line === newer.lines[index]);
const sameRemoved = Object.keys(removed).length === Object.keys(newer.removed || {}).length;
if (sameLines && sameRemoved && people === newer.people) return newer;
return {
...newer,
people,
peopleAt: Math.max(newer.peopleAt || 0, older.peopleAt || 0),
removed,
lines,
updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
};
}
function isValidSpend(value) {
return Boolean(
value &&
typeof value === 'object' &&
value.kind === 'spend' &&
typeof value.id === 'string' &&
Array.isArray(value.people) &&
Array.isArray(value.lines) &&
value.lines.every(
(line) =>
line &&
typeof line.id === 'string' &&
Number.isInteger(line.amount) &&
line.amount > 0 &&
Array.isArray(line.forWhom),
),
);
}

// ---- src/ideas.js ----------------------------------------------------
const SKETCH_WIDTH = 1000;
const SKETCH_HEIGHT = 750;
const INKS = ['ink', 'red', 'blue', 'green', 'orange'];
const PENS = [4, 10, 24];
const ERASERS = [8, 20, 45];
const BOARD_LIMIT = 150000;
function createBoard({ name = '', shared = false, groupId = null } = {}) {
const now = Date.now();
return {
id: uid('b'),
kind: 'board',
name: String(name).trim(),
createdAt: now,
updatedAt: now,
shared: Boolean(shared),
groupId: groupId || null,
archivedAt: null,
removed: {},
cards: [],
};
}
function addCard(board, type = 'note', text = '') {
const now = Date.now();
const card = {
id: uid('c'),
type: type === 'sketch' ? 'sketch' : 'note',
text: String(text || '').trim(),
textAt: now,
strokes: [],
createdAt: now,
updatedAt: now,
};
return { board: touch(board, { cards: [...board.cards, card] }), cardId: card.id };
}
function patchCard(board, cardId, change) {
let changed = false;
const cards = board.cards.map((card) => {
if (card.id !== cardId) return card;
const next = change(card);
if (next === card) return card;
changed = true;
return { ...next, updatedAt: later(card.updatedAt) };
});
return changed ? touch(board, { cards }) : board;
}
function editCardText(board, cardId, text) {
const clean = String(text || '').trim();
return patchCard(board, cardId, (card) =>
card.text === clean ? card : { ...card, text: clean, textAt: later(card.textAt) },
);
}
function addStrokes(board, cardId, strokes) {
const fresh = (strokes || []).map(cleanStroke).filter(Boolean);
if (!fresh.length) return board;
return patchCard(board, cardId, (card) => ({ ...card, strokes: [...card.strokes, ...fresh] }));
}
function eraseStrokes(board, cardId, strokeIds) {
const gone = new Set(strokeIds || []);
const card = board.cards.find((entry) => entry.id === cardId);
if (!card || !card.strokes.some((stroke) => gone.has(stroke.id))) return board;
const now = Date.now();
const removed = { ...board.removed };
for (const id of gone) removed[id] = now;
const next = patchCard(board, cardId, (current) => ({
...current,
strokes: current.strokes.filter((stroke) => !gone.has(stroke.id)),
}));
return { ...next, removed };
}
function removeCard(board, cardId) {
const cards = board.cards.filter((card) => card.id !== cardId);
if (cards.length === board.cards.length) return board;
return touch(board, { cards, removed: { ...board.removed, [cardId]: Date.now() } });
}
function archiveBoard(board, yes = true) {
if (Boolean(yes) === Boolean(board.archivedAt)) return board;
return touch(board, { archivedAt: yes ? Date.now() : null });
}
function pointsOf(stroke) {
const { points } = stroke || {};
if (Array.isArray(points)) return points;
return typeof points === 'string' && points.trim() ? points.trim().split(/\s+/).map(Number) : [];
}
function cleanStroke(stroke) {
if (!stroke) return null;
const raw = pointsOf(stroke);
const points = [];
for (let index = 0; index + 1 < raw.length; index += 2) {
const x = Number(raw[index]);
const y = Number(raw[index + 1]);
if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
points.push(
Math.round(Math.min(SKETCH_WIDTH, Math.max(0, x))),
Math.round(Math.min(SKETCH_HEIGHT, Math.max(0, y))),
);
}
if (!points.length) return null;
return {
id: typeof stroke.id === 'string' && stroke.id ? stroke.id : uid('s'),
ink: INKS.includes(stroke.ink) ? stroke.ink : 'ink',
pen: PENS.includes(stroke.pen) ? stroke.pen : PENS[0],
points: points.join(' '),
};
}
function simplifyPoints(points, tolerance = 2) {
const count = Math.floor((points?.length || 0) / 2);
if (count <= 2) return (points || []).slice(0, count * 2);
const keep = new Array(count).fill(false);
keep[0] = true;
keep[count - 1] = true;
const stack = [[0, count - 1]];
while (stack.length) {
const [first, last] = stack.pop();
let farthest = -1;
let distance = tolerance;
for (let index = first + 1; index < last; index += 1) {
const d = segmentDistance(
points[index * 2], points[index * 2 + 1],
points[first * 2], points[first * 2 + 1],
points[last * 2], points[last * 2 + 1],
);
if (d > distance) {
distance = d;
farthest = index;
}
}
if (farthest >= 0) {
keep[farthest] = true;
stack.push([first, farthest], [farthest, last]);
}
}
const kept = [];
for (let index = 0; index < count; index += 1) {
if (keep[index]) kept.push(points[index * 2], points[index * 2 + 1]);
}
return kept;
}
function segmentDistance(px, py, ax, ay, bx, by) {
const dx = bx - ax;
const dy = by - ay;
const length = dx * dx + dy * dy;
const along = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
return Math.hypot(px - (ax + along * dx), py - (ay + along * dy));
}
function strokeNear(stroke, x, y, reach = 16) {
const points = pointsOf(stroke);
const margin = reach + (stroke.pen || 0) / 2;
if (points.length === 2) return Math.hypot(points[0] - x, points[1] - y) <= margin;
for (let index = 0; index + 3 < points.length; index += 2) {
if (segmentDistance(x, y, points[index], points[index + 1], points[index + 2], points[index + 3]) <= margin) {
return true;
}
}
return false;
}
function rubOut(stroke, x, y, reach = ERASERS[0]) {
const points = pointsOf(stroke);
if (!points.length) return null;
const margin = reach + (stroke.pen || 0) / 2;
const step = Math.max(2, reach / 3);
const dense = [points[0], points[1]];
for (let index = 2; index + 1 < points.length; index += 2) {
const [ax, ay, bx, by] = [points[index - 2], points[index - 1], points[index], points[index + 1]];
const parts = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
for (let part = 1; part <= parts; part += 1) {
dense.push(ax + ((bx - ax) * part) / parts, ay + ((by - ay) * part) / parts);
}
}
const pieces = [];
let run = [];
let touched = false;
for (let index = 0; index + 1 < dense.length; index += 2) {
if (Math.hypot(dense[index] - x, dense[index + 1] - y) <= margin) {
touched = true;
if (run.length) pieces.push(run);
run = [];
} else {
run.push(dense[index], dense[index + 1]);
}
}
if (!touched) return null;
if (run.length) pieces.push(run);
return pieces
.map((piece) => cleanStroke({ id: uid('s'), ink: stroke.ink, pen: stroke.pen, points: simplifyPoints(piece.map(Math.round)) }))
.filter(Boolean);
}
function strokePath(stroke) {
const points = pointsOf(stroke);
if (points.length === 2) return `M${points[0]} ${points[1]}h0`;
let path = `M${points[0]} ${points[1]}`;
for (let index = 2; index + 1 < points.length; index += 2) path += `L${points[index]} ${points[index + 1]}`;
return path;
}
function boardSize(board) {
return JSON.stringify(board).length;
}
function cardsInOrder(board) {
return [...board.cards].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || (a.id < b.id ? -1 : 1));
}
function mergeBoards(a, b) {
if (!isValidBoard(a)) return b;
if (!isValidBoard(b)) return a;
if (a.id !== b.id) return a;
const [newer, older] = (a.updatedAt || 0) >= (b.updatedAt || 0) ? [a, b] : [b, a];
const removed = prune({ ...older.removed, ...newer.removed });
const byId = new Map();
for (const card of [...older.cards, ...newer.cards]) {
if (removed[card.id]) continue;
const held = byId.get(card.id);
byId.set(card.id, held ? mergeCards(held, card, removed) : liveStrokes(card, removed));
}
const cards = [...byId.values()].sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0) || (x.id < y.id ? -1 : 1));
const merged = { ...newer, removed, cards, ...mergedTalk(older, newer), updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0) };
const sameAs = (board) =>
JSON.stringify(board.cards) === JSON.stringify(merged.cards) &&
Object.keys(board.removed || {}).length === Object.keys(removed).length &&
sameTalk(board, merged) &&
(board.updatedAt || 0) === merged.updatedAt;
if (sameAs(newer)) return newer;
return merged;
}
function liveStrokes(card, removed) {
return card.strokes.some((stroke) => removed[stroke.id])
? { ...card, strokes: card.strokes.filter((stroke) => !removed[stroke.id]) }
: card;
}
function mergeCards(first, second, removed) {
const text = (first.textAt || 0) > (second.textAt || 0) ? first : second;
const seen = new Set();
const strokes = [];
for (const stroke of [...first.strokes, ...second.strokes]) {
if (seen.has(stroke.id) || removed[stroke.id]) continue;
seen.add(stroke.id);
strokes.push(stroke);
}
return {
...second,
text: text.text,
textAt: Math.max(first.textAt || 0, second.textAt || 0),
strokes,
updatedAt: Math.max(first.updatedAt || 0, second.updatedAt || 0),
};
}
function isValidBoard(value) {
return Boolean(
value &&
typeof value === 'object' &&
value.kind === 'board' &&
typeof value.id === 'string' &&
Array.isArray(value.cards) &&
value.cards.every(
(card) =>
card &&
typeof card.id === 'string' &&
typeof card.text === 'string' &&
Array.isArray(card.strokes) &&
card.strokes.every((stroke) => stroke && typeof stroke.id === 'string' && typeof stroke.points === 'string'),
),
);
}

// ---- src/stats.js ----------------------------------------------------
function sameName(name) {
return String(name || '')
.trim()
.toLowerCase()
.normalize('NFD')
.replace(/\p{Diacritic}/gu, '');
}
function presetsPlayed(games) {
const counts = new Map();
for (const game of games) {
if (!game.rounds.length) continue;
counts.set(game.presetId, (counts.get(game.presetId) || 0) + 1);
}
return [...counts.entries()]
.sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
.map(([presetId, played]) => ({ presetId, played }));
}
function statsFor(games, presetId) {
const rows = new Map();
const played = games.filter((game) => game.presetId === presetId && game.rounds.length);
const inOrder = [...played].sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
for (const game of inOrder) {
const status = gameStatus(game);
const winners = new Set(status.winners.map((row) => sameName(row.name)));
for (const row of standings(game)) {
const key = sameName(row.name);
const stat = rows.get(key) || {
name: row.name,
played: 0,
won: 0,
totals: [],
};
stat.name = row.name;
stat.played += 1;
if (winners.has(key)) stat.won += 1;
stat.totals.push(row.total);
rows.set(key, stat);
}
}
const direction = played[0]?.config.direction || 'low';
const best = (totals) => (direction === 'low' ? Math.min(...totals) : Math.max(...totals));
return [...rows.values()]
.map((stat) => ({
name: stat.name,
played: stat.played,
won: stat.won,
average: Math.round(stat.totals.reduce((sum, value) => sum + value, 0) / stat.totals.length),
best: best(stat.totals),
}))
.sort((a, b) => b.won - a.won || b.played - a.played || a.name.localeCompare(b.name));
}

// ---- src/dashboard.js ------------------------------------------------
function inGroup(document_, groupId) {
if (!groupId) return true;
return document_?.groupId === groupId && !document_?.linkOnly;
}
function dayNow(at = Date.now()) {
const date = new Date(at);
const pad = (value) => String(value).padStart(2, '0');
return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function isLate(item, today = dayNow()) {
return Boolean(item && item.due && !item.done && item.due < today);
}
function isLive(document_) {
return Boolean(document_) && !document_.archivedAt && !document_.template;
}
function peopleIn({ lists = [], polls = [], games = [], spends = [] } = {}) {
const seen = new Map();
const note = (raw, when) => {
const name = String(raw || '').trim();
const key = sameName(name);
if (!key) return;
const held = seen.get(key);
if (!held || (when || 0) >= held.at) seen.set(key, { name, at: when || 0 });
};
for (const list of lists) for (const person of list.people || []) note(person.name, list.updatedAt);
for (const poll of polls) for (const person of poll.people || []) note(person.name, poll.updatedAt);
for (const game of games) for (const player of game.players || []) note(player.name, game.updatedAt);
for (const spend of spends) for (const person of spend.people || []) note(person.name, spend.updatedAt);
return [...seen.values()].map((row) => row.name).sort((a, b) => a.localeCompare(b));
}
function groupCounts({ lists = [], polls = [], games = [], spends = [], boards = [] } = {}, groupId = '', today = dayNow()) {
const mine = (documents) => documents.filter((document_) => inGroup(document_, groupId));
const held = { lists: mine(lists), polls: mine(polls), games: mine(games), spends: mine(spends) };
const ideas = mine(boards);
const everything = [...held.lists, ...held.polls, ...held.games, ...held.spends, ...ideas];
const all = [...lists, ...polls, ...games, ...spends, ...boards];
const current = (document_) => isLive(document_) && !isOver(document_, all, today);
const live = {
lists: held.lists.filter(current),
polls: held.polls.filter(current),
games: held.games.filter(current),
spends: held.spends.filter(current),
};
return {
lists: live.lists.filter((list) => progress(list).left > 0).length,
polls: live.polls.filter((poll) => !poll.closedAt).length,
games: live.games.filter((game) => !gameStatus(game).finished).length,
spends: live.spends.filter((spend) => balances(spend).some((row) => row.balance !== 0)).length,
boards: ideas.filter(current).length,
left: live.lists.reduce((sum, list) => sum + progress(list).left, 0),
late: live.lists.reduce((sum, list) => sum + list.items.filter((item) => isLate(item, today)).length, 0),
people: peopleIn(held).length,
at: Math.max(0, ...everything.map((document_) => document_.updatedAt || 0)),
};
}
function personFile({ lists = [], polls = [], games = [], spends = [] } = {}, who, today = dayNow()) {
const key = sameName(who);
const byDate = (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0);
const groupIds = new Set();
let name = String(who || '').trim();
let at = -1;
const spelling = (raw, when) => {
if ((when || 0) < at) return;
at = when || 0;
name = String(raw || '').trim() || name;
};
const lines = [];
for (const list of [...lists].sort(byDate)) {
const person = (list.people || []).find((one) => sameName(one.name) === key);
if (!person) continue;
spelling(person.name, list.updatedAt);
if (list.groupId) groupIds.add(list.groupId);
if (!isLive(list)) continue;
const own = progress(list, person.id);
if (!own.total) continue;
const late = list.items.filter((item) => item.who === person.id && isLate(item, today)).length;
const next = list.items
.filter((item) => item.who === person.id && item.due && !item.done)
.map((item) => item.due)
.sort()[0] || null;
lines.push({ list, done: own.done, total: own.total, left: own.left, late, next });
}
const votes = [];
for (const poll of [...polls].sort(byDate)) {
const person = (poll.people || []).find((one) => sameName(one.name) === key);
if (!person) continue;
spelling(person.name, poll.updatedAt);
if (poll.groupId) groupIds.add(poll.groupId);
if (!isLive(poll)) continue;
votes.push({
poll,
answered: (poll.options || []).some((option) => voteOf(poll, person.id, option.id)),
closed: Boolean(poll.closedAt),
});
}
const played = [];
for (const game of [...games].sort(byDate)) {
const rows = standings(game);
const row = rows.find((one) => sameName(one.name) === key);
if (!row) continue;
spelling(row.name, game.updatedAt);
if (game.groupId) groupIds.add(game.groupId);
if (!game.rounds.length) continue;
const status = gameStatus(game);
played.push({
game,
rank: row.rank,
of: rows.length,
total: row.total,
won: status.finished && status.winners.some((one) => sameName(one.name) === key),
});
}
const accounts = [];
for (const spend of [...spends].sort(byDate)) {
const person = (spend.people || []).find((one) => sameName(one.name) === key);
if (!person) continue;
spelling(person.name, spend.updatedAt);
if (spend.groupId) groupIds.add(spend.groupId);
if (!isLive(spend)) continue;
const row = balances(spend).find((one) => one.id === person.id);
accounts.push({ spend, paid: row?.paid || 0, balance: row?.balance || 0 });
}
return {
name,
known: at >= 0,
groupIds: [...groupIds],
lines,
votes,
played,
accounts,
counts: {
games: played.length,
wins: played.filter((row) => row.won).length,
left: lines.reduce((sum, row) => sum + row.left, 0),
late: lines.reduce((sum, row) => sum + row.late, 0),
votes: votes.filter((row) => !row.closed && !row.answered).length,
owes: accounts.reduce((sum, row) => sum + (row.balance < 0 ? -row.balance : 0), 0),
owed: accounts.reduce((sum, row) => sum + (row.balance > 0 ? row.balance : 0), 0),
},
};
}
function parentId(document_) {
if (!document_) return null;
return Object.prototype.hasOwnProperty.call(document_, 'parent') ? document_.parent || null : document_.event || null;
}
function isEventDoc(document_) {
return document_?.kind === 'poll' && Boolean(document_.date || document_.fixed);
}
function kindOf(document_) {
if (document_?.kind) return document_.kind;
return document_?.presetId ? 'game' : null;
}
function allDocuments({ lists = [], polls = [], games = [], spends = [], boards = [] } = {}) {
return [...lists, ...polls, ...games, ...spends, ...boards];
}
function ancestorsOf(document_, all) {
const byId = new Map(all.map((one) => [one.id, one]));
const chain = [];
const seen = new Set([document_.id]);
let above = byId.get(parentId(document_));
while (above && !seen.has(above.id)) {
chain.unshift(above);
seen.add(above.id);
above = byId.get(parentId(above));
}
return chain;
}
function eventOf(document_, all) {
return [...ancestorsOf(document_, all)].reverse().find(isEventDoc) || null;
}
function childrenOf(document_, all) {
return all.filter((one) => one.id !== document_.id && parentId(one) === document_.id);
}
function descendantsOf(document_, all) {
const found = [];
const seen = new Set([document_.id]);
const queue = [document_];
while (queue.length) {
const current = queue.shift();
for (const child of childrenOf(current, all)) {
if (seen.has(child.id)) continue;
seen.add(child.id);
found.push(child);
queue.push(child);
}
}
return found;
}
function chainTree(document_, all) {
const top = ancestorsOf(document_, all)[0] || document_;
const order = ['poll', 'list', 'game', 'spend', 'board'];
const rank = (one) => (isEventDoc(one) ? -1 : order.indexOf(kindOf(one)));
const title = (one) => String(one.title || one.name || one.question || '');
const when = (one) => (isEventDoc(one) ? (one.date ? `${one.date} ${one.at || ''}` : '~') : '');
const byWhen = (a, b) => (when(a) < when(b) ? -1 : when(a) > when(b) ? 1 : 0);
const seen = new Set();
const grow = (node) => {
seen.add(node.id);
const children = childrenOf(node, all)
.filter((one) => !seen.has(one.id) && (isLive(one) || one.id === document_.id))
.sort((a, b) => stepOf(a, all) - stepOf(b, all) || rank(a) - rank(b) || byWhen(a, b) || title(a).localeCompare(title(b)));
return { document: node, children: children.map((child) => (seen.has(child.id) ? null : grow(child))).filter(Boolean) };
};
return grow(top);
}
function treeSize(tree) {
return 1 + tree.children.reduce((sum, child) => sum + treeSize(child), 0);
}
function attachTargets(document_, all) {
const below = new Set(descendantsOf(document_, all).map((one) => one.id));
const group = document_.groupId || null;
const fits = (one) => one.id !== document_.id && !below.has(one.id) && isLive(one) && (one.groupId || null) === group;
if (isEventDoc(document_)) {
if (childrenOf(document_, all).some(isEventDoc)) return [];
return all.filter((one) => fits(one) && isEventDoc(one) && !isActivity(one, all));
}
return all.filter(fits);
}
function isActivity(document_, all) {
if (!isEventDoc(document_)) return false;
const above = all.find((one) => one.id === parentId(document_));
return Boolean(above && isEventDoc(above));
}
function topEventOf(document_, all) {
const event = isEventDoc(document_) ? document_ : eventOf(document_, all);
if (!event) return null;
return isActivity(event, all) ? all.find((one) => one.id === parentId(event)) || event : event;
}
function isOver(document_, all, today = dayNow()) {
const own = document_?.date ? lastDay(document_) : null;
if (own && own < today) return true;
const event = topEventOf(document_, all);
const ends = event ? lastDay(event) : null;
return Boolean(ends && ends < today);
}
function eventDays(event) {
if (!event?.date) return [];
const days = [];
const [year, month, day] = event.date.split('-').map(Number);
const last = lastDay(event);
for (let i = 0; i < 14; i += 1) {
const date = new Date(year, month - 1, day + i);
const text = dayNow(date.getTime());
if (text > last) break;
days.push(text);
}
return days;
}
function programmeOf(event, all) {
const key = (one) => (one.date ? `${one.date} ${one.at || ''}` : `~${String(one.createdAt || 0).padStart(15, '0')}`);
return childrenOf(event, all)
.filter((one) => isEventDoc(one) && isLive(one))
.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}
function outsideEvent(activity, event) {
if (!activity?.date || !event?.date) return false;
return activity.date < event.date || activity.date > lastDay(event);
}
function attach(document_, targetId) {
const { event: _legacy, ...rest } = document_;
return { ...rest, parent: targetId || null, updatedAt: Math.max(Date.now(), (document_.updatedAt || 0) + 1) };
}
function eventParts(poll, state = {}) {
const all = allDocuments(state);
const below = descendantsOf(poll, all);
const recent = (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0);
const of = (kind) => below.filter((one) => kindOf(one) === kind && !isEventDoc(one)).sort(recent);
const parts = {
lists: of('list'), spends: of('spend'), polls: of('poll'), boards: of('board'), games: of('game'),
activities: programmeOf(poll, all),
};
return { ...parts, list: parts.lists[0] || null, spend: parts.spends[0] || null };
}
function partsCount(parts) {
return parts.lists.length + parts.spends.length + parts.polls.length + parts.boards.length + parts.games.length
+ (parts.activities || []).length;
}
function upcomingEvents(polls = [], today = dayNow()) {
return polls
.filter((poll) => isLive(poll) && poll.date && lastDay(poll) >= today && !isActivity(poll, polls))
.sort((a, b) => a.date.localeCompare(b.date) || String(a.at || '').localeCompare(String(b.at || '')));
}
function forEvent(poll, make, name) {
const made = make({ name, names: goers(poll) });
return {
...made,
parent: poll.id,
shared: Boolean(poll.shared),
groupId: poll.groupId || null,
...(poll.linkOnly ? { linkOnly: true } : {}),
};
}
const LINK_KINDS = ['with', 'after', 'before'];
function linksOf(document_) {
const seen = new Set();
return (Array.isArray(document_?.links) ? document_.links : [])
.filter((one) => one && typeof one.id === 'string' && LINK_KINDS.includes(one.kind))
.filter((one) => (seen.has(one.id) ? false : seen.add(one.id)));
}
function relationsOf(document_, all) {
const byId = new Map(all.map((one) => [one.id, one]));
const found = new Map();
const note = (other, kind, holder) => {
if (!other || other.id === document_.id || found.has(other.id) || !isLive(other)) return;
found.set(other.id, { document: other, kind, holder });
};
for (const link of linksOf(document_)) {
note(byId.get(link.id), { with: 'with', after: 'waits', before: 'unblocks' }[link.kind], document_.id);
}
for (const other of all) {
const link = linksOf(other).find((one) => one.id === document_.id);
if (link) note(other, { with: 'with', after: 'unblocks', before: 'waits' }[link.kind], other.id);
}
const order = { waits: 0, unblocks: 1, with: 2 };
return [...found.values()].sort((a, b) => order[a.kind] - order[b.kind]);
}
function isDone(document_, today = dayNow()) {
const kind = kindOf(document_);
if (kind === 'poll') return isEventDoc(document_) && document_.date ? lastDay(document_) < today : Boolean(document_.closedAt);
if (kind === 'list') {
const { total, left } = progress(document_);
return total > 0 && left === 0;
}
if (kind === 'spend') return (document_.lines || []).length > 0 && balances(document_).every((row) => row.balance === 0);
if (kind === 'game') return gameStatus(document_).finished;
return null;
}
function waitingOn(document_, all, today = dayNow()) {
return relationsOf(document_, all)
.filter((one) => one.kind === 'waits' && isDone(one.document, today) === false)
.map((one) => one.document);
}
function comesBefore(fromId, toId, all) {
const next = new Map();
const edge = (a, b) => next.set(a, [...(next.get(a) || []), b]);
for (const one of all) {
for (const link of linksOf(one)) {
if (link.kind === 'after') edge(link.id, one.id);
if (link.kind === 'before') edge(one.id, link.id);
}
}
const seen = new Set([fromId]);
const queue = [fromId];
while (queue.length) {
for (const id of next.get(queue.shift()) || []) {
if (id === toId) return true;
if (!seen.has(id)) {
seen.add(id);
queue.push(id);
}
}
}
return false;
}
function linkTargets(document_, all, kind = 'with') {
const linked = new Set(relationsOf(document_, all).map((one) => one.document.id));
const group = document_.groupId || null;
return all.filter((one) => {
if (one.id === document_.id || linked.has(one.id) || !isLive(one) || (one.groupId || null) !== group) return false;
if (kind === 'after') return !comesBefore(document_.id, one.id, all);
if (kind === 'before') return !comesBefore(one.id, document_.id, all);
return true;
});
}
function linkTo(document_, targetId, kind = 'with') {
const links = [...linksOf(document_).filter((one) => one.id !== targetId), { id: targetId, kind }];
return { ...document_, links, updatedAt: Math.max(Date.now(), (document_.updatedAt || 0) + 1) };
}
function unlinkFrom(document_, targetId) {
const links = linksOf(document_).filter((one) => one.id !== targetId);
return { ...document_, links, updatedAt: Math.max(Date.now(), (document_.updatedAt || 0) + 1) };
}
function stepOf(document_, all, seen = new Set()) {
if (seen.has(document_.id)) return 0;
const before = relationsOf(document_, all).filter((one) => one.kind === 'waits');
if (!before.length) return 0;
const path = new Set([...seen, document_.id]);
return 1 + Math.max(...before.map((one) => stepOf(one.document, all, path)));
}

// ---- src/search.js ---------------------------------------------------
const MOST_WORDS = 8;
function foldMapped(text) {
const source = String(text || '');
let folded = '';
const starts = [];
const ends = [];
for (let index = 0; index < source.length;) {
const char = String.fromCodePoint(source.codePointAt(index));
const plain = char.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
for (let unit = 0; unit < plain.length; unit += 1) {
starts.push(index);
ends.push(index + char.length);
}
folded += plain;
index += char.length;
}
return { folded, starts, ends };
}
function searchWords(query) {
return [...new Set(foldMapped(query).folded.split(/\s+/).filter(Boolean))].slice(0, MOST_WORDS);
}
function foundAt(text, words) {
const { folded, starts, ends } = foldMapped(text);
const ranges = [];
for (const word of words) {
for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + 1)) {
ranges.push([starts[at], ends[at + word.length - 1]]);
}
}
ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const merged = [];
for (const range of ranges) {
const last = merged[merged.length - 1];
if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
else merged.push([...range]);
}
return merged;
}
function searchableParts(document_) {
const texts = (things, field = 'text') => (Array.isArray(things) ? things : []).map((one) => one?.[field]);
switch (kindOf(document_)) {
case 'list': return texts(document_.items);
case 'poll': return [document_.title && document_.question !== document_.title ? document_.question : '', ...texts(document_.options)];
case 'board': return texts(document_.cards);
case 'spend': return texts((document_.lines || []).filter((line) => !line.repay));
default: return [];
}
}
function searchDocuments(all, query, { titleOf = (one) => one?.name || '', parts = 3 } = {}) {
const words = searchWords(query);
if (!words.length) return [];
const found = [];
for (const document_ of all) {
const title = String(titleOf(document_) || '');
const texts = searchableParts(document_).map((text) => String(text || '').trim()).filter(Boolean);
const whole = foldMapped([title, ...texts].join('\n')).folded;
if (!words.every((word) => whole.includes(word))) continue;
const hits = texts.map((text) => ({ text, marks: foundAt(text, words) })).filter((hit) => hit.marks.length);
const titleMarks = foundAt(title, words);
const titleHolds = words.every((word) => foldMapped(title).folded.includes(word));
found.push({
document: document_, title, marks: titleMarks, parts: hits.slice(0, parts), more: Math.max(0, hits.length - parts),
rank: [titleHolds ? 1 : 0, hits.length, document_.updatedAt || 0],
});
}
return found
.sort((a, b) => b.rank[0] - a.rank[0] || b.rank[1] - a.rank[1] || b.rank[2] - a.rank[2])
.map(({ rank, ...hit }) => hit);
}

// ---- src/sky.js ------------------------------------------------------
const SKY_SEASONS = ['spring', 'summer', 'autumn', 'winter'];
function skySeason(date = new Date()) {
const day = (date.getMonth() + 1) * 100 + date.getDate();
if (day >= 1221 || day < 320) return 'winter';
if (day < 621) return 'spring';
if (day < 922) return 'summer';
return 'autumn';
}
const SKY_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const SKY_LUNATION = 29.530588853;
function skyMoonPhase(time = Date.now()) {
const days = (time - SKY_NEW_MOON) / 86400000;
return (((days / SKY_LUNATION) % 1) + 1) % 1;
}
function skyMoonShape(phase) {
const cos = Math.cos(phase * 2 * Math.PI);
const waxing = phase < 0.5;
const crescent = cos > 0;
const edge = `A${Math.round(Math.abs(cos) * 2000) / 100} 20 0 0 ${waxing === crescent ? 0 : 1} 24 4`;
return { edge, lit: `M24 4A20 20 0 0 ${waxing ? 1 : 0} 24 44${edge}Z` };
}
const skyMask = (inner) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'>${inner}</svg>`)}")`;
function skyMoonMask(phase) {
return skyMask(`<circle cx='24' cy='24' r='20' fill-opacity='.2'/><path d='${skyMoonShape(phase).lit}'/>`);
}
function skyMoonLine(phase) {
return skyMask(`<g fill='none' stroke='black' stroke-width='1.6'><circle cx='24' cy='24' r='20'/><path d='M24 44${skyMoonShape(phase).edge}'/></g>`);
}

// ---- src/flows.js ----------------------------------------------------
function related(document_, all, kind) {
return relationsOf(document_, all)
.map((one) => one.document)
.filter((one) => kindOf(one) === kind && !isEventDoc(one));
}
function oneLine(text) {
return String(text || '').split('\n').map((part) => part.trim()).filter(Boolean).join(' — ');
}
function cameFrom(rows, docId, partId) {
return (rows || []).some((row) => row.from?.doc === docId && row.from?.part === partId);
}
function markLast(document_, field, from) {
const rows = document_[field];
const last = rows[rows.length - 1];
return touch(document_, { [field]: [...rows.slice(0, -1), { ...last, from }] });
}
function ideasFor(list, board) {
return cardsInOrder(board)
.map((card) => ({ card, text: oneLine(card.text), added: cameFrom(list.items, board.id, card.id) }))
.filter((one) => one.text);
}
function addIdea(list, board, card) {
const text = oneLine(card.text);
if (!text || cameFrom(list.items, board.id, card.id)) return list;
const next = addItems(list, text);
return next === list ? list : markLast(next, 'items', { doc: board.id, part: card.id });
}
function pollFromIdeas(board, { question = '', names = [] } = {}) {
const texts = [...new Set(cardsInOrder(board).map((card) => oneLine(card.text)).filter(Boolean))];
const poll = addOptions(
createPoll({ question: question || board.name, names, shared: Boolean(board.shared), groupId: board.groupId || null }),
texts.join('\n'),
);
return {
...poll,
parent: parentId(board),
links: [{ id: board.id, kind: 'after' }],
...(board.linkOnly ? { linkOnly: true } : {}),
};
}
function winnersOf(poll) {
if (!poll?.closedAt || isEventDoc(poll)) return [];
const { leaders } = tally(poll);
return poll.options.filter((option) => leaders.includes(option.id));
}
function winnerOffers(poll, list) {
return winnersOf(poll).map((option) => ({ option, added: cameFrom(list.items, poll.id, option.id) }));
}
function addWinner(list, poll, option, language = 'fr') {
const text = oneLine(choiceText(option, language));
if (!text || cameFrom(list.items, poll.id, option.id)) return list;
const next = addItems(list, text);
return next === list ? list : markLast(next, 'items', { doc: poll.id, part: option.id });
}
function accountsFor(list, all) {
const above = ancestorsOf(list, all);
const events = new Set(above.filter(isEventDoc).map((one) => one.id));
const top = above[0] || list;
const chain = [top, ...descendantsOf(top, all)].filter((one) => {
if (one.id === list.id || !isLive(one) || kindOf(one) !== 'spend') return false;
const event = eventOf(one, all);
return !event || events.has(event.id);
});
const linked = related(list, all, 'spend');
return [...linked, ...chain.filter((one) => !linked.some((other) => other.id === one.id))];
}
function partsOf(line) {
if (Array.isArray(line.from?.parts) && line.from.parts.length) return line.from.parts;
return line.from?.part ? [line.from.part] : [];
}
function spentItems(spend, list) {
return new Set((spend.lines || []).filter((line) => line.from?.doc === list.id).flatMap(partsOf));
}
function unspentItems(list, spend, all = null) {
const spent = spentItems(spend, list);
const elsewhere = all ? paidLines(list, all) : new Map();
return list.items.filter((item) => item.done && !spent.has(item.id) && !elsewhere.has(item.id));
}
function ticketGroups(list, spend, all = null) {
const byWho = new Map();
for (const item of unspentItems(list, spend, all)) {
const who = list.people.some((person) => person.id === item.who) ? item.who : '';
byWho.set(who, [...(byWho.get(who) || []), item]);
}
return [...list.people.map((person) => person.id), '']
.filter((who) => byWho.has(who))
.map((who) => ({ whoId: who, who: list.people.find((person) => person.id === who)?.name || '', items: byWho.get(who) }));
}
function ticketText(list, items) {
const words = items.map((item) => withoutPrice(oneLine(item.text))).filter(Boolean);
if (words.length === 1) return words[0];
const text = list.name ? `${String(list.name).trim()} : ${words.join(', ')}` : words.join(', ');
return text.length > 120 ? `${text.slice(0, 119).trimEnd()}…` : text;
}
function estimateOf(items) {
const prices = items.map((item) => priceIn(item.text)).filter((cents) => cents);
return prices.length ? prices.reduce((sum, cents) => sum + cents, 0) : null;
}
function spendFromLines(spend, list, items, amount, { byName = null, text = '', forWhom = [], parts = null, fixed = null } = {}) {
const spent = spentItems(spend, list);
const fresh = items.filter((item) => item && !spent.has(item.id));
if (!fresh.length) return spend;
const holders = [...new Set(fresh.map((item) => item.who))];
const holder = holders.length === 1 ? list.people.find((person) => person.id === holders[0])?.name : '';
const name = String(byName || holder || '').trim();
let next = spend;
let payer = name ? next.people.find((person) => sameName(person.name) === sameName(name)) : null;
if (name && !payer) {
next = addPerson(next, name);
payer = next.people[next.people.length - 1];
}
const added = addSpend(next, {
text: String(text || '').trim() || ticketText(list, fresh), amount, by: payer?.id || null, forWhom, parts, fixed,
});
if (added === next) return spend;
const ids = fresh.map((item) => item.id);
return markLast(added, 'lines', ids.length === 1 ? { doc: list.id, part: ids[0] } : { doc: list.id, part: ids[0], parts: ids });
}
function spendFromLine(spend, list, item, amount, byName = null) {
return spendFromLines(spend, list, [item], amount, { byName });
}
function purchasesToWrite(name, lists, all) {
const key = sameName(name);
if (!key) return [];
return lists.flatMap((list) => {
if (kindOf(list) !== 'list' || !isLive(list)) return [];
const mine = new Set(list.people.filter((person) => sameName(person.name) === key).map((person) => person.id));
if (!mine.size) return [];
const account = accountsFor(list, all)[0];
const items = account ? unspentItems(list, account, all).filter((item) => mine.has(item.who)) : [];
return items.length ? [{ list, account, items }] : [];
});
}
function listsFeeding(spend, all) {
return all.filter((one) => kindOf(one) === 'list' && isLive(one) && accountsFor(one, all).some((other) => other.id === spend.id));
}
function paidLines(list, all) {
const paid = new Map();
for (const spend of all) {
if (kindOf(spend) !== 'spend') continue;
for (const line of spend.lines || []) {
if (line.from?.doc !== list.id || isRepayment(line)) continue;
const parts = partsOf(line);
for (const part of parts) paid.set(part, { spend, line, count: parts.length });
}
}
return paid;
}
function defaultForWhom(list, spend, all) {
const event = eventOf(list, all);
if (!event || !isActivity(event, all) || eventOf(spend, all)?.id === event.id) return [];
const names = goers(event);
const ids = spend.people.filter((person) => names.some((name) => sameName(name) === sameName(person.name))).map((person) => person.id);
return ids.length < spend.people.length ? ids : [];
}
function forWhomGroups(spend, all) {
const event = topEventOf(spend, all);
if (!event) return [];
return programmeOf(event, all)
.map((activity) => {
const names = goers(activity);
return {
id: activity.id,
name: eventName(activity),
ids: spend.people.filter((person) => names.some((name) => sameName(name) === sameName(person.name))).map((person) => person.id),
};
})
.filter((group) => group.ids.length && group.ids.length < spend.people.length);
}
function unblockedNow(all, { today = dayNow(), now = Date.now(), days = 7 } = {}) {
const since = now - days * 864e5;
const found = [];
for (const document_ of all) {
if (!isLive(document_) || isDone(document_, today) === true) continue;
const waited = relationsOf(document_, all).filter((one) => one.kind === 'waits').map((one) => one.document);
const done = waited.filter((one) => isDone(one, today) !== null);
if (!done.length || done.some((one) => !isDone(one, today))) continue;
const at = Math.max(...done.map((one) => one.closedAt || one.updatedAt || 0));
if (at >= since) found.push({ document: document_, by: done, at });
}
return found.sort((a, b) => b.at - a.at);
}
function missingGoers(event, all) {
const coming = goers(event).map((name) => String(name || '').trim()).filter(Boolean);
return descendantsOf(event, all)
.filter((one) => isLive(one) && ['list', 'spend'].includes(kindOf(one)))
.map((one) => ({
document: one,
names: coming.filter((name) => !(one.people || []).some((person) => sameName(person.name) === sameName(name))),
}))
.filter((one) => one.names.length);
}
function addGoers(document_, names) {
return names.reduce((next, name) => (
next.people.some((person) => sameName(person.name) === sameName(name)) ? next : addPerson(next, name)
), document_);
}
function activityFor(event, { name = '', date = null, at = null, names = null, from = null } = {}) {
const made = createEvent({ name, names: names || goers(event), date, at });
return {
...made,
parent: event.id,
shared: Boolean(event.shared),
groupId: event.groupId || null,
...(event.linkOnly ? { linkOnly: true } : {}),
...(from ? { from } : {}),
};
}
function madeFrom(event, all, docId, partId) {
return programmeOf(event, all).some((one) => one.from?.doc === docId && one.from?.part === partId);
}
function ideaActivities(board, all) {
const event = topEventOf(board, all);
if (!event) return { event: null, ideas: [] };
return {
event,
ideas: cardsInOrder(board)
.map((card) => ({ card, text: oneLine(card.text), made: madeFrom(event, all, board.id, card.id) }))
.filter((one) => one.text),
};
}
function choiceActivities(poll, all) {
const event = topEventOf(poll, all);
if (!event || !poll.forActivity || poll.whenFor || isEventDoc(poll)) return { event: null, choices: [] };
return {
event,
choices: winnersOf(poll).map((option) => ({ option, made: madeFrom(event, all, poll.id, option.id) })),
};
}
function whenPoll(activity, event, { question = '' } = {}) {
const poll = addDays(
createPoll({
question: question || activity.title || activity.question || '',
names: (activity.people || []).map((person) => person.name),
shared: Boolean(activity.shared),
groupId: activity.groupId || null,
}),
eventDays(event),
);
return { ...poll, parent: activity.id, whenFor: activity.id, ...(activity.linkOnly ? { linkOnly: true } : {}) };
}
function markForActivity(poll, yes = true) {
return touch(poll, { forActivity: Boolean(yes) });
}
function activityFromChoice(event, poll, option) {
const keen = (poll.people || []).filter((person) => voteOf(poll, person.id, option.id) === 'yes').map((person) => person.name);
return activityFor(event, {
name: oneLine(choiceText(option)), date: optionDay(option), at: option.at || null, names: keen.length ? keen : null, from: { doc: poll.id, part: option.id },
});
}
function activitiesOnClose(poll, all) {
const { event, choices } = choiceActivities(poll, all);
if (!event) return [];
const byDay = new Map();
for (const choice of choices) {
const day = optionDay(choice.option) || '';
byDay.set(day, [...(byDay.get(day) || []), choice]);
}
return [...byDay.values()]
.filter((group) => group.length === 1 && !group[0].made)
.map(([choice]) => activityFromChoice(event, poll, choice.option));
}
function settleAsActivity(poll, all, { option = null, date, at = null, until = null, name = '' } = {}) {
if (!poll || isEvent(poll) || poll.whenFor || !date) return null;
const undated = setPollDate(poll, null);
const event = topEventOf(undated, all);
if (!event || event.id === poll.id) return null;
const { leaders } = tally(poll);
const chosen = option || (leaders.length === 1 ? poll.options.find((one) => one.id === leaders[0]) || null : null);
if (madeFrom(event, all, poll.id, chosen?.id || null)) return null;
const words = chosen && !isDayChoice(chosen, poll.createdAt) ? oneLine(chosen.text) : '';
const keen = chosen
? (poll.people || []).filter((person) => voteOf(poll, person.id, chosen.id) === 'yes').map((person) => person.name)
: [];
const made = activityFor(event, {
name: oneLine(name) || words || eventName(poll),
date,
at,
names: keen.length ? keen : goers(poll),
from: { doc: poll.id, part: chosen?.id || null },
});
const activity = until ? setPollDate(made, made.date, made.at, until) : made;
return { activity, poll: undated.closedAt ? undated : setClosed(undated, true) };
}
function splitPollActivity(poll, all) {
if (!isActivity(poll, all) || isEvent(poll) || poll.whenFor) return null;
return settleAsActivity(poll, all, { date: poll.date, at: poll.at || null, until: poll.until || null });
}
function activityVotes(event, all) {
return descendantsOf(event, all).filter(
(one) => kindOf(one) === 'poll' && one.forActivity && !one.closedAt && !isEventDoc(one) && isLive(one),
);
}

// ---- src/news.js -----------------------------------------------------
const NEWS_NAMED = 3;
function factsOf(document_, since, me = '') {
if (!document_ || (document_.updatedAt || 0) <= since) return null;
const kind = kindOf(document_);
const mine = (name) => Boolean(me) && sameName(name) === sameName(me);
const fresh = (document_.createdAt || 0) > since;
const from = fresh ? document_.createdAt || 0 : since;
const facts = [];
let latest = 0;
const seen = (at) => {
if (at > latest) latest = at;
};
if (fresh) {
facts.push({ type: 'new' });
seen(document_.createdAt);
}
if (kind === 'list') {
const items = document_.items || [];
const added = items.filter((item) => (item.createdAt || 0) > from);
const ticked = items.filter((item) => item.done && (item.updatedAt || 0) > since);
added.forEach((item) => seen(item.createdAt));
ticked.forEach((item) => seen(item.updatedAt));
if (added.length) facts.push({ type: 'added', count: added.length });
if (ticked.length) {
facts.push({ type: 'ticked', count: ticked.length, texts: ticked.slice(0, NEWS_NAMED).map((item) => item.text) });
}
}
if (kind === 'poll') {
const names = [];
for (const [key, vote] of Object.entries(document_.votes || {})) {
if (!vote?.v || (vote.at || 0) <= since) continue;
const person = (document_.people || []).find((one) => one.id === key.split('|')[0]);
if (!person || mine(person.name) || names.some((name) => sameName(name) === sameName(person.name))) continue;
names.push(person.name);
seen(vote.at);
}
if (names.length) facts.push({ type: 'answered', names });
const choices = (document_.options || []).filter((option) => (option.createdAt || 0) > from);
choices.forEach((option) => seen(option.createdAt));
if (choices.length) facts.push({ type: 'choices', count: choices.length });
const closedAt = document_.closedAt || 0;
if (closedAt > since && closedAt !== document_.createdAt) {
seen(closedAt);
facts.push(document_.date ? { type: 'dated', date: document_.date, at: document_.at || null } : { type: 'closed' });
}
}
if (kind === 'spend') {
const lines = (document_.lines || []).filter((line) => (line.createdAt || 0) > from);
lines.forEach((line) => seen(line.createdAt));
const spent = lines.filter((line) => !line.repay);
const repaid = lines.filter((line) => line.repay);
if (spent.length) {
const names = [];
for (const line of spent) {
const name = (document_.people || []).find((person) => person.id === line.by)?.name;
if (name && !names.some((other) => sameName(other) === sameName(name))) names.push(name);
}
facts.push({ type: 'spent', count: spent.length, cents: spent.reduce((sum, line) => sum + (line.amount || 0), 0), names });
}
if (repaid.length) facts.push({ type: 'repaid', count: repaid.length });
}
if (kind === 'board') {
const cards = (document_.cards || []).filter((card) => (card.createdAt || 0) > from);
cards.forEach((card) => seen(card.createdAt));
if (cards.length) facts.push({ type: 'cards', count: cards.length });
}
if (kind === 'game') {
const rounds = (document_.rounds || []).filter((round) => (round.at || 0) > from);
rounds.forEach((round) => seen(round.at));
if (rounds.length) facts.push({ type: 'rounds', count: rounds.length });
}
const words = Object.values(document_.comments || {})
.filter((cell) => cell?.t && typeof cell.made === 'number' && cell.made > since && !mine(cell.n))
.sort((a, b) => a.made - b.made);
if (words.length) {
const last = words.at(-1);
seen(last.made);
facts.push({ type: 'words', count: words.length, name: last.n, text: last.t });
}
const reactions = Object.values(document_.reacts || {}).filter((cell) => cell?.e && (cell.at || 0) > since && !mine(cell.n));
if (reactions.length) {
reactions.forEach((cell) => seen(cell.at));
facts.push({ type: 'reacts', count: reactions.length });
}
return facts.length ? { latest, facts } : null;
}
function newsOf(documents, since, { me = '', here = null } = {}) {
const entries = [];
for (const document_ of documents || []) {
if (!document_ || document_.archivedAt || document_.template) continue;
const found = factsOf(document_, since, typeof me === 'function' ? me(document_) : me);
const facts = (found?.facts || []).filter((fact) => !(fact.type === 'new' && document_.id === here));
if (facts.length) entries.push({ doc: document_, at: found.latest || document_.updatedAt || 0, facts });
}
return entries.sort((a, b) => b.at - a.at || (a.doc.id < b.doc.id ? -1 : 1));
}
function newsKey(scope, id) {
return `${scope}:${id}`;
}
const NEWS_FIRST_LOOK = 7 * 24 * 60 * 60 * 1000;
const NEWS_KEPT = 200;
function seenWith(seen, key, now = Date.now()) {
const next = { ...(seen && typeof seen === 'object' ? seen : {}), [key]: now };
const keys = Object.keys(next);
if (keys.length <= NEWS_KEPT) return next;
const kept = keys.sort((a, b) => next[b] - next[a]).slice(0, NEWS_KEPT);
return Object.fromEntries(kept.map((one) => [one, next[one]]));
}

// ---- src/ics.js ------------------------------------------------------
function icsEscape(text) {
return String(text ?? '')
.replace(/\\/g, '\\\\')
.replace(/;/g, '\\;')
.replace(/,/g, '\\,')
.replace(/\r\n|\r|\n/g, '\\n');
}
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;
function foldLine(line) {
const bytes = new TextEncoder().encode(String(line));
if (bytes.length <= 75) return String(line);
const parts = [];
let start = 0;
let limit = 75;
while (start < bytes.length) {
let end = Math.min(start + limit, bytes.length);
while (end > start && end < bytes.length && (bytes[end] & 0b1100_0000) === 0b1000_0000) end -= 1;
parts.push(new TextDecoder().decode(bytes.slice(start, end)));
start = end;
limit = 74;
}
return parts.join('\r\n ');
}
function stampDay(day) {
return String(day || '').replace(/-/g, '');
}
function dayAfter(day) {
const [year, month, date] = String(day).split('-').map(Number);
const next = new Date(Date.UTC(year, month - 1, date + 1));
const pad = (value) => String(value).padStart(2, '0');
return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
}
function hourLater(day, at) {
const [year, month, date] = String(day).split('-').map(Number);
const [hour, minute] = String(at).split(':').map(Number);
const end = new Date(Date.UTC(year, month - 1, date, hour + 1, minute));
const pad = (value) => String(value).padStart(2, '0');
return `${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(end.getUTCDate())}`
+ `T${pad(end.getUTCHours())}${pad(end.getUTCMinutes())}00`;
}
function stampNow(at) {
return new Date(at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
function vevent({ uid, day, at = null, until = null, summary, description = '', stamp = Date.now() }) {
if (!DAY.test(String(day ?? ''))) return [];
if (!HOUR.test(String(at ?? ''))) at = null;
if (!DAY.test(String(until ?? ''))) until = null;
const lines = [
'BEGIN:VEVENT',
`UID:${icsEscape(uid)}`,
`DTSTAMP:${stampNow(stamp)}`,
];
const last = until && until > day ? until : null;
if (last && at) {
const [hour, minute] = String(at).split(':');
lines.push(`DTSTART:${stampDay(day)}T${hour}${minute}00`);
lines.push(`DTEND:${dayAfter(last)}T000000`);
} else if (last) {
lines.push(`DTSTART;VALUE=DATE:${stampDay(day)}`);
lines.push(`DTEND;VALUE=DATE:${dayAfter(last)}`);
} else if (at) {
const [hour, minute] = String(at).split(':');
lines.push(`DTSTART:${stampDay(day)}T${hour}${minute}00`);
lines.push(`DTEND:${hourLater(day, at)}`);
} else {
lines.push(`DTSTART;VALUE=DATE:${stampDay(day)}`);
lines.push(`DTEND;VALUE=DATE:${dayAfter(day)}`);
}
lines.push(`SUMMARY:${icsEscape(summary)}`);
if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
lines.push('END:VEVENT');
return lines;
}
function icsFor(events, { name = 'Together' } = {}) {
const lines = [
'BEGIN:VCALENDAR',
'VERSION:2.0',
'PRODID:-//Together//Calendrier//FR',
'CALSCALE:GREGORIAN',
'METHOD:PUBLISH',
`X-WR-CALNAME:${icsEscape(name)}`,
...events.flatMap((event) => vevent(event)),
'END:VCALENDAR',
];
return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
function eventName(poll) {
if (!poll) return '';
const own = String(poll.title || '').trim();
return own || nameFromQuestion(poll.question || '');
}
const THING = "(?:la|le|les|l['’]|une|un|des|du)\\s+\\S";
const ASKINGS = [
/^quel(?:le)?s?\s+\S+\s+pour\s+(.+)$/i,
new RegExp(`^quand\\s+(?:est-ce\\s+qu['’]on|fait-on|faisons-nous|on)\\s+(?:\\S+\\s+)?(${THING}.*)$`, 'i'),
new RegExp(`^on\\s+(?:\\S+\\s+){1,2}?(${THING}.*?)\\s+(?:quand|quel(?:le)?s?\\s+\\S+)$`, 'i'),
/^(?:when|what\s+\S+|which\s+\S+)\s+for\s+(.+)$/i,
];
const ARTICLE = /^(?:de\s+la|de\s+l['’]|des|du|de|les|la|le|l['’]|une|un|the|an|a)\s*/i;
function nameFromQuestion(question) {
const asked = String(question || '')
.trim()
.replace(/\s*[?？]+\s*$/, '')
.trim();
if (!asked) return '';
const matched = ASKINGS.map((pattern) => pattern.exec(asked)).find(Boolean);
const kept = (matched ? matched[1] : asked).trim().replace(ARTICLE, '').trim();
if (!kept) return asked;
return kept.charAt(0).toUpperCase() + kept.slice(1);
}
function pollEvent(poll, { stamp } = {}) {
if (!poll || !poll.date) return null;
return {
uid: `${poll.id}@together`,
kind: 'poll',
docId: poll.id,
day: poll.date,
at: poll.at || null,
until: poll.until && poll.until > poll.date ? poll.until : null,
summary: eventName(poll) || 'Sondage',
description: poll.people?.length ? poll.people.map((person) => person.name).join(', ') : '',
stamp: stamp ?? poll.updatedAt ?? Date.now(),
};
}
function listEvents(list, { stamp } = {}) {
if (!list || !Array.isArray(list.items)) return [];
return list.items
.filter((item) => item.due && !item.done)
.map((item) => ({
uid: `${item.id}@together`,
kind: 'list',
docId: list.id,
day: item.due,
at: null,
summary: String(item.text ?? ''),
description: [list.name, list.people?.find((person) => person.id === item.who)?.name]
.filter(Boolean)
.join(' · '),
stamp: stamp ?? item.updatedAt ?? Date.now(),
}));
}
function agendaFor({ lists = [], polls = [] } = {}, groupId = '') {
const mine = (document_) => (groupId ? document_.groupId === groupId : true);
const live = (document_) => !document_.archivedAt && !document_.template;
const events = [
...polls.filter((poll) => mine(poll) && live(poll)).map((poll) => pollEvent(poll)).filter(Boolean),
...lists.filter((list) => mine(list) && live(list)).flatMap((list) => listEvents(list)),
].filter((event) => DAY.test(String(event.day ?? '')));
return events.sort((a, b) => a.day.localeCompare(b.day) || a.summary.localeCompare(b.summary));
}

// ---- src/recap.js ----------------------------------------------------
function recapText(game, t, { title, withRounds = false } = {}) {
const status = gameStatus(game);
const rows = status.standings;
const lines = [];
lines.push(`${title} — ${t('home.rounds', { count: game.rounds.length })}`);
if (status.finished && status.winners.length) {
lines.push(
t(status.winners.length > 1 ? 'home.winners' : 'home.winner', {
name: status.winners.map((row) => row.name).join(', '),
}),
);
}
lines.push('');
rows.forEach((row) => {
lines.push(`${row.rank}. ${row.name} — ${row.total}`);
});
if (withRounds && game.rounds.length) {
lines.push('');
lines.push(t('game.perRound'));
game.rounds.forEach((round, index) => {
const scores = game.players.map((player) => `${player.name} ${roundScore(round, player.id)}`);
lines.push(`${index + 1}. ${scores.join(' · ')}`);
});
}
return lines.join('\n');
}

// ---- src/export-docx.js ----------------------------------------------
const CRC_TABLE = (() => {
const table = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
let c = n;
for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
table[n] = c >>> 0;
}
return table;
})();
function crc32(bytes) {
let c = 0xffffffff;
for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
return (c ^ 0xffffffff) >>> 0;
}
const encoder = new TextEncoder();
function zip(entries) {
const files = entries.map(({ name, text }) => ({
name: encoder.encode(name),
data: encoder.encode(text),
}));
const chunks = [];
const central = [];
let offset = 0;
const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff];
const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
for (const file of files) {
const sum = crc32(file.data);
const header = [
...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0),
...u16(0), ...u16(0x21), 
...u32(sum), ...u32(file.data.length), ...u32(file.data.length),
...u16(file.name.length), ...u16(0),
];
chunks.push(Uint8Array.from(header), file.name, file.data);
central.push([
...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0),
...u16(0), ...u16(0x21),
...u32(sum), ...u32(file.data.length), ...u32(file.data.length),
...u16(file.name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
...u32(0), ...u32(offset),
]);
offset += header.length + file.name.length + file.data.length;
}
const directory = [];
let directorySize = 0;
central.forEach((entry, index) => {
directory.push(Uint8Array.from(entry), files[index].name);
directorySize += entry.length + files[index].name.length;
});
const end = [
...u32(0x06054b50), ...u16(0), ...u16(0),
...u16(files.length), ...u16(files.length),
...u32(directorySize), ...u32(offset), ...u16(0),
];
const parts = [...chunks, ...directory, Uint8Array.from(end)];
const total = parts.reduce((sum, part) => sum + part.length, 0);
const out = new Uint8Array(total);
let at = 0;
for (const part of parts) {
out.set(part, at);
at += part.length;
}
return out;
}
function escapeXml(value) {
return String(value ?? '').replace(/[&<>"']/g, (char) =>
({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]),
);
}
const paragraph = (text, { bold = false, size = 22, spacing = 120 } = {}) =>
`<w:p><w:pPr><w:spacing w:after="${spacing}"/></w:pPr><w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
const cell = (text, bold) =>
`<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${paragraph(text, { bold, spacing: 0 })}</w:tc>`;
const row = (cells, bold) => `<w:tr>${cells.map((value) => cell(value, bold)).join('')}</w:tr>`;
const USABLE_WIDTH = 9638;
const table = (header, rows) => {
const width = Math.floor(USABLE_WIDTH / Math.max(header.length, 1));
const grid = `<w:tblGrid>${header.map(() => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>`;
return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${USABLE_WIDTH}" w:type="dxa"/>` +
`<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
.map((side) => `<w:${side} w:val="single" w:sz="4" w:color="BFBFBF"/>`)
.join('')}</w:tblBorders></w:tblPr>${grid}` +
row(header, true) +
rows.map((cells) => row(cells, false)).join('') +
`</w:tbl>`;
};
function buildDocx(report) {
const body = [
paragraph(report.title, { bold: true, size: 36 }),
report.subtitle ? paragraph(report.subtitle, { size: 20 }) : '',
report.winner ? paragraph(report.winner, { bold: true, size: 24 }) : '',
paragraph(report.standingsTitle, { bold: true, size: 26 }),
table(report.standingsHeader, report.standings),
paragraph('', { spacing: 200 }),
report.rounds.length ? paragraph(report.roundsTitle, { bold: true, size: 26 }) : '',
report.rounds.length ? table(report.roundsHeader, report.rounds) : '',
paragraph('', { spacing: 0 }),
].join('');
return zip([
{
name: '[Content_Types].xml',
text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
},
{
name: '_rels/.rels',
text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
},
{
name: 'word/document.xml',
text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`,
},
]);
}

// ---- src/export-pdf.js -----------------------------------------------
const PAGE = { width: 595, height: 842, margin: 56 }; 
function latin1Bytes(text) {
const out = new Uint8Array(text.length);
for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
return out;
}
function pdfString(value) {
return String(value ?? '').replace(/[\\()]/g, (char) => `\\${char}`);
}
function toLatin1(value) {
const replacements = { '—': '-', '–': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '…': '...', '·': '-', '×': 'x', '♥': 'C', '♦': 'K', '♠': 'P', '♣': 'T' };
return String(value ?? '')
.replace(/[—–’‘“”…·×♥♦♠♣]/g, (char) => replacements[char])
.replace(/[^\x00-\xFF]/g, '?');
}
function buildPdf(report) {
const lines = [];
let y = PAGE.height - PAGE.margin;
const pages = [];
let current = [];
const breakPage = () => {
pages.push(current.join('\n'));
current = [];
y = PAGE.height - PAGE.margin;
};
const write = (text, { size = 11, bold = false, gap = 16 } = {}) => {
if (y - gap < PAGE.margin) breakPage();
current.push(
`BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${PAGE.margin} ${y} Tm (${pdfString(toLatin1(text))}) Tj ET`,
);
y -= gap;
};
const rule = () => {
if (y - 8 < PAGE.margin) breakPage();
current.push(`0.75 w 0.75 0.75 0.75 RG ${PAGE.margin} ${y + 4} m ${PAGE.width - PAGE.margin} ${y + 4} l S`);
y -= 8;
};
const columns = (cells, widths, { bold = false, size = 11, gap = 15 } = {}) => {
if (y - gap < PAGE.margin) breakPage();
let x = PAGE.margin;
cells.forEach((cell, index) => {
current.push(
`BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfString(toLatin1(cell))}) Tj ET`,
);
x += widths[index];
});
y -= gap;
};
write(report.title, { size: 20, bold: true, gap: 26 });
if (report.subtitle) write(report.subtitle, { size: 10, gap: 20 });
if (report.winner) write(report.winner, { size: 13, bold: true, gap: 24 });
write(report.standingsTitle, { size: 13, bold: true, gap: 18 });
rule();
const usable = PAGE.width - 2 * PAGE.margin;
const standingWidths = [50, usable - 150, 100];
columns(report.standingsHeader, standingWidths, { bold: true, size: 10 });
rule();
report.standings.forEach((cells) => columns(cells, standingWidths));
if (report.rounds.length) {
y -= 14;
write(report.roundsTitle, { size: 13, bold: true, gap: 18 });
rule();
const width = usable / report.roundsHeader.length;
const roundWidths = report.roundsHeader.map(() => width);
columns(report.roundsHeader, roundWidths, { bold: true, size: 10 });
rule();
report.rounds.forEach((cells) => columns(cells, roundWidths, { size: 10 }));
}
pages.push(current.join('\n'));
const objects = [];
const pageCount = pages.length;
const pageIds = pages.map((_, index) => 4 + index * 2);
objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;
objects[3] = '<< /Font << /F1 100 0 R /F2 101 0 R >> >>';
pages.forEach((content, index) => {
const id = pageIds[index];
objects[id] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources 3 0 R /Contents ${id + 1} 0 R >>`;
objects[id + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
});
objects[100] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
objects[101] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
const used = objects.map((value, index) => (value === undefined ? null : index)).filter((index) => index !== null);
const maxId = Math.max(...used);
let body = '%PDF-1.4\n';
const offsets = {};
for (const id of used) {
offsets[id] = body.length;
body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
}
const xrefAt = body.length;
let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
for (let id = 1; id <= maxId; id += 1) {
xref += offsets[id] === undefined
? '0000000000 65535 f \n'
: `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
}
const trailer = `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
return latin1Bytes(body + xref + trailer);
}

// ---- src/storage.js --------------------------------------------------
const GAMES_KEY = 'marque-points:games:v1';
const LISTS_KEY = 'marque-points:lists:v1';
const POLLS_KEY = 'marque-points:polls:v1';
const SPENDS_KEY = 'marque-points:spends:v1';
const BOARDS_KEY = 'marque-points:boards:v1';
const PREFS_KEY = 'marque-points:prefs:v1';
function read(key, fallback) {
try {
const raw = localStorage.getItem(key);
if (!raw) return fallback;
return JSON.parse(raw);
} catch {
return fallback;
}
}
function write(key, value) {
try {
localStorage.setItem(key, JSON.stringify(value));
return true;
} catch {
return false;
}
}
function loadGames() {
const value = read(GAMES_KEY, []);
return Array.isArray(value) ? value.filter(isValidGame) : [];
}
function saveGames(games) {
return write(GAMES_KEY, games);
}
function loadLists() {
const value = read(LISTS_KEY, []);
return Array.isArray(value) ? value.filter(isValidList) : [];
}
function saveLists(lists) {
return write(LISTS_KEY, lists);
}
function loadPolls() {
const value = read(POLLS_KEY, []);
return Array.isArray(value) ? value.filter(isValidPoll) : [];
}
function savePolls(polls) {
return write(POLLS_KEY, polls);
}
function loadSpends() {
const value = read(SPENDS_KEY, []);
return Array.isArray(value) ? value.filter(isValidSpend) : [];
}
function saveSpends(spends) {
return write(SPENDS_KEY, spends);
}
function loadBoards() {
const value = read(BOARDS_KEY, []);
return Array.isArray(value) ? value.filter(isValidBoard) : [];
}
function saveBoards(boards) {
return write(BOARDS_KEY, boards);
}
function loadPrefs() {
const value = read(PREFS_KEY, {});
return value && typeof value === 'object' ? value : {};
}
function savePrefs(prefs) {
const stored = loadPrefs();
return write(PREFS_KEY, { ...stored, ...prefs });
}
const ACCOUNT_KEY = 'marque-points:account:v1';
function loadAccount() {
const value = read(ACCOUNT_KEY, null);
return value && typeof value === 'object' && value.refresh ? value : null;
}
function saveAccount(session) {
if (session) return write(ACCOUNT_KEY, session);
try {
localStorage.removeItem(ACCOUNT_KEY);
} catch {
}
return true;
}

// ---- src/config.js ---------------------------------------------------
const REMOTE = {
url: 'https://ikndckzjhhdlnwtvfkvx.supabase.co/rest/v1/',
key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbmRja3pqaGhkbG53dHZma3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NDMzMDEsImV4cCI6MjEwNTQxOTMwMX0.k1LVHl9LrJAVkN99YnIVDQ4493ol0fSZr12qrFglEiM',
};
const CONTACT = '';
function remoteConfig() {
try {
const stored = JSON.parse(localStorage.getItem('marque-points:remote:v1') || 'null');
if (stored && stored.url && stored.key) return stored;
} catch {
}
return REMOTE.url && REMOTE.key ? REMOTE : null;
}

// ---- src/lock.js -----------------------------------------------------
const DIGITS = 6;
const ITERATIONS = 310000; 
const VERSION = 1;
function canSeal() {
return Boolean(globalThis.crypto?.subtle);
}
function newCode() {
const range = 10 ** DIGITS;
const limit = Math.floor(0x100000000 / range) * range;
const buffer = new Uint32Array(1);
let drawn = limit;
while (drawn >= limit) {
globalThis.crypto.getRandomValues(buffer);
[drawn] = buffer;
}
return String(drawn % range).padStart(DIGITS, '0');
}
function isCode(value) {
return /^[0-9]{6}$/.test(String(value ?? '').trim());
}
function readCode(value) {
const digits = String(value ?? '').replace(/[^0-9]/g, '');
return digits.length === DIGITS ? digits : null;
}
function readInvite(text) {
const source = String(text ?? '');
const link = /#\/join\/(\d{6})(?:\/([^\s/?#]+))?/.exec(source);
const labelled = /(?:^|\n)\s*(?:code)\s*[:：]\s*(\d{6})\b/i.exec(source);
const bare = /^\s*(\d{6})\s*$/.exec(source);
const code = link?.[1] || labelled?.[1] || bare?.[1] || null;
let name = null;
if (link?.[2]) {
try {
name = decodeURIComponent(link[2]).trim() || null;
} catch {
name = link[2].trim() || null;
}
}
if (!name) {
const written = /(?:^|\n)\s*(?:nom|name|groupe|group)\s*[:：]\s*(.+)/i.exec(source);
name = written ? written[1].trim() || null : null;
}
return { name, code };
}
const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text) => Uint8Array.from(atob(String(text)), (char) => char.charCodeAt(0));
async function keyFrom(code, salt) {
const material = await crypto.subtle.importKey(
'raw',
new TextEncoder().encode(code),
'PBKDF2',
false,
['deriveKey'],
);
return crypto.subtle.deriveKey(
{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
material,
{ name: 'AES-GCM', length: 256 },
false,
['encrypt', 'decrypt'],
);
}
async function seal(value, code) {
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const key = await keyFrom(code, salt);
const sealed = await crypto.subtle.encrypt(
{ name: 'AES-GCM', iv },
key,
new TextEncoder().encode(JSON.stringify(value)),
);
return {
v: VERSION,
salt: toBase64(salt),
iv: toBase64(iv),
data: toBase64(new Uint8Array(sealed)),
};
}
async function unseal(sealed, code) {
if (!sealed || sealed.v !== VERSION || !canSeal()) return null;
try {
const key = await keyFrom(code, fromBase64(sealed.salt));
const plain = await crypto.subtle.decrypt(
{ name: 'AES-GCM', iv: fromBase64(sealed.iv) },
key,
fromBase64(sealed.data),
);
return JSON.parse(new TextDecoder().decode(plain));
} catch {
return null;
}
}

// ---- src/remote.js ---------------------------------------------------
const PATH = '/rest/v1/rpc/';
const TIMEOUT_MS = 8000;
function normaliseUrl(url) {
return String(url || '')
.trim()
.replace(/\/+$/, '')
.replace(/\/rest\/v1$/, '')
.replace(/\/+$/, '');
}
function createRemote(config, fetchImpl = globalThis.fetch) {
if (!config?.url || !config?.key || typeof fetchImpl !== 'function') return null;
const base = normaliseUrl(config.url);
async function withOwner(fn, body, owner) {
if (!owner) return call(fn, body);
try {
return await call(fn, { ...body, p_owner: owner });
} catch (error) {
if (!unknownParameter(error)) throw error;
return call(fn, body);
}
}
async function call(fn, body, token = null, path = `${PATH}${fn}`) {
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
try {
const response = await fetchImpl(`${base}${path}`, {
method: 'POST',
headers: {
'content-type': 'application/json',
accept: 'application/json',
apikey: config.key,
authorization: `Bearer ${token || config.key}`,
},
body: JSON.stringify(body),
signal: controller.signal,
});
if (!response.ok) {
const detail = await response.text().catch(() => '');
const error = new Error(`${fn} failed: ${response.status} ${detail.slice(0, 200)}`);
error.status = response.status;
error.detail = detail;
throw error;
}
if (response.status === 204) return null;
const text = await response.text();
return text ? JSON.parse(text) : null;
} finally {
clearTimeout(timer);
}
}
return {
async groupOf(key) {
const group = await call('marque_points_group_of', { p_key: key });
if (!group || typeof group !== 'object' || !group.id) return null;
return { ...group, admits: Boolean(group.admits) };
},
async invite(key, minutes = 30, uses = 1) {
const answer = await call('marque_points_invite', {
p_key: key,
p_minutes: minutes,
p_uses: uses,
});
return answer && typeof answer.code === 'string' ? answer : null;
},
async ask(name, code, who = '', label = '') {
const answer = await call('marque_points_ask', {
p_name: name,
p_code: code,
p_who: who,
p_label: label,
});
const status = answer?.status;
if (status === 'waiting' && typeof answer.ticket === 'string') {
return { status, ticket: answer.ticket, id: answer.id, name: answer.name };
}
if (status === 'who' && Array.isArray(answer.people)) {
return { status, people: answer.people.filter((one) => typeof one === 'string' && one.trim()) };
}
return { status: status === 'busy' ? 'busy' : 'unknown' };
},
async claim(ticket) {
const answer = await call('marque_points_claim', { p_ticket: ticket });
const status = answer?.status;
if (status === 'ok' && answer.id) return { status, id: answer.id, name: answer.name || '' };
if (status === 'waiting') return { status, name: answer.name || '' };
if (status === 'refused') return { status };
return { status: 'unknown' };
},
async requests(key) {
const rows = await call('marque_points_requests', { p_key: key });
return Array.isArray(rows) ? rows.filter((row) => row && typeof row.id === 'string') : [];
},
async answer(key, id, accept) {
const answer = await call('marque_points_answer', {
p_key: key,
p_id: id,
p_accept: Boolean(accept),
});
const status = answer?.status;
return status === 'ok' || status === 'refused' ? status : 'unknown';
},
async groupKeys(key) {
const rows = await call('marque_points_group_keys', { p_key: key });
return Array.isArray(rows) ? rows.filter((row) => row && typeof row.id === 'string') : [];
},
async myLink(key) {
const answer = await call('marque_points_my_link', { p_key: key });
const status = answer?.status;
if (status === 'ok' && typeof answer.token === 'string') {
return { status, token: answer.token, name: answer.name || '' };
}
return { status: 'none' };
},
async returnWith(token, label = '') {
const answer = await call('marque_points_return', { p_token: token, p_label: label });
const status = answer?.status;
if (status === 'ok' && answer.key && answer.id) {
return { status, key: answer.key, who: answer.who || '', id: answer.id, name: answer.name || '' };
}
return { status: status === 'busy' ? 'busy' : 'unknown' };
},
async calendar(key) {
const answer = await call('marque_points_calendar', { p_key: key });
if (answer?.status === 'ok' && typeof answer.token === 'string') {
return { status: 'ok', token: answer.token, name: answer.name || '' };
}
if (answer?.status === 'account') return { status: 'account' };
return { status: 'unknown' };
},
async forgetCalendar(key) {
const answer = await call('marque_points_forget_calendar', { p_key: key });
return answer?.status === 'ok' ? 'ok' : 'unknown';
},
calendarUrl(token) {
return `${base}/functions/v1/agenda/${encodeURIComponent(token)}.ics`;
},
async forgetLink(key, person) {
const answer = await call('marque_points_forget_link', { p_key: key, p_person: person });
return answer?.status === 'ok' ? 'ok' : 'unknown';
},
async setAdmits(key, id, allow) {
const answer = await call('marque_points_set_admits', {
p_key: key,
p_id: id,
p_allow: Boolean(allow),
});
const status = answer?.status;
return status === 'ok' || status === 'last' ? status : 'unknown';
},
async cutKey(key, id) {
const answer = await call('marque_points_cut_key', { p_key: key, p_id: id });
const status = answer?.status;
return status === 'ok' || status === 'last' ? status : 'unknown';
},
async groupDocs(key) {
const rows = await call('marque_points_group_docs', { p_key: key });
return Array.isArray(rows) ? rows.filter((row) => row && typeof row.id === 'string') : [];
},
async putSet(id, contents, code, key) {
await call('marque_points_put_set', {
p_id: id,
p_data: { kind: 'set', ...contents, createdAt: Date.now() },
p_code: code,
p_key: key,
});
},
async openSet(id, code) {
const answer = await call('marque_points_open_set', { p_id: id, p_code: code });
const status = answer?.status;
if (status === 'ok') return { status, contents: answer.set || null };
if (status === 'wrong') return { status, left: Number(answer.left) || 0 };
if (status === 'locked') return { status };
return { status: 'unknown' };
},
async forgetSet(id, key) {
const answer = await call('marque_points_forget_set', { p_id: id, p_key: key });
return answer?.status === 'ok';
},
async get(id) {
const data = await call('marque_points_get', { p_id: id });
return data && typeof data === 'object' ? data : null;
},
async put(document_, key = null, owner = null) {
const body = { p_id: document_.id, p_data: document_, p_key: key };
await withOwner('marque_points_put', body, owner);
},
async remove(id, key = null, owner = null) {
await withOwner('marque_points_delete', { p_id: id, p_key: key }, owner);
},
async sendCode(email) {
await call('otp', { email: String(email || '').trim(), create_user: true }, null, '/auth/v1/otp');
},
async verifyCode(email, code) {
const answer = await call('verify', { type: 'email', email: String(email || '').trim(), token: String(code || '').trim() }, null, '/auth/v1/verify');
return sessionOf(answer);
},
async refreshSession(refresh) {
const answer = await call('token', { refresh_token: refresh }, null, '/auth/v1/token?grant_type=refresh_token');
return sessionOf(answer);
},
async signOut(token, everywhere = false) {
await call('logout', {}, token, `/auth/v1/logout?scope=${everywhere ? 'global' : 'local'}`);
},
async accountLink(token, key, name = '') {
return call('marque_points_account_link', { p_key: key, p_name: name }, token);
},
async accountOwner(token, id, secret) {
return call('marque_points_account_owner_put', { p_id: id, p_secret: secret }, token);
},
async accountRestore(token, have = [], label = '') {
return call('marque_points_account_restore', { p_have: have, p_label: label }, token);
},
async setAccounts(key, on, token = null) {
const answer = await call('marque_points_set_accounts', { p_key: key, p_on: Boolean(on) }, token);
return answer?.status || 'unknown';
},
async setPeople(key, people) {
const answer = await call('marque_points_set_people', { p_key: key, p_people: people });
return answer?.status === 'ok' && Array.isArray(answer.people) ? answer.people : null;
},
async arcadeScore(key, game, mode, name, score) {
const answer = await call('marque_points_arcade_score', {
p_key: key, p_game: game, p_mode: mode, p_name: name, p_score: Math.round(score),
});
return answer?.status === 'ok' && Array.isArray(answer.top) ? answer.top : null;
},
async arcadeTop(key, game, mode) {
const answer = await call('marque_points_arcade_top', { p_key: key, p_game: game, p_mode: mode });
return Array.isArray(answer) ? answer : [];
},
async accountDelete(token) {
return call('marque_points_account_delete', {}, token);
},
async accountLeave(token, key) {
return call('marque_points_account_leave', { p_key: key }, token);
},
async pushSubscribe(key, { endpoint, p256dh, auth }, lang = 'fr', app = '', tz = '') {
const body = { p_key: key, p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth, p_lang: lang, p_app: app };
if (!tz) return call('marque_points_push_subscribe', body);
try {
return await call('marque_points_push_subscribe', { ...body, p_tz: tz });
} catch (error) {
if (!unknownParameter(error)) throw error;
return call('marque_points_push_subscribe', body);
}
},
async pushUnsubscribe(endpoint) {
await call('marque_points_push_unsubscribe', { p_endpoint: endpoint });
},
async notifier(body) {
return call('notifier', body, null, '/functions/v1/notifier');
},
};
}
function unknownParameter(error) {
return error?.status === 404 && /PGRST202|Could not find the function/.test(error.detail || error.message || '');
}
function sessionOf(answer, now = Date.now()) {
if (!answer?.access_token || !answer?.refresh_token) return null;
return {
access: answer.access_token,
refresh: answer.refresh_token,
expires: now + Math.max(60, Number(answer.expires_in) || 3600) * 1000,
email: answer.user?.email || '',
id: answer.user?.id || '',
};
}
function wasDeleted(error) {
return /document supprime/.test(error?.detail || error?.message || '');
}
function pickNewer(local, remote) {
if (!remote) return 'local';
if (!local) return 'remote';
const a = local.updatedAt || 0;
const b = remote.updatedAt || 0;
if (a === b) return 'same';
return a > b ? 'local' : 'remote';
}
function gameIdFrom(pasted) {
const text = String(pasted || '').trim();
const inLink = text.match(/#\/game\/([A-Za-z0-9_.~:@+-]+)/);
if (inLink) return inLink[1];
return /^[A-Za-z0-9_.~:@+-]{8,128}$/.test(text) ? text : null;
}
function backLink(location, token) {
const { origin, pathname, search } = location;
return `${origin}${pathname}${search}#/back/${token}`;
}
function backTokenFrom(pasted) {
const found = String(pasted || '').trim().match(/#\/back\/([0-9a-f]{32})(?![0-9a-f])/);
return found ? found[1] : null;
}
function doorway(location, page) {
const { origin, pathname, search } = location;
return /\/(index\.html)?$/.test(pathname)
? `${origin}${pathname.replace(/index\.html$/, '')}${page}.html${search}`
: `${origin}${pathname}${search}`;
}
function shareLink(location, gameId) {
return `${doorway(location, 'partie')}#/game/${gameId}`;
}
function listLink(location, listId) {
return `${doorway(location, 'liste')}#/list/${listId}`;
}
function listIdFrom(pasted) {
const found = String(pasted || '').trim().match(/#\/list\/([A-Za-z0-9_.~:@+-]+)/);
return found ? found[1] : null;
}
function pollLink(location, pollId) {
return `${doorway(location, 'sondage')}#/poll/${pollId}/solo`;
}
function pollIdFrom(pasted) {
const found = String(pasted || '').trim().match(/#\/poll\/([A-Za-z0-9_.~:@+-]+)/);
return found ? found[1] : null;
}
function joinLink(location, name, code) {
return `${doorway(location, 'invitation')}#/join/${code}/${encodeURIComponent(name)}`;
}
function joinFrom(pasted) {
const found = String(pasted || '').trim().match(/#\/join\/(\d{6})(?!\d)\/([^\s/?#]+)/);
if (!found) return null;
let name = '';
try {
name = decodeURIComponent(found[2]);
} catch {
name = found[2];
}
return unpunctuate(name) ? { code: found[1], name: unpunctuate(name) } : null;
}
function unpunctuate(name) {
let clean = String(name || '').trim();
let last = '';
const count = (text, character) => text.split(character).length - 1;
while (clean && clean !== last) {
last = clean;
clean = clean.replace(/[.,;:!?\u2026\u00ab\u00bb"'\u2018\u2019\u201c\u201d]+$/, '').trim();
for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
if (clean.endsWith(close) && count(clean, close) > count(clean, open)) {
clean = clean.slice(0, -1).trim();
}
}
}
return clean;
}
function setLink(location, setId) {
const { origin, pathname, search } = location;
return `${origin}${pathname}${search}#/set/${setId}`;
}
function setIdFrom(pasted) {
const found = String(pasted || '').trim().match(/#\/set\/([A-Za-z0-9_.~:@+-]+)/);
return found ? found[1] : null;
}

// ---- src/move.js -----------------------------------------------------
const MOVE_FROM = ['https://wjrnj9zy72-design.github.io/'];
const MOVE_ROUTE = /^#\/move\/([^/]*)(?:\/(.*))?$/;
const MOVE_PREFIX = 'marque-points:';
const MOVE_LEFT = new Set(['marque-points:account:v1', 'marque-points:remote:v1', 'marque-points:moved']);
function moveKept(storage) {
const kept = {};
for (let index = 0; index < storage.length; index += 1) {
const name = storage.key(index);
if (name && name.startsWith(MOVE_PREFIX) && !MOVE_LEFT.has(name)) kept[name] = storage.getItem(name);
}
return kept;
}
function moveEncode(entries) {
let binary = '';
for (const byte of new TextEncoder().encode(JSON.stringify(entries))) binary += String.fromCharCode(byte);
return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function moveDecode(text) {
try {
const binary = atob(String(text).replace(/-/g, '+').replace(/_/g, '/'));
const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
const entries = Object.entries(parsed).filter(([name, value]) => name.startsWith(MOVE_PREFIX) && !MOVE_LEFT.has(name) && typeof value === 'string');
return Object.fromEntries(entries);
} catch {
return null;
}
}
const moveIsObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const moveWithIds = (value) => Array.isArray(value) && value.every((item) => moveIsObject(item) && typeof item.id === 'string');
const moveOfText = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');
function moveFill(here, came) {
if (moveWithIds(here) && moveWithIds(came)) {
const known = new Set(here.map((item) => item.id));
return [...here, ...came.filter((item) => !known.has(item.id))];
}
if (moveOfText(here) && moveOfText(came)) return [...new Set([...here, ...came])];
if (moveIsObject(here) && moveIsObject(came)) {
const filled = { ...here };
for (const [name, value] of Object.entries(came)) {
if (!(name in here)) filled[name] = value;
else if (moveWithIds(here[name]) && moveWithIds(value)) filled[name] = moveFill(here[name], value);
else if (moveIsObject(here[name]) && moveIsObject(value)) filled[name] = { ...value, ...here[name] };
}
return filled;
}
return here;
}
function moveMerge(here, came) {
const writes = {};
for (const [name, value] of Object.entries(came)) {
if (here[name] == null) {
writes[name] = value;
continue;
}
try {
const filled = JSON.stringify(moveFill(JSON.parse(here[name]), JSON.parse(value)));
if (filled !== here[name]) writes[name] = filled;
} catch {
}
}
return writes;
}
function moveCount(entries) {
const count = (name) => {
try {
const value = JSON.parse(entries[name] || 'null');
return Array.isArray(value) ? value.length : 0;
} catch {
return 0;
}
};
let groups = 0;
try {
groups = (JSON.parse(entries['marque-points:prefs:v1'] || 'null')?.groups || []).length;
} catch {
groups = 0;
}
const documents = ['games', 'lists', 'polls', 'spends', 'boards'].reduce((sum, kind) => sum + count(`marque-points:${kind}:v1`), 0);
return { groups, documents };
}
function moveInto(storage, came) {
const here = {};
for (let index = 0; index < storage.length; index += 1) {
const name = storage.key(index);
if (name) here[name] = storage.getItem(name);
}
for (const [name, value] of Object.entries(moveMerge(here, came))) storage.setItem(name, value);
}
function takeMove({ location, history, storage, aside, referrer = '', from = MOVE_FROM }) {
const found = String(location.hash || '').match(MOVE_ROUTE);
if (!found) return null;
const came = moveDecode(found[1]);
let then = '';
try {
then = decodeURIComponent(found[2] || '');
} catch {
then = '';
}
history.replaceState(null, '', `${location.pathname}${location.search}${/^#\//.test(then) ? then : ''}`);
if (!came || !Object.keys(came).length) return { status: 'empty' };
const counts = moveCount(came);
if (!from.some((origin) => String(referrer).startsWith(origin))) {
try {
aside.setItem('marque-points:arriving', JSON.stringify(came));
} catch {
return { status: 'empty' };
}
return { status: 'asking', ...counts };
}
try {
moveInto(storage, came);
} catch {
return { status: 'failed' };
}
return { status: 'moved', ...counts };
}

// ---- src/prefill.js --------------------------------------------------
const PREFILL_FORMS = ['lists/new', 'polls/new', 'spends/new', 'agenda/new'];
const PREFILL_TEXT = 200;
const PREFILL_LINES = 100;
const PREFILL_PEOPLE = 30;
function prefillLinkFrom(pasted) {
const found = String(pasted || '').match(/#\/((?:lists|polls|spends|agenda)\/new)\?([^\s#]*)/);
return found ? `#/${found[1]}?${found[2]}` : null;
}
function withoutPrefill(address) {
return String(address || '').replace(/^(#\/?(?:lists|polls|spends|agenda)\/new)\?.*$/, '$1');
}
function prefillOf(address) {
const found = String(address || '').match(/^#\/?((?:lists|polls|spends|agenda)\/new)\?(.*)$/);
if (!found || !PREFILL_FORMS.includes(found[1])) return null;
let params;
try {
params = new URLSearchParams(found[2]);
} catch {
return null;
}
const text = (key) => (params.get(key) || '').replace(/\s+/g, ' ').trim().slice(0, PREFILL_TEXT);
const lines = (key) =>
(params.get(key) || '')
.split(/\r?\n/)
.map((line) => line.trim().slice(0, PREFILL_TEXT))
.filter(Boolean)
.slice(0, PREFILL_LINES);
const fill = {};
const title = text('titre');
if (title) fill.title = title;
const question = text('question');
if (question) fill.question = question;
for (const [key, name] of [['lignes', 'lines'], ['choix', 'choices']]) {
const value = lines(key);
if (value.length) fill[name] = value;
}
const people = [];
for (const name of (params.get('personnes') || '').split(',')) {
const clean = name.replace(/\s+/g, ' ').trim().slice(0, 60);
if (clean && !people.some((other) => other.toLowerCase() === clean.toLowerCase())) people.push(clean);
}
if (people.length) fill.people = people.slice(0, PREFILL_PEOPLE);
for (const [key, name] of [['jour', 'day'], ['fin', 'until']]) {
const value = text(key);
if (/^\d{4}-\d{2}-\d{2}$/.test(value)) fill[name] = value;
}
const hour = text('heure');
if (/^\d{1,2}:\d{2}$/.test(hour)) fill.hour = hour.padStart(5, '0');
const currency = text('monnaie').toUpperCase();
if (/^[A-Z]{3}$/.test(currency)) fill.currency = currency;
return Object.keys(fill).length ? fill : null;
}

// ---- src/cloud.js ----------------------------------------------------
const COLLECTION = 'games';
function reconcile(local, remote) {
const byId = new Map();
for (const game of remote) if (isValidGame(game)) byId.set(game.id, game);
const toPush = [];
for (const game of local) {
if (!isValidGame(game)) continue;
const stored = byId.get(game.id);
if (!stored || (game.updatedAt || 0) > (stored.updatedAt || 0)) {
byId.set(game.id, game);
toPush.push(game);
}
}
const games = [...byId.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
return { games, toPush };
}
async function connectStore({ getLocalGames, onGames, onLost }) {
const host = globalThis.claude;
if (!host || typeof host.use !== 'function') return null;
let db = null;
try {
db = await host.use('db');
} catch {
return null;
}
if (!db) return null;
const collection = db.collection(COLLECTION);
let firstSnapshot = true;
const save = async (game) => {
if (!isValidGame(game)) return;
try {
await collection.doc(game.id).set(game);
} catch (error) {
if (error?.code === 'revoked') onLost?.();
}
};
const remove = async (id) => {
try {
await collection.doc(id).delete();
} catch (error) {
if (error?.code === 'revoked') onLost?.();
}
};
const stop = collection.onSnapshot(
(snapshot) => {
const remote = snapshot.docs.map((document) => document.data()).filter(isValidGame);
const { games, toPush } = reconcile(getLocalGames(), remote);
onGames(games);
if (firstSnapshot) {
firstSnapshot = false;
void toPush.reduce((chain, game) => chain.then(() => save(game)), Promise.resolve());
}
},
() => onLost?.(),
);
return { save, remove, stop };
}

// ---- src/live.js -----------------------------------------------------
const HEARTBEAT_EVERY = 25000;
const SILENT_AFTER = 60000;
const REJOIN_AFTER = 30000;
const RETRY_AFTER = [1000, 2000, 5000, 10000, 30000, 60000];
function liveUrl(config) {
if (!config || !config.url || !config.key) return '';
const origin = String(config.url).replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(origin)) return '';
return `${origin.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(config.key)}&vsn=1.0.0`;
}
function docTopic(id) {
return `doc-${id}`;
}
function groupTopic(channel) {
return `group-${channel}`;
}
function joinMessage(topic, ref, key) {
return {
topic: `realtime:${topic}`,
event: 'phx_join',
payload: {
config: {
broadcast: { ack: false, self: false },
presence: { key: '', enabled: false },
postgres_changes: [],
private: false,
},
access_token: key,
},
ref,
join_ref: ref,
};
}
function readMessage(raw) {
let message = null;
try {
message = typeof raw === 'string' ? JSON.parse(raw) : null;
} catch {
return null;
}
if (!message || typeof message.topic !== 'string' || !message.topic.startsWith('realtime:')) return null;
const topic = message.topic.slice('realtime:'.length);
if (message.event === 'phx_reply') {
const ok = message.payload?.status === 'ok';
return { kind: ok ? 'joined' : 'refused', topic, ref: message.ref ?? null };
}
if (message.event === 'phx_error' || message.event === 'phx_close') return { kind: 'refused', topic, ref: null };
if (message.event === 'broadcast') return { kind: 'changed', topic };
return null;
}
function createLive({
url, key, onChange, WebSocketImpl = globalThis.WebSocket,
setTimer = setTimeout, clearTimer = clearTimeout, every = setInterval, stopEvery = clearInterval,
now = () => Date.now(),
}) {
if (!url || typeof WebSocketImpl !== 'function') return null;
let socket = null;
let open = false;
let heartbeat = null;
let retry = null;
let failures = 0;
let counter = 0;
let wanted = new Set();
let channels = new Map();
let lastHeard = 0;
const heardBefore = new Set();
const asked = new Map();
const send = (message) => {
if (!open) return;
try {
socket.send(JSON.stringify(message));
} catch {
}
};
const nextRef = () => String(++counter);
const join = (topic) => {
const ref = nextRef();
channels.set(topic, { ref, joined: false, refusedAt: null });
send(joinMessage(topic, ref, key));
};
const silent = () => now() - lastHeard >= SILENT_AFTER;
const abandon = () => {
const dead = socket;
socket = null;
drop();
try {
dead?.close();
} catch {
}
schedule();
};
const tick = () => {
if (silent()) {
abandon();
return;
}
send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: nextRef() });
for (const [topic, channel] of channels) {
if (!channel.joined && channel.refusedAt !== null && now() - channel.refusedAt >= REJOIN_AFTER && wanted.has(topic)) join(topic);
}
};
const leave = (topic) => {
const channel = channels.get(topic);
channels.delete(topic);
if (channel) send({ topic: `realtime:${topic}`, event: 'phx_leave', payload: {}, ref: nextRef(), join_ref: channel.ref });
};
const drop = () => {
open = false;
channels = new Map();
if (heartbeat) stopEvery(heartbeat);
heartbeat = null;
};
const schedule = () => {
if (retry || !wanted.size) return;
const wait = RETRY_AFTER[Math.min(failures, RETRY_AFTER.length - 1)];
failures += 1;
retry = setTimer(() => {
retry = null;
connect();
}, wait);
};
function connect() {
if (socket || !wanted.size) return;
let created = null;
try {
created = new WebSocketImpl(url);
} catch {
schedule();
return;
}
socket = created;
created.onopen = () => {
if (socket !== created) return;
open = true;
failures = 0;
lastHeard = now();
for (const topic of wanted) join(topic);
heartbeat = every(tick, HEARTBEAT_EVERY);
};
created.onmessage = (event) => {
if (socket !== created) return;
lastHeard = now();
const heard = readMessage(event?.data);
if (!heard) return;
const channel = channels.get(heard.topic);
if (!channel) return;
if (heard.kind === 'joined' && heard.ref === channel.ref) {
channel.joined = true;
if (heardBefore.has(heard.topic)) onChange(heard.topic);
heardBefore.add(heard.topic);
}
else if (heard.kind === 'refused') {
channel.joined = false;
channel.refusedAt = now();
}
else if (heard.kind === 'changed' && channel.joined) onChange(heard.topic);
};
created.onclose = () => {
if (socket !== created) return;
socket = null;
drop();
schedule();
};
created.onerror = () => {
};
}
return {
watch(topics) {
const next = new Set(topics.filter(Boolean));
for (const topic of [...channels.keys()]) if (!next.has(topic)) leave(topic);
if (open) for (const topic of next) if (!channels.has(topic)) join(topic);
wanted = next;
if (!wanted.size) {
this.stop();
return;
}
connect();
},
covers(topic) {
return open && !silent() && Boolean(channels.get(topic)?.joined);
},
quiet(topic, every_ = 60000) {
if (!this.covers(topic)) return false;
const last = asked.get(topic);
if (last !== undefined && now() - last < every_) return true;
asked.set(topic, now());
return false;
},
wake() {
if (open && now() - lastHeard >= HEARTBEAT_EVERY + 10000) abandon();
if (retry) {
clearTimer(retry);
retry = null;
}
failures = 0;
connect();
},
stop() {
wanted = new Set();
if (retry) clearTimer(retry);
retry = null;
const closing = socket;
socket = null;
drop();
try {
closing?.close();
} catch {
}
},
};
}

// ---- src/notify.js ---------------------------------------------------
const NEWS_KINDS = new Set(['poll', 'list', 'spend', 'board']);
function pushSupport({ worker, push, notification, permission, phone, standalone }) {
if (worker && push && notification) return permission === 'denied' ? 'denied' : 'ready';
if (phone === 'ios' && !standalone) return 'install';
return 'unsupported';
}
function mayBeNews(document_) {
return Boolean(document_ && typeof document_.id === 'string' && NEWS_KINDS.has(document_.kind) && !document_.linkOnly);
}
function toldKey(document_) {
return `${document_.id}|${document_.kind === 'poll' && document_.date ? document_.date : ''}`;
}
function wordsKey(document_, now = Date.now()) {
if (!['poll', 'board'].includes(document_?.kind)) return null;
const latest = latestWords(document_);
return latest > now - 2 * 86400000 ? `${document_.id}|words|${latest}` : null;
}
function rememberTold(told, key, limit = 400) {
return [...told.filter((one) => one !== key), key].slice(-limit);
}
function mayAskReminders(lastAsked, now = new Date()) {
const hour = now.getHours();
return hour >= 18 && hour <= 22 && !(Number(lastAsked) > now.getTime() - 3600000);
}
function subscriptionFields(json) {
const endpoint = typeof json?.endpoint === 'string' ? json.endpoint : '';
const p256dh = typeof json?.keys?.p256dh === 'string' ? json.keys.p256dh : '';
const auth = typeof json?.keys?.auth === 'string' ? json.keys.auth : '';
return endpoint && p256dh && auth ? { endpoint, p256dh, auth } : null;
}
function keyBytes(text) {
const plain = String(text || '').replace(/-/g, '+').replace(/_/g, '/');
const padded = plain + '='.repeat((4 - (plain.length % 4)) % 4);
return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}
function activationProblem(step, met = null, answers = true) {
if (step === 'worker') return 'worker';
if (step === 'key') {
const status = Number(met?.status) || 0;
if (!status) return answers ? 'function' : 'offline';
return status === 502 ? 'database' : 'function';
}
if (step === 'subscribe') return met?.name === 'NotAllowedError' ? 'denied' : 'browser';
if (step === 'register') {
const said = Array.isArray(met) ? met : [];
if (said.length && said.every((one) => one?.status === 'account')) return 'account';
if (said.length && said.every((one) => one instanceof Error && !one.status)) return 'offline';
return 'refused';
}
return 'failed';
}
function problemDetail(error) {
if (!error) return '';
if (!(error instanceof Error) && typeof error.status === 'string') return error.status;
const name = error.name && error.name !== 'Error' ? `${error.name}: ` : '';
return `${name}${error.message || ''}`.replace(/\s+/g, ' ').trim().slice(0, 160);
}

// ---- src/swipe.js ----------------------------------------------------
const SWIPE_OPEN = 96;
function swipeHtml(id, inner, { kind, tag = 'div', bodyClass = '' } = {}) {
return `
    <${tag} class="swipe" data-swipe="${escapeHtml(id)}" data-swipe-kind="${escapeHtml(kind)}">
      <button type="button" class="swipe__delete" data-swipe-delete tabindex="-1" aria-hidden="true">
        ${escapeHtml(t('action.delete'))}
      </button>
      <div class="swipe__body ${bodyClass}">${inner}</div>
    </${tag}>`;
}
function swipeable(cardHtml, canDelete = () => true) {
return (document_) =>
canDelete(document_) ? swipeHtml(document_.id, cardHtml(document_), { kind: 'doc' }) : cardHtml(document_);
}
const UNDO_KEPT = 5000;
let pending = null;
function commitPendingDelete() {
if (!pending) return;
const { onDelete, id, timer } = pending;
pending = null;
clearTimeout(timer);
document.getElementById('undo-toast')?.remove();
onDelete(id);
}
function hideRow(row) {
row.hidden = true;
}
function offerUndo(kind, id, onDelete, said, row) {
commitPendingDelete();
hideRow(row);
pending = { kind, id, onDelete, timer: setTimeout(commitPendingDelete, UNDO_KEPT) };
const toast = document.createElement('div');
toast.id = 'undo-toast';
toast.className = 'toast';
toast.setAttribute('role', 'status');
toast.innerHTML = `<span>${escapeHtml(said)}</span>
    <button type="button" class="toast__action" data-undo>${escapeHtml(t('action.undoDelete'))}</button>`;
toast.querySelector('[data-undo]').addEventListener('click', () => {
if (!pending) return;
clearTimeout(pending.timer);
pending = null;
toast.remove();
view.querySelectorAll(`[data-swipe-kind="${kind}"]`).forEach((other) => {
if (other.dataset.swipe === id) other.hidden = false;
});
});
document.body.append(toast);
}
document.addEventListener('visibilitychange', () => {
if (document.visibilityState === 'hidden') commitPendingDelete();
});
function bindSwipes(kind, onDelete, { undo = '' } = {}) {
view.querySelectorAll(`[data-swipe-kind="${kind}"]`).forEach((row) => {
if (pending && pending.kind === kind && pending.id === row.dataset.swipe) hideRow(row);
const body = row.querySelector('.swipe__body');
const button = row.querySelector('[data-swipe-delete]');
let start = null;
let offset = 0;
let moved = false;
let open = false;
const place = (x, animate) => {
offset = x;
body.style.transition = animate ? 'transform 0.18s ease' : 'none';
body.style.transform = x ? `translateX(${x}px)` : '';
};
const settle = (wanted) => {
open = wanted;
place(open ? -SWIPE_OPEN : 0, true);
row.classList.toggle('swipe--open', open);
button.tabIndex = open ? 0 : -1;
button.setAttribute('aria-hidden', open ? 'false' : 'true');
};
body.addEventListener('pointerdown', (event) => {
if (event.pointerType === 'mouse' && event.button !== 0) return;
start = { x: event.clientX, y: event.clientY, from: open ? -SWIPE_OPEN : 0 };
moved = false;
});
body.addEventListener('pointermove', (event) => {
if (!start) return;
const dx = event.clientX - start.x;
const dy = event.clientY - start.y;
if (!moved) {
if (Math.abs(dx) < 8) return;
if (Math.abs(dy) > Math.abs(dx)) {
start = null;
return;
}
moved = true;
body.setPointerCapture?.(event.pointerId);
}
place(Math.min(0, Math.max(-row.clientWidth * 0.6, start.from + dx)), false);
});
const end = () => {
if (!start) return;
start = null;
if (moved) settle(offset < -SWIPE_OPEN / 2);
};
body.addEventListener('pointerup', end);
body.addEventListener('pointercancel', end);
body.addEventListener('click', (event) => {
if (!moved && !open) return;
event.preventDefault();
event.stopPropagation();
if (!moved) settle(false);
moved = false;
}, true);
button.addEventListener('click', () => {
if (undo) offerUndo(kind, row.dataset.swipe, onDelete, undo, row);
else onDelete(row.dataset.swipe);
});
});
}
const PULL_FAR = 72;
function bindPullToRefresh() {
const installed = () =>
matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let start = null;
let pulled = 0;
let mark = null;
const show = (distance) => {
if (!mark) {
mark = document.createElement('div');
mark.className = 'pull';
mark.setAttribute('aria-hidden', 'true');
mark.innerHTML = '<span class="pull__arrow">↻</span>';
document.body.append(mark);
}
const shown = Math.min(distance, PULL_FAR * 1.4);
mark.style.transform = `translate(-50%, ${shown * 0.8}px) rotate(${shown * 4}deg)`;
mark.style.opacity = String(Math.min(1, shown / PULL_FAR));
mark.classList.toggle('pull--ready', distance >= PULL_FAR);
};
const hide = () => {
mark?.remove();
mark = null;
};
document.addEventListener('touchstart', (event) => {
start = null;
pulled = 0;
if (!installed() || event.touches.length !== 1 || window.scrollY > 0) return;
const sync = document.getElementById('sync');
if (!sync || sync.hidden || sync.disabled || document.body.classList.contains('playing')) return;
if (event.target.closest('canvas, dialog, input, textarea, select, .swipe, [data-no-pull]')) return;
start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
}, { passive: true });
document.addEventListener('touchmove', (event) => {
if (!start) return;
const dx = event.touches[0].clientX - start.x;
const dy = event.touches[0].clientY - start.y;
if (window.scrollY > 0 || dy < 0 || (pulled === 0 && Math.abs(dx) > Math.abs(dy))) {
start = null;
hide();
return;
}
pulled = dy;
if (pulled > 12) show(pulled - 12);
}, { passive: true });
const end = () => {
if (!start) return;
start = null;
const far = pulled - 12 >= PULL_FAR;
hide();
if (far) document.getElementById('sync')?.click();
};
document.addEventListener('touchend', end);
document.addEventListener('touchcancel', () => {
start = null;
hide();
});
}

// ---- src/view-polls.js -----------------------------------------------
function pollTitle(poll) {
return poll.question || t('polls.untitled');
}
const VOTE_MARK = { yes: '✓' };
function cardWhenText(poll) {
if (poll.date) {
const settled = t(poll.until ? 'polls.settledRange' : 'polls.settledOn', { day: whenText(poll) });
return settled.charAt(0).toUpperCase() + settled.slice(1);
}
if (poll.closedAt) return formatDate(poll.closedAt);
const count = poll.options.length;
if (!count) return formatDate(poll.updatedAt);
const days = poll.options.filter((option) => isDayChoice(option, poll.createdAt)).length;
return t(days === count ? 'polls.daysOffered' : 'polls.choicesOffered', { count });
}
function answeredDotsHtml(answered, total) {
if (!total) return '';
const dots = Math.min(total, 8);
const filled = total <= 8 ? answered : Math.round((answered / total) * 8);
return `<span class="dots" aria-hidden="true">${Array.from({ length: dots }, (_, index) => `<i class="${index < filled ? 'dots__on' : ''}"></i>`).join('')}</span>`;
}
function pollCardHtml(poll) {
const { answered, leaders, ranked } = tally(poll);
const leading = ranked.find((row) => leaders.includes(row.option.id));
return `
    <button type="button" class="game-card" data-goto="#/poll/${escapeHtml(poll.id)}">
      <span class="game-card__title">
        ${escapeHtml(pollTitle(poll))}
        ${poll.forActivity ? `<span class="pill pill--activity">🎯 ${escapeHtml(t('activity.pollPill'))}</span>` : ''}
        <span class="pill ${poll.closedAt ? 'pill--done' : ''}">
          ${poll.closedAt ? '' : answeredDotsHtml(answered, poll.people.length)}
          ${escapeHtml(poll.closedAt ? t('polls.closed') : t('polls.answered', { count: answered, total: poll.people.length }))}
        </span>
      </span>
      ${
leading
? `<span class="game-card__meta">${escapeHtml(
t('polls.leading', { option: choiceLabel(leading.option), count: leading.yes }),
)}</span>`
: `<span class="game-card__meta">${escapeHtml(t('polls.noAnswerYet'))}</span>`
}
      <span class="game-card__meta">
        ${escapeHtml(cardWhenText(poll))}
      </span>
      ${talkSumHtml(poll)}
      ${eventTagHtml(poll)}
    </button>`;
}
function pollsView() {
const sorted = [...shownDocs(state.polls).filter((poll) => !isEvent(poll))].sort((a, b) => b.updatedAt - a.updatedAt);
const live = sorted.filter(isLive);
const open = live.filter((poll) => !poll.closedAt);
const closed = live.filter((poll) => poll.closedAt);
return `
    ${flashHtml()}
    ${kindsHtml('polls')}
    ${newButtonHtml('#/polls/new', t('polls.new'), live.length > 0)}
    ${groupChipsHtml()}

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('kinds.ongoing'))}</h2></div>
      ${
open.length
? `<div class="game-list">${open.map(swipeable(pollCardHtml, isOrganiser)).join('')}</div>`
: hintHtml('polls', t('polls.none'))
}
      ${hiddenByGroupHtml(state.polls)}
    </section>
    ${open.length && live.length <= 2 ? hintHtml('polls', t('hint.polls')) : ''}

    ${
closed.length
? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('polls.done'))}</h2></div>
             <div class="game-list">${closed.map(swipeable(pollCardHtml, isOrganiser)).join('')}</div>
           </section>`
: ''
}

    ${archivedHtml(sorted, swipeable(pollCardHtml, isOrganiser))}`;
}
function newPollView() {
const suggestions = [...new Set([myName(), ...recentPeople(state.polls), ...recentPeople(state.lists), ...recentNames(state.games)].filter(Boolean))].filter((name) => !writtenNames(state.newPollPeople).has(name.toLowerCase())).slice(0, 12);
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/polls')}
      <h1>${escapeHtml(t('polls.new'))}</h1>
    </div>

    <form id="new-poll" class="card stack">
      <label>
        ${escapeHtml(t('polls.question'))}
        <input type="text" id="poll-question" placeholder="${escapeHtml(t('polls.questionPlaceholder'))}"
               value="${escapeHtml(state.newPollQuestion)}" required />
      </label>

      <label>
        ${escapeHtml(t('polls.choices'))}
        <textarea id="poll-choices" rows="5" placeholder="${escapeHtml(t('polls.choicesPlaceholder'))}">${escapeHtml(state.newPollChoices)}</textarea>
      </label>
      ${newPollDaysHtml()}

      ${rosterPickHtml(state.newPollPeople, t('polls.peopleHint')) || `
      <div class="stack stack--tight">
        <span class="muted small">${escapeHtml(t('polls.peopleHint'))}</span>
        ${state.newPollPeople
.map(
(name, index) => `
              <input type="text" data-person-index="${index}" value="${escapeHtml(name)}"
                     placeholder="${escapeHtml(t('lists.person', { n: index + 1 }))}"
                     aria-label="${escapeHtml(t('lists.person', { n: index + 1 }))}" />`,
)
.join('')}
        <div class="row">
          <button type="button" class="button button--small" id="add-person">+ ${escapeHtml(t('lists.addPerson'))}</button>
          ${
state.newPollPeople.length > 1
? `<button type="button" class="button button--small button--ghost" id="drop-person">− ${escapeHtml(t('lists.dropPerson'))}</button>`
: ''
}
        </div>
        ${
suggestions.length
? `<div class="row">${suggestions
.map((name) => `<button type="button" class="chip" data-suggest="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
.join('')}</div>`
: ''
}
      </div>`}

      <label class="checkbox">
        <input type="checkbox" id="poll-for-activity" ${state.newPollForActivity ? 'checked' : ''} />
        <span>🎯 ${escapeHtml(t('activity.pollMark'))}</span>
      </label>

      ${willBeInHtml()}
      <button type="submit" class="button button--primary button--block">${escapeHtml(t('polls.create'))}</button>
    </form>`;
}
const GAUGE_FROM = 4;
function gaugeHtml(poll) {
const total = poll.people.length;
if (total < GAUGE_FROM) return '';
const { ranked, leaders } = tally(poll);
if (!total || !ranked.some((row) => row.yes > 0)) return '';
return `
    <section class="gauge" aria-labelledby="gauge-title">
      <h2 id="gauge-title" class="gauge__title">${escapeHtml(t('polls.gauge'))}</h2>
      <ol class="gauge__rows">
        ${ranked
.map((row) => {
const share = Math.round((row.yes / total) * 100);
const lead = leaders.includes(row.option.id);
const said = t('polls.countLine', { yes: row.yes, total });
return `
              <li class="gauge__row ${lead ? 'gauge__row--lead' : ''}" title="${escapeHtml(`${choiceLabel(row.option)} — ${said}`)}">
                <span class="gauge__label">${lead ? leadMark() : ''}${escapeHtml(choiceLabel(row.option))}</span>
                <span class="gauge__track" aria-hidden="true">
                  <span class="gauge__fill" style="width: ${share}%"></span>
                </span>
                <span class="gauge__count">
                  <span aria-hidden="true">${row.yes}/${total}</span>
                  <span class="visually-hidden">${escapeHtml(said)}</span>
                </span>
              </li>`;
})
.join('')}
      </ol>
    </section>`;
}
function voterOf(poll) {
const chosen = state.prefs.voter?.[poll.id];
if (poll.people.some((person) => person.id === chosen)) return chosen;
const mine = sameName(myNameFor(poll));
return (mine && poll.people.find((person) => sameName(person.name) === mine)?.id) || null;
}
function pollView(poll, { solo = false } = {}) {
const me = voterOf(poll);
const guest = solo || !isOrganiser(poll);
const { rows, leaders, answered } = tally(poll);
const closed = Boolean(poll.closedAt);
const fixed = isEvent(poll);
const locked = !me && !closed;
const cellHtml = (option, person) => {
const yes = voteOf(poll, person.id, option.id) === 'yes';
const others = Boolean(me) && person.id !== me;
return `
      <td class="${person.id === me ? 'votes__mine' : ''}">
        <button type="button" class="vote ${yes ? 'vote--yes' : 'vote--none'} ${others ? 'vote--other' : ''} ${locked ? 'vote--locked' : ''}"
                data-vote="${escapeHtml(person.id)}|${escapeHtml(option.id)}" ${closed || others ? 'disabled' : ''}
                ${locked ? 'aria-disabled="true"' : ''}
                aria-pressed="${yes ? 'true' : 'false'}"
                aria-label="${escapeHtml(`${person.name} — ${choiceLabel(option)}`)}">
          ${yes ? VOTE_MARK.yes : ''}
        </button>
      </td>`;
};
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${solo ? '' : backButtonHtml(pollHome(poll))}
      <div>
        <h1>${escapeHtml(pollTitle(poll))}</h1>
        <p class="muted small">
          ${
fixed
? escapeHtml(poll.people.map((person) => person.name).join(' · ') || t('events.nobody'))
: `${escapeHtml(t('polls.answered', { count: answered, total: poll.people.length }))}
                 ${closed ? ` · ${escapeHtml(t('polls.closed'))}` : ''}`
}
          ${poll.shared && !guest ? ` · ${escapeHtml(t('lists.sharedMark'))}` : ''}
        </p>
        ${poll.date ? `<p class="event-when"><strong>${escapeHtml(whenText(poll, { long: true }))}</strong></p>` : ''}
        ${signedByHtml(poll)}
      </div>
    </div>

    ${isEventDoc(poll) ? talkHtml(poll, '', { title: pollTitle(poll), said: true }) : ''}

    ${guest ? '' : eventLinkHtml(poll)}

    ${solo ? '' : activityHeadHtml(poll)}

    ${guest ? '' : pollFlowsHtml(poll)}

    ${guest ? '' : pollActivitiesHtml(poll)}

    ${guest ? '' : inGroupHtml(poll)}

    ${guest ? '' : shareBarHtml(`
      ${state.remote ? `<button type="button" class="button button--primary" id="poll-share">${escapeHtml(t(isActivity(poll, everything()) ? 'activity.share' : fixed || poll.date ? 'events.share' : 'polls.share'))}</button>` : ''}
      ${state.remote && !fixed && !closed && answered < poll.people.length && poll.options.length
? `<button type="button" class="button" id="poll-nudge">${escapeHtml(t('polls.nudge'))}</button>`
: ''}`)}

    ${
poll.people.length && !fixed
? `<div class="row iam ${locked ? 'iam--needed' : ''}" data-iam>
             <span class="muted small">${escapeHtml(t('polls.iAm'))}</span>
             ${poll.people
.map(
(person) => `<button type="button" class="chip ${person.id === me ? 'chip--on' : ''}" data-me="${escapeHtml(person.id)}">${escapeHtml(person.name)}</button>`,
)
.join('')}
           </div>`
: ''
}

    ${guest && !closed ? soloJoinHtml(poll, solo) : ''}

    ${
solo ? '' : eventHtml(poll, { guest })
}
    ${solo || (!poll.date && !isActivity(poll, everything())) ? '' : eventNewsHtml(poll)}

    ${guest ? soloDateHtml(poll) : poll.date || fixed ? dateCardHtml(poll, fixed) : ''}

    ${fixed ? '' : gaugeHtml(poll)}

    ${guest || poll.date || fixed || hasOptionDays(poll) ? '' : retainHtml(poll)}

    ${
fixed
? ''
: poll.options.length && poll.people.length
? `<div class="table-wrap table-wrap--flush" data-keep-scroll="poll-${escapeHtml(poll.id)}">
             <table class="votes">
               <thead>
                 <tr>
                   <th>${escapeHtml(t('polls.choice'))}</th>
                   ${poll.people.map((person) => `<th class="${person.id === me ? 'votes__mine' : ''}">${escapeHtml(person.name)}</th>`).join('')}
                   <th>${escapeHtml(t('polls.count'))}</th>
                 </tr>
               </thead>
               <tbody>
                 ${gridRows(poll, rows)
.map(
(row) => row.day !== undefined ? `
                       <tr class="votes__day">
                         <th scope="rowgroup">${escapeHtml(row.day ? formatDayLong(row.day) : t('polls.anyDay'))}</th>
                         <td colspan="${poll.people.length + 1}"></td>
                       </tr>` : `
                       <tr class="${leaders.includes(row.option.id) ? 'votes__leader' : ''}">
                         <th scope="row">
                           ${leaders.includes(row.option.id) ? leadMark() : ''}
                           ${
guest
? `${dayMark(poll, row.option)}${escapeHtml(rowLabel(poll, row.option))}${
ownsChoice(row.option) && !closed
? ` <button type="button" class="button button--small button--ghost choice-drop"
                                                 data-drop-option="${escapeHtml(row.option.id)}"
                                                 aria-label="${escapeHtml(t('polls.dropMine', { choice: choiceLabel(row.option) }))}">✕</button>`
: ''
}`
: `<button type="button" class="line__text" data-option="${escapeHtml(row.option.id)}">${dayMark(poll, row.option)}${escapeHtml(rowLabel(poll, row.option))}</button>`
}
                         </th>
                         ${poll.people.map((person) => cellHtml(row.option, person)).join('')}
                         <td class="votes__score">${row.yes}</td>
                       </tr>`,
)
.join('')}
               </tbody>
             </table>
           </div>
           ${
locked
? `<p class="small poll-ask">${escapeHtml(t('polls.pickFirst'))}</p>`
: `<p class="muted small">${escapeHtml(
me && !closed
? t('polls.answeringAs', { name: poll.people.find((person) => person.id === me)?.name || '' })
: t('polls.tapHint'),
)}</p>`
}`
: `<p class="muted small">${escapeHtml(poll.people.length ? t('polls.addChoices') : t('polls.addPeople'))}</p>`
}

    ${isEventDoc(poll) ? '' : choicesTalkHtml(poll)}

    ${
closed || (guest && (fixed || poll.date))
? ''
: addChoiceHtml(poll)
}

    ${
guest || poll.date || fixed || poll.whenFor || hasOptionDays(poll) || pollDay(poll) ? '' : `<details class="details" id="poll-date-by-hand">
      <summary>${escapeHtml(t('polls.dateByHand'))}</summary>
      ${dateCardHtml(poll, fixed)}
    </details>`}

    ${poll.date ? '' : attachedHtml(poll)}

    ${guest ? '' : actionsHtml(`
        <button type="button" class="button button--small" id="poll-people">${escapeHtml(t('lists.people'))}</button>
        <button type="button" class="button button--small" id="poll-text">${escapeHtml(t('action.recap'))}</button>
        ${
fixed
? ''
: `<button type="button" class="button button--small" id="poll-close">
                 ${escapeHtml(closed ? t('polls.reopen') : t('polls.close'))}
               </button>`
}
`, `
        <button type="button" class="button button--small button--ghost" id="poll-rename">${escapeHtml(t(fixed ? 'events.rename' : 'polls.rename'))}</button>
        ${fixed || poll.whenFor ? '' : `<button type="button" class="button button--small button--ghost" id="poll-for-activity-toggle">🎯 ${escapeHtml(t(poll.forActivity ? 'activity.pollUnmark' : 'activity.pollMark'))}</button>`}
        <button type="button" class="button button--small button--ghost" id="poll-sign">${escapeHtml(t('sign.edit'))}</button>
        ${chainButtonsHtml(poll)}
        <button type="button" class="button button--small button--ghost" id="poll-archive">
          ${escapeHtml(poll.archivedAt ? t('archive.back') : t('archive.put'))}
        </button>
        <button type="button" class="button button--small button--ghost" id="poll-delete">${escapeHtml(t('action.delete'))}</button>`)}`;
}
function choicesTalkHtml(poll) {
if (!poll.options.length) return '';
return `
    <section class="section" aria-labelledby="talk-choices">
      <div class="section__head"><h2 id="talk-choices">${escapeHtml(t('talk.choices'))}</h2></div>
      <div class="talk-lines">
        ${poll.options.map((option) => `
          <div class="talk-line">
            <span class="talk-line__what">${escapeHtml(choiceLabel(option))}</span>
            ${talkHtml(poll, option.id, { title: choiceLabel(option) })}
          </div>`).join('')}
      </div>
    </section>`;
}
function shareBarHtml(buttons) {
return buttons.trim() ? `<div class="row share-bar">${buttons}</div>` : '';
}
function actionsHtml(everyday, rare) {
return `
    <section class="section actions">
      <div class="row">${everyday}</div>
      <details class="details actions__more">
        <summary>${escapeHtml(t('actions.more'))}</summary>
        <div class="row">${rare}</div>
      </details>
    </section>`;
}
function dateCardHtml(poll, fixed) {
return `<section class="card stack stack--tight">
      <div class="section__head">
        <h2>${escapeHtml(t(fixed ? 'events.date' : 'polls.date'))}</h2>
        ${poll.date ? `<span class="pill">${escapeHtml(whenText(poll))}</span>` : ''}
      </div>
      <p class="muted small">${escapeHtml(t(fixed ? 'events.dateHint' : 'polls.dateHint'))}</p>
      <div class="row">
        <label class="visually-hidden" for="poll-day">${escapeHtml(t('polls.date'))}</label>
        <input type="date" id="poll-day" value="${escapeHtml(poll.date || '')}" />
        <label class="visually-hidden" for="poll-hour">${escapeHtml(t('polls.hour'))}</label>
        <input type="time" id="poll-hour" value="${escapeHtml(poll.at || '')}" />
      </div>
      <label class="small">
        ${escapeHtml(t('events.until'))}
        <input type="date" id="poll-until" value="${escapeHtml(poll.until || '')}" />
      </label>
      <div class="row">
        <label class="visually-hidden" for="poll-title">${escapeHtml(t('polls.eventName'))}</label>
        <input type="text" id="poll-title" value="${escapeHtml(eventName(poll))}"
               placeholder="${escapeHtml(t('polls.eventNamePlaceholder'))}" />
        <button type="button" class="button" id="poll-date-save">${escapeHtml(t('action.save'))}</button>
      </div>
      ${
poll.date
? `<div class="row">
               <button type="button" class="button button--small" id="poll-ics">${escapeHtml(t('agenda.add'))}</button>
             </div>`
: ''
}
    </section>`;
}
function choiceDaysEvent(poll) {
if (isEvent(poll) || poll.whenFor) return null;
const event = topEventOf(poll, everything());
return event && eventDays(event).length > 1 ? event : null;
}
const pickedDays = {};
const pickedHours = {};
function choiceLabel(option) {
const words = choiceText(option, getLanguage());
const day = optionDay(option);
if (!day || isDayChoice(option)) return words;
return `${words} · ${[formatDayLong(day), option.at].filter(Boolean).join(' ')}`;
}
const leadMark = () => `<svg class="crown" viewBox="0 0 24 24" role="img" aria-label="${escapeHtml(t('polls.ahead'))}"><path d="M4 18 3 8l5 4 4-7 4 7 5-4-1 10z"/></svg>`;
const DAY_ICON = '<svg class="icon-inline" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>';
const HOUR_ICON = '<svg class="icon-inline" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/></svg>';
const dayMark = (poll, option) => (dayOfOption(poll, option) ? `<span class="choice-day" aria-hidden="true">${DAY_ICON}</span>` : '');
function rowLabel(poll, option) {
if (hasOptionDays(poll) && optionDay(option) && !isDayChoice(option)) return [option.text, option.at].filter(Boolean).join(' · ');
return choiceText(option, getLanguage());
}
function gridRows(poll, rows) {
if (!hasOptionDays(poll)) return rows;
const byOption = new Map(rows.map((row) => [row.option.id, row]));
return optionsByDay(poll).flatMap(({ day, options }) => [{ day }, ...options.map((option) => byOption.get(option.id))]);
}
function addChoiceHtml(poll) {
const event = choiceDaysEvent(poll);
const day = event ? pollDay(poll) || '' : pickedDays[poll.id] || '';
const hour = pickedHours[poll.id] || '';
return `
    <form id="add-choice" class="card stack stack--tight">
      <label class="visually-hidden" for="new-choice">${escapeHtml(t('polls.addChoice'))}</label>
      <div class="row row--tight">
        <input type="text" id="new-choice" placeholder="${escapeHtml(t(seeksDay(poll) ? 'polls.dayPlaceholder' : 'polls.otherPlaceholder'))}" autocomplete="off" />
        <button type="submit" class="button button--primary" aria-label="${escapeHtml(t('polls.addChoice'))}">+</button>
      </div>
      ${
event
? `<div class="row row--tight">
               <span class="small" id="poll-on-day">${DAY_ICON}${escapeHtml(day ? t('polls.onDay', { day: formatDayLong(day) }) : t('polls.wholeEvent'))}</span>
               ${isOrganiser(poll) ? `<button type="button" class="button button--small button--ghost" id="poll-change-day">${escapeHtml(t('polls.changeDay'))}</button>` : ''}
             </div>`
: `<label class="small add-day">
               <span>${DAY_ICON}${escapeHtml(t('polls.pickDay'))}</span>
               <input type="date" id="new-choice-day" value="${escapeHtml(day)}" />
             </label>`
}
      ${
event && !day
? ''
: `<label class="small add-day">
               <span>${HOUR_ICON}${escapeHtml(t('polls.pickHour'))}</span>
               <input type="time" id="new-choice-at" value="${escapeHtml(day ? hour : '')}" ${day ? '' : 'disabled'} />
             </label>`
}
    </form>`;
}
function dayOfOption(poll, option) {
return isDayChoice(option, poll.createdAt) ? choiceWhen(option, poll.createdAt) : null;
}
function retainHtml(poll) {
const { rows, leaders } = tally(poll);
const kept = rows
.filter((row) => leaders.includes(row.option.id))
.map((row) => ({ row, day: dayOfOption(poll, row.option) }))
.filter(({ day }) => day);
if (!kept.length) return '';
const total = poll.people.length;
return `
    <section class="card stack stack--tight retain">
      <p class="small">${escapeHtml(
kept.length > 1 ? t('polls.retainTie') : t('polls.retainHint', { choice: choiceLabel(kept[0].row.option), yes: kept[0].row.yes, total }),
)}</p>
      <div class="row">
        ${kept
.map(
({ row, day }) => `<button type="button" class="button button--primary" data-retain="${escapeHtml(row.option.id)}">
                ${escapeHtml(t('polls.retain', { day: formatDayLong(day.date) }))}
              </button>`,
)
.join('')}
      </div>
    </section>`;
}
function eventHtml(poll, { guest }) {
const activity = isActivity(poll, everything());
if (!poll.date && !activity) return '';
const parts = eventParts(poll, state);
const { list, spend } = parts;
if (guest && !partsCount(parts)) return '';
const day = formatDay(poll.date);
const kind = (label, documents, cardHtml) =>
documents.length
? `<span class="muted small">${escapeHtml(label)}</span>
         <div class="game-list">${documents.map(cardHtml).join('')}</div>`
: '';
return `
    <section class="section stack stack--tight" id="event-parts">
      <div class="section__head"><h2>${escapeHtml(t(activity ? 'activity.title' : 'event.title'))}</h2></div>
      ${activity ? '' : programmeHtml(poll, { guest })}
      ${kind(t('tab.lists'), parts.lists, listCardHtml)}
      ${kind(t('tab.polls'), parts.polls, pollCardHtml)}
      ${kind(t('tab.games'), parts.games, gameCardHtml)}
      ${kind(t('tab.spends'), parts.spends, spendCardHtml)}
      ${kind(t('tab.ideas'), parts.boards, boardCardHtml)}
      ${guest ? '' : eventFlowsHtml(poll)}
      ${
guest
? ''
: `${list && spend ? '' : `<p class="muted small">${escapeHtml(t(isEvent(poll) || !poll.date ? 'event.hintFixed' : 'event.hint', { day }))}</p>`}
             <div class="row">
               ${list ? '' : `<button type="button" class="button button--small" id="event-list">${escapeHtml(t('event.addList'))}</button>`}
               ${spend ? '' : `<button type="button" class="button button--small" id="event-spend">${escapeHtml(t('event.addSpend'))}</button>`}
               <button type="button" class="button button--small" id="event-add">${escapeHtml(t('event.addMore'))}</button>
               <button type="button" class="button button--small" data-gather-doc="${escapeHtml(poll.id)}">${escapeHtml(t('chain.gather'))}</button>
             </div>`
}
    </section>`;
}
function eventTagHtml(document_) {
let chain = chainOf(document_);
const here = chain.findIndex((one) => one.id === route().id);
if (here >= 0) chain = chain.slice(here + 1);
const waits = waitingOn(document_, everything());
const waiting = waits.length
? `<span class="game-card__meta">${escapeHtml(t('relate.waiting', { name: waits.map(chainLabel).join(', ') }))}</span>`
: '';
if (!chain.length) return waiting;
return `<span class="game-card__meta game-card__event">${escapeHtml(
t('event.tagUndated', { name: chain.map(chainLabel).join(' › ') }),
)}</span>${waiting}`;
}
function eventLinkHtml(document_) {
const all = everything();
const tree = chainTree(document_, all);
const relations = relationsOf(document_, all);
const hasTree = treeSize(tree) > 1;
if (!hasTree && !relations.length) return '';
const icon = (one) => (isEventDoc(one) ? '📅' : one.forActivity ? '🎯' : { list: '☑️', poll: '🗳️', spend: '💶', board: '💡', game: '🃏' }[kindOf(one)] || '•');
const kindTitle = (one) => t(isEventDoc(one) ? 'chain.kind.event' : `chain.kind.${kindOf(one) || 'game'}`);
const byRelation = new Map(relations.map((one) => [one.document.id, one]));
const badge = (one) => {
const relation = byRelation.get(one.id);
if (!relation) return '';
if (relation.kind !== 'waits') {
return `<span class="pill chain-map__link">${escapeHtml(t(relation.kind === 'with' ? 'relate.with' : 'relate.comesAfter'))}</span>`;
}
const done = isDone(one);
if (done === null) return `<span class="pill chain-map__link">${escapeHtml(t('relate.comesFirst'))}</span>`;
return `<span class="pill ${done ? 'pill--done' : 'pill--late'}">${done ? '✓' : '⏳'} ${escapeHtml(t('relate.comesFirst'))}<span
      class="visually-hidden"> (${escapeHtml(t(done ? 'relate.isDone' : 'relate.notDone'))})</span></span>`;
};
const label = (one) => {
const waits = waitingOn(one, all);
return `<span class="chain-map__icon" aria-hidden="true">${icon(one)}</span>
      <span class="chain-map__title">${escapeHtml(chainLabel(one))}</span>
      ${waits.length ? `<span class="chain-map__wait" title="${escapeHtml(t('relate.waiting', { name: waits.map(chainLabel).join(', ') }))}">⏳</span>` : ''}`;
};
const nodeHtml = (one) => (one.id === document_.id
? `<span class="chain-map__node chain-map__node--here" aria-current="page" data-press="${escapeHtml(one.id)}">${label(one)}
         <span class="pill">${escapeHtml(t('chain.youAreHere'))}</span></span>`
: `<button type="button" class="chain-map__node" data-goto="${escapeHtml(documentHref(one))}" title="${escapeHtml(kindTitle(one))}">${label(one)}</button>`);
const inTree = new Set();
const node = ({ document: one, children }) => {
inTree.add(one.id);
return `
      <li>
        <div class="chain-map__row">${nodeHtml(one)}${badge(one)}</div>
        ${children.length ? `<ul>${children.map(node).join('')}</ul>` : ''}
      </li>`;
};
const treeHtml = hasTree ? node(tree) : '';
const outside = relations.filter((one) => !inTree.has(one.document.id));
return `
    <nav class="chain-map card" aria-label="${escapeHtml(t('chain.map'))}">
      ${hasTree ? `<span class="muted small">${escapeHtml(t('chain.map'))}</span><ul class="chain-map__tree">${treeHtml}</ul>` : ''}
      ${
outside.length
? `<span class="muted small">${escapeHtml(t(hasTree ? 'relate.outside' : 'relate.map'))}</span>
             <ul class="chain-map__links">${outside.map(({ document: one }) => `
               <li><div class="chain-map__row">${nodeHtml(one)}${badge(one)}</div></li>`).join('')}</ul>`
: ''
}
    </nav>`;
}
function soloJoinHtml(poll, solo) {
const roster = solo ? [] : rosterFor(poll);
if (roster.length) {
const free = roster.filter((name) => !poll.people.some((person) => sameName(person.name) === sameName(name)));
if (!free.length) return '';
return `
      <div class="row row--chips" id="solo-me-listed">
        <span class="muted small">${escapeHtml(t('roster.notAsked'))}</span>
        ${free.map((name) => `<button type="button" class="chip" data-solo-as="${escapeHtml(name)}">+ ${escapeHtml(name)}</button>`).join('')}
      </div>`;
}
return `
    <form id="solo-me-form" class="row row--tight">
      <label class="visually-hidden" for="solo-me">${escapeHtml(t('polls.soloMe'))}</label>
      <input type="text" id="solo-me" autocomplete="given-name" maxlength="${NAME_KEPT}"
             placeholder="${escapeHtml(t('polls.soloMe'))}" />
      <button type="submit" class="button">${escapeHtml(t('polls.soloAdd'))}</button>
    </form>`;
}
function soloDateHtml(poll) {
if (!poll.date) return '';
const when = whenText(poll, { long: true });
return `
    <section class="card stack stack--tight">
      <p><strong>${escapeHtml(t('polls.soloSettled', { when }))}</strong></p>
      <div class="row">
        <button type="button" class="button button--small" id="poll-ics">${escapeHtml(t('agenda.add'))}</button>
      </div>
    </section>`;
}
function heldCounts() {
const all = [...state.lists, ...state.polls, ...state.games, ...state.spends, ...state.boards];
return {
lists: state.lists.length,
polls: state.polls.length,
games: state.games.length,
spends: state.spends.length,
shared: all.filter((document_) => document_.shared).length,
archived: all.filter((document_) => document_.archivedAt).length,
};
}
function keptElsewhere(changed, { store = false } = {}) {
if (state.remote && changed?.shared) return true;
return Boolean(store && state.store && changed);
}
async function pushMerged(changed, { valid, adopt, find }) {
let outgoing = changed;
try {
const stored = await state.remote.get(changed.id);
if (valid(stored) && adopt(stored)) {
outgoing = find(changed.id) || changed;
if (!isBusy()) render();
}
} catch {
}
await state.remote.put(outgoing, keyFor(outgoing), organiserSecret(outgoing.id));
}
function pushFailed(changed) {
return (error) => {
if (wasDeleted(error)) dropDeleted(changed.id);
else flash(t('share.pushFailed'), 'error');
};
}
async function whenAbsent(id) {
const held = everything().find((one) => one.id === id);
if (!held?.shared || !state.remote) return false;
if (held.kind === 'poll' && !isOrganiser(held)) {
dropDeleted(id);
return true;
}
try {
await state.remote.put(held, keyFor(held), organiserSecret(id));
return false;
} catch (error) {
if (!wasDeleted(error)) return false;
dropDeleted(id);
return true;
}
}
function dropDeleted(id) {
const poll = getPoll(id);
const list = getList(id);
const spend = getSpend(id);
const board = getBoard(id);
const game = getGame(id);
if (poll) {
state.polls = state.polls.filter((item) => item.id !== id);
savePolls(state.polls);
} else if (list) {
state.lists = state.lists.filter((item) => item.id !== id);
saveLists(state.lists);
} else if (spend) {
state.spends = state.spends.filter((item) => item.id !== id);
saveSpends(state.spends);
} else if (board) {
state.boards = state.boards.filter((item) => item.id !== id);
saveBoards(state.boards);
} else if (game) {
state.games = state.games.filter((item) => item.id !== id);
saveGames(state.games);
} else {
return;
}
if (state.store) void state.store.remove(id);
const name = poll ? pollTitle(poll) : list ? listTitle(list) : spend ? spendTitle(spend) : board ? boardTitle(board) : gameTitle(game);
flash(t('share.deleted', { name }));
if (route().id === id) render();
}
function persistPoll(changed) {
const ok = savePolls(state.polls);
if (!ok && !keptElsewhere(changed)) flash(t('home.storageWarning'), 'error');
if (state.store && changed) void state.store.save(changed);
if (state.remote && changed?.shared) {
pushPoll(changed).catch(pushFailed(changed));
}
return ok;
}
async function pushPoll(changed) {
let outgoing = changed;
try {
const stored = await state.remote.get(changed.id);
if (isValidPoll(stored) && adoptPoll(stored)) {
outgoing = getPoll(changed.id) || changed;
if (!isBusy()) render();
}
} catch {
}
const unlock = isOrganiser(outgoing) ? {} : choiceUnlocks(outgoing);
if (Object.keys(unlock).length) outgoing = { ...outgoing, unlock };
await state.remote.put(outgoing, keyFor(outgoing), organiserSecret(outgoing.id));
}
function getPoll(id) {
return state.polls.find((poll) => poll.id === id) || null;
}
function persistSpend(changed) {
const ok = saveSpends(state.spends);
if (!ok && !keptElsewhere(changed)) flash(t('home.storageWarning'), 'error');
if (state.store && changed) void state.store.save(changed);
if (state.remote && changed?.shared) {
pushMerged(changed, { valid: isValidSpend, adopt: adoptSpend, find: getSpend }).catch(pushFailed(changed));
}
return ok;
}
function getSpend(id) {
return state.spends.find((spend) => spend.id === id) || null;
}
function replaceSpend(next, { redraw = true } = {}) {
state.spends = state.spends.map((spend) => (spend.id === next.id ? next : spend));
persistSpend(next);
if (redraw) render();
}
function replacePoll(next, { redraw = true } = {}) {
state.polls = state.polls.map((poll) => (poll.id === next.id ? next : poll));
persistPoll(next);
if (redraw) render();
}
function newPollDaysHtml() {
const event = linkedEvent();
const eventDaysOf = event && eventDays(event).length > 1 ? eventDays(event) : [];
const picked = state.newPollDays;
const chip = (day) => `<button type="button" class="chip ${picked.includes(day) ? 'chip--on' : ''}" data-toggle-day="${escapeHtml(day)}"
      aria-pressed="${picked.includes(day) ? 'true' : 'false'}">${escapeHtml(formatDayLong(day))}</button>`;
const others = picked.filter((day) => !eventDaysOf.includes(day));
return `
      ${
eventDaysOf.length
? `<span class="small">${escapeHtml(t('polls.forDay'))}</span>
             ${dayChipsHtml(event, eventDaysOf.includes(state.newPollOnDay) ? state.newPollOnDay : '', { attr: 'data-new-poll-day', noneLabel: t('polls.wholeEvent') })}
             <span class="small">${escapeHtml(t('polls.eventDays'))}</span>
             <div class="row row--chips" role="group">${eventDaysOf.map(chip).join('')}</div>
             <p class="muted small">${escapeHtml(t('polls.eventDaysHint'))}</p>`
: ''
}
      <div class="row row--tight">
        <label class="small add-day">
          <span>${DAY_ICON}${escapeHtml(t(eventDaysOf.length ? 'polls.addOtherDay' : 'polls.addDay'))}</span>
          <input type="date" id="poll-add-day" />
        </label>
        <label class="small add-day" id="poll-add-at-label" ${picked.length ? '' : 'hidden'}>
          <span>${HOUR_ICON}${escapeHtml(t('polls.daysHour'))}</span>
          <input type="time" id="poll-add-at" value="${escapeHtml(state.newPollAt || '')}" />
        </label>
      </div>
      <div class="row" id="poll-days" ${others.length ? '' : 'hidden'}>${pickedDaysHtml(others)}</div>`;
}
function pickedDaysHtml(days) {
return days
.map(
(day) => `<button type="button" class="chip chip--on" data-drop-day="${escapeHtml(day)}"
                        aria-label="${escapeHtml(t('polls.dropDay', { day: choiceOfDay(day, getLanguage()) }))}">
                  ${escapeHtml(choiceOfDay(day, getLanguage()))} ×
                </button>`,
)
.join('');
}
function typedDay(value) {
return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number(value.slice(0, 4)) >= 1900 ? value : '';
}
function showNewPollDays() {
const picked = state.newPollDays;
view.querySelectorAll('[data-toggle-day]').forEach((chip) => {
const on = picked.includes(chip.dataset.toggleDay);
chip.classList.toggle('chip--on', on);
chip.setAttribute('aria-pressed', on ? 'true' : 'false');
});
const eventDaysOf = [...view.querySelectorAll('[data-toggle-day]')].map((chip) => chip.dataset.toggleDay);
const others = picked.filter((day) => !eventDaysOf.includes(day));
const hour = view.querySelector('#poll-add-at-label');
if (hour) hour.hidden = !picked.length;
const list = view.querySelector('#poll-days');
if (list) {
list.innerHTML = pickedDaysHtml(others);
list.hidden = !others.length;
}
}
function bindNewPoll() {
const form = view.querySelector('#new-poll');
if (!form) return;
const snapshot = () => {
state.newPollForActivity = Boolean(view.querySelector('#poll-for-activity')?.checked);
state.newPollQuestion = view.querySelector('#poll-question').value;
state.newPollChoices = view.querySelector('#poll-choices').value;
state.newPollAt = view.querySelector('#poll-add-at')?.value ?? state.newPollAt;
view.querySelectorAll('[data-person-index]').forEach((input) => {
state.newPollPeople[Number(input.dataset.personIndex)] = input.value;
});
};
bindRosterPick(view, () => state.newPollPeople, (names) => {
state.newPollPeople = names;
});
view.querySelector('form')?.addEventListener('rosterchange', () => {
snapshot();
render();
});
view.querySelectorAll('[data-new-group]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
state.newGroupChoice = { touched: true, id: chip.dataset.newGroup || null };
render();
});
});
view.querySelector('#add-person')?.addEventListener('click', () => {
snapshot();
state.newPollPeople = [...state.newPollPeople, ''];
render();
view.querySelector(`[data-person-index="${state.newPollPeople.length - 1}"]`)?.focus();
});
view.querySelector('#drop-person')?.addEventListener('click', () => {
snapshot();
state.newPollPeople = state.newPollPeople.slice(0, -1);
render();
});
view.querySelectorAll('[data-suggest]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
const { suggest } = chip.dataset;
if (state.newPollPeople.includes(suggest)) return;
const empty = state.newPollPeople.findIndex((name) => !name.trim());
if (empty >= 0) state.newPollPeople[empty] = suggest;
else state.newPollPeople = [...state.newPollPeople, suggest];
render();
});
});
view.querySelector('#poll-add-day')?.addEventListener('change', (event) => {
const day = typedDay(event.target.value);
if (!day) return;
snapshot();
if (!state.newPollDays.includes(day)) state.newPollDays = [...state.newPollDays, day].sort();
showNewPollDays();
});
view.querySelectorAll('[data-toggle-day]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
const day = chip.dataset.toggleDay;
state.newPollDays = state.newPollDays.includes(day)
? state.newPollDays.filter((one) => one !== day)
: [...state.newPollDays, day].sort();
render();
});
});
view.querySelectorAll('[data-new-poll-day]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
state.newPollOnDay = chip.dataset.newPollDay;
render();
});
});
view.querySelectorAll('[data-new-event]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
chooseEvent(state.polls.find((one) => one.id === chip.dataset.newEvent) || null);
render();
});
});
view.querySelector('#poll-days')?.addEventListener('click', (event) => {
const chip = event.target.closest('[data-drop-day]');
if (!chip) return;
snapshot();
state.newPollDays = state.newPollDays.filter((day) => day !== chip.dataset.dropDay);
render();
});
form.addEventListener('submit', (event) => {
event.preventDefault();
snapshot();
let poll = signed(organise(landing(createPoll({ question: state.newPollQuestion, names: peopleForNew(state.newPollPeople) }))));
poll = addOptions(poll, state.newPollChoices);
const typed = new Set(poll.options.map((option) => choiceWhen(option)?.date).filter(Boolean));
poll = addDays(poll, state.newPollDays.filter((day) => !typed.has(day)), state.newPollAt || null);
if (state.newPollForActivity) poll = markForActivity(poll, true);
const forEvent = linkedEvent();
if (forEvent && eventDays(forEvent).includes(state.newPollOnDay)) poll = setPollDay(poll, state.newPollOnDay);
state.polls = [...state.polls, poll];
persistPoll(poll);
resetGroupChoice();
state.newPollQuestion = '';
state.newPollChoices = '';
state.newPollDays = [];
state.newPollAt = '';
state.newPollOnDay = '';
state.newPollForActivity = false;
state.newPollPeople = withMeFirst(['', ''], myName());
navigate(`#/poll/${poll.id}`);
});
}
function showMyColumn({ always = false } = {}) {
const box = view.querySelector('.table-wrap[data-keep-scroll]');
const mine = box?.querySelector('thead th.votes__mine');
const first = box?.querySelector('thead th');
if (!box || !mine || !first) return;
const start = mine.offsetLeft - first.offsetWidth;
const inSight = start >= box.scrollLeft && mine.offsetLeft + mine.offsetWidth <= box.scrollLeft + box.clientWidth;
if (inSight && !always) return;
if (!always) {
box.scrollLeft = Math.max(0, start);
return;
}
const still = matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const behavior = still ? 'auto' : 'smooth';
const bar = document.querySelector('.app-bar');
const top = box.getBoundingClientRect().top + window.scrollY - (bar?.offsetHeight || 0) - 8;
window.scrollTo({ top: Math.max(0, top), behavior });
box.scrollTo({ left: Math.max(0, start), behavior });
}
function askWhoFirst() {
const names = view.querySelector('[data-iam]');
if (!names) return;
names.classList.remove('iam--nudge');
names.getBoundingClientRect();
names.classList.add('iam--nudge');
const still = matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
names.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
}
function bindPoll(poll) {
bindTalk(view);
view.querySelectorAll('[data-vote]').forEach((button) => {
button.addEventListener('click', () => {
const [personId, optionId] = button.dataset.vote.split('|');
const answeringAs = voterOf(poll);
if (!answeringAs) {
askWhoFirst();
return;
}
if (answeringAs !== personId) return;
const next = setVote(poll, personId, optionId, nextValue(voteOf(poll, personId, optionId)));
if (next === poll) return;
markTouched(`[data-vote="${CSS.escape(button.dataset.vote)}"]`);
replacePoll(next);
});
});
view.querySelectorAll('[data-me]').forEach((chip) => {
chip.addEventListener('click', () => {
const chosen = chip.dataset.me;
state.prefs = { ...state.prefs, voter: { ...state.prefs.voter, [poll.id]: chosen } };
savePrefs(state.prefs);
render();
showMyColumn({ always: true });
});
});
const joinAs = (name) => {
if (!name) return;
const same = (person) => sameName(person.name) === sameName(name);
let next = poll;
let person = poll.people.find(same);
if (!person) {
next = addPollPerson(poll, name);
person = next.people.find(same);
}
state.prefs = { ...state.prefs, voter: { ...state.prefs.voter, [poll.id]: person.id } };
savePrefs(state.prefs);
if (next === poll) render();
else replacePoll(next);
showMyColumn({ always: true });
};
view.querySelector('#solo-me-form')?.addEventListener('submit', (event) => {
event.preventDefault();
joinAs(view.querySelector('#solo-me').value.trim());
});
view.querySelectorAll('[data-solo-as]').forEach((chip) => {
chip.addEventListener('click', () => joinAs(chip.dataset.soloAs));
});
showMyColumn();
const added = async (next) => (isOrganiser(poll) ? next : claimChoices(poll, next));
view.querySelector('#add-choice')?.addEventListener('submit', async (event) => {
event.preventDefault();
const field = view.querySelector('#new-choice');
const onEvent = Boolean(choiceDaysEvent(poll));
if (onEvent && !field.value.trim()) {
field.focus();
return;
}
const day = (onEvent ? pollDay(poll) : pickedDays[poll.id]) || null;
const at = day ? view.querySelector('#new-choice-at')?.value || null : null;
const next = addChoice(poll, { text: field.value, day, at });
if (next === poll) {
field.focus();
return;
}
delete pickedHours[poll.id];
if (!field.value.trim()) delete pickedDays[poll.id];
replacePoll(await added(next));
view.querySelector('#new-choice')?.focus();
});
view.querySelector('#poll-change-day')?.addEventListener('click', () => openPollDayDialog(poll));
view.querySelectorAll('[data-drop-option]').forEach((button) => {
button.addEventListener('click', async () => {
if (!(await ask(t('polls.confirmRemoveChoice'), { confirmLabel: t('action.delete'), danger: true }))) return;
replacePoll(removeOption(poll, button.dataset.dropOption));
});
});
const pickDay = (day) => {
const typed = view.querySelector('#new-choice')?.value || '';
pickedDays[poll.id] = day;
if (!day) delete pickedHours[poll.id];
render();
const field = view.querySelector('#new-choice');
if (field) field.value = typed;
if (typed) field?.focus();
};
view.querySelectorAll('[data-choice-day]').forEach((button) => {
button.addEventListener('click', () => pickDay(button.dataset.choiceDay));
});
view.querySelector('#new-choice-day')?.addEventListener('change', (event) => {
const day = typedDay(event.target.value);
if (event.target.value && !day) return;
if (day) pickedDays[poll.id] = day;
else {
delete pickedDays[poll.id];
delete pickedHours[poll.id];
}
const hour = view.querySelector('#new-choice-at');
if (!hour) return;
hour.disabled = !day;
if (!day) hour.value = '';
});
view.querySelector('#new-choice-at')?.addEventListener('change', (event) => {
pickedHours[poll.id] = event.target.value;
});
view.querySelectorAll('[data-option]').forEach((button) => {
button.addEventListener('click', () => openChoiceDialog(poll, button.dataset.option));
});
view.querySelector('#poll-people')?.addEventListener('click', () => openPollPeopleDialog(poll));
view.querySelector('#poll-text')?.addEventListener('click', () => {
showCopyDialog({ title: pollTitle(poll), hint: t('lists.textHint'), text: pollText(poll) });
});
view.querySelector('#poll-close')?.addEventListener('click', () => {
const next = setClosed(poll, !poll.closedAt);
const activities = next.closedAt ? activitiesOnClose(next, everything().map((one) => (one.id === next.id ? next : one))) : [];
for (const activity of activities) {
const made = organise(signed(activity));
state.polls = [...state.polls, made];
persistPoll(made);
flash(t('activity.made', { name: pollTitle(made), event: chainLabelShort(getPoll(made.parent) || made) }));
}
replacePoll(next);
});
view.querySelector('#poll-for-activity-toggle')?.addEventListener('click', () => {
flash(t(poll.forActivity ? 'activity.pollUnmarked' : 'activity.pollMarked'));
replacePoll(markForActivity(poll, !poll.forActivity));
});
view.querySelectorAll('[data-retain]').forEach((button) => {
button.addEventListener('click', () => {
const option = poll.options.find((one) => one.id === button.dataset.retain);
const day = option && dayOfOption(poll, option);
if (!day) return;
const activity = poll.whenFor && getPoll(poll.whenFor);
if (activity) {
flash(t('activity.dayKept', { day: formatDayLong(day.date) }));
replacePoll(setPollDate(activity, day.date, day.at || activity.at || null, null), { redraw: false });
replacePoll(setClosed(poll, true));
return;
}
if (settlePollActivity(poll, { option, date: day.date, at: day.at || null })) return;
const next = setClosed(setPollDate(poll, day.date, day.at), true);
flash(t('polls.dateKept', { day: whenText(next) }));
replacePoll(next);
});
});
keepUntilAfter(view.querySelector('#poll-day'), view.querySelector('#poll-until'));
view.querySelector('#poll-date-save')?.addEventListener('click', () => {
const day = view.querySelector('#poll-day').value;
const hour = view.querySelector('#poll-hour').value;
const until = view.querySelector('#poll-until')?.value || null;
const written = view.querySelector('#poll-title').value;
const named = written.trim() === eventName(poll) ? poll : setEventName(poll, written);
if (day && settlePollActivity(poll, { date: day, at: hour || null, until, name: written.trim() === eventName(poll) ? '' : written })) return;
const next = setPollDate(named, day, hour, until);
flash(next.date ? t('polls.dateKept', { day: whenText(next) }) : t('polls.dateCleared'));
replacePoll(next);
});
view.querySelector('#event-add')?.addEventListener('click', () => openEventMenu(poll));
view.querySelector('#event-list')?.addEventListener('click', () => {
const list = signed(forEvent(poll, createList, eventName(poll) || pollTitle(poll)));
state.lists = [...state.lists, list];
persistList(list);
navigate(`#/list/${list.id}`);
});
view.querySelector('#event-spend')?.addEventListener('click', () => {
const spend = forEvent(poll, createSpend, eventName(poll) || pollTitle(poll));
state.spends = [...state.spends, spend];
persistSpend(spend);
navigate(`#/spend/${spend.id}`);
});
view.querySelector('#poll-ics')?.addEventListener('click', () => {
const event = pollEvent(poll);
if (!event) return;
const named = eventName(poll) || pollTitle(poll);
download(`${fileName(named)}.ics`, icsFor([event], { name: named }), 'text/calendar');
});
view.querySelector('#poll-archive')?.addEventListener('click', () => {
const next = archivePoll(poll, !poll.archivedAt);
flash(t(next.archivedAt ? 'archive.done' : 'archive.undone'));
replacePoll(next, { redraw: !next.archivedAt });
if (next.archivedAt) navigate(pollHome(next));
});
view.querySelector('#poll-rename')?.addEventListener('click', () => openPollNameDialog(poll));
view.querySelector('#poll-sign')?.addEventListener('click', () =>
openSignatureDialog(poll, (signedBy) => replacePoll({ ...poll, signedBy, updatedAt: Date.now() })));
view.querySelector('#poll-delete')?.addEventListener('click', async () => {
if (!(await ask(t('polls.confirmDelete'), { confirmLabel: t('action.delete'), danger: true }))) return;
if (!(await removeEverywhere(poll))) return;
state.polls = state.polls.filter((item) => item.id !== poll.id);
savePolls(state.polls);
if (state.store) void state.store.remove(poll.id);
navigate(pollHome(poll));
});
view.querySelector('#poll-nudge')?.addEventListener('click', async (event) => {
let current = poll;
if (!current.shared) {
event.currentTarget.disabled = true;
current = await startSharing(current);
if (!current) return;
replacePoll(current);
}
showCopyDialog({
title: t('polls.nudge'),
hint: t('polls.nudgeHint'),
text: nudgeText(current, pollLink(location, current.id)),
send: true,
});
});
view.querySelector('#poll-share')?.addEventListener('click', async (event) => {
const button = event.currentTarget;
let current = poll;
if (!current.shared) {
button.disabled = true;
button.textContent = t('share.sending');
current = await startSharing(current);
if (!current) return;
replacePoll(current);
}
const link = pollLink(location, current.id);
const dated = isEvent(current) || Boolean(current.date);
const named = [eventName(current) || pollTitle(current), current.date ? whenText(current, { long: true }) : ''].filter(Boolean).join(' — ');
showCopyDialog({
title: t(isActivity(current, everything()) ? 'activity.share' : dated ? 'events.share' : 'polls.shareTitle'),
hint: t(dated ? 'events.shareHint' : 'polls.shareHint'),
text: t(dated ? 'events.shareText' : 'polls.shareText', { title: dated ? named : pollTitle(current), link }),
qr: true,
qrText: link,
send: true,
});
});
}
function openPollDayDialog(poll) {
const event = choiceDaysEvent(poll);
if (!event) return;
const dialog = makeDialog();
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('polls.forDay'))}</h2>
      ${dayChipsHtml(event, pollDay(poll) || '', { attr: 'data-poll-day', noneLabel: t('polls.wholeEvent') })}
      <p class="muted small">${escapeHtml(t('polls.changeDayHint'))}</p>
      <div class="row">
        <button type="button" class="button" id="poll-day-cancel">${escapeHtml(t('action.cancel'))}</button>
      </div>
    </div>`;
dialog.querySelectorAll('[data-poll-day]').forEach((chip) => {
chip.addEventListener('click', () => {
dialog.close();
replacePoll(setPollDay(poll, chip.dataset.pollDay || null));
});
});
dialog.querySelector('#poll-day-cancel').addEventListener('click', () => dialog.close());
dialog.showModal();
}
function openChoiceDialog(poll, optionId) {
const option = poll.options.find((entry) => entry.id === optionId);
if (!option) return;
const event = choiceDaysEvent(poll);
const when = choiceWhen(option, poll.createdAt);
let day = when?.date || '';
let dayTouched = false;
const dialog = makeDialog();
dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('polls.choiceTitle'))}</h2>
      <label class="visually-hidden" for="choice-text">${escapeHtml(t('polls.choiceTitle'))}</label>
      <input type="text" id="choice-text" value="${escapeHtml(option.text)}"
             placeholder="${escapeHtml(t('polls.otherPlaceholder'))}" />
      ${
event
? `<span class="small">${escapeHtml(t('polls.choiceDay'))}</span>
             ${dayChipsHtml(event, day, { attr: 'data-choice-day', noneLabel: t('polls.anyDay') })}`
: `<label class="small add-day">
               <span>${DAY_ICON}${escapeHtml(t('polls.pickDay'))}</span>
               <input type="date" id="choice-day" value="${escapeHtml(day)}" />
             </label>`
}
      <label class="small add-day">
        <span>${HOUR_ICON}${escapeHtml(t('polls.pickHour'))}</span>
        <input type="time" id="choice-at" value="${escapeHtml(when?.at || '')}" />
      </label>
      <div class="row">
        <button type="button" class="button button--primary" id="choice-save">${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" id="choice-cancel">${escapeHtml(t('action.cancel'))}</button>
        <button type="button" class="button button--danger" id="choice-delete">${escapeHtml(t('action.delete'))}</button>
      </div>
    </form>`;
const field = dialog.querySelector('#choice-text');
dialog.querySelectorAll('[data-choice-day]').forEach((chip) => {
chip.addEventListener('click', () => {
day = chip.dataset.choiceDay;
dayTouched = true;
dialog.querySelectorAll('[data-choice-day]').forEach((one) => {
const on = one.dataset.choiceDay === day;
one.classList.toggle('chip--on', on);
one.setAttribute('aria-pressed', on ? 'true' : 'false');
});
});
});
dialog.querySelector('#choice-day')?.addEventListener('change', (change) => {
day = change.target.value;
dayTouched = true;
});
const save = () => {
dialog.close();
const words = field.value.trim();
const named = !dayTouched && words !== option.text ? dayOfChoice(words, new Date()) : null;
const kept = named?.date || day || null;
const at = kept ? named?.at || dialog.querySelector('#choice-at').value || null : null;
if (!words && !kept) return;
replacePoll(renameOption(setOptionDay(poll, optionId, kept, at), optionId, words));
};
dialog.querySelector('#choice-save').addEventListener('click', save);
field.addEventListener('keydown', (event) => {
if (event.key !== 'Enter') return;
event.preventDefault();
save();
});
dialog.querySelector('#choice-cancel').addEventListener('click', () => dialog.close());
dialog.querySelector('#choice-delete').addEventListener('click', async () => {
if (!(await ask(t('polls.confirmRemoveChoice'), { confirmLabel: t('action.delete'), danger: true }))) return;
dialog.close();
replacePoll(removeOption(poll, optionId));
});
dialog.showModal();
field.focus();
field.select();
}
function openPollPeopleDialog(poll) {
const held = () => getPoll(poll.id) || poll;
openPeopleEditor({
roster: rosterFor(held()),
hint: t('polls.peopleHint'),
confirmRemove: t('polls.confirmRemovePerson'),
people: () => held().people,
add: (name) => replacePoll(addPollPerson(held(), name), { redraw: false }),
rename: (id, name) => replacePoll(renamePollPerson(held(), id, name), { redraw: false }),
remove: (id) => replacePoll(removePollPerson(held(), id), { redraw: false }),
});
}
function openPollNameDialog(poll) {
const dialog = makeDialog();
dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('polls.rename'))}</h2>
      <label class="visually-hidden" for="poll-new-name">${escapeHtml(t('polls.question'))}</label>
      <input type="text" id="poll-new-name" value="${escapeHtml(poll.question)}" />
      <div class="row">
        <button type="button" class="button button--primary" id="poll-name-save">${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" id="poll-name-cancel">${escapeHtml(t('action.cancel'))}</button>
      </div>
    </form>`;
const field = dialog.querySelector('#poll-new-name');
const save = () => {
dialog.close();
replacePoll({ ...poll, question: field.value.trim(), updatedAt: Date.now() });
};
dialog.querySelector('#poll-name-save').addEventListener('click', save);
field.addEventListener('keydown', (event) => {
if (event.key !== 'Enter') return;
event.preventDefault();
save();
});
dialog.querySelector('#poll-name-cancel').addEventListener('click', () => dialog.close());
dialog.showModal();
field.focus();
field.select();
}
function signedByHtml(document_) {
const name = String(document_?.signedBy || '').trim();
if (!name) return '';
return `<p class="signed small">${escapeHtml(t('sign.by', { name }))}</p>`;
}
function signed(document_) {
const name = String(state.prefs.signature || '').trim();
return name ? { ...document_, signedBy: name } : document_;
}
function signedEvent(document_) {
const made = signed(document_);
if (made.signedBy) return made;
const name = String(myNameFor(document_) || '').trim();
return name ? { ...made, signedBy: name } : made;
}
function openSignatureDialog(document_, save) {
const current = String(document_.signedBy || '').trim();
const remembered = String(state.prefs.signature || '').trim();
const dialog = makeDialog();
dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('sign.edit'))}</h2>
      <p class="muted small">${escapeHtml(t('sign.hint'))}</p>
      <label class="visually-hidden" for="sign-name">${escapeHtml(t('sign.placeholder'))}</label>
      <input type="text" id="sign-name" maxlength="40" autocomplete="nickname"
             value="${escapeHtml(current || remembered)}" placeholder="${escapeHtml(t('sign.placeholder'))}" />
      <label class="checkbox">
        <input type="checkbox" id="sign-remember" ${!remembered || remembered === (current || remembered) ? 'checked' : ''} />
        ${escapeHtml(t('sign.remember'))}
      </label>
      <div class="row">
        <button type="button" class="button button--primary" id="sign-save">${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" id="sign-cancel">${escapeHtml(t('action.cancel'))}</button>
      </div>
    </form>`;
const field = dialog.querySelector('#sign-name');
const done = () => {
const name = field.value.trim().slice(0, 40) || null;
if (dialog.querySelector('#sign-remember').checked) {
state.prefs = { ...state.prefs, signature: name };
savePrefs(state.prefs);
}
dialog.close();
if (name !== (current || null)) save(name);
};
dialog.querySelector('#sign-save').addEventListener('click', done);
field.addEventListener('keydown', (event) => {
if (event.key !== 'Enter') return;
event.preventDefault();
done();
});
dialog.querySelector('#sign-cancel').addEventListener('click', () => dialog.close());
dialog.showModal();
field.focus();
field.select();
}
function nudgeText(poll, link) {
const silent = poll.people
.filter((person) => !poll.options.some((option) => voteOf(poll, person.id, option.id)))
.map((person) => person.name);
return t('polls.nudgeText', { question: pollTitle(poll), names: silent.join(', '), count: silent.length, link });
}
function pollText(poll) {
const { rows } = tally(poll);
const line = (row) =>
`${choiceLabel(row.option)} — ${t('polls.countLine', { yes: row.yes, total: poll.people.length })}`;
return [pollTitle(poll), '', ...rows.map(line)].join('\n');
}
async function pullPoll(id) {
if (!state.remote) return false;
let stored = null;
try {
stored = await state.remote.get(id);
} catch {
return null;
}
if (stored === null) return whenAbsent(id);
return isValidPoll(stored) ? adoptPoll(stored) : false;
}
function adoptPoll(stored) {
const local = getPoll(stored.id);
const merged = local ? mergePolls(local, stored) : stored;
if (local && merged === local) return false;
const adopted = { ...merged, shared: true };
state.polls = local
? state.polls.map((poll) => (poll.id === stored.id ? adopted : poll))
: [...state.polls, adopted];
savePolls(state.polls);
return true;
}
function watchPoll(id) {
if (state.pollWatched === id && state.poll) return;
stopWatching();
if (!state.remote) return;
state.pollWatched = id;
const look = async () => {
if (isBusy() || isHidden() || liveQuiet(docTopic(id))) return;
if (await pullPoll(id)) render();
};
void look();
state.poll = setInterval(look, 5000);
}
async function pullSpend(id) {
if (!state.remote) return false;
let stored = null;
try {
stored = await state.remote.get(id);
} catch {
return false;
}
if (stored === null) return whenAbsent(id);
return isValidSpend(stored) ? adoptSpend(stored) : false;
}
function adoptSpend(stored) {
const local = getSpend(stored.id);
const merged = local ? mergeSpends(local, stored) : stored;
if (local && merged === local) return false;
const adopted = { ...merged, shared: true };
state.spends = local
? state.spends.map((spend) => (spend.id === stored.id ? adopted : spend))
: [...state.spends, adopted];
saveSpends(state.spends);
return true;
}
function watchSpend(id) {
stopWatching();
if (!state.remote) return;
state.poll = setInterval(async () => {
if (isBusy() || isHidden() || liveQuiet(docTopic(id))) return;
if (await pullSpend(id)) render();
}, 5000);
}

// ---- src/view-lists.js -----------------------------------------------
function listTitle(list) {
return list.name || t('lists.untitled');
}
function personName(list, who) {
return list.people.find((person) => person.id === who)?.name || '';
}
function listCardHtml(list) {
const { done, total } = progress(list);
const late = list.items.filter((item) => isLate(item)).length;
return `
    <button type="button" class="game-card" data-goto="#/list/${escapeHtml(list.id)}">
      <span class="game-card__title">
        ${escapeHtml(listTitle(list))}
        <span class="pill ${total && done === total ? 'pill--done' : ''}">
          ${escapeHtml(total ? t('lists.progress', { done, total }) : t('lists.empty'))}
        </span>
      </span>
      ${peopleHtml(list.people.map((person) => person.name))}
      <span class="game-card__meta">
        ${escapeHtml(formatDate(list.updatedAt))}${
late ? ` — <span class="late">${escapeHtml(t('lists.late', { count: late }))}</span>` : ''
}
      </span>
      ${eventTagHtml(list)}
    </button>`;
}
function listsView() {
const sorted = [...shownDocs(state.lists)].sort((a, b) => b.updatedAt - a.updatedAt);
const live = sorted.filter(isLive);
const open = live.filter((list) => progress(list).left > 0 || !list.items.length);
const finished = live.filter((list) => list.items.length && progress(list).left === 0);
const templates = sorted.filter((list) => list.template && !list.archivedAt);
return `
    ${flashHtml()}
    ${kindsHtml('lists')}
    ${newButtonHtml('#/lists/new', t('lists.new'), live.length > 0)}
    ${groupChipsHtml()}

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('kinds.ongoing'))}</h2></div>
      ${
open.length
? `<div class="game-list">${open.map(swipeable(listCardHtml)).join('')}</div>`
: hintHtml('lists', t('lists.none'))
}
      ${hiddenByGroupHtml(state.lists)}
    </section>
    ${open.length && live.length <= 2 ? hintHtml('lists', t('hint.lists')) : ''}

    ${
finished.length
? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('lists.done'))}</h2></div>
             <div class="game-list">${finished.map(swipeable(listCardHtml)).join('')}</div>
           </section>`
: ''
}

    ${
templates.length
? `<section class="section">
             <div class="section__head">
               <h2>${escapeHtml(t('lists.templates'))}</h2>
               <span class="muted small">${escapeHtml(t('lists.templatesHint'))}</span>
             </div>
             <div class="game-list">${templates.map(swipeable(listCardHtml)).join('')}</div>
           </section>`
: ''
}

    ${archivedHtml(sorted, swipeable(listCardHtml))}`;
}
function archivedHtml(documents, cardHtml) {
const archived = documents.filter((document_) => document_.archivedAt);
if (!archived.length) return '';
return `
    <details class="details">
      <summary>${escapeHtml(t('archive.shown', { count: archived.length }))}</summary>
      <div class="game-list">${archived.map(cardHtml).join('')}</div>
    </details>`;
}
function newListView() {
const templates = state.lists.filter((list) => list.template && !list.archivedAt);
const suggestions = [...new Set([
myName(), ...recentPeople(state.lists), ...recentPeople(state.polls), ...recentNames(state.games),
].filter(Boolean))].filter((name) => !writtenNames(state.newListPeople).has(name.toLowerCase())).slice(0, 12);
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/lists')}
      <h1>${escapeHtml(t('lists.new'))}</h1>
    </div>

    ${
templates.length
? `<section class="section">
             <div class="section__head">
               <h2>${escapeHtml(t('lists.fromTemplate'))}</h2>
             </div>
             <div class="row">
               ${templates
.map(
(list) => `
                     <button type="button" class="chip" data-from-template="${escapeHtml(list.id)}">
                       ${escapeHtml(listTitle(list))}
                     </button>`,
)
.join('')}
             </div>
           </section>`
: ''
}

    <form id="new-list" class="card stack">
      <label>
        ${escapeHtml(t('lists.name'))}
        <input type="text" id="list-name" placeholder="${escapeHtml(t('lists.namePlaceholder'))}"
               value="${escapeHtml(state.newListName)}" required />
      </label>

      ${rosterPickHtml(state.newListPeople, t('lists.peopleHint')) || `
      <div class="stack stack--tight">
        <span class="muted small">${escapeHtml(t('lists.peopleHint'))}</span>
        ${state.newListPeople
.map(
(name, index) => `
              <input type="text" data-person-index="${index}" value="${escapeHtml(name)}"
                     placeholder="${escapeHtml(t('lists.person', { n: index + 1 }))}"
                     aria-label="${escapeHtml(t('lists.person', { n: index + 1 }))}" />`,
)
.join('')}
        <div class="row">
          <button type="button" class="button button--small" id="add-person">+ ${escapeHtml(t('lists.addPerson'))}</button>
          ${
state.newListPeople.length > 1
? `<button type="button" class="button button--small button--ghost" id="drop-person">− ${escapeHtml(t('lists.dropPerson'))}</button>`
: ''
}
        </div>
        ${
suggestions.length
? `<div class="row">${suggestions
.map((name) => `<button type="button" class="chip" data-suggest="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
.join('')}</div>`
: ''
}
      </div>`}

      <label>
        ${escapeHtml(t('lists.firstLines'))}
        <textarea id="list-lines" rows="5" placeholder="${escapeHtml(t('lists.firstLinesPlaceholder'))}">${escapeHtml(state.newListLines)}</textarea>
      </label>

      ${willBeInHtml()}
      <button type="submit" class="button button--primary button--block">${escapeHtml(t('lists.create'))}</button>
    </form>`;
}
function linesHtml(list, items, paid = new Map()) {
const left = items.filter((item) => !item.done);
const done = items.filter((item) => item.done);
const ul = (part) => `<ul class="lines">${part.map((item) => listItemHtml(list, item, paid.get(item.id))).join('')}</ul>`;
if (!done.length || !left.length) return ul(items);
return `${ul(left)}
    <p class="muted small lines__done">${escapeHtml(t('lists.doneHeading', { count: done.length }))}</p>
    ${ul(done)}`;
}
function paidText({ spend, line, count }) {
const name = spend.people.find((person) => person.id === line.by)?.name || '';
const amount = money(line.amount, spend);
if (count > 1) return name ? t('lists.paidTicket', { name, amount, count }) : t('lists.paidTicketNobody', { amount, count });
return name ? t('lists.paidOne', { name, amount }) : t('lists.paidNobody', { amount });
}
function listItemHtml(list, item, paid = null) {
const who = personName(list, item.who);
const late = isLate(item);
return swipeHtml(item.id, `
      <label class="line__tick">
        <input type="checkbox" data-tick="${escapeHtml(item.id)}" ${item.done ? 'checked' : ''}
               aria-label="${escapeHtml(item.text)}" />
      </label>
      <button type="button" class="line__text" data-edit="${escapeHtml(item.id)}">
        <span>${escapeHtml(item.text)}</span>
        ${
item.due
? `<span class="line__due ${late ? 'line__due--late' : ''}">${escapeHtml(
late ? t('lists.lateOn', { day: formatDay(item.due) }) : t('lists.dueOn', { day: formatDay(item.due) }),
)}</span>`
: ''
}
        ${paid ? `<span class="line__due line__paid">💶 ${escapeHtml(paidText(paid))}</span>` : ''}
      </button>
      ${
who
? `<button type="button" class="line__who" data-assign="${escapeHtml(item.id)}">${escapeHtml(who)}</button>`
: `<button type="button" class="line__who line__who--nobody" data-assign="${escapeHtml(item.id)}"
                     aria-label="${escapeHtml(t('lists.nobody'))}" title="${escapeHtml(t('lists.assignTitle'))}">
               <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>
             </button>`
}`,
{ kind: 'item', tag: 'li', bodyClass: `line ${item.done ? 'line--done' : ''}` });
}
function moneyOfList(list, all, paid) {
const parts = [];
const estimate = estimateOf(list.items);
if (estimate) {
const account = accountsFor(list, all)[0];
const currency = account ? spendCurrency(account) : list.items.map((item) => priceCurrency(item.text)).find(Boolean) || 'EUR';
parts.push(t('lists.estimate', { amount: showAmount(estimate, getLanguage(), currency) }));
}
const spent = new Map();
for (const { spend, line } of new Map([...paid.values()].map((one) => [one.line.id, one])).values()) {
const currency = spendCurrency(spend);
spent.set(currency, (spent.get(currency) || 0) + line.amount);
}
for (const [currency, cents] of spent) parts.push(t('lists.spent', { amount: showAmount(cents, getLanguage(), currency) }));
return parts.join(' · ');
}
function listView(list) {
const filter = state.listFilter;
const known = filter === null || filter === 'none' || list.people.some((person) => person.id === filter);
const shown = !known || filter === null
? list.items
: list.items.filter((item) => (filter === 'none' ? !item.who : item.who === filter));
const { done, total } = progress(list);
const all = everything();
const paid = paidLines(list, all);
const moneyLine = moneyOfList(list, all, paid);
const chip = (value, label, count) => `
    <button type="button" class="chip ${(!known ? null : filter) === value ? 'chip--on' : ''}" data-filter="${value === null ? '' : escapeHtml(value)}">
      ${escapeHtml(label)}${count === undefined ? '' : ` <span class="muted">${count}</span>`}
    </button>`;
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/lists')}
      <div>
        <h1>${escapeHtml(listTitle(list))}</h1>
        <p class="muted small">
          ${escapeHtml(total ? t('lists.progress', { done, total }) : t('lists.empty'))}
          ${list.shared ? ` · ${escapeHtml(t('lists.sharedMark'))}` : ''}
        </p>
        ${moneyLine ? `<p class="muted small list-money">${escapeHtml(moneyLine)}</p>` : ''}
        ${signedByHtml(list)}
      </div>
    </div>

    ${eventLinkHtml(list)}

    ${inGroupHtml(list)}

    ${state.remote ? shareBarHtml(`<button type="button" class="button button--primary" id="list-share">${escapeHtml(t('lists.share'))}</button>`) : ''}

    <form id="add-line" class="card stack stack--tight">
      <label class="visually-hidden" for="new-line">${escapeHtml(t('lists.addLine'))}</label>
      <div class="row row--tight">
        <input type="text" id="new-line" placeholder="${escapeHtml(t('lists.addLine'))}" autocomplete="off" />
        <button type="submit" class="button button--primary">+</button>
      </div>
    </form>

    ${
list.people.length
? `<div class="row">
             ${chip(null, t('lists.everyone'), progress(list).left)}
             ${list.people
.map((person) => chip(person.id, person.name, progress(list, person.id).left))
.join('')}
             ${chip('none', t('lists.nobody'), progress(list, null).left)}
           </div>`
: ''
}

    ${
shown.length
? linesHtml(list, shown, paid)
: `<p class="muted small">${escapeHtml(list.items.length ? t('lists.nothingHere') : t('lists.addFirst'))}</p>`
}
    ${list.items.length <= 2 ? hintHtml('lists', t('hint.list')) : ''}

    ${listFlowsHtml(list)}

    ${attachedHtml(list)}

    ${actionsHtml(`
        <button type="button" class="button button--small" id="list-people">${escapeHtml(t('lists.people'))}</button>
        <button type="button" class="button button--small" id="list-text">${escapeHtml(t('action.recap'))}</button>
        ${
list.people.length
? `<button type="button" class="button button--small" id="share-out">${escapeHtml(t('lists.shareOut'))}</button>`
: ''
}
        ${
done
? `<button type="button" class="button button--small" id="clear-done">${escapeHtml(t('lists.clearDone'))}</button>`
: ''
}
        <button type="button" class="button button--small" id="list-reuse">${escapeHtml(t('lists.reuse'))}</button>`, `
        <button type="button" class="button button--small button--ghost" id="list-rename">${escapeHtml(t('lists.rename'))}</button>
        <button type="button" class="button button--small button--ghost" id="list-sign">${escapeHtml(t('sign.edit'))}</button>
        ${chainButtonsHtml(list)}
        <button type="button" class="button button--small button--ghost" id="list-template">
          ${escapeHtml(list.template ? t('lists.unTemplate') : t('lists.makeTemplate'))}
        </button>
        <button type="button" class="button button--small button--ghost" id="list-archive">
          ${escapeHtml(list.archivedAt ? t('archive.back') : t('archive.put'))}
        </button>
        <button type="button" class="button button--small button--ghost" id="list-delete">${escapeHtml(t('action.delete'))}</button>`)}`;
}
function persist(changed) {
const ok = saveGames(state.games);
if (!ok && !keptElsewhere(changed, { store: true })) flash(t('home.storageWarning'), 'error');
if (state.store && changed) void state.store.save(changed);
if (state.remote && changed?.shared) {
pushMerged(changed, { valid: isValidGame, adopt: adoptGame, find: getGame }).catch(pushFailed(changed));
}
return ok;
}
function forget(id, game = null) {
saveGames(state.games);
if (state.store) void state.store.remove(id);
if (state.remote) state.remote.remove(id, keyFor(game), organiserSecret(id)).catch(() => {});
}
function getGame(id) {
return state.games.find((game) => game.id === id) || null;
}
function replaceGame(next) {
state.games = state.games.map((game) => (game.id === next.id ? next : game));
persist(next);
}
function persistList(changed) {
const ok = saveLists(state.lists);
if (!ok && !keptElsewhere(changed)) flash(t('home.storageWarning'), 'error');
if (state.store && changed) void state.store.save(changed);
if (state.remote && changed?.shared) {
pushMerged(changed, { valid: isValidList, adopt: adoptList, find: getList }).catch(pushFailed(changed));
}
return ok;
}
function getList(id) {
return state.lists.find((list) => list.id === id) || null;
}
function replaceList(next, { redraw = true } = {}) {
state.lists = state.lists.map((list) => (list.id === next.id ? next : list));
persistList(next);
if (redraw) render();
}
function bindNewList() {
view.querySelectorAll('[data-from-template]').forEach((button) => {
button.addEventListener('click', () => {
const template = getList(button.dataset.fromTemplate);
if (!template) return;
const next = reuseList(template);
state.lists = [...state.lists, next];
persistList(next);
navigate(`#/list/${next.id}`);
});
});
const form = view.querySelector('#new-list');
if (!form) return;
const snapshot = () => {
state.newListName = view.querySelector('#list-name').value;
state.newListLines = view.querySelector('#list-lines').value;
view.querySelectorAll('[data-person-index]').forEach((input) => {
state.newListPeople[Number(input.dataset.personIndex)] = input.value;
});
};
view.querySelector('#add-person')?.addEventListener('click', () => {
snapshot();
state.newListPeople = [...state.newListPeople, ''];
render();
view.querySelector(`[data-person-index="${state.newListPeople.length - 1}"]`)?.focus();
});
view.querySelector('#drop-person')?.addEventListener('click', () => {
snapshot();
state.newListPeople = state.newListPeople.slice(0, -1);
render();
});
bindRosterPick(view, () => state.newListPeople, (names) => {
state.newListPeople = names;
});
view.querySelector('form')?.addEventListener('rosterchange', () => {
snapshot();
render();
});
view.querySelectorAll('[data-new-group]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
state.newGroupChoice = { touched: true, id: chip.dataset.newGroup || null };
render();
});
});
view.querySelectorAll('[data-suggest]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
const { suggest } = chip.dataset;
if (state.newListPeople.includes(suggest)) return;
const empty = state.newListPeople.findIndex((name) => !name.trim());
if (empty >= 0) state.newListPeople[empty] = suggest;
else state.newListPeople = [...state.newListPeople, suggest];
render();
});
});
form.addEventListener('submit', (event) => {
event.preventDefault();
snapshot();
let list = signed(landing(createList({ name: state.newListName, names: peopleForNew(state.newListPeople) })));
list = addItems(list, state.newListLines);
state.lists = [...state.lists, list];
persistList(list);
resetGroupChoice();
state.newListName = '';
state.newListPeople = withMeFirst(['', ''], myName());
state.newListLines = '';
navigate(`#/list/${list.id}`);
});
}
function bindList(list) {
bindSwipes('item', (itemId) => {
const current = getList(list.id);
if (!current) return;
replaceList(removeItem(current, itemId));
}, { undo: t('swipe.lineDeleted') });
view.querySelector('#add-line')?.addEventListener('submit', (event) => {
event.preventDefault();
const field = view.querySelector('#new-line');
const { fresh, known } = newLines(list, field.value);
if (known.length) flash(known.length > 1 ? t('lists.alreadyMany', { count: known.length }) : t('lists.already', { line: known[0] }));
const next = addItems(list, fresh);
if (next === list) {
if (!known.length) return;
field.value = '';
render();
view.querySelector('#new-line')?.focus();
return;
}
replaceList(next);
const again = view.querySelector('#new-line');
again?.focus();
});
view.querySelectorAll('[data-tick]').forEach((box) => {
box.addEventListener('change', () => {
markTouched(`[data-tick="${CSS.escape(box.dataset.tick)}"]`);
replaceList(toggleItem(list, box.dataset.tick));
});
});
view.querySelectorAll('[data-assign]').forEach((button) => {
button.addEventListener('click', () => openAssignDialog(list, button.dataset.assign));
});
view.querySelectorAll('[data-edit]').forEach((button) => {
button.addEventListener('click', () => openLineDialog(list, button.dataset.edit));
});
view.querySelectorAll('[data-filter]').forEach((chip) => {
chip.addEventListener('click', () => {
const { filter } = chip.dataset;
state.listFilter = filter === '' ? null : filter;
render();
});
});
view.querySelector('#share-out')?.addEventListener('click', () => {
const next = shareOut(list);
if (next === list) {
flash(t('lists.nothingToShareOut'));
render();
return;
}
replaceList(next);
});
view.querySelector('#list-people')?.addEventListener('click', () => openPeopleDialog(list));
view.querySelector('#list-text')?.addEventListener('click', () => {
showCopyDialog({
title: listTitle(list),
hint: t('lists.textHint'),
text: listText(list),
});
});
view.querySelector('#clear-done')?.addEventListener('click', async () => {
if (!(await ask(t('lists.confirmClearDone'), { confirmLabel: t('lists.clearDone'), danger: true }))) return;
const next = list.items.filter((item) => item.done).reduce((carry, item) => removeItem(carry, item.id), list);
replaceList(next);
});
view.querySelector('#list-reuse')?.addEventListener('click', () => {
const next = reuseList(list);
state.lists = [...state.lists, next];
persistList(next);
navigate(`#/list/${next.id}`);
});
view.querySelector('#list-template')?.addEventListener('click', () => {
const next = makeTemplate(list, !list.template);
flash(t(next.template ? 'lists.nowTemplate' : 'lists.noLongerTemplate'));
replaceList(next);
});
view.querySelector('#list-archive')?.addEventListener('click', () => {
const next = archiveList(list, !list.archivedAt);
flash(t(next.archivedAt ? 'archive.done' : 'archive.undone'));
replaceList(next, { redraw: !next.archivedAt });
if (next.archivedAt) navigate('#/lists');
});
view.querySelector('#list-rename')?.addEventListener('click', () => openListNameDialog(list));
view.querySelector('#list-sign')?.addEventListener('click', () =>
openSignatureDialog(list, (signedBy) => replaceList({ ...list, signedBy, updatedAt: Date.now() })));
view.querySelector('#list-delete')?.addEventListener('click', async () => {
if (!(await ask(t('lists.confirmDelete'), { confirmLabel: t('action.delete'), danger: true }))) return;
if (!(await removeEverywhere(list))) return;
state.lists = state.lists.filter((item) => item.id !== list.id);
saveLists(state.lists);
if (state.store) void state.store.remove(list.id);
navigate('#/lists');
});
view.querySelector('#list-share')?.addEventListener('click', async (event) => {
const button = event.currentTarget;
let current = list;
if (!current.shared) {
button.disabled = true;
button.textContent = t('share.sending');
current = await startSharing(current);
if (!current) return;
replaceList(current);
}
showCopyDialog({
title: t('lists.shareTitle'),
hint: t('lists.shareHint'),
text: listLink(location, current.id),
qr: true,
});
});
}
function openAssignDialog(list, itemId) {
const item = list.items.find((entry) => entry.id === itemId);
if (!item) return;
const dialog = makeDialog('dialog dialog--ask');
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('lists.assignTitle'))}</h2>
      <p class="muted small">${escapeHtml(item.text)}</p>
      <div class="stack stack--tight">
        ${list.people
.map(
(person) => `
              <button type="button" class="button button--block" data-who="${escapeHtml(person.id)}">
                ${escapeHtml(person.name)}${item.who === person.id ? ' ✓' : ''}
              </button>`,
)
.join('')}
        <button type="button" class="button button--block" data-who="">
          ${escapeHtml(t('lists.nobody'))}${item.who ? '' : ' ✓'}
        </button>
      </div>
      <div class="row">
        <button type="button" class="button" id="assign-cancel">${escapeHtml(t('action.cancel'))}</button>
        <button type="button" class="button button--ghost" id="assign-people">${escapeHtml(t('lists.people'))}</button>
      </div>
    </div>`;
dialog.querySelector('#assign-cancel').addEventListener('click', () => dialog.close());
dialog.querySelector('#assign-people').addEventListener('click', () => {
dialog.close();
openPeopleDialog(list);
});
dialog.querySelectorAll('[data-who]').forEach((button) => {
button.addEventListener('click', () => {
dialog.close();
replaceList(assignItem(list, itemId, button.dataset.who || null));
});
});
dialog.showModal();
}
function openLineDialog(list, itemId) {
const item = list.items.find((entry) => entry.id === itemId);
if (!item) return;
const dialog = makeDialog();
dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('lists.lineTitle'))}</h2>
      <label class="visually-hidden" for="line-text">${escapeHtml(t('lists.lineTitle'))}</label>
      <input type="text" id="line-text" value="${escapeHtml(item.text)}" />
      <label>
        ${escapeHtml(t('lists.due'))}
        <input type="date" id="line-due" value="${escapeHtml(item.due || '')}" />
      </label>
      <p class="muted small">${escapeHtml(t('lists.dueHint'))}</p>
      <div class="row">
        <button type="button" class="button button--primary" id="line-save">${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" id="line-cancel">${escapeHtml(t('action.cancel'))}</button>
        <button type="button" class="button button--danger" id="line-delete">${escapeHtml(t('action.delete'))}</button>
      </div>
    </form>`;
const field = dialog.querySelector('#line-text');
const day = dialog.querySelector('#line-due');
const save = () => {
dialog.close();
replaceList(setItemDue(renameItem(list, itemId, field.value), itemId, day.value));
};
dialog.querySelector('#line-save').addEventListener('click', save);
field.addEventListener('keydown', (event) => {
if (event.key !== 'Enter') return;
event.preventDefault();
save();
});
dialog.querySelector('#line-cancel').addEventListener('click', () => dialog.close());
dialog.querySelector('#line-delete').addEventListener('click', () => {
dialog.close();
replaceList(removeItem(list, itemId));
});
dialog.showModal();
field.focus();
field.select();
}
function openPeopleEditor({ hint = '', confirmRemove, people, add, rename, remove, blocked = () => null, extra = null, roster = [] }) {
const dialog = makeDialog();
const fixed = roster.length > 0;
const listed = (name) => roster.some((one) => sameName(one) === sameName(name));
const draw = () => {
const current = people();
const free = roster.filter((name) => !current.some((person) => sameName(person.name) === sameName(name)));
dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(t('lists.people'))}</h2>
        ${hint ? `<p class="muted small">${escapeHtml(hint)}</p>` : ''}
        <div class="stack stack--tight">
          ${current
.map(
(person) => `
                <div class="knock">
                  <strong>${escapeHtml(person.name)}</strong>
                  ${extra ? extra.html(person) : ''}
                  ${
fixed && !listed(person.name)
? `<span class="late small">${escapeHtml(t('roster.notListed'))}</span>
                         ${free.length
? `<div class="row row--chips">
                                <span class="muted small">${escapeHtml(t('roster.isWho'))}</span>
                                ${free.map((name) => `<button type="button" class="chip" data-person-is="${escapeHtml(person.id)}" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}
                              </div>`
: ''}`
: ''
}
                  <div class="row">
                    ${
fixed
? ''
: `<button type="button" class="button button--small" data-rename="${escapeHtml(person.id)}">
                             ${escapeHtml(t('action.rename'))}
                           </button>`
}
                    <button type="button" class="button button--small button--ghost" data-remove="${escapeHtml(person.id)}">
                      ${escapeHtml(t('lists.dropPerson'))}
                    </button>
                  </div>
                </div>`,
)
.join('')}
          ${current.length ? '' : `<p class="muted small">${escapeHtml(t('lists.nobodyYet'))}</p>`}
        </div>
        ${
fixed
? `<div class="stack stack--tight">
                 <span class="muted small">${escapeHtml(t(free.length ? 'roster.addFrom' : 'roster.allIn'))}</span>
                 <div class="row row--chips">
                   ${free.map((name) => `<button type="button" class="chip" data-add-listed="${escapeHtml(name)}">+ ${escapeHtml(name)}</button>`).join('')}
                 </div>
               </div>`
: `<div class="row row--tight">
                 <input type="text" id="person-new" placeholder="${escapeHtml(t('lists.addPerson'))}"
                        aria-label="${escapeHtml(t('lists.addPerson'))}" autocomplete="off" />
                 <button type="button" class="button button--primary" id="person-add" aria-label="${escapeHtml(t('lists.addPerson'))}">+</button>
               </div>
               <p class="late small" id="person-problem" aria-live="polite" hidden></p>`
}
        <div class="row">
          <button type="button" class="button" id="people-close">${escapeHtml(t('action.close'))}</button>
        </div>
      </div>`;
const field = dialog.querySelector('#person-new');
const addOne = async () => {
if (!field.value.trim()) return;
const twin = people().find((person) => sameName(person.name) === sameName(field.value));
if (twin) {
const problem = dialog.querySelector('#person-problem');
problem.textContent = t('people.already', { name: twin.name });
problem.hidden = false;
field.select();
return;
}
if ((await add(field.value)) === false) return;
draw();
dialog.querySelector('#person-new').focus();
};
dialog.querySelector('#person-add')?.addEventListener('click', addOne);
field?.addEventListener('keydown', (event) => {
if (event.key !== 'Enter') return;
event.preventDefault();
addOne();
});
dialog.querySelectorAll('[data-add-listed]').forEach((chip) => {
chip.addEventListener('click', async () => {
if ((await add(chip.dataset.addListed)) === false) return;
draw();
});
});
dialog.querySelectorAll('[data-person-is]').forEach((chip) => {
chip.addEventListener('click', () => {
rename(chip.dataset.personIs, chip.dataset.name);
draw();
});
});
dialog.querySelectorAll('[data-rename]').forEach((button) => {
button.addEventListener('click', async () => {
const person = people().find((one) => one.id === button.dataset.rename);
if (!person) return;
const name = await askForText({
title: t('action.rename'),
hint: t('people.renameHint'),
value: person.name,
confirmLabel: t('action.save'),
});
if (name === null || !name.trim()) return;
if (people().some((other) => other.id !== person.id && sameName(other.name) === sameName(name))) {
flash(t('people.already', { name: name.trim() }), 'error');
dialog.close();
return;
}
rename(person.id, name);
draw();
});
});
dialog.querySelectorAll('[data-remove]').forEach((button) => {
button.addEventListener('click', async () => {
const refused = blocked(button.dataset.remove);
if (refused) {
flash(refused, 'error');
dialog.close();
return;
}
if (!(await ask(confirmRemove, { confirmLabel: t('lists.dropPerson'), danger: true }))) return;
remove(button.dataset.remove);
draw();
});
});
dialog.querySelector('#people-close').addEventListener('click', () => dialog.close());
extra?.bind(dialog, draw);
};
dialog.addEventListener('close', () => render());
draw();
dialog.showModal();
}
function openPeopleDialog(list) {
const held = () => getList(list.id) || list;
openPeopleEditor({
hint: t('lists.peopleHint'),
confirmRemove: t('lists.confirmRemovePerson'),
roster: rosterFor(held()),
people: () => held().people,
add: (name) => replaceList(addListPerson(held(), name), { redraw: false }),
rename: (id, name) => replaceList(renameListPerson(held(), id, name), { redraw: false }),
remove: (id) => replaceList(removeListPerson(held(), id), { redraw: false }),
});
}
function openListNameDialog(list) {
const dialog = makeDialog();
dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('lists.rename'))}</h2>
      <label class="visually-hidden" for="list-new-name">${escapeHtml(t('lists.name'))}</label>
      <input type="text" id="list-new-name" value="${escapeHtml(list.name)}" />
      <div class="row">
        <button type="button" class="button button--primary" id="name-save">${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" id="name-cancel">${escapeHtml(t('action.cancel'))}</button>
      </div>
    </form>`;
const field = dialog.querySelector('#list-new-name');
const save = () => {
dialog.close();
replaceList({ ...list, name: field.value.trim(), updatedAt: Date.now() });
};
dialog.querySelector('#name-save').addEventListener('click', save);
field.addEventListener('keydown', (event) => {
if (event.key !== 'Enter') return;
event.preventDefault();
save();
});
dialog.querySelector('#name-cancel').addEventListener('click', () => dialog.close());
dialog.showModal();
field.focus();
field.select();
}
function listText(list) {
const line = (item) =>
`${item.done ? '[x]' : '[ ]'} ${item.text}${item.who ? ` — ${personName(list, item.who)}` : ''}`;
const { done, total } = progress(list);
return [
listTitle(list),
t('lists.progress', { done, total }),
'',
...list.items.map(line),
].join('\n');
}
async function pullList(id) {
if (!state.remote) return false;
let stored = null;
try {
stored = await state.remote.get(id);
} catch {
return false;
}
if (stored === null) return whenAbsent(id);
return isValidList(stored) ? adoptList(stored) : false;
}
function adoptList(stored) {
const local = getList(stored.id);
const merged = local ? mergeLists(local, stored) : stored;
if (local && merged === local) return false;
const adopted = { ...merged, shared: true };
state.lists = local
? state.lists.map((list) => (list.id === stored.id ? adopted : list))
: [...state.lists, adopted];
saveLists(state.lists);
return true;
}

// ---- src/view-spends.js ----------------------------------------------
function spendTitle(spend) {
return spend.name || t('spends.untitled');
}
function myBalance(spend) {
const me = sameName(myNameFor(spend));
if (!me) return null;
return balances(spend).find((row) => sameName(row.name) === me) || null;
}
function spendCardHtml(spend) {
const mine = myBalance(spend);
const line = mine && mine.balance !== 0
? t(mine.balance > 0 ? 'spends.owedToMe' : 'spends.iOwe', { amount: money(Math.abs(mine.balance), spend) })
: t('spends.even');
return `
    <button type="button" class="game-card" data-goto="#/spend/${escapeHtml(spend.id)}">
      <span class="game-card__title">
        ${escapeHtml(spendTitle(spend))}
        <span class="pill">${escapeHtml(money(spendTotal(spend), spend))}</span>
      </span>
      ${peopleHtml(spend.people.map((person) => person.name))}
      <span class="game-card__meta">
        ${escapeHtml(formatDate(spend.updatedAt))} — <span class="${mine && mine.balance < 0 ? 'late' : ''}">${escapeHtml(line)}</span>
      </span>
      ${eventTagHtml(spend)}
    </button>`;
}
function agendaView() {
const today = dayNow();
const byDay = (a, b) => a.date.localeCompare(b.date) || String(a.at || '').localeCompare(String(b.at || ''));
const dated = shownDocs(state.polls).filter((poll) => isLive(poll) && poll.date);
const coming = dated.filter((poll) => lastDay(poll) >= today).sort(byDay);
const past = dated.filter((poll) => lastDay(poll) < today).sort(byDay).reverse();
const deciding = shownDocs(state.polls)
.filter((poll) => isLive(poll) && !poll.date && !poll.closedAt && seeksDay(poll))
.sort((a, b) => b.updatedAt - a.updatedAt);
const archivedEvents = shownDocs(state.polls).filter((poll) => isEvent(poll) && poll.archivedAt);
return `
    ${flashHtml()}
    ${newButtonHtml('#/agenda/new', t('events.new'), Boolean(dated.length || deciding.length))}
    ${groupChipsHtml()}

    ${
deciding.length
? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('polls.toDecide'))}</h2></div>
             <div class="game-list">${deciding.map(swipeable(pollCardHtml, isOrganiser)).join('')}</div>
           </section>`
: ''
}

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('events.coming'))}</h2></div>
      ${
coming.length
? `<div class="game-list">${coming.map(swipeable(eventCardHtml, isOrganiser)).join('')}</div>`
: hintHtml('agenda', t('events.none'))
}
      ${hiddenByGroupHtml(state.polls.filter((poll) => poll.date))}
    </section>
    ${coming.length && coming.length + deciding.length <= 2 ? hintHtml('agenda', t('hint.agenda')) : ''}

    ${
past.length
? `<details class="details">
             <summary>${escapeHtml(t('events.past', { count: past.length }))}</summary>
             <div class="game-list">${past.map(swipeable(eventCardHtml, isOrganiser)).join('')}</div>
           </details>`
: ''
}

    ${archivedHtml(archivedEvents, swipeable(eventCardHtml, isOrganiser))}`;
}
function spendsView() {
const sorted = [...shownDocs(state.spends)].sort((a, b) => b.updatedAt - a.updatedAt);
const live = sorted.filter(isLive);
const settled = (spend) => spend.lines.length && balances(spend).every((row) => row.balance === 0);
const open = live.filter((spend) => !settled(spend));
const done = live.filter(settled);
return `
    ${flashHtml()}
    ${kindsHtml('spends')}
    ${newButtonHtml('#/spends/new', t('spends.new'), live.length > 0)}
    ${groupChipsHtml()}

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('kinds.ongoing'))}</h2></div>
      ${
open.length
? `<div class="game-list">${open.map(swipeable(spendCardHtml)).join('')}</div>`
: hintHtml('spends', t('spends.none'))
}
      ${hiddenByGroupHtml(state.spends)}
    </section>
    ${open.length && live.length <= 2 ? hintHtml('spends', t('hint.spends')) : ''}

    ${
done.length
? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('spends.settled'))}</h2></div>
             <div class="game-list">${done.map(swipeable(spendCardHtml)).join('')}</div>
           </section>`
: ''
}

    ${archivedHtml(sorted, swipeable(spendCardHtml))}`;
}
function eventCardHtml(poll) {
const { list, spend, polls, boards, games, activities } = eventParts(poll, state);
const when = poll.date ? whenText(poll, { long: true }) : t('activity.unscheduled');
const parts = [];
if (list) {
const { done, total } = progress(list);
parts.push(total ? `${t('event.list')} : ${t('lists.progress', { done, total })}` : `${t('event.list')} : ${t('lists.empty')}`);
}
if (spend) parts.push(t('spends.total', { amount: money(spendTotal(spend), spend) }));
if (polls.length) parts.push(t('count.polls', { count: polls.length }));
if (boards.length) parts.push(t('count.boards', { count: boards.length }));
if (games.length) parts.push(t('count.games', { count: games.length }));
const programme = activities.slice(0, 3).map((one) => [one.date ? whenText(one) : '', eventName(one) || pollTitle(one)].filter(Boolean).join(' '));
if (activities.length > 3) programme.push('…');
return `
    <button type="button" class="game-card" data-goto="#/poll/${escapeHtml(poll.id)}">
      <span class="game-card__title">
        ${escapeHtml(eventName(poll) || pollTitle(poll))}
        <span class="pill">${escapeHtml(when)}</span>
      </span>
      ${peopleHtml(poll.people.map((person) => person.name))}
      ${parts.length ? `<span class="game-card__meta">${escapeHtml(parts.join(' · '))}</span>` : ''}
      ${programme.length ? `<span class="game-card__meta">${escapeHtml(t('activity.onProgramme', { items: programme.join(' · ') }))}</span>` : ''}
      ${talkSumHtml(poll)}
    </button>`;
}
function newEventView() {
const suggestions = [...new Set([
myName(), ...recentPeople(state.polls), ...recentPeople(state.lists), ...recentPeople(state.spends), ...recentNames(state.games),
].filter(Boolean))].filter((name) => !writtenNames(state.newEventPeople).has(name.toLowerCase())).slice(0, 12);
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/agenda')}
      <h1>${escapeHtml(t('events.new'))}</h1>
    </div>

    <form id="new-event" class="card stack">
      <label>
        ${escapeHtml(t('events.name'))}
        <input type="text" id="event-name" placeholder="${escapeHtml(t('polls.eventNamePlaceholder'))}"
               value="${escapeHtml(state.newEventName)}" required />
      </label>

      <div class="row">
        <label>
          ${escapeHtml(t('events.day'))}
          <input type="date" id="event-day" value="${escapeHtml(state.newEventDay)}" required />
        </label>
        <label>
          ${escapeHtml(t('polls.hour'))}
          <input type="time" id="event-hour" value="${escapeHtml(state.newEventHour)}" />
        </label>
      </div>
      <label>
        ${escapeHtml(t('events.until'))}
        <input type="date" id="event-until" value="${escapeHtml(state.newEventUntil)}" />
      </label>

      ${rosterPickHtml(state.newEventPeople, t('events.peopleHint')) || `
      <div class="stack stack--tight">
        <span class="muted small">${escapeHtml(t('events.peopleHint'))}</span>
        ${state.newEventPeople
.map(
(name, index) => `
              <input type="text" data-person-index="${index}" value="${escapeHtml(name)}"
                     placeholder="${escapeHtml(t('lists.person', { n: index + 1 }))}"
                     aria-label="${escapeHtml(t('lists.person', { n: index + 1 }))}" />`,
)
.join('')}
        <div class="row">
          <button type="button" class="button button--small" id="add-person">+ ${escapeHtml(t('lists.addPerson'))}</button>
          ${
state.newEventPeople.length > 1
? `<button type="button" class="button button--small button--ghost" id="drop-person">− ${escapeHtml(t('lists.dropPerson'))}</button>`
: ''
}
        </div>
        ${
suggestions.length
? `<div class="row">${suggestions
.map((name) => `<button type="button" class="chip" data-suggest="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
.join('')}</div>`
: ''
}
      </div>`}

      ${willBeInHtml({ events: false })}

      <button type="submit" class="button button--primary button--block">${escapeHtml(t('events.create'))}</button>
    </form>`;
}
function bindNewEvent() {
const form = view.querySelector('#new-event');
if (!form) return;
keepUntilAfter(view.querySelector('#event-day'), view.querySelector('#event-until'));
const snapshot = () => {
state.newEventName = view.querySelector('#event-name').value;
state.newEventDay = view.querySelector('#event-day').value;
state.newEventHour = view.querySelector('#event-hour').value;
state.newEventUntil = view.querySelector('#event-until').value;
view.querySelectorAll('[data-person-index]').forEach((input) => {
state.newEventPeople[Number(input.dataset.personIndex)] = input.value;
});
};
view.querySelector('#add-person')?.addEventListener('click', () => {
snapshot();
state.newEventPeople = [...state.newEventPeople, ''];
render();
view.querySelector(`[data-person-index="${state.newEventPeople.length - 1}"]`)?.focus();
});
view.querySelector('#drop-person')?.addEventListener('click', () => {
snapshot();
state.newEventPeople = state.newEventPeople.slice(0, -1);
render();
});
bindRosterPick(view, () => state.newEventPeople, (names) => {
state.newEventPeople = names;
});
view.querySelector('form')?.addEventListener('rosterchange', () => {
snapshot();
render();
});
view.querySelectorAll('[data-new-group]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
state.newGroupChoice = { touched: true, id: chip.dataset.newGroup || null };
render();
});
});
view.querySelectorAll('[data-suggest]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
const { suggest } = chip.dataset;
if (state.newEventPeople.some((name) => sameName(name) === sameName(suggest))) return;
const empty = state.newEventPeople.findIndex((name) => !name.trim());
if (empty >= 0) state.newEventPeople[empty] = suggest;
else state.newEventPeople = [...state.newEventPeople, suggest];
render();
});
});
form.addEventListener('submit', (event) => {
event.preventDefault();
snapshot();
const poll = signedEvent(organise(landing(createEvent({
name: state.newEventName,
names: peopleForNew(state.newEventPeople),
date: state.newEventDay,
at: state.newEventHour,
until: state.newEventUntil,
}), { forEvent: false })));
state.polls = [...state.polls, poll];
persistPoll(poll);
resetGroupChoice();
state.newEventName = '';
state.newEventDay = '';
state.newEventHour = '';
state.newEventUntil = '';
state.newEventPeople = withMeFirst(['', ''], myName());
navigate(`#/poll/${poll.id}`);
});
}
function newSpendView() {
const suggestions = [...new Set([
myName(), ...recentPeople(state.spends), ...recentPeople(state.lists), ...recentNames(state.games),
].filter(Boolean))].filter((name) => !writtenNames(state.newSpendPeople).has(name.toLowerCase())).slice(0, 12);
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/spends')}
      <h1>${escapeHtml(t('spends.new'))}</h1>
    </div>

    <form id="new-spend" class="card stack">
      <label>
        ${escapeHtml(t('spends.name'))}
        <input type="text" id="spend-name" placeholder="${escapeHtml(t('spends.namePlaceholder'))}"
               value="${escapeHtml(state.newSpendName)}" required />
      </label>

      <label>
        ${escapeHtml(t('spends.currency'))}
        <select id="spend-currency">
          ${CURRENCIES.map((code) => `<option value="${code}" ${code === state.newSpendCurrency ? 'selected' : ''}>${escapeHtml(currencyName(code))}</option>`).join('')}
        </select>
      </label>

      ${rosterPickHtml(state.newSpendPeople, t('spends.peopleHint')) || `
      <div class="stack stack--tight">
        <span class="muted small">${escapeHtml(t('spends.peopleHint'))}</span>
        ${state.newSpendPeople
.map(
(name, index) => `
              <input type="text" data-person-index="${index}" value="${escapeHtml(name)}"
                     placeholder="${escapeHtml(t('lists.person', { n: index + 1 }))}"
                     aria-label="${escapeHtml(t('lists.person', { n: index + 1 }))}" />`,
)
.join('')}
        <div class="row">
          <button type="button" class="button button--small" id="add-person">+ ${escapeHtml(t('lists.addPerson'))}</button>
          ${
state.newSpendPeople.length > 1
? `<button type="button" class="button button--small button--ghost" id="drop-person">− ${escapeHtml(t('lists.dropPerson'))}</button>`
: ''
}
        </div>
        ${
suggestions.length
? `<div class="row">${suggestions
.map((name) => `<button type="button" class="chip" data-suggest="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
.join('')}</div>`
: ''
}
      </div>`}

      ${willBeInHtml()}

      <button type="submit" class="button button--primary button--block">${escapeHtml(t('spends.create'))}</button>
    </form>`;
}
function settleText(spend) {
const moves = settle(spend);
const paidTo = [...new Set(moves.map((move) => move.toId))]
.map((id) => spend.people.find((person) => person.id === id))
.filter((person) => payOf(person));
return [
`${spendTitle(spend)} — ${t('spends.total', { amount: money(spendTotal(spend), spend) })}`,
'',
t('spends.settle'),
...moves.map((move) => `${t('spends.move', { from: move.from, to: move.to })} — ${money(move.amount, spend)}`),
...(paidTo.length ? ['', ...paidTo.map((person) => `${t('spends.payTo', { name: person.name })} ${payOf(person)}`)] : []),
].join('\n');
}
function remindText(spend, move) {
const pay = payOf(spend.people.find((person) => person.id === move.toId));
return [
t('spends.remindText', { from: move.from, to: move.to, amount: money(move.amount, spend), name: spendTitle(spend) }),
...(pay ? [`${t('spends.payTo', { name: move.to })} ${pay}`] : []),
].join('\n');
}
function payElsewhere(name) {
const key = sameName(name);
for (const other of [...state.spends].sort((a, b) => (b.peopleAt || 0) - (a.peopleAt || 0))) {
const person = other.people.find((one) => sameName(one.name) === key && payOf(one));
if (person) return payOf(person);
}
return '';
}
function money(cents, spend) {
return showAmount(cents, getLanguage(), spendCurrency(spend));
}
function currencySymbol(code) {
try {
return new Intl.NumberFormat(getLanguage(), { style: 'currency', currency: code })
.formatToParts(0).find((part) => part.type === 'currency')?.value || code;
} catch {
return code;
}
}
function currencyName(code) {
try {
const symbol = currencySymbol(code);
const name = new Intl.DisplayNames([getLanguage()], { type: 'currency' }).of(code) || code;
return `${symbol} — ${name}`;
} catch {
return code;
}
}
function typedAmount(cents) {
const text = ((Number(cents) || 0) / 100).toFixed(2);
return getLanguage() === 'fr' ? text.replace('.', ',') : text;
}
function typedRate(rate) {
const text = String(readRate(rate) ?? '');
return getLanguage() === 'fr' ? text.replace('.', ',') : text;
}
function rateText(spend, currency, rate) {
return `1 ${currencySymbol(spendCurrency(spend))} = ${typedRate(rate)} ${currencySymbol(currency)}`;
}
function paidInChoices(spend) {
const met = spend.lines.map((line) => paidInOf(spend, line)?.currency).filter(Boolean);
return [...new Set([spendCurrency(spend), ...met, ...PAID_IN])];
}
function amountFieldHtml(spend, { id, cents = null, paid = null, pill = false }) {
const own = spendCurrency(spend);
const currency = paid?.currency || own;
const typed = paid ? paid.amount : cents;
return `
    <div class="amount-block" data-amount-field>
      <label>
        ${escapeHtml(t('spends.amount'))}
        <span class="${pill ? 'field-pill field-pill--amount' : 'amount-field'}">
          <input type="text" id="${id}" data-amount-input inputmode="decimal" placeholder="0,00" autocomplete="off"
                 value="${typed ? escapeHtml(typedAmount(typed)) : ''}" />
          <span class="field-pill__suffix currency-pick">
            <span data-currency-sign>${escapeHtml(currencySymbol(currency))}</span><span class="currency-pick__caret" aria-hidden="true">▾</span>
            <select data-currency aria-label="${escapeHtml(t('spends.paidInLabel'))}">
              ${paidInChoices(spend).map((code) => `<option value="${code}" ${code === currency ? 'selected' : ''}>${escapeHtml(currencyName(code))}</option>`).join('')}
            </select>
          </span>
        </span>
      </label>
      <div class="rate-row" data-rate-row ${currency === own ? 'hidden' : ''}>
        <label class="rate-row__rate">
          <span data-rate-from>1 ${escapeHtml(currencySymbol(own))} =</span>
          <input type="text" data-rate inputmode="decimal" autocomplete="off" ${pill ? 'class="field-pill"' : ''}
                 value="${paid ? escapeHtml(typedRate(paid.rate)) : ''}" aria-label="${escapeHtml(t('spends.rateLabel'))}" />
          <span data-rate-sign>${escapeHtml(currencySymbol(currency))}</span>
        </label>
        <span class="muted small" data-converted aria-live="polite"></span>
      </div>
      <p class="late small" data-amount-problem aria-live="polite" hidden></p>
    </div>`;
}
function bindAmountField(root, spend, changed = () => {}) {
const box = root.querySelector('[data-amount-field]');
const own = spendCurrency(spend);
const input = box.querySelector('[data-amount-input]');
const pick = box.querySelector('[data-currency]');
const rate = box.querySelector('[data-rate]');
const note = box.querySelector('[data-converted]');
const amountProblem = box.querySelector('[data-amount-problem]');
const read = () => {
const currency = pick.value || own;
const typed = readAmount(input.value);
if (currency === own) return { cents: typed, amount: typed, currency, rate: null, error: typed ? null : 'amount' };
const kept = readRate(rate.value);
return {
cents: typed && kept ? convertPaid(typed, kept) : null,
amount: typed, currency, rate: kept,
error: !typed ? 'amount' : kept ? null : 'rate',
};
};
const refresh = () => {
const now = read();
box.querySelector('[data-currency-sign]').textContent = currencySymbol(now.currency);
box.querySelector('[data-rate-sign]').textContent = currencySymbol(now.currency);
box.querySelector('[data-rate-row]').hidden = now.currency === own;
note.classList.remove('late');
if (now.amount) amountProblem.hidden = true;
note.textContent = now.cents && now.currency !== own ? t('spends.converted', { amount: money(now.cents, spend) }) : '';
};
pick.addEventListener('change', () => {
if (pick.value !== own && !readRate(rate.value)) {
const known = lastRate(spend, pick.value, state.spends);
rate.value = known ? typedRate(known) : '';
}
refresh();
changed();
if (pick.value !== own && !rate.value) rate.focus();
});
for (const field of [input, rate]) {
field.addEventListener('input', () => {
refresh();
changed();
});
}
refresh();
const problem = (inField = true) => {
const now = read();
if (now.error === 'rate') {
note.textContent = t('spends.notARate', { sign: currencySymbol(own) });
note.classList.add('late');
rate.focus();
} else {
amountProblem.textContent = t('spends.notAnAmount');
amountProblem.hidden = !inField;
input.focus();
}
return now.error === 'rate' ? t('spends.notARate', { sign: currencySymbol(own) }) : t('spends.notAnAmount');
};
return { read, problem };
}
function partsShown(value) {
const whole = Math.floor(value);
return `${whole || ''}${value % 1 ? '½' : ''}`;
}
function partsText(value) {
return t('spends.partsCount', { count: value, shown: partsShown(value) });
}
function weightMarkHtml(person) {
const weight = weightOf(person);
return weight === 1 ? '' : ` <span class="split-row__weight">×${escapeHtml(partsShown(weight))}</span>`;
}
function splitEditorHtml(spend, { forWhom = [], parts = null, fixed = null, groups = [] } = {}) {
const open = Boolean(Object.keys(parts || {}).length || Object.keys(fixed || {}).length);
const rows = spend.people.map((person) => {
const id = escapeHtml(person.id);
const ticked = !forWhom.length || forWhom.includes(person.id);
const own = readParts(parts?.[person.id]) ?? weightOf(person);
const apart = Number.isInteger(fixed?.[person.id]) ? fixed[person.id] : null;
return `
      <div class="split-row" data-split-row="${id}">
        <label class="split-row__who">
          <input type="checkbox" data-for="${id}" ${ticked ? 'checked' : ''} />
          <span class="split-row__name">${escapeHtml(person.name)}${weightMarkHtml(person)}</span>
        </label>
        <span class="split-row__share" data-share-of="${id}"></span>
        <span class="split-row__more">
          <span class="stepper" role="group" aria-label="${escapeHtml(t('spends.partsOf', { name: person.name }))}">
            <button type="button" class="stepper__button" data-parts-step="-1" aria-label="${escapeHtml(t('spends.partsLess'))}">−</button>
            <span class="stepper__value" data-parts-of="${id}" data-value="${own}">${escapeHtml(partsText(own))}</span>
            <button type="button" class="stepper__button" data-parts-step="1" aria-label="${escapeHtml(t('spends.partsMore'))}">+</button>
          </span>
          <input type="text" inputmode="decimal" class="split-row__apart" data-apart-of="${id}" autocomplete="off"
                 value="${apart ? escapeHtml(typedAmount(apart)) : ''}"
                 aria-label="${escapeHtml(t('spends.apartOf', { name: person.name }))}" />
        </span>
      </div>`;
});
return `
    <div class="split-list ${open ? 'split-list--open' : ''}" data-split>
      <div class="split-list__head">
        <span>${escapeHtml(t('spends.splitTitle'))}</span>
        <span class="muted small" data-split-note aria-live="polite"></span>
      </div>
      ${
groups.length
? `<div class="row row--chips split-list__groups">
               <button type="button" class="chip" data-split-group="">${escapeHtml(t('spends.everyoneChip'))}</button>
               ${groups.map((group) => `<button type="button" class="chip" data-split-group="${escapeHtml(group.ids.join(' '))}">${escapeHtml(group.name)}</button>`).join('')}
             </div>`
: ''
}
      ${rows.join('')}
      <button type="button" class="split-list__open" data-split-open>${escapeHtml(t('spends.splitOther'))}</button>
    </div>`;
}
function bindSplitEditor(root, spend, amount) {
const box = root.querySelector('[data-split]');
if (!box) return { read: () => ({ forWhom: [], parts: null, fixed: null, error: null }), refresh: () => {} };
const boxes = () => [...box.querySelectorAll('[data-for]')];
const isOpen = () => box.classList.contains('split-list--open');
const read = () => {
const ticked = boxes().filter((one) => one.checked).map((one) => one.dataset.for);
const forWhom = ticked.length === boxes().length ? [] : ticked;
const parts = {};
const fixed = {};
let unreadable = false;
if (isOpen()) {
for (const node of box.querySelectorAll('[data-parts-of]')) parts[node.dataset.partsOf] = Number(node.dataset.value);
for (const input of box.querySelectorAll('[data-apart-of]')) {
if (!input.value.trim() || !ticked.includes(input.dataset.apartOf)) continue;
const cents = readAmount(input.value);
if (cents) fixed[input.dataset.apartOf] = cents;
else unreadable = true;
}
}
const total = amount();
const apart = Object.values(fixed).reduce((sum, cents) => sum + cents, 0);
const problem = total ? splitProblem(spend, { amount: total, forWhom, fixed }) : null;
let error = null;
if (!ticked.length) error = t('spends.noOneChosen');
else if (unreadable) error = t('spends.notAnAmount');
else if (problem === 'over') error = t('spends.apartOver', { amount: money(apart - total, spend) });
else if (problem === 'left') error = t('spends.apartLeft', { amount: money(total - apart, spend) });
return { forWhom, parts, fixed, error };
};
const refresh = () => {
const now = read();
const total = amount();
const shares = total && !now.error
? lineShares(spend, { amount: total, forWhom: now.forWhom, parts: now.parts, fixed: now.fixed })
: new Map();
for (const node of box.querySelectorAll('[data-share-of]')) {
const cents = shares.get(node.dataset.shareOf);
node.textContent = cents === undefined ? '' : money(cents, spend);
}
for (const input of box.querySelectorAll('[data-apart-of]')) {
const cents = shares.get(input.dataset.apartOf);
input.placeholder = cents === undefined ? '' : typedAmount(cents);
}
const weighted = spend.people.some((person) => weightOf(person) !== 1);
const note = box.querySelector('[data-split-note]');
note.textContent = now.error || t(isOpen() ? 'spends.splitOpenHint' : weighted ? 'spends.splitPartsHint' : 'spends.splitHint');
note.classList.toggle('late', Boolean(now.error));
};
box.addEventListener('change', refresh);
box.addEventListener('input', (event) => {
const id = event.target.dataset?.apartOf;
if (id && event.target.value.trim()) {
const tick = boxes().find((one) => one.dataset.for === id);
if (tick) tick.checked = true;
}
refresh();
});
box.querySelectorAll('[data-parts-step]').forEach((button) => {
button.addEventListener('click', () => {
const value = button.closest('.stepper').querySelector('[data-parts-of]');
const next = stepParts(Number(value.dataset.value), Number(button.dataset.partsStep));
value.dataset.value = String(next);
value.textContent = partsText(next);
refresh();
});
});
box.querySelector('[data-split-open]')?.addEventListener('click', () => {
box.classList.add('split-list--open');
refresh();
box.querySelector('[data-parts-step]')?.focus();
});
box.querySelectorAll('[data-split-group]').forEach((chip) => {
chip.addEventListener('click', () => {
const ids = chip.dataset.splitGroup ? chip.dataset.splitGroup.split(' ') : null;
for (const tick of boxes()) tick.checked = !ids || ids.includes(tick.dataset.for);
refresh();
});
});
refresh();
return { read, refresh };
}
function spendLineHtml(spend, line) {
const who = spend.people.find((person) => person.id === line.by)?.name || '';
if (isRepayment(line)) {
const to = spend.people.find((person) => person.id === line.forWhom[0])?.name || '';
return swipeHtml(line.id, `
        <button type="button" class="line__text" data-spend-line="${escapeHtml(line.id)}">
          <span>${escapeHtml(t('spends.repaid', { from: who, to }))}</span>
          <span class="line__due">${escapeHtml(t('spends.repayment'))}${line.day ? ` · ${escapeHtml(formatDay(line.day))}` : ''}</span>
        </button>
        <span class="line__amount">${escapeHtml(money(line.amount, spend))}</span>`,
{ kind: 'line', tag: 'li', bodyClass: 'line line--money line--repay' });
}
const forWhom = line.forWhom.length
? spend.people.filter((person) => line.forWhom.includes(person.id)).map((person) => person.name).join(', ')
: t('spends.everyone');
const paid = paidInOf(spend, line);
return swipeHtml(line.id, `
      <button type="button" class="line__text" data-spend-line="${escapeHtml(line.id)}">
        <span>${escapeHtml(line.text || t('spends.untitledLine'))}</span>
        <span class="line__due">
          ${escapeHtml(who ? t('spends.paidBy', { name: who }) : t('spends.paidByNobody'))}
          · ${escapeHtml(t('spends.forWhom', { names: forWhom }))}${
line.parts || line.fixed ? ` · ${escapeHtml(t('spends.splitOwn'))}` : ''
}${paid ? ` · ${escapeHtml(t('spends.paidIn', {
amount: showAmount(paid.amount, getLanguage(), paid.currency), rate: rateText(spend, paid.currency, paid.rate),
}))}` : ''}${line.day ? ` · ${escapeHtml(formatDay(line.day))}` : ''}
        </span>
      </button>
      <span class="line__amount">${escapeHtml(money(line.amount, spend))}</span>`,
{ kind: 'line', tag: 'li', bodyClass: 'line line--money' });
}
function spendView(spend) {
if (state.spendTabId !== spend.id) {
state.spendTabId = spend.id;
state.spendTab = 'expenses';
}
const rows = balances(spend);
const moves = settle(spend);
const me = sameName(myNameFor(spend));
const segmented = `
    <div class="segmented" role="tablist" aria-label="${escapeHtml(t('spends.sections'))}">
      <button type="button" class="segmented__option" data-spend-tab="expenses"
              role="tab" aria-selected="${state.spendTab === 'expenses' ? 'true' : 'false'}"
              aria-current="${state.spendTab === 'expenses' ? 'true' : 'false'}">
        ${escapeHtml(t('spend.tabExpenses'))}
      </button>
      <button type="button" class="segmented__option" data-spend-tab="balances"
              role="tab" aria-selected="${state.spendTab === 'balances' ? 'true' : 'false'}"
              aria-current="${state.spendTab === 'balances' ? 'true' : 'false'}">
        ${escapeHtml(t('spend.tabBalances'))}
      </button>
    </div>`;
const formShut = spend.lines.length > 0 && state.spendFormOpen !== spend.id;
const waiting = listsFeeding(spend, everything())
.map((list) => ticketOffersHtml(list, spend, t('flows.fromList', { name: documentTitle(list) })))
.filter(Boolean);
const expensesTab = `
    ${
waiting.length
? `<section class="card stack flows" aria-label="${escapeHtml(t('flows.waiting'))}">${waiting.join('')}</section>`
: ''
}
    ${
spend.people.length && formShut
? `<button type="button" class="button button--block" id="spend-add-open">+ ${escapeHtml(t('spends.addOpen'))}</button>`
: spend.people.length
? `<form id="add-spend" class="card stack">
             <label>
               ${escapeHtml(t('spends.what'))}
               <input class="field-pill" type="text" id="spend-text"
                      placeholder="${escapeHtml(t('spends.textPlaceholder'))}" autocomplete="off" />
             </label>

             ${amountFieldHtml(spend, { id: 'spend-amount', pill: true })}

             <div class="field-row">
               <label>
                 ${escapeHtml(t('spends.by'))}
                 <select class="field-pill" id="spend-by">
                   ${spend.people
.map(
(person) => `<option value="${escapeHtml(person.id)}" ${me && sameName(person.name) === me ? 'selected' : ''}>
                          ${escapeHtml(person.name)}
                        </option>`,
)
.join('')}
                 </select>
               </label>
               <label>
                 ${escapeHtml(t('spends.when'))}
                 <input class="field-pill" type="date" id="spend-day" value="${escapeHtml(dayNow())}" />
               </label>
             </div>

             ${spend.people.length > 1 ? splitEditorHtml(spend, { groups: forWhomGroups(spend, everything()) }) : ''}

             <button type="submit" class="button button--primary button--block field-pill--submit">
               ${escapeHtml(t('spends.add'))}
             </button>
           </form>`
: `<p class="muted small">${escapeHtml(t('spends.noPeople'))}</p>`
}

    ${
spend.lines.length
? `<ul class="lines">${[...spend.lines]
.sort((a, b) => (b.day || '').localeCompare(a.day || '') || b.createdAt - a.createdAt)
.map((line) => spendLineHtml(spend, line))
.join('')}</ul>`
: `<p class="muted small">${escapeHtml(t('spends.addFirst'))}</p>`
}
    ${spend.people.length && spend.lines.length <= 2 ? hintHtml('spends', t('hint.spend')) : ''}`;
const balancesTab = !spend.lines.length
? `<p class="muted small">${escapeHtml(t('spends.balancesEmpty'))}</p>`
: `
    <section class="section card">
      <div class="section__head"><h2>${escapeHtml(t('spends.balances'))}</h2></div>
      <div class="entries">
        ${rows
.map(
(row) => `
              <div class="entry">
                <span class="entry__what">
                  ${escapeHtml(row.name)}${weightMarkHtml(spend.people.find((person) => person.id === row.id))}
                  <span class="muted small entry__detail">${escapeHtml([
row.paid ? t('spends.paidTotal', { amount: money(row.paid, spend) }) : '',
t('spends.shareTotal', { amount: money(row.owed, spend) }),
].filter(Boolean).join(' · '))}</span>
                </span>
                <span class="entry__value ${row.balance > 0 ? 'entry__value--good' : row.balance < 0 ? 'entry__value--bad' : ''}">
                  ${escapeHtml(
row.balance === 0
? t('spends.even')
: t(row.balance > 0 ? 'spends.isOwed' : 'spends.owes', {
amount: money(Math.abs(row.balance), spend),
}),
)}
                </span>
              </div>`,
)
.join('')}
      </div>
    </section>

    ${
moves.length
? `<section class="section card">
             <div class="section__head"><h2>${escapeHtml(t('spends.settle'))}</h2></div>
             <div class="entries">
               ${moves
.map(
(move, index, all) => {
const pay = payOf(spend.people.find((person) => person.id === move.toId));
const first = all.findIndex((other) => other.toId === move.toId) === index;
return `
                     <div class="move">
                       <div class="entry">
                         <span class="entry__what">${escapeHtml(t('spends.move', { from: move.from, to: move.to }))}</span>
                         <span class="entry__value">${escapeHtml(money(move.amount, spend))}</span>
                       </div>
                       ${
pay && first
? `<p class="move__pay small">
                                <span class="muted">${escapeHtml(t('spends.payTo', { name: move.to }))}</span>
                                <span class="move__pay-text">${escapeHtml(pay)}</span>
                              </p>`
: ''
}
                       <div class="move__actions">
                         <button type="button" class="button button--small button--primary" data-repay="${index}">
                           ${escapeHtml(t('spends.markPaid'))}
                         </button>
                         <button type="button" class="button button--small" data-remind="${index}">
                           ${escapeHtml(t('spends.remind', { name: move.from }))}
                         </button>
                       </div>
                       ${
first
? `<button type="button" class="button button--small button--ghost move__pay-edit" data-pay-edit="${escapeHtml(move.toId)}">
                                ${escapeHtml(pay ? t('spends.payEdit', { name: move.to }) : t('spends.payAdd', { name: move.to }))}
                              </button>`
: ''
}
                     </div>`;
},
)
.join('')}
             </div>
             <p class="muted small">${escapeHtml(t('spends.settleHint'))}</p>
             <button type="button" class="button button--small" id="settle-text">${escapeHtml(t('spends.settleSend'))}</button>
           </section>`
: `<div class="settled-banner">
             <span class="settled-banner__icon" aria-hidden="true">👍</span>
             <span>
               <strong class="settled-banner__title">${escapeHtml(t('spends.allSettled'))}</strong>
               <br />
               <span class="muted small">${escapeHtml(t('spends.allSettledHint'))}</span>
             </span>
           </div>`
}`;
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/spends')}
      <div>
        <h1>${escapeHtml(spendTitle(spend))}</h1>
        <p class="muted small">
          ${escapeHtml(t('spends.total', { amount: money(spendTotal(spend), spend) }))}
          ${spend.shared ? ` · ${escapeHtml(t('lists.sharedMark'))}` : ''}
        </p>
      </div>
    </div>

    ${eventLinkHtml(spend)}

    ${inGroupHtml(spend)}

    ${state.remote ? shareBarHtml(`<button type="button" class="button button--primary" id="spend-share">${escapeHtml(t('spends.share'))}</button>`) : ''}

    ${segmented}

    ${state.spendTab === 'balances' ? balancesTab : expensesTab}

    ${attachedHtml(spend)}

    ${actionsHtml(`
        <button type="button" class="button button--small" id="spend-people">${escapeHtml(t('lists.people'))}</button>`, `
        <button type="button" class="button button--small button--ghost" id="spend-rename">${escapeHtml(t('spends.rename'))}</button>
        ${chainButtonsHtml(spend)}
        <button type="button" class="button button--small button--ghost" id="spend-archive">
          ${escapeHtml(spend.archivedAt ? t('archive.back') : t('archive.put'))}
        </button>
        <button type="button" class="button button--small button--ghost" id="spend-delete">${escapeHtml(t('action.delete'))}</button>`)}`;
}
function bindNewSpend() {
const form = view.querySelector('#new-spend');
if (!form) return;
const snapshot = () => {
state.newSpendName = view.querySelector('#spend-name').value;
state.newSpendCurrency = view.querySelector('#spend-currency')?.value || 'EUR';
view.querySelectorAll('[data-person-index]').forEach((input) => {
state.newSpendPeople[Number(input.dataset.personIndex)] = input.value;
});
};
view.querySelector('#add-person')?.addEventListener('click', () => {
snapshot();
state.newSpendPeople = [...state.newSpendPeople, ''];
render();
});
view.querySelector('#drop-person')?.addEventListener('click', () => {
snapshot();
state.newSpendPeople = state.newSpendPeople.slice(0, -1);
render();
});
bindRosterPick(view, () => state.newSpendPeople, (names) => {
state.newSpendPeople = names;
});
view.querySelector('form')?.addEventListener('rosterchange', () => {
snapshot();
render();
});
view.querySelectorAll('[data-new-group]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
state.newGroupChoice = { touched: true, id: chip.dataset.newGroup || null };
render();
});
});
view.querySelectorAll('[data-suggest]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
const { suggest } = chip.dataset;
if (state.newSpendPeople.some((name) => name.trim().toLowerCase() === suggest.toLowerCase())) return;
const empty = state.newSpendPeople.findIndex((name) => !name.trim());
if (empty >= 0) state.newSpendPeople[empty] = suggest;
else state.newSpendPeople = [...state.newSpendPeople, suggest];
render();
});
});
form.addEventListener('submit', (event) => {
event.preventDefault();
snapshot();
const spend = landing(createSpend({
name: state.newSpendName,
names: peopleForNew(state.newSpendPeople),
currency: state.newSpendCurrency,
}));
state.spends = [...state.spends, spend];
persistSpend(spend);
resetGroupChoice();
state.newSpendName = '';
state.newSpendCurrency = 'EUR';
state.newSpendPeople = withMeFirst(['', ''], myName());
navigate(`#/spend/${spend.id}`);
});
}
function bindSpend(spend) {
bindData();
bindSwipes('line', (lineId) => {
const current = getSpend(spend.id);
if (!current) return;
replaceSpend(removeSpend(current, lineId));
}, { undo: t('swipe.lineDeleted') });
view.querySelectorAll('[data-spend-tab]').forEach((button) => {
button.addEventListener('click', () => {
state.spendTab = button.dataset.spendTab;
render();
});
});
view.querySelector('#spend-add-open')?.addEventListener('click', () => {
state.spendFormOpen = spend.id;
render();
view.querySelector('#spend-text')?.focus();
});
const addForm = view.querySelector('#add-spend');
let split = null;
const amountField = addForm ? bindAmountField(addForm, spend, () => split?.refresh()) : null;
split = addForm ? bindSplitEditor(addForm, spend, () => amountField.read().cents) : null;
addForm?.addEventListener('submit', (event) => {
event.preventDefault();
const text = view.querySelector('#spend-text');
const paid = amountField.read();
if (paid.error) {
amountField.problem();
return;
}
const shared = split.read();
if (shared.error) {
addForm.querySelector('[data-split-note]')?.scrollIntoView({ block: 'center' });
return;
}
state.spendFormOpen = null;
replaceSpend(addSpend(spend, {
text: text.value,
amount: paid.amount,
currency: paid.currency,
rate: paid.rate,
by: view.querySelector('#spend-by').value,
forWhom: shared.forWhom,
parts: shared.parts,
fixed: shared.fixed,
day: view.querySelector('#spend-day')?.value || dayNow(),
}));
});
view.querySelectorAll('[data-spend-line]').forEach((button) => {
button.addEventListener('click', () => {
const line = spend.lines.find((entry) => entry.id === button.dataset.spendLine);
if (isRepayment(line)) openRepayDialog(spend, { line });
else openSpendLineDialog(spend, button.dataset.spendLine);
});
});
view.querySelector('#settle-text')?.addEventListener('click', () => {
showCopyDialog({ title: spendTitle(spend), hint: t('lists.textHint'), text: settleText(spend) });
});
view.querySelectorAll('[data-repay]').forEach((button) => {
button.addEventListener('click', () => {
const move = settle(spend)[Number(button.dataset.repay)];
if (move) openRepayDialog(spend, { move });
});
});
view.querySelectorAll('[data-remind]').forEach((button) => {
button.addEventListener('click', () => {
const move = settle(spend)[Number(button.dataset.remind)];
if (!move) return;
showCopyDialog({ title: t('spends.remindTitle', { name: move.from }), hint: t('spends.remindHint'), text: remindText(spend, move), send: true });
});
});
view.querySelectorAll('[data-pay-edit]').forEach((button) => {
button.addEventListener('click', async () => {
const person = spend.people.find((one) => one.id === button.dataset.payEdit);
if (!person) return;
const text = await askForText({
title: t('spends.payTitle', { name: person.name }),
hint: t('spends.payHint'),
value: payOf(person) || payElsewhere(person.name),
confirmLabel: t('action.save'),
maxLength: 300,
});
if (text === null) return;
replaceSpend(setSpendPay(getSpend(spend.id) || spend, person.id, text));
});
});
view.querySelector('#spend-people')?.addEventListener('click', () => openSpendPeopleDialog(spend));
view.querySelector('#spend-share')?.addEventListener('click', async () => {
const group = await askGroup();
if (!group) {
flash(t('groups.needOne'));
render();
return;
}
const next = { ...spend, shared: true, groupId: group.id, updatedAt: Date.now() };
replaceSpend(next);
flash(t('spends.shared', { name: group.name }));
render();
});
view.querySelector('#spend-archive')?.addEventListener('click', () => {
const next = archiveSpend(spend, !spend.archivedAt);
flash(t(next.archivedAt ? 'archive.done' : 'archive.undone'));
replaceSpend(next, { redraw: !next.archivedAt });
if (next.archivedAt) navigate('#/spends');
});
view.querySelector('#spend-rename')?.addEventListener('click', async () => {
const name = await askForText({
title: t('spends.rename'),
hint: t('spends.renameHint'),
value: spend.name,
confirmLabel: t('action.save'),
});
if (name === null) return;
replaceSpend({ ...spend, name: String(name).trim(), updatedAt: Date.now() });
});
view.querySelector('#spend-delete')?.addEventListener('click', async () => {
if (!(await ask(t('spends.confirmDelete'), { confirmLabel: t('action.delete'), danger: true }))) return;
if (!(await removeEverywhere(spend))) return;
state.spends = state.spends.filter((item) => item.id !== spend.id);
saveSpends(state.spends);
if (state.store) void state.store.remove(spend.id);
navigate('#/spends');
});
}
function openSpendLineDialog(spend, lineId) {
const line = spend.lines.find((entry) => entry.id === lineId);
if (!line) return;
const dialog = makeDialog();
dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('spends.lineTitle'))}</h2>
      <label>
        ${escapeHtml(t('spends.what'))}
        <input type="text" id="line-what" value="${escapeHtml(line.text)}" />
      </label>
      ${amountFieldHtml(spend, { id: 'line-amount', cents: line.amount, paid: paidInOf(spend, line) })}
      <label>
        ${escapeHtml(t('spends.by'))}
        <select id="line-by">
          ${spend.people
.map(
(person) => `<option value="${escapeHtml(person.id)}" ${person.id === line.by ? 'selected' : ''}>
                 ${escapeHtml(person.name)}
               </option>`,
)
.join('')}
        </select>
      </label>
      ${
spend.people.length > 1
? splitEditorHtml(spend, { forWhom: line.forWhom, parts: line.parts, fixed: line.fixed, groups: forWhomGroups(spend, everything()) })
: ''
}
      <label>
        ${escapeHtml(t('lists.due'))}
        <input type="date" id="line-day" value="${escapeHtml(line.day || '')}" />
      </label>
      <p class="late small" id="line-error" hidden></p>
      <div class="row">
        <button type="button" class="button button--primary" id="line-save">${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" id="line-cancel">${escapeHtml(t('action.cancel'))}</button>
        <button type="button" class="button button--danger" id="line-delete">${escapeHtml(t('action.delete'))}</button>
      </div>
    </form>`;
let split = null;
const amountField = bindAmountField(dialog, spend, () => split?.refresh());
split = bindSplitEditor(dialog, spend, () => amountField.read().cents);
const problem = (text) => {
const error = dialog.querySelector('#line-error');
error.textContent = text;
error.hidden = false;
};
dialog.querySelector('#line-save').addEventListener('click', () => {
const paid = amountField.read();
if (paid.error) {
problem(amountField.problem(false));
return;
}
const shared = split.read();
if (shared.error) {
problem(shared.error);
return;
}
dialog.close();
replaceSpend(editSpend(getSpend(spend.id) || spend, lineId, {
text: dialog.querySelector('#line-what').value,
amount: paid.amount,
currency: paid.currency,
rate: paid.rate,
by: dialog.querySelector('#line-by').value,
forWhom: shared.forWhom,
parts: shared.parts,
fixed: shared.fixed,
day: dialog.querySelector('#line-day').value,
}));
});
dialog.querySelector('#line-cancel').addEventListener('click', () => dialog.close());
dialog.querySelector('#line-delete').addEventListener('click', () => {
dialog.close();
replaceSpend(removeSpend(getSpend(spend.id) || spend, lineId));
});
dialog.showModal();
}
function openRepayDialog(spend, { move = null, line = null }) {
const from = line ? line.by : move.fromId;
const to = line ? line.forWhom[0] : move.toId;
const amount = line ? line.amount : move.amount;
const person = (id) => spend.people.find((one) => one.id === id)?.name || '';
const choose = (id, selected) => `
    <select id="${id}">
      ${spend.people
.map((one) => `<option value="${escapeHtml(one.id)}" ${one.id === selected ? 'selected' : ''}>${escapeHtml(one.name)}</option>`)
.join('')}
    </select>`;
const dialog = makeDialog();
dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(line ? t('spends.repayment') : t('spends.repaid', { from: person(from), to: person(to) }))}</h2>
      ${
line
? `<div class="field-row">
               <label>${escapeHtml(t('spends.repayFrom'))} ${choose('repay-from', from)}</label>
               <label>${escapeHtml(t('spends.repayTo'))} ${choose('repay-to', to)}</label>
             </div>`
: `<p class="muted small">${escapeHtml(t('spends.repayHint'))}</p>`
}
      <label>
        ${escapeHtml(t('spends.amount'))}
        <input type="text" id="repay-amount" inputmode="decimal" value="${escapeHtml((amount / 100).toFixed(2).replace('.', ','))}" />
      </label>
      <label>
        ${escapeHtml(t('spends.when'))}
        <input type="date" id="repay-day" value="${escapeHtml(line?.day || dayNow())}" />
      </label>
      <p class="late small" id="repay-error" aria-live="polite" hidden></p>
      <div class="row">
        <button type="button" class="button button--primary" id="repay-save">
          ${escapeHtml(line ? t('action.save') : t('spends.markPaid'))}
        </button>
        <button type="button" class="button" id="repay-cancel">${escapeHtml(t('action.cancel'))}</button>
        ${line ? `<button type="button" class="button button--danger" id="repay-delete">${escapeHtml(t('action.delete'))}</button>` : ''}
      </div>
    </form>`;
dialog.querySelector('#repay-save').addEventListener('click', () => {
const typed = dialog.querySelector('#repay-amount').value;
const cents = readAmount(typed);
const day = dialog.querySelector('#repay-day').value || dayNow();
const payer = dialog.querySelector('#repay-from')?.value || from;
const payee = dialog.querySelector('#repay-to')?.value || to;
const wrong = !cents ? t('spends.notAnAmount') : payer === payee ? t('spends.repaySame') : '';
if (wrong) {
const error = dialog.querySelector('#repay-error');
error.textContent = wrong;
error.hidden = false;
dialog.querySelector(cents ? '#repay-to' : '#repay-amount')?.focus();
return;
}
dialog.close();
const current = getSpend(spend.id) || spend;
replaceSpend(line
? editSpend(current, line.id, { amount: cents, by: payer, forWhom: [payee], day })
: addRepayment(current, { from: payer, to: payee, amount: cents, day }));
});
dialog.querySelector('#repay-cancel').addEventListener('click', () => dialog.close());
dialog.querySelector('#repay-delete')?.addEventListener('click', () => {
dialog.close();
replaceSpend(removeSpend(getSpend(spend.id) || spend, line.id));
});
dialog.showModal();
}
function askLatecomer(name) {
return new Promise((resolve) => {
const dialog = makeDialog('dialog dialog--ask');
dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(t('spends.lateTitle', { name }))}</h2>
        <p class="muted small">${escapeHtml(t('spends.lateHint', { name }))}</p>
        <div class="stack stack--tight">
          <button type="button" class="button" data-late="all">${escapeHtml(t('spends.lateAll'))}</button>
          <button type="button" class="button" data-late="next">${escapeHtml(t('spends.lateNext'))}</button>
          <button type="button" class="button button--ghost" data-late="">${escapeHtml(t('action.cancel'))}</button>
        </div>
      </div>`;
let answer = null;
dialog.querySelectorAll('[data-late]').forEach((button) => {
button.addEventListener('click', () => {
answer = button.dataset.late || null;
dialog.close();
});
});
dialog.addEventListener('close', () => resolve(answer));
dialog.showModal();
});
}
function openSpendPeopleDialog(spend) {
const held = () => getSpend(spend.id) || spend;
openPeopleEditor({
roster: rosterFor(held()),
hint: t('spends.peoplePartsHint'),
extra: {
html: (person) => `
        <span class="stepper" role="group" aria-label="${escapeHtml(t('spends.partsOf', { name: person.name }))}">
          <button type="button" class="stepper__button" data-weight-step="-1" data-weight-of="${escapeHtml(person.id)}"
                  aria-label="${escapeHtml(t('spends.partsLess'))}">−</button>
          <span class="stepper__value">${escapeHtml(partsText(weightOf(person)))}</span>
          <button type="button" class="stepper__button" data-weight-step="1" data-weight-of="${escapeHtml(person.id)}"
                  aria-label="${escapeHtml(t('spends.partsMore'))}">+</button>
        </span>`,
bind: (dialog, redraw) => {
dialog.querySelectorAll('[data-weight-step]').forEach((button) => {
button.addEventListener('click', () => {
const current = held();
const person = current.people.find((one) => one.id === button.dataset.weightOf);
if (!person) return;
replaceSpend(setSpendWeight(current, person.id, stepParts(weightOf(person), Number(button.dataset.weightStep))), { redraw: false });
redraw();
dialog.querySelector(`[data-weight-of="${CSS.escape(person.id)}"][data-weight-step="${button.dataset.weightStep}"]`)?.focus();
});
});
},
},
confirmRemove: t('spends.confirmRemovePerson'),
people: () => held().people,
add: async (name) => {
if (!sharedWithEveryone(held())) {
replaceSpend(addSpendPerson(held(), name), { redraw: false });
return true;
}
const since = await askLatecomer(String(name).trim());
if (!since) return false;
replaceSpend((since === 'next' ? addLatecomer : addSpendPerson)(held(), name), { redraw: false });
return true;
},
rename: (id, name) => replaceSpend(renameSpendPerson(held(), id, name), { redraw: false }),
remove: (id) => replaceSpend(removeSpendPerson(held(), id), { redraw: false }),
blocked: (id) => {
const why = canRemovePerson(held(), id);
if (why === 'ok') return null;
return t({ paid: 'spends.cannotDropPaid', alone: 'spends.cannotDropAlone', apart: 'spends.cannotDropApart' }[why]);
},
});
}

// ---- src/view-ideas.js -----------------------------------------------
function boardTitle(board) {
return board.name || t('ideas.untitled');
}
function boardCardHtml(board) {
const notes = board.cards.filter((card) => card.type !== 'sketch').length;
const sketches = board.cards.length - notes;
const holds = [
notes ? t('ideas.notes', { count: notes }) : '',
sketches ? t('ideas.sketches', { count: sketches }) : '',
].filter(Boolean).join(' · ');
return `
    <button type="button" class="game-card" data-goto="#/idea/${escapeHtml(board.id)}">
      <span class="game-card__title">
        ${escapeHtml(boardTitle(board))}
        <span class="pill">${escapeHtml(t('ideas.cards', { count: board.cards.length }))}</span>
      </span>
      <span class="game-card__meta">${escapeHtml(formatDate(board.updatedAt))}${holds ? ` — ${escapeHtml(holds)}` : ''}</span>
      ${talkSumHtml(board)}
      ${eventTagHtml(board)}
    </button>`;
}
async function deleteBoard(board, { then = null } = {}) {
if (!(await ask(t('ideas.confirmDelete'), { confirmLabel: t('action.delete'), danger: true }))) {
render();
return;
}
if (!(await removeEverywhere(board))) return;
state.boards = state.boards.filter((item) => item.id !== board.id);
saveBoards(state.boards);
if (state.store) void state.store.remove(board.id);
flash(t('ideas.deleted', { name: boardTitle(board) }));
if (then) navigate(then);
else render();
}
function ideasView() {
const sorted = [...shownDocs(state.boards)].sort((a, b) => b.updatedAt - a.updatedAt);
const live = sorted.filter(isLive);
return `
    ${flashHtml()}
    ${kindsHtml('ideas')}
    ${newButtonHtml('#/ideas/new', t('ideas.new'), live.length > 0)}
    ${groupChipsHtml()}

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('kinds.ongoing'))}</h2></div>
      ${
live.length
? `<div class="game-list">${live.map(swipeable(boardCardHtml)).join('')}</div>
             <p class="muted small">${escapeHtml(t('ideas.swipeHint'))}</p>`
: hintHtml('ideas', t('ideas.none'))
}
      ${hiddenByGroupHtml(state.boards)}
    </section>
    ${live.length && live.length <= 2 ? hintHtml('ideas', t('hint.ideas')) : ''}

    ${archivedHtml(sorted, swipeable(boardCardHtml))}`;
}
function newBoardView() {
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/ideas')}
      <h1>${escapeHtml(t('ideas.new'))}</h1>
    </div>

    <form id="new-board" class="card stack">
      <label>
        ${escapeHtml(t('ideas.name'))}
        <input type="text" id="board-name" placeholder="${escapeHtml(t('ideas.namePlaceholder'))}"
               value="${escapeHtml(state.newBoardName)}" required />
      </label>
      ${willBeInHtml()}
      <button type="submit" class="button button--primary button--block">${escapeHtml(t('ideas.create'))}</button>
    </form>`;
}
function bindNewBoard() {
const form = view.querySelector('#new-board');
if (!form) return;
const snapshot = () => {
state.newBoardName = view.querySelector('#board-name').value;
};
view.querySelectorAll('[data-new-group]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshot();
state.newGroupChoice = { touched: true, id: chip.dataset.newGroup || null };
render();
});
});
form.addEventListener('submit', (event) => {
event.preventDefault();
snapshot();
const board = landing(createBoard({ name: state.newBoardName }));
state.boards = [...state.boards, board];
persistBoard(board);
resetGroupChoice();
state.newBoardName = '';
navigate(`#/idea/${board.id}`);
});
}
function sketchSvg(strokes, { id = '', label = '' } = {}) {
return `
    <svg class="sketch" viewBox="0 0 ${SKETCH_WIDTH} ${SKETCH_HEIGHT}" preserveAspectRatio="xMidYMid meet"
         ${id ? `id="${id}"` : ''} ${label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"'}>
      ${strokes.map(strokeSvg).join('')}
    </svg>`;
}
function strokeSvg(stroke) {
return `<path class="ink-${escapeHtml(stroke.ink)}" data-stroke="${escapeHtml(stroke.id)}"
                stroke-width="${Number(stroke.pen) || PENS[0]}" d="${strokePath(stroke)}" />`;
}
function ideaCardHtml(card) {
if (card.type === 'sketch') {
return `
      <button type="button" class="idea-card idea-card--sketch" data-card="${escapeHtml(card.id)}"
              aria-label="${escapeHtml(card.text || t('ideas.sketchTitle'))}">
        ${card.strokes.length ? sketchSvg(card.strokes) : `<span class="muted small">${escapeHtml(t('ideas.emptySketch'))}</span>`}
        ${card.text ? `<span class="idea-card__caption">${escapeHtml(card.text)}</span>` : ''}
      </button>`;
}
return `
    <button type="button" class="idea-card" data-card="${escapeHtml(card.id)}">
      <span class="idea-card__text">${escapeHtml(card.text)}</span>
    </button>`;
}
function boardView(board) {
const cards = cardsInOrder(board);
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/ideas')}
      <div>
        <h1>${escapeHtml(boardTitle(board))}</h1>
        <p class="muted small">
          ${escapeHtml(t('ideas.cards', { count: board.cards.length }))}
          ${board.shared ? ` · ${escapeHtml(t('lists.sharedMark'))}` : ''}
        </p>
      </div>
    </div>

    ${eventLinkHtml(board)}

    ${inGroupHtml(board)}

    ${state.remote ? shareBarHtml(`<button type="button" class="button button--primary" id="board-share">${escapeHtml(t('ideas.share'))}</button>`) : ''}

    <div class="row idea-add">
      <button type="button" class="button" id="board-add-note">${escapeHtml(t('ideas.addNote'))}</button>
      <button type="button" class="button" id="board-add-sketch">${escapeHtml(t('ideas.addSketch'))}</button>
    </div>

    ${
cards.length
? `<div class="idea-grid">${cards.map((card) => swipeHtml(card.id, `${ideaCardHtml(card)}${talkHtml(board, card.id, {
title: card.text || t('ideas.sketchTitle'),
})}`, { kind: 'card' })).join('')}</div>
           <p class="muted small idea-hint">${escapeHtml(t('ideas.swipeHint'))}</p>`
: `<p class="muted small">${escapeHtml(t('ideas.empty'))}</p>`
}

    ${attachedHtml(board)}

    ${actionsHtml(`${boardFlowsHtml(board)}${boardActivitiesHtml(board)}`, `
        <button type="button" class="button button--small button--ghost" id="board-rename">${escapeHtml(t('ideas.rename'))}</button>
        ${chainButtonsHtml(board)}
        <button type="button" class="button button--small button--ghost" id="board-archive">
          ${escapeHtml(board.archivedAt ? t('archive.back') : t('archive.put'))}
        </button>
        <button type="button" class="button button--small button--ghost" id="board-delete">${escapeHtml(t('action.delete'))}</button>`)}`;
}
function bindBoard(board) {
bindData();
bindTalk(view);
bindSwipes('card', (cardId) => {
const current = getBoard(board.id);
if (!current) return;
replaceBoard(removeCard(current, cardId));
}, { undo: t('ideas.cardDeleted') });
view.querySelector('#board-add-note')?.addEventListener('click', () => openNoteDialog(board.id, null));
view.querySelector('#board-add-sketch')?.addEventListener('click', () => openSketchDialog(board.id, null));
view.querySelectorAll('[data-card]').forEach((button) => {
button.addEventListener('click', () => {
const card = board.cards.find((entry) => entry.id === button.dataset.card);
if (!card) return;
if (card.type === 'sketch') openSketchDialog(board.id, card.id);
else openNoteDialog(board.id, card.id);
});
});
view.querySelector('#board-share')?.addEventListener('click', async () => {
const group = await askGroup();
if (!group) {
flash(t('groups.needOne'));
render();
return;
}
replaceBoard({ ...board, shared: true, groupId: group.id, updatedAt: Date.now() });
flash(t('ideas.shared', { name: group.name }));
render();
});
view.querySelector('#board-archive')?.addEventListener('click', () => {
const next = archiveBoard(board, !board.archivedAt);
flash(t(next.archivedAt ? 'archive.done' : 'archive.undone'));
replaceBoard(next, { redraw: !next.archivedAt });
if (next.archivedAt) navigate('#/ideas');
});
view.querySelector('#board-rename')?.addEventListener('click', async () => {
const name = await askForText({
title: t('ideas.rename'),
hint: t('ideas.renameHint'),
value: board.name,
confirmLabel: t('action.save'),
});
if (name === null) return;
replaceBoard({ ...board, name: String(name).trim(), updatedAt: Date.now() });
});
view.querySelector('#board-delete')?.addEventListener('click', () => deleteBoard(board, { then: '#/ideas' }));
}
function commitCard(boardId, cardId, type, change) {
const current = getBoard(boardId);
if (!current) return;
let next = current;
let id = cardId;
if (!id || !next.cards.some((card) => card.id === id)) {
({ board: next, cardId: id } = addCard(next, type));
}
next = change(next, id);
if (next === current) return;
if (boardSize(next) > BOARD_LIMIT) {
flash(t('ideas.full'), 'error');
render();
return;
}
replaceBoard(next);
}
function cardButtonsHtml(cardId) {
return `
    <div class="row">
      <button type="submit" class="button button--primary" data-card-save>${escapeHtml(t('action.save'))}</button>
      <button type="button" class="button" data-card-cancel>${escapeHtml(t('action.cancel'))}</button>
      ${cardId ? `<button type="button" class="button button--danger" data-card-delete>${escapeHtml(t('action.delete'))}</button>` : ''}
    </div>`;
}
function bindCardButtons(dialog, { changed, leave }) {
let outcome = 'cancel';
const cancel = async () => {
if (changed() && !(await ask(t('ideas.discard'), { confirmLabel: t('ideas.discardYes'), danger: true }))) return;
outcome = 'cancel';
dialog.close();
};
dialog.querySelector('form').addEventListener('submit', () => {
outcome = 'save';
});
dialog.querySelector('[data-card-cancel]').addEventListener('click', (event) => {
event.preventDefault();
cancel();
});
dialog.addEventListener('cancel', (event) => {
event.preventDefault();
cancel();
});
dialog.querySelector('[data-card-delete]')?.addEventListener('click', async (event) => {
event.preventDefault();
if (!(await ask(t('ideas.confirmDeleteCard'), { confirmLabel: t('action.delete'), danger: true }))) return;
outcome = 'drop';
dialog.close();
});
dialog.addEventListener('close', () => leave(outcome));
}
function openNoteDialog(boardId, cardId) {
const card = getBoard(boardId)?.cards.find((entry) => entry.id === cardId) || null;
const dialog = makeDialog('dialog dialog--note');
dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('ideas.noteTitle'))}</h2>
      <textarea id="note-text" rows="8" placeholder="${escapeHtml(t('ideas.notePlaceholder'))}"
                aria-label="${escapeHtml(t('ideas.noteTitle'))}">${escapeHtml(card?.text || '')}</textarea>
      ${cardButtonsHtml(cardId)}
    </form>`;
const text = dialog.querySelector('#note-text');
const before = card?.text || '';
bindCardButtons(dialog, {
changed: () => text.value.trim() !== before.trim(),
leave: (outcome) => {
if (outcome === 'drop') {
const current = getBoard(boardId);
if (current) replaceBoard(removeCard(current, cardId));
return;
}
const written = text.value.trim();
if (outcome === 'save' && (cardId || written)) {
commitCard(boardId, cardId, 'note', (board, id) => editCardText(board, id, written));
}
render();
},
});
dialog.showModal();
text.focus();
}
function openSketchDialog(boardId, cardId) {
const card = getBoard(boardId)?.cards.find((entry) => entry.id === cardId) || null;
const dialog = makeDialog('dialog dialog--sketch');
let ink = state.prefs.sketchInk && INKS.includes(state.prefs.sketchInk) ? state.prefs.sketchInk : 'ink';
let pen = PENS.includes(state.prefs.sketchPen) ? state.prefs.sketchPen : PENS[0];
let rubber = ERASERS.includes(state.prefs.sketchRubber) ? state.prefs.sketchRubber : ERASERS[0];
let erasing = false;
const toolsHtml = () => `
    <div class="sketch-tools" role="toolbar" aria-label="${escapeHtml(t('ideas.sketchTitle'))}">
      <button type="button" class="chip ${erasing ? '' : 'chip--on'}" data-tool="pen" aria-pressed="${erasing ? 'false' : 'true'}">${escapeHtml(t('ideas.pen'))}</button>
      <button type="button" class="chip ${erasing ? 'chip--on' : ''}" data-tool="eraser" aria-pressed="${erasing ? 'true' : 'false'}">${escapeHtml(t('ideas.eraser'))}</button>
      <button type="button" class="chip" data-tool="undo">${escapeHtml(t('ideas.undoStroke'))}</button>
    </div>
    <div class="sketch-tools" role="group" aria-label="${escapeHtml(t('ideas.inks'))}">
      ${INKS.map((name) => `
        <button type="button" class="swatch ink-${name} ${!erasing && ink === name ? 'swatch--on' : ''}" data-ink="${name}"
                aria-pressed="${!erasing && ink === name ? 'true' : 'false'}" aria-label="${escapeHtml(t(`ideas.ink.${name}`))}"
                title="${escapeHtml(t(`ideas.ink.${name}`))}"></button>`).join('')}
      <span class="sketch-tools__gap"></span>
      ${
erasing
? ERASERS.map((size, index) => `
              <button type="button" class="swatch swatch--pen ${rubber === size ? 'swatch--on' : ''}" data-rubber="${size}"
                      aria-pressed="${rubber === size ? 'true' : 'false'}" aria-label="${escapeHtml(t(`ideas.rubber.${index}`))}"
                      title="${escapeHtml(t(`ideas.rubber.${index}`))}"><span class="swatch__rubber" style="width:${6 + index * 6}px;height:${6 + index * 6}px"></span></button>`).join('')
: PENS.map((size) => `
              <button type="button" class="swatch swatch--pen ${pen === size ? 'swatch--on' : ''}" data-pen="${size}"
                      aria-pressed="${pen === size ? 'true' : 'false'}" aria-label="${escapeHtml(t(`ideas.pen.${size}`))}"
                      title="${escapeHtml(t(`ideas.pen.${size}`))}"><span style="width:${4 + size / 2}px;height:${4 + size / 2}px"></span></button>`).join('')
}
    </div>`;
dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('ideas.sketchTitle'))}</h2>
      <div id="sketch-tools">${toolsHtml()}</div>
      <div class="sketch-pad">${sketchSvg(card?.strokes || [], { id: 'sketch-pad', label: t('ideas.canvas') })}</div>
      <label>
        ${escapeHtml(t('ideas.caption'))}
        <input type="text" id="sketch-caption" value="${escapeHtml(card?.text || '')}"
               placeholder="${escapeHtml(t('ideas.captionPlaceholder'))}" />
      </label>
      ${cardButtonsHtml(cardId)}
    </form>`;
const pad = dialog.querySelector('#sketch-pad');
const tools = dialog.querySelector('#sketch-tools');
const drawn = [];
const erased = new Set();
const history = [];
const visible = () => [
...(card?.strokes || []).filter((stroke) => !erased.has(stroke.id)),
...drawn.filter((stroke) => !erased.has(stroke.id)),
];
const refreshTools = () => {
tools.innerHTML = toolsHtml();
};
tools.addEventListener('click', (event) => {
const button = event.target.closest('button');
if (!button) return;
event.preventDefault();
if (button.dataset.tool === 'pen') erasing = false;
else if (button.dataset.tool === 'eraser') erasing = true;
else if (button.dataset.tool === 'undo') undo();
else if (button.dataset.ink) {
ink = button.dataset.ink;
erasing = false;
state.prefs = { ...state.prefs, sketchInk: ink };
savePrefs(state.prefs);
} else if (button.dataset.pen) {
pen = Number(button.dataset.pen);
erasing = false;
state.prefs = { ...state.prefs, sketchPen: pen };
savePrefs(state.prefs);
} else if (button.dataset.rubber) {
rubber = Number(button.dataset.rubber);
state.prefs = { ...state.prefs, sketchRubber: rubber };
savePrefs(state.prefs);
}
refreshTools();
});
function undo() {
const last = history.pop();
if (!last) return;
if (last.type === 'draw') {
const index = drawn.findIndex((stroke) => stroke.id === last.id);
if (index >= 0) drawn.splice(index, 1);
pad.querySelector(`[data-stroke="${last.id}"]`)?.remove();
} else {
for (const id of last.ids) erased.delete(id);
for (const id of last.added) erased.add(id);
pad.innerHTML = visible().map(strokeSvg).join('');
}
}
const toFrame = (event) => {
const box = pad.getBoundingClientRect();
const scale = Math.min(box.width / SKETCH_WIDTH, box.height / SKETCH_HEIGHT) || 1;
const left = box.left + (box.width - SKETCH_WIDTH * scale) / 2;
const top = box.top + (box.height - SKETCH_HEIGHT * scale) / 2;
return [(event.clientX - left) / scale, (event.clientY - top) / scale];
};
let current = null;
let rubbed = null;
const rub = (x, y) => {
for (const stroke of visible()) {
const pieces = rubOut(stroke, x, y, rubber);
if (!pieces) continue;
erased.add(stroke.id);
rubbed.ids.push(stroke.id);
const node = pad.querySelector(`[data-stroke="${stroke.id}"]`);
node?.insertAdjacentHTML('afterend', pieces.map(strokeSvg).join(''));
node?.remove();
for (const piece of pieces) {
drawn.push(piece);
rubbed.added.push(piece.id);
}
}
};
pad.addEventListener('pointerdown', (event) => {
event.preventDefault();
pad.setPointerCapture?.(event.pointerId);
const [x, y] = toFrame(event);
if (erasing) {
rubbed = { ids: [], added: [] };
rub(x, y);
return;
}
current = { id: uid('s'), ink, pen, points: [x, y] };
pad.insertAdjacentHTML('beforeend', strokeSvg({ ...current, points: current.points.map(Math.round) }));
});
pad.addEventListener('pointermove', (event) => {
if (rubbed) {
const [x, y] = toFrame(event);
rub(x, y);
return;
}
if (!current) return;
const [x, y] = toFrame(event);
const [lastX, lastY] = current.points.slice(-2);
if (Math.hypot(x - lastX, y - lastY) < 3) return;
current.points.push(x, y);
pad.querySelector(`[data-stroke="${current.id}"]`)
?.setAttribute('d', strokePath({ points: current.points.map(Math.round) }));
});
const finish = () => {
if (rubbed) {
if (rubbed.ids.length) history.push({ type: 'erase', ...rubbed });
rubbed = null;
return;
}
if (!current) return;
const stroke = cleanStroke({ ...current, points: simplifyPoints(current.points.map(Math.round)) });
current = null;
if (!stroke) return;
drawn.push(stroke);
history.push({ type: 'draw', id: stroke.id });
pad.querySelector(`[data-stroke="${stroke.id}"]`)?.setAttribute('d', strokePath(stroke));
};
pad.addEventListener('pointerup', finish);
pad.addEventListener('pointercancel', finish);
const caption = dialog.querySelector('#sketch-caption');
const captionBefore = card?.text || '';
bindCardButtons(dialog, {
changed: () => history.length > 0 || caption.value.trim() !== captionBefore.trim(),
leave: (outcome) => {
finish();
if (outcome === 'drop') {
const board = getBoard(boardId);
if (board) replaceBoard(removeCard(board, cardId));
return;
}
const kept = drawn.filter((stroke) => !erased.has(stroke.id));
const text = caption.value.trim();
if (outcome === 'save' && (cardId || kept.length || text)) {
commitCard(boardId, cardId, 'sketch', (board, id) => {
let next = addStrokes(board, id, kept);
next = eraseStrokes(next, id, [...erased]);
return editCardText(next, id, text);
});
}
render();
},
});
dialog.showModal();
}
function getBoard(id) {
return state.boards.find((board) => board.id === id) || null;
}
function replaceBoard(next, { redraw = true } = {}) {
state.boards = state.boards.map((board) => (board.id === next.id ? next : board));
persistBoard(next);
if (redraw) render();
}
function persistBoard(changed) {
const ok = saveBoards(state.boards);
if (!ok && !keptElsewhere(changed)) flash(t('home.storageWarning'), 'error');
if (state.store && changed) void state.store.save(changed);
if (state.remote && changed?.shared) pushBoard(changed).catch(pushFailed(changed));
return ok;
}
async function pushBoard(changed) {
let outgoing = changed;
try {
const stored = await state.remote.get(changed.id);
if (isValidBoard(stored) && adoptBoard(stored)) {
outgoing = getBoard(changed.id) || changed;
if (!isBusy()) render();
}
} catch {
}
await state.remote.put(outgoing, keyFor(outgoing), organiserSecret(outgoing.id));
}
async function pullBoard(id) {
if (!state.remote) return false;
let stored = null;
try {
stored = await state.remote.get(id);
} catch {
return false;
}
if (stored === null) return whenAbsent(id);
return isValidBoard(stored) ? adoptBoard(stored) : false;
}
function adoptBoard(stored) {
const local = getBoard(stored.id);
const merged = local ? mergeBoards(local, stored) : stored;
if (local && merged === local) return false;
const adopted = { ...merged, shared: true };
state.boards = local
? state.boards.map((board) => (board.id === stored.id ? adopted : board))
: [...state.boards, adopted];
saveBoards(state.boards);
return true;
}
function watchBoard(id) {
stopWatching();
if (!state.remote) return;
state.poll = setInterval(async () => {
if (isBusy() || isHidden() || liveQuiet(docTopic(id))) return;
if (await pullBoard(id)) render();
}, 5000);
}

// ---- src/view-games.js -----------------------------------------------
function newGameView() {
const presetId = state.newPresetId || PRESETS[0].id;
const preset = getPreset(presetId);
const config = state.newConfig || presetConfig(preset);
const isTeam = config.entrantLabel === 'team';
const [min, max] = preset.players;
if (!state.newGameTouched) {
state.newGameNames = isTeam
? withoutMe(state.newGameNames, myName())
: withMeFirst(state.newGameNames, myName());
}
while (state.newGameNames.length < min) state.newGameNames.push('');
const names = state.newGameNames.slice(0, Math.max(min, Math.min(state.newGameNames.length, max)));
const fixed = isTeam ? [] : rosterForNew();
const known = fixed.length ? fixed : [...new Set([isTeam ? '' : myName(), ...recentNames(state.games)].filter(Boolean))];
const nameRows = names
.map(
(value, index) => `
        <div class="score-row">
          <input type="text" data-name-index="${index}" ${known.length ? 'list="known-names"' : ''} value="${escapeHtml(value)}"
                 placeholder="${escapeHtml(t(isTeam ? 'new.teamName' : 'new.playerName', { n: index + 1 }))}"
                 aria-label="${escapeHtml(t(isTeam ? 'new.teamName' : 'new.playerName', { n: index + 1 }))}" />
          <button type="button" class="button button--small button--ghost" data-remove-name="${index}"
                  aria-label="${escapeHtml(t('lists.dropPerson'))}" title="${escapeHtml(t('lists.dropPerson'))}"
                  ${names.length <= min ? 'disabled' : ''}>✕</button>
        </div>`,
)
.join('');
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/games')}
      <h1>${escapeHtml(t('new.title'))}</h1>
    </div>

    <form id="new-game" class="card stack">
      <label>
        ${escapeHtml(t('new.game'))}
        <select id="preset">
          ${PRESET_GROUPS.map((group) => {
const games = PRESETS.filter((item) => item.group === group);
if (!games.length) return '';
return `<optgroup label="${escapeHtml(t(`group.${group}`))}">${games
.map(
(item) =>
`<option value="${item.id}" ${item.id === presetId ? 'selected' : ''}>${escapeHtml(presetLabel(item))}</option>`,
)
.join('')}</optgroup>`;
}).join('')}
        </select>
      </label>
      <p class="notes">${escapeHtml(t(preset.notesKey))}</p>

      <label>
        ${escapeHtml(t('new.customName'))}
        <input type="text" id="game-name" value="${escapeHtml(state.newName || '')}" placeholder="${escapeHtml(presetLabel(preset))}" />
      </label>

      <div class="stack">
        <h2 class="h3">${escapeHtml(t(isTeam ? 'new.teams' : 'new.players'))}</h2>
        <div class="score-rows">${nameRows}</div>
        ${
known.length
? `<datalist id="known-names">${known.map((name) => `<option value="${escapeHtml(name)}"></option>`).join('')}</datalist>`
: ''
}
        <button type="button" class="button button--small" id="add-name" ${names.length >= max ? 'disabled' : ''}>
          + ${escapeHtml(t(isTeam ? 'action.addTeam' : 'action.addPlayer'))}
        </button>
      </div>

      <div class="stack">
        <h2 class="h3">${escapeHtml(t('new.rules'))}</h2>
        <div class="field-grid">
          <label>
            ${escapeHtml(t('new.direction'))}
            <select id="direction">
              <option value="low" ${config.direction === 'low' ? 'selected' : ''}>${escapeHtml(t('new.directionLow'))}</option>
              <option value="high" ${config.direction === 'high' ? 'selected' : ''}>${escapeHtml(t('new.directionHigh'))}</option>
            </select>
          </label>
          <label>
            ${escapeHtml(t('new.endMode'))}
            <select id="end-mode">
              <option value="threshold" ${config.endMode === 'threshold' ? 'selected' : ''}>${escapeHtml(t('new.endThreshold'))}</option>
              <option value="rounds" ${config.endMode === 'rounds' ? 'selected' : ''}>${escapeHtml(t('new.endRounds'))}</option>
              <option value="manual" ${config.endMode === 'manual' ? 'selected' : ''}>${escapeHtml(t('new.endManual'))}</option>
            </select>
          </label>
          ${
config.endMode === 'threshold'
? `<label>${escapeHtml(t('new.target'))}
                   <input type="number" id="target" step="1" value="${config.target ?? ''}" />
                 </label>`
: ''
}
          ${
config.endMode === 'rounds'
? `<label>${escapeHtml(t('new.roundsCount'))}
                   <input type="number" id="rounds" step="1" min="1" value="${config.rounds ?? ''}" />
                 </label>`
: ''
}
          <label>
            ${escapeHtml(t('new.roundSum'))}
            <input type="number" id="round-sum" step="1" value="${config.roundSum ?? ''}" />
            <span class="hint">${escapeHtml(t('new.roundSumHint'))}</span>
          </label>
        </div>
        <label class="checkbox">
          <input type="checkbox" id="allow-negative" ${config.allowNegative ? 'checked' : ''} />
          ${escapeHtml(t('new.allowNegative'))}
        </label>
      </div>

      ${willBeInHtml()}
      <button type="submit" class="button button--primary button--block">${escapeHtml(t('new.start'))}</button>
    </form>`;
}
function roundFormHtml(game) {
const preset = getPreset(game.presetId);
if (preset?.calculator === 'tarot') {
if (!state.deal) state.deal = emptyDeal(game);
return tarotFormHtml(game);
}
const editing = state.editingRoundId ? game.rounds.find((r) => r.id === state.editingRoundId) : null;
const index = editing ? game.rounds.indexOf(editing) + 1 : game.rounds.length + 1;
const rows = game.players
.map((player) => {
const value = editing && Number.isFinite(editing.scores[player.id]) ? editing.scores[player.id] : '';
const counter = preset?.helper
? `<button type="button" class="button button--small counter-button"
                   data-helper="${escapeHtml(player.id)}" title="${escapeHtml(t('helper.open'))}"
                   aria-label="${escapeHtml(t('helper.title', { name: player.name }))}">🂠</button>`
: '';
return `
        <div class="score-row ${preset?.helper ? 'score-row--counter' : ''}">
          <label class="score-row__name" for="score-${escapeHtml(player.id)}">${escapeHtml(player.name)}</label>
          ${counter}
          <input type="number" step="1" inputmode="numeric" id="score-${escapeHtml(player.id)}"
                 data-score="${escapeHtml(player.id)}" value="${value}" />
        </div>`;
})
.join('');
const metaField = preset?.meta
? `<label>
         ${escapeHtml(t(preset.meta.labelKey))}
         <select id="round-meta">
           <option value="">${escapeHtml(t('meta.none'))}</option>
           ${preset.meta.options
.map(
(option) =>
`<option value="${escapeHtml(option.value)}" ${editing?.meta === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`,
)
.join('')}
         </select>
       </label>`
: '';
const dealer = getPreset(game.presetId)?.group === 'cards' ? dealerFor(game, index - 1) : null;
return `
    <form id="round-form" class="card stack">
      <h2>${escapeHtml(editing ? t('game.editRound', { n: index }) : t('game.newRound', { n: index }))}</h2>
      ${dealer ? `<p class="muted small">${escapeHtml(t('game.dealer', { name: dealer.name }))}</p>` : ''}
      <div class="score-rows">${rows}</div>
      <p class="banner banner--warn" id="round-issues" hidden></p>
      <div class="sum-line">
        <span id="sum-line"></span>
        <button type="button" class="button button--small" id="complete" hidden>${escapeHtml(t('action.complete'))}</button>
      </div>
      ${metaField}
      <label>
        ${escapeHtml(t('game.note'))}
        <input type="text" id="round-note" value="${escapeHtml(editing?.note || '')}" />
      </label>
      <div class="row">
        <button type="submit" class="button button--primary">
          ${escapeHtml(editing ? t('action.saveRound') : t('action.addRound'))}
        </button>
        ${
editing
? `<button type="button" class="button" id="cancel-edit">${escapeHtml(t('action.cancel'))}</button>
               <button type="button" class="button button--danger" id="delete-round">${escapeHtml(t('action.deleteRound'))}</button>`
: ''
}
      </div>
    </form>`;
}
function scoreTableHtml(game) {
const preset = getPreset(game.presetId);
const totalsById = totals(game);
const metaLabel = preset?.meta ? t(preset.meta.labelKey) : null;
const metaText = (round) =>
preset?.meta ? preset.meta.options.find((o) => o.value === round.meta)?.label || '' : '';
return `
    <div class="table-wrap">
      <table class="scores">
        <thead>
          <tr>
            <th>${escapeHtml(t('game.round'))}</th>
            ${game.players.map((player) => `<th>${escapeHtml(player.name)}</th>`).join('')}
            ${metaLabel ? `<th>${escapeHtml(metaLabel)}</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${game.rounds
.map(
(round, index) => `
              <tr class="round-edit" data-edit-round="${escapeHtml(round.id)}" tabindex="0"
                  title="${escapeHtml(t('action.edit'))}">
                <td>${index + 1}${round.note ? ` <span class="muted small">· ${escapeHtml(round.note)}</span>` : ''}</td>
                ${game.players
.map((player) => `<td>${roundScore(round, player.id)}</td>`)
.join('')}
                ${metaLabel ? `<td class="meta-cell">${escapeHtml(metaText(round))}</td>` : ''}
              </tr>`,
)
.join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>${escapeHtml(t('game.total'))}</td>
            ${game.players.map((player) => `<td>${totalsById[player.id]}</td>`).join('')}
            ${metaLabel ? '<td></td>' : ''}
          </tr>
        </tfoot>
      </table>
    </div>`;
}
function gameView(game) {
const status = gameStatus(game);
const preset = getPreset(game.presetId);
const winnerBanner = status.finished && status.winners.length
? `<p class="banner banner--win">
         <strong>${escapeHtml(t(status.winners.length > 1 ? 'home.winners' : 'home.winner', {
name: status.winners.map((row) => row.name).join(', '),
}))}</strong>
       </p>`
: '';
let remainingText = '';
if (!status.finished && Number.isFinite(status.remaining)) {
remainingText = game.config.endMode === 'threshold'
? t('game.remainingThreshold', { count: status.remaining })
: t('game.remainingRounds', { count: status.remaining });
}
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/games')}
      <div>
        <h1>${escapeHtml(gameTitle(game))}</h1>
        <p class="muted small">${escapeHtml(preset ? presetLabel(preset) : '')} · ${escapeHtml(t('home.rounds', { count: game.rounds.length }))}</p>
      </div>
    </div>

    ${eventLinkHtml(game)}

    ${inGroupHtml(game)}

    ${state.remote ? shareBarHtml(`<button type="button" class="button button--primary" id="share">${escapeHtml(t('action.share'))}</button>`) : ''}

    ${winnerBanner}

    <section class="section card">
      <div class="section__head">
        <h2>${escapeHtml(t('game.standings'))}</h2>
        ${remainingText ? `<span class="muted small">${escapeHtml(remainingText)}</span>` : ''}
      </div>
      <div class="standings">
        ${status.standings
.map(
(row) => `
            <div class="standing ${row.rank === 1 ? 'standing--leader' : ''}">
              <span class="standing__rank">${row.rank}</span>
              <span class="standing__name">${escapeHtml(row.name)}</span>
              <span>
                <span class="standing__total">${row.total}</span>
                ${row.gap ? `<span class="standing__gap"> ${escapeHtml(t('game.gap', { gap: row.gap }))}</span>` : ''}
              </span>
            </div>`,
)
.join('')}
      </div>
    </section>

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('game.perRound'))}</h2></div>
      ${game.rounds.length ? scoreTableHtml(game) : `<p class="muted small">${escapeHtml(t('game.noRounds'))}</p>`}
    </section>

    ${roundFormHtml(game)}

    ${attachedHtml(game)}

    ${actionsHtml(`
        ${
game.rounds.length
? `<button type="button" class="button button--small" id="undo">${escapeHtml(t('action.undo'))}</button>`
: ''
}
        <button type="button" class="button button--small" id="recap">${escapeHtml(t('action.recap'))}</button>
        ${
EXPORT_MODE === 'download'
? `<button type="button" class="button button--small" id="export-docx">${escapeHtml(t('action.exportDocx'))}</button>
               <button type="button" class="button button--small" id="export-pdf">${escapeHtml(t('action.exportPdf'))}</button>`
: ''
}
        <button type="button" class="button button--small" id="replay">${escapeHtml(t('action.replay'))}</button>
        <button type="button" class="button button--small" id="toggle-finish">
          ${escapeHtml(game.finishedAt ? t('action.reopen') : t('action.finish'))}
        </button>`, `
        <button type="button" class="button button--small button--ghost" id="rename">${escapeHtml(t('action.rename'))}</button>
        ${chainButtonsHtml(game)}
        <button type="button" class="button button--small button--ghost" id="game-archive">
          ${escapeHtml(game.archivedAt ? t('archive.back') : t('archive.put'))}
        </button>
        <button type="button" class="button button--small button--danger" id="delete-game">${escapeHtml(t('action.delete'))}</button>`)}

    ${preset ? `<p class="notes">${escapeHtml(t(preset.notesKey))}</p>` : ''}`;
}
function readScores(game) {
const scores = {};
for (const player of game.players) {
const input = view.querySelector(`[data-score="${player.id}"]`);
scores[player.id] = parseScore(input?.value);
}
return scores;
}
function refreshSumLine(game) {
const line = view.querySelector('#sum-line');
const completeButton = view.querySelector('#complete');
if (!line) return;
const scores = readScores(game);
const entered = Object.values(scores).reduce(
(sum, value) => sum + (Number.isFinite(value) ? value : 0),
0,
);
const expected = game.config.roundSum;
if (Number.isFinite(expected)) {
line.textContent = t('game.sumExpected', { sum: entered, expected });
const complete = game.players.every((player) => Number.isFinite(scores[player.id]));
line.parentElement.classList.toggle('sum-line--ok', complete && entered === expected);
line.parentElement.classList.toggle('sum-line--off', complete && entered !== expected);
} else {
line.textContent = t('game.sum', { sum: entered });
}
if (completeButton) {
const suggestion = completingScore(game, scores);
completeButton.hidden = !suggestion;
completeButton.dataset.playerId = suggestion?.playerId || '';
completeButton.dataset.value = suggestion ? String(suggestion.value) : '';
}
}
function describeIssue(issue) {
if (issue.code === 'missing') return t('warn.missing', { players: issue.players.join(', ') });
if (issue.code === 'sum') return t('warn.sum', { sum: issue.sum, expected: issue.expected });
return t(`error.${issue.code}`, { player: issue.player });
}
function makeDialog(className = 'dialog') {
const dialog = document.createElement('dialog');
dialog.className = className;
dialog.addEventListener('close', () => dialog.remove());
document.body.append(dialog);
return dialog;
}
function ask(message, { confirmLabel, danger = false } = {}) {
return new Promise((resolve) => {
const dialog = makeDialog('dialog dialog--ask');
dialog.innerHTML = `
      <div class="stack">
        <p class="ask-message"></p>
        <div class="row">
          <button type="button" class="button ${danger ? 'button--danger' : 'button--primary'}"
                  data-answer="yes"></button>
          <button type="button" class="button" data-answer="no"></button>
        </div>
      </div>`;
dialog.querySelector('.ask-message').textContent = message;
dialog.querySelector('[data-answer="yes"]').textContent = confirmLabel || t('action.save');
dialog.querySelector('[data-answer="no"]').textContent = t('action.cancel');
let settled = false;
const finish = (answer) => {
if (settled) return;
settled = true;
resolve(answer);
dialog.close();
};
dialog.querySelector('[data-answer="yes"]').addEventListener('click', () => finish(true));
dialog.querySelector('[data-answer="no"]').addEventListener('click', () => finish(false));
dialog.addEventListener('close', () => finish(false));
dialog.showModal();
dialog.querySelector('[data-answer="no"]').focus();
});
}
async function submitRound(game) {
const scores = readScores(game);
const result = validateRound(game, scores);
const issues = view.querySelector('#round-issues');
if (!result.ok) {
if (issues) {
issues.textContent = result.errors.map(describeIssue).join(' ');
issues.hidden = false;
}
return;
}
if (issues) issues.hidden = true;
if (result.warnings.length) {
const message = `${result.warnings.map(describeIssue).join('\n')}\n\n${t('game.confirmWarnings')}`;
const accepted = await ask(message, { confirmLabel: t('action.save') });
if (!accepted) return;
}
const meta = view.querySelector('#round-meta')?.value || null;
const note = view.querySelector('#round-note')?.value.trim() || '';
const next = state.editingRoundId
? updateRound(game, state.editingRoundId, { scores, meta, note })
: addRound(game, { scores, meta, note });
state.editingRoundId = null;
replaceGame(next);
render();
}
const EXPORT_MODE = globalThis.MARQUE_POINTS_EXPORT_MODE === 'copy' ? 'copy' : 'download';
function exportGames() {
const json = JSON.stringify(
{
version: 1,
games: state.games,
lists: state.lists,
polls: state.polls,
spends: state.spends,
boards: state.boards,
organiser: heldOrganiserSecrets(),
},
null,
2,
);
if (EXPORT_MODE === 'copy') {
showExportDialog(json);
return;
}
const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
const link = document.createElement('a');
link.href = url;
link.download = `marque-points-${new Date().toISOString().slice(0, 10)}.json`;
link.click();
URL.revokeObjectURL(url);
}
function showExportDialog(json) {
showCopyDialog({ title: t('export.title'), hint: t('export.hint'), text: json });
}
function qrFor(text) {
const modules = qrMatrix(text);
if (!modules) return null;
const side = modules.length + 8;
const scale = Math.max(4, Math.floor(260 / side));
return qrSvg(text, { size: side * scale });
}
function showCopyDialog({
title,
hint,
text: content,
qr = false,
qrText = null,
code = null,
send = false,
codeLabel = 'shareSet.codeLabel',
codeHint = 'shareSet.codeApart',
}) {
let dialog = document.getElementById('export-dialog');
if (!dialog) {
dialog = document.createElement('dialog');
dialog.id = 'export-dialog';
dialog.className = 'dialog';
dialog.innerHTML = `
      <div class="stack">
        <h2 id="export-title"></h2>
        <p class="muted small" id="export-hint"></p>
        <div class="code-box" id="export-code" hidden>
          <span class="code-box__label" id="export-code-label"></span>
          <strong class="code-box__value" id="export-code-value"></strong>
          <span class="muted small" id="export-code-hint"></span>
        </div>
        <div id="export-qr" class="qr" hidden></div>
        <textarea id="export-text" readonly rows="12"></textarea>
        <div class="row">
          <button type="button" class="button button--primary" id="export-copy"></button>
          <button type="button" class="button" id="export-send" hidden></button>
          <button type="button" class="button" id="export-close"></button>
        </div>
      </div>`;
document.body.append(dialog);
dialog.querySelector('#export-close').addEventListener('click', () => dialog.close());
dialog.querySelector('#export-send').addEventListener('click', async () => {
const content = dialog.querySelector('#export-text').value.trim();
try {
await navigator.share(/\s/.test(content)
? { title: t('app.title'), text: content }
: { title: t('app.title'), text: t('shareSet.text'), url: content });
} catch {
}
});
dialog.querySelector('#export-copy').addEventListener('click', async (event) => {
const button = event.currentTarget;
const text = dialog.querySelector('#export-text');
text.select();
const copied = await Promise.race([
Promise.resolve(navigator.clipboard?.writeText(text.value)).then(() => true, () => false),
new Promise((done) => setTimeout(() => done(false), 600)),
]);
button.textContent = copied ? t('export.copied') : t('export.copyByHand');
});
}
dialog.querySelector('#export-title').textContent = title;
dialog.querySelector('#export-hint').textContent = hint;
const text = dialog.querySelector('#export-text');
text.value = content;
text.setAttribute('aria-label', title);
const image = dialog.querySelector('#export-qr');
const svg = qr ? qrFor(qrText || content) : null;
image.innerHTML = svg || '';
image.hidden = !svg;
if (svg) image.setAttribute('aria-label', t('share.qrLabel'));
const box = dialog.querySelector('#export-code');
box.hidden = !code;
if (code) {
dialog.querySelector('#export-code-label').textContent = t(codeLabel);
dialog.querySelector('#export-code-value').textContent = code;
dialog.querySelector('#export-code-hint').textContent = t(codeHint);
}
const sendButton = dialog.querySelector('#export-send');
sendButton.hidden = !(send && navigator.share);
sendButton.textContent = t('shareSet.send');
dialog.querySelector('#export-copy').textContent = t('action.copy');
dialog.querySelector('#export-close').textContent = t('action.close');
dialog.showModal();
text.scrollTop = 0;
}
function importGames(source) {
let parsed = null;
try {
parsed = JSON.parse(source);
} catch {
flash(t('home.importFailed'), 'error');
return false;
}
const all = Array.isArray(parsed)
? parsed
: [
...(parsed?.games || []), ...(parsed?.lists || []), ...(parsed?.polls || []), ...(parsed?.spends || []),
...(parsed?.boards || []),
];
const games = all.filter(isValidGame);
const lists = all.filter(isValidList);
const polls = all.filter(isValidPoll);
const spends = all.filter(isValidSpend);
const boards = all.filter(isValidBoard);
if (!games.length && !lists.length && !polls.length && !spends.length && !boards.length) {
flash(t('home.importFailed'), 'error');
return false;
}
const organising = restoreOrganiserSecrets(Array.isArray(parsed) ? null : parsed?.organiser);
const knownGames = new Set(state.games.map((game) => game.id));
const freshGames = games.filter((game) => !knownGames.has(game.id));
state.games = [...state.games, ...freshGames];
saveGames(state.games);
const knownLists = new Set(state.lists.map((list) => list.id));
const freshLists = lists.filter((list) => !knownLists.has(list.id));
state.lists = [...state.lists, ...freshLists];
saveLists(state.lists);
const knownPolls = new Set(state.polls.map((poll) => poll.id));
const freshPolls = polls.filter((poll) => !knownPolls.has(poll.id));
state.polls = [...state.polls, ...freshPolls];
savePolls(state.polls);
const knownSpends = new Set(state.spends.map((spend) => spend.id));
const freshSpends = spends.filter((spend) => !knownSpends.has(spend.id));
state.spends = [...state.spends, ...freshSpends];
saveSpends(state.spends);
const knownBoards = new Set(state.boards.map((board) => board.id));
const freshBoards = boards.filter((board) => !knownBoards.has(board.id));
state.boards = [...state.boards, ...freshBoards];
saveBoards(state.boards);
for (const document_ of [...freshGames, ...freshLists, ...freshPolls, ...freshSpends, ...freshBoards]) {
if (state.store) void state.store.save(document_);
if (state.remote && document_.shared) {
state.remote.put(document_, keyFor(document_), organiserSecret(document_.id))
.catch((error) => wasDeleted(error) && dropDeleted(document_.id));
}
}
const count = freshGames.length + freshLists.length + freshPolls.length + freshSpends.length + freshBoards.length;
flash(organising
? t('home.importOrganiser', { count, polls: organising })
: t('home.importDone', { count }));
return true;
}
function openPasteDialog() {
const dialog = makeDialog();
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('paste.title'))}</h2>
      <p class="muted small">${escapeHtml(t('paste.hint'))}</p>
      <textarea id="paste-text" rows="8" aria-label="${escapeHtml(t('paste.title'))}"></textarea>
      <p class="banner banner--warn" id="paste-error" hidden></p>
      <div class="row">
        <button type="button" class="button button--primary" id="paste-import">${escapeHtml(t('action.import'))}</button>
        <button type="button" class="button" id="paste-cancel">${escapeHtml(t('action.cancel'))}</button>
      </div>
    </div>`;
const close = () => dialog.close();
dialog.querySelector('#paste-cancel').addEventListener('click', close);
dialog.querySelector('#paste-import').addEventListener('click', () => {
const value = dialog.querySelector('#paste-text').value.trim();
if (!value) return;
if (!importGames(value)) {
const error = dialog.querySelector('#paste-error');
error.textContent = t('home.importFailed');
error.hidden = false;
return;
}
close();
render();
});
dialog.showModal();
dialog.querySelector('#paste-text').focus();
}
function openLinkDialog() {
const dialog = makeDialog();
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('openLink.title'))}</h2>
      <p class="muted small">${escapeHtml(t('openLink.hint'))}</p>
      <textarea id="link-text" rows="3" aria-label="${escapeHtml(t('openLink.title'))}"></textarea>
      <p class="banner banner--warn" id="link-error" hidden></p>
      <div class="row">
        <button type="button" class="button button--primary" id="link-open">${escapeHtml(t('openLink.open'))}</button>
        <button type="button" class="button" id="link-cancel">${escapeHtml(t('action.cancel'))}</button>
      </div>
    </div>`;
const close = () => dialog.close();
const fail = (message) => {
const error = dialog.querySelector('#link-error');
error.textContent = message;
error.hidden = false;
dialog.querySelector('#link-open').disabled = false;
dialog.querySelector('#link-open').textContent = t('openLink.open');
};
dialog.querySelector('#link-cancel').addEventListener('click', close);
dialog.querySelector('#link-open').addEventListener('click', async (event) => {
const pasted = dialog.querySelector('#link-text').value;
const invitation = joinFrom(pasted);
if (invitation) {
close();
navigate(`#/join/${invitation.code}/${encodeURIComponent(invitation.name)}`);
return;
}
const form = prefillLinkFrom(pasted);
if (form) {
close();
navigate(form);
return;
}
const setId = setIdFrom(pasted);
if (setId) {
event.currentTarget.disabled = true;
event.currentTarget.textContent = t('share.sending');
await openSet(setId);
close();
navigate('#/');
return;
}
const listId = listIdFrom(pasted);
if (listId) {
event.currentTarget.disabled = true;
event.currentTarget.textContent = t('share.sending');
if (!getList(listId) && !(await pullList(listId))) return fail(t('openLink.notFound'));
close();
navigate(`#/list/${listId}`);
return;
}
const pollId = pollIdFrom(pasted);
if (pollId) {
event.currentTarget.disabled = true;
event.currentTarget.textContent = t('share.sending');
if (!getPoll(pollId) && !(await pullPoll(pollId))) return fail(t('openLink.notFound'));
close();
navigate(`#/poll/${pollId}`);
return;
}
const id = gameIdFrom(pasted);
if (!id) return fail(t('openLink.noId'));
event.currentTarget.disabled = true;
event.currentTarget.textContent = t('share.sending');
if (getGame(id)) {
close();
navigate(`#/game/${id}`);
return;
}
if (await pullGame(id)) {
close();
navigate(`#/game/${id}`);
return;
}
if (await pullList(id)) {
close();
navigate(`#/list/${id}`);
return;
}
if (await pullPoll(id)) {
close();
navigate(`#/poll/${id}`);
return;
}
return fail(t('openLink.notFound'));
});
dialog.showModal();
dialog.querySelector('#link-text').focus();
}
async function shareMessage({ title, hint, message, url, code = null }) {
if (navigator.share) {
try {
await navigator.share({ title: t('app.title'), text: message.includes(url) ? message : `${message}\n${url}` });
return;
} catch (error) {
if (error?.name === 'AbortError') return;
}
}
showCopyDialog({
title,
hint,
text: message,
qr: true,
qrText: url,
code,
codeLabel: 'groups.codeLabel',
codeHint: 'groups.codeInLink',
});
}
async function shareUrl({ url, title, hint, text, code = null, codeLabel, codeHint }) {
if (navigator.share) {
try {
await navigator.share({ title: t('app.title'), text, url });
return;
} catch (error) {
if (error?.name === 'AbortError') return;
}
}
showCopyDialog({ title, hint, text: url, qr: true, code, codeLabel, codeHint });
}
function bindNewGame() {
const form = view.querySelector('#new-game');
if (!form) return;
const snapshotNames = () => {
view.querySelectorAll('[data-name-index]').forEach((input) => {
state.newGameNames[Number(input.dataset.nameIndex)] = input.value;
});
};
view.querySelectorAll('[data-name-index]').forEach((input) => {
input.addEventListener('input', () => {
state.newGameTouched = true;
});
});
const readConfigFromForm = () => ({
direction: view.querySelector('#direction').value,
endMode: view.querySelector('#end-mode').value,
target: view.querySelector('#target')
? parseIntOrNull(view.querySelector('#target').value)
: state.newConfig?.target ?? null,
rounds: view.querySelector('#rounds')
? parseIntOrNull(view.querySelector('#rounds').value)
: state.newConfig?.rounds ?? null,
roundSum: parseIntOrNull(view.querySelector('#round-sum')?.value),
allowNegative: view.querySelector('#allow-negative').checked,
entrantLabel: getPreset(view.querySelector('#preset').value)?.entrantLabel || 'player',
});
view.querySelector('#preset').addEventListener('change', (event) => {
snapshotNames();
const preset = getPreset(event.target.value);
state.newPresetId = preset.id;
state.newConfig = presetConfig(preset);
state.newGameNames = state.newGameNames.slice(0, preset.players[1]);
render();
});
view.querySelector('#end-mode')?.addEventListener('change', () => {
snapshotNames();
state.newName = view.querySelector('#game-name').value;
state.newConfig = readConfigFromForm();
render();
view.querySelector('#end-mode')?.focus();
});
view.querySelector('#add-name')?.addEventListener('click', () => {
snapshotNames();
state.newName = view.querySelector('#game-name').value;
state.newConfig = readConfigFromForm();
state.newGameNames.push('');
render();
});
view.querySelectorAll('[data-new-group]').forEach((chip) => {
chip.addEventListener('click', () => {
snapshotNames();
state.newName = view.querySelector('#game-name').value;
state.newConfig = readConfigFromForm();
state.newGroupChoice = { touched: true, id: chip.dataset.newGroup || null };
render();
});
});
view.querySelectorAll('[data-remove-name]').forEach((button) => {
button.addEventListener('click', () => {
snapshotNames();
state.newName = view.querySelector('#game-name').value;
state.newConfig = readConfigFromForm();
state.newGameNames.splice(Number(button.dataset.removeName), 1);
render();
});
});
form.addEventListener('submit', async (event) => {
event.preventDefault();
snapshotNames();
const presetId = state.newPresetId || PRESETS[0].id;
const preset = getPreset(presetId);
const config = readConfigFromForm();
const [min, max] = preset.players;
let names = state.newGameNames
.slice(0, max)
.map((name, index) => (name || '').trim() || t(config.entrantLabel === 'team' ? 'new.teamName' : 'new.playerName', { n: index + 1 }));
const roster = config.entrantLabel === 'team' ? [] : rosterForNew();
if (roster.length) {
const { group } = destinationForNew();
const mine = myNameIn(group.id);
const listed = names.map((name) => rosterName(group.id, name)
|| (mine && name.toLowerCase() === myName().toLowerCase() ? mine : ''));
if (listed.some((name) => !name)) {
flash(t('roster.gameNames', { name: group.name, names: roster.join(', ') }), 'error');
render();
return;
}
names = listed;
}
if (names.length < min || names.length > max) {
flash(t('new.errorPlayers', { min, max, label: t(config.entrantLabel === 'team' ? 'new.teams' : 'new.players').toLowerCase() }), 'error');
render();
return;
}
if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
flash(t('new.errorNames'), 'error');
render();
return;
}
const game = landing(createGame({
presetId,
names,
overrides: config,
name: view.querySelector('#game-name').value,
}));
state.games = [...state.games, game];
persist(game);
resetGroupChoice();
state.newGameNames = ['', '', ''];
state.newGameTouched = false;
state.newPresetId = null;
state.newConfig = null;
state.newName = '';
navigate(`#/game/${game.id}`);
});
}
let counterEntry = emptyHelperEntry();
function emptyDeal(game) {
return {
takerId: game.players[0]?.id || null,
partnerId: null,
contract: 'garde',
oudlers: 1,
points: null,
petitAuBout: 'none',
poignee: 'none',
chelem: 'none',
};
}
function tarotFormHtml(game) {
const editing = state.editingRoundId
? game.rounds.find((round) => round.id === state.editingRoundId)
: null;
const index = editing ? game.rounds.indexOf(editing) + 1 : game.rounds.length + 1;
const threshold = THRESHOLDS[state.deal.oudlers];
const complete = isCompleteDeal(game.players, state.deal);
const result = complete ? scoreDeal(game.players, state.deal) : null;
const options = (items, selected, label) =>
items.map((item) => `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${escapeHtml(label(item))}</option>`).join('');
const playerOptions = (selected, extra = '') =>
extra + game.players
.map((player) => `<option value="${escapeHtml(player.id)}" ${player.id === selected ? 'selected' : ''}>${escapeHtml(player.name)}</option>`)
.join('');
return `
    <form id="round-form" class="card stack">
      <h2>${escapeHtml(editing ? t('game.editRound', { n: index }) : t('game.newRound', { n: index }))}</h2>

      <div class="field-grid">
        <label>${escapeHtml(t('tarot.taker'))}
          <select id="deal-taker">${playerOptions(state.deal.takerId)}</select>
        </label>
        ${
game.players.length === 5
? `<label>${escapeHtml(t('tarot.partner'))}
                 <select id="deal-partner">
                   <option value="">${escapeHtml(t('tarot.alone'))}</option>
                   ${playerOptions(state.deal.partnerId)}
                 </select>
               </label>`
: ''
}
        <label>${escapeHtml(t('tarot.contract'))}
          <select id="deal-contract">${options(CONTRACTS, state.deal.contract, (c) => `${t(`tarot.${c.id}`)} ×${c.multiplier}`)}</select>
        </label>
        <label>${escapeHtml(t('tarot.oudlers'))}
          <select id="deal-oudlers">
            ${[0, 1, 2, 3].map((n) => `<option value="${n}" ${n === state.deal.oudlers ? 'selected' : ''}>${n} — ${THRESHOLDS[n]} ${escapeHtml(t('tarot.pointsNeeded'))}</option>`).join('')}
          </select>
        </label>
        <label>${escapeHtml(t('tarot.points', { max: TOTAL_POINTS }))}
          <input type="number" id="deal-points" inputmode="numeric" step="1" min="0" max="${TOTAL_POINTS}"
                 value="${Number.isFinite(state.deal.points) ? state.deal.points : ''}" />
        </label>
        <label>${escapeHtml(t('tarot.petitAuBout'))}
          <select id="deal-petit">
            ${['none', 'taker', 'defence'].map((id) => `<option value="${id}" ${id === state.deal.petitAuBout ? 'selected' : ''}>${escapeHtml(t(`tarot.petit.${id}`))}</option>`).join('')}
          </select>
        </label>
        <label>${escapeHtml(t('tarot.poignee'))}
          <select id="deal-poignee">${options(POIGNEES, state.deal.poignee, (p) => `${t(`tarot.poignee.${p.id}`)}${p.value ? ` (+${p.value})` : ''}`)}</select>
        </label>
        <label>${escapeHtml(t('tarot.chelem'))}
          <select id="deal-chelem">${options(CHELEMS, state.deal.chelem, (c) => t(`tarot.chelem.${c.id}`))}</select>
        </label>
      </div>

      ${
result
? `<div class="deal-result ${result.won ? 'deal-result--won' : 'deal-result--lost'}">
               <strong>${escapeHtml(t(result.won ? 'tarot.made' : 'tarot.failed', {
gap: Math.abs(result.gap),
}))}</strong>
               <span class="small">${escapeHtml(t('tarot.sum', {
base: 25,
gap: Math.abs(result.gap),
petit: result.breakdown.petit ? (result.breakdown.petit > 0 ? ` + 10` : ` − 10`) : '',
multiplier: result.multiplier,
extra: [
result.breakdown.poignee ? `${result.breakdown.poignee > 0 ? '+' : '−'} ${Math.abs(result.breakdown.poignee)}` : '',
result.breakdown.chelem ? `${result.breakdown.chelem > 0 ? '+' : '−'} ${Math.abs(result.breakdown.chelem)}` : '',
].filter(Boolean).map((piece) => ` ${piece}`).join(''),
amount: result.amount,
}))}</span>
               <div class="deal-scores">
                 ${game.players.map((player) => `<span><b>${escapeHtml(player.name)}</b> ${result.scores[player.id] > 0 ? '+' : ''}${result.scores[player.id]}</span>`).join('')}
               </div>
             </div>`
: `<p class="muted small">${escapeHtml(t('tarot.needPoints'))}</p>`
}

      <label>${escapeHtml(t('game.note'))}
        <input type="text" id="round-note" value="${escapeHtml(editing?.note || '')}" />
      </label>

      <div class="row">
        <button type="submit" class="button button--primary" ${complete ? '' : 'disabled'}>
          ${escapeHtml(editing ? t('action.saveRound') : t('action.addRound'))}
        </button>
        ${
editing
? `<button type="button" class="button" id="cancel-edit">${escapeHtml(t('action.cancel'))}</button>
               <button type="button" class="button button--danger" id="delete-round">${escapeHtml(t('action.deleteRound'))}</button>`
: ''
}
      </div>
    </form>`;
}
function renderCounter(helper, player) {
const dialog = document.getElementById('counter-dialog');
const total = helperTotal(helper, counterEntry);
dialog.querySelector('#counter-title').textContent = t('helper.title', { name: player.name });
dialog.querySelector('#counter-total').textContent = t('helper.total', { total });
dialog.querySelector('#counter-count').textContent = t('helper.cards', {
count: counterEntry.cards.length,
});
dialog.querySelector('#counter-values').innerHTML = helper.values
.map((value) => {
const count = cardCount(counterEntry, value);
const label = helper.labels?.[value] ?? value;
return `
        <button type="button" class="card-button ${count ? 'card-button--picked' : ''}"
                data-card="${value}">
          <span>${escapeHtml(String(label))}</span>
          ${count > 1 ? `<small>×${count}</small>` : ''}
        </button>`;
})
.join('');
dialog.querySelector('#counter-toggles').innerHTML = (helper.toggles || [])
.map(
(item) => `
        <label class="checkbox">
          <input type="checkbox" data-switch="${escapeHtml(item.key)}"
                 ${counterEntry.toggles[item.key] ? 'checked' : ''} />
          ${escapeHtml(t(item.labelKey))}
        </label>`,
)
.join('');
dialog.querySelector('#counter-undo').disabled = counterEntry.cards.length === 0;
dialog.querySelector('#counter-apply').disabled = isEmptyEntry(counterEntry);
}
function openCounter(game, playerId) {
const helper = getPreset(game.presetId)?.helper;
const player = game.players.find((item) => item.id === playerId);
if (!helper || !player) return;
let dialog = document.getElementById('counter-dialog');
if (!dialog) {
dialog = document.createElement('dialog');
dialog.id = 'counter-dialog';
dialog.className = 'dialog';
dialog.innerHTML = `
      <div class="stack">
        <h2 id="counter-title"></h2>
        <p class="muted small" id="counter-hint"></p>
        <div class="counter-readout">
          <strong id="counter-total"></strong>
          <span class="muted small" id="counter-count"></span>
        </div>
        <div class="card-grid" id="counter-values"></div>
        <div class="stack" id="counter-toggles"></div>
        <div class="row">
          <button type="button" class="button button--primary" id="counter-apply"></button>
          <button type="button" class="button button--small" id="counter-undo"></button>
          <button type="button" class="button button--small" id="counter-clear"></button>
          <button type="button" class="button button--small button--ghost" id="counter-close"></button>
        </div>
      </div>`;
document.body.append(dialog);
}
const fresh = dialog.cloneNode(true);
dialog.replaceWith(fresh);
dialog = fresh;
counterEntry = emptyHelperEntry();
dialog.querySelector('#counter-hint').textContent = helper.hintKey ? t(helper.hintKey) : '';
dialog.querySelector('#counter-apply').textContent = t('helper.apply');
dialog.querySelector('#counter-undo').textContent = t('helper.undo');
dialog.querySelector('#counter-clear').textContent = t('helper.clear');
dialog.querySelector('#counter-close').textContent = t('action.close');
dialog.querySelector('#counter-values').addEventListener('click', (event) => {
const button = event.target.closest('[data-card]');
if (!button) return;
counterEntry = tapCard(helper, counterEntry, Number(button.dataset.card));
renderCounter(helper, player);
});
dialog.querySelector('#counter-toggles').addEventListener('change', (event) => {
const box = event.target.closest('[data-switch]');
if (!box) return;
counterEntry = toggleSwitch(counterEntry, box.dataset.switch);
renderCounter(helper, player);
});
dialog.querySelector('#counter-undo').addEventListener('click', () => {
counterEntry = undoCard(counterEntry);
renderCounter(helper, player);
});
dialog.querySelector('#counter-clear').addEventListener('click', () => {
counterEntry = emptyHelperEntry();
renderCounter(helper, player);
});
dialog.querySelector('#counter-close').addEventListener('click', () => dialog.close());
dialog.querySelector('#counter-apply').addEventListener('click', () => {
const input = view.querySelector(`[data-score="${player.id}"]`);
if (input) input.value = String(helperTotal(helper, counterEntry));
dialog.close();
refreshSumLine(game);
});
renderCounter(helper, player);
dialog.showModal();
}
function bindTarot(game) {
const fields = {
'#deal-taker': (v) => { state.deal.takerId = v; },
'#deal-partner': (v) => { state.deal.partnerId = v || null; },
'#deal-contract': (v) => { state.deal.contract = v; },
'#deal-oudlers': (v) => { state.deal.oudlers = Number(v); },
'#deal-points': (v) => { state.deal.points = v === '' ? null : Number(v); },
'#deal-petit': (v) => { state.deal.petitAuBout = v; },
'#deal-poignee': (v) => { state.deal.poignee = v; },
'#deal-chelem': (v) => { state.deal.chelem = v; },
};
for (const [selector, apply] of Object.entries(fields)) {
const field = view.querySelector(selector);
field?.addEventListener('input', (event) => {
apply(event.target.value);
const active = document.activeElement?.id;
const caret = document.activeElement?.selectionStart ?? null;
render();
const again = active ? view.querySelector(`#${active}`) : null;
if (again) {
again.focus();
if (caret !== null && again.setSelectionRange) {
try { again.setSelectionRange(caret, caret); } catch {   }
}
}
});
}
}
function submitDeal(game) {
if (!isCompleteDeal(game.players, state.deal)) return;
const { scores } = scoreDeal(game.players, state.deal);
const note = view.querySelector('#round-note')?.value.trim() || '';
const meta = JSON.stringify(state.deal);
const next = state.editingRoundId
? updateRound(game, state.editingRoundId, { scores, meta, note })
: addRound(game, { scores, meta, note });
state.editingRoundId = null;
state.deal = emptyDeal(game);
replaceGame(next);
render();
}
function download(filename, bytes, type) {
const url = URL.createObjectURL(new Blob([bytes], { type }));
const link = document.createElement('a');
link.href = url;
link.download = filename;
link.click();
URL.revokeObjectURL(url);
}
function fileName(title) {
const base = String(title || '')
.replace(/[^\p{L}\p{N} _-]/gu, '')
.trim()
.replace(/\s+/g, '-');
return base || 'together';
}
function fileNameFor(game, extension) {
const base = `${gameTitle(game)} ${formatDate(game.updatedAt)}`
.replace(/[^\p{L}\p{N} _-]/gu, '')
.trim()
.replace(/\s+/g, '-');
return `${base || 'marque-points'}.${extension}`;
}
function reportFor(game) {
const status = gameStatus(game);
const preset = getPreset(game.presetId);
return {
title: gameTitle(game),
subtitle: [
preset ? presetLabel(preset) : '',
formatDate(game.updatedAt),
t('home.rounds', { count: game.rounds.length }),
].filter(Boolean).join(' · '),
winner: status.finished && status.winners.length
? t(status.winners.length > 1 ? 'home.winners' : 'home.winner', {
name: status.winners.map((row) => row.name).join(', '),
})
: '',
standingsTitle: t('game.standings'),
standingsHeader: [t('game.rank'), t('new.players'), t('game.total')],
standings: status.standings.map((row) => [String(row.rank), row.name, String(row.total)]),
roundsTitle: t('game.perRound'),
roundsHeader: [t('game.round'), ...game.players.map((player) => player.name)],
rounds: game.rounds.map((round, index) => [
String(index + 1),
...game.players.map((player) => String(roundScore(round, player.id))),
]),
};
}
function openRenameDialog(game) {
const dialog = makeDialog();
dialog.innerHTML = `
    <form method="dialog" class="stack">
      <h2>${escapeHtml(t('rename.title'))}</h2>
      <p class="muted small">${escapeHtml(t('rename.hint'))}</p>
      <div class="stack">
        ${game.players
.map(
(player, index) => `
            <label>${escapeHtml(t(game.config.entrantLabel === 'team' ? 'new.teamName' : 'new.playerName', { n: index + 1 }))}
              <input type="text" data-rename="${escapeHtml(player.id)}" value="${escapeHtml(player.name)}" />
            </label>`,
)
.join('')}
      </div>
      <div class="row">
        <button type="button" class="button button--primary" id="rename-save">${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" id="rename-cancel">${escapeHtml(t('action.cancel'))}</button>
      </div>
    </form>`;
const close = () => dialog.close();
dialog.querySelector('#rename-cancel').addEventListener('click', close);
dialog.querySelector('#rename-save').addEventListener('click', () => {
let next = game;
dialog.querySelectorAll('[data-rename]').forEach((input) => {
next = renamePlayer(next, input.dataset.rename, input.value);
});
close();
if (next !== game) {
replaceGame(next);
render();
}
});
dialog.showModal();
}
function bindGame(game) {
const form = view.querySelector('#round-form');
const preset = getPreset(game.presetId);
if (preset?.calculator === 'tarot') {
bindTarot(game);
form?.addEventListener('submit', (event) => {
event.preventDefault();
submitDeal(game);
});
}
if (preset?.calculator !== 'tarot') {
form?.addEventListener('submit', (event) => {
event.preventDefault();
void submitRound(game);
});
form?.addEventListener('input', () => refreshSumLine(game));
refreshSumLine(game);
}
const inputs = [...view.querySelectorAll('[data-score]')];
inputs.forEach((input, index) => {
input.addEventListener('keydown', (event) => {
if (event.key !== 'Enter' || index === inputs.length - 1) return;
event.preventDefault();
inputs[index + 1].focus();
});
});
view.querySelectorAll('[data-helper]').forEach((button) => {
button.addEventListener('click', () => openCounter(game, button.dataset.helper));
});
view.querySelector('#complete')?.addEventListener('click', (event) => {
const { playerId, value } = event.currentTarget.dataset;
const input = view.querySelector(`[data-score="${playerId}"]`);
if (input) input.value = value;
refreshSumLine(game);
});
view.querySelector('#cancel-edit')?.addEventListener('click', () => {
state.editingRoundId = null;
if (preset?.calculator === 'tarot') state.deal = emptyDeal(game);
render();
});
view.querySelector('#delete-round')?.addEventListener('click', async () => {
const roundId = state.editingRoundId;
if (!(await ask(t('game.confirmDeleteRound'), { confirmLabel: t('action.delete'), danger: true }))) return;
replaceGame(removeRound(game, roundId));
state.editingRoundId = null;
render();
});
const openRound = (roundId) => {
state.editingRoundId = roundId;
if (preset?.calculator === 'tarot') {
const round = game.rounds.find((item) => item.id === roundId);
try {
const stored = JSON.parse(round?.meta || 'null');
state.deal = stored && typeof stored === 'object' ? stored : emptyDeal(game);
} catch {
state.deal = emptyDeal(game);
}
}
render();
view.querySelector('#round-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
view.querySelectorAll('[data-edit-round]').forEach((row) => {
row.addEventListener('click', () => openRound(row.dataset.editRound));
row.addEventListener('keydown', (event) => {
if (event.key === 'Enter' || event.key === ' ') {
event.preventDefault();
openRound(row.dataset.editRound);
}
});
});
view.querySelector('#undo')?.addEventListener('click', async () => {
const last = game.rounds[game.rounds.length - 1];
if (!last) return;
if (!(await ask(t('game.confirmDeleteRound'), { confirmLabel: t('action.delete'), danger: true }))) return;
state.editingRoundId = null;
replaceGame(removeRound(game, last.id));
render();
});
view.querySelector('#share')?.addEventListener('click', async (event) => {
const button = event.currentTarget;
let current = game;
if (!current.shared) {
button.disabled = true;
button.textContent = t('share.sending');
current = await startSharing(current);
if (!current) return;
replaceGame(current);
render();
}
showCopyDialog({
title: t('share.title'),
hint: t('share.hint'),
text: shareLink(location, current.id),
qr: true,
});
});
view.querySelector('#recap')?.addEventListener('click', () => {
showCopyDialog({
title: t('results.recapTitle'),
hint: t('results.recapHint'),
text: recapText(game, t, { title: gameTitle(game), withRounds: true }),
});
});
view.querySelector('#export-docx')?.addEventListener('click', () => {
download(fileNameFor(game, 'docx'), buildDocx(reportFor(game)),
'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});
view.querySelector('#export-pdf')?.addEventListener('click', () => {
download(fileNameFor(game, 'pdf'), buildPdf(reportFor(game)), 'application/pdf');
});
view.querySelector('#game-archive')?.addEventListener('click', () => {
const next = archiveGame(game, !game.archivedAt);
flash(t(next.archivedAt ? 'archive.done' : 'archive.undone'));
replaceGame(next);
if (next.archivedAt) navigate('#/games');
else render();
});
view.querySelector('#replay')?.addEventListener('click', () => {
const next = replayGame(game);
state.games = [...state.games, next];
persist(next);
navigate(`#/game/${next.id}`);
});
view.querySelector('#rename')?.addEventListener('click', () => openRenameDialog(game));
view.querySelector('#toggle-finish')?.addEventListener('click', () => {
replaceGame(setFinished(game, !game.finishedAt));
render();
});
view.querySelector('#delete-game')?.addEventListener('click', async () => {
if (!(await ask(t('game.confirmDeleteGame'), { confirmLabel: t('action.delete'), danger: true }))) return;
state.games = state.games.filter((item) => item.id !== game.id);
forget(game.id, game);
navigate('#/games');
});
}

// ---- src/view-groups.js ----------------------------------------------
function replaceAny(next) {
const kind = kindOf(next);
if (kind === 'list') replaceList(next);
else if (kind === 'poll') replacePoll(next);
else if (kind === 'spend') replaceSpend(next);
else if (kind === 'board') replaceBoard(next);
else replaceGame(next);
}
function kindLabel(document_) {
if (isEventDoc(document_)) return t('chain.kind.event');
return t(`chain.kind.${kindOf(document_) || 'game'}`);
}
function candidatesHtml(documents, { on = null, attr }) {
const events = documents.filter(isEventDoc).sort((a, b) => String(a.date).localeCompare(String(b.date)));
const others = documents.filter((one) => !isEventDoc(one)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
const row = (one) => `
    <button type="button" class="game-card ${one.id === on ? 'game-card--on' : ''}" ${attr}="${escapeHtml(one.id)}"
            ${one.id === on ? 'aria-current="true"' : ''}>
      <span class="game-card__title">${escapeHtml(chainLabel(one))}</span>
      <span class="game-card__meta">${escapeHtml([kindLabel(one), ...chainOf(one).map(chainLabel)].join(' · '))}</span>
    </button>`;
const block = (title, rows) => (rows.length
? `<span class="muted small">${escapeHtml(title)}</span><div class="game-list">${rows.map(row).join('')}</div>`
: '');
return `${block(t('events.title'), events)}${block(t('chain.others'), others)}`;
}
function openAttachDialog(document_) {
const targets = attachTargets(document_, everything());
const chain = chainOf(document_);
const current = parentId(document_) && chain.length ? chain[chain.length - 1] : null;
const dialog = makeDialog();
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('chain.attachTitle', { name: documentTitle(document_) }))}</h2>
      ${
current
? `<p class="small">${escapeHtml(t('chain.now', { chain: chain.map(chainLabel).join(' › ') }))}</p>
             <div class="row"><button type="button" class="button" data-detach>${escapeHtml(t('chain.detach'))}</button></div>`
: `<p class="muted small">${escapeHtml(t(isEventDoc(document_) ? 'activity.attachHint' : 'chain.attachHint'))}</p>`
}
      ${targets.length ? candidatesHtml(targets, { on: current?.id, attr: 'data-attach-to' }) : `<p class="muted small">${escapeHtml(t('chain.nothing'))}</p>`}
      <div class="row">
        <button type="button" class="button button--ghost" data-attach-cancel>${escapeHtml(t('action.cancel'))}</button>
      </div>
    </div>`;
dialog.querySelector('[data-attach-cancel]').addEventListener('click', () => dialog.close());
dialog.querySelector('[data-detach]')?.addEventListener('click', () => {
dialog.close();
replaceAny(attach(document_, null));
flash(t('chain.detached', { name: chainLabel(current) }));
});
dialog.querySelectorAll('[data-attach-to]').forEach((node) => {
node.addEventListener('click', () => {
const target = targets.find((one) => one.id === node.dataset.attachTo);
dialog.close();
if (!target || target.id === current?.id) return;
replaceAny(attach(document_, target.id));
flash(t('chain.attached', { name: chainLabel(target) }));
});
});
dialog.showModal();
}
function openGatherDialog(target) {
const all = everything();
const offered = all.filter(
(one) => parentId(one) !== target.id && attachTargets(one, all).some((candidate) => candidate.id === target.id),
);
const dialog = makeDialog();
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('chain.gatherTitle', { name: chainLabel(target) }))}</h2>
      <p class="muted small">${escapeHtml(t('chain.gatherHint'))}</p>
      ${offered.length ? candidatesHtml(offered, { attr: 'data-gather' }) : `<p class="muted small">${escapeHtml(t('chain.nothingToGather'))}</p>`}
      <div class="row">
        <button type="button" class="button button--ghost" data-gather-close>${escapeHtml(t('action.close'))}</button>
      </div>
    </div>`;
dialog.querySelector('[data-gather-close]').addEventListener('click', () => dialog.close());
dialog.querySelectorAll('[data-gather]').forEach((node) => {
node.addEventListener('click', () => {
const one = offered.find((candidate) => candidate.id === node.dataset.gather);
dialog.close();
if (!one) return;
replaceAny(attach(one, target.id));
flash(t('chain.gathered', { name: documentTitle(one), target: chainLabel(target) }));
});
});
dialog.showModal();
}
function openRelateDialog(document_) {
const dialog = makeDialog();
let target = null;
const sentence = (kind, other) => t(`relate.says.${kind}`, { name: chainLabelShort(document_), other: chainLabelShort(other) });
const fromHere = { with: 'with', waits: 'after', unblocks: 'before' };
const draw = () => {
const all = everything();
const relations = relationsOf(document_, all);
const targets = linkTargets(document_, all, 'with');
const ways = target
? ['with', 'after'].filter((kind) => linkTargets(document_, all, kind).some((one) => one.id === target.id))
: [];
const close = `<button type="button" class="button button--ghost" data-relate-close>${escapeHtml(t('action.close'))}</button>`;
dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(t('relate.title', { name: documentTitle(document_) }))}</h2>
        ${
target
? `<span class="muted small">${escapeHtml(t('relate.how'))}</span>
               ${
ways.length
? `<div class="game-list">${ways.map((kind) => `
                       <button type="button" class="game-card" data-relate-kind="${kind}">
                         <span class="game-card__title">${escapeHtml(sentence(kind, target))}</span>
                       </button>`).join('')}</div>`
: `<p class="muted small">${escapeHtml(t('relate.nothing'))}</p>`
}
               <div class="row">
                 <button type="button" class="button" data-relate-back>${escapeHtml(t('relate.back'))}</button>
                 ${close}
               </div>`
: `<p class="muted small">${escapeHtml(t('relate.hint'))}</p>
               ${
relations.length
? `<span class="muted small">${escapeHtml(t('relate.current'))}</span>
                      <ul class="relate-list">${relations.map((one) => `
                        <li class="relate-list__row">
                          <span>${escapeHtml(sentence(fromHere[one.kind], one.document))}</span>
                          <button type="button" class="button button--small button--ghost" data-unrelate="${escapeHtml(one.document.id)}">${escapeHtml(t('relate.undo'))}</button>
                        </li>`).join('')}</ul>`
: ''
}
               <span class="muted small">${escapeHtml(t('relate.pick'))}</span>
               ${targets.length ? candidatesHtml(targets, { attr: 'data-relate-to' }) : `<p class="muted small">${escapeHtml(t('relate.nothing'))}</p>`}
               <div class="row">${close}</div>`
}
      </div>`;
dialog.querySelector('[data-relate-close]').addEventListener('click', () => dialog.close());
dialog.querySelector('[data-relate-back]')?.addEventListener('click', () => {
const was = target;
target = null;
draw();
[...dialog.querySelectorAll('[data-relate-to]')].find((one) => one.dataset.relateTo === was?.id)?.focus();
});
dialog.querySelectorAll('[data-relate-to]').forEach((node) => {
node.addEventListener('click', () => {
target = targets.find((one) => one.id === node.dataset.relateTo) || null;
draw();
dialog.querySelector('[data-relate-kind], [data-relate-back]')?.focus();
});
});
dialog.querySelectorAll('[data-relate-kind]').forEach((node) => {
node.addEventListener('click', () => {
const kind = node.dataset.relateKind;
dialog.close();
if (!target) return;
const fresh = everything().find((one) => one.id === document_.id) || document_;
replaceAny(linkTo(fresh, target.id, kind));
flash(t('relate.done', { name: chainLabel(target) }));
});
});
dialog.querySelectorAll('[data-unrelate]').forEach((node) => {
node.addEventListener('click', () => {
const one = relations.find((relation) => relation.document.id === node.dataset.unrelate);
if (!one) return;
for (const [holder, other] of [[document_.id, one.document.id], [one.document.id, document_.id]]) {
const held = everything().find((doc) => doc.id === holder);
if (held && (held.links || []).some((link) => link?.id === other)) replaceAny(unlinkFrom(held, other));
}
flash(t('relate.undone', { name: chainLabel(one.document) }));
draw();
});
});
};
draw();
dialog.showModal();
}
function groups() {
const value = state.prefs.groups;
return Array.isArray(value)
? value.filter((group) => group && typeof group.key === 'string' && group.key)
: [];
}
function rememberGroup(group) {
const known = groups().some((held) => held.id === group.id && held.key === group.key);
const others = groups().filter((held) => held.id !== group.id);
state.prefs = { ...state.prefs, groups: [...others, group] };
savePrefs(state.prefs);
if (!known) {
void syncAccount({ restore: false, force: true });
void keepData();
void syncPush();
}
}
function forgetGroup(id) {
state.prefs = { ...state.prefs, groups: groups().filter((group) => group.id !== id) };
savePrefs(state.prefs);
}
function fixedPeople(found) {
return Array.isArray(found?.people)
? found.people.filter((name) => typeof name === 'string' && name.trim()).map((name) => name.trim().slice(0, 24))
: [];
}
function knownAs(found) {
return typeof found?.who === 'string' ? found.who.trim().slice(0, 24) : '';
}
function rosterOf(groupId) {
const group = groupId ? groups().find((held) => held.id === groupId) : null;
return Array.isArray(group?.people) ? group.people : [];
}
function rosterName(groupId, name) {
const key = sameName(name);
return (key && rosterOf(groupId).find((one) => sameName(one) === key)) || '';
}
function myNameIn(groupId) {
if (!rosterOf(groupId).length) return myName();
const group = groups().find((held) => held.id === groupId);
return rosterName(groupId, group?.me) || rosterName(groupId, myName());
}
function rosterFor(document_) {
return document_?.groupId && !document_.linkOnly ? rosterOf(document_.groupId) : [];
}
function myNameFor(document_) {
return rosterFor(document_).length ? myNameIn(document_.groupId) : myName();
}
function setMyNameIn(groupId, name) {
const group = groups().find((held) => held.id === groupId);
const listed = rosterName(groupId, name);
if (!group || !listed || group.me === listed) return;
rememberGroup({ ...group, me: listed });
}
function chooseName(names, title, hint) {
return new Promise((resolve) => {
const dialog = makeDialog();
let chosen = '';
dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(title)}</h2>
        <p class="muted small">${escapeHtml(hint)}</p>
        <div class="row row--chips">
          ${names.map((name) => `<button type="button" class="chip" data-who="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}
        </div>
        <div class="row">
          <button type="button" class="button button--ghost" data-who-cancel>${escapeHtml(t('action.cancel'))}</button>
        </div>
      </div>`;
dialog.querySelectorAll('[data-who]').forEach((chip) => {
chip.addEventListener('click', () => {
chosen = chip.dataset.who;
dialog.close();
});
});
dialog.querySelector('[data-who-cancel]').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => resolve(chosen));
dialog.showModal();
});
}
async function askWhoIn(groupId) {
const group = groups().find((held) => held.id === groupId);
const roster = rosterOf(groupId);
if (!group || !roster.length) return '';
const chosen = await chooseName(roster, t('roster.whoTitle', { name: group.name }), t('roster.whoHint'));
if (chosen) setMyNameIn(groupId, chosen);
return chosen;
}
async function knockAs(name, code, me) {
const answer = await state.remote.ask(name, code, me, deviceLabel());
if (answer.status !== 'who') return { ...answer, me };
const chosen = await chooseName(answer.people, t('roster.whoTitle', { name }), t('roster.whoHint'));
if (!chosen) return { status: 'who', me };
return { ...(await state.remote.ask(name, code, chosen, deviceLabel())), me: chosen };
}
function offRoster(groupId, names) {
if (!rosterOf(groupId).length) return [];
const seen = new Set();
const out = [];
for (const name of names) {
const key = sameName(name);
if (!key || seen.has(key) || rosterName(groupId, name)) continue;
seen.add(key);
out.push(name);
}
return out;
}
function groupsByName() {
return [...groups()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
const OUTSIDE_GROUPS = 'outside';
function outsideGroups(document_) {
return !groups().some((group) => inGroup(document_, group.id));
}
function groupFilter() {
const wanted = state.prefs.groupFilter || '';
if (wanted === OUTSIDE_GROUPS) return groups().length ? wanted : '';
return groups().some((group) => group.id === wanted) ? wanted : '';
}
function setGroupFilter(id) {
state.prefs = { ...state.prefs, groupFilter: id || '' };
savePrefs(state.prefs);
}
function shownDocs(documents) {
const wanted = groupFilter();
if (wanted === OUTSIDE_GROUPS) return documents.filter(outsideGroups);
return wanted ? documents.filter((document_) => inGroup(document_, wanted)) : documents;
}
function hiddenByGroupHtml(all) {
const wanted = groupFilter();
if (!wanted) return '';
const hidden = all.length - shownDocs(all).length;
if (hidden <= 0) return '';
return `
    <p class="muted small">
      ${escapeHtml(t('filter.hidden', { count: hidden }))}
      <button type="button" class="button button--small button--ghost" data-group-filter="">
        ${escapeHtml(t('filter.all'))}
      </button>
    </p>`;
}
function autoGroup() {
if (!state.prefs.autoShare || !state.remote) return null;
const held = groups();
return held.length === 1 ? held[0] : null;
}
function groupForNew() {
const chosen = groupFilter();
if (chosen) return groups().find((group) => group.id === chosen) || null;
return autoGroup();
}
function resetGroupChoice() {
state.newGroupChoice = { touched: false, id: null };
state.newEventLink = null;
}
function chipOfEvent(poll) {
return poll.linkOnly ? LINK_ONLY : poll.groupId || '';
}
function linkedEvent() {
const poll = state.newEventLink ? state.polls.find((one) => one.id === state.newEventLink) : null;
if (!poll) return null;
if (state.remote && groups().length && state.newGroupChoice.touched && state.newGroupChoice.id !== chipOfEvent(poll)) {
state.newEventLink = null;
return null;
}
return poll;
}
function chooseEvent(poll) {
state.newEventLink = poll?.id || null;
if (poll && state.remote && groups().length) state.newGroupChoice = { touched: true, id: chipOfEvent(poll) };
}
const LINK_ONLY = '@lien';
function destinationForNew() {
const held = groups();
if (!state.remote || !held.length) return { group: null, linkOnly: false };
if (state.newGroupChoice.touched) {
if (state.newGroupChoice.id === LINK_ONLY) {
return { group: groupForNew() || groupsByName()[0], linkOnly: true };
}
const group = state.newGroupChoice.id ? held.find((item) => item.id === state.newGroupChoice.id) || null : null;
return { group, linkOnly: false };
}
return { group: groupForNew() || (held.length === 1 ? held[0] : null), linkOnly: false };
}
function landing(document_, { forEvent = true } = {}) {
const { group, linkOnly } = destinationForNew();
const event = forEvent ? linkedEvent() : null;
return {
...document_,
shared: Boolean(group),
groupId: group?.id || null,
...(linkOnly ? { linkOnly: true } : {}),
...(event ? { parent: event.id } : {}),
};
}
function willBeInHtml({ events = true } = {}) {
return `${groupChoiceHtml()}${events ? eventChoiceHtml() : ''}`;
}
function rosterForNew() {
const { group, linkOnly } = destinationForNew();
return group && !linkOnly ? rosterOf(group.id) : [];
}
function peopleForNew(names) {
const roster = rosterForNew();
if (!roster.length) return names;
const { group } = destinationForNew();
const me = sameName(myName());
const mine = sameName(myNameIn(group.id));
const keys = new Set(names.map(sameName).filter(Boolean).map((key) => (key === me && mine ? mine : key)));
return roster.filter((name) => keys.has(sameName(name)));
}
function rosterPickHtml(names, hint) {
const roster = rosterForNew();
if (!roster.length) return '';
const { group } = destinationForNew();
const on = new Set(peopleForNew(names).map(sameName));
return `
    <div class="stack stack--tight" data-roster-pick>
      <span class="muted small">${escapeHtml(hint)}</span>
      <div class="row row--chips" role="group" aria-label="${escapeHtml(t('roster.title'))}">
        ${roster
.map((name) => `
            <button type="button" class="chip ${on.has(sameName(name)) ? 'chip--on' : ''}"
                    data-roster-name="${escapeHtml(name)}" aria-pressed="${on.has(sameName(name)) ? 'true' : 'false'}">
              ${escapeHtml(name)}
            </button>`)
.join('')}
      </div>
      <div class="row">
        <button type="button" class="button button--small button--ghost" data-roster-all>${escapeHtml(t('roster.everyone'))}</button>
      </div>
      <p class="muted small">${escapeHtml(t('roster.formHint', { name: group.name }))}</p>
    </div>`;
}
function bindRosterPick(root, read, write) {
const mark = () => {
const on = new Set(peopleForNew(read()).map(sameName));
root.querySelectorAll('[data-roster-name]').forEach((chip) => {
const lit = on.has(sameName(chip.dataset.rosterName));
chip.classList.toggle('chip--on', lit);
chip.setAttribute('aria-pressed', lit ? 'true' : 'false');
});
};
root.querySelectorAll('[data-roster-name]').forEach((chip) => {
chip.addEventListener('click', () => {
const key = sameName(chip.dataset.rosterName);
const held = peopleForNew(read());
write(held.some((name) => sameName(name) === key)
? held.filter((name) => sameName(name) !== key)
: [...held, chip.dataset.rosterName]);
mark();
});
});
root.querySelector('[data-roster-all]')?.addEventListener('click', () => {
const all = rosterForNew();
write(peopleForNew(read()).length === all.length ? [] : [...all]);
mark();
});
}
function groupChoiceHtml() {
const held = groups();
if (!state.remote || !held.length) return '';
const { group, linkOnly } = destinationForNew();
const on = linkOnly ? LINK_ONLY : group?.id || '';
const chip = (id, label) => `
    <button type="button" class="chip ${on === id ? 'chip--on' : ''}"
            data-new-group="${escapeHtml(id)}" aria-pressed="${on === id ? 'true' : 'false'}">
      ${escapeHtml(label)}
    </button>`;
const note = linkOnly ? t('groups.linkOnlyHint') : group ? '' : t('groups.willBeInNone');
return `
    <div class="stack stack--tight">
      <span class="muted small">${escapeHtml(t('groups.willGoIn'))}</span>
      <div class="row row--chips" role="group" aria-label="${escapeHtml(t('groups.willGoIn'))}">
        ${groupsByName().map((item) => chip(item.id, item.name)).join('')}
        ${chip(LINK_ONLY, t('groups.linkOnly'))}
        ${chip('', t('groups.keepToMyself'))}
      </div>
      ${note ? `<p class="muted small">${escapeHtml(note)}</p>` : ''}
    </div>`;
}
function eventChoiceHtml() {
const linked = linkedEvent();
const coming = upcomingEvents(state.polls).slice(0, 6);
if (linked && !coming.includes(linked)) coming.unshift(linked);
if (!coming.length) return '';
const on = linked?.id || '';
const chip = (id, label) => `
    <button type="button" class="chip ${on === id ? 'chip--on' : ''}"
            data-new-event="${escapeHtml(id)}" aria-pressed="${on === id ? 'true' : 'false'}">
      ${escapeHtml(label)}
    </button>`;
return `
    <div class="stack stack--tight">
      <span class="muted small">${escapeHtml(t('event.forWhich'))}</span>
      <div class="row row--chips" role="group" aria-label="${escapeHtml(t('event.forWhich'))}">
        ${chip('', t('event.none'))}
        ${coming.map((poll) => chip(poll.id, `${eventName(poll) || poll.question} · ${formatDay(poll.date)}`)).join('')}
      </div>
    </div>`;
}
function bindEventChips(root) {
root.querySelectorAll('[data-new-event]').forEach((node) => {
node.addEventListener('click', () => {
const poll = state.polls.find((one) => one.id === node.dataset.newEvent) || null;
const before = rosterForNew().join('\n');
chooseEvent(poll);
const form = node.closest('form') || root;
if (rosterForNew().join('\n') !== before) {
form.dispatchEvent(new CustomEvent('rosterchange'));
return;
}
const mark = (selector, value) => form.querySelectorAll(selector).forEach((other) => {
const on = other.dataset[selector === '[data-new-event]' ? 'newEvent' : 'newGroup'] === value;
other.classList.toggle('chip--on', on);
other.setAttribute('aria-pressed', on ? 'true' : 'false');
});
mark('[data-new-event]', poll?.id || '');
if (poll && state.newGroupChoice.touched) mark('[data-new-group]', state.newGroupChoice.id || '');
});
});
}
function groupOf(document_) {
return document_?.groupId ? groups().find((group) => group.id === document_.groupId) || null : null;
}
function inGroupHtml(document_) {
if (!state.remote || !groups().length) return '';
if (document_.linkOnly) {
return `
      <div class="row row--tight">
        <span class="muted small">${escapeHtml(t('groups.inLinkOnly'))}</span>
      </div>`;
}
const group = groupOf(document_);
return `
    <div class="row row--tight">
      <span class="muted small">
        ${escapeHtml(group ? t('groups.inGroup', { name: group.name }) : t('groups.inNone'))}
      </span>
      ${
group
? groups().length > 1
? `<button type="button" class="button button--small button--ghost" data-copy-to-group="${escapeHtml(document_.id)}">
                 ${escapeHtml(t('groups.copyTo'))}
               </button>`
: ''
: `<button type="button" class="button button--small" data-put-in-group="${escapeHtml(document_.id)}">
               ${escapeHtml(t('groups.putIn'))}
             </button>`
}
    </div>`;
}
async function putInGroup(id) {
const poll = getPoll(id);
const list = getList(id);
const game = getGame(id);
const spend = getSpend(id);
const board = getBoard(id);
const document_ = poll || list || game || spend || board;
if (!document_ || !state.remote) return;
const group = await askGroup();
if (!group) {
render();
return;
}
const next = { ...document_, shared: true, groupId: group.id, updatedAt: Date.now() };
try {
await state.remote.put(next, group.key, organiserSecret(next.id));
} catch (error) {
pushFailed(next)(error);
render();
return;
}
flash(t('groups.putInDone', { name: group.name }));
if (poll) replacePoll(next);
else if (list) replaceList(next);
else if (spend) replaceSpend(next);
else if (board) replaceBoard(next);
else replaceGame(next);
}
async function removeEverywhere(document_) {
if (!state.remote || !document_.shared) return true;
try {
await state.remote.remove(document_.id, keyFor(document_), organiserSecret(document_.id));
return true;
} catch (error) {
const said = String(error?.detail || error?.message || '');
flash(t(/organisateur/.test(said) ? 'delete.notOrganiser' : /cle de groupe/.test(said) ? 'delete.noKey' : 'delete.offline'), 'error');
render();
return false;
}
}
async function deleteDocument(id) {
const poll = getPoll(id);
const list = getList(id);
const spend = getSpend(id);
const board = getBoard(id);
const game = getGame(id);
const document_ = poll || list || spend || board || game;
if (!document_) return;
const question = poll
? 'polls.confirmDelete'
: list
? 'lists.confirmDelete'
: spend
? 'spends.confirmDelete'
: board
? 'ideas.confirmDelete'
: 'game.confirmDeleteGame';
if (!(await ask(t(question), { confirmLabel: t('action.delete'), danger: true }))) {
render();
return;
}
if (!(await removeEverywhere(document_))) return;
if (poll) {
state.polls = state.polls.filter((item) => item.id !== id);
savePolls(state.polls);
} else if (list) {
state.lists = state.lists.filter((item) => item.id !== id);
saveLists(state.lists);
} else if (spend) {
state.spends = state.spends.filter((item) => item.id !== id);
saveSpends(state.spends);
} else if (board) {
state.boards = state.boards.filter((item) => item.id !== id);
saveBoards(state.boards);
} else {
state.games = state.games.filter((item) => item.id !== id);
saveGames(state.games);
}
if (state.store) void state.store.remove(id);
flash(t('swipe.deleted', { name: documentTitle(document_) }));
if (location.hash.endsWith(`/${id}`)) navigate('#/');
else render();
}
function bindDocSwipes() {
bindSwipes('doc', (id) => void deleteDocument(id));
}
async function copyToGroup(id) {
const poll = getPoll(id);
const list = getList(id);
const game = getGame(id);
const spend = getSpend(id);
const board = getBoard(id);
const document_ = poll || list || game || spend || board;
if (!document_ || !state.remote) return;
const group = await askGroup({ title: t('groups.copyWhere'), except: document_.groupId, always: true });
if (!group) {
render();
return;
}
const now = Date.now();
const fresh = {
...document_,
id: uid(document_.id.split('_')[0] || 'id'),
shared: true,
groupId: group.id,
linkOnly: false,
event: null,
parent: null,
links: [],
createdAt: now,
updatedAt: now,
archivedAt: null,
};
const copy = poll ? organise(fresh) : fresh;
try {
await state.remote.put(copy, group.key, organiserSecret(copy.id));
} catch {
flash(t('share.pushFailed'), 'error');
render();
return;
}
flash(t('groups.copiedTo', { name: group.name }));
if (poll) {
state.polls = [...state.polls, copy];
persistPoll(copy);
navigate(`#/poll/${copy.id}`);
} else if (list) {
state.lists = [...state.lists, copy];
persistList(copy);
navigate(`#/list/${copy.id}`);
} else if (spend) {
state.spends = [...state.spends, copy];
persistSpend(copy);
navigate(`#/spend/${copy.id}`);
} else if (board) {
state.boards = [...state.boards, copy];
persistBoard(copy);
navigate(`#/idea/${copy.id}`);
} else {
state.games = [...state.games, copy];
persist(copy);
navigate(`#/game/${copy.id}`);
}
}
function organiserSecret(id) {
return state.prefs.organiser?.[id] || null;
}
function heldOrganiserSecrets() {
const held = state.prefs.organiser || {};
return Object.fromEntries(state.polls.filter((poll) => held[poll.id]).map((poll) => [poll.id, held[poll.id]]));
}
function restoreOrganiserSecrets(found) {
if (!found || typeof found !== 'object' || Array.isArray(found)) return 0;
const held = { ...state.prefs.organiser };
let restored = 0;
for (const [id, secret] of Object.entries(found)) {
if (typeof secret !== 'string' || !/^[0-9a-f]{16,128}$/.test(secret) || held[id]) continue;
held[id] = secret;
restored += 1;
}
if (restored) {
state.prefs = { ...state.prefs, organiser: held };
savePrefs(state.prefs);
}
return restored;
}
async function claimChoices(before, after) {
const known = new Set(before.options.map((option) => option.id));
const fresh = after.options.filter((option) => !known.has(option.id));
if (!fresh.length || !globalThis.crypto?.subtle) return after;
const secrets = { ...state.prefs.chooser };
const marks = {};
for (const option of fresh) {
const bytes = new Uint8Array(16);
crypto.getRandomValues(bytes);
const secret = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)));
secrets[option.id] = secret;
marks[option.id] = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
state.prefs = { ...state.prefs, chooser: secrets };
savePrefs(state.prefs);
return { ...after, options: after.options.map((option) => (marks[option.id] ? { ...option, by: marks[option.id] } : option)) };
}
function ownsChoice(option) {
return Boolean(option?.by && state.prefs.chooser?.[option.id]);
}
function choiceUnlocks(poll) {
const held = state.prefs.chooser || {};
return Object.fromEntries(Object.keys(poll.removed || {}).filter((id) => held[id]).map((id) => [id, held[id]]));
}
function isOrganiser(poll) {
return !poll?.owned || Boolean(organiserSecret(poll.id));
}
function organise(poll) {
const bytes = new Uint8Array(16);
crypto.getRandomValues(bytes);
const secret = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
state.prefs = { ...state.prefs, organiser: { ...state.prefs.organiser, [poll.id]: secret } };
savePrefs(state.prefs);
return { ...poll, owned: true };
}
function keyFor(document_) {
const held = groups();
if (document_?.groupId) {
const group = held.find((item) => item.id === document_.groupId);
if (group) return group.key;
}
return held.length === 1 ? held[0].key : null;
}
async function askGroup({ title = null, except = null, keepToMyself = false, always = false } = {}) {
const held = groups().filter((group) => group.id !== except);
if (!held.length) return null;
if (held.length === 1 && !keepToMyself && !always) return held[0];
return new Promise((resolve) => {
const dialog = makeDialog('dialog dialog--ask');
dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(title || t('groups.which'))}</h2>
        <div class="stack stack--tight">
          ${held
.map(
(group) => `<button type="button" class="button button--block" data-group="${escapeHtml(group.id)}">${escapeHtml(group.name)}</button>`,
)
.join('')}
        </div>
        ${
keepToMyself
? `<button type="button" class="button button--block button--ghost" id="group-none">
                 ${escapeHtml(t('groups.keepToMyself'))}
               </button>
               <p class="muted small">${escapeHtml(t('groups.keepToMyselfHint'))}</p>`
: ''
}
        <div class="row">
          <button type="button" class="button" id="group-cancel">${escapeHtml(t('action.cancel'))}</button>
        </div>
      </div>`;
let answered = false;
const done = (group) => {
if (answered) return;
answered = true;
resolve(group);
dialog.close();
};
dialog.addEventListener('close', () => done(null));
dialog.querySelector('#group-cancel').addEventListener('click', () => done(null));
dialog.querySelector('#group-none')?.addEventListener('click', () => done(null));
dialog.querySelectorAll('[data-group]').forEach((button) => {
button.addEventListener('click', () => done(held.find((group) => group.id === button.dataset.group)));
});
dialog.showModal();
});
}
async function startSharing(document_) {
if (document_.shared) return document_;
const group = await askGroup();
if (!group) {
flash(t('groups.needOne'), 'error');
render();
return null;
}
const shared = { ...document_, shared: true, groupId: group.id, updatedAt: Date.now() };
try {
await state.remote.put(shared, group.key, organiserSecret(shared.id));
} catch (error) {
flash(remoteReason(error), 'error');
render();
return null;
}
return shared;
}
const NAME_KEPT = 24;
function openClaudeGuide() {
const me = myName();
showCopyDialog({
title: t('claude.title'),
hint: t('claude.hint'),
text: t('claude.guide', { link: appLink(), me: me || t('claude.noName') }),
});
}
function myName() {
const value = state.prefs.me;
return typeof value === 'string' ? value.trim().slice(0, NAME_KEPT) : '';
}
function setMyName(name) {
const clean = String(name || '').trim().slice(0, NAME_KEPT);
if (clean === myName()) return clean;
state.prefs = { ...state.prefs, me: clean };
savePrefs(state.prefs);
offerMeInForms();
return clean;
}
function offerMeInForms() {
state.newListPeople = withMeFirst(state.newListPeople, myName());
state.newPollPeople = withMeFirst(state.newPollPeople, myName());
state.newEventPeople = withMeFirst(state.newEventPeople, myName());
state.newSpendPeople = withMeFirst(state.newSpendPeople, myName());
state.newGameTouched = false;
}
function inAppWarningHtml() {
const app = inAppBrowser(navigator.userAgent);
if (!app) return '';
return `
    <p class="banner banner--warn">
      ${escapeHtml(t('browser.inApp', { app }))}
      <button type="button" class="button button--small" id="copy-here">
        ${escapeHtml(t('browser.copyLink'))}
      </button>
    </p>`;
}
function bindInAppWarning() {
view.querySelector('#copy-here')?.addEventListener('click', () => {
showCopyDialog({
title: t('browser.copyTitle'),
hint: t('browser.copyHint'),
text: location.href,
});
});
}
function onHomeScreen() {
return Boolean(matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone);
}
function deviceLabel() {
const standalone = onHomeScreen();
const where = standalone ? t('groups.onHomeScreen') : t('groups.inBrowser');
return `${where} · ${formatDate(Date.now())}`;
}
async function joinGroup(key) {
const clean = String(key || '').trim();
if (!clean || !state.remote) return null;
const group = await state.remote.groupOf(clean);
if (!group) return null;
rememberGroup({
id: group.id, name: group.name, key: clean, admits: Boolean(group.admits),
accounts: Boolean(group.accounts), linked: Boolean(group.linked), channel: liveChannel(group),
people: fixedPeople(group),
});
return group;
}
async function verifyGroups() {
if (!state.remote) return false;
let learnt = false;
for (const group of groups()) {
let found = null;
try {
found = await state.remote.groupOf(group.key);
} catch {
continue; 
}
if (!found) {
forgetGroup(group.id);
flash(t('gate.cutMe', { name: group.name }), 'error');
learnt = true;
continue;
}
if (found.name !== group.name || Boolean(found.admits) !== group.admits
|| Boolean(found.accounts) !== Boolean(group.accounts) || Boolean(found.linked) !== Boolean(group.linked)
|| liveChannel(found) !== (group.channel || '')
|| fixedPeople(found).join('\n') !== rosterOf(group.id).join('\n')
|| (!group.me && found.who)) {
rememberGroup({
...group, name: found.name || group.name, admits: Boolean(found.admits),
accounts: Boolean(found.accounts), linked: Boolean(found.linked), channel: liveChannel(found),
people: fixedPeople(found), me: group.me || knownAs(found),
});
learnt = true;
}
}
return learnt;
}
function pendings() {
const value = state.prefs.pendings;
return Array.isArray(value)
? value.filter((knock) => knock && typeof knock.ticket === 'string' && knock.ticket)
: [];
}
const KNOCKS_KEPT = 20;
function rememberPending(knock) {
const others = pendings().filter((held) => held.ticket !== knock.ticket);
state.prefs = { ...state.prefs, pendings: [...others, knock].slice(-KNOCKS_KEPT) };
savePrefs(state.prefs);
}
function forgetPending(ticket) {
state.prefs = { ...state.prefs, pendings: pendings().filter((knock) => knock.ticket !== ticket) };
savePrefs(state.prefs);
}
function pendingFor(name) {
const wanted = String(name || '').trim().toLowerCase();
if (!wanted) return null;
return pendings().find((knock) => String(knock.groupName || '').trim().toLowerCase() === wanted) || null;
}
async function checkPending(knock) {
if (!state.remote) return null;
let answer = null;
try {
answer = await state.remote.claim(knock.ticket);
} catch {
return null;
}
if (answer.status === 'ok') {
const alreadyIn = groups().find((item) => item.id === answer.id);
const group = alreadyIn || { id: answer.id, name: answer.name || knock.groupName, key: knock.ticket, admits: false, me: knock.me || '' };
rememberGroup(group);
forgetPending(knock.ticket);
await refreshGroup(group);
let taken = 0;
try {
taken = await catchUpWith(group);
} catch {
}
const offered = !alreadyIn && offerAccount(group);
flash(offered || account()
? t(taken ? 'groups.joinedWith' : 'groups.joined', { name: group.name, count: taken })
: t(taken ? 'groups.joinedWithKeepLink' : 'groups.joinedKeepLink', { name: group.name, count: taken }));
return 'ok';
}
if (answer.status === 'refused') {
forgetPending(knock.ticket);
flash(t('gate.refusedMe', { name: knock.groupName }), 'error');
return 'refused';
}
if (answer.status === 'unknown') {
forgetPending(knock.ticket);
flash(t('gate.lostMe', { name: knock.groupName }), 'error');
return 'unknown';
}
return 'waiting';
}
async function checkAllPendings() {
let learnt = false;
for (const knock of pendings()) {
const status = await checkPending(knock);
if (status && status !== 'waiting') learnt = true;
}
return learnt;
}
function gate() {
if (!state.gate) state.gate = { requests: {}, devices: {}, asked: {}, at: {} };
return state.gate;
}
function forgetGate(groupId) {
const held = gate();
delete held.requests[groupId];
delete held.devices[groupId];
delete held.asked[groupId];
delete held.at[groupId];
}
async function refreshGate() {
let changed = false;
for (const group of groups()) {
if (group.admits === false) continue;
const before = JSON.stringify(gate().requests[group.id] ?? null)
+ JSON.stringify(gate().devices[group.id] ?? null);
gate().asked[group.id] = false;
await loadGate(group);
const after = JSON.stringify(gate().requests[group.id] ?? null)
+ JSON.stringify(gate().devices[group.id] ?? null);
if (before !== after) changed = true;
}
return changed;
}
async function loadGate(group) {
const held = gate();
if (held.asked[group.id]) return false;
held.asked[group.id] = true;
if (!state.remote) return false;
try {
const [requests, devices] = await Promise.all([
state.remote.requests(group.key),
state.remote.groupKeys(group.key),
]);
held.requests[group.id] = requests;
held.devices[group.id] = devices;
held.at[group.id] = Date.now();
return true;
} catch (error) {
if (/ne fait pas entrer/i.test(String(error?.message || ''))) {
rememberGroup({ ...group, admits: false });
return true;
}
held.asked[group.id] = false;
return false;
}
}
function liveChannel(found) {
return typeof found?.channel === 'string' && /^[a-z0-9]{8,64}$/.test(found.channel) ? found.channel : '';
}
async function refreshGroup(group) {
if (!state.remote) return false;
let found = null;
try {
found = await state.remote.groupOf(group.key);
} catch {
return false;
}
if (!found) return false;
const held = groups().find((one) => one.id === group.id) || group;
rememberGroup({
...held, name: found.name || held.name, admits: Boolean(found.admits),
accounts: Boolean(found.accounts), linked: Boolean(found.linked), channel: liveChannel(found),
people: fixedPeople(found), me: held.me || knownAs(found),
});
return true;
}
async function catchUpAll() {
let taken = 0;
for (const group of groups()) {
try {
taken += await catchUpWith(group);
} catch {
}
}
for (const poll of state.polls.filter((held) => held.shared && held.linkOnly && !held.archivedAt)) {
try {
if (await pullPoll(poll.id)) taken += 1;
} catch {
}
}
state.syncedAt = Date.now();
return taken;
}
const SYNC_EVERY = 20000;
const SYNC_HEARD = 120000;
async function catchUpQuietly() {
if (!state.remote || !groups().length) return;
const every = liveCoversGroups() ? SYNC_HEARD : SYNC_EVERY;
if (state.syncedAt && Date.now() - state.syncedAt < every) return;
const taken = await catchUpAll();
const changed = showsGate() ? await refreshGate() : false;
if ((taken || changed) && !isBusy()) render();
}
async function catchUpWith(group) {
if (!state.remote) return 0;
const rows = await state.remote.groupDocs(group.key);
let taken = 0;
for (const row of rows) {
const held = getGame(row.id) || getList(row.id) || getPoll(row.id);
if (held && (row.updatedAt || 0) <= (held.updatedAt || 0)) continue;
if (await pullAny(row.id)) taken += 1;
}
return taken;
}
function lots() {
const value = state.prefs.lots;
return Array.isArray(value) ? value.filter((lot) => lot && typeof lot.id === 'string') : [];
}
const LOTS_KEPT = 200;
function rememberLot(lot) {
state.prefs = { ...state.prefs, lots: [lot, ...lots()].slice(0, LOTS_KEPT) };
savePrefs(state.prefs);
}
function forgetLot(id) {
state.prefs = { ...state.prefs, lots: lots().filter((lot) => lot.id !== id) };
savePrefs(state.prefs);
}
function remoteReason(error) {
const text = String(error?.message || '');
if (error?.status === 404 || /PGRST202/.test(text)) {
return t(groups().some((group) => group.admits) ? 'shareApp.needsSql' : 'shareApp.needsUpdate');
}
if (/cle de (partage|groupe)/i.test(text)) return t('groups.refused');
return t('shareApp.failed');
}
function openShareAppDialog() {
const games = [...state.games, ...state.lists, ...state.polls, ...state.spends, ...state.boards].sort((a, b) => b.updatedAt - a.updatedAt);
const held = groups();
if (!state.remote || !games.length) {
void shareUrl({
url: appLink(),
title: t('shareApp.title'),
hint: t('shareApp.hint'),
text: t('shareApp.text'),
});
return;
}
const off = held.length ? '' : ' disabled';
const dialog = makeDialog();
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('shareApp.title'))}</h2>
      <div class="stack stack--tight" role="radiogroup" aria-label="${escapeHtml(t('shareApp.title'))}">
        <label class="choice">
          <input type="radio" name="share-kind" value="app" checked />
          <span>${escapeHtml(t('shareApp.kindApp'))}<span class="muted small"> — ${escapeHtml(t('shareApp.kindAppHint'))}</span></span>
        </label>
        <label class="choice${held.length ? '' : ' choice--off'}">
          <input type="radio" name="share-kind" value="all"${off} />
          <span>${escapeHtml(t('shareApp.kindAll', { count: games.length }))}</span>
        </label>
        <label class="choice${held.length ? '' : ' choice--off'}">
          <input type="radio" name="share-kind" value="some"${off} />
          <span>${escapeHtml(t('shareApp.kindSome'))}</span>
        </label>
      </div>

      ${held.length ? '' : `<p class="banner">${escapeHtml(t('groups.needOne'))}</p>`}

      <div class="stack stack--tight" id="share-pick" hidden>
        <p class="muted small">${escapeHtml(t('shareApp.pickHint'))}</p>
        ${games
.map(
(game) => `
              <label class="choice">
                <input type="checkbox" data-share-id="${escapeHtml(game.id)}" />
                <span>${escapeHtml(documentTitle(game))}<span class="muted small"> — ${escapeHtml(formatDate(game.updatedAt))}</span></span>
              </label>`,
)
.join('')}
      </div>

      <p class="muted small" id="share-note" hidden>${escapeHtml(t('shareApp.note'))}</p>
      <p class="banner banner--warn" id="share-error" hidden></p>
      <div class="row">
        <button type="button" class="button button--primary" id="share-make">${escapeHtml(t('shareApp.make'))}</button>
        <button type="button" class="button" id="share-cancel">${escapeHtml(t('action.cancel'))}</button>
      </div>
    </div>`;
const close = () => dialog.close();
const button = dialog.querySelector('#share-make');
const error = dialog.querySelector('#share-error');
const kind = () => dialog.querySelector('input[name="share-kind"]:checked').value;
const refresh = () => {
dialog.querySelector('#share-pick').hidden = kind() !== 'some';
dialog.querySelector('#share-note').hidden = kind() === 'app';
error.hidden = true;
};
dialog.querySelectorAll('input[name="share-kind"]').forEach((input) => {
input.addEventListener('change', refresh);
});
const fail = (message) => {
error.textContent = message;
error.hidden = false;
button.disabled = false;
button.textContent = t('shareApp.make');
};
dialog.querySelector('#share-cancel').addEventListener('click', close);
button.addEventListener('click', async () => {
const choice = kind();
if (choice === 'app') {
close();
void shareUrl({
url: appLink(),
title: t('shareApp.title'),
hint: t('shareApp.hint'),
text: t('shareApp.text'),
});
return;
}
const chosen =
choice === 'all'
? games
: [...dialog.querySelectorAll('input[data-share-id]:checked')]
.map((input) =>
getGame(input.dataset.shareId) || getList(input.dataset.shareId) || getPoll(input.dataset.shareId))
.filter(Boolean);
if (!chosen.length) return fail(t('shareApp.pickNone'));
button.disabled = true;
button.textContent = t('share.sending');
const setId = uid('lot');
const code = newCode();
const ids = chosen.map((game) => game.id);
const group = await askGroup();
if (!group) return fail(t('groups.needOne'));
try {
if (!(await state.remote.groupOf(group.key))) return fail(t('groups.refused'));
const contents = canSeal() ? { sealed: await seal(ids, code) } : { ids };
await shareGames(chosen, group);
await state.remote.putSet(setId, contents, code, group.key);
} catch (error_) {
return fail(remoteReason(error_));
}
rememberLot({ id: setId, code, count: chosen.length, createdAt: Date.now() });
close();
render();
showLotLink(setId, code, chosen.length);
});
dialog.showModal();
}
function showLotLink(setId, code, count) {
showCopyDialog({
title: t('shareSet.title'),
hint: t('shareSet.hint', { count }),
text: setLink(location, setId),
qr: true,
code,
send: true,
});
}
async function shareGames(games, group) {
try {
for (const document_ of games) {
const next = document_.shared
? document_
: { ...document_, shared: true, groupId: group.id, updatedAt: Date.now() };
await state.remote.put(next, group.key, organiserSecret(next.id));
if (next === document_) continue;
state.games = state.games.map((item) => (item.id === next.id ? next : item));
state.lists = state.lists.map((item) => (item.id === next.id ? next : item));
state.polls = state.polls.map((item) => (item.id === next.id ? next : item));
if (state.store) void state.store.save(next);
}
} finally {
saveGames(state.games);
saveLists(state.lists);
savePolls(state.polls);
}
}
function openMySharesDialog() {
const dialog = makeDialog();
const close = () => dialog.close();
const draw = () => {
const mine = lots();
dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(t('lots.title', { count: mine.length }))}</h2>
        <p class="muted small">${escapeHtml(t('lots.hint'))}</p>
        <p class="banner banner--warn" id="lots-error" hidden></p>
        ${
mine.length
? `<div class="stack stack--tight">${mine
.map(
(lot) => `
                    <div class="lot">
                      <div>
                        <span class="lot__code">${escapeHtml(lot.code || '······')}</span>
                        <span class="muted small">${escapeHtml(t('lots.line', {
count: lot.count || 0,
date: formatDate(lot.createdAt || Date.now()),
}))}</span>
                      </div>
                      <div class="row">
                        <button type="button" class="button button--small" data-lot-link="${escapeHtml(lot.id)}">${escapeHtml(t('lots.link'))}</button>
                        <button type="button" class="button button--small button--ghost" data-lot-revoke="${escapeHtml(lot.id)}">${escapeHtml(t('lots.revoke'))}</button>
                      </div>
                    </div>`,
)
.join('')}</div>`
: `<p class="muted small">${escapeHtml(t('lots.empty'))}</p>`
}
        <div class="row">
          <button type="button" class="button" id="lots-close">${escapeHtml(t('action.close'))}</button>
        </div>
      </div>`;
dialog.querySelector('#lots-close').addEventListener('click', close);
dialog.querySelectorAll('[data-lot-link]').forEach((node) => {
node.addEventListener('click', () => {
const lot = lots().find((item) => item.id === node.dataset.lotLink);
if (lot) showLotLink(lot.id, lot.code, lot.count || 0);
});
});
dialog.querySelectorAll('[data-lot-revoke]').forEach((node) => {
node.addEventListener('click', async () => {
const id = node.dataset.lotRevoke;
if (!(await ask(t('lots.confirmRevoke'), { confirmLabel: t('lots.revoke'), danger: true }))) return;
node.disabled = true;
node.textContent = t('share.sending');
let gone = false;
try {
gone = await state.remote.forgetSet(id, groups()[0]?.key || '');
} catch (error) {
const line = dialog.querySelector('#lots-error');
line.textContent = remoteReason(error);
line.hidden = false;
node.disabled = false;
node.textContent = t('lots.revoke');
return;
}
forgetLot(id);
draw();
if (!gone) {
const line = dialog.querySelector('#lots-error');
line.textContent = t('lots.alreadyGone');
line.hidden = false;
}
render();
});
});
};
draw();
dialog.showModal();
}
function askLotCode(id) {
return new Promise((resolve) => {
const dialog = makeDialog('dialog dialog--ask');
dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(t('shareSet.codeTitle'))}</h2>
        <p class="muted small">${escapeHtml(t('shareSet.codeHint'))}</p>
        <input type="text" id="lot-code" class="code-input" inputmode="numeric" autocomplete="one-time-code"
               maxlength="7" aria-label="${escapeHtml(t('shareSet.codeTitle'))}" />
        <p class="banner banner--warn" id="lot-error" hidden></p>
        <div class="row">
          <button type="button" class="button button--primary" id="lot-open">${escapeHtml(t('openLink.open'))}</button>
          <button type="button" class="button" id="lot-cancel">${escapeHtml(t('action.cancel'))}</button>
        </div>
      </div>`;
const button = dialog.querySelector('#lot-open');
const error = dialog.querySelector('#lot-error');
const done = (value) => { resolve(value); dialog.close(); };
dialog.addEventListener('close', () => resolve(null));
const fail = (message) => {
error.textContent = message;
error.hidden = false;
button.disabled = false;
button.textContent = t('openLink.open');
dialog.querySelector('#lot-code').select();
};
dialog.querySelector('#lot-cancel').addEventListener('click', () => done(null));
button.addEventListener('click', async () => {
const code = readCode(dialog.querySelector('#lot-code').value);
if (!code) return fail(t('shareSet.badCode'));
button.disabled = true;
button.textContent = t('share.sending');
let answer = null;
try {
answer = await state.remote.openSet(id, code);
} catch (error_) {
return fail(remoteReason(error_));
}
if (answer.status === 'wrong') return fail(t('shareSet.wrongCode', { left: answer.left }));
if (answer.status === 'locked') {
flash(t('shareSet.locked'), 'error');
return done(null);
}
if (answer.status !== 'ok') {
flash(t('shareSet.notFound'), 'error');
return done(null);
}
const ids = answer.contents?.sealed
? await unseal(answer.contents.sealed, code)
: answer.contents?.ids;
const clean = Array.isArray(ids) ? ids.filter((value) => typeof value === 'string') : [];
if (!clean.length) return fail(t('shareSet.cannotUnseal'));
done(clean);
});
dialog.showModal();
dialog.querySelector('#lot-code').focus();
});
}
async function openSet(id) {
if (!state.remote) {
flash(t('shareSet.noDatabase'), 'error');
return;
}
const ids = await askLotCode(id);
if (!ids) return;
for (const id_ of ids) await pullAny(id_);
const held = ids.filter((id_) => getGame(id_) || getList(id_) || getPoll(id_)).length;
if (!held) {
flash(t('shareSet.notFound'), 'error');
return;
}
flash(
held === ids.length
? t('shareSet.opened', { count: held })
: t('shareSet.openedSome', { count: held, total: ids.length }),
);
}
function bindHome() {
const search = view.querySelector('#search');
search?.addEventListener('input', (event) => {
state.search = event.target.value;
const at = event.target.selectionStart;
render();
const again = view.querySelector('#search');
if (again) {
again.focus();
try { again.setSelectionRange(at, at); } catch {   }
}
});
}
function bindData() {
view.querySelector('#look-update')?.addEventListener('click', async (event) => {
const button = event.currentTarget;
button.disabled = true;
const answer = await lookForUpdate();
button.disabled = false;
if (answer === 'coming') flash(t('data.updateComing'));
else if (answer === 'current') flash(t('data.updateNone'));
else flash(t('data.updateUnknown'), 'error');
render();
});
view.querySelector('#share-app')?.addEventListener('click', openShareAppDialog);
view.querySelector('#my-shares')?.addEventListener('click', openMySharesDialog);
view.querySelector('#auto-share')?.addEventListener('change', (event) => {
state.prefs = { ...state.prefs, autoShare: event.target.checked };
savePrefs(state.prefs);
});
view.querySelector('#export')?.addEventListener('click', exportGames);
view.querySelector('#import-paste')?.addEventListener('click', openPasteDialog);
view.querySelector('#open-link')?.addEventListener('click', openLinkDialog);
view.querySelector('#claude-guide')?.addEventListener('click', openClaudeGuide);
const fileInput = view.querySelector('#import-file');
view.querySelector('#import')?.addEventListener('click', () => fileInput?.click());
fileInput?.addEventListener('change', async () => {
const file = fileInput.files?.[0];
if (!file) return;
try {
importGames(await file.text());
} catch {
flash(t('home.importFailed'), 'error');
}
render();
});
}

// ---- src/view-flows.js -----------------------------------------------
function settlePollActivity(poll, how) {
const settled = settleAsActivity(poll, everything(), how);
if (!settled) return false;
const made = organise(signedEvent(settled.activity));
state.polls = [...state.polls, made];
persistPoll(made);
flash(t('activity.made', { name: documentTitle(made), event: chainLabelShort(byId(made.parent) || made) }));
replacePoll(settled.poll);
return true;
}
function byId(id) {
return everything().find((one) => one.id === id) || null;
}
function offersHtml(title, buttons) {
return buttons.length
? `<div class="stack stack--tight">
         <span class="muted small">${escapeHtml(title)}</span>
         <div class="row row--chips">${buttons.join('')}</div>
       </div>`
: '';
}
function offerButton(attr, value, label) {
return `<button type="button" class="chip" ${attr}="${escapeHtml(value)}">+ ${escapeHtml(label)}</button>`;
}
function listFlowsHtml(list) {
const all = everything();
const blocks = [];
for (const board of related(list, all, 'board')) {
const offers = ideasFor(list, board).filter((one) => !one.added).slice(0, 12);
blocks.push(offersHtml(t('flows.ideasFrom', { name: documentTitle(board) }),
offers.map((one) => offerButton('data-flow-idea', `${board.id}|${one.card.id}`, one.text))));
}
for (const poll of related(list, all, 'poll')) {
const offers = winnerOffers(poll, list).filter((one) => !one.added);
blocks.push(offersHtml(t('flows.chosenIn', { name: documentTitle(poll) }),
offers.map((one) => offerButton('data-flow-winner', `${poll.id}|${one.option.id}`, choiceLabel(one.option)))));
}
for (const spend of accountsFor(list, all)) {
blocks.push(ticketOffersHtml(list, spend, t('flows.toAccount', { name: documentTitle(spend) })));
}
const shown = blocks.filter(Boolean);
return shown.length
? `<section class="card stack flows" data-flows-for="${escapeHtml(list.id)}" aria-label="${escapeHtml(t('flows.title'))}">${shown.join('')}</section>`
: '';
}
function ticketOffersHtml(list, spend, title) {
return offersHtml(title, ticketGroups(list, spend, everything()).map((group) => {
const words = group.items.slice(0, 3).map((item) => withoutPrice(item.text)).join(', ');
const more = group.items.length > 3 ? ` +${group.items.length - 3}` : '';
const label = group.who ? t('flows.ticketOf', { name: group.who, lines: `${words}${more}` }) : `${words}${more}`;
return `<button type="button" class="chip" data-flow-ticket="${escapeHtml(`${spend.id}|${list.id}|${group.whoId}`)}">💶 ${escapeHtml(label)}</button>`;
}));
}
function openTicketDialog(spend, list, picked) {
const account = byId(spend.id) || spend;
const source = byId(list.id) || list;
const all = everything();
const waiting = unspentItems(source, account, all);
const chosen = new Set(picked.map((item) => item.id).filter((id) => waiting.some((item) => item.id === id)));
if (!chosen.size) return;
const lines = () => waiting.filter((item) => chosen.has(item.id));
const holders = [...new Set(lines().map((item) => item.who))];
const holder = holders.length === 1 ? source.people.find((person) => person.id === holders[0])?.name || '' : '';
const names = [...new Set([holder, ...account.people.map((person) => person.name), ...source.people.map((person) => person.name)]
.map((name) => String(name || '').trim()).filter(Boolean))];
let payer = holder || names.find((name) => sameName(name) === sameName(myNameFor(account))) || names[0] || '';
const guess = () => estimateOf(lines());
const dialog = makeDialog();
dialog.innerHTML = `
    <form class="stack" method="dialog">
      <h2>${escapeHtml(t('flows.ticketTitle', { name: documentTitle(account) }))}</h2>
      <div class="ticket-lines" role="group" aria-label="${escapeHtml(t('flows.ticketLines'))}">
        ${waiting.map((item) => {
const price = priceIn(item.text);
return `
            <label class="split-row">
              <input type="checkbox" data-ticket-line="${escapeHtml(item.id)}" ${chosen.has(item.id) ? 'checked' : ''} />
              <span class="split-row__name">${escapeHtml(withoutPrice(item.text))}</span>
              ${price ? `<span class="split-row__share">≈ ${escapeHtml(money(price, account))}</span>` : ''}
            </label>`;
}).join('')}
      </div>
      <label>
        ${escapeHtml(t('spends.what'))}
        <input type="text" id="ticket-text" autocomplete="off" value="${escapeHtml(ticketText(source, lines()))}" />
      </label>
      <label>
        ${escapeHtml(t('spends.amount'))}
        <input type="text" inputmode="decimal" id="ticket-amount" autocomplete="off" placeholder="0,00"
               value="${guess() ? escapeHtml(typedAmount(guess())) : ''}" />
      </label>
      ${
names.length
? `<span class="small">${escapeHtml(t('flows.paidBy'))}</span>
             <div class="row row--chips" role="group" aria-label="${escapeHtml(t('flows.paidBy'))}">${names.map((name) => `
               <button type="button" class="chip ${name === payer ? 'chip--on' : ''}" data-flow-payer="${escapeHtml(name)}"
                       aria-pressed="${name === payer ? 'true' : 'false'}">${escapeHtml(name)}</button>`).join('')}
             </div>`
: ''
}
      ${account.people.length > 1 ? splitEditorHtml(account, { forWhom: defaultForWhom(source, account, all), groups: forWhomGroups(account, all) }) : ''}
      <p class="late small" id="ticket-error" hidden></p>
      <div class="row">
        <button type="submit" class="button button--primary" id="ticket-ok">${escapeHtml(t('flows.spendAdd'))}</button>
        <button type="button" class="button" data-flow-cancel>${escapeHtml(t('action.cancel'))}</button>
      </div>
    </form>`;
const text = dialog.querySelector('#ticket-text');
const amount = dialog.querySelector('#ticket-amount');
let ownText = false;
let ownAmount = false;
text.addEventListener('input', () => { ownText = true; });
const split = bindSplitEditor(dialog, account, () => readAmount(amount.value));
amount.addEventListener('input', () => {
ownAmount = true;
split.refresh();
});
dialog.querySelectorAll('[data-ticket-line]').forEach((box) => {
box.addEventListener('change', () => {
if (box.checked) chosen.add(box.dataset.ticketLine);
else chosen.delete(box.dataset.ticketLine);
if (!ownText) text.value = lines().length ? ticketText(source, lines()) : '';
if (!ownAmount) amount.value = guess() ? typedAmount(guess()) : '';
split.refresh();
});
});
dialog.querySelectorAll('[data-flow-payer]').forEach((node) => {
node.addEventListener('click', () => {
payer = node.dataset.flowPayer;
dialog.querySelectorAll('[data-flow-payer]').forEach((one) => {
const on = one === node;
one.classList.toggle('chip--on', on);
one.setAttribute('aria-pressed', on ? 'true' : 'false');
});
});
});
const problem = (message) => {
const error = dialog.querySelector('#ticket-error');
error.textContent = message;
error.hidden = false;
};
dialog.querySelector('[data-flow-cancel]').addEventListener('click', () => dialog.close());
dialog.querySelector('form').addEventListener('submit', (event) => {
event.preventDefault();
const cents = readAmount(amount.value);
if (!lines().length) return problem(t('flows.ticketNoLine'));
if (!cents) {
amount.focus();
return problem(t('spends.notAnAmount'));
}
const shared = split.read();
if (shared.error) return problem(shared.error);
const fresh = byId(spend.id) || spend;
const next = spendFromLines(fresh, byId(list.id) || list, lines(), cents, {
byName: payer, text: text.value, forWhom: shared.forWhom, parts: shared.parts, fixed: shared.fixed,
});
dialog.close();
if (next === fresh) return;
flash(t('flows.spent', { name: next.lines[next.lines.length - 1].text, account: documentTitle(spend) }));
replaceAny(next);
});
dialog.showModal();
amount.focus();
}
function boardFlowsHtml(board) {
if (ideasFor({ items: [] }, board).length < 2) return '';
return `<button type="button" class="button button--small" data-flow-vote="${escapeHtml(board.id)}">🗳️ ${escapeHtml(t('flows.vote'))}</button>`;
}
async function voteOnIdeas(board) {
const question = await askForText({
title: t('flows.voteTitle'),
hint: t('flows.voteHint'),
value: documentTitle(board),
confirmLabel: t('flows.voteMake'),
});
if (question === null || question === undefined) return;
const poll = signed(organise(pollFromIdeas(board, { question, names: [myNameFor(board)].filter(Boolean) })));
state.polls = [...state.polls, poll];
persistPoll(poll);
flash(t('flows.voteMade'));
navigate(`#/poll/${poll.id}`);
}
function pollFlowsHtml(poll) {
if (!winnersOf(poll).length) return '';
const blocks = related(poll, everything(), 'list').map((list) => offersHtml(
t('flows.intoList', { name: documentTitle(list) }),
winnerOffers(poll, list).filter((one) => !one.added)
.map((one) => offerButton('data-flow-winner-to', `${list.id}|${one.option.id}`, choiceLabel(one.option))),
)).filter(Boolean);
return blocks.length
? `<section class="card stack flows" data-flows-for="${escapeHtml(poll.id)}" aria-label="${escapeHtml(t('flows.title'))}">${blocks.join('')}</section>`
: '';
}
function eventFlowsHtml(event) {
const missing = missingGoers(event, everything());
if (!missing.length) return '';
return `
    <div class="card stack stack--tight flows">
      ${missing.map((one) => `<p class="small">${escapeHtml(t('flows.missing', { names: one.names.join(', '), name: documentTitle(one.document) }))}</p>`).join('')}
      <div class="row"><button type="button" class="button button--small" data-flow-people="${escapeHtml(event.id)}">${escapeHtml(t('flows.people'))}</button></div>
    </div>`;
}
function unblockedHtml() {
const found = unblockedNow(shownDocs(everything())).slice(0, 5);
if (!found.length) return '';
return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('flows.unblocked'))}</h2></div>
      <div class="game-list">${found.map(({ document: one, by }) => `
        <button type="button" class="game-card" data-goto="${escapeHtml(documentHref(one))}">
          <span class="game-card__title">🔓 ${escapeHtml(documentTitle(one))}</span>
          <span class="game-card__meta">${escapeHtml(t('flows.freedBy', { names: by.map(chainLabel).join(', ') }))}</span>
        </button>`).join('')}
      </div>
    </section>`;
}
function activityWhen(activity) {
return activity.date ? whenText(activity) : t('activity.unscheduled');
}
function programmeHtml(event, { guest = false } = {}) {
const activities = programmeOf(event, everything());
const votes = activityVotes(event, everything());
if (guest && !activities.length && !votes.length) return '';
return `
    <div class="stack stack--tight programme" data-flows-for="${escapeHtml(event.id)}">
      <span class="muted small">${escapeHtml(t('activity.programme'))}</span>
      ${
activities.length
? `<ul class="programme__list">${activities.map((one) => `
              <li>
                <button type="button" class="programme__item" data-goto="${escapeHtml(documentHref(one))}">
                  <span class="programme__when">${escapeHtml(activityWhen(one))}</span>
                  <span class="programme__what">${escapeHtml(documentTitle(one))}</span>
                  ${outsideEvent(one, event) ? `<span class="pill pill--late">${escapeHtml(t('activity.outsideShort'))}</span>` : ''}
                  ${talkSumHtml(one)}
                </button>
              </li>`).join('')}</ul>`
: votes.length ? '' : `<p class="muted small">${escapeHtml(t('activity.none'))}</p>`
}
      ${votes.length ? `<ul class="programme__list">${votes.map((one) => `
        <li>
          <button type="button" class="programme__item programme__item--vote" data-goto="${escapeHtml(documentHref(one))}">
            <span class="programme__when">🎯 ${escapeHtml(t('activity.voting'))}</span>
            <span class="programme__what">${escapeHtml(documentTitle(one))}</span>
          </button>
        </li>`).join('')}</ul>` : ''}
      ${guest ? '' : `<div class="row"><button type="button" class="button button--small" data-flow-activity="${escapeHtml(event.id)}">+ ${escapeHtml(t('activity.add'))}</button></div>`}
    </div>`;
}
function dayChipsHtml(event, picked, { none = true, noneLabel = t('activity.unscheduled'), attr = 'data-activity-day' } = {}) {
const chip = (value, label) => `<button type="button" class="chip ${value === picked ? 'chip--on' : ''}" ${attr}="${escapeHtml(value)}"
      aria-pressed="${value === picked ? 'true' : 'false'}">${escapeHtml(label)}</button>`;
return `<div class="row row--chips" role="group">
      ${eventDays(event).map((day) => chip(day, formatDayLong(day))).join('')}
      ${none ? chip('', noneLabel) : ''}
    </div>`;
}
function openActivityPicker() {
const all = everything();
const events = upcomingEvents(shownDocs(state.polls));
if (events.length === 1) {
openActivityDialog(events[0]);
return;
}
const dialog = makeDialog();
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('activity.forWhich'))}</h2>
      ${
events.length
? `<div class="game-list">${events.map((one) => `
              <button type="button" class="game-card" data-activity-for="${escapeHtml(one.id)}">
                <span class="game-card__title">${escapeHtml(documentTitle(one))}</span>
                <span class="game-card__meta">${escapeHtml([whenText(one, { long: true }), t('count.activities', { count: programmeOf(one, all).length })].join(' · '))}</span>
              </button>`).join('')}</div>`
: `<p class="muted small">${escapeHtml(t('activity.noEvent'))}</p>
             <div class="row"><button type="button" class="button button--primary" data-activity-new-event>+ ${escapeHtml(t('events.new'))}</button></div>`
}
      <div class="row"><button type="button" class="button button--ghost" data-activity-pick-close>${escapeHtml(t('action.cancel'))}</button></div>
    </div>`;
dialog.querySelector('[data-activity-pick-close]').addEventListener('click', () => dialog.close());
dialog.querySelector('[data-activity-new-event]')?.addEventListener('click', () => {
dialog.close();
navigate('#/agenda/new');
});
dialog.querySelectorAll('[data-activity-for]').forEach((node) => {
node.addEventListener('click', () => {
const event = byId(node.dataset.activityFor);
dialog.close();
if (event) openActivityDialog(event);
});
});
dialog.showModal();
}
function openActivityDialog(event, { name = '', date = null, at = null, from = null, names = null } = {}) {
let day = date || '';
const dialog = makeDialog();
const draw = () => {
const typed = dialog.querySelector('#activity-name')?.value ?? name;
const hour = dialog.querySelector('#activity-at')?.value ?? (at || '');
dialog.innerHTML = `
      <form class="stack" method="dialog">
        <h2>${escapeHtml(t('activity.newTitle', { name: documentTitle(event) }))}</h2>
        <label class="stack stack--tight">
          <span class="small">${escapeHtml(t('activity.name'))}</span>
          <input type="text" id="activity-name" maxlength="80" autocomplete="off" placeholder="${escapeHtml(t('activity.namePlaceholder'))}" />
        </label>
        <span class="small">${escapeHtml(t('activity.day'))}</span>
        ${dayChipsHtml(event, day)}
        <label class="stack stack--tight">
          <span class="small">${escapeHtml(t('activity.at'))}</span>
          <input type="time" id="activity-at" ${day ? '' : 'disabled'} />
        </label>
        <p class="muted small">${escapeHtml(t('activity.newHint'))}</p>
        <div class="row">
          <button type="submit" class="button button--primary" id="activity-ok">${escapeHtml(t('activity.create'))}</button>
          <button type="button" class="button" data-activity-cancel>${escapeHtml(t('action.cancel'))}</button>
        </div>
      </form>`;
dialog.querySelector('#activity-name').value = typed;
dialog.querySelector('#activity-at').value = day ? hour : '';
dialog.querySelector('[data-activity-cancel]').addEventListener('click', () => dialog.close());
dialog.querySelectorAll('[data-activity-day]').forEach((node) => {
node.addEventListener('click', () => {
day = node.dataset.activityDay;
draw();
});
});
dialog.querySelector('form').addEventListener('submit', (submitted) => {
submitted.preventDefault();
const what = dialog.querySelector('#activity-name').value.trim();
if (!what) {
dialog.querySelector('#activity-name').focus();
return;
}
const at = dialog.querySelector('#activity-at').value || null;
const made = organise(signedEvent(activityFor(event, { name: what, date: day || null, at: day ? at : null, from, names })));
dialog.close();
state.polls = [...state.polls, made];
persistPoll(made);
flash(t('activity.made', { name: what, event: documentTitle(event) }));
render();
});
};
draw();
dialog.showModal();
dialog.querySelector('#activity-name').focus();
}
function activityHeadHtml(activity) {
const all = everything();
if (!isActivity(activity, all)) return '';
const event = all.find((one) => one.id === parentId(activity));
const asking = all.find((one) => one.whenFor === activity.id && !one.closedAt && !one.archivedAt);
return `
    <section class="card stack stack--tight activity-head" data-flows-for="${escapeHtml(activity.id)}">
      <p class="small">${escapeHtml(t('activity.of', { name: documentTitle(event), when: whenText(event, { long: true }) }))}</p>
      ${outsideEvent(activity, event) ? `<p class="small late">${escapeHtml(t('activity.outside'))}</p>` : ''}
      ${
isOrganiser(activity) && splitPollActivity(activity, all)
? `<p class="small">${escapeHtml(t('activity.splitHint'))}</p>
             <div class="row"><button type="button" class="button button--small" data-flow-split>${escapeHtml(t('activity.split', { name: documentTitle(splitPollActivity(activity, all).activity) }))}</button></div>`
: ''
}
      ${
activity.date
? ''
: `<span class="small">${escapeHtml(t('activity.pickDay'))}</span>
             ${dayChipsHtml(event, '', { none: false, attr: 'data-activity-set-day' })}
             <div class="row">
               ${
asking
? `<button type="button" class="button button--small" data-goto="${escapeHtml(documentHref(asking))}">🗳️ ${escapeHtml(t('activity.seeWhen'))}</button>`
: `<button type="button" class="button button--small" data-flow-when="${escapeHtml(activity.id)}">🗳️ ${escapeHtml(t('activity.askWhen'))}</button>`
}
             </div>`
}
    </section>`;
}
function boardActivitiesHtml(board) {
const { event, ideas } = ideaActivities(board, everything());
if (!event || !ideas.length) return '';
return `<button type="button" class="button button--small" data-flow-idea-activities="${escapeHtml(board.id)}">🎯 ${escapeHtml(t('activity.fromIdeas'))}</button>`;
}
function openIdeaActivitiesDialog(board) {
const dialog = makeDialog();
const draw = () => {
const { event, ideas } = ideaActivities(byId(board.id) || board, everything());
if (!event) {
dialog.close();
return;
}
dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(t('activity.fromIdeasTitle', { name: documentTitle(event) }))}</h2>
        <p class="muted small">${escapeHtml(t('activity.fromIdeasHint'))}</p>
        <div class="row row--chips">${ideas.map((one) => (one.made
? `<span class="chip chip--on">✓ ${escapeHtml(one.text)}</span>`
: `<button type="button" class="chip" data-idea-activity="${escapeHtml(one.card.id)}">+ ${escapeHtml(one.text)}</button>`)).join('')}
        </div>
        <div class="row"><button type="button" class="button button--ghost" data-idea-activities-close>${escapeHtml(t('action.close'))}</button></div>
      </div>`;
dialog.querySelector('[data-idea-activities-close]').addEventListener('click', () => dialog.close());
dialog.querySelectorAll('[data-idea-activity]').forEach((node) => {
node.addEventListener('click', () => {
const one = ideas.find((idea) => idea.card.id === node.dataset.ideaActivity);
if (!one) return;
const made = organise(signedEvent(activityFor(event, { name: one.text, from: { doc: board.id, part: one.card.id } })));
state.polls = [...state.polls, made];
persistPoll(made);
flash(t('activity.made', { name: one.text, event: documentTitle(event) }));
render();
draw();
});
});
};
draw();
dialog.showModal();
}
function pollActivitiesHtml(poll) {
const { event, choices } = choiceActivities(poll, everything());
const open = choices.filter((one) => !one.made);
if (!event || !open.length) return '';
return `
    <section class="card stack stack--tight flows" data-flows-for="${escapeHtml(poll.id)}">
      ${offersHtml(t('activity.organise', { name: documentTitle(event) }),
open.map((one) => offerButton('data-flow-choice-activity', one.option.id, choiceLabel(one.option))))}
    </section>`;
}
function bindFlows(root) {
const pair = (value) => String(value || '').split('|');
const current = (id) => byId(id);
const owner = (node) => current(node.closest('[data-flows-for]')?.dataset.flowsFor);
root.querySelectorAll('[data-flow-idea]').forEach((node) => {
node.addEventListener('click', () => {
const [boardId, cardId] = pair(node.dataset.flowIdea);
const list = owner(node);
addFrom(list, boardId, (target, board) => addIdea(target, board, board.cards.find((card) => card.id === cardId)));
});
});
root.querySelectorAll('[data-flow-winner]').forEach((node) => {
node.addEventListener('click', () => {
const [pollId, optionId] = pair(node.dataset.flowWinner);
const list = owner(node);
addFrom(list, pollId, (target, poll) => addWinner(target, poll, poll.options.find((option) => option.id === optionId), getLanguage()));
});
});
root.querySelectorAll('[data-flow-winner-to]').forEach((node) => {
node.addEventListener('click', () => {
const [listId, optionId] = pair(node.dataset.flowWinnerTo);
const poll = owner(node);
if (!poll) return;
addFrom(current(listId), poll.id, (target, source) => addWinner(target, source, source.options.find((option) => option.id === optionId), getLanguage()));
});
});
root.querySelectorAll('[data-flow-ticket]').forEach((node) => {
node.addEventListener('click', () => {
const [spendId, listId, whoId] = pair(node.dataset.flowTicket);
const spend = current(spendId);
const list = current(listId);
const group = list && spend && ticketGroups(list, spend, everything()).find((one) => one.whoId === whoId);
if (group) openTicketDialog(spend, list, group.items);
});
});
root.querySelectorAll('[data-flow-vote]').forEach((node) => {
node.addEventListener('click', () => {
const board = current(node.dataset.flowVote);
if (board) void voteOnIdeas(board);
});
});
root.querySelectorAll('[data-flow-people]').forEach((node) => {
node.addEventListener('click', () => {
const event = current(node.dataset.flowPeople);
if (!event) return;
const missing = missingGoers(event, everything());
flash(t('flows.peopleDone', { count: missing.length }));
for (const one of missing) replaceAny(addGoers(one.document, one.names));
});
});
root.querySelectorAll('[data-flow-activity]').forEach((node) => {
node.addEventListener('click', () => {
const event = current(node.dataset.flowActivity);
if (event) openActivityDialog(event);
});
});
root.querySelectorAll('[data-activity-set-day]').forEach((node) => {
node.addEventListener('click', () => {
const activity = owner(node);
if (!activity) return;
flash(t('activity.dayKept', { day: formatDayLong(node.dataset.activitySetDay) }));
replacePoll(setPollDate(activity, node.dataset.activitySetDay, activity.at || null, null));
});
});
root.querySelectorAll('[data-flow-split]').forEach((node) => {
node.addEventListener('click', () => {
const poll = owner(node);
const split = poll && splitPollActivity(poll, everything());
if (!split) return;
const made = organise(signedEvent(split.activity));
state.polls = [...state.polls, made];
persistPoll(made);
replacePoll(split.poll, { redraw: false });
flash(t('activity.made', { name: documentTitle(made), event: chainLabelShort(byId(made.parent) || made) }));
navigate(documentHref(made));
});
});
root.querySelectorAll('[data-flow-when]').forEach((node) => {
node.addEventListener('click', () => {
const activity = current(node.dataset.flowWhen);
const event = activity && current(parentId(activity));
if (!activity || !event) return;
const poll = signed(organise(whenPoll(activity, event, {
question: t('activity.whenQuestion', { name: documentTitle(activity) }),
})));
state.polls = [...state.polls, poll];
persistPoll(poll);
flash(t('activity.whenMade'));
navigate(`#/poll/${poll.id}`);
});
});
root.querySelectorAll('[data-flow-idea-activities]').forEach((node) => {
node.addEventListener('click', () => {
const board = current(node.dataset.flowIdeaActivities);
if (board) openIdeaActivitiesDialog(board);
});
});
root.querySelectorAll('[data-flow-choice-activity]').forEach((node) => {
node.addEventListener('click', () => {
const poll = owner(node);
const { event, choices } = poll ? choiceActivities(poll, everything()) : { event: null, choices: [] };
const one = choices.find((choice) => choice.option.id === node.dataset.flowChoiceActivity);
if (!event || !one) return;
const keen = activityFromChoice(event, poll, one.option);
openActivityDialog(event, { name: keen.title || '', date: keen.date, at: keen.at, from: keen.from, names: keen.people.map((person) => person.name) });
});
});
bindLongPress(root);
}
function addFrom(list, sourceId, make) {
const source = byId(sourceId);
if (!list || !source) return;
const next = make(list, source);
if (!next || next === list) return;
flash(t('flows.added', { name: next.items[next.items.length - 1].text, list: documentTitle(list) }));
replaceAny(next);
}
const PRESS_MS = 500;
const PRESS_SLOP = 10;
function pressedDocument(node) {
if (node.dataset.press) return byId(node.dataset.press);
const match = /^#\/(list|poll|spend|game|idea)\/([^/]+)$/.exec(node.dataset.goto || '');
return match ? byId(match[2]) : null;
}
function bindLongPress(root) {
root.querySelectorAll('[data-goto], [data-press]').forEach((node) => {
if (!pressedDocument(node) || node.dataset.pressBound) return;
node.dataset.pressBound = '1';
node.classList.add('pressable');
if (node.matches('.game-card, .chain-map__node, .programme__item')) {
const more = document.createElement('span');
more.className = 'press-more';
more.setAttribute('aria-hidden', 'true');
more.title = t('menu.more');
more.textContent = '⋯';
more.addEventListener('click', (event) => {
event.preventDefault();
event.stopPropagation();
const document_ = pressedDocument(node);
if (document_) openDocumentMenu(document_);
});
node.append(more);
}
let timer = null;
let start = null;
let fired = false;
const cancel = () => {
clearTimeout(timer);
timer = null;
node.classList.remove('pressable--held');
};
node.addEventListener('pointerdown', (event) => {
if (event.button !== undefined && event.button !== 0) return;
fired = false;
start = { x: event.clientX, y: event.clientY };
node.classList.add('pressable--held');
timer = setTimeout(() => {
timer = null;
fired = true;
node.classList.remove('pressable--held');
const document_ = pressedDocument(node);
if (!document_) return;
navigator.vibrate?.(12);
openDocumentMenu(document_, { underFinger: true });
}, PRESS_MS);
});
node.addEventListener('pointermove', (event) => {
if (timer && start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > PRESS_SLOP) cancel();
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => node.addEventListener(type, cancel));
node.addEventListener('click', (event) => {
if (!fired) return;
fired = false;
event.preventDefault();
event.stopImmediatePropagation();
}, true);
node.addEventListener('contextmenu', (event) => {
event.preventDefault();
cancel();
if (fired) return;
const document_ = pressedDocument(node);
if (document_) openDocumentMenu(document_);
});
});
}
const ARCHIVERS = { list: archiveList, poll: archivePoll, spend: archiveSpend, board: archiveBoard, game: archiveGame };
function openDocumentMenu(document_, { underFinger = false } = {}) {
const kind = kindOf(document_) || 'game';
const mine = kind !== 'poll' || isOrganiser(document_);
const dialog = makeDialog('dialog dialog--ask doc-menu-dialog');
if (underFinger) {
let pressed = false;
dialog.addEventListener('pointerdown', () => { pressed = true; }, true);
dialog.addEventListener('click', (event) => {
if (pressed || event.detail === 0) return;
event.preventDefault();
event.stopImmediatePropagation();
}, true);
}
const button = (attr, label, extra = '') => `<button type="button" class="button ${extra}" ${attr}>${escapeHtml(label)}</button>`;
dialog.innerHTML = `
    <div class="stack">
      <div>
        <h2>${escapeHtml(chainLabel(document_))}</h2>
        <p class="muted small">${escapeHtml([t(isEventDoc(document_) ? 'chain.kind.event' : `chain.kind.${kind}`), ...chainOf(document_).map(chainLabel)].join(' · '))}</p>
      </div>
      <div class="stack stack--tight doc-menu">
        ${location.hash === documentHref(document_) ? '' : button('data-menu-open', t('menu.open'), 'button--primary')}
        ${
mine
? `${attachTargets(document_, everything()).length || parentId(document_) ? button('data-menu-attach', t(isEventDoc(document_) ? 'activity.attach' : 'chain.attach')) : ''}
               ${button('data-menu-relate', t('relate.button'))}
               ${button('data-menu-archive', t(document_.archivedAt ? 'archive.back' : 'archive.put'))}
               ${button('data-menu-delete', t('action.delete'), 'button--danger')}`
: `<p class="muted small">${escapeHtml(t('menu.notOrganiser'))}</p>`
}
        ${button('data-menu-cancel', t('action.cancel'), 'button--ghost')}
      </div>
    </div>`;
const on = (attr, run) => dialog.querySelector(`[${attr}]`)?.addEventListener('click', () => {
dialog.close();
run();
});
on('data-menu-open', () => navigate(documentHref(document_)));
on('data-menu-attach', () => openAttachDialog(byId(document_.id) || document_));
on('data-menu-relate', () => openRelateDialog(byId(document_.id) || document_));
on('data-menu-archive', () => {
const fresh = byId(document_.id) || document_;
flash(t(fresh.archivedAt ? 'menu.unarchived' : 'menu.archived', { name: documentTitle(fresh) }));
replaceAny(ARCHIVERS[kind](fresh, !fresh.archivedAt));
if (kind === 'game') render(); 
});
on('data-menu-delete', () => void deleteDocument(document_.id));
on('data-menu-cancel', () => {});
dialog.showModal();
}

// ---- src/view-news.js ------------------------------------------------
const NEWS_SHOWN = 5;
let newsVisit = null;
function visitSince(key) {
const now = Date.now();
if (newsVisit?.key !== key) {
const last = state.prefs.seen?.[key];
newsVisit = { key, since: typeof last === 'number' ? last : now - NEWS_FIRST_LOOK, first: typeof last !== 'number' };
}
if (now - (state.prefs.seen?.[key] || 0) > 5000) {
state.prefs.seen = seenWith(state.prefs.seen, key, now);
savePrefs({ seen: state.prefs.seen });
}
return newsVisit;
}
function endNewsVisit(route) {
if (!newsVisit) return;
const [scope, id] = newsVisit.key.split(':');
const still = (scope === 'group' && route.name === 'group' && route.id === id)
|| (scope === 'event' && route.name === 'poll' && route.id === id);
if (!still) newsVisit = null;
}
function agoText(at) {
const minutes = Math.round((Date.now() - at) / 60000);
try {
const format = new Intl.RelativeTimeFormat(getLanguage(), { numeric: 'auto' });
if (minutes < 60) return format.format(-Math.max(1, minutes), 'minute');
if (minutes < 24 * 60) return format.format(-Math.round(minutes / 60), 'hour');
return format.format(-Math.round(minutes / (24 * 60)), 'day');
} catch {
return '';
}
}
function factText(fact, document_) {
switch (fact.type) {
case 'new': return t('news.new');
case 'added': return t('news.added', { count: fact.count });
case 'ticked': {
const what = fact.texts.join(', ') + (fact.count > fact.texts.length ? '…' : '');
return t('news.ticked', { count: fact.count, what });
}
case 'answered': return t('news.answered', { count: fact.names.length, names: fact.names.join(', ') });
case 'choices': return t('news.choices', { count: fact.count });
case 'dated': return t('news.dated', { day: [formatNewsDay(fact.date), fact.at].filter(Boolean).join(' · ') });
case 'closed': return t('news.closed');
case 'spent': {
const amount = money(fact.cents, document_);
return fact.names.length
? t('news.spentBy', { count: fact.count, amount, names: fact.names.join(', ') })
: t('news.spent', { count: fact.count, amount });
}
case 'repaid': return t('news.repaid', { count: fact.count });
case 'cards': return t('news.cards', { count: fact.count });
case 'rounds': return t('news.rounds', { count: fact.count });
case 'words': {
const text = fact.text.length > 60 ? `${fact.text.slice(0, 59)}…` : fact.text;
return fact.count > 1
? t('news.wordsMore', { name: fact.name, text, count: fact.count - 1 })
: t('news.words', { name: fact.name, text });
}
case 'reacts': return t('news.reacts', { count: fact.count });
default: return '';
}
}
function formatNewsDay(day) {
const [year, month, date] = String(day).split('-').map(Number);
try {
return new Date(year, month - 1, date).toLocaleDateString(getLanguage(), { weekday: 'long', day: 'numeric', month: 'short' });
} catch {
return day;
}
}
function newsRowHtml(entry) {
const meta = entry.facts.map((fact) => factText(fact, entry.doc)).filter(Boolean).join(' · ');
return `
    <button type="button" class="game-card" data-goto="${escapeHtml(documentHref(entry.doc))}">
      <span class="game-card__title">${escapeHtml(documentTitle(entry.doc))}</span>
      <span class="game-card__meta">${escapeHtml(kindLabel(entry.doc))} · ${escapeHtml(agoText(entry.at))}</span>
      <span class="game-card__meta">${escapeHtml(meta)}</span>
    </button>`;
}
function newsSectionHtml(key, documents, here = null) {
const visit = visitSince(key);
const entries = newsOf(documents, visit.since, { me: myNameFor, here });
const since = visit.first ? t('news.sinceWeek') : t('news.since', { when: agoText(visit.since) });
const rows = entries.slice(0, NEWS_SHOWN).map(newsRowHtml).join('');
const rest = entries.slice(NEWS_SHOWN);
return `
    <section class="section stack stack--tight" id="news">
      <div class="section__head"><h2>${escapeHtml(t('news.title'))}</h2></div>
      <p class="muted small">${escapeHtml(since)}</p>
      ${
entries.length
? `<div class="game-list">${rows}</div>
             ${
rest.length
? `<details class="news-more">
                      <summary class="muted small">${escapeHtml(t('news.more', { count: rest.length }))}</summary>
                      <div class="game-list">${rest.map(newsRowHtml).join('')}</div>
                    </details>`
: ''
}`
: `<p class="muted small">${escapeHtml(t('news.nothing'))}</p>`
}
    </section>`;
}
function groupNewsHtml(group) {
return newsSectionHtml(newsKey('group', group.id), everything().filter((one) => inGroup(one, group.id)));
}
function eventNewsHtml(poll) {
return newsSectionHtml(newsKey('event', poll.id), [poll, ...descendantsOf(poll, everything())], poll.id);
}
function groupNewsCount(group) {
const last = state.prefs.seen?.[newsKey('group', group.id)];
if (typeof last !== 'number') return 0;
return newsOf(everything().filter((one) => inGroup(one, group.id)), last, { me: myNameFor }).length;
}

// ---- src/view-account.js ---------------------------------------------
let awaiting = '';
let lastSync = 0;
let syncing = null;
const RESYNC_MS = 10 * 60 * 1000;
function account() {
return loadAccount();
}
async function accountToken() {
const session = account();
if (!session || !state.remote) return null;
if (session.expires - Date.now() > 60 * 1000) return session.access;
try {
const fresh = await state.remote.refreshSession(session.refresh);
if (!fresh) throw new Error('no session');
saveAccount({ ...fresh, email: fresh.email || session.email, sent: session.sent });
return fresh.access;
} catch (error) {
if (error?.status >= 400 && error?.status < 500) saveAccount(null);
return null;
}
}
function syncAccount({ restore = true, force = false } = {}) {
if (!account() || !state.remote) return Promise.resolve(false);
if (!force && Date.now() - lastSync < RESYNC_MS) return Promise.resolve(false);
if (syncing) return syncing;
syncing = (async () => {
let learnt = false;
try {
const token = await accountToken();
if (!token) return false;
if (restore) {
const answer = await state.remote.accountRestore(token, groups().map((group) => group.id), deviceLabel());
for (const group of answer?.groups || []) {
if (!group?.id || !group?.key) continue;
rememberGroup({ id: group.id, name: group.name, key: group.key, admits: Boolean(group.admits) });
learnt = true;
}
const secrets = answer?.owners && typeof answer.owners === 'object' ? answer.owners : {};
const held = state.prefs.organiser || {};
const missing = Object.entries(secrets).filter(([id, secret]) => typeof secret === 'string' && !held[id]);
if (missing.length) {
state.prefs = { ...state.prefs, organiser: { ...held, ...Object.fromEntries(missing) } };
savePrefs(state.prefs);
learnt = true;
}
if (!myName() && answer?.name) setMyName(answer.name);
}
const sent = account()?.sent || { keys: [], owners: [] };
const keys = new Set(sent.keys);
const owners = new Set(sent.owners);
const name = myName();
for (const group of groups()) {
const mark = `${group.id}|${group.key.slice(0, 8)}|${name}`;
if (keys.has(mark)) continue;
const answer = await state.remote.accountLink(token, group.key, name).catch(() => null);
if (answer?.status === 'ok') {
keys.add(mark);
if (!group.linked) {
state.prefs = { ...state.prefs, groups: groups().map((one) => (one.id === group.id ? { ...one, linked: true } : one)) };
savePrefs(state.prefs);
state.syncedAt = 0;
learnt = true;
}
}
}
for (const [id, secret] of Object.entries(state.prefs.organiser || {})) {
if (owners.has(id)) continue;
const answer = await state.remote.accountOwner(token, id, secret).catch(() => null);
if (answer?.status === 'ok') owners.add(id);
}
const now = account();
if (now) saveAccount({ ...now, sent: { keys: [...keys], owners: [...owners] } });
lastSync = Date.now();
} catch {
return false;
} finally {
syncing = null;
}
if (learnt) {
await catchUpQuietly();
render();
}
return learnt;
})();
return syncing;
}
async function leaveWithAccount(group) {
const token = await accountToken();
if (!token || !group?.key) return;
await state.remote.accountLeave(token, group.key).catch(() => null);
}
function accountHtml() {
if (!state.remote) return '';
const session = account();
if (session) {
return `
      <section class="section" id="account">
        <div class="section__head"><h2>${escapeHtml(t('account.title'))}</h2></div>
        <p class="small">${escapeHtml(t('account.signedIn', { email: session.email }))}</p>
        <p class="muted small">${escapeHtml(t('account.keeps'))}</p>
        <div class="row">
          <button type="button" class="button button--small" id="account-sync">${escapeHtml(t('account.sync'))}</button>
          <button type="button" class="button button--small button--ghost" id="account-out">${escapeHtml(t('account.signOut'))}</button>
          <button type="button" class="button button--small button--ghost" id="account-out-all">${escapeHtml(t('account.signOutAll'))}</button>
          <button type="button" class="button button--small button--ghost button--danger" id="account-delete">${escapeHtml(t('account.delete'))}</button>
        </div>
        <div class="row"><button type="button" class="button button--small button--ghost" data-goto="#/confidentialite">${escapeHtml(t('privacy.title'))}</button></div>
      </section>`;
}
return `
    <section class="section" id="account">
      <div class="section__head"><h2>${escapeHtml(t('account.title'))}</h2></div>
      <p class="muted small">${escapeHtml(t('account.why'))}</p>
      ${signInFormHtml()}
    </section>`;
}
function signInFormHtml() {
return awaiting
? `<form id="account-code-form" class="card stack stack--tight">
         <label class="stack stack--tight">
           <span class="small">${escapeHtml(t('account.codeSent', { email: awaiting }))}</span>
           <input type="text" id="account-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10"
                  placeholder="${escapeHtml(t('account.codePlaceholder'))}" />
         </label>
         <div class="row">
           <button type="submit" class="button button--primary">${escapeHtml(t('account.signIn'))}</button>
           <button type="button" class="button button--ghost" id="account-other">${escapeHtml(t('account.otherEmail'))}</button>
         </div>
       </form>`
: `<form id="account-email-form" class="card stack stack--tight">
         <label class="stack stack--tight">
           <span class="small">${escapeHtml(t('account.email'))}</span>
           <input type="email" id="account-email" autocomplete="email" inputmode="email"
                  placeholder="${escapeHtml(t('account.emailPlaceholder'))}" />
         </label>
         <div class="row"><button type="submit" class="button button--primary">${escapeHtml(t('account.sendCode'))}</button></div>
         <p class="muted small">${escapeHtml(t('account.privacy'))}</p>
         <div class="row"><button type="button" class="button button--small button--ghost" data-goto="#/confidentialite">${escapeHtml(t('privacy.title'))}</button></div>
       </form>`;
}
function offerAccount(group) {
if (!state.remote || account() || state.prefs.accountOfferDone) return false;
state.prefs = { ...state.prefs, accountOffer: { name: String(group?.name || ''), at: Date.now() } };
savePrefs(state.prefs);
return true;
}
const OFFER_MS = 7 * 24 * 60 * 60 * 1000;
function offered() {
const offer = state.prefs.accountOffer;
if (!offer || !state.remote || account() || state.prefs.accountOfferDone) return null;
return Date.now() - (offer.at || 0) < OFFER_MS ? offer : null;
}
function forgetOffer() {
const { accountOffer, ...rest } = state.prefs;
state.prefs = { ...rest, accountOfferDone: Date.now() };
savePrefs(state.prefs);
}
function accountOfferHtml() {
const offer = offered();
if (!offer) return '';
return `
    <section class="section account-offer" id="account">
      <div class="section__head">
        <h2>${escapeHtml(offer.name ? t('account.offerTitle', { name: offer.name }) : t('account.offerTitleBare'))}</h2>
      </div>
      <p class="small">${escapeHtml(t('account.offerWhy'))}</p>
      ${signInFormHtml()}
      <p class="muted small">${escapeHtml(t('account.offerWithout'))}</p>
      <div class="row"><button type="button" class="button button--small button--ghost" data-account-later>${escapeHtml(t('install.later'))}</button></div>
    </section>`;
}
function bindAccount() {
view.querySelector('#account-email-form')?.addEventListener('submit', async (event) => {
event.preventDefault();
const field = view.querySelector('#account-email');
const email = field.value.trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
field.focus();
return;
}
const button = event.currentTarget.querySelector('button[type=submit]');
button.disabled = true;
try {
await state.remote.sendCode(email);
awaiting = email;
} catch (error) {
flash(t(error?.status === 429 ? 'account.tooMany' : 'account.sendFailed'), 'error');
}
render();
});
view.querySelector('#account-code-form')?.addEventListener('submit', async (event) => {
event.preventDefault();
const code = view.querySelector('#account-code').value.replace(/\s+/g, '');
if (!code) return;
const button = event.currentTarget.querySelector('button[type=submit]');
button.disabled = true;
let session = null;
try {
session = await state.remote.verifyCode(awaiting, code);
} catch {
session = null;
}
if (!session) {
flash(t('account.badCode'), 'error');
render();
return;
}
saveAccount({ ...session, email: session.email || awaiting });
awaiting = '';
forgetOffer();
flash(t('account.welcome'));
render();
await syncAccount({ force: true });
render();
});
view.querySelector('[data-account-later]')?.addEventListener('click', () => {
awaiting = '';
forgetOffer();
render();
});
view.querySelector('#account-other')?.addEventListener('click', () => {
awaiting = '';
render();
});
view.querySelector('#account-sync')?.addEventListener('click', async (event) => {
event.currentTarget.disabled = true;
const learnt = await syncAccount({ force: true });
flash(t(learnt ? 'account.synced' : 'account.upToDate'));
render();
});
view.querySelector('#account-delete')?.addEventListener('click', async () => {
if (!(await ask(t('account.deleteConfirm'), { confirmLabel: t('account.delete'), danger: true }))) return;
const token = await accountToken();
let answer = null;
try {
if (!token) throw new Error('no token');
answer = await state.remote.accountDelete(token);
} catch {
flash(t('account.deleteFailed'), 'error');
render();
return;
}
saveAccount(null);
flash(t(answer?.status === 'partial' ? 'account.deletedPartly' : 'account.deleted'), answer?.status === 'partial' ? 'error' : 'info');
render();
});
const signOut = async (everywhere) => {
const session = account();
if (session?.access) await state.remote.signOut(session.access, everywhere).catch(() => null);
saveAccount(null);
flash(t(everywhere ? 'account.signedOutAll' : 'account.signedOut'));
render();
};
view.querySelector('#account-out')?.addEventListener('click', () => void signOut(false));
view.querySelector('#account-out-all')?.addEventListener('click', async () => {
if (!(await ask(t('account.signOutAllConfirm'), { confirmLabel: t('account.signOutAll') }))) return;
await signOut(true);
});
}
function groupsNeedingAccount() {
return groups().filter((group) => group.accounts && !group.linked);
}
function accountNeededHtml() {
const closed = groupsNeedingAccount();
if (!closed.length || !state.remote) return '';
return `
    <section class="banner banner--warn stack stack--tight account-needed">
      <p class="small">${escapeHtml(t('account.needed', { names: closed.map((group) => group.name).join(', '), count: closed.length }))}</p>
      <div class="row">
        <button type="button" class="button button--small button--primary" data-goto="#/settings">${escapeHtml(t(account() ? 'account.sync' : 'install.signIn'))}</button>
      </div>
    </section>`;
}
function privacyView() {
const block = (title, text) => `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t(title))}</h2></div>
      <p class="small">${escapeHtml(t(text))}</p>
    </section>`;
const contact = String(CONTACT || '').trim();
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/settings')}
      <h1>${escapeHtml(t('privacy.title'))}</h1>
    </div>
    <p class="lead">${escapeHtml(t('privacy.intro'))}</p>
    ${block('privacy.deviceTitle', 'privacy.device')}
    ${block('privacy.sharedTitle', 'privacy.shared')}
    ${block('privacy.accountTitle', 'privacy.account')}
    ${block('privacy.noneTitle', 'privacy.none')}
    ${block('privacy.keepTitle', 'privacy.keep')}
    ${block('privacy.whoTitle', 'privacy.processors')}
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('privacy.rightsTitle'))}</h2></div>
      <p class="small">${escapeHtml(t('privacy.rights'))}</p>
      <p class="small">${
contact
? `${escapeHtml(t('privacy.contact'))} <a href="mailto:${escapeHtml(contact)}">${escapeHtml(contact)}</a>`
: escapeHtml(t('privacy.noContact'))
}</p>
    </section>`;
}

// ---- src/view-install.js ---------------------------------------------
let installOffer = null;
const QUIET_MS = 30 * 24 * 60 * 60 * 1000;
function phoneToInstall() {
if (onHomeScreen() || inAppBrowser(navigator.userAgent)) return null;
return phoneKind(navigator.userAgent, navigator.maxTouchPoints || 0);
}
function startInstall() {
window.addEventListener('beforeinstallprompt', (event) => {
event.preventDefault();
installOffer = event;
if (view.querySelector('[data-install-slot]')) render();
});
window.addEventListener('appinstalled', () => {
installOffer = null;
});
void keepData();
}
async function keepData() {
try {
if (!navigator.storage?.persist || !(groups().length || account())) return false;
if (await navigator.storage.persisted()) return true;
return await navigator.storage.persist();
} catch {
return false;
}
}
function stepsHtml(kind) {
if (kind === 'android') {
return installOffer
? `<div class="row"><button type="button" class="button button--primary" data-install-now>${escapeHtml(t('install.button'))}</button></div>`
: `<ol class="steps small"><li>${escapeHtml(t('install.android1'))}</li><li>${escapeHtml(t('install.android2'))}</li></ol>`;
}
return `<ol class="steps small">
      <li>${escapeHtml(t('install.ios1'))}</li>
      <li>${escapeHtml(t('install.ios2'))}</li>
      <li>${escapeHtml(t('install.ios3'))}</li>
    </ol>`;
}
function installFirstHtml(invitation) {
const name = String(invitation.group || '').trim();
const code = String(invitation.code || '').trim();
return `
    <section class="card stack install-first" data-install-slot>
      <h2>${escapeHtml(t('install.firstTitle'))}</h2>
      <p class="small">${escapeHtml(t('install.firstWhy'))}</p>
      ${stepsHtml('ios')}
      <p class="small">${escapeHtml(t('install.thenJoin'))}</p>
      ${
name && code
? `<p class="small"><strong>${escapeHtml(t('join.toHomeScreenWhat'))}</strong>
               ${escapeHtml(name)} · <span class="code-shown">${escapeHtml(code)}</span></p>
             <div class="row"><button type="button" class="button button--small" id="join-copy-code">${escapeHtml(t('join.toHomeScreenCopy'))}</button></div>`
: ''
}
      <p class="muted small">${escapeHtml(t('install.account'))}</p>
    </section>
    <div class="row">
      <button type="button" class="button button--small button--ghost" data-join-here>${escapeHtml(t('install.joinHere'))}</button>
    </div>`;
}
function installOfferHtml() {
if (phoneToInstall() !== 'android' || !installOffer) return '<div data-install-slot></div>';
return `
    <div class="card stack stack--tight" data-install-slot>
      <p class="small">${escapeHtml(t('install.androidWhy'))}</p>
      ${stepsHtml('android')}
    </div>`;
}
function installReminderHtml() {
const kind = phoneToInstall();
if (!kind || !groups().length || account()) return '';
if (Date.now() - (state.prefs.installQuietAt || 0) < QUIET_MS) return '';
return `
    <section class="banner banner--warn stack stack--tight install-reminder" data-install-slot>
      <p class="small">${escapeHtml(t(kind === 'ios' ? 'install.reminderIos' : 'install.reminderAndroid'))}</p>
      <div class="row">
        <button type="button" class="button button--small" data-install-how="${kind}">${escapeHtml(t('install.how'))}</button>
        <button type="button" class="button button--small button--ghost" data-goto="#/settings">${escapeHtml(t('install.signIn'))}</button>
        <button type="button" class="button button--small button--ghost" data-install-later>${escapeHtml(t('install.later'))}</button>
      </div>
    </section>`;
}
function bindInstall(root = view) {
root.querySelectorAll('[data-install-now]').forEach((node) => {
node.addEventListener('click', async () => {
if (!installOffer) return;
const offer = installOffer;
installOffer = null;
offer.prompt();
await offer.userChoice.catch(() => null);
render();
});
});
root.querySelectorAll('[data-join-here]').forEach((node) => {
node.addEventListener('click', () => {
state.joinHere = true;
render();
});
});
root.querySelectorAll('[data-install-later]').forEach((node) => {
node.addEventListener('click', () => {
state.prefs = { ...state.prefs, installQuietAt: Date.now() };
savePrefs(state.prefs);
render();
});
});
root.querySelectorAll('[data-install-how]').forEach((node) => {
node.addEventListener('click', () => {
const dialog = makeDialog();
dialog.innerHTML = `
        <div class="stack" data-install-slot>
          <h2>${escapeHtml(t('install.howTitle'))}</h2>
          ${stepsHtml(node.dataset.installHow)}
          <p class="muted small">${escapeHtml(t(node.dataset.installHow === 'ios' ? 'install.howIosAfter' : 'install.howAndroidAfter'))}</p>
          <div class="row"><button type="button" class="button button--ghost" data-install-close>${escapeHtml(t('action.close'))}</button></div>
        </div>`;
dialog.querySelector('[data-install-close]').addEventListener('click', () => dialog.close());
bindInstall(dialog);
dialog.showModal();
});
});
}

// ---- src/view-look.js ------------------------------------------------
const LOOKS = ['holo', 'classic', 'calm', 'astro', 'seasons'];
const LOOK_ACCENTS = ['red', 'orange', 'amber', 'green', 'cyan', 'blue', 'violet', 'pink'];
const LOOK_DECORS = ['stars', 'aurora', 'season', 'confetti'];
const LOOK_OWN_ACCENT = { holo: 'cyan', classic: 'amber', calm: 'blue', astro: 'violet' };
const SEASON_ACCENT = { spring: 'pink', summer: 'amber', autumn: 'orange', winter: 'blue' };
const LOOK_OWN_DECOR = { astro: 'stars', seasons: 'season' };
function ownAccent(look) {
return look === 'seasons' ? SEASON_ACCENT[skySeason()] : LOOK_OWN_ACCENT[look];
}
function lookIsDark() {
return state.prefs.theme !== 'light';
}
function chosenLook() {
return LOOKS.includes(state.prefs.look) ? state.prefs.look : 'holo';
}
function chosenAccent() {
return LOOK_ACCENTS.includes(state.prefs.accent) ? state.prefs.accent : '';
}
function chosenDecor() {
return LOOK_DECORS.includes(state.prefs.decor) ? state.prefs.decor : '';
}
function shownDecor() {
return chosenDecor() || LOOK_OWN_DECOR[chosenLook()] || '';
}
function applyLook() {
const root = document.documentElement;
const theme = state.prefs.theme;
if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
else delete root.dataset.theme;
const look = chosenLook();
if (look === 'holo') delete root.dataset.look;
else root.dataset.look = look;
const accent = chosenAccent();
if (accent) root.dataset.accent = accent;
else delete root.dataset.accent;
root.dataset.season = skySeason();
const decor = shownDecor();
if (decor) root.dataset.decor = decor;
else delete root.dataset.decor;
if (decor === 'stars') {
const phase = skyMoonPhase();
root.style.setProperty('--moon', skyMoonMask(phase));
root.style.setProperty('--moon-line', skyMoonLine(phase));
} else {
root.style.removeProperty('--moon');
root.style.removeProperty('--moon-line');
}
const ground = getComputedStyle(root).getPropertyValue('--bg').trim();
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground || '#050b16');
}
function refreshSky() {
const turned = document.documentElement.dataset.season !== skySeason();
applyLook();
return turned;
}
const LANGUAGE_NAMES = { fr: 'Français', en: 'English' };
function languageHtml() {
const on = getLanguage();
return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('lang.title'))}</h2></div>
      <div class="row row--chips" role="group" aria-label="${escapeHtml(t('lang.title'))}">
        ${Object.entries(LANGUAGE_NAMES).map(([value, name]) => `
          <button type="button" class="chip ${on === value ? 'chip--on' : ''}" data-pick-lang="${value}" lang="${value}"
                  aria-pressed="${on === value ? 'true' : 'false'}">${escapeHtml(name)}</button>`).join('')}
      </div>
    </section>`;
}
function lookHtml() {
const look = chosenLook();
const accent = chosenAccent();
const decor = chosenDecor();
const shown = shownDecor();
const season = skySeason();
const dark = lookIsDark();
const chip = (kind, value, label, on) => `
    <button type="button" class="chip ${on ? 'chip--on' : ''}" data-pick-${kind}="${escapeHtml(value)}"
            aria-pressed="${on ? 'true' : 'false'}">${escapeHtml(label)}</button>`;
const own = ownAccent(look);
const tint = accent || own;
const name = (value) => (value === own && !accent ? t('look.accent.own', { name: t(`look.accent.${value}`) }) : t(`look.accent.${value}`));
const dot = (value) => `
    <button type="button" class="tint ${tint === value ? 'tint--on' : ''}" data-pick-accent="${value === own ? '' : escapeHtml(value)}"
            aria-pressed="${tint === value ? 'true' : 'false'}" aria-label="${escapeHtml(name(value))}" title="${escapeHtml(name(value))}">
      <span class="tint__dot" style="--tint: var(--accent-${value})" aria-hidden="true"></span>
    </button>`;
const about = [
shown === 'season' ? t('look.seasonNow', { season: t(`look.season.${season}`) }) : '',
shown === 'stars' ? t('look.moonNow') : '',
shown ? t('look.decorStill') : '',
].filter(Boolean).join(' ');
return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('look.title'))}</h2></div>
      <div class="stack stack--tight">
        <span class="muted small">${escapeHtml(t('look.style'))}</span>
        <div class="row row--chips" role="group" aria-label="${escapeHtml(t('look.style'))}">
          ${LOOKS.map((value) => chip('look', value, t(`look.${value}`), look === value)).join('')}
        </div>
        <span class="muted small">${escapeHtml(t('look.colour'))}</span>
        <div class="row row--chips tints" role="group" aria-label="${escapeHtml(t('look.colour'))}">
          ${LOOK_ACCENTS.map(dot).join('')}
        </div>
        <span class="muted small" id="look-colour-name">${escapeHtml(name(tint))}</span>
        <span class="muted small">${escapeHtml(t('look.decor'))}</span>
        <div class="row row--chips" role="group" aria-label="${escapeHtml(t('look.decor'))}">
          ${['', ...LOOK_DECORS].map((value) => chip('decor', value, t(`look.decor.${value || 'own'}`), decor === value)).join('')}
        </div>
        ${about ? `<span class="muted small" id="look-decor-about">${escapeHtml(about)}</span>` : ''}
        <span class="muted small">${escapeHtml(t('look.theme'))}</span>
        <div class="row row--chips" role="group" aria-label="${escapeHtml(t('look.theme'))}">
          ${chip('theme', 'dark', t('look.night'), dark)}
          ${chip('theme', 'light', t('look.light'), !dark)}
        </div>
        <p class="muted small">${escapeHtml(t('look.hint'))}</p>
      </div>
    </section>`;
}
function pickLook(change) {
state.prefs = { ...state.prefs, ...change };
savePrefs(state.prefs);
applyLook();
render();
}
function bindLook(view) {
view.querySelectorAll('[data-pick-look]').forEach((button) => {
button.addEventListener('click', () => {
const look = button.dataset.pickLook;
const kept = state.prefs.accent === ownAccent(look) ? undefined : state.prefs.accent;
pickLook({ look: look === 'holo' ? undefined : look, accent: kept });
});
});
view.querySelectorAll('[data-pick-accent]').forEach((button) => {
button.addEventListener('click', () => pickLook({ accent: button.dataset.pickAccent || undefined }));
});
view.querySelectorAll('[data-pick-decor]').forEach((button) => {
button.addEventListener('click', () => pickLook({ decor: button.dataset.pickDecor || undefined }));
});
view.querySelectorAll('[data-pick-theme]').forEach((button) => {
button.addEventListener('click', () => pickLook({ theme: button.dataset.pickTheme }));
});
view.querySelectorAll('[data-pick-lang]').forEach((button) => {
button.addEventListener('click', () => {
if (button.dataset.pickLang !== getLanguage()) switchLanguage(button.dataset.pickLang);
});
});
}

// ---- src/view-home.js ------------------------------------------------
function comingHtml() {
const today = dayNow();
const events = agendaFor({ lists: shownDocs(state.lists), polls: [] });
const ends = (event) => event.until || event.day;
const late = events.filter((event) => ends(event) < today);
const coming = events.filter((event) => ends(event) >= today);
if (!events.length) return hiddenByGroupHtml(state.lists.filter((list) => isLive(list) && list.items.some((item) => item.due)));
const shown = [...late.slice(-3), ...coming.slice(0, 8)];
const hidden = events.length - shown.length;
const row = (event) => {
const overdue = ends(event) < today;
const when = whenText({ date: event.day, until: event.until, at: event.at }, { long: true });
return `
      <button type="button" class="game-card" data-goto="#/${event.kind === 'poll' ? 'poll' : 'list'}/${escapeHtml(event.docId)}">
        <span class="game-card__title">
          ${escapeHtml(event.summary)}
          ${overdue ? `<span class="pill pill--late">${escapeHtml(t('agenda.late'))}</span>` : ''}
        </span>
        <span class="game-card__meta">${escapeHtml(when)}${event.description ? ` · ${escapeHtml(event.description)}` : ''}</span>
      </button>`;
};
return `
    <div class="game-list">${shown.map(row).join('')}</div>
    ${hidden > 0 ? `<p class="muted small">${escapeHtml(t('agenda.more', { count: hidden }))}</p>` : ''}`;
}
function eventsHtml() {
const coming = upcomingEvents(shownDocs(state.polls));
const deciding = shownDocs(state.polls).filter((poll) => isLive(poll) && !poll.date && !poll.closedAt && seeksDay(poll));
const shown = coming.slice(0, 3);
return `
    <section class="section">
      <div class="section__head">
        <h2>${escapeHtml(t('events.title'))}</h2>
        <button type="button" class="button button--small button--ghost" data-goto="#/agenda">${escapeHtml(t('events.seeAgenda'))}</button>
      </div>
      ${
shown.length
? `<div class="game-list">${shown.map(eventCardHtml).join('')}</div>`
: `<p class="muted small">${escapeHtml(t('events.noneHome'))}</p>`
}
      ${coming.length > shown.length ? `<p class="muted small">${escapeHtml(t('events.more', { count: coming.length - shown.length }))}</p>` : ''}
      ${hiddenByGroupHtml(upcomingEvents(state.polls))}
      ${
deciding.length
? `<button type="button" class="game-card" data-goto="#/agenda">
               <span class="game-card__title">${escapeHtml(t('polls.toDecide'))}</span>
               <span class="game-card__meta">${escapeHtml(t('events.deciding', { count: deciding.length }))}</span>
             </button>`
: ''
}
      <div class="row">
        <button type="button" class="button button--small button--new" data-goto="#/agenda/new">+ ${escapeHtml(t('events.new'))}</button>
      </div>
    </section>`;
}
function pendingHtml(shown = new Set()) {
const lines = [];
const recent = (a, b) => b.updatedAt - a.updatedAt;
const all = everything();
const today = dayNow();
const notShown = (goto) => (document_) => !shown.has(`${goto}${document_.id}`) && !isOver(document_, all, today);
const ongoing = shownDocs(state.games).filter((game) => isLive(game) && !gameStatus(game).finished)
.filter(notShown('#/game/')).sort(recent);
const open = shownDocs(state.lists).filter((list) => isLive(list) && progress(list).left > 0)
.filter(notShown('#/list/')).sort(recent);
const asked = shownDocs(state.polls).filter((poll) => isLive(poll) && !poll.closedAt)
.filter(notShown('#/poll/')).sort(recent);
const owing = shownDocs(state.spends).filter((spend) => isLive(spend) && balances(spend).some((row) => row.balance !== 0))
.filter(notShown('#/spend/')).sort(recent);
for (const list of open.slice(0, 3)) {
const { left } = progress(list);
lines.push({
goto: `#/list/${list.id}`,
title: listTitle(list),
meta: t('lists.leftToDo', { count: left }) + forEventText(list),
});
}
for (const poll of asked.slice(0, 3)) {
const { answered } = tally(poll);
lines.push({
goto: `#/poll/${poll.id}`,
title: pollTitle(poll),
meta: t('polls.answered', { count: answered, total: poll.people.length }) + forEventText(poll),
});
}
for (const spend of owing.slice(0, 3)) {
const mine = myBalance(spend);
lines.push({
goto: `#/spend/${spend.id}`,
title: spendTitle(spend),
meta: (mine && mine.balance !== 0
? t(mine.balance > 0 ? 'spends.owedToMe' : 'spends.iOwe', { amount: money(Math.abs(mine.balance), spend) })
: t('spends.total', { amount: money(spendTotal(spend), spend) })) + forEventText(spend),
});
}
for (const game of ongoing.slice(0, 3)) {
lines.push({
goto: `#/game/${game.id}`,
title: gameTitle(game),
meta: t('home.rounds', { count: game.rounds.length }) + forEventText(game),
});
}
if (!lines.length) {
return shown.size ? '' : `<p class="muted small">${escapeHtml(t('overview.nothing'))}</p>`;
}
return `<div class="game-list">${lines
.map(
(line) => `
        <button type="button" class="game-card" data-goto="${escapeHtml(line.goto)}">
          <span class="game-card__title">${escapeHtml(line.title)}</span>
          <span class="game-card__meta">${escapeHtml(line.meta)}</span>
        </button>`,
)
.join('')}</div>`;
}
function requestsHtml(group) {
const rows = gate().requests[group.id];
if (!rows) return `<p class="muted small">${escapeHtml(t('gate.loading'))}</p>`;
if (!rows.length) return `<p class="muted small">${escapeHtml(t('gate.nobody'))}</p>`;
return `<div class="stack stack--tight">${rows
.map(
(row) => `
        <div class="knock">
          <div>
            <strong>${escapeHtml(row.name || t('gate.someone'))}</strong>
            <span class="muted small">${escapeHtml(row.label || '')}</span>
          </div>
          <div class="row row--tight">
            <button type="button" class="button button--small button--primary"
                    data-admit="${escapeHtml(group.id)}" data-request="${escapeHtml(row.id)}">
              ${escapeHtml(t('gate.admit'))}
            </button>
            <button type="button" class="button button--small button--ghost"
                    data-refuse="${escapeHtml(group.id)}" data-request="${escapeHtml(row.id)}">
              ${escapeHtml(t('gate.refuse'))}
            </button>
          </div>
        </div>`,
)
.join('')}</div>`;
}
function devicesHtml(group) {
const rows = gate().devices[group.id];
if (!rows) return `<p class="muted small">${escapeHtml(t('gate.loading'))}</p>`;
const withAccount = rows.filter((row) => row.account).length;
const lastWithLink = (row) => row.link && row.person && rows.filter((other) => other.person === row.person).length === 1;
const accounts = `
    <div class="card stack stack--tight accounts-switch">
      <p class="small">${escapeHtml(t('gate.accountsCount', { count: withAccount, total: rows.length }))}</p>
      <p class="muted small">${escapeHtml(t(group.accounts ? 'gate.accountsOnHint' : 'gate.accountsOffHint'))}</p>
      <div class="row">
        <button type="button" class="button button--small ${group.accounts ? 'button--ghost' : ''}"
                data-accounts="${escapeHtml(group.id)}" data-on="${group.accounts ? 'no' : 'yes'}">
          ${escapeHtml(t(group.accounts ? 'gate.accountsOff' : 'gate.accountsOn'))}
        </button>
      </div>
    </div>`;
return `<div class="stack stack--tight">${accounts}${rows
.map(
(row) => `
        <div class="knock">
          <div>
            <strong>${escapeHtml(row.label || t('gate.unnamedDevice'))}</strong>
            <span class="muted small">${escapeHtml(
[
row.mine ? t('gate.thisDevice') : '',
row.admits ? t('gate.admitsToo') : '',
row.link ? t('back.hasLink') : '',
row.account ? t('gate.hasAccount') : t('gate.noAccount'),
]
.filter(Boolean)
.join(' · '),
)}</span>
          </div>
          <div class="row row--tight">
            ${
row.link
? `<button type="button" class="button button--small button--ghost"
                           data-cut-link="${escapeHtml(group.id)}" data-person="${escapeHtml(row.person)}">
                     ${escapeHtml(t('back.cutLink'))}
                   </button>`
: ''
}
            <button type="button" class="button button--small button--ghost"
                    data-admits="${escapeHtml(group.id)}" data-key="${escapeHtml(row.id)}"
                    data-allow="${row.admits ? 'no' : 'yes'}">
              ${escapeHtml(t(row.admits ? 'gate.dropAdmits' : 'gate.giveAdmits'))}
            </button>
            ${
row.mine
? ''
: `<button type="button" class="button button--small button--ghost"
                           data-cut="${escapeHtml(group.id)}" data-key="${escapeHtml(row.id)}"
                           ${lastWithLink(row) ? 'data-with-link' : ''}>
                     ${escapeHtml(t('gate.cut'))}
                   </button>`
}
          </div>
        </div>`,
)
.join('')}</div>`;
}
function myKnocksHtml() {
const held = pendings();
if (!held.length) return '';
return `
    <div class="stack stack--tight">${held
.map(
(knock, index) => `
          <div class="knock">
            <div>
              <strong>${escapeHtml(knock.groupName)}</strong>
              <span class="muted small">${escapeHtml(t('gate.askedAt', { date: formatDate(knock.at) }))}</span>
            </div>
            <div class="row row--tight">
              <button type="button" class="button button--small" data-check="${index}">
                ${escapeHtml(t('gate.check'))}
              </button>
              <button type="button" class="button button--small button--ghost" data-drop="${index}">
                ${escapeHtml(t('gate.dropMine'))}
              </button>
            </div>
          </div>`,
)
.join('')}</div>`;
}
function groupsHtml() {
const held = groups();
return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('groups.manage'))}</h2></div>
      <p class="muted small">${escapeHtml(t('groups.hint'))}</p>
      ${
held.length
? `<p class="muted small">${escapeHtml(t('groups.keepKey'))}</p>`
: ''
}
      ${
held.length && !onHomeScreen()
? `<p class="muted small">${escapeHtml(t('groups.beforeHomeScreen'))}</p>`
: ''
}
      ${
held.length
? `<div class="stack stack--tight">${held
.map(
(group) => `
                  <div class="group">
                    <div>
                      <strong>${escapeHtml(group.name)}</strong>
                      <span class="muted small">${escapeHtml(t('groups.shared', {
count: [...state.games, ...state.lists, ...state.polls, ...state.spends, ...state.boards]
.filter((document_) => document_.groupId === group.id).length,
}))}</span>
                    </div>
                    <div class="row">
                      <button type="button" class="button button--small" data-invite="${escapeHtml(group.id)}">
                        ${escapeHtml(t('groups.invite'))}
                      </button>
                      <button type="button" class="button button--small" data-catch-up="${escapeHtml(group.id)}">
                        ${escapeHtml(t('groups.catchUp'))}
                      </button>
                      <button type="button" class="button button--small button--ghost" data-show-key="${escapeHtml(group.id)}">
                        ${escapeHtml(t('groups.showKey'))}
                      </button>
                      ${
group.admits
? ''
: `<button type="button" class="button button--small button--ghost" data-my-link="${escapeHtml(group.id)}">
                               ${escapeHtml(t('back.myLink'))}
                             </button>`
}
                      <button type="button" class="button button--small button--ghost" data-calendar="${escapeHtml(group.id)}">
                        ${escapeHtml(t('agenda.group'))}
                      </button>
                      ${
group.admits
? `<button type="button" class="button button--small button--ghost" data-cut-calendar="${escapeHtml(group.id)}">
                               ${escapeHtml(t('agenda.cut'))}
                             </button>`
: ''
}
                      <button type="button" class="button button--small button--ghost" data-leave="${escapeHtml(group.id)}">
                        ${escapeHtml(t('groups.leave'))}
                      </button>
                    </div>
                    ${
group.admits === false
? ''
: `<div class="stack stack--tight">
                             <span class="muted small">${escapeHtml(t('gate.knocking'))}</span>
                             ${requestsHtml(group)}
                             <details class="details">
                               <summary>${escapeHtml(t('gate.who'))}</summary>
                               ${devicesHtml(group)}
                             </details>
                           </div>`
}
                  </div>`,
)
.join('')}</div>`
: `<p class="muted small">${escapeHtml(t('groups.none'))}</p>
             ${inAppWarningHtml()}
             ${
onHomeScreen()
? `<p class="muted small">${escapeHtml(t('groups.standaloneNew'))}</p>`
: ''
}`
}

      ${
pendings().length
? `<div class="stack stack--tight">
               <span class="muted small">${escapeHtml(t('gate.mine'))}</span>
               ${myKnocksHtml()}
             </div>`
: ''
}

      <label for="group-name">${escapeHtml(t('groups.add'))}</label>
      <div class="row row--tight">
        <input type="text" id="group-name" autocomplete="off"
               placeholder="${escapeHtml(t('groups.namePlaceholder'))}" />
        <input type="text" id="group-code" class="code-input" inputmode="numeric" autocomplete="one-time-code"
               placeholder="000000" aria-label="${escapeHtml(t('groups.codePlaceholder'))}" />
      </div>
      <button type="button" class="button button--primary button--block" id="group-join">${escapeHtml(t('gate.knock'))}</button>
      <p class="muted small" id="group-state">${escapeHtml(t('groups.codeHint'))}</p>

      <details class="details">
        <summary>${escapeHtml(t('groups.withKey'))}</summary>
        <p class="muted small">${escapeHtml(t('groups.keyHint'))}</p>
        <div class="row row--tight">
          <input type="password" id="group-key" autocomplete="off" spellcheck="false"
                 placeholder="${escapeHtml(t('groups.keyPlaceholder'))}" />
          <button type="button" class="button" id="group-paste">${escapeHtml(t('groups.join'))}</button>
        </div>
      </details>
    </section>`;
}
function meHtml() {
return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('me.title'))}</h2></div>
      <p class="muted small">${escapeHtml(t(state.remote ? 'me.hint' : 'me.hintAlone'))}</p>
      <div class="row row--tight">
        <input type="text" id="me-name" autocomplete="given-name" maxlength="${NAME_KEPT}"
               value="${escapeHtml(myName())}" placeholder="${escapeHtml(t('me.placeholder'))}"
               aria-label="${escapeHtml(t('me.title'))}" />
        <button type="button" class="button" id="me-save">${escapeHtml(t('action.save'))}</button>
      </div>
    </section>`;
}
function byGroupHtml() {
const held = groupsByName();
if (!held.length) return '';
return `
    <section class="section">
      <div class="section__head">
        <h2>${escapeHtml(t('groups.title'))}</h2>
        <span class="muted small">${escapeHtml(t('dash.groupCount', { count: held.length }))}</span>
      </div>
      ${held.map(groupBoardHtml).join('')}
    </section>`;
}
function groupBoardHtml(group) {
const counts = groupCounts(state, group.id);
const fresh = groupNewsCount(group);
const tile = (value, label, goto) => `
    <button type="button" class="tile" data-group-tile="${escapeHtml(group.id)}" data-tile-goto="${goto}"
            aria-label="${escapeHtml(`${group.name} — ${value} ${label}`)}">
      <span class="tile__value">${value}</span>
      <span class="tile__label">${escapeHtml(label)}</span>
    </button>`;
return `
    <div class="card stack stack--tight">
      <div class="spread">
        <button type="button" class="group-link" data-goto="#/group/${escapeHtml(encodeURIComponent(group.id))}">
          <strong>${escapeHtml(group.name)}</strong>
          <span class="muted small">${escapeHtml(t('group.open'))} ›</span>
        </button>
        ${
group.admits === false
? `<span class="muted small">${escapeHtml(t('dash.member'))}</span>`
: `<span class="pill">${escapeHtml(t('dash.gate'))}</span>`
}
      </div>
      <div class="tiles">
        ${tile(counts.lists, t('tab.lists'), '#/lists')}
        ${tile(counts.polls, t('tab.polls'), '#/polls')}
        ${tile(counts.games, t('tab.games'), '#/games')}
        ${tile(counts.spends, t('tab.spends'), '#/spends')}
        ${tile(counts.boards, t('tab.ideas'), '#/ideas')}
      </div>
      <p class="muted small">
        ${escapeHtml(t('dash.peopleCount', { count: counts.people }))}${
counts.at ? ` · ${escapeHtml(formatDate(counts.at))}` : ''
}${counts.late ? ` · <span class="late">${escapeHtml(t('lists.late', { count: counts.late }))}</span>` : ''}${
fresh ? ` · <span class="pill">${escapeHtml(t('news.badge', { count: fresh }))}</span>` : ''
}
      </p>
      ${rosterLineHtml(group)}
    </div>`;
}
function rosterLineHtml(group) {
const fixed = rosterOf(group.id);
if (!fixed.length && (group.admits === false || !state.remote)) return '';
const me = myNameIn(group.id);
const said = fixed.length ? t('roster.line', { names: fixed.join(' · ') }) : t('roster.lineOff');
const action = !fixed.length ? t('roster.fix') : !me ? t('roster.pickShort') : '';
return `
    <div class="row row--tight">
      <span class="muted small">${escapeHtml(said)}</span>
      ${
action
? `<button type="button" class="button button--small ${me || !fixed.length ? '' : 'button--primary'}"
                     data-goto="#/group/${escapeHtml(encodeURIComponent(group.id))}">${escapeHtml(action)}</button>`
: ''
}
    </div>`;
}
function groupPeopleHtml(group) {
const mine = (documents) => documents.filter((document_) => inGroup(document_, group.id));
const me = sameName(myNameIn(group.id));
const names = [...peopleIn({
lists: mine(state.lists), polls: mine(state.polls), games: mine(state.games), spends: mine(state.spends),
})].sort((a, b) => (me ? (sameName(a) === me ? 0 : 1) - (sameName(b) === me ? 0 : 1) : 0) || a.localeCompare(b));
if (!names.length) return '';
const row = (name) => {
const waiting = waitingLine(personFile(state, name));
return `
      <button type="button" class="game-card" data-goto="#/person/${escapeHtml(encodeURIComponent(name))}">
        <span class="game-card__title">${escapeHtml(me && sameName(name) === me ? t('dash.you', { name }) : name)}</span>
        <span class="game-card__meta">${escapeHtml(waiting || t('dash.nothing'))}</span>
      </button>`;
};
return `
    <details class="details">
      <summary>${escapeHtml(t('group.who'))}</summary>
      <div class="game-list">${names.map(row).join('')}</div>
    </details>`;
}
function namesWrittenIn(group) {
const mine = (documents) => documents.filter((document_) => inGroup(document_, group.id) && !document_.linkOnly);
return peopleIn({ lists: mine(state.lists), polls: mine(state.polls), spends: mine(state.spends) });
}
function groupRosterHtml(group) {
const roster = rosterOf(group.id);
const admits = group.admits !== false;
if (!roster.length) {
if (!admits || !state.remote) return '';
return `
      <section class="section card stack stack--tight" id="group-roster">
        <div class="section__head"><h2>${escapeHtml(t('roster.title'))}</h2></div>
        <p class="muted small">${escapeHtml(t('roster.offHint'))}</p>
        <div class="row">
          <button type="button" class="button button--small" data-roster-edit>${escapeHtml(t('roster.fix'))}</button>
        </div>
      </section>`;
}
const me = myNameIn(group.id);
const strays = offRoster(group.id, namesWrittenIn(group));
return `
    <section class="section card stack stack--tight" id="group-roster">
      <div class="section__head">
        <h2>${escapeHtml(t('roster.title'))}</h2>
        ${admits ? `<button type="button" class="button button--small button--ghost" data-roster-edit>${escapeHtml(t('roster.edit'))}</button>` : ''}
      </div>
      <p class="muted small">${escapeHtml(t(admits ? 'roster.onHintGate' : 'roster.onHint'))}</p>
      <div class="row row--chips iam ${me ? '' : 'iam--needed'}" role="group" aria-label="${escapeHtml(t('polls.iAm'))}">
        <span class="muted small">${escapeHtml(t('polls.iAm'))}</span>
        ${roster
.map((name) => `
            <button type="button" class="chip ${name === me ? 'chip--on' : ''}" data-roster-me="${escapeHtml(name)}"
                    aria-pressed="${name === me ? 'true' : 'false'}">${escapeHtml(name)}</button>`)
.join('')}
      </div>
      ${me ? '' : `<p class="late small">${escapeHtml(t('roster.pickMe'))}</p>`}
      ${
strays.length
? `<div class="stack stack--tight" id="roster-strays">
               <p class="small">${escapeHtml(t('roster.strays'))}</p>
               ${strays
.map((name) => `
                   <div class="knock">
                     <strong>${escapeHtml(name)}</strong>
                     <div class="row">
                       <button type="button" class="button button--small" data-stray-merge="${escapeHtml(name)}">${escapeHtml(t('roster.merge'))}</button>
                       ${admits ? `<button type="button" class="button button--small button--ghost" data-stray-add="${escapeHtml(name)}">${escapeHtml(t('roster.addToList'))}</button>` : ''}
                     </div>
                   </div>`)
.join('')}
             </div>`
: ''
}
    </section>`;
}
async function saveRoster(group, names) {
let kept = null;
try {
kept = await state.remote.setPeople(group.key, names);
} catch {
kept = null;
}
if (!kept) return null;
const held = groups().find((one) => one.id === group.id) || group;
rememberGroup({ ...held, people: kept });
return kept;
}
function openRosterDialog(group) {
const roster = rosterOf(group.id);
const start = roster.length ? roster : distinctNames([myName(), ...namesWrittenIn(group)]);
const dialog = makeDialog();
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('roster.editTitle', { name: group.name }))}</h2>
      <p class="muted small">${escapeHtml(t('roster.editHint'))}</p>
      <label class="visually-hidden" for="roster-names">${escapeHtml(t('roster.title'))}</label>
      <textarea id="roster-names" rows="8" autocomplete="off">${escapeHtml(start.join('\n'))}</textarea>
      <p class="late small" id="roster-problem" aria-live="polite" hidden></p>
      <div class="row">
        <button type="button" class="button button--primary" data-roster-save>${escapeHtml(t('action.save'))}</button>
        <button type="button" class="button" data-roster-cancel>${escapeHtml(t('action.cancel'))}</button>
        ${roster.length ? `<button type="button" class="button button--ghost" data-roster-off>${escapeHtml(t('roster.stop'))}</button>` : ''}
      </div>
    </div>`;
const keep = async (names, said) => {
const buttons = dialog.querySelectorAll('button');
buttons.forEach((button) => { button.disabled = true; });
const kept = await saveRoster(group, names);
if (!kept) {
buttons.forEach((button) => { button.disabled = false; });
const problem = dialog.querySelector('#roster-problem');
problem.textContent = t('groups.unsure');
problem.hidden = false;
return;
}
dialog.close();
flash(said(kept));
render();
};
dialog.querySelector('[data-roster-save]').addEventListener('click', () => {
const names = distinctNames(dialog.querySelector('#roster-names').value.split('\n')).map((name) => name.slice(0, NAME_KEPT));
if (!names.length && !roster.length) {
dialog.querySelector('#roster-names').focus();
return;
}
void keep(names, (kept) => (kept.length ? t('roster.saved', { count: kept.length }) : t('roster.stopped')));
});
dialog.querySelector('[data-roster-off]')?.addEventListener('click', () => void keep([], () => t('roster.stopped')));
dialog.querySelector('[data-roster-cancel]').addEventListener('click', () => dialog.close());
dialog.showModal();
}
function openMergeDialog(group, stray) {
const dialog = makeDialog();
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('roster.mergeTitle', { name: stray }))}</h2>
      <p class="muted small">${escapeHtml(t('roster.mergeHint', { name: stray }))}</p>
      <div class="row row--chips">
        ${rosterOf(group.id).map((name) => `<button type="button" class="chip" data-merge-into="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}
      </div>
      <div class="row">
        <button type="button" class="button button--ghost" data-merge-cancel>${escapeHtml(t('action.cancel'))}</button>
      </div>
    </div>`;
dialog.querySelectorAll('[data-merge-into]').forEach((chip) => {
chip.addEventListener('click', () => {
const into = chip.dataset.mergeInto;
dialog.close();
const { touched, left } = renameAcross(stray, into, (document_) => inGroup(document_, group.id));
flash(left
? t('roster.mergedLeft', { before: stray, after: into, count: touched, left })
: t('roster.merged', { before: stray, after: into, count: touched }), left ? 'error' : 'info');
render();
});
});
dialog.querySelector('[data-merge-cancel]').addEventListener('click', () => dialog.close());
dialog.showModal();
}
const rosterAskedAt = new Map();
function bindGroup(group) {
view.querySelectorAll('[data-roster-me]').forEach((chip) => {
chip.addEventListener('click', () => {
setMyNameIn(group.id, chip.dataset.rosterMe);
render();
});
});
view.querySelector('[data-roster-edit]')?.addEventListener('click', () => openRosterDialog(group));
view.querySelectorAll('[data-stray-merge]').forEach((button) => {
button.addEventListener('click', () => openMergeDialog(group, button.dataset.strayMerge));
});
view.querySelectorAll('[data-stray-add]').forEach((button) => {
button.addEventListener('click', async () => {
button.disabled = true;
const kept = await saveRoster(group, [...rosterOf(group.id), button.dataset.strayAdd]);
flash(kept ? t('roster.added', { name: button.dataset.strayAdd }) : t('groups.unsure'), kept ? 'info' : 'error');
render();
});
});
if (state.remote && Date.now() - (rosterAskedAt.get(group.id) || 0) > 30000) {
rosterAskedAt.set(group.id, Date.now());
const before = rosterOf(group.id).join('\n');
void refreshGroup(group).then(() => {
const here = route();
if (rosterOf(group.id).join('\n') !== before && !isBusy() && here.name === 'group' && here.id === group.id) render();
});
}
}
function groupView(group) {
const ours = (documents) => documents.filter((document_) => isLive(document_) && inGroup(document_, group.id));
const today = dayNow();
const byDay = (a, b) => a.date.localeCompare(b.date) || String(a.at || '').localeCompare(String(b.at || ''));
const recent = (a, b) => b.updatedAt - a.updatedAt;
const events = ours(state.polls).filter((poll) => poll.date && lastDay(poll) >= today).sort(byDay);
const polls = ours(state.polls)
.filter((poll) => !isEvent(poll) && !poll.closedAt && !events.includes(poll))
.sort(recent);
const lists = ours(state.lists).filter((list) => progress(list).left > 0).sort(recent);
const games = ours(state.games).filter((game) => !gameStatus(game).finished).sort(recent);
const spends = ours(state.spends)
.filter((spend) => balances(spend).some((row) => row.balance !== 0))
.sort(recent);
const boards = ours(state.boards).sort(recent);
const counts = groupCounts(state, group.id);
const section = (title, documents, cardHtml, tab) =>
documents.length
? `<section class="section">
           <div class="section__head">
             <h2>${escapeHtml(title)}</h2>
             <button type="button" class="button button--small button--ghost"
                     data-group-tile="${escapeHtml(group.id)}" data-tile-goto="${tab}">
               ${escapeHtml(t('group.seeAll'))}
             </button>
           </div>
           <div class="game-list">${documents.map(cardHtml).join('')}</div>
         </section>`
: '';
const sections = [
section(t('events.coming'), events, eventCardHtml, '#/agenda'),
section(t('tab.lists'), lists, listCardHtml, '#/lists'),
section(t('tab.polls'), polls, pollCardHtml, '#/polls'),
section(t('tab.games'), games, gameCardHtml, '#/games'),
section(t('tab.spends'), spends, spendCardHtml, '#/spends'),
section(t('tab.ideas'), boards, boardCardHtml, '#/ideas'),
].join('');
const roster = groupRosterHtml(group);
const fixed = rosterOf(group.id);
const rosterFirst = Boolean(roster) && (!fixed.length || !myNameIn(group.id)
|| offRoster(group.id, namesWrittenIn(group)).length > 0);
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/groups')}
      <h1>${escapeHtml(group.name)}</h1>
    </div>
    <p class="muted small">
      ${escapeHtml(t('dash.peopleCount', { count: counts.people }))} · ${escapeHtml(countsText(counts))}
    </p>
    <button type="button" class="button button--primary button--block" data-create-menu>
      + ${escapeHtml(t('create.title'))}
    </button>
    ${rosterFirst ? roster : ''}
    ${groupNewsHtml(group)}
    ${sections || `<p class="muted small">${escapeHtml(t('group.nothing'))}</p>`}
    ${rosterFirst ? '' : roster}
    ${groupPeopleHtml(group)}`;
}
function openCreateMenu() {
const here = route();
const poll = here.name === 'poll' && !here.solo ? getPoll(here.id) : null;
if (poll?.date) openEventMenu(poll);
else openPlainMenu();
}
function openPlainMenu() {
const here = route();
const dialog = makeDialog();
resetGroupChoice();
const fromPage = here.name === 'group' ? groups().find((group) => group.id === here.id) : null;
const start = fromPage ? { group: fromPage, linkOnly: false } : destinationForNew();
let chosen = start.linkOnly ? LINK_ONLY : start.group?.id || '';
const asks = Boolean(state.remote && groups().length);
const choice = (goto, label) => `
    <button type="button" class="button button--block" data-create="${goto}">+ ${escapeHtml(label)}</button>`;
const chip = (id, label) => `
    <button type="button" class="chip ${chosen === id ? 'chip--on' : ''}"
            data-create-into="${escapeHtml(id)}" aria-pressed="${chosen === id ? 'true' : 'false'}">
      ${escapeHtml(label)}
    </button>`;
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('create.what'))}</h2>
      ${
asks
? `<div class="stack stack--tight">
               <span class="muted small">${escapeHtml(t('groups.willGoIn'))}</span>
               <div class="row" role="group" aria-label="${escapeHtml(t('groups.willGoIn'))}">
                 ${groupsByName().map((group) => chip(group.id, group.name)).join('')}
                 ${chip(LINK_ONLY, t('groups.linkOnly'))}
                 ${chip('', t('groups.keepToMyself'))}
               </div>
             </div>`
: ''
}
      <div class="create-menu">
        ${choice('#/lists/new', t('lists.new'))}
        ${choice('#/polls/new', t('polls.new'))}
        ${choice('#/agenda/new', t('events.new'))}
        <button type="button" class="button button--block" data-create-activity>+ ${escapeHtml(t('activity.new'))}</button>
        ${choice('#/new', t('action.newGame'))}
        ${choice('#/spends/new', t('spends.new'))}
        ${choice('#/ideas/new', t('ideas.new'))}
      </div>
      <div class="row">
        <button type="button" class="button button--ghost" data-create-close>${escapeHtml(t('action.cancel'))}</button>
      </div>
    </div>`;
dialog.querySelectorAll('[data-create-into]').forEach((node) => {
node.addEventListener('click', () => {
chosen = node.dataset.createInto;
dialog.querySelectorAll('[data-create-into]').forEach((other) => {
const on = other.dataset.createInto === chosen;
other.classList.toggle('chip--on', on);
other.setAttribute('aria-pressed', on ? 'true' : 'false');
});
});
});
dialog.querySelectorAll('[data-create]').forEach((node) => {
node.addEventListener('click', () => {
if (asks) state.newGroupChoice = { touched: true, id: chosen };
dialog.close();
navigate(node.dataset.create);
});
});
dialog.querySelector('[data-create-activity]').addEventListener('click', () => {
dialog.close();
openActivityPicker();
});
dialog.querySelector('[data-create-close]').addEventListener('click', () => dialog.close());
dialog.showModal();
}
function openEventMenu(poll) {
const dialog = makeDialog();
const name = eventName(poll) || pollTitle(poll);
const choice = (goto, label) => `
    <button type="button" class="button button--block" data-create="${goto}">+ ${escapeHtml(label)}</button>`;
dialog.innerHTML = `
    <div class="stack">
      <h2>${escapeHtml(t('event.addTo', { name }))}</h2>
      <p class="muted small">${escapeHtml(t('event.addToHint'))}</p>
      <div class="create-menu">
        <button type="button" class="button button--block" data-create-activity>+ ${escapeHtml(t('activity.new'))}</button>
        ${choice('#/lists/new', t('lists.new'))}
        ${choice('#/polls/new', t('polls.new'))}
        ${choice('#/new', t('action.newGame'))}
        ${choice('#/spends/new', t('spends.new'))}
        ${choice('#/ideas/new', t('ideas.new'))}
      </div>
      <div class="row">
        <button type="button" class="button button--ghost" data-create-close>${escapeHtml(t('action.cancel'))}</button>
        <button type="button" class="button button--ghost" data-create-plain>${escapeHtml(t('event.addElsewhere'))}</button>
      </div>
    </div>`;
dialog.querySelector('[data-create-plain]').addEventListener('click', () => {
dialog.close();
openPlainMenu();
});
dialog.querySelector('[data-create-activity]').addEventListener('click', () => {
dialog.close();
openActivityDialog(topEventOf(poll, everything()) || poll);
});
dialog.querySelectorAll('[data-create]').forEach((node) => {
node.addEventListener('click', () => {
resetGroupChoice();
chooseEvent(poll);
const coming = goers(poll);
if (coming.length) {
state.newListPeople = [...coming];
state.newPollPeople = [...coming];
state.newSpendPeople = [...coming];
state.newGameNames = [...coming];
state.newGameTouched = true;
}
dialog.close();
navigate(node.dataset.create);
});
});
dialog.querySelector('[data-create-close]').addEventListener('click', () => dialog.close());
dialog.showModal();
}
function owedText(accounts) {
const byCurrency = new Map();
for (const row of accounts) {
if (row.balance >= 0) continue;
const code = spendCurrency(row.spend);
byCurrency.set(code, (byCurrency.get(code) || 0) - row.balance);
}
return [...byCurrency].map(([code, cents]) => showAmount(cents, getLanguage(), code)).join(' + ');
}
function waitingLine({ counts, accounts = [] }) {
return [
counts.late ? t('lists.late', { count: counts.late }) : '',
counts.left ? t('lists.leftToDo', { count: counts.left }) : '',
counts.votes ? t('dash.votes', { count: counts.votes }) : '',
counts.owes ? t('spends.owes', { amount: owedText(accounts) }) : '',
]
.filter(Boolean)
.join(' · ');
}
const WELCOME_ICONS = {
poll: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M9 14.5l2 2 4-4"/>',
list: '<path d="M9 7h11M9 12h11M9 17h11"/><path d="M3.5 7l1.2 1.2L7 6M3.5 12l1.2 1.2L7 11M3.5 17l1.2 1.2L7 16"/>',
spend: '<circle cx="12" cy="12" r="8.5"/><path d="M15.2 8.6a4.3 4.3 0 1 0 0 6.8M7.5 11h6M7.5 13.4h6"/>',
};
function welcomeHtml() {
const tile = (goto, label, icon) => `
    <button type="button" class="welcome__tile" data-goto="${goto}">
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor"
           stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${WELCOME_ICONS[icon]}</svg>
      <span>${escapeHtml(label)}</span>
    </button>`;
return `
    <section class="welcome">
      <span class="welcome__mark" aria-hidden="true">
        <svg viewBox="11 18 42 28" width="84" height="56">
          <circle cx="25" cy="32" r="12.5" fill="none" stroke="currentColor" stroke-width="3.6" />
          <circle cx="39" cy="32" r="12.5" fill="none" stroke="currentColor" stroke-width="3.6" />
        </svg>
      </span>
      <h2>${escapeHtml(myName() ? t('welcome.hello', { name: myName() }) : t('welcome.title'))}</h2>
      <p class="lead">${escapeHtml(t('overview.what'))}</p>
      ${
state.remote
? `<button type="button" class="button button--primary welcome__main" data-goto="#/groups">${escapeHtml(t('welcome.join'))}</button>
             <p class="muted small welcome__or">${escapeHtml(t('welcome.alone'))}</p>`
: ''
}
      <div class="welcome__tiles">
        ${tile('#/polls/new', t('welcome.poll'), 'poll')}
        ${tile('#/lists/new', t('welcome.list'), 'list')}
        ${tile('#/spends/new', t('welcome.spend'), 'spend')}
      </div>
    </section>`;
}
function overviewView() {
const forYou = forYouItems();
const nothingYet = ![...state.lists, ...state.polls, ...state.games, ...state.spends, ...state.boards].length;
const pending = pendingHtml(new Set(forYou.items.map((item) => item.goto)));
const coming = comingHtml();
if (nothingYet && !groups().length) {
return `
      ${flashHtml()}
      ${kindsHtml('overview')}
      ${welcomeHtml()}`;
}
return `
    ${flashHtml()}
    ${kindsHtml('overview')}
    ${groupChipsHtml()}
    ${holoPlaceHtml()}
    ${nothingYet ? `<p class="lead">${escapeHtml(t('overview.what'))}</p>` : ''}

    ${accountNeededHtml()}

    ${installReminderHtml()}

    ${eventsHtml()}

    ${unblockedHtml()}

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('forYou.title'))}</h2></div>
      ${forYouHtml(forYou)}
    </section>

    ${
coming
? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('agenda.dated'))}</h2></div>
             ${coming}
           </section>`
: ''
}

    ${
pending
? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('overview.pending'))}</h2></div>
             ${pending}
           </section>`
: ''
}`;
}
function forYouItems() {
const items = [];
for (const group of groupsByName()) {
const rows = group.admits === false ? null : gate().requests[group.id];
if (!rows?.length) continue;
items.push({
goto: '#/groups',
title: t('forYou.knocks', { count: rows.length }),
meta: t('forYou.knocksWhere', { name: group.name }),
});
}
for (const group of groupsByName()) {
if (!rosterOf(group.id).length || myNameIn(group.id)) continue;
items.push({ goto: `#/group/${group.id}`, title: group.name, meta: t('roster.forYou') });
}
const sorted = new Map();
for (const [kind, documents] of [['lists', state.lists], ['polls', state.polls], ['spends', state.spends]]) {
for (const one of shownDocs(documents)) {
const name = myNameFor(one);
if (!name) continue;
const key = sameName(name);
if (!sorted.has(key)) sorted.set(key, { name, lists: [], polls: [], spends: [] });
sorted.get(key)[kind].push(one);
}
}
if (!myName() && !sorted.size) return { items, noName: true };
const files = [...sorted.values()].map((held) => ({ ...held, file: personFile(held, held.name) }));
const file = {
votes: files.flatMap((held) => held.file.votes),
lines: files.flatMap((held) => held.file.lines),
accounts: files.flatMap((held) => held.file.accounts),
};
for (const row of file.votes.filter((one) => !one.closed && !one.answered)) {
items.push({ goto: `#/poll/${row.poll.id}`, title: pollTitle(row.poll), meta: t('forYou.vote') + forEventText(row.poll) });
}
for (const poll of shownDocs(state.polls)) {
if (poll.closedAt || poll.date || poll.archivedAt || isEvent(poll) || !isOrganiser(poll)) continue;
if (poll.people.length < 2 || !poll.options.length) continue;
if (tally(poll).answered < poll.people.length) continue;
items.push({ goto: `#/poll/${poll.id}`, title: pollTitle(poll), meta: t('forYou.decide') + forEventText(poll) });
}
for (const row of file.lines.filter((one) => one.left > 0).sort((a, b) => b.late - a.late)) {
items.push({
goto: `#/list/${row.list.id}`,
title: listTitle(row.list),
meta: t('forYou.lines', { count: row.left }) + forEventText(row.list),
late: row.late ? t('lists.late', { count: row.late }) : '',
});
}
for (const row of files.flatMap((held) => purchasesToWrite(held.name, held.lists, everything()))) {
items.push({
goto: `#/list/${row.list.id}`,
title: listTitle(row.list),
meta: t('forYou.purchases', { count: row.items.length, name: spendTitle(row.account) }) + forEventText(row.list),
});
}
for (const row of file.accounts.filter((one) => one.balance < 0)) {
items.push({
goto: `#/spend/${row.spend.id}`,
title: spendTitle(row.spend),
meta: t('spends.iOwe', { amount: money(-row.balance, row.spend) }) + forEventText(row.spend),
});
}
return { items };
}
function forYouHtml({ items, noName }) {
const rows = items.map((item) => `
    <button type="button" class="game-card" data-goto="${escapeHtml(item.goto)}">
      <span class="game-card__title">
        ${escapeHtml(item.title)}
        ${item.late ? `<span class="pill pill--late">${escapeHtml(item.late)}</span>` : ''}
      </span>
      <span class="game-card__meta">${escapeHtml(item.meta)}</span>
    </button>`).join('');
return `
    ${rows ? `<div class="game-list" id="for-you">${rows}</div>` : ''}
    ${
noName
? `<p class="muted small">${escapeHtml(t('forYou.noName'))}</p>
           <div class="row row--tight">
             <input type="text" id="me-name" autocomplete="given-name" maxlength="${NAME_KEPT}"
                    placeholder="${escapeHtml(t('me.placeholder'))}" aria-label="${escapeHtml(t('me.title'))}" />
             <button type="button" class="button" id="me-save">${escapeHtml(t('welcome.itsMe'))}</button>
           </div>`
: rows ? '' : `<p class="muted small">${escapeHtml(t('forYou.nothing'))}</p>`
}`;
}
function groupsView() {
if (!state.remote) {
return `
      ${flashHtml()}
      <p class="muted small">${escapeHtml(t('groups.noDatabase'))}</p>`;
}
return `
    ${flashHtml()}
    ${
accountOfferHtml() || accountNeededHtml()
}
    ${
myName() ? '' : meHtml()
}
    ${byGroupHtml()}
    ${groupsHtml()}`;
}
function settingsView() {
return `
    ${flashHtml()}
    ${meHtml()}
    ${languageHtml()}
    ${lookHtml()}
    ${accountHtml()}
    ${notifyHtml()}
    ${dataHtml()}`;
}
function dataHtml() {
return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('home.data'))}</h2></div>
      <div class="row">
        <button type="button" class="button button--small button--ghost" id="share-app">${escapeHtml(t('action.shareApp'))}</button>
        <button type="button" class="button button--small" id="export">${escapeHtml(t('action.export'))}</button>
        <button type="button" class="button button--small" id="import">${escapeHtml(t('action.import'))}</button>
        <button type="button" class="button button--small" id="import-paste">${escapeHtml(t('action.importPaste'))}</button>
        <button type="button" class="button button--small" id="open-link">${escapeHtml(t('action.openLink'))}</button>
        <button type="button" class="button button--small" id="claude-guide">${escapeHtml(t('claude.button'))}</button>
        ${
lots().length
? `<button type="button" class="button button--small" id="my-shares">${escapeHtml(t('lots.title', { count: lots().length }))}</button>`
: ''
}
        <input type="file" id="import-file" accept="application/json,.json" class="visually-hidden" tabindex="-1" aria-hidden="true" />
      </div>
      <p class="muted small">${escapeHtml(
t(state.remote ? 'home.storedShared' : state.store ? 'home.storedCloud' : 'home.storedLocal'),
)}</p>
      <p class="muted small">${escapeHtml(t('data.holds', heldCounts()))}</p>
      ${
Object.keys(heldOrganiserSecrets()).length
? `<p class="muted small" id="organiser-backup">${escapeHtml(
t('data.organiserBackup', { count: Object.keys(heldOrganiserSecrets()).length }),
)}</p>`
: ''
}
      ${
appVersion()
? `<p class="muted small">
               ${escapeHtml(t('data.version', { version: appVersion() }))}
               ${
'serviceWorker' in navigator
? `<button type="button" class="button button--small button--ghost" id="look-update">
                        ${escapeHtml(t('data.lookForUpdate'))}
                      </button>`
: ''
}
             </p>`
: ''
}
      ${
state.remote && groups().length
? `<label class="checkbox">
               <input type="checkbox" id="auto-share" ${state.prefs.autoShare ? 'checked' : ''} />
               ${escapeHtml(t('data.autoShare'))}
             </label>
             <p class="muted small">${escapeHtml(t('data.autoShareHint'))}</p>`
: ''
}
    </section>`;
}
function bindInvitationPaste(nameField, codeField) {
if (!nameField || !codeField) return;
const take = (event) => {
const pasted = event.clipboardData?.getData('text') || '';
const { name, code } = readInvite(pasted);
if (!code && !name) return;
event.preventDefault();
if (name) nameField.value = name;
if (code) codeField.value = code;
(code ? codeField : nameField).focus();
};
nameField.addEventListener('paste', take);
codeField.addEventListener('paste', take);
codeField.addEventListener('input', () => {
const digits = codeField.value.replace(/[^0-9]/g, '').slice(0, 6);
if (digits !== codeField.value) codeField.value = digits;
});
}
function bindOverview() {
bindData();
bindInAppWarning();
view.querySelector('#me-save')?.addEventListener('click', () => {
const name = setMyName(view.querySelector('#me-name').value);
flash(name ? t('me.saved', { name }) : t('me.cleared'));
render();
});
view.querySelector('#me-name')?.addEventListener('keydown', (event) => {
if (event.key !== 'Enter') return;
event.preventDefault();
view.querySelector('#me-save')?.click();
});
const joining = (line, message) => {
line.textContent = message;
};
bindInvitationPaste(view.querySelector('#group-name'), view.querySelector('#group-code'));
view.querySelector('#group-join')?.addEventListener('click', async (event) => {
const button = event.currentTarget;
const line = view.querySelector('#group-state');
const name = view.querySelector('#group-name').value.trim();
const code = readCode(view.querySelector('#group-code').value);
if (!name) return joining(line, t('groups.needName'));
if (!code) return joining(line, t('groups.needCode'));
if (!myName()) return joining(line, t('gate.needNameFirst'));
button.disabled = true;
joining(line, t('groups.checking'));
const me = myName();
const held = groupNamed(name);
if (held) {
let taken = 0;
try {
taken = await catchUpWith(held);
} catch {
button.disabled = false;
return joining(line, t('groups.unsure'));
}
button.disabled = false;
flash(taken
? t('join.alreadyCaughtUp', { name: held.name, count: taken })
: t('join.alreadyUpToDate', { name: held.name }));
render();
return;
}
let answer = { status: 'unknown' };
try {
answer = await knockAs(name, code, me);
} catch {
button.disabled = false;
return joining(line, t('groups.unsure'));
}
button.disabled = false;
if (answer.status === 'busy') return joining(line, t('gate.busy'));
if (answer.status === 'who') return joining(line, t('roster.whoNeeded'));
if (answer.status !== 'waiting') return joining(line, t('groups.codeRefused'));
rememberPending({
ticket: answer.ticket,
groupId: answer.id,
groupName: answer.name || name,
me: answer.me,
at: Date.now(),
});
flash(t('gate.asked', { name: answer.name || name }));
render();
});
view.querySelector('#group-code')?.addEventListener('keydown', (event) => {
if (event.key !== 'Enter') return;
event.preventDefault();
view.querySelector('#group-join')?.click();
});
view.querySelector('#group-paste')?.addEventListener('click', async (event) => {
const button = event.currentTarget;
const line = view.querySelector('#group-state');
const key = view.querySelector('#group-key').value.trim();
if (!key) return;
button.disabled = true;
joining(line, t('groups.checking'));
let group = null;
try {
group = await joinGroup(key);
} catch {
button.disabled = false;
return joining(line, t('groups.unsure'));
}
button.disabled = false;
if (!group) return joining(line, t('groups.refused'));
flash(t('groups.joined', { name: group.name }));
render();
});
view.querySelectorAll('[data-invite]').forEach((button) => {
button.addEventListener('click', async () => {
const group = groups().find((item) => item.id === button.dataset.invite);
if (!group) return;
const shape = await askInvitationShape();
if (!shape) return;
button.disabled = true;
button.textContent = t('share.sending');
let invitation = null;
try {
invitation = await state.remote.invite(group.key, shape.minutes, shape.uses);
} catch (error) {
flash(remoteReason(error), 'error');
render();
return;
}
if (!invitation) {
flash(t('groups.unsure'), 'error');
render();
return;
}
render();
const url = joinLink(location, group.name, invitation.code);
const days = Math.max(1, Math.round(invitation.minutes / (24 * 60)));
await shareMessage({
title: t('groups.inviteReady', { name: group.name }),
hint: t('groups.inviteWhy'),
message: t('groups.inviteText', { name: group.name, code: invitation.code, url, days }),
url,
code: invitation.code,
});
});
});
view.querySelectorAll('[data-admit], [data-refuse]').forEach((button) => {
button.addEventListener('click', async () => {
const admit = 'admit' in button.dataset;
const group = groups().find((item) => item.id === (admit ? button.dataset.admit : button.dataset.refuse));
if (!group) return;
button.disabled = true;
let status = 'unknown';
try {
status = await state.remote.answer(group.key, button.dataset.request, admit);
} catch {
flash(t('groups.unsure'), 'error');
render();
return;
}
forgetGate(group.id);
await loadGate(group);
if (status === 'ok') flash(t('gate.admitted'));
else if (status === 'refused') flash(t('gate.refused'));
else flash(t('gate.gone'), 'error');
render();
});
});
view.querySelectorAll('[data-accounts]').forEach((button) => {
button.addEventListener('click', async () => {
const group = groups().find((item) => item.id === button.dataset.accounts);
if (!group) return;
const on = button.dataset.on === 'yes';
const sure = await ask(t(on ? 'gate.accountsConfirmOn' : 'gate.accountsConfirmOff'),
{ confirmLabel: t(on ? 'gate.accountsOn' : 'gate.accountsOff'), danger: on });
if (!sure) return;
button.disabled = true;
let status = 'unknown';
try {
if (on) await syncAccount({ restore: false, force: true });
status = await state.remote.setAccounts(group.key, on, on ? await accountToken() : null);
} catch {
flash(t('groups.unsure'), 'error');
render();
return;
}
await refreshGroup(group);
forgetGate(group.id);
await loadGate(group);
flash(t(status === 'ok' ? (on ? 'gate.accountsDoneOn' : 'gate.accountsDoneOff') : 'gate.accountsNeedMine'), status === 'ok' ? 'info' : 'error');
render();
});
});
view.querySelectorAll('[data-admits]').forEach((button) => {
button.addEventListener('click', async () => {
const group = groups().find((item) => item.id === button.dataset.admits);
if (!group) return;
const allow = button.dataset.allow === 'yes';
const sure = await ask(t(allow ? 'gate.confirmGiveAdmits' : 'gate.confirmDropAdmits'),
{ confirmLabel: t(allow ? 'gate.giveAdmits' : 'gate.dropAdmits'), danger: !allow });
if (!sure) return;
button.disabled = true;
let status = 'unknown';
try {
status = await state.remote.setAdmits(group.key, button.dataset.key, allow);
} catch {
flash(t('groups.unsure'), 'error');
render();
return;
}
forgetGate(group.id);
await loadGate(group);
await refreshGroup(group);
if (status === 'ok') flash(t(allow ? 'gate.gaveAdmits' : 'gate.droppedAdmits'));
else if (status === 'last') flash(t('gate.cutLast'), 'error');
else flash(t('gate.gone'), 'error');
render();
});
});
view.querySelectorAll('[data-cut-link]').forEach((button) => {
button.addEventListener('click', async () => {
const group = groups().find((item) => item.id === button.dataset.cutLink);
if (!group) return;
if (!(await ask(t('back.confirmCutLink'), { confirmLabel: t('back.cutLink'), danger: true }))) return;
button.disabled = true;
let status = 'unknown';
try {
status = await state.remote.forgetLink(group.key, button.dataset.person);
} catch {
flash(t('groups.unsure'), 'error');
render();
return;
}
forgetGate(group.id);
await loadGate(group);
flash(status === 'ok' ? t('back.cutLinkDone') : t('gate.gone'), status === 'ok' ? 'info' : 'error');
render();
});
});
view.querySelectorAll('[data-cut]').forEach((button) => {
button.addEventListener('click', async () => {
const group = groups().find((item) => item.id === button.dataset.cut);
if (!group) return;
const question = 'withLink' in button.dataset ? 'gate.confirmCutWithLink' : 'gate.confirmCut';
if (!(await ask(t(question), { confirmLabel: t('gate.cut'), danger: true }))) return;
let status = 'unknown';
try {
status = await state.remote.cutKey(group.key, button.dataset.key);
} catch {
flash(t('groups.unsure'), 'error');
render();
return;
}
forgetGate(group.id);
await loadGate(group);
if (status === 'ok') flash(t('gate.cutDone'));
else if (status === 'last') flash(t('gate.cutLast'), 'error');
else flash(t('gate.gone'), 'error');
render();
});
});
view.querySelectorAll('[data-check]').forEach((button) => {
button.addEventListener('click', async () => {
const knock = pendings()[Number(button.dataset.check)];
if (!knock) return;
button.disabled = true;
const status = await checkPending(knock);
if (status === 'waiting') flash(t('gate.stillWaiting'));
else if (status === null) flash(t('groups.unsure'), 'error');
render();
});
});
view.querySelectorAll('[data-drop]').forEach((button) => {
button.addEventListener('click', async () => {
const knock = pendings()[Number(button.dataset.drop)];
if (!knock) return;
if (!(await ask(t('gate.confirmDropMine', { name: knock.groupName }),
{ confirmLabel: t('gate.dropMine'), danger: true }))) return;
forgetPending(knock.ticket);
flash(t('gate.droppedMine', { name: knock.groupName }));
render();
});
});
for (const group of showsGate() ? groups() : []) {
if (group.admits === undefined) {
refreshGroup(group).then((learnt) => {
if (learnt && !isBusy() && showsGate()) render();
});
continue;
}
if (group.admits === false) continue;
loadGate(group).then((learnt) => {
if (learnt && !isBusy() && showsGate()) render();
});
}
view.querySelectorAll('[data-catch-up]').forEach((button) => {
button.addEventListener('click', async () => {
const group = groups().find((item) => item.id === button.dataset.catchUp);
if (!group) return;
button.disabled = true;
button.textContent = t('share.sending');
let taken = 0;
try {
taken = await catchUpWith(group);
} catch {
flash(t('groups.unsure'), 'error');
render();
return;
}
flash(taken ? t('groups.caughtUp', { count: taken }) : t('groups.upToDate'));
render();
});
});
view.querySelectorAll('[data-my-link]').forEach((button) => {
button.addEventListener('click', async () => {
const group = groups().find((item) => item.id === button.dataset.myLink);
if (!group) return;
if (!(await ask(t('back.confirmMyLink'), { confirmLabel: t('back.myLink') }))) return;
button.disabled = true;
await showMyLink(group);
});
});
view.querySelectorAll('[data-calendar]').forEach((button) => {
button.addEventListener('click', async () => {
const group = groups().find((item) => item.id === button.dataset.calendar);
if (!group) return;
button.disabled = true;
try {
await showCalendar(group);
} finally {
button.disabled = false;
}
});
});
view.querySelectorAll('[data-cut-calendar]').forEach((button) => {
button.addEventListener('click', async () => {
const group = groups().find((item) => item.id === button.dataset.cutCalendar);
if (!group) return;
if (!(await ask(t('agenda.confirmCut'), { confirmLabel: t('agenda.cut'), danger: true }))) return;
button.disabled = true;
let answer = 'unknown';
try {
answer = await state.remote.forgetCalendar(group.key);
} catch {
button.disabled = false;
flash(t('groups.unsure'), 'error');
render();
return;
}
flash(answer === 'ok' ? t('agenda.cutDone') : t('agenda.none'), answer === 'ok' ? 'info' : 'error');
render();
});
});
view.querySelectorAll('[data-show-key]').forEach((button) => {
button.addEventListener('click', async () => {
const group = groups().find((item) => item.id === button.dataset.showKey);
if (!group) return;
if (!(await ask(t('groups.confirmShowKey', { name: group.name }), { confirmLabel: t('groups.showKey') }))) return;
showCopyDialog({
title: t('groups.keyTitle', { name: group.name }),
hint: `${t('groups.keyWarning')} ${t(group.admits ? 'groups.keyAdmits' : 'groups.keyPlain')}`,
text: group.key,
});
});
});
view.querySelectorAll('[data-leave]').forEach((button) => {
button.addEventListener('click', async () => {
if (!(await ask(t('groups.confirmLeave'), { confirmLabel: t('groups.leave'), danger: true }))) return;
await leaveWithAccount(groups().find((group) => group.id === button.dataset.leave));
forgetGroup(button.dataset.leave);
render();
});
});
}
function holoPart() {
return laterPart('holo', () => togetherPart('holo', () => ({ OUTSIDE_GROUPS, allDocuments, documentHref, documentTitle, escapeHtml, groupFilter, groupsByName, inGroup, isDone, isEventDoc, isLive, kindOf, linksOf, navigate, parentId, render, setGroupFilter, shownDocs, state, t })));
}
function holoPlaceHtml() {
const kinds = [state.lists, state.polls, state.games, state.spends, state.boards];
if (!kinds.some((docs) => shownDocs(docs || []).length)) return '';
const part = holoPart();
if (part.module) return part.module.holoHtml();
return '<section class="holo holo--waiting" id="holo-wait" aria-hidden="true"></section>';
}
function bindHoloPlace() {
if (!document.getElementById('holo') && !document.getElementById('holo-wait')) return;
const part = holoPart();
if (part.module) {
part.module.bindHolo();
return;
}
part.coming.then(
(module) => {
const wait = document.getElementById('holo-wait');
if (!wait) return;
wait.outerHTML = module.holoHtml();
module.bindHolo();
},
() => document.getElementById('holo-wait')?.remove(),
);
}

// ---- src/view-join.js ------------------------------------------------
function backView(token) {
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/')}
      <h1>${escapeHtml(t('back.title'))}</h1>
    </div>

    ${inAppWarningHtml()}

    <div class="card stack">
      <p>${escapeHtml(token ? t('back.what') : t('back.broken'))}</p>
      <p class="muted small" id="back-state"></p>
      ${
token
? `<button type="button" class="button button--primary button--block" id="back-go">
               ${escapeHtml(t('back.action'))}
             </button>`
: ''
}
    </div>`;
}
function bindBack(token) {
bindInAppWarning();
const line = view.querySelector('#back-state');
view.querySelector('#back-go')?.addEventListener('click', async (event) => {
const button = event.currentTarget;
if (!state.remote) {
line.textContent = t('join.noDatabase');
return;
}
button.disabled = true;
line.textContent = t('groups.checking');
let answer = { status: 'unknown' };
try {
answer = await state.remote.returnWith(token, deviceLabel());
} catch {
button.disabled = false;
line.textContent = t('groups.unsure');
return;
}
button.disabled = false;
if (answer.status === 'busy') return void (line.textContent = t('gate.busy'));
if (answer.status !== 'ok') return void (line.textContent = t('back.refused'));
if (answer.who && !myName()) setMyName(answer.who);
const group = { id: answer.id, name: answer.name, key: answer.key, admits: false, me: answer.who || '' };
rememberGroup(group);
await refreshGroup(group);
let taken = 0;
try {
taken = await catchUpWith(group);
} catch {
}
offerAccount(group);
flash(taken
? t('groups.joinedWith', { name: group.name, count: taken })
: t('groups.joined', { name: group.name }));
if (location.hash.startsWith('#/back/')) location.replace(`${location.pathname}${location.search}#/groups`);
else navigate('#/groups');
});
}
async function showMyLink(group) {
let answer = { status: 'none' };
try {
answer = await state.remote.myLink(group.key);
} catch {
flash(t('groups.unsure'), 'error');
render();
return;
}
if (answer.status !== 'ok') {
flash(t('back.noneForThisKey'));
render();
return;
}
showCopyDialog({
title: t('back.linkTitle', { name: group.name }),
hint: t('back.linkHint'),
text: backLink(location, answer.token),
qr: true,
});
}
async function showCalendar(group) {
let answer = { status: 'unknown' };
try {
answer = await state.remote.calendar(group.key);
} catch {
flash(t('groups.unsure'), 'error');
render();
return;
}
if (answer.status !== 'ok') {
flash(t(answer.status === 'account' ? 'agenda.needsAccount' : 'agenda.none'), 'error');
render();
return;
}
showCopyDialog({
title: t('agenda.title', { name: group.name }),
hint: t('agenda.hint'),
text: state.remote.calendarUrl(answer.token),
});
}
function joinView(invitation) {
const waiting = invitation.group ? pendingFor(invitation.group) : null;
if (waiting) return waitingView(waiting);
const already = invitation.group ? groupNamed(invitation.group) : null;
const head = `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/')}
      <h1>${escapeHtml(invitation.group ? t('join.title', { name: invitation.group }) : t('join.titlePlain'))}</h1>
    </div>

    ${inAppWarningHtml()}`;
if (!already && phoneToInstall() === 'ios' && !state.joinHere) return `${head}${installFirstHtml(invitation)}`;
return `
    ${head}

    ${installOfferHtml()}

    <form id="join-form" class="card stack">
      <p class="muted small">${escapeHtml(already ? t('join.already', { name: already.name }) : t('join.hint'))}</p>
      <label>
        ${escapeHtml(t('join.me'))}
        <input type="text" id="join-me" autocomplete="given-name" maxlength="${NAME_KEPT}" aria-required="true"
               value="${escapeHtml(myName())}" placeholder="${escapeHtml(t('me.placeholder'))}" />
      </label>

      <button type="submit" class="button button--primary button--block">
        ${escapeHtml(already ? t('groups.catchUp') : t('join.action'))}
      </button>
      <p class="muted small" id="join-state"></p>

      <details class="details">
        <summary>${escapeHtml(t('join.byHand'))}</summary>
        <div class="row row--tight">
          <input type="text" id="join-group" autocomplete="off" value="${escapeHtml(invitation.group)}"
                 placeholder="${escapeHtml(t('groups.namePlaceholder'))}" aria-label="${escapeHtml(t('groups.namePlaceholder'))}" />
          <input type="text" id="join-code" class="code-input" inputmode="numeric" autocomplete="one-time-code"
                 value="${escapeHtml(invitation.code || '')}" placeholder="000000"
                 aria-label="${escapeHtml(t('groups.codePlaceholder'))}" />
        </div>
      </details>

      ${toHomeScreenHtml(invitation)}
    </form>`;
}
function toHomeScreenHtml(invitation) {
if (onHomeScreen()) return '';
const name = String(invitation.group || '').trim();
const code = String(invitation.code || '').trim();
return `
    <details class="details">
      <summary>${escapeHtml(t('join.toHomeScreen'))}</summary>
      <p class="muted small">${escapeHtml(t('join.toHomeScreenWhy'))}</p>
      <ol class="steps muted small">
        <li>${escapeHtml(t('join.toHomeScreenStep1'))}</li>
        <li>${escapeHtml(t('join.toHomeScreenStep2'))}</li>
        <li>${escapeHtml(t('join.toHomeScreenStep3'))}</li>
      </ol>
      ${
name && code
? `<p class="small"><strong>${escapeHtml(t('join.toHomeScreenWhat'))}</strong>
               ${escapeHtml(name)} · <span class="code-shown">${escapeHtml(code)}</span></p>
             <div class="row row--tight">
               <button type="button" class="button button--small" id="join-copy-code">
                 ${escapeHtml(t('join.toHomeScreenCopy'))}
               </button>
             </div>`
: ''
}
      <p class="muted small">${escapeHtml(t('join.toHomeScreenDone'))}</p>
    </details>`;
}
function waitingView(knock) {
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/')}
      <h1>${escapeHtml(t('gate.waitingTitle', { name: knock.groupName }))}</h1>
    </div>

    <div class="card stack">
      <p>${escapeHtml(t('gate.waitingWhat', { name: knock.groupName, me: knock.me || t('gate.someone') }))}</p>
      <p class="muted small">${escapeHtml(t('gate.waitingHow'))}</p>
      <p class="muted small" id="waiting-state"></p>
      <div class="row">
        <button type="button" class="button button--primary" id="waiting-check">${escapeHtml(t('gate.check'))}</button>
        <button type="button" class="button button--ghost" id="waiting-drop">${escapeHtml(t('gate.dropMine'))}</button>
      </div>
    </div>`;
}
const INVITE_MINUTES = 2 * 24 * 60;
async function askInvitationShape() {
return new Promise((resolve) => {
const dialog = makeDialog('dialog dialog--ask');
dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(t('groups.inviteWhich'))}</h2>
        <p class="muted small">${escapeHtml(t('groups.inviteWhichHint'))}</p>
        <div class="stack stack--tight">
          <button type="button" class="button button--primary button--block" id="invite-open">
            ${escapeHtml(t('groups.inviteOpen'))}
          </button>
          <button type="button" class="button button--block" id="invite-one">
            ${escapeHtml(t('groups.inviteOne'))}
          </button>
        </div>
        <div class="row">
          <button type="button" class="button" id="invite-cancel">${escapeHtml(t('action.cancel'))}</button>
        </div>
      </div>`;
let answered = false;
const done = (shape) => {
if (answered) return;
answered = true;
resolve(shape);
dialog.close();
};
dialog.addEventListener('close', () => done(null));
dialog.querySelector('#invite-cancel').addEventListener('click', () => done(null));
dialog.querySelector('#invite-open').addEventListener('click', () => done({ minutes: INVITE_MINUTES, uses: 50 }));
dialog.querySelector('#invite-one').addEventListener('click', () => done({ minutes: INVITE_MINUTES, uses: 1 }));
dialog.showModal();
});
}
function groupNamed(name) {
const wanted = String(name || '').trim().toLowerCase();
if (!wanted) return null;
return groups().find((group) => String(group.name || '').trim().toLowerCase() === wanted) || null;
}
function leaveInvitation() {
if (location.hash.startsWith('#/join/')) {
location.replace(`${location.pathname}${location.search}#/groups`);
return;
}
navigate('#/groups');
}
let knocking = false;
function bindJoin() {
bindInAppWarning();
bindInvitationPaste(view.querySelector('#join-group'), view.querySelector('#join-code'));
view.querySelector('#join-copy-code')?.addEventListener('click', () => {
const invitation = route();
showCopyDialog({
title: t('join.toHomeScreen'),
hint: t('join.toHomeScreenStep3'),
text: `${invitation.group} · ${invitation.code}`,
});
});
const waitingLine = view.querySelector('#waiting-state');
if (waitingLine) {
const knock = pendingFor(route().group);
const look = async (button) => {
if (!knock) return;
if (button) button.disabled = true;
waitingLine.textContent = t('groups.checking');
const status = await checkPending(knock);
if (status === 'waiting') {
waitingLine.textContent = t('gate.stillWaiting');
if (button) button.disabled = false;
return;
}
if (status === null) {
waitingLine.textContent = t('groups.unsure');
if (button) button.disabled = false;
return;
}
leaveInvitation();
};
view.querySelector('#waiting-check')?.addEventListener('click', (event) => look(event.currentTarget));
view.querySelector('#waiting-drop')?.addEventListener('click', async () => {
if (!knock) return;
const sure = await ask(t('gate.confirmDropMine', { name: knock.groupName }),
{ confirmLabel: t('gate.dropMine'), danger: true });
if (!sure) return;
forgetPending(knock.ticket);
flash(t('gate.droppedMine', { name: knock.groupName }));
leaveInvitation();
});
return;
}
const form = view.querySelector('#join-form');
const line = view.querySelector('#join-state');
const say = (message) => {
line.textContent = message;
};
knocking = false;
form?.addEventListener('submit', async (event) => {
event.preventDefault();
if (knocking) return;
const button = form.querySelector('button[type="submit"]');
const me = view.querySelector('#join-me').value.trim();
const group = view.querySelector('#join-group').value.trim();
const code = readCode(view.querySelector('#join-code').value);
if (!me) return say(t('join.needMe'));
if (!group) return say(t('groups.needName'));
if (!code) return say(t('groups.needCode'));
if (!state.remote) return say(t('join.noDatabase'));
setMyName(me);
const held = groupNamed(group);
if (held) {
button.disabled = true;
say(t('groups.checking'));
let taken = 0;
try {
taken = await catchUpWith(held);
} catch {
button.disabled = false;
return say(t('groups.unsure'));
}
flash(taken
? t('join.alreadyCaughtUp', { name: held.name, count: taken })
: t('join.alreadyUpToDate', { name: held.name }));
leaveInvitation();
return;
}
button.disabled = true;
knocking = true;
say(t('groups.checking'));
let answer = { status: 'unknown' };
try {
answer = await knockAs(group, code, me);
} catch {
button.disabled = false;
knocking = false;
return say(t('groups.unsure'));
}
button.disabled = false;
knocking = false;
if (answer.status === 'busy') return say(t('gate.busy'));
if (answer.status === 'who') return say(t('roster.whoNeeded'));
if (answer.status !== 'waiting') return say(t('groups.codeRefused'));
rememberPending({
ticket: answer.ticket,
groupId: answer.id,
groupName: answer.name || group,
me: answer.me,
at: Date.now(),
});
render();
});
view.querySelector('#join-me')?.focus();
}
function showsGate() {
return ['overview', 'groups'].includes(route().name);
}
let lastGateLook = 0;
function watchGate() {
stopWatching();
if (!state.remote) return;
state.poll = setInterval(async () => {
if (isBusy() || isHidden() || !showsGate()) return;
if (liveCoversGroups() && Date.now() - lastGateLook < 60000) return;
lastGateLook = Date.now();
if (await refreshGate()) render();
}, 15000);
}
function watchPending() {
stopWatching();
if (!state.remote) return;
state.poll = setInterval(async () => {
if (isBusy() || isHidden()) return;
const knock = pendingFor(route().group);
if (!knock) return;
const status = await checkPending(knock);
if (status && status !== 'waiting') {
stopWatching();
leaveInvitation();
}
}, 5000);
}

// ---- src/view-people.js ----------------------------------------------
async function renameEverywhere(before) {
const after = await askForText({
title: t('stats.renameTitle'),
hint: t('stats.renameHint', { name: before }),
value: before,
confirmLabel: t('stats.rename'),
});
const clean = String(after || '').trim();
if (!clean || clean === before) return;
const key = sameName(before);
const { touched } = renameAcross(before, clean);
flash(touched ? t('stats.renamed', { name: clean, count: touched }) : t('stats.renamedNone'));
if (route().name === 'person' && sameName(route().who) === key) {
navigate(`#/person/${encodeURIComponent(clean)}`);
return;
}
render();
}
function renameAcross(before, after, only = () => true) {
const key = sameName(before);
let touched = 0;
let left = 0;
for (const game of state.games.filter(only)) {
const players = game.players.filter((player) => sameName(player.name) === key);
if (!players.length) continue;
if (game.players.some((player) => !players.includes(player) && sameName(player.name) === sameName(after))) {
left += 1;
continue;
}
let next = game;
for (const player of players) next = renamePlayer(next, player.id, after);
if (next === game) continue;
state.games = state.games.map((held) => (held.id === next.id ? next : held));
persist(next);
touched += 1;
}
const kinds = [
['lists', renameListPerson, persistList],
['polls', renamePollPerson, persistPoll],
['spends', renameSpendPerson, persistSpend],
];
for (const [kind, rename, keep] of kinds) {
for (const document_ of state[kind].filter(only)) {
const people = document_.people.filter((person) => sameName(person.name) === key);
if (!people.length) continue;
let next = document_;
for (const person of people) next = rename(next, person.id, after);
if (next === document_) {
if (people.some((person) => person.name !== after)) left += 1;
continue;
}
state[kind] = state[kind].map((held) => (held.id === next.id ? next : held));
keep(next);
touched += 1;
}
}
return { touched, left };
}
function personView(who) {
const file = personFile(state, who);
const head = (title, tail) => `
    <div class="spread page-head">
      ${backButtonHtml('#/')}
      ${title}
    </div>
    ${tail}`;
if (!file.known) {
return `
      ${flashHtml()}
      ${head(`<h1>${escapeHtml(file.name || who)}</h1>`, `<p class="muted small">${escapeHtml(t('person.none'))}</p>`)}`;
}
const inGroups = file.groupIds
.map((id) => groups().find((group) => group.id === id)?.name)
.filter(Boolean)
.sort((a, b) => a.localeCompare(b));
const waiting = waitingLine(file);
const tile = (value, label) => `
    <div class="tile">
      <span class="tile__value">${value}</span>
      <span class="tile__label">${escapeHtml(label)}</span>
    </div>`;
const entry = (goto, what, aside, value, tone) => `
    <button type="button" class="entry" data-goto="${goto}">
      <span class="entry__what">
        ${what}${aside ? ` <span class="muted small">${aside}</span>` : ''}
      </span>
      <span class="entry__value ${tone || ''}">${value}</span>
    </button>`;
const section = (title, entries) =>
entries.length
? `<section class="section card">
           <div class="section__head"><h2>${escapeHtml(title)}</h2></div>
           <div class="entries">${entries.join('')}</div>
         </section>`
: '';
return `
    ${flashHtml()}
    ${head(
`<div class="who">
         <span class="who__mark" aria-hidden="true">${escapeHtml([...file.name][0] || '?')}</span>
         <span>
           <h1>${escapeHtml(file.name)}</h1>
           ${inGroups.length ? `<span class="muted small">${escapeHtml(inGroups.join(' · '))}</span>` : ''}
         </span>
       </div>`,
waiting ? `<p class="banner">${escapeHtml(waiting)}</p>` : '',
)}

    <div class="tiles">
      ${tile(file.counts.games, t('person.statGames'))}
      ${tile(file.counts.wins, t('person.statWins'))}
      ${tile(file.counts.left, t('person.statLines'))}
      ${tile(file.counts.votes, t('person.statVotes'))}
    </div>

    ${section(
t('person.lists'),
file.lines.map((row) =>
entry(
`#/list/${escapeHtml(row.list.id)}`,
escapeHtml(listTitle(row.list)),
row.next ? escapeHtml(t(row.late ? 'lists.lateOn' : 'lists.dueOn', { day: formatDay(row.next) })) : '',
escapeHtml(t('person.assigned', { done: row.done, total: row.total })),
row.late ? 'entry__value--bad' : row.left ? '' : 'entry__value--good',
),
),
)}

    ${section(
t('person.votes'),
file.votes.map((row) =>
entry(
`#/poll/${escapeHtml(row.poll.id)}`,
escapeHtml(pollTitle(row.poll)),
row.closed ? escapeHtml(t('polls.closed')) : '',
escapeHtml(row.answered ? t('person.answered') : t('person.notAnswered')),
row.closed ? '' : row.answered ? 'entry__value--good' : 'entry__value--bad',
),
),
)}

    ${section(
t('person.spends'),
file.accounts.map((row) =>
entry(
`#/spend/${escapeHtml(row.spend.id)}`,
escapeHtml(spendTitle(row.spend)),
escapeHtml(t('spends.paidTotal', { amount: money(row.paid, row.spend) })),
escapeHtml(
row.balance === 0
? t('spends.even')
: t(row.balance > 0 ? 'spends.isOwed' : 'spends.owes', {
amount: money(Math.abs(row.balance), row.spend),
}),
),
row.balance > 0 ? 'entry__value--good' : row.balance < 0 ? 'entry__value--bad' : '',
),
),
)}

    ${section(
t('person.games'),
file.played
.slice(0, GAMES_SHOWN)
.map((row) =>
entry(
`#/game/${escapeHtml(row.game.id)}`,
escapeHtml(gameTitle(row.game)),
escapeHtml(formatDate(row.game.updatedAt)),
escapeHtml(
row.won
? t('person.won', { total: row.total })
: t('person.rank', { rank: row.rank, of: row.of, total: row.total }),
),
row.won ? 'entry__value--good' : '',
),
),
)}

    <div class="row">
      <button type="button" class="button button--small button--ghost"
              data-rename-everywhere="${escapeHtml(file.name)}">
        ${escapeHtml(t('stats.rename'))}
      </button>
    </div>

    <p class="notes">${escapeHtml(t('person.sameName'))}</p>`;
}
const GAMES_SHOWN = 8;
function statsView() {
const mine = shownDocs(state.games);
const played = presetsPlayed(mine);
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/games')}
      <h1>${escapeHtml(t('stats.title'))}</h1>
    </div>
    ${groupChipsHtml()}

    ${
played.length
? played
.map(({ presetId, played: count }) => {
const preset = getPreset(presetId);
const rows = statsFor(mine, presetId);
return `
                <section class="section card">
                  <div class="section__head">
                    <h2>${escapeHtml(preset ? presetLabel(preset) : presetId)}</h2>
                    <span class="muted small">${escapeHtml(t('stats.games', { count }))}</span>
                  </div>
                  <div class="table-wrap">
                    <table class="scores">
                      <thead>
                        <tr>
                          <th>${escapeHtml(t('new.players'))}</th>
                          <th>${escapeHtml(t('stats.played'))}</th>
                          <th>${escapeHtml(t('stats.won'))}</th>
                          <th>${escapeHtml(t('stats.average'))}</th>
                          <th>${escapeHtml(t('stats.best'))}</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${rows
.map(
(row) => `
                            <tr>
                              <td>
                                ${escapeHtml(row.name)}
                                <button type="button" class="button button--small button--ghost"
                                        data-rename-everywhere="${escapeHtml(row.name)}"
                                        title="${escapeHtml(t('stats.renameTitle'))}">✎</button>
                              </td>
                              <td>${row.played}</td>
                              <td>${row.won}</td>
                              <td>${row.average}</td>
                              <td>${row.best}</td>
                            </tr>`,
)
.join('')}
                      </tbody>
                    </table>
                  </div>
                </section>`;
})
.join('')
: `<p class="muted small">${escapeHtml(t('stats.empty'))}</p>`
}

    <p class="notes">${escapeHtml(t('stats.note'))}</p>`;
}

// ---- src/view-notify.js ----------------------------------------------
const TOLD = 'marque-points:told:v1';
const REMINDED = 'marque-points:reminded:v1';
function support() {
const served = Boolean(document.querySelector('link[rel="manifest"]'));
return pushSupport({
worker: served && 'serviceWorker' in navigator,
push: 'PushManager' in window,
notification: 'Notification' in window,
permission: 'Notification' in window ? Notification.permission : 'default',
phone: phoneToInstall(),
standalone: onHomeScreen(),
});
}
function isOn() {
return Boolean(state.prefs.push) && support() === 'ready' && Notification.permission === 'granted';
}
function appAddress() {
return `${location.origin}${location.pathname}`;
}
function timeZone() {
try {
return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
} catch {
return '';
}
}
async function worker() {
if (!('serviceWorker' in navigator)) return null;
return Promise.race([
navigator.serviceWorker.ready,
new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
]);
}
function stopAt(step, error) {
const stop = error instanceof Error ? error : new Error(String(error));
stop.step = stop.step || step;
throw stop;
}
async function subscribe(registration) {
const held = await registration.pushManager.getSubscription();
if (held) return held;
const answer = await state.remote.notifier({ action: 'key' }).catch((error) => stopAt('key', error));
if (!answer?.key) stopAt('key', Object.assign(new Error('no key'), { status: 200 }));
return registration.pushManager
.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(answer.key) })
.catch((error) => stopAt('subscribe', error));
}
async function register(subscription) {
const fields = subscriptionFields(subscription.toJSON());
if (!fields) stopAt('subscribe', new Error('no keys in the subscription'));
const said = [];
for (const group of groups()) {
said.push(await state.remote.pushSubscribe(group.key, fields, getLanguage(), appAddress(), timeZone()).catch((error) => error));
}
return said;
}
async function databaseAnswers() {
if (navigator.onLine === false) return false;
const [group] = groups();
if (!group) return false;
try {
await state.remote.groupOf(group.key);
return true;
} catch (error) {
return Boolean(error?.status);
}
}
async function turnOn() {
try {
const registration = await worker();
if (!registration) return { reason: activationProblem('worker'), detail: '' };
const said = await register(await subscribe(registration));
if (said.some((one) => one?.status === 'ok')) return null;
return { reason: activationProblem('register', said), detail: problemDetail(said[0]) };
} catch (error) {
const answers = error?.step === 'key' && !error.status ? await databaseAnswers() : true;
return { reason: activationProblem(error?.step, error, answers), detail: problemDetail(error) };
}
}
const PROBLEMS = {
worker: 'notify.worker',
offline: 'notify.offline',
function: 'notify.notReady',
database: 'notify.database',
denied: 'notify.denied',
browser: 'notify.browser',
account: 'notify.account',
refused: 'notify.kept',
failed: 'notify.failed',
};
function problemHtml() {
const problem = state.notifyProblem;
if (!problem) return '';
const reason = problem.reason === 'browser' && 'brave' in navigator ? 'notify.brave' : PROBLEMS[problem.reason];
return `
      <p class="banner banner--warn" id="notify-problem">${escapeHtml(t(reason || PROBLEMS.failed))}</p>
      ${problem.detail ? `<p class="muted small">${escapeHtml(t('notify.detail', { detail: problem.detail }))}</p>` : ''}`;
}
function notifyHtml() {
if (!state.remote) return '';
const can = support();
const on = isOn();
let body = '';
if (on) {
body = `
      <p class="small">${escapeHtml(t('notify.on'))}</p>
      <div class="row"><button type="button" class="button button--small button--ghost" id="notify-off">${escapeHtml(t('notify.disable'))}</button></div>`;
} else if (can === 'ready') {
body = groups().length
? `${problemHtml()}
      <div class="row"><button type="button" class="button button--small button--primary" id="notify-on">${escapeHtml(t('notify.enable'))}</button></div>`
: `<p class="muted small">${escapeHtml(t('notify.noGroup'))}</p>`;
} else {
body = `<p class="muted small">${escapeHtml(t(`notify.${can}`))}</p>`;
}
return `
    <section class="section" id="notify">
      <div class="section__head"><h2>${escapeHtml(t('notify.title'))}</h2></div>
      <p class="muted small">${escapeHtml(t('notify.why'))}</p>
      ${body}
    </section>`;
}
function bindNotify() {
view.querySelector('#notify-on')?.addEventListener('click', async (event) => {
event.currentTarget.disabled = true;
state.notifyProblem = null;
const permission = await Notification.requestPermission().catch(() => 'denied');
if (permission !== 'granted') {
flash(t('notify.refused'), 'error');
render();
return;
}
state.notifyProblem = await turnOn();
if (state.notifyProblem) {
render();
return;
}
state.prefs = { ...state.prefs, push: true };
savePrefs(state.prefs);
flash(t('notify.enabled'));
render();
});
view.querySelector('#notify-off')?.addEventListener('click', async (event) => {
event.currentTarget.disabled = true;
try {
const registration = await worker();
const held = await registration?.pushManager.getSubscription();
if (held) {
await state.remote.pushUnsubscribe(held.endpoint).catch(() => null);
await held.unsubscribe().catch(() => null);
}
} catch {
}
state.prefs = { ...state.prefs, push: false };
savePrefs(state.prefs);
flash(t('notify.disabled'));
render();
});
}
async function syncPush() {
if (!state.remote || !isOn()) return;
try {
const registration = await worker();
if (registration) await register(await subscribe(registration));
} catch {
}
askReminders();
}
function askReminders() {
let last = 0;
try {
last = Number(localStorage.getItem(REMINDED)) || 0;
} catch {
}
if (!mayAskReminders(last)) return;
try {
localStorage.setItem(REMINDED, String(Date.now()));
} catch {
}
state.remote.notifier({ action: 'remind' }).catch(() => null);
}
function told() {
try {
const list = JSON.parse(localStorage.getItem(TOLD) || '[]');
return Array.isArray(list) ? list.filter((one) => typeof one === 'string') : [];
} catch {
return [];
}
}
async function tell(document_, key) {
if (!state.remote || !key || !mayBeNews(document_)) return;
await tellOnce(toldKey(document_), { action: 'doc', key, id: document_.id });
const words = wordsKey(document_);
if (words) await tellOnce(words, { action: 'words', key, id: document_.id });
}
async function tellOnce(said, body) {
if (told().includes(said)) return;
try {
await state.remote.notifier(body);
} catch (error) {
if (!error?.status) return;
}
try {
localStorage.setItem(TOLD, JSON.stringify(rememberTold(told(), said)));
} catch {
}
}
function tellKnock(ticket) {
if (!state.remote || !ticket) return;
state.remote.notifier({ action: 'knock', ticket }).catch(() => null);
}

// ---- src/view-search.js ----------------------------------------------
const SEARCH_KINDS = ['event', 'list', 'poll', 'spend', 'board', 'game'];
function searchHash(words) {
const clean = String(words || '').trim();
return clean ? `#/search/${encodeURIComponent(clean)}` : '#/search';
}
function markedHtml(text, marks) {
let html = '';
let at = 0;
for (const [start, end] of marks) {
html += `${escapeHtml(text.slice(at, start))}<mark>${escapeHtml(text.slice(start, end))}</mark>`;
at = end;
}
return html + escapeHtml(text.slice(at));
}
function foundHtml(hit) {
const group = groups().find((one) => one.id === hit.document.groupId);
return `
    <button type="button" class="entry search-hit" data-search-goto="${escapeHtml(documentHref(hit.document))}">
      <span class="entry__what">
        <strong>${markedHtml(hit.title, hit.marks)}</strong>
        ${group ? `<span class="muted small"> · ${escapeHtml(group.name)}</span>` : ''}
        ${hit.parts.map((part) => `<span class="search-hit__part">${markedHtml(part.text, part.marks)}</span>`).join('')}
        ${hit.more ? `<span class="muted small search-hit__part">${escapeHtml(t('search.more', { count: hit.more }))}</span>` : ''}
      </span>
    </button>`;
}
function resultsHtml(words) {
if (!String(words || '').trim()) return `<p class="muted small">${escapeHtml(t('search.hint'))}</p>`;
const everywhere = searchDocuments(everything(), words, { titleOf: documentTitle });
const found = shownDocs(everywhere.map((hit) => hit.document));
const shown = everywhere.filter((hit) => found.includes(hit.document));
const hidden = everywhere.length > shown.length
? `<p class="muted small">
         ${escapeHtml(t('search.hidden', { count: everywhere.length - shown.length }))}
         <button type="button" class="button button--small button--ghost" data-search-everywhere>${escapeHtml(t('filter.all'))}</button>
       </p>`
: '';
if (!shown.length) {
return `<p class="muted">${escapeHtml(t('search.none', { words: String(words).trim() }))}</p>${hidden}`;
}
const kindOfHit = (hit) => (isEventDoc(hit.document) ? 'event' : kindOf(hit.document));
const sections = SEARCH_KINDS.map((kind) => {
const hits = shown.filter((hit) => kindOfHit(hit) === kind);
if (!hits.length) return '';
return `
      <section class="section card">
        <div class="section__head"><h2>${escapeHtml(t(`chain.kind.${kind}`))} · ${hits.length}</h2></div>
        <div class="entries">${hits.map(foundHtml).join('')}</div>
      </section>`;
});
return `<p class="muted small">${escapeHtml(t('search.count', { count: shown.length }))}</p>${sections.join('')}${hidden}`;
}
function searchView(words) {
return `
    ${flashHtml()}
    <div class="spread page-head">
      ${backButtonHtml('#/')}
      <h1>${escapeHtml(t('search.title'))}</h1>
    </div>
    <input type="search" id="search-words" class="field-pill" value="${escapeHtml(words)}" autocomplete="off"
           enterkeyhint="search" placeholder="${escapeHtml(t('search.placeholder'))}"
           aria-label="${escapeHtml(t('search.field'))}" />
    ${groupChipsHtml()}
    <div id="search-results" aria-live="polite">${resultsHtml(words)}</div>`;
}
function bindSearch(words) {
const field = document.getElementById('search-words');
const results = document.getElementById('search-results');
if (!field || !results) return;
field.focus();
field.setSelectionRange(field.value.length, field.value.length);
let shown = words;
field.addEventListener('input', () => {
if (field.value === shown) return;
shown = field.value;
rewriteHere(searchHash(shown));
results.innerHTML = resultsHtml(shown);
});
field.addEventListener('keydown', (event) => {
if (event.key === 'Enter') field.blur();
});
results.addEventListener('click', (event) => {
const hit = event.target.closest('[data-search-goto]');
if (hit) {
navigate(hit.dataset.searchGoto);
return;
}
if (event.target.closest('[data-search-everywhere]')) {
setGroupFilter('');
render();
}
});
}

// ---- src/view-reacts.js ----------------------------------------------
const WORDS_SHOWN = 2;
function talkHtml(document_, target, { title = '', said = false } = {}) {
const me = myNameFor(document_);
const rows = reactionsTo(document_, target, me);
const words = wordsOn(document_, target, me);
const chips = rows.map((row) => `
    <button type="button" class="talk__chip ${row.mine ? 'talk__chip--mine' : ''}" data-talk-react="${escapeHtml(row.emoji)}"
            aria-pressed="${row.mine ? 'true' : 'false'}" title="${escapeHtml(row.names.join(', '))}"
            aria-label="${escapeHtml(t('talk.chip', { emoji: row.emoji, names: row.names.join(', ') }))}">
      <span aria-hidden="true">${escapeHtml(row.emoji)} ${row.names.length}</span>
    </button>`).join('');
const open = words.length
? `💬 ${words.length}`
: `<span aria-hidden="true">☺+</span>`;
return `
    <div class="talk" data-talk="${escapeHtml(target)}" data-talk-doc="${escapeHtml(document_.id)}" data-talk-title="${escapeHtml(title)}">
      ${chips}
      <button type="button" class="talk__open" data-talk-open
              aria-label="${escapeHtml(words.length ? t('talk.openWords', { count: words.length }) : t('talk.open'))}">${open}</button>
    </div>
    ${said && words.length ? `
      <div class="talk__said">
        ${words.slice(-WORDS_SHOWN).map((one) => `<p><strong>${escapeHtml(one.name)}</strong> ${escapeHtml(one.text)}</p>`).join('')}
      </div>` : ''}`;
}
function talkSumHtml(document_) {
const { reactions, words } = talkTotals(document_);
if (!reactions.length && !words) return '';
const said = [...reactions.map((one) => `${one.emoji} ${one.count}`), ...(words ? [`💬 ${words}`] : [])].join(' · ');
const count = reactions.reduce((sum, one) => sum + one.count, 0);
return `<span class="game-card__meta talk-sum" aria-label="${escapeHtml(t('talk.sum', { count, words }))}">${escapeHtml(said)}</span>`;
}
function talkDocument(id) {
return everything().find((one) => one.id === id) || null;
}
function keepTalk(next) {
if (next.kind === 'board') replaceBoard(next);
else if (next.kind === 'poll') replacePoll(next);
}
async function talkName(document_) {
if (rosterFor(document_).length) return myNameFor(document_) || askWhoIn(document_.groupId);
const held = myName();
if (held) return held;
const name = await askForText({
title: t('talk.whoTitle'),
hint: t('talk.whoHint'),
confirmLabel: t('action.save'),
});
return name && name.trim() ? setMyName(name) : '';
}
async function reactTo(id, target, emoji) {
const name = await talkName(talkDocument(id));
const current = talkDocument(id);
if (!name || !current) return;
keepTalk(react(current, target, name, emoji));
}
function openTalk(id, target, title) {
const dialog = makeDialog('dialog dialog--talk');
const fill = () => {
const current = talkDocument(id);
if (!current) {
dialog.close();
return;
}
const me = myNameFor(current);
const mine = myReaction(current, target, me);
const rows = reactionsTo(current, target, me);
const words = wordsOn(current, target, me);
const typed = dialog.querySelector('[data-talk-text]')?.value || '';
dialog.innerHTML = `
      <form method="dialog" class="stack">
        <h2>${escapeHtml(title || t('talk.title'))}</h2>
        <div class="talk-pick" role="group" aria-label="${escapeHtml(t('talk.pick'))}">
          ${REACTIONS.map((emoji) => `
            <button type="button" class="talk-pick__one ${emoji === mine ? 'talk-pick__one--on' : ''}" data-talk-pick="${escapeHtml(emoji)}"
                    aria-pressed="${emoji === mine ? 'true' : 'false'}">${escapeHtml(emoji)}</button>`).join('')}
        </div>
        ${rows.length ? `<p class="muted small">${rows.map((row) => `${escapeHtml(row.emoji)} ${escapeHtml(row.names.join(', '))}`).join(' · ')}</p>` : ''}
        <div class="talk-words">
          ${words.length
? words.map((one) => `
                <p class="talk-word">
                  <span><strong>${escapeHtml(one.name)}</strong> ${escapeHtml(one.text)}</span>
                  ${one.mine ? `<button type="button" class="button button--small button--ghost" data-talk-drop="${escapeHtml(one.id)}"
                                        aria-label="${escapeHtml(t('talk.drop'))}">✕</button>` : ''}
                </p>`).join('')
: `<p class="muted small">${escapeHtml(t('talk.none'))}</p>`}
        </div>
        <label>
          ${escapeHtml(t('talk.wordsLabel'))}
          <textarea data-talk-text rows="2" maxlength="${WORDS_MOST}" placeholder="${escapeHtml(t('talk.placeholder'))}"></textarea>
        </label>
        <div class="row">
          <button type="button" class="button button--primary" data-talk-send>${escapeHtml(t('talk.send'))}</button>
          <button type="button" class="button" data-talk-close>${escapeHtml(t('action.close'))}</button>
        </div>
      </form>`;
const field = dialog.querySelector('[data-talk-text]');
field.value = typed;
dialog.querySelectorAll('[data-talk-pick]').forEach((button) => {
button.addEventListener('click', async () => {
await reactTo(id, target, button.dataset.talkPick);
fill();
});
});
dialog.querySelectorAll('[data-talk-drop]').forEach((button) => {
button.addEventListener('click', () => {
const now = talkDocument(id);
if (now) keepTalk(removeWords(now, button.dataset.talkDrop));
fill();
});
});
dialog.querySelector('[data-talk-send]').addEventListener('click', async () => {
const text = field.value.trim();
if (!text) {
field.focus();
return;
}
const name = await talkName(talkDocument(id));
const now = talkDocument(id);
if (!name || !now) return;
keepTalk(addWords(now, target, name, text));
field.value = '';
fill();
});
dialog.querySelector('[data-talk-close]').addEventListener('click', () => dialog.close());
};
fill();
dialog.showModal();
}
function bindTalk(root) {
root.querySelectorAll('[data-talk]').forEach((row) => {
const id = row.dataset.talkDoc;
const target = row.dataset.talk;
row.querySelectorAll('[data-talk-react]').forEach((chip) => {
chip.addEventListener('click', () => reactTo(id, target, chip.dataset.talkReact));
});
row.querySelector('[data-talk-open]')?.addEventListener('click', () => openTalk(id, target, row.dataset.talkTitle));
});
}

// ---- src/view-arcade.js ----------------------------------------------
const ARCADE_ICONS = {
glouton: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12 20.2 7.3A9.5 9.5 0 1 0 20.2 16.7z"/></svg>',
snake: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 16.5c2.6 0 2.6-7 5.2-7s2.6 7 5.2 7 2.6-7 5.2-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="19.6" cy="9.5" r="2.6"/></svg>',
};
function modeOf(id) {
return arcadeMode(state.prefs?.arcadeMode?.[id]);
}
function recordKey(id, mode) {
return mode === 'normal' ? id : `${id}:${mode}`;
}
function bestOf(id, mode = modeOf(id)) {
return Number(state.prefs?.arcade?.[recordKey(id, mode)]) || 0;
}
function keepBest(id, mode, score) {
if (score <= bestOf(id, mode)) return false;
state.prefs.arcade = { ...(state.prefs.arcade || {}), [recordKey(id, mode)]: score };
savePrefs(state.prefs);
return true;
}
const rankings = new Map();
const rankingAsked = new Map();
const RANKING_FRESH_MS = 20000;
const RANKING_SIZE = 5;
let rankingKnown = false;
function rankingKey(groupId, id, mode) {
return `${groupId}|${id}|${mode}`;
}
function rankingGroup() {
const held = groups();
const filtered = groupFilter();
return held.find((group) => group.id === filtered)
|| held.find((group) => group.id === state.prefs.arcadeGroup) || held[0] || null;
}
function rankingMode() {
return arcadeMode(state.prefs?.arcadeRankMode);
}
async function sendScore(id, mode, score) {
if (!state.remote || !(score > 0)) return;
await Promise.all(groups().map(async (group) => {
const name = myNameIn(group.id);
if (!name) return;
try {
const top = await state.remote.arcadeScore(group.key, id, mode, name, score);
if (!top) return;
rankings.set(rankingKey(group.id, id, mode), top);
rankingKnown = true;
} catch {
}
}));
}
function rankingInner() {
const group = rankingGroup();
if (!group) return '';
const mode = rankingMode();
const me = myNameIn(group.id);
const held = groups();
const filtered = held.some((one) => one.id === groupFilter());
const chips = held.length > 1 && !filtered ? `
    <div class="row" role="group" aria-label="${escapeHtml(t('arcade.ranking.groups'))}">
      ${held.map((one) => `
        <button type="button" class="chip${one.id === group.id ? ' chip--on' : ''}" data-arcade-group="${escapeHtml(one.id)}"
                aria-pressed="${one.id === group.id}">${escapeHtml(one.name || '')}</button>`).join('')}
    </div>` : '';
const modes = `
    <div class="segmented arcade__modes" role="group" aria-label="${escapeHtml(t('arcade.mode'))}">
      ${ARCADE_MODES.map((option) => `
        <button type="button" class="segmented__option" data-arcade-rank-mode="${option}"
                aria-pressed="${option === mode}">${escapeHtml(t(`arcade.mode.${option}`))}</button>`).join('')}
    </div>`;
const line = (entry, index) => {
const mine = me && entry.name.toLowerCase() === me.toLowerCase();
return `
      <li class="arcade-ranking__line${mine ? ' arcade-ranking__line--me' : ''}">
        <span class="arcade-ranking__rank">${index + 1}</span>
        <span class="arcade-ranking__name">${escapeHtml(entry.name)}</span>
        <strong class="arcade-ranking__score">${escapeHtml(String(entry.score))}</strong>
      </li>`;
};
const game = ({ id }) => {
const top = (rankings.get(rankingKey(group.id, id, mode)) || []).slice(0, RANKING_SIZE);
return `
      <div class="arcade-ranking__game" data-arcade-ranking="${escapeHtml(id)}">
        <h3><span class="arcade-ranking__icon arcade-card__icon--${escapeHtml(id)}" aria-hidden="true">${ARCADE_ICONS[id] || ''}</span>${escapeHtml(t(`arcade.${id}.name`))}</h3>
        ${top.length
? `<ol class="arcade-ranking__list">${top.map(line).join('')}</ol>`
: `<p class="muted small">${escapeHtml(t('arcade.ranking.none'))}</p>`}
      </div>`;
};
return `
    <div class="section__head"><h2>${escapeHtml(t('arcade.ranking', { group: group.name || '' }))}</h2></div>
    ${chips}
    ${modes}
    <div class="arcade-ranking__games">${ARCADE_GAMES.map(game).join('')}</div>
    <p class="muted small">${escapeHtml(t(me ? 'arcade.ranking.how' : 'arcade.ranking.who'))}</p>`;
}
function rankingHtml() {
if (!state.remote || !rankingGroup()) return '';
return `<section class="section arcade-ranking" id="arcade-ranking"${rankingKnown ? '' : ' hidden'}>${rankingKnown ? rankingInner() : ''}</section>`;
}
function drawRanking() {
const box = document.getElementById('arcade-ranking');
if (!box) return;
box.hidden = !rankingKnown;
if (!rankingKnown) return;
box.innerHTML = rankingInner();
box.querySelectorAll('[data-arcade-group]').forEach((button) => {
button.addEventListener('click', () => {
state.prefs.arcadeGroup = button.dataset.arcadeGroup;
savePrefs(state.prefs);
drawRanking();
void askRanking();
});
});
box.querySelectorAll('[data-arcade-rank-mode]').forEach((button) => {
button.addEventListener('click', () => {
state.prefs.arcadeRankMode = arcadeMode(button.dataset.arcadeRankMode);
savePrefs(state.prefs);
drawRanking();
void askRanking();
});
});
}
async function askRanking(force = false) {
const group = state.remote ? rankingGroup() : null;
if (!group) return;
const mode = rankingMode();
const now = Date.now();
const due = ARCADE_GAMES.filter(({ id }) => force || !(now - (rankingAsked.get(rankingKey(group.id, id, mode)) || 0) < RANKING_FRESH_MS));
if (!due.length) return;
let answered = false;
await Promise.all(due.map(async ({ id }) => {
const key = rankingKey(group.id, id, mode);
rankingAsked.set(key, now);
try {
rankings.set(key, await state.remote.arcadeTop(group.key, id, mode));
answered = true;
} catch {
rankingAsked.delete(key);
}
}));
if (answered) rankingKnown = true;
drawRanking();
}
let recordsSent = false;
function bindArcadeRanking() {
if (!document.getElementById('arcade-ranking')) return;
drawRanking();
if (!recordsSent && state.remote) {
recordsSent = true;
const sends = [];
for (const { id } of ARCADE_GAMES) {
for (const mode of ARCADE_MODES) sends.push(sendScore(id, mode, bestOf(id, mode)));
}
void Promise.all(sends).then(() => askRanking(true));
return;
}
void askRanking();
}
function arcadeHtml() {
const card = (game) => {
const best = bestOf(game.id);
return `
      <button type="button" class="arcade-card" data-goto="#/arcade/${escapeHtml(game.id)}">
        <span class="arcade-card__icon arcade-card__icon--${escapeHtml(game.id)}" aria-hidden="true">${ARCADE_ICONS[game.id] || ''}</span>
        <span class="arcade-card__text">
          <strong>${escapeHtml(t(`arcade.${game.id}.name`))}</strong>
          <span class="muted small">${escapeHtml(best ? t('arcade.best', { score: best }) : t(`arcade.${game.id}.short`))}</span>
        </span>
        <span class="arcade-card__play">${escapeHtml(t('arcade.play'))}</span>
      </button>`;
};
return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('arcade.title'))}</h2></div>
      <div class="arcade-list">${ARCADE_GAMES.map(card).join('')}</div>
    </section>
    ${rankingHtml()}`;
}

// ---- src/app.js ------------------------------------------------------
const view = document.getElementById('view');
const arrival = (() => {
try {
return takeMove({ location, history, storage: localStorage, aside: sessionStorage, referrer: document.referrer });
} catch {
return null;
}
})();
const state = {
games: loadGames(),
lists: loadLists(),
polls: loadPolls(),
spends: loadSpends(),
boards: loadBoards(),
prefs: loadPrefs(),
flash: null, 
editingRoundId: null,
search: '',
newPresetId: null,
newConfig: null,
newName: '',
store: null,
remote: createRemote(remoteConfig()),
poll: null,
live: null,
notifyProblem: null,
openingSet: null,
openingList: null,
openingPoll: null,
openingSpend: null,
openingBoard: null,
listFilter: null,
trail: [],
touched: null,
newListName: '',
newListPeople: ['', ''],
newListLines: '',
newBoardName: '',
newSpendName: '',
newSpendCurrency: 'EUR',
spendFormOpen: null,
newSpendPeople: ['', ''],
spendTabId: null,
spendTab: 'expenses',
newEventName: '',
newEventDay: '',
newEventHour: '',
newEventUntil: '',
newEventPeople: ['', ''],
newPollQuestion: '',
newPollChoices: '',
newPollDays: [],
newPollAt: '',
newPollOnDay: '',
newPollPeople: ['', ''],
newGameNames: ['', '', ''],
newGameTouched: false,
newGroupChoice: { touched: false, id: null },
newEventLink: null,
deal: null,
};
function escapeHtml(value) {
return String(value ?? '').replace(/[&<>"']/g, (char) =>
({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]),
);
}
function parseScore(raw) {
const value = String(raw ?? '').trim().replace(',', '.');
if (value === '') return null;
const number = Number(value);
return Number.isNaN(number) ? NaN : number;
}
function parseIntOrNull(raw) {
const value = String(raw ?? '').trim();
if (value === '') return null;
const number = Number(value);
return Number.isFinite(number) ? Math.trunc(number) : null;
}
function presetLabel(preset) {
return preset.labelKey ? t(preset.labelKey) : preset.name;
}
function gameTitle(game) {
if (game.name) return game.name;
const preset = getPreset(game.presetId);
return preset ? presetLabel(preset) : t('new.customLabel');
}
function documentTitle(document_) {
if (isValidList(document_)) return listTitle(document_);
if (isValidPoll(document_)) return pollTitle(document_);
if (isValidBoard(document_)) return boardTitle(document_);
if (isValidSpend(document_)) return spendTitle(document_);
return gameTitle(document_);
}
function documentHref(document_) {
const page = { list: 'list', poll: 'poll', spend: 'spend', board: 'idea', game: 'game' }[kindOf(document_)] || 'game';
return `#/${page}/${document_.id}`;
}
function everything() {
return allDocuments(state);
}
function chainOf(document_) {
return ancestorsOf(document_, everything());
}
function chainLabel(document_) {
const title = isEventDoc(document_) ? eventName(document_) || pollTitle(document_) : documentTitle(document_);
return isEventDoc(document_) && document_.date ? t('event.named', { name: title, day: formatDay(document_.date) }) : title;
}
function formatDay(day) {
const [year, month, date] = String(day || '').split('-').map(Number);
if (!year || !month || !date) return String(day || '');
try {
return new Date(year, month - 1, date).toLocaleDateString(getLanguage(), {
day: 'numeric',
month: 'short',
});
} catch {
return String(day);
}
}
function whenText(poll, { long = false } = {}) {
const show = long ? formatDayLong : formatDay;
const days = poll.until && poll.until > poll.date
? t('events.range', { from: show(poll.date), to: show(poll.until) })
: show(poll.date);
return [days, poll.at].filter(Boolean).join(' · ');
}
function formatDayLong(day) {
const [year, month, date] = String(day || '').split('-').map(Number);
if (!year || !month || !date) return String(day || '');
try {
return new Date(year, month - 1, date).toLocaleDateString(getLanguage(), {
weekday: 'short',
day: 'numeric',
month: 'short',
});
} catch {
return formatDay(day);
}
}
function formatDate(timestamp) {
try {
return new Date(timestamp).toLocaleDateString(getLanguage(), {
day: 'numeric',
month: 'short',
year: 'numeric',
});
} catch {
return '';
}
}
function appLink() {
const { origin, pathname, search } = location;
return `${origin}${pathname}${search}`;
}
function flash(message, kind = 'info') {
state.flash = { message, kind, shownAt: null };
}
async function welcomeMove(arrival) {
if (arrival?.status === 'moved') {
const dialog = makeDialog();
dialog.innerHTML = `
      <div class="stack" id="move-welcome">
        <h2>${escapeHtml(t('move.title'))}</h2>
        <p>${escapeHtml(t('move.done', { groups: arrival.groups, documents: arrival.documents }))}</p>
        <p class="muted small">${escapeHtml(t('move.homeScreen'))}</p>
        <div class="row"><button type="button" class="button button--primary" data-move-ok>${escapeHtml(t('action.close'))}</button></div>
      </div>`;
dialog.querySelector('[data-move-ok]').addEventListener('click', () => dialog.close());
dialog.showModal();
return;
}
if (arrival?.status === 'failed') {
flash(t('move.failed'), 'error');
render();
return;
}
if (arrival?.status !== 'asking') return;
let came = null;
try {
came = JSON.parse(sessionStorage.getItem('marque-points:arriving'));
sessionStorage.removeItem('marque-points:arriving');
} catch {
came = null;
}
if (!came) return;
const taken = await ask(t('move.ask', { groups: arrival.groups, documents: arrival.documents }), { confirmLabel: t('move.take') });
if (!taken) return;
try {
moveInto(localStorage, came);
} catch {
flash(t('move.failed'), 'error');
render();
return;
}
location.reload();
}
const FLASH_KEPT = 4000;
function route() {
return routeOf(location.hash);
}
function routeOf(address) {
const hash = withoutPrefill(address).replace(/^#\/?/, '');
const [name, param] = hash.split('/');
if (name === 'games') return { name: 'home' };
if (name === 'back' && param) return { name: 'back', token: backTokenFrom(address) };
if (name === 'join' && param) {
const invitation = joinFrom(address);
if (invitation) return { name: 'join', code: invitation.code, group: invitation.name };
return { name: 'join', code: readCode(param), group: groupSegment(hash) };
}
if ((name === 'person' || name === 'personne') && param) {
return { name: 'person', who: personFrom(param) };
}
if (name === 'group' && param) return { name: 'group', id: decodeSegment(param) };
if (name === 'groups') return { name: 'groups' };
if (name === 'settings' || name === 'reglages') return { name: 'settings' };
if (name === 'privacy' || name === 'confidentialite') return { name: 'privacy' };
if (name === 'search' || name === 'recherche') return { name: 'search', words: param ? decodeSegment(param) : '' };
if (name === 'new') return { name: 'new' };
if (name === 'stats') return { name: 'stats' };
if (name === 'game' && param) return { name: 'game', id: param };
if (name === 'arcade' && param) return { name: 'arcade', id: param };
if (name === 'set' && param) return { name: 'set', id: param };
if (name === 'lists' && param === 'new') return { name: 'new-list' };
if (name === 'lists') return { name: 'lists' };
if (name === 'list' && param) return { name: 'list', id: param };
if (name === 'spends' && param === 'new') return { name: 'new-spend' };
if (name === 'spends') return { name: 'spends' };
if (name === 'agenda' && param === 'new') return { name: 'new-event' };
if (name === 'agenda') return { name: 'agenda' };
if (name === 'spend' && param) return { name: 'spend', id: param };
if (name === 'ideas' && param === 'new') return { name: 'new-board' };
if (name === 'ideas') return { name: 'ideas' };
if (name === 'idea' && param) return { name: 'board', id: param };
if (name === 'polls' && param === 'new') return { name: 'new-poll' };
if (name === 'polls') return { name: 'polls' };
if (name === 'poll' && param) return { name: 'poll', id: param, solo: hash.split('/')[2] === 'solo' };
return { name: 'overview' };
}
function pollHome(poll) {
return isEvent(poll) || poll.date || (!poll.closedAt && seeksDay(poll)) ? '#/agenda' : '#/polls';
}
function decodeSegment(segment) {
try {
return decodeURIComponent(segment);
} catch {
return segment;
}
}
function personFrom(segment) {
try {
return decodeURIComponent(segment).trim();
} catch {
return String(segment).trim();
}
}
function groupSegment(hash) {
const segment = hash.split('/')[2] || '';
try {
return decodeURIComponent(segment).trim();
} catch {
return segment.trim();
}
}
function navigate(hash) {
if (location.hash === hash) render();
else location.hash = hash;
}
function rewriteHere(hash) {
const before = hereHash();
history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
state.trail = state.trail.map((one) => (one === before ? hash : one));
}
function hereHash() {
return location.hash && location.hash !== '#' ? location.hash : '#/';
}
function followTrail() {
const here = hereHash();
const trail = state.trail;
if (trail[trail.length - 1] === here) return;
if (trail[trail.length - 2] === here) state.trail = trail.slice(0, -1);
else state.trail = [...trail.filter((hash) => hash !== here), here].slice(-50);
}
function backTarget(fallback) {
const here = hereHash();
for (let index = state.trail.length - 1; index >= 0; index -= 1) {
const hash = state.trail[index];
if (hash === here || /^#\/(lists|polls|spends|agenda|ideas)\/new$|^#\/new$/.test(hash)) continue;
return hash;
}
return fallback;
}
function announce(message) {
const out = document.getElementById('announce');
if (!out) return;
out.textContent = '';
setTimeout(() => { out.textContent = message; }, 60);
}
function flashHtml() {
if (!state.flash) return '';
const { message, kind, shownAt } = state.flash;
if (!shownAt) {
state.flash = { ...state.flash, shownAt: Date.now() };
state.flashFresh = kind === 'error';
announce(message);
} else if (Date.now() - shownAt > FLASH_KEPT) {
state.flash = null;
return '';
}
return `<p class="banner ${kind === 'error' ? 'banner--warn' : ''}">${escapeHtml(message)}</p>`;
}
function newButtonHtml(target, label, quiet) {
return `<button type="button" class="button ${quiet ? 'button--small button--new' : 'button--primary button--block'}" data-goto="${escapeHtml(target)}">
      + ${escapeHtml(label)}
    </button>`;
}
const FACE_COLOURS = ['red', 'orange', 'amber', 'green', 'cyan', 'blue', 'violet', 'pink'];
function faceColour(name) {
let hash = 0;
for (const char of name.trim().toLowerCase()) hash = (hash * 31 + char.codePointAt(0)) % 1000003;
return FACE_COLOURS[hash % FACE_COLOURS.length];
}
function peopleHtml(names) {
const named = names.map((name) => String(name || '').trim()).filter(Boolean);
if (!named.length) return '';
const shown = named.slice(0, 4);
const faces = shown
.map((name) => `<i class="face" style="--face: var(--night-${faceColour(name)})" data-initial="${escapeHtml(Array.from(name)[0].toUpperCase())}"></i>`)
.join('');
const more = named.length > shown.length ? `<i class="face face--more" data-initial="+${named.length - shown.length}"></i>` : '';
return `
    <span class="game-card__meta people">
      <span class="faces" aria-hidden="true">${faces}${more}</span>
      <span>${escapeHtml(named.join(' · '))}</span>
    </span>`;
}
const HINT_ART = {
lists: '<rect x="14" y="10" width="36" height="46" rx="6"/><path d="M21 23l3 3 6-6M21 35l3 3 6-6M34 24h9M34 36h9M21 47h22"/>',
polls: '<rect x="10" y="14" width="44" height="40" rx="6"/><path d="M10 25h44M22 9v9M42 9v9M24 39l6 6 11-12"/>',
games: '<g transform="rotate(-8 32 32)"><rect x="14" y="14" width="36" height="36" rx="8"/>'
+ '<g class="hint__fill"><circle cx="24" cy="24" r="2.6"/><circle cx="40" cy="24" r="2.6"/><circle cx="32" cy="32" r="2.6"/>'
+ '<circle cx="24" cy="40" r="2.6"/><circle cx="40" cy="40" r="2.6"/></g></g>',
spends: '<path d="M18 8h28v48l-4.7-3.5-4.6 3.5-4.7-3.5-4.7 3.5-4.6-3.5L18 56z"/><path d="M25 20h14M25 29h14M25 38h8"/>',
ideas: '<path d="M24 40c-4-3.2-7-7.6-7-13a15 15 0 0 1 30 0c0 5.4-3 9.8-7 13v5H24z"/>'
+ '<path d="M25 51h14M28 56h8M32 4v3M9 27H6M58 27h-3M15 11l2 2M49 11l-2 2"/>',
agenda: '<rect x="10" y="14" width="44" height="40" rx="6"/><path d="M10 25h44M22 9v9M42 9v9"/>'
+ '<path d="M32 31l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>',
};
function hintHtml(art, text) {
return `
    <div class="hint">
      <svg class="hint__art" viewBox="0 0 64 64" aria-hidden="true">${HINT_ART[art] || HINT_ART.lists}</svg>
      <p class="hint__text">${escapeHtml(text)}</p>
    </div>`;
}
function backButtonHtml(target) {
const label = escapeHtml(t('action.back'));
return `<button type="button" class="back-button" data-goto="${escapeHtml(target)}" data-back aria-label="${label}" title="${label}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>
  </button>`;
}
function groupChipsHtml() {
const held = groupsByName();
const everything = [...state.lists, ...state.polls, ...state.games, ...state.spends, ...state.boards];
const outside = everything.some(outsideGroups);
if (!held.length || (held.length < 2 && !outside)) return '';
const active = groupFilter();
const counted = active === OUTSIDE_GROUPS
? groupCounts({
lists: shownDocs(state.lists), polls: shownDocs(state.polls),
games: shownDocs(state.games), spends: shownDocs(state.spends), boards: shownDocs(state.boards),
})
: groupCounts(state, active);
const chip = (id, label) => `
    <button type="button" class="chip ${active === id ? 'chip--on' : ''}"
            data-group-filter="${escapeHtml(id)}" aria-pressed="${active === id ? 'true' : 'false'}">
      ${escapeHtml(label)}
    </button>`;
return `
    <div class="row" role="group" aria-label="${escapeHtml(t('filter.by'))}">
      ${chip('', t('filter.all'))}
      ${held.map((group) => chip(group.id, group.name)).join('')}
      ${outside || active === OUTSIDE_GROUPS ? chip(OUTSIDE_GROUPS, t('filter.others')) : ''}
    </div>
    <p class="muted small">${escapeHtml(countsText(counted))}</p>`;
}
function countsText(counts) {
const said = ['lists', 'polls', 'games', 'spends', 'boards']
.filter((kind) => counts[kind])
.map((kind) => t(`count.${kind}`, { count: counts[kind] }));
return said.length ? said.join(' · ') : t('count.none');
}
function gameCardHtml(game) {
const status = gameStatus(game);
const names = status.finished
? status.winners.map((row) => row.name)
: status.leaders.map((row) => row.name);
let line = '';
if (game.rounds.length && names.length) {
const key = status.finished
? names.length > 1 ? 'home.winners' : 'home.winner'
: 'home.leader';
line = t(key, { name: names.join(', ') });
}
return `
    <button type="button" class="game-card" data-goto="#/game/${escapeHtml(game.id)}">
      <span class="game-card__title">
        ${escapeHtml(gameTitle(game))}
        <span class="pill ${status.finished ? 'pill--done' : ''}">
          ${status.finished ? escapeHtml(t('game.finished')) : escapeHtml(t('home.rounds', { count: game.rounds.length }))}
        </span>
      </span>
      ${peopleHtml(game.players.map((p) => p.name))}
      <span class="game-card__meta">${escapeHtml(formatDate(game.updatedAt))}${line ? ` — ${escapeHtml(line)}` : ''}</span>
      ${eventTagHtml(game)}
    </button>`;
}
function forEventText(document_) {
const chain = document_ ? chainOf(document_) : [];
return chain.length ? ` · ${t('event.tagUndated', { name: chain.map(chainLabelShort).join(' › ') })}` : '';
}
function documentCardHtml(document_) {
const kind = kindOf(document_);
if (kind === 'list') return listCardHtml(document_);
if (kind === 'poll') return isEventDoc(document_) ? eventCardHtml(document_) : pollCardHtml(document_);
if (kind === 'spend') return spendCardHtml(document_);
if (kind === 'board') return boardCardHtml(document_);
return gameCardHtml(document_);
}
function attachedHtml(document_) {
const children = childrenOf(document_, everything()).filter(isLive);
if (!children.length) return '';
return `
    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('chain.here'))}</h2></div>
      <div class="game-list">${children.map(documentCardHtml).join('')}</div>
    </section>`;
}
function chainButtonsHtml(document_) {
const all = everything();
const attach = isEventDoc(document_) && !attachTargets(document_, all).length && !parentId(document_)
? ''
: `<button type="button" class="button button--small button--ghost" data-attach-doc="${escapeHtml(document_.id)}">${escapeHtml(t(isEventDoc(document_) ? 'activity.attach' : 'chain.attach'))}</button>`;
return `${attach}<button type="button" class="button button--small button--ghost" data-relate-doc="${escapeHtml(document_.id)}">${escapeHtml(t('relate.button'))}</button>`;
}
function chainLabelShort(document_) {
return isEventDoc(document_) ? eventName(document_) || pollTitle(document_) : documentTitle(document_);
}
function kindsHtml(active) {
const kind = (id, goto, label) => `
    <button type="button" class="segmented__option" data-goto="${goto}"
            aria-current="${active === id ? 'true' : 'false'}">${escapeHtml(label)}</button>`;
return `
    <nav class="segmented segmented--kinds" aria-label="${escapeHtml(t('home.kinds'))}">
      ${kind('overview', '#/', t('tab.all'))}
      ${kind('lists', '#/lists', t('tab.lists'))}
      ${kind('polls', '#/polls', t('tab.polls'))}
      ${kind('games', '#/games', t('tab.games'))}
      ${kind('spends', '#/spends', t('tab.spends'))}
      ${kind('ideas', '#/ideas', t('tab.ideas'))}
    </nav>`;
}
function askForText({ title, hint, value = '', confirmLabel, maxLength = 40 }) {
return new Promise((resolve) => {
const dialog = makeDialog('dialog dialog--ask');
dialog.innerHTML = `
      <div class="stack">
        <h2>${escapeHtml(title)}</h2>
        <p class="muted small">${escapeHtml(hint)}</p>
        <input type="text" id="asked-text" value="${escapeHtml(value)}" maxlength="${Number(maxLength) || 40}" />
        <div class="row">
          <button type="button" class="button button--primary" id="asked-ok">${escapeHtml(confirmLabel)}</button>
          <button type="button" class="button" id="asked-cancel">${escapeHtml(t('action.cancel'))}</button>
        </div>
      </div>`;
let answered = false;
const done = (answer) => {
if (answered) return;
answered = true;
resolve(answer);
dialog.close();
};
dialog.addEventListener('close', () => done(null));
dialog.querySelector('#asked-cancel').addEventListener('click', () => done(null));
dialog.querySelector('#asked-ok').addEventListener('click', () => done(dialog.querySelector('#asked-text').value));
dialog.querySelector('#asked-text').addEventListener('keydown', (event) => {
if (event.key === 'Enter') done(dialog.querySelector('#asked-text').value);
});
dialog.showModal();
dialog.querySelector('#asked-text').select();
});
}
function homeView() {
const query = (state.search || '').trim().toLowerCase();
const matches = (game) => {
if (!query) return true;
const preset = getPreset(game.presetId);
const haystack = [gameTitle(game), preset ? presetLabel(preset) : '', ...game.players.map((p) => p.name)]
.join(' ')
.toLowerCase();
return haystack.includes(query);
};
const mine = shownDocs(state.games);
const sorted = [...mine].sort((a, b) => b.updatedAt - a.updatedAt).filter(matches);
const live = sorted.filter(isLive);
const ongoing = live.filter((game) => !gameStatus(game).finished);
const finished = live.filter((game) => gameStatus(game).finished);
return `
    ${flashHtml()}
    ${kindsHtml('games')}
    ${newButtonHtml('#/new', t('action.newGame'), mine.some(isLive))}
    ${groupChipsHtml()}
    ${arcadeHtml()}
    ${
mine.length
? `<div class="row">
             <button type="button" class="button button--small button--ghost" data-goto="#/stats">${escapeHtml(t('action.stats'))}</button>
           </div>`
: ''
}

    ${
mine.length > 4
? `<label class="visually-hidden" for="search">${escapeHtml(t('home.search'))}</label>
           <input type="text" id="search" placeholder="${escapeHtml(t('home.search'))}" value="${escapeHtml(state.search || '')}" />`
: ''
}

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(t('kinds.ongoing'))}</h2></div>
      ${
ongoing.length
? `<div class="game-list">${ongoing.map(swipeable(gameCardHtml)).join('')}</div>`
: hintHtml('games', t('home.empty'))
}
      ${hiddenByGroupHtml(state.games)}
    </section>
    ${ongoing.length && live.length <= 2 ? hintHtml('games', t('hint.games')) : ''}

    ${
finished.length
? `<section class="section">
             <div class="section__head"><h2>${escapeHtml(t('home.finished'))}</h2></div>
             <div class="game-list">${finished.map(swipeable(gameCardHtml)).join('')}</div>
           </section>`
: ''
}

    ${archivedHtml(sorted, swipeable(gameCardHtml))}`;
}
function applyStaticText() {
document.documentElement.lang = getLanguage();
document.querySelectorAll('[data-i18n]').forEach((node) => {
node.textContent = t(node.dataset.i18n);
});
document.querySelectorAll('[data-i18n-title]').forEach((node) => {
const label = t(node.dataset.i18nTitle);
node.title = label;
node.setAttribute('aria-label', label);
});
}
function bindChrome() {
document.querySelector('.skip-link')?.addEventListener('click', (event) => {
event.preventDefault();
const heading = view.querySelector('h1');
const target = heading || view;
target.tabIndex = -1;
target.focus();
});
document.getElementById('create')?.addEventListener('click', openCreateMenu);
document.getElementById('search-open')?.addEventListener('click', () => navigate('#/search'));
document.getElementById('theme-toggle').addEventListener('click', () => {
state.prefs = { ...state.prefs, theme: lookIsDark() ? 'light' : 'dark' };
savePrefs(state.prefs);
applyLook();
if (route().name === 'settings') render();
});
document.getElementById('sync').addEventListener('click', async (event) => {
const button = event.currentTarget;
if (button.disabled) return;
button.disabled = true;
button.classList.add('icon-button--busy');
let taken = 0;
let failed = false;
try {
taken = await catchUpAll();
if (showsGate()) await refreshGate();
} catch {
failed = true;
}
button.disabled = false;
button.classList.remove('icon-button--busy');
flash(failed ? t('sync.failed') : taken ? t('sync.done', { count: taken }) : t('sync.nothing'),
failed ? 'error' : 'info');
render();
});
}
async function switchLanguage(lang) {
try {
await loadLanguage(lang);
} catch {
flash(t('lang.unreachable'), 'error');
render();
return;
}
setLanguage(lang);
state.prefs = { ...state.prefs, lang: getLanguage() };
savePrefs(state.prefs);
applyStaticText();
render();
}
function keptScrolls() {
const kept = new Map();
view.querySelectorAll('[data-keep-scroll]').forEach((box) => {
kept.set(box.dataset.keepScroll, { left: box.scrollLeft, top: box.scrollTop });
});
return kept;
}
function restoreScrolls(kept) {
view.querySelectorAll('[data-keep-scroll]').forEach((box) => {
const was = kept.get(box.dataset.keepScroll);
if (!was) return;
box.scrollLeft = was.left;
box.scrollTop = was.top;
});
}
function setPlaying(on) {
document.body.classList.toggle('playing', on);
const tabs = document.getElementById('tabs');
if (tabs && on) tabs.hidden = true;
}
function setSolo(on) {
document.body.classList.toggle('solo', on);
const tabs = document.getElementById('tabs');
if (tabs) tabs.hidden = on;
const search = document.getElementById('search-open');
if (search) search.hidden = on;
const skip = document.querySelector('.skip-link');
if (skip) skip.hidden = on;
const brand = document.querySelector('.app-bar__brand');
if (!brand) return;
if (on) {
brand.removeAttribute('href');
brand.setAttribute('aria-disabled', 'true');
} else {
brand.setAttribute('href', '#/');
brand.removeAttribute('aria-disabled');
}
}
function leavePoll(current, { unreachable = false } = {}) {
if (!current.solo) {
if (unreachable) flash(t('polls.unreachable'), 'error');
navigate('#/polls');
return;
}
if (!unreachable) {
view.innerHTML = `<p class="lead">${escapeHtml(t('polls.soloGone'))}</p>`;
return;
}
view.innerHTML = `
    <p class="lead">${escapeHtml(t('polls.unreachable'))}</p>
    <button type="button" class="button" id="poll-retry">${escapeHtml(t('polls.retry'))}</button>`;
view.querySelector('#poll-retry').addEventListener('click', () => render());
}
function takePrefill(current) {
const fill = prefillOf(location.hash);
if (!fill) return;
history.replaceState(null, '', `${location.pathname}${location.search}${withoutPrefill(location.hash)}`);
const people = fill.people ? [...fill.people, ...(fill.people.length < 2 ? [''] : [])] : null;
const lines = (list) => (list || []).join('\n');
if (current.name === 'new-list') {
if (fill.title) state.newListName = fill.title;
if (fill.lines) state.newListLines = lines(fill.lines);
if (people) state.newListPeople = people;
} else if (current.name === 'new-poll') {
if (fill.question || fill.title) state.newPollQuestion = fill.question || fill.title;
if (fill.choices) state.newPollChoices = lines(fill.choices);
if (people) state.newPollPeople = people;
} else if (current.name === 'new-spend') {
if (fill.title) state.newSpendName = fill.title;
if (CURRENCIES.includes(fill.currency)) state.newSpendCurrency = fill.currency;
if (people) state.newSpendPeople = people;
} else if (current.name === 'new-event') {
if (fill.title) state.newEventName = fill.title;
if (fill.day) state.newEventDay = fill.day;
if (fill.hour) state.newEventHour = fill.hour;
if (fill.until) state.newEventUntil = fill.until;
if (people) state.newEventPeople = people;
}
}
function render() {
draw();
namePage();
}
function namePage() {
if (!view.querySelector('h1')) {
const kind = view.querySelector('.segmented--kinds [aria-current="true"]');
const tab = document.querySelector('#tabs [aria-current="page"]');
const name = kind && kind.dataset.goto !== '#/' ? kind.textContent.trim() : (tab?.textContent || '').trim();
if (name) view.insertAdjacentHTML('afterbegin', `<h1 class="visually-hidden">${escapeHtml(name)}</h1>`);
}
const heading = (view.querySelector('h1')?.textContent || '').trim().replace(/\s+/g, ' ');
const app = t('app.title');
document.title = heading && heading !== app ? `${heading} · ${app}` : app;
}
function focusPage() {
const active = document.activeElement;
if (active && active !== document.body && view.contains(active)) return;
if (document.querySelector('dialog[open]')) return;
const heading = view.querySelector('h1');
if (!heading) return;
heading.tabIndex = -1;
heading.focus({ preventScroll: true });
}
function loadingHtml(text) {
return `
    <div class="loading" role="status">
      <span class="loading__bar loading__bar--title" aria-hidden="true"></span>
      <span class="loading__bar" aria-hidden="true"></span>
      <span class="loading__bar loading__bar--short" aria-hidden="true"></span>
      <p class="muted small">${escapeHtml(text)}</p>
    </div>`;
}
function missing(tab) {
flash(t('doc.missing'));
navigate(tab);
}
function draw() {
const current = route();
takePrefill(current);
markTab(current);
setSolo(Boolean(current.solo));
setPlaying(current.name === 'arcade');
listenLive(current);
const kept = keptScrolls();
const sync = document.getElementById('sync');
if (sync) sync.hidden = !(state.remote && groups().length);
if (current.name === 'lists') {
stopWatching();
view.innerHTML = listsView();
bindDocSwipes();
} else if (current.name === 'new-list') {
stopWatching();
view.innerHTML = newListView();
bindNewList();
} else if (current.name === 'list') {
const list = getList(current.id);
if (!list) {
stopWatching();
if (state.remote) {
view.innerHTML = loadingHtml(t('lists.loading'));
if (state.openingList !== current.id) {
const asked = current.id;
state.openingList = asked;
pullList(asked).then((found) => {
if (state.openingList !== asked) return;
state.openingList = null;
if (found) render();
else if (route().id === asked) missing('#/lists');
});
}
return;
}
missing('#/lists');
return;
}
watchList(list.id);
view.innerHTML = listView(list);
bindList(list);
} else if (current.name === 'agenda') {
stopWatching();
view.innerHTML = agendaView();
bindDocSwipes();
} else if (current.name === 'new-event') {
stopWatching();
view.innerHTML = newEventView();
bindNewEvent();
} else if (current.name === 'new-spend') {
stopWatching();
view.innerHTML = newSpendView();
bindNewSpend();
} else if (current.name === 'spend') {
const spend = getSpend(current.id);
if (!spend) {
stopWatching();
if (state.remote) {
view.innerHTML = loadingHtml(t('spends.loading'));
if (state.openingSpend !== current.id) {
const asked = current.id;
state.openingSpend = asked;
pullSpend(asked).then((found) => {
if (state.openingSpend !== asked) return;
state.openingSpend = null;
if (found) render();
else if (route().id === asked) missing('#/spends');
});
}
return;
}
missing('#/spends');
return;
}
watchSpend(spend.id);
view.innerHTML = spendView(spend);
bindSpend(spend);
} else if (current.name === 'ideas') {
stopWatching();
view.innerHTML = ideasView();
bindDocSwipes();
} else if (current.name === 'new-board') {
stopWatching();
view.innerHTML = newBoardView();
bindNewBoard();
} else if (current.name === 'board') {
const board = getBoard(current.id);
if (!board) {
stopWatching();
if (state.remote) {
view.innerHTML = loadingHtml(t('ideas.loading'));
if (state.openingBoard !== current.id) {
const asked = current.id;
state.openingBoard = asked;
pullBoard(asked).then((found) => {
if (state.openingBoard !== asked) return;
state.openingBoard = null;
if (found) render();
else if (route().id === asked) missing('#/ideas');
});
}
return;
}
missing('#/ideas');
return;
}
watchBoard(board.id);
view.innerHTML = boardView(board);
bindBoard(board);
} else if (current.name === 'polls') {
stopWatching();
view.innerHTML = pollsView();
bindDocSwipes();
} else if (current.name === 'new-poll') {
stopWatching();
view.innerHTML = newPollView();
bindNewPoll();
} else if (current.name === 'poll') {
const poll = getPoll(current.id);
if (!poll) {
stopWatching();
if (state.remote) {
view.innerHTML = loadingHtml(t('polls.loading'));
if (state.openingPoll !== current.id) {
const asked = current.id;
state.openingPoll = asked;
pullPoll(asked).then((found) => {
if (state.openingPoll !== asked) return;
state.openingPoll = null;
if (found) render();
else if (route().id === asked) leavePoll(current, { unreachable: found === null });
});
}
return;
}
leavePoll(current);
return;
}
watchPoll(poll.id);
view.innerHTML = pollView(poll, { solo: current.solo });
bindPoll(poll);
} else if (current.name === 'stats') {
stopWatching();
view.innerHTML = statsView();
} else if (current.name === 'new') {
stopWatching();
view.innerHTML = newGameView();
bindNewGame();
} else if (current.name === 'set') {
stopWatching();
view.innerHTML = loadingHtml(t('shareSet.loading'));
if (state.openingSet !== current.id) {
const asked = current.id;
state.openingSet = asked;
openSet(asked).then(() => {
if (state.openingSet !== asked) return;
state.openingSet = null;
if (route().name === 'set') navigate('#/');
});
}
return;
} else if (current.name === 'game') {
const game = getGame(current.id);
if (!game) {
if (state.remote) {
view.innerHTML = loadingHtml(t('share.loading'));
pullGame(current.id).then((found) => {
if (found) render();
else if (route().id === current.id) missing('#/games');
});
return;
}
missing('#/games');
return;
}
watchGame(game.id);
if (state.editingRoundId && !game.rounds.some((round) => round.id === state.editingRoundId)) {
state.editingRoundId = null;
}
view.innerHTML = gameView(game);
bindGame(game);
} else if (current.name === 'arcade') {
stopWatching();
const part = laterPart('arcade', () => togetherPart('arcade', () => ({ ARCADE_MODES, arcadeMode, backButtonHtml, bestOf, escapeHtml, keepBest, modeOf, savePrefs, sendScore, state, t })));
if (!part.module) {
view.innerHTML = `<div class="spread page-head">${backButtonHtml('#/games')}</div>${loadingHtml(t('later.loading'))}`;
const id = current.id;
part.coming.then(
() => {
if (route().name === 'arcade' && route().id === id) render();
},
() => {
if (route().name !== 'arcade' || route().id !== id) return;
flash(t('later.failed'), 'error');
navigate('#/games');
},
);
} else {
const page = part.module.arcadeView(current.id);
if (!page) {
navigate('#/games');
return;
}
view.innerHTML = page;
part.module.bindArcade(current.id);
}
} else if (current.name === 'person') {
stopWatching();
view.innerHTML = personView(current.who);
} else if (current.name === 'group') {
stopWatching();
const group = groups().find((held) => held.id === current.id);
if (!group) {
flash(t('group.missing'));
navigate('#/groups');
return;
}
view.innerHTML = groupView(group);
bindGroup(group);
} else if (current.name === 'back') {
stopWatching();
view.innerHTML = backView(current.token);
bindBack(current.token);
} else if (current.name === 'join') {
view.innerHTML = joinView(current);
bindJoin();
bindInstall();
if (pendingFor(current.group)) watchPending();
else stopWatching();
} else if (current.name === 'home') {
stopWatching();
view.innerHTML = homeView();
bindHome();
bindDocSwipes();
bindArcadeRanking();
} else if (current.name === 'spends') {
stopWatching();
view.innerHTML = spendsView();
bindDocSwipes();
} else if (current.name === 'search') {
stopWatching();
view.innerHTML = searchView(current.words);
bindSearch(current.words);
} else if (current.name === 'privacy') {
stopWatching();
view.innerHTML = privacyView();
bindOverview();
} else if (current.name === 'settings') {
stopWatching();
view.innerHTML = settingsView();
bindOverview();
bindAccount();
bindNotify();
bindLook(view);
} else if (current.name === 'groups') {
view.innerHTML = groupsView();
bindOverview();
bindAccount();
if (state.remote && groups().some((group) => group.admits !== false)) watchGate();
else stopWatching();
} else {
view.innerHTML = overviewView();
bindOverview();
bindHoloPlace();
if (state.remote && groups().some((group) => group.admits !== false)) watchGate();
else stopWatching();
}
view.querySelectorAll('[data-goto]').forEach((node) => {
node.addEventListener('click', () => navigate('back' in node.dataset ? backTarget(node.dataset.goto) : node.dataset.goto));
});
view.querySelectorAll('[data-create-menu]').forEach((node) => {
node.addEventListener('click', openCreateMenu);
});
bindEventChips(view);
bindFlows(view);
bindInstall(view);
view.querySelectorAll('[data-attach-doc]').forEach((node) => {
node.addEventListener('click', () => {
const document_ = everything().find((one) => one.id === node.dataset.attachDoc);
if (document_) openAttachDialog(document_);
});
});
view.querySelectorAll('[data-relate-doc]').forEach((node) => {
node.addEventListener('click', () => {
const document_ = everything().find((one) => one.id === node.dataset.relateDoc);
if (document_) openRelateDialog(document_);
});
});
view.querySelectorAll('[data-gather-doc]').forEach((node) => {
node.addEventListener('click', () => {
const document_ = everything().find((one) => one.id === node.dataset.gatherDoc);
if (document_) openGatherDialog(document_);
});
});
view.querySelectorAll('[data-group-filter]').forEach((node) => {
node.addEventListener('click', () => {
setGroupFilter(node.dataset.groupFilter);
render();
});
});
view.querySelectorAll('[data-put-in-group]').forEach((node) => {
node.addEventListener('click', () => {
node.disabled = true;
void putInGroup(node.dataset.putInGroup);
});
});
view.querySelectorAll('[data-copy-to-group]').forEach((node) => {
node.addEventListener('click', () => {
node.disabled = true;
void copyToGroup(node.dataset.copyToGroup);
});
});
view.querySelectorAll('[data-group-tile]').forEach((node) => {
node.addEventListener('click', () => {
setGroupFilter(node.dataset.groupTile);
navigate(node.dataset.tileGoto);
});
});
view.querySelectorAll('[data-rename-everywhere]').forEach((button) => {
button.addEventListener('click', () => renameEverywhere(button.dataset.renameEverywhere));
});
restoreScrolls(kept);
showFreshError();
fadeKinds();
showTouched();
arrive();
}
function showFreshError() {
if (!state.flashFresh) return;
state.flashFresh = false;
const banner = view.querySelector('.banner--warn');
const bar = document.querySelector('.app-bar')?.getBoundingClientRect().bottom || 0;
if (banner && banner.getBoundingClientRect().top < bar) banner.scrollIntoView({ block: 'center' });
}
function fadeKinds() {
view.querySelectorAll('.segmented--kinds').forEach((row) => {
const mark = () => {
const more = row.scrollWidth - row.clientWidth;
row.classList.toggle('fade-start', more > 1 && row.scrollLeft > 1);
row.classList.toggle('fade-end', more > 1 && row.scrollLeft < more - 1);
};
const on = row.querySelector('[aria-current="true"]');
if (on && row.scrollWidth > row.clientWidth) {
const left = on.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
row.scrollLeft = Math.max(0, left - (row.clientWidth - on.offsetWidth) / 2);
}
mark();
row.addEventListener('scroll', mark, { passive: true });
});
}
function keepUntilAfter(dayField, untilField) {
if (!dayField || !untilField) return;
const follow = () => {
untilField.min = dayField.value || '';
if (dayField.value && untilField.value && untilField.value <= dayField.value) untilField.value = '';
};
follow();
dayField.addEventListener('input', follow);
dayField.addEventListener('change', follow);
untilField.addEventListener('change', follow);
}
function writtenNames(names) {
return new Set((names || []).map((name) => String(name || '').trim().toLowerCase()).filter(Boolean));
}
function markTouched(selector) {
state.touched = selector;
}
function showTouched() {
if (!state.touched) return;
view.querySelector(state.touched)?.classList.add('touched');
state.touched = null;
}
let shownHash = null;
function arrive() {
const here = hereHash();
view.classList.toggle('view--arrive', here !== shownHash);
shownHash = here;
}
async function pullGame(id) {
if (!state.remote) return false;
let stored = null;
try {
stored = await state.remote.get(id);
} catch {
return false;
}
if (stored === null) return whenAbsent(id);
return isValidGame(stored) ? adoptGame(stored) : false;
}
function adoptGame(stored) {
const local = getGame(stored.id);
const merged = local ? mergeGames(local, stored) : stored;
if (local && merged === local) return false;
const adopted = { ...merged, shared: true };
state.games = local
? state.games.map((game) => (game.id === stored.id ? adopted : game))
: [...state.games, adopted];
saveGames(state.games);
return true;
}
function markTab(current) {
const bar = document.getElementById('tabs');
if (!bar) return;
const tabOf = (at) => {
if (['agenda', 'new-event'].includes(at.name)) return 'agenda';
if (['groups', 'group', 'person', 'join', 'back'].includes(at.name)) return 'groups';
if (at.name === 'settings') return 'settings';
return 'home';
};
const document_ = ['list', 'poll', 'spend', 'board', 'game', 'person'].includes(current.name);
const from = document_ ? backTarget(null) : null;
const poll = current.name === 'poll' ? getPoll(current.id) : null;
const here = from
? tabOf(routeOf(from))
: poll && pollHome(poll) === '#/agenda'
? 'agenda'
: tabOf(current);
bar.querySelectorAll('[data-tab]').forEach((tab) => {
if (tab.dataset.tab === here) tab.setAttribute('aria-current', 'page');
else tab.removeAttribute('aria-current');
});
}
async function pullAny(id) {
if (!state.remote) return false;
let stored = null;
try {
stored = await state.remote.get(id);
} catch {
return false;
}
if (isValidGame(stored)) return adoptGame(stored);
if (isValidList(stored)) return adoptList(stored);
if (isValidPoll(stored)) return adoptPoll(stored);
if (isValidSpend(stored)) return adoptSpend(stored);
if (isValidBoard(stored)) return adoptBoard(stored);
if (stored === null) return whenAbsent(id);
return false;
}
function liveTopics(current) {
const topics = [...groups().filter((group) => group.channel).map((group) => groupTopic(group.channel)),
...linkOnlyPolls().map((poll) => docTopic(poll.id))];
if (['game', 'list', 'spend', 'board', 'poll'].includes(current.name) && current.id) topics.push(docTopic(current.id));
return [...new Set(topics)];
}
function linkOnlyPolls() {
return state.polls.filter((poll) => poll.shared && poll.linkOnly && !poll.archivedAt);
}
const askedChannel = new Set();
function listenLive(current) {
if (!state.live) return;
state.live.watch(liveTopics(current));
for (const group of groups().filter((held) => !held.channel && !askedChannel.has(held.id))) {
askedChannel.add(group.id);
void refreshGroup(group).then((learnt) => learnt && state.live.watch(liveTopics(route())));
}
}
function liveQuiet(topic) {
return Boolean(state.live?.quiet(topic));
}
function liveCoversGroups() {
return Boolean(state.live)
&& groups().every((group) => group.channel && state.live.covers(groupTopic(group.channel)))
&& linkOnlyPolls().every((poll) => state.live.covers(docTopic(poll.id)));
}
const hearing = new Map();
async function heard(topic) {
if (hearing.has(topic)) {
hearing.set(topic, true);
return;
}
hearing.set(topic, false);
try {
let changed = false;
const group = groups().find((held) => held.channel && groupTopic(held.channel) === topic);
if (group) {
changed = (await catchUpWith(group)) > 0;
if (showsGate()) changed = (await refreshGate()) || changed;
} else if (topic.startsWith('doc-')) {
changed = await pullAny(topic.slice('doc-'.length));
}
if (changed && !isBusy()) render();
} catch {
} finally {
const again = hearing.get(topic);
hearing.delete(topic);
if (again) void heard(topic);
}
}
function tellTheNotifier() {
const { put, ask } = state.remote;
state.remote.put = async (document_, key = null, owner = null) => {
const answer = await put(document_, key, owner);
if (key) void tell(document_, key);
return answer;
};
state.remote.ask = async (...args) => {
const answer = await ask(...args);
if (answer?.status === 'waiting') tellKnock(answer.ticket);
return answer;
};
}
function startLive() {
state.live = createLive({ url: liveUrl(remoteConfig()), key: remoteConfig()?.key, onChange: (topic) => void heard(topic) });
if (!state.live) return;
document.addEventListener('visibilitychange', () => {
if (document.visibilityState === 'visible') state.live.wake();
});
}
function watchList(id) {
stopWatching();
if (!state.remote) return;
state.poll = setInterval(async () => {
if (isBusy() || isHidden() || liveQuiet(docTopic(id))) return;
if (await pullList(id)) render();
}, 5000);
}
function watchGame(id) {
stopWatching();
if (!state.remote) return;
state.poll = setInterval(async () => {
if (isBusy() || isHidden()) return; 
if (liveQuiet(docTopic(id))) return;
if (await pullGame(id)) render();
}, 5000);
}
function stopWatching() {
if (state.poll) clearInterval(state.poll);
state.poll = null;
state.pollWatched = null;
}
function signature(games) {
return games
.map((game) => `${game.id}:${game.updatedAt}`)
.sort()
.join('|');
}
function isHidden() {
return document.visibilityState === 'hidden';
}
function isBusy() {
if (document.querySelector('dialog[open]')) return true;
const active = document.activeElement;
return Boolean(
active && active.closest?.('#view') && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName),
);
}
function adoptOlderGames() {
if (!state.remote) return;
const migrated = state.games.map((game) =>
game.shared === undefined ? { ...game, shared: true } : game,
);
if (migrated.some((game, index) => game !== state.games[index])) {
state.games = migrated;
saveGames(state.games);
}
}
function connectToStore() {
connectStore({
getLocalGames: () => state.games,
onGames: (games) => {
if (signature(games) === signature(state.games)) return;
state.games = games;
saveGames(games);
if (!isBusy()) render();
},
onLost: () => {
state.store = null;
if (!isBusy()) render();
},
}).then((store) => {
if (!store) return;
state.store = store;
if (!isBusy()) render();
});
}
applyLook();
function startScreen() {
applyStaticText();
bindChrome();
bindPullToRefresh();
followTrail();
window.addEventListener('hashchange', onHashChange);
}
function onHashChange() {
followTrail();
endNewsVisit(route());
if (!/^new/.test(route().name)) state.newEventLink = null;
state.editingRoundId = null;
state.listFilter = null;
if (state.flash?.shownAt) state.flash = null;
commitPendingDelete();
renderMoving();
}
const TOP_SCREENS = ['home', 'overview', 'agenda', 'groups', 'settings', 'lists', 'polls', 'spends', 'ideas', 'search', 'stats'];
let shownScreen = route().name;
function renderMoving() {
const before = shownScreen;
const after = route().name;
shownScreen = after;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.webdriver;
if (!document.startViewTransition || still || before === after || isBusy()) {
render();
focusPage();
return;
}
const depth = (name) => (TOP_SCREENS.includes(name) ? 0 : 1);
const step = depth(after) - depth(before);
document.documentElement.dataset.nav = step > 0 ? 'forward' : step < 0 ? 'back' : 'across';
const moving = document.startViewTransition(() => {
render();
focusPage();
});
moving.finished.finally(() => delete document.documentElement.dataset.nav);
}
document.addEventListener('visibilitychange', () => {
if (document.visibilityState === 'visible' && refreshSky() && route().name === 'settings') render();
});
window.addEventListener('storage', (event) => {
if (event.key && !event.key.startsWith('marque-points:')) return;
state.prefs = loadPrefs();
applyLook();
state.games = loadGames();
state.lists = loadLists();
state.polls = loadPolls();
state.spends = loadSpends();
state.boards = loadBoards();
if (!isBusy()) render();
});
function registerOfflineCache() {
if (!('serviceWorker' in navigator)) return;
if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
if (!document.querySelector('link[rel="manifest"]')) return;
window.addEventListener('load', () => {
navigator.serviceWorker
.register('sw.js', { updateViaCache: 'none' })
.then((registration) => {
state.worker = registration;
const look = () => {
if (document.visibilityState === 'visible') registration.update().catch(() => {});
};
document.addEventListener('visibilitychange', look);
window.addEventListener('focus', look);
})
.catch(() => {
});
let controlled = Boolean(navigator.serviceWorker.controller);
navigator.serviceWorker.addEventListener('controllerchange', () => {
if (!controlled) {
controlled = true;
return;
}
if (state.reloading) return;
state.reloading = true;
location.reload();
});
});
}
function appVersion() {
const version = document.querySelector('meta[name="app-version"]')?.content || '';
const build = document.querySelector('meta[name="app-build"]')?.content || '';
return [version, build].filter(Boolean).join(' · ');
}
async function lookForUpdate() {
if (!state.worker) return 'unsupported';
try {
await state.worker.update();
} catch {
return 'failed';
}
if (state.worker.installing || state.worker.waiting) return 'coming';
return 'current';
}
function start() {
startScreen();
adoptOlderGames();
offerMeInForms();
startInstall();
render();
void welcomeMove(arrival);
startTalking();
connectToStore();
}
function startTalking() {
if (!state.remote) return;
tellTheNotifier();
startLive();
(async () => {
const answered = pendings().length ? await checkAllPendings() : false;
const changed = await verifyGroups();
if ((answered || changed) && !isBusy()) render();
await syncAccount({ force: true });
await catchUpQuietly();
await syncPush();
})();
document.addEventListener('visibilitychange', () => {
if (document.visibilityState === 'visible') void catchUpQuietly();
});
window.addEventListener('focus', () => void catchUpQuietly());
setInterval(() => {
if (document.visibilityState === 'visible') void catchUpQuietly();
}, 5000);
}
const firstLanguage = state.prefs.lang || detectLanguage();
loadLanguage(firstLanguage)
.catch(() => loadLanguage('fr'))
.catch(() => 'fr')
.then((lang) => {
setLanguage(lang);
start();
});
registerOfflineCache();
})();
