// A life: the Company of the Swan, vows, the fairs, archers, the war's
// months, and how a career ends.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { knight, answerFirst, badNumbers } from './helpers.js';
import { deserialize, serialize, SAVE_VERSION, STATUS } from '../src/engine/state.js';
import { makeRng } from '../src/engine/rng.js';
import {
  passMonth, endWinter, PHASE, rideTo, monthOptions, shoot, race, leaveFair, campaign, campaignOption,
  lookToLands, landsOption, retireNow, feastCompanions, vow, unvow, hireArcher, pilgrimage, isFree,
} from '../src/engine/season.js';
import {
  orderFor, vacancies, eligibility, chapterCandidates, reckonChapter, holdChapter, orderWinter, YOU_SEAT, companionIds,
} from '../src/engine/order.js';
import { vowProgress, judgeVow, takeVow } from '../src/engine/vows.js';
import {
  popinjayPreview, popinjayOdds, finishChances, raceOdds, raceDists, newFair, YOU,
} from '../src/engine/fair.js';
import { retirement, endingFor, honoursOf, epilogue, obituary, retire } from '../src/engine/ending.js';
import { beginWar, fightBattle, riskOf, grantManor, contribution, importance } from '../src/engine/realm.js';
import { ORDER, ORDER_LORDS, VOWS, FAIRS, RETIREMENT, CAMPAIGN, ARCHERS, POPINJAY } from '../src/data/life.data.js';
import { yearCalendar } from '../src/engine/calendar.js';

/** Let the months pass to winter, answering whatever comes up. */
function toWinter(s) {
  for (let g = 0; g < 60 && s.phase !== PHASE.WINTER && s.status === STATUS.ACTIVE; g++) {
    if (s.pending) answerFirst(s);
    else passMonth(s);
  }
  while (s.pending) answerFirst(s);
}

/** A knight of standing: eight years a knight, known, and without reproach. */
function worthy(seed = 4) {
  const s = knight(seed);
  s.year = ORDER.eligible.years;
  s.renown = 70;
  s.honour = 18;
  return s;
}

function emptyStalls(s, n) {
  const ks = s.order.stalls.filter((st) => st.holder?.kind === 'knight').slice(0, n);
  for (const st of ks) { st.was = 'Sir Somebody'; st.holder = null; }
}

// ---------------------------------------------------------------------------
// The Company of the Swan
// ---------------------------------------------------------------------------

test('the Company holds twenty-four stalls: eight lords and sixteen knights of the field, each once', () => {
  const s = knight(2);
  const st = s.order.stalls;
  assert.equal(st.length, 24);
  assert.equal(st.filter((x) => x.holder.kind === 'lord').length, ORDER_LORDS.length);
  const ids = st.filter((x) => x.holder.kind === 'knight').map((x) => x.holder.id);
  assert.equal(ids.length, ORDER.knightSeats);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(s.roster.knights.find((k) => k.id === id).active);
  assert.equal(vacancies(s).length, 0);
});

test('the chapter hears only a knight of standing, without reproach, and says what he lacks', () => {
  const s = knight(3);
  const e = eligibility(s);
  assert.equal(e.ok, false);
  assert.match(e.reason, /years a knight/);
  const w = worthy(3);
  assert.equal(eligibility(w).ok, true);
  w.honour = ORDER.eligible.honour - 1;
  assert.match(eligibility(w).reason, /honour/);
});

test('the chapter fills every empty stall, the tally counts every voice, and the same winter votes the same way', () => {
  const s = worthy(5);
  emptyStalls(s, 2);
  const copy = deserialize(serialize(s));
  const ids = chapterCandidates(s);
  assert.ok(ids.includes(YOU_SEAT));
  const r = reckonChapter(s);
  assert.ok(r.chance >= 0 && r.chance <= 1);
  const lines = holdChapter(s);
  assert.equal(lines.length, 2);
  assert.equal(vacancies(s).length, 0);
  const holders = s.order.stalls.map((st) => (st.holder.kind === 'knight' ? st.holder.id : st.holder.kind === YOU_SEAT ? 'you' : st.holder.id));
  assert.equal(new Set(holders).size, 24, 'nobody holds two stalls');
  holdChapter(copy);
  assert.deepEqual(copy.order.stalls, s.order.stalls);
  assert.equal(s.order.companion, s.order.stalls.some((st) => st.holder.kind === YOU_SEAT));
});

