import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefillOf, prefillLinkFrom, withoutPrefill } from '../src/prefill.js';

test('a list form is filled in from its address', () => {
  const fill = prefillOf('#/lists/new?titre=Raclette&lignes=Fromage%0A%202%20baguettes%20%0A%0ACornichons&personnes=Gui,%20Alice,gui,');
  assert.deepEqual(fill, {
    title: 'Raclette',
    lines: ['Fromage', '2 baguettes', 'Cornichons'],
    people: ['Gui', 'Alice'],
  }, 'blank lines and a name given twice are left out');
});

test('a poll, an account and an event take what is theirs, checked', () => {
  assert.deepEqual(prefillOf('#/polls/new?question=Quel%20soir%20%3F&choix=Vendredi%0ASamedi'),
    { question: 'Quel soir ?', choices: ['Vendredi', 'Samedi'] });
  assert.deepEqual(prefillOf('#/spends/new?titre=Corse&monnaie=chf'), { title: 'Corse', currency: 'CHF' });
  assert.deepEqual(prefillOf('#/agenda/new?titre=Anniv&jour=2026-11-14&heure=9:30&fin=demain'),
    { title: 'Anniv', day: '2026-11-14', hour: '09:30' }, 'a day that is not a day is dropped');
});

test('nothing to fill, or not a form: nothing', () => {
  assert.equal(prefillOf('#/lists/new'), null);
  assert.equal(prefillOf('#/lists/new?autre=1'), null);
  assert.equal(prefillOf('#/list/l_1?titre=x'), null);
  assert.equal(prefillOf('#/games/new?titre=x'), null);
});

test('the address loses what it filled in, and keeps the rest', () => {
  assert.equal(withoutPrefill('#/lists/new?titre=x'), '#/lists/new');
  assert.equal(withoutPrefill('#/join/123456/Mifa?'), '#/join/123456/Mifa?', 'other addresses are left alone');
});

test('a form link is found in whatever was pasted', () => {
  assert.equal(
    prefillLinkFrom('Voilà : https://gui.github.io/Code/#/polls/new?question=Quand%20%3F&choix=Lundi bonne soirée'),
    '#/polls/new?question=Quand%20%3F&choix=Lundi',
  );
  assert.equal(prefillLinkFrom('https://gui.github.io/Code/#/list/l_1'), null);
});
