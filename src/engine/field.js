// The field: forty-eight knights with careers of their own.
//
// They age, improve, decline and retire; they ride the calendar's tourneys
// whether you are there or not; they remember what you did to them. Their
// renown is earned in the same brackets, under the same ordinance, as yours —
// so the Roll of Arms is a real table and not a script.

import { streamFor } from './rng.js';
import { randomArms } from './heraldry.js';
import { newBout, runCourse, recovery } from './joust.js';
import { ROSTER, REGARD, TEMPERAMENTS, REACTIONS } from '../data/field.data.js';
import { ARCHETYPES } from '../data/joust.data.js';
import { TIERS, WOUNDS } from '../data/tourney.data.js';
import { GIVEN_NAMES, HOUSE_NAMES } from '../data/names.data.js';
import { TOWNS, PROVINCES } from '../data/world.data.js';
import { ROLL_LENGTH } from '../data/household.data.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const PROVINCE_IDS = Object.keys(PROVINCES);

function ageBonus(age) {
  if (age < 22) return -1;
  if (age < 25) return 0;
  if (age <= 34) return 2;
  if (age <= 38) return 0.5;
  return -1;
}

function newKnight(rng, id, province, age, usedNames) {
  let given; let house;
  do { given = rng.pick(GIVEN_NAMES); house = rng.pick(HOUSE_NAMES); } while (usedNames.has(`${given} ${house}`));
  usedNames.add(`${given} ${house}`);
  const talent = rng.normal(ROSTER.talent.mean, ROSTER.talent.sd);
  const b = ageBonus(age);
  const years = Math.max(0, age - 20);
  const renown = clamp(years * 1.3 * Math.max(0.2, (talent - 7) / 3) + rng.normal(0, 3), 0, 70);
  return {
    id,
    given, house,
    name: `Sir ${given} ${house}`,
    province,
    age,
    talent: Math.round(talent * 10) / 10,
    lance: clamp(talent + b + rng.normal(0, 1), 4, ROSTER.statMax),
    seat: clamp(talent + b + rng.normal(0, 1), 4, ROSTER.statMax),
    vigour: clamp(rng.normal(10, 2), 5, ROSTER.statMax),
    horse: { quality: clamp(rng.normal(10 + renown / 20, 2), 5, ROSTER.statMax), temper: rng.chance(0.3) ? 'hot' : 'steady' },
    archetype: rng.pick(ARCHETYPES).id,
    temperament: rng.pick(Object.keys(TEMPERAMENTS)),
    lineage: clamp(rng.normal(ROSTER.lineage.mean, ROSTER.lineage.sd), ROSTER.lineage.min, ROSTER.lineage.max),
    arms: randomArms(rng, rng.pick(['none', 'none', 'label', 'crescent'])),
    renown,
    regard: 0,
    memory: [],
    injuredUntil: 0,
    active: true,
    titles: 0,
  };
}

// Which house a knight is sworn to, if any. Drawn from its own stream, so
// adding allegiance did not change who the knights of an old save are.
const ALLEGIANCE = [
  { id: 'aumbry', weight: 25 }, { id: 'stane', weight: 25 }, { id: 'crown', weight: 15 }, { id: null, weight: 35 },
];

/** Swear every knight who has no allegiance yet to a house, or to none. */
export function assignAllegiance(state) {
  const rng = streamFor(state.seed, 0, 'allegiance');
  for (const k of state.roster.knights) {
    if (k.allegiance !== undefined) continue;
    k.allegiance = rng.weighted(ALLEGIANCE).id;
  }
}

/** The field at the start of a career. */
export function generateRoster(seed, playerName) {
  const rng = streamFor(seed, 0, 'roster');
  const used = new Set([playerName]);
  const roster = [];
  let n = 1;
  for (const p of PROVINCE_IDS) {
    for (let i = 0; i < ROSTER.perProvince; i++) {
      roster.push(newKnight(rng, `k${n}`, p, rng.range(ROSTER.age.min, ROSTER.age.max), used));
      n += 1;
    }
  }
  return { knights: roster, nextId: n };
}

