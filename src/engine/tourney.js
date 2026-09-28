// A tourney: the road, arrival, the eve feast, the rounds, the prizes, and the
// reckoning. Every tier runs through this one module — a four-knight joust on
// a village green, the King's sixteen, and a single pas at a bridge.
//
// Everything the event does is written into `state.event`, and the event's
// ledger IS the account the player reads at the end. The purse moves only
// through charge() below while an event is under way, and every charge writes
// a ledger line, so the purse and the ledger cannot disagree.

import { streamFor } from './rng.js';
import { newBout, runCourse, recovery } from './joust.js';
import { fullName, driftTrait } from './knight.js';
import { heraldEntry } from './herald.js';
import { route } from './calendar.js';
import {
  pickField, riderFrom, knightById, adjustRegard, reactionFor, creditField, monthIndex,
} from './field.js';
import { conductOf, targetBeaten, clearMaster, clampHonour } from './court.js';
import { creditBalance, sideOf, grantManor } from './realm.js';
import { LANDS } from '../data/realm.data.js';
import { newFootBout, runExchange, fightOut, noQuarter } from './foot.js';
import {
  newMelee, openingsFor, yourPass, fieldPass, nextPass, meleeResult, ransomOf,
} from './melee.js';
import { MELEE, RANSOM, MELEE_PRIZE, MELEE_PRIZE_LABELS, MELEE_RENOWN, RANSOM_TERMS, TAKEN_REGARD } from '../data/melee.data.js';
import { BARRIERS, OVERNIGHT } from '../data/tourney.data.js';
import { visit, learn, noteChampion } from './lore.js';
import { TIERS, WOUNDS, HERALD_READ, LORE_KNOWS_HABITS, TIER_ORDER } from '../data/tourney.data.js';
import { TOWNS } from '../data/world.data.js';
import { TRAVEL, HARNESS, SQUIRE, TRAINING, RETINUE_EXPECTED, CONDITION } from '../data/household.data.js';

export const YOU = 'you';
export const STAGE = {
  TRAVEL: 'travel',   // on the road; a road card may be waiting
  ARRIVAL: 'arrival', // arrived; costs shown, not yet paid
  FEAST: 'feast',     // paid; the eve feast
  BOUT: 'bout',       // your bout is in the lists
  RESULT: 'result',   // your bout is decided; its result is on screen
  DAY: 'day',         // a new day of the tourney: ride in it, or stand down
  MELEE: 'melee',     // a pass of the mêlée: choose your man
  RANSOM: 'ransom',   // the mêlée is over: what to ask of your prisoners
  FOOT: 'foot',       // an exchange at the barriers
  FOOT_RESULT: 'footResult', // a combat at the barriers is decided
  DONE: 'done',       // prizes given, the herald has written
};

export const DAY_LABEL = { joust: 'the jousts', melee: 'the tourney in the field', barriers: 'the barriers' };

// ---------------------------------------------------------------------------
// The road and arrival
// ---------------------------------------------------------------------------

/** Mouths to feed on the road: you, your squire, your retinue. */
export function followers(state) {
  return (state.squire ? 1 : 0) + state.retinue.length;
}
export function travelPerDay(state) {
  return TRAVEL.knight + TRAVEL.perFollower * followers(state);
}
export function travelCost(state, days) {
  return days * travelPerDay(state);
}
export function entryCost(tierId) {
  return Object.values(TIERS[tierId].costs).reduce((s, v) => s + v, 0);
}

/** Your horse as he will ride today: his quality, less what a hard season has taken. */
export function horseOnTheDay(state) {
  const c = state.horse.condition ?? CONDITION.max;
  return Math.max(1, state.horse.quality - Math.max(0, CONDITION.soundAt - c));
}

export function playerRider(state) {
  const k = state.knight;
  const q = state.harness.quality;
  return {
    id: YOU,
    given: k.given, house: k.house,
    name: fullName(k),
    lance: k.stats.lance,
    seat: k.stats.seat,
    vigour: k.stats.vigour,
    horse: { quality: horseOnTheDay(state), temper: state.horse.temper },
    renown: state.renown,
    arms: state.arms,
    sword: k.stats.sword,
    footStyle: 'schooled',
    fatigue: 0,
    wound: null,
    woundMult: Math.max(0.35, 1 - HARNESS.woundPerPoint * (q - 9)) * (state.retinue.includes('armourer') ? 0.85 : 1),
    groom: state.retinue.includes('groom'),
  };
}

/**
 * Set out for a tourney. The field is drawn now; nothing but the road is paid.
 * `opts.riders` fixes the field (the pas at a bridge).
 */
export function newTourney(state, cal, opts = {}) {
  state.eventSerial = (state.eventSerial || 0) + 1;
  const serial = state.eventSerial;
  const tier = TIERS[cal.tier];
  const rng = streamFor(state.seed, cal.year, `tourney:${cal.id}`);

  const riders = { [YOU]: playerRider(state) };
  const holder = cal.tier === 'greatpas' ? greatPasHolder(state, cal) : null;
  const fixed = opts.riders || (holder ? [holder.id] : null);
  const field = fixed
    ? fixed.map((id) => knightById(state, id))
    : pickField(state, cal, tier.entrants - 1, new Set(), rng);
  // Once you know it was his lance at Ambry Cross, he will not be seen
  // avoiding you: he rides where you ride.
  const culprit = state.story?.culprit && !state.flags.includes('masterCleared') ? knightById(state, state.story.culprit) : null;
  if (!fixed && culprit && culprit.active && !field.includes(culprit) && culprit.injuredUntil <= monthIndex(cal.year, cal.month)) {
    field[field.length - 1] = culprit;
  }
  for (const k of field) riders[k.id] = riderFrom(k);

  // The draw: the two best-known riders are kept apart; the rest by lot.
  const ids = Object.keys(riders);
  const bySeed = [...ids].sort((x, y) => riders[y].renown - riders[x].renown || (x < y ? -1 : 1));
  const [s1, s2] = bySeed;
  const rest = rng.shuffle(ids.filter((id) => id !== s1 && id !== s2));
  const slots = ids.length === 2 ? [s1, s2] : [s1, ...rest, s2];
  const first = [];
  for (let i = 0; i < slots.length; i += 2) first.push(pairing(slots[i], slots[i + 1]));

  const days = opts.from ? route(opts.from, cal.town).days : 0;
  const ev = {
    serial,
    calId: cal.id,
    name: cal.name,
    tier: cal.tier,
    year: cal.year,
    month: cal.month,
    feast: cal.feast,
    town: cal.town,
    province: TOWNS[cal.town].province,
    host: holder ? { ...cal.host, name: holder.name } : cal.host,
    from: opts.from || null,
    travelDays: days,
    riders,
    rounds: [first],
    round: 0,
    stage: STAGE.TRAVEL,
    current: null,
    heraldRead: {},
    withdrawn: {},
    ledger: [],
    notes: [],
    reactions: [],
    vows: [],
    wager: null,
    token: false,
    lastCourse: null,
    placing: null,
    champion: null,
    days: [...(tier.days || ['joust'])],
    day: 0,
    dayResults: {},
    jousted: null,
    melee: null,
    foot: null,
    touched: 0,
  };
  return ev;
}

