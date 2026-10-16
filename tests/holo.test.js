import test from 'node:test';
import assert from 'node:assert/strict';

import {
  holoGraph, holoOrbits, holoPositions, holoProject, holoTurn, holoHash, holoOrbitPoint, HOLO_OUTSIDE,
} from '../src/holo.js';

const groups = [{ id: 'g1', name: 'Famille' }, { id: 'g2', name: 'Copains' }];

function held() {
  return {
    polls: [
      { id: 'ev', kind: 'poll', groupId: 'g1', date: '2026-12-24', people: [{ name: 'Alice' }, { name: 'Bob' }] },
      { id: 'q', kind: 'poll', groupId: 'g2', people: [{ name: 'Chloé' }], closedAt: 5 },
    ],
    lists: [
      { id: 'l1', kind: 'list', groupId: 'g1', parent: 'ev', people: [{ name: 'Alice' }], items: [], links: [{ id: 's1', kind: 'with' }] },
      { id: 'l2', kind: 'list', groupId: 'g2', people: [], items: [], links: [{ id: 'q', kind: 'after' }] },
      { id: 'old', kind: 'list', groupId: 'g2', archivedAt: 1, items: [] },
    ],
    spends: [{ id: 's1', kind: 'spend', groupId: 'g1', people: [{ name: 'Bob' }], lines: [], links: [{ id: 'l1', kind: 'with' }] }],
    games: [{ id: 'gm', presetId: 'papayoo', players: [{ name: 'Zoé' }], rounds: [] }],
    boards: [{ id: 'b1', kind: 'board', groupId: 'g2', linkOnly: true, cards: [] }],
  };
}

const ids = (list) => list.map((one) => one.id).sort();

test('groups are stars, live documents orbit them, and nobody is in the sky', () => {
  const graph = holoGraph(held(), groups, undefined, '2026-10-16');
  assert.deepEqual(ids(graph.hubs), ['g:g1', 'g:g2', HOLO_OUTSIDE].sort());
  assert.deepEqual(ids(graph.docs), ['d:b1', 'd:ev', 'd:gm', 'd:l1', 'd:l2', 'd:q', 'd:s1']);
  const names = JSON.stringify([graph.hubs.map((hub) => hub.label), graph.docs.map((doc) => [doc.id, doc.label, doc.kind])]);
  for (const person of ['Alice', 'Bob', 'Chloé', 'Zoé']) assert.ok(!names.includes(person), `${person} is not drawn`);
  assert.equal(graph.docs.find((doc) => doc.id === 'd:ev').kind, 'event');
  assert.equal(graph.docs.find((doc) => doc.id === 'd:gm').kind, 'game');
});

test('a document circles its event, else its star; link-only and loose ones go outside', () => {
  const graph = holoGraph(held(), groups, undefined, '2026-10-16');
  const around = (id) => graph.docs.find((doc) => doc.id === `d:${id}`).around;
  assert.equal(around('l1'), 'd:ev');
  assert.equal(around('ev'), 'g:g1');
  assert.equal(around('l2'), 'g:g2');
  assert.equal(around('gm'), HOLO_OUTSIDE);
  assert.equal(around('b1'), HOLO_OUTSIDE, 'a link-only document belongs to no group');
  const count = Object.fromEntries(graph.hubs.map((hub) => [hub.id, hub.count]));
  assert.deepEqual(count, { 'g:g1': 3, 'g:g2': 2, [HOLO_OUTSIDE]: 2 });
});

test('what is finished says so; a board never is', () => {
  const graph = holoGraph(held(), groups, undefined, '2026-10-16');
  const done = (id) => graph.docs.find((doc) => doc.id === `d:${id}`).done;
  assert.equal(done('q'), true, 'a closed poll');
  assert.equal(done('ev'), false, 'an event still ahead');
  assert.equal(done('b1'), null);
});

test('a link held on both sides is one arc; an order runs from first to after', () => {
  const { links } = holoGraph(held(), groups);
  assert.equal(links.length, 2);
  assert.deepEqual(links.find((link) => link.kind === 'order'), { from: 'd:q', to: 'd:l2', kind: 'order' });
});

test('a chain that loops is broken rather than circled for ever', () => {
  const graph = holoGraph({ lists: [
    { id: 'a', kind: 'list', groupId: 'g1', parent: 'b', items: [] },
    { id: 'b', kind: 'list', groupId: 'g1', parent: 'a', items: [] },
  ] }, groups);
  assert.ok(graph.docs.some((doc) => doc.around === 'g:g1'));
  assert.doesNotThrow(() => holoPositions(holoOrbits(graph), 1000));
});

test('nothing held: a sky with only the stars, or nothing at all', () => {
  assert.deepEqual(holoGraph({}, []), { hubs: [], docs: [], links: [] });
  const lone = holoOrbits(holoGraph({}, [groups[0]]));
  assert.deepEqual([...holoPositions(lone).values()], [{ x: 0, y: 0, z: 0 }]);
});

