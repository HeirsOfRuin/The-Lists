// The hearth: the ladies of the realm, courtship, marriage, children, and
// titles.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { knight, answerFirst, badNumbers } from './helpers.js';
import { deserialize, serialize, SAVE_VERSION, STATUS } from '../src/engine/state.js';
import {
  passMonth, endWinter, PHASE, courtOption, courtLady, askForHand, elopeWithLady, answerCouncil,
} from '../src/engine/season.js';
import {
  ladyById, hasMet, ladyTerms, canAsk, approachesFor, court, askColours, coloursResult, hearthWinter, wed, ladyName,
  canElope, familyLine, ladiesAt,
} from '../src/engine/hearth.js';
import {
  canPetition, petitionChance, petition, answerPetition, councilDue, councilWinter, createBaron, forfeitTitle,
} from '../src/engine/title.js';
import { checkChance } from '../src/engine/checks.js';
import { beginWar, settle, importance } from '../src/engine/realm.js';
import { epilogue } from '../src/engine/ending.js';
import { answerCard, cardById } from '../src/engine/cards.js';
import { MATCHES, APPROACHES, RIVALS, TITLES, COLOURS } from '../src/data/hearth.data.js';
import { TOWNS } from '../src/data/world.data.js';

/** A knight free to court, with the means to. */
function suitor(seed = 3) {
  const s = knight(seed);
  s.heart = 'free';
  s.ladies = s.ladies.filter((l) => l.kind !== 'betrothed');
  s.purse = 200 * 240;
  return s;
}

function toWinter(s) {
  for (let g = 0; g < 60 && s.phase !== PHASE.WINTER && s.status === STATUS.ACTIVE; g++) {
    if (s.pending) answerFirst(s);
    else passMonth(s);
  }
  while (s.pending) answerFirst(s);
}

test('the realm holds nine ladies of five kinds, each different, each with a town and a rival', () => {
  for (const seed of [1, 4, 9]) {
    const s = knight(seed);
    const ladies = s.ladies.filter((l) => l.kind !== 'betrothed');
    assert.equal(ladies.length, Object.values(MATCHES).reduce((t, m) => t + m.count, 0));
    assert.equal(new Set(s.ladies.map((l) => l.given)).size, s.ladies.length, 'no two share a name');
    for (const l of ladies) {
      assert.ok(TOWNS[l.town], l.town);
      assert.ok(MATCHES[l.kind].towns.includes(l.town));
      assert.ok(l.rival && s.roster.knights.find((k) => k.id === l.rival.id)?.active, 'a living rival');
      assert.equal(l.status, 'free');
    }
    if (s.heart === 'promised') assert.ok(s.ladies.some((l) => l.status === 'promised' && l.given === s.betrothed), 'the betrothed of the story is among them');
  }
});

test('a knight meets the ladies of the towns he has been to, and only those', () => {
  const s = suitor(5);
  const l = s.ladies.find((x) => !s.visited.includes(x.town));
  assert.equal(hasMet(s, l), false);
  assert.match(canAsk(s, l).reason, /not met/);
  s.visited.push(l.town);
  assert.equal(hasMet(s, l), true);
});

test('courting shows the chance it rolls, and the same courtesy twice is worth less', () => {
  const s = suitor(6);
  const l = s.ladies[0];
  s.visited.push(l.town);
  for (const a of approachesFor(s, l)) {
    const A = APPROACHES[a.id];
    assert.equal(a.chance, A.check ? checkChance(s, A.check) : 1);
  }
  const first = approachesFor(s, l).find((a) => a.id === 'gift').gain;
  const r = court(s, l, 'gift');
  assert.ok(r.ok && r.success);
  assert.equal(l.affection, first);
  const second = approachesFor(s, l).find((a) => a.id === 'gift').gain;
  assert.ok(second < first, `${second} < ${first}`);
});