/** The Great Pas is held by the first lance of the Roll who is fit to hold it. */
export function greatPasHolder(state, cal) {
  const now = monthIndex(cal.year, cal.month);
  return [...state.roster.knights]
    .filter((k) => k.active && k.injuredUntil <= now)
    .sort((a, b) => b.renown - a.renown || (a.id < b.id ? -1 : 1))[0];
}

function pairing(x, y) {
  // You always ride as side 'a' in your own bouts.
  if (y === YOU) return { a: y, b: x, bout: null, winner: null };
  return { a: x, b: y, bout: null, winner: null };
}

/** Money in or out of the purse during an event. The only place it changes. */
export function charge(state, label, amount) {
  if (!amount) return;
  state.purse += amount;
  state.event.ledger.push({ label, amount });
}

/** Pay for the road, and tire on it. */
export function takeRoad(state, extraDays = 0) {
  const ev = state.event;
  const days = extraDays || ev.travelDays;
  if (!days) return;
  const label = extraDays
    ? `${extraDays} more day${extraDays === 1 ? '' : 's'} on the road`
    : `The road from ${TOWNS[ev.from].name}, ${days} day${days === 1 ? '' : 's'}`;
  charge(state, label, -travelCost(state, days));
  if (extraDays) ev.travelDays += extraDays;
  const over = ev.travelDays - TRAVEL.tiredAfter;
  if (!extraDays && over > 0) ev.riders[YOU].fatigue += over * 0.5;
}

/** Arrive: who you know in the field, and whether you came attended enough. */
export function arrive(state) {
  const ev = state.event;
  ev.stage = STAGE.ARRIVAL;
  ev.honourStart = state.honour;
  ev.renownStart = state.renown;
  state.location = ev.town;
  visit(state, ev.town);
  if (ev.tier === 'high' || ev.tier === 'grand') learn(state, 'helmshow');
  if (ev.tier === 'grand') learn(state, 'grand');
  if (ev.tier === 'greatpas' || ev.tier === 'pas' || ev.tier === 'trial') learn(state, ev.tier);
  const field = Object.keys(ev.riders).filter((id) => id !== YOU);
  if (state.knight.stats.lore >= LORE_KNOWS_HABITS || state.retinue.includes('pursuivant')) {
    for (const id of field) state.intel[id] = Math.max(state.intel[id] || 0, 1);
  }
  // Friends in the field tell you what they know.
  for (const id of field) {
    const k = knightById(state, id);
    if (!k || k.regard < 5) continue;
    const unknown = field.filter((x) => x !== id && !(state.intel[x] > 0));
    const told = unknown.slice(0, 2);
    for (const x of told) state.intel[x] = 1;
    if (told.length) ev.notes.push(`${k.name}, your friend, tells you how ${told.map((x) => ev.riders[x].name).join(' and ')} ride.`);
  }
  if (TIERS[ev.tier].retinueExpected) {
    const expected = expectedRetinue(state.renown);
    if (state.retinue.length < expected) {
      state.honour -= 1;
      clampHonour(state);
      ev.notes.push(`A knight of your renown is expected with ${expected} in his retinue. You came with ${state.retinue.length}, and it was noticed. Honour −1.`);
    }
  }
}

export function expectedRetinue(renown) {
  let n = 0;
  for (const r of RETINUE_EXPECTED) if (renown >= r.renown) n = r.size;
  return n;
}

export function canEnter(state) {
  return state.purse >= entryCost(state.event.tier);
}

const COST_LABELS = {
  entry: 'Entry to the heralds’ roll',
  lodging: 'Lodging',
  stabling: 'Stabling and the farrier',
  largesse: 'Largesse to the heralds',
};

/** Pay to ride. The eve feast follows (the flow layer draws its card). */
export function payEntry(state) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.ARRIVAL) return { ok: false, reason: 'There is no tourney waiting to be entered.' };
  if (!canEnter(state)) return { ok: false, reason: 'You cannot pay to ride.' };
  for (const [k, v] of Object.entries(TIERS[ev.tier].costs)) if (v) charge(state, COST_LABELS[k], -v);
  ev.stage = STAGE.FEAST;
  return { ok: true };
}

/** What the herald's read of a rider costs you. */
export function heraldReadCost(state) {
  const h = HERALD_READ;
  const cost = Math.max(h.min, h.base - h.perCourtesy * (state.knight.stats.courtesy - 8));
  // A knight without reproach pays the heralds half.
  return conductOf(state.honour).id === 'spotless' ? Math.max(h.min, Math.round(cost / 2)) : cost;
}

