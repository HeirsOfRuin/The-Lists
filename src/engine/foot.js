// Foot combat at the barriers: odds, habits, the exchange, and the bout.
//
// ONE DERIVATION, as in the lists. footOdds() is the only function that turns
// two men and their choices into probabilities. The preview, the resolver and
// the squire's reckoning all call it.
//
// A combatant is plain data:
//   { id, sword, vigour, fatigue, wound, footStyle, grudge? }
// The tourney's riders already carry all of it.
//
// Two ordinances: the ARTICLES of a pas (blunted axes, points, a few
// exchanges) and À OUTRANCE (sharp axes; a man is beaten when he is down,
// disarmed, or twice struck on the head, and the king's baton ends it at the
// ninth exchange).

import {
  STROKES, GUARDS, REACH, FOOT_SKILL, FOOT_FATIGUE, ARTICLES, OUTRANCE, FOOT_OUTCOMES,
  FIELD_FOOT_HABITS, FOOT_STYLES, FOOT_GRUDGE, NO_QUARTER,
} from '../data/foot.data.js';
import { RATING_MARGIN } from '../data/joust.data.js';

export const STROKE_IDS = ['head', 'thrust', 'hook'];
export const GUARD_IDS = ['stand', 'close', 'give'];
export const FOOT_CHOICES = STROKE_IDS.flatMap((stroke) => GUARD_IDS.map((guard) => ({ stroke, guard, key: `${stroke}/${guard}` })));
export const footChoiceByKey = (key) => FOOT_CHOICES.find((c) => c.key === key);
export const ORDINANCES = { articles: ARTICLES, outrance: OUTRANCE };

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

