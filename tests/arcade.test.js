import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ARCADE_DIRS, ARCADE_GAMES, GLOUTON_MAZE, SNAKE_SIZE, canEnter, cellAt, newGlouton, newSnake, parseMaze, pelletsLeft,
  snakeRate, starPoints, steerGlouton, steerSnake, stepGlouton, stepSnake, togglePause,
} from '../src/arcade.js';
import { t, setLanguage } from '../src/i18n.js';

/** A random that always says the same, so a game replays the same way. */
function seeded(seed = 1) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

/** Run a game for `seconds`, in frames of a sixtieth. */
function run(game, seconds, random = seeded()) {
  const events = [];
  for (let time = 0; time < seconds; time += 1 / 60) events.push(...stepGlouton(game, 1 / 60, random));
  return events;
}

/** Every tile one can walk to from (x, y). */
function reachable(maze, from, throughDoor = false) {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift();
    for (const step of Object.values(ARCADE_DIRS)) {
      const x = (at.x + step.x + maze.width) % maze.width;
      const y = at.y + step.y;
      const key = `${x},${y}`;
      if (seen.has(key) || !canEnter(maze, x, y, throughDoor)) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return seen;
}

test('the maze is rectangular, with one player, four ghosts and a door', () => {
  const width = GLOUTON_MAZE[0].length;
  for (const row of GLOUTON_MAZE) assert.equal(row.length, width, `row « ${row} »`);
  const maze = parseMaze();
  assert.ok(maze.player);
  assert.equal(maze.ghosts.length, 4);
  assert.ok(maze.door);
  assert.equal(cellAt(maze, maze.door.x, maze.door.y - 1), ' ', 'the tile above the door is open');
});

test('every pellet can be reached, and the door is closed to the player', () => {
  const maze = parseMaze();
  const walk = reachable(maze, maze.player);
  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      if (['.', 'o'].includes(maze.cells[y][x])) assert.ok(walk.has(`${x},${y}`), `pellet at ${x},${y}`);
    }
  }
  assert.equal(walk.has(`${maze.door.x},${maze.door.y}`), false);
  assert.ok(pelletsLeft(maze) > 100);
});

test('no dead end where a ghost, never turning back, would be stuck', () => {
  const maze = parseMaze();
  for (const key of reachable(maze, maze.player)) {
    const [x, y] = key.split(',').map(Number);
    const ways = Object.values(ARCADE_DIRS).filter((step) => canEnter(maze, x + step.x, y + step.y, true)).length;
    assert.ok(ways >= 2, `dead end at ${x},${y}`);
  }
});

test('the tunnel goes through from one side to the other', () => {
  const maze = parseMaze();
  const row = 9;
  assert.equal(GLOUTON_MAZE[row][0], ' ');
  assert.equal(cellAt(maze, -1, row), cellAt(maze, maze.width - 1, row));
});

test('nothing moves during « Prêt ! », then the player eats', () => {
  const game = newGlouton();
  const start = { ...game.player };
  run(game, 1.5);
  assert.deepEqual({ x: game.player.x, y: game.player.y }, { x: start.x, y: start.y });
  run(game, 1.5);
  assert.notEqual(game.player.x, start.x);
  assert.ok(game.score > 0, 'pellets eaten on the way');
  assert.equal(game.score % 10, 0);
});

test('the player stops against a wall and never walks into one', () => {
  const game = newGlouton();
  game.ghosts = [];
  game.state = 'play';
  for (let i = 0; i < 600; i += 1) {
    stepGlouton(game, 1 / 60);
    const x = Math.round(game.player.x);
    const y = Math.round(game.player.y);
    assert.notEqual(cellAt(game.maze, x, y), '#', `in a wall at ${x},${y}`);
  }
  assert.equal(game.player.moving, false, 'stopped at the end of the corridor');
});

test('turning back happens at once; a turn waits for an opening', () => {
  const game = newGlouton();
  game.ghosts = [];
  game.state = 'play';
  stepGlouton(game, 0.05);
  const x = game.player.x;
  steerGlouton(game, 'right');
  assert.equal(game.player.dir, 'right');
  stepGlouton(game, 0.05);
  assert.ok(game.player.x > x);
  steerGlouton(game, 'up');
  assert.equal(game.player.dir, 'right', 'no turning into a wall');
  assert.equal(game.player.want, 'up');
});

