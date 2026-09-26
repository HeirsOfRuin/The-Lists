// Pounds, shillings and pence. Money is held as integer pence everywhere, so it
// cannot drift; this module is the only place that converts it to words.

import { PENCE_PER_SHILLING, PENCE_PER_POUND } from '../data/world.data.js';

export function pounds(n) { return Math.round(n * PENCE_PER_POUND); }
export function shillings(n) { return Math.round(n * PENCE_PER_SHILLING); }

/** "£3 6s 8d", "15s", "8d", "£0". Negative amounts carry a leading minus. */
export function lsd(pence) {
  if (pence == null || Number.isNaN(pence)) return '—';
  const neg = pence < 0;
  let p = Math.round(Math.abs(pence));
  const l = Math.floor(p / PENCE_PER_POUND);
  p -= l * PENCE_PER_POUND;
  const s = Math.floor(p / PENCE_PER_SHILLING);
  const d = p - s * PENCE_PER_SHILLING;
  const parts = [];
  if (l) parts.push(`£${l.toLocaleString('en-GB')}`);
  if (s) parts.push(`${s}s`);
  if (d) parts.push(`${d}d`);
  if (!parts.length) return '£0';
  return (neg ? '−' : '') + parts.join(' ');
}

/** Signed, for ledgers: "+£6", "−17s". */
export function lsdSigned(pence) {
  if (!pence) return lsd(0);
  return pence > 0 ? `+${lsd(pence)}` : lsd(pence);
}
