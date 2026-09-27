// Shared by the test files: a finished knight, a tourney played to a point,
// and a deep scan for numbers that should never exist.

import { newGame, STATUS } from '../src/engine/state.js';
import { randomAnswers, randomName } from '../src/engine/knight.js';
import { makeRng } from '../src/engine/rng.js';
import {
  monthOptions, rideTo, enter, answer, passMonth, ride, onward, leave, PHASE,
  rideDay, meleeTurn, ransom, exchange, footOnward, mercy,
} from '../src/engine/season.js';
import { squireCall, footSquireCall } from '../src/engine/derive.js';
import { STAGE } from '../src/engine/tourney.js';
import { squireCounsel } from '../src/engine/melee.js';
import { cardById, holds } from '../src/engine/cards.js';

export function knight(seed = 1, answers = null) {
  const rng = makeRng(seed * 131 + 7);
  return newGame({ seed, answers: answers || randomAnswers(rng), name: randomName(rng) });
}

/** Answer whatever card is waiting with its first open choice. */
export function answerFirst(state) {
  const inst = state.pending.inst;
  const card = cardById(inst.id);
  const i = card.choices.findIndex((ch) => holds(state, ch.when, inst.ctx));
  return answer(state, i);
}

/**
 * Ride to the first tourney you can, this month or later, and stop when your
 * first bout is in the lists. Returns false if the year ran out.
 */
export function toLists(state, { tier = null, rich = true } = {}) {
  if (rich) state.purse = Math.max(state.purse, 200 * 240);
  if (tier === 'high' || tier === 'grand') { state.renown = Math.max(state.renown, 40); }
  for (let guard = 0; guard < 80; guard++) {
    if (state.pending) { answerFirst(state); continue; }
    if (state.event) {
      // A pas at a bridge on the way: ride it out and go on.
      if (state.event.tier === 'pas') {
        if (state.event.stage === STAGE.BOUT) ride(state, squireCall(state));
        else if (state.event.stage === STAGE.RESULT) onward(state);
        else if (state.event.stage === STAGE.DONE) leave(state);
        continue;
      }
      if (state.event.stage === STAGE.ARRIVAL) { enter(state); continue; }
      if (state.event.stage === STAGE.BOUT) return true;
      return false;
    }
    if (state.phase !== PHASE.MONTH || state.status !== STATUS.ACTIVE) return false;
    const opt = monthOptions(state).find((o) => o.open && (!tier || o.cal.tier === tier));
    if (opt) rideTo(state, opt.cal.id);
    else passMonth(state);
  }
  return false;
}

/** Every path in an object whose value is NaN or an infinity. */
export function badNumbers(obj, path = '$', out = []) {
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) out.push(`${path} = ${obj}`);
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => badNumbers(v, `${path}[${i}]`, out));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) badNumbers(v, `${path}.${k}`, out);
  }
  return out;
}

/**
 * One step through the days after the jousts, the way a careful player takes
 * them: ride in every day, follow the squire's counsel in the mêlée, ask full
 * ransom, fight at the barriers as the squire calls it, and spare a man at
 * your mercy. Returns false if there was nothing of that kind to do.
 */
export function dayStep(s) {
  const ev = s.event;
  switch (ev?.stage) {
    case STAGE.DAY: rideDay(s, { men: 0 }); return true;
    case STAGE.MELEE: {
      const m = ev.melee;
      const c = m.openings.length ? squireCounsel(m, ev.tier, s.renown) : { index: 0, action: 'recet' };
      meleeTurn(s, c.index, c.action);
      return true;
    }
    case STAGE.RANSOM: ransom(s, 'full'); return true;
    case STAGE.FOOT: exchange(s, footSquireCall(s)); return true;
    case STAGE.FOOT_RESULT:
      if (ev.foot.mercy === 'pending') mercy(s, true);
      footOnward(s);
      return true;
    default: return false;
  }
}
