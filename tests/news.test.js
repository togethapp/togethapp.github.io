import test from 'node:test';
import assert from 'node:assert/strict';

import { factsOf, newsOf, newsKey, seenWith } from '../src/news.js';
import { createList, addItems, toggleItem } from '../src/lists.js';
import { createPoll, addOptions, setVote, setClosed, setPollDate } from '../src/polls.js';
import { createSpend, addSpend, addRepayment } from '../src/spends.js';
import { createBoard, addCard } from '../src/ideas.js';
import { createGame, addRound } from '../src/model.js';
import { addWords, react } from '../src/reacts.js';

/** A moment strictly after everything written so far, and the clock moved past it. */
function mark() {
  const at = Date.now();
  while (Date.now() <= at) { /* wait for the next millisecond */ }
  return at;
}

const types = (found) => (found ? found.facts.map((fact) => fact.type) : []);

test('nothing changed since: no news', () => {
  const list = addItems(createList({ name: 'Courses' }), 'Pain\nLait');
  const since = mark();
  assert.equal(factsOf(list, since), null);
  assert.deepEqual(newsOf([list], since), []);
});

test('a document made since is new, and only that', () => {
  const since = mark();
  const list = addItems(createList({ name: 'Courses' }), 'Pain\nLait');
  assert.deepEqual(types(factsOf(list, since)), ['new']);
});

test('a list: lines added and lines ticked, named', () => {
  let list = addItems(createList({ name: 'Courses' }), 'Pain\nLait\nOeufs\nBeurre\nSel');
  const since = mark();
  list = addItems(list, 'Vin');
  for (const item of list.items.slice(0, 4)) list = toggleItem(list, item.id);
  const found = factsOf(list, since);
  assert.deepEqual(types(found), ['added', 'ticked']);
  assert.equal(found.facts[0].count, 1);
  assert.equal(found.facts[1].count, 4);
  assert.deepEqual(found.facts[1].texts, ['Pain', 'Lait', 'Oeufs']);
});

test('a poll: who answered, leaving oneself out; choices added; day settled', () => {
  let poll = addOptions(createPoll({ question: 'Quel soir ?', names: ['Alice', 'Bob', 'Gui'] }), 'Vendredi\nSamedi');
  const since = mark();
  const [alice, bob, gui] = poll.people;
  poll = setVote(poll, alice.id, poll.options[0].id, 'yes');
  poll = setVote(poll, alice.id, poll.options[1].id, 'yes');
  poll = setVote(poll, gui.id, poll.options[1].id, 'yes');
  poll = addOptions(poll, 'Dimanche');
  poll = setClosed(setPollDate(poll, '2026-12-12', '20:00'), true);
  const found = factsOf(poll, since, 'gui');
  assert.deepEqual(types(found), ['answered', 'choices', 'dated']);
  assert.deepEqual(found.facts[0].names, ['Alice']);
  assert.equal(found.facts[2].date, '2026-12-12');
  assert.equal(found.facts[2].at, '20:00');
  assert.ok(!found.facts[0].names.includes(bob.name));
});

test('a poll closed without a day says it is closed', () => {
  let poll = addOptions(createPoll({ question: 'Quel cadeau ?', names: ['Alice'] }), 'Livre\nDisque');
  const since = mark();
  poll = setClosed(poll, true);
  assert.deepEqual(types(factsOf(poll, since)), ['closed']);
});

test('an account: expenses with their total and who paid, repayments apart', () => {
  let spend = createSpend({ name: 'Week-end', names: ['Alice', 'Bob'] });
  const [alice, bob] = spend.people;
  spend = addSpend(spend, { text: 'Gîte', amount: 30000, by: alice.id, forWhom: [alice.id, bob.id] });
  const since = mark();
  spend = addSpend(spend, { text: 'Courses', amount: 4250, by: bob.id, forWhom: [alice.id, bob.id] });
  spend = addSpend(spend, { text: 'Vin', amount: 1200, by: bob.id, forWhom: [alice.id, bob.id] });
  spend = addRepayment(spend, { from: bob.id, to: alice.id, amount: 5000 });
  const found = factsOf(spend, since);
  assert.deepEqual(types(found), ['spent', 'repaid']);
  assert.equal(found.facts[0].count, 2);
  assert.equal(found.facts[0].cents, 5450);
  assert.deepEqual(found.facts[0].names, ['Bob']);
  assert.equal(found.facts[1].count, 1);
});

test('ideas added, and rounds played', () => {
  let board = addCard(createBoard({ name: 'Cadeau' }), 'note', 'Un livre').board;
  let game = createGame({ presetId: 'papayoo', names: ['Alice', 'Bob', 'Gui'] });
  const since = mark();
  board = addCard(board, 'note', 'Un disque').board;
  game = addRound(game, { scores: {} });
  assert.deepEqual(types(factsOf(board, since)), ['cards']);
  assert.deepEqual(types(factsOf(game, since)), ['rounds']);
});

test('words and reactions from others, never one’s own', () => {
  let board = addCard(createBoard({ name: 'Cadeau' }), 'note', 'Un livre').board;
  const since = mark();
  board = addWords(board, '', 'Alice', 'Bonne idée');
  board = addWords(board, '', 'Gui', 'Merci');
  board = react(board, '', 'Bob', '👍');
  board = react(board, '', 'Gui', '🎉');
  const found = factsOf(board, since, 'Gui');
  assert.deepEqual(types(found), ['words', 'reacts']);
  assert.equal(found.facts[0].name, 'Alice');
  assert.equal(found.facts[0].text, 'Bonne idée');
  assert.equal(found.facts[1].count, 1);
  // Only one's own: nothing.
  const mine = react(addWords(board, '', 'Gui', 'Encore'), '', 'Gui', '❤️');
  assert.equal(factsOf(mine, mine.updatedAt - 1, 'gui'), null);
});

test('news: newest first, archived left out, the name chosen per document', () => {
  const list = addItems(createList({ name: 'Courses' }), 'Pain');
  const old = { ...addItems(createList({ name: 'Rangée' }), 'Sel'), archivedAt: 1 };
  const since = mark();
  const board = createBoard({ name: 'Cadeau' });
  mark();
  const later = toggleItem(list, list.items[0].id);
  const entries = newsOf([board, later, toggleItem(old, old.items[0].id)], since, { me: () => '' });
  assert.deepEqual(entries.map((entry) => entry.doc.name), ['Courses', 'Cadeau']);
});

test('the last visits: one key per page, the oldest forgotten past two hundred', () => {
  assert.equal(newsKey('group', 'mifa'), 'group:mifa');
  let seen = {};
  for (let i = 0; i < 205; i += 1) seen = seenWith(seen, `group:${i}`, 1000 + i);
  assert.equal(Object.keys(seen).length, 200);
  assert.equal(seen['group:0'], undefined);
  assert.equal(seen['group:204'], 1204);
  assert.deepEqual(seenWith(null, 'event:x', 5), { 'event:x': 5 });
});

test('made since, and used since: new, and what came after its making', () => {
  const since = mark();
  let list = addItems(createList({ name: 'Courses' }), 'Pain\nLait');
  mark();
  list = toggleItem(addItems(list, 'Vin'), list.items[0].id);
  const found = factsOf(list, since);
  assert.deepEqual(types(found), ['new', 'added', 'ticked']);
  assert.equal(found.facts[1].count, 1);
});

test('the page’s own document is not announced as new on its page', () => {
  const since = mark();
  const list = createList({ name: 'Courses' });
  assert.deepEqual(newsOf([list], since, { here: list.id }), []);
  assert.equal(newsOf([list], since).length, 1);
});
