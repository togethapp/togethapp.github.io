import test from 'node:test';
import assert from 'node:assert/strict';

import {
  related, ideasFor, addIdea, pollFromIdeas, winnersOf, winnerOffers, addWinner, accountsFor, spentItems, spendFromLine,
  unblockedNow, missingGoers, addGoers, unspentItems, ticketGroups, ticketText, estimateOf, spendFromLines, listsFeeding,
  paidLines, defaultForWhom, forWhomGroups, activityFor,
} from '../src/flows.js';
import { linkTo, attach, parentId, relationsOf } from '../src/dashboard.js';
import { createList, addItems, assignItem, toggleItem, mergeLists } from '../src/lists.js';
import { createPoll, createEvent, addOptions, setVote, setClosed } from '../src/polls.js';
import { createSpend, balances, archiveSpend, addRepayment, lineShares } from '../src/spends.js';
import { createBoard, addCard, editCardText } from '../src/ideas.js';

const g = { groupId: 'mifa', shared: true };

function idees(names) {
  let board = { ...createBoard({ name: 'Menu' }), ...g };
  for (const text of names) {
    const made = addCard(board, 'note');
    board = editCardText(made.board, made.cardId, text);
  }
  return board;
}

test('des idées à la liste : une touche par idée, jamais deux fois', () => {
  const board = idees(['Raclette', '', 'Tarte\naux pommes']);
  let list = linkTo({ ...createList({ name: 'Courses' }), ...g }, board.id, 'with');
  assert.deepEqual(related(list, [list, board], 'board').map((d) => d.id), [board.id], 'le tableau lié se retrouve');
  const offers = ideasFor(list, board);
  assert.deepEqual(offers.map((o) => o.text).sort(), ['Raclette', 'Tarte — aux pommes'], 'les idées sans mots ne se proposent pas');
  list = addIdea(list, board, offers[0].card);
  assert.equal(list.items[0].text, offers[0].text);
  assert.equal(list.items.length, 1);
  assert.deepEqual(list.items[0].from, { doc: board.id, part: offers[0].card.id });
  assert.equal(ideasFor(list, board)[0].added, true);
  assert.equal(addIdea(list, board, offers[0].card), list, 'pas deux fois');
  // La marque survit à la fusion et au cochage.
  const coche = toggleItem(list, list.items[0].id);
  assert.deepEqual(mergeLists(list, coche).items[0].from, { doc: board.id, part: offers[0].card.id });
});

test('des idées au sondage, puis le choix du sondage à la liste', () => {
  const event = { ...createEvent({ name: 'Raclette', date: '2026-10-10' }), ...g };
  const board = attach(idees(['Rouge', 'Blanc', 'Rouge']), event.id);
  let poll = pollFromIdeas(board, { question: 'Quel vin ?', names: ['Gui', 'Alice'] });
  assert.deepEqual(poll.options.map((o) => o.text).sort(), ['Blanc', 'Rouge'], 'une idée en double, un seul choix');
  assert.equal(poll.question, 'Quel vin ?');
  assert.equal(parentId(poll), event.id, 'au même endroit de la chaîne que le tableau');
  assert.equal(poll.groupId, 'mifa');
  assert.equal(relationsOf(poll, [poll, board])[0].kind, 'waits', 'il vient après les idées');
  assert.equal(pollFromIdeas(board).question, 'Menu', 'sans question, le nom du tableau');

  const rouge = poll.options.find((o) => o.text === 'Rouge');
  const blanc = poll.options.find((o) => o.text === 'Blanc');
  const [gui, alice] = poll.people;
  poll = setVote(setVote(setVote(poll, gui.id, rouge.id, 'yes'), alice.id, rouge.id, 'yes'), alice.id, blanc.id, 'yes');
  assert.deepEqual(winnersOf(poll), [], 'ouvert, il n’a encore rien choisi');
  poll = setClosed(poll, true);
  assert.deepEqual(winnersOf(poll).map((o) => o.text), ['Rouge']);
  assert.deepEqual(winnersOf(event), [], 'un événement ne choisit rien à acheter');

  let list = { ...createList({ name: 'Courses' }), ...g };
  list = addWinner(list, poll, rouge);
  assert.equal(list.items[0].text, 'Rouge');
  assert.equal(winnerOffers(poll, list)[0].added, true);
  assert.equal(addWinner(list, poll, rouge), list, 'pas deux fois');
});

