// Généré par tools/bundle.js — modifiez les sources, pas ce fichier.
(globalThis.TOGETHER_PARTS ||= {}).holo = ({ OUTSIDE_GROUPS, allDocuments, documentHref, documentTitle, escapeHtml, groupFilter, groupsByName, inGroup, isDone, isEventDoc, isLive, kindOf, linksOf, navigate, parentId, render, setGroupFilter, shownDocs, state, t }) => {
  // ---- src/holo.js -----------------------------------------------------
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


/** The star that gathers what is in none of the groups shown. */
const HOLO_OUTSIDE = 'outside';

/** The order of the kinds round a star: events first, the rest after. */
const HOLO_ORDER = { event: 0, activity: 1, poll: 2, list: 3, spend: 4, board: 5, game: 6 };

/** A number in [0, 1) that a text always gives the same: places stay put. */
function holoHash(text, salt = 0) {
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
function holoGraph(held, groupList = [], titleOf = (document_) => document_.name || document_.id, today = undefined) {
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
function holoOrbits({ hubs = [], docs = [] } = {}) {
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
function holoOrbitPoint({ radius, ax, az }, angle) {
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
function holoPositions({ centres, bodies, scale }, time = 0, spread = 1) {
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
function holoTurn(point, { yaw = 0, pitch = 0 } = {}) {
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
function holoProject(point, camera = {}, { cx = 0, cy = 0, unit = 1 } = {}) {
  const distance = camera.distance ?? 3.2;
  const seen = holoTurn(point, camera);
  const scale = distance / Math.max(0.2, distance + seen.z);
  return { x: cx + seen.x * scale * unit, y: cy - seen.y * scale * unit, scale, depth: seen.z };
}

  // ---- src/view-holo.js ------------------------------------------------
/**
 * Home's 3D view: everything held, as a hologram on a dark glass table —
 * each group a star, its documents in orbit, what hangs from an event
 * circling it like a moon, the links between documents as arcs of light.
 * Nobody's name is in it: it shows what is going on, not who.
 *
 * Small on the page, where a finger sliding up or down still scrolls and one
 * sliding sideways turns the sky; full screen at a tap, to look around and
 * zoom. A tap on a point says what it is, with the way to open it.
 *
 * Drawn by hand on a canvas: the app has no library. The shape of the sky
 * comes from holo.js. Calls back into app.js and the other views only from
 * inside functions.
 */





/**
 * Neon on night: one colour per kind, and for the stars the light of the
 * style or colour chosen in the settings (`--holo-hue`, read when drawing).
 */
const HOLO_COLOURS = {
  group: '#5ff3ff',
  outside: '#8f98c2',
  event: '#ff4fd8',
  activity: '#ff8a7a',
  poll: '#ffb347',
  list: '#4dffa6',
  spend: '#4dc3ff',
  board: '#b48cff',
  game: '#ffe45c',
};

const HOLO_KINDS = ['event', 'activity', 'poll', 'list', 'spend', 'board', 'game'];

/** The height of the glass table under the sky. */
const HOLO_FLOOR = -0.62;

const HOLO_FONT = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';

/**
 * How the sky is turned and what is picked, kept here rather than in
 * bindHolo(): Home is drawn again whenever the database brings something
 * new, and the sky should not jump back. `instance` tells the latest drawing
 * from the ones the page has already thrown away.
 */
const holoState = {
  yaw: 0.6, pitch: 0.5, zoom: 1, clock: 0, still: null, picked: null, full: false, introAt: null, instance: 0,
  sprites: null, stars: null,
};

/** What is on show: the chosen group's documents and star, or everything. */
function holoShown() {
  const wanted = groupFilter();
  const held = {
    lists: shownDocs(state.lists), polls: shownDocs(state.polls), games: shownDocs(state.games),
    spends: shownDocs(state.spends), boards: shownDocs(state.boards),
  };
  const groupList = wanted === OUTSIDE_GROUPS ? [] : groupsByName().filter((group) => !wanted || group.id === wanted);
  return holoGraph(held, groupList, documentTitle);
}

const HOLO_ICONS = {
  pause: '<path d="M9 6v12M15 6v12"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  exit: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
};

function holoIcon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${HOLO_ICONS[name]}</svg>`;
}

/** The panel, or nothing when there is nothing to show. */
function holoHtml() {
  let graph;
  try {
    graph = holoShown();
  } catch {
    return '';
  }
  if (!graph.docs.length) return '';
  const groupCount = graph.hubs.filter((hub) => hub.type === 'group').length;
  const readout = [
    t('holo.docs', { count: graph.docs.length }),
    groupCount ? t('holo.groups', { count: groupCount }) : '',
    graph.links.length ? t('holo.links', { count: graph.links.length }) : '',
  ].filter(Boolean).join(' · ');
  const still = holoState.still ?? holoReduced();
  const legend = HOLO_KINDS.map((kind) => `
    <span class="holo__key"><i style="--holo-key:${HOLO_COLOURS[kind]}"></i>${escapeHtml(t(`holo.kind.${kind}`))}</span>`).join('');
  return `
    <section class="holo${holoState.full ? ' holo--full' : ''}" id="holo" aria-label="${escapeHtml(t('holo.title'))}">
      <canvas class="holo__canvas" id="holo-canvas" role="img" tabindex="0"
              aria-label="${escapeHtml(t('holo.aria', { count: graph.docs.length }))}"></canvas>
      <div class="holo__scan" aria-hidden="true"></div>
      <div class="holo__frame" aria-hidden="true"></div>
      <div class="holo__top">
        <span class="holo__heading">
          <span class="holo__title"><span class="holo__pulse" aria-hidden="true"></span>${escapeHtml(t('holo.title'))}</span>
          <span class="holo__hint" id="holo-hint">${escapeHtml(t(holoState.full ? 'holo.hintFull' : 'holo.hint'))}</span>
        </span>
        <span class="holo__tools">
          <button type="button" class="holo__button" id="holo-spin"
                  aria-label="${escapeHtml(t(still ? 'holo.play' : 'holo.pause'))}"
                  title="${escapeHtml(t(still ? 'holo.play' : 'holo.pause'))}">${holoIcon(still ? 'play' : 'pause')}</button>
          <button type="button" class="holo__button" id="holo-full"
                  aria-label="${escapeHtml(t(holoState.full ? 'holo.exit' : 'holo.full'))}"
                  title="${escapeHtml(t(holoState.full ? 'holo.exit' : 'holo.full'))}">${holoIcon(holoState.full ? 'exit' : 'full')}</button>
        </span>
      </div>
      <div class="holo__legend" aria-hidden="true">${legend}</div>
      <div class="holo__bottom">
        <span class="holo__readout">${escapeHtml(readout)}</span>
      </div>
      <div class="holo__card" id="holo-card" aria-live="polite" hidden></div>
    </section>`;
}

function holoReduced() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/** `#5ff3ff` and an opacity, as the canvas reads colours. */
function holoRgba(hex, alpha) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

/** Two colours `#rrggbb` mixed, `amount` of the second: the canvas has no color-mix(). */
function holoMix(hex, other, amount) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(other.slice(1), 16);
  const channel = (shift) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A glow and a core for each colour, drawn once: stamping a small picture is
 * far cheaper, sixty times a second, than painting a gradient. Drawn again
 * only when the stars' light changes.
 */
function holoSprites(colours) {
  if (holoState.sprites?.group?.hue === colours.group) return holoState.sprites;
  const make = (colour, core) => {
    const sprite = document.createElement('canvas');
    sprite.width = 64;
    sprite.height = 64;
    const paint = sprite.getContext('2d');
    if (!paint) return sprite;
    const shade = paint.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (core) {
      shade.addColorStop(0, '#ffffff');
      shade.addColorStop(0.3, colour);
      shade.addColorStop(0.62, holoRgba(colour, 0.5));
      shade.addColorStop(1, holoRgba(colour, 0));
    } else {
      shade.addColorStop(0, holoRgba(colour, 0.5));
      shade.addColorStop(0.35, holoRgba(colour, 0.16));
      shade.addColorStop(1, holoRgba(colour, 0));
    }
    paint.fillStyle = shade;
    paint.fillRect(0, 0, 64, 64);
    return sprite;
  };
  holoState.sprites = Object.fromEntries(Object.entries(colours).map(([kind, colour]) => [
    kind, { glow: make(colour, false), core: make(colour, true), hue: colour },
  ]));
  holoState.sprites.link = { glow: make('#ff8af0', false), core: make('#ff8af0', true) };
  holoState.sprites.order = { glow: make('#ffd166', false), core: make('#ffd166', true) };
  return holoState.sprites;
}

/** Far stars, in every direction, always the same ones. */
function holoStars() {
  if (holoState.stars) return holoState.stars;
  holoState.stars = Array.from({ length: 150 }, (_, index) => {
    const y = holoHash('star', index) * 2 - 1;
    const turn = holoHash('star', index + 500) * Math.PI * 2;
    const round = Math.sqrt(1 - y * y);
    return {
      x: Math.cos(turn) * round, y, z: Math.sin(turn) * round,
      phase: holoHash('twinkle', index) * Math.PI * 2,
      bright: holoHash('bright', index) > 0.85,
    };
  });
  return holoState.stars;
}

function holoLabel(node) {
  if (node.type === 'outside') return t('holo.outside');
  return node.label || t(`holo.kind.${node.kind}`);
}

function bindHolo() {
  const panel = document.getElementById('holo');
  const canvas = document.getElementById('holo-canvas');
  const context = canvas?.getContext('2d');
  if (!panel || !canvas || !context) return;
  let graph;
  try {
    graph = holoShown();
  } catch {
    return;
  }
  const mine = ++holoState.instance;
  const orbits = holoOrbits(graph);
  const nodes = new Map();
  for (const hub of graph.hubs) nodes.set(hub.id, { ...hub, star: true, kind: hub.type });
  for (const doc of graph.docs) nodes.set(doc.id, { ...doc, star: false });
  const neighbours = new Map([...nodes.keys()].map((id) => [id, new Set()]));
  const tie = (a, b) => {
    neighbours.get(a)?.add(b);
    neighbours.get(b)?.add(a);
  };
  for (const doc of graph.docs) tie(doc.id, doc.around);
  for (const link of graph.links) tie(link.from, link.to);

  const reduced = holoReduced();
  if (holoState.still === null) holoState.still = reduced;
  let picked = nodes.get(holoState.picked) || null;
  // The stars and the table take the light of the chosen style or colour,
  // and the night is the style's own (styles.css, `--holo-ground`): the
  // classic style's view is a warm night, not the hologram's blue one. The
  // far stars, the names and the quiet star of what is in no group are
  // touched by the same light.
  const root = getComputedStyle(document.documentElement);
  const token = (name, fallback) => {
    const value = root.getPropertyValue(name).trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  };
  const hue = token('--holo-hue', HOLO_COLOURS.group);
  const deep = token('--holo-deep', '#03060d');
  const colours = { ...HOLO_COLOURS, group: hue, outside: holoMix(HOLO_COLOURS.outside, hue, 0.25) };
  const starlight = holoMix('#ffffff', hue, 0.2);
  const ink = holoMix('#ffffff', hue, 0.15);
  const light = (alpha) => holoRgba(colours.group, alpha);
  const sprites = holoSprites(colours);
  const stars = holoStars();
  const spin = panel.querySelector('#holo-spin');
  const fullButton = panel.querySelector('#holo-full');
  const hint = panel.querySelector('#holo-hint');
  const card = panel.querySelector('#holo-card');
  // The first time Home shows it, the documents fly out to their orbits —
  // once a visit, carried on by any redrawing that comes in the middle.
  if (holoState.introAt === null) holoState.introAt = reduced ? -Infinity : performance.now();
  const introStart = holoState.introAt;
  if (holoState.full) document.body.classList.add('holo-open');

  let dirty = true;
  let shown = [];

  const stamp = (sprite, x, y, size, alpha) => {
    if (alpha <= 0.01 || size < 0.5) return;
    context.globalAlpha = Math.min(1, alpha);
    context.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  };

  // A name in a small dark box. Boxes already placed this frame (`taken`)
  // push the new one up or down; one with nowhere to go is left out, unless
  // it must be shown.
  let taken = [];
  const tag = (text, x, y, { colour, border, size = 10, width, alpha = 1, must = false }) => {
    context.font = `600 ${size}px ${HOLO_FONT}`;
    const wide = context.measureText(text).width + 12;
    const high = size + 8;
    let left = x;
    if (left + wide > width - 4) left = Math.max(4, x - wide - 24);
    if (left < 4) left = 4;
    const clash = (top_) => taken.some((box) => left < box.left + box.wide && box.left < left + wide && top_ < box.top + box.high && box.top < top_ + high);
    const top = [0, high + 2, -(high + 2), 2 * (high + 2), -2 * (high + 2)].map((shift) => y - high + shift).find((top_) => !clash(top_));
    if (top === undefined && !must) return null;
    const box = { left, top: top ?? y - high, wide, high };
    taken.push(box);
    context.globalAlpha = alpha * 0.82;
    context.fillStyle = holoRgba(deep, 0.78);
    context.fillRect(left, box.top, wide, high);
    if (border) {
      context.globalAlpha = alpha * 0.7;
      context.strokeStyle = border;
      context.lineWidth = 1;
      context.strokeRect(left + 0.5, box.top + 0.5, wide - 1, high - 1);
    }
    context.globalAlpha = alpha;
    context.fillStyle = colour;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillText(text, left + 6, box.top + high / 2 + 0.5);
    return box;
  };

  const draw = (now) => {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.clearRect(0, 0, width, height);

    const full = holoState.full;
    const intro = Math.min(1, Math.max(0, (now - introStart) / 1400));
    const spread = 1 - (1 - intro) ** 3;
    const camera = { yaw: holoState.yaw, pitch: holoState.pitch };
    const unit = (full ? Math.min(width * 0.52, height * 0.45) * holoState.zoom : Math.min(width * 0.44, height * 0.6));
    const view = { cx: width / 2, cy: height * (full ? 0.48 : 0.47), unit };
    const project = (point) => holoProject(point, camera, view);
    const clock = holoState.clock;
    const moving = !holoState.still;
    const lit = picked ? new Set([picked.id, ...neighbours.get(picked.id)]) : null;

    // Far stars: turned with the sky but never nearer, like a sky dome.
    context.globalCompositeOperation = 'lighter';
    context.fillStyle = starlight;
    const focal = Math.max(width, height) * 0.55;
    for (const star of stars) {
      const seen = holoTurn(star, camera);
      if (seen.z < 0.15) continue;
      const x = width / 2 + (seen.x / seen.z) * focal;
      const y = height / 2 - (seen.y / seen.z) * focal;
      if (x < 0 || y < 0 || x > width || y > height) continue;
      context.globalAlpha = (star.bright ? 0.75 : 0.35) * (moving ? 0.65 + 0.35 * Math.sin(now * 0.0016 + star.phase) : 0.8);
      const size = star.bright ? 1.6 : 1;
      context.fillRect(x, y, size, size);
    }

    // The glass table: rings, spokes, a ticked rim turning slowly, and a
    // radar sweep. Any line through space is drawn point by point.
    const path3d = (points) => {
      context.beginPath();
      points.forEach((point, index) => {
        const p = project(point);
        if (index) context.lineTo(p.x, p.y);
        else context.moveTo(p.x, p.y);
      });
      context.stroke();
    };
    const circle = (radius, steps, y = HOLO_FLOOR, cx = 0, cz = 0) => Array.from({ length: steps + 1 }, (_, i) => {
      const angle = (i / steps) * Math.PI * 2;
      return { x: cx + Math.cos(angle) * radius, y, z: cz + Math.sin(angle) * radius };
    });
    context.lineWidth = 1;
    context.strokeStyle = light(0.16);
    context.globalAlpha = 1;
    for (const radius of [0.4, 0.8, 1.2]) path3d(circle(radius * (0.6 + 0.4 * spread), 72));
    context.strokeStyle = light(0.08);
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      path3d([0.4, 1.2].map((r) => ({ x: Math.cos(angle) * r, y: HOLO_FLOOR, z: Math.sin(angle) * r })));
    }
    const rim = clock * 0.00004;
    context.strokeStyle = light(0.28);
    for (let i = 0; i < 48; i += 1) {
      const angle = rim + (i / 48) * Math.PI * 2;
      const inner = i % 4 ? 1.31 : 1.27;
      path3d([inner, 1.36].map((r) => ({ x: Math.cos(angle) * r, y: HOLO_FLOOR, z: Math.sin(angle) * r })));
    }
    const sweep = clock * 0.0007;
    for (let i = 0; i < 14; i += 1) {
      const angle = sweep - i * 0.035;
      context.strokeStyle = light(0.12 * (1 - i / 14));
      path3d([0.12, 1.2].map((r) => ({ x: Math.cos(angle) * r, y: HOLO_FLOOR, z: Math.sin(angle) * r })));
    }
    if (intro < 1) {
      context.strokeStyle = light(0.6 * (1 - intro));
      context.lineWidth = 2;
      path3d(circle(0.2 + 1.2 * spread, 72));
      context.lineWidth = 1;
    }

    const at = holoPositions(orbits, clock, spread);
    const screen = new Map();
    for (const [id, point] of at) screen.set(id, { ...project(point), point });

    // The paths of the orbits.
    for (const ring of orbits.rings) {
      const centre = at.get(ring.centre);
      if (!centre) continue;
      const steps = ring.depth ? 28 : 64;
      const far = orbits.scale * spread;
      const ringLit = lit && lit.has(ring.centre);
      context.strokeStyle = light((ring.depth ? 0.1 : 0.14) * (lit && !ringLit ? 0.4 : 1) * (ringLit ? 2.2 : 1));
      path3d(Array.from({ length: steps + 1 }, (_, i) => {
        const offset = holoOrbitPoint(ring, (i / steps) * Math.PI * 2);
        return { x: centre.x + offset.x * far, y: centre.y + offset.y * far, z: centre.z + offset.z * far };
      }));
    }

    // Each star stands on the table, on a beam of light and a small pad.
    for (const hub of graph.hubs) {
      const point = at.get(hub.id);
      const top = screen.get(hub.id);
      const base = project({ x: point.x, y: HOLO_FLOOR, z: point.z });
      const colour = colours[hub.type];
      const beam = context.createLinearGradient(top.x, top.y, base.x, base.y);
      beam.addColorStop(0, holoRgba(colour, 0.5));
      beam.addColorStop(1, holoRgba(colour, 0.04));
      context.strokeStyle = beam;
      context.globalAlpha = lit && !lit.has(hub.id) ? 0.35 : 1;
      context.setLineDash([2, 3]);
      context.beginPath();
      context.moveTo(top.x, top.y);
      context.lineTo(base.x, base.y);
      context.stroke();
      context.setLineDash([]);
      context.strokeStyle = holoRgba(colour, 0.45);
      path3d(circle(0.07, 24, HOLO_FLOOR, point.x, point.z));
    }
    context.globalAlpha = 1;

    // Links: arcs of light, with a spark running along each.
    for (const link of graph.links) {
      const a = screen.get(link.from);
      const b = screen.get(link.to);
      if (!a || !b) continue;
      const lift = Math.hypot(a.x - b.x, a.y - b.y) * 0.3;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2 - lift;
      const near = lit && lit.has(link.from) && lit.has(link.to) && (picked.id === link.from || picked.id === link.to);
      const colour = link.kind === 'order' ? '#ffd166' : '#ff8af0';
      context.globalAlpha = lit && !near ? 0.12 : near ? 0.95 : 0.5;
      context.strokeStyle = colour;
      context.lineWidth = near ? 1.6 : 1.1;
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.quadraticCurveTo(cx, cy, b.x, b.y);
      context.stroke();
      const along = (clock * 0.00035 + holoHash(link.from + link.to)) % 1;
      const rest = 1 - along;
      const x = rest * rest * a.x + 2 * rest * along * cx + along * along * b.x;
      const y = rest * rest * a.y + 2 * rest * along * cy + along * along * b.y;
      const spark = sprites[link.kind === 'order' ? 'order' : 'link'];
      stamp(spark.glow, x, y, 18, lit && !near ? 0.2 : 0.9);
      stamp(spark.core, x, y, 6, lit && !near ? 0.2 : 1);
    }
    context.lineWidth = 1;

    // The picked one, tied to what it circles.
    if (picked && !picked.star) {
      const a = screen.get(picked.id);
      const b = screen.get(picked.around);
      if (a && b) {
        context.globalAlpha = 0.8;
        context.strokeStyle = holoRgba(colours[picked.kind] || colours.group, 0.9);
        context.setLineDash([4, 3]);
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
        context.setLineDash([]);
      }
    }

    // Stars and documents, the farthest first.
    shown = [...screen.entries()]
      .map(([id, place]) => ({ node: nodes.get(id), ...place }))
      .filter((one) => one.node)
      .sort((p, q) => q.depth - p.depth);
    for (const one of shown) {
      const { node } = one;
      const fog = Math.max(0.45, Math.min(1, 1 - (one.depth + 0.3) * 0.35));
      const dim = lit && !lit.has(node.id) ? 0.2 : 1;
      const sprite = sprites[node.kind] || sprites.group;
      const colour = colours[node.kind] || colours.group;
      if (node.star) {
        const radius = unit * 0.07 * one.scale * (1 + Math.min(0.7, node.count * 0.05));
        one.radius = radius;
        stamp(sprite.glow, one.x, one.y, radius * 6, 0.95 * dim);
        stamp(sprite.core, one.x, one.y, radius * 2.3, dim);
        // A dashed ring round the star, turning.
        context.globalAlpha = 0.6 * dim;
        context.strokeStyle = colour;
        context.setLineDash([3, 4]);
        context.lineDashOffset = -clock * 0.01;
        context.beginPath();
        context.ellipse(one.x, one.y, radius * 1.9, radius * 0.6, -0.25, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
        context.lineDashOffset = 0;
      } else {
        const radius = unit * (node.kind === 'event' ? 0.042 : node.kind === 'activity' ? 0.03 : 0.034) * one.scale * (0.4 + 0.6 * spread);
        one.radius = radius;
        stamp(sprite.glow, one.x, one.y, radius * 6.5, 0.9 * fog * dim);
        if (node.done) {
          // Finished: a hollow ring, quieter.
          context.globalAlpha = 0.75 * fog * dim;
          context.strokeStyle = colour;
          context.lineWidth = 1.4;
          context.beginPath();
          context.arc(one.x, one.y, radius * 0.9, 0, Math.PI * 2);
          context.stroke();
          context.lineWidth = 1;
          stamp(sprite.core, one.x, one.y, radius * 0.9, fog * dim);
        } else {
          stamp(sprite.core, one.x, one.y, radius * 2.4, fog * dim);
        }
        if (node.kind === 'event' || node.kind === 'activity') {
          // An event in a diamond; its activities, moons round it, in a smaller one.
          context.globalAlpha = 0.65 * fog * dim;
          context.strokeStyle = colour;
          const d = radius * (node.kind === 'event' ? 2 : 1.7);
          context.beginPath();
          context.moveTo(one.x, one.y - d);
          context.lineTo(one.x + d, one.y);
          context.lineTo(one.x, one.y + d);
          context.lineTo(one.x - d, one.y);
          context.closePath();
          context.stroke();
        }
      }
    }

    // Words: the stars' names always, a document's when it is picked or
    // tied to the picked one — and all of them, full screen, when few.
    context.globalCompositeOperation = 'source-over';
    taken = [];
    // The picked one's name first, so that nothing pushes it away.
    const named = [...shown].reverse().sort((p, q) => Number(q.node.id === picked?.id) - Number(p.node.id === picked?.id));
    for (const one of named) {
      const { node } = one;
      const dim = lit && !lit.has(node.id) ? 0.35 : 1;
      if (node.star) {
        const text = holoLabel(node).toUpperCase();
        const words = text.length > 18 ? `${text.slice(0, 17)}…` : text;
        const x = one.x + one.radius + 14;
        const y = one.y - one.radius - 8;
        const box = tag(words, x, y, {
          colour: ink, border: holoRgba(colours[node.type], 0.6), size: 10, width, alpha: dim, must: true,
        });
        context.globalAlpha = 0.6 * dim;
        context.strokeStyle = holoRgba(colours[node.type], 0.8);
        context.beginPath();
        context.moveTo(one.x + (box.left > one.x ? 1 : -1) * one.radius * 0.8, one.y - one.radius * 0.6);
        context.lineTo(box.left > one.x ? box.left : box.left + box.wide, box.top + box.high);
        context.stroke();
        continue;
      }
      const many = graph.docs.length > 28;
      const wanted = (lit && lit.has(node.id)) || (full && !many && !lit);
      if (!wanted) continue;
      const text = holoLabel(node);
      const words = text.length > 22 ? `${text.slice(0, 21)}…` : text;
      tag(words, one.x + one.radius + 6, one.y + 6, {
        colour: colours[node.kind] || '#ffffff', size: 9.5, width, alpha: node.id === picked?.id ? 1 : 0.85 * dim,
        must: node.id === picked?.id,
      });
    }

    // A target round what is picked.
    if (picked) {
      const one = shown.find((each) => each.node.id === picked.id);
      if (one) {
        const reach = one.radius + 9;
        context.globalAlpha = 0.95;
        context.strokeStyle = '#ffffff';
        context.lineWidth = 1.2;
        context.setLineDash([5, 4]);
        context.lineDashOffset = reduced ? 0 : -now * 0.02;
        context.beginPath();
        context.arc(one.x, one.y, reach, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
        context.lineDashOffset = 0;
        for (let i = 0; i < 4; i += 1) {
          const angle = Math.PI / 4 + (i * Math.PI) / 2;
          context.beginPath();
          context.moveTo(one.x + Math.cos(angle) * (reach + 2), one.y + Math.sin(angle) * (reach + 2));
          context.lineTo(one.x + Math.cos(angle) * (reach + 7), one.y + Math.sin(angle) * (reach + 7));
          context.stroke();
        }
        context.lineWidth = 1;
      }
    }
    context.globalAlpha = 1;
  };

  const sayStill = () => {
    const label = t(holoState.still ? 'holo.play' : 'holo.pause');
    spin.innerHTML = holoIcon(holoState.still ? 'play' : 'pause');
    spin.setAttribute('aria-label', label);
    spin.title = label;
    dirty = true;
  };

  const setFull = (on) => {
    holoState.full = on;
    panel.classList.toggle('holo--full', on);
    document.body.classList.toggle('holo-open', on);
    const label = t(on ? 'holo.exit' : 'holo.full');
    fullButton.innerHTML = holoIcon(on ? 'exit' : 'full');
    fullButton.setAttribute('aria-label', label);
    fullButton.title = label;
    hint.textContent = t(on ? 'holo.hintFull' : 'holo.hint');
    dirty = true;
    (on ? canvas : fullButton).focus({ preventScroll: true });
  };

  const openPicked = () => {
    const target = picked;
    if (!target) return;
    picked = null;
    holoState.picked = null;
    if (holoState.full) setFull(false);
    if (target.type === 'outside') {
      setGroupFilter(OUTSIDE_GROUPS);
      render();
      return;
    }
    navigate(target.star ? `#/group/${encodeURIComponent(target.ref)}` : documentHref(target.ref));
  };

  const showCard = () => {
    holoState.picked = picked ? picked.id : null;
    dirty = true;
    if (!picked) {
      card.hidden = true;
      card.innerHTML = '';
      return;
    }
    const meta = [];
    if (picked.star) {
      meta.push(t('holo.docs', { count: picked.count }));
    } else {
      const centre = nodes.get(picked.around);
      if (centre && !centre.star) meta.push(t('holo.for', { name: holoLabel(centre) }));
      const hub = nodes.get(picked.hub);
      if (hub) meta.push(holoLabel(hub));
      const links = graph.links.filter((link) => link.from === picked.id || link.to === picked.id).length;
      if (links) meta.push(t('holo.links', { count: links }));
      if (picked.done) meta.push(t('holo.done'));
    }
    card.style.setProperty('--holo-kind', colours[picked.kind] || colours.group);
    card.innerHTML = `
      <span class="holo__kind">${escapeHtml(t(`holo.kind.${picked.kind}`))}</span>
      <strong class="holo__name">${escapeHtml(holoLabel(picked))}</strong>
      <span class="holo__meta">${escapeHtml(meta.join(' · '))}</span>
      <button type="button" class="holo__open" id="holo-open">${escapeHtml(t('holo.open'))}</button>`;
    card.hidden = false;
    card.querySelector('#holo-open').addEventListener('click', openPicked);
  };

  // What is under the finger: the nearest point within reach of it, the
  // nearer to the eye when two are as near.
  const pickAt = (x, y) => {
    let best = null;
    let bestGap = Infinity;
    for (const one of shown) {
      const gap = Math.hypot(one.x - x, one.y - y);
      if (gap > Math.max(16, (one.radius || 0) + 8)) continue;
      if (gap < bestGap - 2 || (Math.abs(gap - bestGap) <= 2 && one.depth < best.depth)) {
        best = one;
        bestGap = gap;
      }
    }
    picked = best ? best.node : null;
    showCard();
  };

  // One finger turns the sky — sideways only on the page, where up and down
  // belong to scrolling; two fingers, full screen, bring it nearer. A tap
  // that did not move picks what is under it.
  const fingers = new Map();
  let moved = 0;
  let pinch = 0;
  canvas.addEventListener('pointerdown', (event) => {
    fingers.set(event.pointerId, { x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch' });
    moved = 0;
    if (fingers.size === 2) {
      const [p, q] = [...fingers.values()];
      pinch = Math.hypot(p.x - q.x, p.y - q.y);
    }
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Nothing to hold on to: the drag simply stops at the edge.
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    const was = fingers.get(event.pointerId);
    if (!was) return;
    const now = { x: event.clientX, y: event.clientY, touch: was.touch };
    fingers.set(event.pointerId, now);
    if (fingers.size === 2) {
      const [p, q] = [...fingers.values()];
      const apart = Math.hypot(p.x - q.x, p.y - q.y);
      if (pinch && holoState.full) holoState.zoom = Math.max(0.6, Math.min(3.5, holoState.zoom * (apart / pinch)));
      pinch = apart;
      moved += 10;
      dirty = true;
      return;
    }
    const dx = now.x - was.x;
    const dy = now.y - was.y;
    moved += Math.abs(dx) + Math.abs(dy);
    holoState.yaw += dx * 0.008;
    if (holoState.full || !was.touch) holoState.pitch = Math.max(0.08, Math.min(1.3, holoState.pitch + dy * 0.006));
    dirty = true;
  });
  canvas.addEventListener('pointerup', (event) => {
    const tap = fingers.size === 1 && moved < 6;
    fingers.delete(event.pointerId);
    if (fingers.size < 2) pinch = 0;
    if (!tap) return;
    const box = canvas.getBoundingClientRect();
    pickAt(event.clientX - box.left, event.clientY - box.top);
  });
  canvas.addEventListener('pointercancel', (event) => {
    // The page took the finger to scroll: nothing was turned or picked.
    fingers.delete(event.pointerId);
    pinch = 0;
  });
  canvas.addEventListener('wheel', (event) => {
    // On the page, the wheel scrolls the page; full screen, it zooms.
    if (!holoState.full) return;
    event.preventDefault();
    holoState.zoom = Math.max(0.6, Math.min(3.5, holoState.zoom * Math.exp(-event.deltaY * 0.0015)));
    dirty = true;
  }, { passive: false });

  // The keyboard too: arrows turn, + and - zoom full screen, Enter opens what
  // is picked, Escape lets go of it, then leaves full screen.
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (picked) {
        picked = null;
        showCard();
      } else if (holoState.full) {
        setFull(false);
      } else {
        return;
      }
      event.preventDefault();
      return;
    }
    if (event.target !== canvas) return;
    const turn = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[event.key];
    if (turn) {
      holoState.yaw += turn[0];
      holoState.pitch = Math.max(0.08, Math.min(1.3, holoState.pitch + turn[1]));
    } else if ((event.key === '+' || event.key === '=') && holoState.full) {
      holoState.zoom = Math.min(3.5, holoState.zoom * 1.2);
    } else if (event.key === '-' && holoState.full) {
      holoState.zoom = Math.max(0.6, holoState.zoom / 1.2);
    } else if (event.key === 'Enter' && picked) {
      openPicked();
      return;
    } else {
      return;
    }
    event.preventDefault();
    dirty = true;
  });

  spin.addEventListener('click', () => {
    holoState.still = !holoState.still;
    sayStill();
  });
  fullButton.addEventListener('click', () => setFull(!holoState.full));

  // For the browser tests: where a point is drawn, and every name drawn.
  canvas.holoSpot = (label) => {
    const one = shown.find((each) => holoLabel(each.node) === label);
    return one ? { x: one.x, y: one.y } : null;
  };
  canvas.holoLabels = () => shown.map((each) => holoLabel(each.node));

  // Off screen, nothing is drawn. Scrolled out of sight, the sky waits.
  let inView = true;
  const watcher = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      dirty = true;
    })
    : null;
  watcher?.observe(panel);

  // Drawn while on the page — thirty times a second on it, sixty full screen,
  // and not at all when nothing moves. The panel gone, the loop ends; gone
  // for another page rather than redrawn, it lets go of the screen too.
  let last = performance.now();
  let drawnAt = 0;
  let size = '';
  const tick = (now) => {
    const step = Math.min(64, now - last);
    last = now;
    if (!inView && !holoState.full) return;
    const moving = !holoState.still && !picked && !fingers.size;
    if (moving) {
      holoState.clock += step;
      holoState.yaw += step * 0.00005;
    }
    const nowSize = `${canvas.clientWidth}x${canvas.clientHeight}`;
    if (nowSize !== size) {
      size = nowSize;
      dirty = true;
    }
    const animating = moving || now - introStart < 1500 || (picked && !reduced);
    if (!dirty && !animating) return;
    if (!dirty && !holoState.full && now - drawnAt < 32) return;
    dirty = false;
    drawnAt = now;
    draw(now);
  };
  const frame = (now) => {
    if (!canvas.isConnected) {
      watcher?.disconnect();
      if (holoState.instance === mine) {
        holoState.full = false;
        holoState.picked = null;
        document.body.classList.remove('holo-open');
      }
      return;
    }
    tick(now);
    requestAnimationFrame(frame);
  };
  if (picked) showCard();
  draw(performance.now());
  requestAnimationFrame(frame);
}

  return { HOLO_OUTSIDE, holoHash, holoGraph, holoOrbits, holoOrbitPoint, holoPositions, holoTurn, holoProject, holoHtml, bindHolo };
};
