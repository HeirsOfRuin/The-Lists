// A tourney, a career, and the save: what cannot be true of them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  enterTourney, playCourse, continueTourney, rideOn, buyHeraldRead, heraldReadCost, entryCost,
  STAGE, YOU,
} from '../src/engine/tourney.js';
import { serialize, deserialize, migrate, SAVE_VERSION, STATUS } from '../src/engine/state.js';
import { squireCall } from '../src/engine/derive.js';
import { choiceByKey } from '../src/engine/joust.js';
import { EVENTS_PER_SEASON } from '../src/data/tourney.data.js';
import { knight, badNumbers } from './helpers.js';
import { playTourney } from '../sim/bot.js';
import { assertProgress, ProgressError, playCareer } from '../sim/run.js';
import { makeRng } from '../src/engine/rng.js';

function finish(s, pick = (st) => squireCall(st)) {
  let guard = 0;
  while (s.event.stage !== STAGE.DONE) {
    assert.ok(++guard < 200, 'a tourney did not finish');
    if (s.event.stage === STAGE.BOUT) playCourse(s, pick(s));
    else if (s.event.stage === STAGE.RESULT) continueTourney(s);
  }
}

test('a tourney has one champion, three rounds, and every bout decided', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const s = knight(seed);
    assert.ok(enterTourney(s).ok);
    finish(s);
    const ev = s.event;
    assert.deepEqual(ev.rounds.map((r) => r.length), [4, 2, 1]);
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
    assert.equal(ev.champion, ev.rounds[2][0].winner);
    assert.ok(['champion', 'runnerUp', 'semi', 'quarter'].includes(ev.placing));
    assert.deepEqual(badNumbers(s), []);
  }
});

test('the purse moves only through the ledger', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = knight(seed);
    const before = s.purse;
    enterTourney(s);
    // Buy a read on the first opponent when it can be afforded.
    const opp = s.event.rounds[0].find((p) => p.a === YOU).b;
    buyHeraldRead(s, opp);
    finish(s);
    const ledger = s.event.ledger.reduce((sum, l) => sum + l.amount, 0);
    assert.equal(s.purse - before, ledger, 'purse change differs from the ledger');
    assert.equal(s.event.entry.net, ledger);
    for (const l of s.event.ledger) assert.ok(Number.isInteger(l.amount) && l.label && !/undefined/.test(l.label));
  }
});

test('the herald’s read costs less for a courteous knight, and cannot be bought twice', () => {
  const s = knight(3);
  enterTourney(s);
  const opp = s.event.rounds[0].find((p) => p.a === YOU).b;
  s.knight.stats.courtesy = 8;
  const plain = heraldReadCost(s);
  s.knight.stats.courtesy = 16;
  assert.ok(heraldReadCost(s) < plain);
  assert.ok(buyHeraldRead(s, opp).ok);
  assert.equal(s.event.intel[opp], 2);
  assert.equal(buyHeraldRead(s, opp).ok, false);
});

test('you learn a rider’s habits by watching him ride', () => {
  const s = knight(12);
  s.knight.stats.lore = 1; // no lore: you know nobody on arrival
  s.event = null;
  rideOn(s);
  for (const [id, lvl] of Object.entries(s.event.intel)) assert.equal(lvl, 0, `${id} known before anyone rode`);
  enterTourney(s);
  for (const p of s.event.rounds[0]) {
    if (p.a === YOU) continue;
    assert.ok(s.event.intel[p.a] >= 1 && s.event.intel[p.b] >= 1, 'watched riders should be known');
  }
});

test('a seed and a sequence of choices reproduce a career exactly, across a save', () => {
  const play = (s, n) => { for (let i = 0; i < n && s.status === STATUS.ACTIVE; i++) { playTourney(s, 'squire', makeRng(i)); rideOn(s); } };
  const a = knight(21);
  const b = knight(21);
  play(a, 1);
  play(b, 1);
  // Save mid-bout of the second tourney, load, and carry on.
  enterTourney(b);
  playCourse(b, choiceByKey('helm/press'));
  const restored = deserialize(serialize(b));
  enterTourney(a);
  playCourse(a, choiceByKey('helm/press'));
  // Both now continue from the same point; one of them went through JSON.
  const rest = (s) => { finish(s); rideOn(s); play(s, 1); };
  rest(a);
  rest(restored);
  assert.equal(serialize(a), serialize(restored));
  assert.notEqual(serialize(a), serialize(knight(22)));
});

test('saves carry their version, and refuse what they cannot read', () => {
  const s = knight(1);
  assert.equal(JSON.parse(serialize(s)).version, SAVE_VERSION);
  assert.throws(() => migrate({}), /no version/);
  assert.throws(() => migrate({ version: SAVE_VERSION + 1 }), /newer version/);
});

test('the season turns and the knight ages', () => {
  const s = knight(4);
  const age = s.knight.age;
  for (let i = 0; i < EVENTS_PER_SEASON; i++) {
    enterTourney(s);
    finish(s);
    rideOn(s);
  }
  assert.equal(s.season, 2);
  assert.equal(s.knight.age, age + 1);
  assert.equal(s.eventInSeason, 0);
  assert.equal(s.book.length, EVENTS_PER_SEASON);
  for (const e of s.book) {
    assert.ok(e.text.includes(e.town));
    assert.ok(!/undefined|NaN|null/.test(e.text), e.text);
  }
});

test('a knight who cannot pay to ride is ruined, and says why', () => {
  const s = knight(5);
  enterTourney(s);
  finish(s);
  s.purse = entryCost() - 1;
  rideOn(s);
  assert.equal(s.status, STATUS.RUINED);
  assert.ok(s.outcome && s.outcome.text.length > 20);
  assert.equal(enterTourney(s).ok, false);
});

test('the batch runner refuses a career that did not happen', () => {
  assert.throws(() => assertProgress({ seed: 1, tourneys: 0, bouts: 0, courses: 0 }), ProgressError);
  assert.throws(() => assertProgress({ seed: 1, tourneys: 3, bouts: 0, courses: 0 }), ProgressError);
  assert.throws(() => assertProgress({ seed: 1, tourneys: 3, bouts: 4, courses: 2 }), ProgressError);
  const r = playCareer({ seed: 3, policy: 'squire', tourneys: 6 });
  assert.ok(r.tourneys >= 1 && r.bouts >= r.tourneys && r.courses >= r.bouts);
});
