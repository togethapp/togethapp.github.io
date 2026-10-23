/**
 * Games played in the app itself, not scored on paper: for now the Glouton, a
 * maze where one eats every pellet while four ghosts give chase.
 *
 * Pure logic, tested: the maze, the moves, the ghosts' minds, the score. The
 * screen (view-arcade.js) only draws what this says and passes the fingers on.
 * Positions are in tiles, a whole number being the middle of one; time in
 * seconds. Randomness is passed in, so a test replays the same game.
 */

/** The games of the arcade, in the order shown. */
export const ARCADE_GAMES = [{ id: 'glouton', icon: '●' }];

/**
 * The maze. `#` wall, `.` pellet, `o` big pellet, `-` the ghosts' door,
 * `P` where one starts, `G` where the ghosts do (the first one outside). A row
 * open at both ends is a tunnel.
 */
export const GLOUTON_MAZE = [
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

export const ARCADE_DIRS = {
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  right: { x: 1, y: 0 },
};
/** Ghosts weigh their options in this order when two are as good. */
const DIR_ORDER = ['up', 'left', 'down', 'right'];
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const GHOST_NAMES = ['red', 'pink', 'cyan', 'orange'];
/** When each ghost leaves the house, in seconds from the start of a life. */
const RELEASE = [0, 1.5, 5, 9];
/** Scatter, then chase, then scatter… — the last chase lasts for ever. */
const PHASES = [7, 20, 7, 20, 5, 20, 5];
const POINTS = { pellet: 10, power: 50 };
const READY_TIME = 2;
const DYING_TIME = 1.6;
const CLEARED_TIME = 1.8;
const EPSILON = 1e-6;

/** The maze as a grid, with where everyone starts. */
export function parseMaze(rows = GLOUTON_MAZE) {
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
  return { width, height, cells, player, ghosts, door };
}

/** What is at a tile; a tunnel wraps from one side to the other. */
export function cellAt(maze, x, y) {
  if (y < 0 || y >= maze.height) return '#';
  const column = ((x % maze.width) + maze.width) % maze.width;
  return maze.cells[y][column];
}

/** Whether an actor may step on a tile: only a ghost going in or out uses the door. */
export function canEnter(maze, x, y, throughDoor = false) {
  const cell = cellAt(maze, x, y);
  if (cell === '#') return false;
  if (cell === '-') return throughDoor;
  return true;
}

export function pelletsLeft(maze) {
  let count = 0;
  for (const line of maze.cells) for (const cell of line) if (cell === '.' || cell === 'o') count += 1;
  return count;
}

/** A new game, at level one. */
export function newGlouton(rows = GLOUTON_MAZE) {
  const maze = parseMaze(rows);
  const game = { rows, maze, score: 0, lives: 3, level: 1, total: pelletsLeft(maze), eaten: 0 };
  startLife(game);
  return game;
}

/** Everyone back to their place, a short « Prêt ! » before it starts again. */
function startLife(game) {
  const { maze } = game;
  game.player = { x: maze.player.x, y: maze.player.y, dir: 'left', want: 'left', moving: true };
  game.ghosts = maze.ghosts.map((at, index) => ({
    name: GHOST_NAMES[index % GHOST_NAMES.length],
    x: at.x,
    y: at.y,
    dir: index === 0 ? 'left' : null,
    mode: index === 0 ? 'out' : 'house',
    release: RELEASE[index] ?? RELEASE.at(-1) + index,
    home: { x: at.x, y: at.y },
  }));
  game.phase = 0;
  game.phaseTime = 0;
  game.clock = 0;
  game.fright = 0;
  game.chain = 0;
  game.state = 'ready';
  game.timer = READY_TIME;
}

/** Turn: the player goes that way as soon as the maze allows it. */
export function steer(game, dir) {
  if (!ARCADE_DIRS[dir]) return;
  game.player.want = dir;
  // Turning back needs no crossing: it happens at once.
  if (dir === OPPOSITE[game.player.dir]) {
    game.player.dir = dir;
    game.player.moving = true;
  }
}

/** Speeds, in tiles per second, a little faster at each level. */
export function speeds(level) {
  const lift = Math.min(level - 1, 6) * 0.05;
  return {
    player: 6 * (1 + lift / 2),
    ghost: 5.4 * (1 + lift),
    scared: 3.4,
    eaten: 12,
    fright: Math.max(1.5, 6.5 - level),
  };
}

/** Whether an actor stands right in the middle of a tile. */
function centred(actor) {
  return Math.abs(actor.x - Math.round(actor.x)) < EPSILON && Math.abs(actor.y - Math.round(actor.y)) < EPSILON;
}

/**
 * Move an actor `distance` tiles along the maze. At each tile's middle,
 * `choose` says where it goes next (null: it stops there).
 */
function advance(maze, actor, distance, choose) {
  let left = distance;
  for (let guard = 0; left > EPSILON && guard < 64; guard += 1) {
    if (centred(actor)) {
      actor.x = Math.round(actor.x);
      actor.y = Math.round(actor.y);
      // Out of one side of the tunnel, in at the other.
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

/** The player's choice at a tile's middle: the wished way, else straight on, else stop. */
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

/** The tile right above the door: where a ghost leaving the house heads. */
function exitTile(maze) {
  return { x: maze.door.x, y: maze.door.y - 1 };
}

/** Where a ghost wants to go. Each has its own mind, as in the old arcades. */
export function ghostTarget(game, ghost) {
  const { maze, player } = game;
  if (ghost.mode === 'eaten') return { x: maze.door.x, y: maze.door.y + 1 };
  if (ghost.mode === 'leaving') return exitTile(maze);
  const corners = {
    red: { x: maze.width - 2, y: -2 },
    pink: { x: 1, y: -2 },
    cyan: { x: maze.width - 1, y: maze.height },
    orange: { x: 0, y: maze.height },
  };
  const scatter = PHASES.length > game.phase && game.phase % 2 === 0;
  if (scatter) return corners[ghost.name];
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

/**
 * A ghost's choice at a tile's middle: never straight back unless walled in;
 * the way closest to its target, or any way when it is scared.
 */
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

/** Eat what is under the player's middle. */
function eatAt(game) {
  const { maze, player } = game;
  if (!centred(player)) return;
  const x = ((Math.round(player.x) % maze.width) + maze.width) % maze.width;
  const y = Math.round(player.y);
  const cell = maze.cells[y][x];
  if (cell === '.') {
    game.score += POINTS.pellet;
    game.events.push('pellet');
  } else if (cell === 'o') {
    game.score += POINTS.power;
    game.fright = speeds(game.level).fright;
    game.chain = 0;
    for (const ghost of game.ghosts) {
      if (ghost.mode !== 'out') continue;
      ghost.scared = true;
      // Frightened, every ghost turns back at once.
      if (ghost.dir) ghost.dir = OPPOSITE[ghost.dir];
    }
    game.events.push('power');
  } else {
    return;
  }
  maze.cells[y][x] = ' ';
  game.eaten += 1;
}

/** Whether the player and a ghost touch. */
function touching(a, b, width) {
  let dx = Math.abs(a.x - b.x);
  dx = Math.min(dx, width - dx);
  return dx < 0.6 && Math.abs(a.y - b.y) < 0.6;
}

/**
 * Let `dt` seconds go by. Returns what happened, for the screen to make
 * something of it: 'pellet', 'power', 'ghost', 'caught', 'cleared', 'over'.
 */
export function stepGlouton(game, dt, random = Math.random) {
  game.events = [];
  const time = Math.min(Math.max(dt, 0), 0.1);
  if (game.state === 'over' || game.state === 'paused') return game.events;
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
      startLife(game);
    } else {
      game.state = 'play';
    }
    return game.events;
  }

  const speed = speeds(game.level);
  game.clock += time;
  if (game.fright > 0) {
    game.fright = Math.max(0, game.fright - time);
    if (!game.fright) for (const ghost of game.ghosts) ghost.scared = false;
  } else if (game.phase < PHASES.length) {
    game.phaseTime += time;
    if (game.phaseTime >= PHASES[game.phase]) {
      game.phaseTime = 0;
      game.phase += 1;
      // A change of mind shows: they all turn back.
      for (const ghost of game.ghosts) if (ghost.mode === 'out' && ghost.dir) ghost.dir = OPPOSITE[ghost.dir];
    }
  }

  // The player moves in small steps, eating on the way.
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
    const pace = ghost.mode === 'eaten' ? speed.eaten : ghost.scared ? speed.scared : speed.ghost;
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
      game.score += 100 * 2 ** game.chain;
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

  if (!pelletsLeft(maze)) {
    game.state = 'cleared';
    game.timer = CLEARED_TIME;
    game.events.push('cleared');
  }
  return game.events;
}

/** Pause or carry on; nothing to do once it is over. */
export function togglePause(game) {
  if (game.state === 'paused') game.state = game.pausedFrom || 'play';
  else if (game.state !== 'over') {
    game.pausedFrom = game.state;
    game.state = 'paused';
  }
  return game.state;
}
