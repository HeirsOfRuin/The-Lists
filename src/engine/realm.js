// The realm: ten years of peace wearing thin, and then the war.
//
// Three things are tracked. TENSION rises on a fixed schedule: the king is
// dying, and nothing a knight does will stop it. The BALANCE between Aumbry
// and Stane moves with who wins the great tourneys, the proxy war on the
// circuit, and with what knights do and say. It decides whom the old king's
// will names, and so which side the Crown's own knights ride for. And a
// knight's IMPORTANCE, built from everything he has done in those ten years,
// decides where he stands when it comes to swords.
//
// This module reads the roster directly rather than importing field.js, so the
// field, the court and the tourney can all call into it without a cycle.

import { streamFor } from './rng.js';
import { yearCalendar } from './calendar.js';
import {
  WAR_RUMOURS, PEACE_RUMOURS, CLAIMANTS, WAR_YEAR, TENSION, PARTISAN_AT, BALANCE, MANORS, LANDS, COMPANY, IMPORTANCE, RANKS,
  BATTLE, SPOILS, ATTAINDER, RUMOURS, RUMOUR_BANDS, INVITATIONS, OATH, DEATHS,
} from '../data/realm.data.js';
import { PATRONS, CONDUCT } from '../data/court.data.js';
import { ARCHERS, ORDER, FAIRS } from '../data/life.data.js';
import { learn } from './lore.js';
import { createBaron, forfeitTitle } from './title.js';
import { TITLES, MARRIAGE_LIFE } from '../data/hearth.data.js';
import { TOWNS, FACTION_LABELS } from '../data/world.data.js';

export function freshRealm(year = 1) {
  return {
    tension: TENSION[Math.min(year, WAR_YEAR)] ?? 100,
    balance: 0,
    oath: null,        // aumbry | stane | crown (the king's will, whatever it says) | none
    king: 'alive',
    will: null,        // whom the will names, once it is opened
    war: null,
    ruler: null,
    beats: {},
    rumour: null,
    wins: { aumbry: 0, stane: 0 },
  };
}

/** Who holds court at Kingsmead: the old king, his household after him, or the new crown. */
export function crownHost(state, king) {
  const r = state.realm;
  if (r?.ruler) return `the court of ${CLAIMANTS[r.ruler].crowned}`;
  if (r?.king === 'dead') return 'the late king’s household';
  return `the court of King ${king}`;
}

export function tensionFor(year) { return TENSION[Math.min(year, WAR_YEAR)] ?? 100; }
export function atWar(state) { return !!state.realm?.war && !state.realm.war.done; }
function disgraced(state) { return state.honour < CONDUCT.find((c) => c.id === 'questioned').min; }
export function partisan(state) { return (state.realm?.tension || 0) >= PARTISAN_AT && !state.realm?.ruler; }

/** The side a knight is sworn to, by oath, or by his patron's house before any oath. */
export function sideOf(state) {
  const r = state.realm;
  if (r.oath === 'none') return null;
  if (r.oath === 'crown') return r.will || 'crown';
  if (r.oath) return r.oath;
  const p = state.patron?.id;
  if (p === 'aumbry' || p === 'stane') return p;
  if (p === 'crown') return r.will || 'crown';
  return null;
}

/** Your side as a card sees it: by oath and patron before the war, by oath once it comes. */
export function sideNow(state) {
  const s = state.realm?.war ? warSide(state) : sideOf(state);
  return s || 'none';
}

export function rankIndex(id) { return RANKS.findIndex((r) => r.id === id); }

/** The other claimant. */
export function otherHouse(side) { return side === 'aumbry' ? 'stane' : side === 'stane' ? 'aumbry' : null; }

/**
 * What an oath comes to, before it is sworn: the house it binds you to, and
 * what breaking an earlier oath costs. The button shows this; swear() does it.
 */
export function oathTerms(state, which) {
  const r = state.realm;
  const oath = which === 'heir' ? r.will : which === 'other' ? otherHouse(r.will) : which;
  const prev = r.oath === 'crown' ? (r.will || 'crown') : r.oath;
  const now = oath === 'crown' ? (r.will || 'crown') : oath;
  const turncoat = !!prev && prev !== 'none' && prev !== now;
  const house = oath === 'aumbry' || oath === 'stane' ? oath : null;
  // A patron whose house you do not swear to is a patron no longer.
  const p = state.patron?.id;
  let breaksService = false;
  if (p === 'aumbry' || p === 'stane') breaksService = now !== p;
  else if (p === 'crown') breaksService = oath === 'none' || (!!house && house !== r.will);
  return { oath, house, turncoat, prev, breaksService };
}

