// The first-time hints. What a viewer has already read is kept in this
// browser, apart from the save: it belongs to the person playing, not to the
// knight, and a new knight should not bring them all back. Storage can be
// missing or refuse; then the hints are remembered only until the page closes.

import { HINTS } from '../data/hints.data.js';
import { esc } from './view.js';

const KEY = 'the-lists.hints';
let memo = null;

function read() {
  if (memo) return memo;
  memo = { off: false, seen: [] };
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) memo = { off: false, seen: [], ...JSON.parse(raw) };
  } catch { /* storage unavailable: keep the in-memory copy */ }
  return memo;
}

function write() {
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(memo)); } catch { /* as above */ }
}

export function hintsOn() { return !read().off; }

/** The hint card for a screen, if it has one and it has not been read. */
export function hintCard(key) {
  const h = HINTS[key];
  const r = read();
  if (!h || r.off || r.seen.includes(key)) return '';
  return `
  <aside class="card hint stack" role="note">
    <div class="spread"><span class="eyebrow">${esc(h.title)}</span><button class="linkbtn small" data-act="hints-off">No more hints</button></div>
    ${h.lines.map((l) => `<p class="small">${esc(l)}</p>`).join('')}
    <button class="btn quiet" data-hint="${key}">Understood</button>
  </aside>`;
}

export function dismissHint(key) {
  const r = read();
  if (!r.seen.includes(key)) r.seen.push(key);
  write();
}

export function setHints(on) {
  const r = read();
  r.off = !on;
  if (on) r.seen = [];
  write();
}
