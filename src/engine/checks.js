// Checks: a skill or a trait against a difficulty. ONE DERIVATION: the chance
// shown on any button that rolls a check, a card's answer or a courtship, is
// this function, and it is the chance rolled.

import { TRAIT_PAIRS, STAT_LABELS } from '../data/creation.data.js';

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

/** A trait's value, whichever half of its pair is named. */
export function traitValue(state, name) {
  const pair = TRAIT_PAIRS.find(([a, b]) => a === name || b === name);
  const v = state.knight.traits[pair[0]];
  return name === pair[0] ? v : 20 - v;
}

export function checkValue(state, check) {
  if (check.stat) return state.knight.stats[check.stat];
  return traitValue(state, check.trait);
}

/** The chance of passing a check: shown on the button, and rolled. */
export function checkChance(state, check) {
  const p = sigmoid((checkValue(state, check) - check.dc) * 0.45);
  return Math.max(0.05, Math.min(0.95, p));
}

export function checkLabel(check) {
  if (check.stat) return STAT_LABELS[check.stat];
  return check.trait.charAt(0).toUpperCase() + check.trait.slice(1);
}
