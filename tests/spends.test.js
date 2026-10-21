import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSpend, readAmount, showAmount, spendCurrency, addSpend, editSpend, removeSpend, archiveSpend,
  addSpendPerson, removeSpendPerson, canRemovePerson, split, balances, spendTotal, settle, mergeSpends, isValidSpend,
  addRepayment, isRepayment, splitBy, lineShares, readParts, weightOf, stepParts, setSpendWeight, splitProblem,
  payOf, setSpendPay, priceIn, withoutPrice, priceCurrency, addLatecomer, sharedWithEveryone,
  readRate, convertPaid, paidInOf, lastRate, PAID_IN,
} from '../src/spends.js';

/** Un week-end à trois : Gui paie le gîte, Alice les courses. */
function weekend() {
  const spend = createSpend({ name: 'Week-end', names: ['Gui', 'Alice', 'Bob'] });
  const [gui, alice] = spend.people;
  const withGite = addSpend(spend, { text: 'Gîte', amount: 30000, by: gui.id });
  return addSpend(withGite, { text: 'Courses', amount: 6000, by: alice.id });
}

const idOf = (spend, name) => spend.people.find((person) => person.name === name).id;

test('un compte est un nom, des personnes, et des lignes', () => {
  const spend = createSpend({ name: '  Vacances ', names: ['Gui', ' ', 'Alice'] });
  assert.equal(spend.name, 'Vacances');
  assert.equal(spend.kind, 'spend');
  assert.deepEqual(spend.people.map((p) => p.name), ['Gui', 'Alice']);
  assert.deepEqual(spend.lines, []);
  assert.equal(spend.shared, false);
  assert.ok(spend.id.startsWith('d_'));
});

test('un montant se tape comme il se dit', () => {
  assert.equal(readAmount('12,50'), 1250);
  assert.equal(readAmount('12.5'), 1250);
  assert.equal(readAmount('12'), 1200);
  assert.equal(readAmount(' 3 € '), 300);
  assert.equal(readAmount('0,99'), 99);
  assert.equal(readAmount(''), null);
  assert.equal(readAmount('0'), null, 'une dépense de rien n’est pas une dépense');
  assert.equal(readAmount('-5'), null);
  assert.equal(readAmount('deux euros'), null);
  assert.equal(readAmount('12,345'), null, 'il n’y a pas de dixième de centime');
});

test('les centimes restent des entiers, et ne dérivent pas', () => {
  // 0,1 + 0,2 ne fait pas 0,3 en binaire : c'est exactement ce qu'on évite.
  const spend = createSpend({ name: 'Bar', names: ['Gui', 'Alice'] });
  let held = addSpend(spend, { text: 'a', amount: '0,10', by: idOf(spend, 'Gui') });
  held = addSpend(held, { text: 'b', amount: '0,20', by: idOf(spend, 'Gui') });
  assert.equal(spendTotal(held), 30);
  assert.equal(showAmount(spendTotal(held), 'fr').replace(/ | /g, ' '), '0,30 €');
});

test('un partage ne perd pas de centime, et le perd toujours au même endroit', () => {
  assert.deepEqual(split(1000, 3), [334, 333, 333]);
  assert.deepEqual(split(1000, 4), [250, 250, 250, 250]);
  assert.deepEqual(split(1, 3), [1, 0, 0]);
  assert.deepEqual(split(100, 0), []);
  for (const [amount, count] of [[1000, 3], [9999, 7], [1, 2], [123456, 11]]) {
    assert.equal(split(amount, count).reduce((sum, part) => sum + part, 0), amount, `${amount}/${count}`);
  }
});

test('les soldes disent qui a payé pour les autres, et la somme fait zéro', () => {
  const rows = balances(weekend());
  const by = Object.fromEntries(rows.map((row) => [row.name, row]));

  assert.equal(by.Gui.paid, 30000);
  assert.equal(by.Alice.paid, 6000);
  assert.equal(by.Bob.paid, 0);
  assert.equal(by.Gui.owed, 12000, 'un tiers de 360 €');
  assert.equal(by.Gui.balance, 18000, 'on lui doit 180 €');
  assert.equal(by.Bob.balance, -12000);
  assert.equal(rows.reduce((sum, row) => sum + row.balance, 0), 0);
});

test('une dépense peut ne concerner qu’une partie du monde', () => {
  const spend = createSpend({ name: 'Soirée', names: ['Gui', 'Alice', 'Bob'] });
  const held = addSpend(spend, {
    text: 'Taxi', amount: 3000, by: idOf(spend, 'Gui'),
    forWhom: [idOf(spend, 'Gui'), idOf(spend, 'Alice')],
  });
  const by = Object.fromEntries(balances(held).map((row) => [row.name, row]));
  assert.equal(by.Bob.owed, 0, 'il n’était pas dans le taxi');
  assert.equal(by.Alice.balance, -1500);
  assert.equal(by.Gui.balance, 1500);
});