export function footStyle(id) {
  const s = FOOT_STYLES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown style at the barriers: ${id}`);
  return s;
}

// ---------------------------------------------------------------------------
// The man on the day
// ---------------------------------------------------------------------------

/** Sword as it is right now, after any wound. */
export function swordNow(c) { return Math.max(1, c.sword + (c.wound === 'light' ? -1 : 0)); }

export function footThreshold(c) { return c.vigour * FOOT_FATIGUE.thresholdPerVigour; }
function spent(c) { return Math.max(0, (c.fatigue || 0) - footThreshold(c)); }
export function footFatigueCost(choice) { return GUARDS[choice.guard].fatigue + FOOT_FATIGUE.perExchange; }

/** For telling a stronger man from a weaker one. */
export function footRating(c) { return swordNow(c) + (c.vigour - 10) * 0.2; }

// ---------------------------------------------------------------------------
// THE odds
// ---------------------------------------------------------------------------

/**
 * What the attacker's axe does this exchange, as a probability for each
 * outcome in FOOT_OUTCOMES. Always sums to 1.
 *
 *   the hook can foul first (below the barrier)
 *   then a hit — stroke, both guards, skill, fatigue
 *   then, given a hit: the head and the spike can drop him; the hook can
 *   take his axe
 */
export function footOdds(att, def, atkChoice, defChoice) {
  const S = FOOT_SKILL;
  const st = STROKES[atkChoice.stroke];
  const mine = GUARDS[atkChoice.guard];
  const his = GUARDS[defChoice.guard];
  const a = swordNow(att);
  const d = swordNow(def);

  const pFoul = st.foul != null ? sigmoid(st.foul + mine.foul - S.swordFoul * (a - 10)) : 0;
  const hitLogit = st.hit
    + S.swordAim * (a - 10)
    - S.guard * (d - 10)
    + mine.strike[atkChoice.stroke]
    + REACH[atkChoice.stroke][defChoice.guard]
    - S.fatigueAim * spent(att);
  const pHit = sigmoid(hitLogit);
  const clean = 1 - pFoul;
  const hit = clean * pHit;
  const out = { miss: clean * (1 - pHit), foul: pFoul, blow: 0, head: 0, disarm: 0, down: 0 };

  if (atkChoice.stroke === 'hook') {
    const pTake = sigmoid(st.take + S.swordForce * (a - 10) - S.swordResist * (d - 10) - his.stability + S.fatigueAim * spent(def));
    out.disarm = hit * pTake;
    out.miss += hit * (1 - pTake);
    return out;
  }
  const pDown = sigmoid(st.down + S.swordForce * (a - 10) - S.vigourResist * (def.vigour - 10) - his.stability + S.fatigueAim * spent(def));
  const landed = hit * (1 - pDown);
  if (st.points === 2) out.head = landed;
  else out.blow = landed;
  out.down = hit * pDown;
  return out;
}

/** The attacker's odds against a MIX of the defender's choices. */
export function expectedFoot(att, def, atkChoice, defMix, { reverse = false } = {}) {
  const out = Object.fromEntries(FOOT_OUTCOMES.map((o) => [o, 0]));
  for (const c of FOOT_CHOICES) {
    const w = defMix[c.key];
    if (!w) continue;
    const odds = reverse ? footOdds(def, att, c, atkChoice) : footOdds(att, def, atkChoice, c);
    for (const o of FOOT_OUTCOMES) out[o] += w * odds[o];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export function footSituation(self, other, bout, side) {
  const ord = ORDINANCES[bout.ord];
  const mine = bout.scores[side];
  const his = bout.scores[side === 'a' ? 'b' : 'a'];
  const rs = footRating(self);
  const ro = footRating(other);
  return {
    ahead: mine > his,
    behind: mine < his,
    level: mine === his,
    lastCourse: bout.n + 1 >= ord.exchanges,
    vsStronger: ro > rs + RATING_MARGIN,
    vsWeaker: ro < rs - RATING_MARGIN,
    grudge: !!self.grudge && other.id === 'you',
  };
}

function normalise(w) {
  const total = Object.values(w).reduce((s, v) => s + v, 0);
  const out = {};
  for (const [k, v] of Object.entries(w)) out[k] = total > 0 ? v / total : 1 / Object.keys(w).length;
  return out;
}

function shifted(stroke, guard, tells) {
  const sw = { ...stroke };
  const gw = { ...guard };
  for (const t of tells) {
    for (const [k, f] of Object.entries(t.stroke || {})) sw[k] *= f;
    for (const [k, f] of Object.entries(t.guard || {})) gw[k] *= f;
  }
  const s = normalise(sw);
  const g = normalise(gw);
  const out = {};
  for (const c of FOOT_CHOICES) out[c.key] = s[c.stroke] * g[c.guard];
  return out;
}

export function activeFootTells(style, sit) { return style.tells.filter((t) => sit[t.when]); }
const grudgeOf = (sit) => (sit.grudge ? [FOOT_GRUDGE] : []);

export function trueFootMix(style, sit) {
  return shifted(style.stroke, style.guard, [...activeFootTells(style, sit), ...grudgeOf(sit)]);
}

/** What you believe he will do: 0 the field's usual, 1 his habits, 2 habits and tells. */
export function beliefFootMix(style, sit, intel) {
  if (intel >= 2) return trueFootMix(style, sit);
  if (intel === 1) return shifted(style.stroke, style.guard, grudgeOf(sit));
  return shifted(FIELD_FOOT_HABITS.stroke, FIELD_FOOT_HABITS.guard, grudgeOf(sit));
}

function pick(mix, rng) {
  let r = rng.next();
  let last = null;
  for (const c of FOOT_CHOICES) {
    const w = mix[c.key];
    if (!(w > 0)) continue;
    last = c;
    r -= w;
    if (r < 0) return c;
  }
  return last;
}

function sample(odds, rng) {
  let r = rng.next();
  let last = 'miss';
  for (const o of FOOT_OUTCOMES) {
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

export function newFootBout(aId, bId, ord = 'articles') {
  return {
    a: aId, b: bId, ord,
    n: 0,
    scores: { a: 0, b: 0 },
    fouls: { a: 0, b: 0 },
    heads: { a: 0, b: 0 },   // head blows landed
    hurts: { a: 0, b: 0 },   // head blows taken (à outrance)
    exchanges: [],
    done: false,
    winner: null,
    how: null, // points | down | disarm | hurt | judges | baton
  };
}

const ENDS = new Set(['down', 'disarm']);

export function applyExchange(bout, cA, cB, outA, outB, coin) {
  const ord = ORDINANCES[bout.ord];
  const pts = ord.points;
  bout.n += 1;
  bout.scores.a += pts[outA];
  bout.scores.b += pts[outB];
  if (outA === 'foul') bout.fouls.a += 1;
  if (outB === 'foul') bout.fouls.b += 1;
  if (outA === 'head') { bout.heads.a += 1; bout.hurts.b += 1; }
  if (outB === 'head') { bout.heads.b += 1; bout.hurts.a += 1; }
  bout.exchanges.push({
    n: bout.n,
    a: { stroke: cA.stroke, guard: cA.guard, out: outA },
    b: { stroke: cB.stroke, guard: cB.guard, out: outB },
    scores: { ...bout.scores },
  });
  const end = (winner, how) => { bout.done = true; bout.winner = winner; bout.how = how; };
  const onPoints = (how) => {
    if (bout.scores.a !== bout.scores.b) return end(bout.scores.a > bout.scores.b ? 'a' : 'b', how);
    return end(judgesDecide(bout, coin), 'judges');
  };
  const endA = ENDS.has(outA);
  const endB = ENDS.has(outB);
  if (endA || endB) {
    if (endA && endB) return onPoints('points');
    return end(endA ? 'a' : 'b', endA ? outA : outB);
  }
  if (ord.hurtsToFall) {
    const fallA = bout.hurts.a >= ord.hurtsToFall;
    const fallB = bout.hurts.b >= ord.hurtsToFall;
    if (fallA || fallB) {
      if (fallA && fallB) return onPoints('points');
      return end(fallB ? 'a' : 'b', 'hurt');
    }
    if (bout.n >= ord.exchanges) return onPoints('baton');
    return bout;
  }
  if (bout.n >= ord.exchanges && bout.scores.a !== bout.scores.b) return onPoints('points');
  if (bout.n >= ord.exchanges + ord.tieExchanges) return onPoints('points');
  return bout;
}

/** Level at the end: fewer fouls, then more blows to the head, then the judges' own view. */
export function judgesDecide(bout, coin) {
  if (bout.fouls.a !== bout.fouls.b) return bout.fouls.a < bout.fouls.b ? 'a' : 'b';
  if (bout.heads.a !== bout.heads.b) return bout.heads.a > bout.heads.b ? 'a' : 'b';
  return coin() < 0.5 ? 'a' : 'b';
}

/** One exchange. Null choices are drawn from the man's own habits. */
export function runExchange(bout, A, B, cA, cB, rng) {
  if (bout.done) throw new Error('This combat is already decided.');
  const chA = cA || pick(trueFootMix(footStyle(A.footStyle), footSituation(A, B, bout, 'a')), rng);
  const chB = cB || pick(trueFootMix(footStyle(B.footStyle), footSituation(B, A, bout, 'b')), rng);
  const oddsA = footOdds(A, B, chA, chB);
  const oddsB = footOdds(B, A, chB, chA);
  const outA = sample(oddsA, rng);
  const outB = sample(oddsB, rng);
  applyExchange(bout, chA, chB, outA, outB, () => rng.next());
  A.fatigue = (A.fatigue || 0) + footFatigueCost(chA);
  B.fatigue = (B.fatigue || 0) + footFatigueCost(chB);
  return { choiceA: chA, choiceB: chB, outA, outB, oddsA, oddsB };
}

/** A whole combat between two men of the field. */
export function fightOut(bout, A, B, rng) {
  while (!bout.done) runExchange(bout, A, B, null, null, rng);
  return bout;
}

/** How likely a man who has you beaten, sharp axe in hand, is to finish it. */
export function noQuarter(k, grudge = false) {
  return Math.min(0.9, (NO_QUARTER[k?.temperament] ?? 0.25) + (grudge ? NO_QUARTER.grudge : 0));
}

// ---------------------------------------------------------------------------
// The squire's reckoning at the barriers
// ---------------------------------------------------------------------------

/**
 * For each of your nine choices this exchange, the chance of winning the
 * combat if you fight the rest of it well and he fights as you believe he
 * will. Exact over the ordinance; fatigue is held where it is, which is the
 * one approximation.
 */
export function reckonFoot(bout, me, him, mySide, mixAt) {
  const ord = ORDINANCES[bout.ord];
  const hisSide = mySide === 'a' ? 'b' : 'a';
  const pts = ord.points;
  const mine = {};
  const his = {};
  for (const ci of FOOT_CHOICES) {
    mine[ci.key] = {};
    his[ci.key] = {};
    for (const cj of FOOT_CHOICES) {
      mine[ci.key][cj.key] = footOdds(me, him, ci, cj);
      his[ci.key][cj.key] = footOdds(him, me, cj, ci);
    }
  }
  const decided = (diff) => (diff > 0 ? 1 : diff < 0 ? 0 : 0.5);
  const last = ord.exchanges + ord.tieExchanges;
  const memo = new Map();

  function mixFor(k, diff) {
    const fake = { ord: bout.ord, n: k, scores: { [mySide]: diff, [hisSide]: 0 } };
    return mixAt(footSituation(him, me, fake, hisSide));
  }

  function transition(k, diff, hm, hh, o1, o2) {
    const d2 = diff + pts[o1] - pts[o2];
    const e1 = ENDS.has(o1);
    const e2 = ENDS.has(o2);
    if (e1 || e2) {
      if (e1 && e2) return decided(d2);
      return e1 ? 1 : 0;
    }
    if (ord.hurtsToFall) {
      const hm2 = hm + (o2 === 'head' ? 1 : 0);
      const hh2 = hh + (o1 === 'head' ? 1 : 0);
      const fm = hm2 >= ord.hurtsToFall;
      const fh = hh2 >= ord.hurtsToFall;
      if (fm || fh) {
        if (fm && fh) return decided(d2);
        return fh ? 1 : 0;
      }
      return value(k + 1, d2, hm2, hh2);
    }
    return value(k + 1, d2, hm, hh);
  }

  function q(k, diff, hm, hh, ci, mix) {
    let v = 0;
    for (const cj of FOOT_CHOICES) {
      const w = mix[cj.key];
      if (!w) continue;
      const m = mine[ci.key][cj.key];
      const h = his[ci.key][cj.key];
      for (const o1 of FOOT_OUTCOMES) {
        const p1 = m[o1];
        if (!p1) continue;
        for (const o2 of FOOT_OUTCOMES) {
          const p2 = h[o2];
          if (!p2) continue;
          v += w * p1 * p2 * transition(k, diff, hm, hh, o1, o2);
        }
      }
    }
    return v;
  }

  function value(k, diff, hm, hh) {
    if (ord.hurtsToFall) {
      if (k >= ord.exchanges) return decided(diff);
    } else {
      if (k >= ord.exchanges && diff !== 0) return decided(diff);
      if (k >= last) return decided(diff);
    }
    const key = `${k}|${diff}|${hm}|${hh}`;
    if (memo.has(key)) return memo.get(key);
    const mix = mixFor(k, diff);
    let best = 0;
    for (const ci of FOOT_CHOICES) best = Math.max(best, q(k, diff, hm, hh, ci, mix));
    memo.set(key, best);
    return best;
  }

  const diff = bout.scores[mySide] - bout.scores[hisSide];
  const hm = bout.hurts[mySide];
  const hh = bout.hurts[hisSide];
  const mix = mixFor(bout.n, diff);
  const byChoice = {};
  let best = null;
  for (const ci of FOOT_CHOICES) {
    byChoice[ci.key] = q(bout.n, diff, hm, hh, ci, mix);
    if (!best || byChoice[ci.key] > byChoice[best.key] + 1e-12) best = ci;
  }
  return { byChoice, best, mix };
}
