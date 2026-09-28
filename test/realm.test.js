// The realm: ten years to war, and the war. What cannot be true of it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAIRS } from '../src/data/life.data.js';
import { readFileSync } from 'node:fs';
import {
  beginWar, battleOdds, battlePreview, fightBattle, perilOf, settle, importance, creditBalance, sideOf,
  grantManor, companyMax, menOf, manorDef, calendarFor, oathTerms,
} from '../src/engine/realm.js';
import {
  passMonth, endWinter, answer, hireMan, dismissMan, buyManor, PHASE, beatDue,
} from '../src/engine/season.js';
import { takeService } from '../src/engine/court.js';
import { cardById, holds, choicesView } from '../src/engine/cards.js';
import { deserialize, SAVE_VERSION } from '../src/engine/state.js';
import { TOWNS, LAST_MONTH } from '../src/data/world.data.js';
import {
  TENSION, WAR_YEAR, WAR_MONTH, BALANCE, LANDS, COMPANY, SPOILS, RANKS,
} from '../src/data/realm.data.js';
import { REALM_BEATS } from '../src/data/cards.realm.data.js';
import { knight, answerFirst, badNumbers } from './helpers.js';

/** Let months pass, answering whatever comes with its first open answer, until the given month opens. */
function passive(s, year, month) {
  const seen = [];
  let guard = 0;
  while (s.status === 'active') {
    if (++guard > 4000) throw new Error('the months stopped passing');
    if (s.pending) {
      if (s.year === year && s.month === month && s.phase === PHASE.MONTH) break;
      seen.push({ year: s.year, month: s.month, id: s.pending.inst.id });
      answerFirst(s);
      continue;
    }
    if (s.phase === PHASE.WINTER) { endWinter(s); continue; }
    if (s.year > year || (s.year === year && s.month >= month)) break;
    s.purse = Math.max(s.purse, 400 * 240);
    passMonth(s);
  }
  return seen;
}

function inst(s, id) {
  return { id, uid: 99, context: cardById(id).context, cast: {}, ctx: { tier: null, town: null, host: null, hostFaction: null, prize: 0 } };
}
function chooseLabel(s, id, re) {
  const card = cardById(id);
  const i = card.choices.findIndex((ch) => re.test(ch.label));
  assert.ok(i >= 0, `${id}: no answer matching ${re}`);
  return i;
}

// ---------------------------------------------------------------------------

test('tension rises on its schedule, the beats come in order, and the king dies in the tenth year', () => {
  const s = knight(21);
  assert.equal(s.realm.tension, TENSION[1]);
  const seen = passive(s, WAR_YEAR, WAR_MONTH);
  assert.equal(s.status, 'active');
  // Every peace beat that could come up for him came up once, in its month.
  const realm = seen.filter((x) => x.id.startsWith('realm.'));
  const expected = REALM_BEATS.filter((b) => b.year != null);
  for (const b of expected) {
    const got = realm.filter((x) => b.cards.includes(x.id));
    assert.ok(got.length <= 1, `${b.cards}: fired ${got.length} times`);
    if (got.length) assert.deepEqual([got[0].year, got[0].month], [b.year, b.month], `${got[0].id} came at the wrong time`);
  }
  for (const id of ['realm.wedding', 'realm.fortify', 'realm.brawl', 'realm.illness', 'realm.loans', 'realm.array', 'realm.oath']) {
    assert.ok(realm.some((x) => x.id === id), `${id} never came`);
  }
  // Lady Day of the tenth year: the king is dead, and the realm is at war.
  assert.equal(s.year, WAR_YEAR);
  assert.equal(s.realm.king, 'dead');
  assert.ok(s.realm.will === 'aumbry' || s.realm.will === 'stane');
  assert.equal(s.realm.will, s.realm.balance > BALANCE.willTowardAumbry ? 'aumbry' : 'stane');
  assert.equal(s.realm.tension, 100);
  assert.match(s.pending.inst.id, /^realm\.kingDead\./);
  assert.deepEqual(badNumbers(s), []);
});

test('war always comes in the tenth year, and it cancels all but the towns’ own jousts', () => {
  for (const seed of [3, 8]) {
    const s = knight(seed);
    passive(s, WAR_YEAR, WAR_MONTH);
    assert.equal(s.realm.war.year, WAR_YEAR, `seed ${seed}`);
    assert.ok(s.calendar.length > 0, 'the towns still hold jousts');
    for (const e of s.calendar) {
      if (e.tier === 'fair') { assert.ok(FAIRS[e.fair].war, `${e.name} is not kept in a war`); continue; }
      assert.equal(e.tier, 'local');
      assert.ok(TOWNS[e.town].city, `${e.name} is not a guild town`);
    }
  }
});

