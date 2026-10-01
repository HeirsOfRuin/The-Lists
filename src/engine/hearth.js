// The hearth: the ladies of the realm, courtship, marriage and children.
//
// Each lady is a match of some kind: what she brings, what her family asks of
// a suitor, what she values in one, and the knight of the field who is
// courting her too. A knight meets the ladies of the towns he goes to. He wins
// her by months spent at her family's house and by riding in her colours, and
// wins her family by meeting their terms. Every courtship check shows its
// chance, from the same function the cards use, and that is the chance rolled.
//
// This module imports neither the cards nor the tourney, so both can call it.

import { streamFor } from './rng.js';
import {
  MATCHES, VALUES, APPROACHES, VALUED_BONUS, COLOURS, RIVALS, HAND, MARRIAGE_LIFE, BARONIES, STYLE, REPEAT,
} from '../data/hearth.data.js';
import { LADY_NAMES, HOUSE_NAMES, GIVEN_NAMES } from '../data/names.data.js';
import { TOWNS, FACTION_LABELS } from '../data/world.data.js';
import { checkChance } from './checks.js';
import { grantManor } from './realm.js';
import { knightById } from './field.js';
import { createBaron } from './title.js';

const KINDS = ['merchant', 'lord', 'heiress', 'widow', 'ward'];

// ---------------------------------------------------------------------------
// The ladies of the realm
// ---------------------------------------------------------------------------

export function ladyName(l) {
  return `${STYLE[l.kind] || 'the lady'} ${l.given} ${l.house}`;
}

function pickRival(state, rng, taken) {
  const pool = state.roster.knights.filter((k) => k.active && k.age >= 21 && k.age <= 38 && !taken.has(k.id));
  if (!pool.length) return null;
  return rng.pick(pool).id;
}

function makeLady(state, rng, kind, n) {
  const M = MATCHES[kind];
  const ladies = state.ladies || [];
  const usedNames = new Set(ladies.map((l) => l.given));
  if (state.betrothed) usedNames.add(state.betrothed);
  const usedHouses = new Set([...ladies.map((l) => l.house), state.knight.house]);
  const given = rng.pick(LADY_NAMES.filter((x) => !usedNames.has(x))) || rng.pick(LADY_NAMES);
  const house = rng.pick(HOUSE_NAMES.filter((x) => !usedHouses.has(x))) || rng.pick(HOUSE_NAMES);
  const town = rng.pick(M.towns);
  const faction = M.faction === 'house' ? (town === 'ambryCross' ? 'aumbry' : 'stane') : M.faction;
  const taken = new Set(ladies.filter((l) => l.rival).map((l) => l.rival.id));
  const rival = pickRival(state, rng, taken);
  return {
    id: `l${n}`,
    given, house, kind, town, faction,
    value: rng.pick(Object.keys(VALUES)),
    age: rng.range(M.age[0], M.age[1]),
    pounds: rng.range(M.brings.pounds[0], M.brings.pounds[1]),
    manors: M.brings.manors,
    barony: M.brings.barony ? rng.pick(BARONIES) : null,
    affection: 0,
    status: 'free',
    husband: null,
    rival: rival ? { id: rival, suit: rng.range(RIVALS.start[0], RIVALS.start[1]) } : null,
    since: state.year,
    asked: 0,
  };
}

/**
 * The ladies of the realm at the start of a career. A knight betrothed in his
 * story is betrothed to one of them already.
 */
export function ladiesFor(state) {
  const rng = streamFor(state.seed, 0, 'ladies');
  state.ladies = [];
  state.ladySerial = 0;
  for (const kind of KINDS) {
    for (let i = 0; i < MATCHES[kind].count; i++) {
      state.ladySerial += 1;
      state.ladies.push(makeLady(state, rng, kind, state.ladySerial));
    }
  }
  state.spouse = null;
  state.children = [];
  state.engaged = null;
  if (state.heart === 'promised' && state.betrothed) {
    state.ladySerial += 1;
    const home = Object.values(TOWNS).find((t) => t.province === state.province && !t.city)?.id || 'kingsmead';
    state.ladies.push({
      id: `l${state.ladySerial}`, given: state.betrothed, house: rng.pick(HOUSE_NAMES.filter((h) => h !== state.knight.house)),
      kind: 'betrothed', town: home, faction: null, value: rng.pick(Object.keys(VALUES)), age: 19,
      pounds: 0, manors: 1, barony: null, affection: 60, status: 'promised', husband: null, rival: null, since: 1, asked: 0,
    });
  }
}

