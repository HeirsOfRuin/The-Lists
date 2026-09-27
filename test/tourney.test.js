// A tourney, at every tier, and the save: what cannot be true of them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { playCourse, heraldReadCost, buyHeraldRead, STAGE, YOU, roundCount } from '../src/engine/tourney.js';
import { onward, leave, ride, answer, passMonth } from '../src/engine/season.js';
import {
  serialize, deserialize, migrate, SAVE_VERSION, STATUS, saveToStorage, loadFromStorage, clearStorage,
} from '../src/engine/state.js';
import { squireCall } from '../src/engine/derive.js';
import { choiceByKey } from '../src/engine/joust.js';
import { knight, toLists, answerFirst, badNumbers, dayStep } from './helpers.js';
import { assertProgress, ProgressError, playCareer } from '../sim/run.js';
import { step } from '../sim/bot.js';
import { makeRng } from '../src/engine/rng.js';

/** Play the tourney in hand to the prize-giving, with the squire's call. */
function finish(s, pick = (st) => squireCall(st)) {
  let guard = 0;
  while (s.event.stage !== STAGE.DONE || s.pending) {
    assert.ok(++guard < 300, 'a tourney did not finish');
    if (s.pending) answerFirst(s);
    else if (s.event.stage === STAGE.BOUT) ride(s, pick(s));
    else if (s.event.stage === STAGE.RESULT) onward(s);
    else dayStep(s);
  }
}

for (const [tier, n] of [['local', 4], ['regional', 8], ['high', 8], ['grand', 16]]) {
  test(`a ${tier} tourney has ${n} riders, one champion, and every bout decided`, () => {
    let checked = 0;
    for (let seed = 1; seed <= 25 && checked < 6; seed++) {
      const s = knight(seed);
      if (!toLists(s, { tier })) continue;
      finish(s);
      checked += 1;
      const ev = s.event;
      assert.equal(Object.keys(ev.riders).length, n);
      assert.equal(ev.rounds.length, roundCount(ev));
      const sizes = ev.rounds.map((r) => r.length);
      for (let i = 0; i < sizes.length; i++) assert.equal(sizes[i], n / 2 ** (i + 1));
      for (const [ri, pairs] of ev.rounds.entries()) {
        const seen = new Set();
        for (const p of pairs) {
          assert.ok(p.winner === p.a || p.winner === p.b, `round ${ri}: winner is not a rider in the bout`);
          assert.ok(p.bout && p.bout.done);
          if (p.bout.how !== 'walkover') assert.ok(p.bout.courses.length >= 1, 'a bout was decided without a course');
          for (const id of [p.a, p.b]) {
            assert.ok(!seen.has(id), `${id} rides twice in round ${ri}`);
            seen.add(id);
          }
        }
        if (ri > 0) {
          const winners = new Set(ev.rounds[ri - 1].map((p) => p.winner));
          for (const id of seen) assert.ok(winners.has(id), `${id} rode in round ${ri} without winning round ${ri - 1}`);
        }
      }
      assert.equal(ev.champion, ev.rounds[ev.rounds.length - 1][0].winner);
      assert.ok(['champion', 'runnerUp', 'semi', 'quarter', 'first'].includes(ev.placing));
      assert.ok(!/undefined|NaN|null/.test(ev.entry.text), ev.entry.text);
      assert.deepEqual(badNumbers(s), []);
    }
    assert.ok(checked >= 3, `only ${checked} ${tier} tourneys could be reached to check`);
  });
}

test('the purse moves only through the ledger while a tourney is in hand', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = knight(seed);
    s.purse = 100 * 240;
    const before = s.purse;
    if (!toLists(s, { rich: false })) continue;
    const opp = s.event.rounds[s.event.round][s.event.current].b;
    buyHeraldRead(s, opp);
    finish(s);
    // A pas at a bridge on the way keeps its own ledger beside the tourney's.
    const ledgers = [s.event, s.detour].filter(Boolean).flatMap((e) => e.ledger);
    const ledger = ledgers.reduce((sum, l) => sum + l.amount, 0);
    assert.equal(s.purse - before, ledger, 'purse change differs from the ledger');
    for (const l of ledgers) assert.ok(Number.isInteger(l.amount) && l.label && !/undefined/.test(l.label));
  }
});

test('the herald’s read costs less for a courteous knight, and cannot be bought twice', () => {
  const s = knight(3);
  assert.ok(toLists(s));
  const opp = s.event.rounds[s.event.round][s.event.current].b;
  s.intel[opp] = 0;
  s.knight.stats.courtesy = 8;
  const plain = heraldReadCost(s);
  s.knight.stats.courtesy = 16;
  assert.ok(heraldReadCost(s) < plain);
  assert.ok(buyHeraldRead(s, opp).ok);
  assert.equal(s.intel[opp], 2);
  assert.equal(buyHeraldRead(s, opp).ok, false);
});

