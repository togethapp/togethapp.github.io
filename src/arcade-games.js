/**
 * Which games the arcade has, and how hard each can be: what the Games tab
 * lists, before any game is opened. The games themselves are in arcade.js,
 * fetched only when one is (later.js), so this stays apart from it.
 */

/** The games of the arcade, in the order shown. */
export const ARCADE_GAMES = [{ id: 'glouton' }, { id: 'snake' }];

/** How hard a game is, chosen before it starts; each keeps its own record. */
export const ARCADE_MODES = ['easy', 'normal', 'hard'];

export function arcadeMode(mode) {
  return ARCADE_MODES.includes(mode) ? mode : 'normal';
}