test('une ligne cochée devient une dépense, payée par qui l’avait', () => {
  let list = addItems({ ...createList({ name: 'Courses', names: ['Gui', 'Alice'] }), ...g }, 'Fromage\nPain');
  const alice = list.people.find((p) => p.name === 'Alice');
  list = assignItem(list, list.items[0].id, alice.id);
  let spend = { ...createSpend({ name: 'Compte', names: ['Gui'] }), ...g };

  spend = spendFromLine(spend, list, list.items[0], '24,50');
  assert.equal(spend.lines.length, 1);
  assert.equal(spend.lines[0].text, 'Fromage');
  assert.equal(spend.lines[0].amount, 2450);
  const payer = spend.people.find((p) => p.id === spend.lines[0].by);
  assert.equal(payer.name, 'Alice', 'Alice n’était pas dans le compte : elle y entre');
  assert.deepEqual([...spentItems(spend, list)], [list.items[0].id]);
  assert.equal(spendFromLine(spend, list, list.items[0], 10), spend, 'pas deux fois');
  assert.equal(spendFromLine(spend, list, list.items[1], 0), spend, 'sans montant, rien');
  const sans = spendFromLine(spend, list, list.items[1], 3, 'gui');
  assert.equal(sans.people.length, 2, 'le prénom se retrouve, casse ignorée');
  assert.equal(balances(sans).reduce((s, r) => s + r.balance, 0), 0);
});

test('les lignes cochées vont aux comptes liés, et à ceux du même événement sans lien', () => {
  const event = { ...createEvent({ name: 'Raclette', date: '2026-10-24' }), ...g };
  const ski = attach({ ...createEvent({ name: 'Ski', date: '2026-10-25' }), ...g }, event.id);
  const list = attach({ ...createList({ name: 'Location' }), ...g }, ski.id);
  const compte = attach({ ...createSpend({ name: 'Compte' }), ...g }, event.id);
  const ailleurs = { ...createEvent({ name: 'Anniversaire', date: '2026-11-02' }), ...g };
  const autre = attach({ ...createSpend({ name: 'Cadeau' }), ...g }, ailleurs.id);
  const coloc = linkTo({ ...createSpend({ name: 'Coloc' }), ...g }, list.id, 'with');
  const range = attach({ ...archiveSpend(createSpend({ name: 'Vieux' })), ...g }, event.id);
  const resto = attach({ ...createEvent({ name: 'Resto', date: '2026-10-25' }), ...g }, event.id);
  const addition = attach({ ...createSpend({ name: 'Addition' }), ...g }, resto.id);
  const forfait = attach({ ...createSpend({ name: 'Forfaits' }), ...g }, ski.id);
  const all = [event, ski, list, compte, ailleurs, autre, coloc, range, resto, addition, forfait];
  assert.deepEqual(accountsFor(list, all).map((one) => one.id).sort(), [coloc.id, compte.id, forfait.id].sort(),
    'le compte lié, celui de son activité et celui de l’événement ; pas une autre activité, un autre événement, un rangé');
  assert.equal(accountsFor(list, all)[0].id, coloc.id, 'le compte lié d’abord');
  const apporter = attach({ ...createList({ name: 'À apporter' }), ...g }, event.id);
  assert.deepEqual(accountsFor(apporter, [...all, apporter]).map((one) => one.id), [compte.id],
    'la liste du week-end ne va pas aux comptes de ses activités');
  assert.deepEqual(accountsFor(linkTo(list, compte.id, 'with'), all).map((one) => one.id).sort(), [coloc.id, compte.id, forfait.id].sort(),
    'jamais deux fois');
  const seule = { ...createList({ name: 'Seule' }), ...g };
  assert.deepEqual(accountsFor(seule, [...all, seule]), [], 'hors de toute chaîne et sans lien : aucun');
  const dessous = attach({ ...createList({ name: 'Dessous' }), ...g }, autre.id);
  assert.deepEqual(accountsFor(dessous, [...all, dessous]).map((one) => one.id), [autre.id], 'rattachée au compte même');
});

test('ce qui vient d’être débloqué', () => {
  const now = Date.parse('2026-09-26T12:00:00Z');
  let vin = { ...createPoll({ question: 'Quel vin ?' }), ...g };
  const board = { ...createBoard({ name: 'Déco' }), ...g };
  let list = linkTo({ ...addItems(createList({ name: 'Courses' }), 'Vin'), ...g }, vin.id, 'after');
  const deco = linkTo({ ...addItems(createList({ name: 'Déco' }), 'Ballons'), ...g }, board.id, 'after');
  const opts = { today: '2026-09-26', now };
  assert.deepEqual(unblockedNow([vin, list, board, deco], opts), [], 'le sondage est ouvert ; un tableau ne débloque rien');
  vin = { ...setClosed(vin, true), closedAt: now - 3600e3 };
  assert.deepEqual(unblockedNow([vin, list, board, deco], opts).map((u) => [u.document.id, u.by[0].id]), [[list.id, vin.id]]);
  assert.deepEqual(unblockedNow([{ ...vin, closedAt: now - 30 * 864e5, updatedAt: now - 30 * 864e5 }, list], opts), [], 'il y a longtemps : plus une nouvelle');
  list = toggleItem(list, list.items[0].id);
  assert.deepEqual(unblockedNow([vin, list], opts), [], 'fait, ce n’est plus à faire');
});