test('« pour tout le monde » suit les personnes du compte, même ajoutées après', () => {
  const spend = createSpend({ name: 'Coloc', names: ['Gui', 'Alice'] });
  const held = addSpend(spend, { text: 'Courses', amount: 1000, by: idOf(spend, 'Gui') });
  assert.deepEqual(held.lines[0].forWhom, [], 'rien d’écrit veut dire tout le monde');

  const withBob = addSpendPerson(held, 'Bob');
  const by = Object.fromEntries(balances(withBob).map((row) => [row.name, row]));
  assert.equal(by.Bob.owed, 333, 'et tout le monde, c’est tout le monde à cet instant');
  assert.equal(by.Gui.owed, 334, 'le centime qui reste va au premier, toujours le même');
  assert.equal(balances(withBob).reduce((sum, row) => sum + row.balance, 0), 0);
});

test('qui rembourse qui, en peu de virements et au centime', () => {
  const moves = settle(weekend());
  assert.equal(moves.length, 2, 'au plus une personne de moins qu’il n’y en a');
  assert.equal(moves.reduce((sum, move) => sum + move.amount, 0), 18000);
  assert.ok(moves.every((move) => move.to === 'Gui'), 'c’est lui qui a avancé');
  const fromBob = moves.find((move) => move.from === 'Bob');
  assert.equal(fromBob.amount, 12000);
  assert.equal(moves.find((move) => move.from === 'Alice').amount, 6000);
});

test('un compte équilibré ne demande aucun virement', () => {
  const spend = createSpend({ name: 'Quitte', names: ['Gui', 'Alice'] });
  let held = addSpend(spend, { text: 'a', amount: 1000, by: idOf(spend, 'Gui') });
  held = addSpend(held, { text: 'b', amount: 1000, by: idOf(spend, 'Alice') });
  assert.deepEqual(settle(held), []);
  assert.equal(spendTotal(held), 2000);
});

test('une ligne se corrige, et se retire pour de bon', () => {
  let spend = weekend();
  const line = spend.lines[0];
  spend = editSpend(spend, line.id, { amount: '250', text: 'Gîte (remise)' });
  assert.equal(spend.lines[0].amount, 25000);
  assert.equal(spend.lines[0].text, 'Gîte (remise)');
  assert.ok(spend.lines[0].updatedAt >= line.updatedAt);

  const short = removeSpend(spend, line.id);
  assert.equal(short.lines.length, 1);
  assert.ok(short.removed[line.id], 'sans quoi l’autre téléphone la rendrait');
  assert.equal(removeSpend(short, 'pas-une-ligne'), short);
});

test('on ne retire pas quelqu’un qui a avancé de l’argent', () => {
  const spend = weekend();
  assert.equal(canRemovePerson(spend, idOf(spend, 'Alice')), 'paid');
  assert.equal(removeSpendPerson(spend, idOf(spend, 'Alice')), spend,
    'sinon la somme des soldes cesserait de faire zéro, sans que rien ne le dise');

  // Ses lignes retirées, elle s'en va — et le compte tient toujours debout.
  const without = removeSpend(spend, spend.lines[1].id);
  assert.equal(canRemovePerson(without, idOf(spend, 'Alice')), 'ok');
  const short = removeSpendPerson(without, idOf(spend, 'Alice'));
  assert.equal(short.people.length, 2);
  assert.equal(spendTotal(short), 30000);
  assert.equal(balances(short).reduce((sum, row) => sum + row.balance, 0), 0);
});

test('ni quelqu’un qu’une ligne concerne tout seul', () => {
  const spend = createSpend({ name: 'Soirée', names: ['Gui', 'Alice'] });
  const held = addSpend(spend, {
    text: 'Taxi d’Alice', amount: 2000, by: idOf(spend, 'Gui'), forWhom: [idOf(spend, 'Alice')],
  });
  assert.equal(canRemovePerson(held, idOf(spend, 'Alice')), 'alone',
    '« pour personne » se lirait « pour tout le monde »');
  assert.equal(removeSpendPerson(held, idOf(spend, 'Alice')), held);
});

test('mais quelqu’un qui partageait une ligne s’en va, et la ligne se repartage', () => {
  const spend = createSpend({ name: 'Soirée', names: ['Gui', 'Alice', 'Bob'] });
  const held = addSpend(spend, {
    text: 'Taxi', amount: 3000, by: idOf(spend, 'Gui'),
    forWhom: [idOf(spend, 'Gui'), idOf(spend, 'Alice'), idOf(spend, 'Bob')],
  });
  const short = removeSpendPerson(held, idOf(spend, 'Bob'));
  assert.equal(short.people.length, 2);
  assert.deepEqual(short.lines[0].forWhom, [idOf(spend, 'Gui'), idOf(spend, 'Alice')]);
  const by = Object.fromEntries(balances(short).map((row) => [row.name, row]));
  assert.equal(by.Alice.balance, -1500, 'elle paie la moitié, et non plus le tiers');
  assert.equal(balances(short).reduce((sum, row) => sum + row.balance, 0), 0);
});

