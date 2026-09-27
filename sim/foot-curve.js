// Does the choice at the barriers matter? The same question the joust curve
// asks of the lists, asked of foot combat: a man who chooses well against one
// who stands and thrusts every exchange, or chooses at random, across skill
// gaps, against every style. And the same noise floor beside it.
//
//   node sim/foot-curve.js --bouts=2000
//   node sim/foot-curve.js --bouts=2000 --ord=outrance

import { makeRng } from '../src/engine/rng.js';
import {
  newFootBout, runExchange, reckonFoot, beliefFootMix, footStyle, FOOT_CHOICES, footChoiceByKey,
} from '../src/engine/foot.js';
import { FOOT_STYLES } from '../src/data/foot.data.js';

const man = (id, sword, style = null) => ({ id, sword, vigour: 10, fatigue: 0, wound: null, footStyle: style });

const POLICY = {
  'thrust, stand': () => footChoiceByKey('thrust/stand'),
  random: (ctx) => ctx.rng.pick(FOOT_CHOICES),
  'squire, blind': (ctx) => reckon(ctx, 0),
  'squire, habits': (ctx) => reckon(ctx, 1),
  'squire, read': (ctx) => reckon(ctx, 2),
};

function reckon({ bout, me, him }, intel) {
  const style = footStyle(him.footStyle);
  return reckonFoot(bout, me, him, 'a', (sit) => beliefFootMix(style, sit, intel)).best;
}

export function footWinRate(policy, gap, bouts, { seed = 1, ord = 'articles' } = {}) {
  let wins = 0;
  for (let i = 0; i < bouts; i++) {
    const rng = makeRng(seed * 100019 + i * 37 + 11);
    const style = FOOT_STYLES[i % FOOT_STYLES.length].id;
    const me = man('me', 10 + gap, 'schooled');
    const him = man('him', 10, style);
    const bout = newFootBout('me', 'him', ord);
    while (!bout.done) runExchange(bout, me, him, POLICY[policy]({ bout, me, him, rng }), null, rng);
    if (bout.winner === 'a') wins += 1;
  }
  return wins / bouts;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = Object.fromEntries(process.argv.slice(2).map((s) => s.replace(/^--/, '').split('=')));
  const bouts = Number(a.bouts || 2000);
  const ord = a.ord || 'articles';
  const gaps = [-4, -2, 0, 2, 4];
  const t0 = Date.now();
  console.log(`Foot combat (${ord}): win rate by sword gap, ${bouts} bouts per cell, all ${FOOT_STYLES.length} styles.`);
  const se = 100 * Math.sqrt(0.25 / bouts);
  console.log(`Noise floor: one standard error is ${se.toFixed(1)} points at 50%; treat gaps under ${(2 * se).toFixed(1)} as noise.\n`);
  console.log('policy'.padEnd(18) + gaps.map((g) => `gap ${g >= 0 ? '+' : ''}${g}`.padStart(9)).join(''));
  for (const p of Object.keys(POLICY)) {
    const row = gaps.map((g) => `${(100 * footWinRate(p, g, bouts, { ord })).toFixed(1)}%`.padStart(9));
    console.log(p.padEnd(18) + row.join(''));
  }
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
