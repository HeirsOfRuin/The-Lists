// The lists: what cannot be true of a course or a bout.
//
// The one that matters most is "preview equals resolver": with the herald's
// read in hand, the odds on screen must be exactly the chance of each outcome
// when the course is run. It is checked twice — exactly, by summation, and
// empirically, by running the resolver many times and counting.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  strikeOdds, expectedStrike, newBout, runCourse, applyCourse, reckonBout, trueMix, beliefMix,
  situation, archetype, CHOICES, choiceByKey,
} from '../src/engine/joust.js';
import { OUTCOMES, ARCHETYPES, ORDINANCE } from '../src/data/joust.data.js';
import { makeRng } from '../src/engine/rng.js';
import { knight } from './helpers.js';
import { enterTourney, currentBout, STAGE } from '../src/engine/tourney.js';
import { coursePreview, trueMixNow, reckonNow } from '../src/engine/derive.js';

const rider = (o = {}) => ({
  id: o.id || 'x', lance: 10, seat: 10, vigour: 10,
  horse: { quality: 10, temper: 'steady' }, fatigue: 0, wound: null, archetype: 'plain', ...o,
});

test('odds for every pairing are probabilities that sum to one', () => {
  const rng = makeRng(1);
  for (let i = 0; i < 400; i++) {
    const a = rider({
      lance: rng.range(1, 20), seat: rng.range(1, 20), vigour: rng.range(1, 20),
      horse: { quality: rng.range(1, 20), temper: rng.pick(['steady', 'hot']) },
      fatigue: rng.range(0, 12), wound: rng.pick([null, 'light']),
    });
    const d = rider({ lance: rng.range(1, 20), seat: rng.range(1, 20), horse: { quality: rng.range(1, 20), temper: 'steady' } });
    for (const ca of CHOICES) for (const cd of CHOICES) {
      const o = strikeOdds(a, d, ca, cd);
      let sum = 0;
      for (const k of OUTCOMES) {
        assert.ok(o[k] >= 0 && o[k] <= 1, `${k}=${o[k]}`);
        sum += o[k];
      }
      assert.ok(Math.abs(sum - 1) < 1e-9, `sums to ${sum}`);
      if (ca.aim === 'helm') {
        assert.equal(o.break, 0, 'a helm aim cannot break on the shield');
        assert.equal(o.tilt + o.horse, 0, 'a helm aim cannot foul');
      } else {
        assert.equal(o.helm, 0, 'only a helm aim takes the helm');
      }
      if (ca.aim !== 'low') assert.equal(o.horse, 0, 'only a low point can find the horse');
    }
  }
});

test('the preview is exactly the resolver’s odds when you hold the read', () => {
  const s = knight(5);
  enterTourney(s);
  assert.equal(s.event.stage, STAGE.BOUT);
  const cb = currentBout(s);
  s.event.intel[cb.him.id] = 2;
  const truth = trueMixNow(s);
  for (const c of CHOICES) {
    const p = coursePreview(s, c);
    // Independent summation over what he will actually do.
    const mine = Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
    const his = Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
    for (const cj of CHOICES) {
      const w = truth[cj.key];
      const m = strikeOdds(cb.you, cb.him, c, cj);
      const h = strikeOdds(cb.him, cb.you, cj, c);
      for (const o of OUTCOMES) { mine[o] += w * m[o]; his[o] += w * h[o]; }
    }
    for (const o of OUTCOMES) {
      assert.ok(Math.abs(p.mine[o] - mine[o]) < 1e-12, `${c.key} mine.${o}`);
      assert.ok(Math.abs(p.his[o] - his[o]) < 1e-12, `${c.key} his.${o}`);
    }
  }
});

test('the resolver produces the previewed odds when actually run', () => {
  const me = rider({ id: 'me', lance: 12, seat: 11, horse: { quality: 13, temper: 'hot' } });
  const him = rider({ id: 'him', lance: 10, seat: 9, archetype: 'hammer' });
  const choice = choiceByKey('low/press');
  const bout = newBout('me', 'him');
  const mix = trueMix(archetype('hammer'), situation(him, me, bout, 'b'));
  const expected = expectedStrike(me, him, choice, mix);
  const N = 40000;
  const counts = Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
  for (let i = 0; i < N; i++) {
    const b = newBout('me', 'him');
    const A = { ...me, fatigue: 0 };
    const B = { ...him, fatigue: 0 };
    const r = runCourse(b, A, B, choice, null, makeRng(i + 1));
    counts[r.outA] += 1;
  }
  for (const o of OUTCOMES) {
    const p = expected[o];
    const se = Math.sqrt((p * (1 - p)) / N);
    const got = counts[o] / N;
    assert.ok(Math.abs(got - p) <= 4.5 * se + 1e-9, `${o}: previewed ${p.toFixed(4)}, resolved ${got.toFixed(4)}`);
  }
});