export function buyHeraldRead(state, riderId) {
  const ev = state.event;
  const r = ev && (ev.riders[riderId] || ev.foot?.riders[riderId]);
  if (!ev || riderId === YOU || !r) return { ok: false, reason: 'No such rider.' };
  if ((state.intel[riderId] || 0) >= 2) return { ok: false, reason: 'You already have the herald’s read of him.' };
  const cost = heraldReadCost(state);
  if (state.purse < cost) return { ok: false, reason: 'You cannot spare the coin.' };
  charge(state, `The herald’s read of ${r.name}`, -cost);
  state.intel[riderId] = 2;
  ev.heraldRead[riderId] = true;
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The rounds
// ---------------------------------------------------------------------------

/** "the first round", "the last four", "the final" — by riders left in it. */
export function roundName(ev, r) {
  const left = Object.keys(ev.riders).length / Math.pow(2, r);
  if (ev.tier === 'pas') return 'the pas at the bridge';
  if (left === 2) return 'the final';
  if (r === 0) return 'the first round';
  return left === 4 ? 'the last four' : 'the last eight';
}
export function roundCount(ev) { return Math.log2(Object.keys(ev.riders).length); }

function courseRng(state, roundIdx, pairIdx, courseNo) {
  const ev = state.event;
  return streamFor(state.seed, ev.year, `course:${ev.serial}:${roundIdx}:${pairIdx}:${courseNo}`);
}

/**
 * Open the current round: every bout that does not involve you is ridden, in
 * order, and you watch them — which is how you learn a rider's habits. Then
 * either your bout is set in the lists, or (if you are out) the round closes.
 */
export function openRound(state) {
  const ev = state.event;
  const r = ev.round;
  const pairs = ev.rounds[r];
  ev.current = null;
  pairs.forEach((p, i) => {
    if (p.winner) return;
    if (p.a === YOU || p.b === YOU) { ev.current = i; return; }
    ridePairing(state, r, i);
    for (const id of [p.a, p.b]) state.intel[id] = Math.max(state.intel[id] || 0, 1);
  });
  if (ev.current != null) {
    const p = pairs[ev.current];
    if (walkover(ev, p)) {
      ev.current = null;
    } else {
      p.bout = newBout(p.a, p.b);
      ev.stage = STAGE.BOUT;
      squireScouts(state, p.b);
      return;
    }
  }
  closeRound(state);
}

/** Your squire asks among the grooms about a man you know nothing of. */
function squireScouts(state, id) {
  const ev = state.event;
  if (!state.squire || (state.intel[id] || 0) > 0) return;
  const rng = streamFor(state.seed, ev.year, `scout:${ev.serial}:${ev.round}`);
  const p = SQUIRE.scoutBase + SQUIRE.scoutPerWits * (state.squire.wits - 8);
  if (rng.next() < p) {
    state.intel[id] = 1;
    ev.notes.push(`${state.squire.name} asked among the grooms, and tells you how ${ev.riders[id].name} rides.`);
  }
}

function walkover(ev, p) {
  const wa = ev.withdrawn[p.a];
  const wb = ev.withdrawn[p.b];
  if (!wa && !wb) return false;
  p.winner = wa && !wb ? p.b : p.a;
  p.bout = { ...newBout(p.a, p.b), done: true, winner: p.winner === p.a ? 'a' : 'b', how: 'walkover' };
  return true;
}

function ridePairing(state, r, i) {
  const ev = state.event;
  const p = ev.rounds[r][i];
  if (walkover(ev, p)) return;
  p.bout = newBout(p.a, p.b);
  const A = ev.riders[p.a];
  const B = ev.riders[p.b];
  while (!p.bout.done) {
    const rng = courseRng(state, r, i, p.bout.course + 1);
    const res = runCourse(p.bout, A, B, null, null, rng);
    rollWounds(ev, A, B, res, rng);
  }
  p.winner = p.bout.winner === 'a' ? p.a : p.b;
}

function rollWounds(ev, A, B, res, rng) {
  // Fixed order: A, then B, one draw each (plus one for severity if hurt).
  for (const [rider, hitBy] of [[A, res.outB], [B, res.outA]]) {
    let p = 0;
    let canBeSerious = false;
    if (hitBy === 'unhorse') {
      p = Math.max(0.05, WOUNDS.unhorsed - WOUNDS.perVigour * (rider.vigour - 10));
      canBeSerious = true;
    } else if (hitBy === 'helm') {
      p = WOUNDS.helmStruck;
    }
    p *= rider.woundMult || 1;
    const roll = rng.next();
    if (roll >= p) continue;
    const serious = canBeSerious && rng.next() < WOUNDS.seriousShare;
    if (serious || rider.wound === 'light') {
      rider.wound = 'serious';
      ev.withdrawn[rider.id] = true;
    } else {
      rider.wound = 'light';
    }
  }
}

/** Ride one course of YOUR bout. `choice` is { aim, seat }. */
export function playCourse(state, choice) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.BOUT) return { ok: false, reason: 'You are not in the lists.' };
  const p = ev.rounds[ev.round][ev.current];
  const A = ev.riders[p.a];
  const B = ev.riders[p.b];
  const rng = courseRng(state, ev.round, ev.current, p.bout.course + 1);
  const res = runCourse(p.bout, A, B, choice, null, rng);
  const woundBefore = { a: A.wound, b: B.wound };
  rollWounds(ev, A, B, res, rng);
  ev.lastCourse = {
    n: p.bout.course,
    you: { aim: res.choiceA.aim, seat: res.choiceA.seat, out: res.outA },
    him: { aim: res.choiceB.aim, seat: res.choiceB.seat, out: res.outB },
    scores: { ...p.bout.scores },
    wounds: {
      you: A.wound !== woundBefore.a ? A.wound : null,
      him: B.wound !== woundBefore.b ? B.wound : null,
    },
  };
  if (p.bout.done) finishBout(state, p);
  return { ok: true, course: ev.lastCourse, done: p.bout.done };
}

/** Your bout is decided: his reaction, your wager, your practice. */
function finishBout(state, p) {
  const ev = state.event;
  p.winner = p.bout.winner === 'a' ? p.a : p.b;
  ev.stage = STAGE.RESULT;
  const won = p.winner === YOU;
  const him = knightById(state, p.b);
  const fell = p.bout.how === 'unhorse' && won;
  if (him) {
    const r = reactionFor(him, won ? (fell ? 'lostFall' : 'lost') : 'won');
    adjustRegard(state, him.id, r.regard);
    ev.reactions.push({ round: ev.round, text: r.text, regard: r.regard });
    if (won) targetBeaten(state, him.id, ev.notes);
  }
  if (ev.wager && !ev.wager.settled) {
    ev.wager.settled = true;
    charge(state, won ? 'Your wager, won' : 'Your wager, lost', won ? ev.wager.amount : -ev.wager.amount);
  }
  addMarks(state, 'lance', TRAINING.boutMarks);
  addMarks(state, 'seat', TRAINING.boutMarks);
}

/** What moment, if any, the end of your bout calls for. */
export function momentFor(state) {
  const ev = state.event;
  const p = ev.rounds[ev.round][ev.current];
  const won = p.winner === YOU;
  if (won && p.bout.how === 'forfeit') return 'moment.forfeit';
  if (won && ev.withdrawn[p.b]) return 'moment.hurt';
  if (won && p.bout.how === 'unhorse') return 'moment.unhorsed';
  if (!won && p.bout.how === 'unhorse') return 'moment.beaten';
  return null;
}

/** After your bout's result: on to the next round, or to the end. */
export function continueTourney(state) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.RESULT) return { ok: false, reason: 'There is nothing to continue.' };
  closeRound(state);
  return { ok: true };
}