test('deux téléphones qui notent chacun une dépense les gardent toutes les deux', () => {
  const spend = weekend();
  const here = addSpend(spend, { text: 'Essence', amount: 5000, by: idOf(spend, 'Bob') });
  const there = addSpend({ ...spend, updatedAt: spend.updatedAt + 5 }, { text: 'Pain', amount: 300, by: idOf(spend, 'Alice') });

  const merged = mergeSpends(here, there);
  assert.equal(merged.lines.length, 4);
  assert.ok(merged.lines.some((line) => line.text === 'Essence'));
  assert.ok(merged.lines.some((line) => line.text === 'Pain'));
  assert.equal(spendTotal(merged), 41300);
});

test('une ligne retirée ici reste retirée quand l’autre copie arrive', () => {
  const spend = weekend();
  const gone = removeSpend(spend, spend.lines[0].id);
  const merged = mergeSpends(gone, spend);
  assert.equal(merged.lines.length, 1, 'la pierre tombale tient');
});

test('un compte se range et se ressort', () => {
  const spend = archiveSpend(weekend());
  assert.ok(spend.archivedAt);
  assert.equal(archiveSpend(spend, false).archivedAt, null);
  assert.equal(spendTotal(spend), 36000);
});

test('ce qui n’est pas un compte est refusé', () => {
  assert.equal(isValidSpend(weekend()), true);
  assert.equal(isValidSpend(null), false);
  assert.equal(isValidSpend({ kind: 'list', id: 'l_1', people: [], lines: [] }), false);
  assert.equal(isValidSpend({ kind: 'spend', id: 'd_1', people: [], lines: [{ id: 'x' }] }), false);
  assert.equal(isValidSpend({ kind: 'spend', id: 'd_1', people: [], lines: [] }), true);
});

test('un montant fractionnaire n’entre pas, d’où qu’il vienne', () => {
  // readAmount le refuse déjà à la saisie ; la garde est le dernier passage —
  // un export retouché à la main, ou une base écrite par autre chose.
  const bancal = (amount) => ({
    kind: 'spend', id: 'd_1', people: [{ id: 'a', name: 'A' }],
    lines: [{ id: 's_1', amount, forWhom: [] }],
  });
  assert.equal(isValidSpend(bancal(100)), true);
  assert.equal(isValidSpend(bancal(100.5)), false, 'un demi-centime n’existe pas');
  assert.equal(isValidSpend(bancal(0)), false);
  assert.equal(isValidSpend(bancal(-100)), false);
  assert.equal(isValidSpend(bancal(Number.NaN)), false);
  assert.equal(isValidSpend(bancal('100')), false);
});

test('et le compte tombe juste, quel que soit le tirage', () => {
  // Trois mille comptes au hasard : les soldes font zéro, et les virements
  // proposés mettent tout le monde à jour sans créer un centime.
  for (let run = 0; run < 300; run += 1) {
    const count = 2 + Math.floor(Math.random() * 5);
    let spend = createSpend({ name: 'x', names: Array.from({ length: count }, (_, i) => `P${i}`) });
    for (let i = 0; i < 1 + Math.floor(Math.random() * 6); i += 1) {
      spend = addSpend(spend, {
        text: `l${i}`,
        amount: 1 + Math.floor(Math.random() * 500000),
        by: spend.people[Math.floor(Math.random() * count)].id,
        forWhom: spend.people.filter(() => Math.random() < 0.6).map((person) => person.id),
      });
    }

    const rows = balances(spend);
    assert.equal(rows.reduce((sum, row) => sum + row.balance, 0), 0);

    const after = new Map(rows.map((row) => [row.id, row.balance]));
    const moves = settle(spend);
    for (const move of moves) {
      after.set(move.fromId, after.get(move.fromId) + move.amount);
      after.set(move.toId, after.get(move.toId) - move.amount);
    }
    assert.deepEqual([...after.values()].filter((value) => value !== 0), [],
      'le remboursement laisse tout le monde à zéro');
    assert.ok(moves.length <= count - 1, `${moves.length} virements pour ${count} personnes`);
    assert.ok(moves.every((move) => move.amount > 0));
  }
});

test('un remboursement noté remet les soldes à jour, sans rien coûter', () => {
  const spend = weekend();
  const moves = settle(spend);
  let paid = spend;
  for (const move of moves) paid = addRepayment(paid, { from: move.fromId, to: move.toId, amount: move.amount, day: '2026-09-25' });
  assert.equal(paid.lines.filter(isRepayment).length, moves.length);
  assert.ok(balances(paid).every((row) => row.balance === 0));
  assert.equal(settle(paid).length, 0);
  // Ni le total, ni ce que chacun a avancé ne bougent.
  assert.equal(spendTotal(paid), spendTotal(spend));
  assert.deepEqual(balances(paid).map((row) => row.paid), balances(spend).map((row) => row.paid));
});

test('un remboursement partiel laisse le reste à rendre', () => {
  const spend = weekend();
  const [move] = settle(spend);
  const half = addRepayment(spend, { from: move.fromId, to: move.toId, amount: 5000 });
  const [next] = settle(half);
  assert.equal(next.fromId, move.fromId);
  assert.equal(next.amount, move.amount - 5000);
  assert.equal(balances(half).reduce((sum, row) => sum + row.balance, 0), 0);
});

