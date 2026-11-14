import test from 'node:test';
import assert from 'node:assert/strict';

import { withMeFirst, withoutMe, distinctNames, addPerson, renamePerson, hasPerson } from '../src/people.js';
import { createList } from '../src/lists.js';
import { createPoll } from '../src/polls.js';
import { createSpend } from '../src/spends.js';

test('an empty form offers me as its first person', () => {
  assert.deepEqual(withMeFirst(['', ''], 'Gui'), ['Gui', '']);
  assert.deepEqual(withMeFirst(['', '', ''], '  Gui  '), ['Gui', '', ''],
    'however the name was stored');
});

test('a form with anything in it is left exactly as it stands', () => {
  // This is the whole point: someone who deletes their own name is someone
  // who is not on that list, and no redraw may put them back on it.
  assert.deepEqual(withMeFirst(['', 'Bob'], 'Gui'), ['', 'Bob']);
  assert.deepEqual(withMeFirst([' ', 'Bob'], 'Gui'), [' ', 'Bob']);
  const typed = ['x', ''];
  assert.equal(withMeFirst(typed, 'Gui'), typed, 'and handed back untouched, as the very same form');
});

test('nobody is offered twice', () => {
  assert.deepEqual(withMeFirst(['Gui', ''], 'Gui'), ['Gui', '']);
  assert.deepEqual(withMeFirst(['gui', ''], 'Gui'), ['gui', ''], 'whatever the case');
});

test('a device with no first name changes nothing', () => {
  const names = ['', ''];
  assert.equal(withMeFirst(names, ''), names);
  assert.equal(withMeFirst(names, null), names);
  assert.equal(withMeFirst(names, '   '), names);
});

test('what comes out is a form, not a longer one', () => {
  assert.equal(withMeFirst(['', '', ''], 'Gui').length, 3);
  assert.equal(withMeFirst([''], 'Gui').length, 1);
});

test('and my name is taken back out when the form stops being about people', () => {
  assert.deepEqual(withoutMe(['Gui', ''], 'Gui'), ['', '']);
  assert.deepEqual(withoutMe(['', 'gui'], 'Gui'), ['', ''], 'whatever the case');
  const others = ['Bob', 'Alice'];
  assert.equal(withoutMe(others, 'Gui'), others, 'a form that never held my name is untouched');
  assert.equal(withoutMe(others, ''), others, 'and a device with no first name changes nothing');
  assert.deepEqual(withoutMe(['Gui', 'Bob'], 'Gui'), ['', 'Bob'], 'the others stay where they are');
});

test('a document never has the same person twice, however the name is written', () => {
  assert.deepEqual(distinctNames(['Gui', ' gui ', '', 'Léa', 'LEA', 'Alice']), ['Gui', 'Léa', 'Alice']);
  const list = createList({ name: 'Courses', names: ['Gui', 'gui', 'Alice'] });
  assert.deepEqual(list.people.map((person) => person.name), ['Gui', 'Alice']);
  assert.deepEqual(createPoll({ question: 'Quand ?', names: ['Léa', 'Lea'] }).people.map((person) => person.name), ['Léa']);
  assert.deepEqual(createSpend({ name: 'Week-end', names: ['Bob', 'BOB '] }).people.map((person) => person.name), ['Bob']);

  // Added again, written otherwise: the same list comes back.
  assert.equal(addPerson(list, 'GUI'), list);
  assert.equal(addPerson(list, 'Léa').people.length, 3);

  // Renamed onto someone else: refused; onto another spelling of oneself: done.
  const [gui, alice] = list.people;
  assert.equal(renamePerson(list, alice.id, 'gui'), list);
  assert.equal(renamePerson(list, gui.id, 'GUI').people[0].name, 'GUI');
  assert.equal(hasPerson(list, 'alice'), true);
  assert.equal(hasPerson(list, 'alice', alice.id), false);
});