export function swear(state, which) {
  const t = oathTerms(state, which);
  const r = state.realm;
  if (t.turncoat) {
    state.honour -= OATH.turncoatHonour;
    if (t.prev === 'aumbry' || t.prev === 'stane') state.favour[t.prev] = (state.favour[t.prev] || 0) - OATH.turncoatFavour;
  }
  if (t.house) {
    state.favour[t.house] = (state.favour[t.house] || 0) + OATH.favour;
    state.favour[otherHouse(t.house)] = (state.favour[otherHouse(t.house)] || 0) - OATH.favour;
  }
  r.oath = t.oath;
  return t;
}

// ---------------------------------------------------------------------------
// The proxy war on the circuit
// ---------------------------------------------------------------------------

/** A great tourney won: the realm leans toward the champion's house. */
export function creditBalance(state, tier, allegiance, { yours = false } = {}) {
  if (!state.realm || state.realm.ruler) return;
  if (tier !== 'high' && tier !== 'grand') return;
  if (allegiance !== 'aumbry' && allegiance !== 'stane') return;
  let shift = BALANCE[tier] * (yours ? BALANCE.yours : 1);
  if (allegiance === 'stane') shift = -shift;
  state.realm.balance = Math.max(-BALANCE.max, Math.min(BALANCE.max, state.realm.balance + shift));
  state.realm.wins[allegiance] += 1;
}

export function shiftBalance(state, n) {
  if (!state.realm || state.realm.ruler) return;
  state.realm.balance = Math.max(-BALANCE.max, Math.min(BALANCE.max, state.realm.balance + n));
}

/** Who leads, in words. */
export function balanceWords(state) {
  const b = state.realm.balance;
  if (Math.abs(b) < 5) return 'The houses stand even.';
  const who = b > 0 ? 'Aumbry' : 'Stane';
  if (Math.abs(b) < 15) return `${who} has the edge.`;
  if (Math.abs(b) < 30) return `${who} is clearly ahead.`;
  return `${who} carries the court.`;
}

