/**
 * The arcade on screen: the games one plays in the app itself, listed on the
 * Games tab, each on its own page (#/arcade/<id>).
 *
 * The logic is in arcade.js; this draws it on a canvas and passes on the
 * fingers (a swipe on the maze, the arrows under it) and the keyboard. The
 * game outlives a redraw of the page — the app redraws whenever the database
 * says something — and pauses when the page is left or hidden.
 */

import { backButtonHtml, escapeHtml, state } from './app.js';
import { ARCADE_GAMES, cellAt, newGlouton, steer, stepGlouton, togglePause } from './arcade.js';
import { savePrefs } from './storage.js';
import { t } from './i18n.js';

/** The game being played, kept across redraws. */
let arcadeRun = null;

const GHOST_COLOURS = { red: '#ff4b5c', pink: '#ff8fd8', cyan: '#5ff3ff', orange: '#ffad4d' };
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
        <span class="arcade-card__icon" aria-hidden="true">${escapeHtml(game.icon)}</span>
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
    </section>`;
}

export function arcadeView(id) {
  const game = ARCADE_GAMES.find((known) => known.id === id);
  if (!game) return '';
  const arrow = ([dir, path]) => `
    <button type="button" class="arcade-pad__key arcade-pad__key--${dir}" data-arcade-dir="${dir}"
            aria-label="${escapeHtml(t(`arcade.dir.${dir}`))}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>
    </button>`;
  return `
    <div class="spread page-head">
      ${backButtonHtml('#/games')}
      <h1>${escapeHtml(t(`arcade.${id}.name`))}</h1>
    </div>
    <div class="arcade">
      <div class="arcade__hud">
        <span>${escapeHtml(t('arcade.score'))} <strong id="arcade-score">0</strong></span>
        <span>${escapeHtml(t('arcade.level'))} <strong id="arcade-level">1</strong></span>
        <span>${escapeHtml(t('arcade.record'))} <strong id="arcade-best">${bestOf(id)}</strong></span>
        <span id="arcade-lives" class="arcade__lives"></span>
      </div>
      <canvas id="arcade-board" class="arcade__board" role="img" aria-label="${escapeHtml(t(`arcade.${id}.name`))}"></canvas>
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
  if (!canvas) return;
  if (!arcadeRun || arcadeRun.id !== id) arcadeRun = { id, game: newGlouton(), shown: null };
  const run = arcadeRun;
  run.shown = null;
  const context = canvas.getContext('2d');

  const restartOrResume = () => {
    if (run.game.state === 'over') run.game = newGlouton();
    else if (run.game.state === 'paused') togglePause(run.game);
  };
  const go = (dir) => {
    restartOrResume();
    steer(run.game, dir);
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
  document.getElementById('arcade-pause').addEventListener('click', () => {
    if (run.game.state === 'over') run.game = newGlouton();
    else togglePause(run.game);
  });

  // A swipe on the maze steers; the finger may go on and turn again.
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
    const dir = KEYS[event.key] || KEYS[event.key?.toLowerCase?.()];
    if (dir) {
      event.preventDefault();
      go(dir);
    } else if (event.key === ' ' || event.key === 'p' || event.key === 'Escape') {
      event.preventDefault();
      if (run.game.state === 'over') run.game = newGlouton();
      else togglePause(run.game);
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
      // Left, or redrawn: the next page binds again if it is still this one.
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
      if (!['paused', 'over'].includes(run.game.state)) togglePause(run.game);
      return;
    }
    const dt = last === null ? 0 : (now - last) / 1000;
    last = now;
    const events = stepGlouton(run.game, dt);
    if (events.includes('caught')) navigator.vibrate?.(200);
    if (events.includes('over')) keepBest(id, run.game.score);
    drawGlouton(canvas, context, run.game, now);
    showHud(run, id);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** The numbers and the line under the maze, touched only when they change. */
function showHud(run, id) {
  const { game } = run;
  const status = {
    ready: t('arcade.ready'),
    paused: t('arcade.paused'),
    dying: t('arcade.caught'),
    cleared: t('arcade.cleared', { level: game.level }),
    over: t('arcade.over', { score: game.score }),
    play: '',
  }[game.state];
  const shown = `${game.score}|${game.level}|${game.lives}|${status}`;
  if (run.shown === shown) return;
  run.shown = shown;
  document.getElementById('arcade-score').textContent = game.score;
  document.getElementById('arcade-level').textContent = game.level;
  document.getElementById('arcade-best').textContent = Math.max(bestOf(id), game.score);
  const lives = document.getElementById('arcade-lives');
  lives.textContent = '●'.repeat(Math.max(0, game.lives));
  lives.setAttribute('aria-label', t('arcade.lives', { count: Math.max(0, game.lives) }));
  document.getElementById('arcade-status').textContent = status;
  const pause = document.getElementById('arcade-pause');
  const label = t(game.state === 'over' ? 'arcade.again' : game.state === 'paused' ? 'arcade.resume' : 'arcade.pause');
  pause.setAttribute('aria-label', label);
  pause.title = label;
  pause.innerHTML = ['over', 'paused'].includes(game.state) ? PLAY_ICON : PAUSE_ICON;
}

/** The maze, the pellets, the ghosts and the glutton, in the style's light. */
function drawGlouton(canvas, context, game, now) {
  const { maze } = game;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = canvas.clientWidth;
  if (!width) return;
  const size = width / maze.width;
  const height = size * maze.height;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const root = getComputedStyle(document.documentElement);
  const token = (name, fallback) => {
    const value = root.getPropertyValue(name).trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  };
  const wall = token('--holo-hue', '#5ff3ff');
  const deep = token('--holo-deep', '#03060d');

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = deep;
  context.fillRect(0, 0, width, height);

  // Walls: a glowing tube from each wall tile to the next.
  const wallAt = (x, y) => x >= 0 && x < maze.width && y >= 0 && y < maze.height && maze.cells[y][x] === '#';
  const centre = (value) => (value + 0.5) * size;
  context.lineCap = 'round';
  context.lineJoin = 'round';
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
  context.strokeStyle = wall;
  context.shadowColor = wall;
  context.shadowBlur = size / 2;
  context.globalAlpha = 0.35;
  context.lineWidth = size * 0.55;
  context.stroke();
  context.globalAlpha = 1;
  context.shadowBlur = size / 4;
  context.lineWidth = Math.max(1.5, size * 0.14);
  context.stroke();
  context.shadowBlur = 0;

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
  context.fillStyle = '#ffd23f';
  context.shadowColor = '#ffd23f';
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

  const banner = { ready: t('arcade.ready'), paused: t('arcade.paused'), over: t('arcade.overShort') }[game.state]
    || (game.state === 'cleared' ? t('arcade.cleared', { level: game.level }) : '');
  if (banner) {
    context.font = `700 ${Math.round(size * 1.1)}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const y = (maze.door.y + 3.5) * size;
    context.fillStyle = deep;
    const boxWidth = context.measureText(banner).width + size;
    context.fillRect(width / 2 - boxWidth / 2, y - size * 0.8, boxWidth, size * 1.6);
    context.fillStyle = '#ffd23f';
    context.fillText(banner, width / 2, y);
  }
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
