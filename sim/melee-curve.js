// Does the choice in the mêlée matter? A knight who weighs each opening
// against another who always goes for the first man he sees, one who picks
// at random, and one who never takes a risk. What each brings home from a day
// of eight a side: ransoms won less ransoms paid, men lost, times taken, and
// the prize.
//
//   node sim/melee-curve.js --days=3000

import { makeRng } from '../src/engine/rng.js';
import {
  newMelee, openingsFor, yourPass, fieldPass, nextPass, meleeResult, ransomOf, squireCounsel, YOU,
} from '../src/engine/melee.js';
import { RANSOM, MELEE_RENOWN, MELEE_PRIZE } from '../src/data/melee.data.js';

const POLICY = {
  'squire\u2019s counsel': (m, tier) => squireCounsel(m, tier, m.riders[YOU].renown),
  'first man, take': (m) => ({ index: 0, action: m.openings[0].kind === 'rescue' ? 'rescue' : 'take' }),
  random: (m, tier, rng) => {
    const i = Math.floor(rng.next() * m.openings.length);
    const op = m.openings[i];
    const acts = op.kind === 'rescue' ? ['rescue', 'recet'] : ['take', 'strike', 'recet'];
    return { index: i, action: acts[Math.floor(rng.next() * acts.length)] };
  },
  'never risk it': () => ({ index: 0, action: 'recet' }),
};

function rider(id, skill, renown, rng) {
  return { id, sword: skill + Math.round(rng.normal(0, 1.5)), seat: skill + Math.round(rng.normal(0, 1.5)), vigour: 10, horse: { quality: 10 }, fatigue: 0, wound: null, renown };
}

export function playDay(policy, gap, seed, { tier = 'high', men = 0 } = {}) {
  const rng = makeRng(seed * 7717 + 3);
  const riders = { [YOU]: { id: YOU, sword: 10 + gap, seat: 10 + gap, vigour: 10, horse: { quality: 10 }, fatigue: 0, wound: null, renown: 30 } };
  const ids = [];
  for (let i = 0; i < 15; i++) { const id = `k${i}`; riders[id] = rider(id, 10, Math.round(rng.next() * 60), rng); ids.push(id); }
  const m = newMelee({ tier, riders, sides: { holders: ids.slice(0, 8), comers: [YOU, ...ids.slice(8)] }, yourSide: 'comers', men });
  while (!m.done) {
    if (!m.out[YOU]) {
      m.openings = openingsFor(m, rng);
      const c = m.openings.length ? POLICY[policy](m, tier, rng) : { index: 0, action: 'recet' };
      const rec = yourPass(m, c.index, c.action, rng);
      fieldPass(m, rng, rec.target ? [rec.target] : []);
    } else fieldPass(m, rng);
    nextPass(m);
  }
  const res = meleeResult(m);
  const net = m.prisoners.reduce((t, id) => t + ransomOf(tier, riders[id].renown), 0)
    - (m.youTaken ? ransomOf(tier, riders[YOU].renown) : 0) - m.yourMenTaken * RANSOM.man
    + (res.prize === YOU ? MELEE_PRIZE[tier] : 0);
  return { net, renown: res.renown + (res.prize === YOU ? MELEE_RENOWN.prize : 0), taken: m.youTaken, prize: res.prize === YOU, won: res.yourSideWon };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = Object.fromEntries(process.argv.slice(2).map((s) => s.replace(/^--/, '').split('=')));
  const days = Number(a.days || 3000);
  const men = Number(a.men || 0);
  console.log(`The mêlée at a high tourney, eight a side, ${days} days per row, ${men} men with you.`);
  console.log('Net: ransoms taken, less ransoms paid, plus the prize, in shillings a day.\n');
  console.log('policy'.padEnd(18) + ['gap', 'net s', 'renown', 'taken', 'prize', 'side won'].map((h) => h.padStart(9)).join(''));
  for (const gap of [-2, 0, 2]) {
    for (const p of Object.keys(POLICY)) {
      let net = 0; let renown = 0; let taken = 0; let prize = 0; let won = 0;
      for (let s = 1; s <= days; s++) {
        const r = playDay(p, gap, s, { men });
        net += r.net; renown += r.renown; taken += r.taken ? 1 : 0; prize += r.prize ? 1 : 0; won += r.won ? 1 : 0;
      }
      const row = [gap, (net / days / 12).toFixed(1), (renown / days).toFixed(2), `${(100 * taken / days).toFixed(1)}%`, `${(100 * prize / days).toFixed(1)}%`, `${(100 * won / days).toFixed(1)}%`];
      console.log(p.padEnd(18) + row.map((x) => String(x).padStart(9)).join(''));
    }
    console.log('');
  }
}
