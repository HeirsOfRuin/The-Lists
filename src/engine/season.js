// The flow of a career: months, the tourneys in them, the cards between, and
// winter. This is the layer the screen and the bot both drive; every action a
// player can take is one exported function here, and each returns
// { ok, reason } so a refused action says why rather than doing nothing.
//
//   Month (March to October): ride to a tourney, train, rest, go to court,
//   or let the month pass. Then the rest of the field rides whatever
//   tourneys you did not.
//   Winter: the accounts, the Roll of Arms, aging, the fair, the squire,
//   the retinue — then spring.

import { streamFor } from './rng.js';
import {
  newTourney, takeRoad, arrive, payEntry, openRound, playCourse, continueTourney, momentFor,
  charge, travelCost, entryCost, addMarks, YOU, STAGE,
} from './tourney.js';
import { drawCard, drawById, answerCard } from './cards.js';
import { route } from './calendar.js';
import {
  admitted, pickRumour, sendInvitations, calendarFor, beginWar, atWar, tensionFor, fightBattle, battleLines,
  settle, manorDef, manorOffer, companyMax, crownHost,
} from './realm.js';
import { simulateMonth, winterField, monthIndex, knightById } from './field.js';
import { squireCall } from './derive.js';
import {
  patronDef, isPatronTourney, summonsOpen, checkSummons, winterPatron, planSummons, leaveService,
  updateEpithet, canPilgrimage,
} from './court.js';
import { PATRONS, PILGRIMAGE } from '../data/court.data.js';
import { fullName } from './knight.js';
import { randomArms } from './heraldry.js';
import { TIERS } from '../data/tourney.data.js';
import { TOWNS, PROVINCES, GREAT_HOUSES, LAST_MONTH, FIRST_MONTH, MONTHS, WORLD } from '../data/world.data.js';
import {
  RETINUE, UPKEEP, ALLOWANCE, HARNESS, HORSE_MARKET, TRAINING, SQUIRE_ORIGINS, SQUIRE, SERVICE, CONDITION,
} from '../data/household.data.js';
import { GIVEN_NAMES, HORSE_NAMES } from '../data/names.data.js';
import { WAR_YEAR, COMPANY } from '../data/realm.data.js';
import { REALM_BEATS } from '../data/cards.realm.data.js';
import { STAT_LABELS } from '../data/creation.data.js';

const ok = (extra = {}) => ({ ok: true, ...extra });
const no = (reason) => ({ ok: false, reason });

export const PHASE = { MONTH: 'month', WINTER: 'winter' };

function now(state) { return monthIndex(state.year, state.month); }
export function injured(state) { return (state.knight.injuredUntil || 0) > now(state); }

// ---------------------------------------------------------------------------
// The month's choices
// ---------------------------------------------------------------------------

/** This month's tourneys, each with everything needed to decide on it. */
export function monthOptions(state) {
  const events = state.calendar.filter((e) => e.month === state.month);
  return events.map((cal) => {
    const r = route(state.location, cal.town);
    const road = travelCost(state, r.days);
    const entry = entryCost(cal.tier);
    const adm = admitted(state, cal);
    let reason = null;
    if (!adm.ok) reason = adm.reason;
    else if (injured(state)) reason = 'You are still recovering from your wound.';
    else if (state.purse < road + entry) reason = `You need ${road + entry}d for the road and the entry.`;
    return {
      cal, days: r.days, path: r.path, road, entry, total: road + entry, admitted: adm.ok, invite: adm.why || null, reason, open: !reason,
    };
  });
}

/** Set out for a tourney this month. */
export function rideTo(state, calId) {
  if (!isFree(state)) return no('Finish what is in hand first.');
  clearNotices(state);
  const opt = monthOptions(state).find((o) => o.cal.id === calId);
  if (!opt) return no('That tourney is not held this month.');
  if (!opt.open) return no(opt.reason);
  state.lastResult = null;
  state.event = newTourney(state, opt.cal, { from: state.location });
  state.monthRode = { calId, riders: Object.keys(state.event.riders).filter((id) => id !== YOU) };
  takeRoad(state);
  const road = opt.days >= 2 ? roadCard(state, opt.days) : null;
  if (road) state.pending = { inst: road, then: 'arrive' };
  else doArrive(state);
  return ok();
}

