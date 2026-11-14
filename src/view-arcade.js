/**
 * The arcade on screen: the games one plays in the app itself, listed on the
 * Games tab, each on its own page (#/arcade/<id>).
 *
 * The logic is in arcade.js; this draws it on a canvas and passes on the
 * fingers (a swipe on the game, the arrows under it) and the keyboard. Each
 * game outlives a redraw of the page — the app redraws whenever the database
 * says something — and waits, paused, when its page is left or hidden.
 */

import { backButtonHtml, escapeHtml, state } from './app.js';
import {
  ARCADE_GAMES, ARCADE_MODES, GLOUTON_MAZE, SNAKE_SIZE, arcadeMode, newGlouton, newSnake, steerGlouton, steerSnake,
  stepGlouton, stepSnake, togglePause,
} from './arcade.js';
import { savePrefs } from './storage.js';
import { groupFilter, groups, myNameIn } from './view-groups.js';
import { t } from './i18n.js';

/** The games being played, by id: kept across redraws, and while one plays another. */
const arcadeRuns = new Map();

/**
 * What differs from one game to the next: how it starts, moves, turns and is
 * drawn, which numbers sit above it, what the line under it says, and what
 * makes the phone shake.
 */
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

const ARCADE_ICONS = {
  glouton: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12 20.2 7.3A9.5 9.5 0 1 0 20.2 16.7z"/></svg>',
  snake: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 16.5c2.6 0 2.6-7 5.2-7s2.6 7 5.2 7 2.6-7 5.2-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="19.6" cy="9.5" r="2.6"/></svg>',
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

/** The mode chosen for a game, kept on the phone. */
function modeOf(id) {
  return arcadeMode(state.prefs?.arcadeMode?.[id]);
}

/** Where a record is kept: the normal mode's where it always was. */
function recordKey(id, mode) {
  return mode === 'normal' ? id : `${id}:${mode}`;
}

function bestOf(id, mode = modeOf(id)) {
  return Number(state.prefs?.arcade?.[recordKey(id, mode)]) || 0;
}

/** Keep a score if it beats the record; says whether it did. */
function keepBest(id, mode, score) {
  if (score <= bestOf(id, mode)) return false;
  state.prefs.arcade = { ...(state.prefs.arcade || {}), [recordKey(id, mode)]: score };
  savePrefs(state.prefs);
  return true;
}

/* ---------------------------------------------------------------- ranking --- */

/**
 * Each group's ranking, in the database: the best score of each of its
 * first names, by game and mode. A game over sends its score to every group
 * this device is in, under the name it has there. The Games tab shows one
 * group's best, game by game, under « Jouer ici ».
 */
const rankings = new Map();
/** When each ranking was last asked for: the tab redraws often, the database is asked now and then. */
const rankingAsked = new Map();
const RANKING_FRESH_MS = 20000;
const RANKING_SIZE = 5;
/** Whether the database has ever answered: one not yet updated knows no ranking, and none shows. */
let rankingKnown = false;

function rankingKey(groupId, id, mode) {
  return `${groupId}|${id}|${mode}`;
}

/**
 * The group whose ranking shows: the one the tab is filtered on, else the
 * one last chosen, else the first.
 */
function rankingGroup() {
  const held = groups();
  const filtered = groupFilter();
  return held.find((group) => group.id === filtered)
    || held.find((group) => group.id === state.prefs.arcadeGroup) || held[0] || null;
}

function rankingMode() {
  return arcadeMode(state.prefs?.arcadeRankMode);
}

/** Send a score to every group, under this device's name there. Never throws. */
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
      // Offline, or a database not yet updated: the record stays here, and
      // goes with the next game or the next visit.
    }
  }));
}

/** The ranking's inside: whom it is for, the mode, and each game's best. */
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
    <div class="arcade-ranking__games">${ARCADE_GAMES.filter((one) => engineOf(one.id)).map(game).join('')}</div>
    <p class="muted small">${escapeHtml(t(me ? 'arcade.ranking.how' : 'arcade.ranking.who'))}</p>`;
}

/** The ranking's section on the Games tab: hidden until the database has answered once. */
function rankingHtml() {
  if (!state.remote || !rankingGroup()) return '';
  return `<section class="section arcade-ranking" id="arcade-ranking"${rankingKnown ? '' : ' hidden'}>${rankingKnown ? rankingInner() : ''}</section>`;
}

/** Redraw the ranking in place, and wire its buttons. */
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

/** Ask the database for the shown group's ranking, each game, unless asked lately. */
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

/**
 * Wire the ranking on the Games tab, once it is drawn. The records kept here
 * go to the groups first, once a visit: one made before the ranking existed,
 * or while offline.
 */
let recordsSent = false;
export function bindArcadeRanking() {
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

/* ------------------------------------------------------------------ sound --- */

/**
 * Little sounds made on the spot (Web Audio), as the old machines did: no
 * file to load. Off with the button by the arrows; the phone remembers.
 */
let audio = null;
let pellets = 0;

function soundOn() {
  return state.prefs?.arcadeSound !== false;
}

/** Wake the sound up: a phone only lets it start at a touch. */
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
      // A sound that fails is no reason to stop the game.
    }
  }
}

/** The arcade's cards, at the top of the Games tab. */
export function arcadeHtml() {
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
      <div class="arcade-list">${ARCADE_GAMES.filter((game) => engineOf(game.id)).map(card).join('')}</div>
    </section>
    ${rankingHtml()}`;
}

