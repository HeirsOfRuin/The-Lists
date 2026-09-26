// Shared by the test files: a finished knight, a tourney played to a point,
// and a deep scan for numbers that should never exist.

import { newGame } from '../src/engine/state.js';
import { randomAnswers, randomName } from '../src/engine/knight.js';
import { makeRng } from '../src/engine/rng.js';

export function knight(seed = 1, answers = null) {
  const rng = makeRng(seed * 131 + 7);
  return newGame({ seed, answers: answers || randomAnswers(rng), name: randomName(rng) });
}

/** Every path in an object whose value is NaN or an infinity. */
export function badNumbers(obj, path = '$', out = []) {
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) out.push(`${path} = ${obj}`);
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => badNumbers(v, `${path}[${i}]`, out));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) badNumbers(v, `${path}.${k}`, out);
  }
  return out;
}
