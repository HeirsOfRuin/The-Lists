// The Book of Lothmere, the year's chronicle, and letters from home.
//
// Nothing here changes the game's numbers. It decides what a knight knows of
// his kingdom (entries unlock as he goes places and sees things), writes down
// what happened in the realm each year, and lets the people he left behind
// say what they think of how it is going. All of it is written from the
// state, so the chronicle cannot describe a year that did not happen.

import { streamFor } from './rng.js';
import { LORE, LORE_SECTIONS, WORLD_EVENTS, WRITERS, LETTERS } from '../data/lore.data.js';
import { MASTERS } from '../data/names.data.js';
import { TOWNS, FEASTS } from '../data/world.data.js';
import { CLAIMANTS } from '../data/realm.data.js';

// ---------------------------------------------------------------------------
// What a knight has seen, and where he has been
// ---------------------------------------------------------------------------

export function visit(state, town) {
  state.visited = state.visited || [];
  if (town && !state.visited.includes(town)) state.visited.push(town);
}

export function learn(state, kind) {
  state.seen = state.seen || [];
  if (!state.seen.includes(kind)) state.seen.push(kind);
}

export function holds(state, cond) {
  if (cond === 'start') return true;
  if (cond.town) return (state.visited || []).includes(cond.town);
  if (cond.seen) return (state.seen || []).includes(cond.seen);
  if (cond.flag) return state.flags.includes(cond.flag);
  if (cond.beat) return !!state.realm?.beats?.[cond.beat];
  return false;
}

/** The Book of Lothmere as this knight knows it, section by section. */
export function codex(state) {
  return LORE_SECTIONS.map((sec) => {
    const entries = LORE.filter((e) => e.section === sec.id).map((e) => {
      const known = holds(state, e.known);
      return {
        id: e.id,
        title: e.title,
        known,
        text: known ? [e.text, ...(e.more || []).filter((m) => holds(state, m.known)).map((m) => m.text)] : [],
        hint: known ? null : hintFor(e),
      };
    });
    return { ...sec, entries, knownCount: entries.filter((e) => e.known).length };
  });
}

function hintFor(e) {
  if (e.known.town) return `You have not been to ${TOWNS[e.known.town].name}.`;
  if (e.known.seen) return 'You have not seen it yet.';
  return 'Not yet known.';
}

/** A town's page in the Book, for the arrival screen and the map. */
export function townLore(town) {
  const e = LORE.find((x) => x.id === town);
  if (!e) return null;
  const first = e.text.split(/(?<=\.)\s/)[0];
  return { title: e.title, text: e.text, line: first };
}

export function codexCounts(state) {
  const all = LORE.length;
  const known = LORE.filter((e) => holds(state, e.known)).length;
  return { known, all };
}

// ---------------------------------------------------------------------------
// The chronicle of the year
// ---------------------------------------------------------------------------

/** Note a great tourney's champion as it happens, for the chronicle. */
export function noteChampion(state, cal, name) {
  state.yearNotes = state.yearNotes || [];
  state.yearNotes.push({ tier: cal.tier, name: cal.name, feast: FEASTS[cal.month], champion: name });
}

// What the realm's story did this year, in a line each.
const BEAT_LINES = {
  y2m4: 'The Princess Isabeau married Lord Geoffrey of Stane at Kingsmead. The Duke of Aumbry sent a silver ewer.',
  y3m5: 'The Duke of Aumbry built a new gatehouse at Ambry Cross, facing the Kingsmead road.',
  y4m7: 'Aumbry’s men and Stane’s fought with cudgels at the summer fair, the first blood between the houses since the war.',
  y5m6: 'The king fell at mass on Whitsunday. A council of regency rules in his name.',
  y6m3: 'The great houses forbade their men to ride against each other at their own tourneys.',
  y7m5: 'The guilds refused the regency council a loan for the defence of the realm.',
  y8m4: 'Commissioners of array rode through every county, counting men.',
  y9m9: 'Both houses demanded oaths of every knight in Lothmere.',
};

/**
 * The year just ended, in a few lines: the realm, the great tourneys, the
 * field, the world, and you. Stored on the state so the Book can show every
 * year a knight has lived through.
 */