test('a big pellet frightens the ghosts, and a frightened ghost is eaten', () => {
  const game = newGlouton();
  game.state = 'play';
  const big = { x: 1, y: 15 };
  assert.equal(game.maze.cells[big.y][big.x], 'o');
  Object.assign(game.player, { x: big.x + 1, y: big.y, dir: 'left', want: 'left' });
  const red = game.ghosts[0];
  Object.assign(red, { x: 1, y: 17, dir: 'up', mode: 'out' });
  const events = [];
  for (let i = 0; i < 30 && !events.includes('power'); i += 1) events.push(...stepGlouton(game, 1 / 60));
  assert.ok(events.includes('power'));
  assert.equal(red.scared, true);
  Object.assign(red, { x: game.player.x, y: game.player.y });
  const before = game.score;
  assert.ok(stepGlouton(game, 1 / 60).includes('ghost'));
  assert.equal(red.mode, 'eaten');
  assert.equal(game.score - before >= 200, true);
});

test('an eaten ghost finds its way home and comes out again', () => {
  for (const start of [{ x: 1, y: 1 }, { x: 17, y: 19 }, { x: 4, y: 9 }, { x: 1, y: 19 }, { x: 17, y: 1 }]) {
    const game = newGlouton();
    game.state = 'play';
    game.player.x = 9;
    game.player.y = 3;
    game.lives = 99;
    const ghost = game.ghosts[0];
    game.ghosts = [ghost];
    Object.assign(ghost, { ...start, dir: null, mode: 'eaten' });
    let went = false;
    for (let i = 0; i < 60 * 15 && !(went && ghost.mode === 'out'); i += 1) {
      stepGlouton(game, 1 / 60);
      if (ghost.mode === 'leaving') went = true;
      if (game.state !== 'play') game.state = 'play';
    }
    assert.ok(went, `home from ${start.x},${start.y}`);
    assert.equal(ghost.mode, 'out', `out again from ${start.x},${start.y}`);
  }
});

test('the ghosts all leave the house', () => {
  const game = newGlouton();
  game.lives = 99;
  const random = seeded(7);
  for (let i = 0; i < 60 * 14; i += 1) {
    stepGlouton(game, 1 / 60, random);
    // Caught meanwhile: carry on from where everyone is.
    if (game.state === 'dying') game.state = 'play';
  }
  for (const ghost of game.ghosts) assert.equal(ghost.mode, 'out', ghost.name);
});

test('caught: a life lost, everyone back in place; no lives left: over', () => {
  const game = newGlouton();
  game.state = 'play';
  const red = game.ghosts[0];
  Object.assign(red, { x: game.player.x, y: game.player.y });
  assert.ok(stepGlouton(game, 1 / 60).includes('caught'));
  assert.equal(game.lives, 2);
  run(game, 2);
  assert.equal(game.state, 'ready');
  assert.equal(game.player.x, game.maze.player.x);
  game.lives = 1;
  game.state = 'play';
  Object.assign(game.ghosts[0], { x: game.player.x, y: game.player.y });
  stepGlouton(game, 1 / 60);
  const events = run(game, 2);
  assert.ok(events.includes('over'));
  assert.equal(game.state, 'over');
});

test('the last pellet clears the level, and the next one is faster and full again', () => {
  const game = newGlouton();
  game.state = 'play';
  game.ghosts = [];
  const rows = game.maze.cells;
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) if (['.', 'o'].includes(rows[y][x])) rows[y][x] = ' ';
  }
  rows[15][8] = '.';
  assert.ok(stepGlouton(game, 0.1).includes('cleared') || run(game, 0.5).includes('cleared'));
  run(game, 2.5);
  assert.equal(game.level, 2);
  assert.ok(pelletsLeft(game.maze) > 100);
  assert.equal(game.ghosts.length, 4);
});

test('a paused game stands still', () => {
  const game = newGlouton();
  run(game, 2.5);
  assert.equal(togglePause(game), 'paused');
  const at = { ...game.player };
  run(game, 1);
  assert.equal(game.player.x, at.x);
  assert.equal(togglePause(game), 'play');
});

test('a whole game played by a random hand ends, and nobody goes through walls', () => {
  const random = seeded(3);
  const game = newGlouton();
  const ways = Object.keys(ARCADE_DIRS);
  for (let frame = 0; frame < 60 * 600 && game.state !== 'over'; frame += 1) {
    if (frame % 20 === 0) steerGlouton(game, ways[Math.floor(random() * 4)]);
    stepGlouton(game, 1 / 60, random);
    for (const actor of [game.player, ...game.ghosts]) {
      const cell = cellAt(game.maze, Math.round(actor.x), Math.round(actor.y));
      assert.notEqual(cell, '#', `${actor.name || 'player'} in a wall`);
      assert.ok(Number.isFinite(actor.x) && Number.isFinite(actor.y));
    }
  }
  assert.equal(game.state, 'over');
});

