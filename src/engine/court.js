// The court: service to a patron, the heralds' judgement of conduct, the names
// they give a knight, and the story threads.
//
// Every obligation here is checked by the engine, not left to the player's
// memory: the patron's tourney is recorded when you ride it, the summons has a
// window that closes, and a missed obligation is a strike. Two strikes and you
// are let go.

import { streamFor } from './rng.js';
import { adjustRegard, knightById } from './field.js';
import { grantManor } from './realm.js';
import { LANDS } from '../data/realm.data.js';
import { fullName } from './knight.js';
import { TOWNS } from '../data/world.data.js';
import { TRAIT_PAIRS } from '../data/creation.data.js';
import {
  PATRONS, PATRONAGE, CONDUCT, EPITHETS, EPITHET_AT, THREADS, PILGRIMAGE,
} from '../data/court.data.js';

// ---------------------------------------------------------------------------
// Conduct
// ---------------------------------------------------------------------------

export function conductOf(honour) {
  return CONDUCT.find((c) => honour >= c.min);
}
export function isDisgraced(state) { return conductOf(state.honour).id === 'disgraced'; }

// Honour runs on the same twenty-point scale as a trait. A paragon reaches the
// top and stays there only by acting like one; there is no hoard of it to spend.
export const HONOUR_MAX = 20;
export const HONOUR_MIN = -10;
export function clampHonour(state) {
  state.honour = Math.max(HONOUR_MIN, Math.min(HONOUR_MAX, state.honour));
}
export function canPilgrimage(state) { return state.honour < PILGRIMAGE.below; }

// ---------------------------------------------------------------------------
// Patrons
// ---------------------------------------------------------------------------

export function patronDef(state) { return state.patron ? PATRONS[state.patron.id] : null; }

/** Enter a house's service. Its knights think better of you; its rival's, worse. */
export function takeService(state, faction) {
  const p = PATRONS[faction];
  if (!p) return { ok: false, reason: 'No such patron.' };
  if (state.patron) return { ok: false, reason: `You are already in the service of ${PATRONS[state.patron.id].name}.` };
  state.patron = { id: faction, since: state.year, strikes: 0, attended: false, summons: null, target: null };
  // His favour is at least what admits a man to his own tourney.
  const floor = faction === 'crown' ? 10 : 8;
  state.favour[faction] = Math.max(state.favour[faction] || 0, floor);
  for (const k of state.roster.knights) {
    if (!k.active) continue;
    if (k.allegiance === faction) adjustRegard(state, k.id, PATRONAGE.houseRegard);
    else if (p.rival && k.allegiance === p.rival) adjustRegard(state, k.id, PATRONAGE.rivalRegard);
  }
  planSummons(state);
  return { ok: true };
}