test('un remboursement se corrige ou se retire, et reste un remboursement', () => {
  const spend = weekend();
  const [gui, alice, bob] = spend.people;
  const noted = addRepayment(spend, { from: bob.id, to: gui.id, amount: 4000 });
  const line = noted.lines.at(-1);
  const fixed = editSpend(noted, line.id, { amount: 3000, by: bob.id, forWhom: [alice.id] });
  assert.ok(isRepayment(fixed.lines.at(-1)));
  assert.equal(balances(fixed).find((row) => row.id === alice.id).received, 3000);
  assert.deepEqual(balances(removeSpend(fixed, line.id)), balances(spend));
});

test('un remboursement vers soi-même, vers un inconnu ou de zéro n’est pas noté', () => {
  const spend = weekend();
  const [gui] = spend.people;
  assert.equal(addRepayment(spend, { from: gui.id, to: gui.id, amount: 100 }), spend);
  assert.equal(addRepayment(spend, { from: gui.id, to: 'personne', amount: 100 }), spend);
  assert.equal(addRepayment(spend, { from: gui.id, to: spend.people[1].id, amount: 0 }), spend);
});

test('un remboursement voyage entre deux téléphones comme une dépense', () => {
  const spend = weekend();
  const [gui, alice] = spend.people;
  const mine = addRepayment(spend, { from: alice.id, to: gui.id, amount: 1000 });
  const merged = mergeSpends(mine, { ...spend, updatedAt: spend.updatedAt - 1 });
  assert.ok(isValidSpend(merged));
  assert.ok(merged.lines.some(isRepayment));
});

test('an account keeps its own currency, euros by default', () => {
  assert.equal(spendCurrency(createSpend({ name: 'Annecy' })), 'EUR');
  assert.equal(spendCurrency({ kind: 'spend' }), 'EUR', 'an account from before currencies is in euros');
  assert.equal(spendCurrency(createSpend({ name: 'Londres', currency: 'GBP' })), 'GBP');
  assert.equal(spendCurrency(createSpend({ name: '?', currency: 'XYZ' })), 'EUR');
  assert.match(showAmount(1250, 'fr', 'CHF'), /12,50\s?CHF/);
  assert.match(showAmount(1250, 'en', 'GBP'), /£12\.50/);
  assert.equal(readAmount('£12.50'), 1250);
  assert.equal(readAmount('12,50 CHF'), 1250);
  assert.equal(readAmount('$3'), 300);
});

/* ------------------------------------------------------------- les parts --- */

const owedBy = (spend) => Object.fromEntries(balances(spend).map((row) => [row.name, row.owed]));

test('à parts égales, le partage tombe sur les mêmes centimes qu’avant', () => {
  for (const [amount, count] of [[1000, 3], [9999, 7], [1, 2], [123456, 11], [1, 3]]) {
    assert.deepEqual(splitBy(amount, Array(count).fill(2)), split(amount, count), `${amount}/${count}`);
  }
});

test('selon des parts, sans perdre de centime, au plus près', () => {
  assert.deepEqual(splitBy(1000, [2, 1, 1]), [500, 250, 250]);
  assert.deepEqual(splitBy(1000, [1, 2]), [333, 667], 'le centime va à qui en était le plus près');
  assert.deepEqual(splitBy(0, [1, 2]), [0, 0]);
  assert.deepEqual(splitBy(500, [0, 0]), [0, 0], 'sans parts, personne');
  for (let run = 0; run < 500; run += 1) {
    const parts = Array.from({ length: 1 + Math.floor(Math.random() * 8) }, () => 1 + Math.floor(Math.random() * 40));
    const amount = Math.floor(Math.random() * 10_000_000);
    const shares = splitBy(amount, parts);
    assert.equal(shares.reduce((sum, share) => sum + share, 0), amount);
    const total = parts.reduce((sum, part) => sum + part, 0);
    shares.forEach((share, index) => assert.ok(Math.abs(share - (amount * parts[index]) / total) < 1, 'à moins d’un centime de sa part'));
  }
});

test('des parts se lisent par moitiés, de ½ à 99', () => {
  assert.equal(readParts(2), 2);
  assert.equal(readParts('1,5'), 1.5);
  assert.equal(readParts(0.5), 0.5);
  assert.equal(readParts(0), null, 'zéro part, c’est ne pas être concerné : une case à décocher');
  assert.equal(readParts(0.3), null);
  assert.equal(readParts(100), null);
  assert.equal(readParts('deux'), null);
  assert.equal(readParts(null), null);
  assert.equal(weightOf({ name: 'A' }), 1, 'une part quand rien n’est dit');
  assert.equal(weightOf({ name: 'A', weight: 'n’importe quoi' }), 1);
  // ½, 1, 2, 3… : sous une part, seulement une demie.
  assert.deepEqual([0.5, 1, 1.5, 2, 99].map((value) => stepParts(value, 1)), [1, 2, 2, 3, 99]);
  assert.deepEqual([0.5, 1, 1.5, 2, 99].map((value) => stepParts(value, -1)), [0.5, 0.5, 1, 1, 98]);
});

