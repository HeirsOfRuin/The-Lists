// The lists, drawn and cried: what cannot be true of the picture.
//
// The animation itself is looked at, not tested (tools/tilt-sheet.mjs). What
// is tested is what it is built from: the cry agrees with the ordinance, every
// pair of outcomes has one, the scene draws for any arms, and a lance points
// where it was aimed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseCry } from '../src/engine/herald.js';
import { OUTCOMES, ORDINANCE } from '../src/data/joust.data.js';
import { renderScene, lanceAngle, pointAt } from '../src/ui/tilt.js';
import { randomArms, TINCTURES } from '../src/engine/heraldry.js';
import { makeRng } from '../src/engine/rng.js';

const course = (a, b) => ({ you: { aim: 'shield', seat: 'balanced', out: a }, him: { aim: 'shield', seat: 'balanced', out: b }, wounds: {} });

test('every pair of outcomes has a cry, and its tone follows the ordinance', () => {
  for (const a of OUTCOMES) {
    for (const b of OUTCOMES) {
      const c = courseCry(course(a, b));
      assert.ok(c.text && !/undefined|NaN/.test(c.text), `${a}/${b}: ${c.text}`);
      assert.ok(['good', 'bad', 'even'].includes(c.tone), `${a}/${b}: ${c.tone}`);
      let want;
      if (a === 'horse' || b === 'horse') want = a === b ? 'even' : a === 'horse' ? 'bad' : 'good';
      else if (a === 'unhorse' || b === 'unhorse') want = a === b ? 'even' : a === 'unhorse' ? 'good' : 'bad';
      else {
        const d = ORDINANCE.points[a] - ORDINANCE.points[b];
        want = d > 0 ? 'good' : d < 0 ? 'bad' : 'even';
      }
      assert.equal(c.tone, want, `${a}/${b}`);
    }
  }
});

test('the scene draws for any arms, at rest and with either rider down', () => {
  const rng = makeRng(9);
  for (let i = 0; i < 60; i++) {
    const near = randomArms(rng, rng.pick(['none', 'label', 'crescent', 'baton']));
    const far = randomArms(rng, 'none');
    for (const fallen of [null, 'near', 'far']) {
      const html = renderScene({ near, far, farName: 'Sir <Test>', fallen, cry: i % 2 ? courseCry(course('helm', 'miss')) : null, playing: i % 3 === 0 });
      assert.ok(!/undefined|NaN/.test(html), `arms ${JSON.stringify(near)} v ${JSON.stringify(far)}, fallen ${fallen}`);
      assert.ok(html.includes(TINCTURES[near.field]) && html.includes(TINCTURES[far.field]), 'each rider wears his own colours');
      assert.ok(!html.includes('Sir <Test>'), 'names are escaped');
    }
  }
});

test('a lance points where it was aimed: the helm higher than the shield, the shield higher than low', () => {
  for (const side of ['near', 'far']) {
    const helm = lanceAngle(side, 'break', 'helm');
    const shield = lanceAngle(side, 'break', 'shield');
    const low = lanceAngle(side, 'break', 'low');
    assert.ok(helm < shield && shield < low, `${side}: ${helm} ${shield} ${low}`);
    // A point that strikes the tilt comes down onto it, below any mark on a man.
    assert.ok(lanceAngle(side, 'tilt', 'shield') > low, side);
    for (const out of OUTCOMES) {
      for (const aim of ['helm', 'shield', 'low']) {
        const a = lanceAngle(side, out, aim);
        const p = pointAt(side, a);
        assert.ok(Number.isFinite(a) && Number.isFinite(p.x) && Number.isFinite(p.y), `${side} ${out} ${aim}`);
        assert.ok(p.x > 0 && p.x < 400 && p.y > 0 && p.y < 170, `${side} ${out} ${aim}: the point meets inside the picture`);
      }
    }
  }
});
