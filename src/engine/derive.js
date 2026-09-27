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
import { knightById, regardLabel } from './field.js';
import { ARCHETYPES } from '../data/joust.data.js';
import { GRUDGE_TELL } from '../data/field.data.js';

/** What you know of a rider, as the screen should say it. */
export function knownOf(state, riderId) {
  const k = knightById(state, riderId);
  const level = state.intel[riderId] || 0;
  const arch = ARCHETYPES.find((a) => a.id === k?.archetype);
  return {
    level,
    label: level >= 1 && arch ? arch.label : null,
    habit: level >= 1 && arch ? arch.habit : null,
    tells: level >= 2 && arch ? arch.tells.map((t) => t.text) : [],
    noTells: level >= 2 && arch && arch.tells.length === 0,
    regard: k ? k.regard : 0,
    standing: k ? regardLabel(k.regard) : null,
    memory: k ? k.memory : [],
    temperament: k ? k.temperament : null,
  };
}

function mixAtFor(state, him) {
  const intel = state.intel[him.id] || 0;
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
    intel: state.intel[him.id] || 0,
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

/** The truth, for tests. The screen never calls this. */
export function trueMixNow(state) {
  const cb = currentBout(state);
  if (!cb) return null;
  const { bout, you, him } = cb;
  return trueMix(archetype(him.archetype), situation(him, you, bout, 'b'));
}

/** Which tells hold right now: his own (with the read), and any grudge. */
export function tellsInPlay(state) {
  const cb = currentBout(state);
  if (!cb) return [];
  const sit = situation(cb.him, cb.you, cb.bout, 'b');
  const out = [];
  if (sit.grudge) out.push(GRUDGE_TELL.text);
  if ((state.intel[cb.him.id] || 0) >= 2) out.push(...activeTells(archetype(cb.him.archetype), sit).map((t) => t.text));
  return out;
}

export { CHOICES };
