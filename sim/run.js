// Batch runner: plays whole careers headless and reports what happened.
//
// THE MOST IMPORTANT THING IN THIS FILE is assertProgress(). A harness that
// drives careers through an engine that silently refuses to advance reports
// PASS on everything downstream, because it is comparing careers that were
// never ridden. Every run is checked for movement — years passed, tourneys
// ridden, bouts fought, cards answered, winters kept — and the report prints
// those QUANTITIES rather than a verdict.
//
// Usage:
//   node sim/run.js --runs=200 --years=8
//   node sim/run.js --compare          # every joust policy, same seeds
//   node sim/run.js --years=13 --war=careful   # through the war, refusing needless risk

import { newGame, STATUS } from '../src/engine/state.js';
import { randomAnswers, randomName } from '../src/engine/knight.js';
import { makeRng } from '../src/engine/rng.js';
import { lsd } from '../src/engine/money.js';
import { rollOfArms } from '../src/engine/field.js';
import { step, POLICIES, setConduct, setWar, setVow, setRetireAge } from './bot.js';
import { importance, menOf } from '../src/engine/realm.js';
import { endingFor, ambitionMet } from '../src/engine/ending.js';

export class ProgressError extends Error {}

export function assertProgress(r) {
  if (r.yearsPlayed === 0 && !r.ended) {
    throw new ProgressError(`Career ${r.seed} never reached a winter. The months are not advancing.`);
  }
  if (r.tourneys === 0 && !r.ended) {
    throw new ProgressError(`Career ${r.seed} rode ${r.yearsPlayed} years and entered no tourney. Nothing was played.`);
  }
  if (r.tourneys > 0 && (r.bouts === 0 || r.courses === 0)) {
    throw new ProgressError(
      `Career ${r.seed} entered ${r.tourneys} tourney(s) but fought ${r.bouts} bouts and ran ${r.courses} courses. The lists never opened.`
    );
  }
  if (r.courses < r.bouts) {
    throw new ProgressError(`Career ${r.seed}: ${r.courses} courses for ${r.bouts} bouts. A bout was decided without being ridden.`);
  }
  if (r.yearsPlayed >= 2 && r.cards === 0) {
    throw new ProgressError(`Career ${r.seed} rode ${r.yearsPlayed} years and never met a card. The feasts and roads are not firing.`);
  }
  return true;
}

export function playCareer({ seed, policy = 'squire', years = 8, answers = null }) {
  const rng = makeRng(seed * 7919 + 1);
  const state = newGame({ seed, answers: answers || randomAnswers(rng), name: randomName(rng) });
  const startPurse = state.purse;
  const counts = {};
  let guard = 0;
  const lastYear = state.year + years;
  let atWar = null; // the knight as the king dies: how much he matters
  while (state.status === STATUS.ACTIVE && state.year < lastYear) {
    if (++guard > 20000) throw new ProgressError(`Career ${seed} took 20000 steps without finishing ${years} years.`);
    const did = step(state, policy, rng);
    counts[did] = (counts[did] || 0) + 1;
    if (!atWar && state.realm.war) {
      const imp = importance(state);
      atWar = { rank: imp.rank.id, score: imp.score, men: menOf(state), lands: (state.lands || []).length, balance: state.realm.balance, will: state.realm.will };
    }
  }
  const w = state.realm.war;
  const byTier = {};
  const placings = {};
  for (const e of state.book) {
    if (!e.tier || ['dubbing', 'epithet', 'story', 'vow', 'order', 'fair'].includes(e.tier)) continue;
    byTier[e.tier] = (byTier[e.tier] || 0) + 1;
    if (e.placing === 'champion') placings[e.tier] = (placings[e.tier] || 0) + 1;
  }
  const r = {
    seed, policy, answers: state.answers,
    yearsPlayed: state.year - 1,
    ruined: state.status === STATUS.RUINED,
    ended: state.status !== STATUS.ACTIVE,
    tourneys: state.career.tourneys,
    bouts: state.career.bouts,
    boutsWon: state.career.boutsWon,
    courses: counts.course || 0,
    cards: counts.card || 0,
    trained: counts.train || 0,
    byTier,
    titles: placings,
    purseDelta: state.purse - startPurse,
    renown: state.renown,
    rank: rollOfArms(state).rank,
    squireDubbed: state.book.some((e) => e.tier === 'dubbing'),
    patron: state.patron?.id || null,
    everServed: counts.summons > 0 || !!state.patron || state.book.length < 0,
    summons: counts.summons || 0,
    dismissed: false,
    disgracedEnd: state.honour <= 2,
    epithet: state.knight.epithet || null,
    epithetYear: (state.book.find((e) => e.tier === 'epithet') || {}).year || null,
    masterDisgraced: state.master.id === 'disgraced',
    masterCleared: state.flags.includes('masterCleared'),
    promised: state.flags.includes('betrothed'),
    married: state.heart === 'married',
    honour: state.honour,
    retinue: state.retinue.length,
    harness: state.harness.quality,
    lance: state.knight.stats.lance,
    seat: state.knight.stats.seat,
    dead: state.status === 'dead',
    exiled: state.status === 'exiled',
    atWar,
    oath: state.realm.oath,
    warSide: w?.side || null,
    victor: w?.victor || null,
    battles: w?.battles.length || 0,
    attainted: !!w?.settlement?.attainted,
    landsEnd: (state.lands || []).length,
    firstHigh: Math.min(...state.book.filter((e) => e.tier === 'high').map((e) => e.year), 99),
    firstGrand: Math.min(...state.book.filter((e) => e.tier === 'grand').map((e) => e.year), 99),
    diedIn: state.status === 'dead' ? (/fell at the Battle/.test(state.outcome.text) ? 'battle' : /skirmish that no chronicle/.test(state.outcome.text) ? 'campaign' : 'skirmish') : null,
    life: {
      companion: state.order?.companion ? state.order.since : null,
      stood: state.order?.elections.filter((e) => e.stood).length || 0,
      chapters: state.order?.elections.length || 0,
      stalls: state.order?.elections.reduce((t, e) => t + e.stalls, 0) || 0,
      vowsKept: state.book.filter((e) => e.tier === 'vow' && e.name === 'A vow kept').length,
      vowsBroken: state.book.filter((e) => e.tier === 'vow' && e.name === 'A vow broken').length,
      popinjay: state.book.filter((e) => e.tier === 'fair' && /popinjay/i.test(e.name)).length,
      popinjayWon: state.book.filter((e) => e.tier === 'fair' && /popinjay/i.test(e.name) && e.placing === 'champion').length,
      races: state.book.filter((e) => e.tier === 'fair' && /Race/.test(e.name)).length,
      racesWon: state.book.filter((e) => e.tier === 'fair' && /Race/.test(e.name) && e.placing === 'champion').length,
      campaigned: state.career.monthsCampaigned || 0,
      archers: state.archers || 0,
      rollFirst: state.career.rollFirst || 0,
      retired: state.status === 'retired',
      ending: state.status === 'retired' ? state.outcome.ending : state.status === 'active' ? `(${endingFor(state).id})` : state.status,
      ambition: state.ambition,
      ambitionMet: ambitionMet(state),
      age: state.knight.age,
    },
  };
  assertProgress(r);
  return r;
}

