// The reference player. It does not need to play WELL; it needs to play
// CONSISTENTLY, so two runs are comparable. Several policies, because the
// question the instruments ask is whether the choices in the lists matter —
// and that can only be answered by comparing a player who chooses against one
// who does not.
//
//   squire   — the squire's call every course (the best-odds rule the UI offers)
//   read     — buys the herald's read of every opponent it can afford, then the squire's call
//   shield   — shield, balanced, every course: the player who never decides
//   random   — any of the nine, uniformly

import { CHOICES, choiceByKey } from '../src/engine/joust.js';
import { squireCall } from '../src/engine/derive.js';
import {
  enterTourney, playCourse, continueTourney, rideOn, currentBout, buyHeraldRead, STAGE,
} from '../src/engine/tourney.js';

export const POLICIES = ['squire', 'read', 'shield', 'random'];

export function chooseCourse(state, policy, rng) {
  switch (policy) {
    case 'squire':
    case 'read':
      return squireCall(state);
    case 'shield':
      return choiceByKey('shield/balanced');
    case 'random':
      return rng.pick(CHOICES);
    default:
      throw new Error(`Unknown policy: ${policy}`);
  }
}

/**
 * Play the current tourney to its end. Returns counts of what actually
 * happened, so the caller can prove something did.
 */
export function playTourney(state, policy, rng) {
  const done = { entered: false, courses: 0, bouts: 0 };
  const ev = state.event;
  if (ev.stage === STAGE.ARRIVAL) {
    const r = enterTourney(state);
    if (!r.ok) return done;
    done.entered = true;
  }
  let lastBout = null;
  let guard = 0;
  while (state.event.stage !== STAGE.DONE) {
    if (++guard > 500) throw new Error('A tourney did not finish in 500 steps; the engine is stuck.');
    if (state.event.stage === STAGE.BOUT) {
      const cb = currentBout(state);
      if (cb.bout !== lastBout) {
        lastBout = cb.bout;
        done.bouts += 1;
        if (policy === 'read') buyHeraldRead(state, cb.him.id);
      }
      playCourse(state, chooseCourse(state, policy, rng));
      done.courses += 1;
    } else if (state.event.stage === STAGE.RESULT) {
      continueTourney(state);
    } else {
      throw new Error(`Unexpected stage mid-tourney: ${state.event.stage}`);
    }
  }
  return done;
}

export { rideOn };
