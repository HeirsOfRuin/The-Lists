// The fairs: the popinjay at Saltings Quay, and the Downs Race at Othery.
//
// Neither is a tourney. The popinjay is three rounds of crossbow shots at a
// wooden bird on a pole; the race is two miles of down against the copers'
// horses. In both, the chance shown on a choice is the chance it is rolled at:
// the popinjay's from one function of skill, mark and wind, the race's by
// integrating the same normal draws the race is run with.

import { streamFor } from './rng.js';
import { FAIRS, POPINJAY, GUILD_SHOOTERS, RACE, COPERS } from '../data/life.data.js';
import { CONDITION } from '../data/household.data.js';
import { TOWNS } from '../data/world.data.js';
import { learn } from './lore.js';
import { monthIndex } from './field.js';

export const YOU = 'you';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** A day at a fair, begun on arrival. */
export function newFair(state, cal) {
  learn(state, cal.fair);
  return cal.fair === 'popinjay' ? newPopinjay(state, cal) : newRace(state, cal);
}

// ---------------------------------------------------------------------------
// The popinjay
// ---------------------------------------------------------------------------

/** Your shooting: a steady arm and a feel for the wind. */
export function yourAim(state) {
  const k = state.knight.stats;
  return POPINJAY.perVigour * (k.vigour - 10) + POPINJAY.perLore * (k.lore - 10);
}

/** The chance of a hit, for anyone: the mark, the shooter, the wind, and whether he waited for a lull. */
export function popinjayOdds(aim, target, windMod, lull = false) {
  const P = POPINJAY;
  const w = windMod * (lull ? 1 - P.lull : 1);
  return clamp(P.targets[target].base + aim + w, P.minHit, P.maxHit);
}

function windFor(state, f) {
  const rng = streamFor(state.seed, f.year, `popinjay:${f.calId}:wind:${f.round}`);
  const entries = Object.entries(POPINJAY.wind).map(([id, w]) => ({ id, ...w }));
  const w = rng.weighted(entries);
  return { id: w.id, label: w.label, mod: w.mod };
}

function newPopinjay(state, cal) {
  const P = POPINJAY;
  const rng = streamFor(state.seed, cal.year, `popinjay:${cal.id}`);
  const shooters = rng.shuffle([...GUILD_SHOOTERS]).slice(0, P.guildsmen).map((name, i) => ({
    id: `g${i}`, name, guild: true, bold: i === 0, aim: Math.round((P.guildEdge + rng.normal(0, 0.03)) * 1000) / 1000, points: 0,
  }));
  const gents = rng.shuffle(state.roster.knights.filter((k) => k.active)).slice(0, P.field - P.guildsmen);
  for (const k of gents) shooters.push({ id: k.id, name: k.name, guild: false, bold: false, aim: P.perVigour * (k.vigour - 10), points: 0 });
  shooters.push({ id: YOU, name: 'You', guild: false, bold: false, aim: yourAim(state), points: 0 });
  const f = {
    kind: 'popinjay', calId: cal.id, name: cal.name, town: cal.town, year: cal.year, stage: 'shoot',
    round: 0, shooters, order: rng.shuffle(shooters.map((s) => s.id)), log: [], down: null, winner: null, result: null,
  };
  f.wind = windFor(state, f);
  return f;
}

function shooter(f, id) { return f.shooters.find((s) => s.id === id); }

/** The order of shooting this round: it turns by one each round. */
export function roundOrder(f) {
  const n = f.order.length;
  return f.order.map((_, i) => f.order[(i + f.round) % n]);
}

/**
 * What a rival aims at: the guild's master always at the bird; in the last
 * round, any man too far behind to catch up on feathers; otherwise a guildsman
 * at a wing, a gentleman at the tail. Decided on the standings as the round
 * opens, so the risk of the bird coming down before you can be counted.
 */
export function rivalTarget(f, s) {
  const last = f.round === POPINJAY.rounds - 1;
  const top = Math.max(...f.shooters.map((x) => x.points));
  if (s.bold) return 'bird';
  if (last && s.points < top - 2) return 'bird';
  return s.guild ? 'wing' : 'tail';
}