/** Leave service: by your own choice, or because you were let go. */
export function leaveService(state, { dismissed = false } = {}) {
  const p = patronDef(state);
  if (!p) return { ok: false, reason: 'You serve no one.' };
  state.favour[p.id] = (state.favour[p.id] || 0) + PATRONAGE.resignFavour;
  if (dismissed) { state.honour += PATRONAGE.dismissHonour; clampHonour(state); }
  state.patron = null;
  return { ok: true, text: dismissed
    ? `${cap(p.name)} has let you go. The livery goes back, and the story goes round.`
    : `You leave ${p.name}’s service. He will remember that you left.` };
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** Is this tourney the one your patron expects you at? */
export function isPatronTourney(state, ev) {
  const p = patronDef(state);
  if (!p) return false;
  const t = p.tourney;
  if (t.tier) return ev.tier === t.tier;
  if (t.hostFaction) return ev.host?.faction === t.hostFaction;
  if (t.city) return !!TOWNS[ev.town]?.city && ev.tier !== 'pas';
  return false;
}

/** This year's summons: a month when it comes, and two to answer it in. */
export function planSummons(state) {
  if (!state.patron) return;
  const rng = streamFor(state.seed, state.year, `summons:${state.patron.id}`);
  const month = Math.max(state.month + 1, rng.pick(PATRONAGE.summonsMonths));
  if (month > 9) { state.patron.summons = null; return; }
  state.patron.summons = { month, until: month + PATRONAGE.summonsWindow - 1, answered: false };
}

/** A summons you can answer this month. */
export function summonsOpen(state) {
  const s = state.patron?.summons;
  return !!s && !s.answered && state.month >= s.month && state.month <= s.until;
}

/** Called as each month ends: a summons left unanswered past its window is a strike. */
export function checkSummons(state, notes) {
  const s = state.patron?.summons;
  if (!s || s.answered || state.month < s.until) return;
  state.patron.summons = null;
  strike(state, notes, `You did not answer ${patronDef(state).name}’s summons.`);
}

function strike(state, notes, why) {
  const p = patronDef(state);
  state.patron.strikes += 1;
  state.favour[p.id] = (state.favour[p.id] || 0) + PATRONAGE.missFavour;
  notes.push(`${why} Favour of ${cap(p.name)} ${PATRONAGE.missFavour}.`);
  if (state.patron.strikes >= PATRONAGE.strikes) {
    const r = leaveService(state, { dismissed: true });
    notes.push(r.text);
  }
}

/** Winter: the fee, whether you rode at his tourney, and whether he keeps you. */
export function winterPatron(state, add, notes) {
  const p = patronDef(state);
  if (!p) return;
  add(`${cap(p.name)}’s fee`, p.fee);
  if (!state.patron.attended) {
    strike(state, notes, `You were not at ${p.tourneyLabel}.`);
  }
  if (state.patron && state.patron.target) {
    const k = knightById(state, state.patron.target);
    notes.push(`${cap(p.name)} notes that ${k ? k.name : 'the man he named'} is still unbeaten by you.`);
    state.favour[p.id] -= 1;
    state.patron.target = null;
  }
  // Years of faithful service, and his good opinion, are rewarded with land.
  if (state.patron && state.year - state.patron.since + 1 >= LANDS.patronYears && (state.favour[p.id] || 0) >= LANDS.patronFavour
    && !(state.lands || []).some((l) => l.heldOf === p.id)) {
    const m = grantManor(state, p.id, 'patron');
    if (m) notes.push(`${cap(p.name)} grants you the manor of ${m.name}, to hold of him: rents of £${m.income} a year, and ${m.men} men who owe you service.`);
  }
  if (state.patron) state.patron.attended = false;
}

/** You beat the man your patron named. */
export function targetBeaten(state, id, notes) {
  if (!state.patron || state.patron.target !== id) return;
  const p = patronDef(state);
  state.favour[p.id] += PATRONAGE.targetFavour;
  state.renown += PATRONAGE.targetRenown;
  state.patron.target = null;
  notes.push(`You have beaten the man ${p.name} named. Favour ${'+'}${PATRONAGE.targetFavour}, renown +${PATRONAGE.targetRenown}.`);
}

// ---------------------------------------------------------------------------
// The names the heralds give
// ---------------------------------------------------------------------------

/** The trait that has become your reputation, if any: { trait, epithet, virtue }. */
export function epithetFor(knight) {
  let best = null;
  for (const [virtue, vice] of TRAIT_PAIRS) {
    const v = knight.traits[virtue];
    const strength = Math.max(v, 20 - v);
    if (strength < EPITHET_AT) continue;
    const trait = v >= 10 ? virtue : vice;
    if (!best || strength > best.strength) best = { trait, strength, epithet: EPITHETS[trait], virtue: trait === virtue };
  }
  return best;
}

/** Winter: the heralds settle on a name, or drop one. A sung virtue is renown. */
export function updateEpithet(state, notes) {
  const e = epithetFor(state.knight);
  const was = state.knight.epithet || null;
  const now = e ? e.epithet : null;
  if (now !== was) {
    state.knight.epithet = now;
    if (now) {
      const text = `The heralds have begun to call him ${fullName(state.knight)}.`;
      notes.push(text);
      state.book.push({ serial: 0, year: state.year, tier: 'epithet', name: 'A name', town: '', placing: null, net: 0, text });
    } else {
      notes.push('The heralds no longer use your byname.');
    }
  }
  if (e && e.virtue) {
    state.renown += 1;
    notes.push(`Your name is sung for it: renown +1.`);
  }
}

// ---------------------------------------------------------------------------
// Story threads
// ---------------------------------------------------------------------------

/** The man whose lance it really was at Ambry Cross. Chosen once, from the seed. */
export function revealCulprit(state) {
  state.story = state.story || {};
  if (state.story.culprit) return state.story.culprit;
  const ks = state.roster.knights;
  const named = ks.find((k) => k.memory.some((m) => /Ambry Cross/.test(m)));
  const rng = streamFor(state.seed, 0, 'culprit');
  const older = ks.filter((k) => k.active && k.age >= 30).sort((a, b) => b.renown - a.renown).slice(0, 6);
  const k = named || rng.pick(older.length ? older : ks);
  state.story.culprit = k.id;
  if (!state.flags.includes('culpritKnown')) state.flags.push('culpritKnown');
  adjustRegard(state, k.id, 0, 'You know it was his lance at Ambry Cross.');
  return k.id;
}

/** Your master's name is cleared, by whichever road you took. */
export function clearMaster(state, how) {
  if (state.flags.includes('masterCleared')) return;
  state.flags.push('masterCleared');
  state.flags = state.flags.filter((f) => f !== 'ordealVow');
  state.master.cleared = true;
  state.honour += 4;
  clampHonour(state);
  state.renown += 4;
  const text = `${how} ${state.master.name} has his spurs again, and ${fullName(state.knight)} is the reason.`;
  state.book.push({ serial: 0, year: state.year, tier: 'story', name: 'Ambry Cross', town: '', placing: null, net: 0, text });
  return text;
}

/** The threads a knight is in, each at its furthest stage. */
export function threadsOf(state) {
  const out = [];
  for (const t of THREADS) {
    if (t.when.master && state.master.id !== t.when.master) continue;
    if (t.when.flag && !state.flags.includes(t.when.flag)) continue;
    let stage = t.stages[0];
    for (const s of t.stages) if (s.flag && state.flags.includes(s.flag)) stage = s;
    const culprit = state.story?.culprit ? knightById(state, state.story.culprit)?.name : 'a knight';
    out.push({
      id: t.id,
      title: t.title,
      text: stage.text
        .replaceAll('{master}', state.master.name)
        .replaceAll('{culprit}', culprit || 'a knight')
        .replaceAll('{lady}', state.betrothed || 'your lady'),
    });
  }
  return out;
}

