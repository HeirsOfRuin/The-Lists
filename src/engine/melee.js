// The mêlée: two sides in the open field, three passes, prisoners and ransom.
//
// ONE DERIVATION again. engageOdds() is the only function that turns two
// knights, their men and an action into probabilities; the buttons show it and
// the resolver rolls it.
//
// The decision is not whether you can beat a man, which the odds tell you, but
// which man, and whether to: a famous knight is a rich ransom and a strong
// arm; a blown one alone is safe and cheap; a comrade in the enemy's hands is
// worth more to your name than to your purse; and every engagement costs wind
// that the last pass will want. A knight who overreaches is taken himself,
// and pays.
//
// The mêlée is a plain object (`m`, kept on the tourney as ev.melee). This
// module changes it and nothing else; the tourney pays and credits.

import {
  MELEE, POWER, LOGIT_PER_POWER, ACTIONS, MEN_SHIELD, MELEE_HURT, RANSOM, MELEE_RENOWN,
} from '../data/melee.data.js';

const sigmoid = (x) => 1 / (1 + Math.exp(-x));
export const YOU = 'you';
export const OUTCOMES = ['win', 'repulsed', 'manTaken', 'youTaken'];

// ---------------------------------------------------------------------------
// Weight in the press
// ---------------------------------------------------------------------------

export function meleeThreshold(c) { return c.vigour * POWER.thresholdPerVigour; }

export function blown(c) { return (c.fatigue || 0) > meleeThreshold(c); }

/** A knight's weight in the press, with the men riding with him. */
export function meleePower(c, men = 0) {
  const P = POWER;
  let p = P.sword * c.sword + P.seat * c.seat + P.horse * c.horse.quality + P.man * men;
  p -= P.fatiguePer * Math.max(0, (c.fatigue || 0) - meleeThreshold(c));
  if (c.wound === 'light') p -= P.wound;
  return p;
}

/**
 * THE odds of an engagement: `me` with `myMen` doing `action` to `him` with
 * `hisMen`. Sums to 1 over OUTCOMES. A capture that goes against you falls on
 * one of your men instead, in proportion to how many ride with you.
 */
export function engageOdds(me, myMen, him, hisMen, action, edge = 0) {
  const A = ACTIONS[action];
  const x = LOGIT_PER_POWER * (meleePower(me, myMen) - meleePower(him, hisMen)) + A.edge + edge;
  const win = sigmoid(x);
  const lose = 1 - win;
  const caught = lose * A.overreach;
  const shield = Math.min(MEN_SHIELD.max, MEN_SHIELD.perMan * myMen);
  return { win, repulsed: lose - caught, manTaken: caught * shield, youTaken: caught * (1 - shield), hurt: MELEE_HURT.chance };
}

export function ransomOf(tier, renown) {
  return (RANSOM.base[tier] || RANSOM.base.regional) + Math.round(renown) * RANSOM.perRenown;
}

export function fieldMenFor(renown) {
  for (const r of MELEE.fieldMen) if (renown >= r.renown) return r.men;
  return 0;
}

// ---------------------------------------------------------------------------
// The field
// ---------------------------------------------------------------------------

/**
 * A mêlée from two sides of riders. `riders` is { id: rider } and includes
 * you; `sides` is { holders: [...ids], comers: [...ids] }; `yourSide` names
 * yours; `men` is how many of your own ride with you.
 */
export function newMelee({ tier, riders, sides, yourSide, men }) {
  const m = {
    tier, pass: 0, yourSide,
    sides,
    riders,
    men: {},
    out: {},
    held: {},
    score: {},
    openings: [],
    log: [],
    prisoners: [],
    beaten: [],
    rescued: [],
    yourMen: men,
    yourMenTaken: 0,
    youTaken: false,
    youHurt: null,
    done: false,
    result: null,
  };
  for (const id of Object.keys(riders)) {
    m.men[id] = id === YOU ? men : fieldMenFor(riders[id].renown || 0);
    m.score[id] = 0;
  }
  return m;
}

export function enemySide(m) { return m.yourSide === 'holders' ? 'comers' : 'holders'; }
export function sideOf(m, id) { return m.sides.holders.includes(id) ? 'holders' : 'comers'; }
export function standing(m, id) { return !m.out[id]; }

