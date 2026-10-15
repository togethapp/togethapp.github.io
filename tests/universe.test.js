import test from 'node:test';
import assert from 'node:assert/strict';

import { universeGraph, universeLayout, universeProject, universeHash, UNIVERSE_OUTSIDE } from '../src/universe.js';

const groups = [{ id: 'g1', name: 'Famille' }, { id: 'g2', name: 'Copains' }];

function held() {
  return {
    polls: [{ id: 'ev', kind: 'poll', groupId: 'g1', date: '2026-12-24', people: [{ name: 'Alice' }, { name: 'Bob' }], updatedAt: 2 }],
    lists: [
      { id: 'l1', kind: 'list', groupId: 'g1', parent: 'ev', people: [{ name: 'alice' }], updatedAt: 5, links: [{ id: 's1', kind: 'with' }] },
      { id: 'l2', kind: 'list', groupId: 'g2', people: [] },
      { id: 'old', kind: 'list', groupId: 'g2', archivedAt: 1 },
    ],
    spends: [{ id: 's1', kind: 'spend', groupId: 'g1', people: [{ name: 'Bob' }], links: [{ id: 'l1', kind: 'with' }] }],
    games: [{ id: 'gm', presetId: 'papayoo', players: [{ name: 'Chloé' }] }],
    boards: [{ id: 'b1', kind: 'board', groupId: 'g2', linkOnly: true }],
  };
}

test('every live document, group and person is a node; archived ones are not', () => {
  const { nodes } = universeGraph(held(), groups);
  const ids = nodes.map((node) => node.id).sort();
  assert.deepEqual(ids, ['d:b1', 'd:ev', 'd:gm', 'd:l1', 'd:l2', 'd:s1', 'g:g1', 'g:g2', UNIVERSE_OUTSIDE, 'p:alice', 'p:bob', 'p:chloe'].sort());
  assert.equal(nodes.find((node) => node.id === 'd:ev').kind, 'event', 'a poll with its day is an event');
  assert.equal(nodes.find((node) => node.id === 'd:gm').kind, 'game');
});

test('a document hangs from its event, else its group, else outside', () => {
  const { edges } = universeGraph(held(), groups);
  const up = (id) => edges.find((edge) => edge.from === `d:${id}` && edge.type !== 'link');
  assert.equal(up('l1').to, 'd:ev');
  assert.equal(up('ev').to, 'g:g1');
  assert.equal(up('l2').to, 'g:g2');
  assert.equal(up('gm').to, UNIVERSE_OUTSIDE);
  assert.equal(up('b1').to, UNIVERSE_OUTSIDE, 'a link-only document belongs to no group');
});

test('a link held on both sides is drawn once; a person once whatever the spelling', () => {
  const { nodes, edges } = universeGraph(held(), groups);
  assert.equal(edges.filter((edge) => edge.type === 'link').length, 1);
  const alice = nodes.find((node) => node.id === 'p:alice');
  assert.equal(alice.label, 'alice', 'the most recent spelling');
  assert.equal(edges.filter((edge) => edge.from === 'p:alice').length, 2);
});

test('nothing held, nothing drawn', () => {
  const graph = universeGraph({}, []);
  assert.deepEqual(graph, { nodes: [], edges: [] });
  assert.equal(universeLayout(graph).size, 0);
});

test('the layout fits in the unit ball and is the same every time', () => {
  const graph = universeGraph(held(), groups);
  const first = universeLayout(graph);
  const again = universeLayout(universeGraph(held(), groups));
  assert.equal(first.size, graph.nodes.length);
  for (const [id, point] of first) {
    const radius = Math.hypot(point.x, point.y, point.z);
    assert.ok(Number.isFinite(radius) && radius <= 1 + 1e-9, `${id} out of the ball`);
    assert.deepEqual(again.get(id), point);
  }
});

test('a single node sits in the middle', () => {
  const at = universeLayout(universeGraph({}, [{ id: 'g', name: 'Seul' }]));
  for (const point of at.values()) assert.ok(Math.hypot(point.x, point.y, point.z) < 1e-9);
});

test('projection: the centre falls in the middle, nearer looks larger', () => {
  const box = { width: 200, height: 100 };
  const centre = universeProject({ x: 0, y: 0, z: 0 }, {}, box);
  assert.deepEqual([centre.x, centre.y, centre.scale], [100, 50, 1]);
  const near = universeProject({ x: 0, y: 0, z: -0.5 }, {}, box);
  const far = universeProject({ x: 0, y: 0, z: 0.5 }, {}, box);
  assert.ok(near.scale > far.scale && near.depth < far.depth);
  const turned = universeProject({ x: 1, y: 0, z: 0 }, { yaw: Math.PI / 2 }, box);
  assert.ok(Math.abs(turned.x - 100) < 1e-6, 'a quarter turn brings the side to the front');
});

test('the hash is stable and in [0, 1)', () => {
  assert.equal(universeHash('abc'), universeHash('abc'));
  assert.notEqual(universeHash('abc'), universeHash('abd'));
  for (const text of ['', 'a', 'éé', 'x'.repeat(100)]) {
    const value = universeHash(text, 3);
    assert.ok(value >= 0 && value < 1);
  }
});