test('ceux qui viennent entrent dans les listes et les comptes de l’événement', () => {
  const event = { ...createEvent({ name: 'Raclette', names: ['Gui', 'Alice', 'Paul'], date: '2026-10-10' }), ...g };
  const list = attach({ ...createList({ name: 'Courses', names: ['gui'] }), ...g }, event.id);
  const spend = attach({ ...createSpend({ name: 'Compte', names: ['Gui', 'Alice', 'Paul', 'Zoé'] }), ...g }, event.id);
  const missing = missingGoers(event, [event, list, spend]);
  assert.deepEqual(missing.map((m) => [m.document.id, m.names]), [[list.id, ['Alice', 'Paul']]], 'le compte a tout le monde');
  const next = addGoers(list, missing[0].names);
  assert.deepEqual(next.people.map((p) => p.name), ['gui', 'Alice', 'Paul'], 'on ajoute, on ne retire personne');
  assert.deepEqual(missingGoers(event, [event, next, spend]), []);
});

/* ------------------------------------------------------------ le ticket --- */

/** Les courses de la raclette : trois lignes données, une à personne, et le compte. */
function courses() {
  const event = { ...createEvent({ name: 'Raclette', names: ['Gui', 'Alice', 'Bob'], date: '2026-10-24' }), ...g };
  let list = attach({ ...addItems(createList({ name: 'Courses', names: ['Gui', 'Alice', 'Bob'] }), 'Fromage 25 €\nPatates\nVin (12,50€)\nPain'), ...g }, event.id);
  const [gui, alice] = list.people;
  list = assignItem(list, list.items[0].id, alice.id);
  list = assignItem(list, list.items[1].id, alice.id);
  list = assignItem(list, list.items[2].id, gui.id);
  for (const item of list.items) list = toggleItem(list, item.id);
  const spend = attach({ ...createSpend({ name: 'Compte', names: ['Gui', 'Alice', 'Bob'] }), ...g }, event.id);
  return { event, list, spend };
}

test('ce qui attend le compte, rangé par qui l’a acheté', () => {
  const { list, spend } = courses();
  const groups = ticketGroups(list, spend);
  assert.deepEqual(groups.map((group) => group.whoId), [list.people[0].id, list.people[1].id, '']);
  assert.deepEqual(groups.map((group) => [group.who, group.items.map((item) => item.text)]), [
    ['Gui', ['Vin (12,50€)']],
    ['Alice', ['Fromage 25 €', 'Patates']],
    ['', ['Pain']],
  ], 'dans l’ordre des personnes de la liste, ce que personne n’avait en dernier');
  const pasCoche = toggleItem(list, list.items[3].id);
  assert.deepEqual(unspentItems(pasCoche, spend).map((item) => item.text), ['Fromage 25 €', 'Patates', 'Vin (12,50€)'],
    'ce qui n’est pas coché n’est pas encore acheté');
});

test('un ticket : plusieurs lignes, une seule dépense, jamais deux fois', () => {
  const { list, spend } = courses();
  const [fromage, patates] = list.items;
  const next = spendFromLines(spend, list, [fromage, patates], '31,40');
  assert.equal(next.lines.length, 1);
  assert.equal(next.lines[0].amount, 3140);
  assert.equal(next.lines[0].text, 'Courses : Fromage, Patates', 'le prix écrit s’en va du nom de la dépense');
  assert.equal(next.people.find((person) => person.id === next.lines[0].by).name, 'Alice', 'les deux lignes étaient les siennes');
  assert.deepEqual(next.lines[0].from, { doc: list.id, part: fromage.id, parts: [fromage.id, patates.id] });
  assert.deepEqual([...spentItems(next, list)].sort(), [fromage.id, patates.id].sort());
  assert.deepEqual(ticketGroups(list, next).map((group) => group.who), ['Gui', ''], 'le ticket d’Alice est noté');
  assert.equal(spendFromLines(next, list, [fromage, patates], 10), next, 'pas deux fois');
  // Une ligne déjà notée sort du ticket ; les autres y restent.
  const encore = spendFromLines(next, list, [patates, list.items[3]], 300, { byName: 'Bob' });
  assert.equal(encore.lines.length, 2);
  assert.deepEqual(encore.lines[1].from, { doc: list.id, part: list.items[3].id });
  assert.equal(encore.lines[1].text, 'Pain');
});

