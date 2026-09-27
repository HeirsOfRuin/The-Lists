// The months and the winter: what cannot be true of a year.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthOptions, rideTo, train, serve, rest, passMonth, answer, beginWinter, endWinter, hire, dismiss,
  buyHarness, takeSquire, dubSquire, setFocus, keepBorrowedHorse, PHASE, isFree, leave,
} from '../src/engine/season.js';
import { STAGE, YOU } from '../src/engine/tourney.js';
import { STATUS } from '../src/engine/state.js';
import { HARNESS, SQUIRE, RETINUE } from '../src/data/household.data.js';
import { FIRST_MONTH, LAST_MONTH } from '../src/data/world.data.js';
import { knight, answerFirst, badNumbers } from './helpers.js';
import { knightById } from '../src/engine/field.js';
import { step } from '../sim/bot.js';
import { makeRng } from '../src/engine/rng.js';

function toWinter(s) {
  for (let g = 0; g < 50 && s.phase === PHASE.MONTH; g++) {
    if (s.pending) answerFirst(s);
    else passMonth(s);
  }
}

test('a closed tourney says why, and refuses', () => {
  const s = knight(1);
  s.renown = 0; s.lineage = 3; s.purse = 0;
  for (let m = FIRST_MONTH; m <= LAST_MONTH; m++) {
    for (const o of monthOptions(s)) {
      assert.equal(o.open, !o.reason);
      if (!o.open) {
        assert.ok(o.reason.length > 10);
        assert.equal(rideTo(s, o.cal.id).ok, false);
      }
    }
    passMonth(s);
    if (s.pending) answerFirst(s);
  }
});

test('training, service and rest each end the month and do what they say', () => {
  const s = knight(2);
  const m = s.month;
  const marks = s.knight.marks.lance;
  assert.ok(train(s, 'lance').ok);
  assert.equal(s.month, m + 1);
  assert.ok(s.knight.marks.lance > marks || s.knight.stats.lance > 0);
  const purse = s.purse;
  assert.ok(serve(s).ok);
  assert.ok(s.purse > purse);
  assert.ok(rest(s).ok);
  assert.equal(s.month, m + 3);
  assert.equal(train(s, 'nonsense').ok, false);
});

test('a card waiting blocks everything else until it is answered', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const s = knight(seed);
    s.purse = 100 * 240;
    const opt = monthOptions(s).find((o) => o.open && o.days >= 3);
    if (!opt) continue;
    rideTo(s, opt.cal.id);
    if (!s.pending) continue;
    assert.equal(isFree(s), false);
    assert.equal(train(s, 'lance').ok, false);
    assert.equal(passMonth(s).ok, false);
    answerFirst(s);
    assert.equal(s.pending?.inst.context === 'road', false);
    return;
  }
  assert.fail('no road card came up in 60 journeys');
});

test('October ends in winter; the winter accounts are the purse’s change', () => {
  const s = knight(3);
  s.month = LAST_MONTH;
  const before = s.purse;
  passMonth(s);
  assert.equal(s.phase, PHASE.WINTER);
  const ledger = s.winter.ledger.reduce((t, l) => t + l.amount, 0);
  assert.equal(s.purse - before, ledger);
  for (const l of s.winter.ledger) assert.ok(Number.isInteger(l.amount) && !/undefined/.test(l.label));
});

test('spring: a year older, a new calendar, home again', () => {
  const s = knight(4);
  const age = s.knight.age;
  const cal = s.calendar;
  toWinter(s);
  if (s.pending) answerFirst(s);
  assert.equal(s.knight.age, age + 1);
  assert.ok(endWinter(s).ok);
  assert.equal(s.year, 2);
  assert.equal(s.month, FIRST_MONTH);
  assert.equal(s.phase, PHASE.MONTH);
  assert.notDeepEqual(s.calendar, cal);
  assert.ok(s.calendar.every((e) => e.year === 2));
});

test('the winter market takes money it has, and refuses what it cannot pay', () => {
  const s = knight(5);
  toWinter(s);
  if (s.pending) answerFirst(s);
  s.purse = 0;
  assert.equal(buyHarness(s, HARNESS.market[0].id).ok, false);
  assert.equal(hire(s, 'groom').ok, false);
  s.purse = 100 * 240;
  const p = s.purse;
  assert.ok(hire(s, 'groom').ok);
  assert.equal(s.purse, p - RETINUE.groom.wage);
  assert.equal(hire(s, 'groom').ok, false, 'one groom at a time');
  assert.ok(buyHarness(s, HARNESS.market[0].id).ok);
  assert.equal(s.harness.quality, HARNESS.market[0].quality);
  assert.ok(dismiss(s, 'groom').ok);
  assert.ok(!s.retinue.includes('groom'));
  assert.ok(setFocus(s, 'seat').ok);
});

