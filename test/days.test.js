// The other lists: the days of a tourney, the mêlée, the barriers, the Great
// Pas and trial by combat. What cannot be true of any of them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STAGE, YOU, beginDays, newTourney, greatPasHolder } from '../src/engine/tourney.js';
import {
  onward, leave, ride, rideDay, standDownDay, exchange, footOnward, mercy, meleeTurn, ransom,
} from '../src/engine/season.js';
import { deserialize, SAVE_VERSION } from '../src/engine/state.js';
import { squireCall, footSquireCall, footPreview, trueFootMixNow, trialPreview } from '../src/engine/derive.js';
import {
  footOdds, expectedFoot, newFootBout, runExchange, fightOut, FOOT_CHOICES, noQuarter,
} from '../src/engine/foot.js';
import { engageOdds, newMelee, yourPass, OUTCOMES } from '../src/engine/melee.js';
import { cardById, choicesView } from '../src/engine/cards.js';
import { yearCalendar } from '../src/engine/calendar.js';
import { TIERS, GREAT_PAS } from '../src/data/tourney.data.js';
import { FOOT_OUTCOMES, FOOT_STYLES } from '../src/data/foot.data.js';
import { makeRng } from '../src/engine/rng.js';
import { knight, toLists, answerFirst, badNumbers, dayStep } from './helpers.js';

function finish(s) {
  let guard = 0;
  while (s.event && (s.event.stage !== STAGE.DONE || s.pending)) {
    assert.ok(++guard < 400, `a tourney did not finish (stage ${s.event.stage})`);
    if (s.status !== 'active') return;
    if (s.pending) answerFirst(s);
    else if (s.event.stage === STAGE.BOUT) ride(s, squireCall(s));
    else if (s.event.stage === STAGE.RESULT) onward(s);
    else assert.ok(dayStep(s), `nothing to do at stage ${s.event.stage}`);
  }
}

// ---------------------------------------------------------------------------
// The days
// ---------------------------------------------------------------------------

for (const tier of ['local', 'regional', 'high', 'grand']) {
  test(`a ${tier} tourney runs its days in order, and the book tells all of them`, () => {
    let checked = 0;
    for (let seed = 1; seed <= 30 && checked < 4; seed++) {
      const s = knight(seed);
      s.company = 3;
      if (!toLists(s, { tier })) continue;
      const ev = s.event;
      assert.deepEqual(ev.days, TIERS[tier].days);
      finish(s);
      if (s.status !== 'active') continue;
      checked += 1;
      const e = s.book[s.book.length - 1];
      if (ev.days.includes('melee') && ev.dayResults.melee) assert.match(e.text, /tourney in the field/);
      if (ev.days.includes('barriers') && ev.dayResults.foot) assert.match(e.text, /barriers/);
      if (!ev.days.includes('melee')) assert.equal(ev.dayResults.melee, undefined);
      assert.deepEqual(badNumbers(s), []);
      assert.equal(leave(s).ok, true);
    }
    assert.ok(checked >= 2, `only ${checked} ${tier} tourneys finished`);
  });
}

test('you may stand down from the mêlée and the barriers, but not the jousts you came for', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = knight(seed);
    if (!toLists(s, { tier: 'high' })) continue;
    let guard = 0;
    while (s.event.stage !== STAGE.DAY && s.event.stage !== STAGE.DONE && guard++ < 200) {
      if (s.pending) answerFirst(s);
      else if (s.event.stage === STAGE.BOUT) ride(s, squireCall(s));
      else if (s.event.stage === STAGE.RESULT) onward(s);
    }
    if (s.event.stage !== STAGE.DAY) continue;
    while (s.pending) answerFirst(s);
    const renown = s.renown;
    assert.equal(standDownDay(s).ok, true);
    if (s.event.stage === STAGE.DAY) assert.equal(standDownDay(s).ok, true);
    assert.equal(s.event.stage, STAGE.DONE);
    assert.equal(s.renown, renown, 'standing down wins nothing');
    assert.match(s.event.notes.join(' '), /stand down/);
    return;
  }
  assert.fail('no high tourney reached its second day');
});

