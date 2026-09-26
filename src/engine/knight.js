// The knight: built from the answers to ten questions, and described back.
//
// describeOption() is the only source of the "what this does" line a player
// reads under each answer. It reads the same effects applyOption() applies, so
// the copy and the consequence are one piece of data.

import {
  BASE_KNIGHT, QUESTIONS, HORSES, STAT_LABELS, TRAIT_PAIRS, question,
} from '../data/creation.data.js';
import { MASTERS, HORSE_NAMES, GIVEN_NAMES, HOUSE_NAMES, LADY_NAMES } from '../data/names.data.js';
import { FACTION_LABELS, PROVINCES } from '../data/world.data.js';
import { TEMPERS } from '../data/joust.data.js';
import { randomArms, CADENCY } from './heraldry.js';
import { lsdSigned } from './money.js';

export const STAT_MIN = 1;
export const STAT_MAX = 20;
export const TRAIT_MAX = 20;

const STAT_KEYS = Object.keys(BASE_KNIGHT.stats);
const TRAIT_KEYS = Object.keys(BASE_KNIGHT.traits);
const FACTION_KEYS = Object.keys(BASE_KNIGHT.favour);
const SCALAR_KEYS = ['purse', 'renown', 'honour', 'lineage', 'horseQuality'];

/** Every effect key the creation table may use. The tests hold the data to it. */
export const EFFECT_KEYS = [...STAT_KEYS, ...SCALAR_KEYS, 'favour', 'traits'];
export const SET_KEYS = ['cadency', 'province', 'master', 'horse', 'masterFate'];
export { STAT_KEYS, TRAIT_KEYS, FACTION_KEYS };

export const FLAG_LABELS = {
  heir: 'You are your father’s heir.',
  bastard: 'The bend sinister follows you into every hall.',
  dormantClaim: 'A dormant claim to your house’s old lands.',
  grandfatherLegend: 'Your grandfather’s legend — and his enemies.',
  patronOwes: 'Aumbry owes your family a debt.',
  masterChampion: 'Your master’s old rivals are yours now.',
  masterDisgraced: 'Your master’s disgrace is a story unfinished.',
  masterStrained: 'You and your master parted on hard words.',
  reportedMaster: 'The heralds remember what you told them.',
  borrowedHorse: 'The horse must go back, or be bought.',
  betrothed: 'You are promised.',
  secretLove: 'You love someone you cannot name.',
};

const CADENCY_LABELS = {
  label: 'Arms: a label, for the eldest son',
  crescent: 'Arms: a crescent, for a younger son',
  baton: 'Arms: the baton sinister',
  none: 'Arms: borne plain, as head of the house',
};