function closeRound(state) {
  const ev = state.event;
  const pairs = ev.rounds[ev.round];
  if (pairs.some((p) => !p.winner)) throw new Error('A round cannot close with a bout undecided.');
  if (pairs.length === 1) return scoreJoust(state);
  const winners = pairs.map((p) => p.winner);
  for (const id of winners) {
    const r = ev.riders[id];
    r.fatigue = Math.max(0, r.fatigue - recovery(r) - (r.groom ? 1.5 : 0));
  }
  const next = [];
  for (let i = 0; i < winners.length; i += 2) next.push(pairing(winners[i], winners[i + 1]));
  ev.rounds.push(next);
  ev.round += 1;
  openRound(state);
}

// ---------------------------------------------------------------------------
// Prizes, the field's reckoning, and the herald's entry
// ---------------------------------------------------------------------------

export function boutsOf(ev, id) {
  const out = [];
  ev.rounds.forEach((pairs, r) => pairs.forEach((p) => {
    if (p.a === id || p.b === id) out.push({ round: r, pairing: p, side: p.a === id ? 'a' : 'b' });
  }));
  return out;
}

function helmCount(ev, id) {
  return boutsOf(ev, id).reduce((s, { pairing, side }) => s + (pairing.bout ? pairing.bout.helms[side] : 0), 0);
}

function placingFor(ev, lost) {
  if (!lost) return 'champion';
  const left = Object.keys(ev.riders).length / Math.pow(2, lost.round);
  if (left === 2) return 'runnerUp';
  if (lost.round === 0) return 'first';
  return left === 4 ? 'semi' : 'quarter';
}

/** The jousts are over: prizes, renown and the field's reckoning. Then the next day. */
function scoreJoust(state) {
  const ev = state.event;
  const tier = TIERS[ev.tier];
  const final = ev.rounds[ev.rounds.length - 1][0];
  ev.champion = final.winner;

  const helms = Object.keys(ev.riders).map((id) => [id, helmCount(ev, id)]).sort((x, y) => y[1] - x[1]);
  ev.helmPrize = tier.prizes.helm && helms[0][1] > 0 && helms[0][1] > helms[1][1] ? helms[0][0] : null;

  const mine = boutsOf(ev, YOU);
  const lost = mine.find(({ pairing }) => pairing.winner !== YOU);
  ev.placing = placingFor(ev, lost);

  let renown = 0;
  let honour = 0;
  let lances = 0;
  let unhorsed = [];
  let fellTo = null;
  let horseStrikes = 0;
  let helmsStruck = 0;
  let boutsWon = 0;
  let courses = 0;
  const met = new Set();
  for (const { pairing, side } of mine) {
    const b = pairing.bout;
    if (!b) continue;
    const other = side === 'a' ? 'b' : 'a';
    const himId = pairing[other];
    const him = ev.riders[himId];
    if (b.how !== 'walkover') met.add(himId);
    lances += b.lances[side];
    helmsStruck += b.helms[side];
    courses += b.courses.length;
    for (const c of b.courses) {
      if (c[side].out === 'unhorse') unhorsed.push(him.name);
      if (c[other].out === 'unhorse') fellTo = him.name;
      if (c[side].out === 'horse') horseStrikes += 1;
    }
    if (pairing.winner === YOU && b.how !== 'walkover') { renown += tier.renown.boutWon; boutsWon += 1; }
  }
  unhorsed = [...new Set(unhorsed)];
  renown += unhorsed.length * tier.renown.unhorse;
  honour -= horseStrikes * 4;

  // The season's wear on your horse.
  const wear = met.size * CONDITION.perBout + (ev.travelDays > CONDITION.longRoadDays ? 1 : 0);
  state.horse.condition = Math.max(0, (state.horse.condition ?? CONDITION.max) - wear);

  if (lances && tier.lancePrice) charge(state, `Lances broken: ${lances} at ${tier.lancePrice}d`, -lances * tier.lancePrice);
  if (ev.riders[YOU].wound === 'serious') {
    charge(state, 'The surgeon', -WOUNDS.surgeon);
    state.knight.injuredUntil = monthIndex(ev.year, ev.month) + WOUNDS.seriousMonths;
  }
  if (ev.placing === 'champion') {
    if (tier.prizes.champion) charge(state, `Prize: ${tier.prizeLabels.champion}`, tier.prizes.champion);
    renown += tier.renown.champion;
  }
  if (ev.placing === 'runnerUp') {
    if (tier.prizes.runnerUp) charge(state, `Prize: ${tier.prizeLabels.runnerUp}`, tier.prizes.runnerUp);
    renown += tier.renown.runnerUp;
  }
  if (ev.helmPrize === YOU) {
    charge(state, `Prize: ${tier.prizeLabels.helm}, for the most helm strikes`, tier.prizes.helm);
    renown += tier.renown.helmPrize;
  }
  if (ev.token) renown += boutsWon;
  if (boutsWon && state.retinue.includes('minstrel')) renown += 1;

  // Vows made at the feast.
  const vows = [];
  for (const id of ev.vows) {
    const name = ev.riders[id]?.name || knightById(state, id)?.name;
    const ordeal = state.flags.includes('ordealVow') && id === state.story?.culprit;
    if (unhorsed.includes(name)) {
      renown += 3;
      vows.push({ name, kept: true });
      if (ordeal) ev.notes.push(clearMaster(state, `In the lists at ${TOWNS[ev.town].name}, God gave judgement.`));
    } else if (met.has(id)) {
      honour -= 2;
      vows.push({ name, kept: false });
      if (ordeal) state.flags = state.flags.filter((f) => f !== 'ordealVow');
    } else vows.push({ name, kept: null });
  }

  const beneath = state.renown >= tier.beneath;
  if (beneath) renown = Math.min(renown, 0);
  state.renown = Math.max(0, state.renown + renown);
  state.honour += honour;
  clampHonour(state);

  // The field's own reckoning: renown and wounds for everyone else.
  const res = {};
  for (const id of Object.keys(ev.riders)) {
    if (id === YOU) continue;
    const theirs = boutsOf(ev, id);
    const theirLoss = theirs.find(({ pairing }) => pairing.winner !== id);
    res[id] = {
      boutsWon: theirs.filter(({ pairing }) => pairing.winner === id && pairing.bout.how !== 'walkover').length,
      unhorses: theirs.filter(({ pairing }) => pairing.winner === id && pairing.bout.how === 'unhorse').length,
      // Rounds from the end, as runBracket counts them: 0 = champion, 1 = lost the final.
      out: theirLoss ? roundCount(ev) - theirLoss.round : 0,
      hurt: ev.riders[id].wound === 'serious',
    };
  }
  creditField(state, { tier: ev.tier, year: ev.year, month: ev.month }, res);

  const c = state.career;
  c.bouts += met.size;
  c.boutsWon += boutsWon;
  c.courses += courses;
  c.lances += lances;
  c.unhorsed += unhorsed.length;
  if (fellTo) c.falls += 1;
  if (ev.placing === 'champion' && TIER_ORDER.includes(ev.tier)) c.championships += 1;
  // A great tourney won is a blow in the proxy war, for whichever house you ride for.
  if (ev.placing === 'champion' && (ev.tier === 'high' || ev.tier === 'grand')) {
    c.greatPrizes = (c.greatPrizes || 0) + 1;
    creditBalance(state, ev.tier, sideOf(state), { yours: true });
    if (ev.tier === 'grand' && state.renown >= LANDS.royalGrantRenown && !(state.lands || []).some((l) => l.how === 'royal')) {
      const m = grantManor(state, 'crown', 'royal');
      if (m) ev.notes.push(`The king grants you the manor of ${m.name}, to hold of the Crown.`);
    }
  }

  if ((ev.tier === 'high' || ev.tier === 'grand') && ev.champion !== YOU) noteChampion(state, ev, ev.riders[ev.champion].name);
  ev.jousted = {
    placing: ev.placing,
    champion: ev.riders[ev.champion].name,
    beatenBy: lost ? ev.riders[lost.pairing.winner].name : null,
    lances,
    helms: helmsStruck,
    unhorsed,
    fellTo,
    horseStrikes,
    helmPrize: ev.helmPrize === YOU,
    withdrew: ev.riders[YOU].wound === 'serious',
    vows,
    beneath,
    renown,
    honour,
  };
  nextDay(state);
}

