// A tourney: arrival, the draw, the rounds, the prizes, and the reckoning.
//
// Everything the event does is written into `state.event`, and the event's
// ledger IS the account the player reads at the end. The purse moves only
// through charge() below, and every charge writes a ledger line, so the purse
// and the ledger cannot disagree.

import { streamFor } from './rng.js';
import { newBout, runCourse, recovery } from './joust.js';
import { randomArms } from './heraldry.js';
import { fullName } from './knight.js';
import { heraldEntry } from './herald.js';
import { PROVINCIAL, WOUNDS, EVENTS_PER_SEASON } from '../data/tourney.data.js';
import { ARCHETYPES } from '../data/joust.data.js';
import { PROVINCES, FEASTS } from '../data/world.data.js';
import { GIVEN_NAMES, HOUSE_NAMES } from '../data/names.data.js';

export const YOU = 'you';
export const STAGE = {
  ARRIVAL: 'arrival', // costs shown, not yet paid
  BOUT: 'bout',       // your bout is in the lists
  RESULT: 'result',   // your bout is decided; its result is on screen
  DONE: 'done',       // prizes given, the herald has written
};

const clampRound = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

function drawStat(rng, spec) {
  return clampRound(rng.normal(spec.mean, spec.sd), spec.min, spec.max);
}

// ---------------------------------------------------------------------------
// Arrival
// ---------------------------------------------------------------------------

/** The tourney you ride to next. Nothing is paid until you enter. */
export function newTourney(state) {
  const serial = state.eventsEntered + 1;
  const rng = streamFor(state.seed, state.season, `tourney:${serial}`);
  const tier = PROVINCIAL;

  // A debut close to home; after that, wherever the circuit goes.
  const provinceId = serial === 1 ? state.province : rng.pick(Object.keys(PROVINCES));
  const province = PROVINCES[provinceId];
  const town = rng.pick(province.towns);
  const feast = FEASTS[state.eventInSeason % FEASTS.length];
  const host = `Sir ${rng.pick(GIVEN_NAMES)} ${rng.pick(HOUSE_NAMES)}`;

  const riders = {};
  riders[YOU] = playerRider(state);
  const usedNames = new Set([`${state.knight.given} ${state.knight.house}`]);
  for (let i = 1; i < tier.entrants; i++) {
    let given; let house;
    do { given = rng.pick(GIVEN_NAMES); house = rng.pick(HOUSE_NAMES); }
    while (usedNames.has(`${given} ${house}`));
    usedNames.add(`${given} ${house}`);
    const r = tier.rivals;
    riders[`r${i}`] = {
      id: `r${i}`,
      given, house,
      name: `Sir ${given} ${house}`,
      lance: drawStat(rng, r.lance),
      seat: drawStat(rng, r.seat),
      vigour: drawStat(rng, r.vigour),
      horse: { quality: drawStat(rng, r.horse), temper: rng.chance(r.hotShare) ? 'hot' : 'steady' },
      renown: drawStat(rng, r.renown),
      archetype: rng.pick(ARCHETYPES).id,
      arms: randomArms(rng, rng.pick(['none', 'none', 'label', 'crescent'])),
      fatigue: 0,
      wound: null,
    };
  }

  // The draw. The two best-known riders are kept apart; the rest by lot.
  const ids = Object.keys(riders);
  const bySeed = [...ids].sort((x, y) => riders[y].renown - riders[x].renown || (x < y ? -1 : 1));
  const [s1, s2] = bySeed;
  const rest = rng.shuffle(ids.filter((id) => id !== s1 && id !== s2));
  const slots = [s1, ...rest.slice(0, 3), ...rest.slice(3), s2];
  const first = [];
  for (let i = 0; i < slots.length; i += 2) first.push(pairing(slots[i], slots[i + 1]));

  const intel = {};
  const knowsHabits = state.knight.stats.lore >= tier.loreKnowsHabits;
  for (const id of ids) if (id !== YOU) intel[id] = knowsHabits ? 1 : 0;

  return {
    serial,
    season: state.season,
    feast,
    town,
    province: provinceId,
    host,
    tier: tier.tier,
    riders,
    rounds: [first],
    round: 0,
    stage: STAGE.ARRIVAL,
    current: null,
    intel,
    heraldRead: {},
    withdrawn: {},
    ledger: [],
    lastCourse: null,
    placing: null,
    champion: null,
  };
}

function pairing(x, y) {
  // You always ride as side 'a' in your own bouts, so the screen never has to
  // ask which side you are.
  if (y === YOU) return { a: y, b: x, bout: null, winner: null };
  return { a: x, b: y, bout: null, winner: null };
}

function playerRider(state) {
  const k = state.knight;
  return {
    id: YOU,
    given: k.given, house: k.house,
    name: fullName(k),
    lance: k.stats.lance,
    seat: k.stats.seat,
    vigour: k.stats.vigour,
    horse: { quality: state.horse.quality, temper: state.horse.temper },
    renown: state.renown,
    arms: state.arms,
    fatigue: 0,
    wound: null,
  };
}