/** One game's page; empty for a game that does not exist. */
export function arcadeView(id) {
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

export function bindArcade(id) {
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

  // Another mode: a new game in it, at once.
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
    // At the touch, not at the click: a click waits for the finger to lift.
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

  // A swipe anywhere on the game's part of the page steers — on the maze, or
  // beside the arrows, where the thumbs are; the finger may go on and turn again.
  const zone = canvas.closest('.arcade') || canvas;
  let origin = null;
  zone.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Element && event.target.closest('button')) return;
    wakeAudio();
    origin = { x: event.clientX, y: event.clientY };
    try {
      zone.setPointerCapture?.(event.pointerId);
    } catch {
      // A pointer the browser no longer knows: the swipe works without.
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
    // A button with the focus answers Space and Enter itself.
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
      // Redrawn, the game goes on in the new page; left, it waits there, paused.
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

/** The line under the game. */
function statusOf(run, engine) {
  const { game } = run;
  if (game.state === 'over' && run.record) return t('arcade.newRecord', { score: game.score });
  if (game.state === 'over') return t(game.won ? 'arcade.won' : 'arcade.over', { score: game.score });
  if (run.flash && run.now < run.flash.until) return run.flash.text;
  if (game.state === 'cleared') return t('arcade.cleared', { level: game.level });
  if (game.state === 'paused') return t('arcade.paused');
  return engine.texts[game.state] ? t(engine.texts[game.state]) : '';
}

/** The word across the game, when it is not running. */
function bannerOf(game) {
  if (game.state === 'over' && game.record) return t('arcade.recordShort');
  if (game.state === 'over') return t(game.won ? 'arcade.wonShort' : 'arcade.overShort');
  if (game.state === 'cleared') return t('arcade.cleared', { level: game.level });
  if (game.state === 'paused') return t('arcade.paused');
  if (game.state === 'ready') return t('arcade.ready');
  return '';
}

/** The numbers and the line under the game, touched only when they change. */
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

/**
 * Size the canvas to its place on the page, sharp on any screen, and clear it
 * to the style's night. Returns the tile size and the style's colours.
 */
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

/** Stroke the path as a neon tube: a wide soft glow, then a bright thin line. */
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

/* ---------------------------------------------------------------- glouton --- */

/** The maze, the pellets, the ghosts and the glutton, in the style's light. */
function drawGlouton(canvas, context, game, now) {
  const { maze } = game;
  const board = fitBoard(canvas, context, maze.width, maze.height);
  if (!board) return;
  const { width, size, deep, wall } = board;

  // Walls: a glowing tube from each wall tile to the next.
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

  // The door.
  context.strokeStyle = GHOST_COLOURS.pink;
  context.lineWidth = Math.max(1.5, size * 0.14);
  context.beginPath();
  context.moveTo(maze.door.x * size, (maze.door.y + 0.5) * size);
  context.lineTo((maze.door.x + 1) * size, (maze.door.y + 0.5) * size);
  context.stroke();

  // The pellets; the big ones blink.
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

  // The glutton: a mouth that opens and closes as it goes.
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

  // The ghosts: hidden while the glutton is caught, so that one sees it go.
  // While a ghost's points show, the ghosts just eaten are not seen.
  if (game.state !== 'dying') {
    for (const ghost of game.ghosts) {
      if (!(game.freeze > 0 && ghost.mode === 'eaten')) drawGhost(context, ghost, game, size, now);
    }
  }

  // The points of a ghost or a fruit, where it was eaten, rising a little.
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

/** The bonus fruit, one shape per level. */
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
    // The key.
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

/* ------------------------------------------------------------------ snake --- */

/**
 * The field, the apple, the star and the snake. The snake is drawn as far
 * behind as it still has to go to the next tile (arcade.js, `progress`): it
 * glides instead of jumping, and turns exactly where it is seen to turn.
 */
function drawSnake(canvas, context, game, now) {
  // Half a tile of wall all round.
  const board = fitBoard(canvas, context, game.width + 1, game.height + 1);
  if (!board) return;
  const { width, height, size, deep, wall } = board;
  const at = (value) => (value + 1) * size;

  // A faint chequer, to see the tiles go by.
  context.fillStyle = wall;
  context.globalAlpha = 0.06;
  for (let y = 0; y < game.height; y += 1) {
    for (let x = y % 2; x < game.width; x += 2) context.fillRect(at(x) - size / 2, at(y) - size / 2, size, size);
  }
  context.globalAlpha = 1;

  // The wall; dashed when the snake goes through it (easy mode).
  context.beginPath();
  context.rect(size / 4, size / 4, width - size / 2, height - size / 2);
  if (game.wrap) context.setLineDash([size * 0.5, size * 0.6]);
  glowStroke(context, wall, size * 0.4, Math.max(1.5, size * 0.12));
  context.setLineDash([]);

  const pulse = 1 + 0.06 * Math.sin(now / 180);
  if (game.apple) drawApple(context, at(game.apple.x), at(game.apple.y), size * 0.36 * pulse);
  // The apple just eaten stays until the head is over it.
  if (game.swallowing) drawApple(context, at(game.swallowing.x), at(game.swallowing.y), size * 0.36);
  // The star blinks before it goes out.
  if (game.star && (game.star.left > 1.5 || Math.floor(now / 150) % 2 === 0)) {
    drawStar(context, at(game.star.x), at(game.star.y), size * 0.48, now / 900);
  }

  const { body } = game;
  const mix = (from, to) => ({
    x: from.x + (to.x - from.x) * game.progress,
    y: from.y + (to.y - from.y) * game.progress,
  });
  // Through the edges, a tile and the next may sit on both sides of the field:
  // the snake is laid out in one piece first (each tile next to the one
  // before), then drawn once more on the other side where it sticks out.
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

/** The head, looking the way it goes, its tongue out now and then. */
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