function traitWord(key, delta) {
  const pair = TRAIT_PAIRS.find(([a]) => a === key);
  const word = delta >= 0 ? pair[0] : pair[1];
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} +${Math.abs(delta)}`;
}

function signed(n) { return n > 0 ? `+${n}` : `−${Math.abs(n)}`; }

/**
 * The lines shown under an option: one per effect, generated from the data.
 * Order: skills, money, standing, favour, traits, horse, arms, story.
 */
export function describeOption(opt) {
  const out = [];
  const e = opt.effects || {};
  for (const k of STAT_KEYS) if (e[k]) out.push(`${STAT_LABELS[k]} ${signed(e[k])}`);
  if (e.purse) out.push(`Purse ${lsdSigned(e.purse)}`);
  if (e.renown) out.push(`Renown ${signed(e.renown)}`);
  if (e.honour) out.push(`Honour ${signed(e.honour)}`);
  if (e.lineage) out.push(`Lineage ${signed(e.lineage)}`);
  for (const [f, v] of Object.entries(e.favour || {})) {
    out.push(`Favour of ${FACTION_LABELS[f]} ${signed(v)}`);
  }
  for (const [t, v] of Object.entries(e.traits || {})) out.push(traitWord(t, v));
  if (e.horseQuality) out.push(`Horse quality ${signed(e.horseQuality)}`);
  const s = opt.sets || {};
  if (s.horse) {
    const h = HORSES[s.horse];
    const grows = h.potential > h.quality ? `, can grow to ${h.potential}` : '';
    out.push(`Horse: quality ${h.quality}${grows}, ${TEMPERS[h.temper].label}, ${h.age} years old`);
  }
  if (s.cadency) out.push(CADENCY_LABELS[s.cadency]);
  if (s.masterFate === 'dead') out.push('Your master is dead');
  for (const f of opt.flags || []) if (FLAG_LABELS[f]) out.push(`Story: ${FLAG_LABELS[f]}`);
  if (opt.steers) out.push('Steers which story threads come to you (from the Court build)');
  return out;
}

/** Flags accumulated by a set of answers so far. */
export function flagsFrom(answers) {
  const flags = new Set();
  for (const q of QUESTIONS) {
    const id = answers[q.id];
    if (!id) continue;
    const opt = q.options.find((o) => o.id === id);
    for (const f of opt?.flags || []) flags.add(f);
  }
  return flags;
}

/** The options a question offers, given what has been answered before it. */
export function availableOptions(questionId, answers) {
  const flags = flagsFrom(answers);
  return question(questionId).options.filter((o) => !o.requires || flags.has(o.requires.flag));
}

/** A complete random set of answers, respecting every `requires`. */
export function randomAnswers(rng) {
  const answers = {};
  for (const q of QUESTIONS) answers[q.id] = rng.pick(availableOptions(q.id, answers)).id;
  return answers;
}

export function randomName(rng) {
  return { given: rng.pick(GIVEN_NAMES), house: rng.pick(HOUSE_NAMES) };
}

const clampStat = (v) => Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(v)));
const clampTrait = (v) => Math.max(0, Math.min(TRAIT_MAX, Math.round(v)));

/**
 * Build a knight from complete answers. Pure given (answers, name, rng).
 * Returns the fields newGame() lays into the state.
 */
export function buildKnight(answers, name, rng) {
  for (const q of QUESTIONS) {
    if (!answers[q.id]) throw new Error(`Creation is missing an answer to "${q.id}"`);
    const ok = availableOptions(q.id, answers).some((o) => o.id === answers[q.id]);
    if (!ok) throw new Error(`"${answers[q.id]}" is not an answer to "${q.id}" for this knight`);
  }

  const stats = { ...BASE_KNIGHT.stats };
  const traits = { ...BASE_KNIGHT.traits };
  const favour = { ...BASE_KNIGHT.favour };
  let purse = BASE_KNIGHT.purse;
  let renown = BASE_KNIGHT.renown;
  let honour = BASE_KNIGHT.honour;
  let lineage = BASE_KNIGHT.lineage;
  let horseQuality = 0;
  const sets = {};
  const flags = [];

  for (const q of QUESTIONS) {
    const opt = q.options.find((o) => o.id === answers[q.id]);
    const e = opt.effects || {};
    for (const k of STAT_KEYS) if (e[k]) stats[k] += e[k];
    if (e.purse) purse += e.purse;
    if (e.renown) renown += e.renown;
    if (e.honour) honour += e.honour;
    if (e.lineage) lineage += e.lineage;
    if (e.horseQuality) horseQuality += e.horseQuality;
    for (const [f, v] of Object.entries(e.favour || {})) favour[f] += v;
    for (const [t, v] of Object.entries(e.traits || {})) traits[t] += v;
    Object.assign(sets, opt.sets || {});
    for (const f of opt.flags || []) flags.push(f);
  }

  for (const k of STAT_KEYS) stats[k] = clampStat(stats[k]);
  for (const k of TRAIT_KEYS) traits[k] = clampTrait(traits[k]);

  const h = HORSES[sets.horse];
  const horse = {
    name: rng.pick(HORSE_NAMES),
    kind: h.id,
    quality: clampStat(h.quality + horseQuality),
    potential: clampStat(h.potential + horseQuality),
    age: h.age,
    temper: h.temper,
    borrowed: !!h.borrowed,
  };

  const masterDef = MASTERS[sets.master];
  const master = {
    id: sets.master,
    name: masterDef.name,
    epithet: masterDef.epithet,
    fate: sets.masterFate || 'living',
  };

  const arms = randomArms(rng, sets.cadency || 'none');

  return {
    knight: {
      given: name.given,
      house: name.house,
      age: BASE_KNIGHT.age,
      stats,
      traits,
      wound: null,
    },
    horse,
    purse: Math.max(0, purse),
    renown: Math.max(0, renown),
    honour,
    lineage: Math.max(0, lineage),
    favour,
    province: sets.province,
    master,
    arms,
    flags,
    heart: answers.heart,
    betrothed: flags.includes('betrothed') ? rng.pick(LADY_NAMES) : null,
    ambition: answers.ambition,
  };
}

export function fullName(k) { return `Sir ${k.given} ${k.house}`; }
export function provinceName(id) { return PROVINCES[id]?.name || id; }
export function cadencyNote(arms) { return CADENCY[arms.cadency]; }
