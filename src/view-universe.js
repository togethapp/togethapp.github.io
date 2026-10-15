/**
 * Everything, in three dimensions, on its own tab: the groups as stars, their
 * documents around them, the people between. It turns by itself; a finger
 * turns it, two fingers (or the wheel) bring it closer, a tap picks a point
 * and says what it is, with the way to open it.
 *
 * Drawn on a canvas by hand — no library: the app has none. The picture's
 * shape comes from universe.js.
 *
 * Calls back into app.js and the other views only from inside functions.
 */

import { documentHref, documentTitle, escapeHtml, flashHtml, groupChipsHtml, navigate, state } from './app.js';
import { groupsByName, groupFilter, shownDocs, OUTSIDE_GROUPS } from './view-groups.js';
import { t } from './i18n.js';
import { universeGraph, universeLayout, universeProject } from './universe.js';

/** One colour per kind, readable on the light page and on the dark one. */
const UNIVERSE_COLOURS = {
  group: '#d08a1e',
  outside: '#8a8478',
  event: '#d9534f',
  poll: '#e07b39',
  list: '#3f9c5a',
  spend: '#2f86b8',
  board: '#9b59b6',
  game: '#c9a227',
  person: '#7d8fa3',
};

const UNIVERSE_KINDS = ['group', 'event', 'poll', 'list', 'spend', 'board', 'game', 'person'];

/** What is on show: the chosen group's documents, or everything. */
function universeShown() {
  const wanted = groupFilter();
  const held = {
    lists: shownDocs(state.lists), polls: shownDocs(state.polls), games: shownDocs(state.games),
    spends: shownDocs(state.spends), boards: shownDocs(state.boards),
  };
  const groupList = wanted === OUTSIDE_GROUPS ? [] : groupsByName().filter((group) => !wanted || group.id === wanted);
  return universeGraph(held, groupList, documentTitle);
}

export function universeView() {
  const graph = universeShown();
  const counts = {
    docs: graph.nodes.filter((node) => node.type === 'doc').length,
    people: graph.nodes.filter((node) => node.type === 'person').length,
  };
  const legend = UNIVERSE_KINDS.map((kind) => `
    <span class="universe__key"><span class="universe__dot" style="background:${UNIVERSE_COLOURS[kind]}"></span>${escapeHtml(t(`universe.kind.${kind}`))}</span>`).join('');
  return `
    ${flashHtml()}
    <h1>${escapeHtml(t('universe.title'))}</h1>
    ${groupChipsHtml()}
    ${
      graph.nodes.length
        ? `
          <p class="muted small">${escapeHtml(t('universe.counts', { docs: counts.docs, people: counts.people }))}</p>
          <div class="universe card">
            <canvas class="universe__canvas" id="universe-canvas" role="img"
                    aria-label="${escapeHtml(t('universe.aria', { docs: counts.docs, people: counts.people }))}"></canvas>
            <div class="universe__tools">
              <button type="button" class="button button--small button--ghost" id="universe-spin" aria-pressed="true">${escapeHtml(t('universe.pause'))}</button>
              <button type="button" class="button button--small button--ghost" id="universe-reset">${escapeHtml(t('universe.reset'))}</button>
            </div>
          </div>
          <div class="universe__picked" id="universe-picked" aria-live="polite">
            <p class="muted small">${escapeHtml(t('universe.hint'))}</p>
          </div>
          <div class="universe__legend">${legend}</div>`
        : `<p class="lead">${escapeHtml(t('universe.empty'))}</p>`
    }`;
}

/** Where a node leads, or null for what has no page. */
function universeHref(node) {
  if (node.type === 'doc') return documentHref(node.ref);
  if (node.type === 'group') return `#/group/${encodeURIComponent(node.ref)}`;
  if (node.type === 'person') return `#/person/${encodeURIComponent(node.ref)}`;
  return null;
}

function universeLabel(node) {
  if (node.type === 'outside') return t('universe.outside');
  return node.label || t(`universe.kind.${node.kind}`);
}

