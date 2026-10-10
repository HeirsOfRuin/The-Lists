// The lists, drawn: the gallery, the tilt, and two knights in their own arms at
// either end of it. And a course, ridden: the charge, the lances meeting, and
// what the course record says happened when they did.
//
// This module decides nothing. A course is rolled and saved before it is
// played here; the animation reads the record (state.event.lastCourse), so
// what is seen is what was rolled. Skipping it, or never seeing it under
// reduced motion, changes nothing but the picture.

import { TINCTURES, shieldSvg } from '../engine/heraldry.js';
import { esc } from './view.js';

// The near rider (you) rides left to right in front of the tilt; the far
// rider right to left behind it, a little smaller. Screen units: the viewBox.
const PLANES = {
  near: { dir: 1, scale: 1, ground: 150, start: 40, impact: 150, end: 330 },
  far: { dir: -1, scale: 0.88, ground: 136, start: 362, impact: 251, end: 70 },
};
export const TIMING = { total: 1800, impact: 950, cry: 1080, hold: 520 };
const W = 400;
const H = 170;
const BARRIER_TOP = 97;
const REACH = 100;                 // a couched lance, pivot to point, on screen
const PIVOT = { x: -4, y: -70 };   // where a lance is couched, in a rider's own frame
const SADDLE = { x: -4, y: -57 };
const RAISED = -50;                // a lance carried up, before the course
// What a lance is aimed at, on the other rider, in his own frame.
const MARKS = { helm: { x: 2, y: -93 }, shield: { x: 6, y: -75 }, low: { x: -1, y: -61 }, horse: { x: 46, y: -70 } };
const BROKE = new Set(['break', 'helm', 'tilt']);

const other = (side) => (side === 'near' ? 'far' : 'near');
const deg = (r) => (r * 180) / Math.PI;
const n2 = (v) => Math.round(v * 100) / 100;

/** A point in a rider's frame, on screen, with his horse at screen x `hx`. */
function onScreen(side, p, hx) {
  const P = PLANES[side];
  return { x: hx + P.dir * P.scale * p.x, y: P.ground + P.scale * p.y };
}
/** The mover's offset, in the rider's frame, that puts his horse at screen x. */
const local = (side, x) => x / (PLANES[side].dir * PLANES[side].scale);

/** The angle of a rider's lance at the moment of meeting, for what it did. */
export function lanceAngle(side, out, aim) {
  const P = PLANES[side];
  const O = PLANES[other(side)];
  const pivot = onScreen(side, PIVOT, P.impact);
  let target;
  if (out === 'tilt') target = { x: pivot.x + P.dir * 66, y: BARRIER_TOP };
  else if (out === 'horse') target = onScreen(other(side), MARKS.horse, O.impact);
  else target = onScreen(other(side), MARKS[aim] || MARKS.shield, O.impact);
  const a = deg(Math.atan2(target.y - pivot.y, Math.abs(target.x - pivot.x)));
  return out === 'miss' ? a - 9 : a;
}