test('un ticket se partage comme une dépense : pour certains, par parts, avec des montants à part', () => {
  const { list, spend } = courses();
  const [gui, alice, bob] = spend.people.map((person) => person.id);
  const next = spendFromLines(spend, list, [list.items[2]], 1250, { byName: 'Gui', forWhom: [gui, alice], text: 'Le vin' });
  assert.equal(next.lines[0].text, 'Le vin', 'un nom donné l’emporte');
  assert.deepEqual([...lineShares(next, next.lines[0]).entries()], [[gui, 625], [alice, 625]]);
  const apart = spendFromLines(spend, list, list.items, 6000, { byName: 'Gui', fixed: { [bob]: 1000 } });
  assert.deepEqual([...lineShares(apart, apart.lines[0]).values()], [2500, 2500, 1000]);
  assert.equal(spendFromLines(spend, list, list.items, 6000, { byName: 'Gui', fixed: { [bob]: 9000 } }), spend,
    'un partage qui ne tombe pas juste n’écrit rien');
  assert.equal(balances(apart).reduce((sum, row) => sum + row.balance, 0), 0);
});

test('le prix écrit dans les lignes dit ce qu’on attend du ticket', () => {
  const { list } = courses();
  assert.equal(estimateOf(list.items), 3750, '25 € de fromage et 12,50 € de vin');
  assert.equal(estimateOf([list.items[1]]), null, 'sans prix écrit, rien à prévoir');
  assert.equal(ticketText(list, [list.items[0]]), 'Fromage');
  assert.equal(ticketText({ name: '', items: [] }, [list.items[0], list.items[1]]), 'Fromage, Patates');
  const longue = addItems(createList({ name: 'Courses' }), Array.from({ length: 30 }, (_, i) => `Article ${i}`).join('\n'));
  assert.ok(ticketText(longue, longue.items).length <= 120);
});

test('la liste sait qui a payé quoi, et le compte sait quelles listes l’attendent', () => {
  const { event, list, spend } = courses();
  let next = spendFromLines(spend, list, [list.items[0], list.items[1]], 3140);
  next = spendFromLine(next, list, list.items[3], 300, 'Bob');
  next = addRepayment(next, { from: next.people[2].id, to: next.people[1].id, amount: 300 });
  const paid = paidLines(list, [event, list, next]);
  assert.deepEqual([...paid.keys()].sort(), [list.items[0].id, list.items[1].id, list.items[3].id].sort());
  assert.equal(paid.get(list.items[0].id).count, 2, 'le fromage était sur un ticket de deux lignes');
  assert.equal(paid.get(list.items[3].id).line.amount, 300);
  assert.equal(paid.get(list.items[3].id).spend.id, spend.id);
  assert.deepEqual(listsFeeding(spend, [event, list, spend]).map((one) => one.id), [list.id]);
  const ailleurs = { ...createList({ name: 'Seule' }), ...g };
  assert.deepEqual(listsFeeding(spend, [event, list, spend, ailleurs]).map((one) => one.id), [list.id],
    'une liste d’ailleurs ne va pas à ce compte');
});

test('une liste d’activité va au compte de l’événement, pour ceux qui la font', () => {
  const event = { ...createEvent({ name: 'Week-end', names: ['Gui', 'Alice', 'Bob', 'Zoé'], date: '2026-10-24' }), ...g };
  const kayak = activityFor(event, { name: 'Kayak', names: ['gui', 'Zoé'] });
  const resto = activityFor(event, { name: 'Resto' });
  const list = attach({ ...addItems(createList({ name: 'Pique-nique' }), 'Sandwichs'), ...g }, kayak.id);
  const spend = attach({ ...createSpend({ name: 'Compte', names: ['Gui', 'Alice', 'Bob', 'Zoé'] }), ...g }, event.id);
  const all = [event, kayak, resto, list, spend];
  const [gui, , , zoe] = spend.people.map((person) => person.id);
  assert.deepEqual(defaultForWhom(list, spend, all), [gui, zoe], 'les prénoms se retrouvent, casse ignorée');
  const direct = attach({ ...createList({ name: 'Courses' }), ...g }, event.id);
  assert.deepEqual(defaultForWhom(direct, spend, [...all, direct]), [], 'la liste de l’événement est pour tout le monde');
  const sien = attach({ ...createSpend({ name: 'Location', names: ['Gui', 'Zoé'] }), ...g }, kayak.id);
  assert.deepEqual(defaultForWhom(list, sien, [...all, sien]), [], 'le compte de l’activité est déjà entre eux');
  assert.deepEqual(forWhomGroups(spend, all).map((group) => [group.name, group.ids]), [['Kayak', [gui, zoe]]],
    'le resto, où tout le monde va, n’apprend rien : il ne se propose pas');
  assert.deepEqual(forWhomGroups({ ...createSpend({ name: 'Seul', names: ['Gui'] }), ...g }, all), [], 'hors de tout événement, rien');
});