export function bindUniverse() {
  const canvas = document.getElementById('universe-canvas');
  if (!canvas) return;
  const graph = universeShown();
  const places = universeLayout(graph);
  const nodes = graph.nodes.map((node) => ({ ...node, at: places.get(node.id) }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ties = graph.edges.map((edge) => ({ ...edge, a: byId.get(edge.from), b: byId.get(edge.to) })).filter((edge) => edge.a && edge.b);
  const neighbours = new Map(nodes.map((node) => [node.id, new Set()]));
  for (const edge of ties) {
    neighbours.get(edge.a.id).add(edge.b.id);
    neighbours.get(edge.b.id).add(edge.a.id);
  }

  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const view = { yaw: 0.6, pitch: 0.35, zoom: 1 };
  let spinning = !still;
  let picked = null;
  let shown = [];
  const context = canvas.getContext('2d');
  const spin = document.getElementById('universe-spin');
  const sayPaused = () => {
    spin.textContent = t(spinning ? 'universe.pause' : 'universe.play');
    spin.setAttribute('aria-pressed', spinning ? 'true' : 'false');
  };
  sayPaused();

  const size = () => {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  };

  const draw = () => {
    const box = size();
    const style = getComputedStyle(document.documentElement);
    const ink = style.getPropertyValue('--text').trim() || '#222';
    const faint = style.getPropertyValue('--muted').trim() || '#888';
    context.clearRect(0, 0, box.width, box.height);
    shown = nodes.map((node) => ({ node, ...universeProject(node.at, view, box) }));
    const screen = new Map(shown.map((one) => [one.node.id, one]));
    const lit = picked ? new Set([picked.id, ...neighbours.get(picked.id)]) : null;

    for (const edge of ties) {
      const a = screen.get(edge.a.id);
      const b = screen.get(edge.b.id);
      const near = lit && lit.has(edge.a.id) && lit.has(edge.b.id) && (edge.a.id === picked.id || edge.b.id === picked.id);
      context.globalAlpha = lit ? (near ? 0.9 : 0.06) : edge.type === 'person' ? 0.16 : 0.35;
      context.strokeStyle = edge.type === 'link' ? UNIVERSE_COLOURS.board : near ? ink : faint;
      context.lineWidth = (edge.type === 'person' ? 0.6 : 1.1) * (a.scale + b.scale) / 2;
      context.setLineDash(edge.type === 'link' ? [4, 3] : []);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }
    context.setLineDash([]);

    const order = [...shown].sort((p, q) => q.depth - p.depth);
    for (const one of order) {
      const { node } = one;
      const base = node.type === 'group' || node.type === 'outside' ? 9 + Math.min(8, node.size * 0.5) : node.type === 'person' ? 3 + Math.min(4, node.size * 0.6) : 4.5 + Math.min(4, node.size * 0.5);
      one.radius = base * one.scale;
      const fog = Math.max(0.35, Math.min(1, 0.95 - one.depth * 0.35));
      context.globalAlpha = lit && !lit.has(node.id) ? 0.12 : fog;
      const colour = UNIVERSE_COLOURS[node.kind] || UNIVERSE_COLOURS.outside;
      const glow = context.createRadialGradient(one.x - one.radius * 0.35, one.y - one.radius * 0.35, one.radius * 0.1, one.x, one.y, one.radius);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.25, colour);
      glow.addColorStop(1, colour);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(one.x, one.y, one.radius, 0, Math.PI * 2);
      context.fill();
      if (picked && node.id === picked.id) {
        context.globalAlpha = 1;
        context.strokeStyle = ink;
        context.lineWidth = 2;
        context.stroke();
      }
    }

    context.font = '600 12px system-ui, sans-serif';
    context.textAlign = 'center';
    for (const one of order) {
      const { node } = one;
      const hub = node.type === 'group' || node.type === 'outside';
      if (!(hub || (lit && lit.has(node.id)))) continue;
      context.globalAlpha = lit && !lit.has(node.id) ? 0.25 : 1;
      context.fillStyle = ink;
      const text = universeLabel(node);
      context.fillText(text.length > 24 ? `${text.slice(0, 23)}…` : text, one.x, one.y - one.radius - 5);
    }
    context.globalAlpha = 1;
  };

  const showPicked = () => {
    const box = document.getElementById('universe-picked');
    if (!box) return;
    if (!picked) {
      box.innerHTML = `<p class="muted small">${escapeHtml(t('universe.hint'))}</p>`;
      return;
    }
    const href = universeHref(picked);
    const around = neighbours.get(picked.id).size;
    box.innerHTML = `
      <div class="spread">
        <div>
          <strong>${escapeHtml(universeLabel(picked))}</strong>
          <div class="muted small">${escapeHtml(t(`universe.kind.${picked.kind}`))} · ${escapeHtml(t('universe.ties', { count: around }))}</div>
        </div>
        ${href ? `<button type="button" class="button button--small" id="universe-open">${escapeHtml(t('universe.open'))}</button>` : ''}
      </div>`;
    box.querySelector('#universe-open')?.addEventListener('click', () => navigate(href));
  };

  // A finger turns it; two bring it closer or farther; a tap that did not
  // move picks the point under it.
  const fingers = new Map();
  let moved = 0;
  let pinch = 0;
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture?.(event.pointerId);
    fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved = 0;
    if (fingers.size === 2) {
      const [p, q] = [...fingers.values()];
      pinch = Math.hypot(p.x - q.x, p.y - q.y);
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    const was = fingers.get(event.pointerId);
    if (!was) return;
    const now = { x: event.clientX, y: event.clientY };
    fingers.set(event.pointerId, now);
    if (fingers.size === 2) {
      const [p, q] = [...fingers.values()];
      const apart = Math.hypot(p.x - q.x, p.y - q.y);
      if (pinch) view.zoom = Math.max(0.5, Math.min(4, view.zoom * (apart / pinch)));
      pinch = apart;
      moved += 10;
      return;
    }
    const dx = now.x - was.x;
    const dy = now.y - was.y;
    moved += Math.abs(dx) + Math.abs(dy);
    view.yaw += dx * 0.008;
    view.pitch = Math.max(-1.4, Math.min(1.4, view.pitch + dy * 0.008));
  });
  const lift = (event) => {
    const tap = fingers.size === 1 && moved < 6;
    fingers.delete(event.pointerId);
    if (fingers.size < 2) pinch = 0;
    if (!tap) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let best = null;
    for (const one of shown) {
      const reach = Math.max(14, (one.radius || 0) + 6);
      const d = Math.hypot(one.x - x, one.y - y);
      if (d <= reach && (!best || one.depth < best.depth)) best = { ...one, d };
    }
    picked = best ? best.node : null;
    if (picked) spinning = false;
    sayPaused();
    showPicked();
  };
  canvas.addEventListener('pointerup', lift);
  canvas.addEventListener('pointercancel', (event) => {
    fingers.delete(event.pointerId);
    pinch = 0;
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    view.zoom = Math.max(0.5, Math.min(4, view.zoom * Math.exp(-event.deltaY * 0.0015)));
  }, { passive: false });

  spin.addEventListener('click', () => {
    spinning = !spinning;
    sayPaused();
  });
  document.getElementById('universe-reset')?.addEventListener('click', () => {
    Object.assign(view, { yaw: 0.6, pitch: 0.35, zoom: 1 });
    picked = null;
    showPicked();
  });

  // Where a point is on the canvas, by its label: for the browser tests.
  canvas.universeSpot = (label) => {
    const one = shown.find((each) => universeLabel(each.node) === label);
    return one ? { x: one.x, y: one.y } : null;
  };

  // Drawn while on the page; the canvas gone, the loop ends by itself.
  let last = performance.now();
  const frame = (now) => {
    if (!canvas.isConnected) return;
    const step = Math.min(64, now - last);
    last = now;
    if (spinning && !fingers.size) view.yaw += step * 0.00018;
    draw();
    requestAnimationFrame(frame);
  };
  draw();
  requestAnimationFrame(frame);
}
