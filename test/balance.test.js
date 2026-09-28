// The balance phase's rules: how renown fades, what fame buys the field, and
// that the field earns the days after the jousts by the same table you do.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { knight } from './helpers.js';
import { fadeRenown, winterField, simulateMonth } from '../src/engine/field.js';
import { ROSTER } from '../src/data/field.data.js';
import { HINTS } from '../src/data/hints.data.js';

test('renown fades a tenth each winter, and a share more of whatever is over the line', () => {
  assert.equal(fadeRenown(0), 0);
  assert.equal(fadeRenown(50), 45);
  assert.equal(fadeRenown(ROSTER.fame.past), Math.round(ROSTER.fame.past * ROSTER.renownDecay));
  assert.equal(fadeRenown(200), Math.round(200 * ROSTER.renownDecay - ROSTER.fame.extra * 100));
  // Never a reversal: more renown before the winter is never less after it.
  for (let r = 0; r < 600; r++) assert.ok(fadeRenown(r + 1) >= fadeRenown(r), `at ${r}`);
});

test('the same fade applies to the field as to you', () => {
  const s = knight(3);
  const k = s.roster.knights.find((x) => x.active && x.age < 30);
  k.renown = 180;
  winterField(s);
  assert.equal(k.renown, fadeRenown(180));
});

test('fame buys horses: a famous knight of the field rides a better one each winter, to what his renown can pay for', () => {
  const s = knight(4);
  const k = s.roster.knights.find((x) => x.active && x.age < 28);
  k.horse.quality = 8;
  k.renown = 120;
  const seen = [k.horse.quality];
  for (let y = 0; y < 6; y++) {
    k.renown = 120;
    s.year += 1;
    winterField(s);
    seen.push(k.horse.quality);
  }
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1], `the horse went back: ${seen}`);
  assert.ok(seen.at(-1) >= 12, `after six winters at renown 120 he rides quality ${seen.at(-1)}`);
  assert.ok(seen.at(-1) <= ROSTER.statMax);
});

test('a tourney you do not ride still pays the field for its mêlée and barriers', () => {
  const s = knight(5);
  const high = s.calendar.find((e) => e.tier === 'high');
  const regional = s.calendar.find((e) => e.tier === 'regional');
  const before = s.roster.knights.reduce((t, k) => t + k.renown, 0);
  const res = simulateMonth(s, [high, regional], null);
  assert.equal(res.length, 2);
  const after = s.roster.knights.reduce((t, k) => t + k.renown, 0);
  // The jousts alone pay at least the two champions; the other days pay more on top.
  assert.ok(after - before > 0);
  // Run twice from the same state: the same field earns the same.
  const t = knight(5);
  simulateMonth(t, [t.calendar.find((e) => e.tier === 'high'), t.calendar.find((e) => e.tier === 'regional')], null);
  assert.deepEqual(t.roster.knights.map((k) => k.renown), s.roster.knights.map((k) => k.renown));
});

test('every first-time hint says something, briefly', () => {
  for (const [key, h] of Object.entries(HINTS)) {
    assert.ok(h.title && h.lines.length >= 1, key);
    for (const l of h.lines) assert.ok(l.length > 20 && l.length < 260, `${key}: ${l.length} characters`);
  }
});
