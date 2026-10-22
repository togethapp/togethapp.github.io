import test from 'node:test';
import assert from 'node:assert/strict';

import { foundAt, searchDocuments, searchWords } from '../src/search.js';
import { createList, addItems } from '../src/lists.js';
import { createPoll, addOptions } from '../src/polls.js';
import { createBoard, addCard, editCardText } from '../src/ideas.js';
import { createSpend, addSpend, addRepayment } from '../src/spends.js';

test('a query is its words, without accents or capitals', () => {
  assert.deepEqual(searchWords('  Crème   BRÛLÉE '), ['creme', 'brulee']);
  assert.deepEqual(searchWords('vin vin'), ['vin']);
  assert.deepEqual(searchWords(''), []);
  assert.equal(searchWords('a b c d e f g h i j').length, 8, 'a few words, not a text');
});

test('words are marked where they are written, accents and all', () => {
  assert.deepEqual(foundAt('Crème brûlée', ['creme']), [[0, 5]]);
  assert.deepEqual(foundAt('Crème brûlée', ['brulee']), [[6, 12]]);
  assert.deepEqual(foundAt('vin rouge, vin blanc', ['vin']), [[0, 3], [11, 14]]);
  assert.deepEqual(foundAt('fromages', ['from', 'mage']), [[0, 7]], 'overlapping marks are one');
  assert.deepEqual(foundAt('Œufs 🥚 et ŒUFS', ['œufs']), [[0, 4], [11, 15]]);
  assert.deepEqual(foundAt('rien', ['vin']), []);
});

/** A list, a poll, a board and an account, as a weekend holds them. */
function weekend() {
  const list = { ...addItems(createList({ name: 'Courses' }), 'Fromage 25 €\nPain\nCrème fraîche'), updatedAt: 3 };
  const poll = { ...addOptions(createPoll({ question: 'Quel vin ?' }), 'Vin rouge\nVin blanc\nCidre'), updatedAt: 2 };
  const made = addCard(createBoard({ name: 'Idées de desserts' }), 'note');
  const board = { ...editCardText(made.board, made.cardId, 'Crème brûlée au fromage blanc'), updatedAt: 1 };
  let spend = createSpend({ name: 'Week-end', names: ['Gui', 'Alice'] });
  spend = addSpend(spend, { text: 'Fromagerie', amount: 1800, by: spend.people[0].id });
  spend = addRepayment(spend, { from: spend.people[1].id, to: spend.people[0].id, amount: 900 });
  return [list, poll, board, { ...spend, updatedAt: 0 }];
}

const titleOf = (one) => one.name || one.question;

test('every kind is searched: lines, choices, notes, expenses', () => {
  const found = searchDocuments(weekend(), 'fromage', { titleOf });
  assert.deepEqual(found.map((hit) => hit.title), ['Courses', 'Idées de desserts', 'Week-end']);
  assert.deepEqual(found[0].parts, [{ text: 'Fromage 25 €', marks: [[0, 7]] }]);
  assert.equal(found[2].parts[0].text, 'Fromagerie');
  assert.deepEqual(searchDocuments(weekend(), 'blanc', { titleOf }).map((hit) => hit.title), ['Quel vin ?', 'Idées de desserts']);
});

test('every word must be in the document; a title holding them all comes first', () => {
  assert.deepEqual(searchDocuments(weekend(), 'creme fromage', { titleOf }).map((hit) => hit.title), ['Courses', 'Idées de desserts']);
  assert.deepEqual(searchDocuments(weekend(), 'vin', { titleOf }).map((hit) => hit.title), ['Quel vin ?']);
  assert.deepEqual(searchDocuments(weekend(), 'vin', { titleOf })[0].marks, [[5, 8]]);
  assert.deepEqual(searchDocuments(weekend(), 'pizza', { titleOf }), []);
  assert.deepEqual(searchDocuments(weekend(), '   ', { titleOf }), []);
});

test('a few parts are shown, and how many more there are', () => {
  const list = addItems(createList({ name: 'Valise' }), 'Pull 1\nPull 2\nPull 3\nPull 4\nPull 5');
  const [hit] = searchDocuments([list], 'pull', { titleOf, parts: 3 });
  assert.equal(hit.parts.length, 3);
  assert.equal(hit.more, 2);
});

test('a repayment is not an expense to find', () => {
  const [, , , spend] = weekend();
  assert.deepEqual(searchDocuments([spend], 'rembourse', { titleOf }), []);
});