function roadCard(state, days) {
  const ev = state.event;
  const rng = streamFor(state.seed, ev.year, `road:${ev.serial}`);
  const p = Math.min(0.7, 0.25 + 0.06 * days);
  if (rng.next() >= p) return null;
  return drawCard(state, 'road', eventCtx(state), `road:${ev.serial}`);
}

function eventCtx(state) {
  const ev = state.event;
  return {
    tier: ev.tier,
    town: ev.town,
    host: ev.host.name,
    hostFaction: ev.host.faction,
    field: Object.keys(ev.riders).filter((id) => id !== YOU),
  };
}

function doArrive(state) {
  arrive(state);
  const ev = state.event;
  const rng = streamFor(state.seed, ev.year, `arrival:${ev.serial}`);
  const chance = ev.tier === 'grand' || ev.tier === 'high' ? 0.8 : 0.35;
  if (ev.tier !== 'pas' && rng.next() < chance) {
    const inst = drawCard(state, 'arrival', eventCtx(state), `arrival:${ev.serial}`);
    if (inst) state.pending = { inst, then: 'none' };
  }
}

/** Pay the entry; the eve feast follows. */
export function enter(state) {
  if (state.pending) return no('Answer what is in front of you first.');
  const r = payEntry(state);
  if (!r.ok) return r;
  state.monthRode.entered = true;
  const ev = state.event;
  if (state.patron && isPatronTourney(state, ev)) state.patron.attended = true;
  const inst = drawCard(state, 'feast', eventCtx(state), `feast:${ev.serial}`);
  if (inst) state.pending = { inst, then: 'openRound' };
  else openRound(state);
  return ok();
}

/** Decline to ride after all, and go home for the month. The road is spent. */
export function withdraw(state) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.ARRIVAL || state.pending) return no('You cannot withdraw now.');
  state.event = null;
  state.monthRode = null;
  endMonth(state);
  return ok();
}

/** One course of your bout. */
export function ride(state, choice) {
  if (state.pending) return no('Answer what is in front of you first.');
  const r = playCourse(state, choice);
  if (!r.ok) return r;
  if (r.done) boutMoment(state);
  return r;
}

/** Ride the rest of the bout as your squire calls it. */
export function rideOutBout(state) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.BOUT) return no('You are not in the lists.');
  let guard = 0;
  while (state.event.stage === STAGE.BOUT && guard++ < 10) ride(state, squireCall(state));
  return ok();
}

function boutMoment(state) {
  const ev = state.event;
  const context = momentFor(state);
  if (!context) return;
  const p = ev.rounds[ev.round][ev.current];
  const inst = drawCard(state, context, { ...eventCtx(state), opponent: p.b }, `moment:${ev.serial}:${ev.round}`);
  if (inst) state.pending = { inst, then: 'none' };
}

/** On from your bout's result. */
export function onward(state) {
  if (state.pending) return no('Answer what is in front of you first.');
  const r = continueTourney(state);
  if (!r.ok) return r;
  if (state.event.stage === STAGE.DONE) prizeMoment(state);
  return r;
}

function prizeMoment(state) {
  const ev = state.event;
  const prize = TIERS[ev.tier].prizes.champion;
  if (ev.placing !== 'champion' || prize < 240) return;
  const inst = drawCard(state, 'prize', { ...eventCtx(state), prize }, `prize:${ev.serial}`);
  if (inst) state.pending = { inst, then: 'none' };
}

/** Leave the tourney: on to the tourney the pas interrupted, or home for the month. */
export function leave(state) {
  const ev = state.event;
  if (!ev || ev.stage !== STAGE.DONE || state.pending) return no('The tourney is not over.');
  if (state.detour) {
    state.event = state.detour;
    state.detour = null;
    doArrive(state);
    return ok();
  }
  state.event = null;
  endMonth(state);
  return ok();
}

/** Train a skill for the month, wherever you are. */
export function train(state, skill) {
  if (!isFree(state)) return no('Finish what is in hand first.');
  clearNotices(state);
  if (!(skill in state.knight.stats)) return no('No such skill.');
  const before = state.knight.stats[skill];
  const rises = addMarks(state, skill, TRAINING.monthMarks);
  state.lastResult = {
    title: `A month at practice`,
    text: rises.length
      ? `A month of ${STAT_LABELS[skill].toLowerCase()} work, and it shows: ${STAT_LABELS[skill]} ${before} → ${state.knight.stats[skill]}.`
      : `A month of ${STAT_LABELS[skill].toLowerCase()} work. It will show, in time.`,
    lines: [`${STAT_LABELS[skill]} practice +${TRAINING.monthMarks}`],
  };
  endMonth(state);
  return ok();
}