export function writeChronicle(state, { retired = [] } = {}) {
  const lines = [];
  const r = state.realm;
  // What was noted as it happened: the chapter's choices, the head of the Roll.
  for (const n of state.yearNotes || []) if (n.line) lines.push(n.line);
  for (const [key, text] of Object.entries(BEAT_LINES)) {
    if (r?.beats?.[key] && key.startsWith(`y${state.year}m`)) lines.push(text);
  }
  if (r?.war && r.war.year === state.year) lines.push(`The king died on Lady Day. His will named ${CLAIMANTS[r.will].name}, and the realm went to war.`);
  for (const b of r?.war?.battles || []) {
    if (b.year === state.year) lines.push(`${cap(b.name)}: ${CLAIMANTS[b.victor].short} carried the field${b.decisive ? ', and the war with it' : ''}.`);
  }
  if (r?.ruler && r.war?.endedYear === state.year) lines.push(`${CLAIMANTS[r.ruler].crowned} will be crowned at Kingsmead in the spring.`);
  const mine = state.book.filter((e) => e.year === state.year && e.placing === 'champion' && (e.tier === 'high' || e.tier === 'grand'));
  for (const n of state.yearNotes || []) {
    if (n.tier === 'grand' && n.champion) lines.push(`${n.champion} won the King’s Tourney at ${n.feast}.`);
  }
  for (const e of mine) lines.push(e.tier === 'grand' ? `You won the King’s Tourney at ${e.feast}.` : `You won ${e.name.charAt(0).toLowerCase()}${e.name.slice(1)}.`);
  for (const k of retired.slice(0, 2)) lines.push(`${k.name}, ${k.titles} times a champion, hung up his lance.`);
  lines.push(...worldEvents(state));
  const entry = { year: state.year, lines };
  state.chronicle = [...(state.chronicle || []), entry];
  state.yearNotes = [];
  return entry;
}

function worldEvents(state) {
  const r = state.realm;
  const phase = r?.ruler ? 'after' : r?.war ? 'war' : 'peace';
  const used = new Set(state.eventsUsed || []);
  const pool = WORLD_EVENTS.map((e, i) => ({ e, i })).filter(({ e, i }) => !used.has(i)
    && (!e.when || e.when === phase) && (e.minTension == null || (r?.tension || 0) >= e.minTension));
  const rng = streamFor(state.seed, state.year, 'chronicle');
  const out = [];
  // A sign of the times first, if the times have one.
  const signs = pool.filter(({ e }) => e.when);
  const pick = (from) => {
    if (!from.length) return;
    const p = rng.pick(from);
    out.push(p.e.text);
    used.add(p.i);
    pool.splice(pool.indexOf(p), 1);
  };
  if (signs.length) pick(signs);
  pick(pool.filter(({ e }) => !e.when));
  if (out.length < 2) pick(pool);
  state.eventsUsed = [...used];
  return out;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------------------------------------------------------------------------
// Letters from home
// ---------------------------------------------------------------------------

/** How the year looked from home, for choosing what they write. */
function moodOf(state) {
  const year = state.book.filter((e) => e.year === state.year);
  const won = year.filter((e) => e.placing === 'champion' && ['regional', 'high', 'grand'].includes(e.tier)).length;
  if (state.honour < 3) return 'disgraced';
  if (state.realm?.war && !state.realm.war.done) return 'war';
  if (won >= 2 || year.some((e) => e.placing === 'champion' && (e.tier === 'high' || e.tier === 'grand'))) return 'champion';
  if (won >= 1) return 'rising';
  if (state.purse < 5 * 240) return 'poor';
  return 'quiet';
}

/** This winter's letters: from home, from your old master, from your lady. */
export function writeLetters(state) {
  const rng = streamFor(state.seed, state.year, 'letters');
  const out = [];
  const mood = moodOf(state);
  const w = WRITERS[state.birth] || WRITERS.eldest;
  out.push({ from: w.who, sign: w.sign, text: rng.pick(LETTERS.home[mood]) });
  const m = state.master;
  const lastTown = [...state.book].reverse().find((e) => e.year === state.year && e.town)?.town || 'the lists';
  if (m.fate !== 'dead' && !state.flags.includes('masterStrained') && !state.flags.includes('reportedMaster')) {
    let kind = mood === 'champion' || mood === 'rising' ? 'proud' : 'worried';
    if (m.id === 'disgraced' && !state.flags.includes('masterCleared')) kind = 'fennick';
    out.push({ from: MASTERS[m.id]?.name || m.name, sign: MASTERS[m.id]?.name || m.name, text: rng.pick(LETTERS.master[kind]).replaceAll('{town}', lastTown) });
  }
  if (['promised', 'married', 'secret'].includes(state.heart)) {
    const from = state.heart === 'secret' ? 'A letter with no seal' : `The lady ${state.betrothed}`;
    out.push({ from, sign: state.heart === 'secret' ? '' : state.betrothed, text: rng.pick(LETTERS.lady[state.heart]) });
  }
  return out;
}