// ---------------------------------------------------------------------------
// The days of a tourney
// ---------------------------------------------------------------------------

/** After the eve feast: the first day. The jousts, unless the day is yours to choose. */
export function beginDays(state) {
  const ev = state.event;
  const tier = TIERS[ev.tier];
  if (tier.optionalDays) { ev.stage = STAGE.DAY; return; }
  if (ev.days[0] === 'joust') { openRound(state); return; }
  enterDay(state);
}

/** Why you cannot fight today, if you cannot. */
function unfit(state) {
  const me = state.event.riders[YOU];
  if (me.wound === 'serious' || (state.knight.injuredUntil || 0) > monthIndex(state.event.year, state.event.month)) {
    return 'You are hurt, and the surgeon will not let you arm.';
  }
  return null;
}

/** A night's rest, and the next day of the tourney, or its end. */
export function nextDay(state) {
  const ev = state.event;
  ev.day += 1;
  for (const r of Object.values(ev.riders)) r.fatigue = Math.max(0, (r.fatigue || 0) - OVERNIGHT.fatigue - OVERNIGHT.perVigour * r.vigour);
  while (ev.day < ev.days.length) {
    const why = unfit(state);
    if (!why || state.status !== 'active') {
      if (state.status !== 'active') break;
      ev.stage = STAGE.DAY;
      return;
    }
    ev.notes.push(`${why} You watch ${DAY_LABEL[ev.days[ev.day]]} from the stands.`);
    ev.day += 1;
  }
  closeTourney(state);
}

export function dayKind(ev) { return ev.days[ev.day]; }

/** How many of your own men may ride with you in the mêlée, and what they cost. */
export function meleeMenOption(state) {
  const ev = state.event;
  const cap = MELEE.menCap[ev.tier] || 0;
  return { max: Math.min(cap, state.company || 0), cap, fee: MELEE.manFee };
}

/** Ride in today's event. `opts.men`: how many of your men ride with you in the mêlée. */
export function enterDay(state, opts = {}) {
  const ev = state.event;
  if (!ev) return { ok: false, reason: 'There is no tourney in hand.' };
  const kind = dayKind(ev);
  if (ev.tier === 'greatpas') {
    ev.touched += 1;
    state.renown += TIERS.greatpas.touched.renown;
    ev.notes.push(`You touch the ${kind === 'joust' ? 'black' : 'white'} shield. The holder's herald writes your name in the book of the pas, and gives you a gold ring.`);
  }
  if (kind === 'joust') { openRound(state); return { ok: true }; }
  if (kind === 'melee') return startMelee(state, opts.men || 0);
  if (kind === 'barriers') return startFoot(state);
  return { ok: false, reason: 'There is nothing to ride in today.' };
}

/** Stand down for the day, and watch. */
export function standDown(state) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.DAY) return { ok: false, reason: 'There is no day to stand down from.' };
  if (!TIERS[ev.tier].optionalDays && ev.days[ev.day] === 'joust') return { ok: false, reason: 'You came to joust.' };
  ev.notes.push(`You stand down from ${DAY_LABEL[dayKind(ev)]}, and watch.`);
  nextDay(state);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The mêlée
// ---------------------------------------------------------------------------

function calLike(ev) {
  return { tier: ev.tier, year: ev.year, month: ev.month, town: ev.town, host: ev.host };
}

function startMelee(state, men) {
  const ev = state.event;
  const opt = meleeMenOption(state);
  if (men < 0 || men > opt.max) return { ok: false, reason: `You may bring up to ${opt.max} of your men.` };
  const size = MELEE.sideSize[ev.tier];
  const rng = streamFor(state.seed, ev.year, `melee:${ev.serial}`);
  // The joust's riders who can still ride, and more from the field to make up the sides.
  let ids = rng.shuffle(Object.keys(ev.riders).filter((id) => id !== YOU && ev.riders[id].wound !== 'serious')).slice(0, size * 2 - 1);
  if (ids.length < size * 2 - 1) {
    const more = pickField(state, calLike(ev), size * 2 - 1 - ids.length, new Set([...ids, ...Object.keys(ev.riders)]), rng);
    ids = [...ids, ...more.map((k) => k.id)];
  }
  const riders = { [YOU]: { ...ev.riders[YOU] } };
  for (const id of ids) riders[id] = ev.riders[id] ? { ...ev.riders[id] } : riderFrom(knightById(state, id));
  // The holders are the host's own men; you ride with them if you are his.
  const house = ev.host.faction;
  const yourSide = house && state.patron?.id === house ? 'holders' : 'comers';
  const sides = { holders: [], comers: [] };
  sides[yourSide].push(YOU);
  const sworn = ids.filter((id) => house && knightById(state, id)?.allegiance === house);
  for (const id of [...sworn, ...ids.filter((x) => !sworn.includes(x))]) {
    const side = sides.holders.length < size && (sworn.includes(id) || sides.comers.length >= size) ? 'holders' : sides.comers.length < size ? 'comers' : 'holders';
    sides[side].push(id);
  }
  if (men) charge(state, `${men} of your men-at-arms ride with you in the mêlée`, -men * MELEE.manFee);
  ev.melee = newMelee({ tier: ev.tier, riders, sides, yourSide, men });
  learn(state, 'melee');
  ev.melee.openings = openingsFor(ev.melee, streamFor(state.seed, ev.year, `melee:${ev.serial}:open:0`));
  ev.melee.last = null;
  ev.stage = STAGE.MELEE;
  return { ok: true };
}