test('you learn a rider’s habits by watching him ride, and remember them', () => {
  const s = knight(12);
  s.knight.stats.lore = 1;
  assert.ok(toLists(s, { tier: 'regional' }));
  const ev = s.event;
  for (const p of ev.rounds[0]) {
    if (p.a === YOU) continue;
    assert.ok(s.intel[p.a] >= 1 && s.intel[p.b] >= 1, 'watched riders should be known');
  }
  finish(s);
  const known = Object.keys(s.intel).length;
  leave(s);
  assert.ok(Object.keys(s.intel).length >= known, 'what you learned outlasts the tourney');
});

test('a seed and a sequence of choices reproduce a career exactly, across a save', () => {
  const a = knight(21);
  const b = knight(21);
  const rng = () => makeRng(9);
  for (let i = 0; i < 40; i++) { step(a, 'squire', rng()); step(b, 'squire', rng()); }
  const restored = deserialize(serialize(b));
  for (let i = 0; i < 120; i++) { step(a, 'squire', rng()); step(restored, 'squire', rng()); }
  assert.equal(serialize(a), serialize(restored));
  assert.notEqual(serialize(a), serialize(knight(22)));
});

test('saves carry their version, and refuse what they cannot read', () => {
  const s = knight(1);
  assert.equal(JSON.parse(serialize(s)).version, SAVE_VERSION);
  assert.throws(() => migrate({}), /no version/);
  assert.throws(() => migrate({ version: SAVE_VERSION + 1 }), /newer version/);
});

test('a phase-one save loads, keeps its knight and his book, and plays on', () => {
  const raw = readFileSync(new URL('./fixtures/v1-save.json', import.meta.url), 'utf8');
  const v1 = JSON.parse(raw);
  const s = deserialize(raw);
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.knight.given, v1.knight.given);
  assert.equal(s.purse, v1.purse);
  assert.equal(s.renown, v1.renown);
  assert.equal(s.book.length, v1.book.length);
  assert.ok(s.roster.knights.length === 48 && s.calendar.length > 0);
  assert.ok(s.month >= 3 && s.month <= 10);
  assert.equal(s.event, null);
  assert.deepEqual(badNumbers(s), []);
  for (let i = 0; i < 200 && s.year === v1.season; i++) step(s, 'squire', makeRng(i));
  assert.ok(s.year > v1.season || s.status !== STATUS.ACTIVE, 'a migrated career reaches its next winter');
});

test('a frame that refuses storage does not stop the game', () => {
  const hostile = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.equal(saveToStorage(knight(1), hostile).ok, false);
  assert.equal(loadFromStorage(hostile).ok, false);
  assert.equal(clearStorage(hostile).ok, false);
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    assert.equal(saveToStorage(knight(1)).ok, false);
    assert.equal(loadFromStorage().ok, false);
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc);
    else delete globalThis.localStorage;
  }
});

test('the batch runner refuses a career that did not happen', () => {
  assert.throws(() => assertProgress({ seed: 1, yearsPlayed: 0, tourneys: 0, bouts: 0, courses: 0, cards: 0 }), ProgressError);
  assert.throws(() => assertProgress({ seed: 1, yearsPlayed: 3, tourneys: 0, bouts: 0, courses: 0, cards: 5 }), ProgressError);
  assert.throws(() => assertProgress({ seed: 1, yearsPlayed: 3, tourneys: 3, bouts: 4, courses: 2, cards: 5 }), ProgressError);
  assert.throws(() => assertProgress({ seed: 1, yearsPlayed: 3, tourneys: 3, bouts: 4, courses: 9, cards: 0 }), ProgressError);
  const r = playCareer({ seed: 3, policy: 'squire', years: 2 });
  assert.ok(r.tourneys >= 1 && r.bouts >= 1 && r.courses >= r.bouts && r.cards >= 1);
});

test('a course cannot be ridden with a card waiting', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = knight(seed);
    if (!toLists(s)) continue;
    // Force a moment: finish the bout, then try to ride on before answering.
    while (s.event.stage === STAGE.BOUT && !s.pending) ride(s, choiceByKey('low/press'));
    if (!s.pending) continue;
    assert.equal(onward(s).ok, false);
    assert.equal(passMonth(s).ok, false);
    answerFirst(s);
    return;
  }
  assert.fail('no bout ended in a moment across 40 careers');
});