function crowd(groupCount, docCount) {
  const groupList = Array.from({ length: groupCount }, (_, i) => ({ id: `g${i}`, name: `G${i}` }));
  const lists = Array.from({ length: docCount }, (_, i) => ({
    id: `l${i}`, kind: 'list', groupId: `g${i % groupCount}`, items: [], ...(i % 7 === 3 ? { parent: `l${i - 3}` } : {}),
  }));
  return holoGraph({ lists }, groupList);
}

test('the whole sky fits in the unit ball, at any time, however full', () => {
  for (const [groupCount, docCount] of [[1, 1], [1, 40], [2, 9], [3, 30], [12, 200]]) {
    const orbits = holoOrbits(crowd(groupCount, docCount));
    for (const time of [0, 12345, 9e6]) {
      for (const [id, point] of holoPositions(orbits, time)) {
        const radius = Math.hypot(point.x, point.y, point.z);
        assert.ok(Number.isFinite(radius) && radius <= 1 + 1e-9, `${groupCount}/${docCount} ${id} at ${radius}`);
      }
    }
  }
});

test('the same documents give the same sky; time turns it without changing distances', () => {
  const first = holoPositions(holoOrbits(crowd(3, 30)), 5000);
  const again = holoPositions(holoOrbits(crowd(3, 30)), 5000);
  assert.deepEqual([...first], [...again]);
  const orbits = holoOrbits(crowd(3, 30));
  const before = holoPositions(orbits, 0);
  const after = holoPositions(orbits, 20000);
  let moved = 0;
  for (const body of orbits.bodies) {
    const distance = (at) => {
      const point = at.get(body.id);
      const centre = at.get(body.centre);
      return Math.hypot(point.x - centre.x, point.y - centre.y, point.z - centre.z);
    };
    assert.ok(Math.abs(distance(before) - distance(after)) < 1e-9, 'an orbit keeps its radius');
    assert.ok(Math.abs(distance(before) - body.radius * orbits.scale) < 1e-9);
    if (Math.hypot(before.get(body.id).x - after.get(body.id).x, before.get(body.id).z - after.get(body.id).z) > 1e-6) moved += 1;
  }
  assert.ok(moved > 0, 'the orbits turn');
});

test('a moon circles close to its event, and spread 0 puts everyone on their star', () => {
  const graph = holoGraph(held(), groups);
  const orbits = holoOrbits(graph);
  const moon = orbits.bodies.find((body) => body.id === 'd:l1');
  const planet = orbits.bodies.find((body) => body.id === 'd:ev');
  assert.equal(moon.centre, 'd:ev');
  assert.ok(moon.radius < planet.radius);
  assert.ok(orbits.bodies.indexOf(planet) < orbits.bodies.indexOf(moon), 'a centre is placed before what circles it');
  const folded = holoPositions(orbits, 0, 0);
  assert.deepEqual(folded.get('d:l1'), folded.get('g:g1'));
});

test('a point on an orbit is at its radius from the centre', () => {
  for (const angle of [0, 1, 2.5, 4]) {
    const point = holoOrbitPoint({ radius: 0.3, ax: 0.4, az: -0.7 }, angle);
    assert.ok(Math.abs(Math.hypot(point.x, point.y, point.z) - 0.3) < 1e-12);
  }
});

test('projection: the middle in the middle, nearer is larger, looking down on the table', () => {
  const view = { cx: 100, cy: 50, unit: 40 };
  const centre = holoProject({ x: 0, y: 0, z: 0 }, {}, view);
  assert.deepEqual([centre.x, centre.y, centre.scale], [100, 50, 1]);
  const near = holoProject({ x: 0, y: 0, z: -0.5 }, {}, view);
  const far = holoProject({ x: 0, y: 0, z: 0.5 }, {}, view);
  assert.ok(near.scale > far.scale && near.depth < far.depth);
  // From above, the far side of the floor rises up the screen.
  const camera = { pitch: 0.5 };
  const floorFar = holoProject({ x: 0, y: -0.6, z: 1 }, camera, view);
  const floorNear = holoProject({ x: 0, y: -0.6, z: -1 }, camera, view);
  assert.ok(floorFar.y < floorNear.y);
  const turned = holoTurn({ x: 1, y: 0, z: 0 }, { yaw: Math.PI / 2 });
  assert.ok(Math.abs(turned.x) < 1e-12 && Math.abs(turned.z - 1) < 1e-12, 'a quarter turn sends the side away');
});

test('the hash is stable and in [0, 1)', () => {
  assert.equal(holoHash('abc'), holoHash('abc'));
  assert.notEqual(holoHash('abc'), holoHash('abd'));
  for (const text of ['', 'a', 'éé', 'x'.repeat(100)]) {
    const value = holoHash(text, 3);
    assert.ok(value >= 0 && value < 1);
  }
});
