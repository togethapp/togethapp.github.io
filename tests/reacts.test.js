import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REACTIONS, addWords, mergeCells, myReaction, react, reactionsTo, removeWords, wordsOn, WORDS_MOST,
} from '../src/reacts.js';
import { createBoard, addCard, mergeBoards } from '../src/ideas.js';
import { createPoll, addOptions, createEvent, mergePolls } from '../src/polls.js';

test('a reaction is one per person and thing: again takes it back, another replaces it', () => {
  const board = createBoard({ name: 'Cadeau' });
  const one = react(board, 'c_1', 'Alice', '👍');
  assert.deepEqual(reactionsTo(one, 'c_1', 'alice'), [{ emoji: '👍', names: ['Alice'], mine: true }]);
  assert.equal(myReaction(one, 'c_1', 'ALICE'), '👍', 'the same person, whatever the capitals');
  const other = react(one, 'c_1', 'Alice', '❤️');
  assert.deepEqual(reactionsTo(other, 'c_1').map((row) => row.emoji), ['❤️']);
  const back = react(other, 'c_1', 'Alice', '❤️');
  assert.deepEqual(reactionsTo(back, 'c_1'), []);
  assert.equal(myReaction(back, 'c_1', 'Alice'), '');
  assert.ok(back.updatedAt > board.updatedAt || back.updatedAt >= board.updatedAt);
});

test('reactions add up, in the palette’s order, and each stays on its own thing', () => {
  let board = createBoard({ name: 'Cadeau' });
  board = react(board, 'c_1', 'Bob', '🎉');
  board = react(board, 'c_1', 'Alice', '👍');
  board = react(board, 'c_1', 'Gui', '👍');
  board = react(board, 'c_2', 'Gui', '😂');
  assert.deepEqual(reactionsTo(board, 'c_1', 'Gui'), [
    { emoji: '👍', names: ['Alice', 'Gui'], mine: true },
    { emoji: '🎉', names: ['Bob'], mine: false },
  ]);
  assert.deepEqual(reactionsTo(board, 'c_2').map((row) => row.emoji), ['😂']);
  assert.deepEqual(reactionsTo(board, ''), [], 'the document itself has none');
  assert.equal(react(board, 'c_1', '', '👍'), board, 'without a name, nothing');
  assert.equal(react(board, 'c_1', 'Gui', '💩'), board, 'nor outside the palette');
  assert.equal(REACTIONS.length, 5);
});

test('a few words, oldest first, taken back by emptying them', () => {
  let poll = createEvent({ name: 'Raclette', date: '2030-01-01' });
  poll = addWords(poll, '', 'Alice', '  J’apporte le fromage ');
  poll = addWords(poll, '', 'Bob', 'Et moi le vin');
  poll = addWords(poll, 'o_1', 'Bob', 'Ailleurs');
  assert.equal(addWords(poll, '', 'Bob', '   '), poll, 'no words, nothing');
  assert.equal(addWords(poll, '', '', 'Anonyme'), poll, 'no name, nothing');
  const said = wordsOn(poll, '', 'alice');
  assert.deepEqual(said.map((one) => [one.name, one.text, one.mine]), [['Alice', 'J’apporte le fromage', true], ['Bob', 'Et moi le vin', false]]);
  assert.equal(wordsOn(addWords(poll, '', 'Bob', 'x'.repeat(400)), '').at(-1).text.length, WORDS_MOST);
  const taken = removeWords(poll, said[0].id);
  assert.deepEqual(wordsOn(taken, '').map((one) => one.name), ['Bob']);
  assert.equal(taken.comments[said[0].id].t, '', 'the cell stays, emptied, for the other copies');
  assert.equal(removeWords(taken, said[0].id), taken, 'taken back once');
});

test('cells merge one by one, the latest kept — the second copy’s on a tie', () => {
  const a = { 'c|alice': { e: '👍', at: 2 }, 'c|bob': { e: '🎉', at: 1 } };
  const b = { 'c|alice': { e: '', at: 3 }, 'c|gui': { e: '😂', at: 1 }, 'c|bob': { e: '❤️', at: 1 } };
  assert.deepEqual(mergeCells(a, b), { 'c|alice': { e: '', at: 3 }, 'c|bob': { e: '❤️', at: 1 }, 'c|gui': { e: '😂', at: 1 } });
  assert.deepEqual(mergeCells(null, 'pas des cases'), {});
});

test('two phones reacting to the same idea both stay', () => {
  const made = addCard(createBoard({ name: 'Cadeau' }), 'note', 'Un livre');
  const here = react(made.board, made.cardId, 'Alice', '👍');
  const there = addWords(react({ ...made.board, updatedAt: made.board.updatedAt + 5 }, made.cardId, 'Bob', '❤️'), made.cardId, 'Bob', 'Lequel ?');
  for (const merged of [mergeBoards(here, there), mergeBoards(there, here)]) {
    assert.deepEqual(reactionsTo(merged, made.cardId).map((row) => row.emoji), ['👍', '❤️']);
    assert.deepEqual(wordsOn(merged, made.cardId).map((one) => one.text), ['Lequel ?']);
  }
  assert.equal(mergeBoards(here, here), here, 'nothing new, the same board');
});

test('a reaction is not lost under a newer copy of the poll that has not heard of it', () => {
  const poll = addOptions(createPoll({ question: 'Quel soir ?' }), 'Vendredi\nSamedi');
  const [friday] = poll.options;
  const reacted = react(poll, friday.id, 'Alice', '👍');
  const renamed = { ...poll, question: 'Quel soir, finalement ?', updatedAt: reacted.updatedAt + 10 };
  const merged = mergePolls(reacted, renamed);
  assert.equal(merged.question, 'Quel soir, finalement ?');
  assert.deepEqual(reactionsTo(merged, friday.id).map((row) => row.names), [['Alice']]);
  assert.equal(mergePolls(reacted, reacted), reacted);
});