/**
 * What you can do this pass: men of the other side, one of them in trouble,
 * and any comrade of yours to bring out.
 */
export function openingsFor(m, rng) {
  const foes = m.sides[enemySide(m)].filter((id) => standing(m, id));
  // The man in trouble is the weakest of them in the press just now.
  const weakest = [...foes].sort((a, b) => meleePower(m.riders[a], m.men[a]) - meleePower(m.riders[b], m.men[b]))[0];
  const rest = rng.shuffle(foes.filter((id) => id !== weakest)).slice(0, MELEE.openings - 1);
  const out = rest.map((id) => ({ kind: 'engage', id, men: m.men[id] }));
  if (weakest) out.push({ kind: 'engage', id: weakest, men: 0, straggler: true, edge: MELEE.straggler });
  // A knight of your side held by a man still in the field can be brought out.
  for (const [prisoner, captor] of Object.entries(m.held)) {
    if (sideOf(m, prisoner) !== m.yourSide || !standing(m, captor)) continue;
    out.push({ kind: 'rescue', id: captor, comrade: prisoner, men: m.men[captor] + 1 });
    break;
  }
  return out;
}

/** The odds on an opening, for one action: what the button shows. */
export function openingOdds(m, opening, action) {
  const me = m.riders[YOU];
  const him = m.riders[opening.id];
  return engageOdds(me, m.men[YOU], him, opening.men, action, opening.edge || 0);
}

function sample(odds, rng) {
  let r = rng.next();
  for (const o of OUTCOMES) {
    r -= odds[o];
    if (r < 0) return o;
  }
  return OUTCOMES[OUTCOMES.length - 1];
}

function takeOut(m, id, how, by) {
  m.out[id] = { how, by, pass: m.pass };
  if (how === 'taken') m.held[id] = by;
}

// ---------------------------------------------------------------------------
// A pass
// ---------------------------------------------------------------------------

/**
 * Your part in this pass. `index` picks the opening (ignored for the recet).
 * Returns what happened, in a record the screen and the herald both read.
 */
export function yourPass(m, index, action, rng) {
  const me = m.riders[YOU];
  const rec = { pass: m.pass, action, outcome: null, target: null, comrade: null, hurt: null };
  if (action === 'recet') {
    me.fatigue = Math.max(0, (me.fatigue || 0) - ACTIONS.recet.rest);
    rec.outcome = 'rested';
    return rec;
  }
  const op = m.openings[index];
  if (!op) throw new Error('No such opening.');
  if ((action === 'rescue') !== (op.kind === 'rescue')) throw new Error('That is not what that opening offers.');
  const odds = openingOdds(m, op, action);
  const outcome = sample(odds, rng);
  const him = m.riders[op.id];
  rec.target = op.id;
  rec.outcome = outcome;
  rec.comrade = op.comrade || null;
  me.fatigue = (me.fatigue || 0) + ACTIONS[action].fatigue;
  him.fatigue = (him.fatigue || 0) + 1.5;
  if (outcome === 'win') {
    if (action === 'take') { takeOut(m, op.id, 'taken', YOU); m.prisoners.push(op.id); m.score[YOU] += 1; }
    if (action === 'strike') { takeOut(m, op.id, 'beaten', YOU); m.beaten.push(op.id); m.score[YOU] += 1; }
    if (action === 'rescue') { delete m.out[op.comrade]; delete m.held[op.comrade]; m.rescued.push(op.comrade); m.score[YOU] += 1; }
  } else if (outcome === 'manTaken') {
    m.men[YOU] -= 1;
    m.yourMenTaken += 1;
  } else if (outcome === 'youTaken') {
    takeOut(m, YOU, 'taken', op.id);
    m.youTaken = true;
    m.score[op.id] += 1;
  }
  // A wound, rolled after: a separate chance, shown on the button.
  if (rng.next() < odds.hurt) {
    const serious = rng.next() < MELEE_HURT.seriousShare;
    rec.hurt = serious ? 'serious' : 'light';
    m.youHurt = rec.hurt;
    me.wound = serious ? 'serious' : (me.wound || 'light');
    if (serious && !m.out[YOU]) takeOut(m, YOU, 'hurt', null);
  }
  return rec;
}

