// The calendar, the roads, and the field: what cannot be true of them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yearCalendar, route, admitted } from '../src/engine/calendar.js';
import {
  generateRoster, pickField, runBracket, riderFrom, winterField, rollOfArms, monthIndex,
} from '../src/engine/field.js';
import { TOWNS, ROADS, FIRST_MONTH, LAST_MONTH } from '../src/data/world.data.js';
import { CALENDAR, TIERS } from '../src/data/tourney.data.js';
import { ROSTER } from '../src/data/field.data.js';
import { makeRng } from '../src/engine/rng.js';
import { knight } from './helpers.js';

test('every year holds the same shape of calendar, and it reproduces', () => {
  for (let year = 1; year <= 20; year++) {
    const cal = yearCalendar(7, year);
    const count = (t) => cal.filter((e) => e.tier === t).length;
    assert.equal(count('grand'), CALENDAR.grand.length);
    assert.equal(count('high'), CALENDAR.high.length);
    assert.equal(count('regional'), CALENDAR.regional.count);
    assert.equal(count('local'), CALENDAR.local.count);
    const places = new Set();
    for (const e of cal) {
      assert.ok(TOWNS[e.town], `unknown town ${e.town}`);
      assert.ok(e.month >= FIRST_MONTH && e.month <= LAST_MONTH);
      assert.ok(e.name && e.host && e.host.name && e.feast);
      const key = `${e.town}|${e.month}`;
      assert.ok(!places.has(key), `two tourneys at ${key}`);
      places.add(key);
    }
    assert.equal(new Set(cal.map((e) => e.id)).size, cal.length);
    assert.deepEqual(yearCalendar(7, year), cal);
  }
  assert.notDeepEqual(yearCalendar(7, 3), yearCalendar(8, 3));
});

test('the roads join every town, and the shortest road is the shortest', () => {
  const ids = Object.keys(TOWNS);
  for (const [a, b, d] of ROADS) assert.ok(TOWNS[a] && TOWNS[b] && d > 0, `bad road ${a}-${b}`);
  for (const a of ids) {
    for (const b of ids) {
      const r = route(a, b);
      assert.ok(r, `no road from ${a} to ${b}`);
      assert.equal(r.days, route(b, a).days, 'roads run both ways');
      assert.equal(r.path[0], a);
      assert.equal(r.path[r.path.length - 1], b);
      for (const c of ids) assert.ok(r.days <= route(a, c).days + route(c, b).days);
    }
  }
});

test('the heralds admit by the rules they state, and say why they refuse', () => {
  const s = knight(1);
  const grand = s.calendar.find((e) => e.tier === 'grand');
  const high = s.calendar.find((e) => e.tier === 'high');
  s.renown = 0; s.lineage = 5; s.favour.crown = 0;
  const no = admitted(s, grand);
  assert.equal(no.ok, false);
  assert.match(no.reason, /renown 30/);
  s.renown = 30;
  assert.ok(admitted(s, grand).ok);
  s.renown = 0; s.favour.crown = 10;
  assert.ok(admitted(s, grand).ok);
  s.favour.crown = 0; s.favour[high.host.faction] = 8;
  assert.ok(admitted(s, high).ok, 'the host’s favour admits you to his own tourney');
  for (const t of ['local', 'regional']) assert.ok(admitted(s, s.calendar.find((e) => e.tier === t)).ok);
});

test('the field is whole, and every knight in it is possible', () => {
  const { knights } = generateRoster(5, 'Test Case');
  assert.equal(knights.length, ROSTER.size);
  assert.equal(new Set(knights.map((k) => k.id)).size, knights.length);
  assert.equal(new Set(knights.map((k) => k.name)).size, knights.length);
  for (const k of knights) {
    for (const s of ['lance', 'seat', 'vigour']) assert.ok(k[s] >= 1 && k[s] <= ROSTER.statMax, `${k.name} ${s}=${k[s]}`);
    assert.ok(k.renown >= 0 && k.age >= ROSTER.age.min && k.age <= ROSTER.age.max);
  }
});

test('a field is drawn without repeats, and never includes a wounded or busy knight', () => {
  const s = knight(3);
  const rng = makeRng(1);
  for (const cal of s.calendar) {
    const busy = new Set(s.roster.knights.slice(0, 5).map((k) => k.id));
    s.roster.knights[6].injuredUntil = monthIndex(cal.year, cal.month) + 1;
    const n = TIERS[cal.tier].entrants - 1;
    const f = pickField(s, cal, n, busy, rng);
    assert.equal(f.length, n);
    assert.equal(new Set(f.map((k) => k.id)).size, n);
    for (const k of f) {
      assert.ok(!busy.has(k.id), 'a busy knight was drawn');
      assert.notEqual(k.id, s.roster.knights[6].id, 'a wounded knight was drawn');
    }
  }
});

test('a bracket among the field has one champion and everyone else out once', () => {
  const s = knight(4);
  const rng = makeRng(2);
  for (const n of [2, 4, 8, 16]) {
    const riders = s.roster.knights.slice(0, n).map(riderFrom);
    const res = runBracket(riders, rng);
    const outs = Object.values(res).map((r) => r.out);
    assert.equal(outs.filter((o) => o === 0).length, 1);
    assert.equal(outs.filter((o) => o === 1).length, 1);
    assert.equal(Object.values(res).reduce((t, r) => t + r.boutsWon, 0), n - 1);
  }
});

test('winter ages the field and keeps every province full', () => {
  const s = knight(6);
  const ages = Object.fromEntries(s.roster.knights.map((k) => [k.id, k.age]));
  for (let y = 0; y < 12; y++) { winterField(s); s.year += 1; }
  const active = s.roster.knights.filter((k) => k.active);
  for (const p of ['march', 'court', 'coast']) assert.equal(active.filter((k) => k.province === p).length, ROSTER.perProvince);
  for (const k of s.roster.knights) if (ages[k.id] != null && k.active) assert.equal(k.age, ages[k.id] + 12);
  const roll = rollOfArms(s);
  assert.ok(roll.rank >= 1 && roll.rank <= roll.of);
  for (let i = 1; i < roll.rows.length; i++) assert.ok(roll.rows[i - 1].renown >= roll.rows[i].renown);
});
