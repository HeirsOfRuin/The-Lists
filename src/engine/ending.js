// How a career ends: hanging up the lance, the heralds' verdict on it, and
// the epilogue written from the Book of Feats.
//
// Every ending is read from what happened. The headline is the grandest thing
// the knight did, in the order the heralds would rank it; everything else he
// earned is said too; and whether he got what he rode out for is said plainly.

import { RETIREMENT, ENDINGS, AMBITION_WORDS } from '../data/life.data.js';
import { CLAIMANTS } from '../data/realm.data.js';
import { PROVINCES, TOWNS } from '../data/world.data.js';
import { manorDef } from './realm.js';
import { fullName } from './knight.js';

const TIER_RANK = { grand: 6, greatpas: 5, high: 4, regional: 3, local: 2, pas: 1 };
const TIER_WORD = {
  grand: 'the King’s Tourney', greatpas: 'the Great Pas', high: 'a high tourney', regional: 'a lords’ tourney', local: 'a joust on the green',
};

/** Whether you may hang up your lance this winter, and when you must. */
export function retirement(state) {
  const age = state.knight.age;
  return {
    may: age >= RETIREMENT.from,
    must: age >= RETIREMENT.always,
    from: RETIREMENT.from,
    always: RETIREMENT.always,
    years: Math.max(0, RETIREMENT.always - age),
  };
}

/** Everything the heralds would credit a knight with, grandest first. */
export function honoursOf(state) {
  const c = state.career;
  const lands = (state.lands || []).length;
  const married = state.heart === 'married';
  const st = state.realm?.war?.settlement;
  const out = [];
  if (state.order?.companion) out.push('swan');
  if ((c.rollFirst || 0) >= RETIREMENT.rollFirst && state.book.some((e) => e.tier === 'grand' && e.placing === 'champion')) out.push('champion');
  if (st && st.side && st.side === st.victor && RETIREMENT.kingmaker.includes(st.rank)) out.push('kingmaker');
  if (lands >= RETIREMENT.lordManors || (married && lands >= RETIREMENT.lordMarried)) out.push('lord');
  if ((c.championships || 0) >= RETIREMENT.featsChampionships || (c.greatPrizes || 0) >= RETIREMENT.featsGreat) out.push('feats');
  return out;
}

/** The headline the heralds would give this career if it ended now. */
export function endingFor(state) {
  const all = honoursOf(state);
  const disgraced = state.honour < 3;
  const id = disgraced ? 'disgrace' : all[0] || 'quiet';
  return { id, title: ENDINGS[id].title, all };
}

/** Whether a knight got what he rode out for. */
export function ambitionMet(state) {
  const c = state.career;
  switch (state.ambition) {
    case 'champion': return (c.rollFirst || 0) >= 1 || state.book.some((e) => e.tier === 'grand' && e.placing === 'champion');
    case 'lordship': return state.heart === 'married' && (state.lands || []).length >= 1;
    case 'love': return state.flags.includes('loveWon');
    case 'order': return !!state.order?.companion;
    case 'clearName': return state.flags.includes('masterCleared');
    default: return false;
  }
}

/** Hang up your lance. `why`: 'chosen', or 'age' when the heralds will not enter you. */
export function retire(state, why = 'chosen') {
  const ep = epilogue(state, why);
  state.status = 'retired';
  state.outcome = { ...ep, kind: 'retired', year: state.year, ending: ep.ending.id, title: ep.ending.title, text: ep.paragraphs[0], all: ep.ending.all };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The epilogue
// ---------------------------------------------------------------------------

function fill(s, vars) { return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : '')); }

function bestDay(state) {
  const wins = state.book.filter((e) => TIER_RANK[e.tier] && (e.placing === 'champion' || e.melee?.prize || e.foot?.champion));
  if (!wins.length) return null;
  wins.sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.year - b.year);
  const e = wins[0];
  const what = e.placing === 'champion' ? 'carried off the prize' : e.melee?.prize ? 'won the prize of the mêlée' : 'won the prize of the barriers';
  return `${TIER_WORD[e.tier]} at ${e.town}, at ${e.feast} of his ${ordinal(e.year)} year, where he ${what}`;
}

function firstDay(state) {
  const e = state.book.find((x) => TIER_RANK[x.tier]);
  return e ? `${e.name.charAt(0).toLowerCase()}${e.name.slice(1)}, at ${e.feast} of his first year` : null;
}

function record(state) {
  const c = state.career;
  const book = state.book;
  const prisoners = book.reduce((t, e) => t + (e.melee?.prisoners?.length || 0), 0);
  const barriers = book.reduce((t, e) => t + (e.foot?.won?.length || 0), 0);
  const parts = [];
  const won = c.championships || 0;
  const prizes = c.tourneys === 1
    ? (won ? 'and carried off its prize' : 'and did not win it')
    : won ? `and carried off the prize at ${won} of them${c.greatPrizes ? `, ${c.greatPrizes} on the King’s circuit` : ''}` : 'and never carried off the prize';
  parts.push(c.tourneys ? `He rode in ${c.tourneys} tourney${c.tourneys === 1 ? '' : 's'} ${prizes}.` : 'He never rode in a tourney.');
  if (c.unhorsed) parts.push(`He bore ${c.unhorsed} knight${c.unhorsed === 1 ? '' : 's'} to the ground at the tilt${c.falls ? ` and went down himself ${c.falls} time${c.falls === 1 ? '' : 's'}` : ''}.`);
  if (prisoners || barriers) {
    const bits = [];
    if (prisoners) bits.push(`took ${prisoners} prisoner${prisoners === 1 ? '' : 's'} in the mêlée`);
    if (barriers) bits.push(`won ${barriers} combat${barriers === 1 ? '' : 's'} at the barriers`);
    parts.push(`He ${bits.join(' and ')}.`);
  }
  const best = bestDay(state);
  if (best) parts.push(`His best day was ${best}.`);
  const first = firstDay(state);
  if (first && c.tourneys > 1) parts.push(`He had first ridden at ${first}.`);
  return parts.join(' ');
}

