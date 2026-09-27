// The card engine: situations, answers, and what they do.
//
// A card is data (src/data/cards.*.data.js). This module decides which cards
// can come up, fills in who is in them, shows the chance of any check, and
// applies the answer. ONE DERIVATION again: checkChance() is the number shown
// on the button and the number rolled when it is pressed.
//
// Vocabulary — the test suite holds every card to exactly these keys.
//
//   when:    tier notTier minRenown maxRenown minHonour maxHonour minLineage
//            maxLineage flag notFlag heart notHeart master masterFate hasSquire
//            squireOrigin city minYear minPurse minFavour noPatron patron
//            minHostFavour minTrait maxTrait side noOath oathSet minRank minMen
//            hasLands hostIs canPayFine
//   cast:    rival { from: field|roster, temperament, unknown, maxRenown,
//                    minRenown, regardMin, regardMax, lineageBelowYou,
//                    notInField, culprit, allegiance: patronRival|<faction> }
//            opponent: true   lady: 'any'
//   effects: purse renown honour favour traits stats marks regard intel
//            intelField fatigue wound flags memory squire vow wager token
//            largesse pas travelDays serve patronTarget reveal clearMaster heart
//            balance lean oath battle peril manor pardon
//   favour:  a faction, or 'host' (the event's or court's house), or
//            'patron' (whoever you serve), or 'side' (the house you are sworn to)
//   check:   { stat | trait, dc }

import { streamFor } from './rng.js';
import { knightById, adjustRegard } from './field.js';
import { takeService, leaveService, revealCulprit, clearMaster, clampHonour } from './court.js';
import {
  sideNow, importance, rankIndex, menOf, shiftBalance, oathTerms, swear, otherHouse, riskOf, rollPeril,
  battleSpec, battlePreview, fightBattle, battleLines, pardon, grantManor,
} from './realm.js';
import { CLAIMANTS, DEATHS } from '../data/realm.data.js';
import { REALM_CARDS, SETTLEMENT_CARDS } from '../data/cards.realm.data.js';
import { PATRONS } from '../data/court.data.js';
import { lsdSigned, lsd } from './money.js';
import { fullName } from './knight.js';
import { FEAST_CARDS, ARRIVAL_CARDS } from '../data/cards.court.data.js';
import { ROAD_CARDS, MOMENT_CARDS, PRIZE_CARDS, WINTER_CARDS, COURT_CARDS } from '../data/cards.road.data.js';
import { PATRON_CARDS, CHURCH_CARDS, STORY_CARDS } from '../data/cards.story.data.js';
import { TRAIT_PAIRS, STAT_LABELS } from '../data/creation.data.js';
import { FACTION_LABELS } from '../data/world.data.js';
import { LADY_NAMES } from '../data/names.data.js';
import { TOWNS } from '../data/world.data.js';

export const CARDS = [
  ...FEAST_CARDS, ...ARRIVAL_CARDS, ...ROAD_CARDS, ...MOMENT_CARDS,
  ...PRIZE_CARDS, ...WINTER_CARDS, ...COURT_CARDS, ...PATRON_CARDS, ...CHURCH_CARDS, ...STORY_CARDS,
  ...REALM_CARDS, ...SETTLEMENT_CARDS,
];
export const WHEN_KEYS = [
  'tier', 'notTier', 'minRenown', 'maxRenown', 'minHonour', 'maxHonour', 'minLineage', 'maxLineage',
  'flag', 'notFlag', 'heart', 'notHeart', 'master', 'masterFate', 'hasSquire', 'squireOrigin',
  'city', 'minYear', 'minPurse', 'minFavour', 'noPatron', 'patron', 'minHostFavour', 'minTrait', 'maxTrait',
  'side', 'noOath', 'oathSet', 'minRank', 'minMen', 'hasLands', 'hostIs', 'canPayFine',
];
export const EFFECT_KEYS = [
  'purse', 'renown', 'honour', 'favour', 'traits', 'stats', 'marks', 'regard', 'intel', 'intelField',
  'fatigue', 'wound', 'flags', 'memory', 'squire', 'vow', 'wager', 'token', 'largesse', 'pas', 'travelDays',
  'serve', 'patronTarget', 'reveal', 'clearMaster', 'heart',
  'balance', 'lean', 'oath', 'battle', 'peril', 'manor', 'pardon',
];
// Effects that only make sense with a tourney ahead or under way.
export const EVENT_EFFECTS = ['intel', 'intelField', 'fatigue', 'wound', 'vow', 'wager', 'token', 'largesse', 'pas', 'travelDays'];

