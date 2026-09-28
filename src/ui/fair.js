// The fairs on the screen: the popinjay at Saltings Quay, and the Downs Race
// at Othery. Reads the engine; computes nothing.

import { FAIRS, POPINJAY, RACE } from '../data/life.data.js';
import { TOWNS } from '../data/world.data.js';
import { popinjayPreview, roundOrder, rivalTarget, raceOdds, YOU } from '../engine/fair.js';
import { CONDITION } from '../data/household.data.js';
import { lsd } from '../engine/money.js';
import { esc, pct, cap } from './view.js';

const MARK_WORD = { tail: 'the tail', wing: 'a wing', bird: 'the bird' };

export function renderFair(state, ui) {
  const f = state.fair;
  if (f.stage === 'done') return renderFairDone(state);
  return f.kind === 'popinjay' ? renderPopinjay(state, ui) : renderRace(state);
}

function renderPopinjay(state, ui) {
  const f = state.fair;
  const F = FAIRS.popinjay;
  const p = popinjayPreview(state);
  const pick = ui.shot || { target: 'wing', lull: false };
  const o = pick.lull ? p.lull : p.now;
  const order = roundOrder(f);
  const pos = order.indexOf(YOU) + 1;
  const standings = [...f.shooters].sort((a, b) => b.points - a.points);
  const birdMen = f.shooters.filter((s) => s.id !== YOU && rivalTarget(f, s) === 'bird').map((s) => s.name);
  return `
  <section class="card lift stack">
    <div class="spread"><span class="eyebrow">The popinjay · ${esc(TOWNS[f.town].name)}</span><span class="small muted">Round ${f.round + 1} of ${POPINJAY.rounds}</span></div>
    <div class="heading">${esc(f.wind.label)}</div>
    <p class="small muted">The wooden bird sits on its pole above the guildhall roof. The tail feathers are worth a point, a wing two. Bring the bird itself down and the shoot is over: you are King of the Popinjay, whatever the tally. Otherwise the most feathers after ${POPINJAY.rounds} rounds wins, and a tie is shot off.</p>
    <p class="small">${pos === 1 ? 'You shoot first this round.' : `You shoot ${ordinalWord(pos)} of ${order.length} this round.`} ${birdMen.length ? `${esc(birdMen.join(', '))} ${birdMen.length === 1 ? 'is' : 'are'} shooting at the bird.` : 'Nobody else is shooting at the bird this round.'}</p>
  </section>

  <section class="card stack">
    <div class="eyebrow">Your shot</div>
    <div class="seg two" role="group" aria-label="When to shoot">
      <button data-lull="0" aria-pressed="${!pick.lull}">Shoot in your turn</button>
      <button data-lull="1" aria-pressed="${!!pick.lull}">Wait for a lull, and shoot last</button>
    </div>
    <p class="small muted">${pick.lull
      ? `Waiting takes most of the wind out of your shot, but all ${o.before} of the others shoot first.`
      : `${o.before ? `${o.before} shoot before you.` : 'Nobody shoots before you.'}`} The chance the bird is down before your turn: <b>${pct(o.risk)}</b>.</p>
    <div class="stack">
      ${Object.entries(POPINJAY.targets).map(([id, t]) => `
        <button class="option" data-mark="${id}" aria-pressed="${pick.target === id}">
          <span class="t">${esc(t.label)} · ${pct(o.marks[id])}</span>
          <span class="small muted">${esc(t.does)}</span>
        </button>`).join('')}
    </div>
    <button class="btn primary wide" data-act="shoot">Shoot at ${MARK_WORD[pick.target]}${pick.lull ? ', after a lull' : ''}</button>
  </section>

  <section class="card stack">
    <div class="eyebrow">The tally</div>
    <div class="table-wrap"><table class="roll"><tbody>
      ${standings.map((s) => `<tr class="${s.id === YOU ? 'me' : ''}"><td>${esc(s.name)}${s.guild ? ' <span class="small faint">of the guild</span>' : ''}</td><td class="rn">${s.points}</td></tr>`).join('')}
    </tbody></table></div>
  </section>

  ${renderShots(f)}

  <p class="small faint">Prize: ${esc(F.prizeLabel)}, the guild’s goodwill, and ${F.archers} of its crossbowmen for your company.</p>`;
}