test('une famille compte pour quatre, dans tout le compte, même ce qui est déjà noté', () => {
  const spend = createSpend({ name: 'Vacances', names: ['Martin', 'Durand', 'Zoé'] });
  let held = addSpend(spend, { text: 'Gîte', amount: 80000, by: idOf(spend, 'Martin') });
  held = setSpendWeight(held, idOf(spend, 'Martin'), 4);
  held = setSpendWeight(held, idOf(spend, 'Durand'), 3);
  held = addSpend(held, { text: 'Courses', amount: 16000, by: idOf(spend, 'Durand') });
  const owed = owedBy(held);
  assert.equal(owed.Martin, 48000, '4 parts sur 8 de 960 €');
  assert.equal(owed.Durand, 36000);
  assert.equal(owed.Zoé, 12000);
  assert.equal(balances(held).reduce((sum, row) => sum + row.balance, 0), 0);
  assert.equal(held.people[0].weight, 4);
  assert.ok(held.peopleAt > spend.peopleAt, 'les parts vont avec les personnes, sur leur horloge');
  // Revenir à une part efface le réglage, plutôt que d'écrire « 1 ».
  assert.equal('weight' in setSpendWeight(held, idOf(spend, 'Zoé'), 1).people[2], false);
  assert.equal(setSpendWeight(held, idOf(spend, 'Zoé'), 1), held, 'rien ne change, rien ne s’écrit');
});

test('un enfant pour moitié', () => {
  const spend = createSpend({ name: 'Resto', names: ['Gui', 'Alice', 'Léo'] });
  const held = addSpend(setSpendWeight(spend, idOf(spend, 'Léo'), 0.5), { text: 'Resto', amount: 10000, by: idOf(spend, 'Gui') });
  assert.deepEqual(owedBy(held), { Gui: 4000, Alice: 4000, Léo: 2000 });
});

test('une dépense peut donner ses propres parts : deux nuits pour l’une, cinq pour l’autre', () => {
  const spend = createSpend({ name: 'Gîte', names: ['Alice', 'Bob', 'Couple'] });
  const couple = idOf(spend, 'Couple');
  const withWeight = setSpendWeight(spend, couple, 2);
  const held = addSpend(withWeight, {
    text: 'Nuits', amount: 9000, by: idOf(spend, 'Alice'),
    parts: { [idOf(spend, 'Alice')]: 2, [idOf(spend, 'Bob')]: 5, [couple]: 2 },
  });
  // Seul ce qui n'est pas l'usage est gardé : le couple compte déjà pour deux.
  assert.deepEqual(held.lines[0].parts, { [idOf(spend, 'Alice')]: 2, [idOf(spend, 'Bob')]: 5 });
  assert.deepEqual(owedBy(held), { Alice: 2000, Bob: 5000, Couple: 2000 });
  // Une dépense sans parts à elle n'en porte pas.
  assert.equal('parts' in addSpend(withWeight, { text: 'Pain', amount: 300, by: couple }).lines[0], false);
  assert.equal(setSpendWeight(spend, 'personne', 3), spend, 'quelqu’un qui n’est pas là ne compte pour rien');
});

test('un montant à part pour certains, le reste partagé entre les autres', () => {
  const spend = createSpend({ name: 'Resto', names: ['Gui', 'Alice', 'Bob'] });
  const [gui, alice, bob] = spend.people.map((person) => person.id);
  const held = addSpend(spend, { text: 'Addition', amount: 9000, by: gui, fixed: { [alice]: 1200 } });
  // Alice a pris la pizza seule ; les 78 € qui restent vont aux deux autres.
  assert.deepEqual(owedBy(held), { Gui: 3900, Alice: 1200, Bob: 3900 });
  assert.deepEqual(held.lines[0].fixed, { [alice]: 1200 });
  // À part, et concerné par le reste, ce sont deux choses : décochée, elle ne
  // paie que son montant ; avec un montant pour chacun, rien ne reste.
  const exact = addSpend(spend, { text: 'Addition', amount: 9000, by: gui, fixed: { [gui]: 3000, [alice]: 2500, [bob]: 3500 } });
  assert.deepEqual(owedBy(exact), { Gui: 3000, Alice: 2500, Bob: 3500 });
  const weighted = addSpend(setSpendWeight(spend, bob, 2), { text: 'Addition', amount: 9000, by: gui, fixed: { [alice]: 1200 } });
  assert.deepEqual(owedBy(weighted), { Gui: 2600, Alice: 1200, Bob: 5200 }, 'le reste suit les parts');
});