/** Your part in a pass of the mêlée: `index` is the opening, `action` take | strike | rescue | recet. */
export function meleeAct(state, index, action) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.MELEE) return { ok: false, reason: 'You are not in the mêlée.' };
  const m = ev.melee;
  if (action !== 'recet' && !m.openings[index]) return { ok: false, reason: 'There is no such man in front of you.' };
  const rng = streamFor(state.seed, ev.year, `melee:${ev.serial}:${m.pass}`);
  const rec = yourPass(m, index, action, rng);
  m.last = rec;
  fieldPass(m, rng, rec.target ? [rec.target] : []);
  nextPass(m);
  if (!m.done && !m.out[YOU]) {
    m.openings = openingsFor(m, streamFor(state.seed, ev.year, `melee:${ev.serial}:open:${m.pass}`));
    return { ok: true, rec };
  }
  // Out of it, or the day is over: the rest of the field fights on without you.
  while (!m.done) { fieldPass(m, streamFor(state.seed, ev.year, `melee:${ev.serial}:${m.pass}`)); nextPass(m); }
  endMelee(state);
  return { ok: true, rec };
}

function nameIn(state, id) { return id === YOU ? 'you' : (state.event.riders[id] || knightById(state, id))?.name || 'a knight'; }

function endMelee(state) {
  const ev = state.event;
  const m = ev.melee;
  const tier = ev.tier;
  const res = meleeResult(m);
  const me = ev.riders[YOU];
  me.fatigue = m.riders[YOU].fatigue;
  if (m.youHurt) me.wound = m.youHurt === 'serious' ? 'serious' : (me.wound || 'light');
  if (m.youTaken) charge(state, `Your ransom, to ${nameIn(state, m.out[YOU].by)}`, -ransomOf(tier, state.renown));
  if (m.yourMenTaken) charge(state, `Ransom of ${m.yourMenTaken} of your men`, -m.yourMenTaken * RANSOM.man);
  if (m.youHurt === 'serious') {
    charge(state, 'The surgeon', -WOUNDS.surgeon);
    state.knight.injuredUntil = monthIndex(ev.year, ev.month) + WOUNDS.seriousMonths;
  }
  let renown = res.renown;
  if (res.prize === YOU) {
    charge(state, `The prize of the tourney: ${MELEE_PRIZE_LABELS[tier]}`, MELEE_PRIZE[tier]);
    renown += MELEE_RENOWN.prize;
  }
  const beneath = state.renown >= TIERS[tier].beneath;
  if (beneath) renown = Math.min(renown, 0);
  state.renown = Math.max(0, state.renown + renown);
  // The field's reckoning: a prisoner taken is a name made.
  for (const [id, sc] of Object.entries(m.score)) {
    if (id === YOU || !sc) continue;
    const k = knightById(state, id);
    if (k) k.renown += sc + (res.prize === id ? 2 : 0);
  }
  for (const id of m.prisoners) {
    const k = knightById(state, id);
    if (k) adjustRegard(state, id, TAKEN_REGARD[k.temperament] || 0, `You took him prisoner in the mêlée at ${TOWNS[ev.town].name}.`);
  }
  for (const id of m.rescued) {
    const k = knightById(state, id);
    if (k) adjustRegard(state, id, 3, `You broke in and brought him out of the enemy's hands at ${TOWNS[ev.town].name}.`);
  }
  addMarks(state, 'sword', TRAINING.boutMarks * 2);
  const due = m.prisoners.reduce((t, id) => t + ransomOf(tier, (m.riders[id].renown || 0)), 0);
  ev.dayResults.melee = {
    side: m.yourSide,
    sideWon: res.yourSideWon,
    even: res.winner == null,
    prisoners: m.prisoners.map((id) => nameIn(state, id)),
    beaten: m.beaten.map((id) => nameIn(state, id)),
    rescued: m.rescued.map((id) => nameIn(state, id)),
    takenBy: m.youTaken ? nameIn(state, m.out[YOU].by) : null,
    menTaken: m.yourMenTaken,
    hurt: m.youHurt,
    prize: res.prize === YOU,
    prizeTo: res.prize && res.prize !== YOU ? nameIn(state, res.prize) : null,
    renown,
    beneath,
    due,
    terms: null,
  };
  if (m.prisoners.length) { ev.stage = STAGE.RANSOM; return; }
  nextDay(state);
}

/** What you ask of your prisoners: in full, half on their word, or nothing. */
export function ransomTerms(state) {
  const ev = state.event;
  const due = ev?.dayResults?.melee?.due || 0;
  return Object.values(RANSOM_TERMS).map((t) => ({ ...t, amount: Math.round(due * t.share) }));
}

export function settleRansoms(state, terms) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.RANSOM) return { ok: false, reason: 'There are no prisoners to settle.' };
  const t = RANSOM_TERMS[terms];
  if (!t) return { ok: false, reason: 'No such terms.' };
  const r = ev.dayResults.melee;
  const m = ev.melee;
  const amount = Math.round(r.due * t.share);
  if (amount) charge(state, `Ransoms of ${r.prisoners.join(', ')}${t.share < 1 ? ', at half' : ''}`, amount);
  if (t.generous) state.knight.traits.generous = driftTrait(state.knight.traits.generous, t.generous);
  if (t.honour) { state.honour += t.honour; clampHonour(state); }
  if (t.renown) state.renown += t.renown;
  if (t.regard) for (const id of m.prisoners) adjustRegard(state, id, t.regard, t.share === 0 ? 'You let him go without ransom.' : null);
  r.terms = terms;
  nextDay(state);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The barriers
// ---------------------------------------------------------------------------