// ---------------------------------------------------------------------------
// The mêlée
// ---------------------------------------------------------------------------

const mrider = (id, skill, renown = 20) => ({ id, sword: skill, seat: skill, vigour: 10, horse: { quality: 10 }, fatigue: 0, wound: null, renown });

test('an engagement in the mêlée comes out at the odds its button shows', () => {
  for (const [mine, his, men, action] of [[10, 10, 0, 'take'], [13, 9, 2, 'take'], [8, 12, 1, 'strike']]) {
    const me = mrider(YOU, mine);
    const him = mrider('k1', his);
    const shown = engageOdds(me, men, him, 0, action);
    assert.ok(Math.abs(OUTCOMES.reduce((t, o) => t + shown[o], 0) - 1) < 1e-9);
    const N = 5000;
    const count = Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
    for (let i = 0; i < N; i++) {
      const m = newMelee({ tier: 'high', riders: { [YOU]: mrider(YOU, mine), k1: mrider('k1', his) }, sides: { holders: ['k1'], comers: [YOU] }, yourSide: 'comers', men });
      m.openings = [{ kind: 'engage', id: 'k1', men: 0 }];
      count[yourPass(m, 0, action, makeRng(i * 7 + 1)).outcome] += 1;
    }
    for (const o of OUTCOMES) {
      const se = Math.sqrt((shown[o] * (1 - shown[o])) / N);
      assert.ok(Math.abs(count[o] / N - shown[o]) < 4.5 * se + 1e-9, `${action} ${mine}v${his}, ${o}: shown ${shown[o].toFixed(3)}, rolled ${(count[o] / N).toFixed(3)}`);
    }
  }
});

test('men riding with you take the captures meant for you, and your weight in the press', () => {
  const me = mrider(YOU, 10);
  const him = mrider('k1', 10);
  const alone = engageOdds(me, 0, him, 0, 'take');
  const three = engageOdds(me, 3, him, 0, 'take');
  assert.ok(three.win > alone.win, 'men add weight');
  assert.ok(three.youTaken < alone.youTaken, 'and stand between you and capture');
  assert.equal(alone.manTaken, 0);
});

test('a mêlée day settles through the ledger, prisoners and all', () => {
  let settled = 0;
  for (let seed = 1; seed <= 40 && settled < 3; seed++) {
    const s = knight(seed);
    s.knight.stats.sword = 16; s.knight.stats.seat = 16;
    if (!toLists(s, { tier: 'high' })) continue;
    let guard = 0;
    while (s.event.stage !== STAGE.DONE && s.status === 'active' && guard++ < 400) {
      if (s.pending) { answerFirst(s); continue; }
      const st = s.event.stage;
      if (st === STAGE.RANSOM) {
        const before = s.purse;
        const due = s.event.dayResults.melee.due;
        ransom(s, 'full');
        assert.equal(s.purse - before, due, 'full ransom is the sum of the prisoners’ ransoms');
        settled += 1;
        continue;
      }
      if (st === STAGE.BOUT) ride(s, squireCall(s));
      else if (st === STAGE.RESULT) onward(s);
      else dayStep(s);
    }
    if (s.event.stage === STAGE.DONE) {
      const net = s.event.ledger.reduce((t, l) => t + l.amount, 0);
      assert.equal(s.event.entry.net, net);
    }
  }
  assert.ok(settled >= 1, 'no mêlée took a prisoner in 40 careers of a strong knight');
});

// ---------------------------------------------------------------------------
// The barriers
// ---------------------------------------------------------------------------

test('every exchange at the barriers sums to one, for every choice and every man', () => {
  for (const sa of [4, 10, 18]) {
    for (const sb of [4, 10, 18]) {
      const A = { id: 'a', sword: sa, vigour: 10, fatigue: 6, wound: sa === 4 ? 'light' : null };
      const B = { id: 'b', sword: sb, vigour: 14, fatigue: 0, wound: null };
      for (const ca of FOOT_CHOICES) {
        for (const cb of FOOT_CHOICES) {
          const o = footOdds(A, B, ca, cb);
          const sum = FOOT_OUTCOMES.reduce((t, k) => t + o[k], 0);
          assert.ok(Math.abs(sum - 1) < 1e-9, `${ca.key} v ${cb.key}: ${sum}`);
          for (const k of FOOT_OUTCOMES) assert.ok(o[k] >= 0 && o[k] <= 1);
        }
      }
    }
  }
});

