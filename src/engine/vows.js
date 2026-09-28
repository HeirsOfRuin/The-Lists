// Vows, made on the swans at the Candlemas feast and judged the next winter.
//
// A vow is kept or broken by what the Book of Feats says of the year, so the
// progress shown on the month's screen and the judgement in winter are the
// same count.

import { VOWS } from '../data/life.data.js';
import { learn } from './lore.js';

const PRIZE_TIERS = ['regional', 'high', 'grand', 'greatpas'];
const GREAT_TIERS = ['high', 'grand', 'greatpas'];

export function vowDef(id) { return VOWS.find((v) => v.id === id) || null; }

/** The vows a knight may credibly make this winter. */
export function vowOptions(state) {
  return VOWS.map((v) => ({ ...v, open: state.renown >= v.minRenown, reason: state.renown >= v.minRenown ? null : `Nobody would take the vow seriously from a knight of renown under ${v.minRenown}.` }));
}

/** Make a vow for the coming year, in winter. */
export function takeVow(state, id) {
  const v = vowDef(id);
  if (!v) return { ok: false, reason: 'No such vow.' };
  if (state.renown < v.minRenown) return { ok: false, reason: `Nobody would take the vow seriously from a knight of renown under ${v.minRenown}.` };
  state.vow = { id, year: state.year + 1, done: false };
  learn(state, 'vow');
  return { ok: true };
}

export function dropVow(state) {
  if (!state.vow || state.vow.year <= state.year) return { ok: false, reason: 'A vow made before the swans is not taken back.' };
  state.vow = null;
  return { ok: true };
}

function won(e) {
  return e.placing === 'champion' || !!e.melee?.prize || !!e.foot?.champion;
}

/**
 * How the vow in hand stands: { vow, have, need, status } where status is
 * 'open', 'kept', 'broken', or 'untested' (a vow of mercy nobody tested).
 * `final` judges it as winter would.
 */
export function vowProgress(state, { final = false } = {}) {
  const s = state.vow;
  if (!s) return null;
  const v = vowDef(s.id);
  const year = state.book.filter((e) => e.year === s.year);
  let have = 0;
  let status = 'open';
  switch (s.id) {
    case 'lances': have = year.reduce((t, e) => t + (e.lances || 0), 0); break;
    case 'unhorse': have = year.reduce((t, e) => t + (e.unhorsed?.length || 0), 0); break;
    case 'champion': have = year.filter((e) => PRIZE_TIERS.includes(e.tier) && won(e)).length; break;
    case 'great': have = year.filter((e) => GREAT_TIERS.includes(e.tier) && won(e)).length; break;
    case 'mercy': {
      const taken = year.filter((e) => e.melee?.prisoners?.length);
      if (taken.some((e) => e.melee.terms && e.melee.terms !== 'free')) status = 'broken';
      have = taken.filter((e) => e.melee.terms === 'free').length;
      if (status !== 'broken' && final) status = have ? 'kept' : 'untested';
      return { vow: v, have, need: v.need, status };
    }
    case 'shrine': have = s.done ? 1 : 0; break;
    default: break;
  }
  if (have >= v.need) status = 'kept';
  else if (final) status = 'broken';
  return { vow: v, have, need: v.need, status };
}

/** Winter: the vow for the year just ended is judged. Returns lines for the winter's notes. */
export function judgeVow(state, notes) {
  const s = state.vow;
  if (!s || s.year !== state.year) return;
  const p = vowProgress(state, { final: true });
  const v = p.vow;
  const name = `Sir ${state.knight.given} ${state.knight.house}`;
  if (p.status === 'kept') {
    state.renown += v.kept.renown;
    state.honour = Math.min(20, state.honour + v.kept.honour);
    if (v.kept.pious) state.knight.traits.pious = Math.min(20, state.knight.traits.pious + v.kept.pious);
    notes.push(`You kept your vow: ${lower(v.title)} Renown +${v.kept.renown}, honour +${v.kept.honour}.`);
    state.book.push({ serial: 0, year: state.year, tier: 'vow', name: 'A vow kept', town: '', placing: null, net: 0,
      text: `${name} vowed on the swans at Candlemas ${lower(v.title)} He kept it.` });
  } else if (p.status === 'broken') {
    state.renown = Math.max(0, state.renown + v.broken.renown);
    state.honour = Math.max(-10, state.honour + v.broken.honour);
    notes.push(`You did not keep your vow: ${lower(v.title)} Renown ${v.broken.renown}, honour ${v.broken.honour}. The heralds will remember it longer than you would like.`);
    state.book.push({ serial: 0, year: state.year, tier: 'vow', name: 'A vow broken', town: '', placing: null, net: 0,
      text: `${name} vowed on the swans at Candlemas ${lower(v.title)} He did not keep it.` });
  } else {
    notes.push(`Your vow was never tested: ${lower(v.title)} It counts for nothing either way.`);
  }
  state.vow = null;
}

function lower(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