export function cardById(id) {
  const c = CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

/** Does `when` hold, for this knight, in this context? */
export function holds(state, when, ctx = {}) {
  if (!when) return true;
  const w = when;
  if (w.tier && !w.tier.includes(ctx.tier)) return false;
  if (w.notTier && w.notTier.includes(ctx.tier)) return false;
  if (w.minRenown != null && state.renown < w.minRenown) return false;
  if (w.maxRenown != null && state.renown > w.maxRenown) return false;
  if (w.minHonour != null && state.honour < w.minHonour) return false;
  if (w.maxHonour != null && state.honour > w.maxHonour) return false;
  if (w.minLineage != null && state.lineage < w.minLineage) return false;
  if (w.maxLineage != null && state.lineage > w.maxLineage) return false;
  if (w.flag && !state.flags.includes(w.flag)) return false;
  if (w.notFlag && state.flags.includes(w.notFlag)) return false;
  if (w.heart && ![].concat(w.heart).includes(state.heart)) return false;
  if (w.notHeart && [].concat(w.notHeart).includes(state.heart)) return false;
  if (w.master && state.master.id !== w.master) return false;
  if (w.masterFate && state.master.fate !== w.masterFate) return false;
  if (w.hasSquire != null && !!state.squire !== w.hasSquire) return false;
  if (w.squireOrigin && state.squire?.origin !== w.squireOrigin) return false;
  if (w.city != null && !!(ctx.town && TOWNS[ctx.town]?.city) !== w.city) return false;
  if (w.minYear != null && state.year < w.minYear) return false;
  if (w.minPurse != null && state.purse < w.minPurse) return false;
  if (w.minFavour) {
    for (const [f, v] of Object.entries(w.minFavour)) if ((state.favour[f] || 0) < v) return false;
  }
  if (w.noPatron && state.patron) return false;
  if (w.patron) {
    if (!state.patron) return false;
    if (w.patron !== 'any' && ![].concat(w.patron).includes(state.patron.id)) return false;
  }
  if (w.minHostFavour != null) {
    if (!ctx.hostFaction || !PATRONS[ctx.hostFaction]) return false;
    if ((state.favour[ctx.hostFaction] || 0) < w.minHostFavour) return false;
  }
  for (const [t, v] of Object.entries(w.minTrait || {})) if (traitValue(state, t) < v) return false;
  for (const [t, v] of Object.entries(w.maxTrait || {})) if (traitValue(state, t) > v) return false;
  if (w.side && ![].concat(w.side).includes(sideNow(state))) return false;
  if (w.noOath && state.realm?.oath) return false;
  if (w.oathSet && !state.realm?.oath) return false;
  if (w.minRank && rankIndex(importance(state).rank.id) < rankIndex(w.minRank)) return false;
  if (w.minMen != null && menOf(state) < w.minMen) return false;
  if (w.hasLands != null && ((state.lands || []).length > 0) !== w.hasLands) return false;
  if (w.hostIs && ctx.hostFaction !== w.hostIs) return false;
  if (w.canPayFine && state.purse < (state.realm?.war?.settlement?.fine || 0)) return false;
  return true;
}

/** A trait's value, whichever half of its pair is named. */
export function traitValue(state, name) {
  const pair = TRAIT_PAIRS.find(([a, b]) => a === name || b === name);
  const v = state.knight.traits[pair[0]];
  return name === pair[0] ? v : 20 - v;
}

// ---------------------------------------------------------------------------
// Casting: who is in the scene
// ---------------------------------------------------------------------------

function rivalCandidates(state, spec, ctx) {
  let pool;
  if (spec.from === 'field') {
    pool = (ctx.field || []).map((id) => knightById(state, id)).filter(Boolean);
  } else {
    pool = state.roster.knights.filter((k) => k.active);
    if (spec.notInField) pool = pool.filter((k) => !(ctx.field || []).includes(k.id));
  }
  return pool.filter((k) => {
    if (spec.temperament && !spec.temperament.includes(k.temperament)) return false;
    if (spec.unknown && (state.intel[k.id] || 0) > 0) return false;
    if (spec.maxRenown != null && k.renown > spec.maxRenown) return false;
    if (spec.regardMin != null && k.regard < spec.regardMin) return false;
    if (spec.regardMax != null && k.regard > spec.regardMax) return false;
    if (spec.lineageBelowYou && k.lineage >= state.lineage) return false;
    if (spec.minRenown != null && k.renown < spec.minRenown) return false;
    if (spec.culprit && k.id !== state.story?.culprit) return false;
    if (spec.allegiance) {
      const want = spec.allegiance === 'patronRival' ? PATRONS[state.patron?.id]?.rival : spec.allegiance;
      if (!want || k.allegiance !== want) return false;
    }
    return true;
  });
}

function castCard(state, card, ctx, rng) {
  const cast = {};
  const c = card.cast || {};
  if (c.rival) {
    const pool = rivalCandidates(state, c.rival, ctx);
    if (!pool.length) return null;
    cast.rival = rng.pick(pool).id;
  }
  if (c.opponent) {
    if (!ctx.opponent) return null;
    cast.opponent = ctx.opponent;
  }
  if (c.lady) cast.lady = rng.pick(LADY_NAMES);
  return cast;
}

/** Whether one card could come up here, and with whom. For tests and tools. */
export function castIfEligible(state, cardId, ctx) {
  const card = cardById(cardId);
  if (!holds(state, card.when, ctx)) return null;
  const cast = castCard(state, card, ctx, streamFor(state.seed, state.year, `probe:${cardId}`));
  if (!cast) return null;
  if (!card.choices.some((ch) => holds(state, ch.when, ctx))) return null;
  return cast;
}

/** A particular card, if it can come up: the realm's scheduled beats use this. */
export function drawById(state, cardId, ctx = {}) {
  const card = cardById(cardId);
  if (!holds(state, card.when, ctx)) return null;
  const cast = castCard(state, card, ctx, streamFor(state.seed, state.year, `beat:${cardId}`));
  if (!cast || !card.choices.some((ch) => holds(state, ch.when, ctx))) return null;
  state.cardSerial = (state.cardSerial || 0) + 1;
  return {
    uid: state.cardSerial, id: card.id, context: card.context, cast,
    ctx: { tier: null, town: ctx.town || null, host: ctx.host || null, hostFaction: ctx.hostFaction || null, prize: 0 },
  };
}

/**
 * Draw a card for a context, or null if none can come up. Cards already seen
 * are less likely; `once` cards come up at most once a career.
 */
export function drawCard(state, context, ctx, label) {
  const rng = streamFor(state.seed, state.year, `draw:${label}`);
  const seen = state.cardsSeen || {};
  const options = [];
  for (const card of CARDS) {
    if (card.context !== context) continue;
    if (card.once && seen[card.id]) continue;
    if (!holds(state, card.when, ctx)) continue;
    const cast = castCard(state, card, ctx, rng);
    if (!cast) continue;
    // At least one answer must be open to this knight.
    if (!card.choices.some((ch) => holds(state, ch.when, ctx))) continue;
    options.push({ card, cast, weight: card.weight / (1 + 2 * (seen[card.id] || 0)) });
  }
  const pick = rng.weighted(options);
  if (!pick) return null;
  state.cardSerial = (state.cardSerial || 0) + 1;
  return {
    uid: state.cardSerial,
    id: pick.card.id,
    context,
    cast: pick.cast,
    ctx: {
      tier: ctx.tier || null,
      town: ctx.town || null,
      host: ctx.host || null,
      hostFaction: ctx.hostFaction || null,
      prize: ctx.prize || 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

function nameOf(state, id) { return knightById(state, id)?.name || 'a knight'; }

/** Fill in a card's placeholders. */
export function fill(state, inst, text) {
  const town = inst.ctx.town ? TOWNS[inst.ctx.town].name : 'the town';
  return text
    .replaceAll('{you}', fullName(state.knight))
    .replaceAll('{rival}', inst.cast.rival ? nameOf(state, inst.cast.rival) : 'a knight')
    .replaceAll('{opponent}', inst.cast.opponent ? nameOf(state, inst.cast.opponent) : 'your opponent')
    .replaceAll('{lady}', inst.cast.lady || 'a lady')
    .replaceAll('{host}', inst.ctx.host || 'your host')
    .replaceAll('{town}', town)
    .replaceAll('{squire}', state.squire?.name || 'your squire')
    .replaceAll('{master}', state.master.name)
    .replaceAll('{horse}', state.horse.name)
    .replaceAll('{lord}', patronFor(state, inst)?.lord || 'your lord')
    .replaceAll('{patron}', patronFor(state, inst)?.name || 'your patron')
    .replaceAll('{fee}', patronFor(state, inst) ? lsd(patronFor(state, inst).fee) : 'a fee')
    .replaceAll('{heir}', claimant(state.realm?.will) || 'the heir')
    .replaceAll('{other}', claimant(otherHouse(state.realm?.will)) || 'the other claimant')
    .replaceAll('{leader}', claimant(sideNow(state)) || 'your lord')
    .replace(/^./, (c) => c.toUpperCase());
}

function claimant(id) { return CLAIMANTS[id]?.name || null; }
function claimantShort(id) { return CLAIMANTS[id]?.short || null; }
const pct = (p) => `${Math.round(p * 100)}%`;

/** The patron a card is about: the one you serve, or the house whose court you are at. */
function patronFor(state, inst) {
  return PATRONS[state.patron?.id] || PATRONS[inst.ctx.hostFaction] || null;
}

function factionOf(state, inst, f) {
  if (f === 'host') return inst.ctx.hostFaction || null;
  if (f === 'patron') return state.patron?.id || null;
  if (f === 'side') {
    const s = sideNow(state);
    return s === 'aumbry' || s === 'stane' ? s : null;
  }
  return f;
}

function signed(n) { return n > 0 ? `+${n}` : `−${Math.abs(n)}`; }
function traitWord(key, delta) {
  const pair = TRAIT_PAIRS.find(([a]) => a === key);
  const word = delta >= 0 ? pair[0] : pair[1];
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} +${Math.abs(delta)}`;
}

/** One line per effect, for the button and for the result. */
export function describeEffects(state, inst, effects) {
  const e = effects || {};
  const out = [];
  if (e.purse) out.push(`Purse ${lsdSigned(e.purse)}`);
  if (e.largesse) out.push(`Largesse ${Math.round(e.largesse * 100)}% of the prize (${lsd(Math.round(inst.ctx.prize * e.largesse))})`);
  if (e.renown) out.push(`Renown ${signed(e.renown)}`);
  if (e.honour) out.push(`Honour ${signed(e.honour)}`);
  for (const [f, v] of Object.entries(e.favour || {})) {
    const faction = factionOf(state, inst, f);
    if (faction) out.push(`Favour of ${FACTION_LABELS[faction]} ${signed(v)}`);
  }
  if (e.serve) {
    const p = PATRONS[factionOf(state, inst, e.serve)];
    if (p) out.push(`You enter ${p.name}’s service: ${lsd(p.fee)} a year, his tourney every year, his summons when it comes`);
  }
  if (e.patronTarget && inst.cast[e.patronTarget]) out.push(`Beat ${nameOf(state, inst.cast[e.patronTarget])} before the year is out`);
  if (e.reveal) out.push('You learn whose lance it was');
  if (e.clearMaster) out.push(`${state.master.name}’s name is cleared: honour +4, renown +4`);
  if (e.heart === 'married') out.push('You are married');
  if (e.heart === 'free') out.push('Your promise is broken');
  for (const [role, v] of Object.entries(e.regard || {})) {
    const id = inst.cast[role];
    if (id) out.push(`${nameOf(state, id)} ${v > 0 ? 'thinks better of you' : 'thinks worse of you'} (${signed(v)})`);
  }
  for (const [role, lvl] of Object.entries(e.intel || {})) {
    if (inst.cast[role]) out.push(lvl >= 2 ? `You learn ${nameOf(state, inst.cast[role])}’s tells` : `You learn ${nameOf(state, inst.cast[role])}’s habits`);
  }
  if (e.intelField) out.push(`You learn the habits of ${e.intelField === 1 ? 'a rider' : `${e.intelField} riders`} in the field`);
  if (e.vow) out.push(`A vow: bear ${nameOf(state, inst.cast[e.vow])} down (renown if kept, honour if not)`);
  if (e.wager) out.push(`A wager of ${lsd(e.wager)} on your first bout`);
  if (e.token) out.push('Her favour on your lance: renown +1 for each bout you win here');
  if (e.pas) out.push(`Three courses against ${nameOf(state, inst.cast[e.pas])}`);
  if (e.travelDays) out.push(`${e.travelDays} more day${e.travelDays === 1 ? '' : 's'} on the road`);
  if (e.fatigue) out.push(e.fatigue > 0 ? `You arrive tired (${signed(e.fatigue)} fatigue)` : 'You arrive rested');
  if (e.wound) out.push('You are bruised: −1 lance and seat for this tourney');
  for (const [s, v] of Object.entries(e.stats || {})) out.push(`${STAT_LABELS[s]} ${signed(v)}`);
  for (const [s, v] of Object.entries(e.marks || {})) out.push(`${STAT_LABELS[s]} practice ${signed(v)}`);
  for (const [t, v] of Object.entries(e.traits || {})) out.push(traitWord(t, v));
  for (const [k, v] of Object.entries(e.squire || {})) {
    const words = { lance: 'lance', seat: 'seat', wits: 'wits', loyalty: 'loyalty' };
    out.push(`Your squire’s ${words[k]} ${signed(v)}`);
  }
  if (e.balance) out.push(`The realm leans toward ${e.balance > 0 ? 'Aumbry' : 'Stane'} (+${Math.abs(e.balance)})`);
  if (e.lean) {
    const side = sideNow(state);
    if (side === 'aumbry' || side === 'stane') out.push(`The realm leans toward ${side === 'aumbry' ? 'Aumbry' : 'Stane'} (+${e.lean})`);
  }
  if (e.oath) out.push(...oathLines(state, e.oath));
  if (e.manor) out.push('Your family’s old manor is restored to you');
  if (e.peril) out.push(`Risk of death: ${pct(riskOf(state, e.peril))}`);
  if (e.battle) {
    const b = battlePreview(state, e.battle);
    if (b.side) out.push(`${claimantShort(b.side)}’s chance of the field: ${pct(b.win)}`);
    else out.push(`Duke Robert’s chance of the field: ${pct(b.aumbry)}`);
    out.push(b.peril > 0 ? `Risk of death: ${pct(b.peril)}` : 'No risk to you');
    if (b.capture) out.push(`If your side loses: ${pct(b.capture)} you are taken, ransom ${lsd(b.ransom)}`);
  }
  if (e.pardon === 'pay') out.push(`Purse ${lsdSigned(-(state.realm?.war?.settlement?.fine || 0))}; your name is struck from the list`);
  if (e.pardon === 'mercy') out.push('Pardoned, without the fine');
  if (e.pardon === 'exile') out.push('Exile: the career ends');
  if (e.flags) out.push('The story moves on');
  return out;
}

/** What swearing an oath will do, before it is sworn. */
function oathLines(state, which) {
  const t = oathTerms(state, which);
  const out = [];
  if (t.oath === 'none') out.push('Sworn to nobody');
  else if (t.oath === 'crown') out.push('Sworn to the king’s will, whatever it says');
  else out.push(`Sworn to ${claimant(t.oath)}`);
  if (t.house) out.push(`Favour of ${FACTION_LABELS[t.house]} +2, ${FACTION_LABELS[otherHouse(t.house)]} −2`);
  if (t.turncoat) {
    const was = t.prev === 'crown' ? 'the king’s will' : claimant(t.prev);
    const lost = t.prev === 'aumbry' || t.prev === 'stane' ? `, favour of ${FACTION_LABELS[t.prev]} −5` : '';
    out.push(`You break your oath to ${was}: honour −2${lost}`);
  }
  if (t.breaksService) out.push(`${cap(PATRONS[state.patron.id].name)}’s service ends`);
  return out;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

export function checkValue(state, check) {
  if (check.stat) return state.knight.stats[check.stat];
  return traitValue(state, check.trait);
}

function opposite(t) {
  const pair = TRAIT_PAIRS.find(([a, b]) => a === t || b === t);
  return pair[0] === t ? pair[1] : pair[0];
}

/** The chance of passing a check: shown on the button, and rolled. */
export function checkChance(state, check) {
  const p = sigmoid((checkValue(state, check) - check.dc) * 0.45);
  return Math.max(0.05, Math.min(0.95, p));
}

export function checkLabel(check) {
  if (check.stat) return STAT_LABELS[check.stat];
  return check.trait.charAt(0).toUpperCase() + check.trait.slice(1);
}

/** What the screen shows for each answer. */
export function choicesView(state, inst) {
  const card = cardById(inst.id);
  const ctx = { ...inst.ctx };
  return card.choices.map((ch, i) => {
    const open = holds(state, ch.when, ctx);
    const view = { index: i, label: fill(state, inst, ch.label), open };
    // An answer only a knight of strong character would think of says so.
    const gate = Object.entries(ch.when?.minTrait || {})[0] || Object.entries(ch.when?.maxTrait || {}).map(([t, v]) => [opposite(t), 20 - v])[0];
    if (gate) view.gate = { trait: gate[0], value: traitValue(state, gate[0]) };
    if (ch.check) {
      view.check = { label: checkLabel(ch.check), value: checkValue(state, ch.check), dc: ch.check.dc, chance: checkChance(state, ch.check) };
      view.success = describeEffects(state, inst, ch.success.effects);
      view.failure = describeEffects(state, inst, ch.failure.effects);
    } else {
      view.effects = describeEffects(state, inst, ch.effects);
    }
    return view;
  });
}

// ---------------------------------------------------------------------------
// Applying an answer
// ---------------------------------------------------------------------------

const clampTrait = (v) => Math.max(0, Math.min(20, v));

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
  return clampTrait(Math.round((cur + d * f) * 100) / 100);
}
const clampStat = (v) => Math.max(1, Math.min(20, v));

/**
 * Apply effects. `hooks` lets the flow layer handle what only it can: marks
 * (training), and anything that touches the tourney under way.
 */
export function applyEffects(state, inst, effects, hooks = {}) {
  const e = effects || {};
  const after = []; // what came of it, where that is only known once it is done
  if (e.purse) {
    if (hooks.purse) hooks.purse(e.purse);
    else state.purse += e.purse;
  }
  if (e.renown) state.renown = Math.max(0, state.renown + e.renown);
  if (e.honour) { state.honour += e.honour; clampHonour(state); }
  for (const [f, v] of Object.entries(e.favour || {})) {
    const faction = factionOf(state, inst, f);
    if (faction) state.favour[faction] = (state.favour[faction] || 0) + v;
  }
  for (const [t, v] of Object.entries(e.traits || {})) state.knight.traits[t] = driftTrait(state.knight.traits[t], v);
  for (const [s, v] of Object.entries(e.stats || {})) state.knight.stats[s] = clampStat(state.knight.stats[s] + v);
  for (const [s, v] of Object.entries(e.marks || {})) hooks.marks?.(s, v);
  const town = inst.ctx.town ? TOWNS[inst.ctx.town].name : '';
  for (const [role, v] of Object.entries(e.regard || {})) {
    const id = inst.cast[role];
    const mem = e.memory?.[role]?.replaceAll('{town}', town) || null;
    if (id) adjustRegard(state, id, v, mem);
  }
  for (const [role, text] of Object.entries(e.memory || {})) {
    if (!(e.regard && role in e.regard) && inst.cast[role]) adjustRegard(state, inst.cast[role], 0, text.replaceAll('{town}', town));
  }
  for (const [role, lvl] of Object.entries(e.intel || {})) {
    const id = inst.cast[role];
    if (id) state.intel[id] = Math.max(state.intel[id] || 0, lvl);
  }
  for (const f of e.flags || []) if (!state.flags.includes(f)) state.flags.push(f);
  if (e.squire && state.squire) {
    for (const [k, v] of Object.entries(e.squire)) {
      if (k === 'loyalty') state.squire.loyalty = Math.max(0, Math.min(10, state.squire.loyalty + v));
      else state.squire[k] = Math.max(1, Math.min(18, state.squire[k] + v));
    }
  }
  if (e.serve) {
    const faction = factionOf(state, inst, e.serve);
    if (faction) takeService(state, faction);
  }
  if (e.patronTarget && state.patron && inst.cast[e.patronTarget]) state.patron.target = inst.cast[e.patronTarget];
  if (e.reveal === 'culprit') revealCulprit(state);
  if (e.clearMaster) clearMaster(state, 'Before the heralds, the truth of Ambry Cross was told.');
  if (e.heart) state.heart = e.heart;
  if (e.heart === 'married' && !(state.lands || []).some((l) => l.how === 'dower')) {
    const m = grantManor(state, null, 'dower');
    if (m) after.push(`Her dower is the manor of ${m.name}.`);
  }
  // The realm.
  if (e.balance) shiftBalance(state, e.balance);
  if (e.lean) {
    const side = sideNow(state);
    if (side === 'aumbry') shiftBalance(state, e.lean);
    if (side === 'stane') shiftBalance(state, -e.lean);
  }
  if (e.oath) {
    const t = swear(state, e.oath);
    if (t.breaksService && state.patron) {
      const r = leaveService(state);
      if (r.ok) after.push(r.text);
    }
  }
  if (e.manor === 'claim') {
    const m = grantManor(state, 'crown', 'claim');
    if (m) after.push(`The manor of ${m.name} is yours.`);
  }
  if (e.pardon) pardon(state, e.pardon);
  if (e.peril) rollPeril(state, e.peril, `${inst.id}:${inst.uid}`, DEATHS[inst.id]);
  if (e.battle && state.status === 'active') {
    const { mode, forSide } = battleSpec(state, e.battle);
    after.push(...battleLines(state, fightBattle(state, mode, forSide)));
  }
  hooks.event?.(e, inst);
  return after;
}

/**
 * Answer a card. Returns what came of it. The roll, if any, comes from the
 * card's own stream, so a save reloaded before answering answers the same way.
 */
export function answerCard(state, inst, index, hooks = {}) {
  const card = cardById(inst.id);
  const ch = card.choices[index];
  if (!ch || !holds(state, ch.when, inst.ctx)) throw new Error('That answer is not open to you.');
  let effects = ch.effects;
  let result = ch.result;
  let success = null;
  if (ch.check) {
    const rng = streamFor(state.seed, state.year, `answer:${inst.uid}`);
    success = rng.next() < checkChance(state, ch.check);
    const branch = success ? ch.success : ch.failure;
    effects = branch.effects;
    result = branch.result;
  }
  const lines = describeEffects(state, inst, effects);
  const after = applyEffects(state, inst, effects, hooks);
  state.cardsSeen = state.cardsSeen || {};
  state.cardsSeen[card.id] = (state.cardsSeen[card.id] || 0) + 1;
  return {
    prompt: fill(state, inst, card.text),
    chose: fill(state, inst, ch.label),
    text: [fill(state, inst, result), ...after].join(' '),
    lines,
    success,
  };
}