test('a table kept at Candlemas buys the companions’ regard, and never lowers the chance', () => {
  const s = worthy(6);
  emptyStalls(s, 1);
  s.phase = PHASE.WINTER;
  s.winter = { bought: [], notes: [], ledger: [] };
  s.purse = 50 * 240;
  const before = reckonChapter(s).chance;
  const fed = reckonChapter(s, { table: true }).chance;
  assert.ok(fed >= before - 0.02);
  const regard = [...companionIds(s)].map((id) => s.roster.knights.find((k) => k.id === id).regard);
  assert.equal(feastCompanions(s).ok, true);
  assert.equal(s.purse, 50 * 240 - ORDER.table.cost);
  const after = [...companionIds(s)].map((id) => s.roster.knights.find((k) => k.id === id).regard);
  after.forEach((r, i) => assert.ok(r >= regard[i]));
  assert.equal(feastCompanions(s).ok, false, 'once a winter');
});

test('winning a stall makes you a companion, and losing your honour puts you out', () => {
  let s = null;
  for (let seed = 1; seed < 40 && !s; seed++) {
    const t = worthy(seed);
    t.renown = 160;
    t.honour = 20;
    for (const f of Object.keys(t.favour)) t.favour[f] = 15;
    emptyStalls(t, 3);
    holdChapter(t);
    if (t.order.companion) s = t;
  }
  assert.ok(s, 'a knight of that standing is chosen somewhere in forty winters');
  assert.ok(s.flags && s.seen.includes('order'));
  assert.ok(s.book.some((e) => e.tier === 'order'));
  assert.ok(importance(s).terms.some((t) => /Swan/.test(t.label)));
  s.honour = ORDER.degradeBelow - 1;
  const notes = [];
  orderWinter(s, notes);
  assert.equal(s.order.companion, false);
  assert.ok(notes.some((n) => /put you out/.test(n)));
  assert.equal(eligibility(s).ok, false);
});

test('the companions keep their oath in the war: none of them is among the fallen', () => {
  for (const seed of [2, 7, 11]) {
    const s = knight(seed);
    beginWar(s);
    fightBattle(s, 'hold');
    const swan = companionIds(s);
    for (const id of swan) assert.ok(!s.roster.knights.find((k) => k.id === id).fell, `seed ${seed}: companion ${id} fell`);
  }
});

// ---------------------------------------------------------------------------
// Vows
// ---------------------------------------------------------------------------

test('every vow can be made by someone, and is judged from the Book of Feats', () => {
  for (const v of VOWS) {
    const s = knight(1);
    s.renown = 100;
    assert.equal(takeVow(s, v.id).ok, true, v.id);
    assert.equal(s.vow.year, s.year + 1);
    assert.ok(s.seen.includes('vow'));
  }
  const s = knight(1);
  takeVow(s, 'lances');
  s.year += 1;
  s.book.push({ year: s.year, tier: 'regional', lances: 9 }, { year: s.year, tier: 'local', lances: 7 }, { year: s.year - 1, tier: 'local', lances: 30 });
  const p = vowProgress(s);
  assert.equal(p.have, 16, 'only this year’s lances count');
  assert.equal(p.status, 'kept');
  const r = s.renown;
  const notes = [];
  judgeVow(s, notes);
  assert.equal(s.renown, r + VOWS.find((v) => v.id === 'lances').kept.renown);
  assert.equal(s.vow, null);
});

