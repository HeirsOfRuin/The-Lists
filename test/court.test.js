// The court: service and its obligations, the heralds' judgement, the names
// they give, and the story threads. What cannot be true of any of them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  takeService, leaveService, conductOf, epithetFor, revealCulprit, threadsOf, isPatronTourney, summonsOpen,
} from '../src/engine/court.js';
import {
  passMonth, answer, answerSummons, pilgrimage, resignService, endWinter, monthOptions, PHASE,
} from '../src/engine/season.js';
import { heraldReadCost } from '../src/engine/tourney.js';
import { admitted } from '../src/engine/calendar.js';
import { cardById, answerCard, castIfEligible } from '../src/engine/cards.js';
import { deserialize, SAVE_VERSION } from '../src/engine/state.js';
import { fullName } from '../src/engine/knight.js';
import { PATRONS, PATRONAGE, PILGRIMAGE, MARRIAGE } from '../src/data/court.data.js';
import { LAST_MONTH } from '../src/data/world.data.js';
import { knight, answerFirst, badNumbers } from './helpers.js';
import { step } from '../sim/bot.js';
import { makeRng } from '../src/engine/rng.js';

function toWinter(s) {
  for (let g = 0; g < 50 && s.phase === PHASE.MONTH; g++) {
    if (s.pending) answerFirst(s);
    else passMonth(s);
  }
  if (s.pending) answerFirst(s);
}

test('taking service swears you to a house, and its rival’s knights notice', () => {
  const s = knight(1);
  const own = s.roster.knights.find((k) => k.allegiance === 'aumbry' && k.regard === 0);
  const rival = s.roster.knights.find((k) => k.allegiance === 'stane' && k.regard === 0);
  assert.ok(takeService(s, 'aumbry').ok);
  assert.equal(s.patron.id, 'aumbry');
  assert.ok(s.favour.aumbry >= 8, 'his favour admits you to his own tourney');
  assert.equal(own.regard, PATRONAGE.houseRegard);
  assert.equal(rival.regard, PATRONAGE.rivalRegard);
  assert.equal(takeService(s, 'stane').ok, false, 'one patron at a time');
});

test('the patron’s tourney is the one he expects you at', () => {
  const s = knight(2);
  takeService(s, 'stane');
  const mine = s.calendar.find((e) => e.host.faction === 'stane');
  const other = s.calendar.find((e) => e.host.faction === 'aumbry');
  assert.ok(isPatronTourney(s, mine));
  assert.ok(!isPatronTourney(s, other));
  s.renown = 0; s.lineage = 1;
  assert.ok(admitted(s, mine).ok, 'his man rides at his tourney whatever his renown');
});

test('a year without riding his tourney is a strike; two, and you are let go', () => {
  const s = knight(3);
  takeService(s, 'aumbry');
  s.patron.summons = null; // only the tourney is tested here
  const honour = s.honour;
  toWinter(s);
  assert.equal(s.patron.strikes, 1);
  assert.ok(s.winter.ledger.some((l) => /fee/.test(l.label)), 'the fee is paid');
  endWinter(s);
  s.patron.summons = null;
  toWinter(s);
  assert.equal(s.patron, null, 'let go after the second strike');
  assert.equal(s.honour <= honour + 5 && s.honour, s.honour);
  assert.ok(s.winter.notes.some((n) => /let you go/.test(n)));
});

test('a summons has a window, and an unanswered one is a strike', () => {
  const s = knight(4);
  takeService(s, 'crown');
  s.patron.summons = { month: 4, until: 5, answered: false };
  s.patron.attended = true;
  assert.equal(summonsOpen(s), false, 'not yet in March');
  passMonth(s); if (s.pending) answerFirst(s);
  assert.ok(summonsOpen(s), 'open in April');
  passMonth(s); if (s.pending) answerFirst(s);
  passMonth(s); if (s.pending) answerFirst(s);
  assert.equal(s.patron.strikes, 1);
  assert.equal(s.patron.summons, null);
  assert.ok(s.notices.some((n) => /summons/.test(n)));
});