test('a month courting her pays the road, moves her affection, and ends the month', () => {
  const s = suitor(7);
  const l = s.ladies.find((x) => x.kind === 'widow');
  s.visited.push(l.town);
  const o = courtOption(s, l.id);
  assert.equal(o.open, true);
  const month = s.month;
  const purse = s.purse;
  assert.equal(courtLady(s, l.id, 'dance').ok, true);
  assert.equal(s.location, l.town);
  assert.ok(s.purse <= purse - o.road);
  assert.ok(s.month !== month || s.pending || s.phase === PHASE.WINTER);
});

test('her family answers by its stated terms: refused, it costs her goodwill; met, the wedding is at Candlemas', () => {
  const s = suitor(8);
  const l = s.ladies.find((x) => x.kind === 'merchant');
  s.visited.push(l.town);
  s.renown = 0;
  l.affection = 60;
  assert.equal(askForHand(s, l.id).ok, false);
  assert.equal(l.affection, 55, 'asked too soon');
  s.renown = MATCHES.merchant.wants.renown;
  s.honour = MATCHES.merchant.wants.honour;
  assert.ok(ladyTerms(s, l).every((t) => t.ok));
  assert.equal(askForHand(s, l.id).ok, true);
  assert.equal(s.heart, 'promised');
  assert.equal(s.engaged.id, l.id);
  const purse = s.purse;
  toWinter(s);
  assert.equal(s.spouse?.id, l.id);
  assert.equal(s.heart, 'married');
  const dowry = s.winter.ledger.find((x) => /dowry/.test(x.label));
  assert.equal(dowry.amount, l.pounds * 240);
  assert.ok(s.book.some((e) => e.tier === 'marriage'));
  assert.ok(s.purse > purse - 50 * 240);
});

test('the Crown’s ward: her marriage is bought if the Crown is not your friend, and her husband is a lord', () => {
  const s = suitor(9);
  const l = s.ladies.find((x) => x.kind === 'ward');
  s.visited.push(l.town);
  Object.assign(s, { renown: 80, honour: 18, lineage: 12 });
  s.favour.crown = 0;
  l.affection = 70;
  const purse = s.purse;
  assert.ok(canAsk(s, l).ok);
  assert.equal(askForHand(s, l.id).ok, true);
  assert.equal(s.purse, purse - MATCHES.ward.crown.price);
  toWinter(s);
  assert.equal(s.title?.how, 'marriage');
  assert.equal(s.title.seat, l.barony);
  assert.match(s.knight.lordship, new RegExp(l.barony));
  assert.ok(importance(s).terms.some((t) => /baron/.test(t.label)));
});

test('marrying without her family’s leave takes love, costs honour and the dowry', () => {
  const s = suitor(10);
  const l = s.ladies.find((x) => x.kind === 'lord');
  s.visited.push(l.town);
  l.affection = 70;
  assert.equal(canElope(s, l).ok, false);
  l.affection = 80;
  const honour = s.honour;
  const purse = s.purse;
  assert.equal(elopeWithLady(s, l.id).ok, true);
  assert.equal(s.spouse.how, 'elope');
  assert.equal(s.honour, honour - 3);
  assert.equal(s.purse, purse, 'no dowry');
  assert.equal(canElope(s, s.ladies.find((x) => x.kind === 'ward')).ok, false, 'never a ward');
});

test('her colours: a sleeve asked of a lady at the tourney, and her affection follows how you ride in it', () => {
  const s = suitor(11);
  const l = s.ladies[0];
  const ev = { town: l.town, tier: 'regional', colours: null, token: false };
  assert.ok(ladiesAt(s, ev).includes(l));
  l.affection = COLOURS.ask - 1;
  assert.equal(askColours(s, ev, l.id).ok, false);
  l.affection = COLOURS.ask;
  assert.equal(askColours(s, ev, l.id).ok, true);
  assert.equal(ev.colours, l.id);
  const r = coloursResult(s, { placing: 'champion', boutsWon: 2 }, l.id);
  assert.equal(r.delta, 2 * COLOURS.boutWon + COLOURS.champion);
  const lost = coloursResult(s, { placing: 'first', boutsWon: 0 }, l.id);
  assert.equal(lost.delta, COLOURS.beatenFirst);
});