test('a vow of mercy is broken by a ransom taken, and counts for nothing untested', () => {
  const s = knight(2);
  takeVow(s, 'mercy');
  s.year += 1;
  assert.equal(vowProgress(s, { final: true }).status, 'untested');
  const honour = s.honour;
  judgeVow(s, []);
  assert.equal(s.honour, honour);
  takeVow(s, 'mercy');
  s.year += 1;
  s.book.push({ year: s.year, tier: 'regional', melee: { prisoners: ['Sir A'], terms: 'free' } });
  assert.equal(vowProgress(s).status, 'open');
  s.book.push({ year: s.year, tier: 'regional', melee: { prisoners: ['Sir B'], terms: 'full' } });
  assert.equal(vowProgress(s).status, 'broken');
  judgeVow(s, []);
  assert.ok(s.honour < honour);
});

test('a vow to walk to the shrine opens the road there, and walking it keeps the vow', () => {
  const s = knight(3);
  s.honour = 18;
  takeVow(s, 'shrine');
  s.year += 1;
  s.purse = 20 * 240;
  assert.equal(pilgrimage(s).ok, true);
  assert.equal(vowProgress(s).status, 'kept');
});

test('in winter a vow is made once, and can be taken back before Candlemas', () => {
  const s = knight(4);
  toWinter(s);
  assert.equal(vow(s, 'lances').ok, true);
  assert.equal(vow(s, 'shrine').ok, false);
  assert.equal(unvow(s).ok, true);
  assert.equal(vow(s, 'shrine').ok, true);
});

// ---------------------------------------------------------------------------
// The fairs
// ---------------------------------------------------------------------------

test('every year has the popinjay and the Downs Race; a war keeps the guild’s fair and cancels the race', () => {
  for (let y = 1; y <= 6; y++) {
    const cal = yearCalendar(9, y);
    assert.equal(cal.filter((e) => e.tier === 'fair').length, 2);
  }
  const s = knight(5);
  s.year = 10;
  s.month = 3;
  beginWar(s);
  const fairs = s.calendar.filter((e) => e.tier === 'fair').map((e) => e.fair);
  assert.deepEqual(fairs, ['popinjay']);
});

test('the popinjay shows the chance it rolls, and ends in three rounds or with the bird down', () => {
  const s = knight(6);
  const cal = s.calendar.find((e) => e.fair === 'popinjay');
  s.fair = newFair(s, cal);
  const f = s.fair;
  const me = f.shooters.find((x) => x.id === YOU);
  const p = popinjayPreview(s);
  for (const t of Object.keys(POPINJAY.targets)) {
    assert.equal(p.now.marks[t], popinjayOdds(me.aim, t, f.wind.mod, false));
    assert.equal(p.lull.marks[t], popinjayOdds(me.aim, t, f.wind.mod, true));
    assert.ok(p.lull.marks[t] >= p.now.marks[t], 'a lull never makes the shot worse');
  }
  assert.ok(p.lull.risk >= p.now.risk, 'waiting never makes the bird safer');
  let g = 0;
  while (f.stage === 'shoot' && g++ < 10) shoot(s, { target: 'wing', lull: false });
  assert.equal(f.stage, 'done');
  assert.ok(f.round <= POPINJAY.rounds);
  assert.ok(s.book.some((e) => e.tier === 'fair'));
  assert.ok(s.seen.includes('popinjay'));
});

test('the popinjay’s odds are the odds: a shot at a fixed chance lands that often', () => {
  const rng = makeRng(11);
  const p = popinjayOdds(0.02, 'wing', -0.07, false);
  let hits = 0;
  const n = 6000;
  for (let i = 0; i < n; i++) if (rng.next() < p) hits += 1;
  assert.ok(Math.abs(hits / n - p) < 0.02);
});