/** The knights with a history with you from before you were knighted. */
export function seedHistory(state) {
  const rng = streamFor(state.seed, 0, 'history');
  const ks = [...state.roster.knights].sort((a, b) => b.renown - a.renown);
  const grudge = (k, text) => { k.regard = -6; k.memory.push(text); };
  const friend = (k, text) => { k.regard = 5; k.memory.push(text); };
  const flags = new Set(state.flags);
  if (flags.has('masterChampion')) {
    grudge(ks[rng.int(4)], `Your master, ${state.master.name}, unhorsed him three times and never let him forget it.`);
  }
  if (flags.has('grandfatherLegend')) {
    const old = ks.filter((k) => k.age >= 32 && k.regard === 0);
    if (old.length) grudge(rng.pick(old), 'His family and yours have been at odds since your grandfather’s day.');
  }
  if (flags.has('masterDisgraced')) {
    const witnesses = ks.filter((k) => k.age >= 30 && k.regard === 0);
    if (witnesses.length) grudge(rng.pick(witnesses), `He spoke against ${state.master.name} at Ambry Cross.`);
  }
  // Everyone has one friend from squirehood.
  const peers = state.roster.knights.filter((k) => k.age <= 25 && k.regard === 0);
  if (peers.length) friend(rng.pick(peers), 'You were squires together, and shared a blanket more than one winter.');
}

export function knightById(state, id) {
  return state.roster.knights.find((k) => k.id === id) || null;
}

export function isInjured(k, when) { return k.injuredUntil > when; }

/** An absolute month counter, for wounds that last across months and years. */
export function monthIndex(year, month) { return year * 12 + month; }

// ---------------------------------------------------------------------------
// Who rides
// ---------------------------------------------------------------------------

/** Draw a tourney's field from the roster. `exclude` holds ids already riding elsewhere. */
export function pickField(state, cal, n, exclude, rng) {
  const tier = TIERS[cal.tier];
  const now = monthIndex(cal.year, cal.month);
  const province = TOWNS[cal.town].province;
  const pool = state.roster.knights.filter((k) => k.active && !exclude.has(k.id) && !isInjured(k, now));
  const inBand = pool.filter((k) => k.renown >= tier.field.minRenown && k.renown <= tier.field.maxRenown);
  const weight = (k) => {
    let w = k.province === province ? tier.field.provinceWeight : 1;
    if (cal.tier === 'grand' || cal.tier === 'high') w *= Math.pow(k.renown + 5, 2);
    return w;
  };
  const chosen = [];
  const take = (from) => {
    const left = from.filter((k) => !chosen.includes(k));
    const items = left.map((k) => ({ k, weight: weight(k) }));
    while (chosen.length < n && items.length) {
      const pick = rng.weighted(items);
      chosen.push(pick.k);
      items.splice(items.indexOf(pick), 1);
    }
  };
  take(inBand);
  if (chosen.length < n) take(pool);
  return chosen;
}

/** A knight of the field as he rides on the day. */
export function riderFrom(k) {
  return {
    id: k.id,
    given: k.given, house: k.house,
    name: k.name,
    lance: k.lance, seat: k.seat, vigour: k.vigour,
    horse: { ...k.horse },
    renown: k.renown,
    archetype: k.archetype,
    temperament: k.temperament,
    arms: k.arms,
    grudge: k.regard <= REGARD.grudge,
    fatigue: 0,
    wound: null,
  };
}

// ---------------------------------------------------------------------------
// Tourneys you do not ride in still happen
// ---------------------------------------------------------------------------

/** Ride a whole bracket among riders. Returns per-rider results. Pure given rng. */
export function runBracket(riders, rng) {
  let alive = [...riders];
  const res = Object.fromEntries(riders.map((r) => [r.id, { boutsWon: 0, unhorses: 0, helms: 0, out: null, hurt: false }]));
  let roundsLeft = Math.log2(riders.length);
  while (alive.length > 1) {
    const next = [];
    for (let i = 0; i < alive.length; i += 2) {
      const A = alive[i];
      const B = alive[i + 1];
      const b = newBout(A.id, B.id);
      while (!b.done) {
        const r = runCourse(b, A, B, null, null, rng);
        for (const [rider, hit] of [[A, r.outB], [B, r.outA]]) {
          if (hit === 'unhorse' && rng.chance(WOUNDS.unhorsed * WOUNDS.seriousShare)) res[rider.id].hurt = true;
        }
      }
      const w = b.winner === 'a' ? A : B;
      const l = w === A ? B : A;
      res[w.id].boutsWon += 1;
      res[A.id].helms += b.helms.a;
      res[B.id].helms += b.helms.b;
      if (b.how === 'unhorse') res[w.id].unhorses += 1;
      res[l.id].out = roundsLeft;
      next.push(w);
      w.fatigue = Math.max(0, w.fatigue - recovery(w));
    }
    alive = next;
    roundsLeft -= 1;
  }
  res[alive[0].id].out = 0;
  return res;
}

/** Credit a bracket's results to the roster: renown and wounds. */
export function creditField(state, cal, res) {
  const tier = TIERS[cal.tier];
  const now = monthIndex(cal.year, cal.month);
  for (const [id, r] of Object.entries(res)) {
    const k = knightById(state, id);
    if (!k) continue;
    let gain = r.boutsWon * tier.renown.boutWon + r.unhorses * tier.renown.unhorse;
    if (r.out === 0) { gain += tier.renown.champion; k.titles += 1; }
    if (r.out === 1) gain += tier.renown.runnerUp;
    k.renown += gain;
    if (r.hurt) k.injuredUntil = now + WOUNDS.seriousMonths;
  }
}