test('every combat ends with one winner, inside its ordinance', () => {
  for (let i = 0; i < 400; i++) {
    const rng = makeRng(i + 3);
    const ord = i % 2 ? 'outrance' : 'articles';
    const A = { id: 'a', sword: 6 + (i % 9), vigour: 10, fatigue: 0, wound: null, footStyle: FOOT_STYLES[i % 5].id };
    const B = { id: 'b', sword: 14 - (i % 9), vigour: 10, fatigue: 0, wound: null, footStyle: FOOT_STYLES[(i + 2) % 5].id };
    const b = fightOut(newFootBout('a', 'b', ord), A, B, rng);
    assert.ok(b.done && (b.winner === 'a' || b.winner === 'b'));
    assert.ok(b.n <= (ord === 'outrance' ? 9 : 5));
    if (ord === 'outrance') assert.ok(['down', 'disarm', 'hurt', 'baton', 'points', 'judges'].includes(b.how));
  }
});

test('with the herald’s read, the barriers preview is the truth', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = knight(seed);
    if (!toLists(s, { tier: 'high' })) continue;
    let guard = 0;
    while (s.event.stage !== STAGE.FOOT && s.event.stage !== STAGE.DONE && s.status === 'active' && guard++ < 400) {
      if (s.pending) answerFirst(s);
      else if (s.event.stage === STAGE.BOUT) ride(s, squireCall(s));
      else if (s.event.stage === STAGE.RESULT) onward(s);
      else dayStep(s);
    }
    if (s.event.stage !== STAGE.FOOT) continue;
    const f = s.event.foot;
    s.intel[f.bout.b] = 2;
    const truth = trueFootMixNow(s);
    for (const c of FOOT_CHOICES) {
      const p = footPreview(s, c);
      const exact = expectedFoot(f.riders[YOU], f.riders[f.bout.b], c, truth);
      for (const o of FOOT_OUTCOMES) assert.ok(Math.abs(p.mine[o] - exact[o]) < 1e-12);
    }
    exchange(s, footSquireCall(s));
    return;
  }
  assert.fail('no high tourney reached the barriers');
});

// ---------------------------------------------------------------------------
// The Great Pas
// ---------------------------------------------------------------------------

test('the Great Pas comes in the seventh year, held by the first lance of the Roll', () => {
  const s = knight(3);
  assert.ok(!yearCalendar(s.seed, 6).some((e) => e.tier === 'greatpas'));
  const cal = yearCalendar(s.seed, GREAT_PAS.year).find((e) => e.tier === 'greatpas');
  assert.ok(cal, 'the pas is on the seventh year’s calendar');
  const top = [...s.roster.knights].filter((k) => k.active).sort((a, b) => b.renown - a.renown)[0];
  assert.equal(greatPasHolder(s, cal).id, top.id);
  s.purse = 100 * 240;
  s.event = newTourney(s, cal, { from: s.location });
  s.event.stage = STAGE.FEAST;
  beginDays(s);
  assert.equal(s.event.stage, STAGE.DAY, 'every shield is yours to touch or leave');
  const renown = s.renown;
  assert.equal(rideDay(s).ok, true);
  assert.equal(s.renown, renown + TIERS.greatpas.touched.renown, 'a gold ring for touching the shield');
  finish(s);
  assert.ok(s.event.touched >= 1);
  assert.match(s.event.entry.text, /book of the pas/);
});

// ---------------------------------------------------------------------------
// Trial by combat
// ---------------------------------------------------------------------------