test('ce qui ne tombe pas juste ne s’écrit pas, et se dit avant', () => {
  const spend = createSpend({ name: 'Resto', names: ['Gui', 'Alice'] });
  const [gui, alice] = spend.people.map((person) => person.id);
  assert.equal(splitProblem(spend, { amount: 1000, fixed: { [alice]: 1500 } }), 'over');
  assert.equal(splitProblem(spend, { amount: 1000, fixed: { [alice]: 300, [gui]: 300 } }), 'left',
    'chacun a son montant, et il reste 4 € sans personne pour les prendre');
  assert.equal(splitProblem(spend, { amount: 1000, fixed: { [alice]: 300 } }), null);
  assert.equal(splitProblem(spend, { amount: 1000, forWhom: [gui], fixed: { [alice]: 1500 } }), null,
    'un montant pour qui n’est pas concerné ne compte pas');
  assert.equal(addSpend(spend, { amount: 1000, by: gui, fixed: { [alice]: 1500 } }), spend);
  // Corriger le montant sous ce qui est mis à part est refusé de même.
  const held = addSpend(spend, { amount: 1000, by: gui, fixed: { [alice]: 600 } });
  assert.equal(editSpend(held, held.lines[0].id, { amount: 500 }), held);
  assert.equal(editSpend(held, held.lines[0].id, { amount: 800 }).lines[0].amount, 800);
});

test('qui n’est plus concerné ne garde ni ses parts ni son montant à part', () => {
  const spend = createSpend({ name: 'Resto', names: ['Gui', 'Alice', 'Bob'] });
  const [gui, alice, bob] = spend.people.map((person) => person.id);
  const held = addSpend(spend, { amount: 9000, by: gui, parts: { [bob]: 2 }, fixed: { [alice]: 1200 } });
  const edited = editSpend(held, held.lines[0].id, { forWhom: [gui, bob] });
  assert.equal('fixed' in edited.lines[0], false);
  assert.deepEqual(edited.lines[0].parts, { [bob]: 2 });
  const cleared = editSpend(edited, edited.lines[0].id, { parts: {} });
  assert.equal('parts' in cleared.lines[0], false, 'des parts effacées ne laissent rien');
  assert.deepEqual(owedBy(cleared), { Gui: 4500, Alice: 0, Bob: 4500 });
});

test('on ne retire pas quelqu’un qui a un montant à part, et ses parts partent avec lui', () => {
  const spend = createSpend({ name: 'Resto', names: ['Gui', 'Alice', 'Bob'] });
  const [gui, alice, bob] = spend.people.map((person) => person.id);
  const apart = addSpend(spend, { amount: 9000, by: gui, fixed: { [alice]: 1200 } });
  assert.equal(canRemovePerson(apart, alice), 'apart');
  assert.equal(removeSpendPerson(apart, alice), apart);
  const parted = addSpend(spend, { amount: 9000, by: gui, parts: { [bob]: 2 } });
  const without = removeSpendPerson(parted, bob);
  assert.equal(without.people.length, 2);
  assert.equal('parts' in without.lines[0], false);
  assert.deepEqual(owedBy(without), { Gui: 4500, Alice: 4500 });
});

test('les parts et les montants à part voyagent entre deux téléphones', () => {
  const spend = createSpend({ name: 'Resto', names: ['Gui', 'Alice'] });
  const [gui, alice] = spend.people.map((person) => person.id);
  const mine = setSpendWeight(addSpend(spend, { amount: 9000, by: gui, fixed: { [alice]: 1200 } }), alice, 2);
  const theirs = addSpend({ ...spend, updatedAt: spend.updatedAt - 1 }, { amount: 500, by: alice });
  const merged = mergeSpends(mine, theirs);
  assert.equal(merged.lines.length, 2);
  assert.deepEqual(merged.lines.find((line) => line.amount === 9000).fixed, { [alice]: 1200 });
  assert.equal(merged.people.find((person) => person.id === alice).weight, 2);
  assert.ok(isValidSpend(merged));
});

test('et le compte tombe juste, avec des parts et des montants à part', () => {
  for (let run = 0; run < 300; run += 1) {
    const count = 2 + Math.floor(Math.random() * 5);
    let spend = createSpend({ name: 'x', names: Array.from({ length: count }, (_, i) => `P${i}`) });
    for (const person of spend.people) if (Math.random() < 0.4) spend = setSpendWeight(spend, person.id, 0.5 + Math.floor(Math.random() * 8) / 2);
    for (let i = 0; i < 1 + Math.floor(Math.random() * 6); i += 1) {
      const amount = 1 + Math.floor(Math.random() * 500000);
      const forWhom = spend.people.filter(() => Math.random() < 0.6).map((person) => person.id);
      const parts = Object.fromEntries(spend.people.filter(() => Math.random() < 0.3).map((person) => [person.id, 1 + Math.floor(Math.random() * 6)]));
      const fixed = Math.random() < 0.3 ? { [spend.people[0].id]: Math.floor(amount / 3) } : null;
      spend = addSpend(spend, { amount, by: spend.people[Math.floor(Math.random() * count)].id, forWhom, parts, fixed });
    }
    for (const line of spend.lines) {
      assert.equal([...lineShares(spend, line).values()].reduce((sum, cents) => sum + cents, 0), line.amount, 'chaque dépense est partagée au centime');
    }
    const rows = balances(spend);
    assert.equal(rows.reduce((sum, row) => sum + row.balance, 0), 0);
    const after = new Map(rows.map((row) => [row.id, row.balance]));
    for (const move of settle(spend)) {
      after.set(move.fromId, after.get(move.fromId) + move.amount);
      after.set(move.toId, after.get(move.toId) - move.amount);
    }
    assert.deepEqual([...after.values()].filter((value) => value !== 0), []);
  }
});

