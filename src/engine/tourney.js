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
import { fullName } from './knight.js';
import { heraldEntry } from './herald.js';
import { route } from './calendar.js';
import {
  pickField, riderFrom, knightById, adjustRegard, reactionFor, creditField, monthIndex,
} from './field.js';
import { conductOf, targetBeaten, clearMaster, clampHonour } from './court.js';
import { creditBalance, sideOf, grantManor } from './realm.js';
import { LANDS } from '../data/realm.data.js';
import { TIERS, WOUNDS, HERALD_READ, LORE_KNOWS_HABITS } from '../data/tourney.data.js';
import { TOWNS } from '../data/world.data.js';
import { TRAVEL, HARNESS, SQUIRE, TRAINING, RETINUE_EXPECTED, CONDITION } from '../data/household.data.js';

export const YOU = 'you';
export const STAGE = {
  TRAVEL: 'travel',   // on the road; a road card may be waiting
  ARRIVAL: 'arrival', // arrived; costs shown, not yet paid
  FEAST: 'feast',     // paid; the eve feast
  BOUT: 'bout',       // your bout is in the lists
  RESULT: 'result',   // your bout is decided; its result is on screen
  DONE: 'done',       // prizes given, the herald has written
};

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

function playerRider(state) {
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
  const field = opts.riders
    ? opts.riders.map((id) => knightById(state, id))
    : pickField(state, cal, tier.entrants - 1, new Set(), rng);
  // Once you know it was his lance at Ambry Cross, he will not be seen
  // avoiding you: he rides where you ride.
  const culprit = state.story?.culprit && !state.flags.includes('masterCleared') ? knightById(state, state.story.culprit) : null;
  if (!opts.riders && culprit && culprit.active && !field.includes(culprit) && culprit.injuredUntil <= monthIndex(cal.year, cal.month)) {
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
    host: cal.host,
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
  };
  return ev;
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
  state.location = ev.town;
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
  if (!ev || riderId === YOU || !ev.riders[riderId]) return { ok: false, reason: 'No such rider.' };
  if ((state.intel[riderId] || 0) >= 2) return { ok: false, reason: 'You already have the herald’s read of him.' };
  const cost = heraldReadCost(state);
  if (state.purse < cost) return { ok: false, reason: 'You cannot spare the coin.' };
  charge(state, `The herald’s read of ${ev.riders[riderId].name}`, -cost);
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
  if (pairs.length === 1) return finishTourney(state);
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

function finishTourney(state) {
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
  // The heralds' judgement of your conduct, from arrival to the last course.
  const judged = state.honour - (ev.honourStart ?? state.honour);
  const judgement = judged >= 2 ? 'well' : judged <= -2 ? 'ill' : null;

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
  if (ev.tier !== 'pas') c.tourneys += 1;
  c.bouts += met.size;
  c.boutsWon += boutsWon;
  c.courses += courses;
  c.lances += lances;
  c.unhorsed += unhorsed.length;
  if (fellTo) c.falls += 1;
  if (ev.placing === 'champion' && ev.tier !== 'pas') c.championships += 1;
  // A great tourney won is a blow in the proxy war, for whichever house you ride for.
  if (ev.placing === 'champion' && (ev.tier === 'high' || ev.tier === 'grand')) {
    c.greatPrizes = (c.greatPrizes || 0) + 1;
    creditBalance(state, ev.tier, sideOf(state), { yours: true });
    if (ev.tier === 'grand' && state.renown >= LANDS.royalGrantRenown && !(state.lands || []).some((l) => l.how === 'royal')) {
      const m = grantManor(state, 'crown', 'royal');
      if (m) ev.notes.push(`The king grants you the manor of ${m.name}, to hold of the Crown.`);
    }
  }

  const net = ev.ledger.reduce((s, l) => s + l.amount, 0);
  const entry = {
    serial: ev.serial,
    year: ev.year,
    tier: ev.tier,
    name: ev.name,
    feast: ev.feast,
    town: TOWNS[ev.town].name,
    host: ev.host.name,
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
    judgement,
    renown,
    honour,
    net,
  };
  entry.text = heraldEntry(entry, ev.riders[YOU].name);
  state.book.push(entry);
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
  if (!k.marks) k.marks = { lance: 0, seat: 0, vigour: 0, courtesy: 0, lore: 0 };
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