function warLine(state) {
  const r = state.realm;
  const w = r?.war;
  if (!w) return null;
  const st = w.settlement;
  if (!st) return 'He lived to see the realm go to war over the old king’s crown.';
  const crowned = CLAIMANTS[st.victor].crowned;
  const rank = { hedge: 'a hedge knight', household: 'a household knight', banneret: 'a knight banneret', captain: 'a captain', councillor: 'a councillor of war' }[st.rank] || 'a knight';
  if (!st.side) return `When the old king died and the realm went to war, he stood aside. ${crowned} took the crown without him.`;
  if (st.side === st.victor) return `When the old king died and the realm went to war, he rode for ${CLAIMANTS[st.side].short} as ${rank}, and was on the winning side when ${crowned} was crowned.`;
  return `When the old king died and the realm went to war, he rode for ${CLAIMANTS[st.side].short} as ${rank}, and lost. ${st.attainted ? 'His name was on the list of the attainted.' : 'He was not important enough to be punished for it.'}`;
}

function peopleLine(state) {
  const parts = [];
  if (state.heart === 'married') parts.push(state.flags.includes('loveWon') ? 'He married the lady he had loved in secret, and did not care who knew it.' : `He married ${state.betrothed ? `the lady ${state.betrothed}` : 'his lady'}${(state.lands || []).some((l) => l.how === 'dower') ? ', and held her dower manor' : ''}.`);
  const dubbed = state.book.filter((e) => e.tier === 'dubbing');
  if (dubbed.length) parts.push(`He knighted ${dubbed.length === 1 ? 'a squire' : `${dubbed.length} squires`} with his own hand.`);
  if (state.flags.includes('masterCleared')) parts.push(`His old master, ${state.master.name}, died with his name cleared.`);
  const enemy = [...state.roster.knights].filter((k) => k.regard <= -6).sort((a, b) => a.regard - b.regard)[0];
  if (enemy) parts.push(`${enemy.name} never forgave him.`);
  const friend = [...state.roster.knights].filter((k) => k.regard >= 6).sort((a, b) => b.regard - a.regard)[0];
  if (friend) parts.push(`${friend.name} called him friend to the end.`);
  return parts.join(' ');
}

/**
 * The epilogue: a headline, and paragraphs in the heralds' voice. Used for a
 * retirement; the other endings add their own first line and keep the rest.
 */
export function epilogue(state, why = 'chosen') {
  const ending = endingFor(state);
  const E = ENDINGS[ending.id];
  const name = fullName(state.knight);
  const lands = state.lands || [];
  const home = TOWNS[PROVINCES[state.province].home].name;
  const vars = {
    rollFirst: state.career.rollFirst || 0,
    rank: state.realm?.war?.settlement?.rank || 'knight',
    crowned: state.realm?.ruler ? CLAIMANTS[state.realm.ruler].crowned : 'The new crown',
    lands: lands.length,
    manor: lands.length ? manorDef(lands[0].id).name : home,
    home: lands.length ? manorDef(lands[0].id).name : home,
  };
  const paragraphs = [];
  const opening = why === 'age'
    ? `${name} rode his last course at forty-five, when the heralds would enter his name no longer, in the ${ordinal(state.year)} year of his knighthood.`
    : `${name} hung up his lance in the winter of his ${ordinal(state.year)} year of knighthood, at ${state.knight.age}.`;
  paragraphs.push(`${opening} ${fill(E.line, vars)}`);
  paragraphs.push(record(state));
  const war = warLine(state);
  if (war) paragraphs.push(war);
  if (state.ambition && AMBITION_WORDS[state.ambition]) paragraphs.push(AMBITION_WORDS[state.ambition][ambitionMet(state) ? 'yes' : 'no']);
  const people = peopleLine(state);
  paragraphs.push(`${fill(E.after, vars)}${people ? ` ${people}` : ''}`);
  const also = ending.all.filter((id) => id !== ending.id).map((id) => ENDINGS[id].title);
  return { ending, paragraphs, also, ambitionMet: ambitionMet(state) };
}

/**
 * What the heralds write when a career ends some other way: the manner of it
 * first, then the same record a retirement gets.
 */
export function obituary(state, first) {
  const paragraphs = [first, record(state)];
  const war = warLine(state);
  if (war && state.status !== 'dead') paragraphs.push(war);
  if (state.ambition && AMBITION_WORDS[state.ambition]) paragraphs.push(AMBITION_WORDS[state.ambition][ambitionMet(state) ? 'yes' : 'no']);
  const people = peopleLine(state);
  if (people) paragraphs.push(people);
  return paragraphs;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
