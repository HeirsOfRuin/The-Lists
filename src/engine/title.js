// Titles: how a knight becomes a lord of the realm.
//
// Three ways, all historical. The new crown creates barons of the men who won
// it the war. The Crown grants letters patent, on petition, to a knight with
// land enough and its goodwill. And a man who marries the heiress to a barony
// is a lord by right of his wife.
//
// This module reads the realm from the state and imports none of the engine,
// so realm.js can create a baron in its settlement without a cycle.

import { streamFor } from './rng.js';
import { TITLES } from '../data/hearth.data.js';
import { MANORS } from '../data/realm.data.js';
import { TOWNS, PROVINCES } from '../data/world.data.js';

export function isLord(state) { return !!state.title; }

/** How a lord is named: Lord of his seat. */
export function titleName(state) {
  return state.title ? `Lord ${state.title.seat}` : null;
}

function seatFor(state) {
  const l = (state.lands || [])[0];
  if (l) return MANORS.find((m) => m.id === l.id)?.name;
  return TOWNS[PROVINCES[state.province].home].name;
}

const HOW_WORDS = {
  war: 'for his part in the war',
  petition: 'by letters patent, on his petition',
  marriage: 'by right of his wife',
};

/** Make a knight a baron. Returns the title, or null if he already holds one. */
export function createBaron(state, how, seat = null) {
  if (state.title) return null;
  const name = seat || seatFor(state);
  state.title = { rank: 'baron', seat: name, how, since: state.year };
  state.knight.lordship = name;
  state.renown += TITLES.created.renown;
  state.honour = Math.min(20, state.honour + TITLES.created.honour);
  const who = `Sir ${state.knight.given} ${state.knight.house}`;
  state.book.push({
    serial: 0, year: state.year, tier: 'title', name: 'A barony', town: '', placing: null, net: 0,
    text: `In the ${ordinal(state.year)} year of his knighthood, ${who} was made a baron of the realm, ${HOW_WORDS[how]}, and is Lord ${name}.`,
  });
  state.yearNotes = [...(state.yearNotes || []), { line: `${who} was made a baron, Lord ${name}, ${HOW_WORDS[how]}.` }];
  return state.title;
}

/** A title is forfeit with its holder's lands when he is attainted. */
export function forfeitTitle(state) {
  if (!state.title) return null;
  const was = state.title.seat;
  state.title = null;
  delete state.knight.lordship;
  return was;
}

// ---------------------------------------------------------------------------
// The petition
// ---------------------------------------------------------------------------

function newReign(state) {
  const r = state.realm;
  return !!r?.ruler && state.year <= (r.coronationYear || 0) + 1;
}

/** What the Crown asks of a knight it would ennoble, line by line. */
export function petitionTerms(state) {
  const P = TITLES.petition;
  const manors = (state.lands || []).length;
  const crown = state.favour.crown || 0;
  return [
    { label: `${P.manors} manors`, have: manors, ok: manors >= P.manors },
    { label: `the Crown’s favour at ${P.crownFavour}`, have: crown, ok: crown >= P.crownFavour },
    { label: `honour ${P.honour}`, have: state.honour, ok: state.honour >= P.honour },
    { label: `renown ${P.renown}`, have: state.renown, ok: state.renown >= P.renown },
  ];
}

/** Whether a petition may go up this winter, and if not why. */
export function canPetition(state) {
  if (state.title) return { ok: false, reason: 'You are a lord already.' };
  if (state.flags.includes('attainted')) return { ok: false, reason: 'An attainted man petitions for his pardon, not for a title.' };
  const r = state.realm;
  if (r?.war && !r.war.done) return { ok: false, reason: 'The Crown makes no new lords while the realm is at war.' };
  if (state.petition === state.year) return { ok: false, reason: 'Your petition is before the council.' };
  const lack = petitionTerms(state).filter((t) => !t.ok);
  if (lack.length) return { ok: false, reason: `The council hears a petition from a knight with ${lack.map((t) => `${t.label} (you have ${t.have})`).join(', ')}.` };
  return { ok: true, reason: null };
}

/** The chance the council grants it: shown before you send it, and rolled at Candlemas. */
export function petitionChance(state) {
  const P = TITLES.petition;
  const crown = state.favour.crown || 0;
  const manors = (state.lands || []).length;
  const p = P.base + P.perFavour * (crown - P.crownFavour) + P.perManor * (manors - P.manors) + (newReign(state) ? P.newReign : 0);
  return Math.max(0.05, Math.min(P.max, p));
}

/** Send the petition up, in winter. */
export function petition(state) {
  const c = canPetition(state);
  if (!c.ok) return c;
  state.petition = state.year;
  return { ok: true };
}

/** Candlemas: the council answers. Returns lines for the spring. */
export function answerPetition(state) {
  if (state.petition !== state.year) return [];
  const rng = streamFor(state.seed, state.year, 'petition');
  const chance = petitionChance(state);
  state.petition = null;
  if (rng.next() >= chance) {
    return ['The king’s council has your petition, and has not seen fit to grant it this year. A knight may ask again.'];
  }
  state.purse -= TITLES.petition.fee;
  createBaron(state, 'petition');
  return [`The council grants your petition. You are Lord ${state.title.seat}, by letters patent under the great seal. The fees come to £${TITLES.petition.fee / 240}.`];
}

// ---------------------------------------------------------------------------
// The great council
// ---------------------------------------------------------------------------

/** A lord is summoned to the great council at Kingsmead in April, in peace. */
export function councilDue(state) {
  const r = state.realm;
  return !!state.title && state.month === TITLES.council.month && !(r?.war && !r.war.done) && state.council !== state.year;
}

export function attendCouncil(state) {
  state.council = state.year;
  state.favour.crown = (state.favour.crown || 0) + TITLES.council.favour;
}

/** Winter: a lord who stayed away from the council is noticed. */
export function councilWinter(state, notes) {
  const r = state.realm;
  if (!state.title || (r?.war && !r.war.done) || state.title.since === state.year) return;
  if (state.council === state.year) return;
  state.favour.crown = (state.favour.crown || 0) + TITLES.council.missed;
  notes.push(`You did not answer the summons to the great council this year. The Crown’s favour ${TITLES.council.missed}.`);
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