function startFoot(state) {
  const ev = state.event;
  const ord = TIERS[ev.tier].ord || 'articles';
  const rng = streamFor(state.seed, ev.year, `barriers:${ev.serial}`);
  const riders = { [YOU]: ev.riders[YOU] };
  let others;
  if (ev.tier === 'greatpas' || ev.tier === 'trial') {
    others = Object.keys(ev.riders).filter((id) => id !== YOU);
  } else {
    others = rng.shuffle(Object.keys(ev.riders).filter((id) => id !== YOU && ev.riders[id].wound !== 'serious')).slice(0, BARRIERS.entrants - 1);
    if (others.length < BARRIERS.entrants - 1) {
      const more = pickField(state, calLike(ev), BARRIERS.entrants - 1 - others.length, new Set(Object.keys(ev.riders)), rng);
      others = [...others, ...more.map((k) => k.id)];
    }
  }
  for (const id of others) riders[id] = ev.riders[id] || riderFrom(knightById(state, id));
  if (ord === 'articles') learn(state, 'barriers');
  const f = { ord, riders, entrants: [YOU, ...others], round: 0, bout: null, other: null, won: [], beatenBy: null, champion: null, last: null, mercy: null };
  ev.foot = f;
  if (others.length >= 3) {
    // The other pair fight first, and you watch.
    const [a, b] = [others[1], others[2]];
    const ob = fightOut(newFootBout(a, b, ord), riders[a], riders[b], streamFor(state.seed, ev.year, `barriers:${ev.serial}:other`));
    f.other = { a, b, winner: ob.winner === 'a' ? a : b, how: ob.how };
    for (const id of [a, b]) state.intel[id] = Math.max(state.intel[id] || 0, 1);
  }
  f.bout = newFootBout(YOU, others[0], ord);
  ev.stage = STAGE.FOOT;
  return { ok: true };
}

/** The combat in hand at the barriers, for the screen. */
export function currentFoot(state) {
  const f = state.event?.foot;
  if (!f || !f.bout) return null;
  return { bout: f.bout, you: f.riders[YOU], him: f.riders[f.bout.b], ord: f.ord, final: f.round > 0 || !f.other };
}

function footRng(state) {
  const ev = state.event;
  const f = ev.foot;
  return streamFor(state.seed, ev.year, `foot:${ev.serial}:${f.round}:${f.bout.n + 1}`);
}

/** One exchange at the barriers. `choice` is { stroke, guard }. */
export function playExchange(state, choice) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.FOOT) return { ok: false, reason: 'You are not at the barriers.' };
  const f = ev.foot;
  const you = f.riders[YOU];
  const him = f.riders[f.bout.b];
  const res = runExchange(f.bout, you, him, choice, null, footRng(state));
  f.last = {
    n: f.bout.n,
    you: { stroke: res.choiceA.stroke, guard: res.choiceA.guard, out: res.outA },
    him: { stroke: res.choiceB.stroke, guard: res.choiceB.guard, out: res.outB },
    scores: { ...f.bout.scores },
    hurts: { ...f.bout.hurts },
  };
  if (f.bout.done) finishFoot(state);
  return { ok: true, exchange: f.last, done: f.bout.done };
}

function finishFoot(state) {
  const ev = state.event;
  const f = ev.foot;
  const b = f.bout;
  const hisId = b.b;
  const won = b.winner === 'a';
  const him = knightById(state, hisId);
  if (won) f.won.push(hisId);
  else f.beatenBy = hisId;
  if (him && f.ord !== 'outrance') {
    const r = reactionFor(him, won ? (b.how === 'down' ? 'lostFall' : 'lost') : 'won');
    adjustRegard(state, hisId, r.regard);
    ev.reactions.push({ round: `barriers${f.round}`, text: r.text, regard: r.regard });
    if (won) targetBeaten(state, hisId, ev.notes);
  }
  addMarks(state, 'sword', TRAINING.boutMarks * 2);
  if (f.ord === 'outrance') resolveTrial(state, won);
  ev.stage = STAGE.FOOT_RESULT;
}

/** On from a combat at the barriers: the final, or the end of the day. */
export function continueFoot(state) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.FOOT_RESULT) return { ok: false, reason: 'There is nothing to go on to.' };
  const f = ev.foot;
  if (f.mercy === 'pending') return { ok: false, reason: 'He is at your mercy. Spare him, or finish it.' };
  const won = f.bout.winner === 'a';
  if (won && f.round === 0 && f.other) {
    f.round = 1;
    f.bout = newFootBout(YOU, f.other.winner, f.ord);
    // A breath between the rounds.
    const you = f.riders[YOU];
    you.fatigue = Math.max(0, you.fatigue - OVERNIGHT.fatigue / 2);
    ev.stage = STAGE.FOOT;
    return { ok: true };
  }
  endFoot(state);
  return { ok: true };
}

function endFoot(state) {
  const ev = state.event;
  const f = ev.foot;
  const tier = ev.tier;
  if (tier === 'trial') { closeTourney(state); return; }
  const champion = f.beatenBy == null;
  let renown = f.won.length * (BARRIERS.renown.win[tier] || 0) + (champion ? BARRIERS.renown.champion[tier] || 0 : 0);
  if (champion && BARRIERS.prizes[tier]) charge(state, `The prize of the barriers: ${BARRIERS.prizeLabels[tier]}`, BARRIERS.prizes[tier]);
  const beneath = state.renown >= TIERS[tier].beneath;
  if (beneath) renown = Math.min(renown, 0);
  state.renown = Math.max(0, state.renown + renown);
  // The field's reckoning at the barriers.
  const npcChamp = !champion ? (f.round === 1 || !f.other ? f.beatenBy : f.other.winner) : null;
  if (npcChamp && ev.tier !== 'greatpas') { const k = knightById(state, npcChamp); if (k) k.renown += 2; }
  ev.dayResults.foot = {
    won: f.won.map((id) => nameIn(state, id)),
    beatenBy: f.beatenBy ? nameIn(state, f.beatenBy) : null,
    champion,
    prizeTo: npcChamp ? nameIn(state, npcChamp) : null,
    renown,
    beneath,
  };
  nextDay(state);
}

// ---------------------------------------------------------------------------
// Trial by combat
// ---------------------------------------------------------------------------

/**
 * A trial à outrance, as a tourney of one combat: `cause` is 'ambry' (you
 * accuse the man of Ambry Cross) or 'accused' (he accuses you).
 */
export function newTrial(state, rivalId, cause, town) {
  const k = knightById(state, rivalId);
  const cal = {
    id: `trial-${state.year}-${rivalId}`, tier: 'trial', year: state.year, month: state.month, feast: 'the judgement of God',
    town, name: `The trial by combat of ${k.name}`, host: { kind: 'crown', faction: 'crown', name: 'the judges of the field' },
  };
  const ev = newTourney(state, cal, { riders: [rivalId] });
  ev.trial = { cause, rival: rivalId, outcome: null };
  ev.riders[rivalId].grudge = true;
  return ev;
}