/** Where a rider's lance point is, on screen, at the moment of meeting. */
export function pointAt(side, angle) {
  const P = PLANES[side];
  const p = onScreen(side, PIVOT, P.impact);
  const r = (angle * Math.PI) / 180;
  return { x: p.x + P.dir * REACH * Math.cos(r), y: p.y + REACH * Math.sin(r) };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

const CROWD = ['#a3242c', '#24539e', '#2f6b3a', '#d4a82a', '#2b2622', '#eeeae0', '#6a2f6e', '#8a5a3a', '#b8641f'];

function gallery(uid) {
  let stripes = '';
  for (let x = 0; x < W; x += 16) stripes += `<rect x="${x}" y="16" width="8" height="10" fill="#a3242c"/>`;
  let valance = 'M0,26';
  for (let x = 0; x < W; x += 10) valance += ` Q${x + 5},32 ${x + 10},26`;
  let crowd = '';
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 52; i++) {
      const x = 4 + i * 7.7 + (row % 2) * 3.8 + ((i * 7 + row * 5) % 3) - 1;
      const y = 38 + row * 8 + ((i * 3 + row) % 2);
      const hood = CROWD[(i * 7 + row * 4) % CROWD.length];
      crowd += `<circle cx="${n2(x)}" cy="${y + 3.2}" r="3.4" fill="${hood}" opacity=".85"/><circle cx="${n2(x)}" cy="${y}" r="1.9" fill="#e2c19c"/>`;
    }
  }
  let hangings = '';
  const cloth = ['#24539e', '#d4a82a', '#a3242c'];
  for (let x = 0, k = 0; x < W; x += 25, k++) {
    hangings += `<path d="M${x},60 h25 v9 l-6.25,4 l-6.25,-4 l-6.25,4 l-6.25,-4 Z" fill="${cloth[k % 3]}"/>`;
  }
  let flags = '';
  for (const x of [50, 150, 250, 350]) {
    flags += `<line x1="${x}" y1="16" x2="${x}" y2="2" stroke="#5b4426" stroke-width="1.2"/><path d="M${x},2.5 l14,3.5 l-14,3.5 Z" fill="${x % 200 === 50 ? '#a3242c' : '#24539e'}"/>`;
  }
  return `
    <defs>
      <linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d6e4"/><stop offset="1" stop-color="#e8ede9"/></linearGradient>
      <linearGradient id="${uid}-sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6d8b4"/><stop offset="1" stop-color="#d3bf8f"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#${uid}-sky)"/>
    ${flags}
    <rect x="0" y="16" width="${W}" height="56" fill="#7a5c3a"/>
    <rect x="0" y="16" width="${W}" height="10" fill="#eeeae0"/>${stripes}
    <path d="${valance} V26 Z" fill="#eeeae0" stroke="#a3242c" stroke-width=".8"/>
    <g class="crowd">${crowd}</g>
    <rect x="0" y="58" width="${W}" height="3" fill="#5b4426"/>
    ${hangings}
    <rect x="0" y="72" width="${W}" height="${H - 72}" fill="url(#${uid}-sand)"/>
    <path d="M0,74 H${W}" stroke="#00000018" stroke-width="2"/>`;
}

function barrier() {
  let folds = '';
  for (let x = 12; x < W; x += 25) folds += `M${x},101 V137 `;
  return `
    <g class="barrier">
      <rect x="0" y="99" width="${W}" height="39" fill="#2b4a78"/>
      <path d="${folds}" stroke="#ffffff1c" stroke-width="5"/>
      <rect x="0" y="99" width="${W}" height="2.2" fill="#d4a82a"/>
      <rect x="0" y="134" width="${W}" height="4" fill="#00000030"/>
      <rect x="0" y="94.5" width="${W}" height="4.5" rx="1.5" fill="#6b4a2a"/>
      <path d="M0,95.6 H${W}" stroke="#ffffff30" stroke-width=".8"/>
    </g>`;
}

function caparisonPath(lift = 0) {
  const n = 9;
  const x0 = 34;
  const x1 = -39;
  const step = (x0 - x1) / n;
  let d = lift ? `M${x0},${-23 - lift}` : `M-39,-40 C-39,-50 -33,-55 -24,-56 L10,-57 C22,-57 31,-51 33,-42 L${x0},-23`;
  for (let i = 0; i < n; i++) {
    const a = x0 - i * step;
    const b = a - step;
    d += ` Q${n2((a + b) / 2)},${-16.5 - lift} ${n2(b)},${-23 - lift}`;
  }
  return lift ? d : `${d} Z`;
}

/** A small shield of his arms, drawn right way round even on the far rider. */
function arms(a, x, y, size, id, flip) {
  const svg = shieldSvg(a, { size, uid: id });
  return flip
    ? `<g transform="translate(${x + size},${y}) scale(-1,1)">${svg}</g>`
    : `<g transform="translate(${x},${y})">${svg}</g>`;
}