test('the heralds read the balance: a great prize moves it toward the champion’s house, yours more', () => {
  const s = knight(2);
  creditBalance(s, 'high', 'aumbry');
  assert.equal(s.realm.balance, BALANCE.high);
  creditBalance(s, 'grand', 'stane');
  assert.equal(s.realm.balance, BALANCE.high - BALANCE.grand);
  creditBalance(s, 'regional', 'stane');
  creditBalance(s, 'high', 'crown');
  creditBalance(s, 'high', null);
  assert.equal(s.realm.balance, BALANCE.high - BALANCE.grand, 'only great tourneys, and only the two houses');
  s.realm.balance = 0;
  s.realm.oath = 'aumbry';
  creditBalance(s, 'grand', sideOf(s), { yours: true });
  assert.equal(s.realm.balance, BALANCE.grand * BALANCE.yours);
  for (let i = 0; i < 50; i++) creditBalance(s, 'grand', 'aumbry');
  assert.equal(s.realm.balance, BALANCE.max);
});

test('a scheduled beat fires once, and a war beat only while the war is undecided', () => {
  const s = knight(4);
  s.year = 2; s.month = 4;
  assert.deepEqual(beatDue(s).beat.cards, ['realm.wedding']);
  s.year = WAR_YEAR; s.month = 8;
  assert.equal(beatDue(s), null, 'no war, no battle');
  beginWar(s);
  assert.ok(beatDue(s).beat.battle);
  s.realm.war.decided = true;
  assert.equal(beatDue(s), null, 'a decided war fights no more battles');
});

// ---------------------------------------------------------------------------
// The battle
// ---------------------------------------------------------------------------

function atWar(seed, oath = 'aumbry') {
  const s = knight(seed);
  s.year = WAR_YEAR;
  s.month = 8;
  beginWar(s);
  s.realm.oath = oath;
  return s;
}

test('what you bring to the field moves the odds, by rank and men', () => {
  const s = atWar(5);
  const bare = battleOdds(s, 'reserve').aumbry;
  s.renown = 150; s.honour = 20; s.company = 2;
  for (let i = 0; i < 3; i++) grantManor(s, 'aumbry', 'test');
  const big = battleOdds(s, 'hold').aumbry;
  assert.ok(big > bare, 'a captain with his men is worth more than a hedge knight in the reserve');
  assert.ok(battleOdds(s, 'charge').aumbry > big, 'a charge that goes home is worth most');
  const preview = battlePreview(s, 'hold');
  assert.equal(preview.win, battleOdds(s, 'hold').aumbry, 'the button shows the odds the battle is fought at');
  assert.equal(preview.peril, perilOf(s, 'hold'));
  assert.ok(preview.capture > 0 && preview.ransom > 0, 'the button says what being taken would cost');
});

test('a battle is won, a knight dies, and a knight is taken, at the chances the button shows', () => {
  let expectWins = 0; let wins = 0; let varW = 0;
  let expectDead = 0; let dead = 0; let varD = 0;
  let lostAlive = 0; let expectTaken = 0; let taken = 0; let varT = 0;
  const N = 400;
  for (let seed = 1; seed <= N; seed++) {
    const s = atWar(seed, seed % 2 ? 'aumbry' : 'stane');
    s.harness.quality = 6; s.knight.stats.vigour = 6; // a poor harness and a tired body: peril worth measuring
    const p = battlePreview(s, 'charge');
    const b = fightBattle(s, 'charge');
    expectWins += p.win; varW += p.win * (1 - p.win);
    if (b.victor === b.side) wins += 1;
    expectDead += p.peril; varD += p.peril * (1 - p.peril);
    if (b.died) { dead += 1; assert.equal(s.status, 'dead'); assert.equal(s.outcome.kind, 'dead'); }
    if (!b.died && b.victor !== b.side) {
      lostAlive += 1; expectTaken += p.capture; varT += p.capture * (1 - p.capture);
      if (b.captured) taken += 1;
    }
    if (b.captured) assert.equal(b.ransom, p.ransom);
  }
  assert.ok(lostAlive > 30, 'enough lost battles to measure capture');
  assert.ok(Math.abs(taken - expectTaken) < 4.5 * Math.sqrt(varT), `taken ${taken}, expected ${expectTaken.toFixed(1)}`);
  assert.ok(Math.abs(wins - expectWins) < 4.5 * Math.sqrt(varW), `won ${wins}, expected ${expectWins.toFixed(1)}`);
  assert.ok(Math.abs(dead - expectDead) < 4.5 * Math.sqrt(varD), `died ${dead}, expected ${expectDead.toFixed(1)}`);
});