/* ------------------------------------------------------------------ snake --- */

/** One step of the snake, exactly: the time it takes to move one tile, in two frames. */
function slide(game, random = seeded()) {
  const step = 1 / snakeRate(game.apples);
  const events = stepSnake(game, step / 2, random);
  return [...events, ...stepSnake(game, step / 2 + 1e-9, random)];
}

/** Put the apple somewhere out of the way, so that a test decides what is eaten. */
function appleAside(game) {
  game.apple = { x: 0, y: game.height - 1 };
}

test('every game of the arcade has a name, a line and its rules, in both languages', () => {
  for (const language of ['fr', 'en']) {
    setLanguage(language);
    for (const { id } of ARCADE_GAMES) {
      for (const key of ['name', 'short', 'rules']) {
        const text = t(`arcade.${id}.${key}`);
        assert.ok(text && text !== `arcade.${id}.${key}`, `${language}: arcade.${id}.${key}`);
      }
    }
  }
  setLanguage('fr');
  assert.equal(t('arcade.over', { score: 0 }), 'Partie terminée : 0 point. Touchez le jeu pour rejouer.');
  assert.match(t('arcade.over', { score: 120 }), /120 points/);
});

test('a new snake: three tiles in the middle, facing right, an apple beside it, waiting', () => {
  const game = newSnake(seeded(2));
  assert.equal(game.body.length, 3);
  assert.deepEqual(game.body[0], { x: Math.floor(SNAKE_SIZE / 2) - 2, y: Math.floor(SNAKE_SIZE / 2) });
  assert.equal(game.dir, 'right');
  assert.equal(game.state, 'ready');
  assert.ok(game.apple);
  assert.equal(game.body.some((part) => part.x === game.apple.x && part.y === game.apple.y), false);
  stepSnake(game, 1);
  assert.deepEqual(game.body[0], { x: Math.floor(SNAKE_SIZE / 2) - 2, y: Math.floor(SNAKE_SIZE / 2) }, 'still until the first move');
});

test('the first move starts it; it goes one tile per step and never straight back', () => {
  const game = newSnake(seeded());
  appleAside(game);
  steerSnake(game, 'up');
  assert.equal(game.state, 'play');
  const { x, y } = game.body[0];
  slide(game);
  assert.deepEqual(game.body[0], { x, y: y - 1 });
  assert.deepEqual(game.trail, { x: x - 2, y }, 'the tail left its tile');
  steerSnake(game, 'down');
  slide(game);
  assert.deepEqual(game.body[0], { x, y: y - 2 }, 'no turning back into itself');
  assert.equal(game.body.length, 3);
});

test('two quick turns are both taken, one tile after the other', () => {
  const game = newSnake(seeded());
  appleAside(game);
  steerSnake(game, 'right');
  const { x, y } = game.body[0];
  steerSnake(game, 'up');
  steerSnake(game, 'left');
  slide(game);
  assert.deepEqual(game.body[0], { x, y: y - 1 });
  slide(game);
  assert.deepEqual(game.body[0], { x: x - 1, y: y - 1 });
});

test('an apple: one tile longer, ten points, a new apple elsewhere, a little faster', () => {
  const game = newSnake(seeded());
  steerSnake(game, 'right');
  const head = game.body[0];
  game.apple = { x: head.x + 1, y: head.y };
  const events = slide(game);
  assert.ok(events.includes('apple'));
  assert.equal(game.body.length, 4);
  assert.equal(game.score, 10);
  assert.equal(game.trail, null, 'growing, the tail stays');
  assert.deepEqual(game.swallowing, { x: head.x + 1, y: head.y });
  assert.ok(game.apple);
  assert.equal(game.body.some((part) => part.x === game.apple.x && part.y === game.apple.y), false);
  assert.ok(snakeRate(1) > snakeRate(0));
  assert.ok(snakeRate(1000) <= 14, 'not faster than a finger');
});

test('into the wall: a crash, then the game is over', () => {
  const game = newSnake(seeded());
  appleAside(game);
  steerSnake(game, 'up');
  const events = [];
  for (let i = 0; i < 60 * 5 && game.state === 'play'; i += 1) events.push(...stepSnake(game, 1 / 60));
  assert.ok(events.includes('crash'));
  assert.equal(game.state, 'dying');
  assert.equal(game.body[0].y, 0, 'stopped against the wall');
  assert.equal(game.progress, 1);
  const after = [];
  for (let i = 0; i < 60 * 2; i += 1) after.push(...stepSnake(game, 1 / 60));
  assert.ok(after.includes('over'));
  assert.equal(game.state, 'over');
});