const median = (xs) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—');

export function batch({ runs, policy, years, firstSeed = 1 }) {
  const out = [];
  for (let i = 0; i < runs; i++) out.push(playCareer({ seed: firstSeed + i, policy, years }));
  return out;
}

export function summarise(results) {
  const n = results.length;
  const sum = (f) => results.reduce((s, r) => s + f(r), 0);
  const tiers = {};
  const titles = {};
  for (const r of results) {
    for (const [t, v] of Object.entries(r.byTier)) tiers[t] = (tiers[t] || 0) + v;
    for (const [t, v] of Object.entries(r.titles)) titles[t] = (titles[t] || 0) + v;
  }
  const ridden = Object.fromEntries(Object.entries(tiers).map(([t, v]) => [t, `${(v / n).toFixed(1)} a career, won ${pct(titles[t] || 0, v)}`]));
  return {
    careers: n,
    yearsPlayed: (sum((r) => r.yearsPlayed) / n).toFixed(1),
    ruined: pct(results.filter((r) => r.ruined).length, n),
    tourneysPerYear: (sum((r) => r.tourneys) / Math.max(1, sum((r) => r.yearsPlayed))).toFixed(1),
    boutWinRate: pct(sum((r) => r.boutsWon), sum((r) => r.bouts)),
    cardsPerYear: (sum((r) => r.cards) / Math.max(1, sum((r) => r.yearsPlayed))).toFixed(1),
    medianPurseDelta: lsd(median(results.map((r) => r.purseDelta))),
    medianRenown: median(results.map((r) => r.renown)),
    medianRollRank: median(results.map((r) => r.rank)),
    squiresDubbed: pct(results.filter((r) => r.squireDubbed).length, n),
    medianLanceAtEnd: median(results.map((r) => r.lance)),
    inServiceAtEnd: pct(results.filter((r) => r.patron).length, n),
    servedAtAll: pct(results.filter((r) => r.everServed).length, n),
    disgracedAtEnd: pct(results.filter((r) => r.disgracedEnd).length, n),
    medianHonour: median(results.map((r) => r.honour)),
    withByname: pct(results.filter((r) => r.epithet).length, n),
    bynameFirstYear: median(results.filter((r) => r.epithetYear).map((r) => r.epithetYear)),
    bynames: Object.entries(results.reduce((m, r) => { if (r.epithet) m[r.epithet] = (m[r.epithet] || 0) + 1; return m; }, {})).map(([k, v]) => `${k} ${v}`).join(', '),
    masterCleared: `${results.filter((r) => r.masterCleared).length} of ${results.filter((r) => r.masterDisgraced).length} with a disgraced master`,
    married: `${results.filter((r) => r.married && r.promised).length} of ${results.filter((r) => r.promised).length} promised; ${results.filter((r) => r.married && !r.promised).length} for love`,
    ridden,
    realm: realmSummary(results),
    life: lifeSummary(results),
  };
}

