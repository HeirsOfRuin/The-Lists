// The year: which tourneys are held, where, and whether you may ride in them.
// And the roads between them.
//
// A calendar is a pure function of (seed, year), so a season reproduces
// exactly, and the knights of the field ride the same tourneys whether you are
// there to see them or not. The first year also knows where a new knight rides
// out from, so that his first month has a joust he can reach.

import { streamFor } from './rng.js';
import { TIERS, CALENDAR, LOCAL_HOSTS, GREAT_PAS } from '../data/tourney.data.js';
import { TOWNS, ROADS, GREAT_HOUSES, FEASTS, MONTHS, WORLD } from '../data/world.data.js';
import { GIVEN_NAMES, HOUSE_NAMES } from '../data/names.data.js';
import { FAIRS } from '../data/life.data.js';

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

// A new knight's first month: if no joust of the month is within this many
// days of his home, the heralds hold one nearer. One of the year's local
// jousts is moved, so the calendar keeps its shape.
export const DEBUT = { days: 3 };

export function yearCalendar(seed, year, home = null) {
  const rng = streamFor(seed, year, 'calendar');
  const events = [];
  const taken = new Set(); // "town|month"
  const add = (e) => { taken.add(`${e.town}|${e.month}`); events.push(e); };
  // The fairs hold their towns in their months; no tourney is placed on them.
  for (const f of Object.values(FAIRS)) taken.add(`${f.town}|${f.month}`);

  for (const g of CALENDAR.grand) {
    add({ tier: 'grand', month: g.month, town: g.town, host: { kind: 'crown', faction: 'crown', name: `King ${WORLD.king}` },
      name: `The King’s Tourney at ${FEASTS[g.month]}` });
  }
  for (const h of CALENDAR.high) {
    const house = GREAT_HOUSES[h.host];
    add({ tier: 'high', month: h.month, town: h.town, host: { kind: 'house', faction: h.host, name: house.name },
      name: `${cap(house.name)}’s Tourney` });
  }
  if (year === GREAT_PAS.year) {
    add({ tier: 'greatpas', month: GREAT_PAS.month, town: GREAT_PAS.town, host: { kind: 'knight', faction: null, name: 'the champion of the Roll' },
      name: `${GREAT_PAS.name} at ${TOWNS[GREAT_PAS.town].name}` });
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
  const out = events.map((e, i) => ({ ...e, id: `y${year}e${i + 1}`, year, feast: FEASTS[e.month] }));
  // The fairs keep their own days, and their own ids, so the tourneys' ids
  // are what they were before there were fairs.
  for (const f of Object.values(FAIRS)) {
    out.push({ tier: 'fair', fair: f.id, month: f.month, town: f.town, host: { kind: 'fair', faction: null, name: f.host },
      name: f.name, id: `y${year}f${f.id}`, year, feast: FEASTS[f.month] });
  }
  out.sort((a, b) => a.month - b.month);
  return year === 1 && home ? withDebut(out, home) : out;
}

/** The first year, with a local joust in its first month near `home`. */
function withDebut(cal, home) {
  const first = Math.min(...CALENDAR.local.months);
  const near = (e) => route(home, e.town).days <= DEBUT.days;
  if (cal.some((e) => e.month === first && e.tier === 'local' && near(e))) return cal;
  const locals = cal.filter((e) => e.tier === 'local');
  // The first month's own joust if it has one, or else the year's last, brought forward.
  const moving = locals.find((e) => e.month === first) || locals[locals.length - 1];
  const taken = new Set(cal.filter((e) => e !== moving && e.month === first).map((e) => e.town));
  const town = Object.keys(TOWNS).filter((id) => !taken.has(id))
    .sort((a, b) => route(home, a).days - route(home, b).days || (a < b ? -1 : 1))[0];
  const t = TOWNS[town];
  const hostName = (t.city ? LOCAL_HOSTS.city : LOCAL_HOSTS.town)[0];
  const moved = {
    ...moving, month: first, town, feast: FEASTS[first],
    host: { kind: t.city ? 'guild' : 'town', faction: t.city ? 'cities' : null, name: hostName },
    name: t.city ? `The joust of ${hostName} at ${t.name}` : `The joust on the green at ${t.name}`,
  };
  return cal.map((e) => (e === moving ? moved : e)).sort((a, b) => a.month - b.month);
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function tierRank(t) { return ['local', 'regional', 'high', 'grand'].indexOf(t); }

export function monthName(m) { return MONTHS[m]; }