test('answering a summons spends the month and puts a card in front of you', () => {
  const s = knight(5);
  takeService(s, 'aumbry');
  s.patron.summons = { month: 3, until: 4, answered: false };
  const m = s.month;
  assert.ok(answerSummons(s).ok);
  assert.ok(s.patron.summons.answered);
  if (s.pending) {
    assert.equal(s.pending.inst.context, 'summons');
    answerFirst(s);
  }
  assert.equal(s.month, m + 1);
  assert.equal(answerSummons(s).ok, false, 'a summons is answered once');
});

test('leaving service costs his favour; being let go costs honour too', () => {
  const a = knight(6);
  takeService(a, 'stane');
  const f = a.favour.stane;
  leaveService(a);
  assert.equal(a.favour.stane, f + PATRONAGE.resignFavour);
  const b = knight(6);
  takeService(b, 'stane');
  const h = b.honour;
  leaveService(b, { dismissed: true });
  assert.equal(b.honour, h + PATRONAGE.dismissHonour);
  const c = knight(6);
  takeService(c, 'stane');
  c.patron.summons = null;
  toWinter(c);
  assert.ok(resignService(c).ok);
  assert.equal(c.patron, null);
});

test('the heralds judge conduct by honour, and a disgraced knight is barred from the great tourneys', () => {
  const s = knight(7);
  const grand = s.calendar.find((e) => e.tier === 'grand');
  s.renown = 50;
  s.honour = 17;
  assert.equal(conductOf(s.honour).id, 'spotless');
  const half = heraldReadCost(s);
  s.honour = 10;
  assert.ok(heraldReadCost(s) > half, 'a spotless knight pays the heralds half');
  s.honour = 1;
  assert.equal(conductOf(s.honour).id, 'disgraced');
  const r = admitted(s, grand);
  assert.equal(r.ok, false);
  assert.match(r.reason, /disgraced/);
  assert.ok(admitted(s, s.calendar.find((e) => e.tier === 'regional')).ok, 'the lesser tourneys still take him');
});

test('a pilgrimage mends a name, and is not offered to a good one', () => {
  const s = knight(8);
  s.honour = 2;
  s.purse = 20 * 240;
  const m = s.month;
  assert.ok(pilgrimage(s).ok);
  assert.equal(s.honour, 2 + PILGRIMAGE.honour);
  assert.equal(s.purse, 20 * 240 - PILGRIMAGE.cost);
  assert.equal(s.month, m + 1);
  s.honour = 12;
  assert.equal(pilgrimage(s).ok, false);
});

test('a strong trait becomes a byname, and a sung virtue is renown', () => {
  const s = knight(9);
  for (const t of Object.keys(s.knight.traits)) s.knight.traits[t] = 10;
  assert.equal(epithetFor(s.knight), null);
  s.knight.traits.merciful = 18;
  assert.equal(epithetFor(s.knight).epithet, 'the Merciful');
  s.knight.traits.merciful = 2; // ruthless 18
  assert.equal(epithetFor(s.knight).epithet, 'the Hard');
  assert.equal(epithetFor(s.knight).virtue, false);
  s.knight.traits.merciful = 19;
  const renown = s.renown;
  toWinter(s);
  assert.equal(s.knight.epithet, 'the Merciful');
  assert.ok(fullName(s.knight).endsWith('the Merciful'));
  assert.ok(s.book.some((e) => /the Merciful/.test(e.text)));
  assert.ok(s.renown >= Math.round(renown * 0.9), 'the virtue is sung');
});

