// The joust: odds, habits, the course, and the bout.
//
// ONE DERIVATION. strikeOdds() is the only function that turns two riders and
// their choices into probabilities. The preview a player reads before a course
// calls it; the resolver that decides the course calls it; the squire's
// reckoning of the whole bout calls it. None of them has a second copy of the
// arithmetic, so the number shown cannot disagree with the number resolved.
//
// A combatant is plain data:
//   { id, lance, seat, vigour, horse: { quality, temper }, fatigue, wound, archetype? }
// The player and every rival are the same shape, and ride under the same rules.

import {
  AIMS, SEATS, EXPOSURE, TEMPERS, SKILL, FATIGUE, ORDINANCE, OUTCOMES,
  FIELD_HABITS, ARCHETYPES, RATING_MARGIN,
} from '../data/joust.data.js';
import { WOUNDS } from '../data/tourney.data.js';

export const AIM_IDS = ['helm', 'shield', 'low'];
export const SEAT_IDS = ['brace', 'balanced', 'press'];
export const CHOICES = AIM_IDS.flatMap((aim) => SEAT_IDS.map((seat) => ({ aim, seat, key: `${aim}/${seat}` })));
export const choiceByKey = (key) => CHOICES.find((c) => c.key === key);

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

export function archetype(id) {
  const a = ARCHETYPES.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown archetype: ${id}`);
  return a;
}

// ---------------------------------------------------------------------------
// The rider on the day
// ---------------------------------------------------------------------------

/** Lance and seat as they are right now, after any wound. */
export function effective(c) {
  const w = c.wound === 'light' ? WOUNDS.light : null;
  return {
    lance: Math.max(1, c.lance + (w ? w.lance : 0)),
    seat: Math.max(1, c.seat + (w ? w.seat : 0)),
  };
}

export function fatigueThreshold(c) { return c.vigour * FATIGUE.thresholdPerVigour; }

/** Logit lost to fatigue. Zero until fatigue passes vigour / 3. */
export function fatiguePenalty(c) {
  return SKILL.fatigueAim * Math.max(0, (c.fatigue || 0) - fatigueThreshold(c));
}

export function fatigueCost(choice) { return SEATS[choice.seat].fatigue; }
export function recovery(c) { return FATIGUE.recoveryBase + FATIGUE.recoveryPerVigour * c.vigour; }

/** Roughly the mean of lance and seat, nudged by the horse. */
export function rating(c) {
  const e = effective(c);
  return (e.lance + e.seat) / 2 + (c.horse.quality - 10) * 0.25;
}

// ---------------------------------------------------------------------------
// THE odds
// ---------------------------------------------------------------------------

/**
 * What the attacker's lance does this course, as a probability for each
 * outcome in OUTCOMES. Always sums to 1.
 *
 *   foul first  — a low point can find the tilt (or, worse, the horse)
 *   then a hit  — which aim, which seat, his seat, skill, horse, fatigue
 *   then a fall — given a hit: force against his seat and his horse
 */
export function strikeOdds(att, def, atkChoice, defChoice) {
  const aim = AIMS[atkChoice.aim];
  const mySeat = SEATS[atkChoice.seat];
  const hisSeat = SEATS[defChoice.seat];
  const temper = TEMPERS[att.horse.temper] || TEMPERS.steady;
  const a = effective(att);
  const d = effective(def);

  let pFoul = 0;
  if (aim.foul != null) {
    const foulLogit = aim.foul + mySeat.foul - SKILL.seatFoul * (a.seat - 10);
    pFoul = Math.min(0.95, sigmoid(foulLogit) * temper.foulMult);
  }

  const hitLogit = aim.hit
    + SKILL.lanceAim * (a.lance - 10)
    + SKILL.horseAim * (att.horse.quality - 10)
    - SKILL.guard * (d.seat - 10)
    + mySeat.aim
    + (atkChoice.seat === 'press' ? temper.pressAim : 0)
    + EXPOSURE[atkChoice.aim][defChoice.seat]
    - fatiguePenalty(att);
  const pHit = sigmoid(hitLogit);

  const unhorseLogit = aim.unhorse
    + SKILL.lanceForce * (a.lance - 10)
    + SKILL.horseForce * (att.horse.quality - 10)
    - SKILL.seatResist * (d.seat - 10)
    - SKILL.horseResist * (def.horse.quality - 10)
    + mySeat.force
    - hisSeat.stability;
  const pUnhorse = sigmoid(unhorseLogit);

  const clean = 1 - pFoul;
  const hit = clean * pHit;
  const landed = hit * (1 - pUnhorse);
  return {
    miss: clean * (1 - pHit),
    tilt: pFoul * (1 - aim.horseShare),
    horse: pFoul * aim.horseShare,
    break: aim.points === 2 ? 0 : landed,
    helm: aim.points === 2 ? landed : 0,
    unhorse: hit * pUnhorse,
  };
}

/** The attacker's odds against a MIX of the defender's choices. */
export function expectedStrike(att, def, atkChoice, defMix, { reverse = false } = {}) {
  const out = Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
  for (const c of CHOICES) {
    const w = defMix[c.key];
    if (!w) continue;
    const odds = reverse ? strikeOdds(def, att, c, atkChoice) : strikeOdds(att, def, atkChoice, c);
    for (const o of OUTCOMES) out[o] += w * odds[o];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Habits: what a rider will do, and what you believe he will do
// ---------------------------------------------------------------------------

/** Which tells can fire, from the rider's own point of view. */
export function situation(self, other, bout, side) {
  const mine = bout.scores[side];
  const his = bout.scores[side === 'a' ? 'b' : 'a'];
  const courseNo = bout.course + 1;
  const rs = rating(self);
  const ro = rating(other);
  return {
    ahead: mine > his,
    behind: mine < his,
    level: mine === his,
    lastCourse: courseNo >= ORDINANCE.courses,
    vsStronger: ro > rs + RATING_MARGIN,
    vsWeaker: ro < rs - RATING_MARGIN,
  };
}

function normalise(w) {
  const total = Object.values(w).reduce((s, v) => s + v, 0);
  const out = {};
  for (const [k, v] of Object.entries(w)) out[k] = total > 0 ? v / total : 1 / Object.keys(w).length;
  return out;
}

function joint(aimW, seatW) {
  const a = normalise(aimW);
  const s = normalise(seatW);
  const out = {};
  for (const c of CHOICES) out[c.key] = a[c.aim] * s[c.seat];
  return out;
}

/** The tells of an archetype that hold in this situation. */
export function activeTells(arch, sit) {
  return arch.tells.filter((t) => sit[t.when]);
}

/** What the rider will ACTUALLY do: habits, shifted by whichever tells hold. */
export function trueMix(arch, sit) {
  const aimW = { ...arch.aim };
  const seatW = { ...arch.seat };
  for (const t of activeTells(arch, sit)) {
    for (const [k, f] of Object.entries(t.aim || {})) aimW[k] *= f;
    for (const [k, f] of Object.entries(t.seat || {})) seatW[k] *= f;
  }
  return joint(aimW, seatW);
}

/**
 * What you believe he will do, by what you know of him:
 *   0 — nothing: the field's usual habits
 *   1 — his habits, without his tells
 *   2 — his habits and his tells: the truth
 */
export function beliefMix(arch, sit, intel) {
  if (intel >= 2) return trueMix(arch, sit);
  if (intel === 1) return joint(arch.aim, arch.seat);
  return joint(FIELD_HABITS.aim, FIELD_HABITS.seat);
}

export function pickFromMix(mix, rng) {
  let r = rng.next();
  let last = null;
  for (const c of CHOICES) {
    const w = mix[c.key];
    if (!(w > 0)) continue;
    last = c;
    r -= w;
    if (r < 0) return c;
  }
  return last;
}

export function sampleOutcome(odds, rng) {
  let r = rng.next();
  let last = 'miss';
  for (const o of OUTCOMES) {
    if (!(odds[o] > 0)) continue;
    last = o;
    r -= odds[o];
    if (r < 0) return o;
  }
  return last;
}

// ---------------------------------------------------------------------------
// The bout
// ---------------------------------------------------------------------------

export function newBout(aId, bId) {
  return {
    a: aId, b: bId,
    course: 0,
    scores: { a: 0, b: 0 },
    faults: { a: 0, b: 0 },
    helms: { a: 0, b: 0 },
    lances: { a: 0, b: 0 }, // lances broken, which is to say lances paid for
    courses: [],
    done: false,
    winner: null, // 'a' | 'b'
    how: null,    // 'points' | 'unhorse' | 'forfeit' | 'heralds' | 'walkover'
  };
}

const LANDED = new Set(['break', 'helm', 'unhorse']);

/**
 * Apply one course's outcomes to a bout. `coin` is called only if the heralds
 * must decide, so the random draw order is fixed by what happened.
 */
export function applyCourse(bout, choiceA, choiceB, outA, outB, coin) {
  const pts = ORDINANCE.points;
  bout.course += 1;
  bout.scores.a += pts[outA];
  bout.scores.b += pts[outB];
  if (outA === 'tilt' || outA === 'horse') bout.faults.a += 1;
  if (outB === 'tilt' || outB === 'horse') bout.faults.b += 1;
  if (outA === 'helm') bout.helms.a += 1;
  if (outB === 'helm') bout.helms.b += 1;
  if (LANDED.has(outA)) bout.lances.a += 1;
  if (LANDED.has(outB)) bout.lances.b += 1;
  bout.courses.push({
    n: bout.course,
    a: { aim: choiceA.aim, seat: choiceA.seat, out: outA },
    b: { aim: choiceB.aim, seat: choiceB.seat, out: outB },
    scores: { ...bout.scores },
  });

  const end = (winner, how) => { bout.done = true; bout.winner = winner; bout.how = how; };
  const onPoints = (how) => {
    if (bout.scores.a !== bout.scores.b) return end(bout.scores.a > bout.scores.b ? 'a' : 'b', how);
    return end(heraldsDecide(bout, coin), 'heralds');
  };

  const horseA = outA === 'horse';
  const horseB = outB === 'horse';
  if (horseA || horseB) {
    if (horseA && horseB) return onPoints('heralds');
    return end(horseA ? 'b' : 'a', 'forfeit');
  }
  const downB = outA === 'unhorse';
  const downA = outB === 'unhorse';
  if (downA || downB) {
    if (downA && downB) return onPoints('points');
    return end(downB ? 'a' : 'b', 'unhorse');
  }
  const maxCourses = ORDINANCE.courses + ORDINANCE.tieCourses;
  if (bout.course >= ORDINANCE.courses && bout.scores.a !== bout.scores.b) return onPoints('points');
  if (bout.course >= maxCourses) return onPoints('points');
  return bout;
}

/** Level after every course the ordinance allows: fewer faults, then more helms, then the heralds' own judgement. */
export function heraldsDecide(bout, coin) {
  if (bout.faults.a !== bout.faults.b) return bout.faults.a < bout.faults.b ? 'a' : 'b';
  if (bout.helms.a !== bout.helms.b) return bout.helms.a > bout.helms.b ? 'a' : 'b';
  return coin() < 0.5 ? 'a' : 'b';
}

/**
 * Run one course. Choices given as null are drawn from the rider's own habits
 * (a rival, or a bot). Draw order is fixed: A's choice, B's choice, A's lance,
 * B's lance, then (only if needed) the heralds' coin.
 */
export function runCourse(bout, A, B, choiceA, choiceB, rng) {
  if (bout.done) throw new Error('This bout is already decided.');
  const cA = choiceA || pickFromMix(trueMix(archetype(A.archetype), situation(A, B, bout, 'a')), rng);
  const cB = choiceB || pickFromMix(trueMix(archetype(B.archetype), situation(B, A, bout, 'b')), rng);
  const oddsA = strikeOdds(A, B, cA, cB);
  const oddsB = strikeOdds(B, A, cB, cA);
  const outA = sampleOutcome(oddsA, rng);
  const outB = sampleOutcome(oddsB, rng);
  applyCourse(bout, cA, cB, outA, outB, () => rng.next());
  A.fatigue = (A.fatigue || 0) + fatigueCost(cA);
  B.fatigue = (B.fatigue || 0) + fatigueCost(cB);
  return { choiceA: cA, choiceB: cB, outA, outB, oddsA, oddsB };
}

// ---------------------------------------------------------------------------
// The squire's reckoning: chance to carry the bout, for each choice
// ---------------------------------------------------------------------------

/**
 * For each of your nine choices this course, the chance of winning the bout if
 * you ride the rest of it well and he rides as you believe he will.
 *
 * Exact over the ordinance (three courses, two more if level, then the heralds
 * — counted as even). Fatigue is held at its current value for the rest of the
 * bout, which is the one approximation, and why the screen calls this the
 * squire's reckoning rather than the odds.
 *
 * `me`/`him` are combatants; `mySide` is 'a' or 'b'; `mixAt(sit)` returns his
 * mix for a situation seen from HIS side.
 */
export function reckonBout(bout, me, him, mySide, mixAt) {
  const hisSide = mySide === 'a' ? 'b' : 'a';
  // Every pairing's odds, once. Fatigue is fixed for the reckoning.
  const mine = {};
  const his = {};
  for (const ci of CHOICES) {
    mine[ci.key] = {};
    his[ci.key] = {};
    for (const cj of CHOICES) {
      mine[ci.key][cj.key] = strikeOdds(me, him, ci, cj);
      his[ci.key][cj.key] = strikeOdds(him, me, cj, ci);
    }
  }
  const pts = ORDINANCE.points;
  const maxCourses = ORDINANCE.courses + ORDINANCE.tieCourses;
  const memo = new Map();

  const decided = (diff) => (diff > 0 ? 1 : diff < 0 ? 0 : 0.5);

  function mixFor(k, diff) {
    const fake = { course: k, scores: { [mySide]: diff, [hisSide]: 0 } };
    return mixAt(situation(him, me, fake, hisSide));
  }

  function q(k, diff, ci, mix) {
    let v = 0;
    for (const cj of CHOICES) {
      const w = mix[cj.key];
      if (!w) continue;
      const m = mine[ci.key][cj.key];
      const h = his[ci.key][cj.key];
      for (const o1 of OUTCOMES) {
        const p1 = m[o1];
        if (!p1) continue;
        for (const o2 of OUTCOMES) {
          const p2 = h[o2];
          if (!p2) continue;
          v += w * p1 * p2 * transition(k, diff, o1, o2);
        }
      }
    }
    return v;
  }

  function transition(k, diff, o1, o2) {
    if (o1 === 'horse' || o2 === 'horse') {
      if (o1 === 'horse' && o2 === 'horse') return decided(diff + pts[o1] - pts[o2]);
      return o1 === 'horse' ? 0 : 1;
    }
    if (o1 === 'unhorse' || o2 === 'unhorse') {
      if (o1 === 'unhorse' && o2 === 'unhorse') return decided(diff);
      return o1 === 'unhorse' ? 1 : 0;
    }
    return value(k + 1, diff + pts[o1] - pts[o2]);
  }

  function value(k, diff) {
    if (k >= ORDINANCE.courses && diff !== 0) return decided(diff);
    if (k >= maxCourses) return decided(diff);
    const key = `${k}|${diff}`;
    if (memo.has(key)) return memo.get(key);
    const mix = mixFor(k, diff);
    let best = 0;
    for (const ci of CHOICES) best = Math.max(best, q(k, diff, ci, mix));
    memo.set(key, best);
    return best;
  }

  const diff = bout.scores[mySide] - bout.scores[hisSide];
  const mix = mixFor(bout.course, diff);
  const byChoice = {};
  let best = null;
  for (const ci of CHOICES) {
    byChoice[ci.key] = q(bout.course, diff, ci, mix);
    if (!best || byChoice[ci.key] > byChoice[best.key] + 1e-12) best = ci;
  }
  return { byChoice, best, mix };
}
