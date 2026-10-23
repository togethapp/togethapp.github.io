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
  ARCADE_GAMES, newGlouton, newSnake, steerGlouton, steerSnake, stepGlouton, stepSnake, togglePause,
} from './arcade.js';
import { savePrefs } from './storage.js';
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
    create: () => newGlouton(),
    step: stepGlouton,
    steer: steerGlouton,
    draw: drawGlouton,
    hud: ['level', 'lives'],
    texts: { ready: 'arcade.ready', dying: 'arcade.caught' },
    shake: 'caught',
  },
  snake: {
    create: () => newSnake(),
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
const PAUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  z: 'up', w: 'up', s: 'down', q: 'left', a: 'left', d: 'right',
};

function engineOf(id) {
  return Object.hasOwn(ARCADE_ENGINES, id) ? ARCADE_ENGINES[id] : null;
}

function bestOf(id) {
  return Number(state.prefs?.arcade?.[id]) || 0;
}

function keepBest(id, score) {
  if (score <= bestOf(id)) return;
  state.prefs.arcade = { ...(state.prefs.arcade || {}), [id]: score };
  savePrefs(state.prefs);
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
    </section>`;
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
  return `
    <div class="spread page-head">
      ${backButtonHtml('#/games')}
      <h1>${name}</h1>
    </div>
    <div class="arcade">
      <div class="arcade__hud">
        <span>${escapeHtml(t('arcade.score'))} <strong id="arcade-score">0</strong></span>
        ${engine.hud.includes('level') ? `<span>${escapeHtml(t('arcade.level'))} <strong id="arcade-level">1</strong></span>` : ''}
        <span>${escapeHtml(t('arcade.record'))} <strong id="arcade-best">${bestOf(id)}</strong></span>
        ${engine.hud.includes('lives') ? '<span id="arcade-lives" class="arcade__lives" role="img"></span>' : ''}
      </div>
      <canvas id="arcade-board" class="arcade__board arcade__board--${escapeHtml(id)}" data-arcade="${escapeHtml(id)}"
              role="img" aria-label="${name}"></canvas>
      <p id="arcade-status" class="arcade__status" aria-live="polite"></p>
      <div class="arcade-pad">
        ${ARROWS.map(arrow).join('')}
        <button type="button" class="arcade-pad__key arcade-pad__key--pause" id="arcade-pause"
                aria-label="${escapeHtml(t('arcade.pause'))}" title="${escapeHtml(t('arcade.pause'))}">${PAUSE_ICON}</button>
      </div>
      <p class="muted small">${escapeHtml(t(`arcade.${id}.rules`))} ${escapeHtml(t('arcade.how'))}</p>
    </div>`;
}

export function bindArcade(id) {
  const canvas = document.getElementById('arcade-board');
  const engine = engineOf(id);
  if (!canvas || !engine) return;
  if (!arcadeRuns.has(id)) arcadeRuns.set(id, { game: engine.create(), shown: null });
  const run = arcadeRuns.get(id);
  run.shown = null;
  const context = canvas.getContext('2d');

  const afresh = () => {
    run.game = engine.create();
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
    restartOrResume();
    engine.steer(run.game, dir);
  };

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
  document.getElementById('arcade-pause').addEventListener('click', pauseOrRestart);

  // A swipe on the game steers; the finger may go on and turn again.
  let origin = null;
  canvas.addEventListener('pointerdown', (event) => {
    origin = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!origin) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    origin = { x: event.clientX, y: event.clientY };
  });
  const lift = () => {
    if (origin && ['over', 'paused'].includes(run.game.state)) restartOrResume();
    origin = null;
  };
  canvas.addEventListener('pointerup', lift);
  canvas.addEventListener('pointercancel', () => { origin = null; });

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
    if (events.includes('over')) keepBest(id, run.game.score);
    engine.draw(canvas, context, run.game, now);
    showHud(run, id, engine);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** The line under the game. */
function statusOf(game, engine) {
  if (game.state === 'over') return t(game.won ? 'arcade.won' : 'arcade.over', { score: game.score });
  if (game.state === 'cleared') return t('arcade.cleared', { level: game.level });
  if (game.state === 'paused') return t('arcade.paused');
  return engine.texts[game.state] ? t(engine.texts[game.state]) : '';
}

/** The word across the game, when it is not running. */
function bannerOf(game) {
  if (game.state === 'over') return t(game.won ? 'arcade.wonShort' : 'arcade.overShort');
  if (game.state === 'cleared') return t('arcade.cleared', { level: game.level });
  if (game.state === 'paused') return t('arcade.paused');
  if (game.state === 'ready') return t('arcade.ready');
  return '';
}

/** The numbers and the line under the game, touched only when they change. */
function showHud(run, id, engine) {
  const { game } = run;
  const status = statusOf(game, engine);
  const shown = `${game.score}|${game.level}|${game.lives}|${status}`;
  if (run.shown === shown) return;
  run.shown = shown;
  const put = (where, value) => {
    const element = document.getElementById(where);
    if (element) element.textContent = value;
  };
  put('arcade-score', game.score);
  put('arcade-level', game.level);
  put('arcade-best', Math.max(bestOf(id), game.score));
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
  if (game.state !== 'dying') {
    for (const ghost of game.ghosts) drawGhost(context, ghost, game, size, now);
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

  context.beginPath();
  context.rect(size / 4, size / 4, width - size / 2, height - size / 2);
  glowStroke(context, wall, size * 0.4, Math.max(1.5, size * 0.12));

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
  const head = mix(body[1], body[0]);
  const tail = game.trail ? mix(game.trail, body.at(-1)) : body.at(-1);
  const points = [head, ...body.slice(1), tail];
  const colour = game.state === 'dying' && Math.floor(now / 120) % 2 === 0 ? APPLE_RED : SNAKE_GREEN;
  context.globalAlpha = game.state === 'over' ? 0.5 : 1;
  context.beginPath();
  context.moveTo(at(points[0].x), at(points[0].y));
  for (const point of points.slice(1)) context.lineTo(at(point.x), at(point.y));
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

  // The head, looking the way it goes, its tongue out now and then.
  const ahead = { x: body[0].x - body[1].x, y: body[0].y - body[1].y };
  const side = { x: -ahead.y, y: ahead.x };
  const hx = at(head.x);
  const hy = at(head.y);
  const r = size * 0.42;
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
  context.globalAlpha = 1;

  drawBanner(context, bannerOf(game), width / 2, height * 0.27, size, deep);
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
