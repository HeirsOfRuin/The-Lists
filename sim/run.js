// Batch runner: plays whole careers headless and reports what happened.
//
// THE MOST IMPORTANT THING IN THIS FILE is assertProgress(). A harness that
// drives careers through an engine that silently refuses to advance reports
// PASS on everything downstream, because it is comparing careers that were
// never ridden. Every run is checked for movement — tourneys entered, bouts
// fought, courses run — and the report prints those QUANTITIES rather than a
// verdict, because a number can be eyeballed for "wait, that's wrong".
//
// Usage:
//   node sim/run.js --runs=300 --policy=squire --tourneys=25
//   node sim/run.js --compare          # every policy, same seeds

import { newGame, STATUS } from '../src/engine/state.js';
import { randomAnswers, randomName } from '../src/engine/knight.js';
import { makeRng } from '../src/engine/rng.js';
import { lsd } from '../src/engine/money.js';
import { playTourney, rideOn, POLICIES } from './bot.js';

export class ProgressError extends Error {}

export function assertProgress(r) {
  if (r.tourneys === 0) {
    throw new ProgressError(`Career ${r.seed} entered no tourney at all. Nothing was played.`);
  }
  if (r.bouts === 0 || r.courses === 0) {
    throw new ProgressError(
      `Career ${r.seed} entered ${r.tourneys} tourney(s) but fought ${r.bouts} bouts and ran ${r.courses} courses. ` +
        'The lists never opened; every number downstream is meaningless.'
    );
  }
  if (r.courses < r.bouts) {
    throw new ProgressError(`Career ${r.seed}: ${r.courses} courses for ${r.bouts} bouts. A bout was decided without being ridden.`);
  }
  return true;
}

export function playCareer({ seed, policy = 'squire', tourneys = 25 }) {
  const rng = makeRng(seed * 7919 + 1);
  const state = newGame({ seed, answers: randomAnswers(rng), name: randomName(rng) });
  const startPurse = state.purse;
  const r = { seed, policy, answers: state.answers, tourneys: 0, bouts: 0, courses: 0, ruined: false };
  const placings = { champion: 0, runnerUp: 0, semi: 0, quarter: 0 };
  const netByPlacing = { champion: [], runnerUp: [], semi: [], quarter: [] };
  for (let i = 0; i < tourneys; i++) {
    if (state.status !== STATUS.ACTIVE) break;
    const d = playTourney(state, policy, rng);
    if (!d.entered) break;
    r.tourneys += 1;
    r.bouts += d.bouts;
    r.courses += d.courses;
    const e = state.event.entry;
    placings[e.placing] += 1;
    netByPlacing[e.placing].push(e.net);
    rideOn(state);
  }
  r.ruined = state.status === STATUS.RUINED;
  r.placings = placings;
  r.netByPlacing = netByPlacing;
  r.purseDelta = state.purse - startPurse;
  r.renown = state.renown;
  r.boutsWon = state.career.boutsWon;
  r.lance = state.knight.stats.lance;
  r.seat = state.knight.stats.seat;
  assertProgress(r);
  return r;
}

const median = (xs) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—');

export function batch({ runs, policy, tourneys, firstSeed = 1 }) {
  const out = [];
  for (let i = 0; i < runs; i++) out.push(playCareer({ seed: firstSeed + i, policy, tourneys }));
  return out;
}

export function summarise(results) {
  const n = results.length;
  const sum = (f) => results.reduce((s, r) => s + f(r), 0);
  const tourneys = sum((r) => r.tourneys);
  const bouts = sum((r) => r.bouts);
  const won = sum((r) => r.boutsWon);
  const champs = sum((r) => r.placings.champion);
  const ruined = results.filter((r) => r.ruined).length;
  const allNet = { champion: [], runnerUp: [], semi: [], quarter: [] };
  for (const r of results) for (const k of Object.keys(allNet)) allNet[k].push(...r.netByPlacing[k]);
  return {
    careers: n,
    tourneys,
    bouts,
    courses: sum((r) => r.courses),
    boutWinRate: pct(won, bouts),
    championRate: pct(champs, tourneys),
    ruined: pct(ruined, n),
    medianPurseDelta: lsd(median(results.map((r) => r.purseDelta))),
    medianRenown: median(results.map((r) => r.renown)),
    netByPlacing: Object.fromEntries(Object.entries(allNet).map(([k, v]) => [k, `${lsd(median(v))} (n=${v.length})`])),
  };
}

function args() {
  const a = Object.fromEntries(process.argv.slice(2).map((s) => {
    const [k, v] = s.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }));
  return {
    runs: Number(a.runs || 200),
    policy: a.policy || 'squire',
    tourneys: Number(a.tourneys || 25),
    compare: !!a.compare,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opt = args();
  const policies = opt.compare ? POLICIES : [opt.policy];
  const t0 = Date.now();
  for (const policy of policies) {
    const s = summarise(batch({ ...opt, policy }));
    console.log(`\n== policy: ${policy}  (${opt.runs} careers, up to ${opt.tourneys} tourneys each)`);
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === 'object') {
        console.log(`  ${k}:`);
        for (const [kk, vv] of Object.entries(v)) console.log(`    ${kk.padEnd(10)} ${vv}`);
      } else console.log(`  ${k.padEnd(18)} ${v}`);
    }
  }
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
