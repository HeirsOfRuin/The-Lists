// The reference player. It does not need to play WELL; it needs to play
// CONSISTENTLY, so two runs are comparable, and it must touch every system a
// player can: the calendar, the road, the feast, the lists, the moments,
// winter, the squire, the retinue, the fair.
//
// Joust policies (for the curve and for careers):
//   squire   — the squire's call every course (the best-odds rule the UI offers)
//   read     — buys the herald's read of every opponent it can afford, then the squire's call
//   shield   — shield, balanced, every course: the player who never decides
//   random   — any of the nine, uniformly

import { CHOICES, choiceByKey } from '../src/engine/joust.js';
import { squireCall } from '../src/engine/derive.js';
import { currentBout, buyHeraldRead, canEnter, STAGE } from '../src/engine/tourney.js';
import {
  monthOptions, rideTo, enter, withdraw, ride, onward, leave, train, serve, answer, isFree, PHASE,
  setFocus, setSquireFocus, takeSquire, dubSquire, hire, buyHarness, buyHorse, keepBorrowedHorse,
  borrowedHorsePrice, horseTradeIn, endWinter,
} from '../src/engine/season.js';
import { cardById, holds } from '../src/engine/cards.js';
import { TIER_ORDER } from '../src/data/tourney.data.js';
import { HARNESS, SQUIRE } from '../src/data/household.data.js';

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

// A crude reading of what an answer is worth, from its effects. Consistent,
// which is all a reference player needs to be.
function worth(e = {}) {
  let v = 0;
  v += (e.renown || 0) * 2 + (e.honour || 0) * 1.5 + (e.purse || 0) / 240;
  for (const x of Object.values(e.favour || {})) v += x * 0.3;
  for (const x of Object.values(e.regard || {})) v += x * 0.15;
  if (e.intelField) v += e.intelField * 0.5;
  if (e.intel) v += 0.5;
  if (e.wound) v -= 2;
  if (e.fatigue) v -= e.fatigue * 0.5;
  if (e.travelDays) v -= e.travelDays * 0.3;
  if (e.largesse) v -= e.largesse * 10;
  return v;
}

export function answerPolicy(state) {
  const inst = state.pending.inst;
  const card = cardById(inst.id);
  let best = null;
  card.choices.forEach((ch, i) => {
    if (!holds(state, ch.when, inst.ctx)) return;
    const v = ch.check ? 0.5 * worth(ch.success.effects) + 0.5 * worth(ch.failure.effects) : worth(ch.effects);
    if (!best || v > best.v) best = { i, v };
  });
  return best.i;
}

/** Winter upkeep the bot keeps in hand before riding anywhere. */
function reserve(state) {
  return 10 * 240 + state.retinue.length * 480;
}

function chooseMonth(state) {
  // Short of next winter's keep: earn it first.
  if (state.purse < reserve(state) * 0.6) return { kind: 'serve' };
  const opts = monthOptions(state).filter((o) => o.open && state.purse - o.total >= reserve(state) * 0.4);
  if (opts.length) {
    // Highest tier the knight has a fair chance in: never local once famous.
    opts.sort((a, b) => TIER_ORDER.indexOf(b.cal.tier) - TIER_ORDER.indexOf(a.cal.tier));
    const pick = opts.find((o) => !(o.cal.tier === 'local' && state.renown >= 30)) || null;
    if (pick) return { kind: 'ride', id: pick.cal.id };
  }
  const k = state.knight.stats;
  return { kind: 'train', skill: k.lance <= k.seat ? 'lance' : 'seat' };
}

function winter(state) {
  const w = state.winter;
  const k = state.knight.stats;
  setFocus(state, k.lance <= k.seat ? 'lance' : 'seat');
  if (state.squire) {
    setSquireFocus(state, state.squire.lance <= state.squire.seat ? 'lance' : 'seat');
    if (state.squire.years >= SQUIRE.knightAt) dubSquire(state);
  } else if (w.candidates.length) {
    const i = w.candidates.findIndex((c) => c.origin === 'lordsSon');
    takeSquire(state, Math.max(0, i));
  }
  if (state.horse.borrowed && state.purse > borrowedHorsePrice(state) + reserve(state)) keepBorrowedHorse(state);
  if (state.renown >= 15 && !state.retinue.includes('groom') && state.purse > 20 * 240) hire(state, 'groom');
  if (state.renown >= 30 && !state.retinue.includes('armourer') && state.purse > 30 * 240) hire(state, 'armourer');
  const better = HARNESS.market.find((h) => h.quality > state.harness.quality && state.purse - h.price > reserve(state) * 2);
  if (better) buyHarness(state, better.id);
  const horse = [...w.horses].reverse().find((h) => h.quality > state.horse.quality + 1
    && state.purse + horseTradeIn(state) - h.price > reserve(state) * 2);
  if (horse) buyHorse(state, horse.id);
  endWinter(state);
}

/**
 * Take one step of a career: whatever is in front of the knight. Returns a
 * word for what was done, so the runner can count it.
 */
export function step(state, policy, rng) {
  if (state.pending) { answer(state, answerPolicy(state)); return 'card'; }
  if (state.phase === PHASE.WINTER) { winter(state); return 'winter'; }
  const ev = state.event;
  if (ev) {
    switch (ev.stage) {
      case STAGE.ARRIVAL:
        if (canEnter(state)) { enter(state); return 'enter'; }
        withdraw(state); return 'withdraw';
      case STAGE.BOUT: {
        const cb = currentBout(state);
        if (policy === 'read' && cb.bout.course === 0) buyHeraldRead(state, cb.him.id);
        ride(state, chooseCourse(state, policy, rng));
        return 'course';
      }
      case STAGE.RESULT: onward(state); return 'onward';
      case STAGE.DONE: leave(state); return 'leave';
      default: throw new Error(`The bot does not know what to do at stage ${ev.stage}`);
    }
  }
  if (isFree(state)) {
    const m = chooseMonth(state);
    if (m.kind === 'ride') { const r = rideTo(state, m.id); if (r.ok) return 'ride'; }
    if (m.kind === 'serve' && serve(state).ok) return 'serve';
    train(state, m.kind === 'train' ? m.skill : 'lance');
    return 'train';
  }
  throw new Error('The bot is stuck: nothing in hand, and not free.');
}