export function ladyById(state, id) { return (state.ladies || []).find((l) => l.id === id) || null; }

/** A knight knows the ladies of every town he has been to. */
export function hasMet(state, l) { return (state.visited || []).includes(l.town); }

/** The ladies a knight can see: met or spoken of, still free or his own. */
export function ladiesInView(state) {
  return (state.ladies || []).filter((l) => l.status !== 'married');
}

/** Whether your heart is free to court. */
export function heartFree(state) {
  if (state.spouse?.alive) return { ok: false, reason: 'You are married.' };
  if (state.engaged) return { ok: false, reason: 'You are betrothed; the wedding is at Candlemas.' };
  if (state.heart === 'promised') return { ok: false, reason: 'You are promised to another.' };
  if (state.heart === 'secret') return { ok: false, reason: 'Your heart is given, where nobody can know.' };
  return { ok: true, reason: null };
}

// ---------------------------------------------------------------------------
// Her family's terms
// ---------------------------------------------------------------------------

/** What her family asks of a suitor, line by line, with what you have. */
export function ladyTerms(state, l) {
  const W = MATCHES[l.kind]?.wants || {};
  const out = [];
  if (W.renown) out.push({ label: `renown ${W.renown}`, have: state.renown, ok: state.renown >= W.renown });
  if (W.honour) out.push({ label: `honour ${W.honour}`, have: state.honour, ok: state.honour >= W.honour });
  if (W.lineage) out.push({ label: `lineage ${W.lineage}`, have: state.lineage, ok: state.lineage >= W.lineage });
  if (W.favour && l.faction) out.push({ label: `the favour of ${FACTION_LABELS[l.faction]} at ${W.favour}`, have: state.favour[l.faction] || 0, ok: (state.favour[l.faction] || 0) >= W.favour });
  const C = MATCHES[l.kind]?.crown;
  if (C) {
    const crown = state.favour.crown || 0;
    out.push({ label: `the Crown’s leave: its favour at ${C.favour}, or £${C.price / 240} for her marriage`, have: crown, ok: crown >= C.favour || state.purse >= C.price, buy: crown < C.favour });
  }
  out.push({ label: `her affection at ${consentOf(l)}`, have: Math.round(l.affection), ok: l.affection >= consentOf(l), hers: true });
  return out;
}

function consentOf(l) { return MATCHES[l.kind]?.consent ?? 50; }

/** Whether you may ask for her hand now. */
export function canAsk(state, l) {
  const free = heartFree(state);
  if (!free.ok) return free;
  if (!l || l.status !== 'free') return { ok: false, reason: 'She is not free.' };
  if (!hasMet(state, l)) return { ok: false, reason: `You have not met her. Her family is at ${TOWNS[l.town].name}.` };
  const lack = ladyTerms(state, l).filter((t) => !t.ok);
  if (lack.length) return { ok: false, reason: `Not yet: ${lack.map((t) => t.label).join('; ')}.` };
  return { ok: true, reason: null };
}

/** Ask her family for her hand. If they say yes, the wedding is at Candlemas. */
export function askHand(state, id) {
  const l = ladyById(state, id);
  const c = canAsk(state, l);
  if (!c.ok) {
    if (l && l.status === 'free' && heartFree(state).ok && hasMet(state, l)) {
      l.affection = Math.max(0, l.affection + HAND.refusedAffection);
      l.asked += 1;
    }
    return c;
  }
  const C = MATCHES[l.kind].crown;
  let lines = [];
  if (C && (state.favour.crown || 0) < C.favour) {
    state.purse -= C.price;
    lines.push(`You buy her marriage from the Crown for £${C.price / 240}.`);
  }
  l.status = 'promised';
  state.engaged = { id: l.id, year: state.year };
  state.heart = 'promised';
  state.betrothed = l.given;
  lines.push(`${cap(ladyName(l))}’s family gives its consent. You are betrothed, and the wedding is set for Candlemas.`);
  return { ok: true, lines };
}

/** Marry her without her family's leave. */
export function canElope(state, l) {
  const free = heartFree(state);
  if (!free.ok) return free;
  if (!l || l.status !== 'free') return { ok: false, reason: 'She is not free.' };
  if (l.kind === 'ward') return { ok: false, reason: 'Nobody marries a ward of the Crown without the Crown’s leave and keeps his head.' };
  if (l.affection < HAND.elope.affection) return { ok: false, reason: `She would have to love you more than that: her affection is ${Math.round(l.affection)} of the ${HAND.elope.affection} it would take.` };
  return { ok: true, reason: null };
}

