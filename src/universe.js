/**
 * Everything the app holds, as one picture in three dimensions: each group a
 * star, its documents around it, the people they name drifting between them.
 *
 * Nothing new is stored. The picture is read from what is already there: a
 * document hangs from its event when it has one, from its group otherwise; a
 * link joins the two documents it names; a person is tied to every document
 * that names them.
 *
 * Pure, like the models: documents in, points in space out. Drawing them is
 * view-universe.js's business.
 */

import { allDocuments, inGroup, isLive, kindOf, isEventDoc, parentId, linksOf } from './dashboard.js';
import { sameName } from './stats.js';

/** Where documents in none of the groups gather, as a node id. */
export const UNIVERSE_OUTSIDE = 'outside';

/** The names a document writes, whatever its kind calls them. */
function universeNames(document_) {
  const rows = [...(document_.people || []), ...(document_.players || [])];
  return rows.map((row) => String(row?.name || '').trim()).filter(Boolean);
}

/**
 * The graph: `nodes` (groups, documents, people) and `edges` between them.
 *
 * A node is `{ id, type, kind, label, ref, size }`: `type` is `group`,
 * `outside`, `doc` or `person`; `kind` is the document's own kind (`event`
 * for a poll that has its day); `ref` is what opening it needs — a group's
 * id, a document, a name. An edge is `{ from, to, type }`, `type` being
 * `group`, `parent`, `link` or `person`.
 */