export function entryCost(tier = PROVINCIAL) {
  return Object.values(tier.costs).reduce((s, v) => s + v, 0);
}

export function canEnter(state) {
  return state.purse >= entryCost();
}

/** Money in or out of the purse. The only place the purse changes during an event. */
function charge(state, label, amount) {
  if (!amount) return;
  state.purse += amount;
  state.event.ledger.push({ label, amount });
}

const COST_LABELS = {
  entry: 'Entry to the heralds’ roll',
  lodging: 'Lodging, three nights',
  stabling: 'Stabling and the farrier',
  largesse: 'Largesse to the heralds',
};

/** Pay to ride, and go to the lists. */
export function enterTourney(state) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.ARRIVAL) return { ok: false, reason: 'There is no tourney waiting to be entered.' };
  if (!canEnter(state)) return { ok: false, reason: 'You cannot pay to ride.' };
  for (const [k, v] of Object.entries(PROVINCIAL.costs)) charge(state, COST_LABELS[k], -v);
  openRound(state);
  return { ok: true };
}

/** What the herald's read of a rider costs you. */
export function heraldReadCost(state) {
  const h = PROVINCIAL.heraldRead;
  return Math.max(h.min, h.base - h.perCourtesy * (state.knight.stats.courtesy - 8));
}

export function buyHeraldRead(state, riderId) {
  const ev = state.event;
  if (!ev || riderId === YOU || !ev.riders[riderId]) return { ok: false, reason: 'No such rider.' };
  if (ev.intel[riderId] >= 2) return { ok: false, reason: 'You already have the herald’s read of him.' };
  const cost = heraldReadCost(state);
  if (state.purse < cost) return { ok: false, reason: 'You cannot spare the coin.' };
  charge(state, `The herald’s read of ${ev.riders[riderId].name}`, -cost);
  ev.intel[riderId] = 2;
  ev.heraldRead[riderId] = true;
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The rounds
// ---------------------------------------------------------------------------

export const ROUND_NAMES = ['the first round', 'the last four', 'the final'];

function courseRng(state, roundIdx, pairIdx, courseNo) {
  const ev = state.event;
  return streamFor(state.seed, ev.season, `course:${ev.serial}:${roundIdx}:${pairIdx}:${courseNo}`);
}

/**
 * Open the current round: every bout that does not involve you is ridden, in
 * order, and you watch them — which is how you learn a rider's habits. Then
 * either your bout is set in the lists, or (if you are out) the round closes.
 */
function openRound(state) {
  const ev = state.event;
  const r = ev.round;
  const pairs = ev.rounds[r];
  ev.current = null;
  pairs.forEach((p, i) => {
    if (p.winner) return;
    if (p.a === YOU || p.b === YOU) { ev.current = i; return; }
    ridePairing(state, r, i);
    for (const id of [p.a, p.b]) ev.intel[id] = Math.max(ev.intel[id], 1);
  });
  if (ev.current != null) {
    const p = pairs[ev.current];
    if (walkover(ev, p)) {
      ev.current = null;
    } else {
      p.bout = newBout(p.a, p.b);
      ev.stage = STAGE.BOUT;
      return;
    }
  }
  closeRound(state);
}

/** A withdrawn rider gives his opponent the bout. Returns true if it applied. */
function walkover(ev, p) {
  const wa = ev.withdrawn[p.a];
  const wb = ev.withdrawn[p.b];
  if (!wa && !wb) return false;
  // Both withdrawn: the first named goes forward, and will give a walkover in turn.
  p.winner = wa && !wb ? p.b : p.a;
  p.bout = { ...newBout(p.a, p.b), done: true, winner: p.winner === p.a ? 'a' : 'b', how: 'walkover' };
  return true;
}

/** Ride a bout between two rivals, start to finish, from their own habits. */
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
  if (p.bout.done) {
    p.winner = p.bout.winner === 'a' ? p.a : p.b;
    ev.stage = STAGE.RESULT;
  }
  return { ok: true, course: ev.lastCourse, done: p.bout.done };
}

/** After your bout's result: on to the next round, or to the end. */
export function continueTourney(state) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.RESULT) return { ok: false, reason: 'There is nothing to continue.' };
  closeRound(state);
  return { ok: true };
}

/** Close a round whose bouts are all decided; open the next, or finish. */
function closeRound(state) {
  const ev = state.event;
  const pairs = ev.rounds[ev.round];
  if (pairs.some((p) => !p.winner)) throw new Error('A round cannot close with a bout undecided.');
  if (pairs.length === 1) return finishTourney(state);
  const winners = pairs.map((p) => p.winner);
  for (const id of winners) {
    const r = ev.riders[id];
    r.fatigue = Math.max(0, r.fatigue - recovery(r));
  }
  const next = [];
  for (let i = 0; i < winners.length; i += 2) next.push(pairing(winners[i], winners[i + 1]));
  ev.rounds.push(next);
  ev.round += 1;
  openRound(state);
}

