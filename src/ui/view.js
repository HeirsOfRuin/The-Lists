// Small pieces every screen uses: escaping, numbers in words, shields, chips.
// Nothing here computes a game number; it only says one.

import { shieldSvg } from '../engine/heraldry.js';
import { TIERS } from '../data/tourney.data.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
export function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
export function pct(p) {
  if (p > 0 && p < 0.005) return '<1%';
  if (p < 1 && p > 0.995) return '>99%';
  return `${Math.round(p * 100)}%`;
}
export function signed(n) { return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0'; }

let uid = 0;
export function resetIds() { uid = 0; }
export function shield(arms, size) { return shieldSvg(arms, { size, uid: `s${++uid}` }); }

export const TIER_SHORT = { local: 'Local', regional: 'Regional', high: 'High', grand: 'The King’s', pas: 'A pas' };
export function tierChip(tier) {
  return `<span class="tier tier-${tier}">${TIER_SHORT[tier] || esc(TIERS[tier]?.label || tier)}</span>`;
}

export function chips(lines, cls = '') {
  if (!lines || !lines.length) return '';
  return `<span class="chips">${lines.map((l) => `<span class="chip ${cls} ${/^Story|The story/.test(l) ? 'story' : ''}">${esc(l)}</span>`).join('')}</span>`;
}

export function days(n) { return `${n} day${n === 1 ? '' : 's'}`; }