test('biting its tail is a crash; following its tail out of a tile is not', () => {
  const game = newSnake(seeded());
  appleAside(game);
  // A square of four: the head goes where the tail is just leaving.
  game.state = 'play';
  game.body = [{ x: 6, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }];
  game.dir = 'right';
  game.queue = ['down'];
  let events = slide(game);
  assert.equal(events.includes('crash'), false, 'the tail was leaving that tile');
  assert.deepEqual(game.body[0], { x: 6, y: 6 });
  // Longer, the same move bites.
  const long = newSnake(seeded());
  appleAside(long);
  long.body = [{ x: 6, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 6 }];
  long.dir = 'right';
  long.state = 'play';
  long.queue = ['down'];
  events = slide(long);
  assert.ok(events.includes('crash'));
});

test('a star every five apples, worth more the sooner, gone after a while', () => {
  const game = newSnake(seeded(5));
  steerSnake(game, 'right');
  game.apples = 4;
  const head = game.body[0];
  game.apple = { x: head.x + 1, y: head.y };
  slide(game);
  assert.ok(game.star, 'a star after the fifth apple');
  assert.ok(starPoints(6) > starPoints(1));
  assert.equal(starPoints(0.2), starPoints(1));
  // Caught at once.
  const before = game.score;
  const left = game.star.left;
  appleAside(game);
  game.star = { x: game.body[0].x + 1, y: game.body[0].y, left };
  const events = slide(game);
  assert.ok(events.includes('star'));
  assert.equal(game.score - before, starPoints(left - 1 / snakeRate(game.apples) - 1e-9));
  assert.equal(game.star, null);
  // Left alone, it goes out.
  game.star = { x: 0, y: 0, left: 1 };
  game.state = 'play';
  game.body = [{ x: 8, y: 2 }, { x: 7, y: 2 }, { x: 6, y: 2 }];
  game.dir = 'down';
  game.queue = [];
  for (let i = 0; i < 70; i += 1) stepSnake(game, 1 / 60);
  assert.equal(game.star, null);
});

test('a snake that fills the whole field has won', () => {
  const game = newSnake(seeded());
  Object.assign(game, {
    width: 3, height: 1, body: [{ x: 1, y: 0 }, { x: 0, y: 0 }], dir: 'right', queue: [], apple: { x: 2, y: 0 },
    star: null, state: 'play',
  });
  const events = slide(game);
  assert.ok(events.includes('over'));
  assert.equal(game.won, true);
  assert.equal(game.state, 'over');
});

test('a paused snake stands still, and goes on where it was', () => {
  const game = newSnake(seeded());
  appleAside(game);
  steerSnake(game, 'right');
  stepSnake(game, 0.05);
  const progress = game.progress;
  const head = { ...game.body[0] };
  assert.equal(togglePause(game), 'paused');
  stepSnake(game, 1);
  assert.deepEqual(game.body[0], head);
  assert.equal(game.progress, progress);
  steerSnake(game, 'up');
  assert.deepEqual(game.queue, [], 'no turn taken while paused');
  assert.equal(togglePause(game), 'play');
});

test('played by a random hand, the snake stays on the field, in one piece, until it crashes', () => {
  const random = seeded(11);
  const ways = Object.keys(ARCADE_DIRS);
  for (let round = 0; round < 20; round += 1) {
    const game = newSnake(random);
    steerSnake(game, 'up');
    for (let frame = 0; frame < 60 * 120 && game.state === 'play'; frame += 1) {
      if (frame % 9 === 0) steerSnake(game, ways[Math.floor(random() * 4)]);
      stepSnake(game, 1 / 60, random);
      const tiles = new Set(game.body.map((part) => `${part.x},${part.y}`));
      assert.equal(tiles.size, game.body.length, 'never on itself');
      for (const part of game.body) {
        assert.ok(part.x >= 0 && part.y >= 0 && part.x < game.width && part.y < game.height, 'on the field');
      }
      assert.ok(game.progress >= 0 && game.progress <= 1);
      if (game.apple) assert.equal(tiles.has(`${game.apple.x},${game.apple.y}`), false, 'no apple under the snake');
    }
    assert.notEqual(game.state, 'play', 'a random hand crashes sooner or later');
  }
});
