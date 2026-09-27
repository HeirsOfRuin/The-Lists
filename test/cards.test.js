// The cards: every one written in the vocabulary the engine understands, every
// one able to come up, and every check rolled at the chance it shows.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARDS, WHEN_KEYS, EFFECT_KEYS, EVENT_EFFECTS, holds, castIfEligible, checkChance, answerCard,
  choicesView, fill, cardById,
} from '../src/engine/cards.js';
import { FLAG_LABELS, STAT_KEYS, TRAIT_KEYS } from '../src/engine/knight.js';
import { TRAIT_PAIRS } from '../src/data/creation.data.js';
import { FACTIONS } from '../src/data/world.data.js';
import { knight } from './helpers.js';
import { generateRoster } from '../src/engine/field.js';

const CONTEXTS = ['feast', 'arrival', 'road', 'moment.unhorsed', 'moment.forfeit', 'moment.beaten', 'moment.hurt', 'prize', 'winter', 'court'];
const EVENT_CONTEXTS = ['feast', 'arrival', 'road', 'moment.unhorsed', 'moment.forfeit', 'moment.beaten', 'moment.hurt', 'prize'];
const TRAIT_WORDS = TRAIT_PAIRS.flat();

function branches(ch) {
  return ch.check ? [ch.success, ch.failure] : [ch];
}

test('every card is written in the engine’s vocabulary', () => {
  const ids = new Set();
  for (const c of CARDS) {
    const where = c.id;
    assert.ok(!ids.has(c.id), `duplicate card ${c.id}`);
    ids.add(c.id);
    assert.ok(CONTEXTS.includes(c.context), `${where}: unknown context ${c.context}`);
    assert.ok(c.weight > 0 && c.text && c.choices.length >= 2, `${where}: needs weight, text and at least two answers`);
    for (const k of Object.keys(c.when || {})) assert.ok(WHEN_KEYS.includes(k), `${where}: unknown condition ${k}`);
    const roles = new Set(Object.keys(c.cast || {}));
    for (const ch of c.choices) {
      for (const k of Object.keys(ch.when || {})) assert.ok(WHEN_KEYS.includes(k), `${where}: unknown choice condition ${k}`);
      assert.ok(ch.label, `${where}: an answer has no label`);
      if (ch.check) {
        assert.ok(ch.check.dc > 0);
        assert.ok(ch.check.stat ? STAT_KEYS.includes(ch.check.stat) : TRAIT_WORDS.includes(ch.check.trait), `${where}: bad check`);
      }
      for (const b of branches(ch)) {
        assert.ok(b && typeof b.result === 'string' && b.result.length > 5, `${where}: an answer has no result`);
        const e = b.effects || {};
        for (const k of Object.keys(e)) assert.ok(EFFECT_KEYS.includes(k), `${where}: unknown effect ${k}`);
        for (const k of Object.keys(e.favour || {})) assert.ok(k === 'host' || FACTIONS.includes(k), `${where}: unknown faction ${k}`);
        for (const k of Object.keys(e.traits || {})) assert.ok(TRAIT_KEYS.includes(k), `${where}: unknown trait ${k}`);
        for (const k of Object.keys(e.stats || {})) assert.ok(STAT_KEYS.includes(k), `${where}: unknown stat ${k}`);
        for (const k of Object.keys(e.marks || {})) assert.ok(STAT_KEYS.includes(k), `${where}: unknown skill ${k}`);
        for (const role of [...Object.keys(e.regard || {}), ...Object.keys(e.intel || {}), ...Object.keys(e.memory || {})]) {
          assert.ok(roles.has(role), `${where}: effect names "${role}", who is not in the scene`);
        }
        for (const role of [e.vow, e.pas].filter(Boolean)) assert.ok(roles.has(role), `${where}: ${role} is not in the scene`);
        for (const f of e.flags || []) assert.ok(FLAG_LABELS[f], `${where}: story flag ${f} has no label`);
        for (const k of Object.keys(e.squire || {})) assert.ok(['lance', 'seat', 'wits', 'loyalty'].includes(k), `${where}: squire ${k}`);
        const eventOnly = Object.keys(e).filter((k) => EVENT_EFFECTS.includes(k));
        if (!EVENT_CONTEXTS.includes(c.context)) assert.deepEqual(eventOnly, [], `${where}: ${eventOnly} needs a tourney in hand`);
        if (e.largesse) assert.equal(c.context, 'prize', `${where}: largesse only at a prize-giving`);
        if (e.pas) assert.equal(c.context, 'road', `${where}: a pas only on the road`);
      }
    }
    // Every placeholder names someone the card can fill in.
    const texts = [c.text, ...c.choices.flatMap((ch) => branches(ch).map((b) => b.result)), ...c.choices.map((ch) => ch.label)];
    for (const t of texts) {
      if (t.includes('{rival}')) assert.ok(roles.has('rival'), `${where}: {rival} without a rival`);
      if (t.includes('{opponent}')) assert.ok(roles.has('opponent'), `${where}: {opponent} without an opponent`);
      if (t.includes('{lady}')) assert.ok(roles.has('lady'), `${where}: {lady} without a lady`);
      if (t.includes('{squire}')) {
        const guarded = c.when?.hasSquire || c.when?.squireOrigin || c.choices.some((ch) => ch.when?.hasSquire && texts.includes(t));
        assert.ok(guarded, `${where}: {squire} on a card that can come up without one`);
      }
      assert.ok(!/\{(?!rival|opponent|lady|host|town|squire|master|horse|you)[a-z]+\}/.test(t), `${where}: unknown placeholder in "${t}"`);
    }
  }
});