/**
 * What the screen shows before you shoot: your chance at each mark, and the
 * chance the bird is down before your turn comes, shooting now or waiting.
 */
export function popinjayPreview(state) {
  const f = state.fair;
  if (!f || f.kind !== 'popinjay' || f.stage !== 'shoot') return null;
  const me = shooter(f, YOU);
  const order = roundOrder(f);
  const risk = (before) => 1 - before.reduce((t, id) => {
    const s = shooter(f, id);
    return rivalTarget(f, s) === 'bird' ? t * (1 - popinjayOdds(s.aim, 'bird', f.wind.mod)) : t;
  }, 1);
  const beforeNow = order.slice(0, order.indexOf(YOU));
  const beforeLull = order.filter((id) => id !== YOU);
  const marks = (lull) => Object.fromEntries(Object.keys(POPINJAY.targets).map((t) => [t, popinjayOdds(me.aim, t, f.wind.mod, lull)]));
  return {
    now: { marks: marks(false), before: beforeNow.length, risk: risk(beforeNow) },
    lull: { marks: marks(true), before: beforeLull.length, risk: risk(beforeLull) },
  };
}

/** Shoot your round. `choice` is { target, lull }. */
export function shootPopinjay(state, choice) {
  const f = state.fair;
  if (!f || f.kind !== 'popinjay' || f.stage !== 'shoot') return { ok: false, reason: 'You are not at the butts.' };
  if (!POPINJAY.targets[choice.target]) return { ok: false, reason: 'No such mark.' };
  const rng = streamFor(state.seed, f.year, `popinjay:${f.calId}:round:${f.round}`);
  const base = roundOrder(f);
  const seq = choice.lull ? [...base.filter((id) => id !== YOU), YOU] : base;
  const targets = Object.fromEntries(f.shooters.map((s) => [s.id, s.id === YOU ? choice.target : rivalTarget(f, s)]));
  const shots = [];
  for (const id of seq) {
    const s = shooter(f, id);
    const t = targets[id];
    const p = popinjayOdds(s.aim, t, f.wind.mod, id === YOU && !!choice.lull);
    const hit = rng.next() < p;
    shots.push({ id, name: s.name, target: t, hit });
    if (hit && t === 'bird') { f.down = id; break; }
    if (hit) s.points += POPINJAY.targets[t].points;
  }
  f.log.push({ round: f.round, wind: f.wind.label, shots });
  if (f.down) return finishPopinjay(state, f.down);
  f.round += 1;
  if (f.round >= POPINJAY.rounds) {
    const top = Math.max(...f.shooters.map((s) => s.points));
    const tied = f.shooters.filter((s) => s.points === top);
    const off = streamFor(state.seed, f.year, `popinjay:${f.calId}:shootoff`);
    return finishPopinjay(state, off.pick(tied).id, tied.length > 1);
  }
  f.wind = windFor(state, f);
  return { ok: true };
}

function finishPopinjay(state, winnerId, shootOff = false) {
  const f = state.fair;
  const F = FAIRS.popinjay;
  const me = shooter(f, YOU);
  const w = shooter(f, winnerId);
  f.winner = winnerId;
  f.stage = 'done';
  const won = winnerId === YOU;
  const lines = [];
  let text;
  const town = TOWNS[f.town].name;
  const name = `Sir ${state.knight.given} ${state.knight.house}`;
  if (won) {
    state.purse += F.prize;
    state.renown += F.renown;
    for (const [k, v] of Object.entries(F.favour)) state.favour[k] = (state.favour[k] || 0) + v;
    state.archers = (state.archers || 0) + F.archers;
    state.popinjayKing = f.year;
    lines.push(`Prize: ${F.prizeLabel}`, `Renown +${F.renown}`, `Favour of the Cities +${F.favour.cities}`, `${F.archers} of the guild’s crossbowmen take your service, for the honour of it`);
    text = f.down === YOU
      ? `At ${town}, on the feast of Whitsun, ${name} brought the popinjay down from its pole with his ${ordinalWord(f.round)} bolt, and was King of the Popinjay for a year.`
      : `At ${town}, on the feast of Whitsun, nobody brought the popinjay down, and ${name} had the most feathers${shootOff ? ' after a shoot-off' : ''}. He was King of the Popinjay for a year.`;
  } else {
    lines.push(`You took ${me.points} point${me.points === 1 ? '' : 's'}.`);
    text = f.down
      ? `At ${town}, at the popinjay, ${w.name} brought the bird down in the ${ordinalWord(f.round)} round. ${name} took ${me.points} feather${me.points === 1 ? '' : 's'}.`
      : `At ${town}, at the popinjay, nobody brought the bird down, and ${w.name} had the most feathers${shootOff ? ' after a shoot-off' : ''}. ${name} took ${me.points}.`;
  }
  f.result = { won, winner: w.name, points: me.points, lines, text };
  state.book.push({ serial: 0, year: f.year, tier: 'fair', name: f.name, feast: 'Whitsun', town, placing: won ? 'champion' : null, net: won ? F.prize - F.entry : -F.entry, text });
  return { ok: true, done: true };
}

