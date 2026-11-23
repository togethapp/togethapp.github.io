/**
 * The arcade's place on the Games tab: its cards, the records kept on this
 * phone, and each group's ranking. Light, and part of the app from the start.
 *
 * The games themselves — drawn on a canvas, the fingers, the sounds — are in
 * view-arcade-play.js, with their logic (arcade.js): a part fetched only once
 * a game is opened (later.js), so a first visit does not wait for them.
 */

import { escapeHtml, state } from './app.js';
import { ARCADE_GAMES, ARCADE_MODES, arcadeMode } from './arcade-games.js';
import { savePrefs } from './storage.js';
import { groupFilter, groups, myNameIn } from './view-groups.js';
import { t } from './i18n.js';

export const ARCADE_ICONS = {
  glouton: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12 20.2 7.3A9.5 9.5 0 1 0 20.2 16.7z"/></svg>',
  snake: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 16.5c2.6 0 2.6-7 5.2-7s2.6 7 5.2 7 2.6-7 5.2-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="19.6" cy="9.5" r="2.6"/></svg>',
};
/** The mode chosen for a game, kept on the phone. */
export function modeOf(id) {
  return arcadeMode(state.prefs?.arcadeMode?.[id]);
}

/** Where a record is kept: the normal mode's where it always was. */
function recordKey(id, mode) {
  return mode === 'normal' ? id : `${id}:${mode}`;
}

export function bestOf(id, mode = modeOf(id)) {
  return Number(state.prefs?.arcade?.[recordKey(id, mode)]) || 0;
}

/** Keep a score if it beats the record; says whether it did. */
export function keepBest(id, mode, score) {
  if (score <= bestOf(id, mode)) return false;
  state.prefs.arcade = { ...(state.prefs.arcade || {}), [recordKey(id, mode)]: score };
  savePrefs(state.prefs);
  return true;
}

/* ---------------------------------------------------------------- ranking --- */

/**
 * Each group's ranking, in the database: the best score of each of its
 * first names, by game and mode. A game over sends its score to every group
 * this device is in, under the name it has there. The Games tab shows one
 * group's best, game by game, under « Jouer ici ».
 */
const rankings = new Map();
/** When each ranking was last asked for: the tab redraws often, the database is asked now and then. */
const rankingAsked = new Map();
const RANKING_FRESH_MS = 20000;
const RANKING_SIZE = 5;
/** Whether the database has ever answered: one not yet updated knows no ranking, and none shows. */
let rankingKnown = false;

function rankingKey(groupId, id, mode) {
  return `${groupId}|${id}|${mode}`;
}

/**
 * The group whose ranking shows: the one the tab is filtered on, else the
 * one last chosen, else the first.
 */
function rankingGroup() {
  const held = groups();
  const filtered = groupFilter();
  return held.find((group) => group.id === filtered)
    || held.find((group) => group.id === state.prefs.arcadeGroup) || held[0] || null;
}

function rankingMode() {
  return arcadeMode(state.prefs?.arcadeRankMode);
}

/** Send a score to every group, under this device's name there. Never throws. */
export async function sendScore(id, mode, score) {
  if (!state.remote || !(score > 0)) return;
  await Promise.all(groups().map(async (group) => {
    const name = myNameIn(group.id);
    if (!name) return;
    try {
      const top = await state.remote.arcadeScore(group.key, id, mode, name, score);
      if (!top) return;
      rankings.set(rankingKey(group.id, id, mode), top);
      rankingKnown = true;
    } catch {
      // Offline, or a database not yet updated: the record stays here, and
      // goes with the next game or the next visit.
    }
  }));
}