// ---------------------------------------------------------------------------
// Prizes, and the herald's entry
// ---------------------------------------------------------------------------

/** Every bout a rider rode in this event, with his side in it. */
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

function finishTourney(state) {
  const ev = state.event;
  const final = ev.rounds[ev.rounds.length - 1][0];
  ev.champion = final.winner;
  const runnerUp = final.winner === final.a ? final.b : final.a;

  // The helm prize: the most helm strikes of the day, if one rider has them alone.
  const helms = Object.keys(ev.riders).map((id) => [id, helmCount(ev, id)]).sort((x, y) => y[1] - x[1]);
  ev.helmPrize = helms[0][1] > 0 && helms[0][1] > helms[1][1] ? helms[0][0] : null;

  const mine = boutsOf(ev, YOU);
  const lost = mine.find(({ pairing }) => pairing.winner !== YOU);
  ev.placing = ev.champion === YOU ? 'champion'
    : runnerUp === YOU ? 'runnerUp'
    : lost && lost.round === 1 ? 'semi'
    : 'quarter';

  const tier = PROVINCIAL;
  let renown = 0;
  let honour = 0;
  let lances = 0;
  let unhorsed = [];
  let fellTo = null;
  let horseStrikes = 0;
  let helmsStruck = 0;
  let boutsWon = 0;
  let courses = 0;
  for (const { pairing, side } of mine) {
    const b = pairing.bout;
    if (!b) continue;
    const other = side === 'a' ? 'b' : 'a';
    const him = ev.riders[pairing[other]];
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
  honour += horseStrikes * tier.honour.horseStrike;

  charge(state, `Lances broken: ${lances} at ${tier.lancePrice}d`, -lances * tier.lancePrice);
  if (ev.riders[YOU].wound === 'serious') charge(state, 'The surgeon', -WOUNDS.surgeon);
  if (ev.placing === 'champion') {
    charge(state, `Prize: ${tier.prizeLabels.champion}`, tier.prizes.champion);
    renown += tier.renown.champion;
  }
  if (ev.placing === 'runnerUp') {
    charge(state, `Prize: ${tier.prizeLabels.runnerUp}`, tier.prizes.runnerUp);
    renown += tier.renown.runnerUp;
  }
  if (ev.helmPrize === YOU) {
    charge(state, `Prize: ${tier.prizeLabels.helm}`, tier.prizes.helm);
    renown += tier.renown.helmPrize;
  }

  state.renown = Math.max(0, state.renown + renown);
  state.honour += honour;

  const c = state.career;
  c.tourneys += 1;
  c.bouts += mine.filter(({ pairing }) => pairing.bout && pairing.bout.how !== 'walkover').length;
  c.boutsWon += boutsWon;
  c.courses += courses;
  c.lances += lances;
  c.unhorsed += unhorsed.length;
  if (fellTo) c.falls += 1;
  if (ev.placing === 'champion') c.championships += 1;

  const net = ev.ledger.reduce((s, l) => s + l.amount, 0);
  const entry = {
    serial: ev.serial,
    season: ev.season,
    feast: ev.feast,
    town: ev.town,
    host: ev.host,
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

// ---------------------------------------------------------------------------
// Between tourneys
// ---------------------------------------------------------------------------

/**
 * Ride on to the next tourney. Counts off the season; at its end the knight
 * winters and ages a year. A knight who cannot pay the next entry is ruined.
 */
export function rideOn(state) {
  if (state.event && state.event.stage !== STAGE.DONE) {
    return { ok: false, reason: 'Finish this tourney first.' };
  }
  if (state.event) {
    state.eventInSeason += 1;
    if (state.eventInSeason >= EVENTS_PER_SEASON) {
      state.eventInSeason = 0;
      state.season += 1;
      state.knight.age += 1;
      state.log.push({ season: state.season, text: `Winter. ${fullName(state.knight)} is ${state.knight.age}.` });
    }
  }
  state.event = newTourney(state);
  if (!canEnter(state)) {
    state.status = 'ruined';
    state.outcome = {
      kind: 'ruined',
      season: state.season,
      text: 'You cannot pay to ride. There is always a lord who needs a sword, and you will be selling yours.',
    };
  }
  return { ok: true };
}

/** Current rider and his opponent in your bout, for the lists screen. */
export function currentBout(state) {
  const ev = state.event;
  if (!ev || ev.current == null) return null;
  const p = ev.rounds[ev.round][ev.current];
  if (!p || !p.bout) return null;
  return { pairing: p, bout: p.bout, you: ev.riders[p.a], him: ev.riders[p.b], roundName: ROUND_NAMES[ev.round] };
}