function trialAt(seed, { mine = 10, cause = 'accused', temperament = 'proud' } = {}) {
  const s = knight(seed);
  s.knight.stats.sword = mine; s.knight.stats.vigour = mine;
  const k = s.roster.knights[seed % s.roster.knights.length];
  k.temperament = temperament;
  toLists(s, { tier: 'regional' });
  s.detour = s.event;
  s.event = null;
  const { newTrial } = TRIAL;
  s.event = newTrial(s, k.id, cause, 'kingsmead');
  s.event.stage = STAGE.FEAST;
  beginDays(s);
  return { s, k };
}
const TRIAL = await import('../src/engine/tourney.js');

test('beaten à outrance, a knight dies at the chance the accusation showed', () => {
  let losses = 0; let killed = 0; let expect = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const { s, k } = trialAt(seed, { mine: 5 });
    let guard = 0;
    // How he is beaten does not change what the victor does with him.
    while (s.event.stage === STAGE.FOOT && guard++ < 12) exchange(s, { stroke: 'thrust', guard: 'stand' });
    if (s.event.trial.outcome === 'won') continue;
    losses += 1;
    expect += noQuarter(k, true);
    if (s.status === 'dead') { killed += 1; assert.equal(s.outcome.kind, 'dead'); }
  }
  assert.ok(losses > 150);
  const p = expect / losses;
  const se = Math.sqrt((p * (1 - p)) / losses);
  assert.ok(Math.abs(killed / losses - p) < 4.5 * se, `killed ${killed} of ${losses}, expected ${(p * losses).toFixed(1)}`);
});

test('won à outrance, the man of Ambry Cross is at your mercy, and your master’s name is cleared', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const { s, k } = trialAt(seed, { mine: 20, cause: 'ambry', temperament: 'courteous' });
    s.story = { culprit: k.id };
    s.flags.push('culpritKnown');
    let guard = 0;
    while (s.event.stage === STAGE.FOOT && guard++ < 12) exchange(s, { stroke: 'thrust', guard: 'stand' });
    if (s.event.trial.outcome !== 'won') continue;
    assert.equal(s.event.foot.mercy, 'pending');
    assert.equal(footOnward(s).ok, false, 'he is at your mercy first');
    assert.equal(mercy(s, true).ok, true);
    footOnward(s);
    assert.equal(s.event.stage, STAGE.DONE);
    assert.ok(s.flags.includes('masterCleared'));
    assert.ok(k.active, 'a man you spared lives');
    assert.equal(leave(s).ok, true, 'and the tourney it interrupted goes on');
    assert.ok(s.event && s.event.tier === 'regional');
    return;
  }
  assert.fail('a knight of sword 20 never won a trial');
});

test('the accusation card shows the trial’s odds and the chance of no quarter', () => {
  const s = knight(5);
  const k = s.roster.knights[0];
  k.regard = -8;
  const inst = { id: 'arrival.accused', uid: 1, cast: { rival: k.id }, ctx: { tier: 'high', town: 'kingsmead', host: 'the king', hostFaction: 'crown', prize: 0 } };
  const v = choicesView(s, inst)[0];
  const t = trialPreview(s, k.id);
  assert.ok(v.effects.some((l) => l.includes(`${Math.round(t.win * 100)}%`)));
  assert.ok(v.effects.some((l) => l.includes(`kills you: ${Math.round(noQuarter(k, true) * 100)}%`)));
  assert.ok(cardById('feast.accuse').choices.some((c) => c.effects?.trial === 'ambry'));
});

// ---------------------------------------------------------------------------
// Old saves
// ---------------------------------------------------------------------------

test('a phase-four save opens in the middle of a tourney, and plays on', () => {
  const raw = readFileSync(new URL('./fixtures/v4-save.json', import.meta.url), 'utf8');
  assert.equal(JSON.parse(raw).version, 4);
  const s = deserialize(raw);
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.knight.stats.sword, 8 + 2 + 1, 'taught the axe by a veteran');
  assert.ok(s.roster.knights.every((k) => k.sword > 0 && FOOT_STYLES.some((st) => st.id === k.footStyle)));
  assert.deepEqual(s.event.days, ['joust'], 'the tourney in hand stays one day long');
  finish(s);
  assert.equal(s.event.stage, STAGE.DONE);
  assert.equal(leave(s).ok, true);
  assert.deepEqual(badNumbers(s), []);
});
