// Does the choice in the lists matter? And is knowing your man worth paying for?
//
// This is the instrument for the core question of the whole game. If a player
// who chooses carefully wins no more often than one who rides shield-balanced
// every course, the joust is a coin flip with extra steps and everything built
// on top of it is decoration.
//
// It pits a rider against rivals of every archetype, across a range of skill
// gaps, under several policies, and prints the win rate for each with a noise
// floor beside it — at N bouts a single bout is worth 100/N points, and a gap
// smaller than about twice the standard error is not a result.
//
//   node sim/joust-curve.js --bouts=4000

import { makeRng } from '../src/engine/rng.js';
import {
  newBout, runCourse, reckonBout, beliefMix, archetype, CHOICES, choiceByKey,
} from '../src/engine/joust.js';
import { ARCHETYPES } from '../src/data/joust.data.js';

const rider = (id, skill, arch = null) => ({
  id, lance: skill, seat: skill, vigour: 10,
  horse: { quality: 10, temper: 'steady' }, fatigue: 0, wound: null, archetype: arch,
});

const POLICY = {
  shield: () => choiceByKey('shield/balanced'),
  random: (ctx) => ctx.rng.pick(CHOICES),
  'squire, blind': (ctx) => reckon(ctx, 0),
  'squire, habits': (ctx) => reckon(ctx, 1),
  'squire, read': (ctx) => reckon(ctx, 2),
};

function reckon({ bout, me, him }, intel) {
  const arch = archetype(him.archetype);
  return reckonBout(bout, me, him, 'a', (sit) => beliefMix(arch, sit, intel)).best;
}

export function winRate(policy, gap, bouts, seed = 1) {
  let wins = 0;
  for (let i = 0; i < bouts; i++) {
    const rng = makeRng(seed * 100003 + i * 31 + 7);
    const arch = ARCHETYPES[i % ARCHETYPES.length].id;
    const me = rider('me', 10 + gap);
    const him = rider('him', 10, arch);
    const bout = newBout('me', 'him');
    while (!bout.done) {
      const c = POLICY[policy]({ bout, me, him, rng });
      runCourse(bout, me, him, c, null, rng);
    }
    if (bout.winner === 'a') wins += 1;
  }
  return wins / bouts;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = Object.fromEntries(process.argv.slice(2).map((s) => s.replace(/^--/, '').split('=')));
  const bouts = Number(a.bouts || 2000);
  const gaps = [-4, -2, 0, 2, 4];
  const t0 = Date.now();
  console.log(`Win rate by skill gap (lance and seat both +gap), ${bouts} bouts per cell,`);
  console.log(`rivals cycled through all ${ARCHETYPES.length} archetypes.`);
  const se = 100 * Math.sqrt(0.25 / bouts);
  console.log(`Noise floor: one standard error is ${se.toFixed(1)} points at 50%; treat gaps under ${(2 * se).toFixed(1)} as noise.\n`);
  console.log('policy'.padEnd(18) + gaps.map((g) => `gap ${g >= 0 ? '+' : ''}${g}`.padStart(9)).join(''));
  for (const p of Object.keys(POLICY)) {
    const row = gaps.map((g) => `${(100 * winRate(p, g, bouts)).toFixed(1)}%`.padStart(9));
    console.log(p.padEnd(18) + row.join(''));
  }
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