function resolveTrial(state, won) {
  const ev = state.event;
  const f = ev.foot;
  const t = ev.trial;
  const k = knightById(state, t.rival);
  t.how = f.bout.how;
  if (won) { t.outcome = 'won'; f.mercy = 'pending'; return; }
  // Beaten: at his mercy, and he may not have any.
  const rng = streamFor(state.seed, ev.year, `quarter:${ev.serial}`);
  if (rng.next() < noQuarter(k, true)) {
    t.outcome = 'killed';
    state.status = 'dead';
    state.outcome = {
      kind: 'dead', year: state.year,
      text: `Sir ${state.knight.given} ${state.knight.house} was beaten in the trial by combat with ${k.name}, and ${k.name} did not spare him. The judges of the field wrote that God had judged, and the heralds wrote his name among the dead.`,
    };
    return;
  }
  t.outcome = 'yielded';
}

/** Spare the man at your mercy, or finish it. */
export function trialMercy(state, spare) {
  const ev = state.event;
  const f = ev?.foot;
  if (!f || f.mercy !== 'pending') return { ok: false, reason: 'Nobody is at your mercy.' };
  const k = knightById(state, ev.trial.rival);
  f.mercy = spare ? 'spared' : 'killed';
  ev.trial.mercy = f.mercy;
  if (spare) {
    state.knight.traits.merciful = driftTrait(state.knight.traits.merciful, 2);
    state.honour += 1; clampHonour(state);
    adjustRegard(state, k.id, 2, 'You beat him in the trial by combat, and spared him.');
  } else {
    state.knight.traits.merciful = driftTrait(state.knight.traits.merciful, -3);
    k.active = false;
    k.memory.push('You killed him in the trial by combat.');
  }
  return { ok: true };
}

/** What the trial comes to: the verdict, and what it does to both names. */
function closeTrial(state) {
  const ev = state.event;
  const t = ev.trial;
  const k = knightById(state, t.rival);
  const won = t.outcome === 'won';
  const baton = t.how === 'baton';
  if (t.cause === 'ambry') {
    if (won) ev.notes.push(clearMaster(state, 'Before the judges of the field, God gave judgement at the barriers.'));
    else { state.honour -= baton ? 2 : 4; state.flags.push('trialLost'); }
  } else {
    if (won) { state.honour += 3; state.renown += 5; k.memory.push('He accused you, and God found against him.'); }
    else { state.honour -= baton ? 3 : 6; }
  }
  clampHonour(state);
  if (won) state.renown += 3;
  const name = ev.riders[YOU].name;
  const how = { down: 'drove him to his knee', disarm: 'took the axe from his hands', hurt: 'struck him twice on the helm', baton: 'had the better of it when the king threw down his baton', points: 'had the better of it', judges: 'had the judges’ verdict' }[t.how] || 'beat him';
  const text = won
    ? `Before the judges of the field, ${name} fought ${k.name} à outrance, and ${how}. ${t.mercy === 'killed' ? `He did not spare him.` : `He spared his life.`} ${t.cause === 'ambry' ? 'God had judged the matter of Ambry Cross.' : 'God had judged the accusation false.'}`
    : `Before the judges of the field, ${name} fought ${k.name} à outrance, and was beaten. ${t.outcome === 'yielded' ? 'He yielded, and lived.' : ''} ${t.cause === 'ambry' ? 'The matter of Ambry Cross stands as it was.' : 'The heralds wrote that the accusation stood.'}`;
  const entry = {
    serial: ev.serial, year: ev.year, tier: 'trial', name: ev.name, feast: ev.feast, town: TOWNS[ev.town].name,
    host: ev.host.name, placing: won ? 'champion' : 'first', text, net: 0,
  };
  state.book.push(entry);
  ev.entry = entry;
  ev.stage = STAGE.DONE;
}

// ---------------------------------------------------------------------------
// The end of a tourney
// ---------------------------------------------------------------------------

/** All the days are done: the heralds' judgement, and the Book of Feats. */
function closeTourney(state) {
  const ev = state.event;
  if (ev.tier === 'trial') { closeTrial(state); return; }
  const judged = state.honour - (ev.honourStart ?? state.honour);
  const judgement = judged >= 2 ? 'well' : judged <= -2 ? 'ill' : null;
  const net = ev.ledger.reduce((s, l) => s + l.amount, 0);
  const j = ev.jousted;
  const entry = {
    serial: ev.serial,
    year: ev.year,
    tier: ev.tier,
    name: ev.name,
    feast: ev.feast,
    town: TOWNS[ev.town].name,
    host: ev.host.name,
    ...(j || { placing: null, champion: null, beatenBy: null, lances: 0, helms: 0, unhorsed: [], fellTo: null, horseStrikes: 0, helmPrize: false, withdrew: false, vows: [], beneath: false, renown: 0, honour: 0 }),
    jousted: !!j,
    melee: ev.dayResults.melee || null,
    foot: ev.dayResults.foot || null,
    touched: ev.touched,
    judgement,
    net,
  };
  entry.text = heraldEntry(entry, ev.riders[YOU].name);
  state.book.push(entry);
  if (TIER_ORDER.includes(ev.tier)) state.career.tourneys += 1;
  ev.stage = STAGE.DONE;
  ev.entry = entry;
  state.eventsEntered += 1;
}

/** Current rider and his opponent in your bout, for the lists screen. */
export function currentBout(state) {
  const ev = state.event;
  if (!ev || ev.current == null) return null;
  const p = ev.rounds[ev.round][ev.current];
  if (!p || !p.bout) return null;
  return { pairing: p, bout: p.bout, you: ev.riders[p.a], him: ev.riders[p.b], roundName: roundName(ev, ev.round) };
}

// ---------------------------------------------------------------------------
// Training marks (bouts count as practice)
// ---------------------------------------------------------------------------

export function markCost(level) {
  return TRAINING.costBase + Math.max(0, Math.floor((level - 8) / TRAINING.costStep));
}

/** Put marks against a skill; raise it when they reach the cost. Returns rises. */
export function addMarks(state, skill, n) {
  const k = state.knight;
  if (!k.marks) k.marks = { lance: 0, seat: 0, sword: 0, vigour: 0, courtesy: 0, lore: 0 };
  if (k.marks[skill] == null) k.marks[skill] = 0;
  const factor = k.age >= TRAINING.declineFrom ? 0.5 : 1;
  k.marks[skill] = Math.round((k.marks[skill] + n * factor) * 100) / 100;
  const rises = [];
  while (k.stats[skill] < 20 && k.marks[skill] >= markCost(k.stats[skill])) {
    k.marks[skill] = Math.round((k.marks[skill] - markCost(k.stats[skill])) * 100) / 100;
    k.stats[skill] += 1;
    rises.push(k.stats[skill]);
  }
  return rises;
}