/** Ride every tourney of the month that you are not riding in. */
export function simulateMonth(state, events, busy) {
  const results = [];
  for (const cal of events) {
    if (cal.id === busy?.calId) continue;
    const rng = streamFor(state.seed, cal.year, `sim:${cal.id}`);
    const exclude = new Set(busy?.riders || []);
    const n = TIERS[cal.tier].entrants;
    const field = pickField(state, cal, n, exclude, rng);
    if (field.length < n) continue;
    const riders = field.map(riderFrom);
    const res = runBracket(riders, rng);
    creditField(state, cal, res);
    const champ = Object.entries(res).find(([, r]) => r.out === 0)[0];
    results.push({ calId: cal.id, champion: champ });
  }
  return results;
}

// ---------------------------------------------------------------------------
// What they think of you
// ---------------------------------------------------------------------------

export function adjustRegard(state, id, delta, memory = null) {
  const k = knightById(state, id);
  if (!k) return;
  k.regard = Math.max(REGARD.min, Math.min(REGARD.max, k.regard + delta));
  if (memory) {
    k.memory.push(memory);
    if (k.memory.length > 4) k.memory.shift();
  }
}

export function regardLabel(regard) {
  if (regard >= REGARD.friend) return 'friend';
  if (regard <= REGARD.grudge) return 'grudge';
  if (regard >= 2) return 'well disposed';
  if (regard <= -2) return 'cool';
  return null;
}

/** How a rider takes his bout against you. */
export function reactionFor(k, result) {
  const table = REACTIONS[k.temperament] || REACTIONS.courteous;
  const r = table[result];
  return { regard: r.regard, text: r.text.replace('{name}', k.name) };
}

// ---------------------------------------------------------------------------
// Winter: the field ages, and the heralds publish the Roll
// ---------------------------------------------------------------------------

export function winterField(state) {
  const rng = streamFor(state.seed, state.year, 'field-winter');
  const used = new Set(state.roster.knights.map((k) => `${k.given} ${k.house}`));
  const notes = [];
  for (const k of state.roster.knights) {
    if (!k.active) continue;
    k.age += 1;
    k.renown = Math.round(k.renown * ROSTER.renownDecay);
    const drift = k.age < 25 ? rng.normal(0.6, 0.5) : k.age <= 33 ? rng.normal(0.1, 0.4) : rng.normal(-0.5, 0.5);
    k.lance = clamp(k.lance + drift, 3, ROSTER.statMax);
    k.seat = clamp(k.seat + (k.age < 25 ? rng.normal(0.6, 0.5) : k.age <= 33 ? rng.normal(0.1, 0.4) : rng.normal(-0.5, 0.5)), 3, ROSTER.statMax);
    const retire = k.age >= ROSTER.retireAlways || (k.age >= ROSTER.retireFrom && rng.chance(ROSTER.retireChance));
    if (retire) {
      k.active = false;
      if (k.regard !== 0 || k.titles > 0) notes.push(`${k.name} has hung up his lance.`);
    }
  }
  // New knights come up to replace the old.
  const active = state.roster.knights.filter((k) => k.active);
  const counts = Object.fromEntries(PROVINCE_IDS.map((p) => [p, active.filter((k) => k.province === p).length]));
  for (const p of PROVINCE_IDS) {
    while (counts[p] < ROSTER.perProvince) {
      const k = newKnight(rng, `k${state.roster.nextId}`, p, rng.range(19, 22), used);
      k.renown = rng.range(0, 3);
      k.allegiance = rng.weighted(ALLEGIANCE).id;
      state.roster.nextId += 1;
      state.roster.knights.push(k);
      counts[p] += 1;
    }
  }
  return notes;
}

/** The Roll of Arms: the field and you, by renown. */
export function rollOfArms(state, length = ROLL_LENGTH) {
  const rows = state.roster.knights.filter((k) => k.active).map((k) => ({ id: k.id, name: k.name, renown: k.renown, arms: k.arms, titles: k.titles }));
  rows.push({ id: 'you', name: 'You', renown: state.renown, arms: state.arms, titles: state.career.championships });
  rows.sort((a, b) => b.renown - a.renown || (a.id === 'you' ? -1 : b.id === 'you' ? 1 : 0));
  const rank = rows.findIndex((r) => r.id === 'you') + 1;
  return { rows: rows.slice(0, length), rank, of: rows.length };
}