function renderShots(f) {
  if (!f.log.length) return '';
  return `<section class="card stack">
    <div class="eyebrow">The shots so far</div>
    ${[...f.log].reverse().map((r) => `
      <div class="stack" style="gap:4px">
        <div class="small"><b>Round ${r.round + 1}</b> <span class="faint">· ${esc(r.wind)}</span></div>
        <ul class="notes">${r.shots.map((s) => `<li class="${s.id === YOU ? 'me' : ''}">${esc(s.id === YOU ? 'You' : s.name)} at ${MARK_WORD[s.target]}: ${s.hit ? (s.target === 'bird' ? '<b>the bird is down</b>' : 'a hit') : 'a miss'}</li>`).join('')}</ul>
      </div>`).join('')}
  </section>`;
}

function renderRace(state) {
  const f = state.fair;
  const F = FAIRS.race;
  const h = state.horse;
  const odds = raceOdds(state);
  const c = h.condition ?? CONDITION.max;
  return `
  <section class="card lift stack">
    <div class="spread"><span class="eyebrow">The Downs Race · ${esc(TOWNS[f.town].name)}</span><span class="small muted">Two miles of down</span></div>
    <div class="heading">${esc(cap(h.name))} at the start</div>
    <p class="small muted">Quality ${h.quality}, condition ${c}/10. Your seat counts for something over two miles; a tired horse counts against you. The copers’ lads ride light.</p>
    <p class="small">Prize: ${esc(F.prizeLabel)}; second place ${lsd(F.placed)}. Whatever happens, the race takes ${F.condition} from his condition.</p>
  </section>

  <section class="card stack">
    <div class="eyebrow">The field</div>
    <div class="table-wrap"><table class="roll"><tbody>
      ${f.runners.map((r) => `<tr><td>${esc(cap(r.name))}</td><td class="rn">quality ${r.quality}</td></tr>`).join('')}
      <tr class="me"><td>${esc(cap(h.name))}, ridden by you</td><td class="rn">quality ${h.quality}</td></tr>
    </tbody></table></div>
  </section>

  <section class="stack">
    <div class="eyebrow">How will you ride it?</div>
    ${odds.map((o) => `
      <article class="opt">
        <div class="subhead">${esc(o.label)}</div>
        <div class="small muted">${esc(o.does)}</div>
        <div class="small">To win <b>${pct(o.win)}</b> · in the first two ${pct(o.place)}${o.fall ? ` · <span class="neg">a fall ${pct(o.fall)}</span>` : ''}</div>
        <button class="btn primary wide" data-race="${o.id}">${esc(o.label)}</button>
      </article>`).join('')}
    <p class="small faint">The chances are the heralds’ reckoning of every horse’s pace over the distance: the same reckoning the race is run by.</p>
  </section>`;
}

function renderFairDone(state) {
  const f = state.fair;
  const r = f.result;
  const title = f.kind === 'popinjay'
    ? (r.won ? 'King of the Popinjay' : 'The bird goes to another')
    : (r.won ? 'First past the post' : r.fell ? 'Down on the turn' : r.place === 2 ? 'Second' : 'Among the field');
  return `
  <section class="card lift stack-lg">
    <div class="verdict">${esc(title)}</div>
    <p class="entry">${esc(r.text)}</p>
    ${r.lines.length ? `<ul class="notes">${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    ${f.kind === 'race' ? `<p class="small muted">The finish: ${esc(r.order.join(', '))}.</p>` : ''}
    ${f.kind === 'popinjay' ? renderShots(f) : ''}
    <button class="btn primary wide" data-act="fair-leave">Home from the fair</button>
  </section>`;
}

function ordinalWord(n) { return ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'][n - 1] || `${n}th`; }
