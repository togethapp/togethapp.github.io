/**
 * Everything held, as a small solar system: each group a star, its documents
 * in orbit around it, and whatever hangs from an event circling that event
 * like a moon. Links between documents are arcs from one to the other.
 *
 * People are left out on purpose: this is a picture of what is going on, not
 * of who is in it.
 *
 * Nothing new is stored. Where things sit comes from their ids — the same
 * documents give the same sky on every phone — and from the time, so the
 * orbits turn without anything being written.
 *
 * Pure, like the models: documents in, points in space out. Drawing them is
 * view-holo.js's business.
 */

import { allDocuments, inGroup, isLive, kindOf, isEventDoc, parentId, linksOf, isDone } from './dashboard.js';

/** The star that gathers what is in none of the groups shown. */
export const HOLO_OUTSIDE = 'outside';

/** The order of the kinds round a star: events first, the rest after. */
const HOLO_ORDER = { event: 0, activity: 1, poll: 2, list: 3, spend: 4, board: 5, game: 6 };

/** A number in [0, 1) that a text always gives the same: places stay put. */
export function holoHash(text, salt = 0) {
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

/** Whether a document is finished, or null when it cannot be: see isDone(). */
function holoDone(document_, today) {
  try {
    return isDone(document_, today);
  } catch {
    return null;
  }
}

/**
 * What the sky is made of: `hubs` (the groups, and what is outside them),
 * `docs` and `links`.
 *
 * A hub is `{ id, type, label, ref, count }`: `type` is `group` or
 * `outside`, `ref` the group's id, `count` the documents of that group.
 * A document is `{ id, kind, label, ref, done, hub, around }`: `kind` is the
 * document's own (`event` for a poll that has its day, `activity` for an
 * event under another event), `done` what isDone()
 * says, `hub` the star of its group, `around` what it circles — the event it
 * hangs from when that event is shown, its group's star otherwise.
 * A link is `{ from, to, kind }`: `with`, or `order`, from what comes first
 * to what comes after.
 */
export function holoGraph(held, groupList = [], titleOf = (document_) => document_.name || document_.id, today = undefined) {
  const documents = allDocuments(held).filter(isLive);
  const byId = new Map(documents.map((one) => [one.id, one]));
  const hubs = groupList.map((group) => ({
    id: `g:${group.id}`, type: 'group', label: String(group.name || ''), ref: group.id, count: 0,
  }));
  const hubOf = new Map(hubs.map((hub) => [hub.id, hub]));

  const docs = documents.map((document_) => {
    const group = groupList.find((one) => inGroup(document_, one.id));
    const hub = group ? `g:${group.id}` : HOLO_OUTSIDE;
    if (!hubOf.has(hub)) {
      const outside = { id: HOLO_OUTSIDE, type: 'outside', label: '', ref: null, count: 0 };
      hubs.push(outside);
      hubOf.set(HOLO_OUTSIDE, outside);
    }
    hubOf.get(hub).count += 1;
    const parent = byId.get(parentId(document_));
    const event = isEventDoc(document_);
    return {
      id: `d:${document_.id}`,
      kind: event ? (parent && parent.id !== document_.id && isEventDoc(parent) ? 'activity' : 'event') : kindOf(document_) || 'game',
      label: String(titleOf(document_) || ''),
      ref: document_,
      done: holoDone(document_, today),
      hub,
      around: parent && parent.id !== document_.id ? `d:${parent.id}` : hub,
    };
  });

  // A chain that comes back on itself would circle for ever: whoever finds
  // the loop goes back to its own star, and the loop is broken.
  const docOf = new Map(docs.map((doc) => [doc.id, doc]));
  for (const doc of docs) {
    let at = doc;
    for (let step = 0; at && at.around.startsWith('d:'); step += 1) {
      if (step > docs.length) {
        doc.around = doc.hub;
        break;
      }
      at = docOf.get(at.around);
    }
  }

  const links = [];
  const paired = new Set();
  for (const document_ of documents) {
    for (const link of linksOf(document_)) {
      if (!byId.has(link.id) || link.id === document_.id) continue;
      const pair = [document_.id, link.id].sort().join('|');
      if (paired.has(pair)) continue;
      paired.add(pair);
      // `after`: this one comes after the other; `before`: before it.
      if (link.kind === 'with') links.push({ from: `d:${document_.id}`, to: `d:${link.id}`, kind: 'with' });
      else if (link.kind === 'after') links.push({ from: `d:${link.id}`, to: `d:${document_.id}`, kind: 'order' });
      else links.push({ from: `d:${document_.id}`, to: `d:${link.id}`, kind: 'order' });
    }
  }

  return { hubs, docs, links };
}

/**
 * How everything turns: where the stars sit (`centres`), the rings round
 * them (`rings`, for drawing the paths), each document's own orbit
 * (`bodies`, centres before what circles them) and the `scale` that fits the
 * whole in a ball of radius 1.
 *
 * The stars stand on a circle, a little above or below it; round each, rings
 * at a slant to one another, the inner ones holding fewer. A ring and a body
 * are `{ centre, radius, ax, az }` — a circle tilted `ax` round the x axis,
 * then `az` round the z axis — and a body adds where it starts (`phase`) and
 * how fast it goes (`speed`, in radians a millisecond).
 */
export function holoOrbits({ hubs = [], docs = [] } = {}) {
  const count = hubs.length;
  const ring = count > 1 ? 1 : 0;
  // How far a star's rings may reach before they meet the next star's.
  const reach = count > 1 ? Math.min(0.62, Math.sin(Math.PI / count) * 0.9) : 1;
  const centres = new Map();
  hubs.forEach((hub, index) => {
    const turn = (index / Math.max(1, count)) * Math.PI * 2 + 0.4;
    centres.set(hub.id, {
      x: Math.cos(turn) * ring,
      y: count > 1 ? (holoHash(hub.id, 1) - 0.5) * 0.24 : 0,
      z: Math.sin(turn) * ring,
    });
  });

  const childrenOf = new Map();
  for (const doc of docs) childrenOf.set(doc.around, [...(childrenOf.get(doc.around) || []), doc]);
  const rings = [];
  const bodies = [];
  const lay = (centre, depth, budget) => {
    const children = (childrenOf.get(centre) || [])
      .slice()
      .sort((a, b) => (HOLO_ORDER[a.kind] ?? 9) - (HOLO_ORDER[b.kind] ?? 9) || a.id.localeCompare(b.id));
    if (!children.length) return;
    const star = depth === 0;
    const sizes = [];
    for (let left = children.length, k = 0; left > 0; k += 1) {
      const take = Math.min(left, star ? 5 + 3 * k : 4 + 2 * k);
      sizes.push(take);
      left -= take;
    }
    const inner = budget * (star ? 0.42 : 0.55);
    let next = 0;
    sizes.forEach((size, k) => {
      const radius = sizes.length === 1 ? budget * (star ? 0.62 : 1) : inner + (budget - inner) * (k / (sizes.length - 1));
      const slant = star ? 0.9 : 1.6;
      const shape = {
        centre,
        radius,
        ax: (holoHash(centre, 10 + k) - 0.5) * slant,
        az: (holoHash(centre, 20 + k) - 0.5) * slant,
      };
      rings.push({ ...shape, depth });
      const start = holoHash(centre, 30 + k) * Math.PI * 2;
      const speed = star ? 0.00016 / (1 + 0.45 * k) : 0.00042 * (holoHash(centre, 40 + k) < 0.5 ? -1 : 1);
      for (let i = 0; i < size; i += 1) {
        const child = children[next];
        next += 1;
        bodies.push({ ...shape, id: child.id, phase: start + (i / size) * Math.PI * 2, speed, depth: depth + 1 });
        lay(child.id, depth + 1, reach * 0.34 * 0.6 ** depth);
      }
    });
  };
  for (const hub of hubs) lay(hub.id, 0, reach);

  // How far from the middle anything can go: a star's distance, plus every
  // radius on the way out to the body.
  const farthest = new Map();
  for (const [id, centre] of centres) farthest.set(id, Math.hypot(centre.x, centre.y, centre.z));
  for (const body of bodies) farthest.set(body.id, (farthest.get(body.centre) || 0) + body.radius);
  const extent = Math.max(0, ...farthest.values());
  return { centres, rings, bodies, scale: extent > 0 ? 1 / extent : 1 };
}

/** A point on a tilted circle, `angle` round it, before any scaling. */
export function holoOrbitPoint({ radius, ax, az }, angle) {
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y1 = -z * Math.sin(ax);
  const z1 = z * Math.cos(ax);
  return { x: x * Math.cos(az) - y1 * Math.sin(az), y: x * Math.sin(az) + y1 * Math.cos(az), z: z1 };
}

/**
 * Where everything is at `time` (milliseconds of turning), as a Map of id to
 * `{ x, y, z }`. `spread` draws the orbits in or out: 0 puts every document
 * on its star, 1 where it belongs.
 */
export function holoPositions({ centres, bodies, scale }, time = 0, spread = 1) {
  const at = new Map();
  for (const [id, centre] of centres) at.set(id, { x: centre.x * scale, y: centre.y * scale, z: centre.z * scale });
  for (const body of bodies) {
    const centre = at.get(body.centre) || { x: 0, y: 0, z: 0 };
    const offset = holoOrbitPoint(body, body.phase + body.speed * time);
    const far = scale * spread;
    at.set(body.id, { x: centre.x + offset.x * far, y: centre.y + offset.y * far, z: centre.z + offset.z * far });
  }
  return at;
}

/**
 * A point seen from the camera: turned `yaw` round the vertical, then tipped
 * `pitch` forward — a positive pitch looks down on the scene, as on a table.
 * `z` grows away from the eye.
 */
export function holoTurn(point, { yaw = 0, pitch = 0 } = {}) {
  const x1 = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
  const z1 = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
  return {
    x: x1,
    y: point.y * Math.cos(pitch) + z1 * Math.sin(pitch),
    z: -point.y * Math.sin(pitch) + z1 * Math.cos(pitch),
  };
}

/**
 * A point in space as it falls on the screen, around `cx, cy`, `unit` pixels
 * to a unit of space at the middle, from `distance` away.
 *
 * Returns `{ x, y, scale, depth }`: `scale` shrinks what is far, `depth`
 * orders the drawing (the farthest first).
 */
export function holoProject(point, camera = {}, { cx = 0, cy = 0, unit = 1 } = {}) {
  const distance = camera.distance ?? 3.2;
  const seen = holoTurn(point, camera);
  const scale = distance / Math.max(0.2, distance + seen.z);
  return { x: cx + seen.x * scale * unit, y: cy - seen.y * scale * unit, scale, depth: seen.z };
}