export function elope(state, id) {
  const l = ladyById(state, id);
  const c = canElope(state, l);
  if (!c.ok) return c;
  state.honour += HAND.elope.honour;
  if (l.faction) state.favour[l.faction] = (state.favour[l.faction] || 0) + HAND.elope.favour;
  const lines = wed(state, l, 'elope');
  return { ok: true, lines };
}

// ---------------------------------------------------------------------------
// Courting her
// ---------------------------------------------------------------------------

/** The ways to spend a month courting her: each with its chance, what it is worth, and what it costs. */
export function approachesFor(state, l) {
  return Object.entries(APPROACHES).map(([id, a]) => {
    const valued = VALUES[l.value]?.approach === id;
    // The same courtesy twice is worth less than the first time.
    const used = l.tried?.[id] || 0;
    const gain = Math.round((a.gain * (valued ? VALUED_BONUS : 1)) / (1 + REPEAT * used));
    return { id, ...a, valued, used, gain, chance: a.check ? checkChance(state, a.check) : 1 };
  });
}

/** Whether you may court her this month, and if not why. */
export function canCourt(state, l) {
  const free = heartFree(state);
  if (!free.ok) return free;
  if (!l || l.status !== 'free') return { ok: false, reason: 'She is not free.' };
  if (!hasMet(state, l)) return { ok: false, reason: `You have not met her. Her family is at ${TOWNS[l.town].name}: ride there for a tourney, or to court.` };
  return { ok: true, reason: null };
}

/** A month at her family's house. The road is paid by the caller. Returns what happened. */
export function court(state, l, approachId) {
  const a = approachesFor(state, l).find((x) => x.id === approachId);
  if (!a) return { ok: false, reason: 'No such way to court her.' };
  if (a.cost && state.purse < a.cost) return { ok: false, reason: 'You cannot afford it.' };
  if (a.cost) state.purse -= a.cost;
  const rng = streamFor(state.seed, state.year, `court:${l.id}:${state.month}`);
  const success = a.check ? rng.next() < a.chance : true;
  const delta = success ? a.gain : -a.loss;
  l.affection = Math.max(0, Math.min(100, l.affection + delta));
  l.tried = { ...(l.tried || {}), [a.id]: (l.tried?.[a.id] || 0) + 1 };
  return { ok: true, success, delta, approach: a };
}

// ---------------------------------------------------------------------------
// Her colours at a tourney
// ---------------------------------------------------------------------------

/** The ladies at a tourney who might give you their sleeve. */
export function ladiesAt(state, ev) {
  return (state.ladies || []).filter((l) => (l.status === 'free' || (l.status === 'promised' && state.engaged?.id === l.id) || l.status === 'yours')
    && (l.town === ev.town || ev.tier === 'grand'));
}

export function canAskColours(state, ev, l) {
  if (!ev || ev.colours) return { ok: false, reason: ev?.colours ? 'You already ride in a lady’s colours.' : 'There is no tourney.' };
  if (!['free', 'promised', 'yours'].includes(l.status)) return { ok: false, reason: 'She is not free to give them.' };
  if (l.status === 'free' && !heartFree(state).ok) return { ok: false, reason: 'You are not free to wear them.' };
  if (l.status === 'free' && l.affection < COLOURS.ask) return { ok: false, reason: `She does not know you well enough yet (affection ${Math.round(l.affection)} of ${COLOURS.ask}).` };
  return { ok: true, reason: null };
}

/** Ride tomorrow in her colours. */
export function askColours(state, ev, id) {
  const l = ladyById(state, id);
  const c = l ? canAskColours(state, ev, l) : { ok: false, reason: 'No such lady.' };
  if (!c.ok) return c;
  ev.colours = l.id;
  ev.token = true;
  return { ok: true };
}

/** After a tourney ridden in her colours: what she thought of it. */
export function coloursResult(state, entry, ladyId) {
  const l = ladyById(state, ladyId);
  if (!l || !entry) return null;
  let delta = (entry.boutsWon || 0) * COLOURS.boutWon;
  const won = entry.placing === 'champion' || entry.melee?.prize || entry.foot?.champion;
  if (won) delta += COLOURS.champion;
  if (entry.placing === 'first') delta += COLOURS.beatenFirst;
  if (l.status === 'free') l.affection = Math.max(0, Math.min(100, l.affection + delta));
  return { lady: l, delta, won: !!won };
}

// ---------------------------------------------------------------------------
// Marriage
// ---------------------------------------------------------------------------