test('a rival who presses his suit marries her, and another lady comes of age in her place', () => {
  const s = suitor(12);
  const n = s.ladies.filter((l) => l.status === 'free').length;
  const l = s.ladies[1];
  l.rival.suit = RIVALS.wins - 1;
  l.affection = 0;
  const notes = [];
  hearthWinter(s, notes, () => {});
  assert.equal(l.status, 'married');
  assert.equal(l.husband, l.rival.id);
  assert.equal(s.ladies.filter((x) => x.status === 'free').length, n, 'the realm keeps its number');
  // A lady who loves you more than he has won her does not go to him.
  const t = suitor(12);
  const m = t.ladies[1];
  m.rival.suit = RIVALS.wins + 50;
  m.affection = 100;
  hearthWinter(t, [], () => {});
  assert.equal(m.status, 'free');
});

test('a marriage’s years: her household and stewardship in the accounts, and children', () => {
  const s = suitor(13);
  const l = s.ladies.find((x) => x.kind === 'heiress');
  wed(s, l, 'match');
  s.year += 1;
  const ledger = [];
  const add = (label, amount) => ledger.push({ label, amount });
  for (let y = 0; y < 12; y++) { s.year += 1; hearthWinter(s, [], add); }
  assert.ok(ledger.some((x) => /household/.test(x.label)));
  assert.ok(ledger.some((x) => /rolls/.test(x.label)), 'she brought a manor; she keeps its rolls');
  assert.ok(s.children.length >= 1, `${s.children.length} children in twelve years`);
  assert.ok(familyLine(s).length > 20);
});

test('the betrothal of the story: the card’s wedding makes her your wife, and breaking it frees you', () => {
  let s = null;
  for (let seed = 1; seed < 60 && !s; seed++) { const k = knight(seed); if (k.heart === 'promised') s = k; }
  assert.ok(s, 'a promised knight among sixty');
  const copy = deserialize(serialize(s));
  const card = cardById('winter.wedding');
  s.flags.push('weddingSet');
  answerCard(s, { id: card.id, context: 'winter', cast: {}, ctx: {} }, 0, {});
  assert.equal(s.heart, 'married');
  assert.equal(s.spouse.given, s.betrothed);
  assert.ok((s.lands || []).length >= 1, 'her dower manor');
  copy.flags.push('weddingSet');
  answerCard(copy, { id: card.id, context: 'winter', cast: {}, ctx: {} }, 1, {});
  assert.equal(copy.heart, 'free');
  assert.ok(copy.ladies.find((l) => l.given === copy.betrothed).jilted, 'she will not hear your name again');
});

test('a petition for a title: the terms, no petitions in a war, the chance shown, and the fee only if granted', () => {
  const s = knight(14);
  assert.equal(canPetition(s).ok, false);
  Object.assign(s, { renown: 60, honour: 15 });
  s.favour.crown = 12;
  s.lands = ['m1', 'm2', 'm3'].map((id) => ({ id, heldOf: null, how: 'bought', since: 1 }));
  assert.equal(canPetition(s).ok, true);
  const p = petitionChance(s);
  assert.ok(p > 0.05 && p <= TITLES.petition.max);
  let granted = null;
  for (let y = 1; y < 40 && !granted; y++) {
    const t = deserialize(serialize(s));
    t.year = y;
    petition(t);
    const purse = t.purse;
    const lines = answerPetition(t);
    assert.equal(lines.length, 1);
    if (t.title) { granted = t; assert.equal(t.purse, purse - TITLES.petition.fee); } else assert.equal(t.purse, purse);
  }
  assert.ok(granted, 'granted in some year');
  assert.equal(granted.title.how, 'petition');
  const w = deserialize(serialize(s));
  w.year = 10;
  beginWar(w);
  assert.match(canPetition(w).reason, /war/);
});

