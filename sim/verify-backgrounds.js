// Does each answer in character creation change a career, and in the way it
// says it does?
//
// For every option of every creation question, play the same seeds with that
// option forced and the other answers drawn as usual, and measure what the
// career comes to. Each option is compared with the average of its question's
// options on the same seeds, so the noise of everything else cancels. A
// difference counts only if it is more than two standard errors of the
// paired difference: below that, the instrument cannot tell it from luck.
//
//   node sim/verify-backgrounds.js --runs=40 --years=8
//   node sim/verify-backgrounds.js --question=people

import { newGame } from '../src/engine/state.js';
import { randomAnswers, randomName, availableOptions, optionLines } from '../src/engine/knight.js';
import { QUESTIONS } from '../src/data/creation.data.js';
import { makeRng } from '../src/engine/rng.js';
import { step, setWar } from './bot.js';
import { importance } from '../src/engine/realm.js';
import { rollOfArms } from '../src/engine/field.js';

// What a career comes to, in numbers that the answers claim to move.
const METRICS = {
  renown: (s) => s.renown,
  purse: (s) => Math.round(s.purse / 240),
  wins: (s) => (s.career.bouts ? (100 * s.career.boutsWon) / s.career.bouts : 0),
  honour: (s) => s.honour,
  standing: (s) => importance(s).score,
  roll: (s) => -rollOfArms(s).rank, // higher is better
  sword: (s) => s.knight.stats.sword,
  lance: (s) => s.knight.stats.lance,
  lands: (s) => (s.lands || []).length,
  swan: (s) => (s.order?.companion ? 100 : 0),
};
const LABEL = {
  renown: 'renown', purse: 'purse £', wins: 'bouts won %', honour: 'honour', standing: 'standing', roll: 'Roll place',
  sword: 'sword', lance: 'lance', lands: 'manors', swan: 'Swan %',
};

/** Answers drawn from a seed, with one question's answer forced; null if the force breaks a `requires`. */
function answersWith(seed, qid, optId) {
  const rng = makeRng(seed * 104729 + 3);
  const answers = {};
  for (const q of QUESTIONS) {
    const avail = availableOptions(q.id, answers);
    if (q.id === qid) {
      if (!avail.some((o) => o.id === optId)) return null;
      answers[q.id] = optId;
    } else {
      answers[q.id] = rng.pick(avail).id;
    }
  }
  return answers;
}

function play(seed, answers, years) {
  const rng = makeRng(seed * 7919 + 1);
  const state = newGame({ seed, answers, name: randomName(rng) });
  let guard = 0;
  while (state.status === 'active' && state.year <= years && guard++ < 40000) step(state, 'squire', rng);
  return Object.fromEntries(Object.entries(METRICS).map(([k, f]) => [k, f(state)]));
}

function args() {
  const a = Object.fromEntries(process.argv.slice(2).map((s) => {
    const [k, v] = s.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }));
  return { runs: Number(a.runs || 40), years: Number(a.years || 8), question: a.question || null };
}

const opt = args();
setWar('careful');
const t0 = Date.now();
for (const q of QUESTIONS) {
  if (opt.question && q.id !== opt.question) continue;
  // The comparison is paired: the same seeds, only this answer differs. An
  // option open only after some earlier answer is left out, since forcing
  // that earlier answer would change what is being compared.
  const options = q.options.filter((o) => !o.requires);
  const seeds = [];
  for (let seed = 1; seeds.length < opt.runs && seed < opt.runs * 20; seed++) {
    if (options.every((o) => answersWith(seed, q.id, o.id))) seeds.push(seed);
  }
  const results = {};
  for (const o of options) results[o.id] = seeds.map((seed) => play(seed, answersWith(seed, q.id, o.id), opt.years));
  console.log(`\n== ${q.chapter}: ${q.prompt}  (${seeds.length} paired careers, ${opt.years} years)`);
  for (const o of q.options.filter((x) => x.requires)) console.log(`  ${o.id.padEnd(12)} (open only after another answer; not measured)`);
  for (const o of options) {
    const lines = [];
    for (const m of Object.keys(METRICS)) {
      // Paired difference from the question's mean, seed by seed.
      const diffs = seeds.map((_, i) => results[o.id][i][m] - options.reduce((t, x) => t + results[x.id][i][m], 0) / options.length);
      const mean = diffs.reduce((t, d) => t + d, 0) / diffs.length;
      const sd = Math.sqrt(diffs.reduce((t, d) => t + (d - mean) ** 2, 0) / Math.max(1, diffs.length - 1));
      const se = sd / Math.sqrt(diffs.length);
      if (Math.abs(mean) > 2 * se && Math.abs(mean) > 0.05) lines.push(`${LABEL[m]} ${mean > 0 ? '+' : ''}${mean.toFixed(1)}`);
    }
    const claims = optionLines(o).gives.join(', ');
    console.log(`  ${o.id.padEnd(12)} ${lines.length ? lines.join(' · ') : 'no difference above the noise'}`);
    console.log(`  ${''.padEnd(12)} claims: ${claims}`);
  }
}
console.log(`\n${((Date.now() - t0) / 1000).toFixed(0)}s`);
