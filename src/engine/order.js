// The Company of the Swan: twenty-four stalls, who holds them, and the vote
// at Candlemas that fills an empty one.
//
// Eight stalls are the great lords', sixteen the knights'. A stall falls empty
// when its companion dies, falls in a battle, or is put out for disgrace. At
// Candlemas every companion names one candidate; the name most of them give
// fills the stall, and the king breaks a tie. How a companion weighs a
// candidate is a sum the winter screen shows the parts of, plus a draw of
// noise; the chance of election shown is the same vote, run many times.

import { streamFor } from './rng.js';
import { ORDER, ORDER_LORDS, NEW_LORDS } from '../data/life.data.js';
import { CLAIMANTS } from '../data/realm.data.js';
import { knightById } from './field.js';
import { sideOf } from './realm.js';
import { learn } from './lore.js';

export const YOU_SEAT = 'you';

/** The Company when a career begins: the eight lords, and the sixteen knights the field most honours. */
export function orderFor(state) {
  const ks = state.roster.knights
    .filter((k) => k.active && k.age >= 28)
    .sort((a, b) => (b.renown + 1.5 * b.lineage) - (a.renown + 1.5 * a.lineage) || (a.id < b.id ? -1 : 1))
    .slice(0, ORDER.knightSeats);
  const stalls = [
    ...ORDER_LORDS.map((l) => ({ holder: { kind: 'lord', id: l.id, name: l.name, faction: l.faction }, since: 0, was: null })),
    ...ks.map((k) => ({ holder: { kind: 'knight', id: k.id }, since: 0, was: null })),
  ];
  state.order = { stalls, companion: false, since: null, table: null, purged: false, elections: [] };
}

export function holderName(state, h) {
  if (!h) return null;
  if (h.kind === 'lord') return h.name;
  if (h.kind === YOU_SEAT) return 'you';
  return knightById(state, h.id)?.name || 'a knight';
}

export function vacancies(state) { return (state.order?.stalls || []).filter((s) => !s.holder); }
export function isCompanion(state) { return !!state.order?.companion; }

/** The knights of the field who hold a stall. */
export function companionIds(state) {
  return new Set((state.order?.stalls || []).filter((s) => s.holder?.kind === 'knight').map((s) => s.holder.id));
}

function deathChance(age) {
  const D = ORDER.death;
  if (age < D.from) return D.base;
  return Math.min(D.max, D.base + (age - D.from) * D.perYear);
}

function vacate(st, name) {
  st.was = name;
  st.holder = null;
}

/**
 * The winter's work in the Company: the old companions age and some die; the
 * fallen of the year are counted; a companion without honour is put out; and
 * after the war the beaten house's lords lose their stalls to the new crown's.
 */
export function orderWinter(state, notes) {
  const o = state.order;
  if (!o) return;
  const rng = streamFor(state.seed, state.year, 'order-winter');
  for (const st of o.stalls) {
    const h = st.holder;
    if (!h || h.kind !== 'knight') continue;
    const k = knightById(state, h.id);
    // The field ages its riders; a companion who has left the lists ages here.
    if (k && !k.active && !k.fell) k.age += 1;
    const roll = rng.next();
    if (!k || k.fell) {
      vacate(st, k?.name || 'a knight');
      notes.push(`${k?.name || 'A companion'} fell in the war. His stall in the Company of the Swan is empty.`);
    } else if (roll < deathChance(k.age)) {
      k.active = false;
      k.dead = true;
      vacate(st, k.name);
      notes.push(`${k.name}, Companion of the Swan, died this winter at ${k.age}. His stall is empty.`);
    }
  }
  // A companion who has lost his good name is put out of the Company.
  if (o.companion && state.honour < ORDER.degradeBelow) {
    const st = o.stalls.find((s) => s.holder?.kind === YOU_SEAT);
    if (st) vacate(st, 'you');
    o.companion = false;
    o.degraded = state.year;
    state.renown = Math.max(0, state.renown - 10);
    notes.push('The chapter has put you out of the Company of the Swan. The heralds took down your helm from above your stall and threw it into the ditch, as the statutes say.');
    state.book.push({ serial: 0, year: state.year, tier: 'order', name: 'The Company of the Swan', town: '', placing: null, net: 0,
      text: `In the winter of his ${ordinal(state.year)} year, Sir ${state.knight.given} ${state.knight.house} was put out of the Company of the Swan for the loss of his good name.` });
  }
  // After the war: the new crown gives the beaten lords' stalls to its own.
  const r = state.realm;
  if (r?.ruler && !o.purged) {
    o.purged = true;
    const loser = r.ruler === 'aumbry' ? 'stane' : 'aumbry';
    const given = [];
    let i = 0;
    for (const st of o.stalls) {
      if (st.holder?.kind !== 'lord' || st.holder.faction !== loser) continue;
      const name = NEW_LORDS[r.ruler][i % NEW_LORDS[r.ruler].length];
      given.push(`${st.holder.name}’s to ${name}`);
      st.was = st.holder.name;
      st.holder = { kind: 'lord', id: `new${i}`, name, faction: r.ruler };
      st.since = state.year;
      i += 1;
    }
    if (given.length) notes.push(`${CLAIMANTS[r.ruler].crowned} has given the attainted lords’ stalls in the Company of the Swan: ${given.join('; ')}.`);
  }
  o.table = null;
}

