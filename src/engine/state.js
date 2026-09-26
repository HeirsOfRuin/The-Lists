// Game state: its shape, how a new career is built, and how it is saved.
//
// The save key is a contract, not a label. `the-lists.save.v1` is fixed from
// the first commit and carries an explicit version number, because a save
// already sitting in somebody's browser refers to this string. Renaming it
// silently orphans every career in progress; changing the shape without
// bumping the version silently corrupts them. Migrations go in migrate().

import { streamFor } from './rng.js';
import { buildKnight, fullName } from './knight.js';
import { newTourney } from './tourney.js';
import { WORLD } from '../data/world.data.js';

export const SAVE_KEY = 'the-lists.save.v1';
export const SAVE_VERSION = 1;

export const STATUS = {
  ACTIVE: 'active',
  RUINED: 'ruined', // could not pay to ride
};

/**
 * A new career. Everything about it is a pure function of
 * (seed, answers, name) and the choices made after, which is what makes a
 * seed reproducible and the balance harness meaningful.
 */
export function newGame({ seed = 1, answers, name }) {
  const rng = streamFor(seed, 0, 'creation');
  const built = buildKnight(answers, name, rng);
  const state = {
    version: SAVE_VERSION,
    seed: seed >>> 0,
    status: STATUS.ACTIVE,
    answers: { ...answers },

    season: 1,
    eventInSeason: 0,
    eventsEntered: 0,

    ...built,

    career: {
      tourneys: 0, bouts: 0, boutsWon: 0, courses: 0, lances: 0,
      unhorsed: 0, falls: 0, championships: 0,
    },
    event: null,
    book: [],
    log: [],
    outcome: null,
  };
  state.log.push({
    season: 1,
    text: `${fullName(state.knight)} rides out in the ${ordinal(WORLD.peaceYear)} year of the peace, ` +
      `on ${state.horse.name}, with ${state.master.name} ${state.master.fate === 'dead' ? 'in his grave' : 'still watching'}.`,
  });
  state.event = newTourney(state);
  return state;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function isOver(state) {
  return state.status !== STATUS.ACTIVE;
}

// ---------------------------------------------------------------------------
// Saving. Nothing derived is stored: the state is already plain data.
// ---------------------------------------------------------------------------

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(json) {
  const raw = typeof json === 'string' ? JSON.parse(json) : json;
  return migrate(raw);
}

/**
 * Bring an older save forward. Each step is from one version to the next, so
 * a v1 save still loads after v4 ships.
 */
export function migrate(s) {
  if (!s || !s.version) {
    throw new Error('Save has no version field; it cannot be safely loaded.');
  }
  if (s.version > SAVE_VERSION) {
    throw new Error(
      `Save is version ${s.version} but this build understands up to ${SAVE_VERSION}. ` +
        'It was written by a newer version of the game.'
    );
  }
  // v1 is current. Future migrations chain here:
  //   if (s.version === 1) { ...; s.version = 2; }
  return s;
}

// ---------------------------------------------------------------------------
// Browser storage. Every access is wrapped: localStorage throws in private
// windows and returns null when site data has been cleared.
// ---------------------------------------------------------------------------

export function saveToStorage(state, storage = globalThis.localStorage) {
  if (!storage) return { ok: false, reason: 'no storage available' };
  try {
    storage.setItem(SAVE_KEY, serialize(state));
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.message || 'storage write refused' };
  }
}

export function loadFromStorage(storage = globalThis.localStorage) {
  if (!storage) return { ok: false, reason: 'no storage available' };
  let raw;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch (err) {
    return { ok: false, reason: err?.message || 'storage read refused' };
  }
  if (!raw) return { ok: false, reason: 'no saved career found' };
  try {
    return { ok: true, state: deserialize(raw) };
  } catch (err) {
    return { ok: false, reason: err?.message || 'saved career could not be read' };
  }
}

export function clearStorage(storage = globalThis.localStorage) {
  try { storage?.removeItem(SAVE_KEY); return { ok: true }; }
  catch (err) { return { ok: false, reason: err?.message }; }
}