test('the second battle always decides the war', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = atWar(seed);
    fightBattle(s, 'reserve');
    if (s.status !== 'active') continue;
    if (!s.realm.war.decided) fightBattle(s, 'reserve');
    if (s.status !== 'active') continue;
    assert.ok(s.realm.war.decided, `seed ${seed}`);
  }
});

// ---------------------------------------------------------------------------
// The settlement
// ---------------------------------------------------------------------------

function decided(s, victor, side) {
  s.realm.war.decided = true;
  s.realm.war.victor = victor;
  s.realm.war.side = side;
}

test('the victor rewards his own by their rank', () => {
  const s = atWar(6);
  s.renown = 150; s.honour = 20;
  for (let i = 0; i < 2; i++) grantManor(s, 'aumbry', 'test');
  s.company = companyMax(s);
  decided(s, 'aumbry', 'aumbry');
  const rank = importance(s).rank.id;
  assert.ok(['banneret', 'captain', 'councillor'].includes(rank));
  const lands = s.lands.length;
  const purse = s.purse;
  const ledger = [];
  const out = settle(s, (label, amount) => { ledger.push({ label, amount }); s.purse += amount; }, []);
  assert.equal(out.side, 'aumbry');
  assert.equal(s.purse - purse, SPOILS[rank].pounds * 240);
  assert.equal(s.lands.length, lands + SPOILS[rank].manors);
  assert.equal(s.realm.ruler, 'aumbry');
  assert.equal(s.realm.coronationYear, s.year + 1);
  const next = calendarFor(s, s.year + 1).find((e) => e.tier === 'grand');
  assert.match(next.name, /Coronation Tourney of King Robert/);
});

test('the vanquished forfeit what they held of the loser; the attainted buy a pardon or go', () => {
  let paid = false; let exiled = false;
  for (let seed = 1; seed <= 60 && !(paid && exiled); seed++) {
    const s = atWar(seed, 'stane');
    s.renown = 150; s.honour = 20;
    grantManor(s, 'stane', 'test');
    grantManor(s, null, 'dower');
    decided(s, 'aumbry', 'stane');
    s.month = LAST_MONTH;
    s.purse = 200 * 240;
    passMonth(s);
    assert.equal(s.phase, PHASE.WINTER);
    assert.ok(!s.lands.some((l) => l.heldOf === 'stane'), 'lands held of the beaten house are forfeit');
    assert.ok(s.lands.some((l) => l.how === 'dower'), 'her dower is not his to forfeit');
    if (!s.realm.war.settlement.attainted) continue;
    assert.equal(s.pending.inst.id, 'winter.pardon', 'the attainted face the new crown first');
    const fine = s.realm.war.settlement.fine;
    if (!paid) {
      const before = s.purse;
      answer(s, chooseLabel(s, 'winter.pardon', /Pay the fine/));
      assert.equal(before - s.purse, fine);
      assert.ok(!s.flags.includes('attainted'));
      assert.equal(s.status, 'active');
      paid = true;
    } else {
      answer(s, chooseLabel(s, 'winter.pardon', /exile/));
      assert.equal(s.status, 'exiled');
      assert.equal(s.outcome.kind, 'exiled');
      assert.equal(endWinter(s).ok, false, 'an exile rides no more springs');
      exiled = true;
    }
  }
  assert.ok(paid && exiled, 'both ends of the pardon were reached');
});

test('a neutral keeps his lands of neither house, and loses a little renown', () => {
  const s = atWar(9, 'none');
  s.renown = 50;
  grantManor(s, 'stane', 'test');
  decided(s, 'aumbry', null);
  const out = settle(s, () => {}, []);
  assert.equal(out.side, null);
  assert.equal(s.renown, 45);
  assert.equal(s.lands.length, 0, 'but what he held of the loser goes with the loser');
});

// ---------------------------------------------------------------------------
// Oaths
// ---------------------------------------------------------------------------

test('an oath says what it costs before it is sworn, and costs exactly that', () => {
  const s = knight(12);
  takeService(s, 'aumbry');
  const card = 'realm.oath';
  const views = choicesView(s, inst(s, card));
  const toStane = chooseLabel(s, card, /Princess/);
  assert.ok(views[toStane].effects.some((l) => /service ends/.test(l)), 'the button says the service ends');
  assert.ok(!views[chooseLabel(s, card, /Duke Robert/)].effects.some((l) => /service ends/.test(l)));
  s.realm.oath = 'aumbry';
  const honour = s.honour;
  const favour = s.favour.aumbry;
  const t = oathTerms(s, 'stane');
  assert.ok(t.turncoat && t.breaksService);
  s.pending = { inst: inst(s, card), then: 'none' };
  answer(s, toStane);
  assert.equal(s.realm.oath, 'stane');
  assert.equal(s.patron, null, 'his service ends');
  assert.equal(s.honour, honour - 2, 'a broken oath costs honour');
  assert.ok(s.favour.aumbry < favour - 5 + 1, 'and the favour of the house betrayed');
});