// ---------------------------------------------------------------------------
// Standing for an empty stall
// ---------------------------------------------------------------------------

/** Whether the chapter would hear your name, and if not, why. */
export function eligibility(state) {
  const E = ORDER.eligible;
  if (isCompanion(state)) return { ok: false, reason: 'You already hold a stall.' };
  if (state.order?.degraded) return { ok: false, reason: 'The chapter put you out. It does not take a man back.' };
  if (state.flags.includes('attainted')) return { ok: false, reason: 'An attainted man cannot sit in the king’s Company.' };
  const lack = [];
  if (state.year < E.years) lack.push(`${E.years} years a knight (you have ${state.year})`);
  if (state.honour < E.honour) lack.push(`honour ${E.honour} (yours is ${state.honour})`);
  if (state.renown < E.renown) lack.push(`renown ${E.renown} (yours is ${state.renown})`);
  if (lack.length) return { ok: false, reason: `The chapter hears only the names of knights of standing, without reproach and of some renown: ${lack.join(', ')}.` };
  return { ok: true, reason: null };
}

/** The field's candidates for an empty stall: its strongest names who hold none. */
export function candidatesFor(state) {
  const holders = companionIds(state);
  return state.roster.knights
    .filter((k) => k.active && !holders.has(k.id) && k.renown >= ORDER.candidateRenown && k.age >= 25)
    .sort((a, b) => b.renown - a.renown || (a.id < b.id ? -1 : 1))
    .slice(0, ORDER.candidates)
    .map((k) => k.id);
}

/** Who votes: every stall holder but you. */
function voters(state) {
  return state.order.stalls.filter((s) => s.holder && s.holder.kind !== YOU_SEAT).map((s) => s.holder);
}

function candidateOf(state, id) {
  if (id === YOU_SEAT) {
    return {
      id, renown: state.renown, years: state.year, prizes: state.career.championships || 0, side: sideOf(state), lineage: state.lineage,
    };
  }
  const k = knightById(state, id);
  return { id, renown: k.renown, years: Math.max(0, k.age - ORDER.vote.knightedAt), prizes: k.titles || 0, side: k.allegiance || null, lineage: k.lineage };
}

function voterSide(state, h) {
  if (h.kind === 'lord') return h.faction;
  return knightById(state, h.id)?.allegiance || null;
}

/**
 * How a companion weighs a candidate, before the noise: the parts, so the
 * screen can say why. `table` adds the regard a table kept at Candlemas would buy.
 */
export function weigh(state, h, c, { table = false } = {}) {
  const V = ORDER.vote;
  let s = V.renown * Math.min(c.renown, V.renownCap) + V.seniority * Math.min(20, c.years)
    + V.prizes * Math.min(5, c.prizes) + V.lineage * (c.lineage - 10);
  const vs = voterSide(state, h);
  if (vs && c.side && vs === c.side) s += V.sameSide;
  if (c.id === YOU_SEAT) {
    s += V.honour * (state.honour - ORDER.eligible.honour);
    if (h.kind === 'knight') {
      const k = knightById(state, h.id);
      s += V.regard * ((k?.regard || 0) + (table ? ORDER.table.regard : 0));
    } else {
      s += V.favour * Math.min(V.favourCap, state.favour[h.faction] || 0);
    }
  } else {
    // A knight of the field the chapter has known for years: a good name,
    // friends among the companions, and his own lord's goodwill.
    const F = ORDER.fieldCandidate;
    s += V.honour * (F.honour - ORDER.eligible.honour);
    s += h.kind === 'knight' ? V.regard * F.regard : V.favour * (h.faction === c.side ? F.ownFavour : F.favour);
  }
  return s;
}

/** One vote for one stall. Returns { winner, tally }. */
function voteOnce(state, vs, cands, base, rng) {
  const tally = Object.fromEntries(cands.map((c) => [c.id, 0]));
  for (let i = 0; i < vs.length; i++) {
    let best = null;
    let bestScore = -Infinity;
    for (const c of cands) {
      const s = base[i][c.id] + rng.normal(0, ORDER.vote.noise);
      if (s > bestScore) { bestScore = s; best = c.id; }
    }
    tally[best] += 1;
  }
  // The king breaks a tie: for the better-known name.
  const winner = [...cands].sort((a, b) => tally[b.id] - tally[a.id] || b.renown - a.renown)[0].id;
  return { winner, tally };
}