function ordinalWord(i) { return ['first', 'second', 'third', 'fourth'][i] || `${i + 1}th`; }

// ---------------------------------------------------------------------------
// The Downs Race
// ---------------------------------------------------------------------------

function newRace(state, cal) {
  const R = RACE;
  const rng = streamFor(state.seed, cal.year, `race:${cal.id}`);
  const q = R.coperQuality;
  const runners = rng.shuffle([...COPERS]).slice(0, R.field).map((name, i) => ({
    id: `c${i}`, name, quality: clamp(Math.round(rng.normal(q.mean, q.sd)), q.min, q.max),
  }));
  return { kind: 'race', calId: cal.id, name: cal.name, town: cal.town, year: cal.year, month: cal.month, stage: 'plan', runners, result: null };
}

const COPER_SEAT = 12; // the copers' lads ride light

function meanTime(quality, seat, below) {
  return RACE.base - RACE.perQuality * (quality - 10) - RACE.perSeat * (seat - 10) + RACE.perCondition * below;
}

/** Each runner's time as a normal: { mu, sd }. Yours depends on the plan. */
export function raceDists(state, planId) {
  const f = state.fair;
  const plan = RACE.plans[planId];
  const h = state.horse;
  const below = CONDITION.max - (h.condition ?? CONDITION.max);
  const you = { id: YOU, mu: meanTime(h.quality, state.knight.stats.seat, below) + plan.mean, sd: RACE.sd * plan.sd };
  const others = f.runners.map((r) => ({ id: r.id, mu: meanTime(r.quality, COPER_SEAT, 0), sd: RACE.sd }));
  return { you, others, fall: plan.fall };
}

// The normal distribution, by the Abramowitz and Stegun approximation to erf.
function erf(x) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
export function normCdf(x, mu, sd) { return 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2))); }
function normPdf(x, mu, sd) { const z = (x - mu) / sd; return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI)); }

/**
 * The chance a runner finishes first, and in the first two, against the rest:
 * the integral over his time of the chance the others are slower.
 */
export function finishChances(me, others, steps = 800) {
  const lo = me.mu - 7 * me.sd;
  const hi = me.mu + 7 * me.sd;
  const dt = (hi - lo) / steps;
  let win = 0;
  let place = 0;
  for (let i = 0; i <= steps; i++) {
    const t = lo + i * dt;
    const w = (i === 0 || i === steps ? 0.5 : 1) * normPdf(t, me.mu, me.sd) * dt;
    const F = others.map((o) => normCdf(t, o.mu, o.sd));
    const allSlower = F.reduce((p, x) => p * (1 - x), 1);
    let oneFaster = 0;
    for (let k = 0; k < F.length; k++) {
      let p = F[k];
      for (let j = 0; j < F.length; j++) if (j !== k) p *= 1 - F[j];
      oneFaster += p;
    }
    win += w * allSlower;
    place += w * (allSlower + oneFaster);
  }
  return { win, place };
}