export function universeGraph(held, groupList = [], titleOf = (document_) => document_.name || document_.id) {
  const documents = allDocuments(held).filter(isLive);
  const byId = new Map(documents.map((one) => [one.id, one]));
  const nodes = [];
  const edges = [];
  const index = new Map();
  const add = (node) => {
    index.set(node.id, node);
    nodes.push(node);
    return node;
  };

  for (const group of groupList) {
    add({ id: `g:${group.id}`, type: 'group', kind: 'group', label: String(group.name || ''), ref: group.id, size: 1 });
  }

  for (const document_ of documents) {
    const kind = isEventDoc(document_) ? 'event' : kindOf(document_) || 'game';
    add({ id: `d:${document_.id}`, type: 'doc', kind, label: String(titleOf(document_) || ''), ref: document_, size: 1 });
  }

  for (const document_ of documents) {
    const from = `d:${document_.id}`;
    const parent = byId.get(parentId(document_));
    if (parent && parent.id !== document_.id) {
      edges.push({ from, to: `d:${parent.id}`, type: 'parent' });
      continue;
    }
    const group = groupList.find((one) => inGroup(document_, one.id));
    if (group) {
      edges.push({ from, to: `g:${group.id}`, type: 'group' });
      index.get(`g:${group.id}`).size += 1;
      continue;
    }
    if (!index.has(UNIVERSE_OUTSIDE)) {
      add({ id: UNIVERSE_OUTSIDE, type: 'outside', kind: 'outside', label: '', ref: null, size: 1 });
    }
    edges.push({ from, to: UNIVERSE_OUTSIDE, type: 'group' });
    index.get(UNIVERSE_OUTSIDE).size += 1;
  }

  const paired = new Set();
  for (const document_ of documents) {
    for (const link of linksOf(document_)) {
      if (!byId.has(link.id) || link.id === document_.id) continue;
      const pair = [document_.id, link.id].sort().join('|');
      if (paired.has(pair)) continue;
      paired.add(pair);
      edges.push({ from: `d:${document_.id}`, to: `d:${link.id}`, type: 'link' });
    }
  }

  // One person under one spelling, however many phones wrote it: the most
  // recent one, as the overview does.
  const people = new Map();
  for (const document_ of documents) {
    const seen = new Set();
    for (const name of universeNames(document_)) {
      const key = sameName(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const at = document_.updatedAt || 0;
      const held_ = people.get(key) || { name, at, docs: [] };
      if (at >= held_.at) Object.assign(held_, { name, at });
      held_.docs.push(document_.id);
      people.set(key, held_);
    }
  }
  for (const [key, person] of people) {
    const id = `p:${key}`;
    add({ id, type: 'person', kind: 'person', label: person.name, ref: person.name, size: person.docs.length });
    for (const docId of person.docs) edges.push({ from: id, to: `d:${docId}`, type: 'person' });
  }

  for (const node of nodes) if (node.type === 'doc') node.size += edges.filter((edge) => edge.to === node.id).length;
  return { nodes, edges };
}

/** A number in [0, 1) that a text always gives the same: places stay put. */
export function universeHash(text, salt = 0) {
  let hash = 2166136261 ^ salt;
  for (const char of String(text)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  return (hash >>> 0) / 4294967296;
}

/** How far apart things like to sit, by the kind of tie between them. */
const UNIVERSE_SPRING = { group: 0.55, parent: 0.32, link: 0.4, person: 0.5 };
const UNIVERSE_PULL = { group: 0.06, parent: 0.08, link: 0.03, person: 0.012 };

/**
 * Where each node sits, as a Map of id to `{ x, y, z }`, the whole fitted in
 * a ball of radius 1.
 *
 * Groups start spread over a sphere, everything else near what it hangs
 * from; then ties pull and every pair pushes, a few dozen times. The start
 * comes from the ids, never from chance: the same documents give the same
 * picture on every phone and at every visit.
 */
export function universeLayout({ nodes, edges }) {
  const at = new Map();
  if (!nodes.length) return at;
  const hubs = nodes.filter((node) => node.type === 'group' || node.type === 'outside');
  hubs.forEach((node, i) => {
    // A Fibonacci sphere: evenly spread, whatever their number.
    const y = hubs.length === 1 ? 0 : 1 - (2 * (i + 0.5)) / hubs.length;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const turn = i * Math.PI * (3 - Math.sqrt(5));
    const spread = hubs.length === 1 ? 0 : 1.4;
    at.set(node.id, { x: Math.cos(turn) * r * spread, y: y * spread, z: Math.sin(turn) * r * spread });
  });

  const anchor = new Map();
  for (const edge of edges) if (edge.type !== 'person' && edge.type !== 'link') anchor.set(edge.from, edge.to);
  const placeOf = (id, depth = 0) => {
    if (at.has(id)) return at.get(id);
    const up = anchor.get(id);
    const base = up && depth < 20 ? placeOf(up, depth + 1) : { x: 0, y: 0, z: 0 };
    const jitter = (salt) => (universeHash(id, salt) - 0.5) * 0.9;
    const point = { x: base.x + jitter(1), y: base.y + jitter(2), z: base.z + jitter(3) };
    at.set(id, point);
    return point;
  };
  for (const node of nodes) if (node.type === 'doc') placeOf(node.id);
  for (const node of nodes) {
    if (node.type !== 'person') continue;
    const near = edges.filter((edge) => edge.from === node.id).map((edge) => at.get(edge.to)).filter(Boolean);
    const mean = (axis) => near.reduce((sum, point) => sum + point[axis], 0) / (near.length || 1);
    const jitter = (salt) => (universeHash(node.id, salt) - 0.5) * 0.6;
    at.set(node.id, { x: mean('x') + jitter(4), y: mean('y') + jitter(5), z: mean('z') + jitter(6) });
  }

  const points = nodes.map((node) => at.get(node.id));
  const position = new Map(nodes.map((node, i) => [node.id, i]));
  const ties = edges
    .map((edge) => [position.get(edge.from), position.get(edge.to), edge.type])
    .filter(([a, b]) => a !== undefined && b !== undefined);
  const rounds = nodes.length > 400 ? 30 : nodes.length > 150 ? 60 : 110;
  for (let round = 0; round < rounds; round += 1) {
    const cool = 1 - round / rounds;
    const push = points.map(() => ({ x: 0, y: 0, z: 0 }));
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dz = points[i].z - points[j].z;
        const d2 = dx * dx + dy * dy + dz * dz + 0.01;
        const force = 0.012 / d2;
        push[i].x += dx * force; push[i].y += dy * force; push[i].z += dz * force;
        push[j].x -= dx * force; push[j].y -= dy * force; push[j].z -= dz * force;
      }
    }
    for (const [a, b, type] of ties) {
      const dx = points[b].x - points[a].x;
      const dy = points[b].y - points[a].y;
      const dz = points[b].z - points[a].z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      const force = ((d - UNIVERSE_SPRING[type]) / d) * UNIVERSE_PULL[type];
      push[a].x += dx * force; push[a].y += dy * force; push[a].z += dz * force;
      push[b].x -= dx * force; push[b].y -= dy * force; push[b].z -= dz * force;
    }
    points.forEach((point, i) => {
      const step = (value) => Math.max(-0.2, Math.min(0.2, value)) * cool;
      point.x += step(push[i].x - point.x * 0.004);
      point.y += step(push[i].y - point.y * 0.004);
      point.z += step(push[i].z - point.z * 0.004);
    });
  }

  // Centred, then shrunk or grown to fill the ball.
  const centre = ['x', 'y', 'z'].map((axis) => points.reduce((sum, point) => sum + point[axis], 0) / points.length);
  for (const point of points) {
    point.x -= centre[0]; point.y -= centre[1]; point.z -= centre[2];
  }
  const far = Math.max(...points.map((point) => Math.hypot(point.x, point.y, point.z)));
  const scale = far > 0 ? 1 / far : 1;
  for (const point of points) {
    point.x *= scale; point.y *= scale; point.z *= scale;
  }
  return at;
}

/**
 * A point in space as it falls on the screen, seen turned by `yaw` and
 * `pitch` (radians), from `distance` away, `zoom` times larger.
 *
 * Returns `{ x, y, scale, depth }`: `scale` shrinks what is far, `depth`
 * orders the drawing (the farthest first).
 */
export function universeProject(point, { yaw = 0, pitch = 0, zoom = 1, distance = 3.2 } = {}, { width = 1, height = 1 } = {}) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = point.x * cy - point.z * sy;
  const z1 = point.x * sy + point.z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = point.y * cp - z1 * sp;
  const z2 = point.y * sp + z1 * cp;
  const scale = distance / Math.max(0.2, distance + z2);
  const unit = (Math.min(width, height) / 2) * 0.82 * zoom;
  return { x: width / 2 + x1 * scale * unit, y: height / 2 - y2 * scale * unit, scale, depth: z2 };
}