/**
 * Marry her. `how`: 'match' (courted and consented), 'elope', 'card' (the
 * betrothal of your story, whose dowry the card pays), 'secret' (the lady you
 * loved in secret, widowed). Returns lines saying what came with her.
 */
export function wed(state, l, how, add = null) {
  const lines = [];
  const pay = (label, amount) => { if (add) add(label, amount); else state.purse += amount; };
  l.status = 'yours';
  state.spouse = {
    id: l.id, given: l.given, house: l.house, kind: l.kind, name: ladyName(l), since: state.year, age: l.age, alive: true,
    how, faction: how === 'elope' ? null : l.faction,
  };
  state.heart = 'married';
  state.engaged = null;
  if (!state.flags.includes('married')) state.flags.push('married');
  if (how === 'match' && l.pounds) {
    pay(`${cap(ladyName(l))}’s dowry`, l.pounds * 240);
    lines.push(`Her dowry is £${l.pounds}.`);
  }
  if (how !== 'elope') {
    for (let i = 0; i < l.manors; i++) {
      const m = grantManor(state, null, 'dower');
      if (m) lines.push(`She brings you the manor of ${m.name}.`);
    }
    const fav = MATCHES[l.kind]?.brings.favour;
    if (fav && l.faction) {
      state.favour[l.faction] = (state.favour[l.faction] || 0) + fav;
      lines.push(`Her family’s house, ${FACTION_LABELS[l.faction]}, counts you as one of its own now.`);
    }
  } else {
    lines.push('Her family sends nothing, and says a great deal.');
  }
  if (l.barony) {
    createBaron(state, 'marriage', l.barony);
    lines.push(`By right of your wife you are Lord ${l.barony}.`);
  }
  const who = `Sir ${state.knight.given} ${state.knight.house}`;
  const where = how === 'elope' ? 'at a church door far from her family' : 'at Candlemas';
  state.book.push({
    serial: 0, year: state.year, tier: 'marriage', name: 'A marriage', town: TOWNS[l.town]?.name || '', placing: null, net: 0,
    text: `In the ${ordinal(state.year)} year of his knighthood, ${who} married ${ladyName(l)}, ${MATCHES[l.kind]?.label || 'his betrothed'}, ${where}.`,
  });
  state.yearNotes = [...(state.yearNotes || []), { line: `${who} married ${ladyName(l)}.` }];
  return lines;
}

/** The wedding of the betrothal your story began with, when its card says yes. */
export function wedFromCard(state) {
  const l = (state.ladies || []).find((x) => x.status === 'promised' && x.kind === 'betrothed');
  if (l) return wed(state, l, 'card');
  return [];
}

/** The lady you loved in secret, free at last. */
export function wedSecret(state) {
  const rng = streamFor(state.seed, state.year, 'secret-love');
  state.ladySerial = (state.ladySerial || 0) + 1;
  const used = new Set((state.ladies || []).map((l) => l.given));
  const l = {
    id: `l${state.ladySerial}`, given: rng.pick(LADY_NAMES.filter((x) => !used.has(x))) || 'Avice',
    house: rng.pick(HOUSE_NAMES.filter((h) => h !== state.knight.house)), kind: 'secret', town: 'kingsmead',
    faction: null, value: 'valorous', age: 30, pounds: 0, manors: 1, barony: null, affection: 100, status: 'free', husband: null, rival: null, since: state.year, asked: 0,
  };
  state.ladies = [...(state.ladies || []), l];
  return wed(state, l, 'secret');
}

/** A betrothal broken: she will not hear your name again. */
export function jilt(state) {
  for (const l of state.ladies || []) {
    if (l.status === 'promised') { l.status = 'free'; l.affection = 0; l.jilted = true; }
  }
  state.engaged = null;
}

// ---------------------------------------------------------------------------
// Winter
// ---------------------------------------------------------------------------

/**
 * The hearth's winter: the wedding if one is set, the rivals' suits, the
 * ladies who marry them and the ones who come of age, and a marriage's year:
 * her household, her stewardship, her family, and children.
 */