test('the race’s chances are a true distribution: every runner’s chance of winning sums to one', () => {
  const s = knight(7);
  const cal = s.calendar.find((e) => e.fair === 'race');
  s.fair = newFair(s, cal);
  for (const plan of ['front', 'wait', 'rail']) {
    const d = raceDists(s, plan);
    const all = [d.you, ...d.others];
    const total = all.reduce((t, me, i) => t + finishChances(me, all.filter((_, j) => j !== i)).win, 0);
    assert.ok(Math.abs(total - 1) < 0.01, `${plan}: ${total}`);
  }
});

test('the race is run by the chance shown on the plan', () => {
  const s = knight(8);
  const cal = s.calendar.find((e) => e.fair === 'race');
  s.fair = newFair(s, cal);
  const shown = raceOdds(s).find((o) => o.id === 'wait');
  const d = raceDists(s, 'wait');
  const rng = makeRng(3);
  const g = () => Math.sqrt(-2 * Math.log(Math.max(rng.next(), Number.EPSILON))) * Math.cos(2 * Math.PI * rng.next());
  let wins = 0;
  const n = 4000;
  for (let i = 0; i < n; i++) {
    const mine = d.you.mu + d.you.sd * g();
    if (d.others.every((o) => o.mu + o.sd * g() > mine)) wins += 1;
  }
  assert.ok(Math.abs(wins / n - shown.win) < 0.03, `shown ${shown.win}, run ${wins / n}`);
  assert.equal(race(s, 'wait').ok, true);
  assert.equal(s.fair.stage, 'done');
  assert.ok(s.horse.condition < 10);
});

test('riding to a fair takes the month: the day is shot or run, and home again', () => {
  const s = knight(9);
  s.purse = 50 * 240;
  for (let g = 0; g < 10 && s.month < FAIRS.popinjay.month; g++) { if (s.pending) answerFirst(s); else passMonth(s); }
  while (s.pending) answerFirst(s);
  const o = monthOptions(s).find((x) => x.cal.fair === 'popinjay');
  assert.ok(o && o.open, 'the popinjay is open in May');
  assert.equal(rideTo(s, o.cal.id).ok, true);
  assert.ok(s.fair && !isFree(s));
  while (s.fair.stage === 'shoot') shoot(s, { target: 'tail', lull: true });
  const month = s.month;
  assert.equal(leaveFair(s).ok, true);
  assert.equal(s.fair, null);
  assert.ok(s.month > month || s.pending);
  assert.deepEqual(badNumbers(s), []);
});

// ---------------------------------------------------------------------------
// Archers and the war's months
// ---------------------------------------------------------------------------

test('archers are hired in winter to what the land keeps, and count for half a man in the line', () => {
  const s = knight(10);
  toWinter(s);
  s.purse = 100 * 240;
  let n = 0;
  while (hireArcher(s).ok) n += 1;
  assert.equal(n, ARCHERS.base);
  const before = contribution(s, 'hold');
  s.archers += 4;
  assert.equal(contribution(s, 'hold') - before, Math.round(4 * ARCHERS.strength));
});

test('a sworn knight can ride with the army; the chance of death on the button is the one rolled', () => {
  const s = knight(11);
  s.year = 10;
  s.month = 4;
  s.realm.oath = 'aumbry';
  beginWar(s);
  const o = campaignOption(s);
  assert.ok(o && o.open);
  assert.equal(o.peril, riskOf(s, CAMPAIGN.peril));
  const purse = s.purse;
  const r = campaign(s);
  assert.equal(r.ok, true);
  if (s.status === STATUS.ACTIVE) assert.ok(s.purse >= purse + CAMPAIGN.pay);
  const n = knight(12);
  n.realm.oath = 'none';
  n.year = 10;
  beginWar(n);
  assert.equal(campaignOption(n), null, 'a man sworn to nobody has no army to ride with');
});

test('seeing to your lands in a war year keeps the raiders off the rents', () => {
  const s = knight(13);
  s.year = 10;
  s.month = 6;
  s.realm.oath = 'none';
  beginWar(s);
  for (let i = 0; i < 4; i++) grantManor(s, null, 'bought');
  assert.equal(landsOption(s).open, true);
  assert.equal(lookToLands(s).ok, true);
  assert.equal(landsOption(s).open, false);
  toWinter(s);
  assert.ok(!s.winter.notes.some((n) => /Raiders burnt/.test(n)));
});

