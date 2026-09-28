// The World tab: the Book of Lothmere, and the chronicle of the years you
// have ridden through. Reads the engine; computes nothing.

import { codex, codexCounts } from '../engine/lore.js';
import { WORLD } from '../data/world.data.js';
import { esc, ordinal } from './view.js';

export function renderWorld(state) {
  const book = codex(state);
  const n = codexCounts(state);
  const years = [...(state.chronicle || [])].reverse();
  return `
  <section class="card lift stack">
    <div class="heading">The Book of ${esc(WORLD.kingdom)}</div>
    <p class="small muted">What you have learned of your kingdom: ${n.known} of ${n.all} pages. It fills as you ride, as you go places and see things done.</p>
  </section>

  ${book.map((sec) => `
  <section class="card stack">
    <div class="spread"><span class="eyebrow">${esc(sec.title)}</span><span class="small faint">${sec.knownCount} of ${sec.entries.length}</span></div>
    <p class="small muted">${esc(sec.blurb)}</p>
    ${sec.entries.map((e) => e.known ? `
      <details class="lore">
        <summary>${esc(e.title)}</summary>
        ${e.text.map((t) => `<p class="lore-text">${esc(t)}</p>`).join('')}
      </details>` : `
      <div class="lore unknown"><span class="t">${esc(e.title)}</span><span class="small faint">${esc(e.hint)}</span></div>`).join('')}
  </section>`).join('')}

  <section class="card stack">
    <div class="eyebrow">The chronicle</div>
    ${years.length ? years.map((y) => `
      <div class="chron-year">
        <div class="small"><b>The ${ordinal(WORLD.peaceYear + y.year - 1)} year of the peace</b> <span class="faint">· your ${ordinal(y.year)} year</span></div>
        <ul class="chron">${y.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      </div>`).join('')
    : '<p class="empty">The heralds write the chronicle at the end of each year. Your first is still being ridden.</p>'}
  </section>`;
}

/** The winter's letters, for the winter screen. */
export function renderLetters(letters) {
  if (!letters?.length) return '';
  return `
  <section class="card stack">
    <div class="eyebrow">Letters</div>
    ${letters.map((l) => `
      <article class="letter">
        <div class="small muted">${esc(l.from)}</div>
        <p class="letter-text">${esc(l.text)}</p>
        ${l.sign ? `<div class="small faint letter-sign">${esc(l.sign)}</div>` : ''}
      </article>`).join('')}
  </section>`;
}

/** The year in the realm, for the winter screen. */
export function renderChronicle(entry) {
  if (!entry?.lines?.length) return '';
  return `
  <section class="card stack">
    <div class="eyebrow">The year in ${esc(WORLD.kingdom)}</div>
    <ul class="chron">${entry.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="small faint">Every year is kept in the chronicle, on the World tab.</p>
  </section>`;
}
