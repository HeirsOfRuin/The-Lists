// THE single source for every number the lists screen shows.
//
// The preview odds are expectedStrike() over what you believe of your man, and
// expectedStrike() is strikeOdds() — the resolver's own function — weighted by
// that belief. When you hold the herald's read, belief IS his true mix, and the
// preview is exactly the chance of each outcome when the course is run. The
// test suite holds it to that.

import {
  expectedStrike, reckonBout, beliefMix, trueMix, situation, archetype, activeTells, CHOICES,
} from './joust.js';
import { currentBout } from './tourney.js';
import { ARCHETYPES } from '../data/joust.data.js';

/** What you know of a rider, as the screen should say it. */
export function knownOf(state, riderId) {
  const ev = state.event;
  const r = ev.riders[riderId];
  const level = ev.intel[riderId] || 0;
  const arch = ARCHETYPES.find((a) => a.id === r.archetype);
  return {
    level,
    label: level >= 1 ? arch.label : null,
    habit: level >= 1 ? arch.habit : null,
    tells: level >= 2 ? arch.tells.map((t) => t.text) : [],
    // A rider with no tells, fully read, is worth saying so about.
    noTells: level >= 2 && arch.tells.length === 0,
  };
}

/** Your belief about your current opponent's choice, in a given situation. */
function mixAtFor(state, him) {
  const intel = state.event.intel[him.id] || 0;
  const arch = archetype(him.archetype);
  return (sit) => beliefMix(arch, sit, intel);
}

/**
 * The odds for one choice this course: your lance, his lance at you, and the
 * squire's reckoning of the bout. `reckoning` may be passed in so a screen
 * showing all nine choices computes it once.
 */
export function coursePreview(state, choice, reckoning = null) {
  const cb = currentBout(state);
  if (!cb) return null;
  const { bout, you, him } = cb;
  const mixAt = mixAtFor(state, him);
  const belief = mixAt(situation(him, you, bout, 'b'));
  const r = reckoning || reckonBout(bout, you, him, 'a', mixAt);
  return {
    mine: expectedStrike(you, him, choice, belief),
    his: expectedStrike(you, him, choice, belief, { reverse: true }),
    win: r.byChoice[choice.key],
    intel: state.event.intel[him.id] || 0,
  };
}

/** The squire's reckoning for all nine choices. */
export function reckonNow(state) {
  const cb = currentBout(state);
  if (!cb) return null;
  return reckonBout(cb.bout, cb.you, cb.him, 'a', mixAtFor(state, cb.him));
}

/** The squire's call: the choice he reckons most likely to carry the bout. */
export function squireCall(state) {
  const r = reckonNow(state);
  return r ? r.best : null;
}

/**
 * The truth, for tests: what your opponent will actually do this course. The
 * screen never calls this — you see only what you know.
 */
export function trueMixNow(state) {
  const cb = currentBout(state);
  if (!cb) return null;
  const { bout, you, him } = cb;
  return trueMix(archetype(him.archetype), situation(him, you, bout, 'b'));
}

/** Which of his tells hold right now — shown only if you have the herald's read. */
export function tellsInPlay(state) {
  const cb = currentBout(state);
  if (!cb) return [];
  if ((state.event.intel[cb.him.id] || 0) < 2) return [];
  const sit = situation(cb.him, cb.you, cb.bout, 'b');
  return activeTells(archetype(cb.him.archetype), sit).map((t) => t.text);
}

export { CHOICES };
