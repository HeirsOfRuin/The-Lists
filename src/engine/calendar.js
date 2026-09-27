// The year: which tourneys are held, where, and whether you may ride in them.
// And the roads between them.
//
// A calendar is a pure function of (seed, year), so a season reproduces
// exactly, and the knights of the field ride the same tourneys whether you are
// there to see them or not.

import { streamFor } from './rng.js';
import { TIERS, CALENDAR, LOCAL_HOSTS } from '../data/tourney.data.js';
import { TOWNS, ROADS, GREAT_HOUSES, FEASTS, MONTHS, WORLD } from '../data/world.data.js';
import { GIVEN_NAMES, HOUSE_NAMES } from '../data/names.data.js';

// ---------------------------------------------------------------------------
// Roads
// ---------------------------------------------------------------------------

const ADJ = (() => {
  const adj = {};
  for (const id of Object.keys(TOWNS)) adj[id] = [];
  for (const [a, b, d] of ROADS) {
    adj[a].push([b, d]);
    adj[b].push([a, d]);
  }
  return adj;
})();

/** Shortest road between two towns: { days, path: [townIds] }. */
export function route(from, to) {
  if (from === to) return { days: 0, path: [from] };
  const dist = { [from]: 0 };
  const prev = {};
  const open = new Set(Object.keys(TOWNS));
  while (open.size) {
    let u = null;
    for (const id of open) if (dist[id] != null && (u == null || dist[id] < dist[u])) u = id;
    if (u == null) break;
    open.delete(u);
    if (u === to) break;
    for (const [v, d] of ADJ[u]) {
      const alt = dist[u] + d;
      if (dist[v] == null || alt < dist[v]) { dist[v] = alt; prev[v] = u; }
    }
  }
  if (dist[to] == null) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev[path[0]]);
  return { days: dist[to], path };
}

// ---------------------------------------------------------------------------
// The calendar
// ---------------------------------------------------------------------------

export function yearCalendar(seed, year) {
  const rng = streamFor(seed, year, 'calendar');
  const events = [];
  const taken = new Set(); // "town|month"
  const add = (e) => { taken.add(`${e.town}|${e.month}`); events.push(e); };

  for (const g of CALENDAR.grand) {
    add({ tier: 'grand', month: g.month, town: g.town, host: { kind: 'crown', faction: 'crown', name: `King ${WORLD.king}` },
      name: `The King’s Tourney at ${FEASTS[g.month]}` });
  }
  for (const h of CALENDAR.high) {
    const house = GREAT_HOUSES[h.host];
    add({ tier: 'high', month: h.month, town: h.town, host: { kind: 'house', faction: h.host, name: house.name },
      name: `${cap(house.name)}’s Tourney` });
  }
  const plainTowns = Object.values(TOWNS).filter((t) => !t.seat).map((t) => t.id);
  const place = (months, towns) => {
    for (let tries = 0; tries < 50; tries++) {
      const month = rng.pick(months);
      const town = rng.pick(towns);
      if (!taken.has(`${town}|${month}`)) return { month, town };
    }
    return { month: rng.pick(months), town: rng.pick(towns) };
  };
  for (let i = 0; i < CALENDAR.regional.count; i++) {
    const { month, town } = place(CALENDAR.regional.months, plainTowns);
    const lord = `Sir ${rng.pick(GIVEN_NAMES)} ${rng.pick(HOUSE_NAMES)}`;
    add({ tier: 'regional', month, town, host: { kind: 'lord', faction: null, name: lord },
      name: `The Tourney at ${TOWNS[town].name}` });
  }
  const allTowns = Object.keys(TOWNS);
  for (let i = 0; i < CALENDAR.local.count; i++) {
    const { month, town } = place(CALENDAR.local.months, allTowns);
    const t = TOWNS[town];
    const hostName = rng.pick(t.city ? LOCAL_HOSTS.city : LOCAL_HOSTS.town);
    add({ tier: 'local', month, town, host: { kind: t.city ? 'guild' : 'town', faction: t.city ? 'cities' : null, name: hostName },
      name: t.city ? `The joust of ${hostName} at ${t.name}` : `The joust on the green at ${t.name}` });
  }
  events.sort((a, b) => a.month - b.month || tierRank(b.tier) - tierRank(a.tier) || (a.town < b.town ? -1 : 1));
  return events.map((e, i) => ({ ...e, id: `y${year}e${i + 1}`, year, feast: FEASTS[e.month] }));
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function tierRank(t) { return ['local', 'regional', 'high', 'grand'].indexOf(t); }

export function monthName(m) { return MONTHS[m]; }

// ---------------------------------------------------------------------------
// May you ride?
// ---------------------------------------------------------------------------

function clause(cond, state, host) {
  const need = [];
  const have = [];
  let ok = true;
  if (cond.renown != null) {
    need.push(`renown ${cond.renown}`);
    have.push(`renown ${state.renown}`);
    if (state.renown < cond.renown) ok = false;
  }
  if (cond.lineage != null) {
    need.push(`lineage ${cond.lineage}`);
    have.push(`lineage ${state.lineage}`);
    if (state.lineage < cond.lineage) ok = false;
  }
  if (cond.hostFavour != null) {
    const f = host.faction ? state.favour[host.faction] || 0 : 0;
    need.push(`the favour of ${host.name} at ${cond.hostFavour}`);
    have.push(`favour ${f}`);
    if (f < cond.hostFavour) ok = false;
  }
  if (cond.crownFavour != null) {
    need.push(`the Crown’s favour at ${cond.crownFavour}`);
    have.push(`Crown favour ${state.favour.crown || 0}`);
    if ((state.favour.crown || 0) < cond.crownFavour) ok = false;
  }
  return { ok, need: need.join(' and '), have: have.join(', ') };
}

/** Whether the heralds will admit you, and if not, why not in words. */
export function admitted(state, ev) {
  const rule = TIERS[ev.tier].eligibility;
  if (!rule) return { ok: true, reason: null };
  const clauses = rule.anyOf.map((c) => clause(c, state, ev.host));
  if (clauses.some((c) => c.ok)) return { ok: true, reason: null };
  return {
    ok: false,
    reason: `The heralds admit a knight with ${clauses.map((c) => c.need).join('; or ')}.`,
  };
}
