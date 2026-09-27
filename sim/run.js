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

import { newGame, STATUS } from '../src/engine/state.js';
import { randomAnswers, randomName } from '../src/engine/knight.js';
import { makeRng } from '../src/engine/rng.js';
import { lsd } from '../src/engine/money.js';
import { rollOfArms } from '../src/engine/field.js';
import { step, POLICIES, setConduct } from './bot.js';

export class ProgressError extends Error {}

export function assertProgress(r) {
  if (r.yearsPlayed === 0 && !r.ruined) {
    throw new ProgressError(`Career ${r.seed} never reached a winter. The months are not advancing.`);
  }
  if (r.tourneys === 0 && !r.ruined) {
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
  while (state.status === STATUS.ACTIVE && state.year < lastYear) {
    if (++guard > 20000) throw new ProgressError(`Career ${seed} took 20000 steps without finishing ${years} years.`);
    const did = step(state, policy, rng);
    counts[did] = (counts[did] || 0) + 1;
  }
  const byTier = {};
  const placings = {};
  for (const e of state.book) {
    if (!e.tier || ['dubbing', 'epithet', 'story'].includes(e.tier)) continue;
    byTier[e.tier] = (byTier[e.tier] || 0) + 1;
    if (e.placing === 'champion') placings[e.tier] = (placings[e.tier] || 0) + 1;
  }
  const r = {
    seed, policy, answers: state.answers,
    yearsPlayed: state.year - 1,
    ruined: state.status === STATUS.RUINED,
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
    married: `${results.filter((r) => r.married).length} of ${results.filter((r) => r.promised).length} promised`,
    ridden,
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
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opt = args();
  setConduct(opt.conduct);
  const policies = opt.compare ? POLICIES : [opt.policy];
  const t0 = Date.now();
  for (const policy of policies) {
    const s = summarise(batch({ ...opt, policy }));
    console.log(`\n== policy: ${policy}, ${opt.conduct}  (${opt.runs} careers, ${opt.years} years each)`);
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === 'object') {
        console.log(`  ${k}:`);
        for (const [kk, vv] of Object.entries(v)) console.log(`    ${kk.padEnd(10)} ${vv}`);
      } else console.log(`  ${k.padEnd(18)} ${v}`);
    }
  }
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