function lifeSummary(results) {
  const n = results.length;
  const L = results.map((r) => r.life);
  const sum = (f) => L.reduce((t, l) => t + f(l), 0);
  const count = (xs) => Object.entries(xs.reduce((m, x) => { m[x] = (m[x] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
  const comp = L.filter((l) => l.companion);
  return {
    swan: `${comp.length} of ${n} companions (median year ${median(comp.map((l) => l.companion))}); stood ${sum((l) => l.stood)} times; ${(sum((l) => l.stalls) / n).toFixed(1)} stalls filled a career`,
    vows: `${sum((l) => l.vowsKept)} kept, ${sum((l) => l.vowsBroken)} broken`,
    popinjay: `${sum((l) => l.popinjayWon)} won of ${sum((l) => l.popinjay)} shot`,
    race: `${sum((l) => l.racesWon)} won of ${sum((l) => l.races)} run`,
    campaigned: `${(sum((l) => l.campaigned) / n).toFixed(1)} months a career`,
    archers: median(L.map((l) => l.archers)),
    headOfRoll: `${L.filter((l) => l.rollFirst >= 1).length} ever; ${L.filter((l) => l.rollFirst >= 2).length} twice or more`,
    endings: count(L.map((l) => l.ending)),
    ambitionMet: count(L.filter((l) => l.ambitionMet).map((l) => l.ambition)) + ` (of ${count(L.map((l) => l.ambition))})`,
  };
}

function realmSummary(results) {
  const war = results.filter((r) => r.atWar);
  const n = war.length;
  const count = (xs) => Object.entries(xs.reduce((m, x) => { m[x] = (m[x] || 0) + 1; return m; }, {})).map(([k, v]) => `${k} ${v}`).join(', ');
  const decided = war.filter((r) => r.victor);
  if (!n) return { reachedWar: `0 of ${results.length}` };
  return {
    reachedWar: `${n} of ${results.length}`,
    firstHighYear: `${median(results.map((r) => r.firstHigh))} (never ${results.filter((r) => r.firstHigh === 99).length})`,
    firstKingsYear: `${median(results.map((r) => r.firstGrand))} (never ${results.filter((r) => r.firstGrand === 99).length})`,
    rankAtWar: count(war.map((r) => r.atWar.rank)),
    medianScoreAtWar: median(war.map((r) => r.atWar.score)),
    medianMenAtWar: median(war.map((r) => r.atWar.men)),
    landedAtWar: pct(war.filter((r) => r.atWar.lands > 0).length, n),
    willNamed: count(war.map((r) => r.atWar.will)),
    medianBalance: median(war.map((r) => r.atWar.balance)),
    oaths: count(war.map((r) => r.oath || 'unsworn')),
    wonOnTheirSide: `${decided.filter((r) => r.warSide && r.warSide === r.victor).length} of ${decided.filter((r) => r.warSide).length} who fought`,
    twoBattles: pct(war.filter((r) => r.battles >= 2).length, n),
    died: `${pct(war.filter((r) => r.dead).length, n)} (${count(war.filter((r) => r.dead).map((r) => r.diedIn))})`,
    attainted: pct(war.filter((r) => r.attainted).length, n),
    exiled: pct(war.filter((r) => r.exiled).length, n),
  };
}

function args() {
  const a = Object.fromEntries(process.argv.slice(2).map((s) => {
    const [k, v] = s.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }));
  return {
    runs: Number(a.runs || 100),
    policy: a.policy || 'squire',
    years: Number(a.years || 8),
    compare: !!a.compare,
    conduct: a.conduct || 'chivalrous',
    war: a.war || 'bold',
    vow: a.vow || 'lances',
    retire: Number(a.retire || 99),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opt = args();
  setConduct(opt.conduct);
  setWar(opt.war);
  setVow(opt.vow);
  setRetireAge(opt.retire);
  const policies = opt.compare ? POLICIES : [opt.policy];
  const t0 = Date.now();
  for (const policy of policies) {
    const s = summarise(batch({ ...opt, policy }));
    console.log(`\n== policy: ${policy}, ${opt.conduct}, ${opt.war} in war  (${opt.runs} careers, ${opt.years} years each)`);
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === 'object') {
        console.log(`  ${k}:`);
        for (const [kk, vv] of Object.entries(v)) console.log(`    ${kk.padEnd(10)} ${vv}`);
      } else console.log(`  ${k.padEnd(18)} ${v}`);
    }
  }
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