/** Fill `n` stalls in turn from the candidates. */
function runChapter(state, n, candIds, rng, opts = {}) {
  const vs = voters(state);
  let cands = candIds.map((id) => candidateOf(state, id));
  const base = vs.map((h) => Object.fromEntries(cands.map((c) => [c.id, weigh(state, h, c, opts)])));
  const rounds = [];
  for (let i = 0; i < n && cands.length; i++) {
    const r = voteOnce(state, vs, cands, base, rng);
    rounds.push(r);
    cands = cands.filter((c) => c.id !== r.winner);
  }
  return rounds;
}

/** Who stands at this Candlemas: the field's names, and yours if the chapter will hear it. */
export function chapterCandidates(state) {
  const ids = candidatesFor(state);
  if (eligibility(state).ok) ids.push(YOU_SEAT);
  return ids;
}

/**
 * The heralds' reckoning of the vote: the same chapter, run many times. Your
 * chance of a stall, and how the first vote is likely to fall.
 */
export function reckonChapter(state, opts = {}) {
  const n = vacancies(state).length;
  const ids = chapterCandidates(state);
  if (!n || !ids.includes(YOU_SEAT)) return null;
  const rng = streamFor(state.seed, state.year, `chapter-reckon${opts.table ? '-table' : ''}`);
  let won = 0;
  const votes = Object.fromEntries(ids.map((id) => [id, 0]));
  for (let i = 0; i < ORDER.reckonSamples; i++) {
    const rounds = runChapter(state, n, ids, rng, opts);
    if (rounds.some((r) => r.winner === YOU_SEAT)) won += 1;
    for (const id of ids) votes[id] += rounds[0].tally[id];
  }
  const S = ORDER.reckonSamples;
  return {
    chance: won / S,
    votes: Object.fromEntries(ids.map((id) => [id, votes[id] / S])),
    voters: voters(state).length,
    stalls: n,
  };
}

/** Keep a table for the companions at Candlemas: their regard, bought with dinner. */
export function keepTable(state) {
  const o = state.order;
  if (!o || !vacancies(state).length) return { ok: false, reason: 'No stall is empty this winter.' };
  if (!eligibility(state).ok) return { ok: false, reason: eligibility(state).reason };
  if (o.table === state.year) return { ok: false, reason: 'You have kept your table already.' };
  if (state.purse < ORDER.table.cost) return { ok: false, reason: 'You cannot pay for the feast.' };
  state.purse -= ORDER.table.cost;
  o.table = state.year;
  for (const id of companionIds(state)) {
    const k = knightById(state, id);
    if (k) k.regard = Math.min(10, k.regard + ORDER.table.regard);
  }
  return { ok: true };
}

/**
 * Candlemas: the chapter fills its empty stalls. Returns lines for the spring,
 * and a line for next year's chronicle.
 */
export function holdChapter(state) {
  const o = state.order;
  const empty = vacancies(state);
  if (!o || !empty.length) return [];
  const ids = chapterCandidates(state);
  if (!ids.length) return [];
  if (ids.includes(YOU_SEAT)) learn(state, 'order');
  const rng = streamFor(state.seed, state.year, 'chapter');
  const rounds = runChapter(state, empty.length, ids, rng);
  const lines = [];
  state.yearNotes = state.yearNotes || [];
  rounds.forEach((r, i) => {
    const st = empty[i];
    const was = st.was;
    const stood = ids.includes(YOU_SEAT);
    if (r.winner === YOU_SEAT) {
      st.holder = { kind: YOU_SEAT };
      st.since = state.year + 1;
      o.companion = true;
      o.since = state.year + 1;
      state.renown += ORDER.elected.renown;
      state.honour = Math.min(20, state.honour + ORDER.elected.honour);
      lines.push(`At Candlemas the chapter of the Swan chose you to fill the stall of ${was}, with ${r.tally[YOU_SEAT]} of ${sum(r.tally)} voices. Renown +${ORDER.elected.renown}.`);
      state.yearNotes.push({ line: `The Company of the Swan chose Sir ${state.knight.given} ${state.knight.house} to fill the stall of ${was}.` });
      state.book.push({ serial: 0, year: state.year + 1, tier: 'order', name: 'The Company of the Swan', town: 'Kingsmead', placing: null, net: 0,
        text: `At Candlemas in the ${ordinal(state.year + 1)} year of his knighthood, Sir ${state.knight.given} ${state.knight.house} was chosen a Companion of the Swan, in the stall of ${was}.` });
    } else {
      const k = knightById(state, r.winner);
      st.holder = { kind: 'knight', id: r.winner };
      st.since = state.year + 1;
      lines.push(`At Candlemas the chapter of the Swan chose ${k.name} to fill the stall of ${was}${stood ? `, with ${r.tally[r.winner]} voices to your ${r.tally[YOU_SEAT] ?? 0}` : ''}.`);
      state.yearNotes.push({ line: `The Company of the Swan chose ${k.name} to fill the stall of ${was}.` });
    }
  });
  o.elections.push({ year: state.year, stood: ids.includes(YOU_SEAT), won: rounds.some((r) => r.winner === YOU_SEAT), stalls: rounds.length });
  return lines;
}

function sum(t) { return Object.values(t).reduce((a, b) => a + b, 0); }

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