test('comment rembourser quelqu’un, écrit une fois dans le compte', () => {
  const spend = createSpend({ name: 'Vacances', names: ['Gui', 'Alice'] });
  const gui = idOf(spend, 'Gui');
  const held = setSpendPay(spend, gui, '  FR76 3000 6000 0112 3456 7890 189 ');
  assert.equal(payOf(held.people[0]), 'FR76 3000 6000 0112 3456 7890 189');
  assert.equal(payOf(held.people[1]), '');
  assert.ok(held.peopleAt > spend.peopleAt);
  assert.equal(setSpendPay(held, gui, 'FR76 3000 6000 0112 3456 7890 189'), held);
  assert.equal('pay' in setSpendPay(held, gui, '').people[0], false);
  assert.equal(payOf(setSpendPay(spend, gui, 'x'.repeat(500)).people[0]).length, 300, 'une adresse, pas un roman');
});

test('un prix écrit dans une ligne se lit, et seulement s’il dit que c’est de l’argent', () => {
  assert.equal(priceIn('Fromage 25 €'), 2500);
  assert.equal(priceIn('Vin (12,50€)'), 1250);
  assert.equal(priceIn('€8 le pack'), 800);
  assert.equal(priceIn('Train 45 euros'), 4500);
  assert.equal(priceIn('Forfait 30 CHF'), 3000);
  assert.equal(priceIn('2 × 8 € = 16 €'), 1600, 'le dernier l’emporte');
  assert.equal(priceIn('2 baguettes'), null, 'deux baguettes, pas deux euros');
  assert.equal(priceIn('12 eurovision'), null);
  assert.equal(priceIn(''), null);
  assert.equal(withoutPrice('Fromage 25 €'), 'Fromage');
  assert.equal(withoutPrice('Vin (12,50€)'), 'Vin');
  assert.equal(withoutPrice('Fromage — 25 €'), 'Fromage');
  assert.equal(withoutPrice('Fromage 25 €, pain'), 'Fromage, pain');
  assert.equal(withoutPrice('25 €'), '25 €', 'un prix tout seul reste ce qu’il est');
  assert.equal(withoutPrice('2 baguettes'), '2 baguettes');
  assert.deepEqual(['Fromage 25 €', 'Forfait 30 chf', '£3 tea', 'Pizza $12', 'Pain'].map(priceCurrency), ['EUR', 'CHF', 'GBP', 'USD', null]);
});

test('qui arrive en cours de route ne partage que ce qui vient, si on le dit', () => {
  const spend = weekend();
  assert.equal(sharedWithEveryone(spend), true, 'le gîte et les courses sont pour tout le monde');
  const tard = addLatecomer(spend, 'Zoé');
  const zoe = tard.people.find((person) => person.name === 'Zoé').id;
  assert.ok(tard.lines.every((line) => line.forWhom.length === 3 && !line.forWhom.includes(zoe)),
    'les dépenses déjà notées disent pour qui elles étaient');
  assert.deepEqual(balances(tard).map((row) => row.owed), [12000, 12000, 12000, 0], 'Zoé ne doit rien du gîte');
  const ensuite = addSpend(tard, { text: 'Resto', amount: 8000, by: zoe });
  assert.deepEqual(balances(ensuite).map((row) => row.owed), [14000, 14000, 14000, 2000], 'mais partage ce qui vient');
  // Ajoutée comme avant, elle partage tout : c'est l'oubli du premier jour.
  assert.deepEqual(balances(addSpendPerson(spend, 'Zoé')).map((row) => row.owed), [9000, 9000, 9000, 9000]);
  // Ce qui n'était que pour certains, et les remboursements, ne bougent pas.
  const deux = createSpend({ name: 'x', names: ['Gui', 'Alice'] });
  const [gui, alice] = deux.people.map((person) => person.id);
  const mixte = addRepayment(addSpend(deux, { amount: 500, by: gui, forWhom: [alice] }), { from: alice, to: gui, amount: 100 });
  assert.equal(sharedWithEveryone(mixte), false);
  const sans = addLatecomer(mixte, 'Zoé');
  assert.deepEqual(sans.lines.map((line) => line.forWhom), mixte.lines.map((line) => line.forWhom));
  assert.equal(sans.people.length, 3);
});

