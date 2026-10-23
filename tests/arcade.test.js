import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ARCADE_DIRS, GLOUTON_MAZE, canEnter, cellAt, newGlouton, parseMaze, pelletsLeft, steer, stepGlouton, togglePause,
} from '../src/arcade.js';

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
  steer(game, 'right');
  assert.equal(game.player.dir, 'right');
  stepGlouton(game, 0.05);
  assert.ok(game.player.x > x);
  steer(game, 'up');
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
    if (frame % 20 === 0) steer(game, ways[Math.floor(random() * 4)]);
    stepGlouton(game, 1 / 60, random);
    for (const actor of [game.player, ...game.ghosts]) {
      const cell = cellAt(game.maze, Math.round(actor.x), Math.round(actor.y));
      assert.notEqual(cell, '#', `${actor.name || 'player'} in a wall`);
      assert.ok(Number.isFinite(actor.x) && Number.isFinite(actor.y));
    }
  }
  assert.equal(game.state, 'over');
});