test('without the read, the preview says so and uses the field’s habits', () => {
  const s = knight(6);
  enterTourney(s);
  const cb = currentBout(s);
  s.event.intel[cb.him.id] = 0;
  const p = coursePreview(s, choiceByKey('shield/balanced'));
  assert.equal(p.intel, 0);
  const field = beliefMix(archetype(cb.him.archetype), situation(cb.him, cb.you, cb.bout, 'b'), 0);
  const direct = expectedStrike(cb.you, cb.him, choiceByKey('shield/balanced'), field);
  for (const o of OUTCOMES) assert.ok(Math.abs(p.mine[o] - direct[o]) < 1e-12);
});

test('every bout ends, with exactly one winner, within the ordinance', () => {
  const rng = makeRng(77);
  const maxCourses = ORDINANCE.courses + ORDINANCE.tieCourses;
  const hows = new Set(['points', 'unhorse', 'forfeit', 'heralds']);
  for (let i = 0; i < 4000; i++) {
    const A = rider({ id: 'a', lance: rng.range(4, 18), seat: rng.range(4, 18), archetype: rng.pick(ARCHETYPES).id });
    const B = rider({ id: 'b', lance: rng.range(4, 18), seat: rng.range(4, 18), archetype: rng.pick(ARCHETYPES).id });
    const b = newBout('a', 'b');
    let guard = 0;
    while (!b.done) {
      runCourse(b, A, B, null, null, rng);
      assert.ok(++guard <= maxCourses, 'a bout ran past the courses the ordinance allows');
    }
    assert.ok(b.winner === 'a' || b.winner === 'b');
    assert.ok(hows.has(b.how), `how=${b.how}`);
    assert.equal(b.courses.length, b.course);
    // Scores are the sum of what the courses say happened.
    for (const side of ['a', 'b']) {
      const sum = b.courses.reduce((s, c) => s + ORDINANCE.points[c[side].out], 0);
      assert.equal(b.scores[side], sum);
    }
    const last = b.courses[b.courses.length - 1];
    if (b.how === 'unhorse') {
      const loser = b.winner === 'a' ? 'b' : 'a';
      assert.equal(last[b.winner].out, 'unhorse', 'the winner bore his man down');
      assert.notEqual(last[loser].out, 'unhorse');
    }
    if (b.how === 'forfeit') {
      const loser = b.winner === 'a' ? 'b' : 'a';
      assert.equal(last[loser].out, 'horse', 'the loser struck the horse');
    }
    if (b.how === 'points') assert.notEqual(b.scores.a, b.scores.b);
    assert.throws(() => runCourse(b, A, B, null, null, rng), /already decided/);
  }
});

test('a level bout after all its courses goes to the heralds, by faults then helms', () => {
  const b = newBout('a', 'b');
  const c = choiceByKey('shield/balanced');
  const coin = () => { throw new Error('the coin should not be needed'); };
  applyCourse(b, c, c, 'tilt', 'miss', coin);
  applyCourse(b, c, c, 'break', 'miss', coin);
  applyCourse(b, c, c, 'miss', 'miss', coin);
  applyCourse(b, c, c, 'miss', 'miss', coin);
  applyCourse(b, c, c, 'miss', 'miss', coin);
  assert.ok(b.done);
  assert.equal(b.how, 'heralds');
  assert.equal(b.winner, 'b', 'a knight with a fault loses a level bout');
});

test('a better rider beats a worse one more often than not', () => {
  const rng = makeRng(11);
  let wins = 0;
  const N = 3000;
  for (let i = 0; i < N; i++) {
    const A = rider({ id: 'a', lance: 13, seat: 13, archetype: 'plain' });
    const B = rider({ id: 'b', lance: 9, seat: 9, archetype: 'plain' });
    const b = newBout('a', 'b');
    while (!b.done) runCourse(b, A, B, null, null, rng);
    if (b.winner === 'a') wins += 1;
  }
  assert.ok(wins / N > 0.6, `the better rider won only ${(100 * wins / N).toFixed(1)}%`);
});

test('the squire’s reckoning is a probability, and his call is its best choice', () => {
  const s = knight(8);
  enterTourney(s);
  const r = reckonNow(s);
  for (const c of CHOICES) assert.ok(r.byChoice[c.key] >= 0 && r.byChoice[c.key] <= 1);
  const best = Math.max(...Object.values(r.byChoice));
  assert.equal(r.byChoice[r.best.key], best);
});
