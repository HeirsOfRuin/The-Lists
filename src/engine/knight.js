// The knight: built from the answers to six questions, and described back.
//
// describeOption() is the only source of the "what this does" line a player
// reads under each answer. It reads the same effects applyOption() applies, so
// the copy and the consequence are one piece of data.

import {
  BASE_KNIGHT, QUESTIONS, HORSES, STAT_LABELS, TRAIT_PAIRS, HOOKS, question,
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
export const SET_KEYS = ['cadency', 'province', 'master', 'horse', 'masterFate', 'birth', 'advantage', 'heart', 'ambition'];
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
  witnessFound: 'You know the name of a man who saw what happened at Ambry Cross.',
  witnessSworn: 'A witness has sworn before a herald about Ambry Cross.',
  aumbryMan: 'Aumbry counts you as his man.',
  aumbryRetainer: 'You ride in Aumbry\u2019s livery, for ten pounds a year.',
  visitedMaster: 'You have seen your master at the priory.',
  weddingSet: 'Your wedding has a date.',
  married: 'You are married.',
  betrothalBroken: 'You broke your betrothal.',
  readTheLetter: 'You read a letter about the succession that was not meant for you.',
  culpritKnown: 'You know whose lance it really was at Ambry Cross.',
  ordealVow: 'You have vowed to bear the man of Ambry Cross down in the lists.',
  masterCleared: 'Your master\u2019s name is cleared.',
  loveKept: 'You have kept faith with her, and she with you.',
  loveTested: 'You went to her, and nobody saw.',
  loveKnown: 'Your secret is known.',
  loveWon: 'You married the lady you loved in secret.',
  promisedMen: 'You promised the commissioner of array more men than you have.',
  claimRestored: 'Your family\u2019s old manor is yours again.',
  attainted: 'Your name is on the new crown\u2019s list of the attainted.',
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
  const s = opt.sets || {};
  if (s.horse) {
    // The horse as you get him, with any bonus the answer gives him already counted.
    const h = HORSES[s.horse];
    const q = h.quality + (e.horseQuality || 0);
    const p = h.potential + (e.horseQuality || 0);
    const grows = p > q ? `, can grow to ${p}` : '';
    out.push(`Horse: quality ${q}${grows}, ${TEMPERS[h.temper].label}, ${h.age} years old`);
  } else if (e.horseQuality) out.push(`Horse quality ${signed(e.horseQuality)}`);
  if (s.cadency) out.push(CADENCY_LABELS[s.cadency]);
  if (s.masterFate === 'dead') out.push('Your master is dead');
  for (const f of opt.flags || []) if (FLAG_LABELS[f]) out.push(`Story: ${FLAG_LABELS[f]}`);
  if (opt.steers) out.push('Story: shapes which stories come to you');
  return out;
}

/** The same lines, split: what an answer gives, and the threads it starts. */
export function optionLines(opt) {
  const all = describeOption(opt);
  return {
    gives: all.filter((l) => !l.startsWith('Story: ')),
    threads: all.filter((l) => l.startsWith('Story: ')).map((l) => l.slice(7)),
  };
}

/** The scene that opens a chapter, answering to what was said before it. */
export function prefaceFor(questionId, answers) {
  const q = question(questionId);
  let text = q.preface;
  for (const [qid, byOption] of Object.entries(q.prefaceBy || {})) {
    if (answers[qid] && byOption[answers[qid]]) { text = byOption[answers[qid]]; break; }
  }
  const master = MASTERS[answers.master]?.name || 'your master';
  return text.replaceAll('{master}', master);
}

/**
 * The heralds' roll: a knight's life so far, written from his answers, and
 * the threads he rides out with.
 */
export function biography(answers) {
  const told = (qid) => question(qid).options.find((o) => o.id === answers[qid])?.told;
  const paragraphs = [];
  if (told('people')) paragraphs.push(`${told('people')}.${told('country') ? ` You ${told('country')}.` : ''}`);
  if (told('master')) paragraphs.push(`${told('master')}${told('taught') ? `, ${told('taught')}` : ''}.${told('spurs') ? ` ${told('spurs')}.` : ''}`);
  if (told('heart')) paragraphs.push(`${told('heart')}.`);
  const flags = flagsFrom(answers);
  const ahead = Object.keys(HOOKS).filter((f) => f !== 'realm' && flags.has(f)).map((f) => HOOKS[f]);
  ahead.push(HOOKS.realm);
  return { paragraphs, ahead };
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
// Nobody leaves squirehood already a byword: character is made in the lists.
export const TRAIT_START_MAX = 15;
const clampStartTrait = (v) => Math.max(20 - TRAIT_START_MAX, Math.min(TRAIT_START_MAX, Math.round(v)));

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
  for (const k of TRAIT_KEYS) traits[k] = clampStartTrait(traits[k]);

  const h = HORSES[sets.horse];
  const horse = {
    name: rng.pick(HORSE_NAMES),
    kind: h.id,
    quality: clampStat(h.quality + horseQuality),
    potential: clampStat(h.potential + horseQuality),
    age: h.age,
    temper: h.temper,
    borrowed: !!h.borrowed,
    condition: 10,
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
    birth: sets.birth,
    advantage: sets.advantage,
    heart: sets.heart,
    betrothed: flags.includes('betrothed') ? rng.pick(LADY_NAMES) : null,
    ambition: sets.ambition,
  };
}

/** The name the heralds cry: with his byname, once he has earned one. */
export function fullName(k) { return `Sir ${k.given} ${k.house}${k.epithet ? ` ${k.epithet}` : ''}`; }
export function provinceName(id) { return PROVINCES[id]?.name || id; }
export function cadencyNote(arms) { return CADENCY[arms.cadency]; }

/**
 * A trait moves toward the middle freely and away from it grudgingly: a
 * step is worth two-thirds of itself past 12 (or under 8), and a third past
 * 15 (or under 5). Character sets slowly, and a byname at 18 is earned over
 * years of acting the same way, not by a season of bold answers.
 */
export function driftTrait(cur, d) {
  const away = (d > 0 && cur >= 10) || (d < 0 && cur <= 10);
  const dist = Math.abs(cur - 10);
  const f = !away ? 1 : dist >= 5 ? 1 / 3 : dist >= 2 ? 2 / 3 : 1;
  return Math.max(0, Math.min(20, Math.round((cur + d * f) * 100) / 100));
}