/** The ranking's inside: whom it is for, the mode, and each game's best. */
function rankingInner() {
  const group = rankingGroup();
  if (!group) return '';
  const mode = rankingMode();
  const me = myNameIn(group.id);
  const held = groups();
  const filtered = held.some((one) => one.id === groupFilter());
  const chips = held.length > 1 && !filtered ? `
    <div class="row" role="group" aria-label="${escapeHtml(t('arcade.ranking.groups'))}">
      ${held.map((one) => `
        <button type="button" class="chip${one.id === group.id ? ' chip--on' : ''}" data-arcade-group="${escapeHtml(one.id)}"
                aria-pressed="${one.id === group.id}">${escapeHtml(one.name || '')}</button>`).join('')}
    </div>` : '';
  const modes = `
    <div class="segmented arcade__modes" role="group" aria-label="${escapeHtml(t('arcade.mode'))}">
      ${ARCADE_MODES.map((option) => `
        <button type="button" class="segmented__option" data-arcade-rank-mode="${option}"
                aria-pressed="${option === mode}">${escapeHtml(t(`arcade.mode.${option}`))}</button>`).join('')}
    </div>`;
  const line = (entry, index) => {
    const mine = me && entry.name.toLowerCase() === me.toLowerCase();
    return `
      <li class="arcade-ranking__line${mine ? ' arcade-ranking__line--me' : ''}">
        <span class="arcade-ranking__rank">${index + 1}</span>
        <span class="arcade-ranking__name">${escapeHtml(entry.name)}</span>
        <strong class="arcade-ranking__score">${escapeHtml(String(entry.score))}</strong>
      </li>`;
  };
  const game = ({ id }) => {
    const top = (rankings.get(rankingKey(group.id, id, mode)) || []).slice(0, RANKING_SIZE);
    return `
      <div class="arcade-ranking__game" data-arcade-ranking="${escapeHtml(id)}">
        <h3><span class="arcade-ranking__icon arcade-card__icon--${escapeHtml(id)}" aria-hidden="true">${ARCADE_ICONS[id] || ''}</span>${escapeHtml(t(`arcade.${id}.name`))}</h3>
        ${top.length
          ? `<ol class="arcade-ranking__list">${top.map(line).join('')}</ol>`
          : `<p class="muted small">${escapeHtml(t('arcade.ranking.none'))}</p>`}
      </div>`;
  };
  return `
    <div class="section__head"><h2>${escapeHtml(t('arcade.ranking', { group: group.name || '' }))}</h2></div>
    ${chips}
    ${modes}
    <div class="arcade-ranking__games">${ARCADE_GAMES.map(game).join('')}</div>
    <p class="muted small">${escapeHtml(t(me ? 'arcade.ranking.how' : 'arcade.ranking.who'))}</p>`;
}

/** The ranking's section on the Games tab: hidden until the database has answered once. */
function rankingHtml() {
  if (!state.remote || !rankingGroup()) return '';
  return `<section class="section arcade-ranking" id="arcade-ranking"${rankingKnown ? '' : ' hidden'}>${rankingKnown ? rankingInner() : ''}</section>`;
}

/** Redraw the ranking in place, and wire its buttons. */
function drawRanking() {
  const box = document.getElementById('arcade-ranking');
  if (!box) return;
  box.hidden = !rankingKnown;
  if (!rankingKnown) return;
  box.innerHTML = rankingInner();
  box.querySelectorAll('[data-arcade-group]').forEach((button) => {
    button.addEventListener('click', () => {
      state.prefs.arcadeGroup = button.dataset.arcadeGroup;
      savePrefs(state.prefs);
      drawRanking();
      void askRanking();
    });
  });
  box.querySelectorAll('[data-arcade-rank-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      state.prefs.arcadeRankMode = arcadeMode(button.dataset.arcadeRankMode);
      savePrefs(state.prefs);
      drawRanking();
      void askRanking();
    });
  });
}

/** Ask the database for the shown group's ranking, each game, unless asked lately. */
async function askRanking(force = false) {
  const group = state.remote ? rankingGroup() : null;
  if (!group) return;
  const mode = rankingMode();
  const now = Date.now();
  const due = ARCADE_GAMES.filter(({ id }) => force || !(now - (rankingAsked.get(rankingKey(group.id, id, mode)) || 0) < RANKING_FRESH_MS));
  if (!due.length) return;
  let answered = false;
  await Promise.all(due.map(async ({ id }) => {
    const key = rankingKey(group.id, id, mode);
    rankingAsked.set(key, now);
    try {
      rankings.set(key, await state.remote.arcadeTop(group.key, id, mode));
      answered = true;
    } catch {
      rankingAsked.delete(key);
    }
  }));
  if (answered) rankingKnown = true;
  drawRanking();
}

/**
 * Wire the ranking on the Games tab, once it is drawn. The records kept here
 * go to the groups first, once a visit: one made before the ranking existed,
 * or while offline.
 */
let recordsSent = false;
export function bindArcadeRanking() {
  if (!document.getElementById('arcade-ranking')) return;
  drawRanking();
  if (!recordsSent && state.remote) {
    recordsSent = true;
    const sends = [];
    for (const { id } of ARCADE_GAMES) {
      for (const mode of ARCADE_MODES) sends.push(sendScore(id, mode, bestOf(id, mode)));
    }
    void Promise.all(sends).then(() => askRanking(true));
    return;
  }
  void askRanking();
}

/** The arcade's cards, at the top of the Games tab. */
export function arcadeHtml() {
  const card = (game) => {
    const best = bestOf(game.id);
    return `
      <button type="button" class="arcade-card" data-goto="#/arcade/${escapeHtml(game.id)}">
        <span class="arcade-card__icon arcade-card__icon--${escapeHtml(game.id)}" aria-hidden="true">${ARCADE_ICONS[game.id] || ''}</span>
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
    </section>
    ${rankingHtml()}`;
}