// ---------------------------------------------------------------------------
// The end of a career
// ---------------------------------------------------------------------------

test('a knight hangs up his lance from thirty-four, and must at forty-five', () => {
  const s = knight(14);
  toWinter(s);
  assert.equal(retirement(s).may, false);
  assert.equal(retireNow(s).ok, false);
  s.knight.age = RETIREMENT.from;
  assert.equal(retirement(s).may, true);
  const t = deserialize(serialize(s));
  assert.equal(retireNow(s).ok, true);
  assert.equal(s.status, STATUS.RETIRED);
  assert.ok(s.outcome.paragraphs.length >= 3);
  t.knight.age = RETIREMENT.always;
  assert.equal(retirement(t).must, true);
  endWinter(t);
  assert.equal(t.status, STATUS.RETIRED);
  assert.match(t.outcome.paragraphs[0], /forty-five/);
});

test('the heralds rank what a career earned, and a disgraced knight’s leaving says so', () => {
  const s = knight(15);
  assert.equal(endingFor(s).id, 'quiet');
  for (let i = 0; i < RETIREMENT.lordManors; i++) grantManor(s, null, 'bought');
  assert.deepEqual(honoursOf(s), ['lord']);
  s.order.companion = true;
  assert.equal(endingFor(s).id, 'swan');
  assert.deepEqual(endingFor(s).all, ['swan', 'lord']);
  s.honour = 1;
  assert.equal(endingFor(s).id, 'disgrace');
});

test('every epilogue and obituary is written in full: no gaps, no stray braces, no numbers that are not numbers', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const s = knight(seed);
    s.book.push({ year: 1, tier: 'regional', name: 'The Tourney at Merrow', feast: 'Whitsun', town: 'Merrow', placing: 'champion', lances: 6, unhorsed: ['Sir X'] });
    s.career.tourneys = 1;
    s.career.championships = 1;
    if (seed % 3 === 0) { s.order.companion = true; s.order.since = 9; }
    if (seed % 4 === 0) s.heart = 'married';
    if (seed % 5 === 0) { beginWar(s); }
    const ep = epilogue(s, seed % 2 ? 'chosen' : 'age');
    const ob = obituary(s, 'He died at a ford nobody remembers, in the war.');
    for (const p of [...ep.paragraphs, ...ob]) {
      assert.ok(p && p.length > 10, `seed ${seed}: empty paragraph`);
      assert.doesNotMatch(p, /undefined|NaN|null|\{|\}/, `seed ${seed}: ${p}`);
    }
    retire(s);
    assert.deepEqual(badNumbers(s), []);
  }
});

// ---------------------------------------------------------------------------
// Old saves
// ---------------------------------------------------------------------------

test('a phase-five save opens with a Company to stand for, and what its knight has seen of the kingdom', () => {
  const raw = readFileSync(new URL('./fixtures/v5-save.json', import.meta.url), 'utf8');
  assert.equal(JSON.parse(raw).version, 5);
  const s = deserialize(raw);
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.order.stalls.length, 24);
  assert.equal(s.vow, null);
  assert.equal(s.archers, 0);
  assert.ok(s.visited.length > 1, 'the towns in his Book of Feats');
  assert.ok(s.seen.length >= 1);
  assert.deepEqual(s.chronicle, []);
  for (let g = 0; g < 200 && s.phase !== PHASE.WINTER && s.status === STATUS.ACTIVE; g++) {
    if (s.pending) answerFirst(s);
    else passMonth(s);
  }
  while (s.pending) answerFirst(s);
  assert.equal(s.phase, PHASE.WINTER);
  assert.ok(s.chronicle.length === 1);
  assert.equal(endWinter(s).ok, true);
  assert.deepEqual(badNumbers(s), []);
});