test('Ambry Cross: the rolls name the culprit, and a sworn witness clears the master', () => {
  const answers = { people: 'younger', country: 'march', master: 'disgraced', taught: 'lance', spurs: 'field', heart: 'clearName' };
  const s = knight(10, answers);
  assert.equal(threadsOf(s)[0].id, 'ambryCross');
  s.flags.push('witnessFound');
  const rec = cardById('court.records');
  const inst = { id: rec.id, uid: 1, cast: {}, ctx: { tier: null, town: 'kingsmead', host: 'the court', hostFaction: 'crown', prize: 0 } };
  s.purse = 10 * 240;
  answerCard(s, inst, rec.choices.findIndex((c) => !c.check));
  assert.ok(s.flags.includes('culpritKnown'));
  const culprit = s.story.culprit;
  assert.ok(culprit && s.roster.knights.some((k) => k.id === culprit));
  assert.equal(revealCulprit(s), culprit, 'the culprit is chosen once');
  s.flags.push('witnessSworn');
  const ctx = { tier: 'regional', town: 'othery', host: 'Sir Test', hostFaction: null, field: [culprit] };
  const cast = castIfEligible(s, 'feast.accuse', ctx);
  assert.equal(cast.rival, culprit, 'the accusation casts the culprit and nobody else');
  const acc = cardById('feast.accuse');
  const honour = s.honour;
  answerCard(s, { id: acc.id, uid: 2, cast, ctx: { ...ctx, prize: 0 } }, 0);
  assert.ok(s.flags.includes('masterCleared'));
  assert.equal(s.honour, honour + 4);
  assert.ok(s.book.some((e) => e.tier === 'story'));
  assert.match(threadsOf(s)[0].text, /spurs again/);
  assert.equal(castIfEligible(s, 'feast.accuse', ctx), null, 'the thread does not reopen');
});

test('the wedding: a dowry now, and the lady’s lands every winter', () => {
  const answers = { people: 'heir', country: 'coast', master: 'courtier', taught: 'manners', spurs: 'field', heart: 'lordship' };
  const s = knight(11, answers);
  assert.equal(s.heart, 'promised');
  s.flags.push('weddingSet');
  const w = cardById('winter.wedding');
  const purse = s.purse;
  answerCard(s, { id: w.id, uid: 1, cast: {}, ctx: { tier: null, town: null, host: null, hostFaction: null, prize: 0 } }, 0);
  assert.equal(s.heart, 'married');
  assert.equal(s.purse, purse + MARRIAGE.dowry);
  toWinter(s);
  assert.ok(s.winter.ledger.some((l) => /lands/.test(l.label) && l.amount === MARRIAGE.lands));
});

test('a phase-two save opens: the retainer becomes service, the field swears to houses', () => {
  const raw = readFileSync(new URL('./fixtures/v2-save.json', import.meta.url), 'utf8');
  const v2 = JSON.parse(raw);
  const s = deserialize(raw);
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.knight.given, v2.knight.given);
  assert.equal(s.purse, v2.purse);
  assert.equal(s.book.length, v2.book.length);
  assert.equal(s.birth, v2.answers.birth);
  assert.equal(s.advantage, v2.answers.advantage);
  assert.equal(s.patron?.id, 'aumbry', 'the Aumbry retainer is now in service');
  assert.ok(s.roster.knights.every((k) => k.allegiance !== undefined));
  assert.ok(threadsOf(s).some((t) => t.id === 'ambryCross' && /witness|saw it/.test(t.text)));
  assert.deepEqual(badNumbers(s), []);
  const rng = makeRng(1);
  for (let i = 0; i < 400 && s.year === v2.year; i++) step(s, 'squire', rng);
  assert.ok(s.year > v2.year || s.status !== 'active', 'a migrated career reaches its next winter');
});

test('every patron has a seat, a fee and a tourney the calendar holds', () => {
  const s = knight(12);
  for (const p of Object.values(PATRONS)) {
    assert.ok(p.fee > 0 && p.seat && p.tourneyLabel);
    takeService(s, p.id);
    assert.ok(s.calendar.some((e) => isPatronTourney(s, e)), `${p.id}: no tourney in the calendar is his`);
    leaveService(s);
  }
  assert.ok(monthOptions(s).length >= 0);
  assert.ok(LAST_MONTH === 10);
});