/** Each plan with its chance of winning, of the first two, and of a fall: shown, and rolled. */
export function raceOdds(state) {
  return Object.entries(RACE.plans).map(([id, plan]) => {
    const d = raceDists(state, id);
    const c = finishChances(d.you, d.others);
    return { id, ...plan, win: (1 - d.fall) * c.win, place: (1 - d.fall) * c.place, fall: d.fall };
  });
}

function gauss(rng) {
  const u = Math.max(rng.next(), Number.EPSILON);
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Run the race on the plan you chose. */
export function runRace(state, planId) {
  const f = state.fair;
  if (!f || f.kind !== 'race' || f.stage !== 'plan') return { ok: false, reason: 'You are not at the start.' };
  if (!RACE.plans[planId]) return { ok: false, reason: 'No such plan.' };
  const F = FAIRS.race;
  const d = raceDists(state, planId);
  const rng = streamFor(state.seed, f.year, `race:${f.calId}:run`);
  const fell = rng.next() < d.fall;
  const times = [{ id: YOU, t: d.you.mu + d.you.sd * gauss(rng) }, ...d.others.map((o) => ({ id: o.id, t: o.mu + o.sd * gauss(rng) }))];
  const order = times.filter((x) => !(fell && x.id === YOU)).sort((a, b) => a.t - b.t).map((x) => x.id);
  if (fell) order.push(YOU);
  const place = order.indexOf(YOU) + 1;
  const h = state.horse;
  h.condition = Math.max(0, (h.condition ?? CONDITION.max) - F.condition - (fell ? 2 : 0));
  const lines = [];
  let hurt = false;
  if (fell && rng.next() < RACE.hurt) {
    hurt = true;
    state.knight.injuredUntil = Math.max(state.knight.injuredUntil || 0, monthIndex(f.year, f.month) + 1);
  }
  const name = `Sir ${state.knight.given} ${state.knight.house}`;
  const town = TOWNS[f.town].name;
  const winner = order[0] === YOU ? name : f.runners.find((r) => r.id === order[0]).name;
  let text;
  let net = -F.entry;
  if (place === 1) {
    state.purse += F.prize;
    state.renown += F.renown;
    net += F.prize;
    lines.push(`Prize: ${F.prizeLabel}`, `Renown +${F.renown}`);
    text = `At ${town}, at Michaelmas, ${name} rode ${h.name} in the Downs Race and won it by ${margin(times, order)}, against the copers’ horses.`;
  } else if (place === 2) {
    state.purse += F.placed;
    net += F.placed;
    lines.push('Second: two pounds');
    text = `At ${town}, at Michaelmas, ${name} rode ${h.name} in the Downs Race and was second to ${winner}.`;
  } else if (fell) {
    lines.push(hurt ? `${h.name} went down on the turn, and you with him. You are hurt, and will not ride for a month.` : `${h.name} went down on the turn. You both got up.`);
    text = `At ${town}, at Michaelmas, ${name} rode in the Downs Race and came down on the turn.`;
  } else {
    lines.push(`You finished ${ordinalWord(place - 1)} of ${order.length}.`);
    text = `At ${town}, at Michaelmas, ${name} rode ${h.name} in the Downs Race and finished ${ordinalWord(place - 1)}. ${winner} won it.`;
  }
  lines.push(`${h.name}’s condition −${F.condition + (fell ? 2 : 0)}`);
  f.stage = 'done';
  f.result = { won: place === 1, place, fell, hurt, winner, plan: planId, lines, text,
    order: order.map((id) => (id === YOU ? 'You' : f.runners.find((r) => r.id === id).name)) };
  state.book.push({ serial: 0, year: f.year, tier: 'fair', name: f.name, feast: 'Michaelmas', town, placing: place === 1 ? 'champion' : null, net, text });
  return { ok: true, done: true };
}

function margin(times, order) {
  const t = Object.fromEntries(times.map((x) => [x.id, x.t]));
  const gap = t[order[1]] - t[order[0]];
  if (gap < 0.5) return 'a nose';
  if (gap < 1.5) return 'a neck';
  if (gap < 4) return 'a length';
  return 'a distance';
}