function leg(x, cls, colour) {
  return `<g transform="translate(${x},-31)"><path class="${cls}" d="M0,0 L1.5,13 L-0.5,22 L2.5,30" fill="none" stroke="${colour}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

const STEEL = '#b9c1ca';
const STEEL_DARK = '#59636f';
const LINE = 'stroke="#1b1b1b55" stroke-width=".8"';

function figure(side, a, uid, pose) {
  const P = PLANES[side];
  const flip = P.dir < 0;
  const f = TINCTURES[a.field];
  const c = TINCTURES[a.charge];
  const len = REACH / P.scale;               // the same reach on screen from both ends
  const tip = PIVOT.x + len;
  const head = PIVOT.x + len * 0.5;
  const id = `${uid}-${side}`;
  const moverX = local(side, pose.x);
  const lance = `
    <g transform="translate(${PIVOT.x},${PIVOT.y})"><g class="lance" style="transform: rotate(${pose.lance}deg)"><g transform="translate(${-PIVOT.x},${-PIVOT.y})">
      <polygon points="-28,-71.9 ${n2(head)},-71.3 ${n2(head)},-68.7 -28,-68.1" fill="url(#${id}-lp)" ${LINE}/>
      <g class="lance-head"><polygon points="${n2(head)},-71.3 ${n2(tip)},-70.6 ${n2(tip)},-69.4 ${n2(head)},-68.7" fill="url(#${id}-lp)" ${LINE}/>
        <polygon points="${n2(tip)},-71.4 ${n2(tip + 3)},-72.2 ${n2(tip + 3)},-67.8 ${n2(tip)},-68.6" fill="#3a3530"/></g>
      <rect x="-12" y="-71.6" width="9" height="3.2" fill="#3a2a1d"/>
      <path d="M5,-77.5 Q12.5,-74 14.5,-70 Q12.5,-66 5,-62.5 Z" fill="${STEEL}" stroke="${STEEL_DARK}" stroke-width=".8"/>
    </g></g></g>`;
  const fallen = pose.fallen
    ? { fall: `transform: translateX(${n2(local(side, PLANES[side].impact) - moverX)}px)`, drop: 'transform: translate(-24px,48px)', rot: 'transform: rotate(-92deg)' }
    : { fall: '', drop: '', rot: '' };
  const rider = `
    <g class="rider-fall" style="${fallen.fall}"><g class="rider-drop" style="${fallen.drop}">
    <g transform="translate(${SADDLE.x},${SADDLE.y})"><g class="rider-rot" style="${fallen.rot}"><g transform="translate(${-SADDLE.x},${-SADDLE.y})">
      <path d="M-6,-58 L3,-48 L1,-35 L8,-33" fill="none" stroke="${STEEL}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-6,-58 L3,-48 L1,-35 L8,-33" fill="none" stroke="${STEEL_DARK}" stroke-width=".8" stroke-opacity=".6"/>
      <path d="M-13,-57 L-13,-73 Q-13,-83 -4,-83 L2,-83 Q9,-81 8,-72 L6,-57 Z" fill="${STEEL}" stroke="${STEEL_DARK}" stroke-width=".8"/>
      <path d="M-9,-80 Q-3,-82 3,-80" fill="none" stroke="#ffffff90" stroke-width="1.2"/>
      <path d="M-11,-96 C-20,-95 -25,-87 -23,-79 C-20,-84 -16,-87 -11,-88 Z" fill="${f}" ${LINE}/>
      <path d="M-11,-83 L-12,-92 Q-12,-102 -3,-102 Q4,-101 8,-95 L12,-90 L6,-89.5 L8,-85 L3,-83 Z" fill="#c6cdd5" stroke="${STEEL_DARK}" stroke-width=".8"/>
      <path d="M5,-91.2 L11.2,-90.3" stroke="#1e2329" stroke-width="1.3"/>
      <path d="M-4,-101 C-6,-110 -14,-113 -23,-107 C-16,-106.5 -12,-104 -9,-100 Z" fill="${c}" ${LINE}/>
      <rect x="-9" y="-104" width="9" height="3" rx="1.5" fill="${f}" ${LINE}/>
      ${lance}
      <path d="M-3,-79 L-8,-71 L3,-69" fill="none" stroke="${STEEL}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      ${arms(a, -1, -88, 14, `${id}-es`, flip)}
    </g></g></g></g></g>`;
  return `
  <g class="fig fig-${side}" transform="translate(0,${P.ground}) scale(${P.dir * P.scale},${P.scale})">
    <defs><pattern id="${id}-lp" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(58)">
      <rect width="3.5" height="7" fill="${f}"/><rect x="3.5" width="3.5" height="7" fill="${c}"/></pattern></defs>
    <g class="mover" style="transform: translateX(${n2(moverX)}px)">
      <ellipse cx="0" cy="-0.5" rx="36" ry="3.4" fill="#00000026"/>
      <g class="bob">
        ${leg(-22, 'leg-b', '#2e2118')}${leg(23, 'leg-a', '#2e2118')}
        ${leg(-27, 'leg-a', '#4a3424')}${leg(18, 'leg-b', '#4a3424')}
        <path d="M8,-56 C12,-67 20,-77 30,-82 L39,-77 C34,-70 32,-62 32,-50 Z" fill="${f}" ${LINE}/>
        <path d="M28,-81 L37,-85 L46,-77 L55,-67 L54,-61 L46,-60 L39,-66 L32,-72 Z" fill="#a9b2bc" stroke="${STEEL_DARK}" stroke-width=".8"/>
        <path d="M46,-77 L55,-67 L54,-61 L49,-62 Z" fill="#8f99a4"/>
        <path d="M31,-82 L32.5,-90 L36.5,-84 Z" fill="${f}" ${LINE}/>
        <circle cx="40" cy="-75.5" r="1.4" fill="#1e2329"/>
        <path d="M51,-61.5 L5,-64" stroke="#3a2a1d" stroke-width=".9"/>
        <path d="${caparisonPath()}" fill="${f}" ${LINE}/>
        <path d="${caparisonPath(3.6)}" fill="none" stroke="${c}" stroke-width="2.6"/>
        ${arms(a, -21, -51, 15, `${id}-cp`, flip)}
        <path d="M-16,-56 C-18,-64 -16,-68 -12,-68 L-11,-57 Z M6,-57 C6,-62 8,-64 11,-63 L10,-57 Z" fill="#6b4a2a" ${LINE}/>
        <g style="${pose.riderless ? 'display:none' : ''}">${rider}</g>
      </g>
      <g class="hit"></g>
    </g>
  </g>`;
}

/**
 * The scene, at rest or about to be ridden. `near` and `far` are the two
 * riders' arms. `fallen` is the side borne down in the last course, if the
 * bout ended that way; `cry` is shown over the scene when a course is played.
 */
export function renderScene({ near, far, farName = 'him', fallen = null, cry = null, playing = false, uid = 'tilt' }) {
  const rest = (side) => ({
    x: PLANES[side].start,
    lance: RAISED,
    fallen: fallen === side && side === 'near',
    riderless: fallen === side && side === 'far',
  });
  return `
  <div class="scene-wrap ${playing ? 'playing' : ''}">
    <svg class="scene" viewBox="0 0 ${W} ${H}" role="img" aria-label="You and ${esc(farName)} at either end of the tilt">
      ${gallery(uid)}
      <defs><clipPath id="${uid}-behind"><rect width="${W}" height="137"/></clipPath></defs>
      <g clip-path="url(#${uid}-behind)">${figure('far', far, uid, rest('far'))}</g>
      <g class="fx-back"></g>
      ${barrier()}
      ${figure('near', near, uid, rest('near'))}
      <g class="fx"></g>
    </svg>
    ${cry ? `<div class="scene-cry tone-${cry.tone}" aria-live="polite">${esc(cry.text)}</div>` : ''}
    ${playing ? '<div class="scene-skip">Tap to skip</div>' : ''}
  </div>`;
}

// ---------------------------------------------------------------------------
// A course, ridden
// ---------------------------------------------------------------------------

function star(r) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * i) / 8;
    const k = i % 2 ? r * 0.38 : r;
    pts.push(`${n2(Math.cos(a) * k)},${n2(Math.sin(a) * k)}`);
  }
  return pts.join(' ');
}

const SPLINTERS = [[-12, 32], [-38, 27], [-62, 34], [-88, 24], [-112, 19], [-28, 38], [-52, 30], [6, 22], [-76, 26]];

/**
 * Play the course in `course` (the record: you/him outcomes and aims) in the
 * scene inside `wrap`. Calls `onDone` once, when it ends or is skipped.
 * Returns { finish, impactAt } so a tap can end it early.
 */
export function playTilt(wrap, course, { cheer = false, onDone = () => {} } = {}) {
  const svg = wrap && wrap.querySelector('svg.scene');
  const anims = [];
  let done = false;
  let timer = null;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    for (const a of anims) {
      try { a.finish(); } catch { /* the element is gone */ }
    }
    wrap?.classList.remove('playing');
    onDone();
  };
  const started = typeof performance !== 'undefined' ? performance.now() : 0;
  if (!svg || typeof svg.animate !== 'function') {
    finish();
    return { finish, impactAt: started };
  }
  const T = TIMING.total;
  const I = TIMING.impact;
  const o = (ms) => Math.min(1, Math.max(0, ms / T));
  const run = (el, frames, opts = {}) => {
    if (el) anims.push(el.animate(frames, { duration: T, fill: 'forwards', ...opts }));
  };
  const fx = [];
  for (const [side, mine, took] of [['near', course.you, course.him.out], ['far', course.him, course.you.out]]) {
    const P = PLANES[side];
    const g = svg.querySelector(`.fig-${side}`);
    if (!g) continue;
    const L = (x) => local(side, x);

    // The charge, and on past.
    run(g.querySelector('.mover'), [
      { transform: `translateX(${n2(L(P.start))}px)`, offset: 0, easing: 'cubic-bezier(.42,0,.9,.62)' },
      { transform: `translateX(${n2(L(P.impact))}px)`, offset: o(I), easing: 'cubic-bezier(.12,.55,.4,1)' },
      { transform: `translateX(${n2(L(P.end))}px)`, offset: 1 },
    ]);
    const stride = 230;
    const reps = Math.ceil(T / stride);
    run(g.querySelector('.bob'), [{ transform: 'translateY(0px)' }, { transform: 'translateY(-2.6px)' }, { transform: 'translateY(0px)' }],
      { duration: stride, iterations: reps, fill: 'none' });
    g.querySelectorAll('.leg-a').forEach((el) => run(el, [{ transform: 'rotate(-24deg)' }, { transform: 'rotate(20deg)' }],
      { duration: stride / 2, iterations: reps * 2, direction: 'alternate', easing: 'ease-in-out', fill: 'none' }));
    g.querySelectorAll('.leg-b').forEach((el) => run(el, [{ transform: 'rotate(20deg)' }, { transform: 'rotate(-24deg)' }],
      { duration: stride / 2, iterations: reps * 2, direction: 'alternate', easing: 'ease-in-out', fill: 'none' }));

    // The lance comes down, is aimed, and meets what it meets.
    const aimed = lanceAngle(side, mine.out === 'tilt' || mine.out === 'horse' ? 'break' : mine.out, mine.aim);
    const at = lanceAngle(side, mine.out, mine.aim);
    const broke = BROKE.has(mine.out);
    run(g.querySelector('.lance'), [
      { transform: `rotate(${RAISED}deg)`, offset: 0, easing: 'ease-out' },
      { transform: `rotate(${n2(aimed)}deg)`, offset: o(380) },
      { transform: `rotate(${n2(aimed)}deg)`, offset: o(760), easing: 'ease-in' },
      { transform: `rotate(${n2(at)}deg)`, offset: o(I), easing: 'ease-out' },
      { transform: `rotate(${broke ? -26 : -36}deg)`, offset: 1 },
    ]);
    if (broke) {
      run(g.querySelector('.lance-head'), [
        { opacity: 1, offset: 0 }, { opacity: 1, offset: o(I) }, { opacity: 0, offset: o(I + 16) }, { opacity: 0, offset: 1 },
      ]);
    }

    // What his lance did to this rider.
    const rot = g.querySelector('.rider-rot');
    if (took === 'unhorse') {
      const D = L(P.end) - L(P.impact);
      run(g.querySelector('.rider-fall'), [
        { transform: 'translateX(0px)', offset: 0 },
        { transform: 'translateX(0px)', offset: o(I), easing: 'cubic-bezier(.12,.55,.4,1)' },
        { transform: `translateX(${n2(-D)}px)`, offset: 1 },
      ]);
      run(g.querySelector('.rider-drop'), [
        { transform: 'translate(0px,0px)', offset: 0 },
        { transform: 'translate(0px,0px)', offset: o(I), easing: 'ease-out' },
        { transform: 'translate(-14px,6px)', offset: o(I + 240), easing: 'cubic-bezier(.4,0,.9,.5)' },
        { transform: 'translate(-26px,48px)', offset: o(I + 560) },
        { transform: 'translate(-26px,48px)', offset: 1 },
      ]);
      run(rot, [
        { transform: 'rotate(0deg)', offset: 0 },
        { transform: 'rotate(0deg)', offset: o(I) },
        { transform: 'rotate(-48deg)', offset: o(I + 200) },
        { transform: 'rotate(-80deg)', offset: o(I + 400) },
        { transform: 'rotate(-97deg)', offset: o(I + 560) },
        { transform: 'rotate(-92deg)', offset: o(I + 660) },
        { transform: 'rotate(-92deg)', offset: 1 },
      ]);
      // He lands where he fell; behind the tilt, only his dust shows over it.
      const land = onScreen(side, { x: SADDLE.x - 26, y: 0 }, P.impact);
      fx.push({ kind: 'dust', x: land.x, y: side === 'far' ? BARRIER_TOP - 1 : P.ground - 3, delay: I + 500, size: 1.4, back: side === 'far' });
    } else if (took === 'helm' || took === 'break') {
      const k = took === 'helm' ? -17 : -8;
      run(rot, [
        { transform: 'rotate(0deg)', offset: 0 },
        { transform: 'rotate(0deg)', offset: o(I) },
        { transform: `rotate(${k}deg)`, offset: o(I + 90) },
        { transform: `rotate(${n2(k * 0.3)}deg)`, offset: o(I + 260) },
        { transform: 'rotate(0deg)', offset: o(I + 480) },
        { transform: 'rotate(0deg)', offset: 1 },
      ]);
    }

    // At the point of the lance. The flash is on the man struck, and rides on
    // with him; the splinters are left in the air where the lance broke.
    if (mine.out !== 'miss') {
      const p = pointAt(side, at);
      if (mine.out === 'tilt') fx.push({ kind: 'dust', x: p.x, y: BARRIER_TOP, delay: I, size: 0.9 });
      else {
        const O = PLANES[other(side)];
        fx.push({
          kind: 'flash', on: other(side), x: (p.x - O.impact) / (O.dir * O.scale), y: (p.y - O.ground) / O.scale, delay: I,
          size: { break: 7, helm: 10, unhorse: 11, horse: 8 }[mine.out], colour: mine.out === 'horse' ? '#e0443c' : mine.out === 'helm' ? '#f6d36b' : '#fff8e2',
        });
      }
      if (broke) fx.push({ kind: 'splinters', x: p.x, y: p.y, dir: PLANES[side].dir, delay: I, count: mine.out === 'helm' ? 9 : 7 });
    }
  }

  // The fx: in front of the tilt, behind it, or on a rider. Built for this
  // course, animated once.
  const where = (f) => (f.on ? `.fig-${f.on} .hit` : f.back ? '.fx-back' : '.fx');
  for (const place of ['.fx', '.fx-back', '.fig-near .hit', '.fig-far .hit']) {
    const layer = svg.querySelector(place);
    if (!layer) continue;
    let html = '';
    fx.forEach((f, i) => {
      if (where(f) !== place) return;
      if (f.kind === 'flash') {
        html += `<g transform="translate(${n2(f.x)},${n2(f.y)})"><polygon data-fx="${i}" points="${star(f.size)}" fill="${f.colour}" stroke="#ffffffaa" stroke-width=".6" style="opacity:0"/></g>`;
      } else if (f.kind === 'dust') {
        for (let k = 0; k < 3; k++) {
          html += `<g transform="translate(${n2(f.x + (k - 1) * 7 * f.size)},${n2(f.y - k)})"><circle data-fx="${i}" r="${n2((4 + k * 1.5) * f.size)}" fill="#cbb68c" style="opacity:0"/></g>`;
        }
      } else if (f.kind === 'splinters') {
        for (let k = 0; k < f.count; k++) {
          html += `<g transform="translate(${n2(f.x)},${n2(f.y)})"><rect data-fx="${i}" data-k="${k}" x="-3.2" y="-.7" width="6.4" height="1.4" fill="#d9c49a" stroke="#00000040" stroke-width=".3" style="opacity:0"/></g>`;
        }
      }
    });
    layer.innerHTML = html;
    layer.querySelectorAll('[data-fx]').forEach((el) => {
      const f = fx[Number(el.dataset.fx)];
      const timing = { duration: 320, delay: f.delay, fill: 'forwards', easing: 'ease-out' };
      if (f.kind === 'flash') {
        run(el, [{ opacity: 1, transform: 'scale(.3)' }, { opacity: 0.9, transform: 'scale(1.1)', offset: 0.45 }, { opacity: 0, transform: 'scale(1.35)' }], timing);
      } else if (f.kind === 'dust') {
        run(el, [{ opacity: 0.75, transform: 'scale(.4)' }, { opacity: 0, transform: 'translateY(-6px) scale(1.7)' }], { ...timing, duration: 760 });
      } else {
        const [a, d] = SPLINTERS[Number(el.dataset.k) % SPLINTERS.length];
        const r = (a * Math.PI) / 180;
        const dx = f.dir * d * Math.cos(r);
        const dy = d * Math.sin(r);
        run(el, [
          { opacity: 1, transform: `translate(0px,0px) rotate(${a}deg)` },
          { opacity: 1, transform: `translate(${n2(dx * 0.7)}px,${n2(dy * 0.7)}px) rotate(${a + f.dir * 160}deg)`, offset: 0.55 },
          { opacity: 0, transform: `translate(${n2(dx)}px,${n2(dy + 10)}px) rotate(${a + f.dir * 260}deg)` },
        ], { ...timing, duration: 600, easing: 'cubic-bezier(.2,.7,.5,1)' });
      }
    });
  }

  if (cheer) {
    run(svg.querySelector('.crowd'), [
      { transform: 'translateY(0px)', offset: 0 }, { transform: 'translateY(0px)', offset: o(I + 80) },
      { transform: 'translateY(-1.8px)', offset: o(I + 200) }, { transform: 'translateY(0px)', offset: o(I + 330) },
      { transform: 'translateY(-1.8px)', offset: o(I + 460) }, { transform: 'translateY(0px)', offset: o(I + 600) },
      { transform: 'translateY(0px)', offset: 1 },
    ]);
  }
  run(wrap.querySelector('.scene-cry'), [
    { opacity: 0, transform: 'translateY(6px) scale(.92)' }, { opacity: 1, transform: 'translateY(0px) scale(1)' },
  ], { duration: 240, delay: TIMING.cry, easing: 'cubic-bezier(.2,.8,.3,1.2)' });

  timer = setTimeout(finish, T + TIMING.hold);
  return { finish, impactAt: started + I };
}