test('un taux se tape comme on le lit à la banque : 1 € = 0,86 £', () => {
  assert.equal(readRate('0,86'), 0.86);
  assert.equal(readRate(' 161 '), 161);
  assert.equal(readRate('1.123456'), 1.123456);
  assert.equal(readRate('1,1234567'), null, 'six décimales au plus');
  assert.equal(readRate('0'), null);
  assert.equal(readRate('-1'), null);
  assert.equal(readRate('un'), null);
  assert.equal(readRate(0.86), 0.86);
  assert.equal(readRate(Number.NaN), null);
  assert.equal(convertPaid(3000, 0.86), 3488, '30 £ à 0,86 font 34,88 €');
  assert.equal(convertPaid(300000, 161), 1863, '3 000 ¥ à 161 font 18,63 €');
  assert.equal(convertPaid(0, 0.86), null);
  assert.ok(PAID_IN.includes('JPY') && PAID_IN.includes('EUR'));
});

test('une dépense payée dans une autre monnaie entre convertie, et garde ce qui a été payé', () => {
  const spend = createSpend({ name: 'Londres', names: ['Gui', 'Alice'] });
  const gui = idOf(spend, 'Gui');
  const next = addSpend(spend, { text: 'Pub', amount: '30', currency: 'GBP', rate: '0,86', by: gui });
  const [line] = next.lines;
  assert.equal(line.amount, 3488);
  assert.deepEqual(line.paidIn, { currency: 'GBP', amount: 3000, rate: 0.86 });
  assert.deepEqual(paidInOf(next, line), line.paidIn);
  assert.equal(spendTotal(next), 3488, 'le compte reste dans sa monnaie');
  assert.deepEqual(balances(next).map((row) => row.balance), [1744, -1744]);

  assert.equal(addSpend(spend, { amount: 3000, currency: 'GBP', by: gui }).lines.length, 0, 'sans taux, rien');
  assert.equal(addSpend(spend, { amount: 3000, currency: 'XYZ', rate: 1, by: gui }).lines.length, 0, 'ni une monnaie inconnue');
  const home = addSpend(spend, { amount: 1200, currency: 'EUR', rate: 2, by: gui }).lines[0];
  assert.equal(home.amount, 1200, 'dans la monnaie du compte, aucun taux ne compte');
  assert.equal('paidIn' in home, false);
});

test('une dépense se corrige d’une monnaie à l’autre', () => {
  const spend = createSpend({ name: 'Londres', names: ['Gui', 'Alice'] });
  const gui = idOf(spend, 'Gui');
  const made = addSpend(spend, { text: 'Taxi', amount: 2000, by: gui });
  const id = made.lines[0].id;
  const abroad = editSpend(made, id, { amount: '25', currency: 'GBP', rate: 0.8 });
  assert.equal(abroad.lines[0].amount, 3125);
  assert.deepEqual(abroad.lines[0].paidIn, { currency: 'GBP', amount: 2500, rate: 0.8 });
  const renamed = editSpend(abroad, id, { text: 'Taxi de nuit' });
  assert.deepEqual(renamed.lines[0].paidIn, abroad.lines[0].paidIn, 'changer le nom ne touche pas à la monnaie');
  const back = editSpend(renamed, id, { amount: 2800 });
  assert.equal(back.lines[0].amount, 2800);
  assert.equal('paidIn' in back.lines[0], false, 'un montant sans monnaie est dans celle du compte');
});

test('le dernier taux d’une monnaie revient : celui du compte d’abord, puis des autres', () => {
  const london = createSpend({ name: 'Londres', names: ['Gui'] });
  const gui = idOf(london, 'Gui');
  let one = addSpend(london, { amount: 1000, currency: 'GBP', rate: 0.85, by: gui });
  one = { ...one, lines: one.lines.map((line) => ({ ...line, updatedAt: 1 })) };
  one = addSpend(one, { amount: 1000, currency: 'GBP', rate: 0.86, by: gui });
  assert.equal(lastRate(one, 'GBP'), 0.86, 'le plus récent');
  assert.equal(lastRate(one, 'USD'), null);
  const other = createSpend({ name: 'Édimbourg', names: ['Gui'] });
  assert.equal(lastRate(other, 'GBP', [one]), 0.86, 'un autre compte en euros le donne');
  const swiss = createSpend({ name: 'Genève', names: ['Gui'], currency: 'CHF' });
  assert.equal(lastRate(swiss, 'GBP', [one]), null, 'pas un compte dans une autre monnaie');
  const odd = { ...one, lines: [{ ...one.lines[0], paidIn: { currency: 'GBP', amount: -3, rate: 0.9 } }] };
  assert.equal(paidInOf(odd, odd.lines[0]), null, 'ce qui est mal formé ne se lit pas');
});

test('ce qui a été payé ailleurs voyage avec la ligne', () => {
  const spend = createSpend({ name: 'Londres', names: ['Gui', 'Alice'] });
  const gui = idOf(spend, 'Gui');
  const here = addSpend(spend, { text: 'Pub', amount: 3000, currency: 'GBP', rate: 0.86, by: gui });
  const there = editSpend(here, here.lines[0].id, { text: 'Pub du coin' });
  const merged = mergeSpends(here, there);
  assert.equal(merged.lines[0].text, 'Pub du coin');
  assert.deepEqual(merged.lines[0].paidIn, { currency: 'GBP', amount: 3000, rate: 0.86 });
  assert.ok(isValidSpend(merged));
});