test('the new crown makes barons of its councillors; an attainted lord loses his title', () => {
  const s = knight(15);
  s.year = 10;
  s.realm.oath = 'aumbry';
  beginWar(s);
  const w = s.realm.war;
  w.side = 'aumbry'; w.decided = true; w.victor = 'aumbry';
  w.battles.push({ year: 10, name: 'the Battle of Hollin Moor', victor: 'aumbry', decisive: true, side: 'aumbry', mode: 'standard' });
  // Standing enough to be a councillor of war.
  Object.assign(s, { renown: 150, honour: 20, lineage: 18 });
  s.favour.aumbry = 40;
  s.company = 20;
  s.lands = ['m1', 'm2', 'm3', 'm4', 'm5'].map((id) => ({ id, heldOf: null, how: 'bought', since: 1 }));
  assert.equal(importance(s).rank.id, 'councillor');
  const out = settle(s, () => {}, []);
  assert.ok(out.title, 'created a baron');
  assert.equal(s.title.how, 'war');
  const lost = forfeitTitle(s);
  assert.equal(lost, out.title);
  assert.equal(s.title, null);
  assert.equal(s.knight.lordship, undefined);
});

test('a lord is summoned to the great council in April, and missing it costs the Crown’s favour', () => {
  const s = knight(16);
  createBaron(s, 'petition');
  s.month = TITLES.council.month;
  s.year = 2;
  assert.equal(councilDue(s), true);
  s.purse = 100 * 240;
  const favour = s.favour.crown;
  assert.equal(answerCouncil(s).ok, true);
  assert.equal(s.favour.crown, favour + TITLES.council.favour);
  const t = knight(16);
  createBaron(t, 'petition');
  t.year = 3;
  const f = t.favour.crown;
  councilWinter(t, []);
  assert.equal(t.favour.crown, f + TITLES.council.missed);
});

test('a lord’s epilogue is headed by his title, and every family line is written in full', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const s = suitor(seed);
    const l = s.ladies[seed % s.ladies.length];
    wed(s, l, seed % 3 ? 'match' : 'elope');
    s.children = seed % 2 ? [{ name: 'John', son: true, born: 3 }, { name: 'Anne', son: false, born: 5 }] : [];
    if (seed % 4 === 0) createBaron(s, 'war');
    const ep = epilogue(s, 'chosen');
    if (s.title) assert.equal(ep.ending.id, 'peer');
    for (const p of ep.paragraphs) assert.doesNotMatch(p, /undefined|NaN|null|\{|\}/, p);
    assert.ok(familyLine(s).includes(s.spouse.given));
    assert.deepEqual(badNumbers(s), []);
  }
});

test('a phase-six save opens with the ladies of the realm, and a married knight keeps his wife', () => {
  const raw = readFileSync(new URL('./fixtures/v6-save.json', import.meta.url), 'utf8');
  assert.equal(JSON.parse(raw).version, 6);
  const s = deserialize(raw);
  assert.equal(s.version, SAVE_VERSION);
  assert.ok(s.ladies.length >= 9);
  assert.equal(s.heart, 'married');
  assert.ok(s.spouse?.alive);
  assert.equal(s.spouse.given, s.betrothed);
  assert.equal(s.title, null);
  for (let g = 0; g < 200 && s.phase !== PHASE.WINTER && s.status === STATUS.ACTIVE; g++) {
    if (s.pending) answerFirst(s);
    else passMonth(s);
  }
  while (s.pending) answerFirst(s);
  assert.equal(s.phase, PHASE.WINTER);
  assert.ok(s.winter.ledger.some((x) => /household/.test(x.label)));
  assert.equal(endWinter(s).ok, true);
  assert.deepEqual(badNumbers(s), []);
});