/** Bend a knight until a card's conditions hold, to prove it can come up at all. */
function satisfy(state, card) {
  const w = card.when || {};
  const ctx = { tier: w.tier ? w.tier[0] : 'regional', town: w.city ? 'portLessing' : 'othery', host: 'Sir Test', hostFaction: 'aumbry' };
  if (w.minRenown != null) state.renown = Math.max(state.renown, w.minRenown);
  if (w.maxRenown != null) state.renown = Math.min(state.renown, w.maxRenown);
  if (w.minHonour != null) state.honour = Math.max(state.honour, w.minHonour);
  if (w.maxHonour != null) state.honour = Math.min(state.honour, w.maxHonour);
  if (w.minLineage != null) state.lineage = Math.max(state.lineage, w.minLineage);
  if (w.maxLineage != null) state.lineage = Math.min(state.lineage, w.maxLineage);
  if (w.flag) state.flags.push(w.flag);
  if (w.heart) state.heart = w.heart;
  if (w.notHeart && state.heart === w.notHeart) state.heart = 'free';
  if (w.master) state.master.id = w.master;
  if (w.masterFate) state.master.fate = w.masterFate;
  if (w.hasSquire || w.squireOrigin) state.squire = { name: 'Hob', origin: w.squireOrigin || 'poorKin', lance: 7, seat: 7, wits: 7, loyalty: 5, age: 15, years: 1, focus: 'lance' };
  if (w.minYear != null) state.year = Math.max(state.year, w.minYear);
  if (w.minPurse != null) state.purse = Math.max(state.purse, w.minPurse);
  for (const [f, v] of Object.entries(w.minFavour || {})) state.favour[f] = Math.max(state.favour[f] || 0, v);
  // A field and a roster with every kind of knight in it.
  const spec = card.cast?.rival;
  const pool = state.roster.knights;
  if (spec) {
    const k = pool[card.id.length % pool.length];
    if (spec.temperament) k.temperament = spec.temperament[0];
    if (spec.maxRenown != null) k.renown = Math.min(k.renown, spec.maxRenown);
    if (spec.regardMin != null) k.regard = spec.regardMin;
    if (spec.regardMax != null) k.regard = spec.regardMax;
    if (spec.lineageBelowYou) { state.lineage = Math.max(state.lineage, 10); k.lineage = state.lineage - 3; }
    if (spec.unknown) delete state.intel[k.id];
    ctx.field = spec.notInField ? [] : [k.id];
  }
  if (card.cast?.opponent) ctx.opponent = pool[0].id;
  return ctx;
}

test('every card can come up for some knight, somewhere', () => {
  for (const c of CARDS) {
    const s = knight(c.id.length + 3);
    const ctx = satisfy(s, c);
    assert.ok(holds(s, c.when, ctx), `${c.id}: its conditions cannot be met`);
    assert.ok(castIfEligible(s, c.id, ctx), `${c.id}: nobody can be cast in it`);
  }
});

test('a check is rolled at exactly the chance it shows', () => {
  const card = cardById('feast.toast');
  const idx = card.choices.findIndex((ch) => ch.check);
  const N = 4000;
  for (const courtesy of [6, 11, 16]) {
    const base = knight(9);
    base.knight.stats.courtesy = courtesy;
    const shown = choicesView(base, { id: card.id, uid: 1, cast: {}, ctx: { tier: 'regional', town: 'othery', host: 'Sir Test', hostFaction: null } })[idx].check.chance;
    assert.equal(shown, checkChance(base, card.choices[idx].check));
    let wins = 0;
    for (let i = 0; i < N; i++) {
      const s = knight(9);
      s.knight.stats.courtesy = courtesy;
      const r = answerCard(s, { id: card.id, uid: i + 1, cast: {}, ctx: { tier: 'regional', town: 'othery', host: 'Sir Test', hostFaction: null } }, idx);
      if (r.success) wins += 1;
    }
    const se = Math.sqrt((shown * (1 - shown)) / N);
    assert.ok(Math.abs(wins / N - shown) < 4.5 * se + 1e-9, `courtesy ${courtesy}: shown ${shown.toFixed(3)}, rolled ${(wins / N).toFixed(3)}`);
  }
});

test('filled-in text never shows a raw placeholder', () => {
  const s = knight(2);
  s.squire = { name: 'Hob', origin: 'poorKin', lance: 7, seat: 7, wits: 7, loyalty: 5, age: 15, years: 1, focus: 'lance' };
  const id = s.roster.knights[0].id;
  for (const c of CARDS) {
    const inst = { id: c.id, uid: 1, cast: { rival: id, opponent: id, lady: 'Alys' }, ctx: { tier: 'regional', town: 'othery', host: 'Sir Test', hostFaction: 'aumbry', prize: 1440 } };
    for (const t of [c.text, ...c.choices.flatMap((ch) => branches(ch).map((b) => b.result))]) {
      assert.ok(!/\{[a-z]+\}/.test(fill(s, inst, t)), `${c.id}: ${fill(s, inst, t)}`);
    }
    for (const v of choicesView(s, inst)) {
      for (const line of [...(v.effects || []), ...(v.success || []), ...(v.failure || [])]) {
        assert.ok(!/undefined|NaN/.test(line), `${c.id}: "${line}"`);
      }
    }
  }
});