/** Everyone else's part in the pass: pairs across the field, each trying to take the other. */
export function fieldPass(m, rng, engaged = []) {
  const busy = new Set(engaged);
  const free = (side) => rng.shuffle(m.sides[side].filter((id) => id !== YOU && standing(m, id) && !busy.has(id)));
  const H = free('holders');
  const C = free('comers');
  const n = Math.min(H.length, C.length);
  for (let i = 0; i < n; i++) {
    const [a, b] = rng.next() < 0.5 ? [H[i], C[i]] : [C[i], H[i]];
    const A = m.riders[a];
    const B = m.riders[b];
    const odds = engageOdds(A, m.men[a], B, m.men[b], 'take');
    const o = sample(odds, rng);
    A.fatigue = (A.fatigue || 0) + ACTIONS.take.fatigue;
    B.fatigue = (B.fatigue || 0) + 1.5;
    if (o === 'win') { takeOut(m, b, 'taken', a); m.score[a] += 1; }
    else if (o === 'manTaken') m.men[a] = Math.max(0, m.men[a] - 1);
    else if (o === 'youTaken') { takeOut(m, a, 'taken', b); m.score[b] += 1; }
  }
  // A breath between passes for those who were not in it.
  for (const id of Object.keys(m.riders)) {
    if (standing(m, id) && id !== YOU && !busy.has(id) && !(H.slice(0, n).includes(id) || C.slice(0, n).includes(id))) {
      m.riders[id].fatigue = Math.max(0, m.riders[id].fatigue - 1);
    }
  }
}

/** Close the pass: on to the next, or the end of the day. */
export function nextPass(m) {
  m.pass += 1;
  if (m.pass >= MELEE.passes.length) m.done = true;
  return m.done;
}

/** Which side carried the day, and who was the best of it. */
export function meleeResult(m) {
  const outOf = (side) => m.sides[side].filter((id) => m.out[id]).length;
  const holders = outOf('holders');
  const comers = outOf('comers');
  const winner = holders < comers ? 'holders' : comers < holders ? 'comers' : null;
  let best = null;
  for (const [id, s] of Object.entries(m.score)) {
    if (id === YOU) continue;
    if (!best || s > m.score[best] || (s === m.score[best] && (m.riders[id].renown || 0) > (m.riders[best].renown || 0))) best = id;
  }
  const yours = m.score[YOU];
  const prizeYours = yours >= 3 && yours > (best ? m.score[best] : 0);
  return {
    winner, out: { holders, comers },
    yourSideWon: winner === m.yourSide,
    prize: prizeYours ? YOU : best && m.score[best] > 0 ? best : null,
    renown: yourRenown(m, winner),
  };
}

function yourRenown(m, winner) {
  const R = MELEE_RENOWN;
  let r = m.prisoners.length * R.take + m.beaten.length * R.strike + m.rescued.length * R.rescue;
  if (winner === m.yourSide) r += R.won;
  return r;
}

// ---------------------------------------------------------------------------
// The squire's counsel
// ---------------------------------------------------------------------------

// What a point of renown is worth, in pence, to the squire weighing it.
const RENOWN_PENCE = 60;

/**
 * Your squire's counsel for this pass: the opening and action with the best
 * expected return, ransoms against the risk of paying your own, or the recet
 * when you are blown and nothing is worth it. Reads the same odds the buttons
 * show; it is advice, and the choice is yours.
 */
export function squireCounsel(m, tier, myRenown) {
  const me = m.riders[YOU];
  const myRansom = ransomOf(tier, myRenown);
  const passesLeft = MELEE.passes.length - m.pass;
  let best = { index: 0, action: 'recet', v: blown(me) ? 40 : -1 };
  m.openings.forEach((op, i) => {
    const acts = op.kind === 'rescue' ? ['rescue'] : ['take', 'strike'];
    for (const action of acts) {
      const o = openingOdds(m, op, action);
      const gain = action === 'take' ? ransomOf(tier, m.riders[op.id].renown || 0) + MELEE_RENOWN.take * RENOWN_PENCE
        : action === 'strike' ? MELEE_RENOWN.strike * RENOWN_PENCE
          : MELEE_RENOWN.rescue * RENOWN_PENCE + 120;
      const v = o.win * gain - o.youTaken * (myRansom + passesLeft * RENOWN_PENCE) - o.manTaken * RANSOM.man;
      if (v > best.v) best = { index: i, action, v };
    }
  });
  return best;
}