/** A month's paid service: money, and nothing else. */
export function serve(state) {
  if (!isFree(state)) return no('Finish what is in hand first.');
  clearNotices(state);
  if (injured(state)) return no('Nobody hires a knight who cannot ride.');
  state.purse += SERVICE.wage;
  state.career.monthsServed = (state.career.monthsServed || 0) + 1;
  state.lastResult = {
    title: 'A month in service',
    text: 'You ride escort for a wool convoy and sleep in other men’s halls. Nobody sings about it.',
    lines: [`Purse +£${SERVICE.wage / 240}`],
  };
  endMonth(state);
  return ok();
}

/** Rest: heal, and let the month pass. */
export function rest(state) {
  if (!isFree(state)) return no('Finish what is in hand first.');
  clearNotices(state);
  const was = injured(state);
  if (was) state.knight.injuredUntil = Math.max(now(state), state.knight.injuredUntil - 1);
  state.lastResult = {
    title: 'A quiet month',
    text: was ? 'You rest, and the wound knits faster for it.' : 'You rest, see to your gear, and let the month pass.',
    lines: [],
  };
  endMonth(state);
  return ok();
}

/** The seats you can visit, and what the road costs. */
export function courtOptions(state) {
  const seats = [
    { town: WORLD.capital, host: crownHost(state, WORLD.king), faction: 'crown' },
    ...Object.values(GREAT_HOUSES).map((h) => ({ town: h.seat, host: h.name, faction: h.id })),
  ];
  return seats.map((s) => {
    const r = route(state.location, s.town);
    const cost = travelCost(state, r.days);
    return { ...s, days: r.days, cost, open: state.purse >= cost, reason: state.purse >= cost ? null : 'You cannot pay for the road.' };
  });
}

/** Go to court for the month. */
export function visitCourt(state, town) {
  if (!isFree(state)) return no('Finish what is in hand first.');
  clearNotices(state);
  const opt = courtOptions(state).find((o) => o.town === town);
  if (!opt) return no('There is no court there.');
  if (!opt.open) return no(opt.reason);
  state.purse -= opt.cost;
  state.location = town;
  state.lastResult = null;
  const inst = drawCard(state, 'court', { town, host: opt.host, hostFaction: opt.faction }, `court:${state.year}:${state.month}`);
  if (inst) {
    state.pending = { inst, then: 'endMonth', cost: opt.cost };
  } else {
    state.favour[opt.faction] = (state.favour[opt.faction] || 0) + 1;
    state.lastResult = { title: `At ${TOWNS[town].name}`, text: 'You are seen at court, which is most of what court is for.', lines: [`Favour of ${opt.host} +1`] };
    endMonth(state);
  }
  return ok();
}

export function passMonth(state) {
  if (!isFree(state)) return no('Finish what is in hand first.');
  clearNotices(state);
  state.lastResult = null;
  endMonth(state);
  return ok();
}

/** Nothing in hand: no tourney under way, no card waiting, and it is not winter. */
export function isFree(state) {
  return state.status === 'active' && state.phase === PHASE.MONTH && !state.event && !state.pending;
}

/** The month ends: the rest of the field rides; then the next month, or winter. */
export function endMonth(state) {
  if (state.status !== 'active') return;
  const events = state.calendar.filter((e) => e.month === state.month);
  const results = simulateMonth(state, events, state.monthRode);
  state.news = results.map((r) => ({ calId: r.calId, champion: knightById(state, r.champion)?.name || '' }));
  // A month without a tourney brings the horse back.
  if (!state.monthRode?.entered) {
    const back = CONDITION.recoverMonth + (state.retinue.includes('groom') ? CONDITION.recoverGroom : 0);
    state.horse.condition = Math.min(CONDITION.max, (state.horse.condition ?? CONDITION.max) + back);
  }
  state.monthRode = null;
  const notes = [];
  if (!atWar(state)) checkSummons(state, notes);
  if (notes.length) state.notices = [...(state.notices || []), ...notes];
  if (state.month >= LAST_MONTH) beginWinter(state);
  else {
    state.month += 1;
    openMonth(state);
  }
}

// ---------------------------------------------------------------------------
// The realm's calendar: what they are saying, who is invited, and the beats
// of the story that come whether you ride or not
// ---------------------------------------------------------------------------