export function hearthWinter(state, notes, add) {
  if (!state.ladies) return;
  const rng = streamFor(state.seed, state.year, 'hearth');
  // The wedding.
  if (state.engaged && state.engaged.year <= state.year) {
    const l = ladyById(state, state.engaged.id);
    if (l) {
      const lines = wed(state, l, 'match', add);
      notes.push(`You married ${ladyName(l)} at Candlemas. ${lines.join(' ')}`);
    }
  }
  // The rivals press their suits; a lady whose family tires of waiting marries.
  for (const l of [...state.ladies]) {
    if (l.status !== 'free') continue;
    l.age += 1;
    if (l.rival) {
      const k = knightById(state, l.rival.id);
      if (!k || !k.active) l.rival = null;
    }
    if (!l.rival) {
      const taken = new Set(state.ladies.filter((x) => x.rival).map((x) => x.rival.id));
      const r = pickRival(state, rng, taken);
      if (r) l.rival = { id: r, suit: rng.range(RIVALS.start[0], RIVALS.start[1]) };
      continue;
    }
    const k = knightById(state, l.rival.id);
    l.rival.suit = Math.min(RIVALS.wins, l.rival.suit + rng.range(RIVALS.perWinter[0], RIVALS.perWinter[1]) + (k.renown > 60 ? RIVALS.renownBonus : 0));
    if (l.rival.suit >= RIVALS.wins && l.rival.suit > l.affection && !l.jilted) {
      l.status = 'married';
      l.husband = k.id;
      if (hasMet(state, l) || l.affection > 0) notes.push(`${cap(ladyName(l))} has married ${k.name}.`);
      state.yearNotes = [...(state.yearNotes || []), { line: `${cap(ladyName(l))} married ${k.name}.` }];
      // Another comes of age to take her place.
      state.ladySerial += 1;
      state.ladies.push(makeLady(state, rng, l.kind === 'betrothed' ? 'lord' : l.kind, state.ladySerial));
    }
  }
  // A marriage's year.
  const sp = state.spouse;
  if (sp?.alive) {
    sp.age += 1;
    if (sp.since < state.year) {
      add(`${cap(sp.name)}’s household`, -MARRIAGE_LIFE.household);
      const manors = (state.lands || []).length;
      if (manors) add(`${cap(sp.name)}’s keeping of your rolls`, manors * MARRIAGE_LIFE.stewardship);
      if (sp.faction && sp.faction !== 'cities') state.favour[sp.faction] = (state.favour[sp.faction] || 0) + MARRIAGE_LIFE.houseFavour;
    }
    if (sp.age < 40 && rng.next() < MARRIAGE_LIFE.childChance) {
      const son = rng.next() < 0.5;
      const used = new Set(state.children.map((c) => c.name));
      const name = rng.pick((son ? GIVEN_NAMES : LADY_NAMES).filter((x) => !used.has(x) && x !== state.knight.given)) || (son ? 'John' : 'Anne');
      if (rng.next() < MARRIAGE_LIFE.childbedDeath) {
        sp.alive = false;
        state.heart = 'free';
        state.children.push({ name, son, born: state.year });
        notes.push(`${cap(sp.name)} was brought to bed of ${son ? 'a son' : 'a daughter'}, ${name}, and did not live. The child did.`);
        state.book.push({ serial: 0, year: state.year, tier: 'marriage', name: 'A death', town: '', placing: null, net: 0,
          text: `In the winter of his ${ordinal(state.year)} year, Sir ${state.knight.given} ${state.knight.house}’s wife, ${sp.name}, died in childbed. Their ${son ? 'son' : 'daughter'} ${name} lived.` });
      } else {
        state.children.push({ name, son, born: state.year });
        notes.push(`${cap(sp.name)} has given you ${son ? 'a son' : 'a daughter'}: ${name}.`);
      }
    }
  }
}

/** What the epilogue says of a knight's marriage and children. */
export function familyLine(state) {
  const sp = state.spouse;
  const kids = state.children || [];
  const parts = [];
  if (sp) {
    const how = { elope: ', without her family’s leave', secret: ', whom he had loved in secret for years', card: '', match: '' }[sp.how] || '';
    parts.push(`He married ${sp.name}${how} in the ${ordinal(sp.since)} year of his knighthood${sp.alive ? '' : '; she died in childbed'}.`);
  }
  if (kids.length) {
    const sons = kids.filter((c) => c.son);
    const daughters = kids.filter((c) => !c.son);
    const words = [];
    if (sons.length) words.push(`${count(sons.length)} son${sons.length === 1 ? '' : 's'}`);
    if (daughters.length) words.push(`${count(daughters.length)} daughter${daughters.length === 1 ? '' : 's'}`);
    parts.push(`They had ${words.join(' and ')}.`);
    if (sons.length) parts.push(state.title ? `His son ${sons[0].name} was Lord ${state.title.seat} after him.` : `His son ${sons[0].name} had his lands after him.`);
  }
  return parts.join(' ');
}

function count(n) { return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'][n] || String(n); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