test('a squire serves his years, and is dubbed into the field as your friend', () => {
  const s = knight(6);
  toWinter(s);
  if (s.pending) answerFirst(s);
  assert.ok(s.winter.candidates.length > 0);
  assert.ok(takeSquire(s, 0).ok);
  assert.equal(dubSquire(s).ok, false, 'not before his years');
  s.squire.years = SQUIRE.knightAt;
  const before = s.roster.knights.length;
  const name = s.squire.name;
  assert.ok(dubSquire(s).ok);
  assert.equal(s.squire, null);
  assert.equal(s.roster.knights.length, before + 1);
  const k = s.roster.knights[s.roster.knights.length - 1];
  assert.equal(k.given, name);
  assert.equal(k.regard, 10);
});

test('a borrowed horse goes back at spring unless it is bought', () => {
  const answers = { birth: 'younger', advantage: 'wealth', province: 'march', master: 'veteran', taught: 'lance', spurs: 'field', incident: 'confronted', horse: 'borrowed', heart: 'free', ambition: 'champion' };
  const a = knight(7, answers);
  const b = knight(7, answers);
  for (const s of [a, b]) { toWinter(s); if (s.pending) answerFirst(s); }
  assert.ok(keepBorrowedHorse(b).ok);
  endWinter(a); endWinter(b);
  assert.equal(a.horse.borrowed, false);
  assert.equal(a.horse.kind, 'hack');
  assert.equal(b.horse.kind, 'borrowed');
  assert.equal(b.horse.borrowed, false);
});

test('a knight who cannot close the winter accounts is ruined, and says why', () => {
  const s = knight(8);
  s.month = LAST_MONTH;
  s.purse = 0;
  s.answers.advantage = 'oldblood';
  passMonth(s);
  assert.equal(s.status, STATUS.RUINED);
  assert.ok(s.outcome.text.length > 20);
});

test('a pas at a bridge interrupts the road, and the tourney waits for you', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const s = knight(seed);
    s.purse = 100 * 240;
    const opt = monthOptions(s).find((o) => o.open && o.days >= 3);
    if (!opt) continue;
    rideTo(s, opt.cal.id);
    if (s.pending?.inst.id !== 'road.bridge') continue;
    const town = s.event.town;
    answer(s, 0); // touch the shield
    assert.equal(s.event.tier, 'pas');
    assert.equal(s.event.stage, STAGE.BOUT);
    assert.equal(Object.keys(s.event.riders).length, 2);
    for (let g = 0; g < 40 && (s.event.stage !== STAGE.DONE || s.pending); g++) {
      if (s.pending) answerFirst(s);
      else step(s, 'squire', makeRng(g));
    }
    assert.ok(leave(s).ok);
    assert.equal(s.event.tier, opt.cal.tier, 'back on the road to the tourney');
    assert.equal(s.event.town, town);
    assert.ok([STAGE.ARRIVAL].includes(s.event.stage));
    return;
  }
  assert.fail('no bridge in 400 journeys');
});

test('eight years of careers leave nothing impossible behind', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const s = knight(seed);
    const rng = makeRng(seed);
    for (let i = 0; i < 4000 && s.status === STATUS.ACTIVE && s.year < 9; i++) step(s, 'squire', rng);
    assert.ok(s.year >= 9 || s.status !== STATUS.ACTIVE, `career ${seed} stalled in year ${s.year}`);
    assert.deepEqual(badNumbers(s), []);
    assert.ok(Number.isInteger(s.purse));
    for (const v of Object.values(s.knight.stats)) assert.ok(v >= 1 && v <= 20);
    for (const v of Object.values(s.knight.traits)) assert.ok(v >= 0 && v <= 20);
    for (const k of s.roster.knights) assert.ok(k.regard >= -10 && k.regard <= 10);
    assert.ok(s.horse.condition >= 0 && s.horse.condition <= 10);
    if (s.event) assert.ok(Object.values(STAGE).includes(s.event.stage));
  }
});