/** A month opens: the talk in the halls, the heralds' letters, and the realm's beat. */
export function openMonth(state) {
  if (state.status !== 'active') return;
  state.realm.rumour = pickRumour(state);
  sendInvitations(state);
  realmBeat(state);
}

/** The beat due this month, if any: { key, beat }. */
export function beatDue(state) {
  const r = state.realm;
  for (const b of REALM_BEATS) {
    if (b.month !== state.month) continue;
    if (b.year != null) {
      if (r.war || b.year !== state.year) continue;
      return { key: `y${b.year}m${b.month}`, beat: b };
    }
    if (!r.war || r.war.decided || state.year - r.war.year !== b.war) continue;
    return { key: `w${b.war}m${b.month}`, beat: b };
  }
  return null;
}

function realmBeat(state) {
  const due = beatDue(state);
  if (!due || state.realm.beats[due.key]) return;
  state.realm.beats[due.key] = true;
  for (const id of due.beat.cards) {
    const inst = drawById(state, id);
    if (inst) { state.pending = { inst, then: 'none' }; return; }
  }
  // A battle is fought whether or not you are in it.
  if (due.beat.battle) {
    const b = fightBattle(state, 'absent');
    state.notices = [...(state.notices || []), ...battleLines(state, b)];
  }
}

// ---------------------------------------------------------------------------
// The court's claims on a month
// ---------------------------------------------------------------------------

/** Where your patron's summons calls you, and what the road costs. */
export function summonsOption(state) {
  if (!summonsOpen(state)) return null;
  const p = patronDef(state);
  const r = route(state.location, p.seat);
  const cost = travelCost(state, r.days);
  return { patron: p, town: p.seat, days: r.days, cost, until: state.patron.summons.until, open: state.purse >= cost,
    reason: state.purse >= cost ? null : 'You cannot pay for the road.' };
}

/** Answer your patron's summons: the month is his. */
export function answerSummons(state) {
  if (!isFree(state)) return no('Finish what is in hand first.');
  const o = summonsOption(state);
  if (!o) return no('There is no summons to answer.');
  if (!o.open) return no(o.reason);
  clearNotices(state);
  state.purse -= o.cost;
  state.location = o.town;
  state.patron.summons.answered = true;
  const inst = drawCard(state, 'summons', { town: o.town, host: o.patron.name, hostFaction: o.patron.id }, `summons:${state.year}`);
  if (inst) {
    state.pending = { inst, then: 'endMonth' };
  } else {
    state.favour[o.patron.id] += 1;
    state.lastResult = { title: `At ${TOWNS[o.town].name}`, text: `You answer the summons. ${cap(o.patron.lord)} has nothing for you after all, but notes that you came.`, lines: [`Favour of ${cap(o.patron.name)} +1`] };
    endMonth(state);
  }
  return ok();
}

/** A pilgrimage: a month, some silver, and the beginning of a mended name. */
export function pilgrimage(state) {
  if (!isFree(state)) return no('Finish what is in hand first.');
  if (!canPilgrimage(state)) return no('Your name needs no mending.');
  if (state.purse < PILGRIMAGE.cost) return no('You cannot pay for the road and the alms.');
  clearNotices(state);
  state.purse -= PILGRIMAGE.cost;
  state.honour = Math.min(20, state.honour + PILGRIMAGE.honour);
  state.knight.traits.pious = Math.min(20, state.knight.traits.pious + PILGRIMAGE.pious);
  state.lastResult = {
    title: 'A pilgrimage',
    text: `You walk the last three miles to ${PILGRIMAGE.shrine} barefoot, as penitents do. It is noticed, which is part of the point.`,
    lines: [`Purse \u2212\u00a3${PILGRIMAGE.cost / 240}`, `Honour +${PILGRIMAGE.honour}`, `Pious +${PILGRIMAGE.pious}`],
  };
  endMonth(state);
  return ok();
}