/** What they are saying in the halls this month. */
export function pickRumour(state) {
  const r = state.realm;
  const rng = streamFor(state.seed, state.year, `rumour:${state.month}`);
  if (r.ruler) return state.year <= (r.coronationYear || 0) + 1 ? rng.pick(PEACE_RUMOURS) : null;
  if (r.war) return rng.pick(WAR_RUMOURS);
  const band = RUMOUR_BANDS.filter((t) => r.tension >= t).length;
  const lean = r.balance > 8 ? 'aumbryAhead' : r.balance < -8 ? 'staneAhead' : null;
  const pool = RUMOURS.filter((x) => x.band <= band && x.band >= band - 1 && (!x.when || x.when === lean));
  return pool.length ? rng.pick(pool).text : null;
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

/**
 * Whether the heralds have sent you a letter for a high tourney or the King's,
 * and why — or why not, in words that say what would change it.
 */
export function invitation(state, cal) {
  if (!BY_LETTER.has(cal.tier)) return { invited: true, why: null };
  const side = sideOf(state);
  if (disgraced(state)) {
    return { invited: false, why: null, need: 'The heralds will not cry the name of a disgraced knight at a great tourney. A pilgrimage would begin to mend it.' };
  }
  if (cal.tier === 'greatpas') return { invited: true, why: 'Its articles admit any knight of name and arms.' };
  if (state.order?.companion) return { invited: true, why: 'A Companion of the Swan is bidden to every great tourney.' };
  if (state.title) return { invited: true, why: `A lord of the realm is bidden to every great tourney.` };
  const I = INVITATIONS[cal.tier];
  if (cal.tier === 'high') {
    const house = cal.host.faction;
    const rival = PATRONS[house]?.rival;
    const name = PATRONS[house]?.name || cal.host.name;
    if (partisan(state) && rival && side === rival) {
      return { invited: false, why: null, need: `${cap(name)} does not invite a man sworn to his rival, not with the realm as it is.` };
    }
    if (state.patron?.id === house) return { invited: true, why: `You are ${name}’s man.` };
    if ((state.favour[house] || 0) >= I.favour) return { invited: true, why: `${cap(name)} thinks well of you.` };
    if (state.renown >= I.renown) return { invited: true, why: 'Your renown speaks for you.' };
    if (state.lineage >= I.lineage) return { invited: true, why: 'The heralds know your quarterings, and so does he.' };
    return { invited: false, why: null, need: `${cap(name)} invites knights of renown ${I.renown}, his own men, those whose favour with him has reached ${I.favour}, and men of lineage ${I.lineage}. You have renown ${state.renown}, his favour at ${state.favour[house] || 0}, and lineage ${state.lineage}.` };
  }
  // The King's Tourney.
  if (state.patron?.id === 'crown') return { invited: true, why: 'You are the king’s man.' };
  if ((state.favour.crown || 0) >= I.favour) return { invited: true, why: 'The Crown thinks well of you.' };
  if (state.renown >= I.renown) return { invited: true, why: 'Your renown speaks for you.' };
  if (state.patron && (state.favour[state.patron.id] || 0) >= I.train) {
    return { invited: true, why: `${cap(PATRONS[state.patron.id].name)} brings you in his train.` };
  }
  return { invited: false, why: null, need: `The King’s heralds invite knights of renown ${I.renown}, those the Crown favours at ${I.favour}, and the men great lords bring in their train. You have renown ${state.renown} and the Crown’s favour at ${state.favour.crown || 0}.` };
}

/** Whether you may ride at a tourney at all: the great ones need a letter. */
export function admitted(state, cal) {
  const h = hasInvitation(state, cal);
  return h.ok ? { ok: true, reason: null, why: h.why || null } : { ok: false, reason: h.reason };
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
const BY_LETTER = new Set(['high', 'grand', 'greatpas']);

/** Letters for next month's great tourneys, sent as a month begins. */
export function sendInvitations(state) {
  state.invitations = state.invitations || {};
  const next = state.month + 1;
  for (const cal of state.calendar.filter((e) => e.month === next && (e.tier === 'high' || e.tier === 'grand'))) {
    if (state.invitations[cal.id]) continue;
    const inv = invitation(state, cal);
    if (inv.invited) {
      state.invitations[cal.id] = { why: inv.why };
      state.notices = [...(state.notices || []), `A herald brings a letter: you are invited to ${cal.name} in ${monthWord(next)}. ${inv.why}`];
    }
  }
}
function monthWord(m) { return { 3: 'March', 4: 'April', 5: 'May', 6: 'June', 7: 'July', 8: 'August', 9: 'September', 10: 'October' }[m]; }

/** Whether you hold a letter for this tourney (a month's notice, or still qualifying now). */
export function hasInvitation(state, cal) {
  if (!BY_LETTER.has(cal.tier)) return { ok: true };
  // A letter stands, unless the knight it was sent to has since been disgraced.
  if (state.invitations?.[cal.id] && !disgraced(state)) return { ok: true, why: state.invitations[cal.id].why };
  const inv = invitation(state, cal);
  return inv.invited ? { ok: true, why: inv.why } : { ok: false, reason: inv.need };
}

// ---------------------------------------------------------------------------
// Lands and the company
// ---------------------------------------------------------------------------

export function manorDef(id) { return MANORS.find((m) => m.id === id); }
export function menOf(state) {
  return (state.company || 0) + (state.lands || []).reduce((t, l) => t + manorDef(l.id).men, 0);
}
export function companyMax(state) { return COMPANY.base + COMPANY.perManor * (state.lands || []).length; }
export function archersMax(state) { return ARCHERS.base + ARCHERS.perManor * (state.lands || []).length; }
/** What your men and bowmen come to in a battle line, counted as men-at-arms. */
export function strengthOfMen(state) { return menOf(state) + (state.archers || 0) * ARCHERS.strength; }

/** Grant a manor nobody holds, preferring your own country. Returns it, or null. */
export function grantManor(state, heldOf, how) {
  state.lands = state.lands || [];
  const held = new Set(state.lands.map((l) => l.id));
  const free = MANORS.filter((m) => !held.has(m.id));
  if (!free.length) return null;
  const rng = streamFor(state.seed, state.year, `manor:${how}:${state.lands.length}`);
  const home = free.filter((m) => m.province === state.province);
  const m = rng.pick(home.length ? home : free);
  state.lands.push({ id: m.id, heldOf, how, since: state.year });
  return m;
}

/** Lands held of a lord who has fallen go with him. */
export function forfeit(state, heldOf) {
  const lost = (state.lands || []).filter((l) => heldOf === 'all' || l.heldOf === heldOf);
  state.lands = (state.lands || []).filter((l) => !lost.includes(l));
  if (state.company > companyMax(state)) state.company = companyMax(state);
  return lost.map((l) => manorDef(l.id));
}

/** A manor on the market this winter, if one is free. */
export function manorOffer(state) {
  const held = new Set((state.lands || []).map((l) => l.id));
  const free = MANORS.filter((m) => !held.has(m.id));
  if (!free.length || atWar(state)) return null;
  const rng = streamFor(state.seed, state.year, 'manor-market');
  const m = rng.pick(free);
  return { ...m, price: m.income * LANDS.pricePerIncome * 240 };
}

// ---------------------------------------------------------------------------
// Importance
// ---------------------------------------------------------------------------

/** How much you matter, term by term, and the rank it comes to. */
export function importance(state) {
  const I = IMPORTANCE;
  const side = sideOf(state);
  const lands = (state.lands || []).length;
  const men = menOf(state);
  const sideFavour = side && side !== 'crown' ? state.favour[side] || 0 : side === 'crown' ? state.favour.crown || 0 : 0;
  const virtue = state.knight.epithet && ['the Valiant', 'the Generous', 'the Merciful', 'the Devout', 'the True', 'the Constant'].includes(state.knight.epithet);
  const terms = [
    { label: state.renown > I.renownCap ? `Renown ${state.renown} (counts to ${I.renownCap})` : `Renown ${state.renown}`, value: Math.min(state.renown, I.renownCap) * I.renown },
    { label: `Honour ${state.honour}`, value: Math.max(0, state.honour) * I.honour },
    { label: `Lineage ${state.lineage}`, value: state.lineage * I.lineage },
    { label: `${lands} manor${lands === 1 ? '' : 's'}`, value: lands * I.manor },
    { label: `${men} men-at-arms`, value: men * I.man },
    ...(state.archers ? [{ label: `${state.archers} archers`, value: state.archers * ARCHERS.strength * I.man }] : []),
    { label: state.patron ? `In ${PATRONS[state.patron.id].name}’s service` : 'No patron', value: state.patron ? I.patron : 0 },
    { label: side ? `Favour of ${FACTION_LABELS[side] || side} ${sideFavour}` : 'Sworn to nobody', value: Math.max(0, sideFavour) * I.favour },
    { label: virtue ? `Known as ${state.knight.epithet}` : 'No byname for a virtue', value: virtue ? I.virtue : 0 },
    { label: `${state.career.greatPrizes || 0} great prize${state.career.greatPrizes === 1 ? '' : 's'}`, value: Math.min(I.prizeCap, (state.career.greatPrizes || 0) * I.prize) },
    ...(state.order?.companion ? [{ label: 'A Companion of the Swan', value: ORDER.importance }] : []),
    ...(state.title ? [{ label: `Lord ${state.title.seat}, a baron of the realm`, value: TITLES.importance }] : []),
    ...(state.spouse?.alive ? [{ label: `Married to ${state.spouse.name}`, value: MARRIAGE_LIFE.importance }] : []),
  ];
  const score = Math.round(terms.reduce((t, x) => t + x.value, 0));
  let rank = RANKS[0];
  for (const r of RANKS) if (score >= r.min) rank = r;
  const next = RANKS[RANKS.indexOf(rank) + 1] || null;
  return { score, terms, rank, next, side, men, lands };
}

// ---------------------------------------------------------------------------
// The calendar in war
// ---------------------------------------------------------------------------

/** The year's tourneys: the heralds' calendar, less what a war cancels. */
export function calendarFor(state, year) {
  const cal = yearCalendar(state.seed, year);
  const r = state.realm;
  if (r?.war && year >= r.war.year && (!r.war.done || year <= r.war.endedYear)) {
    // Only the guild towns keep their jousts; the cities keep out of it.
    return cal.filter((e) => (e.tier === 'local' && TOWNS[e.town].city) || (e.tier === 'fair' && FAIRS[e.fair].war));
  }
  if (r?.ruler) {
    // The new crown holds the King's Tourney; its first is the coronation's.
    const crowned = CLAIMANTS[r.ruler].crowned;
    return cal.map((e) => (e.tier !== 'grand' ? e : {
      ...e,
      host: { ...e.host, name: crowned },
      name: year === r.coronationYear ? `The Coronation Tourney of ${crowned}` : e.name,
    }));
  }
  return cal;
}

// ---------------------------------------------------------------------------
// The war
// ---------------------------------------------------------------------------

/** Lady Day of the tenth year: the king is dead, and his will is opened. */
export function beginWar(state) {
  const r = state.realm;
  if (r.war) return;
  r.king = 'dead';
  learn(state, 'war');
  r.will = r.balance > BALANCE.willTowardAumbry ? 'aumbry' : 'stane';
  r.tension = 100;
  r.war = { year: state.year, battles: [], done: false, victor: null, endedYear: null, side: null, captured: false };
  state.calendar = calendarFor(state, state.year);
  // A patron's obligations are the war now; there is no tourney to attend.
  if (state.patron) { state.patron.summons = null; state.patron.attended = true; }
}

/** Your side once the war begins: your oath, the will for the Crown's men, or none. */
export function warSide(state) {
  const r = state.realm;
  if (r.oath === 'none') return null;
  if (r.oath === 'crown') return r.will;
  if (r.oath) return r.oath;
  return null;
}

/** Each side's strength before you are counted. */
export function sideStrength(state) {
  const r = state.realm;
  const sum = (a) => state.roster.knights.filter((k) => k.active && k.allegiance === a).reduce((t, k) => t + k.renown, 0);
  const s = {
    aumbry: BATTLE.base + BATTLE.renownShare * sum('aumbry') + BATTLE.balanceShare * r.balance,
    stane: BATTLE.base + BATTLE.renownShare * sum('stane') - BATTLE.balanceShare * r.balance,
  };
  if (r.will) s[r.will] += BATTLE.crownShare * sum('crown');
  return s;
}

const MODE = {
  charge: { factor: 2, peril: 0.08 },   // a charge that goes home
  chargeFail: { factor: 1, peril: 0.1 }, // a charge that does not
  hold: { factor: 1, peril: 0.03 },
  standard: { factor: 1.3, peril: 0.025 },
  reserve: { factor: 0.3, peril: 0.01 },
  late: { factor: 0.6, peril: 0.03 },    // a neutral who rides in late, to the side he picks
  absent: { factor: 0, peril: 0 },       // watching from the hill, or not there at all
};

/** What you add to your side in a given part of the battle. */
export function contribution(state, mode) {
  const imp = importance(state);
  return Math.round((imp.rank.strength + strengthOfMen(state)) * MODE[mode].factor);
}

/** Your chance of dying where you choose to stand. Shown on the button; rolled the same. */
export function perilOf(state, mode) {
  return riskOf(state, MODE[mode].peril * importance(state).rank.peril);
}

/** Any danger, scaled by your harness and your body. A card's peril uses this too. */
export function riskOf(state, p) {
  const harness = Math.max(0.6, 1 - 0.03 * (state.harness.quality - 9));
  const vigour = Math.max(0.7, 1 - 0.02 * (state.knight.stats.vigour - 10));
  return Math.min(0.3, p * harness * vigour);
}

/**
 * Roll a danger taken on a card. A knight who dies here ends the career; the
 * chance was on the button, from riskOf().
 */
export function rollPeril(state, p, label, where) {
  const rng = streamFor(state.seed, state.year, `peril:${label}`);
  if (rng.next() >= riskOf(state, p)) return false;
  die(state, `${cap(where || DEATHS.default)}, in the ${ordinal(state.year)} year of your knighthood, Sir ${state.knight.given} ${state.knight.house} was killed. The heralds wrote his name among the dead of the war.`);
  return true;
}

function die(state, text) {
  state.status = 'dead';
  state.outcome = { kind: 'dead', year: state.year, text };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** A battle answer on a card: where you stand, and for whom. */
export function battleSpec(state, key) {
  const r = state.realm;
  if (key === 'lateHeir') return { mode: 'late', forSide: r.will };
  if (key === 'lateWinner') {
    const s = sideStrength(state);
    return { mode: 'late', forSide: s.aumbry >= s.stane ? 'aumbry' : 'stane' };
  }
  return { mode: key, forSide: null };
}

/** What the button shows for a place in the battle: your side's chance and yours. */
export function battlePreview(state, key) {
  const { mode, forSide } = battleSpec(state, key);
  const odds = battleOdds(state, mode, forSide);
  const side = odds.side;
  const rank = importance(state).rank.id;
  return {
    side, win: side ? odds[side] : null, aumbry: odds.aumbry, peril: perilOf(state, mode), mode,
    // If your side loses and you live, the chance you are taken, and what you would pay.
    capture: side ? BATTLE.capture[rank] : 0, ransom: BATTLE.ransom[rank] * 240,
  };
}

/** The chance your side carries the field if you stand here. */
export function battleOdds(state, mode, forSide = null) {
  const side = forSide || warSide(state);
  const s = sideStrength(state);
  if (side) s[side] += contribution(state, mode);
  return { aumbry: s.aumbry / (s.aumbry + s.stane), stane: s.stane / (s.aumbry + s.stane), side };
}

/**
 * Fight the battle. Returns what happened: who won, whether it settles the
 * war, and your own fate. `forSide` lets a neutral who rides in late pick one.
 */
export function fightBattle(state, mode, forSide = null) {
  const r = state.realm;
  const w = r.war;
  const rng = streamFor(state.seed, state.year, `battle:${w.battles.length}`);
  const odds = battleOdds(state, mode, forSide);
  const side = odds.side;
  const victor = rng.next() < odds.aumbry ? 'aumbry' : 'stane';
  const favoured = odds.aumbry >= 0.5 ? 'aumbry' : 'stane';
  const close = Math.abs(odds.aumbry - 0.5) < BATTLE.decisiveMargin / 2;
  const decisive = w.battles.length >= 1 || !(close || victor !== favoured);
  const died = rng.next() < perilOf(state, mode);
  const rankId = importance(state).rank.id;
  const captured = !died && side && side !== victor && rng.next() < BATTLE.capture[rankId];
  const battle = { year: state.year, name: battleName(state, w.battles.length), victor, decisive, side, mode, odds: odds.aumbry, died, captured };
  w.battles.push(battle);
  if (side) w.side = side;
  shiftBalance(state, victor === 'aumbry' ? 10 : -10);
  if (decisive) { w.victor = victor; w.decided = true; }
  // The field's dead: some of the beaten side's knights do not come home.
  const loser = victor === 'aumbry' ? 'stane' : 'aumbry';
  const fallen = [];
  // The companions of the Swan are sworn never to bear arms against one
  // another, and in the war most of them kept it: they are not among the dead.
  const swan = new Set((state.order?.stalls || []).filter((st) => st.holder?.kind === 'knight').map((st) => st.holder.id));
  for (const k of state.roster.knights) {
    if (!k.active || k.allegiance !== loser || swan.has(k.id)) continue;
    if (rng.next() < BATTLE.fallenShare) {
      k.active = false;
      k.fell = true;
      k.memory.push(`He fell at ${battle.name}.`);
      if (k.regard !== 0 || (state.intel[k.id] || 0) > 0) fallen.push(k.name);
    }
  }
  battle.fallen = fallen;
  if (died) {
    const how = side === victor ? 'in the hour of victory' : side ? 'with the day already lost' : 'having come down from the hill too late';
    die(state, `${cap(state.knight.given)} ${state.knight.house} fell at ${battle.name}, ${how}. ${CLAIMANTS[victor].short} carried the field. The heralds found his arms among the dead that evening.`);
  } else if (captured) {
    battle.ransom = BATTLE.ransom[rankId] * 240;
    state.purse -= battle.ransom;
  }
  return battle;
}

/** A battle's outcome, in lines for the card's result. */
export function battleLines(state, b) {
  const out = [];
  const v = CLAIMANTS[b.victor];
  out.push(`${cap(b.name)}: ${v.short} carries the field${b.decisive ? ', and the war with it' : ', but not the war'}.`);
  if (b.side) out.push(b.side === b.victor ? 'Your side won.' : 'Your side lost.');
  if (b.died) out.push('You did not come home.');
  if (b.captured) out.push(`You were taken, and ransomed for £${b.ransom / 240}.`);
  if (b.fallen?.length) out.push(`Among the fallen: ${b.fallen.slice(0, 4).join(', ')}.`);
  return out;
}

/** The new crown's pardon: bought, begged, or refused. */
export function pardon(state, how) {
  const fine = state.realm.war?.settlement?.fine || 0;
  if (how === 'pay') state.purse -= fine;
  if (how === 'exile') {
    state.status = 'exiled';
    state.outcome = {
      kind: 'exiled', year: state.year,
      text: `${cap(state.knight.given)} ${state.knight.house} took ship from Port Lessing at Candlemas, attainted and unpardoned. There are tourneys in Burgundy, and lords there who need a sword. Nobody in Lothmere cries his name again.`,
    };
  }
  state.flags = state.flags.filter((f) => f !== 'attainted');
}

function battleName(state, n) {
  const names = n === 0 ? ['Hollin Moor', 'Sallowfield', 'the Queenshythe road'] : ['Kingsmead Bridge', 'Ambry Heath', 'Brede Water'];
  const rng = streamFor(state.seed, 0, `battlename:${n}`);
  return `the Battle of ${rng.pick(names)}`;
}

/**
 * The winter after the deciding battle: the victor crowned, the loyal
 * rewarded by their rank, the beaten fined or attainted, the neutral
 * remembered for standing aside.
 */
export function settle(state, add, notes) {
  const r = state.realm;
  const w = r.war;
  if (!w || !w.decided || w.done) return null;
  const victor = w.victor;
  const loser = victor === 'aumbry' ? 'stane' : 'aumbry';
  const side = w.side;
  const rank = importance(state).rank.id;
  r.ruler = victor;
  r.coronationYear = state.year + 1;
  r.tension = 10;
  w.done = true;
  w.endedYear = state.year;
  const crowned = CLAIMANTS[victor].crowned;
  const out = { victor, side, rank, attainted: false, granted: [], forfeited: [] };
  notes.push(`${crowned} will be crowned at Kingsmead in the spring.`);

  if (side === victor) {
    const sp = SPOILS[rank];
    add(`Spoils of the war, as a ${rank === 'hedge' ? 'hedge knight' : rank}`, sp.pounds * 240);
    state.renown += sp.renown;
    for (let i = 0; i < sp.manors; i++) {
      const m = grantManor(state, victor, 'war');
      if (m) out.granted.push(m.name);
    }
    state.favour[victor] = (state.favour[victor] || 0) + 10;
    state.favour.crown = (state.favour.crown || 0) + 5;
    notes.push(`${crowned} remembers who stood with ${victor === 'aumbry' ? 'him' : 'her'}.`);
    if (out.granted.length) notes.push(`You are granted ${out.granted.join(' and ')}.`);
    // The new crown makes lords of the men who won it the field: a councillor
    // who fought in the deciding battle, or a captain who led the charge there.
    const W = TITLES.war;
    const last = w.battles[w.battles.length - 1];
    const fought = last && last.side === victor && W.fought.includes(last.mode);
    const charged = last && last.side === victor && last.mode === 'charge';
    if ((W.ranks.includes(rank) && fought) || (rank === 'captain' && charged && (state.lands || []).length >= W.captainManors)) {
      const t = createBaron(state, 'war');
      if (t) { out.title = t.seat; notes.push(`${crowned} creates you a baron of the realm, for your part in the war. You are Lord ${t.seat}.`); }
    }
  } else if (side === loser) {
    out.forfeited = forfeit(state, loser).map((m) => m.name);
    const rng = streamFor(state.seed, state.year, 'attainder');
    out.attainted = rng.next() < ATTAINDER.chance[rank];
    state.favour.crown = (state.favour.crown || 0) - 5;
    state.favour[victor] = (state.favour[victor] || 0) - 8;
    if (out.forfeited.length) notes.push(`${out.forfeited.join(' and ')}, held of ${FACTION_LABELS[loser]}, are forfeit to the new crown.`);
    if (out.attainted) {
      const lost = forfeitTitle(state);
      if (lost) notes.push(`Your barony of ${lost} is forfeit with your name.`);
      out.fine = ATTAINDER.fine[rank] * 240;
      notes.push(`Your name is on the list of the attainted. A pardon can be bought for ${ATTAINDER.fine[rank]} pounds, or refused.`);
    } else {
      notes.push('Your name is not on the list of the attainted. You were not important enough to punish, which is its own verdict.');
    }
  } else {
    state.renown = Math.max(0, state.renown - 5);
    state.favour[victor] = (state.favour[victor] || 0) - 3;
    out.forfeited = forfeit(state, loser).map((m) => m.name);
    notes.push('You stood aside. The new crown will not punish you for it, and will not forget it either.');
  }
  // A patron whose house lost the war is not a patron any more.
  if (state.patron && state.patron.id === loser) {
    notes.push(`${cap(PATRONS[loser].name)} is attainted. His service ends with his house.`);
    state.patron = null;
  }
  w.settlement = out;
  return out;
}