test('the king’s will fills in the names, and an unsworn knight must choose when it is read', () => {
  const s = atWar(13, null);
  const view = choicesView(s, inst(s, 'realm.kingDead.free'));
  const heir = s.realm.will === 'aumbry' ? /Duke Robert/ : /Isabeau/;
  assert.match(view[0].label, heir);
  assert.ok(holds(s, cardById('realm.kingDead.free').when, {}));
  assert.ok(!holds(s, cardById('realm.kingDead.sworn').when, {}));
  s.pending = { inst: inst(s, 'realm.kingDead.free'), then: 'none' };
  answer(s, 0);
  assert.equal(s.realm.oath, s.realm.will);
});

// ---------------------------------------------------------------------------
// Land and men
// ---------------------------------------------------------------------------

test('three faithful years and a lord’s good opinion are rewarded with land', () => {
  const s = knight(14);
  takeService(s, 'stane');
  s.patron.summons = null;
  s.favour.stane = LANDS.patronFavour;
  s.year = s.patron.since + LANDS.patronYears - 1;
  s.month = LAST_MONTH;
  s.patron.attended = true;
  s.purse = 100 * 240;
  passMonth(s);
  const m = s.lands.find((l) => l.heldOf === 'stane' && l.how === 'patron');
  assert.ok(m, 'a manor held of Stane');
  assert.ok(s.winter.notes.some((n) => n.includes(manorDef(m.id).name)));
});

test('men are kept as land allows, and a man who is not paid does not stay', () => {
  const s = knight(15);
  s.month = LAST_MONTH;
  s.purse = 100 * 240;
  passMonth(s);
  while (s.pending) answerFirst(s);
  assert.equal(companyMax(s), COMPANY.base);
  for (let i = 0; i < COMPANY.base; i++) assert.ok(hireMan(s).ok);
  assert.equal(hireMan(s).ok, false, 'no room without land');
  grantManor(s, null, 'test');
  assert.equal(companyMax(s), COMPANY.base + COMPANY.perManor);
  assert.ok(hireMan(s).ok);
  assert.equal(menOf(s), s.company + manorDef(s.lands[0].id).men);
  assert.ok(dismissMan(s).ok);
  const offer = s.winter.manor;
  if (offer) {
    s.purse = offer.price;
    assert.ok(buyManor(s).ok);
    assert.equal(s.purse, 0);
  }
  // Next winter, with an empty purse: the men leave rather than ruin him.
  endWinter(s);
  s.month = LAST_MONTH;
  const full = companyMax(s);
  s.company = full;
  s.purse = 0;
  passMonth(s);
  assert.ok(s.company < full);
  assert.ok(s.purse >= 0, 'what he could pay, he paid');
  assert.ok(s.winter.notes.some((n) => /unpaid/.test(n)));
});

test('importance is the sum of its terms, and land and men raise the rank', () => {
  const s = knight(16);
  const a = importance(s);
  assert.equal(a.score, Math.round(a.terms.reduce((t, x) => t + x.value, 0)));
  assert.equal(a.rank, [...RANKS].reverse().find((r) => a.score >= r.min));
  for (let i = 0; i < 3; i++) grantManor(s, null, 'test');
  s.company = companyMax(s);
  const b = importance(s);
  assert.ok(b.score > a.score);
  assert.ok(RANKS.indexOf(b.rank) >= RANKS.indexOf(a.rank));
});

// ---------------------------------------------------------------------------
// Old saves
// ---------------------------------------------------------------------------

test('a phase-three save opens in a realm that has been counting the years', () => {
  const raw = readFileSync(new URL('./fixtures/v3-save.json', import.meta.url), 'utf8');
  assert.equal(JSON.parse(raw).version, 3);
  const s = deserialize(raw);
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.realm.tension, TENSION[s.year]);
  assert.equal(s.realm.balance, 0);
  assert.equal(s.heart, 'married');
  assert.ok(s.lands.some((l) => l.how === 'dower'), 'her lands became her dower manor');
  assert.equal(s.company, 0);
  assert.deepEqual(badNumbers(s), []);
  // And it plays on, into the war.
  passive(s, WAR_YEAR, WAR_MONTH);
  assert.equal(s.status, 'active');
  assert.ok(s.realm.war);
  assert.deepEqual(badNumbers(s), []);
});