/** Leave your patron's service, in winter. */
export function resignService(state) {
  if (!inWinter(state)) return no('Service is given up in winter.');
  const r = leaveService(state);
  if (r.ok) state.winter.notes.push(r.text);
  return r;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function clearNotices(state) { state.notices = []; }

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

/** Answer the card in front of you. */
export function answer(state, index) {
  const pend = state.pending;
  if (!pend) return no('There is nothing to answer.');
  const where = { feast: 'At the feast', road: 'On the road', arrival: 'On arrival', prize: 'At the prize-giving' }[pend.inst.context] || 'In the lists';
  const res = answerCard(state, pend.inst, index, {
    marks: (skill, n) => addMarks(state, skill, n),
    event: (e, inst) => eventEffects(state, e, inst),
    // While a tourney is in hand, money goes through its ledger like any other.
    purse: state.event ? (amount) => charge(state, where, amount) : null,
  });
  state.lastResult = { title: null, ...res };
  state.pending = null;
  const detoured = !!state.detour && state.event?.tier === 'pas' && state.event.stage === STAGE.BOUT;
  switch (pend.then) {
    case 'arrive': if (!detoured) doArrive(state); break;
    case 'openRound': openRound(state); break;
    case 'endMonth': endMonth(state); break;
    default: break;
  }
  return ok({ result: res });
}

/** The effects only the tourney in hand can take. */
function eventEffects(state, e, inst) {
  const ev = state.event;
  if (!ev) return;
  const me = ev.riders[YOU];
  if (e.fatigue) me.fatigue = Math.max(0, me.fatigue + e.fatigue);
  if (e.wound && !me.wound) me.wound = 'light';
  if (e.intelField) {
    const unknown = Object.keys(ev.riders).filter((id) => id !== YOU && !(state.intel[id] > 0));
    for (const id of unknown.slice(0, e.intelField)) state.intel[id] = 1;
  }
  if (e.vow && inst.cast[e.vow]) ev.vows.push(inst.cast[e.vow]);
  if (e.wager) ev.wager = { amount: e.wager, settled: false };
  if (e.token) ev.token = true;
  if (e.largesse) charge(state, 'Largesse to the heralds and minstrels', -Math.round(inst.ctx.prize * e.largesse));
  if (e.travelDays) takeRoad(state, e.travelDays);
  if (e.pas && inst.cast[e.pas]) startPas(state, inst.cast[e.pas]);
}

/** A knight holds the bridge: three courses before you may go on. */
function startPas(state, rivalId) {
  const ev = state.event;
  const k = knightById(state, rivalId);
  const cal = {
    id: `${ev.calId}-pas`, tier: 'pas', year: ev.year, month: ev.month, feast: ev.feast,
    town: ev.town, name: `The pas held by ${k.name}`, host: { kind: 'knight', faction: null, name: k.name },
  };
  state.detour = ev;
  state.event = newTourney(state, cal, { riders: [rivalId] });
  state.event.stage = STAGE.FEAST;
  // The road so far: carry your fatigue into the pas.
  state.event.riders[YOU].fatigue = ev.riders[YOU].fatigue;
  openRound(state);
}

// ---------------------------------------------------------------------------
// Winter
// ---------------------------------------------------------------------------

function horseValue(q) { return q * q * HORSE_MARKET.pricePerQualitySq; }

export function beginWinter(state) {
  state.phase = PHASE.WINTER;
  const rng = streamFor(state.seed, state.year, 'winter');
  const ledger = [];
  const add = (label, amount) => { if (amount) { ledger.push({ label, amount }); state.purse += amount; } };
  const notes = [];

  // Money.
  const adv = state.advantage;
  add('Your family’s allowance', ALLOWANCE[adv] || 0);
  if (state.birth === 'eldest') add('The heir’s portion', ALLOWANCE.heirBonus);
  // The war's reckoning comes first: it decides whose lands you still hold.
  const settled = settle(state, add, notes);
  winterPatron(state, add, notes);
  for (const l of state.lands || []) {
    const m = manorDef(l.id);
    add(`Rents of ${m.name}`, m.income * 240);
  }
  if (state.squire) {
    const fee = SQUIRE_ORIGINS[state.squire.origin].fee;
    add(fee > 0 ? `${state.squire.name}’s father pays for his training` : `${state.squire.name}’s keep`, fee);
  }
  add('Your keep through the winter', -UPKEEP.living);
  add(`${state.horse.name}’s keep`, -UPKEEP.horse);
  for (const role of state.retinue) add(`Wages: your ${RETINUE[role].label.toLowerCase()}`, -RETINUE[role].wage);
  if (!state.retinue.includes('armourer')) add('Harness repairs', -UPKEEP.harness);
  // Men-at-arms are paid last, and a man who is not paid does not stay.
  if (state.company > 0) {
    const kept = Math.min(state.company, Math.max(0, Math.floor(state.purse / COMPANY.wage)));
    if (kept < state.company) notes.push(`${state.company - kept} of your men-at-arms went unpaid, and left your service.`);
    state.company = kept;
    add(`Wages: ${kept} men-at-arms`, -kept * COMPANY.wage);
  }

  // Age and the body.
  state.knight.age += 1;
  if (state.knight.age >= TRAINING.declineFrom) {
    for (const s of ['lance', 'seat', 'vigour']) {
      if (rng.chance(TRAINING.declineChance) && state.knight.stats[s] > 1) {
        state.knight.stats[s] -= 1;
        notes.push(`Age tells: your ${STAT_LABELS[s].toLowerCase()} slips to ${state.knight.stats[s]}.`);
      }
    }
  }

  // The horse: a winter at grass, and a year older.
  const h = state.horse;
  h.condition = CONDITION.max;
  h.age += 1;
  if (h.age >= HORSE_MARKET.oldAge) {
    h.quality = Math.max(4, h.quality - 1);
    notes.push(`${h.name} is ${h.age}, and slower than he was.`);
  } else if (h.quality < h.potential && h.age <= 12) {
    const grow = state.retinue.includes('groom') ? 2 : 1;
    h.quality = Math.min(h.potential, h.quality + grow);
    notes.push(`${h.name} comes on: quality ${h.quality}.`);
  }

  // The harness wears without an armourer.
  state.harness.years = (state.harness.years || 0) + 1;
  if (!state.retinue.includes('armourer') && state.harness.years % HARNESS.wearEveryYears === 0 && state.harness.quality > 6) {
    state.harness.quality -= 1;
    notes.push(`Your harness is showing its years: quality ${state.harness.quality}.`);
  }

  // The squire grows.
  if (state.squire) {
    const sq = state.squire;
    sq.age += 1;
    sq.years += 1;
    const teach = { lance: 'lance', seat: 'seat', wits: 'lore' }[sq.focus];
    const gain = 1 + (state.knight.stats[teach] >= 12 ? 1 : 0);
    sq[sq.focus] = Math.min(SQUIRE.maxSkill, sq[sq.focus] + gain);
    notes.push(`${sq.name} is ${sq.age}. His ${sq.focus} comes on by ${gain}.`);
  }

  // Everyone's renown fades a little; the field ages.
  state.renown = Math.round(state.renown * 0.9);
  updateEpithet(state, notes);
  notes.push(...winterField(state));

  state.winter = {
    ledger,
    notes,
    focus: 'lance',
    horses: horseOffers(state, rng),
    candidates: state.squire ? [] : squireCandidates(state, rng),
    manor: manorOffer(state),
    bought: [],
  };
  if (settled?.attainted) state.flags.push('attainted');
  const inst = settled?.attainted ? drawById(state, 'winter.pardon') : drawCard(state, 'winter', {}, `winter:${state.year}`);
  if (inst) state.pending = { inst, then: 'none' };

  if (state.purse < 0) {
    state.status = 'ruined';
    state.outcome = {
      kind: 'ruined', year: state.year,
      text: 'The winter accounts do not close. There is always a lord who needs a sword, and you will be selling yours.',
    };
  }
}

function horseOffers(state, rng) {
  return HORSE_MARKET.qualities.map((q) => {
    const age = rng.range(6, 10);
    return { id: `h${state.year}q${q}`, name: rng.pick(HORSE_NAMES), quality: q, potential: q, age, temper: rng.chance(0.35) ? 'hot' : 'steady', price: horseValue(q) };
  });
}

function squireCandidates(state, rng) {
  return Object.values(SQUIRE_ORIGINS).map((o) => ({
    origin: o.id,
    name: rng.pick(GIVEN_NAMES),
    age: rng.range(14, 16),
    lance: rng.range(5, 9),
    seat: rng.range(5, 9),
    wits: rng.range(5, 10),
    loyalty: o.id === 'poorKin' ? 8 : 5,
  }));
}

function inWinter(state) { return state.phase === PHASE.WINTER && !state.pending; }

export function setFocus(state, skill) {
  if (!inWinter(state)) return no('It is not winter.');
  if (!(skill in state.knight.stats)) return no('No such skill.');
  state.winter.focus = skill;
  return ok();
}

export function setSquireFocus(state, skill) {
  if (!inWinter(state) || !state.squire) return no('You have no squire to teach.');
  if (!['lance', 'seat', 'wits'].includes(skill)) return no('No such skill.');
  state.squire.focus = skill;
  return ok();
}

export function takeSquire(state, index) {
  if (!inWinter(state)) return no('Squires are taken in winter.');
  const c = state.winter.candidates[index];
  if (!c || state.squire) return no('There is no such boy, or you already have a squire.');
  state.squire = { ...c, years: 0, focus: 'lance' };
  state.winter.candidates = [];
  return ok();
}

/** Dub your squire a knight. He joins the field, and he remembers who did it. */
export function dubSquire(state) {
  const sq = state.squire;
  if (!inWinter(state) || !sq) return no('You have no squire.');
  if (sq.years < SQUIRE.knightAt) return no(`He has served ${sq.years} of the ${SQUIRE.knightAt} years a squire serves.`);
  const rng = streamFor(state.seed, state.year, 'dub');
  const id = `k${state.roster.nextId}`;
  state.roster.nextId += 1;
  const house = state.knight.house;
  state.roster.knights.push({
    id, given: sq.name, house, name: `Sir ${sq.name} ${house}`, province: state.province, age: sq.age,
    talent: (sq.lance + sq.seat) / 2, lance: sq.lance, seat: sq.seat, vigour: 10,
    horse: { quality: 10, temper: 'steady' }, archetype: 'plain', temperament: 'courteous',
    lineage: Math.max(4, state.lineage - 2), arms: randomArms(rng, 'crescent'),
    renown: 2, regard: 10, memory: ['You knighted him with your own hand.'],
    injuredUntil: 0, active: true, titles: 0,
  });
  state.renown += 3;
  state.honour = Math.min(20, state.honour + 2);
  state.book.push({
    serial: 0, year: state.year, tier: 'dubbing', name: 'A dubbing', town: '', placing: null, net: 0,
    text: `In the winter of his ${ordinal(state.year)} year, ${fullName(state.knight)} knighted his squire, ${sq.name}, who had served him ${sq.years} years.`,
  });
  state.squire = null;
  return ok();
}

export function hire(state, role) {
  if (!inWinter(state)) return no('Retainers are hired in winter.');
  if (!RETINUE[role] || state.retinue.includes(role)) return no('You already keep one.');
  if (state.purse < RETINUE[role].wage) return no('You cannot pay his first year’s wage.');
  state.purse -= RETINUE[role].wage;
  state.retinue.push(role);
  state.winter.bought.push(`Hired a ${RETINUE[role].label.toLowerCase()}, paid a year in advance`);
  return ok();
}

export function dismiss(state, role) {
  if (!inWinter(state)) return no('Retainers are let go in winter.');
  state.retinue = state.retinue.filter((r) => r !== role);
  return ok();
}

export function buyHarness(state, id) {
  if (!inWinter(state)) return no('The armourers take orders in winter.');
  const h = HARNESS.market.find((x) => x.id === id);
  if (!h || h.quality <= state.harness.quality) return no('That would be no better than what you have.');
  if (state.purse < h.price) return no('You cannot afford it.');
  state.purse -= h.price;
  state.harness = { quality: h.quality, years: 0, label: h.label };
  state.winter.bought.push(`${h.label}, ready by spring`);
  return ok();
}

/** Buy a horse at the fair; your old one goes to the dealer (or back to his owner). */
export function buyHorse(state, id) {
  if (!inWinter(state)) return no('The horse fair is held in winter.');
  const o = state.winter.horses.find((x) => x.id === id);
  if (!o) return no('That horse is sold.');
  const trade = state.horse.borrowed ? 0 : Math.round(horseValue(state.horse.quality) * HORSE_MARKET.sellShare);
  if (state.purse + trade < o.price) return no('You cannot afford him, even selling your own.');
  state.purse += trade - o.price;
  const was = state.horse;
  state.horse = { name: o.name, kind: 'bought', quality: o.quality, potential: o.potential, age: o.age, temper: o.temper, borrowed: false, condition: CONDITION.max };
  state.winter.horses = state.winter.horses.filter((x) => x.id !== id);
  state.flags = state.flags.filter((f) => f !== 'borrowedHorse');
  state.winter.bought.push(was.borrowed
    ? `Bought ${o.name}; ${was.name} went back to his owner`
    : `Bought ${o.name}; sold ${was.name} to the dealer`);
  return ok();
}

/** The borrowed horse: buy him from his owner at a fair price. */
export function keepBorrowedHorse(state) {
  if (!inWinter(state) || !state.horse.borrowed) return no('Your horse is your own.');
  const price = horseValue(state.horse.quality);
  if (state.purse < price) return no('You cannot afford his price.');
  state.purse -= price;
  state.horse.borrowed = false;
  state.flags = state.flags.filter((f) => f !== 'borrowedHorse');
  state.winter.bought.push(`Bought ${state.horse.name} from his owner`);
  return ok();
}

export function borrowedHorsePrice(state) { return horseValue(state.horse.quality); }
export function horseTradeIn(state) {
  return state.horse.borrowed ? 0 : Math.round(horseValue(state.horse.quality) * HORSE_MARKET.sellShare);
}

/** Spring: the winter's training, a new calendar, and home. */
export function endWinter(state) {
  if (!inWinter(state)) return no('It is not winter, or there is something to answer first.');
  if (state.status !== 'active') return no('The career is over.');
  // A borrowed horse must be bought or returned by spring.
  if (state.horse.borrowed && state.year >= 1) {
    state.horse = { name: 'a hired hack', kind: 'hack', quality: 7, potential: 7, age: 12, temper: 'steady', borrowed: false, condition: CONDITION.max };
    state.flags = state.flags.filter((f) => f !== 'borrowedHorse');
    state.winter.notes.push('The borrowed horse went back to his owner. You ride a hired hack until you buy another.');
  }
  const skill = state.winter.focus;
  const before = state.knight.stats[skill];
  addMarks(state, skill, TRAINING.winterMarks);
  state.log.push({ year: state.year, text: `Winter of the ${ordinal(state.year)} year: ${STAT_LABELS[skill]} ${before} → ${state.knight.stats[skill]}.` });
  state.year += 1;
  state.month = FIRST_MONTH;
  state.phase = PHASE.MONTH;
  state.location = PROVINCES[state.province].home;
  state.invitations = {};
  state.notices = [];
  const r = state.realm;
  if (!r.ruler) r.tension = tensionFor(state.year);
  if (state.year >= WAR_YEAR && !r.war) beginWar(state);
  else state.calendar = calendarFor(state, state.year);
  // A patron's obligations are the war's while it lasts.
  if (state.patron && atWar(state)) { state.patron.summons = null; state.patron.attended = true; }
  else if (state.patron) planSummons(state);
  state.lastResult = springWords(state);
  state.winter = null;
  openMonth(state);
  return ok();
}

function springWords(state) {
  const r = state.realm;
  if (atWar(state)) {
    return { title: `Spring, in the ${ordinal(state.year - r.war.year + 1)} year of the war`, text: 'The heralds have published no tourneys but the towns’ own jousts. The lords have other work for their knights.', lines: [] };
  }
  if (r.ruler) {
    const reign = state.year - r.coronationYear + 1;
    return { title: `Spring, in the ${ordinal(reign)} year of the new reign`, text: `You ride out from home. ${MONTHS[FIRST_MONTH]}.`, lines: [] };
  }
  return { title: `Spring, in the ${ordinal(WORLD.peaceYear + state.year - 1)} year of the peace`, text: `You ride out from home. ${MONTHS[FIRST_MONTH]}.`, lines: [] };
}

// ---------------------------------------------------------------------------
// Lands and men, in winter
// ---------------------------------------------------------------------------

/** Buy the manor on the market this winter. */
export function buyManor(state) {
  if (!inWinter(state)) return no('Land is bought in winter.');
  const m = state.winter.manor;
  if (!m) return no('No manor is for sale this winter.');
  if (state.purse < m.price) return no(`You need £${m.price / 240}.`);
  state.purse -= m.price;
  state.lands = state.lands || [];
  state.lands.push({ id: m.id, heldOf: null, how: 'bought', since: state.year });
  state.winter.manor = null;
  state.winter.bought.push(`Bought the manor of ${m.name}`);
  return ok();
}

/** Take on a man-at-arms, with his first year's wage. */
export function hireMan(state) {
  if (!inWinter(state)) return no('Men are hired in winter.');
  if (state.company >= companyMax(state)) return no(`You have room for ${companyMax(state)} men; more land would keep more.`);
  if (state.purse < COMPANY.wage) return no('You cannot pay his first year’s wage.');
  state.purse -= COMPANY.wage;
  state.company = (state.company || 0) + 1;
  state.winter.bought.push('Took on a man-at-arms, paid a year in advance');
  return ok();
}

export function dismissMan(state) {
  if (!inWinter(state)) return no('Men are let go in winter.');
  if (!state.company) return no('You keep no men-at-arms of your own.');
  state.company -= 1;
  return ok();
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
export { ordinal };
