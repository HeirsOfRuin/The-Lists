// Character creation: every answer does what it says, and no set of answers
// builds a knight who cannot exist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, HORSES } from '../src/data/creation.data.js';
import {
  EFFECT_KEYS, SET_KEYS, STAT_KEYS, TRAIT_KEYS, FACTION_KEYS, STAT_MIN, STAT_MAX, TRAIT_MAX,
  describeOption, availableOptions, randomAnswers, buildKnight,
} from '../src/engine/knight.js';
import { newGame } from '../src/engine/state.js';
import { entryCost } from '../src/engine/tourney.js';
import { makeRng } from '../src/engine/rng.js';
import { badNumbers } from './helpers.js';
import { MASTERS } from '../src/data/names.data.js';
import { PROVINCES } from '../src/data/world.data.js';
import { CADENCY } from '../src/engine/heraldry.js';

const allOptions = QUESTIONS.flatMap((q) => q.options.map((o) => ({ q, o })));

test('every effect in the creation table targets a real field', () => {
  for (const { q, o } of allOptions) {
    const where = `${q.id}.${o.id}`;
    for (const k of Object.keys(o.effects || {})) assert.ok(EFFECT_KEYS.includes(k), `${where}: unknown effect "${k}"`);
    for (const k of Object.keys(o.effects?.favour || {})) assert.ok(FACTION_KEYS.includes(k), `${where}: unknown faction "${k}"`);
    for (const k of Object.keys(o.effects?.traits || {})) assert.ok(TRAIT_KEYS.includes(k), `${where}: unknown trait "${k}"`);
    for (const k of Object.keys(o.sets || {})) assert.ok(SET_KEYS.includes(k), `${where}: unknown set "${k}"`);
    const s = o.sets || {};
    if (s.horse) assert.ok(HORSES[s.horse], `${where}: unknown horse ${s.horse}`);
    if (s.master) assert.ok(MASTERS[s.master], `${where}: unknown master ${s.master}`);
    if (s.province) assert.ok(PROVINCES[s.province], `${where}: unknown province ${s.province}`);
    if (s.cadency) assert.ok(s.cadency in CADENCY, `${where}: unknown cadency ${s.cadency}`);
  }
});

test('creation asks six questions, and every one of them matters', () => {
  assert.equal(QUESTIONS.length, 6);
  for (const q of QUESTIONS) assert.ok(q.options.length >= 3, `${q.id} offers too few answers`);
});

test('every answer has weight, and says what it is', () => {
  for (const { q, o } of allOptions) {
    const where = `${q.id}.${o.id}`;
    const lines = describeOption(o);
    const hasEffect = Object.keys(o.effects || {}).length || Object.keys(o.sets || {}).length || (o.flags || []).length;
    assert.ok(hasEffect || o.steers, `${where} changes nothing and does not say it only steers the story`);
    assert.ok(lines.length > 0, `${where} has no description of what it does`);
    for (const l of lines) assert.ok(!/undefined|NaN/.test(l), `${where}: "${l}"`);
  }
});

test('the described effects are the applied effects', () => {
  // Two knights identical but for one answer must differ by exactly what the
  // two answers claim — so the line a player reads is the change he gets.
  const rng = makeRng(3);
  const name = { given: 'Test', house: 'Case' };
  const eff = (o, k) => (o.effects || {})[k] || 0;
  const sub = (o, group, k) => ((o.effects || {})[group] || {})[k] || 0;
  for (const q of QUESTIONS) {
    const base = { ...randomAnswers(rng), heart: 'champion' };
    const ref = q.options[0];
    const kRef = buildKnight({ ...base, [q.id]: ref.id }, name, makeRng(1));
    for (const o of q.options.slice(1)) {
      if (o.requires) continue;
      const k = buildKnight({ ...base, [q.id]: o.id }, name, makeRng(1));
      const where = `${q.id}.${o.id}`;
      for (const s of STAT_KEYS) {
        assert.equal(k.knight.stats[s] - kRef.knight.stats[s], eff(o, s) - eff(ref, s), `${where}: ${s}`);
      }
      for (const s of ['purse', 'renown', 'honour', 'lineage']) {
        assert.equal(k[s] - kRef[s], eff(o, s) - eff(ref, s), `${where}: ${s}`);
      }
      for (const f of FACTION_KEYS) {
        assert.equal(k.favour[f] - kRef.favour[f], sub(o, 'favour', f) - sub(ref, 'favour', f), `${where}: favour ${f}`);
      }
      for (const t of TRAIT_KEYS) {
        // Starting traits are held between 5 and 15; a clamped trait cannot show the full difference.
        const edge = (v) => v <= 5 || v >= 15;
        if (edge(k.knight.traits[t]) || edge(kRef.knight.traits[t])) continue;
        assert.equal(k.knight.traits[t] - kRef.knight.traits[t], sub(o, 'traits', t) - sub(ref, 'traits', t), `${where}: ${t}`);
      }
    }
  }
});

test('conditional answers are offered only when their condition holds', () => {
  const noDisgrace = { master: 'champion' };
  const withDisgrace = { master: 'disgraced' };
  assert.ok(!availableOptions('heart', noDisgrace).some((o) => o.id === 'clearName'));
  assert.ok(availableOptions('heart', withDisgrace).some((o) => o.id === 'clearName'));
  const rng = makeRng(9);
  const answers = { ...randomAnswers(rng), master: 'champion', heart: 'clearName' };
  assert.throws(() => buildKnight(answers, { given: 'A', house: 'B' }, makeRng(1)), /not an answer/);
});

test('no set of answers builds an impossible knight, and every knight can ride', () => {
  const rng = makeRng(42);
  // Every option at least once, then random sets.
  const sets = [];
  for (const { q, o } of allOptions) {
    const a = randomAnswers(rng);
    a[q.id] = o.id;
    if (o.requires) a.master = 'disgraced';
    if (!availableOptions('heart', a).some((x) => x.id === a.heart)) a.heart = 'champion';
    sets.push(a);
  }
  for (let i = 0; i < 1500; i++) sets.push(randomAnswers(rng));
  for (const [i, answers] of sets.entries()) {
    const s = newGame({ seed: i + 1, answers, name: { given: 'Test', house: 'Case' } });
    for (const k of STAT_KEYS) {
      const v = s.knight.stats[k];
      assert.ok(Number.isInteger(v) && v >= STAT_MIN && v <= STAT_MAX, `${k}=${v}`);
    }
    for (const k of TRAIT_KEYS) assert.ok(s.knight.traits[k] >= 0 && s.knight.traits[k] <= TRAIT_MAX);
    assert.ok(Number.isInteger(s.purse), 'purse is whole pence');
    assert.ok(s.purse >= entryCost('local') + 60, `a knight with ${s.purse}d cannot pay to ride even a local joust`);
    assert.ok(s.horse.quality >= STAT_MIN && s.horse.quality <= STAT_MAX);
    assert.deepEqual(badNumbers(s), []);
  }
});
